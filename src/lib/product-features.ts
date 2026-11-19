import type { Product, InfluencerVideo } from './api';
import { isDigitalProgramItem } from './programs';

export type HighlightIconKey =
  | 'dumbbell'
  | 'zap'
  | 'shield'
  | 'mail'
  | 'sparkles'
  | 'check'
  | 'flame'
  | 'target';

export interface ProductHighlightItem {
  icon?: HighlightIconKey;
  title: { ro: string; en: string };
  subtitle: { ro: string; en: string };
}

export interface ProductFaqEntry {
  question: { ro: string; en: string };
  answer: { ro: string; en: string };
}

export interface DigitalProgramsVideoConfig {
  show_on_programs: boolean;
  influencer_ids: string[];
  title_ro: string;
  title_en: string;
  subtitle_ro: string;
  subtitle_en: string;
}

export const DEFAULT_BENCH_CLIP_IDS = ['2', '5', '7', '8', '9', '10', '11'];

export const DEFAULT_DIGITAL_PROGRAM_VIDEO_CONFIG: DigitalProgramsVideoConfig = {
  show_on_programs: true,
  influencer_ids: DEFAULT_BENCH_CLIP_IDS,
  title_ro: 'ANTRENAMENTE PE GREUTĂȚI MARI',
  title_en: 'HEAVY LIFTS IN ACTION',
  subtitle_ro: 'Atleți reali care trag tare la sală',
  subtitle_en: 'Real athletes training hard in the gym',
};

type ProductKind =
  | 'digital-bundle'
  | 'digital-food'
  | 'digital-bench'
  | 'digital-training'
  | 'digital-generic'
  | 'elbow-wraps'
  | 'wrist-wraps'
  | 'belt'
  | 'apparel'
  | 'generic-physical';

export function detectProductKind(product?: Partial<Product> | null): ProductKind {
  if (!product) return 'generic-physical';
  const slug = String(product.slug || '').toLowerCase();
  const id = String(product.id || '').toLowerCase();
  const rawName =
    typeof product.name === 'object'
      ? `${product.name?.ro || ''} ${product.name?.en || ''}`
      : String(product.name || '');
  const hay = `${slug} ${id} ${rawName}`.toLowerCase();

  if (isDigitalProgramItem(product)) {
    if (hay.includes('pachet') || hay.includes('bundle') || hay.includes('complete')) {
      return 'digital-bundle';
    }
    if (hay.includes('food') || hay.includes('nutri') || hay.includes('aliment')) {
      return 'digital-food';
    }
    if (hay.includes('bench') || hay.includes('piept')) {
      return 'digital-bench';
    }
    if (hay.includes('training') || hay.includes('antrenament')) {
      return 'digital-training';
    }
    return 'digital-generic';
  }

  if (hay.includes('wrist')) return 'wrist-wraps';
  if (hay.includes('belt') || hay.includes('centur')) return 'belt';
  if (
    hay.includes('tricou') ||
    hay.includes('shirt') ||
    hay.includes('hoodie') ||
    hay.includes('hanorac') ||
    hay.includes('apparel')
  ) {
    return 'apparel';
  }
  if (hay.includes('elbow') || hay.includes('x10') || hay.includes('x5') || hay.includes('cot')) {
    return 'elbow-wraps';
  }
  return 'generic-physical';
}

export function getDefaultProductHighlights(
  product?: Partial<Product> | null
): ProductHighlightItem[] {
  const kind = detectProductKind(product);

  switch (kind) {
    case 'digital-food':
      return [
        {
          icon: 'mail',
          title: { ro: 'LIVRARE INSTANTĂ', en: 'INSTANT DELIVERY' },
          subtitle: { ro: 'Pe email imediat după plată', en: 'Sent to your email right away' },
        },
        {
          icon: 'flame',
          title: { ro: 'MASĂ & DEFINIRE', en: 'BULK & CUT MENUS' },
          subtitle: { ro: '10 capitole + meniuri concrete', en: '10 chapters + real daily meals' },
        },
        {
          icon: 'check',
          title: { ro: 'ACCES PE VIAȚĂ', en: 'LIFETIME ACCESS' },
          subtitle: { ro: '0 transport · Format digital', en: 'Zero shipping · Digital access' },
        },
      ];

    case 'digital-bench':
      return [
        {
          icon: 'mail',
          title: { ro: 'LIVRARE INSTANTĂ', en: 'INSTANT DELIVERY' },
          subtitle: { ro: 'Pe email imediat după plată', en: 'Sent to your email right away' },
        },
        {
          icon: 'target',
          title: { ro: 'SISTEM 4×4–6 PRO', en: '4×4–6 PROGRESSION' },
          subtitle: { ro: 'Structură clară pentru PR', en: 'Built for heavy bench PRs' },
        },
        {
          icon: 'check',
          title: { ro: 'METODA VLAD TREN', en: 'VLAD TREN SYSTEM' },
          subtitle: { ro: '0 transport · Acces pe viață', en: 'Zero shipping · Lifetime access' },
        },
      ];

    case 'digital-training':
      return [
        {
          icon: 'mail',
          title: { ro: 'LIVRARE INSTANTĂ', en: 'INSTANT DELIVERY' },
          subtitle: { ro: 'Pe email imediat după plată', en: 'Sent to your email right away' },
        },
        {
          icon: 'dumbbell',
          title: { ro: 'SPLIT COMPLET', en: 'FULL WORKOUT SPLIT' },
          subtitle: { ro: 'Serii, repetări și progresie', en: 'Exact sets, reps & progression' },
        },
        {
          icon: 'check',
          title: { ro: 'METODA VLAD TREN', en: 'VLAD TREN SYSTEM' },
          subtitle: { ro: '0 transport · Acces pe viață', en: 'Zero shipping · Lifetime access' },
        },
      ];

    case 'digital-bundle':
    case 'digital-generic':
      return [
        {
          icon: 'mail',
          title: { ro: 'LIVRARE INSTANTĂ', en: 'INSTANT DELIVERY' },
          subtitle: { ro: 'Pe email imediat după plată', en: 'Sent to your email right away' },
        },
        {
          icon: 'sparkles',
          title: { ro: 'SISTEM VLAD TREN', en: 'VLAD TREN SYSTEM' },
          subtitle: { ro: 'Structură clară, zero teorii goale', en: 'Proven structure, zero fluff' },
        },
        {
          icon: 'check',
          title: { ro: 'ACCES PE VIAȚĂ', en: 'LIFETIME ACCESS' },
          subtitle: { ro: '0 transport · Format digital', en: 'Zero shipping · Digital access' },
        },
      ];

    case 'wrist-wraps':
      return [
        {
          icon: 'shield',
          title: { ro: 'RIGIDITATE EXTREMĂ', en: 'EXTREME STIFFNESS' },
          subtitle: { ro: 'Blochează încheietura 100%', en: 'Total wrist joint lockdown' },
        },
        {
          icon: 'zap',
          title: { ro: '60 CM HEAVY-DUTY', en: '60 CM HEAVY-DUTY' },
          subtitle: { ro: 'Compresie maximă sub bară', en: 'Maximum support on heavy lifts' },
        },
        {
          icon: 'dumbbell',
          title: { ro: 'VELCRO MILITAR', en: 'MILITARY VELCRO' },
          subtitle: { ro: 'Nu cedează pe seriile grele', en: 'Zero slip under heavy loads' },
        },
      ];

    case 'belt':
      return [
        {
          icon: 'shield',
          title: { ro: 'PIELE 13MM IPF', en: '13MM GENUINE LEATHER' },
          subtitle: { ro: 'Suport lombar de competiție', en: 'Competition-grade lower back lock' },
        },
        {
          icon: 'zap',
          title: { ro: 'CATARAMĂ LEVER OȚEL', en: 'STEEL LEVER BUCKLE' },
          subtitle: { ro: 'Strângere în mai puțin de 1s', en: 'Quick-release tight lock' },
        },
        {
          icon: 'dumbbell',
          title: { ro: 'BRACING MAXIM', en: 'MAXIMUM BRACING' },
          subtitle: { ro: 'Stabilitate la squat & deadlift', en: 'Rock-solid on squats & pulls' },
        },
      ];

    case 'apparel':
      return [
        {
          icon: 'shield',
          title: { ro: '80% BUMBAC · 20% POLIESTER', en: '80% COTTON · 20% POLYESTER' },
          subtitle: { ro: 'Material dens heavy-weight', en: 'Thick, structured heavy blend' },
        },
        {
          icon: 'sparkles',
          title: { ro: 'CROIALĂ OVERSIZED', en: 'OVERSIZED PUMP FIT' },
          subtitle: { ro: 'Drop-shoulder autentic de sală', en: 'Relaxed gym & street drape' },
        },
        {
          icon: 'check',
          title: { ro: 'REZISTENT LA SPĂLĂRI', en: 'BUILT TO LAST' },
          subtitle: { ro: 'Printuri & cusături ranforsate', en: 'Double-stitched to last' },
        },
      ];

    case 'elbow-wraps':
      return [
        {
          icon: 'dumbbell',
          title: { ro: 'MATERIAL SOLID', en: 'BUILT TO LAST' },
          subtitle: { ro: 'Nu se lasă în timp', en: "Won't stretch out" },
        },
        {
          icon: 'zap',
          title: { ro: 'TESTATE LA 200KG+', en: 'TESTED AT 200KG+' },
          subtitle: { ro: 'Sigure pe seriile grele', en: 'Solid on heavy sets' },
        },
        {
          icon: 'shield',
          title: { ro: 'SUPORT & REBOUND', en: 'SUPPORT & REBOUND' },
          subtitle: { ro: 'Uită de dureri la împins', en: 'Lift pain-free every set' },
        },
      ];

    default:
      return [
        {
          icon: 'sparkles',
          title: { ro: 'CALITATE TRENZONE®', en: 'TRENZONE® QUALITY' },
          subtitle: { ro: 'Testat în sală de atleți', en: 'Tested in the gym by lifters' },
        },
        {
          icon: 'zap',
          title: { ro: 'LIVRARE RAPIDĂ', en: 'FAST SHIPPING' },
          subtitle: { ro: '1-2 zile lucrătoare în RO', en: 'Tracked express courier' },
        },
        {
          icon: 'shield',
          title: { ro: '30 ZILE RETUR', en: '30-DAY RETURNS' },
          subtitle: { ro: 'Schimb sau retur simplu', en: 'Easy returns & exchanges' },
        },
      ];
  }
}

export function getResolvedProductHighlights(
  product: Partial<Product> | null | undefined,
  locale: string
): Array<{ icon: HighlightIconKey; title: string; subtitle: string }> {
  const custom: any[] | undefined = (product as any)?.specs_summary?.highlights;
  const source =
    Array.isArray(custom) &&
    custom.some(
      (h) =>
        (typeof h?.title === 'object' ? h.title.ro || h.title.en : h?.title)?.trim()
    )
      ? custom
      : getDefaultProductHighlights(product);

  const lang = locale === 'en' ? 'en' : 'ro';
  return source
    .filter((h) => {
      const t = typeof h?.title === 'object' ? h.title[lang] || h.title.ro || h.title.en : h?.title;
      return Boolean(t && String(t).trim());
    })
    .slice(0, 3)
    .map((h) => ({
      icon: (h.icon as HighlightIconKey) || 'sparkles',
      title:
        typeof h.title === 'object'
          ? String(h.title[lang] || h.title.ro || h.title.en || '')
          : String(h.title || ''),
      subtitle:
        typeof h.subtitle === 'object'
          ? String(h.subtitle[lang] || h.subtitle.ro || h.subtitle.en || '')
          : String(h.subtitle || ''),
    }));
}

export function getSizeGuideKind(
  product?: Partial<Product> | null
): 'belt' | 'apparel' | null {
  if (!product || isDigitalProgramItem(product)) return null;
  const explicit = (product as any)?.specs_summary?.size_guide_type;
  if (explicit === 'none') return null;
  if (explicit === 'belt' || explicit === 'apparel') return explicit;

  const hasBeltSizes = product.variants?.type === 'size';
  const hasApparelSizes = Boolean(product.bundleVariants?.size?.options?.length);
  if (!hasBeltSizes && !hasApparelSizes) return null;

  const kind = detectProductKind(product);
  if (kind === 'belt' || hasBeltSizes) return 'belt';
  return 'apparel';
}

export function getDefaultProductFaqs(
  product: Partial<Product> | null | undefined,
  locale: string
): Array<{ question: string; answer: string }> {
  const isRo = locale !== 'en';
  const kind = detectProductKind(product);

  if (
    kind === 'digital-food' ||
    kind === 'digital-bench' ||
    kind === 'digital-training' ||
    kind === 'digital-bundle' ||
    kind === 'digital-generic'
  ) {
    return isRo
      ? [
          {
            question: 'Cum și în cât timp primesc programul după plată?',
            answer:
              'Imediat după confirmarea plății cu cardul, Apple Pay sau Google Pay, primești automat pe email ghidul în limba aleasă (Română sau Engleză) plus buton direct de descărcare chiar pe pagina de confirmare.',
          },
          {
            question: 'Trebuie să plătesc transport pentru programele digitale?',
            answer:
              'Nu. Dacă ai în coș doar programe digitale, costul de livrare este 0 RON oriunde te afli, iar livrarea este instantă pe email.',
          },
          {
            question: 'Sunt potrivite și pentru începători sau doar pentru avansați?',
            answer:
              'Sunt scrise direct și practic de Vlad Tren, fără teorie inutilă. Dacă ești la început, eviți lunile de încercări pe ghicite, iar dacă te antrenezi deja, ai structura clară ca să depășești stagnarea.',
          },
          {
            question: 'Ce limbă primesc dacă aleg Română sau Engleză?',
            answer:
              'Primești varianta exactă pentru limba selectată înainte de adăugarea în coș. Limba site-ului este preselectată automat pentru confortul tău.',
          },
        ]
      : [
          {
            question: 'How quickly do I get the program after checkout?',
            answer:
              'Immediately after your card, Apple Pay, or Google Pay payment clears, you automatically receive the guide via email in your selected language plus a direct download button on the confirmation screen.',
          },
          {
            question: 'Do I pay shipping on digital programs?',
            answer:
              'No. Orders containing digital programs ship for 0 cost worldwide with instant email delivery.',
          },
          {
            question: 'Are these suitable for beginners or only advanced lifters?',
            answer:
              'Written directly by Vlad Tren with zero fluff. Beginners save months of trial and error, while experienced lifters get the clear progression framework needed to break plateaus.',
          },
          {
            question: 'Can I choose between English and Romanian?',
            answer:
              'Yes — you receive the exact edition matching the language flag selected before adding to your cart.',
          },
        ];
  }

  if (kind === 'belt') {
    return isRo
      ? [
          {
            question: 'Cum aleg mărimea corectă la centura de powerlifting?',
            answer:
              'Măsoară circumferința taliei exact în dreptul buricului (unde stă centura pe squat și deadlift), nu mărimea de la blugi, apoi verifică Ghidul de Mărimi din pagina produsului.',
          },
          {
            question: 'Se poate regla poziția cataramei Lever?',
            answer:
              'Da. Catarama heavy-duty din oțel se fixează cu șuruburi pe șirul de găuri al centurii, astfel încât să ajustezi strângerea exact pentru corpul tău.',
          },
          {
            question: 'Cât timp durează livrarea și ce garanție am?',
            answer:
              'Livrăm prin curier rapid în 1-2 zile lucrătoare în România și beneficiezi de 30 de zile drept de retur sau schimb de mărime (pentru produse nefolosite, în ambalajul original).',
          },
        ]
      : [
          {
            question: 'How do I choose the right lever belt size?',
            answer:
              'Measure around your waist at navel height (where the belt sits during squats and deadlifts), not your pant size, and match it to our Size Guide chart.',
          },
          {
            question: 'Is the steel lever buckle adjustable?',
            answer:
              'Yes. You can reposition the heavy-duty steel lever plate along the hole spacing to dial in exact bracing tightness.',
          },
          {
            question: 'How fast is shipping and what is the return policy?',
            answer:
              'Express courier delivery takes 1-2 business days in Romania and 3-5 business days internationally, backed by a 30-day return or size exchange (for unused items in original packaging).',
          },
        ];
  }

  if (kind === 'apparel') {
    return isRo
      ? [
          {
            question: 'Cum vine croiala oversized și ce mărime să aleg?',
            answer:
              'Tricourile au croială Oversized din amestec premium de 80% bumbac și 20% poliester (240 GSM). Alege mărimea ta obișnuită pentru fit-ul larg de sală sau consultă tabelul de dimensiuni pentru piept și talie din Ghidul de Mărimi (S – 6XL).',
          },
          {
            question: 'Cum se spală ca să nu crape printul sau să intre la apă?',
            answer:
              'Spală pe dos la 30°C cu detergent blând și evită uscătorul automat sau călcatul direct peste print.',
          },
          {
            question: 'Pot schimba mărimea dacă nu îmi vine perfect?',
            answer:
              'Da, ai 30 de zile drept de retur sau schimb rapid de mărime (produsele trebuie să fie nepurtate, cu etichetele și ambalajul original intacte).',
          },
        ]
      : [
          {
            question: 'How does the oversized fit run?',
            answer:
              'Our tees are crafted from a 240 GSM 80% cotton, 20% polyester blend with a relaxed drop-shoulder Pump Cover cut. Pick your normal size or check Chest & Waist measurements in the Size Guide (S – 6XL).',
          },
          {
            question: 'How should I wash it to keep the print sharp?',
            answer:
              'Wash inside-out at 30°C and air-dry instead of tumble drying. Do not iron directly over the graphic print.',
          },
          {
            question: 'Can I exchange sizes if needed?',
            answer: 'Yes — you have 30 days for quick size exchanges or returns (items must be unworn with original tags and packaging intact).',
          },
        ];
  }

  if (kind === 'wrist-wraps') {
    return isRo
      ? [
          {
            question: 'La ce exerciții mă ajută benzile de încheietură X10?',
            answer:
              'Sunt ideale la bench press, împins cu gantere, shoulder press și orice serie grea în care vrei să menții încheietura aliniată și fără dureri.',
          },
          {
            question: 'Cât de lungi și rigide sunt?',
            answer:
              'Au lungime de 60 cm, lățime de 8 cm și rigiditate extremă (5/5) cu velcro militar și buclă ranforsată pentru degetul mare.',
          },
          {
            question: 'Cât durează livrarea și care este politica de retur?',
            answer:
              '1-2 zile lucrătoare prin curier în România, 3-5 zile internațional și 30 de zile drept de retur (pentru produse nefolosite, în ambalajul original).',
          },
        ]
      : [
          {
            question: 'Which lifts benefit most from X10 Wrist Wraps?',
            answer:
              'Heavy bench pressing, overhead presses, dumbbell work, and any push session where stacked wrist alignment eliminates joint strain.',
          },
          {
            question: 'What are the dimensions and stiffness rating?',
            answer:
              '60 cm length, 8 cm width, extreme competition stiffness (5/5) with reinforced thumb loops and military-grade velcro.',
          },
          {
            question: 'What are shipping times and returns?',
            answer:
              '1-2 business days in Romania, 3-5 days internationally, plus a 30-day return window (for unused items in original packaging).',
          },
        ];
  }

  if (kind === 'elbow-wraps') {
    return isRo
      ? [
          {
            question: 'Cum aleg între modelul X5 și X10?',
            answer:
              'Alegerea depinde de stilul tău de antrenament: dacă vrei confort, mobilitate și protecție articulară pe serii de volum și culturism, alege X5 (suport 3.5/5 ferm și flexibil). Dacă vrei rigiditate extremă, blocare de fier pe coate și asistență mecanică de până la +20 kg la ieșirea din piept pe seriile grele și PR-uri, alege X10 (suport 5/5 de competiție).',
          },
          {
            question: 'Cât timp durează livrarea?',
            answer:
              'Comenzile sunt expediate prin curier rapid direct la adresă în 1-2 zile lucrătoare în România și 3-5 zile lucrătoare internațional. Livrare gratuită disponibilă peste pragul afișat.',
          },
          {
            question: 'Sunt potrivite și pentru începători?',
            answer:
              'Modelul X5 este excelent pentru orice lifter care dorește să-și protejeze articulația cotului și tendoanele de uzură. Modelul X10 este recomandat sportivilor avansați care au deja stabilitate formată pe greutăți mari.',
          },
          {
            question: 'Cum se întrețin benzile de cot?',
            answer:
              'Se recomandă aerisirea lor după fiecare antrenament intens și spălarea manuală la temperaturi reduse (apă călduță), fără uscare automată, pentru a păstra elasticitatea intactă.',
          },
          {
            question: 'Care este politica de retur?',
            answer:
              'Beneficiezi de 30 de zile drept de retur. Dacă mărimea sau nivelul de rigiditate nu ți se potrivește, poți schimba sau returna produsul nefolosit și în ambalajul original (transportul de retur este suportat de client, cu excepția defectelor; rambursarea se procesează în max. 14 zile de la primire).',
          },
        ]
      : [
          {
            question: 'How do I choose between X5 and X10?',
            answer:
              'Choose based on your training style: if you want versatile joint support, full mobility, and tendon protection for hypertrophy and volume, choose X5 (3.5/5 firmness). If you want extreme competition-grade stiffness and maximum lockout rebound on heavy sets, choose X10 (5/5 stiffness).',
          },
          {
            question: 'How long does delivery take?',
            answer:
              'Orders are shipped via express tracked courier to your doorstep in 1-2 business days in Romania and 3-5 business days across Europe, the UK, and the US. Free shipping is available above the threshold.',
          },
          {
            question: 'Are these suitable for beginners?',
            answer:
              'The X5 model is great for lifters wanting reliable elbow protection and joint longevity. The X10 model is engineered for advanced lifters moving heavy poundages.',
          },
          {
            question: 'How do I care for my elbow wraps?',
            answer:
              'Air-dry after intense sessions and hand wash with lukewarm water when needed. Do not machine tumble dry to ensure elastic tension remains at peak performance.',
          },
          {
            question: 'What is the return policy?',
            answer:
              'We offer a 30-day return window. If you wish to exchange models or return unused wraps in their original packaging, our support team handles it quickly (return shipping is paid by the customer unless defective; refunds are processed within 14 days of receipt).',
          },
        ];
  }

  return isRo
    ? [
        {
          question: 'Cât timp durează livrarea?',
          answer:
            'Expediem rapid prin curier în 1-2 zile lucrătoare în România și 3-5 zile lucrătoare internațional.',
        },
        {
          question: 'Care este politica de retur?',
          answer: 'Ai 30 de zile drept de retur sau schimb pentru produsele nefolosite, în ambalajul original.',
        },
      ]
    : [
        {
          question: 'How long does shipping take?',
          answer:
            'Express tracked courier delivery takes 1-2 business days in Romania and 3-5 business days internationally.',
        },
        {
          question: 'What is the return policy?',
          answer: 'Every physical order includes a 30-day return window for unused items in their original packaging.',
        },
      ];
}

export function getResolvedProductFaqs(
  product: Partial<Product> | null | undefined,
  locale: string
): Array<{ question: string; answer: string }> {
  const custom: any[] | undefined = (product as any)?.specs_summary?.faqs;
  const lang = locale === 'en' ? 'en' : 'ro';
  if (Array.isArray(custom) && custom.length > 0) {
    const valid = custom
      .map((f) => ({
        question:
          typeof f?.question === 'object'
            ? String(f.question[lang] || f.question.ro || f.question.en || '').trim()
            : String(f?.question || '').trim(),
        answer:
          typeof f?.answer === 'object'
            ? String(f.answer[lang] || f.answer.ro || f.answer.en || '').trim()
            : String(f?.answer || '').trim(),
      }))
      .filter((f) => f.question && f.answer);
    if (valid.length > 0) return valid;
  }
  return getDefaultProductFaqs(product, locale);
}

/**
 * Resolves which influencer video clips should appear on a product page.
 * Supports per-product overrides via specs_summary (`video_mode` + `video_ids`)
 * and global digital program video configuration from store_settings.
 */
export function filterInfluencersForProduct(
  allInfluencers: InfluencerVideo[],
  product: Partial<Product> | null | undefined,
  digitalConfig?: DigitalProgramsVideoConfig | null
): {
  videos: InfluencerVideo[];
  titleRo?: string;
  titleEn?: string;
  subtitleRo?: string;
  subtitleEn?: string;
} {
  const active = (allInfluencers || []).filter((v) => v && v.is_active !== false && v.video_url);
  const specs = (product as any)?.specs_summary || {};
  const videoMode: string = specs.video_mode || 'default';

  const matchesClipId = (inf: InfluencerVideo, selectedIds: string[]) => {
    const idStr = String(inf.id);
    if (selectedIds.includes(idStr)) return true;
    const stripped = idStr.replace(/^trenwraps-/i, '');
    if (selectedIds.includes(stripped)) return true;
    if (inf.display_order !== undefined && selectedIds.includes(String(inf.display_order))) {
      return true;
    }
    return false;
  };

  if (videoMode === 'none') {
    return { videos: [] };
  }

  if (videoMode === 'all') {
    return { videos: active };
  }

  if (videoMode === 'custom') {
    const ids = Array.isArray(specs.video_ids) ? specs.video_ids.map(String) : [];
    return {
      videos: ids.length > 0 ? active.filter((inf) => matchesClipId(inf, ids)) : [],
      titleRo: isDigitalProgramItem(product)
        ? digitalConfig?.title_ro || DEFAULT_DIGITAL_PROGRAM_VIDEO_CONFIG.title_ro
        : undefined,
      titleEn: isDigitalProgramItem(product)
        ? digitalConfig?.title_en || DEFAULT_DIGITAL_PROGRAM_VIDEO_CONFIG.title_en
        : undefined,
      subtitleRo: isDigitalProgramItem(product)
        ? digitalConfig?.subtitle_ro || DEFAULT_DIGITAL_PROGRAM_VIDEO_CONFIG.subtitle_ro
        : undefined,
      subtitleEn: isDigitalProgramItem(product)
        ? digitalConfig?.subtitle_en || DEFAULT_DIGITAL_PROGRAM_VIDEO_CONFIG.subtitle_en
        : undefined,
    };
  }

  if (isDigitalProgramItem(product)) {
    const cfg = digitalConfig || DEFAULT_DIGITAL_PROGRAM_VIDEO_CONFIG;
    if (!cfg.show_on_programs) {
      return { videos: [] };
    }
    const ids = Array.isArray(cfg.influencer_ids) ? cfg.influencer_ids.map(String) : [];
    const filtered = ids.length > 0 ? active.filter((inf) => matchesClipId(inf, ids)) : [];
    return {
      videos: filtered,
      titleRo: cfg.title_ro || DEFAULT_DIGITAL_PROGRAM_VIDEO_CONFIG.title_ro,
      titleEn: cfg.title_en || DEFAULT_DIGITAL_PROGRAM_VIDEO_CONFIG.title_en,
      subtitleRo: cfg.subtitle_ro || DEFAULT_DIGITAL_PROGRAM_VIDEO_CONFIG.subtitle_ro,
      subtitleEn: cfg.subtitle_en || DEFAULT_DIGITAL_PROGRAM_VIDEO_CONFIG.subtitle_en,
    };
  }

  return { videos: active };
}
