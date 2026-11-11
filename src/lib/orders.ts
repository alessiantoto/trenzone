import { supabaseAdmin } from './supabase-admin';
import { generateInvoicePdf } from './invoice';
import { sendOrderConfirmationEmail } from './resend-service';
import { createPacketaParcel } from './packeta-api';
import { createSamedayAwb } from './sameday-api';
import { getProductPrice, getServerExchangeRates } from '@/utils/pricing';
import { resolveItemImage } from './product-images';
import { issueOblioInvoice, isOblioConfigured } from './oblio-api';

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
async function saveOrderToDb(order: OrderData, trackingNumber?: string) {
  console.log(`💾 [ORDER DB] Saving Order #${order.id} to Supabase...`);
  
  try {
    // 🛡️ Pro Check: Many databases don't have UNIQUE constraints on payment_intent_id.
    // So we manually check if the order exists to decide between INSERT or UPDATE.
    const paymentId = order.paymentIntentId || order.id;
    const { data: existingOrder } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('payment_intent_id', paymentId)
      .single();

    // 🛡️ Ensure coupon_id is a valid UUID before saving to DB
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
          .maybeSingle();
        if (matchedCoupon?.id) {
          resolvedCouponId = matchedCoupon.id;
        }
      }
    }

    const payload = {
      payment_intent_id: paymentId,
      subtotal: order.subtotal,
      discount_total: order.discount,
      total_amount: order.total,
      shipping_amount: order.shipping,
      coupon_id: resolvedCouponId,
      currency: order.currency.toUpperCase(),
      status: order.status || 'processing', // Use provided status or default to processing
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
      tracking_number: trackingNumber || null,
      priority_processing: order.priorityProcessing || false,
      gift_packaging: order.giftPackaging || false,
      gift_message: order.giftMessage || null,
      receipt_url: `/api/admin/orders/${order.id}/invoice`,
      carrier_metadata: {
        shipping_cost: order.shipping,
        card_discount: order.cardDiscount || 0,
        ...(order.couponCode ? { coupon_code: order.couponCode } : {})
      },
      updated_at: new Date().toISOString()
    };

    let saveError;
    if (existingOrder) {
      console.log(`📝 [ORDER DB] Updating existing order: ${paymentId}`);
      const { error } = await supabaseAdmin
        .from('orders')
        .update(payload)
        .eq('payment_intent_id', paymentId);
      saveError = error;
    } else {
      console.log(`🆕 [ORDER DB] Inserting new order: ${paymentId}`);
      const { error } = await supabaseAdmin
        .from('orders')
        .insert({
          ...payload,
          created_at: new Date().toISOString()
        });
      saveError = error;
    }

    if (saveError) {
      console.error('❌ [ORDER DB] Data persistence error:', saveError);
      throw saveError;
    }

    // 🏆 Increment coupon usage if applicable
    if (resolvedCouponId) {
       // Attempt atomic increment via RPC (Best Practice)
       const { error: rpcError } = await supabaseAdmin.rpc('increment_coupon_usage', { coupon_id: resolvedCouponId });
       
       if (rpcError) {
         console.warn('⚠️ [ORDER DB] RPC increment failed, using fallback:', rpcError.message);
         // Fallback: This is not atomic but works for low-concurrency
         const { data: c } = await supabaseAdmin.from('coupons').select('used_count').eq('id', resolvedCouponId).single();
         if (c) {
           await supabaseAdmin
             .from('coupons')
             .update({ used_count: (c.used_count || 0) + 1 })
             .eq('id', resolvedCouponId);
         }
       }
    }
    
    console.log('✅ [ORDER DB] Order successfully saved in Supabase.');
  } catch (err) {
    console.error('❌ [ORDER DB] Failed to persist order:', err instanceof Error ? err.message : err);
    // We log but don't strictly halt the process if DB fails after payment, 
    // although for the user's objective, this is critical.
    throw err;
  }
}

const activeOrderLocks = new Set<string>();

/**
 * Common order processor for both Stripe (Online) and COD (Ramburs)
 */
export async function processOrder(orderData: OrderData) {
  const lockKey = orderData.paymentIntentId || orderData.id;
  if (activeOrderLocks.has(lockKey)) {
    console.log(`⏭️ [ORDER LOCK] Order ${lockKey} is already being processed in-flight. Skipping duplicate execution.`);
    return { success: true, deduplicated: true };
  }
  activeOrderLocks.add(lockKey);

  const groupLabel = `🛒 Order #${orderData.id} lifecycle`;
  console.group(groupLabel);
  console.time(groupLabel);
  
  try {
    // 🛡️ IDEMPOTENCY GUARD: Prevent race conditions between Stripe Webhook and Verify Fallback
    if (orderData.paymentMethod === 'online' && orderData.paymentIntentId) {
      const { data: existingCompleted } = await supabaseAdmin
        .from('orders')
        .select('id, status')
        .eq('payment_intent_id', orderData.paymentIntentId)
        .maybeSingle();
      if (existingCompleted && existingCompleted.status !== 'failed') {
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
    const itemIds = orderData.items.map((i: any) => {
      const match = i.id?.match(BUNDLE_REGEX);
      return match ? match[1] : i.id;
    }).filter(Boolean);
    const { data: physicalData } = await supabaseAdmin
      .from('products')
      .select('id, slug, name, price, price_numeric, weight, length_mm, width_mm, height_mm, main_image, images, variants')
      .in('id', itemIds);

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
          const variantNameStr = typeof variantObj.name === 'object' ? (variantObj.name.ro || Object.values(variantObj.name)[0]) : variantObj.name;
          
          // Check variants from DB
          const variantsData = typeof p.variants === 'string' ? JSON.parse(p.variants) : p.variants;
          if (variantsData?.options) {
            const opt = variantsData.options.find((o: any) => {
              const oName = typeof o.name === 'object' ? (o.name.ro || Object.values(o.name)[0]) : o.name;
              return oName === variantNameStr || (item.name && String(item.name).includes(oName));
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
          const vName = typeof variantObj.name === 'object' ? (variantObj.name.ro || Object.values(variantObj.name)[0]) : variantObj.name;
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
        bundleId: match ? item.id : undefined,
        name: finalNameStr, 
        price: finalPrice, 
        image: finalImage, 
        slug: item.slug || p?.slug || '', 
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
      const realItemId = (() => { const m = item.id?.match(BUNDLE_REGEX); return m ? m[1] : item.id; })();
      const p = physicalData?.find(d => d.id === realItemId);
      const weight = p?.weight || 0.2;
      const l = p?.length_mm || 150;
      const w = p?.width_mm || 100;
      const h = p?.height_mm || 50;

      totalWeightKg += weight * item.quantity;
      if (l > maxL) maxL = l;
      if (w > maxW) maxW = w;
      sumH += h * item.quantity;
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

    // 🛡️ REFINED SAFETY CHECK
    const isPreorderOrder = orderData.status === 'preorder' || (orderData.items || []).some((it: any) => {
      const vName = typeof it.selectedVariant?.name === 'object' ? JSON.stringify(it.selectedVariant.name) : String(it.selectedVariant?.name || it.variant || it.name || '');
      return /(precomand|preorder|pre-order)/i.test(vName);
    });
    let initialStatus = isPreorderOrder ? 'preorder' : 'processing';
    
    // Check for truly missing info OR the placeholder markers we added in the webhook
    const hasMissingInfo = 
      !orderData.customer.firstName || orderData.customer.firstName.includes("[LIPSĂ]") ||
      !orderData.customer.email || orderData.customer.email.includes("[LIPSĂ]") ||
      !orderData.customer.addr_line1 || orderData.customer.addr_line1.includes("[LIPSĂ]");
    
    if (hasMissingInfo) {
      console.warn(`⚠️ [PROCESS-ORDER] Missing critical info for ${orderData.id}. Marking as failed and stopping binary services.`);
      initialStatus = 'failed';
      // Fill any truly null fields with markers for DB safety
      if (!orderData.customer.firstName) orderData.customer.firstName = "[NUME LIPSĂ]";
      if (!orderData.customer.lastName) orderData.customer.lastName = "[PRENUME LIPSĂ]";
      if (!orderData.customer.email) orderData.customer.email = "lipsa-email@trenzone.fit";
      if (!orderData.customer.addr_line1) orderData.customer.addr_line1 = "[ADRESĂ LIPSĂ]";
    }

    // 2. [PRIORITY 1] Save to Database immediately after sanitization
    // We do this FIRST so we never lose an order even if external APIs fail
    let orderStored = false;
    try {
      console.log('💾 [PHASE 1] Initial DB Save (Safety First)...');
      
      await saveOrderToDb({ ...orderData, status: initialStatus } as any, undefined);
      orderStored = true;
      console.log('✅ [PHASE 1] SUCCESS: Order persisted in DB.');
    } catch (dbErr) {
      console.error('❌ [PHASE 1] CRITICAL: Initial DB Save failed!', dbErr);
      throw dbErr; 
    }

    // 🛡️ If info was missing, we STOP here (but order is already saved as failed)
    if (hasMissingInfo) {
      console.log('🛑 [STOP] Sinking order because of missing metadata. Check Admin.');
      return { success: false, error: 'Missing metadata' };
    }

    // 3. [OPTIONAL PHASE 2] Generate AWB (DISABLED - MOVED TO MANUAL)
    let barcode = null;
    let courierSuccess = true; // Set to true so order processing continues normally
    const isSameday = ['7', '15', 'express'].includes(orderData.carrierId);

    // 4. [OPTIONAL PHASE 3] Generate Invoice & Send Email
    let emailSuccess = false;
    try {
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
          items: enrichedItems,
          trackingNumber: barcode || undefined,
          customer: {
            ...orderData.customer,
            name: `${orderData.customer.firstName} ${orderData.customer.lastName}`.trim(),
            address: `${orderData.customer.addr_line1}, ${orderData.customer.addr_city}, ${orderData.customer.addr_zip}, ${orderData.customer.addr_country}`
          }
        };
        pdfBuffer = await generateInvoicePdf(legacyOrderData);
        console.log(`✅ [PHASE 3] Success: PDF generated`);
      } catch (pdfErr) {
        console.error('⚠️ [PHASE 3] PDF Generation Warning:', pdfErr);
      }

      // 🇷🇴 [OBLIO & ANAF SPV] Emitere automată factură fiscală în momentul plasării comenzii
      try {
        if (isOblioConfigured()) {
          const paymentId = orderData.paymentIntentId || orderData.id;
          const { data: curOrd } = await supabaseAdmin
            .from('orders')
            .select('tracking_metadata')
            .eq('payment_intent_id', paymentId)
            .maybeSingle();

          const existingMeta = (curOrd?.tracking_metadata || {}) as Record<string, any>;
          if (existingMeta?.oblio_invoice?.number) {
            console.log(`⏭️ [OBLIO AUTO] Factura Oblio există deja (${existingMeta.oblio_invoice.seriesName} ${existingMeta.oblio_invoice.number}). Skipping.`);
          } else {
            console.log(`🧾 [OBLIO AUTO] Emitem automat factura în Oblio pentru comanda #${orderData.id}...`);
            const oblioOrderPayload = {
              id: orderData.id,
              payment_intent_id: paymentId,
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
                shipping_cost: orderData.shipping,
                card_discount: orderData.cardDiscount || 0,
                ...(orderData.couponCode ? { coupon_code: orderData.couponCode } : {})
              }
            };

            const oblioRes = await issueOblioInvoice(oblioOrderPayload);
            if (oblioRes.success) {
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
                .eq('payment_intent_id', paymentId);
            } else {
              console.warn(`⚠️ [OBLIO AUTO] Atenție la emiterea automată în Oblio:`, oblioRes.error);
            }
          }
        }
      } catch (oblioErr) {
        console.error('⚠️ [OBLIO AUTO] Eroare la emiterea automată în Oblio:', oblioErr);
      }
      
      if (orderData.customer.email) {
        console.log(`📧 [PHASE 4] Sending confirmation email...`);
        await sendOrderConfirmationEmail(orderData.customer.email, {
          ...orderData,
          customer: {
            ...orderData.customer,
            name: `${orderData.customer.firstName} ${orderData.customer.lastName}`.trim()
          },
          trackingNumber: barcode || undefined
        }, pdfBuffer);
        emailSuccess = true;
        console.log('✅ [PHASE 4] SUCCESS: Email sent.');
      }
    } catch (commErr) {
      console.error('⚠️ [PHASE 4] FAILED: Communication sequence error:', commErr);
      // Mark as failed in DB if not already failed due to Packeta
      await supabaseAdmin.from('orders').update({ status: 'failed' }).eq('payment_intent_id', orderData.paymentIntentId || orderData.id);
    }

    // Final Final Status Check
    if (courierSuccess && (emailSuccess || !orderData.customer.email)) {
      console.log('🎊 [ORDER] Full lifecycle completed successfully.');
      const finalStatus = isPreorderOrder ? 'preorder' : 'processing';
      await supabaseAdmin.from('orders').update({ status: finalStatus }).eq('payment_intent_id', orderData.paymentIntentId || orderData.id);
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
  } finally {
    activeOrderLocks.delete(lockKey);
  }
}
