import { initializeApp } from 'firebase/app';
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    collection, 
    query, 
    where, 
    getDocs,
    Timestamp 
} from 'firebase/firestore';

// --- KONFIGURASI FIREBASE ---
// Menggunakan Environment Variables untuk keamanan (Vercel / Vite)
// Pastikan variabel ini ada di file .env.local atau Vercel Project Settings
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Inisialisasi Firebase
// Note: initializeApp aman dipanggil berulang kali di SDK versi terbaru, 
// tapi jika error double init muncul, bisa dicek getApps().length
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- FUNGSI-FUNGSI DATABASE ---

/**
 * Menyimpan data ujian baru yang dibuat guru ke Firestore.
 * Collection: 'exams'
 * Doc ID: Kode Ujian (misal: "IPA101")
 */
export const saveExamToFirebase = async (exam) => {
    try {
        const examRef = doc(db, 'exams', exam.code);
        // Kita simpan exam apa adanya. Firestore menerima JSON object.
        await setDoc(examRef, exam);
        console.log(`Ujian ${exam.code} berhasil disimpan ke cloud.`);
        return true;
    } catch (error) {
        console.error("Error menyimpan ujian:", error);
        alert("Gagal menyimpan ujian ke database online. Cek koneksi internet.");
        return false;
    }
};

/**
 * Mengambil data ujian berdasarkan kode.
 * Digunakan saat siswa login.
 */
export const getExamFromFirebase = async (examCode) => {
    try {
        const examRef = doc(db, 'exams', examCode);
        const docSnap = await getDoc(examRef);

        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            console.log("Ujian tidak ditemukan!");
            return null;
        }
    } catch (error) {
        console.error("Error mengambil ujian:", error);
        return null;
    }
};

/**
 * Mengambil SEMUA ujian (untuk Dashboard Guru).
 */
export const getAllExamsFromFirebase = async () => {
    try {
        const examsRef = collection(db, 'exams');
        const querySnapshot = await getDocs(examsRef);
        
        const exams = {};
        querySnapshot.forEach((doc) => {
            const examData = doc.data();
            exams[examData.code] = examData;
        });
        return exams;
    } catch (error) {
        console.error("Error mengambil semua ujian:", error);
        return {};
    }
};

/**
 * Menyimpan hasil ujian siswa.
 * Collection: 'results'
 * Doc ID: gabungan examCode_studentId (unik)
 */
export const saveResultToFirebase = async (result) => {
    try {
        // ID Dokumen yang unik: KODE-NISN
        const resultId = `${result.examCode}_${result.student.studentId}`;
        const resultRef = doc(db, 'results', resultId);
        
        await setDoc(resultRef, {
            ...result,
            savedAt: Timestamp.now() // Menandai waktu simpan server
        });
        console.log("Hasil ujian berhasil disimpan.");
        return true;
    } catch (error) {
        console.error("Error menyimpan hasil:", error);
        return false;
    }
};

/**
 * Mengambil SEMUA hasil ujian (untuk Dashboard Guru).
 * Bisa difilter nanti di frontend.
 */
export const getAllResultsFromFirebase = async () => {
    try {
        const resultsRef = collection(db, 'results');
        const querySnapshot = await getDocs(resultsRef);
        
        const results = [];
        querySnapshot.forEach((doc) => {
            // Hilangkan field timestamp internal Firestore jika ada agar tidak merusak tipe
            const data = doc.data();
            const { savedAt, ...resultData } = data; 
            results.push(resultData);
        });
        return results;
    } catch (error) {
        console.error("Error mengambil semua hasil:", error);
        return [];
    }
};

/**
 * (Untuk Guru) Mengambil semua hasil ujian untuk kode tertentu
 */
export const getResultsByExamCode = async (examCode) => {
    try {
        const resultsRef = collection(db, 'results');
        const q = query(resultsRef, where("examCode", "==", examCode));
        
        const querySnapshot = await getDocs(q);
        const results = [];
        querySnapshot.forEach((doc) => {
             const data = doc.data();
             const { savedAt, ...resultData } = data;
             results.push(resultData);
        });
        return results;
    } catch (error) {
        console.error("Error mengambil daftar hasil:", error);
        return [];
    }
};
