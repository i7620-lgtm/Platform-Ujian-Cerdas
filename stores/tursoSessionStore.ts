import { create } from 'zustand';
import { offlineService } from '../services/offline';

export interface TursoMetaEntry {
  status: string;
  version: number;
  updatedAt: number;
  checkedAt: number;
}

interface TursoSessionState {
  examKeys: Record<string, string>;
  tursoMetaCache: Record<string, TursoMetaEntry>;
  tursoUrl: string | null;
  setTursoUrl: (url: string) => void;
  setExamKey: (code: string, examKey: string) => void;
  getExamKey: (code: string) => string | null;
  hydrateExamKey: (code: string) => Promise<string | null>;
  clearExamKey: (code: string) => Promise<void>;
  setTursoMeta: (code: string, meta: Omit<TursoMetaEntry, 'checkedAt'>) => void;
  getTursoMeta: (code: string) => TursoMetaEntry | null;
}

const TURSO_KEY_PREFIX = 'turso_key_';
const TURSO_URL_STORAGE_KEY = 'turso_client_url';
const MAX_RAM_KEY_ENTRIES = 24;

function normalizeCode(code: string): string {
  return String(code || '').trim().toUpperCase();
}

export const useTursoSessionStore = create<TursoSessionState>((set, get) => ({
  examKeys: {},
  tursoMetaCache: {},
  tursoUrl: null,

  setTursoUrl: (rawUrl) => {
    const clean = String(rawUrl || '').trim();
    if (!clean) return;
    if (get().tursoUrl !== clean) {
      set({ tursoUrl: clean });
      offlineService.saveLocalProgress(TURSO_URL_STORAGE_KEY, clean).catch(() => {});
    }
  },

  setExamKey: (rawCode, examKey) => {
    const code = normalizeCode(rawCode);
    const cleanKey = String(examKey || '').trim();
    if (!code || !cleanKey) return;

    set((state) => {
      const next = { ...state.examKeys, [code]: cleanKey };
      const keys = Object.keys(next);
      if (keys.length > MAX_RAM_KEY_ENTRIES) {
        const oldestKey = keys.find((k) => k !== code);
        if (oldestKey) delete next[oldestKey];
      }
      return { examKeys: next };
    });

    offlineService.saveLocalProgress(`${TURSO_KEY_PREFIX}${code}`, cleanKey).catch(() => {});
  },

  getExamKey: (rawCode) => {
    const code = normalizeCode(rawCode);
    if (!code) return null;
    return get().examKeys[code] || null;
  },

  hydrateExamKey: async (rawCode) => {
    const code = normalizeCode(rawCode);
    if (!code) return null;

    if (!get().tursoUrl) {
      try {
        const storedUrl = await offlineService.getLocalProgress(TURSO_URL_STORAGE_KEY);
        if (typeof storedUrl === 'string' && storedUrl.trim()) {
          set({ tursoUrl: storedUrl.trim() });
        }
      } catch {
        /* ignore */
      }
    }

    const existing = get().examKeys[code];
    if (existing) return existing;

    try {
      const stored = await offlineService.getLocalProgress(`${TURSO_KEY_PREFIX}${code}`);
      if (typeof stored === 'string' && stored.trim().length > 16) {
        const cleanKey = stored.trim();
        set((state) => ({
          examKeys: { ...state.examKeys, [code]: cleanKey },
        }));
        return cleanKey;
      }
    } catch {
      /* ignore local storage read errors */
    }
    return null;
  },

  clearExamKey: async (rawCode) => {
    const code = normalizeCode(rawCode);
    if (!code) return;

    set((state) => {
      if (!state.examKeys[code] && !state.tursoMetaCache[code]) {
        return state;
      }
      const nextKeys = { ...state.examKeys };
      delete nextKeys[code];
      const nextMeta = { ...state.tursoMetaCache };
      delete nextMeta[code];
      return { examKeys: nextKeys, tursoMetaCache: nextMeta };
    });

    await offlineService.clearLocalProgress(`${TURSO_KEY_PREFIX}${code}`).catch(() => {});
  },

  setTursoMeta: (rawCode, meta) => {
    const code = normalizeCode(rawCode);
    if (!code) return;
    set((state) => {
      const next = {
        ...state.tursoMetaCache,
        [code]: {
          ...meta,
          checkedAt: Date.now(),
        },
      };
      const keys = Object.keys(next);
      if (keys.length > MAX_RAM_KEY_ENTRIES) {
        const oldestKey = keys.find((k) => k !== code);
        if (oldestKey) delete next[oldestKey];
      }
      return { tursoMetaCache: next };
    });
  },

  getTursoMeta: (rawCode) => {
    const code = normalizeCode(rawCode);
    if (!code) return null;
    return get().tursoMetaCache[code] || null;
  },
}));
