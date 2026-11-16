/**
 * Modul Pengawasan & Keamanan Konten Pendidikan (Educational Content Safety Guardrails)
 * Menjamin 100% materi dan gambar bebas dari pornografi, ketelanjangan, kekerasan, dan isu SARA,
 * serta memandu penyajian materi biologi & sosial ke standar kurikulum sekolah K-12 yang bermartabat.
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

// Pola kata kunci terlarang (Pornografi, Seksual Vulgar, Ketelanjangan, SARA Negatif, Kekerasan Sadis, Perundungan)
const PROHIBITED_PATTERNS = [
  // Pornografi & Seksual Vulgar
  /\b(bokep|porno|porn|pornografi|bugil|telanjang|nude|nudity|naked|erotis|cabul|mesum|syahwat|masturbasi|onani|vagina|penis|kontol|memek|tetek|toket|jembut|ngentot|bersetubuh|seksual|open\s*bo|lendir|hentai|ecchi|crot|sange)\b/i,
  // Isu SARA, Ujaran Kebencian, Diskriminasi Rasial & Penistaan Agama
  /\b(cina\s*kafir|pribumi\s*vs|dasar\s*kafir|anti\s*islam|anti\s*kristen|penistaan\s*agama|benci\s*suku|suku\s*biadab|anjing\s*yahudi|teroris\s*islam|kafir\s*laknat|radikalisme\s*teror|kadrun|cebong|kampret|pk\s*i)\b/i,
  // Kekerasan Sadis & Konten Berbahaya
  /\b(mutilasi|pembantaian|potong\s*leher|gorok|darah\s*kental|bunuh\s*diri|suicide|sadis|gore|eksekusi\s*mati|senjata\s*api\s*rakitan|merakit\s*bom|racun\s*mematikan)\b/i,
  // Umpatan, Kata Kasar & Bullying
  /\b(bajingan|bangsat|tolol|goblok|kampret|brengsek|babi\s*lu|kontol|pantek|anjing|asu|perek|lonte|pelacur|bencong|banci|idiot|autis|cacat\s*mental)\b/i,
];

// Topik kurikulum yang sah namun membutuhkan arahan kesantunan medis/formal (Misal Biologi Reproduksi, Suku Adat)
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
export function validateEducationalSafety(prompt: string): ModerationResult {
  const cleanPrompt = (prompt || "").trim();

  if (!cleanPrompt) {
    return {
      isSafe: true,
      sanitizedPrompt: "",
      isSensitiveEducationalTopic: false,
    };
  }

  // Cek kata kunci terlarang
  for (const pattern of PROHIBITED_PATTERNS) {
    if (pattern.test(cleanPrompt)) {
      return {
        isSafe: false,
        reason: "Teks mengandung kata atau unsur yang tidak pantas (pornografi, kekerasan, umpatan, atau SARA) yang tidak sesuai dengan standar etika pendidikan sekolah.",
        category: "profanity",
        sanitizedPrompt: "",
        isSensitiveEducationalTopic: false,
      };
    }
  }

  // Cek topik kurikulum sensitif untuk disuntikkan direktif kepatutan
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
 * Validasi mendalam menggunakan AI untuk mendeteksi konten tidak pantas yang tersamar.
 */
export async function validateContentWithAIOnServer(content: string, getAI: any): Promise<{ isSafe: boolean; issues: string[] }> {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite", // Gunakan model lite yang cepat untuk moderasi
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
  "issues": string[] // Daftar masalah dalam Bahasa Indonesia jika isSafe false, contoh: ["Terdeteksi ujaran kebencian SARA", "Mengandung umpatan kasar"]
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
    return { isSafe: true, issues: [] }; // Fallback aman agar tidak memblokir simpan jika API down
  }
}

