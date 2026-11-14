import { supabase } from '../lib/supabase';
import type { Result, Exam } from '../types';
import { calculateExamScore } from '../components/teacher/examUtils';

// --- INDEXED DB HELPER ---
const DB_NAME = 'UjianCerdasDB';
const DB_VERSION = 1;
const STORE_PROGRESS = 'exam_progress';
const QUEUE_LOCAL_KEY = 'exam_sync_queue';
const QUEUE_IDB_KEY = 'offline_sync_queue_backup';
const MAX_RETRY_ATTEMPTS = 10;

interface QueuedResult extends Result {
    _retryCount?: number;
}

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
    private syncQueue: QueuedResult[] = [];
    private isProcessingQueue = false;
    private rpcUnavailable = false;

    constructor() {
        try {
            const savedQueue = localStorage.getItem(QUEUE_LOCAL_KEY);
            if (savedQueue) {
                this.syncQueue = JSON.parse(savedQueue);
            }
        } catch { /* ignore */ }
        
        if (typeof window !== 'undefined') {
            // Hydrate backup queue from IndexedDB if localStorage was empty/trimmed
            if (this.syncQueue.length === 0) {
                this.getLocalProgress(QUEUE_IDB_KEY).then((idbQueue) => {
                    if (Array.isArray(idbQueue) && idbQueue.length > 0 && this.syncQueue.length === 0) {
                        this.syncQueue = idbQueue as QueuedResult[];
                        if (typeof navigator === 'undefined' || navigator.onLine !== false) {
                            this.processQueue();
                        }
                    }
                }).catch(() => {});
            }

            window.addEventListener('online', () => this.processQueue());
            setInterval(() => {
                if (this.syncQueue.length > 0) this.processQueue();
            }, 30000);
        }
    }

    // --- INDEXED DB METHODS (LOCAL PROGRESS & TEACHER CACHE) ---
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

    async getLocalProgressByPrefix<T = unknown>(prefix: string): Promise<Record<string, T>> {
        const result: Record<string, T> = {};
        try {
            const db = await initDB();
            return await new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_PROGRESS, 'readonly');
                const store = tx.objectStore(STORE_PROGRESS);
                const req = store.openCursor();
                req.onsuccess = (e) => {
                    const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
                    if (cursor) {
                        const row = cursor.value as { key?: string; data?: T };
                        if (row?.key && row.key.startsWith(prefix) && row.data !== undefined) {
                            result[row.key.slice(prefix.length)] = row.data;
                        }
                        cursor.continue();
                    } else {
                        resolve(result);
                    }
                };
                req.onerror = () => reject(req.error);
            });
        } catch {
            return result;
        }
    }

    async clearLocalProgress(key: string): Promise<void> {
        try {
            const db = await initDB();
            await new Promise<void>((resolve, reject) => {
                const tx = db.transaction(STORE_PROGRESS, 'readwrite');
                tx.objectStore(STORE_PROGRESS).delete(key);
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        } catch {
            try { localStorage.removeItem(key); } catch { /* ignore */ }
        }
    }

    // --- QUEUE METHODS ---
    addToQueue(payload: Result) {
        this.syncQueue = this.syncQueue.filter(item => !(item.examCode === payload.examCode && item.student.studentId === payload.student.studentId));
        this.syncQueue.push({ ...payload, timestamp: Date.now(), _retryCount: 0 });
        this.saveQueue();
        if (typeof navigator === 'undefined' || navigator.onLine !== false) this.processQueue(); 
    }

    private saveQueue() {
        try {
            localStorage.setItem(QUEUE_LOCAL_KEY, JSON.stringify(this.syncQueue));
        } catch {
            // Quota fallback in IndexedDB if localStorage is full
            this.saveLocalProgress(QUEUE_IDB_KEY, this.syncQueue).catch(() => {});
        }
        if (this.syncQueue.length === 0) {
            this.clearLocalProgress(QUEUE_IDB_KEY).catch(() => {});
        } else {
            this.saveLocalProgress(QUEUE_IDB_KEY, this.syncQueue).catch(() => {});
        }
    }

    getSyncQueue(): Result[] {
        return this.syncQueue;
    }

    async processQueue() {
        if (this.isProcessingQueue || this.syncQueue.length === 0 || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
        this.isProcessingQueue = true;
        const queueCopy = [...this.syncQueue];
        const remainingQueue: QueuedResult[] = [];
        
        for (const payload of queueCopy) {
            try {
                const student = payload.student;
                const rawResultId = student.resultId ?? payload.id;
                const numericResultId =
                    typeof rawResultId === 'number' && !isNaN(rawResultId)
                        ? rawResultId
                        : (typeof rawResultId === 'string' && /^\d+$/.test(rawResultId)
                            ? Number(rawResultId)
                            : null);
                const deviceId = payload.device_id || payload.answers?.['_deviceId'] || null;

                // 1. Primary: Try Zero-Trust server RPC (already enforces completed/force_closed guard & _grade_* merge)
                let syncedViaRpc = false;
                if (!this.rpcUnavailable) {
                    try {
                        const { error: rpcError } = await supabase.rpc('calculate_and_submit_exam', {
                            p_exam_code: payload.examCode,
                            p_student_id: student.studentId,
                            p_student_name: student.fullName,
                            p_class_name: student.class,
                            p_school_name: student.schoolName || '',
                            p_answers: payload.answers || {},
                            p_status: payload.status || 'in_progress',
                            p_device_info: null,
                            p_location: payload.location || null,
                            p_activity_log: payload.activityLog || [],
                            p_result_id: numericResultId,
                            p_device_id: deviceId
                        });

                        if (!rpcError) {
                            syncedViaRpc = true;
                        } else if (rpcError.code === 'PGRST202' || rpcError.code === '42883') {
                            this.rpcUnavailable = true;
                        } else if (!rpcError.message?.includes('Failed to fetch')) {
                            // Non-network RPC failure: still try direct fallback below
                            console.warn("Queue RPC returned error, using guarded direct fallback:", rpcError.message);
                        } else {
                            throw rpcError;
                        }
                    } catch (rpcEx) {
                        const errObj = rpcEx as Record<string, unknown>;
                        if (errObj?.message === 'Failed to fetch') {
                            throw rpcEx;
                        }
                    }
                }

                if (syncedViaRpc) {
                    continue;
                }

                // 2. Guarded direct fallback if RPC unavailable
                let existingAnswers: Record<string, string> = {};
                let existingStatus: string | undefined;
                if (numericResultId) {
                    const { data: existingResult } = await supabase
                        .from('results')
                        .select('answers, status')
                        .eq('id', numericResultId)
                        .maybeSingle();
                    if (existingResult) {
                        existingAnswers = (existingResult.answers as Record<string, string>) || {};
                        existingStatus = existingResult.status as string | undefined;
                    }
                } else {
                    const { data: existingResult } = await supabase
                        .from('results')
                        .select('answers, status')
                        .eq('exam_code', payload.examCode)
                        .eq('student_id', student.studentId)
                        .maybeSingle();
                    if (existingResult) {
                        existingAnswers = (existingResult.answers as Record<string, string>) || {};
                        existingStatus = existingResult.status as string | undefined;
                    }
                }

                // Guard: Never overwrite an already-finished exam with stale in_progress item
                if ((existingStatus === 'completed' || existingStatus === 'force_closed') && payload.status === 'in_progress') {
                    continue;
                }

                // Merge answers, preserving manual grades from server
                const mergedAnswers = { ...(payload.answers || {}) };
                Object.keys(existingAnswers).forEach(key => {
                    if (key.startsWith('_grade_')) {
                        mergedAnswers[key] = existingAnswers[key];
                    }
                });
                payload.answers = mergedAnswers;

                let calculatedScore = payload.score || 0;
                let calculatedCorrect = payload.correctAnswers || 0;
                let calculatedTotal = payload.totalQuestions || 0;

                try {
                    const { data: examData } = await supabase.from('exams').select('*').eq('code', payload.examCode).maybeSingle();
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

                const classNameWithSchool = student.schoolName 
                    ? `${student.schoolName}::${student.class}`
                    : student.class;

                let error;
                if (numericResultId) {
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
                        .eq('id', numericResultId);
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
                const nextRetry = (payload._retryCount || 0) + 1;
                if (nextRetry < MAX_RETRY_ATTEMPTS) {
                    remainingQueue.push({ ...payload, _retryCount: nextRetry });
                } else {
                    console.warn("Dropping queue item after max retry attempts:", payload.examCode, payload.student?.studentId);
                }
            }
        }
        this.syncQueue = remainingQueue;
        this.saveQueue();
        this.isProcessingQueue = false;
    }
}

export const offlineService = new OfflineService();
