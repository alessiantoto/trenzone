export default function AffiliateLoading() {
  return (
    <div className="bg-white text-zinc-900 min-h-screen overflow-x-hidden font-sans relative">
      {/* Header Skeleton */}
      <section className="container mx-auto px-4 md:px-6 pt-8 md:pt-12 pb-12">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-3 w-14 rounded bg-zinc-200 animate-pulse" />
          <div className="h-3 w-3 rounded-full bg-zinc-100" />
          <div className="h-3 w-28 rounded bg-[#e32f8c]/25 animate-pulse" />
        </div>

        <div className="max-w-4xl space-y-4">
          <div className="h-10 md:h-16 w-4/5 rounded-2xl bg-zinc-200 animate-pulse" />
          <div className="h-5 w-full max-w-2xl rounded-lg bg-zinc-100 animate-pulse" />
          <div className="h-5 w-2/3 max-w-xl rounded-lg bg-zinc-100 animate-pulse" />
          <div className="h-11 w-80 rounded-2xl bg-zinc-100 border border-zinc-200 animate-pulse mt-4" />
        </div>
      </section>

      {/* Main 2-Column Grid Skeleton (Form + Dark Simulator) */}
      <div className="container mx-auto px-4 mb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 max-w-7xl mx-auto items-start">
          {/* Left: Application Form Card */}
          <div className="bg-white border border-zinc-200 rounded-[32px] p-6 md:p-12 shadow-sm space-y-6">
            <div className="h-9 w-56 rounded-xl bg-zinc-200 animate-pulse mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-14 rounded-2xl bg-zinc-100 animate-pulse" />
              <div className="h-14 rounded-2xl bg-zinc-100 animate-pulse" />
            </div>
            <div className="h-14 w-full rounded-2xl bg-zinc-100 animate-pulse" />
            <div className="h-14 w-full rounded-2xl bg-zinc-100 animate-pulse" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-12 rounded-2xl bg-zinc-100 animate-pulse" />
              <div className="h-12 rounded-2xl bg-zinc-100 animate-pulse" />
            </div>
            <div className="h-14 w-full rounded-2xl bg-zinc-100 animate-pulse" />
            <div className="h-28 w-full rounded-2xl bg-zinc-100 animate-pulse" />
            <div className="h-14 w-full rounded-2xl bg-[#e32f8c]/35 animate-pulse" />
          </div>

          {/* Right: Dark Earnings Simulator Card */}
          <div className="bg-zinc-950 border border-white/10 rounded-2xl sm:rounded-[32px] p-5 sm:p-7 md:p-9 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="space-y-2">
                <div className="h-3 w-28 rounded bg-[#e32f8c]/30 animate-pulse" />
                <div className="h-7 w-60 rounded-xl bg-white/10 animate-pulse" />
              </div>
              <div className="h-7 w-32 rounded-full bg-white/10 animate-pulse" />
            </div>

            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-16 rounded-xl bg-zinc-900 border border-white/10 animate-pulse"
                />
              ))}
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-4">
              <div className="flex justify-between items-center">
                <div className="h-3.5 w-36 rounded bg-white/10 animate-pulse" />
                <div className="h-7 w-20 rounded bg-white/15 animate-pulse" />
              </div>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="h-8 rounded-xl bg-white/10 animate-pulse" />
                ))}
              </div>
              <div className="h-3 w-full rounded-full bg-zinc-800 animate-pulse" />
            </div>

            <div className="h-32 rounded-2xl bg-[#e32f8c]/15 border border-[#e32f8c]/30 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
