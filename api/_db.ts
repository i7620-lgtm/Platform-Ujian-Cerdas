
// api/_db.ts - Jembatan Stabil ke Google Apps Script

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
        if (!result.success && !result.data && !result.user && !result.users && action !== 'findUser') {
            throw new Error(result.error || "Database operation failed");
        }
        return result;
    } catch (e: any) {
        console.error(`DB Error [${action}]:`, e);
        throw new Error(e.message || "Gagal menghubungi database");
    }
};

export default {
    async getManualUser(username: string) { return null; },
    
    async loginUser(username: string, password: string) {
        // FIX: Menggunakan action 'login' agar sesuai dengan router di Code.gs
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
        // Mengaktifkan pemanggilan script sebenarnya untuk menghapus data di GAS
        return callScript('deleteExam', { code, userId });
    },

    // UPDATE: Support Sharding Params
    async getResults(userId: string, examCode?: string, className?: string) {
        // Kirim examCode dan className ke GAS agar GAS bisa memilih sheet yang tepat
        const res = await callScript('getResults', { examCode, className });
        let data = res.data || [];
        // Fallback client-side filter jika GAS mengembalikan semua data
        if (examCode) data = data.filter((r: any) => r.examCode === examCode);
        if (className && className !== 'ALL') data = data.filter((r: any) => r.student.class === className);
        return data;
    },

    async saveResult(userId: string, result: any) {
        // Kirim data lengkap termasuk className agar GAS bisa routing ke sheet yang benar
        return callScript('saveResult', { data: result });
    },

    async getUserSpreadsheetId(id: string) { return id; },
    async getUserRole(email: string) { return { role: 'guru', school: 'Sekolah' }; },
    async getAllAdmins() { return []; }
};
