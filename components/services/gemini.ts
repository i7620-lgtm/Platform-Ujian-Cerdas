import { GoogleGenAI, Type } from "@google/genai";
import { Question, QuizConfig, QuestionType, ChartData } from "../../types";
import { markdownToHtml, normalize, parseList, isAnswerMatch } from "../teacher/examUtils";

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
    - Gunakan format Markdown secara maksimal pada teks pertanyaan.
    - Gunakan tabel Markdown jika diperlukan untuk menyajikan data. WAJIB tambahkan baris kosong (\\n\\n) sebelum dan sesudah tabel.
    - Gunakan bullet points atau numbering untuk daftar.
    - Gunakan LaTeX untuk rumus matematika (gunakan $...$ untuk inline dan $$...$$ untuk block equation).
    - Turus (Tally Marks): Gunakan karakter '|' (1), '||' (2), '|||' (3), '||||' (4), dan '卌' (5) untuk merepresentasikan turus dalam teks pertanyaan atau tabel.
    - Diagram (Charts): Jika soal memerlukan diagram batang (bar), garis (line), atau lingkaran (pie), Anda WAJIB mengisi field 'chartData' pada tingkat soal. JANGAN gunakan tabel atau ASCII art jika soal secara eksplisit meminta diagram/grafik. Anda juga dapat menambahkan diagram pada opsi jawaban ('optionCharts'), baris benar/salah ('chartData' di dalam 'trueFalseRows'), pasangan menjodohkan ('leftChart' dan 'rightChart' di dalam 'matchingPairs'), dan kunci jawaban ('correctAnswerChart').
    - PENTING UNTUK DIAGRAM: Jika Anda membuat diagram, Anda WAJIB menyisipkan tag HTML <span class="chart-placeholder" data-chart="true" style="display: block;"></span> di dalam teks (questionText, opsi, dll) tepat di mana diagram tersebut harus ditampilkan.
    - PENTING: Jika soal, opsi, atau jawaban mengandung Aksara Bali, WAJIB bungkus teks Aksara Bali tersebut dengan tag HTML <span class="aksara-bali" style="font-family: 'Noto Sans Balinese', sans-serif;">teks aksara bali</span> agar dapat dirender dengan benar.
    - Hindari konten dewasa, kekerasan, atau hal-hal yang tidak pantas untuk lingkungan pendidikan.
    - DILARANG KERAS memberikan penjelasan, cara penyelesaian, atau kunci jawaban di dalam teks pertanyaan (questionText). Teks pertanyaan hanya boleh berisi soal yang harus dijawab oleh siswa.
    
    ATURAN JENIS SOAL:
    - Pilihan Ganda: Wajib isi 'options' (4-5 opsi) dan 'correctAnswer' (1 jawaban benar yang sama persis dengan salah satu opsi). PENTING: Acak posisi jawaban yang benar agar tidak selalu berada di opsi pertama (A).
    - Pilihan Ganda Kompleks: Wajib isi 'options' (4-5 opsi) dan 'correctAnswer' (semua jawaban benar dipisahkan dengan "|||", contoh: "Opsi 1|||Opsi 2", harus sama persis dengan opsi). Acak posisi jawaban yang benar.
    - Uraian Singkat: Wajib isi 'correctAnswer' dengan jawaban padat dan jelas.
    - Esai: Wajib isi 'correctAnswer' dengan jawaban yang diharapkan.
    - Benar/Salah: Wajib isi 'trueFalseRows' berupa array of objects { "text": "pernyataan", "answer": true/false }. Buat 3-5 pernyataan.
    - Menjodohkan: Wajib isi 'matchingPairs' berupa array of objects { "left": "item kiri", "right": "pasangan kanan" }. Buat 3-5 pasangan.
    
    RESPON:
    - Berikan respon dalam format JSON array.
    - Pastikan JSON valid dan sesuai dengan schema yang diminta.
    - WAJIB mengisi field 'correctAnswer' untuk semua jenis soal kecuali INFO.
  `;

  const prompt = `
    Buatlah ${config.count} soal ${config.type} untuk mata pelajaran/materi: ${config.subject}.
    Tingkat kognitif (Bloom Revisi): ${config.difficulty}.
    Kisi-kisi materi: ${config.blueprint}.
    
    PENTING: Pastikan urutan soal yang dihasilkan sesuai dengan urutan materi/kisi-kisi yang diberikan. Jangan mengacak urutan soal.
  `;

  const chartDataSchema = {
    type: Type.OBJECT,
    properties: {
      type: { type: Type.STRING, enum: ["bar", "line", "pie"] },
      title: { type: Type.STRING },
      labels: { type: Type.ARRAY, items: { type: Type.STRING } },
      datasets: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            label: { type: Type.STRING },
            data: { type: Type.ARRAY, items: { type: Type.NUMBER } }
          },
          required: ["label", "data"]
        }
      }
    },
    required: ["type", "labels", "datasets"],
    description: "Data untuk membuat diagram (batang, garis, atau lingkaran)"
  };

  const properties = {
    id: { type: Type.STRING, description: "ID unik untuk soal" },
    questionText: { type: Type.STRING, description: "Teks pertanyaan dalam format Markdown" },
    options: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "Opsi jawaban (hanya untuk PG/PG Kompleks)"
    },
    optionCharts: {
      type: Type.ARRAY,
      items: chartDataSchema,
      description: "Data diagram untuk setiap opsi jawaban (opsional, urutan harus sesuai dengan options)"
    },
    correctAnswer: { type: Type.STRING, description: "Jawaban benar. WAJIB diisi untuk semua jenis soal kecuali INFO. Untuk PG/PG Kompleks, harus sama persis dengan teks di options." },
    correctAnswerChart: {
      ...chartDataSchema,
      description: "Data diagram untuk jawaban benar (opsional, berguna untuk soal isian/esai)"
    },
    scoreWeight: { type: Type.NUMBER, description: "Bobot nilai soal" },
    trueFalseRows: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          answer: { type: Type.BOOLEAN },
          chartData: chartDataSchema
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
          right: { type: Type.STRING },
          leftChart: chartDataSchema,
          rightChart: chartDataSchema
        },
        required: ["left", "right"]
      },
      description: "Pasangan untuk soal Menjodohkan"
    },
    chartData: chartDataSchema,
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
            required: ["id", "questionText", "correctAnswer"]
          },
        },
      },
    });
  } catch (error: unknown) {
    console.error("Gemini API Error:", error);
    const err = error as Error & { status?: number };
    const errorMessage = err?.message?.toLowerCase() || "";
    if (err?.status === 429 || errorMessage.includes('quota') || errorMessage.includes('exhausted') || errorMessage.includes('429')) {
      if (errorMessage.includes('per minute') && errorMessage.includes('requests')) {
          throw new Error("QUOTA_EXCEEDED_MINUTE");
      }
      if (errorMessage.includes('per day')) {
          throw new Error("QUOTA_EXCEEDED_DAY");
      }
      if (errorMessage.includes('tokens')) {
          throw new Error("QUOTA_EXCEEDED_TOKENS");
      }
      throw new Error("QUOTA_EXCEEDED_GENERAL");
    }
    throw new Error(`API Error: ${err?.message || "Terjadi kesalahan jaringan/server."}`);
  }

  try {
    const questions: {
      id: string;
      questionText: string;
      options?: string[];
      optionCharts?: (ChartData | null)[];
      correctAnswer?: string;
      correctAnswerChart?: ChartData;
      trueFalseRows?: { text: string; answer: boolean; chartData?: ChartData }[];
      matchingPairs?: { left: string; right: string; leftChart?: ChartData; rightChart?: ChartData }[];
      chartData?: ChartData;
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
        
        let correctAnswer: string | string[] | number | boolean = q.correctAnswer || '';
        if (Array.isArray(correctAnswer)) {
            correctAnswer = JSON.stringify(correctAnswer);
        } else if (typeof correctAnswer !== 'string') {
            correctAnswer = String(correctAnswer);
        }
               if (mappedQuestionType === 'MULTIPLE_CHOICE') {
            // Find the option that matches the correct answer most closely
            const htmlCorrectAnswer = markdownToHtml(correctAnswer);
            
            const matchingOption = options?.find(opt => isAnswerMatch(htmlCorrectAnswer, opt, mappedQuestionType));

            if (matchingOption) {
                correctAnswer = matchingOption;
            } else {
                // Check if correctAnswer is just a letter A, B, C, D, E or "Jawaban A" or numbers 1-5
                const letterMatch = String(correctAnswer).trim().toUpperCase().match(/^(?:JAWABAN\s+|OPSI\s+|PILIHAN\s+)?([A-E1-5])[.)]?$/);
                if (letterMatch && options) {
                    const char = letterMatch[1];
                    let index = -1;
                    if (char >= 'A' && char <= 'E') {
                        index = char.charCodeAt(0) - 65;
                    } else if (char >= '1' && char <= '5') {
                        index = parseInt(char) - 1;
                    }
                    if (index >= 0 && index < options.length) {
                        correctAnswer = options[index];
                    } else {
                        correctAnswer = htmlCorrectAnswer;
                    }
                } else {
                    // Fallback: if no exact match, try to find an option that contains the correct answer or vice versa
                    const fallbackOption = options?.find(opt => {
                        const normOpt = normalize(opt, mappedQuestionType);
                        const normAns = normalize(htmlCorrectAnswer, mappedQuestionType);
                        return (normOpt.length > 3 && normAns.includes(normOpt)) || 
                               (normAns.length > 3 && normOpt.includes(normAns));
                    });
                    correctAnswer = fallbackOption || htmlCorrectAnswer;
                }
            }
        } else if (mappedQuestionType === 'COMPLEX_MULTIPLE_CHOICE') {
            // Split by comma, trim, map to html, then JSON stringify
            const splitAnswers = parseList(correctAnswer);
            
            // Map each answer to the closest matching option
            const mappedAnswers = splitAnswers.map(ans => {
                const htmlAns = markdownToHtml(ans);

                const matchingOption = options?.find(opt => isAnswerMatch(htmlAns, opt, mappedQuestionType));
                if (matchingOption) return matchingOption;

                const letterMatch = String(ans).trim().toUpperCase().match(/^(?:JAWABAN\s+|OPSI\s+|PILIHAN\s+)?([A-E1-5])[.)]?$/);
                if (letterMatch && options) {
                    const char = letterMatch[1];
                    let index = -1;
                    if (char >= 'A' && char <= 'E') {
                        index = char.charCodeAt(0) - 65;
                    } else if (char >= '1' && char <= '5') {
                        index = parseInt(char) - 1;
                    }
                    if (index >= 0 && index < options.length) {
                        return options[index];
                    }
                }

                // Fallback for complex answers
                const fallbackOption = options?.find(opt => {
                    const normOpt = normalize(opt, mappedQuestionType);
                    const normAns = normalize(htmlAns, mappedQuestionType);
                    return (normOpt.length > 3 && normAns.includes(normOpt)) || 
                           (normAns.length > 3 && normOpt.includes(normAns));
                });
                
                return fallbackOption || htmlAns;
            });
            
            // Ensure we only have unique answers and they are valid options if possible
            const uniqueAnswers = Array.from(new Set(mappedAnswers));
            correctAnswer = JSON.stringify(uniqueAnswers);
        } else if (mappedQuestionType === 'FILL_IN_THE_BLANK' || mappedQuestionType === 'ESSAY') {
            // Do not convert to HTML for fill in the blank or essay to preserve the raw text answer
            correctAnswer = String(correctAnswer).trim();
        } else {
            correctAnswer = markdownToHtml(correctAnswer);
        }

        const mappedQ: Question = {
            id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            questionText: questionText,
            questionType: mappedQuestionType,
            options: options,
            optionCharts: q.optionCharts,
            correctAnswer: correctAnswer,
            correctAnswerChart: q.correctAnswerChart,
            scoreWeight: q.scoreWeight || 1,
            kisiKisi: config.blueprint,
            level: config.difficulty,
            category: config.subject,
            chartData: q.chartData
        };
        
        // Handle true false rows if needed
        if (mappedQuestionType === 'TRUE_FALSE') {
            if (q.trueFalseRows && q.trueFalseRows.length > 0) {
                mappedQ.trueFalseRows = q.trueFalseRows.map((r: { text: string; answer: string | boolean | number; chartData?: ChartData }) => {
                    // Ensure answer is a boolean even if AI returns string "true"/"false" or "Benar"/"Salah"
                    let boolAnswer = !!r.answer;
                    if (typeof r.answer === 'string') {
                        const lower = r.answer.toLowerCase();
                        if (lower === 'false' || lower === 'salah' || lower === '0' || lower === 'tidak') {
                            boolAnswer = false;
                        } else if (lower === 'true' || lower === 'benar' || lower === '1' || lower === 'ya') {
                            boolAnswer = true;
                        }
                    }
                    return {
                        text: markdownToHtml(r.text || ''),
                        answer: boolAnswer,
                        chartData: r.chartData
                    };
                });
            } else if (q.options) {
                mappedQ.trueFalseRows = [
                    { text: markdownToHtml('Pernyataan 1'), answer: q.correctAnswer?.toLowerCase().includes('benar') || false }
                ];
            }
        }

        // Handle matching pairs if needed
        if (mappedQuestionType === 'MATCHING') {
            if (q.matchingPairs && q.matchingPairs.length > 0) {
                mappedQ.matchingPairs = q.matchingPairs.map((p: { left: string; right: string; leftChart?: ChartData; rightChart?: ChartData }) => ({
                    left: markdownToHtml(p.left || ''),
                    right: markdownToHtml(p.right || ''),
                    leftChart: p.leftChart,
                    rightChart: p.rightChart
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
