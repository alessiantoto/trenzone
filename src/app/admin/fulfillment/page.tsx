import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Truck } from 'lucide-react';
import { isAdminAuthorized } from '@/app/actions/admin-auth';
import {
  getFulfillmentHistory,
  getFulfillmentQueueOverview,
  getFulfillmentSettings,
} from '@/app/actions/admin-fulfillment';
import { FulfillmentReportView } from '@/components/admin/FulfillmentReportView';

export const dynamic = 'force-dynamic';

export default async function AdminFulfillmentReportPage() {
  const authorized = await isAdminAuthorized();
  if (!authorized) {
    redirect('/admin/login');
  }

  const [history, settings, queueOverview] = await Promise.all([
    getFulfillmentHistory(),
    getFulfillmentSettings(),
    getFulfillmentQueueOverview(),
  ]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5 pb-16 text-slate-900 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-[#e32f8c]/10 border border-[#e32f8c]/20 text-[#008ba3] flex items-center justify-center shrink-0">
            <Truck size={22} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              Raport Zilnic Fulfillment
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Istoricul complet al emailurilor expediate către depozit, produsele incluse și programul exact în ora României.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link
            href="/admin/orders"
            className="min-h-[40px] px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 inline-flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Înapoi la Comenzi</span>
          </Link>
          <Link
            href="/admin/orders?fulfillment=open"
            className="min-h-[40px] px-3.5 py-2 bg-[#e32f8c] hover:bg-[#c41a72] text-white rounded-xl text-xs font-black inline-flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Truck size={14} />
            <span>Centru Fulfillment</span>
          </Link>
        </div>
      </div>

      <FulfillmentReportView
        logs={history}
        settings={settings}
        pendingCount={queueOverview.pendingOrders.length}
        queueOverview={queueOverview}
      />
    </div>
  );
}
