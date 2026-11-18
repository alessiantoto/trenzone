import { NextResponse } from 'next/server';
import { getExchangeRates } from '@/app/actions/admin-settings';

// Default rates (1 Foreign = X RON, or 1 RON -> X Foreign)
const DEFAULT_RATES: Record<string, number> = {
  EUR: 5.30,
  USD: 4.88,
  GBP: 6.20,
};

const ALLOWED_CURRENCIES = ['EUR', 'USD', 'GBP'];

// Statically pre-render for 30 days on Vercel Edge (purged instantly on Admin settings update or Clear Cache)
export const revalidate = 2592000;

/**
 * GET /api/exchange-rates
 * Returns the admin-managed exchange rates (RON base).
 * Cached for 30 days on the CDN edge; rates cannot be overridden from the client.
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
          // Cache for 30 days on Cloudflare/Edge + 1h in browser so visitors don't trigger serverless functions
          'Cache-Control': 'public, max-age=3600, s-maxage=2592000, stale-while-revalidate=2592000',
          'CDN-Cache-Control': 'public, s-maxage=2592000, stale-while-revalidate=2592000',
        },
      }
    );
  } catch (err) {
    console.error('Failed to fetch exchange rates:', err);
    return NextResponse.json(
      { rates: DEFAULT_RATES, base: 'RON', fallback: true },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=300, s-maxage=300',
        },
      }
    );
  }
}
