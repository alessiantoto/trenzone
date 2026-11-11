"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PaymentElement,
  ExpressCheckoutElement,
  Elements,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCartStore, isPreorder } from "@/store/useCartStore";
import { ChevronRight, Truck, MapPin, ShieldCheck, Check } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, Link } from "@/i18n/routing";
import { getShippingServices, getLocalizedServiceName, getShippingCost, isServiceAvailable, ParcelMetrics, COUNTRY_SERVICES, ALLOWED_SHIPPING_COUNTRIES } from "@/lib/shipping-config";
import { useRegionStore } from "@/store/useRegionStore";
import { useCheckoutStore } from "@/store/useCheckoutStore";
import { formatPrice } from "@/utils/currency";
import { getProductPrice } from "@/utils/pricing";
import Image from "next/image";
import { trackCheckoutSession } from "@/app/actions/checkout-tracking";
import { getSingleFlavorImage } from "@/lib/product-images";
import { SamedayLockerSelector } from "./SamedayLockerSelector";
import { cn } from "@/lib/utils";
import { calculateOrderTotal, CartItem } from "@/lib/cart-calculations";

const COUNTIES_LIST = [
  "Alba", "Arad", "Argeș", "Bacău", "Bihor", "Bistrița-Năsăud", "Botoșani", "Brăila", "Brașov",
  "București", "Buzău", "Călărași", "Caraș-Severin", "Cluj", "Constanța", "Covasna", "Dâmbovița",
  "Dolj", "Galați", "Giurgiu", "Gorj", "Harghita", "Hunedoara", "Ialomița", "Iași", "Ilfov",
  "Maramureș", "Mehedinți", "Mureș", "Neamț", "Olt", "Prahova", "Sălaj", "Satu Mare", "Sibiu",
  "Suceava", "Teleorman", "Timiș", "Tulcea", "Vâlcea", "Vaslui", "Vrancea"
];

const COUNTRY_DATA: Record<string, { name: string; flag: string; prefix: string; placeholder: string }> = {
  RO: { name: "România", flag: "https://flagcdn.com/w40/ro.png", prefix: "+40", placeholder: "07XX XXX XXX" },
  HU: { name: "Ungaria", flag: "https://flagcdn.com/w40/hu.png", prefix: "+36", placeholder: "20 XXX XXXX" },
  BG: { name: "Bulgaria", flag: "https://flagcdn.com/w40/bg.png", prefix: "+359", placeholder: "8X XXX XXXX" },
  CZ: { name: "Cehia", flag: "https://flagcdn.com/w40/cz.png", prefix: "+420", placeholder: "XXX XXX XXX" },
  SK: { name: "Slovacia", flag: "https://flagcdn.com/w40/sk.png", prefix: "+421", placeholder: "9XX XXX XXX" },
  PL: { name: "Polonia", flag: "https://flagcdn.com/w40/pl.png", prefix: "+48", placeholder: "XXX XXX XXX" },
  DE: { name: "Germania", flag: "https://flagcdn.com/w40/de.png", prefix: "+49", placeholder: "1XX XXXXXXX" },
  AT: { name: "Austria", flag: "https://flagcdn.com/w40/at.png", prefix: "+43", placeholder: "6XX XXXXXXX" },
  IT: { name: "Italia", flag: "https://flagcdn.com/w40/it.png", prefix: "+39", placeholder: "3XX XXXXXXX" },
  FR: { name: "Franța", flag: "https://flagcdn.com/w40/fr.png", prefix: "+33", placeholder: "06 12 34 56 78" },
  GR: { name: "Grecia", flag: "https://flagcdn.com/w40/gr.png", prefix: "+30", placeholder: "69X XXX XXXX" },
  BE: { name: "Belgia", flag: "https://flagcdn.com/w40/be.png", prefix: "+32", placeholder: "04XX XX XX XX" },
  NL: { name: "Olanda", flag: "https://flagcdn.com/w40/nl.png", prefix: "+31", placeholder: "06 1234 5678" },
  HR: { name: "Croația", flag: "https://flagcdn.com/w40/hr.png", prefix: "+385", placeholder: "09X XXX XXXX" },
  SI: { name: "Slovenia", flag: "https://flagcdn.com/w40/si.png", prefix: "+386", placeholder: "0XX XXX XXX" },
  ES: { name: "Spania", flag: "https://flagcdn.com/w40/es.png", prefix: "+34", placeholder: "6XX XXX XXX" },
  PT: { name: "Portugalia", flag: "https://flagcdn.com/w40/pt.png", prefix: "+351", placeholder: "9XX XXX XXX" },
  GB: { name: "UK", flag: "https://flagcdn.com/w40/gb.png", prefix: "+44", placeholder: "7XXX XXXXXX" },
  SE: { name: "Suedia", flag: "https://flagcdn.com/w40/se.png", prefix: "+46", placeholder: "7X XXX XX XX" },
  FI: { name: "Finlanda", flag: "https://flagcdn.com/w40/fi.png", prefix: "+358", placeholder: "4X XXX XX XX" },
  EE: { name: "Estonia", flag: "https://flagcdn.com/w40/ee.png", prefix: "+372", placeholder: "5X XXX XXX" },
  LV: { name: "Letonia", flag: "https://flagcdn.com/w40/lv.png", prefix: "+371", placeholder: "2X XXX XXX" },
  LT: { name: "Lituania", flag: "https://flagcdn.com/w40/lt.png", prefix: "+370", placeholder: "6X XXX XXX" },
  LU: { name: "Luxemburg", flag: "https://flagcdn.com/w40/lu.png", prefix: "+352", placeholder: "6XX XXX XXX" },
  CY: { name: "Cipru", flag: "https://flagcdn.com/w40/cy.png", prefix: "+357", placeholder: "9X XXX XXX" }
};

declare global {
  interface Window {
    Packeta: any;
    google: any;
  }
}

const StripePaymentSection = ({ 
  t, locale, router, email, firstName, lastName, phone, phoneCountry, 
  line1, line2, city, state, postalCode, country, handleBack, isUpdatingPaymentInfo,
  clientSecret, forceMetadataUpdate, agreedToTerms, setAgreedToTerms, agreedToMarketing, setAgreedToMarketing,
  animateTerms, triggerTermsError, stripeSyncTrigger
}: any) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch latest amount from Stripe when elements mount or when stripeSyncTrigger changes
  useEffect(() => {
    if (elements) {
      const syncWithServer = async () => {
        try {
          if (typeof elements.fetchUpdates === 'function') {
            await elements.fetchUpdates();
          }
        } catch (err) {
          console.warn("Stripe Sync Warning:", err);
        }
      };
      syncWithServer();
    }
  }, [elements, stripeSyncTrigger]);

  const handleStripeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTerms) {
      triggerTermsError();
      return;
    }
    if (!stripe || !elements) return;

    setLoading(true);
    setMessage(null);

    try {
      // 🚀 THE SAFETY GATE: Force a final metadata sync to ensure Stripe has ALL data before we pay
      // This solves the 'paid but not received' issue by ensuring items/name are attached.
      console.log("🛡️ [PAYMENT] Forcing final metadata sync...");
      await forceMetadataUpdate();

      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/${locale}/checkout/success`,
          receipt_email: email.trim(),
          shipping: {
            name: `${firstName} ${lastName}`,
            phone: (COUNTRY_DATA[phoneCountry]?.prefix || "") + phone.replace(/^0/, ""),
            address: { 
              line1, 
              line2: line2 || "", 
              city, 
              state, 
              postal_code: postalCode, 
              country 
            }
          }
        },
      });

      if (error) {
        console.error("❌ Stripe Payment Error:", error);
        setMessage(error.message || t('payment_error'));
      }
    } catch (err: any) {
      console.error("❌ Payment System Error:", err);
      setMessage(err.message || "System error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-zinc-100 p-6 rounded-3xl border border-zinc-100 font-bold min-h-[100px] flex flex-col justify-center relative overflow-hidden">
        {(isUpdatingPaymentInfo || !stripe || !elements) && (
          <div className="absolute inset-0 bg-zinc-100/80 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-4 p-6">
            <div className="w-4 h-4 border-2 border-[#e32f8c] border-t-transparent rounded-full animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{t('loading_payment_methods')}</p>
          </div>
        )}
        
        {mounted && (
          <div className="mb-4">
            <ExpressCheckoutElement 
              onReady={() => console.log('Express Checkout ready')} 
              onClick={(e: any) => {
                if (!agreedToTerms) {
                  triggerTermsError();
                  return;
                }
                e?.resolve?.();
              }}
              onConfirm={async (event: any) => {
                if (!agreedToTerms) {
                  triggerTermsError();
                  event?.paymentFailed?.({ reason: 'fail' });
                  return;
                }
                await handleStripeSubmit({ preventDefault: () => {} } as any);
              }}
            />
          </div>
        )}
        <PaymentElement onReady={() => setMessage(null)} />
      </div>
      
      {message && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-bold border border-red-100">{message}</div>}
      
      {/* Checkboxes inside StripePaymentSection for better button control */}
      <div id="terms-checkbox-container" className="space-y-3 py-3 px-4 scroll-mt-24">
        <motion.div 
          animate={animateTerms ? { x: [-8, 8, -6, 6, 0] } : { x: 0 }}
          transition={{ duration: 0.35 }}
          className={cn(
            "p-3.5 rounded-2xl transition-all duration-200 border",
            animateTerms 
              ? "border-red-400 bg-red-50/70 shadow-sm" 
              : agreedToTerms 
                ? "border-emerald-200 bg-emerald-50/20" 
                : "border-zinc-200 bg-zinc-50/50 hover:border-zinc-300"
          )}
        >
          <label className="flex items-start gap-3.5 cursor-pointer group select-none">
            <div className="relative flex items-center shrink-0 mt-0.5">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
              />
              <div className={cn(
                "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all duration-200",
                agreedToTerms 
                  ? "bg-[#e32f8c] border-[#e32f8c] shadow-sm shadow-[#e32f8c]/30 scale-100" 
                  : animateTerms
                    ? "bg-white border-red-500 ring-2 ring-red-200"
                    : "bg-white border-zinc-400 hover:border-zinc-500 group-hover:border-[#e32f8c]"
              )}>
                {agreedToTerms && (
                  <Check className="w-3.5 h-3.5 text-black stroke-[3.5] animate-in zoom-in-50 duration-150" />
                )}
              </div>
            </div>
            <span className="text-[11px] md:text-xs font-semibold text-zinc-700 group-hover:text-zinc-900 leading-tight transition-colors">
              <span className="text-red-500 mr-1 font-black">*</span>
              {t.rich('i_agree_to_terms', {
                terms: (chunks: React.ReactNode) => <Link href="/termeni-si-conditii" target="_blank" className="text-[#e32f8c] underline hover:text-black font-bold">{chunks}</Link>,
                privacy: (chunks: React.ReactNode) => <Link href="/politica-de-confidentialitate" target="_blank" className="text-[#e32f8c] underline hover:text-black font-bold">{chunks}</Link>
              })}
              <span className="text-zinc-400 ml-1 text-[10px] font-bold">({t('required_label')})</span>
            </span>
          </label>
        </motion.div>

        <label className="flex items-start gap-3.5 cursor-pointer group px-3 select-none">
          <div className="relative flex items-center shrink-0 mt-0.5">
            <input
              type="checkbox"
              checked={agreedToMarketing}
              onChange={(e) => setAgreedToMarketing(e.target.checked)}
              className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
            />
            <div className={cn(
              "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all duration-200",
              agreedToMarketing 
                ? "bg-[#e32f8c] border-[#e32f8c] shadow-sm shadow-[#e32f8c]/30 scale-100" 
                : "bg-white border-zinc-300 hover:border-zinc-400 group-hover:border-[#e32f8c]"
            )}>
              {agreedToMarketing && (
                <Check className="w-3.5 h-3.5 text-black stroke-[3.5] animate-in zoom-in-50 duration-150" />
              )}
            </div>
          </div>
          <span className="text-[11px] md:text-xs font-semibold text-zinc-500 group-hover:text-zinc-800 leading-tight transition-colors">
            {t('newsletter_opt_in')}
          </span>
        </label>
      </div>

      <AnimatePresence>
        {animateTerms && !agreedToTerms && (
          <motion.div 
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="p-3 rounded-xl text-center text-xs font-bold text-red-600 bg-red-50 border border-red-200 shadow-sm"
          >
            {t('accept_terms_to_proceed')}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-4 pt-2">
        <Button type="button" variant="outline" onClick={handleBack} className="flex-1 h-14 rounded-2xl font-bold uppercase tracking-widest text-[10px]">{t('back')}</Button>
        <Button 
          onClick={handleStripeSubmit} 
          disabled={loading || isUpdatingPaymentInfo || !stripe || !elements} 
          className="relative flex-[1.5] h-14 rounded-2xl font-black uppercase tracking-wider text-xs overflow-hidden transition-all shadow-lg hover:shadow-xl active:scale-[0.98] bg-[#e32f8c] hover:bg-black text-black hover:text-white"
        >
          {loading ? t('processing') : t('pay_now')}
        </Button>
      </div>
    </div>
  );
};

interface CustomSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string; icon?: string }[];
  placeholder?: string;
  error?: boolean;
}

const CustomSelect = ({ value, onChange, options, placeholder, error, label }: CustomSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const sortedOptions = useMemo(() => {
    return [...options].sort((a, b) => a.label.localeCompare(b.label, 'ro', { sensitivity: 'base' }));
  }, [options]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      setIsOpen(false);
      return;
    }

    // Jump-to-letter logic
    if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
      const char = e.key.toLowerCase();
      const nextSearchTerm = searchTerm + char;
      setSearchTerm(nextSearchTerm);

      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => setSearchTerm(""), 1000);

      const matchIndex = sortedOptions.findIndex(opt => 
        opt.label.toLowerCase().startsWith(nextSearchTerm)
      );

      if (matchIndex !== -1 && scrollRef.current) {
        const itemElement = scrollRef.current.querySelector(`[data-index="${matchIndex}"]`) as HTMLElement;
        if (itemElement) {
          itemElement.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
          });
        }
      }
    }
  };

  const selectedOption = sortedOptions.find(opt => opt.value === value);

  return (
    <div className="space-y-2" ref={containerRef} onKeyDown={handleKeyDown}>
      {label && (
        <Label className={`text-[10px] font-black uppercase tracking-widest ml-1 transition-colors ${error ? 'text-red-500' : 'text-zinc-400'}`}>
          {label}
        </Label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full h-14 px-6 bg-zinc-100 border rounded-2xl text-xs font-bold flex items-center justify-between transition-all outline-none ${error ? 'border-red-500 bg-red-50' : 'border-zinc-100 focus:border-[#e32f8c]'}`}
        >
          <div className="flex items-center gap-2 overflow-hidden text-left">
            {selectedOption?.icon && (
              <Image 
                src={selectedOption.icon} 
                alt="" 
                width={20} 
                height={15} 
                className="w-5 h-auto rounded-[1px]" 
                style={{ height: 'auto' }}
                unoptimized 
              />
            )}
            <span className={!selectedOption ? 'text-zinc-400' : 'text-zinc-800'}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="opacity-40"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
          </motion.div>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute z-[100] w-full mt-2 bg-white border border-zinc-100 rounded-2xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto premium-scrollbar"
              ref={scrollRef}
            >
              <div className="p-1">
                {sortedOptions.map((opt, idx) => (
                  <button
                    key={opt.value}
                    data-index={idx}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-5 py-4 text-xs font-bold transition-all rounded-xl hover:bg-zinc-100 text-left ${value === opt.value ? 'bg-[#e32f8c]/5 text-[#e32f8c]' : 'text-zinc-600'}`}
                  >
                    {opt.icon && (
                    <Image 
                      src={opt.icon} 
                      alt="" 
                      width={20} 
                      height={15} 
                      className="w-5 h-auto rounded-[1px] shadow-sm" 
                      style={{ height: 'auto' }}
                      unoptimized 
                    />
                    )}
                    <span className="truncate">{opt.label}</span>
                    {value === opt.value && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#e32f8c] flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const CustomPrefixSelect = ({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: any[] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const sortedOptions = useMemo(() => {
    return [...options].sort((a, b) => a.label.localeCompare(b.label, 'ro', { sensitivity: 'base' }));
  }, [options]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
      const char = e.key.toLowerCase();
      const nextSearchTerm = searchTerm + char;
      setSearchTerm(nextSearchTerm);

      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => setSearchTerm(""), 1000);

      const matchIndex = sortedOptions.findIndex(opt => 
        opt.label.toLowerCase().startsWith(nextSearchTerm)
      );

      if (matchIndex !== -1 && scrollRef.current) {
        const itemElement = scrollRef.current.querySelector(`[data-index="${matchIndex}"]`) as HTMLElement;
        if (itemElement) {
          itemElement.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
          });
        }
      }
    }
  };

  return (
    <div className="h-full relative" ref={containerRef} onKeyDown={handleKeyDown}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-4 h-full cursor-pointer hover:bg-zinc-100 transition-colors rounded-l-2xl outline-none"
      >
        <div className="w-6 shadow-sm rounded-[2px] overflow-hidden border border-black/5">
          {selectedOption?.icon && (
            <Image 
              src={selectedOption.icon} 
              alt="" 
              width={24} 
              height={18} 
              className="w-full h-auto block" 
              style={{ height: 'auto' }}
              unoptimized 
            />
          )}
        </div>
        <span className="text-[13px] font-black text-zinc-800 leading-none">{selectedOption?.label}</span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} className="text-zinc-400">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute left-0 bottom-full mb-2 w-48 bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden z-[110] max-h-64 overflow-y-auto premium-scrollbar"
            ref={scrollRef}
          >
            <div className="p-1">
              {sortedOptions.map((opt, idx) => (
                <button
                  key={opt.value}
                  data-index={idx}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-[11px] font-black transition-all rounded-xl hover:bg-zinc-100 text-left ${value === opt.value ? 'bg-[#e32f8c]/5 text-[#e32f8c]' : 'text-zinc-600'}`}
                >
                  <Image 
                    src={opt.icon} 
                    alt="" 
                    width={20} 
                    height={15} 
                    className="w-5 h-auto rounded-[1px] shadow-sm" 
                    style={{ height: 'auto' }}
                    unoptimized 
                  />
                  <span>{opt.value} ({opt.label})</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Step1ExpressCheckout = ({
  locale,
  clientSecret,
  forceMetadataUpdate,
  items,
  currency,
  csrfToken,
  t
}: any) => {
  const stripe = useStripe();
  const elements = useElements();
  const { appliedCoupon } = useCartStore();
  const [expressReady, setExpressReady] = useState(false);
  const [hasWallets, setHasWallets] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const selectedCountryRef = useRef<string>('RO');

  const handleShippingAddressChange = (event: any) => {
    try {
      const addr = event.address || event.shippingAddress || {};
      const country = (addr.country || 'RO').toUpperCase();
      selectedCountryRef.current = country;

      const calculationItems: CartItem[] = (items || []).map((item: any) => {
        const bundleMatch = String(item.id || '').match(/^(.+)-bundle-(\d+)$/);
        const bundleQty = bundleMatch ? parseInt(bundleMatch[2], 10) : 1;
        let w = Number(item.weight) || 0;
        if (w <= 0) {
          w = 0.2 * bundleQty;
        } else if (bundleQty > 1 && w <= 0.25) {
          w = w * bundleQty;
        }
        return {
          id: item.id,
          quantity: Math.max(1, Number(item.quantity) || 1),
          price: item.price,
          weight: w
        };
      });

      const calc = calculateOrderTotal(
        calculationItems,
        currency || 'RON',
        country,
        'hd',
        appliedCoupon,
        undefined,
        { payment_method: 'online' }
      );

      const lineItems: any[] = [
        { name: locale === 'ro' ? 'Produse' : 'Items', amount: calc.subtotal }
      ];

      if (calc.bundleDiscount > 0) {
        lineItems.push({
          name: locale === 'ro' ? 'Reducere pachet (10%)' : 'Bundle discount (10%)',
          amount: -calc.bundleDiscount
        });
      }

      if (calc.couponDiscount > 0) {
        lineItems.push({
          name: `${locale === 'ro' ? 'Cupon' : 'Coupon'} (${appliedCoupon?.code || ''})`,
          amount: -calc.couponDiscount
        });
      }

      if (calc.cardDiscount > 0) {
        lineItems.push({
          name: locale === 'ro' ? 'Reducere card' : 'Card discount',
          amount: -calc.cardDiscount
        });
      }

      const shippingLabel = calc.shippingCost === 0 
        ? (locale === 'ro' ? 'Livrare gratuită' : 'Free shipping') 
        : (country === 'RO' ? 'Sameday Standard (1-3 Zile)' : (locale === 'ro' ? 'Livrare Standard / Internațională' : 'Standard International Shipping'));

      // Stripe ExpressCheckout requires `shippingRates` with `displayName` (not `shippingOptions` with `label`)
      const shippingRates = [
        {
          id: 'standard-shipping',
          displayName: shippingLabel,
          amount: calc.shippingCost,
          deliveryEstimate: {
            minimum: { unit: 'day' as const, value: 1 },
            maximum: { unit: 'day' as const, value: 3 },
          },
        }
      ];

      event.resolve({
        shippingRates,
        lineItems
      });
    } catch (err) {
      console.error("Step1ExpressCheckout shipping address change error:", err);
      // Must include lineItems in resolve to avoid infinite loading in Stripe Express Checkout
      const fallbackCalc = calculateOrderTotal(
        (items || []).map((item: any) => ({ id: item.id, quantity: Math.max(1, Number(item.quantity) || 1), price: item.price, weight: item.weight || 0.2 })),
        currency || 'RON', selectedCountryRef.current || 'RO', 'hd', appliedCoupon, undefined, { payment_method: 'online' }
      );
      event.resolve({
        shippingRates: [
          {
            id: 'standard-shipping',
            displayName: locale === 'ro' ? 'Livrare Standard' : 'Standard Shipping',
            amount: fallbackCalc.shippingCost || 1499,
            deliveryEstimate: {
              minimum: { unit: 'day' as const, value: 1 },
              maximum: { unit: 'day' as const, value: 3 },
            },
          }
        ],
        lineItems: [{ name: locale === 'ro' ? 'Produse' : 'Items', amount: fallbackCalc.subtotal }]
      });
    }
  };

  const handleShippingRateChange = (event: any) => {
    try {
      const country = selectedCountryRef.current || 'RO';

      const calculationItems: CartItem[] = (items || []).map((item: any) => {
        const bundleMatch = String(item.id || '').match(/^(.+)-bundle-(\d+)$/);
        const bundleQty = bundleMatch ? parseInt(bundleMatch[2], 10) : 1;
        let w = Number(item.weight) || 0;
        if (w <= 0) {
          w = 0.2 * bundleQty;
        } else if (bundleQty > 1 && w <= 0.25) {
          w = w * bundleQty;
        }
        return {
          id: item.id,
          quantity: Math.max(1, Number(item.quantity) || 1),
          price: item.price,
          weight: w
        };
      });

      const calc = calculateOrderTotal(
        calculationItems,
        currency || 'RON',
        country,
        'hd',
        appliedCoupon,
        undefined,
        { payment_method: 'online' }
      );

      const lineItems: any[] = [
        { name: locale === 'ro' ? 'Produse' : 'Items', amount: calc.subtotal }
      ];

      if (calc.bundleDiscount > 0) {
        lineItems.push({
          name: locale === 'ro' ? 'Reducere pachet (10%)' : 'Bundle discount (10%)',
          amount: -calc.bundleDiscount
        });
      }

      if (calc.couponDiscount > 0) {
        lineItems.push({
          name: `${locale === 'ro' ? 'Cupon' : 'Coupon'} (${appliedCoupon?.code || ''})`,
          amount: -calc.couponDiscount
        });
      }

      if (calc.cardDiscount > 0) {
        lineItems.push({
          name: locale === 'ro' ? 'Reducere card' : 'Card discount',
          amount: -calc.cardDiscount
        });
      }

      event.resolve({ lineItems });
    } catch (err) {
      console.error("Step1ExpressCheckout shipping rate change error:", err);
      // Fallback: must resolve with at least lineItems to prevent infinite loading
      const fallbackCalc = calculateOrderTotal(
        (items || []).map((item: any) => ({ id: item.id, quantity: Math.max(1, Number(item.quantity) || 1), price: item.price, weight: item.weight || 0.2 })),
        currency || 'RON', selectedCountryRef.current || 'RO', 'hd', appliedCoupon, undefined, { payment_method: 'online' }
      );
      event.resolve({ lineItems: [{ name: locale === 'ro' ? 'Produse' : 'Items', amount: fallbackCalc.subtotal }] });
    }
  };

  const handleConfirm = async (event: any) => {
    if (!stripe || !elements) return;
    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        event?.paymentFailed?.({ message: submitError.message });
        setErrorMsg(submitError.message || t('payment_error'));
        return;
      }

      // If customer provided info via Apple Pay / Google Pay sheet, sync it to Stripe metadata
      const walletShipping = event?.shippingAddress;
      const walletBilling = event?.billingDetails;
      const walletEmail = walletBilling?.email || event?.payerEmail || '';
      const walletName = walletShipping?.name || walletBilling?.name || '';
      const walletPhone = walletShipping?.phone || walletBilling?.phone || event?.payerPhone || event?.phone || '';
      const walletAddr = walletShipping?.address;

      if (walletEmail || walletName || walletAddr) {
        try {
          const nameParts = walletName.trim().split(/\s+/);
          const fName = nameParts[0] || '';
          const lName = nameParts.slice(1).join(' ') || fName;
          const countryCode = (walletAddr?.country || walletShipping?.country || selectedCountryRef.current || 'RO').toUpperCase();
          const defaultCarrierId = COUNTRY_SERVICES[countryCode]?.hd?.[0]?.id || COUNTRY_SERVICES['DEFAULT']?.hd?.[0]?.id || (countryCode === 'RO' ? '7' : '106');
          
          await fetch("/api/checkout/update", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "x-csrf-token": csrfToken || ""
            },
            body: JSON.stringify({
              paymentIntentId: clientSecret.split('_secret')[0],
              firstName: fName,
              lastName: lName,
              email: walletEmail,
              phone: walletPhone,
              line1: walletAddr?.line1 || '',
              line2: walletAddr?.line2 || '',
              city: walletAddr?.city || '',
              state: walletAddr?.state || '',
              postal_code: walletAddr?.postal_code || '',
              country: countryCode,
              shipping_type: 'hd',
              carrier_id: defaultCarrierId,
              currency: currency || 'RON',
              couponCode: appliedCoupon?.code?.trim()?.toUpperCase() || null,
              locale: locale || 'ro',
              items: (items || []).map((item: any) => ({ 
                id: item.id, 
                quantity: item.quantity, 
                price: item.price, 
                name: item.name, 
                selectedVariant: item.selectedVariant, 
                image: item.image 
              })),
              payment_method: 'online',
              isFinalSync: true
            })
          });
        } catch (syncErr) {
          console.warn("Wallet info sync warning:", syncErr);
        }
      } else if (forceMetadataUpdate) {
        await forceMetadataUpdate();
      }

      const { error } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/${locale}/checkout/success`,
        }
      });
      if (error) {
        event?.paymentFailed?.({ message: error.message });
        setErrorMsg(error.message || t('payment_error'));
      } else {
        window.location.href = `${window.location.origin}/${locale}/checkout/success?payment_intent=${clientSecret.split('_secret')[0]}&payment_intent_client_secret=${encodeURIComponent(clientSecret)}&redirect_status=succeeded`;
      }
    } catch (err: any) {
      event?.paymentFailed?.({ message: err.message });
      setErrorMsg(err.message || "Eroare de sistem.");
    }
  };

  const handleFallbackClick = () => {
    const emailEl = document.querySelector('input[type="email"]') as HTMLInputElement;
    if (emailEl) {
      emailEl.focus();
      emailEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="mb-8 mt-4">
      {stripe && elements && clientSecret ? (
        <div className={cn("min-h-[48px]", expressReady && hasWallets ? "block mb-4" : "hidden")}>
          <ExpressCheckoutElement 
            options={{
              buttonHeight: 48,
              buttonTheme: {
                applePay: 'black',
                googlePay: 'white',
              },
              layout: {
                maxColumns: 2,
                maxRows: 1
              },
              shippingAddressRequired: true,
              emailRequired: true,
              phoneNumberRequired: true,
              allowedShippingCountries: ALLOWED_SHIPPING_COUNTRIES,
            }}
            onReady={({ availablePaymentMethods }: any) => {
              setExpressReady(true);
              if (availablePaymentMethods && (availablePaymentMethods.applePay || availablePaymentMethods.googlePay || availablePaymentMethods.link)) {
                setHasWallets(true);
              }
            }}
            onLoadError={(_err: any) => {
              setExpressReady(true);
              setHasWallets(false);
            }}
            onShippingAddressChange={handleShippingAddressChange}
            onShippingRateChange={handleShippingRateChange}
            onConfirm={handleConfirm}
          />
        </div>
      ) : null}

      {/* Remove fallback buttons to let Stripe Express Checkout handle display entirely */}

      {errorMsg && (
        <p className="text-red-500 text-xs font-bold mb-3">{errorMsg}</p>
      )}

      <div className="flex items-center gap-4 py-2">
        <div className="h-px bg-zinc-100 flex-1" />
        <span className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em]">{t('or_pay_with_card')}</span>
        <div className="h-px bg-zinc-100 flex-1" />
      </div>
    </div>
  );
};

interface CheckoutFormProps {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  setIsStep1Valid: (valid: boolean) => void;
  setIsStep2Valid: (valid: boolean) => void;
  clientSecret: string;
  paymentMethod: 'online' | 'cod';
  setPaymentMethod: (method: 'online' | 'cod') => void;
  csrfToken: string;
  stripePromise: any;
  stripeOptions: any;
  isStripeDisabled?: boolean;
}

export default function CheckoutForm({
  currentStep,
  setCurrentStep,
  setIsStep1Valid,
  setIsStep2Valid,
  clientSecret,
  paymentMethod,
  setPaymentMethod,
  csrfToken,
  stripePromise,
  stripeOptions,
  isStripeDisabled
}: CheckoutFormProps) {
  const t = useTranslations("Checkout");
  const locale = useLocale();
  const router = useRouter();
  // Hooks removed from here - will be used in StripePaymentSection
  const { items, appliedCoupon, getTotals } = useCartStore();
  const { currency } = useRegionStore();

  const {
    email, setEmail, firstName, setFirstName, lastName, setLastName,
    line1, setLine1, line2, setLine2, city, setCity, state, setState,
    postalCode, setPostalCode, phone, setPhone, country, setCountry,
    phoneCountry, setPhoneCountry, shippingType, setShippingType,
    selectedServiceId, setSelectedServiceId, selectedBranches, setSelectedBranch,
    priorityProcessing, setPriorityProcessing, giftPackaging, setGiftPackaging, giftMessage, setGiftMessage
  } = useCheckoutStore();

  const [loading, setLoading] = useState(false);
  const isFirstRender = useRef(true);
  const [isUpdatingPaymentInfo, setIsUpdatingPaymentInfo] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToMarketing, setAgreedToMarketing] = useState(false);
  const [animateTerms, setAnimateTerms] = useState(false);
  const [isSamedayLockerOpen, setIsSamedayLockerOpen] = useState(false);
  // Incremented each time we update Stripe's PaymentIntent amount, to trigger fetchUpdates in StripePaymentSection
  const [stripeSyncTrigger, setStripeSyncTrigger] = useState(0);

  const hasPreorderItems = useMemo(() => items.some(item => isPreorder(item, item.selectedVariant)), [items]);
  const hasNormalItems = useMemo(() => items.some(item => !isPreorder(item, item.selectedVariant)), [items]);
  const isMixedCart = hasPreorderItems && hasNormalItems;

  useEffect(() => {
    if (hasPreorderItems && paymentMethod === 'cod') {
      setPaymentMethod('online');
    }
  }, [hasPreorderItems, paymentMethod, setPaymentMethod]);

  const triggerTermsError = useCallback(() => {
    setAnimateTerms(true);
    setTimeout(() => setAnimateTerms(false), 2500);
    if (typeof document !== "undefined") {
      const el = document.getElementById("terms-checkbox-container") || document.getElementById("terms-checkbox-container-cod");
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, []);

  // Custom Autocomplete State
  const addressInputRef = useRef<HTMLInputElement>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const autocompleteServiceRef = useRef<any>(null);
  const placesServiceRef = useRef<any>(null);

  const [errors, setErrors] = useState<{ email?: boolean; address?: boolean; phone?: boolean; name?: boolean; firstName?: boolean; lastName?: boolean; city?: boolean; state?: boolean }>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent('checkout-shipping-change', { detail: { country, shippingType, serviceId: selectedServiceId, step: currentStep } }));
    }
  }, [country, shippingType, selectedServiceId, currentStep]);

  const pacStyles = `
    .pac-container { z-index: 10000 !important; border-radius: 16px !important; }
  `;

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://widget.packeta.com/v6/www/js/library.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    const isFirstNameValid = firstName.trim().length >= 2;
    const isLastNameValid = lastName.trim().length >= 2;
    const isAddressValid = line1.trim().length >= 3;
    const isCityValid = city.trim().length >= 2;
    const isPhoneValid = phone.trim().replace(/\D/g, '').length >= 8;
    const isStateValid = country !== 'RO' || (!!state && state.trim().length > 0);

    setIsStep1Valid(!!(isEmailValid && isFirstNameValid && isLastNameValid && isAddressValid && isCityValid && isPhoneValid && isStateValid));

    const isStep2Valid = !!selectedServiceId && (shippingType === 'hd' || (shippingType === 'pudo' && !!selectedBranches[selectedServiceId]));
    setIsStep2Valid(isStep2Valid);
  }, [email, firstName, lastName, line1, city, phone, state, country, selectedServiceId, shippingType, selectedBranches, setIsStep1Valid, setIsStep2Valid]);

  useEffect(() => {
    // Skip clearing on initial mount so we don't wipe out persisted state from useCheckoutStore
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setLine1("");
    setLine2("");
    setCity("");
    setState("");
    setPostalCode("");
    setPhoneCountry(country);
  }, [country, setLine1, setLine2, setCity, setState, setPostalCode, setPhoneCountry]);

  useEffect(() => {
    if (country !== 'RO' && paymentMethod === 'cod') {
      setPaymentMethod('online');
    }
    if (country !== 'RO' && shippingType === 'pudo') {
      setShippingType('hd');
      setSelectedServiceId('');
    }
  }, [country, paymentMethod, setPaymentMethod, shippingType, setShippingType, setSelectedServiceId]);

  const handlePredictionSelect = useCallback((prediction: any) => {
    if (!window.google?.maps?.places) return;

    if (!placesServiceRef.current) {
      placesServiceRef.current = new window.google.maps.places.PlacesService(document.createElement('div'));
    }

    placesServiceRef.current.getDetails({
      placeId: prediction.place_id,
      fields: ["address_components", "formatted_address"]
    }, (place: any) => {
      if (!place?.address_components) return;

      let streetNumber = '';
      let route = '';
      let locality = '';
      let postalTown = '';
      let adminArea = '';
      let postCode = '';

      for (const component of place.address_components) {
        const types = component.types;
        if (types.includes('street_number')) streetNumber = component.long_name;
        if (types.includes('route')) route = component.long_name;
        if (types.includes('locality')) locality = component.long_name;
        if (types.includes('postal_town')) postalTown = component.long_name;
        if (types.includes('administrative_area_level_1')) adminArea = component.long_name;
        if (types.includes('postal_code') || types.includes('postal_code_prefix')) postCode = component.long_name;
      }

      // Safe Fallback: Extract from formatted_address for RO only if a clear 6-digit pattern is found
      if (!postCode && country === 'RO') {
        const zipMatch = place.formatted_address.match(/,?\s?(\d{6})\b/);
        if (zipMatch) postCode = zipMatch[1];
      }

      // Use the first part of the formatted address for line1 (more complete than reconstructing route+number)
      const addressParts = place.formatted_address.split(',');
      setLine1(addressParts[0]);

      setCity(postalTown || locality);
      if (adminArea) {
        if (country === 'RO') {
          const matchedCounty = COUNTIES_LIST.find(c =>
            adminArea.toLowerCase().includes(c.toLowerCase()) ||
            c.toLowerCase().includes(adminArea.toLowerCase())
          );
          if (matchedCounty) setState(matchedCounty);
        } else {
          setState(adminArea);
        }
      }
      if (postCode) {
        setPostalCode(country === 'RO' ? postCode.replace(/[^0-9]/g, '').slice(0, 6) : postCode);
      }
      setShowSuggestions(false);
      setPredictions([]); // Clear predictions to ensure dropdown closes
    });
  }, [country]);

  const fetchPredictions = useCallback((input: string) => {
    if (!input || input.length < 3 || !window.google?.maps?.places) {
      setPredictions([]);
      return;
    }

    if (!autocompleteServiceRef.current) {
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
    }

    autocompleteServiceRef.current.getPlacePredictions({
      input,
      componentRestrictions: { country: country.toLowerCase() },
      types: ['address']
    }, (results: any) => {
      setPredictions(results || []);
      setShowSuggestions(!!results && results.length > 0);
    });
  }, [country]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (addressInputRef.current && !addressInputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || currentStep !== 1) return;

    // Check if script is already in the document
    const SCRIPT_ID = 'google-maps-script';
    if (document.getElementById(SCRIPT_ID)) return;

    if (!window.google?.maps?.places) {
      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      document.head.appendChild(script);
    }
  }, [currentStep]);

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const openPacketaWidget = (forcedId?: string) => {
    if (!window.Packeta) {
      setMessage(t('loading_shipping'));
      return;
    }
    const countryToUse = country.toLowerCase();
    const carrierIdToUse = forcedId || selectedServiceId;
    const languageToUse = 
      countryToUse === 'ro' ? 'ro' : 
      countryToUse === 'de' ? 'de' :
      countryToUse === 'hu' ? 'hu' :
      countryToUse === 'cz' ? 'cs' :
      countryToUse === 'sk' ? 'sk' : 'en';

    const options = {
      apiKey: process.env.NEXT_PUBLIC_PACKETA_API_KEY,
      language: languageToUse,
      country: countryToUse,
      ...(shippingType === 'pudo' && carrierIdToUse && carrierIdToUse !== 'packeta'
        ? { vendors: [{ carrierId: String(carrierIdToUse) }] }
        : countryToUse === 'ro' ? { vendors: [{ carrierId: "7455" }] } : {})
    };

    window.Packeta.Widget.pick(options.apiKey, (point: any) => {
      if (point) {
        console.log("Selected PUDO point:", point);
        
        // Safety guard: if the widget returned an external carrier ID, use it
        const actualCarrierId = point.carrierId ? String(point.carrierId) : carrierIdToUse;
        
        if (actualCarrierId && actualCarrierId !== selectedServiceId) {
          setSelectedServiceId(actualCarrierId);
        }

        setSelectedBranch(actualCarrierId!, { 
          id: point.carrierPickupPoint ? String(point.carrierPickupPoint) : String(point.id), 
          name: point.name 
        });
        setMessage(null);
      }
    }, options);
  };

  // 🔄 SYNC STRIPE PAYMENT METHOD: Update Stripe's PaymentIntent amount when the user
  // selects a payment method (online vs cod) so Apple Pay / Google Pay show the correct total
  const syncStripePaymentMethod = async (method: 'online' | 'cod') => {
    if (!clientSecret) return;
    const paymentIntentId = clientSecret.split('_secret_')[0];
    if (!paymentIntentId) return;
    try {
      setIsUpdatingPaymentInfo(true);
      const res = await fetch("/api/checkout/update", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken || "",
        },
        body: JSON.stringify({
          paymentIntentId,
          shipping_type: shippingType,
          carrier_id: selectedServiceId,
          branch_id: selectedBranches[selectedServiceId]?.id || "",
          branch_name: selectedBranches[selectedServiceId]?.name || "",
          payment_method: method,
          firstName, lastName, email,
          phone: (COUNTRY_DATA[phoneCountry]?.prefix || "") + phone.replace(/^0/, ""),
          line1, line2, city, state, postal_code: postalCode, country,
          currency,
          couponCode: appliedCoupon?.code?.trim()?.toUpperCase(),
          priority_processing: priorityProcessing,
          gift_packaging: giftPackaging,
          gift_message: giftMessage,
          items: items.map(i => ({ id: i.id, name: i.name, quantity: i.quantity, price: i.price, image: i.image })),
          isFinalSync: false
        }),
      });
      if (res.ok) {
        // Trigger StripePaymentSection to call elements.fetchUpdates()
        setStripeSyncTrigger(prev => prev + 1);
      }
    } catch (err) {
      console.warn("syncStripePaymentMethod error:", err);
    } finally {
      setIsUpdatingPaymentInfo(false);
    }
  };

  // 🚀 FINAL SYNC: Force a metadata update before actual payment confirmation
  // We define it in the main component to have access to all state
  const forceMetadataUpdate = async () => {
    try {
      if (!clientSecret) return;
      
      const paymentIntentId = clientSecret.split('_secret_')[0];
      
      console.log("⚡ [CHECKOUT] Performing FINAL metadata sync before payment...");
      
      const response = await fetch("/api/checkout/update", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken || ""
        },
        body: JSON.stringify({
          paymentIntentId,
          items: items.map(item => ({ id: item.id, quantity: item.quantity, price: item.price, name: item.name, selectedVariant: item.selectedVariant, image: item.image })),
          couponCode: appliedCoupon?.code?.trim()?.toUpperCase(),
          shipping_type: shippingType,
          carrier_id: selectedServiceId,
          branch_id: selectedBranches[selectedServiceId]?.id || "",
          branch_name: selectedBranches[selectedServiceId]?.name || "",
          payment_method: "online",
          email, firstName, lastName,
          phone: (COUNTRY_DATA[phoneCountry]?.prefix || "") + phone.replace(/^0/, ""),
          line1, line2, city, state, postal_code: postalCode, country,
          currency,
          priority_processing: priorityProcessing,
          gift_packaging: giftPackaging,
          gift_message: giftMessage,
          isFinalSync: true // 🛡️ Bypass rate limits for this critical call
        }),
      });

      if (!response.ok) {
        const txt = await response.text();
        console.error("❌ Final Sync Failed:", txt);
        throw new Error(txt || "Sincronizarea datelor a eșuat. Verifică conexiunea.");
      } else {
        console.log("✅ Final Sync Successful.");
      }
    } catch (err) {
      console.error("❌ Final Sync Error:", err);
      throw err; // 🛡️ CRITICAL: Throw to stop the payment process!
    }
  };

  const trackCurrentSession = useCallback(async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || items.length === 0) return;
    try {
      const paymentIntentId = clientSecret ? clientSecret.split('_secret_')[0] : null;
      const cartItemsPayload = items.map(item => {
        const isBundle = String(item.id).includes('-bundle-') || (item.name && String(item.name).toLowerCase().includes('pachet'));
        const effectiveImage = isBundle 
          ? '/images/products/x10_elbow_wraps_purple_1.webp' 
          : (item.selectedVariant?.image || (typeof item.image === 'string' && !item.image.includes('bundle') ? item.image : getSingleFlavorImage(item.selectedVariant?.name || item.name)));
        return {
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          image: effectiveImage,
          selectedVariant: item.selectedVariant || null
        };
      });

      const totalAmount = items.reduce((acc, item) => {
        const itemPrice = typeof item.price === 'number' 
          ? item.price 
          : (Number((item.price as any)?.[currency]) || Number((item.price as any)?.['RON']) || Number(item.price) || 0);
        return acc + itemPrice * item.quantity;
      }, 0);

      await trackCheckoutSession({
        paymentIntentId,
        email: email.trim(),
        firstName: firstName?.trim() || "",
        lastName: lastName?.trim() || "",
        phone: phone ? ((COUNTRY_DATA[phoneCountry]?.prefix || "") + phone.replace(/^0/, "")) : "",
        line1: line1?.trim() || "",
        line2: line2 || "",
        city: city?.trim() || "",
        state: state || "",
        postalCode: postalCode?.trim() || "",
        country: country || "RO",
        shippingType: shippingType || null,
        carrierId: selectedServiceId || undefined,
        branchId: selectedBranches[selectedServiceId]?.id || undefined,
        branchName: selectedBranches[selectedServiceId]?.name || undefined,
        items: cartItemsPayload,
        totalAmount,
        currency: currency || "RON"
      });
    } catch (err) {
      console.warn("⚠️ [GDPR Abandoned Cart] background track failed:", err);
    }
  }, [email, firstName, lastName, phone, phoneCountry, line1, line2, city, state, postalCode, country, shippingType, selectedServiceId, selectedBranches, items, currency, clientSecret]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const paymentIntentId = clientSecret ? clientSecret.split('_secret_')[0] : null;

    if (isMixedCart) {
      setMessage(locale === 'ro' 
        ? 'Nu poți plasa o comandă combinată cu precomandă și produse în stoc. Te rugăm să separi comanda folosind opțiunile de mai sus.'
        : 'You cannot place a combined order of pre-order and in-stock items. Please separate the order using the options above.'
      );
      return;
    }

    if (currentStep === 1) {
      const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
      const isFirstNameValid = firstName.trim().length >= 2;
      const isLastNameValid = lastName.trim().length >= 2;
      const isAddressValid = line1.trim().length >= 3;
      const isCityValid = city.trim().length >= 2;
      const isPhoneValid = phone.trim().replace(/\D/g, '').length >= 8;
      const isStateValid = country !== 'RO' || (!!state && state.trim().length > 0);

      const newErrors = {
        email: !isEmailValid,
        firstName: !isFirstNameValid,
        lastName: !isLastNameValid,
        name: !isFirstNameValid || !isLastNameValid,
        address: !isAddressValid,
        city: !isCityValid,
        phone: !isPhoneValid,
        state: !isStateValid
      };
      setErrors(newErrors);

      if (Object.values(newErrors).some(v => v)) {
        setMessage(t('validation_error'));
        return;
      }
      setErrors({});
      setMessage(null);

      // 🚀 GDPR COMPLIANT ABANDONED CART TRACKING
      trackCurrentSession().catch(() => {});

      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (currentStep === 2) {
      if (shippingType === 'pudo' && !selectedBranches[selectedServiceId]) {
        setMessage(t('choose_pickup'));
        return;
      }

      // ⚡ INSTANT TRANSITION
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setMessage(null);

      if (paymentIntentId) {
        const updateStripe = async () => {
          try {
            setIsUpdatingPaymentInfo(true);
            const res = await fetch("/api/checkout/update", {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "x-csrf-token": csrfToken || "",
              },
              body: JSON.stringify({
                paymentIntentId,
                shipping_type: shippingType,
                carrier_id: selectedServiceId,
                branch_id: selectedBranches[selectedServiceId]?.id || "",
                branch_name: selectedBranches[selectedServiceId]?.name || "",
                payment_method: paymentMethod,
                firstName, lastName, email,
                phone: (COUNTRY_DATA[phoneCountry]?.prefix || "") + phone.replace(/^0/, ""),
                line1, line2, city, state, postal_code: postalCode, country,
                currency,
                couponCode: appliedCoupon?.code?.trim()?.toUpperCase(),
                priority_processing: priorityProcessing,
                gift_packaging: giftPackaging,
                gift_message: giftMessage,
                items: items.map(i => ({ id: i.id, name: i.name, quantity: i.quantity, price: i.price, image: i.image, selectedVariant: i.selectedVariant }))
              }),
            });

            if (!res.ok) {
              const errorData = await res.json().catch(() => ({}));
              console.error("❌ Background Update Failed:", errorData);
              setMessage(errorData.error || t('payment_update_error'));
            }
          } catch (err) {
            console.error("❌ Background Update Error:", err);
          } finally {
            setIsUpdatingPaymentInfo(false);
          }
        };

        updateStripe();
      }
      return;
    }

    if (paymentMethod === 'online') {
      // Stripe logic is now handled in StripePaymentSection child component
      // This will never be reached because 'handleSubmit' is linked to the form
      // and we handle online payment specifically inside StripePaymentSection button click.
      return;
    }

    setLoading(true);

    if (country === 'RO' && paymentMethod === 'cod') {
      try {
        const res = await fetch("/api/checkout/cod", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-csrf-token": csrfToken || "",
          },
          body: JSON.stringify({
            email, firstName, lastName,
            phone: (COUNTRY_DATA[phoneCountry]?.prefix || "") + phone.replace(/^0/, ""),
            line1, line2, city, state, postal_code: postalCode, country,
            shipping_type: shippingType,
            carrier_id: selectedServiceId,
            branch_id: selectedBranches[selectedServiceId]?.id || "",
            branch_name: selectedBranches[selectedServiceId]?.name || "",
            items: items.map(i => {
              const isBundle = String(i.id).includes('-bundle-') || (i.name && String(i.name).toLowerCase().includes('pachet'));
              const effectiveImage = isBundle 
                ? '/images/products/x10_elbow_wraps_purple_1.webp' 
                : (i.selectedVariant?.image || (typeof i.image === 'string' && !i.image.includes('bundle') ? i.image : getSingleFlavorImage(i.selectedVariant?.name || i.name)));
              return { id: i.id, name: i.name, quantity: i.quantity, price: i.price, image: effectiveImage, selectedVariant: i.selectedVariant };
            }),
            currency: 'RON', locale,
            couponCode: appliedCoupon?.code?.trim()?.toUpperCase(),
            priority_processing: priorityProcessing,
            gift_packaging: giftPackaging,
            gift_message: giftMessage
          })
        });

        if (res.ok) {
          const data = await res.json();
          sessionStorage.removeItem("campion_checkout_form");
          router.push(`/checkout/success?type=cod&order_id=${data.orderId}`);
        } else {
          const errData = await res.json().catch(() => ({}));
          setMessage(`Eroare Backend: ${errData.error || t('error_processing')}`);
        }
      } catch (err) {
        setMessage(`Eroare Sistem: ${err instanceof Error ? err.message : t('error_processing')}`);
      }
      setLoading(false);
      return;
    }
  };

  const stepVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <form onSubmit={handleSubmit} className="w-full" noValidate>
      <style dangerouslySetInnerHTML={{ __html: pacStyles }} />

      {isMixedCart && (
        <div className="mb-6 p-5 rounded-3xl bg-amber-50 border-2 border-amber-300 text-slate-900 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5 text-amber-800 font-black text-sm mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping shrink-0" />
            <span>{locale === 'ro' ? 'Coșul conține produse în stoc amestecate cu precomandă' : 'Cart contains mixed in-stock and pre-order items'}</span>
          </div>
          <p className="text-xs text-slate-600 mb-3.5 leading-relaxed">
            {locale === 'ro'
              ? 'Produsele în stoc se expediază imediat (24-48h), în timp ce precomenzile au o dată de livrare dedicată. Te rugăm să alegi ce dorești să comanzi acum:'
              : 'In-stock items ship immediately (24-48h), while pre-orders have a dedicated dispatch schedule. Please choose what to keep in this order:'}
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => {
                useCartStore.setState({
                  items: items.filter(i => isPreorder(i, i.selectedVariant))
                });
              }}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-colors"
            >
              {locale === 'ro' ? 'Păstrează doar Precomanda' : 'Keep only Pre-order items'}
            </button>
            <button
              type="button"
              onClick={() => {
                useCartStore.setState({
                  items: items.filter(i => !isPreorder(i, i.selectedVariant))
                });
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors"
            >
              {locale === 'ro' ? 'Păstrează doar Produsele în Stoc' : 'Keep only In-Stock items'}
            </button>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {currentStep === 1 && (
          <motion.div
            key="step1"
            variants={stepVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-6 bg-white p-6 md:p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg md:text-xl font-black uppercase tracking-tight text-black">{t('shipping_title')}</h3>
              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#e32f8c] italic">{t('step_label', { current: 1, total: 3 })}</span>
            </div>

            {/* Real Express Checkout (Only when Stripe Elements provider is active) */}
            {stripeOptions && !isStripeDisabled && clientSecret && clientSecret !== 'disabled' && (
              <Step1ExpressCheckout 
                locale={locale} 
                clientSecret={clientSecret} 
                forceMetadataUpdate={forceMetadataUpdate} 
                items={items}
                currency={currency}
                csrfToken={csrfToken}
                t={t} 
              />
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">
                  Email <span className="text-red-500 font-black">*</span>
                </Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => {
                    trackCurrentSession().catch(() => {});
                  }}
                  placeholder="alex@exemplu.ro"
                  className={cn(
                    "rounded-2xl h-14 bg-zinc-100/50 border-2 border-transparent focus:bg-white focus:border-[#e32f8c] focus:ring-4 focus:ring-[#e32f8c]/10 transition-all duration-300 border-zinc-100 focus:bg-white",
                    errors.email && "!border-red-500 !ring-2 !ring-red-100"
                  )}
                />
                <p className="text-[9px] text-zinc-400 font-bold leading-normal px-2 mt-1 select-none">
                  🔒 {t('abandoned_cart_disclosure')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">
                    {t('first_name')} <span className="text-red-500 font-black">*</span>
                  </Label>
                  <Input 
                    value={firstName} 
                    onChange={(e) => setFirstName(e.target.value)} 
                    placeholder="Eduard" 
                    className={cn(
                      "rounded-2xl h-14 bg-zinc-100/50 border-2 border-transparent focus:bg-white focus:border-[#e32f8c] focus:ring-4 focus:ring-[#e32f8c]/10 transition-all duration-300",
                      errors.firstName && "!border-red-500 !ring-2 !ring-red-100"
                    )} 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">
                    {t('last_name')} <span className="text-red-500 font-black">*</span>
                  </Label>
                  <Input 
                    value={lastName} 
                    onChange={(e) => setLastName(e.target.value)} 
                    placeholder="Donea" 
                    className={cn(
                      "rounded-2xl h-14 bg-zinc-100/50 border-2 border-transparent focus:bg-white focus:border-[#e32f8c] focus:ring-4 focus:ring-[#e32f8c]/10 transition-all duration-300",
                      errors.lastName && "!border-red-500 !ring-2 !ring-red-100"
                    )} 
                  />
                </div>
              </div>

              <CustomSelect
                label={t('country_label')}
                value={country}
                onChange={setCountry}
                options={Object.keys(COUNTRY_DATA).map(code => ({
                  label: COUNTRY_DATA[code].name,
                  value: code,
                  icon: COUNTRY_DATA[code].flag
                }))}
              />

              <div className="space-y-2 relative">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">
                  {t('address')} <span className="text-red-500 font-black">*</span>
                </Label>
                <input
                  ref={addressInputRef}
                  value={line1}
                  onChange={(e) => { setLine1(e.target.value); fetchPredictions(e.target.value); }}
                  onFocus={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    line1.length >= 3 && setShowSuggestions(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                  placeholder={t('street_placeholder')}
                  className={cn(
                    "w-full h-14 px-6 bg-zinc-100/50 border-2 border-transparent focus:bg-white focus:border-[#e32f8c] focus:ring-4 focus:ring-[#e32f8c]/10 transition-all duration-300 rounded-2xl text-xs font-bold outline-none shadow-sm focus:shadow-md",
                    errors.address && "!border-red-500 !ring-2 !ring-red-100"
                  )}
                  autoComplete="off"
                />

                <AnimatePresence>
                  {showSuggestions && predictions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 right-0 z-[1000] mt-2 bg-white border border-zinc-100 rounded-3xl shadow-2xl overflow-hidden"
                    >
                      {predictions.map((p, idx) => (
                        <div
                          key={p.place_id}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handlePredictionSelect(p);
                          }}
                          className={`p-4 flex items-start gap-3 cursor-pointer hover:bg-zinc-100 ${idx !== predictions.length - 1 ? 'border-b border-zinc-50' : ''}`}
                        >
                          <MapPin className="w-4 h-4 text-[#e32f8c] shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-black truncate">{p.structured_formatting.main_text}</p>
                            <p className="text-[10px] text-zinc-400 font-bold uppercase truncate">{p.structured_formatting.secondary_text}</p>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {country === 'RO' && (
                <CustomSelect
                  label={t('county')}
                  value={state}
                  onChange={setState}
                  options={COUNTIES_LIST.map(c => ({ label: c, value: c }))}
                  placeholder={t('select_county')}
                  error={errors.state}
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">
                    {t('city_label')} <span className="text-red-500 font-black">*</span>
                  </Label>
                  <Input 
                    value={city} 
                    onChange={(e) => setCity(e.target.value)} 
                    placeholder="București" 
                    className={cn(
                      "rounded-2xl h-14 bg-zinc-100/50 border-2 border-transparent focus:bg-white focus:border-[#e32f8c] focus:ring-4 focus:ring-[#e32f8c]/10 transition-all duration-300",
                      errors.city && "!border-red-500 !ring-2 !ring-red-100"
                    )} 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">
                    {t('postal_code_label')} <span className="text-zinc-400 font-normal text-[9px] lowercase">(opțional)</span>
                  </Label>
                  <Input 
                    value={postalCode} 
                    onChange={(e) => {
                      let val = e.target.value;
                      if (country === 'RO') {
                        val = val.replace(/[^0-9]/g, '').slice(0, 6);
                      }
                      setPostalCode(val);
                    }} 
                    maxLength={country === 'RO' ? 6 : undefined}
                    inputMode={country === 'RO' ? 'numeric' : 'text'}
                    placeholder={country === 'RO' ? "Ex: 012345" : "Ex: 100000"} 
                    className="rounded-2xl h-14 bg-zinc-100/50 border-2 border-transparent focus:bg-white focus:border-[#e32f8c] focus:ring-4 focus:ring-[#e32f8c]/10 transition-all duration-300" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">
                  {t('phone_label')} <span className="text-red-500 font-black">*</span>
                </Label>
                <div className={cn(
                  "flex h-14 bg-zinc-100/50 border-2 border-transparent focus-within:bg-white focus-within:border-[#e32f8c] focus-within:ring-4 focus-within:ring-[#e32f8c]/10 transition-all duration-300 rounded-2xl relative shadow-sm focus-within:shadow-md",
                  errors.phone && "!border-red-500 !ring-2 !ring-red-100"
                )}>
                  <CustomPrefixSelect
                    value={phoneCountry}
                    onChange={setPhoneCountry}
                    options={Object.keys(COUNTRY_DATA).map(code => ({ label: COUNTRY_DATA[code].prefix, value: code, icon: COUNTRY_DATA[code].flag }))}
                  />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder={COUNTRY_DATA[phoneCountry].placeholder}
                    className="flex-1 px-4 bg-transparent text-xs font-bold outline-none rounded-r-2xl"
                  />
                </div>
              </div>
            </div>

            {message && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-bold border border-red-100">{message}</div>}

            <Button type="submit" className="w-full bg-[#e32f8c] hover:bg-black text-black hover:text-white h-14 rounded-2xl font-black uppercase tracking-widest text-[10px]">
              {t('continue_to_shipping')}
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        )}

        {currentStep === 2 && (
          <motion.div
            key="step2"
            variants={stepVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-6 bg-white p-6 md:p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg md:text-xl font-black uppercase tracking-tight text-black">{t('delivery_method_title')}</h3>
              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#e32f8c] italic">{t('step_label', { current: 2, total: 4 })}</span>
            </div>

            <div className="space-y-4">
              {(() => {
                const totalWeight = items.reduce((acc, item) => acc + (item.weight || 0.2) * item.quantity, 0);
                const maxL = Math.max(100, ...items.map(i => i.length_mm || 150));
                const maxW = Math.max(70, ...items.map(i => i.width_mm || 100));

                // Smart Stacking: Max height of largest item + 25% height of others (assuming nesting)
                const tallestItem = Math.max(20, ...items.map(i => i.height_mm || 50));
                const otherHeights = items.reduce((acc, i) => acc + (i.height_mm || 50) * i.quantity, 0) - tallestItem;
                const sumH = Math.max(20, tallestItem + (otherHeights * 0.25));

                const sumLWH = maxL + maxW + sumH;
                const maxSide = Math.max(maxL, maxW, sumH);

                // Threshold logic (must match cart-calculations.ts & OrderSummary)
                const { subtotal, discount, couponDiscount } = getTotals(currency);
                const isRo = country.toUpperCase() === 'RO';
                const roThreshold = getProductPrice(300, currency);
                const intlThreshold = currency === 'EUR' ? 100 : getProductPrice(530, currency);
                
                const thresholdBase = subtotal - discount - couponDiscount;
                const thresholdReached = isRo ? thresholdBase >= roThreshold : thresholdBase >= intlThreshold;
                const isFreeShipping = appliedCoupon?.type === 'free_shipping' || thresholdReached;

                const metrics: ParcelMetrics = {
                  weight: totalWeight,
                  length: maxL,
                  width: maxW,
                  height: sumH,
                  maxSide,
                  sumLWH
                };

                const hdServices = getShippingServices(country, 'hd').filter(s => isServiceAvailable(s, country, metrics));
                // Sameday Locker (Easybox) este activat exclusiv pentru România (în afară nu livrăm în lockere)
                const pudoServices = country === 'RO'
                  ? getShippingServices(country, 'pudo').filter(s => isServiceAvailable(s, country, metrics))
                  : [];

                if (hdServices.length === 0 && pudoServices.length === 0) {
                  return (
                    <div className="p-8 bg-zinc-100 border border-dashed border-zinc-200 rounded-[2rem] text-center">
                      <Truck className="w-10 h-10 text-zinc-300 mx-auto mb-4" />
                      <p className="text-xs font-bold text-zinc-800 uppercase leading-relaxed mb-4">
                        {t('shipping_special_case')}
                      </p>
                      <a
                        href="mailto:trenzone483@gmail.com"
                        className="inline-block px-6 py-3 bg-white border border-zinc-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all"
                      >
                        {t('contact_us_cta', { defaultValue: 'Contactează-ne' })}
                      </a>
                    </div>
                  );
                }

                return (
                  <>
                    {hdServices.map((service) => (
                      <div
                        key={service.id}
                        onClick={() => { setShippingType('hd'); setSelectedServiceId(service.id); }}
                        className={`p-6 rounded-3xl border-2 transition-all cursor-pointer ${shippingType === 'hd' && selectedServiceId === service.id ? 'border-[#e32f8c] bg-[#e32f8c]/5' : 'border-zinc-100 bg-white'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Truck className={`w-6 h-6 ${shippingType === 'hd' && selectedServiceId === service.id ? 'text-[#e32f8c]' : 'text-zinc-400'}`} />
                            <p className="text-sm font-black uppercase">{getLocalizedServiceName(service, locale, t)}</p>
                          </div>
                          <span className="font-black text-sm">
                            {isFreeShipping || getShippingCost(country, 'hd', totalWeight, currency, service.id) === 0
                              ? <span className="text-green-600">{t('free')}</span>
                              : formatPrice(getShippingCost(country, 'hd', totalWeight, currency, service.id), currency)}
                          </span>
                        </div>
                      </div>
                    ))}

                    {pudoServices.map((service) => (
                      <div
                        key={service.id}
                        onClick={() => { 
                          setShippingType('pudo'); 
                          setSelectedServiceId(service.id); 
                          if (service.provider === 'sameday') {
                            setIsSamedayLockerOpen(true);
                          } else {
                            openPacketaWidget(service.id); 
                          }
                        }}
                        className={`p-6 rounded-3xl border-2 transition-all cursor-pointer ${shippingType === 'pudo' && selectedServiceId === service.id ? (service.provider === 'sameday' ? 'border-red-600 bg-red-50' : 'border-[#e32f8c] bg-[#e32f8c]/5') : 'border-zinc-100 bg-white'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <MapPin className={`w-6 h-6 ${shippingType === 'pudo' && selectedServiceId === service.id ? (service.provider === 'sameday' ? 'text-red-600' : 'text-[#e32f8c]') : 'text-zinc-400'}`} />
                            <div className="flex-1">
                              <p className="text-sm font-black uppercase text-black">{getLocalizedServiceName(service, locale, t)}</p>
                              
                              {shippingType === 'pudo' && selectedServiceId === service.id && service.provider === 'sameday' ? (
                                <div className="mt-2">
                                  {selectedBranches[service.id] ? (
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-[10px] font-bold text-zinc-800 uppercase">{selectedBranches[service.id]?.name}</span>
                                      <button 
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsSamedayLockerOpen(true); }}
                                        className="text-[9px] font-black text-red-600 hover:underline"
                                      >
                                        Schimbă
                                      </button>
                                    </div>
                                  ) : (
                                    <button 
                                      type="button"
                                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsSamedayLockerOpen(true); }}
                                      className="mt-2 w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors shadow-sm"
                                    >
                                      Alege Easybox de pe Hartă
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <p className="text-[9px] font-bold text-zinc-400 uppercase mt-0.5">{selectedBranches[service.id]?.name || t('choose_pickup')}</p>
                              )}
                            </div>
                          </div>
                          <span className="font-black text-sm">
                            {isFreeShipping || getShippingCost(country, 'pudo', totalWeight, currency, service.id) === 0
                              ? <span className="text-green-600">{t('free')}</span>
                              : formatPrice(getShippingCost(country, 'pudo', totalWeight, currency, service.id), currency)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>

            {message && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-bold border border-red-100 mb-4">{message}</div>}

            <div className="flex gap-4">
              <Button type="button" variant="outline" onClick={handleBack} className="flex-1 h-14 rounded-2xl font-bold uppercase tracking-widest text-[10px]">{t('back')}</Button>
              <Button type="submit" disabled={!selectedServiceId} className="relative flex-[1.5] bg-[#e32f8c] hover:bg-black text-black hover:text-white h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] overflow-hidden transition-all shadow-lg hover:shadow-xl active:scale-[0.98]">Următorul Pas</Button>
            </div>
          </motion.div>
        )}

        {currentStep === 3 && (
          <motion.div
            key="step3"
            variants={stepVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-6 bg-white p-6 md:p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg md:text-xl font-black uppercase tracking-tight text-black">{locale === 'ro' ? 'Opțiuni Suplimentare' : 'Additional Options'}</h3>
              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#e32f8c] italic">{t('step_label', { current: 3, total: 4 })}</span>
            </div>

            <div className="space-y-4">
              <label className={`flex flex-col gap-2 p-6 rounded-3xl border-2 transition-all cursor-pointer ${priorityProcessing ? 'border-[#e32f8c] bg-[#e32f8c]/5' : 'border-zinc-100 bg-white hover:border-zinc-200'}`}>
                <div className="flex items-start gap-4">
                  <div className="relative flex items-center h-6 mt-1">
                    <input type="checkbox" checked={priorityProcessing} onChange={(e) => setPriorityProcessing(e.target.checked)} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${priorityProcessing ? 'bg-[#e32f8c] border-[#e32f8c]' : 'border-zinc-300 bg-white'}`}>
                      {priorityProcessing && <Check className="w-4 h-4 text-black stroke-[3]" />}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-black uppercase tracking-widest text-black">
                      {locale === 'ro' ? 'Procesare Prioritară' : 'Priority Processing'}{' '}
                      <span className="text-[#e32f8c] text-xs font-black ml-1">
                        (+{formatPrice(getProductPrice(6.90, paymentMethod === 'cod' ? 'RON' : currency), paymentMethod === 'cod' ? 'RON' : currency)})
                      </span>
                    </span>
                    <p className="text-xs text-zinc-500 font-medium mt-1">
                      {locale === 'ro'
                        ? 'Comanda ta ajunge prima la ambalare și va fi predată curierului în cel mai scurt timp posibil.'
                        : 'Your order gets packed first and handed to the courier as fast as possible.'}
                    </p>
                  </div>
                </div>
              </label>

              <label className={`flex flex-col gap-2 p-6 rounded-3xl border-2 transition-all cursor-pointer ${giftPackaging ? 'border-[#ff007a] bg-[#ff007a]/5' : 'border-zinc-100 bg-white hover:border-zinc-200'}`}>
                <div className="flex items-start gap-4">
                  <div className="relative flex items-center h-6 mt-1">
                    <input type="checkbox" checked={giftPackaging} onChange={(e) => setGiftPackaging(e.target.checked)} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${giftPackaging ? 'bg-[#ff007a] border-[#ff007a]' : 'border-zinc-300 bg-white'}`}>
                      {giftPackaging && <Check className="w-4 h-4 text-white stroke-[3]" />}
                    </div>
                  </div>
                  <div className="w-full">
                    <span className="text-sm font-black uppercase tracking-widest text-black">
                      {locale === 'ro' ? 'Împachetare Cadou' : 'Gift Packaging'}{' '}
                      <span className="text-[#ff007a] text-xs font-black ml-1">
                        (+{formatPrice(getProductPrice(14.90, paymentMethod === 'cod' ? 'RON' : currency), paymentMethod === 'cod' ? 'RON' : currency)})
                      </span>
                    </span>
                    <p className="text-xs text-zinc-500 font-medium mt-1">
                      {locale === 'ro'
                        ? 'Produsele vor fi ambalate festiv, perfecte pentru a fi oferite cadou.'
                        : 'Products will be festively wrapped, perfect for gifting.'}
                    </p>
                    
                    {giftPackaging && (
                      <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">
                          {locale === 'ro' ? 'Mesaj Cadou (Opțional)' : 'Gift Message (Optional)'}
                        </Label>
                        <textarea 
                          value={giftMessage} 
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setGiftMessage(e.target.value)} 
                          placeholder={locale === 'ro' ? 'Scrie un mesaj drăguț...' : 'Write a nice message...'} 
                          className="mt-2 w-full rounded-2xl min-h-[100px] p-4 bg-white border-2 border-zinc-200 focus:border-[#ff007a] focus:ring-4 focus:ring-[#ff007a]/10 transition-all duration-300 resize-none text-sm relative z-20 cursor-text" 
                        />
                      </div>
                    )}
                  </div>
                </div>
              </label>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="button" variant="outline" onClick={handleBack} className="flex-1 h-14 rounded-2xl font-bold uppercase tracking-widest text-[10px]">{t('back')}</Button>
              <Button type="button" onClick={async () => {
                // Sync Stripe with online payment method + all options before entering Step 4
                await syncStripePaymentMethod('online');
                setCurrentStep(4);
              }} className="relative flex-[1.5] bg-[#e32f8c] hover:bg-black text-black hover:text-white h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] overflow-hidden transition-all shadow-lg hover:shadow-xl active:scale-[0.98]">{t('continue_to_payment')}</Button>
            </div>
          </motion.div>
        )}

        {currentStep === 4 && (
          <motion.div
            key="step4"
            variants={stepVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-6 bg-white p-6 md:p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg md:text-xl font-black uppercase tracking-tight text-black">{t('payment_method_title')}</h3>
              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#e32f8c] italic">{t('step_label', { current: 4, total: 4 })}</span>
            </div>

            {/* Payment Method Selector */}
            {country === 'RO' && !isStripeDisabled && (
              <div className="grid grid-cols-2 gap-4 mb-8">
                <button
                  type="button"
                  onClick={async () => {
                    setPaymentMethod('online');
                    // Sync Stripe so Apple Pay / Google Pay shows correct total with -5 lei card discount
                    await syncStripePaymentMethod('online');
                  }}
                  className={`relative overflow-hidden flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border-2 transition-all ${paymentMethod === 'online' ? 'border-[#e32f8c] bg-[#e32f8c]/5' : 'border-zinc-100 bg-zinc-100 hover:bg-zinc-100'}`}
                >
                  <div className="absolute top-0 right-0 bg-[#ff007a] text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-2xl shadow-sm">
                    -{formatPrice(getProductPrice(5, currency), currency)} {locale === 'ro' ? 'REDUCERE' : 'DISCOUNT'}
                  </div>
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mt-2 ${paymentMethod === 'online' ? 'bg-[#e32f8c] text-white' : 'bg-white text-zinc-400'}`}>
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest">{t('card_payment')}</span>
                </button>
                <div className="relative h-full">
                  <button
                    type="button"
                    disabled={hasPreorderItems}
                    onClick={async () => {
                      if (hasPreorderItems) return;
                      setPaymentMethod('cod');
                      // Sync Stripe so it removes the -5 lei card discount when switching to COD
                      await syncStripePaymentMethod('cod');
                    }}
                    className={`h-full w-full flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border-2 transition-all ${paymentMethod === 'cod' ? 'border-[#e32f8c] bg-[#e32f8c]/5' : 'border-zinc-100 bg-zinc-100 hover:bg-zinc-100'} ${hasPreorderItems ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${paymentMethod === 'cod' ? 'bg-[#e32f8c] text-white' : 'bg-white text-zinc-400'}`}>
                      <Truck className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">{t('cod_payment')}</span>
                  </button>
                  {hasPreorderItems && (
                    <div className="absolute -bottom-6 left-0 w-full text-center">
                      <span className="text-[8px] font-bold text-red-500">{locale === 'ro' ? '*Indisponibil pentru precomandă' : '*Unavailable for preorder'}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {paymentMethod === 'online' ? (
              <StripePaymentSection 
                t={t}
                locale={locale}
                router={router}
                email={email}
                firstName={firstName}
                lastName={lastName}
                phone={phone}
                phoneCountry={phoneCountry}
                line1={line1}
                line2={line2}
                city={city}
                state={state}
                postalCode={postalCode}
                country={country}
                handleBack={handleBack}
                isUpdatingPaymentInfo={isUpdatingPaymentInfo}
                clientSecret={clientSecret}
                forceMetadataUpdate={forceMetadataUpdate}
                agreedToTerms={agreedToTerms}
                setAgreedToTerms={setAgreedToTerms}
                agreedToMarketing={agreedToMarketing}
                setAgreedToMarketing={setAgreedToMarketing}
                animateTerms={animateTerms}
                triggerTermsError={triggerTermsError}
                stripeSyncTrigger={stripeSyncTrigger}
              />
            ) : (
              <div className="space-y-6">
                <div className="bg-zinc-100 p-8 rounded-3xl border border-dashed border-zinc-200 text-center mb-6">
                  <Truck className="w-8 h-8 text-zinc-300 mx-auto mb-4" />
                  <p className="text-[10px] font-bold text-zinc-500 uppercase">{t('cod_notice')}</p>
                </div>

                <div id="terms-checkbox-container-cod" className="space-y-3 mb-6 scroll-mt-24">
                  <motion.div 
                    animate={animateTerms ? { x: [-10, 10, -10, 10, 0], scale: [1, 1.02, 1] } : { x: 0, scale: 1 }}
                    transition={{ duration: 0.4 }}
                    className={cn(
                      "p-4 rounded-2xl transition-all duration-200 border-2",
                      animateTerms 
                        ? "border-red-500 bg-red-50/80 shadow-md shadow-red-200" 
                        : !agreedToTerms 
                          ? "border-amber-200/80 bg-amber-50/30" 
                          : "border-green-300 bg-green-50/30"
                    )}
                  >
                    <label className="flex items-start gap-3.5 cursor-pointer group select-none">
                      <div className="relative flex items-center shrink-0 mt-0.5">
                        <input
                          type="checkbox"
                          checked={agreedToTerms}
                          onChange={(e) => setAgreedToTerms(e.target.checked)}
                          className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                        />
                        <div className={cn(
                          "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all duration-200",
                          agreedToTerms 
                            ? "bg-[#e32f8c] border-[#e32f8c] shadow-sm shadow-[#e32f8c]/30 scale-100" 
                            : animateTerms
                              ? "bg-white border-red-500 ring-2 ring-red-300"
                              : "bg-white border-zinc-400 hover:border-zinc-500 group-hover:border-[#e32f8c]"
                        )}>
                          {agreedToTerms && (
                            <Check className="w-3.5 h-3.5 text-black stroke-[3.5] animate-in zoom-in-50 duration-150" />
                          )}
                        </div>
                      </div>
                    <span className="text-[11px] md:text-xs font-semibold text-zinc-700 group-hover:text-zinc-900 leading-tight transition-colors">
                      <span className="text-red-500 mr-1 font-black">*</span>
                      {t.rich('i_agree_to_terms', {
                        terms: (chunks: React.ReactNode) => <Link href="/termeni-si-conditii" target="_blank" className="text-[#e32f8c] underline hover:text-black font-bold">{chunks}</Link>,
                        privacy: (chunks: React.ReactNode) => <Link href="/politica-de-confidentialitate" target="_blank" className="text-[#e32f8c] underline hover:text-black font-bold">{chunks}</Link>
                      })}
                      <span className="text-zinc-400 ml-1 text-[10px] font-bold">({t('required_label')})</span>
                    </span>
                  </label>
                </motion.div>

                <label className="flex items-start gap-3.5 cursor-pointer group px-4 select-none">
                  <div className="relative flex items-center shrink-0 mt-0.5">
                    <input
                      type="checkbox"
                      checked={agreedToMarketing}
                      onChange={(e) => setAgreedToMarketing(e.target.checked)}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                    />
                    <div className={cn(
                      "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all duration-200",
                      agreedToMarketing 
                        ? "bg-[#e32f8c] border-[#e32f8c] shadow-sm shadow-[#e32f8c]/30 scale-100" 
                        : "bg-white border-zinc-300 hover:border-zinc-400 group-hover:border-[#e32f8c]"
                    )}>
                      {agreedToMarketing && (
                        <Check className="w-3.5 h-3.5 text-black stroke-[3.5] animate-in zoom-in-50 duration-150" />
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] md:text-xs font-semibold text-zinc-500 group-hover:text-zinc-800 leading-tight transition-colors">
                    {t('newsletter_opt_in')}
                  </span>
                </label>
              </div>

              <AnimatePresence>
                {animateTerms && !agreedToTerms && (
                  <motion.div 
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="p-3 rounded-xl text-center mb-4 text-xs font-bold text-red-600 bg-red-50 border border-red-200 shadow-sm"
                  >
                    {t('accept_terms_to_proceed')}
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div className="flex gap-4">
                <Button type="button" variant="outline" onClick={handleBack} className="flex-1 h-14 rounded-2xl font-bold uppercase tracking-widest text-[10px]">{t('back')}</Button>
                <Button 
                  type="submit" 
                  onClick={(e) => {
                    if (!agreedToTerms) {
                      e.preventDefault();
                      triggerTermsError();
                    }
                  }}
                  disabled={loading} 
                  className="relative flex-[1.5] h-14 rounded-2xl font-black uppercase tracking-wider text-xs overflow-hidden transition-all shadow-lg hover:shadow-xl active:scale-[0.98] bg-[#e32f8c] hover:bg-black text-black hover:text-white"
                >
                  {loading ? t('processing') : t('pay_now')}
                </Button>
              </div>
              </div>
            )}
            {message && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-bold border border-red-100">{message}</div>}

          </motion.div>
        )}
      </AnimatePresence>
      <SamedayLockerSelector 
        isOpen={isSamedayLockerOpen}
        onClose={() => setIsSamedayLockerOpen(false)}
        selectedLockerId={selectedBranches[selectedServiceId]?.id ? Number(selectedBranches[selectedServiceId].id) : null}
        onSelect={(locker) => {
          setSelectedBranch(selectedServiceId, {
            id: String(locker.id),
            name: `${locker.name} (${locker.address})`
          });
        }}
      />
    </form>
  );
}




