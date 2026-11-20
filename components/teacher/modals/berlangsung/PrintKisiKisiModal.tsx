import React, { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Exam, Question, TeacherProfile } from "../../../../types";
import { XMarkIcon, PrinterIcon, TableCellsIcon } from "../../../Icons";
import { sanitizeHtml } from "../../examUtils";
import { renderMathInHtml } from "../../../../utils/mathRenderer";
import { FormalPrintDocHeader } from "../../FormalPrintDocHeader";
import { storageService } from "../../../../services/storage";

interface PrintKisiKisiModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam | null;
  teacherProfile?: TeacherProfile;
}

export const PrintKisiKisiModal: React.FC<PrintKisiKisiModalProps> = ({
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

          /* Uniform School Letterhead Print Styling (Calibrated to match Screen Preview) */
          .school-letterhead-root {
            width: 100% !important;
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

          .print-kisi-kisi-header {
            break-after: avoid !important;
            page-break-after: avoid !important;
            margin-bottom: 10px !important;
            padding-bottom: 4px !important;
          }

          .print-kisi-kisi-content .table-responsive-wrapper {
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            overflow: visible !important;
            margin: 4pt 0 !important;
            padding: 0 !important;
            max-width: 100% !important;
          }
          .print-kisi-kisi-content .kisi-table-scroll {
            overflow: visible !important;
            max-width: 100% !important;
          }

          .print-kisi-kisi-content table {
            width: 100% !important;
            max-width: 100% !important;
            border-collapse: collapse !important;
            border: 1px solid #000000 !important;
          }

          .print-kisi-kisi-content th,
          .print-kisi-kisi-content td {
            border: 1px solid #000000 !important;
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
            font-size: 8.5pt !important;
            color: #000000 !important;
          }

          .kisi-indicator-cell,
          .kisi-indicator-cell * {
            font-size: 8.5pt !important;
            line-height: 1.35 !important;
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

          .print-signature-line {
            border-bottom: 1.5px solid #000000 !important;
            width: 210px !important;
            margin: 0 auto 6px auto !important;
            height: 20px !important;
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

        /* Screen Preview Rules for Print Kisi-Kisi Modal Container */
        .school-letterhead-root img,
        .school-letterhead-logo {
          max-width: 62px !important;
          max-height: 60px !important;
          width: auto !important;
          height: auto !important;
          object-fit: contain !important;
          margin: 0 auto !important;
        }
        .print-kisi-kisi-content .table-responsive-wrapper {
          border: none !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          margin: 0.4rem 0 !important;
          padding: 0 !important;
          overflow-x: auto !important;
          max-width: 100% !important;
        }
        .print-kisi-kisi-content table {
          width: 100% !important;
          max-width: 100% !important;
          border-collapse: collapse !important;
          border: 1px solid #000000 !important;
        }
        .print-kisi-kisi-content th,
        .print-kisi-kisi-content td {
          border: 1px solid #000000 !important;
        }

        /* Smartphone Screen Preview Only (never affects @media print / A4 output) */
        @media screen and (max-width: 639px) {
          .print-kisi-kisi-modal-wrapper {
            overflow-x: hidden !important;
          }
          .print-kisi-kisi-content {
            width: 100% !important;
            max-width: 100% !important;
            overflow-x: hidden !important;
            box-sizing: border-box !important;
          }
          .print-kisi-kisi-content .school-letterhead-root .flex {
            gap: 6px !important;
          }
          .print-kisi-kisi-content .school-letterhead-root .school-letterhead-logo-container {
            width: 40px !important;
            height: 40px !important;
            max-width: 40px !important;
            max-height: 40px !important;
          }
          .print-kisi-kisi-content .school-letterhead-root img.school-letterhead-logo,
          .print-kisi-kisi-content .school-letterhead-root .school-letterhead-logo {
            max-width: 38px !important;
            max-height: 38px !important;
          }
          .print-kisi-kisi-content .school-letterhead-root .kop-aksara-pemda,
          .print-kisi-kisi-content .school-letterhead-root .kop-aksara-dinas {
            font-size: 8.5px !important;
            line-height: 1.2 !important;
          }
          .print-kisi-kisi-content .school-letterhead-root .kop-text-pemda,
          .print-kisi-kisi-content .school-letterhead-root .kop-text-dinas {
            font-size: 9px !important;
            line-height: 1.2 !important;
          }
          .print-kisi-kisi-content .school-letterhead-root .kop-aksara-sekolah {
            font-size: 9.5px !important;
            line-height: 1.2 !important;
          }
          .print-kisi-kisi-content .school-letterhead-root .kop-text-sekolah {
            font-size: 10.5px !important;
            line-height: 1.2 !important;
          }
          .print-kisi-kisi-content .school-letterhead-root .kop-aksara-alamat,
          .print-kisi-kisi-content .school-letterhead-root .kop-text-alamat,
          .print-kisi-kisi-content .school-letterhead-root .kop-text-kontak {
            font-size: 8px !important;
            line-height: 1.2 !important;
          }
          .print-kisi-kisi-content .formal-id-block {
            max-width: 100% !important;
            font-size: 10.5px !important;
          }
          .print-kisi-kisi-content .formal-id-row {
            grid-template-columns: 110px 10px 1fr !important;
          }
          .print-kisi-kisi-content .kisi-table-scroll,
          .print-kisi-kisi-content .table-responsive-wrapper {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            overflow-x: auto !important;
            overflow-y: hidden !important;
            -webkit-overflow-scrolling: touch !important;
          }
          .print-kisi-kisi-content table.kisi-table {
            min-width: 540px !important;
            width: 100% !important;
            max-width: none !important;
            font-size: 10.5px !important;
            line-height: 1.35 !important;
          }
          .print-kisi-kisi-content table.kisi-table th,
          .print-kisi-kisi-content table.kisi-table td {
            padding: 4px 5px !important;
            font-size: 10.5px !important;
          }
          .print-kisi-kisi-content .kisi-indicator-cell,
          .print-kisi-kisi-content .kisi-indicator-cell * {
            font-size: 10.5px !important;
            line-height: 1.35 !important;
          }
          .print-kisi-kisi-content .katex-display {
            max-width: 100% !important;
            overflow-x: auto !important;
            overflow-y: hidden !important;
            padding-bottom: 2px !important;
          }
        }
      `;
      document.head.appendChild(style);

      return () => {
        const existingStyle = document.getElementById(styleId);
        if (existingStyle) existingStyle.remove();
        const existingRoot = document.getElementById("print-portal-root");
        if (existingRoot && existingRoot.parentNode && existingRoot.childElementCount === 0) {
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
    <div className="print-kisi-kisi-modal-wrapper fixed inset-0 bg-white z-[9999] overflow-y-auto overflow-x-hidden print:static print:overflow-visible">
      {/* Screen Toolbar */}
      <div className="no-print sticky top-0 w-full max-w-full bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-3 py-2 sm:px-4 sm:py-3 flex flex-col sm:flex-row sm:justify-between sm:items-center shadow-sm z-20 gap-2 sm:gap-3">
        {/* Row 1 (Mobile): Title + Metadata + Close Button */}
        <div className="flex items-center justify-between gap-2 min-w-0 sm:flex-1">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="p-1.5 sm:p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg sm:rounded-xl shrink-0">
              <TableCellsIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white truncate">
                Pratinjau Kisi-Kisi Soal
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate tabular-nums">
                <span className="sm:hidden">
                  {exam.config?.subject || "Ujian"} · {actualQuestionsCount} Soal · Bobot {totalScoreWeight}
                </span>
                <span className="hidden sm:inline">
                  {exam.config?.subject || "Ujian"} • {actualQuestionsCount} Butir Soal • Total Bobot: {totalScoreWeight}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="sm:hidden shrink-0 min-h-[40px] min-w-[40px] inline-flex items-center justify-center border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
            title="Tutup Pratinjau"
            aria-label="Tutup Pratinjau"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Row 2 (Mobile) / Right Controls (Tablet & Desktop) */}
        <div className="flex items-center justify-between sm:justify-end gap-2 min-w-0 shrink-0">
          {/* Tombol Pengalihan Tampilan Kop: Default vs Kop Sekolah */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-700/60 p-0.5 rounded-lg border border-slate-200 dark:border-slate-600 shrink-0">
            <button
              type="button"
              onClick={() => setHeaderMode("default")}
              className={`min-h-[36px] sm:min-h-0 px-2.5 sm:px-3 py-1.5 rounded-md text-[11px] sm:text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
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
              className={`min-h-[36px] sm:min-h-0 px-2.5 sm:px-3 py-1.5 rounded-md text-[11px] sm:text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                headerMode === "kop"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Tampilkan Kop Resmi Sekolah (Dwibahasa Aksara Bali / Latin)"
            >
              <span className="sm:hidden">Kop</span>
              <span className="hidden sm:inline">Kop Sekolah</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="shrink-0 min-h-[38px] sm:min-h-0 inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] sm:text-xs font-bold whitespace-nowrap transition-colors shadow-sm cursor-pointer"
            title="Cetak dokumen atau simpan sebagai file PDF"
          >
            <PrinterIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="sm:hidden">Cetak PDF</span>
            <span className="hidden sm:inline">Cetak (PDF)</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="hidden sm:inline-flex p-1.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
            title="Tutup Pratinjau"
            aria-label="Tutup Pratinjau"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Printable Sheet (Calibrated A4 Width 794px with 14mm padding) */}
      <div
        className="print-kisi-kisi-content w-full max-w-[794px] mx-auto bg-white px-3 py-4 sm:px-[14mm] sm:py-[12mm] print:px-0 print:py-0 text-black box-border"
        ref={printContainerRef}
      >
        {/* Render Kop Sekolah Resmi jika mode "kop", atau Kop Dokumen Standar jika mode "default" */}
        {headerMode === "kop" ? (
          <div className="print-kisi-kisi-header mb-4 sm:mb-5 print:mb-5 pb-2 min-w-0 max-w-full">
            <FormalPrintDocHeader
              profile={profile}
              examType={exam.config?.examType}
              documentTitle="KISI-KISI PENULISAN SOAL"
              identityFields={[
                { label: "MATA PELAJARAN", value: exam.config?.subject || "-" },
                {
                  label: "KELAS / JENJANG",
                  value:
                    exam.config?.classLevel ||
                    (exam.config as any)?.grade ||
                    (exam.config as any)?.class ||
                    "-",
                },
                { label: "HARI, TANGGAL", value: "" },
                { label: "WAKTU", value: "" },
                { label: "JUMLAH SOAL", value: `${actualQuestionsCount} Butir Soal` },
                {
                  label: "PENYUSUN",
                  value: exam.authorName || (exam as any).author || profile?.fullName || "-",
                },
              ]}
            />
          </div>
        ) : (
          /* Official Indonesian School Exam Header (Kop Dokumen Resmi) */
          <div className="print-kisi-kisi-header mb-4 sm:mb-5 print:mb-5 border-b-2 border-black pb-2.5 sm:pb-3 print:pb-3">
            <div className="flex items-center justify-between gap-2 border-b border-black pb-2 mb-2">
              <div className="text-left min-w-0 flex-1">
                <h2 className="text-xs sm:text-sm print:text-sm font-extrabold uppercase tracking-wide text-black leading-tight break-words">
                  {exam.authorSchool || profile?.school || "ASESMEN AKADEMIK / UJIAN SEKOLAH"}
                </h2>
                <p className="text-[10px] sm:text-[11px] print:text-[11px] font-semibold text-slate-700">
                  TAHUN PELAJARAN {currentYear}/{currentYear + 1}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="inline-block px-2 sm:px-2.5 print:px-2.5 py-0.5 border border-black font-bold text-[10px] sm:text-[11px] print:text-[11px] uppercase tracking-wider whitespace-nowrap">
                  KISI-KISI ASESMEN
                </span>
              </div>
            </div>

            <h1 className="text-sm sm:text-base print:text-base font-black uppercase tracking-wider text-black text-center my-1.5 break-words">
              KISI-KISI PENULISAN SOAL ASESMEN {exam.config?.examType ? `- ${exam.config.examType}` : ""}
            </h1>

            <div className="grid grid-cols-2 gap-x-3 sm:gap-x-6 print:gap-x-6 gap-y-1 text-left text-[10.5px] sm:text-xs print:text-xs font-medium border-t border-slate-300 pt-2 mt-2">
              <div className="min-w-0 break-words">
                <span className="font-bold">Mata Pelajaran:</span> {exam.config?.subject || "-"}
              </div>
              <div className="min-w-0 break-words">
                <span className="font-bold">Kelas / Tingkat:</span> {exam.config?.grade || exam.config?.class || "-"}
              </div>
              <div className="min-w-0 break-words">
                <span className="font-bold">Alokasi Waktu:</span> {exam.config?.durationMinutes || 90} Menit
              </div>
              <div className="min-w-0 break-words">
                <span className="font-bold">Jumlah Soal:</span> {actualQuestionsCount} Butir
              </div>
              <div className="min-w-0 break-words">
                <span className="font-bold">Guru Pengampu:</span> {exam.author || profile?.fullName || "-"}
              </div>
              <div className="min-w-0 break-words">
                <span className="font-bold">Total Bobot Skor:</span> {totalScoreWeight}
              </div>
            </div>
          </div>
        )}

        {/* 6-Column Standard Kisi-Kisi Table */}
        <div className="kisi-table-scroll overflow-x-auto print:overflow-visible my-3 max-w-full">
          <table className="kisi-table w-full border-collapse border border-black text-xs text-left">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-black p-2 w-10 sm:w-12 print:w-12 text-center font-bold text-black">
                  No
                </th>
                <th className="border border-black p-2 w-24 sm:w-28 print:w-28 text-center font-bold text-black">
                  Tipe Soal
                </th>
                <th className="border border-black p-2 w-14 sm:w-16 print:w-16 text-center font-bold text-black">
                  Level
                </th>
                <th className="border border-black p-2 w-28 sm:w-32 print:w-32 font-bold text-black">
                  Materi
                </th>
                <th className="border border-black p-2 font-bold text-black">
                  Indikator Soal
                </th>
                <th className="border border-black p-2 w-14 sm:w-16 print:w-16 text-center font-bold text-black">
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
                      <td className="border border-black p-2 text-black font-medium text-[11px]">
                        {itemCategory}
                      </td>
                      <td className="border border-black p-2 text-black align-top">
                        <div
                          className="kisi-indicator-cell text-[11px] text-left leading-snug text-black break-words [&_p]:my-0.5 [&_p]:leading-snug [&_p]:text-[11px] [&_em]:italic [&_strong]:font-semibold [&_ul]:my-1 [&_ul]:pl-4 [&_ol]:my-1 [&_ol]:pl-4"
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
          <div className="mt-4 p-2.5 sm:p-3 print:p-3 border border-black bg-slate-50/50 print:bg-white rounded-sm text-[11px] sm:text-xs print:text-xs">
            <div className="font-bold uppercase tracking-wider mb-2 border-b border-black pb-1">
              Rekapitulasi Bentuk & Tingkat Kognitif:
            </div>
            <div className="space-y-2">
              <div className="leading-relaxed">
                <span className="font-bold text-black">Distribusi Bentuk Soal: </span>
                <span className="text-black">
                  {Object.entries(typeCounts)
                    .map(([type, count]) => `${type}: ${count}`)
                    .join(" • ")}
                </span>
              </div>
              <div className="leading-relaxed">
                <span className="font-bold text-black">Distribusi Level: </span>
                <span className="text-black">
                  {Object.entries(levelCounts)
                    .map(([lvl, count]) => `${lvl}: ${count}`)
                    .join(" • ")}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Official Approval / Signature Block (Kolom Pengesahan) */}
        <div className="print-signature-section mt-6 sm:mt-8 print:mt-8 pt-4 flex justify-between items-start gap-3 text-[11px] sm:text-xs print:text-xs text-black">
          <div className="text-center w-64 max-w-[48%] sm:max-w-[45%] print:max-w-[45%]">
            <p className="mb-1">Mengetahui,</p>
            <p className="mb-10 sm:mb-14 print:mb-14 font-semibold">Kepala Sekolah</p>
            <p className="font-bold underline text-[11px] sm:text-sm print:text-sm text-black truncate mb-1">
              {teacherProfile?.headmasterName || "...................................................."}
            </p>
            <p className="text-[10px] sm:text-[11px] print:text-[11px] text-black truncate">
              {teacherProfile?.headmasterNipType || "NIP"}. {teacherProfile?.headmasterNip || "....................................."}
            </p>
          </div>

          <div className="text-center w-64 max-w-[48%] sm:max-w-[45%] print:max-w-[45%] overflow-hidden">
            <p className="mb-1 text-[10px] sm:text-[11px] print:text-[11px] text-black truncate select-none">
              {teacherProfile?.regency ? `${teacherProfile.regency}, ` : "........................, "}
              {new Date().toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
            <p className="mb-10 sm:mb-14 print:mb-14 font-semibold">Guru Pengampu / Penyusun</p>
            <p className="font-bold underline text-[11px] sm:text-sm print:text-sm text-black truncate mb-1">
              {teacherProfile?.fullName || exam?.authorName || "...................................................."}
            </p>
            <p className="text-[10px] sm:text-[11px] print:text-[11px] text-black truncate">
              {teacherProfile?.nipType || "NIP"}. {teacherProfile?.nip || "....................................."}
            </p>
          </div>
        </div>
      </div>
    </div>,
    portalRoot,
  );
};
