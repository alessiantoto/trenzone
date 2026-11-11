"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";

interface LegalContentProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export function LegalContent({ title, lastUpdated, children }: LegalContentProps) {
  const t = useTranslations("Legal");

  return (
    <div className="min-h-screen bg-[#f8f9fa] pt-2 md:pt-8 pb-20 relative overflow-hidden">
      {/* Background Pattern - Subtle Technical Grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{ backgroundImage: `radial-gradient(#000 1px, transparent 1px)`, backgroundSize: '32px 32px' }} 
      />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {/* Document Header Card */}
          <div className="bg-white border border-zinc-100 rounded-[2rem] md:rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="px-6 pt-8 pb-10 md:p-16">
              
              {/* Top Meta */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 md:mb-16">
                <div>
                  <Link 
                    href="/" 
                    className="inline-flex items-center gap-2 text-zinc-400 hover:text-black transition-colors text-[10px] font-black uppercase tracking-[0.2em] mb-4 md:mb-6 group"
                  >
                    <ChevronLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
                    {t('back_to_shop')}
                  </Link>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#e32f8c] animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#e32f8c]">{t('official_document')}</span>
                  </div>
                </div>
              </div>
 
              {/* Title Section */}
              <div className="mb-10 md:mb-20">
                <h1 className="text-3xl md:text-6xl font-heading font-black text-black uppercase tracking-tighter mb-4 leading-[0.9]">
                  {title}
                </h1>
                <div className="h-1 w-20 bg-[#e32f8c] mb-6" />
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">
                  {t('last_updated')}: <span className="text-black">{lastUpdated}</span>
                </p>
              </div>

              {/* Content with Custom Prose Styling */}
              <div className="max-w-none space-y-2
                text-zinc-600 leading-relaxed
                [&>h2]:text-2xl [&>h2]:md:text-3xl [&>h2]:font-black [&>h2]:text-black [&>h2]:uppercase [&>h2]:tracking-tight [&>h2]:mt-16 [&>h2]:mb-6
                [&>p]:mb-6 [&>p]:text-base
                [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:mb-8 [&>ul]:space-y-3 [&>ul>li]:text-zinc-600
                [&_strong]:text-black [&_strong]:font-bold
                [&_a]:text-[#e32f8c] [&_a]:underline [&_a:hover]:text-[#00b0d2]
              ">
                {children}
              </div>

              {/* Internal Footer */}
              <div className="mt-32 pt-12 border-t border-zinc-100 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                  <div className="font-heading font-black text-2xl tracking-tighter opacity-10">TRENZONE</div>
                  <div className="text-[9px] text-zinc-300 font-bold uppercase tracking-widest leading-tight">
                    {t('standard_certification').split(' ').slice(0, 2).join(' ')}<br/>{t('standard_certification').split(' ').slice(2).join(' ')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Page Footer Navigation */}
          <div className="mt-12 flex justify-center">
            <Link 
              href="/shop" 
              className="bg-black hover:bg-[#e32f8c] text-white px-12 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-2xl hover:shadow-[#e32f8c]/20 active:scale-95 text-center"
            >
              {t('catalog_cta')}
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
