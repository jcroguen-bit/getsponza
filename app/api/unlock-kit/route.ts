import { NextRequest, NextResponse } from "next/server";

import { ensureDatabase } from "@/lib/db";
import { buildSponsorshipPack } from "@/lib/sponza/deliverables";
import { sendKitReadyEmail } from "@/lib/sponza/email";
import {
  getKitResponseById,
  logKitFailure,
  unlockKitByEmail,
  updateKitPackStatus,
} from "@/lib/sponza/service";
import { normalizeEmail } from "@/lib/sponza/utils";

export const runtime = "nodejs";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  let kitId: number | null = null;
  let email: string | null = null;

  try {
    await ensureDatabase();

    const body = (await req.json()) as { kit_id?: number; email?: string };
    kitId = Number(body?.kit_id);
    email = normalizeEmail(body?.email);

    if (!Number.isInteger(kitId) || kitId <= 0) {
      return NextResponse.json({ error: "A valid kit_id is required" }, { status: 400 });
    }

    if (!email || !EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }

    const result = await unlockKitByEmail({ kitId, email });

    if (result.status === "not_found" || !result.kit) {
      return NextResponse.json({ error: "Kit not found" }, { status: 404 });
    }

    if (result.status === "email_mismatch") {
      return NextResponse.json(
        { error: "Email not found — make sure you use the same email you paid with" },
        { status: 404 }
      );
    }

    try {
      await buildSponsorshipPack(result.kit);
      await updateKitPackStatus({ kitId: result.kit.id, ready: true });
    } catch (packError) {
      await updateKitPackStatus({
        kitId: result.kit.id,
        ready: false,
        error: packError instanceof Error ? packError.message : String(packError),
      });
      await logKitFailure("unlock-kit-pack", {
        error: packError,
        email,
        details: {
          kit_id: result.kit.id,
        },
      });
    }

    if (result.status === "unlocked" && result.kit.email) {
      try {
        const resultsUrl = new URL(`/results/${result.kit.id}`, req.nextUrl.origin).toString();
        await sendKitReadyEmail({
          email: result.kit.email,
          resultsUrl,
          downloadLabel: "download your sponsorship pack",
        });
      } catch (emailError) {
        await logKitFailure("unlock-kit-email", {
          error: emailError,
          email: result.kit.email,
          details: {
            kit_id: result.kit.id,
          },
        });
      }
    }

    const response = await getKitResponseById(result.kit.id);

    if (!response) {
      return NextResponse.json({ error: "Kit not found" }, { status: 404 });
    }

    return NextResponse.json(response);
  } catch (error) {
    await logKitFailure("unlock-kit", {
      error,
      email: email || undefined,
      details: {
        kit_id: kitId,
      },
    });

    return NextResponse.json({ error: "Failed to unlock kit" }, { status: 500 });
  }
}
