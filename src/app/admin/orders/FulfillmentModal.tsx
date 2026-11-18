"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  X,
  Mail,
  Send,
  Check,
  Loader2,
  Clock,
  FileText,
  Truck,
  History,
  Eye,
  Calendar,
  Layers,
  ExternalLink,
  ShieldCheck,
  Package,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  getFulfillmentSettings,
  updateFulfillmentSettings,
  getFulfillmentHistory,
  dispatchOrdersToFulfillment,
  getFulfillmentQueueOverview,
  generateFulfillmentCsv,
  type FulfillmentQueueOverview
} from '@/app/actions/admin-fulfillment';
import {
  FulfillmentSettings,
  FulfillmentDispatchLog,
  FulfillmentOrderSummary,
  formatRomaniaDateTime,
  getFulfillmentScheduleInfo
} from '@/types/fulfillment';
import { FulfillmentReportView } from '@/components/admin/FulfillmentReportView';

interface FulfillmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsUpdated?: (settings: FulfillmentSettings) => void;
  onDispatched?: () => void;
  totalOrdersCount: number;
}

export function FulfillmentModal({
  isOpen,
  onClose,
  onSettingsUpdated,
  onDispatched,
  totalOrdersCount
}: FulfillmentModalProps) {
  const [activeTab, setActiveTab] = useState<'config' | 'template' | 'history'>('config');
  
  // Settings state
  const [settings, setSettings] = useState<FulfillmentSettings>({
    email: '',
    secondary_email: '',
    manual_shipping_enabled: false,
    auto_dispatch_enabled: true,
    auto_dispatch_time: '08:00',
    last_dispatched_at: null,
    notes: ''
  });
  const [emailInput, setEmailInput] = useState('');
  const [secondaryEmailInput, setSecondaryEmailInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Dispatch state
  const [dispatching, setDispatching] = useState(false);
  const [dispatchNotes, setDispatchNotes] = useState('');

  // History state
  const [history, setHistory] = useState<FulfillmentDispatchLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [now, setNow] = useState<Date>(() => new Date());

  // Queue & preview state
  const [queueOverview, setQueueOverview] = useState<FulfillmentQueueOverview>({
    pendingOrders: [],
    blockedOrders: [],
    templatePreviewOrders: [],
    isSamplePreview: false,
    isHistoricalPreview: false,
    excludedPreorders: 0,
    excludedMixedPreorders: 0,
    excludedLiveOutOfStock: 0,
    excludedPhantomOrInvalid: 0,
    skippedPreorderOrderIds: [],
    excludedDigital: 0,
    excludedAlreadyDispatched: 0,
    excludedUnpaidOrInvalid: 0,
  });
  const [loadingPreview, setLoadingPreview] = useState(false);

  const previewOrders = queueOverview.templatePreviewOrders;
  const pendingOrders = queueOverview.pendingOrders;

  const refreshQueueOverview = async () => {
    setLoadingPreview(true);
    try {
      const overview = await getFulfillmentQueueOverview();
      setQueueOverview(overview);
    } catch (err) {
      console.error('Error loading fulfillment queue overview:', err);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Load initial settings
  const loadData = async () => {
    setLoading(true);
    try {
      const s = await getFulfillmentSettings();
      setSettings(s);
      setEmailInput(s.email || '');
      setSecondaryEmailInput(s.secondary_email || '');
      setNotesInput(s.notes || '');
      if (onSettingsUpdated) onSettingsUpdated(s);
    } catch (err) {
      console.error('Error loading fulfillment settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setNow(new Date());
      const timer = setInterval(() => setNow(new Date()), 30_000);
      return () => clearInterval(timer);
    }
  }, [isOpen]);

  const scheduleInfo = useMemo(
    () =>
      getFulfillmentScheduleInfo({
        now,
        lastDispatchedAt: settings.last_dispatched_at,
        autoDispatchEnabled: settings.auto_dispatch_enabled,
      }),
    [now, settings.last_dispatched_at, settings.auto_dispatch_enabled]
  );

  // Load tab-specific data
  useEffect(() => {
    if (!isOpen) return;

    if (activeTab === 'history') {
      setLoadingHistory(true);
      getFulfillmentHistory()
        .then(data => setHistory(data))
        .catch(err => console.error(err))
        .finally(() => setLoadingHistory(false));
    }

    if (activeTab === 'template' || activeTab === 'config') {
      refreshQueueOverview();
    }
  }, [activeTab, isOpen]);

  // Save email and general fulfillment settings
  const handleSaveSettings = async () => {
    if (!emailInput.trim()) {
      toast.error('Introdu o adresă de email validă pentru depozit.');
      return;
    }
    setSavingSettings(true);
    try {
      const res = await updateFulfillmentSettings({
        email: emailInput.trim(),
        secondary_email: secondaryEmailInput.trim(),
        notes: notesInput.trim(),
        auto_dispatch_enabled: settings.auto_dispatch_enabled,
        manual_shipping_enabled: settings.manual_shipping_enabled
      });
      if (res.success) {
        setSettings(res.settings);
        if (onSettingsUpdated) onSettingsUpdated(res.settings);
        toast.success('Adresele de email și setările de fulfillment au fost salvate!');
      }
    } catch (err: any) {
      toast.error('Eroare la salvare: ' + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  // Toggle manual shipping directly from modal
  const handleToggleManualShipping = async () => {
    const nextVal = !settings.manual_shipping_enabled;
    const updated = { ...settings, manual_shipping_enabled: nextVal };
    setSettings(updated);
    if (onSettingsUpdated) onSettingsUpdated(updated);

    try {
      await updateFulfillmentSettings({ manual_shipping_enabled: nextVal });
      toast.success(nextVal ? 'Expedierea manuală a fost activată!' : 'Expedierea manuală a fost dezactivată!');
    } catch (err: any) {
      setSettings(settings);
      if (onSettingsUpdated) onSettingsUpdated(settings);
      toast.error('Eroare la salvare: ' + err.message);
    }
  };

  // Toggle auto-dispatch
  const handleToggleAutoDispatch = async () => {
    const nextVal = !settings.auto_dispatch_enabled;
    const updated = { ...settings, auto_dispatch_enabled: nextVal };
    setSettings(updated);
    if (onSettingsUpdated) onSettingsUpdated(updated);

    try {
      await updateFulfillmentSettings({ auto_dispatch_enabled: nextVal });
      toast.success(
        nextVal
          ? `Trimiterea automată la ora ${scheduleInfo.todayTimeRo} (ora României) a fost activată!`
          : 'Trimiterea automată a fost dezactivată.'
      );
    } catch (err: any) {
      setSettings(settings);
      toast.error('Eroare la salvare: ' + err.message);
    }
  };

  // Download CSV file directly
  const handleDownloadCsv = async (mode: 'pending' | 'preview' = 'pending') => {
    try {
      const overview = pendingOrders.length > 0 ? queueOverview : await getFulfillmentQueueOverview();
      const ordersToExport = mode === 'preview'
        ? overview.templatePreviewOrders
        : overview.pendingOrders;

      if (ordersToExport.length === 0) {
        toast.error('Nu există comenzi eligibile în așteptare pentru export CSV.');
        return;
      }
      const csvData = await generateFulfillmentCsv(ordersToExport);
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `comenzi_fulfillment_trenzone_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Fișierul CSV a fost descărcat!');
    } catch (err: any) {
      toast.error('Eroare la descărcare CSV: ' + err.message);
    }
  };

  // Immediate dispatch action
  const handleTriggerDispatchNow = async () => {
    if (!settings.email || !settings.email.trim()) {
      toast.error('Configurează mai întâi adresa de email a centrului de fulfillment.');
      return;
    }

    setDispatching(true);
    const toastId = toast.loading('Se generează și se transmite emailul cu fișierul CSV atașat...');
    try {
      const res = await dispatchOrdersToFulfillment({
        trigger: 'manual',
        notes: dispatchNotes.trim() || undefined
      });

      if (res.success) {
        if ((res.count || 0) === 0) {
          toast.success(res.message || 'Nu există comenzi noi de expediat.', { id: toastId, duration: 5000 });
        } else {
          const preorderSuffix = res.excludedPreorders && res.excludedPreorders > 0
            ? ` (${res.excludedPreorders} precomenzi active reținute)`
            : '';
          toast.success(
            `${res.count} comenzi au fost transmise către ${res.recipient}${res.secondaryRecipient ? ` (CC: ${res.secondaryRecipient})` : ''}${preorderSuffix}!`,
            {
              id: toastId,
              duration: 5000
            }
          );
          if (res.reconciliationWarning) {
            toast.error(res.reconciliationWarning, { duration: 9000 });
          }
          setSettings(prev => ({ ...prev, last_dispatched_at: res.sentAt || new Date().toISOString() }));
          setDispatchNotes('');
          getFulfillmentHistory().then(setHistory);
          if (onDispatched) onDispatched();
        }
        refreshQueueOverview();
      } else {
        toast.error(`Eroare: ${res.error || 'Trimitere eșuată'}`, { id: toastId });
      }
    } catch (err: any) {
      toast.error(`Eroare la trimitere: ${err.message || err}`, { id: toastId });
    } finally {
      setDispatching(false);
    }
  };

  if (!isOpen) return null;

  // Group preview orders by country: Romania vs International
  const isRo = (country?: string) => {
    const c = (country || 'RO').trim().toUpperCase();
    return c === 'RO' || c === 'ROMANIA' || c === 'ROMÂNIA';
  };

  // Dynamic high-clarity subject line computation
  const computeSubject = (orders: FulfillmentOrderSummary[], trigger: 'manual' | 'scheduled_8am' = 'scheduled_8am') => {
    const count = orders.length;
    const totalItems = orders.reduce((sum, o) => sum + (o.items || []).reduce((s, i) => s + (Number(i.quantity) || 1), 0), 0);
    const roCount = orders.filter(o => isRo(o.country)).length;
    const intCount = count - roCount;

    const dateObj = new Date();
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    const dateStr = `${day}.${month}.${year}`;

    const triggerLabel = trigger === 'scheduled_8am' ? `${scheduleInfo.todayTimeRo} RO` : 'Manual';
    let countryPart = '';
    if (roCount > 0 && intCount > 0) {
      countryPart = ` • ${roCount} RO · ${intCount} INT`;
    } else if (intCount > 0) {
      countryPart = ` • ${intCount} Internațional`;
    } else if (roCount > 0) {
      countryPart = ` • România`;
    }

    const orderWord = count === 1 ? 'comandă' : 'comenzi';
    const itemWord = totalItems === 1 ? 'articol' : 'articole';

    return `[TrenZone] Comenzi de Expediat — ${dateStr} • ${count} ${orderWord} (${totalItems} ${itemWord})${countryPart} [${triggerLabel}]`;
  };

  const roOrders = previewOrders.filter(o => isRo(o.country));
  const intlOrders = previewOrders.filter(o => !isRo(o.country));

  // Compute picking summary
  const pickingMap = new Map<string, { name: string; variant?: string; quantity: number; image?: string; sku?: string }>();
  for (const o of previewOrders) {
    for (const item of (o.items || [])) {
      const key = `${item.name}__${item.variant || ''}`;
      const qty = Number(item.quantity) || 1;
      if (pickingMap.has(key)) {
        pickingMap.get(key)!.quantity += qty;
      } else {
        pickingMap.set(key, {
          name: item.name,
          variant: item.variant,
          quantity: qty,
          image: item.image,
          sku: item.sku
        });
      }
    }
  }
  const pickingList = Array.from(pickingMap.values()).sort((a, b) => b.quantity - a.quantity);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Dialog Box */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90dvh] flex flex-col overflow-hidden border border-slate-200 z-10"
      >
        {/* LIGHT CLEAN MODAL HEADER (NO BLACK) */}
        <div className="p-4 sm:p-5 bg-white text-slate-900 flex items-center justify-between border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#e32f8c]/10 border border-[#e32f8c]/20 text-[#008ba3] flex items-center justify-center shrink-0">
              <Truck size={22} className="text-[#008ba3]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 truncate">
                  Centru Fulfillment & Ambalare
                </h2>
                {settings.manual_shipping_enabled && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
                    Expediere Manuală Activă
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium truncate">
                Configurare email depozit, grupare pe țări, template ambalare și export CSV
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/admin/fulfillment"
              onClick={onClose}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-2xs"
              title="Deschide pagina dedicată Raport Zilnic Fulfillment"
            >
              <ExternalLink size={13} className="text-[#008ba3]" />
              <span>Raport Zilnic</span>
            </Link>

            <button
              onClick={() => handleDownloadCsv('pending')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs"
              title="Descarcă tabelul comenzilor eligibile în așteptare în format CSV pentru Excel"
            >
              <Download size={13} className="text-emerald-600" />
              <span>Descarcă CSV ({pendingOrders.length})</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
              title="Închide"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="px-4 sm:px-6 pt-3 bg-slate-50/80 border-b border-slate-200 flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('config')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'config'
                ? 'border-[#e32f8c] text-slate-950 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Truck size={15} className={activeTab === 'config' ? 'text-[#e32f8c]' : ''} />
            <span>Configurare & Expediere</span>
          </button>

          <button
            onClick={() => setActiveTab('template')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'template'
                ? 'border-[#e32f8c] text-slate-950 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Eye size={15} className={activeTab === 'template' ? 'text-[#e32f8c]' : ''} />
            <span>Previzualizare Template Email</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'history'
                ? 'border-[#e32f8c] text-slate-950 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History size={15} className={activeTab === 'history' ? 'text-[#e32f8c]' : ''} />
            <span>Raport Zilnic & Istoric</span>
            {history.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-full font-bold">
                {history.length}
              </span>
            )}
          </button>
        </div>

        {/* TAB CONTENT (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar bg-slate-50/40">
          
          {/* TAB 1: CONFIGURARE & EXPEDIERE IMEDIATĂ */}
          {activeTab === 'config' && (
            <div className="space-y-4 animate-in fade-in duration-200">

              {/* Operational Queue Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-white border border-emerald-200 rounded-2xl p-3 shadow-2xs min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700 truncate">Eligibile (În Stoc Curent)</div>
                  <div className="text-lg font-black text-emerald-700 mt-0.5">{pendingOrders.length}</div>
                </div>
                <div className="bg-white border border-amber-200 rounded-2xl p-3 shadow-2xs min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-wider text-amber-800 truncate">Blocate (Precomandă / Stoc)</div>
                  <div className="text-lg font-black text-amber-700 mt-0.5">{queueOverview.blockedOrders.length}</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 truncate">Deja Trimise</div>
                  <div className="text-lg font-black text-indigo-700 mt-0.5">{queueOverview.excludedAlreadyDispatched}</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 truncate">Excluse (Anul./AWB/Dig.)</div>
                  <div className="text-lg font-black text-slate-600 mt-0.5">
                    {queueOverview.excludedUnpaidOrInvalid + queueOverview.excludedDigital}
                  </div>
                </div>
              </div>

              {queueOverview.liveProductsError && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-xs text-red-900 font-bold">
                  Eroare verificare stoc live din catalog: {queueOverview.liveProductsError}. Trimiterea către fulfillment este blocată preventiv.
                </div>
              )}

              {/* Live Queue Breakdown: Eligible (In Stock) vs Held/Blocked (Preorder / Out of Stock) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* Eligible Orders (Live In Stock) */}
                <div className="bg-white border border-emerald-200 rounded-2xl p-3.5 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                      <Check size={14} className="text-emerald-600" />
                      Eligibile (În stoc curent)
                    </span>
                    <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                      {pendingOrders.length} {pendingOrders.length === 1 ? 'comandă' : 'comenzi'}
                    </span>
                  </div>
                  {loadingPreview ? (
                    <div className="text-[11px] text-slate-400 py-2">Se verifică stocul live...</div>
                  ) : pendingOrders.length === 0 ? (
                    <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                      Nicio comandă eligibilă cu toate produsele fizice în stoc curent.
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {pendingOrders.map((o) => (
                        <div key={o.supabaseId || o.id} className="p-2 rounded-xl bg-emerald-50/50 border border-emerald-100 text-[11px] space-y-0.5">
                          <div className="flex items-center justify-between gap-2 font-black text-slate-900">
                            <span>{o.id} · {o.customer}</span>
                            <span className="text-[10px] text-emerald-800 shrink-0">{o.city}, {o.country}</span>
                          </div>
                          <div className="text-slate-700 font-medium">
                            {o.items.map((it) => `${it.quantity}x ${it.name}${it.variant ? ` (${it.variant})` : ''}`).join(', ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Blocked / Held Orders (Preorder / Out of Stock / Invalid) */}
                <div className="bg-white border border-amber-200 rounded-2xl p-3.5 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                      <Clock size={14} className="text-amber-600" />
                      Reținute / Blocate (Precomandă / Stoc)
                    </span>
                    <span className="text-[10px] font-black bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                      {queueOverview.blockedOrders.length} {queueOverview.blockedOrders.length === 1 ? 'blocată' : 'blocate'}
                    </span>
                  </div>
                  {loadingPreview ? (
                    <div className="text-[11px] text-slate-400 py-2">Se verifică stocul live...</div>
                  ) : queueOverview.blockedOrders.length === 0 ? (
                    <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                      Nicio comandă blocată de lipsă stoc sau precomandă.
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {queueOverview.blockedOrders.map((bo) => (
                        <div key={bo.supabaseId || bo.id} className="p-2 rounded-xl bg-amber-50/70 border border-amber-200 text-[11px] space-y-1">
                          <div className="flex items-center justify-between gap-2 font-black text-slate-900">
                            <span>{bo.id} · {bo.customer}</span>
                            <span className="text-[10px] text-slate-600 shrink-0">{bo.city}, {bo.country}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {bo.blockedItems.map((bi, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1 text-[10px] font-bold bg-white text-amber-950 border border-amber-300 px-1.5 py-0.5 rounded-md">
                                <span>{bi.productName}{bi.variant ? ` (${bi.variant})` : ''}</span>
                                <span className="text-amber-700">· {bi.reasonLabel}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] text-amber-900/80 leading-snug">
                    Rămân blocate automat (cron & manual) până când pui manual produsele pe <strong>În stoc</strong> în <code>/admin/products</code>.
                  </p>
                </div>
              </div>

              {/* Exact Romania Time Auto-Dispatch Status Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                    scheduleInfo.autoDispatchEnabled
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    <Clock size={16} />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-black text-slate-900">
                        Program automat: ora {scheduleInfo.todayTimeRo} (ora României)
                      </span>
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.2 rounded">
                        06:00 UTC · {scheduleInfo.timezoneOffsetLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Următorul dispatch: <strong className="text-slate-900">{scheduleInfo.nextDayLabelRo}, {scheduleInfo.nextTimeRo}</strong> ({scheduleInfo.countdownLabel}) · {scheduleInfo.todayBatchStatusLabel}
                    </p>
                  </div>
                </div>
                <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border self-start sm:self-center shrink-0 ${
                  scheduleInfo.todayBatchRan
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : scheduleInfo.autoDispatchEnabled
                      ? 'bg-sky-50 text-sky-800 border-sky-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}>
                  {scheduleInfo.todayBatchRan ? 'Lot trimis azi' : scheduleInfo.autoDispatchEnabled ? 'Programat' : 'Oprit'}
                </span>
              </div>

              {/* Explicit Preorder Hold Notice */}
              {queueOverview.excludedPreorders > 0 && (
                <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-violet-950 shadow-2xs">
                  <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock size={17} />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className="text-xs font-black uppercase tracking-wider text-violet-950">
                        Protecție Precomenzi Activă
                      </strong>
                      <span className="text-[10px] font-black bg-violet-200/80 text-violet-900 px-2 py-0.5 rounded-full">
                        {queueOverview.excludedPreorders} {queueOverview.excludedPreorders === 1 ? 'comandă reținută' : 'comenzi reținute'}
                      </span>
                      {queueOverview.excludedMixedPreorders > 0 && (
                        <span className="text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
                          {queueOverview.excludedMixedPreorders} mixte (stoc + precomandă)
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-violet-900/90 leading-relaxed">
                      Precomenzile active (inclusiv comenzile mixte cu produse în stoc + precomandă) sunt excluse automat de la expedierea către depozit până când sunt eliberate manual după sosirea stocului.
                    </p>
                    {queueOverview.skippedPreorderOrderIds.length > 0 && (
                      <p className="text-[11px] font-mono text-violet-800 pt-0.5">
                        Reținute: {queueOverview.skippedPreorderOrderIds.slice(0, 8).join(', ')}
                        {queueOverview.skippedPreorderOrderIds.length > 8 ? ` (+${queueOverview.skippedPreorderOrderIds.length - 8})` : ''}
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Status Alert for Manual Shipping */}
              <div className={`p-4 rounded-2xl border transition-all ${
                settings.manual_shipping_enabled
                  ? 'bg-amber-500/10 border-amber-300 text-amber-950'
                  : 'bg-white border-slate-200 text-slate-800'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${settings.manual_shipping_enabled ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`} />
                      <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider">
                        {settings.manual_shipping_enabled ? 'Mod Expediere Manuală: ACTIVAT' : 'Mod Expediere Manuală: DEZACTIVAT'}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {settings.manual_shipping_enabled
                        ? 'Comenzile sunt preluate și ambalate de partenerul extern de fulfillment. Butoanele de generare și resetare AWB din pagina de Comenzi sunt blocate.'
                        : 'Comenzile pot fi expediate direct prin integrările automate Sameday / Packeta sau transmise către fulfillment prin email zilnic.'
                      }
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleManualShipping}
                    disabled={loading}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer shrink-0 ${
                      settings.manual_shipping_enabled
                        ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200'
                        : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-200'
                    }`}
                  >
                    {settings.manual_shipping_enabled ? 'Dezactivează Mod Manual' : 'Activează Mod Manual'}
                  </button>
                </div>
              </div>

              {/* Email Configuration Card */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail size={16} className="text-[#008ba3]" />
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                      Configurare Destinații Email & Copie Verificare
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Primary Fulfillment Center Email */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Truck size={13} className="text-[#008ba3]" />
                        <span>Adresă Centru de Ambalare (Depozit)</span>
                      </label>
                      <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                        Obligatoriu
                      </span>
                    </div>
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="ex: depozit@fulfillment.ro sau office@depozit.ro"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-[#e32f8c] focus:bg-white transition-all"
                    />
                    <p className="text-[11px] text-slate-400 leading-tight">
                      Primește lista de comenzi și fișierul CSV atașat pentru pregătirea și expedierea coletelor.
                    </p>
                  </div>

                  {/* Secondary Verification Email (CC) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <ShieldCheck size={13} className="text-indigo-600" />
                        <span>Adresă Secundară (Verificare Admin - CC)</span>
                      </label>
                      <span className="text-[10px] font-black uppercase text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                        Opțional
                      </span>
                    </div>
                    <input
                      type="email"
                      value={secondaryEmailInput}
                      onChange={(e) => setSecondaryEmailInput(e.target.value)}
                      placeholder="ex: admin@trenzone.fit sau control@..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-[#e32f8c] focus:bg-white transition-all"
                    />
                    <p className="text-[11px] text-slate-400 leading-tight">
                      O copie exactă (CC) va fi expediată la această adresă pentru monitorizare, verificare și control.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="text-[11px] text-slate-500">
                    {settings.secondary_email ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <Check size={12} className="text-emerald-600" />
                        Copie de verificare activă către: <strong className="text-slate-800">{settings.secondary_email}</strong>
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">
                        Nicio adresă secundară configurată (emailul se trimite exclusiv la depozit).
                      </span>
                    )}
                  </div>

                  <button
                    onClick={handleSaveSettings}
                    disabled={savingSettings}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm shrink-0"
                  >
                    {savingSettings ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} className="text-[#e32f8c]" />}
                    <span>Salvează Adrese Email</span>
                  </button>
                </div>

                {/* Auto-Dispatch Toggle */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-slate-500" />
                      <span className="text-xs font-black text-slate-800">
                        Trimitere Automată Zilnică (Ora {scheduleInfo.todayTimeRo} România)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      În fiecare dimineață la 06:00 UTC ({scheduleInfo.todayTimeRo} în {scheduleInfo.timezoneOffsetLabel}, Europe/Bucharest), comenzile fizice noi sunt transmise automat cu fișier CSV atașat.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleAutoDispatch}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer shrink-0 ${
                      settings.auto_dispatch_enabled ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-xs ${
                        settings.auto_dispatch_enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* LIVE EMAIL SUBJECT CARD */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Mail size={15} className="text-[#e32f8c]" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Format Subiect Email în Inbox (Claritate Maximă Depozit & Notificări)
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-slate-200">
                    Generat Dinamic
                  </span>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-inner text-xs font-mono font-bold text-slate-900 break-all select-all flex items-center justify-between gap-2">
                  <span>{computeSubject(pendingOrders.length > 0 ? pendingOrders : previewOrders, settings.auto_dispatch_enabled ? 'scheduled_8am' : 'manual')}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 font-bold">
                  <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-700">
                    <Calendar size={11} className="text-slate-500" /> Dată Calendaristică
                  </span>
                  <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-700">
                    <Package size={11} className="text-slate-500" /> Nr. Comenzi & Bucăți
                  </span>
                  <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-700">
                    <span>RO/INT</span> Împărțire Țară (Sameday vs Packeta)
                  </span>
                  <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-700">
                    <Clock size={11} className="text-slate-500" /> Marcaj Orar ({scheduleInfo.todayTimeRo} RO / Manual)
                  </span>
                  <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-700">
                    <FileSpreadsheet size={11} className="text-slate-500" /> Fișier CSV Atașat
                  </span>
                </div>
              </div>

              {/* ANTI-DUPLICATE PROTECTION NOTICE */}
              <div className="bg-indigo-50/70 border border-indigo-200/90 rounded-2xl p-4 flex items-start gap-3 text-xs text-indigo-950 shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck size={18} />
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <strong className="text-xs font-black uppercase tracking-wider text-indigo-950">
                      Protecție Anti-Duplicate Activată
                    </strong>
                    <span className="text-[10px] font-black bg-indigo-200/80 text-indigo-900 px-2 py-0.5 rounded-full">
                      Zero Riscuri de Dublare
                    </span>
                  </div>
                  <p className="text-[11px] text-indigo-900/90 leading-relaxed">
                    Fiecare comandă transmisă către depozit este marcată automat în sistem cu data, ora și ID-ul lotului (cu blocare concurență între cron și manual). Comenzile deja transmise, cele digitale, neachitate sau cu AWB sunt excluse automat și semnalizate în tabel cu eticheta <strong className="text-indigo-950 bg-white/70 px-1.5 py-0.5 rounded border border-indigo-200">TRIMIS FULFILLMENT</strong>.
                  </p>
                </div>
              </div>

              {/* IMMEDIATE DISPATCH & CSV EXPORT BOX */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Send size={16} className="text-[#e32f8c]" />
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                      Trimitere Imediată & Descărcare Fișier CSV
                    </h3>
                  </div>

                  {settings.last_dispatched_at && (
                    <span className="text-[11px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                      Ultima trimitere (RO): <strong>{formatRomaniaDateTime(settings.last_dispatched_at)}</strong>
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Trimite instantaneu lista de comenzi fizice eligibile către centrul de fulfillment (inclusiv fișierul CSV atașat) sau descarcă direct fișierul tabelar pentru importul în softul WMS.
                </p>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500">
                    Notă suplimentară pentru depozit (opțional):
                  </label>
                  <input
                    type="text"
                    value={dispatchNotes}
                    onChange={(e) => setDispatchNotes(e.target.value)}
                    placeholder="Ex: Prioritate la comenzile de X10 Elbow Wraps..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#e32f8c] focus:bg-white transition-all"
                  />
                </div>

                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-slate-500 space-y-0.5">
                    <div>
                      Destinatar Depozit: <strong className="text-slate-800">{settings.email || 'Nesetat (completează mai sus)'}</strong>
                    </div>
                    {settings.secondary_email ? (
                      <div className="text-[11px] text-indigo-700 font-semibold flex items-center gap-1">
                        <ShieldCheck size={12} className="text-indigo-600" />
                        <span>Copie Verificare (CC): <strong>{settings.secondary_email}</strong></span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 italic">
                        Copie Verificare: Nicio adresă secundară setată
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
                    <button
                      onClick={() => handleDownloadCsv('pending')}
                      className="min-h-[40px] px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Download size={14} className="text-emerald-600" />
                      <span>Descarcă CSV ({pendingOrders.length})</span>
                    </button>

                    <button
                      onClick={handleTriggerDispatchNow}
                      disabled={dispatching || !settings.email || pendingOrders.length === 0 || Boolean(queueOverview.liveProductsError)}
                      className="min-h-[40px] px-5 py-2.5 bg-[#e32f8c] hover:bg-[#c41a72] active:scale-95 text-white font-black text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-[#e32f8c]/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {dispatching ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          <span>Se transmite...</span>
                        </>
                      ) : (
                        <>
                          <Send size={14} />
                          <span>Trimite Comenzile Acum ({pendingOrders.length})</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PREVIZUALIZARE TEMPLATE EMAIL */}
          {activeTab === 'template' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-800 flex items-center gap-2">
                    <FileText size={15} className="text-[#008ba3]" />
                    Format Email Centru Fulfillment (cu poze reale & grupare pe țări):
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                    <ShieldCheck size={11} className="text-indigo-600" />
                    Protecție Anti-Duplicate Activată
                  </span>
                  {queueOverview.isSamplePreview && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                      Date demonstrative (0 comenzi în așteptare)
                    </span>
                  )}
                  {queueOverview.isHistoricalPreview && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-full">
                      Previzualizare comenzi anterioare (0 noi în așteptare)
                    </span>
                  )}
                </div>

                <button
                  onClick={() => handleDownloadCsv(pendingOrders.length > 0 ? 'pending' : 'preview')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-black transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <FileSpreadsheet size={14} />
                  <span>{pendingOrders.length > 0 ? 'Descarcă Fișierul CSV (.csv)' : 'Descarcă CSV Previzualizare'}</span>
                </button>
              </div>

              {loadingPreview ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                  <Loader2 size={28} className="animate-spin text-[#e32f8c] mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-500">Se încarcă previzualizarea...</p>
                </div>
              ) : (
                <div className="bg-slate-100 p-2 sm:p-5 rounded-2xl border border-slate-200">
                  <div className="max-w-2xl mx-auto bg-white rounded-2xl overflow-hidden shadow-md border border-slate-200">
                    
                    {/* Simulated Clean Email Header */}
                    <div className="bg-slate-50 p-4 border-b border-slate-200 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">De la: TrenZone Fulfillment &lt;contact@trenzone.fit&gt;</span>
                        <span className="text-[11px] text-slate-400">
                          {scheduleInfo.nextDayLabelRo}, {scheduleInfo.nextTimeRo} (RO)
                        </span>
                      </div>
                      <div className="text-slate-600">
                        Către (Depozit): <strong className="text-slate-900">{settings.email || 'depozit@fulfillment.ro'}</strong>
                      </div>
                      <div className="text-slate-600 flex items-center gap-1.5">
                        <span>CC (Verificare Admin):</span>
                        {settings.secondary_email ? (
                          <strong className="text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">{settings.secondary_email}</strong>
                        ) : (
                          <span className="text-slate-400 italic">Nicio adresă secundară configurată (opțional)</span>
                        )}
                      </div>
                      <div className="text-slate-600">
                        Subiect: <strong className="text-slate-900">{computeSubject(previewOrders, settings.auto_dispatch_enabled ? 'scheduled_8am' : 'manual')}</strong>
                      </div>
                      <div className="text-slate-500 text-[11px] flex items-center gap-1.5 pt-0.5">
                        <span className="text-emerald-700 font-bold inline-flex items-center gap-1">
                          <FileSpreadsheet size={12} /> Fișier atașat:
                        </span>
                        <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700 font-semibold">
                          comenzi_trenzone_{new Date().toISOString().split('T')[0]}.csv
                        </span>
                        <span className="text-slate-400">(Format Tabelar UTF-8 Excel / WMS)</span>
                      </div>
                    </div>

                    {/* Email Visual Body */}
                    <div className="p-4 sm:p-6 space-y-5">
                      {/* Top Brand Banner */}
                      <div className="bg-white p-4 rounded-xl text-center border-t-4 border-[#e32f8c] border-x border-b border-slate-200 shadow-2xs">
                        <h3 className="text-base font-black tracking-tight text-slate-900 m-0">TRENZONE FULFILLMENT</h3>
                        <p className="text-xs text-slate-500 mt-1">Listă Comenzi pentru Ambalare & Expediere</p>
                      </div>

                      {/* Metrics bar */}
                      <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                        <div>
                          <div className="text-[10px] uppercase font-bold text-slate-400">Comenzi</div>
                          <div className="text-base font-black text-slate-900">{previewOrders.length}</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase font-bold text-slate-400">Produse Total</div>
                          <div className="text-base font-black text-[#e32f8c]">
                            {previewOrders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0)} buc.
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase font-bold text-slate-400">Ramburs (COD)</div>
                          <div className="text-base font-black text-amber-700">
                            {previewOrders.filter(o => o.paymentMethod === 'cod').length} comenzi
                          </div>
                        </div>
                      </div>

                      {/* PICKING LIST IN PREVIEW */}
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                        <div className="bg-slate-100 p-2.5 px-3 flex items-center justify-between text-xs font-black text-slate-800">
                          <span className="flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                            <Layers size={13} className="text-slate-600" /> Sumar Cules Articole (Picking List)
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Total: {previewOrders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0)} buc.
                          </span>
                        </div>

                        <div className="p-3 divide-y divide-slate-100">
                          {pickingList.map((item, pIdx) => (
                            <div key={pIdx} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2.5">
                                <span className="px-2 py-0.5 rounded-md bg-[#e32f8c] text-white font-black text-[11px]">
                                  {item.quantity}x
                                </span>
                                {item.image && (
                                  <img
                                    src={item.image}
                                    alt={item.name}
                                    className="w-8 h-8 rounded object-contain bg-slate-50 border border-slate-200"
                                  />
                                )}
                                <div>
                                  <strong className="text-slate-900">{item.name}</strong>
                                  {item.variant && (
                                    <span className="ml-2 text-[10px] font-bold text-[#e32f8c] bg-[#e32f8c]/10 px-1.5 py-0.5 rounded">
                                      {item.variant}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {item.sku && <span className="font-mono text-[10px] text-slate-400">{item.sku}</span>}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* ORDERS SPLIT BY COUNTRY */}
                      <div className="space-y-4">
                        {/* Romania Group */}
                        {roOrders.length > 0 && (
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-black text-slate-800">
                              <span className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.2 rounded bg-slate-900 text-white text-[10px]">RO</span>
                                <span>România (Comenzi Naționale - Sameday)</span>
                              </span>
                              <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200">
                                {roOrders.length} comenzi
                              </span>
                            </div>

                            {roOrders.map((order, idx) => (
                              <div key={order.id || idx} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                                <div className="bg-slate-50 p-2.5 px-3 flex items-center justify-between text-xs border-b border-slate-100">
                                  <span className="font-black text-slate-900 flex items-center gap-1.5">
                                    <span className="px-1.5 py-0.5 rounded bg-slate-900 text-[10px] text-white">#{idx + 1}</span>
                                    {order.id}
                                  </span>
                                  {order.paymentMethod === 'cod' ? (
                                    <span className="text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded">
                                      RAMBURS: {order.total}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded">
                                      ACHITAT CARD
                                    </span>
                                  )}
                                </div>

                                <div className="p-3 bg-slate-50/50 border-b border-slate-100 text-xs grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Destinatar:</span>
                                    <strong className="text-slate-800">{order.customer}</strong>
                                    <span className="text-slate-600 block text-[11px]">{order.customerPhone}</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Adresă Livrare:</span>
                                    <span className="text-slate-700 text-[11px] block">{order.address}, {order.city}</span>
                                  </div>
                                </div>

                                <div className="p-3 space-y-1.5 text-xs">
                                  {order.items.map((item, iIdx) => (
                                    <div key={iIdx} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                                      <div className="flex items-center gap-2">
                                        <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white font-black text-[11px]">
                                          {item.quantity}x
                                        </span>
                                        {item.image && (
                                          <img
                                            src={item.image}
                                            alt={item.name}
                                            className="w-7 h-7 rounded object-contain bg-slate-50 border border-slate-200"
                                          />
                                        )}
                                        <span className="font-bold text-slate-800">{item.name}</span>
                                        {item.variant && (
                                          <span className="text-[10px] font-bold text-[#e32f8c] bg-[#e32f8c]/10 px-1.5 py-0.5 rounded">
                                            {item.variant}
                                          </span>
                                        )}
                                      </div>
                                      {item.sku && <span className="text-[10px] font-mono text-slate-400">{item.sku}</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* International Group */}
                        {intlOrders.length > 0 && (
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-black text-slate-800">
                              <span className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.2 rounded bg-indigo-700 text-white text-[10px]">INT</span>
                                <span>Comenzi Internaționale (Packeta / Cross-Border)</span>
                              </span>
                              <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200">
                                {intlOrders.length} comenzi
                              </span>
                            </div>

                            {intlOrders.map((order, idx) => (
                              <div key={order.id || idx} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                                <div className="bg-slate-50 p-2.5 px-3 flex items-center justify-between text-xs border-b border-slate-100">
                                  <span className="font-black text-slate-900 flex items-center gap-1.5">
                                    <span className="px-1.5 py-0.5 rounded bg-slate-900 text-[10px] text-white">#{idx + 1}</span>
                                    {order.id}
                                  </span>
                                  <span className="text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded">
                                    ACHITAT CARD ({order.total})
                                  </span>
                                </div>

                                <div className="p-3 bg-slate-50/50 border-b border-slate-100 text-xs grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Destinatar:</span>
                                    <strong className="text-slate-800">{order.customer}</strong>
                                    <span className="text-slate-600 block text-[11px]">{order.customerPhone}</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Adresă Internațională:</span>
                                    <span className="text-slate-700 text-[11px] block">{order.address}, {order.city} • <strong>{order.country}</strong></span>
                                  </div>
                                </div>

                                <div className="p-3 space-y-1.5 text-xs">
                                  {order.items.map((item, iIdx) => (
                                    <div key={iIdx} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                                      <div className="flex items-center gap-2">
                                        <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white font-black text-[11px]">
                                          {item.quantity}x
                                        </span>
                                        {item.image && (
                                          <img
                                            src={item.image}
                                            alt={item.name}
                                            className="w-7 h-7 rounded object-contain bg-slate-50 border border-slate-200"
                                          />
                                        )}
                                        <span className="font-bold text-slate-800">{item.name}</span>
                                        {item.variant && (
                                          <span className="text-[10px] font-bold text-[#e32f8c] bg-[#e32f8c]/10 px-1.5 py-0.5 rounded">
                                            {item.variant}
                                          </span>
                                        )}
                                      </div>
                                      {item.sku && <span className="text-[10px] font-mono text-slate-400">{item.sku}</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Footer notice */}
                      <div className="text-center text-[11px] text-slate-400 pt-3 border-t border-slate-200">
                        TrenZone Logistics • Toate drepturile rezervate • Contact urgențe depozit: contact@trenzone.fit
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RAPORT ZILNIC & ISTORIC TRIMISE */}
          {activeTab === 'history' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Raport Zilnic & Istoric Expedieri Fulfillment
                </h3>
                <Link
                  href="/admin/fulfillment"
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#008ba3] hover:underline self-start sm:self-auto"
                >
                  <ExternalLink size={12} />
                  <span>Deschide Raportul în Pagină Dedicată</span>
                </Link>
              </div>

              <FulfillmentReportView
                logs={history}
                loading={loadingHistory}
                settings={settings}
                pendingCount={pendingOrders.length}
                onRefresh={() => {
                  setLoadingHistory(true);
                  return getFulfillmentHistory()
                    .then(setHistory)
                    .finally(() => setLoadingHistory(false));
                }}
                compact
              />
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 font-medium hidden sm:block">
            {settings.manual_shipping_enabled ? (
              <span className="text-amber-800 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Expediere manuală activă — Butoanele de AWB sunt blocate
              </span>
            ) : (
              <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Expediere automată activă — AWB-urile funcționează normal
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ml-auto"
          >
            Închide Fereastra
          </button>
        </div>
      </motion.div>
    </div>
  );
}
