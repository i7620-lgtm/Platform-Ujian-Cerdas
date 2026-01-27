
import type { Exam, Result, Question, ResultStatus } from '../types';

const KEYS = { EXAMS: 'app_exams_data', RESULTS: 'app_results_data' };
const API_URL = (import.meta as any).env?.VITE_API_URL || '/api';

// --- UTILITY FUNCTIONS ---
const normalize = (str: any) => String(str || '').trim().toLowerCase().replace(/\s+/g, ' ');

async function retryOperation<T>(operation: () => Promise<T>, retries = 2, delay = 1000): Promise<T> {
    try { 
        return await operation(); 
    } catch (error) {
        if (retries <= 0) throw error;
        await new Promise(r => setTimeout(r, delay));
        return retryOperation(operation, retries - 1, delay * 1.5);
    }
}

const gradeExam = (exam: Exam, answers: Record<string, string>) => {
    let correctCount = 0;
    const questions = exam.questions;
    
    questions.forEach((q: any) => {
        const studentAnswer = answers[q.id];
        if (studentAnswer === undefined || studentAnswer === null || studentAnswer === '') return;

        if (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'FILL_IN_THE_BLANK') {
             if (q.correctAnswer && normalize(studentAnswer) === normalize(q.correctAnswer)) correctCount++;
        } 
        else if (q.questionType === 'TRUE_FALSE' && q.trueFalseRows) {
             try {
                 const studentArr = JSON.parse(studentAnswer);
                 let allCorrect = true;
                 if (!Array.isArray(studentArr) || studentArr.length !== q.trueFalseRows.length) allCorrect = false;
                 else {
                     for(let i=0; i < q.trueFalseRows.length; i++) {
                         if (studentArr[i] !== q.trueFalseRows[i].answer) { allCorrect = false; break; }
                     }
                 }
                 if (allCorrect) correctCount++;
             } catch(e) {}
        }
        else if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
            let sArr: string[] = [];
            try { sArr = JSON.parse(studentAnswer); } catch { sArr = String(studentAnswer).split(','); }
            const tArrRaw = String(q.correctAnswer || '').split(',');
            const tSet = new Set(tArrRaw.map((s: string) => normalize(s)).filter((s: string) => s !== ''));
            const sSet = new Set(sArr.map((s: string) => normalize(s)).filter((s: string) => s !== ''));
            if (tSet.size === sSet.size && [...tSet].every((val: string) => sSet.has(val))) correctCount++;
        }
        else if (q.questionType === 'MATCHING' && q.matchingPairs) {
            try {
                const map = JSON.parse(studentAnswer);
                let allCorrect = true;
                for (let i = 0; i < q.matchingPairs.length; i++) {
                    if (normalize(map[i]) !== normalize(q.matchingPairs[i].right)) { allCorrect = false; break; }
                }
                if (allCorrect) correctCount++;
            } catch (e) {}
        }
    });

    const scorableQuestions = questions.filter((q: any) => q.questionType !== 'INFO');
    const scorable = scorableQuestions.filter((q: any) => q.questionType !== 'ESSAY').length;
    const score = scorable > 0 ? Math.round((correctCount / scorable) * 100) : 0;
    
    return { score, correctCount };
};

const sanitizeExamForStudent = (exam: Exam): Exam => {
    const sanitizedQuestions = exam.questions.map(q => {
        const { correctAnswer, trueFalseRows, matchingPairs, ...rest } = q;
        const sanitizedQ = { ...rest } as Question;
        if (trueFalseRows) {
            sanitizedQ.trueFalseRows = trueFalseRows.map(r => ({ text: r.text, answer: false })) as any;
        }
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
  async getExams(): Promise<Record<string, Exam>> {
    let localExams = this.loadLocal<Record<string, Exam>>(KEYS.EXAMS) || {};
    if (this.isOnline) {
      try {
        const response = await retryOperation(() => fetch(`${API_URL}/exams`));
        if (response.ok) {
          const cloudExams: Exam[] = await response.json();
          cloudExams.forEach(exam => { localExams[exam.code] = { ...exam, isSynced: true }; });
          this.saveLocal(KEYS.EXAMS, localExams);
        }
      } catch (e) { console.warn("Offline/Network Error getting exams, using local cache."); }
    }
    return localExams;
  }

  async getExamForStudent(code: string, isPreview = false): Promise<Exam | null> {
      const allExams = this.loadLocal<Record<string, Exam>>(KEYS.EXAMS) || {};
      let exam = allExams[code];
      let isPoisoned = false;
      if (exam && exam.questions) {
          isPoisoned = exam.questions.some(q => 
              q.questionType === 'MATCHING' && 
              q.matchingPairs && 
              q.matchingPairs.some(p => p.right === '?')
          );
      }

      if (this.isOnline) {
          if (!exam || isPoisoned || isPreview || true) { 
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
              } catch(e) { console.warn("Failed to fetch exam from cloud, checking local..."); }
          }
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
        } catch (e) { console.warn("Save exam offline."); }
    }
  }

  async deleteExam(code: string): Promise<void> {
      const exams = this.loadLocal<Record<string, Exam>>(KEYS.EXAMS) || {};
      delete exams[code];
      this.saveLocal(KEYS.EXAMS, exams);
      if (this.isOnline) {
          try {
              await retryOperation(() => fetch(`${API_URL}/exams?code=${code}`, {
                  method: 'DELETE'
              }));
          } catch (e) { console.warn("Failed to delete exam from cloud"); }
      }
  }

  // --- RESULTS (UPDATED FOR SHARDING) ---
  
  // Method ini sekarang mendukung parameter className untuk mengambil data dari shard tertentu
  async getResults(examCode?: string, className?: string, headers: Record<string, string> = {}): Promise<Result[]> {
    let localResults = this.loadLocal<Result[]>(KEYS.RESULTS) || [];
    
    if (this.isOnline) {
        try {
            // Optimization: If className is provided, backend will only read that specific sheet
            const queryParts = [];
            if (examCode) queryParts.push(`code=${examCode}`);
            if (className && className !== 'ALL') queryParts.push(`class=${encodeURIComponent(className)}`);
            
            const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
            
            const response = await retryOperation(() => fetch(`${API_URL}/results${queryString}`, { 
                headers: headers as any, 
                cache: 'no-store' 
            }));
            
            if (response.ok) {
                const cloudResults: Result[] = await response.json();
                
                // Merge logic (Simple replace for now to support streaming updates)
                // Note: In sharding mode, local caching needs to be careful not to overwrite mixed classes incorrectly
                // For simplicity in teacher dashboard, we might rely purely on server state for monitored class.
                
                // Only merge to local storage if we are fetching EVERYTHING or specific student
                // For teacher monitoring specific class, we might just return the data without polluting global cache
                if (!className) {
                     const combined = [...localResults];
                     cloudResults.forEach(cRes => {
                        const idx = combined.findIndex(l => l.examCode === cRes.examCode && l.student.studentId === cRes.student.studentId);
                        if (idx === -1) combined.push({ ...cRes, isSynced: true });
                        else if ((cRes.timestamp || 0) > (combined[idx].timestamp || 0)) combined[idx] = { ...cRes, isSynced: true };
                     });
                     this.saveLocal(KEYS.RESULTS, combined);
                     if (examCode) return combined.filter(r => r.examCode === examCode);
                     return combined;
                }
                
                return cloudResults;
            }
        } catch (e) { console.warn("Offline fetching results"); }
    }
    
    // Offline Fallback
    let filtered = localResults;
    if (examCode) filtered = filtered.filter(r => r.examCode === examCode);
    if (className && className !== 'ALL') filtered = filtered.filter(r => r.student.class === className);
    return filtered;
  }

  async getStudentResult(examCode: string, studentId: string): Promise<Result | undefined> {
    const localResults = this.loadLocal<Result[]>(KEYS.RESULTS) || [];
    let result = localResults.find(r => r.examCode === examCode && r.student.studentId === studentId);
    // Student side fetch does not need class sharding generally, or we infer it
    if ((!result || result.status === 'force_submitted') && this.isOnline) {
        try {
            // Student doesn't know their class shard easily here without logging in, 
            // but usually this is called after login. 
            // We'll fallback to global fetch for single student check which is fast enough or handled by backend logic
            const all = await this.getResults(examCode); 
            result = all.find(r => r.examCode === examCode && r.student.studentId === studentId);
        } catch (e) {}
    }
    return result;
  }

  async submitExamResult(resultPayload: Omit<Result, 'score' | 'correctAnswers'>): Promise<Result> {
    if (!resultPayload.timestamp) resultPayload.timestamp = Date.now();

    if (this.isOnline) {
        try {
            const response = await retryOperation(() => fetch(`${API_URL}/submit-exam`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(resultPayload)
            }));
            
            if (response.ok) {
                const serverRes: Result = await response.json();
                this.saveResultLocal(serverRes, true);
                return serverRes;
            }
        } catch (e) { console.warn("Submit failed, falling back to offline grading."); }
    }

    const allExams = this.loadLocal<Record<string, Exam>>(KEYS.EXAMS) || {};
    const exam = allExams[resultPayload.examCode];
    let grading = { score: 0, correctCount: 0 };
    if (exam) grading = gradeExam(exam, resultPayload.answers);

    const result: Result = { 
        ...resultPayload, 
        score: grading.score, 
        correctAnswers: grading.correctCount, 
        status: resultPayload.status as ResultStatus, 
        isSynced: false 
    };
    
    this.saveResultLocal(result, false);
    return result;
  }

  async unlockStudentExam(examCode: string, studentId: string): Promise<void> {
      // Unlock needs to know class to be efficient, but for now we search
      const results = this.loadLocal<Result[]>(KEYS.RESULTS) || [];
      const index = results.findIndex(r => r.examCode === examCode && r.student.studentId === studentId);
      
      if (index !== -1) {
          const updatedResult: Result = {
              ...results[index],
              status: 'in_progress', 
              activityLog: [...(results[index].activityLog || []), `[Guru] Membuka kunci akses ujian.`],
              timestamp: Date.now(),
              isSynced: false
          };
          results[index] = updatedResult;
          this.saveLocal(KEYS.RESULTS, results);

          if (this.isOnline) {
             try { 
                 await retryOperation(() => fetch(`${API_URL}/teacher-action`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        examCode, 
                        studentId, 
                        action: 'UNLOCK',
                        className: updatedResult.student.class // Hint for sharding
                    })
                 }));
             } catch (e) { console.error("Unlock sync failed", e); }
          }
      }
  }

  async extendExamTime(examCode: string, additionalMinutes: number): Promise<void> {
      if (!this.isOnline) throw new Error("Fitur ini membutuhkan koneksi internet.");
      await retryOperation(() => fetch(`${API_URL}/extend-time`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ examCode, additionalMinutes })
      }));
      // Update local cache optimistically
      const exams = this.loadLocal<Record<string, Exam>>(KEYS.EXAMS) || {};
      if (exams[examCode]) {
          exams[examCode].config.timeLimit += additionalMinutes;
          this.saveLocal(KEYS.EXAMS, exams);
      }
  }

  async syncData() {
    if (!this.isOnline) return;
    const results = this.loadLocal<Result[]>(KEYS.RESULTS) || [];
    const pending = results.filter(r => !r.isSynced);
    for (const res of pending) {
         try { await this.submitExamResult(res); } catch (e) {}
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
