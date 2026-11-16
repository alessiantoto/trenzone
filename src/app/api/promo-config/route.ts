import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { normalizePromoSettings, ResolvedPromoConfig } from '@/lib/promo-config';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: settingRow } = await supabaseAdmin
      .from('store_settings')
      .select('value')
      .eq('key', 'active_promotion')
      .maybeSingle();

    const promo = normalizePromoSettings(settingRow?.value);

    // Check promotion expiration date
    let isExpired = false;
    if (promo.endDate) {
      const endMs = new Date(promo.endDate).getTime();
      if (!Number.isNaN(endMs) && Date.now() > endMs) {
        isExpired = true;
      }
    }

    // Fetch linked coupon from DB (if couponId set)
    let couponCode = promo.couponId;
    let couponType: ResolvedPromoConfig['couponType'] = 'percentage';
    let couponValue = 5;
    let couponActive = Boolean(promo.couponId);

    if (promo.couponId) {
      const { data: couponRow } = await supabaseAdmin
        .from('coupons')
        .select('code, type, value, is_active, starts_at, expires_at, usage_limit, used_count')
        .ilike('code', promo.couponId)
        .maybeSingle();

      if (couponRow) {
        couponCode = couponRow.code;
        couponType = couponRow.type || 'percentage';
        couponValue = Number(couponRow.value ?? 5);

        const now = Date.now();
        const notStarted = couponRow.starts_at && now < new Date(couponRow.starts_at).getTime();
        const couponExpired = couponRow.expires_at && now > new Date(couponRow.expires_at).getTime();
        const exhausted =
          couponRow.usage_limit !== null &&
          couponRow.usage_limit !== undefined &&
          Number(couponRow.used_count || 0) >= Number(couponRow.usage_limit);

        couponActive = Boolean(couponRow.is_active) && !notStarted && !couponExpired && !exhausted;
      }
    }

    const payload: ResolvedPromoConfig = {
      ...promo,
      isActive: promo.isActive && !isExpired && couponActive,
      couponCode,
      couponType,
      couponValue,
    };

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    });
  } catch (err) {
    console.error('[promo-config] Failed to fetch active_promotion:', err);
    const fallback = normalizePromoSettings(null);
    return NextResponse.json(
      {
        ...fallback,
        couponCode: fallback.couponId,
        couponType: 'percentage',
        couponValue: 5,
      } satisfies ResolvedPromoConfig,
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    );
  }
}

