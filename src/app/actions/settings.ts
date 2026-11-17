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

// Strict allowlist of setting keys that may be read publicly without admin auth.
// All sensitive keys (digital_programs_files, fulfillment_settings, fulfillment_history,
// abandoned_72h_coupon, order_counter, etc.) require isAdminAuthorized().
const PUBLIC_SETTING_KEYS = new Set([
  'shipping_config',
  'active_promotion',
  'digital_programs_video_config',
]);

export async function getSiteSetting(id: string) {
  if (!id || typeof id !== 'string') return null;
  if (!PUBLIC_SETTING_KEYS.has(id)) {
    const isAuth = await isAdminAuthorized();
    if (!isAuth) return null;
  }
  return getCachedSiteSetting(id);
}

export async function updateSiteSetting(id: string, value: any) {
  const isAuth = await isAdminAuthorized();
  if (!isAuth) throw new Error("Unauthorized");
  if (!id || typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) {
    throw new Error("Invalid setting key");
  }

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
  if (id === 'active_promotion') {
    revalidatePath('/api/promo-config');
  }
  return data.value;
}

export async function uploadPromoImage(formData: FormData) {
  const isAuth = await isAdminAuthorized();
  if (!isAuth) throw new Error("Unauthorized");

  const file = formData.get('file') as File;
  if (!file || file.size <= 0) throw new Error('No file provided');
  if (file.size > 10 * 1024 * 1024) throw new Error('Fișierul depășește limita de 10MB.');

  const ALLOWED_IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'];
  const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
  const fileExt = (file.name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!ALLOWED_IMAGE_EXTS.includes(fileExt) || !ALLOWED_MIMES.includes(file.type)) {
    throw new Error('Format de imagine nepermis. Folosește JPG, PNG, WebP, AVIF sau GIF.');
  }

  const bytes = await file.arrayBuffer();
  const byteArray = new Uint8Array(bytes);
  const headerText = Buffer.from(byteArray.subarray(0, 256)).toString('utf8').toLowerCase();
  if (
    headerText.includes('<svg') ||
    headerText.includes('<html') ||
    headerText.includes('<script') ||
    headerText.includes('<!doctype') ||
    headerText.includes('<?xml')
  ) {
    throw new Error('Conținutul fișierului nu este o imagine raster validă.');
  }

  const fileName = `promo-${Date.now()}.${fileExt}`;
  const filePath = `marketing/promotie/${fileName}`;

  // 1. Prefer Cloudflare R2 if configured
  const r2Base = getR2PublicBaseUrl();
  if (process.env.R2_BUCKET_NAME && r2Base) {
    const buffer = Buffer.from(bytes);
    const r2Url = await uploadToR2(buffer, filePath, file.type || `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`);
    return { success: true, url: r2Url };
  }

  // 2. Fallback to Supabase Storage
  const { error } = await supabaseAdmin.storage
    .from('marketing')
    .upload(filePath, Buffer.from(bytes), {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type
    });

  if (error) throw new Error(error.message);

  const { data: publicUrlData } = supabaseAdmin.storage
    .from('marketing')
    .getPublicUrl(filePath);

  return { success: true, url: publicUrlData.publicUrl };
}

export async function deletePromoImage(filePathOrUrl: string) {
  const isAuth = await isAdminAuthorized();
  if (!isAuth) return { success: false };

  try {
    const r2Base = getR2PublicBaseUrl();
    if (
      filePathOrUrl.includes('r2.dev') ||
      filePathOrUrl.includes('cdn.trenzone.fit') ||
      (r2Base && filePathOrUrl.includes(r2Base)) ||
      filePathOrUrl.startsWith('marketing/')
    ) {
      let key = filePathOrUrl;
      if (filePathOrUrl.startsWith('http')) {
        try {
          key = new URL(filePathOrUrl).pathname.replace(/^\/+/, '');
        } catch {}
      }
      await deleteFromR2(key).catch(() => {});
      return { success: true };
    }
    const storagePath = filePathOrUrl.includes('/public/marketing/')
      ? filePathOrUrl.split('/public/marketing/')[1]
      : filePathOrUrl;
    await supabaseAdmin.storage.from('marketing').remove([storagePath]);
    return { success: true };
  } catch (e) {
    return { success: false };
  }
}
