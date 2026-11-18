"use client";

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Download,
  FileSpreadsheet,
  History,
  Layers,
  Loader2,
  Mail,
  Package,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Truck,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getFulfillmentHistory,
  getFulfillmentQueueOverview,
  getFulfillmentSettings,
  type FulfillmentQueueOverview,
} from '@/app/actions/admin-fulfillment';
import {
  formatRomaniaDateKey,
  formatRomaniaDateTime,
  formatRomaniaTime,
  getFulfillmentScheduleInfo,
  type FulfillmentDispatchLog,
  type FulfillmentOrderSnapshot,
  type FulfillmentSettings,
} from '@/types/fulfillment';

interface FulfillmentReportViewProps {
  logs?: FulfillmentDispatchLog[];
  loading?: boolean;
  settings?: FulfillmentSettings | null;
  pendingCount?: number;
  queueOverview?: FulfillmentQueueOverview | null;
  onRefresh?: () => void | Promise<void>;
  compact?: boolean;
}

function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (
    str.includes(',') ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes(';') ||
    str.includes('\r')
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function getLogSnapshots(log: FulfillmentDispatchLog): FulfillmentOrderSnapshot[] {
  if (Array.isArray(log.ordersSnapshot) && log.ordersSnapshot.length > 0) {
    return log.ordersSnapshot;
  }
  if (Array.isArray(log.orders) && log.orders.length > 0) {
    return log.orders.map((o) => ({
      id: o.supabaseId || o.id,
      orderNumber: o.id,
      customerName: o.customer,
      city: o.city,
      country: o.country || 'RO',
      shippingType: o.shippingType || 'hd',
      paymentMethod: o.paymentMethod || 'stripe',
      totalAmount: Number(o.totalAmount || 0),
      currency: o.currency || 'RON',
      items: (o.items || []).map((it) => ({
        name: it.name,
        variant: it.variant,
        quantity: Number(it.quantity) || 1,
        sku: it.sku,
      })),
    }));
  }
  return [];
}

function buildReportCsv(logs: FulfillmentDispatchLog[]): string {
  const headers = [
    'Batch_ID',
    'Data_Ora_Romania',
    'Trigger',
    'Status_Lot',
    'Destinatar',
    'CC_Verificare',
    'Subiect_Email',
    'Nr_Comanda',
    'Client',
    'Oras',
    'Tara',
    'Tip_Livrare',
    'Metoda_Plata',
    'Total',
    'Moneda',
    'Ramburs_De_Incasat',
    'Produs',
    'Varianta',
    'Cantitate',
    'SKU',
  ];

  const rows: string[] = [headers.join(',')];

  for (const log of logs) {
    const sentIso = log.sentAt || log.sent_at;
    const roDateTime = formatRomaniaDateTime(sentIso);
    const triggerLabel = log.trigger === 'scheduled_8am' ? 'Automat' : 'Manual';
    const recipient = log.recipient || log.recipient_email || '';
    const cc = log.secondaryRecipient || log.secondary_email || '';
    const snapshots = getLogSnapshots(log);

    if (snapshots.length === 0) {
      rows.push(
        [
          escapeCsvCell(log.id),
          escapeCsvCell(roDateTime),
          escapeCsvCell(triggerLabel),
          escapeCsvCell(log.status),
          escapeCsvCell(recipient),
          escapeCsvCell(cc),
          escapeCsvCell(log.subject || ''),
          escapeCsvCell((log.orderNumbers || []).join(' | ')),
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
        ].join(',')
      );
      continue;
    }

    for (const order of snapshots) {
      const isCod = String(order.paymentMethod || '').toLowerCase() === 'cod';
      const totalStr = Number(order.totalAmount || 0).toFixed(2);
      const currency = String(order.currency || 'RON').toUpperCase();
      const codAmount = isCod ? `${totalStr} ${currency}` : '0';
      const items = Array.isArray(order.items) && order.items.length > 0
        ? order.items
        : [{ name: 'Produs', variant: '', quantity: 1, sku: '' }];

      for (const item of items) {
        rows.push(
          [
            escapeCsvCell(log.id),
            escapeCsvCell(roDateTime),
            escapeCsvCell(triggerLabel),
            escapeCsvCell(log.status),
            escapeCsvCell(recipient),
            escapeCsvCell(cc),
            escapeCsvCell(log.subject || ''),
            escapeCsvCell(order.orderNumber || order.id),
            escapeCsvCell(order.customerName),
            escapeCsvCell(order.city),
            escapeCsvCell(order.country || 'RO'),
            escapeCsvCell(order.shippingType === 'pudo' ? 'Easybox / Locker' : 'Curier Domiciliu'),
            escapeCsvCell(isCod ? 'Ramburs' : 'Card Stripe'),
            escapeCsvCell(totalStr),
            escapeCsvCell(currency),
            escapeCsvCell(codAmount),
            escapeCsvCell(item.name),
            escapeCsvCell(item.variant || 'Standard'),
            escapeCsvCell(item.quantity || 1),
            escapeCsvCell(item.sku || ''),
          ].join(',')
        );
      }
    }
  }

  return '\uFEFF' + rows.join('\r\n');
}

function formatBatchTextSummary(log: FulfillmentDispatchLog): string {
  const sentIso = log.sentAt || log.sent_at;
  const roDate = formatRomaniaDateTime(sentIso);
  const triggerLabel =
    log.trigger === 'scheduled_8am'
      ? `Automat (${formatRomaniaTime(sentIso)} RO)`
      : 'Manual';
  const recipient = log.recipient || log.recipient_email || '';
  const cc = log.secondaryRecipient || log.secondary_email;
  const snapshots = getLogSnapshots(log);

  const lines: string[] = [
    `RAPORT FULFILLMENT - ${roDate} (Europe/Bucharest)`,
    `Mod: ${triggerLabel} | Status: ${log.status.toUpperCase()}`,
    `Destinatar: ${recipient}${cc ? ` | CC: ${cc}` : ''}`,
    log.subject ? `Subiect: ${log.subject}` : '',
    `Comenzi: ${log.orderCount ?? log.order_count} | Articole: ${log.totalItemsCount ?? 0}`,
    '---',
  ].filter(Boolean);

  for (const o of snapshots) {
    const isCod = String(o.paymentMethod || '').toLowerCase() === 'cod';
    const paymentLabel = isCod
      ? `RAMBURS ${Number(o.totalAmount || 0).toFixed(2)} ${o.currency}`
      : `CARD (${Number(o.totalAmount || 0).toFixed(2)} ${o.currency})`;
    const itemsText = (o.items || [])
      .map((it) => `${it.quantity}x ${it.name}${it.variant ? ` (${it.variant})` : ''}${it.sku ? ` [${it.sku}]` : ''}`)
      .join(', ');
    lines.push(
      `• ${o.orderNumber} | ${o.customerName} | ${o.city}, ${o.country} (${o.shippingType === 'pudo' ? 'Locker' : 'HD'}) | ${paymentLabel} -> ${itemsText}`
    );
  }

  return lines.join('\n');
}

export function FulfillmentReportView({
  logs: controlledLogs,
  loading: controlledLoading,
  settings: controlledSettings,
  pendingCount: controlledPendingCount,
  queueOverview: controlledQueueOverview,
  onRefresh,
  compact = false,
}: FulfillmentReportViewProps) {
  const isControlled = controlledLogs !== undefined;

  const [internalLogs, setInternalLogs] = useState<FulfillmentDispatchLog[]>([]);
  const [internalLoading, setInternalLoading] = useState(!isControlled);
  const [internalSettings, setInternalSettings] = useState<FulfillmentSettings | null>(null);
  const [internalPendingCount, setInternalPendingCount] = useState<number>(0);
  const [internalQueueOverview, setInternalQueueOverview] = useState<FulfillmentQueueOverview | null>(null);

  const [now, setNow] = useState<Date>(() => new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | '7d' | '30d' | 'custom'>('all');
  const [customDate, setCustomDate] = useState('');
  const [triggerFilter, setTriggerFilter] = useState<'all' | 'scheduled_8am' | 'manual'>('all');
  const [expandedBatchIds, setExpandedBatchIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadStandaloneData = async () => {
    setInternalLoading(true);
    try {
      const [hist, sett, overview] = await Promise.all([
        getFulfillmentHistory(),
        getFulfillmentSettings(),
        getFulfillmentQueueOverview(),
      ]);
      setInternalLogs(hist);
      setInternalSettings(sett);
      setInternalPendingCount(overview.pendingOrders.length);
      setInternalQueueOverview(overview);
    } catch (err) {
      console.error('Error loading fulfillment report:', err);
      toast.error('Nu s-a putut încărca raportul de fulfillment.');
    } finally {
      setInternalLoading(false);
    }
  };

  useEffect(() => {
    if (!isControlled) {
      loadStandaloneData();
    }
  }, [isControlled]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const logs = isControlled ? controlledLogs || [] : internalLogs;
  const loading = isControlled ? Boolean(controlledLoading) : internalLoading;
  const settings = controlledSettings !== undefined ? controlledSettings : internalSettings;
  const pendingCount = controlledPendingCount !== undefined ? controlledPendingCount : internalPendingCount;
  const queueOverview = controlledQueueOverview !== undefined ? controlledQueueOverview : internalQueueOverview;

  // Auto-expand the most recent batch once logs arrive
  useEffect(() => {
    if (logs.length > 0 && expandedBatchIds.size === 0) {
      setExpandedBatchIds(new Set([logs[0].id]));
    }
  }, [logs.length]);

  const lastSuccessfulSentAt = useMemo(() => {
    const lastSent = logs.find((l) => l.status !== 'failed');
    return settings?.last_dispatched_at || lastSent?.sentAt || lastSent?.sent_at || null;
  }, [logs, settings?.last_dispatched_at]);

  const scheduleInfo = useMemo(
    () =>
      getFulfillmentScheduleInfo({
        now,
        lastDispatchedAt: lastSuccessfulSentAt,
        autoDispatchEnabled: settings?.auto_dispatch_enabled ?? true,
      }),
    [now, lastSuccessfulSentAt, settings?.auto_dispatch_enabled]
  );

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const todayRoKey = formatRomaniaDateKey(now);
    const sevenDaysAgoMs = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgoMs = now.getTime() - 30 * 24 * 60 * 60 * 1000;

    return logs.filter((log) => {
      if (triggerFilter !== 'all' && log.trigger !== triggerFilter) {
        return false;
      }

      const sentIso = log.sentAt || log.sent_at;
      const sentMs = new Date(sentIso).getTime();
      const sentRoKey = formatRomaniaDateKey(sentIso);

      if (datePreset === 'today' && sentRoKey !== todayRoKey) return false;
      if (datePreset === '7d' && (!Number.isFinite(sentMs) || sentMs < sevenDaysAgoMs)) return false;
      if (datePreset === '30d' && (!Number.isFinite(sentMs) || sentMs < thirtyDaysAgoMs)) return false;
      if (datePreset === 'custom' && customDate && sentRoKey !== customDate) return false;

      if (!q) return true;

      const recipient = (log.recipient || log.recipient_email || '').toLowerCase();
      const cc = (log.secondaryRecipient || log.secondary_email || '').toLowerCase();
      const subject = (log.subject || '').toLowerCase();
      const orderNums = (log.orderNumbers || []).join(' ').toLowerCase();
      if (
        recipient.includes(q) ||
        cc.includes(q) ||
        subject.includes(q) ||
        orderNums.includes(q) ||
        log.id.toLowerCase().includes(q)
      ) {
        return true;
      }

      const snapshots = getLogSnapshots(log);
      return snapshots.some((o) => {
        if (
          (o.orderNumber || '').toLowerCase().includes(q) ||
          (o.customerName || '').toLowerCase().includes(q) ||
          (o.city || '').toLowerCase().includes(q) ||
          (o.country || '').toLowerCase().includes(q)
        ) {
          return true;
        }
        return (o.items || []).some(
          (it) =>
            (it.name || '').toLowerCase().includes(q) ||
            (it.variant || '').toLowerCase().includes(q) ||
            (it.sku || '').toLowerCase().includes(q)
        );
      });
    });
  }, [logs, searchQuery, datePreset, customDate, triggerFilter, now]);

  const summaryStats = useMemo(() => {
    let sentBatches = 0;
    let partialBatches = 0;
    let failedBatches = 0;
    let totalOrders = 0;
    let totalItems = 0;

    for (const log of filteredLogs) {
      if (log.status === 'failed') {
        failedBatches++;
        continue;
      }
      if (log.status === 'partial') partialBatches++;
      else sentBatches++;

      const snapshots = getLogSnapshots(log);
      const count = snapshots.length > 0 ? snapshots.length : Number(log.orderCount ?? log.order_count ?? 0);
      const itemsCount =
        snapshots.length > 0
          ? snapshots.reduce(
              (acc, o) => acc + (o.items || []).reduce((s, it) => s + (Number(it.quantity) || 1), 0),
              0
            )
          : Number(log.totalItemsCount ?? 0);

      totalOrders += count;
      totalItems += itemsCount;
    }

    const latestSuccessful = filteredLogs.find((l) => l.status !== 'failed') || filteredLogs[0] || null;

    return {
      totalEmails: filteredLogs.length,
      sentBatches,
      partialBatches,
      failedBatches,
      totalOrders,
      totalItems,
      latestSuccessful,
    };
  }, [filteredLogs]);

  const toggleBatch = (id: string) => {
    setExpandedBatchIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRefresh = async () => {
    if (onRefresh) {
      await onRefresh();
    } else {
      await loadStandaloneData();
    }
  };

  const handleCopyBatch = (log: FulfillmentDispatchLog) => {
    const text = formatBatchTextSummary(log);
    navigator.clipboard.writeText(text);
    setCopiedId(log.id);
    toast.success('Raportul lotului a fost copiat.');
    setTimeout(() => setCopiedId((prev) => (prev === log.id ? null : prev)), 2000);
  };

  const handleCopyAllFiltered = () => {
    if (filteredLogs.length === 0) {
      toast.error('Nu există loturi de copiat pentru filtrul curent.');
      return;
    }
    const text = filteredLogs.map(formatBatchTextSummary).join('\n\n====================================\n\n');
    navigator.clipboard.writeText(text);
    setCopiedId('all');
    toast.success(`Raportul (${filteredLogs.length} emailuri) a fost copiat.`);
    setTimeout(() => setCopiedId((prev) => (prev === 'all' ? null : prev)), 2000);
  };

  const handleExportCsv = (targetLogs: FulfillmentDispatchLog[], filenameSuffix: string) => {
    if (targetLogs.length === 0) {
      toast.error('Nu există date de exportat în CSV.');
      return;
    }
    const csv = buildReportCsv(targetLogs);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `raport_fulfillment_${filenameSuffix}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Fișierul CSV a fost descărcat.');
  };

  return (
    <div className="space-y-4 w-full min-w-0">
      {/* Live Romania Time Auto-Dispatch Schedule Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                scheduleInfo.autoDispatchEnabled
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}
            >
              <Clock size={18} />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs sm:text-sm font-black text-slate-900">
                  Trimitere Automată Zilnică: ora {scheduleInfo.todayTimeRo} (ora României)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  06:00 UTC · {scheduleInfo.timezoneOffsetLabel}
                </span>
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    scheduleInfo.autoDispatchEnabled
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  {scheduleInfo.autoDispatchEnabled ? 'Cron Activ' : 'Cron Oprit'}
                </span>
              </div>
              <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>
                  Următorul lot programat:{' '}
                  <strong className="text-slate-900">
                    {scheduleInfo.nextDayLabelRo}, {scheduleInfo.nextTimeRo}
                  </strong>{' '}
                  <span className="text-slate-500">({scheduleInfo.countdownLabel})</span>
                </span>
                <span className="hidden sm:inline text-slate-300">|</span>
                <span
                  className={
                    scheduleInfo.todayBatchRan ? 'text-emerald-700 font-semibold' : 'text-slate-600 font-medium'
                  }
                >
                  {scheduleInfo.todayBatchStatusLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
              <Package size={13} className="text-emerald-600" />
              <span>Eligibile (În stoc): {queueOverview ? queueOverview.pendingOrders.length : pendingCount}</span>
            </span>
            {queueOverview && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-900">
                <AlertCircle size={13} className="text-amber-600" />
                <span>Blocate (Precomandă / Stoc): {queueOverview.blockedOrders.length}</span>
              </span>
            )}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-60"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Actualizează</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Queue Verification Panel (Eligible In-Stock vs Blocked Preorder/Out-of-Stock) */}
      {!compact && queueOverview && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="bg-white border border-emerald-200 rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" />
                Eligibile pentru Fulfillment (În stoc curent)
              </span>
              <span className="text-[11px] font-black bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                {queueOverview.pendingOrders.length} {queueOverview.pendingOrders.length === 1 ? 'comandă' : 'comenzi'}
              </span>
            </div>
            {queueOverview.pendingOrders.length === 0 ? (
              <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3">
                Nicio comandă eligibilă cu toate produsele fizice în stoc curent.
              </div>
            ) : (
              <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                {queueOverview.pendingOrders.map((o) => (
                  <div key={o.supabaseId || o.id} className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100 text-xs space-y-0.5">
                    <div className="flex items-center justify-between gap-2 font-black text-slate-900">
                      <span>{o.id} · {o.customer}</span>
                      <span className="text-[11px] text-emerald-800 shrink-0">{o.city}, {o.country}</span>
                    </div>
                    <div className="text-[11px] text-slate-700 font-medium">
                      {o.items.map((it) => `${it.quantity}x ${it.name}${it.variant ? ` (${it.variant})` : ''}`).join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-amber-200 rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                <Clock size={14} className="text-amber-600" />
                Reținute / Blocate (Precomandă / Lipsă stoc curent)
              </span>
              <span className="text-[11px] font-black bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full">
                {queueOverview.blockedOrders.length} {queueOverview.blockedOrders.length === 1 ? 'blocată' : 'blocate'}
              </span>
            </div>
            {queueOverview.blockedOrders.length === 0 ? (
              <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3">
                Nicio comandă blocată de precomandă sau stoc insuficient.
              </div>
            ) : (
              <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                {queueOverview.blockedOrders.map((bo) => (
                  <div key={bo.supabaseId || bo.id} className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs space-y-1">
                    <div className="flex items-center justify-between gap-2 font-black text-slate-900">
                      <span>{bo.id} · {bo.customer}</span>
                      <span className="text-[11px] text-slate-600 shrink-0">{bo.city}, {bo.country}</span>
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
          </div>
        </div>
      )}

      {/* 4 Daily Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs min-w-0">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 truncate">
            Emailuri Trimise
          </div>
          <div className="text-xl font-black text-slate-900 mt-0.5 tabular-nums">
            {summaryStats.totalEmails}
          </div>
          <div className="text-[11px] font-medium text-slate-500 mt-0.5 truncate">
            {summaryStats.sentBatches} ok
            {summaryStats.partialBatches > 0 ? ` · ${summaryStats.partialBatches} parțiale` : ''}
            {summaryStats.failedBatches > 0 ? ` · ${summaryStats.failedBatches} eșuate` : ''}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs min-w-0">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 truncate">
            Comenzi Expediate
          </div>
          <div className="text-xl font-black text-emerald-700 mt-0.5 tabular-nums">
            {summaryStats.totalOrders}
          </div>
          <div className="text-[11px] font-medium text-slate-500 mt-0.5 truncate">
            Exclusiv comenzi fizice
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs min-w-0">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 truncate">
            Produse Totale
          </div>
          <div className="text-xl font-black text-[#e32f8c] mt-0.5 tabular-nums">
            {summaryStats.totalItems} <span className="text-xs font-bold text-slate-500">buc.</span>
          </div>
          <div className="text-[11px] font-medium text-slate-500 mt-0.5 truncate">
            Articole expediate depozit
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs min-w-0">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 truncate">
            Ultimul Dispatch (Ora RO)
          </div>
          <div className="text-sm sm:text-base font-black text-slate-900 mt-1 truncate">
            {summaryStats.latestSuccessful
              ? formatRomaniaDateTime(summaryStats.latestSuccessful.sentAt || summaryStats.latestSuccessful.sent_at)
              : 'Niciun lot'}
          </div>
          <div className="text-[11px] font-medium text-slate-500 mt-0.5 truncate">
            {summaryStats.latestSuccessful
              ? `${summaryStats.latestSuccessful.trigger === 'scheduled_8am' ? 'Automat' : 'Manual'} · ${summaryStats.latestSuccessful.recipient || summaryStats.latestSuccessful.recipient_email}`
              : 'Europe/Bucharest'}
          </div>
        </div>
      </div>

      {/* Search, Date Filter & Export Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">
          <div className="relative flex-1 min-w-0">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Caută nr. comandă (TZ), client, oraș, produs, SKU, destinatar..."
              className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#e32f8c] focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                aria-label="Șterge căutarea"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value as any)}
              aria-label="Filtru perioadă"
              className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#e32f8c] cursor-pointer"
            >
              <option value="all">Toate datele</option>
              <option value="today">Astăzi (RO)</option>
              <option value="7d">Ultimele 7 zile</option>
              <option value="30d">Ultimele 30 zile</option>
              <option value="custom">Dată exactă</option>
            </select>

            {datePreset === 'custom' && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#e32f8c]"
              />
            )}

            <select
              value={triggerFilter}
              onChange={(e) => setTriggerFilter(e.target.value as any)}
              aria-label="Filtru mod trimitere"
              className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#e32f8c] cursor-pointer"
            >
              <option value="all">Toate tipurile</option>
              <option value="scheduled_8am">Automat</option>
              <option value="manual">Manual</option>
            </select>

            <button
              type="button"
              onClick={handleCopyAllFiltered}
              className="h-10 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedId === 'all' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              <span>Copiază</span>
            </button>

            <button
              type="button"
              onClick={() => handleExportCsv(filteredLogs, formatRomaniaDateKey(now) || 'raport')}
              className="h-10 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileSpreadsheet size={14} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Daily Email Batches List */}
      {loading ? (
        <div className="p-10 text-center bg-white rounded-2xl border border-slate-200">
          <Loader2 size={24} className="animate-spin text-[#e32f8c] mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-500">Se încarcă raportul zilnic de fulfillment...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
          <History size={30} className="text-slate-300 mx-auto" />
          <h4 className="text-sm font-bold text-slate-700">Nicio expediere găsită</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {logs.length === 0
              ? `Emailurile trimise automat la ora ${scheduleInfo.todayTimeRo} (ora României) sau manual prin butonul Trimite Acum vor apărea aici cu detaliile complete.`
              : 'Încearcă să ajustezi căutarea sau filtrul de dată.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => {
            const isExpanded = expandedBatchIds.has(log.id);
            const sentIso = log.sentAt || log.sent_at;
            const roDateTime = formatRomaniaDateTime(sentIso);
            const roTime = formatRomaniaTime(sentIso);
            const recipient = log.recipient || log.recipient_email || 'Nesetat';
            const secondary = log.secondaryRecipient || log.secondary_email;
            const snapshots = getLogSnapshots(log);
            const orderCount = snapshots.length > 0 ? snapshots.length : Number(log.orderCount ?? log.order_count ?? 0);
            const totalItemsCount =
              snapshots.length > 0
                ? snapshots.reduce(
                    (acc, o) => acc + (o.items || []).reduce((s, it) => s + (Number(it.quantity) || 1), 0),
                    0
                  )
                : Number(log.totalItemsCount ?? 0);

            // Picking summary for this batch
            const pickingMap = new Map<string, { name: string; variant?: string; quantity: number }>();
            for (const o of snapshots) {
              for (const it of o.items || []) {
                const key = `${it.name}__${it.variant || ''}`;
                const qty = Number(it.quantity) || 1;
                const prev = pickingMap.get(key);
                if (prev) prev.quantity += qty;
                else pickingMap.set(key, { name: it.name, variant: it.variant, quantity: qty });
              }
            }
            const pickingSummary = Array.from(pickingMap.values()).sort((a, b) => b.quantity - a.quantity);

            return (
              <div
                key={log.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden"
              >
                {/* Batch Header */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleBatch(log.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleBatch(log.id);
                    }
                  }}
                  className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${
                        log.status === 'failed'
                          ? 'bg-red-50 text-red-600 border-red-200'
                          : log.status === 'partial' || log.error_message
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {log.status === 'failed' || log.status === 'partial' || log.error_message ? (
                        <AlertCircle size={18} />
                      ) : (
                        <CheckCircle2 size={18} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-black text-slate-900">
                          {roDateTime} <span className="text-[11px] font-bold text-slate-400">RO</span>
                        </span>

                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                            log.trigger === 'scheduled_8am'
                              ? 'bg-sky-50 text-sky-800 border-sky-200'
                              : 'bg-purple-50 text-purple-800 border-purple-200'
                          }`}
                        >
                          {log.trigger === 'scheduled_8am' ? `Auto (${roTime || scheduleInfo.todayTimeRo})` : 'Manual'}
                        </span>

                        {log.status === 'failed' ? (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200">
                            Eșuat
                          </span>
                        ) : log.status === 'partial' ? (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                            Parțial
                          </span>
                        ) : (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Trimis
                          </span>
                        )}

                        <span className="text-[11px] font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                          {orderCount} {orderCount === 1 ? 'comandă' : 'comenzi'} · {totalItemsCount} buc.
                        </span>

                        {log.excludedPreorders > 0 && (
                          <span className="text-[10px] font-bold text-violet-800 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-md">
                            {log.excludedPreorders} precomenzi reținute
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
                        <span className="inline-flex items-center gap-1 min-w-0">
                          <Mail size={11} className="text-slate-400 shrink-0" />
                          <span className="truncate">
                            Către: <strong className="text-slate-800">{recipient}</strong>
                          </span>
                        </span>
                        {secondary && (
                          <span className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded font-semibold text-[10px]">
                            <ShieldCheck size={10} />
                            <span>CC: {secondary}</span>
                          </span>
                        )}
                      </div>

                      {log.subject && (
                        <div className="text-[11px] font-mono text-slate-600 bg-slate-50 border border-slate-200/80 px-2 py-1 rounded-lg truncate max-w-full">
                          {log.subject}
                        </div>
                      )}

                      {log.error_message && (
                        <div className="text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg">
                          {log.error_message}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-0 border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyBatch(log);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                        title="Copiază rezumatul lotului"
                      >
                        {copiedId === log.id ? (
                          <Check size={12} className="text-emerald-600" />
                        ) : (
                          <Copy size={12} />
                        )}
                        <span>Copiază</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportCsv([log], log.id);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                        title="Descarcă CSV pentru acest lot"
                      >
                        <Download size={12} />
                        <span>CSV</span>
                      </button>
                    </div>

                    <div className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 pl-1">
                      <span className="hidden sm:inline">{isExpanded ? 'Ascunde' : 'Detalii'}</span>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                </div>

                {/* Expanded Batch Details */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50/70 p-3.5 sm:p-4 space-y-3.5">
                    {/* Picking List Pills */}
                    {pickingSummary.length > 0 && (
                      <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-500">
                          <span className="inline-flex items-center gap-1.5">
                            <Layers size={13} className="text-[#e32f8c]" />
                            <span>Sumar Articole Expediate ({totalItemsCount} buc.)</span>
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {pickingSummary.map((p, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
                            >
                              <span className="px-1.5 py-0.2 rounded bg-slate-900 text-white text-[10px] font-black">
                                {p.quantity}x
                              </span>
                              <span>{p.name}</span>
                              {p.variant && (
                                <span className="text-[10px] font-bold text-[#c41a72] bg-pink-50 border border-pink-200 px-1.5 py-0.2 rounded">
                                  {p.variant}
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {snapshots.length === 0 ? (
                      <div className="bg-white border border-slate-200 rounded-xl p-4 text-xs text-slate-500">
                        Detaliile individuale ale comenzilor nu sunt disponibile pentru acest lot istoric.
                        {log.orderNumbers && log.orderNumbers.length > 0 && (
                          <span className="block mt-1 font-mono text-slate-700">
                            Comenzi: {log.orderNumbers.join(', ')}
                          </span>
                        )}
                      </div>
                    ) : (
                      <>
                        {/* PC Table Layout */}
                        <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-hidden">
                          <table className="w-full table-fixed text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-100/80 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                                <th className="py-2.5 px-3 w-[16%]">Comandă</th>
                                <th className="py-2.5 px-3 w-[20%]">Client</th>
                                <th className="py-2.5 px-3 w-[22%]">Destinație</th>
                                <th className="py-2.5 px-3 w-[16%]">Plată / Total</th>
                                <th className="py-2.5 px-3 w-[26%]">Produse & Cantități</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {snapshots.map((o, oIdx) => {
                                const isCod = String(o.paymentMethod || '').toLowerCase() === 'cod';
                                return (
                                  <tr key={o.id || oIdx} className="hover:bg-slate-50/70 align-top">
                                    <td className="py-2.5 px-3 font-mono font-black text-slate-900 break-words">
                                      {o.orderNumber || o.id}
                                    </td>
                                    <td className="py-2.5 px-3 font-bold text-slate-800 break-words">
                                      {o.customerName}
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-600 break-words">
                                      <div className="font-semibold text-slate-800">
                                        {o.city} ({o.country || 'RO'})
                                      </div>
                                      <div className="text-[10px] font-bold uppercase text-slate-400 mt-0.5">
                                        {o.shippingType === 'pudo' ? 'Easybox / Locker' : 'Curier Domiciliu'}
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <div className="font-black text-slate-900 tabular-nums">
                                        {Number(o.totalAmount || 0).toFixed(2)} {o.currency || 'RON'}
                                      </div>
                                      <span
                                        className={`inline-block mt-1 text-[10px] font-black uppercase px-1.5 py-0.5 rounded border ${
                                          isCod
                                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        }`}
                                      >
                                        {isCod ? 'Ramburs' : 'Card'}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <div className="space-y-1">
                                        {(o.items || []).map((it, iIdx) => (
                                          <div key={iIdx} className="flex items-start gap-1.5 text-[11px] text-slate-800">
                                            <span className="px-1.5 py-0.2 rounded bg-slate-900 text-white font-black text-[10px] shrink-0">
                                              {it.quantity}x
                                            </span>
                                            <span className="font-semibold break-words">
                                              {it.name}
                                              {it.variant ? ` (${it.variant})` : ''}
                                              {it.sku ? (
                                                <span className="ml-1 font-mono text-[10px] text-slate-400">
                                                  [{it.sku}]
                                                </span>
                                              ) : null}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile Cards Layout (375px+ safe, zero horizontal overflow) */}
                        <div className="md:hidden space-y-2">
                          {snapshots.map((o, oIdx) => {
                            const isCod = String(o.paymentMethod || '').toLowerCase() === 'cod';
                            return (
                              <div
                                key={o.id || oIdx}
                                className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 text-xs"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-mono font-black text-slate-900 truncate">
                                    {o.orderNumber || o.id}
                                  </span>
                                  <span
                                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border shrink-0 ${
                                      isCod
                                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    }`}
                                  >
                                    {isCod ? 'Ramburs' : 'Card'} · {Number(o.totalAmount || 0).toFixed(2)} {o.currency || 'RON'}
                                  </span>
                                </div>

                                <div className="text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-1">
                                  <strong className="text-slate-800">{o.customerName}</strong>
                                  <span>
                                    {o.city} ({o.country || 'RO'}) ·{' '}
                                    {o.shippingType === 'pudo' ? 'Locker' : 'HD'}
                                  </span>
                                </div>

                                <div className="pt-2 border-t border-slate-100 space-y-1">
                                  {(o.items || []).map((it, iIdx) => (
                                    <div key={iIdx} className="flex items-start gap-1.5 text-[11px] text-slate-800">
                                      <span className="px-1.5 py-0.2 rounded bg-slate-900 text-white font-black text-[10px] shrink-0">
                                        {it.quantity}x
                                      </span>
                                      <span className="font-semibold break-words">
                                        {it.name}
                                        {it.variant ? ` (${it.variant})` : ''}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
