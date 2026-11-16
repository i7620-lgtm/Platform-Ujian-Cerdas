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

// In-memory origin cache to shield Supabase from simultaneous origin requests
interface CachedBundle {
  code: string;
  version: number;
  questions: Question[];
  timestamp: number;
}

const memoryBundleCache = new Map<string, CachedBundle>();
const MEMORY_CACHE_TTL_MS = 60 * 1000; // 1 minute in memory
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
  maxSize: number
) {
  const now = Date.now();
  if (cache.size >= maxSize) {
    for (const [k, v] of cache.entries()) {
      if (now - v.timestamp >= MEMORY_CACHE_TTL_MS) {
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

export function stripAnswersFromQuestion(q: Question): Question {
  const sanitizedQ = { ...q } as Question;

  // STRICT FAILSAFE: Delete correct answers and detailed solution steps from student package
  delete sanitizedQ.correctAnswer;
  delete sanitizedQ.solutionSteps;

  if (sanitizedQ.trueFalseRows) {
    sanitizedQ.trueFalseRows = sanitizedQ.trueFalseRows.map(row => {
      const newRow = { ...row };
      delete newRow.answer;
      return newRow;
    });
  }

  if (sanitizedQ.matchingPairs) {
    // Shuffle right options so they cannot be deduced by array index
    const rightList = sanitizedQ.matchingPairs.map(p => ({
      right: p.right,
      rightChart: p.rightChart
    }));
    for (let i = rightList.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rightList[i], rightList[j]] = [rightList[j], rightList[i]];
    }

    sanitizedQ.matchingPairs = sanitizedQ.matchingPairs.map((pair, idx) => ({
      left: pair.left,
      leftChart: pair.leftChart,
      right: rightList[idx].right,
      rightChart: rightList[idx].rightChart
    }));
  }

  return sanitizedQ;
}

/**
 * Fetch and prepare the sanitized student question package.
 * Answers and solution steps are 100% stripped before return.
 */
export async function getStudentQuestionBundle(code: string, requestedVersion?: number, isPreview = false) {
  const cacheKey = `${code}:${requestedVersion || 'latest'}:${isPreview ? 'preview' : 'std'}`;
  const cached = memoryBundleCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < MEMORY_CACHE_TTL_MS) {
    return {
      success: true,
      code: cached.code,
      version: cached.version,
      questions: cached.questions,
      source: 'memory_edge_origin'
    };
  }

  const { client: primaryDb, isServiceRole } = getServerSupabase();
  let db = primaryDb;

  let { data, error } = await db
    .from('exams')
    .select('code, questions, config, status, created_at')
    .eq('code', code)
    .maybeSingle();

  if (error && isServiceRole) {
    db = anonSupabase;
    const retryRes = await db
      .from('exams')
      .select('code, questions, config, status, created_at')
      .eq('code', code)
      .maybeSingle();
    data = retryRes.data;
    error = retryRes.error;
  }

  if (error || !data) {
    return {
      success: false,
      status: 404,
      error: 'EXAM_NOT_FOUND'
    };
  }

  if (data.status === 'DRAFT' && !isPreview) {
    return {
      success: false,
      status: 403,
      error: 'EXAM_IS_DRAFT'
    };
  }

  const rawQuestions: Question[] = Array.isArray(data.questions) ? data.questions : [];
  const sanitizedQuestions = rawQuestions.map(q => stripAnswersFromQuestion(q));
  const examVersion = (data.config && typeof (data.config as any).version === 'number') ? (data.config as any).version : 1;

  setBoundedCache(
    memoryBundleCache,
    cacheKey,
    {
      code,
      version: examVersion,
      questions: sanitizedQuestions,
      timestamp: Date.now()
    },
    MAX_BUNDLE_CACHE_SIZE
  );

  return {
    success: true,
    code: data.code,
    version: examVersion,
    questions: sanitizedQuestions,
    source: 'origin_database'
  };
}

export interface SolutionOwnershipProof {
  deviceId?: string;
  resultId?: string | number;
}

/**
 * Fetch exam solutions and answer keys with rigorous authorization guards:
 * 1. Checks if teacher enabled showCorrectAnswer / showSolutionSteps / showResultToStudent.
 * 2. Checks if student has already completed the exam AND presents matching session ownership proof (no account login required), or is an authorized proctor.
 */
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

  // 1. Fetch lightweight exam config only (avoid downloading full questions JSONB until authorized & cache miss)
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

  // 2. Authorization check
  let isAuthorized = false;

  // Proctor / monitor bypass with matching token
  if (studentId === 'monitor' && config.enablePublicStream) {
    isAuthorized = true;
  } else if (proctorToken && Array.isArray(config.collaborators)) {
    const isProctor = config.collaborators.some(
      (c: any) => c.token === proctorToken && (c.role === 'editor' || c.role === 'viewer')
    );
    if (isProctor) isAuthorized = true;
  }

  // If student requesting, verify student result is completed and session ownership proof matches
  if (!isAuthorized && studentId && studentId !== 'monitor') {
    if (!isSolutionsAllowed) {
      return {
        success: false,
        status: 403,
        error: 'SOLUTIONS_DISABLED_BY_TEACHER'
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
          error: 'ACCESS_DENIED_OWNERSHIP_PROOF'
        };
      }
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    return {
      success: false,
      status: 403,
      error: 'ACCESS_DENIED_EXAM_NOT_COMPLETED'
    };
  }

  // 3. Check bounded in-memory solutions cache keyed by (code, version)
  const examVersion = typeof (config as any).version === 'number' ? (config as any).version : 1;
  const solCacheKey = `${code}:v${examVersion}`;
  const cachedSolutions = memorySolutionsCache.get(solCacheKey);
  if (cachedSolutions && Date.now() - cachedSolutions.timestamp < MEMORY_CACHE_TTL_MS) {
    return {
      success: true,
      code,
      solutions: cachedSolutions.solutions
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

  // Extract solutions map keyed by question ID
  const rawQuestions: Question[] = Array.isArray(qRow.questions) ? qRow.questions : [];
  const solutions: Record<string, SolutionEntry> = {};

  rawQuestions.forEach(q => {
    solutions[q.id] = {
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      solutionSteps: q.solutionSteps,
      trueFalseRows: q.trueFalseRows?.map(r => ({ text: r.text, answer: r.answer })),
      matchingPairs: q.matchingPairs?.map(m => ({ left: m.left, right: m.right }))
    };
  });

  setBoundedCache(
    memorySolutionsCache,
    solCacheKey,
    {
      solutions,
      timestamp: Date.now()
    },
    MAX_SOLUTIONS_CACHE_SIZE
  );

  return {
    success: true,
    code,
    solutions
  };
}
