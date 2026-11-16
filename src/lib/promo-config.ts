export interface PromoLocaleText {
  badge: string;
  title: string;
  description: string;
  button: string;
  skipLink: string;
  unlockedTitle: string;
  unlockedDescription: string;
}

export interface PromoSettings {
  isActive: boolean;
  mode: 'scratch' | 'newsletter';
  endDate: string;
  couponId: string;
  image: string;
  mobileImage: string;
  overlayOpacity: number;
  delaySeconds: number;
  cooldownHours: number;
  scratchTtlHours: number;
  scratchWeights: Record<string, number>;
  ro: PromoLocaleText;
  en: PromoLocaleText;
}

export interface ResolvedPromoConfig extends PromoSettings {
  couponCode: string;
  couponType: 'percentage' | 'fixed_amount' | 'free_shipping';
  couponValue: number;
}

export const DEFAULT_SCRATCH_WEIGHTS: Record<string, number> = {
  '3': 35,
  '4': 30,
  '5': 20,
  '6': 10,
  '7': 5,
};

export const DEFAULT_PROMO_SETTINGS: PromoSettings = {
  isActive: true,
  mode: 'scratch',
  endDate: '',
  couponId: 'TREN5',
  image: '/images/promo/scratch-bg-pc.jpg',
  mobileImage: '/images/promo/scratch-bg-mobile.jpg',
  overlayOpacity: 72,
  delaySeconds: 6,
  cooldownHours: 24,
  scratchTtlHours: 24,
  scratchWeights: { ...DEFAULT_SCRATCH_WEIGHTS },
  ro: {
    badge: 'OFERTĂ EXCLUSIVĂ',
    title: 'ÎNCEARCĂ-ȚI NOROCUL',
    description: 'Răzuiește cardul și câștigă instant între 3% și 7% reducere (cod unic valabil 24h)!',
    button: 'RĂZUIEȘTE AICI',
    skipLink: 'Dezvaluie instant reducerea',
    unlockedTitle: 'AI CÂȘTIGAT REDUCEREA!',
    unlockedDescription: 'Codul tău unic este activ pentru următoarele 24 de ore:',
  },
  en: {
    badge: 'EXCLUSIVE OFFER',
    title: 'TRY YOUR LUCK',
    description: 'Scratch to reveal a surprise 3%–7% discount code (unique code valid 24h)!',
    button: 'SCRATCH HERE',
    skipLink: 'Reveal discount instantly',
    unlockedTitle: 'YOU UNLOCKED A PRIZE!',
    unlockedDescription: 'Your unique code is active for the next 24 hours:',
  },
};

export function normalizePromoSettings(raw: Partial<PromoSettings> | null | undefined): PromoSettings {
  const safe = raw && typeof raw === 'object' ? raw : {};
  const ro = safe.ro && typeof safe.ro === 'object' ? safe.ro : {};
  const en = safe.en && typeof safe.en === 'object' ? safe.en : {};

  const rawWeights = safe.scratchWeights && typeof safe.scratchWeights === 'object' ? safe.scratchWeights : {};
  const scratchWeights: Record<string, number> = {};
  for (const pct of ['3', '4', '5', '6', '7']) {
    const val = Number((rawWeights as any)[pct]);
    scratchWeights[pct] = Number.isFinite(val) && val >= 0 ? val : DEFAULT_SCRATCH_WEIGHTS[pct];
  }

  return {
    isActive: typeof safe.isActive === 'boolean' ? safe.isActive : DEFAULT_PROMO_SETTINGS.isActive,
    mode: safe.mode === 'newsletter' ? 'newsletter' : 'scratch',
    endDate: typeof safe.endDate === 'string' ? safe.endDate : DEFAULT_PROMO_SETTINGS.endDate,
    couponId: typeof safe.couponId === 'string' && safe.couponId.trim() ? safe.couponId.trim().toUpperCase() : DEFAULT_PROMO_SETTINGS.couponId,
    image: typeof safe.image === 'string' && safe.image.trim() ? safe.image.trim() : DEFAULT_PROMO_SETTINGS.image,
    mobileImage: typeof safe.mobileImage === 'string' && safe.mobileImage.trim() ? safe.mobileImage.trim() : DEFAULT_PROMO_SETTINGS.mobileImage,
    overlayOpacity:
      typeof safe.overlayOpacity === 'number' && !Number.isNaN(safe.overlayOpacity)
        ? Math.min(95, Math.max(25, safe.overlayOpacity))
        : DEFAULT_PROMO_SETTINGS.overlayOpacity,
    delaySeconds:
      typeof safe.delaySeconds === 'number' && !Number.isNaN(safe.delaySeconds)
        ? Math.min(120, Math.max(1, safe.delaySeconds))
        : DEFAULT_PROMO_SETTINGS.delaySeconds,
    cooldownHours:
      typeof safe.cooldownHours === 'number' && !Number.isNaN(safe.cooldownHours)
        ? Math.min(720, Math.max(0.5, safe.cooldownHours))
        : DEFAULT_PROMO_SETTINGS.cooldownHours,
    scratchTtlHours:
      typeof safe.scratchTtlHours === 'number' && !Number.isNaN(safe.scratchTtlHours)
        ? Math.min(168, Math.max(1, safe.scratchTtlHours))
        : DEFAULT_PROMO_SETTINGS.scratchTtlHours,
    scratchWeights,
    ro: {
      ...DEFAULT_PROMO_SETTINGS.ro,
      ...Object.fromEntries(Object.entries(ro).filter(([, v]) => typeof v === 'string' && v.trim() !== '')),
    },
    en: {
      ...DEFAULT_PROMO_SETTINGS.en,
      ...Object.fromEntries(Object.entries(en).filter(([, v]) => typeof v === 'string' && v.trim() !== '')),
    },
  };
}
