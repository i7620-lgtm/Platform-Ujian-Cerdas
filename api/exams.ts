
import type { VercelRequest, VercelResponse } from '@vercel/node';
import db from './db';

// Global variable to cache schema check status within the same lambda instance
let isSchemaChecked = false;

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

// Safe Schema Migration Helper - Optimized
const ensureSchema = async () => {
    if (isSchemaChecked) return; // Skip if already checked in this instance

    try {
        console.log("Checking DB Schema...");
        await db.query(`
            CREATE TABLE IF NOT EXISTS exams (
                code TEXT PRIMARY KEY, 
                questions TEXT, 
                config TEXT,
                author_id TEXT DEFAULT 'anonymous',
                created_at BIGINT DEFAULT 0
            );
        `);
        // Split alters to avoid failure if one exists
        try { await db.query(`ALTER TABLE exams ADD COLUMN IF NOT EXISTS author_id TEXT DEFAULT 'anonymous';`); } catch(e) {}
        try { await db.query(`ALTER TABLE exams ADD COLUMN IF NOT EXISTS created_at BIGINT DEFAULT 0;`); } catch(e) {}
        
        isSchemaChecked = true;
        console.log("Schema check passed.");
    } catch (e) {
        console.error("Schema init warning:", e);
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
                ...row,
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
            console.log(`Payload Size: approx ${JSON.stringify(exam).length} characters`);
            console.log(`Questions Count: ${exam.questions?.length || 0}`);

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
                    questions = EXCLUDED.questions,
                    config = EXCLUDED.config;
            `;
            
            await db.query(query, [exam.code, authorId, questionsJson, configJson, createdAt]);

            return res.status(200).json({ success: true });
        }
        
        else if (req.method === 'PATCH') {
            const { code, questionId, imageUrl, optionImages } = req.body;
            
            console.log(`[PATCH Image] Code: ${code}, QID: ${questionId}`);

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
        return res.status(500).json({ 
            error: "Internal Server Error", 
            message: globalError.message, 
            code: globalError.code 
        });
    }
}
