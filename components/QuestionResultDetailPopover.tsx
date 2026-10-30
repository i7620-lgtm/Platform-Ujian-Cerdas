import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { Question } from "../types";
import {
  CheckCircleIcon,
  XMarkIcon,
  CheckIcon,
  LightBulbIcon,
  SparklesIcon,
} from "./Icons";
import {
  isAnswerMatch,
  parseList,
  normalize,
  sanitizeHtml,
} from "./teacher/examUtils";

interface QuestionResultDetailPopoverProps {
  question: Question;
  questionIndex: number;
  answers: Record<string, string>;
  status: string; // "CORRECT" | "WRONG" | "EMPTY"
  isManual?: boolean;
  isGraded?: boolean | string;
  showCorrectAnswer?: boolean;
  showSolutionSteps?: boolean;
  size?: "sm" | "md";
}

export const QuestionResultDetailPopover: React.FC<
  QuestionResultDetailPopoverProps
> = ({
  question,
  questionIndex,
  answers,
  status,
  isManual = false,
  isGraded = false,
  showCorrectAnswer = true,
  showSolutionSteps = true,
  size = "sm",
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const hoverTimeoutRef = useRef<number | null>(null);

  const studentAns = answers[question.id] || "";
  const correctAns = question.correctAnswer || "";

  // Styling badge warna nomor soal
  let badgeColorClass =
    "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600";
  let statusLabel = "Kosong (Tidak Dijawab)";
  let statusBadgeStyle =
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";

  if (question.questionType === "QUESTIONNAIRE") {
    if (studentAns && studentAns.trim().length > 0) {
      badgeColorClass =
        "bg-indigo-500 dark:bg-indigo-600 text-white font-black hover:bg-indigo-600";
      statusLabel = "Respon Terkumpul (Non-Skor)";
      statusBadgeStyle =
        "bg-indigo-50 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800";
    } else {
      badgeColorClass =
        "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600";
      statusLabel = "Kosong (Tidak Diisi)";
      statusBadgeStyle =
        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    }
  } else if (isManual && !isGraded) {
    badgeColorClass =
      "bg-amber-300 dark:bg-amber-500 text-slate-900 font-black hover:bg-amber-400";
    statusLabel = "Belum Dinilai";
    statusBadgeStyle =
      "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800";
  } else if (status === "CORRECT") {
    badgeColorClass =
      "bg-emerald-400 dark:bg-emerald-600 text-white font-black hover:bg-emerald-500";
    statusLabel = "Jawaban Benar";
    statusBadgeStyle =
      "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
  } else if (status === "WRONG") {
    badgeColorClass =
      "bg-rose-400 dark:bg-rose-600 text-white font-black hover:bg-rose-500";
    statusLabel = "Jawaban Salah";
    statusBadgeStyle =
      "bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800";
  }

  // Hitung posisi popover hover agar selalu berada di dalam viewport layar
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = Math.min(420, window.innerWidth - 32);

    let left = rect.left + rect.width / 2 - popoverWidth / 2;
    if (left < 16) left = 16;
    if (left + popoverWidth > window.innerWidth - 16) {
      left = window.innerWidth - 16 - popoverWidth;
    }

    let top = rect.bottom + 8;
    // Jika terlalu mepet ke bawah layar, posisikan ke atas tombol
    if (top + 280 > window.innerHeight && rect.top > 300) {
      top = rect.top - 8;
    }

    setCoords({ top, left });
  };

  const handleMouseEnter = () => {
    // Hanya trigger hover pada perangkat yang memiliki mouse hover
    if (window.matchMedia("(pointer: fine)").matches) {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      updatePosition();
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = window.setTimeout(() => {
      setIsHovered(false);
    }, 150);
  };

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsHovered(false);
    setIsModalOpen(true);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  // Helper render konten soal
  const renderDetailContent = () => {
    return (
      <div className="space-y-3.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
        {/* Header Rincian */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="font-black text-sm text-slate-900 dark:text-white">
              Soal #{questionIndex + 1}
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadgeStyle}`}
            >
              {statusLabel}
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono">
            {question.points ?? 1} Poin
          </span>
        </div>

        {/* Teks Soal */}
        <div className="bg-slate-50/80 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
            Pertanyaan:
          </p>
          <div
            className="font-medium text-slate-800 dark:text-slate-200 prose prose-xs max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(question.questionText || "-"),
            }}
          />
        </div>

        {/* Opsi & Jawaban: Pilihan Ganda Biasa */}
        {question.questionType === "MULTIPLE_CHOICE" && question.options && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Pilihan Jawaban:
            </p>
            <div className="space-y-1.5">
              {question.options.map((opt, oIdx) => {
                const optLetter = String.fromCharCode(65 + oIdx);
                const isSelectedByStudent =
                  studentAns.trim().toLowerCase() ===
                    optLetter.toLowerCase() ||
                  studentAns.trim().toLowerCase() === opt.trim().toLowerCase();
                const isCorrectOption =
                  correctAns.trim().toLowerCase() ===
                    optLetter.toLowerCase() ||
                  correctAns.trim().toLowerCase() === opt.trim().toLowerCase();

                let cardStyle =
                  "bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300";
                let badgeNode = null;

                if (showCorrectAnswer && isCorrectOption) {
                  cardStyle =
                    "bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-bold ring-1 ring-emerald-400/30";
                  badgeNode = (
                    <span className="text-[9px] bg-emerald-600 text-white font-extrabold px-1.5 py-0.5 rounded ml-auto shrink-0 flex items-center gap-0.5">
                      <CheckIcon className="w-2.5 h-2.5" /> Kunci Benar
                    </span>
                  );
                }

                if (isSelectedByStudent) {
                  if (isCorrectOption) {
                    badgeNode = (
                      <span className="text-[9px] bg-emerald-600 text-white font-extrabold px-1.5 py-0.5 rounded ml-auto shrink-0 flex items-center gap-0.5">
                        <CheckIcon className="w-2.5 h-2.5" /> Jawaban Siswa
                        (Benar)
                      </span>
                    );
                  } else {
                    cardStyle =
                      "bg-rose-50/90 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 font-bold ring-1 ring-rose-400/30";
                    badgeNode = (
                      <span className="text-[9px] bg-rose-600 text-white font-extrabold px-1.5 py-0.5 rounded ml-auto shrink-0 flex items-center gap-0.5">
                        <XMarkIcon className="w-2.5 h-2.5" /> Jawaban Siswa
                        (Salah)
                      </span>
                    );
                  }
                }

                return (
                  <div
                    key={oIdx}
                    className={`flex items-start gap-2 p-2 rounded-xl border text-xs transition-colors ${cardStyle}`}
                  >
                    <span className="w-5 h-5 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      {optLetter}
                    </span>
                    <span
                      className="flex-1 min-w-0"
                      dangerouslySetInnerHTML={{ __html: opt }}
                    />
                    {badgeNode}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pilihan Ganda Kompleks */}
        {question.questionType === "COMPLEX_MULTIPLE_CHOICE" &&
          question.options && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Pilihan Ganda Kompleks:
              </p>
              <div className="space-y-1.5">
                {question.options.map((opt, oIdx) => {
                  const studentChoices = parseList(studentAns).map((s) =>
                    normalize(s),
                  );
                  const correctChoices = parseList(correctAns).map((c) =>
                    normalize(c),
                  );
                  const isSelected = studentChoices.includes(normalize(opt));
                  const isCorrect = correctChoices.includes(normalize(opt));

                  let cardStyle =
                    "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700";
                  if (showCorrectAnswer && isCorrect) {
                    cardStyle =
                      "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-bold";
                  }
                  if (isSelected && !isCorrect) {
                    cardStyle =
                      "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 font-bold";
                  }

                  return (
                    <div
                      key={oIdx}
                      className={`flex items-start gap-2 p-2 rounded-xl border text-xs ${cardStyle}`}
                    >
                      <div className="w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5">
                        {isSelected && (
                          <CheckIcon className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                        )}
                      </div>
                      <span
                        className="flex-1"
                        dangerouslySetInnerHTML={{ __html: opt }}
                      />
                      <div className="flex gap-1 shrink-0">
                        {isSelected && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded text-white ${isCorrect ? "bg-emerald-600" : "bg-rose-600"}`}
                          >
                            Pilihan Siswa
                          </span>
                        )}
                        {showCorrectAnswer && isCorrect && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-600 text-white">
                            Kunci Benar
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        {/* Tipe Benar-Salah (True/False) */}
        {question.questionType === "TRUE_FALSE" && question.trueFalseRows && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Pernyataan Benar / Salah:
            </p>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800/80">
              {question.trueFalseRows.map((row, rIdx) => {
                let studentRowAns = "-";
                try {
                  const parsed = JSON.parse(studentAns);
                  studentRowAns = parsed[rIdx] ?? "-";
                } catch {
                  /* ignore */
                }
                const correctRowAns = row.answer;
                const isRowMatch = String(studentRowAns) === String(correctRowAns);

                return (
                  <div
                    key={rIdx}
                    className="p-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <span
                      className="flex-1 font-medium text-slate-700 dark:text-slate-200"
                      dangerouslySetInnerHTML={{ __html: row.statement }}
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black ${isRowMatch ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"}`}
                      >
                        Siswa: {studentRowAns}
                      </span>
                      {showCorrectAnswer && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          Kunci: {correctRowAns}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tipe Menjodohkan (Matching) */}
        {question.questionType === "MATCHING" && question.matchingPairs && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Pasangan Menjodohkan:
            </p>
            <div className="space-y-1.5">
              {question.matchingPairs.map((pair, pIdx) => {
                let studentPairRight = "-";
                try {
                  const parsed = JSON.parse(studentAns);
                  studentPairRight = parsed[pair.left] ?? "-";
                } catch {
                  /* ignore */
                }
                const isPairMatch =
                  studentPairRight.trim().toLowerCase() ===
                  pair.right.trim().toLowerCase();

                return (
                  <div
                    key={pIdx}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-xs flex flex-col gap-1"
                  >
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      {pair.left}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${isPairMatch ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"}`}
                      >
                        Pasangan Siswa: {studentPairRight}
                      </span>
                      {showCorrectAnswer && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          Kunci: {pair.right}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tipe Isian Singkat & Esai */}
        {(question.questionType === "FILL_IN_THE_BLANK" ||
          question.questionType === "ESSAY") && (
          <div className="space-y-2">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                Jawaban Siswa:
              </span>
              <p className="font-medium text-slate-800 dark:text-slate-200">
                {studentAns || "(Kosong)"}
              </p>
            </div>
            {showCorrectAnswer && correctAns && (
              <div className="p-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block mb-1">
                  Kunci Jawaban / Pembahasan Singkat:
                </span>
                <div
                  className="font-bold text-emerald-900 dark:text-emerald-200 prose prose-xs max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: correctAns }}
                />
              </div>
            )}
          </div>
        )}

        {/* Tipe Kuisioner / Angket */}
        {question.questionType === "QUESTIONNAIRE" && (
          <div className="space-y-2">
            <div className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/70">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 block mb-1">
                Respon / Pilihan Siswa:
              </span>
              <p className="font-bold text-indigo-950 dark:text-indigo-100">
                {studentAns ? (
                  question.questionnaireFormat === "rating" ? (
                    `★ Rating ${studentAns} dari 5 Bintang`
                  ) : question.questionnaireFormat === "scale" ? (
                    `Skala Nilai ${studentAns} (${studentAns === String(question.scaleMin ?? 1) ? question.scaleLabels?.[0] || "" : studentAns === String(question.scaleMax ?? 5) ? question.scaleLabels?.[1] || "" : "Pilihan Siswa"})`
                  ) : (
                    studentAns
                  )
                ) : (
                  <span className="text-slate-400 italic font-normal">Tidak Mengisi</span>
                )}
              </p>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
              * Butir soal kuisioner murni menghimpun data umpan balik dan tidak dihitung ke skor kompetensi siswa.
            </p>
          </div>
        )}

        {/* Pembahasan / Langkah Penyelesaian (Jika Tersedia) */}
        {showSolutionSteps &&
          (question.solutionSteps || question.hints) && (
            <div className="mt-3 p-3 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-800/80">
              <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-black text-xs mb-1.5">
                <LightBulbIcon className="w-4 h-4 shrink-0 text-amber-500" />
                <span>Pembahasan Soal:</span>
              </div>
              <div
                className="text-xs text-indigo-950 dark:text-indigo-200 leading-relaxed prose prose-xs max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(
                    question.solutionSteps || question.hints || "",
                  ),
                }}
              />
            </div>
          )}
      </div>
    );
  };

  return (
    <>
      {/* Tombol Kotak Nomor Soal */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleTriggerClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`${
          size === "md" ? "w-8 h-8 text-xs" : "w-6 h-6 text-[10px]"
        } flex items-center justify-center rounded font-bold cursor-pointer transition-all duration-150 transform hover:scale-110 active:scale-95 shadow-2xs select-none ${badgeColorClass}`}
        title={`Soal #${questionIndex + 1}: ${statusLabel} (Klik untuk rincian)`}
        aria-label={`Rincian Soal #${questionIndex + 1}`}
      >
        {questionIndex + 1}
      </button>

      {/* Popover Desktop Saat Kursor Hover */}
      {isHovered &&
        coords &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: "min(420px, calc(100vw - 32px))",
              maxHeight: "80vh",
            }}
            className="z-[9999] bg-white/98 dark:bg-slate-900/98 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-slate-200/90 dark:border-slate-800 ring-1 ring-black/5 dark:ring-white/10 overflow-y-auto animate-fade-in custom-scrollbar pointer-events-auto"
            onMouseEnter={() => {
              if (hoverTimeoutRef.current)
                clearTimeout(hoverTimeoutRef.current);
            }}
            onMouseLeave={handleMouseLeave}
          >
            {renderDetailContent()}
          </div>,
          document.body,
        )}

      {/* Modal Dialog Pop-up Saat Diklik / di Perangkat Mobile */}
      {isModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[10000] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
            onClick={() => setIsModalOpen(false)}
          >
            <div
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 max-h-[85vh] overflow-y-auto custom-scrollbar animate-scale-up relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Tutup Detail Soal"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>

              {renderDetailContent()}

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};
