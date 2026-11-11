'use server';

import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath, revalidateTag } from 'next/cache';
import { Product } from '@/lib/api';
import { isAdminAuthorized } from './admin-auth';
import { uploadToR2, deleteFromR2, getR2PublicBaseUrl } from '@/lib/r2';

export async function getAdminProductBySlug(slugOrId: string): Promise<any | null> {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error('Neautorizat');

  if (!slugOrId) return null;
  const decoded = decodeURIComponent(slugOrId);
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decoded);

  let query = supabaseAdmin.from('products').select('*');
  if (isUUID) {
    query = query.or(`slug.eq.${decoded},id.eq.${decoded}`);
  } else {
    query = query.eq('slug', decoded);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error('Error fetching admin product:', error);
    return null;
  }

  if (!data) return null;

  const parseJsonSafe = (val: any) => {
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch (e) { return val; }
    }
    return val;
  };

  return {
    ...data,
    name: parseJsonSafe(data.name),
    description: parseJsonSafe(data.description),
    price: data.price_numeric !== null && data.price_numeric !== undefined ? Number(data.price_numeric) : 0,
    originalPrice: data.original_price_numeric !== null && data.original_price_numeric !== undefined ? Number(data.original_price_numeric) : undefined,
    badge: data.badge || null,
    image: data.main_image || '/images/placeholder.jpg',
    images: data.images && Array.isArray(data.images) && data.images.length > 0 ? data.images : (data.main_image ? [data.main_image] : ['/images/placeholder.jpg']),
    variants: parseJsonSafe(data.variants) || { type: 'flavor', options: [] },
    bundleVariants: parseJsonSafe(data.bundlevariants || data.bundleVariants),
    advantages: parseJsonSafe(data.advantages),
    usage_signs: parseJsonSafe(data.usage_signs),
    stock_quantity: data.stock_quantity ?? 0,
    weight: data.weight ?? 0.5,
    length_mm: data.length_mm ?? 100,
    width_mm: data.width_mm ?? 100,
    height_mm: data.height_mm ?? 100,
    is_active: data.is_active ?? true,
  };
}

export async function updateProductAdmin(product: Partial<Product> & { id: string }) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error('Neautorizat');

  // Format the product for the DB
  const updateData: any = {};

  if (product.name !== undefined) updateData.name = typeof product.name === 'string' ? { ro: product.name, en: product.name } : product.name;
  if (product.slug !== undefined) updateData.slug = product.slug;
  if (product.price !== undefined) updateData.price_numeric = product.price;
  if (product.originalPrice !== undefined) updateData.original_price_numeric = product.originalPrice;
  if (product.description !== undefined) updateData.description = typeof product.description === 'string' ? { ro: product.description, en: product.description } : product.description;
  if ((product as any).badge !== undefined) updateData.badge = (product as any).badge;
  if (product.image !== undefined) updateData.main_image = product.image;
  if (product.images !== undefined) {
    updateData.images = product.images;
    if (product.images.length > 0) {
      updateData.main_image = product.images[0];
    } else {
      updateData.main_image = null;
    }
  } 
  if (product.stock_quantity !== undefined) updateData.stock_quantity = product.stock_quantity;
  if (product.weight !== undefined) updateData.weight = product.weight;
  if (product.length_mm !== undefined) updateData.length_mm = product.length_mm;
  if (product.width_mm !== undefined) updateData.width_mm = product.width_mm;
  if (product.height_mm !== undefined) updateData.height_mm = product.height_mm;
  if (product.is_active !== undefined) updateData.is_active = product.is_active;
  if (product.variants !== undefined) updateData.variants = product.variants;
  if (product.bundleVariants !== undefined) updateData.bundlevariants = product.bundleVariants;
  if ((product as any).bundlevariants !== undefined) updateData.bundlevariants = (product as any).bundlevariants;
  if (product.advantages !== undefined) updateData.advantages = product.advantages;
  if (product.usage_signs !== undefined) updateData.usage_signs = product.usage_signs;

  // Check for deleted images to prevent ghost files
  const { data: oldProduct } = await supabaseAdmin
    .from('products')
    .select('images')
    .eq('id', product.id)
    .single();

  const { data, error } = await supabaseAdmin
    .from('products')
    .update(updateData)
    .eq('id', product.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating product:', error);
    throw new Error(error.message);
  }

  // Delete ghost files from storage
  if (oldProduct && oldProduct.images && updateData.images) {
    const deletedImages = oldProduct.images.filter((oldImg: string) => !updateData.images.includes(oldImg));
    if (deletedImages.length > 0) {
      await deleteFilesFromStorage(deletedImages);
    }
  }

  // Revalidate caching
  revalidateTag('products', 'max');
  revalidatePath('/', 'layout');
  revalidatePath('/api/products');
  revalidatePath('/sitemap.xml');
  revalidatePath('/en/product/[slug]', 'page');
  revalidatePath('/ro/product/[slug]', 'page');
  revalidatePath('/en/shop', 'page');
  revalidatePath('/ro/shop', 'page');
  revalidatePath('/admin/products');
  if (product.slug) {
    revalidatePath(`/admin/products/${product.slug}`);
  }

  return { success: true, data };
}

export async function uploadProductImage(formData: FormData) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error('Neautorizat');

  const file = formData.get('file') as File;
  if (!file) {
    throw new Error('No file provided');
  }

  const ALLOWED_IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'];
  const fileExt = (file.name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!ALLOWED_IMAGE_EXTS.includes(fileExt) || file.type === 'image/svg+xml') {
    throw new Error('Format de imagine nepermis. Folosește JPG, PNG, WebP sau AVIF.');
  }
  const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;

  const rawFolderId = (formData.get('folderId') as string) || 'uncategorized';
  const folderId = rawFolderId.replace(/[^a-zA-Z0-9_-]/g, '') || 'uncategorized';
  const filePath = `products/${folderId}/${fileName}`;

  // 1. Prefer Cloudflare R2 if configured (0 egress, unlimited storage)
  const r2Base = getR2PublicBaseUrl();
  if (process.env.R2_BUCKET_NAME && r2Base) {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const r2Url = await uploadToR2(buffer, filePath, file.type || 'image/webp');
    return {
      success: true,
      url: r2Url
    };
  }

  // 2. Fallback to Supabase Storage if R2 is not configured
  const { data, error } = await supabaseAdmin.storage
    .from('products')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'image/png' // Setează explicit tipul pentru a păstra transparența
    });

  if (error) {
    console.error('Upload error:', error);
    throw new Error(error.message);
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from('products')
    .getPublicUrl(filePath);

  return {
    success: true,
    url: publicUrlData.publicUrl
  };
}

export async function deleteFilesFromStorage(urls: string[]) {
  try {
    const isAuthorized = await isAdminAuthorized();
    if (!isAuthorized) throw new Error('Neautorizat');

    const r2Base = getR2PublicBaseUrl();
    for (const url of urls) {
      if (!url) continue;
      // Delete from R2 if R2 URL
      if (url.includes('r2.dev') || (r2Base && url.includes(r2Base))) {
        await deleteFromR2(url).catch(e => console.error('Failed to delete from R2:', e));
      } else if (url.includes('/public/products/')) {
        let path = url.split('/public/products/')[1];
        path = path.split('#')[0].split('?')[0];
        if (path) {
          await supabaseAdmin.storage.from('products').remove([path]);
        }
      }
    }
  } catch (e) {
    console.error('Failed to parse URLs for deletion', e);
  }
}

export async function deleteProductAdmin(id: string, imageUrls?: string[]) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error('Neautorizat');

  // 1. Delete the product from the database
  const { error: dbError } = await supabaseAdmin
    .from('products')
    .delete()
    .eq('id', id);

  if (dbError) {
    console.error('Error deleting product:', dbError);
    throw new Error(dbError.message);
  }

  // 2. Delete the associated image from storage
  if (imageUrls && imageUrls.length > 0) {
    await deleteFilesFromStorage(imageUrls);
  }

  revalidateTag('products', 'max');
  revalidatePath('/', 'layout');
  revalidatePath('/api/products');
  revalidatePath('/sitemap.xml');
  revalidatePath('/admin/products');
  return { success: true };
}

export async function toggleProductStatus(id: string, isActive: boolean) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error('Neautorizat');

  const { error } = await supabaseAdmin
    .from('products')
    .update({ is_active: isActive })
    .eq('id', id);

  if (error) {
    console.error('Error toggling product status:', error);
    throw new Error(error.message);
  }

  revalidateTag('products', 'max');
  revalidatePath('/', 'layout');
  revalidatePath('/api/products');
  revalidatePath('/sitemap.xml');
  revalidatePath('/admin/products');
  revalidatePath('/en/shop', 'page');
  revalidatePath('/ro/shop', 'page');

  return { success: true };
}
