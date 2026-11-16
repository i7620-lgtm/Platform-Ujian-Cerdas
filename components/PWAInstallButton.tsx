import React, { useState } from "react";
import { createPortal } from "react-dom";
import { usePWAInstall } from "../hooks/usePWAInstall";
import { XMarkIcon } from "./Icons";

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/20 active:scale-95"
        title="Pasang Aplikasi ke Layar Utama"
      >
        <svg
          className="w-4 h-4 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.2"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        <span className="text-xs font-bold uppercase tracking-wider">
          Pasang App
        </span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full bg-white/90 dark:bg-slate-800/90 text-indigo-600 dark:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-md shadow-slate-200/50 dark:shadow-none border border-indigo-200/70 dark:border-slate-700 backdrop-blur-sm active:scale-95"
          title="Panduan Pasang Aplikasi di iPhone / iPad"
        >
          <svg
            className="w-4 h-4 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          <span className="text-xs font-bold uppercase tracking-wider">
            Pasang iOS
          </span>
        </button>

        {showIOSGuide &&
          typeof document !== "undefined" &&
          createPortal(
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
              <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Pasang di iPhone / iPad
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowIOSGuide(false)}
                    className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    aria-label="Tutup panduan"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
                <ol className="space-y-2.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed list-decimal list-inside">
                  <li>
                    Ketuk ikon <strong>Bagikan (Share)</strong> pada bilah
                    Safari.
                  </li>
                  <li>
                    Gulir ke bawah lalu pilih{" "}
                    <strong>Tambah ke Layar Utama (Add to Home Screen)</strong>.
                  </li>
                  <li>
                    Ketuk <strong>Tambah</strong> di pojok kanan atas.
                  </li>
                </ol>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="mt-5 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 transition-colors"
                >
                  Mengerti
                </button>
              </div>
            </div>,
            document.body
          )}
      </>
    );
  }

  return null;
};
