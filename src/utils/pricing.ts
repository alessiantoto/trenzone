/**
 * FALLBACK_RATES — used only when the /api/exchange-rates endpoint is unreachable.
 * These are 1 RON → X currency conversions.
 * The admin can override these via Admin > Setări > Cursuri de Schimb.
 */
export const FALLBACK_RATES: Record<string, number> = {
  EUR: 5.30, // 1 EUR = 5.30 RON
  USD: 4.88, // 1 USD = 4.88 RON
  GBP: 6.20, // 1 GBP = 6.20 RON
  PLN: 1.23, // 1 PLN = 1.23 RON
  CHF: 5.60, // 1 CHF = 5.60 RON
};

/**
 * Module-level cache for server-side exchange rates.
 * Avoids re-fetching on every request within the same server instance.
 */
let _cachedRates: Record<string, number> | null = null;
let _cachedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * SERVER-SIDE: Returns exchange rates from DB.
 * Falls back to FALLBACK_RATES if DB is unavailable.
 * Only call this from server actions / API routes — never from client components.
 */
export async function getServerExchangeRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (_cachedRates && now - _cachedAt < CACHE_TTL_MS) {
    return _cachedRates;
  }

  try {
    // Lazy-import to keep client bundle clean
    const { getExchangeRates } = await import('@/app/actions/admin-settings');
    const dbRates = await getExchangeRates();
    _cachedRates = dbRates ? { ...FALLBACK_RATES, ...dbRates } : FALLBACK_RATES;
    _cachedAt = now;
    return _cachedRates;
  } catch {
    return FALLBACK_RATES;
  }
}

export function getProductPrice(prices: any, currency: string): number {
  const targetCurrency = (currency || 'RON').toUpperCase();

  if (typeof prices === 'object' && prices !== null) {
    // 1. Try explicit currency from JSONB object
    if (prices[targetCurrency] !== undefined && prices[targetCurrency] !== null) {
      return Number(prices[targetCurrency]);
    }

    // 2. Fallback: convert from RON base using exchange rates
    const baseRon = Number(prices['RON'] || 0);
    return targetCurrency === 'RON' ? baseRon : convertFromRon(baseRon, targetCurrency);
  }

  // 3. Primitive number or numeric string — this is the base RON price from DB
  const baseRon = Number(prices || 0);
  if (targetCurrency === 'RON') return baseRon;
  return convertFromRon(baseRon, targetCurrency);
}

export function resolveForeignPerRon(currency: string, rawRate: number): number {
  const curr = currency.toUpperCase();
  if (curr === 'RON') return 1;
  // If rawRate is 5.30 (RON per EUR), 1 RON is 1 / 5.30 = 0.18868 EUR
  // If rawRate is 0.1887 (EUR per RON), return 0.1887
  const isRonPerUnit = rawRate > 1.05;
  return isRonPerUnit ? (1 / rawRate) : rawRate;
}

/**
 * SERVER-SIDE version of getProductPrice that uses DB-managed exchange rates.
 * Use in server actions (checkout, orders, etc.) for accurate conversion.
 */
export async function getServerProductPrice(prices: any, currency: string): Promise<number> {
  const targetCurrency = (currency || 'RON').toUpperCase();

  if (typeof prices === 'object' && prices !== null) {
    if (prices[targetCurrency] !== undefined && prices[targetCurrency] !== null) {
      return Number(prices[targetCurrency]);
    }
    const baseRon = Number(prices['RON'] || 0);
    if (targetCurrency === 'RON') return baseRon;

    const rates = await getServerExchangeRates();
    const rate = rates[targetCurrency] || FALLBACK_RATES[targetCurrency] || 1;
    const foreignPerRon = resolveForeignPerRon(targetCurrency, rate);
    return Number((baseRon * foreignPerRon).toFixed(2));
  }

  const baseRon = Number(prices || 0);
  if (targetCurrency === 'RON') return baseRon;

  const rates = await getServerExchangeRates();
  const rate = rates[targetCurrency] || FALLBACK_RATES[targetCurrency] || 1;
  const foreignPerRon = resolveForeignPerRon(targetCurrency, rate);
  return Number((baseRon * foreignPerRon).toFixed(2));
}

let _clientRatesGetter: (() => Record<string, number> | undefined) | null = null;

export function setClientRatesGetter(getter: () => Record<string, number> | undefined) {
  _clientRatesGetter = getter;
}

/**
 * 🚢 CURRENCY CONVERSION: FROM RON BASE
 * All base rates are defined in RON and converted using live/fallback rates.
 */
export function convertFromRon(amountRon: number, targetCurrency: string, customRates?: Record<string, number>): number {
  const currencyKey = (targetCurrency || 'RON').toUpperCase();
  if (currencyKey === 'RON') return amountRon;

  let rate = customRates?.[currencyKey];
  if (!rate && _cachedRates?.[currencyKey]) {
    rate = _cachedRates[currencyKey];
  }
  if (!rate && _clientRatesGetter) {
    try {
      const liveRates = _clientRatesGetter();
      if (liveRates && liveRates[currencyKey]) {
        rate = liveRates[currencyKey];
      }
    } catch {
      // fallback
    }
  }

  if (!rate) {
    rate = FALLBACK_RATES[currencyKey] || 1;
  }

  const foreignPerRon = resolveForeignPerRon(currencyKey, rate);
  return Number((amountRon * foreignPerRon).toFixed(2));
}

/**
 * 🚢 CURRENCY CONVERSION: TO RON BASE
 * Converts an amount from a foreign currency (EUR, USD, GBP, PLN, CHF) back to RON.
 */
export function convertToRon(amount: number, sourceCurrency?: string | null, customRates?: Record<string, number>): number {
  const currencyKey = (sourceCurrency || 'RON').toUpperCase().trim();
  if (currencyKey === 'RON' || !amount) return Number(amount) || 0;

  let rate = customRates?.[currencyKey];
  if (!rate && _cachedRates?.[currencyKey]) {
    rate = _cachedRates[currencyKey];
  }
  if (!rate && _clientRatesGetter) {
    try {
      const liveRates = _clientRatesGetter();
      if (liveRates && liveRates[currencyKey]) {
        rate = liveRates[currencyKey];
      }
    } catch {
      // fallback
    }
  }
  if (!rate) {
    rate = FALLBACK_RATES[currencyKey] || 1;
  }

  // If rate is RON per 1 unit of foreign currency (e.g. 5.30 RON per EUR), multiply by rate.
  // If rate was stored inverted (< 1.05 for EUR/USD/GBP/PLN/CHF), divide by rate.
  const ronPerUnit = rate > 1.05 ? rate : (rate > 0 ? 1 / rate : 1);
  return Number((Number(amount) * ronPerUnit).toFixed(2));
}
