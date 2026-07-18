import React, { useState, useMemo } from "react";
import type { Exam, Result, TeacherProfile, ExamSummary } from "../../../types";
import { ChartBarIcon, SparklesIcon } from "../../Icons";
import { formatDuration } from "./archiveUtils";
import { archiveService } from "../../../services/archive";
import Markdown from "react-markdown";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";

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
}) => {
  const filteredResults = useMemo(() => {
    if (!results) return [];
    if (selectedSchool === "ALL") return results;
    return results.filter(r => (r.student.schoolName || exam.authorSchool || 'Unknown School') === selectedSchool);
  }, [results, selectedSchool, exam.authorSchool]);

  const chartData = useMemo(() => {
    return filteredResults.map(r => ({
      name: r.student.fullName || "Siswa",
      nilai: Number(r.score) || 0,
      kelas: r.student.class || "Tanpa Kelas",
    }));
  }, [filteredResults]);

  const stats = useMemo(() => {
    if (filteredResults.length === 0) return { mean: 0, stdDev: 0, count: 0 };
    const scores = filteredResults.map(r => Number(r.score) || 0);
    const n = scores.length;
    const mean = scores.reduce((sum, val) => sum + val, 0) / n;
    const variance = scores.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n > 1 ? n - 1 : 1);
    const stdDev = Math.sqrt(variance);
    return {
      mean: Math.round(mean * 10) / 10,
      stdDev: Math.round(stdDev * 10) / 10 || 5,
      count: n
    };
  }, [filteredResults]);

  const normalCurveData = useMemo(() => {
    if (filteredResults.length === 0) return [];

    const scores = filteredResults.map(r => Number(r.score) || 0);
    const n = scores.length;
    const mean = stats.mean;
    const stdDev = stats.stdDev || 5;

    const points = Array.from({ length: 11 }, (_, i) => i * 10);
    
    return points.map(x => {
      const minVal = x === 0 ? 0 : x - 5;
      const maxVal = x === 100 ? 100 : x + 4.99;
      
      const actualCount = scores.filter(s => s >= minVal && s <= maxVal).length;

      const exponent = -Math.pow(x - mean, 2) / (2 * Math.pow(stdDev, 2));
      const pdf = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
      const theoreticalFrequency = Number((pdf * n * 10).toFixed(2));

      return {
        score: x,
        label: `Nilai ${x}`,
        "Frekuensi Aktual": actualCount,
        "Kurva Normal": theoreticalFrequency,
      };
    });
  }, [filteredResults, stats]);

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

  let splitAnalysis = { before: "", after: "", splitFound: false };
  if (aiAnalysisResult) {
    const regex = /(?:^|\n)(#{1,6}\s+.*Evaluasi Nilai Rata-Rata Berdasarkan Standar Nasional.*|\*\*(?:Evaluasi Nilai Rata-Rata Berdasarkan Standar Nasional|Evaluasi Nilai Rata-Rata)\*\*:?)/i;
    const match = aiAnalysisResult.match(regex);
    if (match && match.index !== undefined) {
      const matchIndex = match.index;
      splitAnalysis = {
        before: aiAnalysisResult.substring(0, matchIndex),
        after: aiAnalysisResult.substring(matchIndex),
        splitFound: true
      };
    } else {
      splitAnalysis = { before: aiAnalysisResult, after: "", splitFound: false };
    }
  }

  const renderClassPerformanceChart = () => {
    if (filteredResults.length === 0) return null;
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="h-[380px] w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <LineChart
              data={normalCurveData}
              margin={{ top: 20, right: 30, left: 0, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis
                dataKey="score"
                tick={{ fill: '#64748b', fontSize: 10 }}
                label={{ value: 'Nilai Ujian', position: 'insideBottomRight', offset: -5, fill: '#64748b', fontSize: 10 }}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 10 }}
                label={{ value: 'Frekuensi (Siswa)', angle: -90, position: 'insideLeft', offset: 10, fill: '#64748b', fontSize: 10 }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 shadow-lg rounded-lg text-xs">
                        <p className="font-bold text-slate-800 dark:text-slate-100 mb-2">Rentang Nilai Sekitar: {label}</p>
                        <div className="space-y-1">
                          <p className="flex justify-between gap-4 text-slate-600 dark:text-slate-300">
                            <span>Frekuensi Aktual:</span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">{data["Frekuensi Aktual"]} siswa</span>
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend verticalAlign="top" height={36} />
              
              {exam.config.kkm && (
                <ReferenceLine
                  x={exam.config.kkm}
                  stroke="#f43f5e"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: `Batas KKM (${exam.config.kkm})`,
                    fill: '#f43f5e',
                    fontSize: 9,
                    position: 'insideTopRight',
                    offset: 5
                  }}
                />
              )}

              <Line
                type="monotone"
                dataKey="Frekuensi Aktual"
                stroke="#4f46e5"
                strokeWidth={2.5}
                activeDot={{ r: 6, strokeWidth: 0 }}
                dot={{ fill: '#4f46e5', r: 3, strokeWidth: 0 }}
                name="Frekuensi Aktual (Siswa)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
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
                    <Markdown>{splitAnalysis.before}</Markdown>
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
                      <Markdown>{splitAnalysis.after}</Markdown>
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
                    <Markdown>{aiAnalysisResult}</Markdown>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
