import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: 5432,
  ssl: {
    rejectUnauthorized: false
  }
});

// Cek koneksi
pool.connect()
  .then(() => console.log('Connected to Postgres'))
  .catch(err => console.error('Connection error:', err));

export default pool;
