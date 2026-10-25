import React from "react";
import { createPortal } from "react-dom";
import { SparklesIcon, CheckCircleIcon, ExclamationTriangleIcon } from "../../Icons";

export interface QueueItemState {
  key: string;
  label: string;
  status: "pending" | "processing" | "completed" | "failed";
  error?: string;
}

interface AiAnalysisProgressModalProps {
  isOpen: boolean;
  queue: QueueItemState[];
  currentIndex: number;
  currentMessage?: string;
  failedItem: QueueItemState | null;
  onResume: () => void;
  onFinish: () => void;
}

export const AiAnalysisProgressModal: React.FC<AiAnalysisProgressModalProps> = ({
  isOpen,
  queue,
  currentIndex,
  currentMessage,
  failedItem,
  onResume,
  onFinish,
}) => {
  if (!isOpen) return null;

  const total = queue.length;
  const completedCount = queue.filter((q) => q.status === "completed").length;
  const progressPercent = total > 0 ? Math.round((completedCount / total) * 100) : 0;
  const currentItem = queue[currentIndex] || queue[0];

  return createPortal(
    <div className="fixed inset-0 z-[170] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/20 mb-3">
            {failedItem ? (
              <ExclamationTriangleIcon className="w-6 h-6 text-white" />
            ) : (
              <SparklesIcon className="w-6 h-6 animate-pulse" />
            )}
          </div>
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
            {failedItem ? "Analisis Mengalami Kendala" : "Membuat Analisis dengan AI"}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {failedItem
              ? "Proses terhenti pada target di bawah. Hasil sebelumnya telah tersimpan."
              : "Memproses analisis satu per satu untuk memastikan akurasi dan anti-timeout."}
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Progress Bar (if not failed or partially completed) */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
              <span>
                Kemajuan: {completedCount} dari {total} target selesai
              </span>
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                {progressPercent}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  failedItem
                    ? "bg-amber-500"
                    : "bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 animate-pulse"
                }`}
                style={{ width: `${Math.max(progressPercent, 5)}%` }}
              />
            </div>
          </div>

          {/* Error Notice if failedItem */}
          {failedItem ? (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl space-y-1.5">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-xs">
                <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
                <span>Kendala pada: {failedItem.label}</span>
              </div>
              <p className="text-xs text-rose-600 dark:text-rose-400 leading-relaxed">
                {failedItem.error || "Waktu respons server terlampaui (timeout) atau gangguan koneksi."}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                Anda dapat memilih <strong>Lanjutkan Analisis</strong> untuk mencoba kembali target ini, atau <strong>Selesai & Simpan yang Ada</strong> untuk langsung melihat hasil yang telah berhasil.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-xl flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0" />
              <div className="text-xs text-indigo-900 dark:text-indigo-200 truncate">
                <span className="font-semibold block">Sedang Memproses: {currentItem?.label}</span>
                <span className="text-[11px] text-indigo-600 dark:text-indigo-400">
                  {currentMessage || "Menghubungkan ke layanan cerdas AI..."}
                </span>
              </div>
            </div>
          )}

          {/* Queue List Checklist */}
          <div className="space-y-2 border border-slate-100 dark:border-slate-800 rounded-xl p-3 max-h-48 overflow-y-auto custom-scrollbar">
            {queue.map((item, idx) => (
              <div
                key={item.key}
                className="flex items-center justify-between text-xs py-1 px-1.5"
              >
                <div className="flex items-center gap-2">
                  {item.status === "completed" && (
                    <CheckCircleIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                  )}
                  {item.status === "processing" && (
                    <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin shrink-0" />
                  )}
                  {item.status === "failed" && (
                    <span className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                      ✕
                    </span>
                  )}
                  {item.status === "pending" && (
                    <span className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 text-slate-400 flex items-center justify-center text-[10px] shrink-0">
                      {idx + 1}
                    </span>
                  )}
                  <span
                    className={`font-medium ${
                      item.status === "completed"
                        ? "text-slate-800 dark:text-slate-200"
                        : item.status === "processing"
                          ? "text-orange-600 dark:text-orange-400 font-bold"
                          : item.status === "failed"
                            ? "text-rose-600 dark:text-rose-400 font-bold"
                            : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {item.label}
                  </span>
                </div>

                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  {item.status === "completed" && "Tersimpan"}
                  {item.status === "processing" && "Menganalisis..."}
                  {item.status === "failed" && "Gagal"}
                  {item.status === "pending" && "Menunggu"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex justify-end gap-2.5">
          {failedItem ? (
            <>
              <button
                type="button"
                onClick={onFinish}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                Selesai & Simpan yang Ada
              </button>
              <button
                type="button"
                onClick={onResume}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 flex items-center gap-1.5"
              >
                <span>Lanjutkan Analisis</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onFinish}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-xs font-medium transition-colors"
            >
              Hentikan Proses
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};
