"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { motion } from "framer-motion";
import { Target, Zap } from "lucide-react";
import Image from "next/image";

interface TechLabSectionProps {
  // Localization is internal
}

export function TechLabSection({}: TechLabSectionProps) {
  const t = useTranslations("Home");
  return (
    <section id="tech-lab" className="pt-4 pb-12 md:pt-8 md:pb-24 bg-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-1/2 h-full bg-zinc-50 -skew-x-12 translate-x-1/4 z-0 hidden lg:block" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-stretch gap-4 lg:gap-16 max-w-7xl mx-auto">
          <div className="lg:w-1/2 flex flex-col justify-center">
            <h2 className="text-3xl md:text-7xl font-heading font-black uppercase tracking-tighter mb-2 leading-none text-black">
              {t('tech_lab_heading')}
            </h2>

            <p className="text-zinc-600 text-base md:text-xl font-medium leading-[1.5] mb-4 max-w-xl">
              {t('tech_lab_desc')}
            </p>

            <div className="grid grid-cols-2 gap-3 md:gap-6 mb-4 lg:mb-0">
              <motion.div
                whileHover={{ y: -3 }}
                className="flex items-center gap-3 bg-[#f8f8fb] p-4 rounded-[2rem] border border-zinc-200/50 shadow-sm transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-inner shrink-0">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] md:text-[12px] font-black text-black uppercase tracking-tighter leading-tight" dangerouslySetInnerHTML={{ __html: t('tech_lab_feature_cnc') }} />
                </div>
              </motion.div>

              <motion.div
                whileHover={{ y: -3 }}
                className="flex items-center gap-3 bg-[#f8f8fb] p-4 rounded-[2rem] border border-zinc-200/50 shadow-sm transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-inner shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] md:text-[12px] font-black text-black uppercase tracking-tighter leading-tight" dangerouslySetInnerHTML={{ __html: t('tech_lab_feature_hybrid') }} />
                </div>
              </motion.div>
            </div>
          </div>

          <div className="lg:w-1/2 relative w-full pt-0 lg:pt-4 flex flex-col">
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="relative aspect-square lg:aspect-auto w-full lg:flex-1 lg:h-full rounded-[30px] md:rounded-[60px] overflow-hidden border-[6px] border-white shadow-2xl glass-reflection"
            >
              <Image
                src="/images/products/apolo_cutii_jeleuri.webp"
                alt="TrenZone Nutrition"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
