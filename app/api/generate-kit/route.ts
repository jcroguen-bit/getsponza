import { NextRequest, NextResponse } from "next/server";

import { ensureDatabase } from "@/lib/db";
import { generateKitResponse, logKitFailure } from "@/lib/sponza/service";
import { detectPlatform, normalizeEmail } from "@/lib/sponza/utils";

export const runtime = "nodejs";

const USER_FACING_ERROR = "We couldn't analyze this URL — try again or paste a different URL";

function isValidEmail(email: string | undefined) {
  if (!email) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  let payload: { url?: string; email?: string; niche_notes?: string } | null = null;

  try {
    await ensureDatabase();
    payload = await req.json();

    const url = payload?.url?.trim();
    const email = normalizeEmail(payload?.email);
    const nicheNotes = payload?.niche_notes?.trim();

    if (!url) {
      return NextResponse.json({ error: "URL required" }, { status: 400 });
    }

    if (email && !isValidEmail(email)) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }

    const platform = detectPlatform(url);
    if (platform === "unknown") {
      return NextResponse.json(
        { error: "Please enter a public YouTube, Instagram, or TikTok URL" },
        { status: 400 }
      );
    }

    const response = await generateKitResponse({
      url,
      email: email || undefined,
      niche_notes: nicheNotes,
    });

    return NextResponse.json(response);
  } catch (error) {
    let platform: string | undefined;
    try {
      platform = payload?.url ? detectPlatform(payload.url) : undefined;
    } catch {
      platform = undefined;
    }

    await logKitFailure("api", {
      url: payload?.url,
      email: payload?.email,
      platform,
      error,
    });

    console.error("Generate kit error:", error);
    return NextResponse.json({ error: USER_FACING_ERROR }, { status: 500 });
  }
}
