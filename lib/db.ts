import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables if not already loaded (for standalone scripts)
if (!process.env.DATABASE_URL) {
    dotenv.config({ path: '.env.local' });
}

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}

// Create a connection pool for Neon
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

// Export a query wrapper
const db = {
    query: (text: string, params?: any[]) => pool.query(text, params),
};

export default db;
