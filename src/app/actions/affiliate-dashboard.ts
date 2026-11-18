'use server';

import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAffiliateSession } from './affiliate-auth';
import { revalidatePath } from 'next/cache';
import { convertToRon, getServerExchangeRates } from '@/utils/pricing';
import { normalizeCountry } from '@/utils/admin-helpers';
import { isDigitalProgramItem } from '@/lib/programs';
import {
  fetchGa4AffiliateRefStats,
  type Ga4AffiliateRefStats,
} from '@/lib/ga4-analytics';
import {
  AFFILIATE_MIN_WITHDRAWAL_RON,
  AFFILIATE_MIN_WITHDRAWAL_EUR,
  AFFILIATE_BONUS_TIERS,
  AFFILIATE_PAYOUT_ELIGIBLE_STATUSES,
  computeAffiliateOrderMetrics,
  computeAffiliateFinancialSummary,
  computeAffiliateMultiCurrencySales,
  createAffiliateRonConverter,
  extractStoredBonusVouchers,
  resolveEurToRonRate,
  resolveLiveBonusVoucherState,
  roundCurrency,
  type AffiliateBonusVoucherRecord,
  type AffiliateNonCountableReason,
  type AffiliateOrderPayoutStatus,
  type AffiliatePayoutRecord,
  type LiveCouponSnapshot,
} from '@/lib/affiliate-stats';

export interface AffiliateCurrencyBreakdownEntry {
  currency: string;
  orders: number;
  salesNative: number;
  salesRon: number;
  commissionRon: number;
}

export interface AffiliateBonusTierStatus {
  id: string;
  salesTargetRon: number;
  voucherRon: number;
  salesTargetEur: number;
  voucherEur: number;
  pctLabel: string;
  eligibleSalesRon: number;
  eligibleSalesEur: number;
  progressPct: number;
  progressPctEur: number;
  remainingRon: number;
  remainingEur: number;
  unlocked: boolean;
  unlockedEur: boolean;
  claimedVoucher: AffiliateBonusVoucherRecord | null;
}

export interface AffiliateOrderCategorySummary {
  key: string;
  labelRo: string;
  labelEn: string;
  count: number;
}

export type AffiliateNormalizedStatus =
  | 'confirmed'
  | 'processing'
  | 'in_transit'
  | 'completed'
  | 'cancelled'
  | 'returned'
  | 'refunded'
  | 'failed';

export interface AffiliateOrderHistory {
  /** Anonymized deterministic row key (never exposes raw database order UUID) */
  id: string;
  date: string;
  createdAt: string;
  countryCode: string;
  countryNameRo: string;
  countryNameEn: string;
  status: string;
  normalizedStatus: AffiliateNormalizedStatus;
  statusLabelRo: string;
  statusLabelEn: string;
  currency: string;
  originalCurrency: string;
  originalTotalAmount: number;
  orderTotal: number;
  totalAmount: number;
  subtotal: number;
  shippingAmount: number;
  commissionAmount: number;
  eligibleCommissionAmount: number;
  pendingPickupCommissionAmount: number;
  isCountable: boolean;
  payoutStatus: AffiliateOrderPayoutStatus;
  isPayoutEligible: boolean;
  payoutStatusLabelRo: string;
  payoutStatusLabelEn: string;
  nonCountableReason?: AffiliateNonCountableReason | null;
  nonCountableLabel?: string;
  itemsCount: number;
  categories: AffiliateOrderCategorySummary[];
}

export interface AffiliateDashboardResponse {
  name: string;
  email: string;
  code: string;
  commissionPercent: number;
  discountValue: number;
  discountType: 'percentage' | 'fixed';
  totalSales: number;
  totalSalesEur: number;
  totalNetSales: number;
  eligibleSales: number;
  eligibleSalesEur: number;
  inTransitSalesEur: number;
  eligibleCommissions: number;
  pendingPickupCommissions: number;
  totalCommissions: number;
  pendingPayout: number;
  pendingPayoutEur: number;
  paidPayout: number;
  overpaidAmount: number;
  payoutProgressPercent: number;
  minWithdrawalRon: number;
  minWithdrawalEur: number;
  canWithdraw: boolean;
  eurRate: number;
  usagesCount: number;
  deliveredOrdersCount: number;
  inTransitOrdersCount: number;
  cancelledOrdersCount: number;
  joinedAt: string;
  lastPayoutAt: string | null;
  payoutHistory: AffiliatePayoutRecord[];
  paymentDetails: {
    iban?: string;
    bankName?: string;
    accountHolder?: string;
    paidAmount?: number;
  };
  orders: AffiliateOrderHistory[];
  currencyBreakdown: AffiliateCurrencyBreakdownEntry[];
  bonusTiers: AffiliateBonusTierStatus[];
  referralTracking: Ga4AffiliateRefStats;
}

const COUNTRY_NAMES_EN: Record<string, string> = {
  RO: 'Romania',
  AT: 'Austria',
  FR: 'France',
  NL: 'Netherlands',
  BE: 'Belgium',
  IT: 'Italy',
  DE: 'Germany',
  ES: 'Spain',
  GB: 'United Kingdom',
  HU: 'Hungary',
  BG: 'Bulgaria',
  CZ: 'Czechia',
  SK: 'Slovakia',
  PL: 'Poland',
  GR: 'Greece',
  PT: 'Portugal',
  HR: 'Croatia',
  SI: 'Slovenia',
  SE: 'Sweden',
  FI: 'Finland',
  DK: 'Denmark',
  NO: 'Norway',
  IE: 'Ireland',
  CY: 'Cyprus',
  EE: 'Estonia',
  LV: 'Latvia',
  LT: 'Lithuania',
  LU: 'Luxembourg',
  MD: 'Moldova',
  CH: 'Switzerland',
  US: 'United States',
  CA: 'Canada',
  AU: 'Australia',
  UA: 'Ukraine',
  TR: 'Turkey',
  AE: 'United Arab Emirates',
  MT: 'Malta',
  IS: 'Iceland',
  RS: 'Serbia',
  JP: 'Japan',
  CN: 'China',
  BR: 'Brazil',
};

const enRegionDisplay = (() => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' });
  } catch {
    return null;
  }
})();

function resolveOrderCountry(
  rawCountry: unknown,
  currency: unknown,
  metadataLocale: unknown
): { countryCode: string; countryNameRo: string; countryNameEn: string } {
  let candidate = typeof rawCountry === 'string' ? rawCountry.trim() : '';
  const upperCandidate = candidate.toUpperCase();

  // Map regional shipping sub-codes (e.g. Balearic/Canary Islands) to canonical ISO-2
  if (upperCandidate === 'ES-BI' || upperCandidate === 'IC') {
    candidate = 'ES';
  } else if (!candidate) {
    const curUpper = String(currency || '').toUpperCase().trim();
    const locLower = String(metadataLocale || '').toLowerCase().trim();
    if (curUpper === 'GBP') {
      candidate = 'GB';
    } else if (curUpper === 'USD' && locLower === 'en') {
      candidate = 'US';
    } else {
      candidate = 'RO';
    }
  }

  const normalized = normalizeCountry(candidate);
  const code = (normalized.code || 'RO').toUpperCase().slice(0, 2);
  const countryNameRo = normalized.name || code;

  let countryNameEn = COUNTRY_NAMES_EN[code];
  if (!countryNameEn && enRegionDisplay && /^[A-Z]{2}$/.test(code)) {
    try {
      countryNameEn = enRegionDisplay.of(code) || code;
    } catch {
      countryNameEn = code;
    }
  }

  return {
    countryCode: code,
    countryNameRo,
    countryNameEn: countryNameEn || countryNameRo,
  };
}

function resolveNormalizedOrderStatus(
  rawStatus: unknown,
  payoutStatus: AffiliateOrderPayoutStatus,
  nonCountableReason: AffiliateNonCountableReason | null
): {
  normalizedStatus: AffiliateNormalizedStatus;
  statusLabelRo: string;
  statusLabelEn: string;
} {
  if (payoutStatus === 'voided' || nonCountableReason) {
    if (nonCountableReason === 'returned') {
      return { normalizedStatus: 'returned', statusLabelRo: 'Returnată', statusLabelEn: 'Returned' };
    }
    if (nonCountableReason === 'refunded') {
      return { normalizedStatus: 'refunded', statusLabelRo: 'Rambursată', statusLabelEn: 'Refunded' };
    }
    if (nonCountableReason === 'failed') {
      return { normalizedStatus: 'failed', statusLabelRo: 'Eșuată', statusLabelEn: 'Failed' };
    }
    return { normalizedStatus: 'cancelled', statusLabelRo: 'Anulată', statusLabelEn: 'Cancelled' };
  }

  const s = String(rawStatus || '').toLowerCase().trim();
  if (AFFILIATE_PAYOUT_ELIGIBLE_STATUSES.has(s)) {
    return { normalizedStatus: 'completed', statusLabelRo: 'Finalizată', statusLabelEn: 'Completed' };
  }
  if (['shipped', 'in_transit', 'expediat', 'expediata', 'awb_created', 'out_for_delivery'].includes(s)) {
    return { normalizedStatus: 'in_transit', statusLabelRo: 'În livrare', statusLabelEn: 'In Transit' };
  }
  if (['pending', 'confirmed', 'confirmare', 'paid', 'new', 'nou'].includes(s)) {
    return { normalizedStatus: 'confirmed', statusLabelRo: 'Confirmare', statusLabelEn: 'Confirmed' };
  }

  return { normalizedStatus: 'processing', statusLabelRo: 'În procesare', statusLabelEn: 'Processing' };
}

function classifyOrderCategories(rawItems: unknown[]): {
  itemsCount: number;
  categories: AffiliateOrderCategorySummary[];
} {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return {
      itemsCount: 1,
      categories: [
        {
          key: 'gear',
          labelRo: 'Echipament TrenZone',
          labelEn: 'TrenZone Gear',
          count: 1,
        },
      ],
    };
  }

  let totalQty = 0;
  const categoryMap = new Map<string, AffiliateOrderCategorySummary>();

  for (const item of rawItems as Array<Record<string, unknown>>) {
    const qty = Math.max(1, Number(item?.quantity) || 1);
    totalQty += qty;

    const rawName =
      typeof item?.name === 'object' && item.name !== null
        ? `${(item.name as Record<string, string>).ro || ''} ${(item.name as Record<string, string>).en || ''}`
        : String(item?.name || '');
    const haystack = `${rawName} ${String(item?.slug || '')} ${String(item?.id || '')}`.toLowerCase();

    let def: Omit<AffiliateOrderCategorySummary, 'count'>;
    if (isDigitalProgramItem(item)) {
      def = { key: 'programs', labelRo: 'Programe PDF', labelEn: 'PDF Programs' };
    } else if (/x10/.test(haystack) && /(elbow|cot)/.test(haystack)) {
      def = { key: 'x10-elbow', labelRo: 'Benzi Cot X10', labelEn: 'X10 Elbow Wraps' };
    } else if (/x5/.test(haystack) && /(elbow|cot)/.test(haystack)) {
      def = { key: 'x5-elbow', labelRo: 'Benzi Cot X5', labelEn: 'X5 Elbow Wraps' };
    } else if (/(elbow|cot)/.test(haystack)) {
      def = { key: 'elbow-wraps', labelRo: 'Benzi de Cot', labelEn: 'Elbow Wraps' };
    } else if (/(wrist|incheietur|încheietur)/.test(haystack)) {
      def = { key: 'wrist-wraps', labelRo: 'Fașe Încheietură', labelEn: 'Wrist Wraps' };
    } else if (/(belt|centur)/.test(haystack)) {
      def = { key: 'belt', labelRo: 'Centură Powerlifting', labelEn: 'Lifting Belt' };
    } else if (/(tricou|tee|shirt|hanorac|hoodie|apparel)/.test(haystack)) {
      def = { key: 'apparel', labelRo: 'Îmbrăcăminte', labelEn: 'Apparel' };
    } else {
      def = { key: 'gear', labelRo: 'Echipament TrenZone', labelEn: 'TrenZone Gear' };
    }

    const existing = categoryMap.get(def.key);
    if (existing) {
      existing.count += qty;
    } else {
      categoryMap.set(def.key, { ...def, count: qty });
    }
  }

  return {
    itemsCount: Math.max(1, totalQty),
    categories: Array.from(categoryMap.values()),
  };
}

interface FetchedAffiliateOrderRow {
  coupon_id: string | null;
  total_amount: number | null;
  subtotal: number | null;
  discount_total: number | null;
  shipping_amount: number | null;
  currency: string | null;
  status: string | null;
  items: unknown;
  addr_country: string | null;
  carrier_metadata: Record<string, unknown> | null;
  created_at: string | null;
}

async function fetchAffiliateAttributionAndMetrics(affiliate: {
  code?: string | null;
  commission_percent?: unknown;
}) {
  const commissionPercent = Number(affiliate.commission_percent) || 10;
  const affiliateCode = (affiliate.code || '').trim().replace(/[^A-Za-z0-9_-]/g, '');
  const escapedCode = affiliateCode.replace(/[\\%_]/g, '\\$&');

  // Fetch coupons associated with this affiliate code (case-insensitive)
  const { data: coupons } = await supabaseAdmin
    .from('coupons')
    .select('id, code, type, value')
    .ilike('code', escapedCode);

  let couponList = coupons || [];
  if (couponList.length === 0 && affiliateCode) {
    const { data: exactCoupons } = await supabaseAdmin
      .from('coupons')
      .select('id, code, type, value')
      .eq('code', affiliateCode.toUpperCase());
    if (exactCoupons && exactCoupons.length > 0) {
      couponList = exactCoupons;
    }
  }

  const primaryCoupon =
    couponList.find((c) => Number(c.value) > 0) || couponList[0] || null;
  const discountType: 'percentage' | 'fixed' =
    primaryCoupon?.type === 'fixed' ? 'fixed' : 'percentage';
  const rawDiscountValue = Number(primaryCoupon?.value);
  const discountValue =
    Number.isFinite(rawDiscountValue) && rawDiscountValue > 0 ? rawDiscountValue : 10;

  const couponIds = couponList
    .map((c) => c.id)
    .filter((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

  // Fetch attributed orders strictly WITHOUT any customer PII columns
  let fetchedOrders: FetchedAffiliateOrderRow[] = [];
  const orFilters: string[] = [];
  if (couponIds.length > 0) {
    orFilters.push(`coupon_id.in.(${couponIds.join(',')})`);
  }
  if (affiliateCode) {
    orFilters.push(`carrier_metadata->>coupon_code.ilike.${escapedCode}`);
    orFilters.push(`carrier_metadata->>coupon.ilike.${escapedCode}`);
  }

  if (orFilters.length > 0) {
    const { data: ordersData, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select(
        'coupon_id, total_amount, subtotal, discount_total, shipping_amount, currency, status, items, addr_country, carrier_metadata, created_at'
      )
      .or(orFilters.join(','))
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.warn('Affiliate orders fetch warning:', ordersError);
    } else if (ordersData) {
      fetchedOrders = ordersData as FetchedAffiliateOrderRow[];
    }
  }

  const liveRates = await getServerExchangeRates();
  const eurRate = resolveEurToRonRate(liveRates, convertToRon);
  const toRon = createAffiliateRonConverter(liveRates, convertToRon);
  const orderMetrics = fetchedOrders.map((o) => ({
    order: o,
    metrics: computeAffiliateOrderMetrics(o, commissionPercent, toRon),
  }));

  return {
    commissionPercent,
    affiliateCode,
    discountType,
    discountValue,
    eurRate,
    orderMetrics,
  };
}

export async function getAffiliateDashboardData(): Promise<{
  success: boolean;
  data?: AffiliateDashboardResponse;
  error?: string;
}> {
  const session = await getAffiliateSession();

  if (!session?.id) {
    return { success: false, error: 'Neautorizat' };
  }

  // 1. Fetch affiliate profile
  const { data: affiliate, error: affError } = await supabaseAdmin
    .from('affiliates')
    .select(
      'id, name, email, code, commission_percent, total_earnings_ron, usage_count, status, requested_at, activated_at, updated_at, payment_details'
    )
    .eq('id', session.id)
    .maybeSingle();

  if (affError || !affiliate) {
    console.error('Affiliate fetch error:', affError);
    return { success: false, error: 'Afiliat inexistent.' };
  }

  if (affiliate.status !== 'active') {
    return { success: false, error: 'Contul tău de afiliat nu este activ.' };
  }

  const fallbackGa4Stats: Ga4AffiliateRefStats = {
    connected: false,
    totalClicks: 0,
    uniqueVisitors: 0,
    dailySeries: [],
    countries: [],
  };

  // 2-4. Fetch attributed orders + live rates + GA4 stats in parallel
  const [attribution, referralTracking] = await Promise.all([
    fetchAffiliateAttributionAndMetrics(affiliate),
    fetchGa4AffiliateRefStats(affiliate.code).catch(() => fallbackGa4Stats),
  ]);

  const { commissionPercent, discountType, discountValue, eurRate, orderMetrics } = attribution;

  const mappedOrders: AffiliateOrderHistory[] = orderMetrics.map(({ order: o, metrics }, idx) => {
    const createdAt = o.created_at || new Date().toISOString();
    const country = resolveOrderCountry(o.addr_country, o.currency, o.carrier_metadata?.locale);
    const statusInfo = resolveNormalizedOrderStatus(
      o.status,
      metrics.payoutStatus,
      metrics.nonCountableReason
    );

    const rawItems = Array.isArray(o.items) ? o.items : [];
    const { itemsCount, categories } = classifyOrderCategories(rawItems);

    return {
      id: `sale-${idx + 1}-${Date.parse(createdAt) || idx}`,
      date: createdAt,
      createdAt,
      countryCode: country.countryCode,
      countryNameRo: country.countryNameRo,
      countryNameEn: country.countryNameEn,
      status: o.status || 'processing',
      normalizedStatus: statusInfo.normalizedStatus,
      statusLabelRo: statusInfo.statusLabelRo,
      statusLabelEn: statusInfo.statusLabelEn,
      isCountable: metrics.isCountable,
      payoutStatus: metrics.payoutStatus,
      isPayoutEligible: metrics.isPayoutEligible,
      payoutStatusLabelRo: metrics.payoutStatusLabelRo,
      payoutStatusLabelEn: metrics.payoutStatusLabelEn,
      nonCountableReason: metrics.nonCountableReason,
      nonCountableLabel: metrics.nonCountableLabel,
      currency: 'RON',
      originalCurrency: metrics.originalCurrency,
      originalTotalAmount: metrics.originalTotalAmount,
      orderTotal: metrics.totalAmount,
      totalAmount: metrics.totalAmount,
      subtotal: metrics.subtotal,
      shippingAmount: metrics.shippingAmount,
      commissionAmount: metrics.commissionAmount,
      eligibleCommissionAmount: metrics.eligibleCommissionAmount,
      pendingPickupCommissionAmount: metrics.pendingPickupCommissionAmount,
      itemsCount,
      categories,
    };
  });

  // 5. Financial summary (every countable order is immediately payout-eligible)
  const paymentDetails = affiliate.payment_details || {};
  const summary = computeAffiliateFinancialSummary(
    mappedOrders,
    commissionPercent,
    paymentDetails,
    Number(affiliate.total_earnings_ron) || 0,
    Number(affiliate.usage_count) || 0
  );

  // 6. Currency breakdown across all countable attributed orders
  const currencyMap = new Map<string, AffiliateCurrencyBreakdownEntry>();
  for (const order of mappedOrders) {
    if (!order.isCountable) continue;
    const curr = (order.originalCurrency || 'RON').toUpperCase();
    const existing = currencyMap.get(curr) || {
      currency: curr,
      orders: 0,
      salesNative: 0,
      salesRon: 0,
      commissionRon: 0,
    };
    existing.orders += 1;
    existing.salesNative = roundCurrency(existing.salesNative + order.originalTotalAmount);
    existing.salesRon = roundCurrency(existing.salesRon + order.totalAmount);
    existing.commissionRon = roundCurrency(existing.commissionRon + order.commissionAmount);
    currencyMap.set(curr, existing);
  }
  const currencyBreakdown = Array.from(currencyMap.values()).sort(
    (a, b) => b.salesRon - a.salesRon || a.currency.localeCompare(b.currency)
  );

  // 7. Hydrate bonus vouchers from Supabase `coupons`
  const storedVouchers = extractStoredBonusVouchers(paymentDetails);
  const voucherCodes = Array.from(
    new Set(
      storedVouchers
        .map((v) => (typeof v.code === 'string' ? v.code.trim().toUpperCase() : ''))
        .filter(Boolean)
    )
  );

  const liveCouponMap = new Map<string, LiveCouponSnapshot>();
  if (voucherCodes.length > 0) {
    const { data: liveCoupons } = await supabaseAdmin
      .from('coupons')
      .select('code, value, is_active, used_count, usage_limit, expires_at')
      .in('code', voucherCodes);

    for (const c of liveCoupons || []) {
      if (c.code) {
        liveCouponMap.set(String(c.code).trim().toUpperCase(), c as LiveCouponSnapshot);
      }
    }
  }

  const voucherByTierId = new Map<string, AffiliateBonusVoucherRecord>();
  for (const stored of storedVouchers) {
    const code = typeof stored.code === 'string' ? stored.code.trim().toUpperCase() : '';
    const hydrated = resolveLiveBonusVoucherState(stored, code ? liveCouponMap.get(code) : null);
    if (hydrated) {
      voucherByTierId.set(hydrated.tierId, hydrated);
    }
  }

  const multiCurrencySales = computeAffiliateMultiCurrencySales(
    orderMetrics.map((m) => m.metrics),
    eurRate,
    summary.eligibleSales,
    summary.totalSales
  );
  const pendingPayoutEur = roundCurrency(summary.pendingPayout / multiCurrencySales.eurRate);

  const bonusTiers: AffiliateBonusTierStatus[] = AFFILIATE_BONUS_TIERS.map((tier) => {
    const eligibleSalesRon = summary.eligibleSales;
    const unlocked = eligibleSalesRon >= tier.salesTargetRon;
    const progressPct = unlocked
      ? 100
      : Math.min(99, Math.max(0, Math.floor((eligibleSalesRon / tier.salesTargetRon) * 100)));
    const remainingRon = Math.max(0, roundCurrency(tier.salesTargetRon - eligibleSalesRon));

    const eligibleSalesEur = multiCurrencySales.eligibleSalesEur;
    const unlockedEur = eligibleSalesEur >= tier.salesTargetEur;
    const progressPctEur = unlockedEur
      ? 100
      : Math.min(99, Math.max(0, Math.floor((eligibleSalesEur / tier.salesTargetEur) * 100)));
    const remainingEur = Math.max(0, roundCurrency(tier.salesTargetEur - eligibleSalesEur));

    return {
      id: tier.id,
      salesTargetRon: tier.salesTargetRon,
      voucherRon: tier.voucherRon,
      salesTargetEur: tier.salesTargetEur,
      voucherEur: tier.voucherEur,
      pctLabel: tier.pctLabel,
      eligibleSalesRon,
      eligibleSalesEur,
      progressPct,
      progressPctEur,
      remainingRon,
      remainingEur,
      unlocked,
      unlockedEur,
      claimedVoucher: voucherByTierId.get(tier.id) || null,
    };
  });

  return {
    success: true,
    data: {
      name: affiliate.name,
      email: affiliate.email,
      code: affiliate.code,
      commissionPercent,
      discountValue,
      discountType,
      totalSales: summary.totalSales,
      totalSalesEur: multiCurrencySales.totalSalesEur,
      totalNetSales: summary.totalNetSales,
      eligibleSales: summary.eligibleSales,
      eligibleSalesEur: multiCurrencySales.eligibleSalesEur,
      inTransitSalesEur: multiCurrencySales.inTransitSalesEur,
      eligibleCommissions: summary.eligibleCommissions,
      pendingPickupCommissions: summary.pendingPickupCommissions,
      totalCommissions: summary.totalCommissions,
      pendingPayout: summary.pendingPayout,
      pendingPayoutEur,
      paidPayout: summary.paidPayout,
      overpaidAmount: summary.overpaidAmount,
      payoutProgressPercent: summary.payoutProgressPercent,
      minWithdrawalRon: AFFILIATE_MIN_WITHDRAWAL_RON,
      minWithdrawalEur: AFFILIATE_MIN_WITHDRAWAL_EUR,
      canWithdraw:
        summary.pendingPayout >= AFFILIATE_MIN_WITHDRAWAL_RON ||
        pendingPayoutEur >= AFFILIATE_MIN_WITHDRAWAL_EUR,
      eurRate: multiCurrencySales.eurRate,
      usagesCount: summary.validOrdersCount,
      deliveredOrdersCount: summary.deliveredOrdersCount,
      inTransitOrdersCount: summary.inTransitOrdersCount,
      cancelledOrdersCount: summary.cancelledOrdersCount,
      joinedAt: affiliate.activated_at || affiliate.requested_at || new Date().toISOString(),
      lastPayoutAt: summary.lastPayoutAt,
      payoutHistory: summary.payouts,
      paymentDetails: {
        iban: paymentDetails.iban || '',
        bankName: paymentDetails.bank_name || paymentDetails.bank || '',
        accountHolder: paymentDetails.account_holder || affiliate.name,
        paidAmount: summary.paidPayout,
      },
      orders: mappedOrders,
      currencyBreakdown,
      bonusTiers,
      referralTracking,
    },
  };
}

export async function claimAffiliateBonusVoucherAction(
  tierId: string,
  preferredCurrency?: string
): Promise<{
  success: boolean;
  alreadyClaimed?: boolean;
  voucher?: AffiliateBonusVoucherRecord;
  errorCode?: 'UNAUTHORIZED' | 'INVALID_TIER' | 'INACTIVE_AFFILIATE' | 'THRESHOLD_NOT_REACHED' | 'COUPON_CREATE_FAILED' | 'SAVE_FAILED';
  error?: string;
}> {
  const session = await getAffiliateSession();
  if (!session?.id) {
    return { success: false, errorCode: 'UNAUTHORIZED', error: 'Neautorizat' };
  }

  const tier = AFFILIATE_BONUS_TIERS.find((t) => t.id === tierId);
  if (!tier) {
    return { success: false, errorCode: 'INVALID_TIER', error: 'Prag de bonus invalid.' };
  }

  const claimMode: 'RON' | 'EUR' =
    typeof preferredCurrency === 'string' &&
    preferredCurrency.trim().length > 0 &&
    preferredCurrency.trim().toUpperCase() !== 'RON'
      ? 'EUR'
      : 'RON';

  const { data: affiliate, error: affError } = await supabaseAdmin
    .from('affiliates')
    .select(
      'id, name, code, commission_percent, total_earnings_ron, usage_count, status, payment_details'
    )
    .eq('id', session.id)
    .maybeSingle();

  if (affError || !affiliate || affiliate.status !== 'active') {
    return {
      success: false,
      errorCode: 'INACTIVE_AFFILIATE',
      error: 'Contul tău de afiliat nu este activ.',
    };
  }

  const paymentDetails = (affiliate.payment_details || {}) as Record<string, unknown>;
  const existingVouchers = extractStoredBonusVouchers(paymentDetails);
  const existingForTier = existingVouchers.find(
    (v) => typeof v.tierId === 'string' && v.tierId === tier.id && typeof v.code === 'string' && v.code.trim()
  );

  // Idempotent return when an already-claimed voucher exists in `coupons`
  if (existingForTier) {
    const existingCode = String(existingForTier.code).trim().toUpperCase();
    const { data: existingCoupon } = await supabaseAdmin
      .from('coupons')
      .select('code, value, is_active, used_count, usage_limit, expires_at')
      .ilike('code', existingCode.replace(/[\\%_]/g, '\\$&'))
      .limit(1)
      .maybeSingle();

    if (existingCoupon) {
      const hydrated = resolveLiveBonusVoucherState(existingForTier, existingCoupon as LiveCouponSnapshot);
      if (hydrated) {
        return { success: true, alreadyClaimed: true, voucher: hydrated };
      }
    }
  }

  // Recompute eligibleSales (RON & multi-currency EUR) strictly on the server
  const { commissionPercent, eurRate, orderMetrics } = await fetchAffiliateAttributionAndMetrics(affiliate);
  const summary = computeAffiliateFinancialSummary(
    orderMetrics.map((m) => m.metrics),
    commissionPercent,
    paymentDetails,
    Number(affiliate.total_earnings_ron) || 0,
    Number(affiliate.usage_count) || 0
  );
  const multiCurrencySales = computeAffiliateMultiCurrencySales(
    orderMetrics.map((m) => m.metrics),
    eurRate,
    summary.eligibleSales,
    summary.totalSales
  );

  if (claimMode === 'EUR') {
    if (multiCurrencySales.eligibleSalesEur < tier.salesTargetEur) {
      return {
        success: false,
        errorCode: 'THRESHOLD_NOT_REACHED',
        error: `You have not reached the €${tier.salesTargetEur} eligible sales goal yet (€${multiCurrencySales.eligibleSalesEur}).`,
      };
    }
  } else if (summary.eligibleSales < tier.salesTargetRon) {
    return {
      success: false,
      errorCode: 'THRESHOLD_NOT_REACHED',
      error: `Nu ai atins încă pragul de ${tier.salesTargetRon} RON vânzări eligibile (${summary.eligibleSales} RON).`,
    };
  }

  const cleanAffCode =
    String(affiliate.code || '')
      .trim()
      .replace(/[^A-Za-z0-9_-]/g, '')
      .toUpperCase() || 'AFF';

  // Checkout `fixed_amount` coupons convert from RON base via getProductPrice(coupon.value, currency).
  // Storing exact `voucherEur * eurRate` guarantees exact €40 / €60 / €100 / €150 discount at EUR checkout.
  const couponValueRon =
    claimMode === 'EUR' ? roundCurrency(tier.voucherEur * multiCurrencySales.eurRate) : tier.voucherRon;
  const voucherValueEur =
    claimMode === 'EUR' ? tier.voucherEur : roundCurrency(tier.voucherRon / multiCurrencySales.eurRate);
  const voucherDescription =
    claimMode === 'EUR'
      ? `Bonus afiliat ${cleanAffCode} (Prag €${tier.salesTargetEur} · Voucher €${tier.voucherEur})`
      : `Bonus afiliat ${cleanAffCode} (Prag ${tier.salesTargetRon} RON)`;

  const now = new Date();
  const nowIso = now.toISOString();
  const expiresAt = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString();

  let createdCoupon: { id: string; code: string } | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = `BONUS-${cleanAffCode}-${tier.shortTag}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('coupons')
      .insert({
        code,
        type: 'fixed_amount',
        value: couponValueRon,
        usage_limit: 1,
        used_count: 0,
        is_active: true,
        is_stackable: true,
        min_purchase: null,
        max_discount: null,
        expires_at: expiresAt,
        description: voucherDescription,
        created_at: nowIso,
      })
      .select('id, code')
      .single();

    if (!insertErr && inserted?.id) {
      createdCoupon = inserted;
      break;
    }

    // Retry only on unique code collision
    if (insertErr?.code !== '23505') {
      console.error('Bonus coupon insert error:', insertErr);
      break;
    }
  }

  if (!createdCoupon) {
    return {
      success: false,
      errorCode: 'COUPON_CREATE_FAILED',
      error: 'Nu s-a putut genera voucherul bonus. Încearcă din nou.',
    };
  }

  const voucher: AffiliateBonusVoucherRecord = {
    tierId: tier.id,
    code: createdCoupon.code,
    valueRon: couponValueRon,
    valueEur: voucherValueEur,
    issuedCurrency: claimMode,
    createdAt: nowIso,
    isActive: true,
    isUsed: false,
    expiresAt,
  };

  const nextBonusVouchers = [
    ...existingVouchers.filter((v) => v.tierId !== tier.id),
    voucher,
  ];

  const { error: updateErr } = await supabaseAdmin
    .from('affiliates')
    .update({
      payment_details: {
        ...paymentDetails,
        bonus_vouchers: nextBonusVouchers,
        updated_at: nowIso,
      },
      updated_at: nowIso,
    })
    .eq('id', affiliate.id);

  if (updateErr) {
    console.error('Failed to persist bonus voucher on affiliate, rolling back coupon:', updateErr);
    const { error: deleteErr } = await supabaseAdmin
      .from('coupons')
      .delete()
      .eq('id', createdCoupon.id);
    if (deleteErr) {
      await supabaseAdmin
        .from('coupons')
        .update({ is_active: false })
        .eq('id', createdCoupon.id);
    }

    return {
      success: false,
      errorCode: 'SAVE_FAILED',
      error: 'Salvarea voucherului pe contul de afiliat a eșuat. Încearcă din nou.',
    };
  }

  revalidatePath('/[locale]/affiliate/dashboard', 'page');
  revalidatePath('/admin/affiliates');

  return { success: true, voucher };
}

/**
 * Update Affiliate Payout / Bank Details (IBAN, Bank Name, Account Holder)
 */
export async function updateAffiliatePaymentDetailsAction(formData: {
  iban: string;
  bankName: string;
  accountHolder: string;
}) {
  const session = await getAffiliateSession();
  if (!session?.id) {
    return { success: false, error: 'Neautorizat' };
  }

  // 🛡️ Anti-XSS & Anti-Injection Sanitization
  if (
    typeof formData.iban !== 'string' ||
    typeof formData.bankName !== 'string' ||
    typeof formData.accountHolder !== 'string'
  ) {
    return { success: false, error: 'Date invalide.' };
  }

  // Block any HTML/script injection attempts
  if (
    /[<>{}]/i.test(formData.iban) ||
    /[<>{}]/i.test(formData.bankName) ||
    /[<>{}]/i.test(formData.accountHolder)
  ) {
    return { success: false, error: 'Caractere nepermise detectate.' };
  }

  const cleanIban = formData.iban.trim().replace(/\s+/g, '').toUpperCase().slice(0, 34);
  const cleanBank = formData.bankName.replace(/<[^>]*>?/gm, '').trim().slice(0, 60);
  const cleanHolder = formData.accountHolder.replace(/<[^>]*>?/gm, '').trim().slice(0, 80);

  // Validate IBAN format (starts with 2 country letters, followed by 10-32 alphanumeric characters)
  if (!cleanIban || !/^[A-Z]{2}[0-9A-Z]{10,32}$/.test(cleanIban)) {
    return {
      success: false,
      error: 'Codul IBAN introdus nu are un format valid (ex: RO49AAAA...).',
    };
  }

  // Fetch current payment details
  const { data: currentAff, error: fetchErr } = await supabaseAdmin
    .from('affiliates')
    .select('payment_details')
    .eq('id', session.id)
    .single();

  if (fetchErr) {
    return { success: false, error: 'Eroare la actualizarea datelor de plată.' };
  }

  const existingDetails = currentAff?.payment_details || {};
  const updatedDetails = {
    ...existingDetails,
    iban: cleanIban,
    bank_name: cleanBank,
    account_holder: cleanHolder,
    updated_at: new Date().toISOString(),
  };

  const { error: updateErr } = await supabaseAdmin
    .from('affiliates')
    .update({
      payment_details: updatedDetails,
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.id);

  if (updateErr) {
    console.error('Error saving affiliate payment details:', updateErr);
    return { success: false, error: 'Salvarea a eșuat. Încearcă din nou.' };
  }

  revalidatePath('/[locale]/affiliate/dashboard', 'page');
  return { success: true };
}

export async function deleteAffiliatePaymentDetailsAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  const session = await getAffiliateSession();
  if (!session?.id) {
    return { success: false, error: 'Neautorizat' };
  }

  const { data: currentAff, error: fetchErr } = await supabaseAdmin
    .from('affiliates')
    .select('payment_details')
    .eq('id', session.id)
    .single();

  if (fetchErr) {
    return { success: false, error: 'Eroare la ștergerea datelor de plată.' };
  }

  const existingDetails = currentAff?.payment_details || {};
  const updatedDetails = {
    ...existingDetails,
    iban: null,
    bank_name: null,
    account_holder: null,
    updated_at: new Date().toISOString(),
  };

  const { error: updateErr } = await supabaseAdmin
    .from('affiliates')
    .update({
      payment_details: updatedDetails,
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.id);

  if (updateErr) {
    console.error('Error deleting affiliate payment details:', updateErr);
    return { success: false, error: 'Ștergerea a eșuat. Încearcă din nou.' };
  }

  revalidatePath('/[locale]/affiliate/dashboard', 'page');
  return { success: true };
}
