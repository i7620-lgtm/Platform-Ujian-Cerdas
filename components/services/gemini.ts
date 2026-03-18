import { GoogleGenAI, Type } from "@google/genai";
import { Question, QuizConfig, QuestionType } from "../../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY || "" });

export async function generateQuestions(config: QuizConfig): Promise<Question[]> {
  const imageInstruction = config.includeImages 
    ? `\n    - imageSearchKeyword: kata kunci pencarian gambar dalam bahasa Inggris yang sangat spesifik dengan soal (maksimal 2-3 kata, contoh: "chloroplast structure", "borobudur temple", "mitosis"). WAJIB diisi karena pengguna meminta gambar referensi.`
    : '';

  const prompt = `
    Buatlah ${config.count} soal ${config.type} untuk mata pelajaran/materi: ${config.subject}.
    Tingkat kognitif (Bloom Revisi): ${config.difficulty}.
    Kisi-kisi materi: ${config.blueprint}.
    
    Aturan khusus untuk jenis soal:
    - Pilihan Ganda: 1 jawaban benar, 4 opsi.
    - Pilihan Ganda Kompleks: Bisa lebih dari 1 jawaban benar, sertakan semua jawaban benar di 'correctAnswer' (pisahkan dengan koma jika perlu).
    - Uraian Singkat: Jawaban padat dan jelas.
    - Esai: Jawaban berupa penjelasan mendalam.
    - Benar/Salah: Buatlah 1-3 pernyataan terkait konteks soal. Kembalikan dalam format array of objects di properti 'trueFalseRows' dengan format { "text": "pernyataan", "answer": true/false }.
    - Menjodohkan: Buatlah 3-5 pasangan item kiri dan kanan. Kembalikan dalam format array of objects di properti 'matchingPairs' dengan format { "left": "item kiri", "right": "pasangan kanan" }.

    Gunakan format Markdown secara maksimal pada teks pertanyaan dan penjelasan:
    - Gunakan tabel Markdown jika diperlukan untuk menyajikan data.
    - Gunakan bullet points atau numbering untuk daftar.
    - Gunakan LaTeX untuk rumus matematika (gunakan $...$ untuk inline dan $$...$$ untuk block equation).
    - Gunakan ASCII art atau tabel untuk diagram sederhana jika relevan.

    Berikan respon dalam format JSON array yang berisi objek dengan properti:
    - id: string unik
    - questionText: teks pertanyaan (gunakan markdown jika perlu)${imageInstruction}
    - options: array string (hanya untuk Pilihan Ganda dan Pilihan Ganda Kompleks)
    - correctAnswer: jawaban yang benar (untuk PG Kompleks, sebutkan semua opsi yang benar)
    - trueFalseRows: array of objects { text: string, answer: boolean } (HANYA untuk soal Benar/Salah)
    - matchingPairs: array of objects { left: string, right: string } (HANYA untuk soal Menjodohkan)
    - explanation: penjelasan singkat mengapa jawaban tersebut benar
    - scoreWeight: bobot nilai (angka)
  `;

  let response;
  try {
    response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              questionText: { type: Type.STRING },
              imageSearchKeyword: { type: Type.STRING },
              options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING } 
              },
              correctAnswer: { type: Type.STRING },
              trueFalseRows: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING },
                    answer: { type: Type.BOOLEAN }
                  },
                  required: ["text", "answer"]
                }
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
                }
              },
              explanation: { type: Type.STRING },
              scoreWeight: { type: Type.NUMBER }
            },
            required: ["id", "questionText", "correctAnswer"]
          }
        }
      }
    });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    const errorMessage = error?.message?.toLowerCase() || "";
    if (error?.status === 429 || errorMessage.includes('quota') || errorMessage.includes('exhausted') || errorMessage.includes('429')) {
      throw new Error("QUOTA_EXCEEDED");
    }
    throw new Error(`API Error: ${error?.message || "Terjadi kesalahan jaringan/server."}`);
  }

  try {
    const questions: any[] = JSON.parse(response.text || "[]");

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
        const mappedQ: Question = {
            id: q.id,
            questionText: q.questionText,
            questionType: mappedQuestionType,
            options: q.options,
            correctAnswer: q.correctAnswer,
            scoreWeight: q.scoreWeight || 1,
            kisiKisi: config.blueprint,
            level: config.difficulty,
            category: config.subject
        };
        
        // Handle true false rows if needed
        if (mappedQuestionType === 'TRUE_FALSE') {
            if (q.trueFalseRows && q.trueFalseRows.length > 0) {
                mappedQ.trueFalseRows = q.trueFalseRows;
            } else if (q.options) {
                mappedQ.trueFalseRows = [
                    { text: 'Pernyataan 1', answer: q.correctAnswer?.toLowerCase().includes('benar') || false }
                ];
            }
        }

        // Handle matching pairs if needed
        if (mappedQuestionType === 'MATCHING') {
            if (q.matchingPairs && q.matchingPairs.length > 0) {
                mappedQ.matchingPairs = q.matchingPairs;
            } else {
                mappedQ.matchingPairs = [
                    { left: 'Item 1', right: 'Pasangan 1' }
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
            const keyword = encodeURIComponent(originalQ.imageSearchKeyword + " filetype:bitmap");
            const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${keyword}&gsrnamespace=6&gsrlimit=1&prop=imageinfo&iiprop=url&iiurlwidth=600&format=json&origin=*`;
            
            const res = await fetch(url);
            const data = await res.json();
            
            const pages = data.query?.pages;
            if (pages) {
              const pageId = Object.keys(pages)[0];
              const imageInfo = pages[pageId]?.imageinfo?.[0];
              if (imageInfo?.thumburl) {
                q.imageUrl = imageInfo.thumburl;
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
