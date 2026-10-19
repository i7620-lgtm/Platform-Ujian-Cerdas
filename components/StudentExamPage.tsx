import React, { useState, useEffect, useRef, useCallback } from "react";
import type { Exam, Student, Result, Question, ResultStatus } from "../types";
import {
  ClockIcon,
  CheckCircleIcon,
  PencilIcon,
  ChevronDownIcon,
  CheckIcon,
  ChevronUpIcon,
  SunIcon,
  MoonIcon,
  ShieldCheckIcon,
  MapPinIcon,
  ArrowsRightLeftIcon,
  LockClosedIcon,
  ListBulletIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  SparklesIcon,
} from "./Icons";
import { storageService } from "../services/storage";
import { useStudentExamLogic } from "./student/useStudentExamLogic";
import { supabase } from "../lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  parseList,
  sanitizeHtml,
  calculateExamScore,
} from "./teacher/examUtils";
import { AudioPlayer } from "./AudioPlayer";
import { ChartRenderer } from "./ChartRenderer";
import type { ChartData } from "../types";
import { useExamAntiCheat } from "../hooks/useExamAntiCheat";
import { MultipleChoiceView } from "./student/question-types/MultipleChoiceView";
import { TrueFalseView } from "./student/question-types/TrueFalseView";
import { MatchingView } from "./student/question-types/MatchingView";

const renderQuestionTextWithChart = (
  html: string,
  chartData: ChartData | undefined,
  optimizeHtml: (h: string) => string,
) => {
  let optimized = optimizeHtml(html);
  if (/\\?\[\s*ai_svg/i.test(optimized)) {
    optimized = optimized.replace(
      /(?:<p[^>]*>)?\s*\\?\[\s*ai_svg(?::\s*[^\]]*)?\s*\\?\]\s*(?:<\/p>)?/gi,
      "",
    );
  }
  if (/\\?\[(CHART|DIAGRAM|GRAFIK).*?\\?\]/i.test(optimized)) {
    optimized = optimized.replace(
      /(?:<p>)?\s*\\?\[(CHART|DIAGRAM|GRAFIK).*?\\?\]\s*(?:<\/p>)?/gi,
      '<span data-chart="true"></span>',
    );
  }

  if (!chartData) {
    return <div dangerouslySetInnerHTML={{ __html: optimized }}></div>;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(optimized, "text/html");
  const chartNode = doc.querySelector('[data-chart="true"]');

  if (!chartNode) {
    return (
      <>
        <div dangerouslySetInnerHTML={{ __html: optimized }}></div>
        <div className="mb-8 w-full max-w-3xl mx-auto">
          <ChartRenderer data={chartData} />
        </div>
      </>
    );
  }

  const marker = "___CHART_MARKER___";
  chartNode.insertAdjacentText("beforebegin", marker);
  chartNode.remove();

  const newHtml = doc.body.innerHTML;
  const parts = newHtml.split(marker);

  return (
    <>
      {parts.map((part, index) => (
        <React.Fragment key={index}>
          <div dangerouslySetInnerHTML={{ __html: part }}></div>
          {index < parts.length - 1 && (
            <div className="my-6 w-full max-w-3xl mx-auto">
              <ChartRenderer data={chartData} />
            </div>
          )}
        </React.Fragment>
      ))}
    </>
  );
};

interface StudentExamPageProps {
  exam: Exam;
  student: Student;
  initialData?: Result | null;
  onSubmit: (
    answers: Record<string, string>,
    timeLeft: number,
    status?: ResultStatus,
    logs?: string[],
    location?: string,
    grading?: Record<string, unknown>,
  ) => void;
  onUpdate?: (answers: Record<string, string>, timeLeft: number) => void;
  onBack?: () => void;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
}

export const StudentExamPage: React.FC<StudentExamPageProps> = ({
  exam,
  student,
  initialData,
  onSubmit,
  onUpdate,
  onBack,
  isDarkMode,
  toggleTheme,
}) => {
  const {
    formatTime, totalQuestions, answeredCount, progress, optimizeHtml,
    answers, isSubmitting, userLocation, isNavOpen, setIsNavOpen,
    hasAttemptedSubmit, showConfigIntro, setShowConfigIntro,
    activeExam, matchingOptionsMap, isMonitoring, monitoringLabel,
    isAnswered, handleSubmit, timeLeft, 
    handleAnswerChange, scrollToQuestion, answersRef,
    isSessionGracePeriodActive, sessionEndTime,
  } = useStudentExamLogic({ exam, student, initialData, onSubmit, onUpdate });

  const [isSessionBannerDismissed, setIsSessionBannerDismissed] = useState(false);
  const [expandedHints, setExpandedHints] = useState<Record<string, boolean>>({});

  const toggleHint = useCallback((questionId: string) => {
    setExpandedHints((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  }, []);

  interface FontStepConfig {
    step: number;
    percentage: number;
    qSizeRem: number;
    optSizeRem: number;
    inputSizeRem: number;
    lineHeight: number;
    label: string;
  }

  const FONT_STEP_CONFIGS: FontStepConfig[] = [
    { step: -2, percentage: 80, qSizeRem: 0.825, optSizeRem: 0.775, inputSizeRem: 0.775, lineHeight: 1.55, label: "Sangat Kecil" },
    { step: -1, percentage: 90, qSizeRem: 0.9125, optSizeRem: 0.85, inputSizeRem: 0.85, lineHeight: 1.58, label: "Kecil" },
    { step: 0, percentage: 100, qSizeRem: 1.0, optSizeRem: 0.9375, inputSizeRem: 0.9375, lineHeight: 1.625, label: "Normal" },
    { step: 1, percentage: 112, qSizeRem: 1.125, optSizeRem: 1.05, inputSizeRem: 1.05, lineHeight: 1.625, label: "Besar (+1)" },
    { step: 2, percentage: 125, qSizeRem: 1.25, optSizeRem: 1.15, inputSizeRem: 1.15, lineHeight: 1.65, label: "Besar (+2)" },
    { step: 3, percentage: 140, qSizeRem: 1.375, optSizeRem: 1.25, inputSizeRem: 1.25, lineHeight: 1.68, label: "Besar (+3)" },
    { step: 4, percentage: 155, qSizeRem: 1.525, optSizeRem: 1.375, inputSizeRem: 1.375, lineHeight: 1.7, label: "Besar (+4)" },
    { step: 5, percentage: 170, qSizeRem: 1.68, optSizeRem: 1.5, inputSizeRem: 1.5, lineHeight: 1.72, label: "Maksimal (+5)" },
  ];

  const MIN_FONT_STEP = -2;
  const MAX_FONT_STEP = 5;
  const NORMAL_FONT_STEP = 0;

  const [fontStep, setFontStep] = useState<number>(() => {
    try {
      const savedStep = localStorage.getItem("student_font_step");
      if (savedStep !== null) {
        const parsed = parseInt(savedStep, 10);
        if (!isNaN(parsed) && parsed >= MIN_FONT_STEP && parsed <= MAX_FONT_STEP) {
          return parsed;
        }
      }
      const oldSaved = localStorage.getItem("student_font_size");
      if (oldSaved === "small") return -1;
      if (oldSaved === "large") return 2;
    } catch {
      // fallback
    }
    return NORMAL_FONT_STEP;
  });

  const currentFontConfig =
    FONT_STEP_CONFIGS.find((c) => c.step === fontStep) || FONT_STEP_CONFIGS[2];

  const handleDecreaseFontSize = () => {
    setFontStep((prev) => {
      const next = Math.max(MIN_FONT_STEP, prev - 1);
      try {
        localStorage.setItem("student_font_step", String(next));
        localStorage.setItem(
          "student_font_size",
          next < 0 ? "small" : next > 0 ? "large" : "normal",
        );
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleResetFontSize = () => {
    setFontStep(() => {
      try {
        localStorage.setItem("student_font_step", "0");
        localStorage.setItem("student_font_size", "normal");
      } catch {
        // ignore
      }
      return NORMAL_FONT_STEP;
    });
  };

  const handleIncreaseFontSize = () => {
    setFontStep((prev) => {
      const next = Math.min(MAX_FONT_STEP, prev + 1);
      try {
        localStorage.setItem("student_font_step", String(next));
        localStorage.setItem(
          "student_font_size",
          next < 0 ? "small" : next > 0 ? "large" : "normal",
        );
      } catch {
        // ignore
      }
      return next;
    });
  };

  const headerRef = useRef<HTMLElement>(null);
  const navMenuRef = useRef<HTMLDivElement>(null);

  // Auto-dismiss question palette menu when clicking outside header & nav menu
  useEffect(() => {
    if (!isNavOpen) return;

    const handlePointerDownOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;

      const isInsideHeader = headerRef.current?.contains(target);
      const isInsideNavMenu = navMenuRef.current?.contains(target);

      if (!isInsideHeader && !isInsideNavMenu) {
        setIsNavOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDownOutside);
    document.addEventListener("touchstart", handlePointerDownOutside, {
      passive: true,
    });

    return () => {
      document.removeEventListener("mousedown", handlePointerDownOutside);
      document.removeEventListener("touchstart", handlePointerDownOutside);
    };
  }, [isNavOpen, setIsNavOpen]);

  // Mobile Protection: Trap history back / edge-swipe, prevent pull-to-refresh, and confirm beforeunload
  useEffect(() => {
    // 1. Trap history back button / swipe back gesture
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
    };
    window.addEventListener("popstate", handlePopState);

    // 2. Prevent accidental browser reload / close without confirmation
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isSubmitting) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    // 3. Prevent iOS Safari & Android pull-to-refresh when dragging down from top
    let startY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        startY = e.touches[0].clientY;
      }
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const currentY = e.touches[0].clientY;
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        if (scrollTop <= 0 && currentY > startY + 12) {
          if (e.cancelable) {
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [isSubmitting]);

  // Selalu mulai dari posisi paling atas halaman ujian saat pertama kali dimuat
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-40 transition-colors duration-300">
      {/* Modal Informasi Aturan Ujian */}
      {showConfigIntro && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg sm:max-w-xl md:max-w-2xl max-h-[92dvh] overflow-y-auto custom-scrollbar rounded-[1.75rem] sm:rounded-[2.25rem] shadow-2xl border border-white dark:border-slate-800 animate-gentle-slide p-5 sm:p-6 md:p-7">
            <div className="flex flex-col items-center text-center mb-4 sm:mb-5">
              <div className="w-11 h-11 sm:w-12 sm:h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-2.5 sm:mb-3 shadow-xs">
                <ShieldCheckIcon className="w-6 h-6 sm:w-6.5 sm:h-6.5" />
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                Aturan Ujian
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Mohon perhatikan konfigurasi ujian berikut:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
              {/* Batas Waktu */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-indigo-100/60 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <ClockIcon className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-[11px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                    Batas Waktu
                  </p>
                  <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
                    {activeExam.config.examMode === "PR"
                      ? "Tanpa Batas"
                      : activeExam.config.timeLimit > 0
                        ? `${activeExam.config.timeLimit} Menit`
                        : "Tanpa Batas"}
                  </p>
                </div>
              </div>

              {/* Target Nilai */}
              {activeExam.config.kkm && (
                <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl sm:rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100/70 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircleIcon className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-[11px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                      Target Nilai
                    </p>
                    <p className="text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-300 truncate">
                      KKM Minimal {activeExam.config.kkm}
                    </p>
                  </div>
                </div>
              )}

              {/* Pengawasan Aktif */}
              {activeExam.config.detectBehavior &&
                activeExam.config.examMode !== "PR" && (
                  <div className="flex items-center gap-3 p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl sm:rounded-2xl border border-rose-100 dark:border-rose-900/30">
                    <div className="w-8 h-8 rounded-lg bg-rose-100/70 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                      <LockClosedIcon className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-[11px] font-black uppercase text-rose-500 dark:text-rose-400 tracking-wider">
                        Pengawasan Aktif
                      </p>
                      <p className="text-xs sm:text-sm font-bold text-rose-700 dark:text-rose-300 truncate">
                        {activeExam.config.continueWithPermission
                          ? "Akses Terkunci Jika Curang"
                          : "Aktivitas Tercatat Sistem"}
                      </p>
                    </div>
                  </div>
                )}

              {/* Mode Acak */}
              {(activeExam.config.shuffleQuestions ||
                activeExam.config.shuffleAnswers) && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl sm:rounded-2xl border border-blue-100 dark:border-blue-900/30">
                  <div className="w-8 h-8 rounded-lg bg-blue-100/70 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <ArrowsRightLeftIcon className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-[11px] font-black uppercase text-blue-500 dark:text-blue-400 tracking-wider">
                      Mode Acak
                    </p>
                    <p className="text-xs sm:text-sm font-bold text-blue-700 dark:text-blue-300 truncate">
                      Soal & Jawaban Diacak
                    </p>
                  </div>
                </div>
              )}

              {/* Pelacakan Lokasi */}
              {activeExam.config.trackLocation &&
                activeExam.config.examMode !== "PR" && (
                  <div className="flex items-center gap-3 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-xl sm:rounded-2xl border border-teal-100 dark:border-teal-900/30 sm:col-span-2">
                    <div className="w-8 h-8 rounded-lg bg-teal-100/70 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                      <MapPinIcon className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-[11px] font-black uppercase text-teal-600 dark:text-teal-400 tracking-wider">
                        Pelacakan Lokasi
                      </p>
                      <p className="text-xs sm:text-sm font-bold text-teal-700 dark:text-teal-300 truncate">
                        Koordinat GPS Dicatat
                      </p>
                    </div>
                  </div>
                )}

              {/* Sistem Penilaian Mode Olimpiade */}
              {activeExam.config.isOlympiadMode && (
                <div className="flex flex-col p-3 sm:p-3.5 bg-amber-50/80 dark:bg-amber-950/30 rounded-xl sm:rounded-2xl border border-amber-200/80 dark:border-amber-900/40 sm:col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                        <SparklesIcon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-black uppercase text-amber-800 dark:text-amber-300 tracking-wider">
                        Sistem Penilaian
                      </span>
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500 text-white tracking-wider">
                      Mode Olimpiade
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-emerald-200/60 dark:border-emerald-900/40 shadow-2xs">
                      <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400">Benar</span>
                      <span className="text-xs sm:text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                        +{activeExam.config.olympiadScoring?.correctMultiplier ?? 4}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-rose-200/60 dark:border-rose-900/40 shadow-2xs">
                      <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400">Salah</span>
                      <span className="text-xs sm:text-sm font-black font-mono text-rose-600 dark:text-rose-400">
                        {activeExam.config.olympiadScoring?.wrongMultiplier ?? -1}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700 shadow-2xs">
                      <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400">Kosong</span>
                      <span className="text-xs sm:text-sm font-black font-mono text-slate-600 dark:text-slate-300">
                        {activeExam.config.olympiadScoring?.emptyMultiplier ?? 0}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Garis Pemisah Horizontal & Tombol Mulai Mengerjakan */}
            <div className="mt-3.5 sm:mt-4 pt-3.5 sm:pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowConfigIntro(false)}
                className="w-full py-2.5 sm:py-3 px-5 bg-slate-900 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl sm:rounded-2xl shadow-md hover:shadow-indigo-500/20 transition-all active:scale-[0.99] flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>Mulai Mengerjakan</span>
                <CheckCircleIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      )}

      <header
        ref={headerRef}
        className={`fixed top-0 inset-x-0 z-[60] border-b shadow-sm transition-all duration-300 h-16 flex items-center ${isNavOpen ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800" : "bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-slate-200/60 dark:border-slate-800/60"}`}
      >
        <div
          className="absolute top-0 left-0 h-[2px] bg-indigo-600 dark:bg-indigo-500 transition-all duration-700 ease-out z-10"
          style={{ width: `${progress}%` }}
        ></div>
        <div className="w-full max-w-full mx-auto px-3 sm:px-6 flex items-center justify-between">
          <div
            className="flex items-center gap-2 sm:gap-3 overflow-hidden cursor-pointer flex-1 min-w-0 mr-2"
            onClick={() => setIsNavOpen(!isNavOpen)}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 ${isNavOpen ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300" : "bg-transparent text-slate-400 dark:text-slate-500"}`}
            >
              {isNavOpen ? (
                <ChevronUpIcon className="w-5 h-5" />
              ) : (
                <ChevronDownIcon className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0 flex flex-col justify-center">
              <h1 className="text-sm font-black text-slate-800 dark:text-white tracking-tight truncate max-w-[110px] min-[400px]:max-w-[160px] sm:max-w-xs">
                {activeExam.config.subject}
              </h1>
              <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 font-mono tracking-wide truncate">
                {isNavOpen ? "Ketuk untuk tutup" : "Ketuk untuk navigasi"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Compact Monitoring Badge - Visible ONLY when Nav is Closed */}
            {isMonitoring && !isNavOpen && (
              <div className="flex items-center gap-1.5 px-2 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-lg mr-0.5 animate-fade-in">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                <span className="hidden sm:inline text-[10px] font-black uppercase tracking-wide text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                  {monitoringLabel}
                </span>
              </div>
            )}

            {/* Fitur Pilihan Ukuran Font Soal (A- untuk terus memperkecil, A untuk normal, A+ untuk terus memperbesar) */}
            <div
              id="exam-font-size-selector"
              className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs"
              title={`Ukuran Tulisan: ${currentFontConfig.percentage}% (${currentFontConfig.label})`}
              aria-label="Pengatur ukuran tulisan soal"
            >
              {/* Tombol Perkecil (A-) */}
              <button
                id="font-size-decrease-btn"
                type="button"
                onClick={handleDecreaseFontSize}
                disabled={fontStep <= MIN_FONT_STEP}
                className={`h-7 px-1.5 sm:px-2 flex items-center justify-center rounded-md transition-all select-none ${
                  fontStep <= MIN_FONT_STEP
                    ? "text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-40"
                    : fontStep < 0
                      ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-black border border-slate-200/80 dark:border-slate-600"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-700/50 font-bold"
                }`}
                title={`Perkecil Ukuran Tulisan (A-) • Saat ini: ${currentFontConfig.percentage}%`}
                aria-label="Perkecil ukuran font"
              >
                <span className="text-[11px] sm:text-xs font-bold leading-none">A</span>
                <span className="text-[10px] sm:text-[11px] font-black leading-none -ml-0.5">−</span>
              </button>

              {/* Tombol Normal (A di tengah) */}
              <button
                id="font-size-normal-btn"
                type="button"
                onClick={handleResetFontSize}
                className={`h-7 px-2 sm:px-2.5 flex items-center justify-center rounded-md transition-all select-none ${
                  fontStep === 0
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-black border border-slate-200/80 dark:border-slate-600"
                    : "text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white/60 dark:hover:bg-slate-700/50 font-bold"
                }`}
                title={
                  fontStep === 0
                    ? "Ukuran Tulisan Normal (100%)"
                    : `Kembalikan ke Ukuran Normal (100%) • Saat ini: ${currentFontConfig.percentage}%`
                }
                aria-label="Kembalikan ukuran font normal"
              >
                <span className="text-xs sm:text-[13px] leading-none font-bold">A</span>
              </button>

              {/* Tombol Perbesar (A+) */}
              <button
                id="font-size-increase-btn"
                type="button"
                onClick={handleIncreaseFontSize}
                disabled={fontStep >= MAX_FONT_STEP}
                className={`h-7 px-1.5 sm:px-2 flex items-center justify-center rounded-md transition-all select-none ${
                  fontStep >= MAX_FONT_STEP
                    ? "text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-40"
                    : fontStep > 0
                      ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-black border border-slate-200/80 dark:border-slate-600"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-700/50 font-bold"
                }`}
                title={`Perbesar Ukuran Tulisan (A+) • Saat ini: ${currentFontConfig.percentage}%`}
                aria-label="Perbesar ukuran font"
              >
                <span className="text-xs sm:text-[13px] font-bold leading-none">A</span>
                <span className="text-[10px] sm:text-[11px] font-black leading-none -ml-0.5">+</span>
              </button>
            </div>

            {toggleTheme && (
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-sm border border-slate-200 dark:border-slate-700"
                aria-label="Toggle Theme"
              >
                {isDarkMode ? (
                  <SunIcon className="w-4 h-4" />
                ) : (
                  <MoonIcon className="w-4 h-4" />
                )}
              </button>
            )}
            <div
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border font-mono font-bold tracking-tight transition-all shadow-sm ${timeLeft < 300 ? "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900 animate-pulse" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"}`}
            >
              <ClockIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">{formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Backdrop overlay for dismissing question navigation menu */}
      {isNavOpen && (
        <div
          id="exam-nav-backdrop"
          className="fixed inset-0 z-40 bg-slate-900/20 dark:bg-slate-950/40 backdrop-blur-[1px] transition-opacity animate-fade-in"
          onClick={() => setIsNavOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        ref={navMenuRef}
        className={`fixed top-16 left-0 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl z-50 border-b border-slate-200 dark:border-slate-800 shadow-xl transition-all duration-300 ease-in-out origin-top ${isNavOpen ? "translate-y-0 opacity-100 visible" : "-translate-y-full opacity-0 invisible"}`}
      >
        <div className="w-full max-w-full mx-auto p-4 sm:p-6 max-h-[70vh] overflow-y-auto">
          <div className="flex flex-wrap gap-2 justify-center">
            {activeExam.questions.map((q, idx) => {
              if (q.questionType === "INFO") return null;
              const num =
                activeExam.questions
                  .slice(0, idx)
                  .filter((i) => i.questionType !== "INFO").length + 1;
              const answered = isAnswered(q, answers);
              return (
                <button
                  key={q.id}
                  onClick={() => scrollToQuestion(q.id)}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg border flex items-center justify-center text-xs font-bold transition-all ${answered ? "bg-indigo-600 border-indigo-600 text-white" : hasAttemptedSubmit ? "bg-rose-50 border-rose-300 text-rose-600 animate-pulse" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
                >
                  {num}
                </button>
              );
            })}
          </div>

          {/* Informasi Pengawasan & Batas Jam Sesi Bersebelahan di Laci Soal */}
          {(isMonitoring || isSessionGracePeriodActive) && (
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 animate-fade-in">
              <div
                className={`grid grid-cols-1 ${
                  isMonitoring && isSessionGracePeriodActive
                    ? "md:grid-cols-2"
                    : "max-w-md mx-auto"
                } gap-3.5 max-w-4xl mx-auto`}
              >
                {/* Kolom 1: Peringatan Pengawasan Sistem */}
                {isMonitoring && (
                  <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex flex-col items-center text-center justify-between shadow-xs">
                    <div className="flex flex-col items-center w-full">
                      <div className="bg-indigo-100/80 dark:bg-indigo-900/50 px-3.5 py-1.5 rounded-full border border-indigo-200/60 dark:border-indigo-800 flex items-center gap-2 mb-2.5">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                        </span>
                        <span className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                          {monitoringLabel || "Sistem Pengawasan Aktif"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                        {activeExam.config.continueWithPermission
                          ? "Peringatan: Ujian sedang diawasi oleh sistem. Jika Anda berpindah tab atau keluar dari halaman, ujian akan terkunci dan membutuhkan token guru untuk melanjutkan."
                          : "Peringatan: Ujian sedang diawasi oleh sistem. Seluruh aktivitas dan riwayat pengerjaan Anda dipantau serta dicatat secara realtime oleh pengawas."}
                      </p>
                    </div>
                  </div>
                )}

                {/* Kolom 2: Informasi Batas Jam Sesi & Toleransi Waktu */}
                {isSessionGracePeriodActive && (
                  <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 flex flex-col items-center text-center justify-between shadow-xs">
                    <div className="flex flex-col items-center w-full">
                      <div className="bg-amber-100 dark:bg-amber-900/50 px-3.5 py-1.5 rounded-full border border-amber-200 dark:border-amber-800 flex items-center gap-2 mb-2.5 text-amber-800 dark:text-amber-200">
                        <ClockIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span className="text-xs font-black uppercase tracking-wider">
                          Batas Jam Sesi: {sessionEndTime || "Selesai"}
                        </span>
                      </div>
                      <p className="text-xs text-amber-900/90 dark:text-amber-200/90 font-medium leading-relaxed">
                        Batas jam sesi ujian telah berakhir, namun Anda diberikan kesempatan menyelesaikan soal hingga hitung mundur durasi habis.
                      </p>
                    </div>
                    {isSessionBannerDismissed && (
                      <button
                        type="button"
                        onClick={() => setIsSessionBannerDismissed(false)}
                        className="mt-3 text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 underline underline-offset-2 cursor-pointer transition-colors"
                      >
                        Tampilkan kembali banner di layar utama
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tombol Selesai di Bagian Bawah Laci Soal */}
          <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 max-w-4xl mx-auto">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-bold text-slate-700 dark:text-slate-200">{answeredCount} dari {totalQuestions}</span>
              <span>soal terjawab ({progress}%)</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsNavOpen(false);
                handleSubmit(false);
              }}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 disabled:opacity-70 cursor-pointer"
            >
              <CheckCircleIcon className="w-4 h-4" />
              <span>{isSubmitting ? "Mengirim..." : "Selesai & Kumpulkan Ujian"}</span>
            </button>
          </div>
        </div>
      </div>

      <main
        className={`w-full max-w-full mx-auto px-4 sm:px-6 pt-24 space-y-8 exam-content-scalable exam-font-step-${fontStep}`}
        style={
          {
            "--exam-prose-size": `${currentFontConfig.qSizeRem}rem`,
            "--exam-option-size": `${currentFontConfig.optSizeRem}rem`,
            "--exam-input-size": `${currentFontConfig.inputSizeRem}rem`,
            "--exam-line-height": currentFontConfig.lineHeight,
          } as React.CSSProperties
        }
      >
        {/* Banner Grace Period Saat Batas Jam Sesi Habis Namun Durasi Masih Ada */}
        {isSessionGracePeriodActive && !isSessionBannerDismissed && (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0">
                <ClockIcon className="w-5 h-5" />
              </div>
              <div>
                <strong className="block font-bold text-sm text-amber-900 dark:text-amber-100">
                  Batas Jam Sesi Telah Berakhir ({sessionEndTime || "Selesai"})
                </strong>
                <p className="text-amber-700 dark:text-amber-300 mt-0.5">
                  Anda diberikan kesempatan untuk melanjutkan pengerjaan hingga durasi pengerjaan Anda habis. Jawaban akan otomatis terkirim saat sisa waktu pengerjaan berakhir.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsSessionBannerDismissed(true)}
              className="text-[11px] font-black uppercase px-4 py-2 rounded-xl bg-amber-200 hover:bg-amber-300 dark:bg-amber-900/80 dark:hover:bg-amber-800 text-amber-950 dark:text-amber-100 shrink-0 self-end sm:self-center transition-all active:scale-95 shadow-xs cursor-pointer flex items-center gap-1.5 focus:outline-hidden"
              title="Tutup banner peringatan agar pandangan soal lebih leluasa"
              aria-label="Lanjut Mengerjakan"
            >
              <span>Lanjut Mengerjakan</span>
              <CheckIcon className="w-3.5 h-3.5 text-amber-950 dark:text-amber-100" />
            </button>
          </div>
        )}

        {/* Banner Mode Olimpiade (Sistem Skor Penalti) */}
        {activeExam.config?.isOlympiadMode && (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 shadow-xs flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs font-black text-xs">
              OSN
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-amber-950 dark:text-amber-100">
                  Ujian Berjalan dalam Mode Olimpiade
                </h3>
                <span className="text-[11px] font-mono font-bold text-amber-800 dark:text-amber-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-700/60">
                  Benar +{activeExam.config.olympiadScoring?.correctMultiplier ?? 4} · Salah {activeExam.config.olympiadScoring?.wrongMultiplier ?? -1} · Kosong {activeExam.config.olympiadScoring?.emptyMultiplier ?? 0}
                </span>
              </div>
              <p className="text-xs text-amber-800/90 dark:text-amber-300/80 mt-1 leading-relaxed">
                Ujian ini menerapkan sistem penalti poin. Jawaban yang salah akan mengurangi nilai akhir. Jika ragu, Anda dapat mengosongkan jawaban agar terhindar dari penalti.
              </p>
            </div>
          </div>
        )}

        {activeExam.questions.map((q, idx) => {
          const num =
            activeExam.questions
              .slice(0, idx)
              .filter((i) => i.questionType !== "INFO").length + 1;
          const answered = isAnswered(q, answers);
          const isMissing =
            hasAttemptedSubmit && !answered && q.questionType !== "INFO";

          return (
            <div
              key={q.id}
              id={q.id}
              className={`scroll-mt-24 sm:scroll-mt-28 animate-fade-in transition-all duration-500 ${isMissing ? "ring-2 ring-rose-400 rounded-[1.5rem]" : ""}`}
            >
              <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 sm:p-8">
                <div className="flex gap-4 sm:gap-5 items-start">
                  <div className="shrink-0 pt-0.5">
                    <span
                      className={`text-sm font-black w-8 h-8 flex items-center justify-center rounded-xl transition-all shadow-sm ${isMissing ? "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400" : answered ? "text-white bg-indigo-600 dark:bg-indigo-500 shadow-indigo-200 dark:shadow-none" : "text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800"}`}
                    >
                      {q.questionType === "INFO" ? "i" : num}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    {q.audioUrl && (
                      <div className="mb-4">
                        <AudioPlayer src={q.audioUrl} />
                      </div>
                    )}
                    <div className="student-question-text prose prose-slate dark:prose-invert max-w-none font-medium mb-6">
                      {renderQuestionTextWithChart(
                        q.questionText,
                        q.chartData,
                        optimizeHtml,
                      )}
                    </div>

                    <div className="space-y-4">
                      {(q.questionType === "MULTIPLE_CHOICE" ||
                        q.questionType === "COMPLEX_MULTIPLE_CHOICE") && (
                        <MultipleChoiceView
                          question={q}
                          answers={answers}
                          onAnswerChange={handleAnswerChange}
                          optimizeHtml={optimizeHtml}
                        />
                      )}

                      {q.questionType === "TRUE_FALSE" && (
                        <TrueFalseView
                          question={q}
                          answers={answers}
                          onAnswerChange={handleAnswerChange}
                          optimizeHtml={optimizeHtml}
                        />
                      )}

                      {q.questionType === "MATCHING" && (
                        <MatchingView
                          question={q}
                          answers={answers}
                          rightOptions={matchingOptionsMap[q.id] || []}
                          onAnswerChange={handleAnswerChange}
                          optimizeHtml={optimizeHtml}
                        />
                      )}

                      {q.questionType === "ESSAY" && (
                        <textarea
                          value={answers[q.id] || ""}
                          onChange={(e) =>
                            handleAnswerChange(q.id, e.target.value)
                          }
                          className="w-full p-5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 dark:focus:border-indigo-500 outline-none min-h-[160px] text-slate-700 dark:text-slate-200 transition-all resize-y placeholder:text-slate-400 dark:placeholder:text-slate-600 leading-relaxed"
                          placeholder="Tulis jawaban lengkap Anda..."
                        />
                      )}

                      {q.questionType === "FILL_IN_THE_BLANK" && (
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <PencilIcon className="w-5 h-5 text-slate-400" />
                          </div>
                          <input
                            type="text"
                            value={answers[q.id] || ""}
                            onChange={(e) =>
                              handleAnswerChange(q.id, e.target.value)
                            }
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 dark:focus:border-indigo-500 outline-none font-bold text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all"
                            placeholder="Ketik jawaban singkat..."
                          />
                        </div>
                      )}
                    </div>

                    {/* Petunjuk Pengerjaan (Hanya muncul jika diizinkan oleh guru via showHints dan soal memiliki petunjuk) */}
                    {activeExam.config?.showHints && q.hint && q.hint.trim() !== "" && (
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => toggleHint(q.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 border border-amber-200/80 dark:border-amber-800/60 transition-colors shadow-2xs"
                        >
                          <LightBulbIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>{expandedHints[q.id] ? "Tutup Petunjuk Pengerjaan" : "Buka Petunjuk Pengerjaan"}</span>
                          {expandedHints[q.id] ? (
                            <ChevronUpIcon className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          ) : (
                            <ChevronDownIcon className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          )}
                        </button>

                        {expandedHints[q.id] && (
                          <div className="mt-2.5 p-3.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 rounded-xl text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                            <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-400 mb-1.5">
                              <LightBulbIcon className="w-3 h-3 text-amber-500" />
                              <span>Petunjuk Pengerjaan</span>
                            </div>
                            <div
                              className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-200 [&_p]:my-1"
                              dangerouslySetInnerHTML={{
                                __html: sanitizeHtml(optimizeHtml(q.hint)),
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Kartu Penutup Setelah Soal Terakhir (Exam Completion Card) */}
        <div className="mt-10 mb-28 p-6 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl transition-all">
          <div className="max-w-2xl mx-auto flex flex-col items-center text-center">
            {answeredCount === totalQuestions ? (
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-center mb-4 shadow-xs">
                <CheckCircleIcon className="w-8 h-8" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/80 flex items-center justify-center mb-4 shadow-xs">
                <ExclamationTriangleIcon className="w-8 h-8" />
              </div>
            )}

            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
              {answeredCount === totalQuestions
                ? "Semua Soal Telah Dijawab!"
                : "Lembar Akhir Pengerjaan Ujian"}
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-lg mb-5">
              {answeredCount === totalQuestions
                ? "Hebat! Anda telah menjawab seluruh soal ujian. Silakan periksa kembali jawaban Anda jika masih memiliki sisa waktu, atau kumpulkan ujian sekarang."
                : activeExam.config?.isOlympiadMode
                  ? `Anda menjawab ${answeredCount} dari ${totalQuestions} soal (${progress}%). Terdapat ${totalQuestions - answeredCount} soal yang dikosongkan. Dalam Mode Olimpiade, membiarkan soal kosong tidak akan mengurangi poin Anda.`
                  : `Anda telah menjawab ${answeredCount} dari total ${totalQuestions} soal (${progress}%). Masih ada ${totalQuestions - answeredCount} soal yang belum dijawab.`}
            </p>

            {/* Nomor Soal yang Belum Terjawab / Dikosongkan (Dapat diklik langsung untuk menuju soal) */}
            {answeredCount < totalQuestions && (
              <div className="w-full mb-6 p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 text-left">
                <span className="text-xs font-bold text-amber-900 dark:text-amber-200 block mb-2.5">
                  {activeExam.config?.isOlympiadMode
                    ? "Nomor soal yang dikosongkan (tanpa penalti, ketuk jika ingin mengisi):"
                    : "Nomor soal yang belum dijawab (ketuk untuk memeriksa):"}
                </span>
                <div className="flex flex-wrap gap-2">
                  {activeExam.questions
                    .filter((q) => q.questionType !== "INFO" && !isAnswered(q, answers))
                    .map((q) => {
                      const num =
                        activeExam.questions
                          .slice(0, activeExam.questions.indexOf(q))
                          .filter((i) => i.questionType !== "INFO").length + 1;
                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => scrollToQuestion(q.id)}
                          className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-all cursor-pointer shadow-xs active:scale-95"
                          title={`Loncat ke soal nomor ${num}`}
                        >
                          Soal #{num}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              className="w-full sm:w-auto min-w-[260px] px-8 py-4 bg-slate-900 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-2xl font-black text-sm sm:text-base transition-all flex items-center justify-center gap-3 shadow-xl hover:shadow-indigo-500/25 active:scale-[0.98] disabled:opacity-70 cursor-pointer"
            >
              <CheckCircleIcon className="w-5 h-5 shrink-0" />
              <span>{isSubmitting ? "Mengirim Jawaban..." : "Selesai & Kumpulkan Jawaban"}</span>
            </button>
          </div>
        </div>
      </main>

      {/* Floating Progress Widget di Sudut Kanan Bawah (Ringkas & Bebas Salah Tekan) */}
      <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 pointer-events-auto">
        <button
          type="button"
          onClick={() => setIsNavOpen(!isNavOpen)}
          className="group flex items-center gap-2.5 px-3.5 py-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-xl hover:shadow-2xl border border-slate-200/90 dark:border-slate-800 ring-1 ring-slate-100 dark:ring-slate-800/60 transition-all duration-200 active:scale-95 cursor-pointer text-left"
          title="Ketuk untuk membuka daftar nomor soal"
          aria-label="Lihat nomor soal dan progres"
        >
          {/* Mini Circular Progress */}
          <div className="relative w-7 h-7 flex items-center justify-center shrink-0">
            <svg className="w-7 h-7 -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-100 dark:text-slate-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-indigo-600 dark:text-indigo-400 transition-all duration-500 ease-out"
                strokeDasharray={`${progress}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-[8px] font-black text-slate-700 dark:text-slate-200 font-mono">
              {progress}%
            </span>
          </div>

          <div className="flex flex-col pr-0.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 leading-tight">
              Progres
            </span>
            <div className="flex items-baseline gap-0.5 leading-tight">
              <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tabular-nums">
                {answeredCount}
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500">
                /{totalQuestions}
              </span>
            </div>
          </div>

          <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/60 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors ml-0.5">
            <ListBulletIcon className="w-3.5 h-3.5" />
          </div>
        </button>
      </div>
    </div>
  );
};
