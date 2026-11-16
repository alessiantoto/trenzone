"use client";

import { ArrowRight } from "lucide-react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

interface AmbassadorBannerProps {
  className?: string;
  containerClassName?: string;
}

export function AmbassadorBanner({
  className = "",
  containerClassName = "max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14",
}: AmbassadorBannerProps) {
  const locale = useLocale();
  const isRo = locale === "ro";

  return (
    <section className={cn("relative z-10 text-white w-full", containerClassName, className)}>
      <Link
        href="/affiliate"
        className="group block rounded-2xl md:rounded-3xl bg-zinc-900/75 hover:bg-zinc-900/90 border border-white/10 hover:border-[#e32f8c]/50 p-5 sm:p-7 md:p-8 relative overflow-hidden shadow-2xl backdrop-blur-md transition-all duration-300"
      >
        <div className="absolute -top-28 -right-28 w-72 h-72 bg-[#e32f8c]/12 rounded-full blur-3xl pointer-events-none transition-opacity duration-500 group-hover:opacity-100 opacity-70" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-5 md:gap-8 relative z-10">
          {/* Content */}
          <div className="text-center sm:text-left flex flex-col items-center sm:items-start">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#e32f8c]/15 border border-[#e32f8c]/35 text-[#e32f8c] text-[10px] sm:text-xs font-black uppercase tracking-wider mb-3">
              {isRo ? "PROGRAM AFILIERE · PÂNĂ LA 20%" : "AFFILIATE PROGRAM · UP TO 20%"}
            </span>
            <h3 className="text-xl sm:text-2xl md:text-3xl font-black uppercase text-white group-hover:text-[#e32f8c] transition-colors tracking-tight mb-1.5 font-[family-name:var(--font-oswald)] leading-tight">
              {isRo ? "DEVINO PARTENER TRENZONE®" : "BECOME A TRENZONE® PARTNER"}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-300 font-medium max-w-lg leading-relaxed">
              {isRo
                ? "Primești până la 20% comision la fiecare vânzare și cod de reducere dedicat pentru comunitatea ta."
                : "Earn up to 20% commission on every sale and get a dedicated discount code for your audience."}
            </p>
          </div>

          {/* Action button */}
          <span className="w-full sm:w-auto shrink-0 py-3.5 px-7 rounded-xl bg-white group-hover:bg-[#e32f8c] text-black group-hover:text-white font-black uppercase text-xs tracking-wider transition-all duration-300 inline-flex items-center justify-center gap-2.5 shadow-lg whitespace-nowrap">
            <span>{isRo ? "APLICĂ ACUM" : "APPLY NOW"}</span>
            <ArrowRight className="w-4 h-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1" />
          </span>
        </div>
      </Link>
    </section>
  );
}
