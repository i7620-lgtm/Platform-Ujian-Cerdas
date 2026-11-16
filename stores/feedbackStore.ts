import { create } from "zustand";

export type FeedbackTone = "info" | "warning" | "danger" | "success";

export interface FeedbackModalOptions {
  title: string;
  message: string;
  tone?: FeedbackTone;
  confirmLabel?: string;
  cancelLabel?: string;
  closeOnBackdrop?: boolean;
}

export interface FeedbackModalItem {
  id: string;
  mode: "alert" | "confirm";
  tone: FeedbackTone;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  closeOnBackdrop: boolean;
  resolve: (confirmed: boolean) => void;
}

export interface FeedbackToastOptions {
  title?: string;
  message: string;
  tone?: FeedbackTone;
  durationMs?: number;
}

export interface FeedbackToastItem {
  id: string;
  title?: string;
  message: string;
  tone: FeedbackTone;
  durationMs: number;
  createdAt: number;
}

interface FeedbackState {
  activeModal: FeedbackModalItem | null;
  modalQueue: FeedbackModalItem[];
  toasts: FeedbackToastItem[];
  enqueueModal: (
    mode: "alert" | "confirm",
    options: FeedbackModalOptions,
  ) => Promise<boolean>;
  resolveActiveModal: (confirmed: boolean) => void;
  pushToast: (options: FeedbackToastOptions) => void;
  dismissToast: (id: string) => void;
}

let feedbackIdSeq = 0;
const nextFeedbackId = (prefix: string) => {
  feedbackIdSeq += 1;
  return `${prefix}-${Date.now()}-${feedbackIdSeq}`;
};

const MAX_ACTIVE_TOASTS = 3;

export const useFeedbackStore = create<FeedbackState>((set, get) => ({
  activeModal: null,
  modalQueue: [],
  toasts: [],

  enqueueModal: (mode, options) => {
    return new Promise<boolean>((resolve) => {
      const tone: FeedbackTone = options.tone || (mode === "confirm" ? "warning" : "info");
      const item: FeedbackModalItem = {
        id: nextFeedbackId("modal"),
        mode,
        tone,
        title: options.title,
        message: options.message,
        confirmLabel:
          options.confirmLabel ||
          (mode === "confirm" ? "Lanjutkan" : "Mengerti"),
        cancelLabel: options.cancelLabel || "Batal",
        closeOnBackdrop: options.closeOnBackdrop ?? true,
        resolve,
      };

      const { activeModal } = get();
      if (!activeModal) {
        set({ activeModal: item });
      } else {
        set((state) => ({ modalQueue: [...state.modalQueue, item] }));
      }
    });
  },

  resolveActiveModal: (confirmed) => {
    const { activeModal, modalQueue } = get();
    if (!activeModal) return;

    const [nextModal, ...remainingQueue] = modalQueue;
    set({
      activeModal: nextModal || null,
      modalQueue: remainingQueue,
    });

    activeModal.resolve(confirmed);
  },

  pushToast: (options) => {
    const item: FeedbackToastItem = {
      id: nextFeedbackId("toast"),
      title: options.title,
      message: options.message,
      tone: options.tone || "success",
      durationMs: options.durationMs ?? 3500,
      createdAt: Date.now(),
    };

    set((state) => {
      const combined = [...state.toasts, item];
      const trimmed =
        combined.length > MAX_ACTIVE_TOASTS
          ? combined.slice(combined.length - MAX_ACTIVE_TOASTS)
          : combined;
      return { toasts: trimmed };
    });
  },

  dismissToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));

export const showAlertModal = async (
  options: FeedbackModalOptions | string,
  titleFallback = "Pemberitahuan",
): Promise<void> => {
  const normalized: FeedbackModalOptions =
    typeof options === "string"
      ? { title: titleFallback, message: options, tone: "info" }
      : options;
  await useFeedbackStore.getState().enqueueModal("alert", normalized);
};

export const showConfirmModal = async (
  options: FeedbackModalOptions | string,
  titleFallback = "Konfirmasi",
): Promise<boolean> => {
  const normalized: FeedbackModalOptions =
    typeof options === "string"
      ? { title: titleFallback, message: options, tone: "warning" }
      : options;
  return useFeedbackStore.getState().enqueueModal("confirm", normalized);
};

export const showToast = (
  options: FeedbackToastOptions | string,
  toneFallback: FeedbackTone = "success",
): void => {
  const normalized: FeedbackToastOptions =
    typeof options === "string"
      ? { message: options, tone: toneFallback }
      : options;
  useFeedbackStore.getState().pushToast(normalized);
};
