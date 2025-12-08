import type { VercelRequest, VercelResponse } from '@vercel/node';
import pool from './db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // 1. Initial Database Setup Check
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS results (
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
    } catch (dbError) {
        console.warn("DB Init failed (likely no connection):", dbError);
        if (req.method === 'GET') {
            return res.status(200).json([]);
        }
        return res.status(500).json({ error: "Database connection failed." });
    }

    try {
        if (req.method === 'GET') {
            try {
                const result = await pool.query(`
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

                const formatted = result.rows.map(row => ({
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
                }));

                return res.status(200).json(formatted);
            } catch (fetchError) {
                console.error("Failed to fetch results:", fetchError);
                return res.status(200).json([]);
            }
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
}
