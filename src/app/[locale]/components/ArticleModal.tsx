"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Clock, User, ArrowRight } from "lucide-react";
import Image from "next/image";
import { BlogPost } from "@/lib/data/blog";
import { Link } from "@/i18n/routing";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ArticleModalProps {
  article: BlogPost | null;
  onClose: () => void;
  isRo: boolean;
}

export function ArticleModal({ article, onClose, isRo }: ArticleModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (article) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = originalBodyOverflow || "";
        document.documentElement.style.overflow = originalHtmlOverflow || "";
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [article, onClose]);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {article && (
        <div className="fixed inset-0 z-[95] flex flex-col items-center justify-start pt-24 sm:pt-28 md:pt-32 pb-4 sm:pb-8 px-3 sm:px-6 pointer-events-none overscroll-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            onTouchMove={(e) => e.preventDefault()}
            className="fixed inset-0 bg-black/70 backdrop-blur-md pointer-events-auto overscroll-none"
          />

          {/* Modal Container - Framed cleanly below header */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.98 }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="relative w-full max-w-4xl max-h-[calc(100vh-108px)] sm:max-h-[calc(100vh-136px)] bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-y-auto overscroll-contain custom-scrollbar flex flex-col pointer-events-auto border border-zinc-200/90"
            style={{ overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}
          >
            {/* Sticky Header Inside Modal */}
            <div className="sticky top-0 z-30 flex items-center justify-between px-5 sm:px-8 py-3.5 bg-white/95 backdrop-blur-md border-b border-zinc-100">
              <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-[#e32f8c] uppercase">
                <span className="w-2 h-2 rounded-full bg-[#e32f8c] animate-pulse" />
                {isRo ? "Jurnalul TrenZone" : "TrenZone Journal"}
              </div>
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-black transition-colors font-bold text-xs uppercase tracking-wider shadow-sm"
                aria-label={isRo ? "Închide articolul" : "Close article"}
              >
                <span>{isRo ? "Închide" : "Close"}</span>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 sm:px-8 md:px-12 lg:px-14 py-6 sm:py-8">
              {/* Header */}
              <header className="mb-8">
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs md:text-sm font-bold tracking-widest text-[#e32f8c] uppercase mb-4 sm:mb-6">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span>{article.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User className="w-4 h-4" />
                    <span className="text-zinc-500">{article.author}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-[#e32f8c]/10 px-3 py-1 rounded-full border border-[#e32f8c]/20 text-black">
                    <Clock className="w-4 h-4 text-[#e32f8c]" />
                    <span>{article.readTime}</span>
                  </div>
                </div>

                <h1 className="text-2xl sm:text-3xl md:text-5xl font-black uppercase text-black tracking-tighter leading-[1.08] mb-4 sm:mb-6">
                  {article.title}
                </h1>

                <p className="text-base sm:text-lg md:text-xl text-zinc-500 font-medium leading-relaxed">
                  {article.excerpt}
                </p>
              </header>

              {/* Hero Image */}
              <div className="relative w-full aspect-[16/9] md:aspect-[21/9] rounded-2xl overflow-hidden mb-8 sm:mb-12 border border-zinc-200 bg-white shadow-sm">
                <Image
                  src={article.image}
                  alt={article.title}
                  fill
                  sizes="(max-width: 1200px) 100vw, 1200px"
                  className="object-cover"
                  priority
                />
              </div>

              {/* Content */}
              <article className="max-w-none text-zinc-600 font-medium leading-relaxed
                [&_h2]:text-xl [&_h2]:md:text-3xl [&_h2]:font-black [&_h2]:uppercase [&_h2]:tracking-tight [&_h2]:text-[#e32f8c] [&_h2]:mt-8 [&_h2]:md:mt-12 [&_h2]:mb-4
                [&_p]:mb-5 [&_p]:leading-relaxed [&_p]:last:mb-0
                [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-6
                [&_li]:mb-2 [&_li]:marker:text-[#e32f8c]
                [&_strong]:text-black">
                <div dangerouslySetInnerHTML={{ __html: article.content }} />
              </article>

              {/* CTA Section */}
              <div className="mt-12 sm:mt-16 p-6 sm:p-10 rounded-2xl sm:rounded-3xl bg-zinc-50 border border-zinc-200 relative overflow-hidden text-center shadow-lg">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-[#e32f8c]/15 blur-[80px] rounded-full pointer-events-none" />
                
                <h3 className="text-xl sm:text-3xl md:text-4xl font-black uppercase text-black tracking-tighter mb-3 relative z-10">
                  {isRo ? "Treci La Nivelul Următor" : "Ready to Level Up?"}
                </h3>
                <p className="text-sm sm:text-base text-zinc-500 mb-6 max-w-xl mx-auto relative z-10">
                  {isRo 
                    ? "Experimentează forța brută a echipamentelor TrenZone. Construite pentru sarcini extreme, stabilitate mecanică și protecție totală." 
                    : "Experience the raw power of TrenZone gear. Engineered for extreme loads, mechanical stability, and joint protection."}
                </p>
                
                <div className="flex items-center justify-center relative z-10">
                  <Link
                    href="/shop"
                    onClick={onClose}
                    className="inline-flex bg-black text-white px-8 py-4 rounded-full font-black uppercase tracking-widest text-xs sm:text-sm hover:bg-[#e32f8c] hover:text-black transition-colors shadow-md"
                  >
                    {isRo ? "Vezi Magazinul" : "Explore Shop"}
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
