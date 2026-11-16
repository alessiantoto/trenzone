import { NextResponse } from "next/server";
import Stripe from "stripe";
import { ensureStripeOrderInDb, getStripeClient } from "@/lib/stripe-order-sync";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const stripe = getStripeClient();
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    if (!signature || !webhookSecret) {
      console.error("❌ [WEBHOOK] Missing stripe-signature header or STRIPE_WEBHOOK_SECRET.");
      return NextResponse.json(
        { error: "Webhook configuration or signature missing" },
        { status: 400 }
      );
    }

    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`⚠️ [WEBHOOK] Signature verification failed: ${err?.message || "invalid signature"}`);
    return NextResponse.json({ error: "Webhook Signature Error" }, { status: 400 });
  }

  console.log(`📩 [WEBHOOK] Verified event received: ${event.type}`);

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    console.log(`💰 [WEBHOOK] Payment succeeded for PI: ${paymentIntent.id}`);

    try {
      const syncResult = await ensureStripeOrderInDb(paymentIntent);
      console.log(`✅ [WEBHOOK] Sync finished for ${paymentIntent.id}: ${syncResult.outcome} (${syncResult.orderId})`);
      return NextResponse.json({
        received: true,
        outcome: syncResult.outcome,
        orderId: syncResult.orderId,
      });
    } catch (syncError: any) {
      // CRITICAL: Return HTTP 500 so Stripe retries automatically for up to ~48h
      console.error(
        `❌ [WEBHOOK] DB persistence failed for ${paymentIntent.id} — triggering Stripe retry:`,
        syncError instanceof Error ? syncError.message : syncError
      );
      return NextResponse.json(
        { error: "Order persistence failed — retry required" },
        { status: 500 }
      );
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const failedIntent = event.data.object as Stripe.PaymentIntent;
    const reason = failedIntent.last_payment_error?.message || "Payment attempt failed";
    console.warn(`⚠️ [WEBHOOK] Payment failed for PI ${failedIntent.id}: ${reason}`);
    return NextResponse.json({ received: true, handled: "payment_failed" });
  }

  return NextResponse.json({ received: true, ignored: event.type });
}
