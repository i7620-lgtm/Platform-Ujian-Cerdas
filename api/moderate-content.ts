import { moderateExamContentOnServer } from "../server/contentModeration.ts";

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      isSafe: true,
      issues: [],
      error: "Method not allowed",
    });
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const content = body && typeof body.content === "string" ? body.content : "";
    if (!content) {
      return res.status(200).json({ isSafe: true, issues: [] });
    }

    const result = moderateExamContentOnServer(content);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error("Server Content Moderation Error:", error?.message || error);
    return res.status(200).json({ isSafe: true, issues: [] });
  }
}
