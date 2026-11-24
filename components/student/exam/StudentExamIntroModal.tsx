import React from "react";
import type { Exam } from "../../../types";
import {
  ClockIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  MapPinIcon,
  ArrowsRightLeftIcon,
  LockClosedIcon,
  SparklesIcon,
} from "../../Icons";
import { isOvertimeAllowedForExam } from "../../../utils/scheduleUtils";

interface StudentExamIntroModalProps {
  exam: Exam;
  onStart: () => void;
}

export const StudentExamIntroModal: React.FC<StudentExamIntroModalProps> = ({
  exam,
  onStart,
}) => {
  return (
    <div
      data-math-ignore="true"
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-slate-900/65"
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg sm:max-w-xl md:max-w-2xl max-h-[92dvh] overflow-y-auto custom-scrollbar rounded-[1.75rem] sm:rounded-[2.25rem] shadow-2xl border border-white dark:border-slate-800 p-5 sm:p-6 md:p-7">
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
                {exam.config.examMode === "PR"
                  ? "Tanpa Batas"
                  : exam.config.timeLimit > 0
                    ? `${exam.config.timeLimit} Menit`
                    : "Tanpa Batas"}
              </p>
              {exam.config.examMode !== "PR" && exam.config.timeLimit > 0 && (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {isOvertimeAllowedForExam(exam.config)
                    ? "Durasi utuh meski melewati jam tutup"
                    : "Mengikuti sisa jam ujian/sesi"}
                </p>
              )}
            </div>
          </div>

          {/* Target Nilai */}
          {exam.config.kkm && (
            <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl sm:rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
              <div className="w-8 h-8 rounded-lg bg-emerald-100/70 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircleIcon className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-[11px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                  Target Nilai
                </p>
                <p className="text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-300 truncate">
                  KKM Minimal {exam.config.kkm}
                </p>
              </div>
            </div>
          )}

          {/* Pengawasan Aktif */}
          {exam.config.detectBehavior && exam.config.examMode !== "PR" && (
            <div className="flex items-center gap-3 p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl sm:rounded-2xl border border-rose-100 dark:border-rose-900/30">
              <div className="w-8 h-8 rounded-lg bg-rose-100/70 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <LockClosedIcon className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-[11px] font-black uppercase text-rose-500 dark:text-rose-400 tracking-wider">
                  Pengawasan Aktif
                </p>
                <p className="text-xs sm:text-sm font-bold text-rose-700 dark:text-rose-300 truncate">
                  {exam.config.continueWithPermission
                    ? "Akses Terkunci Jika Curang"
                    : "Aktivitas Tercatat Sistem"}
                </p>
              </div>
            </div>
          )}

          {/* Mode Acak */}
          {(exam.config.shuffleQuestions || exam.config.shuffleAnswers) && (
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
          {exam.config.trackLocation && exam.config.examMode !== "PR" && (
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
          {exam.config.isOlympiadMode && (
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
                    +{exam.config.olympiadScoring?.correctMultiplier ?? 4}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-rose-200/60 dark:border-rose-900/40 shadow-2xs">
                  <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400">Salah</span>
                  <span className="text-xs sm:text-sm font-black font-mono text-rose-600 dark:text-rose-400">
                    {exam.config.olympiadScoring?.wrongMultiplier ?? -1}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700 shadow-2xs">
                  <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400">Kosong</span>
                  <span className="text-xs sm:text-sm font-black font-mono text-slate-600 dark:text-slate-300">
                    {exam.config.olympiadScoring?.emptyMultiplier ?? 0}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Garis Pemisah Horizontal & Tombol Mulai Mengerjakan */}
        <div className="mt-3.5 sm:mt-4 pt-3.5 sm:pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onStart}
            className="w-full py-2.5 sm:py-3 px-5 bg-slate-900 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl sm:rounded-2xl shadow-md hover:shadow-indigo-500/20 transition-all active:scale-[0.99] flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>Mulai Mengerjakan</span>
            <CheckCircleIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};
