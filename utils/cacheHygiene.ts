import type { Exam } from "../types";
import { offlineService } from "../services/offline";
import { toAbsoluteUtcTimestamp } from "./timezoneUtils";

const EXPIRED_GRACE_MS = 24 * 60 * 60 * 1000; // 24 jam setelah jadwal selesai berakhir
const ORPHAN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 hari untuk sisa cache progres yatim piatu

const isExamExpired = (exam: Partial<Exam> | null | undefined, nowMs: number): boolean => {
  if (!exam || typeof exam !== "object") return false;
  if (exam.status === "DRAFT") return false;

  const endDate = exam.config?.endDate?.trim();
  if (!endDate) return false;

  const endTime = exam.config?.endTime?.trim() || "23:59";
  const tz = exam.config?.timezone || "WIB";
  const deadlineMs = toAbsoluteUtcTimestamp(endDate, endTime, tz, true);

  return Number.isFinite(deadlineMs) && nowMs > deadlineMs + EXPIRED_GRACE_MS;
};

const getLocalStorageKeysSafely = (): string[] => {
  try {
    if (typeof window === "undefined" || !window.localStorage) return [];
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k) keys.push(k);
    }
    return keys;
  } catch {
    return [];
  }
};

/**
 * Menghapus cache lokal sementara milik perangkat/siswa untuk satu kode ujian tertentu.
 * Tidak menghapus cache draf guru (`teacher_exam_`) maupun item antrean sync offline.
 */
export const clearExamLocalCache = async (examCode: string): Promise<void> => {
  const cleanCode = (examCode || "").trim().toUpperCase();
  if (!cleanCode) return;

  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const exactKeys = [
        `exam_def_${cleanCode}`,
        `ujiancerdas_preview_exam_${cleanCode}`,
        `student_pref_${cleanCode}`,
        `completed_students_${cleanCode}`,
      ];
      exactKeys.forEach((key) => {
        try {
          window.localStorage.removeItem(key);
        } catch {
          /* ignore */
        }
      });

      const prefixes = [
        `exam_order_${cleanCode}_`,
        `exam_last_q_${cleanCode}_`,
        `exam_lock_${cleanCode}_`,
        `feedback_submitted_${cleanCode}_`,
      ];
      const allKeys = getLocalStorageKeysSafely();
      allKeys.forEach((key) => {
        if (prefixes.some((p) => key.startsWith(p))) {
          try {
            window.localStorage.removeItem(key);
          } catch {
            /* ignore */
          }
        }
      });
    }
  } catch {
    /* ignore localStorage cleanup errors */
  }

  try {
    await offlineService.clearLocalProgress(`offline_exam_${cleanCode}`);
    await offlineService.clearLocalProgress(`edge_bundle_${cleanCode}`);
    await offlineService.clearLocalProgressByPrefix(`exam_local_${cleanCode}_`);
  } catch {
    /* ignore IndexedDB cleanup errors */
  }
};

/**
 * Pembersihan otomatis cache lokal ujian yang sudah kedaluwarsa saat aplikasi dibuka.
 * Menjaga antrean sync offline, sesi aktif, serta draf/bank ujian guru tetap aman.
 */
export const cleanupExpiredExamCaches = async (): Promise<{
  removedExams: number;
  removedOrphans: number;
}> => {
  const summary = { removedExams: 0, removedOrphans: 0 };

  if (typeof window === "undefined") return summary;

  try {
    // Jangan pernah membersihkan cache saat siswa sedang berada di tengah sesi ujian
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem("is_exam_in_progress") === "true") {
      return summary;
    }

    const protectedCodes = new Set<string>();

    // 1. Lindungi sesi aktif yang tersimpan di perangkat
    try {
      const activeRaw = localStorage.getItem("ujiancerdas_active_exam_session");
      if (activeRaw) {
        const activeSession = JSON.parse(activeRaw) as { examCode?: string };
        if (activeSession?.examCode) {
          protectedCodes.add(activeSession.examCode.trim().toUpperCase());
        }
      }
    } catch {
      /* ignore */
    }

    // 2. Lindungi seluruh kode ujian yang masih memiliki item dalam antrean sinkronisasi offline maupun daftar gagal tersimpan
    try {
      offlineService.getSyncQueue().forEach((item) => {
        if (item?.examCode) protectedCodes.add(item.examCode.trim().toUpperCase());
      });
      offlineService.getFailedQueue().forEach((item) => {
        if (item?.examCode) protectedCodes.add(item.examCode.trim().toUpperCase());
      });
      const idbBackup = await offlineService.getLocalProgress("offline_sync_queue_backup");
      if (Array.isArray(idbBackup)) {
        idbBackup.forEach((item) => {
          const rec = item as { examCode?: string } | null;
          if (rec?.examCode) protectedCodes.add(rec.examCode.trim().toUpperCase());
        });
      }
      const idbFailedBackup = await offlineService.getLocalProgress("offline_failed_sync_queue_backup");
      if (Array.isArray(idbFailedBackup)) {
        idbFailedBackup.forEach((item) => {
          const rec = item as { examCode?: string } | null;
          if (rec?.examCode) protectedCodes.add(rec.examCode.trim().toUpperCase());
        });
      }
    } catch {
      /* ignore */
    }

    // 3. Lindungi seluruh ujian & draf milik guru di perangkat ini
    try {
      const idxRaw = localStorage.getItem("ujiancerdas_teacher_exam_index");
      if (idxRaw) {
        const idxMap = JSON.parse(idxRaw) as Record<string, unknown>;
        Object.keys(idxMap || {}).forEach((code) => protectedCodes.add(code.trim().toUpperCase()));
      }
      const teacherEntries = await offlineService.getLocalProgressEntriesByPrefix<Exam>("teacher_exam_");
      teacherEntries.forEach((entry) => {
        const code = entry.key.slice("teacher_exam_".length).trim().toUpperCase();
        if (code) protectedCodes.add(code);
      });
    } catch {
      /* ignore */
    }

    const nowMs = Date.now();
    const expiredCodes = new Set<string>();

    // 4. Evaluasi definisi ujian offline di IndexedDB
    const offlineExamEntries = await offlineService.getLocalProgressEntriesByPrefix<Exam>("offline_exam_");
    offlineExamEntries.forEach((entry) => {
      const code = entry.key.slice("offline_exam_".length).trim().toUpperCase();
      if (!code || protectedCodes.has(code)) return;
      if (isExamExpired(entry.data, nowMs)) {
        expiredCodes.add(code);
      }
    });

    // 5. Evaluasi definisi ujian & pratinjau di localStorage
    const lsKeys = getLocalStorageKeysSafely();
    lsKeys.forEach((key) => {
      let code = "";
      if (key.startsWith("exam_def_")) {
        code = key.slice("exam_def_".length).trim().toUpperCase();
      } else if (key.startsWith("ujiancerdas_preview_exam_")) {
        code = key.slice("ujiancerdas_preview_exam_".length).trim().toUpperCase();
      }
      if (!code || protectedCodes.has(code) || expiredCodes.has(code)) return;

      try {
        const raw = localStorage.getItem(key);
        if (!raw) return;
        const parsed = JSON.parse(raw) as Partial<Exam>;
        if (isExamExpired(parsed, nowMs)) {
          expiredCodes.add(code);
        }
      } catch {
        /* ignore malformed cache entries */
      }
    });

    for (const code of expiredCodes) {
      await clearExamLocalCache(code);
      summary.removedExams++;
    }

    // 6. Bersihkan sisa cache jawaban yatim piatu di IndexedDB yang lebih tua dari 30 hari
    const studentLocalEntries = await offlineService.getLocalProgressEntriesByPrefix<unknown>("exam_local_");
    for (const entry of studentLocalEntries) {
      const rest = entry.key.slice("exam_local_".length);
      const sepIdx = rest.indexOf("_");
      const code = (sepIdx > 0 ? rest.slice(0, sepIdx) : rest).trim().toUpperCase();
      if (!code || protectedCodes.has(code) || expiredCodes.has(code)) continue;

      if (typeof entry.updatedAt === "number" && nowMs - entry.updatedAt > ORPHAN_MAX_AGE_MS) {
        await offlineService.clearLocalProgress(entry.key);
        summary.removedOrphans++;
      }
    }
  } catch (err) {
    console.warn("Expired exam cache hygiene skipped:", err);
  }

  return summary;
};
