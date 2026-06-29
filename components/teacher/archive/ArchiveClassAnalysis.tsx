import React, { useState } from "react";
import type { Exam, Result, TeacherProfile, ExamSummary } from "../../../types";
import { ChartBarIcon, SparklesIcon } from "../../Icons";
import { formatDuration } from "./archiveUtils";
import { archiveService } from "../../../services/archive";
import Markdown from "react-markdown";

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
}

export const ArchiveClassAnalysis: React.FC<ArchiveClassAnalysisProps> = ({
  classAnalysisData,
  uniqueSchools,
  selectedSchool,
  exam,
  results = [],
  teacherProfile,
}) => {
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null);

  const handleGenerateAI = async () => {
    if (!teacherProfile?.isPremium) {
      alert("Fitur ini khusus untuk akun Premium. Silakan upgrade akun Anda.");
      return;
    }
    
    setIsGeneratingAI(true);
    setAiAnalysisResult(null);
    try {
      const summaries = archiveService.calculateExamStatistics(exam, results) as ExamSummary[];
      const analysis = await archiveService.generateAIAnalysis(summaries);
      setAiAnalysisResult(analysis);
    } catch (error: any) {
      setAiAnalysisResult("Gagal menghasilkan analisis AI: " + (error.message || "Terjadi kesalahan."));
    } finally {
      setIsGeneratingAI(false);
    }
  };

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

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateAI}
            disabled={isGeneratingAI}
            className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-bold rounded-lg shadow-md transition-all flex items-center gap-2 disabled:opacity-70"
          >
            {isGeneratingAI ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Menganalisis...
              </>
            ) : (
              <>
                <SparklesIcon className="w-4 h-4" />
                Buat Analisis AI
              </>
            )}
          </button>
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
                        {c.lowestScore} - {c.highestScore}
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
      
      {/* AI Analysis Section */}
      {aiAnalysisResult && (
        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 relative">
          <button
            onClick={handlePrintAI}
            className="absolute top-8 right-8 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors z-10 print:hidden"
            title="Cetak Laporan AI"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
          </button>
          <div id="ai-analysis-print-content" className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-amber-100 dark:border-amber-900/30 shadow-inner">
            <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-slate-800 dark:prose-headings:text-slate-100 prose-a:text-indigo-600 dark:prose-a:text-indigo-400">
              <div className="markdown-body">
                <Markdown>{aiAnalysisResult}</Markdown>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
