"use client";

import { getOptimizedImageUrl } from '@/lib/utils/imageProxy';
import { useState, useEffect, useMemo, Fragment } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  ArrowUpRight, 
  TrendingUp, 
  MoreHorizontal, 
  UserCheck, 
  ChevronDown, 
  ChevronUp, 
  X, 
  Save, 
  Ticket, 
  Mail, 
  CheckCircle2, 
  Loader2, 
  Copy, 
  Check, 
  CreditCard,
  ShoppingBag,
  DollarSign,
  Award,
  Clock,
  Sparkles,
  Layers,
  Pencil,
  Trash2,
  ExternalLink,
  Banknote,
  Package,
  Eye,
  Phone,
  MapPin,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 

  approveAffiliate, 
  rejectAffiliate, 
  suspendAffiliate, 
  activateAffiliate, 
  deleteAffiliate, 
  createAdminAffiliate,
  recordAffiliatePayoutAction
} from '@/app/actions/admin-affiliates';
import toast from 'react-hot-toast';

import Link from 'next/link';

const CommissionDropdown = ({ value, onChange }: { value: number, onChange: (v: number) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative">
      <button 
        type="button" 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#e32f8c] shadow-sm flex items-center justify-between"
      >
        <span>{value}%</span>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }} 
              className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden"
            >
              {[10, 15, 20].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => { onChange(v); setIsOpen(false); }}
                  className={`w-full px-4 py-3 text-left text-sm font-bold transition-colors ${value === v ? 'bg-[#e32f8c]/10 text-[#e32f8c]' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  {v}%
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// 🌟 Detailed Affiliate Portal View (Matches https://www.trenzone.fit/en/affiliate/login experience)
function AffiliatePortalView({
  affiliate,
  onOpenEdit,
  onOpenApprove,
  onReject,
  onSuspend,
  onActivate,
  onDelete,
  onRecordPayout,
  processingId,
  copiedKey,
  onCopy,
  onClose
}: {
  affiliate: any;
  onOpenEdit: (aff: any) => void;
  onOpenApprove: (aff: any) => void;
  onReject: (id: string) => void;
  onSuspend: (id: string) => void;
  onActivate: (id: string) => void;
  onDelete: (id: string) => void;
  onRecordPayout: (aff: any) => void;
  processingId: string | null;
  copiedKey: string | null;
  onCopy: (text: string, key: string, label: string) => void;
  onClose?: () => void;
}) {
  const [orderSearch, setOrderSearch] = useState('');

  const filteredOrders = useMemo(() => {
    if (!affiliate.orders || !Array.isArray(affiliate.orders)) return [];
    if (!orderSearch.trim()) return affiliate.orders;
    const q = orderSearch.toLowerCase().trim();
    return affiliate.orders.filter((o: any) => {
      const matchNumber = String(o.orderNumber || '').toLowerCase().includes(q);
      const matchStatus = String(o.status || '').toLowerCase().includes(q);
      const matchCustomer = String(o.customerName || '').toLowerCase().includes(q) ||
                            String(o.customerEmail || '').toLowerCase().includes(q) ||
                            String(o.customerPhone || '').toLowerCase().includes(q) ||
                            String(o.customerCity || '').toLowerCase().includes(q);
      const matchItems = (o.items || []).some((it: any) => 
        String(it.name || '').toLowerCase().includes(q) || 
        String(it.variant || '').toLowerCase().includes(q)
      );
      return matchNumber || matchStatus || matchCustomer || matchItems;
    });
  }, [affiliate.orders, orderSearch]);

  const ordersCount = affiliate.orders?.length || 0;

  return (
    <div className="space-y-5 text-slate-900 animate-in fade-in duration-300">
      
      {/* 👑 HERO & PARTNERSHIP IDENTITY CARD */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 w-72 h-72 bg-[#e32f8c]/10 blur-3xl pointer-events-none" />
        
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="sm:hidden absolute top-3.5 right-3.5 w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 active:bg-white/35 text-white flex items-center justify-center transition-colors cursor-pointer z-20"
            title="Închide"
            aria-label="Închide"
          >
            <X size={18} />
          </button>
        )}
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#e32f8c] text-[10px] font-black uppercase tracking-widest mb-1.5">
              <Sparkles size={12} />
              <span>Panou Afiliat Partener • TrenZone</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight">{affiliate.name}</h3>
            <div className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="flex items-center gap-1">
                <Mail size={12} className="text-slate-400" />
                <a href={`mailto:${affiliate.email}`} className="hover:underline hover:text-[#e32f8c]">{affiliate.email}</a>
              </span>
              {affiliate.activatedAt && (
                <>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400">Activ din: <strong>{affiliate.activatedAt}</strong></span>
                </>
              )}
              {affiliate.requestedAt && (
                <>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400">Înregistrat: {affiliate.requestedAt}</span>
                </>
              )}
            </div>
          </div>

          {/* Quick promotion share elements */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Coupon Code Pill with 1-click Copy */}
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-xl">
              <Ticket size={14} className="text-[#e32f8c]" />
              <span className="font-mono text-xs font-black text-white uppercase">{affiliate.code}</span>
              <button
                type="button"
                onClick={() => onCopy(affiliate.code, `code-${affiliate.id}`, 'Cod reducere')}
                className="text-slate-400 hover:text-white p-0.5 transition-colors cursor-pointer"
                title="Copiază codul"
              >
                {copiedKey === `code-${affiliate.id}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              </button>
            </div>

            {/* Referral link button with 1-click Copy */}
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-xl">
              <span className="text-xs font-bold text-slate-300">Link:</span>
              <button
                type="button"
                onClick={() => onCopy(affiliate.referralLink, `link-${affiliate.id}`, 'Link de afiliere')}
                className="text-xs font-bold text-[#e32f8c] hover:underline flex items-center gap-1 cursor-pointer"
                title="Copiază linkul de afiliere"
              >
                <span>Copiază</span>
                {copiedKey === `link-${affiliate.id}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              </button>
              <a
                href={affiliate.referralLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-white p-0.5"
                title="Deschide magazinul cu codul pre-aplicat"
              >
                <ExternalLink size={12} />
              </a>
            </div>

            {/* Commission badge */}
            <span className="px-3 py-1.5 bg-[#e32f8c] text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm">
              {affiliate.commission} Comision
            </span>
          </div>
        </div>
      </div>

      {/* 📊 6 FINANCIAL KPI CARDS (Exact ca în Portalul Afiliatului) */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-2.5 sm:gap-3">
        {/* Total Sales */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Vânzări Totale</span>
            <TrendingUp size={14} className="text-[#e32f8c]" />
          </div>
          <p className="text-base sm:text-lg font-black text-slate-900">{affiliate.totalSales}</p>
          <p className="text-[10px] font-bold text-slate-400 mt-0.5">Comenzi atrase</p>
        </div>

        {/* Total Commissions */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Comisioane</span>
            <DollarSign size={14} className="text-emerald-600" />
          </div>
          <p className="text-base sm:text-lg font-black text-emerald-600">{affiliate.totalCommissions}</p>
          <p className="text-[10px] font-bold text-slate-400 mt-0.5">Calculat la {affiliate.commission}</p>
        </div>

        {/* Pending Payout */}
        <div className="bg-amber-50/50 p-3.5 rounded-2xl border border-amber-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">De Plată</span>
            <Clock size={14} className="text-amber-600" />
          </div>
          <p className="text-base sm:text-lg font-black text-amber-900">{affiliate.pendingPayout}</p>
          <p className="text-[10px] font-bold text-amber-700 mt-0.5">Neachitat către IBAN</p>
        </div>

        {/* Paid Payout */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Plătit Deja</span>
            <CheckCircle2 size={14} className="text-emerald-500" />
          </div>
          <p className="text-base sm:text-lg font-black text-slate-900">{affiliate.paidPayout}</p>
          <p className="text-[10px] font-bold text-slate-400 mt-0.5">Transferat</p>
        </div>

        {/* Total Usages / Orders */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Comenzi</span>
            <ShoppingBag size={14} className="text-blue-500" />
          </div>
          <p className="text-base sm:text-lg font-black text-slate-900">{affiliate.usages}</p>
          <p className="text-[10px] font-bold text-slate-400 mt-0.5">Utilizări cod</p>
        </div>

        {/* Average Order Value (AOV) */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Coș Mediu</span>
            <Award size={14} className="text-purple-500" />
          </div>
          <p className="text-base sm:text-lg font-black text-slate-900">{affiliate.aov}</p>
          <p className="text-[10px] font-bold text-slate-400 mt-0.5">AOV pe comandă</p>
        </div>
      </div>

      {/* 💳 IBAN & PAYMENT DETAILS BOX */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#e32f8c]/10 text-[#008ba3] flex items-center justify-center shrink-0 font-bold">
              <CreditCard size={16} />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">Date Virament Bancar (IBAN)</h4>
              <p className="text-[11px] text-slate-500">Pentru plata comisioanelor în contul bancar al afiliatului</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {affiliate.paymentDetails?.iban ? (
              <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 size={11} /> IBAN Configurat
              </span>
            ) : (
              <span className="text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                Neconfigurat de afiliat
              </span>
            )}

            {/* Admin action: Record payout */}
            <button
              type="button"
              onClick={() => onRecordPayout(affiliate)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
              title="Înregistrează o plată de comision virată către acest afiliat"
            >
              <Banknote size={13} />
              <span>Înregistrează Plată</span>
            </button>
          </div>
        </div>

        {affiliate.paymentDetails?.iban ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 text-xs">
            <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-2">
              <div className="overflow-hidden min-w-0">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Cod IBAN</span>
                <span className="font-mono font-black text-slate-900 text-xs select-all truncate block">{affiliate.paymentDetails.iban}</span>
              </div>
              <button
                type="button"
                onClick={() => onCopy(affiliate.paymentDetails.iban, `iban-${affiliate.id}`, 'Cod IBAN')}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 shadow-2xs shrink-0 cursor-pointer"
              >
                {copiedKey === `iban-${affiliate.id}` ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                <span>{copiedKey === `iban-${affiliate.id}` ? 'Copiat' : 'Copiază'}</span>
              </button>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Bancă</span>
              <span className="font-bold text-slate-800 text-xs">{affiliate.paymentDetails.bankName || 'Nespecificată'}</span>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Titular Cont</span>
              <span className="font-bold text-slate-800 text-xs">{affiliate.paymentDetails.accountHolder || affiliate.name}</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-amber-800 bg-amber-50/60 p-3 rounded-xl border border-amber-100 mt-3">
            Afiliatul nu a completat încă un cont IBAN din panoul său. Când îl adaugă din portal, datele vor apărea automat aici.
          </p>
        )}
      </div>

      {/* 📱 SOCIAL MEDIA & MOTIVATION (Dacă există) */}
      {(affiliate.socialLinks?.links?.length > 0 || affiliate.socialLinks?.motivation) && (
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-2.5 text-xs">
          {affiliate.socialLinks?.links?.length > 0 && (
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">Social Media & Profiluri Promovare</span>
              <div className="flex flex-wrap gap-2">
                {affiliate.socialLinks.links.map((link: string, idx: number) => (
                  <a
                    key={idx}
                    href={link.startsWith('http') ? link : `https://${link}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 hover:bg-[#e32f8c]/10 text-slate-700 hover:text-[#008ba3] border border-slate-200 rounded-lg text-xs font-bold transition-colors"
                  >
                    <span>{link}</span>
                    <ExternalLink size={11} />
                  </a>
                ))}
              </div>
            </div>
          )}

          {affiliate.socialLinks?.motivation && (
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Mesaj la înscriere</span>
              <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 italic font-medium">
                "{affiliate.socialLinks.motivation}"
              </p>
            </div>
          )}
        </div>
      )}

      {/* 📦 ISTORIC COMENZI & PRODUSE (EXACT CA ÎN PORTALUL AFILIATULUI) */}
      <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 flex items-center gap-2">
              <ShoppingBag size={16} className="text-[#008ba3]" />
              <span>Istoric Comenzi Plasate ({ordersCount})</span>
            </h4>
            <p className="text-[11px] text-slate-500">
              Comenzile plasate de clienți cu codul <strong className="font-mono text-slate-800">{affiliate.code}</strong> și produsele cumpărate
            </p>
          </div>

          {ordersCount > 2 && (
            <div className="relative">
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Caută după produs sau ODIN..."
                className="w-full sm:w-56 bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#e32f8c]"
              />
              <Search size={12} className="text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}
        </div>

        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
            <ShoppingBag size={24} className="mx-auto text-slate-300 mb-2" />
            <p className="font-bold text-slate-700">Nicio comandă înregistrată încă cu codul {affiliate.code}.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Imediat ce un client plasează o comandă folosind acest cod sau linkul de afiliere, comanda și produsele vor apărea aici.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order: any, oIdx: number) => {
              const orderStatus = String(order.status || '').toLowerCase().trim();
              const isCancelled = ['cancelled', 'anulat', 'anulata'].includes(orderStatus);
              const isReturned = ['returned', 'returnat', 'returnata', 'neridicat', 'refused'].includes(orderStatus);
              const isRefunded = ['refunded', 'rambursat'].includes(orderStatus);
              const isNonCountable = isCancelled || isReturned || isRefunded || order.isCountable === false;

              return (
              <div key={order.id || oIdx} className={`border rounded-xl p-3.5 space-y-2.5 transition-all ${
                isNonCountable ? 'bg-slate-50/60 border-slate-200 opacity-90' : 'bg-slate-50/70 border-slate-200'
              }`}>
                
                {/* Order Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-slate-900">{order.orderNumber}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                      <Clock size={11} className="text-slate-400" />
                      {order.formattedDate || new Date(order.createdAt).toLocaleDateString('ro-RO')}
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                      order.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      order.status === 'shipped' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                      isCancelled ? 'bg-red-50 text-red-700 border-red-200' :
                      isReturned ? 'bg-orange-50 text-orange-700 border-orange-200' :
                      isRefunded ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {order.status === 'delivered' ? 'Livrat' : 
                       order.status === 'shipped' ? 'Expediat' : 
                       isCancelled ? 'Anulat' :
                       isReturned ? 'Returnat / Neridicat' : 
                       isRefunded ? 'Rambursat' : 
                       'În procesare'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Coș</span>
                      <span className={`text-xs font-black ${isNonCountable ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                        {order.totalAmount?.toFixed(2)} {order.currency || 'RON'}
                      </span>
                    </div>
                    <div className="text-right pl-2 border-l border-slate-200">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Comision Afiliat</span>
                      {isNonCountable || order.commissionAmount === 0 ? (
                        <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200/60 inline-block">
                          0.00 {order.currency || 'RON'} ({isCancelled ? 'Anulat' : 'Neridicat'})
                        </span>
                      ) : (
                        <span className="text-xs font-black text-emerald-700">
                          +{order.commissionAmount?.toFixed(2)} {order.currency || 'RON'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Customer Details Row */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5 px-2.5 bg-white rounded-lg border border-slate-200/90 text-xs">
                  <div className="flex items-center gap-1.5 font-black text-slate-900">
                    <User size={13} className="text-[#008ba3]" />
                    <span>{order.customerName || 'Client Anonim'}</span>
                  </div>
                  {order.customerEmail && (
                    <div className="flex items-center gap-1 text-slate-600">
                      <Mail size={12} className="text-slate-400" />
                      <a href={`mailto:${order.customerEmail}`} className="hover:underline hover:text-[#008ba3]">
                        {order.customerEmail}
                      </a>
                    </div>
                  )}
                  {order.customerPhone && (
                    <div className="flex items-center gap-1 text-slate-600 font-mono text-[11px]">
                      <Phone size={11} className="text-slate-400" />
                      <a href={`tel:${order.customerPhone}`} className="hover:underline hover:text-[#008ba3]">
                        {order.customerPhone}
                      </a>
                    </div>
                  )}
                  {order.customerCity && (
                    <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                      <MapPin size={11} className="text-slate-400" />
                      <span>{order.customerCity}</span>
                    </div>
                  )}
                </div>

                {/* Ordered Items List */}
                {order.items && order.items.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                    {order.items.map((it: any, itIdx: number) => (
                      <div key={itIdx} className="flex items-center gap-2.5 p-2 bg-white rounded-lg border border-slate-200/80 shadow-2xs">
                        {it.image ? (
                          <img src={getOptimizedImageUrl(it.image)} alt={it.name} className="w-9 h-9 object-cover rounded-md border border-slate-100 shrink-0 bg-slate-50" />
                        ) : (
                          <div className="w-9 h-9 rounded-md bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                            <Package size={14} />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 truncate">{it.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                            {it.variant && <span className="font-semibold text-slate-600 truncate">{it.variant}</span>}
                            <span className="font-bold text-slate-800">x{it.quantity}</span>
                            <span>({Number(it.price).toFixed(2)} RON)</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">Nu sunt disponibile detaliile produselor din această comandă.</p>
                )}
              </div>
            );
          })}
          </div>
        )}
      </div>

      {/* ⚙️ ADMINISTRATIVE ACTION BUTTONS */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {affiliate.status === 'pending' ? (
            <>
              <button
                type="button"
                onClick={() => onOpenApprove(affiliate)}
                disabled={processingId === affiliate.id}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 size={14} />
                <span>Aprobă Afiliat & Activează Cod</span>
              </button>
              <button
                type="button"
                onClick={() => onReject(affiliate.id)}
                disabled={processingId === affiliate.id}
                className="px-4 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                Respinge
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onOpenEdit(affiliate)}
                disabled={processingId === affiliate.id}
                className="px-4 py-2 bg-[#e32f8c] hover:bg-[#00bad9] text-slate-950 text-xs font-black rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Pencil size={13} />
                <span>Editează Cod & Comision</span>
              </button>

              {affiliate.status === 'active' ? (
                <button
                  type="button"
                  onClick={() => onSuspend(affiliate.id)}
                  disabled={processingId === affiliate.id}
                  className="px-3.5 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  Dezactivează Cod
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onActivate(affiliate.id)}
                  disabled={processingId === affiliate.id}
                  className="px-3.5 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  Reactivează Cod
                </button>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-800 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <X size={14} />
              <span>Închide</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onDelete(affiliate.id)}
            disabled={processingId === affiliate.id}
            className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            <Trash2 size={13} />
            <span>Șterge Afiliat</span>
          </button>
        </div>
      </div>

    </div>
  );
}

export default function AffiliatesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPortalAffiliateId, setSelectedPortalAffiliateId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState('all');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalSales: 0, totalCommissions: 0, activeCount: 0 });
  const [loading, setLoading] = useState(true);

  const selectedPortalAffiliate = useMemo(() => {
    return affiliates.find(a => a.id === selectedPortalAffiliateId) || null;
  }, [affiliates, selectedPortalAffiliateId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedPortalAffiliateId(null);
    };
    if (selectedPortalAffiliateId) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedPortalAffiliateId]);
  
  // Add modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAffiliate, setNewAffiliate] = useState({
    name: '',
    email: '',
    code: '',
    commission: 10,
    sendEmail: true
  });
  const [isCreating, setIsCreating] = useState(false);

  // Approve modal state
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [approvingData, setApprovingData] = useState<{
    id: string;
    name: string;
    email: string;
    code: string;
    commission: number;
  } | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingData, setEditingData] = useState<{
    id: string;
    name: string;
    email: string;
    code: string;
    commission: number;
  } | null>(null);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedIbanId, setCopiedIbanId] = useState<string | null>(null);

  const handleCopy = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`${label} copiat!`);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleCopyIban = (iban: string, id: string) => {
    navigator.clipboard.writeText(iban);
    setCopiedIbanId(id);
    toast.success('IBAN copiat în clipboard!');
    setTimeout(() => setCopiedIbanId(null), 2500);
  };

  // Payout recording state
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutAffiliate, setPayoutAffiliate] = useState<any | null>(null);
  const [payoutAmount, setPayoutAmount] = useState<string>('');
  const [isRecordingPayout, setIsRecordingPayout] = useState(false);

  const openPayoutModal = (affiliate: any) => {
    setPayoutAffiliate(affiliate);
    setPayoutAmount(String(affiliate.pendingPayoutRaw || affiliate.totalCommissionsRaw || '0'));
    setIsPayoutModalOpen(true);
  };

  const handleConfirmPayout = async () => {
    if (!payoutAffiliate) return;
    const amount = Number(payoutAmount);
    if (!amount || isNaN(amount) || amount <= 0) {
      toast.error('Te rugăm să introduci o sumă validă.');
      return;
    }

    setIsRecordingPayout(true);
    const res = await recordAffiliatePayoutAction(payoutAffiliate.id, amount);
    setIsRecordingPayout(false);

    if (res.success) {
      toast.success(`Plata de ${amount.toFixed(2)} RON către ${payoutAffiliate.name} a fost înregistrată!`);
      setIsPayoutModalOpen(false);
      setPayoutAffiliate(null);
      await fetchAffiliates();
    } else {
      toast.error(res.error || 'Eroare la înregistrarea plății.');
    }
  };

  const fetchAffiliates = async () => {
    try {
      const res = await fetch('/api/admin/data?action=affiliates');
      const json = await res.json();
      const data = json.data;
      setAffiliates(data.affiliates);
      setStats(data.stats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAffiliates();
  }, []);

  const openApproveModal = (affiliate: any) => {
    const cleanFirstName = (affiliate.name.split(' ')[0] || 'AFI')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 8);
    const defaultCode = affiliate.code && affiliate.code !== 'N/A' && affiliate.code !== 'null' ? affiliate.code : `${cleanFirstName}10`;
    setApprovingData({
      id: affiliate.id,
      name: affiliate.name,
      email: affiliate.email,
      code: defaultCode,
      commission: typeof affiliate.commissionRaw !== 'undefined' ? affiliate.commissionRaw : 10
    });
    setIsApproveModalOpen(true);
  };

  const openEditModal = (affiliate: any) => {
    setEditingData({
      id: affiliate.id,
      name: affiliate.name,
      email: affiliate.email,
      code: affiliate.code === 'N/A' ? '' : affiliate.code,
      commission: typeof affiliate.commissionRaw !== 'undefined' ? affiliate.commissionRaw : 10
    });
    setIsEditModalOpen(true);
  };

  const handleConfirmEdit = async () => {
    if (!editingData) return;
    if (!editingData.code) {
      toast.error('Te rugăm să introduci un cod de reducere.');
      return;
    }
    setProcessingId(editingData.id);
    const { updateAffiliate } = await import('@/app/actions/admin-affiliates');
    const res = await updateAffiliate(editingData.id, editingData.code, editingData.commission);
    if (res.success) {
      toast.success(`Datele afiliatului ${editingData.name} au fost actualizate!`);
      setIsEditModalOpen(false);
      setEditingData(null);
      await fetchAffiliates();
    } else {
      toast.error(res.error || 'Eroare la actualizare.');
    }
    setProcessingId(null);
  };

  const handleConfirmApprove = async () => {
    if (!approvingData) return;
    if (!approvingData.code) {
      toast.error('Te rugăm să introduci sau să selectezi un cod de reducere.');
      return;
    }
    setProcessingId(approvingData.id);
    const res = await approveAffiliate(approvingData.id, approvingData.code, approvingData.commission);
    if (res.success) {
      toast.success(`Afiliatul ${approvingData.name} a fost aprobat! Emailul a fost trimis la ${approvingData.email}.`);
      setIsApproveModalOpen(false);
      setApprovingData(null);
      await fetchAffiliates();
    } else {
      toast.error(res.error || 'Eroare la aprobare.');
    }
    setProcessingId(null);
  };

  const handleCreateAffiliate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAffiliate.name || !newAffiliate.email || !newAffiliate.code) {
      toast.error('Numele, email-ul și codul de reducere sunt obligatorii.');
      return;
    }
    setIsCreating(true);
    const res = await createAdminAffiliate(newAffiliate);
    if (res.success) {
      toast.success(`Afiliatul ${newAffiliate.name} a fost adăugat! Codul "${newAffiliate.code}" este activ.`);
      setIsAddModalOpen(false);
      setNewAffiliate({ name: '', email: '', code: '', commission: 10, sendEmail: true });
      await fetchAffiliates();
    } else {
      toast.error(res.error || 'Eroare la salvarea afiliatului.');
    }
    setIsCreating(false);
  };


  const handleReject = async (id: string) => {
    setProcessingId(id);
    const res = await rejectAffiliate(id);
    if (res.success) {
      toast.success('Cererea a fost respinsă.');
      await fetchAffiliates();
    } else {
      toast.error(res.error || 'Eroare la respingerea cererii.');
    }
    setProcessingId(null);
  };

  const handleSuspend = async (id: string) => {
    setProcessingId(id);
    const res = await suspendAffiliate(id);
    if (res.success) {
      toast.success('Afiliatul a fost suspendat.');
      await fetchAffiliates();
    } else {
      toast.error(res.error || 'Eroare la suspendare.');
    }
    setProcessingId(null);
  };

  const handleActivate = async (id: string) => {
    setProcessingId(id);
    const res = await activateAffiliate(id);
    if (res.success) {
      toast.success('Afiliatul a fost activat!');
      await fetchAffiliates();
    } else {
      toast.error(res.error || 'Eroare la activare.');
    }
    setProcessingId(null);
  };

  const handleDelete = async (id: string) => {
    setProcessingId(id);
    const res = await deleteAffiliate(id);
    if (res.success) {
      toast.success('Afiliatul a fost șters.');
      await fetchAffiliates();
    } else {
      toast.error(res.error || 'Eroare la ștergere.');
    }
    setProcessingId(null);
  };

  const filteredAffiliates = affiliates.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          a.code.toLowerCase().includes(searchQuery.toLowerCase());
                          
    let matchesFilter = true;
    if (filterType === 'active') matchesFilter = a.status === 'active';
    if (filterType === 'pending') matchesFilter = a.status === 'pending';
    if (filterType === 'suspended') matchesFilter = a.status === 'suspended';
    
    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.ceil(filteredAffiliates.length / itemsPerPage);
  const paginatedAffiliates = filteredAffiliates.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="animate-in fade-in zoom-in-95 duration-700 pb-12 text-slate-900 max-w-6xl mx-auto space-y-8">
      
      {/* 🏁 HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl tracking-tight font-bold text-slate-900">Program Afiliați</h1>
          <p className="text-sm text-slate-500 mt-1">Gestionează ambasadorii și comisionul generat de aceștia.</p>
        </div>
        <button 
          id="btn-add-affiliate"
          onClick={() => setIsAddModalOpen(true)} 
          className="h-10 px-4 bg-[#e32f8c] text-black rounded-lg text-[13px] font-bold hover:bg-[#c41a72] transition-all flex items-center gap-2 shadow-sm cursor-pointer"
        >
          <Plus size={16} /> Adaugă Afiliat
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-500">Vânzări totale Afiliați</h3>
            <TrendingUp size={16} className="text-[#e32f8c]" />
          </div>
          <p className="text-2xl font-black mt-2">{stats.totalSales.toLocaleString('ro-RO')} RON</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-500">Total Comisioane (de plată)</h3>
            <UserCheck size={16} className="text-[#e32f8c]" />
          </div>
          <p className="text-2xl font-black mt-2">{stats.totalCommissions.toLocaleString('ro-RO')} RON</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-500">Afiliați Activi</h3>
            <ArrowUpRight size={16} className="text-[#e32f8c]" />
          </div>
          <p className="text-2xl font-black mt-2">{stats.activeCount}</p>
        </div>
      </div>

      {/* 📋 AFFILIATES TABLE */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="relative w-full md:flex-1 md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Caută afiliat sau cod..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-[#e32f8c] transition-colors"
            />
          </div>
          <div className="relative w-full md:w-auto z-20">
            <button 
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              className={`w-full md:w-auto h-9 px-4 border rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 ${filterType !== 'all' ? "border-[#e32f8c] text-[#e32f8c] bg-[#e32f8c]/10" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
            >
              <Filter size={14} /> Filtrează
            </button>

            <AnimatePresence>
              {isFilterDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute top-full right-0 mt-2 w-56 bg-white border border-slate-100 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] p-2 z-50 flex flex-col gap-1"
                >
                  <button 
                    onClick={() => { setFilterType('all'); setIsFilterDropdownOpen(false); }}
                    className={`text-left px-3 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 ${filterType === 'all' ? 'bg-[#e32f8c]/10 text-[#e32f8c]' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    Toți afiliații
                  </button>
                  <button 
                    onClick={() => { setFilterType('active'); setIsFilterDropdownOpen(false); }}
                    className={`text-left px-3 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 ${filterType === 'active' ? 'bg-[#e32f8c]/10 text-[#e32f8c]' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    Activi
                  </button>
                  <button 
                    onClick={() => { setFilterType('pending'); setIsFilterDropdownOpen(false); }}
                    className={`text-left px-3 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 ${filterType === 'pending' ? 'bg-[#e32f8c]/10 text-[#e32f8c]' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                    În așteptare
                  </button>
                  <button 
                    onClick={() => { setFilterType('suspended'); setIsFilterDropdownOpen(false); }}
                    className={`text-left px-3 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 ${filterType === 'suspended' ? 'bg-[#e32f8c]/10 text-[#e32f8c]' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    Suspendați
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="md:hidden flex flex-col">
          {paginatedAffiliates.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm font-bold">Nu a fost găsit niciun afiliat.</div>
          ) : (
            paginatedAffiliates.map((affiliate) => (
              <div 
                key={affiliate.id} 
                onClick={() => setSelectedPortalAffiliateId(affiliate.id)}
                className="p-5 flex flex-col gap-3.5 bg-white border-b-[8px] border-slate-50 last:border-0 cursor-pointer active:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-900">{affiliate.name}</span>
                    <span className="text-[11px] font-bold text-slate-500">{affiliate.commission} Comision</span>
                  </div>
                  <div className="flex gap-2">
                    {affiliate.status === 'pending' && <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full bg-orange-100 text-orange-600">În așteptare</span>}
                    {affiliate.status === 'active' && <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full bg-green-100 text-green-600">Activ</span>}
                    {affiliate.status === 'suspended' && <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full bg-red-100 text-red-600">Suspendat</span>}
                    {affiliate.status === 'rejected' && <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full bg-slate-100 text-slate-500">Respins</span>}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Cod Reducere</span>
                    <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded text-xs font-mono font-bold text-slate-700 w-fit">
                      {affiliate.code}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Vânzări Aplicate</span>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-black text-slate-900 leading-none">{affiliate.totalSales}</span>
                      <span className="text-[10px] font-bold text-slate-400 mt-1">{affiliate.usages} utilizări</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs font-bold text-[#008ba3]">
                  <span className="flex items-center gap-1.5"><Eye size={14} /> Vezi Statistici & Portal</span>
                  <ArrowUpRight size={14} />
                </div>
              </div>
            ))
          )}
        </div>

        {/* 💻 DESKTOP VIEW (Table) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Afiliat</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cod Reducere</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Comision</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Vânzări Aplicate</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Statistici</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedAffiliates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 text-sm">Nu au fost găsiți afiliați.</td>
                </tr>
              ) : (
                paginatedAffiliates.map((affiliate) => (
                  <tr 
                    key={affiliate.id} 
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    onClick={() => setSelectedPortalAffiliateId(affiliate.id)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#e32f8c]/20 to-blue-500/20 flex items-center justify-center text-[#e32f8c] font-bold text-xs shrink-0">
                          {affiliate.name.charAt(0)}
                        </div>
                        <span className="text-sm font-bold text-slate-900 whitespace-nowrap">{affiliate.name}</span>
                        <span className="text-[10px] text-slate-400 hidden lg:inline">{affiliate.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-xs font-mono font-bold text-slate-700">
                        {affiliate.code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-slate-700">{affiliate.commission}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900">{affiliate.totalSales}</span>
                        <span className="text-xs text-slate-500">{affiliate.usages} utilizări</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        {affiliate.status === 'pending' && <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-orange-100 text-orange-600">În așteptare</span>}
                        {affiliate.status === 'active' && <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-green-100 text-green-600">Activ</span>}
                        {affiliate.status === 'suspended' && <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-red-100 text-red-600">Suspendat</span>}
                        {affiliate.status === 'rejected' && <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-slate-100 text-slate-500">Respins</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPortalAffiliateId(affiliate.id);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 group-hover:bg-[#e32f8c] text-slate-700 group-hover:text-black border border-slate-200 group-hover:border-[#e32f8c] text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
                      >
                        <Eye size={13} />
                        <span>Deschide Portal</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginare */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-sm text-slate-500">
              Pagina <span className="font-bold text-slate-900">{currentPage}</span> din <span className="font-bold text-slate-900">{totalPages}</span>
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                Înapoi
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                Înainte
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 🌟 AFFILIATE PORTAL MODAL (POPUP STATISTICI AVANSATE IDENTIC CU /affiliate/dashboard) */}
      {selectedPortalAffiliate && (
        <div className="fixed inset-0 z-[99999] flex items-start sm:items-center justify-center p-0 sm:p-6 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] animate-in fade-in duration-200 overflow-y-auto">
          <div 
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity -z-10"
            onClick={() => setSelectedPortalAffiliateId(null)} 
          />
          <div className="relative bg-slate-50 w-full sm:max-w-5xl h-full sm:h-auto sm:max-h-[92vh] rounded-none sm:rounded-3xl shadow-2xl border-0 sm:border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 my-auto sm:my-0">
            
            {/* Modal Top Header Bar */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-xs">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#e32f8c] to-blue-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-[#e32f8c]/20 shrink-0">
                  {selectedPortalAffiliate.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-lg font-black text-slate-900 leading-tight truncate">
                      {selectedPortalAffiliate.name}
                    </h2>
                    {selectedPortalAffiliate.status === 'active' && <span className="px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider rounded-full bg-green-100 text-green-700">Activ</span>}
                    {selectedPortalAffiliate.status === 'pending' && <span className="px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider rounded-full bg-orange-100 text-orange-700">În așteptare</span>}
                    {selectedPortalAffiliate.status === 'suspended' && <span className="px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider rounded-full bg-red-100 text-red-700">Suspendat</span>}
                    {selectedPortalAffiliate.status === 'rejected' && <span className="px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider rounded-full bg-slate-100 text-slate-600">Respins</span>}
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">{selectedPortalAffiliate.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="hidden sm:inline-block bg-[#e32f8c]/15 text-[#008ba3] border border-[#e32f8c]/30 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
                  Portal Statistici Afiliat
                </span>
                <button 
                  type="button"
                  onClick={() => setSelectedPortalAffiliateId(null)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 hover:text-slate-950 transition-colors cursor-pointer border border-slate-200 shadow-xs"
                  title="Închide fereastra"
                  aria-label="Închide fereastra"
                >
                  <X size={20} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body with Full Advanced Stats */}
            <div className="overflow-y-auto p-4 sm:p-6 space-y-6 flex-1 custom-scrollbar">
              <AffiliatePortalView
                affiliate={selectedPortalAffiliate}
                onOpenEdit={openEditModal}
                onOpenApprove={openApproveModal}
                onReject={handleReject}
                onSuspend={handleSuspend}
                onActivate={handleActivate}
                onDelete={(id) => {
                  handleDelete(id);
                  setSelectedPortalAffiliateId(null);
                }}
                onRecordPayout={openPayoutModal}
                processingId={processingId}
                copiedKey={copiedKey}
                onCopy={handleCopy}
                onClose={() => setSelectedPortalAffiliateId(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* 🧩 ADD AFFILIATE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100002] flex items-start sm:items-center justify-center p-3 sm:p-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] overflow-y-auto animate-in fade-in duration-200">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity -z-10" onClick={() => !isCreating && setIsAddModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden my-auto sm:my-0">
            <div className="p-4 sm:p-5 md:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-3xl sticky top-0 z-10">
              <div className="min-w-0 pr-2">
                <h2 className="text-base sm:text-xl font-black text-slate-900">Adaugă Afiliat Nou</h2>
                <p className="text-xs font-bold text-slate-500 mt-0.5">Configurează un nou ambasador și codul său de reducere.</p>
              </div>
              <button 
                type="button"
                onClick={() => setIsAddModalOpen(false)} 
                disabled={isCreating} 
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-200/70 hover:bg-slate-200 active:bg-slate-300 text-slate-700 hover:text-slate-950 transition-colors disabled:opacity-50 shrink-0 cursor-pointer border border-slate-300/50"
                title="Închide"
                aria-label="Închide"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>
            
            <form onSubmit={handleCreateAffiliate}>
              <div className="p-5 md:p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider">Nume Complet *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="ex: Andrei Popescu" 
                    value={newAffiliate.name}
                    onChange={(e) => setNewAffiliate(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#e32f8c] shadow-sm" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider">Adresă de Email *</label>
                  <input 
                    type="email" 
                    required 
                    placeholder="andrei@exemplu.ro" 
                    value={newAffiliate.email}
                    onChange={(e) => setNewAffiliate(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#e32f8c] shadow-sm" 
                  />
                </div>



                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider">Cod Reducere *</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="ex: ANDREI10" 
                      value={newAffiliate.code}
                      onChange={(e) => setNewAffiliate(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-[#e32f8c] shadow-sm uppercase" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider">Comision Afiliat (%)</label>
                    <CommissionDropdown 
                      value={newAffiliate.commission}
                      onChange={(v) => setNewAffiliate(prev => ({ ...prev, commission: v }))}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <div 
                    onClick={() => setNewAffiliate(prev => ({ ...prev, sendEmail: !prev.sendEmail }))}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all cursor-pointer select-none group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-[#e32f8c] flex items-center justify-center shrink-0 shadow-2xs">
                        <Mail size={15} />
                      </div>
                      <div>
                        <span className="text-xs font-black text-slate-900 block">Trimite email oficial cu datele de login și codul</span>
                        <span className="text-[10px] font-medium text-slate-500 block">Afiliatul primește automat codul și linkul de acces în portal</span>
                      </div>
                    </div>
                    
                    {/* Modern Toggle Switch */}
                    <div 
                      className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ml-3 ${
                        newAffiliate.sendEmail ? 'bg-[#e32f8c]' : 'bg-slate-300'
                      }`}
                    >
                      <div 
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 flex items-center justify-center ${
                          newAffiliate.sendEmail ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      >
                        {newAffiliate.sendEmail && <Check size={11} className="text-[#e32f8c] stroke-[3]" />}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 md:p-6 border-t border-slate-100 bg-slate-50/50 rounded-b-3xl">
                <button 
                  type="submit" 
                  disabled={isCreating}
                  className="w-full h-12 bg-[#e32f8c] text-black rounded-xl font-bold hover:bg-[#c41a72] transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {isCreating ? (
                    <><Loader2 size={18} className="animate-spin" /> Se salvează...</>
                  ) : (
                    <><Save size={18} /> Salvează Afiliat</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🚀 APPROVE AFFILIATE MODAL */}
      {isApproveModalOpen && approvingData && (
        <div className="fixed inset-0 z-[100002] flex items-start sm:items-center justify-center p-3 sm:p-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] overflow-y-auto animate-in fade-in duration-200">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity -z-10" onClick={() => !processingId && setIsApproveModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden my-auto sm:my-0">
            <div className="p-4 sm:p-5 md:p-6 border-b border-slate-100 flex items-center justify-between bg-emerald-50/60 rounded-t-3xl sticky top-0 z-10">
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={20} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-black text-slate-900 truncate">Aprobă Cerere de Afiliere</h2>
                  <p className="text-xs font-bold text-slate-500 truncate">{approvingData.name} ({approvingData.email})</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsApproveModalOpen(false)} 
                disabled={!!processingId} 
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-200/70 hover:bg-slate-200 active:bg-slate-300 text-slate-700 hover:text-slate-950 transition-colors disabled:opacity-50 shrink-0 cursor-pointer border border-slate-300/50"
                title="Închide"
                aria-label="Închide"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            <div className="p-5 md:p-6 space-y-4">
              <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900 leading-relaxed font-medium">
                La aprobare, codul de reducere va fi activat în baza de date, iar afiliatului i se va trimite automat un email oficial cu codul său și linkul de autentificare în dashboard.
              </div>



              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider">Cod Reducere Atribuit *</label>
                  <input 
                    type="text" 
                    required 
                    value={approvingData.code}
                    onChange={(e) => setApprovingData(prev => prev ? { ...prev, code: e.target.value.toUpperCase() } : null)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-[#e32f8c] shadow-sm uppercase" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider">Comision Afiliat (%)</label>
                  <CommissionDropdown 
                    value={approvingData.commission}
                    onChange={(v) => setApprovingData(prev => prev ? { ...prev, commission: v } : null)}
                  />
                </div>
              </div>
            </div>

            <div className="p-5 md:p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3 rounded-b-3xl">
              <button 
                type="button" 
                onClick={() => setIsApproveModalOpen(false)}
                disabled={!!processingId}
                className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
              >
                Anulează
              </button>
              <button 
                type="button" 
                onClick={handleConfirmApprove}
                disabled={!!processingId}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {processingId ? (
                  <><Loader2 size={16} className="animate-spin" /> Se aprobă...</>
                ) : (
                  <><Mail size={16} /> Aprobă & Trimite Email</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ✏️ EDIT AFFILIATE MODAL */}
      {isEditModalOpen && editingData && (
        <div className="fixed inset-0 z-[100002] flex items-start sm:items-center justify-center p-3 sm:p-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] overflow-y-auto animate-in fade-in duration-200">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity -z-10" onClick={() => !processingId && setIsEditModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden my-auto sm:my-0">
            <div className="p-4 sm:p-5 md:p-6 border-b border-slate-100 flex items-center justify-between bg-blue-50/60 rounded-t-3xl sticky top-0 z-10">
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <Ticket size={20} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-black text-slate-900 truncate">Editează Date Afiliat</h2>
                  <p className="text-xs font-bold text-slate-500 truncate">{editingData.name} ({editingData.email})</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsEditModalOpen(false)} 
                disabled={!!processingId} 
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-200/70 hover:bg-slate-200 active:bg-slate-300 text-slate-700 hover:text-slate-950 transition-colors disabled:opacity-50 shrink-0 cursor-pointer border border-slate-300/50"
                title="Închide"
                aria-label="Închide"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            <div className="p-5 md:p-6 space-y-4">
              <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-900 leading-relaxed font-medium">
                Dacă modifici codul de reducere sau comisionul, afiliatul va fi notificat automat pe email, iar cuponul nou va fi activat.
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider">Cod Reducere *</label>
                  <input 
                    type="text" 
                    required 
                    value={editingData.code}
                    onChange={(e) => setEditingData(prev => prev ? { ...prev, code: e.target.value.toUpperCase() } : null)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-[#e32f8c] shadow-sm uppercase" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider">Comision (%)</label>
                  <CommissionDropdown 
                    value={editingData.commission}
                    onChange={(v) => setEditingData(prev => prev ? { ...prev, commission: v } : null)}
                  />
                </div>
              </div>
            </div>

            <div className="p-5 md:p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3 rounded-b-3xl">
              <button 
                type="button" 
                onClick={() => setIsEditModalOpen(false)}
                disabled={!!processingId}
                className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
              >
                Anulează
              </button>
              <button 
                type="button" 
                onClick={handleConfirmEdit}
                disabled={!!processingId}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {processingId ? (
                  <><Loader2 size={16} className="animate-spin" /> Se salvează...</>
                ) : (
                  <><Save size={16} /> Salvează & Anunță Afiliat</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 💵 RECORD PAYOUT MODAL */}
      {isPayoutModalOpen && payoutAffiliate && (
        <div className="fixed inset-0 z-[100002] flex items-start sm:items-center justify-center p-3 sm:p-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] overflow-y-auto animate-in fade-in duration-200">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity -z-10" onClick={() => !isRecordingPayout && setIsPayoutModalOpen(false)} />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden my-auto sm:my-0">
            <div className="p-4 sm:p-5 md:p-6 border-b border-slate-100 flex items-center justify-between bg-emerald-50/60 rounded-t-3xl sticky top-0 z-10">
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <Banknote size={20} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-black text-slate-900 truncate">Înregistrează Plată Comision</h2>
                  <p className="text-xs font-bold text-slate-500 truncate">{payoutAffiliate.name}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsPayoutModalOpen(false)} 
                disabled={isRecordingPayout} 
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-200/70 hover:bg-slate-200 active:bg-slate-300 text-slate-700 hover:text-slate-950 transition-colors disabled:opacity-50 shrink-0 cursor-pointer border border-slate-300/50"
                title="Închide"
                aria-label="Închide"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            <div className="p-5 md:p-6 space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <p><span className="font-bold text-slate-500">Cont IBAN:</span> <span className="font-mono font-bold text-slate-900">{payoutAffiliate.paymentDetails?.iban || 'Necompletat'}</span></p>
                <p><span className="font-bold text-slate-500">Balanță de plată actuală:</span> <span className="font-black text-amber-800">{payoutAffiliate.pendingPayout}</span></p>
                <p><span className="font-bold text-slate-500">Plătit anterior:</span> <span className="font-bold text-slate-700">{payoutAffiliate.paidPayout}</span></p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider">Suma Virată (RON) *</label>
                <input 
                  type="number" 
                  step="0.01"
                  required 
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  placeholder="ex: 150.00"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-900 focus:outline-none focus:border-[#e32f8c] shadow-sm" 
                />
              </div>
            </div>

            <div className="p-5 md:p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3 rounded-b-3xl">
              <button 
                type="button" 
                onClick={() => setIsPayoutModalOpen(false)}
                disabled={isRecordingPayout}
                className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
              >
                Anulează
              </button>
              <button 
                type="button" 
                onClick={handleConfirmPayout}
                disabled={isRecordingPayout}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isRecordingPayout ? (
                  <><Loader2 size={16} className="animate-spin" /> Se înregistrează...</>
                ) : (
                  <><CheckCircle2 size={16} /> Confirmă Plata</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
