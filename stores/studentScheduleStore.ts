import { create } from "zustand";
import type { Exam, DailyExamSession } from "../types";
import {
  calculateStudentAccess,
  type StudentAccessCheckResult,
} from "../utils/scheduleUtils";

interface StudentScheduleState {
  // State
  accessResult: StudentAccessCheckResult | null;
  isEvaluating: boolean;
  isSessionTimeoutModalOpen: boolean;
  activeExam: Exam | null;
  studentClass: string;

  // Actions
  initScheduleMonitor: (exam: Exam, studentClass?: string) => void;
  evaluateAccess: () => StudentAccessCheckResult | null;
  setSessionTimeoutModalOpen: (isOpen: boolean) => void;
  stopTimer: () => void;
  reset: () => void;
}

let timerInterval: ReturnType<typeof setInterval> | null = null;

export const useStudentScheduleStore = create<StudentScheduleState>((set, get) => ({
  accessResult: null,
  isEvaluating: false,
  isSessionTimeoutModalOpen: false,
  activeExam: null,
  studentClass: "",

  initScheduleMonitor: (exam: Exam, studentClass = "") => {
    // Bersihkan interval sebelumnya jika ada untuk efisiensi RAM
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }

    set({
      activeExam: exam,
      studentClass,
      isEvaluating: true,
    });

    // Evaluasi pertama kali
    const initialResult = calculateStudentAccess(exam.config, studentClass, new Date());
    set({
      accessResult: initialResult,
      isEvaluating: false,
    });

    // Buat interval 1 detik hemat daya
    timerInterval = setInterval(() => {
      const currentExam = get().activeExam;
      if (!currentExam) return;

      const currentClass = get().studentClass;
      const res = calculateStudentAccess(currentExam.config, currentClass, new Date());
      set({ accessResult: res });
    }, 1000);
  },

  evaluateAccess: () => {
    const { activeExam, studentClass } = get();
    if (!activeExam) return null;
    const res = calculateStudentAccess(activeExam.config, studentClass, new Date());
    set({ accessResult: res });
    return res;
  },

  setSessionTimeoutModalOpen: (isOpen: boolean) => {
    set({ isSessionTimeoutModalOpen: isOpen });
  },

  stopTimer: () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  },

  reset: () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    set({
      accessResult: null,
      isEvaluating: false,
      isSessionTimeoutModalOpen: false,
      activeExam: null,
      studentClass: "",
    });
  },
}));
