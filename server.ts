import express from "express";
import path from "path";
import cors from "cors";
import {
  getExamMetaBundle,
  getStudentQuestionBundle,
  getAuthorizedExamSolutions,
  storeWarmBundleInMemory,
} from "./server/examContent.ts";
import { moderateExamContentOnServer } from "./server/contentModeration.ts";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(cors());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", port: PORT, env: process.env.NODE_ENV || "development" });
  });

  app.post("/api/moderate-content", async (req, res) => {
    try {
      const { content } = req.body || {};
      if (!content || typeof content !== "string") {
        return res.json({ isSafe: true, issues: [] });
      }
      const result = moderateExamContentOnServer(content);
      res.json(result);
    } catch (error: any) {
      console.error("Moderation API Error:", error.message);
      res.json({ isSafe: true, issues: [] }); // Safe fallback
    }
  });

  app.all(["/api/ai-config", "/api/generate-questions", "/api/generate-analysis", "/api/ai-proxy"], (_req, res) => {
    res.status(410).json({
      success: false,
      error: "Endpoint AI server telah dinonaktifkan. Gunakan fitur Prompt & Impor AI Eksternal.",
    });
  });

  // Edge Cache Exam Content Routes (Two-Phase Bundle + Publish-to-Edge)
  app.get("/api/exam-content/:code/meta", async (req, res) => {
    try {
      const code = (req.params.code || "").trim().toUpperCase();
      const isPreview = req.query.preview === "true" || req.query.isPreview === "true";
      const meta = await getExamMetaBundle(code, isPreview);

      res.setHeader("Content-Type", "application/json");
      if (!meta.success) {
        res.setHeader("Cache-Control", "no-store");
        return res.status(meta.status || 500).json(meta);
      }

      if (isPreview) {
        res.setHeader("Cache-Control", "no-store");
      } else {
        res.setHeader("Cache-Control", "public, max-age=0, s-maxage=10, stale-while-revalidate=30");
        res.setHeader("CDN-Cache-Control", "public, s-maxage=10");
        res.setHeader("Vercel-CDN-Cache-Control", "public, s-maxage=10");
      }
      res.status(200).json(meta);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get("/api/exam-content/:code/test", async (req, res) => {
    try {
      const code = (req.params.code || "").trim().toUpperCase();
      const versionParam = req.query.v ? parseInt(req.query.v as string, 10) : undefined;
      const isPreview = req.query.preview === "true" || req.query.isPreview === "true";
      const bundle = await getStudentQuestionBundle(code, versionParam, isPreview);

      if (!bundle.success) {
        res.setHeader("Cache-Control", "no-store");
        return res.status(bundle.status || 500).json(bundle);
      }

      if (!isPreview) {
        const etag = `"${code}-v${bundle.version}"`;
        if (req.headers["if-none-match"] === etag) {
          return res.status(304).end();
        }
        res.setHeader("ETag", etag);
        res.setHeader("Cache-Control", "public, max-age=0, s-maxage=86400, stale-while-revalidate=3600");
        res.setHeader("CDN-Cache-Control", "public, s-maxage=86400");
        res.setHeader("Vercel-CDN-Cache-Control", "public, s-maxage=86400");
      } else {
        res.setHeader("Cache-Control", "no-store");
      }

      res.setHeader("Content-Type", "application/json");
      res.status(200).json(bundle);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get("/api/exam-content/:code/solutions", async (req, res) => {
    try {
      const code = (req.params.code || "").trim().toUpperCase();
      const studentId = (req.query.studentId as string) || "";
      const proctorToken = (req.query.token as string) || (req.headers["x-proctor-token"] as string) || "";
      const deviceId = (req.query.deviceId as string) || (req.headers["x-device-id"] as string) || "";
      const resultId = (req.query.resultId as string) || (req.headers["x-result-id"] as string) || "";

      const result = await getAuthorizedExamSolutions(code, studentId, proctorToken, { deviceId, resultId });
      if (!result.success) {
        return res.status(result.status || 403).json(result);
      }

      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.all(["/api/exam-content/:code/warm", "/api/exam-content/warm"], async (req, res) => {
    try {
      const code = (((req.params as any).code || req.query.code || req.body?.code || req.body?.examBundle?.code) as string || "").trim().toUpperCase();
      const versionParam = req.query.v ? parseInt(req.query.v as string, 10) : undefined;
      if (!code) {
        return res.status(400).json({ success: false, error: "Code required" });
      }

      res.setHeader("Cache-Control", "no-store");
      if (
        req.method === "POST" &&
        req.body?.examBundle &&
        Array.isArray(req.body.examBundle.questions)
      ) {
        const stored = storeWarmBundleInMemory(code, req.body.examBundle);
        if (stored) {
          return res.json({ success: true, warmed: true, version: stored.version, source: "publish_push" });
        }
      }

      const bundle = await getStudentQuestionBundle(code, versionParam);
      if (!bundle.success) {
        return res.status(bundle.status || 500).json(bundle);
      }
      res.json({ success: true, warmed: true, version: bundle.version, source: bundle.source });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Vite middleware for development; static assets in production
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT} (NODE_ENV: ${process.env.NODE_ENV || "development"})`);
  });
}

startServer();

