import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

import { ensureDatabase } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { sendKitReadyEmail } from "@/lib/sponza/email";
import {
  logKitFailure,
  recordStripeCheckoutCompletion,
  updateKitPackStatus,
} from "@/lib/sponza/service";

export const runtime = "nodejs";

function getStripePaymentId(session: Stripe.Checkout.Session) {
  if (!session.payment_intent) {
    return null;
  }

  return typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent.id;
}

export async function POST(req: NextRequest) {
  let event: Stripe.Event | null = null;

  try {
    await ensureDatabase();

    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
    }

    const payload = await req.text();
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const kitId = Number(session.metadata?.kit_id || session.client_reference_id);

      if (!Number.isInteger(kitId) || kitId <= 0) {
        return NextResponse.json({ error: "Missing kit_id metadata" }, { status: 400 });
      }

      const paidKit = await recordStripeCheckoutCompletion({
        kitId,
        email: session.customer_details?.email || session.customer_email || null,
        amountCents: session.amount_total,
        currency: session.currency || "usd",
        stripeSessionId: session.id,
        stripePaymentId: getStripePaymentId(session),
      });

      if (!paidKit) {
        return NextResponse.json({ error: "Kit not found" }, { status: 404 });
      }

      const resultsUrl = new URL(`/results/${paidKit.id}?paid=true`, req.nextUrl.origin).toString();

      try {
        const generatePdfResponse = await fetch(new URL("/api/generate-pdf", req.nextUrl.origin), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ kit_id: paidKit.id }),
        });

        if (!generatePdfResponse.ok) {
          throw new Error(`generate-pdf returned ${generatePdfResponse.status}`);
        }

        await updateKitPackStatus({ kitId: paidKit.id, ready: true });
      } catch (packError) {
        await updateKitPackStatus({
          kitId: paidKit.id,
          ready: false,
          error: packError instanceof Error ? packError.message : String(packError),
        });
        await logKitFailure("stripe-webhook-pack", {
          error: packError,
          details: {
            kit_id: paidKit.id,
            stripe_event_id: event.id,
          },
        });
      }

      if (paidKit.email) {
        try {
          await sendKitReadyEmail({
            email: paidKit.email,
            resultsUrl,
            downloadLabel: "download your sponsorship pack",
          });
        } catch (emailError) {
          await logKitFailure("stripe-webhook-email", {
            error: emailError,
            email: paidKit.email,
            details: {
              kit_id: paidKit.id,
              stripe_event_id: event.id,
            },
          });
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    await logKitFailure("stripe-webhook", {
      error,
      details: {
        stripe_event_id: event?.id,
      },
    });

    return NextResponse.json({ error: "Webhook handling failed" }, { status: 400 });
  }
}
