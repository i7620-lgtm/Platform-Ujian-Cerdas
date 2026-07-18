import React from "react";
import type { ArchiveData, TeacherProfile, Result, Exam, Question } from "../../../types";
import { getCalculatedStats, formatDuration, checkAnswerStatus } from "../archive/archiveUtils";
import { calculateAggregateStats, analyzeQuestionTypePerformance } from "../examUtils";
import { archiveService } from "../../../services/archive";
import { storageService } from "../../../services/storage";
import { useArchiveViewer } from "../useArchiveViewer";

interface UseArchiveViewerLogicProps {
  archiveViewer: any;
  
  teacherProfile: TeacherProfile | null;
}

export const useArchiveViewerLogic = ({ archiveViewer, teacherProfile }: UseArchiveViewerLogicProps) => {
  const [isGeneratingAI, setIsGeneratingAI] = React.useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = React.useState<string | null>(null);

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

  React.useEffect(() => {
    loadCloudList();
    storageService
      .getCurrentUser()
      .then((u) => setUserRole(u?.accountType || null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto fix mismatches on load (enrich and repair)
  React.useEffect(() => {
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
  const sortedResults = React.useMemo(() => {
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

  const uniqueSchools = React.useMemo<string[]>(() => {
    if (!archiveData) return [];
    const schools = new Set(
      archiveData.results.map((r) => r.student.schoolName || "Tanpa Sekolah"),
    );
    return Array.from(schools).sort() as string[];
  }, [archiveData]);

  const uniqueClasses = React.useMemo<string[]>(() => {
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

  const filteredResults = React.useMemo(() => {
    let results = sortedResults;
    if (selectedSchool !== "ALL") {
      results = results.filter(
        (r) => (r.student.schoolName || "Tanpa Sekolah") === selectedSchool,
      );
    }
    if (selectedClass !== "ALL") {
      results = results.filter((r) => String(r.student.class || "Tanpa Kelas") === selectedClass);
    }
    return results;
  }, [sortedResults, selectedSchool, selectedClass]);

  // Statistics aggregates memoized
  const questionAnalysisData = React.useMemo(() => {
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

  const questionStats = React.useMemo(() => {
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

  const { categoryStats, levelStats } = React.useMemo(() => {
    if (!archiveData) return { categoryStats: [], levelStats: [] };
    return calculateAggregateStats(archiveData.exam, filteredResults);
  }, [archiveData, filteredResults]);

  const questionTypeStats = React.useMemo(() => {
    if (!archiveData) return [];
    return analyzeQuestionTypePerformance(archiveData.exam, filteredResults);
  }, [archiveData, filteredResults]);

  const classAnalysisData = React.useMemo(() => {
    if (!archiveData) return [];
    const results = filteredResults;

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
          passRate,
          passCount,
          questionTypeStats: qtStats,
        });
      });
    });
    return finalDetails;
  }, [archiveData, filteredResults]);

  const isNoAuthor = checkIsNoAuthor();

  const { exam, results } = archiveData || { exam: null, results: null };
  const totalStudentsDisplay =
    selectedSchool === "ALL" &&
    selectedClass === "ALL" &&
    exam?.config?.manualParticipantCount
      ? exam?.config?.manualParticipantCount
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

  const getCurrentAnalysisKey = React.useCallback(() => {
    if (selectedSchool === "ALL" && selectedClass === "ALL") {
      return "OVERALL";
    }
    return `school_${selectedSchool}_class_${selectedClass}`;
  }, [selectedSchool, selectedClass]);

  React.useEffect(() => {
    if (!archiveData) {
      setAiAnalysisResult(null);
      return;
    }
    const key = getCurrentAnalysisKey();
    const saved = archiveData.ai_analyses?.[key] || null;
    setAiAnalysisResult(saved);
  }, [archiveData, selectedSchool, selectedClass, getCurrentAnalysisKey]);

  const handleGenerateAI = async () => {
    if (!teacherProfile?.isPremium) {
      alert("Fitur ini khusus untuk akun Premium. Silakan upgrade akun Anda.");
      return;
    }
    
    setIsGeneratingAI(true);
    setAiAnalysisResult(null);
    try {
      const summaries = archiveService.calculateExamStatistics(archiveData!.exam, filteredResults) as any[];
      
      const key = getCurrentAnalysisKey();
      // Incremental approach: if overall analysis is requested, send existing per-class analyses
      const existing = key === "OVERALL" ? archiveData!.ai_analyses : undefined;
      
      const analysis = await archiveService.generateAIAnalysis(summaries, undefined, archiveData!.exam.questions, existing);
      
      const updatedAnalyses = {
        ...(archiveData!.ai_analyses || {}),
        [key]: analysis
      };

      const updatedData: ArchiveData = {
        ...archiveData!,
        ai_analyses: updatedAnalyses
      };

      setArchiveData(updatedData);
      setAiAnalysisResult(analysis);
      archiveViewer.setActiveTab("AI_ANALYSIS");

      if (sourceType === "CLOUD" && currentCloudFilename) {
        try {
          const jsonString = JSON.stringify(updatedData);
          const newFilename = await storageService.uploadArchive(
            archiveData!.exam.code,
            jsonString,
            {
              school: archiveData!.exam.authorSchool,
              subject: archiveData!.exam.config.subject,
              classLevel: archiveData!.exam.config.classLevel,
              examType: archiveData!.exam.config.examType,
              targetClasses: archiveData!.exam.config.targetClasses,
              date: archiveData!.exam.config.date,
              participantCount: archiveData!.results.length,
              authorId: archiveData!.exam.authorId,
              hasAiAnalysis: updatedAnalyses && Object.keys(updatedAnalyses).length > 0,
            }
          );
          if (newFilename !== currentCloudFilename) {
            try {
              await storageService.deleteArchive(currentCloudFilename);
            } catch (delErr) {
              console.warn("Failed to delete legacy archive on update", delErr);
            }
            if (archiveViewer.setCurrentCloudFilename) {
              archiveViewer.setCurrentCloudFilename(newFilename);
            }
            if (archiveViewer.loadCloudList) {
              archiveViewer.loadCloudList();
            }
          }
        } catch (cloudSaveErr) {
          console.warn("Failed to silently auto-save AI analysis to cloud:", cloudSaveErr);
        }
      } else if (sourceType === "LOCAL") {
        // Since we can't write to the local file system automatically, we just update the in-memory state.
        // The user will need to re-download the archive manually if they want to save it locally.
      }
    } catch (error: any) {
      setAiAnalysisResult("Gagal menghasilkan analisis AI: " + (error.message || "Terjadi kesalahan."));
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleDeleteAIAnalysis = async () => {
    if (!archiveData) return;
    const key = getCurrentAnalysisKey();
    if (!archiveData.ai_analyses?.[key]) return;

    if (!confirm("Apakah Anda yakin ingin menghapus analisis AI ini dari arsip?")) return;

    const updatedAnalyses = { ...archiveData.ai_analyses };
    delete updatedAnalyses[key];

    const updatedData: ArchiveData = {
      ...archiveData,
      ai_analyses: updatedAnalyses
    };

    setArchiveData(updatedData);
    setAiAnalysisResult(null);
    if (archiveViewer.activeTab === "AI_ANALYSIS") {
      archiveViewer.setActiveTab("CLASS_ANALYSIS");
    }

    if (sourceType === "CLOUD" && currentCloudFilename) {
      try {
        const jsonString = JSON.stringify(updatedData);
        const newFilename = await storageService.uploadArchive(
          archiveData.exam.code,
          jsonString,
          {
            school: archiveData.exam.authorSchool,
            subject: archiveData.exam.config.subject,
            classLevel: archiveData.exam.config.classLevel,
            examType: archiveData.exam.config.examType,
            targetClasses: archiveData.exam.config.targetClasses,
            date: archiveData.exam.config.date,
            participantCount: archiveData.results.length,
            authorId: archiveData.exam.authorId,
          }
        );
        if (newFilename !== currentCloudFilename) {
          try {
            await storageService.deleteArchive(currentCloudFilename);
          } catch (delErr) {
            console.warn("Failed to delete legacy archive on update", delErr);
          }
          if (archiveViewer.setCurrentCloudFilename) {
            archiveViewer.setCurrentCloudFilename(newFilename);
          }
          if (archiveViewer.loadCloudList) {
            archiveViewer.loadCloudList();
          }
        }
      } catch (cloudSaveErr) {
        console.warn("Failed to silently auto-save archive update on deletion:", cloudSaveErr);
      }
    }
  };

  return { isGeneratingAI, aiAnalysisResult, archiveViewer, sortedResults, uniqueSchools, uniqueClasses, filteredResults, questionAnalysisData, questionStats, categoryStats, levelStats, questionTypeStats, classAnalysisData, isNoAuthor, totalStudentsDisplay, realStudentCount, averageScore, highestScore, lowestScore, averageCompletionTime, handleGenerateAI, handleDeleteAIAnalysis };
};
