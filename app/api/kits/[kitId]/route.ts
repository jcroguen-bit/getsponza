import { NextResponse } from "next/server";

import { ensureDatabase } from "@/lib/db";
import { getKitResponseById, logKitFailure } from "@/lib/sponza/service";

export const runtime = "nodejs";

export async function GET(_req: Request, context: { params: Promise<{ kitId: string }> }) {
  let kitId: number | null = null;

  try {
    await ensureDatabase();

    const params = await context.params;
    kitId = Number(params.kitId);

    if (!Number.isInteger(kitId) || kitId <= 0) {
      return NextResponse.json({ error: "A valid kit_id is required" }, { status: 400 });
    }

    const kit = await getKitResponseById(kitId);

    if (!kit) {
      return NextResponse.json({ error: "Kit not found" }, { status: 404 });
    }

    return NextResponse.json(kit);
  } catch (error) {
    await logKitFailure("api-kit-by-id", {
      error,
      details: {
        kit_id: kitId,
      },
    });

    return NextResponse.json({ error: "Failed to load kit" }, { status: 500 });
  }
}
