// Pola kata kunci terlarang (Pornografi, Seksual Vulgar, Ketelanjangan, SARA Negatif, Kekerasan Sadis, Perundungan)
const PROHIBITED_PATTERNS = [
  /\b(bokep|porno|porn|pornografi|bugil|telanjang|nude|nudity|naked|erotis|cabul|mesum|syahwat|masturbasi|onani|vagina|penis|kontol|memek|tetek|toket|jembut|ngentot|bersetubuh|seksual|open\s*bo|lendir|hentai|ecchi|crot|sange)\b/i,
  /\b(cina\s*kafir|pribumi\s*vs|dasar\s*kafir|anti\s*islam|anti\s*kristen|penistaan\s*agama|benci\s*suku|suku\s*biadab|anjing\s*yahudi|teroris\s*islam|kafir\s*laknat|radikalisme\s*teror|kadrun|cebong|kampret|pk\s*i)\b/i,
  /\b(mutilasi|pembantaian|potong\s*leher|gorok|darah\s*kental|bunuh\s*diri|suicide|sadis|gore|eksekusi\s*mati|senjata\s*api\s*rakitan|merakit\s*bom|racun\s*mematikan)\b/i,
  /\b(bajingan|bangsat|tolol|goblok|kampret|brengsek|babi\s*lu|kontol|pantek|anjing|asu|perek|lonte|pelacur|bencong|banci|idiot|autis|cacat\s*mental)\b/i,
];

const SERVER_BAD_WORDS_REGEX = new RegExp(
  "\\b(" +
    [
      "anjing", "babi", "bangsat", "tolol", "goblok", "asu", "kontol", "memek", "jembut", "pelacur", "lonte",
      "perek", "bejad", "biadab", "pukimak", "ngewe", "entot", "ngocok", "coli", "itil", "ngentot", "crot", "sange",
      "cina", "kafir", "murtad", "sesat", "kadrun", "cebong", "kampret", "bencong", "banci", "idiot", "autis",
      "fuck", "shit", "bitch", "asshole", "pussy", "dick", "cock", "porn", "xxx", "sex",
    ].join("|") +
    ")\\b",
  "gi"
);

function moderateExamContentOnServer(content: string): { isSafe: boolean; issues: string[] } {
  const cleanContent = (content || "").trim();
  if (!cleanContent) {
    return { isSafe: true, issues: [] };
  }

  const issues: string[] = [];

  for (const pattern of PROHIBITED_PATTERNS) {
    const match = cleanContent.match(pattern);
    if (match && match.length > 0) {
      issues.push(
        `Konten mengandung unsur tidak pantas atau melanggar etika pendidikan K-12 (${match[0].trim()}).`
      );
      break;
    }
  }

  const badWordMatches = cleanContent.match(SERVER_BAD_WORDS_REGEX);
  if (badWordMatches && badWordMatches.length > 0) {
    const uniqueMatches = Array.from(new Set(badWordMatches.map((m) => m.toLowerCase())));
    issues.push(`Kata-kata kasar/tidak pantas terdeteksi: ${uniqueMatches.join(", ")}`);
  }

  return {
    isSafe: issues.length === 0,
    issues,
  };
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

    const result = moderateExamContentOnServer(content);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error("Server Content Moderation Error:", error?.message || error);
    return res.status(200).json({ isSafe: true, issues: [] });
  }
}
