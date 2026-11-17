import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { normalizePromoSettings } from '@/lib/promo-config';
import {
  cleanupExpiredScratchCoupons,
  generateUniqueScratchCode,
  pickWeightedScratchDiscount,
} from '@/lib/scratch-coupons';
import { rateLimiters, getClientIpFromHeaders, checkRateLimit } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

const SCRATCH_COOKIE_NAME = 'tz_scratch_coupon';

export async function POST() {
  const noStoreHeaders = { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' };

  try {
    const headersList = await headers();
    const ip = getClientIpFromHeaders(headersList);
    const { allowed, retryAfter, headers: rlHeaders } = await checkRateLimit(
      rateLimiters.promoScratch,
      ip,
      'promoScratch'
    );
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.', retryAfter },
        { status: 429, headers: { ...rlHeaders, ...noStoreHeaders } }
      );
    }

    // Reuse active cookie-bound scratch coupon if already issued to this visitor
    const cookieStore = await cookies();
    const existingRaw = cookieStore.get(SCRATCH_COOKIE_NAME)?.value;
    if (existingRaw) {
      try {
        const parsed = JSON.parse(Buffer.from(existingRaw, 'base64').toString('utf8'));
        const existingCode = typeof parsed?.code === 'string' ? parsed.code.trim().toUpperCase() : '';
        if (/^SCRATCH-[A-Z0-9-]+$/i.test(existingCode)) {
          const { data: existingCoupon } = await supabaseAdmin
            .from('coupons')
            .select('code, value, expires_at, is_active, used_count, usage_limit')
            .eq('code', existingCode)
            .maybeSingle();

          const notExpired =
            !existingCoupon?.expires_at || new Date(existingCoupon.expires_at).getTime() > Date.now();
          const notExhausted =
            existingCoupon?.usage_limit == null ||
            Number(existingCoupon.used_count || 0) < Number(existingCoupon.usage_limit);

          if (existingCoupon && existingCoupon.is_active && notExpired && notExhausted) {
            return NextResponse.json(
              {
                success: true,
                code: existingCoupon.code,
                discountPercent: Number(existingCoupon.value),
                expiresAt: existingCoupon.expires_at || parsed.expiresAt,
              },
              { headers: noStoreHeaders }
            );
          }
        }
      } catch {
        // Invalid cookie payload — proceed to issue a fresh coupon
      }
    }

    // Opportunistic DB cleanup of expired unused scratch coupons
    await cleanupExpiredScratchCoupons();

    const { data: settingRow } = await supabaseAdmin
      .from('store_settings')
      .select('value')
      .eq('key', 'active_promotion')
      .maybeSingle();

    const config = normalizePromoSettings(settingRow?.value);
    if (!config.isActive) {
      return NextResponse.json(
        { success: false, error: 'Promoția nu este activă momentan.' },
        { status: 400, headers: noStoreHeaders }
      );
    }

    const discountPercent = pickWeightedScratchDiscount(config.scratchWeights);
    const ttlHours = Math.max(1, Math.min(168, Number(config.scratchTtlHours) || 24));
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();

    let createdCoupon: { code: string; value: number; expires_at: string } | null = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      const code = generateUniqueScratchCode();
      const { data, error } = await supabaseAdmin
        .from('coupons')
        .insert({
          code,
          description: `[AUTO_SCRATCH] Reducere ${discountPercent}% · unic ${ttlHours}h`,
          type: 'percentage',
          value: discountPercent,
          min_purchase: 0,
          usage_limit: 1,
          used_count: 0,
          expires_at: expiresAt,
          is_active: true,
          is_stackable: false,
        })
        .select('code, value, expires_at')
        .single();

      if (!error && data) {
        createdCoupon = data;
        break;
      }
    }

    if (!createdCoupon) {
      return NextResponse.json(
        { success: false, error: 'Nu s-a putut genera codul promoțional unic.' },
        { status: 500, headers: noStoreHeaders }
      );
    }

    try {
      cookieStore.set(
        SCRATCH_COOKIE_NAME,
        Buffer.from(
          JSON.stringify({
            code: createdCoupon.code,
            value: discountPercent,
            expiresAt,
          })
        ).toString('base64'),
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: ttlHours * 3600,
          path: '/',
        }
      );
    } catch {
      // Non-fatal if cookie cannot be written
    }

    return NextResponse.json(
      {
        success: true,
        code: createdCoupon.code,
        discountPercent,
        expiresAt,
        ttlHours,
      },
      { headers: noStoreHeaders }
    );
  } catch (err: any) {
    console.error('[promo-scratch] Error generating scratch coupon:', err);
    return NextResponse.json(
      { success: false, error: 'Eroare internă la generarea premiului.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
