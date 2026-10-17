import React, { useState } from "react";
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

  const [optToDelete, setOptToDelete] = useState<{ index: number; letter: string } | null>(null);

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
          const letter = String.fromCharCode(65 + optIndex);
          const currentAnswers = parseList(q.correctAnswer, q.options);
          const isSelected = currentAnswers.some((ans) =>
            ans === letter ||
            ans === opt ||
            isAnswerMatch(ans, opt, q.questionType) ||
            (typeof ans === "string" && ans.trim().toUpperCase() === letter)
          );
          return (
            <div
              key={`cmc-${q.id}-${optIndex}`}
              className="flex gap-2.5 items-stretch"
            >
              {/* Kolom Kiri: Checkbox Opsi di Atas & Tombol Hapus Kotak Merah Lembut di Bawah */}
              <div className="flex flex-col items-center justify-between shrink-0 self-stretch py-0.5 w-8">
                <label className="relative flex items-center justify-center cursor-pointer w-8 h-8 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors shrink-0">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() =>
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

                {q.options!.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setOptToDelete({ index: optIndex, letter })}
                    className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-700 dark:hover:text-red-300 shadow-2xs flex items-center justify-center shrink-0 transition-all cursor-pointer"
                    title={`Hapus Pernyataan ${letter}`}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Kolom Kanan: Editor Opsi Lebar Penuh */}
              <div className="flex-1 min-w-0">
                <WysiwygEditor
                  value={opt}
                  onChange={(val) => handleOptionTextChange(q.id, optIndex, val)}
                  placeholder={`Pernyataan ${letter}`}
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

      {/* Modal Dialog Konfirmasi Hapus Opsi (Aman dari Sentuhan Tidak Sengaja di HP) */}
      {optToDelete !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 max-w-xs w-full shadow-2xl border border-slate-100 dark:border-slate-700 text-center">
            <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center">
              <TrashIcon className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">
              Hapus Pernyataan {optToDelete.letter}?
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Apakah Anda yakin ingin menghapus pernyataan ini? Pernyataan yang tersisa akan otomatis diurutkan kembali.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOptToDelete(null)}
                className="flex-1 py-2 px-3 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDeleteOption(q.id, optToDelete.index);
                  setOptToDelete(null);
                }}
                className="flex-1 py-2 px-3 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
