/**
 * Generator Soal AI Sisi Klien Mandiri & Generator Kurikulum Standar Nasional (Zero-Fail Engine)
 * 
 * Sesuai arsitektur dan spesifikasi Asesmen Nasional (BSKAP Kemendikdasmen No. 047/H/AN/2025 & No. 045/H/AN/2025):
 * 1. Eksekusi Mandiri di Browser Pengguna dengan @google/genai & kaskade model responsif
 * 2. Penyediaan Kunci API Transparan (env, window, /api/ai-config) tanpa repot
 * 3. Auto-Fallback Deterministik Standar Kurikulum Nasional untuk menjamin 100% zero-fail jika hosting/kuota kendala
 */

import { GoogleGenAI, Type } from "@google/genai";
import { Question, QuizConfig, QuestionType, ChartData } from "../types";
import { cleanGeneratedMathUnits } from "./geminiService";

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
  "gemini-3.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-3.8-flash"
];

/**
 * Menghasilkan 1 butir soal langsung di peramban pengguna secara cepat (2-4 detik)
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
    return null; // Beralih ke safe proxy atau template kurikulum
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: 12000, // 12 detik batas per soal agar tidak hang
    }
  });

  const subject = config.subject || "Umum";
  const category = config.category?.trim() || "Materi Pokok";
  const kisiKisi = config.kisiKisi?.trim() || "";
  const blueprint = config.blueprint?.trim() || "";
  const weight = config.scoreWeight && config.scoreWeight > 0 ? config.scoreWeight : 1;

  const prompt = `
Buat TEPAT 1 BUTIR SOAL berkualitas tinggi sesuai standar resmi Asesmen Nasional Kemendikdasmen RI No. 047/H/AN/2025.
Nomor Soal: #${questionNumber} dari ${totalQuestions}
Mata Pelajaran: "${subject}"
Topik / Kategori: "${category}"
Bentuk Soal yang WAJIB DIBUAT: "${assignedType}"
Tingkat Kognitif / Level: "${assignedDiff}"
${kisiKisi ? `Indikator Kisi-Kisi: "${kisiKisi}"` : ''}
${blueprint ? `Pedoman Kurikulum: "${blueprint}"` : ''}

Ketentuan Khusus Bentuk Soal:
1. Pilihan Ganda: Buat narasi stimulus kontekstual, 4 opsi (A, B, C, D) atau 5 opsi (A-E jika SMA/SMK), dan kunci 'correctAnswer' (misal: "A").
2. Pilihan Ganda Kompleks: Narasi stimulus, 4-5 opsi pernyataan, dan 'correctAnswer' berupa array string opsi yang benar (misal: ["A", "C"]).
3. Benar/Salah: Narasi stimulus dan 3 baris pernyataan matematis/faktual di 'trueFalseRows' dengan field text dan boolean answer (true/false).
4. Menjodohkan: 3-4 pasang konsep di 'matchingPairs' dengan field left dan right.
5. Isian Singkat: Pertanyaan langsung berhitung/faktual dengan jawaban pasti di 'correctAnswer'.
6. Esai: Soal analisis/pemecahan masalah dengan rubrik penilaian lengkap di 'explanation'.

Balas HANYA berupa JSON Array berisi tepat 1 objek dengan format:
[
  {
    "id": "q_client_${Date.now()}_${questionNumber}",
    "questionType": "${assignedType}",
    "questionText": "Teks stimulus dan pertanyaan lengkap",
    "options": ["Opsi A", "Opsi B", "Opsi C", "Opsi D"],
    "correctAnswer": "A",
    "explanation": "Pembahasan langkah demi langkah yang membuktikan kebenaran kunci jawaban",
    "kisiKisi": "${kisiKisi || `Disajikan stimulus terkait ${category}, peserta didik dapat menganalisis permasalahan dengan tepat.`}",
    "level": "${assignedDiff}",
    "category": "${category}",
    "scoreWeight": ${weight},
    "trueFalseRows": [
      { "text": "Pernyataan 1 lengkap bermakna", "answer": true },
      { "text": "Pernyataan 2 lengkap bermakna", "answer": false },
      { "text": "Pernyataan 3 lengkap bermakna", "answer": true }
    ],
    "matchingPairs": [
      { "left": "Istilah 1", "right": "Pasangan 1" },
      { "left": "Istilah 2", "right": "Pasangan 2" },
      { "left": "Istilah 3", "right": "Pasangan 3" }
    ]
  }
]
`;

  for (const model of CLIENT_CANDIDATE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: 0.3,
          responseMimeType: "application/json"
        }
      });

      const text = response.text?.trim() || "";
      if (!text) continue;

      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed[0];
      } else if (parsed && typeof parsed === "object" && parsed.questionText) {
        return parsed;
      }
    } catch (err: any) {
      console.warn(`[Client AI Question] Model ${model} gagal (${err?.message || err}), mencoba model berikutnya...`);
      continue;
    }
  }

  return null;
}

