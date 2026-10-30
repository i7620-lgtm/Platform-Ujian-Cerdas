import React, { useState } from "react";
import type { Question } from "../../../types";
import { TrashIcon, PlusCircleIcon } from "../../Icons";
import { WysiwygEditor } from "../WysiwygEditor";
import { useExamEditorStore } from "../../../stores/examEditorStore";
import { useExamEditorUIStore } from "../../../stores/examEditorUIStore";
import { isAnswerMatch } from "../examUtils";

interface MultipleChoiceEditorProps {
  q: Question;
}

export const MultipleChoiceEditor: React.FC<MultipleChoiceEditorProps> = ({ q }) => {
  const handleCorrectAnswerChange = useExamEditorStore((s) => s.handleCorrectAnswerChange);
  const handleOptionTextChange = useExamEditorStore((s) => s.handleOptionTextChange);
  const handleDeleteOption = useExamEditorStore((s) => s.handleDeleteOption);
  const handleAddOption = useExamEditorStore((s) => s.handleAddOption);
  const setEditingChartTarget = useExamEditorUIStore((s) => s.setEditingChartTarget);

  const [optToDelete, setOptToDelete] = useState<{ index: number; letter: string } | null>(null);

  if (!q.options) return null;

  return (
    <div className="mt-6 space-y-3">
      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex justify-between items-center">
        <span>Pilihan Jawaban</span>
        <span className="text-primary font-medium tracking-normal text-xs animate-pulse opacity-70">
          Klik huruf opsi (A/B/C/D) untuk menandai kunci jawaban benar
        </span>
      </label>
      <div className="space-y-3">
        {q.options.map((opt, optIndex) => {
          const letter = String.fromCharCode(65 + optIndex);
          const isSelected =
            q.correctAnswer === letter ||
            q.correctAnswer === opt ||
            isAnswerMatch(q.correctAnswer, opt, q.questionType, q.options) ||
            (typeof q.correctAnswer === "string" &&
              q.correctAnswer.trim().toUpperCase() === letter);

          return (
            <div
              key={`mc-${q.id}-${optIndex}`}
              className="flex flex-col sm:flex-row sm:gap-2.5 sm:items-stretch"
            >
              {/* KHUSUS HP (Baris Atas): Penanda Opsi di Kiri, Tombol Hapus di Kanan */}
              <div className="flex sm:hidden items-center justify-between w-full mb-1.5 px-0.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCorrectAnswerChange(q.id, opt)}
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      isSelected
                        ? "bg-primary border-primary text-white shadow-md ring-4 ring-primary/20"
                        : "bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:border-primary/50"
                    }`}
                    title={isSelected ? "Kunci jawaban benar saat ini" : "Klik untuk menandai sebagai kunci jawaban benar"}
                  >
                    <span className="font-bold text-sm leading-none">
                      {letter}
                    </span>
                  </button>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Pilihan {letter} {isSelected && <span className="text-primary text-[10px] ml-1 font-extrabold">(Kunci Benar)</span>}
                  </span>
                </div>

                {q.options!.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setOptToDelete({ index: optIndex, letter })}
                    className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-700 dark:hover:text-red-300 shadow-2xs flex items-center justify-center shrink-0 transition-all cursor-pointer"
                    title={`Hapus Opsi ${letter}`}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* TABLET & DESKTOP (Kolom Kiri Vertikal): Huruf di Atas, Hapus di Bawah */}
              <div className="hidden sm:flex flex-col items-center justify-between shrink-0 self-stretch py-0.5 w-8">
                <button
                  type="button"
                  onClick={() => handleCorrectAnswerChange(q.id, opt)}
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    isSelected
                      ? "bg-primary border-primary text-white shadow-md transform scale-105 ring-4 ring-primary/20"
                      : "bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:border-primary/50 hover:bg-primary/5"
                  }`}
                  title={isSelected ? "Kunci jawaban benar saat ini" : "Klik untuk menandai sebagai kunci jawaban benar"}
                >
                  <span className="font-bold text-sm leading-none">
                    {letter}
                  </span>
                </button>

                {q.options!.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setOptToDelete({ index: optIndex, letter })}
                    className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-700 dark:hover:text-red-300 shadow-2xs flex items-center justify-center shrink-0 transition-all cursor-pointer"
                    title={`Hapus Opsi ${letter}`}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Editor Opsi: Di HP Menempati Baris Bawah Penuh, Di Tablet/Desktop Di Kolom Kanan */}
              <div className="w-full sm:flex-1 min-w-0">
                <WysiwygEditor
                  value={opt}
                  onChange={(val) => handleOptionTextChange(q.id, optIndex, val)}
                  placeholder={`Pilihan ${letter}`}
                  minHeight="50px"
                  onChartClick={(chartType) =>
                    setEditingChartTarget({
                      qId: q.id,
                      type: "option",
                      index: optIndex,
                      preferredType: chartType,
                    })
                  }
                  chartData={q.optionCharts?.[optIndex]}
                />
              </div>
            </div>
          );
        })}
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

      {/* Modal Dialog Konfirmasi Hapus Opsi (Aman dari Sentuhan Tidak Sengaja di HP) */}
      {optToDelete !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 max-w-xs w-full shadow-2xl border border-slate-100 dark:border-slate-700 text-center">
            <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center">
              <TrashIcon className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">
              Hapus Opsi {optToDelete.letter}?
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Apakah Anda yakin ingin menghapus pilihan jawaban ini? Pilihan yang tersisa akan otomatis diurutkan kembali.
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
