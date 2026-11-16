import { getShippingCost } from "@/lib/shipping-config";
import { FALLBACK_RATES, getProductPrice } from "@/utils/pricing";
import {
  isDigitalProgramItem,
  isDigitalOnlyCart,
  PROGRAM_UUIDS,
  PROGRAM_SLUGS,
  PROGRAM_PRICES_RON,
} from "@/lib/programs";

export interface CartItem {
  id: string;
  slug?: string;
  name?: any;
  quantity: number;
  weight?: number;
  price: any; // Supabase price (number or JSONB)
  is_digital?: boolean;
  specs_summary?: any;
}

export interface BundleSummary {
  itemCount: number;
  bundlePercent: 0 | 5 | 10;
  hasBundle: boolean;
  nextTierMin: number | null;
  nextTierPercent: 5 | 10 | null;
  itemsToNextTier: number;
  progressPercent: number;
}

export const BUNDLE_TIER_1_MIN = 2; // 2 items -> 5%
export const BUNDLE_TIER_2_MIN = 3; // 3+ items -> 10%
export const FREE_SHIPPING_RO_RON = 500;
export const FREE_SHIPPING_INTL_EUR = 150;
export const FREE_SHIPPING_INTL_RON = 795; // 150 EUR × 5.30 RON fallback parity

export interface FreeShippingThresholds {
  free_shipping_ro_ron?: number;
  free_shipping_intl_eur?: number;
}

export function getFreeShippingThreshold(
  country: string | undefined,
  currency: string,
  thresholds?: FreeShippingThresholds
): number {
  const upperCurrency = String(currency || 'RON').toUpperCase();
  const isRo = (country || 'RO').toUpperCase() === 'RO';

  const roThresholdRon =
    typeof thresholds?.free_shipping_ro_ron === 'number' &&
    Number.isFinite(thresholds.free_shipping_ro_ron) &&
    thresholds.free_shipping_ro_ron >= 0
      ? thresholds.free_shipping_ro_ron
      : FREE_SHIPPING_RO_RON;

  if (isRo) {
    return getProductPrice(roThresholdRon, upperCurrency);
  }

  const intlThresholdEur =
    typeof thresholds?.free_shipping_intl_eur === 'number' &&
    Number.isFinite(thresholds.free_shipping_intl_eur) &&
    thresholds.free_shipping_intl_eur >= 0
      ? thresholds.free_shipping_intl_eur
      : FREE_SHIPPING_INTL_EUR;

  if (upperCurrency === 'EUR') {
    return intlThresholdEur;
  }

  const intlThresholdRon = Number((intlThresholdEur * FALLBACK_RATES.EUR).toFixed(2));
  return getProductPrice(intlThresholdRon, upperCurrency);
}

/**
 * Calculates the tiered bundle discount state across ALL cart items (physical gear + digital programs).
 * - 2 total items -> 5% off
 * - 3+ total items -> 10% off
 */
export function getBundleSummary(items: Array<{ id?: string; slug?: string; name?: any; quantity?: number }>): BundleSummary {
  const itemCount = (items || []).reduce((sum, item) => {
    const qty = Math.max(0, Math.floor(Number(item?.quantity) || 0));
    const bundleMatch = String(item?.id || '').match(/^(.+)-bundle-(\d+)$/);
    const bundleMultiplier = bundleMatch ? parseInt(bundleMatch[2], 10) : 1;
    return sum + qty * bundleMultiplier;
  }, 0);

  const bundlePercent: 0 | 5 | 10 =
    itemCount >= BUNDLE_TIER_2_MIN ? 10 : itemCount >= BUNDLE_TIER_1_MIN ? 5 : 0;

  const nextTierMin =
    bundlePercent === 0 ? BUNDLE_TIER_1_MIN : bundlePercent === 5 ? BUNDLE_TIER_2_MIN : null;
  const nextTierPercent =
    bundlePercent === 0 ? 5 : bundlePercent === 5 ? 10 : null;
  const itemsToNextTier = nextTierMin !== null ? Math.max(0, nextTierMin - itemCount) : 0;

  // Map cleanly onto 2 visual milestones: 0 = 0%, 1 = 25%, 2 (-5%) = 50%, 3+ (-10%) = 100%
  const progressPercent =
    itemCount <= 0 ? 0 : itemCount === 1 ? 25 : itemCount === 2 ? 50 : 100;

  return {
    itemCount,
    bundlePercent,
    hasBundle: bundlePercent > 0,
    nextTierMin,
    nextTierPercent,
    itemsToNextTier,
    progressPercent,
  };
}

export interface CalculationResult {
  currency: string;
  subtotal: number;       // All values in subunits (cents/bani)
  bundleDiscount: number;
  bundlePercent: 0 | 5 | 10;
  couponDiscount: number;
  cardDiscount: number;
  shippingCost: number;
  total: number;
  totalWeight: number;
  itemCount: number;
  optionsCost?: number;
  couponApplied?: boolean;
  couponBlockedByBundle?: boolean;
}

export function getEffectiveItemWeight(item: { id?: string; slug?: string; name?: any; quantity?: number; weight?: number }): number {
  if (isDigitalProgramItem(item)) return 0;
  const qty = Math.max(0, Math.floor(Number(item?.quantity) || 0));
  const bundleMatch = String(item?.id || '').match(/^(.+)-bundle-(\d+)$/);
  const bundleQty = bundleMatch ? Math.max(1, parseInt(bundleMatch[2], 10)) : 1;
  const unitWeight = Number(item?.weight) > 0 ? Number(item.weight) : 0.2;
  return unitWeight * bundleQty * qty;
}

export function computeCartDiscountBreakdown(
  items: Array<Pick<CartItem, 'id' | 'slug' | 'name' | 'quantity' | 'price' | 'is_digital' | 'specs_summary'>>,
  targetCurrency: string,
  multiplier: number
): {
  subtotalSubunits: number;
  bundleDiscountSubunits: number;
  comboDiscountSubunits: number;
  tieredDiscountSubunits: number;
  bundlePercent: 0 | 5 | 10;
  itemCount: number;
  hasBundle: boolean;
} {
  let subtotalSubunits = 0;
  let foodPlanQty = 0;
  let trainingProgramQty = 0;
  let benchProgramQty = 0;
  let foodUnitSubunits = 0;
  let trainingUnitSubunits = 0;
  let benchUnitSubunits = 0;

  (items || []).forEach((item) => {
    const localizedPrice = getProductPrice(item.price, targetCurrency);
    const qty = Math.max(0, Math.floor(Number(item?.quantity) || 0));
    const priceSubunits = Math.round(localizedPrice * multiplier);
    subtotalSubunits += priceSubunits * qty;

    if (isDigitalProgramItem(item)) {
      const cleanId = String(item.id || '').replace(/-bundle-\d+$/, '').toLowerCase();
      const cleanSlug = String(item.slug || '').toLowerCase();
      if (cleanId === PROGRAM_UUIDS.FOOD_PLAN || cleanSlug === PROGRAM_SLUGS.FOOD_PLAN) {
        foodPlanQty += qty;
        foodUnitSubunits = priceSubunits;
      } else if (cleanId === PROGRAM_UUIDS.TRAINING_PROGRAM || cleanSlug === PROGRAM_SLUGS.TRAINING_PROGRAM) {
        trainingProgramQty += qty;
        trainingUnitSubunits = priceSubunits;
      } else if (cleanId === PROGRAM_UUIDS.BENCH_PROGRAM || cleanSlug === PROGRAM_SLUGS.BENCH_PROGRAM) {
        benchProgramQty += qty;
        benchUnitSubunits = priceSubunits;
      }
    }
  });

  const { itemCount, bundlePercent, hasBundle } = getBundleSummary(items);

  // Automatic 3-program combo discount (Food Plan + Training Program + Bench Program = -91 RON)
  const comboTriplets = Math.min(foodPlanQty, trainingProgramQty, benchProgramQty);
  const comboCoveredSubunits =
    comboTriplets * (foodUnitSubunits + trainingUnitSubunits + benchUnitSubunits);
  const comboDiscountSubunits =
    comboTriplets > 0
      ? comboTriplets * Math.round(getProductPrice(PROGRAM_PRICES_RON.COMBO_DISCOUNT_RON, targetCurrency) * multiplier)
      : 0;

  // Tiered 5% (2+ items) / 10% (3+ items) discount applies to all remaining items (physical + digital)
  const tieredEligibleSubunits = Math.max(0, subtotalSubunits - comboCoveredSubunits);
  const tieredDiscountSubunits =
    bundlePercent > 0 && tieredEligibleSubunits > 0
      ? Math.round(tieredEligibleSubunits * (bundlePercent / 100))
      : 0;

  return {
    subtotalSubunits,
    bundleDiscountSubunits: comboDiscountSubunits + tieredDiscountSubunits,
    comboDiscountSubunits,
    tieredDiscountSubunits,
    bundlePercent,
    itemCount,
    hasBundle,
  };
}

export interface CouponCalcInput {
  type: 'percentage' | 'fixed_amount' | 'free_shipping';
  value: number;
  max_discount?: number | null;
  min_purchase?: number | null;
  is_stackable?: boolean;
}

export function computeCouponDiscountBreakdown(
  subtotalSubunits: number,
  bundleDiscountSubunits: number,
  coupon: CouponCalcInput | null | undefined,
  targetCurrency: string,
  multiplier: number
): {
  activeCoupon: CouponCalcInput | null;
  couponDiscountSubunits: number;
  shippingDiscount: boolean;
} {
  if (!coupon) {
    return { activeCoupon: null, couponDiscountSubunits: 0, shippingDiscount: false };
  }

  const minPurchase = Number(coupon.min_purchase) || 0;
  const minPurchaseSubunits =
    minPurchase > 0 ? Math.round(getProductPrice(minPurchase, targetCurrency) * multiplier) : 0;
  if (subtotalSubunits < minPurchaseSubunits) {
    return { activeCoupon: null, couponDiscountSubunits: 0, shippingDiscount: false };
  }

  // Non-stackable discount coupons cannot stack on top of tiered/combo bundle discounts
  if (
    coupon.is_stackable === false &&
    bundleDiscountSubunits > 0 &&
    coupon.type !== 'free_shipping'
  ) {
    return { activeCoupon: null, couponDiscountSubunits: 0, shippingDiscount: false };
  }

  const effectiveSubtotalSubunits = Math.max(0, subtotalSubunits - bundleDiscountSubunits);
  const couponVal = Number(coupon.value) || 0;
  let couponDiscountSubunits = 0;
  let shippingDiscount = false;

  if (coupon.type === 'percentage') {
    couponDiscountSubunits = Math.round(effectiveSubtotalSubunits * (couponVal / 100));
    const maxDiscount = Number(coupon.max_discount) || 0;
    if (maxDiscount > 0) {
      const localizedMax = getProductPrice(maxDiscount, targetCurrency);
      const maxSubunits = Math.round(localizedMax * multiplier);
      if (couponDiscountSubunits > maxSubunits) {
        couponDiscountSubunits = maxSubunits;
      }
    }
  } else if (coupon.type === 'fixed_amount') {
    const localizedValue = getProductPrice(couponVal, targetCurrency);
    couponDiscountSubunits = Math.round(localizedValue * multiplier);
  } else if (coupon.type === 'free_shipping') {
    shippingDiscount = true;
  }

  couponDiscountSubunits = Math.min(effectiveSubtotalSubunits, Math.max(0, couponDiscountSubunits));
  return {
    activeCoupon: coupon,
    couponDiscountSubunits,
    shippingDiscount,
  };
}

/**
 * 🧮 ELITE CART CALCULATIONS
 * Centralized logic for calculating order totals with zero-tolerance for floating point errors.
 */
export function calculateOrderTotal(
  items: CartItem[],
  currency: string,
  country?: string,
  shippingType?: 'hd' | 'pudo',
  coupon?: CouponCalcInput | null,
  serviceId?: string,
  options?: {
    priority_processing?: boolean;
    gift_packaging?: boolean;
    payment_method?: string;
    free_shipping_ro_ron?: number;
    free_shipping_intl_eur?: number;
  }
): CalculationResult {
  const targetCurrency = typeof currency === 'string' ? currency.toUpperCase() : 'RON';
  
  const ZERO_DECIMAL_CURRENCIES = ['BIF', 'CLP', 'DJF', 'GNF', 'HUF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'];
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.includes(targetCurrency);
  const multiplier = isZeroDecimal ? 1 : 100;

  let totalWeight = 0;
  let totalItemsCount = 0;
  const digitalOnly = isDigitalOnlyCart(items);

  (items || []).forEach(item => {
    const qty = Math.max(0, Math.floor(Number(item?.quantity) || 0));
    totalWeight += getEffectiveItemWeight(item);
    totalItemsCount += qty;
  });

  // 1-2. Subtotal, 3-program combo discount & tiered 5% / 10% discount across all items
  const {
    subtotalSubunits,
    bundleDiscountSubunits,
    bundlePercent,
  } = computeCartDiscountBreakdown(items, targetCurrency, multiplier);

  // 3. Handle Coupon Discount (shared parity helper with useCartStore)
  const {
    activeCoupon,
    couponDiscountSubunits,
    shippingDiscount,
  } = computeCouponDiscountBreakdown(
    subtotalSubunits,
    bundleDiscountSubunits,
    coupon,
    targetCurrency,
    multiplier
  );

  // 5. Calculate Shipping (EXCLUDED from discount, 0 for digital-only carts)
  let shippingSubunits = 0;
  if (!digitalOnly && country && shippingType) {
    const shippingPrice = getShippingCost(country, shippingType, totalWeight, targetCurrency, serviceId);
    shippingSubunits = Math.round(shippingPrice * multiplier);
    
    // Free Shipping Thresholds (dynamic from Admin shipping_config or default 500 RON RO / 150 EUR INTL)
    const effectiveSubtotalMajor = (
      subtotalSubunits - bundleDiscountSubunits - couponDiscountSubunits
    ) / multiplier;
    const threshold = getFreeShippingThreshold(country, targetCurrency, {
      free_shipping_ro_ron: options?.free_shipping_ro_ron,
      free_shipping_intl_eur: options?.free_shipping_intl_eur,
    });
    const isFreeShipping = effectiveSubtotalMajor >= threshold;

    if (shippingDiscount || activeCoupon?.type === 'free_shipping' || isFreeShipping) {
      shippingSubunits = 0;
    }
  }

  // 5.1 Calculate Options (0 for digital-only carts)
  let optionsSubunits = 0;
  if (!digitalOnly) {
    if (options?.priority_processing) {
      optionsSubunits += Math.round(getProductPrice(6.90, targetCurrency) * multiplier);
    }
    if (options?.gift_packaging) {
      optionsSubunits += Math.round(getProductPrice(14.90, targetCurrency) * multiplier);
    }
  }

  // 5.2 Card discount (5 RON base converted dynamically to target currency)
  let cardDiscountSubunits = 0;
  if (options?.payment_method === 'online') {
    const cardDiscountMajor = getProductPrice(5, targetCurrency);
    cardDiscountSubunits = Math.round(cardDiscountMajor * multiplier);
  }

  // 6. Final Total
  const discountTotal = bundleDiscountSubunits + couponDiscountSubunits;
  const minAmount = options?.payment_method === 'cod' ? 0 : (isZeroDecimal ? 100 : 200); // Safe minimum for Stripe
  const totalSubunits = Math.max(minAmount, subtotalSubunits - discountTotal - cardDiscountSubunits + shippingSubunits + optionsSubunits);
  const couponBlockedByBundle = Boolean(
    coupon &&
    coupon.is_stackable === false &&
    bundleDiscountSubunits > 0 &&
    coupon.type !== 'free_shipping'
  );

  return {
    currency: targetCurrency,
    subtotal: subtotalSubunits,
    bundleDiscount: bundleDiscountSubunits,
    bundlePercent,
    couponDiscount: couponDiscountSubunits,
    couponApplied: Boolean(activeCoupon),
    couponBlockedByBundle,
    cardDiscount: cardDiscountSubunits,
    shippingCost: shippingSubunits,
    optionsCost: optionsSubunits,
    total: totalSubunits,
    totalWeight,
    itemCount: totalItemsCount
  };
}
