import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔌 Initializing Resilient Database Pool...');
const rawUrl = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL || '';

if (!rawUrl) {
  console.error('❌ CRITICAL: No database URL found in environment variables!');
}

const dbUrl = rawUrl.trim();
const isInternal = dbUrl.includes('.internal');

// Diagnostic Logging (Safe)
const censored = dbUrl.replace(/\/\/([^:]+):([^@]+)@/, '//user:****@');
console.log(`📡 DB Environment: NODE_ENV=${process.env.NODE_ENV}, Internal=${isInternal}`);
console.log(`📡 Censored URL: ${censored.substring(0, 50)}...`);

/**
 * Strategy: Most Railway Postgres instances (external) require SSL.
 * Internal ones usually DON'T. We'll try the most likely one first.
 */
const pool = new Pool({
  connectionString: dbUrl,
  ssl: (dbUrl.includes('.up.railway.app') || !isInternal) 
    ? { rejectUnauthorized: false } 
    : false,
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
  max: 10, // Limit connections to prevent overhead
});

// Log any pool-level errors immediately
pool.on('error', (err) => {
  console.error('💣 Unexpected error on idle PostgreSQL client:', err.message);
});

export async function testConnection(): Promise<void> {
  console.log('⏳ Attempting to connect to PostgreSQL...');
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW()');
    console.log('✅ DATABASE CONNECTED SUCCESSFULLY AT:', res.rows[0].now);
    client.release();
  } catch (err: any) {
    console.error('❌ Connection Attempt Failed.');
    console.error('📝 Error Message:', err.message);
    console.error('📝 Error Code:', err.code || 'N/A');
    
    if (err.message.includes('SSL')) {
      console.log('💡 HINT: This looks like an SSL negotiation failure.');
    } else if (err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED') {
      console.log('💡 HINT: The server is not reachable at this address/port.');
    }
    
    throw err;
  }
}

export default pool;
