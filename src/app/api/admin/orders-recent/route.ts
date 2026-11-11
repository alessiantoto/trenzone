import { NextResponse } from 'next/server';
import { getAdminRecentOrders } from '@/app/actions/admin-data';
import { isAdminAuthorized } from '@/app/actions/admin-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const isAuthorized = await isAdminAuthorized();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: 'Neautorizat' }, { status: 401 });
    }

    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit')) || 5;
    
    const orders = await getAdminRecentOrders(limit);
    return NextResponse.json({ success: true, orders });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
