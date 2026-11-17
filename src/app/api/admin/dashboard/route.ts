import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminAuthorized } from '@/app/actions/admin-auth';
import { getServerExchangeRates, FALLBACK_RATES } from '@/utils/pricing';
import {
  normalizeCityName,
  normalizeFlavor,
  normalizeCountry,
  getBucharestIsoBounds,
} from '@/utils/admin-helpers';
import { hasAnyDigitalProgram, isDigitalOnlyCart } from '@/lib/programs';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NON_COUNTABLE_STATUSES = new Set([
  'cancelled',
  'refunded',
  'failed',
  'returned',
  'refused',
  'neridicat',
]);

const FAILED_OR_CANCELLED_STATUSES = new Set([
  'failed',
  'returned',
  'cancelled',
  'refused',
  'neridicat',
]);

function computeDeltaPct(current: number, previous: number): number | null {
  if (previous <= 0 && current <= 0) return null;
  if (previous <= 0 && current > 0) return 100;
  return Math.round(((current - previous) / previous) * 100);
}

function getPreviousDateRange(startDay: string, endDay: string): { prevStart: string; prevEnd: string } {
  const s = new Date(`${startDay}T12:00:00Z`);
  const e = new Date(`${endDay}T12:00:00Z`);
  const spanDays = Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
  const prevEndDate = new Date(s.getTime() - 86400000);
  const prevStartDate = new Date(prevEndDate.getTime() - (spanDays - 1) * 86400000);
  return {
    prevStart: prevStartDate.toISOString().split('T')[0],
    prevEnd: prevEndDate.toISOString().split('T')[0],
  };
}

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

function unpackOrderItem(item: any, orderCurrency: string, rates: Record<string, number>) {
  const isBundle =
    String(item.id || '').includes('-bundle-') ||
    (typeof item.name === 'string' && item.name.toLowerCase().includes('pachet'));
  const qty = Math.max(1, Number(item.quantity) || 1);
  const rawPrice =
    typeof item.price === 'number'
      ? item.price
      : Number(item.price?.RON) || Number(item.price?.EUR) || Number(item.price) || 0;
  const priceRon = convertToRon(rawPrice, orderCurrency, rates);

  if (isBundle) {
    const rawVariant = item.selectedVariant?.name || item.variant?.name || item.variant || '';
    let flavorsStr = typeof rawVariant === 'string' ? rawVariant : '';
    if (!flavorsStr && typeof item.name === 'string') {
      const m = item.name.match(/\(([^)]+)\)/);
      if (m) flavorsStr = m[1];
    }
    const flavors = flavorsStr
      .split(',')
      .map((f: string) => normalizeFlavor(f))
      .filter(Boolean);
    if (flavors.length > 0) {
      const pricePerPiece = priceRon / flavors.length;
      const baseName =
        typeof item.name === 'object' ? item.name?.ro || item.name?.en || 'Pachet' : item.name || 'Pachet';
      const cleanBase = baseName.replace(/\s*\([^)]*\)/g, '').trim();
      return flavors.map((f: string) => ({
        name: `${cleanBase} (${f})`,
        variant: f,
        quantity: qty,
        revenue: pricePerPiece * qty,
        image: item.image,
      }));
    }
  }

  let rawVar = item.selectedVariant?.name || item.variant?.name || item.variant || '';
  if (!rawVar && typeof item.name === 'string') {
    const m = item.name.match(/\(([^)]+)\)/);
    if (m) rawVar = m[1];
  }
  const flavor = normalizeFlavor(rawVar);
  const rawName =
    typeof item.name === 'object' ? item.name?.ro || item.name?.en || 'Produs' : item.name || 'Produs';
  const cleanBase = rawName.replace(/\s*\([^)]*\)/g, '').trim();
  const finalName = flavor ? `${cleanBase || 'Produs'} (${flavor})` : rawName;

  return [
    {
      name: finalName,
      variant: flavor,
      quantity: qty,
      revenue: priceRon * qty,
      image: item.image,
    },
  ];
}

async function fetchAllHistoricalOrders() {
  const rows: any[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select(
        'id, created_at, total_amount, currency, status, addr_city, addr_country, tracking_number, items, carrier_metadata, customer_email, shipping_type, branch_id'
      )
      .order('created_at', { ascending: true })
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
    const startDate = url.searchParams.get('startDate') || undefined;
    const endDate = url.searchParams.get('endDate') || undefined;

    const rates = await getServerExchangeRates();
    const { startIso, endIso } = getBucharestIsoBounds(startDate, endDate);

    const startDateStr = startDate
      ? startDate.split('T')[0]
      : new Date(Date.now() - 30 * 86400000).toLocaleDateString('en-CA', { timeZone: 'Europe/Bucharest' });
    const endDateStr = endDate
      ? endDate.split('T')[0]
      : new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Bucharest' });
    const { prevStart, prevEnd } = getPreviousDateRange(startDateStr, endDateStr);
    const prevBounds = getBucharestIsoBounds(prevStart, prevEnd);

    let periodOrdersQuery = supabaseAdmin
      .from('orders')
      .select(
        'id, created_at, total_amount, currency, payment_method, status, addr_city, addr_country, items, customer_email, shipping_type, carrier_id, branch_id, branch_name, carrier_metadata, tracking_number'
      );
    if (startIso) periodOrdersQuery = periodOrdersQuery.gte('created_at', startIso);
    if (endIso) periodOrdersQuery = periodOrdersQuery.lte('created_at', endIso);

    let prevOrdersQuery = supabaseAdmin
      .from('orders')
      .select('created_at, total_amount, currency, status, customer_email');
    if (prevBounds.startIso) prevOrdersQuery = prevOrdersQuery.gte('created_at', prevBounds.startIso);
    if (prevBounds.endIso) prevOrdersQuery = prevOrdersQuery.lte('created_at', prevBounds.endIso);

    let checkoutQuery = supabaseAdmin
      .from('checkout_sessions')
      .select('status, items, total_amount, currency, updated_at, created_at');
    if (startIso) checkoutQuery = checkoutQuery.gte('created_at', startIso);
    if (endIso) checkoutQuery = checkoutQuery.lte('created_at', endIso);

    let returnsQuery = supabaseAdmin.from('returns').select('status, total_refund_amount');
    if (startIso) returnsQuery = returnsQuery.gte('created_at', startIso);
    if (endIso) returnsQuery = returnsQuery.lte('created_at', endIso);

    const [
      { data: periodOrdersRaw },
      { data: prevOrdersRaw },
      allHistoricalOrdersRaw,
      { data: checkouts },
      { data: returnsData },
    ] = await Promise.all([
      periodOrdersQuery,
      prevOrdersQuery,
      fetchAllHistoricalOrders(),
      checkoutQuery,
      returnsQuery,
    ]);

    const periodOrders = periodOrdersRaw || [];
    const successfulOrders = periodOrders.filter(
      (o: any) => !NON_COUNTABLE_STATUSES.has(String(o.status || '').toLowerCase())
    );
    const failedOrders = periodOrders.filter((o: any) =>
      FAILED_OR_CANCELLED_STATUSES.has(String(o.status || '').toLowerCase())
    );
    const cancelledOrders = periodOrders.filter(
      (o: any) => String(o.status || '').toLowerCase() === 'cancelled'
    );

    const prevSuccessfulOrders = (prevOrdersRaw || []).filter(
      (o: any) => !NON_COUNTABLE_STATUSES.has(String(o.status || '').toLowerCase())
    );
    const allHistoricalSuccessful = allHistoricalOrdersRaw.filter(
      (o: any) => !NON_COUNTABLE_STATUSES.has(String(o.status || '').toLowerCase())
    );

    const totalRevenue = Number(
      successfulOrders
        .reduce((sum, order) => sum + convertToRon(Number(order.total_amount) || 0, order.currency || 'RON', rates), 0)
        .toFixed(2)
    );
    const currencyBreakdown = computeCurrencyBreakdown(successfulOrders, rates);
    const totalOrders = successfulOrders.length;
    const aov = totalOrders > 0 ? Number((totalRevenue / totalOrders).toFixed(2)) : 0;

    const prevRevenue = Number(
      prevSuccessfulOrders
        .reduce((sum, order) => sum + convertToRon(Number(order.total_amount) || 0, order.currency || 'RON', rates), 0)
        .toFixed(2)
    );
    const prevOrdersCount = prevSuccessfulOrders.length;
    const prevAov = prevOrdersCount > 0 ? prevRevenue / prevOrdersCount : 0;

    const failedOrdersCount = failedOrders.length;
    const failedOrdersValue = Number(
      failedOrders
        .reduce((sum, order) => sum + convertToRon(Number(order.total_amount) || 0, order.currency || 'RON', rates), 0)
        .toFixed(2)
    );
    const cancelledOrdersCount = cancelledOrders.length;

    // Abandoned carts in period
    let abandonedCarts = 0;
    let potentialLostRevenue = 0;
    (checkouts || []).forEach((c: any) => {
      if (c.status === 'initiated' || c.status === 'pending') {
        abandonedCarts++;
        let cartVal = Number(c.total_amount) || 0;
        if (cartVal === 0 && Array.isArray(c.items)) {
          cartVal = c.items.reduce((sum: number, item: any) => {
            const p =
              typeof item.price === 'number'
                ? item.price
                : Number(item.price?.RON) || Number(item.price?.EUR) || Number(item.price) || 0;
            return sum + p * (Number(item.quantity) || 1);
          }, 0);
        }
        potentialLostRevenue += convertToRon(cartVal, c.currency || 'RON', rates);
      }
    });
    potentialLostRevenue = Number(potentialLostRevenue.toFixed(2));

    // Returns in period
    const returnsCount = returnsData?.length || 0;
    const returnsValue = Number(
      (returnsData || []).reduce((sum: number, r: any) => sum + (Number(r.total_refund_amount) || 0), 0).toFixed(2)
    );
    const returnRate = totalOrders > 0 ? ((returnsCount / totalOrders) * 100).toFixed(1) : '0.0';

    // Payment method split (Card vs Ramburs)
    const rambursOrders = successfulOrders.filter((o: any) => {
      const pm = String(o.payment_method || '').toLowerCase();
      return pm === 'cod' || pm === 'ramburs' || pm === 'cash_on_delivery';
    });
    const cardOrders = successfulOrders.filter((o: any) => !rambursOrders.includes(o));

    const cardRevenue = Number(
      cardOrders
        .reduce((sum, order) => sum + convertToRon(Number(order.total_amount) || 0, order.currency || 'RON', rates), 0)
        .toFixed(2)
    );
    const rambursRevenue = Number(
      rambursOrders
        .reduce((sum, order) => sum + convertToRon(Number(order.total_amount) || 0, order.currency || 'RON', rates), 0)
        .toFixed(2)
    );

    // Unique customers + New vs Returning customers (computed from full Supabase order history)
    const firstOrderByEmail = new Map<string, { id: string; timeMs: number }>();
    allHistoricalSuccessful.forEach((o: any) => {
      const email = o.customer_email?.trim().toLowerCase();
      if (!email) return;
      const t = new Date(o.created_at).getTime();
      const existing = firstOrderByEmail.get(email);
      if (!existing || t < existing.timeMs) {
        firstOrderByEmail.set(email, { id: String(o.id), timeMs: t });
      }
    });

    const periodStartMs = startIso ? new Date(startIso).getTime() : 0;
    const uniquePeriodEmails = new Set<string>();
    let newCustomers = 0;
    let returningCustomers = 0;
    let newCustomerOrders = 0;
    let returningCustomerOrders = 0;
    let newCustomerRevenue = 0;
    let returningCustomerRevenue = 0;

    successfulOrders.forEach((o: any) => {
      const email = o.customer_email?.trim().toLowerCase();
      const amtRon = convertToRon(Number(o.total_amount) || 0, o.currency || 'RON', rates);
      if (!email) {
        newCustomerOrders += 1;
        newCustomerRevenue += amtRon;
        return;
      }

      const firstRec = firstOrderByEmail.get(email);
      const isFirstOrderEver = firstRec ? firstRec.id === String(o.id) : true;
      if (isFirstOrderEver) {
        newCustomerOrders += 1;
        newCustomerRevenue += amtRon;
      } else {
        returningCustomerOrders += 1;
        returningCustomerRevenue += amtRon;
      }

      if (!uniquePeriodEmails.has(email)) {
        uniquePeriodEmails.add(email);
        if (!firstRec || firstRec.timeMs >= periodStartMs) {
          newCustomers += 1;
        } else {
          returningCustomers += 1;
        }
      }
    });

    const totalCustomers = uniquePeriodEmails.size;
    const prevUniqueCustomers = new Set(
      prevSuccessfulOrders.map((o: any) => o.customer_email?.trim().toLowerCase()).filter(Boolean)
    ).size;

    const customerSegments = {
      newCustomers,
      returningCustomers,
      newOrders: newCustomerOrders,
      returningOrders: returningCustomerOrders,
      newRevenue: Number(newCustomerRevenue.toFixed(2)),
      returningRevenue: Number(returningCustomerRevenue.toFixed(2)),
      returningPct: totalCustomers > 0 ? Math.round((returningCustomers / totalCustomers) * 100) : 0,
    };

    // Shipping breakdown: Easybox / Locker vs Curier la ușă (RO) vs Internațional (+ Digital)
    const shippingBuckets = {
      easybox: { key: 'easybox', label: 'Easybox / Locker', count: 0, revenue: 0 },
      courier_ro: { key: 'courier_ro', label: 'Curier la ușă (RO)', count: 0, revenue: 0 },
      international: { key: 'international', label: 'Internațional (EU / Global)', count: 0, revenue: 0 },
      digital: { key: 'digital', label: 'Digital (Programe PDF)', count: 0, revenue: 0 },
    };

    successfulOrders.forEach((o: any) => {
      const amtRon = convertToRon(Number(o.total_amount) || 0, o.currency || 'RON', rates);
      const items = parseOrderItems(o.items);
      const isDigitalOnly =
        o.carrier_metadata?.is_digital_only === true || (items.length > 0 && isDigitalOnlyCart(items));
      const isLocker =
        String(o.shipping_type || '').toLowerCase() === 'pudo' ||
        Boolean(o.branch_id) ||
        Boolean(o.carrier_metadata?.locker_id);
      const countryCode = normalizeCountry(o.addr_country).code;

      if (isDigitalOnly) {
        shippingBuckets.digital.count += 1;
        shippingBuckets.digital.revenue = Number((shippingBuckets.digital.revenue + amtRon).toFixed(2));
      } else if (isLocker) {
        shippingBuckets.easybox.count += 1;
        shippingBuckets.easybox.revenue = Number((shippingBuckets.easybox.revenue + amtRon).toFixed(2));
      } else if (countryCode === 'RO') {
        shippingBuckets.courier_ro.count += 1;
        shippingBuckets.courier_ro.revenue = Number((shippingBuckets.courier_ro.revenue + amtRon).toFixed(2));
      } else {
        shippingBuckets.international.count += 1;
        shippingBuckets.international.revenue = Number((shippingBuckets.international.revenue + amtRon).toFixed(2));
      }
    });

    const shippingDenominator = Math.max(1, totalOrders);
    const shippingBreakdown = Object.values(shippingBuckets).map((b) => ({
      ...b,
      percentage: totalOrders > 0 ? Math.round((b.count / shippingDenominator) * 100) : 0,
    }));

    // Time series (hourly for single day, daily otherwise)
    const isSingleDay = startDateStr === endDateStr;
    const granularity: 'hourly' | 'daily' = isSingleDay ? 'hourly' : 'daily';
    let timeseries: Array<{
      date: string;
      label: string;
      revenue: number;
      orders: number;
      prevRevenue: number;
      prevOrders: number;
    }> = [];

    if (isSingleDay) {
      const hourBuckets = Array.from({ length: 24 }, (_, h) => {
        const hh = String(h).padStart(2, '0');
        return {
          date: `${startDateStr}T${hh}:00`,
          label: `${hh}:00`,
          revenue: 0,
          orders: 0,
          prevRevenue: 0,
          prevOrders: 0,
        };
      });

      const getBucharestHour = (iso: string) => {
        const hStr = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Europe/Bucharest',
          hour: '2-digit',
          hour12: false,
        }).format(new Date(iso));
        const h = parseInt(hStr, 10);
        return Number.isFinite(h) ? Math.min(23, Math.max(0, h === 24 ? 0 : h)) : 0;
      };

      successfulOrders.forEach((order: any) => {
        const amt = convertToRon(Number(order.total_amount) || 0, (order.currency || 'RON').toUpperCase(), rates);
        const h = getBucharestHour(order.created_at);
        hourBuckets[h].revenue = Number((hourBuckets[h].revenue + amt).toFixed(2));
        hourBuckets[h].orders += 1;
      });

      prevSuccessfulOrders.forEach((order: any) => {
        const amt = convertToRon(Number(order.total_amount) || 0, (order.currency || 'RON').toUpperCase(), rates);
        const h = getBucharestHour(order.created_at);
        hourBuckets[h].prevRevenue = Number((hourBuckets[h].prevRevenue + amt).toFixed(2));
        hourBuckets[h].prevOrders += 1;
      });

      timeseries = hourBuckets;
    } else {
      const timeseriesMap = new Map<
        string,
        { date: string; label: string; revenue: number; orders: number; prevRevenue: number; prevOrders: number }
      >();
      const dayKeys: string[] = [];

      const iterDate = new Date(`${startDateStr}T12:00:00Z`);
      const stopDate = new Date(`${endDateStr}T12:00:00Z`);
      let daysLimit = 0;
      while (iterDate <= stopDate && daysLimit < 180) {
        const dStr = iterDate.toISOString().split('T')[0];
        dayKeys.push(dStr);
        timeseriesMap.set(dStr, {
          date: dStr,
          label: `${iterDate.getUTCDate()} ${iterDate.toLocaleString('ro', { month: 'short', timeZone: 'UTC' })}`,
          revenue: 0,
          orders: 0,
          prevRevenue: 0,
          prevOrders: 0,
        });
        iterDate.setUTCDate(iterDate.getUTCDate() + 1);
        daysLimit++;
      }

      successfulOrders.forEach((order: any) => {
        const orderAmt = convertToRon(Number(order.total_amount) || 0, (order.currency || 'RON').toUpperCase(), rates);
        const dateStr = new Date(order.created_at).toLocaleDateString('en-CA', { timeZone: 'Europe/Bucharest' });
        const existing = timeseriesMap.get(dateStr);
        if (existing) {
          existing.revenue = Number((existing.revenue + orderAmt).toFixed(2));
          existing.orders += 1;
        }
      });

      const prevStartMs = new Date(`${prevStart}T12:00:00Z`).getTime();
      prevSuccessfulOrders.forEach((order: any) => {
        const orderAmt = convertToRon(Number(order.total_amount) || 0, (order.currency || 'RON').toUpperCase(), rates);
        const pDateStr = new Date(order.created_at).toLocaleDateString('en-CA', { timeZone: 'Europe/Bucharest' });
        const offsetDays = Math.round((new Date(`${pDateStr}T12:00:00Z`).getTime() - prevStartMs) / 86400000);
        if (offsetDays >= 0 && offsetDays < dayKeys.length) {
          const target = timeseriesMap.get(dayKeys[offsetDays]);
          if (target) {
            target.prevRevenue = Number((target.prevRevenue + orderAmt).toFixed(2));
            target.prevOrders += 1;
          }
        }
      });

      timeseries = Array.from(timeseriesMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    }

    // Geographic drilldown (Countries / Cities by revenue)
    const isDateFiltered = !!(startDate || endDate);
    const geoOrders = isDateFiltered
      ? successfulOrders
      : allHistoricalSuccessful.length > 0
        ? allHistoricalSuccessful
        : successfulOrders;
    const geoMap = new Map<
      string,
      {
        country: string;
        flag: string;
        code: string;
        cities: Map<string, { revenue: number; orders: number; originalTotals: Record<string, number> }>;
      }
    >();

    geoOrders.forEach((order: any) => {
      const orderCurr = (order.currency || 'RON').toUpperCase();
      const orderAmtRaw = Number(order.total_amount) || 0;
      const orderAmt = convertToRon(orderAmtRaw, orderCurr, rates);
      const countryInfo = normalizeCountry(order.addr_country);
      const country = countryInfo.name;
      const city = normalizeCityName(order.addr_city);

      if (!geoMap.has(country)) {
        geoMap.set(country, {
          country,
          flag: countryInfo.flag,
          code: countryInfo.code,
          cities: new Map(),
        });
      }
      const countryEntry = geoMap.get(country)!;
      const cityMap = countryEntry.cities;
      if (!cityMap.has(city)) {
        cityMap.set(city, { revenue: 0, orders: 0, originalTotals: {} });
      }
      const locData = cityMap.get(city)!;
      locData.revenue = Number((locData.revenue + orderAmt).toFixed(2));
      locData.orders += 1;
      locData.originalTotals[orderCurr] = Number(((locData.originalTotals[orderCurr] || 0) + orderAmtRaw).toFixed(2));
    });

    const locations = Array.from(geoMap.values())
      .map((entry) => {
        const cityList = Array.from(entry.cities.values());
        const countryRevenue = Number(cityList.reduce((sum, c) => sum + c.revenue, 0).toFixed(2));
        const countryOrders = cityList.reduce((sum, c) => sum + c.orders, 0);
        const origTotals: Record<string, number> = {};
        cityList.forEach((c) => {
          Object.entries(c.originalTotals || {}).forEach(([cur, val]) => {
            origTotals[cur] = Number(((origTotals[cur] || 0) + val).toFixed(2));
          });
        });

        return {
          country: entry.country,
          flag: entry.flag,
          code: entry.code,
          revenue: countryRevenue,
          orders: countryOrders,
          originalTotals: origTotals,
          cities: Array.from(entry.cities.entries())
            .map(([name, stats]) => ({ name, ...stats }))
            .sort((a, b) => b.revenue - a.revenue),
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    // Top Products & Variants
    const productMap = new Map<string, { name: string; quantity: number; revenue: number; image?: string }>();
    successfulOrders.forEach((order: any) => {
      const items = parseOrderItems(order.items);
      items.forEach((item: any) => {
        const unpacked = unpackOrderItem(item, order.currency || 'RON', rates);
        unpacked.forEach((u) => {
          if (!productMap.has(u.name)) {
            productMap.set(u.name, { name: u.name, quantity: 0, revenue: 0, image: u.image });
          }
          const p = productMap.get(u.name)!;
          p.quantity += u.quantity;
          p.revenue = Number((p.revenue + u.revenue).toFixed(2));
          if (!p.image && u.image) p.image = u.image;
        });
      });
    });
    const topProducts = Array.from(productMap.values()).sort((a, b) => b.quantity - a.quantity);

    // Action Center operational backlog counts (across all active historical orders)
    const pendingFulfillmentCount = allHistoricalSuccessful.filter((o: any) => {
      const items = parseOrderItems(o.items);
      const digitalOnly = items.length > 0 && isDigitalOnlyCart(items);
      const alreadyDone = o.status === 'delivered' || o.status === 'shipped';
      return !digitalOnly && !o.tracking_number && !alreadyDone;
    }).length;

    const pendingProgramsCount = allHistoricalSuccessful.filter((o: any) => {
      const items = parseOrderItems(o.items);
      const hasDigital = hasAnyDigitalProgram(items) || o.carrier_metadata?.is_digital_only === true;
      if (!hasDigital) return false;
      return o.carrier_metadata?.program_delivery?.status !== 'delivered';
    }).length;

    return NextResponse.json({
      success: true,
      stats: {
        revenue: totalRevenue,
        prevRevenue,
        orders: totalOrders,
        prevOrders: prevOrdersCount,
        aov,
        prevAov: Number(prevAov.toFixed(2)),
        customers: totalCustomers,
        prevCustomers: prevUniqueCustomers,
        customerSegments,
        shippingBreakdown,
        granularity,
        deltas: {
          revenuePct: computeDeltaPct(totalRevenue, prevRevenue),
          ordersPct: computeDeltaPct(totalOrders, prevOrdersCount),
          aovPct: computeDeltaPct(aov, prevAov),
          customersPct: computeDeltaPct(totalCustomers, prevUniqueCustomers),
        },
        actionCenter: {
          pendingFulfillmentCount,
          pendingProgramsCount,
          abandonedCartsCount: abandonedCarts,
          abandonedCartsValue: potentialLostRevenue,
        },
        cardRevenue,
        cardCount: cardOrders.length,
        rambursRevenue,
        rambursCount: rambursOrders.length,
        abandonedCarts,
        potentialLostRevenue,
        returnsCount,
        returnsValue,
        returnRate,
        cancelledOrdersCount,
        failedOrdersCount,
        failedOrdersValue,
        timeseries,
        locations,
        topProducts,
        currencyBreakdown,
        exchangeRates: rates,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Eroare internă' }, { status: 500 });
  }
}
