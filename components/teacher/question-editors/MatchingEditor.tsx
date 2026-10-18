import React from "react";
import type { Question } from "../../../types";
import { TrashIcon, PlusCircleIcon } from "../../Icons";
import { WysiwygEditor } from "../WysiwygEditor";
import { useExamEditorStore } from "../../../stores/examEditorStore";
import { useExamEditorUIStore } from "../../../stores/examEditorUIStore";

interface MatchingEditorProps {
  q: Question;
}

export const MatchingEditor: React.FC<MatchingEditorProps> = ({ q }) => {
  const handleMatchingPairChange = useExamEditorStore((s) => s.handleMatchingPairChange);
  const handleDeleteMatchingPair = useExamEditorStore((s) => s.handleDeleteMatchingPair);
  const handleAddMatchingPair = useExamEditorStore((s) => s.handleAddMatchingPair);
  const setEditingChartTarget = useExamEditorUIStore((s) => s.setEditingChartTarget);

  if (!q.matchingPairs) return null;

  return (
    <div className="mt-6 space-y-3">
      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex justify-between items-center mb-2">
        <span>Pasangan Menjodohkan</span>
      </label>
      <div className="space-y-3 bg-slate-50 dark:bg-slate-900/50 p-3.5 sm:p-4 rounded-xl border border-slate-100 dark:border-slate-700">
        <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-center mb-2 text-xs font-bold text-slate-500 dark:text-slate-400 hidden lg:grid">
          <div className="text-center">Sisi Kiri (Soal)</div>
          <div className="w-8"></div>
          <div className="text-center">Sisi Kanan (Jawaban)</div>
          <div className="w-8"></div>
        </div>
        {q.matchingPairs.map((pair, pIndex) => (
          <div
            key={`match-${q.id}-${pIndex}`}
            className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr_auto] gap-2.5 items-center bg-white dark:bg-slate-800 p-3 sm:p-3.5 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm w-full min-w-0"
          >
            {/* Header Sisi Kiri (HP & Tablet) */}
            <div className="lg:hidden text-xs font-bold text-slate-600 dark:text-slate-300 mb-0.5">
              Pasangan {pIndex + 1} &mdash; Sisi Kiri (Soal)
            </div>
            <div className="w-full min-w-0">
              <WysiwygEditor
                value={pair.left}
                onChange={(val) => handleMatchingPairChange(q.id, pIndex, "left", val)}
                placeholder={`Kiri ${pIndex + 1}`}
                minHeight="60px"
                onChartClick={() =>
                  setEditingChartTarget({
                    qId: q.id,
                    type: "matching",
                    index: pIndex,
                    subIndex: "left",
                  })
                }
                chartData={pair.leftChart}
              />
            </div>

            {/* Simbol Penghubung (Desktop Lebar) */}
            <div className="hidden lg:flex justify-center text-slate-300 dark:text-slate-600 font-black">
              &harr;
            </div>

            {/* Header Sisi Kanan (HP & Tablet) */}
            <div className="lg:hidden mt-2 mb-0.5 text-xs font-bold text-slate-600 dark:text-slate-300">
              Sisi Kanan (Jawaban)
            </div>
            <div className="w-full min-w-0">
              <WysiwygEditor
                value={pair.right}
                onChange={(val) => handleMatchingPairChange(q.id, pIndex, "right", val)}
                placeholder={`Kanan ${pIndex + 1}`}
                minHeight="60px"
                onChartClick={() =>
                  setEditingChartTarget({
                    qId: q.id,
                    type: "matching",
                    index: pIndex,
                    subIndex: "right",
                  })
                }
                chartData={pair.rightChart}
              />
            </div>

            {/* KHUSUS HP & TABLET: Tombol Hapus Berhimpit di Sudut Kanan Bawah Kartu Pasangan */}
            {q.matchingPairs!.length > 2 && (
              <div className="flex justify-end mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 lg:hidden">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Hapus pasangan menjodohkan ini?")) {
                      handleDeleteMatchingPair(q.id, pIndex);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60 hover:bg-red-100 dark:hover:bg-red-900/50 flex items-center gap-1.5 text-xs font-bold shadow-2xs transition-all cursor-pointer"
                  title="Hapus pasangan"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                  <span>Hapus Pasangan</span>
                </button>
              </div>
            )}

            {/* DESKTOP LEBAR (>= 1024px): Tombol Hapus di Sebelah Kanan Pasangan (Kolom ke-4) */}
            {q.matchingPairs!.length > 2 ? (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Hapus pasangan menjodohkan ini?")) {
                    handleDeleteMatchingPair(q.id, pIndex);
                  }
                }}
                className="hidden lg:flex p-2 text-gray-400 dark:text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors justify-self-center cursor-pointer"
                title="Hapus pasangan"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            ) : (
              <div className="hidden lg:block w-8"></div>
            )}
          </div>
        ))}
      </div>
      {q.matchingPairs.length < 10 && (
        <button
          type="button"
          onClick={() => handleAddMatchingPair(q.id)}
          className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1 mt-2 bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/20 transition-colors"
        >
          <PlusCircleIcon className="w-4 h-4" /> Tambah Pasangan
        </button>
      )}
    </div>
  );
};
