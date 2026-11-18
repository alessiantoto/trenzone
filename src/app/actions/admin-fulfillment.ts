'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminAuthorized } from './admin-auth';
import { revalidatePath, revalidateTag } from 'next/cache';
import { Redis } from '@upstash/redis';
import {
  FulfillmentSettings,
  FulfillmentDispatchLog,
  FulfillmentOrderSummary,
  FulfillmentItemSummary,
  FulfillmentOrderSnapshot,
  BlockedFulfillmentItem,
  BlockedFulfillmentOrder,
} from '@/types/fulfillment';
import { sendFulfillmentDispatchEmail, buildFulfillmentDispatchSubject } from '@/lib/resend-service';
import { getSingleFlavorImage } from '@/lib/product-images';
import { getCanonicalOrderNumber } from '@/utils/admin-helpers';
import { isDigitalOnlyCart, isDigitalProgramItem } from '@/lib/programs';
import { isItemSnapshotPreorder, normalizeSearchText } from '@/utils/order-search';
import { headers } from 'next/headers';

export interface FulfillmentQueueOverview {
  pendingOrders: FulfillmentOrderSummary[];
  blockedOrders: BlockedFulfillmentOrder[];
  templatePreviewOrders: FulfillmentOrderSummary[];
  isSamplePreview: boolean;
  isHistoricalPreview: boolean;
  excludedPreorders: number;
  excludedMixedPreorders: number;
  excludedLiveOutOfStock: number;
  excludedPhantomOrInvalid: number;
  skippedPreorderOrderIds: string[];
  excludedDigital: number;
  excludedAlreadyDispatched: number;
  excludedUnpaidOrInvalid: number;
  liveProductsError?: string;
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
  excludedLiveOutOfStock?: number;
  excludedPhantomOrInvalid?: number;
  skippedPreorderOrderIds?: string[];
  excludedDigital?: number;
  excludedAlreadyDispatched?: number;
  excludedUnpaidOrInvalid?: number;
  reconciliationWarning?: string;
}

const DISPATCH_LOCK_KEY = 'fulfillment_dispatch_lock';
const REDIS_DISPATCH_LOCK_KEY = 'trenzone:fulfillment:dispatch_lock';
const RECONCILIATION_LOG_KEY = 'fulfillment_reconciliation_logs';
const DISPATCH_LOCK_TTL_MS = 90_000;
const CLAIM_TTL_MS = 3 * 60_000;
const BUNDLE_ID_REGEX = /^(.+)-bundle-(\d+)$/i;

const redisClient =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// In-process mutex on top of the distributed Redis/DB CAS locks for same-instance bursts
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
  'canceled',
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
  'draft',
  'test',
  'void',
  'abandoned',
  'expired',
]);

const UNPAID_STATUSES = new Set([
  'pending',
  'unpaid',
  'awaiting_payment',
  'requires_payment',
  'requires_payment_method',
  'payment_failed',
  'incomplete',
  'canceled',
  'cancelled',
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
      if (!isAuth) {
        return {
          ...DEFAULT_SETTINGS,
          email: '',
          secondary_email: '',
          notes: '',
        };
      }
      return DEFAULT_SETTINGS;
    }

    if (!isAuth) {
      return {
        ...DEFAULT_SETTINGS,
        email: '',
        secondary_email: '',
        notes: '',
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
    return {
      ...DEFAULT_SETTINGS,
      email: '',
      secondary_email: '',
      notes: '',
    };
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
        if (isDigitalOnlyOrderRow(row)) continue;

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

interface LiveProductRow {
  id: string;
  slug: string;
  name: any;
  is_active: boolean | null;
  stock_quantity: number | null;
  variants: any;
  specs_summary: any;
  metadata: any;
}

function getLocalizedTextSimple(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string' || typeof val === 'number') return String(val).trim();
  if (typeof val === 'object') {
    return String(val.ro || val.en || Object.values(val)[0] || '').trim();
  }
  return '';
}

function stripPreorderMarkersText(text: string): string {
  return normalizeSearchText(
    String(text || '')
      .replace(/\(?\s*precomand[aă]?\s*\)?/gi, '')
      .replace(/\(?\s*pre-?order\s*\)?/gi, '')
  );
}

function isDigitalOnlyOrderRow(order: any): boolean {
  const carrierId = String(order?.carrier_id || '').trim().toLowerCase();
  const shippingType = String(order?.shipping_type || '').trim().toLowerCase();
  const meta =
    order?.carrier_metadata && typeof order.carrier_metadata === 'object'
      ? order.carrier_metadata
      : {};
  const rawItems = parseOrderItemsArray(order?.items);
  const physicalItems = rawItems.filter((item: any) => !isDigitalProgramItem(item));
  return (
    Boolean(meta.is_digital_only === true) ||
    carrierId === 'digital' ||
    shippingType === 'digital' ||
    rawItems.length === 0 ||
    physicalItems.length === 0 ||
    isDigitalOnlyCart(rawItems)
  );
}

async function fetchLiveProductsForFulfillment(): Promise<
  { ok: true; products: LiveProductRow[] } | { ok: false; error: string }
> {
  try {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('id, slug, name, is_active, stock_quantity, variants, specs_summary, metadata');

    if (error || !Array.isArray(data)) {
      return {
        ok: false,
        error: error?.message || 'Nu s-a putut citi tabelul live products.',
      };
    }

    return { ok: true, products: data as LiveProductRow[] };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || 'Eroare la citirea stocului live din baza de date.',
    };
  }
}

function matchOrderItemToLiveProduct(item: any, liveProducts: LiveProductRow[]): LiveProductRow | null {
  if (!item || liveProducts.length === 0) return null;

  const rawId = String(item.id || '').trim();
  const bundleMatch = rawId.match(BUNDLE_ID_REGEX);
  const realId = (bundleMatch ? bundleMatch[1] : rawId).toLowerCase();
  const itemSlug = String(item.slug || '').trim().toLowerCase();

  if (realId) {
    const byId = liveProducts.find((p) => String(p.id || '').trim().toLowerCase() === realId);
    if (byId) return byId;

    const bySlugFromId = liveProducts.find((p) => String(p.slug || '').trim().toLowerCase() === realId);
    if (bySlugFromId) return bySlugFromId;
  }

  if (itemSlug) {
    const bySlug = liveProducts.find((p) => String(p.slug || '').trim().toLowerCase() === itemSlug);
    if (bySlug) return bySlug;
  }

  // Name fallback for legacy orders lacking item.id / item.slug
  const rawItemName = getLocalizedTextSimple(item.name);
  const itemNameNorm = normalizeSearchText(rawItemName);
  const itemBaseNorm = normalizeSearchText(rawItemName.replace(/\s*\([^)]*\)\s*$/, ''));
  if (!itemNameNorm) return null;

  for (const prod of liveProducts) {
    const pRo = normalizeSearchText(typeof prod.name === 'object' ? prod.name?.ro : prod.name);
    const pEn = normalizeSearchText(typeof prod.name === 'object' ? prod.name?.en : prod.name);
    if (
      (pRo && (pRo === itemNameNorm || (itemBaseNorm && pRo === itemBaseNorm))) ||
      (pEn && (pEn === itemNameNorm || (itemBaseNorm && pEn === itemBaseNorm)))
    ) {
      return prod;
    }
  }

  return null;
}

function evaluatePhysicalItemLiveStock(
  item: any,
  liveProducts: LiveProductRow[]
): {
  isInStockLive: boolean;
  statusLabel: string;
  blockedReason?: BlockedFulfillmentItem;
} {
  const itemName = getLocalizedTextSimple(item?.name) || 'Produs';
  const variantRaw = item?.selectedVariant?.name ?? item?.variant;
  const variantLabel = getLocalizedTextSimple(variantRaw) || undefined;

  const matchedProduct = matchOrderItemToLiveProduct(item, liveProducts);
  if (!matchedProduct) {
    return {
      isInStockLive: false,
      statusLabel: 'Produs negăsit în catalog',
      blockedReason: {
        productName: itemName,
        variant: variantLabel,
        reasonCode: 'product_not_found',
        reasonLabel: 'Produs negăsit în catalog',
      },
    };
  }

  const productLabel = getLocalizedTextSimple(matchedProduct.name) || itemName;

  if (matchedProduct.is_active === false) {
    return {
      isInStockLive: false,
      statusLabel: 'Produs inactiv',
      blockedReason: {
        productName: productLabel,
        variant: variantLabel,
        reasonCode: 'product_inactive',
        reasonLabel: 'Produs inactiv în catalog',
      },
    };
  }

  if (typeof matchedProduct.stock_quantity === 'number' && matchedProduct.stock_quantity <= 0) {
    return {
      isInStockLive: false,
      statusLabel: 'Stoc 0',
      blockedReason: {
        productName: productLabel,
        variant: variantLabel,
        reasonCode: 'live_zero_stock',
        reasonLabel: 'Stoc 0 în catalog',
      },
    };
  }

  const options: any[] = Array.isArray(matchedProduct.variants?.options)
    ? matchedProduct.variants.options
    : [];

  if (options.length > 0) {
    const candidates: string[] = [];
    if (variantRaw && typeof variantRaw === 'object') {
      if (variantRaw.ro) candidates.push(String(variantRaw.ro));
      if (variantRaw.en) candidates.push(String(variantRaw.en));
    } else if (variantRaw) {
      candidates.push(String(variantRaw));
    }

    if (candidates.length === 0) {
      const parenMatch = itemName.match(/\(([^)]+)\)\s*$/);
      if (parenMatch?.[1]) candidates.push(parenMatch[1]);
    }

    const targets = new Set<string>();
    const cleanTargets = new Set<string>();
    for (const cand of candidates) {
      const full = normalizeSearchText(cand);
      if (full) targets.add(full);
      const base = normalizeSearchText(cand.split(' · ')[0]);
      if (base) targets.add(base);
      const cleanFull = stripPreorderMarkersText(cand);
      if (cleanFull) cleanTargets.add(cleanFull);
      const cleanBase = stripPreorderMarkersText(cand.split(' · ')[0]);
      if (cleanBase) cleanTargets.add(cleanBase);
    }

    const matchedOption =
      targets.size > 0 || cleanTargets.size > 0
        ? options.find((opt) => {
            const optNames: string[] = [];
            if (opt?.name && typeof opt.name === 'object') {
              if (opt.name.ro) optNames.push(String(opt.name.ro));
              if (opt.name.en) optNames.push(String(opt.name.en));
            } else if (opt?.name) {
              optNames.push(String(opt.name));
            }
            for (const oName of optNames) {
              const oNorm = normalizeSearchText(oName);
              const oClean = stripPreorderMarkersText(oName);
              if (oNorm && targets.has(oNorm)) return true;
              if (oClean && cleanTargets.has(oClean)) return true;
            }
            return false;
          }) || null
        : null;

    if (matchedOption) {
      const optStatus = String(matchedOption.stock_status || 'in_stock')
        .trim()
        .toLowerCase();
      if (optStatus === 'preorder') {
        return {
          isInStockLive: false,
          statusLabel: 'Precomandă în catalog',
          blockedReason: {
            productName: productLabel,
            variant: variantLabel,
            reasonCode: 'live_preorder',
            reasonLabel: 'Precomandă în catalog',
          },
        };
      }
      if (optStatus === 'sold_out' || optStatus === 'out_of_stock') {
        return {
          isInStockLive: false,
          statusLabel: 'Epuizat în catalog',
          blockedReason: {
            productName: productLabel,
            variant: variantLabel,
            reasonCode: 'live_sold_out',
            reasonLabel: 'Stoc epuizat în catalog',
          },
        };
      }
      if (optStatus !== 'in_stock') {
        return {
          isInStockLive: false,
          statusLabel: `Stoc indisponibil (${optStatus})`,
          blockedReason: {
            productName: productLabel,
            variant: variantLabel,
            reasonCode: 'live_preorder',
            reasonLabel: `Status stoc: ${optStatus}`,
          },
        };
      }
      return {
        isInStockLive: true,
        statusLabel: 'În stoc curent',
      };
    }

    // No exact option matched: check if all options are non-in-stock, else fail closed
    const allPreorder = options.every(
      (o) => String(o?.stock_status || '').trim().toLowerCase() === 'preorder'
    );
    const allSoldOut = options.every((o) => {
      const st = String(o?.stock_status || '').trim().toLowerCase();
      return st === 'sold_out' || st === 'out_of_stock';
    });

    if (allPreorder) {
      return {
        isInStockLive: false,
        statusLabel: 'Precomandă în catalog',
        blockedReason: {
          productName: productLabel,
          variant: variantLabel,
          reasonCode: 'live_preorder',
          reasonLabel: 'Precomandă în catalog',
        },
      };
    }

    if (allSoldOut) {
      return {
        isInStockLive: false,
        statusLabel: 'Epuizat în catalog',
        blockedReason: {
          productName: productLabel,
          variant: variantLabel,
          reasonCode: 'live_sold_out',
          reasonLabel: 'Stoc epuizat în catalog',
        },
      };
    }

    return {
      isInStockLive: false,
      statusLabel: 'Variantă neidentificată',
      blockedReason: {
        productName: productLabel,
        variant: variantLabel,
        reasonCode: 'variant_unmatched',
        reasonLabel: 'Variantă neidentificată — verificare stoc necesară',
      },
    };
  }

  return {
    isInStockLive: true,
    statusLabel: 'În stoc curent',
  };
}

function getPhantomOrderReason(order: any, physicalItems: any[]): string | null {
  const totalAmount = Number(order?.total_amount ?? 0);
  const meta =
    order?.carrier_metadata && typeof order.carrier_metadata === 'object'
      ? order.carrier_metadata
      : {};
  const hasCoupon = Boolean(order?.coupon_id || meta.coupon_id || meta.coupon_code);

  if (!Number.isFinite(totalAmount) || (totalAmount <= 0 && !hasCoupon)) {
    return 'Sumă invalidă (total <= 0 fără cupon)';
  }

  const hasValidQty = physicalItems.some((it: any) => (Number(it?.quantity) || 0) > 0);
  if (!hasValidQty) {
    return 'Cantitate articole fizice invalidă (<= 0)';
  }

  const fullName = `${order?.customer_firstname || ''} ${order?.customer_lastname || ''}`.trim();
  if (!fullName || fullName.length < 2 || fullName.toLowerCase() === 'n/a') {
    return 'Nume destinatar lipsă';
  }

  const phoneDigits = String(order?.customer_phone || '').replace(/\D/g, '');
  if (phoneDigits.length < 6) {
    return 'Număr telefon lipsă / invalid';
  }

  const shippingType = String(order?.shipping_type || 'hd').trim().toLowerCase();
  if (shippingType === 'pudo') {
    const hasLocker = Boolean(
      String(order?.branch_id || '').trim() ||
        String(order?.branch_name || '').trim() ||
        String(meta.locker_id || '').trim() ||
        String(order?.addr_line1 || '').trim()
    );
    if (!hasLocker) {
      return 'Locker / adresă Easybox lipsă';
    }
  } else {
    const line1 = String(order?.addr_line1 || '').trim();
    const city = String(order?.addr_city || '').trim();
    if (!line1 || line1.toLowerCase() === 'n/a' || !city || city.toLowerCase() === 'n/a') {
      return 'Adresă / oraș livrare lipsă';
    }
  }

  return null;
}

interface OrderFulfillmentClassification {
  alreadyDispatched: boolean;
  currentlyClaiming: boolean;
  hasAwb: boolean;
  isNonFulfillableStatus: boolean;
  isUnpaidCard: boolean;
  isDigitalOnly: boolean;
  isPhantomOrCorrupted: boolean;
  phantomReason: string | null;
  hasPreorderItems: boolean;
  isMixedPreorder: boolean;
  isExplicitlyReleasedPreorder: boolean;
  isUnreleasedPreorder: boolean;
  hasLiveOutOfStockOrPreorder: boolean;
  blockedLiveItems: BlockedFulfillmentItem[];
  evaluatedItems: Array<{
    name: string;
    variant?: string;
    quantity: number;
    isInStockLive: boolean;
    statusLabel: string;
  }>;
  isEligibleDefault: boolean;
}

/**
 * Classifies an order's eligibility for warehouse fulfillment dispatch.
 * Enforces strict safety against:
 * - Live catalog preorder / sold_out / zero-stock / inactive products
 * - Unreleased pure & mixed preorders
 * - Digital-only orders
 * - Phantom / corrupted orders (missing recipient/address/phone, <=0 total without coupon)
 * - Unpaid card / failed / cancelled / refunded / returned / shipped / delivered orders
 * - Already-AWB, currently-claiming, and already-dispatched orders
 */
function classifyOrderForFulfillment(
  order: any,
  liveProducts: LiveProductRow[]
): OrderFulfillmentClassification {
  const status = String(order?.status || '').trim().toLowerCase();
  const paymentMethod = String(order?.payment_method || '').trim().toLowerCase();
  const meta = (order?.carrier_metadata && typeof order.carrier_metadata === 'object')
    ? order.carrier_metadata
    : {};
  const rawItems = parseOrderItemsArray(order?.items);
  const physicalItems = rawItems.filter((item: any) => !isDigitalProgramItem(item));

  const alreadyDispatched = Boolean(
    meta.fulfillment_dispatched_at || meta.fulfillment_dispatched === true
  );
  const claimingAtMs = meta.fulfillment_claiming_at
    ? new Date(meta.fulfillment_claiming_at).getTime()
    : NaN;
  const currentlyClaiming =
    Number.isFinite(claimingAtMs) && Date.now() - claimingAtMs < CLAIM_TTL_MS;

  const hasAwb = Boolean(order?.tracking_number && String(order.tracking_number).trim());
  const isNonFulfillableStatus = NON_FULFILLABLE_STATUSES.has(status);

  const metaPaymentStatus = String(meta.payment_status || '').trim().toLowerCase();
  const isUnpaidCard =
    UNPAID_STATUSES.has(status) ||
    (CARD_PAYMENT_METHODS.has(paymentMethod) && (
      metaPaymentStatus === 'unpaid' ||
      metaPaymentStatus === 'failed' ||
      metaPaymentStatus === 'pending' ||
      metaPaymentStatus === 'canceled' ||
      metaPaymentStatus === 'cancelled' ||
      meta.paid === false
    ));

  const isDigitalOnly = isDigitalOnlyOrderRow(order);
  const phantomReason = !isDigitalOnly ? getPhantomOrderReason(order, physicalItems) : null;
  const isPhantomOrCorrupted = Boolean(phantomReason);

  const hasPreorderItems =
    status === 'preorder' ||
    meta.is_preorder === true ||
    rawItems.some((item: any) => isItemSnapshotPreorder(item));

  const hasInStockSnapshotPhysical = rawItems.some(
    (item: any) => !isItemSnapshotPreorder(item) && !isDigitalProgramItem(item)
  );
  const isMixedPreorder = hasPreorderItems && hasInStockSnapshotPhysical;

  const isExplicitlyReleasedPreorder =
    status !== 'preorder' &&
    (meta.preorder_released === true || Boolean(meta.preorder_released_at));

  const isUnreleasedPreorder = hasPreorderItems && !isExplicitlyReleasedPreorder;

  const blockedLiveItems: BlockedFulfillmentItem[] = [];
  const evaluatedItems: Array<{
    name: string;
    variant?: string;
    quantity: number;
    isInStockLive: boolean;
    statusLabel: string;
  }> = [];

  if (!isDigitalOnly) {
    for (const item of physicalItems) {
      const liveEval = evaluatePhysicalItemLiveStock(item, liveProducts);
      const itemName = getLocalizedTextSimple(item?.name) || 'Produs';
      const variantLabel = getLocalizedTextSimple(item?.selectedVariant?.name ?? item?.variant) || undefined;
      evaluatedItems.push({
        name: itemName,
        variant: variantLabel,
        quantity: Number(item?.quantity) || 1,
        isInStockLive: liveEval.isInStockLive,
        statusLabel: liveEval.statusLabel,
      });
      if (!liveEval.isInStockLive && liveEval.blockedReason) {
        blockedLiveItems.push(liveEval.blockedReason);
      }
    }
  }

  const hasLiveOutOfStockOrPreorder = blockedLiveItems.length > 0;

  const isEligibleDefault =
    !alreadyDispatched &&
    !currentlyClaiming &&
    !hasAwb &&
    !isNonFulfillableStatus &&
    !isUnpaidCard &&
    !isDigitalOnly &&
    !isPhantomOrCorrupted &&
    !isUnreleasedPreorder &&
    !hasLiveOutOfStockOrPreorder;

  return {
    alreadyDispatched,
    currentlyClaiming,
    hasAwb,
    isNonFulfillableStatus,
    isUnpaidCard,
    isDigitalOnly,
    isPhantomOrCorrupted,
    phantomReason,
    hasPreorderItems,
    isMixedPreorder,
    isExplicitlyReleasedPreorder,
    isUnreleasedPreorder,
    hasLiveOutOfStockOrPreorder,
    blockedLiveItems,
    evaluatedItems,
    isEligibleDefault,
  };
}

function buildBlockedOrderEntry(
  order: any,
  cls: OrderFulfillmentClassification
): BlockedFulfillmentOrder {
  const formatted = formatOrderForFulfillment(order);
  const blockedItems: BlockedFulfillmentItem[] = [...cls.blockedLiveItems];

  if (cls.isPhantomOrCorrupted && cls.phantomReason) {
    blockedItems.push({
      productName: 'Date comandă incomplete / invalide',
      reasonCode: 'phantom_invalid',
      reasonLabel: cls.phantomReason,
    });
  } else if (cls.isUnreleasedPreorder && blockedItems.length === 0) {
    blockedItems.push({
      productName: 'Comandă în așteptare (Precomandă neeliberată)',
      reasonCode: 'snapshot_preorder',
      reasonLabel: 'Status Precomandă — necesită eliberare manuală',
    });
  }

  let blockReasonType: BlockedFulfillmentOrder['blockReasonType'] = 'live_stock';
  if (cls.isPhantomOrCorrupted) {
    blockReasonType = 'phantom_invalid';
  } else if (cls.isMixedPreorder) {
    blockReasonType = 'mixed_preorder';
  } else if (cls.isUnreleasedPreorder && !cls.hasLiveOutOfStockOrPreorder) {
    blockReasonType = 'preorder_hold';
  }

  const summaryParts = blockedItems.map((bi) =>
    bi.variant ? `${bi.productName} (${bi.variant}): ${bi.reasonLabel}` : `${bi.productName}: ${bi.reasonLabel}`
  );

  return {
    id: formatted.id,
    supabaseId: formatted.supabaseId,
    date: formatted.date,
    customer: formatted.customer,
    city: formatted.city,
    country: formatted.country,
    total: formatted.total,
    status: String(order?.status || 'processing'),
    paymentMethod: formatted.paymentMethod,
    blockReasonType,
    blockSummary: Array.from(new Set(summaryParts)).join(' | ') || 'Blocată temporar',
    blockedItems,
    allItems: cls.evaluatedItems,
  };
}

interface EvaluatedOrdersResult {
  readyRawOrders: any[];
  blockedOrders: BlockedFulfillmentOrder[];
  excludedPreorders: number;
  excludedMixedPreorders: number;
  excludedLiveOutOfStock: number;
  excludedPhantomOrInvalid: number;
  skippedPreorderOrderIds: string[];
  excludedDigital: number;
  excludedAlreadyDispatched: number;
  excludedUnpaidOrInvalid: number;
  liveProductsError?: string;
}

async function evaluateFulfillmentOrders(options?: {
  orderIds?: string[];
  includeAlreadyDispatched?: boolean;
  includePreorders?: boolean;
}): Promise<EvaluatedOrdersResult> {
  const emptyResult = (liveProductsError?: string): EvaluatedOrdersResult => ({
    readyRawOrders: [],
    blockedOrders: [],
    excludedPreorders: 0,
    excludedMixedPreorders: 0,
    excludedLiveOutOfStock: 0,
    excludedPhantomOrInvalid: 0,
    skippedPreorderOrderIds: [],
    excludedDigital: 0,
    excludedAlreadyDispatched: 0,
    excludedUnpaidOrInvalid: 0,
    ...(liveProductsError ? { liveProductsError } : {}),
  });

  // Always verify live catalog stock first — fail closed if DB query fails
  const liveProductsRes = await fetchLiveProductsForFulfillment();
  if (!liveProductsRes.ok) {
    console.error('[FULFILLMENT] Failed fetching live products for stock guard:', liveProductsRes.error);
    return emptyResult(liveProductsRes.error);
  }
  const liveProducts = liveProductsRes.products;

  let query = supabaseAdmin
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (options?.orderIds && options.orderIds.length > 0) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const uuids = Array.from(new Set(options.orderIds.filter(id => uuidRegex.test(id))));
    if (uuids.length === 0) {
      return emptyResult();
    }
    query = query.in('id', uuids);
  }

  const { data, error } = await query;
  if (error || !data) {
    return emptyResult(error?.message);
  }

  const readyRawOrders: any[] = [];
  const blockedOrders: BlockedFulfillmentOrder[] = [];
  const seenIds = new Set<string>();
  let excludedPreorders = 0;
  let excludedMixedPreorders = 0;
  let excludedLiveOutOfStock = 0;
  let excludedPhantomOrInvalid = 0;
  const skippedPreorderOrderIds: string[] = [];
  let excludedDigital = 0;
  let excludedAlreadyDispatched = 0;
  let excludedUnpaidOrInvalid = 0;

  for (const order of data) {
    if (!order?.id || seenIds.has(order.id)) continue;
    seenIds.add(order.id);

    const cls = classifyOrderForFulfillment(order, liveProducts);

    // Hard safety gates (never bypassed even with explicit orderIds)
    if (cls.isDigitalOnly) {
      excludedDigital++;
      continue;
    }

    if (cls.isNonFulfillableStatus || cls.isUnpaidCard || cls.hasAwb) {
      excludedUnpaidOrInvalid++;
      continue;
    }

    if (!options?.includeAlreadyDispatched && (cls.alreadyDispatched || cls.currentlyClaiming)) {
      excludedAlreadyDispatched++;
      continue;
    }

    if (cls.isPhantomOrCorrupted) {
      excludedPhantomOrInvalid++;
      excludedUnpaidOrInvalid++;
      blockedOrders.push(buildBlockedOrderEntry(order, cls));
      continue;
    }

    // Live catalog stock gate: NEVER allow preorder/out-of-stock/inactive physical products
    if (cls.hasLiveOutOfStockOrPreorder) {
      excludedLiveOutOfStock++;
      if (cls.isUnreleasedPreorder || cls.hasPreorderItems) {
        excludedPreorders++;
        if (cls.isMixedPreorder) excludedMixedPreorders++;
      }
      skippedPreorderOrderIds.push(getCanonicalOrderNumber(order));
      blockedOrders.push(buildBlockedOrderEntry(order, cls));
      continue;
    }

    if (!options?.includePreorders && cls.isUnreleasedPreorder) {
      excludedPreorders++;
      if (cls.isMixedPreorder) excludedMixedPreorders++;
      skippedPreorderOrderIds.push(getCanonicalOrderNumber(order));
      blockedOrders.push(buildBlockedOrderEntry(order, cls));
      continue;
    }

    readyRawOrders.push(order);
  }

  return {
    readyRawOrders,
    blockedOrders,
    excludedPreorders,
    excludedMixedPreorders,
    excludedLiveOutOfStock,
    excludedPhantomOrInvalid,
    skippedPreorderOrderIds,
    excludedDigital,
    excludedAlreadyDispatched,
    excludedUnpaidOrInvalid,
  };
}

/**
 * Get orders ready for fulfillment (filters out already dispatched orders, digital-only, unpaid/cancelled/AWB, phantom, unreleased preorders, and live out-of-stock/preorder products)
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
 * Get count of orders waiting for fulfillment vs already dispatched (and held preorders / live-blocked stock)
 */
export async function getFulfillmentPendingCount(): Promise<{
  pendingCount: number;
  dispatchedCount: number;
  heldPreorderCount: number;
  blockedLiveStockCount: number;
}> {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) {
    return { pendingCount: 0, dispatchedCount: 0, heldPreorderCount: 0, blockedLiveStockCount: 0 };
  }

  try {
    const evaluated = await evaluateFulfillmentOrders();
    if (evaluated.liveProductsError) {
      return { pendingCount: 0, dispatchedCount: 0, heldPreorderCount: 0, blockedLiveStockCount: 0 };
    }

    return {
      pendingCount: evaluated.readyRawOrders.length,
      dispatchedCount: evaluated.excludedAlreadyDispatched,
      heldPreorderCount: evaluated.excludedPreorders,
      blockedLiveStockCount: evaluated.excludedLiveOutOfStock,
    };
  } catch {
    return { pendingCount: 0, dispatchedCount: 0, heldPreorderCount: 0, blockedLiveStockCount: 0 };
  }
}

/**
 * Generate standardized CSV content for warehouse fulfillment systems (Excel compatible with UTF-8 BOM)
 */
export async function generateFulfillmentCsv(orders: FulfillmentOrderSummary[]): Promise<string> {
  const isAuthorized = await isAdminOrCronAuthorized();
  if (!isAuthorized) throw new Error('Neautorizat');

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
 * Full queue overview for FulfillmentModal (separating genuine pending orders from template preview fallback, held preorders, and live-blocked orders)
 */
export async function getFulfillmentQueueOverview(): Promise<FulfillmentQueueOverview> {
  const isAuthorized = await isAdminOrCronAuthorized();
  if (!isAuthorized) {
    return {
      pendingOrders: [],
      blockedOrders: [],
      templatePreviewOrders: [],
      isSamplePreview: false,
      isHistoricalPreview: false,
      excludedPreorders: 0,
      excludedMixedPreorders: 0,
      excludedLiveOutOfStock: 0,
      excludedPhantomOrInvalid: 0,
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
      blockedOrders: evaluated.blockedOrders,
      templatePreviewOrders: pendingOrders,
      isSamplePreview: false,
      isHistoricalPreview: false,
      excludedPreorders: evaluated.excludedPreorders,
      excludedMixedPreorders: evaluated.excludedMixedPreorders,
      excludedLiveOutOfStock: evaluated.excludedLiveOutOfStock,
      excludedPhantomOrInvalid: evaluated.excludedPhantomOrInvalid,
      skippedPreorderOrderIds: evaluated.skippedPreorderOrderIds,
      excludedDigital: evaluated.excludedDigital,
      excludedAlreadyDispatched: evaluated.excludedAlreadyDispatched,
      excludedUnpaidOrInvalid: evaluated.excludedUnpaidOrInvalid,
      ...(evaluated.liveProductsError ? { liveProductsError: evaluated.liveProductsError } : {}),
    };
  }

  const anyOrders = evaluated.liveProductsError
    ? []
    : await getFulfillmentOrdersReady(undefined, { includeAlreadyDispatched: true });
  if (anyOrders.length > 0) {
    return {
      pendingOrders: [],
      blockedOrders: evaluated.blockedOrders,
      templatePreviewOrders: anyOrders.slice(0, 10),
      isSamplePreview: false,
      isHistoricalPreview: true,
      excludedPreorders: evaluated.excludedPreorders,
      excludedMixedPreorders: evaluated.excludedMixedPreorders,
      excludedLiveOutOfStock: evaluated.excludedLiveOutOfStock,
      excludedPhantomOrInvalid: evaluated.excludedPhantomOrInvalid,
      skippedPreorderOrderIds: evaluated.skippedPreorderOrderIds,
      excludedDigital: evaluated.excludedDigital,
      excludedAlreadyDispatched: evaluated.excludedAlreadyDispatched,
      excludedUnpaidOrInvalid: evaluated.excludedUnpaidOrInvalid,
    };
  }

  return {
    pendingOrders: [],
    blockedOrders: evaluated.blockedOrders,
    templatePreviewOrders: getSamplePreviewOrders(),
    isSamplePreview: true,
    isHistoricalPreview: false,
    excludedPreorders: evaluated.excludedPreorders,
    excludedMixedPreorders: evaluated.excludedMixedPreorders,
    excludedLiveOutOfStock: evaluated.excludedLiveOutOfStock,
    excludedPhantomOrInvalid: evaluated.excludedPhantomOrInvalid,
    skippedPreorderOrderIds: evaluated.skippedPreorderOrderIds,
    excludedDigital: evaluated.excludedDigital,
    excludedAlreadyDispatched: evaluated.excludedAlreadyDispatched,
    excludedUnpaidOrInvalid: evaluated.excludedUnpaidOrInvalid,
    ...(evaluated.liveProductsError ? { liveProductsError: evaluated.liveProductsError } : {}),
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
  const isAuthorized = await isAdminOrCronAuthorized();
  if (!isAuthorized) throw new Error('Neautorizat');

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
    const [ordersRes, liveProductsRes] = await Promise.all([
      supabaseAdmin
        .from('orders')
        .select('id, status, payment_method, tracking_number, carrier_id, shipping_type, carrier_metadata, items, payment_intent_id, receipt_url')
        .in('id', uuids),
      fetchLiveProductsForFulfillment(),
    ]);

    const { data: rows, error } = ordersRes;
    if (error || !rows || rows.length === 0) {
      return { success: false, error: error?.message || 'Comenzile nu au fost găsite.' };
    }

    const liveProducts = liveProductsRes.ok ? liveProductsRes.products : [];
    const releasedAt = new Date().toISOString();
    const releasedOrderNumbers: string[] = [];

    for (const row of rows) {
      const cls = classifyOrderForFulfillment(row, liveProducts);
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
    revalidatePath('/admin/fulfillment');

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
  redisLocked?: boolean;
  reason?: string;
}> {
  const nowMs = Date.now();
  const lockToken = `lock_${nowMs}_${Math.random().toString(36).slice(2, 10)}`;
  let redisLocked = false;

  // Layer 1: Optional Upstash Redis SET NX atomic lock (fast cross-instance exclusion)
  if (redisClient) {
    try {
      const ttlSeconds = Math.max(30, Math.ceil(DISPATCH_LOCK_TTL_MS / 1000));
      const setRes = await redisClient.set(REDIS_DISPATCH_LOCK_KEY, lockToken, {
        nx: true,
        ex: ttlSeconds,
      });
      if (setRes !== 'OK') {
        return {
          acquired: false,
          reason: 'O expediere către fulfillment este deja în curs de procesare (lock activ). Te rugăm să aștepți finalizarea ei.',
        };
      }
      redisLocked = true;
    } catch (redisErr) {
      console.warn('[FULFILLMENT LOCK] Redis lock check failed, falling back to DB CAS lock:', redisErr);
    }
  }

  const releaseRedisIfHeld = async () => {
    if (!redisLocked || !redisClient) return;
    try {
      await redisClient.eval(
        `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`,
        [REDIS_DISPATCH_LOCK_KEY],
        [lockToken]
      );
    } catch {
      // Ignore cleanup error
    }
  };

  // Layer 2: Supabase store_settings optimistic CAS lock
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
    await releaseRedisIfHeld();
    return { acquired: false, reason: `Eroare citire lock fulfillment: ${readErr.message}` };
  }

  if (!existingRow) {
    const { error: insertErr } = await supabaseAdmin
      .from('store_settings')
      .insert({ key: DISPATCH_LOCK_KEY, value: newLockValue });

    if (insertErr) {
      await releaseRedisIfHeld();
      return {
        acquired: false,
        reason: 'O altă expediere către fulfillment a început chiar acum. Reîncearcă în câteva secunde.',
      };
    }
    return { acquired: true, token: lockToken, redisLocked };
  }

  const prevVal = (existingRow.value && typeof existingRow.value === 'object') ? existingRow.value : {};
  const prevExpiresMs = prevVal.expires_at ? new Date(prevVal.expires_at).getTime() : 0;
  if (prevVal.locked === true && Number.isFinite(prevExpiresMs) && prevExpiresMs > nowMs) {
    await releaseRedisIfHeld();
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
    await releaseRedisIfHeld();
    return {
      acquired: false,
      reason: 'O altă expediere către fulfillment este deja în curs. Reîncearcă în câteva secunde.',
    };
  }

  return { acquired: true, token: lockToken, redisLocked };
}

async function releaseDistributedDispatchLock(lockToken: string, redisLocked?: boolean): Promise<void> {
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
    console.error('[FULFILLMENT LOCK] Failed to release DB lock:', err);
  }

  if (redisLocked && redisClient) {
    try {
      await redisClient.eval(
        `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`,
        [REDIS_DISPATCH_LOCK_KEY],
        [lockToken]
      );
    } catch (err) {
      console.error('[FULFILLMENT LOCK] Failed to release Redis lock:', err);
    }
  }
}

async function claimOrdersForDispatchBatch(
  candidateOrders: any[],
  batchId: string,
  claimTimestamp: string,
  trigger: 'manual' | 'scheduled_8am',
  allowForceResend: boolean
): Promise<any[]> {
  const claimedOrders: any[] = [];

  for (const candidate of candidateOrders) {
    const uuid = candidate?.id;
    if (!uuid) continue;

    const { data: freshOrder, error: fetchErr } = await supabaseAdmin
      .from('orders')
      .select('id, status, tracking_number, carrier_metadata')
      .eq('id', uuid)
      .maybeSingle();

    if (fetchErr || !freshOrder) continue;

    const statusLower = String(freshOrder.status || '').trim().toLowerCase();
    if (NON_FULFILLABLE_STATUSES.has(statusLower) || UNPAID_STATUSES.has(statusLower) || statusLower === 'preorder') {
      continue;
    }

    if (freshOrder.tracking_number && String(freshOrder.tracking_number).trim()) {
      continue;
    }

    const currentMeta =
      freshOrder.carrier_metadata && typeof freshOrder.carrier_metadata === 'object'
        ? freshOrder.carrier_metadata
        : {};

    if (!allowForceResend && (currentMeta.fulfillment_dispatched_at || currentMeta.fulfillment_dispatched === true)) {
      continue;
    }

    const existingClaimAt = currentMeta.fulfillment_claiming_at
      ? String(currentMeta.fulfillment_claiming_at)
      : null;
    if (existingClaimAt) {
      const claimAgeMs = Date.now() - new Date(existingClaimAt).getTime();
      if (Number.isFinite(claimAgeMs) && claimAgeMs < CLAIM_TTL_MS) {
        continue;
      }
    }

    const nextMeta = {
      ...currentMeta,
      fulfillment_claiming_at: claimTimestamp,
      fulfillment_claiming_batch_id: batchId,
      fulfillment_claiming_trigger: trigger,
    };

    let claimQuery = supabaseAdmin
      .from('orders')
      .update({
        carrier_metadata: nextMeta,
        updated_at: claimTimestamp,
      })
      .eq('id', uuid)
      .is('tracking_number', null);

    if (!allowForceResend) {
      claimQuery = claimQuery.is('carrier_metadata->>fulfillment_dispatched_at', null);
    }
    if (existingClaimAt) {
      claimQuery = claimQuery.filter('carrier_metadata->>fulfillment_claiming_at', 'eq', existingClaimAt);
    } else {
      claimQuery = claimQuery.is('carrier_metadata->>fulfillment_claiming_at', null);
    }

    const { data: claimedRow, error: claimErr } = await claimQuery.select('id').maybeSingle();
    if (!claimErr && claimedRow) {
      claimedOrders.push(candidate);
    }
  }

  return claimedOrders;
}

async function rollbackOrderDispatchClaims(claimedOrders: any[], batchId: string): Promise<void> {
  const rolledBackAt = new Date().toISOString();
  for (const row of claimedOrders) {
    if (!row?.id) continue;
    try {
      const { data: freshOrder } = await supabaseAdmin
        .from('orders')
        .select('id, carrier_metadata')
        .eq('id', row.id)
        .maybeSingle();

      if (!freshOrder) continue;
      const currentMeta =
        freshOrder.carrier_metadata && typeof freshOrder.carrier_metadata === 'object'
          ? { ...freshOrder.carrier_metadata }
          : {};

      if (currentMeta.fulfillment_claiming_batch_id !== batchId) continue;

      delete currentMeta.fulfillment_claiming_at;
      delete currentMeta.fulfillment_claiming_batch_id;
      delete currentMeta.fulfillment_claiming_trigger;

      await supabaseAdmin
        .from('orders')
        .update({
          carrier_metadata: currentMeta,
          updated_at: rolledBackAt,
        })
        .eq('id', row.id)
        .filter('carrier_metadata->>fulfillment_claiming_batch_id', 'eq', batchId);
    } catch (err) {
      console.error(`[FULFILLMENT CLAIM ROLLBACK] Failed rolling back order ${row.id}:`, err);
    }
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
 * Protected by in-process mutex + distributed Redis/DB CAS locks + live catalog stock verification + two-phase claim with rollback.
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

  // Cron must NEVER bypass duplicate protection or preorder hold; live stock guard is ALWAYS enforced.
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

      // Re-query eligible orders + live products inside the lock
      const evaluated = await evaluateFulfillmentOrders({
        orderIds: options?.orderIds,
        includeAlreadyDispatched: allowForceResend,
        includePreorders: allowPreorderOverride,
      });

      if (evaluated.liveProductsError) {
        return {
          success: false,
          count: 0,
          error: `Nu s-a putut verifica stocul live din catalog (${evaluated.liveProductsError}). Expedierea a fost oprită preventiv.`,
        };
      }

      if (evaluated.readyRawOrders.length === 0) {
        const heldNotes: string[] = [];
        if (evaluated.excludedLiveOutOfStock > 0) {
          heldNotes.push(`${evaluated.excludedLiveOutOfStock} ${evaluated.excludedLiveOutOfStock === 1 ? 'comandă blocată' : 'comenzi blocate'} (produse pe precomandă / fără stoc în catalog)`);
        }
        if (evaluated.excludedPreorders > evaluated.excludedLiveOutOfStock) {
          const snapshotOnly = evaluated.excludedPreorders - evaluated.excludedLiveOutOfStock;
          heldNotes.push(`${snapshotOnly} ${snapshotOnly === 1 ? 'precomandă reținută' : 'precomenzi reținute'}`);
        }
        const suffix = heldNotes.length > 0 ? ` (${heldNotes.join('; ')}).` : '';
        return {
          success: true,
          count: 0,
          excludedPreorders: evaluated.excludedPreorders,
          excludedMixedPreorders: evaluated.excludedMixedPreorders,
          excludedLiveOutOfStock: evaluated.excludedLiveOutOfStock,
          excludedPhantomOrInvalid: evaluated.excludedPhantomOrInvalid,
          skippedPreorderOrderIds: evaluated.skippedPreorderOrderIds,
          excludedDigital: evaluated.excludedDigital,
          excludedAlreadyDispatched: evaluated.excludedAlreadyDispatched,
          excludedUnpaidOrInvalid: evaluated.excludedUnpaidOrInvalid,
          message: `Nu există comenzi eligibile în stoc curent de transmis către fulfillment.${suffix}`
        };
      }

      const sentAt = new Date().toISOString();
      const dateStr = sentAt.split('T')[0];
      const batchId = `disp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

      // Phase 1: Atomically claim each eligible order BEFORE sending any email
      const claimedRawOrders = await claimOrdersForDispatchBatch(
        evaluated.readyRawOrders,
        batchId,
        sentAt,
        trigger,
        allowForceResend
      );

      if (claimedRawOrders.length === 0) {
        return {
          success: true,
          count: 0,
          excludedPreorders: evaluated.excludedPreorders,
          excludedMixedPreorders: evaluated.excludedMixedPreorders,
          excludedLiveOutOfStock: evaluated.excludedLiveOutOfStock,
          excludedPhantomOrInvalid: evaluated.excludedPhantomOrInvalid,
          skippedPreorderOrderIds: evaluated.skippedPreorderOrderIds,
          excludedDigital: evaluated.excludedDigital,
          excludedAlreadyDispatched: evaluated.excludedAlreadyDispatched,
          excludedUnpaidOrInvalid: evaluated.excludedUnpaidOrInvalid,
          message: 'Comenzile eligibile au fost deja revendicate sau expediate de un alt proces.'
        };
      }

      const orders = claimedRawOrders.map(formatOrderForFulfillment);
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

      // Send email ONLY for atomically claimed orders
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
      const orderIds = claimedRawOrders.map((r) => r.id);

      if (!emailRes.success) {
        // Rollback claim so failed email delivery does not lock out valid orders
        await rollbackOrderDispatchClaims(claimedRawOrders, batchId);

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
          excludedLiveOutOfStock: evaluated.excludedLiveOutOfStock,
          excludedPhantomOrInvalid: evaluated.excludedPhantomOrInvalid,
          skippedPreorderOrderIds: evaluated.skippedPreorderOrderIds,
          excludedDigital: evaluated.excludedDigital,
          excludedAlreadyDispatched: evaluated.excludedAlreadyDispatched,
          excludedUnpaidOrInvalid: evaluated.excludedUnpaidOrInvalid,
          error: emailRes.error || 'Trimiterea emailului a eșuat.'
        };
      }

      // Phase 2: Email succeeded — finalize claim into permanent fulfillment_dispatched state
      const failedDbUpdates: Array<{ uuid: string; displayId: string; error: string }> = [];

      for (const rawOrder of claimedRawOrders) {
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
            lastErr = fetchErr?.message || 'Order not found during post-dispatch finalize';
            continue;
          }

          const currentMeta = (freshOrder.carrier_metadata && typeof freshOrder.carrier_metadata === 'object')
            ? { ...freshOrder.carrier_metadata }
            : {};

          if (!allowForceResend && (currentMeta.fulfillment_dispatched_at || currentMeta.fulfillment_dispatched === true)) {
            updatedOk = true;
            break;
          }

          delete currentMeta.fulfillment_claiming_at;
          delete currentMeta.fulfillment_claiming_batch_id;
          delete currentMeta.fulfillment_claiming_trigger;

          const nextMeta = {
            ...currentMeta,
            fulfillment_dispatched: true,
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

          const { data: finalizedRow, error: updateErr } = await updateQuery.select('id').maybeSingle();
          if (!updateErr && finalizedRow) {
            updatedOk = true;
          } else {
            lastErr = updateErr?.message || 'Atomic finalize returned 0 rows';
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
        excludedLiveOutOfStock: evaluated.excludedLiveOutOfStock,
        excludedPhantomOrInvalid: evaluated.excludedPhantomOrInvalid,
        skippedPreorderOrderIds: evaluated.skippedPreorderOrderIds,
        excludedDigital: evaluated.excludedDigital,
        excludedAlreadyDispatched: evaluated.excludedAlreadyDispatched,
        excludedUnpaidOrInvalid: evaluated.excludedUnpaidOrInvalid,
        reconciliationWarning,
      };
    } finally {
      await releaseDistributedDispatchLock(lockRes.token, lockRes.redisLocked);
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
