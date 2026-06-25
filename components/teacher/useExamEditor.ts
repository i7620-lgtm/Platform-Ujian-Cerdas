import { useRef, useEffect, useMemo, useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
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
  // Select state and actions using useShallow to minimize subscriptions and prevent unnecessary re-renders
  const {
    questions,
    config,
    setQuestions,
    setConfig,
    reset,
    handleAddClassTagAction,
    removeClassTag,
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
  } = useExamEditorStore(
    useShallow((s) => ({
      questions: s.questions,
      config: s.config,
      setQuestions: s.setQuestions,
      setConfig: s.setConfig,
      reset: s.reset,
      handleAddClassTagAction: s.handleAddClassTag,
      removeClassTag: s.removeClassTag,
      handleConfigChangeManual: s.handleConfigChangeManual,
      handleSubjectSelect: s.handleSubjectSelect,
      handleSaveChart: s.handleSaveChart,
      handleQuestionTextChange: s.handleQuestionTextChange,
      handleCategoryChange: s.handleCategoryChange,
      handleLevelChange: s.handleLevelChange,
      handleKisiKisiChange: s.handleKisiKisiChange,
      handleScoreWeightChange: s.handleScoreWeightChange,
      handleTypeChange: s.handleTypeChange,
      handleOptionTextChange: s.handleOptionTextChange,
      handleCorrectAnswerChange: s.handleCorrectAnswerChange,
      handleComplexCorrectAnswerChange: s.handleComplexCorrectAnswerChange,
      handleDeleteQuestion: s.handleDeleteQuestion,
      handleSelectQuestionType: s.handleSelectQuestionType,
      handleAddOption: s.handleAddOption,
      handleDeleteOption: s.handleDeleteOption,
      handleTrueFalseRowTextChange: s.handleTrueFalseRowTextChange,
      handleTrueFalseRowAnswerChange: s.handleTrueFalseRowAnswerChange,
      handleAddTrueFalseRow: s.handleAddTrueFalseRow,
      handleDeleteTrueFalseRow: s.handleDeleteTrueFalseRow,
      handleMatchingPairChange: s.handleMatchingPairChange,
      handleAddMatchingPair: s.handleAddMatchingPair,
      handleDeleteMatchingPair: s.handleDeleteMatchingPair,
      handleDeleteChart: s.handleDeleteChart,
    }))
  );

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
  } = useExamEditorUIStore(
    useShallow((s) => ({
      classTagInput: s.classTagInput,
      isTypeSelectionModalOpen: s.isTypeSelectionModalOpen,
      editingChartTarget: s.editingChartTarget,
      isSubjectModalOpen: s.isSubjectModalOpen,
      isClassModalOpen: s.isClassModalOpen,
      isCertificateModalOpen: s.isCertificateModalOpen,
      isExamTypeModalOpen: s.isExamTypeModalOpen,
      insertIndex: s.insertIndex,
      isGeneratingId: s.isGeneratingId,
      setClassTagInput: s.setClassTagInput,
      setTypeSelectionModalOpen: s.setTypeSelectionModalOpen,
      setEditingChartTarget: s.setEditingChartTarget,
      setSubjectModalOpen: s.setSubjectModalOpen,
      setClassModalOpen: s.setClassModalOpen,
      setCertificateModalOpen: s.setCertificateModalOpen,
      setExamTypeModalOpen: s.setExamTypeModalOpen,
      setInsertIndex: s.setInsertIndex,
      setIsGeneratingId: s.setIsGeneratingId,
    }))
  );

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

  // Generate single question leveraging AI/Gemini inside the editor
  const handleGenerateSingleQuestion = useCallback(
    async (q: Question) => {
      setIsGeneratingId(q.id);
      try {
        const aiConfig = {
          subject: q.category || config.subject || "Umum",
          count: 1,
          type:
            q.questionType === "MULTIPLE_CHOICE"
              ? "Pilihan Ganda"
              : q.questionType === "COMPLEX_MULTIPLE_CHOICE"
                ? "Pilihan Ganda Kompleks"
                : q.questionType === "TRUE_FALSE"
                  ? "Benar/Salah"
                  : q.questionType === "MATCHING"
                    ? "Menjodohkan"
                    : q.questionType === "FILL_IN_THE_BLANK"
                      ? "Isian Singkat"
                      : "Esai",
          difficulty: q.level || "Sedang",
          blueprint: q.kisiKisi || "",
          includeImages: false,
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
                    category: q.category,
                    level: q.level,
                    kisiKisi: q.kisiKisi,
                    scoreWeight: newQ.scoreWeight || q.scoreWeight,
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
    [config.subject, setQuestions, setIsGeneratingId],
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
    removeClassTag,
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
