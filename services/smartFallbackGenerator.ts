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
      category: config.category,
      kisiKisi: config.kisiKisi,
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
  category?: string;
  kisiKisi?: string;
  blueprint: string;
  qType: QuestionType;
  difficulty: string;
  includeImages: boolean;
  failureReason: string;
}

function buildSingleFallbackQuestion(params: FallbackParams): Question {
  const { index, subject, blueprint, qType, difficulty, includeImages, failureReason } = params;
  const isGeometry = /geometri|bangun|balok|limas|kubus|tabung|kerucut|prisma|bola|dimensi/i.test(subject) ||
                     /geometri|bangun|balok|limas|kubus|tabung|kerucut|prisma|bola|dimensi/i.test(blueprint) ||
                     /geometri|bangun|balok|limas|kubus|tabung|kerucut|prisma|bola|dimensi/i.test(params.category || '') ||
                     /geometri|bangun|balok|limas|kubus|tabung|kerucut|prisma|bola|dimensi/i.test(params.kisiKisi || '');

  const isMath = isGeometry ||
                 /matematika|hitung|aritmatika|aljabar|geometri|statistika|data/i.test(subject) ||
                 /hitung|grafik|diagram|tabel|angka|luas|volume|pecahan/i.test(blueprint);
  const isScience = /ipa|sains|biologi|fisika|kimia|alam|ekosistem/i.test(subject) ||
                    /tata surya|fotosintesis|rantai makanan|peredaran darah|daur/i.test(blueprint);
  const isIndonesian = /bahasa indonesia|literasi|teks|fabel|cerpen|puisi|bacaan/i.test(subject);

  const id = `q_fallback_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const levelText = difficulty.includes("HOTS") ? "Level 3 - Penalaran (HOTS)" : difficulty;
  const category = params.category || (isGeometry ? "Geometri Bangun Ruang" : isMath ? "Matematika & Analisis Data" : isScience ? "Ilmu Pengetahuan Alam" : isIndonesian ? "Literasi Membaca" : subject);

  // Question context generator based on Subject & Blueprint
  if (isGeometry) {
    return buildGeometryFallbackQuestion({ id, index, blueprint, kisiKisi: params.kisiKisi, qType, levelText, category, includeImages, failureReason });
  } else if (isMath) {
    return buildMathFallbackQuestion({ id, index, blueprint, kisiKisi: params.kisiKisi, qType, levelText, category, includeImages, failureReason });
  } else if (isScience) {
    return buildScienceFallbackQuestion({ id, index, blueprint, kisiKisi: params.kisiKisi, qType, levelText, category, includeImages, failureReason });
  } else {
    return buildGeneralFallbackQuestion({ id, index, subject, blueprint, kisiKisi: params.kisiKisi, qType, levelText, category, includeImages, failureReason });
  }
}

// 0. Geometry Fallback Generator
function buildGeometryFallbackQuestion(args: {
  id: string;
  index: number;
  blueprint: string;
  kisiKisi?: string;
  qType: QuestionType;
  levelText: string;
  category: string;
  includeImages: boolean;
  failureReason: string;
}): Question {
  const { id, qType, levelText, category, failureReason } = args;
  const fallbackReason = failureReason;

  const contextStr = `${args.blueprint} ${args.kisiKisi || ""} ${category}`.toLowerCase();

  type ShapeConfig = {
    tag: string;
    lead: string;
    detail: string;
    kisi: string;
    unitAns: string;
    options: string[];
    mcmaOptions: string[];
    mcmaCorrect: string[];
    tfRows: { text: string; answer: boolean }[];
    matching: { left: string; right: string }[];
    explanation: string;
    shortAnswer: string;
    essayAnswer: string;
  };

  const shapeCatalog: Record<string, ShapeConfig> = {
    cylinder: {
      tag: `[GEOMETRY:cylinder:{"radius":"7 cm","height":"20 cm"}]`,
      lead: `Perhatikan gambar wadah penampung air berbentuk tabung (silinder) berikut:`,
      detail: `<p>[GEOMETRY:cylinder:{"radius":"7 cm","height":"20 cm"}]</p><p>Sebuah wadah tabung memiliki jari-jari alas 7 cm dan tinggi 20 cm. Berapakah volume wadah penampung air tersebut? (Gunakan $\\pi = \\frac{22}{7}$)</p>`,
      kisi: `Disajikan stimulus gambar bangun ruang tabung dengan ukuran jari-jari dan tinggi tertentu, peserta didik dapat menghitung volume tabung dengan tepat.`,
      unitAns: "3.080 cm³",
      options: ["3.080 cm³", "2.940 cm³", "1.540 cm³", "880 cm³"],
      mcmaOptions: [
        "Luas alas tabung adalah 154 cm²",
        "Volume tabung penampung air adalah 3.080 cm³",
        "Luas selimut tabung adalah 880 cm²",
        "Volume tabung kurang dari 2.000 cm³"
      ],
      mcmaCorrect: ["Luas alas tabung adalah 154 cm²", "Volume tabung penampung air adalah 3.080 cm³", "Luas selimut tabung adalah 880 cm²"],
      tfRows: [
        { text: "Luas alas lingkaran tabung tersebut adalah 154 cm².", answer: true },
        { text: "Volume tabung penampung air tersebut adalah 3.080 cm³.", answer: true },
        { text: "Volume tabung tersebut kurang dari 2.500 cm³.", answer: false }
      ],
      matching: [
        { left: "Luas Alas Tabung", right: "154 cm²" },
        { left: "Luas Selimut Tabung", right: "880 cm²" },
        { left: "Volume Total Tabung", right: "3.080 cm³" }
      ],
      explanation: `**Langkah Perhitungan Volume Tabung:**\n1. Luas alas: $L_a = \\pi \\times r^2 = \\frac{22}{7} \\times 7^2 = 154\\text{ cm}^2$.\n2. Volume tabung: $V = L_a \\times t = 154 \\times 20 = \\mathbf{3.080\\text{ cm}^3}$.`,
      shortAnswer: "3.080",
      essayAnswer: "L_alas = 22/7 × 7² = 154 cm². Volume = L_alas × tinggi = 154 × 20 = 3.080 cm³."
    },
    cube: {
      tag: `[GEOMETRY:cube:{"side":"12 cm"}]`,
      lead: `Perhatikan gambar wadah penyimpanan berbentuk kubus berikut:`,
      detail: `<p>[GEOMETRY:cube:{"side":"12 cm"}]</p><p>Sebuah kotak wadah berbentuk kubus memiliki panjang rusuk 12 cm. Berapakah volume kotak kubus tersebut?</p>`,
      kisi: `Disajikan stimulus visual bangun ruang kubus dengan panjang rusuk tertentu, peserta didik dapat menghitung volume kubus dengan benar.`,
      unitAns: "1.728 cm³",
      options: ["1.728 cm³", "1.440 cm³", "864 cm³", "576 cm³"],
      mcmaOptions: [
        "Luas salah satu sisi kubus adalah 144 cm²",
        "Volume kotak kubus adalah 1.728 cm³",
        "Luas permukaan seluruh kubus adalah 864 cm²",
        "Panjang seluruh rusuk kubus adalah 120 cm"
      ],
      mcmaCorrect: ["Luas salah satu sisi kubus adalah 144 cm²", "Volume kotak kubus adalah 1.728 cm³", "Luas permukaan seluruh kubus adalah 864 cm²"],
      tfRows: [
        { text: "Luas salah satu bidang sisi kubus adalah 144 cm².", answer: true },
        { text: "Volume kotak kubus tersebut adalah 1.728 cm³.", answer: true },
        { text: "Volume kubus tersebut bernilai lebih dari 2.000 cm³.", answer: false }
      ],
      matching: [
        { left: "Luas Satu Sisi Kubus", right: "144 cm²" },
        { left: "Luas Permukaan Kubus", right: "864 cm²" },
        { left: "Volume Kubus", right: "1.728 cm³" }
      ],
      explanation: `**Langkah Perhitungan Volume Kubus:**\n$V = s^3 = 12\\text{ cm} \\times 12\\text{ cm} \\times 12\\text{ cm} = \\mathbf{1.728\\text{ cm}^3}$.`,
      shortAnswer: "1.728",
      essayAnswer: "Volume Kubus = s × s × s = 12 × 12 × 12 = 1.728 cm³."
    },
    cuboid: {
      tag: `[GEOMETRY:cuboid:{"width":"15 cm","depth":"8 cm","height":"10 cm"}]`,
      lead: `Perhatikan gambar kotak kemasan makanan berbentuk balok berikut:`,
      detail: `<p>[GEOMETRY:cuboid:{"width":"15 cm","depth":"8 cm","height":"10 cm"}]</p><p>Sebuah kotak kemasan memiliki ukuran panjang 15 cm, lebar 8 cm, dan tinggi 10 cm. Berapakah volume kotak kemasan tersebut?</p>`,
      kisi: `Disajikan stimulus bangun ruang balok dengan ukuran dimensi panjang, lebar, dan tinggi, peserta didik dapat menentukan volume balok dengan cermat.`,
      unitAns: "1.200 cm³",
      options: ["1.200 cm³", "1.120 cm³", "960 cm³", "800 cm³"],
      mcmaOptions: [
        "Luas alas balok adalah 120 cm²",
        "Volume kotak balok adalah 1.200 cm³",
        "Keliling alas balok adalah 46 cm",
        "Volume balok lebih kecil dari 1.000 cm³"
      ],
      mcmaCorrect: ["Luas alas balok adalah 120 cm²", "Volume kotak balok adalah 1.200 cm³", "Keliling alas balok adalah 46 cm"],
      tfRows: [
        { text: "Luas alas kotak kemasan balok adalah 120 cm².", answer: true },
        { text: "Volume kotak balok tersebut adalah 1.200 cm³.", answer: true },
        { text: "Volume kotak kemasan tersebut adalah 1.500 cm³.", answer: false }
      ],
      matching: [
        { left: "Luas Alas Balok", right: "120 cm²" },
        { left: "Luas Bidang Depan", right: "150 cm²" },
        { left: "Volume Balok", right: "1.200 cm³" }
      ],
      explanation: `**Langkah Perhitungan Volume Balok:**\n$V = p \\times l \\times t = 15\\text{ cm} \\times 8\\text{ cm} \\times 10\\text{ cm} = \\mathbf{1.200\\text{ cm}^3}$.`,
      shortAnswer: "1.200",
      essayAnswer: "Volume Balok = panjang × lebar × tinggi = 15 × 8 × 10 = 1.200 cm³."
    },
    cone: {
      tag: `[GEOMETRY:cone:{"radius":"7 cm","height":"24 cm"}]`,
      lead: `Perhatikan gambar cetakan tumpeng berbentuk kerucut berikut:`,
      detail: `<p>[GEOMETRY:cone:{"radius":"7 cm","height":"24 cm"}]</p><p>Sebuah kerucut memiliki jari-jari alas 7 cm dan tinggi 24 cm. Berapakah volume kerucut tersebut? (Gunakan $\\pi = \\frac{22}{7}$)</p>`,
      kisi: `Disajikan stimulus visual bangun ruang kerucut dengan dimensi jari-jari dan tinggi, peserta didik dapat menghitung volume kerucut dengan benar.`,
      unitAns: "1.232 cm³",
      options: ["1.232 cm³", "1.154 cm³", "924 cm³", "616 cm³"],
      mcmaOptions: [
        "Luas alas kerucut adalah 154 cm²",
        "Volume kerucut adalah 1.232 cm³",
        "Garis pelukis (s) kerucut adalah 25 cm",
        "Volume kerucut lebih dari 2.000 cm³"
      ],
      mcmaCorrect: ["Luas alas kerucut adalah 154 cm²", "Volume kerucut adalah 1.232 cm³", "Garis pelukis (s) kerucut adalah 25 cm"],
      tfRows: [
        { text: "Luas lingkaran alas kerucut adalah 154 cm².", answer: true },
        { text: "Volume kerucut tersebut adalah 1.232 cm³.", answer: true },
        { text: "Volume kerucut tersebut mencapai 2.464 cm³.", answer: false }
      ],
      matching: [
        { left: "Luas Alas Kerucut", right: "154 cm²" },
        { left: "Tinggi Kerucut", right: "24 cm" },
        { left: "Volume Kerucut", right: "1.232 cm³" }
      ],
      explanation: `**Langkah Perhitungan Volume Kerucut:**\n$V = \\frac{1}{3} \\times \\pi \\times r^2 \\times t = \\frac{1}{3} \\times 154 \\times 24 = 154 \\times 8 = \\mathbf{1.232\\text{ cm}^3}$.`,
      shortAnswer: "1.232",
      essayAnswer: "V = 1/3 × π × r² × t = 1/3 × 154 × 24 = 1.232 cm³."
    },
    prism: {
      tag: `[GEOMETRY:prism:{"width":"6 cm","height":"8 cm","depth":"15 cm"}]`,
      lead: `Perhatikan gambar kemasan cokelat berbentuk prisma tegak segitiga siku-siku berikut:`,
      detail: `<p>[GEOMETRY:prism:{"width":"6 cm","height":"8 cm","depth":"15 cm"}]</p><p>Alas prisma berbentuk segitiga siku-siku dengan panjang sisi siku-siku 6 cm dan 8 cm, serta panjang prisma 15 cm. Berapakah volume prisma tersebut?</p>`,
      kisi: `Disajikan stimulus visual prisma tegak segitiga dengan ukuran alas dan tinggi prisma, peserta didik dapat menentukan volume prisma segitiga secara tepat.`,
      unitAns: "360 cm³",
      options: ["360 cm³", "320 cm³", "280 cm³", "180 cm³"],
      mcmaOptions: [
        "Luas alas segitiga prisma adalah 24 cm²",
        "Panjang sisi miring alas segitiga adalah 10 cm",
        "Volume prisma segitiga adalah 360 cm³",
        "Volume prisma segitiga adalah 720 cm³"
      ],
      mcmaCorrect: ["Luas alas segitiga prisma adalah 24 cm²", "Panjang sisi miring alas segitiga adalah 10 cm", "Volume prisma segitiga adalah 360 cm³"],
      tfRows: [
        { text: "Luas alas segitiga siku-siku prisma adalah 24 cm².", answer: true },
        { text: "Volume prisma tegak segitiga tersebut adalah 360 cm³.", answer: true },
        { text: "Volume prisma tersebut sama dengan 720 cm³.", answer: false }
      ],
      matching: [
        { left: "Luas Alas Segitiga", right: "24 cm²" },
        { left: "Panjang Prisma", right: "15 cm" },
        { left: "Volume Prisma", right: "360 cm³" }
      ],
      explanation: `**Langkah Perhitungan Volume Prisma:**\n1. Luas alas: $L_a = \\frac{1}{2} \\times 6 \\times 8 = 24\\text{ cm}^2$.\n2. Volume: $V = L_a \\times t_{\\text{prisma}} = 24 \\times 15 = \\mathbf{360\\text{ cm}^3}$.`,
      shortAnswer: "360",
      essayAnswer: "L_alas = 1/2 × 6 × 8 = 24 cm². Volume = 24 × 15 = 360 cm³."
    },
    combined_cylinder_cone: {
      tag: `[GEOMETRY:combined_cylinder_cone:{"radius":"7 cm","cylinderHeight":"10 cm","coneHeight":"6 cm"}]`,
      lead: `Perhatikan gambar tangki penyimpanan berbentuk bangun ruang gabungan tabung dan kerucut berikut:`,
      detail: `<p>[GEOMETRY:combined_cylinder_cone:{"radius":"7 cm","cylinderHeight":"10 cm","coneHeight":"6 cm"}]</p><p>Bagian bawah berupa tabung dengan jari-jari 7 cm dan tinggi 10 cm. Bagian atas berupa kerucut dengan jari-jari sama dan tinggi 6 cm. Berapakah volume total tangki tersebut? (Gunakan $\\pi = \\frac{22}{7}$)</p>`,
      kisi: `Disajikan stimulus visual bangun ruang gabungan tabung dan kerucut, peserta didik dapat menganalisis dan menghitung volume gabungan dengan akurat.`,
      unitAns: "1.848 cm³",
      options: ["1.848 cm³", "1.650 cm³", "1.540 cm³", "1.232 cm³"],
      mcmaOptions: [
        "Volume tabung bagian bawah adalah 1.540 cm³",
        "Volume kerucut bagian atas adalah 308 cm³",
        "Volume total tangki gabungan adalah 1.848 cm³",
        "Volume kerucut lebih besar daripada volume tabung"
      ],
      mcmaCorrect: ["Volume tabung bagian bawah adalah 1.540 cm³", "Volume kerucut bagian atas adalah 308 cm³", "Volume total tangki gabungan adalah 1.848 cm³"],
      tfRows: [
        { text: "Volume tabung penyusun bagian bawah adalah 1.540 cm³.", answer: true },
        { text: "Volume kerucut penyusun bagian atas adalah 308 cm³.", answer: true },
        { text: "Volume total seluruh tangki melebihi 2.000 cm³.", answer: false }
      ],
      matching: [
        { left: "Volume Tabung Bawah", right: "1.540 cm³" },
        { left: "Volume Kerucut Atas", right: "308 cm³" },
        { left: "Volume Total Tangki", right: "1.848 cm³" }
      ],
      explanation: `**Langkah Perhitungan Bangun Gabungan Tabung dan Kerucut:**\n1. $V_{\\text{tabung}} = \\frac{22}{7} \\times 7^2 \\times 10 = 1.540\\text{ cm}^3$.\n2. $V_{\\text{kerucut}} = \\frac{1}{3} \\times \\frac{22}{7} \\times 7^2 \\times 6 = 308\\text{ cm}^3$.\n3. $V_{\\text{total}} = 1.540 + 308 = \\mathbf{1.848\\text{ cm}^3}$.`,
      shortAnswer: "1.848",
      essayAnswer: "V_tabung = 1.540 cm³. V_kerucut = 308 cm³. V_total = 1.540 + 308 = 1.848 cm³."
    },
    combined_cuboid_pyramid: {
      tag: `[GEOMETRY:combined_cuboid_pyramid:{"bottom_width":"12 cm","bottom_depth":"12 cm","bottom_height":"8 cm","top_height":"8 cm"}]`,
      lead: `Perhatikan gambar miniatur monumen kayu gabungan balok dan limas segiempat berikut:`,
      detail: `<p>[GEOMETRY:combined_cuboid_pyramid:{"bottom_width":"12 cm","bottom_depth":"12 cm","bottom_height":"8 cm","top_height":"8 cm"}]</p><p>Ukuran balok bagian bawah memiliki panjang 12 cm, lebar 12 cm, dan tinggi 8 cm. Di atas balok dipasang limas segiempat beraturan dengan alas berimpit sempurna dan tinggi limas 8 cm. Berapakah volume total bangun gabungan tersebut?</p>`,
      kisi: `Disajikan stimulus visual bangun ruang gabungan balok dan limas segiempat berukuran dimensi tertentu, peserta didik dapat menganalisis dan menghitung volume gabungan kedua bangun tersebut dengan tepat.`,
      unitAns: "1.536 cm³",
      options: ["1.536 cm³", "1.440 cm³", "1.296 cm³", "1.152 cm³"],
      mcmaOptions: [
        "Volume balok bagian bawah adalah 1.152 cm³",
        "Volume limas segiempat bagian atas adalah 384 cm³",
        "Volume total bangun ruang gabungan adalah 1.536 cm³",
        "Volume bagian limas lebih besar dari volume balok"
      ],
      mcmaCorrect: ["Volume balok bagian bawah adalah 1.152 cm³", "Volume limas segiempat bagian atas adalah 384 cm³", "Volume total bangun ruang gabungan adalah 1.536 cm³"],
      tfRows: [
        { text: "Volume balok penyusun bagian bawah adalah 1.152 cm³.", answer: true },
        { text: "Volume limas segiempat penyusun bagian atas adalah 384 cm³.", answer: true },
        { text: "Volume total gabungan kedua bangun ruang melebihi 1.600 cm³.", answer: false }
      ],
      matching: [
        { left: "Volume Balok", right: "1.152 cm³" },
        { left: "Volume Limas Segiempat", right: "384 cm³" },
        { left: "Volume Total Gabungan", right: "1.536 cm³" }
      ],
      explanation: `**Langkah Perhitungan Geometri Bangun Gabungan:**\n1. Volume Balok: $12 \\times 12 \\times 8 = 1.152\\text{ cm}^3$.\n2. Volume Limas: $\\frac{1}{3} \\times (12 \\times 12) \\times 8 = 384\\text{ cm}^3$.\n3. Volume Total: $1.152 + 384 = \\mathbf{1.536\\text{ cm}^3}$.`,
      shortAnswer: "1.536",
      essayAnswer: "V_balok = 1.152 cm³. V_limas = 384 cm³. V_total = 1.152 + 384 = 1.536 cm³."
    }
  };

  // Determine which shape to select based on user context or rotation
  let chosenKey = "cylinder";
  if (contextStr.includes("tabung") || contextStr.includes("silinder")) {
    chosenKey = (contextStr.includes("kerucut") || contextStr.includes("gabungan")) ? "combined_cylinder_cone" : "cylinder";
  } else if (contextStr.includes("kerucut")) {
    chosenKey = contextStr.includes("gabungan") ? "combined_cylinder_cone" : "cone";
  } else if (contextStr.includes("kubus")) {
    chosenKey = "cube";
  } else if (contextStr.includes("prisma")) {
    chosenKey = "prism";
  } else if (contextStr.includes("limas")) {
    chosenKey = contextStr.includes("balok") ? "combined_cuboid_pyramid" : "combined_cuboid_pyramid";
  } else if (contextStr.includes("balok")) {
    chosenKey = (contextStr.includes("limas") || contextStr.includes("gabungan")) ? "combined_cuboid_pyramid" : "cuboid";
  } else if (contextStr.includes("gabungan")) {
    const combinedKeys = ["combined_cylinder_cone", "combined_cuboid_pyramid"];
    chosenKey = combinedKeys[args.index % combinedKeys.length];
  } else {
    // General geometry volume topic: rotate diverse shapes per index
    const varietyKeys = ["cylinder", "cube", "cuboid", "cone", "prism", "combined_cylinder_cone", "combined_cuboid_pyramid"];
    chosenKey = varietyKeys[args.index % varietyKeys.length];
  }

  const cur = shapeCatalog[chosenKey] || shapeCatalog.cylinder;
  const kisiKisi = args.kisiKisi || (args.blueprint ? args.blueprint : cur.kisi);

  if (qType === "MULTIPLE_CHOICE") {
    return {
      id,
      questionType: "MULTIPLE_CHOICE",
      questionText: `<p>${cur.lead}</p>${cur.detail}`,
      options: cur.options,
      correctAnswer: cur.options[0],
      scoreWeight: 1,
      explanation: cur.explanation,
      kisiKisi,
      level: levelText,
      category,
      isFallback: true,
      fallbackReason
    } as any;
  }

  if (qType === "COMPLEX_MULTIPLE_CHOICE") {
    return {
      id,
      questionType: "COMPLEX_MULTIPLE_CHOICE",
      questionText: `<p>${cur.lead}</p>${cur.detail}<p>Pilihlah semua pernyataan yang benar berdasarkan ukuran bangun tersebut!</p>`,
      options: cur.mcmaOptions,
      correctAnswer: JSON.stringify(cur.mcmaCorrect),
      scoreWeight: 2,
      explanation: cur.explanation,
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
      questionText: `<p>${cur.lead}</p>${cur.detail}<p>Tentukan apakah setiap pernyataan berikut bernilai <strong>Benar</strong> atau <strong>Salah</strong>!</p>`,
      options: [],
      correctAnswer: "",
      scoreWeight: 1,
      trueFalseRows: cur.tfRows,
      explanation: cur.explanation,
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
      questionText: `<p>${cur.lead}</p>${cur.detail}<p>Pasangkanlah setiap komponen bangun ruang dengan nilai besaran yang tepat!</p>`,
      options: [],
      correctAnswer: "",
      scoreWeight: 1,
      matchingPairs: cur.matching,
      explanation: cur.explanation,
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
      questionText: `<p>${cur.lead}</p>${cur.detail}<p>Volume bangun ruang tersebut adalah ... cm³.</p>`,
      options: [],
      correctAnswer: cur.shortAnswer,
      scoreWeight: 1,
      explanation: cur.explanation,
      kisiKisi,
      level: levelText,
      category,
      isFallback: true,
      fallbackReason
    } as any;
  }

  return {
    id,
    questionType: "ESSAY",
    questionText: `<p>${cur.lead}</p>${cur.detail}<p>Tuliskan rumus dan langkah-langkah perhitungan sistematis untuk menghitung volume bangun ruang tersebut!</p>`,
    options: [],
    correctAnswer: cur.essayAnswer,
    scoreWeight: 3,
    explanation: cur.explanation,
    kisiKisi,
    level: levelText,
    category,
    isFallback: true,
    fallbackReason
  } as any;
}

// 1. Math Fallback Generator (Complete with Bar Chart, Line Chart or Geometry)
function buildMathFallbackQuestion(args: {
  id: string;
  index: number;
  blueprint: string;
  kisiKisi?: string;
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

  const kisiKisi = args.kisiKisi || (args.blueprint ? args.blueprint : `Disajikan diagram batang data penjualan kontekstual (Toko Beras), peserta didik dapat menganalisis dan menghitung selisih pendapatan berkondisi diskon bertingkat dengan tepat.`);

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
  kisiKisi?: string;
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

  const kisiKisi = args.kisiKisi || (args.blueprint ? args.blueprint : `Disajikan bagan rantai makanan ekosistem sawah, peserta didik dapat memprediksi dampak perubahan populasi salah satu komponen trofik terhadap keseimbangan ekosistem dengan tepat.`);

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
  kisiKisi?: string;
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

  const kisiKisi = args.kisiKisi || (args.blueprint ? args.blueprint : `Disajikan teks bacaan informatif mengenai transformasi pendidikan digital, peserta didik dapat menentukan simpulan pokok isi teks dengan tepat.`);

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
