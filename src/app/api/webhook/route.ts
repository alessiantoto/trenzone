import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { processOrder } from '@/lib/orders';
import { getNextOrderNumber } from '@/lib/sequences';
import { completeCheckoutSession } from '@/app/actions/checkout-tracking';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { rateLimiters, getClientIp, checkRateLimit } from '@/lib/ratelimit';
import { getProductPrice, getServerExchangeRates } from '@/utils/pricing';
import { resolveItemImage } from '@/lib/product-images';

// ✅ Increase timeout for Vercel Serverless (default 10s is too short for DB + Packeta + PDF + Email)
export const maxDuration = 60;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key', {
  apiVersion: '2025-02-24.acacia',
});

// The webhook secret is used in the POST handler
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

/**
 * Parse order_items from Stripe metadata - supports multiple formats
 */
function parseOrderItems(itemsRaw: string): any[] {
  if (!itemsRaw || itemsRaw === "[]" || itemsRaw === "none") return [];
  try {
    if (itemsRaw.includes('^^') || (itemsRaw.includes('|') && !itemsRaw.trim().startsWith('['))) {
      return itemsRaw.split('^^')
        .filter(p => p && p.includes('|'))
        .map(p => {
          const parts = p.split('|');
          return { i: parts[0] || 'UNKNOWN', q: parseInt(parts[1]) || 1, p: parseFloat(parts[2]) || 0, v: parts[3] || '', n: parts.slice(4).join('|') || 'Produs' };
        });
    } else if (itemsRaw.trim().startsWith('[')) {
      const temp = JSON.parse(itemsRaw);
      return Array.isArray(temp) ? temp : [];
    } else {
      return itemsRaw.split('|').filter(p => p && p.includes(':')).map(p => { const [id, qty] = p.split(':'); return { i: id, q: parseInt(qty) || 1 }; });
    }
  } catch (e) {
    console.error(`⚠️ Item parsing error: ${itemsRaw}`);
    return [];
  }
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { allowed } = await checkRateLimit(rateLimiters.webhook, ip, 'webhook');
  if (!allowed) {
    return NextResponse.json({ error: 'Too many webhook requests' }, { status: 429 });
  }

  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  // 📝 DIAGNOSTIC LOG
  console.log(`📥 [WEBHOOK] Received request (Signature: ${sig ? 'Yes' : 'No'})`);

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  if (!webhookSecret) {
    console.error("❌ [WEBHOOK] CRITICAL: STRIPE_WEBHOOK_SECRET is missing from environment variables!");
    return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET is not configured' }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error(`❌ [WEBHOOK] Signature verification failed! Error: ${err.message}`);
    console.error(`💡 Tip: Check if STRIPE_WEBHOOK_SECRET matches the one in Stripe Dashboard.`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    
    try {
      console.log(`🔔 Processing Succeeded PI: ${paymentIntent.id}`);
      
      // 🛡️ IDEMPOTENCY CHECK: Prevent duplicate order creation on Stripe retries
      const { data: existingOrder } = await supabaseAdmin
        .from('orders')
        .select('payment_intent_id, status')
        .eq('payment_intent_id', paymentIntent.id)
        .maybeSingle();
      
      if (existingOrder && existingOrder.status !== 'failed') {
        console.log(`⏭️ [WEBHOOK] Order for PI ${paymentIntent.id} already exists (status: ${existingOrder.status}). Skipping.`);
        return NextResponse.json({ received: true, skipped: 'already_processed' });
      }

      const metadata = paymentIntent.metadata || {};
      const customerEmail = paymentIntent.receipt_email || metadata.email || (paymentIntent as any).customer_email || "";
      
      // 📝 DIAGNOSTIC: Log ALL metadata keys to debug missing data
      console.log(`📋 [WEBHOOK] PI ${paymentIntent.id} metadata keys: ${Object.keys(metadata).join(', ')}`);
      await getServerExchangeRates();
      console.log(`📋 [WEBHOOK] receipt_email: ${paymentIntent.receipt_email}, metadata.email: ${metadata.email}`);
      console.log(`📋 [WEBHOOK] metadata.firstName: ${metadata.firstName}, metadata.lastName: ${metadata.lastName}`);
      console.log(`📋 [WEBHOOK] metadata.order_items: ${(metadata.order_items || '').substring(0, 200)}`);

      let firstName = metadata.firstName || "";
      let lastName = metadata.lastName || "";

      // 🛡️ FALLBACK: Name extraction from shipping object
      if (!firstName && !lastName && paymentIntent.shipping?.name) {
        const fullParts = paymentIntent.shipping.name.trim().split(/\s+/);
        if (fullParts.length > 0) {
          firstName = fullParts[0];
          lastName = fullParts.slice(1).join(" ") || firstName;
          console.log(`ℹ️ Extracted names from shipping: ${firstName} ${lastName}`);
        }
      }

      // 🛡️ FALLBACK: Robust Items Parsing (support multi-chunk metadata up to 2,000 chars)
      const itemsRaw = [
        metadata.order_items,
        metadata.order_items_2,
        metadata.order_items_3,
        metadata.order_items_4
      ].filter(Boolean).join('') || metadata.items || "";
      let parsedItems: any[] = parseOrderItems(itemsRaw);

      // 🛡️ BRUTAL RESILIENCE: Guarantee at least one item
      if (parsedItems.length === 0) {
        console.warn(`⚠️ Using placeholder for missing items in PI ${paymentIntent.id}`);
        parsedItems = [{ i: "UNKNOWN", q: 1 }];
      }

      const locale = (metadata.locale as 'ro' | 'en') || 'ro';
      const currency = paymentIntent.currency.toUpperCase();
      const ZERO_DECIMAL_CURRENCIES = ['JPY', 'KRW', 'BIF', 'CLP', 'PYG', 'VND', 'XAF', 'XOF', 'XPF'];
      const multiplier = ZERO_DECIMAL_CURRENCIES.includes(currency) ? 1 : 100;

      const orderNumber = await getNextOrderNumber();

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

      const orderData = {
        id: orderNumber,
        date: new Date().toLocaleDateString(locale === 'en' ? 'en-US' : 'ro-RO'),
        currency: currency,
        locale: locale,
        branchId: metadata.branch_id || '',
        branchName: metadata.branch_name || '',
        carrierId: metadata.carrier_id || 'packeta',
        shippingType: metadata.shipping_type || 'pudo',
        total: paymentIntent.amount / multiplier,
        subtotal: Number(metadata.subtotal) || (paymentIntent.amount / multiplier),
        discount: Number(metadata.discount || metadata.couponDiscount || 0) + Number(metadata.bundleDiscount || 0),
        cardDiscount: Number(metadata.cardDiscount || 0),
        shipping: Number(metadata.shippingCost || metadata.shipping || 0),
        coupon_id: (metadata.coupon_id && metadata.coupon_id !== 'none' && metadata.coupon_id !== 'null') ? metadata.coupon_id : (metadata.coupon && metadata.coupon !== 'none' && metadata.coupon !== 'null' ? metadata.coupon : null),
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
          addr_county: metadata.addr_county || metadata.state || paymentIntent.shipping?.address?.state || '',
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
        couponCode: (metadata.coupon && metadata.coupon !== 'none') ? metadata.coupon : undefined
      };

      console.log(`🚀 Processing Order ${orderData.id} for PI ${paymentIntent.id}...`);
      await processOrder(orderData as any);
      console.log(`✅ Order ${orderData.id} successfully finished.`);

      // Mark checkout session as completed
      try {
        await completeCheckoutSession(paymentIntent.id);
      } catch (trackErr) {
        console.warn("⚠️ [GDPR Abandoned Cart] Webhook failed to mark session completed:", trackErr);
      }

    } catch (err: any) {
      // 🚨 CRITICAL: Return 500 so Stripe retries this webhook (up to 3 attempts over ~48h)
      console.error(`❌ [CRITICAL FAIL] Webhook Logic for PI ${paymentIntent.id}: ${err.message}`);
      console.error(`❌ [CRITICAL FAIL] Stack:`, err.stack);
      return NextResponse.json(
        { error: `Order processing failed: ${err.message}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ received: true });
}
