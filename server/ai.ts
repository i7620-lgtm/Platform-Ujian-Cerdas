import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

export function getAI(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      console.warn("API key is missing. AI features will not work.");
      throw new Error("API key is missing. Please set GEMINI_API_KEY or API_KEY.");
    }
    aiInstance = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        timeout: 50000,
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

export async function generateAIAnalysisOnServer(prompt: string): Promise<string> {
    const modelsToTry = ['gemini-3.7-flash', 'gemini-3.1-flash-lite'];
    
    for (const model of modelsToTry) {
        let attempts = 0;
        const maxAttempts = 3;
        
        while (attempts < maxAttempts) {
            attempts++;
            try {
                const ai = getAI();
                const response = await ai.models.generateContent({
                    model: model, 
                    contents: prompt
                });
                return response.text || "Gagal menghasilkan analisis.";
            } catch (e: any) {
                const is503 = e.status === 503 || e.message?.includes('503') || e.message?.includes('high demand');
                if (is503) {
                    console.warn(`Gemini 503 pada analisis dengan model ${model} (Percobaan ${attempts}/${maxAttempts}). Menunggu...`);
                    if (attempts < maxAttempts) {
                        await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
                        continue;
                    }
                }
                // Break to try next model or fail
                console.error(`Gagal menghasilkan analisis dengan ${model}:`, e);
                break; 
            }
        }
    }
    throw new Error("Layanan AI Gemini sedang mengalami antrean tinggi. Harap tunggu beberapa saat lalu coba kembali.");
}

export async function generateQuestionsOnServer(prompt: string, systemInstruction: string, modelsToTry: string[], properties: any): Promise<any> {
    const ai = getAI();
    let response = null;
    let lastError: unknown = null;
  
    // Filter models to modern valid Gemini models and ensure fallback to flash-lite
    const validModels = (modelsToTry && modelsToTry.length > 0 ? modelsToTry : ['gemini-3.7-flash', 'gemini-3.1-flash-lite'])
        .map(m => m === 'gemini-3.5-flash' ? 'gemini-3.7-flash' : m);
    if (!validModels.includes('gemini-3.1-flash-lite')) {
        validModels.push('gemini-3.1-flash-lite');
    }

    for (const currentModel of validModels) {
        let attempts = 0;
        const maxAttempts = 3;
        let success = false;

        while (attempts < maxAttempts && !success) {
            attempts++;
            try {
                console.log(`Mencoba membuat soal menggunakan model: ${currentModel} (Percobaan ${attempts}/${maxAttempts})`);
                response = await ai.models.generateContent({
                  model: currentModel,
                  contents: prompt,
                  config: {
                    systemInstruction: systemInstruction,
                    responseMimeType: "application/json",
                    responseSchema: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: properties,
                        required: ["id", "questionType", "questionText", "correctAnswer", "kisiKisi", "level", "category"]
                      },
                    },
                  },
                });
                lastError = null;
                success = true;
                break; // Berhasil, keluar dari loop while
            } catch (error: unknown) {
                lastError = error;
                const err = error as Error & { status?: number };
                const errorMessage = err?.message?.toLowerCase() || "";
                
                const is503 = err?.status === 503 || errorMessage.includes('503') || errorMessage.includes('high demand');
                const isQuota = err?.status === 429 || errorMessage.includes('quota') || errorMessage.includes('exhausted') || errorMessage.includes('429');
                const isTokenQuota = isQuota && errorMessage.includes('tokens');
                
                if (is503) {
                    console.warn(`Gemini 503 pada model ${currentModel} (Percobaan ${attempts}/${maxAttempts}). Menunggu sebelum mencoba lagi...`);
                    if (attempts < maxAttempts) {
                        await new Promise(resolve => setTimeout(resolve, 2000 * attempts)); // Backoff 2s, 4s
                        continue; // Coba lagi model yang sama
                    }
                } else if (isTokenQuota && currentModel === 'gemini-3.1-flash-lite') {
                   // Quota token, tapi masih ada model fallback, jangan retry, langsung lanjut ke model berikutnya
                   break; 
                } else if (isQuota) {
                    // Quota exceeded general, break out of retry loop for this model
                    break;
                }
                
                console.warn(`Gagal menggunakan model ${currentModel}:`, error);
                break; // Error lain, langsung coba model berikutnya
            }
        }
        if (success) {
            break; // Berhasil, keluar dari loop for models
        }
    }
  
    if (lastError && !response) {
        console.error("Semua opsi model gagal. Error terakhir:", lastError);
        const err = lastError as Error & { status?: number };
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
        if (err?.status === 503 || errorMessage.includes('503') || errorMessage.includes('high demand')) {
            console.warn("Gemini Warning:", "Layanan AI Gemini sedang mengalami antrean tinggi (503).");
            throw new Error("Layanan AI Gemini sedang mengalami antrean tinggi. Harap tunggu beberapa menit lalu coba kembali.");
        }
        if (err?.status === 504 || errorMessage.includes('504') || errorMessage.includes('deadline') || errorMessage.includes('timeout')) {
            console.warn("Gemini Warning:", "Batas waktu pembuatan soal terlampaui (504).");
            throw new Error("Batas waktu respons AI habis (Deadline Exceeded). Sistem sedang memproses ulang dengan batch lebih ringkas.");
        }
        console.error("Gemini Error:", err);
        throw new Error(`API Error: ${err?.message || "Terjadi kesalahan jaringan/server."}`);
    }
  
    if (!response) {
        throw new Error("Gagal mendapatkan respons dari AI setelah mencoba berbagai model.");
    }

    return response.text;
}
