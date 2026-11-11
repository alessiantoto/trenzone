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
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [activeMobileIdx, setActiveMobileIdx] = useState(0);

  useEffect(() => {
    checkScroll();
  }, []);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const handleMobileScroll = () => {
    const el = mobileScrollRef.current;
    if (!el || products.length <= 1) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) return;
    const ratio = el.scrollLeft / maxScroll;
    setActiveMobileIdx(Math.min(products.length - 1, Math.round(ratio * (products.length - 1))));
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
              className="flex overflow-x-auto overflow-y-hidden overscroll-y-none scrollbar-hide gap-6 pt-2 pb-4"
              style={{ scrollSnapType: 'x mandatory' }}
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
          ref={mobileScrollRef}
          onScroll={handleMobileScroll}
          className={`flex overflow-x-auto overflow-y-hidden overscroll-y-none scrollbar-hide gap-4 pt-2 pb-6 px-4 scroll-pl-4 ${products.length <= 2 ? 'justify-center' : ''}`}
          style={{
            scrollSnapType: 'x mandatory',
            touchAction: 'pan-x pan-y',
          }}
        >
          {products.map((product, idx) => (
            <div
              key={product.id}
              className="flex-none w-[190px] sm:w-[205px]"
              style={{ scrollSnapAlign: products.length <= 2 ? 'center' : 'start' }}
            >
              <ProductCard product={product} priority={idx === 0} dark={true} />
            </div>
          ))}
        </div>

        {/* Swipe indicator dots */}
        {products.length > 2 && (
          <div className="flex justify-center gap-1.5 mt-2">
            {products.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Slide ${i + 1}`}
                onClick={() => {
                  const el = mobileScrollRef.current;
                  if (!el) return;
                  const maxScroll = el.scrollWidth - el.clientWidth;
                  el.scrollTo({
                    left: (maxScroll * i) / (products.length - 1),
                    behavior: 'smooth',
                  });
                }}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  i === activeMobileIdx ? 'w-5 bg-[#e32f8c]' : 'w-1.5 bg-white/25 hover:bg-white/45'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
