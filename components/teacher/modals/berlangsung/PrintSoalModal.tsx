import React, { useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Exam } from "../../../../types";
import { XMarkIcon } from "../../../Icons";
import { sanitizeHtml } from "../../examUtils";
import { ChartRenderer } from "../../../ChartRenderer";

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

  useEffect(() => {
    if (isOpen) {
      const style = document.createElement("style");
      style.id = "print-style";
      style.innerHTML = `
        @media print {
          @page {
            size: A4 portrait;
            margin: 15mm 15mm 15mm 15mm;
          }

          /* Reset html & body to allow natural multi-page pagination */
          html, body {
            width: 100% !important;
            height: auto !important;
            min-height: 100% !important;
            overflow: visible !important;
            overflow-x: visible !important;
            overflow-y: visible !important;
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
            overflow-x: visible !important;
            overflow-y: visible !important;
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
          }

          .print-soal-content * {
            overflow: visible !important;
            color-scheme: light !important;
          }

          .print-soal-header {
            break-after: avoid !important;
            page-break-after: avoid !important;
            margin-bottom: 24px !important;
            padding-bottom: 12px !important;
            border-bottom: 2px solid #000000 !important;
            text-align: center !important;
          }

          /* Prevent individual question cards from breaking awkwardly across pages */
          .print-question-card {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            -webkit-column-break-inside: avoid !important;
            margin-bottom: 24px !important;
            padding-bottom: 8px !important;
            display: block !important;
            position: static !important;
            width: 100% !important;
          }

          img, svg {
            max-width: 100% !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: auto;
          }

          tr {
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

  return createPortal(
    <div className="print-soal-modal-wrapper fixed inset-0 bg-white z-[9999] overflow-y-auto">
      <div className="no-print sticky top-0 bg-white border-b border-slate-200 p-4 flex justify-between items-center shadow-sm z-10">
        <h2 className="text-lg font-bold text-slate-800">Pratinjau Cetak Soal</h2>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Cetak (PDF)
          </button>
          <button
            onClick={onClose}
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>
      <div
        className="print-soal-content max-w-4xl mx-auto bg-white p-8 sm:p-12 text-black"
        ref={printContainerRef}
      >
        <div className="print-soal-header text-center mb-8 border-b-2 border-black pb-4">
          <h1 className="text-2xl font-black uppercase mb-2">
            {exam.config.examType || "Ujian"} - {exam.config.subject || ""}
          </h1>
          <p className="text-sm font-medium">
            Mata Pelajaran: {exam.config.subject || "-"} | Kelas: {exam.config.classLevel || "-"}
          </p>
          {exam.config.timeLimit > 0 && (
            <p className="text-sm font-medium">
              Waktu: {exam.config.timeLimit} Menit
            </p>
          )}
        </div>
        <div className="space-y-8">
          {(exam.questions || []).map((q, idx) => (
            <div key={q.id} className="print-question-card break-inside-avoid">
              <div className="flex gap-4">
                <span className="font-bold">{idx + 1}.</span>
                <div className="flex-1">
                  <div 
                    className="prose prose-sm max-w-none text-black mb-4"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(q.questionText) }}
                  />
                  {q.chartData && (
                    <div className="my-4 max-w-lg">
                      <ChartRenderer data={q.chartData} />
                    </div>
                  )}
                  {q.imageUrl && (
                    <div className="mb-4">
                      <img src={q.imageUrl} alt="Gambar Soal" className="max-w-md max-h-64 object-contain" />
                    </div>
                  )}
                  {q.audioUrl && (
                    <div className="mb-4 p-3 bg-slate-100 rounded-lg inline-flex items-center gap-2 border border-slate-200">
                      <span className="text-sm font-bold">[Audio terlampir]</span>
                      <span className="text-xs text-slate-500 break-all">{q.audioUrl}</span>
                    </div>
                  )}
                  {q.questionType === "MULTIPLE_CHOICE" && q.options && (
                    <div className="space-y-2 mt-4 pl-4">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex gap-2">
                          <span className="font-bold">
                            {String.fromCharCode(65 + oIdx)}.
                          </span>
                          <div className="flex-1">
                            <div 
                              className="prose prose-sm text-black"
                              dangerouslySetInnerHTML={{ __html: sanitizeHtml(opt) }}
                            />
                            {q.optionImages?.[oIdx] && (
                              <img src={q.optionImages[oIdx]!} alt={`Opsi ${String.fromCharCode(65 + oIdx)}`} className="max-w-[120px] max-h-[120px] object-contain mt-1" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {q.questionType === "COMPLEX_MULTIPLE_CHOICE" && q.options && (
                    <div className="space-y-2 mt-4 pl-4">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex gap-2 items-start">
                          <div className="w-4 h-4 border border-black rounded-sm shrink-0 mt-1"></div>
                          <div className="flex-1">
                            <div 
                              className="prose prose-sm text-black"
                              dangerouslySetInnerHTML={{ __html: sanitizeHtml(opt) }}
                            />
                            {q.optionImages?.[oIdx] && (
                              <img src={q.optionImages[oIdx]!} alt="Opsi" className="max-w-[120px] max-h-[120px] object-contain mt-1" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {q.questionType === "FILL_IN_THE_BLANK" && (
                    <div className="mt-4 pt-4 border-b border-black w-64 border-dashed"></div>
                  )}
                  {q.questionType === "ESSAY" && (
                    <div className="mt-4 space-y-4">
                      <div className="border-b border-black border-dashed"></div>
                      <div className="border-b border-black border-dashed"></div>
                      <div className="border-b border-black border-dashed"></div>
                    </div>
                  )}
                  {q.questionType === "TRUE_FALSE" && q.trueFalseRows && (
                    <div className="mt-4">
                      <table className="w-full border-collapse border border-black text-sm">
                        <thead>
                          <tr>
                            <th className="border border-black p-2 text-left">Pernyataan</th>
                            <th className="border border-black p-2 w-20 text-center">Benar</th>
                            <th className="border border-black p-2 w-20 text-center">Salah</th>
                          </tr>
                        </thead>
                        <tbody>
                          {q.trueFalseRows.map((row, rIdx) => (
                            <tr key={rIdx}>
                              <td className="border border-black p-2" dangerouslySetInnerHTML={{ __html: sanitizeHtml(row.text) }}></td>
                              <td className="border border-black p-2 text-center"><div className="w-4 h-4 border border-black rounded-full mx-auto inline-block"></div></td>
                              <td className="border border-black p-2 text-center"><div className="w-4 h-4 border border-black rounded-full mx-auto inline-block"></div></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {q.questionType === "MATCHING" && q.matchingPairs && (
                    <div className="mt-4 flex justify-between gap-8 max-w-2xl">
                      <div className="flex-1 space-y-4">
                        {q.matchingPairs.map((pair, pIdx) => (
                          <div key={pIdx} className="flex gap-2 items-center">
                            <div className="w-2 h-2 rounded-full bg-black shrink-0"></div>
                            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(pair.left) }} />
                          </div>
                        ))}
                      </div>
                      <div className="flex-1 space-y-4">
                        {q.matchingPairs.map((pair, pIdx) => (
                          <div key={pIdx} className="flex gap-2 items-center justify-end">
                            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(pair.right) }} className="text-right" />
                            <div className="w-2 h-2 rounded-full bg-black shrink-0"></div>
                          </div>
                        ))}
                      </div>
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
