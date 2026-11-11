import { Currency } from "@/store/useRegionStore";
import { getProductPrice } from "./pricing";

export const CURRENCY_SYMBOLS: Record<string, string> = {
  "RON": " Lei",
  "EUR": "€",
  "USD": "$",
  "GBP": "£",
  "PLN": " zł",
  "CHF": " CHF",
};

/**
 * Formats price using the shared pricing utility.
 * Guarantees 100% parity between UI and Payment APIs.
 */
/**
 * Formats a price that is ALREADY in the target currency.
 * Use this for shipping prices from getShippingCost which are pre-converted.
 */
export function formatRawPrice(amount: number, targetCurrency: Currency | string): string {
  const currencyKey = (targetCurrency || "RON").toUpperCase();
  const symbol = CURRENCY_SYMBOLS[currencyKey] || currencyKey;
  const isSuffix = ["RON", "PLN", "CHF"].includes(currencyKey);
  const num = Number(amount) || 0;
  
  if (isSuffix) {
    return `${num.toFixed(2)}${symbol}`;
  }
  return `${symbol}${num.toFixed(2)}`;
}

export function formatPrice(priceData: any, targetCurrency: Currency | string): string {
  if (typeof priceData === 'object' && priceData !== null) {
    const numericPrice = getProductPrice(priceData, targetCurrency);
    return formatRawPrice(numericPrice, targetCurrency);
  }
  return formatRawPrice(Number(priceData) || 0, targetCurrency);
}
