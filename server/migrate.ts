import { closeDb, getDb, withTransaction } from "./db";
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
  },
  {
    name: "003_document_versions",
    sql: `
      CREATE TABLE IF NOT EXISTS document_versions (
        id text PRIMARY KEY,
        document_id text NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title text NOT NULL,
        content text NOT NULL DEFAULT '',
        content_hash text NOT NULL,
        source text NOT NULL DEFAULT 'autosave',
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS documents_user_updated_idx
        ON documents (user_id, deleted_at, updated_at DESC);

      CREATE INDEX IF NOT EXISTS documents_user_title_idx
        ON documents (user_id, lower(title));

      CREATE INDEX IF NOT EXISTS document_versions_user_document_created_idx
        ON document_versions (user_id, document_id, created_at DESC);
    `
  },
  {
    name: "004_document_workspace_membership",
    sql: `
      ALTER TABLE documents
        ADD COLUMN IF NOT EXISTS in_workspace boolean NOT NULL DEFAULT true;

      CREATE INDEX IF NOT EXISTS documents_user_workspace_order_idx
        ON documents (user_id, in_workspace, deleted_at, sort_order, created_at);
    `
  }
];

async function runMigrations() {
  const db = getDb();
  await db`
    CREATE TABLE IF NOT EXISTS migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  for (const migration of migrations) {
    const applied = await db`SELECT 1 FROM migrations WHERE name = ${migration.name}`;
    if (applied.length) continue;
    await withTransaction(async (transaction) => {
      await transaction.unsafe(migration.sql);
      await transaction`INSERT INTO migrations (name) VALUES (${migration.name})`;
      console.log(`Applied migration ${migration.name}`);
    });
  }
}

if (import.meta.main) {
  runMigrations()
    .then(() => closeDb())
    .catch(async (error) => {
      console.error(error);
      await closeDb();
      process.exit(1);
    });
}

export {
  runMigrations
};
