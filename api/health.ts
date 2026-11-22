// Self-contained Vercel ESM Serverless Handler (Zero relative .ts imports)

function normalizeTursoHttpUrl(rawUrl?: string): string {
  const trimmed = String(rawUrl || "").trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  if (/^libsql:\/\//i.test(trimmed)) {
    return trimmed.replace(/^libsql:\/\//i, "https://");
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return "";
}

function inspectTursoJwtRole(rawToken?: string): "rw" | "ro" | "invalid" | "missing" {
  const token = String(rawToken || "").trim();
  if (!token) return "missing";
  const parts = token.split(".");
  if (parts.length !== 3) return "invalid";
  try {
    const payloadJson = Buffer.from(parts[1], "base64url").toString("utf8");
    const payload = JSON.parse(payloadJson) as { a?: string };
    if (payload.a === "ro") return "ro";
    return "rw";
  } catch {
    return "invalid";
  }
}

function isValidSupabaseKey(val?: string): boolean {
  if (!val) return false;
  const trimmed = val.trim();
  return trimmed.length > 30 && !/your_.*here/i.test(trimmed) && !/\s/.test(trimmed);
}

async function pingTurso(url: string, authToken: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(`${url}/v2/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [{ type: "execute", stmt: { sql: "SELECT 1" } }, { type: "close" }],
      }),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      return {
        ok: false,
        error: `Turso HTTP error ${response.status}${errText ? `: ${errText.slice(0, 200)}` : ""}`,
      };
    }
    const data = (await response.json()) as {
      results?: Array<{ type: string; error?: { message?: string } }>;
    };
    for (const res of data.results || []) {
      if (res.type === "error") {
        return { ok: false, error: res.error?.message || "Turso SQL execution error" };
      }
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Connection failed" };
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const reqUrl = new URL(req?.url || "/", "http://localhost");
  const checkTurso = req?.query?.check === "turso" || reqUrl.searchParams.get("check") === "turso";

  const serverUrl = normalizeTursoHttpUrl(
    process.env.TURSO_DATABASE_URL ||
      process.env.TURSO_URL ||
      process.env.VITE_TURSO_DATABASE_URL ||
      process.env.VITE_TURSO_URL
  );
  const serverAuthToken = String(
    process.env.TURSO_AUTH_TOKEN ||
      process.env.TURSO_WRITE_TOKEN ||
      process.env.TURSO_RW_TOKEN ||
      ""
  ).trim();
  const examSecret = String(process.env.TURSO_EXAM_SECRET || "").trim();

  const clientUrl = normalizeTursoHttpUrl(
    process.env.VITE_TURSO_DATABASE_URL ||
      process.env.VITE_TURSO_URL ||
      process.env.VITE_TURSO_DB_URL
  );
  const clientReadToken = String(process.env.VITE_TURSO_READ_TOKEN || "").trim();

  const serverAuthTokenRole = inspectTursoJwtRole(serverAuthToken);
  const clientReadTokenRole = inspectTursoJwtRole(clientReadToken);
  const hasSupabaseServiceRole = isValidSupabaseKey(process.env.SUPABASE_SERVICE_ROLE_KEY);

  const turso: Record<string, any> = {
    readyForServerSync:
      Boolean(serverUrl && serverAuthToken && examSecret) &&
      serverAuthTokenRole === "rw" &&
      examSecret.length >= 16,
    readyForClientConfig: Boolean(clientUrl && clientReadToken && clientReadTokenRole === "ro"),
    hasSupabaseServiceRole,
    hasServerUrl: Boolean(serverUrl),
    hasServerAuthToken: Boolean(serverAuthToken),
    serverAuthTokenRole,
    hasServerExamSecret: Boolean(examSecret),
    serverExamSecretLength: examSecret.length,
    hasClientUrl: Boolean(clientUrl),
    hasClientReadToken: Boolean(clientReadToken),
    clientReadTokenRole,
  };

  if (checkTurso && serverUrl && serverAuthToken) {
    turso.pingAttempted = true;
    const ping = await pingTurso(serverUrl, serverAuthToken);
    turso.pingOk = ping.ok;
    if (!ping.ok && ping.error) {
      turso.pingError = ping.error;
    }
  }

  return res.status(200).json({
    status: "ok",
    service: "Platform Ujian Cerdas API (Vercel Native Serverless)",
    timestamp: Date.now(),
    turso,
  });
}
