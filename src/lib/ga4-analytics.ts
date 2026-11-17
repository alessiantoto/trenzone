import { google, analyticsdata_v1beta } from 'googleapis';

export type AnalyticsRangeKey = 'today' | 'yesterday' | '7d' | '30d' | '90d';

export interface Ga4ConfigStatus {
  configured: boolean;
  missingKeys: string[];
  propertyId: string | null;
}

export interface Ga4RealtimeData {
  activeUsers: number;
  topPages: Array<{ title: string; activeUsers: number }>;
  topCountries: Array<{ country: string; activeUsers: number }>;
}

export interface Ga4OverviewMetrics {
  sessions: number;
  totalUsers: number;
  newUsers: number;
  returningUsers: number;
  pageviews: number;
  bounceRatePct: number;
  avgSessionDurationSec: number;
  pagesPerSession: number;
  deltas: {
    sessionsPct: number | null;
    usersPct: number | null;
    newUsersPct: number | null;
    pageviewsPct: number | null;
    bounceRatePct: number | null;
    avgSessionDurationPct: number | null;
  };
}

export interface Ga4TimeseriesPoint {
  key: string;
  label: string;
  sessions: number;
  users: number;
  pageviews: number;
  prevSessions: number;
  prevUsers: number;
  prevPageviews: number;
}

export interface Ga4TrafficSourceItem {
  sourceMedium: string;
  channelGroup: string;
  sessions: number;
  users: number;
  engagementRatePct: number;
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

export interface Ga4AnalyticsReport {
  configured: boolean;
  missingKeys: string[];
  error: string | null;
  range: AnalyticsRangeKey;
  granularity: 'hourly' | 'daily';
  startDate: string;
  endDate: string;
  prevStartDate: string;
  prevEndDate: string;
  realtime: Ga4RealtimeData | null;
  overview: Ga4OverviewMetrics | null;
  timeseries: Ga4TimeseriesPoint[];
  events: {
    viewItem: number;
    addToCart: number;
    beginCheckout: number;
    purchase: number;
  } | null;
  sources: Ga4TrafficSourceItem[];
  campaigns: Ga4CampaignItem[];
  topPages: Ga4PageItem[];
  viewedItems: Ga4ViewedItem[];
  devices: Ga4BreakdownItem[];
  operatingSystems: Ga4BreakdownItem[];
  browsers: Ga4BreakdownItem[];
  countries: Ga4BreakdownItem[];
  cities: Ga4BreakdownItem[];
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

export function resolveAnalyticsDateRange(range: AnalyticsRangeKey): {
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

  return {
    range,
    startDate,
    endDate,
    prevStartDate: prevStartObj.toISOString().split('T')[0],
    prevEndDate: prevEndObj.toISOString().split('T')[0],
    granularity: spanDays === 1 ? 'hourly' : 'daily',
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

export async function fetchGa4AnalyticsReport(range: AnalyticsRangeKey = '30d'): Promise<Ga4AnalyticsReport> {
  const creds = getGa4Credentials();
  const dates = resolveAnalyticsDateRange(range);

  const emptyBase: Ga4AnalyticsReport = {
    configured: creds.configured,
    missingKeys: creds.missingKeys,
    error: null,
    range: dates.range,
    granularity: dates.granularity,
    startDate: dates.startDate,
    endDate: dates.endDate,
    prevStartDate: dates.prevStartDate,
    prevEndDate: dates.prevEndDate,
    realtime: null,
    overview: null,
    timeseries: [],
    events: null,
    sources: [],
    campaigns: [],
    topPages: [],
    viewedItems: [],
    devices: [],
    operatingSystems: [],
    browsers: [],
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
    const prevDateRange = [{ name: 'previous', startDate: dates.prevStartDate, endDate: dates.prevEndDate }];

    const [
      realtimePagesSettled,
      realtimeCountriesSettled,
      batch1Settled,
      batch2Settled,
      geoReportSettled,
    ] = await Promise.allSettled([
      analyticsData.properties.runRealtimeReport({
        property,
        requestBody: {
          dimensions: [{ name: 'unifiedScreenName' }],
          metrics: [{ name: 'activeUsers' }],
          limit: '10',
        },
      }),
      analyticsData.properties.runRealtimeReport({
        property,
        requestBody: {
          dimensions: [{ name: 'country' }],
          metrics: [{ name: 'activeUsers' }],
          limit: '10',
        },
      }),
      analyticsData.properties.batchRunReports({
        property,
        requestBody: {
          requests: [
            // [0] Overview current vs previous
            {
              dateRanges: [
                { name: 'current', startDate: dates.startDate, endDate: dates.endDate },
                { name: 'previous', startDate: dates.prevStartDate, endDate: dates.prevEndDate },
              ],
              metrics: [
                { name: 'sessions' },
                { name: 'totalUsers' },
                { name: 'newUsers' },
                { name: 'screenPageViews' },
                { name: 'bounceRate' },
                { name: 'averageSessionDuration' },
                { name: 'screenPageViewsPerSession' },
              ],
            },
            // [1] Timeseries current
            {
              dateRanges: currentDateRange,
              dimensions: [{ name: isHourly ? 'dateHour' : 'date' }],
              metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'screenPageViews' }],
              orderBys: [{ dimension: { dimensionName: isHourly ? 'dateHour' : 'date' } }],
            },
            // [2] Timeseries previous
            {
              dateRanges: prevDateRange,
              dimensions: [{ name: isHourly ? 'dateHour' : 'date' }],
              metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'screenPageViews' }],
              orderBys: [{ dimension: { dimensionName: isHourly ? 'dateHour' : 'date' } }],
            },
            // [3] E-commerce events funnel
            {
              dateRanges: currentDateRange,
              dimensions: [{ name: 'eventName' }],
              metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }],
              dimensionFilter: {
                filter: {
                  fieldName: 'eventName',
                  inListFilter: {
                    values: ['view_item', 'add_to_cart', 'begin_checkout', 'purchase'],
                  },
                },
              },
            },
            // [4] Traffic Sources & Channels
            {
              dateRanges: currentDateRange,
              dimensions: [{ name: 'sessionSourceMedium' }, { name: 'sessionDefaultChannelGroup' }],
              metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'engagementRate' }],
              orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
              limit: '20',
            },
          ],
        },
      }),
      analyticsData.properties.batchRunReports({
        property,
        requestBody: {
          requests: [
            // [0] UTM Campaigns
            {
              dateRanges: currentDateRange,
              dimensions: [{ name: 'sessionCampaignName' }, { name: 'sessionSourceMedium' }],
              metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'engagementRate' }],
              orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
              limit: '15',
            },
            // [1] Top Pages
            {
              dateRanges: currentDateRange,
              dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
              metrics: [
                { name: 'screenPageViews' },
                { name: 'totalUsers' },
                { name: 'averageSessionDuration' },
                { name: 'bounceRate' },
              ],
              orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
              limit: '25',
            },
            // [2] E-commerce Items Viewed
            {
              dateRanges: currentDateRange,
              dimensions: [{ name: 'itemName' }],
              metrics: [{ name: 'itemsViewed' }, { name: 'itemsAddedToCart' }, { name: 'itemsPurchased' }],
              orderBys: [{ metric: { metricName: 'itemsViewed' }, desc: true }],
              limit: '25',
            },
            // [3] Devices & OS
            {
              dateRanges: currentDateRange,
              dimensions: [{ name: 'deviceCategory' }, { name: 'operatingSystem' }],
              metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
              orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
              limit: '30',
            },
            // [4] Browsers
            {
              dateRanges: currentDateRange,
              dimensions: [{ name: 'browser' }],
              metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
              orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
              limit: '15',
            },
          ],
        },
      }),
      analyticsData.properties.runReport({
        property,
        requestBody: {
          dateRanges: currentDateRange,
          dimensions: [{ name: 'country' }, { name: 'city' }],
          metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: '40',
        },
      }),
    ]);

    // Check if core batch failed due to auth/permissions
    if (batch1Settled.status === 'rejected') {
      throw batch1Settled.reason;
    }

    // 1. Realtime
    const rtPageRows =
      realtimePagesSettled.status === 'fulfilled' ? realtimePagesSettled.value.data.rows || [] : [];
    const rtCountryRows =
      realtimeCountriesSettled.status === 'fulfilled' ? realtimeCountriesSettled.value.data.rows || [] : [];

    const rtActiveFromPages = rtPageRows.reduce((sum, r) => sum + numMetric(r, 0), 0);
    const rtActiveFromCountries = rtCountryRows.reduce((sum, r) => sum + numMetric(r, 0), 0);
    const realtime: Ga4RealtimeData = {
      activeUsers: Math.max(rtActiveFromPages, rtActiveFromCountries),
      topPages: rtPageRows
        .map((r) => ({
          title: normalizeLabelName(dimVal(r, 0), '/'),
          activeUsers: numMetric(r, 0),
        }))
        .filter((r) => r.activeUsers > 0)
        .slice(0, 6),
      topCountries: rtCountryRows
        .map((r) => ({
          country: normalizeLabelName(dimVal(r, 0), 'Necunoscut'),
          activeUsers: numMetric(r, 0),
        }))
        .filter((r) => r.activeUsers > 0)
        .slice(0, 6),
    };

    const batch1Reports = batch1Settled.value.data.reports || [];
    const batch2Reports =
      batch2Settled.status === 'fulfilled' ? batch2Settled.value.data.reports || [] : [];

    // 2. Overview
    const overviewRows = batch1Reports[0]?.rows || [];
    const curRow =
      overviewRows.find((r) => dimVal(r, 0) === 'current' || dimVal(r, 0) === 'date_range_0') ||
      overviewRows[0];
    const prevRow =
      overviewRows.find((r) => dimVal(r, 0) === 'previous' || dimVal(r, 0) === 'date_range_1') ||
      overviewRows[1];

    const curSessions = Math.round(numMetric(curRow, 0));
    const curUsers = Math.round(numMetric(curRow, 1));
    const curNewUsers = Math.round(numMetric(curRow, 2));
    const curPageviews = Math.round(numMetric(curRow, 3));
    const curBouncePct = Number((numMetric(curRow, 4) * 100).toFixed(1));
    const curAvgDur = Math.round(numMetric(curRow, 5));
    const curPagesPerSession = Number(numMetric(curRow, 6).toFixed(2));

    const prevSessions = Math.round(numMetric(prevRow, 0));
    const prevUsers = Math.round(numMetric(prevRow, 1));
    const prevNewUsers = Math.round(numMetric(prevRow, 2));
    const prevPageviews = Math.round(numMetric(prevRow, 3));
    const prevBouncePct = Number((numMetric(prevRow, 4) * 100).toFixed(1));
    const prevAvgDur = Math.round(numMetric(prevRow, 5));

    const overview: Ga4OverviewMetrics = {
      sessions: curSessions,
      totalUsers: curUsers,
      newUsers: Math.min(curUsers, curNewUsers),
      returningUsers: Math.max(0, curUsers - curNewUsers),
      pageviews: curPageviews,
      bounceRatePct: curBouncePct,
      avgSessionDurationSec: curAvgDur,
      pagesPerSession: curPagesPerSession,
      deltas: {
        sessionsPct: computeDelta(curSessions, prevSessions),
        usersPct: computeDelta(curUsers, prevUsers),
        newUsersPct: computeDelta(curNewUsers, prevNewUsers),
        pageviewsPct: computeDelta(curPageviews, prevPageviews),
        bounceRatePct: computeDelta(curBouncePct, prevBouncePct),
        avgSessionDurationPct: computeDelta(curAvgDur, prevAvgDur),
      },
    };

    // 3. Timeseries
    const tsCurRows = batch1Reports[1]?.rows || [];
    const tsPrevRows = batch1Reports[2]?.rows || [];
    let timeseries: Ga4TimeseriesPoint[] = [];

    if (isHourly) {
      const buckets: Ga4TimeseriesPoint[] = Array.from({ length: 24 }, (_, h) => {
        const hh = String(h).padStart(2, '0');
        return {
          key: hh,
          label: `${hh}:00`,
          sessions: 0,
          users: 0,
          pageviews: 0,
          prevSessions: 0,
          prevUsers: 0,
          prevPageviews: 0,
        };
      });

      tsCurRows.forEach((r) => {
        const raw = dimVal(r, 0); // YYYYMMDDHH
        const h = parseInt(raw.slice(-2), 10);
        if (Number.isFinite(h) && h >= 0 && h < 24) {
          buckets[h].sessions += Math.round(numMetric(r, 0));
          buckets[h].users += Math.round(numMetric(r, 1));
          buckets[h].pageviews += Math.round(numMetric(r, 2));
        }
      });

      tsPrevRows.forEach((r) => {
        const raw = dimVal(r, 0);
        const h = parseInt(raw.slice(-2), 10);
        if (Number.isFinite(h) && h >= 0 && h < 24) {
          buckets[h].prevSessions += Math.round(numMetric(r, 0));
          buckets[h].prevUsers += Math.round(numMetric(r, 1));
          buckets[h].prevPageviews += Math.round(numMetric(r, 2));
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
          users: 0,
          pageviews: 0,
          prevSessions: 0,
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
          target.users = Math.round(numMetric(r, 1));
          target.pageviews = Math.round(numMetric(r, 2));
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
            target.prevUsers = Math.round(numMetric(r, 1));
            target.prevPageviews = Math.round(numMetric(r, 2));
          }
        }
      });

      timeseries = Array.from(tsMap.values());
    }

    // 4. E-commerce events
    const eventRows = batch1Reports[3]?.rows || [];
    const eventCounts: Record<string, number> = {};
    eventRows.forEach((r) => {
      eventCounts[dimVal(r, 0)] = Math.round(numMetric(r, 0));
    });
    const events = {
      viewItem: eventCounts['view_item'] || 0,
      addToCart: eventCounts['add_to_cart'] || 0,
      beginCheckout: eventCounts['begin_checkout'] || 0,
      purchase: eventCounts['purchase'] || 0,
    };

    // 5. Traffic Sources
    const sourceRows = batch1Reports[4]?.rows || [];
    const totalSourceSessions = sourceRows.reduce((s, r) => s + numMetric(r, 0), 0) || 1;
    const sources: Ga4TrafficSourceItem[] = sourceRows
      .map((r) => {
        const sessions = Math.round(numMetric(r, 0));
        return {
          sourceMedium: normalizeLabelName(dimVal(r, 0), '(direct) / (none)'),
          channelGroup: normalizeLabelName(dimVal(r, 1), 'Direct'),
          sessions,
          users: Math.round(numMetric(r, 1)),
          engagementRatePct: Number((numMetric(r, 2) * 100).toFixed(1)),
          sharePct: Math.round((sessions / totalSourceSessions) * 100),
        };
      })
      .filter((s) => s.sessions > 0);

    // 6. UTM Campaigns
    const campaignRows = batch2Reports[0]?.rows || [];
    const campaigns: Ga4CampaignItem[] = campaignRows
      .map((r) => ({
        campaign: normalizeLabelName(dimVal(r, 0), '(direct)'),
        sourceMedium: normalizeLabelName(dimVal(r, 1), '(direct) / (none)'),
        sessions: Math.round(numMetric(r, 0)),
        users: Math.round(numMetric(r, 1)),
        engagementRatePct: Number((numMetric(r, 2) * 100).toFixed(1)),
      }))
      .filter((c) => c.sessions > 0 && c.campaign !== '(direct)' && c.campaign !== '(organic)');

    // 7. Top Pages
    const pageRows = batch2Reports[1]?.rows || [];
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

    // 8. Viewed Items
    const itemRows = batch2Reports[2]?.rows || [];
    const viewedItems: Ga4ViewedItem[] = itemRows
      .map((r) => ({
        itemName: normalizeLabelName(dimVal(r, 0), ''),
        itemsViewed: Math.round(numMetric(r, 0)),
        itemsAddedToCart: Math.round(numMetric(r, 1)),
        itemsPurchased: Math.round(numMetric(r, 2)),
      }))
      .filter((i) => i.itemName && (i.itemsViewed > 0 || i.itemsAddedToCart > 0 || i.itemsPurchased > 0));

    // 9. Devices & OS
    const deviceOsRows = batch2Reports[3]?.rows || [];
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

    // 10. Browsers
    const browserRows = batch2Reports[4]?.rows || [];
    const browserMap = new Map<string, { sessions: number; users: number }>();
    browserRows.forEach((r) => {
      const b = normalizeLabelName(dimVal(r, 0), 'Altele');
      const s = Math.round(numMetric(r, 0));
      const u = Math.round(numMetric(r, 1));
      const cur = browserMap.get(b) || { sessions: 0, users: 0 };
      browserMap.set(b, { sessions: cur.sessions + s, users: cur.users + u });
    });

    // 11. Geo Countries & Cities
    const geoRows = geoReportSettled.status === 'fulfilled' ? geoReportSettled.value.data.rows || [] : [];
    const countryMap = new Map<string, { sessions: number; users: number }>();
    const cityMap = new Map<string, { sessions: number; users: number }>();
    geoRows.forEach((r) => {
      const country = normalizeLabelName(dimVal(r, 0), 'Necunoscut');
      const city = normalizeLabelName(dimVal(r, 1), 'Necunoscut');
      const s = Math.round(numMetric(r, 0));
      const u = Math.round(numMetric(r, 1));

      const cCur = countryMap.get(country) || { sessions: 0, users: 0 };
      countryMap.set(country, { sessions: cCur.sessions + s, users: cCur.users + u });

      if (city !== 'Necunoscut') {
        const ciCur = cityMap.get(city) || { sessions: 0, users: 0 };
        cityMap.set(city, { sessions: ciCur.sessions + s, users: ciCur.users + u });
      }
    });

    return {
      ...emptyBase,
      error: null,
      realtime,
      overview,
      timeseries,
      events,
      sources,
      campaigns,
      topPages,
      viewedItems,
      devices: aggregateBreakdown(devMap, 5),
      operatingSystems: aggregateBreakdown(osMap, 8),
      browsers: aggregateBreakdown(browserMap, 10),
      countries: aggregateBreakdown(countryMap, 12),
      cities: aggregateBreakdown(cityMap, 12),
    };
  } catch (err: any) {
    console.error('[GA4 Analytics] Failed to query GA4 Data API:', err?.message || err);
    return {
      ...emptyBase,
      error: err?.message || 'Eroare la conectarea cu Google Analytics Data API.',
    };
  }
}
