import type { VercelRequest, VercelResponse } from '@vercel/node';
import db from './db';

// Helper to remove answers for students
const sanitizeExam = (exam: any) => {
    try {
        const questions = JSON.parse(exam.questions || '[]').map((q: any) => {
            const { correctAnswer, trueFalseRows, matchingPairs, ...rest } = q;
            const sanitized = { ...rest };
            
            if (trueFalseRows) {
                sanitized.trueFalseRows = trueFalseRows.map((row: any) => ({
                    text: row.text,
                    answer: null 
                }));
            }
            if (matchingPairs) {
                sanitized.matchingPairs = matchingPairs.map((pair: any) => ({
                    left: pair.left,
                    right: '' 
                }));
            }
            return sanitized;
        });
        return { ...exam, questions };
    } catch (e) {
        return exam;
    }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Wrap entire logic in try-catch to handle DB init errors gracefully
    try {
        // 1. Initial Table Setup (Silent fail if DB missing)
        try {
            await db.query(`
                CREATE TABLE IF NOT EXISTS exams (
                    code TEXT PRIMARY KEY,
                    author_id TEXT,
                    questions TEXT,
                    config TEXT,
                    created_at BIGINT
                );
            `);
        } catch (initError) {
            console.error("DB Init Error:", initError);
            // Ignore init error. If DB is missing, subsequent queries will fail and be caught below.
        }

        if (req.method === 'GET') {
            const { code } = req.query;

            try {
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
                    ...row,
                    questions: JSON.parse(row.questions || '[]'),
                    config: JSON.parse(row.config || '{}'),
                    createdAt: parseInt(row.created_at)
                })) || [];
                
                return res.status(200).json(parsedRows);

            } catch (fetchError) {
                console.error("GET Exams Error:", fetchError);
                // CRITICAL: Return 200 [] on ANY error to allow LocalStorage fallback without console noise
                return res.status(200).json([]);
            }
        } 
        
        else if (req.method === 'POST') {
            try {
                const exam = req.body;
                
                const query = `
                    INSERT INTO exams (code, author_id, questions, config, created_at)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (code) 
                    DO UPDATE SET 
                        questions = EXCLUDED.questions,
                        config = EXCLUDED.config;
                `;
                
                await db.query(query, [
                    exam.code, 
                    exam.authorId || 'anonymous', 
                    JSON.stringify(exam.questions), 
                    JSON.stringify(exam.config),
                    exam.createdAt || Date.now()
                ]);

                return res.status(200).json({ success: true });
            } catch (postError) {
                console.error("POST Exam Error:", postError);
                // For POST, we can return error so frontend knows sync failed
                return res.status(503).json({ error: "Cloud sync failed" });
            }
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (globalError: any) {
        console.error("Global Handler Error:", globalError);
        // Global fallback for unexpected runtime crashes
        if (req.method === 'GET') return res.status(200).json([]);
        return res.status(500).json({ error: globalError.message });
    }
}
