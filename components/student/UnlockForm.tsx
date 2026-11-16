import React, { useState } from "react";

export const UnlockForm: React.FC<{
  onUnlock: (token: string) => void | Promise<void>;
  onCancel: () => void;
  errorMessage?: string;
  onClearError?: () => void;
  isSubmitting?: boolean;
}> = ({ onUnlock, onCancel, errorMessage, onClearError, isSubmitting = false }) => {
  const [token, setToken] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!isSubmitting) onUnlock(token);
      }}
      className="space-y-3"
    >
      <input
        type="text"
        value={token}
        onChange={(e) => {
          setToken(e.target.value);
          if (errorMessage && onClearError) onClearError();
        }}
        className="w-full text-center text-xl font-mono font-black tracking-[0.3em] py-3 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl focus:border-rose-400 dark:focus:border-rose-500 focus:bg-white dark:focus:bg-slate-900 outline-none uppercase transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-700"
        placeholder="TOKEN"
        maxLength={6}
        disabled={isSubmitting}
      />
      {errorMessage && (
        <div
          role="alert"
          className="px-3 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-300 text-xs font-bold text-center animate-fast-fade"
        >
          {errorMessage}
        </div>
      )}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 min-h-[44px] py-3 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors uppercase tracking-wide disabled:opacity-60 cursor-pointer"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !token.trim()}
          className="flex-[2] min-h-[44px] py-3 text-xs font-bold text-white bg-rose-500 rounded-xl hover:bg-rose-600 shadow-lg shadow-rose-200 dark:shadow-rose-900/30 transition-all uppercase tracking-wide disabled:opacity-60 cursor-pointer"
        >
          {isSubmitting ? "Memeriksa..." : "Buka Akses"}
        </button>
      </div>
    </form>
  );
};
