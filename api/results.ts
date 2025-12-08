
import type { VercelRequest, VercelResponse } from '@vercel/node';
import db from './db';

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
            "ALTER TABLE results ADD COLUMN IF NOT EXISTS correct_answers INTEGER;",
            "ALTER TABLE results ADD COLUMN IF NOT EXISTS total_questions INTEGER;",
            "ALTER TABLE results ADD COLUMN IF NOT EXISTS status TEXT;",
            "ALTER TABLE results ADD COLUMN IF NOT EXISTS activity_log TEXT;",
            "ALTER TABLE results ADD COLUMN IF NOT EXISTS timestamp BIGINT;"
        ];
        for (const q of alterQueries) {
            try { await db.query(q); } catch (e) { /* Ignore */ }
        }
        isSchemaChecked = true;
    } catch(e) {}
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        await ensureSchema();

        if (req.method === 'GET') {
            try {
                // Using 'results' table
                const result = await db.query(`
                    SELECT 
                        exam_code,
                        student_id,
                        student_name,
                        student_class,
                        answers,
                        score,
                        correct_answers,
                        total_questions,
                        status,
                        activity_log,
                        timestamp
                    FROM results 
                    ORDER BY timestamp DESC
                `);

                const formatted = result?.rows.map((row: any) => ({
                    examCode: row.exam_code,
                    student: {
                        studentId: row.student_id,
                        fullName: row.student_name,
                        class: row.student_class
                    },
                    answers: JSON.parse(row.answers || '{}'),
                    score: row.score,
                    correctAnswers: row.correct_answers,
                    totalQuestions: row.total_questions,
                    status: row.status,
                    activityLog: JSON.parse(row.activity_log || '[]'),
                    timestamp: parseInt(row.timestamp || '0')
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
