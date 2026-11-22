// Self-contained Vercel ESM Serverless Handler (Zero relative .ts imports)
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://fidxmkjpdlfawagawrrm.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZHhta2pwZGxmYXdhZ2F3cnJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NDgzNjksImV4cCI6MjA4NTMyNDM2OX0.X-ln0rn5tpGgrCpPxiv-FkfPuvAAmORdNRaqwa9RetM';

interface CachedMetaBundle {
  code: string;
  authorId?: string;
  authorName: string;
  authorSchool?: string;
  status: string;
  version: number;
  config: Record<string, any>;
  timestamp: number;
}

interface CachedQuestionBundle<Q = any> extends CachedMetaBundle {
  questions: Q[];
}

interface SolutionEntry {
  correctAnswer?: string;
  explanation?: string;
  solutionSteps?: string;
  trueFalseRows?: { text: string; answer: boolean }[];
  matchingPairs?: { left: string; right: string }[];
}

interface CachedSolutionsBundle {
  solutions: Record<string, SolutionEntry>;
  timestamp: number;
}

interface SolutionOwnershipProof {
  deviceId?: string;
  resultId?: string | number;
}

interface ExamContentHttpResult {
  status: number;
  headers: Record<string, string>;
  body?: Record<string, any>;
  notModified?: boolean;
}

interface TursoSqlArg {
  type: 'null' | 'integer' | 'float' | 'text';
  value?: string | number;
}

const EXAM_CONTENT_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Proctor-Token, X-Device-Id, X-Result-Id',
};

const TURSO_KEY_CONTEXT = 'turso-exam-v1';
const ENVELOPE_PREFIX = 'v1';

const memoryMetaCache = new Map<string, CachedMetaBundle>();
const memoryBundleCache = new Map<string, CachedQuestionBundle>();
const memorySolutionsCache = new Map<string, CachedSolutionsBundle>();

const META_CACHE_TTL_MS = 10 * 1000;
const BUNDLE_CACHE_TTL_MS = 10 * 60 * 1000;
const SOLUTIONS_CACHE_TTL_MS = 60 * 1000;
const MAX_META_CACHE_SIZE = 200;
const MAX_BUNDLE_CACHE_SIZE = 150;
const MAX_SOLUTIONS_CACHE_SIZE = 100;

let schemaInitPromise: Promise<void> | null = null;

function isValidHttpUrl(val?: string): val is string {
  if (!val) return false;
  const trimmed = val.trim();
  return /^https?:\/\/[a-z0-9.-]+/i.test(trimmed) && !/your_.*here/i.test(trimmed);
}

function isValidSupabaseKey(val?: string): val is string {
  if (!val) return false;
  const trimmed = val.trim();
  return trimmed.length > 30 && !/your_.*here/i.test(trimmed) && !/\s/.test(trimmed);
}

function getServerSupabase() {
  const rawUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseUrl = isValidHttpUrl(rawUrl) ? rawUrl.trim() : DEFAULT_SUPABASE_URL;

  const rawAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const anonKey = isValidSupabaseKey(rawAnonKey) ? rawAnonKey.trim() : DEFAULT_SUPABASE_ANON_KEY;

  const anonClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const rawServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (isValidSupabaseKey(rawServiceKey)) {
    try {
      const serviceClient = createClient(supabaseUrl, rawServiceKey.trim(), {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      return { primaryDb: serviceClient, fallbackDb: anonClient, isServiceRole: true };
    } catch (err) {
      console.warn('[ExamContent] Gagal membuat service role client, menggunakan anon client:', err);
    }
  }

  return { primaryDb: anonClient, fallbackDb: anonClient, isServiceRole: false };
}

function getUserScopedSupabase(bearerToken?: string) {
  const token = String(bearerToken || '').trim();
  const rawUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseUrl = isValidHttpUrl(rawUrl) ? rawUrl.trim() : DEFAULT_SUPABASE_URL;

  const rawAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const anonKey = isValidSupabaseKey(rawAnonKey) ? rawAnonKey.trim() : DEFAULT_SUPABASE_ANON_KEY;

  if (!token) return null;
  return createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

function setBoundedCache<T extends { timestamp: number }>(
  cache: Map<string, T>,
  key: string,
  value: T,
  maxSize: number,
  ttlMs: number
) {
  const now = Date.now();
  if (cache.size >= maxSize) {
    for (const [k, v] of cache.entries()) {
      if (now - v.timestamp >= ttlMs) {
        cache.delete(k);
      }
    }
    while (cache.size >= maxSize) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey === undefined) break;
      cache.delete(oldestKey);
    }
  }
  cache.set(key, value);
}

function sanitizeConfigForStudent(config: any, status?: string): Record<string, any> {
  const clean: Record<string, any> = config && typeof config === 'object' ? { ...config } : {};

  if (Array.isArray(clean.collaborators)) {
    clean.collaborators = clean.collaborators.map((c: any) => ({
      label: c?.label,
      role: c?.role,
      createdAt: c?.createdAt,
    }));
  }

  if (status === 'closed') {
    clean.isFinished = true;
  }

  return clean;
}

function stripAnswersFromQuestion<T extends Record<string, any>>(q: T): T {
  const sanitizedQ: Record<string, any> = q && typeof q === 'object' ? { ...q } : {};
  if (Array.isArray(sanitizedQ.options)) {
    sanitizedQ.options = [...sanitizedQ.options];
  }

  delete sanitizedQ.correctAnswer;
  delete sanitizedQ.solutionSteps;

  if (Array.isArray(sanitizedQ.trueFalseRows)) {
    sanitizedQ.trueFalseRows = sanitizedQ.trueFalseRows.map((row: any) => {
      const newRow = { ...row };
      delete newRow.answer;
      return newRow;
    });
  }

  if (Array.isArray(sanitizedQ.matchingPairs)) {
    const rightList = sanitizedQ.matchingPairs.map((p: any) => ({
      right: p?.right,
      rightChart: p?.rightChart,
    }));
    for (let i = rightList.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      [rightList[i], rightList[j]] = [rightList[j], rightList[i]];
    }

    sanitizedQ.matchingPairs = sanitizedQ.matchingPairs.map((pair: any, idx: number) => ({
      left: pair?.left,
      leftChart: pair?.leftChart,
      right: rightList[idx]?.right,
      rightChart: rightList[idx]?.rightChart,
      weight: pair?.weight,
    }));
  }

  return sanitizedQ as T;
}

async function getExamMetaBundle(rawCode: string, isPreview = false) {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) {
    return { success: false as const, status: 400, error: 'EXAM_CODE_REQUIRED' };
  }

  const metaCacheKey = `${code}:${isPreview ? 'preview' : 'std'}`;
  const cachedMeta = memoryMetaCache.get(metaCacheKey);
  if (cachedMeta && Date.now() - cachedMeta.timestamp < META_CACHE_TTL_MS) {
    return {
      success: true as const,
      code: cachedMeta.code,
      authorId: cachedMeta.authorId,
      authorName: cachedMeta.authorName,
      authorSchool: cachedMeta.authorSchool,
      status: cachedMeta.status,
      version: cachedMeta.version,
      config: cachedMeta.config,
      source: 'memory_edge_meta',
    };
  }

  if (!isPreview) {
    const warmedBundle = memoryBundleCache.get(`${code}:latest:std`);
    if (warmedBundle && Date.now() - warmedBundle.timestamp < BUNDLE_CACHE_TTL_MS) {
      return {
        success: true as const,
        code: warmedBundle.code,
        authorId: warmedBundle.authorId,
        authorName: warmedBundle.authorName,
        authorSchool: warmedBundle.authorSchool,
        status: warmedBundle.status,
        version: warmedBundle.version,
        config: warmedBundle.config,
        source: 'memory_edge_bundle',
      };
    }
  }

  const { primaryDb, fallbackDb, isServiceRole } = getServerSupabase();
  let { data, error } = await primaryDb
    .from('exams')
    .select('code, author_id, school, config, status, created_at')
    .eq('code', code)
    .maybeSingle();

  if (error && isServiceRole) {
    const retryRes = await fallbackDb
      .from('exams')
      .select('code, author_id, school, config, status, created_at')
      .eq('code', code)
      .maybeSingle();
    data = retryRes.data;
    error = retryRes.error;
  }

  if (error || !data) {
    return { success: false as const, status: 404, error: 'EXAM_NOT_FOUND' };
  }

  if (data.status === 'DRAFT' && !isPreview) {
    return { success: false as const, status: 403, error: 'EXAM_IS_DRAFT' };
  }

  const sanitizedConfig = sanitizeConfigForStudent(data.config, data.status);
  const version = typeof sanitizedConfig.version === 'number' ? sanitizedConfig.version : 1;
  const authorName = String(sanitizedConfig.authorName || 'Pengajar');

  const entry: CachedMetaBundle = {
    code: data.code,
    authorId: data.author_id,
    authorName,
    authorSchool: data.school || '',
    status: data.status,
    version,
    config: sanitizedConfig,
    timestamp: Date.now(),
  };

  setBoundedCache(memoryMetaCache, metaCacheKey, entry, MAX_META_CACHE_SIZE, META_CACHE_TTL_MS);

  return {
    success: true as const,
    code: entry.code,
    authorId: entry.authorId,
    authorName: entry.authorName,
    authorSchool: entry.authorSchool,
    status: entry.status,
    version: entry.version,
    config: entry.config,
    source: 'origin_database',
  };
}

async function getStudentQuestionBundle(
  rawCode: string,
  requestedVersion?: number,
  isPreview = false
) {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) {
    return { success: false as const, status: 400, error: 'EXAM_CODE_REQUIRED' };
  }

  const modeKey = isPreview ? 'preview' : 'std';
  const cacheKey = `${code}:${requestedVersion || 'latest'}:${modeKey}`;
  const cached =
    memoryBundleCache.get(cacheKey) ||
    (!isPreview ? memoryBundleCache.get(`${code}:latest:std`) : undefined);

  if (
    cached &&
    Date.now() - cached.timestamp < BUNDLE_CACHE_TTL_MS &&
    (!requestedVersion || cached.version === requestedVersion)
  ) {
    return {
      success: true as const,
      code: cached.code,
      authorId: cached.authorId,
      authorName: cached.authorName,
      authorSchool: cached.authorSchool,
      status: cached.status,
      version: cached.version,
      config: cached.config,
      questions: cached.questions,
      source: 'memory_edge_origin',
    };
  }

  const { primaryDb, fallbackDb, isServiceRole } = getServerSupabase();
  let { data, error } = await primaryDb
    .from('exams')
    .select('code, author_id, school, questions, config, status, created_at')
    .eq('code', code)
    .maybeSingle();

  if (error && isServiceRole) {
    const retryRes = await fallbackDb
      .from('exams')
      .select('code, author_id, school, questions, config, status, created_at')
      .eq('code', code)
      .maybeSingle();
    data = retryRes.data;
    error = retryRes.error;
  }

  if (error || !data) {
    return {
      success: false as const,
      status: 404,
      error: 'EXAM_NOT_FOUND',
    };
  }

  if (data.status === 'DRAFT' && !isPreview) {
    return {
      success: false as const,
      status: 403,
      error: 'EXAM_IS_DRAFT',
    };
  }

  const rawQuestions: any[] = Array.isArray(data.questions) ? data.questions : [];
  const sanitizedQuestions = rawQuestions.map((q) => stripAnswersFromQuestion(q));
  const sanitizedConfig = sanitizeConfigForStudent(data.config, data.status);
  const examVersion = typeof sanitizedConfig.version === 'number' ? sanitizedConfig.version : 1;
  const authorName = String(sanitizedConfig.authorName || 'Pengajar');

  const bundleEntry: CachedQuestionBundle = {
    code: data.code,
    authorId: data.author_id,
    authorName,
    authorSchool: data.school || '',
    status: data.status,
    version: examVersion,
    config: sanitizedConfig,
    questions: sanitizedQuestions,
    timestamp: Date.now(),
  };

  setBoundedCache(memoryBundleCache, cacheKey, bundleEntry, MAX_BUNDLE_CACHE_SIZE, BUNDLE_CACHE_TTL_MS);
  if (!isPreview) {
    setBoundedCache(
      memoryBundleCache,
      `${code}:latest:std`,
      bundleEntry,
      MAX_BUNDLE_CACHE_SIZE,
      BUNDLE_CACHE_TTL_MS
    );
    setBoundedCache(
      memoryBundleCache,
      `${code}:v${examVersion}:std`,
      bundleEntry,
      MAX_BUNDLE_CACHE_SIZE,
      BUNDLE_CACHE_TTL_MS
    );
    setBoundedCache(memoryMetaCache, `${code}:std`, bundleEntry, MAX_META_CACHE_SIZE, META_CACHE_TTL_MS);
  }

  return {
    success: true as const,
    code: bundleEntry.code,
    authorId: bundleEntry.authorId,
    authorName: bundleEntry.authorName,
    authorSchool: bundleEntry.authorSchool,
    status: bundleEntry.status,
    version: bundleEntry.version,
    config: bundleEntry.config,
    questions: bundleEntry.questions,
    source: 'origin_database',
  };
}

function storeWarmBundleInMemory(rawCode: string, rawBundle: any) {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) return null;

  const bundleStatus = String(rawBundle?.status || 'PUBLISHED');
  if (bundleStatus === 'DRAFT') return null;

  const sanitizedConfig = sanitizeConfigForStudent(rawBundle?.config, bundleStatus);
  const version =
    typeof rawBundle?.version === 'number'
      ? rawBundle.version
      : typeof sanitizedConfig.version === 'number'
        ? sanitizedConfig.version
        : 1;
  sanitizedConfig.version = version;

  const rawQuestions: any[] = Array.isArray(rawBundle?.questions) ? rawBundle.questions : [];
  const sanitizedQuestions = rawQuestions.map((q) => stripAnswersFromQuestion(q));
  const authorName = String(rawBundle?.authorName || sanitizedConfig.authorName || 'Pengajar');

  const entry: CachedQuestionBundle = {
    code,
    authorId: rawBundle?.authorId,
    authorName,
    authorSchool: rawBundle?.authorSchool || '',
    status: bundleStatus,
    version,
    config: sanitizedConfig,
    questions: sanitizedQuestions,
    timestamp: Date.now(),
  };

  setBoundedCache(memoryBundleCache, `${code}:latest:std`, entry, MAX_BUNDLE_CACHE_SIZE, BUNDLE_CACHE_TTL_MS);
  setBoundedCache(memoryBundleCache, `${code}:${version}:std`, entry, MAX_BUNDLE_CACHE_SIZE, BUNDLE_CACHE_TTL_MS);
  setBoundedCache(memoryBundleCache, `${code}:v${version}:std`, entry, MAX_BUNDLE_CACHE_SIZE, BUNDLE_CACHE_TTL_MS);
  setBoundedCache(memoryMetaCache, `${code}:std`, entry, MAX_META_CACHE_SIZE, META_CACHE_TTL_MS);

  return entry;
}

async function getAuthorizedExamSolutions(
  rawCode: string,
  studentId?: string,
  proctorToken?: string,
  proof?: SolutionOwnershipProof
) {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) {
    return { success: false as const, status: 400, error: 'EXAM_CODE_REQUIRED' };
  }

  const { primaryDb, fallbackDb, isServiceRole } = getServerSupabase();
  let db = primaryDb;

  let { data: exam, error: examError } = await db
    .from('exams')
    .select('code, config, status')
    .eq('code', code)
    .maybeSingle();

  if (examError && isServiceRole) {
    db = fallbackDb;
    const retryRes = await db
      .from('exams')
      .select('code, config, status')
      .eq('code', code)
      .maybeSingle();
    exam = retryRes.data;
    examError = retryRes.error;
  }

  if (examError || !exam) {
    return { success: false as const, status: 404, error: 'EXAM_NOT_FOUND' };
  }

  const config = exam.config || {};
  const isSolutionsAllowed = Boolean(
    config.showCorrectAnswer || config.showHints || config.showSolutionSteps || config.showResultToStudent
  );

  let isAuthorized = false;

  if (studentId === 'monitor' && config.enablePublicStream) {
    isAuthorized = true;
  } else if (proctorToken && Array.isArray(config.collaborators)) {
    const isProctor = config.collaborators.some(
      (c: any) => c.token === proctorToken && (c.role === 'editor' || c.role === 'viewer')
    );
    if (isProctor) isAuthorized = true;
  }

  if (!isAuthorized && studentId && studentId !== 'monitor') {
    if (!isSolutionsAllowed) {
      return {
        success: false as const,
        status: 403,
        error: 'SOLUTIONS_DISABLED_BY_TEACHER',
      };
    }

    const { data: result } = await db
      .from('results')
      .select('id, status, device_id, answers')
      .eq('exam_code', code)
      .eq('student_id', studentId)
      .maybeSingle();

    if (result && (result.status === 'completed' || result.status === 'force_closed')) {
      const dbDeviceId = String(
        result.device_id || (result.answers as Record<string, unknown> | null)?._deviceId || ''
      ).trim();
      const dbResultId = result.id ? String(result.id) : '';
      const providedDeviceId = String(proof?.deviceId || '').trim();
      const providedResultId =
        proof?.resultId !== undefined && proof?.resultId !== null
          ? String(proof.resultId).trim()
          : '';

      const hasValidProof = dbDeviceId
        ? Boolean(providedDeviceId) && providedDeviceId === dbDeviceId
        : Boolean(dbResultId) && Boolean(providedResultId) && providedResultId === dbResultId;

      if (!hasValidProof) {
        return {
          success: false as const,
          status: 403,
          error: 'ACCESS_DENIED_OWNERSHIP_PROOF',
        };
      }
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    return {
      success: false as const,
      status: 403,
      error: 'ACCESS_DENIED_EXAM_NOT_COMPLETED',
    };
  }

  const examVersion = typeof config.version === 'number' ? config.version : 1;
  const solCacheKey = `${code}:v${examVersion}`;
  const cachedSolutions = memorySolutionsCache.get(solCacheKey);
  if (cachedSolutions && Date.now() - cachedSolutions.timestamp < SOLUTIONS_CACHE_TTL_MS) {
    return {
      success: true as const,
      code,
      solutions: cachedSolutions.solutions,
    };
  }

  const { data: qRow, error: qErr } = await db
    .from('exams')
    .select('questions')
    .eq('code', code)
    .maybeSingle();

  if (qErr || !qRow) {
    return { success: false as const, status: 404, error: 'EXAM_NOT_FOUND' };
  }

  const rawQuestions: any[] = Array.isArray(qRow.questions) ? qRow.questions : [];
  const solutions: Record<string, SolutionEntry> = {};

  rawQuestions.forEach((q) => {
    solutions[q.id] = {
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      solutionSteps: q.solutionSteps,
      trueFalseRows: q.trueFalseRows?.map((r: any) => ({ text: r.text, answer: r.answer })),
      matchingPairs: q.matchingPairs?.map((m: any) => ({ left: m.left, right: m.right })),
    };
  });

  setBoundedCache(
    memorySolutionsCache,
    solCacheKey,
    {
      solutions,
      timestamp: Date.now(),
    },
    MAX_SOLUTIONS_CACHE_SIZE,
    SOLUTIONS_CACHE_TTL_MS
  );

  return {
    success: true as const,
    code,
    solutions,
  };
}

function deriveTursoExamKeyBytes(masterSecret: string, examCode: string): Buffer {
  const secret = String(masterSecret || '').trim();
  const cleanCode = String(examCode || '').trim().toUpperCase();
  if (!secret || !cleanCode) {
    throw new Error('TURSO_EXAM_SECRET and examCode are required to derive key');
  }
  return crypto.createHmac('sha256', secret).update(`${TURSO_KEY_CONTEXT}:${cleanCode}`).digest();
}

function deriveTursoExamKeyBase64Url(masterSecret: string, examCode: string): string {
  return deriveTursoExamKeyBytes(masterSecret, examCode).toString('base64url');
}

function encryptTursoBundlePayload(
  masterSecret: string,
  examCode: string,
  payloadObj: unknown
): string {
  const keyBytes = deriveTursoExamKeyBytes(masterSecret, examCode);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBytes, iv);
  const plaintext = Buffer.from(JSON.stringify(payloadObj), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const cipherWithTag = Buffer.concat([ciphertext, authTag]);

  return `${ENVELOPE_PREFIX}.${iv.toString('base64url')}.${cipherWithTag.toString('base64url')}`;
}

function sanitizeQuestionForTurso<T extends Record<string, any>>(q: T): T {
  const clean: Record<string, any> = q && typeof q === 'object' ? { ...q } : {};

  if (Array.isArray(clean.options)) {
    clean.options = [...clean.options];
  }

  delete clean.correctAnswer;
  delete clean.explanation;
  delete clean.solutionSteps;
  delete clean.correctAnswerChart;
  delete clean.optionWeights;
  delete clean.imagePrompt;
  delete clean.svgPrompt;
  delete clean.listeningScript;

  if (Array.isArray(clean.trueFalseRows)) {
    clean.trueFalseRows = clean.trueFalseRows.map((row: any) => {
      const cleanRow = row && typeof row === 'object' ? { ...row } : {};
      delete cleanRow.answer;
      delete cleanRow.trueWeight;
      delete cleanRow.falseWeight;
      return cleanRow;
    });
  }

  if (Array.isArray(clean.matchingPairs)) {
    const rightList = clean.matchingPairs.map((pair: any) => ({
      right: pair?.right,
      rightChart: pair?.rightChart,
    }));
    for (let i = rightList.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      [rightList[i], rightList[j]] = [rightList[j], rightList[i]];
    }

    clean.matchingPairs = clean.matchingPairs.map((pair: any, idx: number) => ({
      left: pair?.left,
      leftChart: pair?.leftChart,
      right: rightList[idx]?.right,
      rightChart: rightList[idx]?.rightChart,
    }));
  }

  return clean as T;
}

function sanitizeConfigForTurso(config: any, status?: string): Record<string, any> {
  const clean: Record<string, any> = config && typeof config === 'object' ? { ...config } : {};

  if (Array.isArray(clean.collaborators)) {
    clean.collaborators = clean.collaborators.map((c: any) => ({
      label: c?.label,
      role: c?.role,
      createdAt: c?.createdAt,
    }));
  }

  delete clean.registeredStudents;
  delete clean.certificateSettings;

  if (status === 'closed') {
    clean.isFinished = true;
  }

  return clean;
}

function buildTursoSafeBundle(rawExam: {
  code: string;
  authorId?: string;
  authorName?: string;
  authorSchool?: string;
  status?: string;
  version?: number;
  config?: any;
  questions?: any[];
}) {
  const code = String(rawExam.code || '').trim().toUpperCase();
  const status = String(rawExam.status || 'PUBLISHED');
  const sanitizedConfig = sanitizeConfigForTurso(rawExam.config, status);
  const version =
    typeof rawExam.version === 'number'
      ? rawExam.version
      : typeof sanitizedConfig.version === 'number'
        ? sanitizedConfig.version
        : 1;
  sanitizedConfig.version = version;

  const rawQuestions = Array.isArray(rawExam.questions) ? rawExam.questions : [];
  const sanitizedQuestions = rawQuestions.map((q) => sanitizeQuestionForTurso(q));
  const authorName = String(rawExam.authorName || sanitizedConfig.authorName || 'Pengajar');

  return {
    code,
    authorId: rawExam.authorId,
    authorName,
    authorSchool: rawExam.authorSchool || '',
    status,
    version,
    config: sanitizedConfig,
    questions: sanitizedQuestions,
  };
}

function normalizeTursoHttpUrl(rawUrl?: string): string {
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

function getServerTursoConfig() {
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

function inspectTursoJwtRole(rawToken?: string): 'rw' | 'ro' | 'invalid' | 'missing' {
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

async function fetchAuthoritativeExamRow(code: string, bearerToken?: string) {
  const { primaryDb, fallbackDb, isServiceRole } = getServerSupabase();
  let metadataOnly = false;
  let dbForAuth = primaryDb;

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

async function handleExamMetaRequest(params: {
  code: string;
  isPreview?: boolean;
}): Promise<ExamContentHttpResult> {
  const code = String(params.code || '').trim().toUpperCase();
  if (!code) {
    return {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: { success: false, error: 'Exam code is required' },
    };
  }

  const isPreview = Boolean(params.isPreview);
  const meta = await getExamMetaBundle(code, isPreview);

  if (!meta.success) {
    const failed = meta as { status?: number };
    return {
      status: Number(failed.status) || 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: meta,
    };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (isPreview) {
    headers['Cache-Control'] = 'no-store';
  } else {
    headers['Cache-Control'] = 'public, max-age=0, s-maxage=10, stale-while-revalidate=30';
    headers['CDN-Cache-Control'] = 'public, s-maxage=10';
    headers['Vercel-CDN-Cache-Control'] = 'public, s-maxage=10';
  }

  return { status: 200, headers, body: meta };
}

async function handleExamTestRequest(params: {
  code: string;
  versionNum?: number;
  isPreview?: boolean;
  ifNoneMatch?: string;
}): Promise<ExamContentHttpResult> {
  const code = String(params.code || '').trim().toUpperCase();
  if (!code) {
    return {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: { success: false, error: 'Exam code is required' },
    };
  }

  const isPreview = Boolean(params.isPreview);
  const bundle = await getStudentQuestionBundle(code, params.versionNum, isPreview);

  if (!bundle.success) {
    const failed = bundle as { status?: number };
    return {
      status: Number(failed.status) || 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: bundle,
    };
  }

  if (!isPreview) {
    const etag = `"${code}-v${bundle.version}"`;
    const cacheHeaders: Record<string, string> = {
      ETag: etag,
      'Cache-Control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=3600',
      'CDN-Cache-Control': 'public, s-maxage=86400',
      'Vercel-CDN-Cache-Control': 'public, s-maxage=86400',
    };

    if (params.ifNoneMatch === etag) {
      return {
        status: 304,
        headers: cacheHeaders,
        notModified: true,
      };
    }

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...cacheHeaders },
      body: bundle,
    };
  }

  return {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: bundle,
  };
}

async function handleExamSolutionsRequest(params: {
  code: string;
  studentId?: string;
  proctorToken?: string;
  deviceId?: string;
  resultId?: string;
}): Promise<ExamContentHttpResult> {
  const code = String(params.code || '').trim().toUpperCase();
  if (!code) {
    return {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
      body: { success: false, error: 'Exam code is required' },
    };
  }

  const result = await getAuthorizedExamSolutions(code, params.studentId, params.proctorToken, {
    deviceId: params.deviceId,
    resultId: params.resultId,
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'private, no-cache, no-store, must-revalidate',
  };

  if (!result.success) {
    return {
      status: result.status || 403,
      headers,
      body: result,
    };
  }

  return {
    status: 200,
    headers,
    body: result,
  };
}

async function handleExamWarmRequest(params: {
  code: string;
  versionNum?: number;
  method?: string;
  examBundle?: any;
}): Promise<ExamContentHttpResult> {
  const code = String(params.code || '').trim().toUpperCase();
  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  };

  if (!code) {
    return {
      status: 400,
      headers: baseHeaders,
      body: { success: false, error: 'Exam code is required' },
    };
  }

  if (
    String(params.method || '').toUpperCase() === 'POST' &&
    params.examBundle &&
    Array.isArray(params.examBundle.questions)
  ) {
    const stored = storeWarmBundleInMemory(code, params.examBundle);
    if (stored) {
      return {
        status: 200,
        headers: baseHeaders,
        body: {
          success: true,
          warmed: true,
          version: stored.version,
          source: 'publish_push',
        },
      };
    }
  }

  const bundle = await getStudentQuestionBundle(code, params.versionNum);
  if (!bundle.success) {
    const failed = bundle as { status?: number };
    return {
      status: Number(failed.status) || 500,
      headers: baseHeaders,
      body: bundle,
    };
  }

  return {
    status: 200,
    headers: baseHeaders,
    body: {
      success: true,
      warmed: true,
      version: bundle.version,
      source: bundle.source,
    },
  };
}

async function handleExamTursoSyncRequest(params: {
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

  if (auth.ok === false) {
    const denied = auth as { status: number; error: string };
    return { status: denied.status, headers, body: { success: false, error: denied.error } };
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

async function handleExamTursoDeleteRequest(params: {
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

  if (auth.ok === false) {
    const denied = auth as { status: number; error: string };
    return { status: denied.status, headers, body: { success: false, error: denied.error } };
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

async function handleExamKeyRequest(params: {
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
    const failed = meta as { status?: number; error?: string };
    return {
      status: Number(failed.status) || 404,
      headers,
      body: { success: false, error: failed.error },
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

function sendExamContentResponse(res: any, result: ExamContentHttpResult) {
  for (const [key, value] of Object.entries(result.headers)) {
    res.setHeader(key, value);
  }
  if (result.notModified || result.status === 304) {
    return res.status(304).end();
  }
  return res.status(result.status).json(result.body);
}

function extractBearerToken(req: any): string {
  const rawAuth =
    (req.headers && (req.headers.authorization || req.headers.Authorization)) || '';
  const str = String(rawAuth).trim();
  if (/^Bearer\s+/i.test(str)) {
    return str.replace(/^Bearer\s+/i, '').trim();
  }
  return '';
}

function safePathname(raw: unknown): string {
  try {
    return new URL(String(raw || '/'), 'http://localhost').pathname.replace(/\/+$/, '');
  } catch {
    return '';
  }
}

export default async function handler(req: any, res: any) {
  for (const [key, value] of Object.entries(EXAM_CONTENT_CORS_HEADERS)) {
    res.setHeader(key, value);
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const reqUrl = new URL(req.url || '/', 'http://localhost');
  const invokePath =
    (req.headers && (req.headers['x-invoke-path'] || req.headers['x-matched-path'])) ||
    reqUrl.pathname ||
    '/';
  const invokePathname = safePathname(invokePath);
  const reqPathname = reqUrl.pathname.replace(/\/+$/, '');

  const routeMatch =
    reqPathname.match(/\/api\/exam-content\/([^/]+)\/(meta|test|solutions|warm|key|sync-turso|delete-turso)/) ||
    invokePathname.match(/\/api\/exam-content\/([^/]+)\/(meta|test|solutions|warm|key|sync-turso|delete-turso)/);

  let parsedBody: any = req.body;
  if (Buffer.isBuffer(parsedBody)) {
    parsedBody = parsedBody.toString('utf8');
  }
  if (typeof parsedBody === 'string') {
    try {
      parsedBody = JSON.parse(parsedBody);
    } catch {
      parsedBody = {};
    }
  }

  const rawCode = routeMatch
    ? routeMatch[1]
    : req.query?.code || reqUrl.searchParams.get('code') || parsedBody?.code || parsedBody?.examBundle?.code || '';
  const code = String(rawCode || '').trim().toUpperCase();

  const action = routeMatch
    ? routeMatch[2]
    : req.query?.action ||
      req.query?.type ||
      reqUrl.searchParams.get('action') ||
      reqUrl.searchParams.get('type') ||
      (reqPathname.endsWith('/warm') || invokePathname.endsWith('/warm') ? 'warm' : 'test');

  const versionParam = req.query?.v || reqUrl.searchParams.get('v');
  const parsedVersion = versionParam ? parseInt(String(versionParam), 10) : NaN;
  const versionNum = Number.isFinite(parsedVersion) ? parsedVersion : undefined;

  const isPreview =
    req.query?.preview === 'true' ||
    req.query?.isPreview === 'true' ||
    reqUrl.searchParams.get('preview') === 'true' ||
    reqUrl.searchParams.get('isPreview') === 'true';

  if (!code) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(400).json({ success: false, error: 'Exam code is required' });
  }

  try {
    if (action === 'meta') {
      const result = await handleExamMetaRequest({ code, isPreview });
      return sendExamContentResponse(res, result);
    }

    if (action === 'test') {
      const ifNoneMatch =
        req.headers && typeof req.headers['if-none-match'] === 'string'
          ? req.headers['if-none-match']
          : undefined;
      const result = await handleExamTestRequest({
        code,
        versionNum,
        isPreview,
        ifNoneMatch,
      });
      return sendExamContentResponse(res, result);
    }

    if (action === 'solutions') {
      const studentId = req.query?.studentId || reqUrl.searchParams.get('studentId') || '';
      const proctorToken =
        req.query?.token || reqUrl.searchParams.get('token') || (req.headers && req.headers['x-proctor-token']) || '';
      const deviceId =
        req.query?.deviceId || reqUrl.searchParams.get('deviceId') || (req.headers && req.headers['x-device-id']) || '';
      const resultId =
        req.query?.resultId || reqUrl.searchParams.get('resultId') || (req.headers && req.headers['x-result-id']) || '';

      const result = await handleExamSolutionsRequest({
        code,
        studentId: String(studentId),
        proctorToken: String(proctorToken),
        deviceId: String(deviceId),
        resultId: String(resultId),
      });
      return sendExamContentResponse(res, result);
    }

    if (action === 'warm') {
      const result = await handleExamWarmRequest({
        code,
        versionNum,
        method: req.method,
        examBundle: parsedBody?.examBundle,
      });
      return sendExamContentResponse(res, result);
    }

    if (action === 'key') {
      const result = await handleExamKeyRequest({ code, isPreview });
      return sendExamContentResponse(res, result);
    }

    if (action === 'sync-turso') {
      const bearerToken = extractBearerToken(req);
      const proctorToken =
        (req.headers && req.headers['x-proctor-token']) ||
        req.query?.token ||
        reqUrl.searchParams.get('token') ||
        '';
      const result = await handleExamTursoSyncRequest({
        code,
        bearerToken,
        proctorToken: String(proctorToken),
        fallbackBundle: parsedBody?.examBundle,
      });
      return sendExamContentResponse(res, result);
    }

    if (action === 'delete-turso') {
      const bearerToken = extractBearerToken(req);
      const proctorToken =
        (req.headers && req.headers['x-proctor-token']) ||
        req.query?.token ||
        reqUrl.searchParams.get('token') ||
        '';
      const result = await handleExamTursoDeleteRequest({
        code,
        bearerToken,
        proctorToken: String(proctorToken),
      });
      return sendExamContentResponse(res, result);
    }

    res.setHeader('Content-Type', 'application/json');
    return res.status(400).json({ success: false, error: `Invalid action: ${action}` });
  } catch (err: any) {
    console.error('Exam content handler error:', err);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ success: false, error: err?.message || 'Internal server error' });
  }
}
