import type { VercelRequest, VercelResponse } from '@vercel/node';
import pool from './db';

// Helper to remove answers for students
const sanitizeExam = (exam: any) => {
    try {
        const questions = JSON.parse(exam.questions || '[]').map((q: any) => {
            const { correctAnswer, trueFalseRows, matchingPairs, ...rest } = q;
            const sanitized = { ...rest };
            
            if (trueFalseRows) {
                sanitized.trueFalseRows = trueFalseRows.map((row: any) => ({
                    text: row.text,
                    answer: null // Hide answer
                }));
            }
            if (matchingPairs) {
                sanitized.matchingPairs = matchingPairs.map((pair: any) => ({
                    left: pair.left,
                    right: '' // Hide correct pair mapping
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
    // 1. Initial Database Setup Check
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS exams (
                code TEXT PRIMARY KEY,
                author_id TEXT,
                questions TEXT,
                config TEXT,
                created_at BIGINT
            );
        `);
    } catch (dbError) {
        console.warn("DB Init failed (likely no connection):", dbError);
        // If DB is unreachable, return empty array for GET to allow local fallback
        if (req.method === 'GET') {
            return res.status(200).json([]);
        }
        // For POST, we must report failure
        return res.status(500).json({ error: "Database connection failed." });
    }

    try {
        if (req.method === 'GET') {
            const { code } = req.query;

            try {
                // Case 1: Student fetching specific public exam
                if (code && req.url?.includes('public')) {
                    const result = await pool.query('SELECT * FROM exams WHERE code = $1', [code]);
                    if (result.rows.length === 0) {
                        return res.status(404).json({ error: 'Exam not found' });
                    }
                    const cleanExam = sanitizeExam(result.rows[0]);
                    return res.status(200).json(cleanExam);
                }

                // Case 2: Teacher syncing all exams
                const result = await pool.query('SELECT * FROM exams ORDER BY created_at DESC');
                const parsedRows = result.rows.map(row => ({
                    ...row,
                    questions: JSON.parse(row.questions || '[]'),
                    config: JSON.parse(row.config || '{}'),
                    createdAt: parseInt(row.created_at)
                }));
                return res.status(200).json(parsedRows);

            } catch (fetchError) {
                console.error("Failed to fetch exams:", fetchError);
                // Return empty array to allow frontend to use localStorage
                return res.status(200).json([]);
            }
        } 
        
        else if (req.method === 'POST') {
            const exam = req.body;
            
            const query = `
                INSERT INTO exams (code, author_id, questions, config, created_at)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (code) 
                DO UPDATE SET 
                    questions = EXCLUDED.questions,
                    config = EXCLUDED.config;
            `;
            
            await pool.query(query, [
                exam.code, 
                exam.authorId || 'anonymous', 
                JSON.stringify(exam.questions), 
                JSON.stringify(exam.config),
                exam.createdAt || Date.now()
            ]);

            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error: any) {
        console.error("API Handler Error:", error);
        return res.status(500).json({ error: error.message });
    }
}
