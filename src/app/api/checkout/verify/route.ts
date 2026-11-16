import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  ensureStripeOrderInDb,
  getCurrencyMultiplier,
  getExpandedPaymentIntent,
  isStripeConfigured,
} from "@/lib/stripe-order-sync";
import { getCanonicalOrderNumber } from "@/utils/admin-helpers";
import { resolveOrderedPrograms } from "@/lib/programs";
import { createProgramDownloadToken, getProgramPdfBuffer } from "@/lib/program-pdf-generator";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawClientSecret = typeof body?.clientSecret === "string" ? body.clientSecret.trim() : "";
    const rawPiId = typeof body?.paymentIntentId === "string" ? body.paymentIntentId.trim() : "";

    const paymentIntentId = rawPiId || (rawClientSecret ? rawClientSecret.split("_secret_")[0] : "");

    if (!paymentIntentId || !paymentIntentId.startsWith("pi_")) {
      return NextResponse.json({ error: "Invalid payment intent identifier" }, { status: 400 });
    }

    if (!isStripeConfigured()) {
      return NextResponse.json({
        paymentIntent: {
          id: paymentIntentId,
          status: "succeeded",
          amount: 10000,
          currency: "ron",
        },
        stripeDisabled: true,
      });
    }

    const pi = await getExpandedPaymentIntent(paymentIntentId);
    if (!rawClientSecret || !pi.client_secret || rawClientSecret !== pi.client_secret) {
      return NextResponse.json({ error: "Invalid or missing payment session credential" }, { status: 403 });
    }
    const currency = (pi.currency || "ron").toUpperCase();
    const multiplier = getCurrencyMultiplier(currency);
    const charge = typeof pi.latest_charge === "object" ? pi.latest_charge : null;

    let orderId: string | undefined;
    let outcome: string | undefined;

    if (pi.status === "succeeded") {
      // Check DB first to see if webhook already inserted the order
      const { data: existingBeforeWait } = await supabaseAdmin
        .from("orders")
        .select("id, payment_intent_id, status, receipt_url, carrier_metadata")
        .eq("payment_intent_id", pi.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (existingBeforeWait && existingBeforeWait.status !== "failed") {
        // Still invoke idempotent backfill in case receipt_number arrived later
        const res = await ensureStripeOrderInDb(pi);
        orderId = res.orderId;
        outcome = res.outcome;
      } else {
        // Give webhook ~1.5s head start to complete cleanly before running synchronous fallback
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const { data: existingAfterWait } = await supabaseAdmin
          .from("orders")
          .select("id, payment_intent_id, status, receipt_url, carrier_metadata")
          .eq("payment_intent_id", pi.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (existingAfterWait && existingAfterWait.status !== "failed") {
          const res = await ensureStripeOrderInDb(pi);
          orderId = res.orderId;
          outcome = res.outcome;
        } else {
          console.log(`⚠️ [VERIFY FALLBACK] Webhook did not finalize ${pi.id} in time. Executing synchronous sync...`);
          const res = await ensureStripeOrderInDb(pi);
          orderId = res.orderId;
          outcome = res.outcome;
          console.log(`✅ [VERIFY FALLBACK] Synced ${pi.id} -> Order ${orderId} (${outcome})`);
        }

        if (!orderId && existingAfterWait) {
          orderId = getCanonicalOrderNumber(existingAfterWait);
        }
      }
    }

    let digitalDownloads: Array<{
      programKey: string;
      lang: "ro" | "en";
      title: string;
      downloadUrl: string;
    }> = [];

    if (pi.status === "succeeded") {
      try {
        const { data: orderRow } = await supabaseAdmin
          .from("orders")
          .select("id, items, carrier_metadata")
          .eq("payment_intent_id", pi.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        const orderItems = Array.isArray(orderRow?.items) ? orderRow.items : [];
        const fallbackLang = pi.metadata?.locale === "en" ? "en" : "ro";
        const orderedPrograms = resolveOrderedPrograms(orderItems, fallbackLang);
        const refId = String(orderId || orderRow?.id || pi.id);

        const readyDownloads = await Promise.all(
          orderedPrograms.map(async (prog) => {
            const pdf = await getProgramPdfBuffer(prog.programKey, prog.lang).catch(() => null);
            if (!pdf?.buffer) return null;
            const token = createProgramDownloadToken(refId, prog.programKey, prog.lang);
            const params = new URLSearchParams({
              program: prog.programKey,
              lang: prog.lang,
              order: refId,
              token,
            });
            return {
              programKey: prog.programKey,
              lang: prog.lang,
              title:
                prog.programKey === "food-plan"
                  ? `Vlad Tren — Food Plan (${prog.lang.toUpperCase()})`
                  : prog.programKey === "training-program"
                  ? `Vlad Tren — Training Program (${prog.lang.toUpperCase()})`
                  : prog.programKey === "bench-program"
                  ? `Vlad Tren — Bench Program (${prog.lang.toUpperCase()})`
                  : `Vlad Tren — ${prog.title}`,
              downloadUrl: `/api/programs/download?${params.toString()}`,
            };
          })
        );
        digitalDownloads = readyDownloads.filter(
          (entry): entry is NonNullable<typeof entry> => entry !== null
        );
      } catch (dlErr) {
        console.warn("[VERIFY] Could not build digital download links:", dlErr);
      }
    }

    return NextResponse.json({
      paymentIntent: {
        id: pi.id,
        status: pi.status,
        amount: (pi.amount_received || pi.amount || 0) / multiplier,
        currency,
        orderId: orderId || null,
        receiptNumber: charge?.receipt_number || null,
        outcome: outcome || null,
        digitalDownloads,
      },
    });
  } catch (error: any) {
    console.error("❌ [VERIFY] Payment verification/sync error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to verify payment" },
      { status: 500 }
    );
  }
}
