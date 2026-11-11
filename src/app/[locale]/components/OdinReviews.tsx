"use client";

import { motion } from "framer-motion";
import { Star, Quote, MessageSquareQuote } from "lucide-react";

export function OdinReviews() {
  const reviews = [
    {
      name: "Radu D.",
      text: "Am fost sceptic inițial, dar forma asta de jeleuri e genială. Nu mai stau să amestec pulberi cu apa care fac cocoloașe, și nici nu îmi mai pică greu la stomac.",
      rating: 5,
      date: "Achiziție Verificată"
    },
    {
      name: "Voicu Cezar",
      text: "Am încercat la mișto, dar m-a șocat! Creatina în jeleuri e fix ce trebuia, rapid și bun! 💪 💪 💪",
      rating: 5,
      date: "Achiziție Verificată"
    },
    {
      name: "Alex M.",
      text: "Le iau de aproape 3 luni și forța a crescut vizibil la sală. Recomand cu mare încredere, mai ales că sunt vegane și zero zahăr. Bestiale.",
      rating: 5,
      date: "Achiziție Verificată"
    }
  ];

  return (
    <section className="py-32 bg-white relative border-t border-zinc-200 overflow-hidden">
      <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col lg:flex-row items-center justify-between mb-20 gap-12">
          <div className="max-w-2xl text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-100 border border-zinc-200 text-primary text-sm font-bold tracking-widest uppercase mb-6"
            >
              <MessageSquareQuote className="w-4 h-4" />
              Recenzii Verificate
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-7xl font-black uppercase text-black tracking-tighter"
            >
              Ce Spun <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500">Războinicii</span>
            </motion.h2>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-6 bg-white border border-zinc-200 shadow-xl rounded-3xl p-6 md:p-8"
          >
            <div className="text-6xl font-black text-black">4.8</div>
            <div>
              <div className="flex gap-1 mb-2 text-yellow-500">
                {[...Array(5)].map((_, idx) => (
                  <Star key={idx} className="w-6 h-6 fill-current" />
                ))}
              </div>
              <p className="text-zinc-500 font-medium">Din peste 250+ recenzii</p>
            </div>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {reviews.map((review, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className={`bg-white border border-zinc-200 shadow-lg rounded-3xl p-8 md:p-10 flex flex-col relative group transition-transform duration-500 hover:-translate-y-4 ${i === 1 ? 'md:-translate-y-8 hover:md:-translate-y-12' : ''}`}
            >
              <Quote className="absolute top-8 right-8 w-12 h-12 text-zinc-100 group-hover:text-primary/10 transition-colors duration-500" />
              
              <div className="flex gap-1 mb-8 text-yellow-500">
                {[...Array(review.rating)].map((_, idx) => (
                  <Star key={idx} className="w-5 h-5 fill-current" />
                ))}
              </div>
              
              <p className="text-zinc-700 text-lg leading-relaxed mb-10 flex-grow relative z-10 font-medium">
                "{review.text}"
              </p>
              
              <div className="mt-auto flex justify-between items-end border-t border-zinc-100 pt-6">
                <div>
                  <h4 className="text-black font-bold text-lg">{review.name}</h4>
                  <p className="text-zinc-500 text-sm font-medium mt-1">Achiziție Verificată</p>
                </div>
                <span className="text-zinc-400 text-sm font-medium">{review.date}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
