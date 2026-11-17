import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  getStoredProgramFiles,
  type ProgramFileSlot,
  type StoredProgramFiles,
} from '@/lib/program-pdf-generator';
import {
  hasAnyDigitalProgram,
  resolveOrderEmailLocale,
  resolveOrderedPrograms,
} from '@/lib/programs';
import { getCanonicalOrderNumber } from '@/utils/admin-helpers';
import { sendProgramDeliveryEmail } from '@/lib/resend-service';

const NON_DELIVERABLE_STATUSES = new Set([
  'cancelled',
  'canceled',
  'anulata',
  'refunded',
  'returned',
  'failed',
  'initiated',
]);

export function hasPdfSlotAvailable(slot: string, storedFiles: StoredProgramFiles): boolean {
  const customUrl = storedFiles?.[slot];
  if (customUrl && typeof customUrl === 'string' && customUrl.startsWith('http')) {
    return true;
  }
  try {
    const localPath = path.join(process.cwd(), 'public', 'programs', `${slot}.pdf`);
    return fs.existsSync(localPath);
  } catch {
    return false;
  }
}

function isOrderEligibleForProgramDelivery(order: any): boolean {
  const email = String(order?.customer_email || '').trim();
  if (!email || !email.includes('@') || email.includes('lipsa-email@')) {
    return false;
  }

  const status = String(order?.status || '').toLowerCase().trim();
  if (NON_DELIVERABLE_STATUSES.has(status)) {
    return false;
  }

  const pm = String(order?.payment_method || '').toLowerCase().trim();
  const isCashOnDelivery = pm === 'cod' || pm === 'ramburs';
  if (!isCashOnDelivery) {
    const total = Number(order?.total_amount ?? 0);
    const hasPaymentProof = Boolean(order?.payment_intent_id || order?.receipt_url);
    if (status === 'pending' && total > 0 && !hasPaymentProof) {
      return false;
    }
  }

  return true;
}

export interface WaitingProgramDispatchResult {
  checkedCount: number;
  sentCount: number;
  skippedCount: number;
  failedCount: number;
  sentOrderNumbers: string[];
}

/**
 * Automatically delivers pending or partial digital program emails once PDF files become available.
 * Never resends already delivered orders and preserves each order's exact checkout/program language.
 */
export async function dispatchWaitingProgramOrders(options?: {
  triggerSlot?: ProgramFileSlot | string;
  limit?: number;
}): Promise<WaitingProgramDispatchResult> {
  const limit = Math.max(1, Math.min(50, options?.limit ?? 25));
  const triggerSlot = options?.triggerSlot ? String(options.triggerSlot).trim().toLowerCase() : null;

  const result: WaitingProgramDispatchResult = {
    checkedCount: 0,
    sentCount: 0,
    skippedCount: 0,
    failedCount: 0,
    sentOrderNumbers: [],
  };

  try {
    const [storedFiles, { data: orders, error }] = await Promise.all([
      getStoredProgramFiles(),
      supabaseAdmin
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(400),
    ]);

    if (error || !orders || orders.length === 0) {
      return result;
    }

    const nowMs = Date.now();
    const minCooldownMs = 2 * 60 * 1000;

    for (const order of orders) {
      if (result.sentCount >= limit) break;

      const items = Array.isArray(order.items) ? order.items : [];
      const hasDigital =
        hasAnyDigitalProgram(items) || order.carrier_metadata?.is_digital_only === true;
      if (!hasDigital) continue;

      result.checkedCount++;

      if (!isOrderEligibleForProgramDelivery(order)) {
        result.skippedCount++;
        continue;
      }

      const initialPrograms = resolveOrderedPrograms(items, 'ro');
      const orderLocale = resolveOrderEmailLocale(order, initialPrograms);
      const orderedPrograms = resolveOrderedPrograms(items, orderLocale);
      if (orderedPrograms.length === 0) {
        result.skippedCount++;
        continue;
      }

      const orderedSlots = orderedPrograms.map((p) => `${p.programKey}-${p.lang}`);
      const readySlotsNow = orderedSlots.filter((s) => hasPdfSlotAvailable(s, storedFiles));
      if (readySlotsNow.length === 0) {
        result.skippedCount++;
        continue;
      }

      const deliveryMeta = order.carrier_metadata?.program_delivery || null;
      const deliveredSlots = new Set<string>(
        Array.isArray(deliveryMeta?.deliveredSlots) ? deliveryMeta.deliveredSlots : []
      );

      // Skip already fully delivered orders
      if (
        deliveryMeta?.status === 'delivered' &&
        orderedSlots.every((slot) => deliveredSlots.has(slot))
      ) {
        result.skippedCount++;
        continue;
      }

      // Skip orders sent just moments ago to avoid duplicate rapid dispatches
      if (deliveryMeta?.lastSentAt) {
        const lastSentMs = Date.parse(String(deliveryMeta.lastSentAt));
        if (Number.isFinite(lastSentMs) && nowMs - lastSentMs < minCooldownMs) {
          result.skippedCount++;
          continue;
        }
      }

      // Only send if at least one newly available slot hasn't been delivered yet
      const newlyReadySlots = readySlotsNow.filter((s) => !deliveredSlots.has(s));
      if (newlyReadySlots.length === 0) {
        result.skippedCount++;
        continue;
      }

      if (triggerSlot && !orderedSlots.includes(triggerSlot) && deliveryMeta) {
        // When triggered specifically by uploading slot X, skip unrelated partial/pending orders
        // only if they already received a pending notification (daily cron will still sweep everything)
        if (deliveryMeta.status === 'pending_pdf' || deliveryMeta.status === 'partial') {
          result.skippedCount++;
          continue;
        }
      }

      const email = String(order.customer_email).trim();
      const orderNumber = getCanonicalOrderNumber(order);

      try {
        await sendProgramDeliveryEmail(
          email,
          {
            id: orderNumber,
            supabaseId: String(order.id),
            locale: orderLocale,
            customer: {
              firstName: order.customer_firstname || '',
              lastName: order.customer_lastname || '',
              name: `${order.customer_firstname || ''} ${order.customer_lastname || ''}`.trim(),
              email,
            },
          },
          orderedPrograms,
          {
            trigger: 'auto',
            orderSupabaseId: String(order.id),
          }
        );

        result.sentCount++;
        result.sentOrderNumbers.push(orderNumber);
      } catch (sendErr) {
        console.error(`[PROGRAM QUEUE] Failed delivering pending order ${orderNumber}:`, sendErr);
        result.failedCount++;
      }
    }

    return result;
  } catch (err) {
    console.error('[PROGRAM QUEUE] dispatchWaitingProgramOrders error:', err);
    return result;
  }
}

