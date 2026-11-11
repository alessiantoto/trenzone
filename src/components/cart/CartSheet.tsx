"use client";

import { ShoppingCart, Minus, Plus, X, Lock, Trash2, ChevronLeft, ChevronRight, ShieldCheck, Sparkles, Clock, Check } from "lucide-react";
import Image from "next/image";
import { useCartStore, isPreorder } from "@/store/useCartStore";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRegionStore } from "@/store/useRegionStore";
import { formatPrice } from "@/utils/currency";
import { getProductPrice } from "@/utils/pricing";
import { Link, useRouter } from "@/i18n/routing";
import { cn, getLocalized, getVariantColorClass } from "@/lib/utils";
import { Product } from "@/lib/api";

const TRENZONE_PINK = "#e32f8c";

export function CartSheet() {
  const { 
    items, 
    isCartOpen, 
    setCartOpen, 
    addItem, 
    removeItem, 
    updateQuantity, 
    getTotals, 
    appliedCoupon, 
    setCoupon,
    preorderConflict,
    closePreorderConflict,
    resolvePreorderConflictWithReplace
  } = useCartStore();
  const { currency } = useRegionStore();
  const { subtotal, discount, couponDiscount, total, hasBundle } = getTotals(currency);
  
  const [selectingProduct, setSelectingProduct] = useState<any | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  
  const t = useTranslations("Cart");
  const locale = useLocale();
  const isEn = locale === 'en';
  const router = useRouter();

  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const checkScroll = () => {
    const el = carouselRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = scrollWidth - clientWidth;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(maxScroll > 4 && scrollLeft < maxScroll - 4);
    setScrollProgress(maxScroll > 0 ? (scrollLeft / maxScroll) * 100 : 0);
  };

  const scrollLeft = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: -160, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 160, behavior: 'smooth' });
    }
  };
  
  useEffect(() => {
    if (!isCartOpen || allProducts.length > 0) return;
    let mounted = true;
    setIsLoadingProducts(true);
    
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        if (mounted && data.success) setAllProducts(data.products);
      })
      .catch(err => console.error("Failed to fetch products:", err))
      .finally(() => { if (mounted) setIsLoadingProducts(false); });

    return () => {
      mounted = false;
    };
  }, [isCartOpen, allProducts.length]);

  const totalItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // 🎯 Calculate unique different products in cart (ignoring variant/bundle suffixes)
  const uniqueProductIds = new Set(
    items.map(item => String(item.id || '').replace(/^(.+)-bundle-\d+$/, '$1'))
  );
  const uniqueCount = uniqueProductIds.size;
  const BUNDLE_THRESHOLD = 2;
  const isBundleUnlocked = uniqueCount >= BUNDLE_THRESHOLD;
  const remainingForBundle = Math.max(0, BUNDLE_THRESHOLD - uniqueCount);
  const bundleProgressPercent = Math.min(100, Math.round((uniqueCount / BUNDLE_THRESHOLD) * 100));

  // Preorder & mixed cart fulfillment detection
  const hasPreorderInCart = items.some(item => isPreorder(item, item.selectedVariant));
  const hasInStockInCart = items.some(item => !isPreorder(item, item.selectedVariant));
  const hasMixedOrder = hasPreorderInCart && hasInStockInCart;

  // Filter recommendations: products NOT yet in cart
  const inCartIds = new Set(items.map(item => item.id));
  const availableUpsells = allProducts
    .filter(product => !inCartIds.has(product.id))
    .sort((a, b) => getProductPrice(a.price, currency) - getProductPrice(b.price, currency))
    .slice(0, 8);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    
    const t = setTimeout(checkScroll, 120);
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);

    return () => {
      clearTimeout(t);
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [availableUpsells.length, isCartOpen]);


  return (
    <Sheet open={isCartOpen} onOpenChange={setCartOpen}>
      <SheetContent className="h-[100dvh] w-full max-w-[100vw] sm:max-w-[440px] bg-white text-black p-0 flex flex-col border-none shadow-2xl overflow-hidden overscroll-behavior-x-none font-sans">
        
        {/* ═══ CART HEADER (TrenZone Design) ═══ */}
        <div className="flex-shrink-0 bg-white z-30 px-6 sm:px-7 pt-6 pb-3">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-black leading-none flex items-center gap-1.5">
                {isEn ? (
                  <>YOUR <span className="text-[#e32f8c]">CART</span></>
                ) : (
                  <>COȘUL <span className="text-[#e32f8c]">TĂU</span></>
                )}
              </h2>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="w-2 h-2 rounded-full bg-[#e32f8c] animate-pulse" />
                <span className="text-[11px] font-black uppercase tracking-wider text-zinc-500">
                  {totalItemsCount === 1 
                    ? (isEn ? '1 ITEM IN CART' : '1 PRODUS ÎN COȘ') 
                    : (isEn ? `${totalItemsCount} ITEMS IN CART` : `${totalItemsCount} PRODUSE ÎN COȘ`)}
                </span>
              </div>
            </div>

            <button 
              onClick={() => setCartOpen(false)}
              className="text-zinc-400 hover:text-black transition-colors p-1.5 -mr-1.5 bg-zinc-100/80 hover:bg-zinc-200 rounded-full cursor-pointer"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" strokeWidth={2.5} />
            </button>
          </div>

          {/* ═══ TRENZONE BUNDLE PROGRESS CARD (Scalable for 10+ Products) ═══ */}
          <div className="bg-gradient-to-b from-zinc-950 to-black border border-white/10 rounded-2xl p-4 text-white shadow-xl relative overflow-hidden">
            {/* Ambient TrenZone Neon Magenta Blur */}
            <div className="absolute -right-6 -top-6 w-36 h-36 bg-[#e32f8c]/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -left-6 -bottom-6 w-32 h-32 bg-[#e32f8c]/10 rounded-full blur-2xl pointer-events-none" />

            {isBundleUnlocked ? (
              /* Achieved State: Minimalist, clean, premium */
              <div className="flex items-center justify-between relative z-10 py-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-[#e32f8c] text-white flex items-center justify-center shrink-0 shadow-sm shadow-[#e32f8c]/40">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#e32f8c] block leading-none mb-1 whitespace-nowrap">
                      TRENZONE BUNDLE
                    </span>
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight text-white whitespace-nowrap">
                      {isEn ? 'BUNDLE DISCOUNT' : 'REDUCERE ACTIVATĂ'}
                    </h3>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-[#e32f8c]/20 border border-[#e32f8c]/40 text-[#e32f8c] text-xs font-black uppercase tracking-wider shrink-0 whitespace-nowrap">
                  -10%
                </span>
              </div>
            ) : (
              /* In-Progress State: Shows progress bar and milestone steps only when needed */
              <>
                {/* Top Row: Title & Counter */}
                <div className="flex justify-between items-center mb-2 relative z-10">
                  <span className="text-[11px] font-black uppercase tracking-[0.22em] text-[#e32f8c]">
                    TRENZONE BUNDLE
                  </span>
                  <div className="px-2.5 py-0.5 rounded-md text-[11px] font-black tracking-wider bg-white/10 text-white border border-white/10">
                    {`${uniqueCount}/${BUNDLE_THRESHOLD}`}
                  </div>
                </div>

                {/* Main Actionable Heading */}
                <div className="mb-3.5 relative z-10">
                  <h3 className="text-xs sm:text-[13px] font-extrabold uppercase tracking-[0.05em] text-white leading-relaxed">
                    {uniqueCount === 0 && (
                      isEn ? 'ADD ANY 2 PRODUCTS FOR 10% OFF' : 'ADAUGĂ 2 PRODUSE PENTRU 10% REDUCERE'
                    )}
                    {uniqueCount === 1 && (
                      isEn ? 'ADD 1 MORE PRODUCT FOR 10% OFF' : 'MAI ADAUGĂ 1 PRODUS PENTRU 10% REDUCERE'
                    )}
                  </h3>
                </div>

                {/* Continuous Smooth Progress Track */}
                <div className="w-full bg-zinc-800/90 h-1.5 rounded-full overflow-hidden p-[1px] relative z-10">
                  <div 
                    className="h-full bg-gradient-to-r from-[#e32f8c] to-[#ff47a3] rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(227,47,140,0.8)]"
                    style={{
                      width: `${bundleProgressPercent}%`
                    }}
                  />
                </div>

                {/* Symmetrical Milestone Markers Row */}
                <div className="flex justify-between items-center mt-2 relative z-10 text-[10px] sm:text-[11px] font-black uppercase tracking-wider">
                  <div className={`flex items-center gap-1.5 transition-colors duration-300 ${
                    uniqueCount >= 1 ? 'text-white' : 'text-zinc-500'
                  }`}>
                    <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-black shrink-0 ${
                      uniqueCount >= 1 ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                    }`}>
                      {uniqueCount >= 1 ? '✓' : '1'}
                    </span>
                    <span>{isEn ? '1st Product' : '1 Produs'}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-zinc-500">
                    <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-black shrink-0 bg-zinc-800 text-zinc-500 border border-zinc-700">
                      2
                    </span>
                    <span>{isEn ? '2+ Products' : '2+ Produse'}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ═══ SCROLLABLE CONTENT (ITEMS + RECOMMENDATIONS) ═══ */}
        <div className="flex-1 flex flex-col min-w-0 w-full max-w-full overflow-hidden bg-white">
          <ScrollArea className="flex-1 min-h-0 overflow-x-hidden overscroll-behavior-y-contain">
            
            {/* INLINE PREORDER SEPARATION PROMPT (Frictionless, Replaces Giant Popups) */}
            {preorderConflict && (
              <div className="mx-6 sm:mx-7 my-3 p-4 rounded-2xl bg-zinc-950 text-white border border-[#e32f8c]/40 shadow-xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#e32f8c] flex items-center gap-1.5">
                    <Clock size={12} />
                    {isEn ? 'SEPARATE SHIPMENT' : 'LIVRARE SEPARATĂ'}
                  </span>
                  <button 
                    onClick={closePreorderConflict}
                    className="text-zinc-400 hover:text-white p-1 cursor-pointer transition-colors"
                    aria-label="Dismiss"
                  >
                    <X size={14} />
                  </button>
                </div>

                <p className="text-xs text-zinc-300 leading-snug mb-3.5">
                  {preorderConflict.incomingIsPreorder 
                    ? (isEn 
                        ? 'Pre-orders are produced in a separate batch and cannot be combined with in-stock items in the same order.' 
                        : 'Precomenzile se expediază dintr-un lot dedicat și nu pot fi combinate cu produsele din stoc în aceeași comandă.')
                    : (isEn 
                        ? 'In-stock items ship immediately (24-48h) and cannot be combined with pre-orders in the same order.' 
                        : 'Produsele din stoc se livrează în 24-48h și nu pot fi combinate cu precomenzile în aceeași comandă.')}
                </p>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={resolvePreorderConflictWithReplace}
                    className="flex-1 py-2.5 px-3 bg-[#e32f8c] hover:bg-[#c22074] active:scale-95 text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer text-center"
                  >
                    {preorderConflict.incomingIsPreorder 
                      ? (isEn ? 'SWITCH TO PRE-ORDER' : 'TRECI PE PRECOMANDĂ') 
                      : (isEn ? 'SWITCH TO IN-STOCK' : 'TRECI PE PRODUSE DIN STOC')}
                  </button>
                  <button
                    type="button"
                    onClick={closePreorderConflict}
                    className="py-2.5 px-3 bg-white/10 hover:bg-white/20 active:scale-95 text-zinc-300 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center"
                  >
                    {isEn ? 'KEEP CURRENT CART' : 'PĂSTREAZĂ COȘUL'}
                  </button>
                </div>
              </div>
            )}

            {/* RESOLVER FOR EXISTING MIXED CARTS IN STORAGE */}
            {hasMixedOrder && (
              <div className="mx-6 sm:mx-7 my-3 p-4 rounded-2xl bg-zinc-950 text-white border border-amber-500/40 shadow-xl">
                <div className="flex items-center gap-1.5 text-amber-400 text-[11px] font-black uppercase tracking-wider mb-1.5">
                  <Clock size={13} />
                  <span>{isEn ? 'SEPARATE ORDERS REQUIRED' : 'COMANDĂ MIXTĂ NEPERMISĂ'}</span>
                </div>
                <p className="text-xs text-zinc-300 mb-3 leading-snug">
                  {isEn 
                    ? 'In-stock and pre-order products cannot be ordered together. Choose which order to proceed with:' 
                    : 'Produsele din stoc și precomenzile se livrează separat. Alege comanda pe care vrei să o finalizezi:'}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      useCartStore.setState({
                        items: items.filter(item => !isPreorder(item, item.selectedVariant))
                      });
                    }}
                    className="flex-1 py-2 bg-white text-black font-black uppercase text-[10px] tracking-wider rounded-xl hover:bg-zinc-200 transition-colors cursor-pointer"
                  >
                    {isEn ? 'KEEP IN-STOCK' : 'DOAR ÎN STOC'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      useCartStore.setState({
                        items: items.filter(item => isPreorder(item, item.selectedVariant))
                      });
                    }}
                    className="flex-1 py-2 bg-[#e32f8c] text-white font-black uppercase text-[10px] tracking-wider rounded-xl hover:bg-[#c22074] transition-colors cursor-pointer"
                  >
                    {isEn ? 'KEEP PRE-ORDER' : 'DOAR PRECOMANDĂ'}
                  </button>
                </div>
              </div>
            )}

            {/* CART ITEMS LIST */}
            {items.length > 0 ? (
              <div className="flex flex-col px-6 sm:px-7 py-2 min-w-0">
                <AnimatePresence initial={false}>
                  {items.map((item) => {
                    const itemKey = `${item.id}-${item.selectedVariant ? (typeof (item.selectedVariant.name as any) === 'object' ? (item.selectedVariant.name as any).ro : item.selectedVariant.name) : 'default'}`;
                    const displayImage = (item.selectedVariant && item.selectedVariant.image) || (item.selectedVariant && item.selectedVariant.imageIndex !== undefined && item.images && item.images[item.selectedVariant.imageIndex]) || item.image;
                    
                    return (
                      <motion.div 
                        key={itemKey}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0, margin: 0, overflow: 'hidden' }}
                        className="flex gap-3.5 group py-4 border-b border-zinc-100 last:border-0 items-center"
                      >
                        {/* Image */}
                        <Link 
                          href={`/product/${item.slug}`} 
                          onClick={() => setCartOpen(false)}
                          className="w-[74px] h-[74px] sm:w-[82px] sm:h-[82px] bg-zinc-950 flex-shrink-0 relative flex items-center justify-center overflow-hidden rounded-xl border border-zinc-800/80 shadow-inner"
                        >
                          <Image 
                            src={displayImage} 
                            alt={getLocalized(item.name, locale)} 
                            fill 
                            priority 
                            className="object-contain p-1 transition-transform duration-500 group-hover:scale-105" 
                            sizes="82px" 
                          />
                        </Link>
  
                        {/* Details */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                          <div className="flex justify-between items-start gap-2">
                            <Link 
                              href={`/product/${item.slug}`} 
                              onClick={() => setCartOpen(false)}
                              className="hover:text-[#e32f8c] transition-colors block flex-1"
                            >
                              <h4 className="font-black text-xs sm:text-[13px] uppercase tracking-wide text-black leading-snug line-clamp-1">
                                {getLocalized(item.name, locale)}
                              </h4>
                            </Link>
                            <span className="font-black text-sm tracking-tight text-black shrink-0">
                              {formatPrice(getProductPrice(item.price, currency) * item.quantity, currency)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {item.selectedVariant && (
                              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                {getLocalized(item.selectedVariant.name, locale)}
                              </p>
                            )}
                            {isPreorder(item, item.selectedVariant) && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                <Clock size={10} />
                                {isEn ? 'PRE-ORDER' : 'PRECOMANDĂ'}
                              </span>
                            )}
                          </div>
                          
                          {/* Qty Selector & Remove */}
                          <div className="flex items-center justify-between mt-2.5">
                            <div className="flex items-center border border-zinc-200 h-[30px] rounded-lg px-2 bg-white gap-2">
                              <button 
                                onClick={() => item.quantity > 1 
                                  ? updateQuantity(item.id, item.quantity - 1, item.selectedVariant?.name) 
                                  : removeItem(item.id, item.selectedVariant?.name)} 
                                className="text-zinc-400 hover:text-black transition-colors flex items-center justify-center p-0.5"
                                aria-label="Decrease quantity"
                              >
                                {item.quantity === 1 ? (
                                  <Trash2 className="w-3 h-3 hover:text-red-500 transition-colors" />
                                ) : (
                                  <Minus className="w-3 h-3" />
                                )}
                              </button>
                              <span className="text-xs font-black w-4 text-center select-none text-black">
                                {item.quantity}
                              </span>
                              <button 
                                onClick={() => updateQuantity(item.id, item.quantity + 1, item.selectedVariant?.name)} 
                                className="text-zinc-400 hover:text-black transition-colors flex items-center justify-center p-0.5"
                                aria-label="Increase quantity"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            
                            <button 
                              onClick={() => removeItem(item.id, item.selectedVariant?.name)}
                              className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-red-500 transition-colors"
                            >
                              {isEn ? 'Remove' : 'Elimină'}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ) : (
              /* EMPTY CART NOTICE */
              <div className="px-6 sm:px-7 py-8 text-center bg-white flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-3 text-zinc-300">
                  <ShoppingCart className="w-7 h-7" strokeWidth={1.5} />
                </div>
                <h3 className="text-sm font-black uppercase tracking-wider text-black">
                  {isEn ? 'YOUR CART IS EMPTY' : 'COȘUL TĂU ESTE GOL'}
                </h3>
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mt-1 max-w-[240px]">
                  {isEn 
                    ? 'Add both models below to get 10% off your entire order!' 
                    : 'Adaugă ambele modele mai jos pentru a activa reducerea de 10%!'}
                </p>
              </div>
            )}

            {/* ═══ RECOMMENDATIONS SECTION (YoungLA "TRENDING" Dynamic Carousel) ═══ */}
            {!isLoadingProducts && availableUpsells.length > 0 && (
              <div className="bg-[#fafafa] py-5 mt-2 border-t border-zinc-100 pb-6">
                {/* Header with Title & Arrow Navigation (Active only when scrollable) */}
                <div className="px-6 sm:px-7 mb-3.5 flex items-center justify-between">
                  <h3 className="text-xs sm:text-[13px] font-black uppercase tracking-[0.22em] text-zinc-900">
                    TRENDING
                  </h3>

                  {(canScrollLeft || canScrollRight) && (
                    <div className="flex items-center gap-1.5">
                      <button 
                        type="button"
                        onClick={scrollLeft}
                        disabled={!canScrollLeft}
                        aria-label="Previous items"
                        className={cn(
                          "w-7 h-7 rounded-full border flex items-center justify-center transition-all bg-white shadow-2xs",
                          canScrollLeft 
                            ? "border-zinc-300 text-zinc-800 hover:border-black hover:text-black active:scale-95 cursor-pointer" 
                            : "border-zinc-200 text-zinc-300 opacity-40 cursor-default pointer-events-none"
                        )}
                      >
                        <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                      <button 
                        type="button"
                        onClick={scrollRight}
                        disabled={!canScrollRight}
                        aria-label="Next items"
                        className={cn(
                          "w-7 h-7 rounded-full border flex items-center justify-center transition-all bg-white shadow-2xs",
                          canScrollRight 
                            ? "border-zinc-300 text-zinc-800 hover:border-black hover:text-black active:scale-95 cursor-pointer" 
                            : "border-zinc-200 text-zinc-300 opacity-40 cursor-default pointer-events-none"
                        )}
                      >
                        <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Dynamic Carousel Container (Works seamlessly for 1 product or 10+ products) */}
                <div 
                  ref={carouselRef}
                  className="flex gap-3 overflow-x-auto no-scrollbar px-6 sm:px-7 pb-2 snap-x scroll-smooth"
                >
                  {availableUpsells.map((p) => {
                    const price = getProductPrice(p.price, currency);

                    return (
                      <div 
                        key={p.id} 
                        className="w-[136px] sm:w-[148px] shrink-0 snap-start flex flex-col group select-none"
                      >
                        {/* Portrait Image Container with In-Photo Black Square [+] Button */}
                        <div className="relative w-full aspect-[4/5] bg-gradient-to-b from-[#18181b] via-[#121214] to-[#0a0a0c] rounded-2xl overflow-hidden border border-zinc-800/80 shadow-md flex items-center justify-center">
                          <Link 
                            href={`/product/${p.slug}`}
                            onClick={() => setCartOpen(false)}
                            className="absolute inset-0 z-0 flex items-center justify-center p-2"
                          >
                            <Image 
                              src={p.image} 
                              alt={getLocalized(p.name, locale)} 
                              fill 
                              sizes="150px" 
                              className="object-contain p-2 group-hover:scale-108 transition-transform duration-300 filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]" 
                            />
                          </Link>

                          {/* Solid Black Square + Button Inside the Photo (YoungLA UX) */}
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (p.variants?.options && p.variants.options.length > 0) {
                                setSelectingProduct(p);
                              } else if (p.bundleVariants) {
                                setCartOpen(false);
                                router.push(`/product/${p.slug}`);
                              } else {
                                addItem(p);
                              }
                            }}
                            aria-label={`Add ${getLocalized(p.name, locale)} to cart`}
                            className="absolute bottom-2.5 right-2.5 z-10 w-7.5 h-7.5 sm:w-8 sm:h-8 bg-black hover:bg-[#e32f8c] active:scale-90 text-white rounded-lg flex items-center justify-center shadow-lg transition-all cursor-pointer border border-white/15 hover:border-transparent"
                          >
                            <Plus className="w-4 h-4 stroke-[2.5]" />
                          </button>
                        </div>

                        {/* Title & Price Below Image (Clean typography, never cluttered) */}
                        <Link 
                          href={`/product/${p.slug}`}
                          onClick={() => setCartOpen(false)}
                          className="flex flex-col mt-2 min-w-0"
                        >
                          <h4 className="text-[12px] sm:text-[13px] font-bold uppercase tracking-tight text-zinc-900 group-hover:text-[#e32f8c] transition-colors leading-snug line-clamp-1 mt-0.5">
                            {getLocalized(p.name, locale)}
                          </h4>
                          <p className="text-[12px] sm:text-[13px] font-semibold text-zinc-500 mt-0.5">
                            {formatPrice(price, currency)}
                          </p>
                        </Link>
                      </div>
                    );
                  })}
                </div>

                {/* Horizontal Swipe Cue & Live Progress Track (Visible whenever scrollable) */}
                {(canScrollLeft || canScrollRight) && (
                  <div className="mx-6 sm:mx-7 mt-3 flex items-center justify-between gap-3 pt-0.5">
                    <div className="flex-1 h-[2px] bg-zinc-200/90 rounded-full overflow-hidden relative">
                      <div 
                        className="h-full bg-black rounded-full transition-all duration-100 ease-out"
                        style={{
                          width: '35%',
                          transform: `translateX(${scrollProgress * 1.85}%)`
                        }}
                      />
                    </div>
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400 select-none flex items-center gap-1 shrink-0">
                      <span>{isEn ? 'SWIPE' : 'GLISEAZĂ'}</span>
                      <ChevronRight size={10} className="stroke-[2.5]" />
                    </span>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* ═══ FOOTER CHECKOUT AREA (TrenZone Identity) ═══ */}
          {items.length > 0 && (
            <div className="flex-shrink-0 p-5 sm:p-6 bg-white border-t border-zinc-100 z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
              <div className="flex flex-col mb-4 gap-2">
                {/* Subtotal */}
                <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-zinc-500">
                  <span>{isEn ? 'SUBTOTAL' : 'SUBTOTAL'}</span>
                  <span className="font-black text-sm text-black">{formatPrice(subtotal, currency)}</span>
                </div>
                
                {/* 10% Bundle Discount Banner with TrenZone Magenta */}
                {discount > 0 && (
                  <div className="flex justify-between items-center text-xs font-bold text-[#e32f8c] bg-[#e32f8c]/10 px-3 py-2 rounded-xl border border-[#e32f8c]/25 shadow-sm">
                    <span className="uppercase tracking-widest text-[10px] font-black flex items-center gap-1.5">
                      {isEn ? 'TRENZONE BUNDLE (-10%)' : 'REDUCERE BUNDLE (-10%)'}
                    </span>
                    <span className="font-black text-sm">-{formatPrice(discount, currency)}</span>
                  </div>
                )}

                {/* Coupon Discount */}
                {couponDiscount > 0 && (
                  <div className="flex justify-between items-center text-xs font-bold bg-[#e32f8c]/5 border border-[#e32f8c]/20 px-3 py-1.5 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="uppercase tracking-widest text-[#e32f8c] font-black">{appliedCoupon?.code}</span>
                      <span className="text-[10px] text-slate-500 font-semibold">
                        {appliedCoupon?.type === 'percentage' ? `(-${appliedCoupon?.value}%)` : `(-${formatPrice(couponDiscount, currency)})`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[#e32f8c] font-black">-{formatPrice(couponDiscount, currency)}</span>
                      <button 
                        onClick={() => {
                          setCoupon(null);
                          if (typeof window !== "undefined") {
                            localStorage.removeItem("tz_referral_code");
                          }
                        }}
                        className="p-1 hover:bg-red-50 hover:text-red-500 text-slate-400 rounded-md transition-colors"
                        title={isEn ? 'Remove code' : 'Elimină cod'}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Total */}
                <div className="flex justify-between items-baseline pt-2 border-t border-zinc-100 mt-1">
                  <span className="text-xs sm:text-sm font-black text-zinc-500 uppercase tracking-widest">
                    {isEn ? 'TOTAL' : 'TOTAL'}
                  </span>
                  <span className="text-2xl sm:text-[26px] font-black text-black leading-none tracking-tight">
                    {formatPrice(total, currency)}
                  </span>
                </div>
              </div>

              {/* Preorder Fulfillment Note (Only for Pure Pre-Order Orders) */}
              {hasPreorderInCart && !hasMixedOrder && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-zinc-700 mb-3 leading-snug">
                  <Clock size={13} className="text-amber-600 shrink-0" />
                  <span className="font-semibold text-zinc-700">
                    {isEn
                      ? 'Pre-order item: will ship automatically as soon as the new production batch arrives.'
                      : 'Precomandă: se expediază automat la sosirea noului lot de producție.'}
                  </span>
                </div>
              )}
              
              {/* Checkout CTA Button (TrenZone Magenta with Lock Icon) */}
              <button 
                disabled={hasMixedOrder}
                onClick={() => {
                  if (hasMixedOrder) return;
                  setCartOpen(false);
                  router.push('/checkout');
                }}
                className={cn(
                  "w-full text-white font-black uppercase tracking-wider text-sm h-[52px] sm:h-[54px] flex items-center justify-center gap-2 rounded-2xl transition-all shadow-xl",
                  hasMixedOrder 
                    ? "bg-zinc-400 cursor-not-allowed opacity-75 shadow-none pointer-events-none" 
                    : "bg-[#e32f8c] hover:bg-[#c22074] active:scale-[0.98] shadow-[#e32f8c]/25 hover:shadow-[#e32f8c]/40 cursor-pointer"
                )}
              >
                <Lock className="w-4 h-4 mb-0.5" strokeWidth={2.5} />
                {hasMixedOrder 
                  ? (isEn ? 'SEPARATE ORDERS REQUIRED' : 'ALEGE UN TIP DE COMANDĂ MAI SUS') 
                  : (isEn ? 'COMPLETE ORDER' : 'FINALIZARE COMANDĂ')}
              </button>

              {/* Trust Badge */}
              <div className="flex flex-col items-center gap-0.5 mt-3 text-center">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-zinc-500">
                  <ShieldCheck size={13} className="text-emerald-500" />
                  {isEn ? 'SECURE PAYMENTS THROUGH STRIPE' : 'PLĂȚI SECURIZATE PRIN STRIPE'}
                </div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">
                  {isEn ? 'SHIPPING CALCULATED AT NEXT STEP' : 'LIVRAREA CALCULATĂ LA PASUL URMĂTOR'}
                </span>
              </div>
            </div>
          )}

          {/* Minimalist Variant Selection Popup */}
          <AnimatePresence>
            {selectingProduct && (
              <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectingProduct(null)}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="relative w-full max-w-[360px] bg-white p-5 sm:p-6 shadow-2xl flex flex-col rounded-3xl"
                >
                  {(() => {
                    const rawOptions = selectingProduct.variants?.options || [];
                    const options = [...rawOptions].sort(
                      (a: any, b: any) => (a.stock_status === 'sold_out' ? 1 : 0) - (b.stock_status === 'sold_out' ? 1 : 0)
                    );
                    const isSize = options.some((opt: any) => {
                      const n = (typeof opt.name === 'object' ? (opt.name[locale] || opt.name['ro']) : opt.name).toLowerCase();
                      return ['s', 'm', 'l', 'xl', 'xxl'].includes(n) || n.includes('marime') || n.includes('size');
                    });
                    const prodName = getLocalized(selectingProduct.name, locale);

                    return (
                      <>
                        <div className="flex gap-4 mb-4 items-center">
                          <div className="w-[60px] h-[60px] bg-zinc-950 relative overflow-hidden flex-shrink-0 flex items-center justify-center rounded-2xl border border-zinc-800/80 shadow-inner">
                            <Image 
                              src={selectingProduct.image} 
                              alt={prodName} 
                              fill 
                              priority 
                              className="object-contain p-1.5" 
                              sizes="60px" 
                            />
                          </div>
                          <div className="flex flex-col justify-center min-w-0">
                            <h2 className="text-[13px] font-black uppercase tracking-tight text-black mb-0.5 leading-tight truncate">
                              {prodName}
                            </h2>
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                              {isSize 
                                ? (isEn ? 'SELECT SIZE' : 'ALEGE MĂRIMEA') 
                                : (isEn ? 'SELECT COLOR' : 'ALEGE CULOAREA')}
                            </h3>
                          </div>
                        </div>
                        
                        <div className="w-full bg-white border border-black rounded-lg overflow-hidden shadow-sm flex flex-col text-left max-h-[min(480px,65vh)] overflow-y-auto custom-scrollbar">
                          {options.map((opt: any, idx: number) => {
                            const localizedName = getLocalized(opt.name, locale);
                            const isSoldOut = opt.stock_status === 'sold_out';
                            const optColorClass = opt.color ? undefined : getVariantColorClass(localizedName);

                            return (
                              <button
                                key={`${selectingProduct.id}-${idx}`}
                                type="button"
                                disabled={isSoldOut}
                                onClick={() => {
                                  if (!isSoldOut) {
                                    addItem(selectingProduct, {
                                      name: localizedName,
                                      image: opt.image,
                                      imageIndex: opt.imageIndex !== undefined ? opt.imageIndex : (selectingProduct.images?.findIndex((img: string) => img === opt.image) ?? 0)
                                    });
                                    setSelectingProduct(null);
                                  }
                                }}
                                className={cn(
                                  "w-full flex items-center justify-between py-2.5 px-3.5 md:py-3 md:px-4 transition-colors border-b border-black/10 last:border-none group",
                                  isSoldOut 
                                    ? "opacity-50 cursor-not-allowed bg-gray-50 hover:bg-gray-50" 
                                    : "hover:bg-[#f4f4f4] cursor-pointer"
                                )}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  {!isSize && (
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
                                  <ChevronRight className="w-4 h-4 text-black/30 group-hover:text-black transition-colors shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                        
                        <button 
                          onClick={() => setSelectingProduct(null)}
                          className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-red-500 transition-colors self-center cursor-pointer"
                        >
                          {isEn ? 'CANCEL' : 'ANULEAZĂ'}
                        </button>
                      </>
                    );
                  })()}
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  );
}
