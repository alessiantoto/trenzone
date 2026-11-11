"use client";

import { motion } from "framer-motion";
import { Leaf, Zap, ShieldCheck, Flame, Droplets } from "lucide-react";

export function BenefitsSection() {
  return (
    <section className="py-32 bg-zinc-50 relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-4xl mx-auto mb-20 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-zinc-200 text-primary text-sm font-bold tracking-widest uppercase mb-4 shadow-sm"
          >
            <ShieldCheck className="w-4 h-4" />
            Calitate Premium Garantată
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-5xl md:text-7xl font-black uppercase text-black tracking-tighter"
          >
            Formulă <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500">Revoluționară</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-zinc-600 font-medium max-w-2xl mx-auto"
          >
            Am eliminat compromisurile. Suplimentele noastre sunt create pentru a oferi performanță extremă, cu ingrediente curate și o eficiență de neegalat.
          </motion.p>
        </div>

        {/* Bento Box Grid */}
        <div className="grid md:grid-cols-3 md:grid-rows-2 gap-6 max-w-6xl mx-auto">
          
          {/* Box 1 (Large Span) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="bg-white border border-zinc-200 shadow-xl rounded-3xl p-10 md:col-span-2 relative overflow-hidden group flex flex-col justify-end min-h-[320px]"
          >
            <div className="absolute right-0 top-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] group-hover:bg-primary/10 transition-all duration-700" />
            <div className="absolute top-8 left-8 w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center">
              <Zap className="w-8 h-8 text-primary" />
            </div>
            <div className="relative z-10 mt-24">
              <h3 className="text-3xl font-black text-black uppercase tracking-tight mb-3">Absorbție Ultra-Rapidă</h3>
              <p className="text-zinc-600 text-lg leading-relaxed max-w-lg">
                Formatul inovator permite nutrienților să fie asimilați instantaneu de organism, ocolind barierele digestive clasice. Rezultatul? Energie explozivă când ai cea mai mare nevoie.
              </p>
            </div>
          </motion.div>

          {/* Box 2 (Square) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="bg-white border border-zinc-200 shadow-xl rounded-3xl p-10 relative overflow-hidden group flex flex-col justify-end min-h-[320px]"
          >
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-green-500/5 rounded-full blur-[60px] group-hover:bg-green-500/10 transition-all duration-700" />
            <div className="absolute top-8 left-8 w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center">
              <Leaf className="w-8 h-8 text-green-500" />
            </div>
            <div className="relative z-10 mt-24">
              <h3 className="text-2xl font-black text-black uppercase tracking-tight mb-3">100% Vegan</h3>
              <p className="text-zinc-600 leading-relaxed">
                Ingrediente pure, bazate pe plante. Fără gelatina animală, doar pectină de fructe de cea mai înaltă calitate.
              </p>
            </div>
          </motion.div>

          {/* Box 3 (Square) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="bg-white border border-zinc-200 shadow-xl rounded-3xl p-10 relative overflow-hidden group flex flex-col justify-end min-h-[320px]"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/5 rounded-full blur-[60px] group-hover:bg-orange-500/10 transition-all duration-700" />
            <div className="absolute top-8 left-8 w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center">
              <Flame className="w-8 h-8 text-orange-500" />
            </div>
            <div className="relative z-10 mt-24">
              <h3 className="text-2xl font-black text-black uppercase tracking-tight mb-3">Zero Zahăr</h3>
              <p className="text-zinc-600 leading-relaxed">
                Fără calorii goale sau crash-uri de glicemie. Gustul delicios este obținut prin alternative sigure și sănătoase.
              </p>
            </div>
          </motion.div>

          {/* Box 4 (Large Span) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="bg-white border border-zinc-200 shadow-xl rounded-3xl p-10 md:col-span-2 relative overflow-hidden group flex flex-col justify-end min-h-[320px] bg-gradient-to-br from-zinc-50 to-zinc-100"
          >
            <div className="absolute left-0 bottom-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] group-hover:bg-primary/10 transition-all duration-700" />
            <div className="absolute top-8 left-8 w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center">
              <Droplets className="w-8 h-8 text-primary" />
            </div>
            <div className="relative z-10 mt-24">
              <h3 className="text-3xl font-black text-black uppercase tracking-tight mb-3">Fără Mizerie, Fără Shaker</h3>
              <p className="text-zinc-600 text-lg leading-relaxed max-w-lg">
                Uită de pudra vărsată prin geanta de sală și de shakerele greu de curățat. Jeleurile noastre sunt gata de consumat oricând, oriunde, oferindu-ți doza exactă de creatină.
              </p>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
