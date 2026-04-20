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
      return NextResponse.json({ error: "Paid kit not found" }, { status: 404 });
    }

    const pack = await buildSponsorshipPack(record);
    await updateKitPackStatus({ kitId: record.id, ready: true });

    return new NextResponse(new Uint8Array(pack.mediaKitPdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${pack.fileStem}-media-kit.pdf"`,
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

    await logKitFailure("generate-pdf", {
      error,
      details: {
        kit_id: kitId,
      },
    });

    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
