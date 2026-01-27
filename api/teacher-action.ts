
import type { VercelRequest, VercelResponse } from '@vercel/node';
import db from './_db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-Id');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { examCode, studentId, action } = req.body;
        const teachers = await db.getAllTeacherKeys();
        let targetTeacher = null;
        let targetResult = null;

        for (const tId of teachers) {
            const results = await db.getResults(tId, examCode);
            const found = results.find((r: any) => r.student.studentId === studentId);
            if (found) {
                targetTeacher = tId;
                targetResult = found;
                break;
            }
        }

        if (!targetTeacher || !targetResult) return res.status(404).json({ error: 'Result not found' });

        if (action === 'UNLOCK') {
            targetResult.status = 'in_progress';
            targetResult.activityLog.push('[Guru] Membuka kunci akses manual.');
        } else if (action === 'STOP') {
            targetResult.status = 'completed';
            targetResult.activityLog.push('[Guru] Menghentikan paksa ujian.');
        }

        await db.saveResult(targetTeacher, targetResult);
        return res.status(200).json(targetResult);

    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
}
