
import { createRequire } from 'module';

// --- SOLUSI PAMUNGKAS UNTUK VERCEL/ESM ---
// Menggunakan 'createRequire' untuk memuat library 'pg' (CommonJS) 
// secara manual. Ini melewati masalah kompatibilitas import ESM 
// yang sering menyebabkan Pool menjadi undefined.
const require = createRequire(import.meta.url);
const pg = require('pg');

const { Pool } = pg;

let pool: any;

const getPool = () => {
    if (!pool) {
        if (!process.env.DATABASE_URL) {
            console.error("CRITICAL: DATABASE_URL is missing.");
            throw new Error("DATABASE_URL is missing");
        }

        // Double check untuk memastikan library terload
        if (!Pool) {
             console.error("CRITICAL: 'pg' library failed to load via createRequire.");
             throw new Error("PG Library Load Failed");
        }

        console.log("Initializing DB Pool (CommonJS Mode)...");

        try {
            pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: { rejectUnauthorized: false }, // Wajib untuk Neon/AWS
                max: 1, // Tetap 1 untuk Serverless
                connectionTimeoutMillis: 10000,
                idleTimeoutMillis: 10000, 
            });
            
            pool.on('error', (err: Error) => {
                console.error('Unexpected DB Pool Error:', err);
            });
        } catch (e) {
            console.error("Failed to create Pool:", e);
            throw e;
        }
    }
    return pool;
};

export default {
    query: async (text: string, params?: any[]) => {
        const p = getPool();
        return await p.query(text, params);
    },
    getClient: async () => {
        const p = getPool();
        return await p.connect();
    }
};
