export default function ReviewsLoading() {
  return (
    <div className="min-h-screen bg-black text-white pt-16 md:pt-24">
      {/* Hero Section Skeleton */}
      <section className="relative pt-8 pb-8 md:pt-16 md:pb-16 overflow-hidden">
        <div className="container mx-auto px-6 relative z-10">
          <div className="h-3.5 w-28 rounded bg-white/10 animate-pulse mb-4 md:mb-6" />

          <div className="max-w-4xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-[1px] w-8 md:w-12 bg-[#e32f8c]/50" />
              <div className="h-3 w-36 rounded bg-[#e32f8c]/30 animate-pulse" />
            </div>
            <div className="h-12 md:h-20 w-72 md:w-[480px] rounded-2xl bg-white/10 animate-pulse" />
            <div className="h-12 md:h-20 w-56 md:w-80 rounded-2xl bg-[#e32f8c]/25 animate-pulse" />
            <div className="h-5 w-full max-w-xl rounded-lg bg-white/5 animate-pulse" />
          </div>

          {/* Aggregate Stats Bar Skeleton */}
          <div className="mt-8 md:mt-12 bg-zinc-900/50 border border-white/5 rounded-3xl p-6 md:p-10">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className={`space-y-3 ${idx >= 2 ? 'hidden lg:block border-l border-white/5 pl-12' : ''}`}
                >
                  <div className="h-3 w-24 rounded bg-white/10 animate-pulse" />
                  <div className="h-12 w-24 rounded-xl bg-white/15 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Search & Filters Hub Skeleton */}
      <section className="py-12 border-y border-white/5">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-8 items-stretch lg:items-center">
            <div className="flex-1 h-16 rounded-[1.5rem] bg-zinc-900 border border-white/5 animate-pulse" />
            <div className="flex flex-wrap items-center gap-3">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-12 w-24 rounded-2xl bg-zinc-900 animate-pulse"
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3-Column Reviews Grid Skeleton */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-zinc-900/40 rounded-[2.5rem] border border-white/5 p-8 md:p-10 flex flex-col gap-5"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-3 w-28 rounded bg-[#e32f8c]/25 animate-pulse" />
                    <div className="h-3.5 w-20 rounded bg-white/10 animate-pulse" />
                  </div>
                  <div className="h-6 w-20 rounded-full bg-white/5 animate-pulse" />
                </div>
                <div className="space-y-2.5 flex-1">
                  <div className="h-4 w-full rounded bg-white/10 animate-pulse" />
                  <div className="h-4 w-11/12 rounded bg-white/10 animate-pulse" />
                  <div className="h-4 w-3/4 rounded bg-white/5 animate-pulse" />
                </div>
                {idx % 2 === 0 && (
                  <div className="rounded-2xl aspect-[4/5] w-full bg-zinc-800/70 animate-pulse" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
