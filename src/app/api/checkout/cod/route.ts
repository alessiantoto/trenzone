import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { calculateOrderTotal } from "@/lib/cart-calculations";
import { verifyCsrfToken } from "@/lib/csrf";
import { rateLimiters, getClientIp, checkRateLimit } from "@/lib/ratelimit";
import { processOrder } from "@/lib/orders";
import type { OrderData } from "@/lib/orders";
import { getNextOrderNumber } from "@/lib/sequences";
import { completeCheckoutSession } from "@/app/actions/checkout-tracking";
import { getSingleFlavorImage } from "@/lib/product-images";
import { getServerExchangeRates, FALLBACK_RATES } from "@/utils/pricing";
import { getShippingConfig } from "@/app/actions/shipping";
import {
  buildServerCalculationItems,
  fetchServerProductsForItems,
  parseAndStripBundleIds,
  resolveServerCoupon,
  validateShippingSelection,
} from "@/lib/checkout-helpers";
import { hasAnyDigitalProgram, isDigitalOnlyCart, isDigitalProgramItem } from "@/lib/programs";

export const dynamic = "force-dynamic";

function resolveLocalizedText(val: unknown, locale: "ro" | "en", fallback = ""): string {
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

function normalizeCodCountry(rawCountry: unknown): string {
  const upper = String(rawCountry || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  if (upper === "RO" || upper === "ROU" || upper === "ROM" || upper === "ROMANIA") {
    return "RO";
  }
  return upper;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const to = (searchParams.get("to") || "EUR").toUpperCase();
    const rates = await getServerExchangeRates();
    const rateInRon = rates[to] || FALLBACK_RATES[to] || 1;
    const rate = rateInRon > 0 ? 1 / rateInRon : 1;

    return NextResponse.json({ rate });
  } catch {
    return NextResponse.json({ error: "Failed to fetch conversion rate" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // 1. Rate limiting check (max 5 checkout attempts per min per IP)
    const ip = getClientIp(req);
    const { allowed, retryAfter, headers: rlHeaders } = await checkRateLimit(
      rateLimiters.checkout,
      ip,
      "checkout"
    );

    if (!allowed) {
      console.warn(`⚠️ [COD CHECKOUT] Rate limit exceeded for IP: ${ip}`);
      return NextResponse.json(
        { error: "Prea multe comenzi încercate. Vă rugăm să încercați mai târziu.", retryAfter },
        { status: 429, headers: rlHeaders }
      );
    }

    // 2. Verificare OBLIGATORIE token CSRF de siguranță
    const csrfToken = req.headers.get("x-csrf-token");
    const isCsrfValid = await verifyCsrfToken(csrfToken || "");
    if (!isCsrfValid) {
      console.warn(`⚠️ [COD CHECKOUT] CSRF validation failed for IP: ${ip}`);
      return NextResponse.json({ error: "CSRF token validation failed" }, { status: 403 });
    }

    // 3. Parsare & validare payload JSON
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const {
      email,
      firstName,
      lastName,
      phone,
      line1,
      line2,
      city,
      state,
      postal_code,
      country,
      shipping_type,
      carrier_id,
      branch_id,
      branch_name,
      items,
      couponCode,
      locale = "ro",
      priority_processing,
      gift_packaging,
      gift_message,
    } = body;

    const safeLocale: "ro" | "en" = String(locale).toLowerCase().startsWith("en") ? "en" : "ro";

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: safeLocale === "en" ? "Cart is empty." : "Coșul este gol." },
        { status: 400 }
      );
    }

    // Validate required customer & address fields (postal_code & state trimmed; postal_code is optional in RO)
    const emailTrimmed = String(email || "").trim().toLowerCase().slice(0, 255);
    if (!emailTrimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      return NextResponse.json(
        {
          error:
            safeLocale === "en"
              ? "Please enter a valid email address."
              : "Te rugăm să introduci o adresă de email validă.",
        },
        { status: 400 }
      );
    }

    const cleanFirstName = String(firstName || "").trim().slice(0, 120);
    const cleanLastName = String(lastName || "").trim().slice(0, 120);
    const cleanPhone = String(phone || "").trim().slice(0, 40);
    const phoneDigits = cleanPhone.replace(/\D/g, "");

    if (!cleanFirstName || !cleanLastName || !cleanPhone || phoneDigits.length < 6) {
      return NextResponse.json(
        {
          error:
            safeLocale === "en"
              ? "First name, last name and a valid phone number are required."
              : "Numele, prenumele și un număr de telefon valid sunt obligatorii.",
        },
        { status: 400 }
      );
    }

    const cleanLine1 = String(line1 || "").trim().substring(0, 500);
    const cleanLine2 = String(line2 || "").trim().substring(0, 500);
    const cleanCity = String(city || "").trim().substring(0, 500);
    const cleanState = String(state || "").trim().substring(0, 100);
    const cleanZip = String(postal_code || "").trim().substring(0, 100);

    if (!cleanLine1 || !cleanCity) {
      return NextResponse.json(
        {
          error:
            safeLocale === "en"
              ? "Street address and city are required."
              : "Adresa și orașul sunt obligatorii.",
        },
        { status: 400 }
      );
    }

    // Strict business rule: COD is available exclusively for Romania ('RO') and strictly in RON
    const normalizedCountry = normalizeCodCountry(country);
    if (normalizedCountry !== "RO") {
      return NextResponse.json(
        {
          error:
            safeLocale === "en"
              ? "Cash on delivery is only available in Romania. Please choose online card payment."
              : "Plata ramburs la livrare este disponibilă exclusiv în România. Te rugăm să alegi plata cu cardul.",
        },
        { status: 400 }
      );
    }

    const shippingConfig = await getShippingConfig();
    const lockersEnabled = Boolean(shippingConfig?.lockers_enabled);

    const rawShippingType =
      shipping_type === undefined || shipping_type === null || String(shipping_type).trim() === ""
        ? "hd"
        : String(shipping_type).trim().toLowerCase();
    const cleanCarrierId = carrier_id ? String(carrier_id).trim() : undefined;
    const cleanBranchId = branch_id ? String(branch_id).trim() : "";
    const cleanBranchName = branch_name ? String(branch_name).trim() : "";

    const shippingCheck = validateShippingSelection({
      country: normalizedCountry,
      shippingType: rawShippingType,
      carrierId: cleanCarrierId,
      branchId: cleanBranchId || undefined,
      locale: safeLocale,
      lockersEnabled,
    });
    if (!shippingCheck.ok) {
      return NextResponse.json({ error: shippingCheck.error }, { status: 400 });
    }

    // 4. Extragere și validare completă produse & variante din baza de date (sold_out + preorder)
    await getServerExchangeRates();
    const parsedItems = parseAndStripBundleIds(items);
    const dbProducts = await fetchServerProductsForItems(parsedItems);
    const built = buildServerCalculationItems(parsedItems, dbProducts, safeLocale);
    if (!built.ok) {
      return NextResponse.json({ error: built.error }, { status: built.status });
    }

    const { calculationItems, resolvedPerItem, hasPreorder, hasInStock } = built;

    if (isDigitalOnlyCart(calculationItems) || hasAnyDigitalProgram(calculationItems)) {
      return NextResponse.json(
        {
          error:
            safeLocale === "en"
              ? "Orders including digital programs are delivered instantly via email and require online card / Apple Pay / Google Pay payment."
              : "Comenzile care includ programe digitale se livrează instant pe email și se achită exclusiv online cu cardul / Apple Pay / Google Pay.",
        },
        { status: 400 }
      );
    }

    if (hasPreorder && hasInStock) {
      return NextResponse.json(
        {
          error:
            safeLocale === "en"
              ? "Mixed orders (pre-order + in-stock) are not allowed. Please place pre-orders separately."
              : "Comenzile mixte (precomandă + stoc) nu sunt permise. Te rugăm să plasezi precomanda separat.",
        },
        { status: 400 }
      );
    }

    if (hasPreorder) {
      return NextResponse.json(
        {
          error:
            safeLocale === "en"
              ? "Pre-orders require online card payment."
              : "Precomenzile necesită plată online cu cardul.",
        },
        { status: 400 }
      );
    }

    // 5. Verificare și validare strictă cupon de reducere (strictly RON for COD)
    const couponResolution = await resolveServerCoupon(
      couponCode,
      calculationItems,
      "RON",
      100,
      safeLocale,
      true
    );
    if (!couponResolution.ok) {
      return NextResponse.json({ error: couponResolution.error }, { status: 400 });
    }
    const couponData = couponResolution.couponData;

    // 6. Calcularea Finală a sumelor în RON (produse + transport - reduceri)
    const cleanPriorityProcessing = Boolean(priority_processing);
    const cleanGiftPackaging = Boolean(gift_packaging);
    const cleanGiftMessage = gift_message ? String(gift_message).trim().substring(0, 1000) : "";

    const options = {
      priority_processing: cleanPriorityProcessing,
      gift_packaging: cleanGiftPackaging,
      payment_method: "cod",
      free_shipping_ro_ron: shippingConfig.free_shipping_ro_ron,
      free_shipping_intl_eur: shippingConfig.free_shipping_intl_eur,
    };
    const result = calculateOrderTotal(
      calculationItems,
      "RON",
      shippingCheck.country,
      shippingCheck.shippingType,
      couponData,
      shippingCheck.carrierId,
      options
    );
    const appliedCouponData = result.couponApplied ? couponData : null;

    // Guard împotriva dublu-click / re-submit rapid (ultimele 20 secunde pentru același email, total și metodă livrare)
    const cutoffIso = new Date(Date.now() - 20_000).toISOString();
    const { data: recentDuplicate } = await supabaseAdmin
      .from("orders")
      .select("payment_intent_id, total_amount, shipping_type")
      .eq("customer_email", emailTrimmed)
      .eq("payment_method", "cod")
      .gte("created_at", cutoffIso)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (
      recentDuplicate?.payment_intent_id &&
      Math.abs(Number(recentDuplicate.total_amount) - result.total / 100) < 0.05 &&
      (!recentDuplicate.shipping_type || recentDuplicate.shipping_type === shippingCheck.shippingType)
    ) {
      const dupRes = NextResponse.json({
        success: true,
        orderId: recentDuplicate.payment_intent_id,
        duplicateGuard: true,
      });
      dupRes.cookies.set("tz_last_cod_order", recentDuplicate.payment_intent_id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 3600,
      });
      return dupRes;
    }

    // Build normalized DB & processing items once so both stay completely consistent
    const normalizedDbItems = resolvedPerItem.map(({ parsed, dbProduct, price }) => {
      const clientItem = parsed.raw || {};
      const variantName = resolveLocalizedText(
        clientItem.selectedVariant?.name ?? clientItem.variant,
        safeLocale
      );
      const baseName =
        resolveLocalizedText(clientItem.name, safeLocale) ||
        resolveLocalizedText(dbProduct?.name, safeLocale) ||
        (safeLocale === "en" ? "Product" : "Produs");
      const isDigital = isDigitalProgramItem(dbProduct || clientItem);
      const isBundle =
        !isDigital &&
        (parsed._isBundle ||
          (baseName && baseName.toLowerCase().includes("pachet")) ||
          (baseName && baseName.toLowerCase().includes("bundle")));
      const effectiveImage = isDigital
        ? clientItem.image || clientItem.selectedVariant?.image || "/images/products/program_complete_trio_v2.webp"
        : isBundle
          ? "/images/products/x10_elbow_wraps_purple.webp"
          : clientItem.selectedVariant?.image ||
            (typeof clientItem.image === "string" && !clientItem.image.includes("bundle")
              ? clientItem.image
              : getSingleFlavorImage(variantName || baseName));
      const realUuid = dbProduct?.id || parsed._realId;
      const qty = Math.max(1, Math.floor(Number(clientItem.quantity) || 1));

      return {
        ...clientItem,
        id: realUuid,
        bundleId: parsed._isBundle ? String(clientItem.id) : undefined,
        name: baseName,
        quantity: qty,
        slug: clientItem.slug || dbProduct?.slug,
        price,
        is_digital: isDigital,
        specs_summary: dbProduct?.specs_summary || clientItem.specs_summary,
        variant: variantName || null,
        selectedVariant: clientItem.selectedVariant || (variantName ? { name: variantName } : null),
        image: effectiveImage,
      };
    });

    // 7. Generare ID Unic Comandă Ramburs (Sequential: TZ-XXXX-DDMMYY) + Salvare în Supabase
    const buildOrderPayload = (orderNum: string) => ({
      payment_intent_id: orderNum,
      status: "processing",
      payment_method: "cod",
      subtotal: result.subtotal / 100,
      discount_total: (result.bundleDiscount + result.couponDiscount) / 100,
      total_amount: result.total / 100,
      shipping_amount: result.shippingCost / 100,
      coupon_id: appliedCouponData?.id || null,
      currency: "RON",
      customer_email: emailTrimmed,
      customer_firstname: cleanFirstName,
      customer_lastname: cleanLastName,
      customer_phone: cleanPhone,
      addr_line1: cleanLine1,
      addr_line2: cleanLine2 || null,
      addr_city: cleanCity,
      addr_county: cleanState || null,
      addr_zip: cleanZip,
      addr_country: shippingCheck.country,
      shipping_type: shippingCheck.shippingType,
      carrier_id: shippingCheck.carrierId,
      branch_id: shippingCheck.shippingType === "pudo" ? cleanBranchId || null : null,
      branch_name: shippingCheck.shippingType === "pudo" ? cleanBranchName || null : null,
      items: normalizedDbItems,
      priority_processing: cleanPriorityProcessing,
      gift_packaging: cleanGiftPackaging,
      gift_message: cleanGiftMessage || null,
      receipt_url: `/api/admin/orders/${orderNum}/invoice`,
      carrier_metadata: {
        shipping_cost: result.shippingCost / 100,
        card_discount: 0,
        locale: safeLocale,
        order_number: orderNum,
        is_preorder: false,
        coupon_usage_incremented: false,
        ...(shippingCheck.shippingType === "pudo" && cleanBranchId ? { locker_id: cleanBranchId } : {}),
        ...(appliedCouponData?.code ? { coupon_code: appliedCouponData.code } : {}),
      },
    });

    let uniqueOrderId = await getNextOrderNumber();
    let { error: insertError } = await supabaseAdmin
      .from("orders")
      .insert(buildOrderPayload(uniqueOrderId));

    // Retry once with a fresh sequential number if a rare 23505 collision occurred on payment_intent_id
    if (
      insertError &&
      (insertError.code === "23505" ||
        String(insertError.message || "").toLowerCase().includes("duplicate key"))
    ) {
      console.warn(`⚠️ [COD CHECKOUT] Sequence collision for ${uniqueOrderId}, retrying with fresh order number.`);
      uniqueOrderId = await getNextOrderNumber();
      const retryRes = await supabaseAdmin.from("orders").insert(buildOrderPayload(uniqueOrderId));
      insertError = retryRes.error;
    }

    if (insertError) {
      throw new Error(
        safeLocale === "en"
          ? `Database save failed: ${insertError.message}`
          : `Salvarea în baza de date a eșuat: ${insertError.message}`
      );
    }

    // Mark checkout session as completed (non-fatal)
    try {
      await completeCheckoutSession(null, emailTrimmed);
    } catch (trackErr) {
      console.warn("⚠️ [GDPR Abandoned Cart] Failed to mark COD session completed:", trackErr);
    }

    // 8. Trigger synchronous order processing (DB idempotent sync, stock, PDF, Oblio if enabled, Email)
    try {
      const orderDataForProcessing: OrderData = {
        id: uniqueOrderId,
        date: new Date().toLocaleDateString(safeLocale === "en" ? "en-US" : "ro-RO"),
        currency: "RON",
        locale: safeLocale,
        total: result.total / 100,
        subtotal: result.subtotal / 100,
        discount: (result.bundleDiscount + result.couponDiscount) / 100,
        cardDiscount: 0,
        coupon_id: appliedCouponData?.id || null,
        couponCode: appliedCouponData?.code || undefined,
        paymentMethod: "cod",
        shippingType: shippingCheck.shippingType,
        carrierId: shippingCheck.carrierId,
        shipping: result.shippingCost / 100,
        branchId: shippingCheck.shippingType === "pudo" && cleanBranchId ? cleanBranchId : undefined,
        branchName: shippingCheck.shippingType === "pudo" && cleanBranchName ? cleanBranchName : undefined,
        customer: {
          firstName: cleanFirstName,
          lastName: cleanLastName,
          email: emailTrimmed,
          phone: cleanPhone,
          addr_line1: cleanLine1,
          addr_line2: cleanLine2 || undefined,
          addr_city: cleanCity,
          addr_county: cleanState || undefined,
          addr_zip: cleanZip,
          addr_country: shippingCheck.country,
        },
        itemsAlreadyInCurrency: true,
        items: normalizedDbItems,
        priorityProcessing: cleanPriorityProcessing,
        giftPackaging: cleanGiftPackaging,
        giftMessage: cleanGiftMessage || null,
      };

      console.log("⏳ [COD CHECKOUT] Running processOrder synchronously...");
      await processOrder(orderDataForProcessing);
      console.log("✅ [COD CHECKOUT] Processing completed.");
    } catch (processErr) {
      console.warn("⚠️ Warning: Order processing failed, but COD order was saved:", processErr);
    }

    const codRes = NextResponse.json({ success: true, orderId: uniqueOrderId });
    codRes.cookies.set("tz_last_cod_order", uniqueOrderId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 3600,
    });
    return codRes;
  } catch (error: any) {
    console.error("❌ Eroare Backend COD:", error);
    return NextResponse.json(
      { error: error?.message || "Eroare la procesarea comenzii ramburs." },
      { status: 500 }
    );
  }
}
