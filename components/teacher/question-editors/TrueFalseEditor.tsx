import React, { useState } from "react";
import type { Question } from "../../../types";
import { TrashIcon, PlusCircleIcon, SparklesIcon } from "../../Icons";
import { WysiwygEditor } from "../WysiwygEditor";
import { useExamEditorStore } from "../../../stores/examEditorStore";
import { useExamEditorUIStore } from "../../../stores/examEditorUIStore";

interface TrueFalseEditorProps {
  q: Question;
}

const PRESETS: [string, string][] = [
  ["Benar", "Salah"],
  ["Sesuai", "Tidak Sesuai"],
  ["Ya", "Tidak"],
  ["Setuju", "Tidak Setuju"],
  ["Fakta", "Opini"],
  ["Tepat", "Tidak Tepat"],
];

export const TrueFalseEditor: React.FC<TrueFalseEditorProps> = ({ q }) => {
  const handleTrueFalseRowTextChange = useExamEditorStore((s) => s.handleTrueFalseRowTextChange);
  const handleTrueFalseRowAnswerChange = useExamEditorStore((s) => s.handleTrueFalseRowAnswerChange);
  const handleDeleteTrueFalseRow = useExamEditorStore((s) => s.handleDeleteTrueFalseRow);
  const handleAddTrueFalseRow = useExamEditorStore((s) => s.handleAddTrueFalseRow);
  const handleCategoryLabelsChange = useExamEditorStore((s) => s.handleCategoryLabelsChange);
  const setEditingChartTarget = useExamEditorUIStore((s) => s.setEditingChartTarget);

  const trueLabel = (q.categoryLabels && q.categoryLabels[0]) || "Benar";
  const falseLabel = (q.categoryLabels && q.categoryLabels[1]) || "Salah";

  const [isCustomizing, setIsCustomizing] = useState(
    Boolean(q.categoryLabels && (q.categoryLabels[0] !== "Benar" || q.categoryLabels[1] !== "Salah"))
  );

  React.useEffect(() => {
    if (!q.trueFalseRows || q.trueFalseRows.length === 0) {
      useExamEditorStore.setState((state) => ({
        questions: state.questions.map((question) =>
          question.id === q.id
            ? {
                ...question,
                trueFalseRows: [
                  { text: "Pernyataan 1 terkait materi soal", answer: true },
                  { text: "Pernyataan 2 terkait materi soal", answer: false },
                  { text: "Pernyataan 3 terkait materi soal", answer: true },
                ],
              }
            : question
        ),
      }));
    }
  }, [q.id, q.trueFalseRows]);

  const activeRows = q.trueFalseRows && q.trueFalseRows.length > 0
    ? q.trueFalseRows
    : [
        { text: "Pernyataan 1 terkait materi soal", answer: true },
        { text: "Pernyataan 2 terkait materi soal", answer: false },
        { text: "Pernyataan 3 terkait materi soal", answer: true },
      ];

  const handleSelectPreset = (p1: string, p2: string) => {
    handleCategoryLabelsChange(q.id, [p1, p2]);
  };

  const handleUpdateLabel1 = (val: string) => {
    handleCategoryLabelsChange(q.id, [val || "Benar", falseLabel]);
  };

  const handleUpdateLabel2 = (val: string) => {
    handleCategoryLabelsChange(q.id, [trueLabel, val || "Salah"]);
  };

  return (
    <div className="mt-6 space-y-4">
      {/* Pengaturan Kategori Pilihan (Bisa disesuaikan manual / otomatis) */}
      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 transition-all">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Label Kategori Pilihan:
            </span>
            <span className="text-[11px] font-semibold text-primary dark:text-indigo-400 bg-primary/10 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">
              {trueLabel} / {falseLabel}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsCustomizing(!isCustomizing)}
            className="text-[11px] font-medium text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary flex items-center gap-1 transition-colors"
          >
            <span>{isCustomizing ? "Sembunyikan Pengaturan" : "Ubah Label Kategori"}</span>
            <span className="text-[10px]">{isCustomizing ? "▲" : "▼"}</span>
          </button>
        </div>

        {/* Preset Cepat & Input Kustom */}
        {isCustomizing && (
          <div className="space-y-3 pt-2 border-t border-slate-200/80 dark:border-slate-700/60 animate-fadeIn">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1.5">
                Pilih Preset Populer:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map(([p1, p2]) => {
                  const isSelected = trueLabel.toLowerCase() === p1.toLowerCase() && falseLabel.toLowerCase() === p2.toLowerCase();
                  return (
                    <button
                      key={`${p1}-${p2}`}
                      type="button"
                      onClick={() => handleSelectPreset(p1, p2)}
                      className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-600"
                      }`}
                    >
                      {p1} / {p2}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                  Redaksi Opsi 1 (Nilai Positif / Benar):
                </label>
                <input
                  type="text"
                  value={trueLabel}
                  onChange={(e) => handleUpdateLabel1(e.target.value)}
                  placeholder="Contoh: Benar, Sesuai, Ya, Setuju, Fakta"
                  className="w-full text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                  Redaksi Opsi 2 (Nilai Negatif / Salah):
                </label>
                <input
                  type="text"
                  value={falseLabel}
                  onChange={(e) => handleUpdateLabel2(e.target.value)}
                  placeholder="Contoh: Salah, Tidak Sesuai, Tidak, Setuju, Opini"
                  className="w-full text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">
              * Teks label ini akan tampil pada lembar soal siswa, pratinjau cetak/PDF, dan kunci jawaban.
            </p>
          </div>
        )}
      </div>

      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex justify-between items-center mb-1">
        <span>Daftar Pernyataan</span>
        <div className="flex gap-4 pr-[84px] text-xs font-bold text-slate-500 dark:text-slate-400">
          <span className="w-16 text-center truncate text-emerald-600 dark:text-emerald-400" title={trueLabel}>
            {trueLabel}
          </span>
          <span className="w-16 text-center truncate text-rose-600 dark:text-rose-400" title={falseLabel}>
            {falseLabel}
          </span>
        </div>
      </label>

      <div className="space-y-3">
        {activeRows.map((row, rIndex) => (
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
              <label 
                className="relative flex items-center justify-center cursor-pointer w-16"
                title={`Pilih jika pernyataan bernilai ${trueLabel}`}
              >
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
              <label 
                className="relative flex items-center justify-center cursor-pointer w-16"
                title={`Pilih jika pernyataan bernilai ${falseLabel}`}
              >
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
            {activeRows.length > 1 && (
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
      {activeRows.length < 10 && (
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
