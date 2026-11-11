"use client";

import { Link, usePathname } from "@/i18n/routing";
import { ShoppingCart, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useCartStore } from "@/store/useCartStore";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";

import { useRegionStore } from "@/store/useRegionStore";
import { useLocale } from "next-intl";
import { getCdnUrl } from "@/lib/utils/cdn";

const CartSheet = dynamic(() => import("@/components/cart/CartSheet").then(mod => mod.CartSheet), { ssr: false });
const RegionSwitcher = dynamic(() => import("@/components/layout/RegionSwitcher").then(mod => mod.RegionSwitcher), { ssr: false });
const MobileMenu = dynamic(() => import("./MobileMenu").then(mod => mod.MobileMenu), { ssr: false });

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { items, setCartOpen } = useCartStore();
  const [mounted, setMounted] = useState(false);

  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("Navigation");

  const detectInitialRegion = useRegionStore(state => state.detectInitialRegion);
  const initializeFromIP = useRegionStore(state => state.initializeFromIP);
  const hasDetectedIP = useRegionStore(state => state.hasDetectedIP);
  const fetchExchangeRates = useRegionStore(state => state.fetchExchangeRates);

  // Get the unlocalized pathname (e.g., "/" for "/ro/" or "/en/")
  const isRootPath = pathname === "/" || pathname === "";
  const isHeroPath = isRootPath || pathname === "/reviews";

  useEffect(() => {
    setMounted(true);

    // Fetch DB-managed exchange rates once on boot (cached 5 min)
    fetchExchangeRates();

    // Attempt full IP detection if not done yet
    if (!hasDetectedIP) {
      initializeFromIP();
    } else {
      detectInitialRegion(locale);
    }

    const handleScroll = () => {
      const scrolled = window.scrollY > 20;
      setIsScrolled(scrolled);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // init on mount
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname, isRootPath]);

  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);

  // Common Transition Definition for perfect synchronization
  const transition = {
    duration: 0.6,
    ease: [0.16, 1, 0.3, 1] as const // Fixed: as const for cubic-bezier array
  };

  return (
    <>
      <div className="dark">
        <header className="fixed top-0 left-0 right-0 z-[100] w-full pointer-events-none">
          {/* 
            ULTRA-SMOOTH ARCHITECTURE: 
            The shell (background) narrows independently of the content.
            This ensures that the TrenZone Logo and Menu items NEVER recalculate their position.
          */}
          <div className="relative w-full">

            {/* 1. THE FLOATING SHELL (Background & Border) */}
            <motion.div
              initial="initial"
              animate={isScrolled ? "scrolled" : "initial"}
              variants={{
                initial: {
                  width: "98%",
                  maxWidth: "100%",
                  y: isRootPath ? 44 : 12,
                  height: "80px",
                  borderRadius: 24,
                  backgroundColor: isHeroPath ? "rgba(10, 10, 10, 0.15)" : "rgba(10, 10, 10, 0.95)",
                  borderColor: isHeroPath ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.08)",
                  backdropFilter: "blur(0px)",
                },
                scrolled: {
                  width: "98%",
                  maxWidth: "100%",
                  y: 12,
                  height: "80px",
                  borderRadius: 24,
                  backgroundColor: "rgba(10, 10, 10, 0.75)",
                  borderColor: "rgba(255, 255, 255, 0.15)",
                  backdropFilter: "blur(16px)",
                }
              }}
              transition={transition}
              style={{
                borderWidth: "1px",
                borderStyle: "solid",
                willChange: "background-color, border-color, backdrop-filter",
                margin: "0 auto",
                pointerEvents: "auto",
                transformOrigin: "top center",
                WebkitBackdropFilter: isScrolled ? "blur(16px)" : "blur(0px)",
              }}
              className="absolute top-0 left-0 right-0 z-[-1] shadow-2xl overflow-hidden"
            />

            {/* 2. THE CONTENT (Static positioning relative to screen center) */}
            <motion.div
              initial="initial"
              animate={isScrolled ? "scrolled" : "initial"}
              variants={{
                initial: { height: "80px", y: isRootPath ? 44 : 12 },
                scrolled: { height: "80px", y: 12 }
              }}
              transition={transition}
              className="container mx-auto px-4 md:px-10 grid grid-cols-3 items-center pointer-events-auto"
            >

              {/* Column 1: Hamburger (sm) / Logo (lg) */}
              <div className="flex items-center justify-start lg:order-1">
                <button
                  className="lg:hidden flex items-center justify-center w-11 h-11 md:w-12 md:h-12 text-white hover:text-[#e32f8c] active:scale-90 transition-all drop-shadow-md"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  aria-label={mobileMenuOpen ? "Închide meniul" : "Deschide meniul"}
                >
                  {mobileMenuOpen ? <X className="w-6 h-6 md:w-7 md:h-7" /> : <Menu className="w-6 h-6 md:w-7 md:h-7" />}
                </button>

                <Link href="/" className="hidden lg:flex items-center group relative py-1" aria-label="TrenZone Home">
                  <Image
                    src={getCdnUrl("/images/logos/trenzone_logo.webp")}
                    alt="TrenZone Emblem"
                    width={40}
                    height={40}
                    priority
                    className="w-9 h-9 md:w-10 md:h-10 object-contain drop-shadow-[0_0_14px_rgba(227,47,140,0.6)] group-hover:scale-110 transition-transform duration-300 shrink-0"
                  />
                </Link>
              </div>

              {/* Column 2: Logo (sm) / Nav Links (lg) */}
              <div className="flex items-center justify-center lg:order-2">
                {/* Mobile Logo (Icon only, no text) */}
                <Link href="/" className="flex lg:hidden items-center justify-center group relative py-1" aria-label="TrenZone Home">
                  <Image
                    src={getCdnUrl("/images/logos/trenzone_logo.webp")}
                    alt="TrenZone Emblem"
                    width={38}
                    height={38}
                    priority
                    className="w-8 h-8 sm:w-9 sm:h-9 object-contain drop-shadow-[0_0_12px_rgba(227,47,140,0.6)] active:scale-95 transition-transform shrink-0"
                  />
                </Link>

                {/* Desktop Centered Nav */}
                <nav className="hidden lg:flex items-center gap-10 font-sans text-[11px] font-black uppercase tracking-[0.3em] whitespace-nowrap">
                  {[
                    { href: "/", label: t('home') },
                    { href: "/shop", label: t('shop') },
                    { href: "/affiliate", label: t('affiliate') },
                    { href: "/about", label: t('about') },
                    { href: "/contact", label: t('contact') },
                  ].map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href as any}
                        className="group relative py-2 flex items-center gap-2"
                      >
                        <div className="relative">
                          {(item as any).accent && (
                            <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex items-center gap-1 opacity-90 whitespace-nowrap">
                              <span className="w-1 h-1 bg-[#e32f8c] rounded-full animate-pulse" />
                              <span className="text-[9px] font-black text-[#e32f8c] tracking-[0.1em]">-10%</span>
                            </div>
                          )}
                          <span className={`transition-colors duration-300 ${isActive ? "text-[#e32f8c]" : "text-white/70 hover:text-white"
                            }`}>
                            {item.label}
                          </span>
                        </div>

                        <div className={`absolute bottom-0 left-0 h-[1.5px] bg-[#e32f8c] transition-all duration-500 ${isActive ? "w-full" : "w-0 group-hover:w-full"
                          }`} />
                      </Link>
                    );
                  })}
                </nav>
              </div>

              {/* Column 3: Actions (all) */}
              <div className="flex items-center justify-end gap-1 md:gap-2 lg:order-3">
                <div className="hidden sm:block">
                  <RegionSwitcher />
                </div>

                <button
                  onClick={() => setCartOpen(true)}
                  className="group flex items-center justify-center w-11 h-11 md:w-14 md:h-14 text-white hover:text-[#e32f8c] active:scale-95 transition-all relative"
                  aria-label="Deschide coșul de cumpărături"
                >
                  <ShoppingCart className="w-6 h-6 md:w-7 md:h-7 drop-shadow-xl" />
                  {mounted && totalItems > 0 && (
                    <span className="absolute top-2 -right-0.5 bg-[#e32f8c] text-black text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#0a0a0a] shadow-[0_0_15px_rgba(227, 47, 140,0.4)] group-hover:scale-110 transition-transform">
                      {totalItems}
                    </span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>

          <CartSheet />
        </header>

        <MobileMenu
          isOpen={mobileMenuOpen}
          onOpenChange={setMobileMenuOpen}
        />
      </div>

      {/* Spacer for non-hero pages to prevent content hiding under navbar */}
      {!isHeroPath && !pathname.includes("/product/") && <div className="h-[92px]" />}
    </>
  );
}