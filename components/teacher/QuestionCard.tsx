import React from "react";
import { useShallow } from "zustand/react/shallow";
import type { Question, QuestionType } from "../../types";
import {
  TrashIcon,
  ArrowPathIcon,
  SparklesIcon,
  PlusCircleIcon,
} from "../Icons";
import { WysiwygEditor } from "./WysiwygEditor";
import { useExamEditorStore } from "../../stores/examEditorStore";
import { useExamEditorUIStore } from "../../stores/examEditorUIStore";
import { MultipleChoiceEditor } from "./question-editors/MultipleChoiceEditor";
import { ComplexMultipleChoiceEditor } from "./question-editors/ComplexMultipleChoiceEditor";
import { TrueFalseEditor } from "./question-editors/TrueFalseEditor";
import { MatchingEditor } from "./question-editors/MatchingEditor";
import { ShortAnswerEditor } from "./question-editors/ShortAnswerEditor";

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
    const {
      handleTypeChange,
      handleDeleteQuestion,
      handleCategoryChange,
      handleLevelChange,
      handleScoreWeightChange,
      handleKisiKisiChange,
      handleQuestionTextChange,
    } = useExamEditorStore(
      useShallow((s) => ({
        handleTypeChange: s.handleTypeChange,
        handleDeleteQuestion: s.handleDeleteQuestion,
        handleCategoryChange: s.handleCategoryChange,
        handleLevelChange: s.handleLevelChange,
        handleScoreWeightChange: s.handleScoreWeightChange,
        handleKisiKisiChange: s.handleKisiKisiChange,
        handleQuestionTextChange: s.handleQuestionTextChange,
      }))
    );

    const {
      setEditingChartTarget,
      setInsertIndex,
      setTypeSelectionModalOpen,
    } = useExamEditorUIStore(
      useShallow((s) => ({
        setEditingChartTarget: s.setEditingChartTarget,
        setInsertIndex: s.setInsertIndex,
        setTypeSelectionModalOpen: s.setTypeSelectionModalOpen,
      }))
    );

    return (
      <React.Fragment key={q.id}>
        <div
          id={q.id}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 group transition-all duration-300 hover:shadow-md relative overflow-visible"
        >
          <div className="absolute top-4 right-4 flex gap-2 opacity-100 transition-opacity z-20">
            {q.questionType !== "INFO" && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onGenerate(q);
                }}
                disabled={isGenerating}
                className={`flex items-center gap-1 p-1.5 rounded-lg border transition-colors shadow-sm disabled:opacity-50 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border-emerald-200 dark:border-emerald-800`}
                title={"Buat dengan AI"}
              >
                {isGenerating ? (
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                ) : (
                  <SparklesIcon className="w-4 h-4" />
                )}
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  AI
                </span>
              </button>
            )}
            <div className="relative inline-block bg-white dark:bg-slate-800 rounded-lg shadow-sm">
              <select
                value={q.questionType}
                onChange={(e) =>
                  handleTypeChange(q.id, e.target.value as QuestionType)
                }
                className="appearance-none bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 py-1.5 pl-3 pr-7 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer hover:bg-white dark:hover:bg-slate-600 hover:border-gray-300 dark:hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              >
                <option value="MULTIPLE_CHOICE">Pilihan Ganda</option>
                <option value="COMPLEX_MULTIPLE_CHOICE">PG Kompleks</option>
                <option value="TRUE_FALSE">Benar / Salah</option>
                <option value="MATCHING">Menjodohkan</option>
                <option value="ESSAY">Esai / Uraian</option>
                <option value="FILL_IN_THE_BLANK">Isian Singkat</option>
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
              className="p-1.5 bg-white dark:bg-slate-700 text-gray-400 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 border border-gray-200 dark:border-slate-600 transition-colors shadow-sm"
              title="Hapus Soal"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="p-6 md:p-8 relative">
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
              <div className="flex items-start gap-4 md:gap-6">
                <div className="flex-shrink-0 mt-1 hidden md:block select-none">
                  {q.questionType === "INFO" ? (
                    <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                      i
                    </div>
                  ) : (
                    <span className="text-slate-300 dark:text-slate-600 font-bold text-xl">
                      {String.fromCharCode(
                        48 + Math.floor(questionNumber / 10),
                      ) + String.fromCharCode(48 + (questionNumber % 10))}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="md:hidden mb-2">
                    {q.questionType !== "INFO" && (
                      <span className="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                        {questionNumber}. Soal
                      </span>
                    )}
                  </div>

                  {q.questionType !== "INFO" && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">
                            Kategori Soal
                          </label>
                          <input
                            type="text"
                            value={q.category || ""}
                            onChange={(e) =>
                              handleCategoryChange(q.id, e.target.value)
                            }
                            className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                            placeholder="Contoh: Aljabar, Teks Prosedur"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">
                            Level Soal
                          </label>
                          <input
                            type="text"
                            value={q.level || ""}
                            onChange={(e) =>
                              handleLevelChange(q.id, e.target.value)
                            }
                            className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                            placeholder="Contoh: 1, 2, HOTS, LOTS"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">
                            Bobot Nilai
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={q.scoreWeight || 1}
                            onChange={(e) =>
                              handleScoreWeightChange(
                                q.id,
                                parseInt(e.target.value) || 1,
                              )
                            }
                            className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                            placeholder="Default: 1"
                          />
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">
                          Kisi-Kisi Materi
                        </label>
                        <textarea
                          value={q.kisiKisi || ""}
                          onChange={(e) =>
                            handleKisiKisiChange(q.id, e.target.value)
                          }
                          className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400 min-h-[60px] resize-y"
                          placeholder="Contoh: Peserta didik dapat menentukan hasil operasi hitung campuran bilangan cacah"
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
                    onChartClick={() =>
                      setEditingChartTarget({
                        qId: q.id,
                        type: "question",
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
                </div>
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
