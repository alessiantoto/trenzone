"use client";

import { useCartStore, isPreorder } from "@/store/useCartStore";
import { useTranslations } from "next-intl";
import { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import CheckoutForm from "@/components/checkout/CheckoutForm";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { StepIndicator } from "@/components/checkout/StepIndicator";
import { Link } from "@/i18n/routing";
import { ShoppingBag, ArrowLeft, ShieldCheck, Lock } from "lucide-react";
import { useParams } from "next/navigation";
import { useLocale } from "next-intl";
import { useRegionStore } from "@/store/useRegionStore";
import { useCheckoutStore } from "@/store/useCheckoutStore";
import { getProductPrice } from "@/utils/pricing";
import { isDigitalProgramItem, isDigitalOnlyCart } from "@/lib/programs";

// Initialize Stripe with the public key from env
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

const appearance = { 
  theme: 'stripe' as const,
  variables: { 
    colorPrimary: '#e32f8c',
    colorBackground: '#ffffff',
    colorText: '#000000',
    colorDanger: '#ef4444',
    fontFamily: 'Inter, sans-serif',
    spacingUnit: '4px',
    borderRadius: '16px',
    fontSizeBase: '16px',
  },
  rules: {
    '.Input': {
      backgroundColor: '#f8fafc',
      border: '1px solid #f1f5f9',
      boxShadow: 'none',
      transition: 'all 0.2s ease',
    },
    '.Input:focus': {
      backgroundColor: '#ffffff',
      border: '1px solid #e32f8c',
      boxShadow: '0 0 0 4px rgba(227, 47, 140, 0.1)',
    },
    '.Label': {
      fontSize: '10px',
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      color: '#a1a1aa',
      marginBottom: '8px',
      marginLeft: '4px',
    }
  }
};

export default function CheckoutPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ro';
  const { items, getTotals, appliedCoupon, clearCart } = useCartStore();
  const { currency } = useRegionStore();
  const { country: storedCountry, shippingType: storedShippingType, priorityProcessing, giftPackaging } = useCheckoutStore();
  const latestCountryRef = useRef(storedCountry);
  const latestShippingTypeRef = useRef(storedShippingType);
  const latestPriorityRef = useRef(priorityProcessing);
  const latestGiftRef = useRef(giftPackaging);
  latestCountryRef.current = storedCountry;
  latestShippingTypeRef.current = storedShippingType;
  latestPriorityRef.current = priorityProcessing;
  latestGiftRef.current = giftPackaging;
  const [currentStep, setCurrentStep] = useState(1);
  const [isStep1Valid, setIsStep1Valid] = useState(false);
  const [isStep2Valid, setIsStep2Valid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('online');
  const [clientSecret, setClientSecret] = useState("");
  const [isStripeDisabled, setIsStripeDisabled] = useState(false);
  const [initError, setInitError] = useState("");
  const [csrfToken, setCsrfToken] = useState("");
  const initializedCurrencyRef = useRef<string | null>(null);
  const { total } = getTotals(currency);
  const t = useTranslations("Checkout");

  // 1. Fetch CSRF Token ONCE on mount
  useEffect(() => {
    let mounted = true;
    const fetchCsrf = async () => {
      try {
        const res = await fetch("/api/csrf-token");
        if (!res.ok) throw new Error("Failed to get security token");
        const data = await res.json();
        if (mounted && data.csrfToken) {
          setCsrfToken(data.csrfToken);
        } else if (mounted) {
          setInitError(locale === 'en' ? 'Failed to initialize secure checkout session. Please reload.' : 'Inițializarea sesiunii securizate a eșuat. Reîncarcă pagina.');
        }
      } catch (err) {
        console.error("CSRF initialization error:", err);
        if (mounted) {
          setInitError(locale === 'en' ? 'Failed to initialize secure checkout session. Please reload.' : 'Inițializarea sesiunii securizate a eșuat. Reîncarcă pagina.');
        }
      }
    };
    fetchCsrf();
    return () => { mounted = false; };
  }, []);

  // 2. Initialize checkout once per currency (subsequent item/coupon/option changes update the existing PI via /api/checkout/update without remounting Elements)
  useEffect(() => {
    if (items.length === 0 || !csrfToken) return;

    const hasPreorder = items.some(item => !isDigitalProgramItem(item) && isPreorder(item, item.selectedVariant));
    const hasInStock = items.some(item => !isDigitalProgramItem(item) && !isPreorder(item, item.selectedVariant));
    if (hasPreorder && hasInStock) {
      // Mixed order — blocked until customer chooses which order to finalize
      setInitError("");
      return;
    }

    if (clientSecret && initializedCurrencyRef.current === currency) {
      return;
    }

    if (clientSecret && initializedCurrencyRef.current && initializedCurrencyRef.current !== currency) {
      setClientSecret("");
    }

    const controller = new AbortController();

    const initCheckout = async () => {
      try {
        setInitError("");
        // Create PaymentIntent with existing CSRF token
        const checkoutRes = await fetch("/api/checkout", {
          method: "POST",
          signal: controller.signal,
          headers: { 
            "Content-Type": "application/json",
            "x-csrf-token": csrfToken,
          },
          body: JSON.stringify({ 
            currency: currency, 
            items: items,
            couponCode: appliedCoupon?.code?.trim()?.toUpperCase() || null,
            country: latestCountryRef.current || 'RO',
            shippingType: latestShippingTypeRef.current === 'pudo' ? 'hd' : (latestShippingTypeRef.current || 'hd'),
            priority_processing: latestPriorityRef.current,
            gift_packaging: latestGiftRef.current,
            payment_method: 'online',
            locale: locale === 'en' ? 'en' : 'ro'
          }),
        });

        if (!checkoutRes.ok) {
          const data = await checkoutRes.json().catch(() => ({}));
          throw new Error(data.error || 'API Error');
        }

        const data = await checkoutRes.json();
        if (controller.signal.aborted) return;
        
        if (data.stripeDisabled) {
          setIsStripeDisabled(true);
          setPaymentMethod('cod');
          setClientSecret('disabled');
          initializedCurrencyRef.current = currency;
        } else if (data.clientSecret) {
          setClientSecret(data.clientSecret);
          initializedCurrencyRef.current = currency;
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.error("Checkout init error:", err);
        setInitError(err.message);
      }
    };

    initCheckout();
    return () => controller.abort();
  }, [items, total, currency, csrfToken, appliedCoupon?.code, locale, clientSecret]);

  const options: any = useMemo(() => {
    const baseOptions = {
      appearance: {
        ...appearance,
        variables: {
          ...appearance.variables,
          spacingUnit: '5px',
          fontWeightMedium: '700',
          fontWeightBold: '900',
        },
        rules: {
          ...appearance.rules,
          '.AccordionItem': {
            border: '2px solid #f1f5f9',
            padding: '24px 20px',
            marginBottom: '12px',
            borderRadius: '24px',
            transition: 'all 0.2s ease',
          },
          '.AccordionItem--selected': {
            border: '2px solid #e32f8c',
            boxShadow: '0 8px 16px rgba(227, 47, 140, 0.12)',
            backgroundColor: '#ffffff',
          },
          '.AccordionItem:hover': {
            borderColor: '#e32f8c',
          },
          '.Label': {
             fontSize: '12px',
             fontWeight: '900',
             textTransform: 'uppercase',
             letterSpacing: '0.1em',
             color: '#000000',
          }
        }
      },
      locale: locale as any,
      business: { name: 'TrenZone' },
    };

    const paymentLayout = {
      type: 'accordion' as const,
      defaultCollapsed: false,
      radios: true,
      spacedAccent: true,
    };

    const paymentMethodOrder = ['apple_pay', 'google_pay', 'blik', 'card', 'revolut_pay', 'bancontact', 'ideal'];

    // total from getTotals(currency) is already in the selected currency
    const localizedTotal = total;

    if (clientSecret) {
      return {
        ...baseOptions,
        clientSecret,
        layout: paymentLayout,
        paymentMethodOrder,
      };
    }

    const ZERO_DECIMAL_CURRENCIES = ['HUF', 'JPY', 'KRW', 'BIF', 'CLP', 'PYG', 'VND', 'XAF', 'XOF', 'XPF'];
    const multiplier = ZERO_DECIMAL_CURRENCIES.includes(currency.toUpperCase()) ? 1 : 100;

    return {
      ...baseOptions,
      mode: 'payment' as const,
      amount: Math.max(1, Math.round(localizedTotal * multiplier)),
      currency: currency.toLowerCase(),
      layout: paymentLayout,
      paymentMethodOrder,
    };
  }, [clientSecret, total, currency, locale]);

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#fafafc] flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center text-zinc-300 mb-8 shadow-sm border border-zinc-50"
        >
          <ShoppingBag className="w-10 h-10" />
        </motion.div>
        <h2 className="text-3xl font-black uppercase tracking-tighter text-black mb-3 italic">{t('empty_cart')}</h2>
        <p className="text-zinc-400 font-black uppercase tracking-widest text-[10px] mb-10 max-w-xs leading-loose">
          {t('empty_cart_desc')}
        </p>
        <Link href="/shop" className="group flex items-center gap-4 bg-black text-white px-12 py-6 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-[#e32f8c] hover:text-black transition-all shadow-xl shadow-black/10">
          <span>{t('back_to_shop')}</span>
          <ArrowLeft className="w-5 h-5 rotate-180 group-hover:translate-x-2 transition-transform" />
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafc] pt-8 md:pt-24 pb-12" style={{ '--primary': '#e32f8c' } as React.CSSProperties}>
      <div className="container mx-auto px-4 md:px-6">
        <header className="mb-6 md:mb-12 max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
           <Link href="/" className="inline-flex items-center gap-3 text-zinc-400 hover:text-black transition-colors group">
              <div className="w-8 h-8 rounded-xl bg-white border border-zinc-100 flex items-center justify-center group-hover:border-[#e32f8c] transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest leading-none">{t('back_to_site')}</span>
           </Link>
           <h1 className="text-3xl md:text-6xl font-black uppercase tracking-tighter text-black leading-none italic">
             {t('title').split(' ')[0]} <span className="text-[#e32f8c] italic">{t('title').split(' ').slice(1).join(' ')}</span>
           </h1>
           <div className="hidden lg:flex items-center gap-4 text-zinc-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#e32f8c]" />
                <span className="text-[8px] font-black uppercase tracking-[0.2em]">{t('secure_badge')}</span>
              </div>
              <div className="w-[1px] h-4 bg-zinc-200" />
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#e32f8c]" />
                <span className="text-[8px] font-black uppercase tracking-[0.2em]">{t('ssl_badge')}</span>
              </div>
           </div>
        </header>

        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-12 items-start">
            {/* Steps & Form */}
            <div className="flex-1 w-full order-2 lg:order-1">
              <StepIndicator 
                currentStep={currentStep} 
                setCurrentStep={setCurrentStep}
                isStep1Valid={isStep1Valid}
                isStep2Valid={isStep2Valid}
                digitalOnlyCart={isDigitalOnlyCart(items)}
              />
              
              <div className="mt-4 lg:mt-8">
                {initError ? (
                  <div className="h-[400px] flex flex-col items-center justify-center bg-white rounded-[2.5rem] border border-red-100 shadow-sm p-8 text-center">
                     <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4">
                       <span className="text-red-500 font-bold">!</span>
                     </div>
                     <h3 className="text-sm font-black uppercase tracking-tight text-black mb-2">{t('init_error')}</h3>
                     <p className="text-zinc-500 font-bold text-[10px] max-w-[260px] leading-relaxed mb-6">{initError}</p>
                     <div className="flex items-center gap-4">
                       <button onClick={() => window.location.reload()} className="text-[10px] font-black uppercase tracking-widest text-[#e32f8c] hover:underline active:scale-[0.98] transition-all cursor-pointer">{t('retry')}</button>
                       <button
                         onClick={() => { clearCart(); setInitError(""); }}
                         className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-black hover:underline active:scale-[0.98] transition-all cursor-pointer"
                       >
                         {locale === 'en' ? 'Clear Cart' : 'Golește Coșul'}
                       </button>
                     </div>
                  </div>
                ) : currentStep === 4 && !clientSecret ? (
                  <div
                    role="status"
                    aria-live="polite"
                    className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm p-6 md:p-8 space-y-6"
                  >
                    {/* Step / Payment Header Skeleton */}
                    <div className="flex items-center justify-between gap-4 pb-4 border-b border-zinc-100">
                      <div className="space-y-2">
                        <div className="h-5 w-44 rounded-xl bg-zinc-200 animate-pulse" />
                        <p className="text-zinc-400 font-black uppercase tracking-widest text-[10px]">
                          {t('initializing_payment')}
                        </p>
                      </div>
                      <div className="h-7 w-24 rounded-full bg-[#e32f8c]/15 animate-pulse" />
                    </div>

                    {/* 2-Column Payment Method & Form Card Skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <div className="h-20 rounded-2xl bg-zinc-100 border border-zinc-200/60 animate-pulse" />
                        <div className="h-20 rounded-2xl bg-zinc-50 border border-zinc-100 animate-pulse" />
                      </div>
                      <div className="rounded-2xl bg-zinc-50 border border-zinc-100 p-4 space-y-3">
                        <div className="h-4 w-28 rounded bg-zinc-200 animate-pulse" />
                        <div className="h-11 w-full rounded-xl bg-white border border-zinc-100 animate-pulse" />
                        <div className="grid grid-cols-2 gap-3">
                          <div className="h-11 rounded-xl bg-white border border-zinc-100 animate-pulse" />
                          <div className="h-11 rounded-xl bg-white border border-zinc-100 animate-pulse" />
                        </div>
                      </div>
                    </div>

                    {/* Summary Strip & Submit CTA Skeleton */}
                    <div className="pt-2 border-t border-zinc-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="h-3 w-24 rounded bg-zinc-100 animate-pulse" />
                        <div className="h-6 w-32 rounded-lg bg-zinc-200 animate-pulse" />
                      </div>
                      <div className="h-14 w-full sm:w-64 rounded-2xl bg-[#e32f8c]/30 animate-pulse" />
                    </div>
                  </div>
                ) : (
                  options && stripePromise && !isStripeDisabled ? (
                    <Elements stripe={stripePromise} options={options} key={clientSecret || 'init'}>
                      <CheckoutForm 
                        currentStep={currentStep} 
                        setCurrentStep={setCurrentStep} 
                        setIsStep1Valid={setIsStep1Valid}
                        setIsStep2Valid={setIsStep2Valid}
                        clientSecret={clientSecret}
                        paymentMethod={paymentMethod}
                        setPaymentMethod={setPaymentMethod}
                        csrfToken={csrfToken}
                        stripePromise={stripePromise}
                        stripeOptions={options}
                        isStripeDisabled={isStripeDisabled}
                      />
                    </Elements>
                  ) : (
                    <CheckoutForm 
                      currentStep={currentStep} 
                      setCurrentStep={setCurrentStep} 
                      setIsStep1Valid={setIsStep1Valid}
                      setIsStep2Valid={setIsStep2Valid}
                      clientSecret={clientSecret}
                      paymentMethod={paymentMethod}
                      setPaymentMethod={setPaymentMethod}
                      csrfToken={csrfToken}
                      stripePromise={stripePromise}
                      stripeOptions={options}
                      isStripeDisabled={isStripeDisabled}
                    />
                  )
                )}
              </div>
            </div>

            {/* Summary */}
            <div className="w-full lg:w-[420px] lg:sticky lg:top-24 order-1 lg:order-2">
               <OrderSummary paymentMethod={paymentMethod} currentStep={currentStep} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
