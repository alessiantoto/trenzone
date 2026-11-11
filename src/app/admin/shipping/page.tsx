'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Truck, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Package, 
  Globe, 
  Settings, 
  Save, 
  Mail, 
  ShieldCheck, 
  PackageCheck, 
  ExternalLink, 
  Clock, 
  Check 
} from 'lucide-react';
import { saveShippingConfig } from '@/app/actions/shipping';
import { updateFulfillmentSettings } from '@/app/actions/admin-fulfillment';
import type { FulfillmentSettings } from '@/types/fulfillment';
import { motion } from 'framer-motion';
import { ShippingRatesTable } from '@/app/admin/components/ShippingRatesTable';
import toast from 'react-hot-toast';

export default function ShippingPage() {
  const [samedayStatus, setSamedayStatus] = useState<{status: 'loading' | 'ok' | 'error', message: string}>({ status: 'loading', message: 'Verificare conexiune...' });
  const [packetaStatus, setPacketaStatus] = useState<{status: 'loading' | 'ok' | 'error', message: string}>({ status: 'loading', message: 'Verificare conexiune...' });

  const [config, setConfig] = useState({
    packaging_cost_ron: 0,
    free_shipping_ro_ron: 499,
    free_shipping_intl_eur: 200
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);

  // Fulfillment State
  const [fulfillmentEmail, setFulfillmentEmail] = useState('');
  const [fulfillmentSecondaryEmail, setFulfillmentSecondaryEmail] = useState('');
  const [manualShipping, setManualShipping] = useState(false);
  const [autoDispatch8am, setAutoDispatch8am] = useState(true);
  const [lastDispatchedAt, setLastDispatchedAt] = useState<string | null>(null);
  const [fulfillmentSaving, setFulfillmentSaving] = useState(false);
  const [fulfillmentSaved, setFulfillmentSaved] = useState(false);

  useEffect(() => {
    async function init() {
      // Fetch Shipping Config
      try {
        const res = await fetch('/api/admin/data?action=shipping');
        const json = await res.json();
        if (json.data) setConfig(json.data);
      } catch (err) {
        console.error('Error fetching shipping config:', err);
      }

      // Fetch Fulfillment Settings
      try {
        const fRes = await fetch('/api/admin/data?action=fulfillment-settings').then(r => r.json());
        if (fRes.data) {
          setFulfillmentEmail(fRes.data.email || '');
          setFulfillmentSecondaryEmail(fRes.data.secondary_email || '');
          setManualShipping(Boolean(fRes.data.manual_shipping_enabled));
          setAutoDispatch8am(fRes.data.auto_dispatch_enabled !== false);
          setLastDispatchedAt(fRes.data.last_dispatched_at || null);
        }
      } catch (err) {
        console.error('Error fetching fulfillment settings:', err);
      }

      // Check Sameday
      try {
        const samedayRes = await fetch('/api/admin/data?action=sameday-status').then(r => r.json());
        setSamedayStatus({
          status: samedayRes.data?.success ? 'ok' : 'error',
          message: samedayRes.data?.message
        });
      } catch (e: any) {
        setSamedayStatus({ status: 'error', message: e.message || 'Eroare de conexiune' });
      }

      // Check Packeta
      try {
        const packetaRes = await fetch('/api/admin/data?action=packeta-status').then(r => r.json());
        setPacketaStatus({
          status: packetaRes.data?.success ? 'ok' : 'error',
          message: packetaRes.data?.message
        });
      } catch (e: any) {
        setPacketaStatus({ status: 'error', message: e.message || 'Eroare necunoscută' });
      }
    }
    
    init();
  }, []);

  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    setConfigSaved(false);
    const res = await saveShippingConfig(config);
    setIsSavingConfig(false);
    if (res.success) {
      setConfigSaved(true);
      toast.success("Configurarea de livrare a fost salvată!");
      setTimeout(() => setConfigSaved(false), 3000);
    } else {
      toast.error("Eroare la salvare: " + res.message);
    }
  };

  const handleToggleManualShipping = async (newValue: boolean) => {
    setManualShipping(newValue);
    try {
      await updateFulfillmentSettings({ manual_shipping_enabled: newValue });
      toast.success(
        newValue 
          ? 'Modul de expediere manuală / fulfillment a fost activat.' 
          : 'Modul manual a fost dezactivat. Curierii automați sunt activi.'
      );
    } catch (e: any) {
      setManualShipping(!newValue);
      toast.error('Eroare la actualizare: ' + (e?.message || 'Necunoscută'));
    }
  };

  const handleSaveFulfillment = async () => {
    setFulfillmentSaving(true);
    setFulfillmentSaved(false);
    try {
      const res = await updateFulfillmentSettings({
        email: fulfillmentEmail.trim(),
        secondary_email: fulfillmentSecondaryEmail.trim(),
        manual_shipping_enabled: manualShipping,
        auto_dispatch_enabled: autoDispatch8am
      });
      if (res?.success) {
        setFulfillmentSaved(true);
        toast.success('Setările de fulfillment au fost salvate cu succes!');
        setTimeout(() => setFulfillmentSaved(false), 3000);
      } else {
        toast.error('Eroare la salvare');
      }
    } catch (e: any) {
      toast.error('Eroare: ' + (e?.message || 'Eroare la salvare'));
    } finally {
      setFulfillmentSaving(false);
    }
  };

  const formatLastDispatched = (dateStr: string | null) => {
    if (!dateStr) return 'Nicio expediere încă';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('ro-RO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/50 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#e32f8c]/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="w-12 h-12 bg-[#e32f8c]/10 rounded-2xl flex items-center justify-center text-[#e32f8c]">
              <Truck size={24} strokeWidth={2.5} />
            </div>
            Curieri & Livrare
          </h1>
          <p className="text-slate-500 mt-2 text-sm max-w-xl">
            Gestionează conexiunile API cu partenerii de livrare și configurează prețurile de bază pentru coletele tale.
          </p>
        </div>
      </div>

      {/* 📦 EXPEDIERE MANUALĂ & CENTRU FULFILLMENT */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white rounded-3xl p-5 sm:p-7 border border-amber-200/90 shadow-sm relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        {/* Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 pb-6 border-b border-slate-100">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shadow-xs shrink-0">
              <Truck size={24} strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Expediere Manuală & Centru Fulfillment
                </h2>
                {manualShipping ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-200">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    ACTIVAT
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    INACTIV
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                Gestionare depozit extern și expediere manuală comenzi
              </p>
            </div>
          </div>

          <Link
            href="/admin/orders?fulfillment=open"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100/90 text-amber-900 font-bold text-xs sm:text-sm border border-amber-200/80 transition-all hover:scale-[1.02] active:scale-98 shadow-xs w-full sm:w-auto shrink-0"
          >
            <PackageCheck size={16} className="text-amber-600" />
            <span>Panou Fulfillment & Istoric</span>
            <ExternalLink size={14} className="text-amber-500" />
          </Link>
        </div>

        {/* Card Body - 2 Columns on desktop, 1 column on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 pt-6 relative z-10">
          
          {/* Left Column: Manual Mode & AWB blocking notice */}
          <div className="bg-slate-50/70 rounded-2xl p-4 sm:p-5 border border-slate-200/60 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                  Mod Expediere Manuală
                </span>
                
                {/* Modern Toggle Switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={manualShipping}
                  onClick={() => handleToggleManualShipping(!manualShipping)}
                  className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500/20 ${
                    manualShipping ? 'bg-amber-500' : 'bg-slate-200'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      manualShipping ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Când această opțiune este activată, ambalarea și expedierea sunt gestionate de centrul de fulfillment.
              </p>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Butoanele de <strong>„Generează AWB”</strong> și <strong>„Resetează AWB”</strong> din panoul de comenzi vor fi blocate pentru a împiedica dublarea expedierilor.
              </p>
            </div>

            {/* Alert banner */}
            <div
              className={`p-3.5 sm:p-4 rounded-xl text-xs sm:text-sm font-bold border transition-colors ${
                manualShipping
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              <div className="flex items-start gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${
                    manualShipping ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'
                  }`}
                />
                <div>
                  {manualShipping ? (
                    <span>
                      <strong className="text-amber-950">ACTIVAT:</strong> Butoanele AWB sunt dezactivate (Fulfillment activ).
                    </span>
                  ) : (
                    <span>
                      <strong>INACTIV:</strong> Butoanele AWB funcționează normal (Expediere automată prin curieri).
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Email settings, auto-dispatch, timestamp */}
          <div className="space-y-4">
            
            {/* Fulfillment Email */}
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wide block">
                Email Centru de Fulfillment
              </label>
              <p className="text-xs text-slate-500">
                Adresa la care se transmit comenzile cu detaliile de ambalare.
              </p>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={fulfillmentEmail}
                  onChange={(e) => setFulfillmentEmail(e.target.value)}
                  placeholder="curierat@tceholding.ro"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-medium rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 block p-3.5 pl-11 transition-all"
                />
              </div>
            </div>

            {/* Secondary Email (CC) */}
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wide block">
                Email Secundar (Verificare & Notificare Admin - CC)
              </label>
              <p className="text-xs text-slate-500">
                Primește o copie (CC) a fiecărui email expediat către depozit pentru control și confirmare.
              </p>
              <div className="relative">
                <ShieldCheck size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={fulfillmentSecondaryEmail}
                  onChange={(e) => setFulfillmentSecondaryEmail(e.target.value)}
                  placeholder="admin@trenzone.fit"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-medium rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 block p-3.5 pl-11 transition-all"
                />
              </div>
            </div>

            {/* Auto dispatch toggle & Last dispatched */}
            <div className="bg-slate-50/80 rounded-xl p-3.5 sm:p-4 border border-slate-200/60 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                    Trimitere Automată Zilnică
                  </h4>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                    Se trimite în fiecare zi la ora 08:00 dimineața
                  </p>
                </div>
                
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoDispatch8am}
                  onClick={() => setAutoDispatch8am(!autoDispatch8am)}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                    autoDispatch8am ? 'bg-emerald-500' : 'bg-slate-200'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      autoDispatch8am ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5 font-medium">
                  <Clock size={13} className="text-slate-400" />
                  Ultima expediere:
                </span>
                <span className="font-bold text-slate-700">
                  {formatLastDispatched(lastDispatchedAt)}
                </span>
              </div>
            </div>

          </div>

        </div>

        {/* Card Footer */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 relative z-10">
          <button
            onClick={handleSaveFulfillment}
            disabled={fulfillmentSaving}
            className="w-full sm:w-auto px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition-all shadow-md shadow-slate-900/15 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {fulfillmentSaving ? (
              <Loader2 size={17} className="animate-spin" />
            ) : fulfillmentSaved ? (
              <Check size={17} className="text-emerald-400" />
            ) : (
              <Check size={17} />
            )}
            <span>
              {fulfillmentSaving ? 'Se salvează...' : fulfillmentSaved ? 'Salvat cu succes!' : 'Salvează Setările de Fulfillment'}
            </span>
          </button>

          <p className="text-xs text-slate-400 text-center sm:text-right font-medium">
            Modificările se aplică instantaneu în panoul de comenzi.
          </p>
        </div>
      </motion.div>

      {/* DASHBOARD GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CONNECTION STATUS COLUMN */}
        <div className="space-y-6">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 ml-2">
            <Globe size={16} className="text-[#e32f8c]" /> Status Conexiuni API
          </h2>

          {/* Sameday Card */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl p-6 border border-slate-200/50 shadow-sm relative overflow-hidden group"
          >
            <div className="flex items-start justify-between relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shadow-sm group-hover:scale-105 transition-transform">
                   <Package size={28} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900">Sameday Courier</h3>
                  <p className="text-xs text-slate-500 mt-0.5">România & Ungaria</p>
                </div>
              </div>
              
              <div className="flex flex-col items-end">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${
                  samedayStatus.status === 'ok' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                  samedayStatus.status === 'error' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                  'bg-amber-50 text-amber-600 border-amber-100'
                }`}>
                  {samedayStatus.status === 'loading' && <Loader2 size={14} className="animate-spin" />}
                  {samedayStatus.status === 'ok' && (
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                  )}
                  {samedayStatus.status === 'error' && <XCircle size={14} />}
                  
                  {samedayStatus.status === 'loading' ? 'Se verifică...' : 
                   samedayStatus.status === 'ok' ? 'Online' : 'Offline'}
                </div>
              </div>
            </div>
            
            <div className="mt-5 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm text-slate-600">
               {samedayStatus.message}
            </div>
          </motion.div>

          {/* Packeta Card */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-3xl p-6 border border-slate-200/50 shadow-sm relative overflow-hidden group"
          >
            <div className="flex items-start justify-between relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shadow-sm group-hover:scale-105 transition-transform">
                   <Package size={28} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900">Packeta (Zásilkovna)</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Internațional (EU)</p>
                </div>
              </div>
              
              <div className="flex flex-col items-end">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${
                  packetaStatus.status === 'ok' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                  packetaStatus.status === 'error' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                  'bg-amber-50 text-amber-600 border-amber-100'
                }`}>
                  {packetaStatus.status === 'loading' && <Loader2 size={14} className="animate-spin" />}
                  {packetaStatus.status === 'ok' && (
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                  )}
                  {packetaStatus.status === 'error' && <XCircle size={14} />}
                  
                  {packetaStatus.status === 'loading' ? 'Se verifică...' : 
                   packetaStatus.status === 'ok' ? 'Online' : 'Offline'}
                </div>
              </div>
            </div>
            
            <div className="mt-5 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm text-slate-600 break-words">
               {packetaStatus.message}
            </div>
          </motion.div>
        </div>

        {/* SETTINGS COLUMN */}
        <div className="space-y-6">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 ml-2">
            <Settings size={16} className="text-[#e32f8c]" /> Setări Platformă
          </h2>

          <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/50 shadow-sm relative overflow-hidden">
             <div className="space-y-6">
               
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <label className="text-xs sm:text-sm font-bold text-slate-700">Livrare gratuită (România)</label>
                   <div className="relative">
                     <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs sm:text-sm">RON</span>
                     <input 
                       type="number" 
                       value={config.free_shipping_ro_ron} 
                       onChange={e => setConfig({...config, free_shipping_ro_ron: Number(e.target.value)})}
                       className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-2xl focus:ring-2 focus:ring-[#e32f8c]/20 focus:border-[#e32f8c] block p-3.5 pl-12 sm:pl-14 transition-all" 
                     />
                   </div>
                   <p className="text-[10px] sm:text-xs text-slate-500">Comenzile peste această sumă au transportul gratuit în țară.</p>
                 </div>

                 <div className="space-y-2">
                   <label className="text-xs sm:text-sm font-bold text-slate-700">Livrare gratuită (Internațional)</label>
                   <div className="relative">
                     <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs sm:text-sm">EUR</span>
                     <input 
                       type="number" 
                       value={config.free_shipping_intl_eur} 
                       onChange={e => setConfig({...config, free_shipping_intl_eur: Number(e.target.value)})}
                       className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-2xl focus:ring-2 focus:ring-[#e32f8c]/20 focus:border-[#e32f8c] block p-3.5 pl-12 sm:pl-14 transition-all" 
                     />
                   </div>
                   <p className="text-[10px] sm:text-xs text-slate-500">Pragul minim pentru coletele expediate în Europa.</p>
                 </div>
               </div>

               <div className="space-y-2 pt-2 border-t border-slate-100">
                 <label className="text-xs sm:text-sm font-bold text-slate-700">Cost de procesare & ambalare</label>
                 <div className="relative">
                   <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs sm:text-sm">RON</span>
                   <input 
                     type="number" 
                     value={config.packaging_cost_ron} 
                     onChange={e => setConfig({...config, packaging_cost_ron: Number(e.target.value)})}
                     className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-2xl focus:ring-2 focus:ring-[#e32f8c]/20 focus:border-[#e32f8c] block p-3.5 pl-12 sm:pl-14 transition-all" 
                   />
                 </div>
                 <p className="text-[10px] sm:text-xs text-slate-500">Această sumă se adaugă la costul generat de curier. Lasă 0 dacă nu percepi taxe extra pentru cutii.</p>
               </div>

               <button 
                 onClick={handleSaveConfig}
                 disabled={isSavingConfig}
                 className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition-colors shadow-lg shadow-slate-900/20 active:scale-[0.98] flex items-center justify-center gap-2"
               >
                 {isSavingConfig ? <Loader2 size={18} className="animate-spin" /> : 
                  configSaved ? <CheckCircle2 size={18} className="text-emerald-400" /> : 
                  <Save size={18} />}
                 {isSavingConfig ? 'Se salvează...' : configSaved ? 'Salvat!' : 'Salvează Preferințele'}
               </button>

             </div>
          </div>
        </div>
      </div>

      {/* FULL WIDTH TABLE */}
      <div className="w-full">
        <ShippingRatesTable />
      </div>
    </div>
  );
}
