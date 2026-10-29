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
import { extractSmartCategory, stripPrefix, isAnswerMatch, detectEducationalStage, parseList, normalize } from "../components/teacher/examUtils";
import { resolveExpertPersona, buildAIMDirectives, validateAndReflectQuestions } from "./aiPersonaAimEngine";

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
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-2.5-flash"
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

  // Deteksi jenjang/fase pendidikan pengguna (SD Awal, SD Akhir & SMP, SMA/SMK)
  const stage = detectEducationalStage(config);
  const targetOptionCount = stage.targetOptionCount;
  const trueFalseRowCount = stage.trueFalseRowCount;
  const matchingPairCount = stage.matchingPairCount;
  const complexMinCorrect = stage.complexMinCorrect;
  const complexMaxCorrect = stage.complexMaxCorrect;

  // Distribusi letak kunci jawaban seimbang merata:
  const targetKeyIndex = (questionNumber) % targetOptionCount;
  const targetKeyLetter = String.fromCharCode(65 + targetKeyIndex);

  const persona = resolveExpertPersona(config);
  const aimDirectives = buildAIMDirectives(config);

  const prompt = `
${persona}

${aimDirectives}

TUGAS UTAMA:
Buatlah TEPAT 1 BUTIR SOAL yang sangat kreatif, bermutu tinggi, dan kontekstual dunia nyata sesuai parameter berikut:

PARAMETER BUTIR SOAL:
- Nomor Butir: #${questionNumber} dari ${totalQuestions}
- Jenjang Pendidikan / Fase: ${stage.stageLabel}
- Mata Pelajaran / Rumpun: "${subject}"
- Materi Pokok / Topik Riil: "${category}"
- Bentuk Soal: "${assignedType}"
- Tingkat Kognitif / Penalaran: "${assignedDiff}"
${kisiKisi ? `- Indikator Kisi-Kisi Khusus (WAJIB DIIKUTI SECARA KETAT DAN PRESISI): "${kisiKisi}"` : `- Materi Pokok: Rumuskan stimulus dan indikator kisi-kisi pencapaian kompetensi materi "${category}" secara kontekstual`}
${blueprint ? `- Pedoman Kurikulum: "${blueprint}"` : ''}

PEDOMAN FORMAT RUMUS MATEMATIKA & SAINS (KaTeX / LaTeX):
1. Seluruh simbol, pecahan, perbandingan/rasio, akar, pangkat, dan rumus WAJIB menggunakan format LaTeX baku diapit tanda dolar ($...$), contoh:
   - Rasio/perbandingan: "$1 : 2$" atau "$3 : 4$"
   - Pecahan: "$\\frac{3}{4}$" atau "$\\frac{a}{b}$"
   - Pangkat/indeks: "$x^2$" atau "$2x^3 - 5x + 1$"
   - Satuan volume/luas: "$\\text{cm}^3$" atau "$\\text{m}^2$"
   - Bentuk akar: "$\\sqrt{144}$" atau "$\\sqrt{x^2 + y^2}$"
2. PENTING (ESCAPE BACKSLASH): Karena Anda membalas dalam string JSON, selalu gunakan tanda garis miring ganda (double-backslash) untuk perintah LaTeX, contoh: "$\\frac{1}{2}$" bukan "$\frac{1}{2}$".

ATURAN STRUKTUR PILIHAN & KUNCI JAWABAN (SESUAI BENTUK SOAL):
1. Jika "${assignedType}" adalah "Pilihan Ganda":
   - Buatlah ${targetOptionCount} opsi pilihan yang semuanya unik, bermakna substantif nyata, dan realistis (DILARANG opsi kembar).
   - DILARANG memberi awalan huruf "A.", "B.", "C.", atau "D." pada teks opsi.
   - DISTRIBUSI KUNCI JAWABAN: Untuk butir #${questionNumber} ini, tempatkan jawaban benar pada opsi ke-${targetKeyIndex + 1} (posisi huruf ${targetKeyLetter}).
   - Field 'correctAnswer' WAJIB diisi teks jawaban benar tersebut secara lengkap dan persis sama dengan opsi ke-${targetKeyIndex + 1}.

2. Jika "${assignedType}" adalah "Pilihan Ganda Kompleks":
   - Jenjang: ${stage.stageLabel}.
   - 'options': WAJIB berisi TEPAT ${targetOptionCount} opsi pernyataan substantif yang kaya konteks (DILARANG opsi kosong/dummy).
   - 'correctAnswer': WAJIB memuat minimal ${complexMinCorrect} dan maksimal ${complexMaxCorrect} opsi yang benar (dipisahkan tanda "|||" atau format JSON array string).
   - PERINGATAN KERAS: DILARANG HANYA 1 JAWABAN BENAR DAN DILARANG SEMUA OPSI BENAR! Jumlah jawaban benar wajib antara ${complexMinCorrect} dan ${complexMaxCorrect}.

3. Jika "${assignedType}" adalah "Benar/Salah":
   - Jenjang: ${stage.stageLabel}.
   - 'trueFalseRows': WAJIB berisi array TEPAT ${trueFalseRowCount} baris pernyataan terstruktur:
     [
       { "text": "Pernyataan proposisi faktual/rumus 1", "answer": true },
       ...
     ]
   - KESEIMBANGAN NILAI KEBENARAN: Nilai boolean 'answer' WAJIB bervariasi (DILARANG semua true dan DILARANG semua false; wajib memiliki minimal 1 Benar dan minimal 1 Salah).
   - 'correctAnswer': ringkasan nilai kebenaran, contoh: "Pernyataan 1: Benar, Pernyataan 2: Salah".

4. Jika "${assignedType}" adalah "Menjodohkan":
   - Jenjang: ${stage.stageLabel}.
   - 'matchingPairs': WAJIB berisi TEPAT ${matchingPairCount} pasang { "left": "konsep/pernyataan kiri", "right": "pasangan kanan yang cocok" } dengan relasi seimbang 1:1 tanpa ambigu.
   - 'correctAnswer': daftar pasangan yang benar.

5. Jika "${assignedType}" adalah "Isian Singkat":
   - Berikan pertanyaan langsung dengan 'correctAnswer' bernilai pasti (angka/kata kunci).

6. Jika "${assignedType}" adalah "Esai":
   - Berikan rubrik penyelesaian lengkap di 'solutionSteps'.

ATURAN PETUNJUK PENGERJAAN & PEMBAHASAN JAWABAN:
- Field 'hint' WAJIB DIISI! Berikan petunjuk konsep inti, petunjuk arah penalaran, atau rumus pembimbing yang memandu siswa berpikir TANPA membocorkan kunci/jawaban akhir.
- Field 'solutionSteps' WAJIB DIISI! Berikan pembahasan jawaban lengkap dan tahapan langkah penyelesaian terperinci dari awal hingga akhir pembuktian jawaban benar.

Balas HANYA berupa JSON Array berisi tepat 1 objek dengan struktur:
[
  {
    "id": "q_client_${Date.now()}_${questionNumber}",
    "questionType": "${assignedType}",
    "questionText": "Narasi stimulus kontekstual dan pertanyaan yang jelas",
    "options": ["Opsi 1 substantif", "Opsi 2 substantif", "Opsi 3 substantif", "Opsi 4 substantif"],
    "correctAnswer": "Isi teks opsi benar yang persis sama dengan salah satu pilihan di atas",
    "explanation": "Pembahasan detail langkah demi langkah pembuktian jawaban benar",
    "hint": "Petunjuk konsep inti dan rumus pembimbing tanpa membocorkan jawaban",
    "solutionSteps": "Pembahasan jawaban dan tahapan penyelesaian lengkap dari awal sampai akhir",
    "kisiKisi": "${kisiKisi ? kisiKisi.replace(/"/g, '\\"') : `Disajikan stimulus kontekstual terkait ${category}, peserta didik dapat menganalisis permasalahan dengan tepat.`}",
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

        // Bersihkan pembahasan jawaban (solutionSteps)
        if (parsed.solutionSteps) {
          parsed.solutionSteps = cleanGeneratedMathUnits(parsed.solutionSteps);
        } else if (parsed.explanation) {
          parsed.solutionSteps = cleanGeneratedMathUnits(parsed.explanation);
        } else {
          parsed.solutionSteps = `Pembahasan jawaban lengkap untuk materi ${category}. Telaah stimulus dan terapkan prinsip pembuktian secara terstruktur.`;
        }

        // Pertahankan kisi-kisi dari input pengguna jika ada, atau gunakan dari AI
        if (kisiKisi) {
          parsed.kisiKisi = kisiKisi;
        } else if (parsed.kisiKisi) {
          parsed.kisiKisi = cleanGeneratedMathUnits(parsed.kisiKisi);
        } else {
          parsed.kisiKisi = `Disajikan stimulus kontekstual terkait ${category}, peserta didik dapat menganalisis permasalahan dengan tepat.`;
        }

        const rawType = (assignedType || "").toLowerCase();

        // 1. KHUSUS PILIHAN GANDA (MULTIPLE_CHOICE)
        if (rawType.includes("pilihan ganda") && !rawType.includes("kompleks")) {
          parsed.questionType = "MULTIPLE_CHOICE";
          delete parsed.trueFalseRows;
          delete parsed.matchingPairs;

          let rawOpts = Array.isArray(parsed.options) ? parsed.options : [];
          rawOpts = rawOpts.map((opt: string) => stripPrefix(cleanGeneratedMathUnits(opt || "")).trim()).filter(Boolean);

          const uniqueOpts: string[] = [];
          for (const opt of rawOpts) {
            if (!uniqueOpts.some(u => isAnswerMatch(u, opt, "MULTIPLE_CHOICE"))) {
              uniqueOpts.push(opt);
            }
          }

          while (uniqueOpts.length < targetOptionCount) {
            uniqueOpts.push(`Alternatif nilai pembanding ${uniqueOpts.length + 1}`);
          }

          let finalAnswer = cleanGeneratedMathUnits(parsed.correctAnswer || "");
          finalAnswer = stripPrefix(finalAnswer).trim();

          let matchedIdx = uniqueOpts.findIndex(opt => isAnswerMatch(finalAnswer, opt, "MULTIPLE_CHOICE"));

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

          if (matchedIdx !== targetKeyIndex && targetKeyIndex < uniqueOpts.length) {
            const temp = uniqueOpts[targetKeyIndex];
            uniqueOpts[targetKeyIndex] = uniqueOpts[matchedIdx];
            uniqueOpts[matchedIdx] = temp;
          }

          parsed.options = uniqueOpts.slice(0, targetOptionCount);
          parsed.correctAnswer = parsed.options[targetKeyIndex];
        }

        // 2. KHUSUS PILIHAN GANDA KOMPLEKS (COMPLEX_MULTIPLE_CHOICE)
        else if (rawType.includes("kompleks")) {
          parsed.questionType = "COMPLEX_MULTIPLE_CHOICE";
          delete parsed.trueFalseRows;
          delete parsed.matchingPairs;

          let rawOpts = Array.isArray(parsed.options) ? parsed.options : [];
          rawOpts = rawOpts.map((opt: string) => stripPrefix(cleanGeneratedMathUnits(opt || "")).trim()).filter(Boolean);

          const uniqueOpts: string[] = [];
          for (const opt of rawOpts) {
            if (!uniqueOpts.some(u => isAnswerMatch(u, opt, "COMPLEX_MULTIPLE_CHOICE"))) {
              uniqueOpts.push(opt);
            }
          }

          // Pastikan jumlah opsi tepat targetOptionCount
          while (uniqueOpts.length < targetOptionCount) {
            uniqueOpts.push(`Pernyataan pendukung tambahan ${uniqueOpts.length + 1} terkait ${category}`);
          }
          parsed.options = uniqueOpts.slice(0, targetOptionCount);

          // Parse kunci jawaban kompleks
          const rawAnswer = parsed.correctAnswer;
          const parsedAnswers = parseList(typeof rawAnswer === "string" ? rawAnswer : JSON.stringify(rawAnswer), parsed.options);
          
          let mappedAnswers: string[] = [];
          for (const ans of parsedAnswers) {
            const cleanedAns = stripPrefix(cleanGeneratedMathUnits(ans || "")).trim();
            const matched = parsed.options.find((opt: string) => isAnswerMatch(cleanedAns, opt, "COMPLEX_MULTIPLE_CHOICE"));
            if (matched && !mappedAnswers.includes(matched)) {
              mappedAnswers.push(matched);
            }
          }

          // Validasi batas minimal 2 benar dan maksimal targetOptionCount - 1
          if (mappedAnswers.length < complexMinCorrect) {
            for (const opt of parsed.options) {
              if (!mappedAnswers.includes(opt)) {
                mappedAnswers.push(opt);
                if (mappedAnswers.length >= complexMinCorrect) break;
              }
            }
          }

          if (mappedAnswers.length > complexMaxCorrect) {
            mappedAnswers = mappedAnswers.slice(0, complexMaxCorrect);
          }

          parsed.correctAnswer = JSON.stringify(mappedAnswers);
        }

        // 3. KHUSUS BENAR / SALAH (TRUE_FALSE)
        else if (rawType.includes("benar") || rawType.includes("salah") || rawType.includes("true_false")) {
          parsed.questionType = "TRUE_FALSE";
          parsed.options = undefined;
          delete parsed.matchingPairs;

          let rawRows: { text: string; answer: boolean }[] = Array.isArray(parsed.trueFalseRows) ? parsed.trueFalseRows : [];

          // Sesuaikan jumlah baris pernyataan ke trueFalseRowCount
          while (rawRows.length < trueFalseRowCount) {
            const idx = rawRows.length + 1;
            rawRows.push({
              text: `Pernyataan nomor ${idx} terkait ${category} sesuai dengan prinsip dan formula yang berlaku.`,
              answer: idx % 2 === 1
            });
          }
          rawRows = rawRows.slice(0, trueFalseRowCount);

          // Bersihkan teks pernyataan dan pastikan tipe boolean
          const cleanedRows = rawRows.map(r => ({
            text: cleanGeneratedMathUnits(r.text || ""),
            answer: typeof r.answer === "string" 
              ? (r.answer as string).toLowerCase().includes("benar") || (r.answer as string).toLowerCase().includes("true") || (r.answer as string) === "1"
              : Boolean(r.answer)
          }));

          // KESEIMBANGAN BOOLEAN: Dilarang semua true atau semua false
          const allTrue = cleanedRows.every(r => r.answer === true);
          const allFalse = cleanedRows.every(r => r.answer === false);
          if (allTrue && cleanedRows.length > 1) {
            cleanedRows[cleanedRows.length - 1].answer = false;
          } else if (allFalse && cleanedRows.length > 1) {
            cleanedRows[0].answer = true;
          }

          parsed.trueFalseRows = cleanedRows;
          parsed.correctAnswer = cleanedRows
            .map((r, i) => `Pernyataan ${i + 1}: ${r.answer ? 'Benar' : 'Salah'}`)
            .join(", ");
        }

        // 4. KHUSUS MENJODOHKAN (MATCHING)
        else if (rawType.includes("jodoh") || rawType.includes("matching")) {
          parsed.questionType = "MATCHING";
          parsed.options = undefined;
          delete parsed.trueFalseRows;

          let rawPairs: { left: string; right: string }[] = Array.isArray(parsed.matchingPairs) ? parsed.matchingPairs : [];

          while (rawPairs.length < matchingPairCount) {
            const idx = rawPairs.length + 1;
            rawPairs.push({
              left: `Konsep Istilah ${idx} (${category})`,
              right: `Deskripsi Penjelasan ${idx} yang sesuai`
            });
          }
          rawPairs = rawPairs.slice(0, matchingPairCount);

          const cleanedPairs = rawPairs.map(p => ({
            left: cleanGeneratedMathUnits(p.left || ""),
            right: cleanGeneratedMathUnits(p.right || "")
          }));

          parsed.matchingPairs = cleanedPairs;
          parsed.correctAnswer = cleanedPairs.map(p => `${p.left} -> ${p.right}`).join(", ");
        }

        const validated = validateAndReflectQuestions([parsed]);
        return validated[0] || parsed;
      }
    } catch (err: any) {
      console.warn(`[Client AI Question] Model ${model} gagal (${err?.message || err}), mencoba model berikutnya...`);
      continue;
    }
  }

  return null;
}
