import { Pool } from 'pg';

let pool: Pool | undefined;

// Hanya inisialisasi Pool jika DATABASE_URL tersedia
try {
    if (process.env.DATABASE_URL) {
        console.log("Initializing DB Pool...");
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            // Neon and Vercel Postgres require SSL. 
            // rejectUnauthorized: false is often needed for self-signed certs in serverless envs.
            ssl: { rejectUnauthorized: false }, 
            connectionTimeoutMillis: 15000, // 15s timeout for Cold Starts
            idleTimeoutMillis: 20000,       // Keep idle clients a bit longer
            max: 5                          // Limit max connections for serverless
        });
        
        // Tangkap error tak terduga pada client yang idle agar tidak crash
        pool.on('error', (err) => {
            console.error('Unexpected error on idle DB client', err);
        });
    } else {
        console.warn("DATABASE_URL is not defined in environment variables.");
    }
} catch (err) {
    console.error("Failed to initialize pool:", err);
}

// Export wrapper function
export default {
    query: async (text: string, params?: any[]) => {
        if (!pool) {
            console.error("Attempted DB query but pool is not initialized. Check DATABASE_URL.");
            throw new Error("DATABASE_NOT_CONFIGURED: Pool not initialized");
        }
        return pool.query(text, params);
    }
};
