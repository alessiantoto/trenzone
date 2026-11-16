"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useLocale } from "next-intl";
import { ShoppingCart, Check } from "lucide-react";
import { getCdnUrl } from "@/lib/utils/cdn";
import { useCartStore } from "@/store/useCartStore";
import { useRegionStore } from "@/store/useRegionStore";
import { getProductPrice } from "@/utils/pricing";
import { formatPrice } from "@/utils/currency";
import type { Product } from "@/lib/api";
import { ProductCard } from "@/components/product/ProductCard";
import {
  DIGITAL_PROGRAM_PRODUCTS,
  PROGRAM_SLUGS,
  PROGRAM_UUIDS,
  isDigitalProgramItem,
  isDigitalBundleItem,
} from "@/lib/programs";
import { cn, getLocalized } from "@/lib/utils";
import { Link } from "@/i18n/routing";
import { LanguageFlagSvg } from "./LanguageFlagSvg";

interface ProgramsShowcaseSectionProps {
  standalonePage?: boolean;
  products?: Product[];
}

export function ProgramsShowcaseSection({
  standalonePage = false,
  products,
}: ProgramsShowcaseSectionProps) {
  const locale = (useLocale() === "en" ? "en" : "ro") as "ro" | "en";
  const isRo = locale === "ro";
  const { currency } = useRegionStore();
  const { addItem, setCartOpen } = useCartStore();
  const [bundleLang, setBundleLang] = useState<"ro" | "en">(() =>
    locale === "en" ? "en" : "ro"
  );

  // Always sync preselected bundle language when site locale changes
  useEffect(() => {
    setBundleLang(locale === "en" ? "en" : "ro");
  }, [locale]);

  const catalog = products && products.length > 0 ? products : DIGITAL_PROGRAM_PRODUCTS;

  const standaloneProgramsFromCatalog = catalog.filter(
    (p) => isDigitalProgramItem(p) && p.is_active !== false && !isDigitalBundleItem(p)
  );
  const standalonePrograms =
    standaloneProgramsFromCatalog.length > 0
      ? standaloneProgramsFromCatalog
      : DIGITAL_PROGRAM_PRODUCTS.filter((p) => !isDigitalBundleItem(p));

  const bundleProduct =
    catalog.find((p) => isDigitalProgramItem(p) && isDigitalBundleItem(p)) ||
    DIGITAL_PROGRAM_PRODUCTS.find((p) => p.slug === PROGRAM_SLUGS.BUNDLE)!;
  const showBundle = bundleProduct.is_active !== false;

  const bundlePriceRon = Number(bundleProduct.price) || 249;
  const standaloneSumRon = standalonePrograms.reduce(
    (sum, p) => sum + (Number(p.price) || 0),
    0
  );
  const bundleOldPriceRon =
    Number(bundleProduct.originalPrice) || (standaloneSumRon > 0 ? standaloneSumRon : 340);

  const numericBundlePrice = getProductPrice(bundlePriceRon, currency);
  const numericBundleOriginal = getProductPrice(bundleOldPriceRon, currency);
  const discountPercent =
    numericBundleOriginal > numericBundlePrice
      ? Math.round(
          ((numericBundleOriginal - numericBundlePrice) / numericBundleOriginal) * 100
        )
      : 27;

  const bundleDesc = getLocalized(bundleProduct.description, locale);

  const handleAddBundleToCart = () => {
    const variantName: { ro: string; en: string } =
      bundleLang === "en"
        ? { ro: "Engleză", en: "English" }
        : { ro: "Română", en: "Romanian" };
    addItem(
      bundleProduct,
      {
        name: variantName as any,
        image: bundleProduct.image,
        imageIndex: 0,
        stock_status: "in_stock",
      },
      1
    );
    setCartOpen(true);
  };

  return (
    <section
      id="programe-digitale"
      className={cn(
        "bg-transparent text-white relative overflow-hidden",
        standalonePage ? "py-10 md:py-16" : "py-16 md:py-24"
      )}
    >
      <div className="container mx-auto px-4 md:px-8 max-w-6xl relative z-10">
        {/* Header — Matching TrenProductShowcase 100% */}
        <div className="flex flex-col items-center justify-center mb-8 md:mb-12 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-white font-[family-name:var(--font-oswald)]">
            {isRo ? "PROGRAMELE LUI VLAD TREN" : "VLAD TREN'S PROGRAMS"}
          </h2>
          <p className="text-xs sm:text-sm md:text-base text-zinc-400 font-medium mt-2.5 max-w-xl leading-relaxed">
            {isRo
              ? "Sistemele de nutriție, antrenament și forță folosite de Vlad Tren, cu livrare instantă pe email."
              : "Vlad Tren's nutrition, training, and bench strength systems, with instant email delivery."}
          </p>
        </div>

        {/* Dynamic Digital Programs Grid (Adapts seamlessly when Admin adds new programs) */}
        <div
          className={cn(
            "grid mx-auto gap-3 sm:gap-5 md:gap-6 mb-8 sm:mb-10",
            standalonePrograms.length === 1
              ? "grid-cols-1 max-w-sm"
              : standalonePrograms.length === 2
              ? "grid-cols-2 max-w-2xl"
              : standalonePrograms.length === 3
              ? "grid-cols-2 lg:grid-cols-3 max-w-4xl"
              : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 max-w-6xl"
          )}
        >
          {standalonePrograms.map((prog, idx) => {
            const isOddLastOnMobile =
              standalonePrograms.length === 3 && idx === standalonePrograms.length - 1;
            return (
              <div
                key={prog.id || prog.slug}
                className={
                  isOddLastOnMobile
                    ? "col-span-2 lg:col-span-1 max-w-[calc(50%-0.375rem)] lg:max-w-none mx-auto w-full"
                    : undefined
                }
              >
                <ProductCard product={prog} dark={true} />
              </div>
            );
          })}
        </div>

        {/* COMPLETE 3-IN-1 BUNDLE CARD */}
        {showBundle && (
        <div className="mt-8 max-w-5xl mx-auto rounded-2xl md:rounded-3xl bg-zinc-900/75 border border-white/10 p-5 sm:p-6 md:p-8 relative overflow-hidden shadow-2xl backdrop-blur-md">
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-[#e32f8c]/12 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-9 items-center">
            {/* Left: 3D 3-Books Visual Mockup */}
            <div className="lg:col-span-5 flex justify-center">
              <Link
                href={`/product/${bundleProduct.slug}`}
                className="relative aspect-[1400/1480] w-full max-w-[290px] sm:max-w-[330px] lg:max-w-[360px] rounded-2xl overflow-hidden bg-[#050507] border border-white/10 shadow-[0_0_45px_-14px_rgba(227,47,140,0.35)] group block"
              >
                <Image
                  src={getCdnUrl(bundleProduct.image || "/images/products/program_complete_trio_v2.webp")}
                  alt={getLocalized(bundleProduct.name, locale)}
                  fill
                  className="object-contain p-1 transition-transform duration-700 group-hover:scale-[1.03]"
                  sizes="(max-width: 768px) 88vw, 360px"
                />
              </Link>
            </div>

            {/* Right: Balanced Info, Included Items, Price + Language Toggle + Full-Width CTA */}
            <div className="lg:col-span-7 flex flex-col justify-center gap-5 text-center lg:text-left">
              <div className="flex flex-col items-center lg:items-start">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#e32f8c]/15 border border-[#e32f8c]/35 text-[#e32f8c] text-[10px] sm:text-xs font-black uppercase tracking-wider mb-3">
                  {isRo ? "TOATE CELE 3 PROGRAME" : "ALL 3 PROGRAMS"}
                </span>

                <Link href={`/product/${bundleProduct.slug}`} className="inline-block">
                  <h3 className="font-heading font-black text-2xl sm:text-3xl md:text-4xl uppercase tracking-tight text-white hover:text-[#e32f8c] transition-colors leading-tight mb-2">
                    {isRo ? "PACHET COMPLET (3 ÎN 1)" : "COMPLETE BUNDLE (3-IN-1)"}
                  </h3>
                </Link>

                <p className="text-xs sm:text-sm text-zinc-300 font-medium leading-relaxed max-w-xl">
                  {isRo
                    ? "Food Plan + Training + Bench Program, livrate instant pe email."
                    : "Food Plan + Training + Bench Program, delivered instantly by email."}
                </p>

                {/* Included Program Chips */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mt-4">
                  {["Food Plan", "Training Program", "Bench Program"].map((progTitle) => (
                    <span
                      key={progTitle}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-[11px] font-bold text-zinc-200"
                    >
                      <Check className="w-3.5 h-3.5 text-[#e32f8c] shrink-0" strokeWidth={3} />
                      <span>{progTitle}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex flex-col gap-3.5">
                {/* Price + Unified Segmented Language Switcher */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-baseline gap-2.5 flex-wrap justify-center sm:justify-start">
                    <span className="text-3xl font-black text-white tracking-tight whitespace-nowrap">
                      {formatPrice(numericBundlePrice, currency)}
                    </span>
                    {numericBundleOriginal > numericBundlePrice && (
                      <span className="text-sm text-zinc-500 line-through font-bold whitespace-nowrap">
                        {formatPrice(numericBundleOriginal, currency)}
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 rounded-full bg-[#e32f8c]/20 border border-[#e32f8c]/40 text-[#e32f8c] text-[10px] sm:text-[11px] font-black uppercase whitespace-nowrap">
                      -{discountPercent}%
                    </span>
                  </div>

                  {/* Compact Segmented Language Toggle */}
                  <div className="inline-grid grid-cols-2 p-1 rounded-xl bg-black/40 border border-white/10 self-center sm:self-auto w-full sm:w-auto sm:min-w-[230px]">
                    <button
                      type="button"
                      onClick={() => setBundleLang("en")}
                      className={cn(
                        "h-9 px-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 text-xs font-extrabold cursor-pointer",
                        bundleLang === "en"
                          ? "bg-[#e32f8c] text-white shadow-sm"
                          : "text-zinc-400 hover:text-white"
                      )}
                    >
                      <LanguageFlagSvg isEnglish={true} />
                      <span>English</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBundleLang("ro")}
                      className={cn(
                        "h-9 px-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 text-xs font-extrabold cursor-pointer",
                        bundleLang === "ro"
                          ? "bg-[#e32f8c] text-white shadow-sm"
                          : "text-zinc-400 hover:text-white"
                      )}
                    >
                      <LanguageFlagSvg isEnglish={false} />
                      <span>Română</span>
                    </button>
                  </div>
                </div>

                {/* Full-Width CTA Aligned Cleanly Across Column */}
                <button
                  type="button"
                  onClick={handleAddBundleToCart}
                  className="w-full py-3.5 sm:py-4 px-6 rounded-xl bg-white hover:bg-[#e32f8c] hover:text-white text-black font-black uppercase text-xs sm:text-sm tracking-wider transition-all duration-300 flex items-center justify-center gap-2 shadow-lg active:scale-[0.99] cursor-pointer"
                >
                  <ShoppingCart className="w-4 h-4 shrink-0" />
                  <span>{isRo ? "ADAUGĂ PACHETUL ÎN COȘ" : "ADD BUNDLE TO CART"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
    </section>
  );
}
