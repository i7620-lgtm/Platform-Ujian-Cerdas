import React, { useEffect, useMemo } from "react";
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

const ArchivePrintLayout = React.lazy(() => import("../archive/ArchivePrintLayout").then(module => ({ default: module.ArchivePrintLayout })));

export const ArchiveViewer: React.FC<ArchiveViewerProps> = ({
  onReuseExam,
  teacherProfile,
}) => {
  const archiveViewer = useArchiveViewer({ teacherProfile });
  const {
    archiveData,
    error,
    fixMessage,
    activeTab,
    selectedClass,
    selectedSchool,
    expandedStudent,
    cloudArchives,
    isLoadingCloud,
    loadingMessage,
    sourceType,
    userRole,
    showEditMetadata,
    currentCloudFilename,
    setError,
    setArchiveData,
    setActiveTab,
    setSelectedClass,
    setSelectedSchool,
    setExpandedStudent,
    setSourceType,
    setShowEditMetadata,
    setFixMessage,
    loadCloudList,
    loadFromCloud,
    handleDeleteArchive,
    handleUploadToCloud,
    handleReclaimArchive,
    resetView,
    handlePrint,
    handleDownloadQuestionsPDF,
    handleDownloadExcel,
    handleUpdateKey,
    checkIsNoAuthor,
    setUserRole,
    setIsLoadingCloud,
    setLoadingMessage,
  } = archiveViewer;

  useEffect(() => {
    loadCloudList();
    storageService
      .getCurrentUser()
      .then((u) => setUserRole(u?.accountType || null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto fix mismatches on load (enrich and repair)
  useEffect(() => {
    if (!archiveData) return;

    let mismatchCount = 0;
    const fixedResults = archiveData.results.map((r) => {
      const stats = getCalculatedStats(r, archiveData.exam);

      if (stats.score !== r.score || stats.correct !== r.correctAnswers) {
        mismatchCount++;
        return {
          ...r,
          score: stats.score,
          correctAnswers: stats.correct,
          totalQuestions:
            (stats.empty || 0) + (stats.wrong || 0) + (stats.correct || 0),
        };
      }
      return r;
    });

    if (mismatchCount > 0) {
      setFixMessage(
        `Ditemukan ${mismatchCount} data nilai tidak sinkron. File perbaikan telah diunduh otomatis.`,
      );

      const enrichedExam: Exam = {
        ...archiveData.exam,
        authorName: archiveData.exam.authorName || "Unknown",
        authorSchool: archiveData.exam.authorSchool || "Unknown School",
        createdAt: archiveData.exam.createdAt || new Date().toISOString(),
        status: archiveData.exam.status || "PUBLISHED",
        config: {
          ...archiveData.exam.config,
        },
      };
      const enrichedResults: Result[] = fixedResults;

      const fixedArchive = {
        ...archiveData,
        exam: enrichedExam,
        results: enrichedResults,
        version: "2.0",
        repairedAt: new Date().toISOString(),
      };

      setArchiveData(fixArchiveDataSorting(fixedArchive, teacherProfile));

      const jsonString = JSON.stringify(fixedArchive);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `CORRECTED_ARSIP_${archiveData.exam.code}_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }, [archiveData, teacherProfile, setFixMessage, setArchiveData]);

  // Sorting & filters memoized
  const sortedResults = useMemo(() => {
    if (!archiveData) return [];
    return [...archiveData.results].sort((a, b) => {
      const schoolA = a.student.schoolName || "";
      const schoolB = b.student.schoolName || "";
      const schoolCompare = schoolA.localeCompare(schoolB, undefined, {
        sensitivity: "base",
      });
      if (schoolCompare !== 0) return schoolCompare;

      const classA = a.student.class || "";
      const classB = b.student.class || "";
      const c = classA.localeCompare(classB, undefined, {
        numeric: true,
        sensitivity: "base",
      });
      if (c !== 0) return c;

      const absA = parseInt(a.student.absentNumber) || 0;
      const absB = parseInt(b.student.absentNumber) || 0;
      return absA - absB;
    });
  }, [archiveData]);

  const uniqueSchools = useMemo<string[]>(() => {
    if (!archiveData) return [];
    const schools = new Set(
      archiveData.results.map((r) => r.student.schoolName || "Tanpa Sekolah"),
    );
    return Array.from(schools).sort() as string[];
  }, [archiveData]);

  const uniqueClasses = useMemo<string[]>(() => {
    if (!archiveData) return [];
    let results = archiveData.results;
    if (selectedSchool !== "ALL") {
      results = results.filter(
        (r) => (r.student.schoolName || "Tanpa Sekolah") === selectedSchool,
      );
    }
    const classes = new Set(
      results.map((r) => String(r.student.class || "Tanpa Kelas")),
    );
    return Array.from(classes).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
    );
  }, [archiveData, selectedSchool]);

  const filteredResults = useMemo(() => {
    let results = sortedResults;
    if (selectedSchool !== "ALL") {
      results = results.filter(
        (r) => (r.student.schoolName || "Tanpa Sekolah") === selectedSchool,
      );
    }
    if (selectedClass !== "ALL") {
      results = results.filter((r) => r.student.class === selectedClass);
    }
    return results;
  }, [sortedResults, selectedSchool, selectedClass]);

  // Statistics aggregates memoized
  const questionAnalysisData = useMemo(() => {
    if (!archiveData) return [];
    const { exam } = archiveData;
    const totalStudents = filteredResults.length;

    return exam.questions
      .filter((q) => q.questionType !== "INFO")
      .map((q) => {
        let correctCount = 0;
        const answerCounts: Record<string, number> = {};

        filteredResults.forEach((r) => {
          const ans = r.answers[q.id];
          const status = checkAnswerStatus(q, r.answers);

          if (status === "CORRECT") {
            correctCount = correctCount + 1;
          }

          if (ans) {
            const current = answerCounts[ans] || 0;
            answerCounts[ans] = current + 1;
          }
        });

        return {
          id: q.id,
          correctRate:
            totalStudents > 0
              ? Math.round((correctCount / totalStudents) * 100)
              : 0,
          distribution: answerCounts,
          options: q.questionType === "MULTIPLE_CHOICE" ? q.options : undefined,
        };
      });
  }, [archiveData, filteredResults]);

  const questionStats = useMemo(() => {
    if (!archiveData) return [];
    return archiveData.exam.questions
      .filter((q) => q.questionType !== "INFO")
      .map((q) => {
        let correctCount = 0;
        filteredResults.forEach((r) => {
          if (checkAnswerStatus(q, r.answers) === "CORRECT") {
            correctCount = correctCount + 1;
          }
        });
        return {
          id: q.id,
          correctRate:
            filteredResults.length > 0
              ? Math.round((correctCount / filteredResults.length) * 100)
              : 0,
        };
      });
  }, [archiveData, filteredResults]);

  const { categoryStats, levelStats } = useMemo(() => {
    if (!archiveData) return { categoryStats: [], levelStats: [] };
    return calculateAggregateStats(archiveData.exam, filteredResults);
  }, [archiveData, filteredResults]);

  const questionTypeStats = useMemo(() => {
    if (!archiveData) return [];
    return analyzeQuestionTypePerformance(archiveData.exam, filteredResults);
  }, [archiveData, filteredResults]);

  const classAnalysisData = useMemo(() => {
    if (!archiveData) return [];
    const results = archiveData.results;

    const schools = Array.from(
      new Set(results.map((r) => r.student.schoolName || "Tanpa Sekolah")),
    ).sort();
    const finalDetails: any[] = [];

    schools.forEach((schoolName) => {
      const schoolResults = results.filter(
        (r) => (r.student.schoolName || "Tanpa Sekolah") === schoolName,
      );
      const classesOfSchool = Array.from(
        new Set(schoolResults.map((r) => r.student.class)),
      ).sort();

      classesOfSchool.forEach((className) => {
        const classResults = schoolResults.filter(
          (r) => r.student.class === className,
        );
        const scores = classResults.map(
          (r) => getCalculatedStats(r, archiveData.exam).score,
        );
        const times = classResults
          .map((r) => getCalculatedStats(r, archiveData.exam).duration)
          .filter((t) => t > 0);

        const averageScore =
          classResults.length > 0
            ? Math.round(
                scores.reduce((a, b) => a + b, 0) / classResults.length,
              )
            : 0;
        const averageTime =
          times.length > 0
            ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
            : 0;
        const lowestScore = classResults.length > 0 ? Math.min(...scores) : 0;
        const highestScore = classResults.length > 0 ? Math.max(...scores) : 0;

        const passCount = scores.filter(
          (s) => s >= (archiveData.exam.config.kkm || 75),
        ).length;
        const passRate =
          classResults.length > 0
            ? Math.round((passCount / classResults.length) * 100)
            : 0;

        const qtStats = analyzeQuestionTypePerformance(
          archiveData.exam,
          classResults,
        );

        finalDetails.push({
          schoolName,
          className,
          studentCount: classResults.length,
          averageScore,
          averageTime,
          lowestScore,
          highestScore,
          passRate,
          passCount,
          questionTypeStats: qtStats,
        });
      });
    });

    return finalDetails;
  }, [archiveData]);

  const isNoAuthor = checkIsNoAuthor();

  // Render Welcome Loader
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

  const { exam, results } = archiveData;
  const totalStudentsDisplay =
    selectedSchool === "ALL" &&
    selectedClass === "ALL" &&
    exam.config.manualParticipantCount
      ? exam.config.manualParticipantCount
      : filteredResults.length;
  const realStudentCount = filteredResults.length;
  const averageScore =
    realStudentCount > 0
      ? Math.round(
          filteredResults.reduce((acc, r) => acc + r.score, 0) /
            realStudentCount,
        )
      : 0;
  const highestScore =
    realStudentCount > 0 ? Math.max(...filteredResults.map((r) => r.score)) : 0;
  const lowestScore =
    realStudentCount > 0 ? Math.min(...filteredResults.map((r) => r.score)) : 0;
  const validCompletionTimes = filteredResults
    .filter((r) => r.completionTime !== undefined && r.completionTime !== null)
    .map((r) => r.completionTime as number);
  const averageCompletionTime =
    validCompletionTimes.length > 0
      ? Math.round(
          validCompletionTimes.reduce((acc, val) => acc + val, 0) /
            validCompletionTimes.length,
        )
      : 0;

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
        onReclaimArchive={handleReclaimArchive}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalStudents={totalStudentsDisplay}
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
                                r.student.class === c &&
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
