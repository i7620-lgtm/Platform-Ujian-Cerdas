import type { VercelRequest, VercelResponse } from '@vercel/node';
import pool from './db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (req.method === 'GET') {
            // Guru mengambil semua hasil ujian
            const result = await pool.query(`
                SELECT 
                    exam_code as "examCode",
                    student_id,
                    student_name,
                    student_class,
                    answers,
                    score,
                    correct_answers as "correctAnswers",
                    total_questions as "totalQuestions",
                    status,
                    activity_log as "activityLog",
                    timestamp
                FROM results 
                ORDER BY timestamp DESC
            `);

            // Format ulang agar sesuai interface Result frontend
            const formatted = result.rows.map(row => ({
                examCode: row.examCode,
                student: {
                    studentId: row.student_id,
                    fullName: row.student_name,
                    class: row.student_class
                },
                answers: row.answers,
                score: row.score,
                correctAnswers: row.correctAnswers,
                totalQuestions: row.totalQuestions,
                status: row.status,
                activityLog: row.activityLog,
                timestamp: parseInt(row.timestamp)
            }));

            return res.status(200).json(formatted);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
}
