"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAdminAuthorized } from "./admin-auth";
import { createClient } from "@/utils/supabase/server";
import { getSingleFlavorImage } from "@/lib/product-images";
import { getCanonicalOrderNumber } from "@/utils/admin-helpers";

export async function getAdminOrders() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  console.log(`🔍 [ADMIN ORDERS] Fetch attempt by: ${user?.email || 'Unknown User'}`);

  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) {
    console.warn(`⚠️ [ADMIN ORDERS] Unauthorized access attempt by: ${user?.email}`);
    throw new Error(`Acces neautorizat pentru ${user?.email || 'utilizator anonim'}.`);
  }

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("❌ [ADMIN ORDERS] Database Fetch Error:", error);
    return [];
  }

  // Map coupon IDs to codes safely
  const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
  const rawCouponIds = Array.from(new Set(data.map(o => o.coupon_id).filter(Boolean)));
  const uuidCouponIds = rawCouponIds.filter(id => typeof id === 'string' && isUuid(id));
  let couponsMap: Record<string, string> = {};

  if (uuidCouponIds.length > 0) {
    const { data: couponsData, error: couponError } = await supabaseAdmin
      .from('coupons')
      .select('id, code')
      .in('id', uuidCouponIds);
    
    if (!couponError && couponsData) {
      couponsData.forEach(c => {
        couponsMap[c.id] = c.code;
      });
    }
  }

  console.log(`✅ [ADMIN ORDERS] Successfully fetched ${data?.length || 0} orders.`);

  return data.map(order => {
    // Extract human-friendly canonical TZ-[A-Za-z0-9-]+
    const displayId = getCanonicalOrderNumber(order);

    const cleanPaymentIntentId = order.payment_intent_id?.startsWith('pi_') ? order.payment_intent_id : null;
    const rawCurrency = String(order.currency || 'RON').trim().toUpperCase();
    const formattedTotal = `${Number(order.total_amount || 0).toFixed(2)} ${rawCurrency}`;

    return {
      id: displayId, // Show TZ-[A-Za-z0-9-]+, fallback to payment_intent_id or UUID
      supabaseId: order.id, // Keep UUID for DB operations
      customer: `${order.customer_firstname || ''} ${order.customer_lastname || ''}`.trim() || 'Client',
      customerEmail: order.customer_email || 'N/A',
      customerPhone: order.customer_phone || 'N/A',
      currency: rawCurrency,
      total: formattedTotal,
      totalAmount: Number(order.total_amount || 0),
      status: order.status || 'pending',
      date: order.created_at ? new Date(order.created_at).toLocaleString('ro-RO', { 
          day: '2-digit', 
          month: '2-digit', 
          hour: '2-digit', 
          minute: '2-digit' 
      }) : 'N/A',
      rawDate: order.created_at,
      items: (Array.isArray(order.items) ? order.items : []).map((item: any) => {
        let name = 'Produs';
        if (item && typeof item.name === 'object' && item.name !== null) {
          name = item.name['ro'] || item.name['en'] || 'Produs';
        } else if (item && item.name) {
          name = String(item.name);
        }

        const variantRaw = item?.selectedVariant?.name || item?.variant || null;
        const variantStr = typeof variantRaw === 'object' && variantRaw !== null
          ? String(variantRaw['ro'] || variantRaw['en'] || Object.values(variantRaw as any)[0] || '')
          : String(variantRaw || '');

        const hasVariant = variantStr && (
          name.includes(`(${variantStr})`) || 
          name.toLowerCase().includes(`(${variantStr.toLowerCase()})`)
        );

        let image = item?.image || item?.selectedVariant?.image || null;
        if (typeof image === 'string') {
          image = image.replace(/^https?:\/\/(www\.)?trenzone\.ro/, '');
        }

        const isBundle = String(item?.id || '').includes('-bundle-') ||
                         Boolean(item?._isBundle) ||
                         name.toLowerCase().includes('pachet') ||
                         name.toLowerCase().includes('bundle');

        if (isBundle) {
          if (!image || String(image).includes('bundle')) {
            image = '/images/products/x10_elbow_wraps_purple_1.webp';
          }
        } else {
          // If NOT a bundle, NEVER use bundle image; resolve to individual flavor image
          if (!image || String(image).includes('bundle')) {
            image = getSingleFlavorImage(variantStr || name);
          }
        }

        return { ...item, name, image };
      }), 
      couponId: (() => {
        if (order.coupon_id && couponsMap[order.coupon_id]) return couponsMap[order.coupon_id];
        if (order.coupon_id && !isUuid(order.coupon_id) && order.coupon_id !== 'none') return order.coupon_id;
        const metaCode = order.carrier_metadata?.coupon_code || order.carrier_metadata?.coupon;
        if (metaCode && metaCode !== 'none') return metaCode;
        return null;
      })(),
      couponCode: (() => {
        if (order.coupon_id && couponsMap[order.coupon_id]) return couponsMap[order.coupon_id];
        if (order.coupon_id && !isUuid(order.coupon_id) && order.coupon_id !== 'none') return order.coupon_id;
        const metaCode = order.carrier_metadata?.coupon_code || order.carrier_metadata?.coupon;
        if (metaCode && metaCode !== 'none') return metaCode;
        return null;
      })(),
      discountTotal: Number(order.discount_total || 0),
      couponDiscount: Number(order.discount_total || 0),
      subtotalAmount: Number(order.subtotal || 0),
      shippingAmount: Number(order.shipping_amount ?? order.carrier_metadata?.shipping_cost ?? 0),
      cardDiscount: Number(order.carrier_metadata?.card_discount || 0),
      trackingNumber: order.tracking_number || null,
      paymentMethod: order.payment_method || 'stripe',
      paymentIntentId: cleanPaymentIntentId,
      phone: order.customer_phone || 'N/A',
      address: `${order.addr_line1 || ''} ${order.addr_line2 || ''}, ${order.addr_city || ''}, ${order.addr_zip || ''}, ${order.addr_country || ''}`.replace(/,\s*,/g, ',').replace(/^,|,$/g, '').trim() || 'N/A',
      customerFirstName: order.customer_firstname || '',
      customerLastName: order.customer_lastname || '',
      addrLine1: order.addr_line1 || '',
      addrLine2: order.addr_line2 || '',
      addrCity: order.addr_city || '',
      addrZip: order.addr_zip || '',
      addrCountry: order.addr_country || 'RO',
      shippingType: order.shipping_type || 'hd',
      priorityProcessing: order.priority_processing || false,
      giftPackaging: order.gift_packaging || false,
      giftMessage: order.gift_message || null,
      trackingMetadata: (() => {
        if (!order.tracking_metadata || typeof order.tracking_metadata !== 'object' || Object.keys(order.tracking_metadata).length === 0) {
          if (order.status === 'delivered') {
            return { printed: true, delivered: true };
          }
          return null;
        }
        const meta = { ...order.tracking_metadata };
        const isDelivered = 
          order.status === 'delivered' || 
          meta.delivered === true || 
          meta.statusCode === 7 || 
          meta.statusText?.toLowerCase()?.includes('livrat');
        if (isDelivered && !meta.printed) {
          meta.printed = true;
        }
        return meta;
      })(),
      oblioInvoice: order.tracking_metadata?.oblio_invoice || order.carrier_metadata?.oblio_invoice || null,
      fulfillmentDispatchedAt: order.carrier_metadata?.fulfillment_dispatched_at || null,
      fulfillmentDispatchedTo: order.carrier_metadata?.fulfillment_dispatched_to || null,
      carrierMetadata: order.carrier_metadata || null
    };
  });
}
