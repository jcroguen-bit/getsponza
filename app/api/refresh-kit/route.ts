import { NextRequest, NextResponse } from "next/server";

import { ensureDatabase } from "@/lib/db";
import { createRefreshKit, logKitFailure } from "@/lib/sponza/service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let sourceKitId: number | null = null;

  try {
    await ensureDatabase();

    const body = (await req.json()) as { kit_id?: number };
    sourceKitId = Number(body?.kit_id);

    if (!Number.isInteger(sourceKitId) || sourceKitId <= 0) {
      return NextResponse.json({ error: "A valid kit_id is required" }, { status: 400 });
    }

    const refreshedKit = await createRefreshKit(sourceKitId);
    return NextResponse.json(refreshedKit);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create refresh kit";

    await logKitFailure("refresh-kit", {
      error,
      details: {
        source_kit_id: sourceKitId,
      },
    });

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
