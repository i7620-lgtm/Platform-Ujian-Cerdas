import * as XLSX from "xlsx";

export interface StudentExcelRecord {
  absentNumber: string;
  fullName: string;
  className: string;
  schoolName: string;
}

export interface ParsedStudentData {
  schoolName: string;
  classes: string[];
  students: StudentExcelRecord[];
  targetClassTags: string[]; // Format: "NamaSekolah-Kelas(Jumlah)" or "Kelas(Jumlah)"
}

/**
 * Downloads the standardized Excel template for student registration.
 */
export const downloadStudentDataTemplate = (filename = "Format_Data_Siswa.xlsx") => {
  const wsData = [
    ["cara penggunaan :", "1. Isi semua data pada halaman ini dengan benar."],
    ["", "2. Tambahkan Sheet Baru jika sekolah memiliki lebih dari 1 kelas."],
    [],
    ["Nama sekolah", ""],
    ["Nama kelas", "6A"],
    [],
    ["nomor absen", "nama siswa"],
    [1, "Siswa Contoh 1"],
    [2, "Siswa Contoh 2"],
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Kelas 6A");
  XLSX.writeFile(wb, filename);
};

/**
 * Parses an uploaded Excel spreadsheet file containing school, class, and student records.
 */
export const parseStudentDataExcel = (file: File): Promise<ParsedStudentData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });

        const allStudents: StudentExcelRecord[] = [];
        let globalSchoolName = "";
        const allClasses: string[] = [];
        // Map to count students per class
        const classStudentCounts: Record<string, number> = {};

        wb.SheetNames.forEach((wsname) => {
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

          let className = wsname;
          let schoolNameFromSheet = "";
          let startRow = -1;

          for (let i = 0; i < data.length; i++) {
            const row = data[i];
            if (!row) continue;

            const colA = String(row[0] || "").trim().toLowerCase();

            if (colA === "nama kelas") {
              className = String(row[1] || "").trim() || className;
            }
            if (colA === "nama sekolah") {
              schoolNameFromSheet = String(row[1] || "").trim() || schoolNameFromSheet;
            }
            if (colA === "nomor absen") {
              startRow = i + 1;
            }
          }

          if (schoolNameFromSheet) globalSchoolName = schoolNameFromSheet;
          if (className && className !== "Sheet1" && !allClasses.includes(className)) {
            allClasses.push(className);
          }

          if (startRow !== -1) {
            for (let i = startRow; i < data.length; i++) {
              const row = data[i];
              if (!row) continue;
              const absentNumber = String(row[0] || "").trim();
              const fullName = String(row[1] || "").trim();

              if (fullName) {
                const currentSchool = schoolNameFromSheet || globalSchoolName;
                allStudents.push({
                  absentNumber,
                  fullName,
                  className,
                  schoolName: currentSchool,
                });
                classStudentCounts[className] = (classStudentCounts[className] || 0) + 1;
              }
            }
          }
        });

        // Generate target classes tags in format: "School-Class(Count)" or "Class(Count)"
        const targetClassTags: string[] = [];
        allClasses.forEach((cls) => {
          const count = classStudentCounts[cls] || 0;
          let tag = cls;
          if (count > 0) {
            tag = `${cls}(${count})`;
          }
          if (globalSchoolName) {
            tag = `${globalSchoolName}-${tag}`;
          }
          targetClassTags.push(tag);
        });

        resolve({
          schoolName: globalSchoolName,
          classes: allClasses,
          students: allStudents,
          targetClassTags,
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => {
      reject(err);
    };

    reader.readAsBinaryString(file);
  });
};
