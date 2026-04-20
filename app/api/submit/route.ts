import { NextRequest, NextResponse } from "next/server";

import { ensureDatabase, getPool } from "@/lib/db";
import { detectPlatform, normalizeEmail, normalizeUrl } from "@/lib/sponza/utils";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { url, email, niche_notes } = await req.json();
    if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

    const normalizedUrl = normalizeUrl(url);
    const platform = detectPlatform(normalizedUrl);

    await ensureDatabase();
    const p = getPool();
    await p.query(
      "INSERT INTO submissions (url, email, platform, niche_notes) VALUES ($1, $2, $3, $4)",
      [normalizedUrl, normalizeEmail(email), platform, niche_notes?.trim() || null]
    );

    return NextResponse.json({ ok: true, platform });
  } catch (err) {
    console.error("Submit error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
