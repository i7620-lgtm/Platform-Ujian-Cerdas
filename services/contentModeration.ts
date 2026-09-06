/**
 * Modul Pengawasan & Keamanan Konten Pendidikan (Educational Content Safety Guardrails)
 * Sisi Klien: Menjamin seluruh pembuatan gambar AI 100% aman, bebas dari pornografi, ketelanjangan, dan isu SARA.
 */

export interface ModerationResult {
  isSafe: boolean;
  reason?: string;
  category?: "pornography" | "hate_sara" | "violence" | "profanity";
  sanitizedPrompt: string;
  isSensitiveEducationalTopic: boolean;
  educationalSafetyDirective?: string;
}

const PROHIBITED_PATTERNS = [
  // Pornografi, Seksual Vulgar, Ketelanjangan
  /\b(bokep|porno|porn|pornografi|bugil|telanjang|nude|nudity|naked|erotis|cabul|mesum|syahwat|masturbasi|onani|vagina|penis|kontol|memek|tetek|toket|jembut|ngentot|bersetubuh|seksual|open\s*bo|lendir|hentai|ecchi)\b/i,
  // Isu SARA, Ujaran Kebencian, Diskriminasi Rasial & Penistaan Agama
  /\b(cina\s*kafir|pribumi\s*vs|dasar\s*kafir|anti\s*islam|anti\s*kristen|penistaan\s*agama|benci\s*suku|suku\s*biadab|anjing\s*yahudi|teroris\s*islam|kafir\s*laknat|radikalisme\s*teror)\b/i,
  // Kekerasan Sadis & Konten Berbahaya
  /\b(mutilasi|pembantaian|potong\s*leher|gorok|darah\s*kental|bunuh\s*diri|suicide|sadis|gore|eksekusi\s*mati|senjata\s*api\s*rakitan|merakit\s*bom)\b/i,
  // Umpatan Kasar
  /\b(bajingan|bangsat|tolol|goblok|kampret|brengsek|babi\s*lu|pantek)\b/i,
];

const EDUCATIONAL_SENSITIVE_PATTERNS = [
  {
    regex: /\b(reproduksi|alat\s*reproduksi|ovarium|testis|rahim|uterus|sel\s*sperma|sel\s*telur|pubertas|organ\s*kelamin)\b/i,
    directive: "Materi ini adalah topik biologi kurikulum sekolah. DILARANG KERAS menampilkan gambar vulgar atau ketelanjangan manusia. WAJIB disajikan dalam bentuk diagram skematis medis formal berlabel ilmiah buku pelajaran sekolah.",
  },
  {
    regex: /\b(suku|adat|pakaian\s*adat|rumah\s*adat|tradisi|upacara\s*adat|budaya\s*daerah|papua|asmat|dayak|toraja|bali|jawa|batak)\b/i,
    directive: "Materi keragaman suku dan budaya Indonesia wajib disajikan dengan penuh penghormatan, sopan, berpakaian adat lengkap, mencerminkan nilai Bhinneka Tunggal Ika.",
  },
  {
    regex: /\b(agama|tempat\s*ibadah|masjid|gereja|pura|vihara|klenteng|hari\s*raya)\b/i,
    directive: "Materi keagamaan disajikan dalam bentuk arsitektur tempat ibadah atau infografis toleransi dan kerukunan beragama yang harmonis dan damai.",
  },
];

export function validateEducationalSafety(prompt: string): ModerationResult {
  const cleanPrompt = (prompt || "").trim();

  if (!cleanPrompt) {
    return {
      isSafe: true,
      sanitizedPrompt: "",
      isSensitiveEducationalTopic: false,
    };
  }

  for (const pattern of PROHIBITED_PATTERNS) {
    if (pattern.test(cleanPrompt)) {
      return {
        isSafe: false,
        reason: "Permintaan mengandung kata atau materi yang tidak memenuhi standar etika pendidikan sekolah (bebas dari pornografi, ketelanjangan, kekerasan, dan SARA). Sistem Ujian Cerdas mewajibkan konten 100% aman dan berfokus pada materi pelajaran sekolah.",
        category: "pornography",
        sanitizedPrompt: "",
        isSensitiveEducationalTopic: false,
      };
    }
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
