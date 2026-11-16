"use server";

import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminAuthorized } from './admin-auth';
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { uploadToR2, deleteFromR2, getR2PublicBaseUrl } from '@/lib/r2';
import {
  attachReviewTranslations,
  deleteReviewTranslation,
  getReviewTranslationsMap,
  upsertReviewTranslation,
} from '@/lib/review-i18n';
import { extractReviewImages } from '@/lib/utils/reviews';

function revalidateReviewCaches() {
  revalidateTag('reviews', 'max');
  revalidatePath('/', 'layout');
  revalidatePath('/api/reviews');
  revalidatePath('/ro/reviews', 'page');
  revalidatePath('/en/reviews', 'page');
  revalidatePath('/admin/reviews');
}

const getCachedReviewsStats = unstable_cache(
  async (): Promise<{ count: number; average: number }> => {
    try {
      const { count, error } = await supabaseAdmin
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');

      const { data: ratings, error: rError } = await supabaseAdmin
        .from('reviews')
        .select('rating')
        .eq('status', 'approved');

      if (error || rError) throw error || rError;

      const total = ratings?.reduce((acc: number, r: any) => acc + (r.rating || 0), 0) || 0;
      const avg = ratings?.length ? (total / ratings.length).toFixed(1) : "4.9";

      return {
        count: count || 0,
        average: parseFloat(avg)
      };
    } catch (error: any) {
      return { count: 0, average: 5.0 };
    }
  },
  ['public-reviews-stats'],
  {
    revalidate: 2592000, // 30 days cache — purged on admin edit or manual cache clear
    tags: ['reviews']
  }
);

export async function getPublicReviewsStats() {
  return getCachedReviewsStats();
}

export async function getAllAdminReviews() {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error('Neautorizat');

  const [{ data, error }, translationsMap] = await Promise.all([
    supabaseAdmin
      .from('reviews')
      .select('*, product:products(name, slug, main_image)')
      .order('created_at', { ascending: false }),
    getReviewTranslationsMap(),
  ]);

  if (error) {
    console.error('Error fetching admin reviews:', error);
    return [];
  }

  const mapped = (data as any[]).map((r) => {
    const normalizedImages = extractReviewImages(r);
    return {
      ...r,
      image_url: normalizedImages[0] || null,
      images: normalizedImages,
      product: {
        name: r.product?.name || 'Produs',
        slug: r.product?.slug || '#',
        image: r.product?.main_image || '',
      },
    };
  });

  return attachReviewTranslations(mapped, translationsMap);
}

export async function updateReviewStatus(id: string, status: 'pending' | 'approved' | 'rejected') {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error('Neautorizat');

  const { data, error } = await supabaseAdmin
    .from('reviews')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  
  revalidateReviewCaches();
  
  return data;
}

export async function deleteReview(id: string) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error('Neautorizat');

  // 1. Preluăm recenzia pentru a afla ce imagini are atașate
  const { data: review } = await supabaseAdmin
    .from('reviews')
    .select('images, image_url')
    .eq('id', id)
    .single();

  // 2. Ștergem recenzia din baza de date
  const { error } = await supabaseAdmin
    .from('reviews')
    .delete()
    .eq('id', id);

  if (error) throw error;

  await deleteReviewTranslation(id);

  // 3. Ștergem imaginile din Cloudflare R2 sau Supabase Storage
  const imagesToDelete: string[] = [];
  if (review?.images && Array.isArray(review.images)) {
    imagesToDelete.push(...review.images.filter((img: any) => typeof img === 'string'));
  }
  if (review?.image_url && typeof review.image_url === 'string') {
    imagesToDelete.push(review.image_url);
  }

  const r2Base = getR2PublicBaseUrl();
  for (const img of imagesToDelete) {
    try {
      if (img.includes('r2.dev') || (r2Base && img.includes(r2Base))) {
        await deleteFromR2(img).catch(e => console.error('Failed to delete review image from R2:', e));
      } else {
        const urlParts = img.split('/review-images/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1].split('?')[0].split('#')[0];
          await supabaseAdmin.storage.from('review-images').remove([filePath]);
        }
      }
    } catch (e) {
      console.error("Failed to parse/delete image from storage", img);
    }
  }

  revalidateReviewCaches();

  return true;
}

export interface AdminReviewInput {
  product_id: string;
  customer_name: string;
  rating: number;
  comment_ro: string;
  comment_en: string;
  item_type_ro?: string;
  item_type_en?: string;
  fit_ro?: string;
  fit_en?: string;
  status?: 'pending' | 'approved' | 'rejected';
  images?: string[];
  locale?: string;
}

export async function addReview(reviewData: AdminReviewInput) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error('Neautorizat');

  const commentRo = String(reviewData.comment_ro || '').trim();
  const commentEn = String(reviewData.comment_en || '').trim();
  const cleanImages = Array.isArray(reviewData.images)
    ? reviewData.images.map((s) => String(s).trim()).filter(Boolean)
    : [];

  const payload = {
    product_id: reviewData.product_id,
    customer_name: String(reviewData.customer_name || '').trim(),
    rating: Math.min(5, Math.max(1, Math.round(Number(reviewData.rating) || 5))),
    comment: commentRo || commentEn,
    item_type: reviewData.item_type_ro?.trim() || reviewData.item_type_en?.trim() || null,
    fit: reviewData.fit_ro?.trim() || reviewData.fit_en?.trim() || null,
    image_url: cleanImages[0] || null,
    images: cleanImages,
    locale: reviewData.locale || 'ro',
    status: reviewData.status || 'approved',
  };

  const { data, error } = await supabaseAdmin
    .from('reviews')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;

  if (data?.id) {
    await upsertReviewTranslation(data.id, {
      ro: commentRo || commentEn,
      en: commentEn || commentRo,
      item_type_ro: reviewData.item_type_ro,
      item_type_en: reviewData.item_type_en,
      fit_ro: reviewData.fit_ro,
      fit_en: reviewData.fit_en,
    });
  }

  revalidateReviewCaches();
  return data;
}

export async function updateReviewAdmin(id: string, reviewData: AdminReviewInput) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error('Neautorizat');

  const commentRo = String(reviewData.comment_ro || '').trim();
  const commentEn = String(reviewData.comment_en || '').trim();
  const cleanImages = Array.isArray(reviewData.images)
    ? reviewData.images.map((s) => String(s).trim()).filter(Boolean)
    : [];

  const updatePayload: Record<string, any> = {
    product_id: reviewData.product_id,
    customer_name: String(reviewData.customer_name || '').trim(),
    rating: Math.min(5, Math.max(1, Math.round(Number(reviewData.rating) || 5))),
    comment: commentRo || commentEn,
    item_type: reviewData.item_type_ro?.trim() || reviewData.item_type_en?.trim() || null,
    fit: reviewData.fit_ro?.trim() || reviewData.fit_en?.trim() || null,
    image_url: cleanImages[0] || null,
    images: cleanImages,
  };

  if (reviewData.status) {
    updatePayload.status = reviewData.status;
  }

  const { data, error } = await supabaseAdmin
    .from('reviews')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  await upsertReviewTranslation(id, {
    ro: commentRo,
    en: commentEn,
    item_type_ro: reviewData.item_type_ro,
    item_type_en: reviewData.item_type_en,
    fit_ro: reviewData.fit_ro,
    fit_en: reviewData.fit_en,
  });

  revalidateReviewCaches();
  return data;
}

export async function uploadReviewImageAdmin(formData: FormData) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error('Neautorizat');

  const file = formData.get('file') as File;
  if (!file) throw new Error('Nu a fost furnizat niciun fișier');

  const rawExt = (file.name.split('.').pop() || '').toLowerCase();
  const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'];
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
  if (!allowedExts.includes(rawExt) || (file.type && !allowedMimes.includes(file.type))) {
    throw new Error('Format de imagine nepermis.');
  }
  const fileName = `reviews/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${rawExt}`;

  // 1. Prefer Cloudflare R2 if configured
  const r2Base = getR2PublicBaseUrl();
  if (process.env.R2_BUCKET_NAME && r2Base) {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const r2Url = await uploadToR2(buffer, fileName, file.type || `image/${rawExt === 'jpg' ? 'jpeg' : rawExt}`);
    return {
      success: true,
      url: r2Url
    };
  }

  // 2. Fallback to Supabase Storage
  const { error } = await supabaseAdmin.storage
    .from('review-images')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || `image/${rawExt === 'jpg' ? 'jpeg' : rawExt}`
    });

  if (error) {
    console.error('Upload review image error:', error);
    throw new Error(error.message);
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from('review-images')
    .getPublicUrl(fileName);

  return {
    success: true,
    url: publicUrlData.publicUrl
  };
}
