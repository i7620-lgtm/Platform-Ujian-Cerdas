import { Pool, PoolClient } from 'pg';

let pool: Pool | undefined;

const getPool = () => {
    if (!pool) {
        if (!process.env.DATABASE_URL) {
            console.error("CRITICAL ERROR: DATABASE_URL is missing from environment variables.");
            // We don't throw here to allow other logic to run, but query will fail.
        }

        console.log("Initializing DB Pool...");

        // Optimization for Serverless (Vercel + Neon)
        // We use a single connection max to avoid overwhelming the database during cold starts
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }, 
            max: 1, 
            connectionTimeoutMillis: 8000, // Increased timeout for slower cold starts
            idleTimeoutMillis: 5000, 
        });
        
        pool.on('error', (err) => {
            console.error('Unexpected DB Pool Error:', err);
            // Don't exit process, just log. Serverless will restart if needed.
        });
    }
    return pool;
};

export default {
    query: async (text: string, params?: any[]) => {
        const p = getPool();
        if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");

        const client = await p.connect();
        try {
            const result = await client.query(text, params);
            return result;
        } catch (error) {
            console.error("Query Error:", error);
            throw error;
        } finally {
            client.release();
        }
    },
    getClient: async (): Promise<PoolClient> => {
        const p = getPool();
        if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
        return await p.connect();
    }
};
