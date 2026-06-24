import React from "react";
import type { Exam, Result } from "../../../types";
import {
  checkAnswerStatus,
  getCalculatedStats,
  formatDuration,
} from "./archiveUtils";
import { isAnswerMatch, parseList } from "../examUtils";
import { CheckCircleIcon } from "../../Icons";

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
  sortedResults,
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

      {/* 1. GENERAL REPORT */}
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

      {/* 2. LAPORAN PER SEKOLAH & KELAS */}
      {uniqueSchools.map((schoolName, schoolIdx) => {
        const schoolClasses = Array.from(
          new Set(
            sortedResults
              .filter(
                (r) => (r.student.schoolName || "Tanpa Sekolah") === schoolName,
              )
              .map((r) => r.student.class),
          ),
        ).sort((a, b) =>
          a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
        );

        return (
          <div key={schoolName} className="break-before-page pt-4">
            <div className="bg-slate-900 text-white p-4 mb-4 rounded-lg flex justify-between items-center break-after-avoid">
              <h2 className="text-xl font-black uppercase tracking-widest">
                SEKOLAH: {schoolName}
              </h2>
              <span className="text-xs font-bold opacity-70">
                Bagian {schoolIdx + 2}
              </span>
            </div>

            {schoolClasses.map((className, classIdx) => {
              const classResults = sortedResults.filter(
                (r) =>
                  (r.student.schoolName || "Tanpa Sekolah") === schoolName &&
                  r.student.class === className,
              );
              const classTotal = classResults.length;
              const classScores = classResults.map(
                (r) => getCalculatedStats(r, exam).score,
              );
              const classAvg =
                classTotal > 0
                  ? Math.round(
                      classScores.reduce((a, b) => a + b, 0) / classTotal,
                    )
                  : 0;
              const classMax = classTotal > 0 ? Math.max(...classScores) : 0;
              const classMin = classTotal > 0 ? Math.min(...classScores) : 0;
              const classTimes = classResults
                .map((r) => getCalculatedStats(r, exam).duration)
                .filter((t) => t > 0);
              const classAvgTime =
                classTimes.length > 0
                  ? Math.round(
                      classTimes.reduce((a, b) => a + b, 0) / classTimes.length,
                    )
                  : 0;

              return (
                <div key={`${schoolName}-${className}`} className="mb-8">
                  <div className="mb-4">
                    <div className="avoid-break">
                      <h3 className="font-bold text-sm uppercase tracking-wider mb-3 border-l-4 border-slate-800 pl-2 break-after-avoid">
                        {schoolIdx + 2}.{classIdx + 1}. Laporan Kelas{" "}
                        {className}
                      </h3>

                      {/* A. CLASS ANALYSIS */}
                      <div className="mb-4 bg-white border border-slate-300 rounded p-4">
                        <h4 className="font-bold text-xs uppercase mb-2 text-slate-600">
                          A. Analisis Kelas {className} ({schoolName})
                        </h4>

                        {/* Stat Grid */}
                        <div className="grid grid-cols-5 gap-4 text-center mb-6">
                          <div className="p-2 bg-slate-50 rounded border border-slate-200">
                            <span className="block text-slate-500 uppercase text-[9px] font-bold">
                              Rata-rata Nilai
                            </span>
                            <span className="font-black text-lg text-slate-800">
                              {classAvg}
                            </span>
                          </div>
                          <div className="p-2 bg-purple-50 rounded border border-purple-100">
                            <span className="block text-purple-600 uppercase text-[9px] font-bold">
                              Rata-rata Waktu
                            </span>
                            <span className="font-black text-lg text-purple-700">
                              {formatDuration(classAvgTime)}
                            </span>
                          </div>
                          <div className="p-2 bg-emerald-50 rounded border border-emerald-100">
                            <span className="block text-emerald-600 uppercase text-[9px] font-bold">
                              Tertinggi
                            </span>
                            <span className="font-black text-lg text-emerald-700">
                              {classMax}
                            </span>
                          </div>
                          <div className="p-2 bg-rose-50 rounded border border-rose-100">
                            <span className="block text-rose-600 uppercase text-[9px] font-bold">
                              Terendah
                            </span>
                            <span className="font-black text-lg text-rose-700">
                              {classMin}
                            </span>
                          </div>
                          <div className="p-2 bg-blue-50 rounded border border-blue-100">
                            <span className="block text-blue-600 uppercase text-[9px] font-bold">
                              Partisipan
                            </span>
                            <span className="font-black text-lg text-blue-700">
                              {classTotal}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Class Analysis Details (Categories, Difficulty, Type) */}
                    <div className="mb-4 bg-white border border-slate-300 rounded p-4 avoid-break">
                      <p className="text-[10px] font-bold uppercase mb-3 text-slate-500">
                        Detail Penguasaan Materi, Level, dan Jenis Soal
                      </p>
                      {(() => {
                        // Create inline summaries specifically for this classroom
                        const matchingQ = exam.questions.filter(
                          (qi) => qi.questionType !== "INFO",
                        );

                        // Simple counts
                        let classCatStats: {
                          name: string;
                          percentage: number;
                        }[] = [];
                        let classLevelStats: {
                          name: string;
                          percentage: number;
                        }[] = [];
                        let classTypeStats: {
                          type: string;
                          typeName: string;
                          percentage: number;
                        }[] = [];

                        // Class categories mapping
                        const catMap: Record<
                          string,
                          { correct: number; total: number }
                        > = {};
                        const lvlMap: Record<
                          string,
                          { correct: number; total: number }
                        > = {};
                        const typMap: Record<
                          string,
                          { correct: number; total: number }
                        > = {};

                        matchingQ.forEach((q) => {
                          const cat = q.category || "Lainnya";
                          const lvl = q.level || "Sedang";
                          const typ = q.questionType;

                          if (!catMap[cat])
                            catMap[cat] = { correct: 0, total: 0 };
                          if (!lvlMap[lvl])
                            lvlMap[lvl] = { correct: 0, total: 0 };
                          if (!typMap[typ])
                            typMap[typ] = { correct: 0, total: 0 };

                          classResults.forEach((res) => {
                            const status = checkAnswerStatus(q, res.answers);
                            const isCorrect = status === "CORRECT";
                            catMap[cat].total++;
                            lvlMap[lvl].total++;
                            typMap[typ].total++;
                            if (isCorrect) {
                              catMap[cat].correct++;
                              lvlMap[lvl].correct++;
                              typMap[typ].correct++;
                            }
                          });
                        });

                        classCatStats = Object.entries(catMap).map(
                          ([k, v]) => ({
                            name: k,
                            percentage:
                              v.total > 0
                                ? Math.round((v.correct / v.total) * 100)
                                : 0,
                          }),
                        );
                        classLevelStats = Object.entries(lvlMap).map(
                          ([k, v]) => ({
                            name: k,
                            percentage:
                              v.total > 0
                                ? Math.round((v.correct / v.total) * 100)
                                : 0,
                          }),
                        );

                        const nameMap: Record<string, string> = {
                          MULTIPLE_CHOICE: "Pilihan Ganda",
                          COMPLEX_MULTIPLE_CHOICE: "Pilihan Ganda Kompleks",
                          TRUE_FALSE: "Benar / Salah",
                          MATCHING: "Menjodohkan",
                          FILL_IN_THE_BLANK: "Isian Singkat",
                          ESSAY: "Uraian / Essay",
                        };
                        classTypeStats = Object.entries(typMap).map(
                          ([k, v]) => ({
                            type: k,
                            typeName: nameMap[k] || k,
                            percentage:
                              v.total > 0
                                ? Math.round((v.correct / v.total) * 100)
                                : 0,
                          }),
                        );

                        return (
                          <div className="grid grid-cols-3 gap-4">
                            {/* Categories */}
                            <div>
                              <p className="text-[10px] font-bold uppercase mb-2 text-slate-500">
                                Persentase Penguasaan Materi
                              </p>
                              <table className="w-full border-collapse border border-slate-300 text-[10px]">
                                <thead className="bg-slate-100">
                                  <tr>
                                    <th className="border p-1 text-left">
                                      Kategori
                                    </th>
                                    <th className="border p-1 text-right w-16">
                                      Penguasaan
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {classCatStats.length > 0 ? (
                                    classCatStats.map((s) => {
                                      let bgClass = "";
                                      if (s.percentage >= 80)
                                        bgClass = "print-bg-green";
                                      else if (s.percentage >= 50)
                                        bgClass = "print-bg-orange";
                                      else bgClass = "print-bg-red";

                                      return (
                                        <tr key={s.name}>
                                          <td className="border p-1">
                                            {s.name}
                                          </td>
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
                                      <td
                                        colSpan={2}
                                        className="border p-1 italic text-center"
                                      >
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
                                    <th className="border p-1 text-left">
                                      Level
                                    </th>
                                    <th className="border p-1 text-right w-16">
                                      Ketuntasan
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {classLevelStats.length > 0 ? (
                                    classLevelStats.map((s) => {
                                      let bgClass = "";
                                      if (s.percentage >= 80)
                                        bgClass = "print-bg-green";
                                      else if (s.percentage >= 50)
                                        bgClass = "print-bg-orange";
                                      else bgClass = "print-bg-red";

                                      return (
                                        <tr key={s.name}>
                                          <td className="border p-1">
                                            {s.name}
                                          </td>
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
                                      <td
                                        colSpan={2}
                                        className="border p-1 italic text-center"
                                      >
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
                                    <th className="border p-1 text-left">
                                      Jenis
                                    </th>
                                    <th className="border p-1 text-right w-16">
                                      Ketuntasan
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {classTypeStats.length > 0 ? (
                                    classTypeStats.map((s) => {
                                      let bgClass = "";
                                      if (s.percentage >= 80)
                                        bgClass = "print-bg-green";
                                      else if (s.percentage >= 50)
                                        bgClass = "print-bg-orange";
                                      else bgClass = "print-bg-red";

                                      return (
                                        <tr key={s.type}>
                                          <td className="border p-1">
                                            {s.typeName}
                                          </td>
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
                                      <td
                                        colSpan={2}
                                        className="border p-1 italic text-center"
                                      >
                                        Data tidak tersedia
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* B. REKAPITULASI HASIL KELAS */}
                    <div className="mb-4 avoid-break">
                      <h4 className="font-bold text-xs uppercase mb-2 text-slate-600">
                        B. Rekapitulasi Hasil Kelas {className}
                      </h4>
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full border-collapse border border-slate-300 text-[9px] min-w-[600px]">
                          <thead>
                            <tr className="bg-slate-100">
                              <th className="border border-slate-300 p-1 text-center w-8">
                                No
                              </th>
                              <th className="border border-slate-300 p-1 text-left w-40 whitespace-nowrap">
                                Nama Siswa
                              </th>
                              <th className="border border-slate-300 p-1 text-center w-10">
                                Nilai
                              </th>
                              <th className="border border-slate-300 p-1 text-center w-16">
                                Waktu
                              </th>
                              <th className="border border-slate-300 p-1 text-left">
                                Rincian Jawaban (Hijau: Benar, Merah: Salah,
                                Abu: Kosong)
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {classResults.map((r, index) => {
                              const { score, duration } = getCalculatedStats(
                                r,
                                exam,
                              );
                              return (
                                <tr
                                  key={r.student.studentId}
                                  className="avoid-break"
                                >
                                  <td className="border border-slate-300 p-1 text-center">
                                    {index + 1}
                                  </td>
                                  <td className="border border-slate-300 p-1 font-bold whitespace-nowrap">
                                    {r.student.fullName}
                                  </td>
                                  <td className="border border-slate-300 p-1 text-center font-bold text-sm">
                                    {score}
                                  </td>
                                  <td className="border border-slate-300 p-1 text-center font-mono">
                                    {formatDuration(duration)}
                                  </td>
                                  <td className="border border-slate-300 p-1">
                                    <div className="flex flex-wrap gap-0.5">
                                      {exam.questions
                                        .filter(
                                          (q) => q.questionType !== "INFO",
                                        )
                                        .map((q, idx) => {
                                          const status = checkAnswerStatus(
                                            q,
                                            r.answers,
                                          );
                                          let bgClass = "print-bg-gray";
                                          if (status === "CORRECT")
                                            bgClass = "print-bg-green";
                                          else if (status === "WRONG")
                                            bgClass = "print-bg-red";

                                          return (
                                            <div
                                              key={q.id}
                                              className={`w-4 h-4 flex items-center justify-center text-[8px] font-bold border border-transparent ${bgClass}`}
                                            >
                                              {idx + 1}
                                            </div>
                                          );
                                        })}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* C. ANALISIS INDIVIDU KELAS */}
                    <div className="mb-4 avoid-break">
                      <h4 className="font-bold text-xs uppercase mb-2 text-slate-600">
                        C. Analisis Individu Kelas {className}
                      </h4>
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full border-collapse border border-slate-300 text-[9px] min-w-[600px]">
                          <thead>
                            <tr className="bg-slate-100">
                              <th className="border border-slate-300 p-1 text-center w-8">
                                No
                              </th>
                              <th className="border border-slate-300 p-1 text-left w-32 whitespace-nowrap">
                                Nama Siswa
                              </th>
                              <th className="border border-slate-300 p-1 text-left">
                                Analisis Kategori (Penguasaan)
                              </th>
                              <th className="border border-slate-300 p-1 text-left w-48">
                                Rekomendasi Tindakan
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {classResults.map((r, index) => {
                              const analysis =
                                sortedResults.length > 0
                                  ? // Calculate action trigger action categories
                                    (() => {
                                      let correct = 0;
                                      let total = 0;
                                      const catMap: Record<
                                        string,
                                        { correct: number; total: number }
                                      > = {};
                                      exam.questions
                                        .filter(
                                          (qi) => qi.questionType !== "INFO",
                                        )
                                        .forEach((qi) => {
                                          const status = checkAnswerStatus(
                                            qi,
                                            r.answers,
                                          );
                                          const isCorrect =
                                            status === "CORRECT";
                                          const cat = qi.category || "Lainnya";
                                          if (!catMap[cat])
                                            catMap[cat] = {
                                              correct: 0,
                                              total: 0,
                                            };
                                          catMap[cat].total++;
                                          total++;
                                          if (isCorrect) {
                                            catMap[cat].correct++;
                                            correct++;
                                          }
                                        });
                                      const overallPercent =
                                        total > 0
                                          ? Math.round((correct / total) * 100)
                                          : 0;
                                      let recommendation =
                                        "Tingkatkan motivasi belajar siswa.";
                                      if (overallPercent >= 85)
                                        recommendation =
                                          "Bagus sekali! Berikan pengayaan materi tingkat tinggi (HOTS).";
                                      else if (overallPercent >= 70)
                                        recommendation =
                                          "Pemahaman cukup baik. Lakukan latihan berkala untuk penguatan.";
                                      else if (overallPercent >= 50)
                                        recommendation =
                                          "Perlu bimbingan intensif pada materi yang belum dikuasai.";
                                      else
                                        recommendation =
                                          "Adakan remedial khusus dan pendampingan individu terstruktur.";

                                      const stats = Object.entries(catMap).map(
                                        ([name, val]) => ({
                                          name,
                                          percentage:
                                            val.total > 0
                                              ? Math.round(
                                                  (val.correct / val.total) *
                                                    100,
                                                )
                                              : 0,
                                        }),
                                      );
                                      return { stats, recommendation };
                                    })()
                                  : { stats: [], recommendation: "" };

                              return (
                                <tr
                                  key={r.student.studentId}
                                  className="avoid-break"
                                >
                                  <td className="border border-slate-300 p-1 text-center">
                                    {index + 1}
                                  </td>
                                  <td className="border border-slate-300 p-1 font-bold whitespace-nowrap">
                                    {r.student.fullName}
                                  </td>
                                  <td className="border border-slate-300 p-1">
                                    <div className="flex flex-wrap gap-2">
                                      {analysis.stats.map((stat) => {
                                        let textClass = "text-emerald-700";
                                        if (stat.percentage < 50)
                                          textClass = "text-rose-700";
                                        else if (stat.percentage < 80)
                                          textClass = "text-amber-700";
                                        return (
                                          <span
                                            key={stat.name}
                                            className="inline-flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200"
                                          >
                                            <span className="font-semibold">
                                              {stat.name}:
                                            </span>
                                            <span
                                              className={`font-bold ${textClass}`}
                                            >
                                              {stat.percentage}%
                                            </span>
                                          </span>
                                        );
                                      })}
                                      {analysis.stats.length === 0 && (
                                        <span className="text-slate-400 italic">
                                          -
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="border border-slate-300 p-1 font-medium italic text-slate-700">
                                    "{analysis.recommendation}"
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* 3. ITEM DIFFICULTY */}
      <div className="mb-4 break-before-page pt-4">
        <h3 className="font-bold text-sm uppercase tracking-wider mb-2 border-l-4 border-slate-800 pl-2 break-after-avoid">
          3. Analisis Butir Soal
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {questionAnalysisData.map((data, idx) => {
            const difficultyLabel =
              data.correctRate >= 80
                ? "Mudah"
                : data.correctRate >= 50
                  ? "Sedang"
                  : "Sulit";

            let diffColorClass = "print-bg-green";
            let barColorClass = "print-bar-green";

            if (data.correctRate < 50) {
              diffColorClass = "print-bg-red";
              barColorClass = "print-bar-red";
            } else if (data.correctRate < 80) {
              diffColorClass = "print-bg-orange";
              barColorClass = "print-bar-orange";
            }

            const originalQ = exam.questions.find((q) => q.id === data.id);

            return (
              <div
                key={data.id}
                className="avoid-break border border-slate-300 rounded p-2 text-xs flex flex-col gap-2 bg-white"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[10px] border border-slate-200">
                    Soal {idx + 1}
                  </span>
                  <span
                    className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${diffColorClass}`}
                  >
                    {difficultyLabel}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className={`h-full ${barColorClass}`}
                      style={{ width: `${data.correctRate}%` }}
                    ></div>
                  </div>
                  <span className="font-bold text-[10px] w-14 text-right">
                    {data.correctRate}% Benar
                  </span>
                </div>

                <div className="pt-1 border-t border-slate-100">
                  {data.options ? (
                    <div className="grid grid-cols-1 gap-1 text-[9px]">
                      {data.options.map((opt, i) => {
                        const label = String.fromCharCode(65 + i);
                        const count = Object.entries(data.distribution).reduce(
                          (acc, [ans, c]) => {
                            if (
                              originalQ?.questionType ===
                              "COMPLEX_MULTIPLE_CHOICE"
                            ) {
                              const sList = parseList(ans);
                              return sList.some((a) =>
                                isAnswerMatch(a, opt, originalQ.questionType),
                              )
                                ? acc + (c as number)
                                : acc;
                            }
                            return isAnswerMatch(
                              ans,
                              opt,
                              originalQ?.questionType || "MULTIPLE_CHOICE",
                            )
                              ? acc + (c as number)
                              : acc;
                          },
                          0,
                        );

                        const pct =
                          results.length > 0
                            ? Math.round((count / results.length) * 100)
                            : 0;

                        const isCorrect =
                          (originalQ?.questionType === "MULTIPLE_CHOICE" &&
                            isAnswerMatch(
                              originalQ.correctAnswer,
                              opt,
                              originalQ.questionType,
                            )) ||
                          (originalQ?.questionType ===
                            "COMPLEX_MULTIPLE_CHOICE" &&
                            parseList(originalQ.correctAnswer).some((ans) =>
                              isAnswerMatch(ans, opt, originalQ.questionType),
                            ));

                        return (
                          <div
                            key={i}
                            className={`flex items-center justify-between px-2 py-1 rounded border ${isCorrect ? "print-bg-green font-bold" : "border-slate-100 text-slate-600"}`}
                          >
                            <div className="flex gap-2 items-start w-full overflow-hidden">
                              <span className="w-4 font-bold shrink-0">
                                {label}.
                              </span>
                              <div
                                className="min-w-0 option-content [&_p]:inline [&_br]:hidden [&_img]:max-h-20 [&_img]:w-auto [&_img]:inline-block"
                                dangerouslySetInnerHTML={{ __html: opt }}
                              ></div>
                            </div>
                            <span className="shrink-0 ml-2">
                              <b>{count}</b> ({pct}%)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1 text-[9px]">
                      {Object.entries(data.distribution).length > 0 ? (
                        Object.entries(data.distribution)
                          .sort(([, a], [, b]) => (b as number) - (a as number))
                          .slice(0, 10)
                          .map(([ans, count], i) => {
                            const numCount = count as number;
                            const pct =
                              results.length > 0
                                ? Math.round((numCount / results.length) * 100)
                                : 0;

                            let displayAns = ans;
                            let isCorrect = false;

                            try {
                              if (originalQ?.questionType === "MATCHING") {
                                const parsed = JSON.parse(ans);
                                const orderedValues = (
                                  originalQ.matchingPairs || []
                                ).map((_, pIdx) => parsed[pIdx] || "—");
                                displayAns = orderedValues.join(", ");
                                isCorrect =
                                  originalQ.matchingPairs?.every(
                                    (pair, pIdx) => parsed[pIdx] === pair.right,
                                  ) ?? false;
                              } else if (
                                originalQ?.questionType === "TRUE_FALSE"
                              ) {
                                const parsed = JSON.parse(ans);
                                const orderedValues = (
                                  originalQ.trueFalseRows || []
                                ).map((_, rIdx) => {
                                  const val = parsed[rIdx];
                                  return val === true
                                    ? "Benar"
                                    : val === false
                                      ? "Salah"
                                      : "—";
                                });
                                displayAns = orderedValues.join(", ");
                                isCorrect =
                                  originalQ.trueFalseRows?.every(
                                    (row, rIdx) => parsed[rIdx] === row.answer,
                                  ) ?? false;
                              } else if (
                                originalQ?.questionType ===
                                "COMPLEX_MULTIPLE_CHOICE"
                              ) {
                                const parsed = parseList(ans);
                                parsed.sort(
                                  (a, b) =>
                                    (originalQ.options || []).indexOf(a) -
                                    (originalQ.options || []).indexOf(b),
                                );
                                displayAns = parsed.join(", ");
                                const cList = parseList(
                                  originalQ.correctAnswer || "",
                                );
                                isCorrect =
                                  parsed.length === cList.length &&
                                  parsed.every((s) =>
                                    cList.some((c) =>
                                      isAnswerMatch(
                                        s,
                                        c,
                                        originalQ.questionType,
                                      ),
                                    ),
                                  );
                              } else {
                                isCorrect = isAnswerMatch(
                                  ans,
                                  originalQ?.correctAnswer || "",
                                  originalQ?.questionType || "MULTIPLE_CHOICE",
                                );
                              }
                            } catch {
                              /* ignore */
                            }

                            return (
                              <div
                                key={i}
                                className={`flex items-start justify-between px-2 py-1 rounded border ${isCorrect ? "print-bg-green font-bold" : "bg-slate-50 border-slate-100 text-slate-600"}`}
                              >
                                <div
                                  className="flex-1 mr-2 min-w-0 option-content [&_p]:inline [&_br]:hidden [&_img]:max-h-10 [&_img]:w-auto [&_img]:inline-block"
                                  dangerouslySetInnerHTML={{
                                    __html: displayAns,
                                  }}
                                ></div>
                                <span className="shrink-0 font-bold">
                                  {count} ({pct}%)
                                </span>
                              </div>
                            );
                          })
                      ) : (
                        <span className="text-slate-400 italic text-center py-1">
                          Belum ada jawaban.
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. BANK SOAL & KUNCI JAWABAN */}
      <div className="mb-4 break-before-page pt-4">
        <h3 className="font-bold text-sm uppercase tracking-wider mb-3 border-l-4 border-slate-800 pl-2 break-after-avoid">
          4. Bank Soal & Kunci Jawaban
        </h3>
        <div className="space-y-4">
          {exam.questions.map((q, index) => {
            const questionNumber =
              exam.questions
                .slice(0, index)
                .filter((i) => i.questionType !== "INFO").length + 1;
            return (
              <div
                key={q.id}
                className="avoid-break bg-white p-4 rounded-xl border border-slate-300 shadow-none mb-4"
              >
                <div className="flex items-start gap-4">
                  <span className="flex-shrink-0 mt-1 text-sm font-bold w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                    {q.questionType === "INFO" ? "i" : questionNumber}
                  </span>
                  <div className="flex-1 space-y-3 min-w-0">
                    {(q.category || q.level || q.scoreWeight) && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {q.category && (
                          <span className="text-[9px] font-bold bg-slate-50 text-slate-600 px-2 py-0.5 rounded border border-slate-200 uppercase tracking-wide">
                            Kategori: {q.category}
                          </span>
                        )}
                        {q.level && (
                          <span className="text-[9px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 uppercase tracking-wide">
                            Level: {q.level}
                          </span>
                        )}
                        <span className="text-[9px] font-bold bg-purple-50 text-purple-600 px-2 py-0.5 rounded border border-purple-100 uppercase tracking-wide">
                          Bobot: {q.scoreWeight || 1}
                        </span>
                      </div>
                    )}

                    <div
                      className="prose prose-sm max-w-none text-slate-800 print-question-text"
                      dangerouslySetInnerHTML={{ __html: q.questionText }}
                    ></div>

                    {q.questionType === "MULTIPLE_CHOICE" &&
                      q.options &&
                      q.options.map((opt, i) => (
                        <div
                          key={i}
                          className={`flex items-start gap-3 p-2 rounded-lg border text-xs ${isAnswerMatch(q.correctAnswer, opt, q.questionType) ? "bg-emerald-50 border-emerald-200 font-bold text-emerald-800 print-bg-green" : "bg-slate-50 border-slate-200 text-slate-600"}`}
                        >
                          <span className="font-bold">
                            {String.fromCharCode(65 + i)}.
                          </span>
                          <div
                            className="flex-1 min-w-0 option-content"
                            dangerouslySetInnerHTML={{ __html: opt }}
                          ></div>
                        </div>
                      ))}

                    {q.questionType === "COMPLEX_MULTIPLE_CHOICE" &&
                      q.options &&
                      q.options.map((opt, i) => {
                        const isSelected = parseList(
                          q.correctAnswer || "",
                        ).some((a) => isAnswerMatch(a, opt, q.questionType));
                        return (
                          <div
                            key={i}
                            className={`flex items-start gap-3 p-2 rounded-lg border text-xs ${isSelected ? "bg-emerald-50 border-emerald-200 font-bold text-emerald-800 print-bg-green" : "bg-slate-50 border-slate-200 text-slate-600"}`}
                          >
                            <span className="font-bold">
                              {String.fromCharCode(65 + i)}.
                            </span>
                            <div
                              className="flex-1 min-w-0 option-content"
                              dangerouslySetInnerHTML={{ __html: opt }}
                            ></div>
                          </div>
                        );
                      })}

                    {q.questionType === "TRUE_FALSE" && q.trueFalseRows && (
                      <div className="border border-slate-200 rounded-lg overflow-x-auto custom-scrollbar">
                        <table className="w-full text-xs min-w-[500px]">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="p-2 font-bold text-slate-600 text-left border-b border-slate-200">
                                Pernyataan
                              </th>
                              <th className="p-2 font-bold text-slate-600 text-center w-24 border-b border-slate-200">
                                Jawaban
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {q.trueFalseRows.map((row, rIdx) => (
                              <tr key={rIdx} className="bg-white">
                                <td className="p-2">
                                  <div
                                    className="[&_*]:!bg-transparent [&_*]:!text-inherit [&_*]:!p-0 [&_*]:!m-0 option-content"
                                    dangerouslySetInnerHTML={{
                                      __html: row.text,
                                    }}
                                  ></div>
                                </td>
                                <td
                                  className={`p-2 text-center font-bold ${row.answer ? "text-emerald-700 bg-emerald-50 print-bg-green" : "text-rose-700 bg-rose-50 print-bg-red"}`}
                                >
                                  {row.answer ? "Benar" : "Salah"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {q.questionType === "MATCHING" && q.matchingPairs && (
                      <div className="space-y-1">
                        {q.matchingPairs.map((pair, pIdx) => (
                          <div
                            key={pIdx}
                            className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                          >
                            <div
                              className="flex-1 min-w-0 font-medium option-content"
                              dangerouslySetInnerHTML={{ __html: pair.left }}
                            ></div>
                            <div className="text-slate-400">→</div>
                            <div
                              className="flex-1 min-w-0 font-bold text-emerald-700 option-content"
                              dangerouslySetInnerHTML={{ __html: pair.right }}
                            ></div>
                          </div>
                        ))}
                      </div>
                    )}

                    {(q.questionType === "ESSAY" ||
                      q.questionType === "FILL_IN_THE_BLANK") &&
                      q.correctAnswer && (
                        <div className="mt-2 pt-2 border-t border-slate-200">
                          <p className="text-[9px] font-bold text-slate-400 uppercase">
                            Kunci Jawaban
                          </p>
                          <div
                            className="mt-1 p-2 rounded-lg bg-slate-50 text-xs prose prose-sm max-w-none text-emerald-800 font-medium border border-slate-200"
                            dangerouslySetInnerHTML={{
                              __html: q.correctAnswer,
                            }}
                          ></div>
                        </div>
                      )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
