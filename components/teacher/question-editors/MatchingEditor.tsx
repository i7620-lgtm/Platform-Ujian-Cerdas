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
      <div className="space-y-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
        <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-center mb-2 text-xs font-bold text-slate-500 dark:text-slate-400 hidden md:grid">
          <div className="text-center">Sisi Kiri (Soal)</div>
          <div className="w-8"></div>
          <div className="text-center">Sisi Kanan (Jawaban)</div>
          <div className="w-8"></div>
        </div>
        {q.matchingPairs.map((pair, pIndex) => (
          <div
            key={`match-${q.id}-${pIndex}`}
            className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto] gap-2 items-center bg-white dark:bg-slate-800 p-3 rounded-lg border border-gray-100 dark:border-slate-700 shadow-sm"
          >
            <div className="md:hidden text-xs font-bold text-slate-400 mb-1">
              Pasangan {pIndex + 1} - Sisi Kiri
            </div>
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
            <div className="hidden md:flex justify-center text-slate-300 dark:text-slate-600 font-black">
              &harr;
            </div>
            <div className="md:hidden mt-2 mb-1 text-xs font-bold text-slate-400">
              Sisi Kanan
            </div>
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
            {q.matchingPairs!.length > 2 ? (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Hapus pasangan menjodohkan ini?")) {
                    handleDeleteMatchingPair(q.id, pIndex);
                  }
                }}
                className="p-2 text-gray-400 dark:text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors justify-self-end mt-2 md:mt-0"
                title="Hapus pasangan"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-8"></div>
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
