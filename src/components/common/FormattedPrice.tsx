"use client";

import { useRegionStore } from "@/store/useRegionStore";
import { formatPrice } from "@/utils/currency";
import { getProductPrice } from "@/utils/pricing";

export function FormattedPrice({ ronPrice, className }: { ronPrice: number | Record<string, number>; className?: string }) {
  const { currency } = useRegionStore();
  return <span className={className}>{formatPrice(getProductPrice(ronPrice, currency), currency)}</span>;
}

