export default function AdminLoading() {
  return (
    <div className="pb-16 text-slate-900 max-w-[1400px] mx-auto space-y-5 sm:space-y-6 animate-pulse">
      {/* ===================================================================== */}
      {/* DARK HERO COMMAND CARD SKELETON                                       */}
      {/* ===================================================================== */}
      <div className="bg-[#09090d] rounded-3xl p-4 sm:p-6 shadow-2xl border border-white/10">
        {/* Top Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="h-7 w-32 rounded-full bg-white/10" />
            <div className="h-7 w-20 rounded-full bg-white/[0.07]" />
            <div className="h-7 w-28 rounded-full bg-white/[0.07]" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-20 rounded-xl bg-white/10" />
            <div className="h-8 w-28 rounded-xl bg-white/10" />
          </div>
        </div>

        {/* Quick 1-Tap Period Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pb-3 mb-3 border-b border-white/[0.07]">
          {[56, 44, 52, 58, 58, 48].map((w, idx) => (
            <div
              key={idx}
              style={{ width: `${w}px` }}
              className="h-6 rounded-full bg-white/[0.08]"
            />
          ))}
        </div>

        {/* 4 Hero KPI Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl p-3 sm:p-3.5 border border-white/[0.08] bg-white/[0.04] space-y-2"
            >
              <div className="h-3 w-24 rounded bg-white/10" />
              <div className="flex items-center justify-between gap-2">
                <div className="h-6 w-24 rounded-md bg-white/15" />
                <div className="h-4 w-10 rounded-md bg-white/10" />
              </div>
              {i === 0 && <div className="h-2.5 w-36 rounded bg-white/[0.07]" />}
            </div>
          ))}
        </div>

        {/* Chart Rectangle */}
        <div className="h-[210px] sm:h-[260px] w-full rounded-2xl bg-white/[0.04] border border-white/[0.06] flex flex-col justify-end p-4 gap-3">
          <div className="flex-1 flex items-end gap-2 sm:gap-3 pt-4">
            {[38, 56, 44, 72, 62, 84, 54, 68, 78, 60, 88, 74].map((h, idx) => (
              <div
                key={idx}
                style={{ height: `${h}%` }}
                className="flex-1 rounded-t-lg bg-white/[0.06]"
              />
            ))}
          </div>
          <div className="h-px w-full bg-white/[0.08]" />
        </div>

        {/* Hero Footer Strip */}
        <div className="mt-3 pt-3 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="h-3 w-28 rounded bg-white/10" />
            <div className="h-3 w-28 rounded bg-white/[0.07]" />
          </div>
          <div className="h-3 w-44 rounded bg-white/10" />
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 8-CARD ACTIVITATE & ACȚIUNI RAPIDE GRID SKELETON                      */}
      {/* ===================================================================== */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="h-5 w-48 rounded-lg bg-slate-200" />
          <div className="h-3.5 w-20 rounded bg-slate-200/80" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="h-3 w-24 rounded bg-slate-200" />
                <div className="h-4 w-4 rounded bg-slate-200 shrink-0" />
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <div className="h-7 w-16 rounded-md bg-slate-200" />
                <div className="h-3.5 w-14 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2 ANALYTICS CARDS SKELETON                                            */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-1.5">
              <div className="h-5 w-44 rounded bg-slate-200" />
              <div className="h-3 w-56 rounded bg-slate-100" />
            </div>
            <div className="h-6 w-24 rounded-full bg-slate-100" />
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-100" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="h-24 rounded-xl bg-slate-50 border border-slate-100 p-3.5 space-y-2">
              <div className="h-3 w-24 rounded bg-slate-200" />
              <div className="h-6 w-12 rounded bg-slate-200" />
              <div className="h-3 w-32 rounded bg-slate-100" />
            </div>
            <div className="h-24 rounded-xl bg-slate-50 border border-slate-100 p-3.5 space-y-2">
              <div className="h-3 w-24 rounded bg-slate-200" />
              <div className="h-6 w-12 rounded bg-slate-200" />
              <div className="h-3 w-32 rounded bg-slate-100" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-1.5">
              <div className="h-5 w-40 rounded bg-slate-200" />
              <div className="h-3 w-52 rounded bg-slate-100" />
            </div>
            <div className="h-6 w-20 rounded-full bg-slate-100" />
          </div>
          <div className="space-y-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="h-3.5 w-32 rounded bg-slate-200" />
                  <div className="h-3.5 w-28 rounded bg-slate-200" />
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
