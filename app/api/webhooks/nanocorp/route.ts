import { NextRequest, NextResponse } from "next/server";

import { ensureDatabase } from "@/lib/db";
import { logKitFailure, recordPaymentUnlock } from "@/lib/sponza/service";

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
      // Future: trigger PDF generation + delivery after unlock.
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
