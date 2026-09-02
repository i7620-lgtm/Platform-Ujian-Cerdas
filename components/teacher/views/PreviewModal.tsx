import React from "react";
import { createPortal } from "react-dom";
import { XMarkIcon, EyeIcon } from "../../Icons";
import { Exam } from "../../../types";

interface PreviewModalProps {
  exam: Exam;
  onClose: () => void;
  onCopyLink: (exam: Exam) => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  exam,
  onClose,
  onCopyLink,
}) => {
  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-in-up border border-white dark:border-slate-700 max-h-[95vh] flex flex-col">
        <div className="p-3 border-b bg-gray-50 dark:bg-slate-900 border-gray-100 dark:border-slate-700 flex justify-between items-center shrink-0">
          <h3 className="font-bold text-base text-gray-800 dark:text-white">
            Preview Ujian
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500 dark:text-slate-400" />
          </button>
        </div>
        <div className="p-5 flex flex-col items-center text-center overflow-y-auto">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-3 shadow-inner shrink-0">
            <EyeIcon className="w-6 h-6" />
          </div>
          <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-0.5 leading-tight">
            {exam.config.subject || "Draf Ujian"}
          </h4>
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-4 font-code slashed-zero bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded border border-gray-200 dark:border-slate-600">
            {exam.code}
          </p>
          <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm mb-4 shrink-0">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${window.location.origin}/?preview=${exam.code}`)}&margin=10`}
              alt="QR Preview"
              className="w-32 h-32 object-contain"
            />
          </div>
          <p className="text-[10px] text-gray-400 dark:text-slate-500 mb-4 max-w-xs leading-relaxed">
            Pindai QR Code atau gunakan link di bawah untuk mencoba mengerjakan
            soal ini (Mode Preview).
          </p>
          <div className="flex gap-2 w-full shrink-0">
            <button
              onClick={() => onCopyLink(exam)}
              className="flex-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 font-bold py-2.5 px-3 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors text-xs"
            >
              Salin Link
            </button>
            <a
              href={`/?preview=${exam.code}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 bg-blue-600 text-white font-bold py-2.5 px-3 rounded-xl hover:bg-blue-700 transition-colors text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-200 dark:shadow-none"
            >
              Coba Sekarang
            </a>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
