"use client";

import { useEffect, useState, useMemo } from 'react';
import {
  Package,
  ArrowUpRight,
  ChevronDown,
  Banknote,
  Loader2,
  Calendar,
  MapPin,
  TrendingUp,
  TrendingDown,
  Globe,
  ShoppingCart,
  RotateCcw,
  PackageX,
  Percent,
  Smartphone,
  Monitor,
  Tablet,
  Sparkles,
  Share2,
  Layers,
  RefreshCw,
  BookOpen,
  CreditCard,
  Truck,
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
  { code: 'RON', label: 'RON (lei)', symbol: 'RON', flag: '🇷🇴' },
  { code: 'EUR', label: 'EUR (€)', symbol: '€', flag: '🇪🇺' },
  { code: 'USD', label: 'USD ($)', symbol: '$', flag: '🇺🇸' },
  { code: 'GBP', label: 'GBP (£)', symbol: '£', flag: '🇬🇧' },
  { code: 'PLN', label: 'PLN (zł)', symbol: 'zł', flag: '🇵🇱' },
];

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

export default function AdminDashboard() {
  const [datePreset, setDatePreset] = useState('Astăzi');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('RON');
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const [heroMetric, setHeroMetric] = useState<HeroMetric>('revenue');

  // Real-time auto-refresh state
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  // Default to Today (Shopify Mobile style instant pulse) — easy 1-tap switch to Ieri / 7z / 30z
  const [startDate, setStartDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [endDate, setEndDate] = useState(() => new Date().toLocaleDateString('en-CA'));

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const presets = [
    { label: 'Astăzi', short: 'Astăzi', getRange: () => { const d = new Date(); return [d, d]; } },
    { label: 'Ieri', short: 'Ieri', getRange: () => { const d = new Date(); d.setDate(d.getDate() - 1); return [d, d]; } },
    { label: 'Ultimele 7 zile', short: '7 zile', getRange: () => { const e = new Date(); const s = new Date(); s.setDate(s.getDate() - 7); return [s, e]; } },
    { label: 'Ultimele 30 zile', short: '30 zile', getRange: () => { const e = new Date(); const s = new Date(); s.setDate(s.getDate() - 30); return [s, e]; } },
    { label: 'Ultimele 90 zile', short: '90 zile', getRange: () => { const e = new Date(); const s = new Date(); s.setDate(s.getDate() - 90); return [s, e]; } },
    { label: 'Toate', short: 'Toate', getRange: () => { const e = new Date(); const s = new Date('2024-01-01'); return [s, e]; } },
  ];

  const handlePresetSelect = (preset: any) => {
    const [start, end] = preset.getRange();
    setStartDate(start.toLocaleDateString('en-CA'));
    setEndDate(end.toLocaleDateString('en-CA'));
    setDatePreset(preset.label);
    setIsDatePickerOpen(false);
  };

  const formatMoney = (ronAmount: number) => {
    const num = Number(ronAmount) || 0;
    if (selectedCurrency === 'RON') {
      return {
        value: num,
        formatted: num.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        symbol: 'RON',
        display: `${num.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`,
      };
    }
    const rawRate = stats?.exchangeRates?.[selectedCurrency] || 1;
    const isRonPerUnit = rawRate > 1.5 || (selectedCurrency === 'HUF' && rawRate < 0.1);
    const foreignPerRon = isRonPerUnit ? 1 / rawRate : rawRate;
    const converted = num * foreignPerRon;
    const cfg = AVAILABLE_CURRENCIES.find((c) => c.code === selectedCurrency);
    const symbol = cfg?.symbol || selectedCurrency;
    return {
      value: converted,
      formatted: converted.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      symbol,
      display: `${converted.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`,
    };
  };

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
  }, [startDate, endDate, autoRefresh]);

  const displayTimeseries = useMemo(() => {
    if (!stats?.timeseries) return [];
    return stats.timeseries.map((item: any) => ({
      ...item,
      displayRevenue: formatMoney(item.revenue).value,
      displayPrevRevenue: formatMoney(item.prevRevenue || 0).value,
      metricValue: heroMetric === 'revenue' ? formatMoney(item.revenue).value : item.orders,
      prevMetricValue: heroMetric === 'revenue' ? formatMoney(item.prevRevenue || 0).value : item.prevOrders || 0,
    }));
  }, [stats?.timeseries, selectedCurrency, stats?.exchangeRates, heroMetric]);

  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#e32f8c]" />
      </div>
    );
  }

  const liveUsers = typeof stats?.webAnalytics?.activeUsers === 'number' ? stats.webAnalytics.activeUsers : 0;
  const webTelemetry = stats?.webAnalytics || {};
  const actionCenter = stats?.actionCenter || {};
  const deltas = stats?.deltas || {};
  const isHourly = stats?.granularity === 'hourly';

  return (
    <div className="animate-in fade-in duration-500 pb-16 text-slate-900 max-w-[1400px] mx-auto space-y-5 sm:space-y-6">
      {/* ========================================================================= */}
      {/* SHOPIFY-STYLE DARK HERO COMMAND CARD (MOBILE-FIRST + DESKTOP PRO)         */}
      {/* ========================================================================= */}
      <div className="bg-[#09090d] text-white rounded-3xl p-4 sm:p-6 shadow-2xl border border-white/10 relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 right-0 w-72 h-72 rounded-full bg-[#e32f8c]/15 blur-[80px]" />

        {/* TOP BAR: Live indicator + Sync + Currency + Custom Date */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2.5 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <div className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/10 px-3 py-1.5 rounded-full">
              {liveUsers > 0 ? (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
              ) : (
                <span className="h-2 w-2 rounded-full bg-zinc-500" />
              )}
              <span className="text-[11px] font-black uppercase tracking-wider text-white">
                Live: {liveUsers}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                autoRefresh
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-white/[0.05] text-zinc-400 border-white/10'
              }`}
              title={`Ultima sincronizare: ${lastRefreshedAt.toLocaleTimeString('ro-RO')}`}
            >
              <RefreshCw size={11} className={isRefreshing ? 'animate-spin text-emerald-400' : ''} />
              <span className="hidden sm:inline">{autoRefresh ? 'Live 10s' : 'Pauză'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Currency Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
                className="flex items-center gap-1.5 bg-white/[0.08] hover:bg-white/[0.12] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-bold text-white transition-all"
              >
                <span className="text-sm leading-none">
                  {AVAILABLE_CURRENCIES.find((c) => c.code === selectedCurrency)?.flag}
                </span>
                <span className="font-black">{selectedCurrency}</span>
                <ChevronDown size={12} className={`text-zinc-400 transition-transform ${isCurrencyDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isCurrencyDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-[199]" onClick={() => setIsCurrencyDropdownOpen(false)} />
                  <div className="fixed inset-x-4 top-20 sm:absolute sm:inset-x-auto sm:top-full sm:mt-1.5 sm:right-0 sm:w-48 bg-white text-slate-900 border border-slate-200 rounded-xl shadow-2xl p-1.5 z-[200]">
                    <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Monedă Statistici
                    </div>
                    {AVAILABLE_CURRENCIES.map((c) => {
                      const isSelected = selectedCurrency === c.code;
                      return (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => {
                            setSelectedCurrency(c.code);
                            setIsCurrencyDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-bold transition-colors ${
                            isSelected ? 'bg-[#e32f8c]/10 text-[#c81e78] font-black' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{c.flag}</span>
                            <span>{c.code}</span>
                          </div>
                          <span className="text-[11px] text-slate-400">{c.symbol}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Date Picker Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                className="flex items-center gap-1.5 bg-white/[0.08] hover:bg-white/[0.12] border border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-white transition-colors"
              >
                <Calendar size={13} className="text-[#ff6eb6]" />
                <span className="truncate max-w-[125px] sm:max-w-none">
                  {datePreset === 'Custom' ? `${startDate} · ${endDate}` : datePreset}
                </span>
                <ChevronDown size={12} className={`text-zinc-400 transition-transform ${isDatePickerOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDatePickerOpen && (
                <>
                  <div className="fixed inset-0 z-[199]" onClick={() => setIsDatePickerOpen(false)} />
                  <div className="fixed inset-x-4 top-20 sm:absolute sm:inset-x-auto sm:top-full sm:mt-2 sm:right-0 sm:w-80 bg-white text-slate-900 border border-slate-200 rounded-2xl shadow-2xl overflow-y-auto max-h-[80vh] sm:max-h-none p-4 z-[200]">
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
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* QUICK 1-TAP PERIOD PILLS (Ultra fast on Mobile!) */}
        <div className="relative z-10 flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-3 mb-3 border-b border-white/[0.07]">
          {presets.map((p) => {
            const active = datePreset === p.label;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => handlePresetSelect(p)}
                className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                  active
                    ? 'bg-white text-black font-black shadow-sm'
                    : 'bg-white/[0.06] text-zinc-300 hover:bg-white/[0.12]'
                }`}
              >
                {p.short}
              </button>
            );
          })}
        </div>

        {/* SHOPIFY HERO METRIC TABS (Vânzări | Comenzi | Conversie | Sesiuni) */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
          <button
            type="button"
            onClick={() => setHeroMetric('revenue')}
            className={`text-left rounded-2xl p-3 sm:p-3.5 border transition-all ${
              heroMetric === 'revenue'
                ? 'bg-white/[0.11] border-[#e32f8c]/60 shadow-[0_0_24px_-8px_rgba(227,47,140,0.45)]'
                : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.07]'
            }`}
          >
            <div className="text-[11px] font-bold text-zinc-400">Vânzări totale</div>
            <div className="mt-1 flex items-baseline justify-between gap-1.5 flex-wrap">
              <span className="text-base sm:text-xl font-black text-white tracking-tight">
                {formatMoney(stats?.revenue || 0).formatted}{' '}
                <span className="text-[11px] font-bold text-zinc-400">{formatMoney(stats?.revenue || 0).symbol}</span>
              </span>
              <DeltaBadge pct={deltas.revenuePct} dark />
            </div>
          </button>

          <button
            type="button"
            onClick={() => setHeroMetric('orders')}
            className={`text-left rounded-2xl p-3 sm:p-3.5 border transition-all ${
              heroMetric === 'orders'
                ? 'bg-white/[0.11] border-sky-400/60 shadow-[0_0_24px_-8px_rgba(56,189,248,0.45)]'
                : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.07]'
            }`}
          >
            <div className="text-[11px] font-bold text-zinc-400">Comenzi</div>
            <div className="mt-1 flex items-baseline justify-between gap-1.5 flex-wrap">
              <span className="text-base sm:text-xl font-black text-white tracking-tight">
                {stats?.orders ?? 0}
              </span>
              <DeltaBadge pct={deltas.ordersPct} dark />
            </div>
          </button>

          <div className="rounded-2xl p-3 sm:p-3.5 border border-white/[0.08] bg-white/[0.04]">
            <div className="text-[11px] font-bold text-zinc-400">Rată de conversie</div>
            <div className="mt-1 flex items-baseline justify-between gap-1.5 flex-wrap">
              <span className="text-base sm:text-xl font-black text-white tracking-tight">
                {stats?.conversionRate || '0.0'}%
              </span>
              <DeltaBadge pct={deltas.conversionPct} dark />
            </div>
          </div>

          <div className="rounded-2xl p-3 sm:p-3.5 border border-white/[0.08] bg-white/[0.04]">
            <div className="text-[11px] font-bold text-zinc-400">Sesiuni</div>
            <div className="mt-1 flex items-baseline justify-between gap-1.5 flex-wrap">
              <span className="text-base sm:text-xl font-black text-white tracking-tight">
                {stats?.totalSessions ?? 0}
              </span>
              <DeltaBadge pct={deltas.sessionsPct} dark />
            </div>
          </div>
        </div>

        {/* HERO CURVE CHART (Solid Current Period + Dashed Previous Period) */}
        <div className="relative z-10 h-[210px] sm:h-[260px] w-full">
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

        {/* HERO FOOTER STRIP: Comparison legend + AOV + Payment split */}
        <div className="relative z-10 mt-3 pt-3 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-400">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <span className={`h-0.5 w-4 rounded-full ${heroMetric === 'revenue' ? 'bg-[#e32f8c]' : 'bg-sky-400'}`} />
              <span>{isHourly ? 'Azi / Zi selectată (pe ore)' : 'Perioada curentă'}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0 w-4 border-t border-dashed border-zinc-500" />
              <span>Anterior</span>
            </span>
          </div>
          <div className="flex items-center gap-3 font-bold text-zinc-300">
            <span>AOV: {formatMoney(stats?.aov || 0).display}</span>
            <span className="hidden sm:inline text-zinc-500">•</span>
            <span className="hidden sm:inline">
              Card: {formatMoney(stats?.cardRevenue || 0).formatted} · Ramburs: {formatMoney(stats?.rambursRevenue || 0).formatted}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ACTIVITATE & ACȚIUNI RAPIDE (Shopify Mobile Insight Cards)               */}
      {/* ========================================================================= */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
            Activitate & Acțiuni Rapide
          </h2>
          <span className="text-[11px] font-bold text-slate-400">Live magazin</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
          {/* Onorare comenzi */}
          <Link
            href="/admin/orders"
            className="bg-white border border-slate-200/90 hover:border-[#e32f8c]/50 rounded-2xl p-3.5 sm:p-4 shadow-xs transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] sm:text-xs font-bold text-slate-500 truncate">Onorați comenzile</span>
              <Truck size={15} className="text-[#e32f8c] shrink-0" />
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-1">
              <span className="text-xl sm:text-2xl font-black text-slate-900">
                {actionCenter.pendingFulfillmentCount ?? 0}
              </span>
              <span className="text-[10px] font-bold text-slate-400 group-hover:text-[#e32f8c] inline-flex items-center gap-0.5">
                Fără AWB <ArrowUpRight size={11} />
              </span>
            </div>
          </Link>

          {/* Programe digitale de trimis */}
          <Link
            href="/admin/programs"
            className="bg-white border border-slate-200/90 hover:border-amber-400 rounded-2xl p-3.5 sm:p-4 shadow-xs transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] sm:text-xs font-bold text-slate-500 truncate">Programe PDF</span>
              <BookOpen size={15} className="text-amber-500 shrink-0" />
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-1">
              <span className="text-xl sm:text-2xl font-black text-slate-900">
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
              <span className="text-xl sm:text-2xl font-black text-orange-600">
                {stats?.abandonedCarts || 0}
              </span>
              <span className="text-[10px] font-bold text-slate-500 truncate">
                {formatMoney(stats?.potentialLostRevenue || 0).formatted} {formatMoney(0).symbol}
              </span>
            </div>
          </Link>

          {/* Insight trafic canal */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] sm:text-xs font-bold text-slate-500 truncate">
                {actionCenter.channelInsight ? `Canal: ${actionCenter.channelInsight.channel}` : 'Clienți Unici'}
              </span>
              {actionCenter.channelInsight?.deltaPct !== null && actionCenter.channelInsight?.deltaPct !== undefined && actionCenter.channelInsight.deltaPct < 0 ? (
                <TrendingDown size={15} className="text-rose-500 shrink-0" />
              ) : (
                <TrendingUp size={15} className="text-emerald-500 shrink-0" />
              )}
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-1">
              <span className="text-xl sm:text-2xl font-black text-slate-900">
                {actionCenter.channelInsight ? actionCenter.channelInsight.currentCount : stats?.customers ?? 0}
              </span>
              {actionCenter.channelInsight ? (
                <DeltaBadge pct={actionCenter.channelInsight.deltaPct} />
              ) : (
                <span className="text-[10px] font-bold text-slate-400">comenzi unice</span>
              )}
            </div>
          </div>
        </div>

        {/* Secondary Financial Health Strip (Zero orphan cards on mobile: 2 cols on mobile, 4 on lg) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span>Valoare Medie (AOV)</span>
              <Banknote size={14} className="text-emerald-500" />
            </div>
            <div className="mt-1.5 flex items-baseline justify-between gap-1 flex-wrap">
              <span className="text-base sm:text-lg font-black text-slate-900">{formatMoney(stats?.aov || 0).display}</span>
              <DeltaBadge pct={deltas.aovPct} />
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span>Plăți Card vs Ramburs</span>
              <CreditCard size={14} className="text-blue-500" />
            </div>
            <div className="mt-1.5 text-xs sm:text-sm font-black text-slate-900 truncate">
              {stats?.cardCount ?? 0} Card · {stats?.rambursCount ?? 0} Ramburs
            </div>
            <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
              {formatMoney(stats?.cardRevenue || 0).formatted} / {formatMoney(stats?.rambursRevenue || 0).formatted} {formatMoney(0).symbol}
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span>Anulate / Retur</span>
              <RotateCcw size={14} className="text-red-500" />
            </div>
            <div className="mt-1.5 flex items-baseline justify-between gap-1">
              <span className="text-base sm:text-lg font-black text-red-600">{stats?.returnRate || '0.0'}%</span>
              <span className="text-[11px] font-bold text-slate-500">{stats?.returnsCount || 0} buc</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span>Neridicate / Eșuate</span>
              <PackageX size={14} className="text-purple-500" />
            </div>
            <div className="mt-1.5 flex items-baseline justify-between gap-1">
              <span className="text-base sm:text-lg font-black text-purple-600">{stats?.failedOrdersCount || 0}</span>
              <span className="text-[10px] font-bold text-slate-500 truncate">{formatMoney(stats?.failedOrdersValue || 0).display}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 🛒 PÂLNIE DE CONVERSIE (Shopify Funnel - Compact Mobile List + Desktop)   */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 sm:mb-5">
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
              <Percent size={18} className="text-blue-500" />
              Pâlnie de Conversie
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
              Vizite → Coș → Checkout → Comenzi finalizate
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-100 px-3 py-1 rounded-xl">
            <span className="text-[11px] font-bold text-blue-600">Final:</span>
            <span className="text-xs sm:text-sm font-black text-blue-700">{stats?.conversionRate || '0.0'}%</span>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-3 sm:p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase">1. Sesiuni</span>
                <span className="text-[10px] font-black text-slate-700 bg-white px-1.5 py-0.5 rounded-full border border-slate-200">100%</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900">{stats?.funnel?.sessions ?? stats?.totalSessions ?? 0}</div>
              <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                {stats?.totalVisitors ?? 0} unici · {stats?.totalPageviews ?? 0} afișări
              </p>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-slate-700 h-full rounded-full w-full" />
            </div>
          </div>

          <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-3 sm:p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase">2. În Coș</span>
                <span className="text-[10px] font-black text-indigo-600 bg-white px-1.5 py-0.5 rounded-full border border-indigo-200">
                  {stats?.funnel?.cartRate || '0.0'}%
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900">{stats?.funnel?.addedToCart || 0}</div>
              <p className="text-[10px] text-slate-400 mt-0.5 truncate">Au adăugat produse</p>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, Number(stats?.funnel?.cartRate) || 0))}%` }}
              />
            </div>
          </div>

          <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-3 sm:p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase">3. Checkout</span>
                <span className="text-[10px] font-black text-orange-600 bg-white px-1.5 py-0.5 rounded-full border border-orange-200">
                  {stats?.funnel?.checkoutRate || '0.0'}%
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900">{stats?.funnel?.reachedCheckout || 0}</div>
              <p className="text-[10px] text-slate-400 mt-0.5 truncate">Au inițiat plata</p>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-orange-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, Number(stats?.funnel?.checkoutRate) || 0))}%` }}
              />
            </div>
          </div>

          <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 sm:p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 uppercase">4. Comenzi</span>
                <span className="text-[10px] font-black text-emerald-700 bg-white px-1.5 py-0.5 rounded-full border border-emerald-200">
                  {stats?.conversionRate || '0.0'}%
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-600">{stats?.orders || 0}</div>
              <p className="text-[10px] text-emerald-600 mt-0.5 truncate font-medium">Conversii finale</p>
            </div>
            <div className="w-full bg-emerald-200 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, Number(stats?.conversionRate) || 0))}%` }}
              />
            </div>
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
                      className="w-full flex items-center justify-between p-3 hover:bg-slate-100/70 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        {loc.flag && <span className="text-base shrink-0 leading-none">{loc.flag}</span>}
                        <span className="font-bold text-xs sm:text-sm text-slate-800 truncate">{loc.country}</span>
                        <span className="text-[10px] bg-slate-200/80 text-slate-600 px-1.5 py-0.5 rounded-full font-bold shrink-0">
                          {loc.orders}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs sm:text-sm text-right shrink-0">
                        <span className="font-black text-slate-900">
                          {locMoney.formatted} {locMoney.symbol}
                        </span>
                        <ChevronDown size={13} className={`text-slate-400 transition-transform ${expandedCountry === loc.country ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    {expandedCountry === loc.country && (
                      <div className="bg-white border-t border-slate-100 p-2 space-y-1">
                        {loc.cities.map((city: any) => (
                          <div key={city.name} className="flex items-center justify-between py-1.5 px-2.5 hover:bg-slate-50 rounded-lg">
                            <span className="text-xs text-slate-600 font-medium truncate pr-3 flex items-center gap-1.5">
                              <MapPin size={11} className="text-slate-400 shrink-0" /> {city.name}
                            </span>
                            <span className="text-xs font-bold text-slate-700 shrink-0">{formatMoney(city.revenue).display}</span>
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
              <h2 className="text-base sm:text-lg font-black tracking-tight">Top Produse Vândute</h2>
            </div>
            {stats?.topProducts && stats.topProducts.length > 0 && (
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
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
                        {stats.topProducts.map((entry: any, index: number) => {
                          const COLORS = ['#e32f8c', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#f43f5e', '#14b8a6', '#f97316', '#eab308'];
                          return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                        })}
                      </Pie>
                      <Tooltip
                        formatter={(value: any, name: any, props: any) => [
                          `${Number(value)} buc. (${formatMoney(props.payload.revenue).display})`,
                          'Vânzări',
                        ]}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl sm:text-2xl font-black text-slate-900 leading-none">
                      {stats.topProducts.reduce((sum: number, p: any) => sum + (p.quantity || 0), 0)}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">bucăți</span>
                  </div>
                </div>

                <div className="md:col-span-7 space-y-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                  {(() => {
                    const totalQty = stats.topProducts.reduce((sum: number, p: any) => sum + (p.quantity || 0), 0) || 1;
                    const COLORS = ['#e32f8c', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#f43f5e', '#14b8a6', '#f97316', '#eab308'];
                    return stats.topProducts.map((p: any, idx: number) => {
                      const color = COLORS[idx % COLORS.length];
                      const pct = ((p.quantity / totalQty) * 100).toFixed(1);
                      const money = formatMoney(p.revenue);
                      return (
                        <div key={p.name} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60">
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                              <span className="text-xs font-bold text-slate-800 line-clamp-1">{p.name}</span>
                            </div>
                            <span className="text-xs font-black text-slate-900 shrink-0">
                              {money.formatted} {money.symbol}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 shrink-0">
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

      {/* ========================================================================= */}
      {/* 🌐 TRAFIC, CANALE & DISPOZITIVE (Optimizat pentru mobil)                  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* SURSE TRAFIC */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm sm:text-base font-black tracking-tight flex items-center gap-2">
                <Share2 size={16} className="text-blue-500" />
                Surse de Trafic
              </h3>
              <p className="text-[11px] text-slate-400">Instagram, TikTok, Google, Direct</p>
            </div>
            <span className="text-[11px] font-black text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              {webTelemetry?.referrers?.length || 0} Canale
            </span>
          </div>

          <div className="space-y-2.5 flex-1">
            {webTelemetry?.referrers && webTelemetry.referrers.length > 0 ? (
              webTelemetry.referrers.map((ref: any) => {
                const lower = String(ref.name || '').toLowerCase();
                const barColor = lower.includes('instagram')
                  ? 'bg-gradient-to-r from-[#f09433] via-[#e6683c] to-[#bc1888]'
                  : lower.includes('tiktok')
                    ? 'bg-black'
                    : lower.includes('google')
                      ? 'bg-[#4285F4]'
                      : lower.includes('facebook')
                        ? 'bg-[#1877F2]'
                        : 'bg-slate-700';

                return (
                  <div key={ref.name} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-black text-slate-800 truncate">{ref.name}</span>
                      <span className="font-bold text-slate-600 shrink-0">
                        {ref.count} · <strong className="text-slate-900">{ref.percentage}%</strong>
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.max(4, Math.min(100, ref.percentage))}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex h-32 flex-col items-center justify-center text-center">
                <Share2 size={22} className="text-slate-300 mb-1.5" />
                <p className="text-xs font-bold text-slate-500">Se colectează sursele de trafic</p>
              </div>
            )}
          </div>
        </div>

        {/* TOP PAGINI */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm sm:text-base font-black tracking-tight flex items-center gap-2">
                <Layers size={16} className="text-[#e32f8c]" />
                Top Pagini Vizitate
              </h3>
              <p className="text-[11px] text-slate-400">Cele mai accesate rute</p>
            </div>
            <span className="text-[11px] font-black text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              {webTelemetry?.topPages?.length || 0} Pagini
            </span>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto max-h-[300px] pr-1 custom-scrollbar">
            {webTelemetry?.topPages && webTelemetry.topPages.length > 0 ? (
              webTelemetry.topPages.map((page: any) => (
                <div key={page.path} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-mono font-bold text-slate-800 truncate">{page.path}</span>
                    <span className="text-[11px] font-black text-slate-900 shrink-0">
                      {page.count} ({page.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#e32f8c] h-full rounded-full" style={{ width: `${Math.max(3, Math.min(100, page.percentage))}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <div className="flex h-32 flex-col items-center justify-center text-center">
                <Layers size={22} className="text-slate-300 mb-1.5" />
                <p className="text-xs font-bold text-slate-500">Nicio pagină înregistrată</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DISPOZITIVE, OS, ȚĂRI TRAFIC, ORAȘE TRAFIC */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Dispozitive */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Smartphone size={14} className="text-blue-500" /> Dispozitive
            </h3>
          </div>
          <div className="space-y-2.5">
            {webTelemetry?.devices?.length ? (
              webTelemetry.devices.map((dev: any) => (
                <div key={dev.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      {dev.name.toLowerCase() === 'mobile' ? <Smartphone size={12} className="text-blue-500" /> : dev.name.toLowerCase() === 'tablet' ? <Tablet size={12} className="text-violet-500" /> : <Monitor size={12} className="text-slate-600" />}
                      {dev.name}
                    </span>
                    <span className="font-black text-slate-900">{dev.percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.max(4, dev.percentage)}%` }} />
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
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Globe size={14} className="text-emerald-500" /> Sisteme OS
            </h3>
          </div>
          <div className="space-y-2.5">
            {webTelemetry?.operatingSystems?.length ? (
              webTelemetry.operatingSystems.slice(0, 4).map((os: any) => (
                <div key={os.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 truncate">{os.name}</span>
                    <span className="font-black text-slate-900">{os.percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.max(4, os.percentage)}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">Fără date</p>
            )}
          </div>
        </div>

        {/* Top Țări Trafic */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Globe size={14} className="text-blue-600" /> Top Țări Trafic
            </h3>
          </div>
          <div className="space-y-2 max-h-[180px] overflow-y-auto custom-scrollbar pr-1">
            {webTelemetry?.trafficCountries?.length ? (
              webTelemetry.trafficCountries.slice(0, 6).map((c: any) => (
                <div key={c.name} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                  <span className="font-bold text-slate-700 truncate pr-2">{c.name}</span>
                  <span className="font-black text-slate-900 shrink-0">{c.percentage}%</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">Fără date</p>
            )}
          </div>
        </div>

        {/* Top Orașe Trafic */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <MapPin size={14} className="text-emerald-600" /> Top Orașe
            </h3>
          </div>
          <div className="space-y-2 max-h-[180px] overflow-y-auto custom-scrollbar pr-1">
            {webTelemetry?.trafficCities?.length ? (
              webTelemetry.trafficCities.slice(0, 6).map((city: any) => (
                <div key={city.name} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                  <span className="font-bold text-slate-700 truncate pr-2">{city.name}</span>
                  <span className="font-black text-slate-900 shrink-0">{city.count}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">Fără date</p>
            )}
          </div>
        </div>
      </div>

      {/* UTM CAMPAIGNS */}
      {webTelemetry?.utmSources && webTelemetry.utmSources.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs">
          <h3 className="text-sm sm:text-base font-black tracking-tight flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-amber-500" />
            Campanii Marketing (UTM)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {webTelemetry.utmSources.map((utm: any) => (
              <div key={utm.name} className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 truncate pr-2">{utm.name}</span>
                <span className="text-xs font-black text-slate-900 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shrink-0">
                  {utm.count} click-uri
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
