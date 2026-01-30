
// api/_db.ts - Bridge Frontend ke Google Apps Script Cluster

// URL Master: Khusus untuk Login, Register, Kelola Soal, DAN INISIALISASI DB KELAS
const MASTER_URL = process.env.VITE_MASTER_URL || process.env.APPS_SCRIPT_URL;

// URL Workers: Khusus untuk update jawaban rutin dan load balancing
// Format di .env: VITE_WORKER_URLS="https://...,https://...,https://..."
const WORKER_URLS = (process.env.VITE_WORKER_URLS || "").split(',').filter(u => u);

// Helper untuk memilih Worker secara acak (Load Balancing Sederhana)
const getRandomWorkerUrl = () => {
    if (WORKER_URLS.length === 0) return MASTER_URL; // Fallback ke Master jika tidak ada worker
    const randomIndex = Math.floor(Math.random() * WORKER_URLS.length);
    return WORKER_URLS[randomIndex];
};

const callScript = async (action: string, data: any = {}) => {
    // 1. Validasi Konfigurasi Server
    if (!MASTER_URL) {
        console.error("CRITICAL ERROR: VITE_MASTER_URL is not defined in Vercel Environment Variables.");
        throw new Error("Server Configuration Error: Database URL missing.");
    }

    // Daftar aksi yang WAJIB ke Master (Write Metadata & Creation)
    const MASTER_ACTIONS = [
        'login', 'register', 'findUser', 'getUsers', 'updateRole', // Auth
        'saveExam', 'getExams', 'deleteExam' // Exam Management
    ];

    // DETEKSI LOGIC: Apakah ini inisialisasi ujian siswa pertama kali?
    // Ciri: action='saveResult', status='in_progress', dan belum ada jawaban (answers kosong/sedikit)
    // Kita paksa ke MASTER agar pembuatan File Database Kelas (Shard) terjamin sukses.
    const isInitialization = action === 'saveResult' && 
                             data?.data?.status === 'in_progress' && 
                             (!data?.data?.answers || Object.keys(data?.data?.answers).length === 0);

    // 2. Tentukan Tujuan (Routing)
    let targetUrl = MASTER_URL;
    
    // Jika bukan aksi Master DAN bukan inisialisasi awal, baru boleh ke Worker
    if (!MASTER_ACTIONS.includes(action) && !isInitialization) {
        targetUrl = getRandomWorkerUrl() || MASTER_URL;
    }

    if (!targetUrl) throw new Error("No API URL available.");
    
    try {
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, ...data })
        });

        // 3. Handle Raw Response (Mencegah Error "<!DOCTYPE...")
        const textResponse = await response.text();
        
        let result;
        try {
            result = JSON.parse(textResponse);
        } catch (e) {
            // Jika gagal parse JSON, berarti Google mengembalikan HTML (Error Page/Login Page)
            console.error(`Google Script Error [${action}] RAW:`, textResponse.substring(0, 500)); // Log 500 karakter pertama
            
            if (textResponse.includes("<!DOCTYPE html>") || textResponse.includes("Google Accounts")) {
                throw new Error("Database Access Denied. Pastikan Deployment Google Script diset ke 'Anyone' (Siapa Saja).");
            }
            throw new Error(`Invalid Database Response: ${textResponse.substring(0, 100)}...`);
        }
        
        // 4. Handle Logical Error dari Script
        if (!result.success && !result.data && !result.user && !result.users && action !== 'findUser') {
            throw new Error(result.error || "Database operation failed");
        }
        return result;

    } catch (e: any) {
        console.error(`DB Error [${action}] -> ${targetUrl}:`, e.message);
        throw new Error(e.message || "Gagal menghubungi server database");
    }
};

export default {
    // --- MASTER ACTIONS (ADMINISTRASI) ---
    async getManualUser(username: string) { return null; },
    
    async loginUser(username: string, password: string) {
        const res = await callScript('login', { username, password });
        return res.user;
    },

    async findUser(username: string) {
        const res = await callScript('findUser', { username });
        return res.success ? res.user : null;
    },

    async registerUser(userData: any) {
        const res = await callScript('register', { data: userData });
        return res.user;
    },

    async getAllUsers() {
        const res = await callScript('getUsers');
        return res.users || [];
    },

    async updateUserRole(email: string, role: string, school: string) {
        const res = await callScript('updateRole', { email, role, school });
        return res.success;
    },

    async getAllTeacherKeys() { return ['GLOBAL_TEACHER']; },
    
    async getExams(userId: string) {
        const res = await callScript('getExams', {});
        return res.data || [];
    },

    async saveExam(userId: string, exam: any) {
        return callScript('saveExam', { data: exam });
    },

    async deleteExam(userId: string, code: string) {
        return callScript('deleteExam', { code, userId });
    },

    // --- WORKER ACTIONS (OPERASIONAL SISWA & MONITORING) ---
    
    async getResults(userId: string, examCode?: string, className?: string) {
        const res = await callScript('getResults', { examCode, className });
        
        let data = res.data || [];
        if (examCode) data = data.filter((r: any) => r.examCode === examCode);
        if (className && className !== 'ALL') data = data.filter((r: any) => r.student.class === className);
        return data;
    },

    async saveResult(userId: string, result: any) {
        return callScript('saveResult', { data: result });
    },

    async getUserSpreadsheetId(id: string) { return id; },
    async getUserRole(email: string) { return { role: 'guru', school: 'Sekolah' }; },
    async getAllAdmins() { return []; }
};
