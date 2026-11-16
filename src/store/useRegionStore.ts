"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { FALLBACK_RATES, setClientRatesGetter, convertFromRon as convertFromRonHelper } from "@/utils/pricing";
import { useCheckoutStore } from "@/store/useCheckoutStore";

export type Currency = "RON" | "EUR" | "USD" | "GBP";
export type Locale = "ro" | "en";

interface RegionState {
  currency: Currency;
  countryCode: string;
  hasDetectedIP: boolean;
  hasDetectedCountry: boolean;
  /** Admin-managed exchange rates fetched from /api/exchange-rates. 1 RON → X */
  exchangeRates: Record<string, number>;
  setCurrency: (currency: Currency) => void;
  setHasDetectedIP: (val: boolean) => void;
  initializeFromIP: () => Promise<{ currency: Currency; isRO: boolean }>;
  ensureCountryDetected: () => Promise<void>;
  detectInitialRegion: (locale: string) => void;
  /** Fetches latest exchange rates from the server API (called once on app boot) */
  fetchExchangeRates: () => Promise<void>;
  /** Converts a RON amount to the current currency using live rates */
  convertFromRon: (amountRon: number, targetCurrency?: string) => number;
}

export const useRegionStore = create<RegionState>()(
  persist(
    (set, get) => ({
      currency: "RON",
      countryCode: "RO",
      hasDetectedIP: false,
      hasDetectedCountry: false,
      exchangeRates: FALLBACK_RATES,
      setCurrency: (currency) => {
        set({ currency });
        if (currency !== "RON") {
          get().fetchExchangeRates();
        }
      },
      setHasDetectedIP: (hasDetectedIP) => set({ hasDetectedIP }),

      fetchExchangeRates: async () => {
        try {
          // Avoid duplicate fetches in the same browser session
          if (typeof sessionStorage !== "undefined") {
            const lastFetch = Number(sessionStorage.getItem("tz_rates_ts") || 0);
            if (Date.now() - lastFetch < 3600 * 1000) return;
          }

          const res = await fetch("/api/exchange-rates");
          if (!res.ok) return;
          const json = await res.json();
          if (json?.rates && typeof json.rates === "object") {
            set({ exchangeRates: { ...FALLBACK_RATES, ...json.rates } });
            if (typeof sessionStorage !== "undefined") {
              sessionStorage.setItem("tz_rates_ts", String(Date.now()));
            }
          }
        } catch {
          // Keep FALLBACK_RATES on error
        }
      },

      convertFromRon: (amountRon, targetCurrency) => {
        const { currency, exchangeRates } = get();
        const tgt = (targetCurrency || currency).toUpperCase();
        if (tgt === "RON") return amountRon;
        return convertFromRonHelper(amountRon, tgt, exchangeRates);
      },

      initializeFromIP: async () => {
        const isEnLocale =
          typeof window !== "undefined" &&
          (document.documentElement.lang?.toLowerCase().startsWith("en") ||
            window.location.pathname.startsWith("/en"));
        try {
          const res = await fetch("https://ipapi.co/json/");
          if (!res.ok) throw new Error(`Geo HTTP ${res.status}`);
          const data = await res.json();
          const detectedCountry = String(data?.country_code || "").trim().toUpperCase();
          if (!detectedCountry) throw new Error("Missing country_code");
          const isRO = detectedCountry === "RO";

          let detectedCurrency: Currency = "RON";

          if (!isRO) {
            const validCurrencies: Currency[] = ["EUR", "USD", "GBP"];

            if (["PL", "CH", "HU", "CZ", "BG", "HR", "SK", "SI"].includes(detectedCountry)) {
              detectedCurrency = "EUR";
            } else {
              // Map BGN directly to EUR fallback if present in data
              if (data.currency === "BGN") data.currency = "EUR";
              detectedCurrency = validCurrencies.includes(data.currency as any) ? (data.currency as Currency) : "EUR";
            }
          }

          set({
            currency: detectedCurrency,
            countryCode: detectedCountry,
            hasDetectedIP: true,
            hasDetectedCountry: true,
          });
          useCheckoutStore.getState().setDetectedCountry(detectedCountry);
          get().fetchExchangeRates().catch(() => {});
          return { currency: detectedCurrency, isRO };
        } catch {
          const fallbackCurrency: Currency = isEnLocale ? "EUR" : "RON";
          set({
            currency: fallbackCurrency,
            hasDetectedIP: true,
          });
          return { currency: fallbackCurrency, isRO: !isEnLocale };
        }
      },
      ensureCountryDetected: async () => {
        if (get().hasDetectedCountry) return;
        try {
          const res = await fetch("https://ipapi.co/json/");
          const data = await res.json();
          const detectedCountry = String(data?.country_code || "RO").trim().toUpperCase() || "RO";
          set({ countryCode: detectedCountry, hasDetectedCountry: true });
          useCheckoutStore.getState().setDetectedCountry(detectedCountry);
        } catch {
          // Keep default countryCode silently
        }
      },
      detectInitialRegion: (locale) => {
        const state = (useRegionStore.getState() as any);
        // Only run if we haven't manually set or detected anything yet
        if (!state.hasDetectedIP) {
          if (locale === 'en') {
            set({ currency: 'EUR', hasDetectedIP: true });
          } else {
            set({ currency: 'RON', hasDetectedIP: true });
          }
        }
      },
    }),
    {
      name: "campion-region-storage",
      // Only persist currency, detection flag, and exchange rates
      partialize: (state) => ({
        currency: state.currency,
        countryCode: state.countryCode,
        hasDetectedIP: state.hasDetectedIP,
        hasDetectedCountry: state.hasDetectedCountry,
        exchangeRates: state.exchangeRates,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && !["RON", "EUR", "USD", "GBP"].includes(state.currency)) {
          state.setCurrency("EUR");
        }
      },
    }
  )
);

// Register store's dynamic exchange rates with the pricing utility & cross-tab sync
if (typeof window !== "undefined") {
  setClientRatesGetter(() => useRegionStore.getState()?.exchangeRates);
  window.addEventListener("storage", (e) => {
    if (e.key === "campion-region-storage") {
      useRegionStore.persist.rehydrate();
    }
  });
}
