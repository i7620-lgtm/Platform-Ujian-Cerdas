import React from "react";
import type { Exam } from "../../../types";
import { ChartBarIcon } from "../../Icons";
import { formatDuration } from "./archiveUtils";

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
}

export const ArchiveClassAnalysis: React.FC<ArchiveClassAnalysisProps> = ({
  classAnalysisData,
  uniqueSchools,
  selectedSchool,
  exam,
}) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 dark:border-slate-700">
        <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
          <ChartBarIcon className="w-5 h-5 text-indigo-500" /> Analisis Umum Per
          Kelas
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Ringkasan performa dan ketuntasan belajar siswa dikelompokkan
          berdasarkan kelas.
        </p>
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
            {uniqueSchools.map((school) => {
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
    </div>
  );
};
