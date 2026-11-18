import { NextResponse } from "next/server";
import { rateLimiters, getClientIp, checkRateLimit } from "@/lib/ratelimit";
import { verifyCsrfToken } from "@/lib/csrf";
import { calculateOrderTotal } from "@/lib/cart-calculations";
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
    const ip = getClientIp(req);

    // 1. Parse request body
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { isFinalSync } = body;

    console.log(`🚀 [UPDATE API] Received update request (final=${Boolean(isFinalSync)}) for PI: ${body?.paymentIntentId || "unknown"}`);

    // 2. Rate limit (distinct generous key on critical final sync before confirmPayment)
    const { allowed, retryAfter, headers: rlHeaders } = await checkRateLimit(
      rateLimiters.checkoutUpdate,
      ip,
      isFinalSync === true ? "checkout-final-sync" : "checkout-update"
    );

    if (!allowed) {
      console.warn(`⚠️ [CHECKOUT-UPDATE] Rate limit exceeded for IP: ${ip}`);
      return NextResponse.json(
        { error: "Too many update requests. Please try again later.", retryAfter },
        { status: 429, headers: rlHeaders }
      );
    }

    // 3. Verify CSRF token
    const csrfToken = req.headers.get("x-csrf-token");
    const isCsrfValid = await verifyCsrfToken(csrfToken || "");

    if (!isCsrfValid) {
      console.warn(`⚠️ [CSRF] Token verification failed for IP: ${ip}`);
      return NextResponse.json(
        { error: "CSRF token validation failed" },
        { status: 403 }
      );
    }

    const {
      paymentIntentId,
      clientSecret,
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
      currency = "RON",
      phone,
      line1,
      line2,
      city,
      state,
      postal_code,
      locale = "ro",
      priority_processing,
      gift_packaging,
      gift_message,
      payment_method,
    } = body;

    const SUPPORTED_CURRENCIES = ["RON", "EUR", "USD", "GBP"];
    const safeCurrency = typeof currency === "string" ? currency.toUpperCase() : "RON";
    if (!SUPPORTED_CURRENCIES.includes(safeCurrency)) {
      return NextResponse.json({ error: "Unsupported currency." }, { status: 400 });
    }

    if (!paymentIntentId) {
      return NextResponse.json({ error: "Missing Stripe Payment Intent." }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
    }

    await getServerExchangeRates();

    const safeLocale: "ro" | "en" = locale === "en" ? "en" : "ro";
    const parsedItems = parseAndStripBundleIds(items);
    const dbProducts = await fetchServerProductsForItems(parsedItems);
    const built = buildServerCalculationItems(parsedItems, dbProducts, safeLocale);
    if (!built.ok) {
      return NextResponse.json({ error: built.error }, { status: built.status });
    }

    const { calculationItems, resolvedPerItem, hasPreorder: isPreorderOrder, hasInStock: hasInStockOrder } = built;

    if (isPreorderOrder && hasInStockOrder) {
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

    const shippingConfig = await getShippingConfig();
    const lockersEnabled = Boolean(shippingConfig?.lockers_enabled);
    const normalizedCountry = String(country || "RO").trim().toUpperCase() || "RO";

    const digitalOnly = isDigitalOnlyCart(calculationItems);
    let validatedCarrierId = digitalOnly ? "digital" : (carrier_id ? String(carrier_id) : "");
    if (!digitalOnly) {
      const shippingCheck = validateShippingSelection({
        country: normalizedCountry,
        shippingType: shipping_type || "hd",
        carrierId: carrier_id ? String(carrier_id) : undefined,
        branchId: branch_id ? String(branch_id) : undefined,
        locale: safeLocale,
        lockersEnabled,
      });
      if (!shippingCheck.ok) {
        return NextResponse.json({ error: shippingCheck.error }, { status: 400 });
      }
      validatedCarrierId = shippingCheck.carrierId;
    }

    const effectiveShippingType: "hd" | "pudo" =
      !digitalOnly && shipping_type === "pudo" && lockersEnabled && normalizedCountry === "RO" ? "pudo" : "hd";
    const effectiveCarrierId = validatedCarrierId || (carrier_id ? String(carrier_id) : "");
    const effectiveBranchId = effectiveShippingType === "pudo" && branch_id ? String(branch_id) : "";
    const effectiveBranchName = effectiveShippingType === "pudo" && branch_name ? String(branch_name) : "";

    const multiplier = getCurrencyMultiplier(safeCurrency);
    const couponResolution = await resolveServerCoupon(
      couponCode,
      calculationItems,
      safeCurrency,
      multiplier,
      safeLocale,
      Boolean(isFinalSync)
    );
    if (!couponResolution.ok) {
      return NextResponse.json({ error: couponResolution.error }, { status: 400 });
    }
    const couponData = couponResolution.couponData;

    const options = {
      priority_processing,
      gift_packaging,
      payment_method: "online" as const,
      free_shipping_ro_ron: shippingConfig.free_shipping_ro_ron,
      free_shipping_intl_eur: shippingConfig.free_shipping_intl_eur,
    };
    const result = calculateOrderTotal(
      calculationItems,
      safeCurrency,
      normalizedCountry,
      effectiveShippingType,
      couponData,
      effectiveCarrierId || undefined,
      options
    );
    const appliedCouponData = result.couponApplied ? couponData : null;

    // Build validated full untruncated item snapshots for Supabase checkout_sessions & compact Stripe chunks
    const serverValidatedItems = resolvedPerItem.map(({ parsed, dbProduct, isPreorder, price }) => {
      const i = parsed.raw;
      const resolvedName =
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
        id: i.id || i.slug || dbProduct?.id,
        slug: i.slug || dbProduct?.slug,
        name: resolvedName,
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
    const decimals = multiplier === 1 ? 0 : 2;

    const updatePayload: any = {
      amount: result.total,
      currency: safeCurrency.toLowerCase(),
      description: `Order from ${firstName || "Client"} ${lastName || ""}`.trim(),
      metadata: {
        coupon_id: appliedCouponData?.id || "",
        coupon: appliedCouponData?.code ? String(appliedCouponData.code).substring(0, 500) : "none",
        hasBundle: result.bundleDiscount > 0 ? "yes" : "no",
        is_preorder: isPreorderOrder ? "yes" : "no",
        shipping_type: effectiveShippingType,
        carrier_id: String(effectiveCarrierId || "none").substring(0, 500),
        branch_id: String(effectiveBranchId || "none").substring(0, 500),
        branch_name: String(effectiveBranchName || "none").substring(0, 500),
        phone: phone && phone !== "none" ? String(phone).substring(0, 50) : "",
        currency: safeCurrency.substring(0, 10),
        subtotal: (result.subtotal / multiplier).toFixed(decimals),
        bundleDiscount: (result.bundleDiscount / multiplier).toFixed(decimals),
        couponDiscount: (result.couponDiscount / multiplier).toFixed(decimals),
        cardDiscount: (result.cardDiscount / multiplier).toFixed(decimals),
        discount_total: ((result.bundleDiscount + result.couponDiscount) / multiplier).toFixed(decimals),
        shippingCost: (result.shippingCost / multiplier).toFixed(decimals),
        final_total: (result.total / multiplier).toFixed(decimals),
        ...chunkedOrderItems,
        addr_line1: String(line1 || "").substring(0, 500),
        addr_line2: String(line2 || "").substring(0, 500),
        addr_city: String(city || "").substring(0, 500),
        addr_county: String(state || "").substring(0, 500),
        addr_state: String(state || "").substring(0, 500),
        addr_postal_code: String(postal_code || "").substring(0, 100),
        addr_country: normalizedCountry.substring(0, 100),
        customer_name: `${firstName || ""} ${lastName || ""}`.trim().substring(0, 500),
        locale: safeLocale,
        firstName: String(firstName || "").substring(0, 100),
        lastName: String(lastName || "").substring(0, 100),
        email: String(email || "").substring(0, 255),
        priority_processing: !digitalOnly && priority_processing ? "yes" : "no",
        gift_packaging: !digitalOnly && gift_packaging ? "yes" : "no",
        gift_message: !digitalOnly ? String(gift_message || "").substring(0, 500) : "",
      },
    };

    if (email && String(email).trim() !== "") {
      updatePayload.receipt_email = String(email).trim();
    }

    const persistSessionBackup = () =>
      backupCheckoutSessionForPI({
        paymentIntentId,
        email: email || "",
        firstName: firstName || "",
        lastName: lastName || "",
        phone: phone || "",
        line1: line1 || "",
        line2: line2 || "",
        city: city || "",
        state: state || "",
        postalCode: postal_code || "",
        country: normalizedCountry,
        shippingType: effectiveShippingType,
        carrierId: effectiveCarrierId || undefined,
        branchId: effectiveBranchId || undefined,
        branchName: effectiveBranchName || undefined,
        items: serverValidatedItems,
        totalAmount: result.total / multiplier,
        currency: safeCurrency,
      });

    if (!isStripeConfigured()) {
      await persistSessionBackup();
      return NextResponse.json({
        success: true,
        stripeDisabled: true,
        calculatedAmount: result.total / multiplier,
      });
    }

    const stripe = getStripeClient();
    const existingPi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (!clientSecret || !existingPi.client_secret || String(clientSecret).trim() !== existingPi.client_secret) {
      return NextResponse.json(
        { error: "Invalid or missing payment session credential" },
        { status: 403 }
      );
    }

    if (!["requires_payment_method", "requires_confirmation", "requires_action"].includes(existingPi.status)) {
      await persistSessionBackup();
      return NextResponse.json({
        success: true,
        status: existingPi.status,
        calculatedAmount: result.total / multiplier,
      });
    }

    await Promise.all([
      stripe.paymentIntents.update(paymentIntentId, updatePayload),
      persistSessionBackup(),
    ]);

    return NextResponse.json({
      success: true,
      calculatedAmount: result.total / multiplier,
    });
  } catch (error) {
    console.error("❌ Stripe update error:", error instanceof Error ? error.message : error);
    const errorDetails = error instanceof Error ? error.message : JSON.stringify(error);
    return NextResponse.json({ error: `Backend Error: ${errorDetails}` }, { status: 500 });
  }
}
