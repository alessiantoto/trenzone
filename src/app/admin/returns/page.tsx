'use client';

import { useEffect, useState, useMemo } from 'react';
import { updateReturnStatus } from '@/app/actions/returns';
import { getCanonicalOrderNumber } from '@/utils/admin-helpers';
import { 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Clock, 
  CreditCard, 
  Copy, 
  Check, 
  ExternalLink, 
  Phone, 
  Mail, 
  FileText, 
  ChevronDown, 
  ChevronUp,
  RotateCcw,
  User,
  ShoppingBag,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import toast from 'react-hot-toast';

type ReturnFilter = 'all' | 'pending' | 'approved' | 'returned' | 'rejected';

export default function AdminReturnsPage() {
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ReturnFilter>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedReasonId, setExpandedReasonId] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Confirmation modal popup
  const [popup, setPopup] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText: string;
    variant: 'blue' | 'emerald' | 'rose';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    confirmText: 'Confirmă',
    variant: 'blue'
  });

  useEffect(() => {
    fetchReturns();
  }, []);

  async function fetchReturns() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/data?action=returns');
      const json = await res.json();
      setReturns(json.data || []);
    } catch (err: any) {
      toast.error('Eroare la încărcarea retururilor.');
    } finally {
      setLoading(false);
    }
  }

  async function executeStatusChange(id: string, newStatus: string, orderId: string) {
    setActionInProgress(id);
    const toastId = toast.loading('Se actualizează statusul...');
    const res = await updateReturnStatus(id, newStatus, orderId);
    if (res.success) {
      toast.success('Statusul returului a fost actualizat!', { id: toastId });
      await fetchReturns();
    } else {
      toast.error(res.error || 'Eroare la actualizarea statusului.', { id: toastId });
    }
    setActionInProgress(null);
  }

  const promptStatusChange = (ret: any, newStatus: string) => {
    const targetOrderId = ret.orders?.id || ret.order_id;
    const displayId = getOrderDisplay(ret);

    if (newStatus === 'approved') {
      setPopup({
        isOpen: true,
        title: 'Aprobă Cererea de Retur',
        message: `Ești sigur că vrei să aprobi cererea de retur pentru comanda ${displayId} (${ret.customer_name})?`,
        confirmText: 'Aprobă Cererea',
        variant: 'blue',
        onConfirm: () => executeStatusChange(ret.id, 'approved', targetOrderId)
      });
    } else if (newStatus === 'rejected') {
      setPopup({
        isOpen: true,
        title: 'Respinge Cererea de Retur',
        message: `Ești sigur că vrei să respingi cererea de retur pentru comanda ${displayId}?`,
        confirmText: 'Respinge Cererea',
        variant: 'rose',
        onConfirm: () => executeStatusChange(ret.id, 'rejected', targetOrderId)
      });
    } else if (newStatus === 'returned' || newStatus === 'refunded') {
      setPopup({
        isOpen: true,
        title: 'Marchează ca Returnată & Rambursată',
        message: `Această acțiune confirmă primirea coletului și rambursarea banilor către ${ret.customer_name} (IBAN: ${ret.iban}). Comanda ${displayId} va fi marcată ca returnată în baza de date.`,
        confirmText: 'Confirmă Returnarea',
        variant: 'emerald',
        onConfirm: () => executeStatusChange(ret.id, 'returned', targetOrderId)
      });
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('IBAN copiat în clipboard!');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const getOrderDisplay = (ret: any) => {
    return getCanonicalOrderNumber(ret.orders || ret);
  };

  // Counts for each tab
  const counts = useMemo(() => {
    return {
      all: returns.length,
      pending: returns.filter(r => r.status === 'pending').length,
      approved: returns.filter(r => r.status === 'approved').length,
      returned: returns.filter(r => r.status === 'returned' || r.status === 'refunded').length,
      rejected: returns.filter(r => r.status === 'rejected').length,
    };
  }, [returns]);

  // Filter and search logic
  const filteredReturns = useMemo(() => {
    return returns.filter(r => {
      // 1. Status tab filter
      if (activeFilter === 'pending' && r.status !== 'pending') return false;
      if (activeFilter === 'approved' && r.status !== 'approved') return false;
      if (activeFilter === 'returned' && (r.status !== 'returned' && r.status !== 'refunded')) return false;
      if (activeFilter === 'rejected' && r.status !== 'rejected') return false;

      // 2. Search query filter
      if (!search.trim()) return true;
      const query = search.toLowerCase().trim();
      const displayOrderId = getOrderDisplay(r).toLowerCase();
      const orderStr = (r.orders?.payment_intent_id || r.orders?.receipt_url || r.order_id || '').toLowerCase();
      
      return (
        displayOrderId.includes(query) ||
        orderStr.includes(query) ||
        (r.customer_name || '').toLowerCase().includes(query) ||
        (r.customer_email || '').toLowerCase().includes(query) ||
        (r.customer_phone || '').toLowerCase().includes(query) ||
        (r.iban || '').toLowerCase().includes(query) ||
        (r.reason || '').toLowerCase().includes(query)
      );
    });
  }, [returns, activeFilter, search]);

  return (
    <div className="space-y-5 sm:space-y-6 pb-12 w-full max-w-full">
      {/* 🌟 HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <RotateCcw className="text-[#e32f8c]" size={24} /> Gestionează Retururi
            </h1>
            <span className="text-xs font-black bg-[#e32f8c]/10 text-[#009bb3] px-2.5 py-0.5 rounded-full">
              {returns.length}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Cererile de retragere trimise de clienți. Verifică IBAN-ul și datele comenzii înainte de rambursare.
          </p>
        </div>

        <button 
          onClick={fetchReturns}
          disabled={loading}
          className="w-full sm:w-auto h-9 px-4 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Actualizează lista</span>
        </button>
      </div>

      {/* 📊 SUMMARY METRICS PILLS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Total Cereri</span>
          <p className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">{counts.all}</p>
        </div>
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-amber-200/80 bg-amber-50/20 shadow-2xs">
          <span className="text-[10px] font-black uppercase text-amber-700 tracking-wider">În Așteptare</span>
          <p className="text-lg sm:text-xl font-black text-amber-700 mt-0.5">{counts.pending}</p>
        </div>
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-blue-200/80 bg-blue-50/20 shadow-2xs">
          <span className="text-[10px] font-black uppercase text-blue-700 tracking-wider">Aprobate</span>
          <p className="text-lg sm:text-xl font-black text-blue-700 mt-0.5">{counts.approved}</p>
        </div>
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/20 shadow-2xs">
          <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">Finalizate</span>
          <p className="text-lg sm:text-xl font-black text-emerald-700 mt-0.5">{counts.returned}</p>
        </div>
      </div>

      {/* 🔍 SEARCH AND FILTERS (Zero Horizontal Scroll!) */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        {/* Search */}
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Caută după comandă (TZ / ODIN), nume, email, telefon sau IBAN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:border-[#e32f8c] focus:bg-white transition-all placeholder:text-slate-400"
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-700"
            >
              Șterge
            </button>
          )}
        </div>

        {/* Filter Pills Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 sm:gap-2 pt-1 border-t border-slate-100">
          <button
            onClick={() => setActiveFilter('all')}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80'
            }`}
          >
            <span>Toate</span>
            <span className="text-[10px] font-black px-1.5 py-0.2 rounded-md bg-white/20">
              {counts.all}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('pending')}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeFilter === 'pending'
                ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80'
            }`}
          >
            <Clock size={12} />
            <span>În așteptare</span>
            <span className="text-[10px] font-black px-1.5 py-0.2 rounded-md bg-white/30">
              {counts.pending}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('approved')}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeFilter === 'approved'
                ? 'bg-blue-600 text-white shadow-xs font-black'
                : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80'
            }`}
          >
            <CheckCircle2 size={12} />
            <span>Aprobate</span>
            <span className="text-[10px] font-black px-1.5 py-0.2 rounded-md bg-white/20">
              {counts.approved}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('returned')}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeFilter === 'returned'
                ? 'bg-emerald-600 text-white shadow-xs font-black'
                : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80'
            }`}
          >
            <CheckCircle2 size={12} />
            <span>Finalizate</span>
            <span className="text-[10px] font-black px-1.5 py-0.2 rounded-md bg-white/20">
              {counts.returned}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('rejected')}
            className={`col-span-2 sm:col-span-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeFilter === 'rejected'
                ? 'bg-rose-600 text-white shadow-xs font-black'
                : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80'
            }`}
          >
            <XCircle size={12} />
            <span>Respinse</span>
            <span className="text-[10px] font-black px-1.5 py-0.2 rounded-md bg-white/20">
              {counts.rejected}
            </span>
          </button>
        </div>
      </div>

      {/* 📦 RETURNS CARD LIST (ZERO HORIZONTAL SCROLL) */}
      <div className="space-y-3 sm:space-y-4">
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
            <RefreshCw size={24} className="mx-auto text-slate-400 animate-spin" />
            <p className="text-xs sm:text-sm font-bold text-slate-600">Se încarcă cererile de retur...</p>
          </div>
        ) : filteredReturns.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 sm:p-14 text-center space-y-2">
            <RotateCcw size={32} className="mx-auto text-slate-300" />
            <h3 className="text-sm sm:text-base font-black text-slate-800">Nicio cerere de retur găsită</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {search 
                ? 'Nu există cereri de retur care să corespundă căutării tale.' 
                : activeFilter !== 'all' 
                  ? 'Nu există cereri cu statusul selectat.' 
                  : 'Când clienții completează formularul de retur, cererile vor apărea automat aici.'}
            </p>
          </div>
        ) : (
          filteredReturns.map((ret) => {
            const displayOrderId = getOrderDisplay(ret);
            const isReasonExpanded = expandedReasonId === ret.id;
            const isProcessing = actionInProgress === ret.id;

            return (
              <div 
                key={ret.id} 
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all p-4 sm:p-5 flex flex-col gap-3.5 relative overflow-hidden"
              >
                {/* Status Indicator top stripe */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${
                  ret.status === 'pending' ? 'bg-amber-400' :
                  ret.status === 'approved' ? 'bg-blue-500' :
                  (ret.status === 'returned' || ret.status === 'refunded') ? 'bg-emerald-500' :
                  'bg-rose-500'
                }`} />

                {/* 1. TOP BAR: Identification & Status */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Order ID Badge */}
                    <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5">
                      <ShoppingBag size={12} className="text-slate-500" />
                      <span>{displayOrderId}</span>
                    </span>

                    {/* Quick link to admin orders */}
                    <Link
                      href={`/admin/orders?search=${encodeURIComponent(displayOrderId)}`}
                      className="text-xs font-bold text-slate-500 hover:text-[#009bb3] flex items-center gap-1 bg-slate-100/80 hover:bg-[#e32f8c]/10 px-2 py-1 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                      title="Deschide în Panou Comenzi"
                    >
                      <ExternalLink size={12} />
                      <span className="hidden sm:inline">Vezi Comandă</span>
                    </Link>

                    {/* Order Amount */}
                    <span className="text-xs font-black text-slate-800 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md">
                      {ret.orders?.total_amount || 0} RON
                    </span>
                  </div>

                  {/* Right: Return Status & Date */}
                  <div className="flex items-center gap-2 ml-auto sm:ml-0">
                    {ret.status === 'pending' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-wider">
                        <Clock size={11} /> În așteptare
                      </span>
                    )}
                    {ret.status === 'approved' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-wider">
                        <CheckCircle2 size={11} /> Aprobat
                      </span>
                    )}
                    {(ret.status === 'refunded' || ret.status === 'returned') && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
                        <CheckCircle2 size={11} /> Returnată & Rambursată
                      </span>
                    )}
                    {ret.status === 'rejected' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200 uppercase tracking-wider">
                        <XCircle size={11} /> Respins
                      </span>
                    )}

                    <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap">
                      {new Date(ret.created_at).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* 2. MAIN DETAILS GRID (Responsive: 1 col on mobile, 3 cols on desktop) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 bg-slate-50/70 rounded-xl border border-slate-100 text-xs">
                  {/* Client Info */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Client</span>
                    <p className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                      <User size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{ret.customer_name}</span>
                    </p>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Mail size={12} className="text-slate-400 shrink-0" />
                      <a href={`mailto:${ret.customer_email}`} className="hover:text-[#009bb3] underline truncate">
                        {ret.customer_email}
                      </a>
                    </div>
                    {ret.customer_phone && (
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Phone size={12} className="text-slate-400 shrink-0" />
                        <a href={`tel:${ret.customer_phone}`} className="hover:text-[#009bb3]">
                          {ret.customer_phone}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Bank Details (IBAN) */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Cont Bancar (IBAN)</span>
                    <div className="flex items-center gap-1.5 font-mono font-black text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200/90 text-xs w-fit max-w-full">
                      <CreditCard size={13} className="text-[#e32f8c] shrink-0" />
                      <span className="tracking-wide break-all">{ret.iban}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(ret.iban, ret.id)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-[#009bb3] transition-colors cursor-pointer"
                    >
                      {copiedId === ret.id ? (
                        <span className="text-emerald-600 flex items-center gap-1">
                          <Check size={12} /> Copiat în clipboard!
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Copy size={12} /> Copiază IBAN
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Associated Order Status & Meta */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Context Comandă</span>
                    <p className="text-slate-700">
                      Status colet: <span className="font-bold text-slate-900 capitalize">{ret.orders?.status || 'N/A'}</span>
                    </p>
                    <p className="text-slate-500 text-[11px]">
                      Plasată la: {ret.orders?.created_at ? new Date(ret.orders.created_at).toLocaleDateString('ro-RO') : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* 3. RETURN REASON (MOTIV RETUR) */}
                {ret.reason && (
                  <div className="bg-slate-50/50 rounded-xl border border-slate-200/70 p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                        <FileText size={11} className="text-slate-400" />
                        Motivul Solicitării
                      </span>
                      {ret.reason.length > 80 && (
                        <button
                          onClick={() => setExpandedReasonId(isReasonExpanded ? null : ret.id)}
                          className="text-[11px] font-bold text-[#009bb3] hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          <span>{isReasonExpanded ? 'Mai puțin' : 'Vezi tot'}</span>
                          {isReasonExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 italic leading-relaxed">
                      "{isReasonExpanded || ret.reason.length <= 80 ? ret.reason : `${ret.reason.slice(0, 80)}...`}"
                    </p>
                  </div>
                )}

                {/* 4. ACTION FOOTER BAR */}
                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  {ret.status === 'pending' && (
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        onClick={() => promptStatusChange(ret, 'rejected')}
                        disabled={isProcessing}
                        className="flex-1 sm:flex-initial h-8 sm:h-9 px-3.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <XCircle size={13} />
                        <span>Respinge</span>
                      </button>

                      <button
                        onClick={() => promptStatusChange(ret, 'approved')}
                        disabled={isProcessing}
                        className="flex-1 sm:flex-initial h-8 sm:h-9 px-4 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl transition-all shadow-xs shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 size={13} />
                        <span>Aprobă Returul</span>
                      </button>
                    </div>
                  )}

                  {ret.status === 'approved' && (
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        onClick={() => promptStatusChange(ret, 'rejected')}
                        disabled={isProcessing}
                        className="h-8 sm:h-9 px-3 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                      >
                        Respinge
                      </button>

                      <button
                        onClick={() => promptStatusChange(ret, 'returned')}
                        disabled={isProcessing}
                        className="flex-1 sm:flex-initial h-8 sm:h-9 px-4 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl transition-all shadow-xs shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 size={13} />
                        <span>Marchează Returnată & Rambursată</span>
                      </button>
                    </div>
                  )}

                  {(ret.status === 'returned' || ret.status === 'refunded') && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                      <CheckCircle2 size={13} /> Retur Finalizat & Rambursat
                    </span>
                  )}

                  {ret.status === 'rejected' && (
                    <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                      <XCircle size={13} /> Cerere Respinsă
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 🛡️ CONFIRMATION MODAL OVERLAY */}
      <AnimatePresence>
        {popup.isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
              onClick={() => setPopup(p => ({ ...p, isOpen: false }))} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 sm:p-6 transform transition-all space-y-4"
            >
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <AlertTriangle size={18} className={
                    popup.variant === 'rose' ? 'text-rose-600' :
                    popup.variant === 'emerald' ? 'text-emerald-600' :
                    'text-blue-600'
                  } />
                  {popup.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 font-medium mt-2 leading-relaxed whitespace-pre-line">
                  {popup.message}
                </p>
              </div>
              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button 
                  onClick={() => setPopup(p => ({ ...p, isOpen: false }))}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Anulează
                </button>
                <button 
                  onClick={() => {
                    popup.onConfirm();
                    setPopup(p => ({ ...p, isOpen: false }));
                  }}
                  className={`px-4 py-2 text-xs font-black text-white rounded-xl transition-all active:scale-95 shadow-md cursor-pointer ${
                    popup.variant === 'rose' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20' :
                    popup.variant === 'emerald' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' :
                    'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                  }`}
                >
                  {popup.confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
