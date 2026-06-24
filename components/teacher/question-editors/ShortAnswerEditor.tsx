import React from "react";
import type { Question } from "../../../types";
import { WysiwygEditor } from "../WysiwygEditor";
import { useExamEditorStore } from "../../../stores/examEditorStore";
import { useExamEditorUIStore } from "../../../stores/examEditorUIStore";

interface ShortAnswerEditorProps {
  q: Question;
}

export const ShortAnswerEditor: React.FC<ShortAnswerEditorProps> = ({ q }) => {
  const handleCorrectAnswerChange = useExamEditorStore((s) => s.handleCorrectAnswerChange);
  const setEditingChartTarget = useExamEditorUIStore((s) => s.setEditingChartTarget);

  return (
    <div className="mt-6">
      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">
        Kunci Jawaban (Opsional)
      </label>
      <WysiwygEditor
        value={q.correctAnswer || ""}
        onChange={(val) => handleCorrectAnswerChange(q.id, val)}
        placeholder={
          q.questionType === "FILL_IN_THE_BLANK"
            ? "Ketik jawaban singkat..."
            : "Ketik pedoman jawaban essay..."
        }
        minHeight="60px"
        onChartClick={() =>
          setEditingChartTarget({
            qId: q.id,
            type: "correctAnswer",
          })
        }
        chartData={q.correctAnswerChart}
      />
    </div>
  );
};
