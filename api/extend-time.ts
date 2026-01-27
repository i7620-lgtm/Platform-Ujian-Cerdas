
import type { VercelRequest, VercelResponse } from '@vercel/node';
import db from './db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { examCode, additionalMinutes } = req.body;
        
        const teachers = await db.getAllTeacherKeys();
        let found = false;

        for (const tId of teachers) {
            const exams = await db.getExams(tId);
            const exam = exams.find((e: any) => e.code === examCode);
            if (exam) {
                exam.config.timeLimit = parseInt(exam.config.timeLimit) + additionalMinutes;
                await db.saveExam(tId, exam);
                found = true;
                break;
            }
        }

        if (found) return res.status(200).json({ success: true });
        return res.status(404).json({ error: 'Exam not found' });

    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
}
