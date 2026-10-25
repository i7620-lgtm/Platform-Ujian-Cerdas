import React from "react";
import { createPortal } from "react-dom";
import { XMarkIcon, ClockIcon } from "../Icons";
import { Exam } from "../../types";
import { useInvitationModal } from "./useInvitationModal";
import { normalizeDateString } from "../../utils/timezoneUtils";

export const RegisterSchoolModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  schoolName?: string;
  examType?: string;
  exam?: Exam | null;
  hook: ReturnType<typeof useInvitationModal>;
}> = ({ isOpen, onClose, examType, exam, hook }) => {
  const {
    students,
    parsedSchoolName,
    parsedClasses,
    selectedClass,
    setSelectedClass,
    isSubmitting,
    classSessionAssignments,
    updateClassSessionAssignment,
    handleRegister,
    handleDownloadFormat,
    handleUploadData,
  } = hook;

  if (!isOpen) return null;

  const classesToDisplay =
    parsedClasses.length > 0
      ? parsedClasses
      : Array.from(
          new Set(students.map((s) => s.className).filter(Boolean)),
        );
  const filteredStudents = students.filter(
    (s) => s.className === selectedClass,
  );

  const examStartDate = normalizeDateString(
    exam?.config?.startDate || exam?.config?.date || "",
  );
  const examEndDate = normalizeDateString(
    exam?.config?.endDate || exam?.config?.date || examStartDate,
  );
  const availableSessions = exam?.config?.dailySessions || [];

  return createPortal(
    <div className="fixed inset-0 z-[170] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <div>
            <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
              <span>Daftarkan Sekolah Saya</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                Pendaftaran Mandiri
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Unggah data siswa dan atur sesi pelaksanaan ujian untuk sekolah Anda.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          {/* Action Upload & Download */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Langkah 1: Unggah Data Siswa & Sekolah
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gunakan template excel standar untuk mendaftarkan peserta secara otomatis.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDownloadFormat}
                className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm"
              >
                Unduh Format Excel
              </button>
              <label className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-sm flex items-center gap-1.5">
                <span>Upload Data</span>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  className="hidden"
                  onChange={handleUploadData}
                />
              </label>
            </div>
          </div>

          {/* Detected Data Card */}
          {parsedSchoolName && (
            <div className="p-4 bg-indigo-50/80 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-xl">
              <h4 className="font-bold text-sm text-indigo-900 dark:text-indigo-200 mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                Data Terdeteksi dari Berkas:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-indigo-800 dark:text-indigo-300">
                <div className="bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                  <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Nama Sekolah</span>
                  <span className="font-bold text-slate-800 dark:text-white">{parsedSchoolName}</span>
                </div>
                <div className="bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                  <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Daftar Kelas</span>
                  <span className="font-bold text-slate-800 dark:text-white">
                    {classesToDisplay.length > 0 ? classesToDisplay.join(", ") : "-"}
                  </span>
                </div>
                <div className="bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                  <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Jumlah Siswa</span>
                  <span className="font-bold text-slate-800 dark:text-white">{students.length} Siswa</span>
                </div>
              </div>
            </div>
          )}

          {/* Student Preview Section */}
          {parsedSchoolName ? (
            students.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Daftar Siswa Terverifikasi
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {classesToDisplay.map((c) => (
                      <button
                        key={c as string}
                        type="button"
                        onClick={() => setSelectedClass(c as string)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                          selectedClass === c
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                      >
                        Kelas {c as string}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-48 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 sticky top-0">
                      <tr>
                        <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300 w-12 text-center">
                          No
                        </th>
                        <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300">
                          Nama Siswa
                        </th>
                        <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300 w-24 text-center">
                          No. Absen
                        </th>
                        <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300 w-28">
                          Kelas
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredStudents.map((s, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        >
                          <td className="p-2 text-center text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="p-2 font-medium text-slate-800 dark:text-slate-200">
                            {s.fullName}
                          </td>
                          <td className="p-2 text-center text-slate-500 dark:text-slate-400">
                            {s.absentNumber || "-"}
                          </td>
                          <td className="p-2 text-slate-600 dark:text-slate-300">
                            {s.className}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-5 border border-dashed border-emerald-300 dark:border-emerald-800/60 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20">
                <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                  {classesToDisplay.length > 0
                    ? "Data sekolah dan kelas terdeteksi tanpa daftar nama siswa."
                    : "Data sekolah terdeteksi. Siswa dapat memasukkan nama mandiri saat ujian."}
                </p>
              </div>
            )
          ) : (
            <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Belum ada data sekolah. Silakan unduh format excel di atas lalu unggah berkas Anda.
              </p>
            </div>
          )}

          {/* PER-CLASS SESSION MANAGEMENT SECTION */}
          {parsedSchoolName && classesToDisplay.length > 0 && (
            <div className="border border-indigo-200 dark:border-indigo-800/60 rounded-2xl p-5 bg-gradient-to-b from-indigo-50/40 to-transparent dark:from-indigo-950/20 dark:to-transparent space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 dark:border-indigo-900/50 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                    <ClockIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      Pengaturan Sesi Ujian per Kelas
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Tentukan jadwal sesi untuk masing-masing kelas Anda secara fleksibel.
                    </p>
                  </div>
                </div>
                {examStartDate && (
                  <div className="text-xs bg-indigo-100/70 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 px-3 py-1 rounded-full font-medium self-start sm:self-auto">
                    Rentang Ujian: <span className="font-bold">{examStartDate}</span>
                    {examEndDate && examEndDate !== examStartDate ? (
                      <> s.d. <span className="font-bold">{examEndDate}</span></>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {classesToDisplay.map((c) => {
                  const assignment = classSessionAssignments[c] || {
                    mode: availableSessions.length > 0 ? "existing" : "new",
                    existingSessionId: availableSessions[0]?.id,
                    newSessionDate: examStartDate,
                    newSessionStartTime: exam?.config?.startTime || "08:00",
                    newSessionEndTime: exam?.config?.endTime || "10:00",
                  };

                  const currentMode = assignment.mode;
                  const newDate = assignment.newSessionDate || examStartDate;
                  const newStart = assignment.newSessionStartTime || exam?.config?.startTime || "08:00";
                  const newEnd = assignment.newSessionEndTime || exam?.config?.endTime || "10:00";
                  const generatedName = `${parsedSchoolName} - ${newStart}-${newEnd}`;

                  return (
                    <div
                      key={c as string}
                      className="p-4 bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-700/80 px-2.5 py-1 rounded-md">
                            Kelas {c as string}
                          </span>
                        </div>

                        {/* Mode Switcher */}
                        <div className="inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs">
                          <button
                            type="button"
                            disabled={availableSessions.length === 0}
                            onClick={() =>
                              updateClassSessionAssignment(c as string, {
                                mode: "existing",
                                existingSessionId: assignment.existingSessionId || availableSessions[0]?.id,
                              })
                            }
                            className={`px-3 py-1 rounded-md font-semibold transition-all ${
                              currentMode === "existing"
                                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 disabled:opacity-40"
                            }`}
                          >
                            Pilih Sesi yang Ada
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateClassSessionAssignment(c as string, {
                                mode: "new",
                                newSessionDate: newDate,
                                newSessionStartTime: newStart,
                                newSessionEndTime: newEnd,
                              })
                            }
                            className={`px-3 py-1 rounded-md font-semibold transition-all ${
                              currentMode === "new"
                                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                            }`}
                          >
                            Buat Sesi Baru
                          </button>
                        </div>
                      </div>

                      {/* Content based on Mode */}
                      {currentMode === "existing" ? (
                        <div className="pt-1">
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Pilih Jadwal Sesi yang Disediakan Penyelenggara:
                          </label>
                          {availableSessions.length > 0 ? (
                            <select
                              value={assignment.existingSessionId || availableSessions[0]?.id || ""}
                              onChange={(e) =>
                                updateClassSessionAssignment(c as string, {
                                  existingSessionId: e.target.value,
                                })
                              }
                              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                              {availableSessions.map((s, idx) => (
                                <option key={s.id} value={s.id}>
                                  {s.name || `Sesi ${idx + 1}`} ({s.startTime} - {s.endTime}
                                  {s.date ? ` • ${s.date}` : ""})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <p className="text-xs text-amber-600 dark:text-amber-400 italic">
                              Tidak ada sesi awal yang dibuat pembuat soal. Silakan gunakan opsi "Buat Sesi Baru".
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3 pt-1">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Tanggal Pelaksanaan
                              </label>
                              <input
                                type="date"
                                value={newDate}
                                min={examStartDate || undefined}
                                max={examEndDate || undefined}
                                onChange={(e) =>
                                  updateClassSessionAssignment(c as string, {
                                    newSessionDate: e.target.value,
                                  })
                                }
                                className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Jam Mulai
                              </label>
                              <input
                                type="time"
                                value={newStart}
                                onChange={(e) =>
                                  updateClassSessionAssignment(c as string, {
                                    newSessionStartTime: e.target.value,
                                  })
                                }
                                className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Jam Selesai
                              </label>
                              <input
                                type="time"
                                value={newEnd}
                                onChange={(e) =>
                                  updateClassSessionAssignment(c as string, {
                                    newSessionEndTime: e.target.value,
                                  })
                                }
                                className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                              />
                            </div>
                          </div>

                          {/* Live preview badge */}
                          <div className="flex items-center justify-between text-xs p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg border border-indigo-100 dark:border-indigo-900/40">
                            <span className="text-slate-600 dark:text-slate-400">
                              Format Nama Sesi Otomatis:
                            </span>
                            <span className="font-bold text-indigo-700 dark:text-indigo-300">
                              {generatedName}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Kepemilikan dan butir soal ujian tetap utuh terlindungi di pembuat soal asli.
          </p>

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleRegister}
              disabled={!parsedSchoolName || isSubmitting}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Menyimpan Pendaftaran...</span>
                </>
              ) : (
                <span>Setuju & Daftarkan Sekolah</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
