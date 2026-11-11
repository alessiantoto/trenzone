"use client";

import { ArrowRight } from "lucide-react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/routing";

export function AmbassadorBanner({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const isRo = locale === "ro";

  return (
    <section className={`py-2 sm:py-3 bg-transparent text-white relative w-full ${className}`}>
      <div className="w-full max-w-4xl mx-auto relative z-10">
        <div className="rounded-2xl md:rounded-3xl bg-zinc-900/60 border border-white/10 p-5 sm:p-7 md:p-8 flex flex-col sm:flex-row items-center justify-between gap-5 md:gap-8 backdrop-blur-sm">
          
          {/* Content */}
          <div className="text-center sm:text-left">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#e32f8c] block mb-1.5">
              {isRo ? "PROGRAM AFILIERE" : "AFFILIATE PROGRAM"}
            </span>
            <h3 className="text-xl sm:text-2xl font-black uppercase text-white tracking-tight mb-1.5 font-[family-name:var(--font-oswald)]">
              {isRo ? "Devino Partener TrenZone®" : "Become a TrenZone® Partner"}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-md leading-relaxed">
              {isRo 
                ? "Primești până la 20% comision la fiecare vânzare și cod de reducere dedicat pentru comunitatea ta."
                : "Earn up to 20% commission on every sale and get a dedicated discount code for your audience."}
            </p>
          </div>

          {/* Action button */}
          <Link
            href="/affiliate"
            className="w-full sm:w-auto shrink-0 py-3 px-6 rounded-xl bg-white hover:bg-[#e32f8c] text-black hover:text-white font-black uppercase text-xs tracking-wider transition-all duration-300 flex items-center justify-center gap-2 shadow-md active:scale-95 whitespace-nowrap"
          >
            <span>{isRo ? "APLICĂ ACUM" : "APPLY NOW"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

        </div>
      </div>
    </section>
  );
}
