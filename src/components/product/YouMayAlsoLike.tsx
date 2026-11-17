'use client';

import { Product } from "@/lib/api";
import { ProductCard } from "@/components/product/ProductCard";
import { isDigitalProgramItem } from "@/lib/programs";
import { useRef, useState, useEffect } from "react";

interface RecommendationRowProps {
  label?: string;
  products: Product[];
}

function RecommendationRow({ label, products }: RecommendationRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const scrollRafRef = useRef<number | null>(null);
  const checkScroll = () => {
    if (scrollRafRef.current !== null) return;
    scrollRafRef.current = window.requestAnimationFrame(() => {
      scrollRafRef.current = null;
      if (!scrollRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    });
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [products.length]);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -280 : 280, behavior: 'smooth' });
  };

  if (!products || products.length === 0) return null;

  const useDesktopCarousel = products.length > 4;

  return (
    <section className="w-full">
      {label && (
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="h-px flex-1 max-w-[120px] bg-gradient-to-r from-transparent to-white/15" />
          <span className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400">
            {label}
          </span>
          <div className="h-px flex-1 max-w-[120px] bg-gradient-to-l from-transparent to-white/15" />
        </div>
      )}

      {/* Desktop: clean centered row (<=4) or smooth carousel (>4) */}
      <div className="hidden md:block">
        {!useDesktopCarousel ? (
          <div className="flex justify-center gap-5 lg:gap-6 flex-wrap">
            {products.map((product, idx) => (
              <div key={product.id} className="w-[220px] lg:w-[240px]">
                <ProductCard product={product} priority={idx < 2} dark={true} />
              </div>
            ))}
          </div>
        ) : (
          <div className="relative">
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => scroll('left')}
                aria-label="Scroll left"
                className="absolute -left-5 top-[38%] z-10 w-10 h-10 bg-zinc-900 border border-white/20 text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 hover:border-[#e32f8c] transition-all cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            {canScrollRight && (
              <button
                type="button"
                onClick={() => scroll('right')}
                aria-label="Scroll right"
                className="absolute -right-5 top-[38%] z-10 w-10 h-10 bg-zinc-900 border border-white/20 text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 hover:border-[#e32f8c] transition-all cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
            <div
              ref={scrollRef}
              onScroll={checkScroll}
              className="flex overflow-x-auto overflow-y-hidden scrollbar-hide gap-5 lg:gap-6 pb-2"
              style={{ scrollSnapType: 'x mandatory' }}
            >
              {products.map((product, idx) => (
                <div key={product.id} className="flex-none w-[220px] lg:w-[240px]" style={{ scrollSnapAlign: 'start' }}>
                  <ProductCard product={product} priority={idx < 2} dark={true} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile: clean 2-column grid matching homepage showcase */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:hidden">
        {products.map((product, idx) => (
          <div key={product.id}>
            <ProductCard product={product} priority={idx < 2} dark={true} />
          </div>
        ))}
      </div>
    </section>
  );
}

interface YouMayAlsoLikeProps {
  equipmentProducts?: Product[];
  programProducts?: Product[];
  products?: Product[];
  locale: string;
  preferProgramsFirst?: boolean;
}

export function YouMayAlsoLike({
  equipmentProducts,
  programProducts,
  products,
  locale,
  preferProgramsFirst = false,
}: YouMayAlsoLikeProps) {
  const isEn = locale === 'en';

  const resolvedEquipment =
    equipmentProducts ?? (products ? products.filter((p) => !isDigitalProgramItem(p)) : []);
  const resolvedPrograms =
    programProducts ?? (products ? products.filter((p) => isDigitalProgramItem(p)) : []);

  if (resolvedEquipment.length === 0 && resolvedPrograms.length === 0) return null;

  const equipmentSection = {
    key: 'equipment',
    label: isEn ? 'Gear' : 'Echipamente',
    items: resolvedEquipment,
  };

  const programsSection = {
    key: 'programs',
    label: isEn ? 'Digital Programs' : 'Programe Digitale',
    items: resolvedPrograms,
  };

  const orderedSections = (preferProgramsFirst
    ? [programsSection, equipmentSection]
    : [equipmentSection, programsSection]
  ).filter((s) => s.items.length > 0);

  return (
    <div className="mt-2 mb-6 max-w-6xl mx-auto">
      <div className="text-center mb-8 md:mb-10">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-white font-[family-name:var(--font-oswald)]">
          {isEn ? 'You May Also Like' : 'S-ar putea să-ți placă'}
        </h2>
      </div>

      <div className="space-y-10 md:space-y-12">
        {orderedSections.map((section, idx) => (
          <RecommendationRow
            key={section.key}
            label={idx > 0 ? section.label : undefined}
            products={section.items}
          />
        ))}
      </div>
    </div>
  );
}
