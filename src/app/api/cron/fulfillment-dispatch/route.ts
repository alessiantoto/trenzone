import { NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/app/actions/admin-auth';
import { getFulfillmentSettings, dispatchOrdersToFulfillment } from '@/app/actions/admin-fulfillment';

export const maxDuration = 60; // 60 seconds

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isVercelSecret = Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);
  const isAuthorizedAdmin = await isAdminAuthorized().catch(() => false);

  if (!isVercelSecret && !isAuthorizedAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const settings = await getFulfillmentSettings();
    if (!settings.email || !settings.email.trim()) {
      return NextResponse.json({
        skipped: true,
        reason: 'No fulfillment email configured'
      });
    }

    if (settings.auto_dispatch_enabled === false) {
      return NextResponse.json({
        skipped: true,
        reason: 'Auto dispatch is disabled in fulfillment settings'
      });
    }

    console.log('[CRON FULFILLMENT] Executing 08:00 AM dispatch to:', settings.email);
    const result = await dispatchOrdersToFulfillment({
      trigger: 'scheduled_8am',
      forceResend: false,
      allowUnreleasedPreorderOverride: false,
    });

    if ((result.excludedPreorders && result.excludedPreorders > 0) || (result.excludedLiveOutOfStock && result.excludedLiveOutOfStock > 0)) {
      console.log(
        `[CRON FULFILLMENT] Safely held back ${result.excludedLiveOutOfStock || 0} live out-of-stock/preorder order(s) and ${result.excludedPreorders || 0} preorder(s) (${result.excludedMixedPreorders || 0} mixed):`,
        result.skippedPreorderOrderIds || []
      );
    }

    if (result.busy) {
      return NextResponse.json({
        success: false,
        skipped: true,
        busy: true,
        timestamp: new Date().toISOString(),
        result,
      }, { status: 409 });
    }

    if (!result.success) {
      return NextResponse.json({
        success: false,
        timestamp: new Date().toISOString(),
        error: result.error || 'Fulfillment dispatch failed',
        result,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result
    });
  } catch (error: any) {
    console.error('[CRON FULFILLMENT] Dispatch error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
