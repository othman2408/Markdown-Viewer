import { Pool, type PoolClient } from "pg";

let pool: Pool | null = null;

function getPool(): Pool {
  if (pool) return pool;
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("sslmode=require")
      ? { rejectUnauthorized: false }
      : undefined
  });
  return pool;
}

async function closePool(): Promise<void> {
  if (!pool) return;
  await pool.end();
  pool = null;
}

async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export {
  closePool,
  getPool,
  withTransaction
};
