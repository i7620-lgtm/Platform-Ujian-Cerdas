
// api/_db.ts - Bridge Frontend ke Google Apps Script Cluster

// URL Master: Khusus untuk Login, Register, dan Kelola Soal (Admin/Guru)
const MASTER_URL = process.env.VITE_MASTER_URL || process.env.APPS_SCRIPT_URL;

// URL Workers: Khusus untuk Siswa (Submit) dan Live Monitor (Guru)
// Format di .env: VITE_WORKER_URLS="https://...,https://...,https://..."
const WORKER_URLS = (process.env.VITE_WORKER_URLS || "").split(',').filter(u => u);

if (!MASTER_URL) console.error("CRITICAL: VITE_MASTER_URL is missing in .env");
if (WORKER_URLS.length === 0) console.warn("WARNING: VITE_WORKER_URLS missing. Traffic will failover to Master (Not Recommended).");

// Daftar aksi yang WAJIB ke Master (Write Metadata)
const MASTER_ACTIONS = [
    'login', 'register', 'findUser', 'getUsers', 'updateRole', // Auth
    'saveExam', 'getExams', 'deleteExam' // Exam Management
];

// Helper untuk memilih Worker secara acak (Load Balancing Sederhana)
const getRandomWorkerUrl = () => {
    if (WORKER_URLS.length === 0) return MASTER_URL; // Fallback ke Master jika tidak ada worker
    const randomIndex = Math.floor(Math.random() * WORKER_URLS.length);
    return WORKER_URLS[randomIndex];
};

const callScript = async (action: string, data: any = {}) => {
    // 1. Tentukan Tujuan (Routing)
    let targetUrl = MASTER_URL;
    
    if (!MASTER_ACTIONS.includes(action)) {
        // Jika bukan aksi admin, gunakan Worker untuk menyebar beban traffic
        targetUrl = getRandomWorkerUrl();
    }

    if (!targetUrl) throw new Error("Server Configuration Error: No API URL available.");
    
    try {
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, ...data })
        });
        
        const result = await response.json();
        
        // Error handling standar GAS
        if (!result.success && !result.data && !result.user && !result.users && action !== 'findUser') {
            throw new Error(result.error || "Database operation failed");
        }
        return result;
    } catch (e: any) {
        console.error(`DB Error [${action}] -> ${targetUrl}:`, e);
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
        // Load Balancer akan mengarahkan ini ke salah satu Worker
        const res = await callScript('getResults', { examCode, className });
        
        // Client-side filtering sebagai pengaman tambahan
        let data = res.data || [];
        if (examCode) data = data.filter((r: any) => r.examCode === examCode);
        if (className && className !== 'ALL') data = data.filter((r: any) => r.student.class === className);
        return data;
    },

    async saveResult(userId: string, result: any) {
        // Load Balancer akan mengarahkan ini ke salah satu Worker
        return callScript('saveResult', { data: result });
    },

    async getUserSpreadsheetId(id: string) { return id; },
    async getUserRole(email: string) { return { role: 'guru', school: 'Sekolah' }; },
    async getAllAdmins() { return []; }
};
