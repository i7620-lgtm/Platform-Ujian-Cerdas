
import type { VercelRequest, VercelResponse } from '@vercel/node';
import db from './_db.js';

const normalize = (str: any) => String(str || '').trim().toLowerCase().replace(/\s+/g, ' ');

const calculateGrade = (exam: any, answers: Record<string, string>) => {
    let correctCount = 0;
    const questions = exam.questions || [];
    
    questions.forEach((q: any) => {
        const studentAnswer = answers[q.id];
        if (!studentAnswer) return;

        if (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'FILL_IN_THE_BLANK') {
             if (q.correctAnswer && normalize(studentAnswer) === normalize(q.correctAnswer)) correctCount++;
        } 
        else if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
             const tArr = String(q.correctAnswer).split(',');
             if (studentAnswer.length === tArr.length) correctCount++; 
        }
    });

    const scorable = questions.filter((q: any) => q.questionType !== 'INFO' && q.questionType !== 'ESSAY').length;
    const score = scorable > 0 ? Math.round((correctCount / scorable) * 100) : 0;
    return { score, correctCount, totalQuestions: scorable };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: `Method '${req.method}' not allowed` });

    try {
        const { examCode, student, answers, activityLog, location, status } = req.body;
        
        const teachers = await db.getAllTeacherKeys();
        let exam = null;
        let ownerId = null;

        for (const tId of teachers) {
            const exams = await db.getExams(tId);
            const found = exams.find((e: any) => e.code === examCode);
            if (found) {
                exam = found;
                ownerId = tId;
                break;
            }
        }

        if (!exam || !ownerId) return res.status(404).json({ error: 'Exam not found' });

        const grading = calculateGrade(exam, answers);
        const finalStatus = status || 'completed';
        const timestamp = Date.now();

        const resultPayload = {
            examCode,
            student,
            answers,
            score: finalStatus === 'in_progress' ? 0 : grading.score,
            correctAnswers: grading.correctCount,
            totalQuestions: grading.totalQuestions,
            status: finalStatus,
            activityLog: activityLog || [],
            location: location || '',
            timestamp
        };

        await db.saveResult(ownerId, resultPayload);
        return res.status(200).json({ ...resultPayload, isSynced: true });

    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
}
