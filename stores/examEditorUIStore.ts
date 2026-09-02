import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export interface ChartTarget {
    qId: string;
    type: 'question' | 'option' | 'tf' | 'matching' | 'correctAnswer';
    index?: number;
    subIndex?: 'left' | 'right';
}

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

    setClassTagInput: (val: string) => void;
    setTypeSelectionModalOpen: (isOpen: boolean) => void;
    setEditingChartTarget: (target: ChartTarget | null) => void;
    setSubjectModalOpen: (isOpen: boolean) => void;
    setClassModalOpen: (isOpen: boolean) => void;
    setCertificateModalOpen: (isOpen: boolean) => void;
    setExamTypeModalOpen: (isOpen: boolean) => void;
    setInsertIndex: (index: number | null) => void;
    setIsGeneratingId: (id: string | null) => void;
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

        setClassTagInput: (val) => set((state) => { state.classTagInput = val; }),
        setTypeSelectionModalOpen: (isOpen) => set((state) => { state.isTypeSelectionModalOpen = isOpen; }),
        setEditingChartTarget: (target) => set((state) => { state.editingChartTarget = target; }),
        setSubjectModalOpen: (isOpen) => set((state) => { state.isSubjectModalOpen = isOpen; }),
        setClassModalOpen: (isOpen) => set((state) => { state.isClassModalOpen = isOpen; }),
        setCertificateModalOpen: (isOpen) => set((state) => { state.isCertificateModalOpen = isOpen; }),
        setExamTypeModalOpen: (isOpen) => set((state) => { state.isExamTypeModalOpen = isOpen; }),
        setInsertIndex: (index) => set((state) => { state.insertIndex = index; }),
        setIsGeneratingId: (id) => set((state) => { state.isGeneratingId = id; }),
        
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
        }),
    }))
);
