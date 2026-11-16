import { getStudentQuestionBundle, getAuthorizedExamSolutions } from '../server/examContent.ts';

export default async function handler(req: any, res: any) {
  // CORS & common headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Proctor-Token, X-Device-Id, X-Result-Id");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Parse URL & Query
  const rawUrl = (req.headers && (req.headers["x-invoke-path"] || req.headers["x-matched-path"])) || req.url || "/";
  const url = new URL(rawUrl, "http://localhost");
  const pathname = url.pathname.replace(/\/+$/, "");

  // Match /api/exam-content/:code/test or /api/exam-content/:code/solutions or /api/exam-content/:code/warm
  // Also support Vercel rewrite query params: ?code=...&action=test|solutions|warm
  const match = pathname.match(/\/api\/exam-content\/([^/]+)\/(test|solutions|warm)/);
  let parsedBody: any = req.body;
  if (typeof parsedBody === "string") {
    try { parsedBody = JSON.parse(parsedBody); } catch { parsedBody = {}; }
  }

  let code = match
    ? match[1]
    : (req.query?.code || url.searchParams.get('code') || parsedBody?.code || '');
  const action = match
    ? match[2]
    : (req.query?.action || req.query?.type || url.searchParams.get('action') || url.searchParams.get('type') || (pathname.endsWith('/warm') ? 'warm' : 'test'));
  const versionParam = req.query?.v || url.searchParams.get('v');
  const versionNum = versionParam ? parseInt(String(versionParam), 10) : undefined;
  const isPreview = req.query?.preview === 'true' || req.query?.isPreview === 'true' || url.searchParams.get('preview') === 'true' || url.searchParams.get('isPreview') === 'true';

  code = String(code || '').trim().toUpperCase();

  if (!code) {
    res.setHeader("Content-Type", "application/json");
    return res.status(400).json({ success: false, error: "Exam code is required" });
  }

  try {
    if (action === 'test') {
      const bundle = await getStudentQuestionBundle(code, versionNum, isPreview);
      if (!bundle.success) {
        res.setHeader("Content-Type", "application/json");
        return res.status(bundle.status || 500).json(bundle);
      }

      // Check ETag for 304 Not Modified
      const etag = `"${code}-v${bundle.version}"`;
      if (req.headers && req.headers['if-none-match'] === etag) {
        return res.status(304).end();
      }

      // Edge Caching headers for Vercel CDN
      res.setHeader("Content-Type", "application/json");
      res.setHeader("ETag", etag);
      res.setHeader("Cache-Control", "public, max-age=0, s-maxage=86400, stale-while-revalidate=3600");
      res.setHeader("CDN-Cache-Control", "public, s-maxage=86400");
      res.setHeader("Vercel-CDN-Cache-Control", "public, s-maxage=86400");

      return res.status(200).json(bundle);
    }

    if (action === 'solutions') {
      const studentId = req.query?.studentId || url.searchParams.get('studentId') || '';
      const proctorToken = req.query?.token || url.searchParams.get('token') || (req.headers && req.headers['x-proctor-token']) || '';
      const deviceId = req.query?.deviceId || url.searchParams.get('deviceId') || (req.headers && req.headers['x-device-id']) || '';
      const resultId = req.query?.resultId || url.searchParams.get('resultId') || (req.headers && req.headers['x-result-id']) || '';

      const result = await getAuthorizedExamSolutions(code, studentId, proctorToken, { deviceId, resultId });
      if (!result.success) {
        res.setHeader("Content-Type", "application/json");
        return res.status(result.status || 403).json(result);
      }

      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");
      return res.status(200).json(result);
    }

    if (action === 'warm') {
      // Internal cache warmer trigger (origin memory cache + verification)
      const bundle = await getStudentQuestionBundle(code, versionNum);
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-store");
      if (!bundle.success) {
        return res.status(bundle.status || 500).json(bundle);
      }
      return res.status(200).json({ success: true, warmed: true, version: bundle.version });
    }

    res.setHeader("Content-Type", "application/json");
    return res.status(400).json({ success: false, error: `Invalid action: ${action}` });
  } catch (err: any) {
    console.error("Exam content handler error:", err);
    res.setHeader("Content-Type", "application/json");
    return res.status(500).json({ success: false, error: err.message || "Internal server error" });
  }
}
