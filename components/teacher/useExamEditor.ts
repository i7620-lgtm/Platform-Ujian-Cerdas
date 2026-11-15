import { useRef, useEffect, useMemo, useCallback } from "react";
import { useExamEditorStore } from "../../stores/examEditorStore";
import { useExamEditorUIStore } from "../../stores/examEditorUIStore";

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

    handleConfigChange,
  };
};
