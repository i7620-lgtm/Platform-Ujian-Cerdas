import React from "react";
import type { ArchiveData, TeacherProfile, Result, Exam, Question } from "../../../types";
import { getCalculatedStats, formatDuration, checkAnswerStatus, fixArchiveDataSorting } from "../archive/archiveUtils";
import { calculateAggregateStats, analyzeQuestionTypePerformance } from "../examUtils";
import { archiveService } from "../../../services/archive";
import { storageService } from "../../../services/storage";
import { useArchiveViewer } from "../useArchiveViewer";
import type { AnalysisTargetItem } from "../archive/AiAnalysisTargetModal";
import type { QueueItemState } from "../archive/AiAnalysisProgressModal";

interface UseArchiveViewerLogicProps {
  archiveViewer: any;
  
  teacherProfile: TeacherProfile | null;
}

export const useArchiveViewerLogic = ({ archiveViewer, teacherProfile }: UseArchiveViewerLogicProps) => {
  const [isGeneratingAI, setIsGeneratingAI] = React.useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = React.useState<string | null>(null);
  const [aiProgressStatus, setAiProgressStatus] = React.useState<{ message: string; step: number; total: number } | null>(null);
  const [aiProgressMessage, setAiProgressMessage] = React.useState<string>("");
  const [activeAiSubTab, setActiveAiSubTab] = React.useState<string>("OVERALL");
  const [isTargetModalOpen, setIsTargetModalOpen] = React.useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = React.useState(false);
  const [analysisTargets, setAnalysisTargets] = React.useState<AnalysisTargetItem[]>([]);
  const [aiQueue, setAiQueue] = React.useState<QueueItemState[]>([]);
  const [aiCurrentQueueIndex, setAiCurrentQueueIndex] = React.useState<number>(0);
  const [aiFailedItem, setAiFailedItem] = React.useState<QueueItemState | null>(null);

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
    return (Array.from(classes) as string[]).sort((a, b) =>
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
          highestScore,
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

  // Keep activeAiSubTab valid and sync aiAnalysisResult
  React.useEffect(() => {
    if (!archiveData?.ai_analyses) {
      setAiAnalysisResult(null);
      return;
    }
    const availableKeys = Object.keys(archiveData.ai_analyses);
    if (availableKeys.length === 0) {
      setAiAnalysisResult(null);
      return;
    }

    if (!activeAiSubTab || !archiveData.ai_analyses[activeAiSubTab]) {
      const defaultKey = availableKeys.includes("OVERALL") ? "OVERALL" : availableKeys[0];
      setActiveAiSubTab(defaultKey);
      setAiAnalysisResult(archiveData.ai_analyses[defaultKey] || null);
    } else {
      setAiAnalysisResult(archiveData.ai_analyses[activeAiSubTab] || null);
    }
  }, [archiveData, activeAiSubTab]);

  const saveArchiveToCloudSilently = React.useCallback(async (updatedData: ArchiveData) => {
    if (sourceType !== "CLOUD" || !currentCloudFilename) return;
    try {
      const jsonString = JSON.stringify(updatedData);
      const newFilename = await storageService.uploadArchive(
        updatedData.exam.code,
        jsonString,
        {
          school: updatedData.exam.authorSchool,
          subject: updatedData.exam.config.subject,
          classLevel: updatedData.exam.config.classLevel,
          examType: updatedData.exam.config.examType,
          targetClasses: updatedData.exam.config.targetClasses,
          date: updatedData.exam.config.date,
          participantCount: updatedData.results.length,
          authorId: updatedData.exam.authorId,
          hasAiAnalysis: Boolean(updatedData.ai_analyses && Object.keys(updatedData.ai_analyses).length > 0),
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
  }, [sourceType, currentCloudFilename, archiveViewer]);

  const handleOpenAiTargetModal = React.useCallback(() => {
    if (!teacherProfile?.isPremium) {
      alert("Fitur ini khusus untuk akun Premium. Silakan upgrade akun Anda.");
      return;
    }
    if (!archiveData || !archiveData.results || archiveData.results.length === 0) {
      alert("Tidak ada data hasil siswa pada arsip ini untuk dianalisis.");
      return;
    }

    const classesSet = new Set<string>();
    archiveData.results.forEach((r) => {
      const c = String(r.student.class || r.student.className || "").trim();
      if (c) classesSet.add(c);
    });
    const classes = Array.from(classesSet).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
    );

    const targets: AnalysisTargetItem[] = [];

    // General analysis if multiple classes exist
    if (classes.length > 1) {
      targets.push({
        key: "OVERALL",
        label: "Analisis Umum (Semua Kelas)",
        isOverall: true,
        studentCount: archiveData.results.length,
      });
    }

    // Class specific analyses
    classes.forEach((cls) => {
      const classResults = archiveData.results.filter(
        (r) => String(r.student.class || r.student.className || "").trim() === cls
      );
      const schoolName = classResults[0]?.student.schoolName || archiveData.exam.authorSchool || "ALL";
      targets.push({
        key: `school_${schoolName}_class_${cls}`,
        label: `Kelas ${cls}`,
        isOverall: false,
        className: cls,
        studentCount: classResults.length,
      });
    });

    if (targets.length === 0) {
      targets.push({
        key: "OVERALL",
        label: "Analisis Umum",
        isOverall: true,
        studentCount: archiveData.results.length,
      });
    } else if (classes.length === 1 && !targets.some(t => t.key === "OVERALL")) {
      targets.unshift({
        key: "OVERALL",
        label: `Analisis Umum (${classes[0]})`,
        isOverall: true,
        studentCount: archiveData.results.length,
      });
    }

    setAnalysisTargets(targets);
    setIsTargetModalOpen(true);
  }, [teacherProfile, archiveData]);

  // Sequential queue processor
  const processQueue = React.useCallback(async (
    startIndex: number,
    queueList: QueueItemState[],
    initialAnalyses: Record<string, string>,
    targetsRef: AnalysisTargetItem[]
  ) => {
    if (!archiveData) return;

    setIsGeneratingAI(true);
    setIsProgressModalOpen(true);
    setAiFailedItem(null);

    const workingAnalyses = { ...initialAnalyses };
    let currentQueue = [...queueList];

    for (let i = startIndex; i < currentQueue.length; i++) {
      const currentItem = currentQueue[i];

      // Mark current item as processing
      currentQueue = currentQueue.map((item, idx) =>
        idx === i ? { ...item, status: "processing" as const } : item
      );
      setAiQueue(currentQueue);
      setAiCurrentQueueIndex(i);
      setAiProgressMessage(`Menganalisis ${currentItem.label} (${i + 1}/${currentQueue.length})...`);
      setAiProgressStatus({
        message: `Menganalisis ${currentItem.label}...`,
        step: i + 1,
        total: currentQueue.length,
      });

      try {
        const targetMeta = targetsRef.find((t) => t.key === currentItem.key);
        const isOverall = currentItem.key === "OVERALL" || targetMeta?.isOverall;
        const targetClassName = targetMeta?.className;

        let targetResults = archiveData.results;
        if (!isOverall && targetClassName) {
          targetResults = archiveData.results.filter(
            (r) => String(r.student.class || r.student.className || "").trim() === targetClassName
          );
        }

        const summaries = archiveService.calculateExamStatistics(
          archiveData.exam,
          targetResults
        ) as any[];

        const analysis = await archiveService.generateAIAnalysis(
          summaries,
          isOverall ? undefined : targetClassName,
          archiveData.exam.questions,
          workingAnalyses,
          (msg, step, total) => {
            setAiProgressMessage(`${currentItem.label}: ${msg} (${step}/${total})`);
          }
        );

        workingAnalyses[currentItem.key] = analysis;

        // Mark item as completed
        currentQueue = currentQueue.map((item, idx) =>
          idx === i ? { ...item, status: "completed" as const } : item
        );
        setAiQueue(currentQueue);

        // Save progress immediately so partial work is never lost
        const updatedData: ArchiveData = {
          ...archiveData,
          ai_analyses: { ...workingAnalyses },
        };
        setArchiveData(updatedData);
        saveArchiveToCloudSilently(updatedData);
      } catch (err: any) {
        console.error(`Gagal menganalisis target ${currentItem.label}:`, err);
        const failedItemState: QueueItemState = {
          ...currentItem,
          status: "failed",
          error: err?.message || "Waktu respons server terlampaui (timeout) atau gangguan koneksi.",
        };

        currentQueue = currentQueue.map((item, idx) =>
          idx === i ? failedItemState : item
        );
        setAiQueue(currentQueue);
        setAiFailedItem(failedItemState);
        setIsGeneratingAI(false);
        // Pause execution and keep modal open with resume / finish actions
        return;
      }
    }

    // All queued items finished successfully
    setIsGeneratingAI(false);
    setIsProgressModalOpen(false);
    archiveViewer.setActiveTab("AI_ANALYSIS");
    if (currentQueue[0]?.key) {
      setActiveAiSubTab(currentQueue[0].key);
    }
  }, [archiveData, archiveViewer, saveArchiveToCloudSilently, setArchiveData]);

  const handleStartBatchAiAnalysis = React.useCallback(async (selectedKeys: string[]) => {
    const selectedTargets = analysisTargets.filter((t) => selectedKeys.includes(t.key));
    if (selectedTargets.length === 0) return;

    const newQueue: QueueItemState[] = selectedTargets.map((t) => ({
      key: t.key,
      label: t.label,
      status: "pending",
    }));

    setAiQueue(newQueue);
    setAiCurrentQueueIndex(0);
    setAiFailedItem(null);
    setIsTargetModalOpen(false);

    await processQueue(0, newQueue, archiveData?.ai_analyses || {}, analysisTargets);
  }, [analysisTargets, archiveData, processQueue]);

  const handleResumeAiAnalysis = React.useCallback(async () => {
    if (!aiFailedItem) return;
    setAiFailedItem(null);
    await processQueue(aiCurrentQueueIndex, aiQueue, archiveData?.ai_analyses || {}, analysisTargets);
  }, [aiFailedItem, aiCurrentQueueIndex, aiQueue, archiveData, analysisTargets, processQueue]);

  const handleFinishAiAnalysis = React.useCallback(() => {
    setIsProgressModalOpen(false);
    setIsGeneratingAI(false);
    setAiFailedItem(null);

    const completed = aiQueue.filter((q) => q.status === "completed");
    if (completed.length > 0) {
      archiveViewer.setActiveTab("AI_ANALYSIS");
      setActiveAiSubTab(completed[0].key);
    }
  }, [aiQueue, archiveViewer]);

  const handleGenerateAI = React.useCallback(() => {
    handleOpenAiTargetModal();
  }, [handleOpenAiTargetModal]);

  const handleDeleteAIAnalysis = async (targetKey?: string) => {
    if (!archiveData || !archiveData.ai_analyses) return;
    const keyToDelete = targetKey || activeAiSubTab || getCurrentAnalysisKey();
    if (!archiveData.ai_analyses[keyToDelete]) return;

    let targetLabel = "Analisis Umum";
    if (keyToDelete !== "OVERALL") {
      const match = keyToDelete.match(/school_.*_class_(.*)/);
      targetLabel = match ? `Analisis Kelas ${match[1]}` : `Analisis ${keyToDelete}`;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus ${targetLabel} ini dari arsip?`)) return;

    const updatedAnalyses = { ...archiveData.ai_analyses };
    delete updatedAnalyses[keyToDelete];

    const updatedData: ArchiveData = {
      ...archiveData,
      ai_analyses: updatedAnalyses
    };

    setArchiveData(updatedData);

    const remainingKeys = Object.keys(updatedAnalyses);
    if (remainingKeys.length > 0) {
      setActiveAiSubTab(remainingKeys[0]);
    } else {
      setActiveAiSubTab("");
      setAiAnalysisResult(null);
      if (archiveViewer.activeTab === "AI_ANALYSIS") {
        archiveViewer.setActiveTab("CLASS_ANALYSIS");
      }
    }

    saveArchiveToCloudSilently(updatedData);
  };

  return {
    isGeneratingAI,
    aiProgressStatus,
    aiProgressMessage,
    aiAnalysisResult,
    activeAiSubTab,
    setActiveAiSubTab,
    isTargetModalOpen,
    setIsTargetModalOpen,
    isProgressModalOpen,
    setIsProgressModalOpen,
    analysisTargets,
    aiQueue,
    aiCurrentQueueIndex,
    aiFailedItem,
    handleOpenAiTargetModal,
    handleStartBatchAiAnalysis,
    handleResumeAiAnalysis,
    handleFinishAiAnalysis,
    archiveViewer,
    sortedResults,
    uniqueSchools,
    uniqueClasses,
    filteredResults,
    questionAnalysisData,
    questionStats,
    categoryStats,
    levelStats,
    questionTypeStats,
    classAnalysisData,
    isNoAuthor,
    totalStudentsDisplay,
    realStudentCount,
    averageScore,
    highestScore,
    lowestScore,
    averageCompletionTime,
    handleGenerateAI,
    handleDeleteAIAnalysis,
  };
};
