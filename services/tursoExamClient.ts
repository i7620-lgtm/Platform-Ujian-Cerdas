import type { ExamConfig, Question } from '../types';
import { supabase } from '../lib/supabase';
import { useTursoSessionStore } from '../stores/tursoSessionStore';

export interface TursoMetaResult {
  code: string;
  status: string;
  version: number;
  updatedAt: number;
}

export interface TursoDecryptedBundle {
  code: string;
  authorId?: string;
  authorName?: string;
  authorSchool?: string;
  status: string;
  version: number;
  config: ExamConfig;
  questions: Question[];
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

function getClientTursoConfig(): { url: string; readToken: string } {
  const env = (import.meta as any).env || {};
  const storeState = useTursoSessionStore.getState();
  const url = normalizeTursoHttpUrl(
    env.VITE_TURSO_DATABASE_URL || env.VITE_TURSO_URL || env.VITE_TURSO_DB_URL || storeState.tursoUrl || ''
  );
  const readToken = String(env.VITE_TURSO_READ_TOKEN || storeState.tursoReadToken || '').trim();
  return { url, readToken };
}

export function isTursoClientConfigured(): boolean {
  const { url, readToken } = getClientTursoConfig();
  return Boolean(url && readToken && typeof crypto !== 'undefined' && crypto.subtle);
}

export async function ensureTursoClientReady(rawCode: string): Promise<boolean> {
  if (isTursoClientConfigured()) return true;
  if (typeof crypto === 'undefined' || !crypto.subtle) return false;
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) return false;

  await useTursoSessionStore.getState().hydrateExamKey(code);
  if (isTursoClientConfigured()) return true;

  await ensureExamDecryptionKey(code, false);
  return isTursoClientConfigured();
}

function base64UrlToUint8Array(b64u: string): Uint8Array {
  const padLen = (4 - (b64u.length % 4)) % 4;
  const b64 = (b64u + '='.repeat(padLen)).replace(/-/g, '+').replace(/_/g, '/');
  const binStr = atob(b64);
  const bytes = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) {
    bytes[i] = binStr.charCodeAt(i);
  }
  return bytes;
}

async function decryptTursoEnvelopeInBrowser(
  keyBase64Url: string,
  envelope: string
): Promise<TursoDecryptedBundle | null> {
  const parts = String(envelope || '').split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') {
    return null;
  }
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    return null;
  }

  const keyBytes = base64UrlToUint8Array(keyBase64Url);
  const iv = base64UrlToUint8Array(parts[1]);
  const cipherWithTag = base64UrlToUint8Array(parts[2]);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes.buffer as ArrayBuffer,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    cryptoKey,
    cipherWithTag.buffer as ArrayBuffer
  );

  const plaintext = new TextDecoder('utf-8').decode(decryptedBuffer);
  const parsed = JSON.parse(plaintext) as TursoDecryptedBundle;
  if (!parsed || typeof parsed !== 'object' || !parsed.config) {
    return null;
  }
  return parsed;
}

function decodeTursoCellValue(cell: any): any {
  if (!cell || cell.type === 'null') return null;
  if (cell.type === 'integer') return Number(cell.value);
  if (cell.type === 'float') return Number(cell.value);
  return cell.value ?? null;
}

async function queryTursoReadOnlyRow(
  sql: string,
  examCode: string
): Promise<Record<string, any> | null> {
  const { url, readToken } = getClientTursoConfig();
  if (!url || !readToken) return null;

  const response = await fetch(`${url}/v2/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${readToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          type: 'execute',
          stmt: {
            sql,
            args: [{ type: 'text', value: examCode }],
          },
        },
        { type: 'close' },
      ],
    }),
  });

  if (!response.ok) return null;

  const data = (await response.json()) as {
    results?: Array<{
      type: string;
      response?: {
        result?: {
          cols?: Array<{ name: string }>;
          rows?: Array<Array<any>>;
        };
      };
    }>;
  };

  const first = data?.results?.[0];
  if (!first || first.type !== 'ok') return null;

  const result = first.response?.result;
  const cols = result?.cols || [];
  const rows = result?.rows || [];
  if (rows.length === 0) return null;

  const rowObj: Record<string, any> = {};
  cols.forEach((col, idx) => {
    rowObj[col.name] = decodeTursoCellValue(rows[0][idx]);
  });
  return rowObj;
}

/**
 * Lightweight open-column poll directly against Turso (~100 bytes, 0 Vercel requests, 0 Supabase egress).
 */
export async function fetchTursoExamMeta(rawCode: string): Promise<TursoMetaResult | null> {
  if (!isTursoClientConfigured()) return null;
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) return null;

  try {
    const row = await queryTursoReadOnlyRow(
      'SELECT code, status, version, updated_at FROM turso_exams WHERE code = ? LIMIT 1',
      code
    );
    if (!row || !row.code) return null;

    const meta: TursoMetaResult = {
      code: String(row.code),
      status: String(row.status || 'PUBLISHED'),
      version: Number(row.version) || 1,
      updatedAt: Number(row.updated_at) || 0,
    };

    useTursoSessionStore.getState().setTursoMeta(code, meta);
    return meta;
  } catch {
    return null;
  }
}

/**
 * Obtain per-exam AES-256-GCM decryption key from RAM/IndexedDB first, or 1-time request to Vercel /key.
 */
export async function ensureExamDecryptionKey(
  rawCode: string,
  isPreview = false
): Promise<{
  examKey?: string;
  status?: string;
  version?: number;
  tursoEnabled?: boolean;
  isClosed?: boolean;
  errorCode?: string;
} | null> {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) return null;

  const store = useTursoSessionStore.getState();
  const cachedKey = await store.hydrateExamKey(code);
  if (cachedKey) {
    return { examKey: cachedKey, tursoEnabled: true };
  }

  try {
    const res = await fetch(`/api/exam-content/${code}/key?preview=${Boolean(isPreview)}`);
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) return null;
    const json = await res.json();

    if (!res.ok || !json?.success) {
      return { errorCode: json?.error, tursoEnabled: false };
    }

    if (json.tursoUrl) {
      useTursoSessionStore.getState().setTursoUrl(String(json.tursoUrl));
    }

    if (json.tursoReadToken) {
      useTursoSessionStore.getState().setTursoReadToken(String(json.tursoReadToken));
    }

    if (json.examKey && json.tursoEnabled) {
      useTursoSessionStore.getState().setExamKey(code, String(json.examKey));
    }

    return {
      examKey: json.examKey,
      status: json.status,
      version: json.version,
      tursoEnabled: Boolean(json.tursoEnabled),
      isClosed: Boolean(json.isClosed),
    };
  } catch {
    return null;
  }
}

/**
 * Fetch sanitized encrypted exam bundle directly from Turso and decrypt locally via Web Crypto.
 */
export async function fetchAndDecryptTursoExamBundle(
  rawCode: string,
  options?: { isPreview?: boolean }
): Promise<{
  bundle?: TursoDecryptedBundle;
  isClosed?: boolean;
  errorCode?: string;
} | null> {
  if (!isTursoClientConfigured() || options?.isPreview) {
    return null;
  }

  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) return null;

  try {
    const row = await queryTursoReadOnlyRow(
      'SELECT code, status, version, updated_at, encrypted_payload FROM turso_exams WHERE code = ? LIMIT 1',
      code
    );

    if (!row) {
      return null;
    }

    const rowStatus = String(row.status || 'PUBLISHED');
    const rowVersion = Number(row.version) || 1;
    useTursoSessionStore.getState().setTursoMeta(code, {
      status: rowStatus,
      version: rowVersion,
      updatedAt: Number(row.updated_at) || 0,
    });

    if (rowStatus === 'closed') {
      return { isClosed: true };
    }

    if (typeof row.encrypted_payload !== 'string' || !row.encrypted_payload) {
      return null;
    }

    const keyRes = await ensureExamDecryptionKey(code, false);
    if (keyRes?.errorCode) {
      return { errorCode: keyRes.errorCode };
    }
    if (keyRes?.isClosed) {
      return { isClosed: true };
    }
    if (!keyRes?.examKey) {
      return null;
    }

    let decrypted = await decryptTursoEnvelopeInBrowser(keyRes.examKey, row.encrypted_payload).catch(() => null);
    if (!decrypted) {
      // Key in local cache might be stale/invalid; refresh once from server
      await useTursoSessionStore.getState().clearExamKey(code);
      const freshKeyRes = await ensureExamDecryptionKey(code, false);
      if (freshKeyRes?.examKey) {
        decrypted = await decryptTursoEnvelopeInBrowser(freshKeyRes.examKey, row.encrypted_payload).catch(() => null);
      }
    }

    if (!decrypted) return null;

    return {
      bundle: {
        ...decrypted,
        code,
        status: rowStatus,
        version: rowVersion,
      },
    };
  } catch {
    return null;
  }
}

async function buildTeacherAuthHeaders(proctorToken?: string): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (proctorToken) {
    headers['X-Proctor-Token'] = proctorToken;
  }
  try {
    const { data } = await supabase.auth.getSession();
    const accessToken = data?.session?.access_token;
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
  } catch {
    /* ignore */
  }
  return headers;
}

export async function syncExamToTursoFromClient(
  rawCode: string,
  proctorToken?: string,
  examBundle?: Record<string, any>
): Promise<boolean> {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) return false;
  try {
    const headers = await buildTeacherAuthHeaders(proctorToken);
    if (!headers['Authorization'] && !headers['X-Proctor-Token']) {
      console.warn('[TursoSync] Dilewati: tidak ada sesi guru atau token kolaborator untuk kode', code);
      return false;
    }
    const res = await fetch(`/api/exam-content/${code}/sync-turso`, {
      method: 'POST',
      headers,
      body: JSON.stringify(examBundle ? { code, examBundle } : { code }),
    });
    const ct = res.headers.get('content-type') || '';
    const json = ct.includes('application/json') ? await res.json().catch(() => null) : null;
    if (!res.ok || !json?.tursoSynced) {
      console.warn('[TursoSync] Sinkronisasi ke Turso tidak aktif/gagal:', res.status, json?.error || json?.reason || res.statusText);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[TursoSync] Gagal menghubungi server sinkronisasi Turso:', err);
    return false;
  }
}

export async function deleteExamFromTursoFromClient(rawCode: string, proctorToken?: string): Promise<void> {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) return;
  try {
    const headers = await buildTeacherAuthHeaders(proctorToken);
    if (!headers['Authorization'] && !headers['X-Proctor-Token']) {
      return;
    }
    await fetch(`/api/exam-content/${code}/delete-turso`, {
      method: 'DELETE',
      headers,
    }).catch(() => {});
  } catch {
    /* graceful non-blocking fallback */
  }
}
