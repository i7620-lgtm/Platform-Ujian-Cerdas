import React from "react";
import type { Question } from "../../../types";
import { TrashIcon, CheckIcon, PlusCircleIcon } from "../../Icons";
import { WysiwygEditor } from "../WysiwygEditor";
import { useExamEditorStore } from "../../../stores/examEditorStore";
import { useExamEditorUIStore } from "../../../stores/examEditorUIStore";
import { parseList, isAnswerMatch } from "../examUtils";

interface ComplexMultipleChoiceEditorProps {
  q: Question;
}

export const ComplexMultipleChoiceEditor: React.FC<ComplexMultipleChoiceEditorProps> = ({ q }) => {
  const handleComplexCorrectAnswerChange = useExamEditorStore((s) => s.handleComplexCorrectAnswerChange);
  const handleOptionTextChange = useExamEditorStore((s) => s.handleOptionTextChange);
  const handleDeleteOption = useExamEditorStore((s) => s.handleDeleteOption);
  const handleAddOption = useExamEditorStore((s) => s.handleAddOption);
  const setEditingChartTarget = useExamEditorUIStore((s) => s.setEditingChartTarget);

  if (!q.options) return null;

  return (
    <div className="mt-6 space-y-3">
      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex justify-between items-center">
        <span>Pilihan Jawaban (Bisa Lebih Dari Satu)</span>
        <span className="text-primary font-medium tracking-normal text-xs animate-pulse opacity-70">
          Pilih semua jawaban benar
        </span>
      </label>
      <div className="space-y-3">
        {q.options.map((opt, optIndex) => {
          const currentAnswers = parseList(q.correctAnswer);
          const isSelected = currentAnswers.some((ans) =>
            isAnswerMatch(ans, opt, q.questionType),
          );
          return (
            <div
              key={`cmc-${q.id}-${optIndex}`}
              className="flex gap-2 items-start"
            >
              <div className="flex-shrink-0 mt-6 pt-1">
                <label className="relative flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) =>
                      handleComplexCorrectAnswerChange(q.id, opt, !isSelected)
                    }
                    className="w-6 h-6 border-2 border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 checked:bg-primary checked:border-primary focus:ring-primary focus:ring-offset-1 transition-all cursor-pointer appearance-none"
                  />
                  <CheckIcon
                    className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-white pointer-events-none transition-opacity ${
                      isSelected ? "opacity-100" : "opacity-0"
                    }`}
                  />
                </label>
              </div>
              <div className="flex-1">
                <WysiwygEditor
                  value={opt}
                  onChange={(val) => handleOptionTextChange(q.id, optIndex, val)}
                  placeholder={`Pernyataan ${String.fromCharCode(65 + optIndex)}`}
                  minHeight="50px"
                  onChartClick={() =>
                    setEditingChartTarget({
                      qId: q.id,
                      type: "option",
                      index: optIndex,
                    })
                  }
                  chartData={q.optionCharts?.[optIndex]}
                />
              </div>
              {q.options!.length > 2 && (
                <button
                  type="button"
                  onClick={() => handleDeleteOption(q.id, optIndex)}
                  className="mt-6 p-2 text-gray-400 dark:text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  title="Hapus opsi"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
      {q.options.length < 6 && (
        <button
          type="button"
          onClick={() => handleAddOption(q.id)}
          className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1 mt-2 bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/20 transition-colors"
        >
          <PlusCircleIcon className="w-4 h-4" /> Tambah Opsi{" "}
          {String.fromCharCode(65 + q.options.length)}
        </button>
      )}
    </div>
  );
};
