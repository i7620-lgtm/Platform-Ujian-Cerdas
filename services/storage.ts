
import type { Exam, Result, Question, ResultStatus } from '../types';

const KEYS = { EXAMS: 'app_exams_data', RESULTS: 'app_results_data' };
const API_URL = (import.meta as any).env?.VITE_API_URL || '/api';

async function retryOperation<T>(operation: () => Promise<T>, retries = 2, delay = 1000): Promise<T> {
    try { return await operation(); } catch (error) {
        if (retries <= 0) throw error;
        await new Promise(r => setTimeout(r, delay));
        return retryOperation(operation, retries - 1, delay * 1.5);
    }
}

const sanitizeExamForStudent = (exam: Exam): Exam => {
    const sanitizedQuestions = exam.questions.map(q => {
        const { correctAnswer, trueFalseRows, matchingPairs, ...rest } = q;
        const sanitizedQ = { ...rest } as Question;
        if (trueFalseRows) sanitizedQ.trueFalseRows = trueFalseRows.map(r => ({ text: r.text, answer: false })) as any;
        if (matchingPairs && Array.isArray(matchingPairs)) {
            const rights = matchingPairs.map(p => p.right).sort(() => Math.random() - 0.5);
            sanitizedQ.matchingPairs = matchingPairs.map((p, i) => ({ left: p.left, right: rights[i] }));
        }
        return sanitizedQ;
    });
    return { ...exam, questions: sanitizedQuestions };
};

class StorageService {
  private isOnline: boolean = navigator.onLine;
  constructor() {
    window.addEventListener('online', () => { this.isOnline = true; });
    window.addEventListener('offline', () => { this.isOnline = false; });
  }

  // --- EXAMS ---
  async getExams(headers: Record<string, string> = {}): Promise<Record<string, Exam>> {
    let localExams = this.loadLocal<Record<string, Exam>>(KEYS.EXAMS) || {};
    if (this.isOnline) {
      try {
        const response = await retryOperation(() => fetch(`${API_URL}/exams`, { headers: headers as any }));
        if (response.ok) {
          const cloudExams: Exam[] = await response.json();
          // Merge logic: Jangan timpa draf lokal yang belum tersinkron
          cloudExams.forEach(exam => { 
              if (!localExams[exam.code] || localExams[exam.code].isSynced !== false) {
                  localExams[exam.code] = { ...exam, isSynced: true }; 
              }
          });
          this.saveLocal(KEYS.EXAMS, localExams);
        }
      } catch (e) { console.warn("Sync failed, using local."); }
    }
    return localExams;
  }

  async getExamForStudent(code: string, isPreview = false): Promise<Exam | null> {
      const allExams = this.loadLocal<Record<string, Exam>>(KEYS.EXAMS) || {};
      let exam = allExams[code];
      if (this.isOnline) {
          try {
              const previewParam = isPreview ? '&preview=true' : '';
              const res = await retryOperation(() => fetch(`${API_URL}/exams?code=${code}&public=true${previewParam}&_t=${Date.now()}`));
              if (res.ok) {
                  const cloudExam = await res.json();
                  if (cloudExam) { 
                      if (!isPreview) {
                          allExams[cloudExam.code] = cloudExam; 
                          this.saveLocal(KEYS.EXAMS, allExams); 
                      }
                      exam = cloudExam;
                  }
              }
          } catch(e) {}
      }
      return exam ? sanitizeExamForStudent(exam) : null;
  }

  async saveExam(exam: Exam): Promise<void> {
    const exams = this.loadLocal<Record<string, Exam>>(KEYS.EXAMS) || {};
    const examToSave = { ...exam, isSynced: false, createdAt: String(exam.createdAt || new Date().toLocaleString()) };
    exams[exam.code] = examToSave;
    this.saveLocal(KEYS.EXAMS, exams);
    if (this.isOnline) {
        try {
            await retryOperation(() => fetch(`${API_URL}/exams`, { 
                method: 'POST', 
                headers: {'Content-Type':'application/json'}, 
                body: JSON.stringify(examToSave) 
            }));
            exams[exam.code].isSynced = true; 
            this.saveLocal(KEYS.EXAMS, exams);
        } catch (e) {}
    }
  }

  async deleteExam(code: string): Promise<void> {
      const exams = this.loadLocal<Record<string, Exam>>(KEYS.EXAMS) || {};
      delete exams[code];
      this.saveLocal(KEYS.EXAMS, exams);
      if (this.isOnline) {
          try { await retryOperation(() => fetch(`${API_URL}/exams?code=${code}`, { method: 'DELETE' })); } catch (e) {}
      }
  }

  async getResults(examCode?: string, className?: string, headers: Record<string, string> = {}): Promise<Result[]> {
    if (this.isOnline) {
        try {
            const queryParts = [];
            if (examCode) queryParts.push(`code=${examCode}`);
            if (className && className !== 'ALL') queryParts.push(`class=${encodeURIComponent(className)}`);
            const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
            const response = await retryOperation(() => fetch(`${API_URL}/results${queryString}`, { headers: headers as any }));
            if (response.ok) return await response.json();
        } catch (e) {}
    }
    return [];
  }

  async submitExamResult(resultPayload: any): Promise<any> {
    if (this.isOnline) {
        try {
            const res = await fetch(`${API_URL}/submit-exam`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(resultPayload)
            });
            if (res.ok) return await res.json();
        } catch (e) {}
    }
    return { ...resultPayload, isSynced: false };
  }

  private loadLocal<T>(key: string): T | null { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } }
  private saveLocal(key: string, data: any): void { try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) {} }
  async syncData() {}
  async getStudentResult(a:any, b:any) { return null; }
  async unlockStudentExam(a:any, b:any) {}
  async extendExamTime(a:any, b:any) {}
}

export const storageService = new StorageService();
