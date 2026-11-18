'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut,
  Copy,
  Check,
  TrendingUp,
  ShoppingBag,
  Award,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Search,
  CreditCard,
  Layers,
  Pencil,
  Trash2,
  Loader2,
  Globe2,
  MousePointerClick,
  Link2,
  Info,
  X,
  BarChart3,
  CheckCircle2,
  Clock,
  Gift,
  Lock,
  ExternalLink,
  Coins,
} from 'lucide-react';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Link } from '@/i18n/routing';
import { affiliateLogoutAction } from '@/app/actions/affiliate-auth';
import {
  AffiliateBonusTierStatus,
  AffiliateDashboardResponse,
  AffiliateOrderHistory,
  claimAffiliateBonusVoucherAction,
  updateAffiliatePaymentDetailsAction,
  deleteAffiliatePaymentDetailsAction,
} from '@/app/actions/affiliate-dashboard';
import {
  AFFILIATE_DISPLAY_CURRENCIES,
  classifyOrderNonCountable,
  classifyAffiliateOrderPayoutStatus,
  formatMoneyInCurrency,
  normalizeDisplayCurrency,
  roundCurrency,
  type AffiliateDisplayCurrency,
} from '@/lib/affiliate-stats';
import { useRegionStore } from '@/store/useRegionStore';
import { convertFromRon, FALLBACK_RATES } from '@/utils/pricing';

interface DashboardClientProps {
  data: AffiliateDashboardResponse;
  locale: string;
  exchangeRates?: Record<string, number>;
}

type PeriodFilter = 'all' | 'today' | '7d' | '30d' | 'this_month' | 'last_month';
type ChartMetric = 'clicks_orders' | 'commission' | 'sales';

const GA4_COUNTRY_TO_ISO: Record<string, { code: string; nameRo: string; nameEn: string }> = {
  romania: { code: 'RO', nameRo: 'România', nameEn: 'Romania' },
  moldova: { code: 'MD', nameRo: 'Moldova', nameEn: 'Moldova' },
  germany: { code: 'DE', nameRo: 'Germania', nameEn: 'Germany' },
  'united kingdom': { code: 'GB', nameRo: 'Marea Britanie', nameEn: 'United Kingdom' },
  uk: { code: 'GB', nameRo: 'Marea Britanie', nameEn: 'United Kingdom' },
  france: { code: 'FR', nameRo: 'Franța', nameEn: 'France' },
  italy: { code: 'IT', nameRo: 'Italia', nameEn: 'Italy' },
  spain: { code: 'ES', nameRo: 'Spania', nameEn: 'Spain' },
  netherlands: { code: 'NL', nameRo: 'Olanda', nameEn: 'Netherlands' },
  belgium: { code: 'BE', nameRo: 'Belgia', nameEn: 'Belgium' },
  austria: { code: 'AT', nameRo: 'Austria', nameEn: 'Austria' },
  hungary: { code: 'HU', nameRo: 'Ungaria', nameEn: 'Hungary' },
  bulgaria: { code: 'BG', nameRo: 'Bulgaria', nameEn: 'Bulgaria' },
  poland: { code: 'PL', nameRo: 'Polonia', nameEn: 'Poland' },
  ireland: { code: 'IE', nameRo: 'Irlanda', nameEn: 'Ireland' },
  czechia: { code: 'CZ', nameRo: 'Cehia', nameEn: 'Czechia' },
  'czech republic': { code: 'CZ', nameRo: 'Cehia', nameEn: 'Czechia' },
  slovakia: { code: 'SK', nameRo: 'Slovacia', nameEn: 'Slovakia' },
  sweden: { code: 'SE', nameRo: 'Suedia', nameEn: 'Sweden' },
  denmark: { code: 'DK', nameRo: 'Danemarca', nameEn: 'Denmark' },
  finland: { code: 'FI', nameRo: 'Finlanda', nameEn: 'Finland' },
  norway: { code: 'NO', nameRo: 'Norvegia', nameEn: 'Norway' },
  switzerland: { code: 'CH', nameRo: 'Elveția', nameEn: 'Switzerland' },
  greece: { code: 'GR', nameRo: 'Grecia', nameEn: 'Greece' },
  portugal: { code: 'PT', nameRo: 'Portugalia', nameEn: 'Portugal' },
  'united states': { code: 'US', nameRo: 'SUA', nameEn: 'United States' },
  usa: { code: 'US', nameRo: 'SUA', nameEn: 'United States' },
  ukraine: { code: 'UA', nameRo: 'Ucraina', nameEn: 'Ukraine' },
  croatia: { code: 'HR', nameRo: 'Croația', nameEn: 'Croatia' },
  slovenia: { code: 'SI', nameRo: 'Slovenia', nameEn: 'Slovenia' },
  canada: { code: 'CA', nameRo: 'Canada', nameEn: 'Canada' },
  australia: { code: 'AU', nameRo: 'Australia', nameEn: 'Australia' },
};

const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF',
  'CLP',
  'DJF',
  'GNF',
  'HUF',
  'JPY',
  'KMF',
  'KRW',
  'MGA',
  'PYG',
  'RWF',
  'UGX',
  'VND',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
]);

function formatNativeAmount(value: unknown, currency: string, locale: 'ro' | 'en'): string {
  const code = (currency || 'RON').toUpperCase();
  const num = roundCurrency(value);
  const numberLocale = locale === 'ro' ? 'ro-RO' : 'en-US';
  if (ZERO_DECIMAL_CURRENCIES.has(code)) {
    return `${Math.round(num).toLocaleString(numberLocale)} ${code}`;
  }
  return `${num.toLocaleString(numberLocale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${code}`;
}

function localizeNonCountableReason(reason: string | null | undefined, isRo: boolean): string {
  if (reason === 'cancelled') return isRo ? 'Anulată' : 'Cancelled';
  if (reason === 'returned') return isRo ? 'Returnată / Neridicată' : 'Returned / Unclaimed';
  if (reason === 'refunded') return isRo ? 'Rambursată' : 'Refunded';
  if (reason === 'failed') return isRo ? 'Eșuată' : 'Failed';
  return isRo ? 'Neeligibilă' : 'Voided';
}

function localizePayoutNote(note: string, isRo: boolean): string {
  if (isRo) return note;
  const trimmed = note.trim();
  const map: Record<string, string> = {
    'Plată înregistrată anterior': 'Previously recorded payout',
    'Sold plătit anterior': 'Previously settled balance',
    'Plată comisioane afiliat': 'Affiliate commission payout',
    'Plată efectuată': 'Payout completed',
    'Virament bancar': 'Bank transfer',
  };
  return map[trimmed] || trimmed;
}

function localizeIbanServerError(
  rawError: string | undefined,
  isRo: boolean,
  fallbackRo: string,
  fallbackEn: string
): string {
  if (!rawError) return isRo ? fallbackRo : fallbackEn;
  if (isRo) return rawError;
  const trimmed = rawError.trim();
  const map: Record<string, string> = {
    Neautorizat: 'Unauthorized. Please sign in again.',
    'Date invalide.': 'Invalid input data.',
    'Caractere nepermise detectate.': 'Disallowed characters detected.',
    'Codul IBAN introdus nu are un format valid (ex: RO49AAAA...).':
      'The entered IBAN does not have a valid format (e.g. GB29NWBK...).',
    'Eroare la actualizarea datelor de plată.': 'Failed to update payout details.',
    'Salvarea a eșuat. Încearcă din nou.': 'Save failed. Please try again.',
    'Eroare la ștergerea datelor de plată.': 'Failed to delete payout details.',
    'Ștergerea a eșuat. Încearcă din nou.': 'Delete failed. Please try again.',
  };
  return map[trimmed] || fallbackEn;
}

function localizeBonusClaimError(errorCode: string | undefined, isRo: boolean): string {
  switch (errorCode) {
    case 'UNAUTHORIZED':
      return isRo
        ? 'Sesiunea a expirat. Te rugăm să te reconectezi.'
        : 'Session expired. Please sign in again.';
    case 'INVALID_TIER':
      return isRo ? 'Prag de bonus invalid.' : 'Invalid bonus tier.';
    case 'INACTIVE_AFFILIATE':
      return isRo
        ? 'Contul tău de afiliat nu este activ.'
        : 'Your affiliate account is not active.';
    case 'THRESHOLD_NOT_REACHED':
      return isRo
        ? 'Nu ai atins încă pragul de vânzări eligibile pentru acest bonus.'
        : 'You have not reached the eligible sales threshold for this bonus yet.';
    case 'COUPON_CREATE_FAILED':
    case 'SAVE_FAILED':
    default:
      return isRo
        ? 'Nu s-a putut crea voucherul acum. Încearcă din nou.'
        : 'Could not create voucher right now. Please try again.';
  }
}

function getBucharestIsoDate(dateInput: Date | string): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-CA', { timeZone: 'Europe/Bucharest' });
}

function getDateRangeBounds(period: PeriodFilter): { startIso: string | null; endIso: string } {
  const now = new Date();
  const todayIso = getBucharestIsoDate(now);
  const [y, m, day] = todayIso.split('-').map(Number);

  const shiftDays = (baseY: number, baseM: number, baseD: number, delta: number) => {
    const dt = new Date(Date.UTC(baseY, baseM - 1, baseD + delta, 12, 0, 0));
    return dt.toISOString().split('T')[0];
  };

  if (period === 'today') {
    return { startIso: todayIso, endIso: todayIso };
  }
  if (period === '7d') {
    return { startIso: shiftDays(y, m, day, -6), endIso: todayIso };
  }
  if (period === '30d') {
    return { startIso: shiftDays(y, m, day, -29), endIso: todayIso };
  }
  if (period === 'this_month') {
    const startIso = `${y}-${String(m).padStart(2, '0')}-01`;
    return { startIso, endIso: todayIso };
  }
  if (period === 'last_month') {
    const firstPrev = new Date(Date.UTC(y, m - 2, 1, 12, 0, 0));
    const lastPrev = new Date(Date.UTC(y, m - 1, 0, 12, 0, 0));
    return {
      startIso: firstPrev.toISOString().split('T')[0],
      endIso: lastPrev.toISOString().split('T')[0],
    };
  }
  return { startIso: null, endIso: todayIso };
}

function enumerateIsoDays(startIso: string, endIso: string, maxDays = 120): string[] {
  const start = new Date(`${startIso}T12:00:00Z`);
  const end = new Date(`${endIso}T12:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return [];
  }
  const diffDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  const effectiveStart =
    diffDays > maxDays ? new Date(end.getTime() - (maxDays - 1) * 86400000) : start;

  const days: string[] = [];
  const cur = new Date(effectiveStart.getTime());
  while (cur <= end) {
    days.push(cur.toISOString().split('T')[0]);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

/**
 * Crisp inline SVG flags for primary shipping markets + FlagCDN/ISO fallback
 * so flags never render as broken regional letters on Windows or older browsers.
 */
function CountryFlag({ code, name }: { code: string; name: string }) {
  const cc = (code || 'RO').toUpperCase().slice(0, 2);
  const [imgFailed, setImgFailed] = useState(false);

  const svgFlag = renderInlineFlagSvg(cc);
  if (svgFlag) {
    return (
      <span
        className="inline-flex w-5 h-3.5 rounded-[3px] overflow-hidden border border-white/15 shadow-xs shrink-0 bg-zinc-900"
        title={name}
        aria-label={name}
      >
        {svgFlag}
      </span>
    );
  }

  if (!imgFailed && /^[A-Z]{2}$/.test(cc)) {
    return (
      <span
        className="inline-flex w-5 h-3.5 rounded-[3px] overflow-hidden border border-white/15 shadow-xs shrink-0 bg-zinc-900"
        title={name}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://flagcdn.com/w40/${cc.toLowerCase()}.png`}
          alt={name}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center justify-center w-5 h-3.5 rounded-[3px] border border-white/20 bg-white/10 text-[8px] font-black tracking-tight text-white shrink-0"
      title={name}
    >
      {cc}
    </span>
  );
}

function renderInlineFlagSvg(cc: string) {
  switch (cc) {
    case 'RO':
      return (
        <svg viewBox="0 0 24 16" className="w-full h-full" aria-hidden="true">
          <rect width="8" height="16" x="0" fill="#002B7F" />
          <rect width="8" height="16" x="8" fill="#FCD116" />
          <rect width="8" height="16" x="16" fill="#CE1126" />
        </svg>
      );
    case 'MD':
      return (
        <svg viewBox="0 0 24 16" className="w-full h-full" aria-hidden="true">
          <rect width="8" height="16" x="0" fill="#0046AE" />
          <rect width="8" height="16" x="8" fill="#FFD200" />
          <rect width="8" height="16" x="16" fill="#CC092F" />
          <rect width="3.2" height="4.4" x="10.4" y="5.8" rx="0.5" fill="#7A4B1E" />
        </svg>
      );
    case 'DE':
      return (
        <svg viewBox="0 0 24 16" className="w-full h-full" aria-hidden="true">
          <rect width="24" height="5.34" y="0" fill="#000000" />
          <rect width="24" height="5.34" y="5.33" fill="#DD0000" />
          <rect width="24" height="5.34" y="10.66" fill="#FFCE00" />
        </svg>
      );
    case 'GB':
      return (
        <svg viewBox="0 0 60 40" className="w-full h-full" aria-hidden="true">
          <rect width="60" height="40" fill="#012169" />
          <path d="M0,0 L60,40 M60,0 L0,40" stroke="#FFFFFF" strokeWidth="7" />
          <path d="M0,0 L60,40 M60,0 L0,40" stroke="#C8102E" strokeWidth="3.5" />
          <path d="M30,0 V40 M0,20 H60" stroke="#FFFFFF" strokeWidth="11" />
          <path d="M30,0 V40 M0,20 H60" stroke="#C8102E" strokeWidth="6.5" />
        </svg>
      );
    case 'FR':
      return (
        <svg viewBox="0 0 24 16" className="w-full h-full" aria-hidden="true">
          <rect width="8" height="16" x="0" fill="#002395" />
          <rect width="8" height="16" x="8" fill="#FFFFFF" />
          <rect width="8" height="16" x="16" fill="#ED2939" />
        </svg>
      );
    case 'IT':
      return (
        <svg viewBox="0 0 24 16" className="w-full h-full" aria-hidden="true">
          <rect width="8" height="16" x="0" fill="#009246" />
          <rect width="8" height="16" x="8" fill="#FFFFFF" />
          <rect width="8" height="16" x="16" fill="#CE2B37" />
        </svg>
      );
    case 'ES':
      return (
        <svg viewBox="0 0 24 16" className="w-full h-full" aria-hidden="true">
          <rect width="24" height="4" y="0" fill="#AA151B" />
          <rect width="24" height="8" y="4" fill="#F1BF00" />
          <rect width="24" height="4" y="12" fill="#AA151B" />
        </svg>
      );
    case 'NL':
      return (
        <svg viewBox="0 0 24 16" className="w-full h-full" aria-hidden="true">
          <rect width="24" height="5.34" y="0" fill="#AE1C28" />
          <rect width="24" height="5.34" y="5.33" fill="#FFFFFF" />
          <rect width="24" height="5.34" y="10.66" fill="#21468B" />
        </svg>
      );
    case 'BE':
      return (
        <svg viewBox="0 0 24 16" className="w-full h-full" aria-hidden="true">
          <rect width="8" height="16" x="0" fill="#000000" />
          <rect width="8" height="16" x="8" fill="#FDDA24" />
          <rect width="8" height="16" x="16" fill="#EF3340" />
        </svg>
      );
    case 'AT':
      return (
        <svg viewBox="0 0 24 16" className="w-full h-full" aria-hidden="true">
          <rect width="24" height="5.34" y="0" fill="#ED2939" />
          <rect width="24" height="5.34" y="5.33" fill="#FFFFFF" />
          <rect width="24" height="5.34" y="10.66" fill="#ED2939" />
        </svg>
      );
    case 'HU':
      return (
        <svg viewBox="0 0 24 16" className="w-full h-full" aria-hidden="true">
          <rect width="24" height="5.34" y="0" fill="#CD2A3E" />
          <rect width="24" height="5.34" y="5.33" fill="#FFFFFF" />
          <rect width="24" height="5.34" y="10.66" fill="#436F4D" />
        </svg>
      );
    case 'BG':
      return (
        <svg viewBox="0 0 24 16" className="w-full h-full" aria-hidden="true">
          <rect width="24" height="5.34" y="0" fill="#FFFFFF" />
          <rect width="24" height="5.34" y="5.33" fill="#00966E" />
          <rect width="24" height="5.34" y="10.66" fill="#D62612" />
        </svg>
      );
    case 'PL':
      return (
        <svg viewBox="0 0 24 16" className="w-full h-full" aria-hidden="true">
          <rect width="24" height="8" y="0" fill="#FFFFFF" />
          <rect width="24" height="8" y="8" fill="#DC143C" />
        </svg>
      );
    case 'IE':
      return (
        <svg viewBox="0 0 24 16" className="w-full h-full" aria-hidden="true">
          <rect width="8" height="16" x="0" fill="#169B62" />
          <rect width="8" height="16" x="8" fill="#FFFFFF" />
          <rect width="8" height="16" x="16" fill="#FF883E" />
        </svg>
      );
    case 'CZ':
      return (
        <svg viewBox="0 0 24 16" className="w-full h-full" aria-hidden="true">
          <rect width="24" height="8" y="0" fill="#FFFFFF" />
          <rect width="24" height="8" y="8" fill="#D7141A" />
          <polygon points="0,0 12,8 0,16" fill="#11457E" />
        </svg>
      );
    case 'SK':
      return (
        <svg viewBox="0 0 24 16" className="w-full h-full" aria-hidden="true">
          <rect width="24" height="5.34" y="0" fill="#FFFFFF" />
          <rect width="24" height="5.34" y="5.33" fill="#0B4EA2" />
          <rect width="24" height="5.34" y="10.66" fill="#EE1C25" />
        </svg>
      );
    case 'SE':
      return (
        <svg viewBox="0 0 24 16" className="w-full h-full" aria-hidden="true">
          <rect width="24" height="16" fill="#006AA7" />
          <rect width="3.2" height="16" x="7" fill="#FECC00" />
          <rect width="24" height="3.2" y="6.4" fill="#FECC00" />
        </svg>
      );
    case 'DK':
      return (
        <svg viewBox="0 0 24 16" className="w-full h-full" aria-hidden="true">
          <rect width="24" height="16" fill="#C60C30" />
          <rect width="3" height="16" x="7" fill="#FFFFFF" />
          <rect width="24" height="3" y="6.5" fill="#FFFFFF" />
        </svg>
      );
    case 'FI':
      return (
        <svg viewBox="0 0 24 16" className="w-full h-full" aria-hidden="true">
          <rect width="24" height="16" fill="#FFFFFF" />
          <rect width="3.5" height="16" x="6.5" fill="#003580" />
          <rect width="24" height="3.5" y="6.25" fill="#003580" />
        </svg>
      );
    case 'NO':
      return (
        <svg viewBox="0 0 24 16" className="w-full h-full" aria-hidden="true">
          <rect width="24" height="16" fill="#BA0C2F" />
          <rect width="4" height="16" x="6.5" fill="#FFFFFF" />
          <rect width="24" height="4" y="6" fill="#FFFFFF" />
          <rect width="2" height="16" x="7.5" fill="#00205B" />
          <rect width="24" height="2" y="7" fill="#00205B" />
        </svg>
      );
    case 'CH':
      return (
        <svg viewBox="0 0 24 16" className="w-full h-full" aria-hidden="true">
          <rect width="24" height="16" fill="#D52B1E" />
          <rect width="3" height="9" x="10.5" y="3.5" fill="#FFFFFF" />
          <rect width="9" height="3" x="7.5" y="6.5" fill="#FFFFFF" />
        </svg>
      );
    case 'GR':
      return (
        <svg viewBox="0 0 27 18" className="w-full h-full" aria-hidden="true">
          <rect width="27" height="18" fill="#0D5EAF" />
          <rect width="27" height="2" y="2" fill="#FFFFFF" />
          <rect width="27" height="2" y="6" fill="#FFFFFF" />
          <rect width="27" height="2" y="10" fill="#FFFFFF" />
          <rect width="27" height="2" y="14" fill="#FFFFFF" />
          <rect width="10" height="10" fill="#0D5EAF" />
          <rect width="2" height="10" x="4" fill="#FFFFFF" />
          <rect width="10" height="2" y="4" fill="#FFFFFF" />
        </svg>
      );
    case 'PT':
      return (
        <svg viewBox="0 0 24 16" className="w-full h-full" aria-hidden="true">
          <rect width="9.6" height="16" x="0" fill="#006600" />
          <rect width="14.4" height="16" x="9.6" fill="#FF0000" />
          <circle cx="9.6" cy="8" r="3" fill="#FFCC00" />
        </svg>
      );
    case 'US':
      return (
        <svg viewBox="0 0 24 16" className="w-full h-full" aria-hidden="true">
          <rect width="24" height="16" fill="#B22234" />
          <rect width="24" height="2.2" y="2.2" fill="#FFFFFF" />
          <rect width="24" height="2.2" y="6.6" fill="#FFFFFF" />
          <rect width="24" height="2.2" y="11" fill="#FFFFFF" />
          <rect width="11" height="8.8" fill="#3C3B6E" />
        </svg>
      );
    case 'UA':
      return (
        <svg viewBox="0 0 24 16" className="w-full h-full" aria-hidden="true">
          <rect width="24" height="8" y="0" fill="#005BBB" />
          <rect width="24" height="8" y="8" fill="#FFD500" />
        </svg>
      );
    default:
      return null;
  }
}

export default function DashboardClient({
  data,
  locale,
  exchangeRates: serverRates,
}: DashboardClientProps) {
  const isRo = locale === 'ro';
  const uiLocale: 'ro' | 'en' = isRo ? 'ro' : 'en';

  const {
    currency: storeCurrency,
    setCurrency: setStoreCurrency,
    exchangeRates: storeRates,
    fetchExchangeRates,
    hasDetectedIP,
    detectInitialRegion,
  } = useRegionStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!hasDetectedIP) {
      detectInitialRegion(locale);
    }
    fetchExchangeRates();
  }, [detectInitialRegion, fetchExchangeRates, hasDetectedIP, locale]);

  const displayCurrency = normalizeDisplayCurrency(
    mounted ? storeCurrency : isRo ? 'RON' : 'EUR',
    isRo ? 'RON' : 'EUR'
  );

  const effectiveRates = useMemo(
    () => ({ ...FALLBACK_RATES, ...(storeRates || {}), ...(serverRates || {}) }),
    [serverRates, storeRates]
  );

  const toDisplayAmount = (amountRon: number) => {
    const safeRon = Number(amountRon) || 0;
    if (displayCurrency === 'RON') return roundCurrency(safeRon);
    return convertFromRon(safeRon, displayCurrency, effectiveRates);
  };

  const formatMoney = (amountRon: number, decimals = 2) =>
    formatMoneyInCurrency(toDisplayAmount(amountRon), displayCurrency, uiLocale, decimals);

  // Dynamic customer discount label (never hardcoded -10%)
  const discountValue = Number(data.discountValue) > 0 ? Number(data.discountValue) : 10;
  const discountType = data.discountType === 'fixed' ? 'fixed' : 'percentage';
  const discountDisplay =
    discountType === 'fixed'
      ? formatMoney(discountValue, Number.isInteger(discountValue) ? 0 : 2)
      : `${Number.isInteger(discountValue) ? discountValue : Number(discountValue.toFixed(1))}%`;

  // Copy states
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerCopy = (id: string, value: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(value).catch(() => {});
    }
    setCopiedId(id);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopiedId(null), 2000);
  };

  // Filters & UI state
  const [loggingOut, setLoggingOut] = useState(false);
  const [period, setPeriod] = useState<PeriodFilter>('30d');
  const [selectedCountry, setSelectedCountry] = useState<string>('ALL');
  const [chartMetric, setChartMetric] = useState<ChartMetric>('clicks_orders');
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showProductLinkPicker, setShowProductLinkPicker] = useState(false);
  const [selectedProductPath, setSelectedProductPath] = useState('/shop');
  const itemsPerPage = 8;

  useEffect(() => {
    if (!isCountryDropdownOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCountryDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCountryDropdownOpen]);

  // Double-click guards
  const logoutRef = useRef(false);
  const ibanSavingRef = useRef(false);
  const ibanDeletingRef = useRef(false);
  const claimingTierRef = useRef<string | null>(null);

  // Bonus goals & instant voucher claim state
  const [bonusTiers, setBonusTiers] = useState<AffiliateBonusTierStatus[]>(() =>
    Array.isArray(data.bonusTiers) ? data.bonusTiers : []
  );
  const [claimingTierId, setClaimingTierId] = useState<string | null>(null);
  const [claimFeedback, setClaimFeedback] = useState<{
    tierId: string;
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (Array.isArray(data.bonusTiers)) {
      setBonusTiers(data.bonusTiers);
    }
  }, [data.bonusTiers]);

  // Payout / IBAN state
  const [paymentDetails, setPaymentDetails] = useState(data.paymentDetails || {});
  const [isIbanModalOpen, setIsIbanModalOpen] = useState(false);
  const [ibanInput, setIbanInput] = useState(data.paymentDetails?.iban || '');
  const [bankNameInput, setBankNameInput] = useState(data.paymentDetails?.bankName || '');
  const [holderInput, setHolderInput] = useState(data.paymentDetails?.accountHolder || data.name);
  const [ibanSaving, setIbanSaving] = useState(false);
  const [ibanDeleting, setIbanDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [ibanSuccess, setIbanSuccess] = useState(false);
  const [ibanError, setIbanError] = useState('');

  const formatIban = (iban?: string) => {
    if (!iban) return '';
    return iban.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim();
  };

  const handleOpenEditIban = () => {
    setIbanInput(paymentDetails.iban || '');
    setBankNameInput(paymentDetails.bankName || '');
    setHolderInput(paymentDetails.accountHolder || data.name);
    setIbanError('');
    setIbanSuccess(false);
    setShowDeleteConfirm(false);
    setIsIbanModalOpen(true);
  };

  // Smart Root Referral Link (auto-detects country & RO/EN, zero /ro or /en prefix)
  const refParam = encodeURIComponent(data.code);
  const smartRootLink = `https://www.trenzone.fit?ref=${refParam}`;
  const selectedDirectUrl = `https://www.trenzone.fit${selectedProductPath}?ref=${refParam}`;

  const directProductOptions = useMemo(
    () => [
      { path: '/shop', label: isRo ? 'Magazin Complet (/shop)' : 'Full Shop (/shop)' },
      { path: '/product/x10-elbow-wraps', label: 'X10 Elbow Wraps' },
      { path: '/product/x5-elbow-wraps', label: 'X5 Elbow Wraps' },
      { path: '/product/x10-wrist-wraps', label: 'X10 Wrist Wraps' },
      {
        path: '/product/centura-powerlifting',
        label: isRo ? 'Centură Powerlifting 13mm' : 'Heavy Lifting Belt 13mm',
      },
      { path: '/programs', label: isRo ? 'Programe PDF (/programs)' : 'PDF Programs (/programs)' },
    ],
    [isRo]
  );

  const handleClaimBonusVoucher = async (tierId: string) => {
    if (claimingTierRef.current || claimingTierId) return;
    claimingTierRef.current = tierId;
    setClaimingTierId(tierId);
    setClaimFeedback(null);

    try {
      const res = await claimAffiliateBonusVoucherAction(tierId, displayCurrency);
      if (res.success && res.voucher) {
        const voucher = res.voucher;
        setBonusTiers((prev) =>
          prev.map((tier) =>
            tier.id === tierId
              ? {
                  ...tier,
                  ...(displayCurrency === 'RON'
                    ? { unlocked: true, progressPct: 100, remainingRon: 0 }
                    : { unlockedEur: true, progressPctEur: 100, remainingEur: 0 }),
                  claimedVoucher: voucher,
                }
              : tier
          )
        );
        triggerCopy(`bonus-voucher-${tierId}`, voucher.code);
        setClaimFeedback({
          tierId,
          type: 'success',
          message: res.alreadyClaimed
            ? isRo
              ? `Voucherul ${voucher.code} este activ și a fost copiat.`
              : `Voucher ${voucher.code} is active and copied.`
            : isRo
              ? `Voucher creat și copiat: ${voucher.code}`
              : `Voucher created & copied: ${voucher.code}`,
        });
      } else {
        setClaimFeedback({
          tierId,
          type: 'error',
          message: localizeBonusClaimError(res.errorCode, isRo),
        });
      }
    } catch {
      setClaimFeedback({
        tierId,
        type: 'error',
        message: localizeBonusClaimError(undefined, isRo),
      });
    } finally {
      claimingTierRef.current = null;
      setClaimingTierId(null);
    }
  };

  const handleLogout = async () => {
    if (logoutRef.current || loggingOut) return;
    logoutRef.current = true;
    setLoggingOut(true);
    try {
      await affiliateLogoutAction();
      window.location.href = `/${locale}/affiliate/login`;
    } catch {
      logoutRef.current = false;
      setLoggingOut(false);
    }
  };

  const periodOptions: { id: PeriodFilter; labelRo: string; labelEn: string }[] = [
    { id: 'all', labelRo: 'Tot timpul', labelEn: 'All time' },
    { id: 'today', labelRo: 'Astăzi', labelEn: 'Today' },
    { id: '7d', labelRo: '7 zile', labelEn: '7 days' },
    { id: '30d', labelRo: '30 zile', labelEn: '30 days' },
    { id: 'this_month', labelRo: 'Luna asta', labelEn: 'This month' },
    { id: 'last_month', labelRo: 'Luna trecută', labelEn: 'Last month' },
  ];

  const periodBounds = useMemo(() => getDateRangeBounds(period), [period]);

  // Orders filtered by period + search (strict zero PII)
  const periodAndSearchOrders = useMemo(() => {
    return data.orders.filter((order) => {
      const orderDay = getBucharestIsoDate(order.createdAt);
      if (periodBounds.startIso && orderDay < periodBounds.startIso) return false;
      if (period !== 'all' && orderDay > periodBounds.endIso) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCountry =
          order.countryCode.toLowerCase().includes(q) ||
          order.countryNameRo.toLowerCase().includes(q) ||
          order.countryNameEn.toLowerCase().includes(q);
        const matchCategory = order.categories.some(
          (c) => c.labelRo.toLowerCase().includes(q) || c.labelEn.toLowerCase().includes(q)
        );
        const matchStatus =
          order.statusLabelRo.toLowerCase().includes(q) ||
          order.statusLabelEn.toLowerCase().includes(q);
        if (!matchCountry && !matchCategory && !matchStatus) return false;
      }

      return true;
    });
  }, [data.orders, period, periodBounds, searchQuery]);

  // Map GA4 countries to ISO-2 codes so clicks + sales share a unified country breakdown
  const ga4CountryByIso = useMemo(() => {
    const map = new Map<string, { clicks: number; visitors: number; nameRo: string; nameEn: string }>();
    const rawCountries = data.referralTracking?.countries || [];
    for (const c of rawCountries) {
      const key = (c.country || '').trim().toLowerCase();
      if (!key || key === 'necunoscut') continue;
      const mapped = GA4_COUNTRY_TO_ISO[key];
      const code = mapped?.code || key.slice(0, 2).toUpperCase();
      const existing = map.get(code) || {
        clicks: 0,
        visitors: 0,
        nameRo: mapped?.nameRo || c.country,
        nameEn: mapped?.nameEn || c.country,
      };
      existing.clicks += Number(c.clicks) || 0;
      existing.visitors += Number(c.visitors) || 0;
      map.set(code, existing);
    }
    return map;
  }, [data.referralTracking?.countries]);

  // "Vânzări pe Țări" summary strip (merges Supabase orders + GA4 clicks)
  const countryBreakdown = useMemo(() => {
    const map = new Map<
      string,
      {
        code: string;
        nameRo: string;
        nameEn: string;
        totalOrders: number;
        validOrders: number;
        totalSalesRon: number;
        totalCommissionRon: number;
        ga4Clicks: number;
      }
    >();

    for (const o of periodAndSearchOrders) {
      const cc = (o.countryCode || 'RO').toUpperCase();
      const existing = map.get(cc) || {
        code: cc,
        nameRo: o.countryNameRo,
        nameEn: o.countryNameEn,
        totalOrders: 0,
        validOrders: 0,
        totalSalesRon: 0,
        totalCommissionRon: 0,
        ga4Clicks: ga4CountryByIso.get(cc)?.clicks || 0,
      };
      existing.totalOrders += 1;
      if (o.isCountable) {
        existing.validOrders += 1;
        existing.totalSalesRon += Number(o.totalAmount) || 0;
        existing.totalCommissionRon += Number(o.commissionAmount) || 0;
      }
      map.set(cc, existing);
    }

    // Include GA4 click countries even before their first order arrives
    for (const [cc, info] of ga4CountryByIso.entries()) {
      if (!map.has(cc) && !searchQuery.trim()) {
        map.set(cc, {
          code: cc,
          nameRo: info.nameRo,
          nameEn: info.nameEn,
          totalOrders: 0,
          validOrders: 0,
          totalSalesRon: 0,
          totalCommissionRon: 0,
          ga4Clicks: info.clicks,
        });
      }
    }

    return Array.from(map.values()).sort(
      (a, b) =>
        b.validOrders - a.validOrders ||
        b.totalOrders - a.totalOrders ||
        b.ga4Clicks - a.ga4Clicks ||
        b.totalSalesRon - a.totalSalesRon
    );
  }, [ga4CountryByIso, periodAndSearchOrders, searchQuery]);

  // Final filtered orders including optional country filter
  const filteredOrders = useMemo(() => {
    if (selectedCountry === 'ALL') return periodAndSearchOrders;
    return periodAndSearchOrders.filter((o) => o.countryCode === selectedCountry);
  }, [periodAndSearchOrders, selectedCountry]);

  // Aggregated dynamic stats for the active period + country filter
  const activeStats = useMemo(() => {
    const isOrderCountable = (o: AffiliateOrderHistory) => {
      if (typeof o.isCountable === 'boolean') return o.isCountable;
      return classifyOrderNonCountable(o.status).isCountable;
    };

    const isOrderEligible = (o: AffiliateOrderHistory) => {
      if (typeof o.isPayoutEligible === 'boolean') return o.isPayoutEligible;
      return classifyAffiliateOrderPayoutStatus(o.status).isPayoutEligible;
    };

    const countableOrders = filteredOrders.filter(isOrderCountable);
    const eligibleOrders = countableOrders.filter(isOrderEligible);
    const inTransitOrders = countableOrders.filter((o) => !isOrderEligible(o));

    const totalSales = countableOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalCommissions = countableOrders.reduce((sum, o) => sum + (o.commissionAmount || 0), 0);
    const eligibleCommissions = eligibleOrders.reduce(
      (sum, o) =>
        sum +
        (typeof o.eligibleCommissionAmount === 'number'
          ? o.eligibleCommissionAmount
          : o.commissionAmount || 0),
      0
    );
    const pendingPickupCommissions = inTransitOrders.reduce(
      (sum, o) =>
        sum +
        (typeof o.pendingPickupCommissionAmount === 'number'
          ? o.pendingPickupCommissionAmount
          : o.commissionAmount || 0),
      0
    );
    const usagesCount = countableOrders.length;
    const deliveredCount = eligibleOrders.length;
    const inTransitCount = inTransitOrders.length;
    const aov = usagesCount > 0 ? totalSales / usagesCount : 0;

    return {
      totalSales: roundCurrency(totalSales),
      totalCommissions: roundCurrency(totalCommissions),
      eligibleCommissions: roundCurrency(eligibleCommissions),
      pendingPickupCommissions: roundCurrency(pendingPickupCommissions),
      usagesCount,
      deliveredCount,
      inTransitCount,
      aov: roundCurrency(aov),
    };
  }, [filteredOrders]);

  // GA4 Referral Clicks & Conversion Calculation synced with period/country
  const clickStats = useMemo(() => {
    const tracking = data.referralTracking;
    if (!tracking || !tracking.connected) {
      return { connected: false, clicks: 0, visitors: 0, conversionPct: 0 };
    }

    let clicks = 0;
    let visitors = 0;

    if (selectedCountry !== 'ALL') {
      const countryEntry = ga4CountryByIso.get(selectedCountry);
      clicks = countryEntry?.clicks || 0;
      visitors = countryEntry?.visitors || 0;
    } else if (period === 'all') {
      clicks = tracking.totalClicks;
      visitors = tracking.uniqueVisitors;
    } else {
      for (const d of tracking.dailySeries) {
        if (periodBounds.startIso && d.date < periodBounds.startIso) continue;
        if (d.date > periodBounds.endIso) continue;
        clicks += d.clicks;
        visitors += d.visitors;
      }
    }

    const ordersCount =
      period === 'all' && selectedCountry === 'ALL' ? data.usagesCount : activeStats.usagesCount;
    const conversionPct = clicks > 0 ? Number(((ordersCount / clicks) * 100).toFixed(1)) : 0;

    return {
      connected: true,
      clicks,
      visitors,
      conversionPct,
    };
  }, [
    activeStats.usagesCount,
    data.referralTracking,
    data.usagesCount,
    ga4CountryByIso,
    period,
    periodBounds,
    selectedCountry,
  ]);

  // Merged daily series for Recharts ComposedChart (GA4 clicks + Supabase orders/sales/commission)
  const chartSeries = useMemo(() => {
    const clicksByDate = new Map<string, { clicks: number; visitors: number }>();
    for (const d of data.referralTracking?.dailySeries || []) {
      clicksByDate.set(d.date, { clicks: d.clicks, visitors: d.visitors });
    }

    const ordersByDate = new Map<
      string,
      { orders: number; salesRon: number; commissionRon: number }
    >();
    for (const o of filteredOrders) {
      if (!o.isCountable) continue;
      const dayIso = getBucharestIsoDate(o.createdAt);
      if (!dayIso) continue;
      const cur = ordersByDate.get(dayIso) || { orders: 0, salesRon: 0, commissionRon: 0 };
      cur.orders += 1;
      cur.salesRon += Number(o.totalAmount) || 0;
      cur.commissionRon += Number(o.commissionAmount) || 0;
      ordersByDate.set(dayIso, cur);
    }

    let startIso = periodBounds.startIso;
    const endIso = periodBounds.endIso;

    if (!startIso) {
      const allDates = [...clicksByDate.keys(), ...ordersByDate.keys()].sort();
      if (allDates.length > 0) {
        startIso = allDates[0];
      } else {
        // Default last 14 days empty baseline
        const fallback = getDateRangeBounds('30d');
        startIso = fallback.startIso || endIso;
      }
    }

    const days = enumerateIsoDays(startIso, endIso, 120);
    return days.map((iso) => {
      const gaDay = clicksByDate.get(iso);
      const ordDay = ordersByDate.get(iso);
      const dt = new Date(`${iso}T12:00:00Z`);
      const label = dt.toLocaleDateString(isRo ? 'ro-RO' : 'en-US', {
        day: '2-digit',
        month: 'short',
        timeZone: 'UTC',
      });

      const salesDisplay = toDisplayAmount(ordDay?.salesRon || 0);
      const commissionDisplay = toDisplayAmount(ordDay?.commissionRon || 0);

      return {
        date: iso,
        label,
        clicks: gaDay?.clicks || 0,
        visitors: gaDay?.visitors || 0,
        orders: ordDay?.orders || 0,
        sales: salesDisplay,
        commission: commissionDisplay,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.referralTracking?.dailySeries, filteredOrders, periodBounds, isRo, displayCurrency, effectiveRates]);

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(start, start + itemsPerPage);
  }, [filteredOrders, currentPage, itemsPerPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const el = document.getElementById('affiliate-orders-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSaveIban = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ibanSavingRef.current || ibanSaving) return;
    ibanSavingRef.current = true;
    setIbanSaving(true);
    setIbanError('');
    setIbanSuccess(false);

    const cleanIban = ibanInput.trim().replace(/\s+/g, '').toUpperCase();

    try {
      const res = await updateAffiliatePaymentDetailsAction({
        iban: cleanIban,
        bankName: bankNameInput,
        accountHolder: holderInput,
      });

      if (res.success) {
        setPaymentDetails({
          iban: cleanIban,
          bankName: bankNameInput.trim(),
          accountHolder: holderInput.trim(),
        });
        setIbanSuccess(true);
        setTimeout(() => {
          setIsIbanModalOpen(false);
          setIbanSuccess(false);
        }, 900);
      } else {
        setIbanError(
          localizeIbanServerError(
            res.error,
            isRo,
            'A apărut o eroare.',
            'An error occurred.'
          )
        );
      }
    } catch {
      setIbanError(isRo ? 'A apărut o eroare.' : 'An error occurred.');
    } finally {
      ibanSavingRef.current = false;
      setIbanSaving(false);
    }
  };

  const handleDeleteIban = async () => {
    if (ibanDeletingRef.current || ibanDeleting) return;
    ibanDeletingRef.current = true;
    setIbanDeleting(true);
    setIbanError('');
    try {
      const res = await deleteAffiliatePaymentDetailsAction();

      if (res.success) {
        setPaymentDetails({});
        setIbanInput('');
        setBankNameInput('');
        setHolderInput(data.name);
        setShowDeleteConfirm(false);
        setIsIbanModalOpen(false);
      } else {
        setIbanError(
          localizeIbanServerError(
            res.error,
            isRo,
            'Eroare la ștergerea contului.',
            'Failed to delete account.'
          )
        );
      }
    } catch {
      setIbanError(isRo ? 'Eroare la ștergerea contului.' : 'Failed to delete account.');
    } finally {
      ibanDeletingRef.current = false;
      setIbanDeleting(false);
    }
  };

  // Natural creator guide & product hashtag packs (zero emojis, zero slop)
  const clipGuideCards = useMemo(
    () => [
      {
        id: 'three-to-one',
        title: isRo
          ? 'Regula 3:1 (Nu posta 100% reclame)'
          : '3:1 Rule (Do not post 100% ads)',
        desc: isRo
          ? '3 clipuri organice de sală sau lifestyle (set greu, încălzire, pregătirea genții, mirror pump) în care doar porți echipamentul, apoi 1 clip dedicat produsului. Algoritmul împinge mult mai departe conturile care nu par reclame nonstop.'
          : '3 organic gym or lifestyle videos (heavy set, warm-up, gym-bag routine, mirror pump) where you simply wear the gear, then 1 direct product spotlight clip. Feeds push organic clips much further.',
      },
      {
        id: 'natural-fit',
        title: isRo
          ? 'Integrare în antrenament și lifestyle'
          : 'Natural Training & Lifestyle Fit',
        desc: isRo
          ? `Filmează seturi grele la bench, OHP sau deadlift purtând benzile X5/X10, centura de 13mm sau tricoul oversized, fără să vinzi pe cameră. Lasă codul discret în comentariul fixat sau într-un tag de colț (@trenzone.fit · ${data.code} (-${discountDisplay})).`
          : `Film heavy bench, OHP, or deadlift sets wearing X5/X10 wraps, the 13mm belt, or the oversized tee without pitching on camera. Drop your code subtly in the pinned comment or corner tag (@trenzone.fit · ${data.code} (-${discountDisplay})).`,
      },
      {
        id: 'quality-proof',
        title: isRo
          ? 'Dovezi reale de calitate (macro)'
          : 'Real Quality Proof Shots',
        desc: isRo
          ? 'Cadre scurte de 1-2s de aproape: când tragi și lipești ariciul strâns, când închizi catarama de oțel de 13mm sau cum pică bumbacul de 240 GSM pe umeri înainte de un set greu.'
          : 'Short 1-2s close-ups wrapping the Velcro tight, snapping the steel 13mm lever buckle, or showing the 240 GSM drop-shoulder fabric drape before lifting heavy.',
      },
      {
        id: 'pr-spotlight',
        title: isRo
          ? 'Clipuri directe când ai un PR sau restock'
          : 'Direct Spotlight on PRs & Restocks',
        desc: isRo
          ? `Începe direct cu un hook clar (ex. "Strongest elbow wraps in the world" la bench), lasă trenzone.fit pe ecran 2s ca să rețină lumea site-ul și închide cu "Cod ${data.code} (-${discountDisplay})".`
          : `Start straight with a hook ("Strongest elbow wraps in the world" on bench), flash trenzone.fit on screen for 2s so viewers remember the site, and end with "Code ${data.code} (-${discountDisplay})".`,
      },
    ],
    [data.code, discountDisplay, isRo]
  );

  const productMiniCards = useMemo(
    () => [
      {
        id: 'elbow',
        title: 'Bench · X5 / X10 Elbow Wraps',
        wear: isRo
          ? '2-3 cm sub cot, strânse în X peste articulație, nu sus pe biceps.'
          : 'Start 2-3 cm below the elbow and wrap tight in an X across the joint, not high on the bicep.',
        film: isRo
          ? 'Organic: set greu la bench sau OHP cu coatele în cadru. Spotlight: macro când strângi ariciul înainte de PR.'
          : 'Organic: heavy bench or OHP set with elbows in frame. Spotlight: close-up locking the Velcro before a PR.',
      },
      {
        id: 'belt',
        title: isRo
          ? 'Deadlift & Squat · Centură Powerlifting 13mm'
          : 'Deadlift & Squat · Heavy Lifting Belt 13mm',
        wear: isRo
          ? 'Deasupra șoldului (puțin mai sus la deadlift), cu catarama de oțel închisă ferm.'
          : 'Above your hip bone (slightly higher on deadlifts), with the steel lever snapped shut tight.',
        film: isRo
          ? 'Organic: unghi lateral la squat/deadlift să se vadă grosimea de 13mm. Spotlight: sunetul când închizi catarama.'
          : 'Organic: side angle on squat/deadlift so the 13mm thickness shows naturally. Spotlight: the steel lever snap.',
      },
      {
        id: 'wrist',
        title: isRo
          ? 'Împins & Umeri · X10 Wrist Wraps'
          : 'Press & Shoulders · X10 Wrist Wraps',
        wear: isRo
          ? 'Jumătate pe baza palmei, jumătate pe articulație ca încheietura să stea dreaptă.'
          : 'Half on the base of your palm, half on the wrist joint so your wrist stays straight.',
        film: isRo
          ? 'Organic: împins cu gantere sau bară din unghiul mâinii. Spotlight: cum ține încheietura blocată sub greutate.'
          : 'Organic: dumbbell or barbell press from hand angle. Spotlight: show locked wrist stability under heavy weight.',
      },
      {
        id: 'tee',
        title: 'Gym Lifestyle · TREN Oversized Tee',
        wear: isRo
          ? 'Mărimea ta normală pentru fit-ul boxy drop-shoulder din bumbac de 240 GSM.'
          : 'Go with your normal size for the boxy drop-shoulder fit in 240 GSM cotton.',
        film: isRo
          ? 'Organic: drumul spre sală, pump cover sau mirror check. Spotlight: lumină bună pe material și print.'
          : 'Organic: everyday gym commute, pump cover, or mirror check. Spotlight: clean lighting on fabric drape and print.',
      },
    ],
    [isRo]
  );

  const productHashtagPacks = useMemo(
    () => [
      {
        id: 'hashtags-elbow',
        tag: 'Bench · X10 / X5 Elbow Wraps',
        angle: isRo
          ? 'Set greu la bench / warm-up natural cu coatele strânse în X.'
          : 'Heavy bench set or natural warm-up wearing X-wrapped sleeves.',
        hashtags: isRo
          ? '#trenzone #trenzonefit #benchpress #elbowwraps #sala'
          : '#trenzone #trenzonefit #benchpress #elbowwraps #powerlifting',
      },
      {
        id: 'hashtags-belt',
        tag: isRo ? 'Deadlift & Squat · 13mm Belt' : 'Deadlift & Squat · 13mm Belt',
        angle: isRo
          ? 'Top set la deadlift sau squat filmat din lateral cu centura de 13mm.'
          : 'Side-angle heavy squat or deadlift top set in the 13mm lever belt.',
        hashtags: isRo
          ? '#trenzone #trenzonefit #deadlift #squat #powerliftingromania'
          : '#trenzone #trenzonefit #deadlift #squat #strengthtraining',
      },
      {
        id: 'hashtags-wrist',
        tag: isRo
          ? 'Push & Shoulders · X10 Wrist Wraps'
          : 'Push & Shoulders · X10 Wrist Wraps',
        angle: isRo
          ? 'Împins la piept sau umeri cu gantere, focus pe încheietura blocată drept.'
          : 'Heavy incline press or shoulder work with locked-in wrist alignment.',
        hashtags: isRo
          ? '#trenzone #trenzonefit #wristwraps #antrenament #fitnessromania'
          : '#trenzone #trenzonefit #wristwraps #pushday #gymgear',
      },
      {
        id: 'hashtags-tee',
        tag: 'Gym Fit & Lifestyle · TREN Tee 240 GSM',
        angle: isRo
          ? 'Pump cover la început de antrenament, mirror check sau lifestyle zilnic.'
          : 'Early-session pump cover, mirror check, or everyday gym-bag lifestyle reel.',
        hashtags: '#trenzone #trenzonefit #gymwear #oversizedtee #fitcheck',
      },
    ],
    [isRo]
  );

  const selectedCountryMeta = useMemo(() => {
    if (selectedCountry === 'ALL') return null;
    return countryBreakdown.find((c) => c.code === selectedCountry) || null;
  }, [countryBreakdown, selectedCountry]);

  const firstName = useMemo(() => {
    const clean = (data.name || '').trim();
    return clean.split(/\s+/)[0] || clean;
  }, [data.name]);

  const activeOrdersCount =
    period === 'all' && selectedCountry === 'ALL' ? data.usagesCount : activeStats.usagesCount;
  const activePendingPickup =
    period === 'all' && selectedCountry === 'ALL'
      ? data.pendingPickupCommissions
      : activeStats.pendingPickupCommissions;

  const eurRate =
    Number(data.eurRate) > 1
      ? Number(data.eurRate)
      : Number(effectiveRates.EUR) > 1
        ? Number(effectiveRates.EUR)
        : 5.3;

  const eurToDisplayAmount = (amountEur: number) => {
    const safeEur = Number(amountEur) || 0;
    if (displayCurrency === 'EUR') return roundCurrency(safeEur);
    if (displayCurrency === 'RON') return roundCurrency(safeEur * eurRate);
    return convertFromRon(safeEur * eurRate, displayCurrency, effectiveRates);
  };

  const minWithdrawalRon =
    Number(data.minWithdrawalRon) > 0 ? Number(data.minWithdrawalRon) : 200;
  const minWithdrawalEur =
    Number(data.minWithdrawalEur) > 0 ? Number(data.minWithdrawalEur) : 40;
  const pendingPayoutEur =
    typeof data.pendingPayoutEur === 'number'
      ? data.pendingPayoutEur
      : roundCurrency((data.pendingPayout || 0) / eurRate);

  const minWithdrawalDisplayValue =
    displayCurrency === 'RON'
      ? minWithdrawalRon
      : displayCurrency === 'EUR'
        ? minWithdrawalEur
        : Math.round(eurToDisplayAmount(minWithdrawalEur));
  const pendingInMinCurrency =
    displayCurrency === 'RON'
      ? data.pendingPayout
      : displayCurrency === 'EUR'
        ? pendingPayoutEur
        : toDisplayAmount(data.pendingPayout);
  const minWithdrawalLabel = formatMoneyInCurrency(
    minWithdrawalDisplayValue,
    displayCurrency,
    uiLocale,
    0
  );

  const canWithdraw =
    displayCurrency === 'RON'
      ? data.pendingPayout >= minWithdrawalRon
      : displayCurrency === 'EUR'
        ? pendingPayoutEur >= minWithdrawalEur
        : pendingInMinCurrency >= minWithdrawalDisplayValue;
  const withdrawalProgressPct = Math.min(
    100,
    Math.max(0, Math.round((pendingInMinCurrency / minWithdrawalDisplayValue) * 100))
  );

  const inTransitSalesRon = Math.max(
    0,
    roundCurrency((data.totalSales || 0) - (data.eligibleSales || 0))
  );
  const eligibleSalesEurTotal =
    typeof data.eligibleSalesEur === 'number'
      ? data.eligibleSalesEur
      : roundCurrency((data.eligibleSales || 0) / eurRate);
  const inTransitSalesEurTotal =
    typeof data.inTransitSalesEur === 'number'
      ? data.inTransitSalesEur
      : Math.max(0, roundCurrency(((data.totalSales || 0) - (data.eligibleSales || 0)) / eurRate));

  // For KPI 1 / KPI 2 / KPI 3, when viewing EUR with native EUR orders use consistent rate conversions
  const deliveredSalesForGoalsDisplay =
    displayCurrency === 'RON'
      ? formatMoneyInCurrency(data.eligibleSales || 0, 'RON', uiLocale, 2)
      : formatMoneyInCurrency(eurToDisplayAmount(eligibleSalesEurTotal), displayCurrency, uiLocale, 2);
  const inTransitSalesForGoalsDisplay =
    displayCurrency === 'RON'
      ? formatMoneyInCurrency(inTransitSalesRon, 'RON', uiLocale, 2)
      : formatMoneyInCurrency(
          eurToDisplayAmount(inTransitSalesEurTotal),
          displayCurrency,
          uiLocale,
          2
        );
  const hasInTransitForGoals =
    displayCurrency === 'RON' ? inTransitSalesRon > 0 : inTransitSalesEurTotal > 0;
  const hasMultipleCurrencies =
    Array.isArray(data.currencyBreakdown) && data.currencyBreakdown.length > 1;

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#e32f8c] selection:text-white pb-20 font-sans relative overflow-x-clip pt-4 sm:pt-6">
      {/* Subtle pink ambient wash blending seamlessly into black canvas */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle at 85% 14%, rgba(227,47,140,0.12), transparent 38%), radial-gradient(circle at 10% 48%, rgba(227,47,140,0.06), transparent 42%)',
        }}
        aria-hidden="true"
      />

      <main className="container mx-auto px-3.5 sm:px-6 max-w-6xl space-y-5 sm:space-y-6 relative z-10">
        {/* 1. SINGLE COMPACT TOP HEADER BAR */}
        <header className="bg-[#09090d]/95 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white truncate">
                {isRo ? `Salut, ${firstName}` : `Hey, ${firstName}`}
              </h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-black bg-[#e32f8c]/15 text-[#ff66b2] border border-[#e32f8c]/35 px-2.5 py-0.5 rounded-full">
                {isRo ? 'Cod:' : 'Code:'} {data.code}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
              <span className="inline-flex items-center gap-1.5 bg-white/[0.05] text-zinc-200 border border-white/10 px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {data.commissionPercent}% {isRo ? 'comision' : 'commission'}
              </span>
              <span className="inline-flex items-center bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 px-2.5 py-0.5 rounded-full">
                -{discountDisplay} {isRo ? 'reducere client' : 'customer off'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 shrink-0 pt-1 sm:pt-0 border-t border-white/5 sm:border-t-0">
            {/* Compact Currency Switcher */}
            <div
              className="inline-flex items-center bg-black/60 border border-white/10 rounded-xl p-0.5"
              role="group"
              aria-label={isRo ? 'Monedă afișată' : 'Display currency'}
            >
              {AFFILIATE_DISPLAY_CURRENCIES.map((cur: AffiliateDisplayCurrency) => {
                const active = displayCurrency === cur;
                return (
                  <button
                    key={cur}
                    type="button"
                    onClick={() => setStoreCurrency(cur)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-black tracking-wider transition-all cursor-pointer ${
                      active
                        ? 'bg-[#e32f8c] text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {cur}
                  </button>
                );
              })}
            </div>

            {/* Compact Logout */}
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center gap-1.5 bg-white/5 hover:bg-red-500/15 text-zinc-300 hover:text-red-300 px-3 py-1.5 rounded-xl text-xs font-bold border border-white/10 hover:border-red-500/35 transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
              title={isRo ? 'Deconectare' : 'Sign out'}
            >
              {loggingOut ? (
                <Loader2 size={13} className="animate-spin shrink-0" />
              ) : (
                <LogOut size={13} className="shrink-0" />
              )}
              <span>{isRo ? 'Ieși' : 'Sign out'}</span>
            </button>
          </div>
        </header>

        {/* 2. 4 CRISP KPI CARDS */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* KPI 1: DE INCASAT ACUM */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-[#e32f8c]/45 bg-gradient-to-br from-[#e32f8c]/15 via-[#09090d] to-[#09090d] shadow-xl flex flex-col justify-between gap-3"
          >
            <div>
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#ff66b2]">
                  {isRo ? 'De Încasat Acum' : 'Ready to Cash Out'}
                </span>
                <CheckCircle2 size={15} className="text-[#ff66b2] shrink-0" />
              </div>
              <div className="text-xl sm:text-3xl font-black tracking-tight text-white tabular-nums">
                {formatMoney(data.pendingPayout)}
              </div>
              <p className="text-[11px] text-zinc-400 mt-1 truncate">
                {isRo ? 'Eligibil:' : 'Eligible:'}{' '}
                <span className="text-zinc-200 font-bold">
                  {formatMoney(data.eligibleCommissions)}
                </span>
              </p>

              {/* Minimum Withdrawal Threshold Status */}
              <div className="mt-2.5 pt-2 border-t border-white/10 space-y-1.5">
                {canWithdraw ? (
                  <>
                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full leading-tight">
                      {isRo
                        ? 'Prag atins · Eligibil pentru plată'
                        : 'Threshold reached · Ready for payout'}
                    </span>
                    <p className="text-[10px] text-zinc-400">
                      {isRo
                        ? `Prag minim retragere: ${minWithdrawalLabel}`
                        : `Min withdrawal: ${minWithdrawalLabel}`}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-1 text-[10px]">
                      <span className="text-zinc-400 truncate">
                        {isRo
                          ? `Prag minim: ${minWithdrawalLabel}`
                          : `Min withdrawal: ${minWithdrawalLabel}`}
                      </span>
                      <span className="font-black text-[#ff66b2] tabular-nums shrink-0">
                        {withdrawalProgressPct}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#e32f8c] to-[#ff66b2] transition-all duration-300"
                        style={{ width: `${withdrawalProgressPct}%` }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenEditIban}
              className={`w-full text-left px-2.5 py-1.5 rounded-xl border text-[10px] sm:text-[11px] font-bold flex items-center justify-between gap-1.5 transition-colors cursor-pointer ${
                paymentDetails?.iban
                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/15'
                  : 'bg-amber-500/15 border-amber-500/35 text-amber-200 hover:bg-amber-500/25'
              }`}
            >
              <span className="truncate font-mono">
                {paymentDetails?.iban
                  ? `IBAN ••••${paymentDetails.iban.slice(-4)}`
                  : isRo
                    ? '+ Adaugă IBAN'
                    : '+ Add IBAN'}
              </span>
              <Pencil size={11} className="shrink-0 opacity-80" />
            </button>
          </motion.div>

          {/* KPI 2: TOTAL CASTIGAT */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.04 }}
            className="rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-[#09090d] to-[#09090d] shadow-xl flex flex-col justify-between gap-3"
          >
            <div>
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                  {isRo ? 'Total Câștigat' : 'Total Earned'}
                </span>
                <Award size={15} className="text-emerald-300 shrink-0" />
              </div>
              <div className="text-xl sm:text-3xl font-black tracking-tight text-white tabular-nums">
                {formatMoney(
                  period === 'all' && selectedCountry === 'ALL'
                    ? data.totalCommissions
                    : activeStats.totalCommissions
                )}
              </div>
              <p className="text-[11px] text-zinc-400 mt-1 truncate">
                {activePendingPickup > 0 ? (
                  <span className="text-amber-300 font-semibold">
                    +{formatMoney(activePendingPickup)} {isRo ? 'în curs' : 'pending'}
                  </span>
                ) : (
                  <span>
                    {isRo ? 'Comisioane valide' : 'Valid commissions'}
                  </span>
                )}
              </p>
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] sm:text-[11px]">
              <span className="text-zinc-400">
                {isRo ? 'Total plătit' : 'Settled'}
              </span>
              <span className="font-black text-emerald-400 tabular-nums">
                {formatMoney(data.paidPayout)}
              </span>
            </div>
          </motion.div>

          {/* KPI 3: COMENZI & VOLUM */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.08 }}
            className="rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-white/10 bg-[#09090d]/95 shadow-xl flex flex-col justify-between gap-3"
          >
            <div>
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                  {isRo ? 'Comenzi & Volum' : 'Orders & Volume'}
                </span>
                <TrendingUp size={15} className="text-zinc-300 shrink-0" />
              </div>
              <div className="text-xl sm:text-3xl font-black tracking-tight text-white tabular-nums">
                {formatMoney(
                  period === 'all' && selectedCountry === 'ALL'
                    ? data.totalSales
                    : activeStats.totalSales
                )}
              </div>
              <p className="text-[11px] text-zinc-400 mt-1 truncate">
                <strong className="text-zinc-200">{activeOrdersCount}</strong>{' '}
                {isRo ? 'comenzi' : 'orders'} ·{' '}
                <span className="text-emerald-400 font-semibold">
                  {isRo ? 'comenzi valide' : 'valid orders'}
                </span>
              </p>
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] sm:text-[11px]">
              <span className="text-zinc-400">{isRo ? 'Coș mediu:' : 'Avg order:'}</span>
              <span className="font-bold text-white tabular-nums">{formatMoney(activeStats.aov)}</span>
            </div>
          </motion.div>

          {/* KPI 4: CLICK-URI LINK (?ref=) + CONVERSIE % */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.12 }}
            className="rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-white/10 bg-[#09090d]/95 shadow-xl flex flex-col justify-between gap-3"
          >
            <div>
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                  {isRo ? 'Click-uri Link (?ref=)' : 'Link Clicks (?ref=)'}
                </span>
                <MousePointerClick size={15} className="text-[#ff66b2] shrink-0" />
              </div>
              <div className="text-xl sm:text-3xl font-black tracking-tight text-white tabular-nums">
                {clickStats.connected ? clickStats.clicks.toLocaleString(isRo ? 'ro-RO' : 'en-US') : '—'}
              </div>
              <p className="text-[11px] text-zinc-400 mt-1 truncate">
                {clickStats.connected ? (
                  <>
                    <strong className="text-zinc-200">
                      {clickStats.visitors.toLocaleString(isRo ? 'ro-RO' : 'en-US')}
                    </strong>{' '}
                    {isRo ? 'vizitatori unici' : 'unique visitors'}
                  </>
                ) : (
                  <span className="text-zinc-500">
                    {isRo ? 'Sincronizare GA4...' : 'GA4 syncing...'}
                  </span>
                )}
              </p>
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] sm:text-[11px]">
              <span className="text-zinc-400">{isRo ? 'Conversie:' : 'Conversion:'}</span>
              <span className="font-black text-[#ff66b2] tabular-nums">
                {clickStats.connected && clickStats.clicks > 0 ? `${clickStats.conversionPct}%` : '—'}
              </span>
            </div>
          </motion.div>
        </section>

        {/* 3. SMART ROOT LINK & PROMO CODE CARD (CLEAN 2-TILE SHARE HUB) */}
        <section className="rounded-2xl sm:rounded-3xl border border-white/10 bg-[#09090d]/95 p-4 sm:p-5 shadow-xl space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Tile 1: Smart Root Link */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/15 p-3.5 sm:p-4 flex flex-col justify-between gap-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="block text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    {isRo ? 'Link-ul Tău Inteligent' : 'Your Smart Referral Link'}
                  </span>
                  <p className="text-xs sm:text-sm font-mono font-bold text-white truncate mt-0.5">
                    trenzone.fit?ref={data.code}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => triggerCopy('smart-root-link', smartRootLink)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer active:scale-[0.98] ${
                    copiedId === 'smart-root-link'
                      ? 'bg-emerald-500 text-black'
                      : 'bg-white/10 hover:bg-[#e32f8c] text-white'
                  }`}
                >
                  {copiedId === 'smart-root-link' ? <Check size={14} /> : <Copy size={14} />}
                  <span>
                    {copiedId === 'smart-root-link'
                      ? isRo
                        ? 'Copiat!'
                        : 'Copied!'
                      : isRo
                        ? 'Copiază'
                        : 'Copy'}
                  </span>
                </button>
              </div>
              <p className="text-[11px] text-zinc-400 leading-snug">
                {isRo
                  ? 'Detectează automat țara & limba (RO/EN) și aplică reducerea.'
                  : 'Auto-detects country & language (RO/EN) and applies your discount.'}
              </p>
            </div>

            {/* Tile 2: Promo Code */}
            <div className="rounded-2xl bg-gradient-to-br from-[#e32f8c]/15 via-[#0e0e14] to-[#09090d] border border-[#e32f8c]/45 p-3.5 sm:p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#ff66b2]">
                    {isRo ? 'Codul Tău Promo' : 'Your Promo Code'}
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    -{discountDisplay} {isRo ? 'client' : 'off'}
                  </span>
                </div>
                <p className="text-xl sm:text-2xl font-mono font-black tracking-wider text-white truncate mt-1">
                  {data.code}
                </p>
              </div>

              <button
                type="button"
                onClick={() => triggerCopy('main-promo-code', data.code)}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer active:scale-[0.98] shadow-md ${
                  copiedId === 'main-promo-code'
                    ? 'bg-emerald-500 text-black shadow-emerald-500/20'
                    : 'bg-[#e32f8c] hover:bg-[#ff3b9e] text-white shadow-[#e32f8c]/30'
                }`}
              >
                {copiedId === 'main-promo-code' ? <Check size={14} /> : <Copy size={14} />}
                <span>
                  {copiedId === 'main-promo-code'
                    ? isRo
                      ? 'Copiat!'
                      : 'Copied!'
                    : isRo
                      ? 'Copiază'
                      : 'Copy'}
                </span>
              </button>
            </div>
          </div>

          {/* Optional Collapsed Direct Product Link Selector */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowProductLinkPicker((prev) => !prev)}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-zinc-400 hover:text-[#ff66b2] transition-colors cursor-pointer"
            >
              <Link2 size={13} />
              <span>
                {isRo ? 'Vrei link direct către un produs?' : 'Want a direct link to a product?'}
              </span>
              <ChevronDown
                size={13}
                className={`transition-transform duration-200 ${
                  showProductLinkPicker ? 'rotate-180 text-[#ff66b2]' : ''
                }`}
              />
            </button>

            <AnimatePresence initial={false}>
              {showProductLinkPicker && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2.5 pt-2.5 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <select
                      value={selectedProductPath}
                      onChange={(e) => setSelectedProductPath(e.target.value)}
                      className="bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#e32f8c]"
                    >
                      {directProductOptions.map((opt) => (
                        <option key={opt.path} value={opt.path} className="bg-[#09090d] text-white">
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    <div className="flex-1 min-w-0 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[11px] font-mono text-zinc-300 truncate">
                      {selectedDirectUrl}
                    </div>

                    <button
                      type="button"
                      onClick={() => triggerCopy('direct-product-link', selectedDirectUrl)}
                      className={`shrink-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                        copiedId === 'direct-product-link'
                          ? 'bg-emerald-500 text-black'
                          : 'bg-white/10 hover:bg-[#e32f8c] text-white'
                      }`}
                    >
                      {copiedId === 'direct-product-link' ? <Check size={13} /> : <Copy size={13} />}
                      <span>
                        {copiedId === 'direct-product-link'
                          ? isRo
                            ? 'Copiat!'
                            : 'Copied!'
                          : isRo
                            ? 'Copiază'
                            : 'Copy'}
                      </span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* 4. PERFORMANCE ANALYTICS CHART (RECHARTS COMPOSED CHART) + PRO FILTERS */}
        <section className="rounded-2xl sm:rounded-3xl border border-white/10 bg-[#09090d]/95 p-4 sm:p-6 shadow-2xl space-y-4 relative">
          <div
            className="absolute inset-0 overflow-hidden rounded-2xl sm:rounded-3xl pointer-events-none"
            aria-hidden="true"
          >
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#e32f8c]/12 rounded-full blur-[90px]" />
          </div>

          <div className="relative z-30 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-white flex items-center gap-2 font-heading">
                <BarChart3 size={18} className="text-[#ff66b2]" />
                <span>{isRo ? 'Grafic Performanță' : 'Performance Analytics'}</span>
              </h2>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {isRo
                  ? 'Evoluția zilnică a click-urilor pe link (?ref=), comenzilor și comisioanelor.'
                  : 'Daily trend for referral link clicks (?ref=), attributed orders, and commissions.'}
              </p>
            </div>

            {/* Filters Row: Period Pills + Country Dropdown */}
            <div className="relative z-30 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-black/50 border border-white/10 rounded-xl p-1 overflow-x-auto max-w-full">
                {periodOptions.map((opt) => {
                  const active = period === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setPeriod(opt.id);
                        setCurrentPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                        active
                          ? 'bg-[#e32f8c] text-white shadow-sm'
                          : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {isRo ? opt.labelRo : opt.labelEn}
                    </button>
                  );
                })}
              </div>

              {/* Country Dropdown Filter with Flags */}
              {countryBreakdown.length > 0 && (
                <div className="relative z-30">
                  <button
                    type="button"
                    aria-expanded={isCountryDropdownOpen}
                    aria-haspopup="listbox"
                    onClick={() => setIsCountryDropdownOpen((prev) => !prev)}
                    className="bg-black/50 hover:bg-white/[0.06] border border-white/10 rounded-xl px-3 py-1.5 text-[11px] font-bold text-zinc-200 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    {selectedCountryMeta ? (
                      <>
                        <CountryFlag
                          code={selectedCountryMeta.code}
                          name={isRo ? selectedCountryMeta.nameRo : selectedCountryMeta.nameEn}
                        />
                        <span>{isRo ? selectedCountryMeta.nameRo : selectedCountryMeta.nameEn}</span>
                      </>
                    ) : (
                      <>
                        <Globe2 size={13} className="text-[#ff66b2]" />
                        <span>{isRo ? 'Toate țările' : 'All countries'}</span>
                      </>
                    )}
                    <ChevronDown
                      size={13}
                      className={`text-zinc-400 transition-transform ${
                        isCountryDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {isCountryDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-[80]"
                          onClick={() => setIsCountryDropdownOpen(false)}
                          aria-hidden="true"
                        />
                        <motion.div
                          initial={{ opacity: 0, y: -4, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -4, scale: 0.98 }}
                          transition={{ duration: 0.14 }}
                          role="listbox"
                          className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1.5 w-60 max-w-[calc(100vw-2.5rem)] max-h-64 overflow-y-auto overscroll-contain bg-[#0e0e14] border border-white/15 rounded-2xl shadow-2xl p-1.5 z-[80] [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.2)_transparent]"
                        >
                          <button
                            type="button"
                            role="option"
                            aria-selected={selectedCountry === 'ALL'}
                            onClick={() => {
                              setSelectedCountry('ALL');
                              setIsCountryDropdownOpen(false);
                              setCurrentPage(1);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer ${
                              selectedCountry === 'ALL'
                                ? 'bg-[#e32f8c]/20 text-[#ff66b2]'
                                : 'text-zinc-300 hover:bg-white/5'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <Globe2 size={13} />
                              {isRo ? 'Toate țările' : 'All countries'}
                            </span>
                            {selectedCountry === 'ALL' && <Check size={13} />}
                          </button>
                          {countryBreakdown.map((c) => {
                            const cName = isRo ? c.nameRo : c.nameEn;
                            const active = selectedCountry === c.code;
                            return (
                              <button
                                key={c.code}
                                type="button"
                                role="option"
                                aria-selected={active}
                                onClick={() => {
                                  setSelectedCountry(c.code);
                                  setIsCountryDropdownOpen(false);
                                  setCurrentPage(1);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between gap-2 cursor-pointer ${
                                  active
                                    ? 'bg-[#e32f8c]/20 text-[#ff66b2]'
                                    : 'text-zinc-300 hover:bg-white/5'
                                }`}
                              >
                                <span className="flex items-center gap-2 min-w-0">
                                  <CountryFlag code={c.code} name={cName} />
                                  <span className="truncate">{cName}</span>
                                </span>
                                <span className="text-[10px] text-zinc-400 shrink-0">
                                  {c.totalOrders > 0
                                    ? `${c.totalOrders} ${isRo ? 'cmd' : 'ord'}`
                                    : `${c.ga4Clicks} cl`}
                                </span>
                              </button>
                            );
                          })}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          {/* Chart Metric Tabs */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1 bg-white/[0.05] p-1 rounded-xl border border-white/10">
              {(
                [
                  {
                    key: 'clicks_orders' as ChartMetric,
                    label: isRo ? 'Click-uri & Comenzi' : 'Clicks & Orders',
                  },
                  { key: 'commission' as ChartMetric, label: isRo ? 'Comision' : 'Commission' },
                  { key: 'sales' as ChartMetric, label: isRo ? 'Vânzări' : 'Sales' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setChartMetric(tab.key)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    chartMetric === tab.key
                      ? 'bg-white text-slate-900'
                      : 'text-zinc-300 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 text-[11px] font-semibold text-zinc-400">
              {chartMetric === 'clicks_orders' && (
                <>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#e32f8c]" />
                    {isRo ? 'Click-uri (?ref=)' : 'Clicks (?ref=)'}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
                    {isRo ? 'Comenzi' : 'Orders'}
                  </span>
                </>
              )}
              {chartMetric === 'commission' && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  {isRo ? `Comision (${displayCurrency})` : `Commission (${displayCurrency})`}
                </span>
              )}
              {chartMetric === 'sales' && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#e32f8c]" />
                  {isRo ? `Vânzări (${displayCurrency})` : `Sales (${displayCurrency})`}
                </span>
              )}
            </div>
          </div>

          {/* Recharts ComposedChart */}
          <div className="relative z-0 h-[220px] sm:h-[260px] w-full">
            {mounted && chartSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartSeries} margin={{ top: 8, right: 6, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="affPinkGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e32f8c" stopOpacity={0.38} />
                      <stop offset="95%" stopColor="#e32f8c" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="affEmeraldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="rgba(255,255,255,0.08)"
                  />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    minTickGap={22}
                    tick={{ fontSize: 10, fill: '#a1a1aa', fontWeight: 600 }}
                  />
                  <YAxis
                    yAxisId="left"
                    axisLine={false}
                    tickLine={false}
                    width={44}
                    allowDecimals={chartMetric !== 'clicks_orders'}
                    tick={{ fontSize: 10, fill: '#a1a1aa' }}
                  />
                  {chartMetric === 'clicks_orders' && (
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      axisLine={false}
                      tickLine={false}
                      width={28}
                      allowDecimals={false}
                      tick={{ fontSize: 10, fill: '#34d399' }}
                    />
                  )}
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111118',
                      borderRadius: '14px',
                      border: '1px solid rgba(255,255,255,0.12)',
                      fontSize: '12px',
                      color: '#fff',
                    }}
                    formatter={(value: unknown, name: unknown) => {
                      const num = Number(value) || 0;
                      const key = String(name);
                      if (key === 'clicks') {
                        return [num.toLocaleString(isRo ? 'ro-RO' : 'en-US'), isRo ? 'Click-uri' : 'Clicks'];
                      }
                      if (key === 'orders') {
                        return [num.toLocaleString(isRo ? 'ro-RO' : 'en-US'), isRo ? 'Comenzi' : 'Orders'];
                      }
                      const formatted = formatMoneyInCurrency(num, displayCurrency, uiLocale, 2);
                      return [
                        formatted,
                        key === 'commission'
                          ? isRo
                            ? 'Comision'
                            : 'Commission'
                          : isRo
                            ? 'Vânzări'
                            : 'Sales',
                      ];
                    }}
                  />
                  {chartMetric === 'clicks_orders' && (
                    <>
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="clicks"
                        stroke="#e32f8c"
                        strokeWidth={2.4}
                        fillOpacity={1}
                        fill="url(#affPinkGrad)"
                      />
                      <Bar
                        yAxisId="right"
                        dataKey="orders"
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={18}
                      />
                    </>
                  )}
                  {chartMetric === 'commission' && (
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="commission"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#affEmeraldGrad)"
                    />
                  )}
                  {chartMetric === 'sales' && (
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="sales"
                      stroke="#e32f8c"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#affPinkGrad)"
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-500 text-xs">
                {isRo
                  ? 'Nicio activitate înregistrată în intervalul selectat.'
                  : 'No activity recorded in the selected range.'}
              </div>
            )}
          </div>
        </section>

        {/* 5. BONUS GOAL SYSTEM & INSTANT VOUCHER CREATION */}
        {bonusTiers.length > 0 && (
          <section className="rounded-2xl sm:rounded-3xl border border-white/10 bg-[#09090d]/95 p-4 sm:p-6 shadow-2xl space-y-4 relative overflow-hidden">
            <div
              className="absolute -top-24 -left-24 w-64 h-64 bg-[#e32f8c]/10 rounded-full blur-[90px] pointer-events-none"
              aria-hidden="true"
            />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <Gift size={17} className="text-[#ff66b2] shrink-0" />
                  <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-white font-heading">
                    {isRo ? 'Bonusuri de Performanță' : 'Performance Bonus Goals'}
                  </h2>
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  {isRo
                    ? 'Vouchere de cumpărături pe trenzone.fit deblocate pe baza vânzărilor eligibile.'
                    : 'Fixed store vouchers on trenzone.fit unlocked based on eligible referral sales.'}
                  {hasMultipleCurrencies
                    ? isRo
                      ? ' Vânzările din toate monedele se adună automat.'
                      : ' Multi-currency sales combine automatically toward each target.'
                    : ''}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <div className="inline-flex items-center gap-1.5 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-1.5 text-[11px]">
                  <span className="text-zinc-400">
                    {isRo ? 'Vânzări eligibile:' : 'Eligible sales:'}
                  </span>
                  <strong className="text-white tabular-nums">
                    {deliveredSalesForGoalsDisplay}
                  </strong>
                  {hasInTransitForGoals && (
                    <span className="text-amber-300 font-semibold tabular-nums">
                      (+{inTransitSalesForGoalsDisplay} {isRo ? 'în curs' : 'pending'})
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {bonusTiers.map((tier) => {
                const voucher = tier.claimedVoucher;
                const isClaiming = claimingTierId === tier.id;
                const isCopied = copiedId === `bonus-voucher-${tier.id}`;
                const feedback = claimFeedback?.tierId === tier.id ? claimFeedback : null;

                const isRonDisplay = displayCurrency === 'RON';
                const targetDisplayAmount = isRonDisplay
                  ? tier.salesTargetRon
                  : displayCurrency === 'EUR'
                    ? tier.salesTargetEur
                    : Math.round(eurToDisplayAmount(tier.salesTargetEur));
                const voucherDisplayAmount = isRonDisplay
                  ? voucher?.valueRon || tier.voucherRon
                  : displayCurrency === 'EUR'
                    ? voucher
                      ? voucher.issuedCurrency === 'EUR' && voucher.valueEur
                        ? voucher.valueEur
                        : roundCurrency(voucher.valueRon / eurRate)
                      : tier.voucherEur
                    : Math.round(
                        eurToDisplayAmount(
                          voucher
                            ? voucher.issuedCurrency === 'EUR' && voucher.valueEur
                              ? voucher.valueEur
                              : voucher.valueRon / eurRate
                            : tier.voucherEur
                        )
                      );
                const eligibleForTierDisplay = isRonDisplay
                  ? tier.eligibleSalesRon
                  : eurToDisplayAmount(tier.eligibleSalesEur);
                const remainingForTierDisplay = isRonDisplay
                  ? tier.remainingRon
                  : eurToDisplayAmount(tier.remainingEur);
                const tierProgressPct = isRonDisplay ? tier.progressPct : tier.progressPctEur;
                const isTierUnlocked = isRonDisplay ? tier.unlocked : tier.unlockedEur;

                const isVoucherUsed = Boolean(voucher?.isUsed);
                const isVoucherActive = Boolean(voucher?.isActive && !voucher?.isUsed);
                const isReadyToClaim = isTierUnlocked && !voucher;

                return (
                  <div
                    key={tier.id}
                    className={`rounded-2xl p-4 border flex flex-col justify-between gap-3.5 transition-all ${
                      isReadyToClaim
                        ? 'border-[#e32f8c]/60 bg-gradient-to-br from-[#e32f8c]/20 via-[#160b12] to-[#09090d] shadow-[0_0_25px_rgba(227,47,140,0.16)]'
                        : isVoucherActive
                          ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-[#09090d] to-[#09090d]'
                          : 'border-white/10 bg-white/[0.025]'
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                          {isRo ? 'Prag' : 'Goal'}{' '}
                          {formatMoneyInCurrency(targetDisplayAmount, displayCurrency, uiLocale, 0)}
                        </span>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                            isTierUnlocked || Boolean(voucher)
                              ? 'bg-[#e32f8c]/20 text-[#ff66b2] border-[#e32f8c]/40'
                              : 'bg-white/5 text-zinc-400 border-white/10'
                          }`}
                        >
                          {tier.pctLabel}
                        </span>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          {isRo ? 'Voucher Bonus' : 'Bonus Voucher'}
                        </p>
                        <div className="flex items-baseline gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-2xl font-black tracking-tight text-white tabular-nums">
                            {formatMoneyInCurrency(voucherDisplayAmount, displayCurrency, uiLocale, 0)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {voucher ? (
                      <div className="space-y-2.5 pt-2 border-t border-white/10">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                              isVoucherUsed
                                ? 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30'
                                : isVoucherActive
                                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                                  : 'bg-red-500/15 text-red-300 border-red-500/35'
                            }`}
                          >
                            {isVoucherUsed
                              ? isRo
                                ? 'Utilizat'
                                : 'Used'
                              : isVoucherActive
                                ? isRo
                                  ? 'Activ'
                                  : 'Active'
                                : isRo
                                  ? 'Expirat'
                                  : 'Expired'}
                          </span>
                          {voucher.expiresAt && (
                            <span className="text-[10px] text-zinc-500">
                              {isRo ? 'Exp:' : 'Exp:'}{' '}
                              {new Date(voucher.expiresAt).toLocaleDateString(
                                isRo ? 'ro-RO' : 'en-US',
                                { day: '2-digit', month: 'short', year: 'numeric' }
                              )}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 bg-black/55 border border-white/15 rounded-xl px-2.5 py-2">
                          <span className="text-[11px] font-mono font-black text-white truncate flex-1 select-all">
                            {voucher.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => triggerCopy(`bonus-voucher-${tier.id}`, voucher.code)}
                            className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                              isCopied
                                ? 'bg-emerald-500 text-black'
                                : 'bg-white/10 hover:bg-[#e32f8c] text-white'
                            }`}
                          >
                            {isCopied ? <Check size={11} /> : <Copy size={11} />}
                            <span>
                              {isCopied
                                ? isRo
                                  ? 'Copiat'
                                  : 'Copied'
                                : isRo
                                  ? 'Copiază'
                                  : 'Copy'}
                            </span>
                          </button>
                        </div>

                        {isVoucherActive && (
                          <Link
                            href="/shop"
                            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-[#e32f8c] text-white text-[11px] font-black uppercase tracking-wider transition-all"
                          >
                            <span>{isRo ? 'Folosește pe /shop' : 'Use on /shop'}</span>
                            <ExternalLink size={12} />
                          </Link>
                        )}
                      </div>
                    ) : isTierUnlocked ? (
                      <div className="space-y-2 pt-2 border-t border-white/10">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-black uppercase tracking-wider text-[#ff66b2]">
                            {isRo ? 'Prag atins' : 'Unlocked'}
                          </span>
                          <span className="font-bold text-emerald-400">100%</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleClaimBonusVoucher(tier.id)}
                          disabled={Boolean(claimingTierId)}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#e32f8c] hover:bg-[#ff3b9e] text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-[#e32f8c]/25 transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                        >
                          {isClaiming ? (
                            <>
                              <Loader2 size={14} className="animate-spin shrink-0" />
                              <span>{isRo ? 'Se creează...' : 'Creating...'}</span>
                            </>
                          ) : (
                            <>
                              <Gift size={14} className="shrink-0" />
                              <span>{isRo ? 'Creează Voucher' : 'Create Voucher'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-2 border-t border-white/10">
                        <div className="flex items-center justify-between gap-2 text-[10px]">
                          <span className="inline-flex items-center gap-1 text-zinc-400 font-bold">
                            <Lock size={11} className="shrink-0" />
                            {tierProgressPct}%
                          </span>
                          <span className="text-zinc-300 font-semibold tabular-nums truncate">
                            {formatMoneyInCurrency(
                              eligibleForTierDisplay,
                              displayCurrency,
                              uiLocale,
                              0
                            )}{' '}
                            /{' '}
                            {formatMoneyInCurrency(targetDisplayAmount, displayCurrency, uiLocale, 0)}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#e32f8c] to-[#ff66b2] transition-all duration-300"
                            style={{ width: `${Math.max(4, tierProgressPct)}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-snug">
                          {isRo ? 'Mai ai nevoie de' : 'Remaining:'}{' '}
                          <strong className="text-zinc-200 tabular-nums">
                            {formatMoneyInCurrency(
                              remainingForTierDisplay,
                              displayCurrency,
                              uiLocale,
                              0
                            )}
                          </strong>
                          {hasInTransitForGoals && (
                            <span className="block text-amber-300/90 mt-0.5 tabular-nums">
                              +{inTransitSalesForGoalsDisplay}{' '}
                              {isRo ? 'în curs' : 'pending'}
                            </span>
                          )}
                        </p>
                      </div>
                    )}

                    {feedback && (
                      <p
                        className={`text-[10px] font-bold leading-snug rounded-lg px-2.5 py-1.5 border ${
                          feedback.type === 'success'
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                            : 'bg-red-500/15 border-red-500/30 text-red-300'
                        }`}
                      >
                        {feedback.message}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 6. MULTI-CURRENCY BREAKDOWN, COUNTRY PERFORMANCE & SALES HISTORY */}
        <section id="affiliate-orders-section" className="space-y-4">
          {Array.isArray(data.currencyBreakdown) && data.currencyBreakdown.length > 0 && (
            <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-[#09090d]/95 p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Coins size={16} className="text-[#ff66b2]" />
                <h2 className="text-xs font-black uppercase tracking-widest text-white">
                  {isRo ? 'Vânzări pe Monede' : 'Sales by Currency'}
                </h2>
              </div>

              <div className="flex flex-wrap gap-2">
                {data.currencyBreakdown.map((entry) => (
                  <div
                    key={entry.currency}
                    className="inline-flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.03] text-xs"
                  >
                    <span className="font-black text-white">
                      {entry.currency} ({entry.orders})
                    </span>
                    {entry.currency !== displayCurrency && (
                      <span className="text-[11px] font-mono text-zinc-400">
                        {formatNativeAmount(entry.salesNative, entry.currency, uiLocale)}
                      </span>
                    )}
                    <span className="text-[11px] font-bold text-zinc-200 tabular-nums">
                      {entry.currency === displayCurrency
                        ? formatMoneyInCurrency(entry.salesNative, displayCurrency, uiLocale, 2)
                        : formatMoney(entry.salesRon)}
                    </span>
                    <span className="text-[10px] font-black text-emerald-400 tabular-nums">
                      +{formatMoney(entry.commissionRon)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {countryBreakdown.length > 0 && (
            <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-[#09090d]/95 p-4 sm:p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Globe2 size={16} className="text-[#ff66b2]" />
                  <h2 className="text-xs font-black uppercase tracking-widest text-white">
                    {isRo ? 'Performanță pe Țări' : 'Performance by Country'}
                  </h2>
                </div>
                {selectedCountry !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCountry('ALL');
                      setCurrentPage(1);
                    }}
                    className="text-[11px] font-bold text-[#ff66b2] hover:text-white transition-colors cursor-pointer"
                  >
                    {isRo ? 'Resetează țara ✕' : 'Clear country ✕'}
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {countryBreakdown.map((c) => {
                  const isActive = selectedCountry === c.code;
                  const cName = isRo ? c.nameRo : c.nameEn;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        setSelectedCountry((prev) => (prev === c.code ? 'ALL' : c.code));
                        setCurrentPage(1);
                      }}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-left transition-all cursor-pointer active:scale-[0.98] ${
                        isActive
                          ? 'bg-[#e32f8c]/20 border-[#e32f8c]'
                          : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/10'
                      }`}
                    >
                      <CountryFlag code={c.code} name={cName} />
                      <span className="text-xs font-black text-white">{cName}</span>
                      {c.totalOrders > 0 && (
                        <span className="text-[10px] font-bold text-emerald-400">
                          {c.totalOrders} · +{formatMoney(c.totalCommissionRon)}
                        </span>
                      )}
                      {c.ga4Clicks > 0 && (
                        <span className="text-[10px] font-semibold text-zinc-400">
                          ({c.ga4Clicks}{' '}
                          {isRo
                            ? c.ga4Clicks === 1
                              ? 'click'
                              : 'click-uri'
                            : c.ga4Clicks === 1
                              ? 'click'
                              : 'clicks'}
                          )
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sales History Header + Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white flex items-center gap-2 font-heading">
                <Layers size={18} className="text-[#ff66b2]" />
                <span>{isRo ? 'Istoric Vânzări' : 'Sales History'}</span>
              </h2>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {isRo
                  ? 'Comenzile valide intră direct în sold; retururile/anulările se scad automat.'
                  : 'Valid orders credit immediately; returns/cancellations are deducted automatically.'}
              </p>
            </div>

            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={isRo ? 'Caută țară sau produs...' : 'Filter country or category...'}
                className="w-full sm:w-56 bg-[#09090d] border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#e32f8c] transition-colors"
              />
              <Search
                size={13}
                className="text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              />
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="rounded-2xl sm:rounded-3xl border border-dashed border-white/15 bg-[#09090d]/80 p-8 sm:p-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 mx-auto flex items-center justify-center text-zinc-400 mb-3">
                <ShoppingBag size={22} />
              </div>
              <p className="text-sm font-black uppercase text-white mb-1">
                {isRo ? 'Nicio vânzare în această selecție' : 'No sales match this selection'}
              </p>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-4">
                {isRo
                  ? 'Schimbă perioada, țara sau distribuie link-ul tău inteligent de mai sus.'
                  : 'Adjust your filters or share your smart link above.'}
              </p>
              {(period !== 'all' || selectedCountry !== 'ALL' || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setPeriod('all');
                    setSelectedCountry('ALL');
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="bg-white hover:bg-[#e32f8c] text-black hover:text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  {isRo ? 'Arată tot istoricul' : 'Show all sales'}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* Desktop Table Header */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b border-white/10">
                <div className="col-span-3">{isRo ? 'Țară & Dată' : 'Country & Date'}</div>
                <div className="col-span-4">{isRo ? 'Produse & Categorii' : 'Items & Categories'}</div>
                <div className="col-span-2">{isRo ? 'Status' : 'Status'}</div>
                <div className="col-span-1 text-right">{isRo ? 'Coș' : 'Order'}</div>
                <div className="col-span-2 text-right">{isRo ? 'Comision' : 'Commission'}</div>
              </div>

              {paginatedOrders.map((order) => {
                const formattedDate = new Date(order.date || order.createdAt).toLocaleDateString(
                  isRo ? 'ro-RO' : 'en-US',
                  { day: '2-digit', month: 'short', year: 'numeric' }
                );
                const formattedTime = new Date(order.date || order.createdAt).toLocaleTimeString(
                  isRo ? 'ro-RO' : 'en-US',
                  { hour: '2-digit', minute: '2-digit' }
                );

                const statusCheck = classifyOrderNonCountable(order.status);
                const payoutCheck = classifyAffiliateOrderPayoutStatus(order.status);
                const payoutStatus = order.payoutStatus || payoutCheck.payoutStatus;
                const isNonCountable =
                  !statusCheck.isCountable || order.isCountable === false || payoutStatus === 'voided';
                const isEligible = !isNonCountable && (payoutStatus === 'eligible' || activePendingPickup === 0);

                const statusLabel = isRo ? order.statusLabelRo : order.statusLabelEn;
                const payoutSubLabel = isEligible
                  ? isRo
                    ? 'Eligibilă'
                    : 'Eligible'
                  : isNonCountable
                    ? localizeNonCountableReason(
                        order.nonCountableReason || statusCheck.reason,
                        isRo
                      )
                    : isRo
                      ? 'În curs'
                      : 'Pending';

                const statusBadgeClass = isEligible
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                  : isNonCountable
                    ? 'bg-red-500/15 text-red-300 border-red-500/35'
                    : order.normalizedStatus === 'in_transit'
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/35'
                      : 'bg-sky-500/15 text-sky-300 border-sky-500/35';

                const countryName = isRo ? order.countryNameRo : order.countryNameEn;
                const hasForeignCurrency =
                  order.originalCurrency &&
                  order.originalCurrency !== displayCurrency &&
                  Number(order.originalTotalAmount) > 0;

                return (
                  <div
                    key={order.id}
                    className={`rounded-2xl border transition-all overflow-hidden ${
                      isNonCountable
                        ? 'border-white/5 bg-white/[0.02] opacity-75'
                        : 'border-white/10 hover:border-[#e32f8c]/40 bg-[#09090d]/95'
                    }`}
                  >
                    {/* Desktop Row */}
                    <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3.5 items-center">
                      <div className="col-span-3 flex items-center gap-2.5 min-w-0">
                        <CountryFlag code={order.countryCode} name={countryName} />
                        <div className="min-w-0">
                          <p className="text-xs font-black text-white truncate">{countryName}</p>
                          <p className="text-[11px] text-zinc-400 mt-0.5">
                            {formattedDate} · {formattedTime}
                          </p>
                        </div>
                      </div>

                      <div className="col-span-4 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-black text-zinc-200 bg-white/10 px-2 py-0.5 rounded-md shrink-0">
                          {order.itemsCount}{' '}
                          {order.itemsCount === 1
                            ? isRo
                              ? 'produs'
                              : 'item'
                            : isRo
                              ? 'produse'
                              : 'items'}
                        </span>
                        {order.categories.map((cat) => (
                          <span
                            key={cat.key}
                            className="text-[10px] font-semibold text-zinc-300 bg-white/[0.04] border border-white/10 px-2 py-0.5 rounded-md"
                          >
                            {cat.count > 1 ? `${cat.count}x ` : ''}
                            {isRo ? cat.labelRo : cat.labelEn}
                          </span>
                        ))}
                      </div>

                      <div className="col-span-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusBadgeClass}`}
                        >
                          {statusLabel}
                        </span>
                        <p className="text-[10px] font-semibold text-zinc-500 mt-0.5 pl-0.5">
                          {payoutSubLabel}
                        </p>
                      </div>

                      <div className="col-span-1 text-right">
                        <p
                          className={`text-xs font-black ${
                            isNonCountable ? 'text-zinc-500 line-through' : 'text-zinc-200'
                          }`}
                        >
                          {formatMoney(order.orderTotal)}
                        </p>
                        {hasForeignCurrency && (
                          <p className="text-[10px] text-zinc-500 mt-0.5">
                            {formatNativeAmount(
                              order.originalTotalAmount,
                              order.originalCurrency,
                              uiLocale
                            )}
                          </p>
                        )}
                      </div>

                      <div className="col-span-2 text-right">
                        {isNonCountable ? (
                          <span className="text-sm font-black text-zinc-500">{formatMoney(0)}</span>
                        ) : (
                          <span
                            className={`text-sm font-black ${
                              isEligible ? 'text-emerald-400' : 'text-amber-300'
                            }`}
                          >
                            +{formatMoney(order.commissionAmount)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Mobile Card */}
                    <div className="md:hidden p-3.5 space-y-2.5">
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <CountryFlag code={order.countryCode} name={countryName} />
                          <div className="min-w-0">
                            <p className="text-xs font-black text-white truncate">{countryName}</p>
                            <p className="text-[10px] text-zinc-400">
                              {formattedDate} · {formattedTime}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {isNonCountable ? (
                            <p className="text-xs font-black text-zinc-500">{formatMoney(0)}</p>
                          ) : (
                            <p
                              className={`text-xs font-black ${
                                isEligible ? 'text-emerald-400' : 'text-amber-300'
                              }`}
                            >
                              +{formatMoney(order.commissionAmount)}
                            </p>
                          )}
                          <p
                            className={`text-[10px] mt-0.5 ${
                              isNonCountable ? 'text-zinc-500 line-through' : 'text-zinc-400'
                            }`}
                          >
                            {isRo ? 'Coș: ' : 'Total: '}
                            {formatMoney(order.orderTotal)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-[10px] font-black text-zinc-200 bg-white/10 px-2 py-0.5 rounded-md">
                            {order.itemsCount}x
                          </span>
                          {order.categories.map((cat) => (
                            <span
                              key={cat.key}
                              className="text-[10px] font-semibold text-zinc-300 bg-white/[0.04] border border-white/10 px-2 py-0.5 rounded-md"
                            >
                              {cat.count > 1 ? `${cat.count}x ` : ''}
                              {isRo ? cat.labelRo : cat.labelEn}
                            </span>
                          ))}
                        </div>

                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${statusBadgeClass}`}
                        >
                          {statusLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/10">
              <p className="text-[11px] text-zinc-400">
                {(currentPage - 1) * itemsPerPage + 1}–
                {Math.min(currentPage * itemsPerPage, filteredOrders.length)}{' '}
                {isRo ? 'din' : 'of'} {filteredOrders.length}
              </p>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="w-8 h-8 rounded-lg border border-white/10 bg-[#09090d] hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-zinc-200 cursor-pointer"
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => handlePageChange(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold cursor-pointer ${
                      pageNum === currentPage
                        ? 'bg-[#e32f8c] text-white font-black'
                        : 'border border-white/10 bg-[#09090d] hover:bg-white/10 text-zinc-300'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 rounded-lg border border-white/10 bg-[#09090d] hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-zinc-200 cursor-pointer"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </section>

        {/* 7. GHID PENTRU CREATORI & PACHETE DE HASHTAG-URI */}
        <section className="rounded-2xl sm:rounded-3xl border border-white/10 bg-gradient-to-b from-[#0c0c12] to-[#08080c] p-4 sm:p-6 shadow-2xl space-y-5">
          <div className="border-b border-white/10 pb-3.5">
            <span className="block text-[10px] font-black uppercase tracking-widest text-[#ff66b2]">
              {isRo ? 'Ghid pentru Creatori' : 'Creator Guide'}
            </span>
            <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white font-heading mt-0.5">
              {isRo ? 'Integrare naturală & ghid de filmare' : 'Natural Integration & Filming Guide'}
            </h2>
          </div>

          {/* Part A: Content Mix — Organic vs. Direct Promo */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">
              {isRo ? 'Cum combini natural clipurile' : 'Blending Organic Clips & Promo'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {clipGuideCards.map((card) => (
                <div
                  key={card.id}
                  className="rounded-xl bg-black/45 border border-white/10 p-3.5 space-y-1.5"
                >
                  <p className="text-xs font-black text-white">{card.title}</p>
                  <p className="text-[11px] text-zinc-400 leading-snug">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Part B: By Product */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">
              {isRo ? 'Pe fiecare produs' : 'By Product'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {productMiniCards.map((prod) => (
                <div
                  key={prod.id}
                  className="rounded-xl bg-white/[0.03] border border-white/10 p-3.5 space-y-1.5"
                >
                  <p className="text-xs font-black text-white">{prod.title}</p>
                  <p className="text-[11px] text-zinc-300 leading-snug">
                    <strong className="text-[#ff66b2]">{isRo ? 'Cum porți:' : 'Fit:'}</strong>{' '}
                    {prod.wear}
                  </p>
                  <p className="text-[11px] text-zinc-400 leading-snug">
                    <strong className="text-zinc-200">{isRo ? 'Unghiuri:' : 'Angles:'}</strong>{' '}
                    {prod.film}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Part C: Product Hashtag Packs (5 per clip) */}
          <div className="space-y-2.5">
            <div className="space-y-1">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">
                {isRo
                  ? 'Idei de hashtag-uri pe produs (5 per clip)'
                  : 'Product Hashtag Ideas (5 per clip)'}
              </h3>
              <p className="text-[11px] text-zinc-400">
                {isRo
                  ? 'Alege pachetul pentru produsul purtat în clip — funcționează și pe clipuri naturale de sală, fără text comercial.'
                  : 'Pick the set matching the gear in your clip — works cleanly for organic workout reels without salesy captions.'}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {productHashtagPacks.map((pack) => {
                const isCopied = copiedId === pack.id;
                return (
                  <div
                    key={pack.id}
                    className="rounded-xl bg-black/40 border border-white/10 p-3.5 flex flex-col justify-between gap-2.5"
                  >
                    <div className="space-y-2">
                      <span className="block text-[10px] font-black uppercase tracking-wider text-[#ff66b2]">
                        {pack.tag}
                      </span>
                      <p className="text-xs text-zinc-300 leading-snug">{pack.angle}</p>
                      <div className="rounded-lg bg-white/[0.03] border border-white/10 px-2.5 py-2 font-mono text-[11px] text-zinc-100 break-words">
                        {pack.hashtags}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => triggerCopy(pack.id, pack.hashtags)}
                      className={`self-start inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        isCopied
                          ? 'bg-emerald-500 text-black'
                          : 'bg-white/10 hover:bg-[#e32f8c] text-white'
                      }`}
                    >
                      {isCopied ? <Check size={12} /> : <Copy size={12} />}
                      <span>
                        {isCopied ? (isRo ? 'Copiat!' : 'Copied!') : isRo ? 'Copiază' : 'Copy'}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Precomandă vs Stoc */}
          <div className="rounded-xl bg-[#e32f8c]/10 border border-[#e32f8c]/30 px-3.5 py-3 flex items-start gap-2.5">
            <Info size={15} className="text-[#ff66b2] shrink-0 mt-0.5" />
            <p className="text-[11px] sm:text-xs text-zinc-200 leading-snug">
              <strong className="text-white">
                {isRo ? 'Precomandă vs. Stoc:' : 'Pre-Order vs. Stock:'}
              </strong>{' '}
              {isRo
                ? `Dacă o culoare apare pe precomandă între loturi, codul ${data.code} (-${discountDisplay}) funcționează normal, iar comisionul se contorizează imediat în cont.`
                : `If a colorway is on pre-order between drops, code ${data.code} (-${discountDisplay}) still works normally and credits immediately to your balance.`}
            </p>
          </div>
        </section>

        {/* 8. DATE PLATĂ (IBAN) & ISTORIC PLĂȚI */}
        <section id="affiliate-payout-section" className="space-y-3.5">
          {paymentDetails?.iban ? (
            <div className="bg-[#09090d]/95 border border-emerald-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <CreditCard size={18} />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] uppercase font-black tracking-widest text-emerald-300">
                      {isRo ? 'IBAN Activ pentru Plată' : 'Active Payout IBAN'}
                    </span>
                    {paymentDetails.bankName && (
                      <span className="text-[10px] font-bold text-zinc-200 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
                        {paymentDetails.bankName}
                      </span>
                    )}
                  </div>
                  <p className="text-sm sm:text-base font-mono font-black text-white tracking-wider break-all">
                    {formatIban(paymentDetails.iban)}
                  </p>
                  {paymentDetails.accountHolder && (
                    <p className="text-[11px] text-zinc-400">
                      {isRo ? 'Titular: ' : 'Holder: '}
                      <strong className="text-zinc-200">{paymentDetails.accountHolder}</strong>
                    </p>
                  )}
                  <p className="text-[11px] text-zinc-400 pt-0.5">
                    {isRo
                      ? `Comenzile valide intră direct în sold; retururile/anulările se scad automat (prag minim ${minWithdrawalLabel}).`
                      : `Valid orders credit immediately; returns/cancellations are deducted automatically (min ${minWithdrawalLabel}).`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                <button
                  type="button"
                  onClick={handleOpenEditIban}
                  className="flex-1 md:flex-initial bg-white/5 hover:bg-white/10 text-white text-xs font-bold px-3.5 py-2 rounded-xl border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Pencil size={13} />
                  <span>{isRo ? 'Editează' : 'Edit'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex-1 md:flex-initial bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-bold px-3.5 py-2 rounded-xl border border-red-500/30 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>{isRo ? 'Șterge' : 'Delete'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300 shrink-0">
                  <Clock size={18} />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-white">
                    {isRo
                      ? 'Adaugă contul IBAN pentru viramentul comisioanelor.'
                      : 'Add your payout IBAN to receive eligible commissions.'}
                  </p>
                  <p className="text-[11px] text-amber-200/80">
                    {isRo
                      ? `Comenzile valide intră direct în sold; retururile/anulările se scad automat (prag minim ${minWithdrawalLabel}).`
                      : `Valid orders credit immediately; returns/cancellations are deducted automatically (min ${minWithdrawalLabel}).`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleOpenEditIban}
                className="w-full sm:w-auto shrink-0 bg-[#e32f8c] hover:bg-[#ff3b9e] text-white text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                {isRo ? '+ Adaugă IBAN' : '+ Add IBAN'}
              </button>
            </div>
          )}

          {/* Payout History */}
          {Array.isArray(data.payoutHistory) && data.payoutHistory.length > 0 && (
            <div className="rounded-2xl sm:rounded-3xl p-4 sm:p-5 bg-[#09090d]/95 border border-white/10 shadow-xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                    {isRo ? 'Istoric Plăți Primite' : 'Payouts Received'}
                  </h3>
                </div>
                <span className="text-[11px] font-black text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                  {data.payoutProgressPercent ?? 0}% {isRo ? 'achitat' : 'settled'} ·{' '}
                  {formatMoney(data.paidPayout)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {data.payoutHistory.map((payout) => (
                  <div
                    key={payout.id}
                    className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col justify-between gap-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-black text-emerald-400">
                        +{formatMoney(payout.amount)}
                      </span>
                      {payout.paidAt && (
                        <span className="text-[11px] text-zinc-400">
                          {new Date(payout.paidAt).toLocaleDateString(isRo ? 'ro-RO' : 'en-US', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                    {payout.note && (
                      <p className="text-[11px] text-zinc-300 truncate">
                        {localizePayoutNote(payout.note, isRo)}
                      </p>
                    )}
                    {payout.ibanSnapshot && (
                      <p className="text-[10px] font-mono text-zinc-500 truncate">
                        IBAN: {payout.ibanSnapshot}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* IBAN / PAYOUT DETAILS MODAL */}
      <AnimatePresence>
        {isIbanModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsIbanModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative w-full max-w-md bg-[#0b0b10] border border-white/15 rounded-3xl p-6 shadow-2xl z-10 text-white"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-white font-heading">
                    {isRo ? 'Date Plată Comisioane' : 'Payout Details'}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {isRo
                      ? 'Contul bancar unde primești comisioanele eligibile.'
                      : 'Bank account where your eligible payouts are sent.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsIbanModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 flex items-center justify-center cursor-pointer"
                  aria-label={isRo ? 'Închide' : 'Close'}
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveIban} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    {isRo ? 'Cont IBAN' : 'IBAN Account'}
                  </label>
                  <input
                    type="text"
                    required
                    value={ibanInput}
                    onChange={(e) => setIbanInput(e.target.value.toUpperCase())}
                    placeholder={isRo ? 'RO49AAAA1B31007593840000' : 'GB29NWBK60161331926819'}
                    className="w-full bg-white/[0.04] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-white placeholder-zinc-500 focus:outline-none focus:border-[#e32f8c]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    {isRo ? 'Nume Bancă' : 'Bank Name'}
                  </label>
                  <input
                    type="text"
                    value={bankNameInput}
                    onChange={(e) => setBankNameInput(e.target.value)}
                    placeholder={isRo ? 'ex: Banca Transilvania, ING, Revolut' : 'e.g. Revolut, Wise'}
                    className="w-full bg-white/[0.04] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white placeholder-zinc-500 focus:outline-none focus:border-[#e32f8c]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    {isRo ? 'Titular Cont' : 'Account Holder'}
                  </label>
                  <input
                    type="text"
                    value={holderInput}
                    onChange={(e) => setHolderInput(e.target.value)}
                    placeholder={isRo ? 'Nume Prenume' : 'First & Last Name'}
                    className="w-full bg-white/[0.04] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white placeholder-zinc-500 focus:outline-none focus:border-[#e32f8c]"
                  />
                </div>

                {ibanError && (
                  <div className="bg-red-500/15 border border-red-500/35 text-red-300 text-xs font-bold p-3 rounded-xl">
                    {ibanError}
                  </div>
                )}

                {ibanSuccess && (
                  <div className="bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                    <CheckCircle2 size={15} />
                    <span>
                      {isRo ? 'Datele bancare au fost salvate!' : 'Payout details saved!'}
                    </span>
                  </div>
                )}

                <div className="pt-2 flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsIbanModalOpen(false)}
                    className="flex-1 bg-white/10 hover:bg-white/15 text-zinc-200 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    {isRo ? 'Anulează' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={ibanSaving}
                    className="flex-1 bg-[#e32f8c] hover:bg-[#ff3b9e] text-white py-2.5 rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {ibanSaving ? (
                      <>
                        <Loader2 size={14} className="animate-spin shrink-0" />
                        <span>{isRo ? 'Se salvează...' : 'Saving...'}</span>
                      </>
                    ) : (
                      <span>{isRo ? 'Salvează' : 'Save'}</span>
                    )}
                  </button>
                </div>

                {paymentDetails.iban && (
                  <div className="pt-2 border-t border-white/10 flex justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        setIsIbanModalOpen(false);
                        setShowDeleteConfirm(true);
                      }}
                      className="text-xs text-red-400 hover:text-red-300 font-bold flex items-center gap-1.5 py-1 px-3 rounded-lg hover:bg-red-500/10 cursor-pointer"
                    >
                      <Trash2 size={13} />
                      <span>{isRo ? 'Șterge acest cont IBAN' : 'Delete this IBAN'}</span>
                    </button>
                  </div>
                )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE IBAN CONFIRMATION MODAL */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-[#0b0b10] rounded-3xl p-6 shadow-2xl z-10 border border-white/15 text-white"
            >
              <div className="w-11 h-11 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center mb-3.5">
                <Trash2 size={20} />
              </div>
              <h4 className="text-base font-black text-white uppercase font-heading">
                {isRo ? 'Ștergi contul IBAN?' : 'Delete IBAN?'}
              </h4>
              <p className="text-xs text-zinc-400 mt-1 mb-5 leading-relaxed">
                {isRo
                  ? 'Viramentele vor fi puse pe pauză până adaugi un nou cont IBAN.'
                  : 'Payouts will pause until a new IBAN is added.'}
              </p>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/15 text-xs font-bold text-zinc-200 hover:bg-white/10 cursor-pointer"
                >
                  {isRo ? 'Anulează' : 'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={ibanDeleting}
                  onClick={handleDeleteIban}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {ibanDeleting ? (
                    <>
                      <Loader2 size={14} className="animate-spin shrink-0" />
                      <span>{isRo ? 'Se șterge...' : 'Deleting...'}</span>
                    </>
                  ) : (
                    <span>{isRo ? 'Șterge' : 'Delete'}</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
