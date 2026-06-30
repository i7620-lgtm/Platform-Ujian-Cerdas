import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

export function getAI(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      console.warn("API key is missing. AI features will not work.");
      throw new Error("API key is missing. Please set GEMINI_API_KEY or API_KEY.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export async function generateAIAnalysisOnServer(prompt: string): Promise<string> {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', 
            contents: prompt
        });

        return response.text || "Gagal menghasilkan analisis.";
    } catch (e: any) {
        if (e.status === 503 || e.message?.includes('503') || e.message?.includes('high demand')) {
            console.warn("Gemini Warning:", "Layanan AI Gemini sedang mengalami antrean tinggi (503).");
            throw new Error("Layanan AI Gemini sedang mengalami antrean tinggi. Harap tunggu beberapa menit lalu coba kembali.");
        }
        console.error("Gemini Error:", e);
        throw e;
    }
}

export async function generateQuestionsOnServer(prompt: string, systemInstruction: string, modelsToTry: string[], properties: any): Promise<any> {
    const ai = getAI();
    let response = null;
    let lastError: unknown = null;
  
    for (const currentModel of modelsToTry) {
        try {
            console.log(`Mencoba membuat soal menggunakan model: ${currentModel}`);
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
                    required: ["id", "questionText", "correctAnswer"]
                  },
                },
              },
            });
            lastError = null;
            break; // Berhasil, keluar dari loop
        } catch (error: unknown) {
            console.warn(`Gagal menggunakan model ${currentModel}:`, error);
            lastError = error;
            
            const err = error as Error & { status?: number };
            const errorMessage = err?.message?.toLowerCase() || "";
            
            const isQuota = err?.status === 429 || errorMessage.includes('quota') || errorMessage.includes('exhausted') || errorMessage.includes('429');
            const isTokenQuota = isQuota && errorMessage.includes('tokens');
            
            // Jika limit token konteks panjang, ganti model tidak akan banyak membantu
            if (isTokenQuota) {
               break; 
            }
            
            // Lanjut coba model berikutnya
            continue;
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
        console.error("Gemini Error:", err);
        throw new Error(`API Error: ${err?.message || "Terjadi kesalahan jaringan/server."}`);
    }
  
    if (!response) {
        throw new Error("Gagal mendapatkan respons dari AI setelah mencoba berbagai model.");
    }

    return response.text;
}
