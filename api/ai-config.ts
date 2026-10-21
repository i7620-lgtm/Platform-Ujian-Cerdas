export default function handler(_req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Content-Type", "application/json");

  const key = process.env.GEMINI_API_KEY || process.env.API_KEY || "";
  return res.status(200).json({
    hasKey: Boolean(key),
    key: key
  });
}

