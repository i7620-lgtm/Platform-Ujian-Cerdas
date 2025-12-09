
import pg from 'pg';

// --- ROBUST ESM IMPORT STRATEGY ---
// Vercel dengan "type": "module" kadang membingungkan saat mengimpor library CommonJS seperti 'pg'.
// Kita menggunakan 'esModuleInterop' di tsconfig, tapi kita juga melakukan double-check
// untuk memastikan kita mendapatkan Constructor Pool yang benar.
const Pool = pg.Pool || (pg as any).default?.Pool;

let pool: any;

const getPool = () => {
    if (!pool) {
        if (!process.env.DATABASE_URL) {
            console.error("CRITICAL ERROR: DATABASE_URL environment variable is missing.");
            throw new Error("DATABASE_URL is missing");
        }

        // Validasi apakah library termuat dengan benar
        if (!Pool) {
             console.error("CRITICAL ERROR: Failed to load 'pg' library. Pool constructor is undefined.");
             throw new Error("PG Library Load Failed");
        }

        console.log("Initializing DB Pool (ESM Mode)...");
        console.log("DB Host:", process.env.DATABASE_URL.split('@')[1]?.split(':')[0] || 'hidden');

        try {
            pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: { rejectUnauthorized: false }, // Wajib untuk Neon/AWS
                max: 1, // Tetap 1 untuk Serverless environment agar tidak membanjiri koneksi
                connectionTimeoutMillis: 15000, // Perpanjang timeout untuk cold start
                idleTimeoutMillis: 15000, 
            });
            
            pool.on('error', (err: Error) => {
                console.error('Unexpected DB Pool Error:', err);
            });
            
            console.log("DB Pool Created Successfully.");
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
        const start = Date.now();
        try {
            const res = await p.query(text, params);
            // const duration = Date.now() - start;
            // console.log('Executed query', { text, duration, rows: res.rowCount });
            return res;
        } catch (error) {
            console.error('Query Error', { text, error });
            throw error;
        }
    },
    getClient: async () => {
        const p = getPool();
        return await p.connect();
    }
};
