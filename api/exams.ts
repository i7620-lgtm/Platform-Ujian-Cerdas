
import type { VercelRequest, VercelResponse } from '@vercel/node';
import db from './_db.js';

const normalize = (str: string) => (str || '').trim().toLowerCase();

const shuffleArray = (array: any[]) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

const sanitizeForPublic = (exam: any) => {
    if (exam.questions && Array.isArray(exam.questions)) {
        exam.questions = exam.questions.map((q: any) => {
            const { correctAnswer, trueFalseRows, matchingPairs, ...rest } = q;
            const safeQ = { ...rest };
            if (trueFalseRows) {
                safeQ.trueFalseRows = trueFalseRows.map((r: any) => ({ text: r.text, answer: false }));
            }
            if (matchingPairs && Array.isArray(matchingPairs)) {
                 const rightValues = matchingPairs.map((p: any) => p.right || '');
                 const shuffledRights = shuffleArray(rightValues);
                 safeQ.matchingPairs = matchingPairs.map((p: any, idx: number) => ({ 
                     left: p.left, 
                     right: shuffledRights[idx] 
                 })); 
            }
            return safeQ;
        });
    }
    return exam;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,DELETE,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-Id, X-Role, X-School');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        if (req.method === 'GET') {
            const { code, public: isPublic, preview } = req.query;

            if (code && isPublic === 'true') {
                const teachers = await db.getAllTeacherKeys();
                for (const tId of teachers) {
                    const exams = await db.getExams(tId);
                    const found = exams.find((e: any) => e.code === code);
                    if (found) {
                        const isDraft = normalize(found.status) === 'draft';
                        if (isDraft && preview !== 'true') return res.status(403).json({ error: 'EXAM_IS_DRAFT' });
                        return res.status(200).json(sanitizeForPublic(found));
                    }
                }
                return res.status(404).json({ error: 'EXAM_NOT_FOUND' });
            } 
            else {
                const requesterId = String(req.headers['x-user-id'] || '');
                const requesterRole = normalize(String(req.headers['x-role'] || 'guru'));
                const requesterSchool = normalize(String(req.headers['x-school'] || ''));

                if (!requesterId) return res.status(400).json({ error: 'User ID header required' });

                const rawExams = await db.getExams('GLOBAL_TEACHER');
                let filteredExams = [];

                if (requesterRole === 'super_admin') {
                    filteredExams = rawExams;
                } 
                else if (requesterRole === 'admin') {
                    // Admin sekolah melihat semua soal di sekolahnya
                    filteredExams = rawExams.filter((e: any) => 
                        normalize(String(e.authorSchool)) === requesterSchool
                    );
                } 
                else {
                    // Guru biasa hanya melihat buatannya sendiri secara ketat
                    filteredExams = rawExams.filter((e: any) => String(e.authorId) === requesterId);
                }
                
                return res.status(200).json(filteredExams);
            }
        } 
        else if (req.method === 'POST') {
            const exam = req.body;
            if (!exam.authorId) return res.status(400).json({ error: "Author ID missing" });
            await db.saveExam(exam.authorId, exam);
            return res.status(200).json({ success: true });
        }
        else if (req.method === 'DELETE') {
            const { code } = req.query;
            const requesterId = (req.headers['x-user-id'] as string);
            if (!code || !requesterId) return res.status(400).json({ error: "Missing params" });
            await db.deleteExam(requesterId, code as string);
            return res.status(200).json({ success: true });
        }
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
}
