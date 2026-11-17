export default function ContactLoading() {
  return (
    <div className="bg-white text-black min-h-screen pb-20 overflow-x-hidden font-sans">
      {/* Breadcrumb & Header Skeleton */}
      <section className="container mx-auto px-4 md:px-6 pt-8 md:pt-12 pb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-3 w-14 rounded bg-zinc-200 animate-pulse" />
          <div className="h-3 w-3 rounded-full bg-zinc-100" />
          <div className="h-3 w-20 rounded bg-[#e32f8c]/25 animate-pulse" />
        </div>

        <div className="max-w-4xl space-y-4">
          <div className="h-10 md:h-16 w-72 md:w-[440px] rounded-2xl bg-zinc-200 animate-pulse" />
          <div className="h-5 w-full max-w-xl rounded-lg bg-zinc-100 animate-pulse" />
        </div>
      </section>

      <section className="container mx-auto px-4 mb-12 max-w-4xl">
        <div className="space-y-16">
          {/* Top: Contact Form Card Skeleton */}
          <div className="bg-zinc-50 border border-zinc-100 rounded-[32px] p-8 md:p-12 shadow-sm space-y-6">
            <div className="h-8 w-56 mx-auto rounded-xl bg-zinc-200 animate-pulse mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-14 rounded-2xl bg-white border border-zinc-200 animate-pulse" />
              <div className="h-14 rounded-2xl bg-white border border-zinc-200 animate-pulse" />
            </div>
            <div className="h-14 w-full rounded-2xl bg-white border border-zinc-200 animate-pulse" />
            <div className="h-40 w-full rounded-2xl bg-white border border-zinc-200 animate-pulse" />
            <div className="h-14 w-full rounded-2xl bg-zinc-300 animate-pulse" />
          </div>

          {/* Bottom: Info Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto w-full">
            <div className="h-28 rounded-[28px] bg-zinc-50 border border-zinc-100 animate-pulse" />
            <div className="h-28 rounded-[28px] bg-zinc-50 border border-zinc-100 animate-pulse" />
          </div>

          {/* Quote Skeleton */}
          <div className="h-24 max-w-2xl mx-auto rounded-3xl border border-zinc-100 bg-white animate-pulse" />
        </div>
      </section>
    </div>
  );
}
