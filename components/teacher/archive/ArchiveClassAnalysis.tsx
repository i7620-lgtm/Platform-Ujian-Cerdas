import React, { useState, useMemo } from "react";
import type { Exam, Result, TeacherProfile, ExamSummary } from "../../../types";
import {
  ChartBarIcon,
  SparklesIcon,
  PrinterIcon,
  DocumentDuplicateIcon,
  CheckCircleIcon,
} from "../../Icons";
import { formatDuration, filterEvaluationSection } from "./archiveUtils";
import { archiveService } from "../../../services/archive";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ClassPerformanceDistribution } from "./ClassPerformanceDistribution";

interface QuestionTypeStat {
  type: string;
  typeName: string;
  percentage: number;
}

interface ClassAnalysisItem {
  schoolName: string;
  className: string;
  studentCount: number;
  averageScore: number;
  averageTime: number;
  lowestScore: number;
  highestScore: number;
  passRate: number;
  passCount: number;
  questionTypeStats: QuestionTypeStat[];
}

interface ArchiveClassAnalysisProps {
  classAnalysisData: ClassAnalysisItem[];
  uniqueSchools: string[];
  selectedSchool: string;
  exam: Exam;
  results?: Result[];
  teacherProfile?: TeacherProfile | null;
  ai_analyses?: Record<string, string>;
  aiAnalysisResult?: string | null;
  activeAiSubTab?: string;
  onSelectAiSubTab?: (key: string) => void;
  onDeleteAIAnalysis?: (key?: string) => void;
  onOpenTargetModal?: () => void;
  viewMode?: "CLASS_ONLY" | "AI_ONLY" | "BOTH";
  isGeneratingAI?: boolean;
  aiProgressStatus?: { message: string; step: number; total: number } | null;
}

export const ArchiveClassAnalysis: React.FC<ArchiveClassAnalysisProps> = ({
  classAnalysisData,
  uniqueSchools,
  selectedSchool,
  exam,
  results = [],
  teacherProfile,
  ai_analyses,
  aiAnalysisResult,
  activeAiSubTab,
  onSelectAiSubTab,
  onDeleteAIAnalysis,
  onOpenTargetModal,
  viewMode = "BOTH",
  isGeneratingAI,
  aiProgressStatus,
}) => {
  const [copied, setCopied] = useState(false);

  const filteredResults = useMemo(() => {
    if (!results) return [];
    if (selectedSchool === "ALL") return results;
    return results.filter(
      (r) =>
        (r.student.schoolName || exam.authorSchool || "Unknown School") ===
        selectedSchool
    );
  }, [results, selectedSchool, exam.authorSchool]);

  const analysisSchools = Array.from(
    new Set(classAnalysisData.map((c) => c.schoolName))
  );

  const isTKA = useMemo(() => {
    const typeStr = (exam.config.examType || "").toLowerCase().trim();
    return typeStr === "tka" || typeStr.includes("tka");
  }, [exam.config.examType]);

  // Determine available AI analyses sub-tabs
  const availableKeys = useMemo(() => {
    if (ai_analyses && Object.keys(ai_analyses).length > 0) {
      const keys = Object.keys(ai_analyses);
      return keys.sort((a, b) => {
        if (a === "OVERALL") return -1;
        if (b === "OVERALL") return 1;
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
      });
    }
    return aiAnalysisResult ? ["OVERALL"] : [];
  }, [ai_analyses, aiAnalysisResult]);

  const hasAnalyses = availableKeys.length > 0;

  const currentSubTabKey = useMemo(() => {
    if (activeAiSubTab && availableKeys.includes(activeAiSubTab)) {
      return activeAiSubTab;
    }
    return availableKeys[0] || "OVERALL";
  }, [activeAiSubTab, availableKeys]);

  const currentRawAnalysis = useMemo(() => {
    if (ai_analyses && ai_analyses[currentSubTabKey]) {
      return ai_analyses[currentSubTabKey];
    }
    return aiAnalysisResult || "";
  }, [ai_analyses, currentSubTabKey, aiAnalysisResult]);

  // Filter results specifically for active AI sub-tab chart
  const currentSubTabResults = useMemo(() => {
    if (!results || results.length === 0) return [];
    if (currentSubTabKey === "OVERALL") {
      return filteredResults;
    }
    const match = currentSubTabKey.match(/school_(.*)_class_(.*)/);
    if (match) {
      const schoolName = match[1];
      const className = match[2];
      return results.filter((r) => {
        const rSchool = r.student.schoolName || exam.authorSchool || "ALL";
        const rClass = String(r.student.class || r.student.className || "").trim();
        const matchSchool = schoolName === "ALL" || rSchool === schoolName;
        return matchSchool && rClass === className;
      });
    }
    return filteredResults;
  }, [results, filteredResults, currentSubTabKey, exam.authorSchool]);

  const currentSubTabMeta = useMemo(() => {
    if (currentSubTabKey === "OVERALL") {
      return {
        title: "Analisis Umum (Semua Kelas)",
        badge: "Umum / Makro",
        studentCount: filteredResults.length,
      };
    }
    const match = currentSubTabKey.match(/school_(.*)_class_(.*)/);
    if (match) {
      return {
        title: `Analisis Khusus Kelas ${match[2]}`,
        badge: `Khusus Kelas ${match[2]}`,
        studentCount: currentSubTabResults.length,
      };
    }
    return {
      title: `Analisis: ${currentSubTabKey}`,
      badge: "Khusus",
      studentCount: currentSubTabResults.length,
    };
  }, [currentSubTabKey, filteredResults.length, currentSubTabResults.length]);

  const handlePrintAI = () => {
    const printContent = document.getElementById("ai-analysis-print-content");
    if (printContent) {
      const originalContents = document.body.innerHTML;
      document.body.innerHTML = `
        <div style="padding: 24px; font-family: system-ui, -apple-system, sans-serif;">
          <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px;">
            <h1 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 6px 0;">Laporan Analisis AI - ${exam.config.subject}</h1>
            <p style="font-size: 13px; color: #475569; margin: 0;">${currentSubTabMeta.title} • ${currentSubTabMeta.studentCount} Siswa • Kode Ujian: ${exam.code} • Sekolah: ${exam.authorSchool || "-"}</p>
          </div>
          ${printContent.innerHTML}
        </div>
      `;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload();
    }
  };

  const handleCopyText = async () => {
    if (!currentRawAnalysis) return;
    try {
      await navigator.clipboard.writeText(currentRawAnalysis);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Gagal menyalin analisis:", e);
    }
  };

  const sanitizedAnalysis = useMemo(() => {
    if (!currentRawAnalysis) return "";
    return filterEvaluationSection(currentRawAnalysis, isTKA);
  }, [currentRawAnalysis, isTKA]);

  let splitAnalysis = { before: "", after: "", splitFound: false };
  if (sanitizedAnalysis && isTKA) {
    const regex = /(?:^|\n)(#{1,6}\s+.*Evaluasi Nilai Rata-Rata Berdasarkan Standar Nasional.*|\*\*(?:Evaluasi Nilai Rata-Rata Berdasarkan Standar Nasional|Evaluasi Nilai Rata-Rata)\*\*:?)/i;
    const match = sanitizedAnalysis.match(regex);
    if (match && match.index !== undefined) {
      const matchIndex = match.index;
      splitAnalysis = {
        before: sanitizedAnalysis.substring(0, matchIndex),
        after: sanitizedAnalysis.substring(matchIndex),
        splitFound: true
      };
    } else {
      splitAnalysis = { before: sanitizedAnalysis, after: "", splitFound: false };
    }
  } else {
    splitAnalysis = { before: sanitizedAnalysis, after: "", splitFound: false };
  }

  const markdownComponents = useMemo(() => ({
    table: ({ node, ...props }: any) => (
      <div className="overflow-x-auto my-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm text-left" {...props} />
      </div>
    ),
    thead: ({ node, ...props }: any) => (
      <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700" {...props} />
    ),
    th: ({ node, ...props }: any) => (
      <th className="px-4 py-3 font-bold border-r last:border-r-0 border-slate-200 dark:border-slate-700" {...props} />
    ),
    td: ({ node, ...props }: any) => (
      <td className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/60 border-r last:border-r-0 border-slate-100 dark:border-slate-700/60 align-top text-slate-700 dark:text-slate-300 leading-relaxed" {...props} />
    ),
    tr: ({ node, ...props }: any) => (
      <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors odd:bg-slate-50/30 dark:odd:bg-slate-800/40" {...props} />
    ),
    h1: ({ node, ...props }: any) => (
      <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-8 mb-4 pb-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2" {...props} />
    ),
    h2: ({ node, ...props }: any) => (
      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-8 mb-4 border-l-4 border-indigo-500 pl-3 py-0.5" {...props} />
    ),
    h3: ({ node, ...props }: any) => (
      <h3 className="text-base font-bold text-indigo-700 dark:text-indigo-400 mt-6 mb-2 flex items-center gap-2" {...props} />
    ),
    blockquote: ({ node, ...props }: any) => (
      <blockquote className="border-l-4 border-amber-500 bg-amber-50/70 dark:bg-amber-950/20 text-slate-700 dark:text-slate-300 p-4 rounded-r-xl my-4 text-sm" {...props} />
    ),
  }), []);

  const renderClassPerformanceChart = () => {
    if (filteredResults.length === 0) return null;
    return (
      <ClassPerformanceDistribution
        results={filteredResults}
        kkm={exam.config.kkm}
        subject={exam.config.subject}
      />
    );
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
      {(viewMode === "BOTH" || viewMode === "CLASS_ONLY") && (
        <>
          <div className="p-6 border-b border-slate-100 dark:border-slate-700">
            <div>
              <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                <ChartBarIcon className="w-5 h-5 text-indigo-500" /> Analisis Umum Per
                Kelas
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Ringkasan performa dan ketuntasan belajar siswa dikelompokkan
                berdasarkan kelas.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left min-w-[800px]">
          <thead className="bg-slate-50 dark:bg-slate-700">
            <tr>
              <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase">
                Sekolah
              </th>
              <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase">
                Kelas
              </th>
              <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase text-center">
                Partisipan
              </th>
              <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase text-center">
                Rerata Nilai
              </th>
              <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase text-center">
                Rata-rata Waktu
              </th>
              <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase text-center">
                Min / Max
              </th>
              {exam.config.kkm && (
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase text-center">
                  Ketuntasan (KKM {exam.config.kkm})
                </th>
              )}
              <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase">
                Detail Performa Soal
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
            {analysisSchools.map((school) => {
              const schoolAnalysis = classAnalysisData.filter(
                (c) => c.schoolName === school,
              );
              if (schoolAnalysis.length === 0) return null;

              return (
                <React.Fragment key={school}>
                  {selectedSchool === "ALL" && (
                    <tr className="bg-slate-50/80 dark:bg-slate-700/50">
                      <td
                        colSpan={8}
                        className="px-6 py-2 text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest border-y border-slate-100 dark:border-slate-700"
                      >
                        Sekolah: {school}
                      </td>
                    </tr>
                  )}
                  {schoolAnalysis.map((c, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    >
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {c.schoolName}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">
                        {c.className}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-slate-600 dark:text-slate-300">
                        {c.studentCount} Siswa
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`px-2 py-1 rounded font-bold text-xs ${c.averageScore >= 75 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"}`}
                        >
                          {c.averageScore}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-xs font-mono text-slate-500 dark:text-slate-400">
                        {formatDuration(c.averageTime)}
                      </td>
                      <td className="px-6 py-4 text-center text-xs font-mono text-slate-500 dark:text-slate-400">
                        {c.lowestScore ?? 0} - {c.highestScore ?? 0}
                      </td>
                      {exam.config.kkm && (
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className={`font-bold text-sm ${c.passRate >= 75 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
                            >
                              {c.passRate}%
                            </span>
                            <span className="text-[10px] text-slate-400">
                              ({c.passCount} Tuntas)
                            </span>
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {c.questionTypeStats.slice(0, 3).map((qt, i) => (
                            <div
                              key={i}
                              className="text-[10px] px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 flex items-center gap-1"
                              title={`${qt.typeName}: ${qt.percentage}% Benar`}
                            >
                              <span className="text-slate-500 dark:text-slate-400 uppercase font-bold">
                                {qt.type.substring(0, 3)}
                              </span>
                              <span
                                className={`font-bold ${qt.percentage >= 70 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
                              >
                                {qt.percentage}%
                              </span>
                            </div>
                          ))}
                          {c.questionTypeStats.length > 3 && (
                            <span className="text-[10px] text-slate-400 self-center">
                              +{c.questionTypeStats.length - 3} lainnya
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      </>
      )}
      
      {/* AI Analysis Section */}
      {(viewMode === "BOTH" || viewMode === "AI_ONLY") && hasAnalyses && (
        <div className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700">
          {/* Sub-tabs header */}
          <div className="bg-slate-100/70 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar py-1">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1 hidden sm:inline">
                Pilih Tab:
              </span>
              {availableKeys.map((key) => {
                let label = "Analisis Umum";
                let icon = "🌐";
                if (key !== "OVERALL") {
                  const match = key.match(/school_(.*)_class_(.*)/);
                  if (match) {
                    label = `Kelas ${match[2]}`;
                    icon = "🏫";
                  } else {
                    label = key.replace("class_", "Kelas ");
                    icon = "🏫";
                  }
                }
                const isActive = key === currentSubTabKey;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onSelectAiSubTab && onSelectAiSubTab(key)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      isActive
                        ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/80 dark:border-slate-700 font-extrabold ring-1 ring-indigo-500/20"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50"
                    }`}
                  >
                    <span>{icon}</span>
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            {/* Sub-tab actions: Copy, Print, Delete, New/Re-run */}
            <div className="flex items-center gap-2">
              {onOpenTargetModal && (
                <button
                  type="button"
                  onClick={onOpenTargetModal}
                  disabled={isGeneratingAI}
                  className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                  title="Buat ulang atau analisis target lain"
                >
                  <SparklesIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Analisis Baru / Ulang</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleCopyText}
                className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
                title="Salin isi laporan analisis ini ke clipboard"
              >
                {copied ? (
                  <>
                    <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <DocumentDuplicateIcon className="w-3.5 h-3.5 text-slate-500" />
                    <span>Salin Teks</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handlePrintAI}
                className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
                title="Cetak Laporan Tab Ini ke PDF"
              >
                <PrinterIcon className="w-3.5 h-3.5 text-slate-500" />
                <span>Cetak PDF</span>
              </button>
              {onDeleteAIAnalysis && (
                <button
                  type="button"
                  onClick={() => onDeleteAIAnalysis(currentSubTabKey)}
                  className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl text-xs font-bold shadow-xs transition-colors"
                  title="Hapus analisis tab ini"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Sub-tab content area */}
          <div className="p-6">
            <div id="ai-analysis-print-content" className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-amber-100 dark:border-amber-900/30 shadow-inner">
              {/* Header Badge */}
              <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-indigo-50/60 to-purple-50/60 dark:from-slate-800 dark:to-slate-800/60 border border-indigo-100/60 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                    {currentSubTabKey === "OVERALL" ? "🌐" : "🏫"}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {currentSubTabMeta.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Menganalisis hasil belajar {currentSubTabMeta.studentCount} siswa terdaftar
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-indigo-100/70 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold">
                  {currentSubTabMeta.badge}
                </span>
              </div>

              {splitAnalysis.splitFound ? (
                <div className="space-y-6">
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-slate-800 dark:prose-headings:text-slate-100 prose-a:text-indigo-600 dark:prose-a:text-indigo-400">
                    <div className="markdown-body">
                      <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{splitAnalysis.before}</Markdown>
                    </div>
                  </div>

                  <div className="border-t border-b border-slate-100 dark:border-slate-800 py-6 my-6 bg-slate-50/30 dark:bg-slate-900/10 rounded-xl p-4">
                    <div className="mb-4">
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Visualisasi Sebaran Performa ({currentSubTabMeta.title})
                      </h4>
                    </div>
                    {currentSubTabResults.length > 0 && (
                      <ClassPerformanceDistribution
                        results={currentSubTabResults}
                        kkm={exam.config.kkm}
                        subject={exam.config.subject}
                      />
                    )}
                  </div>

                  {splitAnalysis.after && (
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-slate-800 dark:prose-headings:text-slate-100 prose-a:text-indigo-600 dark:prose-a:text-indigo-400">
                      <div className="markdown-body">
                        <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{splitAnalysis.after}</Markdown>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-6 mb-6">
                    <div className="mb-4">
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Visualisasi Sebaran Performa ({currentSubTabMeta.title})
                      </h4>
                    </div>
                    {currentSubTabResults.length > 0 && (
                      <ClassPerformanceDistribution
                        results={currentSubTabResults}
                        kkm={exam.config.kkm}
                        subject={exam.config.subject}
                      />
                    )}
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-slate-800 dark:prose-headings:text-slate-100 prose-a:text-indigo-600 dark:prose-a:text-indigo-400">
                    <div className="markdown-body">
                      <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{sanitizedAnalysis}</Markdown>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Analysis Loading State */}
      {(viewMode === "BOTH" || viewMode === "AI_ONLY") && !hasAnalyses && isGeneratingAI && (
        <div className="p-8 bg-white dark:bg-slate-800 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 shadow-sm flex flex-col items-center justify-center text-center space-y-4 my-6 animate-fade-in">
          <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/60 rounded-2xl flex items-center justify-center border border-indigo-100 dark:border-indigo-800">
            <div className="w-7 h-7 border-3 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              {aiProgressStatus?.message || "Memproses Analisis AI..."}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              Sistem sedang menganalisis sebaran hasil belajar, mendiagnosis akar miskonsepsi siswa, dan menyusun matriks diferensiasi secara berurutan.
            </p>
          </div>
          <div className="w-full max-w-xs bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden mt-2">
            <div
              className="bg-gradient-to-r from-indigo-500 to-amber-500 h-full transition-all duration-500 rounded-full"
              style={{ width: `${Math.max(15, ((aiProgressStatus?.step || 1) / (aiProgressStatus?.total || 4)) * 100)}%` }}
            />
          </div>
          <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
            Langkah {aiProgressStatus?.step || 1} dari {aiProgressStatus?.total || 4}
          </span>
        </div>
      )}

      {/* AI Analysis Empty State */}
      {viewMode === "AI_ONLY" && !hasAnalyses && !isGeneratingAI && (
        <div className="p-10 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center space-y-3 my-6 animate-fade-in">
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/50 rounded-full flex items-center justify-center text-amber-500 text-xl">
            ✨
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
            Belum Ada Analisis AI
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
            Gunakan tombol "Buat Analisis AI" untuk menghasilkan analisis umum dan analisis khusus per kelas secara mendalam, lengkap dengan matriks 4 jenjang dan bank soal remedial.
          </p>
          {onOpenTargetModal && (
            <button
              type="button"
              onClick={onOpenTargetModal}
              className="mt-3 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2"
            >
              <SparklesIcon className="w-4 h-4" />
              <span>Mulai Analisis AI Sekarang</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
