import { useMemo, useState } from "react";
import type { Result } from "../../types";

interface UseStudentListViewParams {
  results: Result[];
}

export const useStudentListView = ({ results }: UseStudentListViewParams) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterClass, setFilterClass] = useState("");

  const filteredResults = useMemo(() => {
    return results
      .filter((r) => {
        const matchName = r.student.fullName
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
        const matchClass = filterClass ? r.student.class === filterClass : true;
        return matchName && matchClass;
      })
      .sort((a, b) => {
        // 1. Nama Sekolah
        const schoolA = a.student.schoolName || "";
        const schoolB = b.student.schoolName || "";
        const schoolCompare = schoolA.localeCompare(schoolB, undefined, {
          sensitivity: "base",
        });
        if (schoolCompare !== 0) return schoolCompare;

        // 2. Kelas
        const classCompare = a.student.class.localeCompare(
          b.student.class,
          undefined,
          { numeric: true, sensitivity: "base" },
        );
        if (classCompare !== 0) return classCompare;

        // 3. Nomor Absen
        const absA = parseInt(a.student.absentNumber) || 0;
        const absB = parseInt(b.student.absentNumber) || 0;
        return absA - absB;
      });
  }, [results, searchTerm, filterClass]);

  const uniqueClasses = useMemo(() => {
    return Array.from(new Set(results.map((r) => r.student.class))).sort();
  }, [results]);

  return {
    searchTerm,
    filterClass,
    setSearchTerm,
    setFilterClass,
    filteredResults,
    uniqueClasses,
  };
};
