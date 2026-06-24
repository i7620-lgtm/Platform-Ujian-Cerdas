import React, { Suspense } from "react";
import { createPortal } from "react-dom";
import type { Exam, Question, Result, TeacherProfile } from "../types";
import {
  CheckCircleIcon,
  LogoutIcon,
  CalendarDaysIcon,
  XMarkIcon,
  PencilIcon,
  MoonIcon,
  SunIcon,
  QuestionMarkCircleIcon,
  FileTextIcon,
  PlayIcon,
  BookOpenIcon,
  UserIcon,
} from "./Icons";
import { ExamEditor } from "./teacher/ExamEditor";
import {
  CreationView,
  OngoingExamsView,
  UpcomingExamsView,
  FinishedExamsView,
  DraftsView,
  ArchiveViewer,
} from "./teacher/DashboardViews";
import { OngoingExamModal, FinishedExamModal } from "./teacher/DashboardModals";
import { TutorialPage } from "./TutorialPage";
import { InvitationModal } from "./teacher/InvitationModal";
import { useTeacherDashboard } from "./teacher/useTeacherDashboard";

// Lazy Load Admin Views for Super Admin
const UserManagementView = React.lazy(() =>
  import("./teacher/DashboardViews").then((module) => ({
    default: module.UserManagementView,
  })),
);
const BookGeneratorView = React.lazy(() =>
  import("./teacher/BookGeneratorView").then((module) => ({
    default: module.BookGeneratorView,
  })),
);

interface TeacherDashboardProps {
  teacherProfile: TeacherProfile;
  addExam: (newExam: Exam) => void;
  updateExam: (updatedExam: Exam) => void;
  deleteExam: (code: string) => Promise<void>;
  exams: Record<string, Exam>;
  results: Result[];
  onLogout: () => void;
  onRefreshExams: () => Promise<void>;
  onRefreshResults: () => Promise<void>;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  teacherProfile,
  addExam,
  updateExam,
  deleteExam,
  exams,
  results,
  onLogout,
  onRefreshExams,
  onRefreshResults,
  isDarkMode,
  toggleTheme,
}) => {
  const {
    view,
    setView,
    isLoadingArchive,
    selectedOngoingExam,
    setSelectedOngoingExam,
    selectedFinishedExam,
    setSelectedFinishedExam,
    isEditModalOpen,
    setIsEditModalOpen,
    editingExam,
    setEditingExam,
    isInviteOpen,
    setIsInviteOpen,
    isMainGuideModalOpen,
    setIsMainGuideModalOpen,
    resetKey,
    generatedCode,
    manualMode,
    organizerName,
    accountType,
    questions,

    // Filtered lists
    ongoingExams,
    upcomingExams,
    finishedExams,
    draftExams,

    // Handlers
    handleQuestionsGenerated,
    resetForm,
    handleSaveExam,
    handleDeleteExam,
    handleDuplicateExam,
    handleReuseExam,
    handleContinueDraft,
    handleEditExamModal,
    handleArchiveExam,
    handleCancel,
  } = useTeacherDashboard({
    teacherProfile,
    addExam,
    updateExam,
    deleteExam,
    exams,
    results,
    onRefreshExams,
    onRefreshResults,
  });

  if (isMainGuideModalOpen) {
    return <TutorialPage onBack={() => setIsMainGuideModalOpen(false)} />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-900 transition-colors duration-300">
      {isLoadingArchive && (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center pointer-events-auto">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 animate-bounce">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
              Memproses Arsip & Statistik...
            </p>
            <p className="text-xs text-slate-400">
              Mohon tunggu, jangan tutup halaman ini.
            </p>
          </div>
        </div>
      )}

      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40 transition-colors duration-300">
        <div className="w-full max-w-full mx-auto px-4 md:px-6">
          <div className="py-3 md:py-5 flex justify-between items-center">
            <div className="min-w-0 flex-1 mr-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                  Dashboard Guru
                </h1>
                <span
                  className={`shrink-0 text-[8px] sm:text-[10px] font-black uppercase px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border ${
                    accountType === "super_admin"
                      ? "bg-slate-800 text-white border-slate-900"
                      : accountType === "admin_sekolah"
                        ? "bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/50 dark:text-indigo-300 dark:border-indigo-800"
                        : "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-350 dark:border-emerald-850"
                  }`}
                >
                  {accountType.replace("_", " ")}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1">
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 truncate max-w-[150px] sm:max-w-none">
                  {teacherProfile.fullName}
                </span>
                <span className="text-[9px] sm:text-[10px] font-black text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-990 bg-slate-100 text-slate-800 border-slate-100 dark:border-slate-800 break-words">
                  {teacherProfile.school}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              <button
                onClick={() => setIsMainGuideModalOpen(true)}
                className="p-1.5 sm:p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-sm flex items-center gap-2 text-xs font-bold"
                title="Cara Penggunaan"
              >
                <QuestionMarkCircleIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Panduan</span>
              </button>
              <button
                onClick={toggleTheme}
                className="p-1.5 sm:p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-sm"
                title={isDarkMode ? "Mode Terang" : "Mode Gelap"}
              >
                {isDarkMode ? (
                  <SunIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <MoonIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>
              <button
                onClick={onLogout}
                className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs font-black text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors uppercase tracking-widest"
                title="Keluar"
              >
                <LogoutIcon className="w-4 h-4 sm:w-5 sm:h-5" />{" "}
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          </div>
          <nav className="flex w-full items-center justify-between sm:justify-center gap-1 sm:gap-4 md:gap-6 overflow-x-auto custom-scrollbar pb-1 px-1">
            <button
              onClick={() => setView("UPLOAD")}
              className={`pb-2 px-1 sm:px-2 flex flex-col items-center justify-center gap-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border-b-2 min-w-[40px] sm:min-w-[80px] ${view === "UPLOAD" ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400" : "text-slate-400 dark:text-slate-500 border-transparent hover:text-slate-600 dark:hover:text-slate-300"}`}
            >
              <PencilIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="hidden sm:inline">Buat</span>
            </button>
            <button
              onClick={() => setView("DRAFTS")}
              className={`pb-2 px-1 sm:px-2 flex flex-col items-center justify-center gap-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border-b-2 min-w-[40px] sm:min-w-[80px] ${view === "DRAFTS" ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400" : "text-slate-400 dark:text-slate-500 border-transparent hover:text-slate-600 dark:hover:text-slate-300"}`}
            >
              <FileTextIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="hidden sm:inline">Draf</span>
            </button>
            <button
              onClick={() => setView("ONGOING")}
              className={`pb-2 px-1 sm:px-2 flex flex-col items-center justify-center gap-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border-b-2 min-w-[40px] sm:min-w-[80px] ${view === "ONGOING" ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400" : "text-slate-400 dark:text-slate-500 border-transparent hover:text-slate-600 dark:hover:text-slate-300"}`}
            >
              <PlayIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="hidden sm:inline">Berlangsung</span>
            </button>
            <button
              onClick={() => setView("UPCOMING_EXAMS")}
              className={`pb-2 px-1 sm:px-2 flex flex-col items-center justify-center gap-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border-b-2 min-w-[40px] sm:min-w-[80px] ${view === "UPCOMING_EXAMS" ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400" : "text-slate-400 dark:text-slate-500 border-transparent hover:text-slate-600 dark:hover:text-slate-300"}`}
            >
              <CalendarDaysIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="hidden sm:inline">Mendatang</span>
            </button>
            <button
              onClick={() => setView("FINISHED_EXAMS")}
              className={`pb-2 px-1 sm:px-2 flex flex-col items-center justify-center gap-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border-b-2 min-w-[40px] sm:min-w-[80px] ${view === "FINISHED_EXAMS" ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400" : "text-slate-400 dark:text-slate-500 border-transparent hover:text-slate-600 dark:hover:text-slate-300"}`}
            >
              <CheckCircleIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="hidden sm:inline">Selesai</span>
            </button>
            <button
              onClick={() => setView("ARCHIVE_VIEWER")}
              className={`pb-2 px-1 sm:px-2 flex flex-col items-center justify-center gap-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border-b-2 min-w-[40px] sm:min-w-[80px] ${view === "ARCHIVE_VIEWER" ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400" : "text-slate-400 dark:text-slate-500 border-transparent hover:text-slate-600 dark:hover:text-slate-300"}`}
            >
              <BookOpenIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="hidden sm:inline">Arsip</span>
            </button>
            {accountType === "super_admin" && (
              <>
                <button
                  onClick={() => setView("ADMIN_USERS")}
                  className={`pb-2 px-1 sm:px-2 flex flex-col items-center justify-center gap-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border-b-2 min-w-[40px] sm:min-w-[80px] ${view === "ADMIN_USERS" ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400" : "text-slate-400 dark:text-slate-500 border-transparent hover:text-slate-600 dark:hover:text-slate-300"}`}
                >
                  <UserIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span className="hidden sm:inline">Kelola</span>
                </button>
                <button
                  onClick={() => setView("BOOK_GENERATOR")}
                  className={`pb-2 px-1 sm:px-2 flex flex-col items-center justify-center gap-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border-b-2 min-w-[40px] sm:min-w-[80px] ${view === "BOOK_GENERATOR" ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400" : "text-slate-400 dark:text-slate-500 border-transparent hover:text-slate-600 dark:hover:text-slate-300"}`}
                >
                  <BookOpenIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span className="hidden sm:inline">Buku Soal</span>
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="w-full max-w-full mx-auto p-4 md:p-10">
        {view === "UPLOAD" && (
          <>
            <CreationView
              key={resetKey}
              onQuestionsGenerated={handleQuestionsGenerated}
              isPremium={teacherProfile.isPremium || false}
            />
            {(questions.length > 0 || manualMode || editingExam) && (
              <ExamEditor
                isEditing={!!editingExam && editingExam.status !== "DRAFT"}
                onSave={() => handleSaveExam("PUBLISHED")}
                onSaveDraft={() => handleSaveExam("DRAFT")}
                onCancel={handleCancel}
                generatedCode={generatedCode}
                onReset={resetForm}
                isPremium={teacherProfile.isPremium || false}
              />
            )}
          </>
        )}
        {view === "DRAFTS" && (
          <DraftsView
            exams={draftExams}
            onDeleteDraft={handleDeleteExam}
            onContinueDraft={handleContinueDraft}
          />
        )}
        {view === "ONGOING" && (
          <OngoingExamsView
            exams={ongoingExams}
            results={results}
            onDuplicateExam={handleDuplicateExam}
            onRefresh={onRefreshExams}
            setSelectedOngoingExam={setSelectedOngoingExam}
          />
        )}
        {view === "UPCOMING_EXAMS" && (
          <UpcomingExamsView
            exams={upcomingExams}
            teacherProfile={teacherProfile}
            onDeleteExam={handleDeleteExam}
            onRefresh={onRefreshExams}
            onEditExam={handleEditExamModal}
            onDuplicateExam={handleDuplicateExam}
          />
        )}
        {view === "FINISHED_EXAMS" && (
          <FinishedExamsView
            exams={finishedExams}
            onDeleteExam={handleDeleteExam}
            onArchiveExam={handleArchiveExam}
            onDuplicateExam={handleDuplicateExam}
            onViewResults={setSelectedFinishedExam}
          />
        )}
        {view === "ARCHIVE_VIEWER" && (
          <ArchiveViewer
            onReuseExam={handleReuseExam}
            teacherProfile={teacherProfile}
          />
        )}
        {view === "ADMIN_USERS" && accountType === "super_admin" && (
          <Suspense
            fallback={
              <div className="text-center p-10 text-slate-400">
                Memuat Manajemen Pengguna...
              </div>
            }
          >
            <UserManagementView />
          </Suspense>
        )}
        {view === "BOOK_GENERATOR" && accountType === "super_admin" && (
          <Suspense
            fallback={
              <div className="text-center p-10 text-slate-400">
                Memuat Generator Buku Soal...
              </div>
            }
          >
            <BookGeneratorView profile={teacherProfile} />
          </Suspense>
        )}
      </main>

      {selectedOngoingExam && (
        <OngoingExamModal
          exam={selectedOngoingExam}
          teacherProfile={teacherProfile}
          onClose={() => setSelectedOngoingExam(null)}
          isPremium={teacherProfile.isPremium || false}
        />
      )}

      {selectedFinishedExam && (
        <FinishedExamModal
          exam={selectedFinishedExam}
          teacherProfile={teacherProfile}
          onClose={() => setSelectedFinishedExam(null)}
        />
      )}

      {isEditModalOpen &&
        editingExam &&
        createPortal(
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col border border-white dark:border-slate-700">
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 rounded-t-3xl">
                <h2 className="font-black text-slate-800 dark:text-white">
                  Edit Detail Ujian
                </h2>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-2 bg-slate-50 dark:bg-slate-700 text-slate-400 rounded-xl hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/30 transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              <div className="p-4 md:p-8 overflow-y-auto overflow-x-hidden flex-1 bg-slate-50/30 dark:bg-slate-900/50">
                <ExamEditor
                  isEditing={true}
                  onSave={() => handleSaveExam("PUBLISHED")}
                  onSaveDraft={() => handleSaveExam("DRAFT")}
                  onCancel={() => setIsEditModalOpen(false)}
                  generatedCode={""}
                  onReset={() => {}}
                  isPremium={teacherProfile.isPremium || false}
                />
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Personal Invitation Modal */}
      <InvitationModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        teacherName={organizerName}
        schoolName={teacherProfile.school}
      />
    </div>
  );
};
