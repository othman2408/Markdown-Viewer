import { SQL } from "bun";

type DbRow = Record<string, unknown>;
type DbClient = SQL;

let db: DbClient | null = null;

function getDb(): DbClient {
  if (db) return db;
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }
  db = new SQL({
    url: process.env.DATABASE_URL,
    max: Number(process.env.DB_POOL_MAX || 10),
    idleTimeout: Number(process.env.DB_IDLE_TIMEOUT || 30),
    connectionTimeout: Number(process.env.DB_CONNECTION_TIMEOUT || 30)
  });
  return db;
}

async function closeDb(): Promise<void> {
  if (!db) return;
  await db.close();
  db = null;
}

async function withTransaction<T>(fn: (client: DbClient) => Promise<T>): Promise<T> {
  return getDb().begin(fn);
}

export {
  closeDb,
  getDb,
  type DbClient,
  type DbRow,
  withTransaction
};
