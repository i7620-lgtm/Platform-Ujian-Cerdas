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
  DocumentDuplicateIcon,
  BookOpenIcon,
} from "../../../Icons";
import { RemainingTime } from "../../DashboardViews";

// Subcomponents
import { ShareModal } from "./ShareModal";
import { JoinQRModal } from "./JoinQRModal";
import { GuideModal } from "./GuideModal";
import { ManualEditStudentModal } from "./ManualEditStudentModal";
import { GeneratedTokenPopup } from "./GeneratedTokenPopup";
import { AddTimeModal } from "./AddTimeModal";
import { PrintSoalModal } from "./PrintSoalModal";
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
    isPrintModalOpen,
    confirmDialog,
    alertDialog,
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
    setIsPrintModalOpen,
    setConfirmDialog,
    setAlertDialog,
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
          <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-b border-slate-100 dark:border-slate-700/80 bg-white dark:bg-slate-800 sticky top-0 z-20 shadow-xs font-sans flex flex-col gap-2.5">
            {/* Top Row: Title, Code, Timer, and Close Button */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-xs shrink-0">
                  <SignalIcon className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <h2 className="text-sm sm:text-base font-black text-slate-800 dark:text-white tracking-tight leading-tight whitespace-nowrap">
                    Live Monitoring
                  </h2>
                  <span className="text-[10px] font-mono font-black px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-600 tracking-wider uppercase">
                    {displayExam.code}
                  </span>
                  <RemainingTime exam={displayExam} size="sm" />
                  {isRefreshing && (
                    <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 animate-pulse">
                      Sync...
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-xs shrink-0"
                title="Tutup Modal"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Bottom Row: All Filter and Action Buttons Flowing Adjacent to Each Other */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`px-2.5 py-1.5 flex items-center gap-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all shadow-xs shrink-0 ${
                  statusFilter === "ALL"
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-indigo-200 dark:shadow-none ring-1 ring-indigo-400/30"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750"
                }`}
              >
                <span
                  className={`min-w-4 h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-bold ${
                    statusFilter === "ALL"
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {localResults.length}
                </span>
                <span>SEMUA</span>
              </button>

              <button
                onClick={() =>
                  setStatusFilter(
                    statusFilter === "ONLINE" ? "ALL" : "ONLINE",
                  )
                }
                className={`px-2.5 py-1.5 flex items-center gap-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all shadow-xs shrink-0 ${
                  statusFilter === "ONLINE"
                    ? "bg-emerald-600 border-emerald-600 text-white shadow-emerald-200 dark:shadow-none ring-1 ring-emerald-400/30"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750"
                }`}
              >
                <span
                  className={`min-w-4 h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-bold ${
                    statusFilter === "ONLINE"
                      ? "bg-white/20 text-white"
                      : "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300"
                  }`}
                >
                  {onlineCount}
                </span>
                <span>MENGERJAKAN</span>
              </button>

              <button
                onClick={() =>
                  setStatusFilter(
                    statusFilter === "LOCKED" ? "ALL" : "LOCKED",
                  )
                }
                className={`px-2.5 py-1.5 flex items-center gap-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all shadow-xs shrink-0 ${
                  statusFilter === "LOCKED"
                    ? "bg-rose-600 border-rose-600 text-white shadow-rose-200 dark:shadow-none ring-1 ring-rose-400/30"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750"
                }`}
              >
                <span
                  className={`min-w-4 h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-bold ${
                    statusFilter === "LOCKED"
                      ? "bg-white/20 text-white"
                      : "bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300"
                  }`}
                >
                  {lockedCount}
                </span>
                <span>TERKUNCI</span>
              </button>

              <button
                onClick={() =>
                  setStatusFilter(
                    statusFilter === "COMPLETED" ? "ALL" : "COMPLETED",
                  )
                }
                className={`px-2.5 py-1.5 flex items-center gap-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all shadow-xs shrink-0 ${
                  statusFilter === "COMPLETED"
                    ? "bg-blue-600 border-blue-600 text-white shadow-blue-200 dark:shadow-none ring-1 ring-blue-400/30"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750"
                }`}
              >
                <span
                  className={`min-w-4 h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-bold ${
                    statusFilter === "COMPLETED"
                      ? "bg-white/20 text-white"
                      : "bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300"
                  }`}
                >
                  {completedCount}
                </span>
                <span>SELESAI</span>
              </button>

              <select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-xs shrink-0"
                title="Filter Sekolah"
              >
                <option value="ALL">Semua Sekolah</option>
                {uniqueSchoolsInResults.map((sch) => (
                  <option key={sch} value={sch}>
                    {sch}
                  </option>
                ))}
              </select>

              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-xs shrink-0"
                title="Filter Kelas"
              >
                <option value="ALL">Semua Kelas ({localResults.length})</option>
                {uniqueClassesInResults.map((cl) => (
                  <option key={cl} value={cl}>
                    {cl}
                  </option>
                ))}
              </select>

              {displayExam.config.examMode !== "PR" && (
                <button
                  onClick={handleFinishAllExams}
                  className="px-2.5 py-1.5 flex items-center gap-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-[10px] font-black uppercase tracking-wider transition-all shadow-xs shrink-0"
                >
                  <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>SELESAIKAN UJIAN</span>
                </button>
              )}

              {displayExam.config.examMode !== "PR" && (
                <button
                  onClick={() => setIsAddTimeOpen(true)}
                  className="px-2.5 py-1.5 flex items-center gap-1.5 rounded-lg border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 text-[10px] font-black uppercase tracking-wider transition-all shadow-xs shrink-0"
                >
                  <ClockIcon className="w-3.5 h-3.5 text-purple-500" />
                  <span>TAMBAH WAKTU</span>
                </button>
              )}
              
              <button
                id="ongoing-student-access-btn"
                onClick={() => setIsJoinQrModalOpen(true)}
                className="px-2.5 py-1.5 flex items-center gap-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-[10px] font-black uppercase tracking-wider transition-all shadow-xs shrink-0"
              >
                <QrCodeIcon className="w-3.5 h-3.5 text-indigo-500" />
                <span>AKSES SISWA</span>
              </button>

              {displayExam.config.enablePublicStream && (
                <button
                  id="ongoing-parent-access-btn"
                  onClick={() => setIsShareModalOpen(true)}
                  className="px-2.5 py-1.5 flex items-center gap-1.5 rounded-lg border border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/40 text-[10px] font-black uppercase tracking-wider transition-all shadow-xs shrink-0"
                  title="Akses Pantauan Orang Tua"
                >
                  <ShareIcon className="w-3.5 h-3.5 text-teal-500" />
                  <span>AKSES ORANG TUA</span>
                </button>
              )}

              <button
                onClick={() => setIsPrintModalOpen(true)}
                className="px-2.5 py-1.5 flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-[10px] font-black uppercase tracking-wider transition-all shadow-xs shrink-0"
              >
                <DocumentDuplicateIcon className="w-3.5 h-3.5 text-slate-400" />
                <span>SOAL PDF</span>
              </button>

              <button
                onClick={() => setIsGuideModalOpen(true)}
                className="px-2.5 py-1.5 flex items-center gap-1.5 rounded-lg border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-[10px] font-black uppercase tracking-wider transition-all shadow-xs shrink-0"
              >
                <BookOpenIcon className="w-3.5 h-3.5 text-blue-500" />
                <span>PANDUAN</span>
              </button>
            </div>
          </div>

          {/* Content Section */}
          <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col gap-6 font-sans">
            {/* Main Student List Board */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex-1 overflow-hidden flex flex-col">
              <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        IDENTITAS SISWA
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">
                        KELAS
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        STATUS
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">
                        NILAI
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">
                        WAKTU
                      </th>
                      {!isReadOnly && (
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">
                          AKSI
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
                        ).filter((k) => !k.startsWith("_")).length;
                        const computedScore = calculateScore(r);
                        const isOnline = onlineStudents[r.student.studentId];
                        const cleanClass = r.student.class
                          ? r.student.class.includes("-")
                            ? r.student.class
                                .split("-")
                                .pop()
                                ?.replace(/\(\d+\)$/, "")
                                .trim() || r.student.class
                            : r.student.class.replace(/\(\d+\)$/, "").trim()
                          : "-";

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
                                    {r.student.schoolName || "-"}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-100 dark:border-slate-700">
                                {cleanClass || "-"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {r.status === "completed" ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-black uppercase border border-indigo-200 dark:border-indigo-800 shadow-sm">
                                  <CheckCircleIcon className="w-3.5 h-3.5 text-indigo-500" />
                                  <span>Sudah Selesai</span>
                                </span>
                              ) : r.status === "force_closed" ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg text-[10px] font-black uppercase border border-rose-200 dark:border-rose-800 shadow-sm animate-pulse">
                                  <LockClosedIcon className="w-3.5 h-3.5 text-rose-500" />
                                  <span>Terkunci</span>
                                </span>
                              ) : (
                                <div className="flex flex-col gap-1">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-black uppercase border border-emerald-200 dark:border-emerald-800 shadow-sm">
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                                    <span>Sedang Mengerjakan</span>
                                    {isOnline && !displayExam?.config?.disableRealtime ? (
                                      <span className="text-[8px] px-1.5 py-0.5 bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 rounded font-black tracking-widest ml-0.5">
                                        ONLINE
                                      </span>
                                    ) : null}
                                  </span>
                                  {!displayExam?.config?.disableRealtime && totalQuestions > 0 && (
                                    <div className="flex items-center gap-1.5 text-[9px] text-slate-400 dark:text-slate-500 font-bold pl-0.5">
                                      <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                          style={{
                                            width: `${Math.min(100, Math.round((answeredCount / totalQuestions) * 100))}%`,
                                          }}
                                        />
                                      </div>
                                      <span>
                                        {answeredCount}/{totalQuestions} Soal
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono bg-indigo-50/50 dark:bg-indigo-900/10 px-2 py-1 rounded">
                                {r.score > 0 ? r.score : computedScore > 0 ? computedScore : r.score !== undefined ? r.score : 0}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              {r.status === "completed" ? (
                                <span className="text-[10px] font-black text-slate-400 uppercase">Selesai</span>
                              ) : r.timestamp ? (
                                <span className="text-[10px] font-black text-slate-500 font-mono">
                                  {getRelativeTime(r.timestamp)}
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-slate-300">-</span>
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
        examCode={displayExam.code}
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

      <AddTimeModal
        isOpen={isAddTimeOpen}
        onClose={() => setIsAddTimeOpen(false)}
        addTimeValue={addTimeValue}
        setAddTimeValue={setAddTimeValue}
        onSubmit={handleAddTimeSubmit}
      />

      <PrintSoalModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        exam={displayExam}
      />

      {confirmDialog?.isOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6 border border-slate-100 dark:border-slate-700 animate-slide-up">
            <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2">Konfirmasi</h3>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6">{confirmDialog.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDialog((prev: any) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all active:scale-95"
              >
                Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {alertDialog?.isOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6 border border-slate-100 dark:border-slate-700 animate-slide-up text-center">
            <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2">Pemberitahuan</h3>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6">{alertDialog.message}</p>
            <button
              onClick={() => setAlertDialog((prev: any) => ({ ...prev, isOpen: false }))}
              className="px-6 py-2 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all active:scale-95 w-full"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </>,
    document.body,
  );
};
