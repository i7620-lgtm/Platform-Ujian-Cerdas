import React, { useSyncExternalStore } from "react";
import type { Exam, Student } from "../../../types";
import {
  ClockIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SunIcon,
  MoonIcon,
} from "../../Icons";

export interface FontStepConfig {
  step: number;
  percentage: number;
  qSizeRem: number;
  optSizeRem: number;
  inputSizeRem: number;
  lineHeight: number;
  label: string;
}

interface ExamTimerPillProps {
  getTimeLeft: () => number;
  subscribeTimeLeft: (listener: (seconds: number) => void) => () => void;
  formatTime: (seconds: number) => string;
}

const ExamTimerPill: React.FC<ExamTimerPillProps> = React.memo(
  ({ getTimeLeft, subscribeTimeLeft, formatTime }) => {
    const secondsLeft = useSyncExternalStore(
      subscribeTimeLeft,
      getTimeLeft,
      getTimeLeft,
    );

    return (
      <div
        className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border font-mono font-bold tracking-tight transition-colors shadow-sm ${
          secondsLeft !== Infinity && secondsLeft > 0 && secondsLeft < 300
            ? "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800"
            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
        }`}
      >
        <ClockIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        <span className="text-xs sm:text-sm tabular-nums">
          {formatTime(secondsLeft)}
        </span>
      </div>
    );
  },
);

interface StudentExamHeaderProps {
  headerRef: React.RefObject<HTMLElement | null>;
  activeExam: Exam;
  student: Student;
  progress: number;
  isNavOpen: boolean;
  onToggleNav: () => void;
  isMonitoring: boolean;
  monitoringLabel: string;
  fontStep: number;
  minFontStep: number;
  maxFontStep: number;
  currentFontConfig: FontStepConfig;
  onDecreaseFontSize: () => void;
  onResetFontSize: () => void;
  onIncreaseFontSize: () => void;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
  getTimeLeft: () => number;
  subscribeTimeLeft: (listener: (seconds: number) => void) => () => void;
  formatTime: (seconds: number) => string;
  onBack?: () => void;
}

export const StudentExamHeader: React.FC<StudentExamHeaderProps> = React.memo(({
  headerRef,
  activeExam,
  student,
  progress,
  isNavOpen,
  onToggleNav,
  isMonitoring,
  monitoringLabel,
  fontStep,
  minFontStep,
  maxFontStep,
  currentFontConfig,
  onDecreaseFontSize,
  onResetFontSize,
  onIncreaseFontSize,
  isDarkMode,
  toggleTheme,
  getTimeLeft,
  subscribeTimeLeft,
  formatTime,
  onBack,
}) => {
  return (
    <header
      ref={headerRef}
      data-math-ignore="true"
      className={`fixed top-0 inset-x-0 z-[60] border-b shadow-sm transition-colors duration-200 exam-header-safe flex items-center ${
        isNavOpen
          ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          : "bg-white/95 dark:bg-slate-900/95 border-slate-200/80 dark:border-slate-800/80"
      }`}
    >
      <div
        className="absolute top-[env(safe-area-inset-top,0px)] left-0 h-[2px] bg-indigo-600 dark:bg-indigo-500 transition-all duration-300 ease-out z-10"
        style={{ width: `${progress}%` }}
      ></div>
      <div className="w-full max-w-full mx-auto px-3 sm:px-6 flex items-center justify-between">
        <div
          className="flex items-center gap-2 sm:gap-3 overflow-hidden cursor-pointer flex-1 min-w-0 mr-2"
          onClick={onToggleNav}
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
            <div className="flex items-center gap-1.5 px-2 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-lg mr-0.5">
              <span className="inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              <span className="hidden sm:inline text-[10px] font-black uppercase tracking-wide text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                {monitoringLabel}
              </span>
            </div>
          )}

          {/* Fitur Pilihan Ukuran Font Soal (A- untuk memperkecil, A untuk normal, A+ untuk memperbesar) */}
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
              onClick={onDecreaseFontSize}
              disabled={fontStep <= minFontStep}
              className={`h-8 min-w-[32px] px-1.5 sm:px-2 flex items-center justify-center rounded-md transition-all select-none ${
                fontStep <= minFontStep
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
              onClick={onResetFontSize}
              className={`h-8 min-w-[32px] px-2 sm:px-2.5 flex items-center justify-center rounded-md transition-all select-none ${
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
              onClick={onIncreaseFontSize}
              disabled={fontStep >= maxFontStep}
              className={`h-8 min-w-[32px] px-1.5 sm:px-2 flex items-center justify-center rounded-md transition-all select-none ${
                fontStep >= maxFontStep
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
              type="button"
              onClick={toggleTheme}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer"
              aria-label="Toggle Theme"
            >
              {isDarkMode ? (
                <SunIcon className="w-4 h-4" />
              ) : (
                <MoonIcon className="w-4 h-4" />
              )}
            </button>
          )}
          <ExamTimerPill
            getTimeLeft={getTimeLeft}
            subscribeTimeLeft={subscribeTimeLeft}
            formatTime={formatTime}
          />

          {(student.class === "PREVIEW" || student.studentId.includes("PREVIEW")) && onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition-colors flex items-center gap-1 cursor-pointer shrink-0"
              title="Keluar dari mode preview dan kembali ke Dashboard Guru"
            >
              <span className="hidden sm:inline">Kembali ke </span>Dashboard
            </button>
          )}
        </div>
      </div>
    </header>
  );
});
