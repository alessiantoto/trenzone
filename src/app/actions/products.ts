'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import type { Product, InfluencerVideo } from '@/lib/api';
import { isAdminAuthorized } from './admin-auth';
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { getCdnUrl } from '@/lib/utils/cdn';
import { uploadToR2, deleteFromR2, getR2PublicBaseUrl } from '@/lib/r2';
import { DIGITAL_PROGRAM_PRODUCTS, isDigitalProgramId } from '@/lib/programs';
import {
  DEFAULT_DIGITAL_PROGRAM_VIDEO_CONFIG,
  type DigitalProgramsVideoConfig,
} from '@/lib/product-features';

// Helper to safely parse JSONB fields from DB
const parseJSONB = (val: any) => {
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch (e) { return val; }
  }
  return val;
};

const LOCAL_PRODUCT_IMAGES = new Set([
  'x10_elbow_wraps_purple.webp',
  'x10_elbow_wraps_white.webp',
  'x10_wrist_wraps_purple.webp',
  'x10_wrist_wraps_white.webp',
  'heavy_lifting_belt.webp',
  'program_food_plan.webp',
  'program_training_program.webp',
  'program_bench_program.webp',
  'program_complete_bundle.webp',
  'program_complete_3_bundle.webp',
  'program_complete_trio_v2.webp',
  'x5_elbow_wraps_blue_1.webp',
  'x5_elbow_wraps_purple_1.webp',
  'x5_elbow_wraps_purple_2.webp',
  'x5_elbow_wraps_purple_square.webp',
  'x5_elbow_wraps_red_1.webp',
  'shirt_stay_hard.webp',
  'shirt_eat_tren_sleep_repeat.webp',
  'shirt_beast.webp',
  'shirt_soldier_of_god.webp',
  'shirt_pain_creates_men.webp',
]);

const LEGACY_PRODUCT_IMAGE_MAP: Record<string, string> = {
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

const normalizeProductImageUrl = (url: any): string => {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('data:')) return url;
  const rawName = url.split('/').pop()?.split('?')[0]?.split('#')[0] || '';
  const fileName = LEGACY_PRODUCT_IMAGE_MAP[rawName] || rawName;
  if (LOCAL_PRODUCT_IMAGES.has(fileName)) {
    return getCdnUrl(`/images/products/${fileName}`);
  }
  return getCdnUrl(url);
};

// Map DB row to Product interface
const mapProduct = (p: any, preserveLocalized: boolean = false): Product => {
  // name and description might be JSONB for i18n
  const parsedName = parseJSONB(p.name);
  const parsedDesc = parseJSONB(p.description);
  const nameVal = preserveLocalized
    ? (parsedName && typeof parsedName === 'object' ? parsedName : (p.name || ''))
    : (parsedName && typeof parsedName === 'object' ? (parsedName.ro || parsedName.en || '') : (p.name || ''));
  const descVal = preserveLocalized
    ? (parsedDesc && typeof parsedDesc === 'object' ? parsedDesc : (p.description || ''))
    : (parsedDesc && typeof parsedDesc === 'object' ? (parsedDesc.ro || parsedDesc.en || '') : (p.description || ''));

  const DEFAULT_IMAGE = '/images/products/x10_elbow_wraps_purple.webp';
  const rawMain = (p.main_image && typeof p.main_image === 'string' && !p.main_image.includes('cdn.shopify.com')) ? p.main_image : DEFAULT_IMAGE;
  const mainImage = normalizeProductImageUrl(rawMain) || DEFAULT_IMAGE;
  const allImages = p.images && p.images.length > 0 
    ? p.images
        .filter((img: string) => typeof img === 'string' && !img.includes('cdn.shopify.com'))
        .map(normalizeProductImageUrl)
    : [mainImage];

  const parsedVariants = parseJSONB(p.variants) || undefined;
  if (parsedVariants?.options && Array.isArray(parsedVariants.options)) {
    parsedVariants.options = parsedVariants.options.map((opt: any) => ({
      ...opt,
      ...(opt.image ? { image: normalizeProductImageUrl(opt.image) } : {}),
    }));
  }

  const parsedSpecsSummary = parseJSONB(p.specs_summary) || undefined;
  const isDigital =
    Boolean(parsedSpecsSummary?.is_digital) || isDigitalProgramId(p.id || p.slug);
  const fallbackDigital = isDigital
    ? DIGITAL_PROGRAM_PRODUCTS.find((dp) => dp.id === p.id || dp.slug === p.slug)
    : undefined;
  const parsedAdvantages = parseJSONB(p.advantages) || fallbackDigital?.benefits || undefined;

  // Normalize legacy verbose digital program names/emojis if present in DB
  let finalName = nameVal;
  if (isDigital && fallbackDigital) {
    const rawStr = typeof nameVal === 'object' ? `${nameVal.ro || ''} ${nameVal.en || ''}` : String(nameVal || '');
    if (
      rawStr.includes('FOOD PLAN —') ||
      rawStr.includes('BENCH PROGRAM —') ||
      rawStr.includes('PACHET COMPLET:') ||
      rawStr.includes('Complete Nutrition &') ||
      rawStr.includes('Bench Press Technique')
    ) {
      finalName = preserveLocalized
        ? fallbackDigital.name
        : (typeof fallbackDigital.name === 'object' ? fallbackDigital.name.ro : fallbackDigital.name);
    }
  }

  let finalVariants = parsedVariants?.options?.length ? parsedVariants : (fallbackDigital?.variants || parsedVariants);
  if (isDigital && finalVariants?.options && Array.isArray(finalVariants.options)) {
    finalVariants = {
      ...finalVariants,
      label: { ro: 'Limbă', en: 'Language' },
      options: finalVariants.options.map((opt: any) => {
        const cleanStr = (s: any) =>
          typeof s === 'string'
            ? s.replace(/^(🇷🇴|🇬🇧)\s*/g, '').replace(/\s*\(PDF\)/gi, '').trim()
            : s;
        const rawBadge = typeof opt.badge === 'string' ? opt.badge.trim().toUpperCase() : '';
        const cleanedBadge = (rawBadge === 'ROMÂNĂ' || rawBadge === 'ROMANA' || rawBadge === 'ENGLISH')
          ? undefined
          : opt.badge;
        return {
          ...opt,
          badge: cleanedBadge,
          name: typeof opt.name === 'object' && opt.name !== null
            ? { ro: cleanStr(opt.name.ro), en: cleanStr(opt.name.en) }
            : cleanStr(opt.name),
        };
      }),
    };
  }

  return {
    id: p.id,
    slug: p.slug,
    is_digital: isDigital,
    name: finalName,
    price: p.price_numeric !== null && p.price_numeric !== undefined ? parseFloat(p.price_numeric) : (fallbackDigital ? Number(fallbackDigital.price) : 0),
    originalPrice: p.original_price_numeric ? parseFloat(p.original_price_numeric) : (fallbackDigital?.originalPrice ? Number(fallbackDigital.originalPrice) : undefined),
    badge: p.badge || fallbackDigital?.badge || undefined,
    description: descVal,
    image: mainImage,
    images: allImages,
    stock_quantity: p.stock_quantity ?? (isDigital ? 9999 : 0),
    weight: isDigital ? 0 : (p.weight || 0.5),
    length_mm: isDigital ? 0 : (p.length_mm || 100),
    width_mm: isDigital ? 0 : (p.width_mm || 100),
    height_mm: isDigital ? 0 : (p.height_mm || 100),
    is_active: p.is_active ?? true,
    variants: finalVariants,
    bundleVariants: parseJSONB(p.bundlevariants || p.bundleVariants) || undefined,
    advantages: parsedAdvantages,
    benefits: parsedAdvantages,
    specs: fallbackDigital?.specs || undefined,
    specs_summary: parsedSpecsSummary,
    usage_signs: parseJSONB(p.usage_signs) || undefined,
    metadata: parseJSONB(p.metadata) || undefined,
  };
};

const PUBLIC_PRODUCT_COLUMNS = 'id, slug, name, price_numeric, original_price_numeric, description, main_image, images, badge, stock_quantity, weight, length_mm, width_mm, height_mm, is_active, variants, bundlevariants, advantages, usage_signs, specs_summary, metadata';

const FALLBACK_TRENZONE_PRODUCTS: Product[] = [
  {
    id: "2fd4ee73-6800-4f76-a74d-208fffea0fb6",
    slug: "x10-elbow-wraps",
    name: {
      ro: "X10 Elbow Wraps",
      en: "X10 Elbow Wraps"
    },
    price: 409.99,
    originalPrice: 479.99,
    badge: "PR CHASER · +20 KG",
    image: "/images/products/x10_elbow_wraps_purple.webp",
    images: [
      "/images/products/x10_elbow_wraps_purple.webp",
      "/images/products/x10_elbow_wraps_white.webp"
    ],
    variants: {
      type: "flavor",
      label: { ro: "Culoare", en: "Color" },
      options: [
        {
          name: { ro: "Purple", en: "Purple" },
          color: "#a855f7",
          image: "/images/products/x10_elbow_wraps_purple.webp",
          imageIndex: 0,
          stock_status: "in_stock",
          badge: "BEST SELLER"
        },
        {
          name: { ro: "White (Precomandă)", en: "White (Pre-Order)" },
          color: "#f8fafc",
          image: "/images/products/x10_elbow_wraps_white.webp",
          imageIndex: 1,
          stock_status: "preorder",
          badge: "PRECOMANDĂ"
        }
      ]
    },
    description: {
      ro: "Ediția X10. Rigiditate extremă de competiție, densitate multi-strat de 1.2 kg și până la +20 kg asistență mecanică pe urcare la seriile grele de împins.",
      en: "X10 Edition. Extreme competition-grade stiffness, 1.2 kg multi-layered weave, and up to +20 kg mechanical rebound assist on heavy pressing sets."
    },
    advantages: {
      ro: ["Până la +20 kg asistență mecanică la bench press", "Stabilitate de fier pe încărcături mari", "Țesătură rigidă multi-strat anti-alunecare", "Testat și aprobat la împinsuri de peste 200 kg"],
      en: ["Up to +20 kg mechanical rebound assist on bench press", "Rock-solid stability on heavy loads", "Rigid multi-layer non-slip construction", "Tested and proven on 200+ kg presses"]
    },
    usage_signs: {
      ro: ["Serii de forță maximă și PR-uri la bench press", "Protecție pe greutăți de peste 100 kg", "Powerlifting și antrenamente de forță brută"],
      en: ["Max strength sets and bench press PRs", "Protection on heavy loads over 100 kg", "Powerlifting and raw strength training"]
    },
    stock_quantity: 80,
    weight: 1.2,
    length_mm: 350,
    width_mm: 180,
    height_mm: 90,
    is_active: true
  },
  {
    id: "997b3e3c-511b-4e02-8a58-7d59bbf5a154",
    slug: "x5-elbow-wraps",
    name: {
      ro: "X5 Elbow Wraps",
      en: "X5 Elbow Wraps"
    },
    price: 309.99,
    originalPrice: 359.99,
    badge: "HIPERTROFIE & VOLUM",
    image: "/images/products/x5_elbow_wraps_purple_1.webp",
    images: [
      "/images/products/x5_elbow_wraps_purple_1.webp",
      "/images/products/x5_elbow_wraps_purple_2.webp",
      "/images/products/x5_elbow_wraps_red_1.webp",
      "/images/products/x5_elbow_wraps_blue_1.webp"
    ],
    variants: {
      type: "flavor",
      label: { ro: "Culoare", en: "Color" },
      options: [
        {
          name: { ro: "Purple", en: "Purple" },
          color: "#a855f7",
          image: "/images/products/x5_elbow_wraps_purple_1.webp",
          imageIndex: 0,
          stock_status: "in_stock",
          badge: "BEST SELLER"
        },
        {
          name: { ro: "Red", en: "Red" },
          color: "#ef4444",
          image: "/images/products/x5_elbow_wraps_red_1.webp",
          imageIndex: 2,
          stock_status: "in_stock"
        },
        {
          name: { ro: "Blue", en: "Blue" },
          color: "#3b82f6",
          image: "/images/products/x5_elbow_wraps_blue_1.webp",
          imageIndex: 3,
          stock_status: "in_stock"
        }
      ]
    },
    description: {
      ro: "Ediția X5. Protecție excelentă a tendoanelor, mobilitate naturală și suport echilibrat pentru antrenamente de hipertrofie și volum.",
      en: "X5 Edition. Maximum tendon comfort, natural mobility, and balanced joint support for hypertrophy and volume training."
    },
    advantages: {
      ro: ["Protecție articulară și reducere a tensiunii pe tendoane", "Mobilitate optimă pe toată cursa de mișcare", "Ideal pentru împins cu gantere, flexii și serii de pompare", "Material respirabil ultra-rezistent"],
      en: ["Joint protection and reduced tendon stress", "Optimal mobility throughout full range of motion", "Ideal for dumbbell presses, curls, and pump sets", "Ultra-durable breathable weave"]
    },
    usage_signs: {
      ro: ["Antrenamente de hipertrofie și volum", "Disconfort sau dureri articulare ușoare la coate", "Exerciții de accesorii și izolare"],
      en: ["Hypertrophy and high-volume training", "Mild elbow discomfort or tendon irritation", "Accessory and isolation exercises"]
    },
    stock_quantity: 150,
    weight: 0.7,
    length_mm: 1000,
    width_mm: 75,
    height_mm: 10,
    is_active: true
  },
  {
    id: "def7b180-aaa9-42eb-babf-e0ae1a981aba",
    slug: "x10-wrist-wraps",
    name: {
      ro: "X10 Wrist Wraps",
      en: "X10 Wrist Wraps"
    },
    price: 249.99,
    originalPrice: 299.99,
    badge: "EXTREME STIFFNESS",
    image: "/images/products/x10_wrist_wraps_purple.webp",
    images: [
      "/images/products/x10_wrist_wraps_purple.webp",
      "/images/products/x10_wrist_wraps_white.webp"
    ],
    variants: {
      type: "flavor",
      label: { ro: "Culoare", en: "Color" },
      options: [
        {
          name: { ro: "Purple", en: "Purple" },
          color: "#a855f7",
          image: "/images/products/x10_wrist_wraps_purple.webp",
          imageIndex: 0,
          stock_status: "in_stock",
          badge: "BEST SELLER"
        },
        {
          name: { ro: "White", en: "White" },
          color: "#f8fafc",
          image: "/images/products/x10_wrist_wraps_white.webp",
          imageIndex: 1,
          stock_status: "in_stock"
        }
      ]
    },
    description: {
      ro: "Fașe de încheietură heavy-duty rigiditate extremă, lungime 60cm cu buclă ranforsată pentru degetul mare și velcro militar supradimensionat. Imobilizează încheietura în unghi neutru pentru împins cu bară, gantere și log press fără deviații sau dureri.",
      en: "Extreme stiffness heavy-duty 60cm wrist wraps with reinforced thumb loop and oversized military-grade velcro. Locks the wrist joint in a rigid neutral position for heavy bench, dumbbell pressing, and overhead work with zero joint collapse."
    },
    advantages: {
      ro: [
        "Rigiditate maximă pentru blocarea completă a încheieturii",
        "Velcro militar de 50mm cu prindere ultra-sigură ce nu cedează",
        "Buclă pentru deget elastică ranforsată pentru poziționare rapidă",
        "Elimină complet durerile de încheietură pe greutăți mari"
      ],
      en: [
        "Maximum stiffness weave for absolute wrist lock",
        "Oversized 50mm military velcro for non-slip hold",
        "Reinforced elastic thumb loop for fast wrapping",
        "Eliminates wrist pain and hyper-extension on heavy presses"
      ]
    },
    usage_signs: {
      ro: [
        "Împins la piept cu bară sau gantere peste 100 kg",
        "Împins deasupra capului (Overhead Press) și Push Press",
        "Protecția încheieturii împotriva hiperextensiei sub presiune"
      ],
      en: [
        "Heavy bench press and dumbbell presses over 100 kg",
        "Overhead press and push press",
        "Prevents joint hyper-extension under extreme loads"
      ]
    },
    stock_quantity: 75,
    weight: 0.35,
    length_mm: 600,
    width_mm: 80,
    height_mm: 10,
    is_active: true
  },
  {
    id: "dd477884-5fd8-4d8f-ab75-1cade13c1cc8",
    slug: "centura-powerlifting",
    name: {
      ro: "Heavy Lifting Belt",
      en: "Heavy Lifting Belt"
    },
    price: 599.99,
    originalPrice: 649.99,
    badge: "IPF GRADE · 13MM",
    image: "/images/products/heavy_lifting_belt.webp",
    images: [
      "/images/products/heavy_lifting_belt.webp"
    ],
    variants: {
      type: "size",
      label: { ro: "Mărime", en: "Size" },
      options: [
        { name: { ro: "XS (57.5-70 cm)", en: "XS (57.5-70 cm)" }, stock_status: "in_stock" },
        { name: { ro: "S (65-80 cm)", en: "S (65-80 cm)" }, stock_status: "in_stock" },
        { name: { ro: "M (72.5-90 cm)", en: "M (72.5-90 cm)" }, badge: "POPULAR", stock_status: "in_stock" },
        { name: { ro: "L (80-100 cm)", en: "L (80-100 cm)" }, stock_status: "in_stock" },
        { name: { ro: "XL (87.5-110 cm)", en: "XL (87.5-110 cm)" }, stock_status: "in_stock" },
        { name: { ro: "2XL (95-120 cm)", en: "2XL (95-120 cm)" }, stock_status: "in_stock" }
      ]
    },
    description: {
      ro: "Centură profesională de powerlifting din 100% piele naturală veritabilă, grosime 13mm și cataramă metalică rapidă cu levier (Quick-Release Lever). Presiune intra-abdominală maximă și suport complet pentru coloană la genuflexiuni și îndreptări de nivel competițional.",
      en: "Competition-grade 13mm 100% genuine leather powerlifting belt with heavy-duty quick-release steel lever. Maximizes intra-abdominal pressure and provides unyielding lumbar support for heavy squats and deadlifts."
    },
    advantages: {
      ro: [
        "100% Piele naturală tratată de 13mm grosime maximă aprobată",
        "Cataramă lever din oțel masiv cu închidere instantanee",
        "Susținere intra-abdominală de neclintit pe genuflexiuni și deadlifts",
        "Finisaj interior velur anti-alunecare pentru aderență optimă pe haine"
      ],
      en: [
        "13mm competition-spec 100% genuine treated leather",
        "Heavy-duty steel quick-release lever mechanism",
        "Unyielding intra-abdominal support for maximum lifts",
        "Non-slip inner suede lining locks securely onto apparel"
      ]
    },
    usage_signs: {
      ro: [
        "Genuflexiuni grele și PR-uri de competiție",
        "Îndreptări (Deadlifts) de forță maximă",
        "Protecție absolută a zonei lombare sub încărcături mari"
      ],
      en: [
        "Heavy squat PRs and competition sets",
        "Max deadlifts and power cleans",
        "Ultimate lumbar spine protection under heavy spinal loading"
      ]
    },
    stock_quantity: 50,
    weight: 1.5,
    length_mm: 400,
    width_mm: 200,
    height_mm: 140,
    is_active: true
  },
  {
    id: "35ad173c-9305-42d8-b0c1-0e9bdabdb31c",
    slug: "tricou-trenzone",
    name: {
      ro: "TREN Oversized Tee",
      en: "TREN Oversized Tee"
    },
    price: 239.99,
    originalPrice: 279.99,
    badge: "OVERSIZED FIT",
    image: "/images/products/shirt_stay_hard.webp",
    images: [
      "/images/products/shirt_stay_hard.webp",
      "/images/products/shirt_eat_tren_sleep_repeat.webp",
      "/images/products/shirt_beast.webp",
      "/images/products/shirt_soldier_of_god.webp",
      "/images/products/shirt_pain_creates_men.webp"
    ],
    variants: {
      type: "design",
      label: { ro: "Model", en: "Design" },
      options: [
        {
          name: { ro: "Stay Hard", en: "Stay Hard" },
          badge: "BEST SELLER",
          image: "/images/products/shirt_stay_hard.webp",
          imageIndex: 0,
          stock_status: "in_stock"
        },
        {
          name: { ro: "Eat Tren Sleep Repeat", en: "Eat Tren Sleep Repeat" },
          badge: "TRENZONE OG",
          image: "/images/products/shirt_eat_tren_sleep_repeat.webp",
          imageIndex: 1,
          stock_status: "in_stock"
        },
        {
          name: { ro: "Beast", en: "Beast" },
          badge: "POPULAR",
          image: "/images/products/shirt_beast.webp",
          imageIndex: 2,
          stock_status: "in_stock"
        },
        {
          name: { ro: "Soldier of God", en: "Soldier of God" },
          badge: "LIMITED",
          image: "/images/products/shirt_soldier_of_god.webp",
          imageIndex: 3,
          stock_status: "in_stock"
        },
        {
          name: { ro: "Pain Creates Men", en: "Pain Creates Men" },
          badge: "HARDCORE",
          image: "/images/products/shirt_pain_creates_men.webp",
          imageIndex: 4,
          stock_status: "in_stock"
        }
      ]
    },
    bundleVariants: {
      size: {
        label: { ro: "Mărime", en: "Size" },
        options: ["S", "M", "L", "XL", "2XL"]
      }
    },
    description: {
      ro: "Tricou heavy-weight premium oversized fit (washed black), realizat din 80% bumbac și 20% poliester (240 GSM), printuri statement high-definition, guler întărit și emblemă TrenZone®.",
      en: "Heavy-weight premium washed-black oversized fit tee crafted from an 80% cotton, 20% polyester blend (240 GSM), featuring high-definition statement prints, a reinforced collar, and TrenZone® emblem."
    },
    advantages: {
      ro: [
        "Amestec premium 80% bumbac, 20% poliester de densitate înaltă (240 GSM)",
        "Croială relaxată oversized perfectă pentru sală și stradă",
        "Cusături duble ranforsate rezistente la uzură intensă",
        "Își păstrează forma și aspectul după spălări repetate"
      ],
      en: [
        "Premium 80% cotton, 20% polyester heavy blend (240 GSM)",
        "Relaxed oversized drape ideal for lifting and streetwear",
        "Reinforced double-stitched seams for long-term durability",
        "Retains shape, structure, and finish wash after wash"
      ]
    },
    usage_signs: {
      ro: [
        "Antrenamente grele la sală",
        "Stil streetwear și lifestyle",
        "Confort maxim pe toată durata zilei"
      ],
      en: [
        "Heavy gym workouts",
        "Streetwear & casual lifestyle",
        "All-day comfort and breathability"
      ]
    },
    stock_quantity: 100,
    weight: 0.35,
    length_mm: 300,
    width_mm: 250,
    height_mm: 20,
    is_active: true
  },
  ...DIGITAL_PROGRAM_PRODUCTS,
];

const PRODUCT_DISPLAY_ORDER: Record<string, number> = {
  'x10-elbow-wraps': 1,
  'x5-elbow-wraps': 2,
  'x10-wrist-wraps': 3,
  'centura-powerlifting': 4,
  'tricou-trenzone': 5,
  'pachet-programe-vlad-tren': 6,
  'food-plan-vlad-tren': 7,
  'training-program-vlad-tren': 8,
  'bench-program-vlad-tren': 9,
};

const mergeWithDigitalPrograms = (list: Product[], preserveLocalized = true): Product[] => {
  const merged = [...list];
  for (const dp of DIGITAL_PROGRAM_PRODUCTS) {
    if (!merged.some((p) => p.id === dp.id || p.slug === dp.slug)) {
      if (preserveLocalized) {
        merged.push(dp);
      } else {
        merged.push({
          ...dp,
          name: typeof dp.name === 'object' ? (dp.name.ro || dp.name.en || '') : dp.name,
          description: typeof dp.description === 'object' ? (dp.description.ro || dp.description.en || '') : dp.description,
        });
      }
    }
  }
  return merged;
};

const sortProductsCanonical = (list: Product[]): Product[] => {
  return [...list]
    .map((p) => ({
      ...p,
      image: normalizeProductImageUrl(p.image),
      images: Array.isArray(p.images) ? p.images.map(normalizeProductImageUrl) : p.images,
      variants: p.variants?.options
        ? {
            ...p.variants,
            options: p.variants.options.map((opt: any) => ({
              ...opt,
              ...(opt.image ? { image: normalizeProductImageUrl(opt.image) } : {}),
            })),
          }
        : p.variants,
    }))
    .sort((a, b) => {
      const oA = PRODUCT_DISPLAY_ORDER[a.slug] ?? 99;
      const oB = PRODUCT_DISPLAY_ORDER[b.slug] ?? 99;
      return oA - oB;
    });
};

const getCachedProducts = unstable_cache(
  async (): Promise<Product[]> => {
    try {
      const { data, error } = await supabaseAdmin
        .from('products')
        .select(PUBLIC_PRODUCT_COLUMNS)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error || !data || data.length === 0) {
        return sortProductsCanonical(FALLBACK_TRENZONE_PRODUCTS);
      }

      const mapped = mergeWithDigitalPrograms((data || []).map((p) => mapProduct(p, true)), true);
      return mapped.length > 0 ? sortProductsCanonical(mapped) : sortProductsCanonical(FALLBACK_TRENZONE_PRODUCTS);
    } catch {
      return sortProductsCanonical(FALLBACK_TRENZONE_PRODUCTS);
    }
  },
  ['public-products-list-v19'],
  {
    revalidate: 2592000, // 30 days cache — purged on admin edit or manual cache clear
    tags: ['products']
  }
);

export async function getProductsServer(): Promise<Product[]> {
  return getCachedProducts();
}

export async function getAdminProductsServer(): Promise<Product[]> {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) {
    return [];
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select(PUBLIC_PRODUCT_COLUMNS)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return sortProductsCanonical(FALLBACK_TRENZONE_PRODUCTS);
    }

    return sortProductsCanonical(mergeWithDigitalPrograms((data || []).map((p) => mapProduct(p, false)), false));
  } catch {
    return sortProductsCanonical(FALLBACK_TRENZONE_PRODUCTS);
  }
}

const getCachedProductBySlug = unstable_cache(
  async (slug: string): Promise<Product | null> => {
    const decodedSlug = decodeURIComponent(slug);
    try {
      const { data, error } = await supabaseAdmin
        .from('products')
        .select(PUBLIC_PRODUCT_COLUMNS)
        .eq('slug', decodedSlug)
        .maybeSingle();

      if (error || !data) {
        const fallback = FALLBACK_TRENZONE_PRODUCTS.find(p => p.slug === decodedSlug || p.slug.includes(decodedSlug) || decodedSlug.includes(p.slug));
        return fallback ? sortProductsCanonical([fallback])[0] : null;
      }

      return mapProduct(data, true);
    } catch {
      const fallback = FALLBACK_TRENZONE_PRODUCTS.find(p => p.slug === decodedSlug || p.slug.includes(decodedSlug) || decodedSlug.includes(p.slug));
      return fallback ? sortProductsCanonical([fallback])[0] : null;
    }
  },
  ['product-by-slug-v17'],
  {
    revalidate: 2592000, // 30 days cache — purged on admin edit or manual cache clear
    tags: ['products']
  }
);

export async function getProductBySlugServer(slug: string): Promise<Product | null> {
  return getCachedProductBySlug(slug);
}

const LOCAL_TEST_INFLUENCERS: InfluencerVideo[] = [
  { id: 'trenwraps-1', influencer_name: '', video_url: 'https://pub-a0354123ab7743d48270daf444febc26.r2.dev/trenwraps_1.mp4', display_order: 1, is_active: true },
  { id: 'trenwraps-2', influencer_name: '', video_url: 'https://pub-a0354123ab7743d48270daf444febc26.r2.dev/trenwraps_2.mp4', display_order: 2, is_active: true },
  { id: 'trenwraps-3', influencer_name: '', video_url: 'https://pub-a0354123ab7743d48270daf444febc26.r2.dev/trenwraps_3.mp4', display_order: 3, is_active: true },
  { id: 'trenwraps-4', influencer_name: '', video_url: 'https://pub-a0354123ab7743d48270daf444febc26.r2.dev/trenwraps_4.mp4', display_order: 4, is_active: true },
  { id: 'trenwraps-5', influencer_name: '', video_url: 'https://pub-a0354123ab7743d48270daf444febc26.r2.dev/trenwraps_5.mp4', display_order: 5, is_active: true },
  { id: 'trenwraps-6', influencer_name: '', video_url: 'https://pub-a0354123ab7743d48270daf444febc26.r2.dev/trenwraps_6.mp4', display_order: 6, is_active: true },
  { id: 'trenwraps-7', influencer_name: '', video_url: 'https://pub-a0354123ab7743d48270daf444febc26.r2.dev/trenwraps_7.mp4', display_order: 7, is_active: true },
  { id: 'trenwraps-8', influencer_name: '', video_url: 'https://pub-a0354123ab7743d48270daf444febc26.r2.dev/trenwraps_8.mp4', display_order: 8, is_active: true },
  { id: 'trenwraps-9', influencer_name: '', video_url: 'https://pub-a0354123ab7743d48270daf444febc26.r2.dev/trenwraps_9.mp4', display_order: 9, is_active: true },
  { id: 'trenwraps-10', influencer_name: '', video_url: 'https://pub-a0354123ab7743d48270daf444febc26.r2.dev/trenwraps_10.mp4', display_order: 10, is_active: true },
  { id: 'trenwraps-11', influencer_name: '', video_url: 'https://pub-a0354123ab7743d48270daf444febc26.r2.dev/trenwraps_11.mp4', display_order: 11, is_active: true },
  { id: 'trenwraps-12', influencer_name: '', video_url: 'https://pub-a0354123ab7743d48270daf444febc26.r2.dev/trenwraps_12.mp4', display_order: 12, is_active: true },
];

const getCachedPublicInfluencers = unstable_cache(
  async (): Promise<InfluencerVideo[]> => {
    try {
      const { data, error } = await supabaseAdmin
        .from('influencers')
        .select('id, video_url, poster_url, influencer_name, influencer_handle, display_order, is_active')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      const list = (!error && data && data.length > 0) ? (data as InfluencerVideo[]) : LOCAL_TEST_INFLUENCERS;
      return list.map(inf => ({
        ...inf,
        video_url: getCdnUrl(inf.video_url),
      }));
    } catch {
      return LOCAL_TEST_INFLUENCERS.map(inf => ({
        ...inf,
        video_url: getCdnUrl(inf.video_url),
      }));
    }
  },
  ['public-influencers-v9'],
  {
    revalidate: 2592000, // 30 days cache — purged on admin edit or manual cache clear
    tags: ['influencers']
  }
);

export async function getPublicInfluencers(): Promise<InfluencerVideo[]> {
  return getCachedPublicInfluencers();
}

const getCachedDigitalProgramsVideoConfig = unstable_cache(
  async (): Promise<DigitalProgramsVideoConfig> => {
    try {
      const { data, error } = await supabaseAdmin
        .from('store_settings')
        .select('value')
        .eq('key', 'digital_programs_video_config')
        .maybeSingle();

      if (error || !data?.value || typeof data.value !== 'object') {
        return DEFAULT_DIGITAL_PROGRAM_VIDEO_CONFIG;
      }

      const raw = data.value as Partial<DigitalProgramsVideoConfig>;
      return {
        show_on_programs:
          typeof raw.show_on_programs === 'boolean'
            ? raw.show_on_programs
            : DEFAULT_DIGITAL_PROGRAM_VIDEO_CONFIG.show_on_programs,
        influencer_ids: Array.isArray(raw.influencer_ids)
          ? raw.influencer_ids.map(String)
          : DEFAULT_DIGITAL_PROGRAM_VIDEO_CONFIG.influencer_ids,
        title_ro:
          typeof raw.title_ro === 'string' && raw.title_ro.trim()
            ? raw.title_ro.trim()
            : DEFAULT_DIGITAL_PROGRAM_VIDEO_CONFIG.title_ro,
        title_en:
          typeof raw.title_en === 'string' && raw.title_en.trim()
            ? raw.title_en.trim()
            : DEFAULT_DIGITAL_PROGRAM_VIDEO_CONFIG.title_en,
        subtitle_ro:
          typeof raw.subtitle_ro === 'string' && raw.subtitle_ro.trim()
            ? raw.subtitle_ro.trim()
            : DEFAULT_DIGITAL_PROGRAM_VIDEO_CONFIG.subtitle_ro,
        subtitle_en:
          typeof raw.subtitle_en === 'string' && raw.subtitle_en.trim()
            ? raw.subtitle_en.trim()
            : DEFAULT_DIGITAL_PROGRAM_VIDEO_CONFIG.subtitle_en,
      };
    } catch {
      return DEFAULT_DIGITAL_PROGRAM_VIDEO_CONFIG;
    }
  },
  ['digital-programs-video-config-v1'],
  {
    revalidate: 2592000,
    tags: ['influencers', 'products'],
  }
);

export async function getDigitalProgramsVideoConfig(): Promise<DigitalProgramsVideoConfig> {
  return getCachedDigitalProgramsVideoConfig();
}

export async function deleteProductServer(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const isAuthorized = await isAdminAuthorized();
    if (!isAuthorized) {
      return { success: false, error: 'Unauthorized' };
    }

    // Delete orphaned images from storage
    const { data: product } = await supabaseAdmin.from('products').select('*').eq('id', id).single();
    if (product) {
      const filesToDelete: string[] = [];
      if (product.main_image) {
        try {
          const url = new URL(product.main_image);
          const pathParts = url.pathname.split('/public/products/');
          if (pathParts.length > 1) filesToDelete.push(pathParts[1]);
        } catch(e) {}
      }
      const variants = parseJSONB(product.variants);
      if (variants && variants.options) {
        for (const v of variants.options) {
          if (v.image) {
            try {
              const url = new URL(v.image);
              const pathParts = url.pathname.split('/public/products/');
              if (pathParts.length > 1) filesToDelete.push(pathParts[1]);
            } catch(e) {}
          }
        }
      }
      if (filesToDelete.length > 0) {
        await supabaseAdmin.storage.from('products').remove(filesToDelete);
      }
    }

    const { error } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting product:', error);
      return { success: false, error: error.message };
    }

    revalidateTag('products', 'max');
    revalidatePath('/', 'layout');
    revalidatePath('/api/products');
    revalidatePath('/sitemap.xml');
    revalidatePath('/[locale]/shop', 'page');
    revalidatePath('/[locale]', 'page');
    revalidatePath('/admin/products');

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting product:', error);
    return { success: false, error: error.message };
  }
}

function generateSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

export async function saveProductServer(formData: FormData): Promise<{ success: boolean; error?: string; slug?: string; id?: string }> {
  try {
    const isAuthorized = await isAdminAuthorized();
    if (!isAuthorized) {
      return { success: false, error: 'Unauthorized' };
    }

    const productData = JSON.parse(formData.get('product') as string);
    const variantsData = JSON.parse(formData.get('variants') as string);

    const isNew = productData.id === 'nou' || !productData.id;
    let oldProduct: any = null;
    if (!isNew) {
      const { data } = await supabaseAdmin.from('products').select('*').eq('id', productData.id).single();
      oldProduct = data;
    }

    const filesToDelete: string[] = [];
    const r2Base = getR2PublicBaseUrl();

    let mainImageUrl = productData.image || null;

    const ALLOWED_IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'];
    const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

    // 1. Upload Main Image
    const mainImageFile = formData.get('mainImage') as File | null;
    if (mainImageFile) {
      if (oldProduct && oldProduct.main_image) {
        try {
          const oldUrl = oldProduct.main_image;
          if (oldUrl.includes('r2.dev') || (r2Base && oldUrl.includes(r2Base))) {
            await deleteFromR2(oldUrl).catch(() => {});
          } else {
            const url = new URL(oldUrl);
            const pathParts = url.pathname.split('/public/products/');
            if (pathParts.length > 1) filesToDelete.push(pathParts[1]);
          }
        } catch(e) {}
      }
      const ext = (mainImageFile.name.split('.').pop() || '').toLowerCase();
      if (!ALLOWED_IMAGE_EXTS.includes(ext) || (mainImageFile.type && !ALLOWED_IMAGE_MIMES.includes(mainImageFile.type))) {
        return { success: false, error: "Format imagine nepermis. Formate permise: JPG, PNG, WEBP, GIF, AVIF." };
      }
      const fileName = `${Date.now()}_main.${ext}`;

      if (process.env.R2_BUCKET_NAME && r2Base) {
        const bytes = await mainImageFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        mainImageUrl = await uploadToR2(buffer, `products/${fileName}`, mainImageFile.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`);
      } else {
        const { error: uploadError } = await supabaseAdmin.storage
          .from('products')
          .upload(fileName, mainImageFile, {
            upsert: true,
            contentType: mainImageFile.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`
          });
          
        if (uploadError) {
          console.error("Storage upload error:", uploadError);
          return { success: false, error: "Eroare la încărcarea imaginii principale." };
        }
        const { data: publicUrlData } = supabaseAdmin.storage.from('products').getPublicUrl(fileName);
        mainImageUrl = publicUrlData.publicUrl;
      }
    }

    // 2. Upload Variant Images & Map Variants
    const finalVariants = [];
    for (const v of variantsData) {
      let vImageUrl = v.image || null;
      const vFile = formData.get(`variantImage_${v.id}`) as File | null;
      if (vFile) {
        if (oldProduct) {
          const oldVariants = parseJSONB(oldProduct.variants);
          const oldVar = oldVariants?.options?.find((opt:any) => opt.id === v.id);
          if (oldVar && oldVar.image) {
            try {
              const oldUrl = oldVar.image;
              if (oldUrl.includes('r2.dev') || (r2Base && oldUrl.includes(r2Base))) {
                await deleteFromR2(oldUrl).catch(() => {});
              } else {
                const url = new URL(oldUrl);
                const pathParts = url.pathname.split('/public/products/');
                if (pathParts.length > 1) filesToDelete.push(pathParts[1]);
              }
            } catch(e) {}
          }
        }
        const ext = (vFile.name.split('.').pop() || '').toLowerCase();
        if (!ALLOWED_IMAGE_EXTS.includes(ext) || (vFile.type && !ALLOWED_IMAGE_MIMES.includes(vFile.type))) {
          return { success: false, error: "Format imagine variantă nepermis. Formate permise: JPG, PNG, WEBP, GIF, AVIF." };
        }
        const fileName = `${Date.now()}_var_${v.id}.${ext}`;

        if (process.env.R2_BUCKET_NAME && r2Base) {
          const bytes = await vFile.arrayBuffer();
          const buffer = Buffer.from(bytes);
          vImageUrl = await uploadToR2(buffer, `products/${fileName}`, vFile.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`);
        } else {
          const { error: uploadError } = await supabaseAdmin.storage
            .from('products')
            .upload(fileName, vFile, {
              upsert: true,
              contentType: vFile.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`
            });
          if (!uploadError) {
            const { data: publicUrlData } = supabaseAdmin.storage.from('products').getPublicUrl(fileName);
            vImageUrl = publicUrlData.publicUrl;
          }
        }
      }
      finalVariants.push({
        id: v.id,
        name: v.name,
        price: v.price,
        status: v.status,
        stock: parseInt(v.stock) || 0,
        image: vImageUrl
      });
    }

    // Check for deleted variants that had images
    if (oldProduct) {
      const oldVariants = parseJSONB(oldProduct.variants);
      if (oldVariants && oldVariants.options) {
        for (const oldVar of oldVariants.options) {
          const stillExists = finalVariants.some(v => v.id === oldVar.id);
          if (!stillExists && oldVar.image) {
            try {
              const url = new URL(oldVar.image);
              const pathParts = url.pathname.split('/public/products/');
              if (pathParts.length > 1) filesToDelete.push(pathParts[1]);
            } catch(e) {}
          }
        }
      }
    }

    // 3. Upsert DB Row
    const slug = productData.slug || generateSlug(productData.name);
    const isDigital =
      Boolean(productData.is_digital || productData.specs_summary?.is_digital) ||
      isDigitalProgramId(slug);
    
    // Format JSONB variants properly.
    const defaultDigitalOptions = [
      {
        name: { ro: 'Română', en: 'Romanian' },
        color: '#e32f8c',
        image: mainImageUrl || '/images/products/program_complete_trio_v2.webp',
        imageIndex: 0,
        stock_status: 'in_stock',
      },
      {
        name: { ro: 'English', en: 'English' },
        color: '#3b82f6',
        image: mainImageUrl || '/images/products/program_complete_trio_v2.webp',
        imageIndex: 0,
        stock_status: 'in_stock',
      },
    ];

    const variantsJsonb = { 
      type: productData.variant_type || 'flavor',
      ...(isDigital ? { label: { ro: 'Limbă', en: 'Language' } } : {}),
      options: isDigital && finalVariants.length === 0 ? defaultDigitalOptions : finalVariants,
    };

    const payload: any = {
      name: { ro: productData.name || 'Produs Nou', en: productData.name || 'New Product' },
      slug,
      price_numeric: parseFloat(productData.price) || 0,
      stock_quantity: isDigital ? 9999 : (parseInt(productData.inventory) || 0),
      weight: isDigital ? 0 : 0.5,
      length_mm: isDigital ? 0 : 100,
      width_mm: isDigital ? 0 : 100,
      height_mm: isDigital ? 0 : 100,
      main_image: mainImageUrl,
      images: mainImageUrl ? [mainImageUrl] : [],
      variants: variantsJsonb,
      specs_summary: {
        ...(productData.specs_summary && typeof productData.specs_summary === 'object' ? productData.specs_summary : {}),
        ...(isDigital ? { is_digital: true } : {}),
      },
      is_active: productData.status === 'active'
    };

    let result;
    if (isNew) {
      result = await supabaseAdmin.from('products').insert(payload).select().single();
    } else if (oldProduct) {
      result = await supabaseAdmin.from('products').update(payload).eq('id', productData.id).select().single();
    } else {
      result = await supabaseAdmin
        .from('products')
        .upsert({ id: productData.id, ...payload }, { onConflict: 'id' })
        .select()
        .single();
    }

    if (result.error) {
      console.error("DB Upsert error:", result.error);
      return { success: false, error: result.error.message };
    }

    if (filesToDelete.length > 0) {
      await supabaseAdmin.storage.from('products').remove(filesToDelete);
    }

    revalidateTag('products', 'max');
    revalidatePath('/', 'layout');
    revalidatePath('/api/products');
    revalidatePath('/sitemap.xml');
    revalidatePath('/[locale]/shop', 'page');
    revalidatePath('/[locale]', 'page');
    revalidatePath('/admin/products');

    return { 
      success: true, 
      slug: result.data?.slug || slug,
      id: result.data?.id 
    };
  } catch (error: any) {
    console.error('Error saving product:', error);
    return { success: false, error: error.message };
  }
}

