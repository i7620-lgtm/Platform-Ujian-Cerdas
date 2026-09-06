/**
 * Service for generating educational SVG vector graphics and rasterizing them to PNG.
 */
import { generateContextualEducationalSvg } from "./smartSvgTemplates";
import { validateEducationalSafety } from "./contentModeration";

export async function generateEducationalSvg(prompt: string, style?: string): Promise<string> {
  const trimmed = prompt.trim();
  if (!trimmed) {
    throw new Error("Deskripsi gambar tidak boleh kosong.");
  }

  // Validasi Etika & Kepatutan Konten Pendidikan K-12
  const safety = validateEducationalSafety(trimmed);
  if (!safety.isSafe) {
    throw new Error(safety.reason || "Permintaan tidak sesuai dengan standar etika pendidikan sekolah.");
  }

  // Attempt server API first
  try {
    const response = await fetch("/api/generate-svg", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: trimmed, style }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.svg) {
        return cleanSvgString(data.svg);
      } else if (data.error) {
        throw new Error(data.error);
      }
    } else {
      const errData = await response.json().catch(() => null);
      if (errData?.error) {
        throw new Error(errData.error);
      }
    }
  } catch (err: any) {
    if (err.message && err.message.includes("etika pendidikan")) {
      throw err;
    }
    console.warn("Server API /api/generate-svg failed, attempting fallback:", err);
  }

  // Fallback to client-side GoogleGenAI if available (via window or environment)
  try {
    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (import.meta as any).env?.GEMINI_API_KEY;
    if (apiKey) {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });
      const systemInstruction = `Anda adalah Ahli Desain Grafis Vektor dan Ilustrator Edukasi SVG profesional kurikulum sekolah Indonesia (K-12).
Tugas Anda adalah membuat kode SVG murni (<svg ...> ... </svg>) berkualitas tinggi, modern, sangat rapi, proporsional, dan 100% ramah anak.

MANDAT KESELAMATAN & ETIKA PENDIDIKAN K-12 (ZERO TOLERANCE):
- DILARANG KERAS memuat pornografi, ketelanjangan (nudity), pakaian tidak senonoh, atau erotisme.
- DILARANG KERAS memuat isu SARA, diskriminasi, ujaran kebencian, bias suku/agama/ras, atau kekerasan.
- Materi biologi/anatomi reproduksi wajib disajikan secara skematis medis formal buku pelajaran sekolah (diagram organ internal berlabel warna netral, tanpa tubuh manusia telanjang).
- Materi budaya/suku wajib berbusana adat sopan dan menjunjung Bhinneka Tunggal Ika.

PANDUAN TATA LETAK & KEJELASAN TEKS SVG (MENCEGAH TEKS BERTUMPUK / TERLEWAT):
- viewBox="0 0 850 560" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"
- Baris pertama wajib: <rect width="100%" height="100%" fill="#ffffff" rx="16" />
- Batas konten aman: koordinat X antara 40 dan 810, koordinat Y antara 30 dan 530.
- Header atas (y=25-85):
  * Judul Utama: 1 baris ringkas, jelas (maksimal 35 karakter), font-size="20-22" font-weight="800", text-anchor="middle" di x="425" y="55".
  * Subjudul: 1 baris, font-size="12-13", text-anchor="middle" di x="425" y="78".
- Ruang diagram utama lapang (y=105 sampai y=520):
  * Berikan ruang vertikal luas (415px) agar diagram tidak berdesakan.
  * SEMUA LABEL HARUS SINGKAT & PADAT (1 sampai 4 kata saja). Jangan membuat paragraf panjang di dalam diagram!
  * Jarak vertikal antar baris teks minimal 28-30px agar tidak pernah bertumpuk.
  * Label pada garis/panah: Tempatkan di atas background badge/pill (<rect rx="4" ...>) atau beri jarak aman agar tidak menimpa garis.
  * Gunakan text-anchor="middle" dan pasang koordinat x tepat di tengah kartu/bentuk.
  * Wajib gunakan entitas XML &amp; jika menggunakan simbol '&' (dilarang karakter '&' mentah).
  * Gunakan font-family="system-ui, -apple-system, sans-serif".
  * Bahasa Indonesia baku yang jelas, ejaan EYD tepat.`;

      const resp = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: trimmed,
        config: { systemInstruction, temperature: 0.2 },
      });

      if (resp.text) {
        return cleanSvgString(resp.text);
      }
    }
  } catch (clientErr: any) {
    if (clientErr.message && clientErr.message.includes("etika pendidikan")) {
      throw clientErr;
    }
    console.log("Client-side fallback note:", clientErr);
  }

  // Guaranteed Safe Fallback: Berikan diagram SVG edukatif kurikulum offline yang presisi
  return cleanSvgString(generateContextualEducationalSvg(trimmed, style));
}

/**
 * Memastikan seluruh entitas XML dalam teks SVG valid (mencegah error XML parser akibat simbol & atau < yang tidak di-escape).
 */
export function fixSvgXmlEntities(svg: string): string {
  if (!svg) return "";
  // Ganti simbol '&' yang bukan bagian dari entitas XML standar dengan &amp;
  return svg.replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, "&amp;");
}

export function cleanSvgString(raw: string): string {
  if (!raw) return "";
  let cleaned = raw.replace(/^```(xml|svg)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const match = cleaned.match(/<svg[\s\S]*<\/svg>/i);
  if (match) {
    cleaned = match[0];
  }
  // Ensure xmlns is present
  if (!cleaned.includes('xmlns="http://www.w3.org/2000/svg"')) {
    cleaned = cleaned.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  return fixSvgXmlEntities(cleaned);
}

/**
 * Validasi dan pembersihan SVG yang aman tanpa merusak koordinat atau posisi teks asli.
 */
export function autoWrapSvgText(svgString: string): string {
  return cleanSvgString(svgString);
}

/**
 * Converts an SVG string into a data URI for direct <img> display.
 */
export function svgToDataUrl(svgString: string): string {
  const clean = cleanSvgString(svgString);
  try {
    const utf8Bytes = new TextEncoder().encode(clean);
    let binary = "";
    const len = utf8Bytes.length;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(utf8Bytes[i]);
    }
    return `data:image/svg+xml;base64,${btoa(binary)}`;
  } catch {
    return `data:image/svg+xml;utf8,${encodeURIComponent(clean)}`;
  }
}

/**
 * Renders an SVG string onto a High-DPI HTML5 Canvas and exports as sharp, high-resolution PNG data URI.
 * Resolusi default 1700 × 1120 (2x Retina scale dari viewBox 850 × 560) menjamin teks sangat tajam & terbaca jelas.
 */
export async function svgToPngDataUrl(svgString: string, width = 1700, height = 1120): Promise<string> {
  const clean = cleanSvgString(svgString);
  return new Promise((resolve) => {
    try {
      const blob = new Blob([clean], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const img = new Image();

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            URL.revokeObjectURL(url);
            resolve(svgToDataUrl(clean));
            return;
          }

          // Kualitas render tinggi untuk teks & bentuk vektor
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";

          // Background putih solid
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          URL.revokeObjectURL(url);

          const pngUrl = canvas.toDataURL("image/png", 0.96);
          resolve(pngUrl);
        } catch {
          URL.revokeObjectURL(url);
          resolve(svgToDataUrl(clean));
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(svgToDataUrl(clean));
      };

      img.src = url;
    } catch {
      resolve(svgToDataUrl(clean));
    }
  });
}

