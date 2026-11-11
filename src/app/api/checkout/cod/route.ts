import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { validateCoupon } from "@/app/actions/coupons";
import { calculateOrderTotal, CartItem } from "@/lib/cart-calculations";
import { verifyCsrfToken } from "@/lib/csrf";
import { rateLimiters, getClientIp, checkRateLimit } from "@/lib/ratelimit";
import { processOrder } from "@/lib/orders";
import type { OrderData } from "@/lib/orders";
import { getNextOrderNumber } from "@/lib/sequences";
import { completeCheckoutSession } from "@/app/actions/checkout-tracking";
import { getSingleFlavorImage } from "@/lib/product-images";
import { getServerExchangeRates, FALLBACK_RATES } from "@/utils/pricing";

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
    const body = await req.json();
    const {
      email, firstName, lastName, phone,
      line1, line2, city, state, postal_code, country,
      shipping_type, carrier_id, branch_id, branch_name,
      items, couponCode, locale = 'ro',
      priority_processing, gift_packaging, gift_message
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: locale === 'en' ? "Cart is empty." : "Coșul este gol." }, { status: 400 });
    }

    // Strict business rule: No mixed orders (preorder + in-stock) & Preorders require online payment
    const hasPreorder = items.some((item: any) => {
      const vName = typeof item.selectedVariant?.name === 'object'
        ? JSON.stringify(item.selectedVariant?.name)
        : String(item.selectedVariant?.name || '');
      const vLower = vName.toLowerCase();
      return (
        item.stock_status === 'preorder' ||
        item.is_preorder === true ||
        item.selectedVariant?.stock_status === 'preorder' ||
        vLower.includes('precomand') ||
        vLower.includes('pre-order') ||
        vLower.includes('preorder')
      );
    });
    const hasInStock = items.some((item: any) => {
      const vName = typeof item.selectedVariant?.name === 'object'
        ? JSON.stringify(item.selectedVariant?.name)
        : String(item.selectedVariant?.name || '');
      const vLower = vName.toLowerCase();
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

    if (hasPreorder && hasInStock) {
      return NextResponse.json(
        {
          error: locale === 'en'
            ? "Mixed orders (pre-order + in-stock) are not allowed. Please place pre-orders separately."
            : "Comenzile mixte (precomandă + stoc) nu sunt permise. Te rugăm să plasezi precomanda separat."
        },
        { status: 400 }
      );
    }

    if (hasPreorder) {
      return NextResponse.json(
        {
          error: locale === 'en'
            ? "Pre-orders require online card payment."
            : "Precomenzile necesită plată online cu cardul."
        },
        { status: 400 }
      );
    }

    // 3. Extragere prețuri REALE din baza de date (previne fraudarea prețului din frontend)
    // Handle bundle IDs: format is `<real-uuid>-bundle-<qty>` — strip suffix
    const BUNDLE_REGEX = /^(.+)-bundle-(\d+)$/;
    const processedItems = items.map((item: any) => {
      const match = item.id?.match(BUNDLE_REGEX);
      if (match) {
        return { ...item, _realId: match[1], _bundleQty: parseInt(match[2]), _isBundle: true };
      }
      return { ...item, _realId: item.id, _isBundle: false };
    });

    const itemIds = Array.from(new Set(processedItems.map((i: any) => i._realId)));
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
      throw new Error("Eroare la validarea produselor din baza de date.");
    }

    // 4. Generare matrice securizată pentru calcul total
    const calculationItems: CartItem[] = processedItems.map((clientItem: any) => {
      const dbProduct = dbProducts.find((p) => p.id === clientItem._realId || p.slug === clientItem._realId);
      if (!dbProduct) throw new Error(`Produs invalid: ${clientItem._realId}`);

      let price = Number(dbProduct.price_numeric);
      // Compute bundle discount strictly on the server (never trust client item.price)
      if (clientItem._isBundle && clientItem._bundleQty > 1) {
        const qty = Math.min(Math.max(1, Number(clientItem._bundleQty) || 1), 10);
        const bundleDiscountRon = Math.max(0, (Math.min(qty, 4) - 1) * 15);
        price = Math.max(price, (price * qty) - bundleDiscountRon);
      }

      return {
        id: clientItem.id, // Preserve original cart ID (e.g., UUID-bundle-X or just UUID) to allow finding it correctly later
        quantity: Math.max(1, Number(clientItem.quantity) || 1),
        weight: dbProduct.weight || 0.2,
        price
      };
    });

    // 5. Verificare și validare cupon de reducere (dacă e cazul)
    let couponData = null;
    if (couponCode) {
      const preResult = calculateOrderTotal(calculationItems, 'RON');
      try {
        const couponResult = await validateCoupon(couponCode, preResult.subtotal / 100, 'RON', locale);
        if (couponResult?.isValid && couponResult?.coupon) {
          couponData = couponResult.coupon;
        }
      } catch (e) {
        console.warn("Avertisment validare cupon COD:", e);
      }
    }

    // 6. Calcularea Finală a sumelor (produse + transport - reduceri)
    const options = { priority_processing, gift_packaging };
    const result = calculateOrderTotal(calculationItems, 'RON', country, shipping_type, couponData, carrier_id, options);

    // 7. Generare ID Unic Comandă Ramburs (Sequential: CHAMP-0017)
    const uniqueOrderId = await getNextOrderNumber();
    
    // 8. Creare obiect comandă pentru baza de date
    const orderPayload = {
      payment_intent_id: uniqueOrderId, // Salvăm ID-ul unic COD aici
      status: 'processing',
      payment_method: 'cod',
      subtotal: result.subtotal / 100,
      discount_total: (result.bundleDiscount + result.couponDiscount) / 100,
      total_amount: result.total / 100,
      shipping_amount: result.shippingCost / 100,
      coupon_id: couponData?.id || null,
      currency: 'RON',
      customer_email: email,
      customer_firstname: firstName,
      customer_lastname: lastName,
      customer_phone: phone,
      addr_line1: String(line1 || "").substring(0, 500),
      addr_line2: String(line2 || "").substring(0, 500),
      addr_city: String(city || "").substring(0, 500),
      addr_county: String(state || "").substring(0, 100),
      addr_zip: String(postal_code || "").substring(0, 100),
      addr_country: String(country || "").substring(0, 100),
      shipping_type: shipping_type,
      carrier_id,
      branch_id,
      branch_name,
      items: processedItems.map((clientItem: any) => {
        const secureCalcItem = calculationItems.find(c => c.id === clientItem.id);
        const variantName = typeof clientItem.selectedVariant?.name === 'object'
          ? (locale === 'en'
              ? (clientItem.selectedVariant.name.en || clientItem.selectedVariant.name.ro || Object.values(clientItem.selectedVariant.name)[0])
              : (clientItem.selectedVariant.name.ro || clientItem.selectedVariant.name.en || Object.values(clientItem.selectedVariant.name)[0]))
          : clientItem.selectedVariant?.name;
        const isBundle = String(clientItem.id).includes('-bundle-') || (clientItem.name && String(clientItem.name).toLowerCase().includes('pachet'));
        const effectiveImage = isBundle 
          ? '/images/products/x10_elbow_wraps_purple_1.webp' 
          : (clientItem.selectedVariant?.image || (typeof clientItem.image === 'string' && !clientItem.image.includes('bundle') ? clientItem.image : getSingleFlavorImage(variantName || clientItem.name)));
        return {
          ...clientItem,
          id: clientItem._realId, // Always use real UUID for DB
          price: secureCalcItem ? secureCalcItem.price : clientItem.price,
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
        locale: locale === 'en' ? 'en' : 'ro',
        ...(shipping_type === 'pudo' && branch_id ? { locker_id: String(branch_id) } : {}),
        ...(couponData?.code ? { coupon_code: couponData.code } : {})
      }
    };

    // 9. Salvare în Supabase
    const { error: insertError } = await supabaseAdmin.from('orders').insert(orderPayload);
    if (insertError) throw new Error(locale === 'en' ? `Database save failed: ${insertError.message}` : `Salvarea în baza de date a eșuat: ${insertError.message}`);

    // Mark checkout session as completed
    try {
      await completeCheckoutSession(null, email);
    } catch (trackErr) {
      console.warn("⚠️ [GDPR Abandoned Cart] Failed to mark COD session completed:", trackErr);
    }

    // 10. Trigger order processing (Packeta, Email, Invoice, etc.)
    try {
      const orderDataForProcessing: OrderData = {
        id: uniqueOrderId,
        date: new Date().toLocaleDateString(locale === 'en' ? 'en-US' : 'ro-RO'),
        currency: 'RON',
        locale: locale as 'ro' | 'en',
        total: result.total / 100,
        subtotal: result.subtotal / 100,
        discount: (result.bundleDiscount + result.couponDiscount) / 100,
        coupon_id: couponData?.id || null,
        paymentMethod: 'cod',
        shippingType: shipping_type as 'hd' | 'pudo',
        carrierId: String(carrier_id),
        shipping: result.shippingCost / 100,
        branchId: branch_id ? String(branch_id) : undefined,
        branchName: branch_name,
        customer: {
          firstName,
          lastName,
          email,
          phone,
          addr_line1: line1,
          addr_line2: line2,
          addr_city: city,
          addr_county: state,
          addr_zip: postal_code,
          addr_country: country,
        },
        itemsAlreadyInCurrency: true,
        items: items.map((item: any) => {
          // calculationItems use item.id as key (bundle id stays as-is: uuid-bundle-N)
          const secureCalcItem = calculationItems.find(c => c.id === item.id);
          const variantName = typeof item.selectedVariant?.name === 'object'
            ? item.selectedVariant.name.ro || Object.values(item.selectedVariant.name)[0]
            : item.selectedVariant?.name;
          const isBundle = String(item.id).includes('-bundle-') || (item.name && String(item.name).toLowerCase().includes('pachet'));
          const effectiveImage = isBundle 
            ? '/images/products/x10_elbow_wraps_purple_1.webp' 
            : (item.selectedVariant?.image || (typeof item.image === 'string' && !item.image.includes('bundle') ? item.image : getSingleFlavorImage(variantName || item.name)));
          const realId = String(item.id).includes('-bundle-') ? item.id.split('-bundle-')[0] : item.id;
          return {
            id: realId,
            bundleId: isBundle ? item.id : undefined,
            name: item.name,
            quantity: item.quantity,
            price: secureCalcItem ? secureCalcItem.price : (item.price || 0),
            image: effectiveImage,
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