"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";
import { useState, useRef, useEffect } from "react";
import { BadgeCheck, Play, X, Star } from "lucide-react";
import { getCdnUrl } from '@/lib/utils/cdn';

interface DesktopSplitHeroProps {
  freeShippingRo?: number;
  freeShippingIntl?: number;
  influencers?: any[];
  gummiesSlug?: string;
}

export function DesktopSplitHero({ freeShippingRo = 499, freeShippingIntl = 200, influencers = [], gummiesSlug = "jeleuri-cu-creatina-1" }: DesktopSplitHeroProps) {
  const t = useTranslations("Home");
  const locale = useLocale();
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  
  const mainVideoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    if (mainVideoRef.current) {
      mainVideoRef.current.defaultMuted = true;
      mainVideoRef.current.muted = true;
      mainVideoRef.current.play().catch((e) => console.log("Autoplay blocked:", e));
    }
  }, []);

  const bannerText = locale === 'ro' 
    ? `LIVRARE GRATUITĂ PESTE ${freeShippingRo} RON` 
    : `FREE SHIPPING OVER ${freeShippingIntl} EUR`;

  const topInfluencers = influencers.slice(0, 6); // Take up to 6 influencers

  return (
    <section className="relative h-[100dvh] w-full bg-[#050505] overflow-hidden hidden md:flex flex-col">
      {/* Top Banner */}
      <div className="w-full bg-[#e32f8c] text-black py-2.5 z-50 flex justify-between px-8 text-xs font-black tracking-[0.2em] uppercase shadow-lg shadow-[#e32f8c]/20 relative">
        <span className="text-black/60">{bannerText}</span>
        <span className="text-center text-black">{bannerText}</span>
        <span className="text-black/60">{bannerText}</span>
      </div>

      {/* Main Content Split */}
      <div className="flex-1 flex w-full max-w-[1920px] mx-auto px-6 lg:px-10 pb-6 lg:pb-10 pt-28 lg:pt-32 gap-6 lg:gap-10 h-full">
        
        {/* LEFT COLUMN: Main Video + Text */}
        <div className="w-[55%] relative rounded-[2rem] overflow-hidden shadow-2xl shadow-[#e32f8c]/10 border border-white/5 flex group bg-black">
          {/* Main Vertical Video */}
          <video 
            ref={mainVideoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            // @ts-expect-error fetchPriority is a valid HTML attribute but not yet in React types
            fetchPriority="high"
            className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-700"
          >
            <source src="/videos/smecher.mp4" type="video/mp4" />
          </video>
          
          {/* Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 z-10"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent z-10"></div>

          {/* Text Content overlay */}
          <div className="relative z-20 w-full h-full p-10 lg:p-16 flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-6 self-start"
            >
              <div className="w-2 h-2 rounded-full bg-[#e32f8c] animate-pulse" />
              <span className="text-xs font-bold text-white uppercase tracking-widest">
                {locale === 'ro' ? 'Formula Premium' : 'Premium Formula'}
              </span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="text-5xl lg:text-7xl xl:text-8xl font-black uppercase text-white leading-[0.9] tracking-tighter drop-shadow-2xl mb-8 max-w-2xl"
            >
              {t("hero_gummies_title")}
            </motion.h1>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="flex items-center gap-6"
            >
              <Link 
                href={`/product/${gummiesSlug}`} 
                className="bg-white text-black font-black uppercase text-base lg:text-lg tracking-[0.1em] px-10 py-5 rounded-2xl hover:bg-[#e32f8c] transition-all duration-300 shadow-xl hover:shadow-[#e32f8c]/50 hover:scale-105 active:scale-95 flex items-center gap-3"
              >
                {t("hero_gummies_btn")}
                <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center">
                  <Play className="w-4 h-4 fill-white" />
                </div>
              </Link>

              <div className="flex flex-col gap-1">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-yellow-400" />)}
                </div>
                <span className="text-white/70 text-xs font-bold uppercase tracking-widest">
                  {locale === 'ro' ? '+10,000 Clienți' : '+10,000 Customers'}
                </span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* RIGHT COLUMN: Influencers Grid */}
        <div className="w-[45%] flex flex-col gap-6 lg:gap-8 h-full">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl lg:text-4xl font-black text-white uppercase tracking-tighter">
                {locale === 'ro' ? 'Recomandat de Zei' : 'Trusted by Gods'}
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <BadgeCheck className="w-5 h-5 text-[#e32f8c]" />
                <p className="text-sm font-bold text-white/60 uppercase tracking-widest">
                  {locale === 'ro' ? 'Vezi recenziile video' : 'Watch video reviews'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-3 gap-3 lg:gap-4 min-h-0 items-center justify-items-center">
            {topInfluencers.map((inf, idx) => (
              <InfluencerCard key={inf.id} inf={inf} idx={idx} onClick={() => setSelectedVideo(inf)} />
            ))}
          </div>
        </div>

      </div>

      {/* Video Modal */}
      <AnimatePresence>
        {selectedVideo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4"
            onClick={() => setSelectedVideo(null)}
          >
            <button 
              onClick={(e) => { e.stopPropagation(); setSelectedVideo(null); }}
              className="absolute top-8 right-8 w-14 h-14 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors z-[110]"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-[500px] aspect-[9/16] bg-[#050505] rounded-3xl overflow-hidden shadow-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <video
                src={getCdnUrl(selectedVideo.video_url || selectedVideo.video)}
                autoPlay
                controls
                playsInline
                className="w-full h-full object-contain"
              />
              <div className="absolute top-6 left-6 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 pointer-events-none">
                <span className="text-white font-black tracking-tight">{selectedVideo.influencer_name || selectedVideo.name}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function InfluencerCard({ inf, idx, onClick }: { inf: any, idx: number, onClick: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => {});
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.4 + (idx * 0.1) }}
      className="relative w-full aspect-[9/16] max-h-[100%] max-w-[200px] lg:max-w-[240px] rounded-[1rem] lg:rounded-[1.5rem] overflow-hidden cursor-pointer group shadow-2xl bg-[#0a0a0a] border border-white/5 hover:border-[#e32f8c]/50 transition-colors"
      onClick={onClick}
    >
      <video 
        ref={videoRef}
        src={getCdnUrl(inf.video_url || inf.video)} 
        loop
        muted
        playsInline
        preload="none"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
      
      {/* Name Overlay */}
      <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1.5 rounded-lg">
        <span className="text-[10px] lg:text-xs font-black text-white uppercase tracking-wider line-clamp-1">
          {inf.influencer_name || inf.name}
        </span>
      </div>
    </motion.div>
  );
}
