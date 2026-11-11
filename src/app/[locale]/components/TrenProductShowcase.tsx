"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ShoppingCart, ArrowRight, X, ChevronDown, Check, ChevronRight, AlertCircle } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useCartStore } from "@/store/useCartStore";
import { useRegionStore } from "@/store/useRegionStore";
import { useLocale } from "next-intl";
import { Product } from "@/lib/api";
import { ProductCard } from "@/components/product/ProductCard";
import { formatPrice } from "@/utils/currency";
import { getProductPrice } from "@/utils/pricing";
import { motion, AnimatePresence } from "framer-motion";
import { cn, getLocalized } from "@/lib/utils";

interface TrenProductShowcaseProps {
  products?: Product[];
}

export function TrenProductShowcase({ products = [] }: TrenProductShowcaseProps) {
  const locale = useLocale();
  const isRo = locale === "ro";
  const { addItem, setCartOpen } = useCartStore();

  // The 5 official TrenZone products with identical shop structure and data
  const defaultProducts: Product[] = [
    {
      id: "2fd4ee73-6800-4f76-a74d-208fffea0fb6",
      slug: "x10-elbow-wraps",
      name: {
        ro: "X10 Elbow Wraps",
        en: "X10 Elbow Wraps"
      },
      price: 529.99,
      originalPrice: 599.99,
      badge: "PR CHASER · +20 KG",
      image: "/images/products/x10_elbow_wraps_purple_1.webp",
      images: [
        "/images/products/x10_elbow_wraps_purple_1.webp",
        "/images/products/x10_elbow_wraps_purple_2.webp",
        "/images/products/x10_elbow_wraps_white_3.webp",
        "/images/products/x10_elbow_wraps_white_1.webp",
        "/images/products/x10_elbow_wraps_white_2.webp"
      ],
      variants: {
        type: "flavor",
        label: { ro: "Culoare", en: "Color" },
        options: [
          {
            name: { ro: "Purple", en: "Purple" },
            color: "#a855f7",
            image: "/images/products/x10_elbow_wraps_purple_1.webp",
            imageIndex: 0,
            stock_status: "in_stock",
            badge: "BEST SELLER"
          },
          {
            name: { ro: "White (Precomandă)", en: "White (Pre-Order)" },
            color: "#f8fafc",
            image: "/images/products/x10_elbow_wraps_white_3.webp",
            imageIndex: 2,
            stock_status: "preorder",
            badge: "PRECOMANDĂ"
          }
        ]
      },
      description: {
        ro: "Ediția X10. Rigiditate extremă de competiție, densitate multi-strat de 1.2 kg și până la +20 kg asistență mecanică pe urcare la seriile grele de împins.",
        en: "X10 Edition. Extreme competition-grade stiffness, 1.2 kg multi-layered weave, and up to +20 kg mechanical rebound assist on heavy pressing sets."
      },
      stock_quantity: 80,
      weight: 1.2,
      length_mm: 1000,
      width_mm: 80,
      height_mm: 15,
      is_active: true
    },
    {
      id: "997b3e3c-511b-4e02-8a58-7d59bbf5a154",
      slug: "x5-elbow-wraps",
      name: {
        ro: "X5 Elbow Wraps",
        en: "X5 Elbow Wraps"
      },
      price: 329.99,
      originalPrice: 379.99,
      badge: "HIPERTROFIE & VOLUM",
      image: "/images/products/x5_elbow_wraps_purple_1.webp",
      images: [
        "/images/products/x5_elbow_wraps_purple_1.webp",
        "/images/products/x5_elbow_wraps_purple_2.webp",
        "/images/products/x5_elbow_wraps_red_1.webp",
        "/images/products/x5_elbow_wraps_blue_1.webp"
      ],
      variants: {
        type: "flavor",
        label: { ro: "Culoare", en: "Color" },
        options: [
          {
            name: { ro: "Purple", en: "Purple" },
            color: "#a855f7",
            image: "/images/products/x5_elbow_wraps_purple_1.webp",
            imageIndex: 0,
            stock_status: "in_stock",
            badge: "BEST SELLER"
          },
          {
            name: { ro: "Red", en: "Red" },
            color: "#ef4444",
            image: "/images/products/x5_elbow_wraps_red_1.webp",
            imageIndex: 2,
            stock_status: "in_stock"
          },
          {
            name: { ro: "Blue", en: "Blue" },
            color: "#3b82f6",
            image: "/images/products/x5_elbow_wraps_blue_1.webp",
            imageIndex: 3,
            stock_status: "in_stock"
          }
        ]
      },
      description: {
        ro: "Ediția X5. Protecție excelentă a tendoanelor, mobilitate naturală și suport echilibrat pentru antrenamente de hipertrofie și volum.",
        en: "X5 Edition. Maximum tendon comfort, natural mobility, and balanced joint support for hypertrophy and volume training."
      },
      stock_quantity: 150,
      weight: 0.7,
      length_mm: 1000,
      width_mm: 75,
      height_mm: 10,
      is_active: true
    },
    {
      id: "def7b180-aaa9-42eb-babf-e0ae1a981aba",
      slug: "x10-wrist-wraps",
      name: {
        ro: "X10 Wrist Wraps",
        en: "X10 Wrist Wraps"
      },
      price: 299.99,
      originalPrice: 349.99,
      badge: "EXTREME STIFFNESS",
      image: "/images/products/trenzone_wristwraps_default.webp",
      images: [
        "/images/products/trenzone_wristwraps_default.webp"
      ],
      variants: {
        type: "flavor",
        label: { ro: "Culoare", en: "Color" },
        options: [
          {
            name: { ro: "Purple", en: "Purple" },
            color: "#a855f7",
            image: "/images/products/trenzone_wristwraps_default.webp",
            imageIndex: 0,
            stock_status: "in_stock",
            badge: "BEST SELLER"
          },
          {
            name: { ro: "Stealth Black", en: "Stealth Black" },
            color: "#18181b",
            image: "/images/products/trenzone_wristwraps_default.webp",
            imageIndex: 0,
            stock_status: "in_stock"
          }
        ]
      },
      description: {
        ro: "Fașe de încheietură heavy-duty rigiditate extremă, lungime 60cm cu buclă ranforsată pentru degetul mare și velcro militar supradimensionat.",
        en: "Extreme stiffness heavy-duty 60cm wrist wraps with reinforced thumb loop and oversized military-grade velcro."
      },
      stock_quantity: 75,
      weight: 0.35,
      length_mm: 600,
      width_mm: 80,
      height_mm: 10,
      is_active: true
    },
    {
      id: "dd477884-5fd8-4d8f-ab75-1cade13c1cc8",
      slug: "centura-powerlifting",
      name: {
        ro: "Centură Powerlifting 13mm",
        en: "13mm Powerlifting Belt"
      },
      price: 749.99,
      originalPrice: 849.99,
      badge: "IPF GRADE · 13MM",
      image: "/images/products/trenzone_belt_default.webp",
      images: [
        "/images/products/trenzone_belt_default.webp"
      ],
      variants: {
        type: "size",
        label: { ro: "Mărime", en: "Size" },
        options: [
          { name: { ro: "S (65-80 cm)", en: "S (65-80 cm)" }, stock_status: "in_stock" },
          { name: { ro: "M (75-90 cm)", en: "M (75-90 cm)" }, badge: "POPULAR", stock_status: "in_stock" },
          { name: { ro: "L (85-100 cm)", en: "L (85-100 cm)" }, stock_status: "in_stock" },
          { name: { ro: "XL (95-115 cm)", en: "XL (95-115 cm)" }, stock_status: "in_stock" }
        ]
      },
      description: {
        ro: "Centură profesională de powerlifting din piele naturală veritabilă multi-strat, grosime 13mm și cataramă metalică rapidă cu levier (Quick-Release Lever).",
        en: "Competition-grade 13mm multi-layer genuine leather powerlifting belt with heavy-duty quick-release steel lever."
      },
      stock_quantity: 50,
      weight: 1.5,
      length_mm: 1100,
      width_mm: 100,
      height_mm: 13,
      is_active: true
    },
    {
      id: "35ad173c-9305-42d8-b0c1-0e9bdabdb31c",
      slug: "tricou-trenzone",
      name: {
        ro: "Tricou Oversized",
        en: "Oversized T-Shirt"
      },
      price: 239.99,
      originalPrice: 279.99,
      badge: "OVERSIZED FIT",
      image: "/images/products/trenzone_tshirt_default.webp",
      images: [
        "/images/products/trenzone_tshirt_default.webp"
      ],
      variants: {
        type: "size",
        label: { ro: "Mărime", en: "Size" },
        options: [
          { name: { ro: "S", en: "S" }, stock_status: "in_stock" },
          { name: { ro: "M", en: "M" }, stock_status: "in_stock" },
          { name: { ro: "L", en: "L" }, badge: "POPULAR", stock_status: "in_stock" },
          { name: { ro: "XL", en: "XL" }, stock_status: "in_stock" },
          { name: { ro: "XXL", en: "XXL" }, stock_status: "in_stock" }
        ]
      },
      description: {
        ro: "Tricou heavy-cotton premium oversized fit. Bumbac 100% pieptănat de 260 GSM, croială rezistentă pentru antrenament și lifestyle, guler întărit și branding minimalist TrenZone®.",
        en: "Heavy-cotton premium oversized fit tee. 100% combed cotton 260 GSM, heavy-duty build for lifting and streetwear, reinforced collar, and minimalist TrenZone® branding."
      },
      stock_quantity: 100,
      weight: 0.35,
      length_mm: 300,
      width_mm: 250,
      height_mm: 20,
      is_active: true
    }
  ];

  // If server products are passed, display all active products, otherwise fallback
  const displayProducts = (products && products.length > 0)
    ? products
    : defaultProducts;

  // Custom priority order for display: X10 wraps first, X5 wraps second, then accessories & gear
  const orderMap: Record<string, number> = {
    'x10-elbow-wraps': 1,
    'x5-elbow-wraps': 2,
    'x10-wrist-wraps': 3,
    'centura-powerlifting': 4,
    'tricou-trenzone': 5,
  };

  const sortedDisplayProducts = [...displayProducts].sort((a, b) => {
    const orderA = orderMap[a.slug] ?? 99;
    const orderB = orderMap[b.slug] ?? 99;
    return orderA - orderB;
  });

  // Max 5 products for desktop, 4 on mobile
  const showcaseProducts = sortedDisplayProducts.slice(0, 5);

  const x10Prod = displayProducts.find(p => p.slug.includes("x10-elbow")) || displayProducts.find(p => p.slug.includes("x10")) || defaultProducts[0];
  const x5Prod = displayProducts.find(p => p.slug.includes("x5")) || defaultProducts[1];

  const x5Options = x5Prod?.variants?.options || defaultProducts[1].variants?.options || [];
  const x10Options = x10Prod?.variants?.options || defaultProducts[0].variants?.options || [];

  const [isDuoModalOpen, setIsDuoModalOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<'x5' | 'x10' | null>(null);
  const [selectedX5Opt, setSelectedX5Opt] = useState<any>(x5Options[0]);
  const [selectedX10Opt, setSelectedX10Opt] = useState<any>(x10Options[0]);

  useEffect(() => {
    if (!selectedX5Opt && x5Options.length > 0) setSelectedX5Opt(x5Options[0]);
    if (!selectedX10Opt && x10Options.length > 0) setSelectedX10Opt(x10Options[0]);
  }, [x5Options, x10Options]);

  const { currency } = useRegionStore();
  const priceX5 = getProductPrice(x5Prod?.price || 329.99, currency);
  const priceX10 = getProductPrice(x10Prod?.price || 529.99, currency);
  const originalTotal = priceX5 + priceX10;
  const discountedTotal = originalTotal * 0.90; // 10% discount
  const isMixedDuo = (selectedX5Opt?.stock_status === 'preorder') !== (selectedX10Opt?.stock_status === 'preorder');

  const handleConfirmDuo = () => {
    if (!x5Prod || !x10Prod || isMixedDuo) return;

    const x5OptName = typeof selectedX5Opt?.name === 'object' 
      ? (selectedX5Opt?.name[locale] || selectedX5Opt?.name['ro']) 
      : selectedX5Opt?.name;

    const x10OptName = typeof selectedX10Opt?.name === 'object' 
      ? (selectedX10Opt?.name[locale] || selectedX10Opt?.name['ro']) 
      : selectedX10Opt?.name;

    addItem(x5Prod, {
      name: x5OptName,
      image: selectedX5Opt?.image,
      imageIndex: selectedX5Opt?.imageIndex !== undefined ? selectedX5Opt.imageIndex : 0
    });

    addItem(x10Prod, {
      name: x10OptName,
      image: selectedX10Opt?.image,
      imageIndex: selectedX10Opt?.imageIndex !== undefined ? selectedX10Opt.imageIndex : 0
    });

    setIsDuoModalOpen(false);
    setCartOpen(true);
  };

  return (
    <section id="shop-products" className="py-16 md:py-24 bg-transparent text-white relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-8 max-w-6xl relative z-10">
        
        {/* Header - Clean, direct, human fitness brand style */}
        <div className="flex flex-col items-center justify-center mb-8 md:mb-12 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-white font-[family-name:var(--font-oswald)]">
            BEST SELLERS
          </h2>
          <p className="text-xs sm:text-sm md:text-base text-zinc-400 font-medium mt-2 max-w-lg">
            {isRo 
              ? "Cele mai căutate produse și echipamente din magazin." 
              : "The most popular products and gear in our store."}
          </p>
        </div>

        {/* Product Cards Grid: 2 centered if 2 products, or responsive grid */}
        <div className={`grid grid-cols-2 ${showcaseProducts.length <= 2 ? 'sm:grid-cols-2 max-w-2xl mx-auto' : 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5'} gap-3 sm:gap-4 md:gap-6 mb-8 sm:mb-10`}>
          {showcaseProducts.map((product, idx) => (
            <div 
              key={product.id}
              className={idx >= 4 ? "hidden md:block" : ""}
            >
              <ProductCard 
                product={product} 
                dark={true} 
                priority={idx < 2} 
              />
            </div>
          ))}
        </div>

        {/* View Shop CTA Button */}
        <div className="flex justify-center mb-12 sm:mb-16">
          <Link
            href="/shop"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 py-3.5 px-8 sm:px-12 rounded-xl bg-white/10 hover:bg-white text-white hover:text-black border border-white/15 font-black uppercase text-xs sm:text-sm tracking-wider transition-all duration-300 shadow-lg active:scale-95 group cursor-pointer"
          >
            <span>{isRo ? "VEZI TOATE PRODUSELE" : "VIEW ALL PRODUCTS"}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* DUO PACK BUNDLE (Clean, minimal, non-repetitive) */}
        <div className="mt-10 rounded-2xl md:rounded-3xl bg-zinc-900/70 border border-white/10 p-5 sm:p-7 md:p-8 relative overflow-hidden shadow-2xl backdrop-blur-md">
          {/* Subtle ambient lighting */}
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-[#e32f8c]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top category label */}
          <div className="flex items-center justify-between mb-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#e32f8c]/15 border border-[#e32f8c]/30 text-[#e32f8c] text-[10px] sm:text-xs font-black uppercase tracking-wider">
              {isRo ? "PACHET DUO · 10% REDUCERE AUTOMATĂ" : "DUO PACK · 10% AUTOMATIC DISCOUNT"}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-center">
            
            {/* Left: Dual Product Visuals */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full max-w-sm relative">
                {/* Wrap 1: X5 */}
                <div className="relative aspect-[4/5] w-full rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 shadow-lg group">
                  <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-[9px] font-black text-white uppercase">
                    X5
                  </div>
                  <Image
                    src={selectedX5Opt?.image || "/images/products/x5_elbow_wraps_purple_square.webp"}
                    alt="TrenZone X5 Elbow Wraps"
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 45vw, 200px"
                  />
                </div>

                {/* Floating Plus divider */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white text-black font-black text-sm flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.6)] border-2 border-zinc-900">
                  +
                </div>

                {/* Wrap 2: X10 */}
                <div className="relative aspect-[4/5] w-full rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 shadow-lg group">
                  <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full bg-[#e32f8c] text-white text-[9px] font-black uppercase shadow-sm">
                    X10
                  </div>
                  <Image
                    src={selectedX10Opt?.image || "/images/products/x10_elbow_wraps_purple_square.webp"}
                    alt="TrenZone X10 Elbow Wraps"
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 45vw, 200px"
                  />
                </div>
              </div>
            </div>

            {/* Right: Info, Price & CTA */}
            <div className="lg:col-span-7 flex flex-col justify-between">
              <div>
                <h3 className="font-heading font-black text-xl sm:text-2xl md:text-3xl uppercase tracking-tight text-white mb-2">
                  DUO STACK: <span className="text-[#e32f8c]">X5 + X10</span>
                </h3>

                <p className="text-xs sm:text-sm text-zinc-300 font-medium leading-relaxed mb-4">
                  {isRo 
                    ? "Pachetul complet: 1x Pereche X5 + 1x Pereche X10."
                    : "The complete set: 1x Pair X5 + 1x Pair X10."}
                </p>
              </div>

              {/* Price & CTA row */}
              <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-baseline gap-2.5 flex-wrap">
                  <span className="text-2xl sm:text-3xl font-black text-white tracking-tight whitespace-nowrap">
                    {formatPrice(discountedTotal, currency)}
                  </span>
                  <span className="text-sm text-zinc-500 line-through font-bold whitespace-nowrap">
                    {formatPrice(originalTotal, currency)}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#e32f8c]/20 border border-[#e32f8c]/40 text-[#e32f8c] text-[10px] sm:text-[11px] font-black uppercase whitespace-nowrap">
                    -10% {isRo ? "REDUCERE" : "OFF"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDuoModalOpen(true)}
                  className="w-full sm:w-auto py-3.5 px-8 rounded-xl bg-white hover:bg-[#e32f8c] hover:text-white text-black font-black uppercase text-xs tracking-wider transition-all duration-300 flex items-center justify-center gap-2 shadow-lg active:scale-95 cursor-pointer"
                >
                  <ShoppingCart className="w-4 h-4 shrink-0" />
                  <span>{isRo ? "ADAUGĂ PACHETUL ÎN COȘ" : "ADD DUO PACK TO CART"}</span>
                </button>
              </div>

            </div>

          </div>
        </div>

      </div>

      {/* ═══ MODERN DUO BUNDLE COLOR SELECTOR MODAL ═══ */}
      <AnimatePresence>
        {isDuoModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsDuoModalOpen(false);
                setOpenDropdown(null);
              }}
              className="absolute inset-0 bg-black/75 backdrop-blur-md"
            />

            {/* Modal Card */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-[390px] bg-white text-black p-5 sm:p-6 rounded-3xl shadow-2xl flex flex-col z-10 border border-zinc-100"
            >
              {/* Header - Clean, direct, non-repetitive */}
              <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-zinc-100">
                <div>
                  <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-black leading-none">
                    {isRo ? "Alege culorile" : "Select Colors"}
                  </h3>
                  <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mt-1">
                    DUO PACK: X5 + X10
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsDuoModalOpen(false);
                    setOpenDropdown(null);
                  }}
                  className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-black flex items-center justify-center transition-colors cursor-pointer shrink-0 -mt-1 -mr-1"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {/* SELECTION 1: X5 with Dropdown (Side cart style) */}
              <div className="relative mb-3.5">
                <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-zinc-700 mb-1.5">
                  <span>TRENZONE X5</span>
                  <span className="text-[10px] font-bold text-zinc-400">1x PERECHE</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-zinc-950 rounded-xl relative overflow-hidden shrink-0 border border-zinc-800 shadow-inner">
                    <Image
                      src={selectedX5Opt?.image || x5Prod?.image || "/images/products/x5_elbow_wraps_purple_square.webp"}
                      alt="X5 Elbow Wraps"
                      fill
                      sizes="48px"
                      className="object-contain p-1 transition-all duration-200"
                    />
                  </div>

                  <div className="flex-1 relative">
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(openDropdown === 'x5' ? null : 'x5')}
                      className="w-full flex items-center justify-between py-2.5 px-3 bg-white border border-black rounded-xl hover:bg-zinc-50 transition-all cursor-pointer shadow-xs text-left"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span 
                          className="w-4 h-4 rounded-full border border-black/15 shrink-0 shadow-inner" 
                          style={{ backgroundColor: selectedX5Opt?.color || '#a855f7' }}
                        />
                        <span className="text-xs font-black uppercase tracking-wider text-black truncate">
                          {getLocalized(selectedX5Opt?.name, locale)}
                        </span>
                      </div>
                      <ChevronDown 
                        className={cn("w-4 h-4 text-black transition-transform duration-200 shrink-0 ml-2", openDropdown === 'x5' && "rotate-180")} 
                      />
                    </button>

                    {/* Dropdown Options (Side cart / CartSheet exact styling) */}
                    <AnimatePresence>
                      {openDropdown === 'x5' && (
                        <motion.div
                          initial={{ opacity: 0, y: -4, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -4, scale: 0.98 }}
                          transition={{ duration: 0.12 }}
                          className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-black rounded-xl overflow-hidden shadow-2xl z-30 flex flex-col"
                        >
                          {x5Options.map((opt: any, idx: number) => {
                            const optName = getLocalized(opt.name, locale);
                            const isSelected = (selectedX5Opt?.name?.ro || selectedX5Opt?.name) === (opt.name?.ro || opt.name);
                            return (
                              <button
                                key={`x5-${idx}`}
                                type="button"
                                onClick={() => {
                                  setSelectedX5Opt(opt);
                                  setOpenDropdown(null);
                                }}
                                className={cn(
                                  "w-full flex items-center justify-between py-2.5 px-3.5 transition-colors border-b border-black/10 last:border-none text-left cursor-pointer",
                                  isSelected ? "bg-[#f4f4f4] font-black" : "hover:bg-[#f4f4f4]"
                                )}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span 
                                    className="w-4 h-4 rounded-full border border-black/15 shrink-0 shadow-inner" 
                                    style={{ backgroundColor: opt.color || '#a855f7' }}
                                  />
                                  <span className="text-xs uppercase font-black tracking-wider text-black truncate">
                                    {optName}
                                  </span>
                                </div>
                                {isSelected ? (
                                  <Check className="w-4 h-4 text-black shrink-0" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 text-black/30 shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* SELECTION 2: X10 with Dropdown (Side cart style) */}
              <div className="relative mb-4">
                <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-zinc-700 mb-1.5">
                  <span>TRENZONE X10</span>
                  <span className="text-[10px] font-bold text-zinc-400">1x PERECHE</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-zinc-950 rounded-xl relative overflow-hidden shrink-0 border border-zinc-800 shadow-inner">
                    <Image
                      src={selectedX10Opt?.image || x10Prod?.image || "/images/products/x10_elbow_wraps_purple_square.webp"}
                      alt="X10 Elbow Wraps"
                      fill
                      sizes="48px"
                      className="object-contain p-1 transition-all duration-200"
                    />
                  </div>

                  <div className="flex-1 relative">
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(openDropdown === 'x10' ? null : 'x10')}
                      className="w-full flex items-center justify-between py-2.5 px-3 bg-white border border-black rounded-xl hover:bg-zinc-50 transition-all cursor-pointer shadow-xs text-left"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span 
                          className="w-4 h-4 rounded-full border border-black/15 shrink-0 shadow-inner" 
                          style={{ backgroundColor: selectedX10Opt?.color || '#a855f7' }}
                        />
                        <span className="text-xs font-black uppercase tracking-wider text-black truncate">
                          {getLocalized(selectedX10Opt?.name, locale)}
                        </span>
                        {selectedX10Opt?.stock_status === 'preorder' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 font-black uppercase border border-amber-500/20">
                            PRE
                          </span>
                        )}
                      </div>
                      <ChevronDown 
                        className={cn("w-4 h-4 text-black transition-transform duration-200 shrink-0 ml-2", openDropdown === 'x10' && "rotate-180")} 
                      />
                    </button>

                    {/* Dropdown Options */}
                    <AnimatePresence>
                      {openDropdown === 'x10' && (
                        <motion.div
                          initial={{ opacity: 0, y: -4, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -4, scale: 0.98 }}
                          transition={{ duration: 0.12 }}
                          className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-black rounded-xl overflow-hidden shadow-2xl z-30 flex flex-col"
                        >
                          {x10Options.map((opt: any, idx: number) => {
                            const optName = getLocalized(opt.name, locale);
                            const isSelected = (selectedX10Opt?.name?.ro || selectedX10Opt?.name) === (opt.name?.ro || opt.name);
                            const isPreorderOpt = opt.stock_status === 'preorder';
                            return (
                              <button
                                key={`x10-${idx}`}
                                type="button"
                                onClick={() => {
                                  setSelectedX10Opt(opt);
                                  setOpenDropdown(null);
                                }}
                                className={cn(
                                  "w-full flex items-center justify-between py-2.5 px-3.5 transition-colors border-b border-black/10 last:border-none text-left cursor-pointer",
                                  isSelected ? "bg-[#f4f4f4] font-black" : "hover:bg-[#f4f4f4]"
                                )}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span 
                                    className="w-4 h-4 rounded-full border border-black/15 shrink-0 shadow-inner" 
                                    style={{ backgroundColor: opt.color || '#a855f7' }}
                                  />
                                  <span className="text-xs uppercase font-black tracking-wider text-black truncate">
                                    {optName}
                                  </span>
                                  {isPreorderOpt && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 font-black uppercase border border-amber-500/20">
                                      PRECOMANDĂ
                                    </span>
                                  )}
                                </div>
                                {isSelected ? (
                                  <Check className="w-4 h-4 text-black shrink-0" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 text-black/30 shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Mixed Preorder Alert */}
              {isMixedDuo && (
                <div className="mb-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="font-semibold leading-snug">
                    {isRo 
                      ? "Precomenzile se livrează separat și nu pot fi combinate cu produse din stoc în același pachet."
                      : "Pre-orders ship separately and cannot be bundled with in-stock products."}
                  </span>
                </div>
              )}

              {/* Price Row & Action */}
              <div className="pt-3.5 border-t border-zinc-100 mt-1">
                <div className="flex items-center justify-between mb-3.5">
                  <span className="text-xs font-black uppercase tracking-wider text-zinc-400">
                    TOTAL
                  </span>
                  <div className="flex items-baseline gap-2 whitespace-nowrap">
                    <span className="text-xl sm:text-2xl font-black text-black tracking-tight whitespace-nowrap">
                      {formatPrice(discountedTotal, currency)}
                    </span>
                    <span className="text-xs text-zinc-400 line-through font-bold whitespace-nowrap">
                      {formatPrice(originalTotal, currency)}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase border border-emerald-200 whitespace-nowrap">
                      -10%
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isMixedDuo}
                  onClick={handleConfirmDuo}
                  className={cn(
                    "w-full py-3.5 px-6 rounded-2xl font-black uppercase text-xs sm:text-sm tracking-wider transition-all duration-300 flex items-center justify-center gap-2 shadow-xl",
                    isMixedDuo
                      ? "bg-zinc-200 text-zinc-400 cursor-not-allowed shadow-none"
                      : "bg-[#e32f8c] hover:bg-[#c22074] active:scale-[0.98] text-white shadow-[#e32f8c]/25 cursor-pointer"
                  )}
                >
                  <ShoppingCart className="w-4 h-4 shrink-0" />
                  <span>
                    {isMixedDuo 
                      ? (isRo ? "COMANDĂ SEPARAT" : "ORDER SEPARATELY") 
                      : (isRo ? "CONFIRMĂ ȘI ADAUGĂ ÎN COȘ" : "CONFIRM & ADD TO CART")}
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
