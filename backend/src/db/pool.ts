import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔌 Initializing Database Pool...');
let dbUrl = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;

if (!dbUrl) {
  console.error('❌ Neither DATABASE_URL nor DATABASE_PUBLIC_URL is defined!');
} else {
  dbUrl = dbUrl.trim();
  
  // Advanced Diagnostics
  const censoredUrl = dbUrl.replace(/:([^@]+)@/, ':****@');
  console.log(`📡 DB URL Info: Length=${dbUrl.length}`);
  console.log(`📡 Censored Structure: ${censoredUrl.substring(0, 40)}...${censoredUrl.substring(censoredUrl.length - 20)}`);
  
  try {
    const parsed = new URL(dbUrl);
    if (!parsed.hostname) {
      console.error('❌ ERROR: Database URL is missing the HOSTNAME (it looks like user:pass@:port/db)');
      console.error('💡 TIP: If using a public Railway URL, ensure you have clicked "Generate Domain" in your Postgres service Settings.');
    } else {
      console.log(`✅ URL host detected: ${parsed.hostname}`);
    }
  } catch (e) {
    console.error('❌ ERROR: The Database URL is malformed and cannot be parsed by Node.js.');
    console.error('💡 TIP: Check for missing slashes (e.g., postgresql:/ instead of postgresql://) or extra symbols.');
  }
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 15000,
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
