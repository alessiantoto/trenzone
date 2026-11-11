import { NextResponse } from "next/server";
import Stripe from "stripe";
import { isAdminAuthorized } from "@/app/actions/admin-auth";

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key', {
  apiVersion: "2024-12-18.acacia" as any,
});

export async function GET(req: Request) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const paymentIntentId = searchParams.get("paymentIntentId");

  if (!paymentIntentId) {
    return NextResponse.json({ error: "Missing paymentIntentId" }, { status: 400 });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return NextResponse.json(paymentIntent);
  } catch (error: any) {
    console.error("Stripe Retrieve Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
