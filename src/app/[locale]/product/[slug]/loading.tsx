export default function ProductLoading() {
  return (
    <div className="trenzone-master-canvas flex flex-col min-h-dvh text-white relative overflow-x-clip">
      <div className="trenzone-ambient-canvas" />
      <div className="trenzone-ambient-texture" />

      <div className="relative z-10 max-w-[1400px] w-full mx-auto px-5 sm:px-8 lg:px-12 pb-12 pt-32 sm:pt-36 md:pt-40">
        {/* Breadcrumb Skeleton */}
        <div className="flex items-center gap-2 mb-4 sm:mb-6">
          <div className="h-3 w-14 rounded bg-white/10 animate-pulse" />
          <div className="h-3 w-2 rounded bg-white/5" />
          <div className="h-3 w-16 rounded bg-white/10 animate-pulse" />
          <div className="h-3 w-2 rounded bg-white/5" />
          <div className="h-3 w-36 rounded bg-[#e32f8c]/30 animate-pulse" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left: Product Gallery Skeleton */}
          <div className="lg:col-span-6 flex flex-col gap-3">
            <div className="w-full max-w-md lg:max-w-xl mx-auto aspect-square max-h-[460px] lg:max-h-[500px] rounded-[2rem] bg-zinc-900/80 border border-white/10 animate-pulse" />
            <div className="flex justify-center flex-wrap gap-2 sm:gap-3 mt-2 sm:mt-3">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-2xl bg-zinc-900/80 border border-white/10 animate-pulse"
                />
              ))}
            </div>
          </div>

          {/* Right: Buy Box Skeleton */}
          <div className="lg:col-span-6 w-full lg:pt-1 space-y-6">
            {/* Title + Price */}
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="h-9 md:h-12 w-4/5 rounded-xl bg-white/10 animate-pulse" />
                  <div className="h-7 md:h-9 w-1/2 rounded-xl bg-white/10 animate-pulse" />
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <div className="h-8 w-28 rounded-xl bg-white/15 animate-pulse" />
                  <div className="h-4 w-20 rounded bg-white/5 animate-pulse" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-24 rounded bg-amber-400/20 animate-pulse" />
                <div className="h-3.5 w-32 rounded bg-white/10 animate-pulse" />
              </div>
            </div>

            {/* Description Block */}
            <div className="border-l-2 border-[#e32f8c]/50 pl-4 py-3 bg-zinc-900/50 border border-white/5 rounded-r-xl space-y-2">
              <div className="h-3.5 w-full rounded bg-white/10 animate-pulse" />
              <div className="h-3.5 w-11/12 rounded bg-white/10 animate-pulse" />
              <div className="h-3.5 w-3/4 rounded bg-white/5 animate-pulse" />
            </div>

            {/* Variant Selector Skeleton */}
            <div className="space-y-2.5">
              <div className="h-3.5 w-36 rounded bg-white/10 animate-pulse" />
              <div className="h-14 w-full rounded-xl bg-zinc-900/90 border border-white/10 animate-pulse" />
            </div>

            {/* Size / Option Pills Skeleton */}
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-11 rounded-xl bg-zinc-900/80 border border-white/10 animate-pulse"
                />
              ))}
            </div>

            {/* Quantity + Primary CTA Bar */}
            <div className="flex items-center gap-3">
              <div className="h-[54px] w-32 rounded-xl bg-zinc-900 border border-white/10 animate-pulse" />
              <div className="h-[54px] flex-1 rounded-xl bg-[#e32f8c]/35 animate-pulse" />
            </div>

            {/* Express Checkout Bar */}
            <div className="space-y-3">
              <div className="h-3 w-28 mx-auto rounded bg-white/10 animate-pulse" />
              <div className="grid grid-cols-2 gap-2.5">
                <div className="h-12 rounded-xl bg-zinc-900/80 border border-white/10 animate-pulse" />
                <div className="h-12 rounded-xl bg-zinc-900/80 border border-white/10 animate-pulse" />
              </div>
            </div>

            {/* 3 Highlights Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-20 rounded-2xl bg-white/[0.03] border border-white/5 animate-pulse"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
