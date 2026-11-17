export default function ReturLoading() {
  return (
    <div className="min-h-[85vh] bg-slate-50/70 py-6 sm:py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-5">
        {/* Back link skeleton */}
        <div className="h-4 w-32 rounded bg-slate-200 animate-pulse" />

        {/* Main Return Form Card Skeleton */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          {/* Dark Hero Header */}
          <div className="px-6 sm:px-8 py-8 sm:py-10 bg-black space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-[#e32f8c]/35 animate-pulse shrink-0" />
              <div className="h-7 sm:h-8 w-64 rounded-xl bg-white/15 animate-pulse" />
            </div>
            <div className="space-y-2 pt-1">
              <div className="h-3.5 w-full max-w-lg rounded bg-white/10 animate-pulse" />
              <div className="h-3.5 w-4/5 max-w-md rounded bg-white/10 animate-pulse" />
            </div>
          </div>

          {/* Form Fields Skeleton */}
          <div className="p-6 sm:p-8 space-y-5 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <div className="h-3.5 w-28 rounded bg-slate-200 animate-pulse" />
                <div className="h-12 w-full rounded-xl bg-slate-100 border border-slate-200/70 animate-pulse" />
                <div className="h-3 w-44 rounded bg-slate-100 animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-3.5 w-28 rounded bg-slate-200 animate-pulse" />
                <div className="h-12 w-full rounded-xl bg-slate-100 border border-slate-200/70 animate-pulse" />
                <div className="h-3 w-44 rounded bg-slate-100 animate-pulse" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <div className="h-3.5 w-24 rounded bg-slate-200 animate-pulse" />
                <div className="h-12 w-full rounded-xl bg-slate-100 border border-slate-200/70 animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-3.5 w-20 rounded bg-slate-200 animate-pulse" />
                <div className="h-12 w-full rounded-xl bg-slate-100 border border-slate-200/70 animate-pulse" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-40 rounded bg-slate-200 animate-pulse" />
                <div className="h-3 w-28 rounded bg-emerald-100 animate-pulse" />
              </div>
              <div className="h-12 w-full rounded-xl bg-slate-100 border border-slate-200/70 animate-pulse" />
              <div className="h-3 w-64 rounded bg-slate-100 animate-pulse" />
            </div>

            <div className="space-y-2">
              <div className="h-3.5 w-36 rounded bg-slate-200 animate-pulse" />
              <div className="h-28 w-full rounded-xl bg-slate-100 border border-slate-200/70 animate-pulse" />
            </div>

            <div className="pt-3 border-t border-slate-100">
              <div className="h-14 w-full rounded-xl bg-slate-900/20 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
