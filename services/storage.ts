
import type { Exam, Result, Question } from '../types';

const KEYS = { EXAMS: 'app_exams_data', RESULTS: 'app_results_data' };
const API_URL = (import.meta as any).env?.VITE_API_URL || '/api';

async function retryOperation<T>(operation: () => Promise<T>, retries = 2, delay = 1000): Promise<T> {
    try { return await operation(); } catch (error) {
        if (retries <= 0) throw error;
        await new Promise(r => setTimeout(r, delay));
        return retryOperation(operation, retries - 1, delay * 1.5);
    }
}

// Helper shuffle array (Fisher-Yates)
const shuffleArray = <T>(array: T[]): T[] => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
};

const sanitizeExamForStudent = (exam: Exam): Exam => {
    let questionsToProcess = [...exam.questions];

    if (exam.config.shuffleQuestions) {
        questionsToProcess = shuffleArray(questionsToProcess);
    }

    const sanitizedQuestions = questionsToProcess.map(q => {
        const { correctAnswer, trueFalseRows, matchingPairs, options, ...rest } = q;
        const sanitizedQ = { ...rest, options: options ? [...options] : undefined } as Question;

        if (exam.config.shuffleAnswers) {
            if (sanitizedQ.questionType === 'MULTIPLE_CHOICE' || sanitizedQ.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
                if (sanitizedQ.options && sanitizedQ.options.length > 0) {
                    sanitizedQ.options = shuffleArray(sanitizedQ.options);
                }
            }
        }

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

  async getExams(headers: Record<string, string> = {}): Promise<Record<string, Exam>> {
    let localExams = this.loadLocal<Record<string, Exam>>(KEYS.EXAMS) || {};
    const requesterId = headers['x-user-id'];
    const requesterRole = headers['x-role'];
    const requesterSchool = headers['x-school'];

    if (this.isOnline) {
      try {
        const response = await retryOperation(() => fetch(`${API_URL}/exams`, { headers: headers as any }));
        if (response.ok) {
          const cloudExams: Exam[] = await response.json();
          
          // Sinkronisasi data cloud ke local
          cloudExams.forEach(exam => { 
              localExams[exam.code] = { ...exam, isSynced: true }; 
          });
          this.saveLocal(KEYS.EXAMS, localExams);

          // Kembalikan HANYA apa yang dikirim cloud (karena cloud sudah melakukan filtering)
          // Ini mencegah data "nyangkut" dari login guru sebelumnya di localStorage yang sama
          const filteredMap: Record<string, Exam> = {};
          cloudExams.forEach(e => { filteredMap[e.code] = e; });
          return filteredMap;
        }
      } catch (e) { 
          console.warn("Sync failed, fallback to local filtering."); 
      }
    }

    // Jika offline, lakukan pemfilteran manual di client agar tetap aman
    const filteredLocal: Record<string, Exam> = {};
    Object.values(localExams).forEach(exam => {
        let isMatch = false;
        if (requesterRole === 'super_admin') {
            isMatch = true;
        } else if (requesterRole === 'admin') {
            isMatch = (exam.authorSchool || '').toLowerCase() === (requesterSchool || '').toLowerCase();
        } else {
            isMatch = String(exam.authorId) === String(requesterId);
        }

        if (isMatch) filteredLocal[exam.code] = exam;
    });

    return filteredLocal;
  }

  async getExamForStudent(code: string, isPreview = false): Promise<Exam | null> {
      const allExams = this.loadLocal<Record<string, Exam>>(KEYS.EXAMS) || {};
      let exam = allExams[code];
      
      if (this.isOnline) {
          const previewParam = isPreview ? '&preview=true' : '';
          const res = await fetch(`${API_URL}/exams?code=${code}&public=true${previewParam}`);
          
          if (res.status === 403) throw new Error("EXAM_IS_DRAFT");
          if (res.status === 404) throw new Error("EXAM_NOT_FOUND");
          
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
      }
      return exam ? sanitizeExamForStudent(exam) : null;
  }

  async saveExam(exam: Exam, headers: Record<string, string> = {}): Promise<void> {
    const exams = this.loadLocal<Record<string, Exam>>(KEYS.EXAMS) || {};
    const examToSave = { ...exam, isSynced: false, createdAt: String(exam.createdAt || new Date().toLocaleString()) };
    exams[exam.code] = examToSave;
    this.saveLocal(KEYS.EXAMS, exams);
    
    if (this.isOnline) {
        try {
            const res = await retryOperation(() => fetch(`${API_URL}/exams`, { 
                method: 'POST', 
                headers: { 'Content-Type':'application/json', ...headers }, 
                body: JSON.stringify(examToSave) 
            }));
            if (res.ok) {
                exams[exam.code].isSynced = true; 
                this.saveLocal(KEYS.EXAMS, exams);
            }
        } catch (e) { console.error("Network error saving exam:", e); }
    }
  }

  async deleteExam(code: string, headers: Record<string, string> = {}): Promise<void> {
      const exams = this.loadLocal<Record<string, Exam>>(KEYS.EXAMS) || {};
      delete exams[code];
      this.saveLocal(KEYS.EXAMS, exams);
      if (this.isOnline) {
          try { await fetch(`${API_URL}/exams?code=${code}`, { 
              method: 'DELETE',
              headers: headers as any
          }); } catch (e) {}
      }
  }

  async getResults(examCode?: string, className?: string, headers: Record<string, string> = {}): Promise<Result[]> {
    if (this.isOnline) {
        try {
            const queryParts = [];
            if (examCode) queryParts.push(`code=${examCode}`);
            if (className && className !== 'ALL') queryParts.push(`class=${encodeURIComponent(className)}`);
            const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
            const response = await fetch(`${API_URL}/results${queryString}`, { headers: headers as any });
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
  
  async syncData() { }

  async getStudentResult(examCode: string, studentId: string): Promise<Result | null> {
      if (this.isOnline) {
          try {
              const res = await fetch(`${API_URL}/results?code=${examCode}&studentId=${studentId}`);
              if (res.ok) {
                  const data = await res.json();
                  return Array.isArray(data) ? data[0] : data;
              }
          } catch(e) {}
      }
      return null;
  }

  async unlockStudentExam(examCode: string, studentId: string): Promise<void> {
      if (this.isOnline) {
          try {
              await fetch(`${API_URL}/teacher-action`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ examCode, studentId, action: 'UNLOCK' })
              });
          } catch(e) {}
      }
  }

  async extendExamTime(examCode: string, additionalMinutes: number): Promise<void> {
      if (this.isOnline) {
          try {
              await fetch(`${API_URL}/extend-time`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ examCode, additionalMinutes })
              });
          } catch(e) {}
      }
  }
}

export const storageService = new StorageService();
