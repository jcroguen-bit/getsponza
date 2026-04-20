import { Pool } from "pg";

let pool: Pool | null = null;
let initPromise: Promise<void> | null = null;

export function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
    });
  }

  return pool;
}

export async function ensureDatabase() {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const db = getPool();

    await db.query(`
      CREATE TABLE IF NOT EXISTS submissions (
        id SERIAL PRIMARY KEY,
        url TEXT NOT NULL,
        email TEXT,
        platform TEXT,
        niche_notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS sponsorship_kits (
        id BIGSERIAL PRIMARY KEY,
        url TEXT NOT NULL,
        normalized_url TEXT,
        url_hash TEXT,
        niche_notes TEXT,
        niche_hash TEXT,
        cache_key TEXT,
        platform TEXT NOT NULL,
        email TEXT,
        scrape_json JSONB,
        full_kit_json JSONB NOT NULL,
        paid_at TIMESTAMPTZ,
        pack_ready_at TIMESTAMPTZ,
        pack_last_error TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS payment_unlocks (
        id BIGSERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        amount_cents INTEGER,
        currency TEXT,
        stripe_session_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS kit_failures (
        id BIGSERIAL PRIMARY KEY,
        url TEXT,
        email TEXT,
        platform TEXT,
        cache_key TEXT,
        step TEXT NOT NULL,
        error_message TEXT NOT NULL,
        details JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query(`
      ALTER TABLE submissions
      ADD COLUMN IF NOT EXISTS niche_notes TEXT
    `);

    await db.query(`
      ALTER TABLE sponsorship_kits
      ADD COLUMN IF NOT EXISTS normalized_url TEXT,
      ADD COLUMN IF NOT EXISTS url_hash TEXT,
      ADD COLUMN IF NOT EXISTS niche_notes TEXT,
      ADD COLUMN IF NOT EXISTS niche_hash TEXT,
      ADD COLUMN IF NOT EXISTS cache_key TEXT,
      ADD COLUMN IF NOT EXISTS email TEXT,
      ADD COLUMN IF NOT EXISTS scrape_json JSONB,
      ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS pack_ready_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS pack_last_error TEXT,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()
    `);

    await db.query(`
      ALTER TABLE payment_unlocks
      ADD COLUMN IF NOT EXISTS amount_cents INTEGER,
      ADD COLUMN IF NOT EXISTS currency TEXT,
      ADD COLUMN IF NOT EXISTS stripe_session_id TEXT,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()
    `);

    await db.query(`
      ALTER TABLE kit_failures
      ADD COLUMN IF NOT EXISTS email TEXT,
      ADD COLUMN IF NOT EXISTS platform TEXT,
      ADD COLUMN IF NOT EXISTS cache_key TEXT,
      ADD COLUMN IF NOT EXISTS details JSONB
    `);

    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS sponsorship_kits_cache_key_idx
      ON sponsorship_kits (cache_key)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS sponsorship_kits_created_at_idx
      ON sponsorship_kits (created_at DESC)
    `);

    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS payment_unlocks_email_idx
      ON payment_unlocks (email)
    `);

    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS payment_unlocks_session_idx
      ON payment_unlocks (stripe_session_id)
      WHERE stripe_session_id IS NOT NULL
    `);
  })().catch((error) => {
    initPromise = null;
    throw error;
  });

  return initPromise;
}
