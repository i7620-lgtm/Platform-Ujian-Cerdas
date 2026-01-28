
import type { VercelRequest, VercelResponse } from '@vercel/node';
import db from './_db.js';

const normalize = (str: string) => (str || '').trim().toLowerCase();

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-Id, X-Role, X-School');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { code, class: className, studentId } = req.query; 
        const requesterId = (req.headers['x-user-id'] as string);
        const requesterRole = (req.headers['x-role'] as string);
        
        // SECURITY CHECK REVISED:
        // Jika tidak ada User ID (berarti diakses siswa/publik)
        if (!requesterId) {
            // 1. Jika ada studentId, berarti siswa mengecek progresnya sendiri (BOLEH)
            if (studentId) {
                // Lanjut ke pengambilan data
            } 
            // 2. Jika HANYA ada kode (berarti publik melihat dashboard live)
            else if (code) {
                const teachers = await db.getAllTeacherKeys();
                let isPublicStreamEnabled = false;
                for (const tId of teachers) {
                    const exams = await db.getExams(tId);
                    const found = exams.find((e: any) => e.code === code);
                    if (found && found.config && found.config.enablePublicStream) {
                        isPublicStreamEnabled = true;
                        break;
                    }
                }
                if (!isPublicStreamEnabled) {
                    return res.status(403).json({ error: 'Akses Ditolak: Fitur pantauan publik tidak diaktifkan.' });
                }
            } else {
                return res.status(401).json({ error: 'Kredensial tidak ditemukan.' });
            }
        }

        // Ambil hasil dari database
        const allResults = await db.getResults('GLOBAL_TEACHER', code as string, className as string);

        // Filter tambahan jika pencarian spesifik per siswa
        let filteredResults = allResults;
        if (studentId) {
            filteredResults = allResults.filter((r: any) => r.student.studentId === studentId);
        }

        return res.status(200).json(filteredResults);

    } catch (error: any) {
         return res.status(500).json({ error: error.message });
    }
}
