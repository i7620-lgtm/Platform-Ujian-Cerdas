import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export interface ChartTarget {
    qId: string;
    type: 'question' | 'option' | 'tf' | 'matching' | 'correctAnswer';
    index?: number;
    subIndex?: 'left' | 'right';
    preferredType?: 'bar' | 'line' | 'pie' | 'venn' | 'relation' | 'cartesian';
}

export type ConfigTabId = 'general' | 'schedule' | 'security_results' | 'bank_olympiad';

export type ConfigInfoTopic =
    | 'target_classes'
    | 'exam_mode'
    | 'daily_sessions'
    | 'allow_overtime'
    | 'detect_behavior'
    | 'lock_violation'
    | 'bank_soal'
    | 'olympiad'
    | 'certificate'
    | 'operation_mode'
    | null;

interface ExamEditorUIState {
    classTagInput: string;
    isTypeSelectionModalOpen: boolean;
    editingChartTarget: ChartTarget | null;
    isSubjectModalOpen: boolean; 
    isClassModalOpen: boolean; 
    isCertificateModalOpen: boolean; 
    isExamTypeModalOpen: boolean; 
    insertIndex: number | null;
    isGeneratingId: string | null;
    questionValidation: Record<string, { category?: boolean; level?: boolean; scoreWeight?: boolean }>;
    activeConfigTab: ConfigTabId;
    configInfoTopic: ConfigInfoTopic;

    setClassTagInput: (val: string) => void;
    setTypeSelectionModalOpen: (isOpen: boolean) => void;
    setEditingChartTarget: (target: ChartTarget | null) => void;
    setSubjectModalOpen: (isOpen: boolean) => void;
    setClassModalOpen: (isOpen: boolean) => void;
    setCertificateModalOpen: (isOpen: boolean) => void;
    setExamTypeModalOpen: (isOpen: boolean) => void;
    setInsertIndex: (index: number | null) => void;
    setIsGeneratingId: (id: string | null) => void;
    setQuestionValidation: (qId: string, errors: { category?: boolean; level?: boolean; scoreWeight?: boolean }) => void;
    clearQuestionValidationField: (qId: string, field: 'category' | 'level' | 'scoreWeight') => void;
    clearQuestionValidation: (qId: string) => void;
    setActiveConfigTab: (tab: ConfigTabId) => void;
    setConfigInfoTopic: (topic: ConfigInfoTopic) => void;
    resetUI: () => void;
}

export const useExamEditorUIStore = create<ExamEditorUIState>()(
    immer((set) => ({
        classTagInput: '',
        isTypeSelectionModalOpen: false,
        editingChartTarget: null,
        isSubjectModalOpen: false, 
        isClassModalOpen: false, 
        isCertificateModalOpen: false, 
        isExamTypeModalOpen: false, 
        insertIndex: null,
        isGeneratingId: null,
        questionValidation: {},
        activeConfigTab: 'general',
        configInfoTopic: null,

        setClassTagInput: (val) => set((state) => { state.classTagInput = val; }),
        setTypeSelectionModalOpen: (isOpen) => set((state) => { state.isTypeSelectionModalOpen = isOpen; }),
        setEditingChartTarget: (target) => set((state) => { state.editingChartTarget = target; }),
        setSubjectModalOpen: (isOpen) => set((state) => { state.isSubjectModalOpen = isOpen; }),
        setClassModalOpen: (isOpen) => set((state) => { state.isClassModalOpen = isOpen; }),
        setCertificateModalOpen: (isOpen) => set((state) => { state.isCertificateModalOpen = isOpen; }),
        setExamTypeModalOpen: (isOpen) => set((state) => { state.isExamTypeModalOpen = isOpen; }),
        setInsertIndex: (index) => set((state) => { state.insertIndex = index; }),
        setIsGeneratingId: (id) => set((state) => { state.isGeneratingId = id; }),
        setQuestionValidation: (qId, errors) => set((state) => {
            state.questionValidation[qId] = errors;
        }),
        clearQuestionValidationField: (qId, field) => set((state) => {
            if (state.questionValidation[qId]) {
                delete state.questionValidation[qId][field];
            }
        }),
        clearQuestionValidation: (qId) => set((state) => {
            delete state.questionValidation[qId];
        }),
        setActiveConfigTab: (tab) => set((state) => {
            state.activeConfigTab = tab;
        }),
        setConfigInfoTopic: (topic) => set((state) => {
            state.configInfoTopic = topic;
        }),
        
        resetUI: () => set((state) => {
            state.classTagInput = '';
            state.isTypeSelectionModalOpen = false;
            state.editingChartTarget = null;
            state.isSubjectModalOpen = false;
            state.isClassModalOpen = false;
            state.isCertificateModalOpen = false;
            state.isExamTypeModalOpen = false;
            state.insertIndex = null;
            state.isGeneratingId = null;
            state.questionValidation = {};
            state.activeConfigTab = 'general';
            state.configInfoTopic = null;
        }),
    }))
);
