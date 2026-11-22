import crypto from 'node:crypto';

export interface TursoSafeExamBundle<Q = Record<string, any>> {
  code: string;
  authorId?: string;
  authorName: string;
  authorSchool?: string;
  status: string;
  version: number;
  config: Record<string, any>;
  questions: Q[];
}

const TURSO_KEY_CONTEXT = 'turso-exam-v1';
const ENVELOPE_PREFIX = 'v1';

/**
 * Derive a deterministic 256-bit AES-GCM key per exam code from the server-only master secret.
 */
export function deriveTursoExamKeyBytes(masterSecret: string, examCode: string): Buffer {
  const secret = String(masterSecret || '').trim();
  const cleanCode = String(examCode || '').trim().toUpperCase();
  if (!secret || !cleanCode) {
    throw new Error('TURSO_EXAM_SECRET and examCode are required to derive key');
  }
  return crypto.createHmac('sha256', secret).update(`${TURSO_KEY_CONTEXT}:${cleanCode}`).digest();
}

export function deriveTursoExamKeyBase64Url(masterSecret: string, examCode: string): string {
  return deriveTursoExamKeyBytes(masterSecret, examCode).toString('base64url');
}

/**
 * Encrypt sanitized exam payload with AES-256-GCM (12-byte random IV + ciphertext + 16-byte tag).
 * Format matches browser Web Crypto AES-GCM decryption directly: "v1.<iv_b64u>.<cipher_and_tag_b64u>".
 */
export function encryptTursoBundlePayload(
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

export function decryptTursoBundlePayloadServer<T = any>(keyBase64Url: string, envelope: string): T {
  const parts = String(envelope || '').split('.');
  if (parts.length !== 3 || parts[0] !== ENVELOPE_PREFIX) {
    throw new Error('Invalid encrypted Turso payload envelope');
  }
  const keyBytes = Buffer.from(keyBase64Url, 'base64url');
  const iv = Buffer.from(parts[1], 'base64url');
  const cipherWithTag = Buffer.from(parts[2], 'base64url');
  if (cipherWithTag.length <= 16) {
    throw new Error('Malformed AES-GCM payload');
  }

  const ciphertext = cipherWithTag.subarray(0, cipherWithTag.length - 16);
  const authTag = cipherWithTag.subarray(cipherWithTag.length - 16);

  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBytes, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  return JSON.parse(plaintext) as T;
}

/**
 * Strictly strip answer keys, explanations, solution steps, scoring weights, and author prompts
 * before storing an exam question in Turso.
 */
export function sanitizeQuestionForTurso<T extends Record<string, any>>(q: T): T {
  const clean: Record<string, any> = q && typeof q === 'object' ? { ...q } : {};

  if (Array.isArray(clean.options)) {
    clean.options = [...clean.options];
  }

  // Strip answer keys, solutions, scoring weights, and internal author prompts
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

/**
 * Strictly sanitize exam config for Turso:
 * - Strip collaborator secret tokens
 * - Strip registeredStudents PII array (validated via Supabase at login)
 * - Strip certificateSettings (post-exam only)
 */
export function sanitizeConfigForTurso(config: any, status?: string): Record<string, any> {
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

export function buildTursoSafeBundle(rawExam: {
  code: string;
  authorId?: string;
  authorName?: string;
  authorSchool?: string;
  status?: string;
  version?: number;
  config?: any;
  questions?: any[];
}): TursoSafeExamBundle {
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
