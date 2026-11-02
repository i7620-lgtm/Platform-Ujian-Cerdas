export type AssessmentStandard = "kurikulum_merdeka" | "tka_bskap";
export type CognitiveFramework = "TKA" | "BLOOM";

export interface ExternalAiPromptConfig {
  standard: AssessmentStandard;
  subject: string;
  gradeClass: string;
  topic: string;
  count: number;
  questionTypes: string[]; // e.g., ["Pilihan Ganda", "Pilihan Ganda Kompleks", "Benar/Salah", "Menjodohkan", "Isian Singkat", "Esai"]
  cognitiveFramework: CognitiveFramework;
  cognitiveLevels: string[]; // Multi-selected cognitive levels
  kisiKisi: string;
  includeVisuals: boolean; // SVG / Diagram / Table request
  targetModel?: "chatgpt" | "gemini" | "claude" | "deepseek" | "general";
}

export const buildExternalAiPrompt = (config: ExternalAiPromptConfig): string => {
  const {
    standard = "kurikulum_merdeka",
    subject = "Umum",
    gradeClass = "Kelas 6 SD",
    topic = "Materi Utama",
    count = 5,
    questionTypes = ["Pilihan Ganda"],
    cognitiveFramework = "TKA",
    cognitiveLevels = ["Level 2 - Penerapan", "Level 3 - Penalaran"],
    kisiKisi = "",
    includeVisuals = true,
  } = config;

  const typesFormatted = questionTypes.join(", ");
  const levelsFormatted =
    cognitiveLevels.length > 0
      ? cognitiveLevels.join(", ")
      : cognitiveFramework === "TKA"
        ? "Level 2 - Penerapan, Level 3 - Penalaran"
        : "C3 - Mengaplikasikan, C4 - Menganalisis";

  const standardIntro =
    standard === "kurikulum_merdeka"
      ? `Anda adalah Guru Ahli Pengembang Asesmen Kurikulum Merdeka (Master Item Writer) dari Kementerian Pendidikan Dasar dan Menengah RI, yang bertugas menyusun instrumen asesmen pembelajaran kontekstual berbasis Capaian Pembelajaran (CP), Tujuan Pembelajaran (TP), dan penguatan Profil Pelajar Pancasila.`
      : `Anda adalah Penulis Soal Ahli Asesmen Nasional (Master Item Writer) dari Kementerian Pendidikan Dasar dan Menengah RI, yang bertugas menyusun soal Tes Kemampuan Akademik (TKA) resmi berstandar nasional sesuai Keputusan Kepala BSKAP No. 047/H/AN/2025.`;

  const standardPrinciples =
    standard === "kurikulum_merdeka"
      ? `### 🎯 PRINSIP PENYUSUNAN SOAL (KURIKULUM MERDEKA):
1. Mengukur pemahaman konsep yang bermakna dan keterampilan berpikir kritis/analitis (bukan sekadar menghafal rumus).
2. Kontekstual & Autentik: Hubungkan soal dengan fenomena kehidupan sehari-hari murid di Indonesia, lingkungan lokal, budaya, atau isu sains/sosial yang realistis.
3. Konstruktif: Soal mendidik, menggunakan bahasa santun, inklusif, dan ramah anak.`
      : `### 🎯 PRINSIP PENYUSUNAN SOAL (STANDAR TKA BSKAP KEMENDIKDASMEN):
1. Menguji penalaran akademis tingkat tinggi (HOTS/MOTS kontekstual) dan pemecahan masalah non-rutin.
2. Mematuhi format baku Pusmendik: Bahasa lugas, stimulus padat, dan kunci jawaban bebas ambiguitas matematis/logika.
3. Desimal menggunakan tanda koma (misal $0,5$ atau $4\\frac{3}{4}$), satuan baku internasional.`;

  const visualInstruction = includeVisuals
    ? `### 🖼️ ATURAN WAJIB STIMULUS VISUAL & GEOMETRI (AKTIF):
Karena opsi stimulus visual diaktifkan, **JIKA butir soal melibatkan geometri (sudut, segitiga, persegi, lingkaran, balok, bangun gabungan, koordinat), perbandingan data, atau diagram alir**, Anda **WAJIB MENYERTAKAN** stimulus visual representatif berupa:
- **Kode SVG mandiri yang bersih:** Sisipkan tag \`<svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg" ...>...</svg>\` langsung di dalam teks soal (\`questionText\`) atau properti \`svgContent\`. Pastikan bentuk proporsional, stroke kontras, dan teks label titik/sudut jelas terbaca.
- **Tabel HTML terstruktur:** Untuk penyajian data atau informasi komparatif, gunakan tag tabel \`<table border="1" class="soal-table">...</table>\` yang rapi.
- Soal yang tidak memerlukan geometri dapat menggunakan stimulus cerita atau teks narasi autentik.`
    : `- Stimulus visual: Menggunakan narasi teks kontekstual yang jelas.`;

  return `${standardIntro}

Tolong buatkan **${count} butir soal** berkualitas tinggi dengan spesifikasi berikut:

### 📋 SPESIFIKASI SOAL:
- **Standar Acuan:** ${standard === "kurikulum_merdeka" ? "Kurikulum Merdeka (Capaian Pembelajaran CP/TP)" : "Tes Kemampuan Akademik (TKA) BSKAP No. 047/H/AN/2025"}
- **Mata Pelajaran:** ${subject}
- **Jenjang / Kelas:** ${gradeClass}
- **Materi Pokok / Topik:** ${topic}
- **Kerangka & Tingkat Kognitif:** ${cognitiveFramework === "TKA" ? "Standar TKA" : "Taksonomi Bloom"} (${levelsFormatted})
- **Ragam Jenis Soal:** ${typesFormatted}
${kisiKisi ? `- **Kisi-kisi / Indikator Capaian:** ${kisiKisi}` : ""}

${standardPrinciples}

${visualInstruction}

### 💡 ATURAN WAJIB PEMBAHASAN JAWABAN (SANGAT PENTING):
1. **Setiap butir soal WAJIB menyertakan \`explanation\` (Pembahasan Lengkap)** dan \`solutionSteps\` (Langkah Pengerjaan Bertahap).
2. Pembahasan harus menguraikan:
   - Alasan logis mengapa kunci jawaban tersebut benar.
   - Analisis opsi pengecoh (mengapa pilihan lain salah).
   - Untuk soal hitungan: penjabaran rumus, substitusi angka, dan langkah kalkulasi terurut menggunakan notasi KaTeX \`$rumus$\`.

---

### ⚠️ PETUNJUK FORMAT OUTPUT (SANGAT PENTING):
Mohon kembalikan HASIL AKHIR berupa **KODE JSON MURNI** di dalam blok kode \`\`\`json ... \`\`\` tanpa kata pengantar atau penutup tambahan, agar dapat langsung di-import otomatis ke aplikasi editor ujian.

Gunakan skema array JSON berikut:

\`\`\`json
[
  {
    "questionText": "Tuliskan stimulus & pertanyaan di sini. Sisipkan <svg>...</svg> jika ada gambar geometri/diagram. Gunakan $rumus$ untuk KaTeX.",
    "questionType": "MULTIPLE_CHOICE",
    "options": [
      "Pilihan A",
      "Pilihan B",
      "Pilihan C",
      "Pilihan D"
    ],
    "correctAnswer": "A",
    "category": "${topic}",
    "level": "${cognitiveLevels[0] || "Level 2 - Penerapan"}",
    "kisiKisi": "Indikator capaian butir soal ini",
    "explanation": "Pembahasan lengkap dan mendalam mengapa jawaban A benar dan mengapa opsi lain salah.",
    "solutionSteps": "Langkah 1: Identifikasi data diketahui... Langkah 2: Hitung rumus... Langkah 3: Kesimpulan akhir...",
    "hint": "Petunjuk pengerjaan singkat untuk siswa",
    "svgContent": ""
  },
  {
    "questionText": "Contoh soal Pilihan Ganda Kompleks (Multi-jawaban). Pilihlah jawaban yang benar! Jawaban benar lebih dari satu.",
    "questionType": "COMPLEX_MULTIPLE_CHOICE",
    "options": [
      "Pernyataan 1 (Benar)",
      "Pernyataan 2 (Salah)",
      "Pernyataan 3 (Benar)",
      "Pernyataan 4 (Salah)"
    ],
    "correctAnswer": "A,C",
    "explanation": "Pembahasan rinci untuk masing-masing opsi pernyataan...",
    "solutionSteps": "Analisis pernyataan 1... Analisis pernyataan 2..."
  },
  {
    "questionText": "Tentukan Benar atau Salah untuk setiap pernyataan berikut!",
    "questionType": "TRUE_FALSE",
    "categoryLabels": ["Benar", "Salah"],
    "trueFalseRows": [
      { "text": "Pernyataan 1", "answer": true },
      { "text": "Pernyataan 2", "answer": false },
      { "text": "Pernyataan 3", "answer": true }
    ],
    "explanation": "Pembahasan lengkap per baris pernyataan: Pernyataan 1 benar karena... Pernyataan 2 salah karena..."
  },
  {
    "questionText": "Jodohkanlah item di sebelah kiri dengan pasangan yang tepat di sebelah kanan!",
    "questionType": "MATCHING",
    "matchingPairs": [
      { "left": "Istilah / Pertanyaan 1", "right": "Pasangan Jawaban 1" },
      { "left": "Istilah / Pertanyaan 2", "right": "Pasangan Jawaban 2" }
    ],
    "explanation": "Penjelasan relasi pasangan yang tepat..."
  },
  {
    "questionText": "Contoh soal Isian Singkat.",
    "questionType": "FILL_IN_THE_BLANK",
    "correctAnswer": "Jawaban Singkat",
    "explanation": "Pembahasan konseptual dan perhitungan eksak..."
  },
  {
    "questionText": "Contoh soal Uraian / Esai.",
    "questionType": "ESSAY",
    "explanation": "Rubrik penilaian lengkap, kata kunci utama, dan jawaban ideal siswa..."
  }
]
\`\`\`

Pastikan kunci jawaban 100% akurat, logis secara akademis, dan seluruh butir soal dilengkapi pembahasan mendalam! Mohon buatkan sekarang.`;
};
