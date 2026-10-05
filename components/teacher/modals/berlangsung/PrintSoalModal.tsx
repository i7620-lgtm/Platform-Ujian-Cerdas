import React, { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Exam } from "../../../../types";
import { XMarkIcon, PrinterIcon } from "../../../Icons";
import { sanitizeHtml } from "../../examUtils";
import { ChartRenderer } from "../../../ChartRenderer";
import { renderMathInHtml } from "../../../../utils/mathRenderer";

interface PrintSoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam | null;
}

export const PrintSoalModal: React.FC<PrintSoalModalProps> = ({
  isOpen,
  onClose,
  exam,
}) => {
  const printContainerRef = useRef<HTMLDivElement>(null);
  const [isTwoColOptions, setIsTwoColOptions] = useState(true);

  useEffect(() => {
    if (isOpen) {
      const style = document.createElement("style");
      style.id = "print-style";
      style.innerHTML = `
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 14mm 12mm 14mm;
          }

          /* Reset html & body to allow natural multi-page pagination */
          html, body {
            width: 100% !important;
            height: auto !important;
            min-height: 100% !important;
            overflow: visible !important;
            position: static !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Hide everything in the body except the dedicated print portal */
          body > :not(#print-portal-root) {
            display: none !important;
          }

          /* Dedicated print portal root must be static and unconstrained */
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

          /* Override fixed position, inset-0, and overflow-y-auto on the modal wrapper */
          .print-soal-modal-wrapper {
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

          /* Printable document container */
          .print-soal-content {
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
            font-size: 10pt !important;
            line-height: 1.45 !important;
          }

          /* Compact Paragraphs inside questions */
          .print-soal-content p {
            margin-top: 0 !important;
            margin-bottom: 4px !important;
          }
          .print-soal-content p:last-child {
            margin-bottom: 0 !important;
          }

          .print-soal-header {
            break-after: avoid !important;
            page-break-after: avoid !important;
            margin-bottom: 16px !important;
            padding-bottom: 8px !important;
          }

          /* Prevent individual question cards from breaking awkwardly across pages */
          .print-question-card {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            -webkit-column-break-inside: avoid !important;
            margin-bottom: 14px !important;
            padding-bottom: 4px !important;
            display: block !important;
            position: static !important;
            width: 100% !important;
          }

          /* KaTeX print protection - prevent square root lines and formulas from stretching across page */
          .katex {
            font-size: 1em !important;
            text-rendering: auto !important;
          }
          .katex-display {
            margin: 0.35em 0 !important;
            text-align: center !important;
          }
          .katex-display > .katex {
            display: inline-block !important;
          }
          .katex .hide-tail {
            overflow: hidden !important;
          }
          .katex .sqrt .sqrt-sign {
            overflow: hidden !important;
          }
          .katex .sqrt > .vlist-t {
            display: inline-table !important;
          }
          .katex .frac-line {
            border-bottom-style: solid !important;
          }

          /* Chart and SVG overflow clipping to prevent stray lines bleeding to other pages */
          svg {
            max-width: 100% !important;
            overflow: hidden !important;
          }
          .recharts-wrapper, .recharts-surface {
            overflow: hidden !important;
          }

          /* Compact Chart Container for Print */
          .print-chart-container, .print-chart-container > div {
            max-height: 200px !important;
            min-height: auto !important;
            height: auto !important;
            padding: 4px !important;
            margin: 4px auto !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 6px !important;
            overflow: hidden !important;
            background: #ffffff !important;
            box-shadow: none !important;
          }
          .print-chart-container svg {
            max-height: 180px !important;
            overflow: hidden !important;
          }
          .print-chart-container h3 {
            font-size: 10pt !important;
            margin-bottom: 2px !important;
          }

          /* Compact Tables */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: auto;
          }
          tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          th, td {
            padding: 3px 6px !important;
          }

          /* Images */
          img {
            max-width: 100% !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .no-print {
            display: none !important;
          }

          .page-break {
            break-before: page !important;
            page-break-before: always !important;
          }
        }
      `;
      document.head.appendChild(style);

      return () => {
        const existingStyle = document.getElementById("print-style");
        if (existingStyle) existingStyle.remove();
        const existingRoot = document.getElementById("print-portal-root");
        if (existingRoot && existingRoot.parentNode) {
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

  const renderFormattedHtml = (rawHtml: string) => {
    if (!rawHtml) return "";
    const sanitized = sanitizeHtml(rawHtml);
    return renderMathInHtml(sanitized);
  };

  const shouldRenderTwoColumns = (options?: string[]): boolean => {
    if (!options || options.length <= 1) return false;
    return options.every((opt) => {
      if (!opt) return true;
      const plain = opt.replace(/<[^>]*>/g, "").trim();
      return plain.length <= 32;
    });
  };

  const currentYear = new Date().getFullYear();

  return createPortal(
    <div className="print-soal-modal-wrapper fixed inset-0 bg-white z-[9999] overflow-y-auto">
      {/* Screen Toolbar */}
      <div className="no-print sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex flex-wrap justify-between items-center shadow-sm z-10 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <PrinterIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-white">
              Pratinjau Cetak Naskah Soal
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {exam.config.subject || "Ujian"} • {exam.questions.length} Butir Soal • Format Cetak Hemat Kertas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsTwoColOptions(!isTwoColOptions)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              isTwoColOptions
                ? "bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-700"
                : "bg-white text-slate-600 border-slate-300 dark:bg-slate-700 dark:text-slate-300"
            }`}
            title="Opsi jawaban pendek disusun 2 kolom untuk menghemat kertas"
          >
            {isTwoColOptions ? "✓ Opsi 2 Kolom (Hemat Kertas)" : "Opsi 1 Kolom"}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
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
        className="print-soal-content max-w-4xl mx-auto bg-white p-6 sm:p-10 text-black"
        ref={printContainerRef}
      >
        {/* Official Indonesian School Exam Header (Kop Soal Standar) */}
        <div className="print-soal-header mb-5 border-b-2 border-black pb-3">
          <div className="flex items-center justify-between border-b border-black pb-2 mb-2">
            <div className="text-left">
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-black leading-tight">
                {exam.authorSchool || "UJIAN SEKOLAH / ASESMEN AKADEMIK"}
              </h2>
              <p className="text-[11px] font-semibold text-slate-700">
                TAHUN PELAJARAN {currentYear}/{currentYear + 1}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-2.5 py-0.5 border border-black font-bold text-[11px] uppercase tracking-wider">
                NASKAH SOAL
              </span>
            </div>
          </div>

          <h1 className="text-base font-black uppercase tracking-wider text-black text-center my-1.5">
            {exam.config.examType || "PENILAIAN AKHIR SEMESTER"} - {exam.config.subject || ""}
          </h1>

          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-left text-xs font-medium border-t border-slate-300 pt-2 mt-2">
            <div>
              <span className="font-bold">Mata Pelajaran:</span> {exam.config.subject || "-"}
            </div>
            <div>
              <span className="font-bold">Alokasi Waktu:</span> {exam.config.timeLimit ? `${exam.config.timeLimit} Menit` : "Sesuai Jadwal"}
            </div>
            <div>
              <span className="font-bold">Kelas / Jenjang:</span> {exam.config.classLevel || "-"}
            </div>
            <div>
              <span className="font-bold">Jumlah Soal:</span> {exam.questions.length} Butir ({exam.code})
            </div>
          </div>
        </div>

        {/* General Instruction */}
        <div className="mb-4 p-2 bg-slate-50 border border-slate-300 rounded text-[11px] leading-tight text-slate-800">
          <span className="font-bold">PETUNJUK UMUM:</span> Periksa dan bacalah lembar soal dengan teliti sebelum menjawab. Laporkan kepada pengawas jika terdapat butir soal yang kurang jelas atau tidak lengkap.
        </div>

        {/* Questions List */}
        <div className="space-y-4">
          {(exam.questions || []).map((q, idx) => (
            <div key={q.id} className="print-question-card break-inside-avoid">
              <div className="flex gap-2.5 items-start">
                <span className="font-bold w-6 text-right shrink-0 select-none text-xs sm:text-sm pt-0.5">
                  {idx + 1}.
                </span>
                <div className="flex-1 text-xs sm:text-sm text-black leading-relaxed">
                  {/* Question Stem / Stimulus */}
                  <div 
                    className="text-black font-normal"
                    dangerouslySetInnerHTML={{ __html: renderFormattedHtml(q.questionText) }}
                  />

                  {/* Chart Visual Stimulus (Compact Print Height) */}
                  {q.chartData && (
                    <div className="print-chart-container my-2 max-w-md mx-auto flex justify-center">
                      <ChartRenderer data={q.chartData} />
                    </div>
                  )}

                  {/* Image Stimulus */}
                  {q.imageUrl && q.imageUrl.trim() !== "" && (
                    <div className="my-2 max-w-sm">
                      <img 
                        src={q.imageUrl} 
                        alt="Gambar Soal" 
                        className="max-w-full max-h-48 object-contain rounded border border-slate-200" 
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = "none";
                        }}
                      />
                    </div>
                  )}

                  {/* Audio Stimulus Note */}
                  {q.audioUrl && (
                    <div className="my-2 p-2 bg-slate-50 rounded text-xs text-slate-700 border border-slate-300 inline-flex items-center gap-2">
                      <span className="font-bold">[Audio Soal]:</span>
                      <span className="text-slate-500 break-all">{q.audioUrl}</span>
                    </div>
                  )}

                  {/* Multiple Choice Options */}
                  {q.questionType === "MULTIPLE_CHOICE" && q.options && (
                    <div
                      className={
                        isTwoColOptions && shouldRenderTwoColumns(q.options)
                          ? "grid grid-cols-2 gap-x-6 gap-y-1 mt-1.5 pl-6"
                          : "space-y-1 mt-1.5 pl-6"
                      }
                    >
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex gap-2 items-start text-xs sm:text-[13px]">
                          <span className="font-bold shrink-0 text-black">
                            {String.fromCharCode(65 + oIdx)}.
                          </span>
                          <div className="flex-1 text-black font-normal">
                            <div 
                              dangerouslySetInnerHTML={{ __html: renderFormattedHtml(opt) }}
                            />
                            {q.optionImages?.[oIdx] && (
                              <img 
                                src={q.optionImages[oIdx]!} 
                                alt={`Opsi ${String.fromCharCode(65 + oIdx)}`} 
                                className="max-w-[100px] max-h-[100px] object-contain mt-1 rounded border border-slate-200" 
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = "none";
                                }}
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Complex Multiple Choice Options */}
                  {q.questionType === "COMPLEX_MULTIPLE_CHOICE" && q.options && (
                    <div className="space-y-1.5 mt-2 pl-6">
                      <p className="text-[11px] italic text-slate-600 mb-1">
                        *(Pilihlah semua pernyataan yang benar - Jawaban lebih dari satu)*
                      </p>
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex gap-2 items-start text-xs sm:text-[13px]">
                          <div className="w-3.5 h-3.5 border border-black rounded-sm shrink-0 mt-0.5"></div>
                          <div className="flex-1 text-black font-normal">
                            <div 
                              dangerouslySetInnerHTML={{ __html: renderFormattedHtml(opt) }}
                            />
                            {q.optionImages?.[oIdx] && (
                              <img 
                                src={q.optionImages[oIdx]!} 
                                alt="Opsi" 
                                className="max-w-[100px] max-h-[100px] object-contain mt-1 rounded border border-slate-200" 
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = "none";
                                }}
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Fill In The Blank */}
                  {q.questionType === "FILL_IN_THE_BLANK" && (
                    <div className="mt-2 text-xs italic text-slate-700">
                      Jawaban: ..........................................................................................................................................
                    </div>
                  )}

                  {/* Essay */}
                  {q.questionType === "ESSAY" && (
                    <div className="mt-2 space-y-3">
                      <div className="border-b border-black border-dashed"></div>
                      <div className="border-b border-black border-dashed"></div>
                      <div className="border-b border-black border-dashed"></div>
                    </div>
                  )}

                  {/* True / False Table */}
                  {q.questionType === "TRUE_FALSE" && q.trueFalseRows && (
                    <div className="mt-2 pl-6">
                      <table className="w-full border-collapse border border-black text-xs">
                        <thead>
                          <tr className="bg-slate-100">
                            <th className="border border-black px-3 py-1.5 text-left font-bold w-full">Pernyataan</th>
                            <th className="border border-black px-2 py-1.5 w-16 text-center font-bold">Benar</th>
                            <th className="border border-black px-2 py-1.5 w-16 text-center font-bold">Salah</th>
                          </tr>
                        </thead>
                        <tbody>
                          {q.trueFalseRows.map((row, rIdx) => (
                            <tr key={rIdx}>
                              <td 
                                className="border border-black px-3 py-1.5" 
                                dangerouslySetInnerHTML={{ __html: renderFormattedHtml(row.text) }}
                              />
                              <td className="border border-black px-2 py-1.5 text-center">
                                <div className="w-3.5 h-3.5 border border-black rounded-full mx-auto"></div>
                              </td>
                              <td className="border border-black px-2 py-1.5 text-center">
                                <div className="w-3.5 h-3.5 border border-black rounded-full mx-auto"></div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Matching Pairs */}
                  {q.questionType === "MATCHING" && q.matchingPairs && (
                    <div className="mt-2 pl-6">
                      <table className="w-full border-collapse border border-black text-xs">
                        <thead>
                          <tr className="bg-slate-100">
                            <th className="border border-black px-3 py-1.5 text-left font-bold w-1/2">Pernyataan / Soal</th>
                            <th className="border border-black px-3 py-1.5 text-left font-bold w-1/2">Pasangan Jawaban</th>
                          </tr>
                        </thead>
                        <tbody>
                          {q.matchingPairs.map((pair, pIdx) => (
                            <tr key={pIdx}>
                              <td className="border border-black px-3 py-1.5">
                                <span className="font-bold mr-1">({pIdx + 1})</span>
                                <span dangerouslySetInnerHTML={{ __html: renderFormattedHtml(pair.left) }} />
                              </td>
                              <td className="border border-black px-3 py-1.5">
                                <span className="font-bold mr-1">({String.fromCharCode(65 + pIdx)})</span>
                                <span dangerouslySetInnerHTML={{ __html: renderFormattedHtml(pair.right) }} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    portalRoot,
  );
};
