'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminAuthorized } from './admin-auth';
import { sendReturnConfirmationEmail } from '@/lib/resend-service';
import { rateLimiters, getClientIpFromHeaders, checkRateLimit } from '@/lib/ratelimit';
import { getCanonicalOrderNumber } from '@/utils/admin-helpers';
import { headers } from 'next/headers';

// For the public frontend form
export async function submitReturnRequest(formData: FormData) {
  try {
    // 🛡️ 1. Anti-Bot: Honeypot check (silently drop bots)
    const honeypot = ((formData.get('company_name') as string) || (formData.get('website') as string) || '').trim();
    if (honeypot) {
      console.warn(`🤖 [BOT DETECTED] Honeypot triggered in return form: ${honeypot}`);
      return { success: true };
    }

    // 🛡️ 2. Anti-Bot: Submission timing check (humans take at least 2.5s)
    const formLoadedAt = Number(formData.get('form_loaded_at') || 0);
    if (formLoadedAt > 0) {
      const elapsed = Date.now() - formLoadedAt;
      if (elapsed < 2000) {
        console.warn(`🤖 [BOT DETECTED] Return form submitted unnaturally fast (${elapsed}ms)`);
        return { success: true };
      }
    }

    // 🛡️ 3. Anti-Bot: Rate Limiting per IP
    let clientIp = '127.0.0.1';
    try {
      const headersList = await headers();
      clientIp = getClientIpFromHeaders(headersList);
    } catch (_) {}

    const locale: 'ro' | 'en' = ((formData.get('locale') as string) || '').toLowerCase() === 'en' ? 'en' : 'ro';

    const { allowed } = await checkRateLimit(rateLimiters.returns, clientIp, 'returns');
    if (!allowed) {
      return { 
        success: false, 
        error: locale === 'en'
          ? 'Too many requests in a short period. Please wait a few minutes before trying again.'
          : 'Ai trimis prea multe solicitări într-un timp scurt. Te rugăm să aștepți câteva minute înainte de a încerca din nou.' 
      };
    }

    // 🛡️ 4. Sanitize & Validate inputs
    const rawOrderId = ((formData.get('order_id') as string) || '').trim().replace(/^#/, '').slice(0, 50);
    const name = ((formData.get('customer_name') as string) || '').trim().slice(0, 100);
    const email = ((formData.get('customer_email') as string) || '').trim().toLowerCase().slice(0, 150);
    const phone = ((formData.get('customer_phone') as string) || '').trim().slice(0, 30);
    const rawIban = ((formData.get('iban') as string) || '').trim();
    const reason = ((formData.get('reason') as string) || '').trim().slice(0, 1000);

    if (!rawOrderId || !name || !email || !rawIban) {
      return { 
        success: false, 
        error: locale === 'en' 
          ? 'All required fields must be completed.' 
          : 'Toate câmpurile obligatorii trebuie completate.' 
      };
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { 
        success: false, 
        error: locale === 'en' 
          ? 'The email address is invalid.' 
          : 'Adresa de email este invalidă.' 
      };
    }

    // 5. Sanitize & Validate IBAN format (International ISO 13616 standard)
    const cleanIban = rawIban.replace(/\s+/g, '').toUpperCase();
    const ibanRegex = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/;
    if (!ibanRegex.test(cleanIban)) {
      return {
        success: false,
        error: locale === 'en'
          ? 'The IBAN account format is invalid. Please enter a valid IBAN (domestic or international / SEPA).'
          : 'Formatul contului IBAN este invalid. Te rugăm să introduci un IBAN valid (românesc sau internațional / SEPA).'
      };
    }

    // 6. Resilient Order Search: Check that the combination of email and order number exists in the database
    const cleanOrderId = rawOrderId.replace(/^#/, '').trim();
    const safeOrderId = cleanOrderId.replace(/[^A-Za-z0-9_-]/g, '');
    const canonicalInput = getCanonicalOrderNumber(cleanOrderId);
    const numberOnly = safeOrderId.replace(/^(?:tz|odin)[-_ ]?/i, '');
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanOrderId);
    const safeEmail = email.replace(/[%_(),]/g, '');

    if (!safeOrderId || !safeEmail) {
      return {
        success: false,
        error: locale === 'en'
          ? 'Order not found. Please verify that your order number and email address match your order.'
          : 'Comanda nu a fost găsită. Verifică combinația dintre numărul comenzii și adresa de email folosită la comandă.'
      };
    }

    // Strategy A: First query orders by customer email (handles multiple orders cleanly)
    const { data: customerOrders, error: emailQueryErr } = await supabaseAdmin
      .from('orders')
      .select('id, customer_email, status, payment_intent_id, receipt_url, total_amount, carrier_metadata, tracking_metadata')
      .ilike('customer_email', safeEmail);

    if (emailQueryErr) {
      console.error('Error querying orders by email:', emailQueryErr);
    }

    let matchingOrder = (customerOrders || []).find(o => {
      const canonical = getCanonicalOrderNumber(o).toLowerCase();
      const pi = (o.payment_intent_id || '').toLowerCase();
      const rc = (o.receipt_url || '').toLowerCase();
      const id = (o.id || '').toLowerCase();
      const q = safeOrderId.toLowerCase();
      const qCanon = canonicalInput.toLowerCase();
      const qNum = numberOnly.toLowerCase();
      const hasValidNum = qNum.length >= 3;

      return (
        canonical === qCanon ||
        (hasValidNum && canonical.includes(qNum)) ||
        pi === q ||
        pi === qCanon ||
        (hasValidNum && pi.includes(qNum)) ||
        (q.length >= 4 && rc.includes(q)) ||
        (hasValidNum && rc.includes(qNum)) ||
        (q.length >= 8 && id.startsWith(q))
      );
    });

    // Strategy B: If not matched in customer's email list, query by sanitized order ID + exact email match
    if (!matchingOrder) {
      let globalQuery = supabaseAdmin
        .from('orders')
        .select('id, customer_email, status, payment_intent_id, receipt_url, total_amount, carrier_metadata, tracking_metadata')
        .ilike('customer_email', safeEmail);

      if (isUuid) {
        globalQuery = globalQuery.or(`id.eq.${cleanOrderId},payment_intent_id.ilike.%${safeOrderId}%,receipt_url.ilike.%${safeOrderId}%`);
      } else {
        const queryTerm = (numberOnly.length >= 3 ? numberOnly : safeOrderId).replace(/[^A-Za-z0-9_-]/g, '');
        globalQuery = globalQuery.or(`payment_intent_id.ilike.%${queryTerm}%,receipt_url.ilike.%${queryTerm}%,payment_intent_id.ilike.%${safeOrderId}%`);
      }

      const { data: matchedOrders } = await globalQuery.limit(5);

      if (matchedOrders && matchedOrders.length > 0) {
        matchingOrder = matchedOrders.find(
          (o) => o.customer_email && o.customer_email.trim().toLowerCase() === safeEmail
        );
      }
    }

    if (!matchingOrder) {
      return { 
        success: false, 
        error: locale === 'en'
          ? 'Order not found. Please verify that your order number (e.g. TZ-2026-9003) and email address match your order.'
          : 'Comanda nu a fost găsită. Verifică combinația dintre numărul comenzii (ex: TZ-2026-9003) și adresa de email folosită la comandă.' 
      };
    }

    // 7. Check if order is already returned or refunded
    if (matchingOrder.status === 'returned' || matchingOrder.status === 'refunded') {
      return { 
        success: false, 
        error: locale === 'en'
          ? 'This order has already been marked as returned or refunded.'
          : 'Această comandă a fost deja înregistrată ca returnată / rambursată.' 
      };
    }

    // 8. Check if a return already exists for this order
    const { data: existingReturn } = await supabaseAdmin
      .from('returns')
      .select('id, status')
      .eq('order_id', matchingOrder.id)
      .maybeSingle();

    if (existingReturn) {
      return { 
        success: false, 
        error: locale === 'en'
          ? 'A return request is already registered for this order.'
          : 'Există deja o cerere de retur înregistrată pentru această comandă.' 
      };
    }

    // 9. Insert into returns table with real order UUID and details provided for contact & refund
    const { error: insertError } = await supabaseAdmin
      .from('returns')
      .insert([
        {
          order_id: matchingOrder.id,
          customer_name: name,
          customer_email: email,
          customer_phone: phone,
          iban: cleanIban,
          reason: reason,
          status: 'pending'
        }
      ]);

    if (insertError) {
      console.error('Error inserting return:', insertError);
      throw new Error(locale === 'en' ? 'Internal error processing the return.' : 'Eroare internă la procesarea returului.');
    }

    // 10. Send confirmation email with canonical TZ- order number and appropriate locale
    try {
      const displayOrderId = getCanonicalOrderNumber(matchingOrder);
      await sendReturnConfirmationEmail(email, displayOrderId, name, locale);
    } catch (emailError) {
      console.error('Error sending return confirmation email:', emailError);
    }

    return { success: true };
  } catch (error: any) {
    console.error('submitReturnRequest error:', error);
    return { success: false, error: error.message || 'Eroare neașteptată.' };
  }
}

// For the Admin Dashboard
export async function getAdminReturns() {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error('Neautorizat');

  const { data, error } = await supabaseAdmin
    .from('returns')
    .select(`
      *,
      orders (
        id,
        payment_intent_id,
        receipt_url,
        total_amount,
        status,
        created_at,
        carrier_metadata,
        tracking_metadata
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching returns:', error);
    return [];
  }

  return data;
}

export async function updateReturnStatus(returnId: string, newStatus: string, orderId: string) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) return { success: false, error: 'Neautorizat' };

  try {
    // 1. Update return status
    const { error: updateError } = await supabaseAdmin
      .from('returns')
      .update({ status: newStatus })
      .eq('id', returnId);

    if (updateError) throw updateError;

    // 2. If it's refunded or marked as returned, update original order status in orders table to 'returned'
    if (newStatus === 'refunded' || newStatus === 'returned') {
      const { error: orderUpdateError } = await supabaseAdmin
        .from('orders')
        .update({ status: 'returned' })
        .eq('id', orderId);

      if (orderUpdateError) throw orderUpdateError;
    }

    return { success: true };
  } catch (error: any) {
    console.error('updateReturnStatus error:', error);
    return { success: false, error: error.message };
  }
}

