import type { Product } from './api';

export type ProgramId = string;
export type ProgramLanguage = 'ro' | 'en';
export type DigitalProgramLanguage = ProgramLanguage;

export const PROGRAM_UUIDS = {
  FOOD_PLAN: 'f00d0001-1111-4111-8111-000000000001',
  BENCH_PROGRAM: 'be0c0002-2222-4222-8222-000000000002',
  TRAINING_PROGRAM: '7a1a0004-4444-4444-8444-000000000004',
  COMPLETE_BUNDLE: 'b00d0003-3333-4333-8333-000000000003',
  BUNDLE: 'b00d0003-3333-4333-8333-000000000003',
} as const;

export const PROGRAM_SLUGS = {
  FOOD_PLAN: 'food-plan-vlad-tren',
  BENCH_PROGRAM: 'bench-program-vlad-tren',
  TRAINING_PROGRAM: 'training-program-vlad-tren',
  COMPLETE_BUNDLE: 'pachet-programe-vlad-tren',
  BUNDLE: 'pachet-programe-vlad-tren',
} as const;

export const PROGRAM_PRICES_RON = {
  FOOD_PLAN: 120.0,
  FOOD_PLAN_ORIGINAL: 160.0,
  TRAINING_PROGRAM: 120.0,
  TRAINING_PROGRAM_ORIGINAL: 160.0,
  BENCH_PROGRAM: 100.0,
  BENCH_PROGRAM_ORIGINAL: 140.0,
  SINGLE: 120.0,
  SINGLE_ORIGINAL: 160.0,
  BUNDLE: 249.0,
  BUNDLE_ORIGINAL: 340.0, // 120 + 120 + 100 = 340 RON
  COMBO_DISCOUNT_RON: 91.0, // 340 - 249 = 91 RON (-27%)
} as const;

const ALL_DIGITAL_IDS = new Set<string>([
  PROGRAM_UUIDS.FOOD_PLAN,
  PROGRAM_UUIDS.BENCH_PROGRAM,
  PROGRAM_UUIDS.TRAINING_PROGRAM,
  PROGRAM_UUIDS.COMPLETE_BUNDLE,
  PROGRAM_SLUGS.FOOD_PLAN,
  PROGRAM_SLUGS.BENCH_PROGRAM,
  PROGRAM_SLUGS.TRAINING_PROGRAM,
  PROGRAM_SLUGS.COMPLETE_BUNDLE,
]);

export function isDigitalProgramId(idOrSlug?: string | null): boolean {
  if (!idOrSlug) return false;
  const clean = String(idOrSlug).trim().toLowerCase();
  if (ALL_DIGITAL_IDS.has(clean)) return true;
  return (
    clean.includes('food-plan') ||
    clean.includes('bench-program') ||
    clean.includes('training-program') ||
    clean.includes('pachet-programe') ||
    clean.startsWith('f00d0001-') ||
    clean.startsWith('be0c0002-') ||
    clean.startsWith('7a1a0004-') ||
    clean.startsWith('7a1n0004-') ||
    clean.startsWith('b00d0003-')
  );
}

export function sanitizeProgramSlug(raw?: string | null): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function isDigitalBundleItem(item: any): boolean {
  if (!item) return false;
  const idAndSlug = `${item.id || ''} ${item.slug || ''}`.toLowerCase();
  if (
    idAndSlug.includes(PROGRAM_UUIDS.COMPLETE_BUNDLE) ||
    idAndSlug.includes(PROGRAM_SLUGS.COMPLETE_BUNDLE)
  ) {
    return true;
  }
  const rawName =
    typeof item.name === 'object'
      ? `${item.name?.ro || ''} ${item.name?.en || ''}`
      : String(item.name || '');
  const lower = `${idAndSlug} ${rawName}`.toLowerCase();
  return (
    lower.includes('pachet complet: food plan') ||
    lower.includes('complete bundle: food plan') ||
    lower.includes('complete stack: food plan') ||
    (lower.includes('pachet') && lower.includes('programe'))
  );
}

export function isDigitalProgramItem(item: any): boolean {
  if (!item) return false;
  if (
    item.is_digital === true ||
    item.isDigital === true ||
    item?.specs_summary?.is_digital === true
  ) {
    return true;
  }
  if (isDigitalProgramId(item.id) || isDigitalProgramId(item.slug)) return true;
  const rawName =
    typeof item.name === 'object'
      ? `${item.name?.ro || ''} ${item.name?.en || ''}`
      : String(item.name || '');
  const lower = rawName.toLowerCase();
  return (
    lower.includes('food plan') ||
    lower.includes('bench program') ||
    lower.includes('training program') ||
    lower.includes('pachet complet: food plan') ||
    lower.includes('complete stack: food plan')
  );
}

export function isDigitalOnlyCart(items: any[]): boolean {
  if (!Array.isArray(items) || items.length === 0) return false;
  return items.every((item) => isDigitalProgramItem(item));
}

export function hasAnyDigitalProgram(items: any[]): boolean {
  if (!Array.isArray(items) || items.length === 0) return false;
  return items.some((item) => isDigitalProgramItem(item));
}

/**
 * Resolves the customer email language ('ro' | 'en') for an order consistently.
 * Priority: explicit checkout locale -> country fallback when non-RO -> variant language of ordered programs -> 'ro'.
 */
export function resolveOrderEmailLocale(
  order: any,
  orderedPrograms?: Array<{ lang: ProgramLanguage }>
): ProgramLanguage {
  const explicitRaw = String(
    order?.carrier_metadata?.locale || order?.locale || ''
  )
    .trim()
    .toLowerCase();

  if (explicitRaw.startsWith('en')) return 'en';
  if (explicitRaw.startsWith('ro')) return 'ro';

  const countryRaw = String(order?.addr_country || '').trim().toUpperCase();
  if (countryRaw && countryRaw !== 'RO' && countryRaw !== 'ROMANIA') {
    return 'en';
  }

  if (orderedPrograms && orderedPrograms.length > 0 && orderedPrograms.every((p) => p.lang === 'en')) {
    return 'en';
  }

  return 'ro';
}

/**
 * Extracts which digital programs ('food-plan', 'training-program', 'bench-program') and which language ('ro' | 'en')
 * were ordered in a given cart/order items list.
 */
export function resolveOrderedPrograms(
  items: any[],
  fallbackLocale: string = 'ro'
): Array<{
  programKey: string;
  lang: ProgramLanguage;
  title: string;
}> {
  const results: Array<{
    programKey: string;
    lang: ProgramLanguage;
    title: string;
  }> = [];
  const seen = new Set<string>();

  for (const item of items || []) {
    if (!isDigitalProgramItem(item)) continue;

    const variantStr = String(
      item.selectedVariant?.name?.ro ||
        item.selectedVariant?.name?.en ||
        item.selectedVariant?.name ||
        item.variant ||
        item.name?.ro ||
        item.name ||
        ''
    ).toLowerCase();

    const lang: ProgramLanguage =
      variantStr.includes('english') ||
      variantStr.includes('englez') ||
      variantStr.includes('(en)') ||
      variantStr.includes('pdf en') ||
      variantStr === 'en'
        ? 'en'
        : variantStr.includes('român') ||
          variantStr.includes('romana') ||
          variantStr.includes('romanian') ||
          variantStr.includes('(ro)') ||
          variantStr.includes('pdf ro') ||
          variantStr === 'ro'
        ? 'ro'
        : fallbackLocale === 'en'
        ? 'en'
        : 'ro';

    const idAndName = `${item.id || ''} ${item.slug || ''} ${
      typeof item.name === 'object' ? item.name.en || item.name.ro : item.name || ''
    }`.toLowerCase();

    const isBundle =
      isDigitalBundleItem(item) ||
      (idAndName.includes('food') && idAndName.includes('bench'));

    let keysToAdd: string[];
    if (isBundle) {
      keysToAdd = ['food-plan', 'training-program', 'bench-program'];
    } else if (
      idAndName.includes(PROGRAM_UUIDS.FOOD_PLAN) ||
      idAndName.includes(PROGRAM_SLUGS.FOOD_PLAN) ||
      idAndName.includes('food-plan') ||
      idAndName.includes('food plan')
    ) {
      keysToAdd = ['food-plan'];
    } else if (
      idAndName.includes(PROGRAM_UUIDS.TRAINING_PROGRAM) ||
      idAndName.includes('7a1n0004-4444-4444-8444-000000000004') ||
      idAndName.includes(PROGRAM_SLUGS.TRAINING_PROGRAM) ||
      idAndName.includes('training-program') ||
      idAndName.includes('training program')
    ) {
      keysToAdd = ['training-program'];
    } else if (
      idAndName.includes(PROGRAM_UUIDS.BENCH_PROGRAM) ||
      idAndName.includes(PROGRAM_SLUGS.BENCH_PROGRAM) ||
      idAndName.includes('bench-program') ||
      idAndName.includes('bench program')
    ) {
      keysToAdd = ['bench-program'];
    } else {
      const customKey = sanitizeProgramSlug(item.slug || item.id);
      keysToAdd = customKey ? [customKey] : ['food-plan'];
    }

    const rawItemTitle =
      typeof item.name === 'object'
        ? item.name?.[lang] || item.name?.ro || item.name?.en || ''
        : String(item.name || '');

    for (const key of keysToAdd) {
      const dedupe = `${key}:${lang}`;
      if (!seen.has(dedupe)) {
        seen.add(dedupe);
        const langSuffix = lang === 'en' ? 'English' : 'Română';
        results.push({
          programKey: key,
          lang,
          title:
            key === 'food-plan'
              ? `Food Plan (${langSuffix})`
              : key === 'training-program'
              ? `Training Program (${langSuffix})`
              : key === 'bench-program'
              ? `Bench Program (${langSuffix})`
              : `${rawItemTitle || key} (${langSuffix})`,
        });
      }
    }
  }

  return results;
}

export const DIGITAL_PROGRAM_PRODUCTS: Product[] = [
  {
    id: PROGRAM_UUIDS.FOOD_PLAN,
    slug: PROGRAM_SLUGS.FOOD_PLAN,
    is_active: true,
    is_digital: true,
    badge: 'NUTRIȚIE & MASĂ',
    name: {
      ro: 'Food Plan',
      en: 'Food Plan',
    },
    price: PROGRAM_PRICES_RON.FOOD_PLAN,
    price_numeric: PROGRAM_PRICES_RON.FOOD_PLAN,
    originalPrice: PROGRAM_PRICES_RON.FOOD_PLAN_ORIGINAL,
    original_price_numeric: PROGRAM_PRICES_RON.FOOD_PLAN_ORIGINAL,
    image: '/images/products/program_food_plan.webp',
    main_image: '/images/products/program_food_plan.webp',
    images: ['/images/products/program_food_plan.webp'],
    rating: 5.0,
    reviews: 84,
    inStock: true,
    stock_quantity: 9999,
    weight: 0,
    length_mm: 0,
    width_mm: 0,
    height_mm: 0,
    variants: {
      type: 'flavor' as const,
      label: { ro: 'Limbă', en: 'Language' },
      options: [
        {
          name: { ro: 'Română', en: 'Romanian' },
          color: '#e32f8c',
          image: '/images/products/program_food_plan.webp',
          imageIndex: 0,
          stock_status: 'in_stock' as const,
        },
        {
          name: { ro: 'English', en: 'English' },
          color: '#3b82f6',
          image: '/images/products/program_food_plan.webp',
          imageIndex: 0,
          stock_status: 'in_stock' as const,
        },
      ],
    },
    description: {
      ro: 'Ghid practic de nutriție, masă musculară și definire în 10 capitole. Livrare instantă pe email.',
      en: 'Practical 10-chapter guide to nutrition, muscle growth, and weight management. Instant email delivery.',
    },
    benefits: {
      ro: [
        '10 capitole structurate: macro-nutrienți, structura meselor și exemple de meniuri zilnice',
        'Planuri alimentare pentru Masă Musculară și Definire',
        'Disponibil în Română sau Engleză — livrare instantă pe email',
      ],
      en: [
        '10 structured chapters: macronutrients, meal structure, and daily sample meal plans',
        'Sample meal plans for Muscle Gain and Weight Loss',
        'Available in Romanian or English — instant delivery via email',
      ],
    },
    specs: {
      weight: 'Format Digital (Livrare Instantă)',
      dimensions: '10 Capitole · RO / EN',
    },
  },
  {
    id: PROGRAM_UUIDS.TRAINING_PROGRAM,
    slug: PROGRAM_SLUGS.TRAINING_PROGRAM,
    is_active: true,
    is_digital: true,
    badge: 'HIPERTROFIE & FORȚĂ',
    name: {
      ro: 'Training Program',
      en: 'Training Program',
    },
    price: PROGRAM_PRICES_RON.TRAINING_PROGRAM,
    price_numeric: PROGRAM_PRICES_RON.TRAINING_PROGRAM,
    originalPrice: PROGRAM_PRICES_RON.TRAINING_PROGRAM_ORIGINAL,
    original_price_numeric: PROGRAM_PRICES_RON.TRAINING_PROGRAM_ORIGINAL,
    image: '/images/products/program_training_program.webp',
    main_image: '/images/products/program_training_program.webp',
    images: ['/images/products/program_training_program.webp'],
    rating: 5.0,
    reviews: 91,
    inStock: true,
    stock_quantity: 9999,
    weight: 0,
    length_mm: 0,
    width_mm: 0,
    height_mm: 0,
    variants: {
      type: 'flavor' as const,
      label: { ro: 'Limbă', en: 'Language' },
      options: [
        {
          name: { ro: 'Română', en: 'Romanian' },
          color: '#e32f8c',
          image: '/images/products/program_training_program.webp',
          imageIndex: 0,
          stock_status: 'in_stock' as const,
        },
        {
          name: { ro: 'English', en: 'English' },
          color: '#3b82f6',
          image: '/images/products/program_training_program.webp',
          imageIndex: 0,
          stock_status: 'in_stock' as const,
        },
      ],
    },
    description: {
      ro: 'Program complet de antrenament pe grupe musculare pentru masă musculară, densitate și forță. Livrare instantă pe email.',
      en: 'Complete workout split and training system for muscle hypertrophy, density, and strength. Instant email delivery.',
    },
    benefits: {
      ro: [
        'Structură completă pe zile de antrenament, exerciții, serii și repetări',
        'Selecția exercițiilor de bază și izolare pentru creștere musculară maximă',
        'Disponibil în Română sau Engleză — livrare instantă pe email',
      ],
      en: [
        'Full weekly training split with exercises, sets, and rep ranges',
        'Compound and isolation exercise selection for maximum hypertrophy',
        'Available in Romanian or English — instant delivery via email',
      ],
    },
    specs: {
      weight: 'Format Digital (Livrare Instantă)',
      dimensions: 'Split Complet · RO / EN',
    },
  },
  {
    id: PROGRAM_UUIDS.BENCH_PROGRAM,
    slug: PROGRAM_SLUGS.BENCH_PROGRAM,
    is_active: true,
    is_digital: true,
    badge: 'FORȚĂ & PR BENCH',
    name: {
      ro: 'Bench Program',
      en: 'Bench Program',
    },
    price: PROGRAM_PRICES_RON.BENCH_PROGRAM,
    price_numeric: PROGRAM_PRICES_RON.BENCH_PROGRAM,
    originalPrice: PROGRAM_PRICES_RON.BENCH_PROGRAM_ORIGINAL,
    original_price_numeric: PROGRAM_PRICES_RON.BENCH_PROGRAM_ORIGINAL,
    image: '/images/products/program_bench_program.webp',
    main_image: '/images/products/program_bench_program.webp',
    images: ['/images/products/program_bench_program.webp'],
    rating: 5.0,
    reviews: 96,
    inStock: true,
    stock_quantity: 9999,
    weight: 0,
    length_mm: 0,
    width_mm: 0,
    height_mm: 0,
    variants: {
      type: 'flavor' as const,
      label: { ro: 'Limbă', en: 'Language' },
      options: [
        {
          name: { ro: 'Română', en: 'Romanian' },
          color: '#e32f8c',
          image: '/images/products/program_bench_program.webp',
          imageIndex: 0,
          stock_status: 'in_stock' as const,
        },
        {
          name: { ro: 'English', en: 'English' },
          color: '#3b82f6',
          image: '/images/products/program_bench_program.webp',
          imageIndex: 0,
          stock_status: 'in_stock' as const,
        },
      ],
    },
    description: {
      ro: 'Programul de tehnică, structură a antrenamentului și progresie la împins (4×4–6 reps). Livrare instantă pe email.',
      en: 'Bench press technique, workout structure, and 4×4–6 progression system. Instant email delivery.',
    },
    benefits: {
      ro: [
        'Setup și tehnică: poziția picioarelor, blocarea omoplaților și traiectoria barei',
        'Sistem clar de progresie 4×4–6 repetări + exerciții accesorii',
        'Disponibil în Română sau Engleză — livrare instantă pe email',
      ],
      en: [
        'Setup and technique: leg drive, locked upper back, and controlled bar path',
        'Clear 4×4–6 progression system + accessory exercises',
        'Available in Romanian or English — instant delivery via email',
      ],
    },
    specs: {
      weight: 'Format Digital (Livrare Instantă)',
      dimensions: 'Progresie 4×4–6 · RO / EN',
    },
  },
  {
    id: PROGRAM_UUIDS.COMPLETE_BUNDLE,
    slug: PROGRAM_SLUGS.COMPLETE_BUNDLE,
    is_active: true,
    is_digital: true,
    badge: 'TOATE 3 PROGRAMELE',
    name: {
      ro: 'Pachet Complet (3 în 1)',
      en: 'Complete Bundle (3-in-1)',
    },
    price: PROGRAM_PRICES_RON.BUNDLE,
    price_numeric: PROGRAM_PRICES_RON.BUNDLE,
    originalPrice: PROGRAM_PRICES_RON.BUNDLE_ORIGINAL,
    original_price_numeric: PROGRAM_PRICES_RON.BUNDLE_ORIGINAL,
    image: '/images/products/program_complete_trio_v2.webp',
    main_image: '/images/products/program_complete_trio_v2.webp',
    images: [
      '/images/products/program_complete_trio_v2.webp',
      '/images/products/program_food_plan.webp',
      '/images/products/program_training_program.webp',
      '/images/products/program_bench_program.webp',
    ],
    rating: 5.0,
    reviews: 128,
    inStock: true,
    stock_quantity: 9999,
    weight: 0,
    length_mm: 0,
    width_mm: 0,
    height_mm: 0,
    variants: {
      type: 'flavor' as const,
      label: { ro: 'Limbă', en: 'Language' },
      options: [
        {
          name: { ro: 'Română', en: 'Romanian' },
          color: '#e32f8c',
          image: '/images/products/program_complete_trio_v2.webp',
          imageIndex: 0,
          stock_status: 'in_stock' as const,
        },
        {
          name: { ro: 'English', en: 'English' },
          color: '#3b82f6',
          image: '/images/products/program_complete_trio_v2.webp',
          imageIndex: 0,
          stock_status: 'in_stock' as const,
        },
      ],
    },
    description: {
      ro: 'Pachetul complet 3 în 1: primești toate cele 3 programe oficiale (Food Plan + Training Program + Bench Program) pe email la preț redus.',
      en: 'Complete 3-in-1 bundle: receive all 3 official guides (Food Plan + Training Program + Bench Program) via email at a bundle discount.',
    },
    benefits: {
      ro: [
        'Include toate cele 3 programe: Food Plan + Training Program + Bench Program',
        'Economisești 91 RON față de achiziția separată (249 RON în loc de 340 RON)',
        'Disponibil în Română sau Engleză cu livrare instantă pe email',
      ],
      en: [
        'Includes all 3 guides: Food Plan + Training Program + Bench Program',
        'Save 27% compared to buying separately',
        'Available in Romanian or English with instant email delivery',
      ],
    },
    specs: {
      weight: '3x Programe Digitale (Livrare Instantă)',
      dimensions: 'Food + Training + Bench · RO / EN',
    },
  },
];
