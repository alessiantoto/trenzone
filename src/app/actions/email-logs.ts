'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminAuthorized } from './admin-auth';
import { revalidatePath } from 'next/cache';
import { getSiteUrl } from '@/lib/site-config';
import { generateInvoicePdf } from '@/lib/invoice';
import {
  sendOrderConfirmationEmail,
  sendProgramDeliveryEmail,
  sendAffiliateApprovalEmail,
  sendAffiliateApplicationReceivedEmail,
  sendReturnConfirmationEmail,
  sendWelcomeEmail,
  sendReviewDiscountEmail,
  sendReviewEmail,
  sendAwbTrackingEmail,
} from '@/lib/resend-service';

export interface EmailLog {
  id: string;
  created_at: string;
  recipient: string;
  subject: string;
  type: string;
  status: string;
  error_message: string | null;
  metadata: any;
}

const CRITICAL_EMAIL_TYPES = new Set([
  'order-confirmation',
  'preorder-confirmation',
  'program-delivery',
  'program-pending',
  'awb-tracking',
  'return-confirmation',
  'affiliate-approval',
  'review-discount',
]);

const SECONDARY_EMAIL_TYPES = new Set([
  'affiliate-application',
]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isQuotaError(msg: string): boolean {
  const m = msg.toLowerCase();
  return m.includes('daily email sending quota') || m.includes('quota') || m.includes('rate limit');
}

async function resolveOrderRowForLog(log: EmailLog) {
  const orderNumber =
    log.metadata?.orderId ||
    log.metadata?.orderData?.id ||
    log.metadata?.orderData?.orderNumber ||
    '';

  if (orderNumber) {
    const cleanNum = String(orderNumber).trim();
    const { data: byMeta } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('carrier_metadata->>order_number', cleanNum)
      .limit(1)
      .maybeSingle();
    if (byMeta) return byMeta;

    const { data: byPi } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('payment_intent_id', cleanNum)
      .limit(1)
      .maybeSingle();
    if (byPi) return byPi;
  }

  const recipient = String(log.recipient || '').trim().toLowerCase();
  if (recipient) {
    const { data: candidates } = await supabaseAdmin
      .from('orders')
      .select('*')
      .ilike('customer_email', recipient)
      .order('created_at', { ascending: false })
      .limit(5);
    if (candidates && candidates.length > 0) {
      return candidates.find((o: any) => o.status !== 'cancelled') || candidates[0];
    }
  }
  return null;
}

async function markMatchingFailedLogsResolved(log: EmailLog) {
  try {
    const centerMs = new Date(log.created_at).getTime();
    if (Number.isFinite(centerMs)) {
      const fromIso = new Date(centerMs - 120 * 1000).toISOString();
      const toIso = new Date(centerMs + 120 * 1000).toISOString();
      await supabaseAdmin
        .from('email_logs')
        .delete()
        .ilike('recipient', String(log.recipient || '').trim())
        .eq('type', log.type)
        .neq('status', 'sent')
        .gte('created_at', fromIso)
        .lte('created_at', toIso);
    } else {
      await supabaseAdmin
        .from('email_logs')
        .delete()
        .eq('id', log.id);
    }
  } catch (err) {
    console.warn('Could not clean resolved failed logs:', err);
  }
}

async function dispatchResendForLog(log: EmailLog): Promise<{ skipped?: boolean; reason?: string }> {
  const recipient = String(log.recipient || '').trim();
  if (!recipient || !recipient.includes('@')) {
    throw new Error('Adresă de email invalidă în log.');
  }

  const meta = log.metadata && typeof log.metadata === 'object' ? log.metadata : {};
  const baseUrl = getSiteUrl();

  switch (log.type) {
    case 'order-confirmation':
    case 'preorder-confirmation': {
      const orderRow = await resolveOrderRowForLog(log);
      const rawOrderData = meta.orderData;
      if (!rawOrderData && !orderRow) {
        throw new Error('Nu există datele comenzii pentru retrimitere.');
      }

      const locale: 'ro' | 'en' =
        String(rawOrderData?.locale || orderRow?.carrier_metadata?.locale || '').toLowerCase().startsWith('en')
          ? 'en'
          : 'ro';

      const builtOrderData = rawOrderData || {
        id: orderRow.carrier_metadata?.order_number || orderRow.payment_intent_id || orderRow.id,
        date: new Date(orderRow.created_at).toLocaleDateString('ro-RO'),
        currency: orderRow.currency || 'RON',
        total: Number(orderRow.total_amount || 0),
        subtotal: Number(orderRow.subtotal || 0),
        discount: Number(orderRow.discount_total || 0),
        cardDiscount: Number(orderRow.carrier_metadata?.card_discount || 0),
        shipping: Number(orderRow.shipping_amount || 0),
        locale,
        status: orderRow.status,
        isPreorder: orderRow.status === 'preorder' || log.type === 'preorder-confirmation',
        paymentMethod: orderRow.payment_method || 'online',
        shippingType: orderRow.shipping_type || 'hd',
        carrierId: orderRow.carrier_id || 'sameday',
        trackingNumber: orderRow.tracking_number || undefined,
        priorityProcessing: Boolean(orderRow.priority_processing),
        giftPackaging: Boolean(orderRow.gift_packaging),
        giftMessage: orderRow.gift_message || null,
        items: Array.isArray(orderRow.items) ? orderRow.items : [],
        customer: {
          firstName: orderRow.customer_firstname || '',
          lastName: orderRow.customer_lastname || '',
          name: `${orderRow.customer_firstname || ''} ${orderRow.customer_lastname || ''}`.trim() || 'Client',
          email: orderRow.customer_email || recipient,
          phone: orderRow.customer_phone || '',
          addr_line1: orderRow.addr_line1 || '',
          addr_city: orderRow.addr_city || '',
          addr_zip: orderRow.addr_zip || '',
          addr_county: orderRow.addr_county || '',
          addr_country: orderRow.addr_country || 'RO',
        },
      };

      let pdfBuffer: Buffer | undefined;
      try {
        pdfBuffer = await generateInvoicePdf(builtOrderData);
      } catch (pdfErr) {
        console.warn('Invoice PDF skipped on resend:', pdfErr);
      }

      await sendOrderConfirmationEmail(recipient, builtOrderData, pdfBuffer);

      if (orderRow?.id) {
        const nowIso = new Date().toISOString();
        const cleanedMeta = orderRow.carrier_metadata && typeof orderRow.carrier_metadata === 'object'
          ? { ...orderRow.carrier_metadata }
          : {};
        delete cleanedMeta.last_comm_error;
        await supabaseAdmin
          .from('orders')
          .update({
            email_sent_at: orderRow.email_sent_at || nowIso,
            carrier_metadata: cleanedMeta,
            updated_at: nowIso,
          })
          .eq('id', orderRow.id);
      }
      return {};
    }

    case 'program-delivery':
    case 'program-pending': {
      const orderRow = await resolveOrderRowForLog(log);
      const programs = Array.isArray(meta.programs) ? meta.programs : [];
      if (programs.length === 0) {
        throw new Error('Nu există lista programelor digitale în log.');
      }
      const orderId = String(meta.orderId || orderRow?.carrier_metadata?.order_number || orderRow?.id || '');
      const locale: 'ro' | 'en' = String(programs[0]?.lang || orderRow?.carrier_metadata?.locale || 'ro') === 'en' ? 'en' : 'ro';
      await sendProgramDeliveryEmail(
        recipient,
        {
          id: orderId,
          supabaseId: orderRow?.id ? String(orderRow.id) : undefined,
          locale,
          customer: {
            firstName: orderRow?.customer_firstname || '',
            lastName: orderRow?.customer_lastname || '',
            name: orderRow
              ? `${orderRow.customer_firstname || ''} ${orderRow.customer_lastname || ''}`.trim()
              : 'Client',
            email: recipient,
          },
        },
        programs,
        {
          trigger: 'manual',
          orderSupabaseId: orderRow?.id ? String(orderRow.id) : undefined,
        }
      );
      return {};
    }

    case 'affiliate-approval': {
      const { data: aff } = await supabaseAdmin
        .from('affiliates')
        .select('name, code, commission_percent, social_links')
        .ilike('email', recipient)
        .limit(1)
        .maybeSingle();

      const locale: 'ro' | 'en' =
        (meta.locale || aff?.social_links?.locale) === 'en' ? 'en' : 'ro';
      const name = String(meta.name || aff?.name || 'Partener');
      const code = String(meta.code || aff?.code || '');
      const commission = Number(aff?.commission_percent ?? meta.commission ?? 10);
      const loginUrl = String(meta.loginUrl || `${baseUrl}/${locale}/affiliate/login`);
      await sendAffiliateApprovalEmail(recipient, name, code, locale, loginUrl, commission);
      return {};
    }

    case 'affiliate-application': {
      const locale: 'ro' | 'en' = meta.locale === 'en' ? 'en' : 'ro';
      const name = String(meta.name || 'Partener');
      const preferredCode = String(meta.preferredCode || '');
      const loginUrl = String(meta.loginUrl || `${baseUrl}/${locale}/affiliate/login`);
      await sendAffiliateApplicationReceivedEmail(recipient, name, preferredCode, locale, loginUrl);
      return {};
    }

    case 'welcome-discount': {
      const locale: 'ro' | 'en' = meta.locale === 'en' ? 'en' : 'ro';
      const customerName = String(meta.customerName || (locale === 'en' ? 'Champion' : 'TrenZone'));
      await sendWelcomeEmail(recipient, customerName, locale);
      return {};
    }

    case 'return-confirmation': {
      const locale: 'ro' | 'en' = meta.locale === 'en' ? 'en' : 'ro';
      const orderId = String(meta.orderId || '');
      const customerName = String(meta.customerName || 'Client');
      await sendReturnConfirmationEmail(recipient, orderId, customerName, locale);
      return {};
    }

    case 'review-discount': {
      const locale: 'ro' | 'en' = meta.locale === 'en' ? 'en' : 'ro';
      const customerName = String(meta.customerName || (locale === 'en' ? 'Champion' : 'Campionule'));
      let couponCode = String(meta.couponCode || '');
      const couponValue = Number(meta.couponValue || 10);
      if (!couponCode) {
        const { data: c } = await supabaseAdmin
          .from('coupons')
          .select('code')
          .ilike('description', `%${customerName}%`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        couponCode = c?.code || 'TREN10';
      }
      await sendReviewDiscountEmail(recipient, customerName, locale, couponCode, couponValue);
      return {};
    }

    case 'review-request': {
      if (!meta.orderData) throw new Error('Lipsesc datele comenzii din log.');
      await sendReviewEmail(recipient, meta.orderData);
      return {};
    }

    case 'awb-tracking': {
      if (!meta.orderData || !meta.trackingNumber) {
        throw new Error('Lipsesc datele AWB din log.');
      }
      await sendAwbTrackingEmail(recipient, meta.orderData, String(meta.trackingNumber), meta.courier || 'sameday');
      return {};
    }

    default:
      throw new Error(`Retrimiterea automată nu este suportată pentru tipul "${log.type}".`);
  }
}

export async function getEmailLogs(): Promise<EmailLog[]> {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error('Neautorizat');

  const { data, error } = await supabaseAdmin
    .from('email_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) {
    console.error('Error fetching email logs:', error);
    return [];
  }
  return data as EmailLog[];
}

export async function resendSingleEmailLogAction(logId: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) return { success: false, error: 'Neautorizat.' };

  try {
    const { data: log, error } = await supabaseAdmin
      .from('email_logs')
      .select('*')
      .eq('id', logId)
      .maybeSingle();

    if (error || !log) {
      return { success: false, error: 'Log-ul emailului nu a fost găsit.' };
    }

    await dispatchResendForLog(log as EmailLog);
    await markMatchingFailedLogsResolved(log as EmailLog);
    revalidatePath('/admin/emails/history');
    revalidatePath('/admin/orders');

    return { success: true, message: `Email retrimis cu succes către ${log.recipient}!` };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Eroare la retrimiterea emailului.' };
  }
}

export async function resendBatchFailedEmailsAction(
  scope: 'critical' | 'secondary',
  maxCount: number = 40
): Promise<{
  success: boolean;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  quotaReached: boolean;
  errors: string[];
  message: string;
}> {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) {
    return {
      success: false,
      sentCount: 0,
      failedCount: 0,
      skippedCount: 0,
      quotaReached: false,
      errors: ['Neautorizat.'],
      message: 'Neautorizat.',
    };
  }

  const targetTypes = scope === 'critical' ? CRITICAL_EMAIL_TYPES : SECONDARY_EMAIL_TYPES;

  const { data: allLogs, error } = await supabaseAdmin
    .from('email_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error || !allLogs) {
    return {
      success: false,
      sentCount: 0,
      failedCount: 0,
      skippedCount: 0,
      quotaReached: false,
      errors: [error?.message || 'Eroare la citirea jurnalului.'],
      message: 'Eroare la citirea jurnalului.',
    };
  }

  const alreadySentKeys = new Set<string>();
  for (const row of allLogs) {
    if (row.status === 'sent') {
      const orderNum = row.metadata?.orderData?.id || row.metadata?.orderId || '';
      alreadySentKeys.add(`${String(row.recipient || '').trim().toLowerCase()}|${row.type}|${orderNum}`);
    }
  }

  // Deduplicate failed entries (newest/richest metadata first)
  const dedupedFailed = new Map<string, EmailLog>();
  for (const row of allLogs as EmailLog[]) {
    if (row.status === 'sent') continue;
    if (!targetTypes.has(row.type)) continue;
    const orderNum = row.metadata?.orderData?.id || row.metadata?.orderId || '';
    const key = `${String(row.recipient || '').trim().toLowerCase()}|${row.type}|${orderNum}`;
    if (alreadySentKeys.has(key)) {
      // Old failed duplicate where a newer 'sent' already exists — clean silently
      await markMatchingFailedLogsResolved(row);
      continue;
    }
    const existing = dedupedFailed.get(key);
    const hasRichMeta = Boolean(row.metadata?.orderData?.items || row.metadata?.programs || row.metadata?.name);
    const existingHasRichMeta = Boolean(existing?.metadata?.orderData?.items || existing?.metadata?.programs || existing?.metadata?.name);
    if (!existing || (hasRichMeta && !existingHasRichMeta)) {
      dedupedFailed.set(key, row);
    }
  }

  const candidates = Array.from(dedupedFailed.values()).slice(0, Math.max(1, maxCount));
  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  let quotaReached = false;
  const errors: string[] = [];

  for (const log of candidates) {
    // Skip cancelled orders in critical batch mode
    if (scope === 'critical' && (log.type === 'order-confirmation' || log.type === 'preorder-confirmation' || log.type === 'program-delivery' || log.type === 'program-pending')) {
      const orderRow = await resolveOrderRowForLog(log);
      if (orderRow?.status === 'cancelled') {
        skippedCount++;
        continue;
      }
    }

    try {
      await dispatchResendForLog(log);
      await markMatchingFailedLogsResolved(log);
      sentCount++;
    } catch (err: any) {
      const msg = err?.message || String(err);
      failedCount++;
      errors.push(`${log.recipient}: ${msg}`);
      if (isQuotaError(msg)) {
        quotaReached = true;
        break;
      }
    }

    // Respect Resend 2 req/sec rate limit
    await sleep(650);
  }

  revalidatePath('/admin/emails/history');
  revalidatePath('/admin/orders');

  const message = quotaReached
    ? `Trimise: ${sentCount}. Oprit pentru că Resend a atins limita zilnică — mai încearcă după resetare sau upgradează planul Resend.`
    : `Finalizat! Trimise: ${sentCount}, sărite (anulate): ${skippedCount}, eșuate: ${failedCount}.`;

  return {
    success: failedCount === 0 && !quotaReached,
    sentCount,
    failedCount,
    skippedCount,
    quotaReached,
    errors,
    message,
  };
}
