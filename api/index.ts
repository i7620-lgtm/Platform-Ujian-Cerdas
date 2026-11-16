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

  const rawUrl = (req.headers && (req.headers["x-invoke-path"] || req.headers["x-matched-path"])) || req.url || "/";
  const url = new URL(String(rawUrl), "http://localhost");
  const pathname = url.pathname.replace(/\/+$/, "") || "/";

  if (pathname === "/api/health" || pathname === "/health" || pathname === "/api" || pathname === "") {
    return res.status(200).json({
      status: "ok",
      service: "Platform Ujian Cerdas API (Vercel Native Serverless)",
      timestamp: Date.now(),
    });
  }

  if (
    pathname === "/api/ai-config" ||
    pathname === "/ai-config" ||
    pathname === "/api/generate-questions" ||
    pathname === "/generate-questions" ||
    pathname === "/api/generate-analysis" ||
    pathname === "/generate-analysis" ||
    pathname === "/api/ai-proxy" ||
    pathname === "/ai-proxy"
  ) {
    return res.status(410).json({
      success: false,
      error: "Endpoint AI server telah dinonaktifkan. Gunakan fitur Prompt & Impor AI Eksternal.",
    });
  }

  return res.status(404).json({
    success: false,
    error: `Endpoint not found: ${pathname}`,
  });
}
