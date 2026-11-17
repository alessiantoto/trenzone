"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Copy, ArrowRight, Mail, Loader2 } from "lucide-react";
import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import { validateCoupon } from "@/app/actions/coupons";
import { subscribeToNewsletter } from "@/app/actions/newsletter";
import { useCartStore } from "@/store/useCartStore";
import { getOptimizedImageUrl } from "@/lib/utils/imageProxy";
import { getCdnUrl } from "@/lib/utils/cdn";
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
  const [isApplying, setIsApplying] = useState(false);

  // Fallback newsletter mode state (configurable from Admin)
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Scratch canvas refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef(false);
  const hasStartedScratchingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const canvasSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const scratchGridRef = useRef<Uint8Array>(new Uint8Array(16 * 8));
  const coveredCountRef = useRef(0);
  const drawRequestedRef = useRef(false);

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

    // 1. Check 24h cooldown FIRST before hitting /api/promo-config (saves ~100k+ requests/mo)
    const defaultCooldownMs = (DEFAULT_PROMO_SETTINGS.cooldownHours || 24) * 60 * 60 * 1000;
    const lastSeenRaw = localStorage.getItem(STORAGE_COOLDOWN_KEY);
    if (lastSeenRaw && Date.now() - Number(lastSeenRaw) < defaultCooldownMs) return;

    // Restore valid active scratch prize if user already won within 24h
    try {
      const savedRaw = localStorage.getItem(STORAGE_PRIZE_KEY);
      if (savedRaw) {
        const parsed: ScratchPrize = JSON.parse(savedRaw);
        if (parsed?.code && parsed?.expiresAt && new Date(parsed.expiresAt).getTime() > Date.now()) {
          // User already holds an active un-expired prize code; skip popup
          return;
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
        let data: ResolvedPromoConfig | null = null;
        const SESSION_CFG_KEY = "tz_promo_cfg_v1";
        try {
          const cachedRaw = sessionStorage.getItem(SESSION_CFG_KEY);
          if (cachedRaw) {
            const parsed = JSON.parse(cachedRaw);
            if (parsed?.ts && Date.now() - parsed.ts < 15 * 60 * 1000 && parsed?.data) {
              data = parsed.data;
            }
          }
        } catch {}

        if (!data) {
          const res = await fetch("/api/promo-config");
          if (!res.ok || cancelled) return;
          data = await res.json();
          try {
            sessionStorage.setItem(SESSION_CFG_KEY, JSON.stringify({ ts: Date.now(), data }));
          } catch {}
        }

        if (cancelled || !data?.isActive) return;

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
  }, []);

  // Paint metallic pink-obsidian scratch foil onto canvas (only before user scratches so user progress is never wiped)
  const paintScratchFoil = useCallback(
    (force = false) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      if (!force && hasStartedScratchingRef.current) return;

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w === 0 || h === 0) return;

      // Avoid redundant repaint/reset when dimensions haven't changed
      if (!force && canvasSizeRef.current.w === w && canvasSizeRef.current.h === h) return;

      canvasSizeRef.current = { w, h };
      scratchGridRef.current.fill(0);
      coveredCountRef.current = 0;
      if (progressBarRef.current) {
        progressBarRef.current.style.transform = "scaleX(0)";
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Dark obsidian metallic base gradient
      const bgGrad = ctx.createLinearGradient(0, 0, w, h);
      bgGrad.addColorStop(0, "#170916");
      bgGrad.addColorStop(0.5, "#280c24");
      bgGrad.addColorStop(1, "#120711");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Brushed foil diagonal sheen
      const sheen = ctx.createLinearGradient(0, 0, w, 0);
      sheen.addColorStop(0, "rgba(255,255,255,0)");
      sheen.addColorStop(0.45, "rgba(255,255,255,0.06)");
      sheen.addColorStop(0.55, "rgba(227,47,140,0.10)");
      sheen.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = sheen;
      ctx.fillRect(0, 0, w, h);

      // Subtle diagonal decorative ribbons matching reference scratch foil
      ctx.strokeStyle = "rgba(227, 47, 140, 0.16)";
      ctx.lineWidth = 24;
      ctx.beginPath();
      ctx.moveTo(-20, h * 0.8);
      ctx.quadraticCurveTo(w * 0.45, h * 0.1, w + 20, h * 0.55);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(w * 0.25, -20);
      ctx.quadraticCurveTo(w * 0.7, h * 0.65, w * 0.9, h + 20);
      ctx.stroke();

      // Dashed inner scratch frame hint
      ctx.save();
      ctx.strokeStyle = "rgba(255, 79, 168, 0.25)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(10, 10, w - 20, h - 20);
      ctx.restore();

      // Neon pink "SCRATCH HERE" / "RĂZUIEȘTE AICI" text with glow
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "900 18px Oswald, Impact, system-ui, sans-serif";
      ctx.shadowColor = "rgba(227, 47, 140, 0.95)";
      ctx.shadowBlur = 14;
      ctx.fillStyle = "#ff4fa8";
      ctx.fillText(copy.button || (isRo ? "RĂZUIEȘTE AICI" : "SCRATCH HERE"), w / 2, h / 2 - 8);
      ctx.shadowBlur = 0;
      ctx.font = "700 10px Inter, system-ui, sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
      ctx.fillText(isRo ? "Glisează pentru a dezvălui" : "Swipe to reveal", w / 2, h / 2 + 14);
      ctx.restore();
    },
    [copy.button, isRo]
  );

  useEffect(() => {
    if (!isOpen) {
      hasStartedScratchingRef.current = false;
      canvasSizeRef.current = { w: 0, h: 0 };
      return;
    }
    if (isScratched || config?.mode === "newsletter") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rafId = requestAnimationFrame(() => paintScratchFoil());
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        if (!hasStartedScratchingRef.current) {
          paintScratchFoil();
        }
      });
      ro.observe(canvas);
    }

    return () => {
      cancelAnimationFrame(rafId);
      ro?.disconnect();
    };
  }, [isOpen, isScratched, config?.mode, paintScratchFoil]);

  // Body scroll lock & Escape handler while popup is open
  useEffect(() => {
    if (!isOpen || !config) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_COOLDOWN_KEY, String(Date.now()));
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, config]);

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

  // 0ms spatial grid progress tracking (no CPU-GPU getImageData readback stalls)
  const GRID_COLS = 16;
  const GRID_ROWS = 8;
  const UNLOCK_THRESHOLD = 0.42;

  const markGridArea = (normX: number, normY: number, brushRadiusX: number, brushRadiusY: number) => {
    const grid = scratchGridRef.current;
    const minC = Math.max(0, Math.floor((normX - brushRadiusX) * GRID_COLS));
    const maxC = Math.min(GRID_COLS - 1, Math.floor((normX + brushRadiusX) * GRID_COLS));
    const minR = Math.max(0, Math.floor((normY - brushRadiusY) * GRID_ROWS));
    const maxR = Math.min(GRID_ROWS - 1, Math.floor((normY + brushRadiusY) * GRID_ROWS));

    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        const idx = r * GRID_COLS + c;
        if (grid[idx] === 0) {
          grid[idx] = 1;
          coveredCountRef.current += 1;
        }
      }
    }
  };

  const updateScratchProgressUI = () => {
    const ratio = coveredCountRef.current / (GRID_COLS * GRID_ROWS);
    const barFraction = Math.min(1, ratio / UNLOCK_THRESHOLD);
    if (progressBarRef.current) {
      progressBarRef.current.style.transform = `scaleX(${barFraction})`;
    }
    if (!isScratched && ratio >= UNLOCK_THRESHOLD) {
      setIsScratched(true);
      try {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(25);
        }
      } catch {}
    }
  };

  const scratchPoints = (points: Array<{ x: number; y: number }>) => {
    const canvas = canvasRef.current;
    if (!canvas || isScratched || points.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const brushDiameterCss = 46;
    const brushRadiusCss = brushDiameterCss / 2;
    const normRx = brushRadiusCss / rect.width;
    const normRy = brushRadiusCss / rect.height;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = brushDiameterCss * Math.max(scaleX, scaleY);

    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      const cx = (pt.x - rect.left) * scaleX;
      const cy = (pt.y - rect.top) * scaleY;
      const normX = (pt.x - rect.left) / rect.width;
      const normY = (pt.y - rect.top) / rect.height;

      if (lastPointRef.current) {
        const prev = lastPointRef.current;
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(cx, cy);
        ctx.stroke();

        // Sample intermediate points along fast segments so grid coverage never skips
        const dx = cx - prev.x;
        const dy = cy - prev.y;
        const dist = Math.hypot(dx, dy);
        const steps = Math.min(12, Math.max(1, Math.ceil(dist / (brushRadiusCss * 0.8))));
        for (let s = 1; s <= steps; s++) {
          const ix = prev.x + (dx * s) / steps;
          const iy = prev.y + (dy * s) / steps;
          markGridArea(ix / canvas.width, iy / canvas.height, normRx, normRy);
        }
      } else {
        ctx.beginPath();
        ctx.arc(cx, cy, (brushDiameterCss / 2) * Math.max(scaleX, scaleY), 0, Math.PI * 2);
        ctx.fill();
        markGridArea(normX, normY, normRx, normRy);
      }

      lastPointRef.current = { x: cx, y: cy };
    }

    ctx.restore();
    updateScratchProgressUI();
  };

  const handleInstantReveal = async () => {
    setIsScratched(true);
    if (progressBarRef.current) {
      progressBarRef.current.style.transform = "scaleX(1)";
    }
    markSeen();
    await ensurePrizeGenerated();
  };

  const activeCode = prize?.code || config?.couponCode || DEFAULT_PROMO_SETTINGS.couponId;

  const handleApplyCode = async (targetCode: string, closeAfter: boolean = false) => {
    if (isApplying) return false;
    setIsApplying(true);
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
    } finally {
      setIsApplying(false);
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
    if (isSubmitting || !email.trim()) return;
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
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: "spring", damping: 32, stiffness: 420, mass: 0.8 }}
            className="relative z-10 w-full max-w-[390px] md:max-w-[780px] min-h-[540px] sm:min-h-[600px] md:min-h-[440px] max-h-[92dvh] overflow-x-clip overflow-y-auto md:overflow-hidden rounded-[26px] border border-white/15 bg-[#07070b] shadow-[0_32px_90px_-16px_rgba(0,0,0,0.95),0_0_60px_-18px_rgba(227,47,140,0.35)] flex flex-col md:flex-row transform-gpu"
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
              className="absolute top-3.5 right-3.5 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/75 text-zinc-200 transition-colors hover:border-white/35 hover:bg-black/90 hover:text-white active:scale-95 cursor-pointer"
              aria-label={isRo ? "Închide" : "Close"}
            >
              <X className="h-4 w-4" />
            </button>

            {/* FOREGROUND ZONE: Left ~48% on PC, Top ~60% on Mobile */}
            <div className="relative z-20 w-full md:w-[48%] px-5 pt-6 pb-52 sm:pb-56 md:px-8 md:py-8 flex flex-col items-center justify-center text-center">
              {/* Brand Mark */}
              <img
                src={getCdnUrl("/images/logos/trenzone_logo_transparent.png")}
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
                          <div className="text-[12px] font-black uppercase tracking-[0.16em] text-[#ff6eb6]">
                            -{prize.discountPercent}% {isRo ? "REDUCERE" : "OFF"}
                          </div>

                          <div className="mt-2 flex items-center justify-center gap-1.5 w-full">
                            <span className="font-mono text-base sm:text-[17px] font-black tracking-[0.1em] text-white bg-white/[0.06] border border-white/15 px-3 py-1.5 rounded-lg whitespace-nowrap">
                              {prize.code}
                            </span>
                            <button
                              type="button"
                              onClick={handleCopy}
                              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all active:scale-[0.98] shrink-0 cursor-pointer"
                              aria-label={isRo ? "Copiază codul" : "Copy code"}
                            >
                              {isCopied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                            </button>
                          </div>

                          <div className="mt-2.5 flex items-center justify-center">
                            <button
                              type="button"
                              disabled={isApplying}
                              onClick={() => handleApplyCode(prize.code, true)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[#e32f8c] hover:bg-[#f03f99] px-4 py-1.5 text-[11px] font-black uppercase tracking-wider text-white shadow-md transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                            >
                              {isApplying ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                                  <span>{isRo ? "Se aplică..." : "Applying..."}</span>
                                </>
                              ) : (
                                <>
                                  <Check className="h-3.5 w-3.5 shrink-0" />
                                  <span>{isApplied ? (isRo ? "Aplicat!" : "Applied!") : isRo ? "Aplică în Coș" : "Apply Now"}</span>
                                </>
                              )}
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-2.5 w-full">
                          <div className="h-3 w-24 rounded bg-[#e32f8c]/25 animate-pulse" />
                          <div className="h-8 w-40 rounded-lg bg-white/10 animate-pulse" />
                          <div className="h-7 w-28 rounded-lg bg-[#e32f8c]/25 animate-pulse" />
                        </div>
                      )}
                    </div>

                    {/* TOP SCRATCHABLE FOIL CANVAS (Smooth dissolve when unlocked, 120Hz coalesced input) */}
                    <canvas
                      ref={canvasRef}
                      onPointerDown={(e) => {
                        if (isScratched) return;
                        e.preventDefault();
                        e.stopPropagation();
                        try {
                          e.currentTarget.setPointerCapture(e.pointerId);
                        } catch {}
                        isDrawingRef.current = true;
                        hasStartedScratchingRef.current = true;
                        lastPointRef.current = null;
                        ensurePrizeGenerated();
                        scratchPoints([{ x: e.clientX, y: e.clientY }]);
                      }}
                      onPointerMove={(e) => {
                        if (!isDrawingRef.current || isScratched) return;
                        e.preventDefault();
                        const coalesced = (e.nativeEvent as PointerEvent).getCoalescedEvents?.();
                        const pts =
                          coalesced && coalesced.length > 0
                            ? coalesced.map((ev) => ({ x: ev.clientX, y: ev.clientY }))
                            : [{ x: e.clientX, y: e.clientY }];
                        scratchPoints(pts);
                      }}
                      onPointerUp={() => {
                        isDrawingRef.current = false;
                        lastPointRef.current = null;
                      }}
                      onPointerCancel={() => {
                        isDrawingRef.current = false;
                        lastPointRef.current = null;
                      }}
                      onLostPointerCapture={() => {
                        isDrawingRef.current = false;
                        lastPointRef.current = null;
                      }}
                      className={`absolute inset-0 h-full w-full touch-none select-none z-10 transition-all duration-500 ease-out ${
                        isScratched
                          ? "opacity-0 scale-105 pointer-events-none"
                          : "opacity-100 cursor-grab active:cursor-grabbing"
                      }`}
                    />

                    {/* Subtle GPU scratch progress bar along bottom edge */}
                    <div
                      className={`pointer-events-none absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-20 transition-opacity duration-300 ${
                        isScratched ? "opacity-0" : "opacity-100"
                      }`}
                    >
                      <div
                        ref={progressBarRef}
                        style={{ transform: "scaleX(0)" }}
                        className="h-full w-full origin-left bg-gradient-to-r from-[#e32f8c] to-[#ff7fc0] transition-transform duration-75"
                      />
                    </div>
                  </div>

                  {/* Subtle accessibility fallback / instruction */}
                  {!isScratched ? (
                    <button
                      type="button"
                      disabled={isGeneratingPrize}
                      onClick={handleInstantReveal}
                      className="mt-3 text-[11px] font-semibold text-zinc-400 hover:text-white transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                    >
                      {isGeneratingPrize
                        ? (isRo ? "Se dezvăluie..." : "Revealing...")
                        : `${copy.skipLink || (isRo ? "Dezvăluie instant" : "Reveal instantly")} →`}
                    </button>
                  ) : (
                    <p className="mt-2.5 text-[11px] text-zinc-400">
                      {isRo
                        ? "Valabil 24h · o singură utilizare"
                        : "Valid 24h · single use"}
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
                      disabled={isSubmitting}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={isRo ? "Introdu emailul tău..." : "Enter your email..."}
                      className="h-11 w-full rounded-xl border border-white/15 bg-black/60 pl-10 pr-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-[#e32f8c]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting || !email.trim()}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#e32f8c] hover:bg-[#ff3b9e] text-xs font-black uppercase tracking-[0.14em] text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                        <span>{isRo ? "Se deblochează..." : "Unlocking..."}</span>
                      </>
                    ) : (
                      <>
                        <span>{copy.button}</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
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
