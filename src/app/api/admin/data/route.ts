import { NextResponse } from 'next/server';
import { getAdminReturns } from '@/app/actions/returns';
import { getAdminCustomers } from '@/app/actions/admin-data';
import { getAdminProductsServer } from '@/app/actions/products';
import { getAdminProductBySlug, updateProductAdmin } from '@/app/actions/admin-products';
import { getCoupons } from '@/app/actions/coupons';
import { getAllAdminReviews } from '@/app/actions/admin-reviews';
import { getInfluencersAdmin, getAdminSubscribersList, getMarketingAudienceStats } from '@/app/actions/admin-marketing';
import { getAdminLeads, getAdminBroadcasts, getAllEmails } from '@/app/actions/admin-data';
import { getAdminOrders } from '@/app/actions/admin-orders';
import { getAdminAffiliates } from '@/app/actions/admin-affiliates';
import { getShippingConfig, checkSamedayConnection, checkPacketaConnection } from '@/app/actions/shipping';
import { getGlobalSettings, getMaintenanceMode, getMaintenanceEndDate, getExchangeRates } from '@/app/actions/admin-settings';
import { getAdminUsers } from '@/app/actions/admin-users';
import { getEmailTemplates } from '@/app/actions/email-templates';
import { getEmailLogs } from '@/app/actions/email-logs';
import { getSiteSetting } from '@/app/actions/settings';
import { checkOblioStatusAction } from '@/app/actions/invoices';
import { getAdminAbandonedCarts } from '@/app/actions/abandoned-carts';
import { getFulfillmentSettings, getFulfillmentHistory, getFulfillmentPendingCount } from '@/app/actions/admin-fulfillment';

import { isAdminAuthorized } from '@/app/actions/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const isAuthorized = await isAdminAuthorized();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: 'Neautorizat' }, { status: 401 });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    let data: any = null;

    switch (action) {
      case 'abandoned-carts':
        data = await getAdminAbandonedCarts();
        break;
      case 'returns':
        data = await getAdminReturns();
        break;
      case 'customers':
        data = await getAdminCustomers();
        break;
      case 'products':
        data = await getAdminProductsServer();
        break;
      case 'product': {
        const slug = url.searchParams.get('slug');
        data = await getAdminProductBySlug(slug || '');
        break;
      }
      case 'coupons':
        data = await getCoupons();
        break;
      case 'reviews':
        data = await getAllAdminReviews();
        break;
      case 'influencers':
        data = await getInfluencersAdmin();
        break;
      case 'leads':
        data = await getAdminLeads();
        break;
      case 'orders':
        data = await getAdminOrders();
        break;
      case 'affiliates':
        data = await getAdminAffiliates();
        break;
      case 'shipping':
        data = await getShippingConfig();
        break;
      case 'settings':
        data = await getGlobalSettings(); // if it exists, but actually we need the separate ones
        break;
      case 'maintenance-mode':
        data = await getMaintenanceMode();
        break;
      case 'maintenance-end-date':
        data = await getMaintenanceEndDate();
        break;
      case 'exchange-rates':
        data = await getExchangeRates();
        break;
      case 'users':
        data = await getAdminUsers();
        break;
      case 'email-templates':
        data = await getEmailTemplates();
        break;
      case 'site-setting':
        const key = url.searchParams.get('key');
        if (key) {
          data = await getSiteSetting(key);
        }
        break;
      case 'oblio-status':
        data = await checkOblioStatusAction();
        break;
      case 'sameday-status':
        data = await checkSamedayConnection();
        break;
      case 'packeta-status':
        data = await checkPacketaConnection();
        break;
      case 'broadcasts':
        data = await getAdminBroadcasts();
        break;
      case 'subscribers':
        data = await getAdminSubscribersList();
        break;
      case 'audience-stats':
        data = await getMarketingAudienceStats();
        break;
      case 'all-emails':
        data = await getAllEmails();
        break;
      case 'email-logs':
        data = await getEmailLogs();
        break;
      case 'fulfillment-settings':
        data = await getFulfillmentSettings();
        break;
      case 'fulfillment-history':
        data = await getFulfillmentHistory();
        break;
      case 'fulfillment-counts':
        data = await getFulfillmentPendingCount();
        break;
      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const isAuthorized = await isAdminAuthorized();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: 'Neautorizat' }, { status: 401 });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const body = await request.json().catch(() => ({}));

    if (action === 'update-product') {
      const res = await updateProductAdmin(body);
      return NextResponse.json({ success: true, data: res });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

