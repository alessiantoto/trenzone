import { supabaseAdmin } from './supabase-admin';

export const REVIEW_TRANSLATIONS_SETTINGS_KEY = 'review_translations';

export interface ReviewTranslationData {
  ro?: string;
  en?: string;
  item_type_ro?: string;
  item_type_en?: string;
  fit_ro?: string;
  fit_en?: string;
}

export type ReviewTranslationsMap = Record<string, ReviewTranslationData>;

/**
 * Fetches per-review bilingual translations map from `store_settings`.
 */
export async function getReviewTranslationsMap(): Promise<ReviewTranslationsMap> {
  try {
    const { data, error } = await supabaseAdmin
      .from('store_settings')
      .select('value')
      .eq('key', REVIEW_TRANSLATIONS_SETTINGS_KEY)
      .maybeSingle();

    if (error || !data?.value || typeof data.value !== 'object') {
      return {};
    }
    return data.value as ReviewTranslationsMap;
  } catch {
    return {};
  }
}

/**
 * Persists bilingual text and variant metadata for a single review.
 */
export async function upsertReviewTranslation(
  reviewId: string,
  entry: ReviewTranslationData
): Promise<void> {
  if (!reviewId) return;
  const current = await getReviewTranslationsMap();
  const prev = current[reviewId] || {};
  const nextEntry: ReviewTranslationData = { ...prev };

  const assignOrDelete = (field: keyof ReviewTranslationData, val: string | undefined) => {
    if (val === undefined) return;
    const trimmed = val.trim();
    if (trimmed) {
      nextEntry[field] = trimmed;
    } else {
      delete nextEntry[field];
    }
  };

  assignOrDelete('ro', entry.ro);
  assignOrDelete('en', entry.en);
  assignOrDelete('item_type_ro', entry.item_type_ro);
  assignOrDelete('item_type_en', entry.item_type_en);
  assignOrDelete('fit_ro', entry.fit_ro);
  assignOrDelete('fit_en', entry.fit_en);

  const nextMap: ReviewTranslationsMap = {
    ...current,
    [reviewId]: nextEntry,
  };

  const { error } = await supabaseAdmin
    .from('store_settings')
    .upsert(
      { key: REVIEW_TRANSLATIONS_SETTINGS_KEY, value: nextMap },
      { onConflict: 'key' }
    );

  if (error) {
    console.error('Failed to upsert review translations:', error);
    throw error;
  }
}

/**
 * Removes stored translations when a review is deleted.
 */
export async function deleteReviewTranslation(reviewId: string): Promise<void> {
  if (!reviewId) return;
  try {
    const current = await getReviewTranslationsMap();
    if (!(reviewId in current)) return;
    const nextMap = { ...current };
    delete nextMap[reviewId];
    await supabaseAdmin
      .from('store_settings')
      .upsert(
        { key: REVIEW_TRANSLATIONS_SETTINGS_KEY, value: nextMap },
        { onConflict: 'key' }
      );
  } catch (err) {
    console.error('Failed to delete review translation:', err);
  }
}

/**
 * Attaches `comment_ro` / `comment_en` and localized metadata fields onto raw review rows.
 */
export function attachReviewTranslations<T extends Record<string, any>>(
  reviews: T[],
  translationsMap: ReviewTranslationsMap
): (T & {
  comment_ro: string;
  comment_en: string;
  item_type_ro: string;
  item_type_en: string;
  fit_ro: string;
  fit_en: string;
})[] {
  return (reviews || []).map((r) => {
    const tr = translationsMap[r.id] || {};
    const baseComment = typeof r.comment === 'string' ? r.comment : '';
    const isOrigEn = r.locale === 'en';

    const comment_ro = tr.ro?.trim() || (!isOrigEn ? baseComment : '');
    const comment_en = tr.en?.trim() || (isOrigEn ? baseComment : '');

    return {
      ...r,
      comment_ro: comment_ro || baseComment,
      comment_en: comment_en || comment_ro || baseComment,
      item_type_ro: tr.item_type_ro?.trim() || r.item_type || '',
      item_type_en: tr.item_type_en?.trim() || r.item_type || '',
      fit_ro: tr.fit_ro?.trim() || r.fit || '',
      fit_en: tr.fit_en?.trim() || r.fit || '',
    };
  });
}

