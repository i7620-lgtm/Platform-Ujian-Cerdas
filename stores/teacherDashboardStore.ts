import { create } from "zustand";
import type { Exam } from "../types";
import type { TeacherView } from "../components/teacher/useTeacherDashboard";

export interface DashboardUIState {
  view: TeacherView;
  isLoadingArchive: boolean;
  selectedOngoingExam: Exam | null;
  selectedFinishedExam: Exam | null;
  isEditModalOpen: boolean;
  editingExam: Exam | null;
  isInviteOpen: boolean;
  isMainGuideModalOpen: boolean;
  resetKey: number;
  generatedCode: string;
  manualMode: boolean;
}

export interface DashboardUIActions {
  setView: (view: TeacherView) => void;
  setIsLoadingArchive: (isLoading: boolean) => void;
  setSelectedOngoingExam: (exam: Exam | null) => void;
  setSelectedFinishedExam: (exam: Exam | null) => void;
  setIsEditModalOpen: (isOpen: boolean) => void;
  setEditingExam: (exam: Exam | null) => void;
  setIsInviteOpen: (isOpen: boolean) => void;
  setIsMainGuideModalOpen: (isOpen: boolean) => void;
  setGeneratedCode: (code: string) => void;
  setManualMode: (isManual: boolean) => void;
  incrementResetKey: () => void;
}

export type TeacherDashboardStore = DashboardUIState & DashboardUIActions;

export const useTeacherDashboardStore = create<TeacherDashboardStore>((set) => ({
  view: "UPLOAD",
  isLoadingArchive: false,
  selectedOngoingExam: null,
  selectedFinishedExam: null,
  isEditModalOpen: false,
  editingExam: null,
  isInviteOpen: false,
  isMainGuideModalOpen: false,
  resetKey: 0,
  generatedCode: "",
  manualMode: false,

  setView: (view) => set({ view }),
  setIsLoadingArchive: (isLoadingArchive) => set({ isLoadingArchive }),
  setSelectedOngoingExam: (selectedOngoingExam) => set({ selectedOngoingExam }),
  setSelectedFinishedExam: (selectedFinishedExam) => set({ selectedFinishedExam }),
  setIsEditModalOpen: (isEditModalOpen) => set({ isEditModalOpen }),
  setEditingExam: (editingExam) => set({ editingExam }),
  setIsInviteOpen: (isInviteOpen) => set({ isInviteOpen }),
  setIsMainGuideModalOpen: (isMainGuideModalOpen) => set({ isMainGuideModalOpen }),
  setGeneratedCode: (generatedCode) => set({ generatedCode }),
  setManualMode: (manualMode) => set({ manualMode }),
  incrementResetKey: () => set((state) => ({ resetKey: state.resetKey + 1 })),
}));
