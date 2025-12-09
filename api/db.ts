
import { Pool } from 'pg';

let pool: Pool | undefined;

const getPool = () => {
    if (!pool) {
        if (!process.env.DATABASE_URL) {
            console.error("DATABASE_URL is missing from environment variables.");
            throw new Error("DATABASE_CONFIG_MISSING");
        }

        console.log("Initializing DB Pool...");
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }, 
            max: 2, // Allow slightly more concurrency for image batches
            connectionTimeoutMillis: 8000, // Fail fast before Vercel 10s limit
            idleTimeoutMillis: 1000, 
        });
        
        pool.on('error', (err) => {
            console.error('Unexpected error on idle DB client', err);
        });
    }
    return pool;
};

export default {
    query: async (text: string, params?: any[]) => {
        const start = Date.now();
        try {
            const currentPool = getPool();
            const result = await currentPool.query(text, params);
            return result;
        } catch (err: any) {
            const duration = Date.now() - start;
            console.error(`DB Query Failed after ${duration}ms:`, err.message);
            throw err; 
        }
    }
};
