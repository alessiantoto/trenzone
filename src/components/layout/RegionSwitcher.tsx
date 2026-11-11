"use client";

import { useState, useEffect, useRef } from "react";
import { useRegionStore, Currency, Locale } from "@/store/useRegionStore";
import { useLocale } from "next-intl";
import { ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname, useRouter } from "@/i18n/routing";
import Image from "next/image";
import { RefObject } from "react";

const currencies: { code: Currency; symbol: string; name: string }[] = [
  { code: "RON", symbol: "lei", name: "Leu românesc" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "GBP", symbol: "£", name: "Pound Sterling" },
  { code: "PLN", symbol: "zł", name: "Złoty polonez" },
  { code: "CHF", symbol: "CHF", name: "Franc Elvețian" },
];

const languages: { code: Locale; label: string; flag: string }[] = [
  { code: "ro", label: "Română", flag: "https://flagcdn.com/w80/ro.png" },
  { code: "en", label: "English", flag: "https://flagcdn.com/w80/gb.png" },
];

export function RegionSwitcher({ variant = 'dark', scrollContainerRef }: { variant?: 'dark' | 'light'; scrollContainerRef?: RefObject<HTMLDivElement> }) {
  const { currency, setCurrency } = useRegionStore();
  const locale = useLocale() as Locale;
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!mounted) return null;

  const currentLang = languages.find(l => l.code === locale) || languages[0];
  const currentCurr = currencies.find(c => c.code === currency) || currencies[0];

  const handleLocaleChange = (newLocale: Locale) => {
    setIsOpen(false);
    useRegionStore.getState().setHasDetectedIP(true);
    // Scroll back to top smoothly when closing
    if (scrollContainerRef?.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setTimeout(() => {
      router.push(pathname, { locale: newLocale });
    }, 300);
  };

  const handleCurrencyChange = (newCurrency: Currency) => {
    setCurrency(newCurrency);
    setIsOpen(false);
    // Scroll back to top smoothly when closing
    if (scrollContainerRef?.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleToggle = () => {
    const opening = !isOpen;
    setIsOpen(opening);
    if (opening && scrollContainerRef?.current) {
      // Small delay to let the dropdown render before scrolling
      setTimeout(() => {
        scrollContainerRef.current?.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }, 80);
    } else if (!opening && scrollContainerRef?.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const isDark = variant === 'dark';

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Button */}
      <button
        onClick={handleToggle}
        className={`w-full flex items-center justify-between px-5 py-3.5 rounded-[2rem] transition-all active:scale-[0.98] text-left ${
          isDark
            ? 'bg-white/[0.03] border border-white/10 hover:border-[#e32f8c]/40'
            : 'bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 shadow-sm'
        }`}
        style={{ willChange: "transform" }}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-8 h-5 rounded-sm overflow-hidden border border-black/10 relative shrink-0">
            <Image
              src={currentLang.flag}
              alt={currentLang.label}
              width={32}
              height={20}
              unoptimized
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col items-start min-w-0">
            <span className={`text-xs font-heading font-black uppercase tracking-wider leading-none whitespace-nowrap overflow-hidden text-ellipsis ${isDark ? 'text-white' : 'text-black'}`}>
              {currentLang.label} &middot; <span className="text-[#e32f8c]">{currentCurr.code}</span>
            </span>
            <span className={`text-[9px] font-bold uppercase tracking-widest mt-1 whitespace-nowrap ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {locale === 'ro' ? 'Limbă & Monedă' : 'Language & Currency'}
            </span>
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 transition-transform duration-300 shrink-0 ${isOpen ? "rotate-180 text-[#e32f8c]" : isDark ? "text-zinc-500" : "text-zinc-400"}`} />
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={{ willChange: "transform, opacity", transformOrigin: "top center" }}
            className={`absolute right-0 top-[calc(100%+12px)] w-[260px] z-[100] overflow-hidden rounded-[1.75rem] border shadow-2xl
              ${isDark ? 'bg-[#0d0d0d] border-white/10' : 'bg-white border-zinc-200'}`}
          >
            {/* Inner scroll area */}
            <div className="max-h-[70vh] overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="p-5 flex flex-col gap-6">

                {/* ── Language Section ── */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#e32f8c] mb-3 px-1">
                    {locale === 'ro' ? '🌐  Limbă' : '🌐  Language'}
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {languages.map((lang) => {
                      const isSelected = locale === lang.code;
                      return (
                        <button
                          key={lang.code}
                          onClick={() => handleLocaleChange(lang.code)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left ${
                            isSelected
                              ? "bg-[#e32f8c] text-black shadow-md shadow-[#e32f8c]/20"
                              : isDark
                                ? "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                                : "bg-zinc-50 text-zinc-500 hover:bg-zinc-100 hover:text-black"
                          }`}
                        >
                          <Image
                            src={lang.flag}
                            alt={lang.label}
                            width={24}
                            height={16}
                            unoptimized
                            className="w-6 h-4 rounded-sm object-cover border border-black/10 shrink-0"
                          />
                          <span className="text-xs font-black uppercase tracking-widest flex-1">{lang.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={3} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Divider */}
                <div className={`h-px ${isDark ? 'bg-white/5' : 'bg-zinc-100'}`} />

                {/* ── Currency Section ── */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#e32f8c] mb-3 px-1">
                    {locale === 'ro' ? '💱  Monedă' : '💱  Currency'}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {currencies.map((curr) => {
                      const isSelected = currency === curr.code;
                      return (
                        <button
                          key={curr.code}
                          onClick={() => handleCurrencyChange(curr.code)}
                          className={`flex flex-col items-center justify-center gap-1 py-3.5 px-2 rounded-2xl transition-all border ${
                            isSelected
                              ? isDark
                                ? "bg-[#e32f8c]/10 text-[#e32f8c] border-[#e32f8c]/50 shadow-md shadow-[#e32f8c]/10"
                                : "bg-[#e32f8c]/10 text-[#e32f8c] border-[#e32f8c]/40"
                              : isDark
                                ? "bg-white/[0.03] text-white/40 border-white/5 hover:border-white/20 hover:text-white hover:bg-white/[0.06]"
                                : "bg-zinc-50 text-zinc-400 border-zinc-200 hover:border-zinc-300 hover:text-black hover:bg-zinc-100"
                          }`}
                        >
                          <span className={`text-base font-black leading-none ${isSelected ? 'text-[#e32f8c]' : ''}`}>{curr.symbol}</span>
                          <span className="text-[10px] font-black uppercase tracking-widest">{curr.code}</span>
                          {isSelected && <div className="w-1 h-1 rounded-full bg-[#e32f8c] mt-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

