/**
 * CDN & Cloudflare R2 URL Utility — Centralizes all Storage & Media URL rewriting.
 * 
 * When NEXT_PUBLIC_CDN_URL (or NEXT_PUBLIC_R2_URL) is set (e.g. "https://cdn.trenzone.fit" or "https://pub-xxx.r2.dev"),
 * all Supabase Storage public URLs and optionally /videos/* paths are rewritten to go through Cloudflare R2 / CDN,
 * eliminating Vercel bandwidth and Supabase egress charges.
 * 
 * Without the env var, URLs pass through unchanged (backwards compatible, cached by Cloudflare Edge Proxy).
 */

const SUPABASE_STORAGE_BASES = [
  'https://walfsewxhsjnfjfvxymi.supabase.co/storage/v1/object/public/',
] as const;

const CDN_BASE = (
  process.env.NEXT_PUBLIC_CDN_URL ||
  process.env.NEXT_PUBLIC_R2_URL ||
  process.env.NEXT_PUBLIC_R2_PUBLIC_URL ||
  process.env.R2_PUBLIC_URL ||
  ''
).trim().replace(/\/+$/, '');

const R2_VIDEO_BASE = (
  process.env.NEXT_PUBLIC_R2_VIDEO_URL ||
  process.env.NEXT_PUBLIC_R2_URL ||
  process.env.NEXT_PUBLIC_R2_PUBLIC_URL ||
  process.env.R2_PUBLIC_URL ||
  process.env.NEXT_PUBLIC_CDN_URL ||
  ''
).trim().replace(/\/+$/, '');

/**
 * Rewrites a Supabase Storage URL or local /videos/* path to use Cloudflare R2 / CDN.
 * If CDN/R2 is not configured, returns the original URL (which is still cached at the Edge when behind Cloudflare Proxy).
 */
// Static /images/* paths verified present on R2/CDN ($0 egress, 0 Vercel Fast Data Transfer)
const R2_IMAGE_PREFIXES = [
  '/images/products/',
  '/images/home/',
  '/images/ui/',
  '/images/logos/',
  '/images/vladtren-logo.png',
];

const LEGACY_PRODUCT_FILE_MAP: Record<string, string> = {
  'x10_elbow_wraps_purple_1.webp': 'x10_elbow_wraps_purple.webp',
  'x10_elbow_wraps_purple_2.webp': 'x10_elbow_wraps_purple.webp',
  'x10_elbow_wraps_purple_square.webp': 'x10_elbow_wraps_purple.webp',
  'x10_elbow_wraps_purple.png': 'x10_elbow_wraps_purple.webp',
  'x10_elbow_wraps_white_1.webp': 'x10_elbow_wraps_white.webp',
  'x10_elbow_wraps_white_2.webp': 'x10_elbow_wraps_white.webp',
  'x10_elbow_wraps_white_3.webp': 'x10_elbow_wraps_white.webp',
  'x10_elbow_wraps_white.PNG': 'x10_elbow_wraps_white.webp',
  'x10_elbow_wraps_white.png': 'x10_elbow_wraps_white.webp',
  'trenzone_belt_default.webp': 'heavy_lifting_belt.webp',
  'heavy_lifting_belt.PNG': 'heavy_lifting_belt.webp',
  'heavy_lifting_belt.png': 'heavy_lifting_belt.webp',
  'trenzone_wristwraps_default.webp': 'x10_wrist_wraps_purple.webp',
  'x10_wrist_wraps_purple.PNG': 'x10_wrist_wraps_purple.webp',
  'x10_wrist_wraps_purple.png': 'x10_wrist_wraps_purple.webp',
  'x10_wrist_wraps_white.PNG': 'x10_wrist_wraps_white.webp',
  'x10_wrist_wraps_white.png': 'x10_wrist_wraps_white.webp',
  'trenzone_tshirt_default.webp': 'shirt_stay_hard.webp',
  'program_complete_bundle.webp': 'program_complete_trio_v2.webp',
  'program_complete_3_bundle.webp': 'program_complete_trio_v2.webp',
};

export function getCdnUrl(url: string | null | undefined): string {
  if (!url) return '';

  // Normalize any legacy product image filename to its new WebP filename
  const rawFile = url.split('/').pop()?.split('?')[0]?.split('#')[0] || '';
  if (rawFile && LEGACY_PRODUCT_FILE_MAP[rawFile]) {
    url = url.replace(rawFile, LEGACY_PRODUCT_FILE_MAP[rawFile]);
  }

  // 1. If local video path (/videos/influencers/trenwraps1.mp4) and R2 bucket is configured, route directly to R2 root
  if (R2_VIDEO_BASE && url.startsWith('/videos/')) {
    const fileName = url.split('/').pop() || '';
    return fileName ? `${R2_VIDEO_BASE}/${fileName}` : `${R2_VIDEO_BASE}${url}`;
  }

  if (!CDN_BASE) return url;

  // 2. Route verified static product, hero, UI texture, and logo assets directly through R2/CDN
  if (url.startsWith('/images/') && R2_IMAGE_PREFIXES.some((prefix) => url.startsWith(prefix))) {
    return `${CDN_BASE}${url}`;
  }

  // 3. Rewrite Supabase Storage URLs to CDN/R2 domain
  for (const base of SUPABASE_STORAGE_BASES) {
    if (url.startsWith(base)) {
      return `${CDN_BASE}/${url.slice(base.length)}`;
    }
  }

  return url;
}

/**
 * Returns the CDN base URL for constructing absolute asset URLs.
 * Falls back to the primary Supabase Storage base if CDN is not configured.
 */
export function getCdnBase(): string {
  return CDN_BASE || 'https://walfsewxhsjnfjfvxymi.supabase.co/storage/v1/object/public';
}

/**
 * Returns the CDN base for the media bucket.
 * Used in email templates for absolute image URLs.
 */
export function getMediaCdnBase(): string {
  if (CDN_BASE) return `${CDN_BASE}/media`;
  return 'https://walfsewxhsjnfjfvxymi.supabase.co/storage/v1/object/public/media';
}
