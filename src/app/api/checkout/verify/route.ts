import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { processOrder } from '@/lib/orders';
import { getNextOrderNumber } from '@/lib/sequences';
import { completeCheckoutSession } from '@/app/actions/checkout-tracking';
import { getProductPrice, getServerExchangeRates } from '@/utils/pricing';
import { resolveItemImage } from '@/lib/product-images';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key', {
  apiVersion: '2025-02-24.acacia',
});

/**
 * Parse order_items from Stripe metadata - supports multiple formats
 */
function parseOrderItems(itemsRaw: string): any[] {
  if (!itemsRaw || itemsRaw === "[]" || itemsRaw === "none") return [];
  
  try {
    if (itemsRaw.includes('^^') || (itemsRaw.includes('|') && !itemsRaw.trim().startsWith('['))) {
      // New ultracompact format: id|qty|price|variant|name^^id|qty|price|variant|name
      return itemsRaw.split('^^')
        .filter(p => p && p.includes('|'))
        .map(p => {
          const parts = p.split('|');
          return {
            i: parts[0] || 'UNKNOWN',
            q: parseInt(parts[1]) || 1,
            p: parseFloat(parts[2]) || 0,
            v: parts[3] || '',
            n: parts.slice(4).join('|') || 'Produs'
          };
        });
    } else if (itemsRaw.trim().startsWith('[')) {
      // Legacy JSON format
      const temp = JSON.parse(itemsRaw);
      return Array.isArray(temp) ? temp : [];
    } else {
      // Very old compact format ID:QTY|ID:QTY
      return itemsRaw.split('|')
        .filter(p => p && p.includes(':'))
        .map(p => {
          const [id, qty] = p.split(':');
          return { i: id, q: parseInt(qty) || 1 };
        });
    }
  } catch (e) {
    console.error(`⚠️ Item parsing error: ${itemsRaw}`);
    return [];
  }
}

/**
 * Build orderData from paymentIntent metadata + DB lookup
 */
async function buildOrderData(paymentIntent: Stripe.PaymentIntent, orderNumber: string) {
  const metadata = paymentIntent.metadata || {};
  const customerEmail = paymentIntent.receipt_email || metadata.email || (paymentIntent as any).customer_email || "";
  let firstName = metadata.firstName || "";
  let lastName = metadata.lastName || "";

  if (!firstName && !lastName && paymentIntent.shipping?.name) {
    const fullParts = paymentIntent.shipping.name.trim().split(/\s+/);
    if (fullParts.length > 0) {
      firstName = fullParts[0];
      lastName = fullParts.slice(1).join(" ") || firstName;
    }
  }

  const itemsRaw = [
    metadata.order_items,
    metadata.order_items_2,
    metadata.order_items_3,
    metadata.order_items_4
  ].filter(Boolean).join('') || metadata.items || "";
  let parsedItems = parseOrderItems(itemsRaw);

  if (parsedItems.length === 0) {
    parsedItems = [{ i: "UNKNOWN", q: 1 }];
  }

  const locale = (metadata.locale as 'ro' | 'en') || 'ro';
  const currency = paymentIntent.currency.toUpperCase();
  const ZERO_DECIMAL_CURRENCIES = ['JPY', 'KRW', 'BIF', 'CLP', 'PYG', 'VND', 'XAF', 'XOF', 'XPF'];
  const multiplier = ZERO_DECIMAL_CURRENCIES.includes(currency) ? 1 : 100;

  const BUNDLE_REGEX = /^(.+)-bundle-(\d+)$/;
  const processedItems = parsedItems.map((i: any) => {
    const id = i.i || i.id || "UNKNOWN";
    const match = id.match(BUNDLE_REGEX);
    return { ...i, _realId: match ? match[1] : id, _isBundle: !!match, _bundleQty: match ? parseInt(match[2]) : 1 };
  });

  const itemIds = processedItems.map((i: any) => i._realId).filter((id: string) => id && id !== "UNKNOWN");
  let dbProducts: any[] = [];
  if (itemIds.length > 0) {
    const { data } = await supabaseAdmin.from('products').select('id, price_numeric, name, main_image, images, variants').in('id', itemIds);
    if (data) dbProducts = data;
  }

  return {
    id: orderNumber,
    date: new Date().toLocaleDateString(locale === 'en' ? 'en-US' : 'ro-RO'),
    currency,
    locale,
    branchId: metadata.branch_id || '',
    branchName: metadata.branch_name || '',
    carrierId: metadata.carrier_id || 'packeta',
    shippingType: metadata.shipping_type || 'pudo',
    total: paymentIntent.amount / multiplier,
    subtotal: Number(metadata.subtotal) || (paymentIntent.amount / multiplier),
    discount: Number(metadata.couponDiscount || metadata.discount || 0) + Number(metadata.bundleDiscount || 0),
    cardDiscount: Number(metadata.cardDiscount || 0),
    shipping: Number(metadata.shippingCost || metadata.shipping || 0),
    paymentMethod: 'online',
    paymentIntentId: paymentIntent.id,
    customer: {
      firstName: firstName || (locale === 'en' ? "[MISSING FIRST NAME]" : "[NUME LIPSĂ]"),
      lastName: lastName || (locale === 'en' ? "[MISSING LAST NAME]" : "[PRENUME LIPSĂ]"),
      email: customerEmail || (locale === 'en' ? "[MISSING EMAIL]" : "[EMAIL LIPSĂ]"),
      phone: (metadata.phone && metadata.phone !== 'none' && metadata.phone.trim() !== '') ? metadata.phone : (paymentIntent.shipping?.phone || ''),
      addr_line1: metadata.addr_line1 || metadata.line1 || paymentIntent.shipping?.address?.line1 || (locale === 'en' ? '[MISSING ADDRESS]' : '[ADRESĂ LIPSĂ]'),
      addr_line2: metadata.addr_line2 || metadata.line2 || paymentIntent.shipping?.address?.line2 || '',
      addr_city: metadata.addr_city || metadata.city || paymentIntent.shipping?.address?.city || '',
      addr_zip: metadata.addr_postal_code || metadata.postal_code || paymentIntent.shipping?.address?.postal_code || '',
      addr_county: metadata.addr_county || metadata.addr_state || metadata.state || paymentIntent.shipping?.address?.state || '',
      addr_country: metadata.addr_country || metadata.country || paymentIntent.shipping?.address?.country || 'RO',
    },
    itemsAlreadyInCurrency: true,
    items: processedItems.map((i: any) => {
      const id = i.i || i.id || "UNKNOWN";
      const dbProduct = dbProducts.find(p => p.id === i._realId);
      const bundleDiscountRon = Math.max(0, (Math.min(i._bundleQty || 1, 4) - 1) * 15);
      const fallbackPrice = dbProduct ? Math.max(0, (dbProduct.price_numeric * (i._bundleQty || 1)) - bundleDiscountRon) : 0;

      // Resolve name: prefer metadata name, fallback to DB name
      const dbName = dbProduct?.name;
      const resolvedDbName = typeof dbName === 'object' && dbName !== null
        ? (locale === 'en' ? (dbName['en'] || dbName['ro']) : (dbName['ro'] || dbName['en'])) || 'TrenZone Product'
        : (dbName || (locale === 'en' ? 'TrenZone Product' : 'Produs TrenZone'));
      const itemName = (i.n && i.n !== 'Produs' && i.n !== 'Product') ? i.n : resolvedDbName;

      // Resolve image: use resolveItemImage helper
      const itemImage = resolveItemImage({
        ...i,
        id,
        name: itemName,
        selectedVariant: i.v ? { name: i.v } : null,
        main_image: dbProduct?.main_image
      });

      // Resolve price in order currency
      const rawItemPrice = i.p ? Number(i.p) : fallbackPrice;
      const unitPrice = currency !== 'RON' ? getProductPrice(rawItemPrice, currency) : rawItemPrice;

      return {
        id,
        quantity: i.q || i.quantity || 1,
        price: unitPrice,
        name: itemName,
        image: itemImage,
        selectedVariant: i.v ? { name: i.v, image: itemImage } : null
      };
    }),
    priorityProcessing: metadata.priority_processing === "yes",
    giftPackaging: metadata.gift_packaging === "yes",
    giftMessage: metadata.gift_message || null,
    coupon_id: (metadata.coupon_id && metadata.coupon_id !== 'none' && metadata.coupon_id !== 'null') ? metadata.coupon_id : (metadata.coupon && metadata.coupon !== 'none' && metadata.coupon !== 'null' ? metadata.coupon : null),
    couponCode: (metadata.coupon && metadata.coupon !== 'none') ? metadata.coupon : undefined
  };
}

/**
 * Verify payment intent status before redirecting user to success page
 */
export async function POST(req: Request) {
  try {
    await getServerExchangeRates();
    const { clientSecret } = await req.json();

    if (!clientSecret) {
      return NextResponse.json({ error: "Missing clientSecret" }, { status: 400 });
    }

    let paymentIntentId: string;
    let secretPart = '';
    if (clientSecret.includes('_secret_')) {
      const parts = clientSecret.split('_secret_');
      paymentIntentId = parts[0];
      secretPart = parts[1] || '';
    } else {
      paymentIntentId = clientSecret;
    }

    let paymentIntent: Stripe.PaymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (stripeErr: any) {
      // PI not found or invalid (e.g. user closed Stripe and paid COD instead)
      console.warn(`[VERIFY] Could not retrieve PI ${paymentIntentId}:`, stripeErr.message);
      return NextResponse.json({ paymentIntent: { status: 'canceled' } }, { status: 200 });
    }

    // Verify full client_secret when provided to prevent unauthorized PI probing
    if (secretPart && paymentIntent.client_secret && paymentIntent.client_secret !== clientSecret) {
      return NextResponse.json({ error: "Invalid client secret" }, { status: 403 });
    }

    const isPaymentValid = paymentIntent.status === 'succeeded' ||
                          paymentIntent.status === 'processing';

    if (isPaymentValid) {
      const { data: order } = await supabaseAdmin
        .from('orders')
        .select('receipt_url')
        .eq('payment_intent_id', paymentIntent.id)
        .maybeSingle();

      let displayId = order?.receipt_url?.split('/').slice(-2, -1)[0] || paymentIntent.id;

      // 🛡️ FALLBACK: If webhook hasn't run yet, wait 3s then check again before creating
      if (!order && paymentIntent.status === 'succeeded') {
        // Give webhook 3 seconds to process
        await new Promise(resolve => setTimeout(resolve, 3000));

        const { data: recheckOrder } = await supabaseAdmin
          .from('orders')
          .select('receipt_url')
          .eq('payment_intent_id', paymentIntent.id)
          .maybeSingle();

        if (recheckOrder) {
          // Webhook already created it - use that order, no duplicate
          console.log(`[VERIFY] Webhook processed order during wait. Skipping fallback creation.`);
          displayId = recheckOrder?.receipt_url?.split('/').slice(-2, -1)[0] || paymentIntent.id;
        } else {
          // Webhook failed or too slow - create order now as fallback
          console.log(`[VERIFY FALLBACK] Creating order for PI ${paymentIntent.id}...`);
          try {
            const orderNumber = await getNextOrderNumber();
            const orderData = await buildOrderData(paymentIntent, orderNumber);
            await processOrder(orderData as any);
            await completeCheckoutSession(paymentIntent.id).catch(() => {});
            displayId = orderNumber;
          } catch (fallbackErr) {
            console.error("❌ [VERIFY FALLBACK] Failed to create order:", fallbackErr);
          }
        }
      }

      return NextResponse.json({
        success: true,
        paymentIntent: {
          id: displayId,
          stripeId: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        },
      });
    }

    return NextResponse.json({
      success: false,
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
      },
      error: `Payment status: ${paymentIntent.status}`,
    }, { status: 400 });

  } catch (error: any) {
    console.error("❌ Payment verification error:", error);
    return NextResponse.json(
      { error: error.message || "Verification failed" },
      { status: 500 }
    );
  }
}
