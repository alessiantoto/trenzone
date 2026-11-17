import { NextRequest, NextResponse } from 'next/server';
import { recordStoreEvent, AnalyticsEventType } from '@/lib/analytics';
import { rateLimiters, getClientIp, checkRateLimit } from '@/lib/ratelimit';

const MAX_BODY_BYTES = 8192;

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'id_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

function sanitizeTrackingId(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const clean = raw.trim();
  if (!/^[a-zA-Z0-9_-]{10,64}$/.test(clean)) return undefined;
  return clean;
}

function sanitizeVitals(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const v = raw as Record<string, unknown>;
  const numInRange = (val: unknown, max: number): number | undefined => {
    if (typeof val !== 'number' || !Number.isFinite(val) || val < 0 || val > max) return undefined;
    return val;
  };
  const result = {
    ttfb: numInRange(v.ttfb, 60000),
    fcp: numInRange(v.fcp, 60000),
    lcp: numInRange(v.lcp, 120000),
    cls: numInRange(v.cls, 10),
    inp: numInRange(v.inp, 60000),
  };
  if (Object.values(result).every((x) => x === undefined)) return undefined;
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ success: false, error: 'Payload too large' }, { status: 413 });
    }

    const ip = getClientIp(req);
    const { allowed, retryAfter, headers: rlHeaders } = await checkRateLimit(
      rateLimiters.analyticsTrack,
      ip,
      'analyticsTrack'
    );
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded', retryAfter },
        { status: 429, headers: rlHeaders }
      );
    }

    const rawText = await req.text();
    if (rawText.length > MAX_BODY_BYTES) {
      return NextResponse.json({ success: false, error: 'Payload too large' }, { status: 413 });
    }

    let body: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(rawText || '{}');
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        body = parsed as Record<string, unknown>;
      }
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
    }

    const eventType: AnalyticsEventType =
      typeof body.event === 'string' && ['pageview', 'cart', 'checkout', 'vitals'].includes(body.event)
        ? (body.event as AnalyticsEventType)
        : 'pageview';

    // 1. Manage persistent Visitor ID (1 year) - prefer cookie, then validated body, then generate
    const visitorId =
      sanitizeTrackingId(req.cookies.get('tz_vid')?.value) ||
      sanitizeTrackingId(body.visitorId) ||
      generateId();

    // 2. Manage Session ID (30-minute sliding window) - prefer cookie, then validated body, then generate
    const sessionId =
      sanitizeTrackingId(req.cookies.get('tz_sid')?.value) ||
      sanitizeTrackingId(body.sessionId) ||
      generateId();

    const userAgent = (req.headers.get('user-agent') || '').slice(0, 500);
    if (/bot|crawler|spider|bytespider|facebookexternalhit|lighthouse|headless|prerender/i.test(userAgent)) {
      return NextResponse.json({ success: true, skipped: true });
    }
    const countryCode = (req.headers.get('x-vercel-ip-country') || req.headers.get('cf-ipcountry') || '').slice(0, 8);
    const rawCity = req.headers.get('x-vercel-ip-city') || '';
    let city = rawCity.slice(0, 100);
    try {
      if (rawCity) city = decodeURIComponent(rawCity).slice(0, 100);
    } catch {}

    const safePath =
      typeof body.path === 'string' && body.path.startsWith('/') ? body.path.slice(0, 500) : undefined;
    const safeReferrer = typeof body.referrer === 'string' ? body.referrer.slice(0, 500) : undefined;
    const safeSearch = typeof body.search === 'string' ? body.search.slice(0, 300) : undefined;
    const safeScreenWidth =
      typeof body.screenWidth === 'number' &&
      Number.isFinite(body.screenWidth) &&
      body.screenWidth >= 0 &&
      body.screenWidth <= 10000
        ? Math.round(body.screenWidth)
        : undefined;

    // 3. Record in Redis with rich telemetry
    await recordStoreEvent(eventType, visitorId, sessionId, undefined, {
      path: safePath,
      referrer: safeReferrer,
      search: safeSearch,
      screenWidth: safeScreenWidth,
      userAgent,
      countryCode,
      city,
      vitals: sanitizeVitals(body.vitals),
    });

    // 4. Return response with refreshed cookies
    const res = NextResponse.json({ success: true, visitorId, sessionId });
    const isProd = process.env.NODE_ENV === 'production';

    res.cookies.set({
      name: 'tz_vid',
      value: visitorId,
      maxAge: 365 * 24 * 60 * 60,
      path: '/',
      sameSite: 'lax',
      secure: isProd,
      httpOnly: false,
    });

    res.cookies.set({
      name: 'tz_sid',
      value: sessionId,
      maxAge: 30 * 60,
      path: '/',
      sameSite: 'lax',
      secure: isProd,
      httpOnly: false,
    });

    return res;
  } catch (error) {
    console.error('[Analytics Route] Failed to track event:', error);
    return NextResponse.json({ success: false, error: 'Failed to track event' }, { status: 500 });
  }
}
