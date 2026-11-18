import { NextResponse } from 'next/server';
import { fetchSamedayLockers } from '@/lib/sameday-api';

export const revalidate = 2592000;

export async function GET() {
  try {
    const lockersData = await fetchSamedayLockers();
    return NextResponse.json(lockersData, {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=2592000, stale-while-revalidate=2592000',
        'CDN-Cache-Control': 'public, s-maxage=2592000',
      },
    });
  } catch (error) {
    console.error('Failed to fetch Sameday lockers:', error);
    return NextResponse.json({ error: 'Failed to fetch lockers' }, { status: 500 });
  }
}
