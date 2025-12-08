import { Pool } from 'pg';

// Connection String will be provided via Vercel Environment Variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Neon
  },
});

export default pool;
