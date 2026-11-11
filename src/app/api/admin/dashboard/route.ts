import { NextResponse } from 'next/server';
import { getDashboardStats } from '@/app/actions/admin-data';
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
    const startDate = url.searchParams.get('startDate') || undefined;
    const endDate = url.searchParams.get('endDate') || undefined;
    
    const stats = await getDashboardStats(startDate, endDate);
    return NextResponse.json({ success: true, stats });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
