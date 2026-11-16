import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://fidxmkjpdlfawagawrrm.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZHhta2pwZGxmYXdhZ2F3cnJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NDgzNjksImV4cCI6MjA4NTMyNDM2OX0.X-ln0rn5tpGgrCpPxiv-FkfPuvAAmORdNRaqwa9RetM';

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

interface CachedQuestionBundle extends CachedMetaBundle {
  questions: any[];
}

interface CachedSolutionsBundle {
  solutions: Record<string, any>;
  timestamp: number;
}

const memoryMetaCache = new Map<string, CachedMetaBundle>();
const memoryBundleCache = new Map<string, CachedQuestionBundle>();
const memorySolutionsCache = new Map<string, CachedSolutionsBundle>();

const META_CACHE_TTL_MS = 10 * 1000;
const BUNDLE_CACHE_TTL_MS = 10 * 60 * 1000;
const SOLUTIONS_CACHE_TTL_MS = 60 * 1000;

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

  // Strip collaborator secret tokens before caching/returning to students
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

function stripAnswersFromQuestion(q: any): any {
  const sanitizedQ = q && typeof q === 'object' ? { ...q } : {};
  if (Array.isArray(sanitizedQ.options)) {
    sanitizedQ.options = [...sanitizedQ.options];
  }

  // STRICT FAILSAFE: Delete correct answers and detailed solution steps
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
      right: p.right,
      rightChart: p.rightChart,
    }));
    for (let i = rightList.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rightList[i], rightList[j]] = [rightList[j], rightList[i]];
    }

    sanitizedQ.matchingPairs = sanitizedQ.matchingPairs.map((pair: any, idx: number) => ({
      left: pair.left,
      leftChart: pair.leftChart,
      right: rightList[idx]?.right,
      rightChart: rightList[idx]?.rightChart,
      weight: pair.weight,
    }));
  }

  return sanitizedQ;
}

async function getExamMetaBundle(code: string, isPreview = false) {
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

async function getStudentQuestionBundle(code: string, requestedVersion?: number, isPreview = false) {
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
    return { success: false, status: 404, error: 'EXAM_NOT_FOUND' };
  }

  if (data.status === 'DRAFT' && !isPreview) {
    return { success: false, status: 403, error: 'EXAM_IS_DRAFT' };
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

  setBoundedCache(memoryBundleCache, cacheKey, bundleEntry, 150, BUNDLE_CACHE_TTL_MS);
  if (!isPreview) {
    setBoundedCache(memoryBundleCache, `${code}:latest:std`, bundleEntry, 150, BUNDLE_CACHE_TTL_MS);
    setBoundedCache(memoryBundleCache, `${code}:v${examVersion}:std`, bundleEntry, 150, BUNDLE_CACHE_TTL_MS);
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

function storeWarmBundleInMemory(code: string, rawBundle: any) {
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

  const rawQuestions = Array.isArray(rawBundle?.questions) ? rawBundle.questions : [];
  const sanitizedQuestions = rawQuestions.map((q: any) => stripAnswersFromQuestion(q));
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

  setBoundedCache(memoryBundleCache, `${code}:latest:std`, entry, 150, BUNDLE_CACHE_TTL_MS);
  setBoundedCache(memoryBundleCache, `${code}:${version}:std`, entry, 150, BUNDLE_CACHE_TTL_MS);
  setBoundedCache(memoryBundleCache, `${code}:v${version}:std`, entry, 150, BUNDLE_CACHE_TTL_MS);
  setBoundedCache(memoryMetaCache, `${code}:std`, entry, 200, META_CACHE_TTL_MS);

  return entry;
}

async function getAuthorizedExamSolutions(
  code: string,
  studentId?: string,
  proctorToken?: string,
  proof?: { deviceId?: string; resultId?: string | number }
) {
  if (!code) {
    return { success: false, status: 400, error: 'EXAM_CODE_REQUIRED' };
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
      return { success: false, status: 403, error: 'SOLUTIONS_DISABLED_BY_TEACHER' };
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
        return { success: false, status: 403, error: 'ACCESS_DENIED_OWNERSHIP_PROOF' };
      }
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    return { success: false, status: 403, error: 'ACCESS_DENIED_EXAM_NOT_COMPLETED' };
  }

  const examVersion = typeof config.version === 'number' ? config.version : 1;
  const solCacheKey = `${code}:v${examVersion}`;
  const cachedSolutions = memorySolutionsCache.get(solCacheKey);
  if (cachedSolutions && Date.now() - cachedSolutions.timestamp < SOLUTIONS_CACHE_TTL_MS) {
    return { success: true, code, solutions: cachedSolutions.solutions };
  }

  const { data: qRow, error: qErr } = await db
    .from('exams')
    .select('questions')
    .eq('code', code)
    .maybeSingle();

  if (qErr || !qRow) {
    return { success: false, status: 404, error: 'EXAM_NOT_FOUND' };
  }

  const rawQuestions: any[] = Array.isArray(qRow.questions) ? qRow.questions : [];
  const solutions: Record<string, any> = {};

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
    { solutions, timestamp: Date.now() },
    100,
    SOLUTIONS_CACHE_TTL_MS
  );

  return { success: true, code, solutions };
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Proctor-Token, X-Device-Id, X-Result-Id'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const reqUrl = new URL(req.url || '/', 'http://localhost');
  const invokePath =
    (req.headers && (req.headers['x-invoke-path'] || req.headers['x-matched-path'])) ||
    reqUrl.pathname ||
    '/';
  const invokePathname = new URL(String(invokePath), 'http://localhost').pathname.replace(/\/+$/, '');
  const reqPathname = reqUrl.pathname.replace(/\/+$/, '');

  const routeMatch =
    reqPathname.match(/\/api\/exam-content\/([^/]+)\/(meta|test|solutions|warm)/) ||
    invokePathname.match(/\/api\/exam-content\/([^/]+)\/(meta|test|solutions|warm)/);

  let parsedBody: any = req.body;
  if (typeof parsedBody === 'string') {
    try {
      parsedBody = JSON.parse(parsedBody);
    } catch {
      parsedBody = {};
    }
  }

  let code = routeMatch
    ? routeMatch[1]
    : req.query?.code || reqUrl.searchParams.get('code') || parsedBody?.code || parsedBody?.examBundle?.code || '';
  const action = routeMatch
    ? routeMatch[2]
    : req.query?.action ||
      req.query?.type ||
      reqUrl.searchParams.get('action') ||
      reqUrl.searchParams.get('type') ||
      (reqPathname.endsWith('/warm') || invokePathname.endsWith('/warm') ? 'warm' : 'test');

  const versionParam = req.query?.v || reqUrl.searchParams.get('v');
  const versionNum = versionParam ? parseInt(String(versionParam), 10) : undefined;
  const isPreview =
    req.query?.preview === 'true' ||
    req.query?.isPreview === 'true' ||
    reqUrl.searchParams.get('preview') === 'true' ||
    reqUrl.searchParams.get('isPreview') === 'true';

  code = String(code || '').trim().toUpperCase();

  if (!code) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(400).json({ success: false, error: 'Exam code is required' });
  }

  try {
    if (action === 'meta') {
      const meta = await getExamMetaBundle(code, isPreview);
      res.setHeader('Content-Type', 'application/json');
      if (!meta.success) {
        res.setHeader('Cache-Control', 'no-store');
        return res.status((meta as any).status || 500).json(meta);
      }

      if (isPreview) {
        res.setHeader('Cache-Control', 'no-store');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=10, stale-while-revalidate=30');
        res.setHeader('CDN-Cache-Control', 'public, s-maxage=10');
        res.setHeader('Vercel-CDN-Cache-Control', 'public, s-maxage=10');
      }
      return res.status(200).json(meta);
    }

    if (action === 'test') {
      const bundle = await getStudentQuestionBundle(code, versionNum, isPreview);
      if (!bundle.success) {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        return res.status((bundle as any).status || 500).json(bundle);
      }

      if (!isPreview) {
        const etag = `"${code}-v${bundle.version}"`;
        if (req.headers && req.headers['if-none-match'] === etag) {
          return res.status(304).end();
        }
        res.setHeader('ETag', etag);
        res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=86400, stale-while-revalidate=3600');
        res.setHeader('CDN-Cache-Control', 'public, s-maxage=86400');
        res.setHeader('Vercel-CDN-Cache-Control', 'public, s-maxage=86400');
      } else {
        res.setHeader('Cache-Control', 'no-store');
      }

      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json(bundle);
    }

    if (action === 'solutions') {
      const studentId = req.query?.studentId || reqUrl.searchParams.get('studentId') || '';
      const proctorToken =
        req.query?.token || reqUrl.searchParams.get('token') || (req.headers && req.headers['x-proctor-token']) || '';
      const deviceId =
        req.query?.deviceId || reqUrl.searchParams.get('deviceId') || (req.headers && req.headers['x-device-id']) || '';
      const resultId =
        req.query?.resultId || reqUrl.searchParams.get('resultId') || (req.headers && req.headers['x-result-id']) || '';

      const result = await getAuthorizedExamSolutions(code, String(studentId), String(proctorToken), {
        deviceId: String(deviceId),
        resultId: String(resultId),
      });
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      if (!result.success) {
        return res.status((result as any).status || 403).json(result);
      }
      return res.status(200).json(result);
    }

    if (action === 'warm') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');

      if (
        req.method === 'POST' &&
        parsedBody?.examBundle &&
        Array.isArray(parsedBody.examBundle.questions)
      ) {
        const stored = storeWarmBundleInMemory(code, parsedBody.examBundle);
        if (stored) {
          return res.status(200).json({
            success: true,
            warmed: true,
            version: stored.version,
            source: 'publish_push',
          });
        }
      }

      const bundle = await getStudentQuestionBundle(code, versionNum);
      if (!bundle.success) {
        return res.status((bundle as any).status || 500).json(bundle);
      }
      return res.status(200).json({
        success: true,
        warmed: true,
        version: bundle.version,
        source: bundle.source,
      });
    }

    res.setHeader('Content-Type', 'application/json');
    return res.status(400).json({ success: false, error: `Invalid action: ${action}` });
  } catch (err: any) {
    console.error('Exam content handler error:', err);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ success: false, error: err?.message || 'Internal server error' });
  }
}
