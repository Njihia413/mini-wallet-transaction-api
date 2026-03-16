import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔌 Initializing Database Pool...');
let dbUrl = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;

if (!dbUrl) {
  console.error('❌ Neither DATABASE_URL nor DATABASE_PUBLIC_URL is defined!');
} else {
  dbUrl = dbUrl.trim();
  const isInternal = dbUrl.includes('.internal');
  
  // Advanced Diagnostics (Safe)
  const censored = dbUrl.replace(/\/\/[^:]+:([^@]+)@/, '//user:****@');
  console.log(`📡 DB URL Info: Internal=${isInternal}, Length=${dbUrl.length}`);
  console.log(`📡 Censored URL: ${censored.substring(0, 40)}...`);
  
  try {
    const parsed = new URL(dbUrl);
    console.log(`✅ URL host detected: ${parsed.hostname}`);
  } catch (e) {
    console.error('❌ ERROR: URL is malformed');
  }
}

const pool = new Pool({
  connectionString: dbUrl,
  // Disable SSL for internal Railway connections, enable for public ones
  ssl: (process.env.NODE_ENV === 'production' && !dbUrl?.includes('.internal')) 
    ? { rejectUnauthorized: false } 
    : false,
  connectionTimeoutMillis: 20000,
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
