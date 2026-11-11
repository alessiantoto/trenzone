"use client";

import { useTranslations } from "next-intl";
import { Star, BadgeCheck, Loader2, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import { StarRating } from "@/components/ui/StarRating";
import { motion } from "framer-motion";

interface ReviewSectionProps {
  reviewStats: { count: number; average: number };
  liveReviews: any[];
  isReviewsLoading: boolean;
  locale: string;
}

export function ReviewSection({ reviewStats, liveReviews, isReviewsLoading, locale }: ReviewSectionProps) {
  const t = useTranslations("Home");
  return (
    <section className="pt-6 pb-12 md:pt-12 md:pb-20 bg-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 md:mb-12">
          <div className="max-w-2xl text-left">
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              className="text-primary font-black uppercase tracking-[0.5em] text-[10px] mb-4"
            >
              {t('reviews_title')}
            </motion.p>
            <h2 className="text-4xl md:text-8xl font-heading font-black uppercase tracking-tighter text-black leading-none mb-4 drop-shadow-sm">{t('reviews_heading')}</h2>

            <div className="flex items-center gap-4 mb-4">
              <StarRating
                rating={reviewStats.average}
                size="md"
                starClassName="!text-primary !fill-primary"
              />
              <span className="text-black font-black text-lg tracking-tighter">{reviewStats.average}/5</span>
            </div>

            <p className="text-zinc-500 text-base md:text-xl font-medium tracking-tight max-w-xl">
              {t('reviews_subtitle', { count: reviewStats.count })}
            </p>
          </div>
        </div>

        <div
          className="flex md:grid md:grid-cols-3 gap-8 md:gap-10 overflow-x-auto md:overflow-visible pb-10 md:pb-0 snap-x snap-mandatory md:snap-none [&::-webkit-scrollbar]:hidden scroll-smooth"
          style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
        >
          {isReviewsLoading ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{t('reviews_loading')}</p>
            </div>
          ) : liveReviews.length > 0 ? (
            liveReviews.map((rev, i) => (
              <motion.div
                key={rev.id || i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="flex-shrink-0 w-[85vw] sm:w-[400px] md:w-auto snap-center"
              >
                <Link
                  href={`/product/${rev.product.slug}`}
                  className="flex flex-col h-full bg-white rounded-[2rem] overflow-hidden border border-zinc-100 shadow-xl hover:shadow-2xl transition-all duration-700 group active:scale-[0.98] relative"
                >
                  <div className="relative aspect-[16/9] overflow-hidden bg-zinc-50">
                    {rev.product?.image && !rev.product.image.includes('cdn.shopify.com') && (
                      <Image
                        src={rev.product.image}
                        alt={typeof rev.product.name === 'object' ? (rev.product.name as any)[locale] || (rev.product.name as any)['ro'] : rev.product.name}
                        fill
                        className="object-cover transition-transform duration-1000 group-hover:scale-105"
                        sizes="(max-width: 768px) 85vw, 400px"
                      />
                    )}
                    <div className="absolute top-4 left-4 flex gap-2">
                      <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-sm border border-black/5">
                        <BadgeCheck className="w-3.5 h-3.5 text-primary" />
                        <span className="text-[8px] font-black uppercase text-black tracking-widest italic">{t('verified_badge')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex flex-col gap-0.5">
                        <p className="text-[8px] font-black text-primary uppercase tracking-[0.2em] font-heading">
                          {typeof rev.product.name === 'object' ? (rev.product.name as any)[locale] || (rev.product.name as any)['ro'] : rev.product.name}
                        </p>
                        <div className="flex text-primary">
                          {[...Array(rev.rating)].map((_, star) => (
                            <Star key={star} className="w-3 h-3 fill-current" />
                          ))}
                        </div>
                      </div>
                    </div>

                    <p className="text-zinc-800 font-medium text-sm md:text-base leading-[1.45] mb-4 flex-1">&quot;{rev.comment}&quot;</p>

                    <div className="pt-4 border-t border-zinc-50 mt-auto">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <p className="font-heading font-black text-black text-lg uppercase tracking-tighter leading-none mb-1">{rev.customer_name}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="bg-primary hover:bg-black text-black hover:text-white font-black uppercase tracking-widest text-[8px] px-3 py-2 rounded-xl transition-all shadow-md shadow-primary/10 cursor-pointer">
                            {t('view_product_cta')}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-10 text-center text-zinc-400 font-bold uppercase tracking-widest text-xs">
              {t('reviews_empty')}
            </div>
          )}
        </div>

        <div className="flex justify-center mt-6 md:mt-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <Link
              href="/reviews"
              className="group flex items-center gap-6 bg-black text-white hover:bg-primary hover:text-black px-16 py-8 rounded-[2rem] font-black uppercase tracking-[0.4em] transition-all duration-700 shadow-2xl hover:shadow-primary/20 active:scale-[0.98] text-[10px] md:text-sm border border-white/10"
            >
              {t('view_all_reviews')}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
