

import crypto from 'crypto';
import { Buffer } from 'buffer';

// --- CONFIGURATION ---
// Mendukung GOOGLE_CLIENT_EMAIL (standar) atau CLIENT_EMAIL (umum)
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL || process.env.CLIENT_EMAIL;
const MASTER_SHEET_ID = process.env.MASTER_SHEET_ID;
const TEMPLATE_SHEET_ID = process.env.TEMPLATE_SHEET_ID;

// Robust Private Key Parsing
const getPrivateKey = () => {
    // Mendukung GOOGLE_PRIVATE_KEY (standar) atau PRIVATE_KEY (umum)
    let key = process.env.GOOGLE_PRIVATE_KEY || process.env.PRIVATE_KEY;
    if (!key) return null;
    
    // Sanitize: Remove surrounding double quotes if present (common Vercel env var paste error)
    if (key.startsWith('"') && key.endsWith('"')) {
        key = key.substring(1, key.length - 1);
    }
    // Sanitize: Remove surrounding single quotes if present
    if (key.startsWith("'") && key.endsWith("'")) {
        key = key.substring(1, key.length - 1);
    }

    // Handle both literal string "\n" (from JSON copy-paste) and actual newlines
    if (key.includes('\\n')) {
        return key.replace(/\\n/g, '\n');
    }
    return key;
};

const PRIVATE_KEY = getPrivateKey();

// --- DIAGNOSTIC LOGGING (To Vercel Logs) ---
if (!SERVICE_ACCOUNT_EMAIL || !PRIVATE_KEY || !MASTER_SHEET_ID) {
    console.error("CRITICAL ERROR: Missing Google Sheets Credentials.");
    console.error("Email Configured:", !!SERVICE_ACCOUNT_EMAIL);
    console.error("Key Configured:", !!PRIVATE_KEY ? "Yes (Length: " + PRIVATE_KEY.length + ")" : "No");
    console.error("Master Sheet ID Configured:", !!MASTER_SHEET_ID);
} else {
    // Log success initialization (masked)
    console.log("DB Initialized. Service Account:", SERVICE_ACCOUNT_EMAIL);
}

// --- TOKEN CACHE ---
let cachedToken: string | null = null;
let tokenExpiry = 0;

// --- JWT GENERATOR (Native Node.js implementation) ---
const getAccessToken = async () => {
    if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
    if (!PRIVATE_KEY || !SERVICE_ACCOUNT_EMAIL) throw new Error("Credentials not configured in Environment Variables.");

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
        
        // This line often fails if Key format is invalid (e.g. missing -----BEGIN PRIVATE KEY-----)
        const signature = sign.sign(PRIVATE_KEY, 'base64url');
        const jwt = `${encodedHeader}.${encodedClaim}.${signature}`;

        const res = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error('Google Token Error Response:', errText);
            throw new Error(`Gagal mendapatkan Token Google: ${errText}`);
        }

        const data = await res.json() as any;
        if (data.access_token) {
            cachedToken = data.access_token;
            tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;
            return cachedToken;
        }
        throw new Error('Gagal mendapatkan Google Access Token (Response kosong)');
    } catch (e: any) {
        console.error("JWT Generation Failed:", e.message);
        // Provide hint if key seems wrong
        if (e.message.includes('error:04075070') || e.message.includes('pem')) {
             throw new Error("Format Private Key salah. Pastikan menyalin lengkap dari '-----BEGIN' sampai 'END-----' dan ganti \\n dengan baris baru.");
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
            // Log specific Google errors (like 403 Forbidden, 404 Not Found)
            console.error(`Google API Error [${res.status}]:`, url, err);
            
            if (res.status === 403) {
                throw new Error(`Izin Ditolak (403). Pastikan email Service Account '${SERVICE_ACCOUNT_EMAIL}' sudah ditambahkan sebagai 'Editor' di Spreadsheet Master & Template.`);
            }
            if (res.status === 404) {
                throw new Error(`Spreadsheet tidak ditemukan (404). Periksa MASTER_SHEET_ID atau TEMPLATE_SHEET_ID.`);
            }
            if (res.status === 400) {
                 throw new Error(`Bad Request (400). Kemungkinan struktur Sheet tidak sesuai.`);
            }
            
            throw new Error(`Google API Error: ${res.statusText} - ${err}`);
        }
        return res.json() as Promise<any>;
    } catch (e: any) {
        console.error("gFetch Wrapper Error:", e.message);
        throw e;
    }
};

// --- CORE DB CLASS ---
class GoogleSheetsDB {
    
    // Cache Directory to minimize reads
    private directoryCache: Record<string, string> = {}; 

    // 1. Resolve User's Spreadsheet ID from Master Directory
    async getUserSpreadsheetId(userKey: string): Promise<string> {
        if (this.directoryCache[userKey]) return this.directoryCache[userKey];

        // Read Directory
        const range = 'DIRECTORY!A:B';
        const data = await this.readSheet(MASTER_SHEET_ID!, range);
        const rows = data.values || [];
        
        const found = rows.find((r: string[]) => r[0] === userKey);
        if (found && found[1]) {
            this.directoryCache[userKey] = found[1];
            return found[1];
        }

        // If not found, CREATE NEW SHEET from Template
        return this.provisionNewSheet(userKey);
    }

    async provisionNewSheet(userKey: string): Promise<string> {
        if (!TEMPLATE_SHEET_ID) throw new Error("Template Sheet ID not configured");

        // Copy Template
        const copyUrl = `https://www.googleapis.com/drive/v3/files/${TEMPLATE_SHEET_ID}/copy`;
        const newFile = await gFetch(copyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: `DB_UJIAN_${userKey}` })
        });

        const newSheetId = newFile.id;

        // Share with user (if it's an email)
        if (userKey.includes('@')) {
            await gFetch(`https://www.googleapis.com/drive/v3/files/${newSheetId}/permissions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: 'writer', type: 'user', emailAddress: userKey })
            }).catch(e => console.warn("Could not share sheet with user (might be service account limitation, but DB is usable)", e));
        }

        // Register in Directory
        await this.appendRow(MASTER_SHEET_ID!, 'DIRECTORY!A:B', [userKey, newSheetId]);
        this.directoryCache[userKey] = newSheetId;
        
        return newSheetId;
    }

    // --- GENERIC SHEET OPERATIONS ---

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

    // --- APPLICATION SPECIFIC METHODS ---

    // USERS (Manual Login) - Stored in MASTER
    async getManualUser(username: string) {
        const data = await this.readSheet(MASTER_SHEET_ID!, 'USERS!A:G');
        const rows = data.values || [];
        // Col A: username, B: password, C: full_name, D: role, E: school, F: avatar
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

    // ROLES - Stored in MASTER
    async getUserRole(email: string) {
        const data = await this.readSheet(MASTER_SHEET_ID!, 'ROLES!A:C');
        const rows = data.values || [];
        // A: email, B: role, C: school
        const roleRow = rows.find((r: string[]) => r[0] === email);
        if (roleRow) {
            return { role: roleRow[1], school: roleRow[2] };
        }
        return { role: 'guru', school: '' };
    }

    async updateUserRole(email: string, role: string, school: string) {
        const data = await this.readSheet(MASTER_SHEET_ID!, 'ROLES!A:C');
        const rows = data.values || [];
        const rowIndex = rows.findIndex((r: string[]) => r[0] === email);

        if (rowIndex !== -1) {
            // Update existing (Row index is 1-based in sheets, so +1)
            const range = `ROLES!A${rowIndex + 1}:C${rowIndex + 1}`;
            await this.updateRow(MASTER_SHEET_ID!, range, [email, role, school]);
        } else {
            // Append new
            await this.appendRow(MASTER_SHEET_ID!, 'ROLES!A:C', [email, role, school]);
        }
    }

    async getAllAdmins() {
        const data = await this.readSheet(MASTER_SHEET_ID!, 'ROLES!A:C');
        return (data.values || []).map((r: string[]) => ({ email: r[0], role: r[1], school: r[2] }));
    }

    // EXAMS - Stored in TEACHER SHEET
    async getExams(userId: string) {
        const sheetId = await this.getUserSpreadsheetId(userId);
        const data = await this.readSheet(sheetId, 'BANK_SOAL!A:G'); // A:Code, B:JSON, C:Config, D:Created, E:Status, F:Author, G:School
        const rows = data.values || [];
        // Skip header usually, but simplified here
        return rows.map((r: string[]) => {
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
        
        // Check if exists to update
        const data = await this.readSheet(sheetId, 'BANK_SOAL!A:A');
        const codes = (data.values || []).map((r: string[]) => r[0]);
        const rowIndex = codes.indexOf(exam.code);

        const rowData = [
            exam.code,
            JSON.stringify(exam.questions),
            JSON.stringify(exam.config),
            exam.createdAt,
            exam.status,
            userId,
            exam.authorSchool
        ];

        if (rowIndex !== -1) {
            await this.updateRow(sheetId, `BANK_SOAL!A${rowIndex + 1}:G${rowIndex + 1}`, rowData);
        } else {
            await this.appendRow(sheetId, 'BANK_SOAL!A:G', rowData);
        }
    }

    async deleteExam(userId: string, code: string) {
        const sheetId = await this.getUserSpreadsheetId(userId);
        const data = await this.readSheet(sheetId, 'BANK_SOAL!A:A');
        const rows = data.values || [];
        const rowIndex = rows.findIndex((r: string[]) => r[0] === code);
        
        if (rowIndex !== -1) {
            await this.updateRow(sheetId, `BANK_SOAL!A${rowIndex + 1}:G${rowIndex + 1}`, ['', '', '', '', 'DELETED', '', '']);
        }
    }

    // RESULTS - Stored in TEACHER SHEET
    async getResults(userId: string, examCode?: string) {
        const sheetId = await this.getUserSpreadsheetId(userId);
        const data = await this.readSheet(sheetId, 'REKAP_NILAI!A:I'); 
        // A:ExamCode, B:StudentId, C:Name, D:Class, E:Score, F:JSON(Answers+Log), G:Status, H:Timestamp, I:AbsentNum
        const rows = data.values || [];
        
        return rows.map((r: string[]) => {
            if (examCode && r[0] !== examCode) return null;
            if (!r[0]) return null; // Empty row
            try {
                const jsonData = JSON.parse(r[5] || '{}');
                return {
                    examCode: r[0],
                    student: {
                        studentId: r[1],
                        fullName: r[2],
                        class: r[3],
                        absentNumber: r[8] || ''
                    },
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
        
        // Find existing result to update
        const data = await this.readSheet(sheetId, 'REKAP_NILAI!A:B'); // A:ExamCode, B:StudentId
        const rows = data.values || [];
        
        const rowIndex = rows.findIndex((r: string[]) => r[0] === result.examCode && r[1] === result.student.studentId);

        const jsonData = JSON.stringify({
            answers: result.answers,
            activityLog: result.activityLog,
            correctAnswers: result.correctAnswers,
            totalQuestions: result.totalQuestions,
            location: result.location
        });

        const rowData = [
            result.examCode,
            result.student.studentId,
            result.student.fullName,
            result.student.class,
            result.score,
            jsonData,
            result.status,
            result.timestamp,
            result.student.absentNumber
        ];

        if (rowIndex !== -1) {
            await this.updateRow(sheetId, `REKAP_NILAI!A${rowIndex + 1}:I${rowIndex + 1}`, rowData);
        } else {
            await this.appendRow(sheetId, 'REKAP_NILAI!A:I', rowData);
        }
    }

    // SUPER ADMIN FEATURE: Get Directory to Iterate All Teachers
    async getAllTeacherKeys() {
        const data = await this.readSheet(MASTER_SHEET_ID!, 'DIRECTORY!A:A');
        return (data.values || []).map((r: string[]) => r[0]);
    }
}

export default new GoogleSheetsDB();
