import React, { useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Exam, Question } from "../../../../types";
import { XMarkIcon, PrinterIcon, TableCellsIcon } from "../../../Icons";
import { sanitizeHtml } from "../../examUtils";
import { renderMathInHtml } from "../../../../utils/mathRenderer";

interface PrintKisiKisiModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam | null;
}

export const PrintKisiKisiModal: React.FC<PrintKisiKisiModalProps> = ({
  isOpen,
  onClose,
  exam,
}) => {
  const printContainerRef = useRef<HTMLDivElement>(null);

  // Helper formatting for Indonesian Question Type
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

  // Math & HTML sanitizer
  const renderFormattedHtml = (rawHtml: string) => {
    if (!rawHtml) return "";
    const sanitized = sanitizeHtml(rawHtml);
    return renderMathInHtml(sanitized);
  };

  // Dedicated print stylesheet injection
  useEffect(() => {
    if (isOpen) {
      const styleId = "print-kisi-kisi-style";
      const existing = document.getElementById(styleId);
      if (existing) existing.remove();

      const style = document.createElement("style");
      style.id = styleId;
      style.innerHTML = `
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 15mm 15mm 15mm;
          }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body > :not(#print-portal-root) {
            display: none !important;
          }

          #print-portal-root {
            position: static !important;
            display: block !important;
            width: 100% !important;
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            z-index: auto !important;
          }

          .print-kisi-kisi-modal-wrapper {
            position: static !important;
            inset: auto !important;
            width: 100% !important;
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
            display: block !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            z-index: auto !important;
          }

          .print-kisi-kisi-content {
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-size: 9.5pt !important;
            line-height: 1.4 !important;
          }

          .print-kisi-kisi-header {
            break-after: avoid !important;
            page-break-after: avoid !important;
            margin-bottom: 14px !important;
            padding-bottom: 6px !important;
          }

          table.kisi-table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: auto;
          }

          table.kisi-table th {
            background-color: #f1f5f9 !important;
            color: #000000 !important;
            font-weight: 700 !important;
            border: 1px solid #000000 !important;
            padding: 5px 6px !important;
            font-size: 9pt !important;
          }

          table.kisi-table td {
            border: 1px solid #000000 !important;
            padding: 5px 6px !important;
            font-size: 9pt !important;
            color: #000000 !important;
          }

          table.kisi-table tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .print-signature-section {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin-top: 24px !important;
          }

          .no-print {
            display: none !important;
          }

          .katex {
            font-size: 1em !important;
            text-rendering: auto !important;
          }
          .katex-display {
            margin: 0.2em 0 !important;
          }
        }
      `;
      document.head.appendChild(style);

      return () => {
        const existingStyle = document.getElementById(styleId);
        if (existingStyle) existingStyle.remove();
        const existingRoot = document.getElementById("print-portal-root");
        if (existingRoot && existingRoot.parentNode && !document.querySelector(".print-soal-modal-wrapper")) {
          existingRoot.parentNode.removeChild(existingRoot);
        }
      };
    }
  }, [isOpen]);

  if (!isOpen || !exam) return null;

  let portalRoot = typeof document !== "undefined" ? document.getElementById("print-portal-root") : null;
  if (!portalRoot && typeof document !== "undefined") {
    portalRoot = document.createElement("div");
    portalRoot.id = "print-portal-root";
    document.body.appendChild(portalRoot);
  }

  if (!portalRoot) return null;

  const currentYear = new Date().getFullYear();
  const allQuestions: Question[] = exam.questions || [];
  const validQuestions = allQuestions.filter((q) => !isInfoItem(q));
  const actualQuestionsCount = validQuestions.length;
  const totalScoreWeight = validQuestions.reduce((sum, q) => sum + (Number(q.scoreWeight) || 1), 0);

  // Grouping / distribution stats
  const levelCounts: Record<string, number> = {};
  const typeCounts: Record<string, number> = {};
  validQuestions.forEach((q) => {
    const lvl = (q.level || "L2").toString().toUpperCase();
    levelCounts[lvl] = (levelCounts[lvl] || 0) + 1;

    const t = formatQuestionType(q.questionType);
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });

  return createPortal(
    <div className="print-kisi-kisi-modal-wrapper fixed inset-0 bg-white z-[9999] overflow-y-auto">
      {/* Screen Toolbar */}
      <div className="no-print sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex flex-wrap justify-between items-center shadow-sm z-10 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <TableCellsIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <span>Pratinjau Kisi-Kisi Soal</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                Naskah Standar PDF
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {exam.config?.subject || "Ujian"} • {actualQuestionsCount} Butir Soal • Total Bobot: {totalScoreWeight}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
            title="Cetak dokumen atau simpan sebagai file PDF"
          >
            <PrinterIcon className="w-4 h-4" />
            <span>Cetak (PDF)</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors"
            title="Tutup Pratinjau"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div
        className="print-kisi-kisi-content max-w-4xl mx-auto bg-white p-6 sm:p-10 text-black"
        ref={printContainerRef}
      >
        {/* Official Indonesian School Exam Header (Kop Dokumen Resmi) */}
        <div className="print-kisi-kisi-header mb-5 border-b-2 border-black pb-3">
          <div className="flex items-center justify-between border-b border-black pb-2 mb-2">
            <div className="text-left">
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-black leading-tight">
                {exam.authorSchool || "ASESMEN AKADEMIK / UJIAN SEKOLAH"}
              </h2>
              <p className="text-[11px] font-semibold text-slate-700">
                TAHUN PELAJARAN {currentYear}/{currentYear + 1}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-2.5 py-0.5 border border-black font-bold text-[11px] uppercase tracking-wider">
                KISI-KISI ASESMEN
              </span>
            </div>
          </div>

          <h1 className="text-base font-black uppercase tracking-wider text-black text-center my-1.5">
            KISI-KISI PENULISAN SOAL ASESMEN {exam.config?.examType ? `- ${exam.config.examType}` : ""}
          </h1>

          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-left text-xs font-medium border-t border-slate-300 pt-2 mt-2">
            <div>
              <span className="font-bold">Mata Pelajaran:</span> {exam.config?.subject || "-"}
            </div>
            <div>
              <span className="font-bold">Kelas / Tingkat:</span> {exam.config?.grade || exam.config?.class || "-"}
            </div>
            <div>
              <span className="font-bold">Alokasi Waktu:</span> {exam.config?.durationMinutes || 90} Menit
            </div>
            <div>
              <span className="font-bold">Jumlah Soal:</span> {actualQuestionsCount} Butir
            </div>
            <div>
              <span className="font-bold">Guru Pengampu:</span> {exam.author || "-"}
            </div>
            <div>
              <span className="font-bold">Total Bobot Skor:</span> {totalScoreWeight}
            </div>
          </div>
        </div>

        {/* 6-Column Standard Kisi-Kisi Table */}
        <div className="overflow-x-auto my-3">
          <table className="kisi-table w-full border-collapse border border-black text-xs text-left">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-black p-2 w-12 text-center font-bold text-black">
                  No
                </th>
                <th className="border border-black p-2 w-28 text-center font-bold text-black">
                  Tipe Soal
                </th>
                <th className="border border-black p-2 w-16 text-center font-bold text-black">
                  Level
                </th>
                <th className="border border-black p-2 w-32 font-bold text-black">
                  Materi
                </th>
                <th className="border border-black p-2 font-bold text-black">
                  Indikator Soal
                </th>
                <th className="border border-black p-2 w-16 text-center font-bold text-black">
                  Bobot Skor
                </th>
              </tr>
            </thead>
            <tbody>
              {validQuestions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="border border-black p-6 text-center text-slate-500 italic">
                    Belum ada butir soal pada ujian ini.
                  </td>
                </tr>
              ) : (
                validQuestions.map((q, index) => {
                  const itemNumber = index + 1;
                  const itemType = formatQuestionType(q.questionType);
                  const itemLevel = q.level ? q.level.toUpperCase() : "L2";
                  const itemCategory = q.category?.trim() || "-";
                  const itemWeight = Number(q.scoreWeight) || 1;

                  // Indicator presentation:
                  // If explicit kisiKisi indicator exists, render it.
                  // Otherwise, construct a clean indicator note or stimulus snippet
                  let indicatorHtml = "";
                  if (q.kisiKisi && q.kisiKisi.trim().length > 0) {
                    indicatorHtml = renderFormattedHtml(q.kisiKisi);
                  } else {
                    // Extract plain question text snippet without HTML tags as fallback
                    const strippedText = (q.questionText || "")
                      .replace(/<[^>]*>/g, " ")
                      .replace(/\s+/g, " ")
                      .trim();
                    const snippet = strippedText.length > 120 ? strippedText.substring(0, 120) + "..." : strippedText;
                    indicatorHtml = snippet
                      ? `Disajikan soal materi <em>${itemCategory !== "-" ? itemCategory : "asesmen"}</em>, peserta didik dapat menyelesaikan butir asesmen: "${snippet}"`
                      : `Disajikan materi <em>${itemCategory !== "-" ? itemCategory : "asesmen"}</em>, peserta didik dapat menentukan jawaban yang tepat.`;
                  }

                  return (
                    <tr key={q.id || index} className="align-top">
                      <td className="border border-black p-2 text-center font-bold font-mono text-black">
                        {itemNumber}
                      </td>
                      <td className="border border-black p-2 text-center text-black font-medium">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[11px] bg-slate-50 border border-slate-200 print:border-none print:bg-transparent">
                          {itemType}
                        </span>
                      </td>
                      <td className="border border-black p-2 text-center font-semibold text-black">
                        <span className="font-mono text-[11px]">{itemLevel}</span>
                      </td>
                      <td className="border border-black p-2 text-black font-medium">
                        {itemCategory}
                      </td>
                      <td className="border border-black p-2 text-black leading-relaxed">
                        <div
                          className="prose prose-xs max-w-none text-black break-words"
                          dangerouslySetInnerHTML={{ __html: indicatorHtml }}
                        />
                      </td>
                      <td className="border border-black p-2 text-center font-bold font-mono text-black">
                        {itemWeight}
                      </td>
                    </tr>
                  );
                })
              )}

              {/* Total & Summary Row */}
              {validQuestions.length > 0 && (
                <tr className="bg-slate-50 font-bold">
                  <td colSpan={5} className="border border-black p-2 text-right pr-4 uppercase tracking-wider text-black">
                    Total Butir Soal & Akumulasi Bobot
                  </td>
                  <td className="border border-black p-2 text-center font-mono text-black text-sm">
                    {totalScoreWeight}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Concise Distribution Summary */}
        {validQuestions.length > 0 && (
          <div className="mt-4 p-3 border border-black bg-slate-50/50 rounded-sm text-xs">
            <div className="font-bold uppercase tracking-wider mb-1.5 border-b border-black pb-1">
              Rekapitulasi Bentuk & Tingkat Kognitif:
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="font-semibold">Distribusi Bentuk Soal: </span>
                {Object.entries(typeCounts)
                  .map(([type, count]) => `${type}: ${count}`)
                  .join(" • ")}
              </div>
              <div>
                <span className="font-semibold">Distribusi Level: </span>
                {Object.entries(levelCounts)
                  .map(([lvl, count]) => `${lvl}: ${count}`)
                  .join(" • ")}
              </div>
            </div>
          </div>
        )}

        {/* Official Approval / Signature Block (Kolom Pengesahan) */}
        <div className="print-signature-section mt-8 pt-4 flex justify-between items-start text-xs text-black">
          <div className="text-center w-64">
            <p className="mb-1">Mengetahui,</p>
            <p className="mb-14 font-semibold">Kepala Sekolah</p>
            <p className="font-bold underline uppercase">
              {exam.authorSchool ? `Kepala ${exam.authorSchool}` : "Kepala Sekolah"}
            </p>
            <p className="text-[11px] text-slate-700">NIP. .....................................................</p>
          </div>

          <div className="text-center w-64">
            <p className="mb-1">
              {exam.authorSchool?.split(" ")?.[0] || "Tempat"},{" "}
              {new Date().toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
            <p className="mb-14 font-semibold">Guru Pengampu / Penyusun</p>
            <p className="font-bold underline uppercase">
              {exam.author || "Guru Mata Pelajaran"}
            </p>
            <p className="text-[11px] text-slate-700">NIP. .....................................................</p>
          </div>
        </div>
      </div>
    </div>,
    portalRoot,
  );
};
