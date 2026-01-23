
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
        created_at TEXT DEFAULT '',
        status TEXT DEFAULT 'PUBLISHED'
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
        // Jika tabel sudah ada dengan created_at tipe BIGINT, kita harus mengubahnya menjadi TEXT
        try {
             const checkType = await db.query(`
                SELECT data_type FROM information_schema.columns 
                WHERE table_name = 'exams' AND column_name = 'created_at';
             `);
             
             if (checkType.rows.length > 0 && checkType.rows[0].data_type !== 'text') {
                 console.log("Migrating created_at column to TEXT...");
                 await db.query(`ALTER TABLE exams ALTER COLUMN created_at TYPE TEXT USING created_at::text;`);
             }

             // Check status column
             const checkStatus = await db.query(`
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'exams' AND column_name = 'status';
             `);
             if (checkStatus.rows.length === 0) {
                 console.log("Adding 'status' column...");
                 await db.query(`ALTER TABLE exams ADD COLUMN status TEXT DEFAULT 'PUBLISHED';`);
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
            questions,
            config: JSON.parse(examRow.config || '{}'),
            createdAt: examRow.created_at || '',
            status: examRow.status || 'PUBLISHED'
        };
    } catch (e) {
        return { code: examRow.code, questions: [], config: {}, createdAt: '', status: 'PUBLISHED' };
    }
};

// Security: Strip answers for student view but KEEP OPTIONS valid
const sanitizeForPublic = (exam: any) => {
    if (exam.questions && Array.isArray(exam.questions)) {
        exam.questions = exam.questions.map((q: any) => {
            // Destructure to remove sensitive fields
            const { correctAnswer, trueFalseRows, matchingPairs, ...rest } = q;
            const safeQ = { ...rest };
            
            // Handle complex types
            if (trueFalseRows) {
                // Keep text, set dummy answer
                safeQ.trueFalseRows = trueFalseRows.map((r: any) => ({ text: r.text, answer: false }));
            }
            if (matchingPairs && Array.isArray(matchingPairs)) {
                 // SECURITY FIX: Do not set to '?', instead SHUFFLE the right options.
                 // This ensures the student sees valid options in the dropdown but the connection is broken.
                 // If data is empty/missing, send empty string, NOT '?'.
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
    // CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
    
    // ANTI-CACHE HEADERS (CRITICAL FIX)
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        await ensureSchema();

        // --- GET: AMBIL DATA ---
        if (req.method === 'GET') {
            const { code, preview } = req.query;

            if (code && req.url?.includes('public')) {
                const result = await db.query('SELECT * FROM exams WHERE code = $1', [code]);
                if (!result || result.rows.length === 0) return res.status(404).json({ error: 'Exam not found' });
                
                const exam = sanitizeExam(result.rows[0]);
                
                // Block Drafts from Public View UNLESS in Preview Mode
                if (exam.status === 'DRAFT' && preview !== 'true') {
                    return res.status(403).json({ error: 'Exam is currently in draft mode.' });
                }

                // Secure the public endpoint by stripping answers safely
                return res.status(200).json(sanitizeForPublic(exam));
            } else {
                // Return everything to teacher (Drafts + Published)
                const result = await db.query('SELECT * FROM exams ORDER BY created_at DESC LIMIT 100');
                const data = result?.rows.map((row: any) => sanitizeExam(row)) || [];
                return res.status(200).json(data);
            }
        } 
        
        // --- POST: SIMPAN DATA BARU ---
        else if (req.method === 'POST') {
            const exam = req.body;
            if (!exam || !exam.code) return res.status(400).json({ error: "Invalid payload: 'code' is required" });

            const authorId = exam.authorId && exam.authorId.trim() !== '' ? exam.authorId : 'anonymous';
            const createdAt = exam.createdAt || new Date().toLocaleString(); 
            const status = exam.status || 'PUBLISHED';

            const questionsJson = JSON.stringify(exam.questions || []);
            const configJson = JSON.stringify(exam.config || {});

            const query = `
                INSERT INTO exams (code, author_id, questions, config, created_at, status)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (code) 
                DO UPDATE SET 
                    author_id = EXCLUDED.author_id,
                    questions = EXCLUDED.questions,
                    config = EXCLUDED.config,
                    created_at = EXCLUDED.created_at,
                    status = EXCLUDED.status
            `;

            await db.query(query, [exam.code, authorId, questionsJson, configJson, createdAt, status]);
            return res.status(200).json({ success: true, message: "Exam saved successfully" });
        }
        
        // --- PATCH: UPDATE GAMBAR ---
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
        // --- DELETE: HAPUS UJIAN ---
        else if (req.method === 'DELETE') {
            const { code } = req.query;
            if (!code) return res.status(400).json({ error: "Exam code is required" });
            
            const client = await db.getClient();
            try {
                await client.query('BEGIN');
                // Hapus result terkait terlebih dahulu untuk integritas data
                await client.query('DELETE FROM results WHERE exam_code = $1', [code]);
                // Hapus ujian itu sendiri
                await client.query('DELETE FROM exams WHERE code = $1', [code]);
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
