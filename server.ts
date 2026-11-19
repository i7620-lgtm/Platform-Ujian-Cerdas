import express from "express";
import path from "path";
import cors from "cors";
import {
  handleExamMetaRequest,
  handleExamTestRequest,
  handleExamSolutionsRequest,
  handleExamWarmRequest,
  sendExamContentResponse,
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
      const { content, subject, examType, classLevel } = req.body || {};
      if (!content || typeof content !== "string") {
        return res.json({ isSafe: true, issues: [] });
      }
      const result = moderateExamContentOnServer(content, {
        subject: typeof subject === "string" ? subject : "",
        examType: typeof examType === "string" ? examType : "",
        classLevel: typeof classLevel === "string" ? classLevel : "",
      });
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
      const result = await handleExamMetaRequest({ code, isPreview });
      return sendExamContentResponse(res, result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get("/api/exam-content/:code/test", async (req, res) => {
    try {
      const code = (req.params.code || "").trim().toUpperCase();
      const parsedVersion = req.query.v ? parseInt(req.query.v as string, 10) : NaN;
      const versionNum = Number.isFinite(parsedVersion) ? parsedVersion : undefined;
      const isPreview = req.query.preview === "true" || req.query.isPreview === "true";
      const ifNoneMatch = typeof req.headers["if-none-match"] === "string" ? req.headers["if-none-match"] : undefined;

      const result = await handleExamTestRequest({
        code,
        versionNum,
        isPreview,
        ifNoneMatch,
      });
      return sendExamContentResponse(res, result);
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

      const result = await handleExamSolutionsRequest({
        code,
        studentId,
        proctorToken,
        deviceId,
        resultId,
      });
      return sendExamContentResponse(res, result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.all(["/api/exam-content/:code/warm", "/api/exam-content/warm"], async (req, res) => {
    try {
      const code = (((req.params as any).code || req.query.code || req.body?.code || req.body?.examBundle?.code) as string || "").trim().toUpperCase();
      const parsedVersion = req.query.v ? parseInt(req.query.v as string, 10) : NaN;
      const versionNum = Number.isFinite(parsedVersion) ? parsedVersion : undefined;

      const result = await handleExamWarmRequest({
        code,
        versionNum,
        method: req.method,
        examBundle: req.body?.examBundle,
      });
      return sendExamContentResponse(res, result);
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

