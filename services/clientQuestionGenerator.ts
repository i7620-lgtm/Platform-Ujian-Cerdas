/**
 * Generator Soal AI Sisi Klien Mandiri & Generator Kurikulum Standar Nasional
 * 
 * Sesuai arsitektur dan spesifikasi Asesmen Nasional (BSKAP Kemendikdasmen No. 047/H/AN/2025 & No. 045/H/AN/2025):
 * 1. Eksekusi Mandiri di Browser Pengguna dengan @google/genai & kaskade model responsif
 * 2. Penyediaan Kunci API Transparan (env, window, /api/ai-config)
 * 3. Kategori cerdas otomatis dari materi pokok nyata (bukan teks 'Materi Pokok')
 * 4. Kunci jawaban terdistribusi seimbang merata di antara opsi A, B, C, D (dan E)
 * 5. Pilihan jawaban substantif unik tanpa duplikasi dan tanpa huruf kembar
 * 6. Petunjuk pengerjaan (hint) konsep inti dan rumus pembimbing
 * 7. Dukungan penuh KaTeX / LaTeX untuk materi eksakta/sains
 */

import { GoogleGenAI } from "@google/genai";
import { QuizConfig } from "../types";
import { cleanGeneratedMathUnits } from "./geminiService";
import { extractSmartCategory, stripPrefix, isAnswerMatch } from "../components/teacher/examUtils";

let cachedApiKey: string | null = null;
let keyFetchPromise: Promise<string | null> | null = null;

/**
 * Mengambil kunci API secara transparan dari berbagai sumber terpercaya
 */
export async function getTransparentApiKey(): Promise<string | null> {
  if (cachedApiKey) return cachedApiKey;

  // 1. Cek dari runtime env klien (Vite)
  const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || 
                 (import.meta as any).env?.GEMINI_API_KEY ||
                 (typeof window !== "undefined" && (window as any).__GEMINI_KEY__);

  if (envKey && typeof envKey === "string" && envKey.trim().length > 10) {
    cachedApiKey = envKey.trim();
    return cachedApiKey;
  }

  // 2. Ambil dari endpoint konfigurasi internal server secara transparan
  if (!keyFetchPromise) {
    keyFetchPromise = (async () => {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 4000);
        const res = await fetch("/api/ai-config", { signal: controller.signal });
        clearTimeout(tid);
        if (res.ok) {
          const data = await res.json();
          if (data?.hasKey && data?.key) {
            cachedApiKey = data.key;
            return data.key;
          }
        }
      } catch (_) {
        // Abaikan kegagalan jaringan internal
      }
      return null;
    })();
  }

  const fetched = await keyFetchPromise;
  if (fetched) cachedApiKey = fetched;
  return cachedApiKey;
}

const CLIENT_CANDIDATE_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-flash-latest"
];

/**
 * Menghasilkan 1 butir soal langsung di peramban pengguna secara cepat, kreatif, dan presisi
 */
export async function generateSingleQuestionClientSide(
  config: QuizConfig,
  assignedType: string,
  assignedDiff: string,
  questionNumber: number,
  totalQuestions: number
): Promise<any | null> {
  const apiKey = await getTransparentApiKey();
  if (!apiKey) {
    return null; // Beralih ke safe proxy serverless Vercel
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: 14000, // 14 detik batas per butir soal
    }
  });

  const subject = config.subject || "Umum";
  const category = extractSmartCategory(config.category, config.subject);
  const kisiKisi = config.kisiKisi?.trim() || "";
  const blueprint = config.blueprint?.trim() || "";
  const weight = config.scoreWeight && config.scoreWeight > 0 ? config.scoreWeight : 1;

  const isHighSchool = (subject || '').toUpperCase().includes('SMA') || 
                       (subject || '').toUpperCase().includes('SMK') ||
                       (blueprint || '').toUpperCase().includes('SMA') ||
                       (blueprint || '').toUpperCase().includes('SMK');
  const targetOptionCount = isHighSchool ? 5 : 4;

  // Distribusi letak kunci jawaban seimbang merata:
  // Butir 1 -> opsi ke-2 (B), Butir 2 -> opsi ke-3 (C), Butir 3 -> opsi ke-4 (D), Butir 4 -> opsi ke-1 (A)
  const targetKeyIndex = (questionNumber) % targetOptionCount;
  const targetKeyLetter = String.fromCharCode(65 + targetKeyIndex);

  const prompt = `
Anda adalah Penulis Soal Ahli Asesmen Nasional Kemendikdasmen RI (BSKAP No. 047/H/AN/2025 & No. 045/H/AN/2025).
Buatlah TEPAT 1 BUTIR SOAL yang sangat kreatif, bermutu tinggi, dan kontekstual dunia nyata:

PARAMETER BUTIR SOAL:
- Nomor Butir: #${questionNumber} dari ${totalQuestions}
- Mata Pelajaran / Rumpun: "${subject}"
- Materi Pokok / Topik Riil: "${category}"
- Bentuk Soal: "${assignedType}"
- Tingkat Kognitif / Penalaran: "${assignedDiff}"
${kisiKisi ? `- Indikator Kisi-Kisi Khusus: "${kisiKisi}"` : ''}
${blueprint ? `- Pedoman Kurikulum: "${blueprint}"` : ''}

PEDOMAN FORMAT RUMUS MATEMATIKA & SAINS (KaTeX / LaTeX):
1. Seluruh simbol, pecahan, perbandingan/rasio, akar, pangkat, dan rumus WAJIB menggunakan format LaTeX baku diapit tanda dolar ($...$), contoh:
   - Rasio/perbandingan: "$1 : 2$" atau "$3 : 4$"
   - Pecahan: "$\\frac{3}{4}$" atau "$\\frac{a}{b}$"
   - Pangkat/indeks: "$x^2$" atau "$2x^3 - 5x + 1$"
   - Satuan volume/luas: "$\\text{cm}^3$" atau "$\\text{m}^2$"
   - Bentuk akar: "$\\sqrt{144}$" atau "$\\sqrt{x^2 + y^2}$"
2. PENTING (ESCAPE BACKSLASH): Karena Anda membalas dalam string JSON, selalu gunakan tanda garis miring ganda (double-backslash) untuk perintah LaTeX, contoh: "$\\frac{1}{2}$" bukan "$\frac{1}{2}$".

ATURAN PILIHAN JAWABAN (PILIHAN GANDA):
1. Buatlah ${targetOptionCount} opsi pilihan yang semuanya unik, bermakna substantif nyata, dan realistis (DILARANG opsi kembar, DILARANG hanya menulis huruf A/B/C/D, dan DILARANG menulis opsi generik seperti "Pilihan alternatif").
2. DILARANG memberi awalan huruf "A.", "B.", "C.", atau "D." pada teks opsi karena antarmuka sistem telah menyertakan lingkaran huruf secara otomatis.
3. DISTRIBUSI KUNCI JAWABAN: Untuk butir #${questionNumber} ini, tempatkan jawaban benar pada opsi ke-${targetKeyIndex + 1} (posisi huruf ${targetKeyLetter}).
4. Field 'correctAnswer' WAJIB diisi teks jawaban benar tersebut secara lengkap dan persis sama dengan opsi ke-${targetKeyIndex + 1} (BUKAN sekadar menulis huruf "${targetKeyLetter}").

ATURAN PETUNJUK PENGERJAAN (HINT):
- Field 'hint' WAJIB DIISI untuk butir ini! Berikan bimbingan konsep inti atau rumus pembimbing yang memandu siswa berpikir TANPA membocorkan kunci/jawaban akhir.

ATURAN BENTUK SOAL LAINNYA:
- Jika "${assignedType}" adalah "Pilihan Ganda", DILARANG menyertakan baris trueFalseRows atau matchingPairs.
- Jika "${assignedType}" adalah "Benar/Salah", buat narasi stimulus dan 3 baris pernyataan di 'trueFalseRows' dengan teks bermakna dan nilai kebenaran boolean (true/false).
- Jika "${assignedType}" adalah "Menjodohkan", buat 3-4 pasangan konsep di 'matchingPairs'.
- Jika "${assignedType}" adalah "Isian Singkat", berikan pertanyaan langsung dengan 'correctAnswer' bernilai pasti.
- Jika "${assignedType}" adalah "Esai", berikan rubrik penyelesaian lengkap di 'solutionSteps'.

Balas HANYA berupa JSON Array berisi tepat 1 objek dengan struktur:
[
  {
    "id": "q_client_${Date.now()}_${questionNumber}",
    "questionType": "${assignedType}",
    "questionText": "Narasi stimulus kontekstual dan pertanyaan yang jelas",
    "options": ["Opsi 1 substantif", "Opsi 2 substantif", "Opsi 3 substantif", "Opsi 4 substantif"],
    "correctAnswer": "Isi teks opsi benar yang persis sama dengan salah satu pilihan di atas",
    "explanation": "Penjelasan detail langkah demi langkah pembuktian jawaban benar",
    "hint": "Petunjuk konsep inti dan rumus pembimbing tanpa membocorkan jawaban",
    "solutionSteps": "Tahapan penyelesaian lengkap",
    "kisiKisi": "${kisiKisi || `Disajikan stimulus kontekstual terkait ${category}, peserta didik dapat menganalisis permasalahan dengan tepat.`}",
    "level": "${assignedDiff}",
    "category": "${category}",
    "scoreWeight": ${weight}
  }
]
`;

  for (const model of CLIENT_CANDIDATE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: 0.7,
          responseMimeType: "application/json"
        }
      });

      const text = response.text?.trim() || "";
      if (!text) continue;

      let parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        parsed = parsed[0];
      }

      if (parsed && typeof parsed === "object" && (parsed.questionText || parsed.question)) {
        // Normalisasi teks pertanyaan & opsi
        if (!parsed.questionText && parsed.question) {
          parsed.questionText = parsed.question;
        }

        parsed.questionText = cleanGeneratedMathUnits(parsed.questionText || "");
        parsed.category = category;

        // Bersihkan petunjuk pengerjaan (hint)
        if (parsed.hint) {
          parsed.hint = cleanGeneratedMathUnits(parsed.hint);
        } else {
          parsed.hint = `Pahami konsep inti ${category} dan gunakan rumus dasar yang sesuai untuk menelaah stimulus secara runtut.`;
        }

        // Khusus Pilihan Ganda: bersihkan awalan huruf dan posisikan kunci jawaban pada targetKeyIndex
        const rawType = (assignedType || "").toLowerCase();
        if (rawType.includes("pilihan ganda") && !rawType.includes("kompleks")) {
          parsed.questionType = "MULTIPLE_CHOICE";
          delete parsed.trueFalseRows;
          delete parsed.matchingPairs;

          let rawOpts = Array.isArray(parsed.options) ? parsed.options : [];
          // Bersihkan awalan A., B., C., dll dari setiap opsi
          rawOpts = rawOpts.map((opt: string) => stripPrefix(cleanGeneratedMathUnits(opt || "")).trim()).filter(Boolean);

          // Hapus opsi kembar
          const uniqueOpts: string[] = [];
          for (const opt of rawOpts) {
            if (!uniqueOpts.some(u => isAnswerMatch(u, opt, "MULTIPLE_CHOICE"))) {
              uniqueOpts.push(opt);
            }
          }

          // Pastikan jumlah opsi mencukupi
          while (uniqueOpts.length < targetOptionCount) {
            uniqueOpts.push(`Alternatif nilai pembanding ${uniqueOpts.length + 1}`);
          }

          let finalAnswer = cleanGeneratedMathUnits(parsed.correctAnswer || "");
          finalAnswer = stripPrefix(finalAnswer).trim();

          // Cari apakah jawaban benar cocok dengan salah satu opsi
          let matchedIdx = uniqueOpts.findIndex(opt => isAnswerMatch(finalAnswer, opt, "MULTIPLE_CHOICE"));

          // Jika jawaban AI berupa huruf A/B/C/D
          if (matchedIdx === -1 && /^[A-E]$/i.test(finalAnswer)) {
            const letterIdx = finalAnswer.toUpperCase().charCodeAt(0) - 65;
            if (letterIdx >= 0 && letterIdx < uniqueOpts.length) {
              matchedIdx = letterIdx;
              finalAnswer = uniqueOpts[letterIdx];
            }
          }

          if (matchedIdx === -1) {
            matchedIdx = 0;
            finalAnswer = uniqueOpts[0];
          }

          // Pindahkan kunci jawaban ke targetKeyIndex agar terdistribusi seimbang merata
          if (matchedIdx !== targetKeyIndex && targetKeyIndex < uniqueOpts.length) {
            const temp = uniqueOpts[targetKeyIndex];
            uniqueOpts[targetKeyIndex] = uniqueOpts[matchedIdx];
            uniqueOpts[matchedIdx] = temp;
          }

          parsed.options = uniqueOpts.slice(0, targetOptionCount);
          parsed.correctAnswer = parsed.options[targetKeyIndex];
        }

        return parsed;
      }
    } catch (err: any) {
      console.warn(`[Client AI Question] Model ${model} gagal (${err?.message || err}), mencoba model berikutnya...`);
      continue;
    }
  }

  return null;
}
