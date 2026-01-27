
import type { VercelRequest, VercelResponse } from '@vercel/node';
import db from './_db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { action } = req.body;

        if (action === 'login') {
            const { username, password } = req.body;
            const user = await db.loginUser(username, password);
            
            if (user) {
                return res.status(200).json({ 
                    success: true, 
                    ...user
                });
            } else {
                return res.status(401).json({ success: false, error: 'Username atau Password salah.' });
            }
        }

        if (action === 'register') {
            const { username, password, fullName, school } = req.body;
            
            if (!username || !password || !fullName || !school) {
                return res.status(400).json({ success: false, error: 'Semua data wajib diisi.' });
            }

            try {
                const user = await db.registerUser({ username, password, fullName, school });
                return res.status(200).json({ success: true, ...user });
            } catch (e: any) {
                return res.status(400).json({ success: false, error: e.message || 'Gagal mendaftar.' });
            }
        }
        
        // Google Login Support (Simplified)
        if (action === 'google-login') {
             const { token } = req.body;
             const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
             const payload = await googleRes.json() as any;
             
             if (payload.email) {
                 return res.status(200).json({
                     success: true,
                     username: payload.email,
                     fullName: payload.name,
                     avatar: payload.picture,
                     accountType: 'guru',
                     school: 'Google Account' // Bisa diupdate nanti jika ada endpoint 'update-profile'
                 });
             }
        }

        return res.status(400).json({ error: 'Action not supported' });

    } catch (error: any) {
        console.error("Auth Error:", error);
        return res.status(500).json({ error: error.message });
    }
}
