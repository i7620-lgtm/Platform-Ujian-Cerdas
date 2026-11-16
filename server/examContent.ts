import { createClient } from '@supabase/supabase-js';
import { supabase as anonSupabase } from '../lib/supabase.ts';
import type { Question } from '../types.ts';

const DEFAULT_SUPABASE_URL = 'https://fidxmkjpdlfawagawrrm.supabase.co';

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

function getServerSupabase(): { client: typeof anonSupabase; isServiceRole: boolean } {
  const rawServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const rawUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseUrl = isValidHttpUrl(rawUrl) ? rawUrl.trim() : DEFAULT_SUPABASE_URL;

  if (isValidSupabaseKey(rawServiceKey)) {
    try {
      return {
        client: createClient(supabaseUrl, rawServiceKey.trim(), {
          auth: { autoRefreshToken: false, persistSession: false },
        }),
        isServiceRole: true,
      };
    } catch (err) {
      console.warn('[ExamContent] Gagal membuat service role client, beralih ke anonSupabase:', err);
    }
  }

  return { client: anonSupabase, isServiceRole: false };
}

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

interface CachedBundle extends CachedMetaBundle {
  questions: Question[];
}

const memoryMetaCache = new Map<string, CachedMetaBundle>();
const memoryBundleCache = new Map<string, CachedBundle>();

const META_CACHE_TTL_MS = 10 * 1000;
const BUNDLE_CACHE_TTL_MS = 10 * 60 * 1000;
const SOLUTIONS_CACHE_TTL_MS = 60 * 1000;
const MAX_BUNDLE_CACHE_SIZE = 150;

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

const memorySolutionsCache = new Map<string, CachedSolutionsBundle>();
const MAX_SOLUTIONS_CACHE_SIZE = 100;

function setBoundedCache<T extends { timestamp: number }>(
  cache: Map<string, T>,
  key: string,
  value: T,
  maxSize: number,
  ttlMs = BUNDLE_CACHE_TTL_MS
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

export function sanitizeConfigForStudent(config: any, status?: string): Record<string, any> {
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

export function stripAnswersFromQuestion(q: Question): Question {
  const sanitizedQ = { ...q, options: q.options ? [...q.options] : undefined } as Question;

  // STRICT FAILSAFE: Delete correct answers and detailed solution steps from student package
  delete sanitizedQ.correctAnswer;
  delete sanitizedQ.solutionSteps;

  if (sanitizedQ.trueFalseRows) {
    sanitizedQ.trueFalseRows = sanitizedQ.trueFalseRows.map((row) => {
      const newRow = { ...row };
      delete newRow.answer;
      return newRow;
    });
  }

  if (sanitizedQ.matchingPairs) {
    const rightList = sanitizedQ.matchingPairs.map((p) => ({
      right: p.right,
      rightChart: p.rightChart,
    }));
    for (let i = rightList.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rightList[i], rightList[j]] = [rightList[j], rightList[i]];
    }

    sanitizedQ.matchingPairs = sanitizedQ.matchingPairs.map((pair, idx) => ({
      left: pair.left,
      leftChart: pair.leftChart,
      right: rightList[idx].right,
      rightChart: rightList[idx].rightChart,
      weight: pair.weight,
    }));
  }

  return sanitizedQ;
}

export async function getExamMetaBundle(code: string, isPreview = false) {
  const metaCacheKey = `${code}:${isPreview ? 'preview' : 'std'}`;
  const cachedMeta = memoryMetaCache.get(metaCacheKey);
  if (cachedMeta && Date.now() - cachedMeta.timestamp < META_CACHE_TTL_MS) {
    return {
      success: true,
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
        success: true,
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

  const { client: primaryDb, isServiceRole } = getServerSupabase();
  let db = primaryDb;

  let { data, error } = await db
    .from('exams')
    .select('code, author_id, school, config, status, created_at')
    .eq('code', code)
    .maybeSingle();

  if (error && isServiceRole) {
    db = anonSupabase;
    const retryRes = await db
      .from('exams')
      .select('code, author_id, school, config, status, created_at')
      .eq('code', code)
      .maybeSingle();
    data = retryRes.data;
    error = retryRes.error;
  }

  if (error || !data) {
    return { success: false, status: 404, error: 'EXAM_NOT_FOUND' };
  }

  if (data.status === 'DRAFT' && !isPreview) {
    return { success: false, status: 403, error: 'EXAM_IS_DRAFT' };
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

  setBoundedCache(memoryMetaCache, metaCacheKey, entry, 200, META_CACHE_TTL_MS);

  return {
    success: true,
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

/**
 * Fetch and prepare the sanitized student question package + student-allowed config.
 * Answers, solution steps, and collaborator secret tokens are 100% stripped before return.
 */
export async function getStudentQuestionBundle(code: string, requestedVersion?: number, isPreview = false) {
  const modeKey = isPreview ? 'preview' : 'std';
  const cacheKey = `${code}:${requestedVersion || 'latest'}:${modeKey}`;
  const cached = memoryBundleCache.get(cacheKey) || (!isPreview ? memoryBundleCache.get(`${code}:latest:std`) : undefined);

  if (
    cached &&
    Date.now() - cached.timestamp < BUNDLE_CACHE_TTL_MS &&
    (!requestedVersion || cached.version === requestedVersion)
  ) {
    return {
      success: true,
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

  const { client: primaryDb, isServiceRole } = getServerSupabase();
  let db = primaryDb;

  let { data, error } = await db
    .from('exams')
    .select('code, author_id, school, questions, config, status, created_at')
    .eq('code', code)
    .maybeSingle();

  if (error && isServiceRole) {
    db = anonSupabase;
    const retryRes = await db
      .from('exams')
      .select('code, author_id, school, questions, config, status, created_at')
      .eq('code', code)
      .maybeSingle();
    data = retryRes.data;
    error = retryRes.error;
  }

  if (error || !data) {
    return {
      success: false,
      status: 404,
      error: 'EXAM_NOT_FOUND',
    };
  }

  if (data.status === 'DRAFT' && !isPreview) {
    return {
      success: false,
      status: 403,
      error: 'EXAM_IS_DRAFT',
    };
  }

  const rawQuestions: Question[] = Array.isArray(data.questions) ? data.questions : [];
  const sanitizedQuestions = rawQuestions.map((q) => stripAnswersFromQuestion(q));
  const sanitizedConfig = sanitizeConfigForStudent(data.config, data.status);
  const examVersion = typeof sanitizedConfig.version === 'number' ? sanitizedConfig.version : 1;
  const authorName = String(sanitizedConfig.authorName || 'Pengajar');

  const bundleEntry: CachedBundle = {
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
    setBoundedCache(memoryBundleCache, `${code}:latest:std`, bundleEntry, MAX_BUNDLE_CACHE_SIZE, BUNDLE_CACHE_TTL_MS);
    setBoundedCache(memoryBundleCache, `${code}:v${examVersion}:std`, bundleEntry, MAX_BUNDLE_CACHE_SIZE, BUNDLE_CACHE_TTL_MS);
    setBoundedCache(memoryMetaCache, `${code}:std`, bundleEntry, 200, META_CACHE_TTL_MS);
  }

  return {
    success: true,
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

export function storeWarmBundleInMemory(code: string, rawBundle: any) {
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

  const rawQuestions: Question[] = Array.isArray(rawBundle?.questions) ? rawBundle.questions : [];
  const sanitizedQuestions = rawQuestions.map((q) => stripAnswersFromQuestion(q));
  const authorName = String(rawBundle?.authorName || sanitizedConfig.authorName || 'Pengajar');

  const entry: CachedBundle = {
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
  setBoundedCache(memoryMetaCache, `${code}:std`, entry, 200, META_CACHE_TTL_MS);

  return entry;
}

export interface SolutionOwnershipProof {
  deviceId?: string;
  resultId?: string | number;
}

export async function getAuthorizedExamSolutions(
  code: string,
  studentId?: string,
  proctorToken?: string,
  proof?: SolutionOwnershipProof
) {
  if (!code) {
    return { success: false, status: 400, error: 'EXAM_CODE_REQUIRED' };
  }

  const { client: primaryDb, isServiceRole } = getServerSupabase();
  let db = primaryDb;

  let { data: exam, error: examError } = await db
    .from('exams')
    .select('code, config, status')
    .eq('code', code)
    .maybeSingle();

  if (examError && isServiceRole) {
    db = anonSupabase;
    const retryRes = await db
      .from('exams')
      .select('code, config, status')
      .eq('code', code)
      .maybeSingle();
    exam = retryRes.data;
    examError = retryRes.error;
  }

  if (examError || !exam) {
    return { success: false, status: 404, error: 'EXAM_NOT_FOUND' };
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
        success: false,
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
      const dbDeviceId = String(result.device_id || (result.answers as Record<string, unknown> | null)?._deviceId || '').trim();
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
          success: false,
          status: 403,
          error: 'ACCESS_DENIED_OWNERSHIP_PROOF',
        };
      }
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    return {
      success: false,
      status: 403,
      error: 'ACCESS_DENIED_EXAM_NOT_COMPLETED',
    };
  }

  const examVersion = typeof (config as any).version === 'number' ? (config as any).version : 1;
  const solCacheKey = `${code}:v${examVersion}`;
  const cachedSolutions = memorySolutionsCache.get(solCacheKey);
  if (cachedSolutions && Date.now() - cachedSolutions.timestamp < SOLUTIONS_CACHE_TTL_MS) {
    return {
      success: true,
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
    return { success: false, status: 404, error: 'EXAM_NOT_FOUND' };
  }

  const rawQuestions: Question[] = Array.isArray(qRow.questions) ? qRow.questions : [];
  const solutions: Record<string, SolutionEntry> = {};

  rawQuestions.forEach((q) => {
    solutions[q.id] = {
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      solutionSteps: q.solutionSteps,
      trueFalseRows: q.trueFalseRows?.map((r) => ({ text: r.text, answer: r.answer })),
      matchingPairs: q.matchingPairs?.map((m) => ({ left: m.left, right: m.right })),
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
    success: true,
    code,
    solutions,
  };
}
