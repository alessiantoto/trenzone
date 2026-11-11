"use client";

import { useCartStore } from "@/store/useCartStore";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ArrowRight } from "lucide-react";
import { Product } from "@/lib/api";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";

import { useRegionStore } from "@/store/useRegionStore";
import { formatPrice } from "@/utils/currency";
import { getProductPrice } from "@/utils/pricing";

interface AddToCartButtonProps { 
  product: Product;
  selectedVariant?: { name: string; image?: string; imageIndex?: number };
}

export function AddToCartButton({ 
  product, 
  selectedVariant 
}: AddToCartButtonProps) {
  const { addItem } = useCartStore();
  const [showSticky, setShowSticky] = useState(false);
  const mainButtonRef = useRef<HTMLDivElement>(null);
  const locale = useLocale();
  const { currency } = useRegionStore();
  const t = useTranslations("Product");

  const name = (typeof product.name === 'object' ? (product.name as any)[locale] || (product.name as any)['ro'] : product.name) as string;

  useEffect(() => {
    const handleScroll = () => {
      if (!mainButtonRef.current) return;
      const rect = mainButtonRef.current.getBoundingClientRect();
      const scrollY = window.scrollY;
      
      // Show sticky ONLY when:
      // 1. We have scrolled past the main hero (500px guard)
      // 2. The main button has truly disappeared past the top of the screen
      const isPastButton = rect.bottom < 0;
      const isDeepEnough = scrollY > 500;

      setShowSticky(isPastButton && isDeepEnough);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Initial check
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  
  return (
    <>
      <div ref={mainButtonRef}>
        <Button 
          size="lg" 
          className="w-full py-8 px-10 text-lg font-bold uppercase tracking-wider group/btn bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl shadow-[0_20px_50px_rgba(255,107,0,0.3)]"
          onClick={() => addItem(product, selectedVariant)}
        >
          <span className="flex items-center justify-center gap-3">
            {t("add_to_cart")}
            <ShoppingCart className="w-6 h-6 group-hover/btn:translate-x-1 transition-transform" />
          </span>
        </Button>
      </div>

      {/* Sticky Mobile Footer CTA */}
      <AnimatePresence>
        {showSticky && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-[60] md:hidden bg-white/80 backdrop-blur-xl border-t border-zinc-100 p-4 pb-8 flex items-center justify-between gap-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 bg-zinc-50 rounded-xl overflow-hidden flex-shrink-0 border border-zinc-100 relative">
                <Image 
                  src={(selectedVariant && selectedVariant.image) || (selectedVariant && selectedVariant.imageIndex !== undefined && product.images[selectedVariant.imageIndex]) || product.image || (product.images && product.images[0])} 
                  alt={name as string} 
                  fill
                  className="object-contain p-1"
                  sizes="48px"
                />
              </div>
              <div className="min-w-0">
                <p className="font-heading font-black text-black uppercase tracking-tight text-xs truncate">
                  {name as React.ReactNode}
                  {selectedVariant && <span className="block text-[8px] text-zinc-400 normal-case tracking-normal">{typeof selectedVariant.name === 'object' ? (selectedVariant.name as any)[locale] || (selectedVariant.name as any)['ro'] : selectedVariant.name}</span>}
                </p>
                <p className="text-[10px] font-bold text-primary tracking-widest">{formatPrice(getProductPrice(product.price, currency), currency)}</p>
              </div>
            </div>
            
            <Button 
              size="sm"
              onClick={() => addItem(product, selectedVariant)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground h-12 px-6 rounded-xl flex items-center gap-2 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20"
            >
              {t("purchase_button")} <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
