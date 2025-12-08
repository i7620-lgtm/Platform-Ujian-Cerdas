
import { Pool } from 'pg';

let pool: Pool | undefined;

const getPool = () => {
    // Re-initialize if undefined
    if (!pool) {
        if (!process.env.DATABASE_URL) {
            console.error("DATABASE_URL is missing from environment variables.");
            throw new Error("DATABASE_CONFIG_MISSING");
        }

        console.log("Initializing DB Pool (Serverless Optimized)...");
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }, // Required for Neon
            max: 1, // CRITICAL: Limit to 1 connection per lambda to prevent exhaustion
            connectionTimeoutMillis: 3000, // Fail fast (3s) instead of hanging
            idleTimeoutMillis: 1000, // Close idle connections quickly
        });
        
        pool.on('error', (err) => {
            console.error('Unexpected error on idle DB client', err);
            // Don't exit process in serverless, just log
        });
    }
    return pool;
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default {
    query: async (text: string, params?: any[]) => {
        let retries = 2; // Reduced retries to avoid Vercel 10s timeout limit
        
        while (retries >= 0) {
            try {
                const currentPool = getPool();
                return await currentPool.query(text, params);
            } catch (err: any) {
                const isConnectionError = 
                    err.code === '57P03' || // starting_up
                    err.code === '08006' || // connection_failure
                    err.code === '08001' || // sqlclient_unable_to_establish_sqlconnection
                    err.message.includes('timeout') || 
                    err.message.includes('Connection terminated');

                if (isConnectionError && retries > 0) {
                    console.warn(`DB Connection Warning: ${err.message}. Retrying in 1s...`);
                    retries--;
                    await sleep(1000); // Shorter sleep (1s)
                    continue; 
                }
                
                // If it's not a connection error, or we ran out of retries, throw immediately
                console.error("DB Query Fatal Error:", err);
                throw err; 
            }
        }
    }
};
