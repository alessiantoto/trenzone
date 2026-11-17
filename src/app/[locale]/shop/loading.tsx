export default function ShopLoading() {
  return (
    <div className="relative flex flex-col w-full overflow-hidden bg-[#0d0e12] text-white min-h-screen">
      {/* Subtle Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[350px] bg-[#e32f8c]/10 blur-[150px] rounded-full pointer-events-none z-0" />

      {/* Header Skeleton */}
      <section className="relative z-10 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 md:pt-10 pb-4 md:pb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-3 w-14 rounded-md bg-white/10 animate-pulse" />
            <div className="h-3 w-3 rounded-full bg-white/5" />
            <div className="h-3 w-16 rounded-md bg-[#e32f8c]/30 animate-pulse" />
          </div>

          <div className="flex items-end justify-between gap-4">
            <div className="h-10 sm:h-12 md:h-14 w-56 sm:w-80 rounded-2xl bg-white/10 animate-pulse" />

            <div className="flex flex-col items-end gap-1.5 pb-1">
              <div className="h-2.5 w-24 rounded bg-white/10 animate-pulse" />
              <div className="h-8 w-36 rounded-full bg-zinc-900/90 border border-white/10 animate-pulse" />
            </div>
          </div>
        </div>
      </section>

      {/* Product Grid Skeleton (2-col mobile, 3/4-col desktop) */}
      <div className="relative z-10 pb-8 md:pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 sm:pt-7 md:pt-10 flex flex-col gap-6 sm:gap-8 md:gap-10">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-2xl sm:rounded-3xl bg-zinc-900/60 border border-white/10 overflow-hidden flex flex-col"
              >
                <div className="aspect-square w-full bg-zinc-800/70 animate-pulse" />
                <div className="p-3.5 sm:p-4 space-y-2.5">
                  <div className="h-3 w-20 rounded-full bg-[#e32f8c]/20 animate-pulse" />
                  <div className="h-4 w-4/5 rounded-lg bg-white/10 animate-pulse" />
                  <div className="h-3 w-2/3 rounded-lg bg-white/5 animate-pulse" />
                  <div className="pt-2 flex items-center justify-between gap-2">
                    <div className="h-5 w-20 rounded-lg bg-white/15 animate-pulse" />
                    <div className="h-8 w-8 rounded-xl bg-white/10 animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 3 Trust Guarantees Skeleton */}
          <div className="w-full max-w-4xl mx-auto grid grid-cols-3 gap-2 sm:gap-4">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-2"
              >
                <div className="w-5 h-5 rounded-md bg-[#e32f8c]/25 animate-pulse" />
                <div className="h-3 w-20 sm:w-28 rounded bg-white/10 animate-pulse" />
                <div className="h-2.5 w-24 sm:w-32 rounded bg-white/5 animate-pulse hidden sm:block" />
              </div>
            ))}
          </div>

          {/* Digital Programs Banner Skeleton */}
          <div className="rounded-3xl bg-zinc-900/60 border border-white/10 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-3 w-full md:w-1/2">
              <div className="h-3 w-28 rounded-full bg-[#e32f8c]/25 animate-pulse" />
              <div className="h-7 w-3/4 rounded-xl bg-white/10 animate-pulse" />
              <div className="h-4 w-full rounded-lg bg-white/5 animate-pulse" />
            </div>
            <div className="h-12 w-full md:w-48 rounded-xl bg-white/10 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
