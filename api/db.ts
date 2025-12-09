
import pg from 'pg';
const { Pool } = pg;

// Use a global variable to persist the pool across hot reloads in development
// and across invocations in serverless (if container is reused).
let pool: any;

const getPool = () => {
    if (!pool) {
        if (!process.env.DATABASE_URL) {
            console.error("CRITICAL ERROR: DATABASE_URL is missing from environment variables.");
            throw new Error("DATABASE_URL environment variable is not set");
        }

        console.log("Initializing DB Pool...");

        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }, 
            max: 1, // Keep max connections low for serverless
            connectionTimeoutMillis: 10000, 
            idleTimeoutMillis: 10000, 
        });
        
        pool.on('error', (err: Error) => {
            console.error('Unexpected DB Pool Error:', err);
        });
    }
    return pool;
};

export default {
    query: async (text: string, params?: any[]) => {
        try {
            const p = getPool();
            const result = await p.query(text, params);
            return result;
        } catch (error) {
            console.error("Query Execution Error:", error);
            throw error;
        }
    },
    getClient: async () => {
        const p = getPool();
        const client = await p.connect();
        return client;
    }
};
