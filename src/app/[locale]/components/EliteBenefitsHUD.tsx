"use client";

import { motion } from "framer-motion";
import { Shield, Zap, Target, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/routing";

export function EliteBenefitsHUD() {
  const t = useTranslations("Home");

  const BENEFITS = [
    {
      id: "grip",
      title: t('benefits_grip_title'),
      desc: t('benefits_grip_desc'),
      icon: Target,
      image: "/images/ui/informatii_nutritionale.webp",
      tag: t('benefits_grip_tag')
    },
    {
      id: "durability",
      title: t('benefits_durability_title'),
      desc: t('benefits_durability_desc'),
      icon: Shield,
      image: "/images/lifestyle/jeleuri_in_mana.webp",
      tag: t('benefits_durability_tag')
    },
    {
      id: "power",
      title: t('benefits_power_title'),
      desc: t('benefits_power_desc'),
      icon: Zap,
      image: "/images/lifestyle/apolo_cutii_jeleuri_zambeste.webp",
      tag: t('benefits_power_tag')
    }
  ];

  return (
    <section className="bg-[#020202] py-24 md:py-40 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[150px] rounded-full pointer-events-none" />
      
      <div className="container mx-auto px-6 relative z-10">
        <header className="max-w-3xl mb-24 md:mb-32">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex items-center gap-4 mb-6"
          >
            <span className="w-12 h-[1px] bg-primary" />
            <span className="text-primary text-[10px] font-black tracking-[0.5em] uppercase">{t('benefits_hud_advanced')}</span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-white font-heading font-black text-5xl md:text-8xl leading-[0.85] tracking-[-0.05em] uppercase italic"
          >
            {t('benefits_hud_title_part1')} <br />
            <span className="text-primary">{t('benefits_hud_title_highlight')}</span>
          </motion.h2>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {BENEFITS.map((benefit, i) => (
            <motion.div
              key={benefit.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
              className="group relative"
            >
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/50">
                <Image
                  src={benefit.image}
                  alt={benefit.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover grayscale transition-all duration-700 group-hover:scale-110 group-hover:grayscale-0 brightness-50 group-hover:brightness-75"
                />
                
                <div className="absolute inset-0 p-8 flex flex-col justify-between z-10">
                  <div className="flex justify-between items-start">
                    <div className="p-3 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 text-primary">
                      <benefit.icon size={24} />
                    </div>
                    <span className="text-[10px] font-mono text-white/20 tracking-widest">{benefit.tag}</span>
                  </div>

                  <div>
                    <h3 className="text-2xl md:text-3xl font-heading font-black text-white mb-4 uppercase italic">
                      {benefit.title}
                    </h3>
                    <p className="text-white/60 text-sm md:text-base font-medium leading-relaxed mb-8 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      {benefit.desc}
                    </p>
                    <div className="flex items-center gap-2 text-primary font-black text-[10px] tracking-[0.3em] uppercase pt-4 border-t border-white/10 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                      <span>{t('benefits_technical_details')}</span>
                      <ArrowRight size={14} />
                    </div>
                  </div>
                </div>

                <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                  <motion.div
                    animate={{ y: ["0%", "200%"] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="w-full h-[150%] bg-gradient-to-b from-transparent via-primary/5 to-transparent absolute top-[-100%]"
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-24 md:mt-32 flex flex-col md:flex-row items-center justify-between gap-12 p-8 md:p-16 bg-white/[0.02] backdrop-blur-2xl border border-white/5 rounded-[40px]"
        >
          <div className="max-w-xl">
             <h4 className="text-3xl md:text-5xl font-heading font-black text-white uppercase italic leading-none mb-6">
               {t('benefits_cta_ready')} <span className="text-primary">{t('benefits_cta_ready_highlight')}</span>
             </h4>
             <p className="text-white/40 text-lg uppercase tracking-tight font-heading italic">
               {t('benefits_cta_manifesto')}
             </p>
          </div>
          <Link
            href="/shop"
            className="group relative flex items-center justify-center gap-6 px-12 py-7 rounded-full bg-primary text-black font-black uppercase tracking-[0.3em] text-lg transition-all hover:scale-[1.05] shadow-[0_30px_60px_rgba(249,115,22,0.3)] overflow-hidden"
          >
             <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
             <span className="relative z-10">{t('benefits_cta_button')}</span>
             <ArrowRight className="relative z-10 transition-transform group-hover:translate-x-2" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
