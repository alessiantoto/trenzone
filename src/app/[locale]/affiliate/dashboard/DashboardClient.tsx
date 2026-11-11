'use client';

import { getOptimizedImageUrl } from '@/lib/utils/imageProxy';
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { 
  LogOut, 
  Copy, 
  Check, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Users, 
  Award, 
  Calendar, 
  ChevronDown, 
  ChevronRight, 
  ChevronLeft, 
  Search, 
  CreditCard, 
  PackageCheck, 
  ExternalLink, 
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  Pencil,
  Trash2
} from 'lucide-react';
import { affiliateLogoutAction } from '@/app/actions/affiliate-auth';
import { 
  AffiliateDashboardResponse, 
  AffiliateOrderHistory, 
  updateAffiliatePaymentDetailsAction,
  deleteAffiliatePaymentDetailsAction
} from '@/app/actions/affiliate-dashboard';

interface DashboardClientProps {
  data: AffiliateDashboardResponse;
  locale: string;
}

type PeriodFilter = 'all' | 'today' | '7d' | '30d' | 'this_month' | 'last_month';

export default function DashboardClient({ data, locale }: DashboardClientProps) {
  const isRo = locale === 'ro';

  // State
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [period, setPeriod] = useState<PeriodFilter>('all');
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

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

  // Referral URL
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.trenzone.fit';
  const referralLink = `${baseUrl}/${locale}?ref=${encodeURIComponent(data.code)}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(data.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2200);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const handleLogout = async () => {
    await affiliateLogoutAction();
    window.location.href = `/${locale}/affiliate/login`;
  };

  // Period labels
  const periodOptions: { id: PeriodFilter; labelRo: string; labelEn: string }[] = [
    { id: 'all', labelRo: 'Toate perioadele', labelEn: 'All Time' },
    { id: 'today', labelRo: 'Astăzi', labelEn: 'Today' },
    { id: '7d', labelRo: 'Ultimele 7 zile', labelEn: 'Last 7 days' },
    { id: '30d', labelRo: 'Ultimele 30 zile', labelEn: 'Last 30 days' },
    { id: 'this_month', labelRo: 'Luna aceasta', labelEn: 'This month' },
    { id: 'last_month', labelRo: 'Luna trecută', labelEn: 'Last month' },
  ];

  const currentPeriodLabel = periodOptions.find(p => p.id === period)?.[isRo ? 'labelRo' : 'labelEn'] || '';

  // Filter orders by period & search query
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    return data.orders.filter(order => {
      const orderDate = new Date(order.createdAt);

      // Period filter
      if (period === 'today' && orderDate < startOfToday) return false;
      if (period === '7d' && orderDate < sevenDaysAgo) return false;
      if (period === '30d' && orderDate < thirtyDaysAgo) return false;
      if (period === 'this_month' && orderDate < startOfThisMonth) return false;
      if (period === 'last_month' && (orderDate < startOfLastMonth || orderDate > endOfLastMonth)) return false;

      // Search query (order number, product name, variant)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchOrder = order.orderNumber.toLowerCase().includes(q);
        const matchItem = order.items.some(it => it.name.toLowerCase().includes(q) || (it.variant && it.variant.toLowerCase().includes(q)));
        const matchCustomer = order.customerName ? order.customerName.toLowerCase().includes(q) : false;
        if (!matchOrder && !matchItem && !matchCustomer) return false;
      }

      return true;
    });
  }, [data.orders, period, searchQuery]);

  // Aggregated dynamic stats for the active filter
  const activeStats = useMemo(() => {
    const isOrderCountable = (o: any) => {
      if (typeof o.isCountable === 'boolean') return o.isCountable;
      const st = String(o.status || '').toLowerCase().trim();
      return !['cancelled', 'anulat', 'anulata', 'returned', 'returnat', 'returnata', 'refunded', 'rambursat', 'failed', 'refused', 'neridicat'].includes(st);
    };

    const countableOrders = filteredOrders.filter(isOrderCountable);
    const totalSales = countableOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalCommissions = countableOrders.reduce((sum, o) => sum + (o.commissionAmount || 0), 0);
    const usagesCount = countableOrders.length;
    const aov = usagesCount > 0 ? totalSales / usagesCount : 0;

    return {
      totalSales: Math.round(totalSales * 100) / 100,
      totalCommissions: Math.round(totalCommissions * 100) / 100,
      usagesCount,
      aov: Math.round(aov * 100) / 100
    };
  }, [filteredOrders]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(start, start + itemsPerPage);
  }, [filteredOrders, currentPage, itemsPerPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Smooth scroll to orders section
    const el = document.getElementById('affiliate-orders-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSaveIban = async (e: React.FormEvent) => {
    e.preventDefault();
    setIbanSaving(true);
    setIbanError('');
    setIbanSuccess(false);

    const cleanIban = ibanInput.trim().replace(/\s+/g, '').toUpperCase();

    const res = await updateAffiliatePaymentDetailsAction({
      iban: cleanIban,
      bankName: bankNameInput,
      accountHolder: holderInput
    });

    setIbanSaving(false);
    if (res.success) {
      setPaymentDetails({
        iban: cleanIban,
        bankName: bankNameInput.trim(),
        accountHolder: holderInput.trim()
      });
      setIbanSuccess(true);
      setTimeout(() => {
        setIsIbanModalOpen(false);
        setIbanSuccess(false);
      }, 1000);
    } else {
      setIbanError(res.error || (isRo ? 'A apărut o eroare.' : 'An error occurred.'));
    }
  };

  const handleDeleteIban = async () => {
    setIbanDeleting(true);
    setIbanError('');
    const res = await deleteAffiliatePaymentDetailsAction();
    setIbanDeleting(false);

    if (res.success) {
      setPaymentDetails({});
      setIbanInput('');
      setBankNameInput('');
      setHolderInput(data.name);
      setShowDeleteConfirm(false);
      setIsIbanModalOpen(false);
    } else {
      setIbanError(res.error || (isRo ? 'Eroare la ștergerea contului.' : 'Failed to delete account.'));
    }
  };

  const toggleExpandOrder = (id: string) => {
    setExpandedOrderId(prev => (prev === id ? null : id));
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-[#e32f8c] selection:text-white pb-24 font-sans relative overflow-hidden pt-24 sm:pt-28">
      
      {/* GREEK GOD PATTERN BACKGROUND (matching storefront) */}
      <div
        className="absolute inset-0 pointer-events-none z-0 mix-blend-multiply opacity-50"
        style={{
          backgroundImage: "url('/images/ui/greek-pattern.jpg')",
          backgroundSize: '400px',
          backgroundRepeat: 'repeat',
        }}
      />

      {/* AMBIENT GLOWS */}
      <div className="absolute top-24 right-1/4 w-[600px] h-[350px] bg-[#e32f8c]/10 blur-[150px] rounded-full pointer-events-none z-0" />
      <div className="absolute bottom-10 left-1/4 w-[500px] h-[350px] bg-blue-500/10 blur-[150px] rounded-full pointer-events-none z-0" />

      {/* MAIN CONTAINER */}
      <main className="container mx-auto px-4 sm:px-6 max-w-6xl space-y-8 relative z-10">

        {/* IN-PAGE HEADER BAR */}
        <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl px-5 sm:px-6 py-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="bg-[#e32f8c]/15 text-[#008ba3] border border-[#e32f8c]/30 text-xs sm:text-sm font-black uppercase tracking-wider px-3.5 sm:px-4 py-1.5 rounded-full whitespace-nowrap shadow-sm">
              {isRo ? 'Panou Afiliat & Vânzări' : 'Affiliate Sales Dashboard'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 px-3.5 py-2 rounded-xl text-xs font-bold border border-red-200 transition-all active:scale-95"
              title={isRo ? 'Deconectare' : 'Logout'}
            >
              <span className="hidden sm:inline">{isRo ? 'Ieșire' : 'Logout'}</span>
              <LogOut size={14} />
            </button>
          </div>
        </div>

        {/* HERO CARD: AFFILIATE IDENTITY & QUICK SHARE */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl p-6 sm:p-8 md:p-10 overflow-hidden border border-slate-200/90 bg-white/95 backdrop-blur-md shadow-md"
        >
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <div className="flex items-center gap-2 text-[#008ba3] text-xs font-black uppercase tracking-widest mb-2">
                <Sparkles size={14} className="text-[#e32f8c]" />
                <span>{isRo ? 'Partener Oficial TrenZone' : 'Official TrenZone Partner'}</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-slate-900 mb-2 font-heading">
                {data.name}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 max-w-xl leading-relaxed">
                {isRo 
                  ? 'Fiecare comandă plasată cu codul tău îți aduce un comision garantat. Distribuie codul sau link-ul tău urmăritorilor tăi.'
                  : 'Every order placed with your code earns you guaranteed commission. Share your code or referral link with your community.'}
              </p>
            </div>

            {/* ACTION PILLS: CODE + LINK */}
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              {/* CODE PILL */}
              <div 
                onClick={handleCopyCode}
                className="group relative bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-[#e32f8c]/60 p-3.5 rounded-2xl flex items-center justify-between gap-4 cursor-pointer transition-all shadow-2xs active:scale-98"
              >
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                    {isRo ? 'Codul tău de reducere' : 'Your discount code'}
                  </p>
                  <p className="text-xl sm:text-2xl font-black font-mono tracking-wider text-slate-900">
                    {data.code}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#e32f8c]/15 flex items-center justify-center text-[#008ba3] group-hover:scale-110 transition-transform">
                  {copiedCode ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                </div>
                {copiedCode && (
                  <span className="absolute -top-2.5 right-3 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-md">
                    {isRo ? 'Copiat!' : 'Copied!'}
                  </span>
                )}
              </div>

              {/* LINK PILL */}
              <div 
                onClick={handleCopyLink}
                className="group relative bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 p-3.5 rounded-2xl flex items-center justify-between gap-4 cursor-pointer transition-all shadow-2xs active:scale-98"
              >
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                    {isRo ? 'Link de recomandare' : 'Referral Link'}
                  </p>
                  <p className="text-xs sm:text-sm font-bold font-mono text-slate-700 truncate max-w-[160px] sm:max-w-[200px]">
                    trenzone.fit/?ref={data.code}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-200/80 flex items-center justify-center text-slate-600 group-hover:scale-110 transition-transform">
                  {copiedLink ? <Check size={18} className="text-emerald-500" /> : <ExternalLink size={18} />}
                </div>
                {copiedLink && (
                  <span className="absolute -top-2.5 right-3 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-md">
                    {isRo ? 'Link Copiat!' : 'Link Copied!'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* PRIMARY FINANCIAL OVERVIEW: 4 KEY KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          
          {/* CARD 1: DE INCASAT IN TOTAL */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="relative rounded-3xl p-6 border border-[#e32f8c]/40 bg-gradient-to-br from-[#e32f8c]/10 via-white to-white shadow-sm overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black uppercase tracking-widest text-[#008ba3]">
                {isRo ? 'De Încasat în Total' : 'Pending Payout'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#e32f8c]/15 flex items-center justify-center text-[#008ba3]">
                <Clock size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
                {data.pendingPayout.toLocaleString(isRo ? 'ro-RO' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-sm font-black text-[#008ba3]">RON</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">{isRo ? 'Încasat deja:' : 'Already paid:'}</span>
              <span className="font-bold text-slate-700">
                {data.paidPayout.toLocaleString(isRo ? 'ro-RO' : 'en-US', { minimumFractionDigits: 2 })} RON
              </span>
            </div>
          </motion.div>

          {/* CARD 2: TOTAL VANZARI GENERATE */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-3xl p-6 border border-slate-200/90 bg-white/95 backdrop-blur-sm shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                {isRo ? 'Vânzări Generate' : 'Sales Volume'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
                {(period === 'all' ? data.totalSales : activeStats.totalSales).toLocaleString(isRo ? 'ro-RO' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-sm font-black text-slate-400">RON</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">{isRo ? 'Comision total generat:' : 'Total commission:'}</span>
              <span className="font-bold text-emerald-600">
                {(period === 'all' ? data.totalCommissions : activeStats.totalCommissions).toLocaleString(isRo ? 'ro-RO' : 'en-US', { minimumFractionDigits: 2 })} RON
              </span>
            </div>
          </motion.div>

          {/* CARD 3: COMENZI SI UTILIZARI */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-3xl p-6 border border-slate-200/90 bg-white/95 backdrop-blur-sm shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                {isRo ? 'Comenzi cu Codul Tău' : 'Code Usages'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <ShoppingBag size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
                {period === 'all' ? data.usagesCount : activeStats.usagesCount}
              </span>
              <span className="text-xs font-bold text-slate-500">{isRo ? 'comenzi' : 'orders'}</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">{isRo ? 'Valoare medie coș:' : 'Average order:'}</span>
              <span className="font-bold text-slate-700">
                {activeStats.aov.toLocaleString(isRo ? 'ro-RO' : 'en-US', { minimumFractionDigits: 2 })} RON
              </span>
            </div>
          </motion.div>

          {/* CARD 4: COMISIONUL TAU (%) */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-3xl p-6 border border-slate-200/90 bg-white/95 backdrop-blur-sm shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                {isRo ? 'Rată Comision' : 'Commission Rate'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Award size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
                {data.commissionPercent}%
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">{isRo ? 'Status comision:' : 'Commission status:'}</span>
              <span className="font-bold text-emerald-600 flex items-center gap-1.5 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {isRo ? 'Comision Activ' : 'Active'}
              </span>
            </div>
          </motion.div>

        </div>

        {/* BANK DETAILS SECTION (Single place for IBAN: display, edit, delete) */}
        {paymentDetails?.iban ? (
          <div className="bg-white/95 backdrop-blur-md border border-emerald-200/90 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5 transition-all">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0 shadow-2xs">
                <CreditCard size={24} />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] uppercase font-black tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 size={11} className="text-emerald-600" />
                    <span>{isRo ? 'Cont IBAN Activ pentru Încasare' : 'Active Payout IBAN'}</span>
                  </span>
                  {paymentDetails.bankName && (
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md">
                      {paymentDetails.bankName}
                    </span>
                  )}
                </div>

                <p className="text-base sm:text-lg font-mono font-black text-slate-900 tracking-wider">
                  {formatIban(paymentDetails.iban)}
                </p>

                {paymentDetails.accountHolder && (
                  <p className="text-xs text-slate-500 font-medium">
                    <span className="text-slate-400">{isRo ? 'Titular cont: ' : 'Account holder: '}</span>
                    <strong className="text-slate-700">{paymentDetails.accountHolder}</strong>
                  </p>
                )}
              </div>
            </div>

            {/* ACTION BUTTONS: EDIT & DELETE */}
            <div className="flex items-center gap-2.5 self-end md:self-center w-full sm:w-auto">
              <button
                type="button"
                onClick={handleOpenEditIban}
                className="flex-1 sm:flex-initial bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-200 transition-all shadow-2xs active:scale-95 flex items-center justify-center gap-2"
              >
                <Pencil size={14} className="text-slate-600" />
                <span>{isRo ? 'Editează' : 'Edit'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex-1 sm:flex-initial bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold px-4 py-2.5 rounded-xl border border-red-200 transition-all shadow-2xs active:scale-95 flex items-center justify-center gap-2"
                title={isRo ? 'Șterge contul IBAN' : 'Delete IBAN'}
              >
                <Trash2 size={14} />
                <span>{isRo ? 'Șterge' : 'Delete'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-amber-200 flex items-center justify-center text-amber-600 shrink-0 shadow-2xs">
                <CreditCard size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-900">
                  {isRo ? 'Nu ai completat încă un cont IBAN pentru încasarea comisioanelor.' : 'No payout IBAN configured yet.'}
                </p>
                <p className="text-[11px] text-amber-700/80 mt-0.5">
                  {isRo ? 'Comisioanele se transferă periodic direct în contul bancar.' : 'Commissions are transferred periodically to your bank account.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleOpenEditIban}
              className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all shadow-md shadow-amber-600/20 active:scale-95 flex items-center gap-1.5"
            >
              <span>{isRo ? '+ Adaugă IBAN' : '+ Add IBAN'}</span>
            </button>
          </div>
        )}

        {/* ORDER HISTORY SECTION */}
        <div id="affiliate-orders-section" className="space-y-6 pt-4">
          
          {/* SECTION CONTROLS: TITLE + MODERN PERIOD DROPDOWN + SEARCH INPUT */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-2.5 font-heading">
                <Layers size={22} className="text-[#008ba3]" />
                <span>{isRo ? 'Istoric Vânzări & Comenzi' : 'Orders & Sales History'}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {isRo 
                  ? 'Vezi comenzile plasate cu codul tău, data și ora achiziției, produsele cumpărate și comisionul generat.'
                  : 'View orders placed with your coupon, order date and time, items purchased, and commission earned.'}
              </p>
            </div>

            {/* FILTERS & DROPDOWNS */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              
              {/* SEARCH INPUT */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  placeholder={isRo ? 'Caută după produs, număr comandă...' : 'Search by product, order reference...'}
                  className="w-full sm:w-64 bg-white border border-slate-200 rounded-2xl pl-9 pr-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#e32f8c] focus:ring-1 focus:ring-[#e32f8c] shadow-2xs transition-colors"
                />
                <Search size={14} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* MODERN PERIOD SELECTOR DROPDOWN */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsPeriodDropdownOpen(!isPeriodDropdownOpen)}
                  className="w-full sm:w-auto bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-700 flex items-center justify-between sm:justify-start gap-2.5 transition-all shadow-2xs"
                >
                  <Calendar size={14} className="text-[#008ba3]" />
                  <span>{currentPeriodLabel}</span>
                  <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isPeriodDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isPeriodDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsPeriodDropdownOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 z-50 overflow-hidden"
                      >
                        {periodOptions.map(opt => {
                          const isSelected = period === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                setPeriod(opt.id);
                                setIsPeriodDropdownOpen(false);
                                setCurrentPage(1);
                              }}
                              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
                                isSelected 
                                  ? 'bg-[#e32f8c]/15 text-[#008ba3]' 
                                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                              }`}
                            >
                              <span>{isRo ? opt.labelRo : opt.labelEn}</span>
                              {isSelected && <Check size={14} className="text-[#008ba3]" />}
                            </button>
                          );
                        })}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

            </div>
          </div>

          {/* ORDERS LIST / TABLE */}
          {filteredOrders.length === 0 ? (
            /* EMPTY STATE */
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 backdrop-blur-sm p-12 text-center shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 mx-auto flex items-center justify-center text-slate-400 mb-4">
                <ShoppingBag size={28} />
              </div>
              <h3 className="text-base font-black uppercase tracking-tight text-slate-900 mb-1 font-heading">
                {isRo ? 'Nicio comandă în această perioadă' : 'No orders in this period'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
                {isRo 
                  ? 'Nu există încă înregistrări conform filtrelor alese. Încearcă să selectezi o altă perioadă sau distribuie codul tău.'
                  : 'No orders match your selected period or search. Try changing the period filter or sharing your referral link.'}
              </p>
              {period !== 'all' && (
                <button
                  onClick={() => setPeriod('all')}
                  className="bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors"
                >
                  {isRo ? 'Vezi toate perioadele' : 'View all time'}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">

              {/* DESKTOP TABLE HEADER (VISIBLE ON MD+) */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 text-[11px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200">
                <div className="col-span-3">{isRo ? 'Dată & Oră Comandă' : 'Order Date & Time'}</div>
                <div className="col-span-5">{isRo ? 'Ce a Cumpărat (Produse)' : 'Items Purchased'}</div>
                <div className="col-span-2 text-right">{isRo ? 'Total Coș' : 'Order Total'}</div>
                <div className="col-span-2 text-right">{isRo ? 'Comision Tău' : 'Your Commission'}</div>
              </div>

              {/* ORDERS ITERATION */}
              {paginatedOrders.map(order => {
                const isExpanded = expandedOrderId === order.id;
                const formattedDate = new Date(order.createdAt).toLocaleDateString(isRo ? 'ro-RO' : 'en-US', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                });
                const formattedTime = new Date(order.createdAt).toLocaleTimeString(isRo ? 'ro-RO' : 'en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                });
                const orderStatus = String(order.status || '').toLowerCase().trim();
                const isCancelled = ['cancelled', 'anulat', 'anulata'].includes(orderStatus);
                const isReturned = ['returned', 'returnat', 'returnata', 'neridicat', 'refused'].includes(orderStatus);
                const isRefunded = ['refunded', 'rambursat'].includes(orderStatus);
                const isNonCountable = isCancelled || isReturned || isRefunded || order.isCountable === false;

                return (
                  <div
                    key={order.id}
                    className={`rounded-2xl border transition-all overflow-hidden ${
                      isNonCountable
                        ? 'border-slate-200 bg-slate-50/60 opacity-90'
                        : 'border-slate-200/90 hover:border-slate-300 bg-white shadow-2xs hover:shadow-xs'
                    }`}
                  >
                    {/* DESKTOP ROW (MD+) */}
                    <div 
                      onClick={() => toggleExpandOrder(order.id)}
                      className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 items-center cursor-pointer select-none"
                    >
                      {/* CÂND: DATĂ, ORĂ, NUMĂR COMANDĂ */}
                      <div className="col-span-3 flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-blue-600 shrink-0 mt-0.5 shadow-2xs">
                          <Calendar size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 leading-snug">{formattedDate}</p>
                          <p className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <Clock size={11} className="text-slate-400" />
                            <span>{isRo ? `ora ${formattedTime}` : `at ${formattedTime}`}</span>
                          </p>
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                              #{order.orderNumber}
                            </span>
                            {isCancelled ? (
                              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                                {isRo ? 'Anulată' : 'Cancelled'}
                              </span>
                            ) : isReturned ? (
                              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                                {isRo ? 'Returnată / Neridicată' : 'Returned'}
                              </span>
                            ) : isRefunded ? (
                              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                {isRo ? 'Rambursată' : 'Refunded'}
                              </span>
                            ) : (
                              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {order.status === 'delivered' ? (isRo ? 'Livrată' : 'Delivered') : (isRo ? 'Confirmată' : 'Confirmed')}
                              </span>
                            )}
                            {order.customerName && (
                              <span className="text-[10px] font-bold text-slate-700 bg-blue-50 text-blue-700 border border-blue-200/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <Users size={11} className="text-blue-500" />
                                <span>{order.customerName}</span>
                                {order.customerCity && <span className="text-blue-400 font-normal">({order.customerCity})</span>}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* CE A CUMPĂRAT: PRODUSE, CULORI, CANTITĂȚI */}
                      <div className="col-span-5 flex flex-col justify-center">
                        {order.items.length > 0 ? (
                          <div className="space-y-2">
                            {order.items.slice(0, 2).map((item, idx) => (
                              <div key={idx} className="flex items-center gap-2.5">
                                {item.image ? (
                                  <div className="w-10 h-10 relative rounded-xl bg-slate-50 border border-slate-200 shrink-0 overflow-hidden">
                                    <Image src={getOptimizedImageUrl(item.image) || '/placeholder.png'} alt={item.name} fill sizes="40px" className="object-cover" />
                                  </div>
                                ) : (
                                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                    <ShoppingBag size={16} />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-slate-900 truncate leading-tight">{item.name}</p>
                                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                    {item.variant && (
                                      <span className="text-[9px] font-bold text-[#008ba3] bg-[#e32f8c]/10 px-2 py-0.5 rounded-full border border-[#e32f8c]/25 truncate">
                                        {item.variant}
                                      </span>
                                    )}
                                    <span className="text-[10px] font-extrabold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                      x{item.quantity} {isRo ? 'buc' : 'pcs'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {order.items.length > 2 && (
                              <div className="flex items-center gap-1 text-[11px] font-bold text-[#008ba3] hover:underline pt-0.5">
                                <span>+{order.items.length - 2} {isRo ? 'alte produse' : 'more items'}</span>
                                <ChevronDown size={13} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Pachet TrenZone</span>
                        )}
                      </div>

                      {/* TOTAL COMANDĂ */}
                      <div className="col-span-2 text-right">
                        <p className={`text-sm font-black ${isNonCountable ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                          {order.totalAmount.toLocaleString(isRo ? 'ro-RO' : 'en-US', { minimumFractionDigits: 2 })} {order.currency}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          subtotal: {order.subtotal.toFixed(2)} {order.currency}
                        </p>
                      </div>

                      {/* COMISION TĂU */}
                      <div className="col-span-2 text-right">
                        {isNonCountable ? (
                          <>
                            <p className="text-sm font-black text-slate-400">
                              0.00 {order.currency}
                            </p>
                            <span className="inline-block mt-0.5 text-[9px] font-black uppercase tracking-wider text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                              {isCancelled ? (isRo ? 'Anulată' : 'Cancelled') : (isRo ? 'Fără comision' : 'No commission')}
                            </span>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-black text-emerald-600">
                              +{order.commissionAmount.toLocaleString(isRo ? 'ro-RO' : 'en-US', { minimumFractionDigits: 2 })} {order.currency}
                            </p>
                            <span className="inline-block mt-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              {data.commissionPercent}% {isRo ? 'comision' : 'earned'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* MOBILE CARD (BELOW MD) */}
                    <div 
                      onClick={() => toggleExpandOrder(order.id)}
                      className="md:hidden p-4 cursor-pointer select-none space-y-3"
                    >
                      {/* CÂND & STATUS + COMISION HEADER */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <Calendar size={13} className="text-blue-600 shrink-0" />
                            <p className="text-xs font-black text-slate-900">{formattedDate}</p>
                            <span className="text-[10px] text-slate-400">• {isRo ? `ora ${formattedTime}` : `at ${formattedTime}`}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                              #{order.orderNumber}
                            </span>
                            {isCancelled ? (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                                {isRo ? 'Anulată' : 'Cancelled'}
                              </span>
                            ) : isReturned ? (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                                {isRo ? 'Returnată / Neridicată' : 'Returned'}
                              </span>
                            ) : isRefunded ? (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                {isRo ? 'Rambursată' : 'Refunded'}
                              </span>
                            ) : (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {order.status === 'delivered' ? (isRo ? 'Livrată' : 'Delivered') : (isRo ? 'Confirmată' : 'Confirmed')}
                              </span>
                            )}
                            {order.customerName && (
                              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <Users size={11} className="text-blue-500" />
                                <span>{order.customerName}</span>
                                {order.customerCity && <span className="text-blue-400 font-normal">({order.customerCity})</span>}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {isNonCountable ? (
                            <>
                              <p className="text-xs font-black text-slate-400">
                                0.00 {order.currency}
                              </p>
                              <p className="text-[10px] font-bold text-slate-400 mt-0.5 line-through">
                                {isRo ? 'coș: ' : 'order: '}{order.totalAmount.toFixed(2)} {order.currency}
                              </p>
                              <span className="inline-block mt-0.5 text-[8px] font-black uppercase tracking-wider text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                                {isCancelled ? (isRo ? 'Anulată' : 'Cancelled') : (isRo ? 'Fără comision' : 'No commission')}
                              </span>
                            </>
                          ) : (
                            <>
                              <p className="text-xs font-black text-emerald-600">
                                +{order.commissionAmount.toFixed(2)} {order.currency}
                              </p>
                              <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                                {isRo ? 'coș: ' : 'order: '}{order.totalAmount.toFixed(2)} {order.currency}
                              </p>
                            </>
                          )}
                        </div>
                      </div>

                      {/* PRODUSE CUMPĂRATE (DIRECT PE MOBIL) */}
                      <div className="pt-2.5 border-t border-slate-100 space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                          <span>{isRo ? 'Produse achiziționate:' : 'Items purchased:'}</span>
                          <span>{order.items.length} {order.items.length === 1 ? (isRo ? 'articol' : 'item') : (isRo ? 'articole' : 'items')}</span>
                        </div>
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2.5 bg-slate-50/90 border border-slate-100 rounded-xl p-2.5 shadow-2xs">
                              {item.image ? (
                              <div className="w-11 h-11 relative rounded-lg bg-white border border-slate-200 shrink-0 overflow-hidden">
                                <Image src={getOptimizedImageUrl(item.image) || '/placeholder.png'} alt={item.name} fill sizes="44px" className="object-cover" />
                              </div>
                            ) : (
                              <div className="w-11 h-11 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                <ShoppingBag size={16} />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate leading-tight">{item.name}</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                {item.variant && (
                                  <span className="text-[9px] font-bold text-[#008ba3] bg-white px-1.5 py-0.5 rounded border border-[#e32f8c]/20 truncate">
                                    {item.variant}
                                  </span>
                                )}
                                <span className="text-[10px] font-bold text-slate-600">
                                  x{item.quantity} {isRo ? 'buc' : 'pcs'}
                                </span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs font-black text-slate-800">
                                {(item.quantity * item.price).toFixed(2)} {order.currency}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* EXPANDABLE DETAILS ON DESKTOP (IF > 2 ITEMS OR EXPANDED) */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-slate-200 bg-slate-50/70 px-4 sm:px-6 py-4"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#008ba3]">
                              {isRo ? 'Toate produsele achiziționate în comanda aceasta:' : 'All products purchased in this order:'}
                            </p>
                            <span className="text-xs font-bold text-slate-500">
                              {order.items.length} {order.items.length === 1 ? (isRo ? 'produs' : 'item') : (isRo ? 'produse' : 'items')}
                            </span>
                          </div>

                          {order.items && order.items.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {order.items.map((item, idx) => (
                                <div 
                                  key={idx}
                                  className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3 shadow-2xs"
                                >
                                  {item.image ? (
                                    <div className="w-12 h-12 relative rounded-lg bg-slate-50 border border-slate-200 shrink-0 overflow-hidden">
                                      <Image src={getOptimizedImageUrl(item.image) || '/placeholder.png'} alt={item.name} fill sizes="48px" className="object-cover" />
                                    </div>
                                  ) : (
                                    <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                      <ShoppingBag size={18} />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-900 truncate">{item.name}</p>
                                    {item.variant && (
                                      <p className="text-[10px] text-[#008ba3] font-semibold mt-0.5">{item.variant}</p>
                                    )}
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                      {item.quantity} x {item.price.toFixed(2)} {order.currency}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-xs font-black text-slate-900">
                                      {(item.quantity * item.price).toFixed(2)} {order.currency}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500 italic">
                              {isRo ? 'Detalii produse indisponibile.' : 'No detailed item breakdown available.'}
                            </p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                  </div>
                );
              })}

            </div>
          )}

          {/* PAGINATION CONTROLS */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
              <p className="text-xs text-slate-500">
                {isRo ? 'Afișare' : 'Showing'}{' '}
                <span className="font-bold text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span> -{' '}
                <span className="font-bold text-slate-900">{Math.min(currentPage * itemsPerPage, filteredOrders.length)}</span>{' '}
                {isRo ? 'din' : 'of'}{' '}
                <span className="font-bold text-slate-900">{filteredOrders.length}</span> {isRo ? 'comenzi' : 'orders'}
              </p>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-slate-700 shadow-2xs transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
                  const isActive = pageNum === currentPage;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => handlePageChange(pageNum)}
                      className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-[#e32f8c] text-black shadow-md shadow-[#e32f8c]/25 font-black scale-105'
                          : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-slate-700 shadow-2xs transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

        </div>

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
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 text-slate-900"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 font-heading">
                    {isRo ? 'Date Plată Comisioane' : 'Payout Details'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isRo ? 'Introdu contul unde dorești să primești viramentul comisioanelor.' : 'Enter the account where you want to receive earnings.'}
                  </p>
                </div>
                <button
                  onClick={() => setIsIbanModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveIban} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    {isRo ? 'Cont IBAN' : 'IBAN Account'}
                  </label>
                  <input
                    type="text"
                    required
                    value={ibanInput}
                    onChange={e => setIbanInput(e.target.value.toUpperCase())}
                    placeholder="RO49AAAA1B31007593840000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#e32f8c] focus:bg-white focus:ring-1 focus:ring-[#e32f8c] transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    {isRo ? 'Nume Bancă' : 'Bank Name'}
                  </label>
                  <input
                    type="text"
                    value={bankNameInput}
                    onChange={e => setBankNameInput(e.target.value)}
                    placeholder="ex: Banca Transilvania, ING, Revolut"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#e32f8c] focus:bg-white focus:ring-1 focus:ring-[#e32f8c] transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    {isRo ? 'Titular Cont' : 'Account Holder'}
                  </label>
                  <input
                    type="text"
                    value={holderInput}
                    onChange={e => setHolderInput(e.target.value)}
                    placeholder="Nume Prenume"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#e32f8c] focus:bg-white focus:ring-1 focus:ring-[#e32f8c] transition-colors"
                  />
                </div>

                {ibanError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-bold p-3.5 rounded-xl">
                    {ibanError}
                  </div>
                )}

                {ibanSuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold p-3.5 rounded-xl flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    <span>{isRo ? 'Datele bancare au fost salvate cu succes!' : 'Payout details saved successfully!'}</span>
                  </div>
                )}

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsIbanModalOpen(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl text-xs font-bold transition-colors"
                  >
                    {isRo ? 'Anulează' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={ibanSaving}
                    className="flex-1 bg-[#e32f8c] hover:bg-[#c41a72] text-black py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 shadow-md shadow-[#e32f8c]/20"
                  >
                    {ibanSaving ? (isRo ? 'Se salvează...' : 'Saving...') : (isRo ? 'Salvează' : 'Save Details')}
                  </button>
                </div>

                {paymentDetails.iban && (
                  <div className="pt-3 border-t border-slate-100 flex justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        setIsIbanModalOpen(false);
                        setShowDeleteConfirm(true);
                      }}
                      className="text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1.5 py-1 px-3 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={13} />
                      <span>{isRo ? 'Șterge acest cont bancar' : 'Delete this bank account'}</span>
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
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl z-10 border border-slate-200 text-slate-900"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
                <Trash2 size={24} />
              </div>
              <h4 className="text-lg font-black text-slate-900 uppercase font-heading">
                {isRo ? 'Ștergi contul IBAN?' : 'Delete IBAN?'}
              </h4>
              <p className="text-xs text-slate-500 mt-1 mb-6 leading-relaxed">
                {isRo 
                  ? 'Ești sigur că vrei să elimini acest cont bancar? Nu vei mai avea un cont setat pentru plata comisioanelor până când nu adaugi unul nou.'
                  : 'Are you sure you want to remove this bank account? Automatic payouts will be paused until a new account is added.'}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  {isRo ? 'Anulează' : 'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={ibanDeleting}
                  onClick={handleDeleteIban}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  {ibanDeleting ? (isRo ? 'Se șterge...' : 'Deleting...') : (isRo ? 'Da, Șterge' : 'Delete')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
