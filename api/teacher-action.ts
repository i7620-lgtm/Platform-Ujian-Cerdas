
import type { VercelRequest, VercelResponse } from '@vercel/node';
import db from './db.js';

// Endpoint ini KHUSUS untuk aksi Guru (Otoritas Tertinggi)
// Tidak menerima jawaban siswa, hanya mengubah Status dan Log.

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { examCode, studentId, action, teacherId } = req.body;

        if (!examCode || !studentId || !action) {
            return res.status(400).json({ error: 'Missing parameters' });
        }

        const serverTimestamp = Date.now();
        let newStatus = '';
        let logMessage = '';
        let statusCode = 1;

        // Tentukan aksi
        if (action === 'UNLOCK') {
            newStatus = 'in_progress';
            statusCode = 1;
            logMessage = `[Guru] Membuka kunci akses ujian secara manual.`;
        } else if (action === 'STOP') {
            newStatus = 'completed';
            statusCode = 3;
            logMessage = `[Guru] Menghentikan paksa ujian siswa.`;
        } else {
            return res.status(400).json({ error: 'Invalid action' });
        }

        // Ambil data saat ini untuk append log
        const currentRes = await db.query(
            'SELECT activity_log FROM results WHERE exam_code = $1 AND student_id = $2',
            [examCode, studentId]
        );

        let finalLog = [logMessage];
        if (currentRes.rows.length > 0) {
            const existingLog = JSON.parse(currentRes.rows[0].activity_log || '[]');
            finalLog = [...existingLog, logMessage];
        }

        // EKSEKUSI UPDATE OTORITATIF
        // Kita hanya update status, status_code, activity_log, dan timestamp.
        // Jawaban siswa TIDAK disentuh.
        const query = `
            UPDATE results 
            SET 
                status = $1, 
                status_code = $2, 
                activity_log = $3, 
                timestamp = $4
            WHERE exam_code = $5 AND student_id = $6
            RETURNING *;
        `;

        const updateResult = await db.query(query, [
            newStatus, 
            statusCode, 
            JSON.stringify(finalLog), 
            serverTimestamp, 
            examCode, 
            studentId
        ]);

        if (updateResult.rows.length === 0) {
            return res.status(404).json({ error: 'Student result not found' });
        }

        const row = updateResult.rows[0];
        
        // Kembalikan format standar Result
        return res.status(200).json({
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
            timestamp: parseInt(row.timestamp),
            isSynced: true
        });

    } catch (error: any) {
        console.error("Teacher Action Error:", error);
        return res.status(500).json({ error: "Server Error", details: error.message });
    }
}
