"use client";

import { useEffect, useState, useMemo } from 'react';
import { 
  Package, 
  CreditCard, 
  ArrowUpRight, 
  ChevronDown, 
  MousePointerClick, 
  Banknote,
  Loader2,
  Calendar,
  Users,
  MapPin,
  TrendingUp,
  Globe,
  MonitorSmartphone,
  Search,
  ShoppingCart,
  RotateCcw,
  PackageX,
  Percent,
  Activity,
  ExternalLink,
  Smartphone,
  Monitor,
  Tablet,
  Zap,
  Gauge,
  Sparkles,
  Share2,
  CheckCircle2,
  Layers,
  BarChart3,
  Compass,
  RefreshCw,
  AlertCircle,
  Server,
  ShieldCheck
} from 'lucide-react';
import Link from 'next/link';

import { ModernDateRangePicker } from './components/ModernDateRangePicker';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const AVAILABLE_CURRENCIES = [
  { code: 'RON', label: 'RON (lei)', symbol: 'RON', flag: '🇷🇴' },
  { code: 'EUR', label: 'EUR (€)', symbol: '€', flag: '🇪🇺' },
  { code: 'USD', label: 'USD ($)', symbol: '$', flag: '🇺🇸' },
  { code: 'GBP', label: 'GBP (£)', symbol: '£', flag: '🇬🇧' },
  { code: 'PLN', label: 'PLN (zł)', symbol: 'zł', flag: '🇵🇱' },
];

export default function AdminDashboard() {
  const [datePreset, setDatePreset] = useState('Ultimele 30 zile');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('RON');
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  
  // Real-time auto-refresh state
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  // Initialize with last 30 days
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toLocaleDateString('en-CA');
  });
  const [endDate, setEndDate] = useState(() => new Date().toLocaleDateString('en-CA'));

  const [stats, setStats] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const presets = [
    { label: 'Astăzi', getRange: () => { const d = new Date(); return [d, d]; } },
    { label: 'Ieri', getRange: () => { const d = new Date(); d.setDate(d.getDate() - 1); return [d, d]; } },
    { label: 'Ultimele 7 zile', getRange: () => { const e = new Date(); const s = new Date(); s.setDate(s.getDate() - 7); return [s, e]; } },
    { label: 'Ultimele 30 zile', getRange: () => { const e = new Date(); const s = new Date(); s.setDate(s.getDate() - 30); return [s, e]; } },
    { label: 'Ultimele 90 zile', getRange: () => { const e = new Date(); const s = new Date(); s.setDate(s.getDate() - 90); return [s, e]; } },
    { label: 'Luna curentă', getRange: () => { const e = new Date(); const s = new Date(e.getFullYear(), e.getMonth(), 1); return [s, e]; } },
    { label: 'Toate comenzile', getRange: () => { const e = new Date(); const s = new Date('2024-01-01'); return [s, e]; } },
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
        display: `${num.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`
      };
    }
    const rawRate = stats?.exchangeRates?.[selectedCurrency] || 1;
    const isRonPerUnit = rawRate > 1.5 || (selectedCurrency === 'HUF' && rawRate < 0.1);
    const foreignPerRon = isRonPerUnit ? (1 / rawRate) : rawRate;
    const converted = num * foreignPerRon;
    const cfg = AVAILABLE_CURRENCIES.find(c => c.code === selectedCurrency);
    const symbol = cfg?.symbol || selectedCurrency;
    return {
      value: converted,
      formatted: converted.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      symbol: symbol,
      display: `${converted.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`
    };
  };

  const fetchData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    else setIsRefreshing(true);

    try {
      const statsRes = await fetch(`/api/admin/dashboard?startDate=${startDate}&endDate=${endDate}`, {
        cache: 'no-store'
      });
      const statsData = await statsRes.json();
      
      const ordersRes = await fetch('/api/admin/orders-recent?limit=5', {
        cache: 'no-store'
      });
      const ordersData = await ordersRes.json();
      
      if (statsData.success) {
        setStats(statsData.stats);
      }
      
      if (ordersData.success) {
        const mappedOrders = ordersData.orders.map((o: any) => ({
          id: `#${o.id.substring(0, 8)}`,
          customer: o.customer || o.shipping_address?.name || 'Client',
          amount: o.total,
          items: 1, 
          status: o.status === 'pending' ? 'NOU' : o.status.toUpperCase(),
          date: new Date(o.created_at).toLocaleDateString('ro-RO')
        }));
        setRecentOrders(mappedOrders);
      }
      setLastRefreshedAt(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial fetch and auto-refresh loop (every 10s)
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
      displayRevenue: formatMoney(item.revenue).value
    }));
  }, [stats?.timeseries, selectedCurrency, stats?.exchangeRates]);

  // Expand state for locations
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

  return (
    <div className="animate-in fade-in zoom-in-95 duration-700 pb-16 text-slate-900 max-w-[1400px] mx-auto space-y-6">
      
      {/* 🚀 HEADER & TOOLBAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Performanță Magazin</h1>
            
            {/* 🟢 PULSING REAL-TIME BADGE */}
            {liveUsers > 0 ? (
              <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 text-emerald-800 px-3 py-1 rounded-full shadow-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] font-black uppercase tracking-wider">
                  {liveUsers} {liveUsers === 1 ? 'vizitator live acum' : 'vizitatori live acum'}
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 text-slate-500 px-3 py-1 rounded-full shadow-xs">
                <span className="h-2 w-2 rounded-full bg-slate-300"></span>
                <span className="text-[11px] font-bold tracking-wider">
                  0 vizitatori live (ultimele 5 min)
                </span>
              </div>
            )}

            {/* Auto-Refresh Live Sync Button */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black border transition-all ${
                autoRefresh
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
              }`}
              title={autoRefresh ? "Pauză auto-sync (10s)" : "Pornește auto-sync în timp real"}
            >
              <RefreshCw size={11} className={isRefreshing ? 'animate-spin text-emerald-600' : ''} />
              <span>{autoRefresh ? 'Live Sync Activ (10s)' : 'Pauză Sync'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Date 100% reale și telemetrie Vercel Edge actualizate live • Ultima sincronizare: {lastRefreshedAt.toLocaleTimeString('ro-RO')}
          </p>
        </div>
        
        {/* RIGHT CONTROLS: CURRENCY + DATE */}
        <div className="flex items-center gap-2.5 flex-wrap">
          
          {/* 💱 Currency Switcher */}
          <div className="relative">
            <button 
              onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
              className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 shadow-xs hover:border-slate-300 hover:bg-slate-50 transition-all focus:outline-none"
              title="Schimbă moneda pentru statistici"
            >
              <span className="text-sm leading-none">
                {AVAILABLE_CURRENCIES.find(c => c.code === selectedCurrency)?.flag}
              </span>
              <span className="text-[11px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                {selectedCurrency}
              </span>
              {AVAILABLE_CURRENCIES.find(c => c.code === selectedCurrency)?.symbol !== selectedCurrency && (
                <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                  ({AVAILABLE_CURRENCIES.find(c => c.code === selectedCurrency)?.symbol})
                </span>
              )}
              <ChevronDown size={13} className={`text-slate-400 transition-transform ${isCurrencyDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isCurrencyDropdownOpen && (
              <>
                <div className="fixed inset-0 z-[199]" onClick={() => setIsCurrencyDropdownOpen(false)} />
                <div className="fixed inset-x-4 top-24 sm:absolute sm:inset-x-auto sm:top-full sm:mt-1.5 sm:right-0 sm:w-48 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 z-[200] animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Monedă Statistici
                  </div>
                  {AVAILABLE_CURRENCIES.map(c => {
                    const isSelected = selectedCurrency === c.code;
                    return (
                      <button
                        key={c.code}
                        onClick={() => {
                          setSelectedCurrency(c.code);
                          setIsCurrencyDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          isSelected 
                            ? 'bg-sky-50 text-sky-700 font-black' 
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{c.flag}</span>
                          <span>{c.code}</span>
                        </div>
                        <span className={`text-[11px] ${isSelected ? 'text-sky-600 font-extrabold' : 'text-slate-400 font-medium'}`}>
                          {c.code === 'RON' ? 'Principal' : c.symbol}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* 📅 Date Picker */}
          <div className="relative">
            <button 
              onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
              className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:border-slate-300 hover:bg-slate-50 transition-colors focus:outline-none"
            >
              <Calendar size={14} className="text-slate-500" />
              <span>{datePreset === 'Custom' ? `${startDate} - ${endDate}` : datePreset}</span>
              <ChevronDown size={13} className={`text-slate-400 transition-transform ${isDatePickerOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isDatePickerOpen && (
              <>
                <div className="fixed inset-0 z-[199]" onClick={() => setIsDatePickerOpen(false)} />
                <div className="fixed inset-x-4 top-24 sm:absolute sm:inset-x-auto sm:top-full sm:mt-2 sm:right-0 sm:w-80 bg-white border border-slate-200 rounded-xl shadow-xl overflow-y-auto max-h-[80vh] sm:max-h-none sm:overflow-hidden p-4 z-[200]">
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {presets.map(p => (
                      <button 
                        key={p.label}
                        onClick={() => handlePresetSelect(p)}
                        className="text-xs font-bold px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-600 text-left"
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

      {/* ========================================================================= */}
      {/* 📊 DATE PRINCIPALE: VÂNZĂRI, COMENZI, PÂLNIE & MARKETING */}
      {/* ========================================================================= */}
      <div className="space-y-6 animate-in fade-in duration-300">

          
          {/* 📊 KEY METRICS (Shopify Style) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4">
            {/* 1. VÂNZĂRI TOTALE */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-bl-[100px] -z-10 group-hover:scale-110 transition-transform"></div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-500 mb-1 flex items-center gap-1.5">
                  <Banknote size={15} className="text-emerald-500 shrink-0"/> 
                  <span className="truncate">Vânzări totale</span>
                </p>
                <div className="text-2xl font-black text-emerald-600 tracking-tight">
                  {formatMoney(stats?.revenue || 0).formatted} <span className="text-xs sm:text-sm font-bold text-emerald-500">{formatMoney(stats?.revenue || 0).symbol}</span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-medium truncate" title={`Card: ${formatMoney(stats?.cardRevenue || 0).display} • Ramburs: ${formatMoney(stats?.rambursRevenue || 0).display}`}>
                Card: {formatMoney(stats?.cardRevenue || 0).formatted} • Ramburs: {formatMoney(stats?.rambursRevenue || 0).formatted}
              </div>
            </div>

            {/* 2. COMENZI */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group flex flex-col justify-between">
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-500 mb-1 flex items-center gap-1.5">
                  <ShoppingCart size={15} className="text-slate-600 shrink-0"/> 
                  <span className="truncate">Comenzi</span>
                </p>
                <div className="text-2xl font-black text-slate-900 tracking-tight">{stats?.orders ?? 0}</div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-medium truncate">
                Clienți unici: <strong className="text-slate-700">{stats?.customers ?? 0}</strong>
              </div>
            </div>

            {/* 3. RATĂ DE CONVERSIE (Shopify Exact) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-bl-[100px] -z-10 group-hover:scale-110 transition-transform"></div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-500 mb-1 flex items-center gap-1.5">
                  <Percent size={15} className="text-blue-500 shrink-0"/> 
                  <span className="truncate">% Conversie</span>
                </p>
                <div className="text-2xl font-black text-blue-600 tracking-tight">{stats?.conversionRate || '0.0'}%</div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-medium truncate" title={`${stats?.orders || 0} comenzi din ${stats?.funnel?.sessions ?? stats?.totalSessions ?? 0} sesiuni`}>
                {stats?.orders || 0} comenzi / {stats?.funnel?.sessions ?? stats?.totalSessions ?? 0} sesiuni
              </div>
            </div>

            {/* 4. AOV */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-20 h-20 bg-[#e32f8c]/5 rounded-bl-[100px] -z-10 group-hover:scale-110 transition-transform"></div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-500 mb-1 flex items-center gap-1.5">
                  <TrendingUp size={15} className="text-[#e32f8c] shrink-0"/> 
                  <span className="truncate">Valoare Medie</span>
                </p>
                <div className="text-2xl font-black text-slate-900 tracking-tight">
                  {formatMoney(stats?.aov || 0).formatted} <span className="text-xs sm:text-sm font-bold text-slate-400">{formatMoney(stats?.aov || 0).symbol}</span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-medium truncate">
                Medie per comandă (AOV)
              </div>
            </div>

            {/* 5. COȘURI ABANDONATE */}
            <Link 
              href="/admin/abandoned-carts"
              className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-orange-300 transition-all relative overflow-hidden group flex flex-col justify-between cursor-pointer"
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/5 rounded-bl-[100px] -z-10 group-hover:scale-110 transition-transform"></div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-600 mb-1 flex items-center gap-1.5">
                  <ShoppingCart size={15} className="text-orange-500 shrink-0"/> 
                  <span className="font-bold text-slate-700">Coșuri Abandonate</span>
                </p>
                <div className="flex items-baseline justify-between gap-1.5 mt-1">
                  <div className="text-2xl font-black text-orange-600 tracking-tight">
                    {stats?.abandonmentRate || '0.0'}%
                  </div>
                  <span className="text-[10px] font-black text-orange-700 bg-orange-50 group-hover:bg-orange-100 group-hover:text-orange-800 px-2 py-0.5 rounded-full border border-orange-200/80 flex items-center gap-0.5 shrink-0 whitespace-nowrap transition-colors shadow-2xs">
                    <span>Vezi coșuri</span>
                    <ArrowUpRight size={11} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-medium">
                <span className="truncate">
                  Pierdere: <strong className="text-slate-800">{formatMoney(stats?.potentialLostRevenue || 0).display}</strong>
                </span>
                <span className="shrink-0 font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/60 ml-1">
                  {stats?.abandonedCarts || 0}
                </span>
              </div>
            </Link>

            {/* 6. RETURURI */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/5 rounded-bl-[100px] -z-10 group-hover:scale-110 transition-transform"></div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-500 mb-1 flex items-center gap-1.5">
                  <RotateCcw size={15} className="text-red-500 shrink-0"/> 
                  <span className="truncate">Anulate / Retur</span>
                </p>
                <div className="text-2xl font-black text-red-600 tracking-tight">{stats?.returnRate || '0.0'}%</div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-medium">
                <span className="truncate">
                  Valoare: <strong className="text-slate-800">{formatMoney(stats?.returnsValue || 0).display}</strong>
                </span>
                <span className="shrink-0 font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/60 ml-1">
                  {stats?.returnsCount || 0}
                </span>
              </div>
            </div>

            {/* 7. NERIDICATE / FAILED */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/5 rounded-bl-[100px] -z-10 group-hover:scale-110 transition-transform"></div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-500 mb-1 flex items-center gap-1.5">
                  <PackageX size={15} className="text-purple-500 shrink-0"/> 
                  <span className="truncate">Neridicate</span>
                </p>
                <div className="text-2xl font-black text-purple-600 tracking-tight">{stats?.failedOrdersCount || 0}</div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500 font-medium truncate">
                Pierdere: <strong className="text-slate-800">{formatMoney(stats?.failedOrdersValue || 0).display}</strong>
              </div>
            </div>
          </div>

          {/* 📈 MAIN CHART */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-black tracking-tight">Vânzări în timp</h2>
                <p className="text-xs text-slate-400 mt-0.5">Evoluția cifrei de afaceri în intervalul selectat</p>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                Monedă: {selectedCurrency}
              </span>
            </div>
            <div className="h-[300px] w-full">
              {displayTimeseries && displayTimeseries.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={displayTimeseries}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e32f8c" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#e32f8c" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 12, fill: '#94a3b8'}} 
                      tickFormatter={(val) => {
                        const d = new Date(val);
                        return `${d.getDate()} ${d.toLocaleString('ro', {month:'short'})}`;
                      }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 12, fill: '#94a3b8'}}
                      tickFormatter={(val) => `${val} ${formatMoney(0).symbol}`}
                      dx={-10}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                      formatter={(value: any) => [
                        `${Number(value).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${formatMoney(0).symbol}`, 
                        'Vânzări'
                      ]}
                      labelFormatter={(label) => {
                        const d = new Date(label as string);
                        return d.toLocaleDateString('ro-RO', { weekday: 'short', month: 'short', day: 'numeric' });
                      }}
                    />
                    <Area type="monotone" dataKey="displayRevenue" stroke="#e32f8c" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-slate-400 font-medium">Nu există date pentru perioada selectată.</div>
              )}
            </div>
          </div>

          {/* 🛒 PÂLNIE DE CONVERSIE (Shopify Funnel) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                  <TrendingUp size={20} className="text-blue-500" />
                  Pâlnie de Conversie Magazin
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Procesul de conversie al vizitatorilor de la prima pagină până la comanda finalizată (Model Shopify)
                </p>
              </div>
              <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 px-3.5 py-1.5 rounded-xl self-start sm:self-auto">
                <span className="text-xs font-bold text-blue-600">Conversie Finală:</span>
                <span className="text-sm font-black text-blue-700">{stats?.conversionRate || '0.0'}%</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Pasul 1 */}
              <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">1. Sesiuni Magazin</span>
                    <span className="text-xs font-black text-slate-700 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                      {(stats?.funnel?.sessions ?? stats?.totalSessions ?? 0) > 0 ? '100%' : '0%'}
                    </span>
                  </div>
                  <div className="text-2xl font-black text-slate-900">{stats?.funnel?.sessions ?? stats?.totalSessions ?? 0}</div>
                  <div className="text-[11px] text-slate-500 mt-2 space-y-1 font-medium border-t border-slate-200/60 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Vizite totale (neunice):</span>
                      <span className="font-bold text-slate-800">{stats?.totalPageviews ?? stats?.funnel?.totalViews ?? stats?.totalSessions ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Vizitatori unici:</span>
                      <span className="font-bold text-slate-800">{stats?.totalVisitors ?? stats?.funnel?.uniqueVisitors ?? stats?.totalSessions ?? 0}</span>
                    </div>
                  </div>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full mt-4 overflow-hidden">
                  <div className="bg-slate-700 h-full rounded-full w-full"></div>
                </div>
              </div>

              {/* Pasul 2 */}
              <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">2. Adăugat în Coș</span>
                    <span className="text-xs font-black text-indigo-600 bg-white px-2 py-0.5 rounded-full border border-indigo-200">{stats?.funnel?.cartRate || '0.0'}%</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900">{stats?.funnel?.addedToCart || 0}</div>
                  <p className="text-xs text-slate-400 mt-1">Sesiuni cu produse în coș</p>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full mt-4 overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, Math.max(0, Number(stats?.funnel?.cartRate) || 0))}%` }}
                  ></div>
                </div>
              </div>

              {/* Pasul 3 */}
              <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">3. Au ajuns la Checkout</span>
                    <span className="text-xs font-black text-orange-600 bg-white px-2 py-0.5 rounded-full border border-orange-200">{stats?.funnel?.checkoutRate || '0.0'}%</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900">{stats?.funnel?.reachedCheckout || 0}</div>
                  <p className="text-xs text-slate-400 mt-1">Sesiuni intrate în checkout</p>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full mt-4 overflow-hidden">
                  <div 
                    className="bg-orange-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, Math.max(0, Number(stats?.funnel?.checkoutRate) || 0))}%` }}
                  ></div>
                </div>
              </div>

              {/* Pasul 4 */}
              <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">4. Comenzi Plasate</span>
                    <span className="text-xs font-black text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200">{stats?.conversionRate || '0.0'}%</span>
                  </div>
                  <div className="text-2xl font-black text-emerald-600">{stats?.orders || 0}</div>
                  <p className="text-xs text-emerald-600 mt-1 font-medium">Conversii finale realizate</p>
                </div>
                <div className="w-full bg-emerald-200 h-2 rounded-full mt-4 overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, Math.max(0, Number(stats?.conversionRate) || 0))}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* LOCATIONS & TOP PRODUCTS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* 🗺️ LOCATION DRILLDOWN */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs lg:col-span-1 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Globe size={18} className="text-slate-500"/>
                  <h2 className="text-lg font-black tracking-tight">Locații Livrare Comenzi</h2>
                </div>
                <span className="text-[11px] font-bold text-slate-400">
                  {stats?.locations?.length || 0} {stats?.locations?.length === 1 ? 'țară' : 'țări'}
                </span>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-3 max-h-[420px]">
                {stats?.locations && stats.locations.length > 0 ? (
                  stats.locations.map((loc: any) => {
                    const locMoney = formatMoney(loc.revenue);
                    const foreignCurrs = Object.entries(loc.originalTotals || {}).filter(
                      ([cur]) => cur !== 'RON' && cur !== selectedCurrency
                    );
                    const foreignNote = foreignCurrs.length > 0 && selectedCurrency === 'RON'
                      ? `(${foreignCurrs.map(([cur, amt]) => `${Number(amt).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${AVAILABLE_CURRENCIES.find(c => c.code === cur)?.symbol || cur}`).join(', ')})`
                      : '';

                    return (
                      <div key={loc.country} className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50 hover:border-slate-200 transition-colors">
                        <button 
                          onClick={() => setExpandedCountry(expandedCountry === loc.country ? null : loc.country)}
                          className="w-full flex items-center justify-between p-3 hover:bg-slate-100/70 transition-colors text-left"
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            {loc.flag && <span className="text-base shrink-0 leading-none">{loc.flag}</span>}
                            <span className="font-bold text-sm text-slate-800 truncate">{loc.country}</span>
                            <span className="text-[10px] bg-slate-200/80 text-slate-600 px-1.5 py-0.5 rounded-full font-bold shrink-0">
                              {loc.orders} {loc.orders === 1 ? 'comandă' : 'comenzi'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-right shrink-0">
                            <div className="text-right">
                              <span className="font-black text-slate-900 block leading-tight">
                                {locMoney.formatted} {locMoney.symbol}
                              </span>
                              {foreignNote && (
                                <span className="text-[11px] text-slate-400 font-bold block leading-tight mt-0.5">
                                  {foreignNote}
                                </span>
                              )}
                            </div>
                            <ChevronDown size={14} className={`text-slate-400 transition-transform ${expandedCountry === loc.country ? 'rotate-180' : ''}`} />
                          </div>
                        </button>
                        
                        {expandedCountry === loc.country && (
                          <div className="bg-white border-t border-slate-100 p-2 space-y-1">
                            {loc.cities.map((city: any) => (
                              <div key={city.name} className="flex items-center justify-between py-1.5 px-3 hover:bg-slate-50 rounded-lg transition-colors">
                                <span className="text-xs text-slate-600 font-medium truncate pr-4 flex items-center gap-1.5">
                                  <MapPin size={12} className="text-slate-400 shrink-0"/> {city.name}
                                </span>
                                <span className="text-xs font-bold text-slate-700">{formatMoney(city.revenue).display}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="flex h-[200px] flex-col items-center justify-center text-center p-4">
                    <Globe size={28} className="text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-500">Nu există comenzi înregistrate</p>
                    <p className="text-[11px] text-slate-400 max-w-xs mt-1">Livrările pe țări și orașe vor apărea automat după plasarea comenzilor din perioada selectată.</p>
                  </div>
                )}
              </div>
            </div>

            {/* 🏆 TOP SELLING PRODUCTS & VARIANTS */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs lg:col-span-2 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Package size={18} className="text-[#e32f8c]"/>
                  <h2 className="text-lg font-black tracking-tight">Vânzări pe Produse / Variante</h2>
                </div>
                {stats?.topProducts && stats.topProducts.length > 0 && (
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                    Total: {stats.topProducts.reduce((sum: number, p: any) => sum + (p.quantity || 0), 0)} buc.
                  </span>
                )}
              </div>

              <div className="flex-1">
                {stats?.topProducts && stats.topProducts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    {/* 1. Donut Chart */}
                    <div className="md:col-span-5 h-[240px] relative flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={stats.topProducts}
                            cx="50%"
                            cy="50%"
                            innerRadius={65}
                            outerRadius={95}
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
                              'Vânzări'
                            ]}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-2xl font-black text-slate-900 leading-none">
                          {stats.topProducts.reduce((sum: number, p: any) => sum + (p.quantity || 0), 0)}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                          bucăți
                        </span>
                      </div>
                    </div>

                    {/* 2. Custom Variant Breakdown List */}
                    <div className="md:col-span-7 space-y-2.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                      {(() => {
                        const totalQty = stats.topProducts.reduce((sum: number, p: any) => sum + (p.quantity || 0), 0) || 1;
                        const COLORS = ['#e32f8c', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#f43f5e', '#14b8a6', '#f97316', '#eab308'];

                        return stats.topProducts.map((p: any, idx: number) => {
                          const color = COLORS[idx % COLORS.length];
                          const pct = ((p.quantity / totalQty) * 100).toFixed(1);
                          const money = formatMoney(p.revenue);

                          return (
                            <div key={p.name} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span 
                                    className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                                    style={{ backgroundColor: color }}
                                  />
                                  <span className="text-xs font-bold text-slate-800 line-clamp-2 leading-tight" title={p.name}>
                                    {p.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-xs font-black text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                                    {p.quantity} buc
                                  </span>
                                  <span className="text-xs font-black text-slate-700 min-w-[75px] text-right">
                                    {money.formatted} {money.symbol}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{ width: `${pct}%`, backgroundColor: color }}
                                  />
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 w-9 text-right shrink-0">
                                  {pct}%
                                </span>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="flex h-[240px] flex-col items-center justify-center text-center">
                    <Package size={32} className="text-slate-300 mb-3" />
                    <p className="text-sm font-bold text-slate-500">Nu există suficiente date.</p>
                    <p className="text-xs text-slate-400 max-w-xs mt-1">Produsele vor apărea aici după primele comenzi din perioada selectată.</p>
                  </div>
                )}
              </div>
            </div>

          </div>


        {/* ========================================================================= */}
        {/* 🌐 CANALE DE ACHIZIȚIE, TRAFIC & AUDIENȚĂ */}
        {/* ========================================================================= */}
        <div className="pt-4 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                <Share2 size={22} className="text-blue-500" />
                Canale de Achiziție & Comportament Trafic
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                De unde vin vizitatorii magazinului, ce pagini explorează și ce dispozitive folosesc
              </p>
            </div>
            <span className="text-xs font-black text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">
              Trafic 100% Real
            </span>
          </div>

          {/* ROW 1: SURSE DE TRAFIC (REFERRERS) & TOP PAGINI VIZITATE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 1. SURSE DE TRAFIC (REFERRERS - 100% REALE) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                    <Share2 size={18} className="text-blue-500" />
                    Surse de Trafic (Referrers)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Canalele reale de proveniență ale vizitatorilor</p>
                </div>
                <span className="text-xs font-black text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  {webTelemetry?.referrers?.length || 0} Canale
                </span>
              </div>

              <div className="space-y-3.5 flex-1">
                {webTelemetry?.referrers && webTelemetry.referrers.length > 0 ? (
                  webTelemetry.referrers.map((ref: any) => {
                    const getRefColor = (name: string) => {
                      const lower = name.toLowerCase();
                      if (lower.includes('instagram')) return 'bg-gradient-to-r from-[#f09433] via-[#e6683c] to-[#bc1888]';
                      if (lower.includes('tiktok')) return 'bg-black';
                      if (lower.includes('google')) return 'bg-[#4285F4]';
                      if (lower.includes('facebook')) return 'bg-[#1877F2]';
                      if (lower.includes('youtube')) return 'bg-[#FF0000]';
                      if (lower.includes('direct')) return 'bg-slate-700';
                      return 'bg-blue-600';
                    };

                    const getRefBadge = (name: string) => {
                      const lower = name.toLowerCase();
                      if (lower.includes('instagram')) return 'bg-pink-50 text-pink-700 border-pink-200';
                      if (lower.includes('tiktok')) return 'bg-slate-100 text-slate-900 border-slate-300';
                      if (lower.includes('google')) return 'bg-blue-50 text-blue-700 border-blue-200';
                      if (lower.includes('facebook')) return 'bg-sky-50 text-sky-700 border-sky-200';
                      return 'bg-slate-100 text-slate-700 border-slate-200';
                    };

                    return (
                      <div key={ref.name} className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${getRefColor(ref.name)} shrink-0`}></span>
                            <span className="text-xs font-black text-slate-800">{ref.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500">
                              {ref.count} {ref.count === 1 ? 'vizită' : 'vizite'}
                            </span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${getRefBadge(ref.name)}`}>
                              {ref.percentage}%
                            </span>
                          </div>
                        </div>

                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-700 ${getRefColor(ref.name)}`}
                            style={{ width: `${Math.max(4, Math.min(100, ref.percentage))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex h-40 flex-col items-center justify-center text-center p-4">
                    <Share2 size={24} className="text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-500">Se înregistrează sursele primilor vizitatori</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Sursele de trafic precum TikTok, Instagram sau Google vor apărea pe măsură ce sosesc vizitatori.</p>
                  </div>
                )}
              </div>
            </div>

            {/* 2. TOP PAGINI VIZITATE (100% REALE) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                    <Layers size={18} className="text-[#e32f8c]" />
                    Top Pagini & Produse Vizitate
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Paginile cele mai vizualizate de potențialii clienți</p>
                </div>
                <span className="text-xs font-black text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  {webTelemetry?.topPages?.length || 0} Pagini
                </span>
              </div>

              <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[380px] pr-1 custom-scrollbar">
                {webTelemetry?.topPages && webTelemetry.topPages.length > 0 ? (
                  webTelemetry.topPages.map((page: any) => (
                    <div key={page.path} className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-mono font-bold text-slate-800 truncate" title={page.path}>
                            {page.path}
                          </span>
                          <a 
                            href={page.path} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-slate-400 hover:text-slate-700 transition-colors shrink-0"
                            title="Deschide pagina pe site"
                          >
                            <ExternalLink size={12} />
                          </a>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-black text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                            {page.count} {page.count === 1 ? 'afișare' : 'afișări'}
                          </span>
                          <span className="text-xs font-bold text-slate-500 w-10 text-right">
                            {page.percentage}%
                          </span>
                        </div>
                      </div>

                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-[#e32f8c] h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(3, Math.min(100, page.percentage))}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex h-40 flex-col items-center justify-center text-center p-4">
                    <Layers size={24} className="text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-500">Se înregistrează paginile vizitate</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Fiecare navigare pe categorii sau produse se va reflecta instant.</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* ROW 2: DISPOZITIVE & SISTEME DE OPERARE (2 COLS) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 1. DISPOZITIVE */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Smartphone size={17} className="text-blue-500" />
                    <h3 className="text-sm font-black tracking-tight">Dispozitive</h3>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Device Type</span>
                </div>

                <div className="space-y-3">
                  {webTelemetry?.devices && webTelemetry.devices.length > 0 ? (
                    webTelemetry.devices.map((dev: any) => {
                      const getDevIcon = (name: string) => {
                        if (name.toLowerCase() === 'mobile') return <Smartphone size={14} className="text-blue-500" />;
                        if (name.toLowerCase() === 'tablet') return <Tablet size={14} className="text-violet-500" />;
                        return <Monitor size={14} className="text-slate-600" />;
                      };

                      return (
                        <div key={dev.name} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-700 flex items-center gap-1.5">
                              {getDevIcon(dev.name)}
                              {dev.name}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400 text-[11px] font-medium">{dev.count}</span>
                              <span className="font-black text-slate-900">{dev.percentage}%</span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-blue-500 h-full rounded-full transition-all duration-500" 
                              style={{ width: `${Math.max(4, dev.percentage)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-6">Nu există încă sesiuni înregistrate.</p>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-slate-400 pt-3 border-t border-slate-100 mt-4">
                Distribuția vizitelor pe mobil, tabletă și calculator.
              </p>
            </div>

            {/* 2. SISTEME DE OPERARE & BROWSERE */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Globe size={17} className="text-emerald-500" />
                  <h3 className="text-sm font-black tracking-tight">Sisteme de Operare</h3>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">OS</span>
              </div>

              <div className="space-y-3">
                {webTelemetry?.operatingSystems && webTelemetry.operatingSystems.length > 0 ? (
                  webTelemetry.operatingSystems.slice(0, 4).map((os: any) => (
                    <div key={os.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">{os.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-[11px] font-medium">{os.count}</span>
                          <span className="font-black text-slate-900">{os.percentage}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${Math.max(4, os.percentage)}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 text-center py-6">Nu există încă date de sistem.</p>
                )}
              </div>
            </div>

          </div>

          {/* ROW 3: LOCALIZARE TRAFIC — TOP ȚĂRI & TOP ORAȘE (2 COLS) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 1. TOP ȚĂRI TRAFIC */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Globe size={18} className="text-blue-500" />
                  <h3 className="text-base font-black tracking-tight">Top Țări Trafic</h3>
                </div>
                <span className="text-xs font-black text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  {webTelemetry?.trafficCountries?.length || 0} Țări
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Țările de proveniență ale vizitatorilor din magazin
              </p>

              <div className="space-y-3 flex-1 overflow-y-auto max-h-[260px] pr-1 custom-scrollbar">
                {webTelemetry?.trafficCountries && webTelemetry.trafficCountries.length > 0 ? (
                  webTelemetry.trafficCountries.map((c: any) => (
                    <div key={c.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">{c.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-[11px] font-medium">{c.count} {c.count === 1 ? 'sesiune' : 'sesiuni'}</span>
                          <span className="font-black text-slate-900">{c.percentage}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${Math.max(4, c.percentage)}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex h-32 flex-col items-center justify-center text-center p-4">
                    <Globe size={24} className="text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-500">Se colectează țările de trafic</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Vor apărea automat la următoarele accesări ale clienților.</p>
                  </div>
                )}
              </div>
            </div>

            {/* 2. TOP ORAȘE TRAFIC */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MapPin size={18} className="text-emerald-500" />
                  <h3 className="text-base font-black tracking-tight">Top Orașe Trafic</h3>
                </div>
                <span className="text-xs font-black text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  {webTelemetry?.trafficCities?.length || 0} Orașe
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Orașele cu cea mai mare activitate în magazin
              </p>

              <div className="space-y-2 flex-1 overflow-y-auto max-h-[260px] pr-1 custom-scrollbar">
                {webTelemetry?.trafficCities && webTelemetry.trafficCities.length > 0 ? (
                  webTelemetry.trafficCities.map((city: any) => (
                    <div key={city.name} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/60">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-2 truncate">
                        <MapPin size={13} className="text-emerald-500 shrink-0" />
                        {city.name}
                      </span>
                      <span className="text-xs font-black text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded-md shrink-0">
                        {city.count} {city.count === 1 ? 'vizită' : 'vizite'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="flex h-32 flex-col items-center justify-center text-center p-4">
                    <MapPin size={24} className="text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-500">Se colectează orașele de trafic</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Vor apărea automat la următoarele accesări ale magazinului.</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* ROW 3: MARKETING CAMPAIGNS (UTM ATTRIBUTION) */}
          {webTelemetry?.utmSources && webTelemetry.utmSources.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                    <Sparkles size={18} className="text-amber-500" />
                    Campanii Marketing Detectate (UTM)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Click-uri aduse de reclame plătite sau link-uri de influenceri</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {webTelemetry.utmSources.map((utm: any) => (
                  <div key={utm.name} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Sursă UTM</span>
                      <span className="text-xs font-black text-slate-800">{utm.name}</span>
                    </div>
                    <span className="text-xs font-black text-slate-900 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                      {utm.count} click-uri
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}


        </div>

      </div>

    </div>
  );
}
