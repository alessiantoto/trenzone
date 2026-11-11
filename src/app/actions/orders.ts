'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminAuthorized } from './admin-auth';
import { sendReviewEmail } from '@/lib/resend-service';
import { getCanonicalOrderNumber } from '@/utils/admin-helpers';

function sanitizeOrderIdFilter(rawId: string): string {
  return String(rawId || '').trim().replace(/[^a-zA-Z0-9_-]/g, '');
}

export async function sendReviewRequestAction(orderId: string) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) return { success: false, error: 'Neautorizat' };

  try {
    // 1. Fetch order details from DB (support both UUID and TZ-[A-Za-z0-9-]+)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
    const safeOrderId = sanitizeOrderIdFilter(orderId);
    if (!safeOrderId) throw new Error("ID comandă invalid.");

    let query = supabaseAdmin.from('orders').select('*');
    if (isUuid) {
      query = query.eq('id', orderId);
    } else {
      query = query.or(`payment_intent_id.eq.${safeOrderId},receipt_url.ilike.%${safeOrderId}%`);
    }
    const { data: order, error } = await query.maybeSingle();

    if (error || !order) {
      console.error("Error fetching order:", error);
      throw new Error("Comanda nu a fost gasită.");
    }

    // 2. Format orderData for the email template
    // The sendReviewEmail expects orderData to have: id, locale, customer.name, items
    const fullName = [order.customer_firstname, order.customer_lastname].filter(Boolean).join(' ').trim();
    const isRoCountry = !order.addr_country || ['RO', 'ROMANIA', 'ROMÂNIA'].includes(String(order.addr_country).toUpperCase().trim());
    const orderData = {
      id: getCanonicalOrderNumber(order),
      locale: order.locale || (isRoCountry ? 'ro' : 'en'),
      customer: {
        name: fullName || order.customer_name || 'Client'
      },
      items: typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || [])
    };

    // 3. Send email via Resend
    const customerEmail = order.customer_email;
    if (!customerEmail) {
      throw new Error("Clientul nu are adresa de email validă.");
    }

    await sendReviewEmail(customerEmail, orderData);

    return { success: true };
  } catch (error: any) {
    console.error("sendReviewRequestAction failed:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteOrderAction(orderId: string) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) return { success: false, error: 'Neautorizat' };

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
    const safeOrderId = sanitizeOrderIdFilter(orderId);
    if (!safeOrderId) throw new Error("ID comandă invalid.");

    let query = supabaseAdmin.from('orders').delete();
    if (isUuid) {
      query = query.eq('id', orderId);
    } else {
      query = query.or(`payment_intent_id.eq.${safeOrderId},receipt_url.ilike.%${safeOrderId}%`);
    }
    const { error } = await query;

    if (error) {
      console.error("Error deleting order:", error);
      throw new Error("Eroare la ștergerea comenzii.");
    }

    return { success: true };
  } catch (error: any) {
    console.error("deleteOrderAction failed:", error);
    return { success: false, error: error.message };
  }
}

export async function updateOrderShippingAction(
  orderId: string,
  data: {
    customerFirstName?: string;
    customerLastName?: string;
    customerPhone?: string;
    customerEmail?: string;
    addrLine1?: string;
    addrLine2?: string;
    addrCity?: string;
    addrZip?: string;
    addrCountry?: string;
  }
) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) return { success: false, error: 'Neautorizat' };

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
    const updatePayload: Record<string, any> = {};

    if (data.customerFirstName !== undefined) updatePayload.customer_firstname = data.customerFirstName.trim();
    if (data.customerLastName !== undefined) updatePayload.customer_lastname = data.customerLastName.trim();
    if (data.customerPhone !== undefined) updatePayload.customer_phone = data.customerPhone.trim();
    if (data.customerEmail !== undefined) updatePayload.customer_email = data.customerEmail.trim();
    if (data.addrLine1 !== undefined) updatePayload.addr_line1 = data.addrLine1.trim();
    if (data.addrLine2 !== undefined) updatePayload.addr_line2 = data.addrLine2.trim();
    if (data.addrCity !== undefined) updatePayload.addr_city = data.addrCity.trim();
    if (data.addrZip !== undefined) updatePayload.addr_zip = data.addrZip.trim();
    // Țara comenzii este fixă (nu se poate modifica pentru a nu invalida tarifele și rutele de transport)

    const safeOrderId = sanitizeOrderIdFilter(orderId);
    if (!safeOrderId) throw new Error("ID comandă invalid.");

    let query = supabaseAdmin.from('orders').update(updatePayload);
    if (isUuid) {
      query = query.eq('id', orderId);
    } else {
      query = query.or(`payment_intent_id.eq.${safeOrderId},receipt_url.ilike.%${safeOrderId}%`);
    }

    const { error } = await query;
    if (error) {
      console.error("Error updating order shipping:", error);
      throw new Error(error.message || "Eroare la actualizarea comenzii.");
    }

    return { success: true };
  } catch (error: any) {
    console.error("updateOrderShippingAction failed:", error);
    return { success: false, error: error.message };
  }
}

export async function updateOrderStatusAction(orderId: string, status: string) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) return { success: false, error: 'Neautorizat' };

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
    let query = supabaseAdmin.from('orders').update({ 
      status, 
      updated_at: new Date().toISOString() 
    });

    const safeOrderId = sanitizeOrderIdFilter(orderId);
    if (!safeOrderId) throw new Error("ID comandă invalid.");

    if (isUuid) {
      query = query.eq('id', orderId);
    } else {
      query = query.or(`payment_intent_id.eq.${safeOrderId},receipt_url.ilike.%${safeOrderId}%`);
    }

    const { error } = await query;
    if (error) {
      console.error("Error updating order status:", error);
      throw new Error(error.message || "Eroare la actualizarea statusului comenzii.");
    }

    return { success: true };
  } catch (error: any) {
    console.error("updateOrderStatusAction failed:", error);
    return { success: false, error: error.message };
  }
}


