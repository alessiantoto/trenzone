"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, ArrowRight, Loader2, ImageIcon } from "lucide-react";
import Image from "next/image";
import { useLocale } from "next-intl";
import { useCartStore } from "@/store/useCartStore";
import { subscribeToNewsletter } from "@/app/actions/newsletter";
import { validateCoupon } from "@/app/actions/coupons";
import toast from "react-hot-toast";

export function ScratchPromoPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [couponCode] = useState("VLADTREN10");
  const locale = useLocale();
  const isRo = locale === "ro";

  // Check if we should display the popup
  useEffect(() => {
    const { appliedCoupon } = useCartStore.getState();
    const hasReferralStored = typeof window !== "undefined" && localStorage.getItem("tz_referral_code");
    if (appliedCoupon || hasReferralStored) {
      return;
    }

    const lastSeenStr = localStorage.getItem("lastSeenTrenPromo");
    if (lastSeenStr) {
      const lastSeen = parseInt(lastSeenStr, 10);
      const hoursSince = (Date.now() - lastSeen) / (1000 * 60 * 60);
      if (hoursSince < 3) return; // Wait 3 hours between impressions
    }

    const consent = localStorage.getItem("campion_consent");
    if (consent) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 9000);
      return () => clearTimeout(timer);
    } else {
      const handleConsentUpdated = () => {
        setTimeout(() => {
          setIsOpen(true);
        }, 9000);
      };
      window.addEventListener("consent_updated", handleConsentUpdated);
      return () => window.removeEventListener("consent_updated", handleConsentUpdated);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem("lastSeenTrenPromo", Date.now().toString());
  };

  // Lock body scroll when popup is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.overscrollBehavior = "none";
    } else {
      document.body.style.overflow = "";
      document.body.style.overscrollBehavior = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.overscrollBehavior = "";
    };
  }, [isOpen]);

  const copyCode = () => {
    navigator.clipboard.writeText(couponCode);
    setIsCopied(true);
    toast.success(isRo ? "Codul VLADTREN10 a fost copiat!" : "Code VLADTREN10 copied!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleApplyCoupon = async () => {
    const { setCoupon } = useCartStore.getState();
    try {
      const res = await validateCoupon(couponCode, 999999, "RON");
      if (res.isValid && res.coupon) {
        setCoupon(res.coupon);
        return;
      }
    } catch {
      // ignore and fall through
    }
    setCoupon({
      id: "vladtren10",
      code: couponCode,
      description: "10% Launch Discount",
      type: "percentage",
      value: 10,
      min_purchase: null,
      max_discount: null,
      starts_at: null,
      expires_at: null,
      usage_limit: null,
      used_count: 0,
      is_active: true,
      is_stackable: false,
      created_at: new Date().toISOString()
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        await subscribeToNewsletter(undefined, email, locale as any, "promo-popup");
      }
      await handleApplyCoupon();
      setIsUnlocked(true);
      toast.success(isRo ? "Reducerea de 10% a fost activată!" : "10% discount activated!");
    } catch {
      await handleApplyCoupon();
      setIsUnlocked(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDirectUnlock = async () => {
    await handleApplyCoupon();
    setIsUnlocked(true);
    toast.success(isRo ? "Codul a fost activat în coș!" : "Code applied to your cart!");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Clean Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", damping: 26, stiffness: 260 }}
            className="relative w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.85)] overflow-hidden z-10 my-auto flex flex-col sm:flex-row"
          >
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 z-30 w-9 h-9 rounded-full bg-black/60 hover:bg-white/20 text-white flex items-center justify-center transition-all backdrop-blur-md border border-white/10 active:scale-95 cursor-pointer"
              aria-label="Închide"
            >
              <X className="w-4 h-4" />
            </button>

            {/* ═══ CLEAN PHOTO SLOT (Pus de utilizator) ═══ */}
            <div className="relative sm:w-1/2 min-h-[190px] sm:min-h-[380px] bg-zinc-900 overflow-hidden shrink-0">
              {!imageError ? (
                <Image
                  src="/images/lifestyle/promo-hero.png"
                  alt="Vlad Tren"
                  fill
                  sizes="(max-width: 640px) 100vw, 360px"
                  className="object-cover"
                  onError={() => setImageError(true)}
                  priority
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-zinc-900 to-black border-b sm:border-b-0 sm:border-r border-white/5">
                  <div className="w-12 h-12 rounded-2xl bg-[#e32f8c]/10 border border-[#e32f8c]/20 flex items-center justify-center mb-3">
                    <ImageIcon className="w-6 h-6 text-[#e32f8c]" />
                  </div>
                  <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest font-[family-name:var(--font-oswald)]">
                    Loc pentru Poză
                  </span>
                  <span className="text-[10px] text-zinc-500 mt-1">
                    /images/lifestyle/promo-hero.png
                  </span>
                </div>
              )}
              {/* Subtle edge vignette */}
              <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-transparent via-transparent to-zinc-950/40 pointer-events-none" />
            </div>

            {/* ═══ CLEAN, SPACIOUS CONTENT ═══ */}
            <div className="flex-1 p-6 sm:p-8 flex flex-col justify-center">
              {!isUnlocked ? (
                <form onSubmit={handleSubmit} className="flex flex-col">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#e32f8c] font-[family-name:var(--font-oswald)] block mb-1">
                    {isRo ? "OFERTĂ LIMITATĂ" : "LIMITED OFFER"}
                  </span>

                  <h3 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tight leading-tight font-[family-name:var(--font-oswald)] mb-2">
                    {isRo ? "10% REDUCERE" : "10% DISCOUNT"}
                  </h3>

                  <p className="text-xs text-zinc-400 leading-relaxed mb-5">
                    {isRo
                      ? "Abonează-te pentru acces și reducere de 10% la prima ta comandă de benzi de cot."
                      : "Subscribe to unlock a 10% discount on your first pair of elbow wraps."}
                  </p>

                  <div className="space-y-3 mb-3.5">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={isRo ? "Introdu emailul tău" : "Enter your email address"}
                      required
                      className="w-full bg-zinc-900/90 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#e32f8c] transition-colors"
                    />

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 px-5 rounded-xl bg-[#e32f8c] hover:bg-[#c41a72] text-white font-black uppercase text-xs tracking-wider transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[#e32f8c]/20 active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <span>{isRo ? "REVENDICĂ CODUL" : "CLAIM DISCOUNT"}</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleDirectUnlock}
                    className="text-[11px] text-zinc-500 hover:text-zinc-300 text-center transition-colors cursor-pointer py-1"
                  >
                    {isRo ? "Vreau direct codul de reducere →" : "Just give me the code →"}
                  </button>
                </form>
              ) : (
                <div className="flex flex-col text-center sm:text-left">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#e32f8c] font-[family-name:var(--font-oswald)] block mb-1">
                    {isRo ? "COD ACTIVAT" : "CODE ACTIVATED"}
                  </span>

                  <h3 className="text-2xl font-black uppercase text-white tracking-tight font-[family-name:var(--font-oswald)] mb-2">
                    {isRo ? "AI DEBLOCAT 10% OFF" : "10% OFF UNLOCKED"}
                  </h3>

                  <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                    {isRo
                      ? "Reducerea de 10% a fost aplicată automat în coșul tău."
                      : "Your 10% discount has been applied directly to your cart."}
                  </p>

                  <div className="p-3.5 rounded-xl bg-zinc-900 border border-dashed border-[#e32f8c]/50 flex items-center justify-between gap-3 mb-5">
                    <span className="text-lg font-black tracking-widest text-white font-[family-name:var(--font-oswald)] pl-1">
                      {couponCode}
                    </span>
                    <button
                      type="button"
                      onClick={copyCode}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? (isRo ? "Copiat" : "Copied") : (isRo ? "Copiază" : "Copy")}</span>
                    </button>
                  </div>

                  <a
                    href="/shop"
                    onClick={handleClose}
                    className="w-full py-3.5 px-5 rounded-xl bg-white hover:bg-[#e32f8c] text-black hover:text-white font-black uppercase text-xs tracking-wider transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 shadow-md text-center"
                  >
                    <span>{isRo ? "MERGI LA PRODUSE" : "SHOP WRAPS"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
