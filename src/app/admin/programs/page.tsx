"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  BookOpen,
  Search,
  RefreshCw,
  Mail,
  Send,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Upload,
  FileText,
  ExternalLink,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
  User,
  Phone,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getAdminProgramOrdersAction,
  sendManualProgramEmailAction,
  removeProgramPdfSlotAction,
  type AdminProgramOrderRow,
  type AdminProgramPdfSlot,
} from '@/app/actions/programs';
import { uploadAdminProgramPdf } from '@/lib/admin-pdf-upload';
import type { StoredProgramFiles, ProgramFileSlot } from '@/lib/program-pdf-generator';

type FilterTab = 'all' | 'needs_attention' | 'ready_to_send' | 'delivered';

export default function AdminProgramsPage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<AdminProgramOrderRow[]>([]);
  const [files, setFiles] = useState<StoredProgramFiles>({});
  const [slots, setSlots] = useState<AdminProgramPdfSlot[]>([]);
  const [availableSlots, setAvailableSlots] = useState<Record<string, boolean>>({});

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [sendingOrderId, setSendingOrderId] = useState<string | null>(null);
  const [bulkSending, setBulkSending] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [showPdfManager, setShowPdfManager] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminProgramOrdersAction();
      if (!res.success) {
        toast.error(res.error || 'Eroare la încărcarea comenzilor cu programe.');
      } else {
        setOrders(res.orders);
        setFiles(res.files);
        setSlots(res.slots);
        setAvailableSlots(res.availableSlots);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Eroare de rețea.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isOrderDeliveredCompletely = (o: AdminProgramOrderRow) => {
    if (o.deliveryMeta?.status === 'delivered') return true;
    if (o.lastEmailLog?.type === 'program-delivery' && o.lastEmailLog?.status === 'sent' && o.missingCount === 0) {
      return true;
    }
    return false;
  };

  const isOrderReadyForFinalPdf = (o: AdminProgramOrderRow) => {
    return o.missingCount === 0 && !isOrderDeliveredCompletely(o);
  };

  const stats = useMemo(() => {
    const total = orders.length;
    const delivered = orders.filter(isOrderDeliveredCompletely).length;
    const readyToSend = orders.filter(isOrderReadyForFinalPdf).length;
    const missingPdfOrders = orders.filter((o) => o.missingCount > 0).length;
    const loadedSlotsCount = slots.filter((s) => availableSlots[s.slot]).length;
    return {
      total,
      delivered,
      readyToSend,
      missingPdfOrders,
      loadedSlotsCount,
      totalSlotsCount: slots.length,
    };
  }, [orders, slots, availableSlots]);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((o) => {
      if (activeTab === 'needs_attention' && o.missingCount === 0 && isOrderDeliveredCompletely(o)) {
        return false;
      }
      if (activeTab === 'ready_to_send' && !isOrderReadyForFinalPdf(o)) {
        return false;
      }
      if (activeTab === 'delivered' && !isOrderDeliveredCompletely(o)) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        o.orderNumber,
        o.customerName,
        o.customerEmail,
        o.customerPhone,
        ...o.programs.map((p) => p.title),
        ...o.programs.map((p) => p.slot),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [orders, searchQuery, activeTab]);

  const handleManualSend = async (
    order: AdminProgramOrderRow,
    overrideMode: 'auto' | 'force_pending' = 'auto'
  ) => {
    setSendingOrderId(order.supabaseId);
    try {
      const res = await sendManualProgramEmailAction(order.supabaseId, overrideMode);
      if (res.success) {
        toast.success(res.message || 'Email trimis cu succes!');
        await loadData();
      } else {
        toast.error(res.error || 'Eroare la trimitere.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Eroare la trimitere.');
    } finally {
      setSendingOrderId(null);
    }
  };

  const handleBulkSendReady = async () => {
    const targets = orders.filter(isOrderReadyForFinalPdf);
    if (targets.length === 0) return;
    setBulkSending(true);
    let okCount = 0;
    let errCount = 0;
    for (const o of targets) {
      try {
        const res = await sendManualProgramEmailAction(o.supabaseId, 'auto');
        if (res.success) okCount++;
        else errCount++;
      } catch {
        errCount++;
      }
    }
    setBulkSending(false);
    await loadData();
    if (errCount === 0) {
      toast.success(`Trimis cu succes pentru ${okCount} ${okCount === 1 ? 'comandă' : 'comenzi'}!`);
    } else {
      toast.error(`Trimise: ${okCount}, erori: ${errCount}`);
    }
  };

  const handlePdfUpload = async (slot: ProgramFileSlot, file: File | null) => {
    if (!file) return;
    setUploadingSlot(slot);
    try {
      const res = await uploadAdminProgramPdf(slot, file);
      if (res.success) {
        toast.success(`PDF încărcat pentru ${slot}!`);
        await loadData();
      } else {
        toast.error(res.error || 'Eroare la încărcarea PDF-ului.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Eroare upload PDF.');
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleRemovePdfSlot = async (slot: ProgramFileSlot) => {
    try {
      const res = await removeProgramPdfSlotAction(slot);
      if (res.success) {
        toast.success(`Link-ul PDF pentru ${slot} a fost eliminat.`);
        await loadData();
      } else {
        toast.error(res.error || 'Nu s-a putut șterge.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Eroare la ștergere.');
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#e32f8c]/10 border border-[#e32f8c]/20 flex items-center justify-center text-[#e32f8c] shrink-0">
            <BookOpen size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Programe Digitale Vândute
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Doar comenzile cu programe digitale · trimite inteligent PDF-ul (dacă există) sau notificarea „Urmează curând”
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {stats.readyToSend > 0 && (
            <button
              type="button"
              onClick={handleBulkSendReady}
              disabled={bulkSending}
              className="flex items-center gap-2 bg-[#e32f8c] hover:bg-[#c81e78] text-black px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm shadow-sm transition-all disabled:opacity-50"
            >
              {bulkSending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              <span>Trimite PDF tuturor celor gata ({stats.readyToSend})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowPdfManager((v) => !v)}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:border-[#e32f8c] text-slate-800 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all"
          >
            <FileText size={16} className="text-[#e32f8c]" />
            <span>
              PDF-uri ({stats.loadedSlotsCount}/{stats.totalSlotsCount})
            </span>
            {showPdfManager ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Reîmprospătează</span>
          </button>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">Total Comenzi Programe</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats.total}</div>
        </div>
        <div className="bg-white border border-amber-100 rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-black uppercase tracking-wider text-amber-600">Fără PDF Încărcat</div>
          <div className="text-2xl font-black text-amber-700 mt-1">{stats.missingPdfOrders}</div>
        </div>
        <div className="bg-white border border-pink-100 rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-black uppercase tracking-wider text-[#e32f8c]">Gata de Trimis (PDF Nou)</div>
          <div className="text-2xl font-black text-[#c81e78] mt-1">{stats.readyToSend}</div>
        </div>
        <div className="bg-white border border-emerald-100 rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-black uppercase tracking-wider text-emerald-600">Livrate cu PDF</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{stats.delivered}</div>
        </div>
      </div>

      {/* COLLAPSIBLE PDF SLOTS MANAGER */}
      {showPdfManager && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Fișiere PDF Programe (Română & Engleză)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Când un slot are PDF, emailul trimite automat PDF-ul atașat + link securizat. Dacă lipsește, emailul trimite automat varianta „Urmează curând”.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {slots.map((s) => {
              const hasPdf = availableSlots[s.slot];
              const uploadedUrl = files[s.slot];
              const isUploading = uploadingSlot === s.slot;
              return (
                <div
                  key={s.slot}
                  className={`rounded-xl border p-3.5 flex flex-col justify-between gap-3 ${
                    hasPdf ? 'border-emerald-200 bg-emerald-50/40' : 'border-amber-200 bg-amber-50/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-black text-slate-900">{s.label}</div>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">{s.slot}</div>
                    </div>
                    {hasPdf ? (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                        <CheckCircle2 size={11} /> PDF OK
                      </span>
                    ) : (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">
                        <Clock size={11} /> Lipsă PDF
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex-1 cursor-pointer flex items-center justify-center gap-1.5 rounded-lg bg-white border border-slate-200 hover:border-[#e32f8c] px-3 py-2 text-xs font-bold text-slate-700 transition-colors">
                      {isUploading ? (
                        <Loader2 size={13} className="animate-spin text-[#e32f8c]" />
                      ) : (
                        <Upload size={13} className="text-[#e32f8c]" />
                      )}
                      <span>{hasPdf ? 'Înlocuiește PDF' : 'Încarcă PDF'}</span>
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        className="hidden"
                        disabled={isUploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0] || null;
                          if (f) handlePdfUpload(s.slot, f);
                          e.target.value = '';
                        }}
                      />
                    </label>

                    {uploadedUrl && (
                      <>
                        <a
                          href={`/api/programs/download?program=${encodeURIComponent(s.slot.replace(/-(ro|en)$/, ''))}&lang=${s.lang}&admin=1`}
                          target="_blank"
                          rel="noreferrer"
                          title="Descarcă PDF curent"
                          className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600"
                        >
                          <ExternalLink size={14} />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleRemovePdfSlot(s.slot)}
                          title="Elimină PDF din slot"
                          className="p-2 rounded-lg bg-white border border-red-200 hover:bg-red-50 text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SEARCH + FILTER TABS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-slate-100 rounded-2xl p-3 sm:p-4 shadow-xs">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Caută după #TZ, client, email, Food Plan, Bench..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:border-[#e32f8c]"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'all' as FilterTab, label: `Toate (${stats.total})` },
            { id: 'ready_to_send' as FilterTab, label: `Gata de Trimis (${stats.readyToSend})` },
            { id: 'needs_attention' as FilterTab, label: `În Așteptare / Mix` },
            { id: 'delivered' as FilterTab, label: `Livrate (${stats.delivered})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ORDERS LIST */}
      {loading ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 flex flex-col items-center justify-center gap-3 text-slate-500">
          <Loader2 size={28} className="animate-spin text-[#e32f8c]" />
          <span className="text-sm font-bold">Se încarcă programele vândute...</span>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center">
          <BookOpen size={32} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-bold text-slate-700">Nu există comenzi cu programe digitale în acest filtru.</p>
          <p className="text-xs text-slate-400 mt-1">
            Toate comenzile care conțin Food Plan, Training Program, Bench Program sau Pachet 3 în 1 vor apărea automat aici.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isSending = sendingOrderId === order.supabaseId;
            const allHavePdf = order.missingCount === 0;
            const noneHavePdf = order.readyCount === 0;
            const lastType = order.lastEmailLog?.type || order.deliveryMeta?.emailType || null;
            const lastSentAt = order.lastEmailLog?.createdAt || order.deliveryMeta?.lastSentAt || null;

            return (
              <div
                key={order.supabaseId}
                className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-slate-300 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* LEFT: Order + Customer */}
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                        #{order.orderNumber}
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        {new Date(order.createdAt).toLocaleString('ro-RO', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="text-xs font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                        {order.totalAmount.toFixed(2)} {order.currency}
                      </span>
                      <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {order.isDigitalOnly ? 'Doar Digital' : 'Mixt (Fizic + Digital)'}
                      </span>

                      {/* Last email status */}
                      {lastType === 'program-delivery' && order.lastEmailLog?.status !== 'failed' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-black text-emerald-800">
                          <CheckCircle2 size={12} /> Email PDF trimis
                        </span>
                      ) : lastType === 'program-pending' && order.lastEmailLog?.status !== 'failed' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-black text-amber-800">
                          <Clock size={12} /> Email „Urmează curând” trimis
                        </span>
                      ) : order.lastEmailLog?.status === 'failed' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-black text-red-700">
                          <AlertTriangle size={12} /> Ultimul email eșuat
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                          Netrimis separat
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-slate-600">
                      <span className="inline-flex items-center gap-1.5 font-bold text-slate-900">
                        <User size={14} className="text-slate-400" />
                        {order.customerName}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Mail size={14} className="text-slate-400" />
                        {order.customerEmail || 'Lipsă email'}
                      </span>
                      {order.customerPhone && order.customerPhone !== 'N/A' && (
                        <span className="inline-flex items-center gap-1.5">
                          <Phone size={14} className="text-slate-400" />
                          {order.customerPhone}
                        </span>
                      )}
                    </div>

                    {/* Programs ordered in this order */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {order.programs.map((prog) => (
                        <div
                          key={prog.slot}
                          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold ${
                            prog.hasPdfNow
                              ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
                              : 'border-amber-200 bg-amber-50/80 text-amber-900'
                          }`}
                        >
                          <span>{prog.title}</span>
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase ${
                              prog.hasPdfNow ? 'bg-emerald-200/70 text-emerald-900' : 'bg-amber-200/80 text-amber-900'
                            }`}
                          >
                            {prog.hasPdfNow ? 'PDF Atașabil' : 'Fără PDF'}
                          </span>
                        </div>
                      ))}
                    </div>

                    {lastSentAt && (
                      <div className="text-[11px] text-slate-400 font-medium">
                        Ultimul email program: {new Date(lastSentAt).toLocaleString('ro-RO')}
                        {order.deliveryMeta?.trigger ? ` · declanșare ${order.deliveryMeta.trigger === 'manual' ? 'manuală' : 'automată'}` : ''}
                      </div>
                    )}
                  </div>

                  {/* RIGHT: Manual Smart Send Actions */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={isSending || !order.customerEmail}
                      onClick={() => handleManualSend(order, 'auto')}
                      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all disabled:opacity-50 ${
                        allHavePdf
                          ? 'bg-[#e32f8c] hover:bg-[#c81e78] text-black shadow-sm'
                          : noneHavePdf
                            ? 'bg-amber-500 hover:bg-amber-600 text-black shadow-sm'
                            : 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm'
                      }`}
                    >
                      {isSending ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Send size={15} />
                      )}
                      <span>
                        {allHavePdf
                          ? lastType === 'program-delivery'
                            ? 'Retrimite Programul (PDF)'
                            : 'Trimite Programul (PDF)'
                          : noneHavePdf
                            ? 'Trimite Email „Urmează curând”'
                            : 'Trimite Inteligent (PDF + În curând)'}
                      </span>
                    </button>

                    {!noneHavePdf && (
                      <button
                        type="button"
                        disabled={isSending || !order.customerEmail}
                        onClick={() => handleManualSend(order, 'force_pending')}
                        className="text-[11px] font-bold text-slate-500 hover:text-amber-700 underline underline-offset-2 text-center lg:text-right disabled:opacity-40"
                      >
                        Trimite doar notificare „Urmează curând”
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

