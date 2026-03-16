import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔌 Initializing Database Pool...');
const dbUrl = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;

if (!dbUrl) {
  console.error('❌ Neither DATABASE_URL nor DATABASE_PUBLIC_URL is defined!');
} else {
  console.log(`📡 Database URL found (length: ${dbUrl.length})`);
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
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
