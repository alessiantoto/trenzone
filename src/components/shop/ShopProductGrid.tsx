"use client";

import { Product } from "@/lib/api";
import { ProductCard } from "@/components/product/ProductCard";
import { Dumbbell, Zap, ShieldCheck } from "lucide-react";
import { useLocale } from "next-intl";

interface ShopProductGridProps {
  products: Product[];
  dark?: boolean;
}

export function ShopProductGrid({ products, dark = true }: ShopProductGridProps) {
  const locale = useLocale();
  const isRo = locale === "ro";

  return (
    <div className="flex flex-col gap-6 sm:gap-8 md:gap-10">
      {products.length > 0 && (
        <div
          className={`grid grid-cols-2 ${
            products.length <= 2 
              ? "sm:grid-cols-2 max-w-2xl mx-auto w-full" 
              : "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
          } gap-3 sm:gap-4 md:gap-6 ${
            products.length === 1 ? "max-w-xs mx-auto w-full" : ""
          }`}
        >
          {products.map((product) => (
            <ProductCard key={product.id} product={product} priority={true} dark={dark} />
          ))}
        </div>
      )}

      {/* ═══ 3 TRUST / QUALITY GUARANTEES ═══ */}
      <div className="w-full max-w-4xl mx-auto grid grid-cols-3 gap-2 sm:gap-4 text-center">
        <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-zinc-900/60 border border-white/5 hover:border-[#e32f8c]/30 transition-colors">
          <Dumbbell className="w-4 h-4 text-[#e32f8c] mb-1.5" />
          <span className="text-[10px] sm:text-xs font-black uppercase text-white tracking-tight leading-snug">
            {isRo ? 'CALITATE PREMIUM' : 'HEAVY-DUTY BUILD'}
          </span>
          <span className="text-[9px] sm:text-[11px] text-zinc-400 font-medium mt-0.5 leading-snug">
            {isRo ? 'Materiale groase, durabile' : 'Built to outlast heavy cycles'}
          </span>
        </div>
        <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-zinc-900/60 border border-white/5 hover:border-[#e32f8c]/30 transition-colors">
          <Zap className="w-4 h-4 text-[#e32f8c] mb-1.5" />
          <span className="text-[10px] sm:text-xs font-black uppercase text-white tracking-tight leading-snug">
            {isRo ? 'TESTAT PE 200KG+' : 'TESTED AT 200KG+'}
          </span>
          <span className="text-[9px] sm:text-[11px] text-zinc-400 font-medium mt-0.5 leading-snug">
            {isRo ? 'Suport real la greutăți mari' : 'Proven on serious lifts'}
          </span>
        </div>
        <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-zinc-900/60 border border-white/5 hover:border-[#e32f8c]/30 transition-colors">
          <ShieldCheck className="w-4 h-4 text-[#e32f8c] mb-1.5" />
          <span className="text-[10px] sm:text-xs font-black uppercase text-white tracking-tight leading-snug">
            {isRo ? 'CALITATE VERIFICATĂ' : 'QUALITY GUARANTEED'}
          </span>
          <span className="text-[9px] sm:text-[11px] text-zinc-400 font-medium mt-0.5 leading-snug">
            {isRo ? 'Cusături ranforsate · Retur 14 zile' : 'Reinforced build · 14d return'}
          </span>
        </div>
      </div>
    </div>
  );
}
