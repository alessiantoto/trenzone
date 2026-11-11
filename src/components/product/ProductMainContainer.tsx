"use client";

import { Product } from "@/lib/api";
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { ChevronDown, Plus, Minus, Check, ShoppingCart, Zap, ShieldCheck, Dumbbell, AlertCircle } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { useCartStore } from "@/store/useCartStore";
import { getProductPrice } from "@/utils/pricing";
import { useRegionStore } from "@/store/useRegionStore";
import { cn } from "@/lib/utils";
import { isWideProductImage } from "@/lib/product-images";
import { StarRating } from "@/components/ui/StarRating";
import { ProductExpressCheckout } from "@/components/checkout/ProductExpressCheckout";

interface ProductMainContainerProps {
  product: Product;
  initialStats?: { count: number; average: number };
}

export function ProductMainContainer({ product, initialStats }: ProductMainContainerProps) {
  const locale = useLocale();
  const { addItem, isCartOpen } = useCartStore();
  const { currency } = useRegionStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const name = typeof product.name === 'object' ? product.name[locale] || product.name['ro'] : product.name;

  const [activeImage, setActiveImage] = useState(product.images[0]);
  const [reviewStats] = useState(
    initialStats && initialStats.count > 0 ? initialStats : { count: 48, average: 5.0 }
  );

  const sizeOptions = product.bundleVariants?.size?.options || [];
  const hasSizes = sizeOptions.length > 0;
  const [standardQuantity, setStandardQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(() => {
    if (!sizeOptions.length) return null;
    return sizeOptions.includes("L") ? "L" : sizeOptions[0];
  });
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [hasExpressWallets, setHasExpressWallets] = useState<boolean | null>(null);
  const [aromaError, setAromaError] = useState(false);
  const aromaTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mainCtaRef = useRef<HTMLButtonElement | null>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [isFooterVisible, setIsFooterVisible] = useState(false);

  // Pre-select first available variant for immediate 1-click purchase on mobile
  useEffect(() => {
    if (product.variants?.options?.length && !selectedVariant) {
      const firstAvailable = product.variants.options.find(o => o.stock_status !== 'sold_out') || product.variants.options[0];
      if (firstAvailable) {
        const optName = typeof firstAvailable.name === 'object' ? firstAvailable.name[locale as 'ro' | 'en'] || firstAvailable.name['ro'] : firstAvailable.name;
        setSelectedVariant(optName as string);
        if (firstAvailable.image) {
          setActiveImage(firstAvailable.image);
        }
      }
    }
  }, [product, locale, selectedVariant]);

  // Show sticky mobile bar when user scrolls past the main buy button
  useEffect(() => {
    const target = mainCtaRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show sticky bar only when the main CTA button is scrolled above viewport
        const isAboveViewport = entry.boundingClientRect.top < 0;
        setShowStickyBar(!entry.isIntersecting && isAboveViewport);
      },
      {
        threshold: 0,
        rootMargin: "0px"
      }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  // Hide sticky mobile bar when footer is in view
  useEffect(() => {
    let observer: IntersectionObserver | null = null;
    let timer: NodeJS.Timeout | null = null;

    const setupObserver = () => {
      const footer = document.getElementById('main-footer') || document.querySelector('footer');
      if (!footer) {
        timer = setTimeout(setupObserver, 200);
        return;
      }

      observer = new IntersectionObserver(
        ([entry]) => {
          setIsFooterVisible(entry.isIntersecting);
        },
        {
          threshold: 0,
          rootMargin: "0px"
        }
      );

      observer.observe(footer);
    };

    setupObserver();

    return () => {
      if (timer) clearTimeout(timer);
      if (observer) observer.disconnect();
    };
  }, []);

  const triggerAromaAttention = () => {
    setAromaError(true);
    setOpenDropdownIndex(0);
    const container = document.getElementById('flavor-selector-container');
    if (container) {
      container.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (aromaTimeoutRef.current) clearTimeout(aromaTimeoutRef.current);
    aromaTimeoutRef.current = setTimeout(() => {
      setAromaError(false);
    }, 3500);
  };

  // Review stats are already passed from the 30-day cached Server Component via initialStats (0 client DB queries)

  const handleVariantSelect = (variantName: string, variantImage: string | undefined, imageIndex: number | undefined) => {
    setAromaError(false);
    if (aromaTimeoutRef.current) clearTimeout(aromaTimeoutRef.current);

    setSelectedVariant(variantName);
    setOpenDropdownIndex(null);

    if (variantImage) {
      setActiveImage(variantImage);
    } else if (imageIndex !== undefined && product.images[imageIndex]) {
      setActiveImage(product.images[imageIndex]);
    }
  };

  const isSelectionIncomplete = (product.variants ? !selectedVariant : false) || (hasSizes && !selectedSize);
  const combinedVariantName = selectedVariant
    ? (hasSizes && selectedSize ? `${selectedVariant} · ${selectedSize}` : selectedVariant)
    : null;

  const currentVariantStatus = selectedVariant
    ? product.variants?.options.find(o => {
        const optName = typeof o.name === 'object' ? o.name[locale] || o.name['ro'] : o.name;
        return optName === selectedVariant;
      })?.stock_status
    : undefined;

  const isCurrentVariantSoldOut = currentVariantStatus === 'sold_out';
  const numericPrice = getProductPrice(product.price, currency) || 0;
  const numericOriginalPrice = getProductPrice(product.originalPrice, currency) || numericPrice;

  const stickyPrice = numericPrice * standardQuantity;
  const stickyOriginalPrice = numericOriginalPrice * standardQuantity;
  const stickyVariantLabel = combinedVariantName || (locale === 'ro' ? 'Alege varianta' : 'Choose variant');

  const handleAddToCart = () => {
    if (isAdding || isCurrentVariantSoldOut) return;

    if (isSelectionIncomplete) {
      triggerAromaAttention();
      return;
    }

    setIsAdding(true);

    const finalImageIndex = product.images.indexOf(activeImage);
    const currentOpt = product.variants?.options.find(o => {
      const optName = typeof o.name === 'object' ? o.name[locale] || o.name['ro'] : o.name;
      return optName === selectedVariant;
    });

    for (let i = 0; i < standardQuantity; i++) {
      addItem(product, combinedVariantName ? {
        name: combinedVariantName,
        image: currentOpt?.image,
        imageIndex: finalImageIndex !== -1 ? finalImageIndex : (currentOpt?.imageIndex || 0)
      } : undefined);
    }

    setTimeout(() => setIsAdding(false), 1000);
  };

  return (
    <div className="relative w-full overflow-hidden min-h-screen text-white">
      {/* Ambient Radial Spotlight Accents */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#e32f8c]/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-1/2 right-1/4 w-[400px] h-[400px] bg-[#0b3b4f]/15 rounded-full blur-[120px] pointer-events-none -z-10" />

      <div className="relative z-10 max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12 pb-4 lg:pb-8 pt-32 sm:pt-36 md:pt-40">
        {/* ═══ TOP BREADCRUMB NAVIGATION ═══ */}
        <nav aria-label="Breadcrumb" className="mb-4 sm:mb-6">
          <ol className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-zinc-400">
            <li className="flex items-center gap-1.5 sm:gap-2">
              <Link href="/" className="hover:text-white transition-colors">{locale === 'ro' ? 'Acasă' : 'Home'}</Link>
              <span className="text-zinc-600">/</span>
            </li>
            <li className="flex items-center gap-1.5 sm:gap-2">
              <Link href="/shop" className="hover:text-white transition-colors">{locale === 'ro' ? 'Magazin' : 'Shop'}</Link>
              <span className="text-zinc-600">/</span>
            </li>
            <li className="text-[#e32f8c] font-black truncate max-w-[200px] sm:max-w-none" aria-current="page">
              {name as string}
            </li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">

          {/* Left: Product Images */}
          <div className="lg:col-span-6 flex flex-col gap-3 lg:sticky lg:top-24">
            <div className="w-full max-w-md lg:max-w-xl mx-auto aspect-square max-h-[460px] lg:max-h-[500px] relative flex flex-col items-center justify-center p-0 lg:p-2">
              {/* Product Image Ambient Glow */}
              <div className="absolute inset-0 bg-radial from-[#e32f8c]/15 via-transparent to-transparent blur-2xl pointer-events-none -z-10" />

              {/* Product Image */}
              <div className="relative w-full h-full z-10 flex items-center justify-center drop-shadow-2xl">
                {/* Pre-render all product images for instant switching */}
                {Array.from(new Set([
                  ...product.images,
                  ...(product.variants?.options?.map(opt => opt.image).filter(Boolean) as string[] || [])
                ])).map((img, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "absolute inset-0 transition-all duration-500 ease-in-out flex items-center justify-center",
                      (activeImage || product.image) === img ? "opacity-100 scale-100 z-10" : "opacity-0 scale-[0.98] pointer-events-none z-0"
                    )}
                  >
                    <Image
                      src={img}
                      alt={name as string}
                      width={1000}
                      height={1000}
                      priority={idx === 0}
                      className="w-auto h-auto max-w-full max-h-full object-contain rounded-[2rem] drop-shadow-[0_15px_30px_rgba(0,0,0,0.8)]"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center flex-wrap gap-2 sm:gap-3 mt-2 sm:mt-3">
              {product.variants && product.variants.type !== 'size' ? (
                [...product.variants.options]
                  .sort((a, b) => (a.stock_status === 'sold_out' ? 1 : 0) - (b.stock_status === 'sold_out' ? 1 : 0))
                  .map((opt, idx) => {
                    const optName = typeof opt.name === 'object' ? opt.name[locale as 'ro' | 'en'] || opt.name['ro'] : opt.name;
                    const isSelected = selectedVariant === optName;
                    const thumbSrc = opt.image || product.images[opt.imageIndex || 0] || product.image;
                    const isWide = isWideProductImage(thumbSrc);
                    return (
                      <button
                        key={idx}
                        onClick={() => handleVariantSelect(optName as string, opt.image, opt.imageIndex)}
                        className={cn(
                          "relative w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden transition-all duration-300 shadow-md border cursor-pointer",
                          isWide ? "bg-black" : "bg-zinc-950/80",
                          isSelected ? "border-[#e32f8c] ring-2 ring-[#e32f8c]/40 scale-105 z-10 shadow-[0_0_20px_rgba(227,47,140,0.35)]" : "border-white/10 opacity-70 hover:opacity-100 hover:scale-102 hover:border-white/30",
                          opt.stock_status === 'sold_out' ? "opacity-30 grayscale cursor-not-allowed" : ""
                        )}
                        title={optName as string}
                      >
                        <Image src={thumbSrc} alt={optName as string} fill priority className={isWide ? "object-contain p-1" : "object-cover"} sizes="(max-width: 768px) 64px, 112px" />
                      </button>
                    );
                  })
              ) : (
                product.images.map((img, idx) => {
                  const isWide = isWideProductImage(img);
                  return (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(img)}
                    className={cn(
                      "relative w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden transition-all duration-300 shadow-md border cursor-pointer",
                      isWide ? "bg-black" : "bg-zinc-950/80",
                      activeImage === img ? "border-[#e32f8c] ring-2 ring-[#e32f8c]/40 scale-105 z-10 shadow-[0_0_20px_rgba(227,47,140,0.35)]" : "border-white/10 opacity-70 hover:opacity-100 hover:scale-102 hover:border-white/30"
                    )}
                  >
                    <Image src={img} alt={`Thumbnail ${idx + 1}`} fill priority className={isWide ? "object-contain p-1" : "object-cover"} sizes="(max-width: 768px) 64px, 112px" />
                  </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Buy Box */}
          <div className="lg:col-span-6 w-full lg:pt-1">
            {/* Title and Price Row */}
            <div className="flex flex-col gap-2 mb-5">
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight font-[family-name:var(--font-oswald)] leading-[0.95] flex-1">
                  {name as React.ReactNode}
                </h1>
                <div className="flex flex-col items-end shrink-0 mt-1">
                  <span className="text-2xl md:text-3xl font-black text-white tracking-tight leading-none drop-shadow-sm">
                    {numericPrice.toFixed(2)} {currency}
                  </span>
                  {numericOriginalPrice > numericPrice && (
                    <span className="text-sm font-bold text-zinc-500 line-through decoration-2 mt-1">
                      {numericOriginalPrice.toFixed(2)} {currency}
                    </span>
                  )}
                </div>
              </div>

              {/* Reviews */}
              <div className="flex items-center gap-2 mt-1">
                <a href="#reviews-section" className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
                  <StarRating rating={reviewStats.average || 5.0} size="sm" />
                  <span className="text-xs font-bold text-zinc-400 hover:text-white underline decoration-zinc-600">
                    {reviewStats.count > 0 ? reviewStats.count : 48} {locale === 'ro' ? 'recenzii de la atleți' : 'athlete reviews'}
                  </span>
                </a>
              </div>
            </div>

            {/* Product Description */}
            {product.description && (
              <div className="mb-6 border-l-2 border-[#e32f8c] pl-4 py-2 bg-zinc-900/50 border border-white/5 rounded-r-xl">
                <p className="text-zinc-300 font-medium text-sm md:text-base leading-relaxed">
                  {typeof product.description === 'object'
                    ? (product.description[locale as keyof typeof product.description] || product.description['ro'])
                    : product.description}
                </p>
              </div>
            )}

            {/* Variant Section */}
            {product.variants && (
              <div className="mb-6" id="flavor-selector-container">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[12px] font-black uppercase tracking-wider text-zinc-300">
                    {(() => {
                      const rawLabel = typeof product.variants.label === 'object'
                        ? (product.variants.label[locale as 'ro' | 'en'] || product.variants.label['ro'])
                        : product.variants.label;
                      if (rawLabel) {
                        return locale === 'ro'
                          ? `ALEGE ${String(rawLabel).toUpperCase()}`
                          : `SELECT ${String(rawLabel).toUpperCase()}`;
                      }
                      return locale === 'ro' ? 'ALEGE VARIANTA' : 'SELECT VARIANT';
                    })()} ({product.variants.options.length})
                  </h3>
                </div>

                <AnimatePresence>
                  {aromaError && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.96 }}
                      className="mb-3 p-3 bg-red-950/40 border-2 border-red-500 rounded-xl flex items-center gap-2.5 text-red-400 shadow-sm"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-500 animate-pulse" />
                      <span className="text-[11px] font-black uppercase tracking-wider">
                        {locale === 'ro'
                          ? 'Te rugăm să alegi varianta dorită pentru a continua!'
                          : 'Please select your desired variant to continue!'}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-3">
                  {(() => {
                    const selectedVarOpt = product.variants?.options.find(
                      o => {
                        const oName = typeof o.name === 'object' ? o.name[locale as 'ro' | 'en'] || o.name['ro'] : o.name;
                        return oName === selectedVariant;
                      }
                    );
                    const isOpen = openDropdownIndex === 0;
                    const isDesignMode = product.variants?.type === 'design' || (selectedVarOpt?.image && !selectedVarOpt?.color);
                    const selectedThumb = selectedVarOpt?.image || (selectedVarOpt?.imageIndex !== undefined ? product.images[selectedVarOpt.imageIndex] : undefined);

                    return (
                      <div className="relative">
                        <motion.button
                          type="button"
                          animate={aromaError && !selectedVariant ? { x: [-6, 6, -4, 4, -2, 2, 0] } : { x: 0 }}
                          transition={{ duration: 0.4 }}
                          onClick={() => {
                            setOpenDropdownIndex(isOpen ? null : 0);
                            setAromaError(false);
                          }}
                          className={cn(
                            "w-full flex items-center justify-between p-3.5 bg-zinc-900 border transition-all rounded-xl cursor-pointer",
                            aromaError && !selectedVariant
                              ? "border-red-500 ring-2 ring-red-400/40 bg-red-950/20"
                              : (isOpen ? "border-[#e32f8c]" : "border-white/15 hover:border-white/35"),
                            !selectedVariant && !isOpen && !aromaError && "border-white/20"
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {isDesignMode && selectedThumb ? (
                              <div className="relative w-8 h-8 rounded-lg bg-black border border-white/15 overflow-hidden shrink-0">
                                <Image
                                  src={selectedThumb}
                                  alt={selectedVariant || ""}
                                  fill
                                  sizes="32px"
                                  className={isWideProductImage(selectedThumb) ? "object-contain p-0.5" : "object-cover"}
                                />
                              </div>
                            ) : (
                              <div
                                className="w-5 h-5 rounded-full shadow-inner border border-white/20 shrink-0"
                                style={{ backgroundColor: selectedVarOpt?.color || (selectedVariant ? '#a855f7' : '#27272a') }}
                              />
                            )}
                            <span className={cn("text-sm font-black uppercase tracking-wider truncate", selectedVariant ? "text-white" : "text-zinc-400")}>
                              {selectedVariant || (locale === 'ro' ? 'Alege varianta...' : 'Select variant...')}
                            </span>
                          </div>
                          {isOpen ? (
                            <Check className="w-4 h-4 text-white shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-white shrink-0" />
                          )}
                        </motion.button>

                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              transition={{ duration: 0.15 }}
                              className="absolute top-full left-0 w-full mt-1.5 bg-zinc-900 border border-white/15 z-50 max-h-80 overflow-y-auto rounded-xl shadow-2xl custom-scrollbar"
                            >
                              {[...product.variants!.options]
                                .sort((a, b) => (a.stock_status === 'sold_out' ? 1 : 0) - (b.stock_status === 'sold_out' ? 1 : 0))
                                .map((opt) => {
                                  const localizedName = typeof opt.name === 'object' ? opt.name[locale as 'ro' | 'en'] || opt.name['ro'] : opt.name;
                                  const isSelected = selectedVariant === localizedName;
                                  const isSoldOut = opt.stock_status === 'sold_out';
                                  const isPreorder = opt.stock_status === 'preorder';
                                  const optColor = opt.color || '#a855f7';
                                  const optThumb = opt.image || (opt.imageIndex !== undefined ? product.images[opt.imageIndex] : undefined);
                                  const showOptThumb = (product.variants?.type === 'design' || (!opt.color && Boolean(optThumb))) && Boolean(optThumb);

                                  return (
                                    <button
                                      key={localizedName}
                                      type="button"
                                      disabled={isSoldOut}
                                      onClick={() => {
                                        if (!isSoldOut) {
                                          handleVariantSelect(localizedName, opt.image, opt.imageIndex);
                                        }
                                      }}
                                      className={cn(
                                        "w-full flex items-center justify-between p-3.5 hover:bg-zinc-800 transition-colors border-b border-white/5 last:border-none cursor-pointer",
                                        isSoldOut ? "opacity-40 cursor-not-allowed bg-zinc-950/50 hover:bg-zinc-950/50" : ""
                                      )}
                                    >
                                      <div className="flex items-center gap-3">
                                        {showOptThumb && optThumb ? (
                                          <div className="relative w-9 h-9 rounded-lg bg-black border border-white/15 overflow-hidden shrink-0">
                                            <Image
                                              src={optThumb}
                                              alt={localizedName}
                                              fill
                                              sizes="36px"
                                              className={isWideProductImage(optThumb) ? "object-contain p-0.5" : "object-cover"}
                                            />
                                          </div>
                                        ) : (
                                          <div
                                            className="w-5 h-5 rounded-full shadow-inner shrink-0 border border-white/20"
                                            style={{ backgroundColor: optColor }}
                                          />
                                        )}
                                        <div className="flex flex-col items-start text-left">
                                          <span className={cn("text-sm uppercase tracking-wider", isSelected ? "font-black text-white" : "font-bold text-zinc-300")}>
                                            {localizedName}
                                          </span>
                                          {(opt.badge || isSoldOut || isPreorder) && (
                                            <span className={cn(
                                              "text-[10px] font-black uppercase tracking-widest mt-0.5",
                                              isSoldOut ? "text-red-400" : (isPreorder ? "text-cyan-400" : "text-[#e32f8c]")
                                            )}>
                                              {isSoldOut ? "SOLD OUT" : (isPreorder ? "PRECOMANDĂ" : opt.badge)}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      {isSelected && <Check className="w-4 h-4 text-[#e32f8c] shrink-0 stroke-[3]" />}
                                    </button>
                                  );
                                })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Size Selector (for multi-attribute apparel like TREN Oversized Tee) */}
            {hasSizes && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[12px] font-black uppercase tracking-wider text-zinc-300">
                    {(() => {
                      const rawSizeLabel = product.bundleVariants?.size?.label;
                      const sizeLabelText = typeof rawSizeLabel === 'object'
                        ? (rawSizeLabel[locale as 'ro' | 'en'] || rawSizeLabel['ro'])
                        : rawSizeLabel;
                      return locale === 'ro'
                        ? `ALEGE ${(sizeLabelText || 'MĂRIMEA').toUpperCase()}`
                        : `SELECT ${(sizeLabelText || 'SIZE').toUpperCase()}`;
                    })()}
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Oversized Fit · 260 GSM
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {sizeOptions.map((sz) => {
                    const isSizeSelected = selectedSize === sz;
                    return (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setSelectedSize(sz)}
                        className={cn(
                          "h-11 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider border transition-all cursor-pointer",
                          isSizeSelected
                            ? "bg-[#e32f8c] text-white border-[#e32f8c] shadow-[0_0_20px_rgba(227,47,140,0.35)]"
                            : "bg-zinc-900 text-zinc-300 border-white/15 hover:border-white/40 hover:text-white"
                        )}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity Selector */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[12px] font-black uppercase tracking-wider text-zinc-300">
                  {locale === 'ro' ? "CANTITATE" : "QUANTITY"}
                </h3>
              </div>
              <div className="flex items-center border border-white/10 bg-zinc-900/80 rounded-xl w-32 h-12">
                <button
                  type="button"
                  onClick={() => setStandardQuantity(Math.max(1, standardQuantity - 1))}
                  className="w-10 h-full flex items-center justify-center text-white hover:bg-white/10 active:bg-white/20 transition-colors rounded-l-xl cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="flex-1 text-center font-black text-sm text-white select-none">
                  {standardQuantity}
                </div>
                <button
                  type="button"
                  onClick={() => setStandardQuantity(standardQuantity + 1)}
                  className="w-10 h-full flex items-center justify-center text-white hover:bg-white/10 active:bg-white/20 transition-colors rounded-r-xl cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ADD TO CART BUTTON (Full Width for Maximum Mobile & Desktop Conversion) */}
            <button
              ref={mainCtaRef}
              onClick={handleAddToCart}
              disabled={isAdding || isCurrentVariantSoldOut}
              className={cn(
                "w-full py-4 rounded-xl font-black uppercase tracking-wider text-base flex items-center justify-center gap-2 mb-3 transition-all cursor-pointer shadow-lg active:scale-[0.99]",
                isCurrentVariantSoldOut
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5"
                  : isSelectionIncomplete
                    ? "bg-zinc-900 text-white border border-white/20 hover:border-[#e32f8c] hover:bg-zinc-850 hover:shadow-[0_0_20px_rgba(227,47,140,0.2)]"
                    : "bg-[#e32f8c] text-white hover:bg-[#ff3b9e] shadow-[0_0_30px_rgba(227,47,140,0.4)] hover:shadow-[0_0_40px_rgba(227,47,140,0.6)]"
              )}
            >
              {isAdding ? (
                <span className="animate-pulse">{locale === 'ro' ? "SE ADAUGĂ..." : "ADDING..."}</span>
              ) : isSelectionIncomplete ? (
                <span className="flex items-center gap-2 text-xs sm:text-sm">
                  <span>{locale === 'ro' ? "ALEGE VARIANTA PENTRU A CONTINUA" : "SELECT VARIANT TO CONTINUE"}</span>
                  <ChevronDown className="w-4 h-4 animate-bounce" />
                </span>
              ) : isCurrentVariantSoldOut ? (
                <span>{locale === 'ro' ? "STOC EPUIZAT" : "SOLD OUT"}</span>
              ) : (
                <span className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  <span>{locale === 'ro' ? "ADAUGĂ ÎN COȘ" : "ADD TO CART"}</span>
                </span>
              )}
            </button>

            {/* Actual Stripe Express Checkout Element */}
            <div className={cn("mb-8 -mt-4", hasExpressWallets === false ? "hidden" : "block")}>
              <div className="flex items-center gap-4 py-2 mb-3">
                <div className="h-px bg-white/10 flex-1" />
                <span className="text-[9px] font-bold uppercase text-zinc-500 tracking-widest">{locale === 'ro' ? 'Plătește rapid' : 'Express Checkout'}</span>
                <div className="h-px bg-white/10 flex-1" />
              </div>
              {(() => {
                let items: any[] = [];
                let basePrice = 0;
                let isReady = false;

                if (!isCurrentVariantSoldOut && !isSelectionIncomplete) {
                  isReady = true;
                  const numericPrice = Number(product.price) || 149.99;
                  
                  const singleWeight = Number(product.weight) || 0.2;
                  const currentOpt = product.variants?.options.find(o => {
                    const optName = typeof o.name === 'object' ? o.name[locale] || o.name['ro'] : o.name;
                    return optName === selectedVariant;
                  });
                  // Send as multiple separate items so cart calculations apply
                  for (let i = 0; i < standardQuantity; i++) {
                    items.push({
                      id: product.id,
                      quantity: 1,
                      price: numericPrice,
                      weight: singleWeight,
                      name: product.name,
                      selectedVariant: combinedVariantName ? { name: combinedVariantName, image: currentOpt?.image } : undefined
                    });
                    basePrice += numericPrice;
                  }
                }

                return (
                  <ProductExpressCheckout 
                    orderItems={items}
                    basePrice={basePrice}
                    disabled={!isReady || isAdding}
                    onWalletsReady={(available) => setHasExpressWallets(available)}
                  />
                );
              })()}
            </div>

            {/* High-Converting Athlete Quality & Testing Assurance Strip */}
            <div className="grid grid-cols-3 gap-2.5 mb-4 mt-2 text-center">
              <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-[#e32f8c]/30 transition-colors">
                <Dumbbell className="w-4 h-4 text-[#e32f8c] mb-1.5" />
                <span className="text-[11px] font-black uppercase text-white tracking-tight">
                  {locale === 'ro' ? 'MATERIAL SOLID' : 'BUILT TO LAST'}
                </span>
                <span className="text-[10px] text-zinc-400 font-medium">
                  {locale === 'ro' ? 'Nu se lasă în timp' : "Won't stretch out"}
                </span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-[#e32f8c]/30 transition-colors">
                <Zap className="w-4 h-4 text-[#e32f8c] mb-1.5" />
                <span className="text-[11px] font-black uppercase text-white tracking-tight">
                  {locale === 'ro' ? 'TESTATE LA 200KG+' : 'TESTED AT 200KG+'}
                </span>
                <span className="text-[10px] text-zinc-400 font-medium">
                  {locale === 'ro' ? 'Sigure pe seriile grele' : 'Solid on heavy sets'}
                </span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-[#e32f8c]/30 transition-colors">
                <ShieldCheck className="w-4 h-4 text-[#e32f8c] mb-1.5" />
                <span className="text-[11px] font-black uppercase text-white tracking-tight">
                  {locale === 'ro' ? 'SUPORT & REBOUND' : 'SUPPORT & REBOUND'}
                </span>
                <span className="text-[10px] text-zinc-400 font-medium">
                  {locale === 'ro' ? 'Uită de dureri la împins' : 'Lift pain-free every set'}
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* 📱 Sticky Mobile Add-to-Cart Bar (Portaled to document.body to prevent stacking context clipping) */}
      {mounted && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showStickyBar && !isCartOpen && !isFooterVisible && (
            <motion.aside
              aria-label="Bara rapidă de comandă"
              initial={{ y: 120, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 120, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="lg:hidden fixed bottom-0 left-0 right-0 z-[60] bg-zinc-950/95 backdrop-blur-2xl border-t border-white/10 px-4 py-3 shadow-[0_-12px_35px_rgba(0,0,0,0.85)] pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]"
            >
              <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className={cn(
                    "relative w-12 h-12 rounded-xl overflow-hidden border border-white/10 shrink-0",
                    isWideProductImage(activeImage || product.image || product.images[0]) ? "bg-black" : "bg-black/60"
                  )}>
                    <Image
                      src={activeImage || product.image || product.images[0]}
                      alt={typeof name === 'string' ? name : 'TrenZone'}
                      fill
                      sizes="48px"
                      className={isWideProductImage(activeImage || product.image || product.images[0]) ? "object-contain p-0.5" : "object-cover"}
                    />
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col justify-center">
                    <span className="text-xs font-black uppercase text-white truncate font-heading tracking-tight leading-tight">
                      {name as string}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-xs font-black text-[#e32f8c] tracking-tight">
                        {stickyPrice.toFixed(2)} {currency}
                      </span>
                      {stickyOriginalPrice > stickyPrice && (
                        <span className="text-[10px] text-zinc-500 line-through">
                          {stickyOriginalPrice.toFixed(2)}
                        </span>
                      )}
                      {stickyVariantLabel && (
                        <span className="text-[9px] font-bold text-zinc-300 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded uppercase truncate max-w-[130px]">
                          {stickyVariantLabel}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={isAdding || isCurrentVariantSoldOut}
                  className={cn(
                    "h-11 px-4 sm:px-5 rounded-xl font-black uppercase text-xs tracking-wider flex items-center justify-center gap-1.5 shrink-0 transition-all active:scale-95 shadow-md cursor-pointer",
                    isCurrentVariantSoldOut
                      ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5"
                      : isSelectionIncomplete
                        ? "bg-zinc-900 text-white border border-[#e32f8c]/60 hover:bg-zinc-850"
                        : "bg-[#e32f8c] hover:bg-[#ff3b9e] text-white shadow-[0_0_20px_rgba(227,47,140,0.45)]"
                  )}
                >
                  {isAdding ? (
                    <span className="animate-pulse">{locale === 'ro' ? "Se adaugă..." : "Adding..."}</span>
                  ) : isCurrentVariantSoldOut ? (
                    <span>{locale === 'ro' ? "Epuizat" : "Sold Out"}</span>
                  ) : isSelectionIncomplete ? (
                    <span className="flex items-center gap-1">
                      <span>{locale === 'ro' ? "Alege Opțiune" : "Select Option"}</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>{locale === 'ro' ? "Adaugă în Coș" : "Add to Cart"}</span>
                    </span>
                  )}
                </button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
