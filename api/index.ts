import express from "express";
import cors from "cors";
import { generateQuestionsOnServer, generateAIAnalysisOnServer } from "../server/ai.js";

const app = express();

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
    console.warn("API warning generating questions:", error.message);
    res.status(500).json({ success: false, error: error.message });
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

export default app;
