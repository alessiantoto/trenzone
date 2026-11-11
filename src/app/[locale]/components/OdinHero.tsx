"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";
import { useEffect, useRef } from "react";

interface OdinHeroProps {
  freeShippingRo?: number;
  freeShippingIntl?: number;
  gummiesSlug?: string;
}

export function OdinHero({ freeShippingRo = 499, freeShippingIntl = 200, gummiesSlug = "jeleuri-cu-creatina-1" }: OdinHeroProps) {
  const t = useTranslations("Home");
  const locale = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const playAllVideos = () => {
      if (!containerRef.current) return;
      const videos = containerRef.current.querySelectorAll('video');
      videos.forEach((video) => {
        video.defaultMuted = true;
        video.muted = true;
        video.playsInline = true;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('x5-playsinline', 'true');
        video.play().catch(() => {
          // Autoplay restricted until interaction
        });
      });
    };

    playAllVideos();

    // When navigating back via bfcache (back button or swipe back), resume playback!
    const handlePageShow = () => playAllVideos();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        playAllVideos();
      }
    };

    // If TikTok or Low Power Mode blocked initial autoplay, the first touch or scroll gesture silently triggers play!
    const handleInteraction = () => {
      playAllVideos();
    };

    window.addEventListener('pageshow', handlePageShow);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('touchstart', handleInteraction, { passive: true, once: true });
    window.addEventListener('scroll', handleInteraction, { passive: true, once: true });
    window.addEventListener('click', handleInteraction, { passive: true, once: true });

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('scroll', handleInteraction);
      window.removeEventListener('click', handleInteraction);
    };
  }, []);

  const bannerText = locale === 'ro'
    ? `LIVRARE GRATUITĂ PESTE ${freeShippingRo} RON`
    : `FREE SHIPPING OVER ${freeShippingIntl} EUR`;

  return (
    <section className="relative h-[100dvh] flex flex-col justify-end pb-12 md:pb-24 overflow-hidden bg-black">
      {/* Top Banner */}
      <div className="absolute top-0 left-0 w-full bg-[#e32f8c] text-black py-2.5 z-50 overflow-hidden flex items-center justify-center text-[10px] md:text-xs font-black tracking-[0.2em] uppercase shadow-lg border-b border-[#e32f8c]">

        {/* Mobile: Static text */}
        <div className="md:hidden text-center w-full px-4">
          <span className="text-black">{bannerText}</span>
        </div>

        {/* Desktop: Animated Marquee */}
        <div className="hidden md:flex whitespace-nowrap animate-marquee min-w-full">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center mx-16 gap-16">
              <span className="text-black">{bannerText}</span>
              <span className="text-black/30 font-black">·</span>
            </div>
          ))}
        </div>

      </div>

      {/* Full Screen Background Image */}
      <div
        ref={containerRef}
        className="absolute inset-0 z-0"
      >
        {/* Desktop Video (direct src prevents WebKit source query failure) */}
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          controls={false}
          disablePictureInPicture
          disableRemotePlayback
          webkit-playsinline="true"
          x5-playsinline="true"
          src="/videos/hero_pc.mp4#t=0.001"
          className="hidden md:block absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
        />
        {/* Mobile Video (direct src prevents WebKit source query failure) */}
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          controls={false}
          disablePictureInPicture
          disableRemotePlayback
          webkit-playsinline="true"
          x5-playsinline="true"
          src="/videos/hero_mobil.mp4#t=0.001"
          className="block md:hidden absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent z-10 pointer-events-none" />
      </div>

      {/* Content Container - Left Aligned */}
      <div className="relative z-20 w-full px-6 md:px-12 flex flex-col items-start text-left max-w-7xl mx-auto">

        {/* Massive Title */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl sm:text-6xl md:text-8xl lg:text-[7.5rem] font-black uppercase text-white leading-[0.9] tracking-tighter drop-shadow-2xl mb-8 md:mb-10 max-w-4xl"
        >
          {t("hero_gummies_title")}
        </motion.h1>

        {/* Solid White Button - Modern & Clean */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full sm:w-auto"
        >
          <Link href={`/product/${gummiesSlug}`} className="flex w-full justify-center sm:inline-flex sm:w-auto bg-white text-black font-black uppercase text-base md:text-lg tracking-[0.1em] px-8 py-5 md:px-14 md:py-6 hover:bg-gray-200 transition-all duration-300 shadow-xl hover:scale-105 active:scale-95">
            {t("hero_gummies_btn")}
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
