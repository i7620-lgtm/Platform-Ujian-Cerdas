import React, { useState } from "react";

export const UnlockForm: React.FC<{
  onUnlock: (token: string) => void;
  onCancel: () => void;
}> = ({ onUnlock, onCancel }) => {
  const [token, setToken] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onUnlock(token);
      }}
      className="space-y-3"
    >
      <input
        type="text"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        className="w-full text-center text-xl font-mono font-black tracking-[0.3em] py-3 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl focus:border-rose-400 dark:focus:border-rose-500 focus:bg-white dark:focus:bg-slate-900 outline-none uppercase transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-700"
        placeholder="TOKEN"
        maxLength={6}
      />
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors uppercase tracking-wide"
        >
          Batal
        </button>
        <button
          type="submit"
          className="flex-[2] py-3 text-xs font-bold text-white bg-rose-500 rounded-xl hover:bg-rose-600 shadow-lg shadow-rose-200 dark:shadow-rose-900/30 transition-all uppercase tracking-wide"
        >
          Buka Akses
        </button>
      </div>
    </form>
  );
};
