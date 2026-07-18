import React, { useMemo } from "react";
import type { Result, Exam } from "../../../../types";
import Markdown from "react-markdown";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from "recharts";

interface PrintAIAnalysisProps {
  title: string;
  content: string;
  results: Result[];
  exam: Exam;
}

export const PrintAIAnalysis: React.FC<PrintAIAnalysisProps> = ({ title, content, results, exam }) => {
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
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm mt-4 mb-6 avoid-break-inside">
        <div className="h-[250px] w-full">
            <LineChart
              width={600}
              height={250}
              data={normalCurveData}
              margin={{ top: 30, right: 30, left: 15, bottom: 10 }}
              style={{ width: "100%", height: "100%" }}
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
                  offset: 5,
                  fill: "#64748b",
                  fontSize: 10,
                  style: { textAnchor: 'middle' }
                }}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ top: -10 }} />
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

  const markdownComponents = {
    h1: ({node, ...props}: any) => <h1 className="break-after-avoid avoid-break-inside mt-4 mb-2 font-bold text-lg text-slate-900" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="break-after-avoid avoid-break-inside mt-4 mb-2 font-bold text-md text-slate-800" {...props} />,
    h3: ({node, ...props}: any) => <h3 className="break-after-avoid avoid-break-inside mt-3 mb-1 font-bold text-slate-800" {...props} />,
    h4: ({node, ...props}: any) => <h4 className="break-after-avoid avoid-break-inside mt-3 mb-1 font-bold text-slate-800" {...props} />,
    p: ({node, children, ...props}: any) => {
      // If the paragraph only contains a strong tag (like a school name), keep it with the next element
      const isSubheading = node?.children?.length === 1 && node?.children[0]?.tagName === 'strong';
      return <p className={`avoid-break-inside mb-2 ${isSubheading ? 'break-after-avoid font-bold' : ''}`} {...props}>{children}</p>;
    },
    ul: ({node, ...props}: any) => <ul className="mb-3 pl-4 list-disc" {...props} />,
    ol: ({node, ...props}: any) => <ol className="mb-3 pl-4 list-decimal" {...props} />,
    li: ({node, ...props}: any) => <li className="avoid-break-inside mb-1 pl-1" {...props} />,
  };

  return (
    <div className="mb-6 page-break-after-auto">
      <h3 className="font-bold text-sm uppercase tracking-wider mb-3 border-l-4 border-slate-800 pl-2 break-after-avoid">
        {title}
      </h3>
      <div className="prose prose-sm max-w-none text-slate-800 print-question-text">
        {splitAnalysis.splitFound ? (
          <>
            <div className="markdown-body">
              <Markdown components={markdownComponents}>{splitAnalysis.before}</Markdown>
            </div>
            {renderChart()}
            {splitAnalysis.after && (
              <div className="markdown-body mt-4">
                <Markdown components={markdownComponents}>{splitAnalysis.after}</Markdown>
              </div>
            )}
          </>
        ) : (
          <>
            {renderChart()}
            <div className="markdown-body mt-4">
              <Markdown components={markdownComponents}>{content}</Markdown>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
