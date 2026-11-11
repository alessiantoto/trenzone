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
        className="h-[100dvh] data-[side=right]:w-full data-[side=right]:max-w-none data-[side=right]:sm:w-full data-[side=right]:sm:max-w-[460px] bg-white text-[#111111] p-0 flex flex-col gap-0 border-none sm:border-l sm:border-zinc-200 shadow-2xl overflow-hidden overscroll-behavior-x-none font-sans"
      >
        {/* ═══ ARCHITECTURAL LIGHT HEADER + DUAL PROGRESS TRACK ═══ */}
        <div className="flex-shrink-0 bg-white border-b border-zinc-200/90 z-30 px-5 sm:px-6 pt-4 pb-3.5">
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <h2 className="text-[14px] font-black uppercase tracking-[0.12em] text-[#111111] leading-none">
              {isEn ? "YOUR CART" : "COȘUL TĂU"}
              <span className="ml-1.5 font-bold text-zinc-400 tabular-nums">({totalItemsCount})</span>
            </h2>

            <button
              type="button"
              onClick={() => setCartOpen(false)}
              className="p-1.5 -mr-1.5 text-zinc-500 hover:text-[#111111] transition-colors cursor-pointer"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" strokeWidth={1.75} />
            </button>
          </div>

          {/* Crisp Bundle + Free Shipping Status Row */}
          <div className="flex items-center justify-between gap-2 text-[12px] leading-snug mb-2">
            <p className="text-zinc-700 font-medium truncate">
              {totalItemsCount === 0 &&
                (isEn
                  ? "Add 2 items for -5% or 3+ for -10% off"
                  : "Adaugă 2 produse pentru -5% sau 3+ pentru -10%")}
              {totalItemsCount === 1 &&
                (isEn ? (
                  <>
                    Add <strong className="font-bold text-[#111111]">1 more item</strong> for{" "}
                    <strong className="font-bold text-[#e32f8c]">-5% off</strong>
                  </>
                ) : (
                  <>
                    Mai adaugă <strong className="font-bold text-[#111111]">1 produs</strong> pentru{" "}
                    <strong className="font-bold text-[#e32f8c]">-5% reducere</strong>
                  </>
                ))}
              {totalItemsCount === 2 &&
                (isEn ? (
                  <>
                    <strong className="font-bold text-[#111111]">-5% unlocked</strong> · Add{" "}
                    <strong className="font-bold text-[#111111]">1 more</strong> for{" "}
                    <strong className="font-bold text-[#e32f8c]">-10%</strong>
                  </>
                ) : (
                  <>
                    Ai <strong className="font-bold text-[#111111]">-5% activ</strong> · +1 produs pentru{" "}
                    <strong className="font-bold text-[#e32f8c]">-10%</strong>
                  </>
                ))}
              {totalItemsCount >= 3 &&
                (isEn ? (
                  <>
                    <strong className="font-bold text-[#111111]">-10% max unlocked</strong> (−
                    {formatPrice(discount, currency)})
                  </>
                ) : (
                  <>
                    Reducere maximă <strong className="font-bold text-[#111111]">-10% activată</strong> (−
                    {formatPrice(discount, currency)})
                  </>
                ))}
            </p>

            {items.length > 0 && (
              isFreeShippingUnlocked ? (
                <span className="text-[11px] font-bold text-emerald-700 shrink-0">
                  {isEn ? "Free shipping ✓" : "Livrare gratuită ✓"}
                </span>
              ) : (
                <span className="text-[11px] font-medium text-zinc-400 shrink-0 tabular-nums">
                  {isEn
                    ? `+${formatPrice(amountToFreeShipping, currency)} free ship`
                    : `+${formatPrice(amountToFreeShipping, currency)} livrare 0`}
                </span>
              )
            )}
          </div>

          {/* 3px Architectural Bar */}
          <div className="w-full h-[3px] bg-zinc-200 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-500 ease-out rounded-full",
                bundlePercent >= 5 ? "bg-[#e32f8c]" : "bg-[#111111]"
              )}
              style={{ width: `${bundleProgressPercent}%` }}
            />
          </div>

          {/* Minimalist Milestone Labels */}
          <div className="grid grid-cols-3 items-center mt-1.5 text-[10px] font-bold uppercase tracking-[0.06em] tabular-nums">
            <span className={cn("text-left", totalItemsCount >= 1 ? "text-[#111111]" : "text-zinc-400")}>
              {isEn ? "1 item" : "1 prod."}
            </span>
            <span className={cn("text-center", bundlePercent >= 5 ? "text-[#e32f8c]" : "text-zinc-400")}>
              {isEn ? "2 · -5%" : "2 · -5%"}
            </span>
            <span className={cn("text-right", bundlePercent >= 10 ? "text-[#111111]" : "text-zinc-400")}>
              {isEn ? "3+ · -10%" : "3+ · -10%"}
            </span>
          </div>
        </div>

        {/* ═══ SCROLLABLE BODY (ITEMS + NEUTRAL UPSELLS + PROMO + SUMMARY) ═══ */}
        <div className="flex-1 flex flex-col min-w-0 w-full max-w-full overflow-hidden bg-white">
          <ScrollArea className="flex-1 min-h-0 overflow-x-hidden overscroll-behavior-y-contain [&_[data-slot=scroll-area-scrollbar]]:w-1 [&_[data-slot=scroll-area-scrollbar]]:bg-transparent [&_[data-slot=scroll-area-thumb]]:bg-zinc-300/80 hover:[&_[data-slot=scroll-area-thumb]]:bg-zinc-400">
            {/* INLINE PREORDER SEPARATION PROMPT */}
            {preorderConflict && (
              <div className="mx-5 sm:mx-6 my-3 p-4 rounded-lg bg-[#f5f5f7] border border-zinc-300">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#e32f8c] flex items-center gap-1.5">
                    <Clock size={12} />
                    {isEn ? "SEPARATE SHIPMENT" : "LIVRARE SEPARATĂ"}
                  </span>
                  <button
                    type="button"
                    onClick={closePreorderConflict}
                    className="text-zinc-500 hover:text-[#111111] p-1 cursor-pointer transition-colors"
                    aria-label="Dismiss"
                  >
                    <X size={14} />
                  </button>
                </div>

                <p className="text-xs text-zinc-700 leading-snug mb-3">
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
                    className="flex-1 py-2 px-3 bg-[#111111] hover:bg-[#e32f8c] text-white text-[11px] font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer text-center"
                  >
                    {preorderConflict.incomingIsPreorder
                      ? isEn
                        ? "SWITCH TO PRE-ORDER"
                        : "TRECI PE PRECOMANDĂ"
                      : isEn
                        ? "SWITCH TO IN-STOCK"
                        : "TRECI PE ÎN STOC"}
                  </button>
                  <button
                    type="button"
                    onClick={closePreorderConflict}
                    className="py-2 px-3 bg-white border border-zinc-300 hover:border-[#111111] text-zinc-700 text-[11px] font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer text-center"
                  >
                    {isEn ? "KEEP CART" : "PĂSTREAZĂ COȘUL"}
                  </button>
                </div>
              </div>
            )}

            {/* RESOLVER FOR MIXED CARTS */}
            {hasMixedOrder && (
              <div className="mx-5 sm:mx-6 my-3 p-4 rounded-lg bg-[#f5f5f7] border border-amber-500/50">
                <div className="flex items-center gap-1.5 text-amber-700 text-[10px] font-black uppercase tracking-[0.14em] mb-1.5">
                  <Clock size={12} />
                  <span>{isEn ? "SEPARATE ORDERS REQUIRED" : "COMANDĂ MIXTĂ NEPERMISĂ"}</span>
                </div>
                <p className="text-xs text-zinc-700 mb-3 leading-snug">
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
                    className="flex-1 py-2 bg-[#111111] text-white font-bold uppercase text-[10px] tracking-wider rounded-md hover:bg-zinc-800 transition-colors cursor-pointer"
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
                    className="flex-1 py-2 bg-white border border-zinc-300 text-[#111111] font-bold uppercase text-[10px] tracking-wider rounded-md hover:border-[#111111] transition-colors cursor-pointer"
                  >
                    {isEn ? "KEEP PRE-ORDER" : "DOAR PRECOMANDĂ"}
                  </button>
                </div>
              </div>
            )}

            {/* CART ITEMS LIST */}
            {items.length > 0 ? (
              <div className="px-5 sm:px-6 divide-y divide-zinc-200/80 min-w-0 bg-white">
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
                        className="flex gap-3.5 py-4 items-start"
                      >
                        {/* 4:5 Editorial Studio Thumbnail */}
                        <Link
                          href={`/product/${item.slug}`}
                          onClick={() => setCartOpen(false)}
                          className="w-[74px] h-[92px] sm:w-[78px] sm:h-[96px] bg-zinc-950 rounded-md overflow-hidden shrink-0 relative"
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

                        {/* Metadata & Controls */}
                        <div className="flex-1 min-w-0 flex flex-col">
                          <div className="flex items-start justify-between gap-2.5">
                            <Link
                              href={`/product/${item.slug}`}
                              onClick={() => setCartOpen(false)}
                              className="hover:text-[#e32f8c] transition-colors flex-1 min-w-0"
                            >
                              <h4 className="text-[12.5px] font-extrabold uppercase tracking-[0.04em] text-[#111111] leading-snug line-clamp-1">
                                {getLocalized(item.name, locale)}
                              </h4>
                            </Link>
                            <span className="text-[13px] font-bold text-[#111111] tabular-nums shrink-0">
                              {formatPrice(getProductPrice(item.price, currency) * item.quantity, currency)}
                            </span>
                          </div>

                          {item.selectedVariant && (
                            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-500 mt-1">
                              {getLocalized(item.selectedVariant.name, locale)}
                            </p>
                          )}

                          {isPreorder(item, item.selectedVariant) && (
                            <p className="text-[10.5px] font-semibold text-amber-700 mt-1 flex items-center gap-1">
                              <Clock size={11} />
                              {isEn ? "Pre-order — ships on next batch" : "Precomandă — lot nou"}
                            </p>
                          )}

                          {/* Hairline Quantity Stepper + Clean Remove Link */}
                          <div className="flex items-center gap-4 mt-3">
                            <div className="inline-flex items-center border border-zinc-300 rounded-md h-8 bg-white">
                              <button
                                type="button"
                                onClick={() =>
                                  item.quantity > 1
                                    ? updateQuantity(item.id, item.quantity - 1, item.selectedVariant?.name)
                                    : removeItem(item.id, item.selectedVariant?.name)
                                }
                                className="w-8 h-full flex items-center justify-center text-zinc-600 hover:text-[#111111] transition-colors cursor-pointer"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-bold w-6 text-center select-none text-[#111111] tabular-nums">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, item.quantity + 1, item.selectedVariant?.name)}
                                className="w-8 h-full flex items-center justify-center text-zinc-600 hover:text-[#111111] transition-colors cursor-pointer"
                                aria-label="Increase quantity"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeItem(item.id, item.selectedVariant?.name)}
                              className="text-[11px] font-medium text-zinc-500 hover:text-[#111111] underline underline-offset-2 transition-colors cursor-pointer"
                            >
                              {isEn ? "Remove" : "Elimină"}
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
              <div className="px-6 py-8 text-center bg-white flex flex-col items-center">
                <div className="w-11 h-11 rounded-md border border-zinc-200 flex items-center justify-center mb-3 text-zinc-400">
                  <ShoppingCart className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <h3 className="text-xs font-black uppercase tracking-[0.14em] text-[#111111]">
                  {isEn ? "YOUR CART IS EMPTY" : "COȘUL TĂU ESTE GOL"}
                </h3>
                <p className="text-[11.5px] font-medium text-zinc-500 mt-1.5 max-w-[260px] leading-relaxed">
                  {isEn
                    ? "Add 2 items below for -5% or 3+ for -10% off. Promo codes stack on top."
                    : "Adaugă 2 produse pentru -5% sau 3+ pentru -10%. Codurile de reducere se cumulează."}
                </p>
              </div>
            )}

            {/* ═══ NEUTRAL GYMSHARK-STYLE UPSELL BAND (#f5f5f7) ═══ */}
            {availableUpsells.length > 0 && (
              <div className="bg-[#f5f5f7] border-y border-zinc-200/80 py-4.5">
                <div className="px-5 sm:px-6 mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="text-[11.5px] font-black uppercase tracking-[0.14em] text-[#111111] truncate">
                      {bundlePercent === 5
                        ? isEn
                          ? "UNLOCK -10% MAX"
                          : "URCĂ LA -10% MAXIM"
                        : bundlePercent === 10
                          ? isEn
                            ? "ADD A LITTLE EXTRA"
                            : "COMPLETEAZĂ SETUL"
                          : isEn
                            ? "BUILD YOUR BUNDLE"
                            : "ADAUGĂ ÎN PACHET"}
                    </h3>
                    {bundlePercent === 0 && (
                      <span className="text-[10.5px] font-bold text-[#e32f8c] shrink-0">
                        {totalItemsCount === 1 ? "+1 → -5%" : "-5% / -10%"}
                      </span>
                    )}
                    {bundlePercent === 5 && (
                      <span className="text-[10.5px] font-bold text-[#e32f8c] shrink-0">
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
                          "w-7 h-7 rounded-full border flex items-center justify-center transition-colors bg-white",
                          canScrollLeft
                            ? "border-zinc-300 text-[#111111] hover:border-[#111111] cursor-pointer"
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
                          "w-7 h-7 rounded-full border flex items-center justify-center transition-colors bg-white",
                          canScrollRight
                            ? "border-zinc-300 text-[#111111] hover:border-[#111111] cursor-pointer"
                            : "border-zinc-200 text-zinc-300 opacity-50 pointer-events-none"
                        )}
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Crisp 4:5 Portrait Product Cards */}
                <div
                  ref={carouselRef}
                  className="flex gap-3 overflow-x-auto no-scrollbar px-5 sm:px-6 snap-x scroll-smooth"
                >
                  {availableUpsells.map((p) => {
                    const price = getProductPrice(p.price, currency);
                    const nextPct = nextTierPercent || bundlePercent;
                    const discountedHint =
                      nextPct > 0 ? Number((price * (1 - nextPct / 100)).toFixed(2)) : null;

                    return (
                      <div
                        key={p.id}
                        className="w-[124px] sm:w-[132px] shrink-0 snap-start flex flex-col group select-none"
                      >
                        <div className="relative w-full aspect-[4/5] bg-zinc-950 rounded-md overflow-hidden">
                          <Link
                            href={`/product/${p.slug}`}
                            onClick={() => setCartOpen(false)}
                            className="absolute inset-0 z-0"
                          >
                            <Image
                              src={p.image}
                              alt={getLocalized(p.name, locale)}
                              fill
                              sizes="140px"
                              className="object-cover object-center group-hover:scale-104 transition-transform duration-500"
                            />
                          </Link>

                          {nextPct > 0 && (
                            <span className="absolute top-1.5 left-1.5 z-10 px-1.5 py-0.5 rounded-[3px] bg-white text-[#111111] text-[9.5px] font-black tracking-wide">
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
                            className="absolute bottom-2 right-2 z-10 w-8 h-8 rounded-[5px] bg-[#111111] hover:bg-[#e32f8c] text-white flex items-center justify-center shadow-sm transition-colors cursor-pointer"
                          >
                            <Plus className="w-4 h-4 stroke-[2.25]" />
                          </button>
                        </div>

                        <Link
                          href={`/product/${p.slug}`}
                          onClick={() => setCartOpen(false)}
                          className="flex flex-col mt-2 min-w-0"
                        >
                          <h4 className="text-[11.5px] font-semibold text-[#111111] group-hover:text-[#e32f8c] transition-colors leading-snug line-clamp-2 min-h-[2rem]">
                            {getLocalized(p.name, locale)}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-0.5 tabular-nums">
                            {discountedHint && discountedHint < price ? (
                              <>
                                <span className="text-[12px] font-bold text-[#111111]">
                                  {formatPrice(discountedHint, currency)}
                                </span>
                                <span className="text-[11px] font-medium text-zinc-400 line-through">
                                  {formatPrice(price, currency)}
                                </span>
                              </>
                            ) : (
                              <span className="text-[12px] font-semibold text-zinc-700">
                                {formatPrice(price, currency)}
                              </span>
                            )}
                          </div>
                        </Link>
                      </div>
                    );
                  })}
                </div>

                {/* Hairline Scroll Progress */}
                {(canScrollLeft || canScrollRight) && (
                  <div className="mx-5 sm:mx-6 mt-3 flex items-center gap-3">
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

            {/* ═══ DIRECT DISCOUNT CODE & ORDER SUMMARY (GYMSHARK FLOW) ═══ */}
            {items.length > 0 && (
              <div className="px-5 sm:px-6 py-4 bg-white">
                {/* Discount Code (1-click ready) */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#111111]">
                      {isEn ? "DISCOUNT CODE" : "COD DE REDUCERE"}
                    </span>
                    {discount > 0 && !appliedCoupon && (
                      <span className="text-[10.5px] font-semibold text-emerald-700">
                        {isEn ? `Stacks with -${bundlePercent}%` : `Cumulabil cu -${bundlePercent}%`}
                      </span>
                    )}
                  </div>

                  {!appliedCoupon ? (
                    <CouponInput variant="cart" />
                  ) : (
                    <div className="flex items-center justify-between px-3 py-2.5 rounded-md bg-[#f5f5f7] border border-zinc-200 text-xs">
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <Ticket className="w-3.5 h-3.5 text-[#111111] shrink-0" />
                        <span className="uppercase tracking-wider font-black text-[#111111]">
                          {appliedCoupon.code}
                        </span>
                        <span className="text-zinc-500 font-medium">
                          {appliedCoupon.type === "percentage"
                            ? `(-${appliedCoupon.value}%)`
                            : appliedCoupon.type === "free_shipping"
                              ? isEn
                                ? "Free Shipping"
                                : "Livrare Gratuită"
                              : `(-${formatPrice(couponDiscount, currency)})`}
                        </span>
                        {discount > 0 && (
                          <span className="text-[9.5px] font-bold uppercase tracking-wider text-emerald-700">
                            · {isEn ? "Stacked" : "Cumulat"}
                          </span>
                        )}
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

                {/* Order Summary Breakdown */}
                <div className="mt-4 pt-4 border-t border-zinc-200/80 space-y-2 text-[12px] tabular-nums">
                  <h4 className="text-[11px] font-black uppercase tracking-[0.14em] text-[#111111] mb-2">
                    {isEn ? "ORDER SUMMARY" : "SUMAR COMANDĂ"}
                  </h4>

                  <div className="flex justify-between text-zinc-600">
                    <span>{isEn ? "Sub Total" : "Subtotal"}</span>
                    <span className="font-semibold text-[#111111]">{formatPrice(subtotal, currency)}</span>
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between text-[#e32f8c] font-semibold">
                      <span>
                        {isEn
                          ? `Bundle (${totalItemsCount} items · -${bundlePercent}%)`
                          : `Reducere pachet (${totalItemsCount} prod. · -${bundlePercent}%)`}
                      </span>
                      <span>-{formatPrice(discount, currency)}</span>
                    </div>
                  )}

                  {appliedCoupon && couponDiscount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>{isEn ? `Promo (${appliedCoupon.code})` : `Cod (${appliedCoupon.code})`}</span>
                      <span>-{formatPrice(couponDiscount, currency)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-zinc-600">
                    <span>{isEn ? "Estimated Shipping" : "Livrare estimată"}</span>
                    {isFreeShippingUnlocked ? (
                      <span className="font-semibold text-emerald-700">
                        {isEn ? "Free" : "Gratuită"}
                      </span>
                    ) : (
                      <span className="text-zinc-500">
                        {isEn ? "Calculated at checkout" : "La pasul următor"}
                      </span>
                    )}
                  </div>

                  <div className="flex justify-between items-baseline pt-2 border-t border-zinc-200/80 text-[13.5px] font-black text-[#111111]">
                    <span>{isEn ? "Total" : "Total"}</span>
                    <span>{formatPrice(total, currency)}</span>
                  </div>
                </div>

                {hasPreorderInCart && !hasMixedOrder && (
                  <p className="mt-3 text-[11px] font-medium text-amber-700 flex items-center gap-1.5">
                    <Clock size={12} className="shrink-0" />
                    <span>
                      {isEn
                        ? "Pre-order ships automatically when the new production batch arrives."
                        : "Precomanda se expediază automat la sosirea noului lot."}
                    </span>
                  </p>
                )}
              </div>
            )}
          </ScrollArea>

          {/* ═══ ULTRA-SLIM STICKY CHECKOUT DOCK (GYMSHARK CLEAN + LIVE TOTAL) ═══ */}
          {items.length > 0 && (
            <div className="flex-shrink-0 px-5 sm:px-6 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] bg-white border-t border-zinc-200 z-20">
              <div className="flex items-center justify-between text-[11.5px] mb-2 tabular-nums">
                {totalSaved > 0 ? (
                  <span className="font-bold text-emerald-700">
                    {isEn
                      ? `Saving ${formatPrice(totalSaved, currency)} total`
                      : `Economisești ${formatPrice(totalSaved, currency)}`}
                  </span>
                ) : (
                  <span className="text-zinc-500">
                    {isEn ? "Shipping calculated at checkout" : "Livrarea calculată la checkout"}
                  </span>
                )}
                <span className="font-black text-[#111111]">
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
                  "w-full h-12 rounded-md font-black uppercase tracking-[0.12em] text-xs flex items-center justify-center gap-2 transition-colors",
                  hasMixedOrder
                    ? "bg-zinc-300 text-zinc-500 cursor-not-allowed pointer-events-none"
                    : "bg-[#111111] hover:bg-[#e32f8c] text-white active:scale-[0.99] cursor-pointer"
                )}
              >
                <Lock className="w-3.5 h-3.5 shrink-0" strokeWidth={2.25} />
                {hasMixedOrder ? (
                  <span>{isEn ? "RESOLVE CART ABOVE" : "ALEGE TIPUL DE COMANDĂ"}</span>
                ) : (
                  <span className="tabular-nums">
                    {isEn
                      ? `CHECKOUT · ${formatPrice(total, currency)}`
                      : `FINALIZARE COMANDĂ · ${formatPrice(total, currency)}`}
                  </span>
                )}
              </button>

              <PaymentTrustMarks />
            </div>
          )}

          {/* ═══ MINIMALIST LIGHT VARIANT SELECTION MODAL ═══ */}
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
                  className="relative w-full max-w-[360px] bg-white border border-zinc-200 p-5 sm:p-6 shadow-2xl flex flex-col rounded-xl text-[#111111]"
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
                          <div className="w-[54px] h-[68px] bg-zinc-950 relative overflow-hidden shrink-0 rounded-md">
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
                            <h3 className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-zinc-400">
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

                        <div className="w-full bg-white border border-zinc-200 rounded-lg overflow-hidden flex flex-col text-left max-h-[min(460px,62vh)] overflow-y-auto custom-scrollbar divide-y divide-zinc-200">
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
                                        isSoldOut ? "font-semibold text-zinc-400" : "font-bold text-[#111111]"
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
                          className="mt-4 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400 hover:text-[#111111] transition-colors self-center cursor-pointer"
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
