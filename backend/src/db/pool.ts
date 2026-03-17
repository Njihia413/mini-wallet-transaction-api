import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'development' ? false : { rejectUnauthorized: false },
  max: 10,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('💣 Database pool error:', err.message);
});

export async function testConnection(): Promise<void> {
  console.log('⏳ Testing database connection...');
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    console.log('✅ Database connection verified');
    client.release();
  } catch (err: any) {
    console.error('❌ Connection failed:', err.message);
    throw err;
  }
}

export default pool;
