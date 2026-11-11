"use client";

import { Product, getReviewsStats } from "@/lib/api";
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { ChevronDown, Plus, Minus, Check, Leaf, HeartPulse, WheatOff, ShoppingCart, ThumbsUp, BadgeCheck, CandyOff, Zap, LayoutGrid, ArrowRight, ShieldCheck, Truck, Dumbbell, AlertCircle } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";
import { useCartStore } from "@/store/useCartStore";
import { getProductPrice } from "@/utils/pricing";
import { useRegionStore } from "@/store/useRegionStore";
import { cn } from "@/lib/utils";
import { StarRating } from "@/components/ui/StarRating";
import { ProductExpressCheckout } from "@/components/checkout/ProductExpressCheckout";

interface ProductMainContainerProps {
  product: Product;
  initialStats?: { count: number; average: number };
}

const colorMap: Record<string, string> = {
  "PEPENE ROȘU": "bg-rose-500",
  "WATERMELON": "bg-rose-500",
  "LEMON & LIME": "bg-[#a6ce39]",
  "FRUCTE DE PĂDURE": "bg-purple-600",
  "FOREST FRUITS": "bg-purple-600",
  "CĂPȘUNI DULCI": "bg-red-600",
  "SWEET STRAWBERRY": "bg-red-600",
  "EXPLOZIE DE AFINE": "bg-blue-600",
  "BLUEBERRY BLAST": "bg-blue-600",
  "LĂMÂIE": "bg-yellow-400",
  "LEMON": "bg-yellow-400",
  "PORTOCALĂ": "bg-orange-500",
  "ORANGE": "bg-orange-500",
  "MENTĂ": "bg-emerald-500",
  "MINT": "bg-emerald-500",
  "DEFAULT": "bg-zinc-800",
};

const quantities = [
  { id: 1, label: { ro: '1 Cutie', en: '1 Box' }, saveAmount: 0 },
  { id: 2, label: { ro: '2 Cutii', en: '2 Boxes' }, saveAmount: 15 },
  { id: 3, label: { ro: '3 Cutii', en: '3 Boxes' }, saveAmount: 30 },
  { id: 4, label: { ro: '4 Cutii', en: '4 Boxes' }, saveAmount: 45 },
];



export function ProductMainContainer({ product, initialStats }: ProductMainContainerProps) {
  const t = useTranslations("Product");
  const locale = useLocale();
  const { addItem, isCartOpen } = useCartStore();
  const { currency } = useRegionStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const name = typeof product.name === 'object' ? product.name[locale] || product.name['ro'] : product.name;

  const [activeImage, setActiveImage] = useState(product.images[0]);
  const [reviewStats, setReviewStats] = useState(
    initialStats && initialStats.count > 0 ? initialStats : { count: 48, average: 5.0 }
  );
  const [deviceOS, setDeviceOS] = useState<'ios' | 'android' | 'desktop' | 'both'>('both');

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setDeviceOS('ios');
    } else if (/android/.test(ua)) {
      setDeviceOS('android');
    } else {
      setDeviceOS('desktop');
    }
  }, []);

  const isJeleuri = product.slug.includes("jeleuri");
  const isBundle = product.slug === "pachet-maieu-jeleuri";
  const usedQuantities = quantities;

  const [activeQty, setActiveQty] = useState(usedQuantities[0]);
  const [standardQuantity, setStandardQuantity] = useState(1);

  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [selectedFlavors, setSelectedFlavors] = useState<(string | null)[]>(Array(4).fill(null));

  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);

  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [isSizeDropdownOpen, setIsSizeDropdownOpen] = useState(false);

  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [hasExpressWallets, setHasExpressWallets] = useState<boolean | null>(null);
  const [aromaError, setAromaError] = useState(false);
  const aromaTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mainCtaRef = useRef<HTMLButtonElement | null>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [isFooterVisible, setIsFooterVisible] = useState(false);

  // Pre-select first available variant for immediate 1-click purchase on mobile
  useEffect(() => {
    if (!isJeleuri && product.variants?.options?.length && !selectedVariant) {
      const firstAvailable = product.variants.options.find(o => o.stock_status !== 'sold_out') || product.variants.options[0];
      if (firstAvailable) {
        const optName = typeof firstAvailable.name === 'object' ? firstAvailable.name[locale as 'ro' | 'en'] || firstAvailable.name['ro'] : firstAvailable.name;
        setSelectedVariant(optName as string);
        if (firstAvailable.image) {
          setActiveImage(firstAvailable.image);
        }
      }
    }
  }, [product, isJeleuri, locale, selectedVariant]);

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

  const handleVariantSelect = (variantName: string, variantImage: string | undefined, imageIndex: number | undefined, tubIndex: number) => {
    setAromaError(false);
    if (aromaTimeoutRef.current) clearTimeout(aromaTimeoutRef.current);

    if (isJeleuri) {
      const newFlavors = [...selectedFlavors];
      newFlavors[tubIndex] = variantName;
      setSelectedFlavors(newFlavors);
      setOpenDropdownIndex(null);
    } else {
      setSelectedVariant(variantName);
      setOpenDropdownIndex(null);
    }

    if (variantImage) {
      setActiveImage(variantImage);
    } else if (imageIndex !== undefined && product.images[imageIndex]) {
      setActiveImage(product.images[imageIndex]);
    }
  };

  const isSelectionIncomplete = isBundle
    ? (!selectedVariant || !selectedSize)
    : (isJeleuri ? selectedFlavors.slice(0, activeQty.id).some(f => !f) : (product.variants ? !selectedVariant : false));

  const currentVariantStatus = isJeleuri && activeQty.id === 1 && selectedFlavors[0]
    ? product.variants?.options.find(o => {
      const optName = typeof o.name === 'object' ? o.name[locale] || o.name['ro'] : o.name;
      return optName === selectedFlavors[0];
    })?.stock_status
    : (!isJeleuri && selectedVariant ? product.variants?.options.find(o => {
      const optName = typeof o.name === 'object' ? o.name[locale] || o.name['ro'] : o.name;
      return optName === selectedVariant;
    })?.stock_status : undefined);

  const isCurrentVariantSoldOut = currentVariantStatus === 'sold_out';
  const numericPrice = getProductPrice(product.price, currency) || 0;
  const numericOriginalPrice = getProductPrice(product.originalPrice, currency) || numericPrice;

  const stickyPrice = isJeleuri
    ? (numericPrice * activeQty.id) - (getProductPrice(activeQty.saveAmount, currency) || 0)
    : numericPrice * standardQuantity;

  const stickyOriginalPrice = isJeleuri
    ? numericOriginalPrice * activeQty.id
    : numericOriginalPrice * standardQuantity;

  const stickyVariantLabel = isJeleuri
    ? (activeQty.id > 1 ? `${activeQty.id} Cutii` : (selectedFlavors[0] || (locale === 'ro' ? 'Alege aromă' : 'Choose flavor')))
    : isBundle
      ? (selectedSize && selectedVariant ? `${selectedSize} / ${selectedVariant}` : (locale === 'ro' ? 'Alege opțiuni' : 'Choose options'))
      : (selectedVariant || (locale === 'ro' ? 'Alege varianta' : 'Choose variant'));

  const selectedVariantOption = product.bundleVariants?.flavor.options.find(
    o => {
      const oName = typeof o.name === 'object' ? o.name[locale as 'ro' | 'en'] || o.name['ro'] : o.name;
      return oName === selectedVariant;
    }
  );

  const selectedVariantColor = selectedVariantOption?.color
    ? undefined
    : (selectedVariant ? (colorMap[selectedVariant.toUpperCase()] || colorMap["DEFAULT"]) : colorMap["DEFAULT"]);

  const handleAddToCart = () => {
    if (isAdding || isCurrentVariantSoldOut) return;

    if (isSelectionIncomplete) {
      triggerAromaAttention();
      return;
    }

    setIsAdding(true);

    if (isJeleuri) {
      if (activeQty.id === 1) {
        // Single box — add normally
        const flavName = selectedFlavors[0] || "Unknown";
        const opt = product.variants?.options.find(o => {
          const optName = typeof o.name === 'object' ? o.name[locale] || o.name['ro'] : o.name;
          return optName === flavName;
        });
        addItem(product, { name: flavName, image: opt?.image, imageIndex: opt?.imageIndex || 0 });
      } else {
        // Multi-box bundle — add as ONE item with discounted price in base RON
        const baseRon = Number(product.price) || 129.9;
        const qtyDiscountRon = Number(activeQty.saveAmount) || 0;
        const bundlePriceRon = (baseRon * activeQty.id) - qtyDiscountRon;
        const flavorsLabel = selectedFlavors.slice(0, activeQty.id).join(', ');
        const bundleName = locale === 'ro'
          ? `Pachet ${activeQty.id} Cutii`
          : `Bundle ${activeQty.id} Boxes`;

        const singleTubWeight = Number(product.weight) || 0.2;
        const bundleProduct = {
          ...product,
          id: `${product.id}-bundle-${activeQty.id}`,
          name: typeof product.name === 'object'
            ? { ro: `Pachet ${activeQty.id} Cutii – ${(product.name as any).ro}`, en: `Bundle ${activeQty.id} Boxes – ${(product.name as any).en || (product.name as any).ro}` }
            : `Pachet ${activeQty.id} Cutii – ${product.name}`,
          price: bundlePriceRon,
          weight: singleTubWeight * activeQty.id,
          originalPrice: baseRon * activeQty.id,
          image: '/images/products/x10_elbow_wraps_purple_1.webp',
        };

        addItem(bundleProduct as any, {
          name: flavorsLabel,
          image: '/images/products/x10_elbow_wraps_purple_1.webp',
          imageIndex: 0
        });
      }
    } else {
      let finalVariantName = selectedVariant;
      let finalImageIndex = product.images.indexOf(activeImage);

      const currentOpt = product.variants?.options.find(o => {
        const optName = typeof o.name === 'object' ? o.name[locale] || o.name['ro'] : o.name;
        return optName === selectedVariant;
      });

      if (isBundle) {
        finalVariantName = `${locale === 'ro' ? 'Mărime' : 'Size'}: ${selectedSize} | ${locale === 'ro' ? 'Culoare' : 'Color'}: ${selectedVariant}`;
      }

      for (let i = 0; i < standardQuantity; i++) {
        addItem(product, finalVariantName ? {
          name: finalVariantName,
          image: currentOpt?.image,
          imageIndex: finalImageIndex !== -1 ? finalImageIndex : (currentOpt?.imageIndex || 0)
        } : undefined);
      }
    }

    setTimeout(() => setIsAdding(false), 1000);
  };

  const handleExpressCheckout = () => {
    if (isAdding || isCurrentVariantSoldOut) return;

    if (isSelectionIncomplete) {
      triggerAromaAttention();
      return;
    }

    let finalVariantName = selectedVariant;
    let finalImageIndex = product.images?.indexOf(activeImage) ?? 0;

    let wasAdded = false;

    if (isJeleuri) {
      if (activeQty.id === 1) {
        const flavName = selectedFlavors[0] || "";
        const opt = product.variants?.options.find(o => {
          const optName = typeof o.name === 'object' ? o.name[locale] || o.name['ro'] : o.name;
          return optName === flavName;
        });
        wasAdded = Boolean(addItem(product, { name: flavName, image: opt?.image, imageIndex: opt?.imageIndex || 0 }));
      } else {
        const baseRon = Number(product.price) || 129.9;
        const qtyDiscountRon = Number(activeQty.saveAmount) || 0;
        const bundlePriceRon = (baseRon * activeQty.id) - qtyDiscountRon;
        const flavorsLabel = selectedFlavors.slice(0, activeQty.id).join(', ');
        const singleTubWeight = Number(product.weight) || 0.2;
        const bundleProduct = {
          ...product,
          id: `${product.id}-bundle-${activeQty.id}`,
          name: typeof product.name === 'object'
            ? { ro: `Pachet ${activeQty.id} Cutii – ${(product.name as any).ro}`, en: `Bundle ${activeQty.id} Boxes – ${(product.name as any).en || (product.name as any).ro}` }
            : `Pachet ${activeQty.id} Cutii – ${product.name}`,
          price: bundlePriceRon,
          weight: singleTubWeight * activeQty.id,
          originalPrice: baseRon * activeQty.id,
          image: '/images/products/x10_elbow_wraps_purple_1.webp',
        };
        wasAdded = Boolean(addItem(bundleProduct as any, { name: flavorsLabel, image: '/images/products/x10_elbow_wraps_purple_1.webp', imageIndex: 0 }));
      }
    } else {
      const currentOpt = product.variants?.options.find(o => {
        const optName = typeof o.name === 'object' ? o.name[locale] || o.name['ro'] : o.name;
        return optName === selectedVariant;
      });

      if (isBundle) {
        finalVariantName = `${locale === 'ro' ? 'Mărime' : 'Size'}: ${selectedSize} | ${locale === 'ro' ? 'Culoare' : 'Color'}: ${selectedVariant}`;
      }

      for (let i = 0; i < standardQuantity; i++) {
        const res = addItem(product, finalVariantName ? {
          name: finalVariantName,
          image: currentOpt?.image,
          imageIndex: finalImageIndex !== -1 ? finalImageIndex : (currentOpt?.imageIndex || 0)
        } : undefined);
        if (res) wasAdded = true;
      }
    }

    if (!wasAdded) return;
    window.location.href = `/${locale}/checkout`;
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
                    const isSelected = isJeleuri ? selectedFlavors.includes(optName) : selectedVariant === optName;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleVariantSelect(optName as string, opt.image, opt.imageIndex, 0)}
                        className={cn(
                          "relative w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden transition-all duration-300 bg-zinc-950/80 shadow-md border cursor-pointer",
                          isSelected ? "border-[#e32f8c] ring-2 ring-[#e32f8c]/40 scale-105 z-10 shadow-[0_0_20px_rgba(227,47,140,0.35)]" : "border-white/10 opacity-70 hover:opacity-100 hover:scale-102 hover:border-white/30",
                          opt.stock_status === 'sold_out' ? "opacity-30 grayscale cursor-not-allowed" : ""
                        )}
                        title={optName as string}
                      >
                        <Image src={opt.image || product.images[opt.imageIndex || 0] || product.image} alt={optName as string} fill priority className="object-cover" sizes="(max-width: 768px) 64px, 112px" />
                      </button>
                    );
                  })
              ) : (
                product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(img)}
                    className={cn(
                      "relative w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden transition-all duration-300 bg-zinc-950/80 shadow-md border cursor-pointer",
                      activeImage === img ? "border-[#e32f8c] ring-2 ring-[#e32f8c]/40 scale-105 z-10 shadow-[0_0_20px_rgba(227,47,140,0.35)]" : "border-white/10 opacity-70 hover:opacity-100 hover:scale-102 hover:border-white/30"
                    )}
                  >
                    <Image src={img} alt={`Thumbnail ${idx + 1}`} fill priority className="object-cover" sizes="(max-width: 768px) 64px, 112px" />
                  </button>
                ))
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

            {/* Bundle Dual Variants */}
            {isBundle && product.bundleVariants && (
              <div className="mb-6 flex flex-col md:flex-row gap-4">
                {/* Size Selection */}
                <div className="w-full md:w-1/2 relative">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[12px] font-black uppercase tracking-wider text-black">
                      {locale === 'ro' ? "MĂRIME MAIEU" : "TANK TOP SIZE"}
                    </h3>
                  </div>

                  <button
                    onClick={() => {
                      setIsSizeDropdownOpen(!isSizeDropdownOpen);
                      setOpenDropdownIndex(null);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between p-3 bg-white border transition-all rounded-sm",
                      isSizeDropdownOpen ? "border-black" : "border-black/20 hover:border-black/50"
                    )}
                  >
                    <span className="text-sm font-black uppercase tracking-wider text-black">
                      {selectedSize || (locale === 'ro' ? 'Alege mărimea...' : 'Select size...')}
                    </span>
                    {isSizeDropdownOpen ? <Check className="w-4 h-4 text-black" /> : <ChevronDown className="w-4 h-4 text-black" />}
                  </button>

                  <AnimatePresence>
                    {isSizeDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 w-full mt-1 bg-white border border-black z-50 max-h-64 overflow-y-auto rounded-sm shadow-xl"
                      >
                        {product.bundleVariants.size.options.map((opt) => {
                          const isSelected = selectedSize === opt;
                          return (
                            <button
                              key={opt}
                              onClick={() => {
                                setSelectedSize(opt);
                                setIsSizeDropdownOpen(false);
                              }}
                              className="w-full flex items-center justify-between p-3 hover:bg-[#f4f4f4] transition-colors border-b border-black/10 last:border-none"
                            >
                              <span className={cn("text-sm uppercase tracking-wider", isSelected ? "font-black text-black" : "font-bold text-black/60")}>
                                {opt}
                              </span>
                              {isSelected && <Check className="w-4 h-4 text-black" />}
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Flavor Selection */}
                <div className="w-full md:w-1/2 relative">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[12px] font-black uppercase tracking-wider text-black">
                      {locale === 'ro' ? "CULOARE" : "COLOR"}
                    </h3>
                  </div>

                  <button
                    onClick={() => {
                      setOpenDropdownIndex(openDropdownIndex === 999 ? null : 999);
                      setIsSizeDropdownOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between p-3 bg-white border transition-all rounded-sm",
                      openDropdownIndex === 999 ? "border-black" : "border-black/20 hover:border-black/50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn("w-4 h-4 rounded-full shadow-inner border border-black/10", selectedVariantColor)}
                        style={selectedVariantOption?.color ? { backgroundColor: selectedVariantOption.color } : {}}
                      />
                      <span className="text-sm font-black uppercase tracking-wider text-black truncate max-w-[120px]">
                        {selectedVariant || (locale === 'ro' ? 'Alege...' : 'Select...')}
                      </span>
                    </div>
                    {openDropdownIndex === 999 ? <Check className="w-4 h-4 text-black" /> : <ChevronDown className="w-4 h-4 text-black" />}
                  </button>

                  <AnimatePresence>
                    {openDropdownIndex === 999 && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 w-full mt-1 bg-white border border-black z-50 max-h-64 overflow-y-auto rounded-sm shadow-xl"
                      >
                        {[...product.bundleVariants.flavor.options]
                          .sort((a, b) => (a.stock_status === "sold_out" ? 1 : 0) - (b.stock_status === "sold_out" ? 1 : 0))
                          .map((opt) => {
                            const localizedName = typeof opt.name === 'object' ? opt.name[locale] || opt.name['ro'] : opt.name;
                            const optColorClass = opt.color ? undefined : (colorMap[localizedName?.toUpperCase()] || colorMap[localizedName] || colorMap["DEFAULT"]);
                            const isSelected = selectedVariant === localizedName;
                            const isSoldOut = opt.stock_status === "sold_out";
                            const isPreorder = opt.stock_status === "preorder";

                            return (
                              <button
                                key={localizedName}
                                type="button"
                                disabled={isSoldOut}
                                onClick={() => {
                                  if (!isSoldOut) {
                                    setSelectedVariant(localizedName);
                                    setOpenDropdownIndex(null);
                                  }
                                }}
                                className={cn(
                                  "w-full flex items-center justify-between p-3 hover:bg-[#f4f4f4] transition-colors border-b border-black/10 last:border-none",
                                  isSoldOut ? "opacity-50 cursor-not-allowed bg-gray-50 hover:bg-gray-50" : ""
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className={cn("w-4 h-4 shrink-0 rounded-full shadow-inner border border-black/10", optColorClass)}
                                    style={opt.color ? { backgroundColor: opt.color } : {}}
                                  />
                                  <div className="flex flex-col items-start text-left">
                                    <span className={cn("text-xs uppercase tracking-wider text-left", isSelected ? "font-black text-black" : "font-bold text-black/60")}>
                                      {localizedName}
                                    </span>
                                    {(opt.badge || isSoldOut || isPreorder) && (
                                      <span className={cn(
                                        "text-[10px] font-black uppercase tracking-widest mt-0.5",
                                        isSoldOut ? "text-red-500" : (isPreorder ? "text-green-500" : "text-[#e32f8c]")
                                      )}>
                                        {isSoldOut ? "SOLD OUT" : (isPreorder ? "PRECOMANDĂ" : opt.badge)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {isSelected && <Check className="w-4 h-4 text-black shrink-0" />}
                              </button>
                            );
                          })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Purchase Options (Quantity & Savings) */}
            {isJeleuri && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[12px] font-black uppercase tracking-wider text-black">
                    {locale === 'ro' ? "CANTITATE" : "QUANTITY"}
                  </h3>
                </div>
                <div className="space-y-2">
                  {usedQuantities.map((qty) => {
                    const isActive = activeQty.id === qty.id;
                    const label = qty.label[locale as 'en' | 'ro'] || qty.label['ro'];
                    const qtyTotalDiscount = getProductPrice(qty.saveAmount, currency) || 0;
                    const totalPrice = (numericPrice * qty.id) - qtyTotalDiscount;
                    const totalOldPrice = numericOriginalPrice * qty.id;
                    const boxPrice = totalPrice / qty.id;
                    const hasSavings = qty.saveAmount > 0;

                    return (
                      <button
                        key={qty.id}
                        onClick={() => setActiveQty(qty)}
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                        className={cn(
                          "w-full flex items-center justify-between px-4 py-3 border-2 text-left rounded-xl bg-white relative overflow-hidden z-0",
                          "transition-colors duration-150 active:scale-[0.99]",
                          isActive
                            ? "border-[#e32f8c]"
                            : "border-black/15 hover:border-black/40"
                        )}
                      >
                        {isActive && <div className="absolute inset-0 bg-[#e32f8c]/5 -z-10 pointer-events-none" />}
                        {/* Left: Radio + Label + Savings badge */}
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Radio dot */}
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors duration-150",
                            isActive ? "border-[#e32f8c]" : "border-black/25"
                          )}>
                            {isActive && (
                              <div className="w-2.5 h-2.5 bg-[#e32f8c] rounded-full" />
                            )}
                          </div>

                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className={cn(
                              "text-sm uppercase tracking-tight leading-none",
                              isActive ? "font-black text-black" : "font-bold text-black/70"
                            )}>
                              {label}
                            </span>

                            {/* Savings badge — prominent blue, only when > 0 */}
                            {hasSavings && (
                              <span className={cn(
                                "inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wide leading-none mt-1",
                                "text-[#e32f8c]"
                              )}>
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="shrink-0">
                                  <path d="M5 1L6.18 3.59L9 4.04L7 5.97L7.45 8.78L5 7.38L2.55 8.78L3 5.97L1 4.04L3.82 3.59L5 1Z" fill="#e32f8c" />
                                </svg>
                                {locale === 'ro'
                                  ? `Salvezi ${qtyTotalDiscount.toFixed(0)} ${currency}`
                                  : `Save ${qtyTotalDiscount.toFixed(0)} ${currency}`}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right: Prices */}
                        <div className="flex flex-col items-end shrink-0 ml-2">
                          <div className="flex items-center gap-1.5">
                            {hasSavings && totalOldPrice > totalPrice && (
                              <span className="text-xs font-bold text-black/35 line-through">
                                {totalOldPrice.toFixed(2)} {currency}
                              </span>
                            )}
                            <span className={cn(
                              "text-sm tracking-tight",
                              isActive ? "font-black text-black" : "font-bold text-black"
                            )}>
                              {totalPrice.toFixed(2)} {currency}
                            </span>
                          </div>
                          {qty.id > 1 && (
                            <span className="text-[10px] font-semibold text-black/40 mt-0.5">
                              {boxPrice.toFixed(2)} {currency}/{locale === 'ro' ? 'cutie' : 'box'}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}



            {/* Variant Section */}
            {product.variants && !isBundle && (
              <div className="mb-6" id="flavor-selector-container">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[12px] font-black uppercase tracking-wider text-zinc-300">
                    {locale === 'ro' ? "ALEGE VARIANTA" : "SELECT VARIANT"} ({product.variants.options.length})
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
                  {Array.from({ length: isJeleuri ? activeQty.id : 1 }).map((_, index) => {
                    const currentSelectedVariant = isJeleuri ? selectedFlavors[index] : selectedVariant;

                    const selectedVarOpt = product.variants?.options.find(
                      o => {
                        const oName = typeof o.name === 'object' ? o.name[locale as 'ro' | 'en'] || o.name['ro'] : o.name;
                        return oName === currentSelectedVariant;
                      }
                    );

                    const isOpen = openDropdownIndex === index;

                    return (
                      <div key={index} className="relative">
                        <motion.button
                          type="button"
                          animate={aromaError && !currentSelectedVariant ? { x: [-6, 6, -4, 4, -2, 2, 0] } : { x: 0 }}
                          transition={{ duration: 0.4 }}
                          onClick={() => {
                            setOpenDropdownIndex(isOpen ? null : index);
                            setAromaError(false);
                          }}
                          className={cn(
                            "w-full flex items-center justify-between p-3.5 bg-zinc-900 border transition-all rounded-xl cursor-pointer",
                            aromaError && !currentSelectedVariant
                              ? "border-red-500 ring-2 ring-red-400/40 bg-red-950/20"
                              : (isOpen ? "border-[#e32f8c]" : "border-white/15 hover:border-white/35"),
                            !currentSelectedVariant && !isOpen && !aromaError && "border-white/20"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-5 h-5 rounded-full shadow-inner border border-white/20 shrink-0"
                              style={{ backgroundColor: selectedVarOpt?.color || (currentSelectedVariant ? '#a855f7' : '#27272a') }}
                            />
                            <span className={cn("text-sm font-black uppercase tracking-wider", currentSelectedVariant ? "text-white" : "text-zinc-400")}>
                              {currentSelectedVariant || (locale === 'ro' ? 'Alege varianta...' : 'Select variant...')}
                            </span>
                          </div>
                          {isOpen ? (
                            <Check className="w-4 h-4 text-white" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-white" />
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
                                  const isSelected = currentSelectedVariant === localizedName;
                                  const isSoldOut = opt.stock_status === 'sold_out';
                                  const isPreorder = opt.stock_status === 'preorder';
                                  const optColor = opt.color || '#a855f7';

                                  return (
                                    <button
                                      key={localizedName}
                                      type="button"
                                      disabled={isSoldOut}
                                      onClick={() => {
                                        if (!isSoldOut) {
                                          handleVariantSelect(localizedName, opt.image, opt.imageIndex, index);
                                        }
                                      }}
                                      className={cn(
                                        "w-full flex items-center justify-between p-3.5 hover:bg-zinc-800 transition-colors border-b border-white/5 last:border-none cursor-pointer",
                                        isSoldOut ? "opacity-40 cursor-not-allowed bg-zinc-950/50 hover:bg-zinc-950/50" : ""
                                      )}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div
                                          className="w-5 h-5 rounded-full shadow-inner shrink-0 border border-white/20"
                                          style={{ backgroundColor: optColor }}
                                        />
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
                  })}
                </div>
              </div>
            )}

            {/* Quantity Selector */}
            {!isBundle && !isJeleuri && (
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
            )}

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
                  if (isJeleuri) {
                    if (activeQty.id === 1) {
                      const flavName = selectedFlavors[0] || "Unknown";
                      items = [{ id: product.id, quantity: 1, price: numericPrice, weight: singleWeight, name: product.name, selectedVariant: { name: flavName } }];
                      basePrice = numericPrice;
                    } else {
                      const qtyTotalDiscount = getProductPrice(activeQty.saveAmount, 'RON') || 0; // The saveAmount is always in RON
                      const bundlePrice = (numericPrice * activeQty.id) - qtyTotalDiscount;
                      const flavorsLabel = selectedFlavors.slice(0, activeQty.id).join(', ');
                      
                      items = [{
                        id: `${product.id}-bundle-${activeQty.id}`,
                        quantity: 1,
                        price: bundlePrice,
                        weight: singleWeight * activeQty.id,
                        name: `Pachet ${activeQty.id} Cutii – ${typeof product.name === 'object' ? (product.name as any)['ro'] : product.name}`,
                        selectedVariant: { name: flavorsLabel }
                      }];
                      basePrice = bundlePrice;
                    }
                  } else {
                    const finalVariantName = isBundle 
                      ? `${locale === 'ro' ? 'Mărime' : 'Size'}: ${selectedSize} | ${locale === 'ro' ? 'Culoare' : 'Color'}: ${selectedVariant}`
                      : selectedVariant;

                    // Send as multiple separate items for non-bundles so cart calculations apply
                    for (let i = 0; i < standardQuantity; i++) {
                      items.push({
                        id: product.id,
                        quantity: 1,
                        price: numericPrice,
                        weight: singleWeight,
                        name: product.name,
                        selectedVariant: { name: finalVariantName }
                      });
                      basePrice += numericPrice;
                    }
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

            {/* ACCORDIONS AND TRUST SECTION FOR GUMMIES/BUNDLES ONLY */}
            {(isJeleuri || isBundle) && (
              <>
                {/* ACCORDIONS */}
                <div className="border-t border-black/10">
                  <AccordionItem
                    title={locale === 'ro' ? "MOD DE UTILIZARE" : "SUGGESTED USE"}
                    isOpen={openAccordion === 'usage'}
                    onToggle={() => setOpenAccordion(openAccordion === 'usage' ? null : 'usage')}
                  >
                    <div className="space-y-3 pt-2">
                      <div className="flex items-start gap-4 p-4 bg-[#f4f4f4] rounded-sm border border-black/5 relative overflow-hidden">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm z-10 border border-black/10">
                          <span className="font-black text-black text-sm">1</span>
                        </div>
                        <div className="z-10">
                          <h4 className="text-[11px] font-black uppercase tracking-widest text-[#e32f8c] mb-1">
                            {locale === 'ro' ? "DOZA ZILNICĂ" : "DAILY DOSE"}
                          </h4>
                          <p className="text-sm font-bold text-black/80 leading-snug">
                            {locale === 'ro'
                              ? "Consumă 3 jeleuri în fiecare zi pentru a asigura doza clinică de 5g creatină monohidrată pură."
                              : "Take 3 gummies every day to hit the full clinical dose of 5g pure creatine monohydrate."}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4 p-4 bg-[#f4f4f4] rounded-sm border border-black/5 relative overflow-hidden">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm z-10 border border-black/10">
                          <span className="font-black text-black text-sm">2</span>
                        </div>
                        <div className="z-10">
                          <h4 className="text-[11px] font-black uppercase tracking-widest text-[#e32f8c] mb-1">
                            {locale === 'ro' ? "MOMENTUL IDEAL" : "TIMING"}
                          </h4>
                          <p className="text-sm font-bold text-black/80 leading-snug">
                            {locale === 'ro'
                              ? "Bucură-te de ele oricând ai poftă de ceva dulce! Pentru rezultate optime, servește-le imediat după antrenament."
                              : "Enjoy them anytime you crave a treat! For peak efficiency, take them right after your workout."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </AccordionItem>

                  <AccordionItem
                    title={locale === 'ro' ? "BENEFICII" : "BENEFITS"}
                    isOpen={openAccordion === 'benefits'}
                    onToggle={() => setOpenAccordion(openAccordion === 'benefits' ? null : 'benefits')}
                  >
                    <ul className="space-y-3 pt-2">
                      {[
                        { ro: "Susțin creșterea performanței fizice și a forței musculare în timpul antrenamentelor.", en: "Supports physical performance and muscle strength during workouts." },
                        { ro: "Contribuie la o recuperare mai rapidă după efort intens.", en: "Contributes to faster recovery after intense effort." },
                        { ro: "Pot îmbunătăți concentrarea și susțin funcțiile cognitive în perioadele de solicitare.", en: "May improve focus and support cognitive functions during demanding periods." },
                        { ro: "Asigură o absorbție eficientă a creatinei datorită formei gumoase ușor de digerat.", en: "Ensures efficient creatine absorption due to the easily digestible gummy form." },
                        { ro: "Oferă o alternativă practică și plăcută la suplimentele tradiționale cu pulbere.", en: "Provides a practical and pleasant alternative to traditional powder supplements." }
                      ].map((benefit, idx) => (
                        <li key={idx} className="flex items-start gap-3 p-3 bg-[#f4f4f4] rounded-sm border border-black/5">
                          <div className="mt-0.5 w-5 h-5 rounded-full bg-white border border-black/10 flex items-center justify-center shrink-0 shadow-sm">
                            <Check className="w-3.5 h-3.5 text-[#e32f8c] stroke-[3]" />
                          </div>
                          <span className="text-sm font-bold text-black/80 leading-snug">
                            {locale === 'ro' ? benefit.ro : benefit.en}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </AccordionItem>

                  <AccordionItem
                    title={locale === 'ro' ? "VALORI NUTRIȚIONALE" : "SUPPLEMENT FACTS"}
                    isOpen={openAccordion === 'facts'}
                    onToggle={() => setOpenAccordion(openAccordion === 'facts' ? null : 'facts')}
                  >
                    <div className="w-full bg-white border-2 border-black p-4 font-sans text-black">
                      <h4 className="font-black text-2xl uppercase tracking-tighter border-b-[8px] border-black pb-1 mb-2">
                        {locale === 'ro' ? "INFORMAȚII NUTRIȚIONALE" : "Supplement Facts"}
                      </h4>
                      <div className="flex justify-between text-xs font-bold border-b border-black pb-1 mb-1">
                        <span>{locale === 'ro' ? "Porție: 3 Jeleuri" : "Serving Size: 3 Gummies"}</span>
                        <span>{locale === 'ro' ? "Porții per cutie: 30" : "Servings Per Container: 30"}</span>
                      </div>

                      <div className="flex justify-between text-sm font-black border-b-[4px] border-black py-1 my-2">
                        <span>{locale === 'ro' ? "Cantitate per porție" : "Amount Per Serving"}</span>
                        <span>{locale === 'ro' ? "% Valoare Zilnică" : "% Daily Value"}</span>
                      </div>

                      <div className="flex justify-between text-sm border-b border-black/20 py-1">
                        <span className="font-bold">{locale === 'ro' ? "Calorii" : "Calories"}</span>
                        <span className="font-bold">205 kJ / 49 kcal (2%*)</span>
                      </div>
                      <div className="flex justify-between text-sm border-b border-black/20 py-1">
                        <span className="font-bold">{locale === 'ro' ? "Total Carbohidrați" : "Total Carbohydrate"}</span>
                        <span className="font-bold">12.3g (4%*)</span>
                      </div>
                      <div className="flex justify-between text-sm border-b border-black/20 py-1 pl-4">
                        <span>{locale === 'ro' ? "Total Zahăr" : "Total Sugars"}</span>
                        <span>0g (**)</span>
                      </div>

                      <div className="flex justify-between text-sm border-b border-black/20 py-2 mt-1">
                        <span className="font-black">{locale === 'ro' ? "Creatină Monohidrată" : "Creatine Monohydrate"}</span>
                        <span className="font-black">5000 mg (**)</span>
                      </div>

                      <div className="flex justify-between text-sm border-b-[4px] border-black py-1.5">
                        <span className="font-bold text-black/90">{locale === 'ro' ? "Creatină per Jeleu" : "Creatine per Gummy"}</span>
                        <span className="font-bold">1.67g (**)</span>
                      </div>

                      <p className="text-[10px] text-black/60 mt-2 font-medium">
                        {locale === 'ro'
                          ? "* Procentul valorilor zilnice se bazează pe o dietă de 2000 de calorii."
                          : "* Percent Daily Values are based on a 2,000 calorie diet."}<br />
                        {locale === 'ro'
                          ? "** Valoarea zilnică nu a fost stabilită."
                          : "** Daily Value not established."}
                      </p>
                    </div>
                  </AccordionItem>
                  <AccordionItem
                    title={locale === 'ro' ? "NOTIFICARE & CONFORMITATE" : "CERTIFICATION & COMPLIANCE"}
                    isOpen={openAccordion === 'compliance'}
                    onToggle={() => setOpenAccordion(openAccordion === 'compliance' ? null : 'compliance')}
                  >
                    <div className="p-4 bg-[#f4f4f4] rounded-sm border border-black/5 mt-2 space-y-2">
                      <div className="flex items-center gap-2 text-black font-black text-xs uppercase tracking-wider">
                        <ShieldCheck className="w-4 h-4 text-[#e32f8c]" />
                        <span>{locale === 'ro' ? "Standarde Europene & Naționale" : "European & National Standards"}</span>
                      </div>
                      <p className="text-xs font-medium text-black/80 leading-relaxed">
                        {locale === 'ro'
                          ? "Produs notificat conform normelor europene și legislației din România privind suplimentele alimentare. Fabricat în facilități certificate conform standardelor internaționale GMP și HACCP, cu analize periodice de laborator pentru garantarea purității și siguranței maxime."
                          : "Dietary supplement notified and compliant with European standards and Romanian national legislation. Manufactured in certified GMP and HACCP facilities, with periodic lab testing to guarantee maximum purity and safety."}
                      </p>
                    </div>
                  </AccordionItem>
                </div>

                {/* Modern Trust Section */}
                <div className="border-t border-b border-black/10 py-8 mb-8 mt-4">
                  {/* Icons Row */}
                  <div className="grid grid-cols-4 gap-2 text-center mb-8">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-black flex items-center justify-center mb-2 bg-white">
                        <ThumbsUp className="w-5 h-5 md:w-6 md:h-6 text-black stroke-[2]" />
                      </div>
                      <span className="text-[9px] md:text-xs font-black text-black leading-tight">
                        {locale === 'ro' ? "Simplu de luat" : "Easy to take"}
                      </span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-black flex items-center justify-center mb-2 bg-white">
                        <BadgeCheck className="w-5 h-5 md:w-6 md:h-6 text-black stroke-[2]" />
                      </div>
                      <span className="text-[9px] md:text-xs font-black text-black leading-tight">
                        {locale === 'ro' ? "Testat. Curat." : "Tested. Clean."}
                      </span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-black flex items-center justify-center mb-2 bg-white">
                        <CandyOff className="w-5 h-5 md:w-6 md:h-6 text-black stroke-[2]" />
                      </div>
                      <span className="text-[9px] md:text-xs font-black text-black leading-tight">
                        {locale === 'ro' ? "Zero zahăr" : "Zero sugar"}
                      </span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-black flex items-center justify-center mb-2 bg-white">
                        <Leaf className="w-5 h-5 md:w-6 md:h-6 text-black stroke-[2]" />
                      </div>
                      <span className="text-[9px] md:text-xs font-black text-black leading-tight">
                        {locale === 'ro' ? "Vegan" : "Vegan"}
                      </span>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-2 text-center pt-6 border-t border-black/5">
                    <div className="flex flex-col items-center">
                      <span className="text-3xl md:text-4xl font-black text-[#e32f8c] tracking-tighter mb-1">95%</span>
                      <span className="text-[10px] md:text-[11px] font-black text-black leading-tight uppercase">
                        {locale === 'ro' ? "Clienți Mulțumiți" : "Happy Clients"}
                      </span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-3xl md:text-4xl font-black text-[#e32f8c] tracking-tighter mb-1">86%</span>
                      <span className="text-[10px] md:text-[11px] font-black text-black leading-tight uppercase">
                        {locale === 'ro' ? "Cumpără din nou" : "Buy Again"}
                      </span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-3xl md:text-4xl font-black text-[#e32f8c] tracking-tighter mb-1">100%</span>
                      <span className="text-[10px] md:text-[11px] font-black text-black leading-tight uppercase">
                        {locale === 'ro' ? "Testat Lab" : "Lab Tested"}
                      </span>
                    </div>
                  </div>

                  {/* Compliance Trust Banner */}
                  <div className="mt-6 p-3.5 bg-zinc-100/80 border border-zinc-200 rounded-xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#e32f8c]/15 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4 text-[#00a8c6]" />
                    </div>
                    <p className="text-[11px] font-semibold text-zinc-700 leading-snug">
                      {locale === 'ro' 
                        ? "Produs notificat conform normelor europene și legislației din România privind suplimentele alimentare."
                        : "Dietary supplement notified & compliant with European regulations and Romanian national legislation."}
                    </p>
                  </div>
                </div>
              </>
            )}

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
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-black/60 border border-white/10 shrink-0">
                    <Image
                      src={activeImage || product.image || product.images[0]}
                      alt={typeof name === 'string' ? name : 'TrenZone'}
                      fill
                      sizes="48px"
                      className="object-cover"
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
                        <span className="text-[9px] font-bold text-zinc-300 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded uppercase truncate max-w-[90px]">
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

function AccordionItem({ title, isOpen, onToggle, children }: { title: string, isOpen: boolean, onToggle: () => void, children: React.ReactNode }) {
  return (
    <div className="border-b border-black/10">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-6 text-left group"
      >
        <span className="text-sm font-black uppercase tracking-wider text-black group-hover:text-[#e32f8c] transition-colors">{title}</span>
        {isOpen ? <Minus className="w-5 h-5 text-black" /> : <Plus className="w-5 h-5 text-black" />}
      </button>
      <div
        className="grid transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          gridTemplateRows: isOpen ? '1fr' : '0fr',
          opacity: isOpen ? 1 : 0
        }}
      >
        <div className="overflow-hidden">
          <div className="pb-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
