import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  ArrowLeftIcon,
  UserIcon,
  QrCodeIcon,
  CheckCircleIcon,
  LockClosedIcon,
  SunIcon,
  MoonIcon,
  ChevronDownIcon,
  XMarkIcon,
} from "../Icons";
import type { Student } from "../../types";
import { storageService } from "../../services/storage";
import { useStudentEntryForm, parseClassConfig } from "./useStudentEntryForm";
import { QrScannerModal } from "./QrScannerModal";
import { UnlockForm } from "./UnlockForm";
import { supabase } from "../../lib/supabase";

interface StudentEntryFormProps {
  onLoginSuccess: (examCode: string, student: Student) => void;
  onBack: () => void;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
  initialCode?: string;
}

export const StudentEntryForm: React.FC<StudentEntryFormProps> = ({
  onLoginSuccess,
  onBack,
  isDarkMode,
  toggleTheme,
  initialCode,
}) => {
  const {
    isLoading,
    isLocked,
    availableClasses,
    registeredData,
    isQrScannerOpen,
    setIsQrScannerOpen,
    examCode,
    setExamCode,
    fullName,
    setFullName,
    schoolName,
    setSchoolName,
    studentClass,
    setStudentClass,
    absentNumber,
    setAbsentNumber,
    isCheckingCode,
    error,
    isFocused,
    setIsFocused,
    examCodeInputRef,
    nameInputRef,
    absentLimit,
    availableSchools,
    filteredClasses,
    filteredStudents,
    handleQrScan,
    handleSubmit,
    handleUnlockAndResume,
    setIsLocked,
    setIsLoading
  } = useStudentEntryForm({ initialCode, onLoginSuccess });

  if (isLocked) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#FAFAFA] dark:bg-slate-950 relative font-sans transition-colors duration-300">
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-gradient-to-br from-rose-50/60 to-orange-50/60 dark:from-rose-900/20 dark:to-orange-900/20 rounded-full blur-[100px] animate-pulse"></div>
        </div>
        <div className="w-full max-w-[420px] px-4 relative z-10 py-10 my-auto">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.03)] dark:shadow-none border border-white dark:border-slate-800 ring-1 ring-slate-50 dark:ring-slate-800 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-rose-50 dark:bg-rose-900/30 text-rose-500 dark:text-rose-400 rounded-full mb-4 ring-8 ring-rose-50/50 dark:ring-rose-900/20">
              <LockClosedIcon className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">
              Sesi Terkunci
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              Akun "{fullName}" (Kelas {studentClass}, No {absentNumber}) sedang
              aktif atau dihentikan paksa.
              <br />
              Masukkan <strong>Token Reset</strong> dari pengawas.
            </p>
            <UnlockForm
              onUnlock={handleUnlockAndResume}
              onCancel={() => {
                setIsLocked(false);
                setIsLoading(false);
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#FAFAFA] dark:bg-slate-950 relative font-sans selection:bg-indigo-100 selection:text-indigo-800 transition-colors duration-300">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-gradient-to-br from-indigo-50/60 to-purple-50/60 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-full blur-[100px] animate-pulse"
          style={{ animationDuration: "8s" }}
        ></div>
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-gradient-to-tl from-blue-50/60 to-emerald-50/60 dark:from-blue-900/20 dark:to-emerald-900/20 rounded-full blur-[100px] animate-pulse"
          style={{ animationDuration: "10s" }}
        ></div>
      </div>

      {toggleTheme && (
        <div className="absolute top-6 right-6 z-50">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-md text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-sm border border-white/20 dark:border-slate-700"
          >
            {isDarkMode ? (
              <SunIcon className="w-5 h-5" />
            ) : (
              <MoonIcon className="w-5 h-5" />
            )}
          </button>
        </div>
      )}

      <div className="w-full max-w-[420px] px-4 relative z-10 flex flex-col sm:h-auto justify-center py-10 my-auto animate-gentle-slide">
        <button
          onClick={onBack}
          className="group self-start flex items-center gap-2 text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 mb-4 text-[10px] font-bold uppercase tracking-widest transition-all pl-2 py-2"
        >
          <div className="w-6 h-6 rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
            <ArrowLeftIcon className="w-3 h-3" />
          </div>
          <span>Kembali</span>
        </button>

        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.03)] dark:shadow-black/20 border border-white dark:border-slate-800 ring-1 ring-slate-50 dark:ring-slate-800">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-[0_10px_20px_-5px_rgba(79,70,229,0.15)] dark:shadow-none mb-3 text-indigo-600 dark:text-indigo-400 border border-indigo-50 dark:border-slate-700 relative overflow-hidden">
              <div className="absolute inset-0 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-2xl transform rotate-45 translate-y-6 translate-x-6"></div>
              <UserIcon className="w-6 h-6 relative z-10" />
            </div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">
              Selamat Datang
            </h2>
            <p className="text-slate-400 dark:text-slate-500 text-xs font-medium mt-1">
              Siapkan diri untuk ujian hari ini.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-3">
              <div
                className={`transition-all duration-300 rounded-xl bg-slate-50 dark:bg-slate-950 border ${isFocused === "school" ? "bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-500 shadow-[0_4px_20px_-4px_rgba(79,70,229,0.1)] ring-4 ring-indigo-500/5 dark:ring-indigo-500/20" : "border-transparent dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900"}`}
              >
                <div className="px-4 pt-2">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-0.5">
                    Asal Sekolah
                  </label>
                  {availableSchools.length > 0 ? (
                    <div className="relative group">
                      <select
                        value={schoolName}
                        onChange={(e) => {
                          setSchoolName(e.target.value);
                          setStudentClass("");
                        }}
                        onFocus={() => setIsFocused("school")}
                        onBlur={() => setIsFocused(null)}
                        className="block w-full bg-transparent border-none p-0 pb-2 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-0 outline-none appearance-none cursor-pointer"
                        required
                      >
                        <option value="" disabled className="dark:bg-slate-900">
                          Pilih Sekolah...
                        </option>
                        {availableSchools.map((s) => (
                          <option
                            key={s}
                            value={s}
                            className="dark:bg-slate-900"
                          >
                            {s}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-0 top-0 text-slate-400 pointer-events-none">
                        <ChevronDownIcon className="w-4 h-4" />
                      </div>
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      onFocus={() => setIsFocused("school")}
                      onBlur={() => setIsFocused(null)}
                      className="block w-full bg-transparent border-none p-0 pb-2 text-sm font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:ring-0 outline-none"
                      placeholder="Nama sekolah..."
                      required
                    />
                  )}
                </div>
              </div>

              <div
                className={`transition-all duration-300 rounded-xl bg-slate-50 dark:bg-slate-950 border ${isFocused === "name" ? "bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-500 shadow-[0_4px_20px_-4px_rgba(79,70,229,0.1)] ring-4 ring-indigo-500/5 dark:ring-indigo-500/20" : "border-transparent dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900"}`}
              >
                <div className="px-4 pt-2">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-0.5">
                    Nama Lengkap
                  </label>
                  {filteredStudents.length > 0 ? (
                    <div className="relative group">
                      <select
                        value={fullName}
                        onChange={(e) => {
                          const selectedName = e.target.value;
                          setFullName(selectedName);
                          const student = filteredStudents.find(
                            (s) => s.student_name === selectedName,
                          );
                          if (student && student.absent_number) {
                            setAbsentNumber(student.absent_number);
                          }
                        }}
                        onFocus={() => setIsFocused("name")}
                        onBlur={() => setIsFocused(null)}
                        className="block w-full bg-transparent border-none p-0 pb-2 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-0 outline-none appearance-none cursor-pointer"
                        required
                      >
                        <option value="" disabled className="dark:bg-slate-900">
                          Pilih Nama...
                        </option>
                        {filteredStudents.map((s) => (
                          <option
                            key={s.id}
                            value={s.student_name}
                            className="dark:bg-slate-900"
                          >
                            {s.student_name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-0 top-0 text-slate-400 pointer-events-none">
                        <ChevronDownIcon className="w-4 h-4" />
                      </div>
                    </div>
                  ) : (
                    <input
                      ref={nameInputRef}
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      onFocus={() => setIsFocused("name")}
                      onBlur={() => setIsFocused(null)}
                      className="block w-full bg-transparent border-none p-0 pb-2 text-sm font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:ring-0 outline-none"
                      placeholder="Ketik nama anda..."
                      required
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div
                  className={`transition-all duration-300 rounded-xl bg-slate-50 dark:bg-slate-950 border ${isFocused === "class" ? "bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-500 shadow-[0_4px_20px_-4px_rgba(79,70,229,0.1)] ring-4 ring-indigo-500/5 dark:ring-indigo-500/20" : "border-transparent dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900"}`}
                >
                  <div className="px-4 pt-2">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-0.5">
                      Kelas
                    </label>

                    {availableClasses.length > 0 ||
                    registeredData.length > 0 ? (
                      <div className="relative group">
                        <select
                          value={studentClass}
                          onChange={(e) => {
                            const val = e.target.value;
                            setStudentClass(val);
                            setFullName("");
                            setAbsentNumber("");
                            const parsed = parseClassConfig(val);
                            if (parsed.schoolName && !schoolName) {
                              setSchoolName(parsed.schoolName);
                            }
                          }}
                          onFocus={() => setIsFocused("class")}
                          onBlur={() => setIsFocused(null)}
                          className="block w-full bg-transparent border-none p-0 pb-2 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-0 outline-none appearance-none cursor-pointer"
                          required
                        >
                          <option
                            value=""
                            disabled
                            className="dark:bg-slate-900"
                          >
                            Pilih...
                          </option>
                          {filteredClasses.map((c) => {
                            const { schoolName: sName, name } =
                              parseClassConfig(c);
                            const displayName =
                              sName && !schoolName
                                ? `${sName} - ${name}`
                                : name;
                            return (
                              <option
                                key={c}
                                value={c}
                                className="dark:bg-slate-900"
                              >
                                {displayName}
                              </option>
                            );
                          })}
                        </select>
                        <div className="absolute right-0 top-0 text-slate-400 pointer-events-none">
                          <ChevronDownIcon className="w-4 h-4" />
                        </div>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={studentClass}
                        onChange={(e) => setStudentClass(e.target.value)}
                        onFocus={() => setIsFocused("class")}
                        onBlur={() => setIsFocused(null)}
                        className="block w-full bg-transparent border-none p-0 pb-2 text-sm font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:ring-0 outline-none"
                        placeholder="Contoh: 9A"
                        required
                      />
                    )}
                  </div>
                </div>

                <div
                  className={`transition-all duration-300 rounded-xl bg-slate-50 dark:bg-slate-950 border ${isFocused === "absent" ? "bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-500 shadow-[0_4px_20px_-4px_rgba(79,70,229,0.1)] ring-4 ring-indigo-500/5 dark:ring-indigo-500/20" : "border-transparent dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900"}`}
                >
                  <div className="px-4 pt-2">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-0.5 font-sans leading-none">
                      No. Absen / NIS
                    </label>
                    {filteredStudents.length > 0 ? (
                      <input
                        type="text"
                        value={absentNumber}
                        readOnly
                        className="block w-full bg-transparent border-none p-0 pb-2 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-0 outline-none text-center cursor-not-allowed opacity-70"
                        placeholder="-"
                      />
                    ) : absentLimit && absentLimit > 0 ? (
                      <div className="relative group">
                        <select
                          value={absentNumber}
                          onChange={(e) => setAbsentNumber(e.target.value)}
                          onFocus={() => setIsFocused("absent")}
                          onBlur={() => setIsFocused(null)}
                          className="block w-full bg-transparent border-none p-0 pb-2 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-0 outline-none appearance-none cursor-pointer text-center"
                          required
                        >
                          <option
                            value=""
                            disabled
                            className="dark:bg-slate-900"
                          >
                            No...
                          </option>
                          {Array.from(
                            { length: absentLimit },
                            (_, i) => i + 1,
                          ).map((num) => (
                            <option
                              key={num}
                              value={num.toString()}
                              className="dark:bg-slate-900"
                            >
                              {num}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-0 top-0 text-slate-400 pointer-events-none">
                          <ChevronDownIcon className="w-4 h-4" />
                        </div>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={absentNumber}
                        onChange={(e) => setAbsentNumber(e.target.value)}
                        onFocus={() => setIsFocused("absent")}
                        onBlur={() => setIsFocused(null)}
                        className="block w-full bg-transparent border-none p-0 pb-2 text-sm font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:ring-0 outline-none text-center font-mono"
                        placeholder="00 / NIS"
                        required
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 py-1">
              <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1"></div>
              <div className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest">
                Akses Ujian
              </div>
              <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1"></div>
            </div>

            <div
              className={`relative group transition-all duration-300 ${isFocused === "code" ? "scale-[1.02]" : ""}`}
            >
              <div
                className={`absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl opacity-0 group-hover:opacity-20 transition duration-500 blur ${isFocused === "code" ? "opacity-30" : ""}`}
              ></div>
              <div
                className={`relative bg-white dark:bg-slate-900 rounded-xl p-1 flex items-center shadow-sm border transition-colors ${isFocused === "code" ? "border-indigo-100 dark:border-indigo-500" : "border-slate-100 dark:border-slate-800"}`}
              >
                <button
                  type="button"
                  onClick={() => setIsQrScannerOpen(true)}
                  className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-800 text-indigo-500 dark:text-indigo-400 shrink-0 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors cursor-pointer active:scale-95"
                  title="Pindai QR Code"
                >
                  <QrCodeIcon className="w-5 h-5" />
                </button>
                <div className="h-6 w-px bg-slate-100 dark:bg-slate-800 mx-2"></div>
                <input
                  ref={examCodeInputRef}
                  type="text"
                  value={examCode}
                  onChange={(e) => setExamCode(e.target.value)}
                  onFocus={() => setIsFocused("code")}
                  onBlur={() => setIsFocused(null)}
                  className="w-full bg-transparent py-2 text-center font-code text-lg font-bold tracking-[0.25em] text-slate-800 dark:text-slate-100 placeholder:text-slate-200 dark:placeholder:text-slate-700 outline-none uppercase"
                  placeholder={isCheckingCode ? "CARI..." : "KODE"}
                  autoComplete="off"
                  maxLength={6}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-medium animate-fast-fade">
                <div className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-rose-100 dark:bg-rose-800 flex items-center justify-center text-rose-500 dark:text-rose-300 font-bold">
                  !
                </div>
                <p>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || isCheckingCode}
              className="w-full bg-slate-900 dark:bg-indigo-600 text-white font-bold text-sm h-[48px] rounded-xl hover:bg-black dark:hover:bg-indigo-700 hover:shadow-xl hover:shadow-slate-200 dark:hover:shadow-indigo-900/30 transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-3 group relative overflow-hidden disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <span className="relative z-10">Memproses...</span>
                  <div className="absolute inset-0 bg-slate-800 dark:bg-indigo-700"></div>
                </>
              ) : (
                <>
                  <span className="relative z-10">Mulai Mengerjakan</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-indigo-600 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                  <CheckCircleIcon className="w-4 h-4 text-emerald-400 dark:text-emerald-200 group-hover:text-emerald-300 transition-colors relative z-10" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-4 text-center">
          <p className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em]">
            Platform Ujian Cerdas
          </p>
        </div>
      </div>

      {isQrScannerOpen && (
        <QrScannerModal
          onScanSuccess={(text) => {
            let code = text;
            try {
              const url = new URL(text);
              const joinCode = url.searchParams.get("join");
              if (joinCode) code = joinCode;
            } catch {
              /* ignore */
            }
            setExamCode(code);
            setIsQrScannerOpen(false);
          }}
          onClose={() => setIsQrScannerOpen(false)}
        />
      )}

      {pendingStudentData && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-3xl shadow-2xl w-full max-w-md relative animate-slide-in-up border border-white dark:border-slate-700">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-400 mb-4">
              <UserIcon className="w-6 h-6" />
            </div>
            <h3 className="font-black text-slate-800 dark:text-white text-xl mb-1 tracking-tight">
              Konfirmasi Data Diri
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Pastikan data di bawah ini adalah benar milik Anda sebelum memulai
              ujian.
            </p>

            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700/50 space-y-4 mb-6">
              <div>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                  Nama Sekolah
                </p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {pendingStudentData.studentData.schoolName || "-"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                  Nama Siswa
                </p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {pendingStudentData.studentData.fullName}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                    Kelas
                  </p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {pendingStudentData.studentData.class}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 font-sans">
                    No. Absen / NIS
                  </p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 font-mono">
                    {pendingStudentData.studentData.absentNumber}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setPendingStudentData(null);
                  setIsLoading(false);
                }}
                className="flex-1 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors uppercase tracking-wide"
              >
                Bukan, Kembali
              </button>
              <button
                onClick={() => {
                  onLoginSuccess(
                    pendingStudentData.cleanExamCode,
                    pendingStudentData.studentData,
                  );
                  setPendingStudentData(null);
                }}
                className="flex-[1.5] py-3 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 transition-all uppercase tracking-wide flex items-center justify-center gap-2"
              >
                <CheckCircleIcon className="w-4 h-4" />
                Ya, Data Sudah Benar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
