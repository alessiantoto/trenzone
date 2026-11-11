"use client";

import { cn } from "@/lib/utils";

interface ProductPriceProps {
  price: any;
  originalPrice?: any;
  className?: string;
}

import { useRegionStore } from "@/store/useRegionStore";
import { getProductPrice } from "@/utils/pricing";
import { CURRENCY_SYMBOLS } from "@/utils/currency";

export function ProductPrice({ price, originalPrice, className }: ProductPriceProps) {
  const { currency } = useRegionStore();

  const numericPrice = getProductPrice(price, currency);
  const numericOriginalPrice = originalPrice ? getProductPrice(originalPrice, currency) : 0;
  
  const currencyKey = currency.toUpperCase();
  const symbol = CURRENCY_SYMBOLS[currencyKey] || currencyKey;
  const isSuffix = ["RON", "HUF", "CZK", "PLN", "BGN", "HRK", "SEK", "DKK", "NOK", "CHF"].includes(currencyKey);

  const formatValue = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const [intPart, decPart] = formatValue(numericPrice).split('.');
  const savings = numericOriginalPrice > numericPrice ? numericOriginalPrice - numericPrice : 0;

  return (
    <div className={cn("flex flex-col items-start gap-1", className)}>
      <div className="flex items-baseline gap-2">
        {/* Main Price Display — High Power Typography */}
        <div className="flex items-baseline">
          {!isSuffix && (
             <span className="text-xl md:text-2xl font-black text-black mr-1.5 leading-none">
              {symbol}
            </span>
          )}
          <span className="text-4xl md:text-5xl font-black text-black tracking-tighter leading-none">
            {intPart}
          </span>
          <span className="text-xl md:text-2xl font-black text-black tracking-tighter ml-0.5 leading-none">
            .{decPart}
          </span>
          {isSuffix && (
            <span className="text-xl md:text-2xl font-black text-black ml-1.5 leading-none">
              {symbol}
            </span>
          )}
        </div>

        {/* Comparison Price — Elite Emerald Power Logic */}
        {numericOriginalPrice > numericPrice && (
          <span className="text-sm md:text-base font-bold line-through text-zinc-300 decoration-zinc-400/50 leading-none ml-2">
            {formatValue(numericOriginalPrice)} {symbol}
          </span>
        )}
      </div>

      {/* Savings Badge — Positive Reinforcement */}
      {numericOriginalPrice > numericPrice && (
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-2 ml-1">
          {Math.round(((numericOriginalPrice - numericPrice) / numericOriginalPrice) * 100) > 0 ? (
            <>Economisești <span className="text-green-600">{formatValue(savings)} {symbol}</span></>
          ) : null}
        </p>
      )}
    </div>
  );
}
