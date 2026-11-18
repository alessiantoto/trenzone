import { google, analyticsdata_v1beta } from 'googleapis';

export type AnalyticsRangeKey = 'today' | 'yesterday' | '7d' | '30d' | '90d';
export type Ga4DeviceFilter = 'all' | 'mobile' | 'desktop' | 'tablet';
export type Ga4GranularityOption = 'auto' | 'hourly' | 'daily';

export interface Ga4QueryFilters {
  range?: AnalyticsRangeKey;
  device?: Ga4DeviceFilter;
  channel?: string;
  country?: string;
  granularity?: Ga4GranularityOption;
}

export interface Ga4ConfigStatus {
  configured: boolean;
  missingKeys: string[];
  propertyId: string | null;
}

export interface Ga4RealtimeData {
  activeUsers: number;
  screenPageViews: number;
  deviceBreakdown: Array<{ device: string; activeUsers: number; screenPageViews: number }>;
  topPages: Array<{ title: string; activeUsers: number; screenPageViews: number }>;
  topCountries: Array<{ country: string; activeUsers: number; screenPageViews: number }>;
}

export interface Ga4OverviewMetrics {
  sessions: number;
  engagedSessions: number;
  engagementRatePct: number;
  totalUsers: number;
  newUsers: number;
  returningUsers: number;
  pageviews: number;
  bounceRatePct: number;
  avgSessionDurationSec: number;
  pagesPerSession: number;
  ecommercePurchases: number;
  deltas: {
    sessionsPct: number | null;
    engagedSessionsPct: number | null;
    usersPct: number | null;
    newUsersPct: number | null;
    pageviewsPct: number | null;
    bounceRatePct: number | null;
    avgSessionDurationPct: number | null;
    ecommercePurchasesPct: number | null;
  };
}

export interface Ga4TimeseriesPoint {
  key: string;
  label: string;
  sessions: number;
  engagedSessions: number;
  users: number;
  pageviews: number;
  prevSessions: number;
  prevEngagedSessions: number;
  prevUsers: number;
  prevPageviews: number;
}

export interface Ga4HourlyProfilePoint {
  hour: number;
  label: string;
  sessions: number;
  users: number;
  engagedSessions: number;
  isPeak: boolean;
}

export interface Ga4ChannelItem {
  channelGroup: string;
  sessions: number;
  engagedSessions: number;
  engagementRatePct: number;
  purchases: number;
  sharePct: number;
}

export interface Ga4TrafficSourceItem {
  sourceMedium: string;
  channelGroup: string;
  sessions: number;
  engagedSessions: number;
  users: number;
  engagementRatePct: number;
  purchases: number;
  sharePct: number;
}

export interface Ga4CampaignItem {
  campaign: string;
  sourceMedium: string;
  sessions: number;
  users: number;
  engagementRatePct: number;
}

export interface Ga4PageItem {
  path: string;
  title: string;
  views: number;
  users: number;
  avgDurationSec: number;
  bounceRatePct: number;
}

export interface Ga4LandingPageItem {
  path: string;
  sessions: number;
  engagedSessions: number;
  bounceRatePct: number;
  avgDurationSec: number;
}

export interface Ga4EventItem {
  eventName: string;
  eventCount: number;
  totalUsers: number;
  userPct: number;
}

export interface Ga4NewVsReturningItem {
  segment: 'new' | 'returning' | 'unknown';
  label: string;
  sessions: number;
  users: number;
  engagementRatePct: number;
  avgDurationSec: number;
  sharePct: number;
}

export interface Ga4ViewedItem {
  itemName: string;
  itemsViewed: number;
  itemsAddedToCart: number;
  itemsPurchased: number;
}

export interface Ga4BreakdownItem {
  name: string;
  sessions: number;
  users: number;
  percentage: number;
}

export interface Ga4GeoBreakdownItem extends Ga4BreakdownItem {
  engagementRatePct: number;
}

export interface Ga4CityBreakdownItem extends Ga4BreakdownItem {
  country: string;
  engagementRatePct: number;
}

export interface Ga4AnalyticsReport {
  configured: boolean;
  missingKeys: string[];
  error: string | null;
  range: AnalyticsRangeKey;
  granularity: 'hourly' | 'daily';
  filters: {
    device: Ga4DeviceFilter;
    channel: string;
    country: string;
    granularity: Ga4GranularityOption;
  };
  startDate: string;
  endDate: string;
  prevStartDate: string;
  prevEndDate: string;
  realtime: Ga4RealtimeData | null;
  overview: Ga4OverviewMetrics | null;
  timeseries: Ga4TimeseriesPoint[];
  hourlyProfile: Ga4HourlyProfilePoint[];
  events: {
    viewItem: number;
    addToCart: number;
    beginCheckout: number;
    purchase: number;
  } | null;
  allEvents: Ga4EventItem[];
  channels: Ga4ChannelItem[];
  sources: Ga4TrafficSourceItem[];
  campaigns: Ga4CampaignItem[];
  topPages: Ga4PageItem[];
  landingPages: Ga4LandingPageItem[];
  newVsReturning: Ga4NewVsReturningItem[];
  viewedItems: Ga4ViewedItem[];
  devices: Ga4BreakdownItem[];
  operatingSystems: Ga4BreakdownItem[];
  browsers: Ga4BreakdownItem[];
  languages: Ga4BreakdownItem[];
  screenResolutions: Ga4BreakdownItem[];
  countries: Ga4GeoBreakdownItem[];
  cities: Ga4CityBreakdownItem[];
}

function getGa4Credentials() {
  const propertyId = (process.env.GA4_PROPERTY_ID || '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/^properties\//, '');
  const clientEmail = (process.env.GA4_CLIENT_EMAIL || '').trim().replace(/^["']|["']$/g, '');
  const privateKey = (process.env.GA4_PRIVATE_KEY || '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\\n/g, '\n');

  const missingKeys: string[] = [];
  if (!propertyId) missingKeys.push('GA4_PROPERTY_ID');
  if (!clientEmail) missingKeys.push('GA4_CLIENT_EMAIL');
  if (!privateKey) missingKeys.push('GA4_PRIVATE_KEY');

  return {
    configured: missingKeys.length === 0,
    missingKeys,
    propertyId,
    clientEmail,
    privateKey,
  };
}

export function getGa4ConfigStatus(): Ga4ConfigStatus {
  const creds = getGa4Credentials();
  return {
    configured: creds.configured,
    missingKeys: creds.missingKeys,
    propertyId: creds.propertyId || null,
  };
}

export function isGa4Configured(): boolean {
  return getGa4Credentials().configured;
}

function getBucharestDateStr(offsetDays = 0): string {
  const now = new Date();
  const bucharestTodayStr = now.toLocaleDateString('en-CA', { timeZone: 'Europe/Bucharest' });
  const base = new Date(`${bucharestTodayStr}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + offsetDays);
  return base.toISOString().split('T')[0];
}

export function resolveAnalyticsDateRange(
  range: AnalyticsRangeKey,
  granularityOpt: Ga4GranularityOption = 'auto'
): {
  range: AnalyticsRangeKey;
  startDate: string;
  endDate: string;
  prevStartDate: string;
  prevEndDate: string;
  granularity: 'hourly' | 'daily';
} {
  const today = getBucharestDateStr(0);
  const yesterday = getBucharestDateStr(-1);

  let startDate = today;
  let endDate = today;
  let spanDays = 1;

  switch (range) {
    case 'today':
      startDate = today;
      endDate = today;
      spanDays = 1;
      break;
    case 'yesterday':
      startDate = yesterday;
      endDate = yesterday;
      spanDays = 1;
      break;
    case '7d':
      startDate = getBucharestDateStr(-6);
      endDate = today;
      spanDays = 7;
      break;
    case '90d':
      startDate = getBucharestDateStr(-89);
      endDate = today;
      spanDays = 90;
      break;
    case '30d':
    default:
      startDate = getBucharestDateStr(-29);
      endDate = today;
      spanDays = 30;
      break;
  }

  const startObj = new Date(`${startDate}T12:00:00Z`);
  const prevEndObj = new Date(startObj.getTime() - 86400000);
  const prevStartObj = new Date(prevEndObj.getTime() - (spanDays - 1) * 86400000);

  const resolvedGranularity: 'hourly' | 'daily' =
    granularityOpt === 'hourly'
      ? 'hourly'
      : granularityOpt === 'daily'
        ? 'daily'
        : spanDays === 1
          ? 'hourly'
          : 'daily';

  return {
    range,
    startDate,
    endDate,
    prevStartDate: prevStartObj.toISOString().split('T')[0],
    prevEndDate: prevEndObj.toISOString().split('T')[0],
    granularity: resolvedGranularity,
  };
}

function computeDelta(current: number, previous: number): number | null {
  if (previous <= 0 && current <= 0) return null;
  if (previous <= 0 && current > 0) return 100;
  return Math.round(((current - previous) / previous) * 100);
}

function numMetric(row: analyticsdata_v1beta.Schema$Row | undefined, index: number): number {
  const raw = row?.metricValues?.[index]?.value;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function dimVal(row: analyticsdata_v1beta.Schema$Row | undefined, index: number): string {
  return String(row?.dimensionValues?.[index]?.value ?? '');
}

function normalizeLabelName(raw: string, fallback = 'Necunoscut'): string {
  const val = raw.trim();
  if (!val || val === '(not set)' || val === '(none)') return fallback;
  return val;
}

function aggregateBreakdown(
  map: Map<string, { sessions: number; users: number }>,
  limit = 12
): Ga4BreakdownItem[] {
  const entries = Array.from(map.entries())
    .map(([name, vals]) => ({ name, sessions: vals.sessions, users: vals.users }))
    .filter((i) => i.sessions > 0 || i.users > 0)
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, limit);

  const totalSessions = entries.reduce((sum, e) => sum + e.sessions, 0) || 1;
  return entries.map((e) => ({
    ...e,
    percentage: Math.round((e.sessions / totalSessions) * 100),
  }));
}

function formatGaDateToIso(yyyymmdd: string): string {
  if (!/^\d{8}$/.test(yyyymmdd)) return yyyymmdd;
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

function formatIsoDayLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return `${d.getUTCDate()} ${d.toLocaleString('ro', { month: 'short', timeZone: 'UTC' })}`;
}

function buildGa4DimensionFilter(filters: {
  device: Ga4DeviceFilter;
  channel: string;
  country: string;
}): analyticsdata_v1beta.Schema$FilterExpression | undefined {
  const expressions: analyticsdata_v1beta.Schema$FilterExpression[] = [];

  if (filters.device && filters.device !== 'all') {
    expressions.push({
      filter: {
        fieldName: 'deviceCategory',
        stringFilter: { matchType: 'EXACT', value: filters.device },
      },
    });
  }

  if (filters.channel && filters.channel !== 'all') {
    expressions.push({
      filter: {
        fieldName: 'sessionDefaultChannelGroup',
        stringFilter: { matchType: 'EXACT', value: filters.channel },
      },
    });
  }

  if (filters.country && filters.country !== 'all') {
    expressions.push({
      filter: {
        fieldName: 'country',
        stringFilter: { matchType: 'EXACT', value: filters.country },
      },
    });
  }

  if (expressions.length === 0) return undefined;
  if (expressions.length === 1) return expressions[0];
  return { andGroup: { expressions } };
}

function normalizeQueryFilters(
  rangeOrFilters: AnalyticsRangeKey | Ga4QueryFilters
): {
  range: AnalyticsRangeKey;
  device: Ga4DeviceFilter;
  channel: string;
  country: string;
  granularity: Ga4GranularityOption;
} {
  if (typeof rangeOrFilters === 'string') {
    return {
      range: rangeOrFilters,
      device: 'all',
      channel: 'all',
      country: 'all',
      granularity: 'auto',
    };
  }
  const deviceRaw = rangeOrFilters.device || 'all';
  const device: Ga4DeviceFilter =
    deviceRaw === 'mobile' || deviceRaw === 'desktop' || deviceRaw === 'tablet' ? deviceRaw : 'all';
  const granRaw = rangeOrFilters.granularity || 'auto';
  const granularity: Ga4GranularityOption =
    granRaw === 'hourly' || granRaw === 'daily' ? granRaw : 'auto';

  return {
    range: rangeOrFilters.range || '30d',
    device,
    channel: (rangeOrFilters.channel || 'all').trim() || 'all',
    country: (rangeOrFilters.country || 'all').trim() || 'all',
    granularity,
  };
}

export async function fetchGa4AnalyticsReport(
  rangeOrFilters: AnalyticsRangeKey | Ga4QueryFilters = '30d'
): Promise<Ga4AnalyticsReport> {
  const creds = getGa4Credentials();
  const normalizedFilters = normalizeQueryFilters(rangeOrFilters);
  const dates = resolveAnalyticsDateRange(normalizedFilters.range, normalizedFilters.granularity);

  const emptyBase: Ga4AnalyticsReport = {
    configured: creds.configured,
    missingKeys: creds.missingKeys,
    error: null,
    range: dates.range,
    granularity: dates.granularity,
    filters: {
      device: normalizedFilters.device,
      channel: normalizedFilters.channel,
      country: normalizedFilters.country,
      granularity: normalizedFilters.granularity,
    },
    startDate: dates.startDate,
    endDate: dates.endDate,
    prevStartDate: dates.prevStartDate,
    prevEndDate: dates.prevEndDate,
    realtime: null,
    overview: null,
    timeseries: [],
    hourlyProfile: [],
    events: null,
    allEvents: [],
    channels: [],
    sources: [],
    campaigns: [],
    topPages: [],
    landingPages: [],
    newVsReturning: [],
    viewedItems: [],
    devices: [],
    operatingSystems: [],
    browsers: [],
    languages: [],
    screenResolutions: [],
    countries: [],
    cities: [],
  };

  if (!creds.configured) {
    return emptyBase;
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: creds.clientEmail,
        private_key: creds.privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
    });

    const analyticsData = google.analyticsdata({ version: 'v1beta', auth });
    const property = `properties/${creds.propertyId}`;
    const isHourly = dates.granularity === 'hourly';

    const currentDateRange = [{ name: 'current', startDate: dates.startDate, endDate: dates.endDate }];
    const dimensionFilter = buildGa4DimensionFilter({
      device: normalizedFilters.device,
      channel: normalizedFilters.channel,
      country: normalizedFilters.country,
    });

    const withFilter = (
      req: analyticsdata_v1beta.Schema$RunReportRequest
    ): analyticsdata_v1beta.Schema$RunReportRequest =>
      dimensionFilter ? { ...req, dimensionFilter } : req;

    const runWithQuotaRetry = async <T>(fn: () => Promise<T>, retries = 1): Promise<T> => {
      try {
        return await fn();
      } catch (err: any) {
        const msg = String(err?.message || '').toLowerCase();
        if (retries > 0 && (msg.includes('concurrent') || msg.includes('quota') || err?.code === 429)) {
          await new Promise((r) => setTimeout(r, 500));
          return runWithQuotaRetry(fn, retries - 1);
        }
        throw err;
      }
    };

    // Wave 1 (max 6 concurrent report executions to respect GA4 10-concurrent-request property quota)
    const [realtimePagesSettled, realtimeGeoDevSettled, batch1Settled] = await Promise.allSettled([
      runWithQuotaRetry(() =>
        analyticsData.properties.runRealtimeReport({
          property,
          requestBody: {
            dimensions: [{ name: 'unifiedScreenName' }],
            metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
            limit: '10',
          },
        })
      ),
      runWithQuotaRetry(() =>
        analyticsData.properties.runRealtimeReport({
          property,
          requestBody: {
            dimensions: [{ name: 'country' }, { name: 'deviceCategory' }],
            metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
            limit: '25',
          },
        })
      ),
      // Batch 1 (4 requests): Overview, TS Current+Previous, Hourly Profile, All Events
      runWithQuotaRetry(() =>
        analyticsData.properties.batchRunReports({
          property,
          requestBody: {
            requests: [
              withFilter({
                dateRanges: [
                  { name: 'current', startDate: dates.startDate, endDate: dates.endDate },
                  { name: 'previous', startDate: dates.prevStartDate, endDate: dates.prevEndDate },
                ],
                metrics: [
                  { name: 'sessions' },
                  { name: 'engagedSessions' },
                  { name: 'engagementRate' },
                  { name: 'totalUsers' },
                  { name: 'newUsers' },
                  { name: 'screenPageViews' },
                  { name: 'bounceRate' },
                  { name: 'averageSessionDuration' },
                  { name: 'screenPageViewsPerSession' },
                  { name: 'ecommercePurchases' },
                ],
              }),
              withFilter({
                dateRanges: [
                  { name: 'current', startDate: dates.startDate, endDate: dates.endDate },
                  { name: 'previous', startDate: dates.prevStartDate, endDate: dates.prevEndDate },
                ],
                dimensions: [{ name: isHourly ? 'hour' : 'date' }],
                metrics: [
                  { name: 'sessions' },
                  { name: 'engagedSessions' },
                  { name: 'totalUsers' },
                  { name: 'screenPageViews' },
                ],
                orderBys: [{ dimension: { dimensionName: isHourly ? 'hour' : 'date' } }],
              }),
              withFilter({
                dateRanges: currentDateRange,
                dimensions: [{ name: 'hour' }],
                metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'engagedSessions' }],
                orderBys: [{ dimension: { dimensionName: 'hour' } }],
              }),
              withFilter({
                dateRanges: currentDateRange,
                dimensions: [{ name: 'eventName' }],
                metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }],
                orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
                limit: '35',
              }),
            ],
          },
        })
      ),
    ]);

    if (batch1Settled.status === 'rejected') {
      throw batch1Settled.reason;
    }

    // Wave 2 (5 reports): Channels, Sources, Campaigns, Top Pages, Landing Pages
    // Wave 3 (5 + 2 = 7 reports) runs sequentially after Wave 2 to keep concurrent quota < 8
    const [batch2Settled] = await Promise.allSettled([
      runWithQuotaRetry(() =>
        analyticsData.properties.batchRunReports({
          property,
          requestBody: {
            requests: [
              withFilter({
                dateRanges: currentDateRange,
                dimensions: [{ name: 'sessionDefaultChannelGroup' }],
                metrics: [
                  { name: 'sessions' },
                  { name: 'engagedSessions' },
                  { name: 'engagementRate' },
                  { name: 'ecommercePurchases' },
                ],
                orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
                limit: '15',
              }),
              withFilter({
                dateRanges: currentDateRange,
                dimensions: [{ name: 'sessionSourceMedium' }, { name: 'sessionDefaultChannelGroup' }],
                metrics: [
                  { name: 'sessions' },
                  { name: 'totalUsers' },
                  { name: 'engagedSessions' },
                  { name: 'engagementRate' },
                  { name: 'ecommercePurchases' },
                ],
                orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
                limit: '25',
              }),
              withFilter({
                dateRanges: currentDateRange,
                dimensions: [{ name: 'sessionCampaignName' }, { name: 'sessionSourceMedium' }],
                metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'engagementRate' }],
                orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
                limit: '20',
              }),
              withFilter({
                dateRanges: currentDateRange,
                dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
                metrics: [
                  { name: 'screenPageViews' },
                  { name: 'totalUsers' },
                  { name: 'averageSessionDuration' },
                  { name: 'bounceRate' },
                ],
                orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
                limit: '30',
              }),
              withFilter({
                dateRanges: currentDateRange,
                dimensions: [{ name: 'landingPagePlusQueryString' }],
                metrics: [
                  { name: 'sessions' },
                  { name: 'engagedSessions' },
                  { name: 'bounceRate' },
                  { name: 'averageSessionDuration' },
                ],
                orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
                limit: '25',
              }),
            ],
          },
        })
      ),
    ]);

    const [batch3Settled, batch4Settled] = await Promise.allSettled([
      // Batch 3 (5 requests): Viewed Items, Devices & OS, Browsers, Geo (Country & City), New vs Returning
      runWithQuotaRetry(() =>
        analyticsData.properties.batchRunReports({
          property,
          requestBody: {
            requests: [
              withFilter({
                dateRanges: currentDateRange,
                dimensions: [{ name: 'itemName' }],
                metrics: [{ name: 'itemsViewed' }, { name: 'itemsAddedToCart' }, { name: 'itemsPurchased' }],
                orderBys: [{ metric: { metricName: 'itemsViewed' }, desc: true }],
                limit: '25',
              }),
              withFilter({
                dateRanges: currentDateRange,
                dimensions: [{ name: 'deviceCategory' }, { name: 'operatingSystem' }],
                metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
                orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
                limit: '30',
              }),
              withFilter({
                dateRanges: currentDateRange,
                dimensions: [{ name: 'browser' }],
                metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
                orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
                limit: '15',
              }),
              withFilter({
                dateRanges: currentDateRange,
                dimensions: [{ name: 'country' }, { name: 'city' }],
                metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'engagementRate' }],
                orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
                limit: '50',
              }),
              withFilter({
                dateRanges: currentDateRange,
                dimensions: [{ name: 'newVsReturning' }],
                metrics: [
                  { name: 'sessions' },
                  { name: 'totalUsers' },
                  { name: 'engagementRate' },
                  { name: 'averageSessionDuration' },
                ],
              }),
            ],
          },
        })
      ),
      // Batch 4 (2 requests): Languages, Screen Resolutions
      runWithQuotaRetry(() =>
        analyticsData.properties.batchRunReports({
          property,
          requestBody: {
            requests: [
              withFilter({
                dateRanges: currentDateRange,
                dimensions: [{ name: 'language' }],
                metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
                orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
                limit: '15',
              }),
              withFilter({
                dateRanges: currentDateRange,
                dimensions: [{ name: 'screenResolution' }],
                metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
                orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
                limit: '15',
              }),
            ],
          },
        })
      ),
    ]);

    // 1. Realtime
    const rtPageRows =
      realtimePagesSettled.status === 'fulfilled' ? realtimePagesSettled.value.data.rows || [] : [];
    const rtGeoDevRows =
      realtimeGeoDevSettled.status === 'fulfilled' ? realtimeGeoDevSettled.value.data.rows || [] : [];

    const rtCountryMap = new Map<string, { activeUsers: number; screenPageViews: number }>();
    const rtDeviceMap = new Map<string, { activeUsers: number; screenPageViews: number }>();
    rtGeoDevRows.forEach((r) => {
      const country = normalizeLabelName(dimVal(r, 0), 'Necunoscut');
      const rawDev = normalizeLabelName(dimVal(r, 1), 'Other');
      const device = rawDev.charAt(0).toUpperCase() + rawDev.slice(1).toLowerCase();
      const users = Math.round(numMetric(r, 0));
      const views = Math.round(numMetric(r, 1));

      const cCur = rtCountryMap.get(country) || { activeUsers: 0, screenPageViews: 0 };
      rtCountryMap.set(country, {
        activeUsers: cCur.activeUsers + users,
        screenPageViews: cCur.screenPageViews + views,
      });

      const dCur = rtDeviceMap.get(device) || { activeUsers: 0, screenPageViews: 0 };
      rtDeviceMap.set(device, {
        activeUsers: dCur.activeUsers + users,
        screenPageViews: dCur.screenPageViews + views,
      });
    });

    const rtActiveFromPages = rtPageRows.reduce((sum, r) => sum + numMetric(r, 0), 0);
    const rtActiveFromGeoDev = rtGeoDevRows.reduce((sum, r) => sum + numMetric(r, 0), 0);

    const rtViewsFromPages = rtPageRows.reduce((sum, r) => sum + numMetric(r, 1), 0);
    const rtViewsFromGeoDev = rtGeoDevRows.reduce((sum, r) => sum + numMetric(r, 1), 0);

    const realtime: Ga4RealtimeData = {
      activeUsers: Math.round(Math.max(rtActiveFromPages, rtActiveFromGeoDev)),
      screenPageViews: Math.round(Math.max(rtViewsFromPages, rtViewsFromGeoDev)),
      deviceBreakdown: Array.from(rtDeviceMap.entries())
        .map(([device, vals]) => ({
          device,
          activeUsers: vals.activeUsers,
          screenPageViews: vals.screenPageViews,
        }))
        .filter((d) => d.activeUsers > 0 || d.screenPageViews > 0)
        .sort((a, b) => b.activeUsers - a.activeUsers),
      topPages: rtPageRows
        .map((r) => ({
          title: normalizeLabelName(dimVal(r, 0), '/'),
          activeUsers: Math.round(numMetric(r, 0)),
          screenPageViews: Math.round(numMetric(r, 1)),
        }))
        .filter((r) => r.activeUsers > 0)
        .slice(0, 6),
      topCountries: Array.from(rtCountryMap.entries())
        .map(([country, vals]) => ({
          country,
          activeUsers: vals.activeUsers,
          screenPageViews: vals.screenPageViews,
        }))
        .filter((r) => r.activeUsers > 0)
        .sort((a, b) => b.activeUsers - a.activeUsers)
        .slice(0, 6),
    };

    const batch1Reports = batch1Settled.value.data.reports || [];
    const batch2Reports = batch2Settled.status === 'fulfilled' ? batch2Settled.value.data.reports || [] : [];
    const batch3Reports = batch3Settled.status === 'fulfilled' ? batch3Settled.value.data.reports || [] : [];
    const batch4Reports = batch4Settled.status === 'fulfilled' ? batch4Settled.value.data.reports || [] : [];

    // 2. Overview
    const overviewRows = batch1Reports[0]?.rows || [];
    const curRow =
      overviewRows.find((r) => dimVal(r, 0) === 'current' || dimVal(r, 0) === 'date_range_0') ||
      overviewRows[0];
    const prevRow =
      overviewRows.find((r) => dimVal(r, 0) === 'previous' || dimVal(r, 0) === 'date_range_1') ||
      overviewRows[1];

    const curSessions = Math.round(numMetric(curRow, 0));
    const curEngagedSessions = Math.round(numMetric(curRow, 1));
    const curEngagementRatePct = Number((numMetric(curRow, 2) * 100).toFixed(1));
    const curUsers = Math.round(numMetric(curRow, 3));
    const curNewUsers = Math.round(numMetric(curRow, 4));
    const curPageviews = Math.round(numMetric(curRow, 5));
    const curBouncePct = Number((numMetric(curRow, 6) * 100).toFixed(1));
    const curAvgDur = Math.round(numMetric(curRow, 7));
    const curPagesPerSession = Number(numMetric(curRow, 8).toFixed(2));
    const curPurchases = Math.round(numMetric(curRow, 9));

    const prevSessions = Math.round(numMetric(prevRow, 0));
    const prevEngagedSessions = Math.round(numMetric(prevRow, 1));
    const prevUsers = Math.round(numMetric(prevRow, 3));
    const prevNewUsers = Math.round(numMetric(prevRow, 4));
    const prevPageviews = Math.round(numMetric(prevRow, 5));
    const prevBouncePct = Number((numMetric(prevRow, 6) * 100).toFixed(1));
    const prevAvgDur = Math.round(numMetric(prevRow, 7));
    const prevPurchases = Math.round(numMetric(prevRow, 9));

    const overview: Ga4OverviewMetrics = {
      sessions: curSessions,
      engagedSessions: curEngagedSessions,
      engagementRatePct: curEngagementRatePct,
      totalUsers: curUsers,
      newUsers: Math.min(curUsers, curNewUsers),
      returningUsers: Math.max(0, curUsers - curNewUsers),
      pageviews: curPageviews,
      bounceRatePct: curBouncePct,
      avgSessionDurationSec: curAvgDur,
      pagesPerSession: curPagesPerSession,
      ecommercePurchases: curPurchases,
      deltas: {
        sessionsPct: computeDelta(curSessions, prevSessions),
        engagedSessionsPct: computeDelta(curEngagedSessions, prevEngagedSessions),
        usersPct: computeDelta(curUsers, prevUsers),
        newUsersPct: computeDelta(curNewUsers, prevNewUsers),
        pageviewsPct: computeDelta(curPageviews, prevPageviews),
        bounceRatePct: computeDelta(curBouncePct, prevBouncePct),
        avgSessionDurationPct: computeDelta(curAvgDur, prevAvgDur),
        ecommercePurchasesPct: computeDelta(curPurchases, prevPurchases),
      },
    };

    // 3. Timeseries (combined current + previous dateRanges; dateRange is dimensionValues[1])
    const tsAllRows = batch1Reports[1]?.rows || [];
    const tsCurRows = tsAllRows.filter((r) => {
      const dr = dimVal(r, 1);
      return !dr || dr === 'current' || dr === 'date_range_0';
    });
    const tsPrevRows = tsAllRows.filter((r) => {
      const dr = dimVal(r, 1);
      return dr === 'previous' || dr === 'date_range_1';
    });
    let timeseries: Ga4TimeseriesPoint[] = [];

    if (isHourly) {
      const buckets: Ga4TimeseriesPoint[] = Array.from({ length: 24 }, (_, h) => {
        const hh = String(h).padStart(2, '0');
        return {
          key: hh,
          label: `${hh}:00`,
          sessions: 0,
          engagedSessions: 0,
          users: 0,
          pageviews: 0,
          prevSessions: 0,
          prevEngagedSessions: 0,
          prevUsers: 0,
          prevPageviews: 0,
        };
      });

      tsCurRows.forEach((r) => {
        const h = parseInt(dimVal(r, 0).slice(-2), 10);
        if (Number.isFinite(h) && h >= 0 && h < 24) {
          buckets[h].sessions += Math.round(numMetric(r, 0));
          buckets[h].engagedSessions += Math.round(numMetric(r, 1));
          buckets[h].users += Math.round(numMetric(r, 2));
          buckets[h].pageviews += Math.round(numMetric(r, 3));
        }
      });

      tsPrevRows.forEach((r) => {
        const h = parseInt(dimVal(r, 0).slice(-2), 10);
        if (Number.isFinite(h) && h >= 0 && h < 24) {
          buckets[h].prevSessions += Math.round(numMetric(r, 0));
          buckets[h].prevEngagedSessions += Math.round(numMetric(r, 1));
          buckets[h].prevUsers += Math.round(numMetric(r, 2));
          buckets[h].prevPageviews += Math.round(numMetric(r, 3));
        }
      });

      timeseries = buckets;
    } else {
      const tsMap = new Map<string, Ga4TimeseriesPoint>();
      const dayKeys: string[] = [];
      const iter = new Date(`${dates.startDate}T12:00:00Z`);
      const stop = new Date(`${dates.endDate}T12:00:00Z`);
      let guard = 0;
      while (iter <= stop && guard < 120) {
        const iso = iter.toISOString().split('T')[0];
        dayKeys.push(iso);
        tsMap.set(iso, {
          key: iso,
          label: formatIsoDayLabel(iso),
          sessions: 0,
          engagedSessions: 0,
          users: 0,
          pageviews: 0,
          prevSessions: 0,
          prevEngagedSessions: 0,
          prevUsers: 0,
          prevPageviews: 0,
        });
        iter.setUTCDate(iter.getUTCDate() + 1);
        guard++;
      }

      tsCurRows.forEach((r) => {
        const iso = formatGaDateToIso(dimVal(r, 0));
        const target = tsMap.get(iso);
        if (target) {
          target.sessions = Math.round(numMetric(r, 0));
          target.engagedSessions = Math.round(numMetric(r, 1));
          target.users = Math.round(numMetric(r, 2));
          target.pageviews = Math.round(numMetric(r, 3));
        }
      });

      const prevStartMs = new Date(`${dates.prevStartDate}T12:00:00Z`).getTime();
      tsPrevRows.forEach((r) => {
        const iso = formatGaDateToIso(dimVal(r, 0));
        const offset = Math.round((new Date(`${iso}T12:00:00Z`).getTime() - prevStartMs) / 86400000);
        if (offset >= 0 && offset < dayKeys.length) {
          const target = tsMap.get(dayKeys[offset]);
          if (target) {
            target.prevSessions = Math.round(numMetric(r, 0));
            target.prevEngagedSessions = Math.round(numMetric(r, 1));
            target.prevUsers = Math.round(numMetric(r, 2));
            target.prevPageviews = Math.round(numMetric(r, 3));
          }
        }
      });

      timeseries = Array.from(tsMap.values());
    }

    // 4. Hourly Activity Profile (00:00 - 23:00)
    const hourlyRows = batch1Reports[2]?.rows || [];
    const hourlyBuckets: Ga4HourlyProfilePoint[] = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      label: `${String(h).padStart(2, '0')}:00`,
      sessions: 0,
      users: 0,
      engagedSessions: 0,
      isPeak: false,
    }));

    hourlyRows.forEach((r) => {
      const h = parseInt(dimVal(r, 0), 10);
      if (Number.isFinite(h) && h >= 0 && h < 24) {
        hourlyBuckets[h].sessions += Math.round(numMetric(r, 0));
        hourlyBuckets[h].users += Math.round(numMetric(r, 1));
        hourlyBuckets[h].engagedSessions += Math.round(numMetric(r, 2));
      }
    });
    const maxHourlySessions = Math.max(0, ...hourlyBuckets.map((b) => b.sessions));
    if (maxHourlySessions > 0) {
      hourlyBuckets.forEach((b) => {
        if (b.sessions === maxHourlySessions) b.isPeak = true;
      });
    }

    // 5. All GA4 Events & E-commerce Events
    const eventRows = batch1Reports[3]?.rows || [];
    const eventCounts: Record<string, number> = {};
    const totalUsersDenominator = Math.max(1, curUsers);
    const allEvents: Ga4EventItem[] = eventRows
      .map((r) => {
        const eventName = dimVal(r, 0).trim();
        const eventCount = Math.round(numMetric(r, 0));
        const totalUsers = Math.round(numMetric(r, 1));
        if (eventName) {
          eventCounts[eventName] = eventCount;
        }
        return {
          eventName,
          eventCount,
          totalUsers,
          userPct: curUsers > 0 ? Math.min(100, Number(((totalUsers / totalUsersDenominator) * 100).toFixed(1))) : 0,
        };
      })
      .filter((e) => e.eventName && e.eventCount > 0);

    const events = {
      viewItem: eventCounts['view_item'] || 0,
      addToCart: eventCounts['add_to_cart'] || 0,
      beginCheckout: eventCounts['begin_checkout'] || 0,
      purchase: eventCounts['purchase'] || 0,
    };

    // 6. Channels Summary
    const channelRows = batch2Reports[0]?.rows || [];
    const totalChannelSessions = channelRows.reduce((s, r) => s + numMetric(r, 0), 0) || 1;
    const channels: Ga4ChannelItem[] = channelRows
      .map((r) => {
        const sessions = Math.round(numMetric(r, 0));
        return {
          channelGroup: normalizeLabelName(dimVal(r, 0), 'Direct'),
          sessions,
          engagedSessions: Math.round(numMetric(r, 1)),
          engagementRatePct: Number((numMetric(r, 2) * 100).toFixed(1)),
          purchases: Math.round(numMetric(r, 3)),
          sharePct: Math.round((sessions / totalChannelSessions) * 100),
        };
      })
      .filter((c) => c.sessions > 0);

    // 7. Traffic Sources
    const sourceRows = batch2Reports[1]?.rows || [];
    const totalSourceSessions = sourceRows.reduce((s, r) => s + numMetric(r, 0), 0) || 1;
    const sources: Ga4TrafficSourceItem[] = sourceRows
      .map((r) => {
        const sessions = Math.round(numMetric(r, 0));
        return {
          sourceMedium: normalizeLabelName(dimVal(r, 0), '(direct) / (none)'),
          channelGroup: normalizeLabelName(dimVal(r, 1), 'Direct'),
          sessions,
          users: Math.round(numMetric(r, 1)),
          engagedSessions: Math.round(numMetric(r, 2)),
          engagementRatePct: Number((numMetric(r, 3) * 100).toFixed(1)),
          purchases: Math.round(numMetric(r, 4)),
          sharePct: Math.round((sessions / totalSourceSessions) * 100),
        };
      })
      .filter((s) => s.sessions > 0);

    // 8. UTM Campaigns
    const campaignRows = batch2Reports[2]?.rows || [];
    const campaigns: Ga4CampaignItem[] = campaignRows
      .map((r) => ({
        campaign: normalizeLabelName(dimVal(r, 0), '(direct)'),
        sourceMedium: normalizeLabelName(dimVal(r, 1), '(direct) / (none)'),
        sessions: Math.round(numMetric(r, 0)),
        users: Math.round(numMetric(r, 1)),
        engagementRatePct: Number((numMetric(r, 2) * 100).toFixed(1)),
      }))
      .filter((c) => c.sessions > 0 && c.campaign !== '(direct)' && c.campaign !== '(organic)');

    // 9. Top Pages
    const pageRows = batch2Reports[3]?.rows || [];
    const topPages: Ga4PageItem[] = pageRows
      .map((r) => ({
        path: normalizeLabelName(dimVal(r, 0), '/'),
        title: normalizeLabelName(dimVal(r, 1), 'Pagină'),
        views: Math.round(numMetric(r, 0)),
        users: Math.round(numMetric(r, 1)),
        avgDurationSec: Math.round(numMetric(r, 2)),
        bounceRatePct: Number((numMetric(r, 3) * 100).toFixed(1)),
      }))
      .filter((p) => p.views > 0);

    // 10. Landing Pages
    const landingRows = batch2Reports[4]?.rows || [];
    const landingPages: Ga4LandingPageItem[] = landingRows
      .map((r) => ({
        path: normalizeLabelName(dimVal(r, 0), '(not set)'),
        sessions: Math.round(numMetric(r, 0)),
        engagedSessions: Math.round(numMetric(r, 1)),
        bounceRatePct: Number((numMetric(r, 2) * 100).toFixed(1)),
        avgDurationSec: Math.round(numMetric(r, 3)),
      }))
      .filter((lp) => lp.sessions > 0 && lp.path !== '(not set)');

    // 11. Viewed Items
    const itemRows = batch3Reports[0]?.rows || [];
    const viewedItems: Ga4ViewedItem[] = itemRows
      .map((r) => ({
        itemName: normalizeLabelName(dimVal(r, 0), ''),
        itemsViewed: Math.round(numMetric(r, 0)),
        itemsAddedToCart: Math.round(numMetric(r, 1)),
        itemsPurchased: Math.round(numMetric(r, 2)),
      }))
      .filter((i) => i.itemName && (i.itemsViewed > 0 || i.itemsAddedToCart > 0 || i.itemsPurchased > 0));

    // 12. Devices & OS
    const deviceOsRows = batch3Reports[1]?.rows || [];
    const devMap = new Map<string, { sessions: number; users: number }>();
    const osMap = new Map<string, { sessions: number; users: number }>();
    deviceOsRows.forEach((r) => {
      const dev = normalizeLabelName(dimVal(r, 0), 'Necunoscut');
      const devLabel = dev.charAt(0).toUpperCase() + dev.slice(1).toLowerCase();
      const os = normalizeLabelName(dimVal(r, 1), 'Altele');
      const s = Math.round(numMetric(r, 0));
      const u = Math.round(numMetric(r, 1));

      const dCur = devMap.get(devLabel) || { sessions: 0, users: 0 };
      devMap.set(devLabel, { sessions: dCur.sessions + s, users: dCur.users + u });

      const oCur = osMap.get(os) || { sessions: 0, users: 0 };
      osMap.set(os, { sessions: oCur.sessions + s, users: oCur.users + u });
    });

    // 13. Browsers
    const browserRows = batch3Reports[2]?.rows || [];
    const browserMap = new Map<string, { sessions: number; users: number }>();
    browserRows.forEach((r) => {
      const b = normalizeLabelName(dimVal(r, 0), 'Altele');
      const s = Math.round(numMetric(r, 0));
      const u = Math.round(numMetric(r, 1));
      const cur = browserMap.get(b) || { sessions: 0, users: 0 };
      browserMap.set(b, { sessions: cur.sessions + s, users: cur.users + u });
    });

    // 14. Geo Countries & Cities (with engagementRate)
    const geoRows = batch3Reports[3]?.rows || [];
    const countryMap = new Map<string, { sessions: number; users: number; engagedWeighted: number }>();
    const cityMap = new Map<
      string,
      { name: string; country: string; sessions: number; users: number; engagedWeighted: number }
    >();

    geoRows.forEach((r) => {
      const country = normalizeLabelName(dimVal(r, 0), 'Necunoscut');
      const city = normalizeLabelName(dimVal(r, 1), 'Necunoscut');
      const s = Math.round(numMetric(r, 0));
      const u = Math.round(numMetric(r, 1));
      const er = numMetric(r, 2);

      const cCur = countryMap.get(country) || { sessions: 0, users: 0, engagedWeighted: 0 };
      countryMap.set(country, {
        sessions: cCur.sessions + s,
        users: cCur.users + u,
        engagedWeighted: cCur.engagedWeighted + s * er,
      });

      if (city !== 'Necunoscut') {
        const cityKey = `${city}::${country}`;
        const ciCur = cityMap.get(cityKey) || {
          name: city,
          country,
          sessions: 0,
          users: 0,
          engagedWeighted: 0,
        };
        cityMap.set(cityKey, {
          name: city,
          country,
          sessions: ciCur.sessions + s,
          users: ciCur.users + u,
          engagedWeighted: ciCur.engagedWeighted + s * er,
        });
      }
    });

    const countryEntries = Array.from(countryMap.entries())
      .map(([name, vals]) => ({
        name,
        sessions: vals.sessions,
        users: vals.users,
        engagementRatePct: vals.sessions > 0 ? Number(((vals.engagedWeighted / vals.sessions) * 100).toFixed(1)) : 0,
      }))
      .filter((i) => i.sessions > 0 || i.users > 0)
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 15);
    const totalCountrySessions = countryEntries.reduce((sum, e) => sum + e.sessions, 0) || 1;
    const countries: Ga4GeoBreakdownItem[] = countryEntries.map((e) => ({
      ...e,
      percentage: Math.round((e.sessions / totalCountrySessions) * 100),
    }));

    const cityEntries = Array.from(cityMap.values())
      .map((vals) => ({
        name: vals.name,
        country: vals.country,
        sessions: vals.sessions,
        users: vals.users,
        engagementRatePct: vals.sessions > 0 ? Number(((vals.engagedWeighted / vals.sessions) * 100).toFixed(1)) : 0,
      }))
      .filter((i) => i.sessions > 0 || i.users > 0)
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 15);
    const totalCitySessions = cityEntries.reduce((sum, e) => sum + e.sessions, 0) || 1;
    const cities: Ga4CityBreakdownItem[] = cityEntries.map((e) => ({
      ...e,
      percentage: Math.round((e.sessions / totalCitySessions) * 100),
    }));

    // 15. New vs Returning
    const nvrRows = batch3Reports[4]?.rows || [];
    const nvrTotalSessions = nvrRows.reduce((sum, r) => sum + numMetric(r, 0), 0) || 1;
    const newVsReturning: Ga4NewVsReturningItem[] = nvrRows
      .map((r) => {
        const rawSeg = dimVal(r, 0).trim().toLowerCase();
        const segment: 'new' | 'returning' | 'unknown' =
          rawSeg === 'new' ? 'new' : rawSeg === 'returning' ? 'returning' : 'unknown';
        const label =
          segment === 'new'
            ? 'Utilizatori Noi'
            : segment === 'returning'
              ? 'Utilizatori Recurenți'
              : 'Nesetat';
        const sessions = Math.round(numMetric(r, 0));
        return {
          segment,
          label,
          sessions,
          users: Math.round(numMetric(r, 1)),
          engagementRatePct: Number((numMetric(r, 2) * 100).toFixed(1)),
          avgDurationSec: Math.round(numMetric(r, 3)),
          sharePct: Math.round((sessions / nvrTotalSessions) * 100),
        };
      })
      .filter((item) => item.sessions > 0 && item.segment !== 'unknown')
      .sort((a, b) => b.sessions - a.sessions);

    const returningSeg = newVsReturning.find((n) => n.segment === 'returning');
    if (returningSeg && returningSeg.users > 0) {
      overview.returningUsers = returningSeg.users;
    }

    // 16. Languages
    const langRows = batch4Reports[0]?.rows || [];
    const langMap = new Map<string, { sessions: number; users: number }>();
    langRows.forEach((r) => {
      const lang = normalizeLabelName(dimVal(r, 0), 'Necunoscut');
      const s = Math.round(numMetric(r, 0));
      const u = Math.round(numMetric(r, 1));
      const cur = langMap.get(lang) || { sessions: 0, users: 0 };
      langMap.set(lang, { sessions: cur.sessions + s, users: cur.users + u });
    });

    // 17. Screen Resolutions
    const resRows = batch4Reports[1]?.rows || [];
    const resMap = new Map<string, { sessions: number; users: number }>();
    resRows.forEach((r) => {
      const res = normalizeLabelName(dimVal(r, 0), 'Necunoscut');
      const s = Math.round(numMetric(r, 0));
      const u = Math.round(numMetric(r, 1));
      const cur = resMap.get(res) || { sessions: 0, users: 0 };
      resMap.set(res, { sessions: cur.sessions + s, users: cur.users + u });
    });

    return {
      ...emptyBase,
      error: null,
      realtime,
      overview,
      timeseries,
      hourlyProfile: hourlyBuckets,
      events,
      allEvents,
      channels,
      sources,
      campaigns,
      topPages,
      landingPages,
      newVsReturning,
      viewedItems,
      devices: aggregateBreakdown(devMap, 5),
      operatingSystems: aggregateBreakdown(osMap, 8),
      browsers: aggregateBreakdown(browserMap, 10),
      languages: aggregateBreakdown(langMap, 12),
      screenResolutions: aggregateBreakdown(resMap, 12),
      countries,
      cities,
    };
  } catch (err: any) {
    console.error('[GA4 Analytics] Failed to query GA4 Data API:', err?.message || err);
    return {
      ...emptyBase,
      error: err?.message || 'Eroare la conectarea cu Google Analytics Data API.',
    };
  }
}
