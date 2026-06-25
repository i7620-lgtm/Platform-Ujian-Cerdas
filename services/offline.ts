import { supabase } from '../lib/supabase';
import type { Result, Exam } from '../types';
import { calculateExamScore } from '../components/teacher/examUtils';

// --- INDEXED DB HELPER ---
const DB_NAME = 'UjianCerdasDB';
const DB_VERSION = 1;
const STORE_PROGRESS = 'exam_progress';

const initDB = (): Promise<IDBDatabase> => {
    if (typeof window === 'undefined' || !window.indexedDB) return Promise.reject("IndexedDB not supported");
    
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (e) => {
            const db = (e.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_PROGRESS)) {
                db.createObjectStore(STORE_PROGRESS, { keyPath: 'key' });
            }
        };
    });
};

export class OfflineService {
    private syncQueue: Result[] = [];
    private isProcessingQueue = false;

    constructor() {
        try {
            const savedQueue = localStorage.getItem('exam_sync_queue');
            if (savedQueue) {
                this.syncQueue = JSON.parse(savedQueue);
            }
        } catch { /* ignore */ }
        
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => this.processQueue());
            setInterval(() => {
                if (this.syncQueue.length > 0) this.processQueue();
            }, 30000);
        }
    }

    // --- INDEXED DB METHODS (LOCAL PROGRESS) ---
    async saveLocalProgress(key: string, data: unknown): Promise<void> {
        try {
            const db = await initDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_PROGRESS, 'readwrite');
                const store = tx.objectStore(STORE_PROGRESS);
                store.put({ key, data, updatedAt: Date.now() });
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        } catch { 
            // Fallback to LocalStorage if IDB fails
            try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* ignore */ }
        }
    }

    async getLocalProgress(key: string): Promise<unknown | null> {
        try {
            const db = await initDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_PROGRESS, 'readonly');
                const store = tx.objectStore(STORE_PROGRESS);
                const req = store.get(key);
                req.onsuccess = () => resolve(req.result ? req.result.data : null);
                req.onerror = () => reject(req.error);
            });
        } catch { 
            // Fallback to LocalStorage
            try { 
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : null;
            } catch { return null; }
        }
    }

    async clearLocalProgress(key: string): Promise<void> {
        try {
            const db = await initDB();
            const tx = db.transaction(STORE_PROGRESS, 'readwrite');
            tx.objectStore(STORE_PROGRESS).delete(key);
        } catch {
            try { localStorage.removeItem(key); } catch { /* ignore */ }
        }
    }

    // --- QUEUE METHODS ---
    addToQueue(payload: Result) {
        this.syncQueue = this.syncQueue.filter(item => !(item.examCode === payload.examCode && item.student.studentId === payload.student.studentId));
        this.syncQueue.push({ ...payload, timestamp: Date.now() });
        this.saveQueue();
        if (typeof navigator === 'undefined' || navigator.onLine !== false) this.processQueue(); 
    }

    private saveQueue() {
        try { localStorage.setItem('exam_sync_queue', JSON.stringify(this.syncQueue)); } catch { /* ignore */ }
    }

    getSyncQueue(): Result[] {
        return this.syncQueue;
    }

    async processQueue() {
        if (this.isProcessingQueue || this.syncQueue.length === 0 || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
        this.isProcessingQueue = true;
        const queueCopy = [...this.syncQueue];
        const remainingQueue: Result[] = [];
        
        for (const payload of queueCopy) {
            try {
               // SECURITY FIX: Recalculate score before processing queue item
               let calculatedScore = payload.score || 0;
               let calculatedCorrect = payload.correctAnswers || 0;
               let calculatedTotal = payload.totalQuestions || 0;

               try {
                   // Fetch existing result to preserve manual grades
                   let existingAnswers: Record<string, string> = {};
                   if (payload.student.resultId) {
                       const { data: existingResult } = await supabase.from('results').select('answers').eq('id', payload.student.resultId).single();
                       if (existingResult && existingResult.answers) {
                           existingAnswers = existingResult.answers as Record<string, string>;
                       }
                   }

                   // Merge answers, preserving manual grades
                   const mergedAnswers = { ...payload.answers };
                   Object.keys(existingAnswers).forEach(key => {
                       if (key.startsWith('_grade_')) {
                           mergedAnswers[key] = existingAnswers[key];
                       }
                   });
                   payload.answers = mergedAnswers;

                   const { data: examData } = await supabase.from('exams').select('*').eq('code', payload.examCode).single();
                   if (examData) {
                       const exam = examData as Exam;
                       const { score, correctAnswers, totalQuestions } = calculateExamScore(exam, payload.answers || {});
                       calculatedScore = score;
                       calculatedCorrect = correctAnswers;
                       calculatedTotal = totalQuestions;
                   }
               } catch (err) {
                   console.error("Failed to recalculate score securely in queue", err);
               }

               const student = payload.student;
               const classNameWithSchool = student.schoolName 
                   ? `${student.schoolName}::${student.class}`
                   : student.class;

               let error;
               if (student.resultId) {
                   const { error: updateError } = await supabase
                       .from('results')
                       .update({ 
                           answers: payload.answers || {}, 
                           status: payload.status,
                           activity_log: payload.activityLog, 
                           score: calculatedScore, 
                           correct_answers: calculatedCorrect,
                           total_questions: calculatedTotal, 
                           location: payload.location, 
                           updated_at: new Date().toISOString()
                       })
                       .eq('id', student.resultId);
                   error = updateError;
               } else {
                   const { error: upsertError } = await supabase.from('results').upsert({
                      exam_code: payload.examCode, student_id: student.studentId, student_name: student.fullName,
                      class_name: classNameWithSchool, answers: payload.answers || {}, status: payload.status,
                      activity_log: payload.activityLog, score: calculatedScore, correct_answers: calculatedCorrect,
                      total_questions: calculatedTotal, location: payload.location, updated_at: new Date().toISOString()
                   }, { onConflict: 'exam_code,student_id' });
                   error = upsertError;
               }
               
               if (error) {
                   if (error.code === '42501' || error.code === 'PGRST301') { 
                       console.error("Queue item dropped due to permission error:", error);
                   } else {
                       throw error; 
                   }
               }
            } catch {
                remainingQueue.push(payload);
            }
        }
        this.syncQueue = remainingQueue;
        this.saveQueue();
        this.isProcessingQueue = false;
    }
}

export const offlineService = new OfflineService();
