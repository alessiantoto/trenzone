import { NextResponse } from 'next/server';
import { getProductsServer } from '@/app/actions/products';

// Cache public product catalog for 60s at edge CDN (fast shield on traffic spikes + auto-fresh within 1 min on price/stock edits)
export const revalidate = 60;

export async function GET() {
  try {
    const products = await getProductsServer();
    return NextResponse.json(
      { success: true, products },
      {
        headers: {
          'Cache-Control': 'public, max-age=15, s-maxage=60, stale-while-revalidate=300',
          'CDN-Cache-Control': 'public, s-maxage=60',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
