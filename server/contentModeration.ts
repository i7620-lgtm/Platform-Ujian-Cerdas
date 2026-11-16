/**
 * Modul Pengawasan & Keamanan Konten Pendidikan (Educational Content Safety Guardrails)
 * Menjamin materi bebas dari pornografi vulgar, kekerasan sadis, dan ujaran kebencian SARA,
 * sekaligus akurat secara konteks mata pelajaran (IPA/Biologi, IPS/Sejarah, Agama/PPKn, Fabel).
 */

import { Type } from "@google/genai";

export interface ModerationResult {
  isSafe: boolean;
  reason?: string;
  category?: "pornography" | "hate_sara" | "violence" | "profanity";
  sanitizedPrompt: string;
  isSensitiveEducationalTopic: boolean;
  educationalSafetyDirective?: string;
}

export interface ServerModerationContext {
  subject?: string;
  examType?: string;
  classLevel?: string;
}

/**
 * Menghapus tag HTML, blok SVG/Style/Script, entitas HTML, serta URL media sebelum pemeriksaan teks.
 */
export function extractCleanModerationText(raw: string): string {
  if (!raw || typeof raw !== "string") return "";
  return raw
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg[\s\S]*?>[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/https?:\/\/[^\s"'<>)]+/gi, " ")
    .replace(/data:[^\s"'<>)]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const GLOBAL_SCIENTIFIC_WHITELIST: RegExp[] = [
  /\be(?:scherichia)?[\s._-]*coli\b/gi,
  /\b(?:bakteri|koloni|kuman|uji|indeks|cemaran|infeksi|spesies)\s+coli\b/gi,
  /\b(?:fecal|faecal|total)?\s*(?:coliform|koliform)\b/gi,
  /\b(?:reproduksi|perkembangbiakan|berkembang\s*biak|pembuahan|fertilisasi|penyerbukan|polinasi|siklus|fase|tahap|organ|sel|hormon|ciri(?:[\s-]+ciri)?|kesehatan|edukasi|pendidikan|transmisi|penularan|penyakit(?:\s+menular)?)\s+(?:secara\s+)?seksual\b/gi,
  /\bseksual\s+(?:primer|sekunder|sehat|pada\s+(?:tumbuhan|hewan|manusia|bunga))\b/gi,
  /\b(?:a|bi|homo|hetero|inter)seksual(?:itas)?\b/gi,
  /\bkromosom\s+sex\b/gi,
  /\b(?:laut|selat|daratan|negara|negeri|kerajaan|kekaisaran|dinasti|bangsa|etnis|pedagang|kebudayaan|budaya|keramik|tembok(?:\s+besar)?|republik(?:\s+rakyat)?|perairan|wilayah|kawasan|sejarah|peradaban)\s+cina\b/gi,
  /\bcina\s+(?:selatan|utara|barat|timur|daratan|kuno|modern|perantauan|benteng)\b/gi,
  /\b(?:surah|surat|qs\.?|ayat)\s+al[\s-]*kafirun\b/gi,
  /\bal[\s-]*kafirun\b/gi,
  /\b(?:kaum|orang|golongan|masyarakat|pasukan|pemuka|suku)\s+(?:kafir\s+)?quraisy\b/gi,
  /\bkafir\s+(?:quraisy|zimmi|harbi|mu'ahad|muahad|musta'man)\b/gi,
  /\b(?:aliran|ajaran|paham|sekte|keyakinan)\s+sesat\b/gi,
  /\b(?:hukum|pengertian|definisi|larangan|konsekuensi)\s+murtad\b/gi,
  /\b(?:cacing\s+pita|daging|minyak|lemak|kulit|ternak|kandang|hutan|rusa|guling|liar|hewan|binatang|mamalia|seekor|ekor|berat|haram|najis)\s+babi\b/gi,
  /\bbabi\s+(?:hutan|rusa|ternak|guling|panggang|liar|air|tanah|betina|jantan)\b/gi,
  /\b(?:hewan|binatang|mamalia|anak|suara|gonggongan|indera|penciuman|pelacak|gembala|penjaga|liar|laut|tanah|seekor|ekor|najis)\s+anjing\b/gi,
  /\banjing\s+(?:laut|tanah|pelacak|penjaga|gembala|liar|kampung|hutan|herder|bulldog|pudel|menggonggong|berlari)\b/gi,
  /\b(?:anak|penyandang|spektrum|gangguan|terapi|siswa)\s+autis(?:me)?\b/gi,
  /\bautis\s+(?:spectrum|disorder)\b/gi,
];

function detectSubjectDomains(subject = "", cleanText = "") {
  const s = subject.toLowerCase();
  const t = cleanText.toLowerCase();

  const isScience =
    /\b(ipa|biologi|ipas|sains|kimia|fisika|kesehatan|pjok|penjas|penjaskes|mikrobiologi|ekologi|kedokteran|keperawatan|farmasi|agribisnis|peternakan)\b/i.test(s) ||
    (!s && /\b(bakteri|mikroorganisme|escherichia|ekosistem|fotosintesis|sistem\s+reproduksi|reproduksi\s+manusia|sel\s+sperma|sel\s+telur|ovarium|testis|taenia)\b/i.test(t));

  const isSocialHistory =
    /\b(ips|sejarah|geografi|sosiologi|ekonomi|antropologi|ppkn|pkn|kewarganegaraan|ilmu\s+pengetahuan\s+sosial)\b/i.test(s);

  const isReligionCivics =
    /\b(agama|pai|pabp|budi\s*pekerti|akidah|akhlak|fiqih|fikih|quran|hadis|tarikh|ski|kristen|katolik|hindu|buddha|konghucu|ppkn|pkn)\b/i.test(s);

  const isLanguageOrElementary =
    /\b(bahasa|indonesia|inggris|sastra|literasi|tematik|fabel|dongeng|sd|mi)\b/i.test(s) ||
    /\b(fabel|dongeng|tokoh\s+cerita|cerita\s+rakyat|seekor\s+(?:anjing|babi))\b/i.test(t);

  return { isScience, isSocialHistory, isReligionCivics, isLanguageOrElementary };
}

function buildStrictPhraseRegex(words: string[]): RegExp {
  return new RegExp(`(?<![a-z0-9_-])(${words.join("|")})(?![a-z0-9_-])`, "gi");
}

function maskAllowedTerms(cleanText: string): string {
  let masked = cleanText;
  for (const pattern of GLOBAL_SCIENTIFIC_WHITELIST) {
    masked = masked.replace(pattern, " ");
  }
  return masked.replace(/\s+/g, " ").trim();
}

const ALWAYS_PROHIBITED_PATTERNS: RegExp[] = [
  buildStrictPhraseRegex([
    "bokep", "porno", "porn", "pornografi", "bugil", "telanjang", "nude", "nudity", "naked",
    "erotis", "cabul", "mesum", "syahwat", "masturbasi", "onani", "kontol", "memek", "tetek",
    "toket", "jembut", "ngentot", "ngewe", "entot", "ngocok", "itil", "crot", "sange", "open\\s*bo",
    "lendir", "hentai", "ecchi", "bersetubuh", "fuck", "shit", "bitch", "asshole", "pussy",
    "dick", "cock", "xxx", "pelacur", "lonte", "perek",
  ]),
  buildStrictPhraseRegex([
    "cina\\s*kafir", "dasar\\s*cina", "cina\\s*bangsat", "pribumi\\s*vs", "dasar\\s*kafir",
    "anti\\s*islam", "anti\\s*kristen", "penistaan\\s*agama", "benci\\s*suku", "suku\\s*biadab",
    "anjing\\s*yahudi", "teroris\\s*islam", "kafir\\s*laknat", "radikalisme\\s*teror",
    "kadrun", "cebong", "pk\\s*i", "bajingan", "bangsat", "tolol", "goblok", "kampret",
    "brengsek", "asu", "pantek", "bejad", "biadab", "pukimak", "bencong", "banci",
    "idiot", "cacat\\s*mental", "dasar\\s*anjing", "anjing\\s*(?:lu|lo|kau|kamu|banget)",
    "dasar\\s*babi", "babi\\s*(?:lu|lo|kau|kamu)", "muka\\s*babi", "otak\\s*anjing", "dasar\\s*autis",
  ]),
  buildStrictPhraseRegex([
    "mutilasi", "pembantaian", "potong\\s*leher", "gorok", "darah\\s*kental",
    "bunuh\\s*diri", "suicide", "sadis", "gore", "eksekusi\\s*mati",
    "senjata\\s*api\\s*rakitan", "merakit\\s*bom", "racun\\s*mematikan",
  ]),
];

const CONTEXT_COLI_REGEX = buildStrictPhraseRegex(["coli"]);
const CONTEXT_SEX_BIO_REGEX = buildStrictPhraseRegex(["seksual", "vagina", "penis", "sex"]);
const CONTEXT_SOCIAL_CINA_REGEX = buildStrictPhraseRegex(["cina"]);
const CONTEXT_RELIGION_REGEX = buildStrictPhraseRegex(["kafir", "murtad", "sesat"]);
const CONTEXT_ANIMAL_REGEX = buildStrictPhraseRegex(["anjing", "babi"]);
const CONTEXT_AUTIS_REGEX = buildStrictPhraseRegex(["autis"]);

const EDUCATIONAL_SENSITIVE_PATTERNS = [
  {
    regex: /\b(reproduksi|alat\s*reproduksi|ovarium|testis|rahim|uterus|sel\s*sperma|sel\s*telur|pubertas|organ\s*kelamin)\b/i,
    directive: "Materi ini adalah topik biologi kurikulum sekolah. DILARANG KERAS menampilkan gambar vulgar atau ketelanjangan manusia. WAJIB disajikan dalam bentuk diagram skematis medis formal, berlabel bagian internal sel/organ secara ilmiah buku pelajaran kedokteran/biologi sekolah, berlatar putih rapi.",
  },
  {
    regex: /\b(suku|adat|pakaian\s*adat|rumah\s*adat|tradisi|upacara\s*adat|budaya\s*daerah|papua|asmat|dayak|toraja|bali|jawa|batak)\b/i,
    directive: "Materi keragaman suku dan budaya Indonesia wajib disajikan dengan penuh penghormatan, sopan, berpakaian adat lengkap dan bermartabat, mencerminkan nilai Bhinneka Tunggal Ika dan persatuan bangsa tanpa unsur peyoratif atau stereotip negatif.",
  },
  {
    regex: /\b(agama|tempat\s*ibadah|masjid|gereja|pura|vihara|klenteng|hari\s*raya)\b/i,
    directive: "Materi keagamaan disajikan dalam bentuk arsitektur tempat ibadah atau infografis toleransi dan kerukunan beragama yang harmonis, damai, dan saling menghargai.",
  },
];

/**
 * Memvalidasi apakah prompt aman dan sesuai standar etika pendidikan K-12.
 */
export function validateEducationalSafety(
  prompt: string,
  context?: ServerModerationContext
): ModerationResult {
  const cleanPrompt = extractCleanModerationText(prompt);

  if (!cleanPrompt) {
    return {
      isSafe: true,
      sanitizedPrompt: "",
      isSensitiveEducationalTopic: false,
    };
  }

  const check = moderateExamContentOnServer(cleanPrompt, context);
  if (!check.isSafe) {
    return {
      isSafe: false,
      reason: "Teks mengandung kata atau unsur yang tidak pantas (pornografi, kekerasan, umpatan, atau SARA) yang tidak sesuai dengan standar etika pendidikan sekolah.",
      category: "profanity",
      sanitizedPrompt: "",
      isSensitiveEducationalTopic: false,
    };
  }

  let educationalSafetyDirective = "";
  let isSensitiveEducationalTopic = false;

  for (const item of EDUCATIONAL_SENSITIVE_PATTERNS) {
    if (item.regex.test(cleanPrompt)) {
      isSensitiveEducationalTopic = true;
      educationalSafetyDirective += " " + item.directive;
    }
  }

  return {
    isSafe: true,
    sanitizedPrompt: cleanPrompt,
    isSensitiveEducationalTopic,
    educationalSafetyDirective: educationalSafetyDirective.trim(),
  };
}

/**
 * Validasi konten soal ujian di sisi server berbasis aturan konteks mata pelajaran (tanpa panggilan AI).
 * Menjamin istilah ilmiah (e-coli, reproduksi seksual), sejarah (Laut Cina Selatan), agama (kaum Quraisy),
 * dan hewan pada soal IPA/fabel tidak terblokir keliru.
 */
export function moderateExamContentOnServer(
  content: string,
  context?: ServerModerationContext
): { isSafe: boolean; issues: string[] } {
  const cleanText = extractCleanModerationText(content);
  if (!cleanText) {
    return { isSafe: true, issues: [] };
  }

  const maskedText = maskAllowedTerms(cleanText);
  const { isScience, isSocialHistory, isReligionCivics, isLanguageOrElementary } = detectSubjectDomains(
    context?.subject || "",
    cleanText
  );

  const matchedWords = new Set<string>();

  for (const pattern of ALWAYS_PROHIBITED_PATTERNS) {
    const m = maskedText.match(pattern);
    if (m) m.forEach((w) => matchedWords.add(w.toLowerCase()));
  }

  if (!isScience) {
    const coliMatch = maskedText.match(CONTEXT_COLI_REGEX);
    if (coliMatch) coliMatch.forEach((w) => matchedWords.add(w.toLowerCase()));

    const sexBioMatch = maskedText.match(CONTEXT_SEX_BIO_REGEX);
    if (sexBioMatch) sexBioMatch.forEach((w) => matchedWords.add(w.toLowerCase()));
  }

  if (!isSocialHistory && !isLanguageOrElementary) {
    const cinaMatch = maskedText.match(CONTEXT_SOCIAL_CINA_REGEX);
    if (cinaMatch) cinaMatch.forEach((w) => matchedWords.add(w.toLowerCase()));
  }

  if (!isReligionCivics && !isSocialHistory) {
    const religionMatch = maskedText.match(CONTEXT_RELIGION_REGEX);
    if (religionMatch) religionMatch.forEach((w) => matchedWords.add(w.toLowerCase()));
  }

  if (!isScience && !isLanguageOrElementary && !isReligionCivics) {
    const animalMatch = maskedText.match(CONTEXT_ANIMAL_REGEX);
    if (animalMatch) animalMatch.forEach((w) => matchedWords.add(w.toLowerCase()));
  }

  if (!isScience) {
    const autisMatch = maskedText.match(CONTEXT_AUTIS_REGEX);
    if (autisMatch) autisMatch.forEach((w) => matchedWords.add(w.toLowerCase()));
  }

  if (matchedWords.size > 0) {
    return {
      isSafe: false,
      issues: [`Kata-kata kasar/tidak pantas terdeteksi: ${Array.from(matchedWords).join(", ")}`],
    };
  }

  return { isSafe: true, issues: [] };
}

/**
 * Validasi mendalam menggunakan AI untuk mendeteksi konten tidak pantas yang tersamar.
 */
export async function validateContentWithAIOnServer(content: string, getAI: any): Promise<{ isSafe: boolean; issues: string[] }> {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: `Analisis teks berikut untuk konten tidak pantas dalam konteks pendidikan sekolah (K-12) di Indonesia. 
Kategori pelanggaran:
1. SARA: Ujaran kebencian, diskriminasi suku/agama/ras, penistaan simbol agama/negara.
2. Pornografi: Deskripsi seksual eksplisit, konten vulgar, promosi asusila.
3. Bullying/Cyberbullying: Penghinaan pribadi, pelecehan, ancaman, perundungan siswa/guru.
4. Kekerasan: Konten sadis, instruksi pembuatan senjata/bahan berbahaya, promosi radikalisme.

Teks:
---
${content.substring(0, 8000)}
---

Kembalikan hasil dalam format JSON:
{
  "isSafe": boolean,
  "issues": string[]
}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isSafe: { type: Type.BOOLEAN },
            issues: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["isSafe", "issues"],
        },
      },
    });

    const result = JSON.parse(response.text || '{"isSafe": true, "issues": []}');
    return result;
  } catch (error) {
    console.error("AI Moderation Server Error:", error);
    return { isSafe: true, issues: [] };
  }
}
