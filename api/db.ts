
import { Pool, PoolClient } from 'pg';

let pool: Pool | undefined;

const getPool = () => {
    if (!pool) {
        if (!process.env.DATABASE_URL) {
            console.error("DATABASE_URL is missing from environment variables.");
            throw new Error("DATABASE_CONFIG_MISSING");
        }

        // Optimization for Serverless (Vercel + Neon)
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }, 
            // PENTING: Set max 1 agar tidak membanjiri koneksi saat Vercel melakukan scaling/retries
            max: 1, 
            // Fail fast: Jika tidak bisa connect dalam 5 detik, lempar error (jangan hang)
            connectionTimeoutMillis: 5000, 
            idleTimeoutMillis: 1000, 
        });
        
        pool.on('error', (err) => {
            console.warn('DB Pool Error:', err.message);
        });
    }
    return pool;
};

export default {
    query: async (text: string, params?: any[]) => {
        const client = await getPool().connect();
        try {
            const result = await client.query(text, params);
            return result;
        } finally {
            // Penting: Segera lepaskan client kembali ke pool
            client.release();
        }
    },
    getClient: async (): Promise<PoolClient> => {
        const currentPool = getPool();
        return await currentPool.connect();
    }
};
