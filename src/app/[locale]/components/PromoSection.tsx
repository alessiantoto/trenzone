"use client";

import { getOptimizedImageUrl } from '@/lib/utils/imageProxy';
import { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";

export function PromoSection({ 
  settings, 
  locale 
}: { 
  settings: any, 
  locale: 'ro' | 'en' 
}) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    if (!settings?.endDate) return;

    const calculateTimeLeft = () => {
      const difference = +new Date(settings.endDate) - +new Date();
      let timeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 };

      if (difference > 0) {
        timeLeft = {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        };
      }
      return timeLeft;
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [settings?.endDate]);

  if (!settings || !settings.isActive) return null;

  const content = settings[locale] || settings.ro;
  
  // Format title for the glitchy background effect
  const bgText = `${content.title} ${content.title} `.toUpperCase();

  return (
    <section className="relative w-full bg-[#050505] py-16 md:py-24 overflow-hidden flex flex-col justify-center border-y border-zinc-900">
      
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full flex flex-col pointer-events-none opacity-[0.03] overflow-hidden whitespace-nowrap">
        <span className="text-[15vw] font-black uppercase leading-none tracking-tighter">{bgText}</span>
        <span className="text-[15vw] font-black uppercase leading-none tracking-tighter ml-[-5vw]">{bgText}</span>
        <span className="text-[15vw] font-black uppercase leading-none tracking-tighter">{bgText}</span>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 relative z-20 w-full">
        
        {/* Mobile Tag */}
        {content.badge && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="lg:hidden w-full flex justify-start mb-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded-sm">
              <span className="font-black uppercase tracking-widest text-[10px]">{content.badge}</span>
            </div>
          </motion.div>
        )}

        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
          
          {/* LEFT: Image */}
          {settings.image && (
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="w-full lg:w-1/2 flex justify-center lg:justify-start"
            >
              <div className="relative w-full max-w-[500px] border-4 border-zinc-900 rounded-sm overflow-hidden bg-black aspect-square">
                <Image 
                  src={getOptimizedImageUrl(settings.image) || '/placeholder.png'} 
                  alt={content.title} 
                  fill
                  sizes="(max-width: 768px) 100vw, 500px"
                  className="object-cover opacity-90 hover:opacity-100 transition-opacity duration-300"
                />
                {settings.couponId && (
                  <div className="absolute bottom-4 left-4 bg-black px-4 py-2 border-l-4 border-[#e32f8c]">
                    <span className="text-[#e32f8c] font-black uppercase tracking-widest text-xs md:text-sm">
                      {locale === 'ro' ? 'FOLOSEȘTE CODUL' : 'USE CODE'}: {settings.couponId}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* RIGHT: Raw, aggressive typography and CTA */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="w-full lg:w-1/2 flex flex-col items-start text-left"
          >
            {/* Desktop Tag */}
            {content.badge && (
              <div className="hidden lg:inline-flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded-sm mb-6">
                <span className="font-black uppercase tracking-widest text-[10px]">{content.badge}</span>
              </div>
            )}

            <h2 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black uppercase text-white leading-[0.85] tracking-tighter mb-6 whitespace-pre-line">
              {content.title}
            </h2>
            
            <p className="text-zinc-400 text-base md:text-lg mb-8 max-w-md font-medium whitespace-pre-line">
              {content.description}
            </p>

            {/* Timer */}
            {settings.endDate && (
              <div className="flex flex-col mb-10 w-full max-w-sm">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2">
                  {locale === 'ro' ? 'Timp Rămas' : 'Time Left'}
                </span>
                <div className="flex gap-2">
                  <div className="flex-1 bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center py-3">
                    <span className="text-2xl font-black text-white leading-none">{isMounted ? String(timeLeft.days).padStart(2, '0') : '00'}</span>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-1">{locale === 'ro' ? 'Zile' : 'Days'}</span>
                  </div>
                  <div className="flex-1 bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center py-3">
                    <span className="text-2xl font-black text-white leading-none">{isMounted ? String(timeLeft.hours).padStart(2, '0') : '00'}</span>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-1">{locale === 'ro' ? 'Ore' : 'Hrs'}</span>
                  </div>
                  <div className="flex-1 bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center py-3">
                    <span className="text-2xl font-black text-white leading-none">{isMounted ? String(timeLeft.minutes).padStart(2, '0') : '00'}</span>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-1">{locale === 'ro' ? 'Min' : 'Min'}</span>
                  </div>
                  <div className="flex-1 bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center py-3">
                    <span className="text-2xl font-black text-[#e32f8c] leading-none">{isMounted ? String(timeLeft.seconds).padStart(2, '0') : '00'}</span>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-1">{locale === 'ro' ? 'Sec' : 'Sec'}</span>
                  </div>
                </div>
              </div>
            )}

            <Link 
              href="/produse"
              className="group relative inline-flex items-center justify-center px-8 py-4 bg-white text-black overflow-hidden rounded-sm"
            >
              <div className="absolute inset-0 w-full h-full bg-[#e32f8c] translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              <span className="relative z-10 font-black uppercase tracking-widest text-sm transition-colors duration-300 group-hover:text-black">
                {content.button}
              </span>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
