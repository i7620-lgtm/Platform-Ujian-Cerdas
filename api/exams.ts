
import type { VercelRequest, VercelResponse } from '@vercel/node';
import db from './db';

// Definisi Tabel untuk Lazy Creation
const CREATE_TABLE_SQL = `
    CREATE TABLE IF NOT EXISTS exams (
        code TEXT PRIMARY KEY, 
        author_id TEXT DEFAULT 'anonymous',
        questions TEXT, 
        config TEXT,
        created_at BIGINT DEFAULT 0
    );
`;

// Helper: Menjalankan query dengan auto-retry jika tabel belum ada
const executeWithLazyMigration = async (operation: () => Promise<any>) => {
    try {
        return await operation();
    } catch (error: any) {
        // Error code 42P01 berarti "undefined_table" (Tabel tidak ditemukan)
        if (error.code === '42P01') {
            console.log("Table missing, creating table...");
            await db.query(CREATE_TABLE_SQL);
            return await operation(); // Coba lagi setelah buat tabel
        }
        throw error;
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
        // --- GET: AMBIL DATA ---
        if (req.method === 'GET') {
            const { code } = req.query;

            return await executeWithLazyMigration(async () => {
                if (code && req.url?.includes('public')) {
                    const result = await db.query('SELECT * FROM exams WHERE code = $1', [code]);
                    if (!result || result.rows.length === 0) return res.status(404).json({ error: 'Exam not found' });
                    return res.status(200).json(sanitizeExam(result.rows[0]));
                } else {
                    const result = await db.query('SELECT * FROM exams ORDER BY created_at DESC LIMIT 50');
                    const data = result?.rows.map((row: any) => sanitizeExam(row)) || [];
                    return res.status(200).json(data);
                }
            });
        } 
        
        // --- POST: SIMPAN DATA BARU (SKELETON) ---
        else if (req.method === 'POST') {
            const exam = req.body;
            if (!exam || !exam.code) return res.status(400).json({ error: "Invalid payload" });

            const authorId = exam.authorId || 'anonymous';
            const createdAt = exam.createdAt || Date.now();
            const questionsJson = JSON.stringify(exam.questions || []);
            const configJson = JSON.stringify(exam.config || {});

            return await executeWithLazyMigration(async () => {
                // Strategi: UPDATE dulu, jika tidak ada row, baru INSERT.
                // Ini menghindari error Primary Key jika tabel dibuat manual sebelumnya.
                const updateRes = await db.query(`
                    UPDATE exams 
                    SET author_id = $2, questions = $3, config = $4, created_at = $5
                    WHERE code = $1
                `, [exam.code, authorId, questionsJson, configJson, createdAt]);

                if (updateRes.rowCount === 0) {
                    await db.query(`
                        INSERT INTO exams (code, author_id, questions, config, created_at)
                        VALUES ($1, $2, $3, $4, $5)
                    `, [exam.code, authorId, questionsJson, configJson, createdAt]);
                }
                return res.status(200).json({ success: true });
            });
        }
        
        // --- PATCH: UPDATE GAMBAR (ATOMIC TRANSACTION) ---
        else if (req.method === 'PATCH') {
            const { code, questionId, imageUrl, optionImages } = req.body;
            if (!code || !questionId) return res.status(400).json({ error: "Missing parameters" });

            // Helper khusus untuk transaksi karena butuh client yang sama
            const runTransaction = async () => {
                const client = await db.getClient();
                try {
                    await client.query('BEGIN');
                    const result = await client.query('SELECT questions FROM exams WHERE code = $1 FOR UPDATE', [code]);
                    
                    if (result.rows.length === 0) {
                        await client.query('ROLLBACK');
                        return { status: 404, error: "Exam not found" };
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
                        return { status: 404, error: "Question not found" };
                    }

                    await client.query('UPDATE exams SET questions = $1 WHERE code = $2', [JSON.stringify(questions), code]);
                    await client.query('COMMIT');
                    return { status: 200, success: true };
                } catch (e) {
                    await client.query('ROLLBACK');
                    throw e;
                } finally {
                    client.release();
                }
            };

            // Wrap transaction dalam Lazy Migration handler
            try {
                const result = await runTransaction();
                if (result.error) return res.status(result.status).json(result);
                return res.status(200).json({ success: true });
            } catch (err: any) {
                if (err.code === '42P01') { // Table missing
                    await db.query(CREATE_TABLE_SQL);
                    // Retry transaction once
                    const retryResult = await runTransaction();
                    if (retryResult.error) return res.status(retryResult.status).json(retryResult);
                    return res.status(200).json({ success: true });
                }
                throw err;
            }
        }

        return res.status(405).json({ error: 'Method not allowed' });
        
    } catch (error: any) {
        console.error("API Fatal Error:", error);
        return res.status(500).json({ 
            error: "Internal Server Error", 
            message: error.message || "Unknown error"
        });
    }
}
