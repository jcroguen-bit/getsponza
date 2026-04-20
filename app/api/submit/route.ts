import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

let pool: Pool | null = null;

function getPool() {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

function detectPlatform(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("instagram.com")) return "instagram";
  if (u.includes("tiktok.com")) return "tiktok";
  return "unknown";
}

async function ensureTable() {
  const p = getPool();
  await p.query(`
    CREATE TABLE IF NOT EXISTS submissions (
      id SERIAL PRIMARY KEY,
      url TEXT NOT NULL,
      email TEXT,
      platform TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

export async function POST(req: NextRequest) {
  try {
    const { url, email } = await req.json();
    if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

    const platform = detectPlatform(url);

    await ensureTable();
    const p = getPool();
    await p.query(
      "INSERT INTO submissions (url, email, platform) VALUES ($1, $2, $3)",
      [url, email || null, platform]
    );

    return NextResponse.json({ ok: true, platform });
  } catch (err) {
    console.error("Submit error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
