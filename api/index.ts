import express from "express";
import cors from "cors";
import { generateQuestionsOnServer, generateAIAnalysisOnServer, generateSvgOnServer } from "../server/ai.ts";

// Vercel Serverless Function Configuration
export const maxDuration = 60;
export const config = { maxDuration: 60 };

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Health check endpoint
app.get(["/api/health", "/health", "/"], (req, res) => {
  res.json({ status: "ok", service: "Platform Ujian Cerdas API", timestamp: Date.now() });
});

// AI Questions Generation
app.post(["/api/generate-questions", "/generate-questions"], async (req, res) => {
  try {
    const { prompt, systemInstruction, modelsToTry, properties } = req.body;
    const responseText = await generateQuestionsOnServer(prompt, systemInstruction, modelsToTry, properties);
    res.json({ success: true, text: responseText });
  } catch (error: any) {
    console.warn("API warning generating questions:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// AI Exam Analysis
app.post(["/api/generate-analysis", "/generate-analysis"], async (req, res) => {
  try {
    const { prompt } = req.body;
    const responseText = await generateAIAnalysisOnServer(prompt);
    res.json({ success: true, text: responseText });
  } catch (error: any) {
    console.warn("API warning generating analysis:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// AI Educational SVG Generation
app.post(["/api/generate-svg", "/generate-svg"], async (req, res) => {
  try {
    const { prompt, style } = req.body;
    const svgCode = await generateSvgOnServer(prompt, style);
    res.json({ success: true, svg: svgCode });
  } catch (error: any) {
    console.warn("API warning generating SVG:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default app;
