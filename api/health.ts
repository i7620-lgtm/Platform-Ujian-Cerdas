export default function handler(_req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Content-Type", "application/json");

  return res.status(200).json({
    status: "ok",
    service: "Platform Ujian Cerdas API (Vercel Native Serverless)",
    timestamp: Date.now()
  });
}

