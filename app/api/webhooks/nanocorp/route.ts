import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event_type, payment } = body;

    if (event_type === "checkout.session.completed") {
      console.log("Payment received:", payment?.customer_email, payment?.amount_cents);
      // Future: trigger kit delivery, send confirmation email
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
