"use server";

import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminAuthorized } from './admin-auth';
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { uploadToR2, deleteFromR2, getR2PublicBaseUrl } from '@/lib/r2';

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

  const { data, error } = await supabaseAdmin
    .from('reviews')
    .select('*, product:products(name, slug, main_image)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching admin reviews:', error);
    return [];
  }

  return (data as any[]).map(r => {
    let normalizedImages: string[] = [];
    if (r.image_url && typeof r.image_url === 'string' && r.image_url.trim()) {
      normalizedImages.push(r.image_url.trim());
    }
    if (r.images) {
      if (Array.isArray(r.images)) {
        r.images.forEach((img: any) => {
          if (typeof img === 'string' && img.trim() && !normalizedImages.includes(img.trim())) {
            normalizedImages.push(img.trim());
          }
        });
      } else if (typeof r.images === 'string') {
        try {
          const parsed = JSON.parse(r.images);
          if (Array.isArray(parsed)) {
            parsed.forEach((img: any) => {
              if (typeof img === 'string' && img.trim() && !normalizedImages.includes(img.trim())) {
                normalizedImages.push(img.trim());
              }
            });
          } else if (r.images.trim() && !normalizedImages.includes(r.images.trim())) {
            normalizedImages.push(r.images.trim());
          }
        } catch {
          if (r.images.trim() && !normalizedImages.includes(r.images.trim())) {
            normalizedImages.push(r.images.trim());
          }
        }
      }
    }

    return {
      ...r,
      images: normalizedImages,
      product: {
        name: r.product?.name || 'Produs',
        slug: r.product?.slug || '#',
        image: r.product?.main_image || ''
      }
    };
  });
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
  
  // Revalidate frontend caches so reviews appear immediately
  revalidateTag('reviews', 'max');
  revalidatePath('/', 'layout');
  revalidatePath('/api/reviews');
  revalidatePath('/ro/reviews', 'page');
  revalidatePath('/en/reviews', 'page');
  revalidatePath('/admin/reviews');
  
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

  // Revalidate frontend caches
  revalidateTag('reviews', 'max');
  revalidatePath('/', 'layout');
  revalidatePath('/api/reviews');
  revalidatePath('/ro/reviews', 'page');
  revalidatePath('/en/reviews', 'page');
  revalidatePath('/admin/reviews');

  return true;
}

export async function addReview(reviewData: any) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error('Neautorizat');

  const payload = {
    status: 'approved',
    is_verified_buyer: true,
    ...reviewData,
  };

  const { data, error } = await supabaseAdmin
    .from('reviews')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  
  // Revalidate frontend caches
  revalidateTag('reviews', 'max');
  revalidatePath('/', 'layout');
  revalidatePath('/api/reviews');
  revalidatePath('/ro/reviews', 'page');
  revalidatePath('/en/reviews', 'page');
  revalidatePath('/admin/reviews');
  
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
