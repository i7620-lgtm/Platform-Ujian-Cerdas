
import type { VercelRequest, VercelResponse } from '@vercel/node';
import db from './db.js';

let isTableInitialized = false;

// 1. Inisialisasi Tabel Users & Seeding Data Guru
const ensureAuthSchema = async () => {
    if (isTableInitialized) return;
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                username TEXT PRIMARY KEY,
                password TEXT, 
                full_name TEXT,
                auth_provider TEXT DEFAULT 'local',
                avatar_url TEXT,
                created_at BIGINT
            );
        `);

        // Seed Default Guru jika belum ada
        const seedCheck = await db.query("SELECT username FROM users WHERE username = 'guru'");
        if (seedCheck.rows.length === 0) {
            console.log("Seeding default guru user...");
            await db.query(`
                INSERT INTO users (username, password, full_name, auth_provider, created_at)
                VALUES ($1, $2, $3, $4, $5)
            `, ['guru', 'guru123', 'Guru Utama', 'local', Date.now()]);
        }
        
        isTableInitialized = true;
    } catch (e) {
        console.error("Failed to init auth schema", e);
    }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        await ensureAuthSchema();
        const { action } = req.body;

        // --- LOGIN MANUAL ---
        if (action === 'login') {
            const { username, password } = req.body;
            if (!username || !password) return res.status(400).json({ error: 'Data tidak lengkap' });

            const result = await db.query(
                "SELECT username, full_name FROM users WHERE username = $1 AND password = $2 AND auth_provider = 'local'",
                [username, password]
            );

            if (result.rows.length > 0) {
                return res.status(200).json({ 
                    success: true, 
                    username: result.rows[0].username,
                    fullName: result.rows[0].full_name 
                });
            } else {
                return res.status(401).json({ success: false, error: 'Username atau Password salah.' });
            }
        }

        // --- LOGIN GOOGLE ---
        else if (action === 'google-login') {
            const { token } = req.body;
            if (!token) return res.status(400).json({ error: 'Token Google diperlukan' });

            // Verifikasi Token ke Google (Server-side Validation)
            // Menggunakan endpoint publik Google untuk validasi JWT tanpa library berat
            const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
            
            if (!googleRes.ok) {
                return res.status(401).json({ success: false, error: 'Token Google tidak valid.' });
            }

            const payload = await googleRes.json();
            const { email, name, picture } = payload;

            if (!email) {
                return res.status(400).json({ success: false, error: 'Email tidak ditemukan dalam token Google.' });
            }

            // Cek apakah user sudah ada
            const userCheck = await db.query("SELECT * FROM users WHERE username = $1", [email]);

            if (userCheck.rows.length === 0) {
                // Buat User Baru dari Data Google
                await db.query(`
                    INSERT INTO users (username, password, full_name, auth_provider, avatar_url, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `, [email, '', name, 'google', picture, Date.now()]);
                
                console.log(`Created new Google user: ${email}`);
            } else {
                // Update avatar/nama jika perlu (opsional)
                // Disini kita biarkan saja, hanya login
            }

            return res.status(200).json({ 
                success: true, 
                username: email,
                fullName: name,
                avatar: picture
            });
        }

        return res.status(400).json({ error: 'Action not recognized' });

    } catch (error: any) {
        console.error("Auth Error:", error);
        return res.status(500).json({ error: "Server Error", details: error.message });
    }
}
