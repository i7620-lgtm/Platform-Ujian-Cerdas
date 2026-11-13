import { GoogleGenAI, Type } from "@google/genai";
import { generateDeterministicDiagnosticReport } from "./diagnosticFallback.ts";
import { buildAIMAnalysisDirectives } from "../services/aiPersonaAimEngine.ts";

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
        timeout: 25000,
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

export const FLASH_MODELS_CASCADE = [
    'gemini-3.8-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-2.5-flash'
];

// In-memory tracker for models with exhausted daily quotas to minimize latency
const exhaustedModelsMap = new Map<string, number>();

function markModelExhausted(model: string, durationMs: number = 3 * 60 * 1000) {
    exhaustedModelsMap.set(model, Date.now() + durationMs);
}

function isModelTemporarilyExhausted(model: string): boolean {
    const expire = exhaustedModelsMap.get(model);
    if (!expire) return false;
    if (Date.now() > expire) {
        exhaustedModelsMap.delete(model);
        return false;
    }
    return true;
}

export async function generateAIAnalysisOnServer(prompt: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      console.info("[Analisis AI] API Key tidak tersedia di server, menggunakan intelligent diagnostic report...");
      return generateDeterministicDiagnosticReport(prompt);
    }

    const ai = getAI();
    let response: string | null = null;
    let lastError: unknown = null;

    // Filter model yang tidak dalam status exhausted
    const uniqueModels = Array.from(new Set(FLASH_MODELS_CASCADE));
    const sortedModels = [
        ...uniqueModels.filter(m => !isModelTemporarilyExhausted(m)),
        ...uniqueModels.filter(m => isModelTemporarilyExhausted(m))
    ];

    for (const currentModel of sortedModels) {
        try {
            console.log(`[Analisis AI] Mencoba model: ${currentModel}...`);

            // Batas waktu per model maksimal 10 detik agar tidak menyebabkan bottleneck
            const generatePromise = ai.models.generateContent({
                model: currentModel,
                contents: prompt,
                config: {
                    systemInstruction: buildAIMAnalysisDirectives(),
                    temperature: 0.2,
                }
            });

            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error(`Model ${currentModel} timeout (10s)`)), 10000);
            });

            const res = await Promise.race([generatePromise, timeoutPromise]);

            if (res && res.text && res.text.trim().length > 0) {
                response = res.text.trim();
                console.log(`[Analisis AI] Berhasil menghasilkan analisis dengan model: ${currentModel}`);
                return response;
            }
        } catch (error: unknown) {
            lastError = error;
            const err = error as Error & { status?: number };
            const errorMessage = err?.message?.toLowerCase() || "";

            const is503 = err?.status === 503 || errorMessage.includes('503') || errorMessage.includes('high demand') || errorMessage.includes('unavailable');
            const isQuota = err?.status === 429 || errorMessage.includes('quota') || errorMessage.includes('exhausted') || errorMessage.includes('429');

            if (is503 || isQuota) {
                markModelExhausted(currentModel, is503 ? 60000 : 180000);
            }

            console.log(`[Analisis AI] Model ${currentModel} mengalami ${is503 ? '503 (high demand)' : isQuota ? '429 (kuota)' : 'kendala'}. Beralih langsung ke model berikutnya...`);
            // Langsung beralih ke model berikutnya tanpa menunggu perulangan yang sama
            continue;
        }
    }

    // Jika seluruh model AI mengalami antrean 503 atau batas kuota
    console.warn("[Analisis AI] Seluruh model AI dalam kaskade sedang mengalami beban penuh (503/429). Mengaktifkan fallback laporan diagnostik cerdas...");
    try {
        const fallbackReport = generateDeterministicDiagnosticReport(prompt);
        if (fallbackReport && fallbackReport.length > 50) {
            console.log("[Analisis AI] Laporan diagnostik klinis cerdas berhasil dihasilkan secara instan.");
            return fallbackReport;
        }
    } catch (fallbackErr) {
        console.error("[Analisis AI] Gagal menyusun fallback diagnostik:", fallbackErr);
    }

    if (lastError && !response) {
        const err = lastError as Error & { status?: number };
        throw new Error(err?.message || "Layanan AI sedang sibuk. Silakan coba kembali sesaat lagi.");
    }

    return generateDeterministicDiagnosticReport(prompt);
}

export async function generateQuestionsOnServer(prompt: string, systemInstruction: string, modelsToTry: string[], properties: any): Promise<any> {
    const ai = getAI();
    let response = null;
    let lastError: unknown = null;
  
    // Cascade of modern valid Flash & Flash Lite models from highest to lowest
    const inputModels = (modelsToTry && modelsToTry.length > 0 ? modelsToTry : FLASH_MODELS_CASCADE)
        .map(m => (m === 'gemini-3.5-flash' || m === 'gemini-3.7-flash') ? 'gemini-3.8-flash' : m)
        .filter(m => m !== 'gemini-2.0-flash' && m !== 'gemini-1.5-flash' && m !== 'gemini-2.5-pro');
    
    const combinedModels = [...inputModels];
    for (const m of FLASH_MODELS_CASCADE) {
        if (!combinedModels.includes(m)) {
            combinedModels.push(m);
        }
    }

    // Deduplicate and prioritize active, non-exhausted models while maintaining highest-to-lowest order
    const uniqueModels = Array.from(new Set(combinedModels));
    const sortedModels = [
        ...uniqueModels.filter(m => !isModelTemporarilyExhausted(m)),
        ...uniqueModels.filter(m => isModelTemporarilyExhausted(m))
    ];

    for (const currentModel of sortedModels) {
        let attempts = 0;
        const maxAttempts = 2;
        let success = false;

        while (attempts < maxAttempts && !success) {
            attempts++;
            try {
                console.log(`Mencoba membuat soal menggunakan model: ${currentModel} (Percobaan ${attempts}/${maxAttempts})`);
                const configObj: any = {
                  systemInstruction: systemInstruction,
                  temperature: 0.7,
                  responseMimeType: "application/json"
                };

                // Gunakan properties lengkap agar diagram statistik (chartData), tabel, dan geometri ter-generate secara utuh
                const fullProperties = (properties && Object.keys(properties).length > 0) ? properties : {
                  id: { type: Type.STRING },
                  questionType: { type: Type.STRING },
                  questionText: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswer: { type: Type.STRING },
                  scoreWeight: { type: Type.NUMBER },
                  kisiKisi: { type: Type.STRING },
                  level: { type: Type.STRING },
                  category: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  hint: { type: Type.STRING },
                  solutionSteps: { type: Type.STRING },
                  visualStimulusType: { type: Type.STRING },
                  svgPrompt: { type: Type.STRING },
                  svgStyle: { type: Type.STRING },
                  categoryLabels: { type: Type.ARRAY, items: { type: Type.STRING } },
                  chartData: {
                    type: Type.OBJECT,
                    properties: {
                      type: { type: Type.STRING },
                      title: { type: Type.STRING },
                      labels: { type: Type.ARRAY, items: { type: Type.STRING } },
                      datasets: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            label: { type: Type.STRING },
                            data: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                            dataValues: { type: Type.ARRAY, items: { type: Type.STRING } },
                            backgroundColor: { type: Type.ARRAY, items: { type: Type.STRING } },
                            borderColor: { type: Type.ARRAY, items: { type: Type.STRING } }
                          },
                          required: ["label"]
                        }
                      }
                    }
                  },
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
                  }
                };

                configObj.responseSchema = {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: fullProperties,
                    required: ["id", "questionType", "questionText", "correctAnswer", "kisiKisi", "level", "category"]
                  }
                };

                try {
                  response = await ai.models.generateContent({
                    model: currentModel,
                    contents: prompt,
                    config: configObj,
                  });
                } catch (schemaErr: any) {
                  const schemaErrMsg = schemaErr?.message?.toLowerCase() || "";
                  if (schemaErr?.status === 400 || schemaErrMsg.includes("invalid argument") || schemaErrMsg.includes("schema")) {
                    delete configObj.responseSchema;
                    response = await ai.models.generateContent({
                      model: currentModel,
                      contents: prompt,
                      config: configObj,
                    });
                  } else {
                    throw schemaErr;
                  }
                }

                lastError = null;
                success = true;
                break;
            } catch (error: unknown) {
                lastError = error;
                const err = error as Error & { status?: number };
                const errorMessage = err?.message?.toLowerCase() || "";
                
                const is503 = err?.status === 503 || errorMessage.includes('503') || errorMessage.includes('high demand');
                const isQuota = err?.status === 429 || errorMessage.includes('quota') || errorMessage.includes('exhausted') || errorMessage.includes('429');
                
                if (isQuota) {
                    markModelExhausted(currentModel);
                }

                if (is503 && attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 800));
                    continue;
                }
                
                console.log(`[Model Switch] Model ${currentModel} ${is503 ? '503 antrean tinggi' : isQuota ? '429 batas kuota' : 'beralih'}, beralih ke model berikutnya...`);
                break;
            }
        }
        if (success) {
            break;
        }
    }
  
    if (lastError && !response) {
        const err = lastError as Error & { status?: number };
        const errorMessage = err?.message?.toLowerCase() || "";
        console.warn("[Gemini API] Seluruh model AI sedang mengalami beban/kuota penuh. Error:", errorMessage.slice(0, 80));
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
