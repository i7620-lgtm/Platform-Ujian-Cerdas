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

// Transparent AI Key config endpoint for browser fallback
app.get(["/api/ai-config", "/ai-config"], (req, res) => {
  const key = process.env.GEMINI_API_KEY || process.env.API_KEY || "";
  res.json({ hasKey: Boolean(key), key });
});

// AI Questions Generation
app.post(["/api/generate-questions", "/generate-questions"], async (req, res) => {
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

// Safe Fallback Server Proxy Endpoint for Browser Clients
app.post(["/api/ai-proxy", "/ai-proxy"], async (req, res) => {
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
