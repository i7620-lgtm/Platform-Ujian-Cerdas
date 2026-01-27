
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
        if (!result.success && !result.data && !result.user) {
            throw new Error(result.error || "Database operation failed");
        }
        return result;
    } catch (e: any) {
        console.error(`DB Error [${action}]:`, e);
        throw new Error("Gagal menghubungi database: " + e.message);
    }
};

// --- ADAPTER METHODS (Agar kompatibel dengan kode API yang sudah ada) ---

export default {
    async getManualUser(username: string) {
        // Kita gunakan endpoint auth sederhana di Apps Script
        // Untuk login manual, password dikirim di frontend logic auth.ts, tapi disini kita simulasi fetch user
        // Karena Apps Script logic 'auth' mengecek user & pass, kita sesuaikan nanti.
        // Untuk sekarang, kita kembalikan null agar login via API Auth berjalan
        return null; 
    },
    
    // Login via Script
    async loginUser(username: string, password: string) {
        const res = await callScript('auth', { username, password });
        return res.user;
    },

    async getAllTeacherKeys() {
        // Dalam mode simple ini, kita anggap semua ujian ada di satu sheet
        // Jadi kita return dummy ID
        return ['GLOBAL_TEACHER']; 
    },

    // Karena Apps Script menangani semua data di satu sheet (atau split internal), 
    // userId tidak lagi menjadi pemisah sheet ID, tapi filter data.
    
    async getExams(userId: string) {
        const res = await callScript('getExams', {});
        // Filter di sisi serverless function jika perlu, atau ambil semua
        // Apps Script mengembalikan semua yang aktif
        return res.data || [];
    },

    async saveExam(userId: string, exam: any) {
        return callScript('saveExam', { data: exam });
    },

    async deleteExam(userId: string, code: string) {
        // Logic delete di Apps Script bisa diimplementasikan dengan set status 'DELETED'
        // Untuk sekarang kita reuse saveExam dengan status DELETED jika object exam dikirim
        // Atau buat action khusus di script
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

    // Stub function agar tidak error di auth.ts (tidak dipakai lagi di mode simple)
    async getUserSpreadsheetId(id: string) { return id; },
    async getUserRole(email: string) { return { role: 'guru', school: 'Sekolah' }; },
    async updateUserRole() { return true; },
    async getAllAdmins() { return []; }
};
