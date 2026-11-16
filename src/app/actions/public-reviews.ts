'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { unstable_cache } from 'next/cache';
import type { Review } from '@/lib/api';
import { attachReviewTranslations, getReviewTranslationsMap } from '@/lib/review-i18n';
import { extractReviewImages } from '@/lib/utils/reviews';

function normalizePublicReviewRows(
  data: any[],
  translationsMap: Record<string, any>
): (Review & { product: { name: string; slug: string; image: string } })[] {
  const mapped = (data || []).map((r) => {
    const validImages = extractReviewImages(r);
    const { email: _stripEmail, ...safeReview } = r;
    return {
      ...safeReview,
      image_url: validImages[0] || null,
      images: validImages,
      product: {
        name: r.product?.name || 'Produs TrenZone',
        slug: r.product?.slug || '#',
        image:
          typeof r.product?.main_image === 'string' && !r.product.main_image.includes('cdn.shopify.com')
            ? r.product.main_image
            : '',
      },
    };
  });

  return attachReviewTranslations(mapped, translationsMap);
}

const getCachedAllReviews = unstable_cache(
  async (): Promise<(Review & { product: { name: string, slug: string, image: string } })[]> => {
    const [{ data, error }, translationsMap] = await Promise.all([
      supabaseAdmin
        .from('reviews')
        .select('*, product:products(name, slug, main_image)')
        .eq('status', 'approved')
        .order('created_at', { ascending: false }),
      getReviewTranslationsMap(),
    ]);

    if (error) {
      console.error('Error fetching all reviews:', error);
      return [];
    }

    return normalizePublicReviewRows(data as any[], translationsMap);
  },
  ['public-all-reviews'],
  {
    revalidate: 2592000, // 30 days cache
    tags: ['reviews']
  }
);

export async function getAllReviewsServer() {
  return getCachedAllReviews();
}

const getCachedFeaturedReviews = unstable_cache(
  async (limit: number = 6): Promise<(Review & { product: { name: string, slug: string, image: string } })[]> => {
    const [{ data, error }, translationsMap] = await Promise.all([
      supabaseAdmin
        .from('reviews')
        .select('*, product:products(name, slug, main_image)')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(limit),
      getReviewTranslationsMap(),
    ]);

    if (error) {
      console.warn('Warning fetching featured reviews:', error);
      return [];
    }

    return normalizePublicReviewRows(data as any[], translationsMap);
  },
  ['public-featured-reviews'],
  {
    revalidate: 2592000, // 30 days cache
    tags: ['reviews']
  }
);

export async function getFeaturedReviewsServer(limit: number = 6) {
  return getCachedFeaturedReviews(limit);
}
