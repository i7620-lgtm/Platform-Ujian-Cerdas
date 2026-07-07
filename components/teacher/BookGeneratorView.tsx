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
      // @ts-expect-error - external lib
      if (typeof window !== "undefined" && window.katex) {
        const mathElements = document.querySelectorAll(
          ".math-visual, [data-latex]",
        );
        mathElements.forEach((el) => {
          const latex = el.getAttribute("data-latex") || el.textContent;
          if (latex) {
            try {
              // @ts-expect-error - external lib
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

      </div>
    </div>
  );
};

export default BookGeneratorView;
