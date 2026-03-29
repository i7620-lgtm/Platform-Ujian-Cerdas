import { GoogleGenAI, Type } from "@google/genai";
import { Question, QuizConfig, QuestionType } from "../../types";
import { markdownToHtml } from "../teacher/examUtils";

let aiInstance: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      console.warn("API key is missing. AI features will not work.");
      // We still initialize it so it doesn't crash the app, but it will throw when used.
      // Wait, GoogleGenAI throws on instantiation if apiKey is empty.
      // So we must throw our own error or handle it.
      throw new Error("API key is missing. Please set GEMINI_API_KEY or API_KEY.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export async function generateQuestions(config: QuizConfig): Promise<Question[]> {
  const ai = getAI();
  
  const systemInstruction = `
    Anda adalah asisten pembuat soal ujian profesional.
    Tugas Anda adalah membuat soal berkualitas tinggi berdasarkan parameter yang diberikan.
    
    ATURAN FORMAT:
    - Gunakan format Markdown secara maksimal pada teks pertanyaan dan penjelasan.
    - Gunakan tabel Markdown jika diperlukan untuk menyajikan data. WAJIB tambahkan baris kosong (\\n\\n) sebelum dan sesudah tabel.
    - Gunakan bullet points atau numbering untuk daftar.
    - Gunakan LaTeX untuk rumus matematika (gunakan $...$ untuk inline dan $$...$$ untuk block equation).
    - Gunakan ASCII art atau tabel untuk diagram sederhana jika relevan.
    - PENTING: Jika soal, opsi, atau jawaban mengandung Aksara Bali, WAJIB bungkus teks Aksara Bali tersebut dengan tag HTML <span class="aksara-bali" style="font-family: 'Noto Sans Balinese', sans-serif;">teks aksara bali</span> agar dapat dirender dengan benar.
    - Hindari konten dewasa, kekerasan, atau hal-hal yang tidak pantas untuk lingkungan pendidikan.
    
    ATURAN JENIS SOAL:
    - Pilihan Ganda: Wajib isi 'options' (4-5 opsi) dan 'correctAnswer' (1 jawaban benar yang sama persis dengan salah satu opsi).
    - Pilihan Ganda Kompleks: Wajib isi 'options' (4-5 opsi) dan 'correctAnswer' (semua jawaban benar dipisahkan koma, harus sama persis dengan opsi).
    - Uraian Singkat: Wajib isi 'correctAnswer' dengan jawaban padat dan jelas.
    - Esai: Wajib isi 'correctAnswer' dengan penjelasan mendalam.
    - Benar/Salah: Wajib isi 'trueFalseRows' berupa array of objects { "text": "pernyataan", "answer": true/false }. Buat 3-5 pernyataan.
    - Menjodohkan: Wajib isi 'matchingPairs' berupa array of objects { "left": "item kiri", "right": "pasangan kanan" }. Buat 3-5 pasangan.
    
    RESPON:
    - Berikan respon dalam format JSON array.
    - Pastikan JSON valid dan sesuai dengan schema yang diminta.
  `;

  const prompt = `
    Buatlah ${config.count} soal ${config.type} untuk mata pelajaran/materi: ${config.subject}.
    Tingkat kognitif (Bloom Revisi): ${config.difficulty}.
    Kisi-kisi materi: ${config.blueprint}.
    
    PENTING: Pastikan urutan soal yang dihasilkan sesuai dengan urutan materi/kisi-kisi yang diberikan. Jangan mengacak urutan soal.
  `;

  const properties = {
    id: { type: Type.STRING, description: "ID unik untuk soal" },
    questionText: { type: Type.STRING, description: "Teks pertanyaan dalam format Markdown" },
    options: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "Opsi jawaban (hanya untuk PG/PG Kompleks)"
    },
    correctAnswer: { type: Type.STRING, description: "Jawaban benar" },
    explanation: { type: Type.STRING, description: "Penjelasan mengapa jawaban tersebut benar" },
    scoreWeight: { type: Type.NUMBER, description: "Bobot nilai soal" },
    trueFalseRows: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          answer: { type: Type.BOOLEAN }
        },
        required: ["text", "answer"]
      },
      description: "Baris pernyataan untuk soal Benar/Salah"
    },
    matchingPairs: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          left: { type: Type.STRING },
          right: { type: Type.STRING }
        },
        required: ["left", "right"]
      },
      description: "Pasangan untuk soal Menjodohkan"
    },
    ...(config.includeImages ? {
      imageSearchKeyword: { 
        type: Type.STRING, 
        description: "Kata kunci pencarian gambar spesifik dalam bahasa Inggris (2-3 kata)" 
      }
    } : {})
  };

  let response;
  try {
    response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: properties,
            required: ["id", "questionText"]
          },
        },
      },
    });
  } catch (error: unknown) {
    console.error("Gemini API Error:", error);
    const err = error as Error & { status?: number };
    const errorMessage = err?.message?.toLowerCase() || "";
    if (err?.status === 429 || errorMessage.includes('quota') || errorMessage.includes('exhausted') || errorMessage.includes('429')) {
      throw new Error("QUOTA_EXCEEDED");
    }
    throw new Error(`API Error: ${err?.message || "Terjadi kesalahan jaringan/server."}`);
  }

  try {
    const questions: {
      id: string;
      questionText: string;
      options?: string[];
      correctAnswer?: string;
      trueFalseRows?: { text: string; answer: boolean }[];
      matchingPairs?: { left: string; right: string }[];
      scoreWeight?: number;
      imageSearchKeyword?: string;
    }[] = JSON.parse(response.text || "[]");

    // Map questionType based on config.type
    let mappedQuestionType: QuestionType = 'ESSAY';
    if (config.type.toLowerCase().includes('pilihan ganda kompleks')) {
        mappedQuestionType = 'COMPLEX_MULTIPLE_CHOICE';
    } else if (config.type.toLowerCase().includes('pilihan ganda')) {
        mappedQuestionType = 'MULTIPLE_CHOICE';
    } else if (config.type.toLowerCase().includes('benar/salah') || config.type.toLowerCase().includes('benar salah')) {
        mappedQuestionType = 'TRUE_FALSE';
    } else if (config.type.toLowerCase().includes('menjodohkan')) {
        mappedQuestionType = 'MATCHING';
    } else if (config.type.toLowerCase().includes('uraian singkat') || config.type.toLowerCase().includes('isian')) {
        mappedQuestionType = 'FILL_IN_THE_BLANK';
    }

    const finalQuestions: Question[] = questions.map(q => {
        const questionText = markdownToHtml(q.questionText || '');
        const options = q.options ? q.options.map((opt: string) => markdownToHtml(opt || '')) : undefined;
        
        let correctAnswer = q.correctAnswer || '';
        if (mappedQuestionType === 'MULTIPLE_CHOICE') {
            correctAnswer = markdownToHtml(correctAnswer);
        } else if (mappedQuestionType === 'COMPLEX_MULTIPLE_CHOICE') {
            // Split by comma, trim, map to html, then JSON stringify
            const answers = correctAnswer.split(',').map((a: string) => markdownToHtml(a.trim()));
            correctAnswer = JSON.stringify(answers);
        } else if (mappedQuestionType === 'FILL_IN_THE_BLANK' || mappedQuestionType === 'ESSAY') {
            correctAnswer = markdownToHtml(correctAnswer);
        }

        const mappedQ: Question = {
            id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            questionText: questionText,
            questionType: mappedQuestionType,
            options: options,
            correctAnswer: correctAnswer,
            scoreWeight: q.scoreWeight || 1,
            kisiKisi: config.blueprint,
            level: config.difficulty,
            category: config.subject
        };
        
        // Handle true false rows if needed
        if (mappedQuestionType === 'TRUE_FALSE') {
            if (q.trueFalseRows && q.trueFalseRows.length > 0) {
                mappedQ.trueFalseRows = q.trueFalseRows.map((r: { text: string; answer: boolean }) => ({
                    text: markdownToHtml(r.text || ''),
                    answer: r.answer
                }));
            } else if (q.options) {
                mappedQ.trueFalseRows = [
                    { text: markdownToHtml('Pernyataan 1'), answer: q.correctAnswer?.toLowerCase().includes('benar') || false }
                ];
            }
        }

        // Handle matching pairs if needed
        if (mappedQuestionType === 'MATCHING') {
            if (q.matchingPairs && q.matchingPairs.length > 0) {
                mappedQ.matchingPairs = q.matchingPairs.map((p: { left: string; right: string }) => ({
                    left: markdownToHtml(p.left || ''),
                    right: markdownToHtml(p.right || '')
                }));
            } else {
                mappedQ.matchingPairs = [
                    { left: markdownToHtml('Item 1'), right: markdownToHtml('Pasangan 1') }
                ];
            }
        }
        
        return mappedQ;
    });

    // Jika pengguna meminta gambar, cari referensi gambar asli dari Wikimedia Commons
    if (config.includeImages) {
      for (let i = 0; i < finalQuestions.length; i++) {
        const q = finalQuestions[i];
        const originalQ = questions[i];
        if (originalQ.imageSearchKeyword) {
          try {
            const keyword = encodeURIComponent(originalQ.imageSearchKeyword);
            const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${keyword}&gsrnamespace=6&gsrlimit=1&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json&origin=*`;
            
            const res = await fetch(url);
            const data = await res.json();
            
            const pages = data.query?.pages;
            if (pages) {
              const pageId = Object.keys(pages)[0];
              const imageInfo = pages[pageId]?.imageinfo?.[0];
              if (imageInfo?.thumburl) {
                q.questionText = `<img src="${imageInfo.thumburl}" alt="${originalQ.imageSearchKeyword}" style="max-width: 100%; max-height: 50vh; width: auto; height: auto; object-fit: contain; border-radius: 8px; margin: 10px 0; display: block;" /><br/>${q.questionText}`;
              }
            }
          } catch (imgError) {
            console.error("Failed to fetch image for keyword:", originalQ.imageSearchKeyword, imgError);
          }
        }
      }
    }

    return finalQuestions;
  } catch (error) {
    console.error("Failed to parse questions:", error);
    throw new Error("Gagal memproses format respons dari AI. Silakan coba lagi.");
  }
}
 
