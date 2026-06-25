import React from "react";
import { LockClosedIcon } from "../../Icons";

interface UnlockScreenProps {
  unlockToken: string;
  setUnlockToken: (token: string) => void;
  unlockError: string;
  isUnlocking: boolean;
  handleUnlockSubmit: (e: React.FormEvent) => void;
  onFinish: () => void;
}

export const UnlockScreen: React.FC<UnlockScreenProps> = ({
  unlockToken,
  setUnlockToken,
  unlockError,
  isUnlocking,
  handleUnlockSubmit,
  onFinish,
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-rose-50 dark:bg-rose-950 p-6 transition-colors duration-300">
      <div className="w-full max-w-sm text-center bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-rose-100 dark:border-rose-900 animate-fade-in">
        <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 text-rose-500 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-rose-50/50 dark:ring-rose-900/20">
          <LockClosedIcon className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-black text-slate-900 dark:text-white mb-2">
          Akses Terkunci
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          Sesi Anda dihentikan. <br />
          Masukkan <strong>Token Guru</strong> untuk membuka kembali akses ujian ini.
        </p>

        <form onSubmit={handleUnlockSubmit} className="mb-6 space-y-3">
          <input
            type="text"
            inputMode="numeric"
            value={unlockToken}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "").slice(0, 4);
              setUnlockToken(val);
            }}
            className="w-full text-center text-xl font-mono font-bold tracking-[0.5em] py-3 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl focus:border-rose-400 dark:focus:border-rose-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all uppercase placeholder:tracking-normal placeholder:font-sans text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            placeholder="4 ANGKA TOKEN"
            maxLength={4}
          />
          {unlockError && (
            <p className="text-xs font-bold text-rose-500 animate-pulse">
              {unlockError}
            </p>
          )}
          <button
            type="submit"
            disabled={isUnlocking || unlockToken.length !== 4}
            className="w-full bg-rose-500 text-white font-bold py-3 rounded-xl hover:bg-rose-600 transition-all text-sm shadow-lg shadow-rose-200 dark:shadow-rose-900/30 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isUnlocking ? "Membuka Akses..." : "Buka Kunci"}
          </button>
        </form>

        <button
          onClick={onFinish}
          className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        >
          Kembali ke Beranda
        </button>
      </div>
    </div>
  );
};
