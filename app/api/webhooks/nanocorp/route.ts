import { NextRequest, NextResponse } from "next/server";

import { ensureDatabase } from "@/lib/db";
import { buildSponsorshipPack } from "@/lib/sponza/deliverables";
import {
  getLatestPaidKitForEmail,
  logKitFailure,
  recordPaymentUnlock,
  updateKitPackStatus,
} from "@/lib/sponza/service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await ensureDatabase();
    const body = await req.json();
    const { event_type, payment } = body;

    if (event_type === "checkout.session.completed") {
      console.log("Payment received:", payment?.customer_email, payment?.amount_cents);
      await recordPaymentUnlock({
        email: payment?.customer_email,
        amount_cents: payment?.amount_cents,
        currency: payment?.currency,
        stripe_session_id: payment?.stripe_session_id,
      });

      const latestKit = await getLatestPaidKitForEmail(payment?.customer_email);

      if (latestKit) {
        try {
          await buildSponsorshipPack(latestKit);
          await updateKitPackStatus({ kitId: latestKit.id, ready: true });
        } catch (packError) {
          await updateKitPackStatus({
            kitId: latestKit.id,
            ready: false,
            error: packError instanceof Error ? packError.message : String(packError),
          });
          await logKitFailure("webhook-pack", {
            email: payment?.customer_email,
            error: packError,
            details: {
              kit_id: latestKit.id,
            },
          });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    await logKitFailure("webhook", {
      error,
      details: {
        source: "nanocorp",
      },
    });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
