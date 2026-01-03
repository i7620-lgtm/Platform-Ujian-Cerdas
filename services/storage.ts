
import type { Exam, Result, Question, ResultStatus } from '../types';

// Constants for LocalStorage Keys
const KEYS = {
  EXAMS: 'app_exams_data',
  RESULTS: 'app_results_data',
};

// API Endpoints
const API_URL = (import.meta as any).env?.VITE_API_URL || '/api';

// Fisher-Yates shuffle
const shuffleArray = <T>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

// Helper Normalisasi Konsisten
const normalize = (str: any) => String(str || '').trim().toLowerCase().replace(/\s+/g, ' ');

// --- HELPER UNTUK MENGHAPUS KUNCI JAWABAN (SECURITY) ---
const sanitizeExamForStudent = (exam: Exam): Exam => {
    const sanitizedQuestions = exam.questions.map(q => {
        const { correctAnswer, trueFalseRows, matchingPairs, ...rest } = q;
        const sanitizedQ = { ...rest } as Question;
        
        if (trueFalseRows) {
            sanitizedQ.trueFalseRows = trueFalseRows.map(row => ({
                text: row.text,
                answer: false // Dummy value
            })) as any; 
        }

        if (matchingPairs && Array.isArray(matchingPairs)) {
            // Keep the right options but break the association by shuffling
            const rightValues = matchingPairs.map(p => p.right);
            const shuffledRights = shuffleArray(rightValues);

            sanitizedQ.matchingPairs = matchingPairs.map((pair, idx) => ({
                left: pair.left,
                right: shuffledRights[idx] 
            }));
        }
        return sanitizedQ;
    });

    return { ...exam, questions: sanitizedQuestions };
};

// --- GRADING LOGIC (MIRROR SERVER SIDE) ---
const gradeExam = (exam: Exam, answers: Record<string, string>): { score: number, correctCount: number } => {
    let correctCount = 0;
    
    exam.questions.forEach(q => {
        const studentAnswer = answers[q.id];
        
        if (studentAnswer === undefined || studentAnswer === null || studentAnswer === '') return;

        if (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'FILL_IN_THE_BLANK') {
            const correctAnswer = q.correctAnswer;
            if (!correctAnswer) return;

            // Handle Image Answers (Exact Match) vs Text (Normalized)
            if (correctAnswer.startsWith('data:image/')) {
                 if (studentAnswer === correctAnswer) correctCount++;
            } else {
                 if (normalize(studentAnswer) === normalize(correctAnswer)) correctCount++;
            }
        } 
        else if (q.questionType === 'TRUE_FALSE') {
            if (q.trueFalseRows) {
                 try {
                     const studentArr = JSON.parse(studentAnswer);
                     let allCorrect = true;
                     if (!Array.isArray(studentArr) || studentArr.length !== q.trueFalseRows.length) {
                         allCorrect = false;
                     } else {
                         for(let i=0; i < q.trueFalseRows.length; i++) {
                             if (studentArr[i] !== q.trueFalseRows[i].answer) {
                                 allCorrect = false; break;
                             }
                         }
                     }
                     if (allCorrect) correctCount++;
                 } catch(e) {}
            }
        } 
        else if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
            const correctAnswer = q.correctAnswer;
            if (!correctAnswer) return;
            
            let studentArr: string[] = [];
            try {
                studentArr = JSON.parse(studentAnswer);
                if (!Array.isArray(studentArr)) throw new Error("Not Array");
            } catch {
                studentArr = studentAnswer.split(',');
            }

            const tSet = new Set((correctAnswer || '').split(',').map(s => normalize(s)).filter(s => s !== ''));
            const sSet = new Set(studentArr.map(s => normalize(s)).filter(s => s !== ''));
            
            if (tSet.size === sSet.size && [...tSet].every(val => sSet.has(val))) {
                correctCount++;
            }
        } 
        else if (q.questionType === 'MATCHING' && q.matchingPairs) {
            try {
                const map = JSON.parse(studentAnswer);
                let allCorrect = true;
                for (let i = 0; i < q.matchingPairs.length; i++) {
                    const expectedRight = q.matchingPairs[i].right;
                    const studentRight = map[i]; // access by index key
                    if (normalize(studentRight) !== normalize(expectedRight)) {
                        allCorrect = false; break;
                    }
                }
                if (allCorrect) correctCount++;
            } catch (e) {}
        }
    });

    const scorableQuestions = exam.questions.filter(q => q.questionType !== 'ESSAY' && q.questionType !== 'INFO').length;
    const score = scorableQuestions > 0 ? Math.round((correctCount / scorableQuestions) * 100) : 0;
    return { score, correctCount };
};

// --- UTILITIES FOR RESILIENCE ---
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function retryOperation<T>(operation: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    try {
        return await operation();
    } catch (error) {
        if (retries <= 0) throw error;
        console.warn(`Operation failed, retrying in ${delay}ms... (${retries} retries left)`, error);
        await wait(delay);
        return retryOperation(operation, retries - 1, delay * 1.5); // Exponential backoff
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
          const merged = { ...localExams };
          cloudExams.forEach(exam => {
             merged[exam.code] = { ...exam, isSynced: true };
          });
          this.saveLocal(KEYS.EXAMS, merged);
          return merged;
        }
      } catch (e) {
        console.warn("Failed to fetch exams from cloud, using local data.");
      }
    }
    return localExams;
  }

  async getExamForStudent(code: string): Promise<Exam | null> {
      const allExams = this.loadLocal<Record<string, Exam>>(KEYS.EXAMS) || {};
      let exam = allExams[code];

      if (!exam && this.isOnline) {
          try {
              const response = await fetch(`${API_URL}/exams?code=${code}&public=true`);
              if (response.ok) {
                  exam = await response.json();
              }
          } catch(e) {
               console.warn("Failed to fetch public exam.");
          }
      }

      if (!exam) return null;
      return sanitizeExamForStudent(exam);
  }

  async saveExam(exam: Exam): Promise<void> {
    const exams = this.loadLocal<Record<string, Exam>>(KEYS.EXAMS) || {};
    
    const safeCreatedAt = exam.createdAt ? String(exam.createdAt) : new Date().toLocaleString('id-ID');

    const examToSave: Exam = { 
        ...exam, 
        isSynced: false, 
        createdAt: safeCreatedAt 
    };
    
    exams[exam.code] = examToSave;
    this.saveLocal(KEYS.EXAMS, exams);

    if (this.isOnline) {
        try {
            await retryOperation(async () => {
                const response = await fetch(`${API_URL}/exams`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(examToSave)
                });
                if (!response.ok) throw new Error("Server Error");
            }, 1, 500); 
            
            exams[exam.code].isSynced = true;
            this.saveLocal(KEYS.EXAMS, exams);
        } catch (e) {
            console.warn("Save failed, stored locally.");
        }
    }
  }

  // --- RESULTS ---
  async getResults(): Promise<Result[]> {
    let localResults = this.loadLocal<Result[]>(KEYS.RESULTS) || [];
    if (this.isOnline) {
        try {
            // FORCE NO-CACHE untuk memastikan kita mendapatkan status 'in_progress' terbaru dari guru
            const response = await fetch(`${API_URL}/results`, { cache: 'no-store' });
            if (response.ok) {
                const cloudResults: Result[] = await response.json();
                const combined = [...localResults];
                cloudResults.forEach(cRes => {
                    const idx = combined.findIndex(lRes => 
                        lRes.examCode === cRes.examCode && lRes.student.studentId === cRes.student.studentId
                    );
                    if (idx === -1) {
                        combined.push({ ...cRes, isSynced: true });
                    } else {
                        // Priority to Cloud Data (Teacher's update wins locally too)
                        combined[idx] = { ...cRes, isSynced: true };
                    }
                });
                this.saveLocal(KEYS.RESULTS, combined);
                return combined;
            }
        } catch (e) { console.warn("Failed to fetch results from cloud."); }
    }
    return localResults;
  }

  async getStudentResult(examCode: string, studentId: string): Promise<Result | undefined> {
    const localResults = this.loadLocal<Result[]>(KEYS.RESULTS) || [];
    let result = localResults.find(r => r.examCode === examCode && r.student.studentId === studentId);

    // If local result is 'force_submitted', ALWAYS try to fetch fresh data to see if teacher unlocked it
    if ((!result || result.status === 'force_submitted') && this.isOnline) {
        try {
            const allCloudResults = await this.getResults(); 
            result = allCloudResults.find(r => r.examCode === examCode && r.student.studentId === studentId);
        } catch (e) {}
    }
    return result;
  }

  async submitExamResult(resultPayload: Omit<Result, 'score' | 'correctAnswers'>): Promise<Result> {
    // --- READ-ONLY GUARD (THE FIX) ---
    // Cek status lokal saat ini. Jika 'force_submitted', kita BLOKIR semua pengiriman data (Write)
    // KECUALI payload yang mau dikirim bertujuan mengubah status menjadi 'in_progress' (Resume).
    // Ini mencegah "Zombie Packet" dari interval auto-save atau retry logic.
    const allResults = this.loadLocal<Result[]>(KEYS.RESULTS) || [];
    const currentLocal = allResults.find(r => r.examCode === resultPayload.examCode && r.student.studentId === resultPayload.student.studentId);
    
    if (currentLocal && currentLocal.status === 'force_submitted') {
        // Jika sedang terkunci, TOLAK pengiriman jika payload bukan upaya pembukaan kunci ('in_progress')
        if (resultPayload.status !== 'in_progress') {
            console.log("Write blocked by Client Guard: Exam is locked.");
            return currentLocal; // Return existing locked state, do nothing.
        }
    }
    // ---------------------------------

    if (this.isOnline) {
        try {
            const response = await fetch(`${API_URL}/submit-exam`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(resultPayload)
            });
            
            if (response.ok) {
                const gradedResult: Result = await response.json();
                this.saveResultLocal(gradedResult, true); 
                return gradedResult;
            }
        } catch (e) {
            console.warn("Online submission failed, falling back to offline.");
        }
    }

    // Offline Logic
    const allExams = this.loadLocal<Record<string, Exam>>(KEYS.EXAMS) || {};
    const fullExam = allExams[resultPayload.examCode];
    const status = resultPayload.status;

    let gradedResult: Result;
    if (fullExam && fullExam.questions.length > 0) {
        const { score, correctCount } = gradeExam(fullExam, resultPayload.answers);
        gradedResult = {
            ...resultPayload,
            score,
            correctAnswers: correctCount,
            status: status ? (status as ResultStatus) : 'completed',
            isSynced: false,
            timestamp: Date.now()
        };
    } else {
        gradedResult = {
            ...resultPayload,
            score: 0,
            correctAnswers: 0,
            status: status ? (status as ResultStatus) : 'pending_grading',
            isSynced: false,
            timestamp: Date.now()
        };
    }

    this.saveResultLocal(gradedResult, false);
    return gradedResult;
  }

  private saveResultLocal(result: Result, isSynced: boolean) {
      const results = this.loadLocal<Result[]>(KEYS.RESULTS) || [];
      const filtered = results.filter(r => !(r.examCode === result.examCode && r.student.studentId === result.student.studentId));
      const toSave = { ...result, isSynced };
      this.saveLocal(KEYS.RESULTS, [...filtered, toSave]);
  }

  async saveResult(result: Result): Promise<void> {
      this.saveResultLocal(result, false);
      this.syncData();
  }

  async unlockStudentExam(examCode: string, studentId: string): Promise<void> {
      const results = this.loadLocal<Result[]>(KEYS.RESULTS) || [];
      const index = results.findIndex(r => r.examCode === examCode && r.student.studentId === studentId);
      
      if (index !== -1) {
          const now = Date.now();
          results[index].status = 'in_progress' as ResultStatus;
          results[index].activityLog?.push(`[Guru] Mengizinkan melanjutkan ujian.`);
          results[index].timestamp = now; 
          
          this.saveLocal(KEYS.RESULTS, results);

          if (this.isOnline) {
             try { 
                 await fetch(`${API_URL}/submit-exam`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(results[index])
                 });
                 results[index].isSynced = true;
                 this.saveLocal(KEYS.RESULTS, results);
             } catch (e) {
                 console.error("Unlock push failed, queued for sync.");
             }
          }
      }
  }

  async syncData() {
    if (!this.isOnline) return;

    const results = this.loadLocal<Result[]>(KEYS.RESULTS) || [];
    // Filter out forced_submitted from sync loop to prevent re-locking unless necessary
    // Only sync if NOT force_submitted OR if we are forcing an unlock
    const pendingResults = results.filter(r => !r.isSynced);
    let resultsUpdated = false;

    for (const res of pendingResults) {
         // GUARD: Double check inside sync loop too
         if (res.status === 'force_submitted') {
             // Skip syncing "locked" status repeatedly. Only send it once (handled by submitExamResult).
             // This prevents the sync loop from becoming a Zombie generator.
             continue; 
         }

         try {
             const response = await fetch(`${API_URL}/submit-exam`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(res)
            });
            
            if (response.ok) {
                if (res.status === 'pending_grading') {
                    const graded: Result = await response.json();
                    const idx = results.findIndex(r => r.examCode === res.examCode && r.student.studentId === res.student.studentId);
                    if (idx !== -1) results[idx] = { ...graded, isSynced: true };
                } else {
                    res.isSynced = true;
                }
                resultsUpdated = true;
            }
        } catch (e) {}
    }
    if (resultsUpdated) this.saveLocal(KEYS.RESULTS, results);
  }

  private loadLocal<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (e) { return null; }
  }

  private saveLocal(key: string, data: any): void {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) {}
  }
}

export const storageService = new StorageService();
