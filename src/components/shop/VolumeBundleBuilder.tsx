"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Check, ChevronDown } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { Product } from "@/lib/api";
import { useRegionStore } from "@/store/useRegionStore";
import { useLocale } from "next-intl";
import { ProductExpressCheckout } from "@/components/checkout/ProductExpressCheckout";

const FLAVORS = [
  { id: "lemon", name: "Lămâie", color: "#facc15" },
  { id: "watermelon", name: "Pepene", color: "#f43f5e" },
  { id: "strawberry", name: "Căpșuni", color: "#fb7185" },
];

const PACKAGES = [
  { tubs: 1, title: "1 CUTIE", discount: 0, tag: "" },
  { tubs: 2, title: "2 CUTII", discount: 15, tag: "-15 LEI" },
  { tubs: 3, title: "3 CUTII", discount: 30, tag: "POPULAR" },
  { tubs: 4, title: "4 CUTII", discount: 45, tag: "MAXIM" },
];

interface VolumeBundleBuilderProps {
  product: Product;
}

export function VolumeBundleBuilder({ product }: VolumeBundleBuilderProps) {
  const locale = useLocale();
  const [selectedTubs, setSelectedTubs] = useState<number>(3);
  const [flavors, setFlavors] = useState<string[]>(Array(4).fill(FLAVORS[0].id));
  const [deviceOS, setDeviceOS] = useState<'ios' | 'android' | 'desktop' | 'both'>('both');

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setDeviceOS('ios');
    } else if (/android/.test(ua)) {
      setDeviceOS('android');
    } else {
      setDeviceOS('desktop');
    }
  }, []);
  const { addItem, setCartOpen } = useCartStore();
  const { currency } = useRegionStore();

  const activePackage = PACKAGES.find(p => p.tubs === selectedTubs) || PACKAGES[0];
  
  // Base price in RON (assuming product price is in RON for this demo)
  // We'll use product.price if available, otherwise fallback
  const basePrice = Number(product?.price) || 149.99; 
  const originalTotal = basePrice * selectedTubs;
  const finalTotal = originalTotal - activePackage.discount;

  const handleFlavorChange = (index: number, flavorId: string) => {
    const newFlavors = [...flavors];
    newFlavors[index] = flavorId;
    setFlavors(newFlavors);
  };

  const handleAddToCart = () => {
    const selectedFlavorNames = flavors.slice(0, selectedTubs).map(fid => FLAVORS.find(f => f.id === fid)?.name).filter(Boolean);
    const finalVariantName = selectedFlavorNames.join(' + ');

    const singleTubWeight = Number(product.weight) || 0.2;
    const bundledProduct = {
      ...product,
      id: `${product.id}-bundle-${selectedTubs}`,
      name: `Pachet ${activePackage.title} ${product.name}`,
      price: finalTotal,
      weight: singleTubWeight * selectedTubs,
      image: '/images/products/x10_elbow_wraps_purple_1.webp',
    };

    addItem(bundledProduct, finalVariantName ? {
      name: finalVariantName,
      image: '/images/products/x10_elbow_wraps_purple_1.webp',
      imageIndex: 0
    } : undefined);

    setCartOpen(true);
  };

  const handleExpressCheckout = () => {
    const selectedFlavorNames = flavors.slice(0, selectedTubs).map(fid => FLAVORS.find(f => f.id === fid)?.name).filter(Boolean);
    const finalVariantName = selectedFlavorNames.join(' + ');

    const singleTubWeight = Number(product.weight) || 0.2;
    const bundledProduct = {
      ...product,
      id: `${product.id}-bundle-${selectedTubs}`,
      name: `Pachet ${activePackage.title} ${product.name}`,
      price: finalTotal,
      weight: singleTubWeight * selectedTubs,
      image: '/images/products/x10_elbow_wraps_purple_1.webp',
    };

    addItem(bundledProduct, finalVariantName ? {
      name: finalVariantName,
      image: '/images/products/x10_elbow_wraps_purple_1.webp',
      imageIndex: 0
    } : undefined);
    
    window.location.href = `/${locale}/checkout`;
  };

  return (
    <div className="w-full bg-white border border-zinc-200 rounded-[32px] p-6 md:p-10 shadow-sm">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-black mb-2">
          ALEGE PACHETUL
        </h2>
        <p className="text-zinc-500 font-medium text-sm md:text-base">
          Mai multe bucăți = discount mai mare. Alege culoarea pentru fiecare.
        </p>
      </div>

      {/* Package Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        {PACKAGES.map((pkg) => (
          <button
            key={pkg.tubs}
            onClick={() => setSelectedTubs(pkg.tubs)}
            className={`relative p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center ${
              selectedTubs === pkg.tubs 
                ? "border-[#e32f8c] bg-[#e32f8c]/5 shadow-[0_0_15px_rgba(227, 47, 140,0.1)]" 
                : "border-zinc-100 hover:border-zinc-200 bg-zinc-50"
            }`}
          >
            {pkg.tag && (
              <div className={`absolute -top-3 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                selectedTubs === pkg.tubs ? "bg-[#e32f8c] text-white" : "bg-zinc-800 text-white"
              }`}>
                {pkg.tag}
              </div>
            )}
            <span className={`text-xl font-black italic uppercase ${selectedTubs === pkg.tubs ? "text-black" : "text-zinc-400"}`}>
              {pkg.title}
            </span>
            {pkg.discount > 0 && (
              <span className={`text-[10px] font-bold uppercase mt-1 ${selectedTubs === pkg.tubs ? "text-[#e32f8c]" : "text-zinc-400"}`}>
                -{pkg.discount} LEI
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Flavor Selection (Dynamic) */}
      <div className="mb-10 bg-zinc-50 p-6 rounded-3xl border border-zinc-100">
        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-6 text-center">
          Culori Selectate ({selectedTubs})
        </h3>
        <div className="space-y-3 max-w-md mx-auto">
          {Array.from({ length: selectedTubs }).map((_, index) => (
            <div key={index} className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-zinc-200">
              <span className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-black text-zinc-400 shrink-0">
                {index + 1}
              </span>
              <div className="flex-1 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {FLAVORS.map(flavor => (
                  <button
                    key={flavor.id}
                    onClick={() => handleFlavorChange(index, flavor.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all shrink-0 border ${
                      flavors[index] === flavor.id 
                        ? "bg-black text-white border-black" 
                        : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: flavor.color }} />
                      {flavor.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary & ATC */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 max-w-2xl mx-auto">
        <div className="text-center md:text-left">
          <div className="flex items-end gap-3 justify-center md:justify-start mb-1">
            <span className="text-4xl md:text-5xl font-black italic text-black">
              {finalTotal.toFixed(2)}
            </span>
            <span className="text-xl font-black text-zinc-400 mb-1">RON</span>
          </div>
          {activePackage.discount > 0 && (
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 justify-center md:justify-start">
              <span className="line-through">{originalTotal.toFixed(2)} RON</span>
              <span className="text-[#e32f8c] ml-1">Ai economisit {activePackage.discount} LEI</span>
            </div>
          )}
        </div>

        <div className="w-full md:w-auto flex-1 max-w-xs space-y-3">
          <button 
            onClick={handleAddToCart}
            className="w-full bg-[#e32f8c] hover:bg-[#c41a72] text-black py-4 md:py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] transition-all active:scale-95 flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(227, 47, 140,0.3)]"
          >
            ADAUGĂ ÎN COȘ <ShoppingBag className="w-4 h-4" />
          </button>
          
          {/* Actual Stripe Express Checkout Element */}
          <div className="flex items-center gap-4 py-2">
            <div className="h-px bg-zinc-200 flex-1" />
            <span className="text-[9px] font-bold uppercase text-zinc-400 tracking-widest">Plătește rapid</span>
            <div className="h-px bg-zinc-200 flex-1" />
          </div>
          
          <ProductExpressCheckout 
            orderItems={[{
              id: `${product.id}-bundle-${selectedTubs}`,
              quantity: 1,
              price: finalTotal,
              weight: (Number(product.weight) || 0.2) * selectedTubs,
              name: `Pachet ${activePackage.title} ${typeof product.name === 'object' ? (product.name as any)['ro'] : product.name}`,
              selectedVariant: { name: flavors.slice(0, selectedTubs).map(fid => FLAVORS.find(f => f.id === fid)?.name).filter(Boolean).join(' + ') }
            }]}
            basePrice={finalTotal}
          />
        </div>
      </div>
    </div>
  );
}
