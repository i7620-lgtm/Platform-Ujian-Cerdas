import { useEffect, useMemo, useCallback, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import type {
  Exam,
  Question,
  ExamConfig,
  Result,
  TeacherProfile,
} from "../../types";
import { generateExamCode, sanitizeHtml, parseList } from "./examUtils";
import { storageService } from "../../services/storage";
import { useExamEditorStore } from "../../stores/examEditorStore";
import { useTeacherDashboardStore } from "../../stores/teacherDashboardStore";
import { useArchiveExam } from "./useArchiveExam";

const DEFAULT_CONFIG: ExamConfig = {
  examMode: "UJIAN",
  startDate: new Date().toLocaleDateString("en-CA"),
  endDate: new Date(Date.now() + 86400000).toLocaleDateString("en-CA"),
  useBankSoal: false,
  bankSoalCount: 10,
  bankSoalProportions: { mudah: 30, sedang: 50, sulit: 20 },
  timeLimit: 60,
  date: new Date().toLocaleDateString("en-CA"),
  startTime: "08:00",
  endTime: "10:00",
  allowRetakes: false,
  detectBehavior: true,
  autoSubmitInactive: true,
  autoSaveInterval: 10,
  shuffleQuestions: false,
  shuffleAnswers: false,
  continueWithPermission: false,
  showResultToStudent: true,
  showCorrectAnswer: false,
  enableCertificate: false,
  enablePublicStream: false,
  disableRealtime: true,
  trackLocation: false,
  subject: "Lainnya",
  classLevel: "Lainnya",
  targetClasses: [],
  examType: "Lainnya",
  description: "",
};

interface UseTeacherDashboardParams {
  teacherProfile: TeacherProfile;
  addExam: (newExam: Exam) => void;
  updateExam: (updatedExam: Exam) => void;
  deleteExam: (code: string) => Promise<void>;
  exams: Record<string, Exam>;
  results: Result[];
  onRefreshExams: () => Promise<void>;
  onRefreshResults: () => Promise<void>;
}

export type TeacherView =
  | "UPLOAD"
  | "ONGOING"
  | "UPCOMING_EXAMS"
  | "FINISHED_EXAMS"
  | "DRAFTS"
  | "ADMIN_USERS"
  | "ARCHIVE_VIEWER"
  | "BOOK_GENERATOR";

export const useTeacherDashboard = ({
  teacherProfile,
  addExam,
  updateExam,
  deleteExam,
  exams,
  results,
  onRefreshExams,
  onRefreshResults,
}: UseTeacherDashboardParams) => {
  // Use Zustand store for UI states with useShallow to minimize subscriptions and prevent unnecessary re-renders
  const {
    view,
    setView,
    isLoadingArchive,
    setIsLoadingArchive,
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
    incrementResetKey,
    generatedCode,
    setGeneratedCode,
    manualMode,
    setManualMode,
  } = useTeacherDashboardStore(
    useShallow((state) => ({
      view: state.view,
      setView: state.setView,
      isLoadingArchive: state.isLoadingArchive,
      setIsLoadingArchive: state.setIsLoadingArchive,
      selectedOngoingExam: state.selectedOngoingExam,
      setSelectedOngoingExam: state.setSelectedOngoingExam,
      selectedFinishedExam: state.selectedFinishedExam,
      setSelectedFinishedExam: state.setSelectedFinishedExam,
      isEditModalOpen: state.isEditModalOpen,
      setIsEditModalOpen: state.setIsEditModalOpen,
      editingExam: state.editingExam,
      setEditingExam: state.setEditingExam,
      isInviteOpen: state.isInviteOpen,
      setIsInviteOpen: state.setIsInviteOpen,
      isMainGuideModalOpen: state.isMainGuideModalOpen,
      setIsMainGuideModalOpen: state.setIsMainGuideModalOpen,
      resetKey: state.resetKey,
      incrementResetKey: state.incrementResetKey,
      generatedCode: state.generatedCode,
      setGeneratedCode: state.setGeneratedCode,
      manualMode: state.manualMode,
      setManualMode: state.setManualMode,
    }))
  );

  const { questions, config, setQuestions, setConfig } = useExamEditorStore(
    useShallow((state) => ({
      questions: state.questions,
      config: state.config,
      setQuestions: state.setQuestions,
      setConfig: state.setConfig,
    }))
  );

  // Logic for Organizer Name in Invitations
  const organizerName =
    teacherProfile.accountType === "super_admin"
      ? "Developer"
      : teacherProfile.accountType === "admin_sekolah"
        ? teacherProfile.school
        : teacherProfile.fullName;

  const accountType = teacherProfile.accountType || "guru";

  // 1. Automatic data refreshing when tab / view changes
  useEffect(() => {
    if (
      view === "ONGOING" ||
      view === "UPCOMING_EXAMS" ||
      view === "FINISHED_EXAMS" ||
      view === "DRAFTS"
    ) {
      onRefreshExams();
    }
    if (view === "ONGOING" || view === "FINISHED_EXAMS") {
      onRefreshResults();
    }
  }, [view, onRefreshExams, onRefreshResults]);

  // 2. Prevent accidental data loss
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if ((view === "UPLOAD" && questions.length > 0) || isEditModalOpen) {
        const message =
          'Anda memiliki pekerjaan yang belum disimpan. Klik "Simpan Draf" atau "Perbarui Draf" agar pekerjaan Anda tidak hilang.';
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [view, questions.length, isEditModalOpen]);

  // 3. Question generation callbacks
  const handleQuestionsGenerated = (
    newQuestions: Question[],
    mode: "manual" | "auto",
  ) => {
    if (newQuestions.length === 0 && mode === "manual") {
      setManualMode(true);
    } else {
      setQuestions([...questions, ...newQuestions]);
      setManualMode(true);
      if (mode === "auto" && newQuestions.length > 0) {
        setTimeout(() => {
          const firstNewQuestionId = newQuestions[0].id;
          const element = document.getElementById(firstNewQuestionId);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 300);
      }
    }
  };

  // 4. Reset entire exam forms
  const resetForm = () => {
    setQuestions([]);
    setGeneratedCode("");
    setManualMode(false);
    setEditingExam(null);

    const now = new Date();
    const today = now.toLocaleDateString("en-CA");
    const tomorrowDate = new Date(now);
    tomorrowDate.setDate(now.getDate() + 1);
    const tomorrow = tomorrowDate.toLocaleDateString("en-CA");

    setConfig({
      ...DEFAULT_CONFIG,
      startDate: today,
      endDate: tomorrow,
      date: today,
    });
    incrementResetKey();
  };

  // 5. Form saving logic (DRAFT / PUBLISHED)
  const handleSaveExam = (status: "PUBLISHED" | "DRAFT") => {
    if (status === "PUBLISHED" && questions.length === 0) {
      alert("Tidak ada soal.");
      return;
    }

    // Sanitize all questions before saving to ensure no theme-specific styles are stored
    const sanitizedQuestions = questions.map((q) => {
      let sanitizedCorrectAnswer = q.correctAnswer;
      if (q.correctAnswer) {
        if (q.questionType === "COMPLEX_MULTIPLE_CHOICE") {
          const parsed = parseList(q.correctAnswer);
          if (parsed && parsed.length > 0) {
            sanitizedCorrectAnswer = JSON.stringify(
              parsed.map((opt) => sanitizeHtml(opt)),
            );
          } else {
            sanitizedCorrectAnswer = sanitizeHtml(q.correctAnswer);
          }
        } else if (q.questionType === "MULTIPLE_CHOICE") {
          try {
            const parsed = JSON.parse(q.correctAnswer);
            if (Array.isArray(parsed)) {
              // If it's an array (e.g. changed from COMPLEX), take first element
              sanitizedCorrectAnswer =
                parsed.length > 0 ? sanitizeHtml(parsed[0]) : "";
            } else {
              sanitizedCorrectAnswer = sanitizeHtml(q.correctAnswer);
            }
          } catch {
            sanitizedCorrectAnswer = sanitizeHtml(q.correctAnswer);
          }
        } else {
          sanitizedCorrectAnswer = sanitizeHtml(q.correctAnswer);
        }
      }

      return {
        ...q,
        questionText: sanitizeHtml(q.questionText),
        options: q.options
          ? q.options.map((opt) => sanitizeHtml(opt))
          : undefined,
        correctAnswer: sanitizedCorrectAnswer,
        trueFalseRows: q.trueFalseRows
          ? q.trueFalseRows.map((row) => ({
              ...row,
              text: sanitizeHtml(row.text),
            }))
          : undefined,
        matchingPairs: q.matchingPairs
          ? q.matchingPairs.map((pair) => ({
              ...pair,
              left: sanitizeHtml(pair.left),
              right: sanitizeHtml(pair.right),
            }))
          : undefined,
      };
    });

    const code = editingExam ? editingExam.code : generateExamCode();
    const now = new Date();
    const readableDate = now.toLocaleString("id-ID").replace(/\//g, "-");

    // Convert local time to UTC for storage
    const dateToUse = (config.startDate || config.date || "").split("T")[0];
    const localDateTime = new Date(
      `${dateToUse}T${config.startTime || "00:00"}`,
    );

    // We store the ISO string which is always UTC
    const isoStart = !isNaN(localDateTime.getTime())
      ? localDateTime.toISOString()
      : new Date().toISOString();

    const endDateToUse = (config.endDate || dateToUse).split("T")[0];
    const localEndDateTime = new Date(
      `${endDateToUse}T${config.endTime || "23:59"}:59`,
    );
    const isoEnd = !isNaN(localEndDateTime.getTime())
      ? localEndDateTime.toISOString()
      : isoStart;

    const examData: Exam = {
      code,
      authorId: teacherProfile.id,
      authorSchool: teacherProfile.school,
      questions: sanitizedQuestions,
      config: {
        ...config,
        date: isoStart,
        startDate: isoStart,
        endDate: isoEnd,
        startTime: config.startTime,
        endTime: config.endTime,
      },
      createdAt: editingExam?.createdAt || String(readableDate),
      status,
    };

    const finalExamData: Exam = {
      ...examData,
      config: {
        ...examData.config,
        isFinished: false, // Reset on save/publish to ensure it's not stuck in finished state
      },
    };

    if (editingExam) {
      updateExam(finalExamData);
      setIsEditModalOpen(false);
      setEditingExam(null);
    } else {
      addExam(finalExamData);
      if (status === "PUBLISHED") setGeneratedCode(code);
    }

    if (status === "DRAFT") {
      setView("DRAFTS");
      resetForm();
    } else {
      // Check status based on the ISO time
      const start = new Date(isoStart);
      const end = new Date(isoEnd);

      if (now >= start && now <= end) {
        setView("ONGOING");
      } else if (now < start) {
        setView("UPCOMING_EXAMS");
      } else {
        setView("FINISHED_EXAMS");
      }
      resetForm();
    }
  };

  // 6. Delete Exam Action
  const handleDeleteExam = (exam: Exam) => {
    if (confirm("Hapus ujian?")) {
      deleteExam(exam.code);
    }
  };

  // 7. Duplicate Exam Action
  const handleDuplicateExam = (exam: Exam) => {
    setQuestions(exam.questions);
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 86400000);
    const localDate = today.toLocaleDateString("en-CA");
    const localTomorrow = tomorrow.toLocaleDateString("en-CA");

    setConfig({
      ...exam.config,
      date: localDate,
      startDate: localDate,
      endDate: localTomorrow,
      isFinished: false,
    });
    setManualMode(true);
    setEditingExam(null);
    setGeneratedCode("");
    setView("UPLOAD");
    incrementResetKey();
  };

  // 8. Reuse Exam from Archive
  const handleReuseExam = (examToReuse: Exam) => {
    setQuestions(examToReuse.questions);
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 86400000);
    const localDate = today.toLocaleDateString("en-CA");
    const localTomorrow = tomorrow.toLocaleDateString("en-CA");

    const newConfig = {
      ...examToReuse.config,
      date: localDate,
      startDate: localDate,
      endDate: localTomorrow,
      isFinished: false,
    };
    setConfig(newConfig);
    setManualMode(true);
    setEditingExam(null);
    setGeneratedCode("");
    setView("UPLOAD");
    incrementResetKey();
  };

  // 8.5 Continue Draft
  const handleContinueDraft = (exam: Exam) => {
    setEditingExam(exam);
    setQuestions(exam.questions);

    let localStartDate = exam.config.startDate || exam.config.date;
    let localEndDate = exam.config.endDate;
    let localStartTime = exam.config.startTime;
    let localEndTime = exam.config.endTime;

    if (localStartDate && localStartDate.includes("T")) {
      const d = new Date(localStartDate);
      if (!isNaN(d.getTime())) {
        localStartDate = d.toLocaleDateString("en-CA");
        localStartTime = d.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    }

    if (localEndDate && localEndDate.includes("T")) {
      const d = new Date(localEndDate);
      if (!isNaN(d.getTime())) {
        localEndDate = d.toLocaleDateString("en-CA");
        localEndTime = d.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    }

    setConfig({
      ...exam.config,
      date: localStartDate,
      startDate: localStartDate,
      endDate: localEndDate,
      startTime: localStartTime,
      endTime: localEndTime,
    });
    setManualMode(true);
    setView("UPLOAD");
  };

  // 8.6 Edit Exam Modal
  const handleEditExamModal = (exam: Exam) => {
    setEditingExam(exam);
    setQuestions(exam.questions);

    let localStartDate = exam.config.startDate || exam.config.date;
    let localEndDate = exam.config.endDate;
    let localStartTime = exam.config.startTime;
    let localEndTime = exam.config.endTime;

    if (localStartDate && localStartDate.includes("T")) {
      const d = new Date(localStartDate);
      if (!isNaN(d.getTime())) {
        localStartDate = d.toLocaleDateString("en-CA");
        localStartTime = d.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    }

    if (localEndDate && localEndDate.includes("T")) {
      const d = new Date(localEndDate);
      if (!isNaN(d.getTime())) {
        localEndDate = d.toLocaleDateString("en-CA");
        localEndTime = d.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    }

    setConfig({
      ...exam.config,
      date: localStartDate,
      startDate: localStartDate,
      endDate: localEndDate,
      startTime: localStartTime,
      endTime: localEndTime,
    });
    setIsEditModalOpen(true);
  };

  // 9. Process/Archive Exam
  const { handleArchiveExam } = useArchiveExam(
    teacherProfile,
    deleteExam,
    onRefreshExams,
    setIsLoadingArchive,
  );

  // 10. Cancel Creation/Editing Handler
  const handleCancel = () => {
    setEditingExam(null);
    setManualMode(false);
    setQuestions([]);
    incrementResetKey();
  };

  // 11. Date Parsing Logic for Filters
  const getExamDates = useCallback((exam: Exam) => {
    const mode = exam.config.examMode || "UJIAN";
    const startDateRaw = exam.config.startDate || exam.config.date || "";
    const endDateRaw = exam.config.endDate;

    let start: Date;
    if (startDateRaw.includes("T")) {
      start = new Date(startDateRaw);
    } else {
      const startTimeStr = exam.config.startTime || "00:00";
      start = new Date(`${startDateRaw}T${startTimeStr}`);
    }

    if (isNaN(start.getTime())) start = new Date();

    let end: Date;
    const endTimeStr = exam.config.endTime || "23:59";

    const getLocalDateStr = (raw: string) => {
      if (!raw) return "";
      if (raw.includes("T")) {
        const d = new Date(raw);
        return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-CA");
      }
      return raw;
    };

    const localStartDateStr = getLocalDateStr(startDateRaw);
    const localEndDateStr = getLocalDateStr(endDateRaw) || localStartDateStr;

    if (mode === "PR") {
      start = new Date(0);
      end = new Date(`${localEndDateStr}T23:59:59`);
    } else {
      if (endDateRaw || exam.config.endTime) {
        if (endDateRaw && endDateRaw.includes("T")) {
          end = new Date(endDateRaw);
        } else {
          end = new Date(`${localEndDateStr}T${endTimeStr}:59`);
        }
      } else if (exam.config.timeLimit > 0) {
        end = new Date(start.getTime() + exam.config.timeLimit * 60000);
      } else {
        end = new Date(`${localStartDateStr}T23:59:59`);
      }
    }

    if (isNaN(end.getTime())) {
      end = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    }

    return { start, end };
  }, []);

  // 11. Compile filtered exam lists
  const [nowTimestamp, setNowTimestamp] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNowTimestamp(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const allExamsArray = useMemo(() => Object.values(exams), [exams]);
  const publishedExams = useMemo(
    () => allExamsArray.filter((e) => e.status !== "DRAFT"),
    [allExamsArray],
  );
  const draftExams = useMemo(
    () => allExamsArray.filter((e) => e.status === "DRAFT"),
    [allExamsArray],
  );

  const ongoingExams = useMemo(() => {
    return publishedExams.filter((exam) => {
      const { start, end } = getExamDates(exam);
      return (
        nowTimestamp >= start.getTime() &&
        nowTimestamp <= end.getTime() &&
        !exam.config.isFinished
      );
    });
  }, [publishedExams, getExamDates, nowTimestamp]);

  const upcomingExams = useMemo(() => {
    return publishedExams
      .filter((exam) => {
        const { start } = getExamDates(exam);
        return start.getTime() > nowTimestamp && !exam.config.isFinished;
      })
      .sort((a, b) => {
        return (
          getExamDates(a).start.getTime() - getExamDates(b).start.getTime()
        );
      });
  }, [publishedExams, getExamDates, nowTimestamp]);

  const finishedExams = useMemo(() => {
    return publishedExams
      .filter((exam) => {
        const { end } = getExamDates(exam);
        return end.getTime() < nowTimestamp || exam.config.isFinished;
      })
      .sort((a, b) => {
        return getExamDates(b).end.getTime() - getExamDates(a).end.getTime();
      });
  }, [publishedExams, getExamDates, nowTimestamp]);

  return {
    // States
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

    // Filtered Lists
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
  };
};
