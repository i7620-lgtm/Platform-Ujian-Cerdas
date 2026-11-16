// Self-contained Vercel ESM Serverless Handler (Zero relative .ts imports)

interface ModerationContext {
  subject?: string;
  examType?: string;
  classLevel?: string;
}

function extractCleanModerationText(raw: string): string {
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
  // Fisiologi & Anatomi (selaput lendir, kelenjar lendir, dsb)
  /\b(?:selaput|kelenjar|lapisan|cairan|produksi|pengeluaran|sekresi|saluran|membran|dinding)\s+lendir\b/gi,
  /\blendir\s+(?:lambung|pernapasan|hidung|usus|tenggorokan|bekicot|siput|katak|ikan|kulit|leher\s+rahim)\b/gi,
  /\b(?:biji|mata)\s+telanjang\b/gi,
  /\bdarah\s+kental\b/gi,
  // Matematika, angka Romawi, variabel aljabar
  /\b(?:angka|bilangan|nomor|bab|tingkat|kelas|abad)\s+[ivxlcdm]+\b/gi,
  /\b(?:romawi\s+dari\s+\d+|tiga\s+puluh\s+dalam\s+romawi)\b/gi,
  /\b(?:nilai|variabel|persamaan|fungsi|koordinat)\s+[a-z]{1,4}\b/gi,
  /\bxxx\b/gi,
  /\blendir\b/gi,
];

function detectSubjectDomains(subject = "", cleanText = "") {
  const s = subject.toLowerCase();
  const t = cleanText.toLowerCase();

  const isScience =
    /\b(ipa|biologi|ipas|sains|kimia|fisika|kesehatan|pjok|penjas|penjaskes|mikrobiologi|ekologi|kedokteran|keperawatan|farmasi|agribisnis|peternakan)\b/i.test(s) ||
    (!s && /\b(bakteri|mikroorganisme|escherichia|ekosistem|fotosintesis|sistem\s+reproduksi|reproduksi\s+manusia|sel\s+sperma|sel\s+telur|ovarium|testis|taenia|lendir)\b/i.test(t));

  const isMath =
    /\b(matematika|mtk|math|aljabar|aritmetika|geometri|kalkulus|trigonometri|statistik)\b/i.test(s) ||
    /\b(angka\s+romawi|bilangan\s+romawi|persamaan|koordinat|segitiga|persegi|lingkaran|variabel)\b/i.test(t);

  const isSocialHistory =
    /\b(ips|sejarah|geografi|sosiologi|ekonomi|antropologi|ppkn|pkn|kewarganegaraan|ilmu\s+pengetahuan\s+sosial)\b/i.test(s);

  const isReligionCivics =
    /\b(agama|pai|pabp|budi\s*pekerti|akidah|akhlak|fiqih|fikih|quran|hadis|tarikh|ski|kristen|katolik|hindu|buddha|konghucu|ppkn|pkn)\b/i.test(s);

  const isLanguageOrElementary =
    /\b(bahasa|indonesia|inggris|sastra|literasi|tematik|fabel|dongeng|sd|mi)\b/i.test(s) ||
    /\b(fabel|dongeng|tokoh\s+cerita|cerita\s+rakyat|seekor\s+(?:anjing|babi))\b/i.test(t);

  return { isScience, isMath, isSocialHistory, isReligionCivics, isLanguageOrElementary };
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
  // Pornografi eksplisit & slang seksual vulgar ekstrem (HANYA frasa ekstrem nyata)
  buildStrictPhraseRegex([
    "bokep", "porno", "porn", "pornografi", "foto\\s*bugil", "video\\s*bugil", "pose\\s*bugil",
    "foto\\s*telanjang", "video\\s*telanjang", "nude", "nudity", "naked",
    "erotis", "cabul", "mesum", "syahwat", "masturbasi", "onani", "kontol", "memek", "tetek",
    "toket", "jembut", "ngentot", "ngewe", "entot", "ngocok", "itil", "crot", "sange", "open\\s*bo",
    "hentai", "ecchi", "fuck", "shit", "bitch", "asshole", "pussy",
    "pelacur", "lonte", "perek",
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
    "mutilasi", "pembantaian", "potong\\s*leher", "gorok",
    "bunuh\\s*diri", "suicide", "sadis", "gore", "eksekusi\\s*mati",
    "senjata\\s*api\\s*rakitan", "merakit\\s*bom", "racun\\s*mematikan",
  ]),
];

const CONTEXT_COLI_REGEX = buildStrictPhraseRegex(["coli"]);
const CONTEXT_SEX_BIO_REGEX = buildStrictPhraseRegex(["seksual", "vagina", "penis", "sex", "bersetubuh"]);
const CONTEXT_SOCIAL_CINA_REGEX = buildStrictPhraseRegex(["cina"]);
const CONTEXT_RELIGION_REGEX = buildStrictPhraseRegex(["kafir", "murtad", "sesat"]);
const CONTEXT_ANIMAL_REGEX = buildStrictPhraseRegex(["anjing", "babi"]);
const CONTEXT_AUTIS_REGEX = buildStrictPhraseRegex(["autis"]);

function moderateExamContentOnServer(
  content: string,
  context?: ModerationContext
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

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      isSafe: true,
      issues: [],
      error: "Method not allowed",
    });
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const content = body && typeof body.content === "string" ? body.content : "";
    if (!content) {
      return res.status(200).json({ isSafe: true, issues: [] });
    }

    const context: ModerationContext = {
      subject: body && typeof body.subject === "string" ? body.subject : "",
      examType: body && typeof body.examType === "string" ? body.examType : "",
      classLevel: body && typeof body.classLevel === "string" ? body.classLevel : "",
    };

    const result = moderateExamContentOnServer(content, context);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error("Server Content Moderation Error:", error?.message || error);
    return res.status(200).json({ isSafe: true, issues: [] });
  }
}
