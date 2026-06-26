import { closePool, getPool } from "./db";
import { loadAppEnv } from "./env";

loadAppEnv();

const migrations = [
  {
    name: "001_cloud_schema",
    sql: `
      CREATE TABLE IF NOT EXISTS migrations (
        name text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS users (
        id text PRIMARY KEY,
        email text NOT NULL UNIQUE,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS documents (
        id text PRIMARY KEY,
        user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title text NOT NULL,
        content text NOT NULL DEFAULT '',
        scroll_pos integer NOT NULL DEFAULT 0,
        view_mode text NOT NULL DEFAULT 'split',
        sort_order integer NOT NULL DEFAULT 0,
        client_created_at bigint,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz
      );

      CREATE INDEX IF NOT EXISTS documents_user_order_idx
        ON documents (user_id, deleted_at, sort_order, created_at);

      CREATE TABLE IF NOT EXISTS workspace_state (
        user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        active_tab_id text,
        untitled_counter integer NOT NULL DEFAULT 0,
        global_state jsonb NOT NULL DEFAULT '{}'::jsonb,
        find_replace_docked boolean NOT NULL DEFAULT false,
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS assets (
        id text PRIMARY KEY,
        user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        object_key text NOT NULL UNIQUE,
        filename text NOT NULL,
        content_type text NOT NULL,
        byte_size integer NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS assets_user_idx
        ON assets (user_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS shares (
        token text PRIMARY KEY,
        user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title text NOT NULL,
        mode text NOT NULL DEFAULT 'view',
        content text,
        content_object_key text,
        asset_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS shares_user_idx
        ON shares (user_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS session (
        sid varchar NOT NULL PRIMARY KEY,
        sess json NOT NULL,
        expire timestamp(6) NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_session_expire ON session (expire);
    `
  },
  {
    name: "002_drop_workspace_app_lang",
    sql: `
      ALTER TABLE workspace_state DROP COLUMN IF EXISTS app_lang;
    `
  }
];

async function runMigrations() {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  for (const migration of migrations) {
    const applied = await pool.query("SELECT 1 FROM migrations WHERE name = $1", [migration.name]);
    if (applied.rowCount) continue;
    await pool.query("BEGIN");
    try {
      await pool.query(migration.sql);
      await pool.query("INSERT INTO migrations (name) VALUES ($1)", [migration.name]);
      await pool.query("COMMIT");
      console.log(`Applied migration ${migration.name}`);
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
  }
}

if (import.meta.main) {
  runMigrations()
    .then(() => closePool())
    .catch(async (error) => {
      console.error(error);
      await closePool();
      process.exit(1);
    });
}

export {
  runMigrations
};
