'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminAuthorized } from './admin-auth';
import { revalidatePath, revalidateTag } from 'next/cache';
import {
  FulfillmentSettings,
  FulfillmentDispatchLog,
  FulfillmentOrderSummary,
  FulfillmentItemSummary,
  FulfillmentOrderSnapshot
} from '@/types/fulfillment';
import { sendFulfillmentDispatchEmail, buildFulfillmentDispatchSubject } from '@/lib/resend-service';
import { getSingleFlavorImage } from '@/lib/product-images';
import { getCanonicalOrderNumber } from '@/utils/admin-helpers';
import { isDigitalOnlyCart, isDigitalProgramItem } from '@/lib/programs';
import { isItemSnapshotPreorder } from '@/utils/order-search';
import { headers } from 'next/headers';

export interface FulfillmentQueueOverview {
  pendingOrders: FulfillmentOrderSummary[];
  templatePreviewOrders: FulfillmentOrderSummary[];
  isSamplePreview: boolean;
  isHistoricalPreview: boolean;
  excludedPreorders: number;
  excludedMixedPreorders: number;
  skippedPreorderOrderIds: string[];
  excludedDigital: number;
  excludedAlreadyDispatched: number;
  excludedUnpaidOrInvalid: number;
}

export interface FulfillmentDispatchResult {
  success: boolean;
  count?: number;
  batchId?: string;
  recipient?: string;
  secondaryRecipient?: string | null;
  subject?: string;
  sentAt?: string;
  message?: string;
  error?: string;
  busy?: boolean;
  excludedPreorders?: number;
  excludedMixedPreorders?: number;
  skippedPreorderOrderIds?: string[];
  excludedDigital?: number;
  excludedAlreadyDispatched?: number;
  excludedUnpaidOrInvalid?: number;
  reconciliationWarning?: string;
}

const DISPATCH_LOCK_KEY = 'fulfillment_dispatch_lock';
const RECONCILIATION_LOG_KEY = 'fulfillment_reconciliation_logs';
const DISPATCH_LOCK_TTL_MS = 90_000;

// In-process mutex on top of the distributed DB CAS lock for same-instance bursts
let activeProcessDispatchPromise: Promise<FulfillmentDispatchResult> | null = null;

async function isAdminOrCronAuthorized(): Promise<boolean> {
  if (await isAdminAuthorized()) return true;
  try {
    const h = await headers();
    const authHeader = h.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      return true;
    }
  } catch {
    // Ignore headers error outside request context
  }
  return false;
}

const DEFAULT_SETTINGS: FulfillmentSettings = {
  email: 'curierat@tceholding.ro',
  secondary_email: 'admin@trenzone.fit',
  manual_shipping_enabled: true,
  auto_dispatch_enabled: true,
  auto_dispatch_time: '08:00',
  last_dispatched_at: null,
  notes: 'TCE Holding Curierat & Logistică'
};

const NON_FULFILLABLE_STATUSES = new Set([
  'cancelled',
  'anulata',
  'refunded',
  'returned',
  'returnata',
  'failed',
  'delivered',
  'livrat',
  'shipped',
  'expediata',
  'in_transit',
  'completed',
]);

const UNPAID_STATUSES = new Set([
  'pending',
  'unpaid',
  'awaiting_payment',
  'requires_payment',
  'requires_payment_method',
  'payment_failed',
  'incomplete',
]);

const CARD_PAYMENT_METHODS = new Set(['online', 'card', 'stripe']);

/**
 * Get current fulfillment settings from store_settings
 */
export async function getFulfillmentSettings(): Promise<FulfillmentSettings> {
  try {
    const isAuth = await isAdminOrCronAuthorized();
    const { data, error } = await supabaseAdmin
      .from('store_settings')
      .select('value')
      .eq('key', 'fulfillment_settings')
      .maybeSingle();

    if (error || !data || !data.value) {
      return DEFAULT_SETTINGS;
    }

    if (!isAuth) {
      return {
        ...DEFAULT_SETTINGS,
        manual_shipping_enabled: Boolean(data.value.manual_shipping_enabled),
        auto_dispatch_enabled: Boolean(data.value.auto_dispatch_enabled),
      };
    }

    return {
      ...DEFAULT_SETTINGS,
      ...data.value
    };
  } catch (err) {
    console.error('Error fetching fulfillment settings:', err);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Update fulfillment settings (email, manual_shipping_enabled, auto_dispatch, etc.)
 */
export async function updateFulfillmentSettings(partial: Partial<FulfillmentSettings>) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error('Neautorizat');

  const current = await getFulfillmentSettings();
  const updated: FulfillmentSettings = {
    ...current,
    ...partial
  };

  const { error } = await supabaseAdmin
    .from('store_settings')
    .upsert({
      key: 'fulfillment_settings',
      value: updated
    });

  if (error) {
    console.error('Error updating fulfillment settings:', error);
    throw new Error(error.message);
  }

  try {
    revalidateTag('global_settings', 'max');
    revalidatePath('/admin/orders');
    revalidatePath('/admin/fulfillment');
    revalidatePath('/admin/settings');
    revalidatePath('/admin/shipping');
  } catch (_) {}

  return { success: true, settings: updated };
}

function parseOrderItemsArray(rawItemsInput: any): any[] {
  if (Array.isArray(rawItemsInput)) return rawItemsInput;
  if (typeof rawItemsInput === 'string' && rawItemsInput.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(rawItemsInput);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function toOrderSnapshot(o: FulfillmentOrderSummary): FulfillmentOrderSnapshot {
  return {
    id: o.supabaseId || o.id,
    orderNumber: o.id,
    customerName: o.customer,
    city: o.city,
    country: o.country || 'RO',
    shippingType: o.shippingType || 'hd',
    paymentMethod: o.paymentMethod || 'stripe',
    totalAmount: Number(o.totalAmount || 0),
    currency: o.currency || 'RON',
    items: (o.items || []).map((item) => ({
      name: item.name,
      variant: item.variant,
      quantity: Number(item.quantity) || 1,
      sku: item.sku,
    })),
  };
}

function snapshotToOrderSummary(s: FulfillmentOrderSnapshot, fallbackDate?: string): FulfillmentOrderSummary {
  const currency = String(s.currency || 'RON').trim().toUpperCase();
  const totalAmount = Number(s.totalAmount || 0);
  return {
    id: s.orderNumber || s.id,
    supabaseId: s.id,
    date: fallbackDate || 'N/A',
    customer: s.customerName || 'Client',
    customerEmail: 'N/A',
    customerPhone: 'N/A',
    address: 'N/A',
    city: s.city || 'N/A',
    zip: '',
    country: s.country || 'RO',
    total: `${totalAmount.toFixed(2)} ${currency}`,
    totalAmount,
    currency,
    paymentMethod: s.paymentMethod || 'stripe',
    shippingType: s.shippingType || 'hd',
    items: (s.items || []).map((it) => ({
      name: it.name,
      variant: it.variant,
      quantity: Number(it.quantity) || 1,
      sku: it.sku,
    })),
  };
}

function isOrderSummaryDigitalOnly(o: FulfillmentOrderSummary): boolean {
  const items = Array.isArray(o?.items) ? o.items : [];
  if (items.length === 0) return true;
  return items.every((item) => isDigitalProgramItem(item));
}

function filterSummaryPhysicalItems(o: FulfillmentOrderSummary): FulfillmentOrderSummary {
  const physical = (o.items || []).filter((item) => !isDigitalProgramItem(item));
  return { ...o, items: physical };
}

/**
 * Get raw dispatch logs from store_settings without enrichment (used for appending).
 */
async function readRawFulfillmentHistory(): Promise<FulfillmentDispatchLog[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('store_settings')
      .select('value')
      .eq('key', 'fulfillment_history')
      .maybeSingle();

    if (error || !data || !data.value || !Array.isArray(data.value)) {
      return [];
    }

    return (data.value as FulfillmentDispatchLog[]).sort((a, b) =>
      new Date(b.sentAt || b.sent_at || 0).getTime() - new Date(a.sentAt || a.sent_at || 0).getTime()
    );
  } catch (err) {
    console.error('Error fetching raw fulfillment history:', err);
    return [];
  }
}

/**
 * Get dispatch logs history, normalized and enriched/backfilled from `orders` when older logs lack `ordersSnapshot`.
 */
export async function getFulfillmentHistory(): Promise<FulfillmentDispatchLog[]> {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) return [];

  return readFulfillmentHistoryInternal();
}

async function readFulfillmentHistoryInternal(): Promise<FulfillmentDispatchLog[]> {
  try {
    const [primaryRes, legacyRes, emailLogsRes] = await Promise.all([
      supabaseAdmin.from('store_settings').select('value').eq('key', 'fulfillment_history').maybeSingle(),
      supabaseAdmin.from('store_settings').select('value').eq('key', 'fulfillment_dispatch_logs').maybeSingle(),
      supabaseAdmin
        .from('email_logs')
        .select('id, created_at, recipient, subject, status, error_message, metadata')
        .eq('type', 'fulfillment-dispatch')
        .order('created_at', { ascending: false })
        .limit(100),
    ]);

    const rawEntries: any[] = [];
    if (Array.isArray(primaryRes.data?.value)) {
      rawEntries.push(...primaryRes.data.value);
    }
    if (Array.isArray(legacyRes.data?.value)) {
      const seenBatchIds = new Set(rawEntries.map((e) => e?.id).filter(Boolean));
      for (const leg of legacyRes.data.value) {
        if (leg && !seenBatchIds.has(leg.id)) {
          rawEntries.push(leg);
        }
      }
    }

    // Merge any fulfillment-dispatch entries from email_logs that aren't already in store_settings
    if (Array.isArray(emailLogsRes.data)) {
      for (const em of emailLogsRes.data) {
        const emTime = new Date(em.created_at).getTime();
        const alreadyPresent = rawEntries.some((entry) => {
          const entryTime = new Date(entry?.sentAt || entry?.sent_at || 0).getTime();
          if (Math.abs(entryTime - emTime) <= 120_000) return true;
          if (entry?.subject && em.subject && entry.subject === em.subject && Math.abs(entryTime - emTime) <= 3_600_000) {
            return true;
          }
          return false;
        });
        if (!alreadyPresent) {
          const metaOrderIds = Array.isArray(em.metadata?.order_ids) ? em.metadata.order_ids : [];
          const recipientRaw = String(em.recipient || '');
          const ccMatch = recipientRaw.match(/\(CC:\s*([^)]+)\)/i);
          const cleanPrimary = recipientRaw.replace(/\s*\(CC:[^)]+\)/i, '').trim();
          const secondaryFromMeta = em.metadata?.secondary_email || (ccMatch ? ccMatch[1].trim() : undefined);
          rawEntries.push({
            id: `email_${em.id}`,
            sentAt: em.created_at,
            sent_at: em.created_at,
            recipient: cleanPrimary,
            recipient_email: cleanPrimary,
            secondaryRecipient: secondaryFromMeta || undefined,
            secondary_email: secondaryFromMeta || undefined,
            subject: em.subject || undefined,
            trigger: String(em.subject || '').includes('[08:00') || String(em.subject || '').includes('[09:00')
              ? 'scheduled_8am'
              : 'manual',
            status: em.status === 'failed' ? 'failed' : 'sent',
            orderCount: Number(em.metadata?.order_count || metaOrderIds.length || 0),
            order_count: Number(em.metadata?.order_count || metaOrderIds.length || 0),
            orderIds: metaOrderIds,
            orderNumbers: metaOrderIds.filter((id: any) => typeof id === 'string' && !/^[0-9a-f-]{36}$/i.test(id)),
            error_message: em.error_message || undefined,
          });
        }
      }
    }

    // Collect references for logs that lack ordersSnapshot so we can backfill in a single query
    const logsNeedingBackfill: any[] = [];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const candidateUuids = new Set<string>();
    const candidateBatchIds = new Set<string>();
    const candidateOrderNumbers = new Set<string>();

    for (const raw of rawEntries) {
      if (!raw) continue;
      const hasSnapshots = Array.isArray(raw.ordersSnapshot) && raw.ordersSnapshot.length > 0;
      const hasLegacyOrders = Array.isArray(raw.orders) && raw.orders.length > 0;
      if (!hasSnapshots && !hasLegacyOrders) {
        logsNeedingBackfill.push(raw);
        if (raw.id && !String(raw.id).startsWith('email_')) {
          candidateBatchIds.add(String(raw.id));
        }
        const refs = [
          ...(Array.isArray(raw.orderIds) ? raw.orderIds : []),
          ...(Array.isArray(raw.order_ids) ? raw.order_ids : []),
          ...(Array.isArray(raw.orderNumbers) ? raw.orderNumbers : []),
        ];
        for (const ref of refs) {
          const s = String(ref || '').trim();
          if (!s) continue;
          if (uuidRegex.test(s)) candidateUuids.add(s);
          else candidateOrderNumbers.add(s);
        }
      }
    }

    const orderByUuid = new Map<string, any>();
    const orderByCanonical = new Map<string, any>();
    const ordersByBatchId = new Map<string, any[]>();

    if (logsNeedingBackfill.length > 0) {
      // Query candidate orders safely (recent 500 or matching UUIDs) to enrich historical logs
      const fetchedRows: any[] = [];
      if (candidateUuids.size > 0) {
        const { data: byIdRows } = await supabaseAdmin
          .from('orders')
          .select('*')
          .in('id', Array.from(candidateUuids));
        if (Array.isArray(byIdRows)) fetchedRows.push(...byIdRows);
      }

      if (candidateBatchIds.size > 0 || candidateOrderNumbers.size > 0) {
        const { data: recentRows } = await supabaseAdmin
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500);
        if (Array.isArray(recentRows)) fetchedRows.push(...recentRows);
      }

      for (const row of fetchedRows) {
        if (!row?.id || orderByUuid.has(row.id)) continue;
        // Never enrich digital-only orders into fulfillment reports
        if (classifyOrderForFulfillment(row).isDigitalOnly) continue;

        orderByUuid.set(row.id, row);
        const canonical = getCanonicalOrderNumber(row);
        if (canonical) orderByCanonical.set(canonical, row);

        const batchKey =
          row?.carrier_metadata?.fulfillment_dispatch_id ||
          row?.carrier_metadata?.fulfillment_batch_id;
        if (batchKey) {
          const list = ordersByBatchId.get(String(batchKey)) || [];
          list.push(row);
          ordersByBatchId.set(String(batchKey), list);
        }
      }
    }

    const normalized: FulfillmentDispatchLog[] = rawEntries
      .filter(Boolean)
      .map((raw) => {
        const sentAt = String(raw.sentAt || raw.sent_at || raw.created_at || new Date().toISOString());
        const recipient = String(raw.recipient || raw.recipient_email || '');
        const secondaryRecipient = raw.secondaryRecipient || raw.secondary_email || undefined;
        const trigger: 'manual' | 'scheduled_8am' = raw.trigger === 'scheduled_8am' ? 'scheduled_8am' : 'manual';
        const status: 'sent' | 'partial' | 'failed' =
          raw.status === 'failed' ? 'failed' : raw.status === 'partial' ? 'partial' : 'sent';

        let orders: FulfillmentOrderSummary[] = Array.isArray(raw.orders)
          ? (raw.orders as FulfillmentOrderSummary[])
              .filter((o) => !isOrderSummaryDigitalOnly(o))
              .map(filterSummaryPhysicalItems)
          : [];

        let ordersSnapshot: FulfillmentOrderSnapshot[] = Array.isArray(raw.ordersSnapshot)
          ? (raw.ordersSnapshot as FulfillmentOrderSnapshot[]).filter((s) =>
              (s.items || []).some((it) => !isDigitalProgramItem(it))
            ).map((s) => ({
              ...s,
              items: (s.items || []).filter((it) => !isDigitalProgramItem(it)),
            }))
          : [];

        if (ordersSnapshot.length === 0 && orders.length > 0) {
          ordersSnapshot = orders.map(toOrderSnapshot);
        }

        if (ordersSnapshot.length === 0) {
          const matchedRawRows: any[] = [];
          const seenMatchedIds = new Set<string>();

          const refs = [
            ...(Array.isArray(raw.orderIds) ? raw.orderIds : []),
            ...(Array.isArray(raw.order_ids) ? raw.order_ids : []),
            ...(Array.isArray(raw.orderNumbers) ? raw.orderNumbers : []),
          ];

          for (const ref of refs) {
            const s = String(ref || '').trim();
            if (!s) continue;
            const found = orderByUuid.get(s) || orderByCanonical.get(s);
            if (found && !seenMatchedIds.has(found.id)) {
              seenMatchedIds.add(found.id);
              matchedRawRows.push(found);
            }
          }

          if (matchedRawRows.length === 0 && raw.id && ordersByBatchId.has(String(raw.id))) {
            for (const found of ordersByBatchId.get(String(raw.id)) || []) {
              if (!seenMatchedIds.has(found.id)) {
                seenMatchedIds.add(found.id);
                matchedRawRows.push(found);
              }
            }
          }

          if (matchedRawRows.length > 0) {
            orders = matchedRawRows.map(formatOrderForFulfillment);
            ordersSnapshot = orders.map(toOrderSnapshot);
          }
        }

        if (orders.length === 0 && ordersSnapshot.length > 0) {
          const fallbackDate = new Date(sentAt).toLocaleString('ro-RO', {
            timeZone: 'Europe/Bucharest',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
          orders = ordersSnapshot.map((s) => snapshotToOrderSummary(s, fallbackDate));
        }

        const totalItemsCount =
          typeof raw.totalItemsCount === 'number' && ordersSnapshot.length === 0
            ? raw.totalItemsCount
            : ordersSnapshot.reduce(
                (sum, o) => sum + (o.items || []).reduce((s, it) => s + (Number(it.quantity) || 1), 0),
                0
              );

        const orderNumbers: string[] =
          ordersSnapshot.length > 0
            ? ordersSnapshot.map((o) => o.orderNumber).filter(Boolean)
            : Array.isArray(raw.orderNumbers)
              ? raw.orderNumbers
              : [];

        const orderCount =
          ordersSnapshot.length > 0
            ? ordersSnapshot.length
            : Number(raw.orderCount ?? raw.order_count ?? 0);

        return {
          id: String(raw.id || `hist_${sentAt}`),
          sentAt,
          sent_at: sentAt,
          recipient,
          recipient_email: recipient,
          secondaryRecipient,
          secondary_email: secondaryRecipient,
          subject: raw.subject,
          trigger,
          status,
          orderCount,
          order_count: orderCount,
          totalItemsCount,
          excludedPreorders: Number(raw.excludedPreorders ?? 0),
          orderNumbers,
          orderIds: Array.isArray(raw.orderIds) ? raw.orderIds : undefined,
          ordersSnapshot,
          orders,
          error_message: raw.error_message,
        };
      });

    return normalized.sort(
      (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
    );
  } catch (err) {
    console.error('Error fetching fulfillment history:', err);
    return [];
  }
}

/**
 * Helper to transform DB order to FulfillmentOrderSummary
 */
function formatOrderForFulfillment(order: any): FulfillmentOrderSummary {
  const displayId = getCanonicalOrderNumber(order);

  const rawCurrency = String(order.currency || 'RON').trim().toUpperCase();
  const totalAmount = Number(order.total_amount || 0);
  const formattedTotal = `${totalAmount.toFixed(2)} ${rawCurrency}`;

  const rawItems = parseOrderItemsArray(order.items);
  // For orders containing both physical items and digital PDFs, strictly strip digital items from warehouse picking
  const physicalItems = rawItems.filter((item: any) => !isDigitalProgramItem(item));

  const items: FulfillmentItemSummary[] = physicalItems.map((item: any) => {
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

    const isBundle = String(item?.id || '').includes('-bundle-') ||
                     Boolean(item?._isBundle) ||
                     name.toLowerCase().includes('pachet') ||
                     name.toLowerCase().includes('bundle');

    let image = item?.image || item?.selectedVariant?.image || null;
    if (typeof image === 'string') {
      image = image.replace(/^https?:\/\/(www\.)?trenzone\.ro/, '');
    }

    if (!image || String(image).includes('placeholder')) {
      const lower = `${name} ${variantStr}`.toLowerCase();
      if (lower.includes('x10')) {
        if (lower.includes('white') || lower.includes('alb')) {
          image = '/images/products/x10_elbow_wraps_white.webp';
        } else {
          image = '/images/products/x10_elbow_wraps_purple.webp';
        }
      } else if (lower.includes('x5')) {
        if (lower.includes('red') || lower.includes('rosu')) {
          image = '/images/products/x5_elbow_wraps_red_1.webp';
        } else if (lower.includes('blue') || lower.includes('albastru')) {
          image = '/images/products/x5_elbow_wraps_blue_1.webp';
        } else {
          image = '/images/products/x5_elbow_wraps_purple_1.webp';
        }
      } else if (isBundle) {
        image = '/images/products/x10_elbow_wraps_purple.webp';
      } else {
        image = getSingleFlavorImage(variantStr || name);
      }
    }

    return {
      name,
      variant: variantStr || undefined,
      quantity: Number(item?.quantity || 1),
      sku: item?.sku || item?.id || undefined,
      image: image || undefined
    };
  });

  const baseAddress = `${order.addr_line1 || ''} ${order.addr_line2 || ''}`.trim();
  const countySuffix = order.addr_county ? `, ${order.addr_county}` : '';
  const isPudo = order.shipping_type === 'pudo';
  const lockerName = order.branch_name || '';
  const lockerId = order.branch_id || (order.carrier_metadata as any)?.locker_id || '';
  const lockerSuffix = isPudo && (lockerName || lockerId)
    ? ` [Easybox: ${lockerName || 'Locker'}${lockerId ? ` #${lockerId}` : ''}]`
    : '';
  const address = `${baseAddress}${countySuffix}${lockerSuffix}`.trim() || 'N/A';
  const customerName = `${order.customer_firstname || ''} ${order.customer_lastname || ''}`.trim() || 'Client';

  return {
    id: displayId,
    supabaseId: order.id,
    date: order.created_at ? new Date(order.created_at).toLocaleString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : 'N/A',
    customer: customerName,
    customerEmail: order.customer_email || 'N/A',
    customerPhone: order.customer_phone || 'N/A',
    address,
    city: order.addr_city || 'N/A',
    county: order.addr_county || '',
    zip: order.addr_zip || '',
    country: order.addr_country || 'RO',
    branchId: lockerId || '',
    branchName: lockerName || '',
    total: formattedTotal,
    totalAmount,
    currency: rawCurrency,
    paymentMethod: order.payment_method || 'stripe',
    priorityProcessing: Boolean(order.priority_processing),
    giftPackaging: Boolean(order.gift_packaging),
    giftMessage: order.gift_message || null,
    shippingType: order.shipping_type || 'hd',
    items
  };
}

interface OrderFulfillmentClassification {
  alreadyDispatched: boolean;
  hasAwb: boolean;
  isNonFulfillableStatus: boolean;
  isUnpaidCard: boolean;
  isDigitalOnly: boolean;
  hasPreorderItems: boolean;
  isMixedPreorder: boolean;
  isExplicitlyReleasedPreorder: boolean;
  isUnreleasedPreorder: boolean;
  isEligibleDefault: boolean;
}

/**
 * Classifies an order's eligibility for warehouse fulfillment dispatch.
 * Enforces strict safety against:
 * - Unreleased pure & mixed preorders
 * - Digital-only orders
 * - Unpaid card / failed / cancelled / refunded / returned / shipped / delivered orders
 * - Already-AWB and already-dispatched orders
 */
function classifyOrderForFulfillment(order: any): OrderFulfillmentClassification {
  const status = String(order?.status || '').trim().toLowerCase();
  const paymentMethod = String(order?.payment_method || '').trim().toLowerCase();
  const carrierId = String(order?.carrier_id || '').trim().toLowerCase();
  const shippingType = String(order?.shipping_type || '').trim().toLowerCase();
  const meta = (order?.carrier_metadata && typeof order.carrier_metadata === 'object')
    ? order.carrier_metadata
    : {};
  const rawItems = parseOrderItemsArray(order?.items);
  const physicalItems = rawItems.filter((item: any) => !isDigitalProgramItem(item));

  const alreadyDispatched = Boolean(meta.fulfillment_dispatched_at);
  const hasAwb = Boolean(order?.tracking_number && String(order.tracking_number).trim());
  const isNonFulfillableStatus = NON_FULFILLABLE_STATUSES.has(status);

  const metaPaymentStatus = String(meta.payment_status || '').trim().toLowerCase();
  const isUnpaidCard =
    UNPAID_STATUSES.has(status) ||
    (CARD_PAYMENT_METHODS.has(paymentMethod) && (
      metaPaymentStatus === 'unpaid' ||
      metaPaymentStatus === 'failed' ||
      metaPaymentStatus === 'pending' ||
      meta.paid === false
    ));

  const isDigitalOnly =
    Boolean(meta.is_digital_only === true) ||
    carrierId === 'digital' ||
    shippingType === 'digital' ||
    rawItems.length === 0 ||
    physicalItems.length === 0 ||
    isDigitalOnlyCart(rawItems);

  const hasPreorderItems =
    status === 'preorder' ||
    meta.is_preorder === true ||
    rawItems.some((item: any) => isItemSnapshotPreorder(item));

  const hasInStockPhysicalItems = rawItems.some(
    (item: any) => !isItemSnapshotPreorder(item) && !isDigitalProgramItem(item)
  );
  const isMixedPreorder = hasPreorderItems && hasInStockPhysicalItems;

  const isExplicitlyReleasedPreorder =
    status !== 'preorder' &&
    (meta.preorder_released === true || Boolean(meta.preorder_released_at));

  const isUnreleasedPreorder = hasPreorderItems && !isExplicitlyReleasedPreorder;

  const isEligibleDefault =
    !alreadyDispatched &&
    !hasAwb &&
    !isNonFulfillableStatus &&
    !isUnpaidCard &&
    !isDigitalOnly &&
    !isUnreleasedPreorder;

  return {
    alreadyDispatched,
    hasAwb,
    isNonFulfillableStatus,
    isUnpaidCard,
    isDigitalOnly,
    hasPreorderItems,
    isMixedPreorder,
    isExplicitlyReleasedPreorder,
    isUnreleasedPreorder,
    isEligibleDefault,
  };
}

interface EvaluatedOrdersResult {
  readyRawOrders: any[];
  excludedPreorders: number;
  excludedMixedPreorders: number;
  skippedPreorderOrderIds: string[];
  excludedDigital: number;
  excludedAlreadyDispatched: number;
  excludedUnpaidOrInvalid: number;
}

async function evaluateFulfillmentOrders(options?: {
  orderIds?: string[];
  includeAlreadyDispatched?: boolean;
  includePreorders?: boolean;
}): Promise<EvaluatedOrdersResult> {
  let query = supabaseAdmin
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (options?.orderIds && options.orderIds.length > 0) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const uuids = Array.from(new Set(options.orderIds.filter(id => uuidRegex.test(id))));
    if (uuids.length === 0) {
      return {
        readyRawOrders: [],
        excludedPreorders: 0,
        excludedMixedPreorders: 0,
        skippedPreorderOrderIds: [],
        excludedDigital: 0,
        excludedAlreadyDispatched: 0,
        excludedUnpaidOrInvalid: 0,
      };
    }
    query = query.in('id', uuids);
  }

  const { data, error } = await query;
  if (error || !data) {
    return {
      readyRawOrders: [],
      excludedPreorders: 0,
      excludedMixedPreorders: 0,
      skippedPreorderOrderIds: [],
      excludedDigital: 0,
      excludedAlreadyDispatched: 0,
      excludedUnpaidOrInvalid: 0,
    };
  }

  const readyRawOrders: any[] = [];
  const seenIds = new Set<string>();
  let excludedPreorders = 0;
  let excludedMixedPreorders = 0;
  const skippedPreorderOrderIds: string[] = [];
  let excludedDigital = 0;
  let excludedAlreadyDispatched = 0;
  let excludedUnpaidOrInvalid = 0;

  for (const order of data) {
    if (!order?.id || seenIds.has(order.id)) continue;
    seenIds.add(order.id);

    const cls = classifyOrderForFulfillment(order);

    // Hard safety gates (never bypassed even with explicit orderIds)
    if (cls.isDigitalOnly) {
      excludedDigital++;
      continue;
    }

    if (cls.isNonFulfillableStatus || cls.isUnpaidCard || cls.hasAwb) {
      excludedUnpaidOrInvalid++;
      continue;
    }

    if (!options?.includeAlreadyDispatched && cls.alreadyDispatched) {
      excludedAlreadyDispatched++;
      continue;
    }

    if (!options?.includePreorders && cls.isUnreleasedPreorder) {
      excludedPreorders++;
      if (cls.isMixedPreorder) excludedMixedPreorders++;
      skippedPreorderOrderIds.push(getCanonicalOrderNumber(order));
      continue;
    }

    readyRawOrders.push(order);
  }

  return {
    readyRawOrders,
    excludedPreorders,
    excludedMixedPreorders,
    skippedPreorderOrderIds,
    excludedDigital,
    excludedAlreadyDispatched,
    excludedUnpaidOrInvalid,
  };
}

/**
 * Get orders ready for fulfillment (filters out already dispatched orders, digital-only, unpaid/cancelled/AWB, and unreleased preorders)
 */
export async function getFulfillmentOrdersReady(
  orderIds?: string[],
  options?: { includeAlreadyDispatched?: boolean; includePreorders?: boolean }
): Promise<FulfillmentOrderSummary[]> {
  try {
    const isAuthorized = await isAdminOrCronAuthorized();
    if (!isAuthorized) return [];

    const evaluated = await evaluateFulfillmentOrders({
      orderIds,
      includeAlreadyDispatched: options?.includeAlreadyDispatched,
      includePreorders: options?.includePreorders,
    });

    return evaluated.readyRawOrders.map(formatOrderForFulfillment);
  } catch (err) {
    console.error('Error in getFulfillmentOrdersReady:', err);
    return [];
  }
}

/**
 * Get count of orders waiting for fulfillment vs already dispatched (and held preorders)
 */
export async function getFulfillmentPendingCount(): Promise<{
  pendingCount: number;
  dispatchedCount: number;
  heldPreorderCount: number;
}> {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) return { pendingCount: 0, dispatchedCount: 0, heldPreorderCount: 0 };

  try {
    const { data } = await supabaseAdmin
      .from('orders')
      .select('id, status, payment_method, tracking_number, carrier_id, shipping_type, carrier_metadata, items');

    if (!data) return { pendingCount: 0, dispatchedCount: 0, heldPreorderCount: 0 };

    let pendingCount = 0;
    let dispatchedCount = 0;
    let heldPreorderCount = 0;

    for (const o of data) {
      const cls = classifyOrderForFulfillment(o);
      if (cls.isDigitalOnly) {
        continue;
      }
      if (cls.alreadyDispatched) {
        dispatchedCount++;
        continue;
      }
      if (cls.isNonFulfillableStatus || cls.isUnpaidCard || cls.hasAwb) {
        continue;
      }
      if (cls.isUnreleasedPreorder) {
        heldPreorderCount++;
        continue;
      }
      pendingCount++;
    }

    return { pendingCount, dispatchedCount, heldPreorderCount };
  } catch {
    return { pendingCount: 0, dispatchedCount: 0, heldPreorderCount: 0 };
  }
}

/**
 * Generate standardized CSV content for warehouse fulfillment systems (Excel compatible with UTF-8 BOM)
 */
export async function generateFulfillmentCsv(orders: FulfillmentOrderSummary[]): Promise<string> {
  const escapeCell = (val: any) => {
    if (val === null || val === undefined) return '';
    const str = String(val).trim();
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes(';') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headers = [
    'Nr_Comanda',
    'Data',
    'Tara',
    'Destinatar',
    'Telefon',
    'Email',
    'Adresa_Livrare',
    'Oras',
    'Cod_Postal',
    'Tip_Livrare',
    'Metoda_Plata',
    'Total',
    'Moneda',
    'Ramburs_De_Incasat',
    'Produs',
    'Varianta_Culoare',
    'Cantitate',
    'SKU',
    'Prioritate',
    'Ambalaj_Cadou',
    'Mesaj_Cadou'
  ];

  const rows: string[] = [];
  rows.push(headers.join(','));

  for (const o of orders) {
    const isCod = o.paymentMethod === 'cod';
    const codAmount = isCod ? o.total : '0';
    const isPriority = o.priorityProcessing ? 'DA' : 'NU';
    const isGift = o.giftPackaging ? 'DA' : 'NU';

    for (const item of (o.items || [])) {
      const row = [
        escapeCell(o.id),
        escapeCell(o.date),
        escapeCell(o.country || 'RO'),
        escapeCell(o.customer),
        escapeCell(o.customerPhone),
        escapeCell(o.customerEmail),
        escapeCell(o.address),
        escapeCell(o.city),
        escapeCell(o.zip),
        escapeCell(o.shippingType === 'pudo' ? 'Locker / Punct Fix' : 'Livrare la Domiciliu'),
        escapeCell(isCod ? 'Ramburs (La Livrare)' : 'Card Stripe (Achitat)'),
        escapeCell(o.total),
        escapeCell(o.currency),
        escapeCell(codAmount),
        escapeCell(item.name),
        escapeCell(item.variant || 'Standard'),
        escapeCell(item.quantity),
        escapeCell(item.sku || ''),
        escapeCell(isPriority),
        escapeCell(isGift),
        escapeCell(o.giftMessage || '')
      ];
      rows.push(row.join(','));
    }
  }

  return '\uFEFF' + rows.join('\r\n');
}

function getSamplePreviewOrders(): FulfillmentOrderSummary[] {
  return [
    {
      id: 'TZ-2026-1041',
      supabaseId: 'sample-uuid-1',
      date: new Date().toLocaleString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      customer: 'Alexandru Popescu',
      customerEmail: 'alexandru.popescu@gmail.com',
      customerPhone: '0722123456',
      address: 'Strada Victoriei nr. 42, Bl. B2, Ap. 14',
      city: 'București, Sector 1',
      zip: '010061',
      country: 'RO',
      total: '249.00 RON',
      totalAmount: 249.00,
      currency: 'RON',
      paymentMethod: 'cod',
      priorityProcessing: true,
      giftPackaging: false,
      giftMessage: null,
      shippingType: 'hd',
      items: [
        {
          name: 'X10 Elbow Wraps',
          variant: 'Purple',
          quantity: 2,
          sku: 'X10-WRAP-PUR',
          image: '/images/products/x10_elbow_wraps_purple.webp'
        },
        {
          name: 'X5 Elbow Wraps',
          variant: 'Red',
          quantity: 1,
          sku: 'X5-WRAP-RED',
          image: '/images/products/x5_elbow_wraps_red_1.webp'
        }
      ]
    },
    {
      id: 'TZ-2026-1042',
      supabaseId: 'sample-uuid-2',
      date: new Date(Date.now() - 3600000 * 2).toLocaleString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      customer: 'Elena Mihăilescu',
      customerEmail: 'elena.mihailescu@yahoo.com',
      customerPhone: '0744987654',
      address: 'Bulevardul Eroilor nr. 15, Sc. A, Ap. 3',
      city: 'Cluj-Napoca',
      zip: '400129',
      country: 'RO',
      total: '129.00 RON',
      totalAmount: 129.00,
      currency: 'RON',
      paymentMethod: 'stripe',
      priorityProcessing: false,
      giftPackaging: true,
      giftMessage: 'Succes la antrenamente!',
      shippingType: 'hd',
      items: [
        {
          name: 'X5 Elbow Wraps',
          variant: 'Blue',
          quantity: 1,
          sku: 'X5-WRAP-BLU',
          image: '/images/products/x5_elbow_wraps_blue_1.webp'
        }
      ]
    },
    {
      id: 'TZ-2026-1043',
      supabaseId: 'sample-uuid-3',
      date: new Date(Date.now() - 3600000 * 5).toLocaleString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      customer: 'Andrei Cebotari',
      customerEmail: 'andrei.cebotari@mail.md',
      customerPhone: '+37369123456',
      address: 'Bulevardul Ștefan cel Mare nr. 105, Ap. 22',
      city: 'Chișinău',
      zip: 'MD-2004',
      country: 'MD',
      total: '29.00 EUR',
      totalAmount: 29.00,
      currency: 'EUR',
      paymentMethod: 'stripe',
      priorityProcessing: false,
      giftPackaging: false,
      giftMessage: null,
      shippingType: 'hd',
      items: [
        {
          name: 'X10 Elbow Wraps',
          variant: 'White',
          quantity: 1,
          sku: 'X10-WRAP-WHT',
          image: '/images/products/x10_elbow_wraps_white.webp'
        }
      ]
    }
  ];
}

/**
 * Full queue overview for FulfillmentModal (separating genuine pending orders from template preview fallback and held preorders)
 */
export async function getFulfillmentQueueOverview(): Promise<FulfillmentQueueOverview> {
  const isAuthorized = await isAdminOrCronAuthorized();
  if (!isAuthorized) {
    return {
      pendingOrders: [],
      templatePreviewOrders: [],
      isSamplePreview: false,
      isHistoricalPreview: false,
      excludedPreorders: 0,
      excludedMixedPreorders: 0,
      skippedPreorderOrderIds: [],
      excludedDigital: 0,
      excludedAlreadyDispatched: 0,
      excludedUnpaidOrInvalid: 0,
    };
  }

  const evaluated = await evaluateFulfillmentOrders();
  const pendingOrders = evaluated.readyRawOrders.map(formatOrderForFulfillment);

  if (pendingOrders.length > 0) {
    return {
      pendingOrders,
      templatePreviewOrders: pendingOrders,
      isSamplePreview: false,
      isHistoricalPreview: false,
      excludedPreorders: evaluated.excludedPreorders,
      excludedMixedPreorders: evaluated.excludedMixedPreorders,
      skippedPreorderOrderIds: evaluated.skippedPreorderOrderIds,
      excludedDigital: evaluated.excludedDigital,
      excludedAlreadyDispatched: evaluated.excludedAlreadyDispatched,
      excludedUnpaidOrInvalid: evaluated.excludedUnpaidOrInvalid,
    };
  }

  const anyOrders = await getFulfillmentOrdersReady(undefined, { includeAlreadyDispatched: true });
  if (anyOrders.length > 0) {
    return {
      pendingOrders: [],
      templatePreviewOrders: anyOrders.slice(0, 10),
      isSamplePreview: false,
      isHistoricalPreview: true,
      excludedPreorders: evaluated.excludedPreorders,
      excludedMixedPreorders: evaluated.excludedMixedPreorders,
      skippedPreorderOrderIds: evaluated.skippedPreorderOrderIds,
      excludedDigital: evaluated.excludedDigital,
      excludedAlreadyDispatched: evaluated.excludedAlreadyDispatched,
      excludedUnpaidOrInvalid: evaluated.excludedUnpaidOrInvalid,
    };
  }

  return {
    pendingOrders: [],
    templatePreviewOrders: getSamplePreviewOrders(),
    isSamplePreview: true,
    isHistoricalPreview: false,
    excludedPreorders: evaluated.excludedPreorders,
    excludedMixedPreorders: evaluated.excludedMixedPreorders,
    skippedPreorderOrderIds: evaluated.skippedPreorderOrderIds,
    excludedDigital: evaluated.excludedDigital,
    excludedAlreadyDispatched: evaluated.excludedAlreadyDispatched,
    excludedUnpaidOrInvalid: evaluated.excludedUnpaidOrInvalid,
  };
}

/**
 * Provide preview orders with real store products & images, split by country
 */
export async function getFulfillmentPreviewOrders(): Promise<FulfillmentOrderSummary[]> {
  const overview = await getFulfillmentQueueOverview();
  return overview.templatePreviewOrders;
}

/**
 * Helper to compute high-clarity subject line for preview or client display
 */
export async function getFulfillmentFormattedSubject(
  orders: FulfillmentOrderSummary[],
  trigger?: 'manual' | 'scheduled_8am'
): Promise<string> {
  const totalItems = orders.reduce((sum, o) => sum + (o.items || []).reduce((s, i) => s + (Number(i.quantity) || 1), 0), 0);
  const roCount = orders.filter(o => {
    const c = (o.country || 'RO').trim().toUpperCase();
    return c === 'RO' || c === 'ROMANIA' || c === 'ROMÂNIA';
  }).length;
  const intCount = orders.length - roCount;

  return buildFulfillmentDispatchSubject({
    ordersCount: orders.length,
    totalItemsCount: totalItems,
    sentAt: new Date(),
    trigger: trigger || 'scheduled_8am',
    roCount,
    intCount
  });
}

/**
 * Explicitly release active preorder(s) into the fulfillment processing queue once stock has arrived.
 */
export async function releasePreorderForFulfillmentAction(orderIds: string[]) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) return { success: false, error: 'Neautorizat' };

  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    return { success: false, error: 'Nu a fost selectată nicio comandă.' };
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const uuids = Array.from(new Set(orderIds.filter(id => uuidRegex.test(id))));
  if (uuids.length === 0) {
    return { success: false, error: 'ID-uri de comandă invalide.' };
  }

  try {
    const { data: rows, error } = await supabaseAdmin
      .from('orders')
      .select('id, status, payment_method, tracking_number, carrier_id, shipping_type, carrier_metadata, items, payment_intent_id, receipt_url')
      .in('id', uuids);

    if (error || !rows || rows.length === 0) {
      return { success: false, error: error?.message || 'Comenzile nu au fost găsite.' };
    }

    const releasedAt = new Date().toISOString();
    const releasedOrderNumbers: string[] = [];

    for (const row of rows) {
      const cls = classifyOrderForFulfillment(row);
      if (cls.isNonFulfillableStatus || cls.isUnpaidCard || cls.isDigitalOnly) continue;

      const currentMeta = (row.carrier_metadata && typeof row.carrier_metadata === 'object')
        ? row.carrier_metadata
        : {};

      const nextStatus = row.status === 'preorder' ? 'processing' : row.status;
      const { error: updErr } = await supabaseAdmin
        .from('orders')
        .update({
          status: nextStatus,
          updated_at: releasedAt,
          carrier_metadata: {
            ...currentMeta,
            preorder_released: true,
            preorder_released_at: releasedAt,
            preorder_released_by: 'admin',
          }
        })
        .eq('id', row.id);

      if (!updErr) {
        releasedOrderNumbers.push(getCanonicalOrderNumber(row));
      }
    }

    revalidatePath('/admin/orders');
    revalidatePath('/admin/preorders');

    return {
      success: releasedOrderNumbers.length > 0,
      releasedCount: releasedOrderNumbers.length,
      releasedOrderNumbers,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Eroare la eliberarea precomenzii.' };
  }
}

async function acquireDistributedDispatchLock(trigger: 'manual' | 'scheduled_8am'): Promise<{
  acquired: boolean;
  token?: string;
  reason?: string;
}> {
  const nowMs = Date.now();
  const lockToken = `lock_${nowMs}_${Math.random().toString(36).slice(2, 10)}`;
  const newLockValue = {
    locked: true,
    token: lockToken,
    trigger,
    locked_at: new Date(nowMs).toISOString(),
    expires_at: new Date(nowMs + DISPATCH_LOCK_TTL_MS).toISOString(),
  };

  const { data: existingRow, error: readErr } = await supabaseAdmin
    .from('store_settings')
    .select('value')
    .eq('key', DISPATCH_LOCK_KEY)
    .maybeSingle();

  if (readErr) {
    return { acquired: false, reason: `Eroare citire lock fulfillment: ${readErr.message}` };
  }

  if (!existingRow) {
    const { error: insertErr } = await supabaseAdmin
      .from('store_settings')
      .insert({ key: DISPATCH_LOCK_KEY, value: newLockValue });

    if (insertErr) {
      return {
        acquired: false,
        reason: 'O altă expediere către fulfillment a început chiar acum. Reîncearcă în câteva secunde.',
      };
    }
    return { acquired: true, token: lockToken };
  }

  const prevVal = (existingRow.value && typeof existingRow.value === 'object') ? existingRow.value : {};
  const prevExpiresMs = prevVal.expires_at ? new Date(prevVal.expires_at).getTime() : 0;
  if (prevVal.locked === true && Number.isFinite(prevExpiresMs) && prevExpiresMs > nowMs) {
    return {
      acquired: false,
      reason: 'O expediere către fulfillment este deja în curs de procesare. Te rugăm să aștepți finalizarea ei.',
    };
  }

  // Optimistic CAS update keyed on previous token so two concurrent workers cannot both acquire
  let casQuery = supabaseAdmin
    .from('store_settings')
    .update({ value: newLockValue })
    .eq('key', DISPATCH_LOCK_KEY);

  if (typeof prevVal.token === 'string' && prevVal.token.length > 0) {
    casQuery = casQuery.filter('value->>token', 'eq', prevVal.token);
  } else {
    casQuery = casQuery.is('value->>token', null);
  }

  const { data: casUpdated, error: casErr } = await casQuery.select('key').maybeSingle();
  if (casErr || !casUpdated) {
    return {
      acquired: false,
      reason: 'O altă expediere către fulfillment este deja în curs. Reîncearcă în câteva secunde.',
    };
  }

  return { acquired: true, token: lockToken };
}

async function releaseDistributedDispatchLock(lockToken: string): Promise<void> {
  try {
    const releasedToken = `released_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await supabaseAdmin
      .from('store_settings')
      .update({
        value: {
          locked: false,
          token: releasedToken,
          released_at: new Date().toISOString(),
        }
      })
      .eq('key', DISPATCH_LOCK_KEY)
      .filter('value->>token', 'eq', lockToken);
  } catch (err) {
    console.error('[FULFILLMENT LOCK] Failed to release lock:', err);
  }
}

async function appendFulfillmentHistoryLog(logEntry: FulfillmentDispatchLog): Promise<void> {
  try {
    const history = await readRawFulfillmentHistory();
    const updatedHistory = [logEntry, ...history].slice(0, 120);
    await supabaseAdmin
      .from('store_settings')
      .upsert({
        key: 'fulfillment_history',
        value: updatedHistory
      });
  } catch (err) {
    console.error('[FULFILLMENT HISTORY] Failed to persist log entry:', err);
  }
}

async function recordCriticalReconciliationAlert(params: {
  batchId: string;
  sentAt: string;
  recipient: string;
  failedUpdates: Array<{ uuid: string; displayId: string; error: string }>;
  totalDispatchedCount: number;
}): Promise<void> {
  const summaryMsg = `CRITICAL RECONCILIATION: Email batch ${params.batchId} (${params.totalDispatchedCount} orders) succeeded to ${params.recipient}, but ${params.failedUpdates.length} order DB updates failed: ${params.failedUpdates.map(f => `${f.displayId}(${f.uuid}): ${f.error}`).join('; ')}`;
  console.error('[FULFILLMENT RECONCILIATION]', summaryMsg);

  try {
    const { data: existing } = await supabaseAdmin
      .from('store_settings')
      .select('value')
      .eq('key', RECONCILIATION_LOG_KEY)
      .maybeSingle();
    const prev = Array.isArray(existing?.value) ? existing.value : [];
    const next = [
      {
        batch_id: params.batchId,
        sent_at: params.sentAt,
        recipient: params.recipient,
        failed_updates: params.failedUpdates,
        total_orders: params.totalDispatchedCount,
      },
      ...prev,
    ].slice(0, 50);

    await supabaseAdmin
      .from('store_settings')
      .upsert({ key: RECONCILIATION_LOG_KEY, value: next });
  } catch (err) {
    console.error('[FULFILLMENT RECONCILIATION] Failed saving store_settings alert:', err);
  }

  try {
    await supabaseAdmin.from('email_logs').insert([{
      recipient: params.recipient,
      subject: `[RECONCILIATION REQUIRED] Batch ${params.batchId}`,
      type: 'fulfillment-reconciliation',
      status: 'failed',
      error_message: summaryMsg,
      metadata: {
        batch_id: params.batchId,
        sent_at: params.sentAt,
        failed_updates: params.failedUpdates,
        total_orders: params.totalDispatchedCount,
      }
    }]);
  } catch (err) {
    console.error('[FULFILLMENT RECONCILIATION] Failed saving email_logs alert:', err);
  }
}

/**
 * Dispatch orders to fulfillment center email (manual or automated cron)
 * Protected by in-process mutex + distributed DB CAS lock + atomic claim + reconciliation logging.
 */
export async function dispatchOrdersToFulfillment(options?: {
  orderIds?: string[];
  notes?: string;
  trigger?: 'manual' | 'scheduled_8am';
  forceResend?: boolean;
  allowUnreleasedPreorderOverride?: boolean;
}): Promise<FulfillmentDispatchResult> {
  const trigger = options?.trigger || 'manual';

  const isAuthorized = trigger === 'manual'
    ? await isAdminAuthorized()
    : await isAdminOrCronAuthorized();
  if (!isAuthorized) {
    return { success: false, error: 'Neautorizat' };
  }

  // Cron must NEVER bypass duplicate protection or preorder hold
  const allowForceResend = trigger === 'manual' && Boolean(options?.forceResend);
  const allowPreorderOverride = trigger === 'manual' && Boolean(options?.allowUnreleasedPreorderOverride);

  if (activeProcessDispatchPromise) {
    return {
      success: false,
      busy: true,
      count: 0,
      error: 'O expediere către fulfillment este deja în curs. Te rugăm să aștepți finalizarea ei.',
    };
  }

  const runPromise = (async (): Promise<FulfillmentDispatchResult> => {
    const lockRes = await acquireDistributedDispatchLock(trigger);
    if (!lockRes.acquired || !lockRes.token) {
      return {
        success: false,
        busy: true,
        count: 0,
        error: lockRes.reason || 'Expedierea este blocată temporar de un alt proces activ.',
      };
    }

    try {
      const settings = await getFulfillmentSettings();
      if (!settings.email || !settings.email.trim()) {
        return {
          success: false,
          error: 'Adresa de email a centrului de fulfillment nu este setată! Te rugăm să o configurezi mai întâi.'
        };
      }

      // Re-query eligible orders inside the lock so stale snapshots cannot cause duplicates or lost orders
      const evaluated = await evaluateFulfillmentOrders({
        orderIds: options?.orderIds,
        includeAlreadyDispatched: allowForceResend,
        includePreorders: allowPreorderOverride,
      });

      const orders = evaluated.readyRawOrders.map(formatOrderForFulfillment);

      if (orders.length === 0) {
        const preorderNote = evaluated.excludedPreorders > 0
          ? ` ${evaluated.excludedPreorders} ${evaluated.excludedPreorders === 1 ? 'precomandă activă a fost reținută' : 'precomenzi active au fost reținute'} (nu se trimit până la eliberarea stocului).`
          : '';
        return {
          success: true,
          count: 0,
          excludedPreorders: evaluated.excludedPreorders,
          excludedMixedPreorders: evaluated.excludedMixedPreorders,
          skippedPreorderOrderIds: evaluated.skippedPreorderOrderIds,
          excludedDigital: evaluated.excludedDigital,
          excludedAlreadyDispatched: evaluated.excludedAlreadyDispatched,
          excludedUnpaidOrInvalid: evaluated.excludedUnpaidOrInvalid,
          message: `Toate comenzile active eligibile au fost deja transmise către fulfillment. Nu există comenzi noi de trimis (protecție anti-duplicate activă).${preorderNote}`
        };
      }

      const sentAt = new Date().toISOString();
      const dateStr = sentAt.split('T')[0];
      const batchId = `disp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

      const totalItems = orders.reduce((sum, o) => sum + (o.items || []).reduce((s, i) => s + (Number(i.quantity) || 1), 0), 0);
      const roCount = orders.filter(o => {
        const c = (o.country || 'RO').trim().toUpperCase();
        return c === 'RO' || c === 'ROMANIA' || c === 'ROMÂNIA';
      }).length;
      const intCount = orders.length - roCount;

      const subject = buildFulfillmentDispatchSubject({
        ordersCount: orders.length,
        totalItemsCount: totalItems,
        sentAt,
        trigger,
        roCount,
        intCount
      });

      const csvContent = await generateFulfillmentCsv(orders);
      const csvFilename = `comenzi_trenzone_${dateStr}.csv`;

      // Send email ONLY after acquiring lock and before marking orders as dispatched
      const emailRes = await sendFulfillmentDispatchEmail(settings.email.trim(), {
        orders,
        sentAt,
        trigger,
        notes: options?.notes || settings.notes,
        csvContent,
        csvFilename,
        secondaryEmail: settings.secondary_email?.trim() || undefined,
        subject
      });

      const ordersSnapshot = orders.map(toOrderSnapshot);
      const orderNumbers = orders.map((o) => o.id);
      const orderIds = evaluated.readyRawOrders.map((r) => r.id);

      if (!emailRes.success) {
        await appendFulfillmentHistoryLog({
          id: batchId,
          sentAt,
          sent_at: sentAt,
          recipient: settings.email.trim(),
          recipient_email: settings.email.trim(),
          secondaryRecipient: settings.secondary_email?.trim() || undefined,
          secondary_email: settings.secondary_email?.trim() || undefined,
          subject,
          trigger,
          status: 'failed',
          orderCount: orders.length,
          order_count: orders.length,
          totalItemsCount: totalItems,
          excludedPreorders: evaluated.excludedPreorders,
          orderNumbers,
          orderIds,
          ordersSnapshot,
          orders,
          error_message: emailRes.error || 'Trimiterea emailului a eșuat.',
        });

        return {
          success: false,
          count: 0,
          batchId,
          excludedPreorders: evaluated.excludedPreorders,
          excludedMixedPreorders: evaluated.excludedMixedPreorders,
          skippedPreorderOrderIds: evaluated.skippedPreorderOrderIds,
          excludedDigital: evaluated.excludedDigital,
          excludedAlreadyDispatched: evaluated.excludedAlreadyDispatched,
          excludedUnpaidOrInvalid: evaluated.excludedUnpaidOrInvalid,
          error: emailRes.error || 'Trimiterea emailului a eșuat.'
        };
      }

      // Email succeeded — atomically claim/mark dispatched orders and track any DB update failures for reconciliation
      const failedDbUpdates: Array<{ uuid: string; displayId: string; error: string }> = [];

      for (const rawOrder of evaluated.readyRawOrders) {
        const uuid = rawOrder.id;
        const displayId = getCanonicalOrderNumber(rawOrder);
        let updatedOk = false;
        let lastErr = '';

        for (let attempt = 0; attempt < 2 && !updatedOk; attempt++) {
          const { data: freshOrder, error: fetchErr } = await supabaseAdmin
            .from('orders')
            .select('id, carrier_metadata')
            .eq('id', uuid)
            .maybeSingle();

          if (fetchErr || !freshOrder) {
            lastErr = fetchErr?.message || 'Order not found during post-dispatch claim';
            continue;
          }

          const currentMeta = (freshOrder.carrier_metadata && typeof freshOrder.carrier_metadata === 'object')
            ? freshOrder.carrier_metadata
            : {};

          if (!allowForceResend && currentMeta.fulfillment_dispatched_at) {
            updatedOk = true;
            break;
          }

          const nextMeta = {
            ...currentMeta,
            fulfillment_dispatched_at: sentAt,
            fulfillment_dispatched_to: settings.email.trim(),
            fulfillment_dispatch_id: batchId,
            fulfillment_batch_id: batchId,
          };

          let updateQuery = supabaseAdmin
            .from('orders')
            .update({
              carrier_metadata: nextMeta,
              updated_at: sentAt,
            })
            .eq('id', uuid);

          if (!allowForceResend) {
            updateQuery = updateQuery.is('carrier_metadata->>fulfillment_dispatched_at', null);
          }

          const { data: claimedRow, error: updateErr } = await updateQuery.select('id').maybeSingle();
          if (!updateErr && claimedRow) {
            updatedOk = true;
          } else {
            lastErr = updateErr?.message || 'Atomic claim returned 0 rows';
            if (attempt === 0) {
              await new Promise(resolve => setTimeout(resolve, 250));
            }
          }
        }

        if (!updatedOk) {
          failedDbUpdates.push({ uuid, displayId, error: lastErr || 'Unknown DB error' });
        }
      }

      const reconciliationWarning = failedDbUpdates.length > 0
        ? `Atenție: Emailul a fost trimis (${orders.length} comenzi), dar ${failedDbUpdates.length} comenzi nu au putut fi marcate în DB (${failedDbUpdates.map(f => f.displayId).join(', ')}). Verifică logurile de reconciliere!`
        : undefined;

      if (failedDbUpdates.length > 0) {
        await recordCriticalReconciliationAlert({
          batchId,
          sentAt,
          recipient: settings.email.trim(),
          failedUpdates: failedDbUpdates,
          totalDispatchedCount: orders.length,
        });
      }

      const batchStatus: 'sent' | 'partial' = failedDbUpdates.length > 0 ? 'partial' : 'sent';

      await appendFulfillmentHistoryLog({
        id: batchId,
        sentAt,
        sent_at: sentAt,
        recipient: settings.email.trim(),
        recipient_email: settings.email.trim(),
        secondaryRecipient: settings.secondary_email?.trim() || undefined,
        secondary_email: settings.secondary_email?.trim() || undefined,
        subject,
        trigger,
        status: batchStatus,
        orderCount: orders.length,
        order_count: orders.length,
        totalItemsCount: totalItems,
        excludedPreorders: evaluated.excludedPreorders,
        orderNumbers,
        orderIds,
        ordersSnapshot,
        orders,
        error_message: reconciliationWarning,
      });

      try {
        await supabaseAdmin
          .from('store_settings')
          .upsert({
            key: 'fulfillment_settings',
            value: {
              ...settings,
              last_dispatched_at: sentAt
            }
          });
      } catch (settingsErr) {
        console.error('Error updating fulfillment_settings.last_dispatched_at:', settingsErr);
      }

      try {
        revalidateTag('global_settings', 'max');
        revalidatePath('/admin/orders');
        revalidatePath('/admin/fulfillment');
        revalidatePath('/admin/settings');
      } catch (_) {}

      return {
        success: true,
        count: orders.length,
        batchId,
        recipient: settings.email.trim(),
        secondaryRecipient: settings.secondary_email?.trim() || null,
        subject,
        sentAt,
        excludedPreorders: evaluated.excludedPreorders,
        excludedMixedPreorders: evaluated.excludedMixedPreorders,
        skippedPreorderOrderIds: evaluated.skippedPreorderOrderIds,
        excludedDigital: evaluated.excludedDigital,
        excludedAlreadyDispatched: evaluated.excludedAlreadyDispatched,
        excludedUnpaidOrInvalid: evaluated.excludedUnpaidOrInvalid,
        reconciliationWarning,
      };
    } finally {
      await releaseDistributedDispatchLock(lockRes.token);
    }
  })();

  activeProcessDispatchPromise = runPromise;
  try {
    return await runPromise;
  } finally {
    if (activeProcessDispatchPromise === runPromise) {
      activeProcessDispatchPromise = null;
    }
  }
}
