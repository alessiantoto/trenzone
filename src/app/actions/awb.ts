"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAdminAuthorized } from "./admin-auth";
import { createSamedayAwb, cancelSamedayAwb } from "@/lib/sameday-api";
import { createPacketaParcel, cancelPacketaParcel } from "@/lib/packeta-api";
import { sendAwbTrackingEmail } from "@/lib/resend-service";
import { COUNTRY_SERVICES } from "@/lib/shipping-config";
import { detectPrimaryCourier } from "@/lib/tracking-sync";
import { getCanonicalOrderNumber } from "@/utils/admin-helpers";
import { getCountyFromZip } from "@/lib/oblio-api";
import { convertToRon, getServerExchangeRates } from "@/utils/pricing";

// Helper: parse raw Sameday/Packeta JSON error into a clean, human-readable message
function parseAwbError(rawMessage: string, displayId: string): string {
  try {
    // Try to extract the JSON part after the status code
    const jsonMatch = rawMessage.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Sameday format: { "message": "Validation Failed", "errors": { "children": { ... } } }
      if (parsed.message) {
        const problems: string[] = [];
        
        // Walk through errors.children to find actual field errors
        const walkErrors = (obj: any, path: string = '') => {
          if (!obj || typeof obj !== 'object') return;
          if (Array.isArray(obj.errors) && obj.errors.length > 0) {
            problems.push(`${path || 'câmp necunoscut'}: ${obj.errors.join(', ')}`);
          }
          if (obj.children && typeof obj.children === 'object') {
            for (const [key, val] of Object.entries(obj.children)) {
              walkErrors(val, path ? `${path}.${key}` : key);
            }
          }
        };
        
        if (parsed.errors) {
          walkErrors(parsed.errors);
        }
        
        if (problems.length > 0) {
          return `${parsed.message}: ${problems.join(' | ')}`;
        }
        return parsed.message;
      }
      
      // Packeta format or other
      if (parsed.error) return parsed.error;
      if (parsed.detail) return parsed.detail;
    }
  } catch (_) {
    // If JSON parsing fails, just clean up the raw message
  }
  
  // Fallback: truncate if too long
  if (rawMessage.length > 200) {
    return rawMessage.substring(0, 200) + '...';
  }
  return rawMessage;
}

export async function generateManualAwbAction(orderIds: string[]) {
  try {
    const isAuthorized = await isAdminAuthorized();
    if (!isAuthorized) {
      return { success: false, error: 'Unauthorized' };
    }

    const { getFulfillmentSettings } = await import('@/app/actions/admin-fulfillment');
    const fSettings = await getFulfillmentSettings();
    if (fSettings.manual_shipping_enabled) {
      return { 
        success: false, 
        error: 'Expedierea manuală este activă în Setări. Generarea de AWB este blocată (gestionată de centrul de fulfillment).' 
      };
    }

    if (!orderIds || orderIds.length === 0) {
      return { success: false, error: 'No orders selected' };
    }

    let successCount = 0;
    let errors: { id: string, message: string }[] = [];

    // Fetch orders data - handle both database UUIDs and customer display IDs (TZ-[A-Za-z0-9-]+ / payment_intent_id)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const uuids = orderIds.filter(id => uuidRegex.test(id));
    const nonUuids = orderIds.filter(id => !uuidRegex.test(id));

    const ordersMap = new Map<string, any>();

    if (uuids.length > 0) {
      const { data: uuidOrders, error: uuidError } = await supabaseAdmin
        .from('orders')
        .select('*')
        .in('id', uuids);

      if (uuidError) {
        console.error("❌ [AWB ACTION] Error fetching orders by UUID:", uuidError);
      } else if (uuidOrders) {
        uuidOrders.forEach(o => ordersMap.set(o.id, o));
      }
    }

    if (nonUuids.length > 0) {
      for (const rawId of nonUuids) {
        const safeRawId = String(rawId || '').replace(/[^a-zA-Z0-9_-]/g, '');
        if (!safeRawId) continue;
        const { data: matchedOrder, error: matchError } = await supabaseAdmin
          .from('orders')
          .select('*')
          .or(`payment_intent_id.eq.${safeRawId},receipt_url.ilike.%${safeRawId}%`)
          .maybeSingle();

        if (matchError) {
          console.error(`❌ [AWB ACTION] Error fetching order by displayId ${rawId}:`, matchError);
        } else if (matchedOrder) {
          ordersMap.set(matchedOrder.id, matchedOrder);
        }
      }
    }

    const orders = Array.from(ordersMap.values());

    if (orders.length === 0) {
      return { success: false, error: 'Failed to fetch orders' };
    }

    for (const order of orders) {
      try {
        if (order.tracking_number) {
          errors.push({ id: order.id, message: 'AWB already exists' });
          continue;
        }

        // Extract canonical TZ-[A-Za-z0-9-]+ ID
        const displayId = getCanonicalOrderNumber(order);

        // Build rawData from individual DB columns (no raw_order_data dependency)
        const rawCountry = String(order.addr_country || 'RO').trim().toUpperCase();
        const isRoCountry = rawCountry === 'RO' || rawCountry === 'ROMANIA' || rawCountry === 'ROMÂNIA';
        const rawData = {
          id: displayId,
          locale: order.carrier_metadata?.locale || (order as any).locale || (isRoCountry ? 'ro' : 'en'),
          paymentMethod: order.payment_method,
          currency: order.currency,
          total: order.total_amount,
          shippingType: order.shipping_type,
          carrierId: String(order.carrier_id || ''),
          branchId: order.branch_id ? String(order.branch_id) : null,
          branchName: order.branch_name,
          customer: {
            firstName: order.customer_firstname,
            lastName: order.customer_lastname,
            email: order.customer_email,
            phone: order.customer_phone,
            addr_line1: order.addr_line1,
            addr_line2: order.addr_line2,
            addr_city: order.addr_city,
            addr_county: order.addr_county,
            addr_zip: order.addr_zip,
            addr_country: order.addr_country,
          },
          items: order.items || []
        };

        // Sameday este doar pentru comenzi în România (RO), iar Packeta pentru comenzi în afara României
        const countryCode = (rawData.customer.addr_country || 'RO').trim().toUpperCase();
        const isRomania = countryCode === 'RO' || countryCode === 'ROMANIA' || countryCode === 'ROMÂNIA';
        const isSameday = isRomania && (!rawData.carrierId || ['7', '15', 'express', 'sameday'].includes(rawData.carrierId) || !['packeta', '0', 'zbox'].includes(rawData.carrierId));
        let barcode = null;
        let courier: 'sameday' | 'packeta' = isSameday ? 'sameday' : 'packeta';

        // Fetch physical data from products table for accurate weights & dimensions
        const BUNDLE_REGEX = /^(.+)-bundle-(\d+)$/;
        const itemIds = (Array.isArray(rawData.items) ? rawData.items : []).map((i: any) => {
          const match = String(i.id || '').match(BUNDLE_REGEX);
          return match ? match[1] : i.id;
        }).filter(Boolean);

        const productsPhysicalMap = new Map<string, any>();
        if (itemIds.length > 0) {
          const { data: pData } = await supabaseAdmin
            .from('products')
            .select('id, weight, length_mm, width_mm, height_mm')
            .in('id', itemIds);
          if (pData) {
            pData.forEach(p => productsPhysicalMap.set(p.id, p));
          }
        }

        // Calculate accurate weights and dimensions
        let totalWeightKg = 0;
        let maxW = 0, maxH = 0, maxL = 0;
        let sumH = 0;
        if (Array.isArray(rawData.items)) {
          for (const item of rawData.items) {
            const match = String(item.id || '').match(BUNDLE_REGEX);
            const realId = match ? match[1] : item.id;
            const bundleQty = match ? parseInt(match[2], 10) : 1;
            const qty = (Number(item.quantity) || 1) * bundleQty;

            const dbProduct = productsPhysicalMap.get(realId);
            
            // Weight in DB is stored in kg (e.g. 0.5 kg). If value is > 20, it is in grams.
            let unitWeightKg = 0.5; // fallback 500g
            if (item.weight && Number(item.weight) > 0) {
              const rawW = Number(item.weight);
              unitWeightKg = rawW > 20 ? rawW / 1000 : rawW;
            } else if (dbProduct?.weight && Number(dbProduct.weight) > 0) {
              const rawW = Number(dbProduct.weight);
              unitWeightKg = rawW > 20 ? rawW / 1000 : rawW;
            }

            totalWeightKg += unitWeightKg * qty;

            const w = item.width || dbProduct?.width_mm || 150;
            const h = item.height || dbProduct?.height_mm || 100;
            const l = item.length || dbProduct?.length_mm || 200;

            if (w > maxW) maxW = w;
            if (l > maxL) maxL = l;
            if (h > maxH) maxH = h;
            sumH += (h * qty);
          }
        }

        // Keep 2 decimals and ensure at least 0.1 kg
        totalWeightKg = Math.max(0.1, Number(totalWeightKg.toFixed(2)));
        if (maxW === 0) maxW = 200;
        if (maxL === 0) maxL = 200;
        if (sumH === 0) sumH = 100;

        if (isSameday) {
          let serviceId = rawData.carrierId === 'express' ? 7 : parseInt(rawData.carrierId, 10);
          if (isNaN(serviceId)) {
            serviceId = rawData.shippingType === 'pudo' ? 15 : 7;
          }
          
          let parsedItems = rawData.items;
          if (typeof parsedItems === 'string') {
            try { parsedItems = JSON.parse(parsedItems); } catch(e) {}
          }
          
          const itemsSummary = Array.isArray(parsedItems) && parsedItems.length > 0
            ? parsedItems.map((i: any) => {
                let shortName = typeof i.name === 'object' ? (i.name?.ro || i.name?.en || 'Produs') : (i.name || i.title || 'Produs');
                let variant = typeof i.selectedVariant?.name === 'object' 
                  ? (i.selectedVariant.name.ro || Object.values(i.selectedVariant.name)[0]) 
                  : (i.selectedVariant?.name || i.v || '');
                
                shortName = shortName.charAt(0).toUpperCase() + shortName.slice(1);
                
                if (variant && !shortName.includes(`(${variant})`)) {
                   shortName = `${shortName} (${variant})`;
                }
                
                return `${i.quantity || i.q || 1}x ${shortName}`;
              }).join(', ').substring(0, 200)
            : 'Fara detalii iteme';
            
          const obsString = `${displayId} | ${itemsSummary}`.substring(0, 255);
          const rawCodAmount = rawData.paymentMethod === 'cod' ? Number(rawData.total || 0) : 0;
          const liveRates = await getServerExchangeRates();
          const codAmountRon = (rawCodAmount > 0 && rawData.currency && rawData.currency.toUpperCase() !== 'RON')
            ? Math.round(convertToRon(rawCodAmount, rawData.currency, liveRates))
            : rawCodAmount;

          const samedayRes = await createSamedayAwb({
            weight: totalWeightKg,
            serviceId: serviceId,
            codAmount: codAmountRon,
            recipientName: `${rawData.customer.firstName} ${rawData.customer.lastName}`,
            recipientPhone: rawData.customer.phone,
            recipientEmail: rawData.customer.email || '',
            county: rawData.customer.addr_county || getCountyFromZip(rawData.customer.addr_zip) || rawData.customer.addr_city || 'București',
            city: rawData.customer.addr_city || 'București',
            address: `${rawData.customer.addr_line1} ${rawData.customer.addr_line2 || ''}`.trim(),
            zip: rawData.customer.addr_zip,
            width: maxW > 50 ? Math.round(maxW / 10) : maxW,
            height: sumH > 50 ? Math.round(sumH / 10) : sumH,
            length: maxL > 50 ? Math.round(maxL / 10) : maxL,
            lockerId: rawData.shippingType === 'pudo' && rawData.branchId ? parseInt(String(rawData.branchId), 10) || null : null,
            extra: {
              observation: obsString
            }
          });
          
          barcode = samedayRes.awbNumber;
        } else {
          // Packeta mapping for all European countries & pickup points
          const countryCode = (rawData.customer.addr_country || 'RO').toUpperCase();
          let finalAddressId = rawData.carrierId;
          let finalPickupPoint = undefined;

          if (rawData.shippingType === 'pudo') {
            if (rawData.carrierId === 'packeta' || rawData.carrierId === '0' || !rawData.carrierId) {
              // Direct Packeta Z-Point / Z-Box: addressId IS the branchId
              finalAddressId = rawData.branchId || 'packeta';
              finalPickupPoint = undefined;
            } else {
              // External carrier locker/box
              finalAddressId = rawData.carrierId;
              finalPickupPoint = rawData.branchId || undefined;
            }
          } else {
            // Home Delivery: if carrierId is missing or generic, resolve default for that country
            if (!finalAddressId || finalAddressId === 'packeta' || finalAddressId === 'standard' || finalAddressId === '0') {
              finalAddressId = COUNTRY_SERVICES[countryCode]?.hd?.[0]?.id || COUNTRY_SERVICES['DEFAULT']?.hd?.[0]?.id || '106';
            }
          }

          const packet = await createPacketaParcel({
            number: displayId,
            name: rawData.customer.firstName,
            surname: rawData.customer.lastName,
            email: rawData.customer.email,
            phone: rawData.customer.phone,
            addressId: String(finalAddressId || "106"),
            carrierPickupPoint: finalPickupPoint || undefined,
            value: rawData.total,
            currency: rawData.currency.toUpperCase(),
            cod: rawData.paymentMethod === 'cod' ? rawData.total : 0,
            country: countryCode,
            street: rawData.customer.addr_line1,
            houseNumber: rawData.customer.addr_line2 || "",
            city: rawData.customer.addr_city,
            zip: rawData.customer.addr_zip,
            weight: totalWeightKg,
            length: maxL,
            width: maxW,
            height: sumH
          });
          barcode = packet.barcode || packet.packetId;
        }

        // Update DB
        await supabaseAdmin.from('orders').update({ tracking_number: barcode }).eq('id', order.id);

        // Send Email (Fără să oprim generarea dacă dă eroare)
        if (rawData.customer.email && barcode) {
          try {
            await sendAwbTrackingEmail(rawData.customer.email, rawData, barcode, courier);
          } catch (emailErr) {
            console.warn(`Could not send tracking email for order ${order.id}:`, emailErr);
            // We DO NOT push to `errors` because the AWB itself was generated successfully!
          }
        }

        successCount++;
      } catch (err: any) {
        const rawMsg = err instanceof Error ? err.message : String(err);
        const displayId = getCanonicalOrderNumber(order);
        const cleanMsg = parseAwbError(rawMsg, displayId);
        console.error(`Error generating AWB for order ${displayId}:`, rawMsg);
        errors.push({ id: displayId, message: cleanMsg });
      }
    }

    return { 
      success: true, 
      generatedCount: successCount, 
      errors: errors.length > 0 ? errors : null 
    };

  } catch (error: any) {
    console.error("Fatal AWB Generation Error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteAwbAction(orderId: string) {
  try {
    const isAuthorized = await isAdminAuthorized();
    if (!isAuthorized) {
      return { success: false, error: 'Unauthorized' };
    }

    const { getFulfillmentSettings } = await import('@/app/actions/admin-fulfillment');
    const fSettings = await getFulfillmentSettings();
    if (fSettings.manual_shipping_enabled) {
      return { 
        success: false, 
        error: 'Expedierea manuală este activă în Setări. Resetarea de AWB este blocată.' 
      };
    }

    // First fetch the order to get tracking number
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
    let query = supabaseAdmin.from('orders').select('id, tracking_number, carrier_id, addr_country');
    if (isUuid) {
      query = query.eq('id', orderId);
    } else {
      const safeOrderId = String(orderId || '').replace(/[^a-zA-Z0-9_-]/g, '');
      if (!safeOrderId) return { success: false, error: 'ID comandă invalid' };
      query = query.or(`payment_intent_id.eq.${safeOrderId},receipt_url.ilike.%${safeOrderId}%`);
    }
    const { data: order, error: fetchError } = await query.maybeSingle();

    if (fetchError || !order) throw (fetchError || new Error("Comanda nu a fost găsită"));

    // Call courier API to cancel AWB if it exists
    if (order?.tracking_number) {
      const isSameday = detectPrimaryCourier(order.tracking_number, order.addr_country, order.carrier_id) === 'sameday';
      if (!isSameday) {
        await cancelPacketaParcel(order.tracking_number);
      } else {
        await cancelSamedayAwb(order.tracking_number);
      }
    }

    const { error } = await supabaseAdmin
      .from('orders')
      .update({ tracking_number: null })
      .eq('id', order.id);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting AWB:", error);
    return { success: false, error: error.message };
  }
}

export async function syncAllTrackingAction() {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) return { success: false, error: 'Neautorizat' };

  try {
    const { syncUndeliveredOrdersTracking } = await import('@/lib/tracking-sync');
    const result = await syncUndeliveredOrdersTracking(100);
    return { success: true, result };
  } catch (error: any) {
    console.error("syncAllTrackingAction failed:", error);
    return { success: false, error: error.message };
  }
}

