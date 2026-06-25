import React from "react";
import { createPortal } from "react-dom";
import type { Exam, TeacherProfile } from "../../../../types";
import {
  XMarkIcon,
  LockClosedIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  QrCodeIcon,
  ShareIcon,
  UserIcon,
  ClockIcon,
  SignalIcon,
  TrashIcon,
  PencilIcon,
  LockOpenIcon,
} from "../../../Icons";
import { RemainingTime } from "../../DashboardViews";

// Subcomponents
import { ShareModal } from "./ShareModal";
import { JoinQRModal } from "./JoinQRModal";
import { GuideModal } from "./GuideModal";
import { ManualEditStudentModal } from "./ManualEditStudentModal";
import { GeneratedTokenPopup } from "./GeneratedTokenPopup";
import { useOngoingExamModal } from "./useOngoingExamModal";

interface OngoingExamModalProps {
  exam: Exam | null;
  teacherProfile?: TeacherProfile;
  onClose: () => void;
  isReadOnly?: boolean;
  isPremium?: boolean;
}

export const OngoingExamModal: React.FC<OngoingExamModalProps> = (props) => {
  const { exam, onClose, teacherProfile, isReadOnly, isPremium } = props;

  const {
    displayExam,
    selectedClass,
    selectedSchool,
    statusFilter,
    localResults,
    isRefreshing,
    isAddTimeOpen,
    addTimeValue,
    isShareModalOpen,
    isJoinQrModalOpen,
    isGuideModalOpen,
    generatedTokenData,
    editingStudent,
    onlineStudents,
    setSelectedClass,
    setSelectedSchool,
    setStatusFilter,
    setIsAddTimeOpen,
    setAddTimeValue,
    setIsShareModalOpen,
    setIsJoinQrModalOpen,
    setIsGuideModalOpen,
    setEditingStudent,
    setGeneratedTokenData,
    handleGenerateToken,
    handleUpdateStudentSubmit,
    handleDeleteStudent,
    handleFinishStudentExam,
    handleFinishAllExams,
    handleAddTimeSubmit,
    getRelativeTime,
    calculateScore,
    liveUrl,
    joinUrl,
    isLargeScale,
    lockedCount,
    onlineCount,
    completedCount,
    sortedResults,
    uniqueClassesInResults,
    uniqueSchoolsInResults,
  } = useOngoingExamModal({ exam, teacherProfile, onClose, isPremium });

  if (!displayExam) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 z-50 animate-fade-in">
        <div className="bg-white dark:bg-slate-800 sm:rounded-[2rem] shadow-2xl w-full max-w-full h-full sm:h-[90vh] flex flex-col overflow-hidden relative border border-white dark:border-slate-700">
          {/* Header Modal */}
          <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100 dark:border-slate-700 flex flex-col gap-3 bg-white dark:bg-slate-800 sticky top-0 z-20 shadow-sm font-sans">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div className="flex items-center gap-3 w-full lg:w-auto">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none shrink-0">
                  <SignalIcon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-white tracking-tight leading-tight flex items-center gap-2">
                    Live Monitoring
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] sm:text-[10px] font-code slashed-zero font-black px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-600 tracking-widest uppercase">
                      {displayExam.code}
                    </span>
                    <RemainingTime exam={displayExam} />
                    {isRefreshing && (
                      <span className="text-[9px] sm:text-[10px] font-bold text-indigo-500 dark:text-indigo-400 animate-pulse">
                        Sync...
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full lg:w-auto justify-start lg:justify-end">
                {displayExam.config.examMode !== "PR" && (
                  <button
                    onClick={() =>
                      setStatusFilter(
                        statusFilter === "LOCKED" ? "ALL" : "LOCKED",
                      )
                    }
                    className={`p-1.5 sm:px-3 sm:py-1.5 flex items-center gap-1.5 sm:gap-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all border shadow-sm ${statusFilter === "LOCKED" ? "bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700" : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"}`}
                    title="Siswa Terkunci"
                  >
                    <LockClosedIcon className="w-3.5 h-3.5" />
                    <span>Terkunci ({lockedCount})</span>
                  </button>
                )}

                {isAddTimeOpen ? (
                  <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-50 dark:bg-slate-900 pl-3 pr-1 py-1 rounded-xl border border-slate-200 dark:border-slate-700 animate-slide-in-right">
                    <span className="text-[9px] sm:text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                      Tambah Waktu (Menit):
                    </span>
                    <input
                      type="number"
                      value={addTimeValue}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAddTimeValue(val === "" ? "" : parseInt(val) || 0);
                      }}
                      className="w-12 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold outline-none text-slate-800 dark:text-white"
                      placeholder="Min"
                      min="1"
                    />
                    <button
                      onClick={handleAddTimeSubmit}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] sm:text-[10px] font-bold rounded-lg transition-colors"
                    >
                      Simpan
                    </button>
                    <button
                      onClick={() => {
                        setIsAddTimeOpen(false);
                        setAddTimeValue("");
                      }}
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 rounded-lg transition-colors"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAddTimeOpen(true)}
                    className="p-1.5 sm:px-3 sm:py-1.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[9px] sm:text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-1.5 sm:gap-2"
                  >
                    <ClockIcon className="w-3.5 h-3.5" />
                    <span>Atur Waktu</span>
                  </button>
                )}

                {displayExam.config.examMode !== "PR" && (
                  <button
                    onClick={handleFinishAllExams}
                    className="p-1.5 sm:px-3 sm:py-1.5 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 sm:gap-2 shadow-lg shadow-rose-150 dark:shadow-none hover:shadow-xl hover:-translate-y-0.5"
                  >
                    <XMarkIcon className="w-3.5 h-3.5" />
                    <span>Hentikan Ujian</span>
                  </button>
                )}

                <button
                  onClick={onClose}
                  className="p-1.5 sm:p-2 bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-300 rounded-xl hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/30 transition-colors"
                >
                  <XMarkIcon className="w-4 h-4 sm:w-5 h-5" />
                </button>
              </div>
            </div>

            {/* FILTER & OPTION BAR */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-50 dark:border-slate-700/50">
              <div className="flex flex-wrap items-center gap-3">
                {/* Filter Class */}
                {uniqueClassesInResults.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">
                      Kelas:
                    </span>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="text-[10px] font-black p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm"
                    >
                      <option value="ALL">Semua ({localResults.length})</option>
                      {uniqueClassesInResults.map((cl) => (
                        <option key={cl} value={cl}>
                          {cl}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Filter School */}
                {uniqueSchoolsInResults.length > 1 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">
                      Sekolah:
                    </span>
                    <select
                      value={selectedSchool}
                      onChange={(e) => setSelectedSchool(e.target.value)}
                      className="text-[10px] font-black p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm"
                    >
                      <option value="ALL">Semua Sekolah</option>
                      {uniqueSchoolsInResults.map((sch) => (
                        <option key={sch} value={sch}>
                          {sch}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsGuideModalOpen(true)}
                  className="p-1.5 sm:px-3 sm:py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[9px] sm:text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all flex items-center gap-1.5 sm:gap-2 shadow-sm border border-blue-100 dark:border-blue-800"
                  title="Cara Pakai"
                >
                  <ArrowPathIcon className="w-3 h-3 text-blue-600" />
                  <span>Petunjuk</span>
                </button>
                <button
                  onClick={() => setIsJoinQrModalOpen(true)}
                  className="p-1.5 sm:px-3 sm:py-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[9px] sm:text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all flex items-center gap-1.5 sm:gap-2 shadow-sm border border-emerald-100 dark:border-emerald-800"
                  title="Akses Siswa"
                >
                  <QrCodeIcon className="w-3 h-3" />
                  <span>Akses Siswa</span>
                </button>
                <button
                  onClick={() => setIsShareModalOpen(true)}
                  className="p-1.5 sm:px-3 sm:py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[9px] sm:text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all flex items-center gap-1.5 sm:gap-2 shadow-sm border border-indigo-100 dark:border-indigo-800"
                  title="Stream"
                >
                  <ShareIcon className="w-3 h-3" />
                  <span>Bagikan Stream</span>
                </button>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col gap-6 font-sans">
            {/* Live Counter Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center font-bold text-lg">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    Total Siswa
                  </div>
                  <div className="text-xl font-black text-slate-800 dark:text-white mt-0.5">
                    {localResults.length}
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center font-bold text-lg">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    Sedang Mengerjakan
                  </div>
                  <div className="text-xl font-black text-slate-800 dark:text-white mt-0.5">
                    {onlineCount}
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center font-bold text-lg">
                  <LockClosedIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    Sesi Terkunci
                  </div>
                  <div className="text-xl font-black text-slate-800 dark:text-white mt-0.5">
                    {lockedCount}
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-50 dark:bg-slate-700 text-slate-550 dark:text-slate-355 rounded-2xl flex items-center justify-center font-bold text-lg">
                  <CheckCircleIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    Selesai Kumpul
                  </div>
                  <div className="text-xl font-black text-slate-800 dark:text-white mt-0.5">
                    {completedCount}
                  </div>
                </div>
              </div>
            </div>

            {/* Main Student List Board */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex-1 overflow-hidden flex flex-col">
              <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        No. Absen & Siswa
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        Status
                      </th>
                      {!isLargeScale && (
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">
                          Progress
                        </th>
                      )}
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">
                        Nilai Sementara
                      </th>
                      {!isReadOnly && (
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">
                          Aksi
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {sortedResults.length > 0 ? (
                      sortedResults.map((r) => {
                        const totalQuestions =
                          r.totalQuestions ||
                          displayExam.questions.filter(
                            (q) => q.questionType !== "INFO",
                          ).length;
                        const answeredCount = Object.keys(
                          r.answers || {},
                        ).filter((k) => !k.startsWith("_grade_")).length;
                        const computedScore = calculateScore(r);
                        const isOnline = onlineStudents[r.student.studentId];

                        return (
                          <tr
                            key={r.student.studentId}
                            className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 text-xs">
                                  {r.student.absentNumber}
                                </div>
                                <div>
                                  <div className="text-sm font-bold text-slate-800 dark:text-white">
                                    {r.student.fullName}
                                  </div>
                                  <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider mt-0.5">
                                    {r.student.class}{" "}
                                    {r.student.schoolName
                                      ? `• ${r.student.schoolName}`
                                      : ""}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {r.status === "completed" ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-lg text-[10px] font-black uppercase border border-slate-200 dark:border-slate-600">
                                  <CheckCircleIcon className="w-3.5 h-3.5" />{" "}
                                  Selesai
                                </span>
                              ) : r.status === "force_closed" ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-lg text-[10px] font-black uppercase border border-rose-100 dark:border-rose-900 animate-pulse">
                                  <LockClosedIcon className="w-3.5 h-3.5" />{" "}
                                  Terkunci
                                </span>
                              ) : isOnline ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-black uppercase border border-emerald-100 dark:border-emerald-900 shadow-sm">
                                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>{" "}
                                  Online
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg text-[10px] font-black uppercase border border-slate-200 dark:border-slate-700">
                                  Offline
                                </span>
                              )}
                            </td>

                            {!isLargeScale && (
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <div className="inline-flex flex-col items-center gap-1">
                                  <div className="flex items-center gap-1">
                                    <div className="w-24 bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                                      <div
                                        className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                                        style={{
                                          width: `${totalQuestions > 0 ? Math.min(100, (answeredCount / totalQuestions) * 100) : 0}%`,
                                        }}
                                      ></div>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-500">
                                      {answeredCount}/{totalQuestions}
                                    </span>
                                  </div>
                                  {r.timestamp && (
                                    <span className="text-[8px] font-mono text-slate-400">
                                      Aktif: {getRelativeTime(r.timestamp)}
                                    </span>
                                  )}
                                </div>
                              </td>
                            )}

                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              {displayExam.config.showResultToStudent ? (
                                <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono bg-indigo-50/50 dark:bg-indigo-900/10 px-2 py-1 rounded">
                                  {r.score !== undefined
                                    ? r.score
                                    : computedScore}
                                </span>
                              ) : (
                                <span className="text-xs font-bold text-slate-400 italic">
                                  Disembunyikan
                                </span>
                              )}
                            </td>

                            {!isReadOnly && (
                              <td className="px-6 py-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1 sm:gap-2">
                                  <button
                                    onClick={() =>
                                      setEditingStudent({
                                        id: r.id,
                                        studentId: r.student.studentId,
                                        fullName: r.student.fullName,
                                        schoolName: r.student.schoolName,
                                        class: r.student.class,
                                        absentNumber: r.student.absentNumber,
                                      })
                                    }
                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-colors"
                                    title="Edit Data Siswa"
                                  >
                                    <PencilIcon className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDeleteStudent(
                                        r.student.studentId,
                                        r.student.fullName,
                                      )
                                    }
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                                    title="Hapus Data Siswa"
                                  >
                                    <TrashIcon className="w-4 h-4" />
                                  </button>

                                  {r.status !== "completed" &&
                                    displayExam.config.examMode !== "PR" && (
                                      <div className="flex items-center gap-1 border-l pl-2 border-slate-100 dark:border-slate-700 ml-1">
                                        {r.status === "force_closed" ? (
                                          <button
                                            onClick={() =>
                                              handleGenerateToken(
                                                r.student.studentId,
                                                r.student.fullName,
                                              )
                                            }
                                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase rounded-lg transition-all shadow-sm active:scale-95 flex items-center gap-1"
                                          >
                                            <LockOpenIcon className="w-3 h-3" />
                                            <span>Buka Kunci</span>
                                          </button>
                                        ) : (
                                          <button
                                            onClick={() =>
                                              handleGenerateToken(
                                                r.student.studentId,
                                                r.student.fullName,
                                              )
                                            }
                                            className="px-3 py-1.5 bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300 transition-all border border-indigo-200 dark:border-indigo-800 shadow-sm active:scale-95"
                                          >
                                            Buat Token
                                          </button>
                                        )}
                                        <button
                                          onClick={() =>
                                            handleFinishStudentExam(
                                              r.student.studentId,
                                              r.student.fullName,
                                            )
                                          }
                                          className="px-3 py-1.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all border border-rose-200 dark:border-rose-800 shadow-sm active:scale-95"
                                        >
                                          Hentikan
                                        </button>
                                      </div>
                                    )}
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-20 text-center">
                          <div className="flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 gap-2">
                            <UserIcon className="w-8 h-8 opacity-20" />
                            <span className="text-sm font-medium italic">
                              Belum ada siswa yang bergabung...
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 dark:text-slate-500 font-medium flex justify-between items-center sticky bottom-0">
                <span>Total: {localResults.length} Siswa</span>
                <span>Updated: {new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modular Sub-modals */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        liveUrl={liveUrl}
      />

      <JoinQRModal
        isOpen={isJoinQrModalOpen}
        onClose={() => setIsJoinQrModalOpen(false)}
        joinUrl={joinUrl}
        examCode={displayExam.code}
      />

      <GuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        examMode={displayExam.config.examMode}
      />

      <ManualEditStudentModal
        isOpen={!!editingStudent}
        onClose={() => setEditingStudent(null)}
        student={editingStudent}
        onSave={handleUpdateStudentSubmit}
      />

      <GeneratedTokenPopup
        isOpen={!!generatedTokenData}
        onClose={() => setGeneratedTokenData(null)}
        tokenData={generatedTokenData}
      />
    </>,
    document.body,
  );
};
