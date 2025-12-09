
import type { VercelRequest, VercelResponse } from '@vercel/node';
// WAJIB menggunakan ekstensi .js saat mengimpor file lokal di mode ESM ("type": "module")
import db from './db.js';

// Cache untuk status tabel agar tidak menjalankan CREATE TABLE setiap kali request
let isTableInitialized = false;

// Definisi Skema Tabel yang Benar dengan PRIMARY KEY
const CREATE_TABLE_SQL = `
    CREATE TABLE IF NOT EXISTS exams (
        code TEXT PRIMARY KEY, 
        author_id TEXT DEFAULT 'anonymous',
        questions TEXT, 
        config TEXT,
        created_at BIGINT DEFAULT 0
    );
`;

// Fungsi inisialisasi tabel yang dijalankan sekali per cold-start
const ensureSchema = async () => {
    if (isTableInitialized) return;
    try {
        console.log("Checking/Creating 'exams' table...");
        await db.query(CREATE_TABLE_SQL);
        isTableInitialized = true;
        console.log("'exams' table verified.");
    } catch (error) {
        console.error("Failed to create table:", error);
        // Jangan throw error di sini, biarkan query utama mencoba berjalan
    }
};

const sanitizeExam = (examRow: any) => {
    try {
        const questions = JSON.parse(examRow.questions || '[]');
        return { 
            code: examRow.code,
            authorId: examRow.author_id,
            questions,
            config: JSON.parse(examRow.config || '{}'),
            createdAt: parseInt(examRow.created_at || '0')
        };
    } catch (e) {
        return { code: examRow.code, questions: [], config: {}, createdAt: 0 };
    }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        // Pastikan tabel ada sebelum melakukan operasi apapun
        await ensureSchema();

        // --- GET: AMBIL DATA ---
        if (req.method === 'GET') {
            const { code } = req.query;

            if (code && req.url?.includes('public')) {
                const result = await db.query('SELECT * FROM exams WHERE code = $1', [code]);
                if (!result || result.rows.length === 0) return res.status(404).json({ error: 'Exam not found' });
                return res.status(200).json(sanitizeExam(result.rows[0]));
            } else {
                const result = await db.query('SELECT * FROM exams ORDER BY created_at DESC LIMIT 50');
                const data = result?.rows.map((row: any) => sanitizeExam(row)) || [];
                return res.status(200).json(data);
            }
        } 
        
        // --- POST: SIMPAN DATA BARU ---
        else if (req.method === 'POST') {
            const exam = req.body;
            if (!exam || !exam.code) return res.status(400).json({ error: "Invalid payload: 'code' is required" });

            const authorId = exam.authorId || 'anonymous';
            const createdAt = exam.createdAt || Date.now();
            const questionsJson = JSON.stringify(exam.questions || []);
            const configJson = JSON.stringify(exam.config || {});

            // Karena kita sudah memastikan tabel dibuat dengan PRIMARY KEY (code),
            // kita bisa menggunakan ON CONFLICT yang jauh lebih efisien.
            const query = `
                INSERT INTO exams (code, author_id, questions, config, created_at)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (code) 
                DO UPDATE SET 
                    author_id = EXCLUDED.author_id,
                    questions = EXCLUDED.questions,
                    config = EXCLUDED.config,
                    created_at = EXCLUDED.created_at
            `;

            await db.query(query, [exam.code, authorId, questionsJson, configJson, createdAt]);
            return res.status(200).json({ success: true, message: "Exam saved successfully" });
        }
        
        // --- PATCH: UPDATE GAMBAR (TRANSAKSI) ---
        else if (req.method === 'PATCH') {
            const { code, questionId, imageUrl, optionImages } = req.body;
            if (!code || !questionId) return res.status(400).json({ error: "Missing parameters" });

            const client = await db.getClient();
            try {
                await client.query('BEGIN');
                const result = await client.query('SELECT questions FROM exams WHERE code = $1 FOR UPDATE', [code]);
                
                if (result.rows.length === 0) {
                    await client.query('ROLLBACK');
                    return res.status(404).json({ error: "Exam not found" });
                }

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

                if (!found) {
                    await client.query('ROLLBACK');
                    return res.status(404).json({ error: "Question not found" });
                }

                await client.query('UPDATE exams SET questions = $1 WHERE code = $2', [JSON.stringify(questions), code]);
                await client.query('COMMIT');
                return res.status(200).json({ success: true });
            } catch (e) {
                await client.query('ROLLBACK');
                throw e;
            } finally {
                client.release();
            }
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
