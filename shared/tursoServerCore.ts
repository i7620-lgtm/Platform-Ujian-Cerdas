import {
  getExamMetaBundle,
  getServerSupabase,
  getUserScopedSupabase,
  storeWarmBundleInMemory,
  type ExamContentHttpResult,
} from './examContentCore';
import {
  buildTursoSafeBundle,
  deriveTursoExamKeyBase64Url,
  encryptTursoBundlePayload,
} from './tursoCryptoCore';

export interface TursoSqlArg {
  type: 'null' | 'integer' | 'float' | 'text';
  value?: string | number;
}

export interface TursoDiagnostics {
  readyForServerSync: boolean;
  readyForClientConfig: boolean;
  hasSupabaseServiceRole: boolean;
  hasServerUrl: boolean;
  hasServerAuthToken: boolean;
  serverAuthTokenRole: 'rw' | 'ro' | 'invalid' | 'missing';
  hasServerExamSecret: boolean;
  serverExamSecretLength: number;
  hasClientUrl: boolean;
  hasClientReadToken: boolean;
  clientReadTokenRole: 'rw' | 'ro' | 'invalid' | 'missing';
  pingAttempted?: boolean;
  pingOk?: boolean;
  pingError?: string;
}

let schemaInitPromise: Promise<void> | null = null;

export function normalizeTursoHttpUrl(rawUrl?: string): string {
  const trimmed = String(rawUrl || '').trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  if (/^libsql:\/\//i.test(trimmed)) {
    return trimmed.replace(/^libsql:\/\//i, 'https://');
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return '';
}

export function getServerTursoConfig() {
  const url = normalizeTursoHttpUrl(
    process.env.TURSO_DATABASE_URL ||
      process.env.TURSO_URL ||
      process.env.VITE_TURSO_DATABASE_URL ||
      process.env.VITE_TURSO_URL
  );
  const authToken = String(
    process.env.TURSO_AUTH_TOKEN ||
      process.env.TURSO_WRITE_TOKEN ||
      process.env.TURSO_RW_TOKEN ||
      ''
  ).trim();
  const examSecret = String(process.env.TURSO_EXAM_SECRET || '').trim();

  return {
    url,
    authToken,
    examSecret,
    isSyncConfigured: Boolean(url && authToken && examSecret),
    isKeyConfigured: Boolean(url && examSecret),
  };
}

export function inspectTursoJwtRole(rawToken?: string): 'rw' | 'ro' | 'invalid' | 'missing' {
  const token = String(rawToken || '').trim();
  if (!token) return 'missing';
  const parts = token.split('.');
  if (parts.length !== 3) return 'invalid';
  try {
    const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
    const payload = JSON.parse(payloadJson) as { a?: string };
    if (payload.a === 'ro') return 'ro';
    return 'rw';
  } catch {
    return 'invalid';
  }
}

function encodeTursoArg(val: string | number | null | undefined): TursoSqlArg {
  if (val === null || val === undefined) {
    return { type: 'null' };
  }
  if (typeof val === 'number') {
    if (Number.isInteger(val)) {
      return { type: 'integer', value: String(val) };
    }
    return { type: 'float', value: val };
  }
  return { type: 'text', value: String(val) };
}

async function executeTursoPipeline(
  url: string,
  authToken: string,
  statements: Array<{ sql: string; args?: Array<string | number | null | undefined> }>
) {
  const requests: any[] = statements.map((s) => ({
    type: 'execute',
    stmt: {
      sql: s.sql,
      ...(s.args && s.args.length > 0 ? { args: s.args.map(encodeTursoArg) } : {}),
    },
  }));
  requests.push({ type: 'close' });

  const response = await fetch(`${url}/v2/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Turso HTTP error ${response.status}${errText ? `: ${errText.slice(0, 200)}` : ''}`);
  }

  const data = (await response.json()) as {
    results?: Array<{ type: string; error?: { message?: string }; response?: any }>;
  };

  for (const res of data.results || []) {
    if (res.type === 'error') {
      throw new Error(res.error?.message || 'Turso SQL execution error');
    }
  }

  return data.results || [];
}

async function ensureTursoSchema(url: string, authToken: string): Promise<void> {
  if (!schemaInitPromise) {
    schemaInitPromise = executeTursoPipeline(url, authToken, [
      {
        sql: `CREATE TABLE IF NOT EXISTS turso_exams (
          code TEXT PRIMARY KEY,
          status TEXT NOT NULL,
          version INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          encrypted_payload TEXT
        )`,
      },
    ])
      .then(() => undefined)
      .catch((err) => {
        schemaInitPromise = null;
        throw err;
      });
  }
  return schemaInitPromise;
}

export async function getTursoServerDiagnostics(options?: { ping?: boolean }): Promise<TursoDiagnostics> {
  const cfg = getServerTursoConfig();
  const clientUrl = normalizeTursoHttpUrl(
    process.env.VITE_TURSO_DATABASE_URL ||
      process.env.VITE_TURSO_URL ||
      process.env.VITE_TURSO_DB_URL
  );
  const clientReadToken = String(process.env.VITE_TURSO_READ_TOKEN || '').trim();

  const serverAuthTokenRole = inspectTursoJwtRole(cfg.authToken);
  const clientReadTokenRole = inspectTursoJwtRole(clientReadToken);
  const { isServiceRole } = getServerSupabase();

  const diag: TursoDiagnostics = {
    readyForServerSync:
      cfg.isSyncConfigured && serverAuthTokenRole === 'rw' && cfg.examSecret.length >= 16,
    readyForClientConfig: Boolean(clientUrl && clientReadToken && clientReadTokenRole === 'ro'),
    hasSupabaseServiceRole: isServiceRole,
    hasServerUrl: Boolean(cfg.url),
    hasServerAuthToken: Boolean(cfg.authToken),
    serverAuthTokenRole,
    hasServerExamSecret: Boolean(cfg.examSecret),
    serverExamSecretLength: cfg.examSecret.length,
    hasClientUrl: Boolean(clientUrl),
    hasClientReadToken: Boolean(clientReadToken),
    clientReadTokenRole,
  };

  if (options?.ping && cfg.url && cfg.authToken) {
    diag.pingAttempted = true;
    try {
      await executeTursoPipeline(cfg.url, cfg.authToken, [{ sql: 'SELECT 1' }]);
      diag.pingOk = true;
    } catch (err: any) {
      diag.pingOk = false;
      diag.pingError = err?.message || 'Connection failed';
    }
  }

  return diag;
}

async function fetchAuthoritativeExamRow(code: string, bearerToken?: string) {
  const { primaryDb, fallbackDb, isServiceRole } = getServerSupabase();
  let metadataOnly = false;
  let dbForAuth = primaryDb;

  // 1. If service_role is active, read full row including questions directly
  if (isServiceRole) {
    const res = await primaryDb
      .from('exams')
      .select('code, author_id, school, config, questions, status')
      .eq('code', code)
      .maybeSingle();
    if (!res.error && res.data) {
      return { data: res.data, error: null, primaryDb, metadataOnly: false };
    }
  }

  // 2. If teacher JWT is provided (and no service_role or service_role missed), query via user-scoped client
  // so Supabase RLS ("Authenticated authors can manage own exams") grants SELECT on `questions`.
  const userDb = getUserScopedSupabase(bearerToken);
  if (userDb) {
    dbForAuth = userDb;
    const userRes = await userDb
      .from('exams')
      .select('code, author_id, school, config, questions, status')
      .eq('code', code)
      .maybeSingle();
    if (!userRes.error && userRes.data) {
      return { data: userRes.data, error: null, primaryDb: userDb, metadataOnly: false };
    }
  }

  // 3. Fallback: try anon full select (if permissive RLS) then safe metadata-only columns (if column-level RLS revokes `questions`)
  const anonFull = await fallbackDb
    .from('exams')
    .select('code, author_id, school, config, questions, status')
    .eq('code', code)
    .maybeSingle();
  if (!anonFull.error && anonFull.data) {
    return { data: anonFull.data, error: null, primaryDb: dbForAuth, metadataOnly: false };
  }

  const metaRes = await (userDb || fallbackDb)
    .from('exams')
    .select('code, author_id, school, config, status')
    .eq('code', code)
    .maybeSingle();
  if (!metaRes.error && metaRes.data) {
    metadataOnly = true;
    return {
      data: { ...metaRes.data, questions: null as any },
      error: null,
      primaryDb: dbForAuth,
      metadataOnly,
    };
  }

  return { data: null, error: metaRes.error || anonFull.error, primaryDb: dbForAuth, metadataOnly: false };
}

async function verifyTeacherWriteAccess(params: {
  code: string;
  bearerToken?: string;
  proctorToken?: string;
}): Promise<
  | { ok: true; examRow: Record<string, any>; metadataOnly: boolean }
  | { ok: false; status: number; error: string }
> {
  const { data: examRow, error, primaryDb, metadataOnly } = await fetchAuthoritativeExamRow(
    params.code,
    params.bearerToken
  );
  if (error || !examRow) {
    return { ok: false, status: 404, error: 'EXAM_NOT_FOUND' };
  }

  const proctorToken = String(params.proctorToken || '').trim();
  const collaborators = Array.isArray((examRow.config as any)?.collaborators)
    ? (examRow.config as any).collaborators
    : [];

  if (proctorToken) {
    const isEditorCollab = collaborators.some(
      (c: any) => c?.token === proctorToken && c?.role === 'editor'
    );
    if (isEditorCollab) {
      return { ok: true, examRow, metadataOnly };
    }
  }

  const bearer = String(params.bearerToken || '').trim();
  if (!bearer) {
    return { ok: false, status: 401, error: 'UNAUTHORIZED_TEACHER_TOKEN_REQUIRED' };
  }

  try {
    const { data: userData, error: userErr } = await primaryDb.auth.getUser(bearer);
    if (userErr || !userData?.user?.id) {
      return { ok: false, status: 401, error: 'INVALID_TEACHER_SESSION' };
    }

    const userId = userData.user.id;
    if (examRow.author_id && examRow.author_id === userId) {
      return { ok: true, examRow, metadataOnly };
    }

    const { data: profile } = await primaryDb
      .from('profiles')
      .select('role, school')
      .eq('id', userId)
      .maybeSingle();

    if (profile?.role === 'super_admin') {
      return { ok: true, examRow, metadataOnly };
    }

    if (
      profile?.role === 'admin_sekolah' &&
      profile?.school &&
      examRow.school &&
      String(profile.school).trim().toLowerCase() === String(examRow.school).trim().toLowerCase()
    ) {
      return { ok: true, examRow, metadataOnly };
    }

    return { ok: false, status: 403, error: 'FORBIDDEN_NOT_EXAM_OWNER' };
  } catch {
    return { ok: false, status: 401, error: 'AUTH_VERIFICATION_FAILED' };
  }
}

export async function handleExamTursoSyncRequest(params: {
  code: string;
  bearerToken?: string;
  proctorToken?: string;
  fallbackBundle?: { config?: any; questions?: any[]; status?: string; version?: number };
}): Promise<ExamContentHttpResult> {
  const code = String(params.code || '').trim().toUpperCase();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  };

  if (!code) {
    return { status: 400, headers, body: { success: false, error: 'EXAM_CODE_REQUIRED' } };
  }

  const auth = await verifyTeacherWriteAccess({
    code,
    bearerToken: params.bearerToken,
    proctorToken: params.proctorToken,
  });

  if (!auth.ok) {
    return { status: auth.status, headers, body: { success: false, error: auth.error } };
  }

  const examRow = auth.examRow;
  const rawConfig = (examRow.config || {}) as Record<string, any>;
  const version = typeof rawConfig.version === 'number' ? rawConfig.version : 1;
  const isClosed = examRow.status === 'closed' || Boolean(rawConfig.isFinished);
  const isDraft = examRow.status === 'DRAFT';

  const authoritativeQuestions = Array.isArray(examRow.questions)
    ? examRow.questions
    : auth.metadataOnly && Array.isArray(params.fallbackBundle?.questions)
      ? params.fallbackBundle.questions
      : null;

  if (!isDraft && !isClosed && !authoritativeQuestions) {
    return {
      status: 503,
      headers,
      body: {
        success: false,
        tursoSynced: false,
        error: 'EXAM_QUESTIONS_UNREADABLE_CHECK_SERVICE_ROLE_KEY',
      },
    };
  }

  const resolvedQuestions = authoritativeQuestions || [];

  // Keep in-memory Edge bundle synchronized as fallback
  if (!isDraft) {
    storeWarmBundleInMemory(code, {
      code,
      authorId: examRow.author_id,
      authorName: rawConfig.authorName || 'Pengajar',
      authorSchool: examRow.school || '',
      status: isClosed ? 'closed' : examRow.status || 'PUBLISHED',
      version,
      config: rawConfig,
      questions: resolvedQuestions,
    });
  }

  const tursoCfg = getServerTursoConfig();
  if (!tursoCfg.isSyncConfigured) {
    return {
      status: 200,
      headers,
      body: {
        success: true,
        tursoSynced: false,
        reason: 'TURSO_NOT_CONFIGURED',
        version,
      },
    };
  }

  try {
    await ensureTursoSchema(tursoCfg.url, tursoCfg.authToken);
    const nowMs = Date.now();

    if (isDraft) {
      await executeTursoPipeline(tursoCfg.url, tursoCfg.authToken, [
        { sql: 'DELETE FROM turso_exams WHERE code = ?', args: [code] },
      ]);
      return {
        status: 200,
        headers,
        body: { success: true, tursoSynced: true, action: 'deleted_draft', version },
      };
    }

    if (isClosed) {
      await executeTursoPipeline(tursoCfg.url, tursoCfg.authToken, [
        {
          sql: `INSERT INTO turso_exams (code, status, version, updated_at, encrypted_payload)
                VALUES (?, 'closed', ?, ?, NULL)
                ON CONFLICT(code) DO UPDATE SET
                  status = 'closed',
                  version = excluded.version,
                  updated_at = excluded.updated_at,
                  encrypted_payload = NULL`,
          args: [code, version, nowMs],
        },
      ]);
      return {
        status: 200,
        headers,
        body: { success: true, tursoSynced: true, action: 'closed_wiped', version },
      };
    }

    const safeBundle = buildTursoSafeBundle({
      code,
      authorId: examRow.author_id,
      authorName: rawConfig.authorName || 'Pengajar',
      authorSchool: examRow.school || '',
      status: 'PUBLISHED',
      version,
      config: rawConfig,
      questions: resolvedQuestions,
    });

    const encryptedPayload = encryptTursoBundlePayload(tursoCfg.examSecret, code, safeBundle);

    await executeTursoPipeline(tursoCfg.url, tursoCfg.authToken, [
      {
        sql: `INSERT INTO turso_exams (code, status, version, updated_at, encrypted_payload)
              VALUES (?, 'PUBLISHED', ?, ?, ?)
              ON CONFLICT(code) DO UPDATE SET
                status = excluded.status,
                version = excluded.version,
                updated_at = excluded.updated_at,
                encrypted_payload = excluded.encrypted_payload`,
        args: [code, version, nowMs, encryptedPayload],
      },
    ]);

    return {
      status: 200,
      headers,
      body: {
        success: true,
        tursoSynced: true,
        action: 'upserted_encrypted',
        version,
        questionCount: safeBundle.questions.length,
      },
    };
  } catch (err: any) {
    console.error('Turso sync error:', err?.message || err);
    return {
      status: 500,
      headers,
      body: {
        success: false,
        tursoSynced: false,
        error: err?.message || 'TURSO_SYNC_FAILED',
      },
    };
  }
}

export async function handleExamTursoDeleteRequest(params: {
  code: string;
  bearerToken?: string;
  proctorToken?: string;
}): Promise<ExamContentHttpResult> {
  const code = String(params.code || '').trim().toUpperCase();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  };

  if (!code) {
    return { status: 400, headers, body: { success: false, error: 'EXAM_CODE_REQUIRED' } };
  }

  const auth = await verifyTeacherWriteAccess({
    code,
    bearerToken: params.bearerToken,
    proctorToken: params.proctorToken,
  });

  if (!auth.ok) {
    return { status: auth.status, headers, body: { success: false, error: auth.error } };
  }

  const tursoCfg = getServerTursoConfig();
  if (!tursoCfg.url || !tursoCfg.authToken) {
    return {
      status: 200,
      headers,
      body: { success: true, tursoDeleted: false, reason: 'TURSO_NOT_CONFIGURED' },
    };
  }

  try {
    await ensureTursoSchema(tursoCfg.url, tursoCfg.authToken);
    await executeTursoPipeline(tursoCfg.url, tursoCfg.authToken, [
      { sql: 'DELETE FROM turso_exams WHERE code = ?', args: [code] },
    ]);
    return {
      status: 200,
      headers,
      body: { success: true, tursoDeleted: true },
    };
  } catch (err: any) {
    console.error('Turso delete error:', err?.message || err);
    return {
      status: 500,
      headers,
      body: { success: false, tursoDeleted: false, error: err?.message || 'TURSO_DELETE_FAILED' },
    };
  }
}

export async function handleExamKeyRequest(params: {
  code: string;
  isPreview?: boolean;
}): Promise<ExamContentHttpResult> {
  const code = String(params.code || '').trim().toUpperCase();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'private, no-cache, no-store, must-revalidate',
  };

  if (!code) {
    return { status: 400, headers, body: { success: false, error: 'EXAM_CODE_REQUIRED' } };
  }

  const meta = await getExamMetaBundle(code, Boolean(params.isPreview));
  if (!meta.success) {
    return {
      status: meta.status || 404,
      headers,
      body: { success: false, error: meta.error },
    };
  }

  const isClosed = meta.status === 'closed' || Boolean(meta.config?.isFinished);
  if (isClosed) {
    return {
      status: 200,
      headers,
      body: {
        success: true,
        code: meta.code,
        status: 'closed',
        version: meta.version,
        tursoEnabled: false,
        isClosed: true,
      },
    };
  }

  const tursoCfg = getServerTursoConfig();
  if (!tursoCfg.isKeyConfigured) {
    return {
      status: 200,
      headers,
      body: {
        success: true,
        code: meta.code,
        status: meta.status,
        version: meta.version,
        tursoEnabled: false,
      },
    };
  }

  const examKey = deriveTursoExamKeyBase64Url(tursoCfg.examSecret, code);
  const rawClientReadToken = String(process.env.VITE_TURSO_READ_TOKEN || '').trim();
  const safeClientReadToken =
    inspectTursoJwtRole(rawClientReadToken) === 'ro' ? rawClientReadToken : undefined;
  return {
    status: 200,
    headers,
    body: {
      success: true,
      code: meta.code,
      status: meta.status,
      version: meta.version,
      examKey,
      tursoUrl: tursoCfg.url,
      ...(safeClientReadToken ? { tursoReadToken: safeClientReadToken } : {}),
      tursoEnabled: true,
    },
  };
}
