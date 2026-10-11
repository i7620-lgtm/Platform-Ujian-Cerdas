import React from "react";
import { ClockIcon, CheckCircleIcon, ArrowPathIcon } from "../Icons";

interface SessionTimeoutModalProps {
  isOpen: boolean;
  sessionEndTime: string;
  timeLeftMinutes: number;
  onContinueNow: () => void;
  onPauseAndResumeNextSession: () => void;
  isSaving?: boolean;
}

export const SessionTimeoutModal: React.FC<SessionTimeoutModalProps> = ({
  isOpen,
  sessionEndTime,
  timeLeftMinutes,
  onContinueNow,
  onPauseAndResumeNextSession,
  isSaving = false,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="modal-session-timeout-overlay"
      className="fixed inset-0 z-[200] bg-slate-900/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in font-sans"
    >
      <div
        id="modal-session-timeout-card"
        className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 animate-slide-in-up text-center space-y-5"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-500 dark:text-amber-400 ring-8 ring-amber-50/50 dark:ring-amber-900/20 mx-auto">
          <ClockIcon className="w-8 h-8" />
        </div>

        <div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Batas Jam Sesi Telah Berakhir
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            Waktu sesi pengerjaan telah mencapai pukul{" "}
            <strong className="text-slate-800 dark:text-slate-200 font-bold">
              {sessionEndTime || "batas jam harian"}
            </strong>
            . Namun, Anda masih memiliki sisa durasi pengerjaan sekitar{" "}
            <strong className="text-indigo-600 dark:text-indigo-400 font-bold">
              {timeLeftMinutes} menit
            </strong>
            .
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-left space-y-2">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Pilih tindakan Anda:
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            • <strong>Lanjutkan Sekarang:</strong> Kerjakan terus hingga sisa durasi waktu Anda habis hari ini.
            <br />
            • <strong>Lanjutkan di Sesi Berikutnya:</strong> Simpan jawaban Anda dengan aman dan lanjutkan di hari / sesi ujian berikutnya.
          </p>
        </div>

        <div className="flex flex-col gap-2.5 pt-2">
          <button
            id="btn-lanjutkan-sekarang-session"
            type="button"
            onClick={onContinueNow}
            disabled={isSaving}
            className="w-full py-3.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-950/40 transition-all flex items-center justify-center gap-2"
          >
            <CheckCircleIcon className="w-4 h-4" />
            <span>Lanjutkan Sekarang ({timeLeftMinutes} mnt tersisa)</span>
          </button>

          <button
            id="btn-lanjutkan-hari-berikutnya-session"
            type="button"
            onClick={onPauseAndResumeNextSession}
            disabled={isSaving}
            className="w-full py-3.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <span className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                <span>Menyimpan Progres...</span>
              </>
            ) : (
              <>
                <ArrowPathIcon className="w-4 h-4" />
                <span>Lanjutkan di Hari / Sesi Berikutnya</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
