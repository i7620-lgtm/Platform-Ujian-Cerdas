
import type { VercelRequest, VercelResponse } from '@vercel/node';
import db from './db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        try {
            // Table Renamed to results_v1
            await db.query(`
                CREATE TABLE IF NOT EXISTS results_v1 (
                    exam_code TEXT,
                    student_id TEXT,
                    student_name TEXT,
                    student_class TEXT,
                    answers TEXT,
                    score INTEGER,
                    correct_answers INTEGER,
                    total_questions INTEGER,
                    status TEXT,
                    activity_log TEXT,
                    timestamp BIGINT,
                    PRIMARY KEY (exam_code, student_id)
                );
            `);
        } catch (e: any) {
            console.error("DB Init Error (Results):", e);
            return res.status(500).json({ error: "DB Init Failed", details: e.message });
        }

        if (req.method === 'GET') {
            try {
                // Using results_v1
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
                    FROM results_v1 
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
                    timestamp: parseInt(row.timestamp)
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
