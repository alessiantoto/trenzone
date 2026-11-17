import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isAdminAuthorized } from "@/app/actions/admin-auth";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe-order-sync";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCanonicalOrderNumber } from "@/utils/admin-helpers";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";
import { resolveItemImage } from "@/lib/product-images";

export const dynamic = "force-dynamic";

function maskEmail(rawEmail?: string | null): string | null {
  const clean = String(rawEmail || "").trim();
  const atIdx = clean.indexOf("@");
  if (atIdx <= 0 || clean.includes("lipsa-email@")) return null;
  const local = clean.slice(0, atIdx);
  const domain = clean.slice(atIdx + 1);
  const visibleLocal = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);
  return `${visibleLocal}***@${domain}`;
}

function resolveLocalizedString(val: unknown, locale: "ro" | "en", fallback = ""): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "string") return val.trim() || fallback;
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    const picked =
      locale === "en"
        ? obj.en ?? obj.ro ?? Object.values(obj)[0]
        : obj.ro ?? obj.en ?? Object.values(obj)[0];
    if (typeof picked === "string") return picked.trim() || fallback;
    if (picked !== null && picked !== undefined) return String(picked).trim() || fallback;
  }
  return String(val).trim() || fallback;
}

async function findOrderByIdentifier(cleanId: string) {
  // 1. Primary lookup: payment_intent_id (used by both COD TZ-XXXX-DDMMYY and Stripe pi_...)
  const { data: byPi, error: piErr } = await supabaseAdmin
    .from("orders")
    .select(
      "id, payment_intent_id, status, payment_method, currency, subtotal, discount_total, shipping_amount, total_amount, priority_processing, gift_packaging, shipping_type, carrier_id, branch_name, carrier_metadata, customer_firstname, customer_lastname, customer_email, addr_city, addr_county, addr_country, items, receipt_url, email_sent_at, created_at"
    )
    .eq("payment_intent_id", cleanId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (piErr) {
    throw piErr;
  }
  if (byPi) return byPi;

  // 2. Fallback: carrier_metadata.order_number
  const { data: byMeta } = await supabaseAdmin
    .from("orders")
    .select(
      "id, payment_intent_id, status, payment_method, currency, subtotal, discount_total, shipping_amount, total_amount, priority_processing, gift_packaging, shipping_type, carrier_id, branch_name, carrier_metadata, customer_firstname, customer_lastname, customer_email, addr_city, addr_county, addr_country, items, receipt_url, email_sent_at, created_at"
    )
    .eq("carrier_metadata->>order_number", cleanId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (byMeta) return byMeta;

  // 3. Fallback: UUID primary key
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId)) {
    const { data: byUuid } = await supabaseAdmin
      .from("orders")
      .select(
        "id, payment_intent_id, status, payment_method, currency, subtotal, discount_total, shipping_amount, total_amount, priority_processing, gift_packaging, shipping_type, carrier_id, branch_name, carrier_metadata, customer_firstname, customer_lastname, customer_email, addr_city, addr_county, addr_country, items, receipt_url, email_sent_at, created_at"
      )
      .eq("id", cleanId)
      .limit(1)
      .maybeSingle();

    if (byUuid) return byUuid;
  }

  return null;
}

export async function GET(req: Request) {
  const noStoreHeaders = { "Cache-Control": "private, no-store, max-age=0" };

  try {
    const ip = getClientIp(req);
    const { allowed, retryAfter, headers: rlHeaders } = await checkRateLimit(
      null,
      ip,
      "checkout-final-sync"
    );
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests", retryAfter },
        { status: 429, headers: { ...noStoreHeaders, ...(rlHeaders || {}) } }
      );
    }

    const { searchParams } = new URL(req.url);
    const rawId = String(
      searchParams.get("order_id") ||
        searchParams.get("orderId") ||
        searchParams.get("paymentIntentId") ||
        ""
    ).trim();

    if (!rawId || !/^[a-zA-Z0-9_-]{3,140}$/.test(rawId)) {
      return NextResponse.json(
        { error: "Invalid or missing order identifier" },
        { status: 400, headers: noStoreHeaders }
      );
    }

    const order = await findOrderByIdentifier(rawId);
    const isAdmin = await isAdminAuthorized().catch(() => false);
    const cookieStore = await cookies();
    const lastCodOrderCookie = cookieStore.get("tz_last_cod_order")?.value?.trim() || "";
    const isStripePaymentIntentLookup = /^pi_[a-zA-Z0-9_]{8,120}$/.test(rawId);

    if (!order) {
      // Optional Admin-only Stripe fallback if querying a raw PaymentIntent not yet in DB
      if (isAdmin && isStripePaymentIntentLookup && isStripeConfigured()) {
        const stripe = getStripeClient();
        const paymentIntent = await stripe.paymentIntents.retrieve(rawId, {
          expand: ["latest_charge"],
        });
        return NextResponse.json(paymentIntent, { headers: noStoreHeaders });
      }

      return NextResponse.json(
        { error: "Order not found" },
        { status: 404, headers: noStoreHeaders }
      );
    }

    // Prevent sequential order enumeration (TZ-XXXX-DDMMYY) by outsiders:
    // Non-admins may only view Stripe `pi_...` intents (non-enumerable) or the COD order just placed in their own session cookie.
    const canonicalNum = getCanonicalOrderNumber(order);
    const matchesSessionCodCookie =
      Boolean(lastCodOrderCookie) &&
      (lastCodOrderCookie === order.payment_intent_id ||
        lastCodOrderCookie === canonicalNum ||
        lastCodOrderCookie === order.id);
    if (!isAdmin && !isStripePaymentIntentLookup && !matchesSessionCodCookie) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404, headers: noStoreHeaders }
      );
    }

    const carrierMeta = (order.carrier_metadata || {}) as Record<string, any>;
    const orderLocale: "ro" | "en" = carrierMeta.locale === "en" ? "en" : "ro";
    const reqLocale = searchParams.get("locale");
    const displayLocale: "ro" | "en" =
      reqLocale === "en" ? "en" : reqLocale === "ro" ? "ro" : orderLocale;

    const rawItems = Array.isArray(order.items) ? order.items : [];
    const sanitizedItems = rawItems.map((item: any) => {
      const name = resolveLocalizedString(
        item?.name,
        displayLocale,
        displayLocale === "en" ? "Product" : "Produs"
      );
      const variant = resolveLocalizedString(
        item?.selectedVariant?.name ?? item?.variant,
        displayLocale
      );
      const image = resolveItemImage({
        ...item,
        name,
        variant,
      });

      return {
        id: String(item?.id || item?.slug || ""),
        slug: item?.slug ? String(item.slug) : undefined,
        name,
        variant: variant || null,
        quantity: Math.max(1, Math.floor(Number(item?.quantity) || 1)),
        price: Number(item?.price) || 0,
        image,
      };
    });

    const shippingType: "hd" | "pudo" = order.shipping_type === "pudo" ? "pudo" : "hd";
    const shippingAmount = Number(
      order.shipping_amount ?? carrierMeta.shipping_cost ?? 0
    );

    const rawFirstName = String(order.customer_firstname || "").trim();
    const safeFirstName =
      rawFirstName && !rawFirstName.includes("[LIPSĂ") && !rawFirstName.includes("[NUME")
        ? rawFirstName
        : "";

    const safeCustomer = {
      firstName: safeFirstName,
      emailMasked: maskEmail(order.customer_email),
      city: String(order.addr_city || "").trim(),
      county: String(order.addr_county || "").trim(),
      country: String(order.addr_country || "RO").trim().toUpperCase(),
      ...(isAdmin
        ? {
            lastName: String(order.customer_lastname || "").trim(),
            email: String(order.customer_email || "").trim(),
          }
        : {}),
    };

    return NextResponse.json(
      {
        orderNumber: getCanonicalOrderNumber(order),
        paymentIntentId: order.payment_intent_id,
        status: order.status || "processing",
        paymentMethod: order.payment_method || "cod",
        currency: String(order.currency || "RON").trim().toUpperCase(),
        subtotal: Number(order.subtotal || 0),
        discount: Number(order.discount_total || 0),
        cardDiscount: Number(carrierMeta.card_discount || 0),
        shipping: Number.isFinite(shippingAmount) ? shippingAmount : 0,
        total: Number(order.total_amount || 0),
        priorityProcessing: Boolean(order.priority_processing),
        giftPackaging: Boolean(order.gift_packaging),
        shippingType,
        carrierId: order.carrier_id ? String(order.carrier_id) : null,
        branchName: shippingType === "pudo" && order.branch_name ? String(order.branch_name) : null,
        locale: orderLocale,
        createdAt: order.created_at,
        emailSent: Boolean(order.email_sent_at),
        items: sanitizedItems,
        customer: safeCustomer,
      },
      { headers: noStoreHeaders }
    );
  } catch (error: any) {
    console.error("❌ [CHECKOUT DETAILS] Error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Failed to retrieve order details" },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
