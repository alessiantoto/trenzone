'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { unstable_cache } from 'next/cache';
import type { Review } from '@/lib/api';

const getCachedAllReviews = unstable_cache(
  async (): Promise<(Review & { product: { name: string, slug: string, image: string } })[]> => {
    const { data, error } = await supabaseAdmin
      .from('reviews')
      .select('*, product:products(name, slug, main_image)')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all reviews:', error);
      return [];
    }

    return (data as any[]).map(r => {
      const validImages = Array.isArray(r.images) 
        ? r.images.filter((img: string) => typeof img === 'string' && !img.includes('cdn.shopify.com')) 
        : [];
      const validSingle = typeof r.image_url === 'string' && !r.image_url.includes('cdn.shopify.com') ? r.image_url : null;
      if (validSingle && !validImages.includes(validSingle)) {
        validImages.unshift(validSingle);
      }

      const { email: _stripEmail, ...safeReview } = r;
      return {
        ...safeReview,
        image_url: validSingle || (validImages.length > 0 ? validImages[0] : null),
        images: validImages,
        product: {
          name: r.product?.name || 'Produs TrenZone',
          slug: r.product?.slug || '#',
          image: typeof r.product?.main_image === 'string' && !r.product.main_image.includes('cdn.shopify.com') ? r.product.main_image : ''
        }
      };
    });
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
    const { data, error } = await supabaseAdmin
      .from('reviews')
      .select('*, product:products(name, slug, main_image)')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('Warning fetching featured reviews:', error);
      return [];
    }

    return (data as any[]).map(r => {
      const validImages = Array.isArray(r.images) 
        ? r.images.filter((img: string) => typeof img === 'string' && !img.includes('cdn.shopify.com')) 
        : [];
      const validSingle = typeof r.image_url === 'string' && !r.image_url.includes('cdn.shopify.com') ? r.image_url : null;
      if (validSingle && !validImages.includes(validSingle)) {
        validImages.unshift(validSingle);
      }

      const { email: _stripEmail, ...safeReview } = r;
      return {
        ...safeReview,
        image_url: validSingle || (validImages.length > 0 ? validImages[0] : null),
        images: validImages,
        product: {
          name: r.product?.name || 'Produs TrenZone',
          slug: r.product?.slug || '#',
          image: typeof r.product?.main_image === 'string' && !r.product.main_image.includes('cdn.shopify.com') ? r.product.main_image : ''
        }
      };
    });
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
