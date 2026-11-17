export default function AffiliateLoginLoading() {
  return (
    <div className="relative w-full min-h-[calc(100dvh-92px)] bg-[#030305] text-white overflow-x-hidden flex flex-col px-4 sm:px-6 pt-4 pb-14 sm:py-10 lg:py-12">
      <div className="trenzone-ambient-canvas" aria-hidden="true" />
      <div className="trenzone-ambient-texture" aria-hidden="true" />

      <div className="my-auto mx-auto w-full max-w-5xl relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Desktop Brand Panel Skeleton */}
          <div className="hidden lg:flex lg:col-span-6 flex-col justify-between rounded-3xl bg-zinc-950/80 border border-white/10 p-9 xl:p-10 min-h-[540px]">
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/10 animate-pulse" />
                  <div className="h-6 w-28 rounded bg-white/10 animate-pulse" />
                </div>
                <div className="h-6 w-20 rounded-full bg-[#e32f8c]/20 animate-pulse" />
              </div>

              <div className="space-y-3">
                <div className="h-10 w-5/6 rounded-xl bg-white/10 animate-pulse" />
                <div className="h-10 w-3/4 rounded-xl bg-[#e32f8c]/20 animate-pulse" />
                <div className="h-4 w-full max-w-sm rounded bg-white/5 animate-pulse mt-3" />
              </div>

              <div className="space-y-4 pt-2">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 animate-pulse shrink-0" />
                    <div className="flex-1 space-y-2 pt-0.5">
                      <div className="h-4 w-40 rounded bg-white/10 animate-pulse" />
                      <div className="h-3 w-64 max-w-full rounded bg-white/5 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-white/10 flex items-center justify-between">
              <div className="h-4 w-32 rounded bg-white/10 animate-pulse" />
              <div className="h-3 w-28 rounded bg-white/5 animate-pulse" />
            </div>
          </div>

          {/* Login Card Skeleton */}
          <div className="lg:col-span-6 w-full max-w-md mx-auto lg:max-w-none rounded-3xl bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-5 sm:p-8 xl:p-10 shadow-2xl overflow-hidden">
            {/* Mobile Brand Strip Skeleton */}
            <div className="flex lg:hidden items-center justify-between pb-4 mb-5 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-white/10 animate-pulse" />
                <div className="h-5 w-24 rounded bg-white/10 animate-pulse" />
              </div>
              <div className="h-6 w-16 rounded bg-white/5 animate-pulse" />
            </div>

            <div className="text-center lg:text-left mb-6 space-y-3">
              <div className="h-6 w-28 mx-auto lg:mx-0 rounded-full bg-[#e32f8c]/20 border border-[#e32f8c]/25 animate-pulse" />
              <div className="h-8 sm:h-9 w-52 mx-auto lg:mx-0 rounded-xl bg-white/10 animate-pulse" />
              <div className="h-4 w-64 max-w-full mx-auto lg:mx-0 rounded bg-white/5 animate-pulse" />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="h-3 w-24 rounded bg-white/10 animate-pulse" />
                <div className="h-12 w-full rounded-xl bg-black/60 border border-white/10 animate-pulse" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="h-3 w-20 rounded bg-white/10 animate-pulse" />
                  <div className="h-3 w-24 rounded bg-white/5 animate-pulse" />
                </div>
                <div className="h-12 w-full rounded-xl bg-black/60 border border-white/10 animate-pulse" />
              </div>

              <div className="h-12 sm:h-[52px] w-full rounded-xl bg-[#e32f8c]/35 animate-pulse mt-2" />
            </div>

            <div className="mt-6 pt-5 border-t border-white/10 flex flex-col items-center gap-2">
              <div className="h-4 w-56 rounded bg-white/5 animate-pulse" />
              <div className="lg:hidden h-8 w-36 rounded-xl bg-white/5 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
