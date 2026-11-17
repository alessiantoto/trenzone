"use client";

import { useState, useMemo } from "react";
import { Product } from "@/lib/api";
import { ProductCard } from "@/components/product/ProductCard";
import { Dumbbell, Zap, ShieldCheck } from "lucide-react";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";

interface ShopProductGridProps {
  products: Product[];
  dark?: boolean;
}

type ShopFilter = "all" | "wraps" | "gear";

function isWrapProduct(product: Product): boolean {
  const slug = String(product.slug || "").toLowerCase();
  const rawName =
    typeof product.name === "object"
      ? `${product.name?.ro || ""} ${product.name?.en || ""}`
      : String(product.name || "");
  const hay = `${slug} ${rawName}`.toLowerCase();
  return hay.includes("wrap") || hay.includes("elbow") || hay.includes("wrist") || hay.includes("benz") || hay.includes("fas");
}

export function ShopProductGrid({ products, dark = true }: ShopProductGridProps) {
  const locale = useLocale();
  const isRo = locale === "ro";
  const [activeFilter, setActiveFilter] = useState<ShopFilter>("all");

  const { wrapsCount, gearCount } = useMemo(() => {
    let wraps = 0;
    let gear = 0;
    for (const p of products) {
      if (isWrapProduct(p)) wraps++;
      else gear++;
    }
    return { wrapsCount: wraps, gearCount: gear };
  }, [products]);

  const showFilters = wrapsCount > 0 && gearCount > 0;

  const filteredProducts = useMemo(() => {
    if (!showFilters || activeFilter === "all") return products;
    if (activeFilter === "wraps") return products.filter(isWrapProduct);
    return products.filter((p) => !isWrapProduct(p));
  }, [products, activeFilter, showFilters]);

  const filterPills: Array<{ id: ShopFilter; label: string; count: number }> = [
    { id: "all", label: isRo ? "Toate" : "All", count: products.length },
    { id: "wraps", label: isRo ? "Benzi de Cot & Încheietură" : "Elbow & Wrist Wraps", count: wrapsCount },
    { id: "gear", label: isRo ? "Centuri & Îmbrăcăminte" : "Belts & Apparel", count: gearCount },
  ];

  return (
    <div className="flex flex-col gap-6 sm:gap-8 md:gap-10">
      {showFilters && (
        <div
          className="flex flex-wrap items-center justify-center gap-2"
          role="tablist"
          aria-label={isRo ? "Filtrează produsele" : "Filter products"}
        >
          {filterPills.map((pill) => {
            const isSelected = activeFilter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setActiveFilter(pill.id)}
                className={cn(
                  "px-3.5 sm:px-4 py-2 rounded-full text-[11px] sm:text-xs font-black uppercase tracking-wider border transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5",
                  isSelected
                    ? "bg-[#e32f8c] text-white border-[#e32f8c] shadow-[0_0_20px_rgba(227,47,140,0.35)]"
                    : "bg-zinc-900/80 text-zinc-300 border-white/10 hover:border-white/30 hover:text-white"
                )}
              >
                <span>{pill.label}</span>
                <span
                  className={cn(
                    "text-[10px] font-extrabold px-1.5 py-0.5 rounded-full tabular-nums leading-none",
                    isSelected ? "bg-black/25 text-white" : "bg-white/10 text-zinc-400"
                  )}
                >
                  {pill.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {filteredProducts.length > 0 && (
        <div
          className={`grid grid-cols-2 ${
            filteredProducts.length <= 2
              ? "sm:grid-cols-2 max-w-2xl mx-auto w-full"
              : "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
          } gap-3 sm:gap-4 md:gap-6 ${
            filteredProducts.length === 1 ? "max-w-xs mx-auto w-full" : ""
          }`}
        >
          {filteredProducts.map((product) => (
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
