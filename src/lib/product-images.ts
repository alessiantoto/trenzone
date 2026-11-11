import { getCdnUrl } from '@/lib/utils/cdn';

const DEFAULT_TRENZONE_IMAGE = '/images/products/x10_elbow_wraps_purple_1.webp';

function toAbsoluteAssetUrl(url: string): string {
  const cdnResolved = getCdnUrl(url);
  if (cdnResolved.startsWith('http')) return cdnResolved;
  return `https://www.trenzone.fit${cdnResolved.startsWith('/') ? '' : '/'}${cdnResolved}`;
}

export function isWideProductImage(url?: string | null): boolean {
  return typeof url === 'string' && url.includes('shirt_');
}

function matchTrenzoneGearImage(rawText: string): string | null {
  const s = rawText.toLowerCase();

  if (s.includes('wrist') || s.includes('încheietur') || s.includes('incheietur')) {
    return '/images/products/trenzone_wristwraps_default.webp';
  }
  if (s.includes('centur') || s.includes('belt')) {
    return '/images/products/trenzone_belt_default.webp';
  }
  if (s.includes('eat tren')) return '/images/products/shirt_eat_tren_sleep_repeat.webp';
  if (s.includes('stay hard')) return '/images/products/shirt_stay_hard.webp';
  if (s.includes('soldier')) return '/images/products/shirt_soldier_of_god.webp';
  if (s.includes('pain creates')) return '/images/products/shirt_pain_creates_men.webp';
  if (s.includes('beast')) return '/images/products/shirt_beast.webp';
  if (s.includes('tricou') || s.includes('t-shirt') || s.includes('tshirt') || s.includes('oversized tee')) {
    return '/images/products/shirt_stay_hard.webp';
  }
  if (s.includes('x10')) {
    return (s.includes('white') || s.includes('alb'))
      ? '/images/products/x10_elbow_wraps_white_1.webp'
      : '/images/products/x10_elbow_wraps_purple_1.webp';
  }
  if (s.includes('x5')) {
    if (s.includes('red') || s.includes('rosu') || s.includes('roșu')) {
      return '/images/products/x5_elbow_wraps_red_1.webp';
    }
    if (s.includes('blue') || s.includes('albastr')) {
      return '/images/products/x5_elbow_wraps_blue_1.webp';
    }
    return '/images/products/x5_elbow_wraps_purple_1.webp';
  }

  if (s.includes('purple') || s.includes('mov')) return '/images/products/x10_elbow_wraps_purple_1.webp';
  if (s.includes('red') || s.includes('rosu') || s.includes('roșu')) return '/images/products/x5_elbow_wraps_red_1.webp';
  if (s.includes('blue') || s.includes('albastr')) return '/images/products/x5_elbow_wraps_blue_1.webp';
  if (s.includes('white') || s.includes('alb')) return '/images/products/x10_elbow_wraps_white_1.webp';

  return null;
}

function isUsableImageUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return false;
  // Ignore broken legacy project URLs from prior stores
  if (trimmed.includes('ueezzhgifizilvtmiseg.supabase.co') || trimmed.includes('buwvlmuvutfuvtxngqoi.supabase.co')) {
    return false;
  }
  return true;
}

/**
 * Resolves a reliable absolute image URL for a TrenZone order item.
 */
export function resolveItemImage(item: any): string {
  const nameStr = typeof item.name === 'object' && item.name !== null
    ? (item.name.ro || item.name.en || Object.values(item.name)[0] || '')
    : String(item.name || '');

  const variantRaw = item.selectedVariant?.name || item.variant || '';
  const variantStr = typeof variantRaw === 'object' && variantRaw !== null
    ? (variantRaw.ro || variantRaw.en || Object.values(variantRaw)[0] || '')
    : String(variantRaw || '');

  const explicitImage = item.selectedVariant?.image || item.image;
  if (isUsableImageUrl(explicitImage)) {
    return toAbsoluteAssetUrl(explicitImage);
  }

  const matched = matchTrenzoneGearImage(`${variantStr} ${nameStr}`);
  if (matched) {
    return getCdnUrl(matched);
  }

  if (isUsableImageUrl(item.main_image)) {
    return toAbsoluteAssetUrl(item.main_image);
  }

  return getCdnUrl(DEFAULT_TRENZONE_IMAGE);
}

/**
 * Returns the canonical TrenZone product image corresponding to a color or product name.
 */
export function getSingleFlavorImage(nameOrVariant?: any): string {
  const raw = typeof nameOrVariant === 'object' && nameOrVariant !== null
    ? (nameOrVariant.ro || nameOrVariant.en || Object.values(nameOrVariant)[0] || '')
    : String(nameOrVariant || '');

  return getCdnUrl(matchTrenzoneGearImage(raw) || DEFAULT_TRENZONE_IMAGE);
}
