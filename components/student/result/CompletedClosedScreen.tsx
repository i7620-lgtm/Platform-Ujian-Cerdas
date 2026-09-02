import React from "react";
import { CheckCircleIcon } from "../../Icons";

interface CompletedClosedScreenProps {
  onFinish: () => void;
}

export const CompletedClosedScreen: React.FC<CompletedClosedScreenProps> = ({
  onFinish,
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 transition-colors duration-300">
      <div className="w-full max-w-md text-center bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 animate-fade-in">
        <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-indigo-50/50 dark:ring-indigo-900/20">
          <CheckCircleIcon className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-black text-slate-900 dark:text-white mb-2">
          Kerja Bagus! Ujian Telah Selesai
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          Tautan ini sudah tidak dapat diakses lagi karena ujian telah ditutup
          atau data telah diarsipkan oleh guru Anda untuk keperluan
          rekapitulasi nilai.
          <br />
          <br />
          Jangan khawatir! Seluruh hasil ujian Anda telah tersimpan dengan
          aman dan rekapannya sekarang berada di tangan guru Anda.
          <br />
          <br />
          Jika Anda ingin melihat kembali hasil ujian Anda, silakan hubungi
          guru mata pelajaran yang bersangkutan. Terus semangat belajarnya!
        </p>
        <button
          onClick={onFinish}
          className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-all text-sm shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30"
        >
          Kembali ke Beranda
        </button>
      </div>
    </div>
  );
};
