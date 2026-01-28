
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

// Helper normalisasi string
const normalize = (str: string) => (str || '').trim().toLowerCase();

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-User-Id, X-Role, X-School');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        if (req.method === 'GET') {
            const { code, preview } = req.query;

            // --- PUBLIC ACCESS (SISWA) ---
            if (code && req.query.public === 'true') {
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
            
            // --- TEACHER / ADMIN DASHBOARD ACCESS ---
            else {
                const requesterId = (req.headers['x-user-id'] as string);
                const requesterRole = (req.headers['x-role'] as string) || 'guru';
                const requesterSchool = (req.headers['x-school'] as string) || '';

                if (!requesterId) return res.status(400).json({ error: 'User ID header required' });

                // 1. Ambil SEMUA data ujian (Raw Data)
                const rawExams = await db.getExams('GLOBAL_TEACHER');

                // 2. Filter Berdasarkan Role (RBAC)
                let filteredExams = [];

                if (requesterRole === 'super_admin') {
                    // Super Admin melihat semuanya
                    filteredExams = rawExams;
                } 
                else if (requesterRole === 'admin') {
                    // Admin Sekolah: WAJIB punya sekolah yang valid
                    // Jika requesterSchool kosong, dia tidak melihat apa-apa (safety default)
                    if (normalize(requesterSchool) === '') {
                        filteredExams = [];
                    } else {
                        filteredExams = rawExams.filter((e: any) => 
                            normalize(e.authorSchool) === normalize(requesterSchool)
                        );
                    }
                } 
                else {
                    // Guru (Default): Hanya melihat ujian buatannya sendiri
                    filteredExams = rawExams.filter((e: any) => e.authorId === requesterId);
                }

                return res.status(200).json(filteredExams);
            }
        } 
        else if (req.method === 'POST') {
            const exam = req.body;
            const authorId = exam.authorId;
            if (!authorId) return res.status(400).json({ error: "Author ID missing" });
            
            // Simpan Ujian
            await db.saveExam(authorId, exam);
            return res.status(200).json({ success: true });
        }
        else if (req.method === 'DELETE') {
            const { code } = req.query;
            const requesterId = (req.headers['x-user-id'] as string);
            const requesterRole = (req.headers['x-role'] as string);

            if (!code || !requesterId) return res.status(400).json({ error: "Missing params" });
            
            // Hanya pemilik atau super_admin yang boleh menghapus
            // (Disederhanakan: Backend db.deleteExam saat ini menghapus berdasarkan code)
            // Idealnya kita cek dulu kepemilikan di sini, tapi untuk MVP kita percaya client side check + header ID
            
            await db.deleteExam(requesterId, code as string);
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: `Method '${req.method}' not allowed on /api/exams` });
        
    } catch (error: any) {
        console.error("API Error:", error);
        return res.status(500).json({ error: error.message });
    }
}
