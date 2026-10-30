import React from "react";
import type { Question } from "../../../types";
import { useExamEditorStore } from "../../../stores/examEditorStore";
import {
  PlusCircleIcon,
  TrashIcon,
  SparklesIcon,
  CheckCircleIcon,
} from "../../Icons";

interface QuestionnaireEditorProps {
  q: Question;
}

export const QuestionnaireEditor: React.FC<QuestionnaireEditorProps> = ({ q }) => {
  const handleUpdateQuestion = useExamEditorStore((s) => s.handleUpdateQuestion);

  const format = q.questionnaireFormat || "scale";
  const scaleMin = q.scaleMin ?? 1;
  const scaleMax = q.scaleMax ?? 5;
  const scaleLabels = q.scaleLabels || ["Sangat Tidak Setuju", "Sangat Setuju"];
  const options = q.options && q.options.length > 0
    ? q.options
    : ["Sangat Tidak Setuju", "Tidak Setuju", "Netral", "Setuju", "Sangat Setuju"];
  const ratingIcon = q.ratingIcon || "star";

  const setFormat = (newFormat: "scale" | "rating" | "choice" | "text") => {
    handleUpdateQuestion(q.id, {
      questionnaireFormat: newFormat,
      scoreWeight: 0,
    });
  };

  const handleLeftLabelChange = (val: string) => {
    handleUpdateQuestion(q.id, {
      scaleLabels: [val, scaleLabels[1] || ""],
    });
  };

  const handleRightLabelChange = (val: string) => {
    handleUpdateQuestion(q.id, {
      scaleLabels: [scaleLabels[0] || "", val],
    });
  };

  const handleMaxScaleChange = (max: number) => {
    handleUpdateQuestion(q.id, {
      scaleMax: max,
      scaleMin: 1,
    });
  };

  const handleOptionChange = (idx: number, val: string) => {
    const next = [...options];
    next[idx] = val;
    handleUpdateQuestion(q.id, { options: next });
  };

  const handleAddOption = () => {
    const next = [...options, `Opsi ${options.length + 1}`];
    handleUpdateQuestion(q.id, { options: next });
  };

  const handleDeleteOption = (idx: number) => {
    if (options.length <= 2) {
      alert("Kuisioner pilihan minimal harus memiliki 2 opsi.");
      return;
    }
    const next = options.filter((_, i) => i !== idx);
    handleUpdateQuestion(q.id, { options: next });
  };

  return (
    <div className="mt-4 p-4 md:p-5 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/60 space-y-4">
      {/* Header Info Non-Skor */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-indigo-100/80 dark:border-indigo-900/40">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-black">
            📊
          </span>
          <div>
            <h4 className="text-xs font-black text-indigo-950 dark:text-indigo-200 uppercase tracking-wider">
              Konfigurasi Kuisioner / Angket
            </h4>
            <p className="text-[11px] text-indigo-800/80 dark:text-indigo-300/80">
              Pertanyaan untuk survei opini atau refleksi belajar tanpa penilaian benar/salah.
            </p>
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-[11px] font-black tracking-wide border border-emerald-200/60 dark:border-emerald-800/60 self-start sm:self-center">
          <CheckCircleIcon className="w-3.5 h-3.5" />
          <span>Non-Skor (0 Poin)</span>
        </div>
      </div>

      {/* Tab Pemilih Sub-Format Kuisioner */}
      <div>
        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          Pilih Format Isian Siswa:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => setFormat("scale")}
            className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left flex flex-col gap-0.5 cursor-pointer ${
              format === "scale"
                ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-indigo-300"
            }`}
          >
            <span className="font-black">1. Skala Likert</span>
            <span className={`text-[10px] font-normal leading-tight ${format === "scale" ? "text-indigo-100" : "text-slate-400 dark:text-slate-500"}`}>
              Rentang 1–5 / 1–10
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFormat("rating")}
            className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left flex flex-col gap-0.5 cursor-pointer ${
              format === "rating"
                ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-indigo-300"
            }`}
          >
            <span className="font-black">2. Bintang / Rating</span>
            <span className={`text-[10px] font-normal leading-tight ${format === "rating" ? "text-indigo-100" : "text-slate-400 dark:text-slate-500"}`}>
              ★ Rating Bintang 1–5
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFormat("choice")}
            className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left flex flex-col gap-0.5 cursor-pointer ${
              format === "choice"
                ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-indigo-300"
            }`}
          >
            <span className="font-black">3. Pilihan Opini</span>
            <span className={`text-[10px] font-normal leading-tight ${format === "choice" ? "text-indigo-100" : "text-slate-400 dark:text-slate-500"}`}>
              Radio Opsi Bebas
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFormat("text")}
            className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left flex flex-col gap-0.5 cursor-pointer ${
              format === "text"
                ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-indigo-300"
            }`}
          >
            <span className="font-black">4. Respon Teks</span>
            <span className={`text-[10px] font-normal leading-tight ${format === "text" ? "text-indigo-100" : "text-slate-400 dark:text-slate-500"}`}>
              Uraian / Kritik & Saran
            </span>
          </button>
        </div>
      </div>

      {/* Konten Konfigurasi Berdasarkan Format */}
      {format === "scale" && (
        <div className="space-y-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Rentang Skala Angka:
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleMaxScaleChange(5)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  scaleMax === 5
                    ? "bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700"
                    : "bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600"
                }`}
              >
                1 sampai 5
              </button>
              <button
                type="button"
                onClick={() => handleMaxScaleChange(10)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  scaleMax === 10
                    ? "bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700"
                    : "bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600"
                }`}
              >
                1 sampai 10
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Label Nilai Terendah ({scaleMin}):
              </label>
              <input
                type="text"
                value={scaleLabels[0] || ""}
                onChange={(e) => handleLeftLabelChange(e.target.value)}
                placeholder="Contoh: Sangat Tidak Setuju / Kurang Sekali"
                className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 font-medium outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Label Nilai Tertinggi ({scaleMax}):
              </label>
              <input
                type="text"
                value={scaleLabels[1] || ""}
                onChange={(e) => handleRightLabelChange(e.target.value)}
                placeholder="Contoh: Sangat Setuju / Memuaskan"
                className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 font-medium outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Pratinjau Skala Siswa */}
          <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
              Pratinjau Tampilan Skala di Layar Siswa:
            </span>
            <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              <span>{scaleLabels[0] || `Nilai ${scaleMin}`}</span>
              <span>{scaleLabels[1] || `Nilai ${scaleMax}`}</span>
            </div>
            <div className="flex gap-1.5 sm:gap-2 justify-between">
              {Array.from({ length: scaleMax - scaleMin + 1 }, (_, i) => scaleMin + i).map((val) => (
                <div
                  key={val}
                  className="flex-1 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center text-xs font-bold text-slate-700 dark:text-slate-300 shadow-2xs"
                >
                  {val}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {format === "rating" && (
        <div className="space-y-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Gaya Simbol Rating:
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleUpdateQuestion(q.id, { ratingIcon: "star" })}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  ratingIcon === "star"
                    ? "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700"
                    : "bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600"
                }`}
              >
                ★ Bintang (1–5)
              </button>
              <button
                type="button"
                onClick={() => handleUpdateQuestion(q.id, { ratingIcon: "number" })}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  ratingIcon === "number"
                    ? "bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700"
                    : "bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600"
                }`}
              >
                123 Angka (1–5)
              </button>
            </div>
          </div>

          {/* Pratinjau Rating Siswa */}
          <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 text-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-3">
              Pratinjau Interaktif Bintang Siswa:
            </span>
            <div className="flex items-center justify-center gap-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <div
                  key={star}
                  className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-500 text-xl font-bold shadow-2xs"
                >
                  ★
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              Siswa cukup mengetuk bintang dari 1 sampai 5 untuk memberikan apresiasi/penilaian.
            </p>
          </div>
        </div>
      )}

      {format === "choice" && (
        <div className="space-y-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Daftar Opsi Opini / Respon:
            </span>
            <button
              type="button"
              onClick={handleAddOption}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold transition-colors"
            >
              <PlusCircleIcon className="w-3.5 h-3.5" />
              <span>Tambah Opsi</span>
            </button>
          </div>

          <div className="space-y-2">
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs font-bold shrink-0">
                  {idx + 1}
                </span>
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  placeholder={`Label opsi ${idx + 1}`}
                  className="flex-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 font-medium outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => handleDeleteOption(idx)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  title="Hapus Opsi"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
            * Seluruh opsi di atas tidak memiliki status benar/salah, murni menghimpun kecenderungan pendapat siswa.
          </p>
        </div>
      )}

      {format === "text" && (
        <div className="space-y-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0">
              ✏️
            </div>
            <div>
              <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Respon Teks Terbuka Siswa
              </h5>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                Siswa akan disediakan kotak teks besar untuk menuangkan ide, evaluasi pembelajaran, kritik, saran, atau refleksi pribadi. Respon siswa akan dihimpun dan dapat dianalisis ringkasannya melalui AI.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
