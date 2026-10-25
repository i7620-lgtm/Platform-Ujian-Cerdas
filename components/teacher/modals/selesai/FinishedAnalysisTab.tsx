import React from "react";
import type { Exam, Result } from "../../../../types";
import {
  ChartBarIcon,
  CheckCircleIcon,
  XMarkIcon,
  UserIcon,
  ClockIcon,
  ListBulletIcon,
  TableCellsIcon,
} from "../../../Icons";
import { QuestionAnalysisItem, StatWidget } from "../../DashboardViews";

interface FinishedAnalysisTabProps {
  displayExam: Exam;
  results: Result[];
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  totalStudents: number;
  averageCompletionTime: number;
  formatDuration: (seconds: number | undefined | null) => string;
  categoryStats: Array<{ name: string; percentage: number }>;
  levelStats: Array<{ name: string; percentage: number }>;
  questionTypeStats: Array<{
    type: string;
    typeName: string;
    percentage: number;
  }>;
  questionStats: Array<{ id: string; correctRate: number }>;
  handleUpdateKey: (qId: string, newKey: string) => Promise<void>;
  olympiadMedalDistribution?: {
    gold: { count: number; pct: number };
    silver: { count: number; pct: number };
    bronze: { count: number; pct: number };
    participant: { count: number; pct: number };
    maxPossibleScore: number;
    minPossibleScore: number;
  } | null;
}

export const FinishedAnalysisTab: React.FC<FinishedAnalysisTabProps> = ({
  displayExam,
  results,
  averageScore,
  highestScore,
  lowestScore,
  totalStudents,
  averageCompletionTime,
  formatDuration,
  categoryStats,
  levelStats,
  questionTypeStats,
  questionStats,
  handleUpdateKey,
  olympiadMedalDistribution,
}) => {
  const isOlympiad = !!displayExam.config?.isOlympiadMode;

  return (
    <div className="space-y-8 font-sans">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatWidget
          label={isOlympiad ? "Rata-rata Skor" : "Rata-rata"}
          value={isOlympiad ? `${averageScore} pt` : averageScore}
          color="bg-indigo-50"
          icon={ChartBarIcon}
        />
        <StatWidget
          label={isOlympiad ? "Skor Tertinggi" : "Tertinggi"}
          value={isOlympiad ? `${highestScore} pt` : highestScore}
          color="bg-emerald-50"
          icon={CheckCircleIcon}
        />
        <StatWidget
          label={isOlympiad ? "Skor Terendah" : "Terendah"}
          value={isOlympiad ? `${lowestScore} pt` : lowestScore}
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

      {/* OLYMPIAD MEDAL DISTRIBUTION CARD */}
      {isOlympiad && olympiadMedalDistribution && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-amber-200/60 dark:border-amber-900/40 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-600"></div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span>🏆</span> Distribusi Medali & Capaian Olimpiade
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Evaluasi capaian peserta berdasarkan rentang skor olimpiade resmi (Skor Maksimal: {olympiadMedalDistribution.maxPossibleScore} pt).
              </p>
            </div>
            <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 self-start sm:self-auto">
              Mode Olimpiade
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* GOLD */}
            <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <span>🥇</span> Medali Emas
                </span>
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-700">
                  &ge; 85%
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-3xl font-black text-amber-900 dark:text-amber-100">
                  {olympiadMedalDistribution.gold.count}
                </span>
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                  {olympiadMedalDistribution.gold.pct}% siswa
                </span>
              </div>
              <div className="h-1.5 w-full bg-amber-200 dark:bg-amber-900/60 rounded-full overflow-hidden mt-3">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-1000"
                  style={{ width: `${olympiadMedalDistribution.gold.pct}%` }}
                ></div>
              </div>
            </div>

            {/* SILVER */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span>🥈</span> Medali Perak
                </span>
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 font-mono bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                  70% - 84.9%
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-3xl font-black text-slate-800 dark:text-slate-100">
                  {olympiadMedalDistribution.silver.count}
                </span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  {olympiadMedalDistribution.silver.pct}% siswa
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-3">
                <div
                  className="h-full bg-slate-400 rounded-full transition-all duration-1000"
                  style={{ width: `${olympiadMedalDistribution.silver.pct}%` }}
                ></div>
              </div>
            </div>

            {/* BRONZE */}
            <div className="p-4 rounded-2xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/40 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-orange-900 dark:text-orange-200 flex items-center gap-1.5">
                  <span>🥉</span> Medali Perunggu
                </span>
                <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400 font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-orange-200 dark:border-orange-700">
                  50% - 69.9%
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-3xl font-black text-orange-900 dark:text-orange-100">
                  {olympiadMedalDistribution.bronze.count}
                </span>
                <span className="text-xs font-bold text-orange-700 dark:text-orange-400">
                  {olympiadMedalDistribution.bronze.pct}% siswa
                </span>
              </div>
              <div className="h-1.5 w-full bg-orange-200 dark:bg-orange-900/60 rounded-full overflow-hidden mt-3">
                <div
                  className="h-full bg-orange-500 rounded-full transition-all duration-1000"
                  style={{ width: `${olympiadMedalDistribution.bronze.pct}%` }}
                ></div>
              </div>
            </div>

            {/* PARTICIPANT */}
            <div className="p-4 rounded-2xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/40 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                  <span>🎗️</span> Peserta
                </span>
                <span className="text-[10px] font-bold text-sky-700 dark:text-sky-400 font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-sky-200 dark:border-sky-700">
                  &lt; 50%
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-3xl font-black text-sky-900 dark:text-sky-100">
                  {olympiadMedalDistribution.participant.count}
                </span>
                <span className="text-xs font-bold text-sky-700 dark:text-sky-400">
                  {olympiadMedalDistribution.participant.pct}% siswa
                </span>
              </div>
              <div className="h-1.5 w-full bg-sky-200 dark:bg-sky-900/60 rounded-full overflow-hidden mt-3">
                <div
                  className="h-full bg-sky-500 rounded-full transition-all duration-1000"
                  style={{ width: `${olympiadMedalDistribution.participant.pct}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category & Level Statistics */}
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
                          stat.percentage < 55
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

      <div>
        <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <TableCellsIcon className="w-5 h-5 text-slate-400 dark:text-slate-500" />
          Analisis Butir Soal
        </h3>
        <div className="grid grid-cols-1 gap-4">
          {displayExam.questions
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
                  examResults={results}
                  onUpdateKey={handleUpdateKey}
                />
              );
            })}
        </div>
      </div>
    </div>
  );
};
