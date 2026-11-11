'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminAuthorized } from './admin-auth';
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { cookies, headers } from 'next/headers';
import crypto from 'crypto';
import { rateLimiters, getClientIpFromHeaders, checkRateLimit } from '@/lib/ratelimit';

function computeMaintenanceBypassToken(): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'trenzone-maintenance-secret';
  return crypto.createHmac('sha256', secret).update('maintenance_bypass_v1').digest('hex');
}

export async function hasValidMaintenanceBypass(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('maintenance_bypass')?.value;
    if (!token) return false;
    const expected = computeMaintenanceBypassToken();
    const tokenBuf = Buffer.from(token);
    const expectedBuf = Buffer.from(expected);
    if (tokenBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(tokenBuf, expectedBuf);
  } catch {
    return false;
  }
}

const getCachedGlobalSettings = unstable_cache(
  async (): Promise<{ maintenance_mode: boolean; maintenance_end_date: string | null; exchange_rates: Record<string, number> | null }> => {
    const { data, error } = await supabaseAdmin
      .from('global_settings')
      .select('maintenance_mode, maintenance_end_date, exchange_rates')
      .eq('id', 1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return { maintenance_mode: false, maintenance_end_date: null, exchange_rates: null };
      console.error('Error fetching global settings:', error);
      return { maintenance_mode: false, maintenance_end_date: null, exchange_rates: null };
    }

    return {
      maintenance_mode: data?.maintenance_mode || false,
      maintenance_end_date: data?.maintenance_end_date || null,
      exchange_rates: data?.exchange_rates || null
    };
  },
  ['global-settings-public'],
  {
    revalidate: 2592000, // 30 days cache — purged on admin edit or manual cache clear
    tags: ['global_settings']
  }
);

export async function getGlobalSettings() {
  return getCachedGlobalSettings();
}

export async function getMaintenanceMode() {
  const settings = await getGlobalSettings();
  return settings.maintenance_mode;
}

export async function getMaintenanceEndDate() {
  const settings = await getGlobalSettings();
  return settings.maintenance_end_date;
}

export async function toggleMaintenanceMode(isActive: boolean) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error('Neautorizat');

  const { error } = await supabaseAdmin
    .from('global_settings')
    .upsert({ id: 1, maintenance_mode: isActive });

  if (error) {
    console.error('Error toggling maintenance mode:', error);
    throw new Error(error.message);
  }

  // When activating maintenance mode, clear bypass cookie so the admin can test the screen immediately
  const cookieStore = await cookies();
  if (isActive) {
    cookieStore.delete('maintenance_bypass');
  }

  // Invalidate cache immediately so all routes and layout reflect the new setting
  revalidateTag('global_settings', 'max');
  revalidatePath('/', 'layout');
  revalidatePath('/ro', 'layout');
  revalidatePath('/en', 'layout');

  return { success: true };
}

export async function clearMaintenanceBypass() {
  const cookieStore = await cookies();
  cookieStore.delete('maintenance_bypass');
  const isAuthorized = await isAdminAuthorized();
  if (isAuthorized) {
    revalidatePath('/', 'layout');
    revalidatePath('/ro', 'layout');
    revalidatePath('/en', 'layout');
  }
  return { success: true };
}

export async function setMaintenanceEndDate(endDate: string | null) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error('Neautorizat');

  const { error } = await supabaseAdmin
    .from('global_settings')
    .upsert({ id: 1, maintenance_end_date: endDate ? endDate : null });

  if (error) {
    console.error('Error setting maintenance end date:', error);
    throw new Error(error.message);
  }

  revalidateTag('global_settings', 'max');
  revalidatePath('/', 'layout');
  revalidatePath('/ro', 'layout');
  revalidatePath('/en', 'layout');
  return { success: true };
}

export async function setMaintenancePassword(password: string) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error('Neautorizat');

  const { error } = await supabaseAdmin
    .from('global_settings')
    .upsert({ id: 1, maintenance_password: password });

  if (error) {
    console.error('Error setting maintenance password:', error);
    throw new Error(error.message);
  }

  revalidateTag('global_settings', 'max');
  revalidatePath('/', 'layout');
  return { success: true };
}

export async function verifyMaintenancePassword(password: string) {
  try {
    const headersList = await headers();
    const ip = getClientIpFromHeaders(headersList);
    const { allowed } = await checkRateLimit(rateLimiters.affiliateLogin, ip, 'maintenanceBypass');
    if (!allowed) {
      return { success: false, error: 'Prea multe încercări. Așteaptă 1 minut.' };
    }
  } catch {
    // Ignore headers error outside request context
  }

  const { data, error } = await supabaseAdmin
    .from('global_settings')
    .select('maintenance_password')
    .eq('id', 1)
    .single();

  if (error || !data || !data.maintenance_password) return { success: false, error: 'Parolă incorectă' };

  if (data.maintenance_password === password) {
    // Set a cryptographically signed httpOnly cookie to bypass maintenance
    const cookieStore = await cookies();
    cookieStore.set('maintenance_bypass', computeMaintenanceBypassToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 1 week
    });

    revalidatePath('/', 'layout');
    revalidatePath('/ro', 'layout');
    revalidatePath('/en', 'layout');

    // Refresh to apply bypass
    return { success: true };
  }

  return { success: false, error: 'Parolă incorectă' };
}

export async function getExchangeRates() {
  const settings = await getGlobalSettings();
  return settings.exchange_rates;
}

export async function setExchangeRates(rates: Record<string, number>) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error('Neautorizat');

  const { error } = await supabaseAdmin
    .from('global_settings')
    .upsert({ id: 1, exchange_rates: rates });

  if (error) {
    console.error('Error setting exchange rates:', error);
    throw new Error(error.message);
  }

  revalidateTag('global_settings', 'max');
  return { success: true };
}

/**
 * Purges ALL Next.js Data Cache tags, ISR layouts/pages, and (if configured) Cloudflare Edge Cache.
 * Allows the site to keep a 30-day aggressive cache with 0 server consumption while giving the admin instant manual refresh.
 */
export async function purgeAllSiteCache(): Promise<{ success: boolean; cloudflarePurged?: boolean; timestamp: string }> {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error('Neautorizat');

  // 1. Purge all Next.js Data Cache tags
  revalidateTag('products', 'max');
  revalidateTag('influencers', 'max');
  revalidateTag('reviews', 'max');
  revalidateTag('global_settings', 'max');
  revalidateTag('store_settings', 'max');

  // 2. Purge all Next.js ISR pages and layouts across both locales
  revalidatePath('/', 'layout');
  revalidatePath('/ro', 'layout');
  revalidatePath('/en', 'layout');
  revalidatePath('/ro', 'page');
  revalidatePath('/en', 'page');
  revalidatePath('/ro/shop', 'page');
  revalidatePath('/en/shop', 'page');
  revalidatePath('/ro/product/[slug]', 'page');
  revalidatePath('/en/product/[slug]', 'page');
  revalidatePath('/ro/reviews', 'page');
  revalidatePath('/en/reviews', 'page');
  revalidatePath('/ro/about', 'page');
  revalidatePath('/en/about', 'page');
  revalidatePath('/api/products');
  revalidatePath('/api/reviews');
  revalidatePath('/api/sameday/lockers');
  revalidatePath('/sitemap.xml');

  // 3. Optional: Purge Cloudflare Edge Cache if Zone ID & API Token are configured
  let cloudflarePurged = false;
  const cfZoneId = process.env.CLOUDFLARE_ZONE_ID;
  const cfApiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (cfZoneId && cfApiToken) {
    try {
      const cfRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${cfZoneId}/purge_cache`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cfApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ purge_everything: true }),
      });
      if (cfRes.ok) {
        cloudflarePurged = true;
      }
    } catch (err) {
      console.warn('Cloudflare cache purge skipped:', err);
    }
  }

  return {
    success: true,
    cloudflarePurged,
    timestamp: new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
}
