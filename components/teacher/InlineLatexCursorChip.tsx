import React, { useState, useRef, useEffect } from "react";
import { CheckIcon, XMarkIcon } from "../Icons";

export interface InlineLatexCursorChipProps {
  initialLatex: string;
  onCommit: (latex: string) => void;
  onCancel: () => void;
  onChange?: (latex: string) => void;
  externalAppend?: string | null;
  onClearExternalAppend?: () => void;
}

export const InlineLatexCursorChip: React.FC<InlineLatexCursorChipProps> = ({
  initialLatex,
  onCommit,
  onCancel,
  onChange,
  externalAppend,
  onClearExternalAppend,
}) => {
  const [latex, setLatex] = useState(initialLatex || "");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus and select input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  // Broadcast latex changes to parent toolbar live preview
  useEffect(() => {
    if (onChange) {
      onChange(latex);
    }
  }, [latex, onChange]);

  // Handle external symbol insertion from the math toolbar
  useEffect(() => {
    if (externalAppend && externalAppend.trim()) {
      setLatex((prev) => {
        if (!inputRef.current) return prev + externalAppend;
        const start = inputRef.current.selectionStart ?? prev.length;
        const end = inputRef.current.selectionEnd ?? prev.length;
        const next = prev.slice(0, start) + externalAppend + prev.slice(end);

        // Restore caret position after insertion
        setTimeout(() => {
          if (inputRef.current) {
            const nextCursorPos = start + externalAppend.length;
            inputRef.current.focus();
            inputRef.current.setSelectionRange(nextCursorPos, nextCursorPos);
          }
        }, 0);

        return next;
      });

      if (onClearExternalAppend) {
        onClearExternalAppend();
      }
    }
  }, [externalAppend, onClearExternalAppend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      onCommit(latex);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onCancel();
    }
  };

  // Dynamic input width calculation: expands smoothly with LaTeX length up to 560px
  const dynamicInputWidth = Math.min(
    560,
    Math.max(190, latex.length * 8.5 + 40)
  );

  return (
    <span
      className="inline-flex flex-wrap items-center gap-1.5 p-1.5 my-2 mx-1 bg-white dark:bg-slate-900 border-2 border-indigo-500 dark:border-indigo-400 rounded-xl shadow-lg align-middle select-none max-w-full z-30 ring-4 ring-indigo-500/15 animate-in fade-in zoom-in-95 duration-150"
      onMouseDown={(e) => {
        // Prevent click from defocusing input or moving contentEditable caret
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      {/* Formula Badge (Uniform h-9 height) */}
      <span className="shrink-0 h-9 px-2.5 flex items-center justify-center text-xs font-bold font-serif italic text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 rounded-lg">
        fx
      </span>

      {/* Dynamic-width LaTeX Input Box (Uniform h-9 height) */}
      <input
        ref={inputRef}
        type="text"
        value={latex}
        onChange={(e) => setLatex(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ketik LaTeX (cth: \frac{a}{b})"
        style={{ width: `${dynamicInputWidth}px` }}
        className="h-9 px-3 font-mono text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 min-w-[180px] max-w-[560px] flex-1 transition-[width] duration-100 ease-out"
      />

      {/* Action Buttons (Uniform h-9 height, perfectly aligned) */}
      <div className="flex items-center gap-1 shrink-0 ml-auto">
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCommit(latex);
          }}
          className="h-9 px-3 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-lg font-bold text-xs transition shadow-xs cursor-pointer"
          title="Terapkan rumus ke soal (Enter)"
        >
          <CheckIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Terapkan</span>
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCancel();
          }}
          className="h-9 px-2.5 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
          title="Batal (Esc)"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
    </span>
  );
};
