"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ShoppingBag, ArrowRight } from "lucide-react";

// Flavor data with associated ambient colors
const flavors = [
  { id: 'pepene', name: 'PEPENE ROȘU', nameEn: 'WATERMELON', icon: '🍉', image: '/images/products/jeleuri_pepene.webp', color: 'rgba(239, 68, 68, 0.4)' },
  { id: 'lemon', name: 'LEMON & LIME', nameEn: 'LEMON & LIME', icon: '🍋', image: '/images/products/jeleuri_lamaie_lime.webp', color: 'rgba(234, 179, 8, 0.4)' },
  { id: 'fructe', name: 'FRUCTE DE PĂDURE', nameEn: 'BERRIES', icon: '🍇', image: '/images/products/jeleuri_fructe_padure.webp', color: 'rgba(147, 51, 234, 0.4)' },
  { id: 'capsuni', name: 'CĂPȘUNI DULCI', nameEn: 'SWEET STRAWBERRY', icon: '🍓', image: '/images/products/jeleuri_capsuni.webp', color: 'rgba(236, 72, 153, 0.4)' },
  { id: 'afine', name: 'EXPLOZIE DE AFINE', nameEn: 'BLUEBERRY BURST', icon: '🫐', image: '/images/products/jeleuri_afine.webp', color: 'rgba(59, 130, 246, 0.4)' },
];

const quantities = [
  { id: 1, label: '1 CUTIE', labelEn: '1 BOX', save: null },
  { id: 2, label: '2 CUTII', labelEn: '2 BOXES', save: '15 LEI' },
  { id: 3, label: '3 CUTII', labelEn: '3 BOXES', save: '30 LEI' },
  { id: 4, label: '4 CUTII', labelEn: '4 BOXES', save: '45 LEI' },
];

export function ProductShowcase() {
  const params = useParams();
  const isRo = params.locale === "ro";

  const [activeFlavor, setActiveFlavor] = useState(flavors[0]);
  const [activeQty, setActiveQty] = useState(quantities[0]);

  // Price calculations
  const basePrice = 149.89;
  const oldBasePrice = 187.24;
  const currentPrice = (basePrice * activeQty.id - (activeQty.save ? parseInt(activeQty.save) : 0)).toFixed(2);
  const currentOldPrice = (oldBasePrice * activeQty.id).toFixed(2);

  return (
    <section className="py-24 md:py-32 bg-[#050505] relative overflow-hidden" id="magazin">
      
      {/* Dynamic Ambient Glow matching the flavor */}
      <motion.div
        animate={{ background: `radial-gradient(circle at center, ${activeFlavor.color} 0%, transparent 60%)` }}
        transition={{ duration: 1, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-[800px] h-[800px] blur-[100px] pointer-events-none opacity-50 md:opacity-70"
      />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay pointer-events-none" />

      <div className="container mx-auto px-4 md:px-8 max-w-7xl relative z-10">
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-24 items-center">
          
          {/* Left Column - Hero Product Image (Oversized & Floating) */}
          <div className="w-full lg:w-1/2 relative h-[500px] md:h-[700px] flex items-center justify-center">
            
            {/* Pulsing ring effect */}
            <motion.div 
              animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="absolute inset-0 rounded-full border border-white/5 w-3/4 h-3/4 m-auto blur-[2px]"
            />

            {/* Pre-render all flavor images — instant CSS switch, no lag */}
            <div className="relative w-full h-full z-20">
              {flavors.map((flavor) => (
                <div
                  key={flavor.id}
                  className={`absolute inset-0 transition-all duration-500 ease-in-out drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${
                    activeFlavor.id === flavor.id ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                  }`}
                >
                  <Image 
                    src={flavor.image}
                    alt={flavor.name}
                    fill
                    priority
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-contain"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Neumorphic / Glassmorphic UI */}
          <div className="w-full lg:w-1/2 flex flex-col">
            
            {/* Title */}
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-5xl md:text-7xl lg:text-[5.5rem] font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 uppercase tracking-tighter leading-none mb-6"
            >
              JELEURI <br/> VALHALLA
            </motion.h1>

            {/* Price block (Glassmorphic) */}
            <div className="flex items-baseline gap-4 mb-10 p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl w-max">
              <motion.span 
                key={currentPrice}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl md:text-5xl font-black text-white tracking-tight"
              >
                {currentPrice} <span className="text-xl md:text-2xl text-white/50">LEI</span>
              </motion.span>
              <span className="text-lg text-white/30 font-bold line-through">{currentOldPrice} LEI</span>
            </div>

            {/* Flavor Selector (Pills) */}
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-4 opacity-70">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
                <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">
                  {isRo ? "ALEGE CULOAREA" : "SELECT COLOR"}
                </h3>
              </div>
              <div className="flex flex-wrap gap-3">
                {flavors.map((flavor) => {
                  const isActive = activeFlavor.id === flavor.id;
                  return (
                    <button
                      key={flavor.id}
                      onClick={() => setActiveFlavor(flavor)}
                      className={`relative flex items-center gap-2 px-5 py-3 rounded-full border border-white/10 transition-all duration-300 overflow-hidden group ${
                        isActive ? 'bg-white/10 shadow-[0_0_20px_rgba(255,255,255,0.1)]' : 'bg-transparent hover:bg-white/5'
                      }`}
                    >
                      {isActive && (
                        <motion.div 
                          layoutId="active-flavor"
                          className="absolute inset-0 bg-white/10 backdrop-blur-md rounded-full border border-white/20 z-0"
                        />
                      )}
                      <span className="text-xl relative z-10">{flavor.icon}</span>
                      <span className={`text-xs font-bold uppercase tracking-wider relative z-10 transition-colors ${isActive ? 'text-white' : 'text-white/60 group-hover:text-white'}`}>
                        {isRo ? flavor.name : flavor.nameEn}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="mb-12">
              <div className="flex items-center gap-2 mb-4 opacity-70">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
                <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">
                  {isRo ? "CANTITATE & REDUCERE" : "QUANTITY & DISCOUNT"}
                </h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {quantities.map((qty) => {
                  const isActive = activeQty.id === qty.id;
                  return (
                    <button
                      key={qty.id}
                      onClick={() => setActiveQty(qty)}
                      className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300 ${
                        isActive 
                          ? 'border-white bg-white text-black scale-105 shadow-[0_0_30px_rgba(255,255,255,0.2)]' 
                          : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:border-white/30'
                      }`}
                    >
                      <span className="text-sm font-black uppercase tracking-widest mb-1">
                        {isRo ? qty.label : qty.labelEn}
                      </span>
                      {qty.save && (
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${isActive ? 'bg-black text-white' : 'bg-white/10 text-white'}`}>
                          -{qty.save}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions (Magnetic Glow Button) */}
            <div className="flex flex-col gap-4">
              <button className="group relative w-full bg-white text-black flex items-center justify-center gap-3 py-6 rounded-2xl font-black uppercase tracking-[0.2em] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                <ShoppingBag className="w-5 h-5 relative z-10" />
                <span className="relative z-10">{isRo ? "PRECOMANDĂ ACUM" : "PREORDER NOW"}</span>
                <ArrowRight className="w-5 h-5 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300 relative z-10" />
              </button>
              
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]" />
                  <p className="text-xs font-medium text-white/50">
                    {isRo ? "Livrare estimată: Aug 13" : "Estimated delivery: Aug 13"}
                  </p>
                </div>
                <div className="flex gap-2 opacity-30 grayscale">
                  <div className="w-8 h-5 bg-white/20 rounded-sm" />
                  <div className="w-8 h-5 bg-white/20 rounded-sm" />
                  <div className="w-8 h-5 bg-white/20 rounded-sm" />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
