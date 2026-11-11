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
  enableScoreWeighting?: boolean; // Pembobotan per jawaban kustom
  defaultScoreWeight?: number; // Nilai default bobot soal (misal 1-5)
  targetModel?: "chatgpt" | "gemini" | "claude" | "deepseek" | "general";
}

export const buildExternalAiPrompt = (config: ExternalAiPromptConfig): string => {
  const {
    standard = "kurikulum_merdeka",
    subject = "Umum",
    gradeClass = "Kelas 6 SD (Fase C)",
    topic = "Materi Utama",
    count = 5,
    questionTypes = ["Pilihan Ganda"],
    cognitiveFramework = "TKA",
    cognitiveLevels = ["Level 2 - Penerapan", "Level 3 - Penalaran"],
    kisiKisi = "",
    includeVisuals = true,
  } = config;

  const validTypes = questionTypes.length > 0 ? questionTypes : ["Pilihan Ganda"];
  const typesFormatted = validTypes.join(", ");
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
Karena opsi stimulus visual diaktifkan, **JIKA butir soal melibatkan geometri (sudut, segitiga, persegi, lingkaran, balok, bangun ruang, denah, koordinat), perbandingan data, atau diagram alir**, Anda **WAJIB MENYERTAKAN** stimulus visual representatif berupa:
- **Kode SVG mandiri yang bersih (WAJIB BARIS TERSENDIRI / BLOCK):**
  - Simpan kode SVG ke properti \`svgContent\` ATAU letakkan di dalam \`questionText\` dengan baris kosong terpisah di atas dan di bawahnya (\`\\n\\n<svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg" ...>...</svg>\\n\\n\`).
  - **DILARANG KERAS menyisipkan tag SVG di tengah kalimat atau inline**, yang menyebabkan teks kalimat terbelah atau terjepit di sisi kiri dan kanan gambar!
  - Pastikan bentuk proporsional, garis/stroke kontras, dan teks label titik/sudut/ukuran jelas terbaca.
- **Tabel HTML terstruktur:** Untuk penyajian data atau informasi komparatif, gunakan tag tabel \`<table border="1" class="soal-table">...</table>\` yang rapi pada baris tersendiri.
- Soal yang tidak memerlukan geometri dapat menggunakan stimulus narasi autentik.`
    : `- Stimulus visual: Menggunakan narasi teks kontekstual yang jelas.`;

  const structureAndAntiDuplicationRules = `### 🚫 ATURAN KETAT STRUKTUR TEKS SOAL & ANTI-DUPLIKASI (SANGAT PENTING):
1. **DILARANG KERAS MENULISKAN OPSI JAWABAN (A, B, C, D) DI DALAM questionText:**
   - Pada soal Pilihan Ganda & Pilihan Ganda Kompleks: Kolom \`questionText\` HANYA berisi narasi stimulus, gambar/tabel, dan kalimat pertanyaan penutup.
   - **DILARANG KERAS** menuliskan daftar opsi \`A. ... B. ... C. ... D. ...\` di dalam \`questionText\`! Seluruh teks opsi HANYA dimasukkan ke dalam array \`options\`.
2. **DILARANG KERAS MENULISKAN BUTIR PERNYATAAN (1, 2, 3...) DI DALAM questionText UNTUK SOAL BENAR/SALAH:**
   - Pada soal Benar/Salah (\`TRUE_FALSE\`): Kolom \`questionText\` HANYA berisi stimulus dan kalimat perintah umum (misalnya: *"Tentukan Benar atau Salah untuk setiap pernyataan berikut berdasarkan informasi di atas!"*).
   - **DILARANG KERAS** mencantumkan daftar pernyataan \`1. ... 2. ... 3. ...\` di dalam \`questionText\`! Seluruh butir pernyataan HANYA dimasukkan ke dalam array \`trueFalseRows\`.
3. **KONSISTENSI NOTASI MATEMATIKA & SATUAN:**
   - Gunakan format KaTeX yang konsisten antara badan soal dan opsi jawaban (misal jika menggunakan $\\frac{5}{8}$ atau $cm^3$, tuliskan secara seragam).`;

  const formattingRules = `### 🔤 ATURAN WAJIB FORMAT TEKS & TIPOGRAFI (DILARANG MENGGUNAKAN SIMBOL MARKDOWN!):
1. **DILARANG KERAS** menggunakan simbol-simbol markdown seperti tanda bintang (misal: *kata*, **kata**, ***kata***) atau garis bawah (misal: _kata_, __kata__) untuk memformat tebal, miring, atau garis bawah teks.
2. **WAJIB MENGGUNAKAN TAG HTML BAKU:**
   - Huruf Tebal (Bold): Gunakan tag <b>teks</b> (DILARANG menggunakan **teks**).
   - Huruf Miring (Italic): Gunakan tag <i>teks</i> (DILARANG menggunakan *teks*).
   - Garis Bawah (Underline): Gunakan tag <u>teks</u> (DILARANG menggunakan __teks__).
3. Rumus Matematika/KaTeX: Gunakan pasangan tanda dollar $...$ untuk inline math dan $$...$$ untuk baris rumus mandiri (Block Math).`;

  const diversityRules = `### 🌟 ATURAN KEUNIKAN, VARIASI LENGKAP & ANTI-DUPLIKASI SOAL (SANGAT KETAT):
1. **Variasi Stimulus & Skenario Riil (Setiap Soal Wajib Unik):**
   - Setiap butir soal WAJIB menghadirkan konteks/skenario kehidupan nyata yang berbeda (latar tempat, objek pengamatan, profesi tokoh, studi kasus alam/sosial).
   - DILARANG menggunakan cerita atau objek yang sama berulang kali di seluruh butir soal.
2. **Variasi Angka, Besaran & Data Hitung:**
   - DILARANG menggunakan angka atau kelipatan yang mirip/identik antar butir soal. Variasikan nilai numerik, rasio, satuan, atau penyajian data komparatif.
3. **Variasi Kalimat Pembuka & Batang Tubuh Soal (Anti-Monoton):**
   - DILARANG mengulang pembuka klise seperti "Berdasarkan stimulus di atas...", "Perhatikan pernyataan berikut...", atau "Perhatikan tabel di atas..." pada setiap soal!
   - Variasikan bentuk pemantik: gunakan dialog interaktif, kutipan catatan ilmiah, tabel perbandingan dua kondisi, analisis masalah praktis, atau narasi situasi faktual.
4. **Variasi Sudut Pandang Kognitif & Penalaran:**
   - Setiap butir soal harus menguji aspek kognitif yang berbeda (komparasi efisiensi, penalaran sebab-akibat, identifikasi anomali/kesalahan konsep, evaluasi data grafik, dan pemecahan masalah non-rutin).
5. **Bebas Kloning:** Seluruh butir soal harus orisinal, berdiri sendiri, dan tidak boleh menyerupai template kloning dari butir soal sebelumnya.`;

  // Flags for selected question types
  const hasPgTunggal = validTypes.includes("Pilihan Ganda");
  const hasPgKompleks = validTypes.includes("Pilihan Ganda Kompleks");
  const hasBenarSalah = validTypes.includes("Benar/Salah");
  const hasMenjodohkan = validTypes.includes("Menjodohkan");
  const hasIsian = validTypes.includes("Isian Singkat");
  const hasEsai = validTypes.includes("Esai");
  const hasKuisioner = validTypes.includes("Kuisioner");

  // Strict constraints block
  let strictTypeRules = `### ⛔ ATURAN KETAT BENTUK SOAL (DILARANG MEMBUAT BENTUK SOAL LAIN!):\n`;
  strictTypeRules += `1. Anda HANYA DIIZINKAN membuat bentuk soal berikut: **${typesFormatted}**.\n`;
  strictTypeRules += `2. DILARANG KERAS menghasilkan bentuk soal yang TIDAK ADA dalam daftar pilihan di atas!\n`;

  if (hasPgTunggal && !hasPgKompleks) {
    strictTypeRules += `3. **PERINGATAN SANGAT PENTING UNTUK PILIHAN GANDA (PG):** Karena hanya 'Pilihan Ganda' (PG biasa) yang dipilih dan BUKAN PG Kompleks, maka SEMUA butir soal Pilihan Ganda WAJIB bertipe \`"MULTIPLE_CHOICE"\` dengan **TEPAT 1 (SATU) KUNCI JAWABAN BENAR** (misalnya hanya \`"A"\`, \`"B"\`, \`"C"\`, atau \`"D"\`). DILARANG KERAS menggunakan kunci majemuk/multi-centang (seperti \`"A,C"\`) atau memberi label \`COMPLEX_MULTIPLE_CHOICE\`!\n`;
  } else if (hasPgKompleks && !hasPgTunggal) {
    strictTypeRules += `3. **PILIHAN GANDA KOMPLEKS (PGK MCMA):** Gunakan tipe \`"COMPLEX_MULTIPLE_CHOICE"\` dengan 2 atau lebih jawaban benar (misal \`"A,C"\`).\n`;
  } else if (hasPgTunggal && hasPgKompleks) {
    strictTypeRules += `3. **PILIHAN GANDA BIASA vs KOMPLEKS:**\n`;
    strictTypeRules += `   - Untuk Pilihan Ganda biasa: Tipe \`"MULTIPLE_CHOICE"\` dengan tepat 1 kunci jawaban.\n`;
    strictTypeRules += `   - Untuk Pilihan Ganda Kompleks: Tipe \`"COMPLEX_MULTIPLE_CHOICE"\` dengan multi-kunci (misal \`"A,C"\`).\n`;
  }

  if (hasKuisioner) {
    strictTypeRules += `4. **KUISIONER / ANGKET / REFLEKSI (NON-SKOR ATAU SKALA LIKERT):**\n`;
    strictTypeRules += `   - Gunakan tipe \`"QUESTIONNAIRE"\`.\n`;
    strictTypeRules += `   - Format dapat berupa skala Likert (\`"scale"\`), rating bintang/angka (\`"rating"\`), pilihan respon (\`"choice"\`), atau uraian terbuka (\`"text"\`).\n`;
    strictTypeRules += `   - Sertakan properti \`"questionnaireFormat": "scale"\`, \`"scaleMin": 1\`, \`"scaleMax": 5\`, \`"scaleLabels": ["Sangat Tidak Setuju", "Sangat Setuju"]\`, serta array respon \`"options"\`.\n`;
    strictTypeRules += `   - \`"isReflective": true\`, dan \`"correctAnswer": ""\` (karena kuisioner/refleksi tidak memiliki jawaban benar/salah mutlak).\n`;
  }

  // Weighting instruction block
  const weightingRules = config.enableScoreWeighting
    ? `### ⚖️ ATURAN WAJIB PEMBOBOTAN PER OPSI JAWABAN (AKTIF):
Karena fitur pembobotan per opsi diaktifkan, Anda **WAJIB MENYERTAKAN** skema pembobotan diferensial per opsi/jawaban pada setiap butir soal sesuai jenisnya (DILARANG hanya menaikkan bobot total soal!):
1. **Pilihan Ganda (MULTIPLE_CHOICE):**
   - WAJIB menyertakan \`"useCustomWeights": true\`.
   - WAJIB menyertakan array \`"optionWeights": [4, 3, 2, 1]\` (atau 5 angka jika 5 opsi, misal \`[4, 3, 2, 1, 0]\`).
   - Berikan nilai bertingkat bergradasi sesuai kedalaman penalaran: opsi paling tepat/ideal berbobot 4, opsi mendekati benar berbobot 3, opsi konsep dasar berbobot 2, opsi dengan miskonsepsi/keliru berbobot 1 atau 0.
2. **Pilihan Ganda Kompleks (COMPLEX_MULTIPLE_CHOICE):**
   - WAJIB menyertakan \`"useCustomWeights": true\`.
   - WAJIB menyertakan array \`"optionWeights"\` untuk masing-masing opsi pernyataan (misal \`[2, 1, 2, 0]\` sesuai bobot kebenaran tiap pernyataan).
3. **Benar/Salah (TRUE_FALSE):**
   - Pada setiap baris di \`trueFalseRows\`, WAJIB menyertakan poin mandiri: \`"trueWeight": 1\` (jika siswa memilih Benar) dan \`"falseWeight": 0\` (atau sebaliknya sesuai kunci kebenaran baris tersebut).
4. **Menjodohkan (MATCHING):**
   - Pada setiap pasangan di \`matchingPairs\`, WAJIB menyertakan bobot poin spesifik: \`"weight": 1\` (atau poin proporsional per pasangan yang berhasil dijodohkan dengan tepat).
5. **Kuisioner / Angket (QUESTIONNAIRE):**
   - WAJIB menyertakan \`"useCustomWeights": true\` dan \`"optionWeights": [1, 2, 3, 4, 5]\` untuk merefleksikan gradasi skala Likert (1=Sangat Tidak Setuju s.d. 5=Sangat Setuju).
6. **Bobot Dasar Butir Soal (\`scoreWeight\`):**
   - Tetapkan \`"scoreWeight": 1\` (standar). Penilaian siswa akan dihitung secara presisi berdasarkan akumulasi bobot per opsi yang dipilih siswa.\n`
    : "";

  // Build dynamic few-shot JSON example ONLY containing selected types
  const jsonExamples: string[] = [];

  if (hasPgTunggal) {
    jsonExamples.push(`  {
    "questionText": "Tuliskan stimulus narasi & pertanyaan penutup di sini (DILARANG menuliskan pilihan A, B, C, D di sini!). Jika menyertakan <svg>, letakkan pada baris baru terpisah (block).",
    "questionType": "MULTIPLE_CHOICE",
    "scoreWeight": 1,
    "options": [
      "Pilihan A (Paling Tepat)",
      "Pilihan B (Mendekati Benar)",
      "Pilihan C (Konsep Dasar)",
      "Pilihan D (Keliru)"
    ],
    "correctAnswer": "A",
    "useCustomWeights": ${config.enableScoreWeighting ? "true" : "false"},
    "optionWeights": [4, 3, 2, 1],
    "category": "${topic}",
    "level": "${cognitiveLevels[0] || "Level 2 - Penerapan"}",
    "kisiKisi": "Indikator capaian butir soal ini",
    "explanation": "Pembahasan lengkap dan mendalam mengapa jawaban A benar dan mengapa opsi lain salah.",
    "solutionSteps": "Langkah 1: Identifikasi data diketahui... Langkah 2: Hitung rumus... Langkah 3: Kesimpulan akhir...",
    "hint": "Petunjuk pengerjaan singkat untuk siswa"
  }`);
  }

  if (hasPgKompleks) {
    jsonExamples.push(`  {
    "questionText": "Sajikan stimulus narasi & pertanyaan di sini (DILARANG menuliskan pilihan A, B, C, D di sini!). Pilihlah semua pernyataan yang benar!",
    "questionType": "COMPLEX_MULTIPLE_CHOICE",
    "scoreWeight": 1,
    "options": [
      "Pernyataan 1 (Benar Penuh)",
      "Pernyataan 2 (Parsial)",
      "Pernyataan 3 (Benar)",
      "Pernyataan 4 (Salah)"
    ],
    "correctAnswer": "A,C",
    "useCustomWeights": ${config.enableScoreWeighting ? "true" : "false"},
    "optionWeights": [2, 1, 2, 0],
    "explanation": "Pembahasan rinci untuk masing-masing opsi pernyataan...",
    "solutionSteps": "Analisis opsi 1... Analisis opsi 3..."
  }`);
  }

  if (hasBenarSalah) {
    jsonExamples.push(`  {
    "questionText": "Tentukan Benar atau Salah untuk setiap pernyataan berikut!",
    "questionType": "TRUE_FALSE",
    "scoreWeight": 1,
    "categoryLabels": ["Benar", "Salah"],
    "trueFalseRows": [
      { "text": "Pernyataan 1", "answer": true, "trueWeight": 1, "falseWeight": 0 },
      { "text": "Pernyataan 2", "answer": false, "trueWeight": 0, "falseWeight": 1 },
      { "text": "Pernyataan 3", "answer": true, "trueWeight": 1, "falseWeight": 0 }
    ],
    "explanation": "Pembahasan lengkap per baris pernyataan: Pernyataan 1 benar karena... Pernyataan 2 salah karena..."
  }`);
  }

  if (hasMenjodohkan) {
    jsonExamples.push(`  {
    "questionText": "Jodohkanlah item di sebelah kiri dengan pasangan yang tepat di sebelah kanan!",
    "questionType": "MATCHING",
    "scoreWeight": 1,
    "matchingPairs": [
      { "left": "Istilah / Konsep 1", "right": "Pasangan Jawaban 1", "weight": 1 },
      { "left": "Istilah / Konsep 2", "right": "Pasangan Jawaban 2", "weight": 1 }
    ],
    "explanation": "Penjelasan relasi pasangan yang tepat..."
  }`);
  }

  if (hasIsian) {
    jsonExamples.push(`  {
    "questionText": "Pertanyaan isian singkat yang membutuhkan jawaban eksak atau angka pasti...",
    "questionType": "FILL_IN_THE_BLANK",
    "scoreWeight": 1,
    "correctAnswer": "Jawaban Singkat",
    "explanation": "Pembahasan konseptual dan perhitungan eksak..."
  }`);
  }

  if (hasEsai) {
    jsonExamples.push(`  {
    "questionText": "Pertanyaan uraian terbuka yang menguji daya nalar dan analisis mendalam...",
    "questionType": "ESSAY",
    "scoreWeight": 1,
    "explanation": "Rubrik penilaian lengkap, kata kunci utama, dan jawaban ideal siswa..."
  }`);
  }

  if (hasKuisioner) {
    jsonExamples.push(`  {
    "questionText": "Bagaimana pendapat atau pengalaman Anda terhadap materi pembelajaran yang telah dipelajari?",
    "questionType": "QUESTIONNAIRE",
    "questionnaireFormat": "scale",
    "scaleMin": 1,
    "scaleMax": 5,
    "scaleLabels": ["Sangat Tidak Setuju", "Sangat Setuju"],
    "options": [
      "Sangat Tidak Setuju",
      "Tidak Setuju",
      "Ragu-ragu / Netral",
      "Setuju",
      "Sangat Setuju"
    ],
    "correctAnswer": "",
    "isReflective": true,
    "scoreWeight": 1,
    "useCustomWeights": true,
    "optionWeights": [1, 2, 3, 4, 5],
    "explanation": "Instrumen evaluasi diri dan refleksi pemahaman siswa mengenai konsep materi terkait."
  }`);
  }

  const dynamicJsonBlock = `[\n${jsonExamples.join(",\n")}\n]`;

  return `${standardIntro}

Tolong buatkan **TOTAL TEPAT ${count} butir soal** berkualitas tinggi dengan spesifikasi berikut:

### 📋 SPESIFIKASI SOAL:
- **Standar Acuan:** ${standard === "kurikulum_merdeka" ? "Kurikulum Merdeka (Capaian Pembelajaran CP/TP)" : "Tes Kemampuan Akademik (TKA) BSKAP No. 047/H/AN/2025"}
- **Mata Pelajaran:** ${subject}
- **Jenjang / Kelas:** ${gradeClass}
- **Materi Pokok / Topik:** ${topic}
- **Kerangka & Tingkat Kognitif:** ${cognitiveFramework === "TKA" ? "Standar TKA" : "Taksonomi Bloom"} (${levelsFormatted})
- **Ragam Jenis Soal yang Diminta:** ${typesFormatted}
${kisiKisi ? `- **Kisi-kisi / Indikator Capaian:** ${kisiKisi}` : ""}

${strictTypeRules}

${weightingRules}

${structureAndAntiDuplicationRules}

${standardPrinciples}

${formattingRules}

${diversityRules}

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

CONTOH SKEMA JSON YANG HANYA SESUAI DENGAN BENTUK SOAL TERPILIH DI ATAS:

\`\`\`json
${dynamicJsonBlock}
\`\`\`

Pastikan jumlah butir soal tepat ${count} butir, jenis soal 100% mematuhi pilihan di atas, dan seluruh butir dilengkapi pembahasan mendalam! Mohon buatkan sekarang.`;
};
