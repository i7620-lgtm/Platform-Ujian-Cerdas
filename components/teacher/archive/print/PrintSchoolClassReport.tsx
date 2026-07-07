import React from "react";
import type { Result, Exam } from "../../../../types";
import { formatDuration } from "../archiveUtils";

interface PrintSchoolClassReportProps {
  uniqueSchools: string[];
  results: Result[];
  sortedResults: Result[];
  exam: Exam;
}

export const PrintSchoolClassReport: React.FC<PrintSchoolClassReportProps> = ({
  uniqueSchools,
  results,
  sortedResults,
  exam,
}) => {
  return (
    <>
      <div className="mb-8 avoid-break-inside">
        <h3 className="font-bold text-sm uppercase tracking-wider mb-3 border-l-4 border-slate-800 pl-2">
          2. Laporan Per Sekolah & Kelas
        </h3>
        {uniqueSchools.map((schoolName, schoolIdx) => {
          const schoolClasses = Array.from(
            new Set(
              sortedResults
                .filter(
                  (r) =>
                    (r.student.schoolName || "Tanpa Sekolah") === schoolName,
                )
                .map((r) => r.student.studentClass || "Tanpa Kelas")
            )
          );
          
          return (
            <div key={`school-${schoolIdx}`} className="mb-6">
              <h4 className="font-bold text-md mb-2 bg-slate-100 p-2 rounded border border-slate-300">
                Sekolah: {schoolName}
              </h4>
              
              {schoolClasses.map((className, classIdx) => {
                const classResults = sortedResults.filter(
                  (r) =>
                    (r.student.schoolName || "Tanpa Sekolah") === schoolName &&
                    (r.student.studentClass || "Tanpa Kelas") === className
                );
                
                const avgScore = classResults.length > 0 
                  ? Math.round(classResults.reduce((sum, r) => sum + r.score, 0) / classResults.length)
                  : 0;
                  
                return (
                  <div key={`class-${classIdx}`} className="ml-4 mb-4 p-4 border border-slate-200 rounded">
                    <h5 className="font-bold text-sm mb-2">Kelas: {className} (Total: {classResults.length} Siswa)</h5>
                    <p className="text-xs mb-2">Rata-rata Nilai: {avgScore}</p>
                    
                    <table className="w-full text-xs border-collapse border border-slate-300 mt-2">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="border p-1 text-left">Nama</th>
                          <th className="border p-1 text-center">Nilai</th>
                          <th className="border p-1 text-center">Waktu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classResults.map((r, i) => (
                          <tr key={`res-${i}`}>
                            <td className="border p-1">{r.student.fullName}</td>
                            <td className="border p-1 text-center font-bold">{r.score}</td>
                            <td className="border p-1 text-center text-slate-500">{formatDuration(r.completionTime)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </>
  );
};
