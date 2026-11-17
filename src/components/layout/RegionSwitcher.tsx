"use client";

import { useState, useEffect, useRef } from "react";
import { useRegionStore, Currency, Locale } from "@/store/useRegionStore";
import { useLocale } from "next-intl";
import { ChevronDown, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname, useRouter } from "@/i18n/routing";
import { RefObject } from "react";
import { LanguageFlagSvg } from "@/components/programs/LanguageFlagSvg";
import { cn } from "@/lib/utils";

const currencies: { code: Currency; symbol: string; name: string }[] = [
  { code: "RON", symbol: "lei", name: "Leu românesc" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "GBP", symbol: "£", name: "Pound Sterling" },
];

const languages: { code: Locale; shortLabel: string; label: string; isEnglish: boolean }[] = [
  { code: "en", shortLabel: "EN", label: "English", isEnglish: true },
  { code: "ro", shortLabel: "RO", label: "Română", isEnglish: false },
];

export function RegionSwitcher({
  variant = "dark",
  inline = false,
  scrollContainerRef,
}: {
  variant?: "dark" | "light";
  inline?: boolean;
  scrollContainerRef?: RefObject<HTMLDivElement>;
}) {
  const { currency, setCurrency } = useRegionStore();
  const locale = useLocale() as Locale;
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const handleClickOutside = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, []);

  if (!mounted) return null;

  const currentLang = languages.find((l) => l.code === locale) || languages[1];
  const currentCurr = currencies.find((c) => c.code === currency) || currencies[0];

  const handleLocaleChange = (newLocale: Locale) => {
    setIsOpen(false);
    useRegionStore.getState().setHasDetectedIP(true);
    if (newLocale === locale) return;
    if (scrollContainerRef?.current) {
      scrollContainerRef.current.scrollTo({ top: 0 });
    }
    router.push(pathname, { locale: newLocale });
  };

  const handleCurrencyChange = (newCurrency: Currency) => {
    setCurrency(newCurrency);
    setIsOpen(false);
    if (scrollContainerRef?.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const renderPanelContent = (darkSurface: boolean) => (
    <div className="flex flex-col gap-3">
      {/* Language Row (Single horizontal segmented control) */}
      <div>
        <div className="flex items-center justify-between mb-1.5 px-0.5">
          <span
            className={cn(
              "text-[10px] font-bold uppercase tracking-[0.18em]",
              darkSurface ? "text-[#e32f8c]" : "text-zinc-500"
            )}
          >
            {locale === "ro" ? "Limbă" : "Language"}
          </span>
          <span
            className={cn(
              "text-[10px] font-bold uppercase tracking-wider",
              darkSurface ? "text-zinc-500" : "text-zinc-400"
            )}
          >
            {currentLang.shortLabel} · {currentCurr.code}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {languages.map((lang) => {
            const isSelected = locale === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleLocaleChange(lang.code)}
                className={cn(
                  "flex items-center justify-center gap-2 h-11 px-3 rounded-xl border text-[12px] font-extrabold transition-all duration-150 cursor-pointer active:scale-[0.98]",
                  isSelected
                    ? darkSurface
                      ? "bg-[#e32f8c] border-[#e32f8c] text-black shadow-md shadow-[#e32f8c]/25"
                      : "bg-white border-[#e32f8c] text-[#111111] shadow-xs ring-1 ring-[#e32f8c]/20"
                    : darkSurface
                      ? "bg-white/[0.05] border-white/10 text-zinc-300 hover:bg-white/[0.1] hover:text-white"
                      : "bg-white/75 border-zinc-200/90 text-zinc-500 hover:bg-white hover:border-zinc-300 hover:text-[#111111]"
                )}
              >
                <LanguageFlagSvg isEnglish={lang.isEnglish} className="w-[18px] h-[12px]" />
                <span>{lang.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Currency Row (4 compact columns on 1 line) */}
      <div>
        <span
          className={cn(
            "block text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5 px-0.5",
            darkSurface ? "text-[#e32f8c]" : "text-zinc-500"
          )}
        >
          {locale === "ro" ? "Monedă" : "Currency"}
        </span>
        <div className="grid grid-cols-4 gap-1.5">
          {currencies.map((curr) => {
            const isSelected = currency === curr.code;
            return (
              <button
                key={curr.code}
                type="button"
                onClick={() => handleCurrencyChange(curr.code)}
                className={cn(
                  "h-12 flex flex-col items-center justify-center gap-0.5 rounded-xl border transition-all duration-150 cursor-pointer active:scale-[0.98]",
                  isSelected
                    ? darkSurface
                      ? "bg-[#e32f8c]/15 text-[#e32f8c] border-[#e32f8c]/70 shadow-sm shadow-[#e32f8c]/15"
                      : "bg-[#111111] text-white border-[#111111] shadow-xs"
                    : darkSurface
                      ? "bg-white/[0.04] text-zinc-400 border-white/10 hover:border-white/25 hover:text-white hover:bg-white/[0.08]"
                      : "bg-white text-zinc-600 border-zinc-200/90 hover:border-zinc-300 hover:text-[#111111]"
                )}
              >
                <span className="text-[11px] font-extrabold leading-none">{curr.symbol}</span>
                <span
                  className={cn(
                    "text-[9px] font-bold uppercase tracking-wider leading-none mt-0.5",
                    isSelected && !darkSurface ? "text-zinc-300" : ""
                  )}
                >
                  {curr.code}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const isDark = variant === "dark";

  // Mobile Menu integrated section (matches the drawer surface seamlessly)
  if (inline) {
    return (
      <div className="w-full">
        {renderPanelContent(isDark)}
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* Sleek Compact Desktop Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-full border transition-all active:scale-[0.98] cursor-pointer",
          isDark
            ? "bg-white/[0.05] border-white/12 hover:border-[#e32f8c]/50 hover:bg-white/[0.09] text-white"
            : "bg-zinc-100 border-zinc-200 hover:border-zinc-300 text-black"
        )}
        aria-label={locale === "ro" ? "Schimbă limba și moneda" : "Change language and currency"}
      >
        <LanguageFlagSvg isEnglish={currentLang.isEnglish} className="w-[18px] h-[12px]" />
        <span className="text-[11px] font-black uppercase tracking-wider leading-none">
          {currentLang.shortLabel}
        </span>
        <span className={cn("text-[10px]", isDark ? "text-white/25" : "text-zinc-300")}>/</span>
        <span className="text-[11px] font-black uppercase tracking-wider text-[#e32f8c] leading-none">
          {currentCurr.code}
        </span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 transition-transform duration-200 shrink-0",
            isOpen ? "rotate-180 text-[#e32f8c]" : isDark ? "text-zinc-400" : "text-zinc-500"
          )}
        />
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ type: "spring", stiffness: 520, damping: 36, mass: 0.6 }}
            style={{ willChange: "transform, opacity" }}
            className="absolute right-0 top-[calc(100%+10px)] w-[280px] z-[110] rounded-2xl bg-[#0e0e14] border border-white/15 p-4 shadow-2xl text-white transform-gpu"
          >
            <div className="flex items-center gap-2 pb-2.5 mb-3 border-b border-white/10">
              <Globe className="w-3.5 h-3.5 text-[#e32f8c]" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300">
                {locale === "ro" ? "Limbă & Monedă" : "Language & Currency"}
              </span>
            </div>
            {renderPanelContent(true)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

