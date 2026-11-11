'use client';

import { Link } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { ArrowLeft, Home, Zap } from 'lucide-react';

export default function NotFound() {
  const locale = useLocale();
  const isRo = locale === 'ro';

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center select-none overflow-hidden relative selection:bg-[#e32f8c] selection:text-black">
      
      {/* 1. The Requested Scratch-Card Promo Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute inset-0 opacity-15 mix-blend-screen" 
          style={{ 
            backgroundImage: `url(/images/logos/trenzone_logo.webp)`, 
            backgroundSize: '140px', 
            backgroundRepeat: 'repeat',
            transform: 'rotate(-15deg) scale(1.5)'
          }} 
        />
        {/* Deep Vignette effect */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(0,0,0,1)_100%)]" />
      </div>

      {/* 2. Giant Ghost 404 Text */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[40vw] font-black text-white/[0.03] italic tracking-tighter leading-none pointer-events-none blur-[2px]">
        404
      </div>

      {/* 3. Main Content Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 max-w-2xl w-full flex flex-col items-center"
      >
        {/* Elite Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[#e32f8c] text-xs font-black tracking-[0.2em] uppercase mb-8 shadow-[0_0_20px_rgba(227, 47, 140,0.1)] backdrop-blur-md"
        >
          <Zap className="w-3 h-3 text-[#e32f8c] fill-[#e32f8c]" />
          {isRo ? "Eroare de Sistem" : "System Error"}
        </motion.div>
        
        {/* Massive 404 Title */}
        <h1 className="text-6xl md:text-8xl lg:text-[120px] font-black uppercase text-white tracking-tighter leading-[0.85] mb-6 drop-shadow-2xl">
          {isRo ? (
            <>
              Pagină <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e32f8c] to-blue-600">
                Pierdută.
              </span>
            </>
          ) : (
            <>
              Page <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e32f8c] to-blue-600">
                Not Found.
              </span>
            </>
          )}
        </h1>
        
        {/* Subtitle / Description */}
        <p className="text-zinc-400 text-lg md:text-xl mb-12 font-medium tracking-wide max-w-lg mx-auto leading-relaxed">
          {isRo
            ? "Se pare că ai ajuns la capătul lumii. Această pagină nu există sau a fost mutată. Întoarce-te la bază."
            : "Looks like you reached the end of the line. This page doesn't exist or was moved. Head back to base."}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
          
          <Link
            href="/"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-5 bg-[#e32f8c] text-black font-black uppercase tracking-widest text-sm rounded-xl hover:bg-white transition-all active:scale-95 group shadow-[0_0_30px_rgba(227, 47, 140,0.3)] hover:shadow-[0_0_50px_rgba(255,255,255,0.4)]"
          >
            <Home className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
            Înapoi Acasă
          </Link>
          
          <button
            onClick={() => window.history.back()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-5 bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-sm rounded-xl hover:bg-white/10 transition-all active:scale-95 group backdrop-blur-sm"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Mergi Înapoi
          </button>

        </div>
      </motion.div>

      {/* Decorative Cybernetic Lines */}
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#e32f8c]/30 to-transparent" />
      <div className="absolute top-0 right-0 w-[1px] h-full bg-gradient-to-b from-transparent via-[#e32f8c]/10 to-transparent" />
    </div>
  );
}
