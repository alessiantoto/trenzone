"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Truck, RotateCcw, Lock, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import Image from "next/image";

interface BundleSectionProps {
  // All translation logic is now handled internally via next-intl
}

export default function BundleSection({}: BundleSectionProps) {
  const t = useTranslations("Home");
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <section className="pt-4 pb-24 md:pt-6 md:pb-16 bg-black text-white relative overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-5xl mx-auto flex flex-col items-center">

          {/* 1. CLEAN HEADER */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="relative z-30 text-center px-8 py-6 rounded-[2rem] backdrop-blur-md bg-black/10 border border-white/5"
          >
            <h2 className="text-4xl md:text-7xl font-heading font-black tracking-tighter uppercase italic leading-none">
              {t('bundle_section_title')} <span className="text-primary italic">{t('bundle_section_highlight')}</span> <br className="md:hidden" /> {t('bundle_section_end')}
            </h2>
          </motion.div>

          {/* 2. THE ORBITAL SYSTEM */}
          <div
            className="relative w-full flex flex-col items-center justify-center py-2 md:py-8 min-h-[300px] md:min-h-[380px]"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/10 blur-[100px] md:blur-[160px] rounded-full pointer-events-none" />

            <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
              {[
                {
                  id: "p1",
                  label: `${t('bundle_product_label')} 01`,
                  img: "/images/products/apolo_cutii_jeleuri.webp",
                  offsets: {
                    x: [0, -75, 75, 0], y: [-90, 75, 75, -90],
                    dx: [0, -160, 160, 0], dy: [-100, 100, 100, -100],
                    s: [1.2, 0.7, 0.7, 1.2], z: [40, 5, 5, 40],
                    op: [1, 0.35, 0.35, 1], opd: [1, 0.35, 0.35, 1],
                  }
                },
                {
                  id: "p2",
                  label: `${t('bundle_product_label')} 02`,
                  img: "/images/products/wraps.png",
                  offsets: {
                    x: [-75, 75, 0, -75], y: [75, 75, -90, 75],
                    dx: [-160, 160, 0, -160], dy: [100, 100, -100, 100],
                    s: [0.7, 0.7, 1.2, 0.7], z: [5, 5, 40, 5],
                    op: [0.35, 0.35, 1, 0.35], opd: [0.35, 0.35, 1, 0.35],
                  }
                },
                {
                  id: "p3",
                  label: `${t('bundle_product_label')} 03`,
                  img: "/images/lifestyle/maieu_si_jeleuri.png",
                  offsets: {
                    x: [75, 0, -75, 75], y: [75, -90, 75, 75],
                    dx: [160, 0, -160, 160], dy: [100, -100, 100, 100],
                    s: [0.7, 1.2, 0.7, 0.7], z: [5, 40, 5, 5],
                    op: [0.35, 1, 0.35, 0.35], opd: [0.35, 1, 0.35, 0.35],
                  }
                }
              ].map((item) => (
                <motion.div
                  key={item.id}
                  animate={{
                    x: isMobile ? item.offsets.x : item.offsets.dx,
                    y: isMobile ? item.offsets.y : item.offsets.dy,
                    scale: item.offsets.s,
                    zIndex: item.offsets.z,
                    opacity: isMobile ? item.offsets.op : item.offsets.opd,
                  }}
                  transition={{
                    duration: isHovered ? 40 : 20,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  className="absolute w-[160px] md:w-[220px] aspect-square rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 bg-zinc-950 pointer-events-auto cursor-pointer will-change-transform"
                >
                  <Image 
                    src={item.img} 
                    alt={item.label} 
                    fill 
                    className="object-cover" 
                    sizes="(max-width: 768px) 160px, 220px" 
                    priority={item.id === "p1"}
                  />
                  <div className="absolute top-4 left-4">
                    <span className="bg-primary/90 backdrop-blur-md text-black text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter shadow-xl">{item.label}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* 3. CONVERSION PILL */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="relative z-30 mt-3 md:mt-8"
          >
            <div className="flex items-center gap-0 bg-zinc-900 border border-white/10 rounded-full overflow-hidden shadow-xl">
              <span className="text-[11px] md:text-sm font-black tracking-tight uppercase px-5 py-3 text-white">{t('bundle_choose_3')}</span>
              <div className="bg-primary px-5 py-3">
                <span className="text-[11px] md:text-sm font-black text-black uppercase tracking-tight">{t('bundle_discount_label')}</span>
              </div>
            </div>
          </motion.div>

          {/* 4. MASTER CTA */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="relative group z-30 w-full mt-6"
          >
            <Link
              href="/bundle"
              className="flex flex-col items-stretch bg-white rounded-[2rem] overflow-hidden group shadow-[0_20px_50px_-10px_rgba(234,88,12,0.25)] hover:shadow-[0_30px_60px_-10px_rgba(234,88,12,0.5)] transition-all duration-500 active:scale-[0.98]"
            >
              <div className="bg-black px-6 py-3 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">{t('bundle_stock_limited')}</span>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-green-400">{t('bundle_available')}</span>
                </div>
              </div>
              <div className="px-6 py-7 md:px-10 md:py-10 flex flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-3xl md:text-5xl font-heading font-black uppercase tracking-tighter text-black italic leading-none">
                    {t('bundle_cta_title')}<br className="md:hidden" /> <span className="text-primary">{t('bundle_cta_highlight')}</span>
                  </h3>
                </div>
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary flex items-center justify-center group-hover:scale-110 group-hover:bg-black transition-all duration-500 shrink-0">
                  <ArrowRight className="w-7 h-7 md:w-9 md:h-9 text-black group-hover:text-primary transition-colors" />
                </div>
              </div>
              <div className="bg-zinc-50 border-t border-zinc-100 px-6 py-3 flex items-center justify-center gap-6">
                <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-zinc-500">
                  <Truck className="w-3 h-3 text-primary" /> {t('bundle_fast_delivery')}
                </span>
                <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-zinc-500">
                  <RotateCcw className="w-3 h-3 text-primary" /> {t('bundle_return_30')}
                </span>
                <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-zinc-500">
                  <Lock className="w-3 h-3 text-primary" /> {t('bundle_secure_payment')}
                </span>
              </div>
            </Link>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
