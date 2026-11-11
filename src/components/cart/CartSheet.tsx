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
    <div className="flex items-center justify-center gap-1.5 mt-2.5 select-none" aria-label="Accepted payment methods">
      {/* VISA */}
      <span className="inline-flex items-center justify-center h-[22px] w-[36px] rounded-[4px] border border-zinc-200 bg-white">
        <svg viewBox="0 0 38 12" className="w-6 h-2.5" aria-hidden="true">
          <text
            x="19"
            y="10"
            textAnchor="middle"
            fill="#1434CB"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontSize="11"
            fontWeight="900"
            fontStyle="italic"
            letterSpacing="-0.5"
          >
            VISA
          </text>
        </svg>
      </span>

      {/* Mastercard */}
      <span className="inline-flex items-center justify-center h-[22px] w-[36px] rounded-[4px] border border-zinc-200 bg-white">
        <svg viewBox="0 0 28 18" className="w-6 h-3.5" aria-hidden="true">
          <circle cx="10.5" cy="9" r="6.5" fill="#EB001B" />
          <circle cx="17.5" cy="9" r="6.5" fill="#F79E1B" fillOpacity="0.9" />
        </svg>
      </span>

      {/* Apple Pay */}
      <span className="inline-flex items-center justify-center h-[22px] px-2 rounded-[4px] bg-[#111111] text-white text-[9px] font-bold tracking-tight leading-none gap-0.5">
        <svg viewBox="0 0 14 17" className="w-2.5 h-2.5 fill-current -mt-0.5" aria-hidden="true">
          <path d="M11.6 9c0-1.9 1.5-2.8 1.6-2.9-.9-1.3-2.2-1.5-2.7-1.5-1.1-.1-2.2.7-2.8.7s-1.5-.7-2.4-.6C4.1 4.7 3 5.4 2.4 6.5c-1.2 2.1-.3 5.3.9 7 .6.8 1.3 1.8 2.2 1.7.9 0 1.2-.6 2.3-.6s1.4.6 2.3.6c1 0 1.6-.8 2.2-1.7.7-1 1-2 1-2-.1 0-1.7-.7-1.7-2.5zM9.8 3.3c.5-.6.8-1.4.7-2.3-.7 0-1.6.5-2.1 1.1-.4.5-.8 1.4-.7 2.2.8.1 1.6-.4 2.1-1z" />
        </svg>
        <span>Pay</span>
      </span>

      {/* Google Pay */}
      <span className="inline-flex items-center justify-center h-[22px] px-2 rounded-[4px] border border-zinc-200 bg-white text-[#111111] text-[9px] font-bold tracking-tight leading-none gap-0.5">
        <svg viewBox="0 0 16 16" className="w-2.5 h-2.5" aria-hidden="true">
          <path fill="#4285F4" d="M15.6 8.2c0-.6 0-1.1-.1-1.6H8v3h4.3c-.2 1-.7 1.8-1.6 2.4v2h2.6c1.5-1.4 2.3-3.4 2.3-5.8z" />
          <path fill="#34A853" d="M8 16c2.1 0 3.9-.7 5.2-1.9l-2.6-2c-.7.5-1.6.8-2.6.8-2 0-3.7-1.4-4.3-3.2H1v2.1C2.3 14.3 5 16 8 16z" />
          <path fill="#FBBC05" d="M3.7 9.7c-.2-.5-.2-1.1-.2-1.7s.1-1.2.2-1.7V4.2H1C.4 5.3 0 6.6 0 8s.4 2.7 1 3.8l2.7-2.1z" />
          <path fill="#EA4335" d="M8 3.1c1.2 0 2.2.4 3 1.2l2.3-2.3C11.9.7 10.1 0 8 0 5 0 2.3 1.7 1 4.2l2.7 2.1C4.3 4.5 6 3.1 8 3.1z" />
        </svg>
        <span>Pay</span>
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

  const { itemCount: totalItemsCount } = getBundleSummary(items);

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
        className="h-[100dvh] data-[side=right]:w-full data-[side=right]:max-w-none data-[side=right]:sm:w-full data-[side=right]:sm:max-w-[470px] bg-[#f6f6f8] text-[#111111] p-0 flex flex-col gap-0 border-none sm:border-l sm:border-zinc-200 shadow-2xl overflow-hidden overscroll-x-none font-sans"
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

          {/* Light 3-Step Visual Progress Tracker */}
          <div className="rounded-xl bg-[#f4f4f6] border border-zinc-200/90 text-[#111111] px-3.5 pt-3 pb-3">
            {/* Concise Single-Line Headline */}
            <p className="text-[12px] font-semibold text-zinc-600 leading-snug text-center mb-3">
              {totalItemsCount === 0 &&
                (isEn
                  ? "Unlock free shipping and up to 10% off"
                  : "Deblochează livrare gratuită și până la -10%")}
              {totalItemsCount === 1 && !isFreeShippingUnlocked &&
                (isEn ? (
                  <>
                    Add <strong className="font-bold text-[#111111]">{formatPrice(amountToFreeShipping, currency)}</strong> for{" "}
                    <strong className="font-bold text-emerald-700">free shipping</strong>
                  </>
                ) : (
                  <>
                    Mai adaugă{" "}
                    <strong className="font-bold text-[#111111]">{formatPrice(amountToFreeShipping, currency)}</strong>{" "}
                    pentru <strong className="font-bold text-emerald-700">livrare gratuită</strong>
                  </>
                ))}
              {totalItemsCount === 1 && isFreeShippingUnlocked &&
                (isEn ? (
                  <>
                    Free shipping unlocked, add{" "}
                    <strong className="font-bold text-[#e32f8c]">1 more item for 5% off</strong>
                  </>
                ) : (
                  <>
                    Ai livrare gratuită — mai adaugă{" "}
                    <strong className="font-bold text-[#e32f8c]">1 produs pentru -5%</strong>
                  </>
                ))}
              {totalItemsCount === 2 &&
                (isEn ? (
                  <>
                    Add <strong className="font-bold text-[#111111]">1 more item</strong> for{" "}
                    <strong className="font-bold text-[#e32f8c]">10% off</strong>
                  </>
                ) : (
                  <>
                    Mai adaugă <strong className="font-bold text-[#111111]">1 produs</strong> pentru{" "}
                    <strong className="font-bold text-[#e32f8c]">-10% reducere</strong>
                  </>
                ))}
              {totalItemsCount >= 3 &&
                (isEn ? (
                  <>
                    <strong className="font-bold text-emerald-700">All 3 rewards unlocked</strong> (−
                    {formatPrice(discount, currency)})
                  </>
                ) : (
                  <>
                    <strong className="font-bold text-emerald-700">Toate beneficiile activate</strong> (−
                    {formatPrice(discount, currency)})
                  </>
                ))}
            </p>

            {/* 3-Step Connected Milestone Track */}
            <div className="grid grid-cols-3 relative">
              {/* Background Line & Unified Fill connecting Node 1 → Node 2 → Node 3 */}
              <div className="absolute top-[16.5px] left-[16.66%] right-[16.66%] h-[3px] bg-zinc-200 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500 ease-out",
                    bundlePercent >= 10
                      ? "bg-emerald-600"
                      : bundlePercent >= 5
                        ? "bg-[#e32f8c]"
                        : isFreeShippingUnlocked
                          ? "bg-emerald-600"
                          : "bg-[#111111]"
                  )}
                  style={{ width: `${stepTrackPercent}%` }}
                />
              </div>

              {/* Step 1: Free Shipping */}
              <div className="flex flex-col items-center text-center relative z-10">
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-300",
                    isFreeShippingUnlocked
                      ? bundlePercent >= 10
                        ? "bg-emerald-600 text-white"
                        : bundlePercent >= 5
                          ? "bg-[#e32f8c] text-white"
                          : "bg-emerald-600 text-white"
                      : "bg-white border border-zinc-300 text-zinc-400"
                  )}
                >
                  {isFreeShippingUnlocked ? (
                    <Check className="w-4 h-4 stroke-[2.75]" />
                  ) : (
                    <Truck className="w-4 h-4" />
                  )}
                </div>
                <span
                  className={cn(
                    "mt-1.5 text-[10.5px] leading-tight",
                    isFreeShippingUnlocked
                      ? bundlePercent >= 5 && bundlePercent < 10
                        ? "font-bold text-[#111111]"
                        : "font-bold text-emerald-700"
                      : "font-medium text-zinc-600"
                  )}
                >
                  {isEn ? "Free shipping" : "Livrare gratuită"}
                </span>
              </div>

              {/* Step 2: 2 Items (-5% -> Check once -10% is reached) */}
              <div className="flex flex-col items-center text-center relative z-10">
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center text-[10.5px] font-black tracking-tight tabular-nums transition-colors duration-300",
                    bundlePercent >= 10
                      ? "bg-emerald-600 text-white"
                      : bundlePercent >= 5
                        ? "bg-[#e32f8c] text-white"
                        : "bg-white border border-zinc-200 text-zinc-400"
                  )}
                >
                  {bundlePercent >= 10 ? (
                    <Check className="w-4 h-4 stroke-[2.75]" />
                  ) : (
                    "-5%"
                  )}
                </div>
                <span
                  className={cn(
                    "mt-1.5 text-[10.5px] leading-tight",
                    bundlePercent >= 10
                      ? "font-bold text-emerald-700"
                      : bundlePercent >= 5
                        ? "font-bold text-[#111111]"
                        : "font-medium text-zinc-500"
                  )}
                >
                  {isEn ? "2 items" : "2 produse"}
                </span>
              </div>

              {/* Step 3: 3+ Items (-10%) */}
              <div className="flex flex-col items-center text-center relative z-10">
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-black tracking-tighter tabular-nums transition-colors duration-300",
                    bundlePercent >= 10
                      ? "bg-emerald-600 text-white"
                      : "bg-white border border-zinc-200 text-zinc-400"
                  )}
                >
                  -10%
                </div>
                <span
                  className={cn(
                    "mt-1.5 text-[10.5px] leading-tight",
                    bundlePercent >= 10 ? "font-bold text-emerald-700" : "font-medium text-zinc-400"
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
          <ScrollArea className="cart-purple-scrollarea flex-1 min-h-0 overflow-x-hidden overscroll-y-contain">
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
                                <h4 className="text-[13px] font-extrabold uppercase tracking-tight text-[#111111] leading-[1.25] line-clamp-2">
                                  {getLocalized(item.name, locale)}
                                </h4>
                              </Link>
                              <span className="text-[13.5px] font-black text-[#111111] tabular-nums whitespace-nowrap shrink-0">
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
                  <h3 className="text-[12px] font-black uppercase tracking-[0.06em] text-[#111111] leading-tight">
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
                  className="flex gap-2.5 overflow-x-auto scrollbar-hide px-4 sm:px-5 scroll-pl-4 sm:scroll-pl-5 pb-1 snap-x snap-mandatory scroll-smooth"
                >
                  {availableUpsells.map((p) => {
                    const price = getProductPrice(p.price, currency);

                    return (
                      <div
                        key={p.id}
                        className="w-[146px] sm:w-[158px] shrink-0 snap-start bg-white rounded-xl p-2 border border-zinc-200/80 shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:border-purple-300/80 hover:shadow-[0_4px_14px_rgba(147,51,234,0.08)] transition-all flex flex-col group select-none"
                      >
                        <Link
                          href={`/product/${p.slug}`}
                          onClick={() => setCartOpen(false)}
                          className="relative w-full aspect-[4/5] bg-zinc-950 rounded-lg overflow-hidden block"
                        >
                          <Image
                            src={p.image}
                            alt={getLocalized(p.name, locale)}
                            fill
                            sizes="160px"
                            className="object-cover object-center group-hover:scale-[1.03] transition-transform duration-500"
                          />
                        </Link>

                        <div className="flex-1 flex flex-col justify-between pt-2.5 px-0.5 min-w-0">
                          <Link
                            href={`/product/${p.slug}`}
                            onClick={() => setCartOpen(false)}
                            className="block min-w-0"
                          >
                            <h4 className="text-[11.5px] font-bold text-[#111111] group-hover:text-[#9333ea] transition-colors leading-snug line-clamp-2 min-h-[2rem]">
                              {getLocalized(p.name, locale)}
                            </h4>
                            <p className="text-[13px] font-black text-[#111111] tabular-nums whitespace-nowrap mt-1">
                              {formatPrice(price, currency)}
                            </p>
                          </Link>

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
                            className="mt-2.5 h-8 w-full rounded-lg bg-[#f4f4f6] hover:bg-[#111111] text-[#111111] hover:text-white border border-zinc-200/90 hover:border-[#111111] active:scale-[0.98] text-[10.5px] font-extrabold uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap"
                          >
                            <Plus className="w-3 h-3 stroke-[2.5] shrink-0" />
                            <span>{isEn ? "Add" : "Adaugă"}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Carousel Progress Indicator */}
                {(canScrollLeft || canScrollRight) && (
                  <div className="mx-4 sm:mx-5 mt-2.5 flex items-center">
                    <div className="flex-1 h-[3px] bg-purple-950/[0.08] rounded-full overflow-hidden relative">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] via-[#9333ea] to-[#c026d3] transition-all duration-150 ease-out"
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
                    <div className="flex justify-between items-center gap-3 text-zinc-600">
                      <span>{isEn ? "Subtotal" : "Subtotal"}</span>
                      <span className="font-bold text-[#111111] whitespace-nowrap shrink-0">
                        {formatPrice(subtotal, currency)}
                      </span>
                    </div>

                    {discount > 0 && (
                      <div className="flex justify-between items-center gap-3 text-[#111111]">
                        <span className="font-semibold text-zinc-700">
                          {isEn
                            ? `Bundle discount (-${bundlePercent}%)`
                            : `Reducere pachet (-${bundlePercent}%)`}
                        </span>
                        <span className="font-extrabold text-[#e32f8c] whitespace-nowrap shrink-0">
                          -{formatPrice(discount, currency)}
                        </span>
                      </div>
                    )}

                    {appliedCoupon && couponDiscount > 0 && (
                      <div className="flex justify-between items-center gap-3 text-[#111111]">
                        <span className="font-semibold text-zinc-700">
                          {isEn
                            ? `Promo code (${appliedCoupon.code})`
                            : `Cod reducere (${appliedCoupon.code})`}
                        </span>
                        <span className="font-extrabold text-emerald-600 whitespace-nowrap shrink-0">
                          -{formatPrice(couponDiscount, currency)}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center gap-3 text-zinc-600">
                      <span>{isEn ? "Shipping" : "Livrare"}</span>
                      {isFreeShippingUnlocked ? (
                        <span className="font-bold text-emerald-600 whitespace-nowrap shrink-0">
                          {isEn ? "Free" : "Gratuită"}
                        </span>
                      ) : (
                        <span className="text-zinc-500 text-right">
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
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-wrap">
                  <span className="text-xs font-black uppercase tracking-wider text-zinc-500">
                    Total
                  </span>
                  {totalSaved > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10.5px] font-bold whitespace-nowrap">
                      {isEn
                        ? `You save ${formatPrice(totalSaved, currency)}`
                        : `Economisești ${formatPrice(totalSaved, currency)}`}
                    </span>
                  )}
                </div>
                <span className="text-[19px] font-black text-[#111111] tracking-tight whitespace-nowrap shrink-0">
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

                        <div className="w-full bg-white border border-zinc-200 rounded-xl overflow-hidden flex flex-col text-left max-h-[min(460px,62vh)] overflow-y-auto cart-purple-scroll divide-y divide-zinc-200">
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
