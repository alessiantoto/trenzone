import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { calculateOrderTotal, CartItem } from "@/lib/cart-calculations";
import { rateLimiters, getClientIp, checkRateLimit } from "@/lib/ratelimit";
import { verifyCsrfToken } from "@/lib/csrf";
import { validateCoupon } from "@/app/actions/coupons";
import { getProducts } from "@/lib/api";
import { getServerExchangeRates } from "@/utils/pricing";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_dummy_key", {
  apiVersion: "2025-02-24.acacia",
});

export async function POST(req: Request) {
  try {
    // 1. Check rate limit
    const ip = getClientIp(req);
    const { allowed, retryAfter, headers: rlHeaders } = await checkRateLimit(
      rateLimiters.checkout,
      ip
    );

    if (!allowed) {
      console.warn(`⚠️ [CHECKOUT] Rate limit exceeded for IP: ${ip}`);
      return NextResponse.json(
        {
          error: 'Too many checkout attempts. Please try again later.',
          retryAfter,
        },
        {
          status: 429,
          headers: rlHeaders,
        }
      );
    }

    // 2. Verify CSRF token
    const csrfToken = req.headers.get('x-csrf-token');
    const isCsrfValid = await verifyCsrfToken(csrfToken || '');

    if (!isCsrfValid) {
      console.warn(`⚠️ [CSRF] Token verification failed for IP: ${ip}`);
      return NextResponse.json(
        { error: 'CSRF token validation failed' },
        { status: 403 }
      );
    }

    // 3. Parse and validate request
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON format." }, { status: 400 });
    }
    const { items, currency = "EUR", couponCode, country, shippingType, priority_processing, gift_packaging, payment_method } = body;

    const SUPPORTED_CURRENCIES = ["RON", "EUR", "USD", "GBP", "PLN", "CHF"];
    const safeCurrency = typeof currency === 'string' ? currency.toUpperCase() : 'EUR';
    if (!SUPPORTED_CURRENCIES.includes(safeCurrency)) {
      return NextResponse.json({ error: "Unsupported currency" }, { status: 400 });
    }

    await getServerExchangeRates();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Missing or invalid items" }, { status: 400 });
    }

    // Strict business rule: No mixed orders (preorder + in-stock)
    const hasServerPreorder = items.some((item: any) => {
      const vName = typeof item.selectedVariant?.name === 'object' ? item.selectedVariant?.name?.ro : item.selectedVariant?.name;
      const vLower = String(vName || '').toLowerCase();
      return (
        item.stock_status === 'preorder' ||
        item.is_preorder === true ||
        item.selectedVariant?.stock_status === 'preorder' ||
        vLower.includes('precomand') ||
        vLower.includes('pre-order') ||
        vLower.includes('preorder')
      );
    });
    const hasServerInStock = items.some((item: any) => {
      const vName = typeof item.selectedVariant?.name === 'object' ? item.selectedVariant?.name?.ro : item.selectedVariant?.name;
      const vLower = String(vName || '').toLowerCase();
      const isPre = (
        item.stock_status === 'preorder' ||
        item.is_preorder === true ||
        item.selectedVariant?.stock_status === 'preorder' ||
        vLower.includes('precomand') ||
        vLower.includes('pre-order') ||
        vLower.includes('preorder')
      );
      return !isPre;
    });

    if (hasServerPreorder && hasServerInStock) {
      return NextResponse.json(
        { error: "Comenzile mixte (produse din stoc + precomandă) nu sunt permise. Te rugăm să plasezi comenzi separate." },
        { status: 400 }
      );
    }

    // 1. Fetch actual prices from the database (trusted source)
    // Handle bundle IDs: format is `<real-uuid>-bundle-<qty>` — strip suffix
    const BUNDLE_REGEX = /^(.+)-bundle-(\d+)$/;
    const processedItems = items.map((item: any) => {
      const match = item.id?.match(BUNDLE_REGEX);
      if (match) {
        return { ...item, _realId: match[1], _bundleQty: parseInt(match[2]), _isBundle: true };
      }
      return { ...item, _realId: item.id, _isBundle: false };
    });

    const productIds = Array.from(new Set(processedItems.map((item: any) => item._realId)));
    
    // Split IDs into valid UUIDs and potential slugs
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const uuids = productIds.filter(id => UUID_REGEX.test(id as string));
    const slugs = productIds.filter(id => !UUID_REGEX.test(id as string));

    let dbProducts: any[] = [];

    if (uuids.length > 0) {
      const { data, error } = await supabaseAdmin.from("products").select("id, price_numeric, weight, slug").in("id", uuids);
      if (error) console.error("[CHECKOUT] Supabase UUID query error:", error);
      if (data) dbProducts = [...dbProducts, ...data.map(d => ({...d, price: d.price_numeric}))];
    }
    if (slugs.length > 0) {
      const { data, error } = await supabaseAdmin.from("products").select("id, price_numeric, weight, slug").in("slug", slugs as string[]);
      if (error) console.error("[CHECKOUT] Supabase Slug query error:", error);
      if (data) dbProducts = [...dbProducts, ...data.map(d => ({...d, price: d.price_numeric}))];
    }

    // Fallback to local MOCK products if not found in DB
    const allLocalProducts = await getProducts();
    const localProducts = allLocalProducts.filter(p => productIds.includes(p.id) || productIds.includes(p.slug));
    
    // Merge local products into dbProducts if not already there
    localProducts.forEach(lp => {
      if (!dbProducts.some(dbp => dbp.id === lp.id || dbp.slug === lp.slug)) {
        dbProducts.push({
          id: lp.id,
          price: typeof lp.price === 'object' ? (lp.price as any)['ro'] || Object.values(lp.price)[0] : lp.price,
          weight: lp.weight,
          slug: lp.slug
        });
      }
    });

    if (dbProducts.length === 0) {
      console.warn(`[CHECKOUT] Invalid products. Requested: ${productIds.join(', ')}`);
      return NextResponse.json({ error: `Invalid products (stale cart data). Please clear your cart.` }, { status: 400 });
    }

    // 2. Map and Validate Items
    const calculationItems: CartItem[] = processedItems.map((item: any) => {
      const dbProduct = dbProducts.find(p => p.id === item._realId || p.slug === item._realId);
      if (!dbProduct) {
        console.warn(`[CHECKOUT] Product not found in DB: ${item._realId}`);
        throw new Error(`Product not found: ${item._realId}. Please clear your cart.`);
      }
      
      let price = Number(dbProduct.price);
      
      // Compute bundle discount strictly on the server (never trust arbitrary client item.price)
      if (item._isBundle && item._bundleQty > 1) {
        const qty = Math.min(Math.max(1, Number(item._bundleQty) || 1), 10);
        const bundleDiscountRon = Math.max(0, (Math.min(qty, 4) - 1) * 15);
        price = Math.max(price, (price * qty) - bundleDiscountRon);
      }
      
      return {
        id: item.id || dbProduct.id,
        quantity: Math.max(1, Number(item.quantity) || 1),
        weight: Number(dbProduct.weight) || 0.2,
        price
      };
    });


    // 3. Handle Coupon Validation
    const preResult = calculateOrderTotal(calculationItems, safeCurrency);
    const ZERO_DECIMAL_CURRENCIES = ['JPY', 'KRW', 'BIF', 'CLP', 'PYG', 'VND', 'XAF', 'XOF', 'XPF'];
    const multiplier = ZERO_DECIMAL_CURRENCIES.includes(safeCurrency) ? 1 : 100;
    const subtotalMajor = preResult.subtotal / multiplier;

    let couponData = null;
    if (couponCode) {
      try {
        const couponResult = await validateCoupon(couponCode, subtotalMajor, safeCurrency);
        if (couponResult?.isValid && couponResult?.coupon) {
          couponData = couponResult.coupon;
        }
      } catch (e) {
        console.warn("Coupon validation warning:", e);
      }
    }

    // 4. Calculate Secure Total (Products + Discounts + Initial Shipping Estimate)
    const paymentMethod = payment_method || 'online'; // Any payment through Stripe is online
    const options = { priority_processing, gift_packaging, payment_method: paymentMethod };
    const result = calculateOrderTotal(calculationItems, safeCurrency, country || 'RO', shippingType || 'hd', couponData, undefined, options);

    // 5. Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('dummy')) {
      return NextResponse.json({
        stripeDisabled: true,
        calculatedAmount: result.total / multiplier,
      });
    }

    const serializedOrderItems = JSON.stringify(processedItems.map((i: any, idx: number) => {
      let vName = i.selectedVariant?.name;
      if (typeof vName === 'object') vName = vName.ro || Object.values(vName)[0];
      const calcItem = calculationItems[idx] || calculationItems.find(c => c.id === (i.id || i._realId));
      const securePrice = calcItem ? calcItem.price : i.price;
      return { i: i.id || i.slug, q: i.quantity, v: vName || "", p: securePrice, n: i.name || "Produs" };
    }));

    // 6. Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: result.total,
      currency: safeCurrency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: {
        coupon_id: couponData?.id || '',
        coupon: String(couponCode || "none").substring(0, 500),
        subtotal: (result.subtotal / multiplier).toFixed(2),
        bundleDiscount: (result.bundleDiscount / multiplier).toFixed(2),
        couponDiscount: (result.couponDiscount / multiplier).toFixed(2),
        cardDiscount: (result.cardDiscount / multiplier).toFixed(2),
        shippingCost: (result.shippingCost / multiplier).toFixed(2),
        discount_total: ((result.bundleDiscount + result.couponDiscount + result.cardDiscount) / multiplier).toFixed(2),
        final_total: (result.total / multiplier).toFixed(2),
        currency: result.currency,
        order_items: serializedOrderItems.substring(0, 500),
        ...(serializedOrderItems.length > 500 ? { order_items_2: serializedOrderItems.substring(500, 1000) } : {}),
        ...(serializedOrderItems.length > 1000 ? { order_items_3: serializedOrderItems.substring(1000, 1500) } : {}),
        ...(serializedOrderItems.length > 1500 ? { order_items_4: serializedOrderItems.substring(1500, 2000) } : {}),
        shipping_type: shippingType || 'hd',
        country: country || 'RO'
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      calculatedAmount: result.total / multiplier,
    });
  } catch (error) {
    console.error("❌ Stripe Checkout error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}
