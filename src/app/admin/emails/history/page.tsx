'use client';

import { useState, useEffect, useMemo } from 'react';
import { Mail, Search, Calendar, CheckCircle2, XCircle, X, RefreshCw, Send, AlertTriangle, Loader2 } from 'lucide-react';
import {
  getEmailLogs,
  resendSingleEmailLogAction,
  resendBatchFailedEmailsAction,
  EmailLog,
} from '@/app/actions/email-logs';
import toast from 'react-hot-toast';

import { WelcomeDiscountEmail } from '@/components/email/WelcomeDiscountEmail';
import { ReviewEmailTemplate } from '@/components/email/ReviewEmailTemplate';
import { AwbEmailTemplate } from '@/components/email/AwbEmailTemplate';
import { ReturnConfirmationEmail } from '@/components/email/ReturnConfirmationEmail';
import { AffiliateApprovalEmail } from '@/components/email/AffiliateApprovalEmail';
import { BroadcastEmailTemplate } from '@/components/email/BroadcastEmailTemplate';
import { AdminPagination } from '@/components/admin/AdminPagination';

const CRITICAL_TYPES = new Set([
  'order-confirmation',
  'preorder-confirmation',
  'program-delivery',
  'program-pending',
  'awb-tracking',
  'return-confirmation',
  'affiliate-approval',
  'review-discount',
]);

export default function EmailHistoryPage() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'failed'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState<'critical' | 'secondary' | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/data?action=email-logs', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setLogs(json.data);
          return;
        }
      }
      const data = await getEmailLogs();
      setLogs(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const failedStats = useMemo(() => {
    const sentKeys = new Set<string>();
    const critKeys = new Set<string>();
    const secKeys = new Set<string>();
    for (const l of logs) {
      const orderNum = l.metadata?.orderData?.id || l.metadata?.orderId || '';
      const key = `${String(l.recipient || '').trim().toLowerCase()}|${l.type}|${orderNum}`;
      if (l.status === 'sent') {
        sentKeys.add(key);
      }
    }
    for (const l of logs) {
      if (l.status === 'sent') continue;
      const orderNum = l.metadata?.orderData?.id || l.metadata?.orderId || '';
      const key = `${String(l.recipient || '').trim().toLowerCase()}|${l.type}|${orderNum}`;
      if (sentKeys.has(key)) continue;
      if (CRITICAL_TYPES.has(l.type)) critKeys.add(key);
      else if (l.type === 'affiliate-application') secKeys.add(key);
    }
    return { criticalCount: critKeys.size, secondaryCount: secKeys.size };
  }, [logs]);

  const handleResendSingle = async (log: EmailLog, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (resendingId || batchLoading) return;
    setResendingId(log.id);
    try {
      const res = await resendSingleEmailLogAction(log.id);
      if (res.success) {
        toast.success(res.message || `Retrimis către ${log.recipient}`);
        if (selectedLog?.id === log.id) setSelectedLog(null);
        await fetchLogs();
      } else {
        toast.error(res.error || 'Eroare la retrimitere.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Eroare la retrimitere.');
    } finally {
      setResendingId(null);
    }
  };

  const handleBatchResend = async (scope: 'critical' | 'secondary') => {
    if (batchLoading || resendingId) return;
    setBatchLoading(scope);
    try {
      const res = await resendBatchFailedEmailsAction(scope, scope === 'critical' ? 50 : 40);
      if (res.sentCount > 0) {
        toast.success(res.message, { duration: 6000 });
      } else {
        toast.error(res.message, { duration: 6000 });
      }
      await fetchLogs();
    } catch (err: any) {
      toast.error(err?.message || 'Eroare la retrimiterea în lot.');
    } finally {
      setBatchLoading(null);
    }
  };

  const filteredLogs = logs.filter(log => {
    const q = search.toLowerCase();
    const matchesSearch =
      log.recipient.toLowerCase().includes(q) ||
      log.subject.toLowerCase().includes(q) ||
      log.type.toLowerCase().includes(q);
    if (!matchesSearch) return false;
    if (statusFilter === 'sent') return log.status === 'sent';
    if (statusFilter === 'failed') return log.status !== 'sent';
    return true;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const safeCurrentPage = Math.min(currentPage, Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage)));
  const paginatedLogs = useMemo(
    () => filteredLogs.slice((safeCurrentPage - 1) * itemsPerPage, safeCurrentPage * itemsPerPage),
    [filteredLogs, safeCurrentPage, itemsPerPage]
  );

  const getLogTypeBadge = (type: string) => {
    switch (type) {
      case 'welcome-discount': return <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-[10px] font-bold uppercase tracking-wider">Welcome</span>;
      case 'order-confirmation': return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-[10px] font-bold uppercase tracking-wider">Order</span>;
      case 'preorder-confirmation': return <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-md text-[10px] font-bold uppercase tracking-wider">Precomandă</span>;
      case 'review-request': return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-md text-[10px] font-bold uppercase tracking-wider">Review</span>;
      case 'awb-tracking': return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-[10px] font-bold uppercase tracking-wider">AWB</span>;
      case 'broadcast': return <span className="px-2 py-1 bg-pink-100 text-pink-700 rounded-md text-[10px] font-bold uppercase tracking-wider">Broadcast</span>;
      default: return <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold uppercase tracking-wider">{type}</span>;
    }
  };

  const renderEmailPreview = (log: EmailLog) => {
    try {
      switch (log.type) {
        case 'welcome-discount':
          return <WelcomeDiscountEmail customerName={log.metadata?.customerName} locale={log.metadata?.locale || 'ro'} />;
        case 'review-request':
          return <ReviewEmailTemplate 
            orderId={log.metadata?.orderData?.id} 
            customerName={log.metadata?.orderData?.billing?.first_name || 'Client'} 
            items={log.metadata?.orderData?.line_items || []} 
            locale={log.metadata?.orderData?.meta_data?.find((m: any) => m.key === '_locale')?.value || 'ro'} 
          />;
        case 'awb-tracking':
          return <AwbEmailTemplate 
            orderId={log.metadata?.orderData?.id} 
            customerName={log.metadata?.orderData?.billing?.first_name || 'Client'} 
            trackingNumber={log.metadata?.trackingNumber} 
            courier={log.metadata?.courier} 
            locale={log.metadata?.orderData?.meta_data?.find((m: any) => m.key === '_locale')?.value || 'ro'} 
          />;
        case 'return-confirmation':
          return <ReturnConfirmationEmail orderId={log.metadata?.orderId} customerName={log.metadata?.customerName} locale={log.metadata?.locale || 'ro'} />;
        case 'affiliate-approval':
          return <AffiliateApprovalEmail name={log.metadata?.name} code={log.metadata?.code} locale={log.metadata?.locale || 'ro'} loginUrl={log.metadata?.loginUrl} />;
        case 'broadcast':
          return <BroadcastEmailTemplate 
            title={log.metadata?.content?.title || ''}
            message={log.metadata?.content?.message || ''}
            ctaText={log.metadata?.content?.ctaText}
            ctaLink={log.metadata?.content?.ctaLink}
            imageUrl={log.metadata?.content?.imageUrl}
          />;
        case 'order-confirmation':
          // For order confirmation we'd need the async generated content normally,
          // but we can pass a dummy or just show the metadata structure if it fails.
          return (
            <div className="p-8 text-center text-slate-500">
              <p className="mb-4">Previzualizarea completă pentru confirmare comandă necesită procesare asincronă.</p>
              <pre className="text-left bg-slate-100 p-4 rounded-lg text-xs overflow-auto">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          );
        default:
          return (
            <div className="p-8 text-center text-slate-500">
              <pre className="text-left bg-slate-100 p-4 rounded-lg text-xs overflow-auto">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          );
      }
    } catch (err) {
      return <div className="p-8 text-red-500">Eroare la randarea preview-ului. Vezi datele brute în consolă.</div>;
    }
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-700 pb-12 text-slate-900 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl tracking-tight font-black text-slate-900">Istoric Email-uri</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Jurnalul complet al tuturor mesajelor trimise automat de platformă.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {failedStats.criticalCount > 0 && (
            <button
              type="button"
              onClick={() => handleBatchResend('critical')}
              disabled={Boolean(batchLoading) || loading}
              className="w-full sm:w-auto min-h-[40px] px-4 py-2 rounded-xl bg-[#e32f8c] hover:bg-[#c9247a] active:scale-[0.98] text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50 shrink-0"
            >
              {batchLoading === 'critical' ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              <span>
                {batchLoading === 'critical'
                  ? 'Se retrimit criticele...'
                  : `Retrimite Critice (${failedStats.criticalCount})`}
              </span>
            </button>
          )}
          {failedStats.secondaryCount > 0 && (
            <button
              type="button"
              onClick={() => handleBatchResend('secondary')}
              disabled={Boolean(batchLoading) || loading}
              className="w-full sm:w-auto min-h-[40px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50 shrink-0"
            >
              {batchLoading === 'secondary' ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              <span>
                {batchLoading === 'secondary'
                  ? 'Se retrimit...'
                  : `Retrimite Aplicații Afiliat (max 40 din ${failedStats.secondaryCount})`}
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={() => { if (!loading) fetchLogs(); }}
            disabled={loading || Boolean(batchLoading)}
            className="w-full sm:w-auto min-h-[40px] px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 active:scale-[0.98] text-slate-700 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Se actualizează...' : 'Reîmprospătează'}</span>
          </button>
        </div>
      </div>

      {(failedStats.criticalCount > 0 || failedStats.secondaryCount > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
            <div className="text-xs sm:text-sm text-amber-950 leading-relaxed">
              <p className="font-black">
                Ai {failedStats.criticalCount} emailuri critice (comenzi, programe PDF, aprobări afiliați, retururi) și {failedStats.secondaryCount} cereri afiliați netrimise (welcome exclus din lot).
              </p>
              <p className="text-amber-800 mt-0.5">
                Trimite întâi <strong>Critice</strong> ca să nu consumi limita zilnică Resend (100/zi pe planul gratuit) pe emailurile secundare.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* FILTER BAR */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-3 sm:gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Caută după email, subiect sau tip..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 text-base sm:text-sm font-medium focus:outline-none focus:border-[#e32f8c] transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 md:flex items-center gap-1 p-1 bg-slate-100 rounded-xl shrink-0">
          {[
            { id: 'all', label: `Toate (${logs.length})` },
            { id: 'sent', label: 'Trimise' },
            { id: 'failed', label: 'Erori' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id as 'all' | 'sent' | 'failed')}
              className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* LOGS LIST / TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl shadow-sm overflow-hidden">
        {/* MOBILE CARDS VIEW */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            [...Array(5)].map((_, idx) => (
              <div key={idx} className="p-4 space-y-2.5 animate-pulse">
                <div className="flex items-center justify-between gap-2">
                  <div className="h-5 w-20 bg-slate-200 rounded-md" />
                  <div className="h-6 w-16 bg-slate-200 rounded-lg" />
                </div>
                <div className="h-4 bg-slate-200 rounded-lg w-4/5" />
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="h-3.5 bg-slate-100 rounded w-40" />
                  <div className="h-3.5 bg-slate-100 rounded w-24" />
                </div>
              </div>
            ))
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm font-medium">
              Nu am găsit niciun email în istoric.
            </div>
          ) : (
            paginatedLogs.map(log => (
              <div
                key={log.id}
                onClick={() => setSelectedLog(log)}
                className="p-4 space-y-2.5 active:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2">
                  {getLogTypeBadge(log.type)}
                  <div className="flex items-center gap-2">
                    {log.status === 'sent' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 rounded-lg text-[11px] font-bold shrink-0">
                        <CheckCircle2 size={13} /> Trimis
                      </span>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 rounded-lg text-[11px] font-bold shrink-0">
                          <XCircle size={13} /> Eroare
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleResendSingle(log, e)}
                          disabled={resendingId === log.id || Boolean(batchLoading)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900 text-white rounded-lg text-[11px] font-bold hover:bg-[#e32f8c] transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {resendingId === log.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                          Retrimite
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <p className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
                  {log.subject}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700 min-w-0 truncate max-w-full">
                    <Mail size={13} className="text-slate-400 shrink-0" />
                    <span className="truncate">{log.recipient}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
                    <Calendar size={12} />
                    {new Date(log.created_at).toLocaleString('ro-RO')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* DESKTOP TABLE VIEW */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Data / Ora</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Destinatar</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Subiect</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tip</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, idx) => (
                  <tr key={idx} className="border-b border-slate-50 last:border-0 animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 w-32 bg-slate-100 rounded-lg" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-44 bg-slate-200 rounded-lg" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-56 bg-slate-200 rounded-lg" /></td>
                    <td className="px-6 py-4"><div className="h-5 w-20 bg-slate-100 rounded-md" /></td>
                    <td className="px-6 py-4 text-right"><div className="h-6 w-16 bg-slate-200 rounded-lg ml-auto" /></td>
                  </tr>
                ))
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 font-medium">Nu am găsit niciun email în istoric.</td>
                </tr>
              ) : (
                paginatedLogs.map(log => (
                  <tr 
                    key={log.id} 
                    onClick={() => setSelectedLog(log)}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Calendar size={14} />
                        {new Date(log.created_at).toLocaleString('ro-RO')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Mail className="text-slate-300 group-hover:text-[#e32f8c] transition-colors" size={16} />
                        <span className="text-sm font-bold text-slate-700">{log.recipient}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-900 line-clamp-1">{log.subject}</span>
                    </td>
                    <td className="px-6 py-4">
                      {getLogTypeBadge(log.type)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        {log.status === 'sent' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-600 rounded-lg text-xs font-bold">
                            <CheckCircle2 size={14} /> Trimis
                          </span>
                        ) : (
                          <>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-bold" title={log.error_message || ''}>
                              <XCircle size={14} /> Eroare
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleResendSingle(log, e)}
                              disabled={resendingId === log.id || Boolean(batchLoading)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-white hover:bg-[#e32f8c] rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {resendingId === log.id ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                              Retrimite
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && filteredLogs.length > itemsPerPage && (
          <div className="px-4 sm:px-6 pb-4">
            <AdminPagination
              currentPage={safeCurrentPage}
              totalItems={filteredLogs.length}
              itemsPerPage={itemsPerPage}
              onPageChange={(p) => {
                setCurrentPage(p);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              label="emailuri"
            />
          </div>
        )}
      </div>

      {/* PREVIEW MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start sm:items-center justify-between gap-3 p-4 sm:p-6 border-b border-slate-100 bg-slate-50">
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-black text-slate-900 break-words">{selectedLog.subject}</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span>Trimis către <strong className="text-slate-700 break-all">{selectedLog.recipient}</strong></span>
                  <span className="hidden sm:inline">•</span>
                  <span>{new Date(selectedLog.created_at).toLocaleString('ro-RO')}</span>
                </p>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-300 transition-all cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body (Preview) */}
            <div className="flex-1 overflow-y-auto overflow-x-auto bg-slate-100 p-2.5 sm:p-8 flex justify-center">
              <div className="bg-white w-full max-w-[600px] shadow-sm rounded-lg overflow-hidden border border-slate-200 h-fit" style={{ fontFamily: 'sans-serif' }}>
                {renderEmailPreview(selectedLog)}
              </div>
            </div>
            
            {/* Error Message + Resend action if failed */}
            {selectedLog.status !== 'sent' && (
              <div className="p-4 bg-red-50 border-t border-red-100 text-red-600 text-sm font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <XCircle size={16} className="shrink-0" />
                  <span className="break-words">Eroare: {selectedLog.error_message || 'Trimitere eșuată'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleResendSingle(selectedLog)}
                  disabled={resendingId === selectedLog.id || Boolean(batchLoading)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#e32f8c] hover:bg-[#c9247a] text-white rounded-xl text-xs font-black transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {resendingId === selectedLog.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Retrimite Email
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
