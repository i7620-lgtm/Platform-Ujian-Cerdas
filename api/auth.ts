
import type { VercelRequest, VercelResponse } from '@vercel/node';
import db from './_db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: `Method '${req.method}' not allowed. Only POST.` });

    try {
        const { action } = req.body;

        if (action === 'login') {
            const { username, password } = req.body;
            if (!username || !password) return res.status(400).json({ error: 'Data tidak lengkap' });

            const user = await db.getManualUser(username);

            if (user && user.password === password) {
                await db.getUserSpreadsheetId(username);
                return res.status(200).json({ 
                    success: true, 
                    username: user.username,
                    fullName: user.full_name,
                    accountType: user.account_type,
                    school: user.school,
                    avatarUrl: user.avatar_url
                });
            } else {
                return res.status(401).json({ success: false, error: 'Username atau Password salah.' });
            }
        }
        else if (action === 'google-login') {
            const { token } = req.body;
            if (!token) return res.status(400).json({ error: 'Token Google diperlukan' });

            let googleRes;
            try {
                googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
            } catch (networkErr) {
                return res.status(502).json({ success: false, error: 'Gagal menghubungi server Google.' });
            }

            if (!googleRes.ok) {
                return res.status(401).json({ success: false, error: 'Token Google tidak valid.' });
            }

            const payload = await googleRes.json() as any;
            const { email, name, picture } = payload;

            try {
                const roleData = await db.getUserRole(email);
                await db.getUserSpreadsheetId(email);

                return res.status(200).json({ 
                    success: true, 
                    username: email,
                    fullName: name,
                    avatar: picture,
                    accountType: roleData.role,
                    school: roleData.school
                });
            } catch (dbError: any) {
                console.error("DB Error:", dbError);
                return res.status(500).json({ 
                    success: false, 
                    error: dbError.message,
                    details: 'Cek Log Vercel.'
                });
            }
        }
        else if (action === 'get-users') {
            const users = await db.getAllAdmins();
            return res.status(200).json(users);
        }
        else if (action === 'update-role') {
            const { email, role, school } = req.body;
            await db.updateUserRole(email, role, school);
            return res.status(200).json({ success: true });
        }

        return res.status(400).json({ error: 'Action not recognized' });

    } catch (error: any) {
        console.error("Auth Critical Error:", error);
        return res.status(500).json({ error: "Server Error", details: error.message });
    }
}
