import React from "react";
import type { Exam, Result } from "../../../types";
import { PrintGeneralReport } from "./print/PrintGeneralReport";
import { PrintSchoolClassReport } from "./print/PrintSchoolClassReport";
import { PrintItemDifficulty } from "./print/PrintItemDifficulty";
import { PrintQuestionBank } from "./print/PrintQuestionBank";
import Markdown from "react-markdown";

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
            if (key !== "OVERALL") {
              const match = key.match(/school_(.*)_class_(.*)/);
              if (match) {
                title = `Analisis Kelas: ${match[2]} (${match[1]})`;
              } else {
                title = `Analisis: ${key}`;
              }
            }
            return (
              <div key={key} className="mb-8 avoid-break-inside">
                <h3 className="text-lg font-bold text-slate-800 border-b border-slate-300 pb-1 mb-3">
                  {title}
                </h3>
                <div className="prose prose-sm max-w-none print-question-text">
                  <div className="markdown-body">
                    <Markdown>{content}</Markdown>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
