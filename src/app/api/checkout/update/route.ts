import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { validateCoupon } from "@/app/actions/coupons";
import { getShippingCost } from "@/lib/shipping-config";
import { rateLimiters, getClientIp, checkRateLimit } from "@/lib/ratelimit";
import { verifyCsrfToken } from "@/lib/csrf";
import { calculateOrderTotal, CartItem } from "@/lib/cart-calculations";
import { getServerExchangeRates } from "@/utils/pricing";

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_dummy_key", {
  apiVersion: '2025-02-24.acacia',
});

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    
    // 1. Parse request body
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { isFinalSync } = body;

    // 📝 DIAGNOSTIC LOG: Entrance (Post body-parse)
    console.log(`🚀 [UPDATE API] Received update request for PI: ${body?.paymentIntentId || 'unknown'}`);

    // 2. Check rate limit on all update requests
    const { allowed, retryAfter, headers: rlHeaders } = await checkRateLimit(
      rateLimiters.checkoutUpdate,
      ip
    );

    if (!allowed) {
      console.warn(`⚠️ [CHECKOUT-UPDATE] Rate limit exceeded for IP: ${ip}`);
      return NextResponse.json(
        { error: 'Too many update requests. Please try again later.', retryAfter },
        { status: 429, headers: rlHeaders }
      );
    }

    // 3. Verify CSRF token
    const csrfToken = req.headers.get('x-csrf-token');
    const isCsrfValid = await verifyCsrfToken(csrfToken || '');

    if (!isCsrfValid) {
      console.warn(`⚠️ [CSRF] Token verification failed for IP: ${ip}`);
      return NextResponse.json(
        { error: 'CSRF token validation failed' },
        { status: 403 }
      );
    }

    const {
      paymentIntentId,
      items,
      couponCode,
      shipping_type,
      carrier_id,
      branch_id,
      branch_name,
      email,
      firstName,
      lastName,
      country,
      currency = 'RON',
      phone,
      line1,
      line2,
      city,
      state,
      postal_code,
      locale = 'ro',
      priority_processing,
      gift_packaging,
      gift_message,
      payment_method
    } = body;

    const SUPPORTED_CURRENCIES = ["RON", "EUR", "USD", "GBP", "PLN", "CHF"];
    const safeCurrency = typeof currency === 'string' ? currency.toUpperCase() : 'RON';
    if (!SUPPORTED_CURRENCIES.includes(safeCurrency)) {
      return NextResponse.json({ error: "Unsupported currency." }, { status: 400 });
    }

    if (!paymentIntentId) {
      return NextResponse.json({ error: "Missing Stripe Payment Intent." }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
    }

    // Extraction unique IDs — handle bundle IDs: format `<real-uuid>-bundle-<qty>`
    const BUNDLE_REGEX = /^(.+)-bundle-(\d+)$/;
    const processedItems = items.map((item: any) => {
      const match = item.id?.match(BUNDLE_REGEX);
      if (match) {
        return { ...item, _realId: match[1], _bundleQty: parseInt(match[2]), _isBundle: true };
      }
      return { ...item, _realId: item.id, _isBundle: false };
    });

    // Ensure server-side exchange rates cache is warm
    await getServerExchangeRates();

    const itemIds = Array.from(new Set(processedItems.map((item: any) => item._realId)));
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const uuids = itemIds.filter(id => UUID_REGEX.test(String(id)));
    const slugs = itemIds.filter(id => !UUID_REGEX.test(String(id)));

    let dbProducts: any[] = [];
    if (uuids.length > 0) {
      const { data } = await supabaseAdmin.from("products").select("id, price_numeric, weight, slug").in("id", uuids);
      if (data) dbProducts = [...dbProducts, ...data];
    }
    if (slugs.length > 0) {
      const { data } = await supabaseAdmin.from("products").select("id, price_numeric, weight, slug").in("slug", slugs);
      if (data) dbProducts = [...dbProducts, ...data];
    }

    if (dbProducts.length === 0) {
      throw new Error("Produsele nu au putut fi validate in baza de date.");
    }

    // Map price_numeric -> price for calculation
    const dbProductsMapped = dbProducts.map((p: any) => ({ ...p, price: p.price_numeric }));

    const calculationItems: CartItem[] = processedItems.map((clientItem: any) => {
      const dbProduct = dbProductsMapped.find((p) => p.id === clientItem._realId || p.slug === clientItem._realId);
      if (!dbProduct) throw new Error(`Invalid product: ${clientItem._realId}`);

      let price = Number(dbProduct.price);
      // Compute bundle discount strictly on the server (never trust client item.price)
      if (clientItem._isBundle && clientItem._bundleQty > 1) {
        const qty = Math.min(Math.max(1, Number(clientItem._bundleQty) || 1), 10);
        const bundleDiscountRon = Math.max(0, (Math.min(qty, 4) - 1) * 15);
        price = Math.max(price, (price * qty) - bundleDiscountRon);
      }

      return {
        id: clientItem.id, // Preserve original cart ID
        quantity: Math.max(1, Number(clientItem.quantity) || 1),
        weight: Number(dbProduct.weight) || 0.2,
        price
      };
    });

    const ZERO_DECIMAL_CURRENCIES = ['JPY', 'KRW', 'BIF', 'CLP', 'PYG', 'VND', 'XAF', 'XOF', 'XPF'];
    const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.includes(safeCurrency);
    const multiplier = isZeroDecimal ? 1 : 100;

    const preResult = calculateOrderTotal(calculationItems, safeCurrency);
    const subtotalMajor = preResult.subtotal / multiplier;

    let couponResult = null;
    let couponData = null;
    if (couponCode) {
      try {
        couponResult = await validateCoupon(couponCode, subtotalMajor, safeCurrency);
        if (couponResult?.isValid && couponResult?.coupon) {
          couponData = couponResult.coupon;
        }
      } catch (couponErr) {
        console.warn("Coupon validation warning:", couponErr);
      }
    }

    const options = { priority_processing, gift_packaging, payment_method };
    const result = calculateOrderTotal(calculationItems, safeCurrency, country, shipping_type, couponData, carrier_id, options);

    const compactOrderItems = processedItems.map(i => {
      let vName = i.selectedVariant?.name;
      if (typeof vName === 'object') vName = vName.ro || Object.values(vName)[0];
      const calcItem = calculationItems.find(c => c.id === i.id);
      const price = calcItem ? calcItem.price : (i.price || 0);
      const name = (i.name || 'Produs').toString().replace(/\|/g, '-').replace(/\^\^/g, '--').substring(0, 150);
      const variant = (vName || '').toString().replace(/\|/g, '-').replace(/\^\^/g, '--').substring(0, 150);
      return `${i.id || i.slug}|${i.quantity}|${price}|${variant}|${name}`;
    }).join('^^');

    const updatePayload: any = {
      amount: result.total,
      currency: safeCurrency.toLowerCase(),
      description: `Order from ${firstName || 'Client'} ${lastName || ''}`.trim(),
      metadata: {
        coupon_id: couponData?.id || '',
        coupon: String(couponCode || "none").substring(0, 500),
        hasBundle: result.bundleDiscount > 0 ? "yes" : "no",
        shipping_type: String(shipping_type || "none").substring(0, 500),
        carrier_id: String(carrier_id || "none").substring(0, 500),
        branch_id: String(branch_id || "none").substring(0, 500),
        branch_name: String(branch_name || "none").substring(0, 500),
        phone: (phone && phone !== 'none') ? String(phone).substring(0, 50) : "",
        currency: safeCurrency.substring(0, 10),
        subtotal: (result.subtotal / multiplier).toFixed(2),
        bundleDiscount: (result.bundleDiscount / multiplier).toFixed(2),
        couponDiscount: (result.couponDiscount / multiplier).toFixed(2),
        cardDiscount: (result.cardDiscount / multiplier).toFixed(2),
        shippingCost: (result.shippingCost / multiplier).toFixed(2),
        final_total: (result.total / multiplier).toFixed(2),
        // Ultracompact format split across up to 4 metadata keys (2000 chars total) so items are never truncated
        order_items: compactOrderItems.substring(0, 500),
        ...(compactOrderItems.length > 500 ? { order_items_2: compactOrderItems.substring(500, 1000) } : { order_items_2: "" }),
        ...(compactOrderItems.length > 1000 ? { order_items_3: compactOrderItems.substring(1000, 1500) } : { order_items_3: "" }),
        ...(compactOrderItems.length > 1500 ? { order_items_4: compactOrderItems.substring(1500, 2000) } : { order_items_4: "" }),
        addr_line1: String(line1 || "").substring(0, 500),
        addr_line2: String(line2 || "").substring(0, 500),
        addr_city: String(city || "").substring(0, 500),
        addr_county: String(state || "").substring(0, 500),
        addr_state: String(state || "").substring(0, 500),
        addr_postal_code: String(postal_code || "").substring(0, 100),
        addr_country: String(country || "").substring(0, 100),
        customer_name: `${firstName} ${lastName}`.trim().substring(0, 500),
        locale: String(locale || 'ro').substring(0, 10),
        firstName: String(firstName || "").substring(0, 100),
        lastName: String(lastName || "").substring(0, 100),
        email: String(email || "").substring(0, 255),
        priority_processing: priority_processing ? "yes" : "no",
        gift_packaging: gift_packaging ? "yes" : "no",
        gift_message: String(gift_message || "").substring(0, 500)
      }
    };

    if (email && email.trim() !== "") {
      updatePayload.receipt_email = email.trim();
    }

    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('dummy')) {
      return NextResponse.json({ success: true, stripeDisabled: true });
    }

    const existingPi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (!['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(existingPi.status)) {
      return NextResponse.json({ success: true, status: existingPi.status });
    }

    await stripe.paymentIntents.update(paymentIntentId, updatePayload);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Stripe update error:", error);
    const errorDetails = error instanceof Error ? error.message : JSON.stringify(error);
    return NextResponse.json({ error: `Backend Error: ${errorDetails}` }, { status: 500 });
  }
}