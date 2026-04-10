import pg from 'pg';

const connectionString = process.env.DATABASE_URL?.replace(
  'sslmode=require',
  'sslmode=verify-full'
);

const pool = new pg.Pool({
  connectionString,
});

export default pool;