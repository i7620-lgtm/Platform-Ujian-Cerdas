
import { Pool } from 'pg';

let pool: Pool | undefined;

const getPool = () => {
    // Re-initialize if undefined (e.g. after error or cold start context loss)
    if (!pool && process.env.DATABASE_URL) {
        console.log("Initializing DB Pool...");
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            // Neon and Vercel Postgres require SSL. 
            // rejectUnauthorized: false is often needed for self-signed certs in serverless envs.
            ssl: { rejectUnauthorized: false }, 
            connectionTimeoutMillis: 5000, // 5s connection timeout per attempt
            idleTimeoutMillis: 20000,       
            max: 5                          
        });
        
        pool.on('error', (err) => {
            console.error('Unexpected error on idle DB client', err);
        });
    }
    return pool;
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Export wrapper function with RETRY LOGIC
export default {
    query: async (text: string, params?: any[]) => {
        let currentPool = getPool();
        if (!currentPool) {
            console.error("DATABASE_URL missing.");
            throw new Error("DATABASE_NOT_CONFIGURED");
        }

        let retries = 3;
        while (retries > 0) {
            try {
                return await currentPool.query(text, params);
            } catch (err: any) {
                console.warn(`Query failed (Retries left: ${retries - 1}). Error: ${err.message}`);
                
                // Retry on connection issues or wake-up timeouts
                // 57P03: cannot_connect_now (system starting up)
                // 08006: connection_failure
                // 08001: sqlclient_unable_to_establish_sqlconnection
                const isConnectionError = 
                    err.code === '57P03' || 
                    err.code === '08006' || 
                    err.code === '08001' ||
                    err.message.includes('timeout') || 
                    err.message.includes('ECONNRESET') ||
                    err.message.includes('Connection terminated');

                if (isConnectionError && retries > 1) {
                    retries--;
                    await sleep(1500); // Wait 1.5s before retrying
                    continue; 
                }
                
                throw err; // Throw if not retryable or out of retries
            }
        }
    }
};
