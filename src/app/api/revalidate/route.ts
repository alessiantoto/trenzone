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

  revalidateTag('influencers', { expire: 0 });
  revalidateTag('reviews', { expire: 0 });
  revalidateTag('products', { expire: 0 });
  revalidateTag('global_settings', { expire: 0 });
  revalidateTag('store_settings', { expire: 0 });
  revalidatePath('/[locale]', 'layout');
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
