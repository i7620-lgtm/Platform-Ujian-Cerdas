import React from "react";
import { createPortal } from "react-dom";
import { PrinterIcon, XMarkIcon } from "../Icons";
import { Question } from "../../types";

export const KisiKisiModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  questions: Question[];
  subject: string;
  schoolName?: string;
  teacherName?: string;
}> = ({ isOpen, onClose, questions, subject, schoolName, teacherName }) => {
  if (!isOpen) return null;

  const formatType = (type: string) => {
    switch (type) {
      case "MULTIPLE_CHOICE":
        return "Pilihan Ganda";
      case "COMPLEX_MULTIPLE_CHOICE":
        return "PG Kompleks";
      case "TRUE_FALSE":
        return "Benar/Salah";
      case "MATCHING":
        return "Menjodohkan";
      case "ESSAY":
        return "Uraian";
      case "FILL_IN_THE_BLANK":
        return "Isian Singkat";
      case "INFO":
        return "Informasi";
      default:
        return type;
    }
  };

  return createPortal(
    <div className="kisi-kisi-modal-root fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      {/* Screen UI - Hidden on Print */}
      <div className="screen-only-ui bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <div>
            <h3 className="font-bold text-lg text-slate-800 dark:text-white">
              Kisi-Kisi Materi
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {subject}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                  <th className="p-3 font-bold text-slate-600 dark:text-slate-300 w-12 text-center">
                    No
                  </th>
                  <th className="p-3 font-bold text-slate-600 dark:text-slate-300 w-32">
                    Tipe Soal
                  </th>
                  <th className="p-3 font-bold text-slate-600 dark:text-slate-300 w-24">
                    Level
                  </th>
                  <th className="p-3 font-bold text-slate-600 dark:text-slate-300 w-32">
                    Materi
                  </th>
                  <th className="p-3 font-bold text-slate-600 dark:text-slate-300">
                    Indikator Soal (Kisi-Kisi)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {questions
                  .filter((q) => q.questionType !== "INFO")
                  .map((q, i) => (
                    <tr
                      key={q.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="p-3 text-center text-slate-500 dark:text-slate-400 font-mono">
                        {i + 1}
                      </td>
                      <td className="p-3 text-slate-700 dark:text-slate-300 font-medium">
                        {formatType(q.questionType)}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">
                        {q.level || "-"}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">
                        {q.category || "-"}
                      </td>
                      <td className="p-3 text-slate-800 dark:text-slate-200 leading-relaxed">
                        {q.kisiKisi || (
                          <span className="text-slate-400 italic">
                            Tidak ada indikator
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                {questions.filter((q) => q.questionType !== "INFO").length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-8 text-center text-slate-400 italic"
                    >
                      Belum ada soal yang dibuat.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 shadow-sm"
          >
            <PrinterIcon className="w-4 h-4" /> Cetak
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Print Document - Visible ONLY on Print */}
      <div className="print-only-document hidden">
        <div className="text-center mb-6 border-b-2 border-black pb-4">
          <h2 className="text-xl font-bold uppercase tracking-wide mb-1">
            {schoolName || "Sekolah"}
          </h2>
          <p className="text-sm mb-4">
            {teacherName ? `Guru Pengampu: ${teacherName}` : ""}
          </p>
          <h1 className="text-2xl font-bold uppercase underline">
            KISI-KISI SOAL
          </h1>
          <p className="text-lg font-bold mt-2">{subject}</p>
        </div>

        <table className="w-full border-collapse border border-black text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-2 w-12 text-center">No</th>
              <th className="border border-black p-2 w-1/4">
                Kompetensi / Materi
              </th>
              <th className="border border-black p-2">Indikator Soal</th>
              <th className="border border-black p-2 w-24 text-center">
                Level
              </th>
              <th className="border border-black p-2 w-32 text-center">
                Bentuk Soal
              </th>
            </tr>
          </thead>
          <tbody>
            {questions
              .filter((q) => q.questionType !== "INFO")
              .map((q, i) => (
                <tr key={q.id}>
                  <td className="border border-black p-2 text-center">
                    {i + 1}
                  </td>
                  <td className="border border-black p-2">
                    {q.category || "-"}
                  </td>
                  <td className="border border-black p-2">
                    {q.kisiKisi || "-"}
                  </td>
                  <td className="border border-black p-2 text-center">
                    {q.level || "-"}
                  </td>
                  <td className="border border-black p-2 text-center">
                    {formatType(q.questionType)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        <div className="mt-8 flex justify-end">
          <div className="text-center w-64">
            <p className="mb-16">Mengetahui,</p>
            <p className="font-bold underline">
              {teacherName || "Guru Mata Pelajaran"}
            </p>
            <p>NIP. ..............................</p>
          </div>
        </div>
      </div>

      <style>{`
                @media print {
                    @page { 
                        size: portrait; 
                        margin: 1.5cm; 
                    }
                    
                    /* Reset everything */
                    html, body { 
                        height: auto !important; 
                        min-height: 100% !important;
                        overflow: visible !important; 
                        background: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                    }

                    /* Hide all screen UI */
                    body * { 
                        visibility: hidden; 
                    }
                    
                    /* Hide specific containers that might interfere */
                    .screen-only-ui, 
                    .invitation-modal-root,
                    .print-container, 
                    #invitation-card { 
                        display: none !important; 
                    }

                    /* Target the KisiKisiModal wrapper */
                    .kisi-kisi-modal-root {
                        visibility: visible !important;
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: 100% !important;
                        height: auto !important;
                        min-height: 100% !important;
                        overflow: visible !important;
                        background: white !important;
                        z-index: 9999 !important;
                        display: block !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        
                        /* Critical resets for multi-page */
                        bottom: auto !important;
                        right: auto !important;
                        transform: none !important;
                        animation: none !important;
                        opacity: 1 !important;
                    }

                    /* Show only the print document */
                    .print-only-document, 
                    .print-only-document * { 
                        visibility: visible !important; 
                    }

                    .print-only-document {
                        display: block !important;
                        position: relative !important;
                        width: 100%;
                        background: white;
                        color: black;
                        font-family: "Times New Roman", Times, serif;
                        padding: 0;
                        margin: 0;
                    }

                    /* Ensure tables break correctly */
                    table { page-break-inside: auto; width: 100%; border-collapse: collapse; }
                    tr { page-break-inside: avoid; page-break-after: auto; }
                    thead { display: table-header-group; }
                    tfoot { display: table-footer-group; }
                    
                    /* Typography for print */
                    h1, h2, h3, p, td, th {
                        color: black !important;
                    }
                }
            `}</style>
    </div>,
    document.body,
  );
};

