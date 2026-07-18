import React, { useMemo } from "react";
import type { Exam, Result } from "../../../types";
import { PrintGeneralReport } from "./print/PrintGeneralReport";
import { PrintSchoolClassReport } from "./print/PrintSchoolClassReport";
import { PrintItemDifficulty } from "./print/PrintItemDifficulty";
import { PrintQuestionBank } from "./print/PrintQuestionBank";
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

const AIAnalysisSection: React.FC<{
  title: string;
  content: string;
  results: Result[];
  exam: Exam;
}> = ({ title, content, results, exam }) => {
  const stats = useMemo(() => {
    if (results.length === 0) return { mean: 0, stdDev: 0, count: 0 };
    const scores = results.map((r) => Number(r.score) || 0);
    const n = scores.length;
    const mean = scores.reduce((sum, val) => sum + val, 0) / n;
    const variance =
      scores.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      (n > 1 ? n - 1 : 1);
    const stdDev = Math.sqrt(variance);
    return {
      mean: Math.round(mean * 10) / 10,
      stdDev: Math.round(stdDev * 10) / 10 || 5,
      count: n,
    };
  }, [results]);

  const normalCurveData = useMemo(() => {
    if (results.length === 0) return [];
    const scores = results.map((r) => Number(r.score) || 0);
    const n = scores.length;
    const mean = stats.mean;
    const stdDev = stats.stdDev || 5;
    const points = Array.from({ length: 11 }, (_, i) => i * 10);

    return points.map((x) => {
      const minVal = x === 0 ? 0 : x - 5;
      const maxVal = x === 100 ? 100 : x + 4.99;

      const actualCount = scores.filter(
        (s) => s >= minVal && s <= maxVal
      ).length;
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
  }, [results, stats]);

  const renderChart = () => {
    if (results.length === 0) return null;
    return (
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm mt-4 mb-6 break-inside-avoid">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <LineChart
              data={normalCurveData}
              margin={{ top: 20, right: 30, left: 0, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
              <XAxis
                dataKey="score"
                tick={{ fill: "#64748b", fontSize: 10 }}
                label={{
                  value: "Nilai Ujian",
                  position: "insideBottomRight",
                  offset: -5,
                  fill: "#64748b",
                  fontSize: 10,
                }}
              />
              <YAxis
                tick={{ fill: "#64748b", fontSize: 10 }}
                label={{
                  value: "Frekuensi (Siswa)",
                  angle: -90,
                  position: "insideLeft",
                  offset: 10,
                  fill: "#64748b",
                  fontSize: 10,
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
                    fill: "#f43f5e",
                    fontSize: 9,
                    position: "insideTopRight",
                    offset: 5,
                  }}
                />
              )}

              <Line
                type="monotone"
                dataKey="Frekuensi Aktual"
                stroke="#4f46e5"
                strokeWidth={2.5}
                activeDot={{ r: 6, strokeWidth: 0 }}
                dot={{ fill: "#4f46e5", r: 3, strokeWidth: 0 }}
                name="Frekuensi Aktual (Siswa)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  let splitAnalysis = { before: "", after: "", splitFound: false };
  const regex = /(?:^|\n)(#{1,6}\s+.*Evaluasi Nilai Rata-Rata Berdasarkan Standar Nasional.*|\*\*(?:Evaluasi Nilai Rata-Rata Berdasarkan Standar Nasional|Evaluasi Nilai Rata-Rata)\*\*:?)/i;
  const match = content.match(regex);
  if (match && match.index !== undefined) {
    splitAnalysis = {
      before: content.substring(0, match.index),
      after: content.substring(match.index),
      splitFound: true,
    };
  } else {
    splitAnalysis = { before: content, after: "", splitFound: false };
  }

  return (
    <div className="mb-8 avoid-break-inside">
      <h3 className="text-lg font-bold text-slate-800 border-b border-slate-300 pb-1 mb-3">
        {title}
      </h3>
      <div className="prose prose-sm max-w-none print-question-text">
        {splitAnalysis.splitFound ? (
          <>
            <div className="markdown-body">
              <Markdown>{splitAnalysis.before}</Markdown>
            </div>
            {renderChart()}
            {splitAnalysis.after && (
              <div className="markdown-body mt-4">
                <Markdown>{splitAnalysis.after}</Markdown>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-4">
               <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                 </svg>
                 Visualisasi Sebaran Performa Kelas
               </h4>
            </div>
            {renderChart()}
            <div className="markdown-body mt-4">
              <Markdown>{content}</Markdown>
            </div>
          </>
        )}
      </div>
    </div>
  );
};


interface ArchivePrintLayoutProps {
  exam: Exam;
  results: Result[];
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  totalStudents: number;
  averageCompletionTime: number;
  categoryStats: { name: string; percentage: number }[];
  levelStats: { name: string; percentage: number }[];
  questionTypeStats: { type: string; typeName: string; percentage: number }[];
  uniqueSchools: string[];
  sortedResults: Result[];
  questionAnalysisData: {
    id: string;
    correctRate: number;
    options?: string[];
    distribution: Record<string, number>;
  }[];
  ai_analyses?: Record<string, string>;
}

export const ArchivePrintLayout: React.FC<ArchivePrintLayoutProps> = ({
  exam,
  results,
  averageScore,
  highestScore,
  lowestScore,
  totalStudents,
  averageCompletionTime,
  categoryStats,
  levelStats,
  questionTypeStats,
  uniqueSchools,
  sortedResults,
  questionAnalysisData,
  ai_analyses,
}) => {
  return (
    <div className="hidden print:block text-slate-900 bg-white">
      {/* Global Header */}
      <div className="border-b-2 border-slate-900 pb-2 mb-6">
        <h1 className="text-2xl font-black uppercase tracking-tight">
          {exam.config.subject}
        </h1>
        <div className="flex justify-between items-end mt-2">
          <div className="text-xs font-bold text-slate-600">
            <p>
              KODE UJIAN:{" "}
              <span className="font-code slashed-zero text-slate-900 text-sm bg-slate-100 px-1">
                {exam.code}
              </span>
            </p>
            <p>
              TANGGAL:{" "}
              {exam.config.date
                ? new Date(exam.config.date).toLocaleDateString("id-ID", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "-"}
            </p>
            <p>SEKOLAH: {exam.authorSchool || "-"}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-500 uppercase">
              Arsip Lengkap Ujian
            </p>
          </div>
        </div>
      </div>

      <PrintGeneralReport
        averageScore={averageScore}
        highestScore={highestScore}
        lowestScore={lowestScore}
        totalStudents={totalStudents}
        averageCompletionTime={averageCompletionTime}
        categoryStats={categoryStats}
        levelStats={levelStats}
        questionTypeStats={questionTypeStats}
        uniqueSchools={uniqueSchools}
        results={results}
        exam={exam}
      />

      <PrintSchoolClassReport uniqueSchools={uniqueSchools} results={results} sortedResults={sortedResults} exam={exam} />

      <PrintItemDifficulty
        exam={exam}
        results={results}
        questionAnalysisData={questionAnalysisData}
      />

      <PrintQuestionBank exam={exam} />

      {ai_analyses && Object.keys(ai_analyses).length > 0 && (
        <div className="page-break mt-10 border-t-2 border-slate-900 pt-6">
          <h2 className="text-xl font-black uppercase tracking-tight mb-4">
            ✨ Laporan Analisis Lanjutan AI
          </h2>
                    {Object.entries(ai_analyses).map(([key, content]) => {
            let title = "Analisis Keseluruhan";
            let filteredResults = results;
            if (key !== "OVERALL") {
              const match = key.match(/school_(.*)_class_(.*)/);
              if (match) {
                title = `Analisis Kelas: ${match[2]} (${match[1]})`;
                filteredResults = results.filter(
                  (r) =>
                    (r.student.schoolName || exam.authorSchool || "Unknown School") === match[1] &&
                    r.student.class === match[2]
                );
              } else {
                title = `Analisis: ${key}`;
              }
            }
            return (
              <AIAnalysisSection
                key={key}
                title={title}
                content={content}
                results={filteredResults}
                exam={exam}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
