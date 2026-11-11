"use client";

import { useState, useEffect } from "react";
import { Product } from "@/lib/api";
import { useCartStore } from "@/store/useCartStore";
import Image from "next/image";
import { Link, useRouter } from "@/i18n/routing";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ShoppingCart, Check, ChevronRight } from "lucide-react";
import { useRegionStore } from "@/store/useRegionStore";
import { formatPrice } from "@/utils/currency";
import { getProductPrice } from "@/utils/pricing";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn, getVariantColorClass } from "@/lib/utils";
import { isWideProductImage } from "@/lib/product-images";

interface ProductCardProps {
  product: Product;
  priority?: boolean;
  dark?: boolean;
}

export function ProductCard({ product, priority = false, dark = true }: ProductCardProps) {
  const { addItem } = useCartStore();
  const { currency } = useRegionStore();
  const router = useRouter();
  
  const getFlavorColor = (name: string) => {
    return getVariantColorClass(name);
  };
  const locale = useLocale();
  const t = useTranslations("Product");
  const sizeOptions = product.bundleVariants?.size?.options || [];
  const hasSizes = sizeOptions.length > 0;
  const isTrueBundle = Boolean(product.bundleVariants?.flavor?.options?.length);
  const [isAdded, setIsAdded] = useState(false);
  const [selectingVariant, setSelectingVariant] = useState(false);
  const [selectedModalOptIdx, setSelectedModalOptIdx] = useState(0);
  const [selectedModalSize, setSelectedModalSize] = useState<string>(() =>
    sizeOptions.includes("L") ? "L" : (sizeOptions[0] || "")
  );
  const [currentImage, setCurrentImage] = useState(product.image);

  useEffect(() => {
    setCurrentImage(product.image);
  }, [product.image]);

  // Stable reviews count based on ID to prevent hydration mismatches and flickering
  const stableReviewsCount = Math.abs(
    product.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % 25
  ) + 14;

  const name = (typeof product.name === 'object' ? (product.name as any)[locale] || (product.name as any)['ro'] : product.name) as string;

  const numericPrice = getProductPrice(product.price, currency);
  const numericOriginalPrice = getProductPrice(product.originalPrice, currency);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // If product is a multi-product bundle (needs flavor options), redirect to product page
    if (isTrueBundle) {
      router.push(`/product/${product.slug}`);
      return;
    }

    // If product has variants, show selection modal
    if (product.variants?.options && product.variants.options.length > 0) {
      const matchedIdx = product.variants.options.findIndex((o) => o.image && o.image === currentImage);
      setSelectedModalOptIdx(matchedIdx >= 0 ? matchedIdx : 0);
      setSelectingVariant(true);
    } else {
      addItem(product);
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2000);
    }
  };

  const handleSelectVariant = (variant: any, overrideSize?: string) => {
    if (variant.stock_status === 'sold_out') return;

    const variantName = typeof variant.name === 'object' 
      ? (variant.name[locale] || variant.name['ro']) 
      : variant.name;
    const finalName = hasSizes && (overrideSize || selectedModalSize)
      ? `${variantName} · ${overrideSize || selectedModalSize}`
      : variantName;

    addItem(product, {
      name: finalName,
      image: variant.image,
      imageIndex: variant.imageIndex !== undefined ? variant.imageIndex : (product.images?.findIndex((img: string) => img === variant.image) ?? 0)
    });
    setSelectingVariant(false);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
        className="group flex flex-col w-full relative"
      >
      {/* Zona Imaginii */}
      {(() => {
        const displayCardImage = currentImage || product.image;
        const isWideCard = isWideProductImage(displayCardImage);
        return (
      <div className={cn(
        "relative aspect-square sm:aspect-[4/4.5] w-full mb-3 md:mb-4 group overflow-hidden rounded-2xl md:rounded-3xl shadow-sm hover:shadow-md transition-all duration-500",
        isWideCard ? "bg-black border border-white/10 hover:border-white/25" : (dark ? "bg-zinc-900/90 border border-white/10 hover:border-white/20" : "bg-[#f8f8f8]")
      )}>
        {/* Style 2026 Badges — Elite 'Emerald Power' Conversion Logic (Top Left) */}
        <div className="absolute top-2 left-2 md:top-4 md:left-4 z-20 flex flex-col gap-2">
          {numericOriginalPrice > numericPrice && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#e32f8c] text-black font-black uppercase tracking-[0.15em] text-[9px] md:text-[10px] px-3 py-1.5 rounded-full shadow-[0_4px_15px_rgba(227, 47, 140,0.35)] border border-black/10"
            >
              -{Math.round(((numericOriginalPrice - numericPrice) / numericOriginalPrice) * 100)}%
            </motion.div>
          )}
        </div>
        
        <Link href={`/product/${product.slug}`} className="block w-full h-full relative">
          <Image
            src={displayCardImage}
            alt={name as string}
            fill
            sizes="(max-width: 639px) 45vw, (max-width: 1023px) 32vw, 320px"
            priority={priority}
            className={cn(
              isWideCard
                ? "object-contain p-2 transition-transform duration-700 ease-out group-hover:scale-105"
                : "object-cover transition-transform duration-1000 ease-out group-hover:scale-110",
              !dark && !isWideCard && "mix-blend-multiply"
            )}
            loading={priority ? "eager" : "lazy"}
            {...(priority ? { fetchPriority: "high" } : {})}
          />
        </Link>
        
        {/* Style 2026 Quick Add Button */}
        <div className="absolute right-2 bottom-2 md:right-4 md:bottom-4 z-20">
          <motion.button 
            onClick={handleAdd}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={`p-3 rounded-xl transform-gpu md:opacity-0 md:translate-y-2 md:group-hover:translate-y-0 md:group-hover:opacity-100 transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/10 flex items-center justify-center overflow-hidden`}
            aria-label={t('add_to_cart')}
          >
            {/* Composited background transition */}
            <div 
              className={`absolute inset-0 transition-opacity duration-300 ${isAdded ? 'opacity-100 bg-[#f97316]' : 'opacity-100 bg-white'}`} 
            />
            {/* Composited icon/text layer */}
            <div className={`relative z-10 transition-colors duration-300 ${isAdded ? 'text-white' : 'text-black'}`}>
            <div className="relative w-4 h-4 md:w-5 md:h-5 flex items-center justify-center">
              <AnimatePresence mode="popLayout">
                {isAdded ? (
                  <motion.div
                    key="check"
                    initial={{ scale: 0, rotate: -45, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    <Check className="w-4 h-4 md:w-5 md:h-5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="cart"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ShoppingCart className="w-4 h-4 md:w-5 md:h-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.button>
        </div>
      </div>
        );
      })()}

      {/* Zona Text */}
      <div className="flex flex-col items-center text-center space-y-1 px-2">
        <Link href={`/product/${product.slug}`} className="block w-full">
          <h3 className="font-heading font-black text-[13px] md:text-[15px] transition-colors leading-tight uppercase tracking-tight text-white group-hover:text-[#e32f8c]">
            {name as string}
          </h3>
        </Link>
        
        {/* Variant Dots or Design Mini-Thumbnails */}
        {product.variants?.options && (
          <div className="flex items-center justify-center gap-1.5 mt-1.5 mb-1 flex-wrap">
            {product.variants.type === 'design' ? (
              product.variants.options.slice(0, 5).map((opt: any, idx: number) => {
                const optName = (typeof opt.name === 'object' ? (opt.name as any)[locale] || (opt.name as any)['ro'] : opt.name) as string;
                const isSelectedThumb = (currentImage || product.image) === opt.image;
                return opt.image ? (
                  <button
                    key={idx}
                    type="button"
                    title={optName}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCurrentImage(opt.image);
                    }}
                    onMouseEnter={() => setCurrentImage(opt.image)}
                    className={cn(
                      "relative w-7 h-5 rounded-md bg-black border overflow-hidden transition-all cursor-pointer",
                      isSelectedThumb
                        ? "border-[#e32f8c] ring-1 ring-[#e32f8c]/50 scale-110"
                        : "border-white/20 opacity-75 hover:opacity-100 hover:border-white/50"
                    )}
                  >
                    <Image src={opt.image} alt={optName} fill sizes="28px" className="object-contain p-0.5" />
                  </button>
                ) : null;
              })
            ) : (
              product.variants.options.slice(0, 5).map((opt: any, idx: number) => {
                const optName = (typeof opt.name === 'object' ? (opt.name as any)[locale] || (opt.name as any)['ro'] : opt.name) as string;
                const n = optName.toLowerCase();
                if (['s', 'm', 'l', 'xl', 'xxl'].includes(n) || n.includes('marime') || n.includes('size')) return null;

                const dotColor = opt.color ? undefined : getFlavorColor(optName);

                return (
                  <button
                    key={idx}
                    type="button"
                    title={optName}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (opt.image) setCurrentImage(opt.image);
                    }}
                    onMouseEnter={() => {
                      if (opt.image) setCurrentImage(opt.image);
                    }}
                    className={cn("w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm transition-transform hover:scale-125 focus:outline-none cursor-pointer", dotColor)}
                    style={opt.color ? { backgroundColor: opt.color } : undefined}
                  />
                );
              })
            )}
          </div>
        )}
        
        {/* Recenzii */}
        <div className="flex items-center justify-center gap-1 mt-1">
          <div className="flex text-amber-400">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-[11px] h-[11px] fill-amber-400 text-amber-400" />
            ))}
          </div>
          <span className="text-[11px] font-bold text-zinc-400">({stableReviewsCount})</span>
        </div>

        {/* Preț — Elite Minimalist Stack */}
        <div className="flex flex-col items-center justify-center mt-1.5 space-y-0.5">
          {numericOriginalPrice > numericPrice && (
            <span className="text-[11px] font-bold line-through leading-none text-zinc-500 decoration-zinc-500/70">
              {formatPrice(numericOriginalPrice, currency)}
            </span>
          )}
          <span className="text-[15px] md:text-[18px] font-black tracking-tight leading-none text-white">
            {formatPrice(numericPrice, currency)}
          </span>
        </div>
      </div>
    </motion.div>

    {/* Variant Selection Modal */}
    <AnimatePresence>
      {selectingVariant && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectingVariant(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            className="relative w-full max-w-[360px] bg-white rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col items-center text-center"
          >
            {(() => {
              const rawOptions = product.variants?.options || [];
              const options = [...rawOptions].sort(
                (a: any, b: any) => (a.stock_status === 'sold_out' ? 1 : 0) - (b.stock_status === 'sold_out' ? 1 : 0)
              );

              const isSize = options.some((opt: any) => {
                const n = (typeof opt.name === 'object' ? (opt.name[locale] || opt.name['ro']) : opt.name).toLowerCase();
                return ['s', 'm', 'l', 'xl', 'xxl'].includes(n) || n.includes('marime') || n.includes('size');
              });
              const isDesign = product.variants?.type === 'design';
              const activeOpt = options[selectedModalOptIdx] || options[0];
              const previewImg = activeOpt?.image || product.image;
              const isWidePreview = isWideProductImage(previewImg);

              const titleText = hasSizes
                ? (locale === 'ro' ? 'Alege Modelul & Mărimea' : 'Select Design & Size')
                : isSize
                  ? (locale === 'ro' ? 'Alegeți Mărimea' : 'Select Size')
                  : isDesign
                    ? (locale === 'ro' ? 'Alegeți Modelul' : 'Select Design')
                    : (locale === 'ro' ? 'Alegeți Culoarea' : 'Select Color');

              return (
                <>
                  {!isSize && previewImg && (
                    <div className={cn(
                      "rounded-2xl overflow-hidden mb-3 border border-zinc-200 relative",
                      isWidePreview ? "w-24 h-16 bg-black" : "w-16 h-16 bg-zinc-50"
                    )}>
                      <Image
                        src={previewImg}
                        alt={name as string}
                        fill
                        className={isWidePreview ? "object-contain p-1" : "object-cover p-2"}
                        sizes="96px"
                      />
                    </div>
                  )}
                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-1">
                    {titleText}
                  </h3>
                  <h2 className="text-sm font-black uppercase tracking-tighter text-black mb-4">{name as string}</h2>
                  
                  {/* Selection Box */}
                  <div className="w-full bg-white border border-black rounded-lg overflow-hidden shadow-sm flex flex-col text-left max-h-[min(360px,52vh)] overflow-y-auto custom-scrollbar">
                    {options.map((opt: any, idx: number) => {
                      const localizedName = (typeof opt.name === 'object' ? (opt.name as any)[locale] || (opt.name as any)['ro'] : opt.name) as string;
                      const isSoldOut = opt.stock_status === 'sold_out';
                      const isOptSelected = hasSizes && idx === selectedModalOptIdx;
                      const optColorClass = opt.color ? undefined : getFlavorColor(localizedName);

                      return (
                        <button
                          key={`${product.id}-${idx}`}
                          type="button"
                          disabled={isSoldOut}
                          onClick={() => {
                            if (isSoldOut) return;
                            if (hasSizes) {
                              setSelectedModalOptIdx(idx);
                            } else {
                              handleSelectVariant(opt);
                            }
                          }}
                          className={cn(
                            "w-full flex items-center justify-between py-2.5 px-3.5 md:py-3 md:px-4 transition-colors border-b border-black/10 last:border-none group",
                            isSoldOut
                              ? "opacity-50 cursor-not-allowed bg-gray-50 hover:bg-gray-50"
                              : isOptSelected
                                ? "bg-zinc-100 cursor-pointer"
                                : "hover:bg-[#f4f4f4] cursor-pointer"
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {isDesign && opt.image ? (
                              <div className="relative w-10 h-7 rounded-md bg-black border border-black/15 overflow-hidden shrink-0">
                                <Image src={opt.image} alt={localizedName} fill sizes="40px" className="object-contain p-0.5" />
                              </div>
                            ) : !isSize && (
                              <div
                                className={cn("w-5 h-5 rounded-full shadow-inner shrink-0 border border-black/10", optColorClass)}
                                style={opt.color ? { backgroundColor: opt.color } : undefined}
                              />
                            )}
                            <div className="flex flex-col items-start text-left min-w-0">
                              <span className={cn(
                                "text-xs md:text-sm uppercase tracking-wider truncate",
                                isSoldOut ? "font-bold text-black/60" : "font-black text-black"
                              )}>
                                {localizedName}
                              </span>
                              {(opt.badge || isSoldOut) && (
                                <span className={cn(
                                  "text-[10px] font-black uppercase tracking-widest mt-0.5",
                                  isSoldOut ? "text-red-500" : "text-[#e32f8c]"
                                )}>
                                  {isSoldOut ? "SOLD OUT" : opt.badge}
                                </span>
                              )}
                            </div>
                          </div>
                          {!isSoldOut && (
                            isOptSelected
                              ? <Check className="w-4 h-4 text-[#e32f8c] shrink-0 stroke-[3]" />
                              : <ChevronRight className="w-4 h-4 text-black/30 group-hover:text-black transition-colors shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {hasSizes && (
                    <div className="w-full mt-4">
                      <div className="flex items-center justify-between mb-1.5 px-0.5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                          {locale === 'ro' ? 'Mărime' : 'Size'}
                        </span>
                        <span className="text-[10px] font-bold uppercase text-zinc-400">
                          Oversized Fit
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        {sizeOptions.map((sz) => (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => setSelectedModalSize(sz)}
                            className={cn(
                              "h-9 rounded-lg text-xs font-black uppercase border transition-all cursor-pointer",
                              selectedModalSize === sz
                                ? "bg-[#e32f8c] text-white border-[#e32f8c]"
                                : "bg-zinc-50 text-black border-zinc-200 hover:border-black"
                            )}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        disabled={!activeOpt || activeOpt.stock_status === 'sold_out'}
                        onClick={() => activeOpt && handleSelectVariant(activeOpt, selectedModalSize)}
                        className="mt-4 w-full h-11 rounded-xl bg-black hover:bg-[#e32f8c] text-white font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span>{locale === 'ro' ? 'Adaugă în Coș' : 'Add to Cart'}</span>
                      </button>
                    </div>
                  )}
                  
                  <button 
                    onClick={() => setSelectingVariant(false)}
                    className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    {t('cancel', { defaultValue: locale === 'ro' ? 'Renunță' : 'Cancel' })}
                  </button>
                </>
              );
            })()}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  );
}
