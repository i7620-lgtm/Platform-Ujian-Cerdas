import React, { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Exam, Question, TeacherProfile } from "../../../../types";
import { XMarkIcon, PrinterIcon, CheckCircleIcon } from "../../../Icons";
import { sanitizeHtml, parseList, isAnswerMatch } from "../../examUtils";
import { renderMathInHtml } from "../../../../utils/mathRenderer";
import { SchoolLetterhead } from "../../SchoolLetterhead";
import { storageService } from "../../../../services/storage";

interface PrintKunciJawabanModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam | null;
  teacherProfile?: TeacherProfile;
}

export const PrintKunciJawabanModal: React.FC<PrintKunciJawabanModalProps> = ({
  isOpen,
  onClose,
  exam,
  teacherProfile,
}) => {
  const printContainerRef = useRef<HTMLDivElement>(null);
  const [headerMode, setHeaderMode] = useState<"default" | "kop">("default");
  const [prevExamCode, setPrevExamCode] = useState(exam?.code);
  if (exam?.code !== prevExamCode) {
    setPrevExamCode(exam?.code);
    setHeaderMode("default");
  }
  const [fetchedProfile, setFetchedProfile] = useState<TeacherProfile | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (isOpen && !teacherProfile) {
      storageService.getCurrentUser().then((u) => {
        if (isMounted && u) setFetchedProfile(u);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, teacherProfile]);

  const profile = teacherProfile || fetchedProfile;

  const formatQuestionType = (type?: string) => {
    switch (type) {
      case "MULTIPLE_CHOICE":
        return "Pilihan Ganda";
      case "COMPLEX_MULTIPLE_CHOICE":
        return "PG Kompleks";
      case "TRUE_FALSE":
        return "Benar / Salah";
      case "MATCHING":
        return "Menjodohkan";
      case "ESSAY":
        return "Uraian";
      case "FILL_IN_THE_BLANK":
        return "Isian Singkat";
      case "INFO":
        return "Informasi";
      default:
        return type || "Pilihan Ganda";
    }
  };

  const isInfoItem = (q: any): boolean => {
    if (!q) return false;
    const t = (q.questionType || q.type || "").toString().trim().toUpperCase();
    return t === "INFO" || t === "KETERANGAN" || t === "INFORMASI";
  };

  const renderFormattedHtml = (rawHtml: string) => {
    if (!rawHtml) return "";
    const sanitized = sanitizeHtml(rawHtml);
    return renderMathInHtml(sanitized);
  };

  const isCorrectMCOption = (q: Question, opt: string, index: number): boolean => {
    const ans = String(q.correctAnswer || "").trim();
    if (!ans) return false;
    const letter = String.fromCharCode(65 + index);
    if (ans.toUpperCase() === letter) return true;
    if (ans.toUpperCase().startsWith(`${letter}.`) || ans.toUpperCase().startsWith(`${letter})`)) return true;
    if (ans === String(index)) return true;
    if (isAnswerMatch(ans, opt, q.questionType, q.options)) return true;
    const strip = (s: string) => s.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
    const cleanAns = strip(ans);
    const cleanOpt = strip(opt);
    if (cleanAns.length > 0 && cleanAns === cleanOpt) return true;
    return false;
  };

  const isCorrectCMCOption = (q: Question, opt: string, index: number): boolean => {
    if (!q.correctAnswer) return false;
    const letter = String.fromCharCode(65 + index);
    const answers = parseList(q.correctAnswer, q.options);
    if (answers.length === 0) {
      const rawAns = String(q.correctAnswer).trim();
      if (rawAns.toUpperCase().includes(letter)) return true;
    }
    return answers.some((a) => {
      const cleanA = String(a).trim();
      if (cleanA.toUpperCase() === letter) return true;
      if (cleanA === String(index)) return true;
      if (cleanA.toUpperCase().startsWith(`${letter}.`) || cleanA.toUpperCase().startsWith(`${letter})`)) return true;
      if (isAnswerMatch(cleanA, opt, q.questionType, q.options)) return true;
      const strip = (s: string) => s.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
      if (strip(cleanA).length > 0 && strip(cleanA) === strip(opt)) return true;
      return false;
    });
  };

  const getTrueFalseRows = (q: Question) => {
    let rows = q.trueFalseRows || (q as any).true_false_rows;
    if ((!rows || rows.length === 0) && q.correctAnswer) {
      try {
        const parsed = typeof q.correctAnswer === "string" ? JSON.parse(q.correctAnswer) : q.correctAnswer;
        if (Array.isArray(parsed)) rows = parsed;
      } catch {
        /* ignore */
      }
    }
    const categoryLabels = q.categoryLabels || (q as any).category_labels;
    const firstLabel = categoryLabels && categoryLabels[0] ? String(categoryLabels[0]).toLowerCase() : "benar";
    return (rows || []).map((row: any) => {
      const rawAns = row.answer;
      const strAns = String(rawAns).toLowerCase().trim();
      const isTrue =
        rawAns === true ||
        strAns === "true" ||
        strAns === "1" ||
        strAns === "benar" ||
        strAns === "ya" ||
        strAns === "sesuai" ||
        strAns === "fakta" ||
        strAns === "setuju" ||
        strAns === firstLabel;
      return {
        text: row.text || "",
        answer: isTrue,
      };
    });
  };

  const getMatchingPairs = (q: Question) => {
    let pairs = q.matchingPairs || (q as any).matching_pairs;
    if ((!pairs || pairs.length === 0) && q.correctAnswer) {
      try {
        const parsed = typeof q.correctAnswer === "string" ? JSON.parse(q.correctAnswer) : q.correctAnswer;
        if (Array.isArray(parsed)) pairs = parsed;
      } catch {
        /* ignore */
      }
    }
    return pairs || [];
  };

  const getExplanation = (q: Question): string => {
    return (
      q.explanation ||
      (q as any).solution ||
      (q as any).pembahasan ||
      q.solutionSteps ||
      (q as any).solution_steps ||
      ""
    );
  };

  // Ringkasan kunci jawaban singkat untuk tabel matriks
  const getShortAnswerSummary = (q: Question): string => {
    if (q.questionType === "MULTIPLE_CHOICE") {
      if (q.options) {
        const idx = q.options.findIndex((opt, i) => isCorrectMCOption(q, opt, i));
        if (idx >= 0) return String.fromCharCode(65 + idx);
      }
      return String(q.correctAnswer || "-").replace(/<[^>]*>/g, "").trim();
    }
    if (q.questionType === "COMPLEX_MULTIPLE_CHOICE") {
      if (q.options) {
        const letters = q.options
          .map((opt, i) => (isCorrectCMCOption(q, opt, i) ? String.fromCharCode(65 + i) : null))
          .filter(Boolean);
        if (letters.length > 0) return letters.join(", ");
      }
      const parsed = parseList(q.correctAnswer, q.options);
      return parsed.length > 0 ? parsed.join(", ") : String(q.correctAnswer || "-");
    }
    if (q.questionType === "TRUE_FALSE") {
      const rows = getTrueFalseRows(q);
      const tLabel = (q.categoryLabels && q.categoryLabels[0]) || "B";
      const fLabel = (q.categoryLabels && q.categoryLabels[1]) || "S";
      return rows.map((r, i) => `${i + 1}:${r.answer ? tLabel : fLabel}`).join(" | ");
    }
    if (q.questionType === "MATCHING") {
      const pairs = getMatchingPairs(q);
      return pairs.map((_, i) => `${i + 1}→${String.fromCharCode(65 + i)}`).join(", ");
    }
    return String(q.correctAnswer || (q as any).correct_answer || "-").replace(/<[^>]*>/g, "").trim();
  };

  useEffect(() => {
    if (isOpen) {
      const styleId = "print-kunci-style";
      const existing = document.getElementById(styleId);
      if (existing) existing.remove();

      const style = document.createElement("style");
      style.id = styleId;
      style.innerHTML = `
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          body {
            background: white !important;
            color: black !important;
            font-size: 11pt !important;
            line-height: 1.4 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-kunci-modal-wrapper {
            position: static !important;
            display: block !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            z-index: auto !important;
          }
          .print-kunci-content {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            box-shadow: none !important;
          }
          .print-kunci-content .geometry-shape {
            display: block !important;
            max-width: 250px !important;
            width: auto !important;
            margin: 0.35rem auto !important;
            text-align: center !important;
          }
          .print-kunci-content .geometry-shape svg {
            display: block !important;
            margin: 0 auto !important;
            max-width: 250px !important;
            max-height: 180px !important;
            width: auto !important;
            height: auto !important;
          }
          .school-letterhead-root img,
          .school-letterhead-logo {
            max-width: 78px !important;
            max-height: 78px !important;
            width: auto !important;
            height: auto !important;
            object-fit: contain !important;
            margin: 0 auto !important;
          }
          .print-kunci-content img:not(.school-letterhead-root *),
          .print-kunci-content svg:not(.katex *):not(.lucide):not(.geometry-shape *):not(.geometry-shape):not(.school-letterhead-root *) {
            max-width: 280px !important;
            width: auto !important;
            max-height: 220px !important;
            height: auto !important;
            object-fit: contain !important;
            display: block !important;
            margin: 6px auto !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .print-kunci-content table {
            width: 100% !important;
            max-width: 100% !important;
            border-collapse: collapse !important;
            table-layout: auto !important;
            word-break: break-word !important;
          }
          .page-break-before {
            break-before: page !important;
            page-break-before: always !important;
          }
          .avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .print-border-black {
            border-color: #000 !important;
          }
        }

        /* Screen Preview Rules for Print Kunci Modal Container */
        .school-letterhead-root img,
        .school-letterhead-logo {
          max-width: 78px !important;
          max-height: 78px !important;
          width: auto !important;
          height: auto !important;
          object-fit: contain !important;
          margin: 0 auto !important;
        }

        .print-kunci-content .geometry-shape {
          display: block !important;
          max-width: 250px !important;
          width: auto !important;
          margin: 0.35rem auto !important;
          text-align: center !important;
        }
        .print-kunci-content .geometry-shape svg {
          display: block !important;
          margin: 0 auto !important;
          max-width: 250px !important;
          max-height: 180px !important;
          width: auto !important;
          height: auto !important;
        }
        .print-kunci-content img:not(.school-letterhead-root *),
        .print-kunci-content svg:not(.katex *):not(.lucide):not(.geometry-shape *):not(.geometry-shape):not(.school-letterhead-root *) {
          max-width: 280px !important;
          width: auto !important;
          max-height: 220px !important;
          height: auto !important;
          object-fit: contain !important;
          display: block !important;
          margin: 6px auto !important;
        }
      `;
      document.head.appendChild(style);
      return () => {
        const el = document.getElementById(styleId);
        if (el) el.remove();
      };
    }
  }, [isOpen]);

  if (!isOpen || !exam) return null;

  const actualQuestions = (exam.questions || []).filter((q) => !isInfoItem(q));
  const currentYear = new Date().getFullYear();

  return createPortal(
    <div className="print-kunci-modal-wrapper fixed inset-0 bg-white z-[9999] overflow-y-auto">
      {/* Screen Toolbar */}
      <div className="no-print sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex flex-wrap justify-between items-center shadow-sm z-10 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-xl">
            <CheckCircleIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-white">
              Pratinjau Kunci Jawaban & Pembahasan
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {exam.config?.subject || "Ujian"} • {actualQuestions.length} Butir Soal • Format Cetak Standar PDF
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tombol Pengalihan Tampilan Kop: Default vs Kop Sekolah */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-700/60 p-0.5 rounded-lg border border-slate-200 dark:border-slate-600">
            <button
              type="button"
              onClick={() => setHeaderMode("default")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                headerMode === "default"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Tampilkan Kop Standar Bawaan"
            >
              Default
            </button>
            <button
              type="button"
              onClick={() => setHeaderMode("kop")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                headerMode === "kop"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Tampilkan Kop Resmi Sekolah (Dwibahasa Aksara Bali / Latin)"
            >
              Kop Sekolah
            </button>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer"
          >
            <PrinterIcon className="w-4 h-4" />
            <span>Cetak (PDF)</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
            title="Tutup Pratinjau"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div
        className="print-kunci-content max-w-4xl mx-auto bg-white p-6 sm:p-10 text-black"
        ref={printContainerRef}
      >
        {/* Render Kop Sekolah Resmi jika mode "kop", atau Kop Resmi Standar jika mode "default" */}
        <div className="print-kunci-header mb-5 border-b-2 border-black pb-3">
          {headerMode === "kop" ? (
            <div className="mb-2">
              <SchoolLetterhead profile={profile} />

              <div className="text-center my-2">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-black underline underline-offset-4">
                  KUNCI JAWABAN & PEDOMAN PENILAIAN
                </h3>
                <p className="text-xs font-bold text-gray-800 uppercase mt-1">
                  TAHUN PELAJARAN {currentYear}/{currentYear + 1}
                </p>
              </div>
            </div>
          ) : (
            <div className="mb-2">
              <div className="flex items-center justify-between border-b border-black pb-2 mb-2">
                <div className="text-left">
                  <h2 className="text-sm font-extrabold uppercase tracking-wide text-black leading-tight">
                    {exam.authorSchool || profile?.school || "SATUAN PENDIDIKAN"}
                  </h2>
                  <p className="text-[11px] font-semibold text-slate-700">
                    TAHUN PELAJARAN {currentYear}/{currentYear + 1}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-0.5 border border-black font-bold text-[11px] uppercase tracking-wider">
                    KUNCI JAWABAN
                  </span>
                </div>
              </div>

              <div className="text-center my-3">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-black underline underline-offset-4">
                  KUNCI JAWABAN & PEDOMAN PENILAIAN
                </h3>
              </div>
            </div>
          )}

          <table className="w-full text-xs font-semibold mt-2 border-t border-black pt-2">
            <tbody>
              <tr>
                <td className="w-28 py-0.5">Mata Pelajaran</td>
                <td className="w-3">:</td>
                <td className="font-bold">{exam.config?.subject || "-"}</td>
                <td className="w-24 py-0.5">Kelas / Jenjang</td>
                <td className="w-3">:</td>
                <td className="font-bold">{exam.config?.classLevel || "-"}</td>
              </tr>
              <tr>
                <td className="py-0.5">Bentuk Evaluasi</td>
                <td>:</td>
                <td>{exam.config?.examType || "Evaluasi"}</td>
                <td className="py-0.5">Kode Soal</td>
                <td>:</td>
                <td className="font-mono font-bold">{exam.code}</td>
              </tr>
              <tr>
                <td className="py-0.5">Jumlah Soal</td>
                <td>:</td>
                <td>{actualQuestions.length} Butir Soal</td>
                <td className="py-0.5">Tanggal Draf</td>
                <td>:</td>
                <td>
                  {exam.config?.date
                    ? new Date(exam.config.date).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "-"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* SEKSI 1: TABEL MATRIKS RINGKASAN KUNCI JAWABAN */}
        <div className="mb-6 avoid-break">
          <div className="bg-slate-100 border border-black px-3 py-1.5 font-bold text-xs uppercase tracking-wide mb-2">
            I. Tabel Ringkasan Kunci Jawaban
          </div>
          <table className="w-full border-collapse border border-black text-xs">
            <thead>
              <tr className="bg-slate-50 text-black">
                <th className="border border-black px-2 py-1.5 text-center w-12 font-bold">No.</th>
                <th className="border border-black px-3 py-1.5 text-left w-36 font-bold">Bentuk Soal</th>
                <th className="border border-black px-3 py-1.5 text-left font-bold">Kunci Jawaban</th>
                <th className="border border-black px-2 py-1.5 text-center w-20 font-bold">Bobot</th>
              </tr>
            </thead>
            <tbody>
              {actualQuestions.map((q, idx) => (
                <tr key={q.id || idx} className="hover:bg-slate-50/50">
                  <td className="border border-black px-2 py-1 text-center font-bold">{idx + 1}</td>
                  <td className="border border-black px-3 py-1 font-medium">{formatQuestionType(q.questionType)}</td>
                  <td className="border border-black px-3 py-1 font-bold text-slate-900 font-mono text-[11px]">
                    {getShortAnswerSummary(q)}
                  </td>
                  <td className="border border-black px-2 py-1 text-center">{q.scoreWeight || 1}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SEKSI 2: NASKAH SOAL LENGKAP DENGAN KUNCI & PEMBAHASAN */}
        <div className="page-break-before pt-2">
          <div className="bg-slate-100 border border-black px-3 py-1.5 font-bold text-xs uppercase tracking-wide mb-4">
            II. Pembahasan Butir Soal Terperinci
          </div>

          <div className="space-y-5">
            {actualQuestions.map((q, qIdx) => {
              const explanation = getExplanation(q);
              const tfRows = q.questionType === "TRUE_FALSE" ? getTrueFalseRows(q) : [];
              const matchingPairs = q.questionType === "MATCHING" ? getMatchingPairs(q) : [];

              return (
                <div
                  key={q.id || qIdx}
                  className="avoid-break p-3.5 border border-slate-300 rounded-lg text-xs space-y-2.5"
                >
                  {/* Nomor dan Meta */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 bg-black text-white rounded-full flex items-center justify-center font-bold text-[10px]">
                        {qIdx + 1}
                      </span>
                      <span className="font-bold text-[11px] text-slate-800">
                        {formatQuestionType(q.questionType)}
                      </span>
                      {q.category && (
                        <span className="text-[10px] text-slate-500 font-medium">
                          • {q.category}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      Bobot: {q.scoreWeight || 1}
                    </span>
                  </div>

                  {/* Teks Soal */}
                  <div
                    className="font-normal text-slate-900 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: renderFormattedHtml(q.questionText) }}
                  />

                  {/* Pilihan Ganda (MC) */}
                  {q.questionType === "MULTIPLE_CHOICE" && q.options && (
                    <div className="space-y-1.5 pl-2">
                      {q.options.map((opt, oIdx) => {
                        const isCorrect = isCorrectMCOption(q, opt, oIdx);
                        return (
                          <div
                            key={oIdx}
                            className={`flex items-start gap-2 p-1.5 rounded border text-xs ${
                              isCorrect
                                ? "bg-emerald-50 border-emerald-400 font-bold text-emerald-950"
                                : "border-transparent text-slate-700"
                            }`}
                          >
                            <span className="w-4 font-bold">{String.fromCharCode(65 + oIdx)}.</span>
                            <div
                              className="flex-1"
                              dangerouslySetInnerHTML={{ __html: renderFormattedHtml(opt) }}
                            />
                            {isCorrect && (
                              <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider shrink-0 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200">
                                Kunci Benar
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Pilihan Ganda Kompleks (CMC) */}
                  {q.questionType === "COMPLEX_MULTIPLE_CHOICE" && q.options && (
                    <div className="space-y-1.5 pl-2">
                      {q.options.map((opt, oIdx) => {
                        const isSelected = isCorrectCMCOption(q, opt, oIdx);
                        return (
                          <div
                            key={oIdx}
                            className={`flex items-start gap-2 p-1.5 rounded border text-xs ${
                              isSelected
                                ? "bg-emerald-50 border-emerald-400 font-bold text-emerald-950"
                                : "border-transparent text-slate-700"
                            }`}
                          >
                            <span className="w-4 font-bold">{String.fromCharCode(65 + oIdx)}.</span>
                            <div
                              className="flex-1"
                              dangerouslySetInnerHTML={{ __html: renderFormattedHtml(opt) }}
                            />
                            {isSelected && (
                              <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider shrink-0 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200">
                                Kunci Benar
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Benar / Salah (TF) */}
                  {q.questionType === "TRUE_FALSE" && tfRows.length > 0 && (
                    <table className="w-full border-collapse border border-black text-[11px] mt-1 table-fixed">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="border border-black px-2 py-1 text-left font-bold">Pernyataan</th>
                          <th className="border border-black px-2 py-1 text-center w-[100px] font-bold">Kunci</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tfRows.map((row, rIdx) => (
                          <tr key={rIdx}>
                            <td
                              className="border border-black px-2 py-1 leading-snug"
                              dangerouslySetInnerHTML={{ __html: renderFormattedHtml(row.text) }}
                            />
                            <td className="border border-black px-2 py-1 text-center font-bold text-emerald-800 bg-emerald-50/50 w-[100px]">
                              {row.answer
                                ? (q.categoryLabels && q.categoryLabels[0]) || "Benar"
                                : (q.categoryLabels && q.categoryLabels[1]) || "Salah"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {/* Menjodohkan (Matching) */}
                  {q.questionType === "MATCHING" && matchingPairs.length > 0 && (
                    <table className="w-full border-collapse border border-slate-300 text-xs mt-1">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="border border-slate-300 px-2 py-1 text-left font-bold w-1/2">Pernyataan / Kiri</th>
                          <th className="border border-slate-300 px-2 py-1 text-left font-bold w-1/2">Pasangan Benar / Kanan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matchingPairs.map((pair, pIdx) => (
                          <tr key={pIdx}>
                            <td
                              className="border border-slate-300 px-2 py-1"
                              dangerouslySetInnerHTML={{ __html: renderFormattedHtml(pair.left) }}
                            />
                            <td
                              className="border border-slate-300 px-2 py-1 font-bold text-emerald-800 bg-emerald-50/50"
                              dangerouslySetInnerHTML={{ __html: renderFormattedHtml(pair.right) }}
                            />
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {/* Isian Singkat & Esai */}
                  {(q.questionType === "FILL_IN_THE_BLANK" || q.questionType === "ESSAY") && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded">
                      <span className="font-bold text-[10px] uppercase text-emerald-800 block mb-0.5">
                        Kunci Jawaban / Pedoman Penskoran:
                      </span>
                      <div
                        className="font-medium text-emerald-950"
                        dangerouslySetInnerHTML={{
                          __html: renderFormattedHtml(q.correctAnswer || (q as any).correct_answer || "-"),
                        }}
                      />
                    </div>
                  )}

                  {/* Kotak Pembahasan */}
                  {explanation && (
                    <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded text-slate-800 space-y-1">
                      <span className="font-bold text-[10px] uppercase tracking-wider text-indigo-700 block">
                        Pembahasan & Solusi:
                      </span>
                      <div
                        className="leading-relaxed text-slate-800 font-normal"
                        dangerouslySetInnerHTML={{ __html: renderFormattedHtml(explanation) }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
