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
    try {
        // 1. Initial Table Setup
        // We do NOT suppress errors here anymore so we can see if table creation fails.
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
        } catch (initError: any) {
            console.error("DB Init Error:", initError);
            // If table creation fails, return 500 immediately so we know why.
            return res.status(500).json({ 
                error: "Database Initialization Failed", 
                details: initError.message,
                code: initError.code 
            });
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

            } catch (fetchError: any) {
                console.error("GET Exams Error:", fetchError);
                // Expose actual error
                return res.status(500).json({ 
                    error: "Failed to fetch exams", 
                    details: fetchError.message,
                    code: fetchError.code
                });
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
            } catch (postError: any) {
                console.error("POST Exam Error:", postError);
                // Expose actual error
                return res.status(500).json({ 
                    error: "Failed to save exam", 
                    details: postError.message,
                    code: postError.code
                });
            }
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (globalError: any) {
        console.error("Global Handler Error:", globalError);
        return res.status(500).json({ error: globalError.message });
    }
}
