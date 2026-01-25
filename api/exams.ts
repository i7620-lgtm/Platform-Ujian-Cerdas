
import type { VercelRequest, VercelResponse } from '@vercel/node';
// WAJIB menggunakan ekstensi .js saat mengimpor file lokal di mode ESM ("type": "module")
import db from './db.js';

// Cache untuk status tabel agar tidak menjalankan CREATE TABLE setiap kali request
let isTableInitialized = false;

// Definisi Skema Tabel yang Benar
const CREATE_TABLE_SQL = `
    CREATE TABLE IF NOT EXISTS exams (
        code TEXT PRIMARY KEY, 
        author_id TEXT DEFAULT 'anonymous',
        questions TEXT, 
        config TEXT,
        created_at TEXT DEFAULT '',
        status TEXT DEFAULT 'PUBLISHED',
        author_school TEXT DEFAULT ''
    );
`;

// Helper Shuffle
const shuffleArray = (array: any[]) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

// Fungsi inisialisasi tabel yang dijalankan sekali per cold-start
const ensureSchema = async () => {
    if (isTableInitialized) return;
    try {
        console.log("Checking/Creating 'exams' table...");
        await db.query(CREATE_TABLE_SQL);
        
        // MIGRATION CHECK:
        try {
             const checkSchool = await db.query(`
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'exams' AND column_name = 'author_school';
             `);
             if (checkSchool.rows.length === 0) {
                 console.log("Adding 'author_school' column...");
                 await db.query(`ALTER TABLE exams ADD COLUMN author_school TEXT DEFAULT '';`);
             }
        } catch (migError) {
            console.warn("Migration warning:", migError);
        }

        isTableInitialized = true;
        console.log("'exams' table verified.");
    } catch (error) {
        console.error("Failed to create table:", error);
    }
};

const sanitizeExam = (examRow: any) => {
    try {
        const questions = JSON.parse(examRow.questions || '[]');
        return { 
            code: examRow.code,
            authorId: examRow.author_id,
            authorSchool: examRow.author_school,
            questions,
            config: JSON.parse(examRow.config || '{}'),
            createdAt: examRow.created_at || '',
            status: examRow.status || 'PUBLISHED'
        };
    } catch (e) {
        return { code: examRow.code, questions: [], config: {}, createdAt: '', status: 'PUBLISHED' };
    }
};

const sanitizeForPublic = (exam: any) => {
    if (exam.questions && Array.isArray(exam.questions)) {
        exam.questions = exam.questions.map((q: any) => {
            const { correctAnswer, trueFalseRows, matchingPairs, ...rest } = q;
            const safeQ = { ...rest };
            if (trueFalseRows) {
                safeQ.trueFalseRows = trueFalseRows.map((r: any) => ({ text: r.text, answer: false }));
            }
            if (matchingPairs && Array.isArray(matchingPairs)) {
                 const rightValues = matchingPairs.map((p: any) => p.right || '');
                 const shuffledRights = shuffleArray(rightValues);
                 safeQ.matchingPairs = matchingPairs.map((p: any, idx: number) => ({ 
                     left: p.left, 
                     right: shuffledRights[idx] 
                 })); 
            }
            return safeQ;
        });
    }
    return exam;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
    
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        await ensureSchema();

        // --- GET: AMBIL DATA ---
        if (req.method === 'GET') {
            const { code, preview } = req.query;

            // -- PUBLIC ACCESS (STUDENT/PREVIEW) --
            if (code && req.url?.includes('public')) {
                const result = await db.query('SELECT * FROM exams WHERE code = $1', [code]);
                if (!result || result.rows.length === 0) return res.status(404).json({ error: 'Exam not found' });
                
                const exam = sanitizeExam(result.rows[0]);
                if (exam.status === 'DRAFT' && preview !== 'true') {
                    return res.status(403).json({ error: 'Exam is currently in draft mode.' });
                }
                return res.status(200).json(sanitizeForPublic(exam));
            } 
            
            // -- TEACHER ACCESS (FILTER BY ROLE) --
            else {
                // We expect context headers from the client to identify the user role
                // Note: In a production app, this should be validated via JWT/Session.
                // Here we trust the headers sent by our frontend App logic for the requirement context.
                const requesterRole = (req.headers['x-role'] as string) || 'normal';
                const requesterId = (req.headers['x-user-id'] as string) || '';
                const requesterSchool = (req.headers['x-school'] as string) || '';

                let query = 'SELECT * FROM exams';
                let params: any[] = [];

                if (requesterRole === 'super_admin') {
                    // Super Admin sees ALL
                    query += ' ORDER BY created_at DESC LIMIT 100';
                } else if (requesterRole === 'admin') {
                    // Admin sees ALL from their SCHOOL
                    query += ' WHERE author_school = $1 ORDER BY created_at DESC LIMIT 100';
                    params.push(requesterSchool);
                } else {
                    // Normal sees ONLY OWN exams
                    query += ' WHERE author_id = $1 ORDER BY created_at DESC LIMIT 100';
                    params.push(requesterId);
                }

                const result = await db.query(query, params);
                const data = result?.rows.map((row: any) => sanitizeExam(row)) || [];
                return res.status(200).json(data);
            }
        } 
        
        // --- POST: SIMPAN DATA BARU ---
        else if (req.method === 'POST') {
            const exam = req.body;
            if (!exam || !exam.code) return res.status(400).json({ error: "Invalid payload: 'code' is required" });

            const authorId = exam.authorId && exam.authorId.trim() !== '' ? exam.authorId : 'anonymous';
            const authorSchool = exam.authorSchool || ''; // Save the school context
            const createdAt = exam.createdAt || new Date().toLocaleString(); 
            const status = exam.status || 'PUBLISHED';

            const questionsJson = JSON.stringify(exam.questions || []);
            const configJson = JSON.stringify(exam.config || {});

            const query = `
                INSERT INTO exams (code, author_id, author_school, questions, config, created_at, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (code) 
                DO UPDATE SET 
                    author_id = EXCLUDED.author_id,
                    author_school = EXCLUDED.author_school,
                    questions = EXCLUDED.questions,
                    config = EXCLUDED.config,
                    created_at = EXCLUDED.created_at,
                    status = EXCLUDED.status
            `;

            await db.query(query, [exam.code, authorId, authorSchool, questionsJson, configJson, createdAt, status]);
            return res.status(200).json({ success: true, message: "Exam saved successfully" });
        }
        
        // --- PATCH & DELETE (Existing Logic) ---
        else if (req.method === 'PATCH') {
            const { code, questionId, imageUrl, optionImages } = req.body;
            if (!code || !questionId) return res.status(400).json({ error: "Missing parameters" });
            // ... (keep existing patch logic)
            const client = await db.getClient();
            try {
                await client.query('BEGIN');
                const result = await client.query('SELECT questions FROM exams WHERE code = $1 FOR UPDATE', [code]);
                if (result.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: "Exam not found" }); }
                let questions = JSON.parse(result.rows[0].questions);
                let found = false;
                questions = questions.map((q: any) => {
                    if (q.id === questionId) {
                        found = true;
                        if (imageUrl !== undefined) q.imageUrl = imageUrl;
                        if (optionImages !== undefined) q.optionImages = optionImages;
                    }
                    return q;
                });
                if (!found) { await client.query('ROLLBACK'); return res.status(404).json({ error: "Question not found" }); }
                await client.query('UPDATE exams SET questions = $1 WHERE code = $2', [JSON.stringify(questions), code]);
                await client.query('COMMIT');
                return res.status(200).json({ success: true });
            } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
        }
        else if (req.method === 'DELETE') {
            const { code } = req.query;
            if (!code) return res.status(400).json({ error: "Exam code is required" });
            const client = await db.getClient();
            try {
                await client.query('BEGIN');
                await client.query('DELETE FROM results WHERE exam_code = $1', [code]);
                await client.query('DELETE FROM exams WHERE code = $1', [code]);
                await client.query('COMMIT');
                return res.status(200).json({ success: true });
            } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
        }

        return res.status(405).json({ error: 'Method not allowed' });
        
    } catch (error: any) {
        console.error("API Fatal Error:", error);
        return res.status(500).json({ 
            error: "Internal Server Error", 
            message: error.message || "Unknown error occurred"
        });
    }
}
