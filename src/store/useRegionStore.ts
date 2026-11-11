"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { FALLBACK_RATES, setClientRatesGetter, convertFromRon as convertFromRonHelper } from "@/utils/pricing";

export type Currency = "RON" | "EUR" | "USD" | "GBP" | "PLN" | "CHF";
export type Locale = "ro" | "en";

interface RegionState {
  currency: Currency;
  hasDetectedIP: boolean;
  /** Admin-managed exchange rates fetched from /api/exchange-rates. 1 RON → X */
  exchangeRates: Record<string, number>;
  setCurrency: (currency: Currency) => void;
  setHasDetectedIP: (val: boolean) => void;
  initializeFromIP: () => Promise<{ currency: Currency; isRO: boolean }>;
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
      hasDetectedIP: false,
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
          // Skip network request for RON visitors (99% of traffic) unless foreign currency is active
          if (get().currency === "RON") return;

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
        try {
          const res = await fetch("https://ipapi.co/json/");
          const data = await res.json();
          const countryCode = data.country_code;
          const isRO = countryCode === "RO";

          let detectedCurrency: Currency = "RON";

          if (!isRO) {
            const validCurrencies: Currency[] = ["EUR", "USD", "GBP", "PLN", "CHF"];

            // Explicit Mappings for Elite Performance
            if (countryCode === "PL") {
              detectedCurrency = "PLN";
            } else if (countryCode === "CH") {
              detectedCurrency = "CHF";
            } else if (["HU", "CZ", "BG", "HR", "SK", "SI"].includes(countryCode)) {
              detectedCurrency = "EUR";
            } else {
              // Map BGN directly to EUR fallback if present in data
              if (data.currency === "BGN") data.currency = "EUR";
              detectedCurrency = validCurrencies.includes(data.currency as any) ? (data.currency as Currency) : "EUR";
            }
          }

          set({ currency: detectedCurrency, hasDetectedIP: true });
          return { currency: detectedCurrency, isRO };
        } catch (e) {
          console.error("Failed to detect region from IP. Falling back to RON.");
          return { currency: "RON", isRO: true };
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
        hasDetectedIP: state.hasDetectedIP,
        exchangeRates: state.exchangeRates,
      }),
    }
  )
);

// Register store's dynamic exchange rates with the pricing utility
if (typeof window !== "undefined") {
  setClientRatesGetter(() => useRegionStore.getState()?.exchangeRates);
}
