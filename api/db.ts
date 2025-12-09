
import * as pg from 'pg';

// Robust import strategy for Vercel/ESM environments
// 'import * as pg' ensures we capture the entire module namespace,
// preventing "does not provide an export named default" errors.
const Pool = (pg as any).Pool || (pg as any).default?.Pool;

// Global pool variable to persist connection across hot-reloads
let pool: any;

const getPool = () => {
    if (!pool) {
        if (!process.env.DATABASE_URL) {
            const msg = "CRITICAL ERROR: DATABASE_URL is missing in Vercel Environment Variables.";
            console.error(msg);
            throw new Error(msg);
        }

        if (!Pool) {
             const msg = "CRITICAL ERROR: 'pg' library failed to load. Pool is undefined.";
             console.error(msg, { pgExport: pg });
             throw new Error(msg);
        }

        console.log("Initializing DB Pool...");

        try {
            pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: { rejectUnauthorized: false }, // Required for Neon/AWS RDS
                max: 1, // Strict limit for serverless to prevent connection exhaustion
                connectionTimeoutMillis: 15000, // 15s timeout
                idleTimeoutMillis: 15000, 
            });
            
            pool.on('error', (err: Error) => {
                console.error('Unexpected DB Pool Error:', err);
                // Do not exit process in serverless, just log
            });
        } catch (e) {
            console.error("Failed to create DB Pool constructor:", e);
            throw e;
        }
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
