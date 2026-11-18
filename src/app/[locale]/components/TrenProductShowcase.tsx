"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowRight, Truck } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useRegionStore } from "@/store/useRegionStore";
import { useCheckoutStore } from "@/store/useCheckoutStore";
import { useShippingConfig } from "@/lib/use-shipping-config";
import { getFreeShippingThreshold } from "@/lib/cart-calculations";
import { useLocale } from "next-intl";
import { Product } from "@/lib/api";
import { ProductCard } from "@/components/product/ProductCard";
import { formatPrice } from "@/utils/currency";
import { getProductPrice } from "@/utils/pricing";
import { isDigitalProgramItem } from "@/lib/programs";
import { getCdnUrl } from "@/lib/utils/cdn";

interface TrenProductShowcaseProps {
  products?: Product[];
}

export function TrenProductShowcase({ products = [] }: TrenProductShowcaseProps) {
  const locale = useLocale();
  const isRo = locale === "ro";

  // The 5 official TrenZone products with identical shop structure and data
  const defaultProducts: Product[] = [
    {
      id: "2fd4ee73-6800-4f76-a74d-208fffea0fb6",
      slug: "x10-elbow-wraps",
      name: {
        ro: "X10 Elbow Wraps",
        en: "X10 Elbow Wraps"
      },
      price: 409.99,
      originalPrice: 479.99,
      badge: "PR CHASER · +20 KG",
      image: "/images/products/x10_elbow_wraps_purple.webp",
      images: [
        "/images/products/x10_elbow_wraps_purple.webp",
        "/images/products/x10_elbow_wraps_white.webp"
      ],
      variants: {
        type: "flavor",
        label: { ro: "Culoare", en: "Color" },
        options: [
          {
            name: { ro: "Purple", en: "Purple" },
            color: "#a855f7",
            image: "/images/products/x10_elbow_wraps_purple.webp",
            imageIndex: 0,
            stock_status: "preorder",
            badge: "BEST SELLER"
          },
          {
            name: { ro: "White (Precomandă)", en: "White (Pre-Order)" },
            color: "#f8fafc",
            image: "/images/products/x10_elbow_wraps_white.webp",
            imageIndex: 1,
            stock_status: "preorder"
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
      price: 309.99,
      originalPrice: 359.99,
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
      price: 249.99,
      originalPrice: 299.99,
      badge: "EXTREME STIFFNESS",
      image: "/images/products/x10_wrist_wraps_purple.webp",
      images: [
        "/images/products/x10_wrist_wraps_purple.webp",
        "/images/products/x10_wrist_wraps_white.webp"
      ],
      variants: {
        type: "flavor",
        label: { ro: "Culoare", en: "Color" },
        options: [
          {
            name: { ro: "Purple", en: "Purple" },
            color: "#a855f7",
            image: "/images/products/x10_wrist_wraps_purple.webp",
            imageIndex: 0,
            stock_status: "preorder",
            badge: "BEST SELLER"
          },
          {
            name: { ro: "White", en: "White" },
            color: "#f8fafc",
            image: "/images/products/x10_wrist_wraps_white.webp",
            imageIndex: 1,
            stock_status: "preorder"
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
      height_mm: 12,
      is_active: true
    },
    {
      id: "dd477884-5fd8-4d8f-ab75-1cade13c1cc8",
      slug: "centura-powerlifting",
      name: {
        ro: "Heavy Lifting Belt",
        en: "Heavy Lifting Belt"
      },
      price: 599.99,
      originalPrice: 649.99,
      badge: "IPF GRADE · 13MM",
      image: "/images/products/heavy_lifting_belt.webp",
      images: [
        "/images/products/heavy_lifting_belt.webp"
      ],
      variants: {
        type: "size",
        label: { ro: "Mărime", en: "Size" },
        options: [
          { name: { ro: "XS (57.5-70 cm)", en: "XS (57.5-70 cm)" }, stock_status: "preorder" },
          { name: { ro: "S (65-80 cm)", en: "S (65-80 cm)" }, stock_status: "preorder" },
          { name: { ro: "M (72.5-90 cm)", en: "M (72.5-90 cm)" }, badge: "POPULAR", stock_status: "preorder" },
          { name: { ro: "L (80-100 cm)", en: "L (80-100 cm)" }, stock_status: "preorder" },
          { name: { ro: "XL (87.5-110 cm)", en: "XL (87.5-110 cm)" }, stock_status: "preorder" },
          { name: { ro: "2XL (95-120 cm)", en: "2XL (95-120 cm)" }, stock_status: "preorder" }
        ]
      },
      description: {
        ro: "Centură profesională de powerlifting din 100% piele naturală veritabilă, grosime 13mm și cataramă metalică rapidă cu levier (Quick-Release Lever).",
        en: "Competition-grade 13mm 100% genuine leather powerlifting belt with heavy-duty quick-release steel lever."
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
        ro: "TREN Oversized Tee",
        en: "TREN Oversized Tee"
      },
      price: 239.99,
      originalPrice: 279.99,
      badge: "OVERSIZED FIT",
      image: "/images/products/shirt_stay_hard.webp",
      images: [
        "/images/products/shirt_stay_hard.webp",
        "/images/products/shirt_eat_tren_sleep_repeat.webp",
        "/images/products/shirt_beast.webp",
        "/images/products/shirt_soldier_of_god.webp",
        "/images/products/shirt_pain_creates_men.webp"
      ],
      variants: {
        type: "design",
        label: { ro: "Model", en: "Design" },
        options: [
          { name: { ro: "Stay Hard", en: "Stay Hard" }, badge: "BEST SELLER", image: "/images/products/shirt_stay_hard.webp", imageIndex: 0, stock_status: "preorder" },
          { name: { ro: "Eat Tren Sleep Repeat", en: "Eat Tren Sleep Repeat" }, badge: "TRENZONE OG", image: "/images/products/shirt_eat_tren_sleep_repeat.webp", imageIndex: 1, stock_status: "preorder" },
          { name: { ro: "Beast", en: "Beast" }, badge: "POPULAR", image: "/images/products/shirt_beast.webp", imageIndex: 2, stock_status: "preorder" },
          { name: { ro: "Soldier of God", en: "Soldier of God" }, badge: "LIMITED", image: "/images/products/shirt_soldier_of_god.webp", imageIndex: 3, stock_status: "preorder" },
          { name: { ro: "Pain Creates Men", en: "Pain Creates Men" }, badge: "HARDCORE", image: "/images/products/shirt_pain_creates_men.webp", imageIndex: 4, stock_status: "preorder" }
        ]
      },
      bundleVariants: {
        size: {
          label: { ro: "Mărime", en: "Size" },
          options: ["S", "M", "L", "XL", "2XL"]
        }
      },
      description: {
        ro: "Tricou heavy-weight premium oversized fit (washed black), realizat din 80% bumbac și 20% poliester (240 GSM), printuri statement high-definition, guler întărit și emblemă TrenZone®.",
        en: "Heavy-weight premium washed-black oversized fit tee crafted from an 80% cotton, 20% polyester blend (240 GSM), featuring high-definition statement prints, a reinforced collar, and TrenZone® emblem."
      },
      stock_quantity: 100,
      weight: 0.35,
      length_mm: 300,
      width_mm: 250,
      height_mm: 20,
      is_active: true
    }
  ];

  // If server products are passed, display all active physical products, otherwise fallback
  const physicalProducts = products?.filter((p) => !isDigitalProgramItem(p)) || [];
  const displayProducts = physicalProducts.length > 0
    ? physicalProducts
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

  const x10Prod = displayProducts.find(p => p.slug === "x10-elbow-wraps") || displayProducts.find(p => p.slug.includes("x10-elbow")) || defaultProducts[0];
  const x5Prod = displayProducts.find(p => p.slug.includes("x5")) || defaultProducts[1];
  const wristProd = displayProducts.find(p => p.slug.includes("wrist")) || defaultProducts[2];

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { currency, countryCode: regionCountryCode, hasDetectedCountry } = useRegionStore();
  const storedCheckoutCountry = useCheckoutStore((s) => s.country);
  const hasManualCountry = useCheckoutStore((s) => s.hasManualCountry);
  const shippingConfig = useShippingConfig();

  const activeCurrency = mounted ? currency : (isRo ? "RON" : "EUR");
  const effectiveCountry = (
    mounted
      ? hasManualCountry
        ? storedCheckoutCountry
        : activeCurrency === "RON"
          ? "RO"
          : hasDetectedCountry && regionCountryCode !== "RO"
            ? regionCountryCode
            : "INTL"
      : isRo
        ? "RO"
        : "INTL"
  ).toUpperCase();

  const rawShippingThreshold = getFreeShippingThreshold(effectiveCountry, activeCurrency, shippingConfig);
  const compactShippingThreshold = `${Math.round(rawShippingThreshold)}+ ${activeCurrency === "RON" ? "lei" : activeCurrency}`;

  const elbowPrice = getProductPrice(x10Prod?.price || 409.99, activeCurrency);
  const x5Price = getProductPrice(x5Prod?.price || 309.99, activeCurrency);
  const wristPrice = getProductPrice(wristProd?.price || 249.99, activeCurrency);
  const minElbowPrice = Math.min(x5Price, elbowPrice);
  const minStartPrice = Math.min(wristPrice, minElbowPrice);

  const elbowCardImg = getCdnUrl(x10Prod?.image || "/images/products/x10_elbow_wraps_purple.webp");
  const wristCardImg = getCdnUrl(wristProd?.image || "/images/products/x10_wrist_wraps_purple.webp");

  return (
    <section id="shop-products" className="py-16 md:py-24 bg-transparent text-white relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-8 max-w-6xl relative z-10">

        {/* Header - Clean, direct, human fitness brand style */}
        <div className="flex flex-col items-center justify-center mb-8 md:mb-12 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-white font-[family-name:var(--font-oswald)]">
            {isRo ? "CELE MAI CĂUTATE" : "BEST SELLERS"}
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

        {/* FULL LOCKOUT DISCOVERY CARD: ELBOW & WRIST WRAPS */}
        <div className="mt-8 sm:mt-10 rounded-2xl md:rounded-3xl bg-zinc-900/75 border border-white/10 p-4 sm:p-7 md:p-9 relative overflow-hidden shadow-2xl">
          {/* Subtle corner ambient glow without heavy GPU blur filter */}
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[radial-gradient(circle,rgba(227,47,140,0.16)_0%,transparent_70%)] pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 lg:gap-9 items-center relative z-10">

            {/* Left: Interactive Elbow + Wrist Product Visual Cards */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4 w-full max-w-sm relative">
                {/* Card 1: Elbow Wraps */}
                <Link
                  href={`/product/${x10Prod?.slug || "x10-elbow-wraps"}`}
                  className="relative aspect-[4/5] w-full rounded-xl sm:rounded-2xl overflow-hidden bg-zinc-950 border border-white/10 hover:border-[#e32f8c]/50 shadow-lg group transition-colors duration-300 block"
                >
                  <div className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded-full bg-black/80 border border-white/15 text-[9px] font-black text-white uppercase tracking-wider">
                    X10 / X5
                  </div>
                  <Image
                    src={elbowCardImg}
                    alt="TrenZone Elbow Wraps"
                    fill
                    loading="lazy"
                    decoding="async"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 45vw, 200px"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/95 via-black/75 to-transparent z-10" />
                  <div className="absolute inset-x-2.5 bottom-2.5 z-20 flex items-end justify-between gap-1">
                    <div className="min-w-0">
                      <p className="text-[11px] font-black uppercase tracking-wide text-white leading-tight truncate">
                        Elbow Wraps
                      </p>
                      <p className="text-[10.5px] font-bold text-zinc-300 mt-0.5 tabular-nums truncate">
                        {isRo ? "De la " : "From "}
                        {formatPrice(minElbowPrice, activeCurrency)}
                      </p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-300 group-hover:text-[#e32f8c] group-hover:translate-x-0.5 transition-all shrink-0 mb-0.5" />
                  </div>
                </Link>

                {/* Center Connector */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white text-black font-black text-xs sm:text-sm flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.75)] border-2 border-zinc-900 pointer-events-none">
                  +
                </div>

                {/* Card 2: Wrist Wraps */}
                <Link
                  href={`/product/${wristProd?.slug || "x10-wrist-wraps"}`}
                  className="relative aspect-[4/5] w-full rounded-xl sm:rounded-2xl overflow-hidden bg-zinc-950 border border-white/10 hover:border-[#e32f8c]/50 shadow-lg group transition-colors duration-300 block"
                >
                  <div className="absolute top-2 right-2 z-20 px-2 py-0.5 rounded-full bg-[#e32f8c] text-white text-[9px] font-black uppercase tracking-wider shadow-sm">
                    60 CM
                  </div>
                  <Image
                    src={wristCardImg}
                    alt="TrenZone X10 Wrist Wraps"
                    fill
                    loading="lazy"
                    decoding="async"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 45vw, 200px"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/95 via-black/75 to-transparent z-10" />
                  <div className="absolute inset-x-2.5 bottom-2.5 z-20 flex items-end justify-between gap-1">
                    <div className="min-w-0">
                      <p className="text-[11px] font-black uppercase tracking-wide text-white leading-tight truncate">
                        Wrist Wraps
                      </p>
                      <p className="text-[10.5px] font-bold text-zinc-300 mt-0.5 tabular-nums truncate">
                        {formatPrice(wristPrice, activeCurrency)}
                      </p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-300 group-hover:text-[#e32f8c] group-hover:translate-x-0.5 transition-all shrink-0 mb-0.5" />
                  </div>
                </Link>
              </div>
            </div>

            {/* Right: Clean Copy, Cart Milestone Perks, Dynamic Price & Shop CTA */}
            <div className="lg:col-span-7 flex flex-col justify-between">
              <div>
                <h3 className="font-[family-name:var(--font-oswald)] font-black text-2xl sm:text-3xl md:text-4xl uppercase tracking-tight text-white leading-[0.95] mb-2.5">
                  ELBOW &amp; WRIST <span className="text-[#e32f8c]">WRAPS</span>
                </h3>

                <p className="text-xs sm:text-sm text-zinc-300 font-medium leading-relaxed max-w-lg mb-4 sm:mb-5">
                  {isRo
                    ? "Susținere reală pentru coate și încheieturi când urci greutățile. Alege modelul și culoarea potrivită în magazin."
                    : "Solid support for elbows and wrists when the bar gets heavy. Pick your stiffness and colorway in the shop."}
                </p>

                {/* Cart Perks Bar (Matching CartSheet 3-milestone rewards in sleek dark obsidian) */}
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 mb-5">
                  <div className="rounded-xl bg-black/50 border border-white/10 px-2 py-2 sm:px-3 sm:py-2.5 flex items-center justify-center gap-1.5 sm:gap-2">
                    <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#e32f8c] shrink-0" />
                    <div className="min-w-0 text-left">
                      <div className="text-[10px] sm:text-[11px] font-black text-white leading-tight truncate">
                        {isRo ? "Gratuit" : "Free ship"}
                      </div>
                      <div className="text-[9.5px] sm:text-[10px] font-semibold text-zinc-400 leading-tight tabular-nums truncate">
                        {compactShippingThreshold}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-black/50 border border-white/10 px-2 py-2 sm:px-3 sm:py-2.5 flex flex-col items-center justify-center text-center">
                    <div className="text-[11px] sm:text-xs font-black text-white leading-tight tabular-nums">
                      -5%
                    </div>
                    <div className="text-[9.5px] sm:text-[10px] font-semibold text-zinc-400 leading-tight truncate">
                      {isRo ? "2 produse" : "2 items"}
                    </div>
                  </div>

                  <div className="rounded-xl bg-[#e32f8c]/10 border border-[#e32f8c]/35 px-2 py-2 sm:px-3 sm:py-2.5 flex flex-col items-center justify-center text-center">
                    <div className="text-[11px] sm:text-xs font-black text-[#e32f8c] leading-tight tabular-nums">
                      -10%
                    </div>
                    <div className="text-[9.5px] sm:text-[10px] font-semibold text-zinc-200 leading-tight truncate">
                      {isRo ? "3+ produse" : "3+ items"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Price Anchor & Single Shop CTA Row */}
              <div className="pt-4 sm:pt-5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4">
                <div className="flex items-baseline justify-between sm:justify-start gap-2 whitespace-nowrap">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    {isRo ? "Prețuri de la" : "Starting from"}
                  </span>
                  <span className="text-xl sm:text-3xl font-black text-white tracking-tight tabular-nums">
                    {formatPrice(minStartPrice, activeCurrency)}
                  </span>
                </div>

                <Link
                  href="/shop"
                  className="w-full sm:w-auto shrink-0 whitespace-nowrap py-3.5 px-7 rounded-xl bg-white hover:bg-[#e32f8c] hover:text-white text-black font-black uppercase text-xs tracking-wider transition-all duration-300 inline-flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] group cursor-pointer"
                >
                  <span>{isRo ? "DESCOPERĂ PRODUSELE" : "DISCOVER PRODUCTS"}</span>
                  <ArrowRight className="w-4 h-4 shrink-0 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
