import React from "react";
import type { Exam, Student } from "../../types";
import {
  UserIcon,
  AcademicCapIcon,
  BookOpenIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  ArrowsRightLeftIcon,
  MapPinIcon,
} from "../Icons";

interface StudentIdentityVerificationModalProps {
  student: Student;
  exam: Exam;
  totalQuestions: number;
  onConfirmStart: () => void;
  onBack?: () => void;
}

export const StudentIdentityVerificationModal: React.FC<
  StudentIdentityVerificationModalProps
> = React.memo(({ student, exam, totalQuestions, onConfirmStart, onBack }) => {
  const isPR = (exam.config.examMode || "").trim().toUpperCase() === "PR";
  const timeLimitDisplay = isPR
    ? "Tanpa Batas (Mode PR)"
    : exam.config.timeLimit > 0
      ? `${exam.config.timeLimit} Menit`
      : "Tanpa Batas";

  return (
    <div
      id="modal-cek-data-diri-overlay"
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-cek-data-diri-title"
    >
      <div
        id="modal-cek-data-diri-card"
        className="bg-white dark:bg-slate-900 w-full max-w-lg max-h-[92vh] flex flex-col rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-gentle-slide transition-colors"
      >
        {/* Header with high contrast and visual cue for all literacy levels */}
        <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 p-5 sm:p-6 text-white text-center relative shrink-0">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 mb-3 shadow-inner">
            <UserIcon className="w-8 h-8 text-white" />
          </div>
          <div className="inline-block px-3 py-0.5 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest text-indigo-100 mb-1">
            Konfirmasi Sebelum Ujian
          </div>
          <h2
            id="modal-cek-data-diri-title"
            className="text-xl sm:text-2xl font-black tracking-tight"
          >
            Cek Data Diri Peserta
          </h2>
          <p className="text-xs text-indigo-100/90 font-medium max-w-sm mx-auto mt-1 leading-relaxed">
            Periksa dan pastikan data di bawah ini adalah identitas resmi Anda
            sebelum memulai pengerjaan soal.
          </p>
        </div>

        {/* Scrollable content area */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Card 1: Data Identitas Siswa */}
          <div
            id="card-identitas-siswa"
            className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/60 space-y-3.5"
          >
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Identitas Siswa Terdaftar
              </p>
            </div>

            {/* Nama Lengkap */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 border border-indigo-100 dark:border-indigo-900/40">
                <UserIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Nama Lengkap
                </p>
                <p className="text-base font-black text-slate-800 dark:text-slate-100 break-words">
                  {student.fullName || "-"}
                </p>
              </div>
            </div>

            {/* Asal Sekolah */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5 border border-purple-100 dark:border-purple-900/40">
                <AcademicCapIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Asal Sekolah
                </p>
                <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200 break-words">
                  {student.schoolName || "-"}
                </p>
              </div>
            </div>

            {/* Kelas & No Absen Grid */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-white dark:bg-slate-900/70 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Kelas
                </p>
                <p className="text-sm font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {student.class || "-"}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-900/70 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-sans">
                  No. Absen / NIS
                </p>
                <p className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {student.absentNumber || "-"}
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Informasi Ujian */}
          <div
            id="card-informasi-ujian"
            className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/60 space-y-3"
          >
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
              <BookOpenIcon className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Informasi Ujian
              </p>
            </div>

            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-black text-slate-800 dark:text-slate-100">
                  {exam.config.subject || "Ujian Terbuka"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                  Kode: <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{exam.code}</span>
                  {exam.config.classLevel ? ` • Jenjang ${exam.config.classLevel}` : ""}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="inline-block px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-black">
                  {totalQuestions} Soal
                </span>
              </div>
            </div>

            {/* Aturan Singkat */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div className="flex items-center gap-2.5 p-2.5 bg-white dark:bg-slate-900/70 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <ClockIcon className="w-4 h-4 text-amber-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                    Waktu Pengerjaan
                  </p>
                  <p className="text-xs font-extrabold text-slate-700 dark:text-slate-200 truncate">
                    {timeLimitDisplay}
                  </p>
                </div>
              </div>

              {exam.config.kkm ? (
                <div className="flex items-center gap-2.5 p-2.5 bg-white dark:bg-slate-900/70 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                      Target Nilai (KKM)
                    </p>
                    <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                      Minimal {exam.config.kkm}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 p-2.5 bg-white dark:bg-slate-900/70 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                  <ShieldCheckIcon className="w-4 h-4 text-indigo-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                      Sistem Penilaian
                    </p>
                    <p className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
                      Otomatis & Standar
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Badge Pengawasan Aktif jika ada */}
            {exam.config.detectBehavior && !isPR && (
              <div className="flex items-center gap-2 p-2.5 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-100 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs">
                <LockClosedIcon className="w-4 h-4 shrink-0 text-rose-500" />
                <span className="font-semibold text-[11px]">
                  Pengawasan aktif: Dilarang membuka tab lain atau keluar dari layar ujian.
                </span>
              </div>
            )}
          </div>

          {/* Pernyataan Konfirmasi */}
          <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2.5">
            <CheckCircleIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <p className="font-medium text-[11px] leading-snug">
              Jawaban dan durasi pengerjaan akan otomatis tersimpan atas nama Anda.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 sm:p-6 bg-slate-50/80 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800 shrink-0 flex flex-col sm:flex-row gap-3">
          {onBack && (
            <button
              id="btn-bukan-data-saya"
              type="button"
              onClick={onBack}
              className="sm:w-1/3 py-3.5 px-4 text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2 active:scale-[0.98] min-h-[48px]"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              <span>Bukan Data Saya</span>
            </button>
          )}

          <button
            id="btn-mulai-mengerjakan-ujian"
            type="button"
            onClick={onConfirmStart}
            className="flex-1 py-3.5 px-5 text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40 transition-all flex items-center justify-center gap-2.5 active:scale-[0.98] min-h-[48px]"
          >
            <span>Mulai Mengerjakan Ujian</span>
            <CheckCircleIcon className="w-5 h-5 text-emerald-300" />
          </button>
        </div>
      </div>
    </div>
  );
});

StudentIdentityVerificationModal.displayName = "StudentIdentityVerificationModal";
