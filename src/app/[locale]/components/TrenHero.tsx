"use client";

import Image from "next/image";
import { useLocale } from "next-intl";
import { CheckCircle2, ShieldCheck, Zap } from "lucide-react";
import { getCdnUrl } from "@/lib/utils/cdn";

interface TrenHeroProps {
  freeShippingRo?: number;
  freeShippingIntl?: number;
}

export function TrenHero({ freeShippingRo = 499, freeShippingIntl = 200 }: TrenHeroProps) {
  const locale = useLocale();
  const isRo = locale === "ro";

  const bannerText = isRo
    ? `LIVRARE GRATUITĂ PESTE ${freeShippingRo} RON`
    : `FREE SHIPPING OVER ${freeShippingIntl} EUR`;

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative h-[100dvh] w-full flex flex-col justify-end overflow-hidden bg-[#030305]">
      
      {/* 1. TOP ANNOUNCEMENT BANNER */}
      <div className="absolute top-0 left-0 w-full bg-[#e32f8c] text-black py-2.5 z-50 overflow-hidden flex items-center justify-center text-[11px] md:text-xs font-black tracking-[0.2em] uppercase shadow-md">
        {/* Mobile: Static text */}
        <div className="md:hidden text-center w-full px-4 font-black">
          <span>{bannerText}</span>
        </div>

        {/* Desktop: Animated Marquee */}
        <div className="hidden md:flex whitespace-nowrap animate-marquee min-w-full font-black">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center mx-12 gap-12">
              <span>{bannerText}</span>
              <span className="text-black/35 font-black">·</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. FULLSCREEN BACKGROUND IMAGE */}
      <div className="absolute inset-0 z-0">
        <Image
          src={getCdnUrl("/images/home/hero.webp")}
          alt="TrenZone Elbow Wraps"
          fill
          priority
          className="object-cover object-[center_20%] md:object-[center_25%]"
          sizes="100vw"
        />
        {/* Cinematic dark gradients for crystal-clear readability and smooth canvas blend */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#030305] via-[#030305]/60 to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#030305]/70 via-transparent to-transparent z-10 pointer-events-none" />
      </div>

      {/* 3. HERO CONTENT - CLEAN, STACKED, DIRECT */}
      <div className="relative z-20 w-full px-6 md:px-12 pb-14 md:pb-24 flex flex-col items-start text-left max-w-7xl mx-auto">
        
        {/* Massive 2-Line Hero Master Brand Title */}
        <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-[7.5rem] font-black uppercase text-white leading-[0.88] tracking-tighter drop-shadow-2xl mb-8 md:mb-10 max-w-5xl font-[family-name:var(--font-oswald)]">
          TRENZONE <br />
          <span className="text-[#e32f8c]">BY VLAD TREN</span>
        </h1>

        {/* Clean, High-Contrast Solid White Button */}
        <div className="w-full sm:w-auto">
          <button
            onClick={() => scrollTo("shop-products")}
            className="flex w-full justify-center sm:inline-flex sm:w-auto bg-white text-black font-black uppercase text-base md:text-lg tracking-[0.15em] px-10 py-5 md:px-14 md:py-6 hover:bg-[#e32f8c] hover:text-black transition-all duration-300 shadow-2xl active:scale-95 cursor-pointer"
          >
            {isRo ? "VEZI MAGAZINUL" : "VISIT STORE"}
          </button>
        </div>

        {/* Premium Minimalist Trust Row with clean SVGs - No Cheap Emoji */}
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-[10px] md:text-xs font-bold uppercase tracking-[0.18em] text-zinc-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#e32f8c] shrink-0 stroke-[2.5]" />
            <span>{isRo ? "Creat & Testat de Vlad Tren" : "Tested & Approved by Vlad"}</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-[#e32f8c] shrink-0 stroke-[2.5]" />
            <span>{isRo ? "Protejează Tendoanele la Împins" : "Protects Tendons Under Load"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-[#e32f8c] shrink-0 stroke-[2.5]" />
            <span>{isRo ? "Stabilitate Maximă & Asistență la PR" : "Maximum Stability & PR Assist"}</span>
          </div>
        </div>

      </div>

    </section>
  );
}
