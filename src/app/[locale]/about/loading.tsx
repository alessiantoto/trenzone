export default function AboutLoading() {
  return (
    <div className="min-h-screen bg-[#030305] text-white pt-20 sm:pt-28 md:pt-36 pb-16 sm:pb-24 relative overflow-hidden">
      {/* Ambient lighting matching about/page.tsx */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[#e32f8c]/10 rounded-full blur-[170px] pointer-events-none" />
      <div className="absolute top-2/3 right-10 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 max-w-6xl xl:max-w-7xl relative z-10">
        {/* 1. HERO HEADER SKELETON */}
        <div className="text-center max-w-4xl mx-auto mb-8 sm:mb-14 md:mb-18 flex flex-col items-center">
          <div className="h-7 w-44 rounded-full bg-white/5 border border-white/10 animate-pulse mb-4 sm:mb-5" />
          <div className="space-y-2.5 w-full max-w-2xl mb-4 sm:mb-6 flex flex-col items-center">
            <div className="h-8 sm:h-12 md:h-14 w-11/12 rounded-2xl bg-white/10 animate-pulse" />
            <div className="h-8 sm:h-12 md:h-14 w-3/4 rounded-2xl bg-[#e32f8c]/25 animate-pulse" />
          </div>
          <div className="space-y-2 w-full max-w-xl flex flex-col items-center">
            <div className="h-4 w-full rounded-lg bg-white/5 animate-pulse" />
            <div className="h-4 w-4/5 rounded-lg bg-white/5 animate-pulse" />
          </div>
        </div>

        {/* 2. STATS RIBBON SKELETON */}
        <div className="rounded-2xl sm:rounded-3xl bg-zinc-900/60 border border-white/10 p-2 sm:p-4 mb-10 sm:mb-16 md:mb-20 shadow-2xl">
          <div className="grid grid-cols-3 divide-x divide-white/10">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="py-4 px-2 sm:py-7 sm:px-6 flex flex-col items-center justify-center gap-2"
              >
                <div className="h-6 sm:h-10 w-20 sm:w-36 rounded-xl bg-white/10 animate-pulse" />
                <div className="h-3 w-16 sm:w-32 rounded bg-white/5 animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* 3. STORY SECTION WITH VISUAL SKELETON */}
        <div className="rounded-2xl sm:rounded-3xl bg-zinc-950/80 border border-white/10 p-4 sm:p-8 md:p-12 lg:p-14 mb-10 sm:mb-16 md:mb-20 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-14 items-center">
            <div className="lg:col-span-5 flex justify-center w-full">
              <div className="aspect-[4/3] sm:aspect-[4/5] w-full max-w-md lg:max-w-none rounded-xl sm:rounded-2xl bg-zinc-900 border border-white/10 animate-pulse sm:min-h-[440px]" />
            </div>

            <div className="lg:col-span-7 space-y-4 sm:space-y-5">
              <div className="h-3.5 w-32 rounded bg-[#e32f8c]/25 animate-pulse" />
              <div className="h-8 sm:h-10 w-5/6 rounded-xl bg-white/10 animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 w-full rounded bg-white/5 animate-pulse" />
                <div className="h-4 w-11/12 rounded bg-white/5 animate-pulse" />
                <div className="h-4 w-4/5 rounded bg-white/5 animate-pulse" />
              </div>
              <div className="h-16 w-full rounded-xl bg-[#e32f8c]/10 border-l-4 border-[#e32f8c]/40 animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 w-full rounded bg-white/5 animate-pulse" />
                <div className="h-4 w-3/4 rounded bg-white/5 animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* 4. WHY TREN ZONE 2x2 GRID SKELETON */}
        <div className="mb-10 sm:mb-16 md:mb-20">
          <div className="flex flex-col items-center mb-8 sm:mb-12 gap-2">
            <div className="h-3 w-28 rounded bg-[#e32f8c]/25 animate-pulse" />
            <div className="h-9 sm:h-11 w-64 rounded-xl bg-white/10 animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-5 md:gap-7">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="p-5 sm:p-8 rounded-xl sm:rounded-3xl bg-zinc-900/60 border border-white/10 space-y-3"
              >
                <div className="h-3.5 w-8 rounded bg-white/10 animate-pulse" />
                <div className="h-5 w-2/3 rounded-lg bg-white/10 animate-pulse" />
                <div className="h-4 w-full rounded bg-white/5 animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* 5. 2 FLAGSHIP PRODUCTS SKELETON */}
        <div className="max-w-4xl mx-auto grid grid-cols-2 gap-3 sm:gap-6 mb-10">
          {Array.from({ length: 2 }).map((_, idx) => (
            <div
              key={idx}
              className="rounded-2xl sm:rounded-3xl bg-zinc-900/80 border border-white/10 p-3 sm:p-5 space-y-3"
            >
              <div className="flex justify-between gap-2">
                <div className="h-4 w-24 rounded bg-[#e32f8c]/20 animate-pulse" />
                <div className="h-5 w-16 rounded bg-white/10 animate-pulse" />
              </div>
              <div className="aspect-square w-full rounded-xl bg-zinc-800/70 animate-pulse" />
              <div className="h-4 w-3/4 rounded bg-white/10 animate-pulse" />
              <div className="h-9 w-full rounded-xl bg-white/10 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
