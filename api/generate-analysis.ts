import { generateAIAnalysisOnServer } from "../server/ai.ts";

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

    const { prompt } = body;
    if (!prompt) {
      return res.status(400).json({ success: false, error: "Parameter 'prompt' diperlukan." });
    }

    const responseText = await generateAIAnalysisOnServer(prompt);
    return res.status(200).json({ success: true, text: responseText });
  } catch (error: any) {
    const errorMsg = error?.message || "Terjadi kendala saat menganalisis arsip ujian.";
    console.warn("[Vercel API generate-analysis Error]:", errorMsg);
    return res.status(500).json({ success: false, error: errorMsg });
  }
}

