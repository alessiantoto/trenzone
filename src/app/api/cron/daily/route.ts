import { NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/app/actions/admin-auth';

export const maxDuration = 60; // seconds

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isVercelSecret = Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);
  const isAuthorizedAdmin = await isAdminAuthorized().catch(() => false);

  if (!isVercelSecret && !isAuthorizedAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: any = {};

  // 1. Abandoned Carts
  try {
    console.log('[CRON DAILY] Starting abandoned carts...');
    const { GET: runAbandonedCarts } = await import('../abandoned-carts/route');
    const res1 = await runAbandonedCarts(request);
    results.abandonedCarts = res1.status === 200 ? await res1.json() : 'failed';
  } catch (err: any) {
    console.error('[CRON DAILY] Abandoned carts error:', err);
    results.abandonedCarts = { error: err.message };
  }

  // 2. Sync Tracking (AWB)
  try {
    console.log('[CRON DAILY] Starting sync tracking...');
    const { GET: runSyncTracking } = await import('../sync-tracking/route');
    const res2 = await runSyncTracking(request);
    results.syncTracking = res2.status === 200 ? await res2.json() : 'failed';
  } catch (err: any) {
    console.error('[CRON DAILY] Sync tracking error:', err);
    results.syncTracking = { error: err.message };
  }

  // 3. Send Reviews
  try {
    console.log('[CRON DAILY] Starting send reviews...');
    const { GET: runSendReviews } = await import('../send-reviews/route');
    const res3 = await runSendReviews(request);
    
    // send-reviews might return new NextResponse('Unauthorized') which isn't json, 
    // but on success it returns NextResponse.json()
    const contentType = res3.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      results.sendReviews = res3.status === 200 ? await res3.json() : 'failed';
    } else {
      results.sendReviews = res3.status === 200 ? await res3.text() : 'failed';
    }
  } catch (err: any) {
    console.error('[CRON DAILY] Send reviews error:', err);
    results.sendReviews = { error: err.message };
  }

  // 4. Fulfillment Dispatch (Daily 08:00 AM)
  try {
    console.log('[CRON DAILY] Starting fulfillment dispatch...');
    const { GET: runFulfillmentDispatch } = await import('../fulfillment-dispatch/route');
    const res4 = await runFulfillmentDispatch(request);
    results.fulfillmentDispatch = res4.status === 200 ? await res4.json() : 'failed';
  } catch (err: any) {
    console.error('[CRON DAILY] Fulfillment dispatch error:', err);
    results.fulfillmentDispatch = { error: err.message };
  }

  return NextResponse.json({ success: true, results });
}

