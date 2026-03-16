import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔌 Initializing Database Pool...');
let dbUrl = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;

if (!dbUrl) {
  console.error('❌ Neither DATABASE_URL nor DATABASE_PUBLIC_URL is defined!');
} else {
  dbUrl = dbUrl.trim();
  const protocolMatch = dbUrl.match(/^[^:]+:\/\//);
  const protocol = protocolMatch ? protocolMatch[0] : 'unknown';
  
  // Log censored info for debugging
  const censoredUrl = dbUrl.replace(/:([^@]+)@/, ':****@');
  console.log(`📡 DB URL Info: Protocol=${protocol}, Length=${dbUrl.length}`);
  console.log(`📡 Censored URL: ${censoredUrl.substring(0, 30)}...${censoredUrl.substring(censoredUrl.length - 15)}`);
  
  // Check for common issues
  if (dbUrl.includes(' ')) console.warn('⚠️ WARNING: Database URL contains spaces!');
  if (dbUrl.includes('\n') || dbUrl.includes('\r')) console.warn('⚠️ WARNING: Database URL contains newlines!');
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
