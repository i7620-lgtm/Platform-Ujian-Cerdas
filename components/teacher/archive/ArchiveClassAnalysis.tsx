import React, { useState, useMemo } from "react";
import type { Exam, Result, TeacherProfile, ExamSummary } from "../../../types";
import { ChartBarIcon, SparklesIcon } from "../../Icons";
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
  aiAnalysisResult?: string | null;
  onDeleteAIAnalysis?: () => void;
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
  aiAnalysisResult,
  onDeleteAIAnalysis,
  viewMode = "BOTH",
  isGeneratingAI,
  aiProgressStatus,
}) => {
  const filteredResults = useMemo(() => {
    if (!results) return [];
    if (selectedSchool === "ALL") return results;
    return results.filter(r => (r.student.schoolName || exam.authorSchool || 'Unknown School') === selectedSchool);
  }, [results, selectedSchool, exam.authorSchool]);

  const handlePrintAI = () => {
    const printContent = document.getElementById("ai-analysis-print-content");
    if (printContent) {
      const originalContents = document.body.innerHTML;
      document.body.innerHTML = `
        <div style="padding: 24px; font-family: system-ui, -apple-system, sans-serif;">
          <h1 style="text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 24px;">Laporan Analisis AI - ${exam.config.subject}</h1>
          ${printContent.innerHTML}
        </div>
      `;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload(); // Reload to restore React state cleanly
    }
  };

  const analysisSchools = Array.from(new Set(classAnalysisData.map(c => c.schoolName)));

  const isTKA = useMemo(() => {
    const typeStr = (exam.config.examType || "").toLowerCase().trim();
    return typeStr === "tka" || typeStr.includes("tka");
  }, [exam.config.examType]);

  const sanitizedAnalysis = useMemo(() => {
    if (!aiAnalysisResult) return "";
    return filterEvaluationSection(aiAnalysisResult, isTKA);
  }, [aiAnalysisResult, isTKA]);

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
      {(viewMode === "BOTH" || viewMode === "AI_ONLY") && aiAnalysisResult && (
        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 relative">
          <div className="absolute top-8 right-8 flex items-center gap-2 print:hidden z-10">
            {onDeleteAIAnalysis && (
              <button
                onClick={onDeleteAIAnalysis}
                className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-sm text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 transition-colors"
                title="Hapus Analisis AI"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
            <button
              onClick={handlePrintAI}
              className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              title="Cetak Laporan AI"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </button>
          </div>
          <div id="ai-analysis-print-content" className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-amber-100 dark:border-amber-900/30 shadow-inner">
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
                      Visualisasi Sebaran Performa Kelas
                    </h4>
                  </div>
                  {renderClassPerformanceChart()}
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
                      Visualisasi Sebaran Performa Kelas
                    </h4>
                  </div>
                  {renderClassPerformanceChart()}
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
      )}

      {/* AI Analysis Loading State */}
      {(viewMode === "BOTH" || viewMode === "AI_ONLY") && !aiAnalysisResult && isGeneratingAI && (
        <div className="p-8 bg-white dark:bg-slate-800 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 shadow-sm flex flex-col items-center justify-center text-center space-y-4 my-6 animate-fade-in">
          <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/60 rounded-2xl flex items-center justify-center border border-indigo-100 dark:border-indigo-800">
            <div className="w-7 h-7 border-3 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              {aiProgressStatus?.message || "Memproses Analisis AI..."}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              Sistem sedang menganalisis sebaran hasil belajar, mendiagnosis akar miskonsepsi siswa, dan menyusun matriks diferensiasi secara non-blocking.
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
      {viewMode === "AI_ONLY" && !aiAnalysisResult && !isGeneratingAI && (
        <div className="p-10 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center space-y-3 my-6 animate-fade-in">
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/50 rounded-full flex items-center justify-center text-amber-500 text-xl">
            ✨
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
            Belum Ada Analisis AI
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
            Gunakan tombol "Buat Analisis AI" pada menu di atas untuk menghasilkan laporan diagnostik mendalam, matriks 4 jenjang, dan bank soal remedial secara otomatis.
          </p>
        </div>
      )}
    </div>
  );
};
