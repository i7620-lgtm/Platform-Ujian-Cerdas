import React from "react";
import {
  PenTool,
  MoveRight,
  RotateCw,
  Move,
  Undo2,
  Redo2,
  Trash2,
} from "lucide-react";

interface GeometryToolbarProps {
  currentTool: "pencil" | "arrow" | "rotate" | "pan";
  onSelectTool: (tool: "pencil" | "arrow" | "rotate" | "pan") => void;
  strokeColor: string;
  onChangeColor: (color: string) => void;
  strokeWidth: number;
  onChangeWidth: (width: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onClear: () => void;
}

const PALETTE_COLORS = [
  { value: "#0f172a", label: "Hitam" },
  { value: "#ef4444", label: "Merah" },
  { value: "#2563eb", label: "Biru" },
  { value: "#10b981", label: "Hijau" },
  { value: "#f97316", label: "Oranye" },
  { value: "#8b5cf6", label: "Ungu" },
];

export const GeometryToolbar: React.FC<GeometryToolbarProps> = ({
  currentTool,
  onSelectTool,
  strokeColor,
  onChangeColor,
  strokeWidth,
  onChangeWidth,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onClear,
}) => {
  return (
    <div className="flex flex-col gap-4 p-3 bg-gray-50 dark:bg-slate-800/80 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
      {/* Tool Selections */}
      <div>
        <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider mb-2">
          Pilih Alat Gambar
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          <button
            type="button"
            id="btn-tool-pencil"
            onClick={() => onSelectTool("pencil")}
            className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-medium transition-all ${
              currentTool === "pencil"
                ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 hover:text-gray-900 dark:text-slate-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700"
            }`}
            title="Pensil Gambar Bebas"
          >
            <PenTool className="w-4 h-4 mb-1" />
            <span>Pensil</span>
          </button>

          <button
            type="button"
            id="btn-tool-arrow"
            onClick={() => onSelectTool("arrow")}
            className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-medium transition-all ${
              currentTool === "arrow"
                ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 hover:text-gray-900 dark:text-slate-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700"
            }`}
            title="Pengukur Garis Panah"
          >
            <MoveRight className="w-4 h-4 mb-1" />
            <span>Panah</span>
          </button>

          <button
            type="button"
            id="btn-tool-pan"
            onClick={() => onSelectTool("pan")}
            className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-medium transition-all ${
              currentTool === "pan"
                ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 hover:text-gray-900 dark:text-slate-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700"
            }`}
            title="Geser Bentuk/Garis"
          >
            <Move className="w-4 h-4 mb-1" />
            <span>Geser</span>
          </button>

          <button
            type="button"
            id="btn-tool-rotate"
            onClick={() => onSelectTool("rotate")}
            className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-medium transition-all ${
              currentTool === "rotate"
                ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 hover:text-gray-900 dark:text-slate-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700"
            }`}
            title="Rotasi Gambar / Preset"
          >
            <RotateCw className="w-4 h-4 mb-1" />
            <span>Rotasi</span>
          </button>
        </div>
      </div>

      {/* Colors Palletes */}
      <div>
        <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider mb-2">
          Palet Warna
        </label>
        <div className="flex items-center gap-1.5 flex-wrap">
          {PALETTE_COLORS.map((color) => (
            <button
              key={color.value}
              type="button"
              onClick={() => onChangeColor(color.value)}
              className={`w-6 h-6 rounded-full border transition-transform ${
                strokeColor === color.value
                  ? "scale-110 ring-2 ring-indigo-500 border-white"
                  : "border-gray-300 dark:border-slate-600 hover:scale-105"
              }`}
              style={{ backgroundColor: color.value }}
              title={color.label}
            />
          ))}
          <div className="relative w-7 h-7 flex items-center justify-center">
            <input
              type="color"
              value={strokeColor}
              onChange={(e) => onChangeColor(e.target.value)}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            />
            <span className="w-6 h-6 rounded-full border border-gray-300 dark:border-slate-600 flex items-center justify-center text-[10px] font-bold bg-white text-gray-600 hover:bg-gray-100">
              +
            </span>
          </div>
        </div>
      </div>

      {/* Thickness / Stroke Width */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">
            Ketebalan Garis
          </label>
          <span className="text-[10px] font-mono text-slate-500 font-bold">
            {strokeWidth}px
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="10"
          value={strokeWidth}
          onChange={(e) => onChangeWidth(parseInt(e.target.value))}
          className="w-full h-1 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
      </div>

      {/* History Management & Clearing actions */}
      <div className="border-t border-gray-200 dark:border-slate-700 pt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-750 disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-slate-800 text-xs font-semibold text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-700 rounded-lg transition-colors"
        >
          <Undo2 className="w-3.5 h-3.5" />
          <span>Undo</span>
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-750 disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-slate-800 text-xs font-semibold text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-700 rounded-lg transition-colors"
        >
          <Redo2 className="w-3.5 h-3.5" />
          <span>Redo</span>
        </button>
        <button
          type="button"
          onClick={onClear}
          className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-gray-200 dark:border-slate-700 rounded-lg transition-colors"
          title="Hapus Semua Coretan"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
