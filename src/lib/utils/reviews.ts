/**
 * Filters out legacy broken Shopify/unverified seeded image URLs while allowing local review photos and active uploads.
 */
export function sanitizeReviewImageUrl(img: unknown): string | null {
  if (typeof img !== 'string') return null;
  const trimmed = img.trim();
  if (!trimmed) return null;
  if (trimmed.includes('cdn.shopify.com')) return null;
  // Block legacy seeded Supabase review photos (`IMG_3530.jpg`, `IMG_4330.jpg`, etc.) that did not match actual product photos
  if (/\/review-images\/reviews\/IMG_\d+/i.test(trimmed)) return null;
  return trimmed;
}

/**
 * Normalizes and deduplicates attached review photos from `image_url` and `images`.
 */
export function extractReviewImages(r: any): string[] {
  const result: string[] = [];
  const pushValid = (candidate: unknown) => {
    const clean = sanitizeReviewImageUrl(candidate);
    if (clean && !result.includes(clean)) {
      result.push(clean);
    }
  };

  pushValid(r?.image_url);

  if (Array.isArray(r?.images)) {
    r.images.forEach(pushValid);
  } else if (typeof r?.images === 'string' && r.images.trim()) {
    try {
      const parsed = JSON.parse(r.images);
      if (Array.isArray(parsed)) {
        parsed.forEach(pushValid);
      } else {
        pushValid(r.images);
      }
    } catch {
      pushValid(r.images);
    }
  }

  return result;
}

/**
 * Resolves a review's comment text according to the active site locale (`ro` | `en`).
 */
export function resolveReviewComment(r: any, locale: string = 'ro'): string {
  const isEn = locale === 'en';
  if (isEn) {
    return String(r?.comment_en?.trim() || r?.comment || r?.text || r?.comment_ro || '');
  }
  return String(r?.comment_ro?.trim() || r?.comment || r?.text || r?.comment_en || '');
}

/**
 * Resolves localized optional variant/fit labels on a review.
 */
export function resolveReviewField(
  r: any,
  field: 'item_type' | 'fit',
  locale: string = 'ro'
): string | null {
  const isEn = locale === 'en';
  const primary = isEn ? r?.[`${field}_en`] : r?.[`${field}_ro`];
  const secondary = isEn ? r?.[`${field}_ro`] : r?.[`${field}_en`];
  const val = primary?.trim() || r?.[field]?.trim?.() || secondary?.trim() || '';
  return val || null;
}

export function formatPublicReviews(rawReviews: any[], limit: number = 40, locale: string = 'ro') {
  return (rawReviews || []).slice(0, limit).map((r) => {
    const images = extractReviewImages(r);
    const resolvedComment = resolveReviewComment(r, locale);
    const resolvedItemType = resolveReviewField(r, 'item_type', locale);
    const resolvedFit = resolveReviewField(r, 'fit', locale);

    return {
      ...r,
      name: r.customer_name || r.name,
      comment: resolvedComment,
      text: resolvedComment,
      comment_ro: r.comment_ro || r.comment || '',
      comment_en: r.comment_en || r.comment || '',
      item_type: resolvedItemType,
      fit: resolvedFit,
      image_url: images[0] || null,
      images,
      product: r.product
        ? {
            ...r.product,
            image:
              typeof r.product.image === 'string' && !r.product.image.includes('cdn.shopify.com')
                ? r.product.image
                : '',
          }
        : undefined,
    };
  });
}
