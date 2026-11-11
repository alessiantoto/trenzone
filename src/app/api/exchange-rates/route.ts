import { NextResponse } from 'next/server';
import { getExchangeRates } from '@/app/actions/admin-settings';

// Default rates (1 Foreign = X RON, or 1 RON -> X Foreign)
const DEFAULT_RATES: Record<string, number> = {
  EUR: 5.30,
  USD: 4.88,
  GBP: 6.20,
  PLN: 1.23,
  CHF: 5.60,
};

const ALLOWED_CURRENCIES = ['EUR', 'USD', 'GBP', 'PLN', 'CHF'];

/**
 * GET /api/exchange-rates
 * Returns the admin-managed exchange rates (RON base).
 * Cached for 5 minutes on the CDN edge; rates cannot be overridden from the client.
 */
export async function GET() {
  try {
    const dbRates = await getExchangeRates();
    const rawMerged = dbRates ? { ...DEFAULT_RATES, ...dbRates } : DEFAULT_RATES;
    
    // Filter strictly to allowed currencies
    const rates: Record<string, number> = {};
    for (const curr of ALLOWED_CURRENCIES) {
      if (rawMerged[curr] !== undefined) {
        rates[curr] = rawMerged[curr];
      }
    }

    return NextResponse.json(
      { rates, base: 'RON', updatedAt: new Date().toISOString() },
      {
        headers: {
          // Cache for 1 hour on Cloudflare/Edge + Browser so visitors don't trigger serverless functions
          'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
          'CDN-Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (err) {
    console.error('Failed to fetch exchange rates:', err);
    return NextResponse.json(
      { rates: DEFAULT_RATES, base: 'RON', fallback: true },
      { status: 200 }
    );
  }
}
