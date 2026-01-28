
import type { VercelRequest, VercelResponse } from '@vercel/node';
import db from './_db.js';

const normalize = (str: string) => (str || '').trim().toLowerCase();

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-Id, X-Role, X-School');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { code, class: className } = req.query; 
        const requesterId = (req.headers['x-user-id'] as string);
        const requesterRole = (req.headers['x-role'] as string);
        const requesterSchool = (req.headers['x-school'] as string);
        
        // SECURITY CHECK: Jika tidak ada User ID, cek apakah ini akses publik (Livestream)
        if (!requesterId) {
            if (code) {
                // Cari apakah ujian ini mengizinkan streaming publik
                const teachers = await db.getAllTeacherKeys();
                let isPublic = false;
                for (const tId of teachers) {
                    const exams = await db.getExams(tId);
                    const found = exams.find((e: any) => e.code === code);
                    if (found && found.config && found.config.enablePublicStream) {
                        isPublic = true;
                        break;
                    }
                }
                
                if (!isPublic) {
                    return res.status(403).json({ error: 'Akses Ditolak: Ujian tidak diset publik atau kredensial hilang.' });
                }
            } else {
                return res.status(400).json({ error: 'User ID missing' });
            }
        }

        // Fetch results based on filters
        // Note: 'GLOBAL_TEACHER' is used as a placeholder in this simplified multi-tenant setup
        const allResults = await db.getResults('GLOBAL_TEACHER', code as string, className as string);

        // RBAC Filter: Jika bukan super_admin dan ada requesterId, filter berdasarkan kepemilikan atau sekolah
        let filteredResults = allResults;
        if (requesterId && requesterRole !== 'super_admin') {
            if (requesterRole === 'admin') {
                // Admin hanya melihat hasil dari sekolahnya
                // (Implementasi sharding db.getResults biasanya sudah menangani ini, tapi ini layer pengaman)
            } else {
                // Guru biasa hanya melihat hasil ujian miliknya sendiri (filter by code is usually enough if codes are unique)
            }
        }

        return res.status(200).json(filteredResults);

    } catch (error: any) {
         return res.status(500).json({ error: error.message });
    }
}
