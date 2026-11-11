"use client";

import { getOptimizedImageUrl } from '@/lib/utils/imageProxy';
import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import Image from "next/image";

export function BundleUpsellBanner() {
  const steps = [
    { qty: 1, label: "FĂRĂ REDUCERE", discount: null },
    { qty: 2, label: "SALVEZI 15 LEI", discount: "-15 LEI" },
    { qty: 3, label: "SALVEZI 30 LEI", discount: "-30 LEI" },
    { qty: 4, label: "SALVEZI 45 LEI", discount: "-45 LEI" },
  ];

  const tubs = [
    '/images/products/jeleuri_pepene.webp',
    '/images/products/jeleuri_afine.webp',
    '/images/products/jeleuri_lamaie_lime.webp',
    '/images/products/jeleuri_capsuni.webp',
  ];

  // Helper to render the stack of tubs based on quantity
  const renderTubStack = (qty: number) => {
    if (qty === 1) {
      return (
        <div className="relative w-28 h-28 mx-auto hover:scale-110 transition-transform duration-300">
          <Image src={getOptimizedImageUrl(tubs[0]) || '/placeholder.png'} alt="TrenZone Tub" fill sizes="112px" className="object-contain mix-blend-multiply drop-shadow-xl" />
        </div>
      );
    }
    if (qty === 2) {
      return (
        <div className="relative w-36 h-28 mx-auto hover:scale-110 transition-transform duration-300 flex justify-center items-end">
          <Image src={getOptimizedImageUrl(tubs[0]) || '/placeholder.png'} alt="Tub 1" width={96} height={96} className="absolute left-0 object-contain mix-blend-multiply drop-shadow-xl z-10" />
          <Image src={getOptimizedImageUrl(tubs[1]) || '/placeholder.png'} alt="Tub 2" width={96} height={96} className="absolute right-0 object-contain mix-blend-multiply drop-shadow-xl z-0" />
        </div>
      );
    }
    if (qty === 3) {
      return (
        <div className="relative w-40 h-36 mx-auto hover:scale-110 transition-transform duration-300">
          <Image src={getOptimizedImageUrl(tubs[0]) || '/placeholder.png'} alt="Tub 1" width={96} height={96} className="absolute bottom-0 left-0 object-contain mix-blend-multiply drop-shadow-xl z-10" />
          <Image src={getOptimizedImageUrl(tubs[1]) || '/placeholder.png'} alt="Tub 2" width={96} height={96} className="absolute bottom-0 right-0 object-contain mix-blend-multiply drop-shadow-xl z-10" />
          <Image src={getOptimizedImageUrl(tubs[2]) || '/placeholder.png'} alt="Tub 3" width={96} height={96} className="absolute top-0 left-1/2 -translate-x-1/2 object-contain mix-blend-multiply drop-shadow-2xl z-20" />
        </div>
      );
    }
    if (qty === 4) {
      return (
        <div className="relative w-40 h-40 mx-auto hover:scale-110 transition-transform duration-300">
          <Image src={getOptimizedImageUrl(tubs[0]) || '/placeholder.png'} alt="Tub 1" width={96} height={96} className="absolute bottom-0 left-0 object-contain mix-blend-multiply drop-shadow-xl z-10" />
          <Image src={getOptimizedImageUrl(tubs[1]) || '/placeholder.png'} alt="Tub 2" width={96} height={96} className="absolute bottom-0 right-0 object-contain mix-blend-multiply drop-shadow-xl z-10" />
          <Image src={getOptimizedImageUrl(tubs[2]) || '/placeholder.png'} alt="Tub 3" width={96} height={96} className="absolute top-4 left-2 object-contain mix-blend-multiply drop-shadow-2xl z-20" />
          <Image src={getOptimizedImageUrl(tubs[3]) || '/placeholder.png'} alt="Tub 4" width={96} height={96} className="absolute top-4 right-2 object-contain mix-blend-multiply drop-shadow-2xl z-20" />
        </div>
      );
    }
    return null;
  };

  return (
    <section className="bg-white py-16 md:py-24 border-t border-zinc-100 relative overflow-hidden">
      <div className="container mx-auto px-4 max-w-6xl relative z-10">
        
        <div className="text-center mb-16 md:mb-24">
          <motion.h3 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-black mb-2"
          >
            ALEGE PACHETUL TĂU
          </motion.h3>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-zinc-500 font-medium max-w-2xl mx-auto"
          >
            Mai multe cutii = discount mai mare.
          </motion.p>
        </div>

        <div className="relative">
          {/* Progress Line */}
          <div className="absolute top-[60%] left-[10%] w-[80%] h-1 bg-zinc-200 -translate-y-1/2 hidden md:block rounded-full" />
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-4 lg:gap-8 relative z-10">
            {steps.map((step, idx) => (
              <Link 
                href="/shop" 
                key={idx}
                className="group relative flex flex-col items-center cursor-pointer"
              >
                {/* Visual Tubs */}
                <div className="h-48 flex items-end justify-center mb-8">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    {renderTubStack(step.qty)}
                  </motion.div>
                </div>

                {/* Timeline Dot */}
                <div className="hidden md:flex absolute top-[60%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border-4 border-[#e32f8c] items-center justify-center shadow-[0_0_15px_rgba(227, 47, 140,0.3)] z-20 group-hover:scale-125 transition-transform" />

                {/* Details */}
                <div className="text-center mt-2">
                  <h4 className="text-2xl font-black text-black tracking-tight mb-1 group-hover:text-[#e32f8c] transition-colors">
                    {step.qty} {step.qty === 1 ? 'CUTIE' : 'CUTII'}
                  </h4>
                  {step.discount ? (
                    <div className="text-[#e32f8c] font-black uppercase tracking-widest text-lg">
                      {step.discount}
                    </div>
                  ) : (
                    <div className="text-zinc-400 font-bold uppercase tracking-widest text-sm mt-1">
                      {step.label}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
