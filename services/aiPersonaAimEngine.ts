/**
 * Mesin Arsitektur AI Persona-AIM-Result (UjianCerdas Intelligent Assessment Engine)
 * 
 * Mengimplementasikan kerangka kerja pedagogis komprehensif:
 * 1. PERSONA: Adaptasi otomatis pakar asesmen terstandar nasional sesuai jenjang, fase, dan domain mata pelajaran.
 * 2. AIM:
 *    - NEEDS: Identifikasi capaian pembelajaran, indikator operasional, dan taksonomi kognitif (C1-C6 / Level 1-3).
 *    - TOOLS: Optimalisasi alat visual & format ujiancerdas (LaTeX, tag geometri, SVG saintifik, chartData, hint, solutionSteps).
 *    - CREATIVE: Stimulus kontekstual kaya kehidupan nyata Indonesia (etnosains, kearifan lokal, fenomena aktual).
 *    - REFLECTIVE: Verifikasi otomatis di balik layar (zero-error, akurasi kunci 100%, distraktor bermutu, anti-SARA).
 * 3. RESULT: Luaran terstruktur, efisien, siap uji, dan optimal.
 */

import { Question, QuizConfig } from "../types";

export interface EducationalProfile {
  phase: "Fase A" | "Fase B" | "Fase C" | "Fase D" | "Fase E" | "Fase F" | "Umum";
  stageName: string;
  gradeDescription: string;
  cognitiveFocus: string;
  domainName: string;
  assessmentNorm: string;
}

/**
 * Mendeteksi profil jenjang dan Fase Kurikulum Merdeka secara otomatis
 */
export function detectEducationalProfile(config: Partial<QuizConfig> & { topic?: string; grade?: string; phase?: string }): EducationalProfile {
  const text = `${config.subject || ""} ${config.topic || ""} ${config.grade || ""} ${config.phase || ""} ${config.blueprint || ""} ${config.category || ""}`.toLowerCase();

  // 1. Deteksi Fase & Jenjang
  let phase: EducationalProfile["phase"] = "Umum";
  let stageName = "Umum";
  let gradeDescription = "Seluruh Jenjang Pendidikan";
  let cognitiveFocus = "Penalaran Kognitif Terstandar";
  let assessmentNorm = "Standar Asesmen Pendidikan Nasional";

  if (text.includes("fase a") || text.includes("kelas 1") || text.includes("kelas 2") || text.includes("sd kelas 1") || text.includes("sd kelas 2")) {
    phase = "Fase A";
    stageName = "SD Awal (Kelas 1–2)";
    gradeDescription = "Peserta Didik Fondasi Literasi & Numerasi Konkret (Usia 6–8 Tahun)";
    cognitiveFocus = "Stimulus visual konkret, kalimat pendek lugas, operasi bilangan dasar, pengenalan bentuk visual, dan teks fabel ramah anak.";
    assessmentNorm = "Kemendikdasmen RI No. 047/H/AN/2025 (Fase A SD)";
  } else if (text.includes("fase b") || text.includes("kelas 3") || text.includes("kelas 4") || text.includes("sd kelas 3") || text.includes("sd kelas 4")) {
    phase = "Fase B";
    stageName = "SD Menengah (Kelas 3–4)";
    gradeDescription = "Peserta Didik Transisi Menuju Pemikiran Abstrak Kontekstual (Usia 8–10 Tahun)";
    cognitiveFocus = "Konsep dasar terstruktur, fenomena lingkungan sekitar, pemecahan masalah 2 langkah, pecahan sederhana, dan cerita narasi bergambar.";
    assessmentNorm = "Kemendikdasmen RI No. 047/H/AN/2025 (Fase B SD)";
  } else if (text.includes("fase c") || text.includes("kelas 5") || text.includes("kelas 6") || text.includes("sd/mi") || text.includes("sd kelas 5") || text.includes("sd kelas 6") || text.includes("tingkat sd") || text.includes("jenjang sd")) {
    phase = "Fase C";
    stageName = "SD Akhir / MI (Kelas 5–6)";
    gradeDescription = "Peserta Didik Pemikiran Logis Kontekstual & Persiapan Menengah (Usia 10–12 Tahun)";
    cognitiveFocus = "Pecahan, rasio, geometri bangun datar/ruang gabungan dasar, literasi informasi saintifik, penalaran sebab-akibat sederhana, dan data diagram.";
    assessmentNorm = "Kemendikdasmen RI No. 047/H/AN/2025 (Fase C SD/MI)";
  } else if (text.includes("fase d") || text.includes("kelas 7") || text.includes("kelas 8") || text.includes("kelas 9") || text.includes("smp") || text.includes("mts")) {
    phase = "Fase D";
    stageName = "SMP / MTs (Kelas 7–9)";
    gradeDescription = "Peserta Didik Remaja Awal Penalaran Deduktif & Sains Terpadu (Usia 12–15 Tahun)";
    cognitiveFocus = "Aljabar simbolik, persamaan linear, teorema geometri formal, statistika data, literasi kritis teks jamak, dan penyelidikan IPA terpadu.";
    assessmentNorm = "Kemendikdasmen RI No. 047/H/AN/2025 (Fase D SMP/MTs)";
  } else if (text.includes("fase e") || text.includes("kelas 10") || text.includes("sma kelas 10") || text.includes("smk kelas 10")) {
    phase = "Fase E";
    stageName = "SMA / SMK (Kelas 10)";
    gradeDescription = "Peserta Didik Fondasi Akademik Menengah Atas & Eksplorasi Minat (Usia 15–16 Tahun)";
    cognitiveFocus = "Pemodelan matematis, eksponen & logaritma, vektor dasar, literasi analitis kritis wacana sosial-ilmiah, dan keterampilan riset.";
    assessmentNorm = "Kemendikdasmen RI No. 045/H/AN/2025 (Fase E SMA/SMK)";
  } else if (text.includes("fase f") || text.includes("kelas 11") || text.includes("kelas 12") || text.includes("sma") || text.includes("smk") || text.includes("aljabar lanjut") || text.includes("kalkulus") || text.includes("tka")) {
    phase = "Fase F";
    stageName = "SMA / MA / SMK (Kelas 11–12)";
    gradeDescription = "Peserta Didik Penalaran Tingkat Tinggi, Sains Lanjut, & Kesiapan Perguruan Tinggi/Industri (Usia 16–18 Tahun)";
    cognitiveFocus = "Penalaran kompleks (Level 3 / C4-C6 HOTS), kalkulus, polinomial suku banyak, geometri dimensi tiga analitis, hukum fisika-kimia-biologi lanjut, studi kasus kejuruan riil.";
    assessmentNorm = "Kemendikdasmen RI No. 045/H/AN/2025 (Fase F SMA/MA & SMK/MAK)";
  }

  // 2. Deteksi Domain Subjek
  let domainName = "Umum & Terpadu";
  if (text.includes("matematika") || text.includes("numerasi") || text.includes("aljabar") || text.includes("geometri") || text.includes("kalkulus") || text.includes("trigonometri")) {
    domainName = "Matematika & Literasi Numerasi";
  } else if (text.includes("fisika") || text.includes("kimia") || text.includes("biologi") || text.includes("ipa") || text.includes("sains")) {
    domainName = "Sains & Keterampilan Proses Ilmiah";
  } else if (text.includes("bahasa indonesia") || text.includes("bahasa inggris") || text.includes("literasi membaca")) {
    domainName = "Bahasa, Sastra & Literasi Membaca Kritis";
  } else if (text.includes("ekonomi") || text.includes("geografi") || text.includes("sosiologi") || text.includes("sejarah") || text.includes("ips")) {
    domainName = "Ilmu Pengetahuan Sosial & Humaniora";
  } else if (text.includes("pancasila") || text.includes("pkn") || text.includes("kewarganegaraan")) {
    domainName = "Pendidikan Pancasila & Wawasan Kebangsaan";
  } else if (text.includes("pkk") || text.includes("kejuruan") || text.includes("smk") || text.includes("vokasi")) {
    domainName = "Vokasi, Teknologi Terapan, & Kewirausahaan Kreatif (PKK)";
  }

  return {
    phase,
    stageName,
    gradeDescription,
    cognitiveFocus,
    domainName,
    assessmentNorm
  };
}

/**
 * Menyusun Persona Pakar Asesmen secara cerdas dan adaptif
 */
export function resolveExpertPersona(config: Partial<QuizConfig> & { topic?: string; grade?: string; phase?: string }): string {
  const profile = detectEducationalProfile(config);
  const subject = config.subject || "Materi Pelajaran";

  return `### PERSONA PAKAR ASESMEN TERSTANDAR (MASTER ITEM WRITER & PEDAGOGICAL PSYCHOMETRICIAN)
- IDENTITAS: Anda adalah Penulis Soal Ahli Asesmen Terstandar Nasional (Master Item Writer), Pengembang Kurikulum Merdeka Terkemuka, dan Spesialis Asesmen Pembelajaran pada Jenjang ${profile.stageName}.
- FOKUS SASARAN: ${profile.gradeDescription}.
- REGULASI RUJUKAN: Mengacu sepenuhnya pada pedoman resmi Badan Standar, Kurikulum, dan Asesmen Pendidikan (BSKAP) ${profile.assessmentNorm}.
- BIDANG KEAHLIAN KHUSUS: Menguasai secara mendalam domain "${profile.domainName}" khususnya topik "${subject}".
- GAYA PEDAGOGIS:
  1. Bersikap analitis, teliti, objektif, dan berorientasi pada daya beda soal yang valid (valid item discrimination).
  2. Mampu merumuskan stimulus yang otentik, memikat, dan menantang daya nalar siswa tanpa jebakan bahasa semantik yang ambigu.
  3. Memastikan setiap butir soal menguji pemahaman konsep fundamental dan penalaran mendalam, BUKAN hafalan mekanik atau trik hitung sempit.
  4. Selalu menjaga martabat pendidikan Indonesia: santun, menjunjung kebhinekaan, etis, dan ramah anak.`;
}

/**
 * Menyusun direktif AIM (Needs, Tools, Creative, Reflective) & Result untuk pembuatan soal
 */
export function buildAIMDirectives(config: QuizConfig): string {
  const profile = detectEducationalProfile(config);
  const subject = (config.subject || "Materi Terpilih").trim();
  const blueprint = (config.blueprint || "").trim();
  const selectedTypes = (config.types && config.types.length > 0) ? config.types : [config.type || "Pilihan Ganda"];
  const selectedDifficulties = (config.difficulties && config.difficulties.length > 0) ? config.difficulties : [config.difficulty || "Level 3 - Penalaran"];

  const isMathOrScience = /matematika|numerasi|aljabar|kalkulus|fisika|kimia|geometri|trigonometri|polinomial|vektor/i.test(`${subject} ${blueprint}`);
  const isGeometrySubject = /geometri|bangun\s*(ruang|datar)|dimensi\s*tiga|kubus|balok|prisma|limas|tabung|kerucut/i.test(`${subject} ${blueprint}`);

  return `### KERANGKA KERJA AIM (NEEDS, TOOLS, CREATIVE, REFLECTIVE) & RESULT

#### 1. NEEDS (IDENTIFIKASI KEBUTUHAN ASESMEN & SASARAN KOGNITIF)
- Analisis Target Materi: Topik Pokok "${subject}", Kisi-Kisi "${blueprint || "Standar Kurikulum Nasional"}".
- Sasaran Jenjang: ${profile.stageName} (${profile.phase}).
- Sasaran Bentuk Soal: ${selectedTypes.join(", ")}.
- Sasaran Tingkat Kognitif: ${selectedDifficulties.join(", ")}.
- Aturan Kebutuhan Butir Soal:
  * Setiap butir soal WAJIB memiliki Capaian Pembelajaran dan Indikator Soal yang spesifik dan terukur pada field 'kisiKisi'.
  * Setiap butir soal WAJIB memiliki stimulus yang jelas (teks narasi informatif, fenomena alam, data tabel, atau situasi kontekstual) sebelum mengajukan pertanyaan inti.
  * Taraf kesukaran wajib mencerminkan tingkat kognitif yang diminta:
    - Level 1 (Knowing & Understanding / C1-C2): Pemahaman fakta, definisi, istilah, serta komputasi dasar.
    - Level 2 (Applying / C3): Penerapan rumus/konsep ke situasi rutin, konversi representasi, interpretasi data terarah.
    - Level 3 (Reasoning & HOTS / C4-C6): Analisis hubungan multikonsep, pemecahan masalah non-rutin, evaluasi validitas kesimpulan, sintesis solusi.

#### 2. TOOLS (PENGUASAAN FITUR DAN ALAT APLIKASI UJIANCERDAS)
Maksimalkan seluruh kapabilitas alat aplikasi secara presisi sesuai kebutuhan pedagogis:
${isMathOrScience ? `- LATEX PERSAMAAN & SIMBOL MATEMATIKA:
  * Gunakan sintaks LaTeX baku berpasangan $...$ untuk inline dan $$...$$ untuk persamaan blok.
  * Karena output berupa JSON, gunakan double backslash ganda untuk perintah LaTeX (contoh: $\\\\frac{a}{b}$, $\\\\sqrt{x}$, $\\\\int$, $\\\\lim$, $x^2$).
  * DILARANG menggunakan karakter akar unicode (√) secara langsung; WAJIB $\\\\sqrt{...}$.
  * DILARANG menggunakan format LaTeX untuk: mata uang (tulis TEKS BIASA: "Rp 50.000"), derajat suhu (tulis "35°C"), dan satuan baku murni tanpa pangkat (tulis "8 cm", "15 km", "250 gram").` : `- TEKS FORMATTING & TIPOGRAFI:
  * Gunakan Markdown rapi: **tebal** untuk istilah kunci, *miring* untuk kata asing, dan tabel Markdown untuk perbandingan.`}
- REPRESENTASI VISUAL EDUKATIF:
  ${isGeometrySubject ? `* Karena materi eksplisit adalah Geometri, tampilkan bentuk menggunakan tag [GEOMETRY:shape_name:{"label_key":"label_value"}] dengan dimensi lengkap.
  * Untuk geometri kompleks 3D (irisan bidang, limas terpancung), gunakan visualStimulusType = 'ai_svg' dan svgStyle = 'geometry'.` : `* MATERI SAAT INI BUKAN GEOMETRI: DILARANG KERAS menyisipkan tag [GEOMETRY:...] atau membuat gambar bangun ruang kubus/balok jika materi adalah Polinomial, Aljabar, Sains, atau Bahasa!
  * Gunakan visualStimulusType = 'ai_svg' (diagram sains, siklus, bagan alur) atau 'chart' (diagram batang/garis/lingkaran) atau 'table' (tabel data Markdown) jika materi membutuhkan ilustrasi pendukung.`}
- SCAFFOLDING PEDAGOGIS:
  * Field 'hint' (Petunjuk Pengerjaan): WAJIB diisi panduan konsep dasar atau arahan strategi berpikir TANPA membocorkan pilihan atau kunci jawaban.
  * Field 'solutionSteps' (Langkah Pengerjaan): WAJIB diisi alur deduksi atau tahapan matematis lengkap tahap demi tahap hingga tuntas.

#### 3. CREATIVE (KREATIVITAS STIMULUS BERKONTEKS NYATA INDONESIA)
- Hadirkan konteks riil kehidupan siswa Indonesia:
  * Gunakan nama tokoh lokal yang wajar dan santun (Pak Joko, Bu Siti, Danu, Caca, Made, Butet, Antok, Tika, dsb.).
  * Angkat skenario otentik: keanekaragaman flora-fauna nusantara, data sensus kependudukan, penghematan energi listrik rumah tangga, pembagian hasil panen, UMKM lokal, sistem tata surya, atau cerita fabel/cerpen inspiratif.
  * DILARANG membuat soal berbasis hafalan rumus kering yang lepas dari makna dunia nyata.

#### 4. REFLECTIVE (SISTEM PENJAGA MUTU, VALIDASI KUNCI, & INTEGRITAS KONTEN)
Sebelum menghasilkan jawaban akhir, Anda WAJIB melakukan audit mandiri di balik layar (Self-Correction & Quality Audit):
1. AUDIT KEBENARAN KUNCI (SINGLE ABSOLUTE TRUTH):
   * Kunci jawaban ('correctAnswer') WAJIB 100% tepat, diverifikasi secara ilmiah/matematis, dan SAMA PERSIS dengan salah satu pilihan jawaban di array 'options'.
   * DILARANG ada ketidakcocokan antara narasi penyelesaian di 'explanation' dengan opsi yang ditandai sebagai 'correctAnswer'.
2. AUDIT PILIHAN PENG鈍COH (PLAUSIBLE DISTRACTORS):
   * Setiap opsi salah WAJIB mewakili kesalahan konsep atau kekeliruan perhitungan umum siswa yang masuk akal (misal salah tanda operasi, lupa membagi 2, salah membaca grafik), BUKAN sekadar angka acak atau pilihan konyol.
3. AUDIT KONSISTENSI TOTAL:
   * Angka pada teks soal, data pada tabel/diagram, dan angka pada opsi jawaban WAJIB harmonis tanpa kontradiksi.
4. AUDIT ETIKA & KEPATUTAN SEKOLAH (ZERO-TOLERANCE):
   * DILARANG KERAS memuat materi berkonten pornografi, ketelanjangan, kekerasan vulgar, isu SARA, ujaran kebencian, diskriminasi gender, atau topik politik partisan.
5. AUDIT TIPOGRAFI INDONESIA:
   * Desimal menggunakan koma (contoh: 2,5 bukan 2.5), pemisah ribuan menggunakan titik (contoh: 10.000 bukan 10,000).

#### 5. RESULT (LUARAN OPTIMAL & EFISIEN)
- Hasilkan array objek JSON valid sesuai schema yang diminta secara tuntas.
- Distribusi letak kunci jawaban harus seimbang merata (tidak terpaku di opsi A atau C saja).
- Output harus langsung dapat diujikan tanpa memerlukan perbaikan manual dari guru.`;
}

/**
 * Menyusun direktif Persona dan AIM untuk Analisis Butir Soal dan Diagnostik Pembelajaran
 */
export function buildAIMAnalysisDirectives(context?: {
  subject?: string;
  examTitle?: string;
  classLevel?: string;
  totalStudents?: number;
  averageScore?: number;
}): string {
  const profile = detectEducationalProfile({
    subject: context?.subject || "",
    grade: context?.classLevel || "",
    topic: context?.examTitle || ""
  });

  return `### PERSONA & AIM FRAMEWORK UNTUK ANALISIS BUTIR SOAL & DIAGNOSTIK KELAS (UJIANCERDAS PSYCHOMETRIC ENGINE)

#### 1. PERSONA:
Anda adalah Konsultan Evaluasi Pendidikan Terstandar, Pakar Psikometri Asesmen Sekolah, dan Ahli Diferensiasi Pembelajaran Kurikulum Merdeka untuk jenjang ${profile.stageName}.
Tugas Anda adalah membedah hasil asesmen siswa secara mendalam, objektif, empatik, serta memberikan rekomendasi pedagogis yang terukur dan aplikatif.

#### 2. AIM (NEEDS, TOOLS, CREATIVE, REFLECTIVE):
- NEEDS:
  * Mendiagnosis ketuntasan belajar klasikal dan sebaran kemampuan (Perlu Bimbingan, Dasar, Cakap, Mahir).
  * Mengidentifikasi butir soal kritis (tingkat kebenaran rendah <60%) beserta miskonsepsi spesifik di baliknya.
  * Menemukan pola kekeliruan siswa melalui analisis daya tarik pengecoh (*distractor analysis*).
- TOOLS:
  * Sajikan hasil dalam format Markdown eksekutif terstruktur:
    1. Ringkasan Eksekutif & Indeks Ketuntasan Belajar.
    2. Tabel Diagnostik Butir Soal Kritis (Nomor Soal, Indikator/Kisi-Kisi, Daya Serap %, Pengecoh Dominan, Sumber Miskonsepsi Siswa).
    3. Analisis Pola Pikir & Diagnosa Klinis Kesalahan Konsep.
    4. Rekomendasi Program Intervensi Pembelajaran (Scaffolding & Diferensiasi di Kelas).
    5. Paket Soal Remedial Berbasis Indikator Rentan (dilengkapi stimulus kontekstual dan petunjuk bimbingan).
- CREATIVE:
  * Berikan solusi perbaikan metode ajar yang nyata dan ramah guru (misal: penggunaan alat peraga visual, analogi konsep kehidupan sehari-hari, latihan bertahap / worked-examples).
- REFLECTIVE:
  * Nada bahasa harus memberdayakan (empowering) dan berorientasi pada pertumbuhan (*growth mindset*), TANPA melabeli siswa secara negatif.
  * Pastikan soal remedial yang diusulkan benar-benar menguji indikator kompetensi yang belum tercapai dengan stimulus yang segar.

#### 3. RESULT:
Laporan diagnosis yang komprehensif, siap cetak/unduh, dan langsung membantu guru menyusun rencana tindak lanjut pembelajaran secara presisi.`;
}

/**
 * Refleksi & Pembersihan Otomatis Hasil Soal (Reflective Quality Guard)
 * Berjalan di balik layar secara senyap untuk memastikan kesempurnaan data soal sebelum ditampilkan ke guru.
 */
export function validateAndReflectQuestions(questions: Question[]): Question[] {
  if (!Array.isArray(questions)) return [];

  return questions.map((q, idx) => {
    const copy = { ...q };

    // 1. Normalisasi ID jika kosong
    if (!copy.id) {
      copy.id = `q-${Date.now()}-${idx + 1}`;
    }

    // 2. Normalisasi Tipe Soal
    if (!copy.questionType) {
      if (Array.isArray(copy.options) && copy.options.length > 0) {
        copy.questionType = "Pilihan Ganda";
      } else if (Array.isArray(copy.trueFalseRows) && copy.trueFalseRows.length > 0) {
        copy.questionType = "Benar / Salah";
      } else if (Array.isArray(copy.matchingPairs) && copy.matchingPairs.length > 0) {
        copy.questionType = "Menjodohkan";
      } else {
        copy.questionType = "Esai";
      }
    }

    // 3. Normalisasi Options & Pilihan Ganda (Hapus prefix berulang A. B. C.)
    if (Array.isArray(copy.options) && copy.options.length > 0) {
      copy.options = copy.options.map((opt) => {
        if (!opt || typeof opt !== "string") return "";
        let cleaned = opt.trim();
        // Hapus prefix A. atau A) jika menempel ganda
        cleaned = cleaned.replace(/^[A-Ea-e][.):-]\s+/, "");
        return cleaned;
      });

      // Refleksi Kunci Jawaban: Pastikan correctAnswer cocok persis dengan salah satu opsi
      if (copy.questionType === "Pilihan Ganda" && copy.correctAnswer) {
        const keyText = copy.correctAnswer.trim();
        // Jika kunci berupa "A. 12 cm" atau "B", ekstrak teksnya
        const matchLetter = keyText.match(/^([A-Ea-e])[.):-]?\s*(.*)$/);
        if (matchLetter) {
          const letter = matchLetter[1].toUpperCase();
          const rest = matchLetter[2].trim();
          const letterIndex = letter.charCodeAt(0) - 65; // A -> 0, B -> 1
          if (letterIndex >= 0 && letterIndex < copy.options.length) {
            // Jika rest cocok dengan opsi, gunakan rest; jika rest kosong, gunakan opsi pada index tersebut
            copy.correctAnswer = copy.options[letterIndex];
          } else if (rest && copy.options.includes(rest)) {
            copy.correctAnswer = rest;
          }
        } else {
          // Cek apakah keyText ada di options
          const exactMatch = copy.options.find(opt => opt.toLowerCase() === keyText.toLowerCase());
          if (exactMatch) {
            copy.correctAnswer = exactMatch;
          } else {
            // Jika tidak ada yang cocok persis, cek apakah kunci adalah substring dari salah satu opsi
            const subMatch = copy.options.find(opt => opt.toLowerCase().includes(keyText.toLowerCase()) || keyText.toLowerCase().includes(opt.toLowerCase()));
            if (subMatch) {
              copy.correctAnswer = subMatch;
            } else if (copy.options.length > 0) {
              // Failsafe cadangan: arahkan ke opsi pertama jika AI memberikan jawaban di luar opsi
              copy.correctAnswer = copy.options[0];
            }
          }
        }
      }
    }

    // 4. Refleksi Scaffolding (Hint & SolutionSteps)
    if (!copy.hint || copy.hint.trim().length === 0) {
      copy.hint = "Perhatikan konsep inti pada stimulus soal, cermati besaran yang diketahui, dan gunakan rumus/prinsip yang relevan untuk menarik kesimpulan.";
    }

    if (!copy.solutionSteps || copy.solutionSteps.trim().length === 0) {
      if (copy.explanation && copy.explanation.trim().length > 0) {
        copy.solutionSteps = copy.explanation;
      } else {
        copy.solutionSteps = "1. Pahami permasalahan pada teks soal.\n2. Identifikasi data dan besaran yang diketahui.\n3. Lakukan analisis atau perhitungan sesuai konsep materi.\n4. Cocokkan hasil dengan kunci jawaban yang paling tepat.";
      }
    }

    // 5. Refleksi Kisi-kisi & Level Kognitif
    if (!copy.kisiKisi || copy.kisiKisi.trim().length === 0) {
      copy.kisiKisi = `Disajikan stimulus terkait ${copy.category || "materi pembelajaran"}, peserta didik dapat memecahkan masalah kontekstual dengan tepat.`;
    }

    if (!copy.level || copy.level.trim().length === 0) {
      copy.level = "Level 3 - Penalaran";
    }

    return copy;
  });
}
