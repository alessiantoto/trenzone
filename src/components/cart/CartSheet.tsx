"use client";

import {
  ShoppingCart,
  Minus,
  Plus,
  X,
  Lock,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Clock,
  Check,
  Ticket,
  Truck,
  ArrowRight,
} from "lucide-react";
import Image from "next/image";
import { useCartStore, isPreorder } from "@/store/useCartStore";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { useLocale } from "next-intl";
import { useRegionStore } from "@/store/useRegionStore";
import { formatPrice } from "@/utils/currency";
import { getProductPrice } from "@/utils/pricing";
import { getBundleSummary } from "@/lib/cart-calculations";
import { CouponInput } from "@/components/cart/CouponInput";
import { Link, useRouter } from "@/i18n/routing";
import { cn, getLocalized, getVariantColorClass } from "@/lib/utils";
import { Product } from "@/lib/api";

type VariantOption = NonNullable<Product["variants"]>["options"][number];

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
    resolvePreorderConflictWithReplace,
  } = useCartStore();
  const { currency } = useRegionStore();
  const { subtotal, discount, bundlePercent, couponDiscount, total } = getTotals(currency);

  const [selectingProduct, setSelectingProduct] = useState<Product | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [showCouponField, setShowCouponField] = useState(false);

  const locale = useLocale();
  const isEn = locale === "en";
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
    carouselRef.current?.scrollBy({ left: -170, behavior: "smooth" });
  };

  const scrollRight = () => {
    carouselRef.current?.scrollBy({ left: 170, behavior: "smooth" });
  };

  useEffect(() => {
    if (!isCartOpen || allProducts.length > 0) return;
    let mounted = true;

    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        if (mounted && data.success) setAllProducts(data.products);
      })
      .catch((err) => console.error("Failed to fetch products:", err));

    return () => {
      mounted = false;
    };
  }, [isCartOpen, allProducts.length]);

  const {
    itemCount: totalItemsCount,
    nextTierPercent,
    progressPercent: bundleProgressPercent,
  } = getBundleSummary(items);

  const totalSaved = Number((discount + couponDiscount).toFixed(2));
  const effectiveSubtotal = Math.max(0, Number((subtotal - totalSaved).toFixed(2)));
  const freeShippingThreshold =
    currency === "RON"
      ? getProductPrice(300, currency)
      : currency === "EUR"
        ? 100
        : getProductPrice(530, currency);
  const isFreeShippingUnlocked =
    items.length > 0 &&
    (appliedCoupon?.type === "free_shipping" || effectiveSubtotal >= freeShippingThreshold);
  const amountToFreeShipping = Math.max(
    0,
    Number((freeShippingThreshold - effectiveSubtotal).toFixed(2))
  );

  // Preorder & mixed cart fulfillment detection
  const hasPreorderInCart = items.some((item) => isPreorder(item, item.selectedVariant));
  const hasInStockInCart = items.some((item) => !isPreorder(item, item.selectedVariant));
  const hasMixedOrder = hasPreorderInCart && hasInStockInCart;

  // Recommendations: prioritize products not yet in cart, then backfill with popular models
  const inCartBaseIds = new Set(
    items.map((item) => String(item.id || "").replace(/^(.+)-bundle-\d+$/, "$1"))
  );
  const notInCart = allProducts
    .filter((product) => !inCartBaseIds.has(product.id))
    .sort((a, b) => getProductPrice(a.price, currency) - getProductPrice(b.price, currency));
  const inCartOthers = allProducts
    .filter((product) => inCartBaseIds.has(product.id))
    .sort((a, b) => getProductPrice(a.price, currency) - getProductPrice(b.price, currency));
  const availableUpsells = [...notInCart, ...(notInCart.length < 3 ? inCartOthers : [])].slice(0, 8);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;

    const t = setTimeout(checkScroll, 120);
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);

    return () => {
      clearTimeout(t);
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [availableUpsells.length, isCartOpen]);

  return (
    <Sheet open={isCartOpen} onOpenChange={setCartOpen}>
      <SheetContent
        showCloseButton={false}
        className="h-[100dvh] data-[side=right]:w-full data-[side=right]:max-w-none data-[side=right]:sm:w-full data-[side=right]:sm:max-w-[480px] bg-[#07070a] text-white p-0 flex flex-col gap-0 border-none sm:border-l sm:border-white/[0.08] shadow-[0_0_60px_rgba(0,0,0,0.9)] overflow-hidden overscroll-behavior-x-none font-sans"
      >
        {/* ═══ COMPACT OBSIDIAN HEADER + DUAL REWARD PROGRESS ═══ */}
        <div className="flex-shrink-0 bg-[#07070a]/95 backdrop-blur-xl border-b border-white/[0.07] z-30 px-4 sm:px-6 pt-3.5 sm:pt-4 pb-3">
          {/* Top Title Row */}
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-[18px] sm:text-xl font-black uppercase tracking-tight text-white leading-none flex items-center gap-1.5">
                {isEn ? (
                  <>
                    YOUR <span className="text-[#e32f8c]">CART</span>
                  </>
                ) : (
                  <>
                    COȘUL <span className="text-[#e32f8c]">TĂU</span>
                  </>
                )}
              </h2>
              <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-white/[0.08] border border-white/10 text-[10px] font-black text-zinc-200 tabular-nums">
                {totalItemsCount}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setCartOpen(false)}
              className="w-8 h-8 rounded-full bg-white/[0.07] hover:bg-white/[0.15] border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-all active:scale-90 cursor-pointer shrink-0"
              aria-label="Close cart"
            >
              <X className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>

          {/* Sleek Gamified Tiered Bundle + Free Shipping Tracker */}
          <div className="rounded-2xl p-2.5 sm:p-3 bg-gradient-to-br from-[#14141c] via-[#0e0e14] to-[#09090d] border border-white/[0.09] relative overflow-hidden">
            <div
              className={cn(
                "absolute -right-8 -top-8 w-28 h-28 rounded-full blur-2xl pointer-events-none transition-colors duration-500",
                bundlePercent === 10 ? "bg-emerald-500/20" : "bg-[#e32f8c]/20"
              )}
            />

            {/* Status Line + Active Tier Pill */}
            <div className="flex items-center justify-between gap-2 mb-2 relative z-10">
              <p className="text-[11.5px] sm:text-xs font-extrabold text-zinc-100 leading-tight truncate">
                {totalItemsCount === 0 &&
                  (isEn ? (
                    <>
                      Add <span className="text-[#ff5db1]">2 items (-5%)</span> or{" "}
                      <span className="text-emerald-400">3+ (-10%)</span>
                    </>
                  ) : (
                    <>
                      Adaugă <span className="text-[#ff5db1]">2 prod. (-5%)</span> sau{" "}
                      <span className="text-emerald-400">3+ (-10%)</span>
                    </>
                  ))}
                {totalItemsCount === 1 &&
                  (isEn ? (
                    <>
                      Add <span className="text-[#ff5db1]">1 more</span> to unlock{" "}
                      <span className="text-[#ff5db1]">-5% OFF</span>
                    </>
                  ) : (
                    <>
                      Mai adaugă <span className="text-[#ff5db1]">1 produs</span> →{" "}
                      <span className="text-[#ff5db1]">-5% REDUCERE</span>
                    </>
                  ))}
                {totalItemsCount === 2 &&
                  (isEn ? (
                    <>
                      <span className="text-[#ff5db1]">-5% active</span> · Add 1 more for{" "}
                      <span className="text-emerald-400">-10%</span>
                    </>
                  ) : (
                    <>
                      <span className="text-[#ff5db1]">-5% activ</span> · +1 produs →{" "}
                      <span className="text-emerald-400">-10% MAX</span>
                    </>
                  ))}
                {totalItemsCount >= 3 &&
                  (isEn ? (
                    <>
                      <span className="text-emerald-400">-10% MAX unlocked</span> (+ codes stack!)
                    </>
                  ) : (
                    <>
                      <span className="text-emerald-400">-10% MAX activat</span> (+ coduri!)
                    </>
                  ))}
              </p>

              {bundlePercent === 10 ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-400 text-black text-[9.5px] font-black uppercase tracking-wider shrink-0 shadow-[0_0_12px_rgba(52,211,153,0.4)]">
                  -10% MAX
                </span>
              ) : bundlePercent === 5 ? (
                <span className="px-2 py-0.5 rounded-full bg-[#e32f8c] text-white text-[9.5px] font-black uppercase tracking-wider shrink-0 shadow-[0_0_12px_rgba(227,47,140,0.4)]">
                  -5% {isEn ? "ON" : "ACTIV"}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md bg-white/[0.08] border border-white/10 text-[9.5px] font-black tracking-wider text-zinc-300 shrink-0 tabular-nums">
                  {totalItemsCount}/3
                </span>
              )}
            </div>

            {/* Slim Progress Track */}
            <div className="w-full bg-white/[0.08] h-1.5 rounded-full overflow-hidden relative z-10">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500 ease-out",
                  bundlePercent === 10
                    ? "bg-gradient-to-r from-[#e32f8c] via-[#ff57ae] to-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.75)]"
                    : "bg-gradient-to-r from-[#e32f8c] to-[#ff57ae] shadow-[0_0_10px_rgba(227,47,140,0.8)]"
                )}
                style={{ width: `${bundleProgressPercent}%` }}
              />
            </div>

            {/* Bottom Milestone + Live Free Shipping Status */}
            <div className="flex items-center justify-between gap-2 mt-2 relative z-10 text-[9.5px] font-black uppercase tracking-wider">
              <div className="flex items-center gap-2.5">
                <span className={cn("flex items-center gap-1", totalItemsCount >= 1 ? "text-zinc-200" : "text-zinc-500")}>
                  <span
                    className={cn(
                      "w-3 h-3 rounded-full flex items-center justify-center text-[7px]",
                      totalItemsCount >= 1 ? "bg-white text-black" : "bg-white/10 text-zinc-500"
                    )}
                  >
                    {totalItemsCount >= 1 ? <Check className="w-2 h-2 stroke-[3.5]" /> : "1"}
                  </span>
                  1
                </span>

                <span className={cn("flex items-center gap-1", bundlePercent >= 5 ? "text-[#ff5db1]" : "text-zinc-500")}>
                  <span
                    className={cn(
                      "w-3 h-3 rounded-full flex items-center justify-center text-[7px]",
                      bundlePercent >= 5 ? "bg-[#e32f8c] text-white" : "bg-white/10 text-zinc-500"
                    )}
                  >
                    {bundlePercent >= 5 ? <Check className="w-2 h-2 stroke-[3.5]" /> : "2"}
                  </span>
                  -5%
                </span>

                <span className={cn("flex items-center gap-1", bundlePercent >= 10 ? "text-emerald-400" : "text-zinc-500")}>
                  <span
                    className={cn(
                      "w-3 h-3 rounded-full flex items-center justify-center text-[7px]",
                      bundlePercent >= 10 ? "bg-emerald-400 text-black" : "bg-white/10 text-zinc-500"
                    )}
                  >
                    {bundlePercent >= 10 ? <Check className="w-2 h-2 stroke-[3.5]" /> : "3"}
                  </span>
                  -10%
                </span>
              </div>

              {items.length > 0 ? (
                isFreeShippingUnlocked ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400 shrink-0">
                    <Truck className="w-3 h-3" />
                    {isEn ? "Free Shipping ✓" : "Livrare Gratuită ✓"}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-zinc-400 shrink-0 tabular-nums">
                    <Truck className="w-3 h-3 text-zinc-500" />
                    {isEn
                      ? `+${formatPrice(amountToFreeShipping, currency)} Free Ship`
                      : `+${formatPrice(amountToFreeShipping, currency)} Livrare 0`}
                  </span>
                )
              ) : (
                <span className="inline-flex items-center gap-1 text-zinc-400 shrink-0">
                  <Ticket className="w-3 h-3 text-[#e32f8c]" />
                  {isEn ? "+ Codes stack" : "+ Coduri cumulabile"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ═══ GENEROUS SCROLLABLE CANVAS (ITEMS + UPSELLS) ═══ */}
        <div className="flex-1 flex flex-col min-w-0 w-full max-w-full overflow-hidden bg-[#07070a]">
          <ScrollArea className="flex-1 min-h-0 overflow-x-hidden overscroll-behavior-y-contain [&_[data-slot=scroll-area-scrollbar]]:w-1 [&_[data-slot=scroll-area-scrollbar]]:bg-transparent [&_[data-slot=scroll-area-thumb]]:bg-white/15 hover:[&_[data-slot=scroll-area-thumb]]:bg-white/30">
            {/* INLINE PREORDER SEPARATION PROMPT */}
            {preorderConflict && (
              <div className="mx-4 sm:mx-6 my-2.5 p-3.5 rounded-2xl bg-[#12121a] text-white border border-[#e32f8c]/40 shadow-xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#e32f8c] flex items-center gap-1.5">
                    <Clock size={12} />
                    {isEn ? "SEPARATE SHIPMENT" : "LIVRARE SEPARATĂ"}
                  </span>
                  <button
                    type="button"
                    onClick={closePreorderConflict}
                    className="text-zinc-400 hover:text-white p-1 cursor-pointer transition-colors"
                    aria-label="Dismiss"
                  >
                    <X size={14} />
                  </button>
                </div>

                <p className="text-xs text-zinc-300 leading-snug mb-3">
                  {preorderConflict.incomingIsPreorder
                    ? isEn
                      ? "Pre-orders are produced in a separate batch and cannot be combined with in-stock items in the same order."
                      : "Precomenzile se expediază dintr-un lot dedicat și nu pot fi combinate cu produsele din stoc în aceeași comandă."
                    : isEn
                      ? "In-stock items ship immediately (24-48h) and cannot be combined with pre-orders in the same order."
                      : "Produsele din stoc se livrează în 24-48h și nu pot fi combinate cu precomenzile în aceeași comandă."}
                </p>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={resolvePreorderConflictWithReplace}
                    className="flex-1 py-2.5 px-3 bg-[#e32f8c] hover:bg-[#ff4ca6] active:scale-95 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center"
                  >
                    {preorderConflict.incomingIsPreorder
                      ? isEn
                        ? "SWITCH TO PRE-ORDER"
                        : "TRECI PE PRECOMANDĂ"
                      : isEn
                        ? "SWITCH TO IN-STOCK"
                        : "TRECI PE PRODUSE DIN STOC"}
                  </button>
                  <button
                    type="button"
                    onClick={closePreorderConflict}
                    className="py-2.5 px-3 bg-white/[0.08] hover:bg-white/[0.14] active:scale-95 text-zinc-300 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center"
                  >
                    {isEn ? "KEEP CURRENT CART" : "PĂSTREAZĂ COȘUL"}
                  </button>
                </div>
              </div>
            )}

            {/* RESOLVER FOR EXISTING MIXED CARTS IN STORAGE */}
            {hasMixedOrder && (
              <div className="mx-4 sm:mx-6 my-2.5 p-3.5 rounded-2xl bg-[#12121a] text-white border border-amber-500/40 shadow-xl">
                <div className="flex items-center gap-1.5 text-amber-400 text-[10px] font-black uppercase tracking-wider mb-1.5">
                  <Clock size={12} />
                  <span>{isEn ? "SEPARATE ORDERS REQUIRED" : "COMANDĂ MIXTĂ NEPERMISĂ"}</span>
                </div>
                <p className="text-xs text-zinc-300 mb-3 leading-snug">
                  {isEn
                    ? "In-stock and pre-order products cannot be ordered together. Choose which order to proceed with:"
                    : "Produsele din stoc și precomenzile se livrează separat. Alege comanda pe care vrei să o finalizezi:"}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      useCartStore.setState({
                        items: items.filter((item) => !isPreorder(item, item.selectedVariant)),
                      });
                    }}
                    className="flex-1 py-2 bg-white text-black font-black uppercase text-[10px] tracking-wider rounded-xl hover:bg-zinc-200 transition-colors cursor-pointer"
                  >
                    {isEn ? "KEEP IN-STOCK" : "DOAR ÎN STOC"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      useCartStore.setState({
                        items: items.filter((item) => isPreorder(item, item.selectedVariant)),
                      });
                    }}
                    className="flex-1 py-2 bg-[#e32f8c] text-white font-black uppercase text-[10px] tracking-wider rounded-xl hover:bg-[#ff4ca6] transition-colors cursor-pointer"
                  >
                    {isEn ? "KEEP PRE-ORDER" : "DOAR PRECOMANDĂ"}
                  </button>
                </div>
              </div>
            )}

            {/* CART ITEMS LIST */}
            {items.length > 0 ? (
              <div className="flex flex-col gap-2.5 px-4 sm:px-6 pt-3 pb-2 min-w-0">
                <AnimatePresence initial={false}>
                  {items.map((item) => {
                    const variantName = item.selectedVariant
                      ? typeof item.selectedVariant.name === "object"
                        ? (item.selectedVariant.name as Record<string, string>).ro
                        : item.selectedVariant.name
                      : "default";
                    const itemKey = `${item.id}-${variantName}`;
                    const displayImage =
                      (item.selectedVariant && item.selectedVariant.image) ||
                      (item.selectedVariant &&
                        item.selectedVariant.imageIndex !== undefined &&
                        item.images &&
                        item.images[item.selectedVariant.imageIndex]) ||
                      item.image;

                    return (
                      <motion.div
                        key={itemKey}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0, margin: 0, overflow: "hidden" }}
                        transition={{ duration: 0.2 }}
                        className="flex gap-3 group p-2.5 sm:p-3 rounded-2xl bg-[#101016] border border-white/[0.07] hover:border-white/[0.14] transition-colors items-center"
                      >
                        {/* Full-Bleed 4:5 Product Frame */}
                        <Link
                          href={`/product/${item.slug}`}
                          onClick={() => setCartOpen(false)}
                          className="w-[68px] h-[82px] sm:w-[74px] sm:h-[88px] bg-[#16161f] flex-shrink-0 relative overflow-hidden rounded-xl border border-white/[0.08]"
                        >
                          <Image
                            src={displayImage}
                            alt={getLocalized(item.name, locale)}
                            fill
                            priority
                            className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                            sizes="80px"
                          />
                        </Link>

                        {/* Details */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <Link
                                href={`/product/${item.slug}`}
                                onClick={() => setCartOpen(false)}
                                className="hover:text-[#ff5db1] transition-colors block flex-1 min-w-0"
                              >
                                <h4 className="font-black text-[12.5px] sm:text-[13px] uppercase tracking-wide text-white leading-snug line-clamp-1">
                                  {getLocalized(item.name, locale)}
                                </h4>
                              </Link>
                              <span className="font-black text-[13px] sm:text-sm tracking-tight text-white tabular-nums shrink-0">
                                {formatPrice(getProductPrice(item.price, currency) * item.quantity, currency)}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              {item.selectedVariant && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.08] text-[9.5px] font-bold text-zinc-300 uppercase tracking-wider">
                                  {getLocalized(item.selectedVariant.name, locale)}
                                </span>
                              )}
                              {isPreorder(item, item.selectedVariant) && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded-md border border-amber-500/25">
                                  <Clock size={9} />
                                  {isEn ? "PRE-ORDER" : "PRECOMANDĂ"}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Pill Stepper & Subtle Delete */}
                          <div className="flex items-center justify-between mt-2.5">
                            <div className="flex items-center h-8 rounded-full bg-white/[0.05] border border-white/[0.1] px-1 gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  item.quantity > 1
                                    ? updateQuantity(item.id, item.quantity - 1, item.selectedVariant?.name)
                                    : removeItem(item.id, item.selectedVariant?.name)
                                }
                                className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                                aria-label="Decrease quantity"
                              >
                                {item.quantity === 1 ? (
                                  <Trash2 className="w-3 h-3 text-zinc-400 hover:text-rose-400 transition-colors" />
                                ) : (
                                  <Minus className="w-3 h-3" />
                                )}
                              </button>
                              <span className="text-xs font-black w-5 text-center select-none text-white tabular-nums">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, item.quantity + 1, item.selectedVariant?.name)}
                                className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                                aria-label="Increase quantity"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeItem(item.id, item.selectedVariant?.name)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              aria-label={isEn ? "Remove item" : "Elimină produsul"}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ) : (
              /* EMPTY CART STATE */
              <div className="px-5 sm:px-6 py-7 text-center flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-[#12121a] border border-white/[0.09] flex items-center justify-center mb-3 text-[#e32f8c] shadow-[0_0_24px_rgba(227,47,140,0.18)]">
                  <ShoppingCart className="w-5 h-5" strokeWidth={2} />
                </div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  {isEn ? "YOUR CART IS EMPTY" : "COȘUL TĂU ESTE GOL"}
                </h3>
                <p className="text-[11px] font-semibold text-zinc-400 mt-1.5 max-w-[270px] leading-relaxed">
                  {isEn
                    ? "Add 2 items below for -5% or 3+ for -10% off — promo codes stack on top."
                    : "Adaugă 2 produse mai jos pentru -5% sau minim 3 pentru -10% — codurile se cumulează."}
                </p>
              </div>
            )}

            {/* ═══ BUNDLE BUILDER / RECOMMENDATIONS CAROUSEL ═══ */}
            {availableUpsells.length > 0 && (
              <div className="pt-3 pb-4 mt-1 border-t border-white/[0.06]">
                {/* Header */}
                <div className="px-4 sm:px-6 mb-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-200 truncate">
                      {bundlePercent === 5
                        ? isEn
                          ? "UNLOCK -10% MAX"
                          : "URCĂ LA -10% MAXIM"
                        : bundlePercent === 10
                          ? isEn
                            ? "COMPLETE YOUR GEAR"
                            : "COMPLETEAZĂ SETUL"
                          : isEn
                            ? "BUILD YOUR BUNDLE"
                            : "ADAUGĂ ÎN PACHET"}
                    </h3>
                    {bundlePercent === 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-[#e32f8c]/15 border border-[#e32f8c]/35 text-[#ff5db1] text-[9px] font-black uppercase tracking-wider shrink-0">
                        {totalItemsCount === 1 ? "+1 → -5%" : "-5% / -10%"}
                      </span>
                    )}
                    {bundlePercent === 5 && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 text-[9px] font-black uppercase tracking-wider shrink-0">
                        +1 → -10%
                      </span>
                    )}
                  </div>

                  {(canScrollLeft || canScrollRight) && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={scrollLeft}
                        disabled={!canScrollLeft}
                        aria-label="Previous items"
                        className={cn(
                          "w-7 h-7 rounded-full border flex items-center justify-center transition-all",
                          canScrollLeft
                            ? "bg-white/[0.07] border-white/15 text-zinc-200 hover:bg-white/[0.15] hover:text-white active:scale-90 cursor-pointer"
                            : "bg-transparent border-white/[0.05] text-zinc-600 opacity-40 cursor-default pointer-events-none"
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
                          "w-7 h-7 rounded-full border flex items-center justify-center transition-all",
                          canScrollRight
                            ? "bg-white/[0.07] border-white/15 text-zinc-200 hover:bg-white/[0.15] hover:text-white active:scale-90 cursor-pointer"
                            : "bg-transparent border-white/[0.05] text-zinc-600 opacity-40 cursor-default pointer-events-none"
                        )}
                      >
                        <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Carousel Cards */}
                <div
                  ref={carouselRef}
                  className="flex gap-2.5 overflow-x-auto no-scrollbar px-4 sm:px-6 pb-1 snap-x scroll-smooth"
                >
                  {availableUpsells.map((p) => {
                    const price = getProductPrice(p.price, currency);
                    const nextPct = nextTierPercent || bundlePercent;
                    const discountedHint =
                      nextPct > 0 ? Number((price * (1 - nextPct / 100)).toFixed(2)) : null;

                    return (
                      <div
                        key={p.id}
                        className="w-[140px] sm:w-[152px] shrink-0 snap-start flex flex-col group select-none p-1.5 rounded-2xl bg-[#111118] border border-white/[0.08] hover:border-[#e32f8c]/45 transition-all"
                      >
                        <div className="relative w-full aspect-[4/5] bg-[#16161f] rounded-xl overflow-hidden">
                          <Link
                            href={`/product/${p.slug}`}
                            onClick={() => setCartOpen(false)}
                            className="absolute inset-0 z-0"
                          >
                            <Image
                              src={p.image}
                              alt={getLocalized(p.name, locale)}
                              fill
                              sizes="160px"
                              className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/75 via-black/20 to-transparent pointer-events-none" />
                          </Link>

                          {nextPct > 0 && (
                            <span className="absolute top-1.5 left-1.5 z-10 px-1.5 py-0.5 rounded-md bg-emerald-400 text-black text-[9px] font-black tracking-wider shadow">
                              -{nextPct}%
                            </span>
                          )}

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
                            className="absolute bottom-2 right-2 z-10 h-7 px-2.5 bg-white hover:bg-[#e32f8c] text-black hover:text-white active:scale-90 rounded-lg flex items-center justify-center gap-1 shadow-lg transition-all cursor-pointer text-[9.5px] font-black uppercase tracking-wider"
                          >
                            <Plus className="w-3 h-3 stroke-[3]" />
                            <span>{isEn ? "Add" : "Adaugă"}</span>
                          </button>
                        </div>

                        <Link
                          href={`/product/${p.slug}`}
                          onClick={() => setCartOpen(false)}
                          className="flex flex-col px-1 pt-2 pb-0.5 min-w-0"
                        >
                          <h4 className="text-[11px] font-extrabold uppercase tracking-tight text-zinc-100 group-hover:text-[#ff5db1] transition-colors leading-tight line-clamp-2 min-h-[1.85rem]">
                            {getLocalized(p.name, locale)}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap tabular-nums">
                            {discountedHint && discountedHint < price ? (
                              <>
                                <span className="text-[11.5px] font-black text-[#ff5db1]">
                                  {formatPrice(discountedHint, currency)}
                                </span>
                                <span className="text-[9.5px] font-semibold text-zinc-500 line-through">
                                  {formatPrice(price, currency)}
                                </span>
                              </>
                            ) : (
                              <span className="text-[11.5px] font-bold text-zinc-300">
                                {formatPrice(price, currency)}
                              </span>
                            )}
                          </div>
                        </Link>
                      </div>
                    );
                  })}
                </div>

                {/* Live Carousel Progress Track */}
                {(canScrollLeft || canScrollRight) && (
                  <div className="mx-4 sm:mx-6 mt-2 flex items-center justify-between gap-3">
                    <div className="flex-1 h-[2px] bg-white/10 rounded-full overflow-hidden relative">
                      <div
                        className="h-full bg-[#e32f8c] rounded-full transition-all duration-100 ease-out"
                        style={{
                          width: "35%",
                          transform: `translateX(${scrollProgress * 1.85}%)`,
                        }}
                      />
                    </div>
                    <span className="text-[8.5px] font-extrabold uppercase tracking-widest text-zinc-500 select-none flex items-center gap-0.5 shrink-0">
                      <span>{isEn ? "SWIPE" : "GLISEAZĂ"}</span>
                      <ChevronRight size={9} className="stroke-[2.5]" />
                    </span>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* ═══ SLIM FROSTED CHECKOUT DOCK ═══ */}
          {items.length > 0 && (
            <div className="flex-shrink-0 px-4 sm:px-6 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] bg-[#0b0b10]/95 backdrop-blur-2xl border-t border-white/[0.09] z-20 shadow-[0_-16px_40px_rgba(0,0,0,0.65)]">
              {/* Compact Promo Code Toggle / Input / Stacked Chip */}
              {!appliedCoupon ? (
                <div className="mb-2.5">
                  {showCouponField ? (
                    <div className="space-y-1">
                      <div className="flex items-start gap-1.5">
                        <div className="flex-1 min-w-0">
                          <CouponInput variant="cart" onApplied={() => setShowCouponField(false)} />
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowCouponField(false)}
                          className="h-10 w-8 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                          aria-label={isEn ? "Close promo input" : "Închide câmpul promo"}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {discount > 0 && (
                        <p className="text-[10px] font-bold text-emerald-400 px-1">
                          {isEn
                            ? `Codes stack on top of your -${bundlePercent}% bundle!`
                            : `Codul se aplică peste pachetul de -${bundlePercent}%!`}
                        </p>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowCouponField(true)}
                      className="w-full h-9 flex items-center justify-between px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.09] text-left transition-colors cursor-pointer group"
                    >
                      <span className="flex items-center gap-2 text-[11px] font-bold text-zinc-300 group-hover:text-white truncate">
                        <Ticket className="w-3.5 h-3.5 text-[#e32f8c] shrink-0" />
                        {discount > 0
                          ? isEn
                            ? "Have a promo code? Stack on top!"
                            : "Ai cod de reducere? Aplică peste bundle!"
                          : isEn
                            ? "Have a promo or partner code?"
                            : "Ai cod promo sau de partener?"}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#ff5db1] shrink-0 ml-2">
                        + {isEn ? "Apply" : "Aplică"}
                      </span>
                    </button>
                  )}
                </div>
              ) : (
                (couponDiscount > 0 || appliedCoupon.type === "free_shipping") && (
                  <div className="mb-2 flex items-center justify-between text-[11px] font-bold bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 rounded-xl">
                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                      <Ticket className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="uppercase tracking-widest text-emerald-300 font-black">
                        {appliedCoupon.code}
                      </span>
                      <span className="text-[10px] text-emerald-300/80 font-bold">
                        {appliedCoupon.type === "percentage"
                          ? `(-${appliedCoupon.value}%)`
                          : appliedCoupon.type === "free_shipping"
                            ? isEn
                              ? "Free Ship"
                              : "Livrare 0"
                            : `(-${formatPrice(couponDiscount, currency)})`}
                      </span>
                      {discount > 0 && (
                        <span className="text-[8px] font-black uppercase tracking-wider bg-emerald-400 text-black px-1.5 py-0.5 rounded">
                          {isEn ? "STACKED" : "CUMULAT"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {couponDiscount > 0 && (
                        <span className="text-emerald-300 font-black tabular-nums">
                          -{formatPrice(couponDiscount, currency)}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setCoupon(null);
                          if (typeof window !== "undefined") {
                            localStorage.removeItem("tz_referral_code");
                          }
                        }}
                        className="p-0.5 hover:bg-white/10 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
                        title={isEn ? "Remove code" : "Elimină cod"}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              )}

              {/* Compact Editorial Breakdown */}
              <div className="flex flex-col gap-1 mb-2.5">
                {totalSaved > 0 && (
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-zinc-500 uppercase tracking-wider">Subtotal</span>
                    <span className="text-zinc-500 line-through tabular-nums">
                      {formatPrice(subtotal, currency)}
                    </span>
                  </div>
                )}

                {discount > 0 && (
                  <div className="flex items-center justify-between text-[11px] font-extrabold">
                    <span className="text-[#ff5db1] uppercase tracking-wider">
                      {isEn
                        ? `Bundle (${totalItemsCount} items · -${bundlePercent}%)`
                        : `Pachet (${totalItemsCount} prod. · -${bundlePercent}%)`}
                    </span>
                    <span className="text-[#ff5db1] font-black tabular-nums">
                      -{formatPrice(discount, currency)}
                    </span>
                  </div>
                )}

                {/* Total Row */}
                <div className="flex items-baseline justify-between gap-2 pt-1 mt-0.5 border-t border-white/[0.07]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black uppercase tracking-widest text-zinc-400">
                      Total
                    </span>
                    {totalSaved > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-[9.5px] font-black tracking-wide tabular-nums">
                        {isEn
                          ? `Save ${formatPrice(totalSaved, currency)}`
                          : `−${formatPrice(totalSaved, currency)} economisiți`}
                      </span>
                    )}
                  </div>
                  <span className="text-[21px] sm:text-2xl font-black text-white leading-none tracking-tight tabular-nums">
                    {formatPrice(total, currency)}
                  </span>
                </div>
              </div>

              {/* Preorder Fulfillment Note */}
              {hasPreorderInCart && !hasMixedOrder && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[10.5px] text-amber-200 mb-2.5 leading-snug">
                  <Clock size={12} className="text-amber-400 shrink-0" />
                  <span className="font-semibold">
                    {isEn
                      ? "Pre-order item: ships automatically when the new batch arrives."
                      : "Precomandă: se expediază automat la sosirea noului lot."}
                  </span>
                </div>
              )}

              {/* Primary Neon Checkout CTA */}
              <button
                type="button"
                disabled={hasMixedOrder}
                onClick={() => {
                  if (hasMixedOrder) return;
                  setCartOpen(false);
                  router.push("/checkout");
                }}
                className={cn(
                  "w-full text-white font-black uppercase tracking-wider text-[13px] sm:text-sm h-[48px] sm:h-[52px] flex items-center justify-center gap-2 rounded-2xl transition-all",
                  hasMixedOrder
                    ? "bg-zinc-700 cursor-not-allowed opacity-70 pointer-events-none"
                    : "bg-gradient-to-r from-[#e32f8c] via-[#f03c98] to-[#cf237b] hover:brightness-110 active:scale-[0.985] shadow-[0_8px_28px_-4px_rgba(227,47,140,0.55)] cursor-pointer"
                )}
              >
                <Lock className="w-3.5 h-3.5 mb-0.5 shrink-0" strokeWidth={2.5} />
                {hasMixedOrder ? (
                  <span>{isEn ? "SEPARATE ORDERS REQUIRED" : "ALEGE UN TIP DE COMANDĂ"}</span>
                ) : (
                  <>
                    <span>{isEn ? "CHECKOUT" : "FINALIZARE COMANDĂ"}</span>
                    <span className="opacity-60">·</span>
                    <span className="tabular-nums">{formatPrice(total, currency)}</span>
                    <ArrowRight className="w-4 h-4 shrink-0" strokeWidth={2.5} />
                  </>
                )}
              </button>

              {/* Micro Trust Strip */}
              <div className="flex items-center justify-center gap-1.5 mt-2 text-[9.5px] font-bold uppercase tracking-wider text-zinc-500">
                <ShieldCheck size={12} className="text-emerald-400 shrink-0" />
                <span>
                  {isEn
                    ? "Stripe 256-bit Encrypted · Fast Delivery"
                    : "Plăți securizate Stripe · Livrare 24–48h"}
                </span>
              </div>
            </div>
          )}

          {/* ═══ OBSIDIAN VARIANT SELECTION MODAL ═══ */}
          <AnimatePresence>
            {selectingProduct && (
              <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectingProduct(null)}
                  className="absolute inset-0 bg-black/75 backdrop-blur-sm"
                />
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="relative w-full max-w-[360px] bg-[#0e0e14] border border-white/15 p-5 sm:p-6 shadow-[0_24px_70px_rgba(0,0,0,0.85)] flex flex-col rounded-3xl text-white"
                >
                  {(() => {
                    const rawOptions = selectingProduct.variants?.options || [];
                    const options = [...rawOptions].sort(
                      (a: VariantOption, b: VariantOption) =>
                        (a.stock_status === "sold_out" ? 1 : 0) -
                        (b.stock_status === "sold_out" ? 1 : 0)
                    );
                    const isSize = options.some((opt: VariantOption) => {
                      const n = (
                        typeof opt.name === "object"
                          ? opt.name[locale] || opt.name["ro"]
                          : opt.name
                      ).toLowerCase();
                      return (
                        ["s", "m", "l", "xl", "xxl"].includes(n) ||
                        n.includes("marime") ||
                        n.includes("size")
                      );
                    });
                    const prodName = getLocalized(selectingProduct.name, locale);

                    return (
                      <>
                        <div className="flex gap-3.5 mb-4 items-center">
                          <div className="w-[56px] h-[68px] bg-[#16161f] relative overflow-hidden flex-shrink-0 rounded-xl border border-white/10">
                            <Image
                              src={selectingProduct.image}
                              alt={prodName}
                              fill
                              priority
                              className="object-cover object-center"
                              sizes="64px"
                            />
                          </div>
                          <div className="flex flex-col justify-center min-w-0 flex-1">
                            <h2 className="text-[13px] font-black uppercase tracking-tight text-white mb-0.5 leading-tight truncate">
                              {prodName}
                            </h2>
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                              {isSize
                                ? isEn
                                  ? "SELECT SIZE"
                                  : "ALEGE MĂRIMEA"
                                : isEn
                                  ? "SELECT COLOR"
                                  : "ALEGE CULOAREA"}
                            </h3>
                          </div>
                        </div>

                        <div className="w-full bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden flex flex-col text-left max-h-[min(460px,62vh)] overflow-y-auto custom-scrollbar">
                          {options.map((opt: VariantOption, idx: number) => {
                            const localizedName = getLocalized(opt.name, locale);
                            const isSoldOut = opt.stock_status === "sold_out";
                            const optColorClass = opt.color
                              ? undefined
                              : getVariantColorClass(localizedName);

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
                                      imageIndex:
                                        opt.imageIndex !== undefined
                                          ? opt.imageIndex
                                          : selectingProduct.images?.findIndex(
                                              (img: string) => img === opt.image
                                            ) ?? 0,
                                    });
                                    setSelectingProduct(null);
                                  }
                                }}
                                className={cn(
                                  "w-full flex items-center justify-between py-2.5 px-3.5 md:py-3 md:px-4 transition-colors border-b border-white/[0.07] last:border-none group",
                                  isSoldOut
                                    ? "opacity-40 cursor-not-allowed bg-white/[0.01]"
                                    : "hover:bg-white/[0.08] cursor-pointer"
                                )}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  {!isSize && (
                                    <div
                                      className={cn(
                                        "w-5 h-5 rounded-full shadow-inner shrink-0 border border-white/20",
                                        optColorClass
                                      )}
                                      style={opt.color ? { backgroundColor: opt.color } : undefined}
                                    />
                                  )}
                                  <div className="flex flex-col items-start text-left min-w-0">
                                    <span
                                      className={cn(
                                        "text-xs md:text-sm uppercase tracking-wider truncate",
                                        isSoldOut ? "font-bold text-zinc-500" : "font-black text-white"
                                      )}
                                    >
                                      {localizedName}
                                    </span>
                                    {(opt.badge || isSoldOut) && (
                                      <span
                                        className={cn(
                                          "text-[9.5px] font-black uppercase tracking-widest mt-0.5",
                                          isSoldOut ? "text-rose-400" : "text-[#ff5db1]"
                                        )}
                                      >
                                        {isSoldOut ? "SOLD OUT" : opt.badge}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {!isSoldOut && (
                                  <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectingProduct(null)}
                          className="mt-4 py-1.5 px-4 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors self-center cursor-pointer"
                        >
                          {isEn ? "CANCEL" : "ANULEAZĂ"}
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
