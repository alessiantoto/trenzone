'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminAuthorized } from './admin-auth';
import { sendReviewEmail } from '@/lib/resend-service';
import { getCanonicalOrderNumber } from '@/utils/admin-helpers';
import { recordDeletedStripePaymentIntentIds } from '@/lib/stripe-order-sync';

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
    const { data: order, error } = await query
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

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

    let fetchQuery = supabaseAdmin
      .from('orders')
      .select('id, payment_intent_id, carrier_metadata');
    if (isUuid) {
      fetchQuery = fetchQuery.eq('id', orderId);
    } else {
      fetchQuery = fetchQuery.or(`payment_intent_id.eq.${safeOrderId},receipt_url.ilike.%${safeOrderId}%`);
    }

    const { data: matchedOrders, error: fetchErr } = await fetchQuery;
    if (fetchErr) {
      console.error("Error inspecting order before delete:", fetchErr);
      throw new Error("Eroare la verificarea comenzii înainte de ștergere.");
    }

    const rows = Array.isArray(matchedOrders) ? matchedOrders : [];
    const stripePiIds = rows
      .map((row: any) => String(row?.payment_intent_id || '').trim())
      .filter((pi: string) => pi.startsWith('pi_'));

    const dispatchedRow = rows.find((row: any) => Boolean(row?.carrier_metadata?.fulfillment_dispatched_at));
    const wasDispatchedToFulfillment = Boolean(dispatchedRow);
    const dispatchedAt = dispatchedRow?.carrier_metadata?.fulfillment_dispatched_at || null;

    // Persist Stripe PaymentIntent tombstones BEFORE deleting so cron reconciliation never recreates this order
    if (stripePiIds.length > 0) {
      await recordDeletedStripePaymentIntentIds(stripePiIds);
    }

    let deleteQuery = supabaseAdmin.from('orders').delete();
    if (rows.length > 0) {
      deleteQuery = deleteQuery.in('id', rows.map((r: any) => r.id));
    } else if (isUuid) {
      deleteQuery = deleteQuery.eq('id', orderId);
    } else {
      deleteQuery = deleteQuery.or(`payment_intent_id.eq.${safeOrderId},receipt_url.ilike.%${safeOrderId}%`);
    }
    const { error } = await deleteQuery;

    if (error) {
      console.error("Error deleting order:", error);
      throw new Error("Eroare la ștergerea comenzii.");
    }

    try {
      revalidateTag('orders', 'max');
      revalidateTag('global_settings', 'max');
      revalidatePath('/admin/orders');
      revalidatePath('/admin/fulfillment');
      revalidatePath('/admin/preorders');
      revalidatePath('/admin');
    } catch (_) {}

    return {
      success: true,
      wasDispatchedToFulfillment,
      dispatchedAt,
      deletedStripePiCount: stripePiIds.length,
    };
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

    if (data.customerFirstName !== undefined) updatePayload.customer_firstname = String(data.customerFirstName).trim().slice(0, 100);
    if (data.customerLastName !== undefined) updatePayload.customer_lastname = String(data.customerLastName).trim().slice(0, 100);
    if (data.customerPhone !== undefined) updatePayload.customer_phone = String(data.customerPhone).trim().slice(0, 30);
    if (data.customerEmail !== undefined) updatePayload.customer_email = String(data.customerEmail).trim().toLowerCase().slice(0, 150);
    if (data.addrLine1 !== undefined) updatePayload.addr_line1 = String(data.addrLine1).trim().slice(0, 200);
    if (data.addrLine2 !== undefined) updatePayload.addr_line2 = String(data.addrLine2).trim().slice(0, 200);
    if (data.addrCity !== undefined) updatePayload.addr_city = String(data.addrCity).trim().slice(0, 100);
    if (data.addrZip !== undefined) updatePayload.addr_zip = String(data.addrZip).trim().slice(0, 20);
    // Țara comenzii este fixă (nu se poate modifica pentru a nu invalida tarifele și rutele de transport)

    if (Object.keys(updatePayload).length === 0) {
      throw new Error("Niciun câmp de actualizat.");
    }

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

    try {
      revalidateTag('orders', 'max');
      revalidatePath('/admin/orders');
      revalidatePath('/admin/fulfillment');
    } catch (_) {}

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
    const cleanStatus = String(status || '').trim().toLowerCase();
    if (!/^[a-z0-9_-]{2,40}$/.test(cleanStatus)) {
      throw new Error("Status comandă invalid.");
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
    let query = supabaseAdmin.from('orders').update({ 
      status: cleanStatus, 
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

    try {
      revalidateTag('orders', 'max');
      revalidatePath('/admin/orders');
      revalidatePath('/admin/fulfillment');
      revalidatePath('/admin/preorders');
    } catch (_) {}

    return { success: true };
  } catch (error: any) {
    console.error("updateOrderStatusAction failed:", error);
    return { success: false, error: error.message };
  }
}


