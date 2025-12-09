
import type { VercelRequest, VercelResponse } from '@vercel/node';
import db from './db';

let isSchemaChecked = false;

const shuffleArray = <T>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

// Helper to remove answers for students
const sanitizeExam = (examRow: any) => {
    try {
        const originalQuestions = JSON.parse(examRow.questions || '[]');
        const questions = originalQuestions.map((q: any) => {
            const { correctAnswer, trueFalseRows, matchingPairs, ...rest } = q;
            const sanitized: any = { ...rest };
            
            if (trueFalseRows) {
                sanitized.trueFalseRows = trueFalseRows.map((row: any) => ({
                    text: row.text,
                    answer: false // Send dummy boolean instead of null to satisfy types
                }));
            }
            if (matchingPairs && Array.isArray(matchingPairs)) {
                // Shuffle the right-side values to break the association but keep the options visible
                const rightValues = matchingPairs.map((p: any) => p.right);
                const shuffledRights = shuffleArray(rightValues);
                
                sanitized.matchingPairs = matchingPairs.map((pair: any, index: number) => ({
                    left: pair.left,
                    right: shuffledRights[index] // Assign shuffled right value
                }));
            }
            return sanitized;
        });

        return { 
            code: examRow.code,
            authorId: examRow.author_id,
            questions,
            config: JSON.parse(examRow.config || '{}'),
            createdAt: parseInt(examRow.created_at || '0')
        };
    } catch (e) {
        console.error("Sanitize error:", e);
        return {
            code: examRow.code,
            questions: [],
            config: {},
            createdAt: 0
        };
    }
};

// Safe Schema Migration Helper - Optimized
const ensureSchema = async () => {
    if (isSchemaChecked) return;
    
    try {
        console.log("Checking DB Schema...");
        
        // 1. Pastikan Tabel Utama Ada
        await db.query(`
            CREATE TABLE IF NOT EXISTS exams (
                code TEXT PRIMARY KEY, 
                author_id TEXT DEFAULT 'anonymous',
                questions TEXT, 
                config TEXT,
                created_at BIGINT DEFAULT 0
            );
        `);

        // 2. Pastikan Kolom Tambahan Ada (Migrasi)
        await db.query(`ALTER TABLE exams ADD COLUMN IF NOT EXISTS author_id TEXT DEFAULT 'anonymous';`);
        await db.query(`ALTER TABLE exams ADD COLUMN IF NOT EXISTS created_at BIGINT DEFAULT 0;`);
        
        // 3. (CRITICAL) Pastikan Unique Index Ada untuk 'ON CONFLICT (code)'
        // Jika tabel dibuat di versi lama tanpa Primary Key, perintah INSERT akan gagal.
        // Kita paksa buat index unik di sini.
        await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS exams_code_idx ON exams (code);`);

        console.log("Schema check passed.");
        isSchemaChecked = true;
    } catch (e: any) {
        console.error("Schema init error:", e.message);
        // Lanjutkan eksekusi, mungkin schema sudah benar tapi query migrasi gagal karena permission dsb.
    }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        await ensureSchema();

        if (req.method === 'GET') {
            const { code } = req.query;

            // Case 1: Student fetching specific public exam
            if (code && req.url?.includes('public')) {
                const result = await db.query('SELECT * FROM exams WHERE code = $1', [code]);
                if (!result || result.rows.length === 0) {
                    return res.status(404).json({ error: 'Exam not found' });
                }
                const cleanExam = sanitizeExam(result.rows[0]);
                return res.status(200).json(cleanExam);
            }

            // Case 2: Teacher syncing all exams
            const result = await db.query('SELECT * FROM exams ORDER BY created_at DESC');
            const parsedRows = result?.rows.map((row: any) => ({
                code: row.code,
                authorId: row.author_id,
                questions: JSON.parse(row.questions || '[]'),
                config: JSON.parse(row.config || '{}'),
                createdAt: parseInt(row.created_at || '0')
            })) || [];
            
            return res.status(200).json(parsedRows);
        } 
        
        else if (req.method === 'POST') {
            const exam = req.body;
            
            if (!exam || !exam.code) {
                return res.status(400).json({ error: "Invalid payload: 'code' is required." });
            }

            // DATA INTEGRITY LOGGING
            console.log(`[POST Save Exam] Code: ${exam.code}`);

            // Ensure values are safe
            const authorId = exam.authorId || 'anonymous';
            const createdAt = exam.createdAt || Date.now();
            const questionsJson = JSON.stringify(exam.questions || []);
            const configJson = JSON.stringify(exam.config || {});

            const query = `
                INSERT INTO exams (code, author_id, questions, config, created_at)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (code) 
                DO UPDATE SET 
                    author_id = EXCLUDED.author_id,
                    questions = EXCLUDED.questions,
                    config = EXCLUDED.config;
            `;
            
            await db.query(query, [exam.code, authorId, questionsJson, configJson, createdAt]);

            return res.status(200).json({ success: true });
        }
        
        else if (req.method === 'PATCH') {
            const { code, questionId, imageUrl, optionImages } = req.body;
            
            if (!code || !questionId) {
                return res.status(400).json({ error: "Missing code or questionId" });
            }

            const result = await db.query('SELECT questions FROM exams WHERE code = $1', [code]);
            if (result.rows.length === 0) return res.status(404).json({ error: "Exam not found" });

            let questions = JSON.parse(result.rows[0].questions);

            let updated = false;
            questions = questions.map((q: any) => {
                if (q.id === questionId) {
                    updated = true;
                    if (imageUrl !== undefined) q.imageUrl = imageUrl;
                    if (optionImages !== undefined) q.optionImages = optionImages;
                }
                return q;
            });

            if (!updated) return res.status(404).json({ error: "Question ID not found" });

            await db.query('UPDATE exams SET questions = $1 WHERE code = $2', [
                JSON.stringify(questions), 
                code
            ]);

            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
        
    } catch (globalError: any) {
        console.error("API Handler Fatal Error:", globalError);
        // Return JSON error response so frontend can display it instead of generic 500 HTML
        return res.status(500).json({ 
            error: "Internal Server Error", 
            message: globalError.message || "Unknown DB Error", 
            code: globalError.code 
        });
    }
}
    
