import { NextRequest, NextResponse } from "next/server";

import { ensureDatabase } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { getCheckoutKitById, logKitFailure, updateKitEmail } from "@/lib/sponza/service";
import { normalizeEmail } from "@/lib/sponza/utils";

export const runtime = "nodejs";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  let kitId: number | null = null;

  try {
    await ensureDatabase();

    const body = (await req.json()) as { kit_id?: number; email?: string };
    kitId = Number(body?.kit_id);
    const normalizedEmail = normalizeEmail(body?.email);

    if (!Number.isInteger(kitId) || kitId <= 0) {
      return NextResponse.json({ error: "A valid kit_id is required" }, { status: 400 });
    }

    const kit = await getCheckoutKitById(kitId);

    if (!kit) {
      return NextResponse.json({ error: "Kit not found" }, { status: 404 });
    }

    if (kit.paid_at) {
      return NextResponse.json({ error: "This kit is already paid" }, { status: 409 });
    }

    const checkoutEmail = normalizedEmail || kit.email;

    if (!checkoutEmail || !EMAIL_PATTERN.test(checkoutEmail)) {
      return NextResponse.json({ error: "A valid email is required for checkout" }, { status: 400 });
    }

    await updateKitEmail(kitId, checkoutEmail);

    const stripe = getStripe();
    const successUrl = new URL(`/results/${kit.id}?paid=true`, req.nextUrl.origin).toString();
    const cancelUrl = new URL(`/results/${kit.id}`, req.nextUrl.origin).toString();
    const productName =
      kit.purchase_type === "refresh"
        ? "GetSponza Kit Refresh"
        : "GetSponza Sponsorship Kit";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: checkoutEmail,
      client_reference_id: String(kit.id),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: kit.purchase_price_cents,
            product_data: {
              name: productName,
            },
          },
        },
      ],
      metadata: {
        kit_id: String(kit.id),
        purchase_type: kit.purchase_type,
      },
      payment_intent_data: {
        metadata: {
          kit_id: String(kit.id),
          purchase_type: kit.purchase_type,
        },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    if (!session.url) {
      throw new Error("Stripe checkout session did not return a URL");
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    await logKitFailure("create-checkout", {
      error,
      details: {
        kit_id: kitId,
      },
    });

    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
