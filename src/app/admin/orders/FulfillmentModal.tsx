"use client";

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  Send, 
  Check, 
  Loader2, 
  Clock, 
  FileText, 
  Truck, 
  CheckCircle2, 
  AlertCircle, 
  History, 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  Calendar, 
  Layers, 
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  getFulfillmentSettings, 
  updateFulfillmentSettings, 
  getFulfillmentHistory, 
  dispatchOrdersToFulfillment,
  getFulfillmentPreviewOrders,
  generateFulfillmentCsv
} from '@/app/actions/admin-fulfillment';
import { FulfillmentSettings, FulfillmentDispatchLog, FulfillmentOrderSummary } from '@/types/fulfillment';

interface FulfillmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsUpdated?: (settings: FulfillmentSettings) => void;
  totalOrdersCount: number;
}

export function FulfillmentModal({
  isOpen,
  onClose,
  onSettingsUpdated,
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
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Preview state
  const [previewOrders, setPreviewOrders] = useState<FulfillmentOrderSummary[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

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
    }
  }, [isOpen]);

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
      setLoadingPreview(true);
      getFulfillmentPreviewOrders()
        .then(data => setPreviewOrders(data))
        .catch(err => console.error(err))
        .finally(() => setLoadingPreview(false));
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

  // Toggle 08:00 AM auto-dispatch
  const handleToggleAutoDispatch = async () => {
    const nextVal = !settings.auto_dispatch_enabled;
    const updated = { ...settings, auto_dispatch_enabled: nextVal };
    setSettings(updated);
    if (onSettingsUpdated) onSettingsUpdated(updated);

    try {
      await updateFulfillmentSettings({ auto_dispatch_enabled: nextVal });
      toast.success(nextVal ? 'Trimiterea automată la ora 08:00 AM a fost activată!' : 'Trimiterea automată a fost dezactivată.');
    } catch (err: any) {
      setSettings(settings);
      toast.error('Eroare la salvare: ' + err.message);
    }
  };

  // Download CSV file directly
  const handleDownloadCsv = async () => {
    try {
      const ordersToExport = previewOrders.length > 0 ? previewOrders : await getFulfillmentPreviewOrders();
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
        if (res.count === 0) {
          toast.success(res.message || 'Nu există comenzi noi de expediat.', { id: toastId });
        } else {
          toast.success(
            `✓ ${res.count} comenzi au fost transmise către ${res.recipient}${res.secondaryRecipient ? ` (CC: ${res.secondaryRecipient})` : ''}!`,
            {
              id: toastId,
              duration: 5000
            }
          );
          setSettings(prev => ({ ...prev, last_dispatched_at: res.sentAt || new Date().toISOString() }));
          setDispatchNotes('');
          getFulfillmentHistory().then(setHistory);
        }
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

    const triggerLabel = trigger === 'scheduled_8am' ? '08:00 AM' : 'Manual';
    let countryPart = '';
    if (roCount > 0 && intCount > 0) {
      countryPart = ` • 🇷🇴 ${roCount} RO · 🇪🇺 ${intCount} INT`;
    } else if (intCount > 0) {
      countryPart = ` • 🇪🇺 ${intCount} Internațional`;
    } else if (roCount > 0) {
      countryPart = ` • 🇷🇴 România`;
    }

    const orderWord = count === 1 ? 'comandă' : 'comenzi';
    const itemWord = totalItems === 1 ? 'articol' : 'articole';

    return `[TrenZone] 📦 Comenzi de Expediat — ${dateStr} • ${count} ${orderWord} (${totalItems} ${itemWord})${countryPart} [${triggerLabel}]`;
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
        className="relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 z-10"
      >
        {/* 🌟 LIGHT CLEAN MODAL HEADER (NO BLACK) */}
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
            <button
              onClick={handleDownloadCsv}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs"
              title="Descarcă tabelul comenzilor în format CSV pentru Excel"
            >
              <Download size={13} className="text-emerald-600" />
              <span>Descarcă CSV</span>
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

        {/* 🌟 TABS NAVIGATION */}
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
            <span>Istoric Trimise</span>
            {history.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-full font-bold">
                {history.length}
              </span>
            )}
          </button>
        </div>

        {/* 🌟 TAB CONTENT (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar bg-slate-50/40">
          
          {/* ═════════════════════════════════════════════════════════ */}
          {/* TAB 1: CONFIGURARE & EXPEDIERE IMEDIATĂ                   */}
          {/* ═════════════════════════════════════════════════════════ */}
          {activeTab === 'config' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
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

                {/* 08:00 AM Dispatch Toggle */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-slate-500" />
                      <span className="text-xs font-black text-slate-800">Trimitere Automată Zilnică (Ora 08:00 AM)</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      În fiecare dimineață la 08:00 (Europe/Bucharest), comenzile noi sunt transmise automat cu fișier CSV atașat.
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

              {/* 🌟 LIVE EMAIL SUBJECT CARD (EXCELLENT UI/UX) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles size={15} className="text-[#e32f8c]" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Format Subiect Email în Inbox (Claritate Maximă Depozit & Notificări)
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-slate-200">
                    Generat Dinamic
                  </span>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-inner text-xs font-mono font-bold text-slate-900 break-all select-all flex items-center justify-between gap-2">
                  <span>{computeSubject(previewOrders, settings.auto_dispatch_enabled ? 'scheduled_8am' : 'manual')}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 font-bold">
                  <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-700">
                    <span>📅</span> Dată Calendaristică
                  </span>
                  <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-700">
                    <span>📦</span> Nr. Comenzi & Bucăți
                  </span>
                  <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-700">
                    <span>🇷🇴/🇪🇺</span> Împărțire Țară (Sameday vs Packeta)
                  </span>
                  <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-700">
                    <span>⏰</span> Marcaj Orar (08:00 AM / Manual)
                  </span>
                  <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-700">
                    <span>📎</span> Fișier CSV Atașat
                  </span>
                </div>
              </div>

              {/* 🛡️ ANTI-DUPLICATE PROTECTION NOTICE */}
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
                    Fiecare comandă transmisă către depozit este marcată automat în sistem cu data și ora expedierii. Comenzile deja transmise sunt excluse automat din emailurile viitoare (zilnice sau manuale) și sunt semnalizate în tabelul de comenzi cu eticheta <strong className="text-indigo-950 bg-white/70 px-1.5 py-0.5 rounded border border-indigo-200">📦 TRIMIS FULFILLMENT</strong>.
                  </p>
                </div>
              </div>

              {/* 🌟 IMMEDIATE DISPATCH & CSV EXPORT BOX (CLEAN LIGHT DESIGN - NO BLACK) */}
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
                      Ultima trimitere: <strong>{new Date(settings.last_dispatched_at).toLocaleString('ro-RO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</strong>
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Trimite instantaneu lista de comenzi active către centrul de fulfillment (inclusiv fișierul CSV atașat) sau descarcă direct fișierul tabelar pentru importul în softul WMS.
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

                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={handleDownloadCsv}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Download size={14} className="text-emerald-600" />
                      <span>Descarcă CSV</span>
                    </button>

                    <button
                      onClick={handleTriggerDispatchNow}
                      disabled={dispatching || !settings.email}
                      className="px-5 py-2.5 bg-[#e32f8c] hover:bg-[#c41a72] active:scale-95 text-white font-black text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-[#e32f8c]/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {dispatching ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          <span>Se transmite...</span>
                        </>
                      ) : (
                        <>
                          <Send size={14} />
                          <span>Trimite Comenzile Acum</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════ */}
          {/* TAB 2: PREVIZUALIZARE TEMPLATE EMAIL (LIGHT CLEAN THEME)   */}
          {/* ═════════════════════════════════════════════════════════ */}
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
                </div>

                <button
                  onClick={handleDownloadCsv}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-black transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <FileSpreadsheet size={14} />
                  <span>Descarcă Fișierul CSV (.csv)</span>
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
                        <span className="text-[11px] text-slate-400">Astăzi, 08:00 AM</span>
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
                        <span className="text-emerald-700 font-bold">📎 Fișier atașat:</span>
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

                      {/* 📋 PICKING LIST IN PREVIEW */}
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                        <div className="bg-slate-100 p-2.5 px-3 flex items-center justify-between text-xs font-black text-slate-800">
                          <span className="flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                            <span>📋</span> Sumar Cules Articole (Picking List)
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

                      {/* 🌍 ORDERS SPLIT BY COUNTRY */}
                      <div className="space-y-4">
                        {/* Romania Group */}
                        {roOrders.length > 0 && (
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-black text-slate-800">
                              <span className="flex items-center gap-1.5">
                                <span>🇷🇴</span> România (Comenzi Naționale - Sameday)
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
                                <span>🇪🇺</span> Comenzi Internaționale (Packeta / Cross-Border)
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

          {/* ═════════════════════════════════════════════════════════ */}
          {/* TAB 3: ISTORIC TRIMISE (EMAIL LOGS)                       */}
          {/* ═════════════════════════════════════════════════════════ */}
          {activeTab === 'history' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Istoric Expedieri Către Centrul de Fulfillment
                </h3>
                <button
                  onClick={() => {
                    setLoadingHistory(true);
                    getFulfillmentHistory().then(setHistory).finally(() => setLoadingHistory(false));
                  }}
                  className="text-xs font-bold text-[#008ba3] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw size={12} className={loadingHistory ? 'animate-spin' : ''} />
                  <span>Reîmprospătează</span>
                </button>
              </div>

              {loadingHistory ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                  <Loader2 size={24} className="animate-spin text-[#e32f8c] mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Se încarcă istoricul expedierilor...</p>
                </div>
              ) : history.length === 0 ? (
                <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
                  <History size={32} className="text-slate-300 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-700">Nicio expediere înregistrată încă</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Emailurile transmise zilnic la ora 08:00 AM sau manual prin butonul „Trimite Acum” vor fi arhivate aici cu toate comenzile și fișierele incluse.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    const dateFormatted = new Date(log.sent_at).toLocaleString('ro-RO', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <div
                        key={log.id}
                        className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all"
                      >
                        {/* Header bar */}
                        <div
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                          className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                              <CheckCircle2 size={18} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <strong className="text-xs sm:text-sm font-black text-slate-900 truncate">
                                  {dateFormatted}
                                </strong>
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                                  log.trigger === 'scheduled_8am'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'bg-purple-50 text-purple-700 border border-purple-200'
                                }`}>
                                  {log.trigger === 'scheduled_8am' ? 'Cron 08:00' : 'Manual'}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 truncate mt-0.5 flex items-center gap-1.5 flex-wrap">
                                <span>Trimis la: <strong className="text-slate-700">{log.recipient_email}</strong></span>
                                {log.secondary_email && (
                                  <span className="text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded font-semibold text-[10px]">
                                    CC: {log.secondary_email}
                                  </span>
                                )}
                                <span>•</span>
                                <span className="text-slate-800 font-bold">{log.order_count} {log.order_count === 1 ? 'comandă' : 'comenzi'}</span>
                              </div>
                              {log.subject && (
                                <div className="text-[10px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded mt-1 truncate max-w-xl">
                                  Subiect: {log.subject}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-bold text-slate-500 hidden sm:inline">
                              {isExpanded ? 'Ascunde detalii' : 'Vezi comenzi'}
                            </span>
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </div>

                        {/* Expanded details */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="border-t border-slate-100 bg-slate-50/60 p-4 space-y-3"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                                  Comenzi Incluse În Acest Email ({log.orders?.length || 0}):
                                </span>
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const csv = await generateFulfillmentCsv(log.orders || []);
                                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `comenzi_${log.id}.csv`;
                                    a.click();
                                  }}
                                  className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <Download size={12} />
                                  <span>Descarcă CSV Expediere</span>
                                </button>
                              </div>

                              <div className="space-y-2">
                                {(log.orders || []).map((o, oIdx) => (
                                  <div
                                    key={o.id || oIdx}
                                    className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs text-xs space-y-2"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="font-black text-slate-900">{o.id}</span>
                                        <span className="text-slate-400">•</span>
                                        <span className="font-bold text-slate-700">{o.customer}</span>
                                        <span className="text-slate-400">•</span>
                                        <span className="text-slate-500">{o.city} ({o.country || 'RO'})</span>
                                      </div>
                                      <span className="font-black text-slate-900">{o.total}</span>
                                    </div>

                                    {/* Items summary */}
                                    <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100">
                                      {o.items.map((item, iIdx) => (
                                        <span
                                          key={iIdx}
                                          className="text-[11px] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md font-medium text-slate-700"
                                        >
                                          <strong>{item.quantity}x</strong> {item.name} {item.variant ? `(${item.variant})` : ''}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* 🌟 MODAL FOOTER */}
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
