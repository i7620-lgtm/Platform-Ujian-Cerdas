
import { Pool, PoolClient } from 'pg';

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
            max: 5, // Sedikit diperbesar untuk mendukung transaksi
            connectionTimeoutMillis: 10000, 
            idleTimeoutMillis: 1000, 
        });
        
        pool.on('error', (err) => {
            console.error('Unexpected error on idle DB client', err);
        });
    }
    return pool;
};

export default {
    // Query biasa (auto-connect & release)
    query: async (text: string, params?: any[]) => {
        const start = Date.now();
        const currentPool = getPool();
        try {
            const result = await currentPool.query(text, params);
            return result;
        } catch (err: any) {
            const duration = Date.now() - start;
            console.error(`DB Query Failed after ${duration}ms:`, err.message);
            throw err; 
        }
    },
    // Mendapatkan client khusus untuk transaksi (BEGIN/COMMIT)
    getClient: async (): Promise<PoolClient> => {
        const currentPool = getPool();
        const client = await currentPool.connect();
        return client;
    }
};
