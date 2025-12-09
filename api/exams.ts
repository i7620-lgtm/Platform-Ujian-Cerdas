
import type { VercelRequest, VercelResponse } from '@vercel/node';
import db from './db';

// Lightweight Initializer
let isTableInitialized = false;

const initializeTable = async () => {
    if (isTableInitialized) return;
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS exams (
                code TEXT PRIMARY KEY, 
                author_id TEXT DEFAULT 'anonymous',
                questions TEXT, 
                config TEXT,
                created_at BIGINT DEFAULT 0
            );
        `);
        // Simple check or robust index creation once
        await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS exams_code_idx ON exams (code);`);
        isTableInitialized = true;
    } catch (e) {
        console.error("Failed to init table:", e);
    }
};

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
                    answer: false 
                }));
            }
            if (matchingPairs && Array.isArray(matchingPairs)) {
                const rightValues = matchingPairs.map((p: any) => p.right);
                const shuffledRights = shuffleArray(rightValues);
                sanitized.matchingPairs = matchingPairs.map((pair: any, index: number) => ({
                    left: pair.left,
                    right: shuffledRights[index] 
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
        return { code: examRow.code, questions: [], config: {}, createdAt: 0 };
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
        await initializeTable();

        if (req.method === 'GET') {
            const { code } = req.query;

            if (code && req.url?.includes('public')) {
                const result = await db.query('SELECT * FROM exams WHERE code = $1', [code]);
                if (!result || result.rows.length === 0) return res.status(404).json({ error: 'Exam not found' });
                return res.status(200).json(sanitizeExam(result.rows[0]));
            } else {
                const result = await db.query('SELECT * FROM exams ORDER BY created_at DESC LIMIT 50');
                const data = result?.rows.map((row: any) => ({
                    code: row.code,
                    authorId: row.author_id,
                    questions: JSON.parse(row.questions || '[]'),
                    config: JSON.parse(row.config || '{}'),
                    createdAt: parseInt(row.created_at || '0')
                })) || [];
                return res.status(200).json(data);
            }
        } 
        
        else if (req.method === 'POST') {
            const exam = req.body;
            if (!exam || !exam.code) return res.status(400).json({ error: "Invalid payload: 'code' is required." });

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
            const params = [exam.code, authorId, questionsJson, configJson, createdAt];

            await db.query(query, params);
            return res.status(200).json({ success: true });
        }
        
        else if (req.method === 'PATCH') {
            // CRITICAL FIX: Use Transaction + Locking for atomic updates
            const { code, questionId, imageUrl, optionImages } = req.body;
            if (!code || !questionId) return res.status(400).json({ error: "Missing code or questionId" });

            const client = await db.getClient();
            
            try {
                await client.query('BEGIN'); // Start Transaction

                // 'FOR UPDATE' locks this row. No other request can modify it until we COMMIT.
                const result = await client.query('SELECT questions FROM exams WHERE code = $1 FOR UPDATE', [code]);
                
                if (result.rows.length === 0) {
                    await client.query('ROLLBACK');
                    return res.status(404).json({ error: "Exam not found" });
                }

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

                if (!updated) {
                    await client.query('ROLLBACK');
                    return res.status(404).json({ error: "Question ID not found" });
                }

                await client.query('UPDATE exams SET questions = $1 WHERE code = $2', [JSON.stringify(questions), code]);
                await client.query('COMMIT'); // Release Lock
                
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
        console.error("API Error:", error);
        return res.status(500).json({ 
            error: "Internal Server Error", 
            message: error.message 
        });
    }
}
