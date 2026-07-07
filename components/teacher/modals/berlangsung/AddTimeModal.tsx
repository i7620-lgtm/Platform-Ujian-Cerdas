import React from "react";
import { createPortal } from "react-dom";
import { XMarkIcon, ClockIcon } from "../../../Icons";

interface AddTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  addTimeValue: number | "";
  setAddTimeValue: (val: number | "") => void;
  onSubmit: () => void;
}

export const AddTimeModal: React.FC<AddTimeModalProps> = ({
  isOpen,
  onClose,
  addTimeValue,
  setAddTimeValue,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[70] animate-fade-in font-sans">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-100 dark:border-slate-700 animate-slide-up">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
            <ClockIcon className="w-5 h-5 text-purple-500" />
            Tambah Waktu
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-full transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">
            Tambahkan waktu pengerjaan untuk semua siswa yang sedang mengerjakan.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                Menit Tambahan
              </label>
              <input
                type="number"
                min="1"
                value={addTimeValue}
                onChange={(e) =>
                  setAddTimeValue(
                    e.target.value ? parseInt(e.target.value, 10) : "",
                  )
                }
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-purple-500/50"
                placeholder="Contoh: 15"
              />
            </div>
            <div className="flex gap-2">
              {[5, 10, 15, 30].map((mins) => (
                <button
                  key={mins}
                  onClick={() => setAddTimeValue(mins)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${
                    addTimeValue === mins
                      ? "bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                >
                  +{mins}m
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={onSubmit}
            disabled={!addTimeValue || typeof addTimeValue !== "number"}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Tambahkan
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
