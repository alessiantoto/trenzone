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
import { ChevronRight, Truck, MapPin, ShieldCheck, Check, Loader2, Lock } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, Link } from "@/i18n/routing";
import { getShippingServices, getLocalizedServiceName, getShippingCost, isServiceAvailable, ParcelMetrics, COUNTRY_SERVICES, ALLOWED_SHIPPING_COUNTRIES, EXPRESS_ALLOWED_COUNTRIES, toStripeIsoCountryCode, isEuCustomsCountry } from "@/lib/shipping-config";
import { useRegionStore } from "@/store/useRegionStore";
import { useCheckoutStore } from "@/store/useCheckoutStore";
import { formatPrice } from "@/utils/currency";
import { getProductPrice } from "@/utils/pricing";
import Image from "next/image";
import { trackCheckoutSession } from "@/app/actions/checkout-tracking";
import { getSingleFlavorImage } from "@/lib/product-images";
import { SamedayLockerSelector } from "./SamedayLockerSelector";
import { cn } from "@/lib/utils";
import { calculateOrderTotal, CartItem, getEffectiveItemWeight, getFreeShippingThreshold } from "@/lib/cart-calculations";
import { useShippingConfig } from "@/lib/use-shipping-config";
import {
  DIGITAL_PROGRAM_PRODUCTS,
  PROGRAM_SLUGS,
  PROGRAM_UUIDS,
  isDigitalProgramItem,
  isDigitalOnlyCart,
  hasAnyDigitalProgram,
  type DigitalProgramLanguage,
} from "@/lib/programs";

function LanguageFlagSvg({ isEnglish }: { isEnglish: boolean }) {
  if (isEnglish) {
    return (
      <svg
        viewBox="0 0 60 40"
        className="w-4 h-3 rounded-[2px] shadow-2xs border border-black/15 shrink-0"
        aria-hidden="true"
      >
        <rect width="60" height="40" fill="#012169" />
        <path d="M0,0 L60,40 M60,0 L0,40" stroke="#FFFFFF" strokeWidth="7" />
        <path d="M0,0 L60,40 M60,0 L0,40" stroke="#C8102E" strokeWidth="3.5" />
        <path d="M30,0 V40 M0,20 H60" stroke="#FFFFFF" strokeWidth="11" />
        <path d="M30,0 V40 M0,20 H60" stroke="#C8102E" strokeWidth="6.5" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 16"
      className="w-4 h-3 rounded-[2px] shadow-2xs border border-black/15 shrink-0"
      aria-hidden="true"
    >
      <rect width="8" height="16" x="0" fill="#002B7F" />
      <rect width="8" height="16" x="8" fill="#FCD116" />
      <rect width="8" height="16" x="16" fill="#CE1126" />
    </svg>
  );
}

const COUNTIES_LIST = [
  "Alba", "Arad", "Argeș", "Bacău", "Bihor", "Bistrița-Năsăud", "Botoșani", "Brăila", "Brașov",
  "București", "Buzău", "Călărași", "Caraș-Severin", "Cluj", "Constanța", "Covasna", "Dâmbovița",
  "Dolj", "Galați", "Giurgiu", "Gorj", "Harghita", "Hunedoara", "Ialomița", "Iași", "Ilfov",
  "Maramureș", "Mehedinți", "Mureș", "Neamț", "Olt", "Prahova", "Sălaj", "Satu Mare", "Sibiu",
  "Suceava", "Teleorman", "Timiș", "Tulcea", "Vâlcea", "Vaslui", "Vrancea"
];

const COUNTRY_DATA: Record<string, { name: string; nameEn: string; flag: string; prefix: string; placeholder: string }> = {
  RO: { name: "România", nameEn: "Romania", flag: "https://flagcdn.com/w40/ro.png", prefix: "+40", placeholder: "07XX XXX XXX" },
  HU: { name: "Ungaria", nameEn: "Hungary", flag: "https://flagcdn.com/w40/hu.png", prefix: "+36", placeholder: "20 XXX XXXX" },
  BG: { name: "Bulgaria", nameEn: "Bulgaria", flag: "https://flagcdn.com/w40/bg.png", prefix: "+359", placeholder: "8X XXX XXXX" },
  CZ: { name: "Cehia", nameEn: "Czech Republic", flag: "https://flagcdn.com/w40/cz.png", prefix: "+420", placeholder: "XXX XXX XXX" },
  SK: { name: "Slovacia", nameEn: "Slovakia", flag: "https://flagcdn.com/w40/sk.png", prefix: "+421", placeholder: "9XX XXX XXX" },
  PL: { name: "Polonia", nameEn: "Poland", flag: "https://flagcdn.com/w40/pl.png", prefix: "+48", placeholder: "XXX XXX XXX" },
  DE: { name: "Germania", nameEn: "Germany", flag: "https://flagcdn.com/w40/de.png", prefix: "+49", placeholder: "1XX XXXXXXX" },
  AT: { name: "Austria", nameEn: "Austria", flag: "https://flagcdn.com/w40/at.png", prefix: "+43", placeholder: "6XX XXXXXXX" },
  IT: { name: "Italia", nameEn: "Italy", flag: "https://flagcdn.com/w40/it.png", prefix: "+39", placeholder: "3XX XXXXXXX" },
  FR: { name: "Franța", nameEn: "France", flag: "https://flagcdn.com/w40/fr.png", prefix: "+33", placeholder: "06 12 34 56 78" },
  GR: { name: "Grecia", nameEn: "Greece", flag: "https://flagcdn.com/w40/gr.png", prefix: "+30", placeholder: "69X XXX XXXX" },
  BE: { name: "Belgia", nameEn: "Belgium", flag: "https://flagcdn.com/w40/be.png", prefix: "+32", placeholder: "04XX XX XX XX" },
  NL: { name: "Olanda", nameEn: "Netherlands", flag: "https://flagcdn.com/w40/nl.png", prefix: "+31", placeholder: "06 1234 5678" },
  HR: { name: "Croația", nameEn: "Croatia", flag: "https://flagcdn.com/w40/hr.png", prefix: "+385", placeholder: "09X XXX XXXX" },
  SI: { name: "Slovenia", nameEn: "Slovenia", flag: "https://flagcdn.com/w40/si.png", prefix: "+386", placeholder: "0XX XXX XXX" },
  ES: { name: "Spania", nameEn: "Spain", flag: "https://flagcdn.com/w40/es.png", prefix: "+34", placeholder: "6XX XXX XXX" },
  "ES-BI": { name: "Spania — Insulele Baleare", nameEn: "Spain — Balearic Islands", flag: "https://flagcdn.com/w40/es.png", prefix: "+34", placeholder: "6XX XXX XXX" },
  IC: { name: "Spania — Insulele Canare", nameEn: "Spain — Canary Islands", flag: "https://flagcdn.com/w40/es.png", prefix: "+34", placeholder: "6XX XXX XXX" },
  PT: { name: "Portugalia", nameEn: "Portugal", flag: "https://flagcdn.com/w40/pt.png", prefix: "+351", placeholder: "9XX XXX XXX" },
  GB: { name: "Marea Britanie", nameEn: "United Kingdom", flag: "https://flagcdn.com/w40/gb.png", prefix: "+44", placeholder: "7XXX XXXXXX" },
  SE: { name: "Suedia", nameEn: "Sweden", flag: "https://flagcdn.com/w40/se.png", prefix: "+46", placeholder: "7X XXX XX XX" },
  FI: { name: "Finlanda", nameEn: "Finland", flag: "https://flagcdn.com/w40/fi.png", prefix: "+358", placeholder: "4X XXX XX XX" },
  EE: { name: "Estonia", nameEn: "Estonia", flag: "https://flagcdn.com/w40/ee.png", prefix: "+372", placeholder: "5X XXX XXX" },
  LV: { name: "Letonia", nameEn: "Latvia", flag: "https://flagcdn.com/w40/lv.png", prefix: "+371", placeholder: "2X XXX XXX" },
  LT: { name: "Lituania", nameEn: "Lithuania", flag: "https://flagcdn.com/w40/lt.png", prefix: "+370", placeholder: "6X XXX XXX" },
  LU: { name: "Luxemburg", nameEn: "Luxembourg", flag: "https://flagcdn.com/w40/lu.png", prefix: "+352", placeholder: "6XX XXX XXX" },
  DK: { name: "Danemarca", nameEn: "Denmark", flag: "https://flagcdn.com/w40/dk.png", prefix: "+45", placeholder: "XX XX XX XX" },
  IE: { name: "Irlanda", nameEn: "Ireland", flag: "https://flagcdn.com/w40/ie.png", prefix: "+353", placeholder: "8X XXX XXXX" },
  IS: { name: "Islanda", nameEn: "Iceland", flag: "https://flagcdn.com/w40/is.png", prefix: "+354", placeholder: "XXX XXXX" },
  MT: { name: "Malta", nameEn: "Malta", flag: "https://flagcdn.com/w40/mt.png", prefix: "+356", placeholder: "XXXX XXXX" },
  NO: { name: "Norvegia", nameEn: "Norway", flag: "https://flagcdn.com/w40/no.png", prefix: "+47", placeholder: "XXX XX XXX" },
  CH: { name: "Elveția", nameEn: "Switzerland", flag: "https://flagcdn.com/w40/ch.png", prefix: "+41", placeholder: "7X XXX XX XX" },
  CY: { name: "Cipru", nameEn: "Cyprus", flag: "https://flagcdn.com/w40/cy.png", prefix: "+357", placeholder: "9X XXX XXX" },
  TR: { name: "Turcia", nameEn: "Turkey", flag: "https://flagcdn.com/w40/tr.png", prefix: "+90", placeholder: "5XX XXX XXXX" },
  UA: { name: "Ucraina", nameEn: "Ukraine", flag: "https://flagcdn.com/w40/ua.png", prefix: "+380", placeholder: "XX XXX XXXX" },
  US: { name: "Statele Unite", nameEn: "United States", flag: "https://flagcdn.com/w40/us.png", prefix: "+1", placeholder: "XXX XXX XXXX" },
  CA: { name: "Canada", nameEn: "Canada", flag: "https://flagcdn.com/w40/ca.png", prefix: "+1", placeholder: "XXX XXX XXXX" },
  MX: { name: "Mexic", nameEn: "Mexico", flag: "https://flagcdn.com/w40/mx.png", prefix: "+52", placeholder: "XX XXXX XXXX" },
  AR: { name: "Argentina", nameEn: "Argentina", flag: "https://flagcdn.com/w40/ar.png", prefix: "+54", placeholder: "11 XXXX XXXX" },
  BR: { name: "Brazilia", nameEn: "Brazil", flag: "https://flagcdn.com/w40/br.png", prefix: "+55", placeholder: "XX XXXXX XXXX" },
  CL: { name: "Chile", nameEn: "Chile", flag: "https://flagcdn.com/w40/cl.png", prefix: "+56", placeholder: "9 XXXX XXXX" },
  IL: { name: "Israel", nameEn: "Israel", flag: "https://flagcdn.com/w40/il.png", prefix: "+972", placeholder: "5X XXX XXXX" },
  AE: { name: "Emiratele Arabe Unite", nameEn: "United Arab Emirates", flag: "https://flagcdn.com/w40/ae.png", prefix: "+971", placeholder: "5X XXX XXXX" },
  CN: { name: "China", nameEn: "China", flag: "https://flagcdn.com/w40/cn.png", prefix: "+86", placeholder: "1XX XXXX XXXX" },
  HK: { name: "Hong Kong", nameEn: "Hong Kong", flag: "https://flagcdn.com/w40/hk.png", prefix: "+852", placeholder: "XXXX XXXX" },
  IN: { name: "India", nameEn: "India", flag: "https://flagcdn.com/w40/in.png", prefix: "+91", placeholder: "XXXXX XXXXX" },
  ID: { name: "Indonezia", nameEn: "Indonesia", flag: "https://flagcdn.com/w40/id.png", prefix: "+62", placeholder: "8XX XXXX XXXX" },
  JP: { name: "Japonia", nameEn: "Japan", flag: "https://flagcdn.com/w40/jp.png", prefix: "+81", placeholder: "90 XXXX XXXX" },
  MY: { name: "Malaezia", nameEn: "Malaysia", flag: "https://flagcdn.com/w40/my.png", prefix: "+60", placeholder: "1X XXX XXXX" },
  SG: { name: "Singapore", nameEn: "Singapore", flag: "https://flagcdn.com/w40/sg.png", prefix: "+65", placeholder: "XXXX XXXX" },
  KR: { name: "Coreea de Sud", nameEn: "South Korea", flag: "https://flagcdn.com/w40/kr.png", prefix: "+82", placeholder: "10 XXXX XXXX" },
  TW: { name: "Taiwan", nameEn: "Taiwan", flag: "https://flagcdn.com/w40/tw.png", prefix: "+886", placeholder: "9XX XXX XXX" },
  TH: { name: "Thailanda", nameEn: "Thailand", flag: "https://flagcdn.com/w40/th.png", prefix: "+66", placeholder: "8X XXX XXXX" },
  AU: { name: "Australia", nameEn: "Australia", flag: "https://flagcdn.com/w40/au.png", prefix: "+61", placeholder: "4XX XXX XXX" },
  NZ: { name: "Noua Zeelandă", nameEn: "New Zealand", flag: "https://flagcdn.com/w40/nz.png", prefix: "+64", placeholder: "2X XXX XXXX" },
  ZA: { name: "Africa de Sud", nameEn: "South Africa", flag: "https://flagcdn.com/w40/za.png", prefix: "+27", placeholder: "8X XXX XXXX" },
};

function formatPhoneWithPrefix(rawPhone: string, phoneCountry: string): string {
  const cleaned = String(rawPhone || "").trim().replace(/[\s().-]/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("00")) return `+${cleaned.slice(2)}`;
  const prefix = COUNTRY_DATA[phoneCountry]?.prefix || "";
  const prefixDigits = prefix.replace(/\D/g, "");
  if (prefixDigits && cleaned.startsWith(prefixDigits) && cleaned.length >= prefixDigits.length + 7) {
    return `+${cleaned}`;
  }
  return `${prefix}${cleaned.replace(/^0+/, "")}`;
}

function normalizeRoText(val: string): string {
  return String(val || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .trim();
}

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
  const cartItems = useCartStore((s) => s.items);
  const showNonEuCustomsNote = !isDigitalOnlyCart(cartItems) && !isEuCustomsCountry(country);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const submittingStripeRef = useRef(false);

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

  const handleStripeSubmit = async (e: React.FormEvent, expressEvent?: any) => {
    e.preventDefault();
    if (submittingStripeRef.current) return;
    if (!agreedToTerms) {
      triggerTermsError();
      expressEvent?.paymentFailed?.({ reason: 'fail' });
      return;
    }
    if (!stripe || !elements) {
      expressEvent?.paymentFailed?.({ reason: 'fail' });
      return;
    }

    submittingStripeRef.current = true;
    setLoading(true);
    setMessage(null);

    try {
      // Force a final metadata + checkout_sessions sync before payment confirmation
      console.log("🛡️ [PAYMENT] Forcing final metadata sync...");
      await forceMetadataUpdate();
      if (typeof elements.fetchUpdates === 'function') {
        await elements.fetchUpdates();
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/${locale}/checkout/success`,
          receipt_email: email.trim(),
          shipping: {
            name: `${firstName} ${lastName}`.trim(),
            phone: formatPhoneWithPrefix(phone, phoneCountry),
            address: { 
              line1, 
              line2: line2 || "", 
              city, 
              state, 
              postal_code: postalCode, 
              country: toStripeIsoCountryCode(country)
            }
          }
        },
        redirect: 'if_required',
      });

      if (error) {
        console.error("❌ Stripe Payment Error:", error);
        const errText = error.message || t('payment_error');
        setMessage(errText);
        expressEvent?.paymentFailed?.({ reason: 'fail', message: errText });
      } else if (paymentIntent?.id) {
        const piId = paymentIntent.id;
        window.location.href = `${window.location.origin}/${locale}/checkout/success?payment_intent=${piId}&payment_intent_client_secret=${encodeURIComponent(clientSecret)}&redirect_status=${paymentIntent.status || 'succeeded'}`;
      }
    } catch (err: any) {
      console.error("❌ Payment System Error:", err);
      const errText = err.message || t('system_error');
      setMessage(errText);
      expressEvent?.paymentFailed?.({ reason: 'fail', message: errText });
    } finally {
      submittingStripeRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-zinc-100 p-6 rounded-3xl border border-zinc-100 font-bold min-h-[220px] flex flex-col justify-center relative overflow-hidden">
        {(isUpdatingPaymentInfo || !stripe || !elements) && (
          <div className="absolute inset-0 bg-zinc-100/95 backdrop-blur-[2px] z-10 flex flex-col justify-center gap-3 p-6" aria-label={t('loading_payment_methods')}>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="h-11 rounded-xl bg-zinc-200/80 animate-pulse" />
              <div className="h-11 rounded-xl bg-zinc-200/80 animate-pulse" />
            </div>
            <div className="bg-white rounded-2xl border border-zinc-200/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-4 w-32 rounded bg-zinc-200 animate-pulse" />
                <div className="h-4 w-16 rounded bg-zinc-100 animate-pulse" />
              </div>
              <div className="h-11 w-full rounded-xl bg-zinc-100 animate-pulse" />
              <div className="grid grid-cols-2 gap-2.5">
                <div className="h-11 rounded-xl bg-zinc-100 animate-pulse" />
                <div className="h-11 rounded-xl bg-zinc-100 animate-pulse" />
              </div>
            </div>
          </div>
        )}
        
        {mounted && (
          <div className="mb-4">
            <ExpressCheckoutElement 
              onReady={() => console.log('Express Checkout ready')} 
              onClick={(e: any) => {
                if (!agreedToTerms) {
                  triggerTermsError();
                  e?.reject?.();
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
                await handleStripeSubmit({ preventDefault: () => {} } as any, event);
              }}
            />
          </div>
        )}
        <PaymentElement onReady={() => setMessage(null)} />
      </div>
      
      {message && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-bold border border-red-100">{message}</div>}

      {showNonEuCustomsNote && (
        <div className="mx-4 p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200/80 text-[11px] text-amber-950 font-medium leading-relaxed">
          <span className="font-black uppercase tracking-wider text-[10px] text-amber-800 block mb-0.5">
            {locale === 'ro' ? 'Notă vamală (Livrare Non-UE)' : 'Non-EU Customs & Import Notice'}
          </span>
          {locale === 'ro'
            ? 'Pentru livrările în afara Uniunii Europene, eventualele taxe vamale, TVA/GST de import sau comisioane de vămuire din țara de destinație sunt suportate de destinatar la livrare.'
            : 'For shipments outside the European Union, local customs duties, import VAT/GST, or courier clearance fees (if applicable) are payable by the recipient upon delivery.'}
        </div>
      )}
      
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
        <Button type="button" variant="outline" onClick={handleBack} disabled={loading} className="flex-1 h-14 rounded-2xl font-bold uppercase tracking-widest text-[10px] active:scale-[0.98] transition-all cursor-pointer">{t('back')}</Button>
        <Button 
          onClick={handleStripeSubmit} 
          disabled={loading || isUpdatingPaymentInfo || !stripe || !elements} 
          className="relative flex-[1.5] h-14 rounded-2xl font-black uppercase tracking-wider text-xs overflow-hidden transition-all shadow-lg hover:shadow-xl active:scale-[0.98] bg-[#e32f8c] hover:bg-black text-black hover:text-white disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>{t('processing')}</span>
            </span>
          ) : (
            t('pay_now')
          )}
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
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, []);

  const sortedOptions = useMemo(() => {
    return [...options].sort((a, b) => a.label.localeCompare(b.label, locale === 'en' ? 'en' : 'ro', { sensitivity: 'base' }));
  }, [options, locale]);

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
              className="absolute z-[100] w-full mt-2 bg-white border border-zinc-100 rounded-2xl shadow-2xl overflow-hidden max-h-[min(18rem,45dvh)] overflow-y-auto premium-scrollbar"
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
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener("pointerdown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const sortedOptions = useMemo(() => {
    return [...options].sort((a, b) => a.label.localeCompare(b.label, locale === 'en' ? 'en' : 'ro', { sensitivity: 'base' }));
  }, [options, locale]);

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
            className="absolute left-0 bottom-full mb-2 w-[min(15rem,calc(100vw-3rem))] bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden z-[110] max-h-[min(16rem,45dvh)] overflow-y-auto premium-scrollbar"
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
  items,
  currency,
  csrfToken,
  t
}: any) => {
  const stripe = useStripe();
  const elements = useElements();
  const { appliedCoupon } = useCartStore();
  const { country: storeCountry, priorityProcessing, giftPackaging } = useCheckoutStore();
  const shippingConfig = useShippingConfig();
  const [expressReady, setExpressReady] = useState(false);
  const [hasWallets, setHasWallets] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const initialExpressCountry = (storeCountry && ALLOWED_SHIPPING_COUNTRIES.includes(storeCountry) ? storeCountry : 'RO').toUpperCase();
  const selectedCountryRef = useRef<string>(initialExpressCountry);
  const pendingSyncRef = useRef<Promise<void> | null>(null);
  const submittingExpressRef = useRef<boolean>(false);

  const mapSerializedItems = (sourceItems: any[]) =>
    (sourceItems || []).map((item: any) => ({
      id: item.id,
      slug: item.slug,
      quantity: item.quantity,
      price: item.price,
      name: item.name,
      is_digital: Boolean(item.is_digital || item?.specs_summary?.is_digital),
      specs_summary: item.specs_summary,
      selectedVariant: item.selectedVariant || (item.variant ? { name: item.variant } : null),
      stock_status: item.stock_status || item.selectedVariant?.stock_status,
      image: item.image
    }));

  const buildStep1Details = (targetCountry: string) => {
    const normalizedCountry = (targetCountry || 'RO').toUpperCase();
    const calculationItems: CartItem[] = (items || []).map((item: any) => ({
      id: item.id,
      slug: item.slug,
      name: item.name,
      quantity: Math.max(1, Number(item.quantity) || 1),
      price: item.price,
      is_digital: Boolean(item.is_digital || item?.specs_summary?.is_digital),
      specs_summary: item.specs_summary,
      weight: isDigitalProgramItem(item) ? 0 : (Number(item.weight) > 0 ? Number(item.weight) : 0.2),
    }));

    const calc = calculateOrderTotal(
      calculationItems,
      currency || 'RON',
      normalizedCountry,
      'hd',
      appliedCoupon,
      undefined,
      {
        priority_processing: priorityProcessing,
        gift_packaging: giftPackaging,
        payment_method: 'online',
        free_shipping_ro_ron: shippingConfig.free_shipping_ro_ron,
        free_shipping_intl_eur: shippingConfig.free_shipping_intl_eur,
      }
    );

    const lineItems: any[] = [
      { name: locale === 'ro' ? 'Produse' : 'Items', amount: calc.subtotal }
    ];

    if (calc.bundleDiscount > 0) {
      lineItems.push({
        name: locale === 'ro' ? `Reducere pachet (${calc.bundlePercent}%)` : `Bundle discount (${calc.bundlePercent}%)`,
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

    const optionsCost = calc.optionsCost || 0;
    if (optionsCost > 0) {
      lineItems.push({
        name: locale === 'ro' ? 'Procesare prioritară / Ambalaj cadou' : 'Priority / Gift options',
        amount: optionsCost
      });
    }

    // Reconcile lineItems sum with total so Apple Pay / Google Pay never reject min-amount clamping
    const targetNonShipping = calc.total - calc.shippingCost;
    const currentLineItemsSum = lineItems.reduce((sum, li) => sum + Number(li.amount || 0), 0);
    const delta = targetNonShipping - currentLineItemsSum;
    if (delta !== 0) {
      lineItems.push({
        name: locale === 'ro' ? 'Ajustare minim comandă' : 'Minimum order adjustment',
        amount: delta
      });
    }

    const shippingLabel = calc.shippingCost === 0
      ? (locale === 'ro' ? 'Livrare gratuită' : 'Free shipping')
      : (normalizedCountry === 'RO'
          ? (locale === 'ro' ? 'Sameday Standard (1-3 Zile)' : 'Sameday Standard (1-3 Days)')
          : (locale === 'ro' ? 'Livrare Standard / Internațională' : 'Standard International Shipping'));

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

    return { calc, lineItems, shippingRates };
  };

  const syncCountryShippingToPI = async (targetCountry: string) => {
    if (!clientSecret || !elements) return;
    const countryCode = (targetCountry || 'RO').toUpperCase();
    const piId = clientSecret.split('_secret')[0];
    const defaultCarrierId = COUNTRY_SERVICES[countryCode]?.hd?.[0]?.id || COUNTRY_SERVICES['DEFAULT']?.hd?.[0]?.id || (countryCode === 'RO' ? '7' : '106');
    try {
      const res = await fetch("/api/checkout/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken || ""
        },
        body: JSON.stringify({
          paymentIntentId: piId,
          clientSecret,
          country: countryCode,
          shipping_type: 'hd',
          carrier_id: defaultCarrierId,
          currency: currency || 'RON',
          couponCode: appliedCoupon?.code?.trim()?.toUpperCase() || null,
          priority_processing: priorityProcessing,
          gift_packaging: giftPackaging,
          locale: locale || 'ro',
          items: mapSerializedItems(items || []),
          payment_method: 'online',
          isFinalSync: false
        })
      });
      if (res.ok && typeof elements.fetchUpdates === 'function') {
        await elements.fetchUpdates();
      }
    } catch (err) {
      console.warn("Step1ExpressCheckout background country sync warning:", err);
    }
  };

  const itemsSignature = useMemo(
    () => (items || []).map((i: any) => `${i.id}:${i.quantity}:${i.selectedVariant?.name || ''}`).join('|'),
    [items]
  );

  // Pre-sync PI whenever items, coupon or addons change while user is on Step 1
  useEffect(() => {
    if (!clientSecret || !elements) return;
    syncCountryShippingToPI(selectedCountryRef.current || initialExpressCountry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedCoupon?.code, priorityProcessing, giftPackaging, itemsSignature, clientSecret]);

  const handleExpressClick = (event: any) => {
    setErrorMsg(null);
    const country = selectedCountryRef.current || 'RO';
    const { lineItems, shippingRates } = buildStep1Details(country);
    // Keep server PaymentIntent aligned with Express 'hd' + 'online' without blocking synchronous event.resolve
    pendingSyncRef.current = syncCountryShippingToPI(country);
    event.resolve({
      lineItems,
      shippingRates
    });
  };

  const handleShippingAddressChange = (event: any) => {
    try {
      const addr = event.address || event.shippingAddress || {};
      const country = (addr.country || 'RO').toUpperCase();
      selectedCountryRef.current = country;

      const { shippingRates, lineItems } = buildStep1Details(country);
      pendingSyncRef.current = syncCountryShippingToPI(country);

      event.resolve({
        shippingRates,
        lineItems
      });
    } catch (err) {
      console.error("Step1ExpressCheckout shipping address change error:", err);
      // Must include lineItems in resolve to avoid infinite loading in Stripe Express Checkout
      const { shippingRates, lineItems } = buildStep1Details(selectedCountryRef.current || 'RO');
      event.resolve({ shippingRates, lineItems });
    }
  };

  const handleShippingRateChange = (event: any) => {
    try {
      const { lineItems } = buildStep1Details(selectedCountryRef.current || 'RO');
      event.resolve({ lineItems });
    } catch (err) {
      console.error("Step1ExpressCheckout shipping rate change error:", err);
      event.resolve({ lineItems: buildStep1Details(selectedCountryRef.current || 'RO').lineItems.slice(0, 1) });
    }
  };

  const handleConfirm = async (event: any) => {
    if (!stripe || !elements || submittingExpressRef.current) return;
    submittingExpressRef.current = true;
    try {
      if (pendingSyncRef.current) {
        await pendingSyncRef.current.catch(() => {});
      }

      // Mandatory final metadata + checkout_sessions backup sync BEFORE elements.submit()
      const walletShipping = event?.shippingAddress;
      const walletBilling = event?.billingDetails;
      const walletEmail = walletBilling?.email || event?.payerEmail || '';
      const walletName = walletShipping?.name || walletBilling?.name || '';
      const walletPhone = walletShipping?.phone || walletBilling?.phone || event?.payerPhone || event?.phone || '';
      const walletAddr = walletShipping?.address;

      const piId = clientSecret.split('_secret')[0];
      const nameParts = walletName.trim().split(/\s+/).filter(Boolean);
      const fName = nameParts[0] || '';
      const lName = nameParts.slice(1).join(' ') || '-';
      const countryCode = (walletAddr?.country || walletShipping?.country || selectedCountryRef.current || 'RO').toUpperCase();
      const defaultCarrierId = COUNTRY_SERVICES[countryCode]?.hd?.[0]?.id || COUNTRY_SERVICES['DEFAULT']?.hd?.[0]?.id || (countryCode === 'RO' ? '7' : '106');

      const syncRes = await fetch("/api/checkout/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken || ""
        },
        body: JSON.stringify({
          paymentIntentId: piId,
          clientSecret,
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
          priority_processing: priorityProcessing,
          gift_packaging: giftPackaging,
          locale: locale || 'ro',
          items: mapSerializedItems(items || []),
          payment_method: 'online',
          isFinalSync: true
        })
      });

      if (!syncRes.ok) {
        const errPayload = await syncRes.json().catch(() => null);
        const errMsg = errPayload?.error || (locale === 'en'
          ? 'Failed to synchronize order details before payment. Please try again.'
          : 'Sincronizarea datelor comenzii înainte de plată a eșuat. Te rugăm să reîncerci.');
        event?.paymentFailed?.({ reason: 'fail', message: errMsg });
        setErrorMsg(errMsg);
        return;
      }

      if (typeof elements.fetchUpdates === 'function') {
        await elements.fetchUpdates();
      }

      const { error: submitError } = await elements.submit();
      if (submitError) {
        event?.paymentFailed?.({ reason: 'fail', message: submitError.message });
        setErrorMsg(submitError.message || t('payment_error'));
        return;
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/${locale}/checkout/success`,
        },
        redirect: 'if_required',
      });
      if (error) {
        event?.paymentFailed?.({ reason: 'fail', message: error.message });
        setErrorMsg(error.message || t('payment_error'));
      } else {
        const resolvedPiId = paymentIntent?.id || piId;
        window.location.href = `${window.location.origin}/${locale}/checkout/success?payment_intent=${resolvedPiId}&payment_intent_client_secret=${encodeURIComponent(clientSecret)}&redirect_status=${paymentIntent?.status || 'succeeded'}`;
      }
    } catch (err: any) {
      event?.paymentFailed?.({ reason: 'fail', message: err.message });
      setErrorMsg(err.message || "Eroare de sistem.");
    } finally {
      submittingExpressRef.current = false;
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
              allowedShippingCountries: EXPRESS_ALLOWED_COUNTRIES,
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
            onClick={handleExpressClick}
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
  const { items, addItem, removeItem, appliedCoupon, getTotals } = useCartStore();
  const { currency } = useRegionStore();
  const shippingConfig = useShippingConfig();
  const [step3ProgLang, setStep3ProgLang] = useState<DigitalProgramLanguage>(
    locale === "en" ? "en" : "ro"
  );

  useEffect(() => {
    setStep3ProgLang(locale === "en" ? "en" : "ro");
  }, [locale]);

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
  const submittingCodRef = useRef(false);
  const [isUpdatingPaymentInfo, setIsUpdatingPaymentInfo] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToMarketing, setAgreedToMarketing] = useState(false);
  const [animateTerms, setAnimateTerms] = useState(false);
  const [isSamedayLockerOpen, setIsSamedayLockerOpen] = useState(false);
  const [lockersEnabled, setLockersEnabled] = useState(false);
  const [liveCatalog, setLiveCatalog] = useState<any[]>([]);
  // Incremented each time we update Stripe's PaymentIntent amount, to trigger fetchUpdates in StripePaymentSection
  const [stripeSyncTrigger, setStripeSyncTrigger] = useState(0);

  useEffect(() => {
    let active = true;
    fetch("/api/shipping-config")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.config) {
          setLockersEnabled(data.config.lockers_enabled === true);
        }
      })
      .catch(() => {});
    fetch("/api/products")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && Array.isArray(data?.products)) {
          setLiveCatalog(data.products);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const lockersAllowed = lockersEnabled && country === "RO";

  const digitalOnlyCart = useMemo(() => isDigitalOnlyCart(items), [items]);
  const hasDigitalItems = useMemo(() => hasAnyDigitalProgram(items), [items]);
  const hasPreorderItems = useMemo(() => items.some(item => !isDigitalProgramItem(item) && isPreorder(item, item.selectedVariant)), [items]);
  const hasNormalItems = useMemo(() => items.some(item => !isDigitalProgramItem(item) && !isPreorder(item, item.selectedVariant)), [items]);
  const isMixedCart = hasPreorderItems && hasNormalItems;

  useEffect(() => {
    if (!isStripeDisabled && (hasPreorderItems || hasDigitalItems) && paymentMethod === 'cod') {
      setPaymentMethod('online');
    }
  }, [hasPreorderItems, hasDigitalItems, paymentMethod, setPaymentMethod, isStripeDisabled]);

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

  const [errors, setErrors] = useState<{ email?: boolean; address?: boolean; phone?: boolean; name?: boolean; firstName?: boolean; lastName?: boolean; city?: boolean; state?: boolean; postalCode?: boolean }>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      const effectiveShippingType = !lockersAllowed && shippingType === 'pudo' ? 'hd' : shippingType;
      window.dispatchEvent(new CustomEvent('checkout-shipping-change', { detail: { country, shippingType: effectiveShippingType, serviceId: selectedServiceId, step: currentStep } }));
    }
  }, [country, shippingType, selectedServiceId, currentStep, lockersAllowed]);

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
    const isPostalCodeValid = country === 'RO' || postalCode.trim().length >= 3;

    setIsStep1Valid(!!(isEmailValid && isFirstNameValid && isLastNameValid && isAddressValid && isCityValid && isPhoneValid && isStateValid && isPostalCodeValid));

    const availableForCountry = getShippingServices(country, shippingType, { lockersEnabled: lockersAllowed });
    const isServiceValidForCountry = availableForCountry.some(s => s.id === selectedServiceId);
    const isStep2Valid = !!selectedServiceId && isServiceValidForCountry && (shippingType === 'hd' || (lockersAllowed && shippingType === 'pudo' && !!selectedBranches[selectedServiceId]));
    setIsStep2Valid(isStep2Valid);
  }, [email, firstName, lastName, line1, city, phone, state, postalCode, country, selectedServiceId, shippingType, selectedBranches, lockersAllowed, setIsStep1Valid, setIsStep2Valid]);

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
    if (!isStripeDisabled && country !== 'RO' && paymentMethod === 'cod') {
      setPaymentMethod('online');
    }
    if (!lockersAllowed && isSamedayLockerOpen) {
      setIsSamedayLockerOpen(false);
    }
    if (!lockersAllowed && shippingType === 'pudo') {
      setShippingType('hd');
    }
    const effectiveType = !lockersAllowed ? 'hd' : shippingType;
    const validServices = getShippingServices(country, effectiveType, { lockersEnabled: lockersAllowed });
    if (!validServices.some(s => s.id === selectedServiceId)) {
      if (effectiveType === 'hd' && validServices.length > 0) {
        setSelectedServiceId(validServices[0].id);
      } else {
        setSelectedServiceId('');
      }
    }
  }, [country, paymentMethod, setPaymentMethod, shippingType, setShippingType, selectedServiceId, setSelectedServiceId, isStripeDisabled, lockersAllowed, isSamedayLockerOpen]);

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
          const normAdmin = normalizeRoText(adminArea);
          const mappedAdmin = normAdmin.includes('bucharest') ? 'bucuresti' : normAdmin;
          const matchedCounty = COUNTIES_LIST.find(c => {
            const normC = normalizeRoText(c);
            return mappedAdmin.includes(normC) || normC.includes(mappedAdmin);
          });
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
      componentRestrictions: { country: toStripeIsoCountryCode(country).toLowerCase() },
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
      if (digitalOnlyCart && currentStep === 4) {
        setCurrentStep(1);
      } else {
        setCurrentStep(currentStep - 1);
      }
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
  // selects online payment so Stripe & Express wallets match the final order total
  const syncStripePaymentMethod = async (method: 'online' | 'cod') => {
    if (!clientSecret || method === 'cod') return;
    const paymentIntentId = clientSecret.split('_secret_')[0];
    if (!paymentIntentId) return;
    try {
      setIsUpdatingPaymentInfo(true);
      const effectiveType = digitalOnlyCart ? 'hd' : (lockersAllowed ? shippingType : 'hd');
      const res = await fetch("/api/checkout/update", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken || "",
        },
        body: JSON.stringify({
          paymentIntentId,
          clientSecret,
          shipping_type: effectiveType,
          carrier_id: digitalOnlyCart ? 'digital' : selectedServiceId,
          branch_id: !digitalOnlyCart && lockersAllowed ? (selectedBranches[selectedServiceId]?.id || "") : "",
          branch_name: !digitalOnlyCart && lockersAllowed ? (selectedBranches[selectedServiceId]?.name || "") : "",
          payment_method: method,
          firstName, lastName, email,
          phone: formatPhoneWithPrefix(phone, phoneCountry),
          line1, line2, city, state, postal_code: postalCode, country,
          currency,
          couponCode: appliedCoupon?.code?.trim()?.toUpperCase(),
          priority_processing: priorityProcessing,
          gift_packaging: giftPackaging,
          gift_message: giftMessage,
          locale: locale || 'ro',
          items: items.map(i => ({ id: i.id, slug: i.slug, name: i.name, quantity: i.quantity, price: i.price, image: i.image, is_digital: Boolean(i.is_digital || (i as any)?.specs_summary?.is_digital), specs_summary: (i as any).specs_summary, selectedVariant: i.selectedVariant || null, stock_status: i.stock_status || i.selectedVariant?.stock_status })),
          isFinalSync: false
        }),
      });
      if (res.ok) {
        setStripeSyncTrigger(prev => prev + 1);
      }
    } catch (err) {
      console.warn("syncStripePaymentMethod error:", err);
    } finally {
      setIsUpdatingPaymentInfo(false);
    }
  };

  const prevStepRef = useRef(currentStep);
  const lastSyncedClientSecretRef = useRef<string | null>(null);
  useEffect(() => {
    const prevStep = prevStepRef.current;
    prevStepRef.current = currentStep;
    const needsSyncForNewSecret = currentStep === 4 && clientSecret && lastSyncedClientSecretRef.current !== clientSecret;
    if (currentStep === 4 && (prevStep !== 4 || needsSyncForNewSecret) && clientSecret && !isStripeDisabled) {
      const effectiveMethod = country !== 'RO' || hasPreorderItems || hasDigitalItems ? 'online' : paymentMethod;
      if (effectiveMethod !== paymentMethod) {
        setPaymentMethod(effectiveMethod);
      }
      lastSyncedClientSecretRef.current = clientSecret;
      syncStripePaymentMethod(effectiveMethod);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, clientSecret, isStripeDisabled]);

  const mainItemsSignature = useMemo(
    () => (items || []).map((i: any) => `${i.id}:${i.quantity}:${i.selectedVariant?.name || ''}`).join('|'),
    [items]
  );
  const prevCouponRef = useRef(appliedCoupon?.code);
  const prevItemsSigRef = useRef(mainItemsSignature);
  useEffect(() => {
    const couponChanged = prevCouponRef.current !== appliedCoupon?.code;
    const itemsChanged = prevItemsSigRef.current !== mainItemsSignature;
    if (couponChanged || itemsChanged) {
      prevCouponRef.current = appliedCoupon?.code;
      prevItemsSigRef.current = mainItemsSignature;
      if (currentStep === 4 && clientSecret && !isStripeDisabled) {
        syncStripePaymentMethod(paymentMethod);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedCoupon?.code, mainItemsSignature]);

  // 🚀 FINAL SYNC: Force a metadata update before actual payment confirmation
  // We define it in the main component to have access to all state
  const forceMetadataUpdate = async () => {
    try {
      if (!clientSecret) {
        throw new Error(
          locale === 'en'
            ? "Payment session is not initialized. Please refresh the page."
            : "Sesiunea de plată nu este inițializată. Te rugăm să reîmprospătezi pagina."
        );
      }
      
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
          clientSecret,
          items: items.map(item => ({ id: item.id, slug: item.slug, quantity: item.quantity, price: item.price, name: item.name, is_digital: Boolean(item.is_digital || (item as any)?.specs_summary?.is_digital), specs_summary: (item as any).specs_summary, selectedVariant: item.selectedVariant || null, stock_status: item.stock_status || item.selectedVariant?.stock_status, image: item.image })),
          couponCode: appliedCoupon?.code?.trim()?.toUpperCase(),
          shipping_type: digitalOnlyCart ? 'hd' : (lockersAllowed ? shippingType : 'hd'),
          carrier_id: digitalOnlyCart ? 'digital' : selectedServiceId,
          branch_id: !digitalOnlyCart && lockersAllowed ? (selectedBranches[selectedServiceId]?.id || "") : "",
          branch_name: !digitalOnlyCart && lockersAllowed ? (selectedBranches[selectedServiceId]?.name || "") : "",
          payment_method: "online",
          email, firstName, lastName,
          phone: formatPhoneWithPrefix(phone, phoneCountry),
          line1, line2, city, state, postal_code: postalCode, country,
          currency,
          locale: locale || 'ro',
          priority_processing: priorityProcessing,
          gift_packaging: giftPackaging,
          gift_message: giftMessage,
          isFinalSync: true // 🛡️ Bypass rate limits for this critical call
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        const errMsg = errJson?.error || (locale === 'ro'
          ? "Sincronizarea datelor a eșuat. Verifică conexiunea."
          : "Data synchronization failed. Please check your connection.");
        console.error("❌ Final Sync Failed:", errMsg);
        throw new Error(errMsg);
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
      const targetCur = currency || 'RON';
      const cartItemsPayload = items.map(item => {
        const isBundle = String(item.id).includes('-bundle-') || (item.name && String(item.name).toLowerCase().includes('pachet'));
        const effectiveImage = isBundle 
          ? '/images/products/x10_elbow_wraps_purple.webp' 
          : (item.selectedVariant?.image || (typeof item.image === 'string' && !item.image.includes('bundle') ? item.image : getSingleFlavorImage(item.selectedVariant?.name || item.name)));
        return {
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: getProductPrice(item.price, targetCur),
          image: effectiveImage,
          selectedVariant: item.selectedVariant || null
        };
      });

      const totalAmount = cartItemsPayload.reduce((acc, item) => acc + item.price * item.quantity, 0);

      await trackCheckoutSession({
        paymentIntentId,
        email: email.trim(),
        firstName: firstName?.trim() || "",
        lastName: lastName?.trim() || "",
        phone: formatPhoneWithPrefix(phone, phoneCountry),
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
      const isPostalCodeValid = country === 'RO' || postalCode.trim().length >= 3;

      const newErrors = {
        email: !isEmailValid,
        firstName: !isFirstNameValid,
        lastName: !isLastNameValid,
        name: !isFirstNameValid || !isLastNameValid,
        address: !isAddressValid,
        city: !isCityValid,
        phone: !isPhoneValid,
        state: !isStateValid,
        postalCode: !isPostalCodeValid
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

      if (digitalOnlyCart) {
        setPaymentMethod('online');
        setCurrentStep(4);
      } else {
        setCurrentStep(2);
      }
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
                clientSecret,
                shipping_type: shippingType,
                carrier_id: selectedServiceId,
                branch_id: selectedBranches[selectedServiceId]?.id || "",
                branch_name: selectedBranches[selectedServiceId]?.name || "",
                payment_method: "online",
                firstName, lastName, email,
                phone: formatPhoneWithPrefix(phone, phoneCountry),
                line1, line2, city, state, postal_code: postalCode, country,
                currency,
                locale: locale || 'ro',
                couponCode: appliedCoupon?.code?.trim()?.toUpperCase(),
                priority_processing: priorityProcessing,
                gift_packaging: giftPackaging,
                gift_message: giftMessage,
                items: items.map(i => ({ id: i.id, slug: i.slug, name: i.name, quantity: i.quantity, price: i.price, image: i.image, is_digital: Boolean(i.is_digital || (i as any)?.specs_summary?.is_digital), specs_summary: (i as any).specs_summary, selectedVariant: i.selectedVariant, stock_status: i.stock_status || i.selectedVariant?.stock_status }))
              }),
            });

            if (!res.ok) {
              const errorData = await res.json().catch(() => ({}));
              console.error("❌ Background Update Failed:", errorData);
              setMessage(errorData.error || t('payment_update_error'));
            } else {
              setStripeSyncTrigger(prev => prev + 1);
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

    if (submittingCodRef.current) return;

    if (hasDigitalItems) {
      setMessage(locale === 'ro'
        ? 'Comenzile care includ programe digitale se achită exclusiv online cu cardul.'
        : 'Orders containing digital programs require online card payment.');
      setPaymentMethod('online');
      return;
    }

    if (country !== 'RO') {
      setMessage(locale === 'ro'
        ? 'Plata ramburs la livrare este disponibilă exclusiv în România.'
        : 'Cash on delivery is only available in Romania.');
      return;
    }

    if (shippingType === 'pudo' && !selectedBranches[selectedServiceId]?.id) {
      setMessage(t('choose_pickup'));
      setCurrentStep(2);
      return;
    }

    submittingCodRef.current = true;
    setLoading(true);

    try {
      const res = await fetch("/api/checkout/cod", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken || "",
        },
        body: JSON.stringify({
          email, firstName, lastName,
          phone: formatPhoneWithPrefix(phone, phoneCountry),
          line1, line2, city, state, postal_code: postalCode, country,
          shipping_type: shippingType,
          carrier_id: selectedServiceId,
          branch_id: selectedBranches[selectedServiceId]?.id || "",
          branch_name: selectedBranches[selectedServiceId]?.name || "",
          items: items.map(i => {
            const isDigital = isDigitalProgramItem(i);
            const isBundle = !isDigital && (String(i.id).includes('-bundle-') || (i.name && String(i.name).toLowerCase().includes('pachet')));
            const effectiveImage = isDigital
              ? (i.image || i.selectedVariant?.image || '/images/products/program_complete_trio_v2.webp')
              : isBundle
                ? '/images/products/x10_elbow_wraps_purple.webp'
                : (i.selectedVariant?.image || (typeof i.image === 'string' && !i.image.includes('bundle') ? i.image : getSingleFlavorImage(i.selectedVariant?.name || i.name)));
            return { id: i.id, slug: i.slug, name: i.name, quantity: i.quantity, price: i.price, image: effectiveImage, is_digital: isDigital, specs_summary: (i as any).specs_summary, selectedVariant: i.selectedVariant, stock_status: i.stock_status || i.selectedVariant?.stock_status };
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
        router.push(`/checkout/success?type=cod&order_id=${data.orderId}`);
        return;
      } else {
        const errData = await res.json().catch(() => ({}));
        setMessage(errData.error || t('error_processing'));
        submittingCodRef.current = false;
        setLoading(false);
      }
    } catch (err) {
      setMessage(`${locale === 'ro' ? 'Eroare Sistem' : 'System Error'}: ${err instanceof Error ? err.message : t('error_processing')}`);
      submittingCodRef.current = false;
      setLoading(false);
    }
    return;
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
                  items: items.filter(i => isDigitalProgramItem(i) || isPreorder(i, i.selectedVariant))
                });
              }}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-all active:scale-[0.98] cursor-pointer"
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
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all active:scale-[0.98] cursor-pointer"
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
              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#e32f8c] italic">{t('step_label', { current: 1, total: 4 })}</span>
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
                  placeholder={locale === 'en' ? 'alex@example.com' : 'alex@exemplu.ro'}
                  className={cn(
                    "rounded-2xl h-14 bg-zinc-100/50 border-2 border-transparent focus:bg-white focus:border-[#e32f8c] focus:ring-4 focus:ring-[#e32f8c]/10 transition-all duration-300 border-zinc-100 focus:bg-white",
                    errors.email && "!border-red-500 !ring-2 !ring-red-100"
                  )}
                />
                <p className="text-[9px] text-zinc-400 font-bold leading-normal px-2 mt-1 select-none flex items-center gap-1">
                  <Lock className="w-3 h-3 shrink-0 text-zinc-400" />
                  <span>{t('abandoned_cart_disclosure')}</span>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">
                    {t('first_name')} <span className="text-red-500 font-black">*</span>
                  </Label>
                  <Input 
                    value={firstName} 
                    onChange={(e) => setFirstName(e.target.value)} 
                    placeholder={locale === 'en' ? 'Alex' : 'Eduard'} 
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
                    placeholder={locale === 'en' ? 'Smith' : 'Donea'} 
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
                  label: locale === 'en' ? COUNTRY_DATA[code].nameEn : COUNTRY_DATA[code].name,
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">
                    {t('city_label')} <span className="text-red-500 font-black">*</span>
                  </Label>
                  <Input 
                    value={city} 
                    onChange={(e) => setCity(e.target.value)} 
                    placeholder={country === 'RO' ? (locale === 'ro' ? 'București' : 'Bucharest') : (locale === 'ro' ? 'Oraș' : 'City')} 
                    className={cn(
                      "rounded-2xl h-14 bg-zinc-100/50 border-2 border-transparent focus:bg-white focus:border-[#e32f8c] focus:ring-4 focus:ring-[#e32f8c]/10 transition-all duration-300",
                      errors.city && "!border-red-500 !ring-2 !ring-red-100"
                    )} 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">
                    {t('postal_code_label')} {country === 'RO' ? <span className="text-zinc-400 font-normal text-[9px] lowercase">({locale === 'ro' ? 'opțional' : 'optional'})</span> : <span className="text-red-500 font-black">*</span>}
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
                    className={cn(
                      "rounded-2xl h-14 bg-zinc-100/50 border-2 border-transparent focus:bg-white focus:border-[#e32f8c] focus:ring-4 focus:ring-[#e32f8c]/10 transition-all duration-300",
                      errors.postalCode && "!border-red-500 !ring-2 !ring-red-100"
                    )} 
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
                    placeholder={COUNTRY_DATA[phoneCountry]?.placeholder || COUNTRY_DATA.RO.placeholder}
                    className="flex-1 px-4 bg-transparent text-xs font-bold outline-none rounded-r-2xl"
                  />
                </div>
              </div>
            </div>

            {message && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-bold border border-red-100">{message}</div>}

            <Button type="submit" className="w-full bg-[#e32f8c] hover:bg-black text-black hover:text-white h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-[0.98] shadow-lg hover:shadow-xl cursor-pointer">
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
                const physicalItems = items.filter(i => !isDigitalProgramItem(i));
                const parcelSource = physicalItems.length > 0 ? physicalItems : items;
                const totalWeight = parcelSource.reduce((acc, item) => acc + getEffectiveItemWeight(item), 0);
                const maxL = Math.max(100, ...parcelSource.map(i => i.length_mm || 150));
                const maxW = Math.max(70, ...parcelSource.map(i => i.width_mm || 100));

                // Smart Stacking: Max height of largest item + 25% height of others (assuming nesting)
                const tallestItem = Math.max(20, ...parcelSource.map(i => i.height_mm || 50));
                const otherHeights = parcelSource.reduce((acc, i) => acc + (i.height_mm || 50) * i.quantity, 0) - tallestItem;
                const sumH = Math.max(20, tallestItem + (otherHeights * 0.25));

                const sumLWH = maxL + maxW + sumH;
                const maxSide = Math.max(maxL, maxW, sumH);

                // Threshold logic (must match cart-calculations.ts & OrderSummary)
                const step2Currency = (paymentMethod === 'cod' || isStripeDisabled) ? 'RON' : currency;
                const { subtotal, discount, couponDiscount, shippingDiscount } = getTotals(step2Currency);
                const freeShippingThreshold = getFreeShippingThreshold(country, step2Currency, shippingConfig);

                const thresholdBase = Number((subtotal - discount - couponDiscount).toFixed(2));
                const thresholdReached = thresholdBase >= freeShippingThreshold;
                const isFreeShipping = shippingDiscount || thresholdReached;

                const metrics: ParcelMetrics = {
                  weight: totalWeight,
                  length: maxL,
                  width: maxW,
                  height: sumH,
                  maxSide,
                  sumLWH
                };

                const hdServices = getShippingServices(country, 'hd').filter(s => isServiceAvailable(s, country, metrics));
                // Lockerele (Easybox / PUDO) sunt controlate din admin (/admin/shipping) și sunt dezactivate implicit în toate țările
                const pudoServices = lockersAllowed
                  ? getShippingServices(country, 'pudo', { lockersEnabled: true }).filter(s => isServiceAvailable(s, country, metrics))
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
                            {isFreeShipping || getShippingCost(country, 'hd', totalWeight, step2Currency, service.id) === 0
                              ? <span className="text-green-600">{t('free')}</span>
                              : formatPrice(getShippingCost(country, 'hd', totalWeight, step2Currency, service.id), step2Currency)}
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
                                        {locale === 'en' ? 'Change' : 'Schimbă'}
                                      </button>
                                    </div>
                                  ) : (
                                    <button 
                                      type="button"
                                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsSamedayLockerOpen(true); }}
                                      className="mt-2 w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm cursor-pointer"
                                    >
                                      {locale === 'en' ? 'Select Easybox on Map' : 'Alege Easybox de pe Hartă'}
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <p className="text-[9px] font-bold text-zinc-400 uppercase mt-0.5">{selectedBranches[service.id]?.name || t('choose_pickup')}</p>
                              )}
                            </div>
                          </div>
                          <span className="font-black text-sm">
                            {isFreeShipping || getShippingCost(country, 'pudo', totalWeight, step2Currency, service.id) === 0
                              ? <span className="text-green-600">{t('free')}</span>
                              : formatPrice(getShippingCost(country, 'pudo', totalWeight, step2Currency, service.id), step2Currency)}
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
              <Button type="button" variant="outline" onClick={handleBack} className="flex-1 h-14 rounded-2xl font-bold uppercase tracking-widest text-[10px] active:scale-[0.98] transition-all cursor-pointer">{t('back')}</Button>
              <Button type="submit" disabled={!selectedServiceId} className="relative flex-[1.5] bg-[#e32f8c] hover:bg-black text-black hover:text-white h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] overflow-hidden transition-all shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-50 cursor-pointer">{locale === 'en' ? 'Next Step' : 'Următorul Pas'}</Button>
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

              {/* Optional Digital Programs Add-on Card in Step 3 */}
              {(() => {
                const foodProg =
                  liveCatalog.find(
                    (p) => p.slug === PROGRAM_SLUGS.FOOD_PLAN || p.id === PROGRAM_UUIDS.FOOD_PLAN
                  ) ||
                  DIGITAL_PROGRAM_PRODUCTS.find((p) => p.slug === PROGRAM_SLUGS.FOOD_PLAN)!;
                const trainingProg =
                  liveCatalog.find(
                    (p) =>
                      p.slug === PROGRAM_SLUGS.TRAINING_PROGRAM ||
                      p.id === PROGRAM_UUIDS.TRAINING_PROGRAM
                  ) ||
                  DIGITAL_PROGRAM_PRODUCTS.find((p) => p.slug === PROGRAM_SLUGS.TRAINING_PROGRAM)!;
                const benchProg =
                  liveCatalog.find(
                    (p) =>
                      p.slug === PROGRAM_SLUGS.BENCH_PROGRAM || p.id === PROGRAM_UUIDS.BENCH_PROGRAM
                  ) ||
                  DIGITAL_PROGRAM_PRODUCTS.find((p) => p.slug === PROGRAM_SLUGS.BENCH_PROGRAM)!;
                const bundleProg =
                  liveCatalog.find(
                    (p) => p.slug === PROGRAM_SLUGS.BUNDLE || p.id === PROGRAM_UUIDS.BUNDLE
                  ) ||
                  DIGITAL_PROGRAM_PRODUCTS.find((p) => p.slug === PROGRAM_SLUGS.BUNDLE)!;

                const foodItemInCart = items.find(
                  (i) => i.id === PROGRAM_UUIDS.FOOD_PLAN || i.slug === PROGRAM_SLUGS.FOOD_PLAN
                );
                const trainingItemInCart = items.find(
                  (i) =>
                    i.id === PROGRAM_UUIDS.TRAINING_PROGRAM ||
                    i.slug === PROGRAM_SLUGS.TRAINING_PROGRAM
                );
                const benchItemInCart = items.find(
                  (i) =>
                    i.id === PROGRAM_UUIDS.BENCH_PROGRAM || i.slug === PROGRAM_SLUGS.BENCH_PROGRAM
                );
                const bundleItemInCart = items.find(
                  (i) => i.id === PROGRAM_UUIDS.BUNDLE || i.slug === PROGRAM_SLUGS.BUNDLE
                );

                const dispCur = paymentMethod === 'cod' ? 'RON' : currency;
                const toggleProg = (prog: typeof foodProg, existingItem: typeof foodItemInCart) => {
                  if (existingItem) {
                    removeItem(existingItem.id, existingItem.selectedVariant?.name);
                    return;
                  }
                  const variantName =
                    step3ProgLang === "en" ? "English" : "Română";
                  addItem(
                    prog,
                    {
                      name: variantName,
                      image: prog.image,
                      imageIndex: 0,
                      stock_status: "in_stock",
                    },
                    1,
                    { openCart: false }
                  );
                };

                return (
                  <div className="p-5 sm:p-6 rounded-3xl border-2 border-zinc-100 bg-white transition-all">
                    <div className="flex items-center justify-between gap-3 mb-3.5">
                      <div>
                        <span className="text-sm font-black uppercase tracking-widest text-black block">
                          {locale === 'ro' ? 'Programe Digitale' : 'Digital Programs'}
                        </span>
                        <p className="text-xs text-zinc-500 font-medium mt-0.5">
                          {locale === 'ro'
                            ? 'Livrare instantă pe email · Reducere automată la pachetul de 3 (-27%)'
                            : 'Instant email delivery · Automatic 3-book bundle discount (-27%)'}
                        </p>
                      </div>

                      {/* Clean Separate SVG Flag Options */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setStep3ProgLang("en")}
                          title="English"
                          className={cn(
                            "px-2.5 py-1.5 rounded-lg border transition-all flex items-center justify-center cursor-pointer",
                            step3ProgLang === "en"
                              ? "bg-white border-[#e32f8c] ring-1 ring-[#e32f8c]/50 shadow-2xs scale-105"
                              : "bg-zinc-50 border-zinc-200 opacity-60 hover:opacity-100 hover:border-zinc-300"
                          )}
                        >
                          <LanguageFlagSvg isEnglish={true} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setStep3ProgLang("ro")}
                          title="Română"
                          className={cn(
                            "px-2.5 py-1.5 rounded-lg border transition-all flex items-center justify-center cursor-pointer",
                            step3ProgLang === "ro"
                              ? "bg-white border-[#e32f8c] ring-1 ring-[#e32f8c]/50 shadow-2xs scale-105"
                              : "bg-zinc-50 border-zinc-200 opacity-60 hover:opacity-100 hover:border-zinc-300"
                          )}
                        >
                          <LanguageFlagSvg isEnglish={false} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {[
                        { prog: foodProg, inCart: foodItemInCart, label: "Food Plan" },
                        { prog: trainingProg, inCart: trainingItemInCart, label: "Training Program" },
                        { prog: benchProg, inCart: benchItemInCart, label: "Bench Program" },
                        {
                          prog: bundleProg,
                          inCart: bundleItemInCart,
                          label: locale === "ro" ? "Pachet Toate 3 (-27%)" : "All 3 Bundle (-27%)",
                        },
                      ].map(({ prog, inCart, label }) => {
                        const isAdded = Boolean(inCart);
                        const priceVal = getProductPrice(prog.price, dispCur);
                        return (
                          <button
                            key={prog.id}
                            type="button"
                            onClick={() => toggleProg(prog, inCart)}
                            className={cn(
                              "flex items-center gap-3 p-2.5 rounded-2xl border-2 text-left transition-all cursor-pointer",
                              isAdded
                                ? "border-[#e32f8c] bg-[#e32f8c]/5"
                                : "border-zinc-100 bg-zinc-50/60 hover:border-zinc-200 hover:bg-zinc-50"
                            )}
                          >
                            <div className="relative w-11 h-14 rounded-lg overflow-hidden bg-zinc-950 shrink-0 border border-black/10">
                              <Image
                                src={prog.image}
                                alt={label}
                                fill
                                sizes="48px"
                                className="object-cover"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-black uppercase tracking-tight text-black truncate">
                                {label}
                              </div>
                              <div className="text-xs font-extrabold text-zinc-700 mt-0.5">
                                +{formatPrice(priceVal, dispCur)}
                              </div>
                              <div
                                className={cn(
                                  "mt-1 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider",
                                  isAdded ? "text-[#e32f8c]" : "text-zinc-500"
                                )}
                              >
                                {isAdded ? (
                                  <>
                                    <Check className="w-3 h-3 stroke-[3]" />
                                    <span>{locale === "ro" ? "Adăugat" : "Added"}</span>
                                  </>
                                ) : (
                                  <span>{locale === "ro" ? "Adaugă" : "Add"}</span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="button" variant="outline" onClick={handleBack} className="flex-1 h-14 rounded-2xl font-bold uppercase tracking-widest text-[10px] active:scale-[0.98] transition-all cursor-pointer">{t('back')}</Button>
              <Button type="button" onClick={() => {
                // Ensure online payment method is selected (or COD if Stripe disabled in RO) before Step 4
                setPaymentMethod(country === 'RO' && isStripeDisabled ? 'cod' : 'online');
                setCurrentStep(4);
              }} className="relative flex-[1.5] bg-[#e32f8c] hover:bg-black text-black hover:text-white h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] overflow-hidden transition-all shadow-lg hover:shadow-xl active:scale-[0.98] cursor-pointer">{t('continue_to_payment')}</Button>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 items-start">
                <button
                  type="button"
                  onClick={async () => {
                    setPaymentMethod('online');
                    // Sync Stripe so Apple Pay / Google Pay shows correct total with -5 lei card discount
                    await syncStripePaymentMethod('online');
                  }}
                  className={`relative overflow-hidden flex flex-col items-center justify-center gap-3 p-5 sm:p-6 rounded-3xl border-2 transition-all active:scale-[0.98] cursor-pointer h-full ${paymentMethod === 'online' ? 'border-[#e32f8c] bg-[#e32f8c]/5' : 'border-zinc-100 bg-zinc-100 hover:bg-zinc-100'}`}
                >
                  <div className="absolute top-0 right-0 bg-[#ff007a] text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-2xl shadow-sm">
                    -{formatPrice(getProductPrice(5, currency), currency)} {locale === 'ro' ? 'REDUCERE' : 'DISCOUNT'}
                  </div>
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mt-2 ${paymentMethod === 'online' ? 'bg-[#e32f8c] text-white' : 'bg-white text-zinc-400'}`}>
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest">{t('card_payment')}</span>
                </button>
                <div className="flex flex-col gap-1.5 h-full">
                  <button
                    type="button"
                    disabled={hasPreorderItems || hasDigitalItems}
                    onClick={async () => {
                      if (hasPreorderItems || hasDigitalItems) return;
                      setPaymentMethod('cod');
                    }}
                    className={`flex-1 w-full flex flex-col items-center justify-center gap-3 p-5 sm:p-6 rounded-3xl border-2 transition-all ${paymentMethod === 'cod' ? 'border-[#e32f8c] bg-[#e32f8c]/5' : 'border-zinc-100 bg-zinc-100 hover:bg-zinc-100'} ${(hasPreorderItems || hasDigitalItems) ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98] cursor-pointer'}`}
                  >
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${paymentMethod === 'cod' ? 'bg-[#e32f8c] text-white' : 'bg-white text-zinc-400'}`}>
                      <Truck className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">{t('cod_payment')}</span>
                  </button>
                  {(hasPreorderItems || hasDigitalItems) && (
                    <span className="text-[9px] font-bold text-red-500 text-center px-1 leading-tight">
                      {hasDigitalItems
                        ? (locale === 'ro' ? '*Programele digitale se achită online' : '*Online payment required for digital programs')
                        : (locale === 'ro' ? '*Indisponibil pentru precomandă' : '*Unavailable for preorder')}
                    </span>
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
                <Button type="button" variant="outline" onClick={handleBack} disabled={loading} className="flex-1 h-14 rounded-2xl font-bold uppercase tracking-widest text-[10px] active:scale-[0.98] transition-all cursor-pointer">{t('back')}</Button>
                <Button 
                  type="submit" 
                  onClick={(e) => {
                    if (!agreedToTerms) {
                      e.preventDefault();
                      triggerTermsError();
                    }
                  }}
                  disabled={loading} 
                  className="relative flex-[1.5] h-14 rounded-2xl font-black uppercase tracking-wider text-xs overflow-hidden transition-all shadow-lg hover:shadow-xl active:scale-[0.98] bg-[#e32f8c] hover:bg-black text-black hover:text-white disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span>{t('processing')}</span>
                    </span>
                  ) : (
                    t('pay_now')
                  )}
                </Button>
              </div>
              </div>
            )}
            {message && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-bold border border-red-100">{message}</div>}

          </motion.div>
        )}
      </AnimatePresence>
      <SamedayLockerSelector 
        isOpen={lockersAllowed && isSamedayLockerOpen}
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




