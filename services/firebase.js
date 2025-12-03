import firebase from 'firebase/app';
import 'firebase/firestore';
import type { Exam, Result } from '../types';

// Konfigurasi Firebase dari Environment Variables Vercel
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const EXAMS_COLLECTION = 'exams';
const RESULTS_COLLECTION = 'results';

/**
 * Menyimpan data ujian baru yang dibuat guru ke Firestore.
 */
export const saveExamToFirebase = async (exam: Exam) => {
  try {
    // Menggunakan exam.code sebagai ID dokumen
    await db.collection(EXAMS_COLLECTION).doc(exam.code).set(exam);
    return true;
  } catch (error) {
    console.error("Error saving exam:", error);
    return false;
  }
};

/**
 * Memperbarui data ujian yang sudah ada.
 */
export const updateExamInFirebase = async (exam: Exam) => {
  try {
    await db.collection(EXAMS_COLLECTION).doc(exam.code).update({ ...exam });
    return true;
  } catch (error) {
    console.error("Error updating exam:", error);
    return false;
  }
};

/**
 * Mengambil data ujian berdasarkan kode dari Firestore.
 */
export const getExamFromFirebase = async (examCode: string): Promise<Exam | null> => {
  try {
    const docRef = db.collection(EXAMS_COLLECTION).doc(examCode);
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      return docSnap.data() as Exam;
    }
    return null;
  } catch (error) {
    console.error("Error getting exam:", error);
    return null;
  }
};

/**
 * Mengambil SEMUA ujian (untuk dashboard guru).
 */
export const getAllExamsFromFirebase = async (): Promise<Record<string, Exam>> => {
  try {
    const querySnapshot = await db.collection(EXAMS_COLLECTION).get();
    const exams: Record<string, Exam> = {};
    querySnapshot.forEach((doc) => {
      exams[doc.id] = doc.data() as Exam;
    });
    return exams;
  } catch (error) {
    console.error("Error getting all exams:", error);
    return {};
  }
};

/**
 * Menyimpan hasil ujian siswa ke Firestore.
 */
export const saveResultToFirebase = async (result: Result) => {
  try {
    // Membuat ID unik kombinasi kode ujian dan ID siswa
    const id = `${result.examCode}_${result.student.studentId}`;
    await db.collection(RESULTS_COLLECTION).doc(id).set({
        ...result,
        savedAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error("Error saving result:", error);
    return false;
  }
};

/**
 * Mengambil semua hasil (untuk dashboard guru agar bisa rekap global).
 */
export const getAllResultsFromFirebase = async (): Promise<Result[]> => {
  try {
    const querySnapshot = await db.collection(RESULTS_COLLECTION).get();
    const results: Result[] = [];
    querySnapshot.forEach((doc) => {
      results.push(doc.data() as Result);
    });
    return results;
  } catch (error) {
    console.error("Error getting all results:", error);
    return [];
  }
};

/**
 * (Untuk Guru) Mengambil hasil ujian spesifik berdasarkan kode ujian.
 */
export const getResultsByExamCode = async (examCode: string): Promise<Result[]> => {
  try {
      const querySnapshot = await db.collection(RESULTS_COLLECTION).where("examCode", "==", examCode).get();
      const results: Result[] = [];
      querySnapshot.forEach((doc) => {
          results.push(doc.data() as Result);
      });
      return results;
  } catch (error) {
      console.error("Error getting results by code:", error);
      return [];
  }
}
