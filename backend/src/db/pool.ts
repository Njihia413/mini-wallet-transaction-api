import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔌 Initializing Database Pool...');
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not defined!');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000, // Wait up to 10 seconds to connect
  idleTimeoutMillis: 30000,       // Close idle clients after 30 seconds
});

// Log connection errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
  process.exit(-1);
});

// Test the connection
export async function testConnection(): Promise<void> {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL');
    client.release();
  } catch (err) {
    console.error('❌ Failed to connect to PostgreSQL:', err);
    throw err;
  }
}

export default pool;
