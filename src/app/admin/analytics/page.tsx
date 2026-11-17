"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  CreditCard,
  Eye,
  Gift,
  Globe,
  Layers,
  Loader2,
  Mail,
  MapPin,
  Monitor,
  Package,
  RefreshCw,
  Share2,
  Smartphone,
  Tablet,
  Tag,
  Ticket,
  TrendingUp,
  Truck,
} from 'lucide-react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AnalyticsRangeKey, Ga4AnalyticsReport } from '@/lib/ga4-analytics';

interface AnalyticsApiResponse {
  success: boolean;
  range: AnalyticsRangeKey;
  period: {
    startDate: string;
    endDate: string;
    prevStartDate: string;
    prevEndDate: string;
  };
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

type ChartMetric = 'sessions' | 'users' | 'pageviews';

function formatRon(val: number): string {
  return `${(Number(val) || 0).toLocaleString('ro-RO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} RON`;
}

function formatDuration(totalSec: number): string {
  const sec = Math.max(0, Math.round(totalSec || 0));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${String(s).padStart(2, '0')}s`;
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

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState<AnalyticsRangeKey>('30d');
  const [chartMetric, setChartMetric] = useState<ChartMetric>('sessions');
  const [data, setData] = useState<AnalyticsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadAnalytics = useCallback(
    async (selectedRange: AnalyticsRangeKey, isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setErrorMsg(null);

      try {
        const res = await fetch(`/api/admin/analytics?range=${selectedRange}`, {
          cache: 'no-store',
        });
        const json: AnalyticsApiResponse = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Nu s-au putut încărca datele de analytics.');
        }
        setData(json);
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
    loadAnalytics(range);
  }, [range, loadAnalytics]);

  const chartSeries = useMemo(() => {
    const raw = data?.ga4?.timeseries || [];
    return raw.map((pt) => ({
      label: pt.label,
      current:
        chartMetric === 'sessions'
          ? pt.sessions
          : chartMetric === 'users'
            ? pt.users
            : pt.pageviews,
      previous:
        chartMetric === 'sessions'
          ? pt.prevSessions
          : chartMetric === 'users'
            ? pt.prevUsers
            : pt.prevPageviews,
    }));
  }, [data?.ga4?.timeseries, chartMetric]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[55vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#e32f8c]" />
        <p className="text-xs font-bold text-slate-500">Se încarcă telemetria GA4 și statisticile marketing...</p>
      </div>
    );
  }

  const ga4 = data?.ga4;
  const ga4Ready = Boolean(ga4?.configured && !ga4?.error);
  const overview = ga4?.overview;
  const realtime = ga4?.realtime;
  const mkt = data?.supabaseMarketing;
  const funnel = data?.funnel;

  const newUsersPct =
    overview && overview.totalUsers > 0
      ? Math.round((overview.newUsers / overview.totalUsers) * 100)
      : 0;

  return (
    <div className="animate-in fade-in duration-500 pb-16 text-slate-900 max-w-[1400px] mx-auto space-y-5 sm:space-y-6">
      {/* ========================================================================= */}
      {/* TOP HEADER & RANGE CONTROLS                                               */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Activity size={20} className="text-[#e32f8c] shrink-0" />
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900">
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
          <p className="text-xs text-slate-500 mt-1">
            {data?.period
              ? `Interval: ${data.period.startDate} – ${data.period.endDate} (comparat cu ${data.period.prevStartDate} – ${data.period.prevEndDate})`
              : 'Google Analytics 4 Data API + Supabase Marketing'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto max-w-full">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setRange(opt.key)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  range === opt.key
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => loadAnalytics(range, true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer disabled:opacity-60"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin text-[#e32f8c]' : ''} />
            <span className="hidden sm:inline">Actualizează</span>
          </button>

          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors"
          >
            <ArrowLeft size={13} />
            <span>Dashboard</span>
          </Link>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-xs font-bold text-red-700 flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* GA4 SETUP / ERROR BANNER (NO FAKE NUMBERS WHEN UNCONFIGURED)              */}
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
      {/* GA4 HERO: LIVE REALTIME + TRAFIC & CALITATE                               */}
      {/* ========================================================================= */}
      {ga4Ready && overview && (
        <div className="bg-[#09090d] text-white rounded-3xl p-4 sm:p-6 shadow-2xl border border-white/10 relative overflow-hidden space-y-5">
          <div className="pointer-events-none absolute -top-24 right-0 w-72 h-72 rounded-full bg-[#e32f8c]/15 blur-[80px]" />

          {/* Realtime Strip */}
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-3 flex-wrap">
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
                <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                  Live acum (30m): {realtime?.activeUsers ?? 0} utilizatori
                </span>
              </div>

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
              <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-zinc-300">
                <span className="text-zinc-500 font-bold">Pagini active:</span>
                {realtime.topPages.slice(0, 3).map((p) => (
                  <span
                    key={p.title}
                    className="bg-white/[0.06] border border-white/10 px-2 py-0.5 rounded-lg truncate max-w-[180px]"
                    title={p.title}
                  >
                    {p.title} ({p.activeUsers})
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 6 Traffic & Quality KPI Tiles */}
          <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => setChartMetric('sessions')}
              className={`text-left rounded-2xl p-3.5 border transition-all cursor-pointer ${
                chartMetric === 'sessions'
                  ? 'bg-white/[0.11] border-[#e32f8c]/60'
                  : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.07]'
              }`}
            >
              <div className="text-[11px] font-bold text-zinc-400">Sesiuni</div>
              <div className="mt-1 flex items-baseline justify-between gap-1 flex-wrap">
                <span className="text-lg sm:text-xl font-black tabular-nums">{overview.sessions.toLocaleString('ro-RO')}</span>
                <DeltaPill pct={overview.deltas.sessionsPct} dark />
              </div>
            </button>

            <button
              type="button"
              onClick={() => setChartMetric('users')}
              className={`text-left rounded-2xl p-3.5 border transition-all cursor-pointer ${
                chartMetric === 'users'
                  ? 'bg-white/[0.11] border-sky-400/60'
                  : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.07]'
              }`}
            >
              <div className="text-[11px] font-bold text-zinc-400">Utilizatori Unici</div>
              <div className="mt-1 flex items-baseline justify-between gap-1 flex-wrap">
                <span className="text-lg sm:text-xl font-black tabular-nums">{overview.totalUsers.toLocaleString('ro-RO')}</span>
                <DeltaPill pct={overview.deltas.usersPct} dark />
              </div>
            </button>

            <button
              type="button"
              onClick={() => setChartMetric('pageviews')}
              className={`text-left rounded-2xl p-3.5 border transition-all cursor-pointer ${
                chartMetric === 'pageviews'
                  ? 'bg-white/[0.11] border-emerald-400/60'
                  : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.07]'
              }`}
            >
              <div className="text-[11px] font-bold text-zinc-400">Pageviews</div>
              <div className="mt-1 flex items-baseline justify-between gap-1 flex-wrap">
                <span className="text-lg sm:text-xl font-black tabular-nums">{overview.pageviews.toLocaleString('ro-RO')}</span>
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
          </div>

          {/* Comparative Chart */}
          <div className="relative z-10 h-[220px] sm:h-[260px] w-full">
            {chartSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartSeries} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ga4AreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={
                          chartMetric === 'sessions' ? '#e32f8c' : chartMetric === 'users' ? '#38bdf8' : '#10b981'
                        }
                        stopOpacity={0.35}
                      />
                      <stop offset="95%" stopColor="#e32f8c" stopOpacity={0} />
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
                  <Line
                    type="monotone"
                    dataKey="previous"
                    stroke="#71717a"
                    strokeWidth={1.75}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="current"
                    stroke={
                      chartMetric === 'sessions' ? '#e32f8c' : chartMetric === 'users' ? '#38bdf8' : '#10b981'
                    }
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
      {/* GA4 DETAILS: SOURCES, UTM, PAGES, VIEWED VS SOLD, AUDIENCE                */}
      {/* ========================================================================= */}
      {ga4Ready && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
            {/* Surse de Trafic */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                    <Share2 size={17} className="text-blue-600" />
                    Surse de Trafic (GA4)
                  </h2>
                  <p className="text-[11px] text-slate-400">sessionSourceMedium · engagement rate</p>
                </div>
                <span className="text-[11px] font-black text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  {ga4?.sources.length || 0} surse
                </span>
              </div>

              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
                {ga4?.sources && ga4.sources.length > 0 ? (
                  ga4.sources.map((src) => (
                    <div key={`${src.sourceMedium}-${src.channelGroup}`} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70">
                      <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
                        <div className="min-w-0">
                          <span className="font-black text-slate-800 truncate block">{src.sourceMedium}</span>
                          <span className="text-[10px] font-semibold text-slate-400">
                            {src.channelGroup} · Engagement {src.engagementRatePct}%
                          </span>
                        </div>
                        <span className="font-black text-slate-900 shrink-0 tabular-nums">
                          {src.sessions.toLocaleString('ro-RO')} ({src.sharePct}%)
                        </span>
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

              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
                {ga4?.campaigns && ga4.campaigns.length > 0 ? (
                  ga4.campaigns.map((camp) => (
                    <div
                      key={`${camp.campaign}-${camp.sourceMedium}`}
                      className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-black text-slate-900 truncate">{camp.campaign}</div>
                        <div className="text-[10px] font-semibold text-slate-500 truncate">
                          {camp.sourceMedium} · Engagement {camp.engagementRatePct}%
                        </div>
                      </div>
                      <div className="text-right shrink-0">
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
            </div>
          </div>

          {/* Top Pagini */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                  <Layers size={17} className="text-[#e32f8c]" />
                  Top Pagini Vizitate (GA4)
                </h2>
                <p className="text-[11px] text-slate-400">Afișări, utilizatori unici, timp mediu și bounce rate</p>
              </div>
              <span className="text-[11px] font-black text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                {ga4?.topPages.length || 0} pagini
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400">
                    <th className="py-2.5 pr-3 font-black">Rută Pagină</th>
                    <th className="py-2.5 px-2 font-black text-right">Afișări</th>
                    <th className="py-2.5 px-2 font-black text-right">Unici</th>
                    <th className="py-2.5 px-2 font-black text-right hidden sm:table-cell">Timp Mediu</th>
                    <th className="py-2.5 pl-2 font-black text-right hidden sm:table-cell">Bounce</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ga4?.topPages.slice(0, 12).map((pg) => (
                    <tr key={pg.path} className="hover:bg-slate-50/70">
                      <td className="py-2.5 pr-3 font-mono font-bold text-slate-800 max-w-[240px] sm:max-w-[420px] truncate">
                        {pg.path}
                      </td>
                      <td className="py-2.5 px-2 text-right font-black text-slate-900 tabular-nums">
                        {pg.views.toLocaleString('ro-RO')}
                      </td>
                      <td className="py-2.5 px-2 text-right font-semibold text-slate-600 tabular-nums">
                        {pg.users.toLocaleString('ro-RO')}
                      </td>
                      <td className="py-2.5 px-2 text-right font-semibold text-slate-600 hidden sm:table-cell tabular-nums">
                        {formatDuration(pg.avgDurationSec)}
                      </td>
                      <td className="py-2.5 pl-2 text-right font-semibold text-slate-600 hidden sm:table-cell tabular-nums">
                        {pg.bounceRatePct}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audiență & Tehnic: Device / OS / Browser / Countries / Cities */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
                        <span className="font-black text-slate-900 tabular-nums">{d.percentage}%</span>
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

            {/* Țări */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-3">
                <Globe size={14} className="text-sky-600" /> Top Țări
              </h3>
              <div className="space-y-2 max-h-[190px] overflow-y-auto custom-scrollbar pr-1">
                {ga4?.countries.length ? (
                  ga4.countries.slice(0, 7).map((c) => (
                    <div key={c.name} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                      <span className="font-bold text-slate-700 truncate pr-2">{c.name}</span>
                      <span className="font-black text-slate-900 shrink-0 tabular-nums">{c.percentage}%</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-4 text-center">Fără date</p>
                )}
              </div>
            </div>

            {/* Orașe */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-3">
                <MapPin size={14} className="text-[#e32f8c]" /> Top Orașe
              </h3>
              <div className="space-y-2 max-h-[190px] overflow-y-auto custom-scrollbar pr-1">
                {ga4?.cities.length ? (
                  ga4.cities.slice(0, 7).map((ci) => (
                    <div key={ci.name} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                      <span className="font-bold text-slate-700 truncate pr-2">{ci.name}</span>
                      <span className="font-black text-slate-900 shrink-0 tabular-nums">{ci.sessions}</span>
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

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400">
                  <th className="py-2.5 pr-3 font-black">Produs</th>
                  <th className="py-2.5 px-2 font-black text-right">Vizualizări (GA4)</th>
                  <th className="py-2.5 px-2 font-black text-right">Vândute (Supabase)</th>
                  <th className="py-2.5 px-2 font-black text-right">Venit</th>
                  <th className="py-2.5 pl-2 font-black text-right">Conversie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.productComparison.map((row) => {
                  const lowConvAlert = row.views >= 20 && row.viewToBuyPct !== null && row.viewToBuyPct < 1.5;
                  return (
                    <tr key={row.name} className="hover:bg-slate-50/70">
                      <td className="py-2.5 pr-3 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <Package size={13} className="text-slate-400 shrink-0" />
                          <span className="line-clamp-1">{row.name}</span>
                          {lowConvAlert && (
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                              Conversie slabă
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-right font-bold text-slate-700 tabular-nums">
                        {ga4Ready ? row.views.toLocaleString('ro-RO') : '—'}
                      </td>
                      <td className="py-2.5 px-2 text-right font-black text-slate-900 tabular-nums">
                        {row.soldQty} buc
                      </td>
                      <td className="py-2.5 px-2 text-right font-bold text-slate-800 tabular-nums">
                        {formatRon(row.revenueRon)}
                      </td>
                      <td className="py-2.5 pl-2 text-right font-black tabular-nums">
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
            <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              {mkt.ordersInPeriod} comenzi · {formatRon(mkt.revenueInPeriodRon)}
            </span>
          </div>

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
                    {formatRon(mkt.scratchCard.revenueRon)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">
                    Discount acordat
                  </div>
                  <div className="text-sm font-black text-[#ff6eb6] tabular-nums mt-0.5">
                    -{formatRon(mkt.scratchCard.discountRon)}
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
                    {mkt.coupons.ordersWithCouponCount} comenzi cu cupon ({mkt.coupons.couponSharePct}% din comenzi) · Discount total acordat: {formatRon(mkt.coupons.totalDiscountGrantedRon)}
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
                      {formatRon(cat.revenueRon)}
                    </div>
                    <div className="text-[10px] font-semibold text-rose-600 tabular-nums">
                      -{formatRon(cat.discountRon)}
                    </div>
                  </div>
                ))}
              </div>

              {mkt.coupons.topCoupons.length > 0 && (
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
                      {mkt.coupons.topCoupons.slice(0, 6).map((c) => (
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
                            {formatRon(c.revenueRon)}
                          </td>
                          <td className="py-2 pl-2 text-right font-bold text-rose-600 tabular-nums">
                            -{formatRon(c.discountRon)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                <Link href="/admin/leads" className="text-[11px] font-bold text-blue-600 hover:underline shrink-0">
                  Vezi Leads
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

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-500">Mesaje Contact (formular):</span>
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
                  <div className="mt-1 flex items-baseline justify-between gap-2">
                    <span className="text-xl font-black text-slate-900 tabular-nums">
                      {mkt.payments.card.count} comenzi
                    </span>
                    <span className="text-xs font-bold text-slate-700 tabular-nums">
                      {formatRon(mkt.payments.card.revenueRon)}
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
                  <div className="mt-1 flex items-baseline justify-between gap-2">
                    <span className="text-xl font-black text-slate-900 tabular-nums">
                      {mkt.payments.ramburs.count} comenzi
                    </span>
                    <span className="text-xs font-bold text-slate-700 tabular-nums">
                      {formatRon(mkt.payments.ramburs.revenueRon)}
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
                  Sameday Easybox vs Curier domiciliu vs Internațional
                </p>
              </div>

              <div className="space-y-2.5">
                {mkt.shipping.map((s) => {
                  const barCls =
                    s.key === 'easybox'
                      ? 'bg-[#e32f8c]'
                      : s.key === 'courier_ro'
                        ? 'bg-blue-600'
                        : s.key === 'international'
                          ? 'bg-violet-600'
                          : 'bg-amber-500';
                  return (
                    <div key={s.key} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70">
                      <div className="flex items-center justify-between gap-2 text-xs mb-1">
                        <span className="font-bold text-slate-800 truncate">{s.label}</span>
                        <span className="font-black text-slate-900 shrink-0 tabular-nums">
                          {s.count} ({s.percentage}%)
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold mb-1.5 tabular-nums">
                        <span>Venit: {formatRon(s.revenueRon)}</span>
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
