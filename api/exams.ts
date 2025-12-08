import type { VercelRequest, VercelResponse } from '@vercel/node';
import pool from './db.js';

// Helper to remove answers for students
const sanitizeExam = (exam: any) => {
    const questions = exam.questions.map((q: any) => {
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
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (req.method === 'GET') {
            const { code } = req.query;

            // Case 1: Student fetching specific public exam
            if (code && req.url?.includes('public')) {
                const result = await pool.query('SELECT * FROM exams WHERE code = $1', [code]);
                if (result.rows.length === 0) {
                    return res.status(404).json({ error: 'Exam not found' });
                }
                // SECURITY: Sanitize before sending to student
                const cleanExam = sanitizeExam(result.rows[0]);
                return res.status(200).json(cleanExam);
            }

            // Case 2: Teacher syncing all exams (Ideally should be protected by auth)
            const result = await pool.query('SELECT * FROM exams ORDER BY created_at DESC');
            return res.status(200).json(result.rows);
        } 
        
        else if (req.method === 'POST') {
            // Teacher uploading/syncing an exam
            const exam = req.body;
            
            // Upsert (Insert or Update)
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
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
}
