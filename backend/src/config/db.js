import pg from 'pg';

const connectionString = process.env.DATABASE_URL?.includes('neon.tech')
  ? process.env.DATABASE_URL.replace('sslmode=require', 'sslmode=verify-full')
  : process.env.DATABASE_URL;

const pool = new pg.Pool({
  connectionString,
});

export default pool;