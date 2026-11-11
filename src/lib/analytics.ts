import { Redis } from '@upstash/redis';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const isRedisConfigured = !!(REDIS_URL && REDIS_TOKEN);
const redis = isRedisConfigured
  ? new Redis({
      url: REDIS_URL!,
      token: REDIS_TOKEN!,
    })
  : null;

export type AnalyticsEventType = 'pageview' | 'cart' | 'checkout' | 'vitals';

export interface EventMetadata {
  path?: string;
  referrer?: string;
  search?: string;
  screenWidth?: number;
  userAgent?: string;
  countryCode?: string;
  city?: string;
  vitals?: {
    ttfb?: number;
    fcp?: number;
    lcp?: number;
    cls?: number;
    inp?: number;
  };
}

const COUNTRY_NAMES: Record<string, string> = {
  RO: 'România',
  DE: 'Germania',
  IT: 'Italia',
  FR: 'Franța',
  ES: 'Spania',
  GB: 'Regatul Unit (UK)',
  UK: 'Regatul Unit (UK)',
  US: 'Statele Unite',
  HU: 'Ungaria',
  BG: 'Bulgaria',
  CZ: 'Cehia',
  SK: 'Slovacia',
  PL: 'Polonia',
  AT: 'Austria',
  GR: 'Grecia',
  BE: 'Belgia',
  NL: 'Olanda',
  HR: 'Croația',
  SI: 'Slovenia',
  PT: 'Portugalia',
  SE: 'Suedia',
  FI: 'Finlanda',
  EE: 'Estonia',
  LV: 'Letonia',
  LT: 'Lituania',
  LU: 'Luxemburg',
  CY: 'Cipru',
  IE: 'Irlanda',
  MD: 'Moldova',
  CH: 'Elveția',
};

export function parseUserAgent(uaString: string = '') {
  const ua = uaString.toLowerCase();
  
  // 1. Device Type
  let device = 'Desktop';
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) {
    device = 'Tablet';
  } else if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) {
    device = 'Mobile';
  }

  // 2. Operating System
  let os = 'Altele';
  if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  // 3. Browser / In-App Browser
  let browser = 'Chrome';
  if (/instagram/i.test(ua)) browser = 'Instagram App';
  else if (/tiktok|musical_ly|bytedance/i.test(ua)) browser = 'TikTok App';
  else if (/fban|fbav/i.test(ua)) browser = 'Facebook App';
  else if (/edg/i.test(ua)) browser = 'Edge';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/samsung/i.test(ua)) browser = 'Samsung Internet';

  return { device, os, browser };
}

export function parseReferrer(rawReferrer: string = '') {
  if (!rawReferrer) return 'Direct / Bookmark';
  try {
    const url = new URL(rawReferrer);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (host.includes('instagram.com')) return 'Instagram';
    if (host.includes('tiktok.com')) return 'TikTok';
    if (host.includes('facebook.com') || host.includes('fb.com')) return 'Facebook';
    if (host.includes('google.')) return 'Google Search';
    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'YouTube';
    if (host.includes('pinterest.')) return 'Pinterest';
    if (host.includes('t.co') || host.includes('twitter.com') || host.includes('x.com')) return 'X (Twitter)';
    if (host.includes('trenzone.fit') || host.includes('localhost')) return 'Navigare Internă';
    return host;
  } catch {
    return 'Direct / Bookmark';
  }
}

export async function recordStoreEvent(
  type: AnalyticsEventType,
  visitorId: string,
  sessionId: string,
  dateStr?: string,
  meta?: EventMetadata
) {
  if (!redis) return;

  const date = dateStr || new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Bucharest' });

  try {
    const pipeline = redis.pipeline();

    // 1. Unique visitors (HyperLogLog)
    if (visitorId) {
      pipeline.pfadd(`analytics:visitors:${date}`, visitorId);
      // Real-time Active Visitors (5-minute sliding window)
      pipeline.zadd('analytics:active_users', { score: Date.now(), member: visitorId });
    }

    // 2. Unique Sessions (HyperLogLog)
    if (sessionId) {
      pipeline.pfadd(`analytics:sessions:${date}`, sessionId);
    }

    // 3. Total Pageviews / Visits (non-unique counter - only increment on real pageviews)
    if (type === 'pageview') {
      pipeline.incr(`analytics:pageviews:${date}`);
    }

    // 4. Funnel Stages (checkout event inherently implies cart stage)
    if (type === 'cart' && sessionId) {
      pipeline.pfadd(`analytics:cart:${date}`, sessionId);
    } else if (type === 'checkout' && sessionId) {
      pipeline.pfadd(`analytics:cart:${date}`, sessionId);
      pipeline.pfadd(`analytics:checkout:${date}`, sessionId);
    }

    // 5. Extended Vercel-style Telemetry (100% Real from headers and client)
    if (meta) {
      const { device, os, browser } = parseUserAgent(meta.userAgent);
      pipeline.hincrby(`analytics:devices:${date}`, device, 1);
      pipeline.hincrby(`analytics:browsers:${date}`, browser, 1);
      pipeline.hincrby(`analytics:os:${date}`, os, 1);

      const referrerSource = parseReferrer(meta.referrer);
      if (referrerSource !== 'Navigare Internă') {
        pipeline.zincrby(`analytics:referrers:${date}`, 1, referrerSource);
      }

      if (meta.path) {
        let cleanPath = meta.path.split('?')[0].replace(/\/+$/, '') || '/';
        if (!cleanPath.startsWith('/_next') && !cleanPath.startsWith('/api') && !cleanPath.startsWith('/admin')) {
          pipeline.zincrby(`analytics:pages:${date}`, 1, cleanPath);
        }
      }

      // Geo from Vercel Edge Headers
      if (meta.countryCode) {
        const countryName = COUNTRY_NAMES[meta.countryCode.toUpperCase()] || meta.countryCode.toUpperCase();
        pipeline.zincrby(`analytics:traffic_countries:${date}`, 1, countryName);
      }
      if (meta.city && meta.city.trim()) {
        pipeline.zincrby(`analytics:traffic_cities:${date}`, 1, meta.city.trim());
      }

      // Marketing Campaign Attribution
      if (meta.search) {
        try {
          const params = new URLSearchParams(meta.search);
          const utmSource = params.get('utm_source');
          const utmCampaign = params.get('utm_campaign');
          if (utmSource) pipeline.zincrby(`analytics:utm_source:${date}`, 1, utmSource);
          if (utmCampaign) pipeline.zincrby(`analytics:utm_campaign:${date}`, 1, utmCampaign);
        } catch {}
      }

      // Real Core Web Vitals from browser
      if (meta.vitals) {
        if (typeof meta.vitals.ttfb === 'number' && meta.vitals.ttfb > 0 && meta.vitals.ttfb < 10000) {
          pipeline.incrbyfloat(`analytics:vitals:ttfb:sum`, meta.vitals.ttfb);
          pipeline.incr(`analytics:vitals:ttfb:count`);
        }
        if (typeof meta.vitals.fcp === 'number' && meta.vitals.fcp > 0 && meta.vitals.fcp < 10000) {
          pipeline.incrbyfloat(`analytics:vitals:fcp:sum`, meta.vitals.fcp);
          pipeline.incr(`analytics:vitals:fcp:count`);
        }
        if (typeof meta.vitals.lcp === 'number' && meta.vitals.lcp > 0 && meta.vitals.lcp < 20000) {
          pipeline.incrbyfloat(`analytics:vitals:lcp:sum`, meta.vitals.lcp);
          pipeline.incr(`analytics:vitals:lcp:count`);
        }
        if (typeof meta.vitals.cls === 'number' && meta.vitals.cls >= 0 && meta.vitals.cls < 2) {
          pipeline.incrbyfloat(`analytics:vitals:cls:sum`, meta.vitals.cls);
          pipeline.incr(`analytics:vitals:cls:count`);
        }
        if (typeof meta.vitals.inp === 'number' && meta.vitals.inp > 0 && meta.vitals.inp < 5000) {
          pipeline.incrbyfloat(`analytics:vitals:inp:sum`, meta.vitals.inp);
          pipeline.incr(`analytics:vitals:inp:count`);
        }
      }
    }

    // Purge old active users (> 5 minutes ago)
    pipeline.zremrangebyscore('analytics:active_users', 0, Date.now() - 5 * 60 * 1000);

    await pipeline.exec();
  } catch (error) {
    console.error('⚠️ [Analytics Tracker] Failed to record event:', error);
  }
}

/**
 * Returns store analytics for a date range [startDate, endDate] (inclusive, YYYY-MM-DD)
 */
export async function getStoreConversionMetrics(startDate: string, endDate: string) {
  if (!redis) {
    return {
      totalVisitors: 0,
      totalSessions: 0,
      totalPageviews: 0,
      cartSessions: 0,
      checkoutSessions: 0,
    };
  }

  try {
    const startDay = (startDate || '').split('T')[0] || new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Bucharest' });
    const endDay = (endDate || '').split('T')[0] || startDay;
    const current = new Date(`${startDay}T12:00:00Z`);
    const end = new Date(`${endDay}T12:00:00Z`);

    const visitorKeys: string[] = [];
    const sessionKeys: string[] = [];
    const pageviewKeys: string[] = [];
    const cartKeys: string[] = [];
    const checkoutKeys: string[] = [];

    // Iterate through all days in range (safely capping at 90 days)
    let count = 0;
    while (current <= end && count < 90) {
      const dStr = current.toISOString().split('T')[0];
      visitorKeys.push(`analytics:visitors:${dStr}`);
      sessionKeys.push(`analytics:sessions:${dStr}`);
      pageviewKeys.push(`analytics:pageviews:${dStr}`);
      cartKeys.push(`analytics:cart:${dStr}`);
      checkoutKeys.push(`analytics:checkout:${dStr}`);
      current.setUTCDate(current.getUTCDate() + 1);
      count++;
    }

    const [totalVisitors, totalSessions, cartSessions, checkoutSessions, rawPageviews] = await Promise.all([
      visitorKeys.length > 0 ? redis.pfcount(visitorKeys[0], ...visitorKeys.slice(1)).catch(() => 0) : 0,
      sessionKeys.length > 0 ? redis.pfcount(sessionKeys[0], ...sessionKeys.slice(1)).catch(() => 0) : 0,
      cartKeys.length > 0 ? redis.pfcount(cartKeys[0], ...cartKeys.slice(1)).catch(() => 0) : 0,
      checkoutKeys.length > 0 ? redis.pfcount(checkoutKeys[0], ...checkoutKeys.slice(1)).catch(() => 0) : 0,
      pageviewKeys.length > 0 ? redis.mget(...pageviewKeys).catch(() => []) : [],
    ]);

    let totalPageviews = Array.isArray(rawPageviews) 
      ? rawPageviews.reduce((sum: number, val: any) => sum + (Number(val) || 0), 0)
      : 0;

    return {
      totalVisitors: Number(totalVisitors) || 0,
      totalSessions: Number(totalSessions) || 0,
      totalPageviews: Number(totalPageviews) || 0,
      cartSessions: Number(cartSessions) || 0,
      checkoutSessions: Number(checkoutSessions) || 0,
    };
  } catch (error) {
    console.error('⚠️ [Analytics Tracker] Error fetching conversion metrics:', error);
    return {
      totalVisitors: 0,
      totalSessions: 0,
      totalPageviews: 0,
      cartSessions: 0,
      checkoutSessions: 0,
    };
  }
}

/**
 * Returns 100% authentic Vercel-style telemetry without any hardcoded mock data.
 * Real Referrers, Real Pages, Real Devices, Real OS, Real Browsers, Real Edge Countries, Real Vitals.
 */
export async function getStoreWebAnalytics(startDate: string, endDate: string) {
  const conversionMetrics = await getStoreConversionMetrics(startDate, endDate);

  if (!redis) {
    return {
      ...conversionMetrics,
      activeUsers: 0,
      referrers: [],
      topPages: [],
      devices: [],
      browsers: [],
      operatingSystems: [],
      trafficCountries: [],
      trafficCities: [],
      utmSources: [],
      utmCampaigns: [],
      speedInsights: {
        score: null,
        status: 'În Calibrare',
        totalSamples: 0,
        isLive: false,
        lcp: { value: null, samples: 0, rating: null },
        inp: { value: null, samples: 0, rating: null },
        cls: { value: null, samples: 0, rating: null },
        ttfb: { value: null, samples: 0, rating: null }
      },
      hasVercelDirect: false
    };
  }

  try {
    const startDay = (startDate || '').split('T')[0] || new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Bucharest' });
    const endDay = (endDate || '').split('T')[0] || startDay;
    const current = new Date(`${startDay}T12:00:00Z`);
    const end = new Date(`${endDay}T12:00:00Z`);

    const refKeys: string[] = [];
    const pageKeys: string[] = [];
    const devKeys: string[] = [];
    const browserKeys: string[] = [];
    const osKeys: string[] = [];
    const countryKeys: string[] = [];
    const cityKeys: string[] = [];
    const utmSourceKeys: string[] = [];
    const utmCampKeys: string[] = [];

    let count = 0;
    while (current <= end && count < 90) {
      const dStr = current.toISOString().split('T')[0];
      refKeys.push(`analytics:referrers:${dStr}`);
      pageKeys.push(`analytics:pages:${dStr}`);
      devKeys.push(`analytics:devices:${dStr}`);
      browserKeys.push(`analytics:browsers:${dStr}`);
      osKeys.push(`analytics:os:${dStr}`);
      countryKeys.push(`analytics:traffic_countries:${dStr}`);
      cityKeys.push(`analytics:traffic_cities:${dStr}`);
      utmSourceKeys.push(`analytics:utm_source:${dStr}`);
      utmCampKeys.push(`analytics:utm_campaign:${dStr}`);
      current.setUTCDate(current.getUTCDate() + 1);
      count++;
    }

    // 1. Live Active Users (last 5 min)
    const activeUsersCount = await redis.zcount('analytics:active_users', Date.now() - 5 * 60 * 1000, '+inf').catch(() => 0);

    // 2. Fetch Devices, Browsers, OS
    const [devResults, browserResults, osResults] = await Promise.all([
      Promise.all(devKeys.map(k => redis.hgetall(k).catch(() => ({})))),
      Promise.all(browserKeys.map(k => redis.hgetall(k).catch(() => ({})))),
      Promise.all(osKeys.map(k => redis.hgetall(k).catch(() => ({})))),
    ]);

    // Aggregate Hashes
    const aggregateHash = (results: any[]) => {
      const map: Record<string, number> = {};
      results.forEach(obj => {
        if (obj && typeof obj === 'object') {
          Object.entries(obj).forEach(([key, val]) => {
            const num = Number(val) || 0;
            if (num > 0) map[key] = (map[key] || 0) + num;
          });
        }
      });
      return map;
    };

    const devAgg = aggregateHash(devResults);
    const browserAgg = aggregateHash(browserResults);
    const osAgg = aggregateHash(osResults);

    // Format Devices (100% Real)
    const totalDevCount = Object.values(devAgg).reduce((a, b) => a + b, 0) || 1;
    const devices = Object.entries(devAgg).map(([name, val]) => ({
      name,
      count: val,
      percentage: Math.round((val / totalDevCount) * 100)
    })).sort((a, b) => b.count - a.count);

    // Format Browsers (100% Real)
    const totalBrowserCount = Object.values(browserAgg).reduce((a, b) => a + b, 0) || 1;
    const browsers = Object.entries(browserAgg).map(([name, val]) => ({
      name,
      count: val,
      percentage: Math.round((val / totalBrowserCount) * 100)
    })).sort((a, b) => b.count - a.count);

    // Format OS (100% Real)
    const totalOsCount = Object.values(osAgg).reduce((a, b) => a + b, 0) || 1;
    const operatingSystems = Object.entries(osAgg).map(([name, val]) => ({
      name,
      count: val,
      percentage: Math.round((val / totalOsCount) * 100)
    })).sort((a, b) => b.count - a.count);

    // 3. Fetch Top Pages, Referrers, Countries, Cities, UTMs
    const [pageRanges, refRanges, countryRanges, cityRanges, utmSourceRanges, utmCampRanges] = await Promise.all([
      Promise.all(pageKeys.map(k => redis.zrange(k, 0, 15, { rev: true, withScores: true }).catch(() => []))),
      Promise.all(refKeys.map(k => redis.zrange(k, 0, 15, { rev: true, withScores: true }).catch(() => []))),
      Promise.all(countryKeys.map(k => redis.zrange(k, 0, 15, { rev: true, withScores: true }).catch(() => []))),
      Promise.all(cityKeys.map(k => redis.zrange(k, 0, 15, { rev: true, withScores: true }).catch(() => []))),
      Promise.all(utmSourceKeys.map(k => redis.zrange(k, 0, 10, { rev: true, withScores: true }).catch(() => []))),
      Promise.all(utmCampKeys.map(k => redis.zrange(k, 0, 10, { rev: true, withScores: true }).catch(() => []))),
    ]);

    const aggregateZset = (ranges: any[]) => {
      const map: Record<string, number> = {};
      ranges.forEach(items => {
        if (Array.isArray(items)) {
          for (let i = 0; i < items.length; i += 2) {
            const member = items[i];
            const score = Number(items[i + 1]) || 0;
            if (member && typeof member === 'string') {
              map[member] = (map[member] || 0) + score;
            }
          }
        }
      });
      return map;
    };

    const pagesAgg = aggregateZset(pageRanges);
    const refsAgg = aggregateZset(refRanges);
    const countryAgg = aggregateZset(countryRanges);
    const cityAgg = aggregateZset(cityRanges);
    const utmSourceAgg = aggregateZset(utmSourceRanges);
    const utmCampAgg = aggregateZset(utmCampRanges);

    // Format Pages (100% Real)
    const totalPageHit = Object.values(pagesAgg).reduce((a, b) => a + b, 0) || 1;
    const topPages = Object.entries(pagesAgg).map(([path, val]) => ({
      path,
      count: val,
      percentage: Math.min(100, Math.round((val / totalPageHit) * 100))
    })).sort((a, b) => b.count - a.count);

    // Format Referrers (100% Real)
    const totalRefHit = Object.values(refsAgg).reduce((a, b) => a + b, 0) || 1;
    const referrers = Object.entries(refsAgg).map(([name, val]) => ({
      name,
      count: val,
      percentage: Math.min(100, Math.round((val / totalRefHit) * 100))
    })).sort((a, b) => b.count - a.count);

    // Format Countries (100% Real Edge IP)
    const totalCountryHit = Object.values(countryAgg).reduce((a, b) => a + b, 0) || 1;
    const trafficCountries = Object.entries(countryAgg).map(([name, val]) => ({
      name,
      count: val,
      percentage: Math.min(100, Math.round((val / totalCountryHit) * 100))
    })).sort((a, b) => b.count - a.count);

    // Format Cities (100% Real Edge IP)
    const trafficCities = Object.entries(cityAgg).map(([name, val]) => ({
      name,
      count: val,
    })).sort((a, b) => b.count - a.count).slice(0, 10);

    const utmSources = Object.entries(utmSourceAgg).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    const utmCampaigns = Object.entries(utmCampAgg).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

    // 4. Real Core Web Vitals calculated from actual visitors
    const [ttfbSum, ttfbCount, fcpSum, fcpCount, lcpSum, lcpCount, clsSum, clsCount, inpSum, inpCount] = await Promise.all([
      redis.get<number>('analytics:vitals:ttfb:sum').catch(() => 0),
      redis.get<number>('analytics:vitals:ttfb:count').catch(() => 0),
      redis.get<number>('analytics:vitals:fcp:sum').catch(() => 0),
      redis.get<number>('analytics:vitals:fcp:count').catch(() => 0),
      redis.get<number>('analytics:vitals:lcp:sum').catch(() => 0),
      redis.get<number>('analytics:vitals:lcp:count').catch(() => 0),
      redis.get<number>('analytics:vitals:cls:sum').catch(() => 0),
      redis.get<number>('analytics:vitals:cls:count').catch(() => 0),
      redis.get<number>('analytics:vitals:inp:sum').catch(() => 0),
      redis.get<number>('analytics:vitals:inp:count').catch(() => 0),
    ]);

    const numLcp = Number(lcpCount) || 0;
    const numFcp = Number(fcpCount) || 0;
    const numTtfb = Number(ttfbCount) || 0;
    const numCls = Number(clsCount) || 0;
    const numInp = Number(inpCount) || 0;
    const totalSamples = Math.max(numLcp, numFcp, numTtfb, numCls, numInp);

    const realTtfb = numTtfb > 0 ? Math.round(Number(ttfbSum) / numTtfb) : null;
    const realFcp = numFcp > 0 ? Number((Number(fcpSum) / numFcp / 1000).toFixed(2)) : null;
    const realLcp = numLcp > 0 ? Number((Number(lcpSum) / numLcp / 1000).toFixed(2)) : null;
    const realCls = numCls > 0 ? Number((Number(clsSum) / numCls).toFixed(3)) : null;
    const realInp = numInp > 0 ? Math.round(Number(inpSum) / numInp) : null;

    let score: number | null = null;
    let status = 'În Calibrare';
    if (totalSamples > 0) {
      let baseScore = 100;
      if (realFcp !== null && realFcp > 1.8) baseScore -= 10;
      if (realFcp !== null && realFcp > 3.0) baseScore -= 10;
      if (realLcp !== null && realLcp > 2.5) baseScore -= 15;
      if (realLcp !== null && realLcp > 4.0) baseScore -= 20;
      if (realCls !== null && realCls > 0.1) baseScore -= 15;
      if (realCls !== null && realCls > 0.25) baseScore -= 15;
      if (realTtfb !== null && realTtfb > 600) baseScore -= 10;
      if (realTtfb !== null && realTtfb > 1200) baseScore -= 15;
      if (realInp !== null && realInp > 200) baseScore -= 10;
      score = Math.max(50, Math.min(100, baseScore));
      status = score >= 90 ? 'Excelent' : score >= 75 ? 'Bun' : 'Necesită Atenție';
    }

    const speedInsights = {
      score,
      status,
      totalSamples,
      isLive: totalSamples > 0,
      lcp: {
        value: realLcp !== null ? `${realLcp}s` : null,
        samples: numLcp,
        rating: realLcp !== null ? (realLcp <= 2.5 ? ('good' as const) : realLcp <= 4.0 ? ('needs-improvement' as const) : ('poor' as const)) : null
      },
      fcp: {
        value: realFcp !== null ? `${realFcp}s` : null,
        samples: numFcp,
        rating: realFcp !== null ? (realFcp <= 1.8 ? ('good' as const) : realFcp <= 3.0 ? ('needs-improvement' as const) : ('poor' as const)) : null
      },
      inp: {
        value: realInp !== null ? `${realInp}ms` : null,
        samples: numInp,
        rating: realInp !== null ? (realInp <= 200 ? ('good' as const) : realInp <= 500 ? ('needs-improvement' as const) : ('poor' as const)) : null
      },
      cls: {
        value: realCls !== null ? String(realCls) : null,
        samples: numCls,
        rating: realCls !== null ? (realCls <= 0.1 ? ('good' as const) : realCls <= 0.25 ? ('needs-improvement' as const) : ('poor' as const)) : null
      },
      ttfb: {
        value: realTtfb !== null ? `${realTtfb}ms` : null,
        samples: numTtfb,
        rating: realTtfb !== null ? (realTtfb <= 600 ? ('good' as const) : ('needs-improvement' as const)) : null
      }
    };

    return {
      ...conversionMetrics,
      activeUsers: Number(activeUsersCount) || 0,
      referrers,
      topPages,
      devices,
      browsers,
      operatingSystems,
      trafficCountries,
      trafficCities,
      utmSources,
      utmCampaigns,
      speedInsights,
      hasVercelDirect: !!(process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID)
    };
  } catch (err) {
    console.error('⚠️ [Analytics Tracker] Error building extended web analytics:', err);
    return {
      ...conversionMetrics,
      activeUsers: 0,
      referrers: [],
      topPages: [],
      devices: [],
      browsers: [],
      operatingSystems: [],
      trafficCountries: [],
      trafficCities: [],
      utmSources: [],
      utmCampaigns: [],
      speedInsights: {
        score: null,
        status: 'În Calibrare',
        totalSamples: 0,
        isLive: false,
        lcp: { value: null, samples: 0, rating: null },
        fcp: { value: null, samples: 0, rating: null },
        inp: { value: null, samples: 0, rating: null },
        cls: { value: null, samples: 0, rating: null },
        ttfb: { value: null, samples: 0, rating: null }
      },
      hasVercelDirect: false
    };
  }
}
