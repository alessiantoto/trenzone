import { supabaseAdmin } from './supabase-admin';
import { getPacketStatus } from './packeta-api';
import { getSamedayAwbStatus } from './sameday-api';

export interface SyncTrackingResult {
  totalChecked: number;
  updatedCount: number;
  deliveredCount: number;
  returnedCount: number;
  inTransitCount: number;
  skippedCount: number;
  errors: Array<{ id: string; awb: string; error: string }>;
}

/**
 * Detecție inteligentă Sameday vs Packeta:
 * 1. Geografică: Sameday e doar pentru comenzi în România (RO), iar Packeta este pentru comenzi în afara României.
 * 2. Format cod AWB:
 *    - Codurile care încep cu 1ONB, 2ONB, conțin ONB sau sunt alfanumerice fără Z sunt trimise prioritar către Sameday API.
 *    - Codurile pur numerice de 10 cifre (sau 7-12 cifre) sau cu prefix Z sunt trimise prioritar către Packeta API.
 */
export function detectPrimaryCourier(
  trackingNumber: string,
  country?: string | null,
  carrierId?: string | null
): 'sameday' | 'packeta' {
  const cleanAwb = (trackingNumber || '').trim();
  const upperAwb = cleanAwb.toUpperCase();
  const cleanCountry = (country || '').trim().toUpperCase();
  const isRomania = cleanCountry === 'RO' || cleanCountry === 'ROMANIA' || cleanCountry === 'ROMÂNIA';
  const hasCountry = Boolean(cleanCountry);

  // 1. Verificare prefixe / formate specifice cod AWB
  const startsWithONB = upperAwb.startsWith('1ONB') || upperAwb.startsWith('2ONB') || upperAwb.includes('ONB');
  const startsWithZ = upperAwb.startsWith('Z');
  const isPureNumeric10Digits = /^\d{7,12}$/.test(cleanAwb); // Codurile Packeta sunt pur numerice (uzual 10 cifre)
  const isAlphanumericWithoutZ = /^[A-Z0-9]+$/i.test(cleanAwb) && !startsWithZ && !isPureNumeric10Digits && isNaN(Number(cleanAwb));

  // Prioritate 1: Pattern-uri specifice clare de AWB
  if (startsWithONB) {
    return 'sameday';
  }

  if (startsWithZ || isPureNumeric10Digits) {
    return 'packeta';
  }

  if (isAlphanumericWithoutZ) {
    return 'sameday';
  }

  // Prioritate 2: Regula de țară (Sameday doar RO, Packeta afară)
  if (hasCountry) {
    if (isRomania) {
      return 'sameday';
    } else {
      return 'packeta';
    }
  }

  // Prioritate 3: Carrier ID dacă este specificat
  if (carrierId) {
    const cId = String(carrierId).toLowerCase();
    if (['7', '15', 'express', 'sameday'].includes(cId)) return 'sameday';
    if (['packeta', '0', 'zbox'].includes(cId)) return 'packeta';
  }

  // Default fallback: numeric -> packeta, altfel -> sameday
  return isNaN(Number(cleanAwb)) ? 'sameday' : 'packeta';
}

/**
 * Resolves tracking status by detecting the courier (Sameday vs Packeta)
 * and falling back to the other courier if the primary attempt fails.
 */
export async function resolveAwbTracking(
  trackingNumber: string, 
  carrierId?: string | null,
  country?: string | null
) {
  const cleanAwb = trackingNumber.trim();
  const primaryCourier = detectPrimaryCourier(cleanAwb, country, carrierId);

  const isDefinitiveSameday = /^(1ONB|2ONB|[A-Z0-9]*ONB)/i.test(cleanAwb);
  const isDefinitivePacketa = /^Z\d+/i.test(cleanAwb) || /^\d{7,12}$/.test(cleanAwb);

  // 1. Încearcă curierul primar determinat inteligent
  if (primaryCourier === 'sameday') {
    try {
      const data = await getSamedayAwbStatus(cleanAwb);
      if (data && (!data.error || data.failed)) return data;
      
      // Dacă Sameday a returnat eroare/colet negăsit, încearcă fallback Packeta DOAR dacă nu e clar cod Sameday
      if (!isDefinitiveSameday) {
        try {
          const packetaData = await getPacketStatus(cleanAwb);
          if (packetaData && (!packetaData.error || packetaData.failed)) return packetaData;
        } catch {
          // Păstrează datele originale
        }
      }
      return data;
    } catch (err: any) {
      if (!isDefinitiveSameday) {
        console.warn(`[TRACKING SYNC] Sameday call failed for ${cleanAwb}, falling back to Packeta...`);
        try {
          const packetaData = await getPacketStatus(cleanAwb);
          if (packetaData) return packetaData;
        } catch (fallbackErr: any) {
          console.warn(`[TRACKING SYNC] Packeta fallback also failed for ${cleanAwb}: ${fallbackErr.message}`);
        }
      }
      throw err;
    }
  } else {
    // Primar Packeta
    try {
      const data = await getPacketStatus(cleanAwb);
      if (data && (!data.error || data.failed)) return data;
      
      // Fallback Sameday dacă Packeta eșuează DOAR dacă nu e clar cod Packeta
      if (!isDefinitivePacketa) {
        try {
          const samedayData = await getSamedayAwbStatus(cleanAwb);
          if (samedayData && (!samedayData.error || samedayData.failed)) return samedayData;
        } catch {
          // Păstrează datele originale
        }
      }
      return data;
    } catch (err: any) {
      if (!isDefinitivePacketa) {
        console.warn(`[TRACKING SYNC] Packeta call failed for ${cleanAwb}, falling back to Sameday...`);
        try {
          const samedayData = await getSamedayAwbStatus(cleanAwb);
          if (samedayData) return samedayData;
        } catch (fallbackErr: any) {
          console.warn(`[TRACKING SYNC] Sameday fallback also failed for ${cleanAwb}: ${fallbackErr.message}`);
        }
      }
      throw err;
    }
  }
}

/**
 * Synchronizes tracking status for all undelivered orders with tracking numbers.
 * CRITICAL RULE:
 * Once an order is marked as delivered, it is NEVER checked again!
 */
export async function syncUndeliveredOrdersTracking(limitCount: number = 100): Promise<SyncTrackingResult> {
  console.log('🔄 [TRACKING SYNC] Starting sync for undelivered orders...');

  // 1. Fetch orders that have an AWB and are NOT in terminal states
  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select('id, tracking_number, status, carrier_id, addr_country, tracking_metadata')
    .not('tracking_number', 'is', null)
    .neq('status', 'delivered')
    .neq('status', 'returned')
    .neq('status', 'cancelled')
    .neq('status', 'refunded')
    .order('created_at', { ascending: false })
    .limit(limitCount);

  if (error) {
    console.error('❌ [TRACKING SYNC] Error fetching orders from DB:', error);
    throw new Error(`DB Fetch Error: ${error.message}`);
  }

  if (!orders || orders.length === 0) {
    console.log('ℹ️ [TRACKING SYNC] No orders need tracking sync.');
    return {
      totalChecked: 0,
      updatedCount: 0,
      deliveredCount: 0,
      returnedCount: 0,
      inTransitCount: 0,
      skippedCount: 0,
      errors: []
    };
  }

  const result: SyncTrackingResult = {
    totalChecked: 0,
    updatedCount: 0,
    deliveredCount: 0,
    returnedCount: 0,
    inTransitCount: 0,
    skippedCount: 0,
    errors: []
  };

  // 2. Iterate and check each active order
  for (const order of orders) {
    const rawAwb = order.tracking_number?.trim();
    if (!rawAwb) {
      result.skippedCount++;
      continue;
    }

    // REGULĂ STRICTĂ: dacă comanda este marcată livrată sau metadatele arată livrat, NU se apelează API-ul curierului!
    const meta = order.tracking_metadata;
    const metaStatusTextLower = (meta?.statusText || '').toLowerCase();
    const isMetaDeliveredText =
      metaStatusTextLower.includes('livrat') &&
      !metaStatusTextLower.includes('nelivrat') &&
      !metaStatusTextLower.includes('undelivered');
    const isAlreadyDelivered = 
      order.status?.toLowerCase() === 'delivered' ||
      (meta && !meta.failed && (
        meta.delivered === true || 
        isMetaDeliveredText || 
        meta.status?.toLowerCase() === 'delivered'
      ));

    if (isAlreadyDelivered) {
      console.log(`[TRACKING SYNC] Order ${order.id} is already delivered. Skipping external courier API call.`);
      const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
      if (order.status?.toLowerCase() !== 'delivered') {
        updateData.status = 'delivered';
      }
      if (!meta?.printed) {
        updateData.tracking_metadata = { ...(meta || {}), delivered: true, printed: true };
      }
      if (Object.keys(updateData).length > 1) {
        await supabaseAdmin
          .from('orders')
          .update(updateData)
          .eq('id', order.id);
      }
      result.deliveredCount++;
      result.skippedCount++;
      continue;
    }

    result.totalChecked++;

    try {
      const statusData = await resolveAwbTracking(rawAwb, order.carrier_id, order.addr_country);

      if (!statusData) {
        result.errors.push({ id: order.id, awb: rawAwb, error: 'No status returned from courier' });
        continue;
      }

      // Determine new order status
      const statusTextLower = (statusData.statusText || '').toLowerCase();
      const isDeliveredText =
        statusTextLower.includes('livrat') &&
        !statusTextLower.includes('nelivrat') &&
        !statusTextLower.includes('undelivered');

      let newStatus: string | null = null;
      if (statusData.failed) {
        newStatus = 'returned';
        result.returnedCount++;
      } else if (
        statusData.delivered === true || 
        statusData.statusCode === 7 ||
        isDeliveredText || 
        statusData.status?.toLowerCase() === 'delivered'
      ) {
        newStatus = 'delivered';
        result.deliveredCount++;
      } else if (statusData.status === 'ok' || statusData.statusText || statusData.statusCode === 6) {
        result.inTransitCount++;
        // If order was pending or processing, promote to shipped
        if (order.status === 'pending' || order.status === 'processing') {
          newStatus = 'shipped';
        }
      }

      const existingMeta = (typeof order.tracking_metadata === 'object' && order.tracking_metadata) ? order.tracking_metadata : {};
      const isPrinted = Boolean(
        existingMeta.printed || 
        statusData.delivered || 
        statusData.statusCode === 7 ||
        newStatus === 'delivered' || 
        order.status === 'delivered'
      );

      // Update in Supabase
      const updatePayload: Record<string, any> = {
        tracking_metadata: {
          ...existingMeta,
          ...statusData,
          printed: isPrinted
        },
        updated_at: new Date().toISOString()
      };

      if (newStatus && newStatus !== order.status) {
        updatePayload.status = newStatus;
      }

      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update(updatePayload)
        .eq('id', order.id);

      if (updateError) {
        console.error(`❌ [TRACKING SYNC] Failed to update DB for order ${order.id}:`, updateError);
        result.errors.push({ id: order.id, awb: rawAwb, error: updateError.message });
      } else {
        result.updatedCount++;
        console.log(`✅ [TRACKING SYNC] Order ${order.id} synced: ${statusData.statusText || 'OK'}${newStatus ? ` -> ${newStatus}` : ''}`);
      }
    } catch (err: any) {
      console.error(`⚠️ [TRACKING SYNC] Failed to check status for AWB ${rawAwb}:`, err.message);
      result.errors.push({ id: order.id, awb: rawAwb, error: err.message || 'Tracking check failed' });
    }

    // Polite 200ms delay between courier requests to respect API rate limits
    await new Promise(r => setTimeout(r, 200));
  }

  console.log('🏁 [TRACKING SYNC] Completed.', result);
  return result;
}
