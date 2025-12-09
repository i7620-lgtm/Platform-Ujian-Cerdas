
import type { Exam, Result, Question } from '../types';

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

// --- GRADING LOGIC ---
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
                             allCorrect = false; break;
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
    const examToSave = { ...exam, isSynced: false, createdAt: exam.createdAt || Date.now() };
    exams[exam.code] = examToSave;
    this.saveLocal(KEYS.EXAMS, exams);

    if (this.isOnline) {
        try {
            // STEP 1: Separate Skeleton and Images
            const skeletonExam = JSON.parse(JSON.stringify(examToSave));
            const imageQueue: Array<{qId: string, imageUrl?: string, optionImages?: (string|null)[]}> = [];

            if (Array.isArray(skeletonExam.questions)) {
                skeletonExam.questions.forEach((q: any) => {
                    let hasImage = false;
                    if (q.imageUrl && q.imageUrl.startsWith('data:image/')) hasImage = true;
                    if (q.optionImages && q.optionImages.some((img: string) => img && img.startsWith('data:image/'))) hasImage = true;

                    if (hasImage) {
                        imageQueue.push({ qId: q.id, imageUrl: q.imageUrl, optionImages: q.optionImages });
                        delete q.imageUrl;
                        delete q.optionImages;
                    }
                });
            }

            // STEP 2: Send Skeleton with Retry Logic
            // This is crucial for waking up sleeping databases
            await retryOperation(async () => {
                const skelResponse = await fetch(`${API_URL}/exams`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(skeletonExam)
                });

                if (!skelResponse.ok) {
                    const errText = await skelResponse.text();
                    throw new Error(`Failed to save exam skeleton: ${skelResponse.status} ${errText}`);
                }
            }, 3, 2000); // Retry 3 times, start with 2s delay

            // STEP 3: Stitch Images in Batches (Chunking)
            // Sending too many parallel requests kills serverless connections.
            // We limit concurrency to 2 parallel requests.
            if (imageQueue.length > 0) {
                console.log(`Uploading ${imageQueue.length} image sets in batches...`);
                
                const BATCH_SIZE = 2;
                for (let i = 0; i < imageQueue.length; i += BATCH_SIZE) {
                    const batch = imageQueue.slice(i, i + BATCH_SIZE);
                    await Promise.all(batch.map(item => 
                        retryOperation(async () => {
                             await fetch(`${API_URL}/exams`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    code: exam.code,
                                    questionId: item.qId,
                                    imageUrl: item.imageUrl,
                                    optionImages: item.optionImages
                                })
                            });
                        }, 2, 1000)
                    ));
                }
            }

            // Update sync status on successful save
            exams[exam.code].isSynced = true;
            this.saveLocal(KEYS.EXAMS, exams);
            console.log("Exam synced successfully.");

        } catch (e) {
            console.error("Cloud save failed:", e);
            // Don't throw, just log. The user has local data anyway.
        }
    }
  }

  // --- RESULTS ---
  async getResults(): Promise<Result[]> {
    let localResults = this.loadLocal<Result[]>(KEYS.RESULTS) || [];
    if (this.isOnline) {
        try {
            const response = await fetch(`${API_URL}/results`);
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

    if (!result && this.isOnline) {
        try {
            const allCloudResults = await this.getResults(); 
            result = allCloudResults.find(r => r.examCode === examCode && r.student.studentId === studentId);
        } catch (e) {}
    }
    return result;
  }

  async submitExamResult(resultPayload: Omit<Result, 'score' | 'correctAnswers' | 'status'>): Promise<Result> {
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
            } else {
                console.error("Submit failed:", await response.text());
            }
        } catch (e) {
            console.warn("Online submission failed, falling back to offline.");
        }
    }

    const allExams = this.loadLocal<Record<string, Exam>>(KEYS.EXAMS) || {};
    const fullExam = allExams[resultPayload.examCode];
    
    let gradedResult: Result;
    if (fullExam && fullExam.questions.length > 0) {
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
        gradedResult = {
            ...resultPayload,
            score: 0,
            correctAnswers: 0,
            status: 'pending_grading',
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

  async syncData() {
    if (!this.isOnline) return;

    const exams = this.loadLocal<Record<string, Exam>>(KEYS.EXAMS) || {};
    const pendingExams = Object.values(exams).filter(e => !e.isSynced);
    
    // Process exams sequentially for sync
    for (const exam of pendingExams) {
        try { await this.saveExam(exam); } catch (e) {}
    }
    // Reload from local to get updated isSynced status from saveExam calls
    this.saveLocal(KEYS.EXAMS, exams);

    const results = this.loadLocal<Result[]>(KEYS.RESULTS) || [];
    const pendingResults = results.filter(r => !r.isSynced);
    let resultsUpdated = false;

    for (const res of pendingResults) {
         try {
             const endpoint = res.status === 'pending_grading' ? '/submit-exam' : '/results';
             const response = await fetch(`${API_URL}${endpoint}`, {
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
