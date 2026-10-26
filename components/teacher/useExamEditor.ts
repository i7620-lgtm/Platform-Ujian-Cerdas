import { useRef, useEffect, useMemo, useCallback } from "react";
import type { Question } from "../../types";
import { useExamEditorStore } from "../../stores/examEditorStore";
import { useExamEditorUIStore } from "../../stores/examEditorUIStore";
import { generateQuestions } from "../../services/geminiService";

interface UseExamEditorParams {
  isEditing: boolean;
  generatedCode: string;
  isPremium?: boolean;
}

export const useExamEditor = ({
  isEditing,
  generatedCode,
}: UseExamEditorParams) => {
  // Select state and actions directly from store
  const {
    questions,
    config,
    setQuestions,
    setConfig,
    reset,
    handleAddClassTag: handleAddClassTagAction,
    handleAddClassTags: handleAddClassTagsAction,
    removeClassTag,
    setRegisteredStudents,
    addRegisteredStudents,
    handleConfigChangeManual,
    handleSubjectSelect,
    handleSaveChart,
    handleQuestionTextChange,
    handleCategoryChange,
    handleLevelChange,
    handleKisiKisiChange,
    handleScoreWeightChange,
    handleTypeChange,
    handleOptionTextChange,
    handleCorrectAnswerChange,
    handleComplexCorrectAnswerChange,
    handleDeleteQuestion,
    handleSelectQuestionType,
    handleAddOption,
    handleDeleteOption,
    handleTrueFalseRowTextChange,
    handleTrueFalseRowAnswerChange,
    handleAddTrueFalseRow,
    handleDeleteTrueFalseRow,
    handleMatchingPairChange,
    handleAddMatchingPair,
    handleDeleteMatchingPair,
    handleDeleteChart,
  } = useExamEditorStore();

  const {
    classTagInput,
    isTypeSelectionModalOpen,
    editingChartTarget,
    isSubjectModalOpen,
    isClassModalOpen,
    isCertificateModalOpen,
    isExamTypeModalOpen,
    insertIndex,
    isGeneratingId,
    setClassTagInput,
    setTypeSelectionModalOpen,
    setEditingChartTarget,
    setSubjectModalOpen,
    setClassModalOpen,
    setCertificateModalOpen,
    setExamTypeModalOpen,
    setInsertIndex,
    setIsGeneratingId,
  } = useExamEditorUIStore();

  const questionsSectionRef = useRef<HTMLDivElement>(null);
  const generatedCodeSectionRef = useRef<HTMLDivElement>(null);

  // Keyboard handler for adding target classes
  const handleAddClassTag = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && classTagInput.trim()) {
        e.preventDefault();
        let newTag = classTagInput.trim();

        // Check if input matches "Class Count" pattern (e.g. "6a 40")
        const spaceMatch = newTag.match(/^(.+)\s+(\d+)$/);
        if (spaceMatch) {
          newTag = `${spaceMatch[1]}(${spaceMatch[2]})`;
        }
        handleAddClassTagAction(newTag);
      }
    },
    [classTagInput, handleAddClassTagAction],
  );

  // Check if Essay or Short Answer Exists (Requires Manual Grading)
  const hasManualGrading = useMemo(() => {
    return questions.some(
      (q) =>
        q.questionType === "ESSAY" || q.questionType === "FILL_IN_THE_BLANK",
    );
  }, [questions]);

  const subject = config.subject;
  const includeImagesConfig = (config as any)?.includeImages;

  // Generate single question leveraging AI/Gemini inside the editor
  const handleGenerateSingleQuestion = useCallback(
    async (q: Question) => {
      const userCategory = q.category?.trim() || "";
      const userLevel = q.level?.trim() || "";
      const userWeight = Number(q.scoreWeight);
      const isWeightInvalid = !q.scoreWeight || isNaN(userWeight) || userWeight <= 0;

      // Validasi kotak input yang masih kosong: Kategori, Level, Bobot Nilai (Kisi-kisi opsional)
      if (!userCategory || !userLevel || isWeightInvalid) {
        const valErrors: { category?: boolean; level?: boolean; scoreWeight?: boolean } = {};
        if (!userCategory) valErrors.category = true;
        if (!userLevel) valErrors.level = true;
        if (isWeightInvalid) valErrors.scoreWeight = true;

        useExamEditorUIStore.getState().setQuestionValidation(q.id, valErrors);
        const missingLabels: string[] = [];
        if (valErrors.category) missingLabels.push("Kategori Soal");
        if (valErrors.level) missingLabels.push("Level Soal");
        if (valErrors.scoreWeight) missingLabels.push("Bobot Nilai");

        alert(`Harap lengkapi kolom berikut sebelum membuat soal dengan AI:\n• ${missingLabels.join("\n• ")}`);
        return;
      }

      // Bersihkan error validasi jika sudah valid
      useExamEditorUIStore.getState().clearQuestionValidation(q.id);

      setIsGeneratingId(q.id);
      try {
        const questionTypeLabel =
          q.questionType === "MULTIPLE_CHOICE"
            ? "Pilihan Ganda"
            : q.questionType === "COMPLEX_MULTIPLE_CHOICE"
              ? "Pilihan Ganda Kompleks"
              : q.questionType === "TRUE_FALSE"
                ? "Benar/Salah"
                : q.questionType === "MATCHING"
                  ? "Menjodohkan"
                  : q.questionType === "FILL_IN_THE_BLANK"
                    ? "Uraian Singkat"
                    : "Esai";

        const cognitiveLevel = userLevel || "Level 3 - Penalaran (Reasoning / HOTS)";
        const userKisiKisi = q.kisiKisi?.trim() || "";
        
        let blueprintPrompt = "";
        if (userKisiKisi) {
          blueprintPrompt = `WAJIB DIIKUTI KETAT DAN PRESISI: Kisi-kisi soal adalah "${userKisiKisi}". Buat butir soal baru mengenai materi "${userCategory}" sesuai dengan kisi-kisi dan tingkat kognitif "${cognitiveLevel}".`;
        } else {
          blueprintPrompt = `Buat butir soal baru yang bervariasi, aplikatif, dan kontekstual mengenai materi "${userCategory}" dengan level kognitif "${cognitiveLevel}". Rumuskan kisi-kisi yang relevan.`;
        }

        const includeImages = includeImagesConfig ?? true;
        const aiSubject = userCategory
          ? (subject ? `${subject} - ${userCategory}` : userCategory)
          : (subject || "Umum");

        const aiConfig: QuizConfig = {
          subject: aiSubject,
          category: userCategory || undefined,
          kisiKisi: userKisiKisi || undefined,
          count: 1,
          type: questionTypeLabel,
          types: [questionTypeLabel],
          difficulty: cognitiveLevel,
          difficulties: [cognitiveLevel],
          blueprint: blueprintPrompt,
          includeImages,
          scoreWeight: userWeight > 0 ? userWeight : 1,
        };

        const generatedQuestions = await generateQuestions(aiConfig);
        if (generatedQuestions && generatedQuestions.length > 0) {
          const newQ = generatedQuestions[0];
          const currentQuestions = useExamEditorStore.getState().questions;
          const isTrueFalse = q.questionType === "TRUE_FALSE" || newQ.questionType === "TRUE_FALSE";
          const resolvedTrueFalseRows = isTrueFalse
            ? (newQ.trueFalseRows && newQ.trueFalseRows.length > 0
                ? newQ.trueFalseRows
                : (q.trueFalseRows && q.trueFalseRows.length > 0
                    ? q.trueFalseRows
                    : [
                        { text: "Pernyataan 1 terkait materi soal", answer: true },
                        { text: "Pernyataan 2 terkait materi soal", answer: false },
                        { text: "Pernyataan 3 terkait materi soal", answer: true }
                      ]
                  )
              )
            : undefined;

          setQuestions(
            currentQuestions.map((question) =>
              question.id === q.id
                ? {
                    ...question,
                    ...newQ,
                    id: question.id,
                    questionType: q.questionType,
                    questionText: newQ.questionText,
                    options: newQ.options || (newQ.questionType === "MULTIPLE_CHOICE" || newQ.questionType === "COMPLEX_MULTIPLE_CHOICE" ? [] : undefined),
                    correctAnswer: newQ.correctAnswer,
                    explanation: newQ.explanation || "",
                    hint: newQ.hint || question.hint || "",
                    solutionSteps: newQ.solutionSteps || newQ.explanation || question.solutionSteps || "",
                    chartData: newQ.chartData ?? undefined,
                    trueFalseRows: resolvedTrueFalseRows,
                    categoryLabels: newQ.categoryLabels || q.categoryLabels || undefined,
                    matchingPairs: newQ.matchingPairs || q.matchingPairs || undefined,
                    category: userCategory || newQ.category || q.category,
                    level: userLevel || newQ.level || q.level,
                    kisiKisi: userKisiKisi ? userKisiKisi : (newQ.kisiKisi || q.kisiKisi || ""),
                    scoreWeight: userWeight > 0 ? userWeight : (newQ.scoreWeight || 1),
                  }
                : question,
            ),
          );
        }
      } catch (error: unknown) {
        let cleanErr = "Terjadi kendala jaringan saat membuat butir soal.";
        if (typeof error === "string") {
          cleanErr = error;
        } else if (error && typeof error === "object") {
          cleanErr = (error as any).message || (error as any).error?.message || (typeof (error as any).error === "string" ? (error as any).error : "") || "";
          if (!cleanErr || cleanErr === "[object Object]") {
            try {
              cleanErr = JSON.stringify(error);
            } catch {
              cleanErr = "Layanan AI tidak dapat diakses saat ini. Silakan coba sesaat lagi.";
            }
          }
        }
        alert(`Gagal membuat soal dengan AI: ${cleanErr}`);
      } finally {
        setIsGeneratingId(null);
      }
    },
    [subject, includeImagesConfig, setQuestions, setIsGeneratingId],
  );

  // Cascading configurations on manual configuration changes
  const handleConfigChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      const { name, value, type } = e.target;
      if (type === "checkbox") {
        const { checked } = e.target as HTMLInputElement;
        handleConfigChangeManual((prev) => {
          const newConfig = { ...prev, [name]: checked };
          if (name === "detectBehavior" && !checked)
            newConfig.continueWithPermission = false;
          return newConfig;
        });
      } else {
        handleConfigChangeManual((prev) => {
          const newConfig = {
            ...prev,
            [name]: name === "timeLimit" ? parseInt(value) || 0 : value,
          };
          if (name === "examMode" && value === "PR") {
            newConfig.detectBehavior = false;
            newConfig.continueWithPermission = false;
            newConfig.trackLocation = false;
            if (!newConfig.endTime || newConfig.endTime === "10:00") {
              newConfig.endTime = "23:59";
            }
          }
          return newConfig;
        });
      }
    },
    [handleConfigChangeManual],
  );

  // Auto scrolls for UI transition and generated access codes
  useEffect(() => {
    if (!isEditing && !generatedCode) {
      const timer = setTimeout(() => {
        if (questionsSectionRef.current) {
          questionsSectionRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isEditing, generatedCode]);

  useEffect(() => {
    if (generatedCode && generatedCodeSectionRef.current) {
      setTimeout(() => {
        generatedCodeSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 200);
    }
  }, [generatedCode]);

  return {
    // State
    questions,
    config,
    classTagInput,
    isTypeSelectionModalOpen,
    editingChartTarget,
    isSubjectModalOpen,
    isClassModalOpen,
    isCertificateModalOpen,
    isExamTypeModalOpen,
    insertIndex,
    isGeneratingId,
    hasManualGrading,

    // Refs
    questionsSectionRef,
    generatedCodeSectionRef,

    // Actions
    reset,
    setClassTagInput,
    setTypeSelectionModalOpen,
    setEditingChartTarget,
    setSubjectModalOpen,
    setClassModalOpen,
    setCertificateModalOpen,
    setExamTypeModalOpen,
    setInsertIndex,
    setIsGeneratingId,
    setQuestions,
    setConfig,

    // Mutators / Handlers
    handleAddClassTag,
    handleAddClassTags: handleAddClassTagsAction,
    removeClassTag,
    setRegisteredStudents,
    addRegisteredStudents,
    handleConfigChangeManual,
    handleSubjectSelect,
    handleSaveChart,
    handleQuestionTextChange,
    handleCategoryChange,
    handleLevelChange,
    handleKisiKisiChange,
    handleScoreWeightChange,
    handleTypeChange,
    handleOptionTextChange,
    handleCorrectAnswerChange,
    handleComplexCorrectAnswerChange,
    handleDeleteQuestion,
    handleSelectQuestionType,
    handleAddOption,
    handleDeleteOption,

    handleTrueFalseRowTextChange,
    handleTrueFalseRowAnswerChange,
    handleAddTrueFalseRow,
    handleDeleteTrueFalseRow,

    handleMatchingPairChange,
    handleAddMatchingPair,
    handleDeleteMatchingPair,
    handleDeleteChart,

    handleGenerateSingleQuestion,
    handleConfigChange,
  };
};
