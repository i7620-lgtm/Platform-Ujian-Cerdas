import React from "react";
import { createPortal } from "react-dom";
import type { Exam, TeacherProfile } from "../../../../types";
import {
  ChartBarIcon,
  ListBulletIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from "../../../Icons";

// Subcomponents
import { FinishedAnalysisTab } from "./FinishedAnalysisTab";
import { FinishedStudentsTab } from "./FinishedStudentsTab";
import { useFinishedExamModal } from "./useFinishedExamModal";

interface FinishedExamModalProps {
  exam: Exam;
  teacherProfile: TeacherProfile;
  onClose: () => void;
}

export const FinishedExamModal: React.FC<FinishedExamModalProps> = ({
  exam,
  teacherProfile,
  onClose,
}) => {
  const {
    displayExam,
    results,
    isLoading,
    activeTab,
    selectedClass,
    expandedStudent,
    ungradedCount,
    totalStudents,
    averageScore,
    highestScore,
    lowestScore,
    averageCompletionTime,
    uniqueClasses,
    filteredResults,
    categoryStats,
    levelStats,
    questionTypeStats,
    questionStats,
    setActiveTab,
    setSelectedClass,
    handleUpdateKey,
    handleDeleteResult,
    getCalculatedStats,
    formatDuration,
    checkAnswerStatus,
    toggleStudent,
    rateQuestion,
  } = useFinishedExamModal({ exam, teacherProfile, isOpen: true });

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl w-full max-w-full h-[85vh] flex flex-col overflow-hidden border border-white dark:border-slate-700 relative">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-slate-800 sticky top-0 z-10 gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight font-sans">
              Analisis Hasil Ujian
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {displayExam.config.subject} •{" "}
              <span className="font-code slashed-zero">{displayExam.code}</span>
              {displayExam.authorSchool ? ` • ${displayExam.authorSchool}` : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <div className="bg-slate-100 dark:bg-slate-700 p-1 rounded-xl flex">
              <button
                onClick={() => setActiveTab("ANALYSIS")}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === "ANALYSIS" ? "bg-white dark:bg-slate-600 shadow text-slate-800 dark:text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}
              >
                <ChartBarIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Analisis Soal</span>
              </button>
              <button
                onClick={() => setActiveTab("STUDENTS")}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === "STUDENTS" ? "bg-white dark:bg-slate-600 shadow text-slate-800 dark:text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}
              >
                <ListBulletIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Rekap Siswa</span>
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-300 rounded-xl hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/30 dark:hover:text-rose-400 transition-all"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {ungradedCount > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/30 px-6 py-3 border-b border-yellow-100 dark:border-yellow-800 flex items-center gap-4 animate-slide-in-up">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0" />
            <p className="text-xs font-bold text-yellow-800 dark:text-yellow-200">
              Peringatan: Terdapat {ungradedCount} siswa dengan jawaban Esai /
              Isian Singkat yang belum dinilai manual. Mohon periksa dan beri
              nilai sebelum finalisasi.
            </p>
          </div>
        )}

        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-900/50">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500 font-bold">
              Memuat data...
            </div>
          ) : activeTab === "ANALYSIS" ? (
            <FinishedAnalysisTab
              displayExam={displayExam}
              results={results}
              averageScore={averageScore}
              highestScore={highestScore}
              lowestScore={lowestScore}
              totalStudents={totalStudents}
              averageCompletionTime={averageCompletionTime}
              formatDuration={formatDuration}
              categoryStats={categoryStats}
              levelStats={levelStats}
              questionTypeStats={questionTypeStats}
              questionStats={questionStats}
              handleUpdateKey={handleUpdateKey}
            />
          ) : (
            <FinishedStudentsTab
              displayExam={displayExam}
              results={results}
              filteredResults={filteredResults}
              uniqueClasses={uniqueClasses}
              selectedClass={selectedClass}
              setSelectedClass={setSelectedClass}
              expandedStudent={expandedStudent}
              toggleStudent={toggleStudent}
              rateQuestion={rateQuestion}
              handleDeleteResult={handleDeleteResult}
              getCalculatedStats={getCalculatedStats}
              formatDuration={formatDuration}
              checkAnswerStatus={checkAnswerStatus}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};
