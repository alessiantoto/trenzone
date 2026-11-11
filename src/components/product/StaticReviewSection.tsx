'use client';

import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Star, CheckCircle2, X, Package, ChevronLeft, ChevronRight, Maximize2, MessageSquarePlus, ArrowRight, Plus, Minus, ChevronDown } from 'lucide-react';
import { useState, Suspense, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";
import { WriteReviewModal } from './WriteReviewModal';

function mapClientReviews(list: any[], locale: string) {
  const dateLocale = locale === 'ro' ? 'ro-RO' : 'en-US';
  return (list || []).map((r: any) => ({
    id: r.id,
    name: r.name || r.customer_name,
    text: r.text || r.comment,
    image:
      r.images && r.images.length > 0 && typeof r.images[0] === 'string' && !r.images[0].includes('cdn.shopify.com')
        ? r.images[0]
        : null,
    date: r.created_at
      ? new Date(r.created_at).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })
      : '',
    rating: r.rating,
    itemType: r.item_type,
    fit: r.fit,
    product: r.product
      ? {
          ...r.product,
          image:
            typeof r.product.image === 'string' && !r.product.image.includes('cdn.shopify.com')
              ? r.product.image
              : '',
        }
      : null,
  }));
}

function ReviewSectionInner({ 
  product, 
  faqItems,
  showFaq,
  initialReviews
}: { 
  product?: any; 
  faqItems?: { question: string; answer: string }[];
  showFaq?: boolean;
  initialReviews?: any[];
}) {
  const locale = useLocale();
  const searchParams = useSearchParams();
  
  const [selectedReview, setSelectedReview] = useState<any | null>(null);
  const [isWriteReviewOpen, setIsWriteReviewOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const hasInitialReviews = Array.isArray(initialReviews);
  const [reviews, setReviews] = useState<any[]>(() =>
    hasInitialReviews ? mapClientReviews(initialReviews, locale) : []
  );
  const [isLoading, setIsLoading] = useState(!hasInitialReviews);

  const fallbackFaqs = locale === 'ro' ? [
    { question: "Cum aleg între modelul X5 și X10?", answer: "Alegerea depinde de stilul tău de antrenament: dacă vrei confort, mobilitate și protecție articulară pe serii de volum și culturism, alege X5 (suport 3.5/5 ferm și flexibil). Dacă vrei rigiditate extremă, blocare de fier pe coate și asistență mecanică de până la +20 kg la ieșirea din piept pe seriile grele și PR-uri, alege X10 (suport 5/5 de competiție)." },
    { question: "Cât timp durează livrarea?", answer: "Comenzile sunt expediate prin curier rapid direct la adresă în 1-2 zile lucrătoare în România și 3-5 zile lucrătoare internațional. Livrare gratuită disponibilă peste pragul afișat." },
    { question: "Sunt potrivite și pentru începători?", answer: "Modelul X5 este excelent pentru orice lifter care dorește să-și protejeze articulația cotului și tendoanele de uzură. Modelul X10 este recomandat sportivilor avansați care au deja stabilitate formată pe greutăți mari." },
    { question: "Cum se întrețin benzile de cot?", answer: "Se recomandă aerisirea lor după fiecare antrenament intens și spălarea manuală la temperaturi reduse (apă călduță), fără uscare automată, pentru a păstra elasticitatea intactă." },
    { question: "Care este politica de retur?", answer: "Beneficiezi de 14 zile drept de retur garantat fără riscuri. Dacă mărimea sau nivelul de rigiditate nu ți se potrivește, poți schimba sau returna produsul simplu și rapid." }
  ] : [
    { question: "How do I choose between X5 and X10?", answer: "Choose based on your training style: if you want versatile joint support, full mobility, and tendon protection for hypertrophy and volume, choose X5 (3.5/5 firmness). If you want extreme competition-grade stiffness and maximum lockout rebound on heavy sets, choose X10 (5/5 stiffness)." },
    { question: "How long does delivery take?", answer: "Orders are shipped via express tracked courier to your doorstep in 1-2 business days in Romania and 3-5 business days across Europe, the UK, and the US. Free shipping is available above the threshold." },
    { question: "Are these suitable for beginners?", answer: "The X5 model is great for lifters wanting reliable elbow protection and joint longevity. The X10 model is engineered for advanced lifters moving heavy poundages." },
    { question: "How do I care for my elbow wraps?", answer: "Air-dry after intense sessions and hand wash with lukewarm water when needed. Do not machine tumble dry to ensure elastic tension remains at peak performance." },
    { question: "What is the return policy?", answer: "We offer a 14-day hassle-free return window. If you wish to exchange models or return unused wraps, our support team handles it quickly." }
  ];

  const shouldRenderFaq = showFaq ?? Boolean(product);
  const safeFaqItems = faqItems && faqItems.length > 0 ? faqItems : fallbackFaqs;

  useEffect(() => {
    if (hasInitialReviews) return;

    async function fetchReviews() {
      try {
        const res = await fetch('/api/reviews');
        const data = await res.json();
        if (data.reviews) {
          setReviews(mapClientReviews(data.reviews, locale));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchReviews();
  }, [locale, hasInitialReviews]);

  useEffect(() => {
    if (searchParams.get('review') === 'open') {
      setIsWriteReviewOpen(true);
      // Optional: prefill rating if provided
      // const rating = searchParams.get('rating');
    }
  }, [searchParams]);

  // 8 cards per page: exactly 4 rows of 2 on mobile, 2 rows of 4 on desktop
  const REVIEWS_PER_PAGE = 8;
  const totalPages = Math.ceil(reviews.length / REVIEWS_PER_PAGE);

  const paginatedReviews = reviews.slice(
    (currentPage - 1) * REVIEWS_PER_PAGE,
    currentPage * REVIEWS_PER_PAGE
  );

  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1) 
    : "5.0";

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    const section = document.getElementById('reviews-section');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div id="reviews-section" className="w-full bg-transparent py-10 md:py-20 text-white relative">
      <div className="container mx-auto px-3 sm:px-6 lg:px-8 relative z-10 max-w-7xl">
        
        {/* ═══ MASTER FAQ DROPDOWN ACCORDION (Product pages only, never on Home) ═══ */}
        {shouldRenderFaq && <ProductFaqAccordion items={safeFaqItems} locale={locale} />}

        {/* ═══ REVIEWS HEADER & ACTION BAR (Image 2 UX Standard) ═══ */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 sm:w-5 sm:h-5 fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]" />
                ))}
              </div>
              <span className="text-sm sm:text-base font-black text-white ml-1">
                {totalReviews} {locale === 'ro' ? (totalReviews === 1 ? 'Recenzie' : 'Recenzii') : 'Reviews'}
              </span>
            </div>
            <span className="text-xs text-zinc-400 font-medium">
              {averageRating}/5.0 {locale === 'ro' ? 'evaluare medie de la atleți' : 'average athlete rating'}
            </span>
          </div>

          <button 
            onClick={() => setIsWriteReviewOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-[#e32f8c] text-black hover:text-white font-black uppercase text-xs tracking-wider rounded-xl transition-all duration-300 shadow-lg active:scale-95 cursor-pointer"
          >
            <MessageSquarePlus className="w-4 h-4" />
            <span>{locale === 'ro' ? "Scrie o recenzie" : "Write a review"}</span>
          </button>
        </div>

        {/* Reviews Masonry - 2 columns on Mobile, 3 on Tablet, 4 on Desktop (YoungLA standard) */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-white/20 border-t-[#e32f8c] rounded-full animate-spin"></div>
          </div>
        ) : (
          <div 
            className="columns-2 md:columns-3 lg:columns-4 gap-3 sm:gap-4 md:gap-6 [column-fill:_balance]"
            style={{ contain: 'layout' }}
          >
            {paginatedReviews.map((review) => (
              <div key={review.id} className="break-inside-avoid mb-3 sm:mb-4 md:mb-6">
                <ReviewCard 
                  review={review} 
                  locale={locale} 
                  isProductPage={Boolean(product)}
                  onClick={() => setSelectedReview(review)} 
                />
              </div>
            ))}
          </div>
        )}

        {/* Modern Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-12 pt-8 border-t border-white/[0.08]">
            <div className="text-xs font-bold text-zinc-400 tracking-wide uppercase">
              {locale === 'ro' 
                ? `Afișare ${(currentPage - 1) * REVIEWS_PER_PAGE + 1}–${Math.min(currentPage * REVIEWS_PER_PAGE, totalReviews)} din ${totalReviews} recenzii verificate`
                : `Showing ${(currentPage - 1) * REVIEWS_PER_PAGE + 1}–${Math.min(currentPage * REVIEWS_PER_PAGE, totalReviews)} of ${totalReviews} verified reviews`}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider bg-zinc-900/90 border border-white/10 text-zinc-300 hover:text-white hover:border-[#e32f8c]/40 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-all duration-200 cursor-pointer"
                title={locale === 'ro' ? 'Pagina anterioară' : 'Previous page'}
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">{locale === 'ro' ? 'Anterior' : 'Previous'}</span>
              </button>

              <div className="flex items-center gap-1.5">
                {[...Array(totalPages)].map((_, i) => {
                  const pageNum = i + 1;
                  const isActive = currentPage === pageNum;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`w-10 h-10 rounded-xl font-black text-xs flex items-center justify-center transition-all duration-200 cursor-pointer ${
                        isActive 
                          ? 'bg-gradient-to-r from-[#e32f8c] to-[#ff2a85] text-white shadow-[0_0_20px_rgba(227,47,140,0.45)] scale-105' 
                          : 'bg-zinc-900/90 border border-white/10 text-zinc-300 hover:text-white hover:border-white/25 hover:bg-zinc-800'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider bg-zinc-900/90 border border-white/10 text-zinc-300 hover:text-white hover:border-[#e32f8c]/40 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-all duration-200 cursor-pointer"
                title={locale === 'ro' ? 'Pagina următoare' : 'Next page'}
              >
                <span className="hidden sm:inline">{locale === 'ro' ? 'Următor' : 'Next'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        
        {/* Empty state fallback if no reviews exist at all */}
        {!isLoading && reviews.length === 0 && (
          <div className="text-center text-zinc-500 py-10">
            {locale === 'ro' ? "Fii primul care lasă o recenzie!" : "Be the first to leave a review!"}
          </div>
        )}

      </div>

      {/* Review Modal */}
      <AnimatePresence>
        {selectedReview && (
          <ReviewModal 
            review={selectedReview} 
            locale={locale} 
            isProductPage={Boolean(product)}
            onClose={() => setSelectedReview(null)} 
          />
        )}
      </AnimatePresence>
      {/* Write Review Modal */}
      <WriteReviewModal 
        isOpen={isWriteReviewOpen}
        onClose={() => setIsWriteReviewOpen(false)}
        locale={locale}
        product={product}
      />
    </div>
  );
}

export function StaticReviewSection({ 
  product, 
  faqItems,
  showFaq,
  initialReviews
}: { 
  product?: any; 
  faqItems?: { question: string; answer: string }[];
  showFaq?: boolean;
  initialReviews?: any[];
}) {
  const locale = useLocale();
  return (
    <Suspense fallback={<div className="py-20 text-center text-zinc-500">{locale === 'en' ? 'Loading reviews...' : 'Se încarcă recenziile...'}</div>}>
      <ReviewSectionInner product={product} faqItems={faqItems} showFaq={showFaq} initialReviews={initialReviews} />
    </Suspense>
  );
}

function ProductFaqAccordion({ items, locale }: { items: { question: string; answer: string }[]; locale: string }) {
  const [isFaqMasterOpen, setIsFaqMasterOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  return (
    <div className="mb-10 rounded-2xl bg-zinc-950 border border-white/10 overflow-hidden shadow-2xl">
      <button
        type="button"
        onClick={() => setIsFaqMasterOpen(prev => !prev)}
        className="w-full flex items-center justify-between p-4 sm:p-5 md:p-6 text-left group cursor-pointer hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors select-none touch-manipulation"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <span className="text-sm sm:text-base md:text-lg font-black uppercase tracking-wider text-white group-hover:text-[#e32f8c] transition-colors font-[family-name:var(--font-oswald)]">
            {locale === 'ro' ? 'ÎNTREBĂRI FRECVENTE (FAQ)' : 'FREQUENTLY ASKED QUESTIONS'}
          </span>
          <span className="text-[10px] font-black uppercase text-[#e32f8c] bg-[#e32f8c]/15 border border-[#e32f8c]/30 px-2 py-0.5 rounded-full shrink-0">
            {items.length} {locale === 'ro' ? 'întrebări' : 'answers'}
          </span>
        </div>
        <div className={cn(
          "w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 group-hover:text-[#e32f8c] group-hover:border-[#e32f8c]/40 transition-colors duration-150 shrink-0",
          isFaqMasterOpen && "border-[#e32f8c]/50 text-[#e32f8c] bg-[#e32f8c]/15"
        )}>
          <Plus className={cn("w-4 h-4 transition-transform duration-200 ease-out will-change-transform", isFaqMasterOpen && "rotate-45 text-[#e32f8c]")} />
        </div>
      </button>

      {isFaqMasterOpen && (
        <div 
          className="bg-black/40 border-t border-white/10 animate-in fade-in duration-150"
          style={{ willChange: 'opacity' }}
        >
          <div className="p-4 sm:p-6 divide-y divide-white/5 space-y-2">
            {items.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={idx} className={idx === 0 ? "pb-3" : "pt-3 pb-3"}>
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(prev => prev === idx ? null : idx)}
                    className="w-full flex items-center justify-between gap-4 text-left group cursor-pointer py-1.5 active:opacity-70 transition-opacity select-none touch-manipulation"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    <span className={cn(
                      "text-xs sm:text-sm font-black uppercase tracking-wide transition-colors duration-150",
                      isOpen ? "text-[#e32f8c]" : "text-zinc-200 group-hover:text-white"
                    )}>
                      {item.question}
                    </span>
                    <div className="shrink-0 text-zinc-400 group-hover:text-[#e32f8c]">
                      <ChevronDown className={cn("w-4 h-4 transition-transform duration-200 ease-out will-change-transform", isOpen && "rotate-180 text-[#e32f8c]")} />
                    </div>
                  </button>
                  {isOpen && (
                    <div className="mt-2 text-xs sm:text-sm font-medium text-zinc-300 leading-relaxed pl-3 border-l-2 border-[#e32f8c] animate-in fade-in duration-100">
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewCard({ 
  review, 
  locale, 
  isProductPage, 
  onClick 
}: { 
  review: any; 
  locale: string; 
  isProductPage?: boolean; 
  onClick: () => void; 
}) {
  const hasImage = Boolean(review.image && typeof review.image === 'string' && !review.image.includes('cdn.shopify.com'));

  return (
    <div 
      onClick={onClick}
      className="w-full bg-zinc-950/85 rounded-2xl md:rounded-3xl border border-white/[0.08] hover:border-[#e32f8c]/50 hover:bg-zinc-900/90 hover:shadow-[0_12px_40px_rgba(227,47,140,0.15)] hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col overflow-hidden group shadow-lg"
    >
      {hasImage && (
        <div className="relative w-full aspect-[4/5] bg-zinc-900 overflow-hidden shrink-0">
          <img
            src={review.image}
            alt={`Review by ${review.name}`}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        </div>
      )}
      
      <div className="p-3.5 sm:p-4 md:p-5 flex flex-col flex-1">
        {/* Author Header YoungLA Style */}
        <div className="mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-black text-xs sm:text-sm text-white tracking-tight">
              {review.name}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-[#e32f8c]">
              <CheckCircle2 className="w-3 h-3 fill-[#e32f8c]/20" />
              <span>{locale === 'ro' ? 'Verificat' : 'Verified'}</span>
            </span>
          </div>
          <span className="text-[10px] sm:text-[11px] text-zinc-500 font-medium block mt-0.5">
            {review.date}
          </span>
        </div>

        {/* Rating Stars */}
        <div className="flex items-center gap-0.5 mb-2">
          {[...Array(review.rating || 5)].map((_, i) => (
            <Star key={i} className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.35)]" />
          ))}
        </div>

        {/* Review Text */}
        <p className="text-xs sm:text-sm font-normal text-zinc-300 leading-relaxed group-hover:text-white transition-colors">
          "{review.text}"
        </p>

        {/* Item Type (YoungLA style metadata, subtle text) */}
        {review.itemType && (
          <div className="mt-2.5 pt-2 border-t border-white/[0.06] text-[10px] sm:text-[11px]">
            <span className="text-zinc-500 font-medium">{locale === 'ro' ? 'Model: ' : 'Item type: '}</span>
            <span className="text-zinc-300 font-bold">{review.itemType}</span>
          </div>
        )}

        {/* Bottom details / Product Pill - ONLY on general / Home page */}
        {!isProductPage && review.product && (
          <div className="mt-auto pt-2.5 border-t border-white/[0.06]">
            <div className="flex items-center gap-2 p-1.5 rounded-xl bg-white/[0.03] border border-white/5 group-hover:border-[#e32f8c]/30 transition-colors">
              <ProductThumbnail product={review.product} size="small" />
              <span className="text-[10px] font-black uppercase text-zinc-300 group-hover:text-[#e32f8c] transition-colors truncate">
                {typeof review.product.name === 'string' ? review.product.name : review.product.name?.[locale] || 'Produs'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewModal({ 
  review, 
  locale, 
  isProductPage, 
  onClose 
}: { 
  review: any; 
  locale: string; 
  isProductPage?: boolean; 
  onClose: () => void; 
}) {
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 md:p-6"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 28, stiffness: 350 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[calc(100svh-2rem)] bg-zinc-950/95 backdrop-blur-2xl border-2 border-[#e32f8c]/40 hover:border-[#e32f8c]/60 shadow-[0_0_60px_rgba(227,47,140,0.3)] text-white rounded-3xl relative overflow-hidden flex flex-col"
      >
        {/* Ambient Neon Purple/Pink Glow Accents */}
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-[#e32f8c]/15 rounded-full blur-[100px] pointer-events-none -z-0" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-purple-900/15 rounded-full blur-[100px] pointer-events-none -z-0" />

        {/* Pinned Close Button: ALWAYS visible, NEVER scrolls out of view */}
        <button 
          onClick={onClose}
          aria-label={locale === 'ro' ? 'Închide recenzia' : 'Close review'}
          className="absolute top-3.5 right-3.5 z-50 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-zinc-900/90 hover:bg-[#e32f8c] border border-white/20 hover:border-white/40 text-zinc-200 hover:text-white flex items-center justify-center transition-all duration-200 shadow-2xl backdrop-blur-md cursor-pointer active:scale-95"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Dedicated Scroll Container with Modern Sleek Pink-Tinted Scrollbar */}
        <div className="w-full overflow-y-auto review-modal-scroll flex flex-col md:flex-row flex-1">
          {/* Image Section */}
          {review.image && typeof review.image === 'string' && !review.image.includes('cdn.shopify.com') && (
            <div className="w-full md:w-[50%] aspect-[4/5] md:aspect-auto md:min-h-[480px] relative bg-gradient-to-b from-black/80 via-zinc-950 to-zinc-900 border-b md:border-b-0 md:border-r border-white/10 shrink-0 flex items-center justify-center overflow-hidden">
              <Image
                src={review.image}
                alt={`Review by ${review.name}`}
                fill
                className="object-contain p-3 md:p-6 drop-shadow-2xl"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          )}

          {/* Content Section */}
          <div className={`w-full p-5 sm:p-7 md:p-8 flex flex-col relative z-10 ${!review.image ? 'md:w-full' : 'md:w-[50%]'}`}>
            
            <div className="flex items-center gap-2 mb-1.5 pr-10">
              <span className="text-lg sm:text-xl md:text-2xl font-black text-white uppercase font-heading tracking-tight">
                {review.name}
              </span>
              <CheckCircle2 className="w-4 h-4 text-[#e32f8c] shrink-0" />
            </div>
            
            <span className="text-xs font-semibold text-zinc-400 mb-3">{review.date}</span>

            <div className="flex items-center gap-1 mb-4">
              {[...Array(review.rating || 5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]" />
              ))}
            </div>

            <p className="text-sm sm:text-base md:text-lg font-medium text-zinc-200 leading-relaxed mb-6">
              "{review.text}"
            </p>

            <div className="mt-auto space-y-3">
              {review.itemType && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold uppercase tracking-wider text-zinc-400">
                    Model:
                  </span>
                  <span className="font-black text-white bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                    {review.itemType}
                  </span>
                </div>
              )}
              {review.fit && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold uppercase tracking-wider text-zinc-400">
                    {locale === 'ro' ? 'Potrivire:' : 'Fit:'}
                  </span>
                  <span className="inline-block px-2.5 py-0.5 bg-[#e32f8c]/10 border border-[#e32f8c]/30 rounded text-xs font-bold text-white">
                    {review.fit}
                  </span>
                </div>
              )}

              {/* Product Purchased ("PRODUS ACHIZIȚIONAT") - Only on Homepage */}
              {!isProductPage && review.product && (
                <div className="pt-4 mt-2 border-t border-white/10">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-2">
                    {locale === 'ro' ? 'Produs achiziționat' : 'Purchased Product'}
                  </span>
                  <a 
                    href={`/${locale}/product/${review.product.slug}`} 
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-3.5 p-3 rounded-2xl bg-zinc-900/90 border border-white/10 hover:border-[#e32f8c]/60 hover:bg-[#e32f8c]/5 hover:shadow-[0_0_20px_rgba(227,47,140,0.2)] transition-all duration-300 group/modalprod"
                  >
                    <ProductThumbnail product={review.product} size="large" />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-black uppercase text-white group-hover/modalprod:text-[#e32f8c] transition-colors truncate">
                        {typeof review.product.name === 'string' ? review.product.name : review.product.name?.[locale] || (locale === 'ro' ? 'Produs' : 'Product')}
                      </span>
                      <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1 mt-0.5 group-hover/modalprod:text-zinc-300">
                        <span>{locale === 'ro' ? 'Vezi produsul' : 'View product'}</span>
                        <ArrowRight className="w-3 h-3 text-[#e32f8c] group-hover/modalprod:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </a>
                </div>
              )}

            </div>

          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

function ProductThumbnail({
  product,
  size
}: {
  product: { image?: string; name?: string | Record<string, string> };
  size: 'small' | 'large';
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const dimensions = size === 'small' ? 'w-6 h-6 sm:w-7 sm:h-7' : 'w-12 h-12';
  const iconSize = size === 'small' ? 'w-3 h-3 sm:w-3.5 sm:h-3.5' : 'w-6 h-6';

  return (
    <div className={`${dimensions} rounded-lg sm:rounded-xl overflow-hidden bg-black/60 border border-[#e32f8c]/30 flex items-center justify-center shrink-0 shadow-inner`} aria-hidden="true">
      {product.image && typeof product.image === 'string' && !product.image.includes('cdn.shopify.com') && !imageFailed ? (
        <Image
          src={product.image}
          alt=""
          width={size === 'small' ? 28 : 48}
          height={size === 'small' ? 28 : 48}
          className="w-full h-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <Package className={`${iconSize} text-[#e32f8c]`} />
      )}
    </div>
  );
}
