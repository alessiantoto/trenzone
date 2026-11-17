export default function ProgramsLoading() {
  return (
    <div className="trenzone-master-canvas min-h-screen flex flex-col text-white">
      <div className="trenzone-ambient-canvas" />
      <div className="trenzone-ambient-texture" />

      <div className="relative z-10 pt-4">
        <section className="py-10 md:py-16">
          <div className="container mx-auto px-4 md:px-8 max-w-6xl">
            {/* Centered Header Skeleton */}
            <div className="flex flex-col items-center justify-center mb-8 md:mb-12 text-center space-y-3">
              <div className="h-10 sm:h-12 md:h-14 w-64 sm:w-96 rounded-2xl bg-white/10 animate-pulse" />
              <div className="h-4 w-72 sm:w-[440px] rounded-lg bg-white/5 animate-pulse" />
            </div>

            {/* 3-Card Digital Programs Grid Skeleton */}
            <div className="grid grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto gap-3 sm:gap-5 md:gap-6 mb-8 sm:mb-10">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={idx}
                  className={`rounded-2xl sm:rounded-3xl bg-zinc-900/70 border border-white/10 overflow-hidden flex flex-col ${
                    idx === 2 ? 'col-span-2 lg:col-span-1 max-w-[calc(50%-0.375rem)] lg:max-w-none mx-auto w-full' : ''
                  }`}
                >
                  <div className="aspect-square w-full bg-zinc-800/70 animate-pulse" />
                  <div className="p-3.5 sm:p-5 space-y-2.5">
                    <div className="h-3 w-20 rounded-full bg-[#e32f8c]/25 animate-pulse" />
                    <div className="h-5 w-4/5 rounded-lg bg-white/10 animate-pulse" />
                    <div className="h-3.5 w-full rounded bg-white/5 animate-pulse" />
                    <div className="pt-2 flex items-center justify-between">
                      <div className="h-5 w-20 rounded bg-white/15 animate-pulse" />
                      <div className="h-9 w-24 rounded-xl bg-[#e32f8c]/25 animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Complete 3-in-1 Bundle Card Skeleton */}
            <div className="mt-8 max-w-5xl mx-auto rounded-2xl md:rounded-3xl bg-zinc-900/75 border border-white/10 p-5 sm:p-6 md:p-8 shadow-2xl">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-9 items-center">
                <div className="lg:col-span-5 flex justify-center">
                  <div className="w-full max-w-xs aspect-[4/3] rounded-2xl bg-zinc-800/80 animate-pulse" />
                </div>
                <div className="lg:col-span-7 space-y-4">
                  <div className="h-6 w-36 rounded-full bg-[#e32f8c]/25 animate-pulse" />
                  <div className="h-9 w-3/4 rounded-xl bg-white/10 animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-3.5 w-full rounded bg-white/5 animate-pulse" />
                    <div className="h-3.5 w-5/6 rounded bg-white/5 animate-pulse" />
                  </div>
                  <div className="flex gap-2.5 pt-1">
                    <div className="h-10 w-28 rounded-xl bg-white/10 animate-pulse" />
                    <div className="h-10 w-28 rounded-xl bg-white/10 animate-pulse" />
                  </div>
                  <div className="h-12 w-full sm:w-64 rounded-xl bg-[#e32f8c]/35 animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="trenzone-luminous-divider" />

      {/* FAQ Accordion Skeleton */}
      <div className="max-w-4xl w-full mx-auto px-4 py-12 space-y-3">
        <div className="h-8 w-56 mx-auto rounded-xl bg-white/10 animate-pulse mb-6" />
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="h-16 rounded-2xl bg-zinc-900/70 border border-white/10 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
