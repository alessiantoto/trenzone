import { NextResponse } from 'next/server';
import { getShippingConfig } from '@/app/actions/shipping';

export const revalidate = 3600;

export async function GET() {
  try {
    const config = await getShippingConfig();
    return NextResponse.json(
      { success: true, config },
      {
        headers: {
          'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
          'CDN-Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
