
import { supabase } from '../lib/supabase';
import { authService } from './auth';
import { examService } from './exam';
import { resultService } from './result';
import { archiveService } from './archive';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Exam, Result, Question, TeacherProfile, AccountType, UserProfile, ExamSummary, ExamConfig, ResultStatus } from '../types';

// --- INDEXED DB HELPER ---
import { offlineService } from './offline';

class StorageService {

    constructor() {
        // Offline handling and background queue synchronization is fully delegated to OfflineService
    }

    /**
     * Specialized method for saving exams by collaborators.
     * Includes token verification and specific fallback strategies.
     */
    async saveCollaboratorExam(exam: Exam, token: string): Promise<void> {
        return examService.saveCollaboratorExam(exam, token);
    }

  async updateExamAnswerKey(examCode: string, questionId: string, newCorrectAnswer: string): Promise<void> {
      return examService.updateExamAnswerKey(examCode, questionId, newCorrectAnswer);
  }

  // --- INDEXED DB METHODS (LOCAL PROGRESS) ---
  
  async saveLocalProgress(key: string, data: unknown): Promise<void> {
      return offlineService.saveLocalProgress(key, data);
  }

  async getLocalProgress(key: string): Promise<unknown | null> {
      return offlineService.getLocalProgress(key);
  }

  async clearLocalProgress(key: string): Promise<void> {
      return offlineService.clearLocalProgress(key);
  }
  
  // --- AUTH METHODS (Delegated to AuthService) ---
  async getCurrentUser(): Promise<TeacherProfile | null> {
      return authService.getCurrentUser();
  }

  private async _verifyRole(allowedRoles: AccountType[]): Promise<TeacherProfile> {
      return authService._verifyRole(allowedRoles);
  }

  async signUpWithEmail(email: string, password: string, fullName: string, school: string, regency: string): Promise<TeacherProfile> {
      return authService.signUpWithEmail(email, password, fullName, school, regency);
  }

  async signInWithEmail(email: string, password: string): Promise<TeacherProfile> {
      return authService.signInWithEmail(email, password);
  }

  async signOut() {
      await authService.signOut();
  }

  async updateTeacherProfile(id: string, updates: Partial<TeacherProfile>): Promise<void> {
      await authService.updateTeacherProfile(id, updates);
  }

  // --- USER MANAGEMENT (SUPER ADMIN) ---
  
  async getAllUsers(): Promise<UserProfile[]> {
      return authService.getAllUsers();
  }

  async updateUserRole(userId: string, newRole: AccountType, newSchool: string, isPremium?: boolean): Promise<void> {
      await authService.updateUserRole(userId, newRole, newSchool, isPremium);
  }

  // --- EXAM METHODS ---

  async getExams(profile?: TeacherProfile): Promise<Record<string, Exam>> {
      return examService.getExams(profile);
  }

  async getExamForStudent(code: string, studentId?: string, isPreview = false): Promise<Exam | null> {
      return examService.getExamForStudent(code, studentId, isPreview);
  }

  async getExamConfig(code: string): Promise<ExamConfig | null> {
      return examService.getExamConfig(code);
  }

  async saveExam(exam: Exam): Promise<void> {
      return examService.saveExam(exam);
  }

  async updateStudentData(resultId: number, oldStudentId: string, newData: { fullName: string, schoolName?: string, class: string, absentNumber: string }): Promise<void> {
      return resultService.updateStudentData(resultId, oldStudentId, newData);
  }

  async deleteExam(code: string): Promise<void> {
      return examService.deleteExam(code);
  }

  // --- ARCHIVE & ANALYTICS METHODS ---

  async performFullArchive(exam: Exam): Promise<{ backupUrl?: string }> {
      return archiveService.performFullArchive(exam);
  }

  async registerLegacyArchive(exam: Exam, results: Result[]): Promise<void> {
      return archiveService.registerLegacyArchive(exam, results);
  }

  async getAnalyticsData(filters?: { region?: string, subject?: string, school?: string, classLevel?: string, examType?: string, date?: string }): Promise<ExamSummary[]> {
      return archiveService.getAnalyticsData(filters);
  }

  async deleteAnalyticsData(id: string): Promise<void> {
      return archiveService.deleteAnalyticsData(id);
  }

  generateAnalysisPrompt(summaries: ExamSummary[], customPrompt?: string): string {
      return archiveService.generateAnalysisPrompt(summaries, customPrompt);
  }

  async generateAIAnalysis(summaries: ExamSummary[], customPrompt?: string): Promise<string> {
      return archiveService.generateAIAnalysis(summaries, customPrompt);
  }

  async getExamForArchive(code: string): Promise<Exam | null> {
      return examService.getExamForArchive(code);
  }

  async cleanupExamAssets(code: string): Promise<void> {
      return examService.cleanupExamAssets(code);
  }

  mapRowToResult(row: Record<string, unknown>): Result {
      return resultService.mapRowToResult(row);
  }

  async getResults(examCode?: string, className?: string, schoolName?: string): Promise<Result[]> {
      return resultService.getResults(examCode, className, schoolName);
  }

  async submitExamResult(resultPayload: Result): Promise<Result> {
      return resultService.submitExamResult(resultPayload);
  }

  async processQueue() {
      return offlineService.processQueue();
  }

  async getStudentResult(examCode: string, studentId: string): Promise<Result | null> {
      return resultService.getStudentResult(examCode, studentId);
  }

  async unlockStudentExam(examCode: string, studentId: string): Promise<void> {
      return resultService.unlockStudentExam(examCode, studentId);
  }

  async finishStudentExam(examCode: string, studentId: string): Promise<void> {
      return resultService.finishStudentExam(examCode, studentId);
  }

  async finishAllExams(examCode: string): Promise<void> {
      return resultService.finishAllExams(examCode);
  }

  async stopExamOverall(examCode: string): Promise<void> {
      return resultService.stopExamOverall(examCode);
  }

  async extendExamTime(examCode: string, additionalMinutes: number): Promise<void> {
      return resultService.extendExamTime(examCode, additionalMinutes);
  }

  async sendProgressUpdate(examCode: string, studentId: string, answeredCount: number, totalQuestions: number, existingChannel?: RealtimeChannel | null) {
      return resultService.sendProgressUpdate(examCode, studentId, answeredCount, totalQuestions, existingChannel);
  }
  
  async syncData() { this.processQueue(); }

  async generateUnlockToken(examCode: string, studentId: string): Promise<string> {
      return resultService.generateUnlockToken(examCode, studentId);
  }

  async verifyUnlockToken(examCode: string, studentId: string, token: string): Promise<boolean> {
      return resultService.verifyUnlockToken(examCode, studentId, token);
  }

  async deleteStudentResult(examCode: string, studentId: string): Promise<void> {
      return resultService.deleteStudentResult(examCode, studentId);
  }

  async uploadArchive(examCode: string, jsonString: string, metadata?: Record<string, unknown>): Promise<string> {
      return archiveService.uploadArchive(examCode, jsonString, metadata);
  }

  async getArchivedList(): Promise<{name: string, created_at: string, size: number, metadata?: Record<string, unknown>}[]> {
      return archiveService.getArchivedList();
  }

  async downloadArchive(path: string): Promise<Record<string, unknown>> {
      return archiveService.downloadArchive(path);
  }

  async deleteArchive(filename: string): Promise<void> {
      return archiveService.deleteArchive(filename);
  }

  async addCollaborator(examCode: string, label: string, role: 'editor' | 'viewer'): Promise<string> {
      return examService.addCollaborator(examCode, label, role);
  }

  async removeCollaborator(examCode: string, token: string): Promise<void> {
      return examService.removeCollaborator(examCode, token);
  }

  async getExamByCollaboratorToken(code: string, token: string): Promise<{ exam: Exam, role: 'editor' | 'viewer' } | null> {
      return examService.getExamByCollaboratorToken(code, token);
  }

  async updateAnalyticsData(examCode: string, updates: Partial<ExamSummary>): Promise<void> {
      return archiveService.updateAnalyticsData(examCode, updates);
  }
}

export const storageService = new StorageService();