"use client";

import { useCartStore } from "@/store/useCartStore";
import { useRegionStore } from "@/store/useRegionStore";
import { useCheckoutStore } from "@/store/useCheckoutStore";
import { formatPrice } from "@/utils/currency";
import { useTranslations, useLocale } from "next-intl";
import Image from "next/image";
import { ShieldCheck, ChevronDown, ShoppingBag, Ticket, CreditCard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { getLocalized, cn } from "@/lib/utils";
import { isWideProductImage } from "@/lib/product-images";
import { getShippingCost, isEuCustomsCountry } from "@/lib/shipping-config";
import { getEffectiveItemWeight, getFreeShippingThreshold } from "@/lib/cart-calculations";
import { useShippingConfig } from "@/lib/use-shipping-config";
import { getProductPrice } from "@/utils/pricing";
import { isDigitalOnlyCart } from "@/lib/programs";
import { Link } from "@/i18n/routing";

import { CouponInput } from "@/components/cart/CouponInput";

interface OrderSummaryProps {
  paymentMethod: 'online' | 'cod';
  currentStep?: number;
}

export function OrderSummary({ paymentMethod, currentStep: propStep }: OrderSummaryProps) {
  const { items, getTotals, appliedCoupon } = useCartStore();
  const { priorityProcessing, giftPackaging, country: storedCountry, shippingType: storedShippingType, selectedServiceId: storedServiceId } = useCheckoutStore();
  const { currency } = useRegionStore();
  const shippingConfig = useShippingConfig();
  const locale = useLocale();
  const t = useTranslations("Checkout");

  // Logic: for COD (Ramburs), we ALWAYS show RON price (the original DB price)
  // for Card payments, we show the user's selected currency (with the 15% margin)
  const displayCurrency = paymentMethod === 'cod' ? 'RON' : currency;

  // Calculate total weight for shipping estimation (including multi-box bundle quantities)
  const totalWeight = items.reduce((acc, item) => acc + getEffectiveItemWeight(item), 0);

  const [shippingParams, setShippingParams] = useState<{country: string, type: 'hd' | 'pudo', serviceId?: string} | null>({
    country: storedCountry || 'RO',
    type: storedShippingType === 'pudo' ? 'hd' : (storedShippingType || 'hd'),
    serviceId: storedShippingType === 'pudo' ? undefined : (storedServiceId || undefined),
  });
  const [shippingCost, setShippingCost] = useState(0);
  const [currentStep, setCurrentStep] = useState(propStep || 1);

  useEffect(() => {
    if (propStep) setCurrentStep(propStep);
  }, [propStep]);

  useEffect(() => {
    const handler = (e: any) => {
      const { country, shippingType, serviceId, step } = e.detail;
      if (step) setCurrentStep(step);
      if (country && shippingType) {
        setShippingParams({ country, type: shippingType, serviceId });
        setShippingCost(getShippingCost(country, shippingType, totalWeight, displayCurrency, serviceId));
      }
    };

    window.addEventListener('checkout-shipping-change', handler);
    return () => window.removeEventListener('checkout-shipping-change', handler);
  }, [displayCurrency, totalWeight]);

  // Reactive Recalculation: Ensure shipping cost is always in the current display currency
  useEffect(() => {
    if (shippingParams) {
      setShippingCost(getShippingCost(shippingParams.country, shippingParams.type, totalWeight, displayCurrency, shippingParams.serviceId));
    }
  }, [displayCurrency, shippingParams, totalWeight]);

  const digitalOnly = isDigitalOnlyCart(items);
  const isShippingPending = !digitalOnly && currentStep === 1;
  const rawShippingCost = digitalOnly || isShippingPending ? 0 : shippingCost;
  
  // 🚀 RE-CALCULATE EVERYTHING WITH NEW SHIPPING CONTEXT
  // We call getTotals with the shipping cost so percentage coupons affect the shipping too
  const totals = getTotals(displayCurrency, rawShippingCost);
  const { subtotal, discount, comboDiscount, tieredDiscount, bundlePercent, itemCount, couponDiscount, shippingDiscount } = totals;
  
  // Threshold logic (must match cart-calculations.ts)
  const resolvedCountry = shippingParams?.country || (displayCurrency === 'RON' ? 'RO' : 'INTL');
  const freeShippingThreshold = getFreeShippingThreshold(resolvedCountry, displayCurrency, shippingConfig);

  const thresholdBase = Number((subtotal - discount - couponDiscount).toFixed(2));
  const thresholdReached = thresholdBase >= freeShippingThreshold;
  
  const isFreeShipping = digitalOnly || shippingDiscount || thresholdReached;
  
  const finalShippingCost = isFreeShipping ? 0 : rawShippingCost;
  
  // Extra options costs (Fixed in RON, converted dynamically via getProductPrice)
  const priorityCost = getProductPrice(6.90, displayCurrency);
  const giftCost = getProductPrice(14.90, displayCurrency);
  const extraCosts = digitalOnly ? 0 : ((priorityProcessing ? priorityCost : 0) + (giftPackaging ? giftCost : 0));

  // Online Payment Discount (5 RON base converted dynamically to display currency)
  const cardDiscount = paymentMethod === 'online' ? getProductPrice(5, displayCurrency) : 0;

  // If it's a percentage coupon, the store already applied it to the shipping inside 'total'
  const rawDisplayTotal = Math.max(0, totals.subtotal - totals.discount - totals.couponDiscount + finalShippingCost + extraCosts - cardDiscount);
  const minStripeMajor = ['HUF', 'JPY'].includes(String(displayCurrency).toUpperCase()) ? 100 : 2;
  const finalDisplayTotal = items.length > 0 && paymentMethod !== 'cod'
    ? Math.max(minStripeMajor, rawDisplayTotal)
    : rawDisplayTotal;
  const totalQuantityBadge = items.reduce((acc, i) => acc + Math.max(1, i.quantity || 1), 0);

  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setIsExpanded(true);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="bg-white text-zinc-900 border border-zinc-200/80 rounded-[2.5rem] overflow-hidden shadow-sm transition-all duration-500">
      {/* Mobile Toggle & Header */}
      <button
        type="button"
        onClick={() => isMobile && setIsExpanded(!isExpanded)}
        className={`w-full px-5 py-4 md:px-8 md:py-6 flex items-center justify-between text-zinc-900 transition-all ${isMobile ? 'hover:bg-zinc-50/50 active:scale-[0.99] cursor-pointer' : 'cursor-default'}`}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <ShoppingBag className="w-5 h-5 text-zinc-950" />
            <span className="absolute -top-2 -right-2 w-4 h-4 bg-[#e32f8c] text-white text-[8px] font-black rounded-full flex items-center justify-center">
              {totalQuantityBadge}
            </span>
          </div>
          <span className="text-sm font-black uppercase tracking-tight text-zinc-950 flex items-center gap-2">
            {t('order_summary')}
            {isMobile && (
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.3 }}
                className="text-zinc-700"
              >
                <ChevronDown className="w-4 h-4" />
              </motion.div>
            )}
          </span>
        </div>
        <span className="text-xl font-black text-zinc-950">
          {formatPrice(finalDisplayTotal, displayCurrency)}
        </span>
      </button>

      {/* Mobile Coupon Input (visible outside accordion if no coupon applied) */}
      {!appliedCoupon && (
        <div className="px-5 pb-2 block lg:hidden">
          <CouponInput />
        </div>
      )}

      <div
        className="grid transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          gridTemplateRows: isExpanded ? '1fr' : '0fr',
          opacity: isExpanded ? 1 : 0
        }}
      >
        <div className="overflow-hidden">
          <div className="px-8 pb-8 pt-2">
              {/* Product List */}
              <div className="space-y-6 mb-8 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide border-t border-zinc-50 pt-6">
                {items.map((item) => {
                  const thumbSrc = (item.selectedVariant && item.selectedVariant.image) || (item.selectedVariant && item.selectedVariant.imageIndex !== undefined && item.images && item.images[item.selectedVariant.imageIndex]) || item.image;
                  const isWideThumb = isWideProductImage(thumbSrc);
                  return (
                  <Link 
                    key={`${item.id}-${item.selectedVariant ? (typeof (item.selectedVariant.name as any) === 'object' ? (item.selectedVariant.name as any).ro : item.selectedVariant.name) : 'default'}`}
                    href={`/product/${item.slug}`}
                    className="flex gap-4 group hover:opacity-70 transition-opacity"
                  >
                    <div className={cn(
                      "relative w-16 h-16 rounded-2xl overflow-hidden border border-zinc-100 shrink-0 transition-transform duration-500 group-hover:scale-105",
                      isWideThumb ? "bg-black" : "bg-zinc-50"
                    )}>
                      <Image
                        src={thumbSrc}
                        alt={getLocalized(item.name, locale)}
                        fill
                        sizes="64px"
                        className={isWideThumb ? "object-contain p-1" : "object-cover"}
                      />
                      <div className="absolute top-0 right-0 bg-black text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-bl-xl">
                        {item.quantity}
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col justify-center min-w-0">
                      <h4 className="text-sm font-semibold text-black truncate leading-tight">
                        {getLocalized(item.name, locale)}
                      </h4>
                      {item.selectedVariant && (
                        <p className="text-[11px] font-medium text-zinc-500 mt-0.5">
                          {getLocalized(item.selectedVariant.name, locale)}
                        </p>
                      )}
                      {item.quantity > 1 && (
                        <p className="text-[11px] font-medium text-zinc-500 mt-1">
                          {item.quantity} x {formatPrice(getProductPrice(item.price, displayCurrency), displayCurrency)}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex flex-col justify-center">
                      <span className="text-sm font-semibold text-black">
                        {formatPrice(getProductPrice(item.price, displayCurrency) * item.quantity, displayCurrency)}
                      </span>
                    </div>
                  </Link>
                  );
                })}
              </div>

              {/* Discount Code */}
              <div className={cn(!appliedCoupon && "hidden lg:block")}>
                <CouponInput />
              </div>

              {/* Totals */}
              <div className="space-y-3 pt-6 border-t border-zinc-100">
                {/* 1. Subtotal */}
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600">{t('subtotal')}</span>
                  <span className="font-semibold text-black">{formatPrice(subtotal, displayCurrency)}</span>
                </div>

                {/* 2. Tiered Bundle Discount */}
                {discount > 0 && (
                  <div className="flex justify-between items-center text-sm bg-pink-500/10 p-2.5 rounded-xl border border-pink-500/20">
                    <span className="font-bold uppercase tracking-widest text-[10px] text-[#e32f8c] flex items-center gap-1.5">
                      {comboDiscount > 0 && tieredDiscount === 0
                        ? locale === 'ro'
                          ? 'Reducere Pachet 3 Programe'
                          : '3-Programs Bundle Discount'
                        : bundlePercent > 0
                          ? locale === 'ro'
                            ? `Reducere Pachet ${itemCount} Produse (-${bundlePercent}%)`
                            : `${itemCount} Items Bundle Discount (-${bundlePercent}%)`
                          : locale === 'ro'
                            ? 'Reducere Pachet Programe'
                            : 'Programs Combo Discount'}
                    </span>
                    <span className="font-black text-[#e32f8c]">-{formatPrice(discount, displayCurrency)}</span>
                  </div>
                )}

                {/* 3. Coupon Discount */}
                {couponDiscount > 0 && (
                  <div className="flex justify-between items-center text-sm bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200/80">
                    <span className="font-bold uppercase tracking-widest text-[10px] text-emerald-800 flex items-center gap-1.5">
                      <Ticket className="w-3.5 h-3.5 shrink-0" />
                      {appliedCoupon?.code}
                      {appliedCoupon?.type === 'percentage' ? ` (-${appliedCoupon.value}%)` : ''}
                    </span>
                    <span className="font-black text-emerald-700">-{formatPrice(couponDiscount, displayCurrency)}</span>
                  </div>
                )}

                {/* 4. Shipping */}
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600">{t('shipping_cost')}</span>
                  {isShippingPending ? (
                    <span className="h-4 w-24 rounded-md bg-zinc-100 animate-pulse inline-block" aria-label={locale === 'en' ? 'Calculating...' : 'Calculare...'} />
                  ) : (isFreeShipping || shippingCost === 0) ? (
                    <div className="flex flex-col items-end">
                      {isFreeShipping && !digitalOnly && rawShippingCost > 0 && (
                        <span className="text-[10px] text-zinc-500 line-through">
                          {formatPrice(rawShippingCost, displayCurrency)}
                        </span>
                      )}
                      <span className="font-semibold text-emerald-700">{t('free')}</span>
                    </div>
                  ) : (
                    <span className="font-semibold text-zinc-950">{formatPrice(shippingCost, displayCurrency)}</span>
                  )}
                </div>

                {/* 5. Procesare Prioritară */}
                {!digitalOnly && priorityProcessing && (
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600">{locale === 'en' ? 'Priority Processing' : 'Procesare Prioritară'}</span>
                    <span className="font-semibold text-zinc-950">+{formatPrice(priorityCost, displayCurrency)}</span>
                  </div>
                )}

                {/* 6. Împachetare Cadou */}
                {!digitalOnly && giftPackaging && (
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600">{locale === 'en' ? 'Gift Packaging' : 'Împachetare Cadou'}</span>
                    <span className="font-semibold text-zinc-950">+{formatPrice(giftCost, displayCurrency)}</span>
                  </div>
                )}

                {/* 7. Card Discount — același stil ca și cuponul, fără fundal negru */}
                {cardDiscount > 0 && (
                  <div className="flex justify-between items-center text-sm bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200/80">
                    <span className="font-bold uppercase tracking-widest text-[10px] text-emerald-800 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 shrink-0" />
                      <span>{locale === 'en' ? 'Card Discount' : 'Reducere Card'}</span>
                    </span>
                    <span className="font-black text-emerald-700">-{formatPrice(cardDiscount, displayCurrency)}</span>
                  </div>
                )}

                {/* 8. Total */}
                <div className="pt-6 mt-4 border-t border-zinc-200/70 flex justify-between items-center">
                  <span className="text-base font-semibold text-zinc-950">Total</span>
                  <div className="text-right flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-zinc-950 leading-none">{formatPrice(finalDisplayTotal, displayCurrency)}</span>
                  </div>
                </div>

                {/* RON Notice when browsing in foreign currency & COD selected */}
                {paymentMethod === 'cod' && currency !== 'RON' && (
                  <div className="mt-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] font-semibold text-amber-900 leading-relaxed">
                    {locale === 'ro'
                      ? 'Plata ramburs la livrare se efectuează exclusiv în RON.'
                      : 'Cash on delivery orders in Romania are billed strictly in RON.'}
                  </div>
                )}

                {/* Non-EU Customs & Import Tax Disclosure */}
                {!digitalOnly && !isEuCustomsCountry(shippingParams?.country || storedCountry) && (
                  <div className="mt-3 p-3 rounded-xl bg-amber-50/90 border border-amber-200/80 text-[11px] text-amber-900 leading-relaxed font-medium">
                    {locale === 'ro'
                      ? 'Notă vamală (Non-UE): Eventualele taxe vamale, TVA/GST local de import sau comisioane de vămuire din țara de destinație sunt suportate de destinatar la livrare.'
                      : 'Non-EU Customs Notice: Orders outside the EU may be subject to local import VAT/GST, customs duties, or courier clearance fees upon delivery, payable by the recipient.'}
                  </div>
                )}

                {/* Secure Payment — Stripe */}
                <div className="pt-6 flex flex-col items-center gap-1.5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                    {locale === 'ro' ? 'Plată securizată prin Stripe' : 'Secured payment by Stripe'}
                  </span>
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-[9px] text-zinc-500 font-bold">SSL / TLS Encrypted</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}

