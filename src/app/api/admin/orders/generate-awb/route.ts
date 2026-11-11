import { NextResponse } from 'next/server';
import { generateManualAwbAction } from '@/app/actions/awb';
import { isAdminAuthorized } from '@/app/actions/admin-auth';

export async function POST(request: Request) {
  try {
    const isAuthorized = await isAdminAuthorized();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { orderIds } = await request.json();
    
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ success: false, error: 'Invalid orderIds' }, { status: 400 });
    }

    const result = await generateManualAwbAction(orderIds);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in API generate AWB:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
