import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  QuestionMarkCircleIcon,
  XMarkIcon,
  ArrowPathIcon,
} from "../Icons";

export type StudentDialogVariant = "confirm" | "info" | "warning" | "error" | "success";

export interface StudentDialogModalProps {
  isOpen: boolean;
  variant?: StudentDialogVariant;
  title: string;
  message: string;
  unansweredItems?: { id: string; num: number }[];
  onJumpToQuestion?: (questionId: string) => void;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  onConfirm?: () => void;
  onClose: () => void;
  closeOnBackdrop?: boolean;
}

export const StudentDialogModal: React.FC<StudentDialogModalProps> = ({
  isOpen,
  variant = "info",
  title,
  message,
  unansweredItems,
  onJumpToQuestion,
  confirmLabel = "Mengerti",
  cancelLabel = "Kembali",
  isLoading = false,
  onConfirm,
  onClose,
  closeOnBackdrop = true,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading && closeOnBackdrop) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, isLoading, closeOnBackdrop, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  const isConfirm = variant === "confirm";

  const iconWrapperClass =
    variant === "error"
      ? "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900"
      : variant === "warning"
        ? "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900"
        : variant === "success"
          ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900"
          : "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900";

  const primaryBtnClass =
    variant === "error"
      ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200/60 dark:shadow-rose-950/40"
      : variant === "warning"
        ? "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200/60 dark:shadow-amber-950/40"
        : variant === "success"
          ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200/60 dark:shadow-emerald-950/40"
          : "bg-slate-900 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white shadow-indigo-200/50 dark:shadow-indigo-950/40";

  return createPortal(
    <div
      data-math-ignore="true"
      className="fixed inset-0 z-[10050] bg-slate-950/70 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-dialog-title"
      onClick={() => {
        if (!isLoading && closeOnBackdrop) onClose();
      }}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 relative animate-scale-up text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {!isLoading && closeOnBackdrop && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Tutup dialog"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        )}

        <div className="flex justify-center mb-4">
          <div
            className={`w-14 h-14 rounded-2xl border flex items-center justify-center shadow-xs ${iconWrapperClass}`}
          >
            {isLoading ? (
              <ArrowPathIcon className="w-7 h-7 animate-spin" />
            ) : variant === "error" || variant === "warning" ? (
              <ExclamationTriangleIcon className="w-7 h-7" />
            ) : variant === "success" ? (
              <CheckCircleIcon className="w-7 h-7" />
            ) : (
              <QuestionMarkCircleIcon className="w-7 h-7" />
            )}
          </div>
        </div>

        <h3
          id="student-dialog-title"
          className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight mb-2"
        >
          {title}
        </h3>

        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
          {message}
        </p>

        {unansweredItems && unansweredItems.length > 0 && (
          <div className="mt-4 p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 text-left">
            <p className="text-[11px] font-bold text-amber-900 dark:text-amber-200 mb-2">
              Ketuk nomor soal untuk memeriksa sebelum mengumpulkan:
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar">
              {unansweredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onClose();
                    onJumpToQuestion?.(item.id);
                  }}
                  className="min-h-[36px] px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors cursor-pointer"
                >
                  #{item.num}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2.5">
          {isConfirm && !isLoading && (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            disabled={isLoading}
            onClick={() => {
              if (isConfirm && onConfirm) {
                onConfirm();
              } else {
                onClose();
              }
            }}
            className={`flex-[1.3] min-h-[44px] px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all active:scale-[0.98] disabled:opacity-70 cursor-pointer flex items-center justify-center gap-2 ${primaryBtnClass}`}
          >
            {isLoading && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
