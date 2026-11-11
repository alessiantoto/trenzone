"use client";

import { getOptimizedImageUrl } from '@/lib/utils/imageProxy';
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

export function DiscountPopup() {
  const [isVisible, setIsVisible] = useState(false);
  const params = useParams();
  const isRo = params.locale === "ro";

  useEffect(() => {
    // Show popup after 15 seconds every time they enter the site
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 15000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
            onClick={() => setIsVisible(false)}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 400 }}
            className="relative w-full max-w-md md:max-w-lg min-h-[550px] md:min-h-[600px] bg-zinc-900 border border-white/20 rounded-[2rem] shadow-2xl flex flex-col items-center text-center overflow-hidden z-10"
          >
            {/* Background Image */}
            <Image 
              src="/images/lifestyle/feleuri_baiat.webp" 
              alt="Discount Offer" 
              fill
              sizes="(max-width: 768px) 100vw, 500px"
              className="object-cover"
            />
            {/* Heavy Dark Gradient Overlay for Text Legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/20" />

            {/* Glassmorphic Badge (Top Center) */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 bg-black/20 backdrop-blur-md border border-white/20 rounded-full">
              <span className="text-[10px] md:text-xs font-black text-white tracking-[0.2em] uppercase">
                {isRo ? "Ofertă Limitată" : "Limited Offer"}
              </span>
            </div>

            {/* Close Button (Glassmorphic) */}
            <button 
              onClick={() => setIsVisible(false)}
              className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full p-2 transition-all duration-300 z-20"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Content (pushed to bottom) */}
            <div className="relative z-20 mt-auto flex flex-col items-center w-full p-8 md:p-10">
              
              {/* Heading */}
              <h3 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter mb-4 leading-none drop-shadow-2xl">
                {isRo ? "AI 5% REDUCERE!" : "GET 5% OFF!"}
              </h3>
              
              {/* Description */}
              <p className="text-white/80 mb-8 font-medium text-sm md:text-base leading-relaxed max-w-sm drop-shadow-md">
                {isRo 
                  ? "Abonează-te la newsletter-ul nostru și primești instant codul de reducere pe email." 
                  : "Subscribe to our newsletter and get your discount code instantly."}
              </p>

              {/* Primary Action Button */}
              <button 
                className="w-full bg-white text-black font-black uppercase tracking-widest py-4 md:py-5 rounded-2xl hover:bg-zinc-200 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.3)] mb-6"
                onClick={() => setIsVisible(false)}
              >
                {isRo ? "VREAU REDUCEREA" : "CLAIM DISCOUNT"}
              </button>

              {/* Secondary Action (Dismiss) */}
              <button 
                onClick={() => setIsVisible(false)}
                className="text-white/50 hover:text-white uppercase text-xs font-bold tracking-widest transition-colors relative after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-full after:h-[1px] after:bg-white/50 after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-left"
              >
                {isRo ? "Nu, mulțumesc" : "No, thanks"}
              </button>
            </div>
            
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
