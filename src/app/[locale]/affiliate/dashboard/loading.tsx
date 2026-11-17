export default function AffiliateDashboardLoading() {
  return (
    <div className="min-h-screen bg-white text-slate-900 pb-24 pt-24 sm:pt-28">
      <main className="container mx-auto px-4 sm:px-6 max-w-6xl space-y-8">
        {/* In-Page Header Bar Skeleton */}
        <div className="bg-white border border-slate-200/90 rounded-2xl px-5 sm:px-6 py-4 shadow-sm flex items-center justify-between">
          <div className="h-8 w-48 rounded-full bg-[#e32f8c]/15 animate-pulse" />
          <div className="h-9 w-24 rounded-xl bg-red-50 border border-red-100 animate-pulse" />
        </div>

        {/* Hero Identity Card Skeleton */}
        <div className="rounded-3xl p-6 sm:p-8 md:p-10 border border-slate-200/90 bg-white shadow-md">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="space-y-3 w-full lg:w-1/2">
              <div className="h-3.5 w-40 rounded bg-slate-200 animate-pulse" />
              <div className="h-9 sm:h-11 w-64 rounded-xl bg-slate-200 animate-pulse" />
              <div className="h-4 w-full max-w-md rounded bg-slate-100 animate-pulse" />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="h-20 w-full sm:w-52 rounded-2xl bg-slate-100 border border-slate-200 animate-pulse" />
              <div className="h-20 w-full sm:w-64 rounded-2xl bg-slate-100 border border-slate-200 animate-pulse" />
            </div>
          </div>
        </div>

        {/* 4 KPI Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className={`rounded-3xl p-6 border shadow-sm space-y-4 ${
                idx === 0 ? 'border-[#e32f8c]/30 bg-[#e32f8c]/5' : 'border-slate-200/90 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="h-3 w-28 rounded bg-slate-200 animate-pulse" />
                <div className="w-8 h-8 rounded-lg bg-slate-100 animate-pulse" />
              </div>
              <div className="h-9 w-32 rounded-xl bg-slate-200 animate-pulse" />
              <div className="h-3 w-36 rounded bg-slate-100 animate-pulse" />
              <div className="pt-2.5 border-t border-slate-100 flex justify-between">
                <div className="h-3 w-20 rounded bg-slate-100 animate-pulse" />
                <div className="h-3 w-16 rounded bg-slate-200 animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        {/* IBAN Payout Banner Skeleton */}
        <div className="rounded-3xl p-5 sm:p-6 border border-slate-200 bg-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 animate-pulse shrink-0" />
            <div className="space-y-2">
              <div className="h-4 w-44 rounded bg-slate-200 animate-pulse" />
              <div className="h-5 w-60 rounded bg-slate-100 animate-pulse" />
            </div>
          </div>
          <div className="flex gap-2.5">
            <div className="h-10 w-24 rounded-xl bg-slate-100 animate-pulse" />
            <div className="h-10 w-24 rounded-xl bg-slate-100 animate-pulse" />
          </div>
        </div>

        {/* Orders History Section Skeleton */}
        <div className="space-y-6 pt-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="h-7 w-64 rounded-xl bg-slate-200 animate-pulse" />
              <div className="h-3.5 w-80 max-w-full rounded bg-slate-100 animate-pulse" />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="h-10 w-full sm:w-64 rounded-2xl bg-slate-100 border border-slate-200 animate-pulse" />
              <div className="h-10 w-full sm:w-44 rounded-2xl bg-slate-100 border border-slate-200 animate-pulse" />
            </div>
          </div>

          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={idx}
                className="h-20 rounded-2xl border border-slate-200/80 bg-white px-6 flex items-center justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="h-4 w-32 rounded bg-slate-200 animate-pulse" />
                  <div className="h-3 w-20 rounded bg-slate-100 animate-pulse" />
                </div>
                <div className="hidden sm:block h-4 w-48 rounded bg-slate-100 animate-pulse" />
                <div className="h-5 w-20 rounded bg-slate-200 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
