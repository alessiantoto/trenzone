"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Check, Copy, ArrowRight, Mail, Clock } from "lucide-react";
import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import { validateCoupon } from "@/app/actions/coupons";
import { subscribeToNewsletter } from "@/app/actions/newsletter";
import { useCartStore } from "@/store/useCartStore";
import { getOptimizedImageUrl } from "@/lib/utils/imageProxy";
import { DEFAULT_PROMO_SETTINGS, ResolvedPromoConfig } from "@/lib/promo-config";
import toast from "react-hot-toast";

const STORAGE_COOLDOWN_KEY = "lastSeenTrenPromo";
const STORAGE_PRIZE_KEY = "tz_scratch_prize_v1";

interface ScratchPrize {
  code: string;
  discountPercent: number;
  expiresAt: string;
}

export function ScratchPromoPopup() {
  const [config, setConfig] = useState<ResolvedPromoConfig | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Scratch mode state
  const [prize, setPrize] = useState<ScratchPrize | null>(null);
  const [isGeneratingPrize, setIsGeneratingPrize] = useState(false);
  const [isScratched, setIsScratched] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isApplied, setIsApplied] = useState(false);

  // Fallback newsletter mode state (configurable from Admin)
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Scratch canvas refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const drawRequestedRef = useRef(false);
  const strokeCountRef = useRef(0);

  const locale = useLocale();
  const pathname = usePathname();
  const isRo = locale === "ro";

  const copy = config
    ? isRo
      ? config.ro
      : config.en
    : isRo
      ? DEFAULT_PROMO_SETTINGS.ro
      : DEFAULT_PROMO_SETTINGS.en;

  const pcBg = config?.image || DEFAULT_PROMO_SETTINGS.image;
  const mobileBg = config?.mobileImage || pcBg || DEFAULT_PROMO_SETTINGS.mobileImage;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname?.startsWith("/admin") || pathname?.includes("/checkout")) return;

    const { appliedCoupon } = useCartStore.getState();
    const hasReferral =
      localStorage.getItem("tz_referral_code") ||
      new URLSearchParams(window.location.search).has("ref");
    if (appliedCoupon || hasReferral) return;

    // Restore valid active scratch prize if user already won within 24h
    try {
      const savedRaw = localStorage.getItem(STORAGE_PRIZE_KEY);
      if (savedRaw) {
        const parsed: ScratchPrize = JSON.parse(savedRaw);
        if (parsed?.code && parsed?.expiresAt && new Date(parsed.expiresAt).getTime() > Date.now()) {
          // User already holds an active un-expired prize code; respect cooldown
        } else {
          localStorage.removeItem(STORAGE_PRIZE_KEY);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_PRIZE_KEY);
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      try {
        const res = await fetch("/api/promo-config", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data: ResolvedPromoConfig = await res.json();
        if (cancelled || !data.isActive) return;

        const cooldownMs = (data.cooldownHours || 24) * 60 * 60 * 1000;
        const lastSeen = localStorage.getItem(STORAGE_COOLDOWN_KEY);
        if (lastSeen && Date.now() - Number(lastSeen) < cooldownMs) return;

        setConfig(data);
        const delayMs = Math.max(1, data.delaySeconds || 6) * 1000;
        timer = setTimeout(() => {
          if (cancelled) return;
          const currentState = useCartStore.getState();
          if (currentState.appliedCoupon || localStorage.getItem("tz_referral_code")) {
            return;
          }
          setIsOpen(true);
        }, delayMs);
      } catch {
        // Silent fail
      }
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [pathname]);

  // Paint metallic pink-obsidian scratch foil onto canvas when popup opens
  const paintScratchFoil = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;

    // Dark obsidian metallic base gradient
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, "#150914");
    bgGrad.addColorStop(0.5, "#230b20");
    bgGrad.addColorStop(1, "#120711");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle diagonal decorative ribbons matching reference scratch foil
    ctx.strokeStyle = "rgba(227, 47, 140, 0.14)";
    ctx.lineWidth = 24;
    ctx.beginPath();
    ctx.moveTo(-20, h * 0.8);
    ctx.quadraticCurveTo(w * 0.45, h * 0.1, w + 20, h * 0.55);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(w * 0.25, -20);
    ctx.quadraticCurveTo(w * 0.7, h * 0.65, w * 0.9, h + 20);
    ctx.stroke();

    // Neon pink "SCRATCH HERE" / "RĂZUIEȘTE AICI" text with glow
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 18px Oswald, Impact, system-ui, sans-serif";
    ctx.shadowColor = "rgba(227, 47, 140, 0.95)";
    ctx.shadowBlur = 16;
    ctx.fillStyle = "#ff4fa8";
    ctx.fillText(copy.button || (isRo ? "RĂZUIEȘTE AICI" : "SCRATCH HERE"), w / 2, h / 2);
    ctx.restore();
  }, [copy.button, isRo]);

  useEffect(() => {
    if (!isOpen || isScratched || config?.mode === "newsletter") return;
    const id = requestAnimationFrame(() => paintScratchFoil());
    return () => cancelAnimationFrame(id);
  }, [isOpen, isScratched, config?.mode, paintScratchFoil]);

  const markSeen = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_COOLDOWN_KEY, String(Date.now()));
    }
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    markSeen();
  }, [markSeen]);

  // Fetch / generate unique 24h weighted coupon ONLY once user starts scratching
  const ensurePrizeGenerated = useCallback(async (): Promise<ScratchPrize | null> => {
    if (prize) return prize;
    if (drawRequestedRef.current) return null;
    drawRequestedRef.current = true;
    setIsGeneratingPrize(true);

    try {
      const savedRaw = localStorage.getItem(STORAGE_PRIZE_KEY);
      if (savedRaw) {
        const parsed: ScratchPrize = JSON.parse(savedRaw);
        if (parsed?.code && new Date(parsed.expiresAt).getTime() > Date.now()) {
          setPrize(parsed);
          setIsGeneratingPrize(false);
          return parsed;
        }
      }
    } catch {}

    try {
      const res = await fetch("/api/promo-scratch", {
        method: "POST",
        cache: "no-store",
      });
      const json = await res.json();
      if (json.success && json.code) {
        const generated: ScratchPrize = {
          code: json.code,
          discountPercent: json.discountPercent,
          expiresAt: json.expiresAt,
        };
        setPrize(generated);
        try {
          localStorage.setItem(STORAGE_PRIZE_KEY, JSON.stringify(generated));
        } catch {}
        markSeen();
        return generated;
      }
    } catch {
      // ignore
    } finally {
      setIsGeneratingPrize(false);
    }
    return null;
  }, [prize, markSeen]);

  const checkScratchedProgress = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || isScratched) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    try {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let cleared = 0;
      const step = 16; // sample every 4th pixel (4 * 4 channels) for crisp 60fps
      let sampled = 0;
      for (let i = 3; i < imgData.length; i += step) {
        sampled++;
        if (imgData[i] < 128) cleared++;
      }
      if (sampled > 0 && cleared / sampled >= 0.34) {
        setIsScratched(true);
      }
    } catch {
      // ignore
    }
  }, [isScratched]);

  const scratchAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || isScratched) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = canvas.width / Math.max(1, rect.width);
    const x = (clientX - rect.left) * dpr;
    const y = (clientY - rect.top) * dpr;

    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 34 * dpr;

    if (lastPointRef.current) {
      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, 17 * dpr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    lastPointRef.current = { x, y };
    strokeCountRef.current += 1;
    if (strokeCountRef.current % 6 === 0) {
      checkScratchedProgress();
    }
  };

  const handleInstantReveal = async () => {
    await ensurePrizeGenerated();
    setIsScratched(true);
    markSeen();
  };

  const activeCode = prize?.code || config?.couponCode || DEFAULT_PROMO_SETTINGS.couponId;

  const handleApplyCode = async (targetCode: string, closeAfter: boolean = false) => {
    const { setCoupon } = useCartStore.getState();
    try {
      const res = await validateCoupon(targetCode, 999999, "RON", locale);
      if (res.isValid && res.coupon) {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("tz_manual_coupon_override", "1");
          localStorage.removeItem("tz_referral_code");
        }
        setCoupon(res.coupon);
        setIsApplied(true);
        toast.success(
          isRo
            ? `Codul ${targetCode} a fost aplicat automat în coș!`
            : `Code ${targetCode} applied to your cart!`
        );
        if (closeAfter) {
          setIsOpen(false);
          markSeen();
        }
        return true;
      }
      toast.error(res.message || (isRo ? "Codul promoțional nu este activ." : "Promo code is unavailable."));
    } catch {
      toast.error(isRo ? "Eroare la aplicarea codului." : "Failed to apply promo code.");
    }
    return false;
  };

  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(activeCode);
    }
    setIsCopied(true);
    toast.success(isRo ? `Codul ${activeCode} a fost copiat!` : `Code ${activeCode} copied!`);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsSubmitting(true);
    try {
      await subscribeToNewsletter(undefined, email.trim(), isRo ? "ro" : "en", "promo_popup");
    } catch {}
    await handleApplyCode(activeCode, false);
    setIsUnlocked(true);
    markSeen();
    setIsSubmitting(false);
  };

  // Split title cleanly so second half gets neon pink accent (matching TRY YOUR [LUCK])
  const titleWords = (copy.title || "").trim().split(/\s+/);
  const splitIdx = Math.max(1, Math.ceil(titleWords.length * 0.6));
  const titleFirst = titleWords.slice(0, splitIdx).join(" ");
  const titleAccent = titleWords.slice(splitIdx).join(" ");

  return (
    <AnimatePresence>
      {isOpen && config && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-3.5 sm:p-6 bg-black/80 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label={copy.title}
        >
          <div className="absolute inset-0" onClick={handleClose} />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="relative z-10 w-full max-w-[390px] md:max-w-[780px] min-h-[600px] md:min-h-[440px] max-h-[92dvh] overflow-hidden rounded-[26px] border border-white/15 bg-[#07070b] shadow-[0_32px_90px_-16px_rgba(0,0,0,0.95),0_0_60px_-18px_rgba(227,47,140,0.35)] flex flex-col md:flex-row"
          >
            {/* DESKTOP BACKGROUND (Landscape diagonal split + products right) */}
            <img
              src={getOptimizedImageUrl(pcBg)}
              alt=""
              className="pointer-events-none hidden md:block absolute inset-0 h-full w-full object-cover object-center"
            />
            {/* MOBILE BACKGROUND (Portrait diagonal split + products bottom) */}
            <img
              src={getOptimizedImageUrl(mobileBg)}
              alt=""
              className="pointer-events-none md:hidden absolute inset-0 h-full w-full object-cover object-bottom"
            />

            {/* Subtle top/left readability scrim so foreground copy always pops cleanly */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#07070b]/85 via-[#07070b]/45 to-transparent md:bg-gradient-to-r md:from-[#07070b]/85 md:via-[#07070b]/35 md:to-transparent" />

            {/* CLOSE BUTTON */}
            <button
              type="button"
              onClick={handleClose}
              className="absolute top-4 right-4 z-30 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/65 text-zinc-200 backdrop-blur-md transition-all hover:border-white/35 hover:bg-black/85 hover:text-white active:scale-95"
              aria-label={isRo ? "Închide" : "Close"}
            >
              <X className="h-4 w-4" />
            </button>

            {/* FOREGROUND ZONE: Left ~48% on PC, Top ~60% on Mobile */}
            <div className="relative z-20 w-full md:w-[48%] px-5 pt-6 pb-52 sm:pb-56 md:px-8 md:py-8 flex flex-col items-center justify-center text-center">
              {/* Brand Mark */}
              <img
                src="/images/logos/trenzone_logo_transparent.png"
                alt="TrenZone"
                className="h-7 sm:h-8 w-auto object-contain opacity-90 mb-3"
              />

              {/* Pill Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1 backdrop-blur-md mb-3">
                <span className="h-1.5 w-1.5 rounded-full bg-[#e32f8c] animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-200">
                  {copy.badge}
                </span>
              </div>

              {/* Headline */}
              <h2 className="font-[family-name:var(--font-oswald)] text-[34px] sm:text-[40px] md:text-[42px] font-black uppercase leading-[0.95] tracking-tight text-white">
                {titleFirst}{" "}
                {titleAccent && <span className="text-[#e32f8c] block sm:inline">{titleAccent}</span>}
              </h2>

              {config.mode === "scratch" ? (
                <>
                  <p className="mt-2.5 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-300 flex items-center justify-center gap-2">
                    <span className="text-[#e32f8c]">↓</span>
                    <span>{isRo ? "RĂZUIEȘTE PENTRU PREMIU" : "SCRATCH FOR PRIZE"}</span>
                    <span className="text-[#e32f8c]">↓</span>
                  </p>

                  {/* INTERACTIVE SCRATCH CARD CONTAINER */}
                  <div className="relative mt-4 w-full max-w-[300px] h-[142px] rounded-2xl border border-[#e32f8c]/45 bg-[#0e0a12]/95 shadow-[0_0_36px_-10px_rgba(227,47,140,0.5)] overflow-hidden select-none">
                    {/* UNDERNEATH REVEALED PRIZE */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-3.5 text-center">
                      {prize ? (
                        <>
                          <div className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-[#ff6eb6]">
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>
                              -{prize.discountPercent}% {isRo ? "REDUCERE UNICĂ" : "UNIQUE DISCOUNT"}
                            </span>
                          </div>

                          <div className="mt-1.5 flex items-center gap-2">
                            <span className="font-mono text-xl font-black tracking-[0.16em] text-white bg-white/[0.06] border border-white/15 px-3 py-1 rounded-lg">
                              {prize.code}
                            </span>
                            <button
                              type="button"
                              onClick={handleCopy}
                              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                              aria-label={isRo ? "Copiază codul" : "Copy code"}
                            >
                              {isCopied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                            </button>
                          </div>

                          <div className="mt-2 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleApplyCode(prize.code, true)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[#e32f8c] hover:bg-[#f03f99] px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider text-white shadow-md transition-all active:scale-95"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>{isApplied ? (isRo ? "Aplicat!" : "Applied!") : isRo ? "Aplică în Coș" : "Apply Now"}</span>
                            </button>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-400">
                              <Clock className="h-3 w-3 text-[#e32f8c]" />
                              24h
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 text-zinc-400">
                          <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#e32f8c] border-t-transparent" />
                          <span className="text-[11px] font-bold uppercase tracking-wider">
                            {isGeneratingPrize
                              ? isRo
                                ? "Se generează codul..."
                                : "Generating code..."
                              : isRo
                                ? "Răzuiește pentru 3%–7%"
                                : "Scratch to win 3%–7%"}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* TOP SCRATCHABLE FOIL CANVAS */}
                    {!isScratched && (
                      <canvas
                        ref={canvasRef}
                        onPointerDown={(e) => {
                          e.currentTarget.setPointerCapture(e.pointerId);
                          isDrawingRef.current = true;
                          lastPointRef.current = null;
                          ensurePrizeGenerated();
                          scratchAt(e.clientX, e.clientY);
                        }}
                        onPointerMove={(e) => {
                          if (!isDrawingRef.current) return;
                          scratchAt(e.clientX, e.clientY);
                        }}
                        onPointerUp={() => {
                          isDrawingRef.current = false;
                          lastPointRef.current = null;
                          checkScratchedProgress();
                        }}
                        onPointerCancel={() => {
                          isDrawingRef.current = false;
                          lastPointRef.current = null;
                        }}
                        className="absolute inset-0 h-full w-full cursor-crosshair touch-none z-10"
                      />
                    )}
                  </div>

                  {/* Subtle accessibility fallback / instruction */}
                  {!isScratched ? (
                    <button
                      type="button"
                      onClick={handleInstantReveal}
                      className="mt-3 text-[11px] font-semibold text-zinc-400 hover:text-white transition-colors"
                    >
                      {copy.skipLink || (isRo ? "Dezvăluie instant" : "Reveal instantly")} →
                    </button>
                  ) : (
                    <p className="mt-2.5 text-[11px] text-zinc-400">
                      {isRo
                        ? "Cod de o singură utilizare · expiră automat în 24h"
                        : "Single-use unique code · expires in 24h"}
                    </p>
                  )}
                </>
              ) : !isUnlocked ? (
                <form onSubmit={handleNewsletterSubmit} className="mt-4 w-full max-w-[300px] space-y-2.5">
                  <p className="text-xs text-zinc-300 leading-relaxed mb-2">{copy.description}</p>
                  <div className="relative flex items-center">
                    <Mail className="pointer-events-none absolute left-3.5 h-4 w-4 text-zinc-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={isRo ? "Introdu emailul tău..." : "Enter your email..."}
                      className="h-11 w-full rounded-xl border border-white/15 bg-black/60 pl-10 pr-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-[#e32f8c]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#e32f8c] text-xs font-black uppercase tracking-[0.14em] text-white shadow-lg"
                  >
                    <span>{copy.button}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              ) : (
                <div className="mt-4 w-full max-w-[300px] rounded-2xl border border-dashed border-[#e32f8c]/60 bg-black/65 p-4 text-center">
                  <p className="text-xs text-zinc-300 mb-2">{copy.unlockedDescription}</p>
                  <div className="font-mono text-xl font-black tracking-[0.2em] text-[#ff6eb6]">{activeCode}</div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
