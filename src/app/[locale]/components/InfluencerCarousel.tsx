"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useLocale } from "next-intl";
import { createPortal } from "react-dom";

import { InfluencerVideo } from "@/lib/api";
import { getCdnUrl } from '@/lib/utils/cdn';

const emptySubscribe = () => () => {};

export const DEFAULT_TEST_VIDEOS: InfluencerVideo[] = [
  { id: 'trenwraps-1', influencer_name: 'Vlad Tren', video_url: 'https://pub-a0354123ab7743d48270daf444febc26.r2.dev/trenwraps_1.mp4', display_order: 1, is_active: true },
  { id: 'trenwraps-2', influencer_name: 'Logan Dishman', video_url: 'https://pub-a0354123ab7743d48270daf444febc26.r2.dev/trenwraps_2.mp4', display_order: 2, is_active: true },
  { id: 'trenwraps-3', influencer_name: 'Honza Jeruse', video_url: 'https://pub-a0354123ab7743d48270daf444febc26.r2.dev/trenwraps_3.mp4', display_order: 3, is_active: true },
  { id: 'trenwraps-4', influencer_name: 'Cipi Raw', video_url: 'https://pub-a0354123ab7743d48270daf444febc26.r2.dev/trenwraps_4.mp4', display_order: 4, is_active: true },
  { id: 'trenwraps-5', influencer_name: '', video_url: 'https://pub-a0354123ab7743d48270daf444febc26.r2.dev/trenwraps_5.mp4', display_order: 5, is_active: true },
  { id: 'trenwraps-6', influencer_name: '', video_url: 'https://pub-a0354123ab7743d48270daf444febc26.r2.dev/trenwraps_6.mp4', display_order: 6, is_active: true },
  { id: 'trenwraps-7', influencer_name: '', video_url: 'https://pub-a0354123ab7743d48270daf444febc26.r2.dev/trenwraps_7.mp4', display_order: 7, is_active: true },
  { id: 'trenwraps-8', influencer_name: '', video_url: 'https://pub-a0354123ab7743d48270daf444febc26.r2.dev/trenwraps_8.mp4', display_order: 8, is_active: true },
  { id: 'trenwraps-9', influencer_name: '', video_url: 'https://pub-a0354123ab7743d48270daf444febc26.r2.dev/trenwraps_9.mp4', display_order: 9, is_active: true },
  { id: 'trenwraps-10', influencer_name: '', video_url: 'https://pub-a0354123ab7743d48270daf444febc26.r2.dev/trenwraps_10.mp4', display_order: 10, is_active: true },
  { id: 'trenwraps-11', influencer_name: '', video_url: 'https://pub-a0354123ab7743d48270daf444febc26.r2.dev/trenwraps_11.mp4', display_order: 11, is_active: true },
  { id: 'trenwraps-12', influencer_name: '', video_url: 'https://pub-a0354123ab7743d48270daf444febc26.r2.dev/trenwraps_12.mp4', display_order: 12, is_active: true },
];

export function InfluencerCarousel({ influencers = [], dark = false }: { influencers?: InfluencerVideo[], dark?: boolean }) {
  const locale = useLocale();
  const rawList = influencers && influencers.length > 0 ? influencers : DEFAULT_TEST_VIDEOS;
  const safeInfluencers = rawList.filter((influencer) => Boolean(influencer.video_url));

  const [selectedVideo, setSelectedVideo] = useState<{ url: string; title: string } | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const isPointerDownRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);
  const isDraggingRef = useRef(false);
  const touchStartXRef = useRef(0);
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  const getClipTitle = (inf: InfluencerVideo) => {
    return (inf.influencer_name && inf.influencer_name.trim().length > 0)
      ? inf.influencer_name.trim()
      : "";
  };

  // Group items into slides of 4 for mobile (2x2 grid per slide)
  const slides: { inf: InfluencerVideo; globalIndex: number }[][] = [];
  for (let i = 0; i < safeInfluencers.length; i += 4) {
    slides.push(
      safeInfluencers.slice(i, i + 4).map((inf, offset) => ({
        inf,
        globalIndex: i + offset,
      }))
    );
  }
  const slideCount = Math.max(1, slides.length);

  const scrollToSlide = (index: number) => {
    const el = sliderRef.current;
    const target = (index + slideCount) % slideCount;
    setActiveSlide(target);
    if (el) {
      el.scrollTo({
        left: target * el.offsetWidth,
        behavior: "smooth"
      });
    }
  };

  const handleScroll = () => {
    const el = sliderRef.current;
    if (!el || isDraggingRef.current) return;
    const index = Math.round(el.scrollLeft / el.offsetWidth);
    if (index !== activeSlide && index >= 0 && index < slideCount) {
      setActiveSlide(index);
    }
  };

  // Continuous Auto-Scroll every 7 seconds
  useEffect(() => {
    if (slideCount <= 1 || isPaused || selectedVideo !== null) return;

    const interval = setInterval(() => {
      setActiveSlide((prev) => {
        const next = (prev + 1) % slideCount;
        const el = sliderRef.current;
        if (el) {
          el.scrollTo({
            left: next * el.offsetWidth,
            behavior: "smooth"
          });
        }
        return next;
      });
    }, 7000);

    return () => clearInterval(interval);
  }, [slideCount, isPaused, selectedVideo]);

  // Pointer Drag-to-scroll support
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isPointerDownRef.current = true;
    startXRef.current = e.clientX;
    startScrollLeftRef.current = sliderRef.current?.scrollLeft || 0;
    isDraggingRef.current = false;
    setIsPaused(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current || !sliderRef.current) return;
    const deltaX = e.clientX - startXRef.current;
    if (Math.abs(deltaX) > 8) {
      isDraggingRef.current = true;
    }
    if (isDraggingRef.current) {
      sliderRef.current.scrollLeft = startScrollLeftRef.current - deltaX;
    }
  };

  const handlePointerUp = () => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    const el = sliderRef.current;
    if (el && isDraggingRef.current) {
      const target = Math.max(0, Math.min(Math.round(el.scrollLeft / el.offsetWidth), slideCount - 1));
      scrollToSlide(target);
    }
    setTimeout(() => {
      isDraggingRef.current = false;
      setIsPaused(false);
    }, 120);
  };

  // Touch Swipe gestures for snappy mobile flicking
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = e.touches[0].clientX;
    setIsPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchEndX - touchStartXRef.current;
    if (Math.abs(diffX) > 45) {
      if (diffX < 0) {
        scrollToSlide(activeSlide + 1);
      } else {
        scrollToSlide(activeSlide - 1);
      }
    }
    setTimeout(() => setIsPaused(false), 2000);
  };

  useEffect(() => {
    if (selectedVideo) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") setSelectedVideo(null);
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = originalBodyOverflow || "";
        document.documentElement.style.overflow = originalHtmlOverflow || "";
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [selectedVideo]);

  return (
    <>
      <section className="w-full bg-transparent py-4 md:py-8 overflow-hidden relative">
        <div className="mx-auto w-full max-w-6xl px-4 md:px-8">
          
          {/* Header Section */}
          <div className="flex flex-col items-center justify-between mb-8 md:mb-10 gap-3 text-center">
            <motion.h2 
              initial={{ opacity: 0, y: -10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-white font-[family-name:var(--font-oswald)]"
            >
              {locale === 'ro' ? 'TESTATE PE GREUTĂȚI MARI' : 'TESTED ON HEAVY WEIGHTS'}
            </motion.h2>
            <motion.div 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 }}
            >
              <p className="text-xs sm:text-sm md:text-base font-bold uppercase tracking-widest text-zinc-400">
                {locale === 'ro' ? 'Echipament testat de cei mai puternici atleți' : 'Tested and trusted by elite strength athletes'}
              </p>
            </motion.div>
          </div>

          {/* Mobile Native 120Hz Snap Slider with Drag & Touch Support (2x2 Grid per Slide) */}
          <div 
            ref={sliderRef}
            onScroll={handleScroll}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            className="md:hidden w-full flex overflow-x-auto overflow-y-hidden overscroll-y-none snap-x snap-mandatory scrollbar-hide overscroll-x-contain py-1 cursor-grab active:cursor-grabbing select-none touch-pan-y"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {slides.map((slide, sIdx) => (
              <div 
                key={sIdx} 
                className="w-full flex-shrink-0 snap-center grid grid-cols-2 gap-3 sm:gap-4 px-1 content-start"
              >
                {slide.map(({ inf, globalIndex }) => {
                  const title = getClipTitle(inf);
                  return (
                    <InfluencerCard 
                      key={inf.id || `clip-${globalIndex}`} 
                      inf={inf} 
                      title={title}
                      locale={locale}
                      onClick={() => setSelectedVideo({ url: inf.video_url, title })} 
                      isDraggingRef={isDraggingRef}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Desktop Grid (Responsive grid for all clips in rows of 6) */}
          <div className="hidden md:grid md:grid-cols-6 gap-3.5 lg:gap-4 justify-items-center">
            {safeInfluencers.map((inf, idx) => {
              const title = getClipTitle(inf);
              return (
                <InfluencerCard 
                  key={inf.id || `clip-${idx}`} 
                  inf={inf} 
                  title={title}
                  locale={locale}
                  onClick={() => setSelectedVideo({ url: inf.video_url, title })} 
                  isDraggingRef={isDraggingRef}
                />
              );
            })}
          </div>

          {/* Mobile Slide Controls */}
          {slideCount > 1 && (
            <div className="flex items-center justify-center gap-3 sm:gap-5 mt-8 md:hidden">
              <button
                onClick={() => scrollToSlide(activeSlide - 1)}
                aria-label={locale === 'ro' ? 'Slide anterior' : 'Previous slide'}
                className="group w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-zinc-900/95 border-2 border-white/20 hover:border-[#e32f8c] active:border-[#e32f8c] hover:bg-zinc-800 flex items-center justify-center text-white transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.8)] hover:shadow-[0_0_24px_rgba(227,47,140,0.45)] active:scale-90 cursor-pointer"
              >
                <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7 text-white group-hover:text-[#e32f8c] group-hover:-translate-x-0.5 stroke-[2.8] transition-all" />
              </button>

              <div 
                className="bg-zinc-900/90 border border-white/15 backdrop-blur-md px-4 sm:px-5 py-2.5 rounded-full flex items-center gap-2 sm:gap-3 shadow-[0_8px_30px_rgba(0,0,0,0.7)]" 
                aria-label={locale === 'ro' ? 'Paginare clipuri' : 'Video pagination'}
              >
                {Array.from({ length: slideCount }, (_, index) => (
                  <button
                    key={index}
                    onClick={() => scrollToSlide(index)}
                    aria-label={`Slide ${index + 1}`}
                    className="p-1 sm:p-1.5 flex items-center justify-center cursor-pointer group"
                  >
                    <div
                      className={`h-2.5 sm:h-3 rounded-full transition-all duration-300 ${
                        index === activeSlide 
                          ? 'w-10 sm:w-12 bg-[#e32f8c] shadow-[0_0_16px_rgba(227,47,140,0.95)]' 
                          : 'w-3.5 sm:w-4 bg-zinc-700/80 group-hover:bg-zinc-500'
                      }`}
                    />
                  </button>
                ))}

                <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-zinc-400 pl-1 font-[family-name:var(--font-oswald)] select-none">
                  {activeSlide + 1} / {slideCount}
                </span>
              </div>

              <button
                onClick={() => scrollToSlide(activeSlide + 1)}
                aria-label={locale === 'ro' ? 'Slide următor' : 'Next slide'}
                className="group w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-zinc-900/95 border-2 border-white/20 hover:border-[#e32f8c] active:border-[#e32f8c] hover:bg-zinc-800 flex items-center justify-center text-white transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.8)] hover:shadow-[0_0_24px_rgba(227,47,140,0.45)] active:scale-90 cursor-pointer"
              >
                <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7 text-white group-hover:text-[#e32f8c] group-hover:translate-x-0.5 stroke-[2.8] transition-all" />
              </button>
            </div>
          )}

        </div>
      </section>

      {/* Fullscreen Video Modal Portaled to Body */}
      {mounted && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {selectedVideo && (
            <div className="fixed inset-0 z-[95] flex flex-col items-center justify-start pt-24 sm:pt-28 md:pt-32 pb-4 sm:pb-6 px-4 pointer-events-none overscroll-none">
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/85 backdrop-blur-md pointer-events-auto overscroll-none"
                onTouchMove={(e) => e.preventDefault()}
                onClick={() => setSelectedVideo(null)}
              />

              {/* Video Card */}
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 24 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 24 }}
                transition={{ type: "spring", damping: 26, stiffness: 240 }}
                className="relative w-full max-w-[400px] h-full max-h-[calc(100vh-112px)] sm:max-h-[calc(100vh-136px)] aspect-[9/16] bg-black rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.85)] border border-white/20 flex flex-col pointer-events-auto z-10"
                style={{ overscrollBehavior: "contain" }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Title Badge (Only rendered if title exists) */}
                {selectedVideo.title && selectedVideo.title.trim().length > 0 ? (
                  <div className="absolute top-3.5 left-3.5 bg-black/70 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 flex items-center z-20 pointer-events-none shadow-md">
                    <span className="text-white text-xs sm:text-sm font-black tracking-wider uppercase font-[family-name:var(--font-oswald)]">
                      {selectedVideo.title}
                    </span>
                  </div>
                ) : null}

                {/* Close Button Inside Card */}
                <button 
                  onClick={() => setSelectedVideo(null)}
                  className="absolute top-3.5 right-3.5 w-9 h-9 sm:w-10 sm:h-10 bg-black/60 hover:bg-black/90 backdrop-blur-md text-white rounded-full flex items-center justify-center transition-all z-20 border border-white/20 active:scale-90 shadow-md cursor-pointer"
                  aria-label={locale === 'ro' ? 'Închide clipul' : 'Close video'}
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </button>

                {/* Video Element */}
                <video
                  src={getCdnUrl(selectedVideo.url)}
                  autoPlay
                  controls
                  playsInline
                  webkit-playsinline="true"
                  x5-playsinline="true"
                  className="w-full h-full object-contain bg-black"
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

function InfluencerCard({ 
  inf, 
  title, 
  locale,
  onClick, 
  isDraggingRef 
}: { 
  inf: InfluencerVideo; 
  title: string; 
  locale: string;
  onClick: () => void; 
  isDraggingRef?: React.RefObject<boolean>; 
}) {
  const [videoError, setVideoError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const getResolvedSrc = (rawUrl?: string) => {
    if (!rawUrl) return '';
    const cdnUrl = getCdnUrl(rawUrl);
    return cdnUrl || rawUrl;
  };

  const [currentSrc, setCurrentSrc] = useState(() => getResolvedSrc(inf.video_url));

  useEffect(() => {
    setCurrentSrc(getResolvedSrc(inf.video_url));
    setVideoError(false);
  }, [inf.video_url]);

  // 1. Lazy-attach video src only when card is visible in layout and near viewport (saves ~30MB on initial load & avoids hidden duplicate breakpoint downloads)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const loadObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && entry.boundingClientRect.width > 0) {
        setShouldLoad(true);
        loadObserver.disconnect();
      }
    }, { rootMargin: '400px 100px' });

    loadObserver.observe(container);
    return () => loadObserver.disconnect();
  }, []);

  // 2. Play/pause only when actually in view
  useEffect(() => {
    if (!shouldLoad) return;
    const video = videoRef.current;
    if (!video) return;

    // Detect TikTok in-app browser
    const isTikTok = /musical_ly|tiktok|bytedance/i.test(navigator.userAgent || '');
    if (isTikTok) {
      return;
    }

    const playObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && entry.boundingClientRect.width > 0) {
        requestAnimationFrame(() => {
          video.play().catch(() => {});
        });
      } else {
        video.pause();
      }
    }, { threshold: 0.15 });

    playObserver.observe(video);
    return () => playObserver.disconnect();
  }, [shouldLoad]);

  const handleClick = (e: React.MouseEvent) => {
    if (isDraggingRef?.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onClick();
  };

  const handleVideoError = () => {
    // If loading failed, try alternate path before giving up
    if (currentSrc && !currentSrc.includes('r2.dev')) {
      // Try R2 direct fallback
      const fileName = currentSrc.split('/').pop() || '';
      setCurrentSrc(`https://pub-a0354123ab7743d48270daf444febc26.r2.dev/${fileName}`);
    } else if (currentSrc && /trenwraps\d+\.mp4/.test(currentSrc)) {
      // Try with underscore
      setCurrentSrc(currentSrc.replace(/trenwraps(\d+)\.mp4/, 'trenwraps_$1.mp4'));
    } else if (currentSrc && /trenwraps_\d+\.mp4/.test(currentSrc)) {
      // Try without underscore
      setCurrentSrc(currentSrc.replace(/trenwraps_(\d+)\.mp4/, 'trenwraps$1.mp4'));
    } else {
      setVideoError(true);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[9/16] justify-self-center rounded-2xl overflow-hidden cursor-pointer group shadow-xl bg-zinc-900 border border-white/10 transition-transform duration-300 hover:scale-[1.02] active:scale-95 select-none"
      onClick={handleClick}
    >
      {/* Video Element — Only mounted when near viewport to prevent premature error events */}
      {shouldLoad && currentSrc && !videoError && (
        <video
          ref={videoRef}
          src={currentSrc}
          poster={inf.poster_url ? getCdnUrl(inf.poster_url) : undefined}
          loop
          muted
          playsInline
          controls={false}
          disablePictureInPicture
          disableRemotePlayback
          webkit-playsinline="true"
          x5-playsinline="true"
          preload="metadata"
          onLoadedData={() => setVideoError(false)}
          onError={handleVideoError}
          className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        />
      )}

      {/* Subtle Floating Play Badge */}
      <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/20 text-white shadow-md group-hover:scale-110 group-hover:bg-[#e32f8c] transition-all pointer-events-none">
        <Play className="w-3 h-3 fill-white text-white ml-0.5" />
      </div>

      {videoError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black px-2 text-center pointer-events-none">
          <span className="text-[10px] font-bold uppercase tracking-wide text-white/70">
            {locale === 'ro' ? "Clip indisponibil" : "Video unavailable"}
          </span>
        </div>
      )}
      
      {/* Title Overlay (Bottom) - Only rendered if title is provided */}
      {title && title.trim().length > 0 ? (
        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/95 via-black/75 to-transparent flex items-center justify-start pointer-events-none">
          <p className="text-white font-black text-xs sm:text-sm tracking-wider uppercase font-[family-name:var(--font-oswald)] truncate">
            {title}
          </p>
        </div>
      ) : null}
    </div>
  );
}
