import React from "react";
import { ChartBarIcon } from "../../Icons";

interface AnalysisCardsProps {
  analysisData: {
    stats: { name: string; percentage: number }[];
    recommendation: string;
  };
  questionTypeStats: { type: string; typeName: string; percentage: number }[];
}

export const AnalysisCards: React.FC<AnalysisCardsProps> = ({
  analysisData,
  questionTypeStats,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* DIAGNOSTIC CARD */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 text-left space-y-4">
        <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <ChartBarIcon className="w-3.5 h-3.5" /> Analisis Kemampuan
        </h3>

        {analysisData.stats.length > 0 ? (
          <div className="space-y-3">
            {analysisData.stats.map((stat) => {
              const colorClass =
                stat.percentage >= 80
                  ? "bg-emerald-500"
                  : stat.percentage >= 50
                    ? "bg-amber-400"
                    : "bg-rose-500";
              return (
                <div key={stat.name}>
                  <div className="flex justify-between text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    <span>{stat.name}</span>
                    <span>{stat.percentage}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${colorClass} transition-all duration-1000`}
                      style={{ width: `${stat.percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 mt-2">
              <p className="text-[10px] italic text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                "{analysisData.recommendation}"
              </p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">
            Tidak ada data kategori.
          </p>
        )}
      </div>

      {/* QUESTION TYPE ANALYSIS CARD */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 text-left space-y-4">
        <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <ChartBarIcon className="w-3.5 h-3.5" /> Analisis Jenis Soal
        </h3>

        {questionTypeStats.length > 0 ? (
          <div className="space-y-3">
            {questionTypeStats.map((stat) => {
              const colorClass =
                stat.percentage >= 80
                  ? "bg-emerald-500"
                  : stat.percentage >= 50
                    ? "bg-amber-400"
                    : "bg-rose-500";
              return (
                <div key={stat.type}>
                  <div className="flex justify-between text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    <span>{stat.typeName}</span>
                    <span>{stat.percentage}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${colorClass} transition-all duration-1000`}
                      style={{ width: `${stat.percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">
            Tidak ada data jenis soal.
          </p>
        )}
      </div>
    </div>
  );
};
