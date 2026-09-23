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

        const cognitiveLevel = q.level?.trim() || "Level 3 - Penalaran (Reasoning / HOTS)";
        const cleanContext = (q.questionText || "").replace(/<[^>]+>/g, " ").trim();
        const userKisiKisi = q.kisiKisi?.trim() || "";
        const userCategory = q.category?.trim() || "";
        
        let blueprintPrompt = userKisiKisi;
        if (!blueprintPrompt) {
          if (userCategory) {
            blueprintPrompt = `Buat butir soal baru yang bervariasi mengenai materi "${userCategory}" sesuai dengan level kognitif yang ditentukan tanpa terpaku pada satu bentuk bangun tertentu.`;
          } else if (cleanContext) {
            blueprintPrompt = `Buat variasi soal baru yang berbeda dari topik ini: "${cleanContext.slice(0, 200)}"`;
          }
        }

        const includeImages = includeImagesConfig ?? true;
        const aiSubject = [subject, userCategory].filter(Boolean).join(" - ") || "Umum";

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
        };

        const generatedQuestions = await generateQuestions(aiConfig);
        if (generatedQuestions && generatedQuestions.length > 0) {
          const newQ = generatedQuestions[0];
          const currentQuestions = useExamEditorStore.getState().questions;
          setQuestions(
            currentQuestions.map((question) =>
              question.id === q.id
                ? {
                    ...question,
                    ...newQ,
                    id: question.id,
                    questionText: newQ.questionText,
                    options: newQ.options || (newQ.questionType === "MULTIPLE_CHOICE" || newQ.questionType === "COMPLEX_MULTIPLE_CHOICE" ? [] : undefined),
                    correctAnswer: newQ.correctAnswer,
                    explanation: newQ.explanation || "",
                    chartData: newQ.chartData ?? undefined,
                    trueFalseRows: newQ.trueFalseRows || undefined,
                    matchingPairs: newQ.matchingPairs || undefined,
                    category: userCategory || newQ.category || q.category,
                    level: q.level?.trim() ? q.level : (newQ.level || q.level),
                    kisiKisi: userKisiKisi || newQ.kisiKisi || q.kisiKisi,
                    scoreWeight: q.scoreWeight || newQ.scoreWeight || 1,
                  }
                : question,
            ),
          );
        }
      } catch (error: unknown) {
        alert(`Gagal membuat soal dengan AI: ${(error as Error).message}`);
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
