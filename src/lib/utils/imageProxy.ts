import { getCdnUrl } from './cdn';

/**
 * Optimizes image URLs by routing them through the CDN.
 * 
 * When NEXT_PUBLIC_CDN_URL is configured, Supabase Storage URLs
 * are rewritten to the CDN domain (e.g. cdn.trenzone.fit).
 * 
 * When CDN is not configured, falls back to the /supabase-proxy/ rewrite
 * which routes through Next.js (still hits Supabase but at least benefits
 * from Vercel's edge cache).
 */
export function getOptimizedImageUrl(url: string | null | undefined): string {
  if (!url) return '';

  // First try CDN rewrite (if configured, this handles everything)
  const cdnUrl = getCdnUrl(url);
  if (cdnUrl !== url) return cdnUrl;

  // Fallback: proxy through Next.js rewrite for the active Supabase project
  if (url.startsWith('https://walfsewxhsjnfjfvxymi.supabase.co/storage/v1/object/public/')) {
    return url.replace(
      'https://walfsewxhsjnfjfvxymi.supabase.co/storage/v1/object/public/',
      '/supabase-proxy/'
    );
  }

  return url;
}
