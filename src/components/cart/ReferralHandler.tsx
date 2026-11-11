"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useCartStore } from "@/store/useCartStore";
import { validateCoupon } from "@/app/actions/coupons";
import { useLocale } from "next-intl";
import toast from "react-hot-toast";

/**
 * ReferralHandler
 * 
 * Automatically captures affiliate referral codes from URLs:
 * e.g., trenzone.fit/?ref=ALE or /ro/?ref=ALE or ?coupon=ALE
 * 
 * 1. Validates the coupon with the database.
 * 2. If valid, automatically applies it to useCartStore.appliedCoupon.
 * 3. Persists the referral code in localStorage ('tz_referral_code').
 * 4. Ensures the referral discount persists across navigation & reloads.
 * 5. Can only be replaced if the user explicitly removes it (clicks 'X').
 */
export function ReferralHandler() {
  const searchParams = useSearchParams();
  const locale = useLocale();
  const isRo = locale === 'ro';
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Check for query parameter (?ref=... or ?coupon=...)
    const urlRef = searchParams.get("ref") || searchParams.get("coupon") || searchParams.get("r");
    const storedRef = localStorage.getItem("tz_referral_code");
    const targetCode = (urlRef || storedRef || "").trim().toUpperCase();

    if (!targetCode) return;

    // Avoid duplicate validation calls in the same component cycle
    if (hasCheckedRef.current && !urlRef) return;
    hasCheckedRef.current = true;

    const applyReferralDiscount = async () => {
      try {
        const { appliedCoupon, setCoupon, getTotals } = useCartStore.getState();

        // If this exact coupon is already applied, just make sure localStorage has it
        if (appliedCoupon?.code?.toUpperCase() === targetCode) {
          localStorage.setItem("tz_referral_code", targetCode);
          return;
        }

        // Validate coupon with database
        const { subtotal } = getTotals();
        const res = await validateCoupon(targetCode, subtotal, "RON", isRo ? "ro" : "en");

        if (res.isValid && res.coupon) {
          setCoupon(res.coupon);
          localStorage.setItem("tz_referral_code", targetCode);

          // Only show notification if it was entered via URL query param
          if (urlRef) {
            toast.success(
              isRo
                ? `Codul partener ${res.coupon.code} a fost aplicat în coș!`
                : `Partner code ${res.coupon.code} applied to your cart!`,
              { id: `ref-applied-${targetCode}`, duration: 4000 }
            );
          }
        }
      } catch (e) {
        console.warn("Referral coupon auto-apply warning:", e);
      }
    };

    applyReferralDiscount();
  }, [searchParams, isRo]);

  return null;
}
