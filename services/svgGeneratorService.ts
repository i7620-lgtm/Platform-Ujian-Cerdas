/**
 * Service for cleaning educational SVG vector graphics and rasterizing them to PNG.
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

