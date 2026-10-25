import React, { useState } from "react";
import { createPortal } from "react-dom";
import { XMarkIcon, SparklesIcon, CheckCircleIcon } from "../../Icons";

export interface AnalysisTargetItem {
  key: string;
  label: string;
  isOverall: boolean;
  className?: string;
  studentCount: number;
}

interface AiAnalysisTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  targets: AnalysisTargetItem[];
  onStart: (selectedKeys: string[]) => void;
  hasExistingAnalyses?: boolean;
}

export const AiAnalysisTargetModal: React.FC<AiAnalysisTargetModalProps> = ({
  isOpen,
  onClose,
  targets,
  onStart,
  hasExistingAnalyses = false,
}) => {
  // By default, select all targets
  const [selectedKeys, setSelectedKeys] = useState<string[]>(() =>
    targets.map((t) => t.key),
  );

  React.useEffect(() => {
    if (isOpen) {
      setSelectedKeys(targets.map((t) => t.key));
    }
  }, [isOpen, targets]);

  if (!isOpen) return null;

  const toggleTarget = (key: string) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const handleSelectAll = () => {
    if (selectedKeys.length === targets.length) {
      setSelectedKeys([]);
    } else {
      setSelectedKeys(targets.map((t) => t.key));
    }
  };

  const handleStart = () => {
    if (selectedKeys.length === 0) return;
    onStart(selectedKeys);
  };

  const allSelected = selectedKeys.length === targets.length;

  return createPortal(
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
              <SparklesIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Pilih Target Analisis AI
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pilih cakupan analisis yang ingin diproses secara berurutan.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          {hasExistingAnalyses && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs text-amber-800 dark:text-amber-300">
              <strong>Catatan:</strong> Memulai analisis baru akan memproses ulang target yang dipilih dari awal untuk memastikan data terbaru.
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Daftar Target Analisis
            </span>
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {allSelected ? "Batal Pilih Semua" : "Pilih Semua"}
            </button>
          </div>

          <div className="space-y-2.5">
            {targets.map((item) => {
              const isChecked = selectedKeys.includes(item.key);
              return (
                <label
                  key={item.key}
                  onClick={() => toggleTarget(item.key)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isChecked
                      ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 shadow-sm"
                      : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}} // handled by parent label click
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          {item.label}
                        </span>
                        {item.isOverall && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                            Semua Kelas
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {item.isOverall
                          ? "Analisis gabungan seluruh siswa untuk potret makro angkatan"
                          : `Analisis murni dan eksklusif untuk ${item.label}`}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                    {item.studentCount} Siswa
                  </span>
                </label>
              );
            })}
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <p className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
              <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
              <span>Pemrosesan Sekuensial Satu per Satu:</span>
            </p>
            <p>
              AI akan menganalisis target satu per satu untuk menghindari batas waktu <em>timeout</em>. Hasil tiap kelas langsung tersimpan otomatis.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={selectedKeys.length === 0}
            onClick={handleStart}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 flex items-center gap-2"
          >
            <SparklesIcon className="w-4 h-4" />
            <span>Mulai Analisis AI ({selectedKeys.length} Target)</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
