import React, { useState, useMemo } from "react";
import type { Result } from "../../../types";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface ClassPerformanceDistributionProps {
  results: Result[];
  kkm?: number;
  subject?: string;
  className?: string;
}

type ViewChartMode = "HISTOGRAM" | "BOXPLOT" | "BOTH";

// Auto-scrolling student list for Histogram Tooltip (top-to-bottom, then bottom-to-top smoothly)
const AutoScrollStudentList: React.FC<{
  students: Array<{ name: string; score: number; absentNumber?: string; class?: string }>;
  isParentHovered?: boolean;
}> = ({ students, isParentHovered = false }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const isLocalHoveredRef = React.useRef(false);
  const animFrameRef = React.useRef<number | null>(null);
  const lastTimeRef = React.useRef<number | null>(null);
  const directionRef = React.useRef<"down" | "up">("down");
  const pauseUntilRef = React.useRef<number>(0);

  const isPaused = isParentHovered;

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.scrollTop = 0;
    directionRef.current = "down";
    pauseUntilRef.current = performance.now() + 1000;
    lastTimeRef.current = performance.now();

    const speed = 24; // gentle, comfortable scrolling speed (px/sec)

    const step = (now: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = now;
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = now;

      if (!isPaused && !isLocalHoveredRef.current && el) {
        const maxScroll = el.scrollHeight - el.clientHeight;
        if (maxScroll > 2) {
          if (now >= pauseUntilRef.current) {
            if (directionRef.current === "down") {
              el.scrollTop += speed * dt;
              if (el.scrollTop >= maxScroll - 0.5) {
                el.scrollTop = maxScroll;
                directionRef.current = "up";
                pauseUntilRef.current = now + 1400; // pause 1.4s at bottom to read
              }
            } else {
              el.scrollTop -= speed * dt;
              if (el.scrollTop <= 0.5) {
                el.scrollTop = 0;
                directionRef.current = "down";
                pauseUntilRef.current = now + 1400; // pause 1.4s at top to read
              }
            }
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(step);
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [students, isPaused]);

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => {
        isLocalHoveredRef.current = true;
      }}
      onMouseLeave={() => {
        isLocalHoveredRef.current = false;
        lastTimeRef.current = performance.now();
      }}
      onTouchStart={() => {
        isLocalHoveredRef.current = true;
      }}
      onTouchEnd={() => {
        isLocalHoveredRef.current = false;
        lastTimeRef.current = performance.now();
      }}
      className="max-h-36 overflow-y-auto space-y-1 custom-scrollbar pr-1"
    >
      {students.map((st, i) => (
        <div
          key={i}
          className="flex justify-between items-center text-[11px] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 px-1.5 py-0.5 rounded transition-colors"
        >
          <span className="truncate max-w-[170px]" title={st.name}>
            {st.absentNumber ? `(${st.absentNumber}) ` : ""}{st.name}
          </span>
          <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400 ml-2 shrink-0">
            {st.score}
          </span>
        </div>
      ))}
    </div>
  );
};

// Tooltip content with interactive pause on hover
const HistogramTooltipContent: React.FC<{ data: any }> = ({ data }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="bg-white dark:bg-slate-800 p-3.5 border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl text-xs max-w-xs space-y-2 pointer-events-auto"
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-2">
        <span className="font-bold text-slate-800 dark:text-slate-100">
          Rentang Skor: {data.displayRange}
        </span>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            data.status === "BELOW"
              ? "bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400"
              : data.status === "MIXED"
              ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
              : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {data.status === "BELOW"
            ? "Perlu Remedial"
            : data.status === "MIXED"
            ? "Transisi KKM"
            : "Tuntas KKM"}
        </span>
      </div>

      <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
        <span>Jumlah Siswa:</span>
        <span className="font-bold text-slate-900 dark:text-white">
          {data.count} siswa ({data.percentage}%)
        </span>
      </div>

      {data.students && data.students.length > 0 && (
        <div className="pt-1 border-t border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-400 font-medium">
              Daftar Siswa ({data.students.length}):
            </span>
            {data.students.length > 4 && (
              <span className="text-[9px] text-slate-400 italic">
                {isHovered ? "Jeda (scroll manual)" : "Auto-scroll aktif"}
              </span>
            )}
          </div>
          <AutoScrollStudentList students={data.students} isParentHovered={isHovered} />
        </div>
      )}
    </div>
  );
};

export const ClassPerformanceDistribution: React.FC<ClassPerformanceDistributionProps> = ({
  results,
  kkm,
  subject,
  className,
}) => {
  const [viewMode, setViewMode] = useState<ViewChartMode>("BOTH");
  const [hoveredOutlier, setHoveredOutlier] = useState<{
    name: string;
    score: number;
    type: "LOW" | "HIGH";
    class?: string;
  } | null>(null);

  // Filter valid results with numerical scores
  const validResults = useMemo(() => {
    return (results || []).filter(
      (r) => r.score !== undefined && r.score !== null && !isNaN(Number(r.score))
    );
  }, [results]);

  const sortedResults = useMemo(() => {
    return [...validResults].sort((a, b) => Number(a.score) - Number(b.score));
  }, [validResults]);

  const scores = useMemo(
    () => sortedResults.map((r) => Number(r.score)),
    [sortedResults]
  );

  // Comprehensive educational statistics
  const stats = useMemo(() => {
    const n = scores.length;
    if (n === 0) return null;

    const min = scores[0];
    const max = scores[n - 1];
    const sum = scores.reduce((acc, curr) => acc + curr, 0);
    const mean = Math.round((sum / n) * 10) / 10;

    const variance =
      scores.reduce((acc, curr) => acc + Math.pow(curr - mean, 2), 0) /
      (n > 1 ? n - 1 : 1);
    const stdDev = Math.round(Math.sqrt(variance) * 10) / 10;

    // Percentile function
    const getPercentile = (p: number) => {
      if (n === 1) return scores[0];
      const index = p * (n - 1);
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      const weight = index - lower;
      return scores[lower] * (1 - weight) + scores[upper] * weight;
    };

    const q1 = Math.round(getPercentile(0.25) * 10) / 10;
    const median = Math.round(getPercentile(0.5) * 10) / 10;
    const q3 = Math.round(getPercentile(0.75) * 10) / 10;
    const iqr = Math.round((q3 - q1) * 10) / 10;

    // Outlier bounds based on standard 1.5 * IQR rule (Tukey's Fences)
    const lowerFence = Math.round((q1 - 1.5 * iqr) * 10) / 10;
    const upperFence = Math.round((q3 + 1.5 * iqr) * 10) / 10;

    // Detect outliers
    const lowOutliers = sortedResults
      .filter((r) => Number(r.score) < lowerFence)
      .map((r) => ({
        name: r.student.fullName || "Siswa",
        score: Number(r.score),
        type: "LOW" as const,
        class: r.student.class,
        absentNumber: r.student.absentNumber,
      }));

    const highOutliers = sortedResults
      .filter((r) => Number(r.score) > upperFence)
      .map((r) => ({
        name: r.student.fullName || "Siswa",
        score: Number(r.score),
        type: "HIGH" as const,
        class: r.student.class,
        absentNumber: r.student.absentNumber,
      }));

    const allOutliers = [...lowOutliers, ...highOutliers];

    // Non-outlier min and max for whisker tips
    const nonOutlierScores = scores.filter(
      (s) => s >= lowerFence && s <= upperFence
    );
    const whiskerMin =
      nonOutlierScores.length > 0 ? nonOutlierScores[0] : min;
    const whiskerMax =
      nonOutlierScores.length > 0
        ? nonOutlierScores[nonOutlierScores.length - 1]
        : max;

    const kkmVal = kkm ?? 75;
    const passedCount = scores.filter((s) => s >= kkmVal).length;
    const passRate = Math.round((passedCount / n) * 1000) / 10;

    return {
      count: n,
      min,
      max,
      mean,
      stdDev,
      q1,
      median,
      q3,
      iqr,
      lowerFence,
      upperFence,
      whiskerMin,
      whiskerMax,
      lowOutliers,
      highOutliers,
      allOutliers,
      kkmVal,
      passedCount,
      passRate,
    };
  }, [scores, sortedResults, kkm]);

  // 10-point educational histogram bins
  const histogramData = useMemo(() => {
    if (!stats || stats.count === 0) return [];

    const bins = [
      { min: 0, max: 10, label: "0-10", displayLabel: "0 - 10" },
      { min: 10.001, max: 20, label: "11-20", displayLabel: "11 - 20" },
      { min: 20.001, max: 30, label: "21-30", displayLabel: "21 - 30" },
      { min: 30.001, max: 40, label: "31-40", displayLabel: "31 - 40" },
      { min: 40.001, max: 50, label: "41-50", displayLabel: "41 - 50" },
      { min: 50.001, max: 60, label: "51-60", displayLabel: "51 - 60" },
      { min: 60.001, max: 70, label: "61-70", displayLabel: "61 - 70" },
      { min: 70.001, max: 80, label: "71-80", displayLabel: "71 - 80" },
      { min: 80.001, max: 90, label: "81-90", displayLabel: "81 - 90" },
      { min: 90.001, max: 100, label: "91-100", displayLabel: "91 - 100" },
    ];

    const kkmVal = stats.kkmVal;

    return bins.map((b) => {
      const matched = sortedResults.filter((r) => {
        const sc = Number(r.score);
        return sc >= b.min && sc <= b.max;
      });

      const count = matched.length;
      const percentage = Number(((count / stats.count) * 100).toFixed(1));

      // Bar classification relative to KKM
      let status: "BELOW" | "MIXED" | "PASSED";
      if (b.max < kkmVal) {
        status = "BELOW";
      } else if (b.min < kkmVal && b.max >= kkmVal) {
        status = "MIXED";
      } else {
        status = "PASSED";
      }

      return {
        range: b.label,
        displayRange: b.displayLabel,
        count,
        percentage,
        status,
        students: matched.map((r) => ({
          name: r.student.fullName || "Siswa",
          score: Number(r.score),
          class: r.student.class,
          absentNumber: r.student.absentNumber,
        })),
      };
    });
  }, [stats, sortedResults]);

  if (!stats || stats.count === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 text-center border border-slate-200 dark:border-slate-800 text-slate-500 text-sm">
        Belum ada data nilai ujian yang dapat divisualisasikan.
      </div>
    );
  }

  // Calculate coordinates for SVG Box Plot on a 0-100 scale
  const boxPlotSvgWidth = 700;
  const boxPlotSvgHeight = 120;
  const paddingLeft = 40;
  const paddingRight = 40;
  const usableWidth = boxPlotSvgWidth - paddingLeft - paddingRight;

  const scoreToX = (val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    return paddingLeft + (clamped / 100) * usableWidth;
  };

  const boxY = 28;
  const boxHeight = 44;
  const boxCenterY = boxY + boxHeight / 2;

  const whiskerMinX = scoreToX(stats.whiskerMin);
  const whiskerMaxX = scoreToX(stats.whiskerMax);
  const q1X = scoreToX(stats.q1);
  const medianX = scoreToX(stats.median);
  const q3X = scoreToX(stats.q3);
  const meanX = scoreToX(stats.mean);
  const kkmX = scoreToX(stats.kkmVal);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
      {/* Header and View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </span>
            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-base">
              Distribusi Sebaran Skor Siswa
            </h4>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Analisis kepadatan nilai melalui Histogram dan dispersi statistik melalui Box Plot (Kuartil & Outlier).
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("HISTOGRAM")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "HISTOGRAM"
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            📊 Histogram
          </button>
          <button
            type="button"
            onClick={() => setViewMode("BOXPLOT")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "BOXPLOT"
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            📦 Box Plot
          </button>
          <button
            type="button"
            onClick={() => setViewMode("BOTH")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "BOTH"
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            📑 Tampilkan Semua
          </button>
        </div>
      </div>

      {/* KPI Quick Badges - Guaranteed identical 3-row layout and uniform heights */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Rata-rata */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/60 flex flex-col justify-between h-[96px]">
          <div className="h-6 flex items-center text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate" title="Rata-rata Kelas (Mean)">
            Rata-rata Kelas
          </div>
          <div className="h-8 flex items-baseline my-0.5">
            <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 leading-none">
              {stats.mean}
            </span>
          </div>
          <div className="h-4 flex items-center text-[10px] text-slate-400 dark:text-slate-400 truncate" title={`Std Dev: ±${stats.stdDev}`}>
            Std Dev: ±{stats.stdDev}
          </div>
        </div>

        {/* 2. Median */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/60 flex flex-col justify-between h-[96px]">
          <div className="h-6 flex items-center text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate" title="Nilai Median (Kuartil 2)">
            Nilai Median
          </div>
          <div className="h-8 flex items-baseline my-0.5">
            <span className="text-xl font-black text-amber-600 dark:text-amber-400 leading-none">
              {stats.median}
            </span>
          </div>
          <div className="h-4 flex items-center text-[10px] text-slate-400 dark:text-slate-400 truncate" title="Nilai Tengah (50%)">
            Nilai Tengah (Q2)
          </div>
        </div>

        {/* 3. Rentang IQR */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/60 flex flex-col justify-between h-[96px]">
          <div className="h-6 flex items-center text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate" title="Rentang Interkuartil (Q1 - Q3)">
            Rentang IQR
          </div>
          <div className="h-8 flex items-baseline my-0.5">
            <span className="text-xl font-black text-slate-800 dark:text-slate-100 leading-none">
              {stats.iqr}
            </span>
          </div>
          <div className="h-4 flex items-center text-[10px] text-slate-400 dark:text-slate-400 truncate" title={`Q1: ${stats.q1} • Q3: ${stats.q3}`}>
            Q1: {stats.q1} • Q3: {stats.q3}
          </div>
        </div>

        {/* 4. Min & Max */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/60 flex flex-col justify-between h-[96px]">
          <div className="h-6 flex items-center text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate" title="Rentang Skor Minimum - Maksimum">
            Skor Min - Max
          </div>
          <div className="h-8 flex items-baseline my-0.5">
            <span className="text-xl font-black text-slate-800 dark:text-slate-100 leading-none">
              {stats.min} - {stats.max}
            </span>
          </div>
          <div className="h-4 flex items-center text-[10px] text-slate-400 dark:text-slate-400 truncate" title={`Rentang Skor Total: ${stats.max - stats.min} Poin`}>
            Rentang: {stats.max - stats.min} Poin
          </div>
        </div>

        {/* 5. Ketuntasan */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/60 flex flex-col justify-between h-[96px]">
          <div className="h-6 flex items-center text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate" title={`Ketuntasan Siswa (KKM ${stats.kkmVal})`}>
            Ketuntasan
          </div>
          <div className="h-8 flex items-baseline my-0.5">
            <span className={`text-xl font-black leading-none ${stats.passRate >= 75 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
              {stats.passRate}%
            </span>
          </div>
          <div className="h-4 flex items-center text-[10px] text-slate-400 dark:text-slate-400 truncate" title={`${stats.passedCount} dari ${stats.count} Siswa Tuntas (KKM ${stats.kkmVal})`}>
            {stats.passedCount}/{stats.count} Tuntas (KKM {stats.kkmVal})
          </div>
        </div>

        {/* 6. Pencilan (Outlier) */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/60 flex flex-col justify-between h-[96px]">
          <div className="h-6 flex items-center text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate" title="Siswa Pencilan di Luar Batas 1.5 × IQR">
            Siswa Pencilan
          </div>
          <div className="h-8 flex items-baseline my-0.5">
            <span className="text-xl font-black text-purple-600 dark:text-purple-400 leading-none">
              {stats.allOutliers.length}
            </span>
          </div>
          <div className="h-4 flex items-center text-[10px] text-slate-400 dark:text-slate-400 truncate" title={stats.allOutliers.length > 0 ? `${stats.allOutliers.length} Siswa Perlu Pembinaan` : "Sebaran Skor Merata"}>
            {stats.allOutliers.length > 0 ? "Perlu Pembinaan" : "Sebaran Merata"}
          </div>
        </div>
      </div>

      {/* 1. HISTOGRAM SECTION */}
      {(viewMode === "HISTOGRAM" || viewMode === "BOTH") && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
              <h5 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                Histogram Frekuensi Nilai Siswa (Rentang 10 Poin)
              </h5>
            </div>
            {/* Color Legend */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-rose-500/80 inline-block"></span>
                <span className="text-slate-600 dark:text-slate-300 text-[11px]">
                  Di Bawah KKM (&lt;{stats.kkmVal})
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-indigo-500/80 inline-block"></span>
                <span className="text-slate-600 dark:text-slate-300 text-[11px]">
                  Rentang KKM ({stats.kkmVal})
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-emerald-500/80 inline-block"></span>
                <span className="text-slate-600 dark:text-slate-300 text-[11px]">
                  Tuntas KKM (&ge;{stats.kkmVal})
                </span>
              </div>
            </div>
          </div>

          <div className="h-[320px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart
                data={histogramData}
                margin={{ top: 25, right: 25, left: -10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-slate-700" />
                <XAxis
                  dataKey="range"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  label={{
                    value: "Rentang Nilai Ujian",
                    position: "insideBottom",
                    offset: -12,
                    fill: "#64748b",
                    fontSize: 11,
                  }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  label={{
                    value: "Jumlah Siswa",
                    angle: -90,
                    position: "insideLeft",
                    offset: 15,
                    fill: "#64748b",
                    fontSize: 11,
                  }}
                />
                <Tooltip
                  wrapperStyle={{ pointerEvents: "auto" }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return <HistogramTooltipContent data={data} />;
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {histogramData.map((entry, index) => {
                    let fillColor = "#10b981"; // Emerald for passed
                    if (entry.status === "BELOW") {
                      fillColor = "#f43f5e"; // Rose for below KKM
                    } else if (entry.status === "MIXED") {
                      fillColor = "#6366f1"; // Indigo for mixed/KKM border
                    }
                    return <Cell key={`cell-${index}`} fill={fillColor} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 2. BOX PLOT SECTION */}
      {(viewMode === "BOXPLOT" || viewMode === "BOTH") && (
        <div className="space-y-3 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <h5 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                Box Plot Sebaran & Identifikasi Pencilan (Outlier)
              </h5>
            </div>
            {/* Legend for Box Plot */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1">
                <span className="w-3 h-2.5 rounded-xs bg-indigo-500/30 border border-indigo-500 inline-block"></span>
                <span>IQR (Q1 - Q3)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-amber-500 inline-block"></span>
                <span>Median ({stats.median})</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rotate-45 bg-blue-600 inline-block"></span>
                <span>Rata-rata ({stats.mean})</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-0.5 border-t border-dashed border-rose-500 inline-block"></span>
                <span>KKM ({stats.kkmVal})</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600 ring-2 ring-purple-300 inline-block"></span>
                <span>Outlier</span>
              </div>
            </div>
          </div>

          {/* Responsive SVG Box Plot */}
          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-100 dark:border-slate-800 overflow-x-auto custom-scrollbar">
            <div className="min-w-[620px]">
              <svg
                viewBox={`0 0 ${boxPlotSvgWidth} ${boxPlotSvgHeight}`}
                className="w-full h-auto"
                style={{ overflow: "visible" }}
              >
                {/* Horizontal Background Grid Lines for 0..100 */}
                {Array.from({ length: 11 }, (_, i) => i * 10).map((tick) => {
                  const x = scoreToX(tick);
                  return (
                    <g key={tick}>
                      <line
                        x1={x}
                        y1={12}
                        x2={x}
                        y2={boxPlotSvgHeight - 22}
                        stroke="#94a3b8"
                        strokeOpacity="0.2"
                        strokeDasharray="2 2"
                      />
                      <text
                        x={x}
                        y={boxPlotSvgHeight - 6}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#64748b"
                        className="font-mono select-none"
                      >
                        {tick}
                      </text>
                    </g>
                  );
                })}

                {/* Main Axis Baseline */}
                <line
                  x1={paddingLeft}
                  y1={boxPlotSvgHeight - 22}
                  x2={boxPlotSvgWidth - paddingRight}
                  y2={boxPlotSvgHeight - 22}
                  stroke="#cbd5e1"
                  strokeWidth="1.5"
                />

                {/* KKM Target Line */}
                <line
                  x1={kkmX}
                  y1={12}
                  x2={kkmX}
                  y2={boxPlotSvgHeight - 22}
                  stroke="#f43f5e"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                />
                <text
                  x={kkmX}
                  y={10}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#f43f5e"
                  fontWeight="bold"
                >
                  KKM {stats.kkmVal}
                </text>

                {/* Left Whisker (whiskerMin to Q1) */}
                <line
                  x1={whiskerMinX}
                  y1={boxCenterY}
                  x2={q1X}
                  y2={boxCenterY}
                  stroke="#6366f1"
                  strokeWidth="2"
                />
                {/* Left Whisker End Cap */}
                <line
                  x1={whiskerMinX}
                  y1={boxCenterY - 10}
                  x2={whiskerMinX}
                  y2={boxCenterY + 10}
                  stroke="#6366f1"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Right Whisker (Q3 to whiskerMax) */}
                <line
                  x1={q3X}
                  y1={boxCenterY}
                  x2={whiskerMaxX}
                  y2={boxCenterY}
                  stroke="#6366f1"
                  strokeWidth="2"
                />
                {/* Right Whisker End Cap */}
                <line
                  x1={whiskerMaxX}
                  y1={boxCenterY - 10}
                  x2={whiskerMaxX}
                  y2={boxCenterY + 10}
                  stroke="#6366f1"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* The IQR Box (Q1 to Q3) */}
                <rect
                  x={q1X}
                  y={boxY}
                  width={Math.max(2, q3X - q1X)}
                  height={boxHeight}
                  rx="6"
                  fill="rgba(99, 102, 241, 0.22)"
                  stroke="#4f46e5"
                  strokeWidth="2"
                />

                {/* Median Bar inside Box */}
                <line
                  x1={medianX}
                  y1={boxY}
                  x2={medianX}
                  y2={boxY + boxHeight}
                  stroke="#d97706"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {/* Mean Diamond Indicator */}
                <polygon
                  points={`
                    ${meanX},${boxCenterY - 7}
                    ${meanX + 6},${boxCenterY}
                    ${meanX},${boxCenterY + 7}
                    ${meanX - 6},${boxCenterY}
                  `}
                  fill="#2563eb"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />

                {/* Whisker Min Label */}
                <text
                  x={whiskerMinX}
                  y={boxCenterY + 22}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#64748b"
                  fontWeight="600"
                >
                  Min: {stats.whiskerMin}
                </text>

                {/* Whisker Max Label */}
                <text
                  x={whiskerMaxX}
                  y={boxCenterY + 22}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#64748b"
                  fontWeight="600"
                >
                  Max: {stats.whiskerMax}
                </text>

                {/* Outlier Dots */}
                {stats.allOutliers.map((outlier, idx) => {
                  const ox = scoreToX(outlier.score);
                  return (
                    <g
                      key={idx}
                      className="cursor-pointer group"
                      onMouseEnter={() => setHoveredOutlier(outlier)}
                      onMouseLeave={() => setHoveredOutlier(null)}
                    >
                      <circle
                        cx={ox}
                        cy={boxCenterY}
                        r="6"
                        fill="#9333ea"
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="animate-pulse"
                      />
                      <circle
                        cx={ox}
                        cy={boxCenterY}
                        r="10"
                        fill="none"
                        stroke="#c084fc"
                        strokeWidth="1.5"
                        strokeDasharray="2 2"
                      />
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Hovered Outlier Indicator / Information */}
            {hoveredOutlier && (
              <div className="mt-2 p-2.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-lg flex items-center justify-between text-xs animate-fade-in">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                  <span className="text-slate-700 dark:text-slate-200 font-semibold">
                    {hoveredOutlier.name}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    ({hoveredOutlier.class || "Tanpa Kelas"})
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold">
                    Skor: {hoveredOutlier.score}
                  </span>
                  <span className="text-purple-600 dark:text-purple-400 font-medium">
                    {hoveredOutlier.type === "LOW"
                      ? "Pencilan Bawah (Perlu Pembinaan)"
                      : "Pencilan Atas (Potensi Pengayaan)"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Outlier Explanation Card */}
          <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {stats.allOutliers.length > 0 ? (
                  <span>Terdeteksi {stats.allOutliers.length} Siswa Pencilan (Outlier)</span>
                ) : (
                  <span>Sebaran Skor Normal & Homogen</span>
                )}
              </div>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                {stats.allOutliers.length > 0
                  ? "Siswa pencilan berada di luar rentang wajar kelas (1.5 × IQR). Siswa pencilan bawah membutuhkan remedial terarah, sedangkan pencilan atas siap menerima materi pengayaan."
                  : "Tidak ditemukan nilai pencilan ekstrem di luar batas Tukey (1.5 × IQR). Tingkat pemahaman siswa terdistribusi secara harmonis dan wajar."}
              </p>
            </div>

            {stats.allOutliers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 self-start md:self-auto">
                {stats.allOutliers.map((o, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 border border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300 font-medium text-[11px] shadow-xs"
                  >
                    <span className="font-bold">{o.score}</span>
                    <span className="truncate max-w-[110px]">{o.name}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
