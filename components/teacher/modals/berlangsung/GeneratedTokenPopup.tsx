import React from "react";
import { XMarkIcon, LockClosedIcon } from "../../../Icons";

interface TokenData {
  name: string;
  token: string;
}

interface GeneratedTokenPopupProps {
  isOpen: boolean;
  onClose: () => void;
  tokenData: TokenData | null;
}

export const GeneratedTokenPopup: React.FC<GeneratedTokenPopupProps> = ({
  isOpen,
  onClose,
  tokenData,
}) => {
  if (!isOpen || !tokenData) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border border-white dark:border-slate-700 relative animate-slide-in-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-full transition-colors"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
        <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-emerald-50/50 dark:ring-emerald-950/20">
          <LockClosedIcon className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-black text-slate-850 dark:text-white mb-1">
          Kode Akses Dibuat!
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 px-4">
          Berikan kode ini kepada <strong>{tokenData.name}</strong> untuk
          membuka sesi ujian.
        </p>

        <div className="bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl py-5 mb-6 shadow-inner">
          <span className="text-4xl font-code slashed-zero font-black tracking-[0.25em] text-slate-800 dark:text-white">
            {tokenData.token}
          </span>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-slate-900 dark:bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-black dark:hover:bg-indigo-700 transition-all shadow-lg active:scale-[0.98] text-sm uppercase tracking-wider"
        >
          Tutup
        </button>
      </div>
    </div>
  );
};
