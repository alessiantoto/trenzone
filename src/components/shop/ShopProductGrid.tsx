"use client";

import { Product } from "@/lib/api";
import { ProductCard } from "@/components/product/ProductCard";
import { AmbassadorBanner } from "@/app/[locale]/components/AmbassadorBanner";
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

      {/* ═══ 3 TRUST / PERFORMANCE GUARANTEES ═══ */}
      <div className="w-full max-w-4xl mx-auto grid grid-cols-3 gap-2 sm:gap-4 text-center">
        <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-zinc-900/60 border border-white/5 hover:border-[#e32f8c]/30 transition-colors">
          <Dumbbell className="w-4 h-4 text-[#e32f8c] mb-1.5" />
          <span className="text-[10px] sm:text-xs font-black uppercase text-white tracking-tight">
            {isRo ? 'MATERIAL SOLID' : 'SOLID BUILD'}
          </span>
          <span className="text-[9px] sm:text-[11px] text-zinc-400 font-medium">
            {isRo ? 'Nu se lasă în timp' : "Won't stretch"}
          </span>
        </div>
        <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-zinc-900/60 border border-white/5 hover:border-[#e32f8c]/30 transition-colors">
          <Zap className="w-4 h-4 text-[#e32f8c] mb-1.5" />
          <span className="text-[10px] sm:text-xs font-black uppercase text-white tracking-tight">
            {isRo ? 'TESTATE LA 200KG+' : 'TESTED AT 200KG+'}
          </span>
          <span className="text-[9px] sm:text-[11px] text-zinc-400 font-medium">
            {isRo ? 'Sigure pe greutăți mari' : 'Heavy set safe'}
          </span>
        </div>
        <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-zinc-900/60 border border-white/5 hover:border-[#e32f8c]/30 transition-colors">
          <ShieldCheck className="w-4 h-4 text-[#e32f8c] mb-1.5" />
          <span className="text-[10px] sm:text-xs font-black uppercase text-white tracking-tight">
            {isRo ? 'SUPORT & REBOUND' : 'REBOUND SUPPORT'}
          </span>
          <span className="text-[9px] sm:text-[11px] text-zinc-400 font-medium">
            {isRo ? 'Uită de dureri la împins' : 'No elbow pain'}
          </span>
        </div>
      </div>

      {/* ═══ AMBASSADOR / PARTNER BANNER ═══ */}
      <div className="w-full">
        <AmbassadorBanner />
      </div>
    </div>
  );
}
