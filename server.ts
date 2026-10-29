import express from "express";
import path from "path";
import cors from "cors";
import { generateQuestionsOnServer, generateAIAnalysisOnServer, generateSvgOnServer } from "./server/ai.ts";
import { getStudentQuestionBundle, getAuthorizedExamSolutions } from "./server/examContent.ts";

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

  app.get("/api/ai-config", (req, res) => {
    const key = process.env.GEMINI_API_KEY || process.env.API_KEY || "";
    res.json({ hasKey: Boolean(key), key });
  });

  app.post("/api/generate-svg", async (req, res) => {
    try {
      const { prompt, style } = req.body;
      const svgCode = await generateSvgOnServer(prompt, style);
      res.json({ success: true, svg: svgCode });
    } catch (error: any) {
      console.warn("API warning generating SVG:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/generate-questions", async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    try {
      const { prompt, systemInstruction, modelsToTry, properties } = req.body;
      const responseText = await generateQuestionsOnServer(prompt, systemInstruction, modelsToTry, properties);
      res.json({ success: true, text: responseText });
    } catch (error: any) {
      console.warn("API warning generating questions:", error?.message || error);
      res.status(200).json({ success: false, fallback: true, error: error?.message || "Gagal menghasilkan soal dari server" });
    }
  });

  app.post("/api/generate-analysis", async (req, res) => {
    try {
      const { prompt } = req.body;
      const responseText = await generateAIAnalysisOnServer(prompt);
      res.json({ success: true, text: responseText });
    } catch (error: any) {
      console.warn("API warning generating analysis:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/ai-proxy", async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ success: false, error: "Prompt is required" });
      }
      const responseText = await generateAIAnalysisOnServer(prompt);
      res.json({ success: true, text: responseText, source: "server-ai-proxy" });
    } catch (error: any) {
      console.warn("AI Proxy warning:", error?.message || error);
      res.status(500).json({ success: false, error: error?.message || "AI Proxy failure" });
    }
  });

  // Edge Cache Exam Content Routes (Two-Phase Bundle)
  app.get("/api/exam-content/:code/test", async (req, res) => {
    try {
      const code = (req.params.code || "").trim().toUpperCase();
      const versionParam = req.query.v ? parseInt(req.query.v as string, 10) : undefined;
      const bundle = await getStudentQuestionBundle(code, versionParam);
      
      if (!bundle.success) {
        return res.status(bundle.status || 500).json(bundle);
      }

      const etag = `"${code}-v${bundle.version}"`;
      if (req.headers["if-none-match"] === etag) {
        return res.status(304).end();
      }

      res.setHeader("Content-Type", "application/json");
      res.setHeader("ETag", etag);
      res.setHeader("Cache-Control", "public, max-age=0, s-maxage=86400, stale-while-revalidate=3600");
      res.setHeader("CDN-Cache-Control", "public, s-maxage=86400");
      res.setHeader("Vercel-CDN-Cache-Control", "public, s-maxage=86400");

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

      const result = await getAuthorizedExamSolutions(code, studentId, proctorToken);
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
      const code = (((req.params as any).code || req.query.code || req.body?.code) as string || "").trim().toUpperCase();
      const versionParam = req.query.v ? parseInt(req.query.v as string, 10) : undefined;
      if (!code) {
        return res.status(400).json({ success: false, error: "Code required" });
      }
      const bundle = await getStudentQuestionBundle(code, versionParam);
      res.json({ success: true, warmed: true, version: bundle.version });
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

