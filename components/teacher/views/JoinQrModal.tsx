import React from "react";
import { createPortal } from "react-dom";
import { XMarkIcon, DocumentDuplicateIcon } from "../../Icons";
import { Exam } from "../../../types";

interface JoinQrModalProps {
  exam: Exam;
  onClose: () => void;
  onCopyLink: (exam: Exam) => void;
}

export const JoinQrModal: React.FC<JoinQrModalProps> = ({
  exam,
  onClose,
  onCopyLink,
}) => {
  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[70] animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-8 text-center animate-slide-in-up border border-white dark:border-slate-700 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-full transition-colors"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white tracking-tight">
            Gabung Ujian
          </h3>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-lg mb-6 inline-block mx-auto relative group">
          <div className="absolute -inset-1 bg-gradient-to-tr from-emerald-500 to-teal-500 rounded-3xl opacity-20 blur group-hover:opacity-30 transition-opacity"></div>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/?join=${exam.code}`)}&margin=10`}
            alt="QR Join"
            referrerPolicy="no-referrer"
            className="w-48 h-48 object-contain relative bg-white rounded-xl"
          />
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-6 leading-relaxed px-2">
          Minta siswa memindai kode ini untuk langsung masuk ke halaman login
          dengan kode ujian terisi.
        </p>
        <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 mb-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            Kode Ujian
          </p>
          <p className="text-xl font-code slashed-zero font-black text-slate-800 dark:text-white tracking-widest">
            {exam.code}
          </p>
        </div>
        <button
          onClick={() => onCopyLink(exam)}
          className="w-full py-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all flex items-center justify-center gap-2 text-sm border border-indigo-100 dark:border-indigo-800"
        >
          <DocumentDuplicateIcon className="w-4 h-4" />
          Salin Link Ujian
        </button>
      </div>
    </div>,
    document.body,
  );
};
