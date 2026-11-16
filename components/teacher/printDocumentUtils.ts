import type { Question } from "../../types";

export interface FormalIdentityField {
  label: string;
  value?: string | number | null;
}

export function isPrintInfoItem(q: any): boolean {
  if (!q) return false;
  const t = (q.questionType || q.type || "").toString().trim().toUpperCase();
  return t === "INFO" || t === "KETERANGAN" || t === "INFORMASI";
}

export function formatFormalExamTypeTitle(examType?: string): string {
  const raw = (examType || "").trim();
  if (!raw || raw.toLowerCase() === "lainnya") {
    return "ASESMEN PEMBELAJARAN";
  }

  const normalized = raw.toUpperCase();
  switch (normalized) {
    case "SAS":
      return "SUMATIF AKHIR SEMESTER (SAS)";
    case "STS":
      return "SUMATIF TENGAH SEMESTER (STS)";
    case "UAS":
      return "UJIAN AKHIR SEMESTER (UAS)";
    case "UTS":
      return "UJIAN TENGAH SEMESTER (UTS)";
    case "PAS":
      return "PENILAIAN AKHIR SEMESTER (PAS)";
    case "PTS":
      return "PENILAIAN TENGAH SEMESTER (PTS)";
    case "TKA":
      return "TES KEMAMPUAN AKADEMIK (TKA)";
    case "ULANGAN HARIAN":
      return "ULANGAN HARIAN";
    case "KUIS":
      return "KUIS PEMBELAJARAN";
    case "LATIHAN":
      return "LATIHAN SOAL";
    case "TUGAS":
      return "TUGAS TERSTRUKTUR";
    case "OLIMPIADE":
      return "OLIMPIADE AKADEMIK";
    default:
      return normalized;
  }
}

export function generateDynamicPetunjukUmum(questions: Question[] = []): string[] {
  const instructions: string[] = [
    "Tulislah nama lengkap, kelas, dan nomor urut Anda pada lembar jawaban yang tersedia.",
    "Periksa dan bacalah setiap butir soal dengan cermat dan saksama sebelum menjawab.",
    "Kerjakan lebih dahulu butir soal yang Anda anggap paling mudah.",
  ];

  const activeTypes = new Set<string>();
  questions.forEach((q) => {
    if (isPrintInfoItem(q)) return;
    const type = ((q as any)?.questionType || (q as any)?.type || "MULTIPLE_CHOICE")
      .toString()
      .trim()
      .toUpperCase();
    activeTypes.add(type);
  });

  if (activeTypes.has("MULTIPLE_CHOICE")) {
    instructions.push(
      "Untuk soal Pilihan Ganda, berilah tanda silang (X) pada salah satu huruf pilihan jawaban (A, B, C, atau D) yang paling tepat pada lembar jawaban.",
    );
  }

  if (activeTypes.has("COMPLEX_MULTIPLE_CHOICE")) {
    instructions.push(
      "Untuk soal Pilihan Ganda Kompleks, berilah tanda silang (X) atau tanda centang (✓) pada lebih dari satu pilihan jawaban yang benar sesuai perintah soal.",
    );
  }

  if (activeTypes.has("TRUE_FALSE")) {
    instructions.push(
      "Untuk soal Benar/Salah (Kategori), tentukan pilihan pada setiap pernyataan yang tersedia sesuai petunjuk pada kolom jawaban.",
    );
  }

  if (activeTypes.has("MATCHING")) {
    instructions.push(
      "Untuk soal Menjodohkan, pasangkan setiap pernyataan pada lajur kiri dengan pasangan jawaban yang paling tepat pada lajur kanan.",
    );
  }

  if (activeTypes.has("FILL_IN_THE_BLANK")) {
    instructions.push(
      "Untuk soal Isian Singkat, tuliskan jawaban yang singkat, jelas, dan tepat pada tempat atau lembar jawaban yang disediakan.",
    );
  }

  if (activeTypes.has("ESSAY")) {
    instructions.push(
      "Untuk soal Uraian, tuliskan jawaban beserta langkah penyelesaian atau penjelasan secara runtut dan jelas pada lembar jawaban.",
    );
  }

  instructions.push(
    "Laporkan kepada guru atau pengawas apabila terdapat lembar soal yang kurang jelas, rusak, atau tidak lengkap.",
    "Periksalah kembali seluruh pekerjaan Anda sebelum lembar soal dan lembar jawaban diserahkan kepada guru atau pengawas.",
  );

  return instructions;
}
