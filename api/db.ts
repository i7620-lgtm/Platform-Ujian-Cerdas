import { Pool } from 'pg';

let pool: Pool | undefined;

// Hanya inisialisasi Pool jika DATABASE_URL tersedia
try {
    if (process.env.DATABASE_URL) {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }, // Diperlukan untuk Neon/Vercel Postgres
            connectionTimeoutMillis: 15000, // Timeout ditingkatkan ke 15 detik untuk Cold Start Neon
            idleTimeoutMillis: 10000, 
        });
        
        // Tangkap error tak terduga pada client yang idle agar tidak crash
        pool.on('error', (err) => {
            console.warn('Unexpected error on idle DB client', err);
        });
    } else {
        // Ini normal saat dev lokal tanpa env vars, atau saat build
        // console.warn("DATABASE_URL is not defined. API will work in offline mode.");
    }
} catch (err) {
    console.error("Failed to initialize pool:", err);
}

// Export wrapper function, bukan pool langsung
export default {
    query: async (text: string, params?: any[]) => {
        if (!pool) {
            // Lempar error spesifik yang akan ditangkap handler untuk fallback ke mode offline
            throw new Error("DATABASE_URL_MISSING");
        }
        return pool.query(text, params);
    }
};
