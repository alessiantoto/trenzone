import { NextResponse } from 'next/server';
import { syncUndeliveredOrdersTracking } from '@/lib/tracking-sync';
import { isAdminAuthorized } from '@/app/actions/admin-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Max allowed for Vercel Hobby/Pro functions

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isVercelSecret = Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);
  const isAuthorizedAdmin = await isAdminAuthorized().catch(() => false);

  if (!isVercelSecret && !isAuthorizedAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await syncUndeliveredOrdersTracking(100);
    return NextResponse.json({
      success: true,
      message: `Tracking sync completed. Checked ${result.totalChecked} orders, updated ${result.updatedCount}, delivered ${result.deliveredCount}.`,
      result
    });
  } catch (error: any) {
    console.error('[CRON TRACKING] Error executing sync:', error);
    return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
  }
}
