
// api/_db.ts - Jembatan Stabil ke Google Apps Script
// Tidak lagi menggunakan Service Account yang ribet.

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;

if (!APPS_SCRIPT_URL) {
    console.error("CRITICAL: APPS_SCRIPT_URL is missing in .env");
}

const callScript = async (action: string, data: any = {}) => {
    if (!APPS_SCRIPT_URL) throw new Error("Server Configuration Error: Database URL missing.");
    
    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, ...data })
        });
        
        const result = await response.json();
        // Relaxed error checking for findUser which expects success:false when not found
        if (!result.success && !result.data && !result.user && action !== 'findUser') {
            throw new Error(result.error || "Database operation failed");
        }
        return result;
    } catch (e: any) {
        console.error(`DB Error [${action}]:`, e);
        throw new Error(e.message || "Gagal menghubungi database");
    }
};

// --- ADAPTER METHODS (Agar kompatibel dengan kode API yang sudah ada) ---

export default {
    async getManualUser(username: string) {
        // Legacy support
        return null; 
    },
    
    // Login via Script
    async loginUser(username: string, password: string) {
        const res = await callScript('auth', { username, password });
        return res.user;
    },

    // Find User (Check existence)
    async findUser(username: string) {
        const res = await callScript('findUser', { username });
        return res.success ? res.user : null;
    },

    // Register User Baru (NEW)
    async registerUser(userData: any) {
        // userData: { username, password, fullName, school }
        const res = await callScript('register', { data: userData });
        return res.user;
    },

    async getAllTeacherKeys() {
        // Dalam mode simple ini, kita anggap semua ujian ada di satu sheet
        return ['GLOBAL_TEACHER']; 
    },
    
    async getExams(userId: string) {
        const res = await callScript('getExams', {});
        return res.data || [];
    },

    async saveExam(userId: string, exam: any) {
        return callScript('saveExam', { data: exam });
    },

    async deleteExam(userId: string, code: string) {
        // Simplifikasi: Kita skip delete fisik, set status saja via frontend logic saveExam
        return { success: true };
    },

    async getResults(userId: string, examCode?: string) {
        const res = await callScript('getResults', {});
        let data = res.data || [];
        if (examCode) {
            data = data.filter((r: any) => r.examCode === examCode);
        }
        return data;
    },

    async saveResult(userId: string, result: any) {
        return callScript('saveResult', { data: result });
    },

    async getUserSpreadsheetId(id: string) { return id; },
    async getUserRole(email: string) { return { role: 'guru', school: 'Sekolah' }; },
    async updateUserRole() { return true; },
    async getAllAdmins() { return []; }
};
