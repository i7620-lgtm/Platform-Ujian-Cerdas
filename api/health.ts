import { getTursoServerDiagnostics } from "../shared/tursoServerCore";

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");

  const reqUrl = new URL(req?.url || "/", "http://localhost");
  const checkTurso = req?.query?.check === "turso" || reqUrl.searchParams.get("check") === "turso";
  const turso = await getTursoServerDiagnostics({ ping: checkTurso }).catch(() => null);

  return res.status(200).json({
    status: "ok",
    service: "Platform Ujian Cerdas API (Vercel Native Serverless)",
    timestamp: Date.now(),
    ...(turso ? { turso } : {}),
  });
}
