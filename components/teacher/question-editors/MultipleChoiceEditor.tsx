import React from "react";
import type { Question } from "../../../types";
import { TrashIcon, PlusCircleIcon } from "../../Icons";
import { WysiwygEditor } from "../WysiwygEditor";
import { useExamEditorStore } from "../../../stores/examEditorStore";
import { useExamEditorUIStore } from "../../../stores/examEditorUIStore";

interface MultipleChoiceEditorProps {
  q: Question;
}

export const MultipleChoiceEditor: React.FC<MultipleChoiceEditorProps> = ({ q }) => {
  const handleCorrectAnswerChange = useExamEditorStore((s) => s.handleCorrectAnswerChange);
  const handleOptionTextChange = useExamEditorStore((s) => s.handleOptionTextChange);
  const handleDeleteOption = useExamEditorStore((s) => s.handleDeleteOption);
  const handleAddOption = useExamEditorStore((s) => s.handleAddOption);
  const setEditingChartTarget = useExamEditorUIStore((s) => s.setEditingChartTarget);

  if (!q.options) return null;

  return (
    <div className="mt-6 space-y-3">
      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex justify-between items-center">
        <span>Pilihan Jawaban</span>
        <span className="text-primary font-medium tracking-normal text-xs animate-pulse opacity-70">
          Klik Opsi untuk Set Jawaban Benar
        </span>
      </label>
      <div className="space-y-3">
        {q.options.map((opt, optIndex) => (
          <div
            key={`mc-${q.id}-${optIndex}`}
            className="flex gap-2 items-start"
          >
            <button
              type="button"
              onClick={() =>
                handleCorrectAnswerChange(q.id, String.fromCharCode(65 + optIndex))
              }
              className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all mt-6 ${
                q.correctAnswer === String.fromCharCode(65 + optIndex)
                  ? "bg-primary border-primary text-white shadow-md transform scale-110"
                  : "bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:border-primary/50 hover:bg-primary/5"
              }`}
              title="Tandai sebagai jawaban benar"
            >
              <span className="font-bold text-sm">
                {String.fromCharCode(65 + optIndex)}
              </span>
            </button>
            <div className="flex-1">
              <WysiwygEditor
                value={opt}
                onChange={(val) => handleOptionTextChange(q.id, optIndex, val)}
                placeholder={`Pilihan ${String.fromCharCode(65 + optIndex)}`}
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
        ))}
      </div>
      {q.options.length < 5 && (
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
