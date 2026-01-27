
import type { VercelRequest, VercelResponse } from '@vercel/node';
import db from './db.js';

// Helper Shuffle (Client side mostly, but kept for public fetch safety)
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
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
    res.setHeader('Cache-Control', 'no-store'); // Sheets data changes often

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        // --- GET: Fetch Exams ---
        if (req.method === 'GET') {
            const { code, preview } = req.query;

            // PUBLIC ACCESS (STUDENT) - NEED TO FIND WHICH TEACHER OWNS THE EXAM
            // Strategy: Since we don't have a central Exam Table anymore, we have to search or 
            // the exam code should encoded, OR we assume we know the teacher?
            // BETTER: Use Master Sheet to have a "Global Exam Index"? 
            // OR: Iterate all teachers (expensive).
            // COMPROMISE for Architecture: The "Global Index" is maintained in Master Sheet "EXAM_INDEX" tab?
            // Or simpler: Student must provide "Teacher ID/Email" + "Exam Code"? No, UX bad.
            
            // ELEGANT SOLUTION: Iterate `DIRECTORY` keys from Master Sheet and check caches. 
            // To make it fast, we can optimize later. For now, we will iterate registered teachers in Directory.
            // Note: In a real massive app, we'd use a dedicated Index. For school scale (50 teachers), this loop is acceptable in Node.
            
            if (code && req.url?.includes('public')) {
                const teachers = await db.getAllTeacherKeys();
                for (const tId of teachers) {
                    const exams = await db.getExams(tId);
                    const found = exams.find((e: any) => e.code === code);
                    if (found) {
                        if (found.status === 'DRAFT' && preview !== 'true') {
                            return res.status(403).json({ error: 'Exam is draft' });
                        }
                        return res.status(200).json(sanitizeForPublic(found));
                    }
                }
                return res.status(404).json({ error: 'Exam not found' });
            } 
            
            // TEACHER ACCESS
            else {
                const requesterId = (req.headers['x-user-id'] as string);
                const requesterRole = (req.headers['x-role'] as string) || 'guru';
                const requesterSchool = (req.headers['x-school'] as string) || '';

                if (!requesterId) return res.status(400).json({ error: 'User ID header required' });

                if (requesterRole === 'super_admin') {
                    // Super Admin sees ALL (Aggregated)
                    const teachers = await db.getAllTeacherKeys();
                    let allExams: any[] = [];
                    for (const tId of teachers) {
                        const exams = await db.getExams(tId);
                        allExams = [...allExams, ...exams];
                    }
                    return res.status(200).json(allExams);
                } else if (requesterRole === 'admin') {
                    // Admin sees School's exams
                    // Filter teachers by school first? 
                    // Optimization: Just get all and filter by school property in exam object.
                    const teachers = await db.getAllTeacherKeys();
                    let schoolExams: any[] = [];
                    for (const tId of teachers) {
                        // Check teacher school? Or check exam school context?
                        // Checking exam context is safer as teachers might move.
                        const exams = await db.getExams(tId);
                        schoolExams = [...schoolExams, ...exams.filter((e: any) => e.authorSchool === requesterSchool)];
                    }
                    return res.status(200).json(schoolExams);
                } else {
                    // Guru sees OWN exams
                    const data = await db.getExams(requesterId);
                    return res.status(200).json(data);
                }
            }
        } 
        
        // --- POST: Save Exam ---
        else if (req.method === 'POST') {
            const exam = req.body;
            const authorId = exam.authorId;
            if (!authorId) return res.status(400).json({ error: "Author ID missing" });
            
            await db.saveExam(authorId, exam);
            return res.status(200).json({ success: true });
        }
        
        // --- DELETE ---
        else if (req.method === 'DELETE') {
            const { code } = req.query;
            const requesterId = (req.headers['x-user-id'] as string);
            if (!code || !requesterId) return res.status(400).json({ error: "Missing params" });
            
            await db.deleteExam(requesterId, code as string);
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
        
    } catch (error: any) {
        console.error("API Error:", error);
        return res.status(500).json({ error: error.message });
    }
}
