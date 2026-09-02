import React from "react";
import { XMarkIcon, DocumentDuplicateIcon } from "../../../Icons";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  liveUrl: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  liveUrl,
}) => {
  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(liveUrl);
    alert("Link berhasil disalin!");
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-8 text-center animate-slide-in-up border border-white dark:border-slate-700">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white tracking-tight">
            Akses Pantauan
          </h3>
          <button
            onClick={onClose}
            className="p-2 bg-slate-50 dark:bg-slate-700 text-slate-400 rounded-full hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-lg mb-6 inline-block mx-auto relative group">
          <div className="absolute -inset-1 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-3xl opacity-20 blur group-hover:opacity-30 transition-opacity"></div>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(liveUrl)}&margin=10`}
            alt="QR Code Live"
            className="w-48 h-48 object-contain relative bg-white rounded-xl"
          />
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-6 leading-relaxed px-2">
          Minta orang tua siswa untuk memindai QR Code di atas atau bagikan link
          di bawah ini.
        </p>

        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
          <div className="flex-1 px-3 py-1 overflow-hidden">
            <p className="text-xs font-code slashed-zero text-slate-600 dark:text-slate-300 truncate text-left">
              {liveUrl}
            </p>
          </div>
          <button
            onClick={handleCopy}
            className="p-2 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
            title="Salin Link"
          >
            <DocumentDuplicateIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
