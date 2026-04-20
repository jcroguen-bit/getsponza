import { NextRequest, NextResponse } from "next/server";

import { ensureDatabase } from "@/lib/db";
import { buildSponsorshipPack } from "@/lib/sponza/deliverables";
import {
  getPaidKitRecordById,
  logKitFailure,
  updateKitPackStatus,
} from "@/lib/sponza/service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let kitId: number | null = null;

  try {
    await ensureDatabase();
    const body = await req.json();
    kitId = Number(body?.kit_id);

    if (!Number.isInteger(kitId) || kitId <= 0) {
      return NextResponse.json({ error: "A valid kit_id is required" }, { status: 400 });
    }

    const record = await getPaidKitRecordById(kitId);

    if (!record) {
      return NextResponse.json({ error: "Paid pack not found" }, { status: 404 });
    }

    const pack = await buildSponsorshipPack(record);
    await updateKitPackStatus({ kitId: record.id, ready: true });

    return new NextResponse(new Uint8Array(pack.zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${pack.fileStem}-sponsorship-pack.zip"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (kitId) {
      await updateKitPackStatus({
        kitId,
        ready: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    await logKitFailure("download-pack", {
      error,
      details: {
        kit_id: kitId,
      },
    });

    return NextResponse.json({ error: "Failed to generate sponsorship pack" }, { status: 500 });
  }
}
