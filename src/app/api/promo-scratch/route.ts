import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { normalizePromoSettings } from '@/lib/promo-config';
import {
  cleanupExpiredScratchCoupons,
  generateUniqueScratchCode,
  pickWeightedScratchDiscount,
} from '@/lib/scratch-coupons';
import { rateLimiters, getClientIpFromHeaders, checkRateLimit } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const headersList = await headers();
    const ip = getClientIpFromHeaders(headersList);
    const { allowed } = await checkRateLimit(rateLimiters.checkoutUpdate, ip, 'promo-scratch');
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
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
        { status: 400 }
      );
    }

    const discountPercent = pickWeightedScratchDiscount(config.scratchWeights);
    const ttlHours = Math.max(1, Math.min(168, Number(config.scratchTtlHours) || 24));
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();

    let createdCoupon: any = null;
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
        .select('*')
        .single();

      if (!error && data) {
        createdCoupon = data;
        break;
      }
    }

    if (!createdCoupon) {
      return NextResponse.json(
        { success: false, error: 'Nu s-a putut genera codul promoțional unic.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        code: createdCoupon.code,
        discountPercent,
        expiresAt,
        ttlHours,
        coupon: createdCoupon,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    );
  } catch (err: any) {
    console.error('[promo-scratch] Error generating scratch coupon:', err);
    return NextResponse.json(
      { success: false, error: 'Eroare internă la generarea premiului.' },
      { status: 500 }
    );
  }
}

