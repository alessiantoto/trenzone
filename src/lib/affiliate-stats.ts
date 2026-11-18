import { isDigitalOnlyCart } from './programs';

export type AffiliateNonCountableReason = 'cancelled' | 'returned' | 'refunded' | 'failed';
export type AffiliateOrderPayoutStatus = 'eligible' | 'pending_pickup' | 'voided';

export const AFFILIATE_PAYOUT_ELIGIBLE_STATUSES = new Set([
  'delivered',
  'livrat',
  'livrata',
  'completed',
  'ridicat',
  'ridicata',
]);

export const AFFILIATE_MIN_WITHDRAWAL_RON = 200;
export const AFFILIATE_MIN_WITHDRAWAL_EUR = 40;

export const AFFILIATE_BONUS_TIERS = [
  {
    id: 'tier_5k',
    salesTargetRon: 5000,
    voucherRon: 200,
    salesTargetEur: 1000,
    voucherEur: 40,
    pctLabel: '4%',
    shortTag: '5K',
  },
  {
    id: 'tier_7_5k',
    salesTargetRon: 7500,
    voucherRon: 300,
    salesTargetEur: 1500,
    voucherEur: 60,
    pctLabel: '4%',
    shortTag: '75K',
  },
  {
    id: 'tier_10k',
    salesTargetRon: 10000,
    voucherRon: 500,
    salesTargetEur: 2000,
    voucherEur: 100,
    pctLabel: '5%',
    shortTag: '10K',
  },
  {
    id: 'tier_15k',
    salesTargetRon: 15000,
    voucherRon: 750,
    salesTargetEur: 3000,
    voucherEur: 150,
    pctLabel: '5%',
    shortTag: '15K',
  },
] as const;

export type AffiliateBonusTier = (typeof AFFILIATE_BONUS_TIERS)[number];
export type AffiliateBonusTierId = AffiliateBonusTier['id'];

export interface AffiliateBonusVoucherRecord {
  tierId: string;
  code: string;
  valueRon: number;
  valueEur?: number;
  issuedCurrency?: 'RON' | 'EUR';
  createdAt: string;
  isActive: boolean;
  isUsed: boolean;
  expiresAt: string | null;
}

export interface LiveCouponSnapshot {
  code?: string | null;
  value?: number | null;
  is_active?: boolean | null;
  used_count?: number | null;
  usage_limit?: number | null;
  expires_at?: string | null;
}

export function extractStoredBonusVouchers(paymentDetails: unknown): Array<Record<string, unknown>> {
  const details = paymentDetails as Record<string, unknown> | null | undefined;
  return Array.isArray(details?.bonus_vouchers)
    ? details.bonus_vouchers.filter(
        (v: unknown): v is Record<string, unknown> => Boolean(v && typeof v === 'object')
      )
    : [];
}

export function resolveLiveBonusVoucherState(
  stored: Record<string, unknown>,
  coupon: LiveCouponSnapshot | null | undefined
): AffiliateBonusVoucherRecord | null {
  const tierId = typeof stored.tierId === 'string' ? stored.tierId.trim() : '';
  const code = typeof stored.code === 'string' ? stored.code.trim().toUpperCase() : '';
  if (!tierId || !code) return null;

  const fallbackValue = roundCurrency(stored.valueRon);
  const storedValueEur = Number(stored.valueEur);
  const valueEur = Number.isFinite(storedValueEur) && storedValueEur > 0 ? roundCurrency(storedValueEur) : undefined;
  const issuedCurrency =
    stored.issuedCurrency === 'EUR' ? 'EUR' : stored.issuedCurrency === 'RON' ? 'RON' : undefined;
  const createdAt = typeof stored.createdAt === 'string' ? stored.createdAt : '';

  if (!coupon) {
    const expiresAt = typeof stored.expiresAt === 'string' ? stored.expiresAt : null;
    const isUsed = Boolean(stored.isUsed);
    return {
      tierId,
      code,
      valueRon: fallbackValue,
      ...(valueEur ? { valueEur } : {}),
      ...(issuedCurrency ? { issuedCurrency } : {}),
      createdAt,
      isActive: false,
      isUsed,
      expiresAt,
    };
  }

  const usedCount = Number(coupon.used_count) || 0;
  const usageLimit = coupon.usage_limit != null ? Number(coupon.usage_limit) : null;
  const isUsed =
    usageLimit !== null && Number.isFinite(usageLimit) && usageLimit > 0
      ? usedCount >= usageLimit
      : usedCount > 0;
  const expiresAt =
    typeof coupon.expires_at === 'string'
      ? coupon.expires_at
      : typeof stored.expiresAt === 'string'
        ? stored.expiresAt
        : null;
  const isExpired = Boolean(expiresAt && Date.parse(expiresAt) <= Date.now());
  const isActive = Boolean(coupon.is_active) && !isUsed && !isExpired;
  const valueRon = Number(coupon.value) > 0 ? roundCurrency(coupon.value) : fallbackValue;

  return {
    tierId,
    code: String(coupon.code || code).trim().toUpperCase(),
    valueRon,
    ...(valueEur ? { valueEur } : {}),
    ...(issuedCurrency ? { issuedCurrency } : {}),
    createdAt,
    isActive,
    isUsed,
    expiresAt,
  };
}

export interface AffiliateOrderPayoutOptions {
  isDigitalOnly?: boolean;
  programDeliveryStatus?: string | null;
}

export interface AffiliateOrderPayoutClassification {
  payoutStatus: AffiliateOrderPayoutStatus;
  isPayoutEligible: boolean;
  isPendingPickup: boolean;
  isVoided: boolean;
  labelRo: string;
  labelEn: string;
}

export interface AffiliatePayoutRecord {
  id: string;
  amount: number;
  paidAt: string;
  note?: string;
  ibanSnapshot?: string;
  isLegacy?: boolean;
}

export interface AffiliateOrderMetrics {
  originalCurrency: string;
  originalTotalAmount: number;
  originalSubtotal: number;
  originalShippingAmount: number;
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
  nonCountableReason: AffiliateNonCountableReason | null;
  nonCountableLabel: string;
}

export interface AffiliateFinancialSummary {
  totalSales: number;
  totalNetSales: number;
  eligibleSales: number;
  eligibleCommissions: number;
  pendingPickupCommissions: number;
  totalCommissions: number;
  paidPayout: number;
  pendingPayout: number;
  overpaidAmount: number;
  payoutProgressPercent: number;
  validOrdersCount: number;
  deliveredOrdersCount: number;
  inTransitOrdersCount: number;
  cancelledOrdersCount: number;
  aov: number;
  payouts: AffiliatePayoutRecord[];
  lastPayoutAt: string | null;
}

const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'HUF', 'JPY', 'KMF', 'KRW',
  'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
]);

export function roundCurrency(value: unknown): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100) / 100;
}

export function formatRon(value: unknown): string {
  const num = roundCurrency(value);
  return `${num.toLocaleString('ro-RO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} RON`;
}

export type AffiliateDisplayCurrency = 'RON' | 'EUR' | 'USD' | 'GBP';

export const AFFILIATE_DISPLAY_CURRENCIES: AffiliateDisplayCurrency[] = ['RON', 'EUR', 'USD', 'GBP'];

export const DISPLAY_CURRENCY_SYMBOLS: Record<string, { symbol: string; isPrefix: boolean }> = {
  RON: { symbol: 'RON', isPrefix: false },
  EUR: { symbol: '€', isPrefix: true },
  USD: { symbol: '$', isPrefix: true },
  GBP: { symbol: '£', isPrefix: true },
};

export function normalizeDisplayCurrency(currency?: string | null, fallback: AffiliateDisplayCurrency = 'RON'): AffiliateDisplayCurrency {
  const upper = String(currency || '').toUpperCase().trim();
  if (upper === 'RON' || upper === 'EUR' || upper === 'USD' || upper === 'GBP') {
    return upper;
  }
  return fallback;
}

export function formatMoneyInCurrency(
  amountInTargetCurrency: unknown,
  currency: string = 'RON',
  locale: 'ro' | 'en' = 'ro',
  decimals: number = 2
): string {
  const upper = (currency || 'RON').toUpperCase();
  const num = Number(amountInTargetCurrency);
  const safeNum = Number.isFinite(num) ? (decimals === 0 ? Math.round(num) : roundCurrency(num)) : 0;
  const formattedNumber = safeNum.toLocaleString(locale === 'ro' ? 'ro-RO' : 'en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const meta = DISPLAY_CURRENCY_SYMBOLS[upper];
  if (!meta) return `${formattedNumber} ${upper}`;
  return meta.isPrefix ? `${meta.symbol}${formattedNumber}` : `${formattedNumber} ${meta.symbol}`;
}

export function formatOriginalAmount(value: unknown, currency: string): string {
  const code = (currency || 'RON').toUpperCase();
  const num = roundCurrency(value);
  if (ZERO_DECIMAL_CURRENCIES.has(code)) {
    return `${Math.round(num).toLocaleString('ro-RO')} ${code}`;
  }
  return `${num.toLocaleString('ro-RO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${code}`;
}

export function classifyOrderNonCountable(status?: string | null): {
  isCountable: boolean;
  reason: AffiliateNonCountableReason | null;
  label: string;
} {
  const normalized = String(status || '').toLowerCase().trim();
  if (['cancelled', 'canceled', 'anulat', 'anulata'].includes(normalized)) {
    return { isCountable: false, reason: 'cancelled', label: 'Anulată' };
  }
  if (['returned', 'returnat', 'returnata', 'refused', 'neridicat'].includes(normalized)) {
    return { isCountable: false, reason: 'returned', label: 'Returnată / Neridicată' };
  }
  if (['refunded', 'rambursat'].includes(normalized)) {
    return { isCountable: false, reason: 'refunded', label: 'Rambursată' };
  }
  if (normalized === 'failed') {
    return { isCountable: false, reason: 'failed', label: 'Eșuată' };
  }
  return { isCountable: true, reason: null, label: '' };
}

/**
 * Classifies whether an order's affiliate commission is payable ("De încasat").
 * Every countable order (all non-cancelled, non-returned, non-refunded, non-failed orders)
 * is immediately eligible for payout.
 */
export function classifyAffiliateOrderPayoutStatus(
  status?: string | null,
  _options?: AffiliateOrderPayoutOptions
): AffiliateOrderPayoutClassification {
  const nonCountable = classifyOrderNonCountable(status);
  if (!nonCountable.isCountable) {
    const labelEn =
      nonCountable.reason === 'cancelled'
        ? 'Cancelled'
        : nonCountable.reason === 'returned'
          ? 'Returned / Unclaimed'
          : nonCountable.reason === 'refunded'
            ? 'Refunded'
            : 'Failed';
    return {
      payoutStatus: 'voided',
      isPayoutEligible: false,
      isPendingPickup: false,
      isVoided: true,
      labelRo: nonCountable.label || 'Anulată / Returnată',
      labelEn,
    };
  }

  const normalized = String(status || '').toLowerCase().trim();
  const isDeliveredParcel = AFFILIATE_PAYOUT_ELIGIBLE_STATUSES.has(normalized);

  return {
    payoutStatus: 'eligible',
    isPayoutEligible: true,
    isPendingPickup: false,
    isVoided: false,
    labelRo: isDeliveredParcel ? 'Livrată · Eligibilă' : 'Confirmată · Eligibilă',
    labelEn: isDeliveredParcel ? 'Delivered · Eligible' : 'Confirmed · Eligible',
  };
}

const INTL_PER_EUR_DEFAULTS: Record<string, number> = {
  CZK: 25.0,
  HUF: 405,
  BGN: 1.95583,
  SEK: 11.4,
  DKK: 7.46,
  NOK: 11.7,
  CAD: 1.5,
  AUD: 1.65,
};

/**
 * Resolves the RON per 1 EUR rate safely (e.g. 5.30).
 */
export function resolveEurToRonRate(
  liveRates: Record<string, number> | null | undefined,
  baseConvertToRon: (amount: number, currency: string, rates?: Record<string, number>) => number
): number {
  const eurRonRaw = baseConvertToRon(1, 'EUR', liveRates || undefined);
  return Number.isFinite(eurRonRaw) && eurRonRaw > 1 ? eurRonRaw : 5.3;
}

/**
 * Builds a RON converter that accurately handles all supported store currencies
 * (EUR, USD, GBP, PLN, CHF, CZK, HUF, BGN, SEK, DKK, NOK, CAD, AUD),
 * including currencies absent from admin exchange_rates or stored in inverse
 * (foreign-per-RON) convention.
 */
export function createAffiliateRonConverter(
  liveRates: Record<string, number> | null | undefined,
  baseConvertToRon: (amount: number, currency: string, rates?: Record<string, number>) => number
): (amount: number, currency: string) => number {
  const rates = liveRates || undefined;
  const eurRon = resolveEurToRonRate(rates, baseConvertToRon);

  return (amount: number, currency: string): number => {
    const numeric = Number(amount) || 0;
    const curr = (currency || 'RON').toUpperCase().trim();
    if (curr === 'RON' || numeric === 0) return roundCurrency(numeric);

    if (curr === 'HUF') {
      const explicit = Number(rates?.HUF);
      if (Number.isFinite(explicit) && explicit > 0) {
        const ronPerHuf = explicit > 10 ? 1 / explicit : explicit;
        return roundCurrency(numeric * ronPerHuf);
      }
      return roundCurrency(numeric * (eurRon / INTL_PER_EUR_DEFAULTS.HUF));
    }

    if (curr === 'CZK') {
      const explicit = Number(rates?.CZK);
      if (Number.isFinite(explicit) && explicit > 0) {
        const ronPerCzk = explicit > 1.05 ? 1 / explicit : explicit;
        return roundCurrency(numeric * ronPerCzk);
      }
      return roundCurrency(numeric * (eurRon / INTL_PER_EUR_DEFAULTS.CZK));
    }

    if (curr === 'BGN') {
      const explicit = Number(rates?.BGN);
      if (Number.isFinite(explicit) && explicit > 0) {
        return roundCurrency(baseConvertToRon(numeric, 'BGN', rates));
      }
      return roundCurrency(numeric * (eurRon / INTL_PER_EUR_DEFAULTS.BGN));
    }

    if (curr in INTL_PER_EUR_DEFAULTS) {
      const explicit = Number(rates?.[curr]);
      if (Number.isFinite(explicit) && explicit > 0) {
        return roundCurrency(baseConvertToRon(numeric, curr, rates));
      }
      return roundCurrency(numeric * (eurRon / INTL_PER_EUR_DEFAULTS[curr]));
    }

    return roundCurrency(baseConvertToRon(numeric, curr, rates));
  };
}

/**
 * Computes consistent RON & EUR sales totals across mixed-currency orders.
 * Native EUR orders preserve exact EUR amounts without RON->EUR round-trip drift;
 * RON/USD/GBP/other orders convert via the live EUR/RON rate before final rounding.
 */
export function computeAffiliateMultiCurrencySales(
  orders: Array<{
    originalCurrency?: string | null;
    originalTotalAmount?: number;
    totalAmount: number;
    isCountable: boolean;
    isPayoutEligible?: boolean;
    status?: string | null;
  }>,
  eurRon: number,
  fallbackEligibleRon = 0,
  fallbackTotalRon = 0
): {
  eurRate: number;
  eligibleSalesRon: number;
  eligibleSalesEur: number;
  inTransitSalesRon: number;
  inTransitSalesEur: number;
  totalSalesRon: number;
  totalSalesEur: number;
} {
  const safeEurRon = Number.isFinite(eurRon) && eurRon > 1 ? eurRon : 5.3;

  if (orders.length === 0) {
    const eligibleRon = roundCurrency(fallbackEligibleRon);
    const totalRon = roundCurrency(Math.max(fallbackTotalRon, fallbackEligibleRon));
    const inTransitRon = Math.max(0, roundCurrency(totalRon - eligibleRon));
    return {
      eurRate: safeEurRon,
      eligibleSalesRon: eligibleRon,
      eligibleSalesEur: roundCurrency(eligibleRon / safeEurRon),
      inTransitSalesRon: inTransitRon,
      inTransitSalesEur: roundCurrency(inTransitRon / safeEurRon),
      totalSalesRon: totalRon,
      totalSalesEur: roundCurrency(totalRon / safeEurRon),
    };
  }

  let eligibleRon = 0;
  let eligibleEur = 0;
  let inTransitRon = 0;
  let inTransitEur = 0;
  let totalRon = 0;
  let totalEur = 0;

  for (const o of orders) {
    if (!o.isCountable) continue;
    const origCur = (o.originalCurrency || 'RON').toUpperCase().trim();
    const orderRon = Number(o.totalAmount) || 0;
    const orderEur =
      origCur === 'EUR' && Number.isFinite(Number(o.originalTotalAmount))
        ? Number(o.originalTotalAmount)
        : orderRon / safeEurRon;

    const eligible =
      typeof o.isPayoutEligible === 'boolean'
        ? o.isPayoutEligible
        : classifyAffiliateOrderPayoutStatus(o.status).isPayoutEligible;

    totalRon += orderRon;
    totalEur += orderEur;

    if (eligible) {
      eligibleRon += orderRon;
      eligibleEur += orderEur;
    } else {
      inTransitRon += orderRon;
      inTransitEur += orderEur;
    }
  }

  return {
    eurRate: safeEurRon,
    eligibleSalesRon: roundCurrency(eligibleRon),
    eligibleSalesEur: roundCurrency(eligibleEur),
    inTransitSalesRon: roundCurrency(inTransitRon),
    inTransitSalesEur: roundCurrency(inTransitEur),
    totalSalesRon: roundCurrency(totalRon),
    totalSalesEur: roundCurrency(totalEur),
  };
}

export function computeAffiliateOrderMetrics(
  order: {
    total_amount?: unknown;
    discount_total?: unknown;
    shipping_amount?: unknown;
    subtotal?: unknown;
    currency?: string | null;
    status?: string | null;
    items?: unknown;
    carrier_metadata?: any;
  },
  commissionPercent: number,
  toRon: (amount: number, currency: string) => number
): AffiliateOrderMetrics {
  const rawOrderTotal = Number(order.total_amount) || 0;
  const rawDiscount = Math.max(0, Number(order.discount_total) || 0);
  const rawShipping = Math.max(0, Number(order.shipping_amount) || 0);
  const rawSubtotalField = Number(order.subtotal);
  const hasExplicitSubtotal = Number.isFinite(rawSubtotalField) && rawSubtotalField > 0;
  // Legacy/fallback syncs sometimes persisted `subtotal = total_amount` when metadata lacked subtotal.
  // Avoid double-subtracting discounts or counting shipping inside the commissionable net subtotal.
  const subtotalCopiedFromTotal =
    hasExplicitSubtotal &&
    Math.abs(rawSubtotalField - rawOrderTotal) < 0.01 &&
    (rawShipping > 0 || rawDiscount > 0) &&
    Math.abs((rawSubtotalField - rawDiscount + rawShipping) - rawOrderTotal) > 0.01;

  const rawNetSubtotal =
    !hasExplicitSubtotal || subtotalCopiedFromTotal
      ? Math.max(0, rawOrderTotal - rawShipping)
      : Math.max(0, rawSubtotalField - rawDiscount);

  const originalCurrency = (order.currency || 'RON').toUpperCase().trim() || 'RON';
  const totalAmount = roundCurrency(toRon(rawOrderTotal, originalCurrency));
  const subtotal = roundCurrency(toRon(rawNetSubtotal, originalCurrency));
  const shippingAmount = roundCurrency(toRon(rawShipping, originalCurrency));

  const rawItems = Array.isArray(order.items) ? order.items : [];
  const isDigitalOnly =
    rawItems.length > 0
      ? isDigitalOnlyCart(rawItems)
      : order.carrier_metadata?.is_digital_only === true;
  const programDeliveryStatus = order.carrier_metadata?.program_delivery?.status || null;

  const statusCheck = classifyOrderNonCountable(order.status);
  const payoutCheck = classifyAffiliateOrderPayoutStatus(order.status, {
    isDigitalOnly,
    programDeliveryStatus,
  });

  const commissionAmount = statusCheck.isCountable
    ? roundCurrency(subtotal * (commissionPercent / 100))
    : 0;
  const eligibleCommissionAmount = payoutCheck.isPayoutEligible ? commissionAmount : 0;
  const pendingPickupCommissionAmount = payoutCheck.isPendingPickup ? commissionAmount : 0;

  return {
    originalCurrency,
    originalTotalAmount: roundCurrency(rawOrderTotal),
    originalSubtotal: roundCurrency(rawNetSubtotal),
    originalShippingAmount: roundCurrency(rawShipping),
    totalAmount,
    subtotal,
    shippingAmount,
    commissionAmount,
    eligibleCommissionAmount,
    pendingPickupCommissionAmount,
    isCountable: statusCheck.isCountable,
    payoutStatus: payoutCheck.payoutStatus,
    isPayoutEligible: payoutCheck.isPayoutEligible,
    payoutStatusLabelRo: payoutCheck.labelRo,
    payoutStatusLabelEn: payoutCheck.labelEn,
    nonCountableReason: statusCheck.reason,
    nonCountableLabel: statusCheck.label,
  };
}

export function convertAffiliateItemPriceToRon(
  rawPrice: number,
  rawItemsSum: number,
  order: { subtotal?: unknown; total_amount?: unknown; shipping_amount?: unknown; currency?: string | null },
  toRon: (amount: number, currency: string) => number
): number {
  const price = Number(rawPrice) || 0;
  const origCur = (order.currency || 'RON').toUpperCase();
  if (origCur === 'RON' || price <= 0) return roundCurrency(price);

  const rawSub = Number(order.subtotal);
  const origGrossSub =
    Number.isFinite(rawSub) && rawSub > 0
      ? rawSub
      : Math.max(0, (Number(order.total_amount) || 0) - (Number(order.shipping_amount) || 0));
  const ronGrossSub = toRon(origGrossSub, origCur);

  if (
    origGrossSub > 0 &&
    Math.abs(rawItemsSum - ronGrossSub) < Math.abs(rawItemsSum - origGrossSub)
  ) {
    return roundCurrency(price);
  }
  return roundCurrency(toRon(price, origCur));
}

export function normalizeAffiliatePayouts(paymentDetails: any): {
  payouts: AffiliatePayoutRecord[];
  paidAmount: number;
  lastPayoutAt: string | null;
} {
  const rawList = Array.isArray(paymentDetails?.payouts) ? paymentDetails.payouts : [];
  const payouts: AffiliatePayoutRecord[] = rawList
    .map((p: any, idx: number) => ({
      id: typeof p?.id === 'string' && p.id.trim() ? p.id.trim() : `payout-${idx}`,
      amount: roundCurrency(p?.amount),
      paidAt: typeof p?.paidAt === 'string' ? p.paidAt : '',
      note: typeof p?.note === 'string' && p.note.trim() ? p.note.trim() : undefined,
      ibanSnapshot:
        typeof p?.ibanSnapshot === 'string' && p.ibanSnapshot.trim()
          ? p.ibanSnapshot.trim()
          : undefined,
    }))
    .filter((p: AffiliatePayoutRecord) => p.amount > 0)
    .sort((a: AffiliatePayoutRecord, b: AffiliatePayoutRecord) =>
      String(b.paidAt || '').localeCompare(String(a.paidAt || ''))
    );

  const sumFromList = roundCurrency(payouts.reduce((sum, p) => sum + p.amount, 0));
  const legacyPaid = roundCurrency(paymentDetails?.paid_amount);

  if (payouts.length === 0 && legacyPaid > 0) {
    const legacyAt =
      typeof paymentDetails?.last_payout_at === 'string'
        ? paymentDetails.last_payout_at
        : '';
    return {
      payouts: [
        {
          id: 'legacy-initial',
          amount: legacyPaid,
          paidAt: legacyAt,
          note: 'Plată înregistrată anterior',
          isLegacy: true,
        },
      ],
      paidAmount: legacyPaid,
      lastPayoutAt: legacyAt || null,
    };
  }

  // If paid_amount drifted slightly above sumFromList (e.g. a manual override), respect legacy delta
  const extraLegacy = roundCurrency(legacyPaid - sumFromList);
  if (extraLegacy > 0.01) {
    payouts.push({
      id: 'legacy-delta',
      amount: extraLegacy,
      paidAt:
        typeof paymentDetails?.last_payout_at === 'string'
          ? paymentDetails.last_payout_at
          : '',
      note: 'Sold plătit anterior',
      isLegacy: true,
    });
  }

  const paidAmount = roundCurrency(payouts.reduce((sum, p) => sum + p.amount, 0));
  const lastPayoutAt =
    payouts[0]?.paidAt ||
    (typeof paymentDetails?.last_payout_at === 'string' ? paymentDetails.last_payout_at : null) ||
    null;

  return { payouts, paidAmount, lastPayoutAt };
}

export function computeAffiliateFinancialSummary(
  orders: Array<{
    totalAmount: number;
    subtotal: number;
    commissionAmount: number;
    isCountable: boolean;
    isPayoutEligible?: boolean;
    eligibleCommissionAmount?: number;
    pendingPickupCommissionAmount?: number;
    status?: string | null;
  }>,
  commissionPercent: number,
  paymentDetails: any,
  fallbackLegacySales = 0,
  fallbackUsageCount = 0
): AffiliateFinancialSummary {
  let calculatedSales = 0;
  let calculatedNetSales = 0;
  let calculatedEligibleSales = 0;
  let calculatedEligibleCommissions = 0;
  let calculatedPendingPickupCommissions = 0;
  let validOrdersCount = 0;
  let deliveredOrdersCount = 0;
  let inTransitOrdersCount = 0;
  let cancelledOrdersCount = 0;

  for (const o of orders) {
    if (o.isCountable) {
      validOrdersCount += 1;
      calculatedSales += Number(o.totalAmount) || 0;
      calculatedNetSales += Number(o.subtotal) || 0;
      const orderComm = Number(o.commissionAmount) || 0;
      const eligible =
        typeof o.isPayoutEligible === 'boolean'
          ? o.isPayoutEligible
          : classifyAffiliateOrderPayoutStatus(o.status).isPayoutEligible;

      if (eligible) {
        deliveredOrdersCount += 1;
        calculatedEligibleSales += Number(o.totalAmount) || 0;
        calculatedEligibleCommissions +=
          typeof o.eligibleCommissionAmount === 'number'
            ? o.eligibleCommissionAmount
            : orderComm;
      } else {
        inTransitOrdersCount += 1;
        calculatedPendingPickupCommissions +=
          typeof o.pendingPickupCommissionAmount === 'number'
            ? o.pendingPickupCommissionAmount
            : orderComm;
      }
    } else {
      cancelledOrdersCount += 1;
    }
  }

  const hasOrderRecords = orders.length > 0;
  const totalSales = hasOrderRecords
    ? roundCurrency(calculatedSales)
    : roundCurrency(fallbackLegacySales);
  const totalNetSales = hasOrderRecords
    ? roundCurrency(calculatedNetSales)
    : roundCurrency(fallbackLegacySales);
  const eligibleSales = hasOrderRecords
    ? roundCurrency(calculatedEligibleSales)
    : roundCurrency(fallbackLegacySales);

  const eligibleCommissions = hasOrderRecords
    ? roundCurrency(calculatedEligibleCommissions)
    : roundCurrency(totalSales * (commissionPercent / 100));
  const pendingPickupCommissions = hasOrderRecords
    ? roundCurrency(calculatedPendingPickupCommissions)
    : 0;
  const totalCommissions = roundCurrency(eligibleCommissions + pendingPickupCommissions);

  const effectiveOrdersCount = hasOrderRecords ? validOrdersCount : Number(fallbackUsageCount) || 0;
  const effectiveDeliveredCount = hasOrderRecords ? deliveredOrdersCount : effectiveOrdersCount;
  const { payouts, paidAmount, lastPayoutAt } = normalizeAffiliatePayouts(paymentDetails);

  // Every countable (non-cancelled/non-returned/non-refunded/non-failed) commission is payable ("De încasat")
  const pendingPayout = Math.max(0, roundCurrency(eligibleCommissions - paidAmount));
  const overpaidAmount = Math.max(0, roundCurrency(paidAmount - eligibleCommissions));
  const payoutProgressPercent =
    eligibleCommissions > 0
      ? Math.min(100, Math.round((paidAmount / eligibleCommissions) * 100))
      : paidAmount > 0
        ? 100
        : 0;
  const aov = effectiveOrdersCount > 0 ? roundCurrency(totalSales / effectiveOrdersCount) : 0;

  return {
    totalSales,
    totalNetSales,
    eligibleSales,
    eligibleCommissions,
    pendingPickupCommissions,
    totalCommissions,
    paidPayout: paidAmount,
    pendingPayout,
    overpaidAmount,
    payoutProgressPercent,
    validOrdersCount: effectiveOrdersCount,
    deliveredOrdersCount: effectiveDeliveredCount,
    inTransitOrdersCount,
    cancelledOrdersCount,
    aov,
    payouts,
    lastPayoutAt,
  };
}

