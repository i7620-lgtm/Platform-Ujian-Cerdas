import { generateSvgOnServer } from "../server/ai.ts";

export const config = {
  maxDuration: 60,
};

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
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
    body = body || {};

    const { prompt, style } = body;
    const svgCode = await generateSvgOnServer(prompt, style);
    return res.status(200).json({ success: true, svg: svgCode });
  } catch (error: any) {
    console.warn("[Vercel API generate-svg Error]:", error?.message || error);
    return res.status(500).json({ success: false, error: error?.message || "Gagal menghasilkan gambar SVG" });
  }
}

