import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

export function getAI(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      console.warn("API key is missing. AI features will not work.");
      throw new Error("API key is missing. Please set GEMINI_API_KEY or API_KEY.");
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        timeout: 25000,
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}
