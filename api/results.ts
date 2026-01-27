
import type { VercelRequest, VercelResponse } from '@vercel/node';
import db from './_db.js';

// Helper normalisasi string
const normalize = (str: string) => (str || '').trim().toLowerCase();

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-Id, X-Role, X-School');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { code } = req.query; // Optional filter by specific exam code
        const requesterId = (req.headers['x-user-id'] as string);
        const requesterRole = (req.headers['x-role'] as string) || 'guru';
        const requesterSchool = (req.headers['x-school'] as string) || '';
        
        if (!requesterId) return res.status(400).json({ error: 'User ID missing' });

        // 1. Ambil SEMUA Results
        const allResults = await db.getResults('GLOBAL_TEACHER');

        // 2. Logic Filtering
        let filteredResults = [];

        if (requesterRole === 'super_admin') {
            filteredResults = allResults;
        } else {
            // Untuk memfilter hasil, kita harus tahu siapa pemilik ExamCode tersebut.
            // Ambil daftar semua ujian untuk pemetaan
            const allExams = await db.getExams('GLOBAL_TEACHER');
            
            let allowedExamCodes: string[] = [];

            if (requesterRole === 'admin') {
                // Admin Sekolah: Kode ujian milik sekolah ini
                allowedExamCodes = allExams
                    .filter((e: any) => normalize(e.authorSchool) === normalize(requesterSchool))
                    .map((e: any) => e.code);
            } else {
                // Guru: Kode ujian milik user ini
                allowedExamCodes = allExams
                    .filter((e: any) => e.authorId === requesterId)
                    .map((e: any) => e.code);
            }

            // Filter hasil yang examCode-nya ada di daftar yang diizinkan
            filteredResults = allResults.filter((r: any) => allowedExamCodes.includes(r.examCode));
        }

        // 3. Filter tambahan jika query param ?code=... ada
        if (code) {
            filteredResults = filteredResults.filter((r: any) => r.examCode === code);
        }

        return res.status(200).json(filteredResults);

    } catch (error: any) {
         return res.status(500).json({ error: error.message });
    }
}
