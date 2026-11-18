import { NextResponse } from "next/server";
import { calculateOrderTotal } from "@/lib/cart-calculations";
import { rateLimiters, getClientIp, checkRateLimit } from "@/lib/ratelimit";
import { verifyCsrfToken } from "@/lib/csrf";
import { getServerExchangeRates, getProductPrice } from "@/utils/pricing";
import { getShippingConfig } from "@/app/actions/shipping";
import {
  buildServerCalculationItems,
  fetchServerProductsForItems,
  parseAndStripBundleIds,
  resolveServerCoupon,
  validateShippingSelection,
} from "@/lib/checkout-helpers";
import {
  backupCheckoutSessionForPI,
  encodeOrderItemsForStripeMetadata,
  getCurrencyMultiplier,
  getStripeClient,
  isStripeConfigured,
} from "@/lib/stripe-order-sync";
import { isDigitalOnlyCart, isDigitalProgramItem } from "@/lib/programs";

export const dynamic = "force-dynamic";

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
          error: "Too many checkout attempts. Please try again later.",
          retryAfter,
        },
        {
          status: 429,
          headers: rlHeaders,
        }
      );
    }

    // 2. Verify CSRF token
    const csrfToken = req.headers.get("x-csrf-token");
    const isCsrfValid = await verifyCsrfToken(csrfToken || "");

    if (!isCsrfValid) {
      console.warn(`⚠️ [CSRF] Token verification failed for IP: ${ip}`);
      return NextResponse.json(
        { error: "CSRF token validation failed" },
        { status: 403 }
      );
    }

    // 3. Parse and validate request
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON format." }, { status: 400 });
    }

    const {
      items,
      currency = "EUR",
      couponCode,
      country,
      shippingType,
      priority_processing,
      gift_packaging,
      payment_method,
      locale = "ro",
      email,
    } = body;
    const safeLocale: "ro" | "en" = locale === "en" ? "en" : "ro";

    const SUPPORTED_CURRENCIES = ["RON", "EUR", "USD", "GBP"];
    const safeCurrency = typeof currency === "string" ? currency.toUpperCase() : "EUR";
    if (!SUPPORTED_CURRENCIES.includes(safeCurrency)) {
      return NextResponse.json({ error: "Unsupported currency" }, { status: 400 });
    }

    await getServerExchangeRates();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Missing or invalid items" }, { status: 400 });
    }

    // Fetch trusted prices, stock & variant statuses exclusively from DB / server catalog
    const parsedItems = parseAndStripBundleIds(items);
    const dbProducts = await fetchServerProductsForItems(parsedItems);
    const built = buildServerCalculationItems(parsedItems, dbProducts, safeLocale);
    if (!built.ok) {
      return NextResponse.json({ error: built.error }, { status: built.status });
    }

    const { calculationItems, resolvedPerItem, hasPreorder: hasServerPreorder, hasInStock: hasServerInStock } = built;

    if (hasServerPreorder && hasServerInStock) {
      return NextResponse.json(
        {
          error:
            safeLocale === "en"
              ? "Mixed orders (in-stock + pre-order) are not allowed. Please place separate orders."
              : "Comenzile mixte (produse din stoc + precomandă) nu sunt permise. Te rugăm să plasezi comenzi separate.",
        },
        { status: 400 }
      );
    }

    const multiplier = getCurrencyMultiplier(safeCurrency);
    const couponResolution = await resolveServerCoupon(
      couponCode,
      calculationItems,
      safeCurrency,
      multiplier,
      safeLocale,
      false,
      email
    );
    if (!couponResolution.ok && "selfUseBlocked" in couponResolution && couponResolution.selfUseBlocked) {
      return NextResponse.json({ error: couponResolution.error }, { status: 400 });
    }
    const couponData = couponResolution.ok ? couponResolution.couponData : null;

    const shippingConfig = await getShippingConfig();
    const lockersEnabled = Boolean(shippingConfig?.lockers_enabled);
    const normalizedCountry = String(country || "RO").trim().toUpperCase() || "RO";
    const digitalOnly = isDigitalOnlyCart(calculationItems);

    if (!digitalOnly) {
      const shippingCheck = validateShippingSelection({
        country: normalizedCountry,
        shippingType: shippingType || "hd",
        carrierId: body.carrier_id ? String(body.carrier_id) : undefined,
        branchId: body.branch_id ? String(body.branch_id) : undefined,
        locale: safeLocale,
        lockersEnabled,
      });
      if (!shippingCheck.ok) {
        return NextResponse.json({ error: shippingCheck.error }, { status: 400 });
      }
    }

    const effectiveShippingType: "hd" | "pudo" =
      !digitalOnly && shippingType === "pudo" && lockersEnabled && normalizedCountry === "RO" ? "pudo" : "hd";

    const paymentMethod = "online";
    const options = {
      priority_processing,
      gift_packaging,
      payment_method: paymentMethod,
      free_shipping_ro_ron: shippingConfig.free_shipping_ro_ron,
      free_shipping_intl_eur: shippingConfig.free_shipping_intl_eur,
    };
    const result = calculateOrderTotal(
      calculationItems,
      safeCurrency,
      normalizedCountry,
      effectiveShippingType,
      couponData,
      undefined,
      options
    );
    const appliedCouponData = result.couponApplied ? couponData : null;

    if (!isStripeConfigured()) {
      return NextResponse.json({
        stripeDisabled: true,
        calculatedAmount: result.total / multiplier,
      });
    }

    // Build validated server items (untruncated) for Stripe metadata chunking + checkout_sessions backup
    const serverValidatedItems = resolvedPerItem.map(({ parsed, dbProduct, isPreorder, price }) => {
      const i = parsed.raw;
      const nameResolved =
        typeof i.name === "object"
          ? i.name[safeLocale] || i.name.ro || i.name.en || Object.values(i.name)[0]
          : i.name || (typeof dbProduct?.name === "object" ? dbProduct.name[safeLocale] || dbProduct.name.ro : dbProduct?.name) || (safeLocale === "en" ? "Product" : "Produs");

      const localizedPrice = safeCurrency === "RON" ? price : getProductPrice(price, safeCurrency);
      const isDigital = Boolean(i.is_digital || dbProduct?.specs_summary?.is_digital || isDigitalProgramItem(dbProduct || i));
      const resolvedVariant = i.selectedVariant
        ? { ...i.selectedVariant, stock_status: isPreorder ? "preorder" : "in_stock" }
        : i.variant
          ? { name: i.variant, stock_status: isPreorder ? "preorder" : "in_stock" }
          : null;
      return {
        id: i.id || dbProduct?.id || i.slug,
        slug: i.slug || dbProduct?.slug,
        name: nameResolved,
        quantity: Math.max(1, Math.floor(Number(i.quantity) || 1)),
        price: localizedPrice,
        image: i.image || i.selectedVariant?.image || undefined,
        is_digital: isDigital,
        specs_summary: dbProduct?.specs_summary || i.specs_summary,
        selectedVariant: resolvedVariant,
        _isBundle: parsed._isBundle,
        stock_status: isPreorder ? "preorder" : "in_stock",
        is_preorder: isPreorder,
      };
    });

    const chunkedOrderItems = encodeOrderItemsForStripeMetadata(serverValidatedItems, safeLocale);
    const stripe = getStripeClient();

    const paymentIntent = await stripe.paymentIntents.create({
      amount: result.total,
      currency: safeCurrency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: {
        locale: safeLocale,
        coupon_id: appliedCouponData?.id || "",
        coupon: appliedCouponData?.code ? String(appliedCouponData.code).substring(0, 500) : "none",
        subtotal: (result.subtotal / multiplier).toFixed(multiplier === 1 ? 0 : 2),
        bundleDiscount: (result.bundleDiscount / multiplier).toFixed(multiplier === 1 ? 0 : 2),
        couponDiscount: (result.couponDiscount / multiplier).toFixed(multiplier === 1 ? 0 : 2),
        cardDiscount: (result.cardDiscount / multiplier).toFixed(multiplier === 1 ? 0 : 2),
        shippingCost: (result.shippingCost / multiplier).toFixed(multiplier === 1 ? 0 : 2),
        discount_total: ((result.bundleDiscount + result.couponDiscount) / multiplier).toFixed(
          multiplier === 1 ? 0 : 2
        ),
        final_total: (result.total / multiplier).toFixed(multiplier === 1 ? 0 : 2),
        currency: result.currency,
        is_preorder: hasServerPreorder ? "yes" : "no",
        shipping_type: effectiveShippingType,
        country: normalizedCountry,
        ...chunkedOrderItems,
      },
    });

    // Save initial untruncated cart snapshot in checkout_sessions keyed by payment_intent_id
    await backupCheckoutSessionForPI({
      paymentIntentId: paymentIntent.id,
      email: email || "",
      country: normalizedCountry,
      shippingType: effectiveShippingType,
      items: serverValidatedItems,
      totalAmount: result.total / multiplier,
      currency: safeCurrency,
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      calculatedAmount: result.total / multiplier,
    });
  } catch (error) {
    console.error("❌ Stripe Checkout error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
