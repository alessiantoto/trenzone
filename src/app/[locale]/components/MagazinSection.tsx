"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Truck, RotateCcw, ShieldCheck, Loader2, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { ProductCard } from "@/components/product/ProductCard";
import { Link } from "@/i18n/routing";
import { Product } from "@/lib/api";
import { getProductPrice } from "@/utils/pricing";
import { useRegionStore } from "@/store/useRegionStore";

interface MagazinSectionProps {
  products: Product[];
  locale: string;
}

export function MagazinSection({ products, locale }: MagazinSectionProps) {
  const t = useTranslations("Home");
  const [activeTab, setActiveTab] = useState("top_vanzari");
  const [isLoading] = useState(false); // Data is now pre-fetched per server

  const { currency } = useRegionStore();

  const displayProducts = useMemo(() => {
    if (activeTab === "top_vanzari") {
      return [...products].sort((a, b) => getProductPrice(b.price, currency) - getProductPrice(a.price, currency)).slice(0, 4);
    }
    return products.filter(p => {
      const pName = typeof p.name === 'object' ? (p.name as any)[locale] || (p.name as any)['ro'] : p.name;
      return pName.toLowerCase().includes("bandaj");
    }).slice(0, 4);
  }, [products, activeTab, locale]);

  return (
    <section className="pt-0 pb-4 md:pt-0 md:pb-8 bg-white rounded-t-[40px] md:rounded-t-[80px] -translate-y-[60px] relative z-30 shadow-[0_-20px_50px_rgba(0,0,0,0.1)] overflow-hidden">
      {/* TRUST TICKER */}
      <div className="bg-primary py-3 border-b border-black/5 mb-12 overflow-hidden">
        <div className="flex whitespace-nowrap gap-10 items-center text-black animate-marquee">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-10 flex-shrink-0">
              <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <Truck className="w-4 h-4" /> {t('ticker_shipping')}
              </span>
              <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <RotateCcw className="w-4 h-4" /> {t('ticker_return')}
              </span>
              <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> {t('ticker_quality')}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-6">
        <div className="mb-12 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
            <motion.h2
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-7xl font-heading font-black tracking-tighter text-black uppercase leading-none"
            >
              {t('shop_title')}
            </motion.h2>

            <div className="flex gap-8 md:gap-12 overflow-x-auto text-xl md:text-3xl font-bold tracking-tight pb-2 scrollbar-hide scroll-smooth">
              <button
                onClick={() => setActiveTab('top_vanzari')}
                className={`pb-1 transition-all whitespace-nowrap relative ${activeTab === 'top_vanzari' ? 'text-orange-700' : 'text-zinc-500 hover:text-zinc-700'}`}
              >
                {t('tab_best_sellers')}
                {activeTab === 'top_vanzari' && <motion.div layoutId="underline" className="absolute -bottom-1 left-0 right-0 h-[3px] bg-primary rounded-full" />}
              </button>
              <button
                onClick={() => setActiveTab('accesorii')}
                className={`pb-1 transition-all whitespace-nowrap relative ${activeTab === 'accesorii' ? 'text-orange-700' : 'text-zinc-500 hover:text-zinc-700'}`}
              >
                {t('tab_accessories')}
                {activeTab === 'accesorii' && <motion.div layoutId="underline" className="absolute -bottom-1 left-0 right-0 h-[3px] bg-primary rounded-full" />}
              </button>
            </div>
          </div>

          <div className={`grid grid-cols-2 ${displayProducts.length <= 2 ? 'sm:grid-cols-2 max-w-2xl mx-auto' : 'md:grid-cols-3 lg:grid-cols-4'} gap-3 sm:gap-6 md:gap-8`}>
            {isLoading ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 animate-pulse">Sincronizăm Bestiile...</p>
              </div>
            ) : (
              displayProducts.map((product, idx) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  viewport={{ once: true }}
                >
                  <ProductCard product={product} priority={idx < 4} />
                </motion.div>
              ))
            )}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="mt-12 flex justify-center"
          >
            <Link
              href="/shop"
              className="group flex items-center gap-4 px-10 py-5 rounded-2xl bg-black text-white hover:bg-primary hover:text-black transition-all duration-500 font-black uppercase tracking-widest text-xs shadow-xl hover:shadow-primary/20"
            >
              <span>{t('view_all_products', { defaultValue: 'VEZI TOT CATALOGUL' })}</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
