import fs from 'fs';
import path from 'path';
import pool from './pool';

export async function runMigrations(): Promise<void> {
  const sqlPath = path.join(__dirname, '../../sql/init.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  try {
    await pool.query(sql);
    console.log('✅ Database migrations completed');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  }
}

export async function resetDatabase(): Promise<void> {
  try {
    console.log('🔄 Resetting database...');
    // Drop all existing tables and triggers
    await pool.query('DROP TABLE IF EXISTS transactions, accounts CASCADE;');
    // Re-run the initial schema
    await runMigrations();
    console.log('✨ Database reset successfully');
  } catch (err) {
    console.error('❌ Database reset failed:', err);
    throw err;
  }
}

// Run directly if called as a script
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
