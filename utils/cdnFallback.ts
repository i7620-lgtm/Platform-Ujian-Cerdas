import React from 'react';

export const RECOVERY_ATTEMPTS_KEY = 'ujiancerdas_cdn_recovery_attempts';
export const PENDING_PWA_REFRESH_KEY = 'pending_pwa_refresh';
export const EXAM_IN_PROGRESS_KEY = 'is_exam_in_progress';
export const ACTIVE_EXAM_SESSION_KEY = 'ujiancerdas_active_exam_session';
export const CACHE_BUST_PARAM = '_cdn_r';

const DEFAULT_MAX_ATTEMPTS = 2;
const DEFAULT_WINDOW_MS = 60_000;
const STABLE_BOOT_RESET_DELAY_MS = 10_000;

interface RecoveryAttemptState {
  count: number;
  ts: number;
}

export interface ServerJsDelivrProbeResult {
  reachable: boolean;
  serverUsesJsDelivr: boolean;
}

/**
 * Checks whether a student exam session is actively running so silent background
 * updates never interrupt an in-progress exam.
 */
export function isExamSessionActive(): boolean {
  try {
    if (
      typeof sessionStorage !== 'undefined' &&
      sessionStorage.getItem(EXAM_IN_PROGRESS_KEY) === 'true'
    ) {
      return true;
    }
    if (
      typeof localStorage !== 'undefined' &&
      Boolean(localStorage.getItem(ACTIVE_EXAM_SESSION_KEY))
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Inspects an HTML string to see whether it references application assets
 * hosted on jsDelivr GitHub CDN (`cdn.jsdelivr.net/gh/...`).
 * Specifically ignores `cdn.jsdelivr.net/npm/katex` so KaTeX stylesheets/scripts
 * never cause false positives.
 */
export function hasJsDelivrHtmlMarkup(html: string): boolean {
  if (!html) return false;
  const assetPattern = /cdn\.jsdelivr\.net\/gh\/[^"'\s>]+\/(?:dist\/)?assets\//i;
  const moduleSrcFirstPattern =
    /<script\b[^>]*src=["'][^"']*cdn\.jsdelivr\.net\/gh\/[^"']*["'][^>]*type=["']?module["']?[^>]*>/i;
  const moduleTypeFirstPattern =
    /<script\b[^>]*type=["']?module["']?[^>]*src=["'][^"']*cdn\.jsdelivr\.net\/gh\/[^"']*["'][^>]*>/i;

  return (
    assetPattern.test(html) ||
    moduleSrcFirstPattern.test(html) ||
    moduleTypeFirstPattern.test(html)
  );
}

/**
 * Checks whether the current document loaded its primary module entry script
 * from `cdn.jsdelivr.net/gh/...`.
 */
export function hasJsDelivrEntryScript(doc?: Document): boolean {
  const targetDoc = doc ?? (typeof document !== 'undefined' ? document : undefined);
  if (!targetDoc) return false;

  try {
    const scripts = targetDoc.querySelectorAll('script[type="module"][src]');
    for (let i = 0; i < scripts.length; i++) {
      const src = scripts[i].getAttribute('src') || '';
      if (/cdn\.jsdelivr\.net\/gh\//i.test(src)) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Fetches `/index.html` bypassing browser & Service Worker caches to confirm
 * whether the live origin is currently serving jsDelivr CDN assets.
 * Prevents infinite reload loops on localhost, preview builds, or `VITE_DISABLE_CDN`.
 */
export async function probeServerUsesJsDelivr(): Promise<ServerJsDelivrProbeResult> {
  if (typeof fetch === 'undefined' || typeof window === 'undefined') {
    return { reachable: false, serverUsesJsDelivr: false };
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { reachable: false, serverUsesJsDelivr: false };
  }

  try {
    const probeUrl = `/index.html?__cdn_probe=${Date.now()}`;
    const response = await fetch(probeUrl, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    });

    if (!response.ok) {
      return { reachable: false, serverUsesJsDelivr: false };
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType && !contentType.toLowerCase().includes('text/html')) {
      return { reachable: false, serverUsesJsDelivr: false };
    }

    const html = await response.text();
    return {
      reachable: true,
      serverUsesJsDelivr: hasJsDelivrHtmlMarkup(html),
    };
  } catch {
    return { reachable: false, serverUsesJsDelivr: false };
  }
}

/**
 * Selectively deletes Service Worker registrations and CacheStorage script/asset caches.
 * Strictly preserves `localStorage`, `sessionStorage`, and `IndexedDB` (`localforage`)
 * so student exam answers and teacher drafts remain 100% intact.
 */
export async function purgeScriptCachesOnly(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map((registration) => registration.unregister().catch(() => false))
      );
    }
  } catch {
    // Ignore restricted Service Worker contexts
  }

  try {
    if ('caches' in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key).catch(() => false)));
    }
  } catch {
    // Ignore restricted CacheStorage contexts
  }
}

function readAttemptState(storageKey: string, windowMs: number): RecoveryAttemptState {
  try {
    if (typeof sessionStorage === 'undefined') {
      return { count: 0, ts: Date.now() };
    }
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return { count: 0, ts: Date.now() };

    const parsed = JSON.parse(raw) as Partial<RecoveryAttemptState>;
    const now = Date.now();
    if (typeof parsed.ts !== 'number' || now - parsed.ts > windowMs) {
      return { count: 0, ts: now };
    }

    return {
      count: typeof parsed.count === 'number' && Number.isFinite(parsed.count) ? parsed.count : 0,
      ts: parsed.ts,
    };
  } catch {
    return { count: 0, ts: Date.now() };
  }
}

export function canAttemptAutoRecovery(
  storageKey = RECOVERY_ATTEMPTS_KEY,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  windowMs = DEFAULT_WINDOW_MS
): boolean {
  const state = readAttemptState(storageKey, windowMs);
  return state.count < maxAttempts;
}

export function recordRecoveryAttempt(
  storageKey = RECOVERY_ATTEMPTS_KEY,
  windowMs = DEFAULT_WINDOW_MS
): number {
  const state = readAttemptState(storageKey, windowMs);
  const nextState: RecoveryAttemptState = {
    count: state.count + 1,
    ts: state.count === 0 ? Date.now() : state.ts,
  };
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(storageKey, JSON.stringify(nextState));
    }
  } catch {
    // Ignore storage restriction
  }
  return nextState.count;
}

export function resetRecoveryAttempts(storageKey = RECOVERY_ATTEMPTS_KEY): void {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(storageKey);
    }
  } catch {
    // Ignore storage restriction
  }
}

/**
 * Removes the temporary cache-busting query param once the page has booted
 * so shared URLs stay clean while keeping params like `?code=`, `?collab=`, `?monitor=`.
 */
export function stripRecoveryQueryParam(): void {
  if (typeof window === 'undefined' || !window.history?.replaceState) return;
  try {
    const currentUrl = new URL(window.location.href);
    if (!currentUrl.searchParams.has(CACHE_BUST_PARAM)) return;
    currentUrl.searchParams.delete(CACHE_BUST_PARAM);
    window.history.replaceState(
      window.history.state,
      '',
      `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`
    );
  } catch {
    // Ignore invalid URL edge cases
  }
}

/**
 * Forces a cache-bypassing navigation reload that keeps path, query params, and hash intact.
 */
export function performCacheBustedReload(): void {
  if (typeof window === 'undefined') return;
  try {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set(CACHE_BUST_PARAM, String(Date.now()));
    window.location.replace(nextUrl.toString());
  } catch {
    window.location.reload();
  }
}

/**
 * Clears stale script caches and reloads if retry budget allows.
 * Returns `true` when recovery navigation was triggered.
 */
export async function recoverFromChunkOrCdnError(options?: {
  storageKey?: string;
  forceImmediate?: boolean;
}): Promise<boolean> {
  const storageKey = options?.storageKey ?? RECOVERY_ATTEMPTS_KEY;

  if (!options?.forceImmediate && !canAttemptAutoRecovery(storageKey)) {
    return false;
  }

  recordRecoveryAttempt(storageKey);
  await purgeScriptCachesOnly();
  performCacheBustedReload();
  return true;
}

export function isChunkOrDynamicImportError(error: unknown): boolean {
  if (!error) return false;
  const message =
    typeof error === 'string'
      ? error
      : `${(error as { name?: string })?.name || ''} ${(error as { message?: string })?.message || String(error)}`;

  return (
    (error as { name?: string })?.name === 'ChunkLoadError' ||
    /ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i.test(
      message
    ) ||
    (error instanceof TypeError && /fetch|import|module/i.test(message))
  );
}

/**
 * Shared React.lazy wrapper that purges stale Service Worker + CacheStorage caches
 * before reloading when a lazy chunk fails to load (preventing reload loops into stale cache).
 */
export function lazyWithRetry<T extends React.ComponentType<unknown>>(
  componentImport: () => Promise<{ default: T }>,
  keySuffix = 'shared'
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      if (isChunkOrDynamicImportError(error)) {
        const storageKey = `${RECOVERY_ATTEMPTS_KEY}_chunk_${keySuffix}`;
        if (
          typeof navigator !== 'undefined' &&
          navigator.onLine !== false &&
          canAttemptAutoRecovery(storageKey)
        ) {
          console.warn(
            `Chunk dinamis (${keySuffix}) gagal dimuat, membersihkan cache script & memuat ulang...`,
            error
          );
          const triggered = await recoverFromChunkOrCdnError({ storageKey });
          if (triggered) {
            return new Promise<never>(() => {});
          }
        }
      }
      throw error;
    }
  });
}

let bootVerifyStarted = false;

/**
 * Layer 2 runtime verification:
 * - Cleans temporary `_cdn_r` URL parameter if present.
 * - Schedules recovery-counter reset once the app runs stably.
 * - If current bundle is NOT served from jsDelivr while live server IS serving jsDelivr,
 *   either defers refresh (when student exam is active) or silently purges script caches
 *   and reloads into the jsDelivr build.
 */
export function verifyJsDelivrOriginOnBoot(): void {
  if (typeof window === 'undefined' || bootVerifyStarted) return;
  bootVerifyStarted = true;

  stripRecoveryQueryParam();

  // Clear attempt counters only after the app remains mounted stably
  window.setTimeout(() => {
    resetRecoveryAttempts();
  }, STABLE_BOOT_RESET_DELAY_MS);

  const runProbe = async () => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    if (hasJsDelivrEntryScript()) return;

    const probe = await probeServerUsesJsDelivr();
    if (!probe.reachable || !probe.serverUsesJsDelivr) return;

    if (isExamSessionActive()) {
      try {
        sessionStorage.setItem(PENDING_PWA_REFRESH_KEY, 'true');
      } catch {
        // Ignore restricted sessionStorage
      }
      console.info(
        'Versi jsDelivr terbaru terdeteksi. Pembaruan cache ditunda hingga sesi ujian selesai.'
      );
      return;
    }

    if (!canAttemptAutoRecovery()) return;
    console.info(
      'Aplikasi termuat dari cache lama non-jsDelivr. Membersihkan cache script & mengunduh ulang dari jsDelivr...'
    );
    await recoverFromChunkOrCdnError();
  };

  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  };
  if (typeof w.requestIdleCallback === 'function') {
    w.requestIdleCallback(() => {
      void runProbe();
    }, { timeout: 2500 });
  } else {
    window.setTimeout(() => {
      void runProbe();
    }, 1200);
  }
}
