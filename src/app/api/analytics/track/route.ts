import { NextRequest, NextResponse } from 'next/server';
import { recordStoreEvent, AnalyticsEventType } from '@/lib/analytics';

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'id_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const eventType: AnalyticsEventType = ['pageview', 'cart', 'checkout', 'vitals'].includes(body?.event)
      ? body.event
      : 'pageview';

    // 1. Manage persistent Visitor ID (1 year) - prefer cookie, then body, then generate
    let visitorId = req.cookies.get('tz_vid')?.value || (typeof body?.visitorId === 'string' && body.visitorId.length >= 10 ? body.visitorId : undefined);
    if (!visitorId || visitorId.length < 10) {
      visitorId = generateId();
    }

    // 2. Manage Session ID (30-minute sliding window) - prefer cookie, then body, then generate
    let sessionId = req.cookies.get('tz_sid')?.value || (typeof body?.sessionId === 'string' && body.sessionId.length >= 10 ? body.sessionId : undefined);
    if (!sessionId || sessionId.length < 10) {
      sessionId = generateId();
    }

    const userAgent = req.headers.get('user-agent') || '';
    if (/bot|crawler|spider|bytespider|facebookexternalhit|lighthouse|headless|prerender/i.test(userAgent)) {
      return NextResponse.json({ success: true, skipped: true });
    }
    const countryCode = req.headers.get('x-vercel-ip-country') || req.headers.get('cf-ipcountry') || '';
    let rawCity = req.headers.get('x-vercel-ip-city') || '';
    let city = rawCity;
    try {
      if (rawCity) city = decodeURIComponent(rawCity);
    } catch {}

    // 3. Record in Redis with rich telemetry
    await recordStoreEvent(eventType, visitorId, sessionId, undefined, {
      path: typeof body?.path === 'string' ? body.path : undefined,
      referrer: typeof body?.referrer === 'string' ? body.referrer : undefined,
      search: typeof body?.search === 'string' ? body.search : undefined,
      screenWidth: typeof body?.screenWidth === 'number' ? body.screenWidth : undefined,
      userAgent,
      countryCode,
      city,
      vitals: body?.vitals,
    });

    // 4. Return response with refreshed cookies
    const res = NextResponse.json({ success: true, visitorId, sessionId });

    // Set visitor cookie (1 year)
    res.cookies.set({
      name: 'tz_vid',
      value: visitorId,
      maxAge: 365 * 24 * 60 * 60,
      path: '/',
      sameSite: 'lax',
      httpOnly: false,
    });

    // Set session cookie (30 minutes sliding window)
    res.cookies.set({
      name: 'tz_sid',
      value: sessionId,
      maxAge: 30 * 60,
      path: '/',
      sameSite: 'lax',
      httpOnly: false,
    });

    return res;
  } catch (error) {
    console.error('⚠️ [Analytics Route] Failed to track event:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

