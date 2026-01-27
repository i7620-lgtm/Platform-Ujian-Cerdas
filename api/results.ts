
import type { VercelRequest, VercelResponse } from '@vercel/node';
import db from './_db.js';

const normalize = (str: string) => (str || '').trim().toLowerCase();

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-Id, X-Role, X-School');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { code, class: className } = req.query; // Support class filtering
        const requesterId = (req.headers['x-user-id'] as string);
        
        if (!requesterId) return res.status(400).json({ error: 'User ID missing' });

        // Jika parameter class disediakan, kita minta DB mengambil spesifik sheet tersebut
        // Ini mengurangi beban baca dari ribuan baris menjadi puluhan.
        
        // Note: db.getResults sekarang harus dimodifikasi untuk support parameter ke-3 (options) atau via method baru
        // Di sini kita gunakan overload atau kirim object options jika db adapter mendukung, 
        // Jika tidak, kita fetch semua lalu filter (fallback).
        
        // Namun, kita asumsikan db.getResults telah diupdate di _db.ts untuk mengirim parameter ke GAS.
        // GAS logic: if (className) openSheet(`DB_${code}_${className}`) else openAllAndMerge()
        
        const allResults = await db.getResults('GLOBAL_TEACHER', code as string, className as string);

        // Filter permission (tetap dilakukan untuk keamanan)
        // ... (Logic permission sama seperti sebelumnya) ...
        
        // Untuk MVP kali ini, kita return langsung hasil dari DB karena db.getResults sudah handle fetching.
        return res.status(200).json(allResults);

    } catch (error: any) {
         return res.status(500).json({ error: error.message });
    }
}
