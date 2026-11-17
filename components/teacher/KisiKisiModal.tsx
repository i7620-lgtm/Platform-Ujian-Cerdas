import React from "react";
import { createPortal } from "react-dom";
import { PrinterIcon, XMarkIcon } from "../Icons";
import { Question, TeacherProfile, NipType } from "../../types";
import { renderMathInHtml } from "../../utils/mathRenderer";
import { FormalPrintDocHeader } from "./FormalPrintDocHeader";

export const KisiKisiModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  questions: Question[];
  subject: string;
  examType?: string;
  classLevel?: string;
  schoolName?: string;
  teacherName?: string;
  teacherProfile?: TeacherProfile;
  teacherNip?: string;
  nipType?: NipType;
  headmasterName?: string;
  headmasterNip?: string;
  headmasterNipType?: NipType;
  regency?: string;
}> = ({
  isOpen,
  onClose,
  questions,
  subject,
  examType,
  classLevel,
  schoolName,
  teacherName,
  teacherProfile,
  teacherNip,
  nipType,
  headmasterName,
  headmasterNip,
  headmasterNipType,
  regency,
}) => {
  const [headerMode, setHeaderMode] = React.useState<"default" | "kop">("default");

  React.useEffect(() => {
    if (isOpen) {
      setHeaderMode("default");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const nonInfoQuestions = questions.filter((q) => q.questionType !== "INFO");

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
                        {q.kisiKisi ? (
                          <div
                            className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed break-words [&_p]:my-0.5 [&_p]:leading-relaxed"
                            dangerouslySetInnerHTML={{
                              __html: renderMathInHtml(q.kisiKisi),
                            }}
                          />
                        ) : (
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
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-wrap justify-between items-center gap-2">
          {/* Tombol Pengalihan Tampilan Kop: Default vs Kop Sekolah */}
          <div className="flex items-center bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setHeaderMode("default")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                headerMode === "default"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
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
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
              title="Tampilkan Kop Resmi Sekolah (Dwibahasa Aksara Bali / Latin)"
            >
              Kop Sekolah
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <PrinterIcon className="w-4 h-4" /> Cetak (PDF)
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>

      {/* Print Document - Visible ONLY on Print */}
      <div className="print-only-document hidden">
        {headerMode === "kop" ? (
          <div className="mb-4">
            <FormalPrintDocHeader
              profile={teacherProfile}
              overrideData={{
                school: schoolName || teacherProfile?.school,
                regency: regency || teacherProfile?.regency,
              }}
              examType={examType}
              documentTitle="KISI-KISI PENULISAN SOAL"
              identityFields={[
                { label: "MATA PELAJARAN", value: subject || "-" },
                { label: "KELAS / JENJANG", value: classLevel || "-" },
                { label: "HARI, TANGGAL", value: "" },
                { label: "WAKTU", value: "" },
                { label: "JUMLAH SOAL", value: `${nonInfoQuestions.length} Butir Soal` },
                {
                  label: "PENYUSUN",
                  value: teacherName || teacherProfile?.fullName || "-",
                },
              ]}
            />
          </div>
        ) : (
          <div className="text-center mb-6 border-b-2 border-black pb-4">
            <h2 className="text-xl font-bold uppercase tracking-wide mb-1">
              {schoolName || teacherProfile?.school || "Sekolah"}
            </h2>
            <p className="text-sm mb-4">
              {teacherName || teacherProfile?.fullName ? `Guru Pengampu: ${teacherName || teacherProfile?.fullName}` : ""}
            </p>
            <h1 className="text-2xl font-bold uppercase underline">
              KISI-KISI SOAL
            </h1>
            <p className="text-lg font-bold mt-2">{subject}</p>
          </div>
        )}

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
                    {q.kisiKisi ? (
                      <div
                        dangerouslySetInnerHTML={{
                          __html: renderMathInHtml(q.kisiKisi),
                        }}
                      />
                    ) : (
                      "-"
                    )}
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

        <div className="mt-8 flex justify-between items-start text-xs text-black">
          <div className="text-center w-64 max-w-[45%]">
            <p className="mb-1">Mengetahui,</p>
            <p className="mb-14 font-semibold">Kepala Sekolah</p>
            <p className="font-bold underline text-xs sm:text-sm text-black truncate mb-1">
              {headmasterName || teacherProfile?.headmasterName || "...................................................."}
            </p>
            <p className="text-[11px] text-black truncate">
              {headmasterNipType || teacherProfile?.headmasterNipType || "NIP"}. {headmasterNip || teacherProfile?.headmasterNip || "....................................."}
            </p>
          </div>

          <div className="text-center w-64 max-w-[45%]">
            <p className="mb-1 text-[11px] text-black truncate select-none">
              {(regency || teacherProfile?.regency) ? `${regency || teacherProfile?.regency}, ` : "........................, "}
              {new Date().toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
            <p className="mb-14 font-semibold">Guru Pengampu / Penyusun</p>
            <p className="font-bold underline text-xs sm:text-sm text-black truncate mb-1">
              {teacherName || teacherProfile?.fullName || "Guru Mata Pelajaran"}
            </p>
            <p className="text-[11px] text-black truncate">
              {nipType || teacherProfile?.nipType || "NIP"}. {teacherNip || teacherProfile?.nip || "....................................."}
            </p>
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

                    /* Ensure tables break correctly with full cell borders */
                    .print-only-document .table-responsive-wrapper {
                        border: none !important;
                        border-radius: 0 !important;
                        box-shadow: none !important;
                        overflow: visible !important;
                        margin: 4pt 0 !important;
                        padding: 0 !important;
                    }
                    table { page-break-inside: auto; width: 100%; border-collapse: collapse; border: 1px solid #000000 !important; }
                    th, td { border: 1px solid #000000 !important; }
                    tr { page-break-inside: avoid; page-break-after: auto; }
                    thead { display: table-header-group; }
                    tfoot { display: table-footer-group; }
                    
                    /* Typography for print */
                    h1, h2, h3, p, td, th {
                        color: black !important;
                    }

                    /* Uniform School Letterhead Print Styling (Calibrated to match Screen Preview) */
                    .school-letterhead-root {
                        width: 100% !important;
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                        margin-bottom: 0 !important;
                    }
                    .school-letterhead-root .school-letterhead-logo-container {
                        width: 46pt !important;
                        height: 46pt !important;
                        max-width: 46pt !important;
                        max-height: 46pt !important;
                        flex-shrink: 0 !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                    }
                    .school-letterhead-root img.school-letterhead-logo,
                    .school-letterhead-root .school-letterhead-logo {
                        max-width: 45pt !important;
                        max-height: 45pt !important;
                        width: auto !important;
                        height: auto !important;
                        object-fit: contain !important;
                        margin: 0 auto !important;
                    }
                    .school-letterhead-root .kop-aksara-pemda,
                    .school-letterhead-root .kop-aksara-dinas {
                        font-size: 8pt !important;
                        line-height: 1.25 !important;
                    }
                    .school-letterhead-root .kop-text-pemda {
                        font-size: 8.5pt !important;
                        font-weight: 800 !important;
                        line-height: 1.25 !important;
                        margin-bottom: 0.5pt !important;
                    }
                    .school-letterhead-root .kop-text-dinas {
                        font-size: 9pt !important;
                        font-weight: 800 !important;
                        line-height: 1.25 !important;
                        margin-bottom: 0.5pt !important;
                    }
                    .school-letterhead-root .kop-aksara-sekolah {
                        font-size: 9.25pt !important;
                        line-height: 1.25 !important;
                    }
                    .school-letterhead-root .kop-text-sekolah {
                        font-size: 10.5pt !important;
                        font-weight: 900 !important;
                        letter-spacing: 0.4px !important;
                        line-height: 1.25 !important;
                        margin-bottom: 1.5pt !important;
                    }
                    .school-letterhead-root .kop-aksara-alamat {
                        font-size: 7.5pt !important;
                        line-height: 1.2 !important;
                    }
                    .school-letterhead-root .kop-text-alamat {
                        font-size: 7.5pt !important;
                        line-height: 1.25 !important;
                        color: #000000 !important;
                    }
                    .school-letterhead-root .kop-text-kontak {
                        font-size: 7pt !important;
                        line-height: 1.2 !important;
                        color: #1e293b !important;
                    }
                    .school-letterhead-root .letterhead-divider-double {
                        border-top: 2pt solid #000000 !important;
                        border-bottom: 0.75pt solid #000000 !important;
                        height: 2.5pt !important;
                        background: transparent !important;
                        box-sizing: content-box !important;
                        margin: 3pt 0 5pt 0 !important;
                        padding: 0 !important;
                    }

                    /* Formal Title & Identity Block in Print */
                    .formal-title-container {
                        margin: 2pt 0 4pt 0 !important;
                    }
                    .formal-title-eval {
                        font-size: 9.75pt !important;
                        font-weight: 800 !important;
                        line-height: 1.3 !important;
                    }
                    .formal-title-year {
                        font-size: 8.5pt !important;
                        font-weight: 700 !important;
                        line-height: 1.3 !important;
                    }
                    .formal-title-doc {
                        font-size: 10.25pt !important;
                        font-weight: 900 !important;
                        line-height: 1.3 !important;
                    }
                    .formal-id-block {
                        font-size: 8.5pt !important;
                        line-height: 1.35 !important;
                        max-width: 440px !important;
                        margin: 3pt auto 6pt auto !important;
                    }
                    .formal-id-row {
                        margin-bottom: 1pt !important;
                    }
                }
            `}</style>
    </div>,
    document.body,
  );
};

