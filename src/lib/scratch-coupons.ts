import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { DEFAULT_SCRATCH_WEIGHTS } from '@/lib/promo-config';

/**
 * Deletes expired, unused auto-generated SCRATCH-% coupons so the DB stays clean.
 * Coupons that were actually used on an order are preserved for order history integrity.
 */
export async function cleanupExpiredScratchCoupons(): Promise<number> {
  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('coupons')
      .delete()
      .like('code', 'SCRATCH-%')
      .lt('expires_at', nowIso)
      .or('used_count.is.null,used_count.eq.0')
      .select('id');

    if (error) {
      console.warn('[scratch-cleanup] Non-fatal cleanup error:', error.message);
      return 0;
    }
    return data?.length || 0;
  } catch (err) {
    console.warn('[scratch-cleanup] Unexpected cleanup error:', err);
    return 0;
  }
}

/**
 * Weighted random percentage between 3% and 7%
 * Default probabilities: 3% (35%), 4% (30%), 5% (20%), 6% (10%), 7% (5%)
 */
export function pickWeightedScratchDiscount(customWeights?: Record<string, number>): number {
  const source = customWeights && typeof customWeights === 'object' ? customWeights : DEFAULT_SCRATCH_WEIGHTS;
  const entries = ['3', '4', '5', '6', '7'].map((k) => ({
    pct: Number(k),
    weight: Math.max(0, Number(source[k] ?? DEFAULT_SCRATCH_WEIGHTS[k]) || 0),
  }));

  const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
  if (totalWeight <= 0) return 4;

  const scale = 1000;
  const roll = crypto.randomInt(0, Math.max(1, Math.round(totalWeight * scale)));
  let cursor = 0;

  for (const entry of entries) {
    cursor += Math.round(entry.weight * scale);
    if (roll < cursor) {
      return entry.pct;
    }
  }

  return 4;
}

export function generateUniqueScratchCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += alphabet[crypto.randomInt(0, alphabet.length)];
  }
  return `SCRATCH-${suffix}`;
}

