export interface FulfillmentSettings {
  email: string;
  secondary_email?: string;
  manual_shipping_enabled: boolean;
  auto_dispatch_enabled: boolean;
  auto_dispatch_time: string; // Legacy display field; cron runs at 06:00 UTC
  last_dispatched_at: string | null;
  notes?: string;
}

export interface FulfillmentItemSummary {
  name: string;
  variant?: string;
  quantity: number;
  sku?: string;
  image?: string;
}

export interface BlockedFulfillmentItem {
  productName: string;
  variant?: string;
  reasonCode:
    | 'live_preorder'
    | 'live_sold_out'
    | 'live_zero_stock'
    | 'product_inactive'
    | 'product_not_found'
    | 'snapshot_preorder'
    | 'variant_unmatched'
    | 'phantom_invalid';
  reasonLabel: string;
}

export interface BlockedFulfillmentOrder {
  id: string; // display ID like TZ-2026-XXXX
  supabaseId: string;
  date: string;
  customer: string;
  city: string;
  country: string;
  total: string;
  status: string;
  paymentMethod: string;
  blockReasonType: 'live_stock' | 'preorder_hold' | 'mixed_preorder' | 'phantom_invalid';
  blockSummary: string;
  blockedItems: BlockedFulfillmentItem[];
  allItems: Array<{
    name: string;
    variant?: string;
    quantity: number;
    isInStockLive: boolean;
    statusLabel: string;
  }>;
}

export interface FulfillmentOrderSummary {
  id: string; // display ID like TZ-2026-XXXX
  supabaseId: string;
  date: string;
  customer: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  city: string;
  county?: string;
  zip: string;
  country: string;
  branchId?: string;
  branchName?: string;
  total: string;
  totalAmount: number;
  currency: string;
  paymentMethod: 'stripe' | 'cod' | string;
  priorityProcessing?: boolean;
  giftPackaging?: boolean;
  giftMessage?: string | null;
  shippingType?: string;
  items: FulfillmentItemSummary[];
}

export interface FulfillmentItemSnapshot {
  name: string;
  variant?: string;
  quantity: number;
  sku?: string;
}

export interface FulfillmentOrderSnapshot {
  id: string;
  orderNumber: string;
  customerName: string;
  city: string;
  country: string;
  shippingType: string;
  paymentMethod: string;
  totalAmount: number;
  currency: string;
  items: FulfillmentItemSnapshot[];
}

export interface FulfillmentDispatchLog {
  id: string;
  sentAt: string;
  sent_at: string;
  recipient: string;
  recipient_email: string;
  secondaryRecipient?: string;
  secondary_email?: string;
  subject?: string;
  trigger: 'manual' | 'scheduled_8am';
  status: 'sent' | 'partial' | 'failed';
  orderCount: number;
  order_count: number;
  totalItemsCount: number;
  excludedPreorders: number;
  orderNumbers: string[];
  orderIds?: string[];
  ordersSnapshot: FulfillmentOrderSnapshot[];
  orders: FulfillmentOrderSummary[];
  error_message?: string;
}

export const FULFILLMENT_CRON_UTC_HOUR = 6;
export const FULFILLMENT_CRON_UTC_MINUTE = 0;
export const ROMANIA_TIMEZONE = 'Europe/Bucharest';

export interface FulfillmentScheduleInfo {
  autoDispatchEnabled: boolean;
  nextDispatchUtcIso: string;
  nextTimeRo: string;
  todayTimeRo: string;
  nextDateRo: string;
  nextDayLabelRo: string;
  timezoneOffsetLabel: string;
  countdownLabel: string;
  hasWindowPassedToday: boolean;
  todayBatchRan: boolean;
  todayBatchStatusLabel: string;
  lastDispatchedRo: string | null;
}

export function formatRomaniaDateKey(dateInput: string | Date): string {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ROMANIA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function formatRomaniaTime(dateInput: string | Date): string {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('ro-RO', {
    timeZone: ROMANIA_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

export function formatRomaniaDate(dateInput: string | Date): string {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('ro-RO', {
    timeZone: ROMANIA_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

export function formatRomaniaDateTime(
  dateInput: string | Date,
  options?: { includeSeconds?: boolean }
): string {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return new Intl.DateTimeFormat('ro-RO', {
    timeZone: ROMANIA_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...(options?.includeSeconds ? { second: '2-digit' } : {}),
    hour12: false,
  }).format(d);
}

export function getRomaniaTimezoneOffsetLabel(dateInput: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: ROMANIA_TIMEZONE,
      timeZoneName: 'shortOffset',
    }).formatToParts(dateInput);
    const rawOffset = parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT+2';
    const normalized = rawOffset.replace('GMT', 'UTC');
    if (normalized.includes('+3')) return 'UTC+3 (EEST)';
    if (normalized.includes('+2')) return 'UTC+2 (EET)';
    return normalized;
  } catch {
    return 'UTC+2 (EET)';
  }
}

/**
 * Computes the exact next scheduled automatic dispatch in Romania time (Europe/Bucharest)
 * for the Vercel daily cron running at 06:00 UTC (`0 6 * * *`), which equals
 * 08:00 in winter (EET, UTC+2) and 09:00 in summer (EEST, UTC+3).
 */
export function getFulfillmentScheduleInfo(options?: {
  now?: Date;
  lastDispatchedAt?: string | null;
  autoDispatchEnabled?: boolean;
}): FulfillmentScheduleInfo {
  const now = options?.now ? new Date(options.now) : new Date();
  const autoDispatchEnabled = options?.autoDispatchEnabled !== false;

  const todayDispatchUtc = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      FULFILLMENT_CRON_UTC_HOUR,
      FULFILLMENT_CRON_UTC_MINUTE,
      0,
      0
    )
  );

  const hasWindowPassedToday = now.getTime() >= todayDispatchUtc.getTime();
  const nextDispatchUtc = hasWindowPassedToday
    ? new Date(todayDispatchUtc.getTime() + 24 * 60 * 60 * 1000)
    : todayDispatchUtc;

  const todayKeyRo = formatRomaniaDateKey(now);
  const tomorrowDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowKeyRo = formatRomaniaDateKey(tomorrowDate);
  const nextKeyRo = formatRomaniaDateKey(nextDispatchUtc);

  const nextDateRo = formatRomaniaDate(nextDispatchUtc);
  const nextTimeRo = formatRomaniaTime(nextDispatchUtc);
  const todayTimeRo = formatRomaniaTime(todayDispatchUtc);
  const timezoneOffsetLabel = getRomaniaTimezoneOffsetLabel(nextDispatchUtc);

  let nextDayLabelRo = nextDateRo;
  if (nextKeyRo === todayKeyRo) {
    nextDayLabelRo = 'Astăzi';
  } else if (nextKeyRo === tomorrowKeyRo) {
    nextDayLabelRo = 'Mâine';
  }

  const diffMs = Math.max(0, nextDispatchUtc.getTime() - now.getTime());
  const totalMinutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const countdownLabel =
    totalMinutes < 1
      ? 'în mai puțin de 1 min'
      : hours > 0
        ? `peste ${hours}h ${String(minutes).padStart(2, '0')}m`
        : `peste ${minutes}m`;

  const lastDispatchedRaw = options?.lastDispatchedAt || null;
  const lastDispatchedDate = lastDispatchedRaw ? new Date(lastDispatchedRaw) : null;
  const isValidLast = Boolean(lastDispatchedDate && !Number.isNaN(lastDispatchedDate.getTime()));
  const lastDispatchedKeyRo = isValidLast && lastDispatchedDate ? formatRomaniaDateKey(lastDispatchedDate) : '';
  const todayBatchRan = Boolean(lastDispatchedKeyRo && lastDispatchedKeyRo === todayKeyRo);
  const lastDispatchedRo = isValidLast && lastDispatchedDate ? formatRomaniaDateTime(lastDispatchedDate) : null;

  let todayBatchStatusLabel = '';
  if (!autoDispatchEnabled) {
    todayBatchStatusLabel = todayBatchRan
      ? `Lot trimis astăzi (${lastDispatchedRo || todayTimeRo}), trimiterea automată este oprită`
      : 'Trimiterea automată zilnică este dezactivată';
  } else if (todayBatchRan) {
    todayBatchStatusLabel = `Lotul de astăzi a fost trimis (${lastDispatchedRo})`;
  } else if (hasWindowPassedToday) {
    todayBatchStatusLabel = `Fereastra automată de azi (${todayTimeRo}) a trecut fără comenzi noi expediate`;
  } else {
    todayBatchStatusLabel = `Lotul automat de astăzi urmează la ora ${todayTimeRo}`;
  }

  return {
    autoDispatchEnabled,
    nextDispatchUtcIso: nextDispatchUtc.toISOString(),
    nextTimeRo,
    todayTimeRo,
    nextDateRo,
    nextDayLabelRo,
    timezoneOffsetLabel,
    countdownLabel,
    hasWindowPassedToday,
    todayBatchRan,
    todayBatchStatusLabel,
    lastDispatchedRo,
  };
}
