
import type { VercelRequest, VercelResponse } from '@vercel/node';
import db from './_db.js';

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

const normalize = (str: string) => (str || '').trim().toLowerCase();

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-User-Id, X-Role, X-School');

    // CACHING STRATEGY
    // Default: No-Store (Data Guru/Admin harus selalu real-time)
    let cacheControl = 'no-store, no-cache, must-revalidate, proxy-revalidate';

    // Jika method GET dan mengakses data publik (Siswa sedang ujian), aktifkan Cache
    if (req.method === 'GET') {
        const { code, public: isPublic } = req.query;
        if (code && isPublic === 'true') {
            // Public Cache: Simpan 1 jam (3600s). 
            // stale-while-revalidate=86400: Jika cache kadaluarsa tapi < 24 jam, 
            // tampilkan versi lama dulu sambil update background (Instan load).
            cacheControl = 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400';
        }
    }
    res.setHeader('Cache-Control', cacheControl);

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        if (req.method === 'GET') {
            const { code, preview } = req.query;

            if (code && req.query.public === 'true') {
                const teachers = await db.getAllTeacherKeys();
                for (const tId of teachers) {
                    const exams = await db.getExams(tId);
                    const found = exams.find((e: any) => e.code === code);
                    if (found) {
                        // PERBAIKAN: Gunakan normalisasi agar 'draft' atau 'DRAFT' tetap terdeteksi
                        const isDraft = normalize(found.status) === 'draft';
                        if (isDraft && preview !== 'true') {
                            return res.status(403).json({ error: 'EXAM_IS_DRAFT' });
                        }
                        return res.status(200).json(sanitizeForPublic(found));
                    }
                }
                return res.status(404).json({ error: 'EXAM_NOT_FOUND' });
            } 
            else {
                const requesterId = (req.headers['x-user-id'] as string);
                const requesterRole = (req.headers['x-role'] as string) || 'guru';
                const requesterSchool = (req.headers['x-school'] as string) || '';

                if (!requesterId) return res.status(400).json({ error: 'User ID header required' });

                const rawExams = await db.getExams('GLOBAL_TEACHER');
                let filteredExams = [];

                if (requesterRole === 'super_admin') {
                    filteredExams = rawExams;
                } 
                else if (requesterRole === 'admin') {
                    if (normalize(requesterSchool) === '') {
                        filteredExams = [];
                    } else {
                        filteredExams = rawExams.filter((e: any) => 
                            normalize(e.authorSchool) === normalize(requesterSchool)
                        );
                    }
                } 
                else {
                    filteredExams = rawExams.filter((e: any) => e.authorId === requesterId);
                }
                return res.status(200).json(filteredExams);
            }
        } 
        else if (req.method === 'POST') {
            const exam = req.body;
            const authorId = exam.authorId;
            if (!authorId) return res.status(400).json({ error: "Author ID missing" });
            await db.saveExam(authorId, exam);
            return res.status(200).json({ success: true });
        }
        else if (req.method === 'DELETE') {
            const { code } = req.query;
            const requesterId = (req.headers['x-user-id'] as string);
            if (!code || !requesterId) return res.status(400).json({ error: "Missing params" });
            await db.deleteExam(requesterId, code as string);
            return res.status(200).json({ success: true });
        }
        return res.status(405).json({ error: `Method '${req.method}' not allowed` });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
}
