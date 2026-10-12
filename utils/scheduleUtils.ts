import type { ExamConfig, DailyExamSession, IndonesianTimezone } from "../types";
import {
  detectUserIndonesianTimezone,
  getTimezoneOffsetHours,
  normalizeDateString,
  toAbsoluteUtcTimestamp,
  getStudentTimezoneNotice,
} from "./timezoneUtils";

/**
 * Konversi string waktu "HH:mm" menjadi menit dari tengah malam (0 - 1439).
 */
export const parseTimeMinutes = (timeStr?: string): number => {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(":");
  const hours = parseInt(parts[0] || "0", 10);
  const minutes = parseInt(parts[1] || "0", 10);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  return hours * 60 + minutes;
};

/**
 * Format jumlah menit menjadi format "HH:mm".
 */
export const formatMinutesToTime = (minutes: number): string => {
  const norm = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
};

/**
 * Normalisasi string nama kelas untuk perbandingan yang andal
 * contoh: "Kelas 8A" -> "8a", "8-A" -> "8a", "8A" -> "8a"
 */
export const normalizeClassName = (name?: string): string => {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/^kelas\s+/i, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
};

/**
 * Memeriksa apakah nama kelas siswa cocok dengan target kelas
 */
export const isClassMatch = (targetClass: string, studentClass?: string): boolean => {
  if (!studentClass) return false;
  const normTarget = normalizeClassName(targetClass);
  const normStudent = normalizeClassName(studentClass);
  if (!normTarget || !normStudent) return false;
  return normTarget === normStudent;
};

/**
 * Memeriksa apakah suatu sesi berlaku bagi kelas siswa.
 */
export const isSessionApplicableForStudent = (
  session: DailyExamSession,
  studentClass?: string
): boolean => {
  const isGeneral = session.isGeneral || !session.targetClasses || session.targetClasses.length === 0;
  if (isGeneral) return true;
  if (!studentClass) return false;
  return session.targetClasses.some((tc) => isClassMatch(tc, studentClass));
};

/**
 * Memfilter sesi-sesi yang berlaku untuk siswa kelas tertentu
 */
export const getApplicableSessionsForStudent = (
  sessions: DailyExamSession[],
  studentClass?: string
): DailyExamSession[] => {
  if (!sessions || sessions.length === 0) return [];
  return sessions.filter((s) => isSessionApplicableForStudent(s, studentClass));
};

/**
 * Mengambil daftar sesi harian yang dinormalisasi dari config ujian.
 */
export const getNormalizedDailySessions = (config: ExamConfig): DailyExamSession[] => {
  if (config.dailySessions && Array.isArray(config.dailySessions) && config.dailySessions.length > 0) {
    return config.dailySessions;
  }

  // Fallback kompatibilitas: jika enableDailyWindow aktif tapi belum ada dailySessions
  if (config.enableDailyWindow) {
    return [
      {
        id: "default-daily-session",
        name: "Sesi Harian Utama",
        startTime: config.dailyStartTime || "08:00",
        endTime: config.dailyEndTime || "16:00",
        dateMode: "ALL_DAYS",
        isGeneral: true,
        targetClasses: [],
      },
    ];
  }

  return [];
};

/**
 * Mendapatkan rentang tanggal dan jam global ujian berbasis UTC absolut sesuai zona waktu guru.
 */
export const getGlobalExamTimeRange = (
  config: ExamConfig
): { start: Date; end: Date; isValid: boolean; timezone: IndonesianTimezone } => {
  const isPR = (config.examMode || "").trim().toUpperCase() === "PR";
  const examTz: IndonesianTimezone = config.timezone || "WIB";
  const defaultToday = normalizeDateString();

  const rawStartDate = normalizeDateString(config.startDate || config.date || defaultToday);
  const startTimeStr = isPR ? "00:00" : (config.startTime || "00:00");
  const startUtcMs = toAbsoluteUtcTimestamp(rawStartDate, startTimeStr, examTz, false);

  const rawEndDate = normalizeDateString(config.endDate || config.date || defaultToday);
  const endTimeStr = config.endTime || (isPR ? "23:59" : "23:59");
  const endUtcMs = toAbsoluteUtcTimestamp(rawEndDate, endTimeStr, examTz, true);

  const start = new Date(startUtcMs);
  const end = new Date(endUtcMs);
  const isValid = !isNaN(startUtcMs) && !isNaN(endUtcMs);

  return { start, end, isValid, timezone: examTz };
};

export type ExamAccessStatus =
  | "OPEN" // Berhak masuk ujian
  | "NOT_STARTED_GLOBAL" // Belum masuk jadwal mulai global ujian
  | "FINISHED_GLOBAL" // Sudah melewati batas akhir global ujian
  | "OUTSIDE_DAILY_SESSION"; // Di luar sesi jam harian kelas siswa

export interface StudentAccessCheckResult {
  status: ExamAccessStatus;
  canAccess: boolean;
  message: string;
  activeSession?: DailyExamSession;
  nextSession?: DailyExamSession;
  nextSessionDate?: Date;
  countdownSeconds: number;
  applicableSessions: DailyExamSession[];
  allSessions: DailyExamSession[];
  isDailyWindowEnabled: boolean;
  timezone: IndonesianTimezone;
  studentTimezone: IndonesianTimezone;
  studentTimezoneNotice?: string | null;
  targetTimeLabel?: string;
}

/**
 * Menghitung status akses siswa secara real-time dan terisolasi dengan dukungan zona waktu penuh.
 */
export const calculateStudentAccess = (
  config: ExamConfig,
  studentClass?: string,
  now: Date = new Date()
): StudentAccessCheckResult => {
  const isPR = (config.examMode || "").trim().toUpperCase() === "PR";
  const nowTs = now.getTime();
  const examTz: IndonesianTimezone = config.timezone || "WIB";
  const studentTz: IndonesianTimezone = detectUserIndonesianTimezone();

  // Mode PR tidak terikat batas jam harian
  if (isPR) {
    const { end } = getGlobalExamTimeRange(config);
    if (!isNaN(end.getTime()) && nowTs > end.getTime()) {
      return {
        status: "FINISHED_GLOBAL",
        canAccess: false,
        message: "Ujian (PR) telah berakhir melewati batas waktu penyerahan.",
        countdownSeconds: 0,
        applicableSessions: [],
        allSessions: [],
        isDailyWindowEnabled: false,
        timezone: examTz,
        studentTimezone: studentTz,
      };
    }

    return {
      status: "OPEN",
      canAccess: true,
      message: "Ujian dalam mode PR dapat dikerjakan sekarang.",
      countdownSeconds: 0,
      applicableSessions: [],
      allSessions: [],
      isDailyWindowEnabled: false,
      timezone: examTz,
      studentTimezone: studentTz,
    };
  }

  // 1. Evaluasi Batas Global (Global Start & End Time) dalam UTC
  const { start: globalStart, end: globalEnd } = getGlobalExamTimeRange(config);

  if (!isNaN(globalStart.getTime()) && nowTs < globalStart.getTime()) {
    const diffSec = Math.max(0, Math.floor((globalStart.getTime() - nowTs) / 1000));
    const tzNotice = getStudentTimezoneNotice(config.startTime || "00:00", config.endTime || "23:59", examTz, studentTz);
    return {
      status: "NOT_STARTED_GLOBAL",
      canAccess: false,
      message: "Ujian belum dibuka. Harap menunggu waktu pelaksanaan resmi.",
      countdownSeconds: diffSec,
      nextSessionDate: globalStart,
      applicableSessions: [],
      allSessions: [],
      isDailyWindowEnabled: !!config.enableDailyWindow,
      timezone: examTz,
      studentTimezone: studentTz,
      studentTimezoneNotice: tzNotice,
      targetTimeLabel: `${config.startTime || "00:00"} - ${config.endTime || "23:59"} ${examTz}`,
    };
  }

  if (!isNaN(globalEnd.getTime()) && nowTs > globalEnd.getTime()) {
    return {
      status: "FINISHED_GLOBAL",
      canAccess: false,
      message: "Ujian telah ditutup karena melewati batas akhir pelaksanaan.",
      countdownSeconds: 0,
      applicableSessions: [],
      allSessions: [],
      isDailyWindowEnabled: !!config.enableDailyWindow,
      timezone: examTz,
      studentTimezone: studentTz,
    };
  }

  // 2. Evaluasi Batas Jam Harian (Daily Sessions)
  const isDailyWindowEnabled = !!config.enableDailyWindow;
  if (!isDailyWindowEnabled) {
    // Tanpa pembatasan sesi harian -> langsung buka
    return {
      status: "OPEN",
      canAccess: true,
      message: "Ujian dapat dikerjakan sekarang.",
      countdownSeconds: 0,
      applicableSessions: [],
      allSessions: [],
      isDailyWindowEnabled: false,
      timezone: examTz,
      studentTimezone: studentTz,
    };
  }

  const allSessions = getNormalizedDailySessions(config);
  if (allSessions.length === 0) {
    return {
      status: "OPEN",
      canAccess: true,
      message: "Ujian dapat dikerjakan sekarang.",
      countdownSeconds: 0,
      applicableSessions: [],
      allSessions: [],
      isDailyWindowEnabled: true,
      timezone: examTz,
      studentTimezone: studentTz,
    };
  }

  // Filter sesi yang berlaku khusus untuk kelas siswa ini
  const applicableSessions = getApplicableSessionsForStudent(allSessions, studentClass);

  if (applicableSessions.length === 0) {
    return {
      status: "OUTSIDE_DAILY_SESSION",
      canAccess: false,
      message: studentClass
        ? `Tidak ditemukan sesi jam ujian yang dibuka untuk kelas ${studentClass}. Hubungi pengawas/guru.`
        : "Silakan pilih kelas Anda untuk melihat jadwal sesi ujian.",
      countdownSeconds: 0,
      applicableSessions: [],
      allSessions,
      isDailyWindowEnabled: true,
      timezone: examTz,
      studentTimezone: studentTz,
    };
  }

  // Hitung tanggal dan menit saat ini menurut zona waktu guru
  const offsetExamMs = getTimezoneOffsetHours(examTz) * 3600000;
  const examNow = new Date(nowTs + offsetExamMs);
  const examYear = examNow.getUTCFullYear();
  const examMonth = (examNow.getUTCMonth() + 1).toString().padStart(2, "0");
  const examDay = examNow.getUTCDate().toString().padStart(2, "0");
  const examTodayDateStr = `${examYear}-${examMonth}-${examDay}`;
  const examCurrentMinutes = examNow.getUTCHours() * 60 + examNow.getUTCMinutes();

  // Cari apakah ada sesi aktif saat ini
  let activeSession: DailyExamSession | undefined;
  for (const session of applicableSessions) {
    const isSpecificDate = session.dateMode === "SPECIFIC_DATE";

    if (isSpecificDate && session.date) {
      const cleanSessionDate = normalizeDateString(session.date);
      if (cleanSessionDate !== examTodayDateStr) {
        continue;
      }
    }

    const startMin = parseTimeMinutes(session.startTime);
    const endMin = parseTimeMinutes(session.endTime);

    if (startMin <= endMin) {
      if (examCurrentMinutes >= startMin && examCurrentMinutes < endMin) {
        activeSession = session;
        break;
      }
    } else {
      // Sesi melewati tengah malam
      if (examCurrentMinutes >= startMin || examCurrentMinutes < endMin) {
        activeSession = session;
        break;
      }
    }
  }

  if (activeSession) {
    const dateLabel = activeSession.dateMode === "SPECIFIC_DATE" && activeSession.date ? ` [${activeSession.date}]` : "";
    const tzNotice = getStudentTimezoneNotice(activeSession.startTime, activeSession.endTime, examTz, studentTz);
    return {
      status: "OPEN",
      canAccess: true,
      message: `Sesi aktif: ${activeSession.name || "Sesi Pengerjaan"}${dateLabel} (${activeSession.startTime} - ${activeSession.endTime} ${examTz})`,
      activeSession,
      countdownSeconds: 0,
      applicableSessions,
      allSessions,
      isDailyWindowEnabled: true,
      timezone: examTz,
      studentTimezone: studentTz,
      studentTimezoneNotice: tzNotice,
      targetTimeLabel: `${activeSession.startTime} - ${activeSession.endTime} ${examTz}`,
    };
  }

  // Tidak ada sesi aktif saat ini -> cari sesi terdekat berikutnya dalam UTC
  let nextSession: DailyExamSession | undefined;
  let nextSessionDate: Date | undefined;
  let minDiffMs = Infinity;

  for (const session of applicableSessions) {
    const isSpecificDate = session.dateMode === "SPECIFIC_DATE";
    const startMin = parseTimeMinutes(session.startTime);

    let candidateUtcMs: number;
    if (isSpecificDate && session.date) {
      const cleanDate = normalizeDateString(session.date);
      candidateUtcMs = toAbsoluteUtcTimestamp(cleanDate, session.startTime, examTz, false);
    } else {
      // Berlaku setiap hari
      if (startMin > examCurrentMinutes) {
        candidateUtcMs = toAbsoluteUtcTimestamp(examTodayDateStr, session.startTime, examTz, false);
      } else {
        // Hari berikutnya di zona waktu guru
        const nextDayDate = new Date(Date.UTC(examNow.getUTCFullYear(), examNow.getUTCMonth(), examNow.getUTCDate() + 1));
        const tomY = nextDayDate.getUTCFullYear();
        const tomM = (nextDayDate.getUTCMonth() + 1).toString().padStart(2, "0");
        const tomD = nextDayDate.getUTCDate().toString().padStart(2, "0");
        const tomorrowDateStr = `${tomY}-${tomM}-${tomD}`;
        candidateUtcMs = toAbsoluteUtcTimestamp(tomorrowDateStr, session.startTime, examTz, false);
      }
    }

    const diffMs = candidateUtcMs - nowTs;
    if (diffMs > 0 && diffMs < minDiffMs) {
      minDiffMs = diffMs;
      nextSession = session;
      nextSessionDate = new Date(candidateUtcMs);
    }
  }

  let countdownSeconds = 0;
  if (nextSessionDate && minDiffMs < Infinity) {
    countdownSeconds = Math.max(0, Math.floor((nextSessionDate.getTime() - nowTs) / 1000));
  }

  const sessionName = nextSession?.name ? `"${nextSession.name}"` : "sesi berikutnya";
  const startLabel = nextSession?.startTime ? `${nextSession.startTime} ${examTz}` : "-";
  const sessionDateLabel = nextSession?.date ? ` pada tanggal ${nextSession.date}` : "";
  const tzNotice = nextSession
    ? getStudentTimezoneNotice(nextSession.startTime, nextSession.endTime, examTz, studentTz)
    : null;

  const fallbackMessage = nextSession
    ? `Di luar jam pengerjaan untuk kelas Anda. Sesi ${sessionName} akan dimulai pukul ${startLabel}${sessionDateLabel}.`
    : `Sesi pengerjaan untuk hari ini telah selesai atau belum ada jadwal sesi berikutnya untuk kelas Anda.`;

  return {
    status: "OUTSIDE_DAILY_SESSION",
    canAccess: false,
    message: fallbackMessage,
    nextSession,
    nextSessionDate,
    countdownSeconds,
    applicableSessions,
    allSessions,
    isDailyWindowEnabled: true,
    timezone: examTz,
    studentTimezone: studentTz,
    studentTimezoneNotice: tzNotice,
    targetTimeLabel: nextSession ? `${nextSession.startTime} - ${nextSession.endTime} ${examTz}` : undefined,
  };
};

/**
 * Validasi batasan jam dan tanggal sesi terhadap rentang jadwal global ujian.
 */
export interface SessionValidationIssue {
  type: "DATE_OUT_OF_BOUNDS" | "START_TIME_TOO_EARLY" | "END_TIME_TOO_LATE" | "INVALID_TIME_RANGE";
  message: string;
}

export const validateSessionAgainstGlobal = (
  session: DailyExamSession,
  config: ExamConfig
): SessionValidationIssue[] => {
  const issues: SessionValidationIssue[] = [];
  const sStartMin = parseTimeMinutes(session.startTime);
  const sEndMin = parseTimeMinutes(session.endTime);

  if (sStartMin >= sEndMin) {
    issues.push({
      type: "INVALID_TIME_RANGE",
      message: `Jam mulai (${session.startTime || "--:--"}) harus lebih awal dari jam selesai (${session.endTime || "--:--"}).`,
    });
  }

  const globalStart = normalizeDateString(config.startDate || config.date);
  const globalEnd = normalizeDateString(config.endDate || config.date);

  if (session.dateMode === "SPECIFIC_DATE" && session.date) {
    const cleanSessionDate = normalizeDateString(session.date);
    if (globalStart && cleanSessionDate < globalStart) {
      issues.push({
        type: "DATE_OUT_OF_BOUNDS",
        message: `Tanggal sesi (${session.date}) mendahului tanggal mulai umum (${globalStart}).`,
      });
    }
    if (globalEnd && cleanSessionDate > globalEnd) {
      issues.push({
        type: "DATE_OUT_OF_BOUNDS",
        message: `Tanggal sesi (${session.date}) melewati tanggal selesai umum (${globalEnd}).`,
      });
    }

    if (globalStart && cleanSessionDate === globalStart && config.startTime) {
      const gStartMin = parseTimeMinutes(config.startTime);
      if (sStartMin < gStartMin) {
        issues.push({
          type: "START_TIME_TOO_EARLY",
          message: `Jam mulai sesi (${session.startTime}) tidak boleh lebih awal dari jam mulai umum (${config.startTime}) pada hari pertama.`,
        });
      }
    }

    if (globalEnd && cleanSessionDate === globalEnd && config.endTime) {
      const gEndMin = parseTimeMinutes(config.endTime);
      if (sEndMin > gEndMin) {
        issues.push({
          type: "END_TIME_TOO_LATE",
          message: `Jam selesai sesi (${session.endTime}) tidak boleh melewati jam selesai umum (${config.endTime}) pada hari terakhir.`,
        });
      }
    }
  }

  return issues;
};

/**
 * Utilitas untuk mendeteksi potensi tumpang tindih waktu (conflict) antar sesi pada kelas yang sama.
 * PENTING: Dua sesi yang memiliki jam sama tetapi TANGGAL BERBEDA TIDAK DIANGGAP BENTROK.
 */
export const findSessionConflicts = (
  sessions: DailyExamSession[]
): { hasConflict: boolean; conflicts: string[] } => {
  const conflicts: string[] = [];
  if (!sessions || sessions.length < 2) {
    return { hasConflict: false, conflicts };
  }

  for (let i = 0; i < sessions.length; i++) {
    for (let j = i + 1; j < sessions.length; j++) {
      const s1 = sessions[i];
      const s2 = sessions[j];

      // Jika keduanya sesi tanggal spesifik dan tanggalnya berbeda -> TIDAK BENTROK
      const s1Specific = s1.dateMode === "SPECIFIC_DATE" || !!s1.date;
      const s2Specific = s2.dateMode === "SPECIFIC_DATE" || !!s2.date;
      if (s1Specific && s2Specific && s1.date && s2.date && s1.date !== s2.date) {
        continue;
      }

      // Periksa apakah kelas beririsan
      const s1General = s1.isGeneral || !s1.targetClasses || s1.targetClasses.length === 0;
      const s2General = s2.isGeneral || !s2.targetClasses || s2.targetClasses.length === 0;

      let shareClasses = false;
      if (s1General || s2General) {
        shareClasses = true;
      } else {
        const set1 = new Set((s1.targetClasses || []).map(normalizeClassName));
        shareClasses = (s2.targetClasses || []).some((c) => set1.has(normalizeClassName(c)));
      }

      if (shareClasses) {
        const s1Start = parseTimeMinutes(s1.startTime);
        const s1End = parseTimeMinutes(s1.endTime);
        const s2Start = parseTimeMinutes(s2.startTime);
        const s2End = parseTimeMinutes(s2.endTime);

        // Cek overlap rentang jam (s1Start < s2End && s2Start < s1End)
        if (s1Start < s2End && s2Start < s1End) {
          const dateLabel = s1.date ? ` (Tgl ${s1.date})` : "";
          conflicts.push(
            `"${s1.name || `Sesi ${i + 1}`}" (${s1.startTime}-${s1.endTime}) bertabrakan dengan "${s2.name || `Sesi ${j + 1}`}" (${s2.startTime}-${s2.endTime})${dateLabel} pada kelas yang sama.`
          );
        }
      }
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
  };
};
