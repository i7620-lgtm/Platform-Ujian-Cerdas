import React, { useState } from "react";
import type { Question, QuestionType } from "../../types";
import {
  TrashIcon,
  ArrowPathIcon,
  SparklesIcon,
  PlusCircleIcon,
  LightBulbIcon,
  AcademicCapIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "../Icons";
import { WysiwygEditor } from "./WysiwygEditor";
import { useExamEditorStore } from "../../stores/examEditorStore";
import { useExamEditorUIStore } from "../../stores/examEditorUIStore";
import { MultipleChoiceEditor } from "./question-editors/MultipleChoiceEditor";
import { ComplexMultipleChoiceEditor } from "./question-editors/ComplexMultipleChoiceEditor";
import { TrueFalseEditor } from "./question-editors/TrueFalseEditor";
import { MatchingEditor } from "./question-editors/MatchingEditor";
import { ShortAnswerEditor } from "./question-editors/ShortAnswerEditor";
import { QuestionnaireEditor } from "./question-editors/QuestionnaireEditor";

interface QuestionCardProps {
  q: Question;
  index: number;
  questionNumber: number;
  isGenerating: boolean;
  onGenerate: (q: Question) => void;
}

export const QuestionCard = React.memo(
  ({
    q,
    index,
    questionNumber,
    isGenerating,
    onGenerate,
  }: QuestionCardProps) => {
    const handleTypeChange = useExamEditorStore((s) => s.handleTypeChange);
    const handleDeleteQuestion = useExamEditorStore((s) => s.handleDeleteQuestion);
    const handleCategoryChange = useExamEditorStore((s) => s.handleCategoryChange);
    const handleLevelChange = useExamEditorStore((s) => s.handleLevelChange);
    const handleScoreWeightChange = useExamEditorStore((s) => s.handleScoreWeightChange);
    const handleKisiKisiChange = useExamEditorStore((s) => s.handleKisiKisiChange);
    const handleHintChange = useExamEditorStore((s) => s.handleHintChange);
    const handleSolutionStepsChange = useExamEditorStore((s) => s.handleSolutionStepsChange);
    const handleQuestionTextChange = useExamEditorStore((s) => s.handleQuestionTextChange);

    const setEditingChartTarget = useExamEditorUIStore((s) => s.setEditingChartTarget);
    const setInsertIndex = useExamEditorUIStore((s) => s.setInsertIndex);
    const setTypeSelectionModalOpen = useExamEditorUIStore((s) => s.setTypeSelectionModalOpen);
    const validation = useExamEditorUIStore((s) => s.questionValidation[q.id]);
    const clearQuestionValidationField = useExamEditorUIStore((s) => s.clearQuestionValidationField);

    const [isHintOpen, setIsHintOpen] = useState(false);
    const [isStepsOpen, setIsStepsOpen] = useState(false);
    const stripHtml = (html?: string) => (html ? html.replace(/<[^>]*>/g, "").trim() : "");
    const hasHint = Boolean(stripHtml(q.hint));
    const hasSteps = Boolean(stripHtml(q.solutionSteps));

    const toggleHint = () => {
      const isDesktopOrTablet = typeof window !== "undefined" && window.innerWidth >= 768;
      if (isDesktopOrTablet) {
        const nextState = !(isHintOpen || isStepsOpen);
        setIsHintOpen(nextState);
        setIsStepsOpen(nextState);
      } else {
        setIsHintOpen(!isHintOpen);
      }
    };

    const toggleSteps = () => {
      const isDesktopOrTablet = typeof window !== "undefined" && window.innerWidth >= 768;
      if (isDesktopOrTablet) {
        const nextState = !(isHintOpen || isStepsOpen);
        setIsHintOpen(nextState);
        setIsStepsOpen(nextState);
      } else {
        setIsStepsOpen(!isStepsOpen);
      }
    };

    const openHint = () => {
      const isDesktopOrTablet = typeof window !== "undefined" && window.innerWidth >= 768;
      setIsHintOpen(true);
      if (isDesktopOrTablet) {
        setIsStepsOpen(true);
      }
    };

    const openSteps = () => {
      const isDesktopOrTablet = typeof window !== "undefined" && window.innerWidth >= 768;
      setIsStepsOpen(true);
      if (isDesktopOrTablet) {
        setIsHintOpen(true);
      }
    };

    return (
      <React.Fragment key={q.id}>
        <div
          id={q.id}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 group transition-all duration-300 hover:shadow-md relative overflow-hidden"
        >
          {/* Header Bar Terintegrasi (Bebas dari Overlap pada Tablet & Mobile) */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-gray-100 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/60">
            <div className="flex items-center gap-2.5">
              {q.questionType === "INFO" ? (
                <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-xs">
                  i
                </div>
              ) : (
                <span className="w-7 h-7 rounded-lg bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-black text-xs tracking-tight">
                  {String(questionNumber).padStart(2, "0")}
                </span>
              )}
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {q.questionType === "INFO"
                  ? "Informasi / Teks Bacaan"
                  : `Soal #${questionNumber}`}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {q.questionType !== "INFO" && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onGenerate(q);
                  }}
                  disabled={isGenerating}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors shadow-2xs disabled:opacity-50 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border-emerald-200 dark:border-emerald-800"
                  title="Buat dengan AI"
                >
                  {isGenerating ? (
                    <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <SparklesIcon className="w-3.5 h-3.5" />
                  )}
                  <span className="text-[10px] font-black uppercase tracking-wider">
                    AI
                  </span>
                </button>
              )}

              <div className="relative inline-block bg-white dark:bg-slate-800 rounded-lg shadow-2xs">
                <select
                  value={q.questionType}
                  onChange={(e) =>
                    handleTypeChange(q.id, e.target.value as QuestionType)
                  }
                  className="appearance-none bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 py-1.5 pl-3 pr-7 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer hover:border-gray-300 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                >
                  <option value="MULTIPLE_CHOICE">Pilihan Ganda</option>
                  <option value="COMPLEX_MULTIPLE_CHOICE">PG Kompleks</option>
                  <option value="TRUE_FALSE">Benar / Salah</option>
                  <option value="MATCHING">Menjodohkan</option>
                  <option value="ESSAY">Esai / Uraian</option>
                  <option value="FILL_IN_THE_BLANK">Isian Singkat</option>
                  <option value="QUESTIONNAIRE">Kuisioner / Angket</option>
                  <option value="INFO">Info / Teks</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 dark:text-slate-400">
                  <svg
                    className="fill-current h-3 w-3"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (
                    window.confirm("Apakah Anda yakin ingin menghapus soal ini?")
                  ) {
                    handleDeleteQuestion(q.id);
                  }
                }}
                className="p-1.5 bg-white dark:bg-slate-800 text-gray-400 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 border border-gray-200 dark:border-slate-700 transition-colors shadow-2xs"
                title="Hapus Soal"
              >
                <TrashIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="p-5 md:p-6 relative">
            {isGenerating ? (
              <div className="space-y-6 animate-pulse p-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-xl">
                    <SparklesIcon className="w-5 h-5 text-primary animate-spin" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">AI Sedang Merumuskan Butir Soal...</h4>
                    <p className="text-xs text-slate-450 dark:text-slate-500">Menganalisis kisi-kisi dan menyusun alternatif jawaban berkualitas tinggi.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded-full w-3/4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded-full w-1/2"></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2 border border-gray-100 dark:border-slate-800 p-3 rounded-xl">
                    <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full w-1/2 mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded-lg"></div>
                  </div>
                  <div className="space-y-2 border border-gray-100 dark:border-slate-800 p-3 rounded-xl">
                    <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full w-1/2 mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded-lg"></div>
                  </div>
                  <div className="space-y-2 border border-gray-100 dark:border-slate-800 p-3 rounded-xl">
                    <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full w-1/2 mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded-lg"></div>
                  </div>
                </div>

                <div className="space-y-2 border border-gray-100 dark:border-slate-800 p-4 rounded-xl">
                  <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full w-1/4 mb-2"></div>
                  <div className="h-20 bg-gray-200 dark:bg-slate-700 rounded-lg"></div>
                </div>

                <div className="space-y-2">
                  <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded-lg w-full"></div>
                  <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded-lg w-full"></div>
                </div>
              </div>
            ) : (
              <div className="w-full min-w-0">
                {q.questionType !== "INFO" && (
                  <>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">
                            Kategori Soal <span className="text-red-500 font-black">*</span>
                          </label>
                          <input
                            type="text"
                            value={q.category || ""}
                            onChange={(e) => {
                              handleCategoryChange(q.id, e.target.value);
                              if (validation?.category) {
                                clearQuestionValidationField(q.id, "category");
                              }
                            }}
                            className={`w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400 transition-all ${
                              validation?.category
                                ? "border-red-500 ring-2 ring-red-200 dark:ring-red-900/50 bg-red-50/30"
                                : "border-gray-200 dark:border-slate-700"
                            }`}
                            placeholder="Contoh: Aljabar, Teks Prosedur"
                          />
                          {validation?.category && (
                            <p className="text-[10px] text-red-600 dark:text-red-400 font-semibold mt-1">
                              * Wajib diisi sebelum membuat dengan AI
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">
                            Level Soal <span className="text-red-500 font-black">*</span>
                          </label>
                          <input
                            type="text"
                            value={q.level || ""}
                            onChange={(e) => {
                              handleLevelChange(q.id, e.target.value);
                              if (validation?.level) {
                                clearQuestionValidationField(q.id, "level");
                              }
                            }}
                            className={`w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400 transition-all ${
                              validation?.level
                                ? "border-red-500 ring-2 ring-red-200 dark:ring-red-900/50 bg-red-50/30"
                                : "border-gray-200 dark:border-slate-700"
                            }`}
                            placeholder="Contoh: Level 1, Level 2, HOTS"
                          />
                          {validation?.level && (
                            <p className="text-[10px] text-red-600 dark:text-red-400 font-semibold mt-1">
                              * Wajib diisi sebelum membuat dengan AI
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">
                            Bobot Nilai {q.questionType !== "QUESTIONNAIRE" && <span className="text-red-500 font-black">*</span>}
                          </label>
                          {q.questionType === "QUESTIONNAIRE" ? (
                            <div className="w-full p-2 bg-slate-100/90 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center justify-between">
                              <span>0 Poin</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-black">
                                Non-Skor
                              </span>
                            </div>
                          ) : (
                            <>
                              <input
                                type="number"
                                min="1"
                                value={q.scoreWeight ?? 1}
                                onChange={(e) => {
                                  handleScoreWeightChange(
                                    q.id,
                                    parseInt(e.target.value) || 1,
                                  );
                                  if (validation?.scoreWeight) {
                                    clearQuestionValidationField(q.id, "scoreWeight");
                                  }
                                }}
                                className={`w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400 transition-all ${
                                  validation?.scoreWeight
                                    ? "border-red-500 ring-2 ring-red-200 dark:ring-red-900/50 bg-red-50/30"
                                    : "border-gray-200 dark:border-slate-700"
                                }`}
                                placeholder="Default: 1"
                              />
                              {validation?.scoreWeight && (
                                <p className="text-[10px] text-red-600 dark:text-red-400 font-semibold mt-1">
                                  * Wajib bernilai minimal 1
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block">
                            Kisi-Kisi Materi <span className="normal-case font-normal text-slate-400 dark:text-slate-500">(Opsional)</span>
                          </label>
                        </div>
                        <WysiwygEditor
                          value={q.kisiKisi || ""}
                          onChange={(val) => handleKisiKisiChange(q.id, val)}
                          placeholder="Tulis kisi-kisi materi di sini (opsional)..."
                          minHeight="70px"
                        />
                      </div>
                    </>
                  )}

                  <WysiwygEditor
                    value={q.questionText}
                    onChange={(val) => handleQuestionTextChange(q.id, val)}
                    placeholder={
                      q.questionType === "INFO"
                        ? "Tulis informasi atau teks bacaan di sini..."
                        : "Tulis pertanyaan di sini..."
                    }
                    minHeight="80px"
                    onChartClick={(chartType) =>
                      setEditingChartTarget({
                        qId: q.id,
                        type: "question",
                        preferredType: chartType,
                      })
                    }
                    chartData={q.chartData}
                  />

                  {q.questionType === "MULTIPLE_CHOICE" && (
                    <MultipleChoiceEditor q={q} />
                  )}

                  {q.questionType === "COMPLEX_MULTIPLE_CHOICE" && (
                    <ComplexMultipleChoiceEditor q={q} />
                  )}

                  {q.questionType === "TRUE_FALSE" && (
                    <TrueFalseEditor q={q} />
                  )}

                  {q.questionType === "MATCHING" && (
                    <MatchingEditor q={q} />
                  )}

                  {(q.questionType === "FILL_IN_THE_BLANK" ||
                    q.questionType === "ESSAY") && (
                    <ShortAnswerEditor q={q} />
                  )}

                  {q.questionType === "QUESTIONNAIRE" && (
                    <QuestionnaireEditor q={q} />
                  )}

                  {/* Petunjuk Pengerjaan & Langkah Pengerjaan (Collapsible - Tertutup Default, Hijau Saat Terisi) */}
                  {q.questionType !== "INFO" && q.questionType !== "QUESTIONNAIRE" && (
                    <div className="mt-5 pt-4 border-t border-dashed border-gray-200 dark:border-slate-700">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start">
                        {/* 1. Petunjuk Pengerjaan */}
                        <div
                          className={`flex flex-col rounded-xl border transition-all duration-200 shadow-2xs overflow-hidden ${
                            hasHint
                              ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-700/80"
                              : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={toggleHint}
                            className="w-full p-3 flex items-center justify-between text-left cursor-pointer hover:bg-black/2 dark:hover:bg-white/2 transition-colors select-none"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <LightBulbIcon
                                className={`w-4 h-4 shrink-0 ${
                                  hasHint
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-slate-400 dark:text-slate-500"
                                }`}
                              />
                              <label
                                className={`text-[11px] font-black uppercase tracking-wider truncate cursor-pointer ${
                                  hasHint
                                    ? "text-emerald-900 dark:text-emerald-300"
                                    : "text-slate-700 dark:text-slate-300"
                                }`}
                              >
                                Petunjuk Pengerjaan
                              </label>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  hasHint
                                    ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                    : "bg-slate-200/70 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                                }`}
                              >
                                {hasHint ? "✓ Terisi" : "Opsional"}
                              </span>
                              {isHintOpen ? (
                                <ChevronUpIcon
                                  className={`w-3.5 h-3.5 ${
                                    hasHint
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-slate-400 dark:text-slate-500"
                                  }`}
                                />
                              ) : (
                                <ChevronDownIcon
                                  className={`w-3.5 h-3.5 ${
                                    hasHint
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-slate-400 dark:text-slate-500"
                                  }`}
                                />
                              )}
                            </div>
                          </button>

                          {!isHintOpen && hasHint && (
                            <div
                              onClick={openHint}
                              className="px-3 pb-2.5 text-[11px] text-emerald-800 dark:text-emerald-300 truncate cursor-pointer hover:underline opacity-90"
                              title="Klik untuk membuka editor"
                            >
                              {stripHtml(q.hint)}
                            </div>
                          )}

                          {isHintOpen && (
                            <div className="p-3 pt-2 border-t border-dashed border-gray-200 dark:border-slate-700/80">
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2 leading-relaxed">
                                Bimbingan scaffolding konsep / rumus awal tanpa membocorkan kunci/jawaban akhir.
                              </p>
                              <WysiwygEditor
                                value={q.hint || ""}
                                onChange={(val) => handleHintChange(q.id, val)}
                                placeholder="Tulis petunjuk pengerjaan (petunjuk saja bukan jawaban)..."
                                minHeight="75px"
                              />
                            </div>
                          )}
                        </div>

                        {/* 2. Pembahasan Jawaban */}
                        <div
                          className={`flex flex-col rounded-xl border transition-all duration-200 shadow-2xs overflow-hidden ${
                            hasSteps
                              ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-700/80"
                              : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={toggleSteps}
                            className="w-full p-3 flex items-center justify-between text-left cursor-pointer hover:bg-black/2 dark:hover:bg-white/2 transition-colors select-none"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <AcademicCapIcon
                                className={`w-4 h-4 shrink-0 ${
                                  hasSteps
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-slate-400 dark:text-slate-500"
                                }`}
                              />
                              <label
                                className={`text-[11px] font-black uppercase tracking-wider truncate cursor-pointer ${
                                  hasSteps
                                    ? "text-emerald-900 dark:text-emerald-300"
                                    : "text-slate-700 dark:text-slate-300"
                                }`}
                              >
                                Pembahasan Jawaban
                              </label>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  hasSteps
                                    ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                    : "bg-slate-200/70 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                                }`}
                              >
                                {hasSteps ? "✓ Terisi" : "Opsional"}
                              </span>
                              {isStepsOpen ? (
                                <ChevronUpIcon
                                  className={`w-3.5 h-3.5 ${
                                    hasSteps
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-slate-400 dark:text-slate-500"
                                  }`}
                                />
                              ) : (
                                <ChevronDownIcon
                                  className={`w-3.5 h-3.5 ${
                                    hasSteps
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-slate-400 dark:text-slate-500"
                                  }`}
                                />
                              )}
                            </div>
                          </button>

                          {!isStepsOpen && hasSteps && (
                            <div
                              onClick={openSteps}
                              className="px-3 pb-2.5 text-[11px] text-emerald-800 dark:text-emerald-300 truncate cursor-pointer hover:underline opacity-90"
                              title="Klik untuk membuka editor"
                            >
                              {stripHtml(q.solutionSteps)}
                            </div>
                          )}

                          {isStepsOpen && (
                            <div className="p-3 pt-2 border-t border-dashed border-gray-200 dark:border-slate-700/80">
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2 leading-relaxed">
                                Pembahasan jawaban dan tahapan penyelesaian lengkap dari awal sampai akhir (dapat dibuka siswa pada ulasan nilai).
                              </p>
                              <WysiwygEditor
                                value={q.solutionSteps || ""}
                                onChange={(val) => handleSolutionStepsChange(q.id, val)}
                                placeholder="Tulis pembahasan jawaban dan langkah penyelesaian lengkap di sini..."
                                minHeight="75px"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
            )}
          </div>
        </div>
        <div className="relative py-2 group/insert">
          <div
            className="absolute inset-0 flex items-center"
            aria-hidden="true"
          >
            <div className="w-full border-t border-gray-200 dark:border-slate-700 group-hover/insert:border-primary/30 transition-colors"></div>
          </div>
          <div className="relative flex justify-center">
            <button
              onClick={() => {
                setInsertIndex(index);
                setTypeSelectionModalOpen(true);
              }}
              className="bg-white dark:bg-slate-900 text-gray-400 dark:text-slate-500 group-hover/insert:text-primary dark:group-hover/insert:text-primary group-hover/insert:bg-primary/5 dark:group-hover/insert:bg-primary/20 px-4 py-1 text-xs font-semibold rounded-full border border-gray-200 dark:border-slate-700 group-hover/insert:border-primary/30 shadow-sm transition-all transform hover:scale-105 flex items-center gap-1 opacity-0 group-hover/insert:opacity-100 focus:opacity-100"
            >
              <PlusCircleIcon className="w-4 h-4" /> Sisipkan Soal
            </button>
          </div>
        </div>
      </React.Fragment>
    );
  },
  (prev, next) => {
    return (
      prev.q === next.q &&
      prev.index === next.index &&
      prev.questionNumber === next.questionNumber &&
      prev.isGenerating === next.isGenerating
    );
  },
);
