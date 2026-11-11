"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Product } from "@/lib/api";
import { Loader2, ChevronRight, Check } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@/i18n/routing";
import { getProductPrice } from "@/utils/pricing";
import { formatPrice } from "@/utils/currency";
import { useRegionStore } from "@/store/useRegionStore";
import { cn } from "@/lib/utils";

export function FeaturedGummies({ initialProduct }: { initialProduct?: Product | null }) {
  const [product, setProduct] = useState<Product | null>(initialProduct || null);
  const [isLoading, setIsLoading] = useState(!initialProduct);
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [loadedImageUrl, setLoadedImageUrl] = useState<string | null>(null);
  const preloadedImagesRef = useRef(new Set<string>());
  const { currency } = useRegionStore();
  const t = useTranslations("Products");
  const locale = useLocale();
  const isRo = locale === 'ro';
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (initialProduct) {
      setProduct(initialProduct);
      setIsLoading(false);
      return;
    }
    let mounted = true;
    async function fetchData() {
      setIsLoading(true);
      try {
        const response = await fetch('/api/products');
        const data = await response.json();
        if (!mounted || !data.success) return;
        const productsData = data.products;
        
        // Căutăm produsul cu "jeleuri" în nume sau slug
        const gummies = productsData.find((p: Product) => 
          p.slug.includes('jeleuri') || 
          (typeof p.name === 'object' ? p.name.ro?.toLowerCase().includes('jeleuri') : String(p.name).toLowerCase().includes('jeleuri'))
        );
        if (gummies) {
          setProduct(gummies);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    
    const timer = setTimeout(() => {
      fetchData();
    }, 50);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []);

  const getTranslated = (val: any) => typeof val === 'object' ? (val.ro || val.en) : val;

  const rawVariants = product?.bundleVariants?.flavor?.options || product?.variants?.options || [];
  const variants = [...rawVariants].sort((a: any, b: any) => {
    const nameA = getTranslated(a.name).toLowerCase();
    const nameB = getTranslated(b.name).toLowerCase();
    
    if (nameA.includes('pepene')) return -1;
    if (nameB.includes('pepene')) return 1;
    if (nameA.includes('lime') || nameA.includes('lămâie') || nameA.includes('lemon')) return -1;
    if (nameB.includes('lime') || nameB.includes('lămâie') || nameB.includes('lemon')) return 1;
    return 0;
  });

  const activeVariant = variants.length > 0 ? variants[activeVariantIndex] : null;
  
  // Imaginea: Mapare directă la imaginile WebP optimizate din folderul de test
  const getActiveImage = () => {
    if (!activeVariant) return product?.image;
    
    const n = getTranslated(activeVariant.name).toLowerCase();
    if (n.includes('afine') || n.includes('blue')) return '/images/test/afine.webp';
    if (n.includes('căpșuni') || n.includes('capsuni') || n.includes('straw')) return '/images/test/capsuni.webp';
    if (n.includes('lămâie') || n.includes('lamaie') || n.includes('lemon')) return '/images/test/lamaie.webp';
    if (n.includes('pădure') || n.includes('padure') || n.includes('berry')) return '/images/test/padure.webp';
    if (n.includes('pepene') || n.includes('watermelon')) return '/images/test/pepene.webp';
    
    return product?.image;
  };

  const activeImage = getActiveImage();

  useEffect(() => {
    const imageUrls = Array.from(new Set([
      product?.image,
      ...variants.map((variant) => {
        const name = getTranslated(variant.name).toLowerCase();
        if (name.includes('afine') || name.includes('blue')) return '/images/test/afine.webp';
        if (name.includes('căpșuni') || name.includes('capsuni') || name.includes('straw')) return '/images/test/capsuni.webp';
        if (name.includes('lămâie') || name.includes('lamaie') || name.includes('lemon')) return '/images/test/lamaie.webp';
        if (name.includes('pădure') || name.includes('padure') || name.includes('berry')) return '/images/test/padure.webp';
        if (name.includes('pepene') || name.includes('watermelon')) return '/images/test/pepene.webp';
        return product?.image;
      })
    ].filter((url): url is string => Boolean(url))));

    // Defer non-critical preloading until browser is idle
    const timeout = setTimeout(() => {
      imageUrls.forEach((url) => {
        if (preloadedImagesRef.current.has(url)) return;
        const image = new window.Image();
        image.onload = () => preloadedImagesRef.current.add(url);
        image.src = url;
      });
    }, 1500);

    return () => clearTimeout(timeout);
  }, [product?.image, variants]);

  useEffect(() => {
    if (activeImage) setLoadedImageUrl(activeImage);
  }, [activeImage]);

  // Autoplay Logic
  const startAutoplay = () => {
    if (variants.length > 1) {
      intervalRef.current = setInterval(() => {
        setActiveVariantIndex((prev) => (prev + 1) % variants.length);
      }, 3500);
    }
  };

  const stopAutoplay = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  useEffect(() => {
    if (!isHovered && variants.length > 1) {
      startAutoplay();
    }
    return () => stopAutoplay();
  }, [variants.length, isHovered]);

  if (isLoading) {
    return (
      <div className="w-full bg-white py-24 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#e32f8c]" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] animate-pulse text-black">Încărcăm...</p>
      </div>
    );
  }

  if (!product) return null;

  const numericPrice = getProductPrice(product.price, currency);

  // Helper pentru a extrage emoji bazat pe numele aromei
  const getFlavorIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('afine') || n.includes('blue')) return '🫐';
    if (n.includes('căpșuni') || n.includes('capsuni') || n.includes('straw')) return '🍓';
    if (n.includes('lămâie') || n.includes('lamaie') || n.includes('lemon')) return '🍋';
    if (n.includes('lime') || n.includes('măr') || n.includes('mar')) return '🍏';
    if (n.includes('pădure') || n.includes('padure') || n.includes('berry')) return '🍇';
    if (n.includes('pepene') || n.includes('watermelon')) return '🍉';
    return '🍬';
  };

  // Helper pentru a extrage glow color bazat pe numele aromei
  const getFlavorGlow = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('afine') || n.includes('blue')) return 'rgba(59, 130, 246, 0.6)'; // blue-500
    if (n.includes('căpșuni') || n.includes('capsuni') || n.includes('straw')) return 'rgba(239, 68, 68, 0.6)'; // red-500
    if (n.includes('lămâie') || n.includes('lamaie') || n.includes('lemon')) return 'rgba(234, 179, 8, 0.6)'; // yellow-500
    if (n.includes('pădure') || n.includes('padure') || n.includes('berry')) return 'rgba(168, 85, 247, 0.6)'; // purple-500
    if (n.includes('pepene') || n.includes('watermelon')) return 'rgba(244, 63, 94, 0.6)'; // rose-500
    return 'rgba(255, 255, 255, 0.5)';
  };

  // Helper pentru a extrage o culoare solida (HEX) bazat pe numele aromei
  const getFlavorColorHex = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('afine') || n.includes('blue')) return '#3b82f6'; // blue-500
    if (n.includes('căpșuni') || n.includes('capsuni') || n.includes('straw')) return '#ef4444'; // red-500
    if (n.includes('lămâie') || n.includes('lamaie') || n.includes('lemon')) return '#eab308'; // yellow-500
    if (n.includes('pădure') || n.includes('padure') || n.includes('berry')) return '#a855f7'; // purple-500
    if (n.includes('pepene') || n.includes('watermelon')) return '#f43f5e'; // rose-500
    return '#000000';
  };

  const activeFlavorName = activeVariant ? getTranslated(activeVariant.name) : '';
  const activeColorHex = getFlavorColorHex(activeFlavorName);

  return (
    <section className="w-full bg-transparent py-16 md:py-24 relative overflow-hidden flex flex-col items-center" id="featured-gummies">
      
      {/* Top Header */}
      <div className="text-center mb-10 px-4 flex flex-col items-center">
        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-black mb-1">
          {isRo ? (
            <>Preferatele <span className="text-[#e32f8c]">Voastre</span></>
          ) : (
            <>Your <span className="text-[#e32f8c]">Favorites</span></>
          )}
        </h2>
        <p className="mt-2 text-sm text-zinc-500 font-medium max-w-md">
          {isRo ? (
            <>
              Descoperă gama de{" "}
              <Link 
                href="/jeleuri-cu-creatina" 
                className="text-black font-bold underline decoration-[#e32f8c] decoration-2 underline-offset-4 hover:text-[#e32f8c] transition-colors"
              >
                jeleuri cu creatină monohidrată
              </Link>{" "}
              zero zahăr, 100% vegane.
            </>
          ) : (
            <>
              Discover our range of{" "}
              <Link 
                href="/jeleuri-cu-creatina" 
                className="text-black font-bold underline decoration-[#e32f8c] decoration-2 underline-offset-4 hover:text-[#e32f8c] transition-colors"
              >
                creatine monohydrate gummies
              </Link>{" "}
              sugar-free, 100% vegan.
            </>
          )}
        </p>
      </div>

      {/* Modern Product Card Showcase */}
      <div 
        className="w-full max-w-[500px] mx-auto flex flex-col items-center px-4"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={() => setIsHovered(true)}
        onTouchEnd={() => setIsHovered(false)}
      >
        
        {/* Image Container with Floating Selectors */}
        <div className="relative w-full aspect-[4/5] rounded-[2rem] flex items-center justify-center overflow-hidden mb-8 shadow-2xl bg-black">
          {loadedImageUrl !== activeImage && (
            <div className="absolute inset-0 z-10 overflow-hidden bg-zinc-900" aria-hidden="true">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>
          )}
          {/* Pre-render all possible images using Next.js Image Optimization */}
          {Array.from(new Set([product?.image, ...variants.map(v => {
            const n = getTranslated(v.name).toLowerCase();
            if (n.includes('afine') || n.includes('blue')) return '/images/test/afine.webp';
            if (n.includes('căpșuni') || n.includes('capsuni') || n.includes('straw')) return '/images/test/capsuni.webp';
            if (n.includes('lămâie') || n.includes('lamaie') || n.includes('lemon')) return '/images/test/lamaie.webp';
            if (n.includes('pădure') || n.includes('padure') || n.includes('berry')) return '/images/test/padure.webp';
            if (n.includes('pepene') || n.includes('watermelon')) return '/images/test/pepene.webp';
            return product?.image;
          })])).filter(Boolean).map((imgUrl) => {
            const isCurrent = imgUrl === activeImage;
            return (
              <Image
                key={imgUrl}
                src={imgUrl}
                alt={getTranslated(product.name)}
                fill
                sizes="(max-width: 640px) 90vw, 500px"
                priority={isCurrent}
                quality={80}
                className={cn(
                  "absolute inset-0 w-full h-full object-cover z-0 transition-all duration-700 ease-in-out",
                  isCurrent ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
                )}
              />
            );
          })}

          {/* Gradient Overlay for bottom text visibility */}
          <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-black/80 to-transparent z-10 pointer-events-none" />

          {/* Flavor Pill Selectors */}
          {variants.length > 0 && (
            <div className="absolute bottom-6 left-0 w-full flex justify-center items-center gap-2 sm:gap-3 px-4 z-20">
              {variants.map((v: any, idx: number) => {
                const isActive = idx === activeVariantIndex;
                const flavorName = getTranslated(v.name);
                const icon = getFlavorIcon(flavorName);
                const glow = getFlavorGlow(flavorName);
                
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setActiveVariantIndex(idx);
                      setIsHovered(true); // Pause autoplay
                    }}
                    className={`relative flex items-center justify-center h-10 rounded-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] flex-shrink-0 overflow-hidden ${
                      isActive 
                        ? "px-4 bg-white text-black font-black text-[10px] sm:text-[11px] uppercase tracking-widest shadow-xl cursor-default scale-110" 
                        : "w-10 bg-white/20 backdrop-blur-md text-white/90 hover:bg-white/40 text-sm cursor-pointer"
                    }`}
                    style={isActive ? { boxShadow: `0 0 20px ${glow}, inset 0 0 0 2px ${glow.replace('0.6', '1')}` } : {}}
                  >
                    <span className="relative z-10 flex-shrink-0">{icon}</span>
                    <span 
                      className={`overflow-hidden whitespace-nowrap transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                        isActive ? "max-w-[150px] opacity-100 ml-2" : "max-w-0 opacity-0 ml-0"
                      }`}
                    >
                      {flavorName}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Minimalist CTA Button with Dynamic Color */}
        <Link href={`/product/${product.slug}`} className="w-full sm:w-auto">
          <button 
            className="w-full sm:w-auto flex items-center justify-center gap-4 text-white px-8 py-5 rounded-[2rem] font-black uppercase tracking-widest text-sm hover:scale-[1.02] hover:shadow-2xl hover:shadow-black/20 transition-all duration-300 border-b-4 border-black/20"
            style={{ backgroundColor: activeColorHex }}
          >
            <span>Alege Culoarea</span>
            <span className="w-px h-4 bg-white/30" />
            <span>{formatPrice(numericPrice, currency)}</span>
          </button>
        </Link>
      </div>
    </section>
  );
}
