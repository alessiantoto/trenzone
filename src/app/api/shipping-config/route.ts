import { NextResponse } from 'next/server';
import { getShippingConfig } from '@/app/actions/shipping';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await getShippingConfig();
    return NextResponse.json(
      { success: true, config },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
