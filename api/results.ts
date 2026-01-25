
import type { VercelRequest, VercelResponse } from '@vercel/node';
// WAJIB menggunakan ekstensi .js saat mengimpor file lokal di mode ESM ("type": "module")
import db from './db.js';

let isSchemaChecked = false;

const ensureSchema = async () => {
    if (isSchemaChecked) return;
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS results (
                exam_code TEXT,
                student_id TEXT,
                answers TEXT,
                score INTEGER,
                PRIMARY KEY (exam_code, student_id)
            );
        `);
        const alterQueries = [
            "ALTER TABLE results ADD COLUMN IF NOT EXISTS student_name TEXT;",
            "ALTER TABLE results ADD COLUMN IF NOT EXISTS student_class TEXT;",
            "ALTER TABLE results ADD COLUMN IF NOT EXISTS student_absent_number TEXT;", // New Column
            "ALTER TABLE results ADD COLUMN IF NOT EXISTS correct_answers INTEGER;",
            "ALTER TABLE results ADD COLUMN IF NOT EXISTS total_questions INTEGER;",
            "ALTER TABLE results ADD COLUMN IF NOT EXISTS status TEXT;",
            "ALTER TABLE results ADD COLUMN IF NOT EXISTS activity_log TEXT;",
            "ALTER TABLE results ADD COLUMN IF NOT EXISTS timestamp BIGINT;",
            "ALTER TABLE results ADD COLUMN IF NOT EXISTS location TEXT;"
        ];
        for (const q of alterQueries) {
            try { await db.query(q); } catch (e) { /* Ignore */ }
        }
        isSchemaChecked = true;
    } catch(e) {}
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Add CORS and Cache-Control headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        await ensureSchema();

        if (req.method === 'GET') {
            try {
                // Using 'results' table with optional filtering
                const { code } = req.query;
                
                let query = `
                    SELECT 
                        exam_code,
                        student_id,
                        student_name,
                        student_class,
                        student_absent_number,
                        answers,
                        score,
                        correct_answers,
                        total_questions,
                        status,
                        activity_log,
                        timestamp,
                        location
                    FROM results 
                `;

                const params: any[] = [];
                
                if (code) {
                    query += ` WHERE exam_code = $1`;
                    params.push(code);
                }

                query += ` ORDER BY timestamp DESC`;

                const result = await db.query(query, params);

                const formatted = result?.rows.map((row: any) => ({
                    examCode: row.exam_code,
                    student: {
                        studentId: row.student_id,
                        fullName: row.student_name,
                        class: row.student_class,
                        absentNumber: row.student_absent_number || ''
                    },
                    answers: JSON.parse(row.answers || '{}'),
                    score: row.score,
                    correctAnswers: row.correct_answers,
                    totalQuestions: row.total_questions,
                    status: row.status,
                    activityLog: JSON.parse(row.activity_log || '[]'),
                    timestamp: parseInt(row.timestamp || '0'),
                    location: row.location || ''
                })) || [];

                return res.status(200).json(formatted);
            } catch (fetchError: any) {
                console.error("GET Results Error:", fetchError);
                return res.status(500).json({ 
                    error: "Failed to fetch results", 
                    details: fetchError.message,
                    code: fetchError.code 
                });
            }
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (globalError: any) {
         return res.status(500).json({ error: globalError.message });
    }
}
