import type { Exam } from "../types";

/**
 * Custom error class for content moderation failures.
 */
export class ModerationError extends Error {
  public issues: string[];
  constructor(issues: string[]) {
    super(`Konten tidak pantas terdeteksi: ${issues.join(", ")}`);
    this.name = "ModerationError";
    this.issues = issues;
  }
}

export interface ModerationContextOptions {
  subject?: string;
  examType?: string;
  classLevel?: string;
}

/**
 * Menghapus tag HTML, blok SVG/Style/Script, entitas HTML, serta URL media/tautan
 * sebelum teks dievaluasi oleh mesin moderasi.
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

// Pola istilah kurikulum & ilmiah sah yang wajib diamankan sebelum deteksi kata terlarang
const GLOBAL_SCIENTIFIC_WHITELIST: RegExp[] = [
  // Biologi / Mikrobiologi / IPA (mencegah 'e-coli' / 'E. coli' terbaca 'coli')
  /\be(?:scherichia)?[\s._-]*coli\b/gi,
  /\b(?:bakteri|koloni|kuman|uji|indeks|cemaran|infeksi|spesies)\s+coli\b/gi,
  /\b(?:fecal|faecal|total)?\s*(?:coliform|koliform)\b/gi,
  // Reproduksi & biologi kurikulum
  /\b(?:reproduksi|perkembangbiakan|berkembang\s*biak|pembuahan|fertilisasi|penyerbukan|polinasi|siklus|fase|tahap|organ|sel|hormon|ciri(?:[\s-]+ciri)?|kesehatan|edukasi|pendidikan|transmisi|penularan|penyakit(?:\s+menular)?)\s+(?:secara\s+)?seksual\b/gi,
  /\bseksual\s+(?:primer|sekunder|sehat|pada\s+(?:tumbuhan|hewan|manusia|bunga))\b/gi,
  /\b(?:a|bi|homo|hetero|inter)seksual(?:itas)?\b/gi,
  /\bkromosom\s+sex\b/gi,
  // Geografi / Sejarah / IPS (netral geopolitik & sejarah)
  /\b(?:laut|selat|daratan|negara|negeri|kerajaan|kekaisaran|dinasti|bangsa|etnis|pedagang|kebudayaan|budaya|keramik|tembok(?:\s+besar)?|republik(?:\s+rakyat)?|perairan|wilayah|kawasan|sejarah|peradaban)\s+cina\b/gi,
  /\bcina\s+(?:selatan|utara|barat|timur|daratan|kuno|modern|perantauan|benteng)\b/gi,
  // Pendidikan Agama / PAI / PPKn
  /\b(?:surah|surat|qs\.?|ayat)\s+al[\s-]*kafirun\b/gi,
  /\bal[\s-]*kafirun\b/gi,
  /\b(?:kaum|orang|golongan|masyarakat|pasukan|pemuka|suku)\s+(?:kafir\s+)?quraisy\b/gi,
  /\bkafir\s+(?:quraisy|zimmi|harbi|mu'ahad|muahad|musta'man)\b/gi,
  /\b(?:aliran|ajaran|paham|sekte|keyakinan)\s+sesat\b/gi,
  /\b(?:hukum|pengertian|definisi|larangan|konsekuensi)\s+murtad\b/gi,
  // Hewan pada IPA, soal cerita, fabel, dan konteks diet/fikih netral
  /\b(?:cacing\s+pita|daging|minyak|lemak|kulit|ternak|kandang|hutan|rusa|guling|liar|hewan|binatang|mamalia|seekor|ekor|berat|haram|najis)\s+babi\b/gi,
  /\bbabi\s+(?:hutan|rusa|ternak|guling|panggang|liar|air|tanah|betina|jantan)\b/gi,
  /\b(?:hewan|binatang|mamalia|anak|suara|gonggongan|indera|penciuman|pelacak|gembala|penjaga|liar|laut|tanah|seekor|ekor|najis)\s+anjing\b/gi,
  /\banjing\s+(?:laut|tanah|pelacak|penjaga|gembala|liar|kampung|hutan|herder|bulldog|pudel|menggonggong|berlari)\b/gi,
  // Medis & pendidikan inklusi
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
  // Menggunakan lookaround batas kata yang menjaga tanda hubung `-` agar kata majemuk tidak terpecah
  return new RegExp(`(?<![a-z0-9_-])(${words.join("|")})(?![a-z0-9_-])`, "gi");
}

const ALWAYS_PROHIBITED_PATTERNS: RegExp[] = [
  // Pornografi eksplisit & slang seksual vulgar
  buildStrictPhraseRegex([
    "bokep", "porno", "porn", "pornografi", "bugil", "telanjang", "nude", "nudity", "naked",
    "erotis", "cabul", "mesum", "syahwat", "masturbasi", "onani", "kontol", "memek", "tetek",
    "toket", "jembut", "ngentot", "ngewe", "entot", "ngocok", "itil", "crot", "sange", "open\\s*bo",
    "lendir", "hentai", "ecchi", "bersetubuh", "fuck", "shit", "bitch", "asshole", "pussy",
    "dick", "cock", "xxx", "pelacur", "lonte", "perek",
  ]),
  // Ujaran kebencian SARA, penghinaan personal, & kata kasar tak bermakna ganda
  buildStrictPhraseRegex([
    "cina\\s*kafir", "dasar\\s*cina", "cina\\s*bangsat", "pribumi\\s*vs", "dasar\\s*kafir",
    "anti\\s*islam", "anti\\s*kristen", "penistaan\\s*agama", "benci\\s*suku", "suku\\s*biadab",
    "anjing\\s*yahudi", "teroris\\s*islam", "kafir\\s*laknat", "radikalisme\\s*teror",
    "kadrun", "cebong", "pk\\s*i", "bajingan", "bangsat", "tolol", "goblok", "kampret",
    "brengsek", "asu", "pantek", "bejad", "biadab", "pukimak", "bencong", "banci",
    "idiot", "cacat\\s*mental", "dasar\\s*anjing", "anjing\\s*(?:lu|lo|kau|kamu|banget)",
    "dasar\\s*babi", "babi\\s*(?:lu|lo|kau|kamu)", "muka\\s*babi", "otak\\s*anjing", "dasar\\s*autis",
  ]),
  // Kekerasan sadis & berbahaya
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

/**
 * ContentModerator provides multi-layer context-aware content validation:
 * 1. HTML/URL pre-cleaning & scientific/curricular phrase whitelisting.
 * 2. Subject-aware rule validation on client & server without AI calls.
 */
export class ContentModerator {
  private static maskAllowedTerms(cleanText: string): string {
    let masked = cleanText;
    for (const pattern of GLOBAL_SCIENTIFIC_WHITELIST) {
      masked = masked.replace(pattern, " ");
    }
    return masked.replace(/\s+/g, " ").trim();
  }

  /**
   * Aggregates all text fields from an exam into clean text (without HTML tags/URLs).
   */
  private static aggregateTexts(exam: Exam): string {
    const texts: string[] = [];

    if (exam.config?.subject) texts.push(`Judul: ${extractCleanModerationText(exam.config.subject)}`);
    if (exam.config?.description) texts.push(`Deskripsi: ${extractCleanModerationText(exam.config.description)}`);
    if (exam.config?.examType) texts.push(`Jenis: ${extractCleanModerationText(exam.config.examType)}`);
    if (exam.config?.classLevel) texts.push(`Level: ${extractCleanModerationText(exam.config.classLevel)}`);

    (exam.questions || []).forEach((q, i) => {
      if (q.questionText) texts.push(`Soal ${i + 1}: ${extractCleanModerationText(q.questionText)}`);
      if (q.options) q.options.forEach((opt, j) => texts.push(`Opsi ${j + 1}: ${extractCleanModerationText(opt)}`));
      if (q.hint) texts.push(`Petunjuk: ${extractCleanModerationText(q.hint)}`);
      if (q.explanation) texts.push(`Pembahasan: ${extractCleanModerationText(q.explanation)}`);
      if (q.solutionSteps) texts.push(`Langkah: ${extractCleanModerationText(q.solutionSteps)}`);
      if (q.category) texts.push(`Materi: ${extractCleanModerationText(q.category)}`);
      if (q.level) texts.push(`Level Soal: ${extractCleanModerationText(q.level)}`);
      if (q.kisiKisi) texts.push(`Kisi-kisi: ${extractCleanModerationText(q.kisiKisi)}`);
      if (q.trueFalseRows) q.trueFalseRows.forEach((row) => texts.push(`Pernyataan: ${extractCleanModerationText(row.text)}`));
      if (q.matchingPairs) {
        q.matchingPairs.forEach((p) =>
          texts.push(`Pasangan: ${extractCleanModerationText(p.left)} - ${extractCleanModerationText(p.right)}`)
        );
      }
    });

    return texts.filter(Boolean).join("\n\n");
  }

  /**
   * Performs fast context-aware & hyphen-safe local validation.
   */
  public static validateLocally(content: string, context?: ModerationContextOptions): string[] {
    const cleanText = extractCleanModerationText(content);
    if (!cleanText) return [];

    const maskedText = this.maskAllowedTerms(cleanText);
    const { isScience, isSocialHistory, isReligionCivics, isLanguageOrElementary } = detectSubjectDomains(
      context?.subject || "",
      cleanText
    );

    const matchedWords = new Set<string>();

    // 1. Selalu blokir pornografi eksplisit, ujaran kebencian, umpatan kasar, & kekerasan sadis
    for (const pattern of ALWAYS_PROHIBITED_PATTERNS) {
      const m = maskedText.match(pattern);
      if (m) m.forEach((w) => matchedWords.add(w.toLowerCase()));
    }

    // 2. Cek kata tergantung konteks mata pelajaran
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
      return [`Kata-kata kasar/tidak pantas terdeteksi: ${Array.from(matchedWords).join(", ")}`];
    }

    return [];
  }

  /**
   * Performs server-side rule validation with subject context (no AI calls).
   */
  private static async validateOnServer(
    content: string,
    context?: ModerationContextOptions
  ): Promise<string[]> {
    try {
      const response = await fetch("/api/moderate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          subject: context?.subject || "",
          examType: context?.examType || "",
          classLevel: context?.classLevel || "",
        }),
      });
      if (!response.ok) {
        return [];
      }
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        return [];
      }
      const result = await response.json();
      return result && result.isSafe === false && Array.isArray(result.issues)
        ? result.issues
        : [];
    } catch {
      return [];
    }
  }

  /**
   * Main entry point for exam content moderation.
   */
  public static async validateExamContent(exam: Exam): Promise<{ isValid: boolean; issues: string[] }> {
    const fullContent = this.aggregateTexts(exam);
    const context: ModerationContextOptions = {
      subject: exam.config?.subject || "",
      examType: exam.config?.examType || "",
      classLevel: exam.config?.classLevel || "",
    };

    // 1. Local context-aware check (Fast)
    const localIssues = this.validateLocally(fullContent, context);
    if (localIssues.length > 0) {
      return { isValid: false, issues: localIssues };
    }

    // 2. Server-side context-aware rule validation
    const serverIssues = await this.validateOnServer(fullContent, context);
    if (serverIssues.length > 0) {
      return { isValid: false, issues: serverIssues };
    }

    return { isValid: true, issues: [] };
  }
}

/**
 * Compatibility export for svgGeneratorService and others.
 * Validates whether a text prompt is safe for K-12 educational context.
 */
export function validateEducationalSafety(
  text: string,
  context?: ModerationContextOptions
): { isSafe: boolean; reason?: string } {
  const issues = ContentModerator.validateLocally(text, context);
  if (issues.length > 0) {
    return { isSafe: false, reason: issues[0] };
  }
  return { isSafe: true };
}
