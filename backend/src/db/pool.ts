import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔌 Initializing Database Pool...');
const rawUrl = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL || '';

if (!rawUrl) {
  console.error('❌ CRITICAL: No database URL found!');
}

const dbUrl = rawUrl.trim();
const isLocal = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');
const isInternal = dbUrl.includes('.internal');

// SSL Logic: Only enable for non-local, non-internal production connections
const useSSL = process.env.NODE_ENV === 'production' && !isLocal && !isInternal;

console.log(`📡 DB Config: Local=${isLocal}, Internal=${isInternal}, SSL=${useSSL}`);

const pool = new Pool({
  connectionString: dbUrl,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('💣 Database pool error:', err.message);
});

export async function testConnection(retries = 5, delayMs = 3000): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    console.log(`⏳ DB connection attempt ${attempt}/${retries}...`);
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      console.log('✅ Database connection verified');
      client.release();
      return;
    } catch (err: any) {
      console.error(`❌ Attempt ${attempt} failed: ${err.message}`);
      if (attempt < retries) {
        console.log(`⏸ Retrying in ${delayMs / 1000}s...`);
        await new Promise(res => setTimeout(res, delayMs));
      } else {
        throw err;
      }
    }
  }
}

export default pool;
