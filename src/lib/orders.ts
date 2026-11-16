import { supabaseAdmin } from './supabase-admin';
import { generateInvoicePdf } from './invoice';
import { sendOrderConfirmationEmail, sendProgramDeliveryEmail } from './resend-service';
import { resolveOrderedPrograms, isDigitalProgramItem } from './programs';
import { createPacketaParcel } from './packeta-api';
import { createSamedayAwb } from './sameday-api';
import { getProductPrice, getServerExchangeRates } from '@/utils/pricing';
import { resolveItemImage } from './product-images';
import { issueOblioInvoice, isOblioEnabled } from './oblio-api';

export interface OrderData {
  id: string; // Internal/Display ID
  date: string;
  currency: string;
  total: number;
  subtotal: number;
  discount: number;
  cardDiscount?: number;
  coupon_id?: string | null;
  couponCode?: string;
  locale: 'ro' | 'en';
  paymentMethod: 'online' | 'cod';
  shippingType: 'hd' | 'pudo';
  carrierId: string;
  shipping: number;
  branchId?: string;
  branchName?: string;
  paymentIntentId?: string;
  status?: string; // 🛡️ Status override for fail-safe logic
  priorityProcessing?: boolean;
  giftPackaging?: boolean;
  giftMessage?: string | null;
  itemsAlreadyInCurrency?: boolean;
  stripeReceiptNumber?: string | null;
  stripeChargeId?: string | null;
  isPreorderAtOrder?: boolean;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    addr_line1: string;
    addr_line2?: string;
    addr_city: string;
    addr_zip: string;
    addr_county?: string;
    addr_country: string;
  };
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    image?: string;
  }>;
}

/**
 * Saves the order to the Supabase 'orders' table.
 */
async function saveOrderToDb(order: OrderData, trackingNumber?: string): Promise<{ isDuplicateRace: boolean }> {
  console.log(`💾 [ORDER DB] Saving Order #${order.id} to Supabase...`);
  
  try {
    // Check deterministically with limit(1).maybeSingle() before INSERT/UPDATE
    const paymentId = order.paymentIntentId || order.id;
    const { data: existingOrder } = await supabaseAdmin
      .from('orders')
      .select('id, receipt_url, carrier_metadata, tracking_number')
      .eq('payment_intent_id', paymentId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    // Ensure coupon_id is a valid UUID before saving to DB
    let resolvedCouponId: string | null = null;
    const rawCoupon = (order.coupon_id || order.couponCode || '').trim();
    if (rawCoupon && rawCoupon !== 'none' && rawCoupon !== 'null' && rawCoupon !== 'undefined') {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawCoupon);
      if (isUuid) {
        resolvedCouponId = rawCoupon;
      } else {
        const { data: matchedCoupon } = await supabaseAdmin
          .from('coupons')
          .select('id')
          .ilike('code', rawCoupon)
          .limit(1)
          .maybeSingle();
        if (matchedCoupon?.id) {
          resolvedCouponId = matchedCoupon.id;
        }
      }
    }

    const existingCarrierMeta = (existingOrder?.carrier_metadata || {}) as Record<string, any>;
    const couponAlreadyIncremented = Boolean(existingCarrierMeta.coupon_usage_incremented);
    const shouldIncrementCoupon = Boolean(resolvedCouponId) && (!existingOrder?.id || !couponAlreadyIncremented);

    const mergedCarrierMetadata: Record<string, any> = {
      ...existingCarrierMeta,
      shipping_cost: order.shipping,
      card_discount: order.cardDiscount ?? existingCarrierMeta.card_discount ?? 0,
      locale: order.locale || existingCarrierMeta.locale || 'ro',
      order_number: existingCarrierMeta.order_number || order.id,
      ...(resolvedCouponId ? { coupon_usage_incremented: true } : {}),
      ...(order.shippingType === 'pudo' && order.branchId ? { locker_id: String(order.branchId) } : {}),
      ...(typeof order.isPreorderAtOrder === 'boolean' && existingCarrierMeta.is_preorder === undefined
        ? { is_preorder: order.isPreorderAtOrder }
        : {}),
      ...(order.couponCode ? { coupon_code: order.couponCode } : {}),
      ...(order.stripeReceiptNumber ? { stripe_receipt_number: order.stripeReceiptNumber } : {}),
      ...(order.stripeChargeId ? { stripe_charge_id: order.stripeChargeId } : {}),
    };

    const payload = {
      payment_intent_id: paymentId,
      subtotal: order.subtotal,
      discount_total: order.discount,
      total_amount: order.total,
      shipping_amount: order.shipping,
      coupon_id: resolvedCouponId,
      currency: order.currency.toUpperCase(),
      status: order.status || 'processing',
      payment_method: order.paymentMethod,
      shipping_type: order.shippingType,
      carrier_id: order.carrierId,
      branch_id: order.branchId || null,
      branch_name: order.branchName || null,
      customer_firstname: order.customer.firstName,
      customer_lastname: order.customer.lastName,
      customer_email: order.customer.email,
      customer_phone: order.customer.phone,
      addr_line1: order.customer.addr_line1,
      addr_line2: order.customer.addr_line2 || null,
      addr_city: order.customer.addr_city,
      addr_county: order.customer.addr_county || null,
      addr_zip: order.customer.addr_zip,
      addr_country: order.customer.addr_country,
      items: order.items,
      tracking_number: trackingNumber || existingOrder?.tracking_number || null,
      priority_processing: order.priorityProcessing || false,
      gift_packaging: order.giftPackaging || false,
      gift_message: order.giftMessage || null,
      receipt_url: existingOrder?.receipt_url || `/api/admin/orders/${order.id}/invoice`,
      carrier_metadata: mergedCarrierMetadata,
      updated_at: new Date().toISOString()
    };

    let saveError;
    let isNewInsert = false;
    if (existingOrder?.id) {
      console.log(`📝 [ORDER DB] Updating existing order: ${paymentId}`);
      const { error } = await supabaseAdmin
        .from('orders')
        .update(payload)
        .eq('id', existingOrder.id);
      saveError = error;
    } else {
      isNewInsert = true;
      console.log(`🆕 [ORDER DB] Inserting new order: ${paymentId}`);
      const { error } = await supabaseAdmin
        .from('orders')
        .insert({
          ...payload,
          created_at: new Date().toISOString()
        });

      // Handle Postgres unique_violation (23505) race gracefully via fallback UPDATE
      if (error && (error.code === '23505' || String(error.message || '').toLowerCase().includes('duplicate key'))) {
        console.warn(`⚠️ [ORDER DB] Duplicate key 23505 on ${paymentId}, falling back to update.`);
        isNewInsert = false;
        const { data: raceRow } = await supabaseAdmin
          .from('orders')
          .select('id, receipt_url, carrier_metadata, tracking_number')
          .eq('payment_intent_id', paymentId)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (raceRow?.id) {
          const existingRaceMeta = (raceRow.carrier_metadata || {}) as Record<string, any>;
          const raceMeta = {
            ...existingRaceMeta,
            ...mergedCarrierMetadata,
            order_number: existingRaceMeta.order_number || mergedCarrierMetadata.order_number,
          };
          const { error: fallbackErr } = await supabaseAdmin
            .from('orders')
            .update({
              ...payload,
              receipt_url: raceRow.receipt_url || payload.receipt_url,
              tracking_number: raceRow.tracking_number || payload.tracking_number,
              carrier_metadata: raceMeta,
            })
            .eq('id', raceRow.id);
          saveError = fallbackErr;
        } else {
          saveError = error;
        }
      } else {
        saveError = error;
      }
    }

    if (saveError) {
      console.error('❌ [ORDER DB] Data persistence error:', saveError);
      throw saveError;
    }

    // Increment coupon usage strictly once (either initial insert, or existing row e.g. COD without coupon_usage_incremented)
    const isDuplicateRace = existingOrder?.id === undefined && !isNewInsert;
    if (shouldIncrementCoupon && !isDuplicateRace && resolvedCouponId) {
       const { error: rpcError } = await supabaseAdmin.rpc('increment_coupon_usage', { coupon_id: resolvedCouponId });
       
       if (rpcError) {
         console.warn('⚠️ [ORDER DB] RPC increment failed, using fallback:', rpcError.message);
         const { data: c } = await supabaseAdmin
           .from('coupons')
           .select('used_count')
           .eq('id', resolvedCouponId)
           .limit(1)
           .maybeSingle();
         if (c) {
           await supabaseAdmin
             .from('coupons')
             .update({ used_count: (c.used_count || 0) + 1 })
             .eq('id', resolvedCouponId);
         }
       }
    }
    
    console.log('✅ [ORDER DB] Order successfully saved in Supabase.');
    return { isDuplicateRace };
  } catch (err) {
    console.error('❌ [ORDER DB] Failed to persist order:', err instanceof Error ? err.message : err);
    // We log but don't strictly halt the process if DB fails after payment, 
    // although for the user's objective, this is critical.
    throw err;
  }
}

const activeOrderLocks = new Map<string, Promise<{ success: boolean; deduplicated?: boolean; error?: string }>>();

function formatErrorMessage(err: any): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err && err.message) return String(err.message);
  if (typeof err === 'object' && err !== null) {
    try { return JSON.stringify(err); } catch { return String(err); }
  }
  return String(err);
}

async function recordNonFatalCommError(paymentId: string, errorText: string): Promise<void> {
  try {
    const { data: curOrd } = await supabaseAdmin
      .from('orders')
      .select('id, carrier_metadata')
      .eq('payment_intent_id', paymentId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!curOrd?.id) return;
    const prevMeta = (curOrd.carrier_metadata || {}) as Record<string, any>;
    await supabaseAdmin
      .from('orders')
      .update({
        carrier_metadata: {
          ...prevMeta,
          last_comm_error: `${errorText.substring(0, 400)} (${new Date().toISOString()})`,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', curOrd.id);
  } catch (diagErr) {
    console.warn('⚠️ [PROCESS ORDER] Could not record last_comm_error:', diagErr);
  }
}

/**
 * Common order processor for both Stripe (Online) and COD (Ramburs)
 */
export async function processOrder(
  orderData: OrderData
): Promise<{ success: boolean; deduplicated?: boolean; error?: string }> {
  const lockKey = orderData.paymentIntentId || orderData.id;
  const existingLock = activeOrderLocks.get(lockKey);
  if (existingLock) {
    console.log(`🔒 [ORDER LOCK] Awaiting in-flight processing for ${lockKey}...`);
    return existingLock;
  }

  const runPromise = (async (): Promise<{ success: boolean; deduplicated?: boolean; error?: string }> => {
    const groupLabel = `🛒 Order #${orderData.id} lifecycle`;
    console.group(groupLabel);
    console.time(groupLabel);

    try {
      // Idempotency guard against concurrent Webhook / Verify execution
      if (orderData.paymentMethod === 'online' && orderData.paymentIntentId) {
        const { data: existingCompleted } = await supabaseAdmin
          .from('orders')
          .select('id, status, carrier_metadata')
          .eq('payment_intent_id', orderData.paymentIntentId)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (existingCompleted && existingCompleted.status !== 'failed') {
          const prevMeta = (existingCompleted.carrier_metadata || {}) as Record<string, any>;
          const nextMeta = { ...prevMeta };
          let needsBackfill = false;

          if (orderData.stripeReceiptNumber && !prevMeta.stripe_receipt_number) {
            nextMeta.stripe_receipt_number = orderData.stripeReceiptNumber;
            needsBackfill = true;
          }
          if (orderData.stripeChargeId && !prevMeta.stripe_charge_id) {
            nextMeta.stripe_charge_id = orderData.stripeChargeId;
            needsBackfill = true;
          }

          if (needsBackfill) {
            await supabaseAdmin
              .from('orders')
              .update({ carrier_metadata: nextMeta, updated_at: new Date().toISOString() })
              .eq('id', existingCompleted.id);
          }

          console.log(`⏭️ [PROCESS ORDER] Online order for PI ${orderData.paymentIntentId} already processed. Skipping duplicate invoice/email.`);
          console.timeEnd(groupLabel);
          console.groupEnd();
          return { success: true, deduplicated: true };
        }
      }

    // 🛡️ GLOBAL LOGGING (Console only for production stability)
    console.log(`🚀 STARTING PROCESS ORDER: ${orderData.id}`);
    await getServerExchangeRates();

    // 0. Fetch Physical Data for accurate AWB
    const BUNDLE_REGEX = /^(.+)-bundle-(\d+)$/;
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const itemIds = Array.from(
      new Set(
        orderData.items
          .map((i: any) => {
            const match = i.id?.match(BUNDLE_REGEX);
            return match ? match[1] : i.id;
          })
          .filter((id: any) => typeof id === 'string' && UUID_REGEX.test(id))
      )
    );
    const { data: physicalData } = itemIds.length > 0
      ? await supabaseAdmin
          .from('products')
          .select('id, slug, name, price, price_numeric, weight, length_mm, width_mm, height_mm, main_image, images, variants, specs_summary')
          .in('id', itemIds)
      : { data: [] as any[] };

    // 🛡️ STRICT PHASE 0.5: Sanitize & validate items globally before DB save
    const rawItemsSum = (orderData.items || []).reduce(
      (sum: number, it: any) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 1),
      0
    );
    const isAlreadyConverted = orderData.itemsAlreadyInCurrency === true || Math.abs(rawItemsSum - (Number(orderData.subtotal) || 0)) < 0.5;

    orderData.items = orderData.items.map((item: any) => {
      const match = item.id?.match(BUNDLE_REGEX);
      const isBundle = !!match || String(item.name || '').toLowerCase().includes('pachet') || String(item.name || '').toLowerCase().includes('bundle');
      const realId = match ? match[1] : item.id;
      const p = physicalData?.find(d => d.id === realId);
      
      // Ensure variant is initialized if it exists
      const variantObj = item.selectedVariant || (item.variant ? { name: item.variant } : null);
      
      let displayName = item.name;
      if (!displayName || displayName === "Produs" || displayName === "UNKNOWN") {
        displayName = p?.name || "Produs TrenZone";
      }

      if (typeof displayName === 'object' && displayName !== null) {
        displayName = displayName[orderData.locale] || displayName['ro'] || displayName['en'] || "Produs";
      }

      // Ensure price uses price_numeric (the correct numeric column)
      let finalPrice = Number(item.price);
      if (isNaN(finalPrice) || finalPrice <= 0) {
        finalPrice = p?.price_numeric ? Number(p.price_numeric) : 0;
      }

      // Convert from base RON to target order currency if needed
      if (orderData.currency && orderData.currency !== 'RON' && !isAlreadyConverted) {
        finalPrice = getProductPrice(finalPrice, orderData.currency);
      }

      // Extract variant image for single products
      let variantImage = '';
      if (!isBundle) {
        if (variantObj?.image) {
          variantImage = variantObj.image;
        } else if (variantObj?.name && p) {
          const loc = orderData.locale || 'ro';
          const variantNameStr = typeof variantObj.name === 'object'
            ? (variantObj.name[loc] || variantObj.name.ro || variantObj.name.en || Object.values(variantObj.name)[0])
            : variantObj.name;
          
          // Check variants from DB
          const variantsData = typeof p.variants === 'string' ? JSON.parse(p.variants) : p.variants;
          if (variantsData?.options) {
            const opt = variantsData.options.find((o: any) => {
              const oRo = typeof o.name === 'object' ? o.name.ro : o.name;
              const oEn = typeof o.name === 'object' ? o.name.en : o.name;
              const oFirst = typeof o.name === 'object' ? Object.values(o.name)[0] : o.name;
              return [oRo, oEn, oFirst].some((cand) =>
                cand && (
                  cand === variantNameStr ||
                  (variantNameStr && String(variantNameStr).includes(String(cand))) ||
                  (item.name && String(item.name).includes(String(cand)))
                )
              );
            });
            if (opt) {
              if (opt.image) variantImage = opt.image;
              else if (typeof opt.imageIndex === 'number' && p.images && p.images[opt.imageIndex]) {
                variantImage = p.images[opt.imageIndex];
              }
            }
          }
        }
      }

      let finalNameStr = String(displayName);
      if (variantObj?.name) {
          const loc = orderData.locale || 'ro';
          const vName = typeof variantObj.name === 'object'
            ? (variantObj.name[loc] || variantObj.name.ro || variantObj.name.en || Object.values(variantObj.name)[0])
            : variantObj.name;
          if (vName && !finalNameStr.includes(vName)) {
             finalNameStr = `${finalNameStr} (${vName})`;
          }
      }

      const finalImage = resolveItemImage({
        ...item,
        name: finalNameStr,
        selectedVariant: variantObj ? { ...variantObj, image: variantImage } : null,
        image: variantImage || item.image || p?.main_image
      });

      return { 
        ...item, 
        id: realId,
        bundleId: match ? item.id : item.bundleId,
        name: finalNameStr, 
        price: finalPrice, 
        image: finalImage, 
        slug: item.slug || p?.slug || '',
        is_digital: Boolean(item.is_digital || p?.specs_summary?.is_digital || isDigitalProgramItem(p || item)),
        specs_summary: p?.specs_summary || item.specs_summary,
        selectedVariant: variantObj ? {
          ...variantObj,
          image: variantImage || finalImage
        } : null 
      };
    });

    let totalWeightKg = 0;
    let maxL = 0;
    let maxW = 0;
    let sumH = 0;

    orderData.items.forEach((item: any) => {
      if (isDigitalProgramItem(item)) return;
      const bundleMatch = String(item.bundleId || item.id || '').match(BUNDLE_REGEX);
      const realItemId = bundleMatch ? bundleMatch[1] : item.id;
      const bundleMultiplier = bundleMatch ? Math.max(1, parseInt(bundleMatch[2], 10)) : 1;
      const p = physicalData?.find(d => d.id === realItemId);
      if (isDigitalProgramItem(p)) return;
      const weight = (p?.weight || 0.2) * bundleMultiplier;
      const l = p?.length_mm || 150;
      const w = p?.width_mm || 100;
      const h = p?.height_mm || 50;

      totalWeightKg += weight * item.quantity;
      if (l > maxL) maxL = l;
      if (w > maxW) maxW = w;
      sumH += h * bundleMultiplier * item.quantity;
    });

    // Handle fallbacks for Packeta validation (Minimums)
    if (totalWeightKg <= 0) totalWeightKg = 0.5;
    if (maxL < 150) maxL = 150;
    if (maxW < 100) maxW = 100;
    if (sumH < 50) sumH = 50;

    // 🛡️ SMART SHIPPING ROUTER: Determine correct addressId and carrierPickupPoint
    // Scenario 1: Internal Packeta Branch (carrierId is 'packeta' or 0)
    // Scenario 2: External Carrier PUDO/Locker (addressId = carrier, point = branchId)
    // Scenario 3: Home Delivery (addressId = carrier, point = OMITTED)
    
    let finalAddressId = orderData.carrierId;
    let finalPickupPoint = orderData.branchId;

    if (orderData.shippingType === 'hd') {
      // Home Delivery: NEVER send a pickup point, even if one was left in state
      console.log('🚚 [ROUTER] Home Delivery detected. Omiting pickup point.');
      finalAddressId = orderData.carrierId;
      finalPickupPoint = undefined;
    } else if (orderData.carrierId === 'packeta' || orderData.carrierId === '0') {
      // Internal Packeta Branch: addressId IS the branchId
      console.log('📦 [ROUTER] Internal Packeta PUDO detected.');
      finalAddressId = orderData.branchId || 'packeta';
      finalPickupPoint = undefined;
    } else {
      // External Carrier (FAN Box, Easybox, etc.)
      console.log(`🏢 [ROUTER] External Carrier PUDO detected: ${orderData.carrierId}`);
      finalAddressId = orderData.carrierId;
      finalPickupPoint = orderData.branchId;
    }

    // Snapshot preorder flag at order time
    const isPreorderOrder = orderData.isPreorderAtOrder === true || orderData.status === 'preorder' || (orderData.items || []).some((it: any) => {
      if (it?.stock_status === 'preorder' || it?.is_preorder === true || it?.selectedVariant?.stock_status === 'preorder') {
        return true;
      }
      const vName = typeof it.selectedVariant?.name === 'object' ? JSON.stringify(it.selectedVariant.name) : String(it.selectedVariant?.name || it.variant || it.name || '');
      return /(precomand|preorder|pre-order)/i.test(vName);
    });
    const initialStatus = isPreorderOrder ? 'preorder' : 'processing';

    const hasMissingEmail = !orderData.customer.email || orderData.customer.email.includes('[LIPSĂ]');
    const hasMissingAddressOrName =
      !orderData.customer.firstName || orderData.customer.firstName.includes('[LIPSĂ]') ||
      !orderData.customer.addr_line1 || orderData.customer.addr_line1.includes('[LIPSĂ]');

    if (hasMissingEmail) orderData.customer.email = 'lipsa-email@trenzone.fit';
    if (!orderData.customer.firstName || orderData.customer.firstName.includes('[LIPSĂ]')) {
      orderData.customer.firstName = '[NUME LIPSĂ]';
    }
    if (!orderData.customer.lastName) {
      orderData.customer.lastName = '[PRENUME LIPSĂ]';
    }
    if (!orderData.customer.addr_line1 || orderData.customer.addr_line1.includes('[LIPSĂ]')) {
      orderData.customer.addr_line1 = '[ADRESĂ LIPSĂ]';
    }

    const paymentIdKey = orderData.paymentIntentId || orderData.id;

    // 2. [PRIORITY 1] ALWAYS save the order in DB FIRST — never lose a paid order
    let dbSaveResult: { isDuplicateRace: boolean } = { isDuplicateRace: false };
    try {
      console.log('💾 [PHASE 1] Initial DB Save (Safety First)...');
      dbSaveResult = await saveOrderToDb(
        {
          ...orderData,
          status: initialStatus,
          isPreorderAtOrder: isPreorderOrder,
        } as OrderData,
        undefined
      );
      console.log('✅ [PHASE 1] SUCCESS: Order persisted in DB.');
    } catch (dbErr) {
      console.error('❌ [PHASE 1] CRITICAL: Initial DB Save failed!', dbErr);
      throw dbErr;
    }

    if (dbSaveResult.isDuplicateRace && orderData.paymentMethod === 'online') {
      console.log(`⏭️ [PROCESS ORDER] Lost 23505 race for PI ${paymentIdKey}; skipping duplicate invoice/email.`);
      console.timeEnd(groupLabel);
      console.groupEnd();
      return { success: true, deduplicated: true };
    }

    // Internal per-model/size soft inventory tracking (never blocks checkout or fulfillment at 0)
    try {
      const { decrementProductStockForOrder } = await import('./variant-stock-server');
      await decrementProductStockForOrder(orderData.id, orderData.items);
    } catch (stockErr) {
      console.warn('⚠️ [VARIANT STOCK] Non-fatal stock decrement warning:', stockErr);
    }

    if (hasMissingEmail || hasMissingAddressOrName) {
      await recordNonFatalCommError(
        paymentIdKey,
        'Date client/adresa incomplete la checkout — verifica comanda in Admin inainte de expediere.'
      );
      if (hasMissingEmail) {
        console.timeEnd(groupLabel);
        console.groupEnd();
        return { success: true };
      }
    }

    // 3. [OPTIONAL PHASE 2] Generate AWB (DISABLED - MOVED TO MANUAL)
    const barcode = null;

    // 4. [OPTIONAL PHASE 3 & 4] Generate PDF, Oblio Invoice & Confirmation Email (ALL NON-FATAL FOR PAID ORDER STATUS)
    const commErrors: string[] = [];
    let pdfBuffer: Buffer | undefined = undefined;

    try {
      console.log('📄 [PHASE 3] Generating Invoice PDF...');
      const enrichedItems = (orderData.items || []).map((item: any) => {
        let name = typeof item.name === 'object'
          ? (item.name[orderData.locale || 'ro'] || item.name['ro'] || item.name['en'] || 'Produs')
          : (item.name || 'Produs');

        const variantRaw = item.selectedVariant?.name || (item as any).variant || null;
        const variantStr = typeof variantRaw === 'object' && variantRaw !== null
          ? (variantRaw[orderData.locale || 'ro'] || variantRaw['ro'] || variantRaw['en'] || Object.values(variantRaw as any)[0] || '')
          : (variantRaw || '');

        const hasVariantInName = variantStr && (
          name.includes(`(${variantStr})`) ||
          name.toLowerCase().includes(`(${variantStr.toLowerCase()})`)
        );

        if (variantStr && !hasVariantInName) {
          name = `${name} (${variantStr})`;
        }

        return { ...item, name, image: '' };
      });

      const legacyOrderData = {
        ...orderData,
        discountCode: orderData.couponCode || null,
        items: enrichedItems,
        trackingNumber: barcode || undefined,
        customer: {
          ...orderData.customer,
          name: `${orderData.customer.firstName} ${orderData.customer.lastName}`.trim(),
          address: `${orderData.customer.addr_line1}, ${orderData.customer.addr_city}, ${orderData.customer.addr_zip}, ${orderData.customer.addr_country}`
        }
      };
      pdfBuffer = await generateInvoicePdf(legacyOrderData);
      console.log('✅ [PHASE 3] Success: PDF generated');
    } catch (pdfErr: any) {
      const msg = formatErrorMessage(pdfErr);
      console.error('⚠️ [PHASE 3] PDF Generation Warning (non-fatal):', msg);
      commErrors.push(`PDF: ${msg}`);
    }

    // Oblio & ANAF SPV auto-invoicing with DB idempotency guard + Admin toggle
    try {
      if (await isOblioEnabled()) {
        const { data: curOrd } = await supabaseAdmin
          .from('orders')
          .select('id, tracking_metadata, carrier_metadata')
          .eq('payment_intent_id', paymentIdKey)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        const existingMeta = (curOrd?.tracking_metadata || {}) as Record<string, any>;
        const existingCarrier = (curOrd?.carrier_metadata || {}) as Record<string, any>;
        const alreadyInvoiced = Boolean(existingMeta?.oblio_invoice?.number || existingCarrier?.oblio_invoice?.number);

        if (alreadyInvoiced) {
          const inv = existingMeta?.oblio_invoice || existingCarrier?.oblio_invoice;
          console.log(`⏭️ [OBLIO AUTO] Factura Oblio există deja (${inv.seriesName} ${inv.number}). Skipping.`);
        } else {
          console.log(`🧾 [OBLIO AUTO] Emitem automat factura în Oblio pentru comanda #${orderData.id}...`);
          const oblioOrderPayload = {
            id: orderData.id,
            payment_intent_id: paymentIdKey,
            receipt_url: `/api/admin/orders/${orderData.id}/invoice`,
            total_amount: orderData.total,
            shipping_cost: orderData.shipping,
            currency: orderData.currency || 'RON',
            payment_method: orderData.paymentMethod,
            customer_firstname: orderData.customer.firstName,
            customer_lastname: orderData.customer.lastName,
            customer_email: orderData.customer.email,
            customer_phone: orderData.customer.phone,
            addr_line1: orderData.customer.addr_line1,
            addr_line2: orderData.customer.addr_line2,
            addr_city: orderData.customer.addr_city,
            addr_county: orderData.customer.addr_county,
            addr_zip: orderData.customer.addr_zip,
            addr_country: orderData.customer.addr_country,
            items: orderData.items,
            discount_total: orderData.discount,
            priority_processing: orderData.priorityProcessing,
            gift_packaging: orderData.giftPackaging,
            carrier_metadata: {
              ...existingCarrier,
              shipping_cost: orderData.shipping,
              card_discount: orderData.cardDiscount || 0,
              ...(orderData.couponCode ? { coupon_code: orderData.couponCode } : {})
            }
          };

          const oblioRes = await issueOblioInvoice(oblioOrderPayload);
          if (oblioRes.success && curOrd?.id) {
            console.log(`✅ [OBLIO AUTO] Factura ${oblioRes.seriesName} ${oblioRes.number} a fost emisă și trimisă în SPV!`);
            await supabaseAdmin
              .from('orders')
              .update({
                tracking_metadata: {
                  ...existingMeta,
                  oblio_invoice: {
                    seriesName: oblioRes.seriesName,
                    number: oblioRes.number,
                    link: oblioRes.link,
                    einvoiceStatus: oblioRes.einvoiceStatus,
                    emittedAt: new Date().toISOString(),
                    automatic: true,
                  },
                },
              })
              .eq('id', curOrd.id);
          } else if (!oblioRes.success) {
            console.warn('⚠️ [OBLIO AUTO] Atenție la emiterea automată în Oblio:', oblioRes.error);
            commErrors.push(`Oblio: ${oblioRes.error || 'Eroare emitere'}`);
          }
        }
      }
    } catch (oblioErr: any) {
      const msg = formatErrorMessage(oblioErr);
      console.error('⚠️ [OBLIO AUTO] Eroare la emiterea automată în Oblio (non-fatal):', msg);
      commErrors.push(`Oblio: ${msg}`);
    }

    if (orderData.customer.email && !orderData.customer.email.includes('lipsa-email@')) {
      try {
        console.log('📧 [PHASE 4] Sending confirmation email...');
        await sendOrderConfirmationEmail(orderData.customer.email, {
          ...orderData,
          customer: {
            ...orderData.customer,
            name: `${orderData.customer.firstName} ${orderData.customer.lastName}`.trim()
          },
          trackingNumber: barcode || undefined
        }, pdfBuffer);
        console.log('✅ [PHASE 4] SUCCESS: Email sent.');
      } catch (emailErr: any) {
        const msg = formatErrorMessage(emailErr);
        console.error('⚠️ [PHASE 4] Email confirmation failed (NON-FATAL — keeping active order status):', msg);
        commErrors.push(`Email: ${msg}`);
      }

      // 4.1 [DIGITAL PROGRAMS INSTANT DELIVERY] If order contains Food Plan / Bench Program, send dedicated PDF email
      try {
        const orderedPrograms = resolveOrderedPrograms(
          orderData.items || [],
          orderData.locale || 'ro'
        );
        if (orderedPrograms.length > 0) {
          console.log(`📚 [PHASE 4.1] Sending Digital Program PDF email (${orderedPrograms.length} PDFs)...`);
          await sendProgramDeliveryEmail(
            orderData.customer.email,
            orderData,
            orderedPrograms
          );
          console.log('✅ [PHASE 4.1] SUCCESS: Digital Program PDF email sent.');
        }
      } catch (progEmailErr: any) {
        const msg = formatErrorMessage(progEmailErr);
        console.error('⚠️ [PHASE 4.1] Digital Program email failed (NON-FATAL):', msg);
        commErrors.push(`ProgramPDF: ${msg}`);
      }
    }

    // Critical rule: NEVER downgrade a paid/valid order to 'failed' on post-payment comm failure.
    // Record any communication diagnostics inside carrier_metadata.last_comm_error.
    if (commErrors.length > 0) {
      await recordNonFatalCommError(paymentIdKey, commErrors.join(' | '));
    }

    console.timeEnd(groupLabel);
    console.groupEnd();
    return { success: true };
  } catch (err: any) {
    console.timeEnd(groupLabel);
    console.groupEnd();
    const errorMessage = err instanceof Error ? err.message : JSON.stringify(err);
    console.error(`❌ [ORDER PROCESSOR] CRITICAL FATAL ERROR for Order #${orderData.id}:`, errorMessage);
    throw err;
  }
  })();

  activeOrderLocks.set(lockKey, runPromise);

  try {
    return await runPromise;
  } finally {
    if (activeOrderLocks.get(lockKey) === runPromise) {
      activeOrderLocks.delete(lockKey);
    }
  }
}
