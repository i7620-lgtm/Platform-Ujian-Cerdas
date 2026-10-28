import healthHandler from "./health.ts";
import aiConfigHandler from "./ai-config.ts";
import generateQuestionsHandler from "./generate-questions.ts";
import generateAnalysisHandler from "./generate-analysis.ts";
import generateSvgHandler from "./generate-svg.ts";

import examContentHandler from "./exam-content.ts";

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

  if (pathname === "/api/ai-config" || pathname === "/ai-config") {
    return aiConfigHandler(req, res);
  }

  if (pathname === "/api/generate-questions" || pathname === "/generate-questions") {
    return generateQuestionsHandler(req, res);
  }

  if (pathname === "/api/generate-analysis" || pathname === "/generate-analysis" || pathname === "/api/ai-proxy" || pathname === "/ai-proxy") {
    return generateAnalysisHandler(req, res);
  }

  if (pathname === "/api/generate-svg" || pathname === "/generate-svg") {
    return generateSvgHandler(req, res);
  }

  if (pathname.startsWith("/api/exam-content")) {
    return examContentHandler(req, res);
  }

  return res.status(404).json({
    success: false,
    error: `Endpoint not found: ${pathname}`
  });
}
