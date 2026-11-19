"use client";

import { Product } from "@/lib/api";
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { ChevronDown, ChevronLeft, ChevronRight, Plus, Minus, Check, ShoppingCart, Zap, ShieldCheck, Dumbbell, AlertCircle, Ruler, X, Truck, Mail, Award, Flame, Target, Clock } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { useCartStore } from "@/store/useCartStore";
import { getProductPrice } from "@/utils/pricing";
import { useRegionStore } from "@/store/useRegionStore";
import { cn } from "@/lib/utils";
import { isWideProductImage } from "@/lib/product-images";
import { StarRating } from "@/components/ui/StarRating";
import { ProductExpressCheckout } from "@/components/checkout/ProductExpressCheckout";
import { isDigitalProgramItem } from "@/lib/programs";
import { getResolvedProductHighlights, getSizeGuideKind, type HighlightIconKey } from "@/lib/product-features";

function renderHighlightIcon(key: HighlightIconKey) {
  const cls = "w-4 h-4 text-[#e32f8c] mb-1.5";
  switch (key) {
    case "dumbbell":
      return <Dumbbell className={cls} />;
    case "zap":
      return <Zap className={cls} />;
    case "shield":
      return <ShieldCheck className={cls} />;
    case "mail":
      return <Mail className={cls} />;
    case "check":
      return <Check className={cls} />;
    case "flame":
      return <Flame className={cls} />;
    case "target":
      return <Target className={cls} />;
    case "sparkles":
    default:
      return <Award className={cls} />;
  }
}

function LanguageFlagSvg({ isEnglish }: { isEnglish: boolean }) {
  if (isEnglish) {
    return (
      <svg
        viewBox="0 0 60 40"
        className="w-5 h-3.5 rounded-[3px] shadow-2xs border border-white/20 shrink-0"
        aria-hidden="true"
      >
        <rect width="60" height="40" fill="#012169" />
        <path d="M0,0 L60,40 M60,0 L0,40" stroke="#FFFFFF" strokeWidth="7" />
        <path d="M0,0 L60,40 M60,0 L0,40" stroke="#C8102E" strokeWidth="3.5" />
        <path d="M30,0 V40 M0,20 H60" stroke="#FFFFFF" strokeWidth="11" />
        <path d="M30,0 V40 M0,20 H60" stroke="#C8102E" strokeWidth="6.5" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 16"
      className="w-5 h-3.5 rounded-[3px] shadow-2xs border border-white/20 shrink-0"
      aria-hidden="true"
    >
      <rect width="8" height="16" x="0" fill="#002B7F" />
      <rect width="8" height="16" x="8" fill="#FCD116" />
      <rect width="8" height="16" x="16" fill="#CE1126" />
    </svg>
  );
}

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
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);

  useEffect(() => {
    if (!isSizeGuideOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSizeGuideOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [isSizeGuideOpen]);
  const touchStartXRef = useRef<number | null>(null);

  const allGalleryImages = Array.from(
    new Set([
      ...product.images,
      ...((product.variants?.options?.map((opt) => opt.image).filter(Boolean) as string[]) || []),
    ])
  );

  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const addFeedbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [hasExpressWallets, setHasExpressWallets] = useState<boolean | null>(null);
  const [aromaError, setAromaError] = useState(false);
  const aromaTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mainCtaRef = useRef<HTMLButtonElement | null>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [isFooterVisible, setIsFooterVisible] = useState(false);

  const prevLocaleForVariantRef = useRef<string | null>(null);
  // Pre-select first available variant (or matching language for digital programs) and re-localize only on init or locale change
  useEffect(() => {
    if (!product.variants?.options?.length) return;
    const localeChanged =
      prevLocaleForVariantRef.current !== null &&
      prevLocaleForVariantRef.current !== locale;
    prevLocaleForVariantRef.current = locale;

    if (isDigitalProgramItem(product)) {
      if (!selectedVariant) {
        const targetEng = locale === 'en';
        const langOpt =
          product.variants.options.find((o) => {
            const raw = typeof o.name === 'object' ? `${o.name.en || ''} ${o.name.ro || ''}` : String(o.name || '');
            const isEngOpt = raw.toLowerCase().includes('eng');
            return targetEng ? isEngOpt : !isEngOpt;
          }) || product.variants.options[0];
        if (langOpt) {
          const optName =
            typeof langOpt.name === 'object'
              ? langOpt.name[locale as 'ro' | 'en'] || langOpt.name['ro']
              : langOpt.name;
          if (optName) setSelectedVariant(optName as string);
        }
        return;
      }
      if (localeChanged) {
        const matchedOpt = product.variants.options.find((o) => {
          if (typeof o.name === 'object') {
            return o.name.ro === selectedVariant || o.name.en === selectedVariant;
          }
          return o.name === selectedVariant;
        });
        if (matchedOpt && typeof matchedOpt.name === 'object') {
          const localizedOptName = matchedOpt.name[locale as 'ro' | 'en'] || matchedOpt.name['ro'];
          if (localizedOptName && localizedOptName !== selectedVariant) {
            setSelectedVariant(localizedOptName as string);
          }
        }
      }
      return;
    }
    if (!selectedVariant) {
      const firstAvailable = product.variants.options.find(o => o.stock_status !== 'sold_out') || product.variants.options[0];
      if (firstAvailable) {
        const optName = typeof firstAvailable.name === 'object' ? firstAvailable.name[locale as 'ro' | 'en'] || firstAvailable.name['ro'] : firstAvailable.name;
        setSelectedVariant(optName as string);
        if (firstAvailable.image) {
          setActiveImage(firstAvailable.image);
        }
      }
      return;
    }

    const matchedOpt = product.variants.options.find((o) => {
      if (typeof o.name === 'object') {
        return o.name.ro === selectedVariant || o.name.en === selectedVariant;
      }
      return o.name === selectedVariant;
    });
    if (matchedOpt && typeof matchedOpt.name === 'object') {
      const localizedOptName = matchedOpt.name[locale as 'ro' | 'en'] || matchedOpt.name['ro'];
      if (localizedOptName && localizedOptName !== selectedVariant) {
        setSelectedVariant(localizedOptName as string);
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
      if (addFeedbackTimerRef.current) clearTimeout(addFeedbackTimerRef.current);
      if (aromaTimeoutRef.current) clearTimeout(aromaTimeoutRef.current);
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

  const currentOpt = selectedVariant
    ? product.variants?.options.find(o => {
        const optName = typeof o.name === 'object' ? (o.name[locale] || o.name['ro'] || o.name['en']) : o.name;
        const optRo = typeof o.name === 'object' ? o.name.ro : o.name;
        const optEn = typeof o.name === 'object' ? o.name.en : o.name;
        return optName === selectedVariant || optRo === selectedVariant || optEn === selectedVariant;
      })
    : undefined;
  const currentVariantStatus = currentOpt?.stock_status;
  const isCurrentVariantPreorder =
    !isDigitalProgramItem(product) &&
    (currentVariantStatus === 'preorder' || (product as any).stock_status === 'preorder');
  const isSoftStock = Boolean((product as any).metadata?.soft_stock_tracking);
  const isProductOutOfStock =
    product.is_active === false ||
    (product as any).stock_status === 'sold_out' ||
    (product as any).metadata?.stock_status === 'sold_out' ||
    (!isSoftStock && typeof product.stock_quantity === 'number' && product.stock_quantity <= 0 && currentVariantStatus !== 'preorder');
  const isCurrentVariantSoldOut = currentVariantStatus === 'sold_out' || isProductOutOfStock;
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
    const activeOpt = currentOpt || product.variants?.options.find(o => {
      const optName = typeof o.name === 'object' ? o.name[locale] || o.name['ro'] : o.name;
      return optName === selectedVariant;
    });

    const added = addItem(product, combinedVariantName ? {
      name: combinedVariantName,
      image: activeOpt?.image,
      imageIndex: finalImageIndex !== -1 ? finalImageIndex : (activeOpt?.imageIndex || 0),
      stock_status: activeOpt?.stock_status,
    } : undefined, standardQuantity);

    if (added) {
      setJustAdded(true);
      if (addFeedbackTimerRef.current) clearTimeout(addFeedbackTimerRef.current);
      addFeedbackTimerRef.current = setTimeout(() => setJustAdded(false), 1600);
    }

    setTimeout(() => setIsAdding(false), 350);
  };

  return (
    <div className="relative w-full overflow-x-clip min-h-dvh text-white">
      {/* Ambient Radial Spotlight Accents (pure gradient — avoids heavy GPU blur filter INP/CLS) */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(227,47,140,0.12)_0%,transparent_70%)] pointer-events-none -z-10" />
      <div className="absolute top-1/2 right-1/4 w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(11,59,79,0.20)_0%,transparent_70%)] pointer-events-none -z-10" />

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

              {/* Product Image with Mobile Touch Swipe & Prev/Next Controls */}
              <div
                className="relative w-full h-full z-10 flex items-center justify-center drop-shadow-2xl"
                onTouchStart={(e) => {
                  touchStartXRef.current = e.touches[0]?.clientX ?? null;
                }}
                onTouchEnd={(e) => {
                  if (touchStartXRef.current === null || allGalleryImages.length <= 1) return;
                  const deltaX = (e.changedTouches[0]?.clientX ?? touchStartXRef.current) - touchStartXRef.current;
                  touchStartXRef.current = null;
                  if (Math.abs(deltaX) < 40) return;
                  const curIdx = Math.max(0, allGalleryImages.indexOf(activeImage || product.image));
                  const nextIdx = deltaX < 0
                    ? (curIdx + 1) % allGalleryImages.length
                    : (curIdx - 1 + allGalleryImages.length) % allGalleryImages.length;
                  setActiveImage(allGalleryImages[nextIdx]);
                }}
              >
                {/* Pre-render active & gallery product images (prioritize primary LCP image, lazy-load variants) */}
                {allGalleryImages.map((img, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "absolute inset-0 transition-opacity duration-300 ease-out flex items-center justify-center",
                      (activeImage || product.image) === img ? "opacity-100 z-10" : "opacity-0 pointer-events-none z-0"
                    )}
                  >
                    <Image
                      src={img}
                      alt={name as string}
                      width={1000}
                      height={1000}
                      priority={idx === 0}
                      fetchPriority={idx === 0 ? "high" : "low"}
                      loading={idx === 0 ? "eager" : "lazy"}
                      decoding="async"
                      sizes="(max-width: 1024px) 92vw, 576px"
                      className="w-auto h-auto max-w-full max-h-full object-contain rounded-[2rem] drop-shadow-[0_15px_30px_rgba(0,0,0,0.8)]"
                    />
                  </div>
                ))}

                {allGalleryImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      aria-label={locale === 'ro' ? 'Imaginea anterioară' : 'Previous image'}
                      onClick={() => {
                        const curIdx = Math.max(0, allGalleryImages.indexOf(activeImage || product.image));
                        const prevIdx = (curIdx - 1 + allGalleryImages.length) % allGalleryImages.length;
                        setActiveImage(allGalleryImages[prevIdx]);
                      }}
                      className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/60 hover:bg-[#e32f8c] text-white border border-white/15 flex items-center justify-center transition-all cursor-pointer active:scale-[0.98] backdrop-blur-md"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      aria-label={locale === 'ro' ? 'Imaginea următoare' : 'Next image'}
                      onClick={() => {
                        const curIdx = Math.max(0, allGalleryImages.indexOf(activeImage || product.image));
                        const nextIdx = (curIdx + 1) % allGalleryImages.length;
                        setActiveImage(allGalleryImages[nextIdx]);
                      }}
                      className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/60 hover:bg-[#e32f8c] text-white border border-white/15 flex items-center justify-center transition-all cursor-pointer active:scale-[0.98] backdrop-blur-md"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-center flex-wrap gap-2 sm:gap-3 mt-2 sm:mt-3">
              {allGalleryImages.map((img, idx) => {
                const isWide = isWideProductImage(img);
                const matchingOpt = product.variants && product.variants.type !== 'size'
                  ? product.variants.options.find(
                      (o) => (o.image || product.images[o.imageIndex || 0]) === img
                    )
                  : undefined;
                const optName = matchingOpt
                  ? (typeof matchingOpt.name === 'object' ? matchingOpt.name[locale as 'ro' | 'en'] || matchingOpt.name['ro'] : matchingOpt.name)
                  : undefined;
                const isCurrentImg = (activeImage || product.image) === img;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setActiveImage(img);
                      if (matchingOpt && matchingOpt.stock_status !== 'sold_out' && optName) {
                        handleVariantSelect(optName as string, matchingOpt.image, matchingOpt.imageIndex);
                      }
                    }}
                    className={cn(
                      "relative rounded-2xl overflow-hidden transition-all duration-300 shadow-md border cursor-pointer active:scale-[0.98]",
                      isWide ? "w-20 h-14 sm:w-24 sm:h-16 bg-black" : "w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-zinc-950/80",
                      isCurrentImg
                        ? "border-[#e32f8c] ring-2 ring-[#e32f8c]/40 scale-105 z-10 shadow-[0_0_20px_rgba(227,47,140,0.35)]"
                        : "border-white/10 opacity-70 hover:opacity-100 hover:scale-102 hover:border-white/30"
                    )}
                    title={(optName as string) || `${name} - ${idx + 1}`}
                  >
                    <Image
                      src={img}
                      alt={(optName as string) || `${name} - ${idx + 1}`}
                      fill
                      loading="lazy"
                      decoding="async"
                      className={isWide ? "object-contain p-1" : "object-cover"}
                      sizes="(max-width: 768px) 64px, 112px"
                    />
                  </button>
                );
              })}
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
                  {getSizeGuideKind(product) === 'belt' && (
                    <button
                      type="button"
                      onClick={() => setIsSizeGuideOpen(true)}
                      className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-[#e32f8c] hover:text-white transition-all active:scale-[0.98] cursor-pointer"
                    >
                      <Ruler className="w-3.5 h-3.5" />
                      <span>{locale === 'ro' ? 'Ghid Mărimi' : 'Size Guide'}</span>
                    </button>
                  )}
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
                    const isDigital = isDigitalProgramItem(product);
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
                            "w-full flex items-center justify-between p-3.5 bg-zinc-900 border transition-all rounded-xl cursor-pointer active:scale-[0.98]",
                            aromaError && !selectedVariant
                              ? "border-red-500 ring-2 ring-red-400/40 bg-red-950/20"
                              : (isOpen ? "border-[#e32f8c]" : "border-white/15 hover:border-white/35"),
                            !selectedVariant && !isOpen && !aromaError && "border-white/20"
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {isDigital ? (
                              <LanguageFlagSvg isEnglish={(selectedVariant || '').toLowerCase().includes('eng')} />
                            ) : isDesignMode && selectedThumb ? (
                              <div className={cn(
                                "relative rounded-lg bg-black border border-white/15 overflow-hidden shrink-0",
                                isWideProductImage(selectedThumb) ? "w-12 h-8" : "w-8 h-8"
                              )}>
                                <Image
                                  src={selectedThumb}
                                  alt={selectedVariant || ""}
                                  fill
                                  sizes="48px"
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
                            {selectedVarOpt?.stock_status === 'preorder' && !isDigital && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/35 text-amber-300 text-[9.5px] font-black uppercase tracking-wider shrink-0">
                                <Clock className="w-2.5 h-2.5" />
                                {locale === 'en' ? 'PRE-ORDER' : 'PRECOMANDĂ'}
                              </span>
                            )}
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
                                        "w-full flex items-center justify-between p-3.5 hover:bg-zinc-800 transition-all active:scale-[0.98] border-b border-white/5 last:border-none cursor-pointer",
                                        isSoldOut ? "opacity-40 cursor-not-allowed bg-zinc-950/50 hover:bg-zinc-950/50 active:scale-100" : ""
                                      )}
                                    >
                                      <div className="flex items-center gap-3">
                                        {isDigital ? (
                                          <LanguageFlagSvg isEnglish={localizedName.toLowerCase().includes('eng')} />
                                        ) : showOptThumb && optThumb ? (
                                          <div className={cn(
                                            "relative rounded-lg bg-black border border-white/15 overflow-hidden shrink-0",
                                            isWideProductImage(optThumb) ? "w-12 h-8" : "w-9 h-9"
                                          )}>
                                            <Image
                                              src={optThumb}
                                              alt={localizedName}
                                              fill
                                              sizes="48px"
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
                                          {(isSoldOut || isPreorder) && (
                                            <span className={cn(
                                              "text-[10px] font-black uppercase tracking-widest mt-0.5",
                                              isSoldOut ? "text-red-400" : "text-cyan-400"
                                            )}>
                                              {isSoldOut ? (locale === "en" ? "SOLD OUT" : "STOC EPUIZAT") : (locale === "en" ? "PRE-ORDER" : "PRECOMANDĂ")}
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
                  <button
                    type="button"
                    onClick={() => setIsSizeGuideOpen(true)}
                    className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-[#e32f8c] hover:text-white transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Ruler className="w-3.5 h-3.5" />
                    <span>{locale === 'ro' ? 'Ghid Mărimi' : 'Size Guide'}</span>
                  </button>
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
                          "h-11 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider border transition-all active:scale-[0.98] cursor-pointer",
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

            {/* Pre-order Timeline & Notice */}
            {isCurrentVariantPreorder && !isCurrentVariantSoldOut && (
              <div className="mb-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-400/30 flex items-start gap-2.5 text-left">
                <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <p className="font-black uppercase tracking-wider text-amber-300 text-[11px]">
                    {locale === 'ro' ? 'Precomandă · Lot nou în curs de sosire' : 'Pre-Order · Next batch arriving soon'}
                  </p>
                  <p className="text-zinc-300 font-medium mt-0.5 text-[11.5px]">
                    {locale === 'ro'
                      ? 'Rezervă-ți produsul acum — se expediază automat la sosirea stocului (plată exclusiv online cu cardul).'
                      : 'Reserve yours now — ships automatically as soon as the new batch arrives (online card payment only).'}
                  </p>
                </div>
              </div>
            )}

            {/* Quantity + ADD TO CART (Compact inline row) */}
            <div className="flex items-stretch gap-2.5 sm:gap-3 mb-5">
              {!isDigitalProgramItem(product) && (
                <div
                  className="flex items-center justify-between shrink-0 w-[116px] sm:w-[132px] h-[54px] border border-white/15 bg-zinc-900/85 rounded-xl px-1.5"
                  aria-label={locale === 'ro' ? 'Cantitate' : 'Quantity'}
                >
                  <button
                    type="button"
                    onClick={() => setStandardQuantity(Math.max(1, standardQuantity - 1))}
                    disabled={standardQuantity <= 1}
                    aria-label={locale === 'ro' ? 'Scade cantitatea' : 'Decrease quantity'}
                    className="w-9 h-10 flex items-center justify-center text-white hover:bg-white/10 active:bg-white/20 active:scale-[0.95] disabled:opacity-35 disabled:pointer-events-none transition-all rounded-lg cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-7 text-center font-black text-sm text-white select-none tabular-nums">
                    {standardQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setStandardQuantity(standardQuantity + 1)}
                    aria-label={locale === 'ro' ? 'Crește cantitatea' : 'Increase quantity'}
                    className="w-9 h-10 flex items-center justify-center text-white hover:bg-white/10 active:bg-white/20 active:scale-[0.95] transition-all rounded-lg cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              )}

              <button
                ref={mainCtaRef}
                onClick={handleAddToCart}
                disabled={isAdding || isCurrentVariantSoldOut}
                className={cn(
                  "flex-1 min-w-0 h-[54px] px-4 rounded-xl font-black uppercase tracking-wider text-sm sm:text-base flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-[0.98]",
                  isCurrentVariantSoldOut
                    ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5"
                    : justAdded
                      ? "bg-emerald-500 text-white shadow-[0_0_25px_rgba(16,185,129,0.45)]"
                      : isSelectionIncomplete
                        ? "bg-zinc-900 text-white border border-white/20 hover:border-[#e32f8c] hover:bg-zinc-850 hover:shadow-[0_0_20px_rgba(227,47,140,0.2)]"
                        : "bg-[#e32f8c] text-white hover:bg-[#ff3b9e] shadow-[0_0_30px_rgba(227,47,140,0.4)] hover:shadow-[0_0_40px_rgba(227,47,140,0.6)]"
                )}
              >
                {justAdded ? (
                  <span className="flex items-center gap-2">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 stroke-[2.75]" />
                    <span className="truncate">{locale === 'ro' ? "ADĂUGAT!" : "ADDED!"}</span>
                  </span>
                ) : isAdding ? (
                  <span className="animate-pulse">{locale === 'ro' ? "SE ADAUGĂ..." : "ADDING..."}</span>
                ) : isSelectionIncomplete ? (
                  <span className="flex items-center gap-1.5 text-xs sm:text-sm truncate">
                    <span className="truncate">{locale === 'ro' ? "ALEGE VARIANTA" : "SELECT VARIANT"}</span>
                    <ChevronDown className="w-4 h-4 shrink-0 animate-bounce" />
                  </span>
                ) : isCurrentVariantSoldOut ? (
                  <span>{locale === 'ro' ? "STOC EPUIZAT" : "SOLD OUT"}</span>
                ) : (
                  <span className="flex items-center gap-2">
                    {isCurrentVariantPreorder ? (
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                    ) : (
                      <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                    )}
                    <span className="truncate">
                      {isCurrentVariantPreorder
                        ? (locale === 'ro' ? "PRECOMANDĂ ACUM" : "PRE-ORDER NOW")
                        : (locale === 'ro' ? "ADAUGĂ ÎN COȘ" : "ADD TO CART")}
                    </span>
                  </span>
                )}
              </button>
            </div>

            {/* Actual Stripe Express Checkout Element */}
            <div className={cn("mb-8", hasExpressWallets === false ? "hidden" : "block")}>
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
                  const numericPrice = getProductPrice(product.price, currency) || 0;
                  
                  const isDigitalProd = isDigitalProgramItem(product);
                  const singleWeight = isDigitalProd ? 0 : (Number(product.weight) > 0 ? Number(product.weight) : 0.2);
                  const currentOpt = product.variants?.options.find(o => {
                    const optName = typeof o.name === 'object' ? o.name[locale] || o.name['ro'] : o.name;
                    return optName === selectedVariant;
                  });
                  // Send as multiple separate items so cart calculations apply
                  for (let i = 0; i < standardQuantity; i++) {
                    items.push({
                      id: product.id,
                      slug: product.slug,
                      quantity: 1,
                      price: numericPrice,
                      weight: singleWeight,
                      is_digital: isDigitalProd,
                      specs_summary: (product as any).specs_summary,
                      name: product.name,
                      stock_status: currentOpt?.stock_status || (product as any).stock_status,
                      is_preorder: isCurrentVariantPreorder,
                      selectedVariant: combinedVariantName
                        ? {
                            name: combinedVariantName,
                            image: currentOpt?.image,
                            stock_status: currentOpt?.stock_status,
                          }
                        : undefined
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

            {/* Dynamic Product Quality & Value Strip (Adapts to Digital Programs vs Apparel vs Wraps vs Custom Admin Highlights) */}
            {(() => {
              const highlights = getResolvedProductHighlights(product, locale);
              if (!highlights.length) return null;
              return (
                <div
                  className={cn(
                    "grid gap-2.5 mb-4 mt-2 text-center",
                    highlights.length === 1
                      ? "grid-cols-1"
                      : highlights.length === 2
                      ? "grid-cols-2"
                      : "grid-cols-1 sm:grid-cols-3"
                  )}
                >
                  {highlights.map((item, idx) => (
                    <div
                      key={`${item.title}-${idx}`}
                      className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-[#e32f8c]/30 transition-colors"
                    >
                      {renderHighlightIcon(item.icon)}
                      <span className="text-[11px] font-black uppercase text-white tracking-tight">
                        {item.title}
                      </span>
                      {item.subtitle && (
                        <span className="text-[10px] text-zinc-400 font-medium mt-0.5">
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}

          </div>
        </div>
      </div>

      {/* Interactive Size Guide Modal */}
      {mounted && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isSizeGuideOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSizeGuideOpen(false)}
              className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 12 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg bg-zinc-950 border border-white/15 rounded-2xl p-5 sm:p-6 text-white shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Ruler className="w-5 h-5 text-[#e32f8c]" />
                    <h3 className="text-base sm:text-lg font-black uppercase tracking-tight">
                      {locale === 'ro' ? 'Ghid Oficial de Mărimi' : 'Official Size Guide'}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSizeGuideOpen(false)}
                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 flex items-center justify-center text-zinc-400 hover:text-white transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {getSizeGuideKind(product) === 'belt' ? (
                  <div className="space-y-3 text-xs sm:text-sm">
                    <p className="text-zinc-300 leading-relaxed">
                      {locale === 'ro'
                        ? 'Măsoară circumferința taliei în dreptul buricului (unde stă centura în timpul genuflexiunilor/îndreptărilor), nu mărimea de la pantaloni:'
                        : 'Measure your waist circumference across the navel (where the belt sits during squats/deadlifts), not your pant size:'}
                    </p>
                    <div className="overflow-hidden rounded-xl border border-white/10">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-white/5 text-[11px] font-black uppercase text-zinc-400">
                            <th className="py-2.5 px-3">{locale === 'ro' ? 'Mărime' : 'Size'}</th>
                            <th className="py-2.5 px-3">{locale === 'ro' ? 'Interval (cm)' : 'Range (cm)'}</th>
                            <th className="py-2.5 px-3">{locale === 'ro' ? 'Interval (in)' : 'Range (in)'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10 text-xs font-bold">
                          {[
                            { size: 'XS', cm: '57.5–70 cm', inch: '22.5–27.5 in' },
                            { size: 'S', cm: '65–80 cm', inch: '25.5–31.5 in' },
                            { size: 'M', cm: '72.5–90 cm', inch: '28.5–35.5 in' },
                            { size: 'L', cm: '80–100 cm', inch: '31.5–39.5 in' },
                            { size: 'XL', cm: '87.5–110 cm', inch: '34.5–43.5 in' },
                            { size: '2XL', cm: '95–120 cm', inch: '37.5–47 in' },
                          ].map((row) => (
                            <tr key={row.size}>
                              <td className="py-2.5 px-3 text-[#e32f8c] font-black">{row.size}</td>
                              <td className="py-2.5 px-3 text-white">{row.cm}</td>
                              <td className="py-2.5 px-3 text-zinc-400">{row.inch}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-xs sm:text-sm">
                    <p className="text-zinc-300 leading-relaxed">
                      {locale === 'ro'
                        ? 'Croială Oversized din amestec rezistent 80% bumbac, 20% poliester (240 GSM). Consultă tabelul de mărimi pentru piept și talie (inch / cm):'
                        : 'Oversized fit crafted from a durable 80% cotton, 20% polyester heavy blend (240 GSM). Check chest & waist measurements below (in / cm):'}
                    </p>
                    <div className="overflow-x-auto max-h-[58vh] overflow-y-auto rounded-xl border border-white/10">
                      <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-zinc-900/95 backdrop-blur-sm">
                          <tr className="bg-white/5 text-[11px] font-black uppercase text-zinc-400">
                            <th className="py-2.5 px-3">{locale === 'ro' ? 'Mărime' : 'Size'}</th>
                            <th className="py-2.5 px-3">{locale === 'ro' ? 'Piept (Chest)' : 'Chest'}</th>
                            <th className="py-2.5 px-3">{locale === 'ro' ? 'Talie (Waist)' : 'Waist'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10 text-xs font-bold">
                          {[
                            { size: 'S', label: 'Small', chest: '35–37"', chestCm: '89–94 cm', waist: '29–31"', waistCm: '74–79 cm' },
                            { size: 'M', label: 'Medium', chest: '38–40"', chestCm: '96.5–101.5 cm', waist: '32–34"', waistCm: '81–86.5 cm' },
                            { size: 'L', label: 'Large', chest: '42–44"', chestCm: '106.5–112 cm', waist: '36–38"', waistCm: '91.5–96.5 cm' },
                            { size: 'XL', label: 'X-Large', chest: '46–48"', chestCm: '117–122 cm', waist: '40–42"', waistCm: '101.5–106.5 cm' },
                            { size: '2XL', label: '2X-Large / XXL', chest: '50–52"', chestCm: '127–132 cm', waist: '44–46"', waistCm: '112–117 cm' },
                            { size: '3XL', label: '3X-Large', chest: '54–56"', chestCm: '137–142 cm', waist: '48–50"', waistCm: '122–127 cm' },
                            { size: '4XL', label: '4X-Large', chest: '58–60"', chestCm: '147.5–152.5 cm', waist: '52–54"', waistCm: '132–137 cm' },
                            { size: '5XL', label: '5X-Large', chest: '62–64"', chestCm: '157.5–162.5 cm', waist: '56–58"', waistCm: '142–147.5 cm' },
                            { size: '6XL', label: '6X-Large', chest: '66–68"', chestCm: '167.5–172.5 cm', waist: '60–62"', waistCm: '152.5–157.5 cm' },
                          ].map((row) => (
                            <tr key={row.size}>
                              <td className="py-2 px-3">
                                <span className="text-[#e32f8c] font-black">{row.size}</span>
                                <span className="block text-[10px] font-medium text-zinc-500">{row.label}</span>
                              </td>
                              <td className="py-2 px-3 text-white">
                                {row.chest}
                                <span className="block text-[10px] font-medium text-zinc-400">{row.chestCm}</span>
                              </td>
                              <td className="py-2 px-3 text-zinc-200">
                                {row.waist}
                                <span className="block text-[10px] font-medium text-zinc-400">{row.waistCm}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Sticky Mobile Add-to-Cart Bar (Portaled to document.body to prevent stacking context clipping) */}
      {mounted && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showStickyBar && !isCartOpen && !isFooterVisible && (
            <motion.aside
              aria-label={locale === 'ro' ? "Bara rapidă de comandă" : "Quick order bar"}
              initial={{ y: 120, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 120, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="lg:hidden fixed bottom-0 left-0 right-0 z-[60] bg-zinc-950/95 backdrop-blur-md border-t border-white/10 px-4 py-3 shadow-[0_-12px_35px_rgba(0,0,0,0.85)] pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]"
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
                    "h-11 px-4 sm:px-5 rounded-xl font-black uppercase text-xs tracking-wider flex items-center justify-center gap-1.5 shrink-0 transition-all active:scale-[0.98] shadow-md cursor-pointer",
                    isCurrentVariantSoldOut
                      ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5"
                      : justAdded
                        ? "bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.45)]"
                        : isSelectionIncomplete
                          ? "bg-zinc-900 text-white border border-[#e32f8c]/60 hover:bg-zinc-850"
                          : "bg-[#e32f8c] hover:bg-[#ff3b9e] text-white shadow-[0_0_20px_rgba(227,47,140,0.45)]"
                  )}
                >
                  {justAdded ? (
                    <span className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 stroke-[2.75]" />
                      <span>{locale === 'ro' ? "Adăugat!" : "Added!"}</span>
                    </span>
                  ) : isAdding ? (
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
                      {isCurrentVariantPreorder ? (
                        <Clock className="w-3.5 h-3.5" />
                      ) : (
                        <ShoppingCart className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {isCurrentVariantPreorder
                          ? (locale === 'ro' ? "Precomandă" : "Pre-Order")
                          : (locale === 'ro' ? "Adaugă în Coș" : "Add to Cart")}
                      </span>
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
