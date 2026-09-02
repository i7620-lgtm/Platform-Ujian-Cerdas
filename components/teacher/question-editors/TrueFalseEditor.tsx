import React from "react";
import type { Question } from "../../../types";
import { TrashIcon, PlusCircleIcon } from "../../Icons";
import { WysiwygEditor } from "../WysiwygEditor";
import { useExamEditorStore } from "../../../stores/examEditorStore";
import { useExamEditorUIStore } from "../../../stores/examEditorUIStore";

interface TrueFalseEditorProps {
  q: Question;
}

export const TrueFalseEditor: React.FC<TrueFalseEditorProps> = ({ q }) => {
  const handleTrueFalseRowTextChange = useExamEditorStore((s) => s.handleTrueFalseRowTextChange);
  const handleTrueFalseRowAnswerChange = useExamEditorStore((s) => s.handleTrueFalseRowAnswerChange);
  const handleDeleteTrueFalseRow = useExamEditorStore((s) => s.handleDeleteTrueFalseRow);
  const handleAddTrueFalseRow = useExamEditorStore((s) => s.handleAddTrueFalseRow);
  const setEditingChartTarget = useExamEditorUIStore((s) => s.setEditingChartTarget);

  if (!q.trueFalseRows) return null;

  return (
    <div className="mt-6 space-y-3">
      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex justify-between items-center mb-2">
        <span>Daftar Pernyataan</span>
        <div className="flex gap-4 pr-[88px] text-xs font-bold text-slate-500 dark:text-slate-400">
          <span>Benar</span>
          <span>Salah</span>
        </div>
      </label>
      <div className="space-y-3">
        {q.trueFalseRows.map((row, rIndex) => (
          <div
            key={`tf-${q.id}-${rIndex}`}
            className="flex gap-2 items-start"
          >
            <div className="flex-1">
              <WysiwygEditor
                value={row.text}
                onChange={(val) => handleTrueFalseRowTextChange(q.id, rIndex, val)}
                placeholder={`Pernyataan ${rIndex + 1}`}
                minHeight="50px"
                onChartClick={() =>
                  setEditingChartTarget({
                    qId: q.id,
                    type: "tf",
                    index: rIndex,
                  })
                }
                chartData={row.chartData}
              />
            </div>
            <div className="flex-shrink-0 flex gap-4 mt-8 px-4">
              <label className="relative flex items-center justify-center cursor-pointer">
                <input
                  type="radio"
                  name={`tf-${q.id}-${rIndex}`}
                  checked={row.answer === true}
                  onChange={() => handleTrueFalseRowAnswerChange(q.id, rIndex, true)}
                  className="w-5 h-5 border-2 border-gray-300 dark:border-slate-600 appearance-none rounded-full cursor-pointer checked:border-emerald-500 checked:bg-emerald-500 transition-colors focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
                />
                <div
                  className={`absolute w-2 h-2 rounded-full bg-white opacity-0 transition-opacity ${
                    row.answer === true ? "opacity-100" : ""
                  }`}
                ></div>
              </label>
              <label className="relative flex items-center justify-center cursor-pointer">
                <input
                  type="radio"
                  name={`tf-${q.id}-${rIndex}`}
                  checked={row.answer === false}
                  onChange={() => handleTrueFalseRowAnswerChange(q.id, rIndex, false)}
                  className="w-5 h-5 border-2 border-gray-300 dark:border-slate-600 appearance-none rounded-full cursor-pointer checked:border-red-500 checked:bg-red-500 transition-colors focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                />
                <div
                  className={`absolute w-2 h-2 rounded-full bg-white opacity-0 transition-opacity ${
                    row.answer === false ? "opacity-100" : ""
                  }`}
                ></div>
              </label>
            </div>
            {q.trueFalseRows!.length > 1 && (
              <button
                type="button"
                onClick={() => handleDeleteTrueFalseRow(q.id, rIndex)}
                className="mt-6 p-2 text-gray-400 dark:text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                title="Hapus pernyataan"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
      {q.trueFalseRows.length < 10 && (
        <button
          type="button"
          onClick={() => handleAddTrueFalseRow(q.id)}
          className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1 mt-2 bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/20 transition-colors"
        >
          <PlusCircleIcon className="w-4 h-4" /> Tambah Pernyataan
        </button>
      )}
    </div>
  );
};
