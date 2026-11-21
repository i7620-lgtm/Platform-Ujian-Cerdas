import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  useFeedbackStore,
  type FeedbackTone,
  type FeedbackToastItem,
} from "../stores/feedbackStore";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  QuestionMarkCircleIcon,
  XMarkIcon,
} from "./Icons";

const getModalToneStyles = (tone: FeedbackTone, mode: "alert" | "confirm") => {
  switch (tone) {
    case "danger":
      return {
        iconWrap:
          "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900",
        primaryBtn:
          "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200/60 dark:shadow-rose-950/40 focus-visible:ring-rose-500",
        icon: "danger" as const,
      };
    case "warning":
      return {
        iconWrap:
          "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900",
        primaryBtn:
          "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200/60 dark:shadow-amber-950/40 focus-visible:ring-amber-500",
        icon: "warning" as const,
      };
    case "success":
      return {
        iconWrap:
          "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900",
        primaryBtn:
          "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200/60 dark:shadow-emerald-950/40 focus-visible:ring-emerald-500",
        icon: "success" as const,
      };
    default:
      return {
        iconWrap:
          "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900",
        primaryBtn:
          mode === "confirm"
            ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200/50 dark:shadow-indigo-950/40 focus-visible:ring-indigo-500"
            : "bg-slate-900 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white shadow-indigo-200/50 dark:shadow-indigo-950/40 focus-visible:ring-indigo-500",
        icon: "info" as const,
      };
  }
};

const ToastCard: React.FC<{
  toast: FeedbackToastItem;
  onDismiss: (id: string) => void;
}> = ({ toast, onDismiss }) => {
  const isPausedRef = useRef(false);
  const remainingRef = useRef(toast.durationMs);
  const lastStartRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const startTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      lastStartRef.current = Date.now();
      timerRef.current = setTimeout(() => {
        if (!isPausedRef.current) {
          onDismiss(toast.id);
        }
      }, remainingRef.current);
    };

    startTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.id, onDismiss]);

  const handleMouseEnter = () => {
    isPausedRef.current = true;
    const elapsed = Date.now() - lastStartRef.current;
    remainingRef.current = Math.max(800, remainingRef.current - elapsed);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handleMouseLeave = () => {
    isPausedRef.current = false;
    lastStartRef.current = Date.now();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onDismiss(toast.id);
    }, remainingRef.current);
  };

  const toneBadgeClass =
    toast.tone === "danger"
      ? "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900"
      : toast.tone === "warning"
        ? "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900"
        : toast.tone === "info"
          ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900"
          : "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900";

  return (
    <div
      role="status"
      aria-live="polite"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleMouseEnter}
      onTouchEnd={handleMouseLeave}
      className="pointer-events-auto w-full sm:w-88 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg px-4 py-3 flex items-start gap-3 animate-slide-up transition-all"
    >
      <div
        className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${toneBadgeClass}`}
      >
        {toast.tone === "danger" || toast.tone === "warning" ? (
          <ExclamationTriangleIcon className="w-4 h-4" />
        ) : toast.tone === "info" ? (
          <QuestionMarkCircleIcon className="w-4 h-4" />
        ) : (
          <CheckCircleIcon className="w-4 h-4" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
            {toast.title}
          </p>
        )}
        <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed break-words">
          {toast.message}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
        aria-label="Tutup notifikasi"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  );
};

export const FeedbackHost: React.FC = () => {
  const activeModal = useFeedbackStore((s) => s.activeModal);
  const toasts = useFeedbackStore((s) => s.toasts);
  const resolveActiveModal = useFeedbackStore((s) => s.resolveActiveModal);
  const dismissToast = useFeedbackStore((s) => s.dismissToast);

  useEffect(() => {
    if (!activeModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activeModal.closeOnBackdrop) {
        e.preventDefault();
        resolveActiveModal(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeModal, resolveActiveModal]);

  if (typeof document === "undefined") return null;

  const modalStyles = activeModal
    ? getModalToneStyles(activeModal.tone, activeModal.mode)
    : null;

  return createPortal(
    <>
      {toasts.length > 0 && (
        <div
          aria-label="Notifikasi"
          className="fixed top-[calc(1rem+env(safe-area-inset-top,0px))] right-[calc(1rem+env(safe-area-inset-right,0px))] left-[calc(1rem+env(safe-area-inset-left,0px))] sm:left-auto z-[11060] pointer-events-none flex flex-col items-center sm:items-end gap-2.5 max-w-full"
        >
          {toasts.map((toast) => (
            <ToastCard key={toast.id} toast={toast} onDismiss={dismissToast} />
          ))}
        </div>
      )}

      {activeModal && modalStyles && (
        <div
          className="fixed inset-0 z-[11050] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="global-feedback-modal-title"
          onClick={() => {
            if (activeModal.closeOnBackdrop) {
              resolveActiveModal(false);
            }
          }}
        >
          <div
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 relative animate-scale-up text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {activeModal.closeOnBackdrop && (
              <button
                type="button"
                onClick={() => resolveActiveModal(false)}
                className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Tutup dialog"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            )}

            <div className="flex justify-center mb-4">
              <div
                className={`w-14 h-14 rounded-2xl border flex items-center justify-center ${modalStyles.iconWrap}`}
              >
                {modalStyles.icon === "danger" ||
                modalStyles.icon === "warning" ? (
                  <ExclamationTriangleIcon className="w-7 h-7" />
                ) : modalStyles.icon === "success" ? (
                  <CheckCircleIcon className="w-7 h-7" />
                ) : (
                  <QuestionMarkCircleIcon className="w-7 h-7" />
                )}
              </div>
            </div>

            <h3
              id="global-feedback-modal-title"
              className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-2"
            >
              {activeModal.title}
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line break-words">
              {activeModal.message}
            </p>

            <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2.5">
              {activeModal.mode === "confirm" && (
                <button
                  type="button"
                  onClick={() => resolveActiveModal(false)}
                  className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  {activeModal.cancelLabel}
                </button>
              )}
              <button
                type="button"
                autoFocus
                onClick={() => resolveActiveModal(true)}
                className={`flex-[1.3] min-h-[44px] px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${modalStyles.primaryBtn}`}
              >
                <span>{activeModal.confirmLabel}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body,
  );
};
