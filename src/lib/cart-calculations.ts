import { getShippingCost } from "@/lib/shipping-config";
import { getProductPrice } from "@/utils/pricing";

export interface CartItem {
  id: string;
  quantity: number;
  weight?: number;
  price: any; // Supabase price (number or JSONB)
}

export interface CalculationResult {
  currency: string;
  subtotal: number;       // All values in subunits (cents/bani)
  bundleDiscount: number;
  couponDiscount: number;
  cardDiscount: number;
  shippingCost: number;
  total: number;
  totalWeight: number;
  itemCount: number;
  optionsCost?: number;
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
  coupon?: { type: 'percentage' | 'fixed_amount' | 'free_shipping'; value: number; max_discount?: number | null; is_stackable?: boolean } | null,
  serviceId?: string,
  options?: { priority_processing?: boolean; gift_packaging?: boolean; payment_method?: string }
): CalculationResult {
  const targetCurrency = typeof currency === 'string' ? currency.toUpperCase() : 'RON';
  
  const ZERO_DECIMAL_CURRENCIES = ['JPY', 'KRW', 'BIF', 'CLP', 'PYG', 'VND', 'XAF', 'XOF', 'XPF'];
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.includes(targetCurrency);
  const multiplier = isZeroDecimal ? 1 : 100;

  let subtotalSubunits = 0;
  let totalWeight = 0;
  let totalItemsCount = 0;

  // 1. Calculate Base Subtotal
  items.forEach(item => {
    const localizedPrice = getProductPrice(item.price, targetCurrency);
    const qty = Math.max(0, Math.floor(item.quantity));
    
    // Convert to subunits immediately to keep math safe
    const priceSubunits = Math.round(localizedPrice * multiplier);
    
    subtotalSubunits += priceSubunits * qty;

    const bundleMatch = String(item.id || '').match(/^(.+)-bundle-(\d+)$/);
    const bundleQty = bundleMatch ? parseInt(bundleMatch[2], 10) : 1;
    let itemWeight = Number(item.weight) || 0;
    if (itemWeight <= 0) {
      itemWeight = 0.2 * bundleQty;
    } else if (bundleQty > 1 && itemWeight <= 0.25) {
      itemWeight = itemWeight * bundleQty;
    }

    totalWeight += itemWeight * qty;
    totalItemsCount += qty;
  });

  // 2. 10% Bundle Discount for 2+ DIFFERENT products (e.g. X5 + X10)
  const uniqueProductIds = new Set(
    items.map(item => String(item.id || '').replace(/^(.+)-bundle-\d+$/, '$1'))
  );
  const hasBundleDiscount = uniqueProductIds.size >= 2;
  const bundleDiscountSubunits = hasBundleDiscount ? Math.round(subtotalSubunits * 0.10) : 0;

  // 3. Handle Coupon Discount (applied to effectiveSubtotal after bundle discount, matching useCartStore)
  const effectiveSubtotalSubunits = Math.max(0, subtotalSubunits - bundleDiscountSubunits);
  let couponDiscountSubunits = 0;
  if (coupon) {
    if (coupon.type === 'percentage') {
      couponDiscountSubunits = Math.round(effectiveSubtotalSubunits * (coupon.value / 100));
      if (coupon.max_discount && coupon.max_discount > 0) {
        const localizedMax = getProductPrice(coupon.max_discount, targetCurrency);
        const maxSubunits = Math.round(localizedMax * multiplier);
        if (couponDiscountSubunits > maxSubunits) {
          couponDiscountSubunits = maxSubunits;
        }
      }
    } else if (coupon.type === 'fixed_amount') {
      const localizedValue = getProductPrice(coupon.value, targetCurrency);
      couponDiscountSubunits = Math.round(localizedValue * multiplier);
    }
    couponDiscountSubunits = Math.min(effectiveSubtotalSubunits, couponDiscountSubunits);
  }

  // 5. Calculate Shipping (EXCLUDED from discount)
  let shippingSubunits = 0;
  if (country && shippingType) {
    const shippingPrice = getShippingCost(country, shippingType, totalWeight, targetCurrency, serviceId);
    shippingSubunits = Math.round(shippingPrice * multiplier);
    
    // Free Shipping Thresholds (300 RON RO, 100 EUR INTL)
    const isRo = country.toUpperCase() === 'RO';
    const effectiveSubtotalMajor = (
      subtotalSubunits - bundleDiscountSubunits - couponDiscountSubunits
    ) / multiplier;
    
    let isFreeShipping = false;
    if (isRo) {
      const roThreshold = getProductPrice(300, targetCurrency);
      if (effectiveSubtotalMajor >= roThreshold) isFreeShipping = true;
    } else {
      const intlThreshold = targetCurrency === 'EUR' ? 100 : getProductPrice(530, targetCurrency);
      if (effectiveSubtotalMajor >= intlThreshold) isFreeShipping = true;
    }

    if (coupon?.type === 'free_shipping' || isFreeShipping) {
      shippingSubunits = 0;
    }
  }

  // 5.1 Calculate Options
  let optionsSubunits = 0;
  if (options?.priority_processing) {
    optionsSubunits += Math.round(getProductPrice(6.90, targetCurrency) * multiplier);
  }
  if (options?.gift_packaging) {
    optionsSubunits += Math.round(getProductPrice(14.90, targetCurrency) * multiplier);
  }

  // 5.2 Card discount (5 RON base converted dynamically to target currency)
  let cardDiscountSubunits = 0;
  if (options?.payment_method === 'online') {
    const cardDiscountMajor = getProductPrice(5, targetCurrency);
    cardDiscountSubunits = Math.round(cardDiscountMajor * multiplier);
  }

  // 6. Final Total
  const discountTotal = bundleDiscountSubunits + couponDiscountSubunits;
  const minAmount = isZeroDecimal ? 100 : 200; // Safe minimum for Stripe
  const totalSubunits = Math.max(minAmount, subtotalSubunits - discountTotal - cardDiscountSubunits + shippingSubunits + optionsSubunits);

  return {
    currency: targetCurrency,
    subtotal: subtotalSubunits,
    bundleDiscount: bundleDiscountSubunits,
    couponDiscount: couponDiscountSubunits,
    cardDiscount: cardDiscountSubunits,
    shippingCost: shippingSubunits,
    optionsCost: optionsSubunits,
    total: totalSubunits,
    totalWeight,
    itemCount: totalItemsCount
  };
}
