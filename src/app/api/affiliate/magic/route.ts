import { NextRequest, NextResponse } from 'next/server';
import {
  AFFILIATE_COOKIE_NAME,
  buildAffiliateSessionCookieValue,
  getAffiliateSessionCookieOptions,
  verifyAffiliateMagicToken,
} from '@/lib/affiliate-auth-core';

export async function HEAD() {
  // Ignore automated email link pre-scanners without consuming the single-use token
  return new NextResponse(null, { status: 200 });
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') || '';
  const origin = request.nextUrl.origin;

  if (!token) {
    return NextResponse.redirect(new URL('/ro/affiliate/login?error=magic_invalid', origin));
  }

  const verified = await verifyAffiliateMagicToken(token);
  if (!verified.ok) {
    const targetLocale = verified.locale === 'en' ? 'en' : 'ro';
    const errCode =
      verified.reason === 'expired'
        ? 'magic_expired'
        : verified.reason === 'inactive'
          ? 'magic_inactive'
          : 'magic_invalid';
    return NextResponse.redirect(new URL(`/${targetLocale}/affiliate/login?error=${errCode}`, origin));
  }

  const { encodedSession, savedLocale } = buildAffiliateSessionCookieValue(verified.affiliate);
  const response = NextResponse.redirect(new URL(`/${savedLocale}/affiliate/dashboard`, origin));
  response.cookies.set(AFFILIATE_COOKIE_NAME, encodedSession, getAffiliateSessionCookieOptions());
  response.headers.set('Cache-Control', 'no-store, private');
  return response;
}

