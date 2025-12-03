import type { Exam, Result } from '../types';

// NOTE: Since the 'firebase' module imports are failing in this environment,
// we are falling back to a LocalStorage-based mock implementation.
// This allows the application to function entirely within the browser without external dependencies.

const STORAGE_KEYS = {
  EXAMS: 'mock_db_exams',
  RESULTS: 'mock_db_results'
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to get data from local storage
const getLocalData = <T>(key: string): T => {
    try {
        const item = localStorage.getItem(key);
        // Initialize if empty
        if (!item) {
            if (key === STORAGE_KEYS.EXAMS) return {} as unknown as T;
            if (key === STORAGE_KEYS.RESULTS) return [] as unknown as T;
        }
        return item ? JSON.parse(item) : (key === STORAGE_KEYS.EXAMS ? {} : []);
    } catch {
        return (key === STORAGE_KEYS.EXAMS ? {} : []) as unknown as T;
    }
};

// Helper to set data
const setLocalData = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
};

/**
 * Menyimpan data ujian baru yang dibuat guru.
 * Disimpan ke LocalStorage.
 */
export const saveExamToFirebase = async (exam: Exam) => {
    await delay(300); // Simulate network latency
    try {
        const exams = getLocalData<Record<string, Exam>>(STORAGE_KEYS.EXAMS);
        exams[exam.code] = exam;
        setLocalData(STORAGE_KEYS.EXAMS, exams);
        console.log(`[MOCK] Ujian ${exam.code} berhasil disimpan ke LocalStorage.`);
        return true;
    } catch (error) {
        console.error("Error menyimpan ujian:", error);
        return false;
    }
};

/**
 * Memperbarui data ujian yang sudah ada.
 */
export const updateExamInFirebase = async (exam: Exam) => {
    return saveExamToFirebase(exam);
};

/**
 * Mengambil data ujian berdasarkan kode.
 */
export const getExamFromFirebase = async (examCode: string): Promise<Exam | null> => {
    await delay(300);
    const exams = getLocalData<Record<string, Exam>>(STORAGE_KEYS.EXAMS);
    return exams[examCode] || null;
};

/**
 * Mengambil SEMUA ujian (untuk dashboard guru)
 */
export const getAllExamsFromFirebase = async (): Promise<Record<string, Exam>> => {
    await delay(300);
    return getLocalData<Record<string, Exam>>(STORAGE_KEYS.EXAMS);
};

/**
 * Menyimpan hasil ujian siswa.
 */
export const saveResultToFirebase = async (result: Result) => {
    await delay(300);
    try {
        const results = getLocalData<Result[]>(STORAGE_KEYS.RESULTS);
        // Remove existing result for same student & exam if retaking or updating
        // This simulates "setDoc" with a specific ID (examCode_studentId) logic
        const filteredResults = results.filter(r => !(r.examCode === result.examCode && r.student.studentId === result.student.studentId));
        
        const resultToSave = {
            ...result,
            savedAt: new Date().toISOString() // Mocking the timestamp
        };
        
        filteredResults.push(resultToSave);
        
        setLocalData(STORAGE_KEYS.RESULTS, filteredResults);
        console.log("[MOCK] Hasil ujian berhasil disimpan.");
        return true;
    } catch (error) {
        console.error("Error menyimpan hasil:", error);
        return false;
    }
};

/**
 * Mengambil semua hasil (untuk dashboard guru agar bisa rekap global)
 */
export const getAllResultsFromFirebase = async (): Promise<Result[]> => {
    await delay(300);
    return getLocalData<Result[]>(STORAGE_KEYS.RESULTS);
};

/**
 * (Untuk Guru) Mengambil hasil ujian spesifik berdasarkan kode ujian
 */
export const getResultsByExamCode = async (examCode: string): Promise<Result[]> => {
    await delay(300);
    const results = getLocalData<Result[]>(STORAGE_KEYS.RESULTS);
    return results.filter(r => r.examCode === examCode);
};
