import { NextResponse } from "next/server";
import { isAdminAuthorized } from "@/app/actions/admin-auth";
import { getStripeClient } from "@/lib/stripe-order-sync";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const paymentIntentId = searchParams.get("paymentIntentId");

  if (!paymentIntentId) {
    return NextResponse.json({ error: "Missing paymentIntentId" }, { status: 400 });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge"],
    });
    return NextResponse.json(paymentIntent);
  } catch (error: any) {
    console.error("Stripe Retrieve Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
