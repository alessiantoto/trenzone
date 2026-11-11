"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  Star,
  Search,
  ArrowRight,
  CheckCircle2,
  Camera,
  ArrowLeft,
  Quote,
  TrendingUp,
  Users,
  Award,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";
import { Input } from "@/components/ui/input";
import { StarRating } from "@/components/ui/StarRating";
import { cn } from "@/lib/utils";

export function ReviewsClient({ initialReviews }: { initialReviews: any[] }) {
  const t = useTranslations("ReviewsPage");
  const tHome = useTranslations("Home");
  const locale = useLocale();
  const [reviews] = useState<any[]>(initialReviews || []);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "photo" | "recent" | number>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const reviewsPerPage = 9;

  // Aggregate Stats
  const stats = useMemo(() => {
    if (reviews.length === 0) return { avg: 4.9, count: 0, photos: 0 };
    const total = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    return {
      avg: parseFloat((total / reviews.length).toFixed(1)),
      count: reviews.length,
      photos: reviews.filter((r) => r.image_url).length,
    };
  }, [reviews]);

  // Combined Filter & Search
  const filteredReviews = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return reviews
      .filter((r) => {
        const prodName = r.product?.name
          ? typeof r.product.name === "object"
            ? String(r.product.name[locale] || r.product.name.ro || r.product.name.en || "")
            : String(r.product.name)
          : "";
        const matchesSearch =
          String(r.customer_name || "").toLowerCase().includes(query) ||
          prodName.toLowerCase().includes(query) ||
          String(r.comment || "").toLowerCase().includes(query);

        const matchesFilter =
          activeFilter === "all"
            ? true
            : activeFilter === "photo"
            ? !!r.image_url
            : activeFilter === "recent"
            ? true
            : typeof activeFilter === "number"
            ? r.rating === activeFilter
            : true;

        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        if (activeFilter === "recent") {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        return 0;
      });
  }, [reviews, searchTerm, activeFilter, locale]);

  // Pagination
  const totalPages = Math.ceil(filteredReviews.length / reviewsPerPage);
  const currentReviews = filteredReviews.slice(
    (currentPage - 1) * reviewsPerPage,
    currentPage * reviewsPerPage
  );

  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary selection:text-black pt-16 md:pt-24 focus:outline-none">
      {/* 1. HERO SECTION - COMPACT ON MOBILE */}
      <section className="relative pt-8 pb-8 md:pt-16 md:pb-16 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 blur-[180px] rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 blur-[150px] rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="container mx-auto px-6 relative z-10">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-4 md:mb-6 group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-[9px] font-black uppercase tracking-widest leading-none">
              {tHome("hero_cta_shop")}
            </span>
          </Link>

          <div className="max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 mb-2 md:mb-4"
            >
              <div className="h-[1px] w-8 md:w-12 bg-primary/50" />
              <span className="text-primary font-black uppercase tracking-[0.4em] text-[8px] md:text-[10px]">
                {tHome("reviews_title")}
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-7xl lg:text-[100px] font-heading font-black uppercase tracking-tighter mb-4 md:mb-6 leading-[0.9]"
            >
              <span className="block">{t("hero_title").split(" ")[0]}</span>
              <span className="text-primary italic">{t("hero_title").split(" ")[1]}</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-zinc-400 text-sm md:text-xl max-w-2xl font-medium leading-[1.6]"
            >
              {t("hero_subtitle", { count: stats.count || 120 })}
            </motion.p>
          </div>

          {/* Aggregate Stats Bar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8 md:mt-12 bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-6 md:p-10"
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                  {t("stats_avg")}
                </p>
                <div className="flex items-end gap-3">
                  <span className="text-4xl md:text-6xl font-black italic tracking-tighter">{stats.avg}</span>
                  <div className="flex flex-col mb-1 md:mb-2 text-primary">
                    <StarRating rating={stats.avg} size="sm" starClassName="!text-primary !fill-primary" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mt-1">
                      {locale === 'ro' ? 'SINCER ȘI VERIFICAT' : 'HONEST & VERIFIED'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                  {t("stats_athletes")}
                </p>
                <div className="flex items-end gap-3">
                  <span className="text-4xl md:text-6xl font-black italic tracking-tighter">
                    {stats.count}+
                  </span>
                  <Users className="w-6 h-6 md:w-10 md:h-10 text-primary mb-1 md:mb-2" />
                </div>
              </div>

              <div className="space-y-1 hidden lg:block border-l border-white/5 pl-12">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                  {t("filter_photos")}
                </p>
                <div className="flex items-end gap-3">
                  <span className="text-4xl md:text-6xl font-black italic tracking-tighter">{stats.photos}</span>
                  <Camera className="w-10 h-10 text-primary mb-2" />
                </div>
              </div>

              <div className="space-y-1 hidden lg:block border-l border-white/5 pl-12">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                  {t("stats_verified")}
                </p>
                <div className="flex items-end gap-3">
                  <span className="text-4xl md:text-6xl font-black italic tracking-tighter">100%</span>
                  <Award className="w-10 h-10 text-primary mb-2" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. SEARCH & FILTERS HUB */}
      <section className="py-12 border-y border-white/5">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-8 items-stretch lg:items-center">
            {/* Search Input */}
            <div className="relative group flex-1">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
              <Input
                type="text"
                placeholder={t("search_placeholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-14 pr-6 py-8 rounded-[1.5rem] bg-zinc-900 border-white/5 text-lg font-medium focus:ring-primary/20 transition-all placeholder:text-zinc-600"
              />
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap items-center gap-3">
              {[
                { id: "all", label: t("filter_all"), icon: null },
                { id: "photo", label: t("filter_photos"), icon: Camera },
                { id: "recent", label: t("filter_recent"), icon: TrendingUp },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id as any)}
                  className={cn(
                    "flex items-center gap-2 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95",
                    activeFilter === f.id ? "bg-primary text-black" : "bg-zinc-900 text-zinc-500 hover:bg-zinc-800"
                  )}
                >
                  {f.icon && <f.icon className="w-3.5 h-3.5" />}
                  {f.label}
                </button>
              ))}

              <div className="flex items-center gap-2 ml-2">
                {[5, 4].map((stars) => (
                  <button
                    key={stars}
                    onClick={() => setActiveFilter(activeFilter === stars ? "all" : stars)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                      activeFilter === stars
                        ? "bg-primary/20 text-primary border border-primary/20"
                        : "bg-zinc-900 text-zinc-600 hover:bg-zinc-800 border border-transparent"
                    )}
                  >
                    {stars} <Star className="w-3 h-3 fill-current" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. REVIEWS GRID */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-6">
          <AnimatePresence mode="wait">
            {currentReviews.length > 0 ? (
              <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
                {currentReviews.map((rev) => (
                  <motion.div
                    key={rev.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col h-full group"
                  >
                    <div className="bg-zinc-900/40 rounded-[2.5rem] border border-white/5 p-8 md:p-10 flex flex-col flex-1 hover:bg-zinc-900/60 transition-all duration-700">
                      {/* Review Header */}
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex flex-col gap-1">
                          <p className="text-[10px] font-black text-primary uppercase tracking-[0.25em]">
                            {rev.customer_name}
                          </p>
                          <div className="flex gap-0.5 text-primary">
                            {[...Array(5)].map((_, star) => (
                              <Star
                                key={star}
                                className={cn("w-3.5 h-3.5", star < rev.rating ? "fill-current" : "text-zinc-800")}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="px-3 py-1 rounded-full bg-white/5 flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3 text-primary" />
                          <span className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">
                            {locale === 'ro' ? 'Verificat' : 'Verified'}
                          </span>
                        </div>
                      </div>

                      {/* Comment */}
                      <div className="relative flex-1">
                        <Quote className="absolute -left-2 -top-2 w-8 h-8 text-primary opacity-10" />
                        <p className="text-zinc-300 text-base md:text-xl font-medium leading-relaxed italic relative z-10 pl-2">
                          &quot;{rev.comment}&quot;
                        </p>
                      </div>

                      {/* Photo if exists */}
                      {rev.image_url && !rev.image_url.includes("cdn.shopify.com") && (
                        <div className="mt-8 rounded-2xl overflow-hidden aspect-[16/9] relative group-hover:scale-[1.02] transition-transform duration-700">
                          <Image
                            src={rev.image_url}
                            alt="Review Image"
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 33vw"
                          />
                        </div>
                      )}

                      {/* Product Tag */}
                      {rev.product && (
                        <Link
                          href={`/product/${rev.product.slug}`}
                          className="mt-10 flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 group-hover:bg-primary transition-all duration-500 group-hover:border-primary"
                        >
                          <div className="w-12 h-12 bg-black rounded-xl overflow-hidden flex-shrink-0 relative">
                            {rev.product.image && !rev.product.image.includes("cdn.shopify.com") ? (
                              <Image
                                src={rev.product.image}
                                alt={
                                  typeof rev.product.name === "object"
                                    ? String(
                                        rev.product.name[locale] ||
                                          rev.product.name.ro ||
                                          rev.product.name.en ||
                                          "Product"
                                      )
                                    : String(rev.product.name || "Product")
                                }
                                fill
                                className="object-cover"
                                sizes="48px"
                              />
                            ) : null}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[7px] font-black text-zinc-500 uppercase tracking-widest group-hover:text-black/60">
                              {locale === 'ro' ? 'Achiziționat' : 'Purchased'}
                            </p>
                            <p className="text-xs font-black text-white uppercase tracking-tighter truncate group-hover:text-black">
                              {typeof rev.product.name === "object"
                                ? rev.product.name[locale] || rev.product.name.ro || rev.product.name.en || ""
                                : rev.product.name}
                            </p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-primary group-hover:text-black transition-colors" />
                        </Link>
                      )}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-40 gap-6"
              >
                <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center border border-white/5">
                  <Search className="w-8 h-8 text-zinc-700" />
                </div>
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm">
                  {t("no_results")}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-20 flex justify-center gap-2">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={cn(
                    "w-12 h-12 rounded-xl text-xs font-black transition-all",
                    currentPage === i + 1
                      ? "bg-primary text-black shadow-lg shadow-primary/20"
                      : "bg-zinc-900 text-zinc-500 hover:bg-zinc-800"
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="pb-32">
        <div className="container mx-auto px-6">
          <div className="bg-zinc-900 rounded-[3rem] p-12 md:p-24 text-center relative overflow-hidden border border-white/5">
            <div className="absolute top-0 right-0 w-[500px] h-full bg-primary/20 blur-[150px] skew-x-12 translate-x-1/2" />

            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="text-4xl md:text-7xl font-heading font-black uppercase tracking-tighter text-white mb-8 leading-none italic">
                {locale === 'ro' ? (
                  <>Vrei să intri în <br />{" "}<span className="text-primary italic underline underline-offset-8">COMUNITATE?</span></>
                ) : (
                  <>Want to join the <br />{" "}<span className="text-primary italic underline underline-offset-8">COMMUNITY?</span></>
                )}
              </h2>
              <Link
                href="/shop"
                className="inline-flex items-center gap-4 bg-white text-black px-12 py-6 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-primary transition-all active:scale-95 shadow-2xl"
              >
                GEAR UP NOW <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

