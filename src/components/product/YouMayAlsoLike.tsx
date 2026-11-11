'use client';

import { Product } from "@/lib/api";
import { ProductCard } from "@/components/product/ProductCard";
import { useLocale } from "next-intl";
import { useRef, useState, useEffect } from "react";

interface YouMayAlsoLikeProps {
  products: Product[];
  locale: string;
}

export function YouMayAlsoLike({ products, locale }: YouMayAlsoLikeProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    checkScroll();
  }, []);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -280 : 280, behavior: 'smooth' });
  };

  if (!products || products.length === 0) return null;

  const isEn = locale === 'en';

  // For desktop: if <= 4 products, show as centered grid. If more, show scrollable carousel.
  const useCarousel = products.length > 4;

  return (
    <div className="mt-4 mb-8">
      {/* Section Title */}
      <div className="text-center mb-10 flex flex-col items-center">
        <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter text-white font-[family-name:var(--font-oswald)]">
          {isEn ? "You May Also Like" : "S-ar putea să-ți placă și"}
        </h2>
      </div>

      {/* Desktop: Centered grid (≤4) or Carousel (>4) */}
      <div className="hidden md:block">
        {!useCarousel ? (
          /* Centered flex grid — always centered regardless of count */
          <div className="flex justify-center gap-6 flex-wrap">
            {products.map((product, idx) => (
              <div key={product.id} className="w-[240px] lg:w-[260px]">
                <ProductCard product={product} priority={idx < 2} dark={true} />
              </div>
            ))}
          </div>
        ) : (
          /* Carousel for many products */
          <div className="relative">
            {canScrollLeft && (
              <button
                onClick={() => scroll('left')}
                className="absolute -left-6 top-[40%] z-10 w-11 h-11 bg-zinc-900 border border-white/20 text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 hover:border-[#e32f8c] transition-all cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            {canScrollRight && (
              <button
                onClick={() => scroll('right')}
                className="absolute -right-6 top-[40%] z-10 w-11 h-11 bg-zinc-900 border border-white/20 text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 hover:border-[#e32f8c] transition-all cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
            <div
              ref={scrollRef}
              onScroll={checkScroll}
              className="flex overflow-x-auto gap-6 pb-4"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', scrollSnapType: 'x mandatory' }}
            >
              {products.map((product, idx) => (
                <div key={product.id} className="flex-none w-[240px] lg:w-[260px]" style={{ scrollSnapAlign: 'start' }}>
                  <ProductCard product={product} priority={idx < 2} dark={true} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile: Always swipeable horizontal scroll, centered when few products */}
      <div className="block md:hidden">
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className={`flex overflow-x-auto gap-4 pb-4 ${products.length <= 2 ? 'justify-center' : ''}`}
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            scrollSnapType: 'x mandatory',
            paddingLeft: '1rem',
            paddingRight: '1rem',
          }}
        >
          {products.map((product, idx) => (
            <div
              key={product.id}
              className="flex-none w-[200px]"
              style={{ scrollSnapAlign: 'center' }}
            >
              <ProductCard product={product} priority={idx === 0} dark={true} />
            </div>
          ))}
        </div>

        {/* Swipe hint dots */}
        {products.length > 2 && (
          <div className="flex justify-center gap-1.5 mt-4">
            {products.map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-black/20" />
            ))}
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        div::-webkit-scrollbar { display: none; }
      `}} />
    </div>
  );
}
