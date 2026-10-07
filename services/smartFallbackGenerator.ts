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
      scoreWeight: config.scoreWeight,
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
  scoreWeight?: number;
  includeImages: boolean;
  failureReason: string;
}

function buildSingleFallbackQuestion(params: FallbackParams): Question {
  const { index, subject, blueprint, qType, difficulty, includeImages, failureReason, scoreWeight } = params;
  const contextStr = `${subject} ${blueprint} ${params.category || ''} ${params.kisiKisi || ''}`.toLowerCase();

  const isProbability = /peluang|permutasi|kombinasi|pencacahan|kaidah perkalian|ruang sampel|kejadian majemuk|dadu|koin|kartu bridge/i.test(contextStr);
  const isMatrix = !isProbability && /matriks|determinan|invers matriks|ordo/i.test(contextStr);
  const isSequence = !isProbability && !isMatrix && /barisan|deret|aritmatika|aritmetika|geometri|bunga majemuk|anuitas/i.test(contextStr);
  const isTrig = !isProbability && !isMatrix && !isSequence && /trigonometri|sinus|cosinus|tangen|aturan sinus|sudut istimewa/i.test(contextStr);
  const isAlgebra = !isProbability && !isMatrix && !isSequence && !isTrig && /aljabar|spltv|spls|persamaan linear|pertidaksamaan|sistem persamaan/i.test(contextStr);

  const isCartesian = !isProbability && !isMatrix && !isSequence && !isTrig && !isAlgebra &&
                      (/kartesius|cartesian|koordinat|titik potong|persamaan garis|kuadran|fungsi kuadrat|parabola/i.test(contextStr));

  const isGeometry = !isProbability && !isMatrix && !isSequence && !isTrig && !isAlgebra && !isCartesian &&
                     (/geometri|bangun|balok|limas|kubus|tabung|kerucut|prisma|bola|dimensi/i.test(contextStr));

  const isScience = /ipa|sains|biologi|fisika|kimia|alam|ekosistem|organ|tata surya|fotosintesis|rantai makanan|peredaran darah|daur/i.test(contextStr);
  const isIndonesian = /bahasa indonesia|literasi|teks|fabel|cerpen|puisi|bacaan|artikel|paragraf/i.test(contextStr);

  const id = `q_fallback_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const levelText = difficulty.includes("HOTS") ? "Level 3 - Penalaran (HOTS)" : difficulty;
  const category = params.category || (isProbability ? "Peluang & Kaidah Pencacahan" : isMatrix ? "Matriks" : isSequence ? "Barisan dan Deret" : isTrig ? "Trigonometri" : isAlgebra ? "Aljabar & Sistem Persamaan" : isCartesian ? "Koordinat & Diagram Kartesius" : isGeometry ? "Geometri Bangun Ruang" : isScience ? "Ilmu Pengetahuan Alam" : isIndonesian ? "Literasi Membaca" : subject);

  let q: Question;
  // Question context generator based on Subject & Blueprint
  if (isProbability) {
    q = buildProbabilityFallbackQuestion({ id, index, blueprint, kisiKisi: params.kisiKisi, qType, levelText, category, includeImages, failureReason });
  } else if (isMatrix) {
    q = buildMatrixFallbackQuestion({ id, index, blueprint, kisiKisi: params.kisiKisi, qType, levelText, category, includeImages, failureReason });
  } else if (isSequence) {
    q = buildSequenceFallbackQuestion({ id, index, blueprint, kisiKisi: params.kisiKisi, qType, levelText, category, includeImages, failureReason });
  } else if (isTrig) {
    q = buildTrigonometryFallbackQuestion({ id, index, blueprint, kisiKisi: params.kisiKisi, qType, levelText, category, includeImages, failureReason });
  } else if (isAlgebra) {
    q = buildAlgebraFallbackQuestion({ id, index, blueprint, kisiKisi: params.kisiKisi, qType, levelText, category, includeImages, failureReason });
  } else if (isCartesian) {
    q = buildCartesianFallbackQuestion({ id, index, blueprint, kisiKisi: params.kisiKisi, qType, levelText, category, includeImages, failureReason });
  } else if (isGeometry) {
    q = buildGeometryFallbackQuestion({ id, index, blueprint, kisiKisi: params.kisiKisi, qType, levelText, category, includeImages, failureReason });
  } else if (isScience) {
    q = buildScienceFallbackQuestion({ id, index, blueprint, kisiKisi: params.kisiKisi, qType, levelText, category, includeImages, failureReason });
  } else {
    q = buildGeneralFallbackQuestion({ id, index, subject, blueprint, kisiKisi: params.kisiKisi, qType, levelText, category, includeImages, failureReason });
  }

  if (scoreWeight && scoreWeight > 0) {
    q.scoreWeight = scoreWeight;
  }
  return q;
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
  const fallbackReason = failureReason || args.failureReason || "Safe Fallback Active";

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
      tag: `[GEOMETRY:cube:{"side":"12 cm","vertices":"ABCD.EFGH"}]`,
      lead: `Perhatikan gambar wadah penyimpanan berbentuk kubus ABCD.EFGH berikut:`,
      detail: `<p>[GEOMETRY:cube:{"side":"12 cm","vertices":"ABCD.EFGH"}]</p><p>Sebuah kotak wadah berbentuk kubus ABCD.EFGH memiliki panjang rusuk 12 cm. Berapakah volume kotak kubus tersebut?</p>`,
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
      tag: `[GEOMETRY:cuboid:{"width":"15 cm","depth":"8 cm","height":"10 cm","vertices":"ABCD.EFGH"}]`,
      lead: `Perhatikan gambar kotak kemasan makanan berbentuk balok ABCD.EFGH berikut:`,
      detail: `<p>[GEOMETRY:cuboid:{"width":"15 cm","depth":"8 cm","height":"10 cm","vertices":"ABCD.EFGH"}]</p><p>Sebuah kotak kemasan memiliki ukuran panjang 15 cm, lebar 8 cm, dan tinggi 10 cm. Berapakah volume kotak kemasan tersebut?</p>`,
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
      categoryLabels: ["Benar", "Salah"],
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
  const fallbackReason = failureReason || args.failureReason || "Safe Fallback Active";

  const chartData: ChartData = {
    type: "bar",
    title: "Data Penjualan Beras Toko Sembako Pak Bondan (5 Hari)",
    labels: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
    datasets: [
      {
        label: "Jumlah Karung Beras Terjual",
        data: [16, 20, 28, 22, 30]
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
      categoryLabels: ["Benar", "Salah"],
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

// 1b. Cartesian Diagram Fallback Generator
function buildCartesianFallbackQuestion(args: {
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
  const { id, qType, levelText, category, includeImages, failureReason } = args;
  const fallbackReason = failureReason || args.failureReason || "Safe Fallback Active";

  const isQuadraticTopic = /fungsi kuadrat|titik puncak|sumbu simetri|parabola|persamaan kuadrat/i.test(
    `${args.blueprint} ${args.kisiKisi || ''} ${category}`
  );

  if (isQuadraticTopic) {
    const quadChartData: ChartData = {
      type: "cartesian",
      title: "Grafik Fungsi Kuadrat f(x) = x² - 2x - 3",
      labels: ["X", "Y"],
      cartesianConfig: {
        xMin: -4,
        xMax: 6,
        yMin: -6,
        yMax: 8,
        xStep: 1,
        yStep: 1,
        showGrid: true,
        showAxisNumbers: true,
      },
      datasets: [
        {
          label: "f(x) = x² - 2x - 3",
          kind: "function",
          isFunction: true,
          functionStr: "x^2 - 2*x - 3",
          backgroundColor: ["#2563eb"],
          borderColor: ["#2563eb"],
          lineWidth: 2.5,
          showLine: true,
          data: [],
        },
        {
          label: "Titik Puncak P(1, -4)",
          kind: "point",
          backgroundColor: ["#dc2626"],
          borderColor: ["#dc2626"],
          showLine: false,
          data: [
            { x: 1, y: -4, label: "P(1, -4)", pointStyle: "solid" },
            { x: -1, y: 0, label: "(-1, 0)", pointStyle: "solid" },
            { x: 3, y: 0, label: "(3, 0)", pointStyle: "solid" },
          ],
        },
      ],
    };

    const quadLead = `Perhatikan gambar grafik fungsi kuadrat $f(x) = x^2 - 2x - 3$ pada bidang koordinat kartesius berikut:`;
    const quadDetail = `${CHART_PLACEHOLDER_HTML}
Berdasarkan grafik fungsi kuadrat di atas, koordinat titik puncak (titik balik minimum) dan persamaan sumbu simetri kurva parabola tersebut berturut-turut adalah...`;

    const quadExplanation = `**Langkah Penyelesaian Sistematis:**
1. **Bentuk Umum Fungsi Kuadrat:**
   - $f(x) = ax^2 + bx + c$
   - Dari grafik, $f(x) = x^2 - 2x - 3$, sehingga $a = 1$, $b = -2$, dan $c = -3$.
2. **Persamaan Sumbu Simetri ($x_p$):**
   - $x_p = -\\frac{b}{2a} = -\\frac{-2}{2(1)} = \\mathbf{1}$.
3. **Nilai Optimum / Titik Puncak ($y_p$):**
   - $y_p = f(x_p) = (1)^2 - 2(1) - 3 = 1 - 2 - 3 = \\mathbf{-4}$.
4. **Koordinat Titik Puncak ($P$):**
   - Koordinat titik puncak adalah $\\mathbf{P(1, -4)}$ dan persamaan sumbu simetri adalah $\\mathbf{x = 1}$.`;

    const quadKisiKisi = args.kisiKisi || `Disajikan stimulus grafik fungsi kuadrat pada bidang kartesius, peserta didik dapat menentukan koordinat titik puncak dan persamaan sumbu simetri parabola dengan tepat.`;

    if (qType === "MULTIPLE_CHOICE") {
      return {
        id,
        questionType: "MULTIPLE_CHOICE",
        questionText: `<p>${quadLead}</p>${quadDetail}`,
        options: [
          "Titik puncak $(1, -4)$ dan sumbu simetri $x = 1$",
          "Titik puncak $(-1, -4)$ dan sumbu simetri $x = -1$",
          "Titik puncak $(1, 4)$ dan sumbu simetri $x = 1$",
          "Titik puncak $(2, -3)$ dan sumbu simetri $x = 2$"
        ],
        correctAnswer: "Titik puncak $(1, -4)$ dan sumbu simetri $x = 1$",
        scoreWeight: 1,
        chartData: includeImages ? quadChartData : undefined,
        explanation: quadExplanation,
        kisiKisi: quadKisiKisi,
        level: levelText,
        category,
        isFallback: true,
        fallbackReason,
      } as any;
    }

    if (qType === "COMPLEX_MULTIPLE_CHOICE") {
      return {
        id,
        questionType: "COMPLEX_MULTIPLE_CHOICE",
        questionText: `<p>${quadLead}</p>${CHART_PLACEHOLDER_HTML}<p>Berdasarkan grafik fungsi kuadrat $f(x) = x^2 - 2x - 3$ di atas, pilihlah seluruh pernyataan yang BENAR!</p>`,
        options: [
          "Kurva parabola terbuka ke atas karena nilai $a = 1 > 0$.",
          "Titik puncak (titik balik minimum) parabola berada pada koordinat $(1, -4)$.",
          "Persamaan sumbu simetri kurva adalah $x = 1$.",
          "Grafik memotong sumbu X di titik $(2, 0)$ dan $(-3, 0)$."
        ],
        correctAnswer: JSON.stringify([
          "Kurva parabola terbuka ke atas karena nilai $a = 1 > 0$.",
          "Titik puncak (titik balik minimum) parabola berada pada koordinat $(1, -4)$.",
          "Persamaan sumbu simetri kurva adalah $x = 1$."
        ]),
        scoreWeight: 2,
        chartData: includeImages ? quadChartData : undefined,
        explanation: quadExplanation,
        kisiKisi: quadKisiKisi,
        level: levelText,
        category,
        isFallback: true,
        fallbackReason,
      } as any;
    }

    if (qType === "TRUE_FALSE") {
      return {
        id,
        questionType: "TRUE_FALSE",
        questionText: `<p>${quadLead}</p>${CHART_PLACEHOLDER_HTML}<p>Tentukan nilai kebenaran (Benar atau Salah) dari setiap pernyataan berikut terkait grafik fungsi kuadrat $f(x) = x^2 - 2x - 3$:</p>`,
        options: [],
        trueFalseRows: [
          { text: "Kurva parabola memiliki sumbu simetri pada garis $x = 1$.", answer: true },
          { text: "Titik puncak kurva berada pada koordinat $(1, -4)$.", answer: true },
          { text: "Grafik parabola terbuka ke bawah dan memiliki nilai maksimum $y = 4$.", answer: false }
        ],
        correctAnswer: "Pernyataan 1: Benar, Pernyataan 2: Benar, Pernyataan 3: Salah",
        scoreWeight: 2,
        chartData: includeImages ? quadChartData : undefined,
        explanation: quadExplanation,
        kisiKisi: quadKisiKisi,
        level: levelText,
        category,
        isFallback: true,
        fallbackReason,
      } as any;
    }

    if (qType === "MATCHING") {
      return {
        id,
        questionType: "MATCHING",
        questionText: `<p>${quadLead}</p>${CHART_PLACEHOLDER_HTML}<p>Pasangkanlah karakteristik grafik fungsi kuadrat $f(x) = x^2 - 2x - 3$ berikut dengan nilai/persamaan yang tepat:</p>`,
        options: [],
        matchingPairs: [
          { leftText: "Persamaan sumbu simetri", rightText: "$x = 1$" },
          { leftText: "Koordinat titik puncak", rightText: "$(1, -4)$" },
          { leftText: "Titik potong sumbu Y", rightText: "$(0, -3)$" }
        ],
        correctAnswer: "Persamaan sumbu simetri -> $x = 1$, Koordinat titik puncak -> $(1, -4)$, Titik potong sumbu Y -> $(0, -3)$",
        scoreWeight: 2,
        chartData: includeImages ? quadChartData : undefined,
        explanation: quadExplanation,
        kisiKisi: quadKisiKisi,
        level: levelText,
        category,
        isFallback: true,
        fallbackReason,
      } as any;
    }

    return {
      id,
      questionType: "FILL_IN_THE_BLANK",
      questionText: `<p>${quadLead}</p>${quadDetail}`,
      options: [],
      correctAnswer: "(1, -4)",
      scoreWeight: 1,
      chartData: includeImages ? quadChartData : undefined,
      explanation: quadExplanation,
      kisiKisi: quadKisiKisi,
      level: levelText,
      category,
      isFallback: true,
      fallbackReason,
    } as any;
  }

  const chartData: ChartData = {
    type: "cartesian",
    title: "Bidang Koordinat Kartesius: Segitiga ABC",
    labels: ["X", "Y"],
    cartesianConfig: {
      xMin: -2,
      xMax: 6,
      yMin: -2,
      yMax: 6,
      xStep: 1,
      yStep: 1,
      showGrid: true,
      showProjections: true,
      showCoordinates: true,
    },
    datasets: [
      {
        label: "Segitiga ABC",
        shapeType: "polygon",
        closed: true,
        fill: true,
        fillColor: "rgba(37, 99, 235, 0.25)",
        backgroundColor: ["#2563eb"],
        borderColor: ["#2563eb"],
        data: [
          { x: 1, y: 1, label: "A" },
          { x: 5, y: 1, label: "B" },
          { x: 2, y: 5, label: "C" },
        ],
      },
    ],
  };

  const questionLead = `Perhatikan bidang koordinat kartesius yang memuat segitiga ABC dengan titik-titik sudut $A(1, 1)$, $B(5, 1)$, dan $C(2, 5)$ berikut:`;
  const questionDetail = `${CHART_PLACEHOLDER_HTML}
Diketahui segitiga ABC memiliki alas pada garis horizontal dari titik $A(1, 1)$ ke titik $B(5, 1)$, dan titik puncak berada pada titik $C(2, 5)$. Berapakah luas daerah segitiga ABC tersebut?`;

  const explanation = `**Langkah Penyelesaian Sistematis:**
1. **Panjang Alas Segitiga ($a$):**
   - Jarak horizontal dari titik $A(1, 1)$ ke $B(5, 1)$ adalah:
   - $a = x_B - x_A = 5 - 1 = 4\\text{ satuan}$.
2. **Tinggi Segitiga ($t$):**
   - Jarak vertikal dari garis alas ($y = 1$) ke titik puncak $C(2, 5)$ adalah:
   - $t = y_C - y_A = 5 - 1 = 4\\text{ satuan}$.
3. **Luas Segitiga ABC:**
   - $L = \\frac{1}{2} \\times \\text{alas} \\times \\text{tinggi}$
   - $L = \\frac{1}{2} \\times 4 \\times 4 = \\mathbf{8\\text{ satuan luas}}$.`;

  const kisiKisi = args.kisiKisi || (args.blueprint ? args.blueprint : `Disajikan stimulus diagram kartesius memuat bangun poligon segitiga dengan titik koordinat tertentu, peserta didik dapat menentukan luas bangun datar tersebut secara tepat.`);

  if (qType === "MULTIPLE_CHOICE") {
    return {
      id,
      questionType: "MULTIPLE_CHOICE",
      questionText: `<p>${questionLead}</p>${questionDetail}`,
      options: ["8 satuan luas", "10 satuan luas", "12 satuan luas", "16 satuan luas"],
      correctAnswer: "8 satuan luas",
      scoreWeight: 1,
      chartData: includeImages ? chartData : undefined,
      explanation,
      kisiKisi,
      level: levelText,
      category,
      isFallback: true,
      fallbackReason,
    } as any;
  }

  if (qType === "COMPLEX_MULTIPLE_CHOICE") {
    return {
      id,
      questionType: "COMPLEX_MULTIPLE_CHOICE",
      questionText: `<p>${questionLead}</p>${CHART_PLACEHOLDER_HTML}<p>Tentukan seluruh pernyataan yang BENAR mengenai bangun segitiga ABC pada bidang kartesius di atas! (Pilihan ganda kompleks)</p>`,
      options: [
        "Panjang alas segitiga (ruas garis AB) adalah 4 satuan.",
        "Tinggi segitiga ABC yang ditarik dari titik C ke garis AB adalah 4 satuan.",
        "Luas daerah segitiga ABC adalah 8 satuan luas.",
        "Titik sudut A terletak pada koordinat (5, 1)."
      ],
      correctAnswer: JSON.stringify([
        "Panjang alas segitiga (ruas garis AB) adalah 4 satuan.",
        "Tinggi segitiga ABC yang ditarik dari titik C ke garis AB adalah 4 satuan.",
        "Luas daerah segitiga ABC adalah 8 satuan luas."
      ]),
      scoreWeight: 2,
      chartData: includeImages ? chartData : undefined,
      explanation,
      kisiKisi,
      level: levelText,
      category,
      isFallback: true,
      fallbackReason,
    } as any;
  }

  if (qType === "TRUE_FALSE") {
    return {
      id,
      questionType: "TRUE_FALSE",
      questionText: `<p>${questionLead}</p>${CHART_PLACEHOLDER_HTML}<p>Tentukan Benar atau Salah untuk setiap pernyataan berikut terkait koordinat segitiga ABC:</p>`,
      options: [],
      trueFalseRows: [
        { text: "Panjang ruas garis AB pada sumbu mendatar adalah 4 satuan.", answer: true },
        { text: "Luas daerah segitiga ABC pada bidang kartesius tersebut adalah 8 satuan luas.", answer: true },
        { text: "Tinggi segitiga ABC dari alas AB adalah 5 satuan.", answer: false }
      ],
      correctAnswer: "Benar, Benar, Salah",
      scoreWeight: 2,
      chartData: includeImages ? chartData : undefined,
      explanation,
      kisiKisi,
      level: levelText,
      category,
      isFallback: true,
      fallbackReason,
    } as any;
  }

  if (qType === "MATCHING") {
    return {
      id,
      questionType: "MATCHING",
      questionText: `<p>${questionLead}</p>${CHART_PLACEHOLDER_HTML}<p>Pasangkanlah unsur geometri segitiga ABC pada bidang kartesius berikut dengan nilai ukuran yang tepat:</p>`,
      options: [],
      matchingPairs: [
        { leftText: "Panjang alas (AB)", rightText: "4 satuan" },
        { leftText: "Tinggi segitiga", rightText: "4 satuan" },
        { leftText: "Luas segitiga ABC", rightText: "8 satuan luas" }
      ],
      correctAnswer: "1-A, 2-B, 3-C",
      scoreWeight: 2,
      chartData: includeImages ? chartData : undefined,
      explanation,
      kisiKisi,
      level: levelText,
      category,
      isFallback: true,
      fallbackReason,
    } as any;
  }

  return {
    id,
    questionType: "FILL_IN_THE_BLANK",
    questionText: `<p>${questionLead}</p>${questionDetail}`,
    options: [],
    correctAnswer: "8",
    scoreWeight: 1,
    chartData: includeImages ? chartData : undefined,
    explanation,
    kisiKisi,
    level: levelText,
    category,
    isFallback: true,
    fallbackReason,
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
  const fallbackReason = failureReason || args.failureReason || "Safe Fallback Active";

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
  const fallbackReason = failureReason || args.failureReason || "Safe Fallback Active";

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

// 4. Probability & Combinatorics Fallback Generator
function buildProbabilityFallbackQuestion(args: {
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
  const fallbackReason = failureReason || "Safe Fallback Active";
  const kisiKisi = args.kisiKisi || (args.blueprint ? args.blueprint : "SMA TKA - Menghitung penyusunan objek menggunakan aturan perkalian, permutasi, atau kombinasi");

  const questionText = `<p>Dari 7 orang pengurus organisasi siswa yang terdiri atas 4 siswa laki-laki dan 3 siswa perempuan, akan dipilih susunan kepengurusan inti yang terdiri atas <strong>Ketua</strong>, <strong>Sekretaris</strong>, dan <strong>Bendahara</strong>.</p><p>Jika posisi Ketua harus diisi oleh siswa laki-laki dan tidak boleh ada jabatan rangkap, banyak cara pemilihan susunan pengurus inti tersebut adalah ....</p>`;

  const explanation = `**Langkah Perhitungan Menggunakan Aturan Perkalian / Permutasi:**
1. **Pemilihan Ketua (dari 4 siswa laki-laki):** Ada $4$ kemungkinan pilihan.
2. **Sisa Calon Pengurus:** Dari total 7 orang, telah terpilih 1 orang sebagai Ketua, sehingga tersisa $(7 - 1) = 6$ orang calon.
3. **Pemilihan Sekretaris:** Dari 6 orang yang tersisa, ada $6$ pilihan.
4. **Pemilihan Bendahara:** Dari 5 orang yang tersisa, ada $5$ pilihan.
5. **Total Susunan Pengurus Inti:**
   $$\\text{Banyak Cara} = 4 \\times 6 \\times 5 = \\mathbf{120\\text{ cara}}$$`;

  if (qType === "MULTIPLE_CHOICE") {
    const options = ["120 cara", "90 cara", "180 cara", "210 cara", "60 cara"];
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

  if (qType === "COMPLEX_MULTIPLE_CHOICE") {
    const options = [
      "Banyak cara memilih Ketua dari calon laki-laki adalah 4 kemungkinan.",
      "Banyak cara memilih Sekretaris dan Bendahara setelah Ketua terpilih adalah $P(6, 2) = 30$ cara.",
      "Total variasi susunan pengurus inti yang dapat terbentuk adalah 120 cara.",
      "Jika tidak ada syarat jenis kelamin untuk Ketua, banyak susunan yang terbentuk adalah $P(7, 3) = 210$ cara."
    ];
    return {
      id,
      questionType: "COMPLEX_MULTIPLE_CHOICE",
      questionText: `<p>Dari 7 pengurus (4 laki-laki, 3 perempuan), akan dipilih Ketua (harus laki-laki), Sekretaris, dan Bendahara tanpa jabatan rangkap. Pilihlah semua pernyataan yang BENAR!</p>`,
      options,
      correctAnswer: JSON.stringify([options[0], options[1], options[2], options[3]]),
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
      questionText: `<p>Dari 7 pengurus (4 laki-laki, 3 perempuan), akan dipilih Ketua (harus laki-laki), Sekretaris, dan Bendahara. Tentukan nilai kebenaran setiap pernyataan berikut!</p>`,
      options: [],
      correctAnswer: "",
      scoreWeight: 1,
      trueFalseRows: [
        { text: "Banyak pilihan untuk mengisi posisi Ketua adalah 4 cara.", answer: true },
        { text: "Banyak pilihan untuk memilih Sekretaris dan Bendahara setelah Ketua terpilih adalah 30 cara.", answer: true },
        { text: "Total susunan kepengurusan inti yang dapat dibentuk melebihi 150 cara.", answer: false }
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
      questionText: `<p>Pasangkanlah tahapan pemilihan pengurus inti dengan banyak kemungkinan cara yang sesuai!</p>`,
      options: [],
      correctAnswer: "",
      scoreWeight: 1,
      matchingPairs: [
        { left: "Pemilihan Ketua (siswa laki-laki)", right: "4 cara" },
        { left: "Pemilihan Sekretaris & Bendahara", right: "30 cara" },
        { left: "Total susunan pengurus inti", right: "120 cara" }
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
      questionText,
      options: [],
      correctAnswer: "120",
      scoreWeight: 1,
      explanation,
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
    questionText: `<p>Dari 7 orang pengurus organisasi siswa (4 laki-laki dan 3 perempuan), akan dipilih susunan kepengurusan inti yang terdiri atas Ketua, Sekretaris, dan Bendahara. Posisi Ketua harus diisi oleh siswa laki-laki. Tuliskan rumus dan langkah-langkah sistematis untuk menentukan banyak kemungkinan susunan pengurus inti yang dapat dibentuk!</p>`,
    options: [],
    correctAnswer: "Banyak cara memilih Ketua = 4 cara. Sisa calon = 6 orang. Banyak cara memilih Sekretaris dan Bendahara = P(6, 2) = 6 × 5 = 30 cara. Total susunan = 4 × 30 = 120 cara.",
    scoreWeight: 3,
    explanation,
    kisiKisi,
    level: levelText,
    category,
    isFallback: true,
    fallbackReason
  } as any;
}

// 5. Matrix Fallback Generator
function buildMatrixFallbackQuestion(args: {
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
  const fallbackReason = failureReason || args.failureReason || "Safe Fallback Active";
  const kisiKisi = args.kisiKisi || (args.blueprint ? args.blueprint : "Disajikan matriks ordo 2x2, peserta didik dapat menentukan determinan dan invers matriks dengan tepat.");

  const questionText = `<p>Diketahui matriks $A = \\begin{pmatrix} 3 & 2 \\\\ 4 & 3 \\end{pmatrix}$ dan matriks $B = \\begin{pmatrix} 1 & -2 \\\\ 0 & 4 \\end{pmatrix}$.</p><p>Determinan dari matriks hasil perkalian $(A \\times B)$ adalah ....</p>`;

  const explanation = `**Langkah Penyelesaian Determinan Matriks:**
1. Determinan matriks $A$: $\\det(A) = (3 \\times 3) - (2 \\times 4) = 9 - 8 = 1$.
2. Determinan matriks $B$: $\\det(B) = (1 \\times 4) - (-2 \\times 0) = 4 - 0 = 4$.
3. Berdasarkan sifat determinan: $\\det(A \\times B) = \\det(A) \\times \\det(B) = 1 \\times 4 = \\mathbf{4}$.`;

  if (qType === "TRUE_FALSE") {
    return {
      id,
      questionType: "TRUE_FALSE",
      questionText: `<p>Diketahui matriks $A = \\begin{pmatrix} 3 & 2 \\\\ 4 & 3 \\end{pmatrix}$ dan matriks $B = \\begin{pmatrix} 1 & -2 \\\\ 0 & 4 \\end{pmatrix}$. Tentukan nilai kebenaran setiap pernyataan berikut!</p>`,
      options: [],
      correctAnswer: "",
      scoreWeight: 1,
      trueFalseRows: [
        { text: "Determinan dari matriks A bernilai 1.", answer: true },
        { text: "Determinan dari matriks B bernilai 4.", answer: true },
        { text: "Determinan hasil perkalian matriks (A × B) bernilai negatif.", answer: false }
      ],
      explanation,
      kisiKisi,
      level: levelText,
      category,
      isFallback: true,
      fallbackReason
    } as any;
  }

  const options = ["4", "1", "6", "8", "12"];

  return {
    id,
    questionType: qType,
    questionText,
    options: qType === "MULTIPLE_CHOICE" ? options : undefined,
    correctAnswer: qType === "MULTIPLE_CHOICE" ? options[0] : "4",
    scoreWeight: 1,
    explanation,
    kisiKisi,
    level: levelText,
    category,
    isFallback: true,
    fallbackReason
  } as any;
}

// 6. Sequence & Series Fallback Generator
function buildSequenceFallbackQuestion(args: {
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
  const fallbackReason = failureReason || args.failureReason || "Safe Fallback Active";
  const kisiKisi = args.kisiKisi || (args.blueprint ? args.blueprint : "Disajikan permasalahan kontekstual barisan dan deret, peserta didik dapat menentukan suku ke-n atau jumlah n suku pertama dengan tepat.");

  const questionText = `<p>Suatu gedung pertunjukan memiliki barisan kursi penonton. Baris terdepan memuat 14 kursi, baris kedua memuat 18 kursi, baris ketiga memuat 22 kursi, dan seterusnya bertambah secara konstan.</p><p>Jika gedung pertunjukan tersebut memiliki 15 baris kursi, total kapasitas seluruh kursi penonton di dalam gedung tersebut adalah ....</p>`;

  const explanation = `**Langkah Penyelesaian Deret Aritmetika:**
1. Suku pertama ($a$) = 14, beda ($b$) = $18 - 14 = 4$, banyak baris ($n$) = 15.
2. Rumus jumlah $n$ suku pertama ($S_n$):
   $$S_n = \\frac{n}{2} \\times [2a + (n - 1)b]$$
   $$S_{15} = \\frac{15}{2} \\times [2(14) + (14)(4)] = \\frac{15}{2} \\times [28 + 56] = \\frac{15}{2} \\times 84 = 15 \\times 42 = \\mathbf{630\\text{ kursi}}$$`;

  if (qType === "TRUE_FALSE") {
    return {
      id,
      questionType: "TRUE_FALSE",
      questionText: `<p>Suatu gedung pertunjukan memiliki barisan kursi penonton. Baris terdepan memuat 14 kursi, baris kedua memuat 18 kursi, baris ketiga memuat 22 kursi, dan seterusnya bertambah secara konstan (15 baris total). Tentukan nilai kebenaran setiap pernyataan berikut!</p>`,
      options: [],
      correctAnswer: "",
      scoreWeight: 1,
      trueFalseRows: [
        { text: "Beda bertambahnya kursi setiap baris berurutan adalah 4 kursi.", answer: true },
        { text: "Banyak kursi pada baris ke-15 adalah 70 kursi.", answer: true },
        { text: "Total kapasitas seluruh kursi di dalam gedung pertunjukan tersebut adalah 630 kursi.", answer: true }
      ],
      explanation,
      kisiKisi,
      level: levelText,
      category,
      isFallback: true,
      fallbackReason
    } as any;
  }

  const options = ["630 kursi", "580 kursi", "640 kursi", "660 kursi", "720 kursi"];

  return {
    id,
    questionType: qType,
    questionText,
    options: qType === "MULTIPLE_CHOICE" ? options : undefined,
    correctAnswer: qType === "MULTIPLE_CHOICE" ? options[0] : "630 kursi",
    scoreWeight: 1,
    explanation,
    kisiKisi,
    level: levelText,
    category,
    isFallback: true,
    fallbackReason
  } as any;
}

// 7. Trigonometry Fallback Generator
function buildTrigonometryFallbackQuestion(args: {
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
  const fallbackReason = failureReason || args.failureReason || "Safe Fallback Active";
  const kisiKisi = args.kisiKisi || (args.blueprint ? args.blueprint : "Disajikan segitiga dan sudut elevasi kontekstual, peserta didik dapat menerapkan perbandingan trigonometri untuk memecahkan masalah.");

  const trigGeometryTag = `[GEOMETRY:triangle_right:{"bottom":"24 m","left":"h = 8√3 m","hypotenuse":"16√3 m","vertices":"BCA","rightAngleAt":"B","angleC":"30°","showVertices":true}]`;
  const questionText = `<p>Perhatikan sketsa pengukuran berikut:</p>\n<p>${trigGeometryTag}</p>\n<p>Seorang pengamat berdiri sejauh 24 meter dari kaki sebuah menara pemancar (titik B). Dari posisi pengamat (titik C), puncak menara (titik A) terlihat dengan sudut elevasi $30^\\circ$. Jika tinggi mata pengamat dari tanah adalah $1,5\\text{ m}$, tinggi menara pemancar tersebut adalah ....</p>`;

  const explanation = `**Langkah Perhitungan Trigonometri:**
1. Gunakan segitiga siku-siku ABC yang siku-siku di titik B (kaki menara).
2. Perbandingan tangen sudut elevasi di titik C ($30^\\circ$):
   $$\\tan(30^\\circ) = \\frac{\\text{sisi depan (tinggi menara di atas mata)}}{\\text{sisi samping (jarak horizontal)}} = \\frac{h}{24}$$
3. Nilai $\\tan(30^\\circ) = \\frac{1}{3}\\sqrt{3}$.
4. Maka tinggi di atas mata: $h = 24 \\times \\frac{1}{3}\\sqrt{3} = 8\\sqrt{3}\\text{ m}$.
5. Tinggi total menara pemancar dari tanah = $(1,5 + 8\\sqrt{3})\\text{ m}$.`;

  if (qType === "TRUE_FALSE") {
    return {
      id,
      questionType: "TRUE_FALSE",
      questionText: `<p>Perhatikan sketsa pengukuran menara berikut:</p>\n<p>${trigGeometryTag}</p>\n<p>Seorang pengamat berdiri sejauh 24 meter dari kaki menara pemancar (sudut elevasi $30^\\circ$, tinggi mata $1,5\\text{ m}$). Tentukan nilai kebenaran setiap pernyataan berikut!</p>`,
      options: [],
      correctAnswer: "Pernyataan 1: Benar, Pernyataan 2: Benar, Pernyataan 3: Benar",
      scoreWeight: 1,
      trueFalseRows: [
        { text: "Tinggi menara di atas ketinggian mata pengamat dapat dihitung menggunakan perbandingan tangen.", answer: true },
        { text: "Tinggi menara di atas ketinggian mata pengamat adalah $8\\sqrt{3}\\text{ m}$.", answer: true },
        { text: "Tinggi total menara pemancar dari tanah adalah $(1,5 + 8\\sqrt{3})\\text{ m}$.", answer: true }
      ],
      explanation,
      kisiKisi,
      level: levelText,
      category,
      isFallback: true,
      fallbackReason
    } as any;
  }

  const options = ["$(1,5 + 8\\sqrt{3})\\text{ m}$", "$(1,5 + 12\\sqrt{3})\\text{ m}$", "$(1,5 + 24\\sqrt{3})\\text{ m}$", "$8\\sqrt{3}\\text{ m}$", "$12\\sqrt{3}\\text{ m}$"];

  return {
    id,
    questionType: qType,
    questionText,
    options: qType === "MULTIPLE_CHOICE" ? options : undefined,
    correctAnswer: qType === "MULTIPLE_CHOICE" ? options[0] : "$(1,5 + 8\\sqrt{3})\\text{ m}$",
    scoreWeight: 1,
    explanation,
    kisiKisi,
    level: levelText,
    category,
    isFallback: true,
    fallbackReason
  } as any;
}

// 8. Algebra & Systems Fallback Generator
function buildAlgebraFallbackQuestion(args: {
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
  const fallbackReason = failureReason || args.failureReason || "Safe Fallback Active";
  const kisiKisi = args.kisiKisi || (args.blueprint ? args.blueprint : "Disajikan sistem persamaan linear kontekstual, peserta didik dapat menentukan himpunan penyelesaian dan nilai variabel dengan tepat.");

  const questionText = `<p>Di sebuah toko alat tulis, Danu membeli 3 buku tulis dan 2 pensil seharga Rp22.000,00. Di toko yang sama, Dina membeli 2 buku tulis dan 3 pensil seharga Rp18.000,00.</p><p>Jika Mira ingin membeli 4 buku tulis dan 1 pensil, total biaya yang harus dibayar oleh Mira adalah ....</p>`;

  const explanation = `**Langkah Penyelesaian Sistem Persamaan Linear Dua Variabel (SPLDV):**
1. Misalkan harga 1 buku tulis = $x$ dan harga 1 pensil = $y$:
   * $3x + 2y = 22.000$ (Persamaan 1)
   * $2x + 3y = 18.000$ (Persamaan 2)
2. Eliminasi $y$:
   * $(3x + 2y = 22.000) \\times 3 \\Rightarrow 9x + 6y = 66.000$
   * $(2x + 3y = 18.000) \\times 2 \\Rightarrow 4x + 6y = 36.000$
   * Selisih: $5x = 30.000 \\Rightarrow x = 6.000$ (Harga 1 buku).
3. Substitusi $x = 6.000$ ke Persamaan 1:
   * $3(6.000) + 2y = 22.000 \\Rightarrow 18.000 + 2y = 22.000 \\Rightarrow 2y = 4.000 \\Rightarrow y = 2.000$ (Harga 1 pensil).
4. Biaya belanja Mira:
   * $4x + 1y = 4(6.000) + 1(2.000) = 24.000 + 2.000 = \\mathbf{Rp26.000,00}$.`;

  if (qType === "TRUE_FALSE") {
    return {
      id,
      questionType: "TRUE_FALSE",
      questionText: `<p>Di sebuah toko alat tulis, Danu membeli 3 buku dan 2 pensil seharga Rp22.000,00, sedangkan Dina membeli 2 buku dan 3 pensil seharga Rp18.000,00. Tentukan nilai kebenaran setiap pernyataan berikut!</p>`,
      options: [],
      correctAnswer: "",
      scoreWeight: 1,
      trueFalseRows: [
        { text: "Harga 1 buah buku tulis adalah Rp6.000,00.", answer: true },
        { text: "Harga 1 buah pensil adalah Rp2.000,00.", answer: true },
        { text: "Total biaya belanja 4 buku tulis dan 1 pensil adalah Rp26.000,00.", answer: true }
      ],
      explanation,
      kisiKisi,
      level: levelText,
      category,
      isFallback: true,
      fallbackReason
    } as any;
  }

  const options = ["Rp26.000,00", "Rp24.000,00", "Rp28.000,00", "Rp30.000,00", "Rp22.000,00"];

  return {
    id,
    questionType: qType,
    questionText,
    options: qType === "MULTIPLE_CHOICE" ? options : undefined,
    correctAnswer: qType === "MULTIPLE_CHOICE" ? options[0] : "Rp26.000,00",
    scoreWeight: 1,
    explanation,
    kisiKisi,
    level: levelText,
    category,
    isFallback: true,
    fallbackReason
  } as any;
}
