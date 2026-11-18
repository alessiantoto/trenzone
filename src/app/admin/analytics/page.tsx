"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Award,
  BarChart3,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  Filter,
  Flame,
  Gift,
  Globe,
  Languages,
  Layers,
  Loader2,
  Mail,
  MapPin,
  Monitor,
  Package,
  RefreshCw,
  RotateCcw,
  Search,
  Share2,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Tablet,
  Tag,
  Ticket,
  TrendingUp,
  Truck,
  Users,
  Zap,
} from 'lucide-react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  AnalyticsRangeKey,
  Ga4AnalyticsReport,
  Ga4DeviceFilter,
  Ga4GranularityOption,
} from '@/lib/ga4-analytics';
import { ModernSelect, type ModernSelectOption } from '@/components/admin/ModernSelect';
import { AdminPagination } from '@/components/admin/AdminPagination';

interface CurrencyBreakdownEntry {
  currency: 'RON' | 'EUR' | 'USD' | 'GBP';
  orders: number;
  revenueNative: number;
  revenueRon: number;
}

interface CountrySalesEntry {
  countryCode: string;
  countryName: string;
  flag?: string;
  orders: number;
  revenueRon: number;
  sharePct: number;
}

interface TopAffiliateCountryEntry {
  countryCode: string;
  countryName: string;
  flag?: string;
  orders: number;
  revenueRon: number;
}

interface TopAffiliateEntry {
  id: string;
  name: string;
  code: string;
  commissionPercent: number;
  orders: number;
  revenueRon: number;
  commissionRon: number;
  clicks: number;
  uniqueVisitors: number;
  clickConversionPct: number | null;
  sharePct: number;
  topCountries: TopAffiliateCountryEntry[];
}

interface ReferralTopCodeEntry {
  code: string;
  affiliateName: string | null;
  clicks: number;
  uniqueVisitors: number;
  orders: number;
  clickConversionPct: number | null;
}

interface ReferralSummary {
  connected: boolean;
  totalClicks: number;
  totalUsers: number;
  topByClicks: ReferralTopCodeEntry[];
}

interface AnalyticsApiResponse {
  success: boolean;
  range: AnalyticsRangeKey;
  filters?: {
    device: Ga4DeviceFilter;
    channel: string;
    country: string;
    granularity: Ga4GranularityOption;
    salesCountry?: string;
  };
  period: {
    startDate: string;
    endDate: string;
    prevStartDate: string;
    prevEndDate: string;
    granularity?: 'hourly' | 'daily';
  };
  exchangeRates?: Record<string, number>;
  currencyBreakdown?: CurrencyBreakdownEntry[];
  countrySalesBreakdown?: CountrySalesEntry[];
  topAffiliates?: TopAffiliateEntry[];
  referralSummary?: ReferralSummary;
  ga4: Ga4AnalyticsReport;
  funnel: {
    ga4Connected: boolean;
    sessions: number | null;
    viewItem: number | null;
    addToCart: number | null;
    beginCheckout: number | null;
    supabaseCheckouts: number;
    orders: number;
    overallConversionPct: number | null;
  };
  productComparison: Array<{
    name: string;
    slug: string | null;
    views: number;
    addToCart: number;
    soldQty: number;
    revenueRon: number;
    viewToBuyPct: number | null;
  }>;
  supabaseMarketing: {
    ordersInPeriod: number;
    revenueInPeriodRon: number;
    currencyBreakdown?: CurrencyBreakdownEntry[];
    scratchCard: {
      generatedInPeriod: number;
      redeemedInPeriod: number;
      conversionRatePct: number;
      revenueRon: number;
      discountRon: number;
      totalAllTime: number;
      usedAllTime: number;
    };
    coupons: {
      ordersWithCouponCount: number;
      couponSharePct: number;
      totalDiscountGrantedRon: number;
      categories: {
        scratch: { label: string; orders: number; revenueRon: number; discountRon: number };
        tren5: { label: string; orders: number; revenueRon: number; discountRon: number };
        affiliate: { label: string; orders: number; revenueRon: number; discountRon: number };
        other: { label: string; orders: number; revenueRon: number; discountRon: number };
      };
      topCoupons: Array<{
        code: string;
        category: string;
        affiliateName?: string;
        orders: number;
        revenueRon: number;
        discountRon: number;
      }>;
    };
    leads: {
      totalSubscribersAllTime: number;
      activeSubscribersAllTime: number;
      subscribersInPeriod: number;
      contactLeadsInPeriod: number;
      contactLeadsAllTime: number;
      sources: Array<{
        key: string;
        label: string;
        allTime: number;
        inPeriod: number;
        activeAllTime: number;
      }>;
    };
    payments: {
      card: {
        count: number;
        percentage: number;
        revenueRon: number;
        applePayCount: number;
        googlePayCount: number;
      };
      ramburs: {
        count: number;
        percentage: number;
        revenueRon: number;
      };
    };
    shipping: Array<{
      key: string;
      label: string;
      count: number;
      revenueRon: number;
      percentage: number;
    }>;
  };
  error?: string;
}

const RANGE_OPTIONS: Array<{ key: AnalyticsRangeKey; label: string }> = [
  { key: 'today', label: 'Astăzi' },
  { key: 'yesterday', label: 'Ieri' },
  { key: '7d', label: '7 zile' },
  { key: '30d', label: '30 zile' },
  { key: '90d', label: '90 zile' },
];

const DEVICE_OPTIONS: Array<{ key: Ga4DeviceFilter; label: string }> = [
  { key: 'all', label: 'Toate' },
  { key: 'mobile', label: 'Mobile' },
  { key: 'desktop', label: 'Desktop' },
  { key: 'tablet', label: 'Tablet' },
];

type ChartMetric = 'sessions' | 'engagedSessions' | 'users' | 'pageviews';
type DisplayCurrency = 'RON' | 'EUR' | 'USD' | 'GBP';
type PagesTab = 'landing' | 'all';

const AVAILABLE_CURRENCIES: Array<{ code: DisplayCurrency; symbol: string }> = [
  { code: 'RON', symbol: 'RON' },
  { code: 'EUR', symbol: '€' },
  { code: 'USD', symbol: '$' },
  { code: 'GBP', symbol: '£' },
];

const FALLBACK_EXCHANGE_RATES: Record<string, number> = {
  EUR: 5.3,
  USD: 4.88,
  GBP: 6.2,
};

const EVENT_LABELS: Record<string, string> = {
  page_view: 'Afișare pagină',
  session_start: 'Start sesiune',
  first_visit: 'Prima vizită',
  user_engagement: 'Interacțiune activă',
  scroll: 'Scroll 90%',
  click: 'Click extern',
  view_item: 'Vizualizare produs',
  add_to_cart: 'Adăugare în coș',
  begin_checkout: 'Inițiere checkout',
  purchase: 'Achiziție finalizată',
  form_start: 'Începere formular',
  form_submit: 'Trimitere formular',
};

function convertRonForDisplay(
  ronAmount: number,
  currencyCode: DisplayCurrency,
  rates?: Record<string, number>
): number {
  const num = Number(ronAmount) || 0;
  if (currencyCode === 'RON') return num;
  const rawRate = rates?.[currencyCode] || FALLBACK_EXCHANGE_RATES[currencyCode] || 1;
  const isRonPerUnit = rawRate > 1.05;
  const foreignPerRon = isRonPerUnit ? 1 / rawRate : rawRate;
  return num * foreignPerRon;
}

function formatMoneyInCurrency(
  ronAmount: number,
  currencyCode: DisplayCurrency,
  rates?: Record<string, number>
): string {
  const converted = convertRonForDisplay(ronAmount, currencyCode, rates);
  const symbol = AVAILABLE_CURRENCIES.find((c) => c.code === currencyCode)?.symbol || currencyCode;
  return `${converted.toLocaleString('ro-RO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${symbol}`;
}

function formatDuration(totalSec: number): string {
  const sec = Math.max(0, Math.round(totalSec || 0));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

function formatRealtimePageTitle(rawTitle: string): string {
  const trimmed = String(rawTitle || '').trim();
  if (!trimmed) return 'Pagină';
  const stripped = trimmed
    .replace(/^TREN\s*WRAPS\s*(?:by\s*Vlad\s*Tren)?\s*[|–—-]\s*/i, '')
    .replace(/^TrenZone\s*[|–—-]\s*/i, '')
    .replace(/\s*[|–—-]\s*TREN\s*WRAPS\s*(?:by\s*Vlad\s*Tren)?$/i, '')
    .replace(/\s*[|–—-]\s*TrenZone$/i, '')
    .trim();
  return stripped || 'Acasă (TREN WRAPS)';
}

function DeltaPill({
  pct,
  dark = false,
  invert = false,
}: {
  pct: number | null | undefined;
  dark?: boolean;
  invert?: boolean;
}) {
  if (pct === null || pct === undefined || Number.isNaN(pct)) return null;
  const good = invert ? pct <= 0 : pct >= 0;
  return (
    <span
      className={`inline-flex items-center text-[10px] font-black px-1.5 py-0.5 rounded-md leading-none tabular-nums ${
        good
          ? dark
            ? 'text-emerald-400 bg-emerald-500/15'
            : 'text-emerald-700 bg-emerald-50'
          : dark
            ? 'text-rose-400 bg-rose-500/15'
            : 'text-rose-700 bg-rose-50'
      }`}
    >
      {pct >= 0 ? `+${pct}%` : `${pct}%`}
    </span>
  );
}

function SourceBarColor(sourceMedium: string): string {
  const lower = sourceMedium.toLowerCase();
  if (lower.includes('tiktok')) return 'bg-slate-900';
  if (lower.includes('instagram')) return 'bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600';
  if (lower.includes('google')) return 'bg-blue-600';
  if (lower.includes('facebook') || lower.includes('fb')) return 'bg-indigo-600';
  if (lower.includes('direct')) return 'bg-emerald-600';
  return 'bg-[#e32f8c]';
}

function ChannelBarColor(channelGroup: string): string {
  const lower = channelGroup.toLowerCase();
  if (lower.includes('social')) return '#e32f8c';
  if (lower.includes('direct')) return '#10b981';
  if (lower.includes('search')) return '#2563eb';
  if (lower.includes('referral')) return '#8b5cf6';
  if (lower.includes('paid')) return '#f59e0b';
  return '#475569';
}

function paginateSlice<T>(items: T[], page: number, pageSize: number): T[] {
  const totalPages = Math.max(1, Math.ceil(items.length / Math.max(1, pageSize)));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState<AnalyticsRangeKey>('30d');
  const [deviceFilter, setDeviceFilter] = useState<Ga4DeviceFilter>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [granularityFilter, setGranularityFilter] = useState<Ga4GranularityOption>('auto');
  const [salesCountryFilter, setSalesCountryFilter] = useState<string>('all');

  const [knownChannels, setKnownChannels] = useState<string[]>([]);
  const [knownCountries, setKnownCountries] = useState<string[]>([]);

  const [selectedCurrency, setSelectedCurrency] = useState<DisplayCurrency>('RON');
  const [chartMetric, setChartMetric] = useState<ChartMetric>('sessions');
  const [comparePrevious, setComparePrevious] = useState(true);
  const [pagesTab, setPagesTab] = useState<PagesTab>('landing');
  const [pageSearch, setPageSearch] = useState('');

  const [affiliateSearch, setAffiliateSearch] = useState('');
  const [affiliateActivityOnly, setAffiliateActivityOnly] = useState(true);
  const [affiliatesPage, setAffiliatesPage] = useState(1);
  const [refLinksPage, setRefLinksPage] = useState(1);
  const [pagesPage, setPagesPage] = useState(1);
  const [couponsPage, setCouponsPage] = useState(1);
  const [sourcesPage, setSourcesPage] = useState(1);
  const [campaignsPage, setCampaignsPage] = useState(1);
  const [eventsPage, setEventsPage] = useState(1);
  const [countriesPage, setCountriesPage] = useState(1);
  const [citiesPage, setCitiesPage] = useState(1);
  const [productsPage, setProductsPage] = useState(1);

  const [data, setData] = useState<AnalyticsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef(false);

  const formatMoney = useCallback(
    (ronAmount: number) => formatMoneyInCurrency(ronAmount, selectedCurrency, data?.exchangeRates),
    [selectedCurrency, data?.exchangeRates]
  );

  const loadAnalytics = useCallback(
    async (
      params: {
        range: AnalyticsRangeKey;
        device: Ga4DeviceFilter;
        channel: string;
        country: string;
        granularity: Ga4GranularityOption;
        salesCountry: string;
      },
      isRefresh = false
    ) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setErrorMsg(null);

      try {
        const qs = new URLSearchParams({
          range: params.range,
          device: params.device,
          channel: params.channel,
          country: params.country,
          granularity: params.granularity,
          salesCountry: params.salesCountry,
        });
        const res = await fetch(`/api/admin/analytics?${qs.toString()}`, {
          cache: 'no-store',
        });
        const json: AnalyticsApiResponse = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Nu s-au putut încărca datele de analytics.');
        }
        setData(json);
        hasLoadedOnceRef.current = true;

        // Preserve selectable filter options even when a specific channel/country filter is active
        const fetchedChannels = (json.ga4?.channels || []).map((c) => c.channelGroup).filter(Boolean);
        if (fetchedChannels.length > 0) {
          setKnownChannels((prev) => Array.from(new Set([...prev, ...fetchedChannels])));
        }
        const fetchedCountries = (json.ga4?.countries || [])
          .map((c) => c.name)
          .filter((n) => n && n !== 'Necunoscut');
        if (fetchedCountries.length > 0) {
          setKnownCountries((prev) => Array.from(new Set([...prev, ...fetchedCountries])));
        }
      } catch (err: any) {
        setErrorMsg(err?.message || 'Eroare la încărcarea datelor.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    setAffiliatesPage(1);
    setRefLinksPage(1);
    setPagesPage(1);
    setCouponsPage(1);
    setSourcesPage(1);
    setCampaignsPage(1);
    setEventsPage(1);
    setCountriesPage(1);
    setCitiesPage(1);
    setProductsPage(1);
    loadAnalytics(
      {
        range,
        device: deviceFilter,
        channel: channelFilter,
        country: countryFilter,
        granularity: granularityFilter,
        salesCountry: salesCountryFilter,
      },
      hasLoadedOnceRef.current
    );
  }, [
    range,
    deviceFilter,
    channelFilter,
    countryFilter,
    granularityFilter,
    salesCountryFilter,
    loadAnalytics,
  ]);

  const handleRangeChange = (nextRange: AnalyticsRangeKey) => {
    setRange(nextRange);
    setGranularityFilter('auto');
  };

  const resetFilters = () => {
    setDeviceFilter('all');
    setChannelFilter('all');
    setCountryFilter('all');
    setGranularityFilter('auto');
  };

  const hasActiveFilters =
    deviceFilter !== 'all' ||
    channelFilter !== 'all' ||
    countryFilter !== 'all' ||
    granularityFilter !== 'auto';

  const channelSelectOptions = useMemo<ModernSelectOption[]>(
    () => [
      { value: 'all', label: 'Toate canalele' },
      ...knownChannels.map((ch) => ({
        value: ch,
        label: ch,
      })),
    ],
    [knownChannels]
  );

  const countrySelectOptions = useMemo<ModernSelectOption[]>(
    () => [
      { value: 'all', label: 'Toate țările' },
      ...knownCountries.map((co) => ({
        value: co,
        label: co,
      })),
    ],
    [knownCountries]
  );

  const salesCountryOptions = useMemo<ModernSelectOption[]>(() => {
    const breakdown = data?.countrySalesBreakdown || [];
    const totalOrders = data?.supabaseMarketing?.ordersInPeriod || 0;
    return [
      {
        value: 'all',
        label: 'Toate țările',
        badge: totalOrders > 0 ? `${totalOrders}` : undefined,
        icon: <Globe size={13} className="text-[#e32f8c]" />,
      },
      ...breakdown.map((c) => ({
        value: c.countryCode,
        label: c.countryName,
        sublabel: `${c.sharePct}% din comenzi`,
        flag: c.flag || '🌐',
        badge: `${c.orders}`,
        keywords: `${c.countryCode} ${c.countryName}`,
      })),
    ];
  }, [data?.countrySalesBreakdown, data?.supabaseMarketing?.ordersInPeriod]);

  const chartSeries = useMemo(() => {
    const raw = data?.ga4?.timeseries || [];
    return raw.map((pt) => ({
      label: pt.label,
      current:
        chartMetric === 'sessions'
          ? pt.sessions
          : chartMetric === 'engagedSessions'
            ? pt.engagedSessions
            : chartMetric === 'users'
              ? pt.users
              : pt.pageviews,
      previous:
        chartMetric === 'sessions'
          ? pt.prevSessions
          : chartMetric === 'engagedSessions'
            ? pt.prevEngagedSessions
            : chartMetric === 'users'
              ? pt.prevUsers
              : pt.prevPageviews,
    }));
  }, [data?.ga4?.timeseries, chartMetric]);

  const peakHoursSummary = useMemo(() => {
    const profile = data?.ga4?.hourlyProfile || [];
    if (profile.length === 0) return null;
    const sorted = [...profile].sort((a, b) => b.sessions - a.sessions);
    const top = sorted[0];
    if (!top || top.sessions === 0) return null;
    const topThree = sorted
      .filter((h) => h.sessions > 0)
      .slice(0, 3)
      .map((h) => h.label);
    return {
      peakLabel: top.label,
      peakSessions: top.sessions,
      topThreeLabels: topThree,
    };
  }, [data?.ga4?.hourlyProfile]);

  const filteredTopPages = useMemo(() => {
    const list = data?.ga4?.topPages || [];
    const q = pageSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (p) => p.path.toLowerCase().includes(q) || p.title.toLowerCase().includes(q)
    );
  }, [data?.ga4?.topPages, pageSearch]);

  const filteredLandingPages = useMemo(() => {
    const list = data?.ga4?.landingPages || [];
    const q = pageSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) => p.path.toLowerCase().includes(q));
  }, [data?.ga4?.landingPages, pageSearch]);

  const rankedAffiliates = useMemo(
    () =>
      (data?.topAffiliates || []).map((aff, index) => ({
        ...aff,
        rank: index + 1,
      })),
    [data?.topAffiliates]
  );

  const activeAffiliatesCount = useMemo(
    () => rankedAffiliates.filter((aff) => aff.orders > 0 || aff.clicks > 0).length,
    [rankedAffiliates]
  );

  const filteredAffiliates = useMemo(() => {
    const q = affiliateSearch.trim().toLowerCase();
    return rankedAffiliates.filter((aff) => {
      if (affiliateActivityOnly && aff.orders === 0 && aff.clicks === 0) {
        return false;
      }
      if (!q) return true;
      return aff.name.toLowerCase().includes(q) || aff.code.toLowerCase().includes(q);
    });
  }, [rankedAffiliates, affiliateActivityOnly, affiliateSearch]);

  if (loading && !data) {
    return (
      <div className="pb-16 text-slate-900 max-w-[1400px] mx-auto space-y-5 sm:space-y-6 animate-pulse">
        {/* Header + Range Pills Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="h-6 w-6 rounded-lg bg-slate-200" />
              <div className="h-6 w-64 sm:w-80 rounded-lg bg-slate-200" />
              <div className="h-5 w-24 rounded-full bg-slate-100" />
            </div>
            <div className="h-3.5 w-64 rounded bg-slate-100" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-7 w-14 rounded-lg bg-slate-200/80" />
              ))}
            </div>
            <div className="h-9 w-36 rounded-xl bg-slate-100" />
            <div className="h-9 w-24 rounded-xl bg-slate-200" />
          </div>
        </div>

        {/* Dark Hero Skeleton */}
        <div className="bg-[#09090d] rounded-3xl p-4 sm:p-6 shadow-2xl border border-white/10 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
            <div className="h-9 w-56 rounded-2xl bg-white/10" />
            <div className="flex items-center gap-2">
              <div className="h-6 w-24 rounded-full bg-white/[0.07]" />
              <div className="h-6 w-28 rounded-full bg-white/[0.07]" />
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl p-3.5 border border-white/[0.08] bg-white/[0.04] space-y-2">
                <div className="h-3 w-20 rounded bg-white/10" />
                <div className="flex items-baseline justify-between gap-2">
                  <div className="h-7 w-20 rounded bg-white/15" />
                  <div className="h-4 w-10 rounded bg-white/10" />
                </div>
              </div>
            ))}
          </div>

          <div className="h-[220px] sm:h-[260px] w-full rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-end gap-2 sm:gap-3 p-4 pt-8">
            {[42, 65, 50, 80, 68, 90, 58, 74, 85, 62, 78, 88].map((h, i) => (
              <div key={i} style={{ height: `${h}%` }} className="flex-1 rounded-t-lg bg-white/[0.06]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const ga4 = data?.ga4;
  const ga4Ready = Boolean(ga4?.configured && !ga4?.error);
  const overview = ga4?.overview;
  const realtime = ga4?.realtime;
  const mkt = data?.supabaseMarketing;
  const funnel = data?.funnel;
  const activeGranularity = ga4?.granularity || 'daily';

  const newUsersPct =
    overview && overview.totalUsers > 0
      ? Math.round((overview.newUsers / overview.totalUsers) * 100)
      : 0;

  const chartStrokeColor =
    chartMetric === 'sessions'
      ? '#e32f8c'
      : chartMetric === 'engagedSessions'
        ? '#a855f7'
        : chartMetric === 'users'
          ? '#38bdf8'
          : '#10b981';

  return (
    <div className="animate-in fade-in duration-500 pb-16 text-slate-900 max-w-[1400px] mx-auto space-y-5 sm:space-y-6">
      {/* ========================================================================= */}
      {/* TOP HEADER & RANGE CONTROLS                                               */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Activity size={20} className="text-[#e32f8c] shrink-0" />
              <h1 className="text-base sm:text-xl font-black tracking-tight text-slate-900 leading-tight">
                Web Analytics & Statistici Marketing
              </h1>
              {ga4Ready ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <CheckCircle2 size={11} /> GA4 Conectat
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                  <AlertTriangle size={11} /> GA4 Neconfigurat
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-1 leading-relaxed">
              {data?.period
                ? `Interval: ${data.period.startDate} – ${data.period.endDate} (comparat cu ${data.period.prevStartDate} – ${data.period.prevEndDate})`
                : 'Google Analytics 4 Data API + Supabase Marketing'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:flex-wrap">
            {/* Range Segmented Control */}
            <div className="grid grid-cols-5 sm:inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => handleRangeChange(opt.key)}
                  className={`px-1.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all active:scale-[0.98] cursor-pointer inline-flex items-center justify-center gap-1 whitespace-nowrap ${
                    range === opt.key
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                  }`}
                >
                  {loading && range === opt.key && <Loader2 size={11} className="animate-spin shrink-0" />}
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>

            {/* Currency & Action Row (Balanced on Mobile) */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
              <div className="grid grid-cols-4 sm:inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                {AVAILABLE_CURRENCIES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => setSelectedCurrency(c.code)}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-black transition-all active:scale-[0.98] cursor-pointer text-center ${
                      selectedCurrency === c.code
                        ? 'bg-[#e32f8c] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                    }`}
                  >
                    {c.code}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() =>
                    loadAnalytics(
                      {
                        range,
                        device: deviceFilter,
                        channel: channelFilter,
                        country: countryFilter,
                        granularity: granularityFilter,
                        salesCountry: salesCountryFilter,
                      },
                      true
                    )
                  }
                  disabled={refreshing || loading}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60"
                >
                  {refreshing || loading ? (
                    <Loader2 size={13} className="animate-spin text-[#e32f8c]" />
                  ) : (
                    <RefreshCw size={13} />
                  )}
                  <span>{refreshing || loading ? 'Actualizare...' : 'Actualizează'}</span>
                </button>

                <Link
                  href="/admin"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all active:scale-[0.98]"
                >
                  <ArrowLeft size={13} />
                  <span>Dashboard</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive GA4 Filters Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center justify-between sm:justify-start gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-slate-400">
                <Filter size={12} className="text-[#e32f8c]" /> Filtre GA4:
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="sm:hidden inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-black text-[#e32f8c] bg-pink-50 hover:bg-pink-100 border border-pink-200 transition-colors cursor-pointer"
                >
                  <RotateCcw size={11} />
                  Reset filtre
                </button>
              )}
            </div>

            {/* Device Segmented Pills */}
            <div className="grid grid-cols-4 sm:inline-flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-xl w-full sm:w-auto">
              {DEVICE_OPTIONS.map((dev) => (
                <button
                  key={dev.key}
                  type="button"
                  onClick={() => setDeviceFilter(dev.key)}
                  className={`px-2 sm:px-2.5 py-1.5 sm:py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center ${
                    deviceFilter === dev.key
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {dev.label}
                </button>
              ))}
            </div>

            {/* Channel & Country ModernSelect Dropdowns */}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
              <ModernSelect
                ariaLabel="Filtru canal GA4"
                value={channelFilter}
                onChange={setChannelFilter}
                options={channelSelectOptions}
                leadingIcon={<Share2 size={13} />}
                prefixLabel="Canal:"
                searchable={knownChannels.length >= 8}
                searchPlaceholder="Caută canal..."
                className="w-full sm:w-44"
              />

              <ModernSelect
                ariaLabel="Filtru țară GA4"
                value={countryFilter}
                onChange={setCountryFilter}
                options={countrySelectOptions}
                leadingIcon={<Globe size={13} />}
                prefixLabel="Țară:"
                searchable
                searchPlaceholder="Caută țară..."
                className="w-full sm:w-44"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-black text-[#e32f8c] bg-pink-50 hover:bg-pink-100 border border-pink-200 transition-colors cursor-pointer"
              >
                <RotateCcw size={11} />
                Reset filtre
              </button>
            </div>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-xs font-bold text-red-700 flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* GA4 SETUP / ERROR BANNER                                                  */}
      {/* ========================================================================= */}
      {ga4 && !ga4.configured && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300/70 flex items-center justify-center shrink-0 text-amber-800">
              <AlertTriangle size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base font-black text-slate-900">
                Google Analytics 4 Data API nu este configurat încă
              </h2>
              <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                Metricile de trafic GA4 (Realtime, Sesiuni, Surse, Pagini, Dispozitive) sunt dezactivate până la adăugarea cheilor de Service Account.{' '}
                <strong>Statisticile Marketing din Supabase</strong> (ScratchCard, Cupoane, Abonați, Plăți & Livrare) funcționează 100% live mai jos.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="bg-white/90 border border-amber-200/80 rounded-xl p-3.5 text-xs space-y-1.5">
              <div className="font-black text-slate-900 uppercase tracking-wider text-[11px]">
                Variabile lipsă în .env.local / Vercel
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {ga4.missingKeys.map((k) => (
                  <code
                    key={k}
                    className="px-2 py-1 rounded-md bg-slate-900 text-amber-300 font-mono text-[11px] font-bold"
                  >
                    {k}
                  </code>
                ))}
              </div>
            </div>

            <div className="bg-white/90 border border-amber-200/80 rounded-xl p-3.5 text-xs text-slate-700 space-y-1">
              <div className="font-black text-slate-900 uppercase tracking-wider text-[11px]">
                Pași rapizi de activare
              </div>
              <p>1. Activează <strong>Google Analytics Data API</strong> în Google Cloud Console.</p>
              <p>2. Creează un Service Account JSON și adaugă emailul ca <strong>Viewer</strong> în GA4 Property Access Management.</p>
              <p>3. Copiază Property ID numeric, <code className="font-mono">client_email</code> și <code className="font-mono">private_key</code> în env.</p>
            </div>
          </div>
        </div>
      )}

      {ga4?.configured && ga4.error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 sm:p-5 text-xs text-rose-900 space-y-1">
          <div className="font-black flex items-center gap-2 text-sm">
            <AlertTriangle size={16} className="text-rose-600 shrink-0" />
            Eroare conectare Google Analytics Data API
          </div>
          <p className="font-mono text-[11px] bg-white/80 border border-rose-200 rounded-lg p-2.5 text-rose-800 break-all">
            {ga4.error}
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* GA4 HERO: LIVE REALTIME + 8 KPI TILES + INTERACTIVE TIME SERIES           */}
      {/* ========================================================================= */}
      {ga4Ready && overview && (
        <div className="bg-[#09090d] text-white rounded-3xl p-4 sm:p-6 shadow-2xl border border-white/10 relative overflow-hidden space-y-5">
          <div className="pointer-events-none absolute -top-24 right-0 w-72 h-72 rounded-full bg-[#e32f8c]/15 blur-[80px]" />

          {/* Realtime Strip */}
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-2 rounded-2xl">
                <span className="relative flex h-2.5 w-2.5">
                  {(realtime?.activeUsers || 0) > 0 && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                      (realtime?.activeUsers || 0) > 0 ? 'bg-emerald-400' : 'bg-zinc-500'
                    }`}
                  />
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-emerald-300 tabular-nums">
                  Live acum (30m): {realtime?.activeUsers ?? 0} utilizatori
                  {(realtime?.screenPageViews || 0) > 0 && ` · ${realtime?.screenPageViews} afișări`}
                </span>
              </div>

              {realtime?.deviceBreakdown && realtime.deviceBreakdown.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {realtime.deviceBreakdown.map((d) => (
                    <span
                      key={d.device}
                      className="inline-flex items-center gap-1 text-[11px] font-bold bg-white/[0.07] border border-white/10 px-2.5 py-1 rounded-full text-zinc-200 tabular-nums"
                    >
                      {d.device.toLowerCase().includes('mobile') ? (
                        <Smartphone size={11} className="text-sky-400" />
                      ) : d.device.toLowerCase().includes('tablet') ? (
                        <Tablet size={11} className="text-violet-400" />
                      ) : (
                        <Monitor size={11} className="text-zinc-300" />
                      )}
                      {d.device}: {d.activeUsers}
                    </span>
                  ))}
                </div>
              )}

              {realtime?.topCountries && realtime.topCountries.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {realtime.topCountries.slice(0, 4).map((c) => (
                    <span
                      key={c.country}
                      className="text-[11px] font-bold bg-white/[0.07] border border-white/10 px-2.5 py-1 rounded-full text-zinc-200"
                    >
                      {c.country}: {c.activeUsers}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {realtime?.topPages && realtime.topPages.length > 0 && (
              <div className="flex items-start sm:items-center gap-1.5 flex-wrap text-[11px] text-zinc-300">
                <span className="text-zinc-400 font-bold py-0.5">Pagini active:</span>
                {realtime.topPages.slice(0, 3).map((p) => {
                  const cleanTitle = formatRealtimePageTitle(p.title);
                  return (
                    <span
                      key={p.title}
                      className="bg-white/[0.07] border border-white/10 px-2.5 py-0.5 rounded-lg leading-snug break-words max-w-full sm:max-w-[260px]"
                      title={`${p.title} (${p.activeUsers} activi, ${p.screenPageViews} afișări)`}
                    >
                      {cleanTitle}{' '}
                      <span className="text-emerald-300 font-black tabular-nums">
                        ({p.activeUsers})
                      </span>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* 8 Traffic & Quality KPI Tiles */}
          <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => setChartMetric('sessions')}
              className={`text-left rounded-2xl p-3.5 border transition-all active:scale-[0.98] cursor-pointer ${
                chartMetric === 'sessions'
                  ? 'bg-white/[0.11] border-[#e32f8c]/70'
                  : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.07]'
              }`}
            >
              <div className="text-[11px] font-bold text-zinc-400">Sesiuni</div>
              <div className="mt-1 flex items-baseline justify-between gap-1 flex-wrap">
                <span className="text-lg sm:text-xl font-black tabular-nums">
                  {overview.sessions.toLocaleString('ro-RO')}
                </span>
                <DeltaPill pct={overview.deltas.sessionsPct} dark />
              </div>
            </button>

            <button
              type="button"
              onClick={() => setChartMetric('engagedSessions')}
              className={`text-left rounded-2xl p-3.5 border transition-all active:scale-[0.98] cursor-pointer ${
                chartMetric === 'engagedSessions'
                  ? 'bg-white/[0.11] border-purple-400/70'
                  : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.07]'
              }`}
            >
              <div className="text-[11px] font-bold text-zinc-400">Sesiuni Engaged</div>
              <div className="mt-1 flex items-baseline justify-between gap-1 flex-wrap">
                <span className="text-lg sm:text-xl font-black tabular-nums">
                  {overview.engagedSessions.toLocaleString('ro-RO')}
                </span>
                <DeltaPill pct={overview.deltas.engagedSessionsPct} dark />
              </div>
              <div className="text-[10px] text-purple-300 font-semibold mt-0.5 tabular-nums">
                Rată engagement: {overview.engagementRatePct}%
              </div>
            </button>

            <button
              type="button"
              onClick={() => setChartMetric('users')}
              className={`text-left rounded-2xl p-3.5 border transition-all active:scale-[0.98] cursor-pointer ${
                chartMetric === 'users'
                  ? 'bg-white/[0.11] border-sky-400/70'
                  : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.07]'
              }`}
            >
              <div className="text-[11px] font-bold text-zinc-400">Utilizatori Unici</div>
              <div className="mt-1 flex items-baseline justify-between gap-1 flex-wrap">
                <span className="text-lg sm:text-xl font-black tabular-nums">
                  {overview.totalUsers.toLocaleString('ro-RO')}
                </span>
                <DeltaPill pct={overview.deltas.usersPct} dark />
              </div>
            </button>

            <button
              type="button"
              onClick={() => setChartMetric('pageviews')}
              className={`text-left rounded-2xl p-3.5 border transition-all active:scale-[0.98] cursor-pointer ${
                chartMetric === 'pageviews'
                  ? 'bg-white/[0.11] border-emerald-400/70'
                  : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.07]'
              }`}
            >
              <div className="text-[11px] font-bold text-zinc-400">Pageviews</div>
              <div className="mt-1 flex items-baseline justify-between gap-1 flex-wrap">
                <span className="text-lg sm:text-xl font-black tabular-nums">
                  {overview.pageviews.toLocaleString('ro-RO')}
                </span>
                <DeltaPill pct={overview.deltas.pageviewsPct} dark />
              </div>
            </button>

            <div className="rounded-2xl p-3.5 border border-white/[0.08] bg-white/[0.04]">
              <div className="text-[11px] font-bold text-zinc-400">Noi vs Recurenți</div>
              <div className="mt-1 text-sm sm:text-base font-black tabular-nums">
                {overview.newUsers.toLocaleString('ro-RO')} / {overview.returningUsers.toLocaleString('ro-RO')}
              </div>
              <div className="text-[10px] text-zinc-400 font-semibold mt-0.5 tabular-nums">
                {newUsersPct}% noi · {100 - newUsersPct}% recurenți
              </div>
            </div>

            <div className="rounded-2xl p-3.5 border border-white/[0.08] bg-white/[0.04]">
              <div className="text-[11px] font-bold text-zinc-400">Bounce Rate</div>
              <div className="mt-1 flex items-baseline justify-between gap-1 flex-wrap">
                <span className="text-lg sm:text-xl font-black tabular-nums">{overview.bounceRatePct}%</span>
                <DeltaPill pct={overview.deltas.bounceRatePct} dark invert />
              </div>
            </div>

            <div className="rounded-2xl p-3.5 border border-white/[0.08] bg-white/[0.04]">
              <div className="text-[11px] font-bold text-zinc-400">Durată / Pagini</div>
              <div className="mt-1 text-sm sm:text-base font-black tabular-nums">
                {formatDuration(overview.avgSessionDurationSec)}
              </div>
              <div className="text-[10px] text-zinc-400 font-semibold mt-0.5 tabular-nums">
                {overview.pagesPerSession} pagini/sesiune
              </div>
            </div>

            <div className="rounded-2xl p-3.5 border border-emerald-500/25 bg-emerald-500/[0.08]">
              <div className="text-[11px] font-bold text-emerald-300 flex items-center gap-1">
                <ShoppingBag size={12} /> Achiziții (GA4)
              </div>
              <div className="mt-1 flex items-baseline justify-between gap-1 flex-wrap">
                <span className="text-lg sm:text-xl font-black tabular-nums text-white">
                  {overview.ecommercePurchases.toLocaleString('ro-RO')}
                </span>
                <DeltaPill pct={overview.deltas.ecommercePurchasesPct} dark />
              </div>
              <div className="text-[10px] text-emerald-300/80 font-semibold mt-0.5 tabular-nums">
                {overview.sessions > 0
                  ? `${((overview.ecommercePurchases / overview.sessions) * 100).toFixed(2)}% din sesiuni`
                  : 'Evenimente purchase'}
              </div>
            </div>
          </div>

          {/* Chart Toolbar: Metric Tabs + Compare Toggle + Granularity Toggle */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-2.5 pt-1">
            <div className="flex items-center gap-1 bg-white/[0.06] p-1 rounded-xl border border-white/10 overflow-x-auto max-w-full">
              {(
                [
                  { key: 'sessions', label: 'Sesiuni' },
                  { key: 'engagedSessions', label: 'Sesiuni Engaged' },
                  { key: 'users', label: 'Utilizatori' },
                  { key: 'pageviews', label: 'Pageviews' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setChartMetric(tab.key)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                    chartMetric === tab.key
                      ? 'bg-white text-slate-900'
                      : 'text-zinc-300 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setComparePrevious((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                  comparePrevious
                    ? 'bg-white/10 border-white/25 text-white'
                    : 'bg-transparent border-white/10 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    comparePrevious ? 'bg-emerald-400' : 'bg-zinc-600'
                  }`}
                />
                Compară cu perioada anterioară
              </button>

              <div className="flex items-center gap-0.5 bg-white/[0.06] p-0.5 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setGranularityFilter('daily')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    activeGranularity === 'daily'
                      ? 'bg-[#e32f8c] text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Zilnic
                </button>
                <button
                  type="button"
                  onClick={() => setGranularityFilter('hourly')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    activeGranularity === 'hourly'
                      ? 'bg-[#e32f8c] text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Pe ore 00–23
                </button>
              </div>
            </div>
          </div>

          {/* Comparative Chart */}
          <div className="relative z-10 h-[230px] sm:h-[270px] w-full">
            {chartSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartSeries} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ga4AreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartStrokeColor} stopOpacity={0.38} />
                      <stop offset="95%" stopColor={chartStrokeColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    minTickGap={22}
                    tick={{ fontSize: 10, fill: '#a1a1aa', fontWeight: 600 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    width={42}
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: '#a1a1aa' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111118',
                      borderRadius: '14px',
                      border: '1px solid rgba(255,255,255,0.12)',
                      fontSize: '12px',
                      color: '#fff',
                    }}
                    formatter={(value: any, name: any) => [
                      Number(value).toLocaleString('ro-RO'),
                      String(name) === 'previous' ? 'Perioada anterioară' : 'Perioada curentă',
                    ]}
                  />
                  {comparePrevious && (
                    <Line
                      type="monotone"
                      dataKey="previous"
                      stroke="#71717a"
                      strokeWidth={1.75}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="current"
                    stroke={chartStrokeColor}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#ga4AreaGrad)"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-500 text-xs">
                Nicio serie temporală disponibilă pentru intervalul selectat.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5-STEP REAL E-COMMERCE FUNNEL (GA4 + SUPABASE ORDERS)                     */}
      {/* ========================================================================= */}
      {funnel && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <BarChart3 size={18} className="text-blue-600" />
                Pâlnie E-Commerce Reală (GA4 + Supabase)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Sesiuni → Vizualizare Produs → Adăugare Coș → Checkout → Comenzi Plătite (Supabase)
              </p>
            </div>
            <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
              <span className="text-[11px] font-bold text-emerald-700">Conversie finală:</span>
              <span className="text-xs sm:text-sm font-black text-emerald-800 tabular-nums">
                {funnel.overallConversionPct !== null ? `${funnel.overallConversionPct}%` : 'Necunoscut (necesită GA4)'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
            {[
              {
                step: '1. Sesiuni',
                value: funnel.sessions,
                sub: 'GA4 sessions',
                pct: funnel.sessions !== null ? 100 : null,
                color: 'bg-slate-800',
              },
              {
                step: '2. Vizualizări produs',
                value: funnel.viewItem,
                sub: 'GA4 view_item',
                pct:
                  funnel.sessions && funnel.sessions > 0 && funnel.viewItem !== null
                    ? Math.min(100, Math.round((funnel.viewItem / funnel.sessions) * 100))
                    : null,
                color: 'bg-blue-600',
              },
              {
                step: '3. Adăugări în coș',
                value: funnel.addToCart,
                sub: 'GA4 add_to_cart',
                pct:
                  funnel.sessions && funnel.sessions > 0 && funnel.addToCart !== null
                    ? Math.min(100, Math.round((funnel.addToCart / funnel.sessions) * 100))
                    : null,
                color: 'bg-indigo-600',
              },
              {
                step: '4. Checkout',
                value: funnel.beginCheckout !== null ? funnel.beginCheckout : funnel.supabaseCheckouts,
                sub:
                  funnel.beginCheckout !== null
                    ? `GA4 (${funnel.supabaseCheckouts} sesiuni DB)`
                    : 'Sesiuni checkout Supabase',
                pct:
                  funnel.sessions && funnel.sessions > 0 && funnel.beginCheckout !== null
                    ? Math.min(100, Math.round((funnel.beginCheckout / funnel.sessions) * 100))
                    : null,
                color: 'bg-amber-500',
              },
              {
                step: '5. Comenzi plătite',
                value: funnel.orders,
                sub: 'Confirmate în Supabase',
                pct:
                  funnel.sessions && funnel.sessions > 0
                    ? Math.min(100, Number(((funnel.orders / funnel.sessions) * 100).toFixed(1)))
                    : null,
                color: 'bg-emerald-600',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[11px] font-bold text-slate-600 truncate">{item.step}</span>
                    {item.pct !== null && (
                      <span className="text-[10px] font-black text-slate-700 bg-white px-1.5 py-0.5 rounded-full border border-slate-200 tabular-nums">
                        {item.pct}%
                      </span>
                    )}
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums">
                    {item.value !== null ? item.value.toLocaleString('ro-RO') : '—'}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">{item.sub}</p>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div
                    className={`${item.color} h-full rounded-full transition-all duration-500`}
                    style={{ width: `${item.pct !== null ? Math.max(4, item.pct) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* GA4 PEAK HOURS (00–23) + CHANNELS & CONVERSIONS                           */}
      {/* ========================================================================= */}
      {ga4Ready && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
            {/* Activitate pe Ore (00:00 – 23:00) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs lg:col-span-7 flex flex-col justify-between">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                    <Clock size={17} className="text-[#e32f8c]" />
                    Activitate pe Ore (00:00 – 23:00)
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Profil orar cumulat în interval · ideal pentru programarea campaniilor & postărilor
                  </p>
                </div>
                {peakHoursSummary && (
                  <div className="inline-flex items-center gap-1.5 bg-pink-50 border border-pink-200 text-[#c92077] px-2.5 py-1 rounded-xl text-[11px] font-black">
                    <Flame size={12} className="text-[#e32f8c]" />
                    Ore de vârf: {peakHoursSummary.topThreeLabels.join(', ')}
                  </div>
                )}
              </div>

              <div className="h-[220px] sm:h-[245px] w-full min-w-0">
                {ga4?.hourlyProfile && ga4.hourlyProfile.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ga4.hourlyProfile} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        interval={2}
                        tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        width={40}
                        allowDecimals={false}
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(227,47,140,0.06)' }}
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderRadius: '12px',
                          border: 'none',
                          fontSize: '12px',
                          color: '#fff',
                        }}
                        formatter={(value: any, name: any) => [
                          Number(value).toLocaleString('ro-RO'),
                          String(name) === 'sessions'
                            ? 'Sesiuni'
                            : String(name) === 'engagedSessions'
                              ? 'Sesiuni Engaged'
                              : 'Utilizatori',
                        ]}
                      />
                      <Bar dataKey="sessions" radius={[5, 5, 0, 0]}>
                        {ga4.hourlyProfile.map((entry) => (
                          <Cell
                            key={entry.hour}
                            fill={entry.isPeak ? '#e32f8c' : '#1e293b'}
                            fillOpacity={entry.isPeak ? 1 : 0.8}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">
                    Fără date orare în interval.
                  </div>
                )}
              </div>
            </div>

            {/* Canale & Conversii */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs lg:col-span-5 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                    <Sparkles size={17} className="text-emerald-600" />
                    Canale & Conversii (GA4)
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    sessionDefaultChannelGroup · engagement & achiziții
                  </p>
                </div>
                <span className="text-[11px] font-black text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  {ga4?.channels?.length || 0} canale
                </span>
              </div>

              {ga4?.channels && ga4.channels.length > 0 ? (
                <div className="space-y-3 flex-1 flex flex-col justify-between">
                  <div className="h-[145px] w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={ga4.channels.slice(0, 6)}
                        layout="vertical"
                        margin={{ top: 0, right: 12, left: 0, bottom: 0 }}
                      >
                        <XAxis type="number" hide />
                        <YAxis
                          type="category"
                          dataKey="channelGroup"
                          width={110}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: '#334155', fontWeight: 700 }}
                        />
                        <Tooltip
                          cursor={{ fill: 'rgba(15,23,42,0.04)' }}
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderRadius: '12px',
                            border: 'none',
                            fontSize: '12px',
                            color: '#fff',
                          }}
                          formatter={(value: any) => [Number(value).toLocaleString('ro-RO'), 'Sesiuni']}
                        />
                        <Bar dataKey="sessions" radius={[0, 6, 6, 0]} barSize={16}>
                          {ga4.channels.slice(0, 6).map((ch) => (
                            <Cell key={ch.channelGroup} fill={ChannelBarColor(ch.channelGroup)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-2 max-h-[175px] overflow-y-auto pr-1 custom-scrollbar">
                    {ga4.channels.map((ch) => (
                      <div
                        key={ch.channelGroup}
                        className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-black text-slate-900 break-words leading-snug">{ch.channelGroup}</div>
                          <div className="text-[10px] font-semibold text-slate-500 tabular-nums">
                            {ch.engagedSessions.toLocaleString('ro-RO')} engaged ({ch.engagementRatePct}%)
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {ch.purchases > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 tabular-nums">
                              <ShoppingBag size={10} />
                              {ch.purchases}
                            </span>
                          )}
                          <span className="font-black text-slate-900 tabular-nums">
                            {ch.sessions.toLocaleString('ro-RO')} ({ch.sharePct}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-10 text-center">Niciun canal în acest interval.</p>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* DETAILED SOURCES & UTM CAMPAIGNS                                          */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
            {/* Surse de Trafic */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                    <Share2 size={17} className="text-blue-600" />
                    Surse Detaliate de Trafic (GA4)
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    sessionSourceMedium · engagement, engaged sessions & achiziții
                  </p>
                </div>
                <span className="text-[11px] font-black text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  {ga4?.sources.length || 0} surse
                </span>
              </div>

              <div className="space-y-2.5 flex-1">
                {ga4?.sources && ga4.sources.length > 0 ? (
                  paginateSlice(ga4.sources, sourcesPage, 8).map((src) => (
                    <div
                      key={`${src.sourceMedium}-${src.channelGroup}`}
                      className="p-2.5 sm:p-3 rounded-xl border border-slate-100 bg-slate-50/70"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 text-xs mb-1.5">
                        <div className="min-w-0">
                          <span className="font-black text-slate-800 break-words leading-snug block">
                            {src.sourceMedium}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500">
                            {src.channelGroup} · Engaged {src.engagedSessions} ({src.engagementRatePct}%)
                          </span>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0">
                          {src.purchases > 0 && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 tabular-nums">
                              <ShoppingBag size={10} />
                              {src.purchases}
                            </span>
                          )}
                          <span className="font-black text-slate-900 tabular-nums">
                            {src.sessions.toLocaleString('ro-RO')} ({src.sharePct}%)
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${SourceBarColor(src.sourceMedium)}`}
                          style={{ width: `${Math.max(4, src.sharePct)}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-8 text-center">Nicio sursă de trafic în acest interval.</p>
                )}
              </div>

              <AdminPagination
                currentPage={sourcesPage}
                totalItems={ga4?.sources?.length || 0}
                itemsPerPage={8}
                onPageChange={setSourcesPage}
                compact
                label="surse"
              />
            </div>

            {/* Campanii UTM */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                    <Tag size={17} className="text-[#e32f8c]" />
                    Campanii UTM (utm_campaign)
                  </h2>
                  <p className="text-[11px] text-slate-400">Top campanii după sesiuni</p>
                </div>
                <span className="text-[11px] font-black text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  {ga4?.campaigns.length || 0} campanii
                </span>
              </div>

              <div className="space-y-2 flex-1">
                {ga4?.campaigns && ga4.campaigns.length > 0 ? (
                  paginateSlice(ga4.campaigns, campaignsPage, 8).map((camp) => (
                    <div
                      key={`${camp.campaign}-${camp.sourceMedium}`}
                      className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-black text-slate-900 break-words leading-snug">
                          {camp.campaign}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500 break-words">
                          {camp.sourceMedium} · Engagement {camp.engagementRatePct}%
                        </div>
                      </div>
                      <div className="flex sm:block items-center justify-between sm:text-right shrink-0 gap-3">
                        <div className="text-xs font-black text-slate-900 tabular-nums">
                          {camp.sessions.toLocaleString('ro-RO')} ses.
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500 tabular-nums">
                          {camp.users.toLocaleString('ro-RO')} unici
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-8 text-center">
                    Nicio campanie cu parametru utm_campaign înregistrată în interval.
                  </p>
                )}
              </div>

              <AdminPagination
                currentPage={campaignsPage}
                totalItems={ga4?.campaigns?.length || 0}
                itemsPerPage={8}
                onPageChange={setCampaignsPage}
                compact
                label="campanii"
              />
            </div>
          </div>

          {/* ========================================================================= */}
          {/* LANDING PAGES TAB VS ALL PAGES TAB (WITH SEARCH INPUT)                    */}
          {/* ========================================================================= */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                  <Layers size={17} className="text-[#e32f8c]" />
                  Performanță Pagini (GA4)
                </h2>
                <p className="text-[11px] text-slate-400">
                  Compară paginile de intrare (Landing Pages) cu toate paginile vizitate
                </p>
              </div>

              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-52">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={pageSearch}
                    onChange={(e) => {
                      setPageSearch(e.target.value);
                      setPagesPage(1);
                    }}
                    placeholder="Caută rută..."
                    className="h-9 sm:h-8 pl-8 pr-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#e32f8c]/25 w-full"
                  />
                </div>

                <div className="grid grid-cols-2 sm:inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setPagesTab('landing');
                      setPagesPage(1);
                    }}
                    className={`px-2.5 py-1.5 sm:py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center ${
                      pagesTab === 'landing'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Landing Pages ({filteredLandingPages.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPagesTab('all');
                      setPagesPage(1);
                    }}
                    className={`px-2.5 py-1.5 sm:py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center ${
                      pagesTab === 'all'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Toate Paginile ({filteredTopPages.length})
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Stacked Cards (< sm) */}
            <div className="sm:hidden space-y-2.5">
              {pagesTab === 'landing' ? (
                filteredLandingPages.length > 0 ? (
                  paginateSlice(filteredLandingPages, pagesPage, 10).map((lp) => (
                    <div
                      key={lp.path}
                      className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 space-y-2"
                    >
                      <div className="font-mono text-xs font-bold text-slate-800 break-all leading-snug">
                        {lp.path}
                      </div>
                      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-200/70 text-[11px]">
                        <div>
                          <div className="text-[10px] text-slate-400 font-semibold">Sesiuni</div>
                          <div className="font-black text-slate-900 tabular-nums">
                            {lp.sessions.toLocaleString('ro-RO')}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 font-semibold">Engaged</div>
                          <div className="font-bold text-emerald-700 tabular-nums">
                            {lp.engagedSessions.toLocaleString('ro-RO')}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 font-semibold">Durată</div>
                          <div className="font-semibold text-slate-700 tabular-nums">
                            {formatDuration(lp.avgDurationSec)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400 font-semibold">Bounce</div>
                          <div className="font-semibold text-slate-700 tabular-nums">
                            {lp.bounceRatePct}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="py-8 text-center text-xs text-slate-400">Nicio pagină landing găsită.</p>
                )
              ) : filteredTopPages.length > 0 ? (
                paginateSlice(filteredTopPages, pagesPage, 10).map((pg) => (
                  <div
                    key={pg.path}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 space-y-2"
                  >
                    <div className="font-mono text-xs font-bold text-slate-800 break-all leading-snug">
                      {pg.path}
                    </div>
                    <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-200/70 text-[11px]">
                      <div>
                        <div className="text-[10px] text-slate-400 font-semibold">Afișări</div>
                        <div className="font-black text-slate-900 tabular-nums">
                          {pg.views.toLocaleString('ro-RO')}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-semibold">Unici</div>
                        <div className="font-bold text-slate-700 tabular-nums">
                          {pg.users.toLocaleString('ro-RO')}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-semibold">Timp</div>
                        <div className="font-semibold text-slate-700 tabular-nums">
                          {formatDuration(pg.avgDurationSec)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 font-semibold">Bounce</div>
                        <div className="font-semibold text-slate-700 tabular-nums">
                          {pg.bounceRatePct}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-8 text-center text-xs text-slate-400">Nicio pagină găsită.</p>
              )}
            </div>

            {/* Desktop Table (sm+) */}
            <div className="hidden sm:block overflow-x-auto">
              {pagesTab === 'landing' ? (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400">
                      <th className="py-2.5 pr-3 font-black">Landing Page (Intrare)</th>
                      <th className="py-2.5 px-2 font-black text-right">Sesiuni</th>
                      <th className="py-2.5 px-2 font-black text-right">Engaged</th>
                      <th className="py-2.5 px-2 font-black text-right">Durată Medie</th>
                      <th className="py-2.5 pl-2 font-black text-right">Bounce</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLandingPages.length > 0 ? (
                      paginateSlice(filteredLandingPages, pagesPage, 10).map((lp) => (
                        <tr key={lp.path} className="hover:bg-slate-50/70">
                          <td
                            className="py-2.5 pr-3 font-mono font-bold text-slate-800 max-w-[460px] break-all leading-snug"
                            title={lp.path}
                          >
                            {lp.path}
                          </td>
                          <td className="py-2.5 px-2 text-right font-black text-slate-900 tabular-nums">
                            {lp.sessions.toLocaleString('ro-RO')}
                          </td>
                          <td className="py-2.5 px-2 text-right font-semibold text-emerald-700 tabular-nums">
                            {lp.engagedSessions.toLocaleString('ro-RO')}
                          </td>
                          <td className="py-2.5 px-2 text-right font-semibold text-slate-600 tabular-nums">
                            {formatDuration(lp.avgDurationSec)}
                          </td>
                          <td className="py-2.5 pl-2 text-right font-semibold text-slate-600 tabular-nums">
                            {lp.bounceRatePct}%
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                          Nicio pagină landing găsită.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400">
                      <th className="py-2.5 pr-3 font-black">Rută Pagină</th>
                      <th className="py-2.5 px-2 font-black text-right">Afișări</th>
                      <th className="py-2.5 px-2 font-black text-right">Unici</th>
                      <th className="py-2.5 px-2 font-black text-right">Timp Mediu</th>
                      <th className="py-2.5 pl-2 font-black text-right">Bounce</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTopPages.length > 0 ? (
                      paginateSlice(filteredTopPages, pagesPage, 10).map((pg) => (
                        <tr key={pg.path} className="hover:bg-slate-50/70">
                          <td
                            className="py-2.5 pr-3 font-mono font-bold text-slate-800 max-w-[460px] break-all leading-snug"
                            title={pg.path}
                          >
                            {pg.path}
                          </td>
                          <td className="py-2.5 px-2 text-right font-black text-slate-900 tabular-nums">
                            {pg.views.toLocaleString('ro-RO')}
                          </td>
                          <td className="py-2.5 px-2 text-right font-semibold text-slate-600 tabular-nums">
                            {pg.users.toLocaleString('ro-RO')}
                          </td>
                          <td className="py-2.5 px-2 text-right font-semibold text-slate-600 tabular-nums">
                            {formatDuration(pg.avgDurationSec)}
                          </td>
                          <td className="py-2.5 pl-2 text-right font-semibold text-slate-600 tabular-nums">
                            {pg.bounceRatePct}%
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                          Nicio pagină găsită.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <AdminPagination
              currentPage={pagesPage}
              totalItems={pagesTab === 'landing' ? filteredLandingPages.length : filteredTopPages.length}
              itemsPerPage={10}
              onPageChange={setPagesPage}
              label="pagini"
            />
          </div>

          {/* ========================================================================= */}
          {/* EVENIMENTE GA4 & CALITATE AUDIENȚĂ (NEW VS RETURNING)                     */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
            {/* All GA4 Events */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs lg:col-span-7 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                    <Zap size={17} className="text-amber-500" />
                    Evenimente GA4 Înregistrate
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Toate evenimentele active (scroll, formulare, e-commerce, click-uri)
                  </p>
                </div>
                <span className="text-[11px] font-black text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  {ga4?.allEvents?.length || 0} tipuri
                </span>
              </div>

              {ga4?.allEvents && ga4.allEvents.length > 0 ? (
                <>
                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400">
                          <th className="py-2 pr-3 font-black">Eveniment</th>
                          <th className="py-2 px-2 font-black text-right">Declanșări</th>
                          <th className="py-2 px-2 font-black text-right">Utilizatori</th>
                          <th className="py-2 pl-2 font-black text-right">% Audiență</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginateSlice(ga4.allEvents, eventsPage, 8).map((ev) => (
                          <tr key={ev.eventName} className="hover:bg-slate-50/70">
                            <td className="py-2 pr-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[11px] font-bold">
                                  {ev.eventName}
                                </code>
                                {EVENT_LABELS[ev.eventName] && (
                                  <span className="text-[11px] text-slate-500 font-medium">
                                    {EVENT_LABELS[ev.eventName]}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-2 text-right font-black text-slate-900 tabular-nums">
                              {ev.eventCount.toLocaleString('ro-RO')}
                            </td>
                            <td className="py-2 px-2 text-right font-semibold text-slate-600 tabular-nums">
                              {ev.totalUsers.toLocaleString('ro-RO')}
                            </td>
                            <td className="py-2 pl-2 text-right font-bold text-[#e32f8c] tabular-nums">
                              {ev.userPct}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <AdminPagination
                    currentPage={eventsPage}
                    totalItems={ga4.allEvents.length}
                    itemsPerPage={8}
                    onPageChange={setEventsPage}
                    compact
                    label="evenimente"
                  />
                </>
              ) : (
                <p className="text-xs text-slate-400 py-8 text-center">Fără evenimente înregistrate.</p>
              )}
            </div>

            {/* New vs Returning Quality Breakdown */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs lg:col-span-5 flex flex-col justify-between space-y-4">
              <div>
                <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                  <Users size={17} className="text-blue-600" />
                  Calitate Audiență: Noi vs Recurenți
                </h2>
                <p className="text-[11px] text-slate-400">
                  Compară engagement-ul și durata medie pe segment (newVsReturning)
                </p>
              </div>

              <div className="space-y-3 flex-1 flex flex-col justify-center">
                {ga4?.newVsReturning && ga4.newVsReturning.length > 0 ? (
                  ga4.newVsReturning.map((seg) => {
                    const isReturning = seg.segment === 'returning';
                    return (
                      <div
                        key={seg.segment}
                        className={`p-3.5 rounded-xl border ${
                          isReturning
                            ? 'bg-emerald-50/50 border-emerald-200/80'
                            : 'bg-blue-50/50 border-blue-200/80'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-xs font-black text-slate-900">{seg.label}</span>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full tabular-nums ${
                              isReturning
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {seg.sharePct}% din sesiuni
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                          <div>
                            <div className="text-[10px] text-slate-500 font-semibold">Sesiuni / Unici</div>
                            <div className="font-black text-slate-900 tabular-nums">
                              {seg.sessions.toLocaleString('ro-RO')} / {seg.users.toLocaleString('ro-RO')}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-500 font-semibold">Engagement</div>
                            <div className="font-black text-slate-900 tabular-nums">
                              {seg.engagementRatePct}%
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-500 font-semibold">Durată medie</div>
                            <div className="font-black text-slate-900 tabular-nums">
                              {formatDuration(seg.avgDurationSec)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 py-8 text-center">Fără date de segmentare.</p>
                )}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* AUDIENȚĂ & TEHNIC: DEVICE / OS / BROWSER / LANGUAGES / RESOLUTIONS        */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Dispozitive */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-3">
                <Smartphone size={14} className="text-blue-600" /> Dispozitive
              </h3>
              <div className="space-y-2.5">
                {ga4?.devices.length ? (
                  ga4.devices.map((d) => (
                    <div key={d.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5">
                          {d.name.toLowerCase().includes('mobile') ? (
                            <Smartphone size={12} className="text-blue-500" />
                          ) : d.name.toLowerCase().includes('tablet') ? (
                            <Tablet size={12} className="text-violet-500" />
                          ) : (
                            <Monitor size={12} className="text-slate-600" />
                          )}
                          {d.name}
                        </span>
                        <span className="font-black text-slate-900 tabular-nums">
                          {d.percentage}% ({d.sessions})
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full rounded-full" style={{ width: `${Math.max(4, d.percentage)}%` }} />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-4 text-center">Fără date</p>
                )}
              </div>
            </div>

            {/* OS */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-3">
                <Monitor size={14} className="text-emerald-600" /> Sisteme OS
              </h3>
              <div className="space-y-2.5">
                {ga4?.operatingSystems.length ? (
                  ga4.operatingSystems.slice(0, 5).map((os) => (
                    <div key={os.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 truncate pr-2">{os.name}</span>
                        <span className="font-black text-slate-900 tabular-nums">{os.percentage}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${Math.max(4, os.percentage)}%` }} />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-4 text-center">Fără date</p>
                )}
              </div>
            </div>

            {/* Browsere */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-3">
                <Globe size={14} className="text-violet-600" /> Browsere
              </h3>
              <div className="space-y-2 max-h-[190px] overflow-y-auto custom-scrollbar pr-1">
                {ga4?.browsers.length ? (
                  ga4.browsers.slice(0, 7).map((b) => (
                    <div key={b.name} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                      <span className="font-bold text-slate-700 truncate pr-2">{b.name}</span>
                      <span className="font-black text-slate-900 shrink-0 tabular-nums">{b.percentage}%</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-4 text-center">Fără date</p>
                )}
              </div>
            </div>

            {/* Limbi (Languages) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-3">
                <Languages size={14} className="text-amber-600" /> Limbi Utilizatori
              </h3>
              <div className="space-y-2 max-h-[190px] overflow-y-auto custom-scrollbar pr-1">
                {ga4?.languages?.length ? (
                  ga4.languages.slice(0, 8).map((lang) => (
                    <div key={lang.name} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                      <span className="font-bold text-slate-700 truncate pr-2">{lang.name}</span>
                      <span className="font-black text-slate-900 shrink-0 tabular-nums">
                        {lang.sessions} ({lang.percentage}%)
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-4 text-center">Fără date</p>
                )}
              </div>
            </div>
          </div>

          {/* Geo (Țări & Orașe cu engagement) + Rezoluții Ecran */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Top Țări */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-3">
                <Globe size={14} className="text-sky-600" /> Top Țări (Sesiuni & Engagement)
              </h3>
              <div className="space-y-2 flex-1">
                {ga4?.countries.length ? (
                  paginateSlice(ga4.countries, countriesPage, 8).map((c) => (
                    <div key={c.name} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50 last:border-0 gap-2">
                      <div className="min-w-0">
                        <span className="font-bold text-slate-800 break-words leading-snug block">{c.name}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          Engagement {c.engagementRatePct}%
                        </span>
                      </div>
                      <span className="font-black text-slate-900 shrink-0 tabular-nums">
                        {c.sessions} ({c.percentage}%)
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-4 text-center">Fără date</p>
                )}
              </div>
              <AdminPagination
                currentPage={countriesPage}
                totalItems={ga4?.countries?.length || 0}
                itemsPerPage={8}
                onPageChange={setCountriesPage}
                compact
                label="țări"
              />
            </div>

            {/* Top Orașe */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-3">
                <MapPin size={14} className="text-[#e32f8c]" /> Top Orașe (cu Țară & Engagement)
              </h3>
              <div className="space-y-2 flex-1">
                {ga4?.cities.length ? (
                  paginateSlice(ga4.cities, citiesPage, 8).map((ci) => (
                    <div
                      key={`${ci.name}-${ci.country}`}
                      className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50 last:border-0 gap-2"
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-slate-800 break-words leading-snug block">{ci.name}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          {ci.country} · Engagement {ci.engagementRatePct}%
                        </span>
                      </div>
                      <span className="font-black text-slate-900 shrink-0 tabular-nums">{ci.sessions} ses.</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-4 text-center">Fără date</p>
                )}
              </div>
              <AdminPagination
                currentPage={citiesPage}
                totalItems={ga4?.cities?.length || 0}
                itemsPerPage={8}
                onPageChange={setCitiesPage}
                compact
                label="orașe"
              />
            </div>

            {/* Rezoluții Ecran */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-3">
                <Monitor size={14} className="text-indigo-600" /> Rezoluții Ecran
              </h3>
              <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                {ga4?.screenResolutions?.length ? (
                  ga4.screenResolutions.slice(0, 10).map((res) => (
                    <div
                      key={res.name}
                      className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50 last:border-0 gap-2"
                    >
                      <span className="font-mono font-bold text-slate-700 truncate pr-2">{res.name}</span>
                      <span className="font-black text-slate-900 shrink-0 tabular-nums">
                        {res.sessions} ({res.percentage}%)
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-4 text-center">Fără date</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* PRODUSE VĂZUTE (GA4) VS VÂNDUTE (SUPABASE)                                */}
      {/* ========================================================================= */}
      {data?.productComparison && data.productComparison.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <Eye size={18} className="text-[#e32f8c]" />
                Produse Văzute (GA4) vs Vândute (Supabase)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Identifică produsele cu trafic ridicat dar conversie mică
              </p>
            </div>
            <Link
              href="/admin/products"
              className="text-xs font-bold text-[#e32f8c] hover:underline inline-flex items-center gap-1"
            >
              Gestionează Produse <ArrowUpRight size={13} />
            </Link>
          </div>

          {/* Mobile Stacked Cards (< sm) — Zero title truncation */}
          <div className="sm:hidden space-y-2.5">
            {paginateSlice(data.productComparison, productsPage, 10).map((row) => {
              const lowConvAlert =
                row.views >= 20 && row.viewToBuyPct !== null && row.viewToBuyPct < 1.5;
              return (
                <div
                  key={row.name}
                  className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/70 space-y-2.5"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start gap-2">
                      <Package size={14} className="text-slate-400 shrink-0 mt-0.5" />
                      <span className="font-bold text-slate-900 text-xs leading-snug break-words">
                        {row.name}
                      </span>
                    </div>
                    {lowConvAlert && (
                      <div className="pl-5">
                        <span className="inline-flex items-center text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                          Conversie slabă
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-2 pt-2.5 border-t border-slate-200/70 text-[11px]">
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold">Vizualizări</div>
                      <div className="font-bold text-slate-800 tabular-nums mt-0.5">
                        {ga4Ready ? row.views.toLocaleString('ro-RO') : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold">Vândute</div>
                      <div className="font-black text-slate-900 tabular-nums mt-0.5">
                        {row.soldQty} buc
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold">Venit</div>
                      <div className="font-bold text-slate-800 tabular-nums mt-0.5">
                        {formatMoney(row.revenueRon)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 font-semibold">Conversie</div>
                      <div className="font-black tabular-nums mt-0.5">
                        {row.viewToBuyPct !== null ? (
                          <span className={row.viewToBuyPct >= 2 ? 'text-emerald-600' : 'text-slate-700'}>
                            {row.viewToBuyPct}%
                          </span>
                        ) : (
                          '—'
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table (sm+) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400">
                  <th className="py-2.5 pr-4 font-black min-w-[260px]">Produs</th>
                  <th className="py-2.5 px-2.5 font-black text-right whitespace-nowrap">Vizualizări (GA4)</th>
                  <th className="py-2.5 px-2.5 font-black text-right whitespace-nowrap">Vândute (Supabase)</th>
                  <th className="py-2.5 px-2.5 font-black text-right whitespace-nowrap">Venit</th>
                  <th className="py-2.5 pl-2.5 font-black text-right whitespace-nowrap">Conversie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginateSlice(data.productComparison, productsPage, 10).map((row) => {
                  const lowConvAlert = row.views >= 20 && row.viewToBuyPct !== null && row.viewToBuyPct < 1.5;
                  return (
                    <tr key={row.name} className="hover:bg-slate-50/70">
                      <td className="py-2.5 pr-4 font-bold text-slate-900">
                        <div className="flex flex-wrap items-center gap-2">
                          <Package size={13} className="text-slate-400 shrink-0" />
                          <span className="leading-snug">{row.name}</span>
                          {lowConvAlert && (
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                              Conversie slabă
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-bold text-slate-700 tabular-nums whitespace-nowrap">
                        {ga4Ready ? row.views.toLocaleString('ro-RO') : '—'}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-black text-slate-900 tabular-nums whitespace-nowrap">
                        {row.soldQty} buc
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-bold text-slate-800 tabular-nums whitespace-nowrap">
                        {formatMoney(row.revenueRon)}
                      </td>
                      <td className="py-2.5 pl-2.5 text-right font-black tabular-nums whitespace-nowrap">
                        {row.viewToBuyPct !== null ? (
                          <span className={row.viewToBuyPct >= 2 ? 'text-emerald-600' : 'text-slate-700'}>
                            {row.viewToBuyPct}%
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <AdminPagination
            currentPage={productsPage}
            totalItems={data.productComparison.length}
            itemsPerPage={10}
            onPageChange={setProductsPage}
            label="produse"
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* STATISTICI MARKETING DIN SUPABASE (100% LIVE INDEPENDENT DE GA4)          */}
      {/* ========================================================================= */}
      {mkt && (
        <div className="space-y-5 sm:space-y-6 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
                <TrendingUp size={19} className="text-[#e32f8c]" />
                Statistici Marketing din Supabase
              </h2>
              <p className="text-xs text-slate-500">
                Date 100% reale din baza de date a magazinului (independente de GA4)
              </p>
            </div>
            <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full tabular-nums">
              {mkt.ordersInPeriod} comenzi · {formatMoney(mkt.revenueInPeriodRon)}
            </span>
          </div>

          {/* Unified Total Strip */}
          {(() => {
            const rawBreakdown = mkt.currencyBreakdown || data?.currencyBreakdown || [];
            const activeCurrencies = rawBreakdown.filter((b) => b.orders > 0 || b.revenueNative > 0);
            const totalRon = mkt.revenueInPeriodRon || 0;
            return (
              <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3.5 sm:px-5 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                      Total Încasări ({selectedCurrency})
                    </h3>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {mkt.ordersInPeriod} comenzi · RON / EUR / USD / GBP convertite automat
                    </span>
                  </div>
                  {activeCurrencies.length > 1 && (
                    <p className="text-[11px] text-slate-500 mt-1 tabular-nums">
                      Mix comenzi:{' '}
                      {activeCurrencies.map((b) => `${b.currency} (${b.orders})`).join(' · ')}
                    </p>
                  )}
                </div>
                <div className="text-lg sm:text-xl font-black text-slate-950 tabular-nums shrink-0">
                  {formatMoney(totalRon)}
                </div>
              </div>
            );
          })()}

          {/* Top Afiliați & Vânzări pe Țări (Supabase) */}
          {(() => {
            const countrySales = data?.countrySalesBreakdown || [];
            const affiliates = data?.topAffiliates || [];
            const referralSummary = data?.referralSummary;
            const activeCountryObj =
              salesCountryFilter !== 'all'
                ? countrySales.find((c) => c.countryCode === salesCountryFilter) || null
                : null;
            const totalAffOrders = affiliates.reduce((s, a) => s + a.orders, 0);
            const totalAffRevenueRon = affiliates.reduce((s, a) => s + a.revenueRon, 0);
            const totalAffCommissionRon = affiliates.reduce((s, a) => s + a.commissionRon, 0);

            return (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-5">
                {/* Section Header + Country Filter Dropdown */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Award size={18} className="text-[#e32f8c] shrink-0" />
                      <h3 className="text-sm sm:text-base font-black tracking-tight text-slate-900">
                        Top Afiliați & Vânzări pe Țări (Supabase)
                      </h3>
                      {activeCountryObj && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-pink-50 text-[#c92077] border border-pink-200">
                          <span>{activeCountryObj.flag || '🌐'}</span>
                          <span>{activeCountryObj.countryName}</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Atribuire comenzi & comisioane sincronizată 100% cu{' '}
                      <Link href="/admin/affiliates" className="text-[#e32f8c] font-bold hover:underline">
                        /admin/affiliates
                      </Link>
                      {' · '}Click pe o țară pentru filtrare instant
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <ModernSelect
                      ariaLabel="Filtru țară vânzări și afiliați"
                      value={salesCountryFilter}
                      onChange={setSalesCountryFilter}
                      options={salesCountryOptions}
                      leadingIcon={<Globe size={13} />}
                      searchable
                      searchPlaceholder="Caută țară..."
                      className="w-full sm:w-60"
                    />
                    {salesCountryFilter !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setSalesCountryFilter('all')}
                        className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-[11px] font-black text-[#e32f8c] bg-pink-50 hover:bg-pink-100 border border-pink-200 transition-colors cursor-pointer shrink-0"
                        title="Resetează filtrul de țară"
                      >
                        <RotateCcw size={12} />
                        <span className="hidden sm:inline">Reset</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Clickable Country Sales Grid */}
                {countrySales.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-400">
                      <span>Vânzări pe Țări ({countrySales.length} {countrySales.length === 1 ? 'țară' : 'țări'})</span>
                      {salesCountryFilter !== 'all' && (
                        <button
                          type="button"
                          onClick={() => setSalesCountryFilter('all')}
                          className="text-[#e32f8c] hover:underline normal-case font-bold cursor-pointer"
                        >
                          Arată toate țările
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {countrySales.map((c) => {
                        const isSelected = salesCountryFilter === c.countryCode;
                        return (
                          <button
                            key={c.countryCode}
                            type="button"
                            onClick={() =>
                              setSalesCountryFilter((prev) =>
                                prev === c.countryCode ? 'all' : c.countryCode
                              )
                            }
                            className={`text-left p-2.5 sm:p-3 rounded-xl border transition-all active:scale-[0.99] cursor-pointer space-y-1.5 ${
                              isSelected
                                ? 'border-[#e32f8c] bg-pink-50/70 ring-2 ring-[#e32f8c]/20 shadow-xs'
                                : 'border-slate-200/80 bg-slate-50/60 hover:bg-white hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="inline-flex items-center gap-1.5 min-w-0">
                                <span className="text-base leading-none shrink-0" aria-hidden="true">
                                  {c.flag || '🌐'}
                                </span>
                                <span className="text-xs font-black text-slate-900 break-words leading-tight">
                                  {c.countryName}
                                </span>
                              </span>
                              <span
                                className={`text-[10px] font-black px-1.5 py-0.5 rounded-md tabular-nums shrink-0 ${
                                  isSelected
                                    ? 'bg-[#e32f8c] text-white'
                                    : 'bg-white border border-slate-200 text-slate-700'
                                }`}
                              >
                                {c.sharePct}%
                              </span>
                            </div>

                            <div className="flex items-baseline justify-between gap-1.5 text-[11px] tabular-nums">
                              <span className="font-bold text-slate-600">
                                {c.orders} {c.orders === 1 ? 'com.' : 'com.'}
                              </span>
                              <span className="font-black text-slate-900">
                                {formatMoney(c.revenueRon)}
                              </span>
                            </div>

                            <div className="w-full h-1.5 rounded-full bg-slate-200/80 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isSelected ? 'bg-[#e32f8c]' : 'bg-slate-800'
                                }`}
                                style={{ width: `${Math.max(4, c.sharePct)}%` }}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Affiliate Summary Strip */}
                {(affiliates.length > 0 || (referralSummary && referralSummary.totalClicks > 0)) && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-slate-900 text-white">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">
                        Total Click-uri Link (?ref=)
                      </div>
                      <div className="text-sm sm:text-base font-black tabular-nums mt-0.5 text-sky-300">
                        {referralSummary?.connected
                          ? referralSummary.totalClicks.toLocaleString('ro-RO')
                          : '—'}
                      </div>
                      {referralSummary?.connected && (
                        <div className="text-[10px] font-semibold text-zinc-400 tabular-nums">
                          {referralSummary.totalUsers.toLocaleString('ro-RO')} vizitatori unici
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">
                        Comenzi Afiliați
                      </div>
                      <div className="text-sm sm:text-base font-black tabular-nums mt-0.5">
                        {totalAffOrders.toLocaleString('ro-RO')}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">
                        Venit Afiliați
                      </div>
                      <div className="text-sm sm:text-base font-black tabular-nums mt-0.5 text-emerald-300">
                        {formatMoney(totalAffRevenueRon)}
                      </div>
                    </div>
                    <div className="sm:text-right">
                      <div className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">
                        Comisioane
                      </div>
                      <div className="text-sm sm:text-base font-black tabular-nums mt-0.5 text-[#ff6eb6]">
                        {formatMoney(totalAffCommissionRon)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Compact Top Traffic by Link (?ref=) Strip */}
                {referralSummary && referralSummary.topByClicks.length > 0 && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-600">
                        <Share2 size={12} className="text-[#e32f8c]" />
                        <span>Top trafic pe link (?ref=)</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 tabular-nums">
                        {referralSummary.totalClicks.toLocaleString('ro-RO')} click-uri ·{' '}
                        {referralSummary.totalUsers.toLocaleString('ro-RO')} vizitatori unici
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {paginateSlice(referralSummary.topByClicks, refLinksPage, 8).map((ref) => (
                        <span
                          key={ref.code}
                          className="inline-flex flex-wrap items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200/90 text-[11px] shadow-2xs"
                        >
                          <span className="font-mono font-black text-slate-900">{ref.code}</span>
                          {ref.affiliateName && (
                            <span className="text-slate-500 font-semibold">{ref.affiliateName}</span>
                          )}
                          <span className="text-slate-300">·</span>
                          <span className="font-black text-[#e32f8c] tabular-nums">
                            {ref.clicks.toLocaleString('ro-RO')} {ref.clicks === 1 ? 'click' : 'click-uri'}
                          </span>
                          {ref.orders > 0 && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded-md tabular-nums">
                              {ref.orders} com.
                              {ref.clickConversionPct !== null ? ` (${ref.clickConversionPct}%)` : ''}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                    <AdminPagination
                      currentPage={refLinksPage}
                      totalItems={referralSummary.topByClicks.length}
                      itemsPerPage={8}
                      onPageChange={setRefLinksPage}
                      compact
                      label="coduri ?ref="
                    />
                  </div>
                )}

                {/* Ranked Top Affiliates Leaderboard (Search + Activity Toggle + Pagination) */}
                {rankedAffiliates.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                          Leaderboard Afiliați
                        </span>
                        <span className="text-[11px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full tabular-nums">
                          {filteredAffiliates.length} afișați
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto">
                        <div className="relative w-full sm:w-56">
                          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={affiliateSearch}
                            onChange={(e) => {
                              setAffiliateSearch(e.target.value);
                              setAffiliatesPage(1);
                            }}
                            placeholder="Caută afiliat sau cod..."
                            className="h-9 sm:h-8 pl-8 pr-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#e32f8c]/25 w-full"
                          />
                        </div>

                        <div className="grid grid-cols-2 sm:inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={() => {
                              setAffiliateActivityOnly(true);
                              setAffiliatesPage(1);
                            }}
                            className={`px-2.5 py-1.5 sm:py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center whitespace-nowrap ${
                              affiliateActivityOnly
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Doar cu activitate ({activeAffiliatesCount})
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAffiliateActivityOnly(false);
                              setAffiliatesPage(1);
                            }}
                            className={`px-2.5 py-1.5 sm:py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center whitespace-nowrap ${
                              !affiliateActivityOnly
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Toți afiliații ({rankedAffiliates.length})
                          </button>
                        </div>
                      </div>
                    </div>

                    {filteredAffiliates.length > 0 ? (
                      <>
                        <div className="space-y-2.5">
                          {paginateSlice(filteredAffiliates, affiliatesPage, 10).map((aff) => {
                            const rank = aff.rank;
                            const rankBadgeCls =
                              rank === 1
                                ? 'bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950 shadow-xs'
                                : rank === 2
                                  ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-900'
                                  : rank === 3
                                    ? 'bg-gradient-to-br from-orange-200 to-orange-400 text-orange-950'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200';

                            return (
                              <div
                                key={aff.id}
                                className="p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white transition-colors space-y-2.5"
                              >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                                  {/* Left: Global Rank + Name + Code + Flags */}
                                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                    <span
                                      className={`w-7 h-7 rounded-xl inline-flex items-center justify-center text-[11px] font-black shrink-0 tabular-nums ${rankBadgeCls}`}
                                    >
                                      #{rank}
                                    </span>

                                    <div className="min-w-0 flex-1 space-y-1">
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="text-xs sm:text-sm font-black text-slate-900 break-words leading-snug">
                                          {aff.name}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-mono text-[11px] font-black text-slate-800">
                                          {aff.code}
                                        </span>
                                        <span className="px-1.5 py-0.5 rounded-md bg-pink-50 border border-pink-200/80 text-[10px] font-black text-[#c92077] tabular-nums">
                                          {aff.commissionPercent}% comision
                                        </span>
                                      </div>

                                      {aff.topCountries.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-1">
                                          {aff.topCountries.map((tc) => (
                                            <span
                                              key={tc.countryCode}
                                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white border border-slate-200/80 text-[10px] font-bold text-slate-700 tabular-nums"
                                              title={`${tc.countryName}: ${tc.orders} comenzi (${formatMoney(tc.revenueRon)})`}
                                            >
                                              <span aria-hidden="true">{tc.flag || '🌐'}</span>
                                              <span>{tc.countryCode}</span>
                                              <span className="text-slate-400">·</span>
                                              <span>{tc.orders}</span>
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Right: Metrics Grid (Zero truncation on mobile & desktop) */}
                                  <div className="grid grid-cols-3 sm:grid-cols-5 md:flex md:items-center gap-2.5 md:gap-5 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200/70 shrink-0">
                                    <div>
                                      <div className="text-[10px] text-slate-400 font-semibold">Click-uri (?ref=)</div>
                                      <div className="text-xs sm:text-sm font-black text-indigo-700 tabular-nums">
                                        {aff.clicks.toLocaleString('ro-RO')} {aff.clicks === 1 ? 'click' : 'click-uri'}
                                      </div>
                                      <div className="text-[10px] font-bold text-slate-500 tabular-nums">
                                        {aff.clickConversionPct !== null ? `${aff.clickConversionPct}% conv.` : '—'}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-[10px] text-slate-400 font-semibold">Comenzi</div>
                                      <div className="text-xs sm:text-sm font-black text-slate-900 tabular-nums">
                                        {aff.orders}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-[10px] text-slate-400 font-semibold">Venit</div>
                                      <div className="text-xs sm:text-sm font-black text-slate-900 tabular-nums">
                                        {formatMoney(aff.revenueRon)}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-[10px] text-slate-400 font-semibold">Comision</div>
                                      <div className="text-xs sm:text-sm font-black text-emerald-700 tabular-nums">
                                        {formatMoney(aff.commissionRon)}
                                      </div>
                                    </div>
                                    <div className="sm:text-right">
                                      <div className="text-[10px] text-slate-400 font-semibold">Cotă</div>
                                      <div className="text-xs sm:text-sm font-black text-[#e32f8c] tabular-nums">
                                        {aff.sharePct}%
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="w-full h-1.5 rounded-full bg-slate-200/80 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-[#e32f8c] to-violet-600"
                                    style={{ width: `${aff.sharePct > 0 ? Math.max(3, aff.sharePct) : 0}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <AdminPagination
                          currentPage={affiliatesPage}
                          totalItems={filteredAffiliates.length}
                          itemsPerPage={10}
                          onPageChange={setAffiliatesPage}
                          label="afiliați"
                        />
                      </>
                    ) : (
                      <div className="py-8 px-4 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 space-y-2.5">
                        <p className="text-xs font-bold text-slate-500">
                          {affiliateSearch.trim()
                            ? `Niciun afiliat găsit pentru „${affiliateSearch.trim()}”.`
                            : 'Niciun afiliat cu activitate în perioada selectată.'}
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          {affiliateSearch.trim() && (
                            <button
                              type="button"
                              onClick={() => {
                                setAffiliateSearch('');
                                setAffiliatesPage(1);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                            >
                              <RotateCcw size={12} />
                              Șterge căutarea
                            </button>
                          )}
                          {affiliateActivityOnly && rankedAffiliates.length > activeAffiliatesCount && (
                            <button
                              type="button"
                              onClick={() => {
                                setAffiliateActivityOnly(false);
                                setAffiliatesPage(1);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-[#e32f8c] bg-pink-50 hover:bg-pink-100 border border-pink-200 transition-colors cursor-pointer"
                            >
                              Arată toți afiliații ({rankedAffiliates.length})
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-8 px-4 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 space-y-2">
                    <p className="text-xs font-bold text-slate-500">
                      {activeCountryObj
                        ? `Nicio comandă de afiliat înregistrată în ${activeCountryObj.countryName} pentru perioada selectată.`
                        : 'Nicio comandă atribuită afiliaților în perioada selectată.'}
                    </p>
                    {salesCountryFilter !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setSalesCountryFilter('all')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-[#e32f8c] bg-pink-50 hover:bg-pink-100 border border-pink-200 transition-colors cursor-pointer"
                      >
                        <RotateCcw size={12} />
                        Arată toate țările
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* 1. Performanță ScratchCard & Cupoane */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
            {/* ScratchCard Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs lg:col-span-5 flex flex-col justify-between space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm sm:text-base font-black tracking-tight flex items-center gap-2">
                    <Gift size={17} className="text-[#e32f8c]" />
                    Performanță ScratchCard
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Coduri generate (SCRATCH-*) vs convertite în comenzi
                  </p>
                </div>
                <Link
                  href="/admin/marketing/promo"
                  className="text-[11px] font-bold text-[#e32f8c] hover:underline shrink-0"
                >
                  Setări Promo
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[11px] font-bold text-slate-500">Răzuite (active în perioadă)</div>
                  <div className="text-xl font-black text-slate-900 mt-1 tabular-nums">
                    {mkt.scratchCard.generatedInPeriod}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 tabular-nums">
                    Total istoric salvat: {mkt.scratchCard.totalAllTime}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-pink-50/60 border border-pink-100">
                  <div className="text-[11px] font-bold text-slate-600">Convertite în Comenzi</div>
                  <div className="text-xl font-black text-[#e32f8c] mt-1 tabular-nums">
                    {mkt.scratchCard.redeemedInPeriod}
                  </div>
                  <div className="text-[10px] text-slate-500 font-semibold mt-0.5 tabular-nums">
                    Rată conversie: {mkt.scratchCard.conversionRatePct}%
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 text-white flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">
                    Venit generat ScratchCard
                  </div>
                  <div className="text-base font-black tabular-nums mt-0.5">
                    {formatMoney(mkt.scratchCard.revenueRon)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">
                    Discount acordat
                  </div>
                  <div className="text-sm font-black text-[#ff6eb6] tabular-nums mt-0.5">
                    -{formatMoney(mkt.scratchCard.discountRon)}
                  </div>
                </div>
              </div>
            </div>

            {/* Cupoane Overview & Breakdown */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs lg:col-span-7 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm sm:text-base font-black tracking-tight flex items-center gap-2">
                    <Ticket size={17} className="text-violet-600" />
                    Cupoane: TREN5 vs Influenceri vs ScratchCard
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {mkt.coupons.ordersWithCouponCount} comenzi cu cupon ({mkt.coupons.couponSharePct}% din comenzi) · Discount total acordat: {formatMoney(mkt.coupons.totalDiscountGrantedRon)}
                  </p>
                </div>
                <Link
                  href="/admin/coupons"
                  className="text-[11px] font-bold text-violet-600 hover:underline shrink-0"
                >
                  Toate Cupoanele
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {Object.entries(mkt.coupons.categories).map(([key, cat]) => (
                  <div key={key} className="p-3 rounded-xl border border-slate-100 bg-slate-50/70">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">
                      {cat.label}
                    </div>
                    <div className="text-lg font-black text-slate-900 mt-1 tabular-nums">{cat.orders} com.</div>
                    <div className="text-[11px] font-bold text-emerald-700 mt-0.5 tabular-nums">
                      {formatMoney(cat.revenueRon)}
                    </div>
                    <div className="text-[10px] font-semibold text-rose-600 tabular-nums">
                      -{formatMoney(cat.discountRon)}
                    </div>
                  </div>
                ))}
              </div>

              {mkt.coupons.topCoupons.length > 0 && (
                <div>
                  <div className="overflow-x-auto pt-1">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400">
                          <th className="py-2 pr-2 font-black">Cod Cupon</th>
                          <th className="py-2 px-2 font-black">Tip</th>
                          <th className="py-2 px-2 font-black text-right">Comenzi</th>
                          <th className="py-2 px-2 font-black text-right">Venit</th>
                          <th className="py-2 pl-2 font-black text-right">Discount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginateSlice(mkt.coupons.topCoupons, couponsPage, 6).map((c) => (
                          <tr key={c.code} className="hover:bg-slate-50/70">
                            <td className="py-2 pr-2 font-mono font-black text-slate-900">{c.code}</td>
                            <td className="py-2 px-2 text-[11px] font-semibold text-slate-600">
                              {c.affiliateName
                                ? `Afiliat (${c.affiliateName})`
                                : c.category === 'scratch'
                                  ? 'ScratchCard'
                                  : c.category === 'tren5'
                                    ? 'Welcome'
                                    : 'Promo'}
                            </td>
                            <td className="py-2 px-2 text-right font-black tabular-nums">{c.orders}</td>
                            <td className="py-2 px-2 text-right font-bold text-slate-800 tabular-nums">
                              {formatMoney(c.revenueRon)}
                            </td>
                            <td className="py-2 pl-2 text-right font-bold text-rose-600 tabular-nums">
                              -{formatMoney(c.discountRon)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <AdminPagination
                    currentPage={couponsPage}
                    totalItems={mkt.coupons.topCoupons.length}
                    itemsPerPage={6}
                    onPageChange={setCouponsPage}
                    compact
                    label="cupoane"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 2. Abonați & Lead-uri pe Sursă + Metode Plată & Livrare */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
            {/* Abonați & Lead-uri pe Sursă */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm sm:text-base font-black tracking-tight flex items-center gap-2">
                    <Mail size={17} className="text-blue-600" />
                    Abonați & Lead-uri pe Sursă
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {mkt.leads.activeSubscribersAllTime} activi din {mkt.leads.totalSubscribersAllTime} total (+{mkt.leads.subscribersInPeriod} în interval)
                  </p>
                </div>
                <Link
                  href="/admin/marketing/broadcast?tab=subscribers"
                  className="text-[11px] font-bold text-blue-600 hover:underline shrink-0"
                >
                  Vezi Abonați
                </Link>
              </div>

              <div className="space-y-2.5">
                {mkt.leads.sources.map((src) => {
                  const pct =
                    mkt.leads.totalSubscribersAllTime > 0
                      ? Math.round((src.allTime / mkt.leads.totalSubscribersAllTime) * 100)
                      : 0;
                  return (
                    <div key={src.key} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-slate-800">{src.label}</span>
                        <span className="font-black text-slate-900 tabular-nums">
                          {src.allTime} total ({pct}%) · +{src.inPeriod} nou
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full"
                          style={{ width: `${src.allTime > 0 ? Math.max(4, pct) : 0}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <Link href="/admin/leads" className="font-semibold text-slate-500 hover:text-[#e32f8c] transition-colors">
                  Mesaje Contact (formular):
                </Link>
                <span className="font-black text-slate-900 tabular-nums">
                  {mkt.leads.contactLeadsInPeriod} în interval · {mkt.leads.contactLeadsAllTime} total
                </span>
              </div>
            </div>

            {/* Metode Plată (Supabase) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-sm sm:text-base font-black tracking-tight flex items-center gap-2">
                  <CreditCard size={17} className="text-emerald-600" />
                  Metode de Plată (Comenzi)
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Card Online (Stripe) vs Ramburs la curier (COD)
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/40">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Card Online (Stripe)</span>
                    <span className="font-black text-blue-700 tabular-nums">{mkt.payments.card.percentage}%</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-xl font-black text-slate-900 tabular-nums">
                      {mkt.payments.card.count} comenzi
                    </span>
                    <span className="text-xs font-bold text-slate-700 tabular-nums">
                      {formatMoney(mkt.payments.card.revenueRon)}
                    </span>
                  </div>
                  {(mkt.payments.card.applePayCount > 0 || mkt.payments.card.googlePayCount > 0) && (
                    <div className="text-[10px] font-semibold text-slate-500 mt-1">
                      Apple Pay: {mkt.payments.card.applePayCount} · Google Pay: {mkt.payments.card.googlePayCount}
                    </div>
                  )}
                </div>

                <div className="p-3.5 rounded-xl border border-amber-100 bg-amber-50/40">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Ramburs (COD România)</span>
                    <span className="font-black text-amber-700 tabular-nums">{mkt.payments.ramburs.percentage}%</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-xl font-black text-slate-900 tabular-nums">
                      {mkt.payments.ramburs.count} comenzi
                    </span>
                    <span className="text-xs font-bold text-slate-700 tabular-nums">
                      {formatMoney(mkt.payments.ramburs.revenueRon)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                <div
                  className="bg-blue-600 h-full"
                  style={{ width: `${mkt.payments.card.percentage}%` }}
                />
                <div
                  className="bg-amber-500 h-full"
                  style={{ width: `${mkt.payments.ramburs.percentage}%` }}
                />
              </div>
            </div>

            {/* Metode Livrare (Supabase) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-sm sm:text-base font-black tracking-tight flex items-center gap-2">
                  <Truck size={17} className="text-[#e32f8c]" />
                  Metode de Livrare (Comenzi)
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Curier România vs Internațional vs Digital PDF
                </p>
              </div>

              <div className="space-y-2.5">
                {mkt.shipping.map((s) => {
                  const barCls =
                    s.key === 'courier_ro'
                      ? 'bg-blue-600'
                      : s.key === 'international'
                        ? 'bg-violet-600'
                        : 'bg-amber-500';
                  return (
                    <div key={s.key} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70">
                      <div className="flex flex-wrap items-center justify-between gap-1 sm:gap-2 text-xs mb-1">
                        <span className="font-bold text-slate-800 break-words leading-snug">{s.label}</span>
                        <span className="font-black text-slate-900 shrink-0 tabular-nums">
                          {s.count} ({s.percentage}%)
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold mb-1.5 tabular-nums">
                        <span>Venit: {formatMoney(s.revenueRon)}</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barCls}`}
                          style={{ width: `${s.count > 0 ? Math.max(4, s.percentage) : 0}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
