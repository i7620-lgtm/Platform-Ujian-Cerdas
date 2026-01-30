
import type { VercelRequest, VercelResponse } from '@vercel/node';
import db from './_db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-Id, X-Role, X-School');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { action } = req.body;

        if (action === 'login') {
            const { username, password } = req.body;
            // Logging untuk debugging (jangan log password di production)
            console.log(`Attempting login for: ${username}`);
            
            const user = await db.loginUser(username, password);
            if (user) {
                return res.status(200).json({ success: true, ...user });
            } else {
                return res.status(401).json({ success: false, error: 'Username atau Password salah.' });
            }
        }

        if (action === 'register') {
            const { username, password, fullName, school } = req.body;
            
            if (!username || !fullName || !school) {
                return res.status(400).json({ success: false, error: 'Semua data wajib diisi.' });
            }

            try {
                const user = await db.registerUser({ username, password: password || '', fullName, school });
                return res.status(200).json({ success: true, ...user });
            } catch (e: any) {
                const errMsg = e.message || '';
                if (errMsg.includes('Username sudah terdaftar') || errMsg.includes('exists') || errMsg.includes('dipakai')) {
                    const existingUser = await db.findUser(username);
                    if (existingUser) {
                        return res.status(200).json({ success: true, ...existingUser });
                    }
                }
                console.error("Register Error:", e);
                return res.status(400).json({ success: false, error: errMsg });
            }
        }
        
        if (action === 'google-login') {
             const { token } = req.body;
             const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
             const payload = await googleRes.json() as any;
             
             if (payload.email) {
                 const existingUser = await db.findUser(payload.email);
                 if (existingUser) {
                     return res.status(200).json({
                         success: true,
                         ...existingUser,
                         avatar: payload.picture
                     });
                 } else {
                     return res.status(200).json({
                         success: false,
                         requireRegistration: true,
                         googleData: {
                             email: payload.email,
                             name: payload.name,
                             picture: payload.picture
                         }
                     });
                 }
             } else {
                 return res.status(400).json({ error: 'Token Google tidak valid.' });
             }
        }

        const requesterRole = req.headers['x-role'] as string;
        
        if (action === 'get-users') {
            if (requesterRole !== 'super_admin') return res.status(403).json({ error: "Akses Ditolak" });
            const allUsers = await db.getAllUsers();
            return res.status(200).json(allUsers.filter((u: any) => u.accountType !== 'super_admin').map((u: any) => ({
                email: u.username, fullName: u.fullName, role: u.accountType, school: u.school
            })));
        }

        if (action === 'update-role') {
            if (requesterRole !== 'super_admin') return res.status(403).json({ error: "Akses Ditolak" });
            const { email, role, school } = req.body;
            const success = await db.updateUserRole(email, role, school || '');
            return res.status(200).json({ success });
        }

        return res.status(400).json({ error: 'Aksi tidak didukung.' });

    } catch (error: any) {
        console.error("API Auth Crash:", error); // Penting untuk Vercel Logs
        // Mengembalikan JSON error, BUKAN membiarkan crash (yang menghasilkan HTML 500)
        return res.status(500).json({ success: false, error: error.message || "Internal Server Error" });
    }
}
