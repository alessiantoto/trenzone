/**
 * Vercel Web Analytics & Speed Insights Official API Client
 * 
 * Provides direct programmatic access to Vercel's official Analytics API
 * when VERCEL_TOKEN and VERCEL_PROJECT_ID are configured in environment variables.
 * 
 * Docs: https://vercel.com/docs/analytics/web-analytics/web-analytics-api
 */

interface VercelAnalyticsOptions {
  from?: string; // ISO string or timestamp
  to?: string;   // ISO string or timestamp
  environment?: 'production' | 'preview';
}

export interface VercelAggregateItem {
  key: string;
  count: number;
}

export interface VercelWebAnalyticsData {
  isConfigured: boolean;
  totalPageviews?: number;
  totalVisitors?: number;
  topPages?: Array<{ path: string; count: number }>;
  referrers?: Array<{ name: string; count: number }>;
  countries?: Array<{ name: string; count: number }>;
  devices?: Array<{ name: string; count: number }>;
  browsers?: Array<{ name: string; count: number }>;
  operatingSystems?: Array<{ name: string; count: number }>;
  error?: string;
}

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

/**
 * Checks if Vercel Direct API query is available
 */
export function isVercelApiConfigured(): boolean {
  return !!(VERCEL_TOKEN && VERCEL_PROJECT_ID);
}

/**
 * Helper to call api.vercel.com
 */
async function queryVercelApi(path: string, params: Record<string, string>) {
  if (!VERCEL_TOKEN) throw new Error('VERCEL_TOKEN is not configured');

  const url = new URL(`https://api.vercel.com/v1/query/web-analytics/${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v) url.searchParams.set(k, v);
  });
  if (VERCEL_TEAM_ID) {
    url.searchParams.set('teamId', VERCEL_TEAM_ID);
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
    },
    next: { revalidate: 60 } // cache for 60s
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Vercel API error (${res.status}): ${errorText}`);
  }

  return res.json();
}

/**
 * Fetch official Vercel Web Analytics aggregated metrics directly from Vercel's Cloud
 */
export async function getVercelOfficialAnalytics(
  from?: string,
  to?: string
): Promise<VercelWebAnalyticsData> {
  if (!isVercelApiConfigured()) {
    return {
      isConfigured: false,
    };
  }

  try {
    const defaultFrom = from || new Date(Date.now() - 30 * 86400000).toISOString();
    const defaultTo = to || new Date().toISOString();

    const baseParams: Record<string, string> = {
      projectId: VERCEL_PROJECT_ID!,
      from: defaultFrom,
      to: defaultTo,
      environment: 'production',
    };

    // Parallel fetch for Vercel aggregate dimensions
    const [pageviewsRes, visitorsRes, pagesRes, referrersRes, countriesRes, devicesRes, browsersRes, osRes] = await Promise.allSettled([
      // 1. Total Pageviews count
      queryVercelApi('visits/count', { ...baseParams }),
      // 2. Total Visitors count (unique)
      queryVercelApi('visits/count', { ...baseParams, count: 'visitors' }),
      // 3. Top Pages
      queryVercelApi('visits/aggregate', { ...baseParams, groupBy: 'path', limit: '15' }),
      // 4. Referrers
      queryVercelApi('visits/aggregate', { ...baseParams, groupBy: 'referrer', limit: '15' }),
      // 5. Countries
      queryVercelApi('visits/aggregate', { ...baseParams, groupBy: 'country', limit: '15' }),
      // 6. Devices
      queryVercelApi('visits/aggregate', { ...baseParams, groupBy: 'device', limit: '10' }),
      // 7. Browsers
      queryVercelApi('visits/aggregate', { ...baseParams, groupBy: 'browser', limit: '10' }),
      // 8. OS
      queryVercelApi('visits/aggregate', { ...baseParams, groupBy: 'os', limit: '10' }),
    ]);

    const totalPageviews = pageviewsRes.status === 'fulfilled' ? Number(pageviewsRes.value?.value || pageviewsRes.value?.count || 0) : 0;
    const totalVisitors = visitorsRes.status === 'fulfilled' ? Number(visitorsRes.value?.value || visitorsRes.value?.count || 0) : 0;

    const extractRows = (res: PromiseSettledResult<any>): Array<{ name: string; count: number; [key: string]: any }> => {
      if (res.status !== 'fulfilled' || !res.value) return [];
      const data = res.value.data || res.value.rows || res.value;
      if (!Array.isArray(data)) return [];
      return data.map((item: any) => ({
        name: item.key || item.path || item.referrer || item.country || item.name || 'Necunoscut',
        count: Number(item.count || item.value || 0),
      })).filter(i => i.count > 0);
    };

    return {
      isConfigured: true,
      totalPageviews,
      totalVisitors,
      topPages: extractRows(pagesRes).map(p => ({ path: p.name, count: p.count })),
      referrers: extractRows(referrersRes),
      countries: extractRows(countriesRes),
      devices: extractRows(devicesRes),
      browsers: extractRows(browsersRes),
      operatingSystems: extractRows(osRes),
    };
  } catch (err: any) {
    console.error('⚠️ [Vercel API] Failed to fetch Vercel Web Analytics:', err);
    return {
      isConfigured: true,
      error: err.message,
    };
  }
}
