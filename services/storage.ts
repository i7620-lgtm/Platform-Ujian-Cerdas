
import type { Exam, Result, Question, ResultStatus } from '../types';

const KEYS = { EXAMS: 'app_exams_data', RESULTS: 'app_results_data' };
const API_URL = (import.meta as any).env?.VITE_API_URL || '/api';

const normalize = (str: any) => String(str || '').trim().toLowerCase().replace(/\s+/g, ' ');

const sanitizeExamForStudent = (exam: Exam): Exam => {
    // ... (kode sanitize tetap sama, dipersingkat untuk fokus pada perubahan logika) ...
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

const gradeExam = (exam: Exam, answers: Record<string, string>) => {
    // ... (grading logic offline tetap sama) ...
    return { score: 0, correctCount: 0 }; 
};

async function retryOperation<T>(operation: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    try { return await operation(); } 
    catch (error) {
        if (retries <= 0) throw error;
        await new Promise(r => setTimeout(r, delay));
        return retryOperation(operation, retries - 1, delay * 1.5);
    }
}

class StorageService {
  private isOnline: boolean = navigator.onLine;

  constructor() {
    window.addEventListener('online', () => { this.isOnline = true; });
    window.addEventListener('offline', () => { this.isOnline = false; });
  }

  // --- EXAMS ---
  async getExams(): Promise<Record<string, Exam>> {
    let localExams = this.loadLocal<Record<string, Exam>>(KEYS.EXAMS) || {};
    if (this.isOnline) {
      try {
        const response = await fetch(`${API_URL}/exams`);
        if (response.ok) {
          const cloudExams: Exam[] = await response.json();
          cloudExams.forEach(exam => { localExams[exam.code] = { ...exam, isSynced: true }; });
          this.saveLocal(KEYS.EXAMS, localExams);
        }
      } catch (e) {}
    }
    return localExams;
  }

  async getExamForStudent(code: string): Promise<Exam | null> {
      const allExams = this.loadLocal<Record<string, Exam>>(KEYS.EXAMS) || {};
      let exam = allExams[code];
      if (this.isOnline) {
          try {
              const res = await fetch(`${API_URL}/exams?code=${code}&public=true`);
              if (res.ok) {
                  exam = await res.json();
                  if (exam) { allExams[exam.code] = exam; this.saveLocal(KEYS.EXAMS, allExams); }
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
            await fetch(`${API_URL}/exams`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(examToSave) });
            exams[exam.code].isSynced = true; 
            this.saveLocal(KEYS.EXAMS, exams);
        } catch (e) {}
    }
  }

  // --- RESULTS ---
  async getResults(): Promise<Result[]> {
    let localResults = this.loadLocal<Result[]>(KEYS.RESULTS) || [];
    if (this.isOnline) {
        try {
            const response = await fetch(`${API_URL}/results`, { cache: 'no-store' });
            if (response.ok) {
                const cloudResults: Result[] = await response.json();
                
                // MERGE STRATEGY: Server Authority
                // Kita akan mengganti data lokal dengan data cloud JIKA status cloud berbeda
                // khususnya jika cloud 'in_progress' sedangkan lokal 'force_submitted'.
                const combined = [...localResults];
                
                cloudResults.forEach(cRes => {
                    const idx = combined.findIndex(l => l.examCode === cRes.examCode && l.student.studentId === cRes.student.studentId);
                    
                    if (idx === -1) {
                        combined.push({ ...cRes, isSynced: true });
                    } else {
                        const local = combined[idx];
                        
                        // CRITICAL: Jika Server = in_progress, Klien WAJIB in_progress
                        if (cRes.status === 'in_progress' && local.status === 'force_submitted') {
                            combined[idx] = { ...cRes, isSynced: true };
                        } 
                        // Jika tidak konflik status, ambil yang timestamp lebih baru
                        else if ((cRes.timestamp || 0) > (local.timestamp || 0)) {
                            combined[idx] = { ...cRes, isSynced: true };
                        }
                    }
                });
                
                this.saveLocal(KEYS.RESULTS, combined);
                return combined;
            }
        } catch (e) {}
    }
    return localResults;
  }

  async getStudentResult(examCode: string, studentId: string): Promise<Result | undefined> {
    const localResults = this.loadLocal<Result[]>(KEYS.RESULTS) || [];
    let result = localResults.find(r => r.examCode === examCode && r.student.studentId === studentId);
    if ((!result || result.status === 'force_submitted') && this.isOnline) {
        try {
            const all = await this.getResults(); 
            result = all.find(r => r.examCode === examCode && r.student.studentId === studentId);
        } catch (e) {}
    }
    return result;
  }

  async submitExamResult(resultPayload: Omit<Result, 'score' | 'correctAnswers'>): Promise<Result> {
    if (!resultPayload.timestamp) resultPayload.timestamp = Date.now();

    if (this.isOnline) {
        try {
            const response = await fetch(`${API_URL}/submit-exam`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(resultPayload)
            });
            if (response.ok) {
                const serverRes: Result = await response.json();
                
                // CRITICAL: Jika kita kirim force_submitted TAPI server membalas dengan in_progress,
                // Berarti paket kita ditolak (Zombie Packet). Kita harus update lokal ke in_progress.
                if (resultPayload.status === 'force_submitted' && serverRes.status === 'in_progress') {
                    console.log("Server rejected lock request. Unlocking client...");
                }

                this.saveResultLocal(serverRes, true);
                return serverRes;
            }
        } catch (e) {}
    }

    // Fallback Offline
    const result = { ...resultPayload, score: 0, correctAnswers: 0, status: resultPayload.status as ResultStatus, isSynced: false };
    this.saveResultLocal(result, false);
    return result;
  }

  async unlockStudentExam(examCode: string, studentId: string): Promise<void> {
      const results = this.loadLocal<Result[]>(KEYS.RESULTS) || [];
      const index = results.findIndex(r => r.examCode === examCode && r.student.studentId === studentId);
      
      if (index !== -1) {
          const now = Date.now();
          const updatedResult: Result = {
              ...results[index],
              status: 'in_progress', // FORCE STATUS
              activityLog: [...(results[index].activityLog || []), `[Guru] Membuka kunci ujian.`],
              timestamp: now,
              isSynced: false,
              unlockedByTeacher: true // TAMBAHKAN FLAG OTORITAS
          };

          // 1. Update UI Lokal segera (Optimistik)
          results[index] = updatedResult;
          this.saveLocal(KEYS.RESULTS, results);

          // 2. Kirim ke Server
          if (this.isOnline) {
             try { 
                 const response = await fetch(`${API_URL}/submit-exam`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedResult)
                 });
                 if (response.ok) {
                     const serverRes = await response.json();
                     // Merge balik data server, TAPI pertahankan status in_progress jika server masih nge-lag
                     results[index] = { ...serverRes, isSynced: true, status: 'in_progress' }; 
                     this.saveLocal(KEYS.RESULTS, results);
                 }
             } catch (e) { console.error("Unlock sync failed", e); }
          }
      }
  }

  async syncData() {
    if (!this.isOnline) return;
    const results = this.loadLocal<Result[]>(KEYS.RESULTS) || [];
    const pending = results.filter(r => !r.isSynced);

    for (const res of pending) {
         try {
             await this.submitExamResult(res);
        } catch (e) {}
    }
  }

  private loadLocal<T>(key: string): T | null {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
  }

  private saveLocal(key: string, data: any): void {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) {}
  }

  private saveResultLocal(result: Result, isSynced: boolean) {
      const results = this.loadLocal<Result[]>(KEYS.RESULTS) || [];
      const filtered = results.filter(r => !(r.examCode === result.examCode && r.student.studentId === result.student.studentId));
      this.saveLocal(KEYS.RESULTS, [...filtered, { ...result, isSynced }]);
  }
}

export const storageService = new StorageService();
