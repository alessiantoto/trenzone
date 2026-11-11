import { NextResponse } from 'next/server';
import { getAdminOrders } from '@/app/actions/admin-orders';
import { isAdminAuthorized } from '@/app/actions/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const isAuthorized = await isAdminAuthorized();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: 'Neautorizat' }, { status: 401 });
    }

    const orders = await getAdminOrders();
    return NextResponse.json({ success: true, orders });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
