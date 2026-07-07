import React from "react";
import { formatDuration } from "../archiveUtils";

interface PrintGeneralReportProps {
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  totalStudents: number;
  averageCompletionTime: number;
  categoryStats: { name: string; percentage: number }[];
  levelStats: { name: string; percentage: number }[];
  questionTypeStats: { type: string; typeName: string; percentage: number }[];
  uniqueSchools: string[];
}

export const PrintGeneralReport: React.FC<PrintGeneralReportProps> = ({
  averageScore,
  highestScore,
  lowestScore,
  totalStudents,
  averageCompletionTime,
  categoryStats,
  levelStats,
  questionTypeStats,
  uniqueSchools,
}) => {
  return (
      <div className="mb-8 avoid-break-inside">
        <h3 className="font-bold text-sm uppercase tracking-wider mb-3 border-l-4 border-slate-800 pl-2">
          1. Laporan Umum
        </h3>

        {/* Stats Grid */}
        <div className="grid grid-cols-5 gap-4 mb-4">
          <div className="border border-slate-300 p-3 rounded text-center bg-slate-50">
            <p className="text-[9px] font-bold text-slate-500 uppercase">
              Rata-rata Nilai
            </p>
            <p className="text-lg font-black">{averageScore}</p>
          </div>
          <div className="border border-slate-300 p-3 rounded text-center bg-slate-50">
            <p className="text-[9px] font-bold text-slate-500 uppercase">
              Rata-rata Waktu
            </p>
            <p className="text-lg font-black text-purple-700">
              {formatDuration(averageCompletionTime)}
            </p>
          </div>
          <div className="border border-slate-300 p-3 rounded text-center bg-slate-50">
            <p className="text-[9px] font-bold text-slate-500 uppercase">
              Tertinggi
            </p>
            <p className="text-lg font-black text-emerald-700">
              {highestScore}
            </p>
          </div>
          <div className="border border-slate-300 p-3 rounded text-center bg-slate-50">
            <p className="text-[9px] font-bold text-slate-500 uppercase">
              Terendah
            </p>
            <p className="text-lg font-black text-rose-700">{lowestScore}</p>
          </div>
          <div className="border border-slate-300 p-3 rounded text-center bg-slate-50">
            <p className="text-[9px] font-bold text-slate-500 uppercase">
              Partisipan
            </p>
            <p className="text-lg font-black text-blue-700">{totalStudents}</p>
          </div>
        </div>

        {/* School Summary Table */}
        {uniqueSchools.length > 1 && (
          <div className="mb-4">
            <p className="text-[10px] font-bold uppercase text-slate-500 mb-2">
              Ringkasan Per Sekolah
            </p>
            <table className="w-full border-collapse border border-slate-300 text-[10px]">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border border-slate-300 p-1 text-left">
                    Nama Sekolah
                  </th>
                  <th className="border border-slate-300 p-1 text-center w-16">
                    Siswa
                  </th>
                  <th className="border border-slate-300 p-1 text-center w-16">
                    Rerata Nilai
                  </th>
                  <th className="border border-slate-300 p-1 text-center w-20">
                    Rerata Waktu
                  </th>
                  <th className="border border-slate-300 p-1 text-center w-16">
                    Max
                  </th>
                  <th className="border border-slate-300 p-1 text-center w-16">
                    Min
                  </th>
                </tr>
              </thead>
              <tbody>
                {uniqueSchools.map((school) => {
                  const schoolResults = results.filter(
                    (r) => (r.student.schoolName || "Tanpa Sekolah") === school,
                  );
                  if (schoolResults.length === 0) return null;
                  const scores = schoolResults.map(
                    (r) => getCalculatedStats(r, exam).score,
                  );
                  const times = schoolResults
                    .map((r) => getCalculatedStats(r, exam).duration)
                    .filter((t) => t > 0);
                  const avg = Math.round(
                    scores.reduce((a, b) => a + b, 0) / schoolResults.length,
                  );
                  const avgTime =
                    times.length > 0
                      ? Math.round(
                          times.reduce((a, b) => a + b, 0) / times.length,
                        )
                      : 0;
                  const max = Math.max(...scores);
                  const min = Math.min(...scores);
                  return (
                    <tr key={school}>
                      <td className="border border-slate-300 p-1 font-bold">
                        {school}
                      </td>
                      <td className="border border-slate-300 p-1 text-center">
                        {schoolResults.length}
                      </td>
                      <td className="border border-slate-300 p-1 text-center font-bold">
                        {avg}
                      </td>
                      <td className="border border-slate-300 p-1 text-center font-mono text-purple-700">
                        {formatDuration(avgTime)}
                      </td>
                      <td className="border border-slate-300 p-1 text-center text-emerald-700">
                        {max}
                      </td>
                      <td className="border border-slate-300 p-1 text-center text-rose-700">
                        {min}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 mb-4">
          {/* Categories */}
          <div>
            <p className="text-[10px] font-bold uppercase mb-2 text-slate-500">
              Persentase Penguasaan Materi
            </p>
            <table className="w-full border-collapse border border-slate-300 text-[10px]">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border p-1 text-left">Kategori</th>
                  <th className="border p-1 text-right w-16">Penguasaan</th>
                </tr>
              </thead>
              <tbody>
                {categoryStats.length > 0 ? (
                  categoryStats.map((s) => {
                    let bgClass = "";
                    if (s.percentage >= 80) bgClass = "print-bg-green";
                    else if (s.percentage >= 50) bgClass = "print-bg-orange";
                    else bgClass = "print-bg-red";

                    return (
                      <tr key={s.name}>
                        <td className="border p-1">{s.name}</td>
                        <td
                          className={`border p-1 text-right font-bold ${bgClass}`}
                        >
                          {s.percentage}%
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={2} className="border p-1 italic text-center">
                      Data tidak tersedia
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Level */}
          <div>
            <p className="text-[10px] font-bold uppercase mb-2 text-slate-500">
              Persentase Tingkat Kesulitan
            </p>
            <table className="w-full border-collapse border border-slate-300 text-[10px]">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border p-1 text-left">Level</th>
                  <th className="border p-1 text-right w-16">Ketuntasan</th>
                </tr>
              </thead>
              <tbody>
                {levelStats.length > 0 ? (
                  levelStats.map((s) => {
                    let bgClass = "";
                    if (s.percentage >= 80) bgClass = "print-bg-green";
                    else if (s.percentage >= 50) bgClass = "print-bg-orange";
                    else bgClass = "print-bg-red";

                    return (
                      <tr key={s.name}>
                        <td className="border p-1">{s.name}</td>
                        <td
                          className={`border p-1 text-right font-bold ${bgClass}`}
                        >
                          {s.percentage}%
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={2} className="border p-1 italic text-center">
                      Data tidak tersedia
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Question Type */}
          <div>
            <p className="text-[10px] font-bold uppercase mb-2 text-slate-500">
              Persentase Jenis Soal
            </p>
            <table className="w-full border-collapse border border-slate-300 text-[10px]">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border p-1 text-left">Jenis</th>
                  <th className="border p-1 text-right w-16">Ketuntasan</th>
                </tr>
              </thead>
              <tbody>
                {questionTypeStats.length > 0 ? (
                  questionTypeStats.map((s) => {
                    let bgClass = "";
                    if (s.percentage >= 80) bgClass = "print-bg-green";
                    else if (s.percentage >= 50) bgClass = "print-bg-orange";
                    else bgClass = "print-bg-red";

                    return (
                      <tr key={s.type}>
                        <td className="border p-1">{s.typeName}</td>
                        <td
                          className={`border p-1 text-right font-bold ${bgClass}`}
                        >
                          {s.percentage}%
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={2} className="border p-1 italic text-center">
                      Data tidak tersedia
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

  );
};
