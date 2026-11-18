import { NextResponse } from 'next/server';
import { getShippingConfig } from '@/app/actions/shipping';

export const revalidate = 2592000;

export async function GET() {
  try {
    const config = await getShippingConfig();
    return NextResponse.json(
      { success: true, config },
      {
        headers: {
          'Cache-Control': 'public, max-age=300, s-maxage=2592000, stale-while-revalidate=2592000',
          'CDN-Cache-Control': 'public, s-maxage=2592000, stale-while-revalidate=2592000',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
