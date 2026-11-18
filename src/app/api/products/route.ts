import { NextResponse } from 'next/server';
import { getProductsServer } from '@/app/actions/products';

// Cache public product catalog for 30 days at edge/ISR (purged instantly on Admin Save or Clear Cache)
export const revalidate = 2592000;

export async function GET() {
  try {
    const products = await getProductsServer();
    return NextResponse.json(
      { success: true, products },
      {
        headers: {
          'Cache-Control': 'public, max-age=60, s-maxage=2592000, stale-while-revalidate=2592000',
          'CDN-Cache-Control': 'public, s-maxage=2592000',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
