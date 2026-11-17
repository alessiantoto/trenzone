"use client";

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  ArrowUpRight,
  ChevronDown,
  Banknote,
  Loader2,
  Calendar,
  MapPin,
  Globe,
  ShoppingCart,
  RotateCcw,
  PackageX,
  RefreshCw,
  BookOpen,
  CreditCard,
  Truck,
  Check,
  Users,
  UserPlus,
  UserCheck,
  Box,
  BarChart3,
} from 'lucide-react';
import Link from 'next/link';
import { ModernDateRangePicker } from './components/ModernDateRangePicker';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const AVAILABLE_CURRENCIES = [
  { code: 'RON', label: 'RON', symbol: 'RON', flag: 'RO' },
  { code: 'EUR', label: 'EUR', symbol: '€', flag: 'EU' },
  { code: 'USD', label: 'USD', symbol: '$', flag: 'US' },
  { code: 'GBP', label: 'GBP', symbol: '£', flag: 'GB' },
];

const FALLBACK_EXCHANGE_RATES: Record<string, number> = {
  EUR: 5.3,
  USD: 4.88,
  GBP: 6.2,
};

function CurrencyFlagIcon({ code }: { code: string }) {
  switch (code) {
    case 'RON':
      return (
        <svg viewBox="0 0 24 16" className="w-4 h-3 rounded-[2px] border border-white/15 shrink-0" aria-hidden="true">
          <rect width="8" height="16" x="0" fill="#002B7F" />
          <rect width="8" height="16" x="8" fill="#FCD116" />
          <rect width="8" height="16" x="16" fill="#CE1126" />
        </svg>
      );
    case 'EUR':
      return (
        <svg viewBox="0 0 24 16" className="w-4 h-3 rounded-[2px] border border-white/15 shrink-0" aria-hidden="true">
          <rect width="24" height="16" fill="#003399" />
          <circle cx="12" cy="8" r="4.3" fill="none" stroke="#FFCC00" strokeWidth="1.2" strokeDasharray="1.1 1.65" />
        </svg>
      );
    case 'USD':
      return (
        <svg viewBox="0 0 24 16" className="w-4 h-3 rounded-[2px] border border-white/15 shrink-0" aria-hidden="true">
          <rect width="24" height="16" fill="#FFFFFF" />
          <rect width="24" height="2.3" y="0" fill="#B22234" />
          <rect width="24" height="2.3" y="4.6" fill="#B22234" />
          <rect width="24" height="2.3" y="9.2" fill="#B22234" />
          <rect width="24" height="2.3" y="13.7" fill="#B22234" />
          <rect width="10.5" height="9" fill="#3C3B6E" />
        </svg>
      );
    case 'GBP':
      return (
        <svg viewBox="0 0 60 40" className="w-4 h-3 rounded-[2px] border border-white/15 shrink-0" aria-hidden="true">
          <rect width="60" height="40" fill="#012169" />
          <path d="M0,0 L60,40 M60,0 L0,40" stroke="#FFFFFF" strokeWidth="7" />
          <path d="M0,0 L60,40 M60,0 L0,40" stroke="#C8102E" strokeWidth="3.5" />
          <path d="M30,0 V40 M0,20 H60" stroke="#FFFFFF" strokeWidth="11" />
          <path d="M30,0 V40 M0,20 H60" stroke="#C8102E" strokeWidth="6.5" />
        </svg>
      );
    default:
      return null;
  }
}

type HeroMetric = 'revenue' | 'orders';

function DeltaBadge({ pct, dark = false }: { pct: number | null | undefined; dark?: boolean }) {
  if (pct === null || pct === undefined || Number.isNaN(pct)) return null;
  const isUp = pct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-md leading-none ${
        isUp
          ? dark
            ? 'text-emerald-400 bg-emerald-500/15'
            : 'text-emerald-700 bg-emerald-50'
          : dark
            ? 'text-rose-400 bg-rose-500/15'
            : 'text-rose-700 bg-rose-50'
      }`}
    >
      {isUp ? `+${pct}%` : `${pct}%`}
    </span>
  );
}

const PRODUCT_COLORS = [
  '#e32f8c',
  '#8b5cf6',
  '#0ea5e9',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#f43f5e',
  '#14b8a6',
  '#f97316',
  '#eab308',
];

function getBucharestTodayStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Bucharest' });
}

export default function AdminDashboard() {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'web-analytics') {
        setIsRedirecting(true);
        router.replace('/admin/analytics');
      }
    }
  }, [router]);

  const [datePreset, setDatePreset] = useState('Astăzi');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('RON');
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const currencyDropdownRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const [heroMetric, setHeroMetric] = useState<HeroMetric>('revenue');

  useEffect(() => {
    if (!isCurrencyDropdownOpen && !isDatePickerOpen) return;
    const handleOutside = (e: PointerEvent) => {
      const target = e.target as Node;
      if (isCurrencyDropdownOpen && currencyDropdownRef.current && !currencyDropdownRef.current.contains(target)) {
        setIsCurrencyDropdownOpen(false);
      }
      if (isDatePickerOpen && datePickerRef.current && !datePickerRef.current.contains(target)) {
        setIsDatePickerOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCurrencyDropdownOpen(false);
        setIsDatePickerOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isCurrencyDropdownOpen, isDatePickerOpen]);

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  const [startDate, setStartDate] = useState(() => getBucharestTodayStr());
  const [endDate, setEndDate] = useState(() => getBucharestTodayStr());

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const presets = [
    {
      label: 'Astăzi',
      short: 'Astăzi',
      getRange: () => {
        const d = new Date();
        return [d, d];
      },
    },
    {
      label: 'Ieri',
      short: 'Ieri',
      getRange: () => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return [d, d];
      },
    },
    {
      label: 'Ultimele 7 zile',
      short: '7 zile',
      getRange: () => {
        const e = new Date();
        const s = new Date();
        s.setDate(s.getDate() - 7);
        return [s, e];
      },
    },
    {
      label: 'Ultimele 30 zile',
      short: '30 zile',
      getRange: () => {
        const e = new Date();
        const s = new Date();
        s.setDate(s.getDate() - 30);
        return [s, e];
      },
    },
    {
      label: 'Ultimele 90 zile',
      short: '90 zile',
      getRange: () => {
        const e = new Date();
        const s = new Date();
        s.setDate(s.getDate() - 90);
        return [s, e];
      },
    },
    {
      label: 'Toate',
      short: 'Toate',
      getRange: () => {
        const e = new Date();
        const s = new Date('2024-01-01T12:00:00Z');
        return [s, e];
      },
    },
  ];

  const handlePresetSelect = (preset: (typeof presets)[number]) => {
    const [start, end] = preset.getRange();
    setStartDate(start.toLocaleDateString('en-CA', { timeZone: 'Europe/Bucharest' }));
    setEndDate(end.toLocaleDateString('en-CA', { timeZone: 'Europe/Bucharest' }));
    setDatePreset(preset.label);
    setIsDatePickerOpen(false);
  };

  const formatMoneyFor = (ronAmount: number, currencyCode: string) => {
    const num = Number(ronAmount) || 0;
    if (currencyCode === 'RON') {
      const formatted = num.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return {
        value: num,
        formatted,
        symbol: 'RON',
        display: `${formatted} RON`,
      };
    }
    const rawRate = stats?.exchangeRates?.[currencyCode] || FALLBACK_EXCHANGE_RATES[currencyCode] || 1;
    const isRonPerUnit = rawRate > 1.05 || (currencyCode === 'HUF' && rawRate < 0.1);
    const foreignPerRon = isRonPerUnit ? 1 / rawRate : rawRate;
    const converted = num * foreignPerRon;
    const cfg = AVAILABLE_CURRENCIES.find((c) => c.code === currencyCode);
    const symbol = cfg?.symbol || currencyCode;
    const formatted = converted.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return {
      value: converted,
      formatted,
      symbol,
      display: `${formatted} ${symbol}`,
    };
  };

  const formatMoney = (ronAmount: number) => formatMoneyFor(ronAmount, selectedCurrency);

  const fetchData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    else setIsRefreshing(true);

    try {
      const statsRes = await fetch(`/api/admin/dashboard?startDate=${startDate}&endDate=${endDate}`, {
        cache: 'no-store',
      });
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats(statsData.stats);
      }
      setLastRefreshedAt(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isRedirecting) return;
    let mounted = true;
    fetchData();

    const interval = setInterval(() => {
      if (mounted && autoRefresh) {
        fetchData(true);
      }
    }, 10000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [startDate, endDate, autoRefresh, isRedirecting]);

  const displayTimeseries = useMemo(() => {
    if (!stats?.timeseries) return [];
    return stats.timeseries.map((item: any) => ({
      ...item,
      metricValue: heroMetric === 'revenue' ? formatMoney(item.revenue).value : item.orders,
      prevMetricValue: heroMetric === 'revenue' ? formatMoney(item.prevRevenue || 0).value : item.prevOrders || 0,
    }));
  }, [stats?.timeseries, selectedCurrency, stats?.exchangeRates, heroMetric]);

  const currencyTotals = useMemo(() => {
    const rev = stats?.revenue || 0;
    return AVAILABLE_CURRENCIES.map((c) => ({
      ...c,
      display: formatMoneyFor(rev, c.code).display,
    }));
  }, [stats?.revenue, stats?.exchangeRates]);

  const currencyBreakdownList = useMemo(() => {
    const raw: Array<{ currency: string; orders: number; revenueNative: number; revenueRon: number }> =
      stats?.currencyBreakdown || [];
    const byCode = new Map(raw.map((item) => [item.currency, item]));
    return AVAILABLE_CURRENCIES.map((c) => {
      const entry = byCode.get(c.code);
      const nativeVal = entry?.revenueNative || 0;
      return {
        code: c.code,
        symbol: c.symbol,
        orders: entry?.orders || 0,
        revenueNative: nativeVal,
        revenueRon: entry?.revenueRon || 0,
        formattedNative: nativeVal.toLocaleString('ro-RO', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      };
    });
  }, [stats?.currencyBreakdown]);

  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);

  if (isRedirecting || (loading && !stats)) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#e32f8c]" />
      </div>
    );
  }

  const actionCenter = stats?.actionCenter || {};
  const deltas = stats?.deltas || {};
  const isHourly = stats?.granularity === 'hourly';
  const customerSegments = stats?.customerSegments || {
    newCustomers: 0,
    returningCustomers: 0,
    newOrders: 0,
    returningOrders: 0,
    newRevenue: 0,
    returningRevenue: 0,
    returningPct: 0,
  };
  const shippingBreakdown: Array<{ key: string; label: string; count: number; revenue: number; percentage: number }> =
    stats?.shippingBreakdown || [];
  const totalUniqueCustomers = (customerSegments.newCustomers || 0) + (customerSegments.returningCustomers || 0);
  const newCustomersPct =
    totalUniqueCustomers > 0 ? Math.round(((customerSegments.newCustomers || 0) / totalUniqueCustomers) * 100) : 0;

  return (
    <div className="animate-in fade-in duration-500 pb-16 text-slate-900 max-w-[1400px] mx-auto space-y-5 sm:space-y-6">
      {/* ========================================================================= */}
      {/* OPERATIONAL HERO COMMAND CARD                                             */}
      {/* ========================================================================= */}
      <div className="bg-[#09090d] text-white rounded-3xl p-4 sm:p-6 shadow-2xl border border-white/10 relative">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
          <div className="absolute -top-24 right-0 w-72 h-72 rounded-full bg-[#e32f8c]/15 blur-[80px]" />
        </div>

        {/* TOP BAR: Live Sync + Analytics Link + Currency + Date Picker */}
        <div className="relative z-40 flex flex-wrap items-center justify-between gap-2.5 mb-4">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <div className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/10 px-3 py-1.5 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span className="text-[11px] font-black uppercase tracking-wider text-white">
                Operațional Live
              </span>
            </div>

            <button
              type="button"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                autoRefresh
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-white/[0.05] text-zinc-400 border-white/10'
              }`}
              title={`Ultima sincronizare: ${lastRefreshedAt.toLocaleTimeString('ro-RO')}`}
            >
              <RefreshCw size={11} className={isRefreshing ? 'animate-spin text-emerald-400' : ''} />
              <span className="hidden sm:inline">{autoRefresh ? 'Sync 10s' : 'Pauză'}</span>
            </button>

            <Link
              href="/admin/analytics"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-bold bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 border border-white/10 transition-colors"
            >
              <BarChart3 size={12} className="text-[#ff6eb6]" />
              <span>Web Analytics</span>
              <ArrowUpRight size={11} className="text-zinc-400" />
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {/* Currency Switcher */}
            <div ref={currencyDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsCurrencyDropdownOpen((prev) => !prev);
                  setIsDatePickerOpen(false);
                }}
                aria-expanded={isCurrencyDropdownOpen}
                className={`flex items-center gap-1.5 border rounded-xl px-2.5 py-1.5 text-xs font-bold text-white transition-colors duration-150 cursor-pointer active:scale-[0.97] ${
                  isCurrencyDropdownOpen
                    ? 'bg-white/15 border-[#e32f8c]/70 shadow-[0_0_16px_-4px_rgba(227,47,140,0.45)]'
                    : 'bg-white/[0.08] hover:bg-white/[0.13] border-white/10'
                }`}
              >
                <CurrencyFlagIcon code={selectedCurrency} />
                <span className="font-black tracking-tight tabular-nums">{selectedCurrency}</span>
                <ChevronDown
                  size={12}
                  className={`text-zinc-400 transition-transform duration-150 ${isCurrencyDropdownOpen ? 'rotate-180 text-[#ff6eb6]' : ''}`}
                />
              </button>

              <AnimatePresence initial={false}>
                {isCurrencyDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ type: 'spring', stiffness: 520, damping: 36, mass: 0.6 }}
                    style={{ willChange: 'transform, opacity' }}
                    className="fixed inset-x-4 top-20 sm:absolute sm:inset-x-auto sm:top-full sm:mt-2 sm:right-0 sm:w-64 bg-[#14141d] text-white border border-white/15 rounded-2xl shadow-[0_20px_50px_-10px_rgba(0,0,0,0.85)] p-1.5 z-[200] transform-gpu"
                  >
                    <div className="flex items-center justify-between px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-zinc-400 border-b border-white/[0.07] mb-1">
                      <span>Monedă</span>
                      <span>Vânzări totale</span>
                    </div>
                    <div className="space-y-0.5">
                      {currencyTotals.map((c) => {
                        const isSelected = selectedCurrency === c.code;
                        return (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => {
                              setSelectedCurrency(c.code);
                              setIsCurrencyDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-2.5 rounded-xl text-xs transition-colors duration-100 cursor-pointer active:scale-[0.98] ${
                              isSelected
                                ? 'bg-[#e32f8c]/20 text-white border border-[#e32f8c]/45 font-black'
                                : 'text-zinc-300 hover:bg-white/[0.08] hover:text-white border border-transparent font-bold'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <CurrencyFlagIcon code={c.code} />
                              <span>{c.code}</span>
                              {isSelected && <Check size={12} className="text-[#ff6eb6]" />}
                            </div>
                            <span className={`tabular-nums text-[11px] font-black ${isSelected ? 'text-[#ff7fc0]' : 'text-zinc-400'}`}>
                              {c.display}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Date Picker Trigger */}
            <div ref={datePickerRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsDatePickerOpen((prev) => !prev);
                  setIsCurrencyDropdownOpen(false);
                }}
                aria-expanded={isDatePickerOpen}
                className="flex items-center gap-1.5 bg-white/[0.08] hover:bg-white/[0.12] border border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-white transition-colors duration-150 cursor-pointer active:scale-[0.97]"
              >
                <Calendar size={13} className="text-[#ff6eb6]" />
                <span className="truncate max-w-[125px] sm:max-w-none">
                  {datePreset === 'Custom' ? `${startDate} · ${endDate}` : datePreset}
                </span>
                <ChevronDown
                  size={12}
                  className={`text-zinc-400 transition-transform duration-150 ${isDatePickerOpen ? 'rotate-180 text-[#ff6eb6]' : ''}`}
                />
              </button>

              <AnimatePresence initial={false}>
                {isDatePickerOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ type: 'spring', stiffness: 520, damping: 36, mass: 0.6 }}
                    style={{ willChange: 'transform, opacity' }}
                    className="fixed inset-x-4 top-20 sm:absolute sm:inset-x-auto sm:top-full sm:mt-2 sm:right-0 sm:w-80 bg-white text-slate-900 border border-slate-200 rounded-2xl shadow-2xl overflow-y-auto max-h-[75dvh] sm:max-h-none p-4 z-[200] transform-gpu"
                  >
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {presets.map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => handlePresetSelect(p)}
                          className={`text-xs font-bold px-3 py-2 rounded-lg text-left transition-colors ${
                            datePreset === p.label ? 'bg-[#e32f8c] text-black' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-slate-100 pt-4">
                      <p className="text-xs font-bold text-slate-500 mb-2">Interval Custom</p>
                      <ModernDateRangePicker
                        startDate={startDate}
                        endDate={endDate}
                        onRangeChange={(start, end) => {
                          setStartDate(start);
                          setEndDate(end);
                          setDatePreset('Custom');
                        }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* QUICK 1-TAP PERIOD PILLS */}
        <div className="relative z-10 flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-3 mb-3 border-b border-white/[0.07]">
          {presets.map((p) => {
            const active = datePreset === p.label;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => handlePresetSelect(p)}
                className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                  active ? 'bg-white text-black font-black shadow-sm' : 'bg-white/[0.06] text-zinc-300 hover:bg-white/[0.12]'
                }`}
              >
                {p.short}
              </button>
            );
          })}
        </div>

        {/* HERO OPERATIONAL METRIC TABS */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
          <button
            type="button"
            onClick={() => setHeroMetric('revenue')}
            className={`text-left rounded-2xl p-3 sm:p-3.5 border transition-all cursor-pointer ${
              heroMetric === 'revenue'
                ? 'bg-white/[0.11] border-[#e32f8c]/60 shadow-[0_0_24px_-8px_rgba(227,47,140,0.45)]'
                : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.07]'
            }`}
          >
            <div className="text-[11px] font-bold text-zinc-400">Vânzări totale</div>
            <div className="mt-1 flex items-baseline justify-between gap-1.5 flex-wrap">
              <span className="text-base sm:text-xl font-black text-white tracking-tight tabular-nums">
                {formatMoney(stats?.revenue || 0).formatted}{' '}
                <span className="text-[11px] font-bold text-zinc-400">{formatMoney(stats?.revenue || 0).symbol}</span>
              </span>
              <DeltaBadge pct={deltas.revenuePct} dark />
            </div>
          </button>

          <button
            type="button"
            onClick={() => setHeroMetric('orders')}
            className={`text-left rounded-2xl p-3 sm:p-3.5 border transition-all cursor-pointer ${
              heroMetric === 'orders'
                ? 'bg-white/[0.11] border-sky-400/60 shadow-[0_0_24px_-8px_rgba(56,189,248,0.45)]'
                : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.07]'
            }`}
          >
            <div className="text-[11px] font-bold text-zinc-400">Comenzi</div>
            <div className="mt-1 flex items-baseline justify-between gap-1.5 flex-wrap">
              <span className="text-base sm:text-xl font-black text-white tracking-tight tabular-nums">
                {stats?.orders ?? 0}
              </span>
              <DeltaBadge pct={deltas.ordersPct} dark />
            </div>
          </button>

          <div className="rounded-2xl p-3 sm:p-3.5 border border-white/[0.08] bg-white/[0.04]">
            <div className="text-[11px] font-bold text-zinc-400">Valoare Medie (AOV)</div>
            <div className="mt-1 flex items-baseline justify-between gap-1.5 flex-wrap">
              <span className="text-base sm:text-xl font-black text-white tracking-tight tabular-nums">
                {formatMoney(stats?.aov || 0).formatted}{' '}
                <span className="text-[11px] font-bold text-zinc-400">{formatMoney(stats?.aov || 0).symbol}</span>
              </span>
              <DeltaBadge pct={deltas.aovPct} dark />
            </div>
          </div>

          <div className="rounded-2xl p-3 sm:p-3.5 border border-white/[0.08] bg-white/[0.04]">
            <div className="text-[11px] font-bold text-zinc-400">Clienți Unici</div>
            <div className="mt-1 flex items-baseline justify-between gap-1.5 flex-wrap">
              <span className="text-base sm:text-xl font-black text-white tracking-tight tabular-nums">
                {stats?.customers ?? 0}
              </span>
              <DeltaBadge pct={deltas.customersPct} dark />
            </div>
          </div>
        </div>

        {/* 4-CURRENCY MIX BREAKDOWN PILLS (RON · EUR · USD · GBP) */}
        <div className="relative z-10 mb-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] px-3 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
              Încasări native pe monedă
            </span>
            <span className="text-[11px] font-bold text-zinc-300 tabular-nums">
              Total convertit ({selectedCurrency}):{' '}
              <strong className="text-white">{formatMoney(stats?.revenue || 0).display}</strong>
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
            {currencyBreakdownList.map((item) => {
              const isSelected = selectedCurrency === item.code;
              const hasOrders = item.orders > 0;
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => setSelectedCurrency(item.code)}
                  className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#e32f8c]/20 border-[#e32f8c]/55 text-white'
                      : hasOrders
                        ? 'bg-white/[0.06] border-white/10 text-zinc-200 hover:bg-white/[0.11]'
                        : 'bg-white/[0.02] border-white/[0.05] text-zinc-500 hover:bg-white/[0.06]'
                  }`}
                  title={`Afișează totalurile în ${item.code}`}
                >
                  <span className="inline-flex items-center gap-1.5 min-w-0">
                    <CurrencyFlagIcon code={item.code} />
                    <span className="text-[11px] font-black tracking-tight">{item.code}</span>
                    <span className="text-[10px] font-bold text-zinc-400 tabular-nums">
                      ({item.orders})
                    </span>
                  </span>
                  <span className="text-[11px] font-black tabular-nums truncate">
                    {item.formattedNative} {item.symbol}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* HERO CURVE CHART (Solid Current Period + Dashed Previous Period) */}
        <div className="relative z-10 h-[210px] sm:h-[260px] w-full touch-pan-y">
          {displayTimeseries && displayTimeseries.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={displayTimeseries} margin={{ top: 8, right: 6, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="heroChartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={heroMetric === 'revenue' ? '#e32f8c' : '#38bdf8'} stopOpacity={0.38} />
                    <stop offset="95%" stopColor={heroMetric === 'revenue' ? '#e32f8c' : '#38bdf8'} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  minTickGap={22}
                  tick={{ fontSize: 10, fill: '#a1a1aa', fontWeight: 600 }}
                  dy={6}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={42}
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: '#a1a1aa' }}
                  tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(1)}k` : `${val}`)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111118',
                    borderRadius: '14px',
                    border: '1px solid rgba(255,255,255,0.12)',
                    boxShadow: '0 16px 40px -10px rgba(0,0,0,0.8)',
                    fontSize: '12px',
                    color: '#fff',
                  }}
                  formatter={(value: any, name: any) => {
                    const isPrev = String(name) === 'prevMetricValue';
                    const label = isPrev ? 'Perioada anterioară' : heroMetric === 'revenue' ? 'Vânzări' : 'Comenzi';
                    const valStr =
                      heroMetric === 'revenue'
                        ? `${Number(value).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${formatMoney(0).symbol}`
                        : `${Number(value)} comenzi`;
                    return [valStr, label];
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="prevMetricValue"
                  stroke="#71717a"
                  strokeWidth={1.75}
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={false}
                />
                <Area
                  type="monotone"
                  dataKey="metricValue"
                  stroke={heroMetric === 'revenue' ? '#e32f8c' : '#38bdf8'}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#heroChartGrad)"
                  activeDot={{ r: 5, fill: '#fff', stroke: heroMetric === 'revenue' ? '#e32f8c' : '#38bdf8', strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-zinc-500 text-xs font-medium">
              Nu există date pentru intervalul selectat.
            </div>
          )}
        </div>

        {/* HERO FOOTER STRIP */}
        <div className="relative z-10 mt-3 pt-3 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-400">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <span className={`h-0.5 w-4 rounded-full ${heroMetric === 'revenue' ? 'bg-[#e32f8c]' : 'bg-sky-400'}`} />
              <span>{isHourly ? 'Zi selectată (pe ore)' : 'Perioada curentă'}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0 w-4 border-t border-dashed border-zinc-500" />
              <span>Perioada anterioară</span>
            </span>
          </div>
          <div className="flex items-center gap-3 font-bold text-zinc-300">
            <span>
              Card: {formatMoney(stats?.cardRevenue || 0).formatted} · Ramburs: {formatMoney(stats?.rambursRevenue || 0).formatted}{' '}
              {formatMoney(0).symbol}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ACTIVITATE & ACȚIUNI RAPIDE                                               */}
      {/* ========================================================================= */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
            Activitate & Acțiuni Rapide
          </h2>
          <span className="text-[11px] font-bold text-slate-400">Date Supabase</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
          {/* Comenzi fără AWB */}
          <Link
            href="/admin/orders"
            className="bg-white border border-slate-200/90 hover:border-[#e32f8c]/50 rounded-2xl p-3.5 sm:p-4 shadow-xs transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] sm:text-xs font-bold text-slate-500 truncate">Onorați comenzile</span>
              <Truck size={15} className="text-[#e32f8c] shrink-0" />
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-1">
              <span className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums">
                {actionCenter.pendingFulfillmentCount ?? 0}
              </span>
              <span className="text-[10px] font-bold text-slate-400 group-hover:text-[#e32f8c] inline-flex items-center gap-0.5">
                Fără AWB <ArrowUpRight size={11} />
              </span>
            </div>
          </Link>

          {/* Programe PDF de trimis */}
          <Link
            href="/admin/programs"
            className="bg-white border border-slate-200/90 hover:border-amber-400 rounded-2xl p-3.5 sm:p-4 shadow-xs transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] sm:text-xs font-bold text-slate-500 truncate">Programe PDF</span>
              <BookOpen size={15} className="text-amber-500 shrink-0" />
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-1">
              <span className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums">
                {actionCenter.pendingProgramsCount ?? 0}
              </span>
              <span className="text-[10px] font-bold text-slate-400 group-hover:text-amber-600 inline-flex items-center gap-0.5">
                De trimis <ArrowUpRight size={11} />
              </span>
            </div>
          </Link>

          {/* Coșuri abandonate */}
          <Link
            href="/admin/abandoned-carts"
            className="bg-white border border-slate-200/90 hover:border-orange-400 rounded-2xl p-3.5 sm:p-4 shadow-xs transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] sm:text-xs font-bold text-slate-500 truncate">Coșuri abandonate</span>
              <ShoppingCart size={15} className="text-orange-500 shrink-0" />
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-1">
              <span className="text-xl sm:text-2xl font-black text-orange-600 tabular-nums">
                {stats?.abandonedCarts || 0}
              </span>
              <span className="text-[10px] font-bold text-slate-500 truncate tabular-nums">
                {formatMoney(stats?.potentialLostRevenue || 0).formatted} {formatMoney(0).symbol}
              </span>
            </div>
          </Link>

          {/* Clienți Unici */}
          <Link
            href="/admin/customers"
            className="bg-white border border-slate-200/90 hover:border-emerald-400 rounded-2xl p-3.5 sm:p-4 shadow-xs transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] sm:text-xs font-bold text-slate-500 truncate">Clienți Unici</span>
              <Users size={15} className="text-emerald-600 shrink-0" />
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-1">
              <span className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums">
                {stats?.customers ?? 0}
              </span>
              <DeltaBadge pct={deltas.customersPct} />
            </div>
          </Link>
        </div>

        {/* Secondary Financial Health Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 gap-1">
              <span className="truncate">Valoare Medie (AOV)</span>
              <Banknote size={14} className="text-emerald-500 shrink-0" />
            </div>
            <div className="mt-1.5 flex items-baseline justify-between gap-1 flex-wrap">
              <span className="text-sm sm:text-lg font-black text-slate-900 tabular-nums">
                {formatMoney(stats?.aov || 0).display}
              </span>
              <DeltaBadge pct={deltas.aovPct} />
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 gap-1">
              <span className="truncate">Plăți Card vs Ramburs</span>
              <CreditCard size={14} className="text-blue-500 shrink-0" />
            </div>
            <div className="mt-1.5 text-xs sm:text-sm font-black text-slate-900 truncate tabular-nums">
              {stats?.cardCount ?? 0} Card · {stats?.rambursCount ?? 0} Ramburs
            </div>
            <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5 tabular-nums">
              {formatMoney(stats?.cardRevenue || 0).formatted} / {formatMoney(stats?.rambursRevenue || 0).formatted}{' '}
              {formatMoney(0).symbol}
            </div>
          </div>

          <Link
            href="/admin/returns"
            className="bg-white border border-slate-200/90 hover:border-red-300 rounded-2xl p-3.5 sm:p-4 shadow-xs transition-all"
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 gap-1">
              <span className="truncate">Retururi / Anulări</span>
              <RotateCcw size={14} className="text-red-500 shrink-0" />
            </div>
            <div className="mt-1.5 flex items-baseline justify-between gap-1 flex-wrap">
              <span className="text-sm sm:text-lg font-black text-red-600 tabular-nums">
                {stats?.returnRate || '0.0'}%
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 tabular-nums">
                {stats?.returnsCount || 0} ret. · {stats?.cancelledOrdersCount || 0} anul.
              </span>
            </div>
          </Link>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 gap-1">
              <span className="truncate">Neridicate / Eșuate</span>
              <PackageX size={14} className="text-purple-500 shrink-0" />
            </div>
            <div className="mt-1.5 flex items-baseline justify-between gap-1 flex-wrap">
              <span className="text-sm sm:text-lg font-black text-purple-600 tabular-nums">
                {stats?.failedOrdersCount || 0}
              </span>
              <span className="text-[10px] font-bold text-slate-500 truncate tabular-nums">
                {formatMoney(stats?.failedOrdersValue || 0).display}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUPABASE OPERATIONAL SEGMENTS: CLIENȚI NOI VS RECURENȚI & LIVRARE       */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* Clienți Noi vs Recurenți */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <Users size={18} className="text-[#e32f8c]" />
                Clienți Noi vs Recurenți
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Calculat din istoricul complet al comenzilor din Supabase
              </p>
            </div>
            <span className="text-[11px] font-black text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full shrink-0 tabular-nums">
              {customerSegments.returningPct}% recurenți
            </span>
          </div>

          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex mb-4">
            <div
              className="bg-[#e32f8c] h-full transition-all duration-500"
              style={{ width: `${totalUniqueCustomers > 0 ? newCustomersPct : 50}%` }}
            />
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{ width: `${totalUniqueCustomers > 0 ? 100 - newCustomersPct : 50}%` }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-pink-50/60 border border-pink-100">
              <div className="flex items-center justify-between gap-1 text-xs font-bold text-slate-600">
                <span className="flex items-center gap-1.5">
                  <UserPlus size={14} className="text-[#e32f8c]" />
                  Clienți Noi
                </span>
                <span className="text-[10px] font-black text-[#e32f8c]">{newCustomersPct}%</span>
              </div>
              <div className="mt-1.5 text-xl font-black text-slate-900 tabular-nums">
                {customerSegments.newCustomers}
              </div>
              <div className="text-[11px] text-slate-500 font-semibold mt-0.5 tabular-nums">
                {customerSegments.newOrders} comenzi · {formatMoney(customerSegments.newRevenue).display}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
              <div className="flex items-center justify-between gap-1 text-xs font-bold text-slate-600">
                <span className="flex items-center gap-1.5">
                  <UserCheck size={14} className="text-emerald-600" />
                  Recurenți
                </span>
                <span className="text-[10px] font-black text-emerald-700">
                  {totalUniqueCustomers > 0 ? 100 - newCustomersPct : 0}%
                </span>
              </div>
              <div className="mt-1.5 text-xl font-black text-slate-900 tabular-nums">
                {customerSegments.returningCustomers}
              </div>
              <div className="text-[11px] text-slate-500 font-semibold mt-0.5 tabular-nums">
                {customerSegments.returningOrders} comenzi · {formatMoney(customerSegments.returningRevenue).display}
              </div>
            </div>
          </div>
        </div>

        {/* Easybox / Locker vs Curier la ușă vs Internațional */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <Box size={18} className="text-blue-600" />
                Metode de Livrare
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Easybox / Locker vs Curier la ușă vs Internațional
              </p>
            </div>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full shrink-0 tabular-nums">
              {stats?.orders ?? 0} comenzi
            </span>
          </div>

          <div className="space-y-2.5">
            {shippingBreakdown.filter((b) => b.count > 0 || b.key !== 'digital').map((bucket) => {
              const barColor =
                bucket.key === 'easybox'
                  ? 'bg-[#e32f8c]'
                  : bucket.key === 'courier_ro'
                    ? 'bg-blue-600'
                    : bucket.key === 'international'
                      ? 'bg-violet-600'
                      : 'bg-amber-500';
              return (
                <div key={bucket.key} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70">
                  <div className="flex flex-wrap items-center justify-between gap-1 sm:gap-2 text-xs mb-1.5">
                    <span className="font-bold text-slate-800 truncate">{bucket.label}</span>
                    <span className="font-black text-slate-900 shrink-0 tabular-nums">
                      {bucket.count} ({bucket.percentage}%) · {formatMoney(bucket.revenue).display}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${bucket.count > 0 ? Math.max(4, bucket.percentage) : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LOCATIONS & TOP PRODUCTS                                                  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* LOCATION DRILLDOWN */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs lg:col-span-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Globe size={18} className="text-slate-500" />
              <h2 className="text-base sm:text-lg font-black tracking-tight">Locații Livrare</h2>
            </div>
            <span className="text-[11px] font-bold text-slate-400">
              {stats?.locations?.length || 0} {stats?.locations?.length === 1 ? 'țară' : 'țări'}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2.5 max-h-[360px]">
            {stats?.locations && stats.locations.length > 0 ? (
              stats.locations.map((loc: any) => {
                const locMoney = formatMoney(loc.revenue);
                return (
                  <div key={loc.country} className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50">
                    <button
                      type="button"
                      onClick={() => setExpandedCountry(expandedCountry === loc.country ? null : loc.country)}
                      className="w-full flex items-center justify-between p-3 hover:bg-slate-100/70 transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className="text-[10px] font-black uppercase bg-slate-900 text-white px-1.5 py-0.5 rounded shrink-0">
                          {loc.code || 'INT'}
                        </span>
                        <span className="font-bold text-xs sm:text-sm text-slate-800 truncate">{loc.country}</span>
                        <span className="text-[10px] bg-slate-200/80 text-slate-600 px-1.5 py-0.5 rounded-full font-bold shrink-0">
                          {loc.orders}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs sm:text-sm text-right shrink-0">
                        <span className="font-black text-slate-900 tabular-nums">
                          {locMoney.formatted} {locMoney.symbol}
                        </span>
                        <ChevronDown
                          size={13}
                          className={`text-slate-400 transition-transform ${expandedCountry === loc.country ? 'rotate-180' : ''}`}
                        />
                      </div>
                    </button>

                    {expandedCountry === loc.country && (
                      <div className="bg-white border-t border-slate-100 p-2 space-y-1">
                        {loc.cities.map((city: any) => (
                          <div key={city.name} className="flex items-center justify-between py-1.5 px-2.5 hover:bg-slate-50 rounded-lg">
                            <span className="text-xs text-slate-600 font-medium truncate pr-3 flex items-center gap-1.5">
                              <MapPin size={11} className="text-slate-400 shrink-0" /> {city.name}
                            </span>
                            <span className="text-xs font-bold text-slate-700 shrink-0 tabular-nums">
                              {formatMoney(city.revenue).display}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="flex h-[180px] flex-col items-center justify-center text-center p-4">
                <Globe size={26} className="text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-500">Nicio comandă în acest interval</p>
              </div>
            )}
          </div>
        </div>

        {/* TOP SELLING PRODUCTS & VARIANTS */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package size={18} className="text-[#e32f8c]" />
              <h2 className="text-base sm:text-lg font-black tracking-tight">Top Produse & Variante Vândute</h2>
            </div>
            {stats?.topProducts && stats.topProducts.length > 0 && (
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full tabular-nums">
                Total: {stats.topProducts.reduce((sum: number, p: any) => sum + (p.quantity || 0), 0)} buc.
              </span>
            )}
          </div>

          <div className="flex-1">
            {stats?.topProducts && stats.topProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 items-center">
                <div className="md:col-span-5 h-[190px] sm:h-[240px] relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.topProducts}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={82}
                        paddingAngle={3}
                        dataKey="quantity"
                        nameKey="name"
                      >
                        {stats.topProducts.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={PRODUCT_COLORS[index % PRODUCT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any, _name: any, props: any) => [
                          `${Number(value)} buc. (${formatMoney(props.payload.revenue).display})`,
                          'Vânzări',
                        ]}
                        contentStyle={{
                          borderRadius: '12px',
                          border: 'none',
                          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl sm:text-2xl font-black text-slate-900 leading-none tabular-nums">
                      {stats.topProducts.reduce((sum: number, p: any) => sum + (p.quantity || 0), 0)}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">bucăți</span>
                  </div>
                </div>

                <div className="md:col-span-7 space-y-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                  {(() => {
                    const totalQty = stats.topProducts.reduce((sum: number, p: any) => sum + (p.quantity || 0), 0) || 1;
                    return stats.topProducts.map((p: any, idx: number) => {
                      const color = PRODUCT_COLORS[idx % PRODUCT_COLORS.length];
                      const pct = ((p.quantity / totalQty) * 100).toFixed(1);
                      const money = formatMoney(p.revenue);
                      return (
                        <div key={p.name} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60">
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                              <span className="text-xs font-bold text-slate-800 line-clamp-1">{p.name}</span>
                            </div>
                            <span className="text-xs font-black text-slate-900 shrink-0 tabular-nums">
                              {money.formatted} {money.symbol}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 shrink-0 tabular-nums">
                              {p.quantity} buc ({pct}%)
                            </span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            ) : (
              <div className="flex h-[200px] flex-col items-center justify-center text-center">
                <Package size={28} className="text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-500">Niciun produs vândut în intervalul selectat</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
