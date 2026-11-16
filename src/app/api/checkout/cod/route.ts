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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const to = (searchParams.get("to") || "EUR").toUpperCase();
    const rates = await getServerExchangeRates();
    const rateInRon = rates[to] || FALLBACK_RATES[to] || 1;
    const rate = rateInRon > 0 ? (1 / rateInRon) : 1;

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
      'checkout'
    );

    if (!allowed) {
      console.warn(`⚠️ [COD CHECKOUT] Rate limit exceeded for IP: ${ip}`);
      return NextResponse.json(
        { error: 'Prea multe comenzi încercate. Vă rugăm să încercați mai târziu.', retryAfter },
        { status: 429, headers: rlHeaders }
      );
    }

    // 2. Verificare OBLIGATORIE token CSRF de siguranță
    const csrfToken = req.headers.get('x-csrf-token');
    const isCsrfValid = await verifyCsrfToken(csrfToken || '');
    if (!isCsrfValid) {
      console.warn(`⚠️ [COD CHECKOUT] CSRF validation failed for IP: ${ip}`);
      return NextResponse.json({ error: 'CSRF token validation failed' }, { status: 403 });
    }

    // 2. Parsare conținut comandă
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }
    const {
      email, firstName, lastName, phone,
      line1, line2, city, state, postal_code, country,
      shipping_type, carrier_id, branch_id, branch_name,
      items, couponCode, locale = 'ro',
      priority_processing, gift_packaging, gift_message
    } = body;
    const safeLocale: 'ro' | 'en' = locale === 'en' ? 'en' : 'ro';

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: safeLocale === 'en' ? "Cart is empty." : "Coșul este gol." }, { status: 400 });
    }

    // Validate required customer & address fields
    const emailTrimmed = String(email || "").trim().toLowerCase();
    if (!emailTrimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      return NextResponse.json(
        { error: safeLocale === 'en' ? "Please enter a valid email address." : "Te rugăm să introduci o adresă de email validă." },
        { status: 400 }
      );
    }
    if (!String(firstName || "").trim() || !String(lastName || "").trim() || !String(phone || "").trim()) {
      return NextResponse.json(
        { error: safeLocale === 'en' ? "First name, last name and phone number are required." : "Numele, prenumele și numărul de telefon sunt obligatorii." },
        { status: 400 }
      );
    }
    if (!String(line1 || "").trim() || !String(city || "").trim()) {
      return NextResponse.json(
        { error: safeLocale === 'en' ? "Street address and city are required." : "Adresa și orașul sunt obligatorii." },
        { status: 400 }
      );
    }

    // Strict business rule: COD is available exclusively for Romania ('RO')
    const normalizedCountry = String(country || "").trim().toUpperCase();
    if (normalizedCountry !== 'RO') {
      return NextResponse.json(
        {
          error: safeLocale === 'en'
            ? "Cash on delivery is only available in Romania. Please choose online card payment."
            : "Plata ramburs la livrare este disponibilă exclusiv în România. Te rugăm să alegi plata cu cardul."
        },
        { status: 400 }
      );
    }

    const shippingConfig = await getShippingConfig();
    const lockersEnabled = Boolean(shippingConfig?.lockers_enabled);

    const shippingCheck = validateShippingSelection({
      country: normalizedCountry,
      shippingType: shipping_type,
      carrierId: carrier_id ? String(carrier_id) : undefined,
      branchId: branch_id ? String(branch_id) : undefined,
      locale: safeLocale,
      lockersEnabled,
    });
    if (!shippingCheck.ok) {
      return NextResponse.json({ error: shippingCheck.error }, { status: 400 });
    }

    // 3. Extragere și validare completă produse & variante din baza de date (sold_out + preorder)
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
          error: safeLocale === 'en'
            ? "Orders including digital programs are delivered instantly via email and require online card / Apple Pay / Google Pay payment."
            : "Comenzile care includ programe digitale se livrează instant pe email și se achită exclusiv online cu cardul / Apple Pay / Google Pay."
        },
        { status: 400 }
      );
    }

    if (hasPreorder && hasInStock) {
      return NextResponse.json(
        {
          error: safeLocale === 'en'
            ? "Mixed orders (pre-order + in-stock) are not allowed. Please place pre-orders separately."
            : "Comenzile mixte (precomandă + stoc) nu sunt permise. Te rugăm să plasezi precomanda separat."
        },
        { status: 400 }
      );
    }

    if (hasPreorder) {
      return NextResponse.json(
        {
          error: safeLocale === 'en'
            ? "Pre-orders require online card payment."
            : "Precomenzile necesită plată online cu cardul."
        },
        { status: 400 }
      );
    }

    // 4. Verificare și validare strictă cupon de reducere
    const couponResolution = await resolveServerCoupon(
      couponCode,
      calculationItems,
      'RON',
      100,
      safeLocale,
      true
    );
    if (!couponResolution.ok) {
      return NextResponse.json({ error: couponResolution.error }, { status: 400 });
    }
    const couponData = couponResolution.couponData;

    // 5. Calcularea Finală a sumelor (produse + transport - reduceri)
    const options = {
      priority_processing,
      gift_packaging,
      payment_method: 'cod',
      free_shipping_ro_ron: shippingConfig.free_shipping_ro_ron,
      free_shipping_intl_eur: shippingConfig.free_shipping_intl_eur,
    };
    const result = calculateOrderTotal(
      calculationItems,
      'RON',
      shippingCheck.country,
      shippingCheck.shippingType,
      couponData,
      shippingCheck.carrierId,
      options
    );
    const appliedCouponData = result.couponApplied ? couponData : null;

    // Guard împotriva dublu-click / re-submit rapid (ultimele 20 secunde pentru același email & total)
    const cutoffIso = new Date(Date.now() - 20_000).toISOString();
    const { data: recentDuplicate } = await supabaseAdmin
      .from('orders')
      .select('payment_intent_id, total_amount')
      .eq('customer_email', emailTrimmed)
      .eq('payment_method', 'cod')
      .gte('created_at', cutoffIso)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (
      recentDuplicate?.payment_intent_id &&
      Math.abs(Number(recentDuplicate.total_amount) - result.total / 100) < 0.05
    ) {
      return NextResponse.json({
        success: true,
        orderId: recentDuplicate.payment_intent_id,
        duplicateGuard: true,
      });
    }

    // 6. Generare ID Unic Comandă Ramburs (Sequential: CHAMP-0017)
    const uniqueOrderId = await getNextOrderNumber();
    
    // 7. Creare obiect comandă pentru baza de date
    const orderPayload = {
      payment_intent_id: uniqueOrderId, // Salvăm ID-ul unic COD aici
      status: 'processing',
      payment_method: 'cod',
      subtotal: result.subtotal / 100,
      discount_total: (result.bundleDiscount + result.couponDiscount) / 100,
      total_amount: result.total / 100,
      shipping_amount: result.shippingCost / 100,
      coupon_id: appliedCouponData?.id || null,
      currency: 'RON',
      customer_email: emailTrimmed,
      customer_firstname: String(firstName).trim(),
      customer_lastname: String(lastName).trim(),
      customer_phone: String(phone).trim(),
      addr_line1: String(line1 || "").substring(0, 500),
      addr_line2: String(line2 || "").substring(0, 500),
      addr_city: String(city || "").substring(0, 500),
      addr_county: String(state || "").substring(0, 100),
      addr_zip: String(postal_code || "").substring(0, 100),
      addr_country: shippingCheck.country,
      shipping_type: shippingCheck.shippingType,
      carrier_id: shippingCheck.carrierId,
      branch_id: shippingCheck.shippingType === 'pudo' ? branch_id : null,
      branch_name: shippingCheck.shippingType === 'pudo' ? branch_name : null,
      items: resolvedPerItem.map(({ parsed, dbProduct, price }) => {
        const clientItem = parsed.raw;
        const variantName = typeof clientItem.selectedVariant?.name === 'object'
          ? (safeLocale === 'en'
              ? (clientItem.selectedVariant.name.en || clientItem.selectedVariant.name.ro || Object.values(clientItem.selectedVariant.name)[0])
              : (clientItem.selectedVariant.name.ro || clientItem.selectedVariant.name.en || Object.values(clientItem.selectedVariant.name)[0]))
          : clientItem.selectedVariant?.name;
        const isDigital = isDigitalProgramItem(dbProduct || clientItem);
        const isBundle = !isDigital && (parsed._isBundle || (clientItem.name && String(clientItem.name).toLowerCase().includes('pachet')));
        const effectiveImage = isDigital
          ? (clientItem.image || clientItem.selectedVariant?.image || '/images/products/program_complete_trio_v2.webp')
          : isBundle
            ? '/images/products/x10_elbow_wraps_purple.webp'
            : (clientItem.selectedVariant?.image || (typeof clientItem.image === 'string' && !clientItem.image.includes('bundle') ? clientItem.image : getSingleFlavorImage(variantName || clientItem.name)));
        return {
          ...clientItem,
          id: parsed._realId, // Always use real UUID for DB
          bundleId: parsed._isBundle ? clientItem.id : undefined,
          quantity: Math.max(1, Math.floor(Number(clientItem.quantity) || 1)),
          slug: clientItem.slug || dbProduct?.slug,
          price,
          is_digital: isDigital,
          specs_summary: dbProduct?.specs_summary || clientItem.specs_summary,
          variant: variantName || null,
          image: effectiveImage,
        };
      }),
      priority_processing: priority_processing || false,
      gift_packaging: gift_packaging || false,
      gift_message: gift_message ? String(gift_message).substring(0, 1000) : null,
      receipt_url: `/api/admin/orders/${uniqueOrderId}/invoice`,
      carrier_metadata: {
        shipping_cost: result.shippingCost / 100,
        locale: safeLocale,
        order_number: uniqueOrderId,
        is_preorder: false,
        coupon_usage_incremented: false,
        ...(shippingCheck.shippingType === 'pudo' && branch_id ? { locker_id: String(branch_id) } : {}),
        ...(appliedCouponData?.code ? { coupon_code: appliedCouponData.code } : {})
      }
    };

    // 9. Salvare în Supabase
    const { error: insertError } = await supabaseAdmin.from('orders').insert(orderPayload);
    if (insertError) throw new Error(safeLocale === 'en' ? `Database save failed: ${insertError.message}` : `Salvarea în baza de date a eșuat: ${insertError.message}`);

    // Mark checkout session as completed
    try {
      await completeCheckoutSession(null, emailTrimmed);
    } catch (trackErr) {
      console.warn("⚠️ [GDPR Abandoned Cart] Failed to mark COD session completed:", trackErr);
    }

    // 10. Trigger order processing (Packeta, Email, Invoice, etc.)
    try {
      const orderDataForProcessing: OrderData = {
        id: uniqueOrderId,
        date: new Date().toLocaleDateString(safeLocale === 'en' ? 'en-US' : 'ro-RO'),
        currency: 'RON',
        locale: safeLocale,
        total: result.total / 100,
        subtotal: result.subtotal / 100,
        discount: (result.bundleDiscount + result.couponDiscount) / 100,
        coupon_id: appliedCouponData?.id || null,
        couponCode: appliedCouponData?.code || undefined,
        paymentMethod: 'cod',
        shippingType: shippingCheck.shippingType,
        carrierId: shippingCheck.carrierId,
        shipping: result.shippingCost / 100,
        branchId: shippingCheck.shippingType === 'pudo' && branch_id ? String(branch_id) : undefined,
        branchName: shippingCheck.shippingType === 'pudo' ? branch_name : undefined,
        customer: {
          firstName: String(firstName).trim(),
          lastName: String(lastName).trim(),
          email: emailTrimmed,
          phone: String(phone).trim(),
          addr_line1: String(line1 || ''),
          addr_line2: String(line2 || ''),
          addr_city: String(city || ''),
          addr_county: String(state || ''),
          addr_zip: String(postal_code || ''),
          addr_country: shippingCheck.country,
        },
        itemsAlreadyInCurrency: true,
        items: resolvedPerItem.map(({ parsed, dbProduct, price }) => {
          const item = parsed.raw;
          const variantName = typeof item.selectedVariant?.name === 'object'
            ? item.selectedVariant.name[safeLocale] || item.selectedVariant.name.ro || item.selectedVariant.name.en || Object.values(item.selectedVariant.name)[0]
            : item.selectedVariant?.name;
          const isDigital = isDigitalProgramItem(dbProduct || item);
          const isBundle = !isDigital && (parsed._isBundle || (item.name && String(item.name).toLowerCase().includes('pachet')));
          const effectiveImage = isDigital
            ? (item.image || item.selectedVariant?.image || '/images/products/program_complete_trio_v2.webp')
            : isBundle
              ? '/images/products/x10_elbow_wraps_purple.webp'
              : (item.selectedVariant?.image || (typeof item.image === 'string' && !item.image.includes('bundle') ? item.image : getSingleFlavorImage(variantName || item.name)));
          return {
            id: parsed._realId,
            slug: item.slug || dbProduct?.slug,
            bundleId: parsed._isBundle ? item.id : undefined,
            name: item.name,
            quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
            price,
            image: effectiveImage,
            is_digital: isDigital,
            specs_summary: dbProduct?.specs_summary || item.specs_summary,
            selectedVariant: item.selectedVariant || (variantName ? { name: variantName } : null),
          };
        }),
        priorityProcessing: priority_processing || false,
        giftPackaging: gift_packaging || false,
        giftMessage: gift_message ? String(gift_message).substring(0, 1000) : null
      };
      
      // 🛡️ Process order synchronously so serverless functions (Vercel) don't drop the background task
      console.log("⏳ Waiting for processing (db, packeta, email)...");
      await processOrder(orderDataForProcessing);
      console.log("✅ Processing completed.");
    } catch (processErr) {
      console.warn("⚠️ Warning: Order processing failed, but order was saved:", processErr);
    }

    // Răspuns cerut de formular (returnează { orderId } la redirect)
    return NextResponse.json({ success: true, orderId: uniqueOrderId });
  } catch (error: any) {
    console.error("❌ Eroare Backend COD:", error);
    return NextResponse.json({ error: error.message || "Eroare la procesarea comenzii ramburs." }, { status: 500 });
  }
}