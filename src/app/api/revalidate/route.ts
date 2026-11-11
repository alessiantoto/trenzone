import { revalidateTag, revalidatePath } from 'next/cache';
import { isAdminAuthorized } from '@/app/actions/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const isAuthorized = await isAdminAuthorized();
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  const isSecretMatch = Boolean(secret && authHeader === `Bearer ${secret}`);

  if (!isAuthorized && !isSecretMatch) {
    return new Response('Unauthorized', { status: 401 });
  }

  revalidateTag('influencers', 'max');
  revalidateTag('reviews', 'max');
  revalidateTag('products', 'max');
  revalidateTag('global_settings', 'max');
  revalidateTag('store_settings', 'max');
  revalidatePath('/', 'layout');
  revalidatePath('/api/products');
  revalidatePath('/api/reviews');
  revalidatePath('/api/sameday/lockers');
  revalidatePath('/sitemap.xml');
  return new Response('All caches cleared successfully', { 
    status: 200,
    headers: { 'Cache-Control': 'no-store, max-age=0' }
  });
}
