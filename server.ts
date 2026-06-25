import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { generateQuestionsOnServer, generateAIAnalysisOnServer } from "./server/ai.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/generate-questions", async (req, res) => {
    try {
      const { prompt, systemInstruction, modelsToTry, properties } = req.body;
      const responseText = await generateQuestionsOnServer(prompt, systemInstruction, modelsToTry, properties);
      res.json({ success: true, text: responseText });
    } catch (error: any) {
      console.error("API error generating questions:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/generate-analysis", async (req, res) => {
    try {
      const { prompt } = req.body;
      const responseText = await generateAIAnalysisOnServer(prompt);
      res.json({ success: true, text: responseText });
    } catch (error: any) {
      console.error("API error generating analysis:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

