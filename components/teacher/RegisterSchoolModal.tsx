import React from "react";
import { createPortal } from "react-dom";
import { XMarkIcon } from "../Icons";
import { Exam } from "../../types";
import { useInvitationModal } from "./useInvitationModal";

export const RegisterSchoolModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  schoolName?: string;
  examType?: string;
  exam?: Exam | null;
  hook: ReturnType<typeof useInvitationModal>;
}> = ({ isOpen, onClose, schoolName, examType, exam, hook }) => {
  const {
    students,
    parsedSchoolName,
    parsedClasses,
    selectedClass,
    setSelectedClass,
    isSubmitting,
    handleRegister,
    handleDownloadFormat,
    handleUploadData,
  } = hook;

  if (!isOpen) return null;

  const classesToDisplay =
    parsedClasses.length > 0
      ? parsedClasses
      : Array.from(new Set(students.map((s) => s.className)));
  const filteredStudents = students.filter(
    (s) => s.className === selectedClass,
  );

  return createPortal(
    <div className="fixed inset-0 z-[170] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <div>
            <h3 className="font-bold text-lg text-slate-800 dark:text-white">
              Daftarkan Sekolah
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <div className="flex gap-4 mb-6">
            <button
              onClick={handleDownloadFormat}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Download Format
            </button>
            <label className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold cursor-pointer transition-colors">
              Upload Data
              <input
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                onChange={handleUploadData}
              />
            </label>
          </div>

          {parsedSchoolName && (
            <div className="mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-xl">
              <h4 className="font-bold text-indigo-800 dark:text-indigo-300 mb-2">
                Data Terdeteksi:
              </h4>
              <ul className="text-sm text-indigo-700 dark:text-indigo-400 space-y-1">
                <li>
                  <span className="font-semibold">Sekolah:</span>{" "}
                  {parsedSchoolName}
                </li>
                {parsedClasses.length > 0 && (
                  <li>
                    <span className="font-semibold">Kelas:</span>{" "}
                    {parsedClasses.join(", ")}
                  </li>
                )}
                <li>
                  <span className="font-semibold">Jumlah Siswa:</span>{" "}
                  {students.length} data
                </li>
              </ul>
            </div>
          )}

          {parsedSchoolName ? (
            students.length > 0 ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {classesToDisplay.map((c) => (
                    <button
                      key={c as string}
                      onClick={() => setSelectedClass(c as string)}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${selectedClass === c ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800" : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"}`}
                    >
                      Kelas {c as string}
                    </button>
                  ))}
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-3 font-bold text-slate-600 dark:text-slate-300 w-16 text-center">
                          No
                        </th>
                        <th className="p-3 font-bold text-slate-600 dark:text-slate-300">
                          Nama Lengkap
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((s, idx) => (
                        <tr
                          key={idx}
                          className="border-b border-slate-100 dark:border-slate-800/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/20"
                        >
                          <td className="p-3 text-center text-slate-500 dark:text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="p-3 font-medium text-slate-700 dark:text-slate-300">
                            {s.fullName}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 border-2 border-dashed border-emerald-200 dark:border-emerald-800/50 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/10">
                <p className="text-emerald-600 dark:text-emerald-400 font-medium">
                  {parsedClasses.length > 0
                    ? "Data sekolah dan kelas berhasil dibaca, namun tidak ada daftar nama siswa."
                    : "Data sekolah berhasil dibaca, namun tidak ada daftar kelas dan nama siswa."}
                </p>
                <p className="text-sm text-emerald-500 dark:text-emerald-500/80 mt-1">
                  Anda tetap bisa melanjutkan. Siswa akan mengetik nama mereka
                  secara manual saat ujian.
                </p>
              </div>
            )
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
              <p className="text-slate-500 dark:text-slate-400">
                Belum ada data sekolah. Silakan upload data terlebih dahulu.
              </p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
          <button
            onClick={handleRegister}
            disabled={!parsedSchoolName || isSubmitting}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold shadow-md transition-all active:scale-95 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Menyimpan...
              </>
            ) : (
              `Setuju untuk mengikuti ${examType || "Ujian"}`
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
