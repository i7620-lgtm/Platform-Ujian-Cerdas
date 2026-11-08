import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  BuildingOfficeIcon,
  ClockIcon,
  AcademicCapIcon,
  UserGroupIcon,
  SparklesIcon,
} from "../Icons";
import type { SchoolSessionInfo } from "./schoolSessionUtils";

interface ParticipatingSchoolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  schools: SchoolSessionInfo[];
  examSubject?: string;
}

export const ParticipatingSchoolsModal: React.FC<ParticipatingSchoolsModalProps> = ({
  isOpen,
  onClose,
  schools,
  examSubject = "Ujian",
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredSchools = useMemo(() => {
    if (!searchTerm.trim()) return schools;
    const term = searchTerm.toLowerCase();
    return schools.filter(
      (s) =>
        s.schoolName.toLowerCase().includes(term) ||
        s.classes.some((c) => c.toLowerCase().includes(term)) ||
        s.sessions.some(
          (sess) =>
            (sess.name || "").toLowerCase().includes(term) ||
            `${sess.startTime}-${sess.endTime}`.includes(term)
        )
    );
  }, [schools, searchTerm]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-2.5 sm:p-5 bg-slate-900/80 backdrop-blur-md animate-fade-in font-sans select-none">
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-slide-in-up flex flex-col max-h-[90vh] sm:max-h-[85vh]">
        {/* Header Section (Mobile & Desktop Responsive) */}
        <div className="px-4 py-3.5 sm:px-5 sm:py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800 text-white flex items-start sm:items-center justify-between gap-2 shrink-0">
          <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white/10 rounded-xl sm:rounded-2xl flex items-center justify-center text-white backdrop-blur-sm border border-white/20 shrink-0 mt-0.5 sm:mt-0">
              <BuildingOfficeIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h3 className="text-sm sm:text-lg font-black tracking-tight leading-snug">
                  Daftar Sekolah Peserta Ujian
                </h3>
                <span className="px-2 py-0.5 bg-white/20 backdrop-blur-md rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider shrink-0">
                  {schools.length} Sekolah
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-indigo-100 opacity-90 truncate mt-0.5">
                {examSubject} • Sesi & Jadwal Pelaksanaan per Sekolah
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all backdrop-blur-sm active:scale-95 shrink-0"
            title="Tutup"
          >
            <XMarkIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Search Bar Section */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 shrink-0">
          <div className="relative flex items-center w-full">
            <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari sekolah, nama sesi, atau kelas terdaftar..."
              className="w-full pl-10 pr-9 py-2 sm:py-2.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <XMarkIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 custom-scrollbar">
          {filteredSchools.length > 0 ? (
            <>
              {/* ========================================================================= */}
              {/* MOBILE SMARTPHONE VIEW: Stacked Vertical Cards per School (sm:hidden)     */}
              {/* ========================================================================= */}
              <div className="block sm:hidden space-y-3">
                {filteredSchools.map((item, index) => (
                  <div
                    key={"mob_" + item.schoolName + index}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xs space-y-2.5"
                  >
                    {/* Header Row: Number + School Name + Host badge + Student Count */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          #{index + 1}
                        </span>
                        <div className="min-w-0">
                          <h4 className="font-black text-sm text-slate-800 dark:text-white leading-tight break-words">
                            {item.schoolName}
                          </h4>
                          {item.isHost && (
                            <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60 rounded text-[9px] font-bold">
                              <SparklesIcon className="w-2.5 h-2.5" />
                              Penyelenggara Utama
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg text-slate-700 dark:text-slate-200 font-black text-[10px] shrink-0">
                        <UserGroupIcon className="w-3 h-3 text-slate-400" />
                        <span>{item.totalStudents} Siswa</span>
                      </div>
                    </div>

                    {/* Sesi & Jam Ujian Block */}
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                        Sesi & Jam Ujian
                      </span>
                      {item.sessions && item.sessions.length > 0 ? (
                        <div className="space-y-1.5">
                          {item.sessions.map((sess) => (
                            <div
                              key={sess.id}
                              className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs"
                            >
                              <div className="flex items-center justify-between gap-1 font-bold text-slate-800 dark:text-slate-200">
                                <span>{sess.name || "Sesi Pelaksanaan"}</span>
                                <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-mono text-[11px] font-bold">
                                  <ClockIcon className="w-3 h-3" />
                                  {sess.startTime} - {sess.endTime}
                                </span>
                              </div>
                              {sess.date && (
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                                  Tanggal: {sess.date}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <ClockIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Mengikuti Jam Utama Ujian</span>
                        </div>
                      )}
                    </div>

                    {/* Kelas Terdaftar Block */}
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                        Kelas Terdaftar
                      </span>
                      {item.classes && item.classes.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {item.classes.map((cls, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-lg border border-indigo-200/70 dark:border-indigo-900/50"
                            >
                              {cls}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">
                          Semua Kelas
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* ========================================================================= */}
              {/* DESKTOP & TABLET VIEW: Multi-Column Data Table (hidden sm:block)           */}
              {/* ========================================================================= */}
              <div className="hidden sm:block overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-700">
                      <th className="py-3 px-3 w-10 text-center">No</th>
                      <th className="py-3 px-4 min-w-[180px]">Nama Sekolah</th>
                      <th className="py-3 px-4 min-w-[200px]">Sesi & Jam Ujian</th>
                      <th className="py-3 px-4 min-w-[140px]">Kelas Terdaftar</th>
                      <th className="py-3 px-3 text-center min-w-[90px]">Siswa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900">
                    {filteredSchools.map((item, index) => (
                      <tr
                        key={"dt_" + item.schoolName + index}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* No */}
                        <td className="py-3 px-3 text-center font-bold text-slate-400">
                          {index + 1}
                        </td>

                        {/* Nama Sekolah */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <BuildingOfficeIcon className="w-4 h-4 text-indigo-500 shrink-0" />
                            <div>
                              <span className="font-black text-slate-800 dark:text-white block leading-tight">
                                {item.schoolName}
                              </span>
                              {item.isHost && (
                                <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60 rounded text-[9px] font-bold">
                                  <SparklesIcon className="w-2.5 h-2.5" />
                                  Penyelenggara Utama
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Sesi & Jam Ujian */}
                        <td className="py-3 px-4">
                          {item.sessions && item.sessions.length > 0 ? (
                            <div className="space-y-1.5">
                              {item.sessions.map((sess) => (
                                <div
                                  key={sess.id}
                                  className="bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60 text-[11px]"
                                >
                                  <div className="flex items-center justify-between gap-1 font-bold text-slate-800 dark:text-slate-200">
                                    <span>{sess.name || "Sesi Pelaksanaan"}</span>
                                    <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-mono text-[10px]">
                                      <ClockIcon className="w-3 h-3" />
                                      {sess.startTime} - {sess.endTime}
                                    </span>
                                  </div>
                                  {sess.date && (
                                    <span className="text-[9px] text-slate-500 dark:text-slate-400 block mt-0.5">
                                      Tanggal: {sess.date}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px] flex items-center gap-1">
                              <ClockIcon className="w-3 h-3" />
                              Mengikuti Jam Utama Ujian
                            </span>
                          )}
                        </td>

                        {/* Kelas Terdaftar */}
                        <td className="py-3 px-4">
                          {item.classes && item.classes.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {item.classes.map((cls, idx) => (
                                <span
                                  key={idx}
                                  className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded border border-indigo-200/70 dark:border-indigo-900/50"
                                >
                                  {cls}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">
                              Semua Kelas
                            </span>
                          )}
                        </td>

                        {/* Siswa */}
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex items-center justify-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg text-slate-700 dark:text-slate-200 font-black">
                            <UserGroupIcon className="w-3 h-3 text-slate-400" />
                            <span>{item.totalStudents}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="py-12 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 mb-2">
                <AcademicCapIcon className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {searchTerm ? "Sekolah Tidak Ditemukan" : "Belum Ada Sekolah Peserta"}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                {searchTerm
                  ? `Tidak ada sekolah atau sesi yang cocok dengan kata kunci "${searchTerm}".`
                  : "Daftarkan sekolah Anda melalui tombol pendaftaran di kartu undangan."}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-3.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <span>
            Menampilkan <strong>{filteredSchools.length}</strong> dari{" "}
            <strong>{schools.length}</strong> sekolah
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold rounded-xl transition-all active:scale-95"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
