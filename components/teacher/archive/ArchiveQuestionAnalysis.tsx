import React from "react";
import type { Exam, Result } from "../../../types";
import { StatWidget, QuestionAnalysisItem } from "../views/SharedComponents";
import {
  ChartBarIcon,
  CheckCircleIcon,
  XMarkIcon,
  UserIcon,
  ClockIcon,
  ListBulletIcon,
  TableCellsIcon,
} from "../../Icons";
import { formatDuration } from "./archiveUtils";

interface ArchiveQuestionAnalysisProps {
  exam: Exam;
  filteredResults: Result[];
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  totalStudents: number;
  averageCompletionTime: number;
  categoryStats: { name: string; percentage: number }[];
  levelStats: { name: string; percentage: number }[];
  questionTypeStats: { type: string; typeName: string; percentage: number }[];
  questionStats: { id: string; correctRate: number }[];
  onUpdateKey?: (qId: string, newKey: string) => Promise<void>;
}

export const ArchiveQuestionAnalysis: React.FC<
  ArchiveQuestionAnalysisProps
> = ({
  exam,
  filteredResults,
  averageScore,
  highestScore,
  lowestScore,
  totalStudents,
  averageCompletionTime,
  categoryStats,
  levelStats,
  questionTypeStats,
  questionStats,
  onUpdateKey,
}) => {
  return (
    <div className="space-y-6">
      {/* Stat Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatWidget
          label="Rata-rata Nilai"
          value={averageScore}
          color="bg-indigo-50"
          icon={ChartBarIcon}
        />
        <StatWidget
          label="Tertinggi"
          value={highestScore}
          color="bg-emerald-50"
          icon={CheckCircleIcon}
        />
        <StatWidget
          label="Terendah"
          value={lowestScore}
          color="bg-rose-50"
          icon={XMarkIcon}
        />
        <StatWidget
          label="Partisipan"
          value={totalStudents}
          color="bg-blue-50"
          icon={UserIcon}
        />
        <StatWidget
          label="Rata-rata Waktu"
          value={formatDuration(averageCompletionTime)}
          color="bg-purple-50"
          icon={ClockIcon}
        />
      </div>

      {/* Progress Bars for Categories, Levels, Typology */}
      {(categoryStats.length > 0 ||
        levelStats.length > 0 ||
        questionTypeStats.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <ListBulletIcon className="w-4 h-4" /> Penguasaan Materi
              (Kategori)
            </h3>
            <div className="space-y-3">
              {categoryStats.length > 0 ? (
                categoryStats.map((stat) => (
                  <div key={stat.name}>
                    <div className="flex justify-between text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      <span>{stat.name}</span>
                      <span
                        className={
                          stat.percentage < 50
                            ? "text-rose-500"
                            : stat.percentage < 80
                              ? "text-amber-500"
                              : "text-emerald-600"
                        }
                      >
                        {stat.percentage}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 ${stat.percentage >= 80 ? "bg-emerald-500" : stat.percentage >= 50 ? "bg-amber-400" : "bg-rose-500"}`}
                        style={{ width: `${stat.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">Tidak ada data.</p>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <ChartBarIcon className="w-4 h-4" /> Tingkat Kesulitan (Level)
            </h3>
            <div className="space-y-3">
              {levelStats.length > 0 ? (
                levelStats.map((stat) => (
                  <div key={stat.name}>
                    <div className="flex justify-between text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      <span>{stat.name}</span>
                      <span
                        className={
                          stat.percentage < 50
                            ? "text-rose-500"
                            : stat.percentage < 80
                              ? "text-amber-500"
                              : "text-emerald-600"
                        }
                      >
                        {stat.percentage}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 ${stat.percentage >= 80 ? "bg-emerald-500" : stat.percentage >= 50 ? "bg-amber-400" : "bg-rose-500"}`}
                        style={{ width: `${stat.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">Tidak ada data.</p>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <TableCellsIcon className="w-4 h-4" /> Jenis Soal
            </h3>
            <div className="space-y-3">
              {questionTypeStats.length > 0 ? (
                questionTypeStats.map((stat) => (
                  <div key={stat.type}>
                    <div className="flex justify-between text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      <span>{stat.typeName}</span>
                      <span
                        className={
                          stat.percentage < 50
                            ? "text-rose-500"
                            : stat.percentage < 80
                              ? "text-amber-500"
                              : "text-emerald-600"
                        }
                      >
                        {stat.percentage}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 ${stat.percentage >= 80 ? "bg-emerald-500" : stat.percentage >= 50 ? "bg-amber-400" : "bg-rose-500"}`}
                        style={{ width: `${stat.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">Tidak ada data.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* List of Questions Analysis */}
      <div>
        <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <TableCellsIcon className="w-5 h-5 text-slate-400 dark:text-slate-500" />{" "}
          Analisis Butir Soal
        </h3>
        <div className="grid grid-cols-1 gap-4">
          {exam.questions
            .filter((q) => q.questionType !== "INFO")
            .map((q, idx) => {
              const stats = questionStats.find((s) => s.id === q.id) || {
                correctRate: 0,
              };
              return (
                <QuestionAnalysisItem
                  key={q.id}
                  q={q}
                  index={idx}
                  stats={stats}
                  examResults={filteredResults}
                  onUpdateKey={onUpdateKey}
                />
              );
            })}
        </div>
      </div>
    </div>
  );
};
