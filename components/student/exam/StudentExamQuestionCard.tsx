import React, { useMemo } from "react";
import type { Question } from "../../../types";
import {
  PencilIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LightBulbIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "../../Icons";
import { sanitizeHtml } from "../../teacher/examUtils";
import { AudioPlayer } from "../../AudioPlayer";
import { MultipleChoiceView } from "../question-types/MultipleChoiceView";
import { TrueFalseView } from "../question-types/TrueFalseView";
import { MatchingView } from "../question-types/MatchingView";
import { QuestionnaireView } from "../question-types/QuestionnaireView";
import { renderQuestionTextWithChart } from "./QuestionStimulusRenderer";

interface StudentExamQuestionCardProps {
  question: Question;
  questionNumber: number;
  answered: boolean;
  isMissing: boolean;
  answerValue: string;
  rightOptions: string[];
  showHints?: boolean;
  isHintExpanded: boolean;
  onToggleHint: (questionId: string) => void;
  onAnswerChange: (questionId: string, value: string) => void;
  optimizeHtml: (html: string) => string;
}

export const StudentExamQuestionCard: React.FC<StudentExamQuestionCardProps> = React.memo(({
  question: q,
  questionNumber,
  answered,
  isMissing,
  answerValue,
  rightOptions,
  showHints,
  isHintExpanded,
  onToggleHint,
  onAnswerChange,
  optimizeHtml,
}) => {
  const renderedStimulus = useMemo(
    () =>
      renderQuestionTextWithChart(
        q.questionText,
        q.chartData,
        q.audioUrl,
        q.listeningScript,
        optimizeHtml,
      ),
    [q.questionText, q.chartData, q.audioUrl, q.listeningScript, optimizeHtml],
  );

  const sanitizedHintHtml = useMemo(() => {
    if (!showHints || !isHintExpanded || !q.hint) return "";
    return sanitizeHtml(optimizeHtml(q.hint));
  }, [showHints, isHintExpanded, q.hint, optimizeHtml]);

  const hasInlineAudioMarker = useMemo(
    () =>
      /\[AUDIO_STIMULUS\]/i.test(q.questionText) ||
      /data-audio="true"/i.test(q.questionText),
    [q.questionText],
  );

  return (
    <div
      id={q.id}
      className={`scroll-mt-20 sm:scroll-mt-28 animate-fade-in transition-all duration-500 ${isMissing ? "ring-2 ring-rose-400 rounded-2xl sm:rounded-[1.5rem]" : ""}`}
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm px-3.5 py-4 sm:p-8">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 items-stretch sm:items-start">
          <div className="shrink-0 flex items-center justify-between gap-2.5 pb-2.5 sm:pb-0 sm:pt-0.5 border-b border-slate-100 dark:border-slate-800/80 sm:border-b-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={`text-sm font-black w-8 h-8 flex items-center justify-center rounded-xl transition-all shadow-sm shrink-0 tabular-nums ${
                  isMissing
                    ? "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"
                    : answered
                      ? "text-white bg-indigo-600 dark:bg-indigo-500 shadow-indigo-200 dark:shadow-none"
                      : "text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800"
                }`}
              >
                {q.questionType === "INFO" ? "i" : questionNumber}
              </span>

              <div className="sm:hidden flex items-center gap-1.5 text-xs font-bold tracking-tight min-w-0">
                {q.questionType === "INFO" ? (
                  <span className="text-slate-500 dark:text-slate-400 font-semibold">
                    Informasi Soal
                  </span>
                ) : isMissing ? (
                  <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
                    <ExclamationTriangleIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>Belum Dijawab</span>
                  </span>
                ) : answered ? (
                  <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                    <CheckCircleIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>Sudah Dijawab</span>
                  </span>
                ) : (
                  <span className="text-slate-400 dark:text-slate-500 font-semibold">
                    Belum Dijawab
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            {(q.audioUrl || q.listeningScript) && !hasInlineAudioMarker && (
              <div className="mb-4">
                <AudioPlayer src={q.audioUrl} script={q.listeningScript} isTeacher={false} />
              </div>
            )}
            {q.videoUrl && (
              <div className="mb-4 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-black aspect-video max-w-xl">
                {q.videoUrl.includes("youtube.com") || q.videoUrl.includes("youtu.be") ? (
                  <iframe
                    src={
                      q.videoUrl.includes("watch?v=")
                        ? q.videoUrl.replace("watch?v=", "embed/")
                        : q.videoUrl.replace("youtu.be/", "www.youtube.com/embed/")
                    }
                    loading="lazy"
                    className="w-full h-full"
                    title="Video Stimulus Soal"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={q.videoUrl}
                    controls
                    playsInline
                    preload="metadata"
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
            )}
            <div className="student-question-text prose prose-slate dark:prose-invert max-w-none font-medium mb-4 sm:mb-6">
              {renderedStimulus}
            </div>

            <div className="space-y-4">
              {(q.questionType === "MULTIPLE_CHOICE" ||
                q.questionType === "COMPLEX_MULTIPLE_CHOICE") && (
                <MultipleChoiceView
                  question={q}
                  answerValue={answerValue}
                  onAnswerChange={onAnswerChange}
                  optimizeHtml={optimizeHtml}
                />
              )}

              {q.questionType === "TRUE_FALSE" && (
                <TrueFalseView
                  question={q}
                  answerValue={answerValue}
                  onAnswerChange={onAnswerChange}
                  optimizeHtml={optimizeHtml}
                />
              )}

              {q.questionType === "MATCHING" && (
                <MatchingView
                  question={q}
                  answerValue={answerValue}
                  rightOptions={rightOptions}
                  onAnswerChange={onAnswerChange}
                  optimizeHtml={optimizeHtml}
                />
              )}

              {q.questionType === "ESSAY" && (
                <textarea
                  value={answerValue}
                  onChange={(e) => {
                    onAnswerChange(q.id, e.target.value);
                    const el = e.currentTarget;
                    el.style.height = "auto";
                    el.style.height = `${Math.min(el.scrollHeight, 420)}px`;
                  }}
                  onCopy={(e) => e.preventDefault()}
                  onCut={(e) => e.preventDefault()}
                  onPaste={(e) => e.preventDefault()}
                  onContextMenu={(e) => e.preventDefault()}
                  className="w-full text-base p-3.5 sm:p-5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 dark:focus:border-indigo-500 outline-none min-h-[160px] max-h-[420px] overscroll-contain text-slate-700 dark:text-slate-200 transition-all resize-y placeholder:text-slate-400 dark:placeholder:text-slate-600 leading-relaxed exam-input-secure"
                  placeholder="Tulis jawaban lengkap Anda..."
                />
              )}

              {q.questionType === "FILL_IN_THE_BLANK" && (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <PencilIcon className="w-5 h-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={answerValue}
                    onChange={(e) => onAnswerChange(q.id, e.target.value)}
                    onCopy={(e) => e.preventDefault()}
                    onCut={(e) => e.preventDefault()}
                    onPaste={(e) => e.preventDefault()}
                    onContextMenu={(e) => e.preventDefault()}
                    className="w-full text-base pl-11 pr-3.5 py-3.5 sm:pl-12 sm:pr-4 sm:py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 dark:focus:border-indigo-500 outline-none font-bold text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all exam-input-secure"
                    placeholder="Ketik jawaban singkat..."
                  />
                </div>
              )}

              {q.questionType === "QUESTIONNAIRE" && (
                <QuestionnaireView
                  question={q}
                  answerValue={answerValue}
                  onAnswerChange={onAnswerChange}
                  optimizeHtml={optimizeHtml}
                />
              )}
            </div>

            {/* Petunjuk Pengerjaan */}
            {showHints && q.hint && q.hint.trim() !== "" && (
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => onToggleHint(q.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 border border-amber-200/80 dark:border-amber-800/60 transition-colors shadow-2xs"
                >
                  <LightBulbIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>{isHintExpanded ? "Tutup Petunjuk Pengerjaan" : "Buka Petunjuk Pengerjaan"}</span>
                  {isHintExpanded ? (
                    <ChevronUpIcon className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <ChevronDownIcon className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  )}
                </button>

                {isHintExpanded && (
                  <div className="mt-2.5 p-3.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 rounded-xl text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                    <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-400 mb-1.5">
                      <LightBulbIcon className="w-3 h-3 text-amber-500" />
                      <span>Petunjuk Pengerjaan</span>
                    </div>
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-200 [&_p]:my-1"
                      dangerouslySetInnerHTML={{
                        __html: sanitizedHintHtml,
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
