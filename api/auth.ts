

import type { VercelRequest, VercelResponse } from '@vercel/node';
import db from './db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // FIX: Set specific origin instead of '*' when using credentials
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { action } = req.body;

        // --- LOGIN MANUAL (Mengecek Tab USERS di Master Sheet) ---
        if (action === 'login') {
            const { username, password } = req.body;
            if (!username || !password) return res.status(400).json({ error: 'Data tidak lengkap' });

            const user = await db.getManualUser(username);

            if (user && user.password === password) {
                // Ensure sheet is provisioned for this manual user
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

        // --- LOGIN GOOGLE ---
        else if (action === 'google-login') {
            const { token } = req.body;
            if (!token) return res.status(400).json({ error: 'Token Google diperlukan' });

            // Verifikasi Token
            const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
            if (!googleRes.ok) return res.status(401).json({ success: false, error: 'Token Google tidak valid.' });

            const payload = await googleRes.json() as any;
            const { email, name, picture } = payload;

            if (!email) return res.status(400).json({ success: false, error: 'Email tidak ditemukan.' });

            // Cek Role di Sheet ROLES
            const roleData = await db.getUserRole(email);
            
            // Trigger auto-provisioning sheet
            await db.getUserSpreadsheetId(email);

            return res.status(200).json({ 
                success: true, 
                username: email,
                fullName: name,
                avatar: picture,
                accountType: roleData.role,
                school: roleData.school
            });
        }

        // --- ADMIN: GET ALL USERS (ROLES) ---
        else if (action === 'get-users') {
            // In prod, verify requester is super_admin via session/token
            const users = await db.getAllAdmins();
            return res.status(200).json(users);
        }

        // --- ADMIN: UPDATE ROLE ---
        else if (action === 'update-role') {
            const { email, role, school } = req.body;
            await db.updateUserRole(email, role, school);
            return res.status(200).json({ success: true });
        }

        return res.status(400).json({ error: 'Action not recognized' });

    } catch (error: any) {
        console.error("Auth Error:", error);
        // Return 500 but with error message in body so client can display it if possible
        return res.status(500).json({ error: "Server Error", details: error.message });
    }
}
