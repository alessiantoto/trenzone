"use client";

import { useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { ArrowRight } from "lucide-react";
import { useLocale } from "next-intl";
import { useRegionStore } from "@/store/useRegionStore";
import { formatPrice } from "@/utils/currency";
import { getProductPrice } from "@/utils/pricing";

interface ModelGuideProps {
  onSelectModel?: (model: "x5" | "x10") => void;
}

export function ModelGuideSection({ onSelectModel }: ModelGuideProps) {
  const locale = useLocale();
  const isRo = locale === "ro";
  const { currency } = useRegionStore();

  // Mode: "under140" (X5) or "over140" (X10)
  const [selectedLoad, setSelectedLoad] = useState<"under140" | "over140">("under140");

  const scrollToProducts = (model?: "x5" | "x10") => {
    if (onSelectModel && model) {
      onSelectModel(model);
    }
    const el = document.getElementById("shop-products");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const renderCardX5 = (isMobile = false) => (
    <div 
      onClick={() => setSelectedLoad("under140")}
      className={`relative rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 cursor-pointer group ${
        selectedLoad === "under140"
          ? "bg-zinc-900 border-2 border-white/60 shadow-[0_0_30px_rgba(255,255,255,0.08)] ring-1 ring-white/20"
          : "bg-zinc-900/50 border border-white/10 opacity-80 hover:opacity-100 hover:border-white/20"
      }`}
    >
      <div>
        {/* Top Row: Category Tag & Price */}
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <span className="px-2 py-0.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider rounded-lg bg-zinc-800 text-zinc-300 border border-white/10 shrink-0">
            {isRo ? "SERII DE VOLUM" : "VOLUME SETS"}
          </span>
          <span className="text-xl sm:text-2xl font-black text-white shrink-0 font-[family-name:var(--font-oswald)]">
            {formatPrice(getProductPrice(329.99, currency), currency)}
          </span>
        </div>

        {/* Product Visual - Sleek Aspect */}
        <div className="relative w-full aspect-[16/9] my-1.5 rounded-xl overflow-hidden bg-zinc-950 border border-white/10">
          <Image
            src="/images/products/x5_elbow_wraps_purple_square.webp"
            alt={isRo ? "Benzi de cot TrenZone X5" : "TrenZone X5 Elbow Wraps"}
            fill
            sizes="(max-width: 768px) 100vw, 450px"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>

        {/* Title & Subtitle */}
        <div className="my-1.5">
          <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white font-[family-name:var(--font-oswald)]">
            TRENZONE X5
          </h3>
          <p className="text-xs text-zinc-400 font-medium">
            {isRo ? "Confort articular și flexibilitate sub bară" : "Joint comfort & clean bar flexibility"}
          </p>
        </div>

        {/* ════ PUNCTE DE PERFORMANȚĂ (Rigiditate, Rebound, Protecție) ════ */}
        <div className="space-y-1.5 my-2.5 p-2.5 rounded-xl bg-black/40 border border-white/5 text-xs">
          {/* 1. Rigiditate */}
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 font-bold uppercase tracking-wider text-[11px]">
              {isRo ? "Rigiditate" : "Stiffness"}
            </span>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-3.5 h-1.5 rounded-full bg-white" />
                <div className="w-3.5 h-1.5 rounded-full bg-white" />
                <div className="w-3.5 h-1.5 rounded-full bg-white" />
                <div className="w-3.5 h-1.5 rounded-full bg-white/40" />
                <div className="w-3.5 h-1.5 rounded-full bg-zinc-800" />
              </div>
              <span className="text-white font-black text-xs min-w-[36px] text-right">3.5 / 5</span>
            </div>
          </div>

          {/* 2. Rebound */}
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 font-bold uppercase tracking-wider text-[11px]">
              {isRo ? "Rebound" : "Rebound"}
            </span>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-3.5 h-1.5 rounded-full bg-white" />
                <div className="w-3.5 h-1.5 rounded-full bg-white" />
                <div className="w-3.5 h-1.5 rounded-full bg-white" />
                <div className="w-3.5 h-1.5 rounded-full bg-zinc-800" />
                <div className="w-3.5 h-1.5 rounded-full bg-zinc-800" />
              </div>
              <span className="text-white font-bold text-xs min-w-[36px] text-right">+10 KG</span>
            </div>
          </div>

          {/* 3. Protecție Cot */}
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 font-bold uppercase tracking-wider text-[11px]">
              {isRo ? "Protecție" : "Protection"}
            </span>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-3.5 h-1.5 rounded-full bg-emerald-400" />
                <div className="w-3.5 h-1.5 rounded-full bg-emerald-400" />
                <div className="w-3.5 h-1.5 rounded-full bg-emerald-400" />
                <div className="w-3.5 h-1.5 rounded-full bg-emerald-400" />
                <div className="w-3.5 h-1.5 rounded-full bg-emerald-400/40" />
              </div>
              <span className="text-emerald-400 font-black text-xs min-w-[36px] text-right">4.5 / 5</span>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Button */}
      <Link
        href="/product/trenzone-x5"
        onClick={(e) => {
          e.stopPropagation();
          if (onSelectModel) {
            onSelectModel("x5");
            scrollToProducts("x5");
          }
        }}
        className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-white text-white hover:text-black font-black uppercase text-xs tracking-wider transition-all duration-300 flex items-center justify-center gap-2 border border-white/15 cursor-pointer shadow-md active:scale-95 group/btn mt-1"
      >
        <span>{isRo ? "ALEGE MODELUL X5" : "CHOOSE MODEL X5"}</span>
        <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
      </Link>
    </div>
  );

  const renderCardX10 = (isMobile = false) => (
    <div 
      onClick={() => setSelectedLoad("over140")}
      className={`relative rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 cursor-pointer group ${
        selectedLoad === "over140"
          ? "bg-zinc-900 border-2 border-[#e32f8c] shadow-[0_0_30px_rgba(227,47,140,0.25)] ring-1 ring-[#e32f8c]/30"
          : "bg-zinc-900/50 border border-white/10 opacity-80 hover:opacity-100 hover:border-white/20"
      }`}
    >
      <div>
        {/* Top Row: Category Tag & Price */}
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <span className="px-2 py-0.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider rounded-lg bg-[#e32f8c]/15 text-[#e32f8c] border border-[#e32f8c]/30 shrink-0">
            {isRo ? "SERII GRELE & PR-URI" : "HEAVY SETS & PRS"}
          </span>
          <span className="text-xl sm:text-2xl font-black text-white shrink-0 font-[family-name:var(--font-oswald)]">
            {formatPrice(getProductPrice(529.99, currency), currency)}
          </span>
        </div>

        {/* Product Visual - Sleek Aspect */}
        <div className="relative w-full aspect-[16/9] my-1.5 rounded-xl overflow-hidden bg-zinc-950 border border-white/10">
          <Image
            src="/images/products/x10_elbow_wraps_purple_square.webp"
            alt={isRo ? "Benzi de cot TrenZone X10" : "TrenZone X10 Elbow Wraps"}
            fill
            sizes="(max-width: 768px) 100vw, 450px"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>

        {/* Title & Subtitle */}
        <div className="my-1.5">
          <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white font-[family-name:var(--font-oswald)]">
            TRENZONE X10
          </h3>
          <p className="text-xs text-[#e32f8c] font-semibold">
            {isRo ? "Stabilitate absolută și susținere la coborâre" : "Absolute stability & heavy lockout assist"}
          </p>
        </div>

        {/* ════ PUNCTE DE PERFORMANȚĂ (Rigiditate, Rebound, Protecție) ════ */}
        <div className="space-y-1.5 my-2.5 p-2.5 rounded-xl bg-black/40 border border-white/5 text-xs">
          {/* 1. Rigiditate */}
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 font-bold uppercase tracking-wider text-[11px]">
              {isRo ? "Rigiditate" : "Stiffness"}
            </span>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-3.5 h-1.5 rounded-full bg-[#e32f8c]" />
                <div className="w-3.5 h-1.5 rounded-full bg-[#e32f8c]" />
                <div className="w-3.5 h-1.5 rounded-full bg-[#e32f8c]" />
                <div className="w-3.5 h-1.5 rounded-full bg-[#e32f8c]" />
                <div className="w-3.5 h-1.5 rounded-full bg-[#e32f8c] shadow-[0_0_8px_rgba(227,47,140,0.8)]" />
              </div>
              <span className="text-[#e32f8c] font-black text-xs min-w-[36px] text-right">5.0 / 5</span>
            </div>
          </div>

          {/* 2. Rebound */}
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 font-bold uppercase tracking-wider text-[11px]">
              {isRo ? "Rebound" : "Rebound"}
            </span>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-3.5 h-1.5 rounded-full bg-[#e32f8c]" />
                <div className="w-3.5 h-1.5 rounded-full bg-[#e32f8c]" />
                <div className="w-3.5 h-1.5 rounded-full bg-[#e32f8c]" />
                <div className="w-3.5 h-1.5 rounded-full bg-[#e32f8c]" />
                <div className="w-3.5 h-1.5 rounded-full bg-[#e32f8c] shadow-[0_0_8px_rgba(227,47,140,0.8)]" />
              </div>
              <span className="text-[#e32f8c] font-black text-xs min-w-[36px] text-right">+20 KG</span>
            </div>
          </div>

          {/* 3. Protecție Cot */}
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 font-bold uppercase tracking-wider text-[11px]">
              {isRo ? "Protecție" : "Protection"}
            </span>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-3.5 h-1.5 rounded-full bg-[#e32f8c]" />
                <div className="w-3.5 h-1.5 rounded-full bg-[#e32f8c]" />
                <div className="w-3.5 h-1.5 rounded-full bg-[#e32f8c]" />
                <div className="w-3.5 h-1.5 rounded-full bg-[#e32f8c]" />
                <div className="w-3.5 h-1.5 rounded-full bg-[#e32f8c] shadow-[0_0_8px_rgba(227,47,140,0.8)]" />
              </div>
              <span className="text-[#e32f8c] font-black text-xs min-w-[36px] text-right">5.0 / 5</span>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Button */}
      <Link
        href="/product/trenzone-x10"
        onClick={(e) => {
          e.stopPropagation();
          if (onSelectModel) {
            onSelectModel("x10");
            scrollToProducts("x10");
          }
        }}
        className="w-full py-2.5 px-4 rounded-xl bg-[#e32f8c] hover:bg-[#ff3b99] text-white font-black uppercase text-xs tracking-wider transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(227,47,140,0.4)] cursor-pointer active:scale-95 group/btn mt-1"
      >
        <span>{isRo ? "ALEGE MODELUL X10" : "CHOOSE MODEL X10"}</span>
        <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
      </Link>
    </div>
  );

  return (
    <section id="ghid-modele" className="relative py-10 md:py-16 bg-transparent text-white overflow-hidden scroll-mt-24">
      {/* Soft atmospheric ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#e32f8c]/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="container mx-auto px-4 md:px-8 relative z-10 max-w-4xl">
        
        {/* Header - Compact */}
        <div className="text-center max-w-xl mx-auto mb-6 md:mb-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-white mb-2 font-[family-name:var(--font-oswald)]">
            {isRo ? (
              <>X5 SAU <span className="text-[#e32f8c]">X10</span>?</>
            ) : (
              <>X5 OR <span className="text-[#e32f8c]">X10</span>?</>
            )}
          </h2>
          
          <p className="text-zinc-400 text-xs sm:text-sm font-medium">
            {isRo
              ? "Alege în funcție de stilul tău de antrenament:"
              : "Choose based on your training style:"}
          </p>

          {/* Interactive Selector Tabs: Volum vs Forță Maximă */}
          <div className="mt-4 p-1 bg-zinc-900/90 border border-white/10 rounded-xl flex items-center gap-1 max-w-md mx-auto shadow-lg backdrop-blur-md">
            <button
              type="button"
              onClick={() => setSelectedLoad("under140")}
              className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center cursor-pointer text-center ${
                selectedLoad === "under140"
                  ? "bg-white text-black shadow-md font-black"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <span>{isRo ? "Hipertrofie & Volum" : "Hypertrophy & Volume"}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedLoad("over140")}
              className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center cursor-pointer text-center ${
                selectedLoad === "over140"
                  ? "bg-[#e32f8c] text-white shadow-[0_0_15px_rgba(227,47,140,0.5)] font-black"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <span>{isRo ? "Forță Brută & PR" : "Max Strength & PR"}</span>
            </button>
          </div>
        </div>

        {/* ════ MOBILE VIEW (Shows selected model with instant 1-tap switch) ════ */}
        <div className="md:hidden">
          {selectedLoad === "under140" ? renderCardX5(true) : renderCardX10(true)}
        </div>

        {/* ════ DESKTOP VIEW (Side-by-side compact comparison) ════ */}
        <div className="hidden md:grid md:grid-cols-2 gap-6 items-stretch">
          {renderCardX5(false)}
          {renderCardX10(false)}
        </div>

      </div>
    </section>
  );
}


