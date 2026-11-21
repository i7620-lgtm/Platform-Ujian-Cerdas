import React from "react";
import type { Exam, Question } from "../../../types";
import {
  ClockIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ListBulletIcon,
} from "../../Icons";

interface StudentExamNavDrawerProps {
  navMenuRef: React.RefObject<HTMLDivElement | null>;
  isNavOpen: boolean;
  onCloseNav: () => void;
  onToggleNav: () => void;
  activeExam: Exam;
  answers: Record<string, string>;
  answeredCount: number;
  totalQuestions: number;
  progress: number;
  hasAttemptedSubmit: boolean;
  isSubmitting: boolean;
  isMonitoring: boolean;
  monitoringLabel: string;
  isSessionGracePeriodActive: boolean;
  sessionEndTime?: string;
  isAnswered: (q: Question, ans: Record<string, string>) => boolean;
  scrollToQuestion: (qId: string) => void;
  onRequestSubmit: () => void;
}

export const StudentExamNavDrawer: React.FC<StudentExamNavDrawerProps> = ({
  navMenuRef,
  isNavOpen,
  onCloseNav,
  onToggleNav,
  activeExam,
  answers,
  answeredCount,
  totalQuestions,
  progress,
  hasAttemptedSubmit,
  isSubmitting,
  isMonitoring,
  monitoringLabel,
  isSessionGracePeriodActive,
  sessionEndTime,
  isAnswered,
  scrollToQuestion,
  onRequestSubmit,
}) => {
  return (
    <>
      {/* Backdrop overlay for dismissing question navigation menu */}
      {isNavOpen && (
        <div
          id="exam-nav-backdrop"
          className="fixed inset-0 z-40 bg-slate-900/20 dark:bg-slate-950/40 backdrop-blur-[1px] transition-opacity animate-fade-in"
          onClick={onCloseNav}
          aria-hidden="true"
        />
      )}

      <div
        ref={navMenuRef}
        className={`fixed exam-drawer-safe inset-x-0 bottom-0 z-50 bg-white dark:bg-slate-900 flex flex-col transition-all duration-300 ease-in-out origin-top shadow-2xl ${
          isNavOpen
            ? "translate-y-0 opacity-100 visible pointer-events-auto"
            : "-translate-y-full opacity-0 invisible pointer-events-none"
        }`}
      >
        {/* Header Ringkasan Daftar Soal */}
        <div className="shrink-0 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 px-4 sm:px-6 py-2.5 sm:py-3">
          <div className="flex items-center justify-between max-w-5xl mx-auto w-full">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <ListBulletIcon className="w-4 h-4" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                Daftar Nomor Soal
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-2xs">
                <span className="text-indigo-600 dark:text-indigo-400 font-black tabular-nums">{answeredCount}</span>
                <span className="text-slate-400 dark:text-slate-500 font-normal">dari</span>
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">{totalQuestions}</span>
                <span className="text-slate-600 dark:text-slate-400">Soal</span>
              </div>
              <button
                type="button"
                onClick={onCloseNav}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Tutup laci soal"
                aria-label="Tutup laci soal"
              >
                <ChevronUpIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Konten Utama Laci: Grid Nomor Soal & Kartu Informasi Adaptif */}
        <div
          data-scrollable="true"
          className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 py-3 sm:py-4 flex flex-col justify-center items-center overscroll-contain"
        >
          <div className="w-full max-w-5xl mx-auto flex flex-col items-center justify-center gap-3 sm:gap-4 my-auto">
            {/* Grid Tombol Nomor Soal */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center w-full max-w-4xl mx-auto">
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
                    type="button"
                    onClick={() => scrollToQuestion(q.id)}
                    className={`w-10 h-10 rounded-lg border flex items-center justify-center text-xs font-bold transition-all cursor-pointer shrink-0 select-none ${
                      answered
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                        : hasAttemptedSubmit
                          ? "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-300"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600"
                    }`}
                    title={`Soal nomor ${num} (${answered ? "Sudah dijawab" : "Belum dijawab"})`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>

            {/* Informasi Pengawasan, Batas Jam Sesi & Mode Olimpiade yang Ringkas & Adaptif */}
            {(isMonitoring || isSessionGracePeriodActive || activeExam.config?.isOlympiadMode) && (
              <div className="w-full max-w-3xl mx-auto mt-1 sm:mt-2 pt-2 sm:pt-3 border-t border-slate-100 dark:border-slate-800">
                <div
                  className={`grid grid-cols-1 ${
                    Number(!!isMonitoring) +
                      Number(!!isSessionGracePeriodActive) +
                      Number(!!activeExam.config?.isOlympiadMode) >=
                    3
                      ? "md:grid-cols-3 max-w-4xl"
                      : Number(!!isMonitoring) +
                            Number(!!isSessionGracePeriodActive) +
                            Number(!!activeExam.config?.isOlympiadMode) ===
                          2
                        ? "md:grid-cols-2 max-w-2xl"
                        : "max-w-lg"
                  } gap-2 sm:gap-2.5 mx-auto`}
                >
                  {isMonitoring && (
                    <div className="p-2 sm:p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex items-center gap-2.5 shadow-2xs text-left">
                      <span className="inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500 shrink-0 ml-1"></span>
                      <div className="min-w-0">
                        <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 block">
                          {monitoringLabel || "Sistem Pengawasan Aktif"}
                        </span>
                        <p className="text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-snug line-clamp-2">
                          {activeExam.config.continueWithPermission
                            ? "Berpindah tab atau keluar akan mengunci ujian dan butuh token guru."
                            : "Seluruh aktivitas pengerjaan dipantau secara realtime oleh pengawas."}
                        </p>
                      </div>
                    </div>
                  )}

                  {activeExam.config?.isOlympiadMode && (
                    <div className="p-2 sm:p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 flex items-center gap-2.5 shadow-2xs text-left">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 ml-1"></span>
                      <div className="min-w-0">
                        <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-200 block">
                          Mode Olimpiade
                        </span>
                        <p className="text-[10px] sm:text-[11px] text-amber-950/80 dark:text-amber-200/80 font-medium leading-snug">
                          Benar +{activeExam.config.olympiadScoring?.correctMultiplier ?? 4} · Salah {activeExam.config.olympiadScoring?.wrongMultiplier ?? -1} · Kosong {activeExam.config.olympiadScoring?.emptyMultiplier ?? 0}
                        </p>
                      </div>
                    </div>
                  )}

                  {isSessionGracePeriodActive && (
                    <div className="p-2 sm:p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 flex items-center gap-2.5 shadow-2xs text-left">
                      <ClockIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 ml-1" />
                      <div className="min-w-0">
                        <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-200 block">
                          Lewat Waktu: {sessionEndTime || "Jadwal Berakhir"}
                        </span>
                        <p className="text-[10px] sm:text-[11px] text-amber-900/90 dark:text-amber-200/90 font-medium leading-snug">
                          Tuntaskan sisa durasi sebelum hitung mundur habis.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tombol Selesai di Bagian Bawah Laci Soal */}
        <div className="shrink-0 border-t border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 sm:px-6 pt-2.5 sm:pt-3.5 pb-[calc(0.625rem+env(safe-area-inset-bottom,0px))] sm:pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))] shadow-lg">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4 max-w-5xl mx-auto w-full">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-bold text-slate-700 dark:text-slate-200">{answeredCount} dari {totalQuestions}</span>
              <span>soal terjawab ({Math.round(progress)}%)</span>
            </div>
            <button
              type="button"
              onClick={onRequestSubmit}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-2.5 sm:py-3 bg-slate-900 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 disabled:opacity-70 cursor-pointer"
            >
              <CheckCircleIcon className="w-4 h-4" />
              <span>{isSubmitting ? "Mengirim..." : "Selesai & Kumpulkan Ujian"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Drawer Button di Sudut Kanan Bawah (Safe Area Aware) */}
      <div
        className={`fixed exam-fab-safe z-40 transition-opacity duration-200 ${
          isNavOpen ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-auto"
        }`}
      >
        <button
          type="button"
          onClick={onToggleNav}
          className="group flex items-center gap-2 px-3.5 py-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-xl hover:shadow-2xl border border-slate-200/90 dark:border-slate-800 ring-1 ring-slate-100 dark:ring-slate-800/60 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-200 active:scale-95 cursor-pointer text-left"
          title="Ketuk untuk membuka daftar nomor soal"
          aria-label="Buka atau tutup daftar nomor soal"
        >
          <div className="flex items-baseline gap-1 font-black leading-tight tabular-nums select-none pl-0.5">
            <span className="text-sm sm:text-base font-black text-indigo-600 dark:text-indigo-400">
              {answeredCount}
            </span>
            <span className="text-xs sm:text-sm font-bold text-slate-400 dark:text-slate-500">
              /
            </span>
            <span className="text-xs sm:text-sm font-black text-slate-700 dark:text-slate-200">
              {totalQuestions}
            </span>
          </div>

          <div className="w-5 h-5 rounded-md text-slate-400 dark:text-slate-500 flex items-center justify-center group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {isNavOpen ? (
              <ChevronDownIcon className="w-4 h-4" />
            ) : (
              <ChevronUpIcon className="w-4 h-4" />
            )}
          </div>
        </button>
      </div>
    </>
  );
};
