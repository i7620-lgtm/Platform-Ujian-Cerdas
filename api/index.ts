import healthHandler from "./health.ts";
import examContentHandler from "./exam-content.ts";
import moderateContentHandler from "./moderate-content.ts";

export const config = {
  maxDuration: 60,
};

export default async function handler(req: any, res: any) {
  // Normalize pathname from req.url or Vercel proxy headers
  const rawUrl = (req.headers && (req.headers["x-invoke-path"] || req.headers["x-matched-path"])) || req.url || "/";
  const url = new URL(rawUrl, "http://localhost");
  const pathname = url.pathname.replace(/\/+$/, "") || "/";

  if (pathname === "/api/health" || pathname === "/health" || pathname === "/api" || pathname === "") {
    return healthHandler(req, res);
  }

  if (pathname === "/api/moderate-content" || pathname === "/moderate-content") {
    return moderateContentHandler(req, res);
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

  if (pathname.startsWith("/api/exam-content")) {
    return examContentHandler(req, res);
  }

  return res.status(404).json({
    success: false,
    error: `Endpoint not found: ${pathname}`
  });
}
