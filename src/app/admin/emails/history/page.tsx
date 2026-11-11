'use client';

import { useState, useEffect } from 'react';
import { Mail, Search, Filter, Calendar, CheckCircle2, XCircle, Eye, X, Clock } from 'lucide-react';
import { getEmailLogs, EmailLog } from '@/app/actions/email-logs';

import { WelcomeDiscountEmail } from '@/components/email/WelcomeDiscountEmail';
import { ReviewEmailTemplate } from '@/components/email/ReviewEmailTemplate';
import { AwbEmailTemplate } from '@/components/email/AwbEmailTemplate';
import { ReturnConfirmationEmail } from '@/components/email/ReturnConfirmationEmail';
import { AffiliateApprovalEmail } from '@/components/email/AffiliateApprovalEmail';
import { BroadcastEmailTemplate } from '@/components/email/BroadcastEmailTemplate';
import { EmailTemplate } from '@/components/email/EmailTemplate';

export default function EmailHistoryPage() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);

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

  const filteredLogs = logs.filter(log => 
    log.recipient.toLowerCase().includes(search.toLowerCase()) || 
    log.subject.toLowerCase().includes(search.toLowerCase()) ||
    log.type.toLowerCase().includes(search.toLowerCase())
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
    <div className="animate-in fade-in zoom-in-95 duration-700 pb-12 text-slate-900 max-w-7xl mx-auto space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl tracking-tight font-bold text-slate-900">Istoric Email-uri</h1>
          <p className="text-sm text-slate-500 mt-1">Jurnalul complet al tuturor mesajelor trimise automat de platformă.</p>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Caută după email, subiect sau tip..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium focus:outline-none focus:border-[#e32f8c] transition-colors"
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
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
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    <Clock className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Se încarcă istoricul...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 font-medium">Nu am găsit niciun email în istoric.</td>
                </tr>
              ) : (
                filteredLogs.map(log => (
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
                      {log.status === 'sent' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-600 rounded-lg text-xs font-bold">
                          <CheckCircle2 size={14} /> Trimis
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-bold" title={log.error_message || ''}>
                          <XCircle size={14} /> Eroare
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PREVIEW MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="text-lg font-black text-slate-900">{selectedLog.subject}</h3>
                <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                  Tris către <strong className="text-slate-700">{selectedLog.recipient}</strong>
                  <span>•</span>
                  {new Date(selectedLog.created_at).toLocaleString('ro-RO')}
                </p>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-300 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body (Preview) */}
            <div className="flex-1 overflow-y-auto bg-slate-100 p-8 flex justify-center">
              <div className="bg-white w-full max-w-[600px] shadow-sm rounded-lg overflow-hidden border border-slate-200" style={{ fontFamily: 'sans-serif' }}>
                {renderEmailPreview(selectedLog)}
              </div>
            </div>
            
            {/* Error Message if failed */}
            {selectedLog.status === 'failed' && selectedLog.error_message && (
              <div className="p-4 bg-red-50 border-t border-red-100 text-red-600 text-sm font-medium flex items-center gap-2">
                <XCircle size={16} />
                Eroare: {selectedLog.error_message}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
