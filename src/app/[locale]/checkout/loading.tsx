export default function CheckoutLoading() {
  return (
    <div className="min-h-screen bg-[#fafafc] pt-8 md:pt-24 pb-12">
      <div className="container mx-auto px-4 md:px-6">
        {/* Header Skeleton */}
        <header className="mb-6 md:mb-12 max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
          <div className="inline-flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white border border-zinc-100 animate-pulse" />
            <div className="h-3 w-24 rounded bg-zinc-200 animate-pulse" />
          </div>
          <div className="h-10 md:h-14 w-56 md:w-72 rounded-2xl bg-zinc-200 animate-pulse" />
          <div className="hidden lg:flex items-center gap-4">
            <div className="h-4 w-24 rounded bg-zinc-200 animate-pulse" />
            <div className="w-[1px] h-4 bg-zinc-200" />
            <div className="h-4 w-24 rounded bg-zinc-200 animate-pulse" />
          </div>
        </header>

        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-12 items-start">
            {/* Left Column: Step Indicator + Checkout Form Card Skeleton */}
            <div className="flex-1 w-full order-2 lg:order-1">
              {/* Step Indicator Skeleton */}
              <div className="w-full max-w-2xl mx-auto px-4 py-4 md:py-8">
                <div className="flex items-center justify-between relative">
                  <div className="absolute top-[22px] left-[15%] right-[15%] h-[2px] bg-zinc-200" />
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} className="relative z-10 flex flex-col items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-2xl border-2 ${
                          idx === 0
                            ? 'bg-[#e32f8c]/25 border-[#e32f8c]/30'
                            : 'bg-white border-zinc-200'
                        } animate-pulse`}
                      />
                      <div className="h-3 w-14 rounded bg-zinc-200 animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Card Skeleton */}
              <div className="mt-4 lg:mt-8 bg-white p-6 md:p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <div className="h-6 w-44 rounded-xl bg-zinc-200 animate-pulse" />
                  <div className="h-3 w-20 rounded bg-[#e32f8c]/25 animate-pulse" />
                </div>

                {/* Express Checkout Placeholder */}
                <div className="space-y-3">
                  <div className="h-12 w-full rounded-xl bg-zinc-100 animate-pulse" />
                  <div className="h-3 w-36 mx-auto rounded bg-zinc-100 animate-pulse" />
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  <div className="h-14 w-full rounded-2xl bg-zinc-100 animate-pulse" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="h-14 rounded-2xl bg-zinc-100 animate-pulse" />
                    <div className="h-14 rounded-2xl bg-zinc-100 animate-pulse" />
                  </div>
                  <div className="h-14 w-full rounded-2xl bg-zinc-100 animate-pulse" />
                  <div className="h-14 w-full rounded-2xl bg-zinc-100 animate-pulse" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="h-14 rounded-2xl bg-zinc-100 animate-pulse" />
                    <div className="h-14 rounded-2xl bg-zinc-100 animate-pulse" />
                  </div>
                  <div className="h-14 w-full rounded-2xl bg-zinc-100 animate-pulse" />
                </div>

                <div className="h-14 w-full rounded-2xl bg-[#e32f8c]/35 animate-pulse" />
              </div>
            </div>

            {/* Right Column: Order Summary Card Skeleton */}
            <div className="w-full lg:w-[420px] order-1 lg:order-2">
              <div className="bg-white border border-zinc-100 rounded-[2.5rem] p-6 md:p-8 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <div className="h-5 w-36 rounded-lg bg-zinc-200 animate-pulse" />
                  <div className="h-6 w-24 rounded-lg bg-zinc-200 animate-pulse" />
                </div>

                <div className="space-y-4 pt-4 border-t border-zinc-100">
                  {Array.from({ length: 2 }).map((_, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-zinc-100 animate-pulse shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-3/4 rounded bg-zinc-200 animate-pulse" />
                        <div className="h-3 w-1/2 rounded bg-zinc-100 animate-pulse" />
                      </div>
                      <div className="h-4 w-16 rounded bg-zinc-200 animate-pulse" />
                    </div>
                  ))}
                </div>

                <div className="h-12 w-full rounded-2xl bg-zinc-100 animate-pulse" />

                <div className="space-y-3 pt-4 border-t border-zinc-100">
                  <div className="flex justify-between">
                    <div className="h-3.5 w-20 rounded bg-zinc-100 animate-pulse" />
                    <div className="h-3.5 w-20 rounded bg-zinc-200 animate-pulse" />
                  </div>
                  <div className="flex justify-between">
                    <div className="h-3.5 w-24 rounded bg-zinc-100 animate-pulse" />
                    <div className="h-3.5 w-16 rounded bg-zinc-100 animate-pulse" />
                  </div>
                  <div className="pt-4 border-t border-zinc-100 flex justify-between items-center">
                    <div className="h-5 w-14 rounded bg-zinc-200 animate-pulse" />
                    <div className="h-7 w-28 rounded-lg bg-zinc-200 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
