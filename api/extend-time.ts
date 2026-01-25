
import type { VercelRequest, VercelResponse } from '@vercel/node';
import db from './db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { examCode, additionalMinutes } = req.body;

        if (!examCode || typeof additionalMinutes !== 'number') {
            return res.status(400).json({ error: 'Invalid parameters' });
        }

        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            
            // 1. Get current config
            const result = await client.query('SELECT config FROM exams WHERE code = $1 FOR UPDATE', [examCode]);
            
            if (result.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Exam not found' });
            }

            const currentConfig = JSON.parse(result.rows[0].config || '{}');
            const oldTimeLimit = parseInt(currentConfig.timeLimit || '60');
            const newTimeLimit = oldTimeLimit + additionalMinutes;

            // 2. Update config
            const newConfig = { ...currentConfig, timeLimit: newTimeLimit };
            
            await client.query('UPDATE exams SET config = $1 WHERE code = $2', [JSON.stringify(newConfig), examCode]);
            await client.query('COMMIT');

            return res.status(200).json({ success: true, newTimeLimit });

        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }

    } catch (error: any) {
        console.error("Extend Time Error:", error);
        return res.status(500).json({ error: "Server Error" });
    }
}
