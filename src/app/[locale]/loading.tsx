export default function HomeLoading() {
  return (
    <div className="trenzone-master-canvas flex flex-col min-h-screen bg-[#0a0a0c] text-white overflow-hidden">
      {/* Dynamic ambient canvas */}
      <div className="trenzone-ambient-canvas" />
      <div className="trenzone-ambient-texture" />

      {/* 1. HERO SECTION SKELETON */}
      <section className="relative h-[100dvh] w-full flex flex-col justify-end overflow-hidden bg-[#0a0a0c]">
        {/* Top Announcement Ribbon Skeleton */}
        <div className="absolute top-0 left-0 w-full h-9 bg-[#e32f8c]/70 animate-pulse z-20" />

        {/* Ambient radial hero spotlight */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#030305] via-[#0a0a0c]/70 to-[#0d0e12]/50 pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/4 w-[480px] h-[320px] bg-[#e32f8c]/10 blur-[150px] rounded-full pointer-events-none" />

        {/* Hero Bottom Content */}
        <div className="relative z-10 w-full px-6 md:px-12 pb-14 md:pb-24 flex flex-col items-start max-w-7xl mx-auto">
          {/* Massive 2-Line Headline Bars */}
          <div className="space-y-3 sm:space-y-4 mb-8 md:mb-10 w-full max-w-3xl">
            <div className="h-12 sm:h-16 md:h-24 w-4/5 sm:w-[480px] rounded-2xl bg-white/10 animate-pulse" />
            <div className="h-12 sm:h-16 md:h-24 w-3/4 sm:w-[420px] rounded-2xl bg-[#e32f8c]/25 animate-pulse" />
          </div>

          {/* Dual CTA Button Skeletons */}
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="h-14 sm:h-16 w-full sm:w-56 rounded-xl bg-white/15 animate-pulse" />
            <div className="h-14 sm:h-16 w-full sm:w-48 rounded-xl bg-zinc-900/90 border border-white/10 animate-pulse" />
          </div>

          {/* Minimalist Trust Row Skeleton */}
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2.5">
            <div className="h-3.5 w-40 rounded-md bg-white/10 animate-pulse" />
            <div className="h-3.5 w-44 rounded-md bg-white/10 animate-pulse" />
            <div className="h-3.5 w-40 rounded-md bg-white/10 animate-pulse" />
          </div>
        </div>
      </section>

      <div className="trenzone-luminous-divider" />

      {/* 2. VIDEO UGC CAROUSEL SKELETON */}
      <section className="relative z-10 w-full py-10 md:py-14 bg-[#0d0e12]/60">
        <div className="mx-auto w-full max-w-6xl px-4 md:px-8">
          <div className="flex flex-col items-center text-center mb-8 gap-3">
            <div className="h-9 sm:h-11 w-64 sm:w-96 rounded-2xl bg-white/10 animate-pulse" />
            <div className="h-4 w-56 sm:w-80 rounded-lg bg-white/5 animate-pulse" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 sm:gap-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className={`aspect-[9/16] w-full rounded-2xl bg-zinc-900/80 border border-white/10 animate-pulse ${
                  idx >= 4 ? "hidden md:block" : ""
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      <div className="trenzone-luminous-divider" />

      {/* 3. BEST SELLERS / PRODUCT SHOWCASE SKELETON */}
      <section className="relative z-10 py-16 md:py-24 bg-[#0a0a0c]">
        <div className="container mx-auto px-4 md:px-8 max-w-6xl">
          <div className="flex flex-col items-center text-center mb-8 md:mb-12 gap-2.5">
            <div className="h-9 sm:h-12 w-56 sm:w-80 rounded-2xl bg-white/10 animate-pulse" />
            <div className="h-4 w-64 sm:w-96 rounded-lg bg-white/5 animate-pulse" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6 mb-10">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${idx >= 4 ? "hidden md:flex" : ""}`}
              >
                <div className="aspect-[4/4.5] w-full rounded-2xl md:rounded-3xl bg-zinc-900/80 border border-white/10 animate-pulse mb-3" />
                <div className="flex flex-col items-center gap-2 px-2">
                  <div className="h-4 w-4/5 rounded-md bg-white/10 animate-pulse" />
                  <div className="flex gap-1.5">
                    <div className="w-3.5 h-3.5 rounded-full bg-white/10 animate-pulse" />
                    <div className="w-3.5 h-3.5 rounded-full bg-white/10 animate-pulse" />
                  </div>
                  <div className="h-3 w-20 rounded bg-white/5 animate-pulse" />
                  <div className="h-5 w-24 rounded-md bg-white/15 animate-pulse" />
                </div>
              </div>
            ))}
          </div>

          {/* Duo Stack Card Skeleton */}
          <div className="mt-10 rounded-2xl md:rounded-3xl bg-zinc-900/70 border border-white/10 p-5 sm:p-7 md:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-center">
              <div className="lg:col-span-5 grid grid-cols-2 gap-3 max-w-sm mx-auto w-full">
                <div className="aspect-[4/5] rounded-2xl bg-zinc-800/70 animate-pulse" />
                <div className="aspect-[4/5] rounded-2xl bg-zinc-800/70 animate-pulse" />
              </div>
              <div className="lg:col-span-7 space-y-4">
                <div className="h-8 w-56 rounded-xl bg-white/10 animate-pulse" />
                <div className="h-4 w-72 rounded-lg bg-white/5 animate-pulse" />
                <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="h-8 w-36 rounded-xl bg-white/15 animate-pulse" />
                  <div className="h-12 w-full sm:w-56 rounded-xl bg-white/15 animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
