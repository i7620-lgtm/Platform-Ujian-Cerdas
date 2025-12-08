
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
            // Vercel Free Tier has a 10s limit. 
            // We set timeout to 8s to allow Neon cold start (usually 3-5s) 
            // but fail before Vercel kills the process hard.
            connectionTimeoutMillis: 8000, 
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
            
            // Provide clearer error message for timeouts
            if (err.message.includes('timeout') || duration > 7000) {
                console.error("Tip: Database might be in Cold Start. Please try again in a few seconds.");
            }
            throw err; 
        }
    }
};
