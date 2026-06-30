import React, { useEffect } from "react";
import { TeacherProfile } from "../../types";
import { BookOpenIcon, MagnifyingGlassIcon } from "../Icons";
import { ChartRenderer } from "../ChartRenderer";
import {
  normalizeQuestion,
  isLongQuestion,
  getFormattedAnswerText,
} from "./bookHelpers";
import { useBookGenerator } from "./useBookGenerator";

const renderQuestionTextWithChart = (
  html: string,
  chartData: any,
  className: string = "",
) => {
  if (!chartData) {
    return (
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: html }}
      ></div>
    );
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const chartNode = doc.querySelector('[data-chart="true"]');

  if (!chartNode) {
    return (
      <>
        <div
          className={className}
          dangerouslySetInnerHTML={{ __html: html }}
        ></div>
        <div className="mb-4 w-full max-w-3xl mx-auto">
          <ChartRenderer data={chartData} />
        </div>
      </>
    );
  }

  const marker = "___CHART_MARKER___";
  chartNode.insertAdjacentText("beforebegin", marker);
  chartNode.remove();

  const newHtml = doc.body.innerHTML;
  const parts = newHtml.split(marker);

  return (
    <div className={className}>
      {parts.map((part, index) => (
        <React.Fragment key={index}>
          <div dangerouslySetInnerHTML={{ __html: part }}></div>
          {index < parts.length - 1 && (
            <div className="my-4 w-full max-w-3xl mx-auto">
              <ChartRenderer data={chartData} />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

const PrinterIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.728 9.75h10.544c.905 0 1.637.732 1.637 1.637v4.09c0 .905-.732 1.637-1.637 1.637H6.728a1.637 1.637 0 01-1.637-1.637v-4.09c0-.905-1.637-1.637 1.637-1.637zM6.75 3.75h10.5a.75.75 0 01.75.75v5.25H6v-5.25a.75.75 0 01.75-.75zM16.5 17.25v2.25a.75.75 0 01-.75.75H8.25a.75.75 0 01-.75-.75v-2.25h9z"
    />
  </svg>
);

const PlusCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const MinusCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

interface BookGeneratorViewProps {
  profile: TeacherProfile;
}

export const BookGeneratorView: React.FC<BookGeneratorViewProps> = ({
  profile,
}) => {
  useEffect(() => {
    const renderMath = () => {
      // @ts-ignore
      if (typeof window !== "undefined" && window.katex) {
        const mathElements = document.querySelectorAll(
          ".math-visual, [data-latex]",
        );
        mathElements.forEach((el) => {
          const latex = el.getAttribute("data-latex") || el.textContent;
          if (latex) {
            try {
              // @ts-ignore
              window.katex.render(latex, el, {
                throwOnError: false,
                displayMode: false,
              });
            } catch (e) {
              console.error("KaTeX error:", e);
            }
          }
        });
      }
    };

    // Slight delay to allow DOM to update
    const timeout = setTimeout(renderMath, 300);
    return () => clearTimeout(timeout);
  });

  const {
    selectedExams,
    isLoading,
    isPrinting,
    searchTerm,
    printStatus,
    printErrorMsg,
    bookTitle,
    bookSubtitle,
    fontSize,
    lineSpacing,
    paperMargin,
    keepTogether,
    setSearchTerm,
    setBookTitle,
    setBookSubtitle,
    setFontSize,
    setLineSpacing,
    setPaperMargin,
    setKeepTogether,
    filteredExams,
    handleSelect,
    handleDeselect,
    handleDownload,
  } = useBookGenerator({ profile });

  if (isLoading)
    return (
      <div className="p-8 text-center text-slate-500">Memuat data soal...</div>
    );

  return (
    <div className="p-4 sm:p-8">
      <div className="print:hidden">
        <div className="flex items-center gap-3 mb-6">
          <BookOpenIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
            Generator Buku Soal
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Panel: Select Exams */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm p-5 border border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">
              Pilih Sumber Soal
            </h3>

            <div className="relative mb-4">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari pelajaran, sekolah, atau tipe..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="overflow-y-auto h-[400px] space-y-2 pr-2 custom-scrollbar relative">
              {filteredExams.map((exam) => (
                <div
                  key={exam.code}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-xl transition-all hover:border-indigo-300 dark:hover:border-indigo-500/50"
                >
                  <div className="min-w-0 pr-3">
                    <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                      {exam.subject} {exam.examType ? `- ${exam.examType}` : ""}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {exam.school || "Sekolah Tidak Diketahui"} • {exam.count}{" "}
                      Soal
                    </p>
                    <p className="text-[10px] font-mono text-slate-400 mt-1">
                      {exam.code}
                    </p>
                  </div>
                  <button
                    onClick={() => handleSelect(exam)}
                    disabled={!!selectedExams.find((e) => e.code === exam.code)}
                    className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-800/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                  >
                    <PlusCircleIcon className="w-5 h-5" />
                  </button>
                </div>
              ))}
              {filteredExams.length === 0 && (
                <div className="text-center p-8 text-slate-500 text-sm">
                  Tidak ada ujian ditemukan.
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Selected Exams & Book Config */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm p-5 border border-slate-200 dark:border-slate-800 flex flex-col min-h-[660px]">
            <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">
              Pengaturan Buku
            </h3>

            <div className="space-y-4 mb-4 shrink-0">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Judul Buku
                  </label>
                  <input
                    type="text"
                    value={bookTitle}
                    onChange={(e) => setBookTitle(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Sub Judul / Keterangan
                  </label>
                  <input
                    type="text"
                    value={bookSubtitle}
                    onChange={(e) => setBookSubtitle(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              {/* Panel Tata Letak Cetak */}
              <div className="bg-indigo-50/20 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800 rounded-xl p-3.5 space-y-3 shrink-0">
                <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>⚙️</span> Pengaturan Tata Letak & Toleransi Cetak
                </p>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  {/* Font Size Selector */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                      Ukuran Huruf
                    </label>
                    <select
                      value={fontSize}
                      onChange={(e) => setFontSize(e.target.value as any)}
                      className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none"
                    >
                      <option value="small">Kecil (10.5pt)</option>
                      <option value="normal">Sedang (11.5pt)</option>
                      <option value="large">Besar (12.5pt)</option>
                    </select>
                  </div>

                  {/* Line Spacing Selector */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                      Jarak Baris
                    </label>
                    <select
                      value={lineSpacing}
                      onChange={(e) => setLineSpacing(e.target.value as any)}
                      className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none"
                    >
                      <option value="tight">Rapat (1.35)</option>
                      <option value="normal">Sedang (1.55)</option>
                      <option value="relaxed">Longgar (1.80)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  {/* Paper Margin Selector */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                      Margin Halaman
                    </label>
                    <select
                      value={paperMargin}
                      onChange={(e) => setPaperMargin(e.target.value as any)}
                      className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none"
                    >
                      <option value="thin">Tipis (15mm)</option>
                      <option value="normal">Sedang (20mm)</option>
                      <option value="thick">Tebal (25mm)</option>
                    </select>
                  </div>

                  {/* Keep Together Selector */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                      Pemisahan Halaman
                    </label>
                    <select
                      value={keepTogether}
                      onChange={(e) => setKeepTogether(e.target.value as any)}
                      className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none"
                    >
                      <option value="auto">Auto Repair (Saran)</option>
                      <option value="always">Selalu Utuh</option>
                      <option value="never">Bebas Terpotong</option>
                    </select>
                  </div>
                </div>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-normal">
                  *Pemisahan <strong>Auto Repair</strong> mencegah soal pendek
                  terputus, namun mengizinkan soal panjang / tabel terpecah agar
                  bagian bawah kertas tidak kosong atau meluap.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">
                Soal Terpilih ({selectedExams.length})
              </h4>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 mb-4 custom-scrollbar min-h-[140px]">
              {selectedExams.map((exam) => (
                <div
                  key={exam.code}
                  className="flex items-center justify-between p-2 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-lg group"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">
                      {exam.config.subject}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {exam.questions.length} Soal • {exam.code}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeselect(exam.code)}
                    className="p-1.5 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-md transition-colors opacity-80 group-hover:opacity-100 shrink-0"
                    title="Hapus dari buku"
                  >
                    <MinusCircleIcon className="w-5 h-5" />
                  </button>
                </div>
              ))}
              {selectedExams.length === 0 && (
                <div className="text-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 text-sm font-medium">
                  Belum ada soal terpilih.
                  <br />
                  <span className="text-xs font-normal">
                    Pilih ujian dari panel sebelah kiri.
                  </span>
                </div>
              )}
            </div>

            {printStatus === "error" && (
              <div className="mb-3 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/40 rounded-lg text-xs text-rose-600 dark:text-rose-400">
                {printErrorMsg || "Gagal membuat dokumen."}
              </div>
            )}

            <button
              onClick={handleDownload}
              disabled={selectedExams.length === 0 || isPrinting}
              className="w-full shrink-0 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]"
            >
              {isPrinting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <PrinterIcon className="w-5 h-5" />
              )}
              <span>
                {isPrinting ? "Menyiapkan Unduhan..." : "Unduh PDF Buku"}
              </span>
            </button>
          </div>
        </div>

        {/* Live Book Page Preview Section */}
        {selectedExams.length > 0 && (
          <div className="mt-12 bg-slate-100 dark:bg-slate-950/40 rounded-2xl p-4 sm:p-8 border border-slate-200 dark:border-slate-800 print:bg-transparent print:p-0 print:m-0 print:border-none">
            <div className="overflow-x-auto py-4 flex flex-col items-center">
              <div
                id="pdf-book-container"
                className="print:block font-serif w-full max-w-none text-black bg-slate-100 print:bg-white !m-0 !p-0 flex flex-col items-center gap-8 print:gap-0 select-none print:select-text"
              >
                <style>{`
                                    .html-content table {
                                        width: 100%;
                                        border-collapse: collapse;
                                        margin: 1rem 0;
                                        font-family: inherit;
                                    }
                                    .html-content th, .html-content td {
                                        border: 1px solid #cbd5e1;
                                        padding: 0.5rem;
                                        text-align: left;
                                    }
                                    .html-content th {
                                        background-color: #f1f5f9;
                                        font-weight: 600;
                                    }
                                    .html-content p:last-child {
                                        margin-bottom: 0;
                                    }
                                    
                                    .page-container {
                                        width: 210mm !important;
                                        height: auto !important;
                                        min-height: 296.5mm !important;
                                        padding: ${paperMargin === "thin" ? "15mm" : paperMargin === "thick" ? "25mm" : "20mm"} !important;
                                        box-sizing: border-box !important;
                                        background-color: white !important;
                                        box-shadow: 0 10px 25px rgba(0,0,0,0.1) !important;
                                        border: 1px solid #cbd5e1 !important;
                                        display: flex !important;
                                        flex-direction: column !important;
                                        justify-content: space-between !important;
                                        page-break-after: always !important;
                                        break-after: page !important;
                                        position: relative !important;
                                    }
                                    
                                    .page-container-flow {
                                        width: 210mm !important;
                                        min-height: 296.5mm !important;
                                        padding: ${paperMargin === "thin" ? "15mm" : paperMargin === "thick" ? "25mm" : "20mm"} !important;
                                        box-sizing: border-box !important;
                                        background-color: white !important;
                                        box-shadow: 0 10px 25px rgba(0,0,0,0.1) !important;
                                        border: 1px solid #cbd5e1 !important;
                                        position: relative !important;
                                        page-break-after: always !important;
                                        break-after: page !important;
                                    }
                                    
                                    .page-break { display: none !important; }
                                    .avoid-break { 
                                        page-break-inside: ${keepTogether === "never" ? "auto" : "avoid"} !important; 
                                        break-inside: ${keepTogether === "never" ? "auto" : "avoid"} !important; 
                                    }
                                    
                                    @media print {
                                        body {
                                            background-color: white !important;
                                            margin: 0 !important;
                                            padding: 0 !important;
                                        }
                                        body * {
                                            visibility: hidden !important;
                                        }
                                        #pdf-book-container, #pdf-book-container * {
                                            visibility: visible !important;
                                        }
                                        #pdf-book-container {
                                            position: absolute !important;
                                            left: 0 !important;
                                            top: 0 !important;
                                            width: 210mm !important;
                                            margin: 0 !important;
                                            padding: 0 !important;
                                            background: white !important;
                                        }
                                        
                                        .page-container {
                                            width: 210mm !important;
                                            height: auto !important;
                                            min-height: 296.5mm !important;
                                            padding: ${paperMargin === "thin" ? "15mm" : paperMargin === "thick" ? "25mm" : "20mm"} !important;
                                            margin: 0 !important;
                                            box-shadow: none !important;
                                            border: none !important;
                                            page-break-after: always !important;
                                            break-after: page !important;
                                        }
                                        
                                        .page-container-flow {
                                            width: 210mm !important;
                                            min-height: 296.5mm !important;
                                            padding: ${paperMargin === "thin" ? "15mm" : paperMargin === "thick" ? "25mm" : "20mm"} !important;
                                            margin: 0 !important;
                                            box-shadow: none !important;
                                            border: none !important;
                                            page-break-after: always !important;
                                            break-after: page !important;
                                        }
                                        
                                        @page {
                                            margin: 0 !important;
                                            size: A4 portrait !important;
                                        }
                                    }
                                 `}</style>

                {/* Cover Page */}
                <div className="page-container text-black font-sans">
                  <div className="border-[12px] border-double border-black p-8 flex-1 flex flex-col justify-between box-sizing-border-box">
                    <div className="flex justify-between items-center border-b-4 border-black pb-4">
                      <div className="border-2 border-black inline-block px-4 py-2 font-sans font-semibold text-[11px] sm:text-[12px] bg-white leading-none">
                        Dokumen Negara
                      </div>
                      <div className="text-center">
                        <p className="font-serif font-bold text-[8px] tracking-[0.2em] uppercase">
                          Republik Indonesia
                        </p>
                        <p className="font-sans font-black text-[10px] uppercase text-slate-800 tracking-wider">
                          Platform Ujian Cerdas
                        </p>
                      </div>
                      <div className="border-2 border-black inline-block px-4 py-2 font-sans font-semibold text-[11px] sm:text-[12px] italic bg-white leading-none">
                        Sangat Rahasia
                      </div>
                    </div>

                    <div className="my-auto flex flex-col items-center text-center py-6">
                      <div className="mb-6 p-2 border-4 border-black rounded-full inline-flex items-center justify-center bg-white shadow-sm">
                        <div className="w-16 h-16 border-2 border-dashed border-black rounded-full flex flex-col items-center justify-center">
                          <span className="font-serif text-2xl font-black tracking-tighter m-0 leading-none">
                            BSR
                          </span>
                          <span className="text-[6px] font-sans font-black uppercase tracking-widest mt-1">
                            SOAL RESMI
                          </span>
                        </div>
                      </div>

                      <h1 className="text-2xl sm:text-3xl font-black mb-2 uppercase tracking-wider leading-tight max-w-3xl font-serif">
                        {bookTitle}
                      </h1>
                      <p className="text-xs font-bold text-slate-700 tracking-[0.15em] uppercase font-sans mb-8">
                        {bookSubtitle}
                      </p>

                      <div className="w-full max-w-md border-4 border-double border-black p-4 bg-white mx-auto text-left font-sans">
                        <p className="text-center font-black uppercase tracking-widest text-[9px] border-b-2 border-black pb-1 mb-2">
                          IDENTITAS KUMPULAN SOAL
                        </p>
                        <table className="w-full text-[11px] font-medium border-collapse">
                          <tbody>
                            <tr>
                              <td className="w-32 py-1 uppercase text-slate-500 font-extrabold tracking-wider">
                                Jenis Dokumen
                              </td>
                              <td className="py-1 px-1">:</td>
                              <td className="py-1 text-slate-900 font-bold uppercase">
                                Buku Kumpulan Soal Resmi (BSR)
                              </td>
                            </tr>
                            <tr className="border-t border-slate-200">
                              <td className="py-1 uppercase text-slate-500 font-extrabold tracking-wider">
                                Total Modul
                              </td>
                              <td className="py-1 px-1">:</td>
                              <td className="py-1 text-slate-900 font-bold">
                                {selectedExams.length} Modul Kisi-Kisi
                              </td>
                            </tr>
                            <tr className="border-t border-slate-200">
                              <td className="py-1 uppercase text-slate-500 font-extrabold tracking-wider">
                                Total Soal
                              </td>
                              <td className="py-1 px-1">:</td>
                              <td className="py-1 text-slate-900 font-bold">
                                {selectedExams.reduce(
                                  (acc, exam) => acc + exam.questions.length,
                                  0,
                                )}{" "}
                                Butir Pertanyaan
                              </td>
                            </tr>
                            <tr className="border-t border-slate-200">
                              <td className="py-1 uppercase text-slate-500 font-extrabold tracking-wider">
                                Tahun Terbit
                              </td>
                              <td className="py-1 px-1">:</td>
                              <td className="py-1 text-slate-900 font-bold">
                                {new Date().getFullYear()} /{" "}
                                {new Date().getFullYear() + 1}
                              </td>
                            </tr>
                            <tr className="border-t border-slate-200">
                              <td className="py-1 uppercase text-slate-500 font-extrabold tracking-wider">
                                Hak Akses
                              </td>
                              <td className="py-1 px-1">:</td>
                              <td className="py-1">
                                <span className="px-1.5 py-0.5 border border-black text-[9px] font-black uppercase tracking-widest bg-slate-50">
                                  GURU / PENGAWAS
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="border-t border-slate-300 pt-3 flex justify-between items-center text-[9px]">
                      <p className="font-bold tracking-widest uppercase text-slate-700">
                        PLATFORM UJIAN CERDAS INDONESIA
                      </p>
                      <p className="font-semibold text-slate-500">
                        Dicetak:{" "}
                        {new Date().toLocaleDateString("id-ID", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* General Instructions Sheet */}
                <div className="page-container text-black font-sans">
                  <div className="border-[12px] border-double border-black p-8 flex-1 flex flex-col justify-between box-sizing-border-box">
                    <div>
                      <div className="border-b-4 border-black pb-4 mb-6 text-center">
                        <h2 className="text-xl font-black uppercase tracking-widest font-serif">
                          PETUNJUK UMUM
                        </h2>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-sans mt-1">
                          ASESMEN KOMPETENSI MINIMUM & UJIAN EKSTERNAL GURU
                        </p>
                      </div>

                      <div className="space-y-4 text-xs leading-relaxed text-justify max-w-4xl mx-auto text-slate-800">
                        <p className="font-bold text-slate-900">
                          Sebelum menguji, mengkaji, atau membagikan soal-soal
                          di dalam buku ini, mohon diperhatikan beberapa pedoman
                          instruksi berikut:
                        </p>

                        <ul className="list-decimal pl-5 space-y-3">
                          <li>
                            <strong>Persiapan Guru & Siswa:</strong> Mulailah
                            setiap kegiatan belajar mengajar atau pelaksanaan
                            ujian dengan berdoa sesuai keyakinan masing-masing
                            agar proses berpikir diberikan kelancaran.
                          </li>
                          <li>
                            <strong>Verifikasi Lembar Soal:</strong> Teliti
                            kembali kelengkapan butir soal untuk setiap modul
                            ujian ({selectedExams.length} Modul) dalam cetakan
                            ini. Periksa gambar, bagan, tabel, opsi pilihan, dan
                            kunci jawaban agar tidak ada aspek penting yang
                            cacat atau terpotong.
                          </li>
                          <li>
                            <strong>Format Pilihan Ganda:</strong> Opsi pilihan
                            ganda tunggal dan kompleks (MULTIPLE CHOICE)
                            ditandai dengan alfabetis bunder tebal (A, B, C, D,
                            E). Siswa dapat memberikan jawaban tertulis dengan
                            menyilang atau melingkari huruf yang sesuai.
                          </li>
                          <li>
                            <strong>
                              Soal Tabel Benar/Salah (TRUE_FALSE):
                            </strong>{" "}
                            Untuk tipe soal benar/salah, buku ini dilengkapi
                            dengan kotak isian bagi siswa untuk mencentang (✓)
                            atau menyilang (X) pernyataan berdasarkan kesimpulan
                            yang logis.
                          </li>
                          <li>
                            <strong>Soal Esai & Uraian (ESSAY):</strong> Untuk
                            soal esai, buku menyediakan lembar garis bergaris
                            ("Ledger/Writing Paper style") di bawah soal untuk
                            memudahkan corat-coret, penyusunan langkah
                            pengerjaan matematika, atau uraian deskriptif.
                          </li>
                          <li>
                            <strong>Keamanan Jawaban:</strong> Kunci jawaban
                            terletak di bagian paling akhir buku ini. Cetakan
                            kunci jawaban disarankan dipisah saat pembagian soal
                            guna menjaga kerahasiaan evaluasi mandiri siswa.
                          </li>
                        </ul>
                      </div>
                    </div>

                    <div className="border-t-2 border-black pt-3 text-center text-[10px] tracking-widest font-bold uppercase text-slate-800">
                      SELAMAT BEKERJA • PRESTASI PENTING JUJUR UTAMA
                    </div>
                  </div>
                </div>

                {/* Questions */}
                {selectedExams.map((exam, examIndex) => {
                  return (
                    <div
                      key={exam.code}
                      className="page-container-flow text-black font-serif"
                    >
                      <div className="border-b-4 border-black pb-3 mb-6 flex justify-between items-end avoid-break font-sans">
                        <div>
                          <p className="text-[10px] tracking-widest uppercase text-slate-500 font-black mb-1">
                            MATA PELAJARAN - MODUL {examIndex + 1}
                          </p>
                          <h2 className="text-2xl font-black uppercase m-0 tracking-tight font-serif">
                            {exam.config.subject}
                          </h2>
                        </div>
                        <div className="text-right pb-1">
                          <span className="bg-black text-white px-3 py-1 font-black text-xs uppercase tracking-wider">
                            {exam.questions.length} Butir Soal
                          </span>
                        </div>
                      </div>

                      <div className="space-y-8">
                        {exam.questions.map((q, qIndex) => {
                          const normalized = normalizeQuestion(q);
                          const isLong = isLongQuestion(normalized);
                          const shouldAvoidBreak =
                            keepTogether === "always" ||
                            (keepTogether === "auto" && !isLong);

                          return (
                            <div
                              key={normalized.id || qIndex}
                              className={`${shouldAvoidBreak ? "avoid-break" : ""} bg-white text-black mb-8 pb-6 border-b border-dashed border-slate-200 last:border-0 last:pb-0`}
                            >
                              <div className="flex gap-4">
                                <div className="font-black font-sans text-base pt-0.5 text-slate-950 min-w-[28px]">
                                  {qIndex + 1}.
                                </div>

                                <div
                                  className="font-serif flex-1 text-slate-900"
                                  style={{
                                    fontSize:
                                      fontSize === "small"
                                        ? "10.5pt"
                                        : fontSize === "large"
                                          ? "12.5pt"
                                          : "11.5pt",
                                    lineHeight:
                                      lineSpacing === "tight"
                                        ? "1.35"
                                        : lineSpacing === "relaxed"
                                          ? "1.8"
                                          : "1.55",
                                  }}
                                >
                                  {renderQuestionTextWithChart(
                                    normalized.questionText,
                                    normalized.chartData,
                                    "html-content text-justify whitespace-pre-wrap mb-3 font-serif text-slate-950",
                                  )}

                                  {normalized.imageUrl && (
                                    <div className="my-3 max-w-[80%] border border-slate-300 rounded-lg p-1 inline-block bg-white shadow-sm">
                                      <img
                                        src={normalized.imageUrl}
                                        alt="soal"
                                        className="max-h-60 object-contain"
                                        referrerPolicy="no-referrer"
                                      />
                                    </div>
                                  )}

                                  {normalized.questionType ===
                                    "MULTIPLE_CHOICE" ||
                                  normalized.questionType ===
                                    "COMPLEX_MULTIPLE_CHOICE" ? (
                                    <div
                                      className="mt-3 space-y-2.5 font-sans text-slate-900"
                                      style={{
                                        fontSize:
                                          fontSize === "small"
                                            ? "10pt"
                                            : fontSize === "large"
                                              ? "12pt"
                                              : "11pt",
                                      }}
                                    >
                                      {normalized.options?.map(
                                        (opt: string, oIndex: number) => {
                                          const isComplex =
                                            normalized.questionType ===
                                            "COMPLEX_MULTIPLE_CHOICE";
                                          const roundedClass = isComplex
                                            ? "rounded"
                                            : "rounded-full";
                                          return (
                                            <div
                                              key={oIndex}
                                              className="flex gap-3 items-start py-0.5"
                                            >
                                              <span
                                                className={`font-black border-2 border-slate-900 ${roundedClass} w-5 h-5 min-w-[20px] flex items-center justify-center shrink-0 text-[10px] text-slate-955 bg-slate-50 leading-none pb-[1px]`}
                                                style={{ marginTop: "5px" }}
                                              >
                                                {String.fromCharCode(
                                                  65 + oIndex,
                                                )}
                                              </span>
                                              <div className="pt-0.5 flex-1 leading-normal font-sans">
                                                {renderQuestionTextWithChart(
                                                  opt,
                                                  normalized.optionCharts?.[
                                                    oIndex
                                                  ],
                                                  "html-content inline-block max-w-full break-words",
                                                )}
                                                {normalized.optionImages &&
                                                  normalized.optionImages[
                                                    oIndex
                                                  ] && (
                                                    <div className="mt-1.5 block max-w-[130px] border border-slate-200 rounded p-0.5 bg-white">
                                                      <img
                                                        src={
                                                          normalized
                                                            .optionImages[
                                                            oIndex
                                                          ] as string
                                                        }
                                                        alt={`opt ${oIndex}`}
                                                        className="max-h-[110px] object-contain"
                                                        referrerPolicy="no-referrer"
                                                      />
                                                    </div>
                                                  )}
                                              </div>
                                            </div>
                                          );
                                        },
                                      )}
                                    </div>
                                  ) : normalized.questionType ===
                                    "TRUE_FALSE" ? (
                                    <div className="mt-4 pt-1 overflow-x-auto">
                                      <table
                                        className="w-full font-sans border-collapse border-2 border-slate-900"
                                        style={{
                                          fontSize:
                                            fontSize === "small"
                                              ? "9.5pt"
                                              : fontSize === "large"
                                                ? "11.5pt"
                                                : "10.5pt",
                                        }}
                                      >
                                        <thead>
                                          <tr className="bg-slate-100 border-b-2 border-slate-900 text-slate-950">
                                            <th className="text-left py-2 px-3 font-bold border-r border-slate-900 text-[9pt] uppercase tracking-wider bg-slate-50">
                                              Daftar Pernyataan / Kasus
                                            </th>
                                            <th className="w-20 border-r border-slate-900 py-2 text-center font-bold text-[9pt] uppercase tracking-wider bg-slate-50">
                                              BENAR
                                            </th>
                                            <th className="w-20 py-2 text-center font-bold text-[9pt] uppercase tracking-wider bg-slate-50">
                                              SALAH
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {normalized.trueFalseRows?.map(
                                            (row: any, rIdx: number) => (
                                              <tr
                                                key={rIdx}
                                                className="border-b border-slate-950 last:border-b-0 hover:bg-slate-50"
                                              >
                                                <td className="py-2 px-3 text-left border-r border-slate-300 font-medium align-top">
                                                  {renderQuestionTextWithChart(
                                                    row.text,
                                                    row.chartData,
                                                    "html-content",
                                                  )}
                                                </td>
                                                <td className="py-2 border-r border-slate-300 text-center">
                                                  <div className="w-4 h-4 rounded border border-slate-400 mx-auto bg-slate-50 shadow-inner flex items-center justify-center text-[9px] font-bold text-slate-400 leading-none pb-[1px]">
                                                    B
                                                  </div>
                                                </td>
                                                <td className="py-2 text-center">
                                                  <div className="w-4 h-4 rounded border border-slate-400 mx-auto bg-slate-50 shadow-inner flex items-center justify-center text-[9px] font-bold text-slate-400 leading-none pb-[1px]">
                                                    S
                                                  </div>
                                                </td>
                                              </tr>
                                            ),
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : normalized.questionType === "MATCHING" ? (
                                    <div className="mt-3 ml-2 space-y-2 mb-4 pb-4 border-b border-dashed border-slate-200">
                                      {normalized.matchingPairs?.map(
                                        (pair: any, pIdx: number) => (
                                          <div
                                            key={pIdx}
                                            className="flex items-center gap-3"
                                          >
                                            <div className="flex-1 p-2 border border-slate-300 rounded-md bg-slate-50 text-[10.5pt]">
                                              {renderQuestionTextWithChart(
                                                pair.left,
                                                pair.leftChart,
                                                "html-content",
                                              )}
                                            </div>
                                            <div className="font-bold text-slate-500">
                                              ......
                                            </div>
                                            <div className="flex-1 border-b border-slate-600 h-5" />
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  ) : normalized.questionType === "ESSAY" ? (
                                    <div className="mt-3 border-2 border-slate-300 p-3 rounded-lg bg-slate-50/20 avoid-break">
                                      <p className="text-[9pt] font-bold text-slate-500 uppercase tracking-widest mb-2 font-sans">
                                        Lembar Jawaban Uraian / Langkah
                                        Penyelesaian:
                                      </p>
                                      <div className="space-y-3 py-1">
                                        <div className="border-b border-dashed border-slate-300 h-5"></div>
                                        <div className="border-b border-dashed border-slate-300 h-5"></div>
                                        <div className="border-b border-dashed border-slate-300 h-5"></div>
                                        <div className="border-b border-dashed border-slate-300 h-5"></div>
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Answer Key */}
                <div className="page-container-flow text-black font-sans">
                  <div className="mb-8 text-center pb-4 border-b-4 border-black font-sans">
                    <p className="font-sans font-black tracking-[0.3em] text-[10px] text-rose-600 uppercase mb-1">
                      DOKUMEN SANGAT RAHASIA
                    </p>
                    <h1 className="text-3xl font-black uppercase m-0 tracking-wider">
                      Kunci Jawaban Resmi
                    </h1>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1 font-sans font-bold">
                      Kumpulan Soal Evaluasi Belajar - Platform Ujian Cerdas
                    </p>
                  </div>

                  <div className="space-y-10">
                    {selectedExams.map((exam, examIndex) => {
                      return (
                        <div key={exam.code} className="avoid-break font-sans">
                          <div className="flex items-center gap-3.5 mb-4 border-b-2 border-slate-900 pb-1.5">
                            <div className="w-6 h-6 rounded-full bg-slate-950 text-white flex items-center justify-center font-black text-xs">
                              {examIndex + 1}
                            </div>
                            <h2 className="text-sm font-black uppercase m-0 tracking-tight text-slate-900">
                              {exam.config.subject}
                            </h2>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-5 gap-y-3 bg-slate-50 p-4 rounded-xl border border-slate-300 shadow-sm">
                            {exam.questions.map((q, qIndex) => {
                              const answerText = getFormattedAnswerText(q);
                              return (
                                <div
                                  key={q.id}
                                  className="text-xs flex items-start gap-2"
                                >
                                  <span className="font-extrabold text-slate-500 min-w-[20px] text-right">
                                    {qIndex + 1}.
                                  </span>
                                  <span className="font-black text-slate-950 break-all flex-1 uppercase tracking-wide bg-white px-1.5 py-0.5 border border-slate-200 rounded shadow-[0_1px_2px_rgba(0,0,0,0.05)] text-center">
                                    {answerText}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookGeneratorView;
