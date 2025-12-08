
import type { Exam, Result, Question } from '../types';

// Constants for LocalStorage Keys
const KEYS = {
  EXAMS: 'app_exams_data',
  RESULTS: 'app_results_data',
};

// API Endpoints (These would be your Vercel Serverless Functions)
const API_URL = (import.meta as any).env?.VITE_API_URL || '/api';

// --- HELPER UNTUK MENGHAPUS KUNCI JAWABAN (SECURITY) ---
const sanitizeExamForStudent = (exam: Exam): Exam => {
    const sanitizedQuestions = exam.questions.map(q => {
        const { correctAnswer, trueFalseRows, matchingPairs, ...rest } = q;
        
        const sanitizedQ = { ...rest } as Question;
        
        // Remove answers from True/False matrix
        if (trueFalseRows) {
            sanitizedQ.trueFalseRows = trueFalseRows.map(row => ({
                text: row.text,
                answer: false // Dummy value or simply remove property type-wise if strict
            })) as any; // Cast to avoid TS error, in real API this field is just omitted
        }

        // Remove answers from Matching
        if (matchingPairs) {
            sanitizedQ.matchingPairs = matchingPairs.map(pair => ({
                left: pair.left,
                right: '' // Empty right side or shuffled options handled by frontend display logic
                // In a real secure backend, we might send 'optionsRight' as a separate shuffled array
            }));
        }

        // Note: For standard matching, we usually send { left: 'A', right: 'X' } but 'right' is the CORRECT pair.
        // For student, we should just send a list of Left items and a separate list of Right items to be shuffled.
        // For this hybrid mock, we keep the structure but empty the 'right' association if we want strict security,
        // BUT StudentExamPage relies on `matchingPairs[i].right` to display the dropdown options.
        // SO: Ideally we assume `matchingPairs` contains the Correct Mapping.
        // To secure it, we should NOT send the Correct Mapping.
        // We will send the list of rights separately? 
        // For Simplicity in this "Mock": We will keep matchingPairs logic in the component but in a REAL backend, 
        // you would send `itemsLeft` and `itemsRight` arrays separately.
        
        return sanitizedQ;
    });

    return {
        ...exam,
        questions: sanitizedQuestions
    };
};

// --- GRADING LOGIC (MOVED TO SERVICE TO SIMULATE BACKEND) ---
const gradeExam = (exam: Exam, answers: Record<string, string>): { score: number, correctCount: number } => {
    let correctCount = 0;
    
    exam.questions.forEach(q => {
        const studentAnswer = answers[q.id];
        
        if (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'FILL_IN_THE_BLANK') {
            const correctAnswer = q.correctAnswer;
            if (!studentAnswer || !correctAnswer) return;

            if (correctAnswer.startsWith('data:image/')) {
                 if (studentAnswer === correctAnswer) correctCount++;
            } else {
                 if (studentAnswer.toLowerCase() === correctAnswer.toLowerCase()) correctCount++;
            }
        } else if (q.questionType === 'TRUE_FALSE') {
            if (q.trueFalseRows) {
                 if (!studentAnswer) return;
                 try {
                     const studentArr = JSON.parse(studentAnswer);
                     let allCorrect = true;
                     if (!Array.isArray(studentArr) || studentArr.length !== q.trueFalseRows.length) return;
                     for(let i=0; i < q.trueFalseRows.length; i++) {
                         if (studentArr[i] !== q.trueFalseRows[i].answer) {
                             allCorrect = false;
                             break;
                         }
                     }
                     if (allCorrect) correctCount++;
                 } catch(e) {}
            } else {
                if (studentAnswer.toLowerCase() === q.correctAnswer?.toLowerCase()) correctCount++;
            }
        } else if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
            const correctAnswer = q.correctAnswer;
            if (!studentAnswer || !correctAnswer) return;
            const studentArr = studentAnswer.split(',').map(s => s.trim()).sort();
            const correctArr = correctAnswer.split(',').map(s => s.trim()).sort();
            if (JSON.stringify(studentArr) === JSON.stringify(correctArr)) correctCount++;
        } else if (q.questionType === 'MATCHING' && q.matchingPairs) {
            if (!studentAnswer) return;
            try {
                const map = JSON.parse(studentAnswer);
                let allCorrect = true;
                for (let i = 0; i < q.matchingPairs.length; i++) {
                    const expectedRight = q.matchingPairs[i].right;
                    const studentRight = map[i];
                    if (studentRight !== expectedRight) {
                        allCorrect = false;
                        break;
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


class StorageService {
  private isOnline: boolean = navigator.onLine;

  constructor() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncData();
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  // --- EXAMS ---

  // For Teacher: Get Full Data
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

  // For Student: Get Public Data (Sanitized)
  async getExamForStudent(code: string): Promise<Exam | null> {
      // 1. Try to get from local first (if student already downloaded it)
      // Note: In a real app, we might check if the local version is 'teacher version' or 'student version'.
      // Here we assume if it's in local, it might be the teacher's copy (full) or student cache.
      const allExams = this.loadLocal<Record<string, Exam>>(KEYS.EXAMS) || {};
      let exam = allExams[code];

      // 2. If not local, try online
      if (!exam && this.isOnline) {
          try {
              // In real Vercel backend: GET /api/exams/:code/public
              // This endpoint would return the sanitized JSON
              const response = await fetch(`${API_URL}/exams/${code}/public`);
              if (response.ok) {
                  exam = await response.json();
              }
          } catch(e) {
               console.warn("Failed to fetch public exam.");
          }
      }

      if (!exam) return null;

      // 3. SECURITY STEP: Always sanitize before returning to component
      // This ensures even if we loaded the Teacher's full version from LocalStorage,
      // the Student View never receives the answers in props.
      return sanitizeExamForStudent(exam);
  }

  async saveExam(exam: Exam): Promise<void> {
    const exams = this.loadLocal<Record<string, Exam>>(KEYS.EXAMS) || {};
    const examToSave = { ...exam, isSynced: false, createdAt: exam.createdAt || Date.now() };
    exams[exam.code] = examToSave;
    this.saveLocal(KEYS.EXAMS, exams);

    if (this.isOnline) {
        try {
            await fetch(`${API_URL}/exams`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(examToSave)
            });
            exams[exam.code].isSynced = true;
            this.saveLocal(KEYS.EXAMS, exams);
        } catch (e) {
            console.warn("Cloud save failed, data queued.");
        }
    }
  }

  // --- RESULTS & GRADING ---

  async getResults(): Promise<Result[]> {
    let localResults = this.loadLocal<Result[]>(KEYS.RESULTS) || [];
    if (this.isOnline) {
        try {
            const response = await fetch(`${API_URL}/results`);
            if (response.ok) {
                const cloudResults: Result[] = await response.json();
                const combined = [...localResults];
                cloudResults.forEach(cRes => {
                    const exists = combined.some(lRes => 
                        lRes.examCode === cRes.examCode && lRes.student.studentId === cRes.student.studentId
                    );
                    if (!exists) {
                        combined.push({ ...cRes, isSynced: true });
                    }
                });
                this.saveLocal(KEYS.RESULTS, combined);
                return combined;
            }
        } catch (e) { console.warn("Failed to fetch results from cloud."); }
    }
    return localResults;
  }

  // Submit Result from Student
  async submitExamResult(resultPayload: Omit<Result, 'score' | 'correctAnswers' | 'status'>): Promise<Result> {
    
    // 1. Try Online Grading first
    if (this.isOnline) {
        try {
            // POST /api/submit-exam
            // Backend will load the FULL exam, grade it, and return the scored result
            const response = await fetch(`${API_URL}/submit-exam`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(resultPayload)
            });
            
            if (response.ok) {
                const gradedResult: Result = await response.json();
                this.saveResultLocal(gradedResult, true); // Save the Graded version
                return gradedResult;
            }
        } catch (e) {
            console.warn("Online submission failed, falling back to offline.");
        }
    }

    // 2. Offline Mode
    // We CANNOT grade strictly offline because we don't have the keys (they were sanitized).
    // EXCEPT: If this device happens to be the Teacher's device (has full exam in localStorage), we could theoretically grade.
    // But for consistency: Student Mode Offline = Pending Grading.
    
    // Check if we happen to have the full exam locally (Teacher Device testing Student Mode)
    const allExams = this.loadLocal<Record<string, Exam>>(KEYS.EXAMS) || {};
    const fullExam = allExams[resultPayload.examCode];
    
    let gradedResult: Result;

    if (fullExam && fullExam.questions[0].correctAnswer) {
        // We have the keys locally! We can grade immediately (Teacher Mode / Insecure Mode)
        const { score, correctCount } = gradeExam(fullExam, resultPayload.answers);
        gradedResult = {
            ...resultPayload,
            score,
            correctAnswers: correctCount,
            status: 'completed',
            isSynced: false,
            timestamp: Date.now()
        };
    } else {
        // We do NOT have keys. Secure Student Mode.
        gradedResult = {
            ...resultPayload,
            score: 0, // Placeholder
            correctAnswers: 0, // Placeholder
            status: 'pending_grading', // MARKER
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
      // Direct save mainly for Teacher manual override or forced updates
      this.saveResultLocal(result, false);
      this.syncData();
  }

  // --- SYNC MECHANISM ---
  async syncData() {
    if (!this.isOnline) return;

    // 1. Sync Pending Exams (Teacher uploads)
    const exams = this.loadLocal<Record<string, Exam>>(KEYS.EXAMS) || {};
    const pendingExams = Object.values(exams).filter(e => !e.isSynced);
    for (const exam of pendingExams) {
        try {
            await fetch(`${API_URL}/exams`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(exam)
            });
            exams[exam.code].isSynced = true;
        } catch (e) {}
    }
    this.saveLocal(KEYS.EXAMS, exams);

    // 2. Sync Pending Results (Student submissions)
    const results = this.loadLocal<Result[]>(KEYS.RESULTS) || [];
    const pendingResults = results.filter(r => !r.isSynced);
    let resultsUpdated = false;

    for (const res of pendingResults) {
         try {
             // If it was pending grading, we submit for grading
             const endpoint = res.status === 'pending_grading' ? '/submit-exam' : '/results';
             
             const response = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(res)
            });
            
            if (response.ok) {
                if (res.status === 'pending_grading') {
                    // Update the local result with the graded one from server
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
