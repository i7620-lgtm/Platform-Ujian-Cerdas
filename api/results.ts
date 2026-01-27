
import type { VercelRequest, VercelResponse } from '@vercel/node';
import db from './_db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-Id, X-Role, X-School');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { code } = req.query;
        const requesterId = (req.headers['x-user-id'] as string);
        const requesterRole = (req.headers['x-role'] as string) || 'guru';
        
        if (!requesterId) return res.status(400).json({ error: 'User ID missing' });

        let results: any[] = [];

        if (requesterRole === 'super_admin' || requesterRole === 'admin') {
             const teachers = await db.getAllTeacherKeys();
             for (const tId of teachers) {
                 const r = await db.getResults(tId, code as string);
                 results = [...results, ...r];
             }
        } else {
             results = await db.getResults(requesterId, code as string);
        }

        return res.status(200).json(results);

    } catch (error: any) {
         return res.status(500).json({ error: error.message });
    }
}
