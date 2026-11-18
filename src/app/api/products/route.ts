import { NextResponse } from 'next/server';
import { getProductsServer } from '@/app/actions/products';

// Cache public product catalog for 1h at edge CDN (purged immediately via revalidatePath + Cloudflare API on Admin Save)
export const revalidate = 3600;

export async function GET() {
  try {
    const products = await getProductsServer();
    return NextResponse.json(
      { success: true, products },
      {
        headers: {
          'Cache-Control': 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400',
          'CDN-Cache-Control': 'public, s-maxage=3600',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
