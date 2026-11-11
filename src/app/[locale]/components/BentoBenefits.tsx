"use client";

import { motion } from "framer-motion";
import { Zap, Droplets, BatteryCharging, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useLocale } from "next-intl";

export function BentoBenefits() {
  const locale = useLocale();
  const isRo = locale === 'ro';

  return (
    <section className="w-full bg-white py-16 md:py-24 relative overflow-hidden">
      {/* Greek pattern background — continuity with section above */}
      <div
        className="absolute inset-0 pointer-events-none z-0 mix-blend-multiply opacity-40"
        style={{
          backgroundImage: "url('/images/ui/greek-pattern.jpg')",
          backgroundSize: '400px',
          backgroundRepeat: 'repeat',
        }}
      />
      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8">
        
        <div className="mb-12 md:mb-16 text-center max-w-3xl mx-auto">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-black text-black uppercase tracking-tight leading-[1.1]"
          >
            {isRo ? "Nu mai înghiți prafuri." : "Stop drinking powders."}
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mt-4 text-lg md:text-xl text-black/60 font-medium"
          >
            {isRo ? (
              <>
                Treci la nivelul următor cu cele mai bune{" "}
                <Link 
                  href="/jeleuri-cu-creatina" 
                  className="text-black font-bold underline decoration-[#e32f8c] decoration-2 underline-offset-4 hover:text-[#e32f8c] transition-colors"
                >
                  jeleuri cu creatină
                </Link>
                . Fără apă, fără shaker, fără compromisuri.
              </>
            ) : (
              <>
                Level up with the best{" "}
                <Link 
                  href="/jeleuri-cu-creatina" 
                  className="text-black font-bold underline decoration-[#e32f8c] decoration-2 underline-offset-4 hover:text-[#e32f8c] transition-colors"
                >
                  creatine gummies
                </Link>
                . No water, no shaker, no compromises.
              </>
            )}
          </motion.p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 auto-rows-[280px] md:auto-rows-[320px]">
          
          {/* Box 1: Large Feature */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="col-span-1 md:col-span-2 bg-[#f4f4f4] rounded-3xl p-8 md:p-12 flex flex-col justify-between relative overflow-hidden group"
          >
            <div className="relative z-10 max-w-md">
              <Zap className="w-10 h-10 text-[#e32f8c] mb-4 fill-[#e32f8c]" />
              <h3 className="text-3xl md:text-4xl font-black text-black uppercase tracking-tight mb-2 leading-[1.1]">
                {isRo ? "Energie Instantă. Gust Genial." : "Instant Energy. Great Taste."}
              </h3>
              <p className="text-black/70 font-medium text-lg mt-4">
                {isRo ? "Uită de pudra care se face cocoloașe. Iei 3 jeleuri și ești gata de antrenament în câteva secunde." : "Forget clumpy powders. Take 3 gummies and you are ready to train."}
              </p>
            </div>
            {/* Background design element */}
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-[#e32f8c]/20 blur-3xl rounded-full pointer-events-none group-hover:bg-[#e32f8c]/30 transition-colors duration-500" />
          </motion.div>

          {/* Box 2: Zero Sugar */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="col-span-1 bg-black rounded-3xl p-8 md:p-12 flex flex-col justify-between relative overflow-hidden group"
          >
            <div className="relative z-10">
              <Droplets className="w-10 h-10 text-white mb-4" />
              <h3 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight mb-2 leading-[1.1]">
                {isRo ? "Zero Zahăr" : "Zero Sugar"}
              </h3>
              <p className="text-white/60 font-medium mt-4">
                {isRo ? "Performanță maximă fără să îți strici dieta. Creatină pură cu absorbție superioară." : "Maximum performance without ruining your diet. Superior absorption."}
              </p>
            </div>
          </motion.div>

          {/* Box 3: 20 workouts */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="col-span-1 bg-[#f4f4f4] rounded-3xl p-8 md:p-12 flex flex-col justify-between"
          >
            <div>
              <BatteryCharging className="w-10 h-10 text-black mb-4" />
              <h3 className="text-2xl md:text-3xl font-black text-black uppercase tracking-tight mb-2">
                {isRo ? "30 De Antrenamente" : "30 Full Workouts"}
              </h3>
              <p className="text-black/70 font-medium mt-2">
                {isRo ? "90 de jeleuri per cutie. Exact necesarul de care ai nevoie pentru 30 de antrenamente explozive." : "90 gummies per box. Enough for 30 explosive workouts."}
              </p>
            </div>
          </motion.div>

          {/* Box 4: CTA */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="col-span-1 md:col-span-2 bg-[#e32f8c] rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden group cursor-pointer"
          >
            <Link href="#featured-gummies" className="absolute inset-0 z-20" />
            <div className="relative z-10 max-w-sm">
              <h3 className="text-3xl md:text-4xl font-black text-black uppercase tracking-tight leading-[1.1]">
                {isRo ? "Intră în Valhalla" : "Enter Valhalla"}
              </h3>
              <p className="text-black/80 font-bold mt-2">
                {isRo ? "Alege culoarea preferată din shop și convinge-te singur." : "Choose your favorite color and order now."}
              </p>
            </div>
            
            {/* Proper CUMPĂRĂ ACUM Button */}
            <div className="relative z-10 bg-black text-white px-8 py-4 rounded-full flex items-center justify-center gap-3 group-hover:scale-105 group-hover:shadow-2xl transition-all duration-300 font-black uppercase tracking-widest text-sm flex-shrink-0">
              <span>{isRo ? "Cumpără Acum" : "Shop Now"}</span>
              <ArrowRight className="w-5 h-5 text-[#e32f8c] group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
