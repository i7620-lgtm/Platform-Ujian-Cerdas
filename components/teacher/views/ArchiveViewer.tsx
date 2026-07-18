import React, { useEffect, useMemo } from "react";
import { useArchiveViewerLogic } from "./useArchiveViewerLogic";
import type {
  ArchiveViewerProps,
  ArchiveData,
  Exam,
  Result,
} from "../../../types";
import { storageService } from "../../../services/storage";
import {
  calculateAggregateStats,
  analyzeQuestionTypePerformance,
} from "../examUtils";
import { archiveService } from "../../../services/archive";
import { ExclamationTriangleIcon } from "../../Icons";

// Subcomponents
import { ArchiveSavedList } from "../archive/ArchiveSavedList";
import { ArchiveFileUploader } from "../archive/ArchiveFileUploader";
import { EditMetadataModal } from "../archive/EditMetadataModal";
import {
  ArchiveDetailUjianView,
  ArchiveStudentsRecapView,
} from "../archive/ArchiveExamDetails";
import { ArchiveQuestionAnalysis } from "../archive/ArchiveQuestionAnalysis";
import { ArchiveClassAnalysis } from "../archive/ArchiveClassAnalysis";
import { ArchiveHeaderActions } from "../archive/ArchiveHeaderActions";
import {
  fixArchiveDataSorting,
  getCalculatedStats,
  checkAnswerStatus,
} from "../archive/archiveUtils";
import { useArchiveViewer } from "../useArchiveViewer";

function lazyWithRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      console.error("Gagal memuat komponen dinamis, memuat ulang halaman...", error);
      const isChunkLoadFailed = 
        error instanceof TypeError ||
        (error as any)?.name === "ChunkLoadError" ||
        /Failed to fetch dynamically imported module|chunk/i.test(String(error));
        
      if (isChunkLoadFailed) {
        const lastReload = sessionStorage.getItem("last-chunk-reload-print");
        const now = Date.now();
        if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
          sessionStorage.setItem("last-chunk-reload-print", String(now));
          window.location.reload();
          return new Promise(() => {});
        }
      }
      throw error;
    }
  });
}

const ArchivePrintLayout = lazyWithRetry(() => import("../archive/ArchivePrintLayout").then(module => ({ default: module.ArchivePrintLayout })));

export const ArchiveViewer: React.FC<ArchiveViewerProps> = ({
  onReuseExam,
  teacherProfile,
}) => {
  const archiveViewerInstance = useArchiveViewer({ teacherProfile });
  const {
    isGeneratingAI, aiAnalysisResult,   sortedResults,
    uniqueSchools, uniqueClasses, filteredResults, questionAnalysisData,
    questionStats, categoryStats, levelStats, questionTypeStats,
    classAnalysisData, isNoAuthor, totalStudentsDisplay, realStudentCount,
    averageScore, highestScore, lowestScore, averageCompletionTime, handleGenerateAI, handleDeleteAIAnalysis
  } = useArchiveViewerLogic({ archiveViewer: archiveViewerInstance, teacherProfile });
  const {
    activeTab, setActiveTab, selectedSchool, setSelectedSchool, selectedClass,
    setSelectedClass, isPrinting, setIsPrinting, printRef, handlePrint,
    handleDownloadExcel, isEditingMetadata, setIsEditingMetadata, handleUpdateMetadata,
    selectedResult, setSelectedResult,
    sourceType,
    currentCloudFilename,
    resetView,
    showEditMetadata,
    setShowEditMetadata,
    handleDownloadQuestionsPDF,
    handleUploadToCloud,
    handleReclaimArchive,
    expandedStudent,
    setExpandedStudent,
    handleUpdateKey,
  } = archiveViewerInstance;
  const {
    archiveData,
    isLoadingCloud,
    loadingMessage,
    cloudArchives,
    userRole,
    loadFromCloud,
    handleDeleteArchive,
    setArchiveData,
    setSourceType,
    error,
    setError,
    fixMessage,
  } = archiveViewerInstance;

  const exam = archiveData?.exam;
  const results = archiveData?.results || [];

  const handleDownloadJSON = React.useCallback(() => {
    if (!archiveData) return;
    const jsonString = JSON.stringify(archiveData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${archiveData.exam.code}_archived.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [archiveData]);

  if (!archiveData) {
    return (
      <div className="w-full max-w-full mx-auto space-y-8 animate-fade-in">
        {isLoadingCloud && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl flex flex-col items-center">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-sm font-bold text-slate-700 dark:text-white">
                {loadingMessage}
              </p>
            </div>
          </div>
        )}

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
            Buka Arsip Ujian
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Akses data ujian lama dari Cloud Storage atau file lokal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <ArchiveSavedList
            cloudArchives={cloudArchives}
            userRole={userRole}
            onLoadFromCloud={loadFromCloud}
            onDeleteArchive={handleDeleteArchive}
          />
          <ArchiveFileUploader
            onFileProcessed={(data) => {
              setArchiveData(data);
              setActiveTab("DETAIL");
              setSourceType("LOCAL");
              setSelectedClass("ALL");
            }}
            error={error}
            setError={setError}
            teacherProfile={teacherProfile}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full mx-auto space-y-6">
      <style>{`
                @media print {
                    @page { margin: 1cm; size: portrait; }
                    :root, html, body { color-scheme: light !important; background-color: #ffffff !important; color: #0f172a !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .dark { color-scheme: light !important; }
                    *, *:before, *:after { background-color: transparent; border-color: #cbd5e1; }
                    .print-bg-green { background-color: #dcfce7 !important; border-color: #86efac !important; color: #14532d !important; -webkit-print-color-adjust: exact !important; }
                    .print-bg-red { background-color: #fee2e2 !important; border-color: #fda4af !important; color: #881337 !important; -webkit-print-color-adjust: exact !important; }
                    .print-bg-orange { background-color: #ffedd5 !important; border-color: #fdba74 !important; color: #7c2d12 !important; -webkit-print-color-adjust: exact !important; }
                    .print-bg-gray { background-color: #f1f5f9 !important; border-color: #cbd5e1 !important; color: #475569 !important; -webkit-print-color-adjust: exact !important; }
                    .print-bar-green { background-color: #10b981 !important; -webkit-print-color-adjust: exact !important; }
                    .print-bar-orange { background-color: #f97316 !important; -webkit-print-color-adjust: exact !important; }
                    .print-bar-red { background-color: #ef4444 !important; -webkit-print-color-adjust: exact !important; }
                    table { width: 100% !important; border-collapse: collapse !important; font-size: 9pt !important; }
                    th, td { border: 1px solid #94a3b8 !important; padding: 3px 5px !important; color: #0f172a !important; }
                    thead th { background-color: #f8fafc !important; font-weight: bold !important; -webkit-print-color-adjust: exact !important; }
                    .print-question-text, .print-question-text * { font-size: 9pt !important; line-height: 1.4 !important; color: #0f172a !important; background-color: transparent !important; }
                    .print-question-text img { max-width: 100% !important; height: auto !important; }
                    .no-print, .print\\:hidden { display: none !important; }
                    .page-break { break-before: page; }
                    .break-before-page { break-before: page; }
                    .break-after-avoid { break-after: avoid; }
                    .avoid-break { break-inside: avoid; }
                    .avoid-break-inside { break-inside: avoid; }
                    .shadow-sm, .shadow-md, .shadow-lg { box-shadow: none !important; }
                }
            `}</style>

      {fixMessage && (
        <div className="no-print bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 p-4 rounded-xl flex items-center gap-3 animate-fade-in shadow-sm">
          <ExclamationTriangleIcon className="w-6 h-6 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex-1">
            <p className="text-sm font-bold">Auto-Correction Active</p>
            <p className="text-xs">{fixMessage}</p>
          </div>
        </div>
      )}

      {isNoAuthor && (
        <div className="no-print bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 p-4 rounded-xl flex items-center gap-3 animate-fade-in shadow-sm">
          <ExclamationTriangleIcon className="w-6 h-6 shrink-0 text-rose-600 dark:text-rose-400" />
          <div className="flex-1">
            <p className="text-sm font-bold">Arsip Tanpa Pemilik</p>
            <p className="text-xs mt-0.5">
              Arsip ini belum memiliki data author_id yang valid (Data Legacy).
              Klik tombol <strong>Klaim Arsip</strong> agar laporan statistik
              dikaitkan dengan akun Anda.
            </p>
          </div>
        </div>
      )}

      <ArchiveHeaderActions
        exam={exam}
        sourceType={sourceType}
        currentCloudFilename={currentCloudFilename}
        isNoAuthor={isNoAuthor}
        isLoadingCloud={isLoadingCloud}
        onReset={resetView}
        onEditMetadata={() => setShowEditMetadata(true)}
        onPrint={handlePrint}
        onDownloadPDF={handleDownloadQuestionsPDF}
        onDownloadExcel={handleDownloadExcel}
        onReuseExam={onReuseExam}
        onUploadToCloud={handleUploadToCloud}
        onDownloadJSON={handleDownloadJSON}
        onReclaimArchive={handleReclaimArchive}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalStudents={totalStudentsDisplay}
        isGeneratingAI={isGeneratingAI}
        onGenerateAI={handleGenerateAI}
        hasAiAnalysis={!!aiAnalysisResult}
      />

      <div className="animate-fade-in print:hidden">
        {activeTab !== "DETAIL" &&
          (uniqueSchools.length > 1 || uniqueClasses.length > 1) && (
            <div className="mb-4 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 shadow-sm">
              <div className="flex flex-wrap items-center gap-4">
                {uniqueSchools.length > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase">
                      Sekolah:
                    </span>
                    <select
                      value={selectedSchool}
                      onChange={(e) => {
                        setSelectedSchool(e.target.value);
                        setSelectedClass("ALL");
                      }}
                      className="text-xs font-bold p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="ALL">
                        Semua Sekolah ({results.length})
                      </option>
                      {uniqueSchools.map((s) => (
                        <option key={s} value={s}>
                          {s} (
                          {
                            results.filter(
                              (r) =>
                                (r.student.schoolName || "Tanpa Sekolah") === s,
                            ).length
                          }
                          )
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {uniqueClasses.length > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase">
                      Kelas:
                    </span>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="text-xs font-bold p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="ALL">
                        Semua Kelas (
                        {
                          sortedResults.filter(
                            (r) =>
                              selectedSchool === "ALL" ||
                              (r.student.schoolName || "Tanpa Sekolah") ===
                                selectedSchool,
                          ).length
                        }
                        )
                      </option>
                      {uniqueClasses.map((c) => (
                        <option key={c} value={c}>
                          {c} (
                          {
                            sortedResults.filter(
                              (r) =>
                                String(r.student.class || "Tanpa Kelas") === c &&
                                (selectedSchool === "ALL" ||
                                  (r.student.schoolName || "Tanpa Sekolah") ===
                                    selectedSchool),
                            ).length
                          }
                          )
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

        {activeTab === "DETAIL" && <ArchiveDetailUjianView exam={exam} />}

        {activeTab === "STUDENTS" && (
          <ArchiveStudentsRecapView
            exam={exam}
            filteredResults={filteredResults}
            uniqueSchools={uniqueSchools}
            selectedSchool={selectedSchool}
            expandedStudent={expandedStudent}
            toggleStudent={(id) =>
              setExpandedStudent(expandedStudent === id ? null : id)
            }
          />
        )}

        {activeTab === "ANALYSIS" && (
          <ArchiveQuestionAnalysis
            exam={exam}
            filteredResults={filteredResults}
            averageScore={averageScore}
            highestScore={highestScore}
            lowestScore={lowestScore}
            totalStudents={realStudentCount}
            averageCompletionTime={averageCompletionTime}
            categoryStats={categoryStats}
            levelStats={levelStats}
            questionTypeStats={questionTypeStats}
            questionStats={questionStats}
            onUpdateKey={handleUpdateKey}
          />
        )}

        {activeTab === "CLASS_ANALYSIS" && (
          <ArchiveClassAnalysis
            classAnalysisData={classAnalysisData}
            uniqueSchools={uniqueSchools}
            selectedSchool={selectedSchool}
            exam={exam}
            results={filteredResults}
            teacherProfile={teacherProfile}
            aiAnalysisResult={aiAnalysisResult}
            onDeleteAIAnalysis={handleDeleteAIAnalysis}
            viewMode="CLASS_ONLY"
          />
        )}

        {activeTab === "AI_ANALYSIS" && (
          <ArchiveClassAnalysis
            classAnalysisData={classAnalysisData}
            uniqueSchools={uniqueSchools}
            selectedSchool={selectedSchool}
            exam={exam}
            results={filteredResults}
            teacherProfile={teacherProfile}
            aiAnalysisResult={aiAnalysisResult}
            onDeleteAIAnalysis={handleDeleteAIAnalysis}
            viewMode="AI_ONLY"
          />
        )}
      </div>

      {/* STATIC PRINT STYLES Sequential Blueprint View */}
      <React.Suspense fallback={<div className="hidden print:block">Memuat layout cetak...</div>}>
        <ArchivePrintLayout
          exam={exam}
          results={results}
          averageScore={averageScore}
          highestScore={highestScore}
          lowestScore={lowestScore}
          totalStudents={realStudentCount}
          averageCompletionTime={averageCompletionTime}
          categoryStats={categoryStats}
          levelStats={levelStats}
          questionTypeStats={questionTypeStats}
          uniqueSchools={uniqueSchools}
          sortedResults={sortedResults}
          questionAnalysisData={questionAnalysisData}
          ai_analyses={archiveData?.ai_analyses}
        />
      </React.Suspense>

      {showEditMetadata && (
        <EditMetadataModal
          onClose={() => setShowEditMetadata(false)}
          exam={exam}
          onSave={async (updatedExam) => {
            const updatedData = { ...archiveData, exam: updatedExam as Exam };
            setArchiveData(updatedData);
            setShowEditMetadata(false);

            if (sourceType === "CLOUD" && currentCloudFilename) {
              setIsLoadingCloud(true);
              setLoadingMessage("Menyimpan info baru ke Cloud...");
              try {
                const jsonString = JSON.stringify(updatedData);
                await storageService.uploadArchive(
                  updatedExam.code || exam.code,
                  jsonString,
                  {
                    school: updatedExam.authorSchool || exam.authorSchool,
                    subject: updatedExam.config?.subject || exam.config.subject,
                    classLevel:
                      updatedExam.config?.classLevel || exam.config.classLevel,
                    examType:
                      updatedExam.config?.examType || exam.config.examType,
                    targetClasses:
                      updatedExam.config?.targetClasses ||
                      exam.config.targetClasses,
                    date: updatedExam.config?.date || exam.config.date,
                    participantCount: results.length,
                    authorId: updatedExam.authorId || exam.authorId,
                  },
                );
              } catch (err) {
                console.warn(
                  "Failed to synchronize updated metadata to Cloud Storage",
                  err,
                );
              } finally {
                setIsLoadingCloud(false);
              }
            }
          }}
          teacherProfile={teacherProfile}
        />
      )}
    </div>
  );
};
