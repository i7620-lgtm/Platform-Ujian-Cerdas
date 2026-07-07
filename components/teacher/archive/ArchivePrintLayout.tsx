import React from "react";
import type { Exam, Result } from "../../../types";
import { PrintGeneralReport } from "./print/PrintGeneralReport";
import { PrintSchoolClassReport } from "./print/PrintSchoolClassReport";
import { PrintItemDifficulty } from "./print/PrintItemDifficulty";
import { PrintQuestionBank } from "./print/PrintQuestionBank";

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
  questionAnalysisData,
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
      />

      <PrintSchoolClassReport uniqueSchools={uniqueSchools} results={results} sortedResults={sortedResults} exam={exam} />

      <PrintItemDifficulty
        exam={exam}
        questionAnalysisData={questionAnalysisData}
      />

      <PrintQuestionBank exam={exam} />
    </div>
  );
};
