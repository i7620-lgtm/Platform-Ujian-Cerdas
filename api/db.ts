import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL environment variable is missing. Database operations will fail gracefully.");
}

// Connection String will be provided via Vercel Environment Variables
// We provide a fallback to prevent immediate crash during initialization in dev/build environments
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://user:pass@localhost:5432/db_placeholder',
  ssl: process.env.DATABASE_URL ? {
    rejectUnauthorized: false, // Required for Neon
  } : undefined,
});

export default pool;
