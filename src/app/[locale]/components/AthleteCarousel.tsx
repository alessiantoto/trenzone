"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import { Product } from "@/lib/api";

const athleteSetups = [
  {
    name: "Alessian Noje",
    handle: "@alessiannoje",
    followers: "+200K",
    tagline: "Strongest Push-Ups",
    img: "/images/lifestyle/maieu_si_jeleuri.webp",
    products: ["paralele-de-lemn-cu-baza-metalica", "bandaje-protectie-incheietura-albe", "manseta-compresie"],
    productNames: ["Paralele Hibrid", "Bandaje Albe", "Manșetă Compresie"],
  },
  {
    name: "Vlad Tren",
    handle: "@vladtren",
    followers: "+200K",
    tagline: "Strongest 17yo",
    img: "/images/lifestyle/vlad_tren.webp",
    objectPosition: "object-[center_15%]",
    products: ["manseta-compresie", "centura-ridicare-greutati", "creta-lichida"],
    productNames: ["Manșete Compresie", "Centură Greutăți", "Cretă Lichidă"],
  },
];

interface AthleteCarouselProps {
  liveProducts: Product[];
  locale: string;
}

export default function AthleteCarousel({ liveProducts, locale }: AthleteCarouselProps) {
  const t = useTranslations("Home");
  return (
    <section className="pt-4 pb-16 md:pt-12 md:pb-24 bg-black text-white relative overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <h2 className="text-4xl md:text-7xl font-heading font-black uppercase tracking-tighter mb-4 leading-none">{t('athlete_setup_title')}</h2>
            <p className="text-zinc-400 text-lg font-medium">{t('athlete_setup_subtitle')}</p>
          </div>
        </div>

        <div
          className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden"
          style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
        >
          {athleteSetups.map((athlete, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex-shrink-0 w-[340px] md:w-[450px] snap-center group"
            >
              <div className="relative aspect-[2/3] md:aspect-[4/5] rounded-3xl overflow-hidden border border-white/5 bg-zinc-900 group-hover:border-primary/20 transition-all duration-700">
                <Image
                  src={athlete.img}
                  alt={athlete.name}
                  fill
                  className={`object-cover ${('objectPosition' in athlete) ? (athlete.objectPosition as string) : 'object-center'} grayscale md:grayscale-0 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-1000`}
                  sizes="(max-width: 768px) 340px, 450px"
                  priority={idx === 0}
                />
                
                <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-black/90 via-black/40 to-transparent z-10 pointer-events-none" />

                <div className="absolute top-8 left-8 right-8 z-20">
                  <div className="flex flex-col gap-1.5">
                    <p className="text-white font-black text-2xl md:text-4xl uppercase tracking-tighter transition-colors group-hover:text-primary leading-none drop-shadow-[0_2px_10px_rgba(0,0,0,1)]">
                      {athlete.handle}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <p className="text-primary font-black text-[11px] md:text-[13px] uppercase tracking-[0.2em] italic drop-shadow-md">
                        {athlete.followers} {t('followers_label')}
                      </p>
                      {'tagline' in athlete && (
                        <span className="bg-primary text-black px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest italic shadow-xl shadow-primary/20">
                          {t(`athlete_${idx + 1}_tagline` as any)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-8 left-8 right-8 z-20">
                  <div className="flex gap-4 mb-6">
                    {athlete.products.map((pSlug, i) => {
                      const product = liveProducts.find((p: Product) => p.slug === pSlug);
                      if (!product) return null;
                      return (
                        <motion.div
                          key={i}
                          animate={{ y: [0, -8, 0] }}
                          transition={{
                            duration: 4 + i * 0.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: i * 0.4
                          }}
                          className="relative group/prod"
                        >
                          <Link
                            href={`/product/${pSlug}`}
                            className="block w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-white/20 overflow-hidden hover:border-primary hover:scale-110 transition-all shadow-xl relative z-10"
                          >
                            <Image
                              src={product.image}
                              alt={typeof product.name === 'object' ? (product.name as any)[locale] || (product.name as any)['ro'] : product.name as string}
                              fill
                              className="object-cover"
                              sizes="56px"
                            />
                          </Link>

                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/prod:opacity-100 transition-opacity pointer-events-none z-50">
                            <div className="bg-black/95 backdrop-blur-md text-white text-[7px] font-black uppercase tracking-widest px-2 py-1 rounded-md border border-white/5 whitespace-nowrap shadow-2xl">
                              {typeof product.name === 'object' ? (product.name as any)[locale] || (product.name as any)['ro'] : product.name as string}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  <Link
                    href="/bundle"
                    className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-primary text-black hover:bg-white transition-all duration-500 font-black text-[10px] uppercase tracking-[0.2em] group/cta shadow-lg shadow-primary/20 active:scale-[0.98]"
                  >
                    {t('get_setup_cta')}
                    <ArrowRight className="w-4 h-4 group-hover/cta:translate-x-1.5 transition-transform duration-300" />
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
