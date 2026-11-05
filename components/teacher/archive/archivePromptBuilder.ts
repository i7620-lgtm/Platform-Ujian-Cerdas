import type { Exam, Result } from "../../../types";

export interface AnalysisTargetOption {
  key: string;
  label: string;
  isOverall: boolean;
  className?: string;
  schoolName?: string;
  studentCount: number;
}

/**
 * Pembersih Teks Murni: Menghapus tag HTML, mendekompresi stringified JSON array,
 * dan mendekode entitas HTML (&nbsp;, &amp;, dll) menjadi teks murni.
 */
export function stripHtmlToPlainText(raw: unknown): string {
  if (raw === null || raw === undefined) return "";

  let str = String(raw).trim();

  // Deteksi dan bongkar jika berbentuk stringified JSON array seperti '["<p>Teks</p>"]'
  if (str.startsWith("[") && str.endsWith("]")) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) {
        str = parsed
          .map((item) => stripHtmlToPlainText(item))
          .filter(Boolean)
          .join(", ");
      }
    } catch {
      str = str.replace(/^\[\s*"?|"?\s*\]$/g, "");
    }
  }

  // Konversi pemisah baris HTML & hapus tag spesifik (Aman terhadap simbol matematika < 60%)
  str = str
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<\/?(p|br|div|span|h[1-6]|li|ol|ul|table|tbody|thead|tr|td|th|strong|em|b|i|a|font|style|script|iframe)[^>]*>/gi, "");

  // Dekode entitas HTML
  str = str
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  // Hapus sisa kutipan luar & spasi berlebih
  return str.replace(/^["']|["']$/g, "").replace(/\n\s*\n/g, "\n").trim();
}

/**
 * Pembersih Laporan Analisis Balasan AI:
 * Menghapus sisa tag HTML, mendekompresi kurung array, dan menormalisasi baris baru.
 * Sangat aman terhadap simbol matematika kurang dari (< 60%).
 */
export function sanitizeAiReportContent(raw: string): string {
  if (!raw || typeof raw !== "string") return "";

  let text = raw;

  // Konversi pemisah baris HTML & hapus tag spesifik tanpa mengikis simbol matematika
  text = text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<\/?(p|br|div|span|h[1-6]|li|ol|ul|table|tbody|thead|tr|td|th|strong|em|b|i|a|font|style|script|iframe)[^>]*>/gi, "");

  // Dekode entitas HTML
  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  // Hapus bungkus kurung siku stringified array seperti '["Perlu Bimbingan"]'
  text = text.replace(/\[\s*"([^"]+)"\s*\]/g, "$1");

  return text.replace(/\n{3,}/g, "\n\n").trim();
}

export function extractTargetStats(
  exam: Exam,
  results: Result[],
  target: AnalysisTargetOption
) {
  let targetClass = target.className;
  let targetSchool = target.schoolName;

  if (!target.isOverall && target.key !== "OVERALL") {
    const keyMatch = target.key.match(/^school_(.*)_class_(.*)$/);
    if (keyMatch) {
      if (!targetSchool) targetSchool = keyMatch[1];
      if (!targetClass) targetClass = keyMatch[2];
    }
  }

  const filtered = results.filter((r) => {
    if (r.student?.class === "PREVIEW" || r.isPlaceholder) return false;
    if (target.isOverall || target.key === "OVERALL") return true;

    if (targetClass) {
      const rClass = String(r.student?.class || r.student?.className || "").trim();
      const matchClass = rClass.toLowerCase() === targetClass.toLowerCase();
      if (!matchClass) return false;

      if (targetSchool && targetSchool !== "ALL" && targetSchool !== "Sekolah") {
        const rSchool = String(r.student?.schoolName || exam.authorSchool || "").trim();
        if (rSchool && rSchool.toLowerCase() !== targetSchool.toLowerCase()) {
          return false;
        }
      }
      return true;
    }
    return true;
  });

  const totalStudents = filtered.length;
  const questions = exam.questions || [];
  const scores = filtered.map((r) => Number(r.score) || 0);
  const avgScore = totalStudents > 0 ? (scores.reduce((a, b) => a + b, 0) / totalStudents).toFixed(1) : "0";
  const maxScore = totalStudents > 0 ? Math.max(...scores) : 0;
  const minScore = totalStudents > 0 ? Math.min(...scores) : 0;
  const passCount = scores.filter((s) => s >= 70).length;
  const passRate = totalStudents > 0 ? Math.round((passCount / totalStudents) * 100) : 0;

  const tierPerluBimbingan: string[] = [];
  const tierDasar: string[] = [];
  const tierCakap: string[] = [];
  const tierMahir: string[] = [];

  filtered.forEach((r) => {
    const s = Number(r.score) || 0;
    const name = stripHtmlToPlainText(r.student?.fullName) || "Siswa";
    if (s < 55) tierPerluBimbingan.push(name);
    else if (s < 70) tierDasar.push(name);
    else if (s < 85) tierCakap.push(name);
    else tierMahir.push(name);
  });

  const itemStats = questions.map((q, idx) => {
    let correctCount = 0;
    const wrongDist: Record<string, number> = {};

    filtered.forEach((r) => {
      const studentAns = r.answers?.[q.id];
      if (studentAns !== undefined && studentAns !== null) {
        const cleanAns = stripHtmlToPlainText(studentAns);
        const cleanCorrect = stripHtmlToPlainText(q.correctAnswer);
        const isCorrect = cleanAns.toUpperCase() === cleanCorrect.toUpperCase();

        if (isCorrect) {
          correctCount++;
        } else if (cleanAns) {
          const val = cleanAns.substring(0, 40);
          wrongDist[val] = (wrongDist[val] || 0) + 1;
        }
      }
    });

    const accuracy = totalStudents > 0 ? Math.round((correctCount / totalStudents) * 100) : 0;
    const topWrong = Object.entries(wrongDist).sort((a, b) => b[1] - a[1])[0];

    return {
      num: idx + 1,
      id: q.id,
      text: stripHtmlToPlainText(q.questionText).substring(0, 100),
      type: q.questionType,
      level: stripHtmlToPlainText(q.level) || "Standar",
      category: stripHtmlToPlainText(q.category) || "Umum",
      accuracy,
      topWrongVal: topWrong ? topWrong[0] : null,
    };
  });

  const criticalItems = itemStats.filter((item) => item.accuracy < 60);

  return {
    key: target.key,
    label: target.label,
    totalStudents,
    avgScore,
    maxScore,
    minScore,
    passCount,
    passRate,
    tierPerluBimbingan,
    tierDasar,
    tierCakap,
    tierMahir,
    criticalItems,
  };
}

/**
 * Merumuskan prompt analisis pedagogis terstruktur (format JSON) dari data hasil ujian
 * untuk diproses oleh AI luar (ChatGPT, Claude, Gemini, DeepSeek, dll.)
 */
export function buildArchiveAnalysisPrompt(
  exam: Exam,
  results: Result[],
  targetsToInclude: AnalysisTargetOption[]
): string {
  const isBatch = targetsToInclude.length > 1;
  const cleanSubject = stripHtmlToPlainText(exam.config.subject) || "Umum";
  const cleanJenjang = stripHtmlToPlainText(exam.config.jenjang) || "Kurikulum Merdeka";
  const cleanExamType = stripHtmlToPlainText(exam.config.examType) || "Ujian Standar";

  const targetBlocks = targetsToInclude.map((target) => {
    const stats = extractTargetStats(exam, results, target);
    return `
--------------------------------------------------
TARGET KEY: "${stats.key}" [${stats.label}]
--------------------------------------------------
- Jumlah Siswa: ${stats.totalStudents} Siswa
- Nilai Rata-Rata: ${stats.avgScore} / 100
- Nilai Tertinggi: ${stats.maxScore} | Nilai Terendah: ${stats.minScore}
- Tingkat Ketuntasan (≥ 70): ${stats.passRate}% (${stats.passCount} dari ${stats.totalStudents} siswa)

PEMETAAN TIER KOMPETENSI SISWA TARGET INI:
1. Perlu Bimbingan (Rentang 0 - 54) [${stats.tierPerluBimbingan.length} Siswa]: ${stats.tierPerluBimbingan.length > 0 ? stats.tierPerluBimbingan.join(", ") : "Tidak ada"}
2. Dasar (Rentang 55 - 69) [${stats.tierDasar.length} Siswa]: ${stats.tierDasar.length > 0 ? stats.tierDasar.join(", ") : "Tidak ada"}
3. Cakap (Rentang 70 - 84) [${stats.tierCakap.length} Siswa]: ${stats.tierCakap.length > 0 ? stats.tierCakap.join(", ") : "Tidak ada"}
4. Mahir (Rentang 85 - 100) [${stats.tierMahir.length} Siswa]: ${stats.tierMahir.length > 0 ? stats.tierMahir.join(", ") : "Tidak ada"}

PERINGATAN KETAT ISOLASI ROSTER:
HANYA masukkan nama-nama siswa di atas pada laporan untuk target "${stats.key}". DILARANG KERAS menyalin atau mencampur nama siswa dari kelas atau target lain!

BUTIR SOAL KRITIS (< 60% AKURASI BENAR):
${
  stats.criticalItems.length > 0
    ? stats.criticalItems
        .map(
          (item) =>
            `- Soal #${item.num} [Tipe: ${item.type} | Topik: ${item.category} | Level: ${item.level}]: Akurasi ${item.accuracy}% Benar. Teks: "${item.text}"${
              item.topWrongVal ? ` (Jawaban salah terpopuler: "${item.topWrongVal}")` : ""
            }`
        )
        .join("\n")
    : "Seluruh butir soal memiliki tingkat kebenaran ≥ 60%."
}
`;
  });

  const jsonTemplateExample = isBatch
    ? `\`\`\`json
{
${targetsToInclude.map((t) => `  "${t.key}": "# LAPORAN ANALISIS ${t.label.toUpperCase()}\\n\\n## 1. RINGKASAN EKSEKUTIF\\n..."`).join(",\n")}
}
\`\`\``
    : `\`\`\`json
{
  "${targetsToInclude[0]?.key || "OVERALL"}": "# LAPORAN ANALISIS ${targetsToInclude[0]?.label.toUpperCase() || "UMUM"}\\n\\n## 1. RINGKASAN EKSEKUTIF\\n..."
}
\`\`\``;

  return `
Anda adalah seorang Pakar Evaluasi Pendidikan & Konsultan Diagnostik Pembelajaran Kurikulum Merdeka.
Tugas Anda adalah menganalisis data hasil ujian siswa berikut dan menghasilkan Laporan Analisis Diagnostik & Rekomendasi Terapi Pedagogis dalam FORMAT JSON MUTLAK.

==================================================
INFORMASI UJIAN
==================================================
- Mata Pelajaran: ${cleanSubject}
- Jenjang / Kurikulum: ${cleanJenjang} / ${cleanExamType}
- Jumlah Soal: ${(exam.questions || []).length} Butir Soal
- Cakupan Analisis: ${targetsToInclude.map((t) => t.label).join(", ")}

==================================================
DATA STATISTIK PER TARGET ANALISIS
==================================================
${targetBlocks.join("\n")}

==================================================
STRUKTUR ISI LAPORAN UNTUK SETIAP TARGET
==================================================
Laporan Markdown pada nilai JSON setiap target harus memuat 5 bagian utama:
1. RINGKASAN EKSEKUTIF KINERJA BELAJAR (Ulasan capaian rata-rata & tingkat ketuntasan).
2. BEDAH MIKRO BUTIR SOAL KRITIS & TERAPI PENUNTASAN KONSEP (Analisis soal <60% benar, akar miskonsepsi, & terapi pedagogis di kelas).
3. MATRIKS INTERVENSI BERJENJANG (Tabel Markdown 5 Kolom: | Jenjang Kompetensi | Daftar Siswa Terkait | Diagnosis Akar Hambatan | Aksi Pedagogis Guru | Target Capaian |).
4. REKOMENDASI MANAJEMEN KELAS & PEMBELAJARAN TERDIFERENSIASI (3 strategi konkret).
5. BANK SOAL REMEDIAL & PENGAYAAN HOTS SIAP PAKAI (3-4 soal remedial & 3-4 soal pengayaan HOTS + kunci & pembahasan).

==================================================
INSTRUKSI FORMATTING KETAT (CRITICAL RULES)
==================================================
1. DILARANG KERAS MENYERTAKAN TAG HTML (seperti <p>, <br>, <span>, <div>) ATAU SINTAKS KURUNG SIKU ARRAY (seperti ["..."]).
2. Seluruh teks laporan di dalam string JSON harus MURNI menggunakan sintaks MARKDOWN standar.
3. ISOLASI SISWA PER KELAS: Pada Bagian 3 (MATRIKS INTERVENSI BERJENJANG), kolom "Daftar Siswa Terkait" untuk setiap target kelas HANYA BOLEH memuat nama-nama siswa yang terdaftar dalam tier kompetensi target tersebut. DILARANG KERAS mencampur nama siswa antar-kelas!
4. Hasilkan HANYA SATU BLOK KODE JSON VALID berformat persis seperti berikut:

${jsonTemplateExample}

PENTING:
- Pastikan kunci JSON SAMA PERSIS dengan KEY TARGET di atas (${targetsToInclude.map((t) => `"${t.key}"`).join(", ")}).
- Isi nilai dari setiap kunci JSON adalah teks laporan lengkap berformat MARKDOWN yang rapi.
- Gunakan \\n untuk baris baru dalam string JSON.
`.trim();
}

/**
 * Memverifikasi dan membersihkan tabel Matriks Intervensi pada laporan kelas
 * agar nama siswa yang tercantum benar-benar berasal dari kelas terkait (mencegah kebocoran siswa luar kelas).
 */
export function cleanAlienStudentsFromClassReport(
  reportMarkdown: string,
  allowedStudents: string[]
): string {
  if (!reportMarkdown || !allowedStudents || allowedStudents.length === 0) return reportMarkdown;

  const allowedSet = new Set(allowedStudents.map((n) => n.trim().toLowerCase()));

  const lines = reportMarkdown.split("\n");
  const cleanedLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed.startsWith("|") &&
      (trimmed.includes("Perlu Bimbingan") ||
        trimmed.includes("Dasar") ||
        trimmed.includes("Cakap") ||
        trimmed.includes("Mahir"))
    ) {
      const columns = line.split("|");
      // Column 0 is empty (before first |), Column 1 is Jenjang, Column 2 is Daftar Siswa
      if (columns.length >= 4) {
        const studentCell = columns[2].trim();
        const names = studentCell
          .split(/[,;\n]/)
          .map((n) => n.replace(/^[-*•\d.]+\s*/, "").trim())
          .filter(Boolean);

        const validNames = names.filter((n) => {
          const lower = n.toLowerCase();
          return Array.from(allowedSet).some(
            (allowed) => allowed.includes(lower) || lower.includes(allowed)
          );
        });

        if (validNames.length > 0) {
          columns[2] = ` ${validNames.join(", ")} `;
          cleanedLines.push(columns.join("|"));
          continue;
        } else if (names.length > 0) {
          // If all names were alien, mark as Tidak ada
          columns[2] = ` - `;
          cleanedLines.push(columns.join("|"));
          continue;
        }
      }
    }

    cleanedLines.push(line);
  }

  return cleanedLines.join("\n");
}
