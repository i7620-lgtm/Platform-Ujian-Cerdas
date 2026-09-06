import { Question, QuestionType, QuizConfig, ChartData } from "../types";

/**
 * Smart Curricular Fallback Question Generator
 * 
 * Invoked when external AI models (Gemini API) are unreachable, experiencing 503/high demand,
 * rate limit (429), network disconnect, or connection timeouts.
 * Guarantees that teacher exam generation is 100% reliable, curriculum-aligned,
 * and always includes complete options, keys, indicators (kisi-kisi), explanations,
 * and contextual visual stimuli (charts, geometry, or diagrams).
 */

const CHART_PLACEHOLDER_HTML = `<br/><span class="chart-placeholder" contenteditable="false" data-chart="true" style="display: block; width: 100%; max-width: 600px; min-height: 100px; padding: 10px; background: #f8fafc; border: 2px dashed #cbd5e1; text-align: center; border-radius: 8px; margin: 10px auto; color: #475569; font-weight: bold; cursor: pointer;"><span class="chart-placeholder-text" style="display: block; padding: 40px 0;">📊 Diagram (Klik untuk mengedit)</span></span><br/>`;

export function generateSmartFallbackQuestions(
  config: QuizConfig,
  failureReason: string = "Layanan cloud AI sedang dalam antrean tinggi. Safe Fallback aktif."
): Question[] {
  const count = Math.max(1, config.count || 1);
  const subject = (config.subject || "Umum").trim();
  const blueprint = (config.blueprint || "").trim();
  const selectedTypes = (config.types && config.types.length > 0)
    ? config.types
    : [(config.type || "Pilihan Ganda")];
  const selectedDiffs = (config.difficulties && config.difficulties.length > 0)
    ? config.difficulties
    : [(config.difficulty || "Level 3 - Penalaran (Reasoning / HOTS)")];

  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const rawType = selectedTypes[i % selectedTypes.length];
    const difficulty = selectedDiffs[i % selectedDiffs.length];
    const qType = mapToQuestionType(rawType);
    const itemIndex = i + 1;

    const question = buildSingleFallbackQuestion({
      index: itemIndex,
      subject,
      blueprint,
      qType,
      difficulty,
      includeImages: config.includeImages ?? true,
      failureReason,
    });

    questions.push(question);
  }

  return questions;
}

function mapToQuestionType(label: string): QuestionType {
  const l = (label || "").toLowerCase();
  if (l.includes("kompleks") || l.includes("mcma")) return "COMPLEX_MULTIPLE_CHOICE";
  if (l.includes("benar") || l.includes("salah") || l.includes("true")) return "TRUE_FALSE";
  if (l.includes("jodoh") || l.includes("matching")) return "MATCHING";
  if (l.includes("singkat") || l.includes("isian") || l.includes("blank")) return "FILL_IN_THE_BLANK";
  if (l.includes("esai") || l.includes("essay") || l.includes("uraian")) return "ESSAY";
  return "MULTIPLE_CHOICE";
}

interface FallbackParams {
  index: number;
  subject: string;
  blueprint: string;
  qType: QuestionType;
  difficulty: string;
  includeImages: boolean;
  failureReason: string;
}

function buildSingleFallbackQuestion(params: FallbackParams): Question {
  const { index, subject, blueprint, qType, difficulty, includeImages, failureReason } = params;
  const isMath = /matematika|hitung|aritmatika|aljabar|geometri|statistika|data/i.test(subject) ||
                 /hitung|grafik|diagram|tabel|angka|luas|volume|pecahan/i.test(blueprint);
  const isScience = /ipa|sains|biologi|fisika|kimia|alam|ekosistem/i.test(subject) ||
                    /tata surya|fotosintesis|rantai makanan|peredaran darah|daur/i.test(blueprint);
  const isIndonesian = /bahasa indonesia|literasi|teks|fabel|cerpen|puisi|bacaan/i.test(subject);

  const id = `q_fallback_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const levelText = difficulty.includes("HOTS") ? "Level 3 - Penalaran (HOTS)" : difficulty;
  const category = isMath ? "Matematika & Analisis Data" : isScience ? "Ilmu Pengetahuan Alam" : isIndonesian ? "Literasi Membaca" : subject;

  // Question context generator based on Subject & Blueprint
  if (isMath) {
    return buildMathFallbackQuestion({ id, index, blueprint, qType, levelText, category, includeImages, failureReason });
  } else if (isScience) {
    return buildScienceFallbackQuestion({ id, index, blueprint, qType, levelText, category, includeImages, failureReason });
  } else {
    return buildGeneralFallbackQuestion({ id, index, subject, blueprint, qType, levelText, category, includeImages, failureReason });
  }
}

// 1. Math Fallback Generator (Complete with Bar Chart, Line Chart or Geometry)
function buildMathFallbackQuestion(args: {
  id: string;
  index: number;
  blueprint: string;
  qType: QuestionType;
  levelText: string;
  category: string;
  includeImages: boolean;
  failureReason: string;
}): Question {
  const { id, index, qType, levelText, category, includeImages, failureReason } = args;
  const fallbackReason = failureReason;

  const chartData: ChartData = {
    type: "bar",
    title: "Data Penjualan Beras Toko Sembako Pak Bondan (5 Hari)",
    labels: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
    datasets: [
      {
        label: "Jumlah Karung Beras Terjual",
        data: ["16", "20", "28", "22", "30"]
      }
    ]
  };

  // Base prompt highlighting Pak Bondan store scenario with complete numbers
  const questionLead = `Pak Bondan mengelola sebuah toko sembako yang menjual beras dalam kemasan karung. Diagram batang berikut menunjukkan jumlah penjualan karung beras di toko Pak Bondan selama 5 hari:`;
  const questionDetail = `${CHART_PLACEHOLDER_HTML}
Setiap karung beras memiliki netto 25 kg dan dijual dengan harga Rp14.000,00 per kg. Pada hari Kamis dan Jumat, toko memberikan diskon khusus sebesar 5% untuk setiap pembelian beras. Berdasarkan data penjualan tersebut, selisih total pendapatan toko Pak Bondan antara hari Rabu (tanpa diskon) dan hari Kamis (dengan diskon) adalah ....`;

  const explanation = `**Langkah Perhitungan Lengkap:**
1. **Harga Normal per Karung:** 25 kg × Rp14.000 = Rp350.000 per karung.
2. **Pendapatan Hari Rabu:**
   - Jumlah karung terjual = 28 karung (tanpa diskon).
   - Total pendapatan Rabu = 28 × Rp350.000 = **Rp9.800.000**.
3. **Pendapatan Hari Kamis (Diskon 5%):**
   - Harga per karung setelah diskon 5% = Rp350.000 - (5% × Rp350.000) = Rp332.500.
   - Jumlah karung terjual = 22 karung.
   - Total pendapatan Kamis = 22 × Rp332.500 = **Rp7.315.000**.
4. **Selisih Pendapatan Rabu dan Kamis:**
   - Selisih = Rp9.800.000 - Rp7.315.000 = **Rp2.485.000**.`;

  const kisiKisi = `Disajikan diagram batang data penjualan kontekstual (Toko Beras), peserta didik dapat menganalisis dan menghitung selisih pendapatan berkondisi diskon bertingkat dengan tepat.`;

  if (qType === "MULTIPLE_CHOICE") {
    const options = [
      "Rp2.485.000,00",
      "Rp2.100.000,00",
      "Rp2.650.000,00",
      "Rp2.800.000,00"
    ];
    return {
      id,
      questionType: "MULTIPLE_CHOICE",
      questionText: `<p>${questionLead}</p>${questionDetail}`,
      options,
      correctAnswer: options[0],
      scoreWeight: 1,
      chartData: includeImages ? chartData : undefined,
      explanation,
      kisiKisi,
      level: levelText,
      category,
      isFallback: true,
      fallbackReason
    } as any;
  }

  if (qType === "COMPLEX_MULTIPLE_CHOICE") {
    const options = [
      "Total penjualan beras pada hari Rabu mencapai 28 karung bernilai Rp9.800.000,00",
      "Harga satu karung beras setelah dipotong diskon 5% pada hari Kamis adalah Rp332.500,00",
      "Total volume penjualan beras selama 5 hari berjumlah 116 karung",
      "Pendapatan pada hari Kamis lebih besar dibandingkan pendapatan pada hari Rabu"
    ];
    const correctAnswers = [options[0], options[1], options[2]];
    return {
      id,
      questionType: "COMPLEX_MULTIPLE_CHOICE",
      questionText: `<p>${questionLead}</p>${CHART_PLACEHOLDER_HTML}<p>Setiap karung beras memiliki netto 25 kg dan dijual dengan harga Rp14.000,00 per kg. Pada hari Kamis dan Jumat diberikan diskon 5%. Pilihlah semua pernyataan yang benar berdasarkan data tersebut!</p>`,
      options,
      correctAnswer: JSON.stringify(correctAnswers),
      scoreWeight: 2,
      chartData: includeImages ? chartData : undefined,
      explanation,
      kisiKisi,
      level: levelText,
      category,
      isFallback: true,
      fallbackReason
    } as any;
  }

  if (qType === "TRUE_FALSE") {
    return {
      id,
      questionType: "TRUE_FALSE",
      questionText: `<p>${questionLead}</p>${CHART_PLACEHOLDER_HTML}<p>Tentukan apakah setiap pernyataan berikut bernilai <strong>Benar</strong> atau <strong>Salah</strong> berdasarkan grafik di atas!</p>`,
      options: [],
      correctAnswer: "",
      scoreWeight: 1,
      chartData: includeImages ? chartData : undefined,
      trueFalseRows: [
        { text: "Penjualan tertinggi terjadi pada hari Jumat sebanyak 30 karung beras.", answer: true },
        { text: "Rata-rata penjualan beras per hari dari Senin sampai Jumat adalah 23,2 karung.", answer: true },
        { text: "Total penjualan hari Rabu lebih rendah daripada hari Selasa.", answer: false }
      ],
      explanation,
      kisiKisi,
      level: levelText,
      category,
      isFallback: true,
      fallbackReason
    } as any;
  }

  if (qType === "MATCHING") {
    return {
      id,
      questionType: "MATCHING",
      questionText: `<p>${questionLead}</p>${CHART_PLACEHOLDER_HTML}<p>Pasangkanlah hari penjualan dengan jumlah karung beras yang berhasil terjual!</p>`,
      options: [],
      correctAnswer: "",
      scoreWeight: 1,
      chartData: includeImages ? chartData : undefined,
      matchingPairs: [
        { left: "Hari Senin", right: "16 karung" },
        { left: "Hari Rabu", right: "28 karung" },
        { left: "Hari Jumat", right: "30 karung" }
      ],
      explanation,
      kisiKisi,
      level: levelText,
      category,
      isFallback: true,
      fallbackReason
    } as any;
  }

  if (qType === "FILL_IN_THE_BLANK") {
    return {
      id,
      questionType: "FILL_IN_THE_BLANK",
      questionText: `<p>${questionLead}</p>${questionDetail}`,
      options: [],
      correctAnswer: "2.485.000",
      scoreWeight: 1,
      chartData: includeImages ? chartData : undefined,
      explanation,
      kisiKisi,
      level: levelText,
      category,
      isFallback: true,
      fallbackReason
    } as any;
  }

  // Essay / Uraian
  return {
    id,
    questionType: "ESSAY",
    questionText: `<p>${questionLead}</p>${CHART_PLACEHOLDER_HTML}<p>Jelaskan langkah-langkah sistematis untuk menghitung selisih total pendapatan toko Pak Bondan antara hari Rabu (tanpa diskon) dan hari Kamis (dengan diskon 5%), serta tuliskan hasil akhir perhitungannya!</p>`,
    options: [],
    correctAnswer: "Selisih total pendapatan antara hari Rabu dan hari Kamis adalah Rp2.485.000,00.",
    scoreWeight: 3,
    chartData: includeImages ? chartData : undefined,
    explanation,
    kisiKisi,
    level: levelText,
    category,
    isFallback: true,
    fallbackReason
  } as any;
}

// 2. Science / IPA Fallback Generator
function buildScienceFallbackQuestion(args: {
  id: string;
  index: number;
  blueprint: string;
  qType: QuestionType;
  levelText: string;
  category: string;
  includeImages: boolean;
  failureReason: string;
}): Question {
  const { id, qType, levelText, category, failureReason } = args;
  const fallbackReason = failureReason;

  const questionText = `<p>Perhatikan rantai makanan pada ekosistem sawah berikut:</p>
<p style="text-align: center; margin: 16px 0;">
  <span style="display: inline-block; padding: 10px 20px; background: #ecfdf5; border: 1.5px solid #10b981; border-radius: 8px; font-weight: bold; color: #065f46;">
    Padi (Produsen) ➔ Belalang (Konsumen I) ➔ Katak (Konsumen II) ➔ Ular (Konsumen III) ➔ Elang (Konsumen IV)
  </span>
</p>
<p>Jika populasi katak mengalami penurunan drastis akibat perburuan liar yang berlebihan oleh manusia, dampak ekologis langsung yang paling mungkin terjadi pada keseimbangan rantai makanan tersebut adalah ....</p>`;

  const explanation = `**Analisis Rantai Makanan:**
- Katak merupakan predator bagi belalang (Konsumen I) dan mangsa bagi ular (Konsumen III).
- Jika populasi katak menurun drastis:
  1. Populasi **belalang akan meningkat pesat** karena berkurangnya predator alami (katak). Hal ini berdampak buruk pada produksi tanaman padi.
  2. Populasi **ular akan menurun** karena ketersediaan sumber makanan utamanya berkurang drastis.`;

  const kisiKisi = `Disajikan bagan rantai makanan ekosistem sawah, peserta didik dapat memprediksi dampak perubahan populasi salah satu komponen trofik terhadap keseimbangan ekosistem dengan tepat.`;

  if (qType === "COMPLEX_MULTIPLE_CHOICE") {
    const options = [
      "Populasi belalang akan meningkat drastis sehingga merusak tanaman padi",
      "Populasi ular sawah akan mengalami penurunan karena kekurangan makanan",
      "Produksi tanaman padi akan mengalami penurunan akibat ledakan hama belalang",
      "Populasi elang sawah akan langsung meningkat pesat"
    ];
    return {
      id,
      questionType: "COMPLEX_MULTIPLE_CHOICE",
      questionText,
      options,
      correctAnswer: JSON.stringify([options[0], options[1], options[2]]),
      scoreWeight: 2,
      explanation,
      kisiKisi,
      level: levelText,
      category,
      isFallback: true,
      fallbackReason
    } as any;
  }

  if (qType === "TRUE_FALSE") {
    return {
      id,
      questionType: "TRUE_FALSE",
      questionText: `<p>Berdasarkan bagan rantai makanan ekosistem sawah (Padi ➔ Belalang ➔ Katak ➔ Ular ➔ Elang), tentukan nilai kebenaran setiap pernyataan berikut!</p>`,
      options: [],
      correctAnswer: "",
      scoreWeight: 1,
      trueFalseRows: [
        { text: "Padi berperan sebagai produsen primer yang menghasilkan energi melalui fotosintesis.", answer: true },
        { text: "Penurunan populasi katak akan menyebabkan populasi belalang bertambah banyak.", answer: true },
        { text: "Elang merupakan konsumen tingkat I pada rantai makanan tersebut.", answer: false }
      ],
      explanation,
      kisiKisi,
      level: levelText,
      category,
      isFallback: true,
      fallbackReason
    } as any;
  }

  if (qType === "MATCHING") {
    return {
      id,
      questionType: "MATCHING",
      questionText: `<p>Pasangkanlah organisme berikut dengan tingkat trofik atau perannya dalam ekosistem!</p>`,
      options: [],
      correctAnswer: "",
      scoreWeight: 1,
      matchingPairs: [
        { left: "Tanaman Padi", right: "Produsen" },
        { left: "Belalang Sawah", right: "Konsumen Primer (Tingkat I)" },
        { left: "Katak Sawah", right: "Konsumen Sekunder (Tingkat II)" },
        { left: "Ular Sawah", right: "Konsumen Tersier (Tingkat III)" }
      ],
      explanation,
      kisiKisi,
      level: levelText,
      category,
      isFallback: true,
      fallbackReason
    } as any;
  }

  const options = [
    "Populasi belalang meningkat pesat dan populasi ular mengalami penurunan",
    "Populasi belalang menurun dan produksi padi meningkat pesat",
    "Populasi ular meningkat pesat karena tidak ada persaingan",
    "Produksi padi meningkat dan populasi elang bertambah pesat"
  ];

  return {
    id,
    questionType: "MULTIPLE_CHOICE",
    questionText,
    options,
    correctAnswer: options[0],
    scoreWeight: 1,
    explanation,
    kisiKisi,
    level: levelText,
    category,
    isFallback: true,
    fallbackReason
  } as any;
}

// 3. General / Literasi Fallback Generator
function buildGeneralFallbackQuestion(args: {
  id: string;
  index: number;
  subject: string;
  blueprint: string;
  qType: QuestionType;
  levelText: string;
  category: string;
  includeImages: boolean;
  failureReason: string;
}): Question {
  const { id, index, subject, qType, levelText, category, failureReason } = args;
  const fallbackReason = failureReason;

  const readingText = `
<div style="padding: 14px 18px; background: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 6px; margin-bottom: 14px; font-style: normal; line-height: 1.6;">
  <strong>Stimulus Literasi Bacaan:</strong><br/>
  "Pemanfaatan teknologi digital dalam kegiatan belajar di sekolah kini semakin meluas. Siswa tidak hanya membaca buku teks cetak, tetapi juga mengakses simulasi interaktif dan modul asesmen digital. Penggunaan teknologi ini terbukti meningkatkan motivasi belajar mandiri peserta didik, asalkan disertai dengan pendampingan guru yang terarah serta pembiasaan etika berinternet yang positif."
</div>`;

  const promptText = `${readingText}<p>Berdasarkan teks bacaan di atas, gagasan pokok atau simpulan utama yang tepat terkait pemanfaatan teknologi digital dalam pembelajaran adalah ....</p>`;

  const explanation = `**Penjelasan Pembahasan:**
- Paragraf menjelaskan bahwa teknologi digital meningkatkan efektivitas dan motivasi belajar peserta didik.
- Namun keberhasilan tersebut memiliki syarat penting, yaitu adanya pendampingan guru dan pembiasaan etika berinternet secara sehat.`;

  const kisiKisi = `Disajikan teks bacaan informatif mengenai transformasi pendidikan digital, peserta didik dapat menentukan simpulan pokok isi teks dengan tepat.`;

  if (qType === "COMPLEX_MULTIPLE_CHOICE") {
    const options = [
      "Teknologi digital meningkatkan motivasi belajar mandiri peserta didik",
      "Pendampingan guru tetap diperlukan dalam mengarahkan penggunaan teknologi yang sehat",
      "Siswa dapat memanfaatkan modul asesmen digital dan simulasi interaktif",
      "Teknologi digital sebaiknya menggantikan seluruh peran guru di sekolah"
    ];
    return {
      id,
      questionType: "COMPLEX_MULTIPLE_CHOICE",
      questionText: promptText,
      options,
      correctAnswer: JSON.stringify([options[0], options[1], options[2]]),
      scoreWeight: 2,
      explanation,
      kisiKisi,
      level: levelText,
      category: subject || category,
      isFallback: true,
      fallbackReason
    } as any;
  }

  if (qType === "TRUE_FALSE") {
    return {
      id,
      questionType: "TRUE_FALSE",
      questionText: `${readingText}<p>Tentukan apakah setiap pernyataan berikut sesuai dengan isi bacaan di atas!</p>`,
      options: [],
      correctAnswer: "",
      scoreWeight: 1,
      trueFalseRows: [
        { text: "Teknologi digital di sekolah dapat meningkatkan motivasi belajar mandiri siswa.", answer: true },
        { text: "Pendampingan guru tidak lagi dibutuhkan saat siswa sudah menggunakan modul digital.", answer: false },
        { text: "Pembiasaan etika berinternet merupakan faktor pendukung keberhasilan pembelajaran digital.", answer: true }
      ],
      explanation,
      kisiKisi,
      level: levelText,
      category: subject || category,
      isFallback: true,
      fallbackReason
    } as any;
  }

  if (qType === "MATCHING") {
    return {
      id,
      questionType: "MATCHING",
      questionText: `${readingText}<p>Pasangkanlah elemen kegiatan pembelajaran berikut dengan manfaat atau perannya!</p>`,
      options: [],
      correctAnswer: "",
      scoreWeight: 1,
      matchingPairs: [
        { left: "Modul & Simulasi Digital", right: "Meningkatkan pemahaman interaktif" },
        { left: "Pendampingan Guru", right: "Mengarahkan kegiatan belajar terarah" },
        { left: "Etika Berinternet", right: "Membentuk karakter dan literasi digital aman" }
      ],
      explanation,
      kisiKisi,
      level: levelText,
      category: subject || category,
      isFallback: true,
      fallbackReason
    } as any;
  }

  const options = [
    "Teknologi digital efektif meningkatkan motivasi belajar siswa jika diimbangi pendampingan guru dan etika yang baik",
    "Buku teks cetak sudah tidak lagi relevan digunakan dalam kegiatan belajar siswa di kelas",
    "Siswa mampu belajar secara mandiri sepenuhnya tanpa perlu bimbingan dari guru",
    "Modul asesmen digital hanya boleh digunakan saat ujian akhir semester"
  ];

  return {
    id,
    questionType: "MULTIPLE_CHOICE",
    questionText: promptText,
    options,
    correctAnswer: options[0],
    scoreWeight: 1,
    explanation,
    kisiKisi,
    level: levelText,
    category: subject || category,
    isFallback: true,
    fallbackReason
  } as any;
}
