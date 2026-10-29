import { supabase } from '../lib/supabase.ts';
import type { Question } from '../types.ts';

// In-memory origin cache to shield Supabase from simultaneous origin requests
interface CachedBundle {
  code: string;
  version: number;
  questions: Question[];
  timestamp: number;
}

const memoryBundleCache = new Map<string, CachedBundle>();
const MEMORY_CACHE_TTL_MS = 60 * 1000; // 1 minute in memory

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
export async function getStudentQuestionBundle(code: string, requestedVersion?: number) {
  const cacheKey = `${code}:${requestedVersion || 'latest'}`;
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

  const { data, error } = await supabase
    .from('exams')
    .select('code, questions, config, status, version, updated_at')
    .eq('code', code)
    .maybeSingle();

  if (error || !data) {
    return {
      success: false,
      status: 404,
      error: 'EXAM_NOT_FOUND'
    };
  }

  if (data.status === 'DRAFT') {
    return {
      success: false,
      status: 403,
      error: 'EXAM_IS_DRAFT'
    };
  }

  const rawQuestions: Question[] = Array.isArray(data.questions) ? data.questions : [];
  const sanitizedQuestions = rawQuestions.map(q => stripAnswersFromQuestion(q));
  const examVersion = typeof data.version === 'number' ? data.version : 1;

  memoryBundleCache.set(cacheKey, {
    code,
    version: examVersion,
    questions: sanitizedQuestions,
    timestamp: Date.now()
  });

  return {
    success: true,
    code: data.code,
    version: examVersion,
    questions: sanitizedQuestions,
    source: 'origin_database'
  };
}

/**
 * Fetch exam solutions and answer keys with rigorous authorization guards:
 * 1. Checks if teacher enabled showCorrectAnswer / showSolutionSteps / showResultToStudent.
 * 2. Checks if student has already completed the exam (or is authorized proctor).
 */
export async function getAuthorizedExamSolutions(
  code: string,
  studentId?: string,
  proctorToken?: string
) {
  if (!code) {
    return { success: false, status: 400, error: 'EXAM_CODE_REQUIRED' };
  }

  // 1. Fetch exam configuration & full questions
  const { data: exam, error: examError } = await supabase
    .from('exams')
    .select('code, questions, config, status')
    .eq('code', code)
    .maybeSingle();

  if (examError || !exam) {
    return { success: false, status: 404, error: 'EXAM_NOT_FOUND' };
  }

  const config = exam.config || {};
  const isSolutionsAllowed = Boolean(
    config.showCorrectAnswer || config.showSolutionSteps || config.showResultToStudent
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

  // If student requesting, verify student result has completed status in database
  if (!isAuthorized && studentId && studentId !== 'monitor') {
    if (!isSolutionsAllowed) {
      return {
        success: false,
        status: 403,
        error: 'SOLUTIONS_DISABLED_BY_TEACHER'
      };
    }

    const { data: result } = await supabase
      .from('results')
      .select('status')
      .eq('exam_code', code)
      .eq('student_id', studentId)
      .maybeSingle();

    if (result && (result.status === 'completed' || result.status === 'force_closed')) {
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

  // Extract solutions map keyed by question ID
  const rawQuestions: Question[] = Array.isArray(exam.questions) ? exam.questions : [];
  const solutions: Record<string, {
    correctAnswer?: string;
    explanation?: string;
    solutionSteps?: string;
    trueFalseRows?: { text: string; answer: boolean }[];
    matchingPairs?: { left: string; right: string }[];
  }> = {};

  rawQuestions.forEach(q => {
    solutions[q.id] = {
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      solutionSteps: q.solutionSteps,
      trueFalseRows: q.trueFalseRows?.map(r => ({ text: r.text, answer: r.answer })),
      matchingPairs: q.matchingPairs?.map(m => ({ left: m.left, right: m.right }))
    };
  });

  return {
    success: true,
    code,
    solutions
  };
}
