import type { ExamConfig, DailyExamSession } from "../types";

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
 * Aturan:
 * 1. Jika sesi bertanda isGeneral = true ATAU targetClasses kosong -> berlaku untuk semua kelas (Umum).
 * 2. Jika sesi memiliki targetClasses spesifik -> hanya berlaku jika kelas siswa ada di dalamnya.
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
 * Menyediakan fallback jika config versi sebelumnya hanya memiliki dailyStartTime/dailyEndTime.
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
        isGeneral: true,
        targetClasses: [],
      },
    ];
  }

  return [];
};

/**
 * Mendapatkan rentang tanggal dan jam global ujian (startDate & startTime s/d endDate & endTime)
 */
export const getGlobalExamTimeRange = (config: ExamConfig): { start: Date; end: Date; isValid: boolean } => {
  const isPR = (config.examMode || "").trim().toUpperCase() === "PR";
  const defaultToday = new Date().toLocaleDateString("en-CA");

  // Start Date
  const rawStartDate = config.startDate || config.date || defaultToday;
  const startTimeStr = isPR ? "00:00" : (config.startTime || "00:00");
  let start: Date;
  if (rawStartDate.includes("T") && rawStartDate.length > 10) {
    start = new Date(rawStartDate);
  } else {
    start = new Date(`${rawStartDate}T${startTimeStr}:00`);
  }

  // End Date
  const rawEndDate = config.endDate || config.date || defaultToday;
  const endTimeStr = config.endTime || (isPR ? "23:59" : "23:59");
  let end: Date;
  if (rawEndDate.includes("T") && rawEndDate.length > 10) {
    end = new Date(rawEndDate);
  } else {
    end = new Date(`${rawEndDate}T${endTimeStr}:59`);
  }

  const isValid = !isNaN(start.getTime()) && !isNaN(end.getTime());
  return { start, end, isValid };
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
}

/**
 * Menghitung status akses siswa secara real-time dan terisolasi.
 * Menjamin isolasi penuh antar-kelas (contoh: siswa 8B tidak bisa masuk di jam sesi 8A).
 */
export const calculateStudentAccess = (
  config: ExamConfig,
  studentClass?: string,
  now: Date = new Date()
): StudentAccessCheckResult => {
  const isPR = (config.examMode || "").trim().toUpperCase() === "PR";
  const nowTs = now.getTime();

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
    };
  }

  // 1. Evaluasi Batas Global (Global Start & End Time)
  const { start: globalStart, end: globalEnd } = getGlobalExamTimeRange(config);

  if (!isNaN(globalStart.getTime()) && nowTs < globalStart.getTime()) {
    const diffSec = Math.max(0, Math.floor((globalStart.getTime() - nowTs) / 1000));
    return {
      status: "NOT_STARTED_GLOBAL",
      canAccess: false,
      message: "Ujian belum dibuka. Harap menunggu waktu pelaksanaan resmi.",
      countdownSeconds: diffSec,
      nextSessionDate: globalStart,
      applicableSessions: [],
      allSessions: [],
      isDailyWindowEnabled: !!config.enableDailyWindow,
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
    };
  }

  // Periksa waktu saat ini dalam format tanggal dan menit lokal
  const todayDateStr = now.toLocaleDateString("en-CA"); // YYYY-MM-DD
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Cari apakah ada sesi aktif saat ini
  let activeSession: DailyExamSession | undefined;
  for (const session of applicableSessions) {
    // Jika sesi memiliki tanggal spesifik, tanggal harus cocok dengan hari ini
    if (session.date && session.date !== todayDateStr) {
      continue;
    }

    const startMin = parseTimeMinutes(session.startTime);
    const endMin = parseTimeMinutes(session.endTime);

    if (startMin <= endMin) {
      if (currentMinutes >= startMin && currentMinutes < endMin) {
        activeSession = session;
        break;
      }
    } else {
      // Sesi melewati tengah malam
      if (currentMinutes >= startMin || currentMinutes < endMin) {
        activeSession = session;
        break;
      }
    }
  }

  if (activeSession) {
    // Siswa berhak mengerjakan sekarang di dalam sesi aktif kelasnya
    const dateLabel = activeSession.date ? ` [${activeSession.date}]` : "";
    return {
      status: "OPEN",
      canAccess: true,
      message: `Sesi aktif: ${activeSession.name || "Sesi Pengerjaan"}${dateLabel} (${activeSession.startTime} - ${activeSession.endTime})`,
      activeSession,
      countdownSeconds: 0,
      applicableSessions,
      allSessions,
      isDailyWindowEnabled: true,
    };
  }

  // Tidak ada sesi aktif saat ini -> cari sesi terdekat berikutnya untuk kelas siswa
  let nextSession: DailyExamSession | undefined;
  let nextSessionDate: Date | undefined;
  let minDiffMs = Infinity;

  for (const session of applicableSessions) {
    const startMin = parseTimeMinutes(session.startTime);
    const startH = Math.floor(startMin / 60);
    const startM = startMin % 60;

    let candidateDate: Date;
    if (session.date) {
      // Sesi terikat tanggal spesifik kalender
      const [y, m, d] = session.date.split("-").map((v) => parseInt(v, 10));
      candidateDate = new Date(y, (m || 1) - 1, d || 1, startH, startM, 0, 0);
    } else {
      // Sesi tanpa tanggal (berulang harian)
      if (startMin > currentMinutes) {
        candidateDate = new Date(now);
        candidateDate.setHours(startH, startM, 0, 0);
      } else {
        candidateDate = new Date(now);
        candidateDate.setDate(candidateDate.getDate() + 1);
        candidateDate.setHours(startH, startM, 0, 0);
      }
    }

    const diffMs = candidateDate.getTime() - nowTs;
    if (diffMs > 0 && diffMs < minDiffMs) {
      minDiffMs = diffMs;
      nextSession = session;
      nextSessionDate = candidateDate;
    }
  }

  let countdownSeconds = 0;
  if (nextSessionDate) {
    countdownSeconds = Math.max(0, Math.floor((nextSessionDate.getTime() - nowTs) / 1000));
  }

  const sessionName = nextSession?.name ? `"${nextSession.name}"` : "sesi berikutnya";
  const startLabel = nextSession?.startTime || "-";
  const sessionDateLabel = nextSession?.date ? ` pada tanggal ${nextSession.date}` : "";

  return {
    status: "OUTSIDE_DAILY_SESSION",
    canAccess: false,
    message: `Di luar jam pengerjaan untuk kelas Anda. Sesi ${sessionName} akan dimulai pukul ${startLabel} WIB${sessionDateLabel}.`,
    nextSession,
    nextSessionDate,
    countdownSeconds,
    applicableSessions,
    allSessions,
    isDailyWindowEnabled: true,
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

  const globalStart = config.startDate || config.date;
  const globalEnd = config.endDate || config.date;

  if (session.date) {
    if (globalStart && session.date < globalStart) {
      issues.push({
        type: "DATE_OUT_OF_BOUNDS",
        message: `Tanggal sesi (${session.date}) mendahului tanggal mulai umum (${globalStart}).`,
      });
    }
    if (globalEnd && session.date > globalEnd) {
      issues.push({
        type: "DATE_OUT_OF_BOUNDS",
        message: `Tanggal sesi (${session.date}) melewati tanggal selesai umum (${globalEnd}).`,
      });
    }

    // Jika pada tanggal mulai umum, jam mulai sesi tidak boleh mendahului jam mulai umum
    if (globalStart && session.date === globalStart && config.startTime) {
      const gStartMin = parseTimeMinutes(config.startTime);
      if (sStartMin < gStartMin) {
        issues.push({
          type: "START_TIME_TOO_EARLY",
          message: `Jam mulai sesi (${session.startTime}) tidak boleh lebih awal dari jam mulai umum (${config.startTime}) pada hari pertama.`,
        });
      }
    }

    // Jika pada tanggal selesai umum, jam selesai sesi tidak boleh melewati jam selesai umum
    if (globalEnd && session.date === globalEnd && config.endTime) {
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
export const findSessionConflicts = (sessions: DailyExamSession[]): { hasConflict: boolean; conflicts: string[] } => {
  const conflicts: string[] = [];
  if (!sessions || sessions.length < 2) {
    return { hasConflict: false, conflicts };
  }

  for (let i = 0; i < sessions.length; i++) {
    for (let j = i + 1; j < sessions.length; j++) {
      const s1 = sessions[i];
      const s2 = sessions[j];

      // Jika keduanya memiliki tanggal dan tanggalnya berbeda -> TIDAK BENTROK
      if (s1.date && s2.date && s1.date !== s2.date) {
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
