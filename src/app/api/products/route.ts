import { NextResponse } from 'next/server';
import { getProductsServer } from '@/app/actions/products';

// Cache public product catalog for 24h at edge CDN (admin product edits purge immediately)
export const revalidate = 86400;

export async function GET() {
  try {
    const products = await getProductsServer();
    return NextResponse.json(
      { success: true, products },
      {
        headers: {
          'Cache-Control': 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800',
          'CDN-Cache-Control': 'public, s-maxage=86400',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
