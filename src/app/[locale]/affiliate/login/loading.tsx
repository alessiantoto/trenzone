export default function AffiliateLoginLoading() {
  return (
    <div className="trenzone-master-canvas min-h-[calc(100svh-92px)] flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="trenzone-ambient-canvas" />
      <div className="trenzone-ambient-texture" />

      <div className="w-full max-w-md relative z-10 rounded-3xl bg-zinc-900/75 backdrop-blur-xl border border-white/10 p-6 sm:p-9 shadow-2xl overflow-hidden">
        <div className="text-center mb-7 space-y-3">
          <div className="h-6 w-28 mx-auto rounded-full bg-[#e32f8c]/20 border border-[#e32f8c]/25 animate-pulse" />
          <div className="h-9 sm:h-10 w-48 mx-auto rounded-xl bg-white/10 animate-pulse" />
          <div className="h-4 w-64 max-w-full mx-auto rounded bg-white/5 animate-pulse" />
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="h-3 w-24 rounded bg-white/10 animate-pulse ml-1" />
            <div className="h-12 w-full rounded-xl bg-black/50 border border-white/10 animate-pulse" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="h-3 w-20 rounded bg-white/10 animate-pulse" />
              <div className="h-3 w-24 rounded bg-white/5 animate-pulse" />
            </div>
            <div className="h-12 w-full rounded-xl bg-black/50 border border-white/10 animate-pulse" />
          </div>

          <div className="h-[52px] w-full rounded-xl bg-[#e32f8c]/35 animate-pulse mt-2" />
        </div>

        <div className="mt-6 pt-5 border-t border-white/10 flex justify-center">
          <div className="h-4 w-56 rounded bg-white/5 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
