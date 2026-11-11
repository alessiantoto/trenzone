"use client";

import {
  ShoppingCart,
  Minus,
  Plus,
  X,
  Lock,
  ChevronLeft,
  ChevronRight,
  Clock,
  Ticket,
  Trash2,
  Check,
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

function PaymentTrustMarks() {
  return (
    <div
      className="flex items-center justify-center gap-2 mt-2.5 select-none"
      aria-label="Accepted payment methods"
    >
      {/* VISA - Crisp Solid Visa Blue Badge */}
      <span className="inline-flex items-center justify-center h-[24px] w-[42px] rounded-[4px] bg-[#1434CB] shadow-2xs">
        <svg viewBox="-2 0 46 16" className="w-7 h-3 fill-white" aria-hidden="true">
          <path d="M19.5 1.2L16.3 14.8h3.7L23.2 1.2h-3.7zm14.2 8.7l1.9-5.3 1.1 5.3h-3zm4.1 4.9h3.4L38.3 1.2h-3.1c-.7 0-1.3.4-1.6 1l-5.7 12.6h3.9l.8-2.1h4.7l.5 2.1zm-9.6-4.4c0-3.5-4.9-3.7-4.8-5.3 0-.5.5-1 1.5-1.1.5-.1 2-.1 3.6.6l.6-3c-.9-.3-2-.6-3.4-.6-3.6 0-6.1 1.9-6.1 4.6 0 2 1.8 3.1 3.2 3.8 1.4.7 1.9 1.1 1.9 1.7 0 .9-1.1 1.3-2.2 1.4-1.8 0-2.9-.5-3.7-.9l-.7 3.1c.8.4 2.4.7 4 .7 3.8.1 6.1-1.8 6.1-4.9zM14.3 1.2L8.4 14.8H4.5L1.6 3.7c-.2-.7-.3-1-.9-1.3C0 2-.9 1.7-1.6 1.5l.1-.3h6.1c.8 0 1.5.5 1.7 1.4l1.5 7.9 3.7-9.3h2.8z" />
        </svg>
      </span>

      {/* Mastercard */}
      <span className="inline-flex items-center justify-center h-[24px] w-[42px] rounded-[4px] border border-zinc-200 bg-white shadow-2xs">
        <svg viewBox="0 0 32 20" className="w-6 h-4" aria-hidden="true">
          <circle cx="11.5" cy="10" r="6.5" fill="#EB001B" />
          <circle cx="20.5" cy="10" r="6.5" fill="#F79E1B" fillOpacity="0.9" />
        </svg>
      </span>

      {/* Official Apple Pay Logo from public/images/pay */}
      <span className="inline-flex items-center justify-center h-[24px] px-2 rounded-[4px] border border-zinc-200 bg-white shadow-2xs">
        <Image
          src="/images/pay/Apple_Pay-Logo.wine.svg"
          alt="Apple Pay"
          width={38}
          height={20}
          unoptimized
          className="h-[18px] w-auto object-contain"
        />
      </span>

      {/* Official Google Pay Logo from public/images/pay */}
      <span className="inline-flex items-center justify-center h-[24px] px-2 rounded-[4px] border border-zinc-200 bg-white shadow-2xs">
        <Image
          src="/images/pay/Google_Pay-Logo.wine.svg"
          alt="Google Pay"
          width={40}
          height={20}
          unoptimized
          className="h-[18px] w-auto object-contain"
        />
      </span>
    </div>
  );
}

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
    carouselRef.current?.scrollBy({ left: -160, behavior: "smooth" });
  };

  const scrollRight = () => {
    carouselRef.current?.scrollBy({ left: 160, behavior: "smooth" });
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

  const { itemCount: totalItemsCount, nextTierPercent } = getBundleSummary(items);

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
  const stepTrackPercent =
    bundlePercent >= 10
      ? 100
      : bundlePercent >= 5
        ? 50
        : isFreeShippingUnlocked
          ? 25
          : items.length > 0
            ? 12
            : 0;

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
        className="h-[100dvh] data-[side=right]:w-full data-[side=right]:max-w-none data-[side=right]:sm:w-full data-[side=right]:sm:max-w-[470px] bg-[#f6f6f8] text-[#111111] p-0 flex flex-col gap-0 border-none sm:border-l sm:border-zinc-200 shadow-2xl overflow-hidden overscroll-behavior-x-none font-sans"
      >
        {/* ═══ HEADER & STRUCTURED REWARDS CARD ═══ */}
        <div className="flex-shrink-0 bg-white border-b border-zinc-200/80 z-30 px-4 sm:px-5 pt-4 pb-3.5">
          {/* Header Row */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-[17px] sm:text-[18px] font-black uppercase tracking-tight text-[#111111] leading-none">
                {isEn ? "Your Cart" : "Coșul tău"}
              </h2>
              <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#111111] text-white text-[11px] font-extrabold tabular-nums">
                {totalItemsCount}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setCartOpen(false)}
              className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-[#111111] flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close cart"
            >
              <X className="w-4 h-4" strokeWidth={2.25} />
            </button>
          </div>

          {/* 3-Step Visual Progress Tracker */}
          <div className="rounded-xl bg-[#121216] text-white px-3.5 pt-3 pb-3">
            {/* Concise Single-Line Headline */}
            <p className="text-[12px] font-semibold text-zinc-200 leading-snug text-center mb-3">
              {totalItemsCount === 0 &&
                (isEn
                  ? "Unlock free shipping and up to 10% off"
                  : "Deblochează livrare gratuită și până la -10%")}
              {totalItemsCount === 1 && !isFreeShippingUnlocked &&
                (isEn ? (
                  <>
                    Add <strong className="text-white">{formatPrice(amountToFreeShipping, currency)}</strong> for{" "}
                    <strong className="text-emerald-400">free shipping</strong>
                  </>
                ) : (
                  <>
                    Mai adaugă{" "}
                    <strong className="text-white">{formatPrice(amountToFreeShipping, currency)}</strong>{" "}
                    pentru <strong className="text-emerald-400">livrare gratuită</strong>
                  </>
                ))}
              {totalItemsCount === 1 && isFreeShippingUnlocked &&
                (isEn ? (
                  <>
                    Free shipping unlocked, add{" "}
                    <strong className="text-[#ff4da6]">1 more item for 5% off</strong>
                  </>
                ) : (
                  <>
                    Ai livrare gratuită — mai adaugă{" "}
                    <strong className="text-[#ff4da6]">1 produs pentru -5%</strong>
                  </>
                ))}
              {totalItemsCount === 2 &&
                (isEn ? (
                  <>
                    Add <strong className="text-[#ff4da6]">1 more item</strong> for{" "}
                    <strong className="text-emerald-400">10% off</strong>
                  </>
                ) : (
                  <>
                    Mai adaugă <strong className="text-[#ff4da6]">1 produs</strong> pentru{" "}
                    <strong className="text-emerald-400">-10% reducere</strong>
                  </>
                ))}
              {totalItemsCount >= 3 &&
                (isEn ? (
                  <>
                    <strong className="text-emerald-400">All 3 rewards unlocked</strong> (−
                    {formatPrice(discount, currency)})
                  </>
                ) : (
                  <>
                    <strong className="text-emerald-400">Toate beneficiile activate</strong> (−
                    {formatPrice(discount, currency)})
                  </>
                ))}
            </p>

            {/* 3-Step Connected Milestone Track */}
            <div className="grid grid-cols-3 relative">
              {/* Background Line & Animated Fill connecting Node 1 → Node 2 → Node 3 */}
              <div className="absolute top-[13px] left-[16.66%] right-[16.66%] h-[3px] bg-white/15 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500 ease-out",
                    bundlePercent >= 10
                      ? "bg-emerald-400"
                      : bundlePercent >= 5
                        ? "bg-[#e32f8c]"
                        : isFreeShippingUnlocked
                          ? "bg-emerald-400"
                          : "bg-white/70"
                  )}
                  style={{ width: `${stepTrackPercent}%` }}
                />
              </div>

              {/* Step 1: Free Shipping */}
              <div className="flex flex-col items-center text-center relative z-10">
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300",
                    isFreeShippingUnlocked
                      ? "bg-emerald-400 text-[#09090b] ring-4 ring-emerald-400/20"
                      : "bg-[#1d1d24] border border-white/20 text-zinc-400"
                  )}
                >
                  {isFreeShippingUnlocked ? (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  ) : (
                    <Truck className="w-3.5 h-3.5" />
                  )}
                </div>
                <span
                  className={cn(
                    "mt-1.5 text-[10px] leading-tight",
                    isFreeShippingUnlocked ? "font-bold text-emerald-400" : "font-medium text-zinc-300"
                  )}
                >
                  {isEn ? "Free shipping" : "Livrare gratuită"}
                </span>
              </div>

              {/* Step 2: 2 Items (-5%) */}
              <div className="flex flex-col items-center text-center relative z-10">
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-[9.5px] font-black transition-all duration-300",
                    bundlePercent >= 5
                      ? "bg-[#e32f8c] text-white ring-4 ring-[#e32f8c]/25"
                      : "bg-[#1d1d24] border border-white/20 text-zinc-400"
                  )}
                >
                  -5%
                </div>
                <span
                  className={cn(
                    "mt-1.5 text-[10px] leading-tight",
                    bundlePercent >= 5 ? "font-bold text-white" : "font-medium text-zinc-400"
                  )}
                >
                  {isEn ? "2 items" : "2 produse"}
                </span>
              </div>

              {/* Step 3: 3+ Items (-10%) */}
              <div className="flex flex-col items-center text-center relative z-10">
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-[9.5px] font-black transition-all duration-300",
                    bundlePercent >= 10
                      ? "bg-emerald-400 text-[#09090b] ring-4 ring-emerald-400/25"
                      : "bg-[#1d1d24] border border-white/20 text-zinc-400"
                  )}
                >
                  -10%
                </div>
                <span
                  className={cn(
                    "mt-1.5 text-[10px] leading-tight",
                    bundlePercent >= 10 ? "font-bold text-emerald-400" : "font-medium text-zinc-400"
                  )}
                >
                  {isEn ? "3+ items" : "3+ produse"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ SCROLLABLE BODY ═══ */}
        <div className="flex-1 flex flex-col min-w-0 w-full max-w-full overflow-hidden bg-[#f6f6f8]">
          <ScrollArea className="flex-1 min-h-0 overflow-x-hidden overscroll-behavior-y-contain [&_[data-slot=scroll-area-scrollbar]]:w-1 [&_[data-slot=scroll-area-scrollbar]]:bg-transparent [&_[data-slot=scroll-area-thumb]]:bg-zinc-300 hover:[&_[data-slot=scroll-area-thumb]]:bg-zinc-400">
            {/* INLINE PREORDER SEPARATION PROMPT */}
            {preorderConflict && (
              <div className="mx-4 sm:mx-5 mt-3 p-4 rounded-xl bg-white border border-[#e32f8c]/40 shadow-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#e32f8c] flex items-center gap-1.5">
                    <Clock size={13} />
                    {isEn ? "Separate shipment" : "Livrare separată"}
                  </span>
                  <button
                    type="button"
                    onClick={closePreorderConflict}
                    className="text-zinc-400 hover:text-[#111111] p-1 cursor-pointer transition-colors"
                    aria-label="Dismiss"
                  >
                    <X size={14} />
                  </button>
                </div>

                <p className="text-xs text-zinc-600 leading-snug mb-3">
                  {preorderConflict.incomingIsPreorder
                    ? isEn
                      ? "Pre-orders ship in a separate batch and cannot be combined with in-stock items."
                      : "Precomenzile se expediază într-un lot separat și nu pot fi combinate cu produsele din stoc."
                    : isEn
                      ? "In-stock items ship in 24–48h and cannot be combined with pre-orders."
                      : "Produsele din stoc se livrează în 24–48h și nu pot fi combinate cu precomenzile."}
                </p>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={resolvePreorderConflictWithReplace}
                    className="flex-1 py-2 px-3 bg-[#111111] hover:bg-[#e32f8c] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer text-center"
                  >
                    {preorderConflict.incomingIsPreorder
                      ? isEn
                        ? "Switch to pre-order"
                        : "Treci pe precomandă"
                      : isEn
                        ? "Switch to in-stock"
                        : "Treci pe produse din stoc"}
                  </button>
                  <button
                    type="button"
                    onClick={closePreorderConflict}
                    className="py-2 px-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold rounded-lg transition-colors cursor-pointer text-center"
                  >
                    {isEn ? "Keep current cart" : "Păstrează coșul"}
                  </button>
                </div>
              </div>
            )}

            {/* RESOLVER FOR MIXED CARTS */}
            {hasMixedOrder && (
              <div className="mx-4 sm:mx-5 mt-3 p-4 rounded-xl bg-white border border-amber-400 shadow-xs">
                <div className="flex items-center gap-1.5 text-amber-700 text-[11px] font-black uppercase tracking-wider mb-1.5">
                  <Clock size={13} />
                  <span>{isEn ? "Separate orders required" : "Comandă mixtă nepermisă"}</span>
                </div>
                <p className="text-xs text-zinc-600 mb-3 leading-snug">
                  {isEn
                    ? "In-stock and pre-order items ship separately. Choose which order to proceed with:"
                    : "Produsele din stoc și precomenzile se livrează separat. Alege comanda dorită:"}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      useCartStore.setState({
                        items: items.filter((item) => !isPreorder(item, item.selectedVariant)),
                      });
                    }}
                    className="flex-1 py-2 bg-[#111111] text-white font-bold text-xs rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    {isEn ? "Keep in-stock" : "Doar din stoc"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      useCartStore.setState({
                        items: items.filter((item) => isPreorder(item, item.selectedVariant)),
                      });
                    }}
                    className="flex-1 py-2 bg-zinc-100 text-[#111111] font-bold text-xs rounded-lg hover:bg-zinc-200 transition-colors cursor-pointer"
                  >
                    {isEn ? "Keep pre-order" : "Doar precomandă"}
                  </button>
                </div>
              </div>
            )}

            {/* CART ITEMS LIST (ELEVATED WHITE CARDS) */}
            {items.length > 0 ? (
              <div className="px-4 sm:px-5 pt-3.5 pb-2 space-y-2.5 min-w-0">
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
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0, margin: 0, overflow: "hidden" }}
                        transition={{ duration: 0.18 }}
                        className="flex gap-3.5 p-3 rounded-xl bg-white border border-zinc-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] items-center"
                      >
                        {/* 4:5 Product Thumbnail */}
                        <Link
                          href={`/product/${item.slug}`}
                          onClick={() => setCartOpen(false)}
                          className="w-[72px] h-[88px] sm:w-[76px] sm:h-[94px] bg-zinc-950 rounded-lg overflow-hidden shrink-0 relative"
                        >
                          <Image
                            src={displayImage}
                            alt={getLocalized(item.name, locale)}
                            fill
                            priority
                            className="object-cover object-center"
                            sizes="80px"
                          />
                        </Link>

                        {/* Details & Controls */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
                          <div>
                            <div className="flex items-start justify-between gap-2.5">
                              <Link
                                href={`/product/${item.slug}`}
                                onClick={() => setCartOpen(false)}
                                className="hover:text-[#e32f8c] transition-colors flex-1 min-w-0"
                              >
                                <h4 className="text-[13px] font-extrabold uppercase tracking-tight text-[#111111] leading-snug line-clamp-1">
                                  {getLocalized(item.name, locale)}
                                </h4>
                              </Link>
                              <span className="text-[13.5px] font-black text-[#111111] tabular-nums shrink-0">
                                {formatPrice(
                                  getProductPrice(item.price, currency) * item.quantity,
                                  currency
                                )}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              {item.selectedVariant && (
                                <span className="inline-block px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 text-[10px] font-bold uppercase tracking-wider">
                                  {getLocalized(item.selectedVariant.name, locale)}
                                </span>
                              )}
                              {isPreorder(item, item.selectedVariant) && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                                  <Clock size={10} />
                                  {isEn ? "Pre-order" : "Precomandă"}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-3">
                            <div className="inline-flex items-center bg-[#f4f4f6] border border-zinc-200/90 rounded-lg h-8">
                              <button
                                type="button"
                                onClick={() =>
                                  item.quantity > 1
                                    ? updateQuantity(
                                        item.id,
                                        item.quantity - 1,
                                        item.selectedVariant?.name
                                      )
                                    : removeItem(item.id, item.selectedVariant?.name)
                                }
                                className="w-8 h-full flex items-center justify-center text-zinc-600 hover:text-[#111111] transition-colors cursor-pointer"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-xs font-extrabold w-6 text-center select-none text-[#111111] tabular-nums">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(
                                    item.id,
                                    item.quantity + 1,
                                    item.selectedVariant?.name
                                  )
                                }
                                className="w-8 h-full flex items-center justify-center text-zinc-600 hover:text-[#111111] transition-colors cursor-pointer"
                                aria-label="Increase quantity"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeItem(item.id, item.selectedVariant?.name)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>{isEn ? "Remove" : "Elimină"}</span>
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
              <div className="mx-4 sm:mx-5 mt-3.5 p-6 rounded-xl bg-white border border-zinc-200/80 text-center flex flex-col items-center">
                <div className="w-11 h-11 rounded-xl bg-zinc-100 flex items-center justify-center mb-3 text-zinc-500">
                  <ShoppingCart className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <h3 className="text-sm font-black uppercase tracking-tight text-[#111111]">
                  {isEn ? "Your cart is empty" : "Coșul tău este gol"}
                </h3>
                <p className="text-xs font-medium text-zinc-500 mt-1 max-w-[270px] leading-relaxed">
                  {isEn
                    ? "Add 2 items below to unlock 5% off, or 3+ items for 10% off."
                    : "Adaugă 2 produse mai jos pentru 5% reducere sau minim 3 pentru 10%."}
                </p>
              </div>
            )}

            {/* ═══ PRODUCT RECOMMENDATIONS CAROUSEL ═══ */}
            {availableUpsells.length > 0 && (
              <div className="pt-3.5 pb-4">
                <div className="px-4 sm:px-5 mb-2.5 flex items-center justify-between gap-2">
                  <h3 className="text-[12px] font-black uppercase tracking-[0.06em] text-[#111111] truncate">
                    {bundlePercent === 5
                      ? isEn
                        ? "Add 1 more item for 10% off"
                        : "Mai adaugă un produs pentru -10%"
                      : bundlePercent === 0 && totalItemsCount === 1
                        ? isEn
                          ? "Add 1 more item for 5% off"
                          : "Mai adaugă un produs pentru -5%"
                        : isEn
                          ? "Complete your setup"
                          : "Completează echipamentul"}
                  </h3>

                  {(canScrollLeft || canScrollRight) && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={scrollLeft}
                        disabled={!canScrollLeft}
                        aria-label="Previous items"
                        className={cn(
                          "w-7 h-7 rounded-full border flex items-center justify-center transition-colors bg-white shadow-2xs",
                          canScrollLeft
                            ? "border-zinc-200 text-[#111111] hover:border-[#111111] cursor-pointer"
                            : "border-zinc-200 text-zinc-300 opacity-50 pointer-events-none"
                        )}
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={scrollRight}
                        disabled={!canScrollRight}
                        aria-label="Next items"
                        className={cn(
                          "w-7 h-7 rounded-full border flex items-center justify-center transition-colors bg-white shadow-2xs",
                          canScrollRight
                            ? "border-zinc-200 text-[#111111] hover:border-[#111111] cursor-pointer"
                            : "border-zinc-200 text-zinc-300 opacity-50 pointer-events-none"
                        )}
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div
                  ref={carouselRef}
                  className="flex gap-2.5 overflow-x-auto no-scrollbar px-4 sm:px-5 pb-1 snap-x scroll-smooth"
                >
                  {availableUpsells.map((p) => {
                    const price = getProductPrice(p.price, currency);
                    const nextPct = nextTierPercent || bundlePercent;
                    const discountedHint =
                      nextPct > 0 ? Number((price * (1 - nextPct / 100)).toFixed(2)) : null;

                    return (
                      <div
                        key={p.id}
                        className="w-[138px] sm:w-[148px] shrink-0 snap-start bg-white rounded-xl p-1.5 border border-zinc-200/80 shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:border-zinc-300 transition-all flex flex-col group select-none"
                      >
                        <div className="relative w-full aspect-[4/5] bg-zinc-950 rounded-lg overflow-hidden">
                          <Link
                            href={`/product/${p.slug}`}
                            onClick={() => setCartOpen(false)}
                            className="absolute inset-0 z-0"
                          >
                            <Image
                              src={p.image}
                              alt={getLocalized(p.name, locale)}
                              fill
                              sizes="150px"
                              className="object-cover object-center group-hover:scale-104 transition-transform duration-500"
                            />
                          </Link>

                          {nextPct > 0 && (
                            <span className="absolute top-1.5 left-1.5 z-10 px-1.5 py-0.5 rounded bg-[#111111]/90 text-white text-[9.5px] font-extrabold tracking-wide">
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
                            className="absolute bottom-2 right-2 z-10 h-7 px-2.5 rounded-md bg-white hover:bg-[#e32f8c] text-[#111111] hover:text-white active:scale-95 text-[10px] font-extrabold uppercase tracking-wider shadow-md flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3 stroke-[2.75]" />
                            <span>{isEn ? "Add" : "Adaugă"}</span>
                          </button>
                        </div>

                        <Link
                          href={`/product/${p.slug}`}
                          onClick={() => setCartOpen(false)}
                          className="flex flex-col px-1 pt-2 pb-1 min-w-0"
                        >
                          <h4 className="text-[11.5px] font-bold text-[#111111] group-hover:text-[#e32f8c] transition-colors leading-snug line-clamp-2 min-h-[2rem]">
                            {getLocalized(p.name, locale)}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-1 tabular-nums">
                            {discountedHint && discountedHint < price ? (
                              <>
                                <span className="text-[12.5px] font-black text-[#111111]">
                                  {formatPrice(discountedHint, currency)}
                                </span>
                                <span className="text-[10.5px] font-medium text-zinc-400 line-through">
                                  {formatPrice(price, currency)}
                                </span>
                              </>
                            ) : (
                              <span className="text-[12.5px] font-bold text-[#111111]">
                                {formatPrice(price, currency)}
                              </span>
                            )}
                          </div>
                        </Link>
                      </div>
                    );
                  })}
                </div>

                {/* Carousel Progress Indicator */}
                {(canScrollLeft || canScrollRight) && (
                  <div className="mx-4 sm:mx-5 mt-2 flex items-center gap-3">
                    <div className="flex-1 h-[2px] bg-zinc-200 rounded-full overflow-hidden relative">
                      <div
                        className="h-full bg-[#111111] rounded-full transition-all duration-100 ease-out"
                        style={{
                          width: "35%",
                          transform: `translateX(${scrollProgress * 1.85}%)`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══ PROMO CODE & ORDER SUMMARY CARD ═══ */}
            {items.length > 0 && (
              <div className="px-4 sm:px-5 pb-4">
                <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-zinc-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-3.5">
                  <div>
                    <label className="block text-[11.5px] font-black uppercase tracking-wider text-[#111111] mb-2">
                      {isEn ? "Promo code" : "Cod de reducere"}
                    </label>

                    {!appliedCoupon ? (
                      <CouponInput variant="cart" />
                    ) : (
                      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs">
                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                          <Ticket className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span className="uppercase tracking-wider font-black text-[#111111]">
                            {appliedCoupon.code}
                          </span>
                          <span className="text-emerald-700 font-bold">
                            {appliedCoupon.type === "percentage"
                              ? `(-${appliedCoupon.value}%)`
                              : appliedCoupon.type === "free_shipping"
                                ? isEn
                                  ? "Free shipping"
                                  : "Livrare gratuită"
                                : `(-${formatPrice(couponDiscount, currency)})`}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCoupon(null);
                            if (typeof window !== "undefined") {
                              localStorage.removeItem("tz_referral_code");
                            }
                          }}
                          className="p-1 text-zinc-400 hover:text-[#111111] transition-colors cursor-pointer"
                          title={isEn ? "Remove code" : "Elimină cod"}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Summary Breakdown */}
                  <div className="pt-3 border-t border-zinc-100 space-y-2 text-[12.5px] tabular-nums">
                    <div className="flex justify-between text-zinc-600">
                      <span>{isEn ? "Subtotal" : "Subtotal"}</span>
                      <span className="font-bold text-[#111111]">
                        {formatPrice(subtotal, currency)}
                      </span>
                    </div>

                    {discount > 0 && (
                      <div className="flex justify-between items-center text-[#111111]">
                        <span className="font-semibold text-zinc-700">
                          {isEn
                            ? `Bundle discount (-${bundlePercent}%)`
                            : `Reducere pachet (-${bundlePercent}%)`}
                        </span>
                        <span className="font-extrabold text-[#e32f8c]">
                          -{formatPrice(discount, currency)}
                        </span>
                      </div>
                    )}

                    {appliedCoupon && couponDiscount > 0 && (
                      <div className="flex justify-between items-center text-[#111111]">
                        <span className="font-semibold text-zinc-700">
                          {isEn
                            ? `Promo code (${appliedCoupon.code})`
                            : `Cod reducere (${appliedCoupon.code})`}
                        </span>
                        <span className="font-extrabold text-emerald-600">
                          -{formatPrice(couponDiscount, currency)}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between text-zinc-600">
                      <span>{isEn ? "Shipping" : "Livrare"}</span>
                      {isFreeShippingUnlocked ? (
                        <span className="font-bold text-emerald-600">
                          {isEn ? "Free" : "Gratuită"}
                        </span>
                      ) : (
                        <span className="text-zinc-500">
                          {isEn ? "Calculated at checkout" : "Calculată la checkout"}
                        </span>
                      )}
                    </div>
                  </div>

                  {hasPreorderInCart && !hasMixedOrder && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] font-medium text-amber-800">
                      <Clock size={12} className="shrink-0" />
                      <span>
                        {isEn
                          ? "Pre-order ships automatically when the new batch arrives."
                          : "Precomanda se expediază automat la sosirea noului lot."}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </ScrollArea>

          {/* ═══ STICKY CHECKOUT DOCK ═══ */}
          {items.length > 0 && (
            <div className="flex-shrink-0 px-4 sm:px-5 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] bg-white border-t border-zinc-200 shadow-[0_-8px_24px_rgba(0,0,0,0.04)] z-20">
              <div className="flex items-center justify-between gap-2 mb-2.5 tabular-nums">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-zinc-500">
                    Total
                  </span>
                  {totalSaved > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10.5px] font-bold">
                      {isEn
                        ? `You save ${formatPrice(totalSaved, currency)}`
                        : `Economisești ${formatPrice(totalSaved, currency)}`}
                    </span>
                  )}
                </div>
                <span className="text-[19px] font-black text-[#111111] tracking-tight">
                  {formatPrice(total, currency)}
                </span>
              </div>

              <button
                type="button"
                disabled={hasMixedOrder}
                onClick={() => {
                  if (hasMixedOrder) return;
                  setCartOpen(false);
                  router.push("/checkout");
                }}
                className={cn(
                  "w-full h-12 rounded-xl font-black uppercase tracking-wider text-[13px] flex items-center justify-center gap-2 transition-colors shadow-xs",
                  hasMixedOrder
                    ? "bg-zinc-200 text-zinc-500 cursor-not-allowed pointer-events-none"
                    : "bg-[#111111] hover:bg-[#e32f8c] text-white active:scale-[0.99] cursor-pointer"
                )}
              >
                <Lock className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
                {hasMixedOrder ? (
                  <span>{isEn ? "Resolve cart above" : "Alege tipul de comandă"}</span>
                ) : (
                  <>
                    <span>{isEn ? "Checkout securely" : "Finalizare comandă"}</span>
                    <ArrowRight className="w-4 h-4 shrink-0" strokeWidth={2.5} />
                  </>
                )}
              </button>

              <PaymentTrustMarks />
            </div>
          )}

          {/* ═══ VARIANT SELECTION MODAL ═══ */}
          <AnimatePresence>
            {selectingProduct && (
              <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectingProduct(null)}
                  className="absolute inset-0 bg-black/55 backdrop-blur-xs"
                />
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                  className="relative w-full max-w-[360px] bg-white border border-zinc-200 p-5 sm:p-6 shadow-2xl flex flex-col rounded-2xl text-[#111111]"
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
                          <div className="w-[54px] h-[68px] bg-zinc-950 relative overflow-hidden shrink-0 rounded-lg">
                            <Image
                              src={selectingProduct.image}
                              alt={prodName}
                              fill
                              priority
                              className="object-cover object-center"
                              sizes="60px"
                            />
                          </div>
                          <div className="flex flex-col justify-center min-w-0 flex-1">
                            <h2 className="text-[13px] font-black uppercase tracking-tight text-[#111111] mb-0.5 leading-tight truncate">
                              {prodName}
                            </h2>
                            <h3 className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-400">
                              {isSize
                                ? isEn
                                  ? "Select size"
                                  : "Alege mărimea"
                                : isEn
                                  ? "Select color"
                                  : "Alege culoarea"}
                            </h3>
                          </div>
                        </div>

                        <div className="w-full bg-white border border-zinc-200 rounded-xl overflow-hidden flex flex-col text-left max-h-[min(460px,62vh)] overflow-y-auto custom-scrollbar divide-y divide-zinc-200">
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
                                  "w-full flex items-center justify-between py-2.5 px-3.5 transition-colors group",
                                  isSoldOut
                                    ? "opacity-40 cursor-not-allowed bg-zinc-50"
                                    : "hover:bg-zinc-50 cursor-pointer"
                                )}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  {!isSize && (
                                    <div
                                      className={cn(
                                        "w-4.5 h-4.5 rounded-full shrink-0 border border-black/15",
                                        optColorClass
                                      )}
                                      style={opt.color ? { backgroundColor: opt.color } : undefined}
                                    />
                                  )}
                                  <div className="flex flex-col items-start text-left min-w-0">
                                    <span
                                      className={cn(
                                        "text-xs md:text-[13px] uppercase tracking-wider truncate",
                                        isSoldOut
                                          ? "font-semibold text-zinc-400"
                                          : "font-bold text-[#111111]"
                                      )}
                                    >
                                      {localizedName}
                                    </span>
                                    {(opt.badge || isSoldOut) && (
                                      <span
                                        className={cn(
                                          "text-[9.5px] font-bold uppercase tracking-wider mt-0.5",
                                          isSoldOut ? "text-red-500" : "text-[#e32f8c]"
                                        )}
                                      >
                                        {isSoldOut ? "SOLD OUT" : opt.badge}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {!isSoldOut && (
                                  <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-[#111111] transition-colors shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectingProduct(null)}
                          className="mt-4 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400 hover:text-[#111111] transition-colors self-center cursor-pointer"
                        >
                          {isEn ? "Cancel" : "Anulează"}
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
