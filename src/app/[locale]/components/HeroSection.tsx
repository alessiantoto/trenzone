"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { StarRating } from "@/components/ui/StarRating";
import Image from "next/image";
import { useState, useEffect, useMemo } from "react";

interface HeroSectionProps {
  reviewStats: { count: number; average: number };
}

const HERO_IMAGES = [
  {
    url: "/images/lifestyle/jeleuri_banca_orizontal.webp",
    desktopVideo: "/videos/video_pepene_h264.mp4",
    alt: "TrenZone Gummies on Bench",
    title: "ODIN",
    titleSuffix: "MASS",
    taglineKey: "hero_slide_1_tagline",
    tagKey: "hero_tag_new",
    objectPosition: "center 40%",
  },
  {
    url: "/images/lifestyle/vlad_tren.webp",
    alt: "Premium Tren Wraps",
    title: "TREN",
    titleSuffix: "WRAPS",
    taglineKey: "hero_slide_2_tagline",
    tagKey: "hero_tag_pro",
    objectPosition: "center 30%",
  },
  {
    url: "/images/products/apolo_cutii_jeleuri.webp",
    alt: "Apolo Energy Gummies",
    title: "ENERGY",
    titleSuffix: "GUMMIES",
    taglineKey: "hero_slide_3_tagline",
    tagKey: "hero_tag_essentials",
    objectPosition: "center center",
  }
];

const SLIDE_DURATION = 6000;

export function HeroSection({ reviewStats }: HeroSectionProps) {
  const t = useTranslations("Home");
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % HERO_IMAGES.length);
    }, SLIDE_DURATION);
    return () => clearInterval(timer);
  }, []);

  const transition = useMemo(() => ({
    duration: 1.4,
    ease: [0.19, 1, 0.22, 1] as any // Super smooth editorial ease
  }), []);

  return (
    <section
      role="region"
      aria-roledescription="carousel"
      aria-label="TrenZone Hero"
      className="relative h-[100svh] md:h-screen min-h-[100svh] w-full overflow-hidden bg-[#050505] selection:bg-primary"
    >

      {/* 1. LAYERED DEPTH BACKGROUND */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`bg-${activeIdx}`}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={transition}
          className="absolute inset-0 z-0"
        >
          {/* Dynamic Background Watermark */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] select-none pointer-events-none z-0 overflow-hidden">
            <motion.span
              animate={{
                x: [0, 15, 0, -15, 0],
                y: [0, -10, 0, 10, 0]
              }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="text-[40vw] font-black italic tracking-tighter transform-gpu will-change-transform"
            >
              ODIN
            </motion.span>
          </div>

          {/* Desktop Video (if available) */}
          {HERO_IMAGES[activeIdx].desktopVideo && (
            <video
              src={HERO_IMAGES[activeIdx].desktopVideo}
              autoPlay
              muted
              loop
              playsInline
              className="hidden md:block absolute inset-0 w-full h-full object-cover contrast-[1.1] brightness-[0.55] transform-gpu transition-opacity duration-1000"
            />
          )}

          <Image
            src={HERO_IMAGES[activeIdx].url}
            alt={HERO_IMAGES[activeIdx].alt}
            fill
            priority
            fetchPriority="high"
            decoding="async"
            loading="eager"
            className={`object-cover contrast-[1.25] brightness-[0.65] transform-gpu transition-opacity duration-1000 ${HERO_IMAGES[activeIdx].desktopVideo ? 'md:hidden' : ''}`}
            style={{ objectPosition: HERO_IMAGES[activeIdx].objectPosition }}
            sizes="100vw"
          />

          {/* Cinematic Vignettes - Softened for better product visibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-[#050505]/20 z-[1] pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050505]/40 via-transparent to-[#050505]/40 z-[1] pointer-events-none" />
        </motion.div>
      </AnimatePresence>

      {/* 2. THE EDITORIAL GRID (Robust Vertical Spacing) */}
      <div className="container mx-auto px-6 md:px-16 z-10 relative h-full flex flex-col justify-between py-12 md:py-20 pointer-events-none">
        
        {/* Spacer for top symmetry if needed, or just let it be */}
        <div className="h-0" />

        {/* MAIN CONTENT LAYER (Centered in remaining space) */}
        <div className="relative z-10 w-full flex flex-col items-center text-center transform-gpu">
          <motion.div
            key={`tag-${activeIdx}`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...transition, delay: 0.1 }}
            className="flex items-center justify-center gap-4 mb-4 md:mb-8 lg:mb-12 transform-gpu"
          >
            <div className="h-[1px] w-12 bg-primary/20" />
            <span className="text-primary text-xs md:text-sm font-black tracking-[0.5em] uppercase px-3 py-1 border border-primary/20 backdrop-blur-md">
              {t(HERO_IMAGES[activeIdx].tagKey as any)}
            </span>
            <div className="h-[1px] w-12 bg-primary/20" />
          </motion.div>

          {/* Title Area */}
          <div className="mb-8 md:mb-12 lg:mb-16 transform-gpu flex flex-col items-center justify-center">
            <motion.h1
              key={`title-main-${activeIdx}`}
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.6, ease: [0.19, 1, 0.22, 1] }}
              className="text-white font-heading font-black text-6xl md:text-8xl lg:text-[140px] leading-[0.9] tracking-[-0.06em] uppercase italic will-change-transform"
            >
              {t(`hero_slide_${activeIdx + 1}_title` as any)} <br className="hidden md:block" />
              <span className="text-primary/90">{t(`hero_slide_${activeIdx + 1}_suffix` as any)}</span>
            </motion.h1>

            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent mt-8 md:mt-12 lg:mt-16 opacity-30 w-full max-w-2xl origin-center transform-gpu"
            />
          </div>

          {/* Subtitle & Buttons */}
          <div className="flex flex-col items-center justify-center gap-8 md:gap-12 max-w-4xl mx-auto transform-gpu">
            <div className="flex flex-col items-center">
              <p className="text-zinc-300 text-lg md:text-3xl font-heading font-medium tracking-tight uppercase italic leading-tight max-w-2xl animate-fade-in">
                {t(HERO_IMAGES[activeIdx].taglineKey as any)}
              </p>

              <div className="mt-8 md:mt-12 flex flex-col sm:flex-row gap-4 md:gap-6 justify-center w-full pointer-events-auto">
                <Link
                  href="/shop"
                  className="group relative flex items-center justify-center gap-8 px-10 py-5 bg-primary text-black font-black uppercase tracking-[0.3em] text-sm md:text-base transition-all hover:scale-[1.05] shadow-[0_30px_60px_rgba(249,115,22,0.3)] transform-gpu will-change-transform isolate"
                >
                  <span className="relative z-10">{t('hero_cta_shop')}</span>
                  <ArrowRight className="relative z-10 transition-transform group-hover:translate-x-2" />
                </Link>
                <Link
                  href="/bundle"
                  className="group flex items-center justify-center gap-4 px-10 py-5 rounded-none bg-transparent border border-white/10 text-white font-black uppercase tracking-[0.2em] text-sm md:text-base transition-all hover:bg-white/5 hover:border-white/20 transform-gpu will-change-transform isolate"
                >
                  {t('hero_cta_bundle')}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* 5. CENTERED SOCIAL & NAV HUD - Integrated in Flow */}
        <div className="flex flex-col items-center gap-6 w-full transform-gpu will-change-transform pb-4 md:pb-8">
          {/* Trust Scorecard */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 py-3 md:px-6 md:py-4 border border-white/5 bg-black/50 backdrop-blur-xl rounded-[2rem] flex items-center gap-4 md:gap-6 shadow-2xl overflow-hidden relative group scale-90 md:scale-100 transform-gpu will-change-transform pointer-events-auto"
          >
            <motion.div
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear", repeatDelay: 4 }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 transform-gpu"
            />

            <div className="flex items-center gap-3 border-r border-white/10 pr-6">
              <div className="relative transform-gpu">
                <StarRating rating={reviewStats.average} starClassName="text-primary fill-primary" size="sm" />
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full blur-[2px]"
                />
              </div>
              <span className="text-white font-black italic text-lg tracking-tighter">{reviewStats.average}</span>
            </div>

            <div className="flex items-center">
              <span className="text-white font-black text-[11px] md:text-[13px] tracking-tight uppercase italic text-shadow-sm whitespace-nowrap">
                {t('hero_trust_badge', { count: reviewStats.count })}
              </span>
            </div>
          </motion.div>

          {/* 6. MODERN DOT PAGINATION */}
          <div className="flex items-center gap-6 pointer-events-auto transform-gpu pb-2">
            {HERO_IMAGES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIdx(idx)}
                aria-label={t('hero_slide_nav', { number: idx + 1 })}
                className="relative flex items-center justify-center w-5 h-5 group transform-gpu"
              >
                <AnimatePresence>
                  {idx === activeIdx && (
                    <svg className="absolute inset-0 w-full h-full -rotate-90" shapeRendering="geometricPrecision">
                      <motion.circle
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: SLIDE_DURATION / 1000, ease: "linear" }}
                        cx="50%"
                        cy="50%"
                        r="40%"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="transparent"
                        className="text-primary drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]"
                        style={{ strokeLinecap: "round" }}
                      />
                    </svg>
                  )}
                </AnimatePresence>
                <div className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${idx === activeIdx ? 'bg-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'bg-white/10 group-hover:bg-white/30'}`} />
              </button>
            ))}
          </div>
        </div>
      </div>

    </section>
  );
}
