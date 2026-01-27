
import crypto from 'crypto';
import { Buffer } from 'buffer';

// --- CONFIGURATION ---
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL || process.env.CLIENT_EMAIL;

// HELPER: PEMBERSIH ID YANG AGRESIF (ULTRA-ROBUST)
const cleanId = (input: string | undefined) => {
    if (!input) return undefined;
    
    // 1. Hapus semua spasi, tanda kutip ganda, tanda kutip tunggal, dan backtick
    let clean = input.replace(/[\s"'`]/g, '');
    
    // 2. Cek apakah ini URL lengkap (mengandung /d/)
    const urlMatch = clean.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (urlMatch && urlMatch[1]) {
        return urlMatch[1];
    }
    
    // 3. Jika user mengkopi ID tapi ada sisa path (misal: ID_DISINI/edit#gid=0)
    clean = clean.split('/')[0];
    clean = clean.split('?')[0];
    clean = clean.split('#')[0];

    return clean;
};

const MASTER_SHEET_ID = cleanId(process.env.MASTER_SHEET_ID);
const TEMPLATE_SHEET_ID = cleanId(process.env.TEMPLATE_SHEET_ID);

// --- SMART KEY FORMATTER ---
const formatPrivateKey = (key: string | undefined): string | null => {
    if (!key) return null;
    let cleanKey = key.replace(/^["']|["']$/g, '');
    cleanKey = cleanKey.split(String.raw`\n`).join('\n');
    const header = "-----BEGIN PRIVATE KEY-----";
    const footer = "-----END PRIVATE KEY-----";
    if (!cleanKey.includes(header)) cleanKey = `${header}\n${cleanKey}`;
    if (!cleanKey.includes(footer)) cleanKey = `${cleanKey}\n${footer}`;
    if (!cleanKey.includes('\n', header.length + 5)) {
         cleanKey = cleanKey.replace(header, `${header}\n`).replace(footer, `\n${footer}`).replace(/ /g, '\n');
    }
    return cleanKey;
};

const PRIVATE_KEY = formatPrivateKey(process.env.GOOGLE_PRIVATE_KEY || process.env.PRIVATE_KEY);

// --- DIAGNOSTIC LOGGING ---
console.log(`[DB INIT] Service Account: ${SERVICE_ACCOUNT_EMAIL ? 'Set' : 'MISSING'}`);
console.log(`[DB INIT] Master ID: ${MASTER_SHEET_ID ? MASTER_SHEET_ID.substring(0,5)+'...' : 'MISSING or Invalid'}`);

// --- TOKEN CACHE ---
let cachedToken: string | null = null;
let tokenExpiry = 0;

// --- JWT GENERATOR ---
const getAccessToken = async () => {
    if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
    if (!PRIVATE_KEY || !SERVICE_ACCOUNT_EMAIL) throw new Error("Credentials missing check .env");

    try {
        const header = { alg: 'RS256', typ: 'JWT' };
        const now = Math.floor(Date.now() / 1000);
        const claim = {
            iss: SERVICE_ACCOUNT_EMAIL,
            scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive',
            aud: 'https://oauth2.googleapis.com/token',
            exp: now + 3600,
            iat: now,
        };

        const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
        const encodedClaim = Buffer.from(JSON.stringify(claim)).toString('base64url');
        const sign = crypto.createSign('RSA-SHA256');
        sign.update(`${encodedHeader}.${encodedClaim}`);
        const signature = sign.sign(PRIVATE_KEY, 'base64url');
        const jwt = `${encodedHeader}.${encodedClaim}.${signature}`;

        const res = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Google Token Error: ${errText}`);
        }

        const data = await res.json() as any;
        cachedToken = data.access_token;
        tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;
        return cachedToken;
    } catch (e: any) {
        if (e.message.includes('error:04075070') || e.message.includes('pem')) {
             throw new Error(`FORMAT KEY SALAH: Private Key rusak.`);
        }
        throw e;
    }
};

// --- HELPER FETCH ---
const gFetch = async (url: string, options: any = {}): Promise<any> => {
    try {
        const token = await getAccessToken();
        options.headers = { ...options.headers, Authorization: `Bearer ${token}` };
        const res = await fetch(url, options);
        
        if (!res.ok) {
            const err = await res.text();
            if (res.status === 403) {
                const match = url.match(/(?:spreadsheets|files)\/([a-zA-Z0-9-_]+)/);
                const failedId = match ? match[1] : 'Unknown';
                let targetName = 'FILE/SHEET TIDAK DIKENAL';
                if (failedId === MASTER_SHEET_ID) targetName = 'DATABASE_MASTER_UJIAN';
                else if (failedId === TEMPLATE_SHEET_ID) targetName = 'TEMPLATE_DB_GURU';

                console.error(`[403] Access denied to ${targetName} (${failedId})`);
                throw new Error(`IZIN DITOLAK (403) ke ${targetName}.\nID: '${failedId}'\nEMAIL AKUN: '${SERVICE_ACCOUNT_EMAIL}'\nSolusi: Pastikan email Service Account di atas memiliki akses EDITOR ke file/sheet.`);
            }
            if (res.status === 404) {
                throw new Error(`SHEET TIDAK DITEMUKAN (404). Cek ID di .env.`);
            }
            throw new Error(`Google API Error [${res.status}]: ${err}`);
        }
        return res.json() as Promise<any>;
    } catch (e: any) {
        console.error("gFetch Error:", e.message);
        throw e;
    }
};

// --- CORE DB CLASS ---
class GoogleSheetsDB {
    private directoryCache: Record<string, string> = {}; 

    async getUserSpreadsheetId(userKey: string): Promise<string> {
        if (this.directoryCache[userKey]) return this.directoryCache[userKey];
        if (!MASTER_SHEET_ID) throw new Error("MASTER_SHEET_ID missing.");

        const range = 'DIRECTORY!A:B';
        const data = await this.readSheet(MASTER_SHEET_ID, range);
        const rows = data.values || [];
        
        const found = rows.find((r: string[]) => r[0] === userKey);
        if (found && found[1]) {
            this.directoryCache[userKey] = found[1];
            return found[1];
        }
        return this.provisionNewSheet(userKey);
    }

    async provisionNewSheet(userKey: string): Promise<string> {
        if (!TEMPLATE_SHEET_ID) throw new Error("TEMPLATE_SHEET_ID missing.");
        const copyUrl = `https://www.googleapis.com/drive/v3/files/${TEMPLATE_SHEET_ID}/copy`;
        const newFile = await gFetch(copyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: `DB_UJIAN_${userKey}` })
        });
        const newSheetId = newFile.id;
        if (userKey.includes('@')) {
            await gFetch(`https://www.googleapis.com/drive/v3/files/${newSheetId}/permissions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: 'writer', type: 'user', emailAddress: userKey })
            }).catch(e => console.warn("Share warn:", e));
        }
        await this.appendRow(MASTER_SHEET_ID!, 'DIRECTORY!A:B', [userKey, newSheetId]);
        this.directoryCache[userKey] = newSheetId;
        return newSheetId;
    }

    async readSheet(spreadsheetId: string, range: string) {
        return gFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`);
    }

    async appendRow(spreadsheetId: string, range: string, values: any[]) {
        return gFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`, {
            method: 'POST',
            body: JSON.stringify({ values: [values] })
        });
    }

    async updateRow(spreadsheetId: string, range: string, values: any[]) {
        return gFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`, {
            method: 'PUT',
            body: JSON.stringify({ values: [values] })
        });
    }

    // --- APP METHODS ---
    async getManualUser(username: string) {
        const data = await this.readSheet(MASTER_SHEET_ID!, 'USERS!A:G');
        const rows = data.values || [];
        const user = rows.find((r: string[]) => r[0] === username);
        if (!user) return null;
        return {
            username: user[0],
            password: user[1],
            full_name: user[2],
            account_type: user[3] || 'guru',
            school: user[4] || '',
            avatar_url: user[5] || ''
        };
    }

    async getUserRole(email: string) {
        const data = await this.readSheet(MASTER_SHEET_ID!, 'ROLES!A:C');
        const rows = data.values || [];
        const roleRow = rows.find((r: string[]) => r[0] === email);
        if (roleRow) return { role: roleRow[1], school: roleRow[2] };
        return { role: 'guru', school: '' };
    }

    async updateUserRole(email: string, role: string, school: string) {
        const data = await this.readSheet(MASTER_SHEET_ID!, 'ROLES!A:C');
        const rows = data.values || [];
        const rowIndex = rows.findIndex((r: string[]) => r[0] === email);
        if (rowIndex !== -1) {
            await this.updateRow(MASTER_SHEET_ID!, `ROLES!A${rowIndex + 1}:C${rowIndex + 1}`, [email, role, school]);
        } else {
            await this.appendRow(MASTER_SHEET_ID!, 'ROLES!A:C', [email, role, school]);
        }
    }

    async getAllAdmins() {
        const data = await this.readSheet(MASTER_SHEET_ID!, 'ROLES!A:C');
        return (data.values || []).map((r: string[]) => ({ email: r[0], role: r[1], school: r[2] }));
    }

    async getExams(userId: string) {
        const sheetId = await this.getUserSpreadsheetId(userId);
        const data = await this.readSheet(sheetId, 'BANK_SOAL!A:G');
        return (data.values || []).map((r: string[]) => {
            try {
                return {
                    code: r[0],
                    questions: JSON.parse(r[1] || '[]'),
                    config: JSON.parse(r[2] || '{}'),
                    createdAt: r[3],
                    status: r[4] || 'PUBLISHED',
                    authorId: r[5] || userId,
                    authorSchool: r[6] || ''
                };
            } catch(e) { return null; }
        }).filter(Boolean);
    }

    async saveExam(userId: string, exam: any) {
        const sheetId = await this.getUserSpreadsheetId(userId);
        const data = await this.readSheet(sheetId, 'BANK_SOAL!A:A');
        const codes = (data.values || []).map((r: string[]) => r[0]);
        const rowIndex = codes.indexOf(exam.code);
        const rowData = [exam.code, JSON.stringify(exam.questions), JSON.stringify(exam.config), exam.createdAt, exam.status, userId, exam.authorSchool];
        if (rowIndex !== -1) {
            await this.updateRow(sheetId, `BANK_SOAL!A${rowIndex + 1}:G${rowIndex + 1}`, rowData);
        } else {
            await this.appendRow(sheetId, 'BANK_SOAL!A:G', rowData);
        }
    }

    async deleteExam(userId: string, code: string) {
        const sheetId = await this.getUserSpreadsheetId(userId);
        const data = await this.readSheet(sheetId, 'BANK_SOAL!A:A');
        const rowIndex = (data.values || []).findIndex((r: string[]) => r[0] === code);
        if (rowIndex !== -1) {
            await this.updateRow(sheetId, `BANK_SOAL!A${rowIndex + 1}:G${rowIndex + 1}`, ['', '', '', '', 'DELETED', '', '']);
        }
    }

    async getResults(userId: string, examCode?: string) {
        const sheetId = await this.getUserSpreadsheetId(userId);
        const data = await this.readSheet(sheetId, 'REKAP_NILAI!A:I');
        return (data.values || []).map((r: string[]) => {
            if (examCode && r[0] !== examCode) return null;
            if (!r[0]) return null;
            try {
                const jsonData = JSON.parse(r[5] || '{}');
                return {
                    examCode: r[0],
                    student: { studentId: r[1], fullName: r[2], class: r[3], absentNumber: r[8] || '' },
                    score: parseInt(r[4] || '0'),
                    answers: jsonData.answers || {},
                    activityLog: jsonData.activityLog || [],
                    correctAnswers: jsonData.correctAnswers || 0,
                    totalQuestions: jsonData.totalQuestions || 0,
                    location: jsonData.location || '',
                    status: r[6],
                    timestamp: parseInt(r[7] || '0')
                };
            } catch (e) { return null; }
        }).filter(Boolean);
    }

    async saveResult(userId: string, result: any) {
        const sheetId = await this.getUserSpreadsheetId(userId);
        const data = await this.readSheet(sheetId, 'REKAP_NILAI!A:B');
        const rowIndex = (data.values || []).findIndex((r: string[]) => r[0] === result.examCode && r[1] === result.student.studentId);
        const jsonData = JSON.stringify({
            answers: result.answers,
            activityLog: result.activityLog,
            correctAnswers: result.correctAnswers,
            totalQuestions: result.totalQuestions,
            location: result.location
        });
        const rowData = [
            result.examCode, result.student.studentId, result.student.fullName, result.student.class,
            result.score, jsonData, result.status, result.timestamp, result.student.absentNumber
        ];
        if (rowIndex !== -1) {
            await this.updateRow(sheetId, `REKAP_NILAI!A${rowIndex + 1}:I${rowIndex + 1}`, rowData);
        } else {
            await this.appendRow(sheetId, 'REKAP_NILAI!A:I', rowData);
        }
    }

    async getAllTeacherKeys() {
        const data = await this.readSheet(MASTER_SHEET_ID!, 'DIRECTORY!A:A');
        return (data.values || []).map((r: string[]) => r[0]);
    }
}

export default new GoogleSheetsDB();

import crypto from 'crypto';
import { Buffer } from 'buffer';

// --- CONFIGURATION ---
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL || process.env.CLIENT_EMAIL;

// HELPER: PEMBERSIH ID YANG AGRESIF (ULTRA-ROBUST)
const cleanId = (input: string | undefined) => {
    if (!input) return undefined;
    
    // 1. Hapus semua spasi, tanda kutip ganda, tanda kutip tunggal, dan backtick
    let clean = input.replace(/[\s"'`]/g, '');
    
    // 2. Cek apakah ini URL lengkap (mengandung /d/)
    const urlMatch = clean.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (urlMatch && urlMatch[1]) {
        return urlMatch[1];
    }
    
    // 3. Jika user mengkopi ID tapi ada sisa path (misal: ID_DISINI/edit#gid=0)
    clean = clean.split('/')[0];
    clean = clean.split('?')[0];
    clean = clean.split('#')[0];

    return clean;
};

const MASTER_SHEET_ID = cleanId(process.env.MASTER_SHEET_ID);
const TEMPLATE_SHEET_ID = cleanId(process.env.TEMPLATE_SHEET_ID);

// --- SMART KEY FORMATTER ---
const formatPrivateKey = (key: string | undefined): string | null => {
    if (!key) return null;
    let cleanKey = key.replace(/^["']|["']$/g, '');
    cleanKey = cleanKey.split(String.raw`\n`).join('\n');
    const header = "-----BEGIN PRIVATE KEY-----";
    const footer = "-----END PRIVATE KEY-----";
    if (!cleanKey.includes(header)) cleanKey = `${header}\n${cleanKey}`;
    if (!cleanKey.includes(footer)) cleanKey = `${cleanKey}\n${footer}`;
    if (!cleanKey.includes('\n', header.length + 5)) {
         cleanKey = cleanKey.replace(header, `${header}\n`).replace(footer, `\n${footer}`).replace(/ /g, '\n');
    }
    return cleanKey;
};

const PRIVATE_KEY = formatPrivateKey(process.env.GOOGLE_PRIVATE_KEY || process.env.PRIVATE_KEY);

// --- DIAGNOSTIC LOGGING ---
console.log(`[DB INIT] Service Account: ${SERVICE_ACCOUNT_EMAIL ? 'Set' : 'MISSING'}`);
console.log(`[DB INIT] Master ID: ${MASTER_SHEET_ID ? MASTER_SHEET_ID.substring(0,5)+'...' : 'MISSING or Invalid'}`);

// --- TOKEN CACHE ---
let cachedToken: string | null = null;
let tokenExpiry = 0;

// --- JWT GENERATOR ---
const getAccessToken = async () => {
    if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
    if (!PRIVATE_KEY || !SERVICE_ACCOUNT_EMAIL) throw new Error("Credentials missing check .env");

    try {
        const header = { alg: 'RS256', typ: 'JWT' };
        const now = Math.floor(Date.now() / 1000);
        const claim = {
            iss: SERVICE_ACCOUNT_EMAIL,
            scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive',
            aud: 'https://oauth2.googleapis.com/token',
            exp: now + 3600,
            iat: now,
        };

        const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
        const encodedClaim = Buffer.from(JSON.stringify(claim)).toString('base64url');
        const sign = crypto.createSign('RSA-SHA256');
        sign.update(`${encodedHeader}.${encodedClaim}`);
        const signature = sign.sign(PRIVATE_KEY, 'base64url');
        const jwt = `${encodedHeader}.${encodedClaim}.${signature}`;

        const res = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Google Token Error: ${errText}`);
        }

        const data = await res.json() as any;
        cachedToken = data.access_token;
        tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;
        return cachedToken;
    } catch (e: any) {
        if (e.message.includes('error:04075070') || e.message.includes('pem')) {
             throw new Error(`FORMAT KEY SALAH: Private Key rusak.`);
        }
        throw e;
    }
};

// --- HELPER FETCH ---
const gFetch = async (url: string, options: any = {}): Promise<any> => {
    try {
        const token = await getAccessToken();
        options.headers = { ...options.headers, Authorization: `Bearer ${token}` };
        const res = await fetch(url, options);
        
        if (!res.ok) {
            const err = await res.text();
            if (res.status === 403) {
                const match = url.match(/(?:spreadsheets|files)\/([a-zA-Z0-9-_]+)/);
                const failedId = match ? match[1] : 'Unknown';
                let targetName = 'FILE/SHEET TIDAK DIKENAL';
                if (failedId === MASTER_SHEET_ID) targetName = 'DATABASE_MASTER_UJIAN';
                else if (failedId === TEMPLATE_SHEET_ID) targetName = 'TEMPLATE_DB_GURU';

                console.error(`[403] Access denied to ${targetName} (${failedId})`);
                throw new Error(`IZIN DITOLAK (403) ke ${targetName}.\nID: '${failedId}'\nSolusi: Pastikan email Service Account adalah EDITOR/VIEWER yang sesuai.`);
            }
            if (res.status === 404) {
                throw new Error(`SHEET TIDAK DITEMUKAN (404). Cek ID di .env.`);
            }
            throw new Error(`Google API Error [${res.status}]: ${err}`);
        }
        return res.json() as Promise<any>;
    } catch (e: any) {
        console.error("gFetch Error:", e.message);
        throw e;
    }
};

// --- CORE DB CLASS ---
class GoogleSheetsDB {
    private directoryCache: Record<string, string> = {}; 

    async getUserSpreadsheetId(userKey: string): Promise<string> {
        if (this.directoryCache[userKey]) return this.directoryCache[userKey];
        if (!MASTER_SHEET_ID) throw new Error("MASTER_SHEET_ID missing.");

        const range = 'DIRECTORY!A:B';
        const data = await this.readSheet(MASTER_SHEET_ID, range);
        const rows = data.values || [];
        
        const found = rows.find((r: string[]) => r[0] === userKey);
        if (found && found[1]) {
            this.directoryCache[userKey] = found[1];
            return found[1];
        }
        return this.provisionNewSheet(userKey);
    }

    async provisionNewSheet(userKey: string): Promise<string> {
        if (!TEMPLATE_SHEET_ID) throw new Error("TEMPLATE_SHEET_ID missing.");
        const copyUrl = `https://www.googleapis.com/drive/v3/files/${TEMPLATE_SHEET_ID}/copy`;
        const newFile = await gFetch(copyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: `DB_UJIAN_${userKey}` })
        });
        const newSheetId = newFile.id;
        if (userKey.includes('@')) {
            await gFetch(`https://www.googleapis.com/drive/v3/files/${newSheetId}/permissions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: 'writer', type: 'user', emailAddress: userKey })
            }).catch(e => console.warn("Share warn:", e));
        }
        await this.appendRow(MASTER_SHEET_ID!, 'DIRECTORY!A:B', [userKey, newSheetId]);
        this.directoryCache[userKey] = newSheetId;
        return newSheetId;
    }

    async readSheet(spreadsheetId: string, range: string) {
        return gFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`);
    }

    async appendRow(spreadsheetId: string, range: string, values: any[]) {
        return gFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`, {
            method: 'POST',
            body: JSON.stringify({ values: [values] })
        });
    }

    async updateRow(spreadsheetId: string, range: string, values: any[]) {
        return gFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`, {
            method: 'PUT',
            body: JSON.stringify({ values: [values] })
        });
    }

    // --- APP METHODS ---
    async getManualUser(username: string) {
        const data = await this.readSheet(MASTER_SHEET_ID!, 'USERS!A:G');
        const rows = data.values || [];
        const user = rows.find((r: string[]) => r[0] === username);
        if (!user) return null;
        return {
            username: user[0],
            password: user[1],
            full_name: user[2],
            account_type: user[3] || 'guru',
            school: user[4] || '',
            avatar_url: user[5] || ''
        };
    }

    async getUserRole(email: string) {
        const data = await this.readSheet(MASTER_SHEET_ID!, 'ROLES!A:C');
        const rows = data.values || [];
        const roleRow = rows.find((r: string[]) => r[0] === email);
        if (roleRow) return { role: roleRow[1], school: roleRow[2] };
        return { role: 'guru', school: '' };
    }

    async updateUserRole(email: string, role: string, school: string) {
        const data = await this.readSheet(MASTER_SHEET_ID!, 'ROLES!A:C');
        const rows = data.values || [];
        const rowIndex = rows.findIndex((r: string[]) => r[0] === email);
        if (rowIndex !== -1) {
            await this.updateRow(MASTER_SHEET_ID!, `ROLES!A${rowIndex + 1}:C${rowIndex + 1}`, [email, role, school]);
        } else {
            await this.appendRow(MASTER_SHEET_ID!, 'ROLES!A:C', [email, role, school]);
        }
    }

    async getAllAdmins() {
        const data = await this.readSheet(MASTER_SHEET_ID!, 'ROLES!A:C');
        return (data.values || []).map((r: string[]) => ({ email: r[0], role: r[1], school: r[2] }));
    }

    async getExams(userId: string) {
        const sheetId = await this.getUserSpreadsheetId(userId);
        const data = await this.readSheet(sheetId, 'BANK_SOAL!A:G');
        return (data.values || []).map((r: string[]) => {
            try {
                return {
                    code: r[0],
                    questions: JSON.parse(r[1] || '[]'),
                    config: JSON.parse(r[2] || '{}'),
                    createdAt: r[3],
                    status: r[4] || 'PUBLISHED',
                    authorId: r[5] || userId,
                    authorSchool: r[6] || ''
                };
            } catch(e) { return null; }
        }).filter(Boolean);
    }

    async saveExam(userId: string, exam: any) {
        const sheetId = await this.getUserSpreadsheetId(userId);
        const data = await this.readSheet(sheetId, 'BANK_SOAL!A:A');
        const codes = (data.values || []).map((r: string[]) => r[0]);
        const rowIndex = codes.indexOf(exam.code);
        const rowData = [exam.code, JSON.stringify(exam.questions), JSON.stringify(exam.config), exam.createdAt, exam.status, userId, exam.authorSchool];
        if (rowIndex !== -1) {
            await this.updateRow(sheetId, `BANK_SOAL!A${rowIndex + 1}:G${rowIndex + 1}`, rowData);
        } else {
            await this.appendRow(sheetId, 'BANK_SOAL!A:G', rowData);
        }
    }

    async deleteExam(userId: string, code: string) {
        const sheetId = await this.getUserSpreadsheetId(userId);
        const data = await this.readSheet(sheetId, 'BANK_SOAL!A:A');
        const rowIndex = (data.values || []).findIndex((r: string[]) => r[0] === code);
        if (rowIndex !== -1) {
            await this.updateRow(sheetId, `BANK_SOAL!A${rowIndex + 1}:G${rowIndex + 1}`, ['', '', '', '', 'DELETED', '', '']);
        }
    }

    async getResults(userId: string, examCode?: string) {
        const sheetId = await this.getUserSpreadsheetId(userId);
        const data = await this.readSheet(sheetId, 'REKAP_NILAI!A:I');
        return (data.values || []).map((r: string[]) => {
            if (examCode && r[0] !== examCode) return null;
            if (!r[0]) return null;
            try {
                const jsonData = JSON.parse(r[5] || '{}');
                return {
                    examCode: r[0],
                    student: { studentId: r[1], fullName: r[2], class: r[3], absentNumber: r[8] || '' },
                    score: parseInt(r[4] || '0'),
                    answers: jsonData.answers || {},
                    activityLog: jsonData.activityLog || [],
                    correctAnswers: jsonData.correctAnswers || 0,
                    totalQuestions: jsonData.totalQuestions || 0,
                    location: jsonData.location || '',
                    status: r[6],
                    timestamp: parseInt(r[7] || '0')
                };
            } catch (e) { return null; }
        }).filter(Boolean);
    }

    async saveResult(userId: string, result: any) {
        const sheetId = await this.getUserSpreadsheetId(userId);
        const data = await this.readSheet(sheetId, 'REKAP_NILAI!A:B');
        const rowIndex = (data.values || []).findIndex((r: string[]) => r[0] === result.examCode && r[1] === result.student.studentId);
        const jsonData = JSON.stringify({
            answers: result.answers,
            activityLog: result.activityLog,
            correctAnswers: result.correctAnswers,
            totalQuestions: result.totalQuestions,
            location: result.location
        });
        const rowData = [
            result.examCode, result.student.studentId, result.student.fullName, result.student.class,
            result.score, jsonData, result.status, result.timestamp, result.student.absentNumber
        ];
        if (rowIndex !== -1) {
            await this.updateRow(sheetId, `REKAP_NILAI!A${rowIndex + 1}:I${rowIndex + 1}`, rowData);
        } else {
            await this.appendRow(sheetId, 'REKAP_NILAI!A:I', rowData);
        }
    }

    async getAllTeacherKeys() {
        const data = await this.readSheet(MASTER_SHEET_ID!, 'DIRECTORY!A:A');
        return (data.values || []).map((r: string[]) => r[0]);
    }
}

export default new GoogleSheetsDB();
