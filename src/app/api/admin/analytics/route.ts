import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminAuthorized } from '@/app/actions/admin-auth';
import {
  fetchGa4AnalyticsReport,
  resolveAnalyticsDateRange,
  type AnalyticsRangeKey,
} from '@/lib/ga4-analytics';
import { getServerExchangeRates, FALLBACK_RATES } from '@/utils/pricing';
import { getBucharestIsoBounds, normalizeCountry } from '@/utils/admin-helpers';
import { isDigitalOnlyCart } from '@/lib/programs';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VALID_RANGES = new Set<AnalyticsRangeKey>(['today', 'yesterday', '7d', '30d', '90d']);
const NON_COUNTABLE_STATUSES = new Set([
  'cancelled',
  'refunded',
  'failed',
  'returned',
  'refused',
  'neridicat',
]);

const SUPPORTED_CURRENCIES = ['RON', 'EUR', 'USD', 'GBP'] as const;
type SupportedCurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

function computeCurrencyBreakdown(
  orders: any[],
  rates: Record<string, number>
): Array<{ currency: SupportedCurrencyCode; orders: number; revenueNative: number; revenueRon: number }> {
  const buckets: Record<
    SupportedCurrencyCode,
    { currency: SupportedCurrencyCode; orders: number; revenueNative: number; revenueRon: number }
  > = {
    RON: { currency: 'RON', orders: 0, revenueNative: 0, revenueRon: 0 },
    EUR: { currency: 'EUR', orders: 0, revenueNative: 0, revenueRon: 0 },
    USD: { currency: 'USD', orders: 0, revenueNative: 0, revenueRon: 0 },
    GBP: { currency: 'GBP', orders: 0, revenueNative: 0, revenueRon: 0 },
  };

  orders.forEach((order: any) => {
    const curr = String(order.currency || 'RON').toUpperCase().trim();
    if (curr === 'RON' || curr === 'EUR' || curr === 'USD' || curr === 'GBP') {
      const nativeAmt = Number(order.total_amount) || 0;
      const ronAmt = convertToRon(nativeAmt, curr, rates);
      buckets[curr].orders += 1;
      buckets[curr].revenueNative = Number((buckets[curr].revenueNative + nativeAmt).toFixed(2));
      buckets[curr].revenueRon = Number((buckets[curr].revenueRon + ronAmt).toFixed(2));
    }
  });

  return SUPPORTED_CURRENCIES.map((code) => buckets[code]);
}

function convertToRon(amount: number, currency: string, rates: Record<string, number>): number {
  const curr = (currency || 'RON').toUpperCase().trim();
  const numericAmount = Number(amount) || 0;
  if (curr === 'RON' || numericAmount === 0) return numericAmount;
  const rawRate = rates[curr] || FALLBACK_RATES[curr];
  if (!rawRate || rawRate <= 0) return numericAmount;

  const isRonPerUnit = rawRate > 1.5 || (curr === 'HUF' && rawRate < 0.1);
  const foreignPerRon = isRonPerUnit ? 1 / rawRate : rawRate;
  return Number((numericAmount / foreignPerRon).toFixed(2));
}

function parseOrderItems(rawItems: unknown): any[] {
  if (Array.isArray(rawItems)) return rawItems;
  if (typeof rawItems === 'string') {
    try {
      const parsed = JSON.parse(rawItems);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function resolveProductName(rawName: any): string {
  if (!rawName) return 'Produs';
  if (typeof rawName === 'string') return rawName;
  if (typeof rawName === 'object') {
    return String(rawName.ro || rawName.en || Object.values(rawName)[0] || 'Produs');
  }
  return String(rawName);
}

function normalizeProductKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s*\([^)]*\)/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function classifySubscriberSource(rawSource: string | null | undefined): {
  key: 'maintenance' | 'popup' | 'footer' | 'checkout' | 'other';
  label: string;
} {
  const s = String(rawSource || '').toLowerCase().trim();
  if (s.includes('maintenance') || s.includes('mentenanta')) {
    return { key: 'maintenance', label: 'Mentenanță' };
  }
  if (s.includes('popup') || s.includes('scratch') || s.includes('promo')) {
    return { key: 'popup', label: 'Pop-up / ScratchCard' };
  }
  if (s.includes('footer')) {
    return { key: 'footer', label: 'Footer' };
  }
  if (s.includes('checkout')) {
    return { key: 'checkout', label: 'Checkout' };
  }
  return { key: 'other', label: 'Modal / Direct / Altele' };
}

async function fetchAllRows(table: string, selectCols: string, orderCol = 'created_at') {
  const rows: any[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select(selectCols)
      .order(orderCol, { ascending: false })
      .range(from, from + pageSize - 1);

    if (error || !data || data.length === 0) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

export async function GET(request: Request) {
  try {
    const isAuthorized = await isAdminAuthorized();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: 'Neautorizat' }, { status: 401 });
    }

    const url = new URL(request.url);
    const rawRange = (url.searchParams.get('range') || '30d') as AnalyticsRangeKey;
    const range: AnalyticsRangeKey = VALID_RANGES.has(rawRange) ? rawRange : '30d';

    const dates = resolveAnalyticsDateRange(range);
    const { startIso, endIso } = getBucharestIsoBounds(dates.startDate, dates.endDate);

    let periodOrdersQuery = supabaseAdmin
      .from('orders')
      .select(
        'id, total_amount, subtotal, discount_total, shipping_amount, currency, status, payment_method, shipping_type, carrier_id, branch_id, branch_name, addr_country, items, created_at, coupon_id, carrier_metadata'
      );
    if (startIso) periodOrdersQuery = periodOrdersQuery.gte('created_at', startIso);
    if (endIso) periodOrdersQuery = periodOrdersQuery.lte('created_at', endIso);

    let scratchInPeriodQuery = supabaseAdmin
      .from('coupons')
      .select('id', { count: 'exact', head: true })
      .ilike('code', 'SCRATCH-%');
    if (startIso) scratchInPeriodQuery = scratchInPeriodQuery.gte('created_at', startIso);
    if (endIso) scratchInPeriodQuery = scratchInPeriodQuery.lte('created_at', endIso);

    let contactInPeriodQuery = supabaseAdmin
      .from('contact_messages')
      .select('id', { count: 'exact', head: true });
    if (startIso) contactInPeriodQuery = contactInPeriodQuery.gte('created_at', startIso);
    if (endIso) contactInPeriodQuery = contactInPeriodQuery.lte('created_at', endIso);

    let checkoutsInPeriodQuery = supabaseAdmin
      .from('checkout_sessions')
      .select('status');
    if (startIso) checkoutsInPeriodQuery = checkoutsInPeriodQuery.gte('created_at', startIso);
    if (endIso) checkoutsInPeriodQuery = checkoutsInPeriodQuery.lte('created_at', endIso);

    const [
      ga4,
      rates,
      { data: periodOrdersRaw },
      { data: nonScratchCoupons },
      { data: affiliates },
      allSubscribers,
      { data: catalogProducts },
      scratchGeneratedInPeriodRes,
      scratchTotalAllTimeRes,
      scratchUsedAllTimeRes,
      contactInPeriodRes,
      contactAllTimeRes,
      { data: checkoutsInPeriod },
    ] = await Promise.all([
      fetchGa4AnalyticsReport(range),
      getServerExchangeRates(),
      periodOrdersQuery,
      supabaseAdmin
        .from('coupons')
        .select('id, code, type, value, used_count, is_active, created_at')
        .not('code', 'ilike', 'SCRATCH-%'),
      supabaseAdmin.from('affiliates').select('id, name, code, commission_percent, status'),
      fetchAllRows('subscribers', 'id, email, source, locale, is_active, subscribed_at', 'subscribed_at'),
      supabaseAdmin.from('products').select('id, slug, name'),
      scratchInPeriodQuery,
      supabaseAdmin
        .from('coupons')
        .select('id', { count: 'exact', head: true })
        .ilike('code', 'SCRATCH-%'),
      supabaseAdmin
        .from('coupons')
        .select('id', { count: 'exact', head: true })
        .ilike('code', 'SCRATCH-%')
        .gt('used_count', 0),
      contactInPeriodQuery,
      supabaseAdmin.from('contact_messages').select('id', { count: 'exact', head: true }),
      checkoutsInPeriodQuery,
    ]);

    const periodOrders = (periodOrdersRaw || []).filter(
      (o: any) => !NON_COUNTABLE_STATUSES.has(String(o.status || '').toLowerCase())
    );

    // Resolve coupon_ids referenced in periodOrders (including SCRATCH-* coupons)
    const couponIdToInfo = new Map<string, { code: string; type?: string; value?: number }>();
    (nonScratchCoupons || []).forEach((c: any) => {
      if (c.id && c.code) {
        couponIdToInfo.set(String(c.id), {
          code: String(c.code).toUpperCase().trim(),
          type: c.type,
          value: Number(c.value) || 0,
        });
      }
    });

    const missingCouponIds = Array.from(
      new Set(
        periodOrders
          .map((o: any) => (o.coupon_id ? String(o.coupon_id) : ''))
          .filter((id) => id && !couponIdToInfo.has(id))
      )
    );

    if (missingCouponIds.length > 0) {
      const { data: matchedCoupons } = await supabaseAdmin
        .from('coupons')
        .select('id, code, type, value')
        .in('id', missingCouponIds);
      (matchedCoupons || []).forEach((c: any) => {
        if (c.id && c.code) {
          couponIdToInfo.set(String(c.id), {
            code: String(c.code).toUpperCase().trim(),
            type: c.type,
            value: Number(c.value) || 0,
          });
        }
      });
    }

    const affiliateCodeMap = new Map<string, string>();
    (affiliates || []).forEach((a: any) => {
      if (a.code) {
        affiliateCodeMap.set(String(a.code).toUpperCase().trim(), String(a.name || a.code));
      }
    });

    // 1. Coupons & ScratchCard Performance (Supabase)
    let totalOrdersCount = 0;
    let totalRevenueRon = 0;
    let totalDiscountGrantedRon = 0;
    let ordersWithCouponCount = 0;

    const categoryTotals = {
      scratch: { label: 'ScratchCard (SCRATCH-*)', orders: 0, revenueRon: 0, discountRon: 0 },
      tren5: { label: 'Welcome Newsletter (TREN5)', orders: 0, revenueRon: 0, discountRon: 0 },
      affiliate: { label: 'Influenceri & Afiliați', orders: 0, revenueRon: 0, discountRon: 0 },
      other: { label: 'Alte Cupoane Promo', orders: 0, revenueRon: 0, discountRon: 0 },
    };

    const couponCodeBreakdown = new Map<
      string,
      {
        code: string;
        category: 'scratch' | 'tren5' | 'affiliate' | 'other';
        affiliateName?: string;
        orders: number;
        revenueRon: number;
        discountRon: number;
      }
    >();

    // Payment & Shipping stats (Supabase)
    let cardCount = 0;
    let cardRevenueRon = 0;
    let applePayCount = 0;
    let googlePayCount = 0;
    let rambursCount = 0;
    let rambursRevenueRon = 0;

    const shippingBuckets = {
      courier_ro: { key: 'courier_ro', label: 'Curier România (Domiciliu)', count: 0, revenueRon: 0 },
      international: { key: 'international', label: 'Internațional (Packeta / TCE / EU)', count: 0, revenueRon: 0 },
      digital: { key: 'digital', label: 'Digital (Programe PDF)', count: 0, revenueRon: 0 },
    };

    // Sales per product for Viewed vs Sold comparison
    const productSalesByKey = new Map<
      string,
      { name: string; slug: string | null; soldQty: number; revenueRon: number }
    >();
    const slugToCatalog = new Map<string, { name: string; slug: string }>();
    const keyToCatalog = new Map<string, { name: string; slug: string }>();
    (catalogProducts || []).forEach((p: any) => {
      const nameStr = resolveProductName(p.name);
      const slugStr = String(p.slug || '').trim();
      if (slugStr) slugToCatalog.set(slugStr.toLowerCase(), { name: nameStr, slug: slugStr });
      keyToCatalog.set(normalizeProductKey(nameStr), { name: nameStr, slug: slugStr });
    });

    periodOrders.forEach((o: any) => {
      totalOrdersCount += 1;
      const curr = (o.currency || 'RON').toUpperCase();
      const orderAmtRon = convertToRon(Number(o.total_amount) || 0, curr, rates);
      const orderDiscountRon = convertToRon(Number(o.discount_total) || 0, curr, rates);
      totalRevenueRon = Number((totalRevenueRon + orderAmtRon).toFixed(2));
      totalDiscountGrantedRon = Number((totalDiscountGrantedRon + orderDiscountRon).toFixed(2));

      // Coupon attribution
      const metaCode = String(o.carrier_metadata?.coupon_code || o.carrier_metadata?.coupon || '')
        .trim()
        .toUpperCase();
      const idCode = o.coupon_id ? couponIdToInfo.get(String(o.coupon_id))?.code || '' : '';
      const resolvedCode = metaCode || idCode;

      if (resolvedCode) {
        ordersWithCouponCount += 1;
        let cat: 'scratch' | 'tren5' | 'affiliate' | 'other' = 'other';
        if (resolvedCode.startsWith('SCRATCH-')) cat = 'scratch';
        else if (resolvedCode === 'TREN5') cat = 'tren5';
        else if (affiliateCodeMap.has(resolvedCode)) cat = 'affiliate';

        categoryTotals[cat].orders += 1;
        categoryTotals[cat].revenueRon = Number((categoryTotals[cat].revenueRon + orderAmtRon).toFixed(2));
        categoryTotals[cat].discountRon = Number((categoryTotals[cat].discountRon + orderDiscountRon).toFixed(2));

        const existing = couponCodeBreakdown.get(resolvedCode) || {
          code: resolvedCode,
          category: cat,
          affiliateName: affiliateCodeMap.get(resolvedCode),
          orders: 0,
          revenueRon: 0,
          discountRon: 0,
        };
        existing.orders += 1;
        existing.revenueRon = Number((existing.revenueRon + orderAmtRon).toFixed(2));
        existing.discountRon = Number((existing.discountRon + orderDiscountRon).toFixed(2));
        couponCodeBreakdown.set(resolvedCode, existing);
      }

      // Payment method & wallet detection
      const pm = String(o.payment_method || '').toLowerCase();
      const isCod = pm === 'cod' || pm === 'ramburs' || pm === 'cash_on_delivery';
      if (isCod) {
        rambursCount += 1;
        rambursRevenueRon = Number((rambursRevenueRon + orderAmtRon).toFixed(2));
      } else {
        cardCount += 1;
        cardRevenueRon = Number((cardRevenueRon + orderAmtRon).toFixed(2));
        const walletRaw = String(
          o.carrier_metadata?.wallet || o.carrier_metadata?.card_wallet || o.carrier_metadata?.payment_method_type || ''
        ).toLowerCase();
        if (walletRaw.includes('apple')) applePayCount += 1;
        else if (walletRaw.includes('google')) googlePayCount += 1;
      }

      // Shipping method
      const items = parseOrderItems(o.items);
      const isDigitalOnly =
        o.carrier_metadata?.is_digital_only === true || (items.length > 0 && isDigitalOnlyCart(items));
      const countryCode = normalizeCountry(o.addr_country).code;

      if (isDigitalOnly) {
        shippingBuckets.digital.count += 1;
        shippingBuckets.digital.revenueRon = Number((shippingBuckets.digital.revenueRon + orderAmtRon).toFixed(2));
      } else if (countryCode === 'RO') {
        shippingBuckets.courier_ro.count += 1;
        shippingBuckets.courier_ro.revenueRon = Number((shippingBuckets.courier_ro.revenueRon + orderAmtRon).toFixed(2));
      } else {
        shippingBuckets.international.count += 1;
        shippingBuckets.international.revenueRon = Number(
          (shippingBuckets.international.revenueRon + orderAmtRon).toFixed(2)
        );
      }

      // Product sales aggregation
      items.forEach((item: any) => {
        const qty = Math.max(1, Number(item.quantity) || 1);
        const rawPrice =
          typeof item.price === 'number'
            ? item.price
            : Number(item.price?.RON) || Number(item.price?.EUR) || Number(item.price) || 0;
        const itemRevRon = convertToRon(rawPrice, curr, rates) * qty;
        const rawName = resolveProductName(item.name);
        const cleanName = rawName.replace(/\s*\([^)]*\)/g, '').trim() || rawName;
        const itemSlug = typeof item.slug === 'string' && item.slug.trim() ? item.slug.trim() : null;
        const key = normalizeProductKey(cleanName);
        const catInfo = (itemSlug && slugToCatalog.get(itemSlug.toLowerCase())) || keyToCatalog.get(key);
        const displayName = catInfo?.name || cleanName;
        const displaySlug = catInfo?.slug || itemSlug;

        const existing = productSalesByKey.get(key) || {
          name: displayName,
          slug: displaySlug,
          soldQty: 0,
          revenueRon: 0,
        };
        existing.soldQty += qty;
        existing.revenueRon = Number((existing.revenueRon + itemRevRon).toFixed(2));
        if (!existing.slug && displaySlug) existing.slug = displaySlug;
        productSalesByKey.set(key, existing);
      });
    });

    const scratchGeneratedPeriod = scratchGeneratedInPeriodRes.count || 0;
    const scratchRedeemedPeriod = categoryTotals.scratch.orders;
    const scratchConversionPeriodPct =
      scratchGeneratedPeriod > 0
        ? Number(((scratchRedeemedPeriod / scratchGeneratedPeriod) * 100).toFixed(1))
        : 0;
    const scratchTotalAllTime = scratchTotalAllTimeRes.count || 0;
    const scratchUsedAllTime = scratchUsedAllTimeRes.count || 0;

    const topCoupons = Array.from(couponCodeBreakdown.values())
      .sort((a, b) => b.orders - a.orders || b.revenueRon - a.revenueRon)
      .slice(0, 12);

    // 2. Subscribers & Leads by Source (Supabase)
    const startMs = startIso ? new Date(startIso).getTime() : 0;
    const endMs = endIso ? new Date(endIso).getTime() : Date.now();

    const subSourceBuckets: Record<
      'maintenance' | 'popup' | 'footer' | 'checkout' | 'other',
      { key: string; label: string; allTime: number; inPeriod: number; activeAllTime: number }
    > = {
      maintenance: { key: 'maintenance', label: 'Mentenanță', allTime: 0, inPeriod: 0, activeAllTime: 0 },
      popup: { key: 'popup', label: 'Pop-up / ScratchCard', allTime: 0, inPeriod: 0, activeAllTime: 0 },
      footer: { key: 'footer', label: 'Footer', allTime: 0, inPeriod: 0, activeAllTime: 0 },
      checkout: { key: 'checkout', label: 'Checkout', allTime: 0, inPeriod: 0, activeAllTime: 0 },
      other: { key: 'other', label: 'Modal / Direct / Altele', allTime: 0, inPeriod: 0, activeAllTime: 0 },
    };

    let activeSubscribersAllTime = 0;
    let subscribersInPeriod = 0;

    allSubscribers.forEach((s: any) => {
      const cat = classifySubscriberSource(s.source);
      const bucket = subSourceBuckets[cat.key];
      bucket.allTime += 1;
      const isActive = s.is_active !== false;
      if (isActive) {
        activeSubscribersAllTime += 1;
        bucket.activeAllTime += 1;
      }
      const t = s.subscribed_at ? new Date(s.subscribed_at).getTime() : 0;
      if (t >= startMs && t <= endMs) {
        subscribersInPeriod += 1;
        bucket.inPeriod += 1;
      }
    });

    // 3. Hybrid E-Commerce Funnel (GA4 steps + real Supabase paid orders)
    const gaSessions = ga4.overview?.sessions || 0;
    const gaViewItem = ga4.events?.viewItem || 0;
    const gaAddToCart = ga4.events?.addToCart || 0;
    const gaBeginCheckout = ga4.events?.beginCheckout || 0;
    const supabaseCheckoutCount = (checkoutsInPeriod || []).length;

    const funnel = {
      ga4Connected: ga4.configured && !ga4.error,
      sessions: ga4.configured ? gaSessions : null,
      viewItem: ga4.configured ? gaViewItem : null,
      addToCart: ga4.configured ? gaAddToCart : null,
      beginCheckout: ga4.configured ? gaBeginCheckout : null,
      supabaseCheckouts: supabaseCheckoutCount,
      orders: totalOrdersCount,
      overallConversionPct:
        ga4.configured && gaSessions > 0
          ? Number(((totalOrdersCount / gaSessions) * 100).toFixed(2))
          : null,
    };

    // 4. Join GA4 Viewed Products / Product Pages with Supabase Sales
    const comparisonMap = new Map<
      string,
      {
        name: string;
        slug: string | null;
        views: number;
        addToCart: number;
        soldQty: number;
        revenueRon: number;
        viewToBuyPct: number | null;
      }
    >();

    // Seed with Supabase sold products
    productSalesByKey.forEach((val, key) => {
      comparisonMap.set(key, {
        name: val.name,
        slug: val.slug,
        views: 0,
        addToCart: 0,
        soldQty: val.soldQty,
        revenueRon: val.revenueRon,
        viewToBuyPct: null,
      });
    });

    // Merge GA4 viewedItems (if GA4 ecommerce item tracking is active)
    ga4.viewedItems.forEach((item) => {
      const key = normalizeProductKey(item.itemName);
      if (!key) return;
      const existing = comparisonMap.get(key) || {
        name: item.itemName,
        slug: keyToCatalog.get(key)?.slug || null,
        views: 0,
        addToCart: 0,
        soldQty: 0,
        revenueRon: 0,
        viewToBuyPct: null,
      };
      existing.views = Math.max(existing.views, item.itemsViewed);
      existing.addToCart = Math.max(existing.addToCart, item.itemsAddedToCart);
      comparisonMap.set(key, existing);
    });

    // Fallback/augment with GA4 /product/<slug> pagePath views
    ga4.topPages.forEach((pg) => {
      const m = pg.path.match(/\/product\/([^/?#]+)/i);
      if (!m) return;
      const slug = m[1].toLowerCase();
      const cat = slugToCatalog.get(slug);
      const key = cat ? normalizeProductKey(cat.name) : slug.replace(/-/g, ' ');
      const existing = comparisonMap.get(key) || {
        name: cat?.name || slug.replace(/-/g, ' '),
        slug,
        views: 0,
        addToCart: 0,
        soldQty: 0,
        revenueRon: 0,
        viewToBuyPct: null,
      };
      existing.views = Math.max(existing.views, pg.views);
      comparisonMap.set(key, existing);
    });

    const productComparison = Array.from(comparisonMap.values())
      .map((row) => ({
        ...row,
        viewToBuyPct:
          row.views > 0 ? Number(((row.soldQty / row.views) * 100).toFixed(2)) : null,
      }))
      .sort((a, b) => b.views - a.views || b.soldQty - a.soldQty)
      .slice(0, 15);

    const shippingDenominator = Math.max(1, totalOrdersCount);
    const paymentDenominator = Math.max(1, cardCount + rambursCount);
    const currencyBreakdown = computeCurrencyBreakdown(periodOrders, rates);

    return NextResponse.json({
      success: true,
      range,
      period: {
        startDate: dates.startDate,
        endDate: dates.endDate,
        prevStartDate: dates.prevStartDate,
        prevEndDate: dates.prevEndDate,
      },
      exchangeRates: rates,
      currencyBreakdown,
      ga4,
      funnel,
      productComparison,
      supabaseMarketing: {
        ordersInPeriod: totalOrdersCount,
        revenueInPeriodRon: totalRevenueRon,
        currencyBreakdown,
        scratchCard: {
          generatedInPeriod: scratchGeneratedPeriod,
          redeemedInPeriod: scratchRedeemedPeriod,
          conversionRatePct: scratchConversionPeriodPct,
          revenueRon: categoryTotals.scratch.revenueRon,
          discountRon: categoryTotals.scratch.discountRon,
          totalAllTime: scratchTotalAllTime,
          usedAllTime: scratchUsedAllTime,
        },
        coupons: {
          ordersWithCouponCount,
          couponSharePct:
            totalOrdersCount > 0 ? Number(((ordersWithCouponCount / totalOrdersCount) * 100).toFixed(1)) : 0,
          totalDiscountGrantedRon,
          categories: categoryTotals,
          topCoupons,
        },
        leads: {
          totalSubscribersAllTime: allSubscribers.length,
          activeSubscribersAllTime,
          subscribersInPeriod,
          contactLeadsInPeriod: contactInPeriodRes.count || 0,
          contactLeadsAllTime: contactAllTimeRes.count || 0,
          sources: Object.values(subSourceBuckets),
        },
        payments: {
          card: {
            count: cardCount,
            percentage: totalOrdersCount > 0 ? Math.round((cardCount / paymentDenominator) * 100) : 0,
            revenueRon: cardRevenueRon,
            applePayCount,
            googlePayCount,
          },
          ramburs: {
            count: rambursCount,
            percentage: totalOrdersCount > 0 ? Math.round((rambursCount / paymentDenominator) * 100) : 0,
            revenueRon: rambursRevenueRon,
          },
        },
        shipping: Object.values(shippingBuckets).map((b) => ({
          ...b,
          percentage: totalOrdersCount > 0 ? Math.round((b.count / shippingDenominator) * 100) : 0,
        })),
      },
    });
  } catch (err: any) {
    console.error('[API Admin Analytics] Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Eroare internă analytics' },
      { status: 500 }
    );
  }
}
