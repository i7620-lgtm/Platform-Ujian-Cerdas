import { supabase } from '../lib/supabase';
import type { Result } from '../types';

// --- INDEXED DB HELPER ---
const DB_NAME = 'UjianCerdasDB';
const DB_VERSION = 1;
const STORE_PROGRESS = 'exam_progress';
const QUEUE_LOCAL_KEY = 'exam_sync_queue';
const QUEUE_IDB_KEY = 'offline_sync_queue_backup';
const FAILED_QUEUE_LOCAL_KEY = 'exam_failed_sync_queue';
const FAILED_QUEUE_IDB_KEY = 'offline_failed_sync_queue_backup';
const MAX_RETRY_ATTEMPTS = 20;
const BASE_BACKOFF_MS = 30_000;
const MAX_BACKOFF_MS = 5 * 60_000;

export interface QueuedResult extends Result {
    _retryCount?: number;
    _networkFailCount?: number;
    _nextRetryAt?: number;
    _lastError?: string;
    _failedAt?: number;
}

export interface SubmissionSyncState {
    status: 'synced' | 'pending' | 'failed';
    retryCount: number;
    networkFailCount: number;
    nextRetryAt?: number;
    lastError?: string;
    failedAt?: number;
    item?: QueuedResult;
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
    private failedQueue: QueuedResult[] = [];
    private isProcessingQueue = false;
    private activeProcessPromise: Promise<void> | null = null;
    private pendingSaveQueuePromise: Promise<void> = Promise.resolve();
    private listeners = new Set<() => void>();

    constructor() {
        try {
            const savedQueue = localStorage.getItem(QUEUE_LOCAL_KEY);
            if (savedQueue) {
                this.syncQueue = JSON.parse(savedQueue);
            }
        } catch { /* ignore */ }

        try {
            const savedFailed = localStorage.getItem(FAILED_QUEUE_LOCAL_KEY);
            if (savedFailed) {
                this.failedQueue = JSON.parse(savedFailed);
            }
        } catch { /* ignore */ }
        
        if (typeof window !== 'undefined') {
            // Hydrate backup queue from IndexedDB if localStorage was empty/trimmed
            if (this.syncQueue.length === 0) {
                this.getLocalProgress(QUEUE_IDB_KEY).then((idbQueue) => {
                    if (Array.isArray(idbQueue) && idbQueue.length > 0 && this.syncQueue.length === 0) {
                        this.syncQueue = idbQueue as QueuedResult[];
                        this.notifyListeners();
                        if (typeof navigator === 'undefined' || navigator.onLine !== false) {
                            this.processQueue();
                        }
                    }
                }).catch(() => {});
            }

            if (this.failedQueue.length === 0) {
                this.getLocalProgress(FAILED_QUEUE_IDB_KEY).then((idbFailed) => {
                    if (Array.isArray(idbFailed) && idbFailed.length > 0 && this.failedQueue.length === 0) {
                        this.failedQueue = idbFailed as QueuedResult[];
                        this.notifyListeners();
                    }
                }).catch(() => {});
            }

            window.addEventListener('online', () => this.processQueue({ forceBypassBackoff: true }));
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

    async getLocalProgressEntriesByPrefix<T = unknown>(prefix: string): Promise<Array<{ key: string; data: T; updatedAt?: number }>> {
        const entries: Array<{ key: string; data: T; updatedAt?: number }> = [];
        try {
            const db = await initDB();
            return await new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_PROGRESS, 'readonly');
                const store = tx.objectStore(STORE_PROGRESS);
                const req = store.openCursor();
                req.onsuccess = (e) => {
                    const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
                    if (cursor) {
                        const row = cursor.value as { key?: string; data?: T; updatedAt?: number };
                        if (row?.key && row.key.startsWith(prefix)) {
                            entries.push({ key: row.key, data: row.data as T, updatedAt: row.updatedAt });
                        }
                        cursor.continue();
                    } else {
                        resolve(entries);
                    }
                };
                req.onerror = () => reject(req.error);
            });
        } catch {
            return entries;
        }
    }

    async clearLocalProgressByPrefix(prefix: string): Promise<number> {
        let removedCount = 0;
        try {
            const db = await initDB();
            await new Promise<void>((resolve, reject) => {
                const tx = db.transaction(STORE_PROGRESS, 'readwrite');
                const store = tx.objectStore(STORE_PROGRESS);
                const req = store.openCursor();
                req.onsuccess = (e) => {
                    const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
                    if (cursor) {
                        const row = cursor.value as { key?: string };
                        if (row?.key && row.key.startsWith(prefix)) {
                            cursor.delete();
                            removedCount++;
                        }
                        cursor.continue();
                    }
                };
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        } catch {
            /* ignore IndexedDB cleanup errors */
        }
        return removedCount;
    }

    private sanitizeAnswers(clientAnswers?: Record<string, string>, existingAnswers?: Record<string, string>): Record<string, string> {
        const clean: Record<string, string> = {};
        if (clientAnswers) {
            for (const [k, v] of Object.entries(clientAnswers)) {
                if (!k.startsWith('_grade_')) {
                    clean[k] = v;
                }
            }
        }
        if (existingAnswers) {
            for (const [k, v] of Object.entries(existingAnswers)) {
                if (k.startsWith('_grade_')) {
                    clean[k] = v;
                }
            }
        }
        return clean;
    }

    private computeBackoffDelay(step: number): number {
        return Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * Math.pow(2, Math.max(0, step - 1)));
    }

    private isLikelyNetworkError(err: unknown): boolean {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            return true;
        }
        if (!err) return false;
        const rec = err as { status?: number; name?: string; message?: string; details?: string };
        if (typeof rec.status === 'number' && [0, 408, 502, 503, 504].includes(rec.status)) {
            return true;
        }
        if (rec.name === 'AbortError' || rec.name === 'TimeoutError') {
            return true;
        }
        const combined = `${rec.message || ''} ${rec.details || ''} ${String(err)}`.toLowerCase();
        return /failed to fetch|networkerror|network request failed|load failed|err_internet_disconnected|err_name_not_resolved|err_network_changed|timeout|timed out|econnrefused|econnreset|etimedout|enotfound|bad gateway|service unavailable|gateway timeout|fetcherror/.test(
            combined,
        );
    }

    private extractErrorMessage(err: unknown): string {
        if (!err) return 'Gagal terhubung ke server penilaian.';
        if (typeof err === 'string') return err.slice(0, 240);
        const rec = err as { message?: string; code?: string };
        const raw = rec.message || String(err);
        return (rec.code ? `[${rec.code}] ${raw}` : raw).slice(0, 240);
    }

    private notifyListeners(): void {
        this.listeners.forEach((listener) => {
            try {
                listener();
            } catch {
                /* ignore listener error */
            }
        });
    }

    subscribeQueueChange(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    // --- QUEUE METHODS ---
    addToQueue(payload: Result, options?: { skipImmediateProcess?: boolean }): Promise<void> {
        this.syncQueue = this.syncQueue.filter(
            item => !(item.examCode === payload.examCode && item.student.studentId === payload.student.studentId)
        );
        const hadFailed = this.failedQueue.some(
            item => item.examCode === payload.examCode && item.student.studentId === payload.student.studentId
        );
        if (hadFailed) {
            this.failedQueue = this.failedQueue.filter(
                item => !(item.examCode === payload.examCode && item.student.studentId === payload.student.studentId)
            );
        }

        // Zero-Trust: never persist client-calculated score/correctAnswers into sync queue
        const rawPayload: QueuedResult = {
            ...payload,
            answers: this.sanitizeAnswers(payload.answers),
            score: 0,
            correctAnswers: 0,
            totalQuestions: 0,
            isSynced: false,
            timestamp: Date.now(),
            _retryCount: 0,
            _networkFailCount: 0,
            _nextRetryAt: undefined,
            _lastError: undefined,
            _failedAt: undefined,
        };
        this.syncQueue.push(rawPayload);
        const savePromise = hadFailed
            ? Promise.all([this.saveQueue(), this.saveFailedQueue()]).then(() => undefined)
            : this.saveQueue();
        this.notifyListeners();
        if (!options?.skipImmediateProcess && (typeof navigator === 'undefined' || navigator.onLine !== false)) {
            this.processQueue();
        }
        return savePromise;
    }

    hasPendingSubmission(examCode: string, studentId: string): boolean {
        const isFinalMatch = (item: QueuedResult) =>
            item.examCode === examCode &&
            item.student?.studentId === studentId &&
            (item.status === 'completed' || item.status === 'force_closed');
        return this.syncQueue.some(isFinalMatch) || this.failedQueue.some(isFinalMatch);
    }

    hasFailedSubmission(examCode: string, studentId: string): boolean {
        return this.failedQueue.some(
            item =>
                item.examCode === examCode &&
                item.student?.studentId === studentId &&
                (item.status === 'completed' || item.status === 'force_closed')
        );
    }

    getFailedSubmission(examCode: string, studentId: string): QueuedResult | null {
        return (
            this.failedQueue.find(
                item => item.examCode === examCode && item.student?.studentId === studentId
            ) || null
        );
    }

    getSubmissionSyncState(examCode: string, studentId: string): SubmissionSyncState {
        const failed = this.failedQueue.find(
            item =>
                item.examCode === examCode &&
                item.student?.studentId === studentId &&
                (item.status === 'completed' || item.status === 'force_closed')
        );
        if (failed) {
            return {
                status: 'failed',
                retryCount: failed._retryCount || 0,
                networkFailCount: failed._networkFailCount || 0,
                lastError: failed._lastError,
                failedAt: failed._failedAt,
                item: failed,
            };
        }

        const pending = this.syncQueue.find(
            item =>
                item.examCode === examCode &&
                item.student?.studentId === studentId &&
                (item.status === 'completed' || item.status === 'force_closed')
        );
        if (pending) {
            return {
                status: 'pending',
                retryCount: pending._retryCount || 0,
                networkFailCount: pending._networkFailCount || 0,
                nextRetryAt: pending._nextRetryAt,
                lastError: pending._lastError,
                item: pending,
            };
        }

        return {
            status: 'synced',
            retryCount: 0,
            networkFailCount: 0,
        };
    }

    async retryQueuedSubmission(examCode: string, studentId: string): Promise<boolean> {
        const failedMatch = this.failedQueue.find(
            item => item.examCode === examCode && item.student?.studentId === studentId
        );

        let movedFromFailed = false;
        if (failedMatch) {
            this.failedQueue = this.failedQueue.filter(
                item => !(item.examCode === examCode && item.student?.studentId === studentId)
            );
            this.syncQueue = this.syncQueue.filter(
                item => !(item.examCode === examCode && item.student?.studentId === studentId)
            );
            this.syncQueue.push({
                ...failedMatch,
                _retryCount: 0,
                _networkFailCount: 0,
                _nextRetryAt: undefined,
                _failedAt: undefined,
            });
            movedFromFailed = true;
        } else {
            this.syncQueue = this.syncQueue.map(item =>
                item.examCode === examCode && item.student?.studentId === studentId
                    ? {
                        ...item,
                        _retryCount: 0,
                        _networkFailCount: 0,
                        _nextRetryAt: undefined,
                    }
                    : item
            );
        }

        if (movedFromFailed) {
            await Promise.all([this.saveQueue(), this.saveFailedQueue()]);
        } else {
            await this.saveQueue();
        }
        this.notifyListeners();

        await this.processQueue({ forceBypassBackoff: true });
        return !this.hasPendingSubmission(examCode, studentId);
    }

    waitForQueueSaved(): Promise<void> {
        return this.pendingSaveQueuePromise;
    }

    private saveQueue(): Promise<void> {
        try {
            localStorage.setItem(QUEUE_LOCAL_KEY, JSON.stringify(this.syncQueue));
        } catch {
            // Quota fallback handled in IndexedDB below
        }
        const writeOp = this.syncQueue.length === 0
            ? this.clearLocalProgress(QUEUE_IDB_KEY).catch(() => {})
            : this.saveLocalProgress(QUEUE_IDB_KEY, this.syncQueue).catch(() => {});
        this.pendingSaveQueuePromise = writeOp;
        return writeOp;
    }

    private saveFailedQueue(): Promise<void> {
        try {
            localStorage.setItem(FAILED_QUEUE_LOCAL_KEY, JSON.stringify(this.failedQueue));
        } catch {
            // Quota fallback handled in IndexedDB below
        }
        return this.failedQueue.length === 0
            ? this.clearLocalProgress(FAILED_QUEUE_IDB_KEY).catch(() => {})
            : this.saveLocalProgress(FAILED_QUEUE_IDB_KEY, this.failedQueue).catch(() => {});
    }

    getSyncQueue(): QueuedResult[] {
        return this.syncQueue;
    }

    getFailedQueue(): QueuedResult[] {
        return this.failedQueue;
    }

    private async persistRawAnswersBackup(payload: QueuedResult, numericResultId: number | null): Promise<boolean> {
        const student = payload.student;
        let existingAnswers: Record<string, string> = {};
        let existingStatus: string | undefined;
        let existingId: number | null = numericResultId;

        if (existingId) {
            const { data: existingResult } = await supabase
                .from('results')
                .select('id, answers, status')
                .eq('id', existingId)
                .maybeSingle();
            if (existingResult) {
                existingAnswers = (existingResult.answers as Record<string, string>) || {};
                existingStatus = existingResult.status as string | undefined;
            }
        } else {
            const { data: existingResult } = await supabase
                .from('results')
                .select('id, answers, status')
                .eq('exam_code', payload.examCode)
                .eq('student_id', student.studentId)
                .maybeSingle();
            if (existingResult) {
                existingId = Number(existingResult.id);
                existingAnswers = (existingResult.answers as Record<string, string>) || {};
                existingStatus = existingResult.status as string | undefined;
            }
        }

        if ((existingStatus === 'completed' || existingStatus === 'force_closed') && payload.status === 'in_progress') {
            return true;
        }

        const mergedAnswers = this.sanitizeAnswers(payload.answers, existingAnswers);
        const deviceId = payload.device_id || mergedAnswers['_deviceId'] || null;

        if (existingId) {
            // Update ONLY raw answers and metadata; never overwrite score/correct_answers/total_questions
            const { error } = await supabase
                .from('results')
                .update({
                    answers: mergedAnswers,
                    status: payload.status || 'in_progress',
                    activity_log: payload.activityLog || [],
                    location: payload.location || null,
                    ...(deviceId ? { device_id: deviceId } : {}),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', existingId);
            return !error;
        }

        const classNameWithSchool = student.schoolName
            ? `${student.schoolName}::${student.class}`
            : student.class;

        const { error } = await supabase.from('results').upsert({
            exam_code: payload.examCode,
            student_id: student.studentId,
            student_name: student.fullName,
            class_name: classNameWithSchool,
            answers: mergedAnswers,
            status: payload.status || 'in_progress',
            activity_log: payload.activityLog || [],
            score: 0,
            correct_answers: 0,
            total_questions: 0,
            location: payload.location || null,
            ...(deviceId ? { device_id: deviceId } : {}),
            updated_at: new Date().toISOString(),
        }, { onConflict: 'exam_code,student_id' });

        return !error;
    }

    async processQueue(options?: { forceBypassBackoff?: boolean }): Promise<void> {
        if (this.activeProcessPromise) {
            await this.activeProcessPromise;
            if (this.syncQueue.length === 0) return;
        }
        if (this.isProcessingQueue || this.syncQueue.length === 0 || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
            return;
        }

        const now = Date.now();
        const readyItems = options?.forceBypassBackoff
            ? [...this.syncQueue]
            : this.syncQueue.filter(item => !item._nextRetryAt || item._nextRetryAt <= now);

        if (readyItems.length === 0) {
            return;
        }

        this.isProcessingQueue = true;
        const runPromise = (async () => {
            const readySnapshots = readyItems.map(item => ({
                item,
                identity: `${item.examCode}::${item.student?.studentId}::${item.timestamp}`,
            }));
            const remainingProcessed: QueuedResult[] = [];
            const newlyFailed: QueuedResult[] = [];

            for (const { item: payload } of readySnapshots) {
                try {
                    const student = payload.student;
                    const rawResultId = student.resultId ?? payload.id;
                    const numericResultId =
                        typeof rawResultId === 'number' && !isNaN(rawResultId) && rawResultId < 1e12
                            ? rawResultId
                            : (typeof rawResultId === 'string' && /^\d+$/.test(rawResultId) && Number(rawResultId) < 1e12
                                ? Number(rawResultId)
                                : null);
                    const deviceId = payload.device_id || payload.answers?.['_deviceId'] || null;

                    // 1. Always attempt authoritative Zero-Trust server RPC grading
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
                        continue;
                    }

                    // 2. RPC failed: backup raw answers ONLY (never client score!)
                    const rawSaved = await this.persistRawAnswersBackup(payload, numericResultId).catch(() => false);

                    // For in_progress heartbeats, raw-answer backup is enough; for completed/force_closed, keep retrying RPC!
                    if (payload.status === 'in_progress' && rawSaved) {
                        continue;
                    }

                    throw rpcError;
                } catch (err) {
                    const errMsg = this.extractErrorMessage(err);
                    const isNetErr = this.isLikelyNetworkError(err);

                    if (isNetErr) {
                        const nextNetFail = (payload._networkFailCount || 0) + 1;
                        remainingProcessed.push({
                            ...payload,
                            _networkFailCount: nextNetFail,
                            _nextRetryAt: Date.now() + this.computeBackoffDelay(nextNetFail),
                            _lastError: errMsg,
                        });
                    } else {
                        const nextRetry = (payload._retryCount || 0) + 1;
                        if (nextRetry < MAX_RETRY_ATTEMPTS) {
                            remainingProcessed.push({
                                ...payload,
                                _retryCount: nextRetry,
                                _nextRetryAt: Date.now() + this.computeBackoffDelay(nextRetry),
                                _lastError: errMsg,
                            });
                        } else if (payload.status === 'completed' || payload.status === 'force_closed') {
                            newlyFailed.push({
                                ...payload,
                                _retryCount: nextRetry,
                                _nextRetryAt: undefined,
                                _lastError: errMsg,
                                _failedAt: Date.now(),
                            });
                        }
                    }
                }
            }

            // Preserve deferred items and any concurrent items added while processing
            const processedIdentities = new Set(readySnapshots.map(s => s.identity));
            const untouchedItems = this.syncQueue.filter(
                item => !processedIdentities.has(`${item.examCode}::${item.student?.studentId}::${item.timestamp}`)
            );
            const activeKeys = new Set(
                untouchedItems.map(item => `${item.examCode}::${item.student?.studentId}`)
            );
            const dedupedProcessed = remainingProcessed.filter(
                item => !activeKeys.has(`${item.examCode}::${item.student?.studentId}`)
            );

            this.syncQueue = [...untouchedItems, ...dedupedProcessed];

            if (newlyFailed.length > 0) {
                const movedIds = new Set(
                    newlyFailed.map(item => `${item.examCode}::${item.student?.studentId}`)
                );
                const filteredFailed = this.failedQueue.filter(
                    item => !movedIds.has(`${item.examCode}::${item.student?.studentId}`)
                );
                // Do not overwrite if a newer concurrent submission entered active queue
                const validFailed = newlyFailed.filter(
                    item => !activeKeys.has(`${item.examCode}::${item.student?.studentId}`)
                );
                this.failedQueue = [...filteredFailed, ...validFailed];
                await Promise.all([this.saveQueue(), this.saveFailedQueue()]);
            } else {
                await this.saveQueue();
            }

            this.notifyListeners();
        })();

        this.activeProcessPromise = runPromise;
        try {
            await runPromise;
        } finally {
            this.isProcessingQueue = false;
            this.activeProcessPromise = null;
        }
    }
}

export const offlineService = new OfflineService();
