import { GoogleGenAI, Type } from "@google/genai";
import { generateContextualEducationalSvg } from "./smartSvgFallback.js";
import { validateEducationalSafety } from "./contentModeration.js";

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
    const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
    
    for (const model of modelsToTry) {
        let attempts = 0;
        const maxAttempts = 2;
        
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
                const is503 = e?.status === 503 || e?.message?.includes('503') || e?.message?.includes('high demand');
                const isQuota = e?.status === 429 || e?.message?.includes('quota') || e?.message?.includes('429');
                if (is503 && attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 600));
                    continue;
                }
                console.log(`[Analisis AI] Model ${model} ${is503 ? '503 antrean tinggi' : isQuota ? '429 kuota' : 'beralih'}, beralih ke model berikutnya...`);
                break; 
            }
        }
    }
    throw new Error("Layanan AI Gemini sedang mengalami antrean tinggi. Harap tunggu beberapa saat lalu coba kembali.");
}

export async function generateSvgOnServer(prompt: string, style?: string): Promise<string> {
    const safety = validateEducationalSafety(prompt);
    if (!safety.isSafe) {
        throw new Error(safety.reason || "Permintaan tidak sesuai dengan standar etika pendidikan sekolah.");
    }

    const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemini-3.8-flash'];
    
    let styleInstruction = "";
    if (style === "infographic") {
        styleInstruction = "Fokuskan pada infografis edukasi modern: judul topik yang jelas, 2-3 kartu konsep simetris dengan ikon dan poin-poin materi, serta kotak kesimpulan/rangkuman rapi di bagian bawah.";
    } else if (style === "diagram") {
        styleInstruction = "Fokuskan pada diagram ilmiah berlabel lengkap dengan panah penunjuk, bagian-bagian objek/organ/alam, dan teks label keterangan yang jelas dan mudah dipahami siswa.";
    } else if (style === "flowchart") {
        styleInstruction = "Fokuskan pada bagan alur proses bertahap atau diagram siklus (daur air, rantai makanan, metamorfosis) dengan panah penghubung, ikon sederhana, dan penomoran langkah yang rapi.";
    } else if (style === "flat_art") {
        styleInstruction = "Gunakan gaya ilustrasi vektor modern datar (flat design) dengan warna-warna cerah, bentuk ramah edukasi, dan tampilan visual menarik untuk siswa sekolah.";
    } else if (style === "geometry") {
        styleInstruction = "Fokuskan pada gambar geometri matematika yang presisi, dimensi ukuran yang jelas (panjang, lebar, tinggi, jari-jari), sudut, atau grafik kartesius yang terstruktur rapi.";
    } else {
        styleInstruction = "Buat infografis atau diagram materi pendidikan yang jelas, rapi, dengan label keterangan dan warna kontras yang edukatif.";
    }

    if (safety.educationalSafetyDirective) {
        styleInstruction += `\nDIREKTIF KEPATUTAN KURIKULUM: ${safety.educationalSafetyDirective}`;
    }

    const systemInstruction = `Anda adalah Ahli Desain Grafis Vektor dan Ilustrator Edukasi SVG profesional kelas dunia untuk kurikulum sekolah Indonesia (K-12).
Tugas Anda adalah membuat kode SVG murni (<svg ...> ... </svg>) berkualitas tinggi, modern, sangat rapi, proporsional, dan 100% edukatif.

MANDAT KESELAMATAN & ETIKA PENDIDIKAN K-12 (ZERO-TOLERANCE SAFETY POLICY):
1. DILARANG KERAS memuat pornografi, erotisme, ketelanjangan (nudity), tubuh tanpa busana, pakaian tidak senonoh, atau pose vulgar apapun.
2. DILARANG KERAS memuat isu SARA, penghinaan suku/agama/ras/golongan, ujaran kebencian, bias diskriminatif, atau stereotip peyoratif.
3. Jika materi berkaitan dengan BIOLOGI / ANATOMI (misal sistem reproduksi, organ dalam, sel): Sajikan secara MURNI DIAGRAM SKEMATIS MEDIS FORMAL BUKU PELAJARAN SEKOLAH (diagram organ internal ilmiah berlabel dengan warna netral pastel, tanpa wujud tubuh telanjang manusia).
4. Jika materi berkaitan dengan BUDAYA / SUKU / AGAMA: Sajikan dengan penuh penghormatan, berbusana adat sopan lengkap, mencerminkan persatuan bangsa dan Bhinneka Tunggal Ika.
5. Dilarang memuat kekerasan grafis, darah, senjata, atau simbol kebencian.

INSTRUKSI GAYA KHUSUS:
${styleInstruction}

PANDUAN TATA LETAK & KEJELASAN TEKS SVG (MENCEGAH TEKS BERTUMPUK / TERLEWAT):
1. Kembalikan HANYA kode SVG valid yang diawali dengan <svg> dan diakhiri dengan </svg>. JANGAN sertakan penjelasan teks dan JANGAN gunakan markdown codeblock.
2. Atribut elemen <svg> WAJIB:
   viewBox="0 0 850 560" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"
3. Latar Belakang & Ruang Aman:
   - Baris pertama wajib: <rect width="100%" height="100%" fill="#ffffff" rx="16" />
   - Batas konten aman: koordinat X antara 40 dan 810, koordinat Y antara 30 dan 530.
4. TATA LETAK HEADER ATAS (y=25 sampai y=90):
   - Gunakan wadah header elegan di bagian atas: <rect x="40" y="25" width="770" height="65" rx="12" ... />
   - Judul Utama: 1 baris ringkas, jelas (maksimal 35 karakter), font-size="20-22" font-weight="800", text-anchor="middle" di x="425" y="55".
   - Subjudul materi: 1 baris, font-size="12-13", text-anchor="middle" di x="425" y="78".
5. RUANG DIAGRAM UTAMA LAPANG (y=105 sampai y=520):
   - Berikan ruang vertikal luas (415px) agar bentuk, organ, alur proses, atau kartu diagram tidak berdesakan.
   - SEMUA LABEL HARUS SINGKAT & PADAT (1 sampai 4 kata saja). DILARANG membuat paragraf panjang atau uraian narasi di dalam diagram!
   - Hindari tumpang-tindih: Jarak vertikal antar elemen atau baris teks MINIMAL 30px.
   - Label pada garis/panah: Tempatkan di atas background badge (<rect rx="4" ...>) atau beri jarak aman agar tidak menimpa garis.
   - Gunakan text-anchor="middle" dan pasang koordinat x tepat di tengah kartu/bentuk.
   - Wajib gunakan entitas XML &amp; jika menggunakan simbol '&' (dilarang karakter '&' mentah).
   - Gunakan font-family="system-ui, -apple-system, sans-serif".
   - Ejaan wajib menggunakan Bahasa Indonesia baku resmi (EYD), bebas typo, dan istilah ilmiah yang tepat.`;

    for (const model of modelsToTry) {
        let attempts = 0;
        const maxAttempts = 2;
        
        while (attempts < maxAttempts) {
            attempts++;
            try {
                const ai = getAI();
                const response = await ai.models.generateContent({
                    model: model, 
                    contents: prompt,
                    config: {
                        systemInstruction: systemInstruction,
                        temperature: 0.2,
                    }
                });
                
                const rawText = response.text || "";
                const validatedSvg = cleanAndValidateSvg(rawText);
                if (validatedSvg) {
                    return validatedSvg;
                }
                break;
            } catch (e: any) {
                const is503 = e?.status === 503 || e?.message?.includes('503') || e?.message?.includes('high demand');
                const isQuota = e?.status === 429 || e?.message?.includes('quota') || e?.message?.includes('429') || e?.message?.includes('RESOURCE_EXHAUSTED');
                if (is503 && attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 800));
                    continue;
                }
                console.log(`[SVG Generator] Model ${model} ${is503 ? '503 antrean tinggi' : isQuota ? '429 kuota' : 'beralih'}, beralih ke opsi berikutnya...`);
                break;
            }
        }
    }

    // Safe Fallback: Jika seluruh model AI tidak dapat diakses atau kehabisan kuota, berikan template diagram kurikulum offline bermutu tinggi
    console.log(`[Safe Fallback SVG] Mengaktifkan diagram vektor edukatif kurikulum offline untuk: "${prompt.slice(0, 50)}..."`);
    return cleanAndValidateSvg(generateContextualEducationalSvg(prompt, style));
}

/**
 * Validasi dan pembersihan kode SVG: memastikan root tag benar, namespace lengkap, dan entitas XML valid.
 */
function cleanAndValidateSvg(rawText: string): string {
    const cleaned = (rawText || "").replace(/^```(xml|svg)?\s*/i, '').replace(/```\s*$/i, '').trim();
    const svgMatch = cleaned.match(/<svg[\s\S]*<\/svg>/i);
    let resultSvg = "";
    if (svgMatch) {
        resultSvg = svgMatch[0];
    } else if (cleaned.startsWith("<svg") && cleaned.endsWith("</svg>")) {
        resultSvg = cleaned;
    }
    if (!resultSvg) return "";

    // Pastikan namespace SVG ada
    if (!resultSvg.includes('xmlns="http://www.w3.org/2000/svg"')) {
        resultSvg = resultSvg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    // Perbaiki simbol '&' mentah menjadi entitas XML &amp; (mencegah parsing error pada browser)
    return resultSvg.replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, "&amp;");
}

// In-memory tracker for models with exhausted daily quotas to minimize latency
const exhaustedModelsMap = new Map<string, number>();

function markModelExhausted(model: string, durationMs: number = 10 * 60 * 1000) {
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

export async function generateQuestionsOnServer(prompt: string, systemInstruction: string, modelsToTry: string[], properties: any): Promise<any> {
    const ai = getAI();
    let response = null;
    let lastError: unknown = null;
  
    // Cascade of modern valid Gemini models
    const fallbackCascade = ['gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];
    const validModels = (modelsToTry && modelsToTry.length > 0 ? modelsToTry : fallbackCascade)
        .map(m => (m === 'gemini-3.5-flash' || m === 'gemini-3.7-flash') ? 'gemini-3.8-flash' : m)
        .filter(m => m !== 'gemini-flash-latest' && m !== 'gemini-2.0-flash' && m !== 'gemini-1.5-flash' && m !== 'gemini-2.5-pro');
    
    for (const m of fallbackCascade) {
        if (!validModels.includes(m)) {
            validModels.push(m);
        }
    }

    // Deduplicate and prioritize active, non-exhausted models
    const uniqueModels = Array.from(new Set(validModels));
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
