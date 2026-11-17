import { NextResponse } from "next/server";
import { isAdminAuthorized } from "@/app/actions/admin-auth";
import { getStripeClient } from "@/lib/stripe-order-sync";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const noStoreHeaders = { 'Cache-Control': 'private, no-store, max-age=0' };

  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStoreHeaders });
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 500, headers: noStoreHeaders });
  }

  const { searchParams } = new URL(req.url);
  const paymentIntentId = String(searchParams.get("paymentIntentId") || "").trim();

  if (!paymentIntentId || !/^pi_[a-zA-Z0-9_]{8,120}$/.test(paymentIntentId)) {
    return NextResponse.json({ error: "Invalid or missing paymentIntentId" }, { status: 400, headers: noStoreHeaders });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge"],
    });
    return NextResponse.json(paymentIntent, { headers: noStoreHeaders });
  } catch (error: any) {
    console.error("Stripe Retrieve Error:", error);
    return NextResponse.json({ error: "Failed to retrieve payment details" }, { status: 500, headers: noStoreHeaders });
  }
}
