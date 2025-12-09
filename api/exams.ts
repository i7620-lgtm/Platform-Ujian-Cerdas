
import type { VercelRequest, VercelResponse } from '@vercel/node';
// WAJIB menggunakan ekstensi .js saat mengimpor file lokal di mode ESM ("type": "module")
import db from './db.js';

// Cache untuk status tabel agar tidak menjalankan CREATE TABLE setiap kali request
let isTableInitialized = false;

// Definisi Skema Tabel yang Benar
// created_at menggunakan TEXT agar bisa menyimpan format tanggal/waktu yang mudah dibaca (misal "2024-05-20 10:00")
const CREATE_TABLE_SQL = `
    CREATE TABLE IF NOT EXISTS exams (
        code TEXT PRIMARY KEY, 
        author_id TEXT DEFAULT 'anonymous',
        questions TEXT, 
        config TEXT,
        created_at TEXT DEFAULT '' 
    );
`;

// Fungsi inisialisasi tabel yang dijalankan sekali per cold-start
const ensureSchema = async () => {
    if (isTableInitialized) return;
    try {
        console.log("Checking/Creating 'exams' table...");
        await db.query(CREATE_TABLE_SQL);
        
        // MIGRATION CHECK:
        // Jika tabel sudah ada dengan created_at tipe BIGINT, kita harus mengubahnya menjadi TEXT
        // agar sesuai dengan request user untuk menyimpan "tanggal dan waktu" yang dapat dibaca.
        try {
             // Cek tipe data kolom (Postgres specific)
             const checkType = await db.query(`
                SELECT data_type FROM information_schema.columns 
                WHERE table_name = 'exams' AND column_name = 'created_at';
             `);
             
             if (checkType.rows.length > 0 && checkType.rows[0].data_type !== 'text') {
                 console.log("Migrating created_at column to TEXT...");
                 // Alter column type. Konversi angka ke string jika perlu.
                 await db.query(`ALTER TABLE exams ALTER COLUMN created_at TYPE TEXT USING created_at::text;`);
             }
        } catch (migError) {
            console.warn("Migration warning (created_at):", migError);
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
            questions,
            config: JSON.parse(examRow.config || '{}'),
            createdAt: examRow.created_at || '' // Sekarang string
        };
    } catch (e) {
        return { code: examRow.code, questions: [], config: {}, createdAt: '' };
    }
};

// Security: Strip answers for student view
const sanitizeForPublic = (exam: any) => {
    if (exam.questions && Array.isArray(exam.questions)) {
        exam.questions = exam.questions.map((q: any) => {
            // Destructure to remove sensitive fields
            const { correctAnswer, trueFalseRows, matchingPairs, ...rest } = q;
            const safeQ = { ...rest };
            
            // Handle complex types
            if (trueFalseRows) {
                safeQ.trueFalseRows = trueFalseRows.map((r: any) => ({ text: r.text, answer: false })); // Dummy answer
            }
            if (matchingPairs) {
                 safeQ.matchingPairs = matchingPairs.map((p: any) => ({ left: p.left, right: '?' })); // Strip pair
            }
            return safeQ;
        });
    }
    return exam;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        await ensureSchema();

        // --- GET: AMBIL DATA ---
        if (req.method === 'GET') {
            const { code } = req.query;

            if (code && req.url?.includes('public')) {
                const result = await db.query('SELECT * FROM exams WHERE code = $1', [code]);
                if (!result || result.rows.length === 0) return res.status(404).json({ error: 'Exam not found' });
                
                const exam = sanitizeExam(result.rows[0]);
                // Secure the public endpoint by stripping answers
                return res.status(200).json(sanitizeForPublic(exam));
            } else {
                // Teacher view gets full data (with answers)
                // Order by created_at DESC (String sort is okay for ISO, acceptable for others)
                const result = await db.query('SELECT * FROM exams ORDER BY created_at DESC LIMIT 50');
                const data = result?.rows.map((row: any) => sanitizeExam(row)) || [];
                return res.status(200).json(data);
            }
        } 
        
        // --- POST: SIMPAN DATA BARU ---
        else if (req.method === 'POST') {
            const exam = req.body;
            if (!exam || !exam.code) return res.status(400).json({ error: "Invalid payload: 'code' is required" });

            // Pastikan authorId diambil dari body, fallback ke anonymous
            const authorId = exam.authorId && exam.authorId.trim() !== '' ? exam.authorId : 'anonymous';
            
            // createdAt sekarang berupa String tanggal & waktu
            const createdAt = exam.createdAt || new Date().toLocaleString(); 

            const questionsJson = JSON.stringify(exam.questions || []);
            const configJson = JSON.stringify(exam.config || {});

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
