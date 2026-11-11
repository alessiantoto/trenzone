import { NextResponse } from 'next/server';
import { getShippingConfig } from '@/app/actions/shipping';

export async function GET() {
  try {
    const config = await getShippingConfig();
    return NextResponse.json(
      { success: true, config },
      {
        headers: {
          // Cache at Vercel Edge for 1 hour — shipping config rarely changes, and admin actions
          // trigger revalidation. This prevents every CartSheet open from hitting the function.
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
