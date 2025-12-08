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
        // 1. Initial Table Setup & Safe Migration (Split queries for reliability)
        try {
            await db.query(`CREATE TABLE IF NOT EXISTS exams (code TEXT PRIMARY KEY, questions TEXT, config TEXT);`);
        } catch (e) { console.error("Create Table Error:", e); }

        try {
            await db.query(`ALTER TABLE exams ADD COLUMN IF NOT EXISTS author_id TEXT DEFAULT 'anonymous';`);
        } catch (e) { /* Ignore if exists or fails, prevents blocking */ }

        try {
            await db.query(`ALTER TABLE exams ADD COLUMN IF NOT EXISTS created_at BIGINT DEFAULT 0;`);
        } catch (e) { /* Ignore if exists or fails */ }

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
                    createdAt: parseInt(row.created_at || '0')
                })) || [];
                
                return res.status(200).json(parsedRows);

            } catch (fetchError: any) {
                console.error("GET Exams Error:", fetchError);
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
                
                // Ensure values are safe
                const authorId = exam.authorId || 'anonymous';
                const createdAt = exam.createdAt || Date.now();
                const questionsJson = JSON.stringify(exam.questions);
                const configJson = JSON.stringify(exam.config);

                const query = `
                    INSERT INTO exams (code, author_id, questions, config, created_at)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (code) 
                    DO UPDATE SET 
                        questions = EXCLUDED.questions,
                        config = EXCLUDED.config;
                `;
                
                await db.query(query, [exam.code, authorId, questionsJson, configJson, createdAt]);

                return res.status(200).json({ success: true });
            } catch (postError: any) {
                console.error("POST Exam Error:", postError);
                return res.status(500).json({ 
                    error: "Failed to save exam", 
                    details: postError.message,
                    code: postError.code
                });
            }
        }
        
        else if (req.method === 'PATCH') {
            try {
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

            } catch (patchError: any) {
                console.error("PATCH Exam Error:", patchError);
                return res.status(500).json({ 
                    error: "Failed to update exam image", 
                    details: patchError.message 
                });
            }
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (globalError: any) {
        console.error("Global Handler Error:", globalError);
        return res.status(500).json({ error: globalError.message });
    }
}
