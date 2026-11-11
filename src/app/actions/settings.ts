"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAdminAuthorized } from "./admin-auth";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { uploadToR2, deleteFromR2, getR2PublicBaseUrl } from "@/lib/r2";

const getCachedSiteSetting = unstable_cache(
  async (id: string) => {
    const { data, error } = await supabaseAdmin
      .from('store_settings')
      .select('value')
      .eq('key', id)
      .single();

    if (error || !data) {
      return null;
    }
    return data.value;
  },
  ['site-settings-single'],
  {
    revalidate: 2592000, // 30 days cache — purged on admin edit or manual cache clear
    tags: ['store_settings']
  }
);

const PROTECTED_SETTING_KEYS = new Set([
  'fulfillment_history',
  'fulfillment_settings',
  'abandoned_72h_coupon',
]);

export async function getSiteSetting(id: string) {
  if (PROTECTED_SETTING_KEYS.has(id) || id.startsWith('admin_') || id.startsWith('fulfillment_')) {
    const isAuth = await isAdminAuthorized();
    if (!isAuth) return null;
  }
  return getCachedSiteSetting(id);
}

export async function updateSiteSetting(id: string, value: any) {
  const isAuth = await isAdminAuthorized();
  if (!isAuth) throw new Error("Unauthorized");

  const { data, error } = await supabaseAdmin
    .from('store_settings')
    .upsert({
      key: id,
      value
    })
    .select()
    .single();

  if (error) {
    console.error("Error updating site setting:", error);
    throw new Error(error.message);
  }

  revalidateTag('store_settings', 'max');
  revalidatePath('/[locale]', 'page');
  return data.value;
}

export async function uploadPromoImage(formData: FormData) {
  const isAuth = await isAdminAuthorized();
  if (!isAuth) throw new Error("Unauthorized");

  const file = formData.get('file') as File;
  if (!file) throw new Error('No file provided');

  const ALLOWED_IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'];
  const fileExt = (file.name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!ALLOWED_IMAGE_EXTS.includes(fileExt) || file.type === 'image/svg+xml') {
    throw new Error('Format de imagine nepermis. Folosește JPG, PNG, WebP sau AVIF.');
  }
  const fileName = `promo-${Date.now()}.${fileExt}`;
  const filePath = `marketing/promotie/${fileName}`;

  // 1. Prefer Cloudflare R2 if configured
  const r2Base = getR2PublicBaseUrl();
  if (process.env.R2_BUCKET_NAME && r2Base) {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const r2Url = await uploadToR2(buffer, filePath, file.type || `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`);
    return { success: true, url: r2Url };
  }

  // 2. Fallback to Supabase Storage
  const { error } = await supabaseAdmin.storage
    .from('marketing')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw new Error(error.message);

  const { data: publicUrlData } = supabaseAdmin.storage
    .from('marketing')
    .getPublicUrl(filePath);

  return { success: true, url: publicUrlData.publicUrl };
}

export async function deletePromoImage(filePath: string) {
  const isAuth = await isAdminAuthorized();
  if (!isAuth) return { success: false };

  try {
    const r2Base = getR2PublicBaseUrl();
    if (filePath.includes('r2.dev') || (r2Base && filePath.includes(r2Base))) {
      await deleteFromR2(filePath).catch(() => {});
      return { success: true };
    }
    await supabaseAdmin.storage.from('marketing').remove([filePath]);
    return { success: true };
  } catch (e) {
    return { success: false };
  }
}
