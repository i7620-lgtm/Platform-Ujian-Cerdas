
import { Pool } from 'pg';

let pool: Pool | undefined;

const getPool = () => {
    // Re-initialize if undefined
    if (!pool) {
        if (!process.env.DATABASE_URL) {
            console.error("DATABASE_URL is missing from environment variables.");
            throw new Error("DATABASE_CONFIG_MISSING");
        }

        console.log("Initializing DB Pool (Vercel Optimized)...");
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }, // Required for Neon
            max: 1, // Keep connections low for serverless
            // Vercel Free Tier limit is 10s. We set 9s to allow max time for cold start
            // but fail gracefully before Vercel hard kills the process.
            connectionTimeoutMillis: 9000, 
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
