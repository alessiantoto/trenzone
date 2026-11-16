"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useCartStore } from "@/store/useCartStore";
import { useRegionStore } from "@/store/useRegionStore";
import { validateCoupon } from "@/app/actions/coupons";
import { useLocale } from "next-intl";
import toast from "react-hot-toast";

/**
 * ReferralHandler
 * 
 * Automatically captures affiliate referral codes from URLs:
 * e.g., trenzone.fit/?ref=ALE or /ro/?ref=ALE or ?coupon=ALE
 * 
 * 1. Persists URL referral codes immediately so empty-cart visitors don't lose them.
 * 2. Validates the coupon with the database (and retries automatically when cart value changes if min_purchase wasn't met yet).
 * 3. Applies valid coupons to useCartStore.appliedCoupon.
 * 4. Clears invalid/inactive/expired codes from localStorage.
 */
export function ReferralHandler() {
  const searchParams = useSearchParams();
  const locale = useLocale();
  const isRo = locale === 'ro';
  const items = useCartStore((s) => s.items);
  const appliedCoupon = useCartStore((s) => s.appliedCoupon);
  const currency = useRegionStore((s) => s.currency);
  const lastAttemptKeyRef = useRef<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const urlRef = searchParams.get("ref") || searchParams.get("coupon") || searchParams.get("r");
    if (urlRef && urlRef.trim()) {
      const normalizedUrlRef = urlRef.trim().toUpperCase();
      const prevUrlCaptured = sessionStorage.getItem("tz_url_ref_captured");
      if (prevUrlCaptured !== normalizedUrlRef) {
        sessionStorage.removeItem("tz_manual_coupon_override");
        sessionStorage.setItem("tz_url_ref_captured", normalizedUrlRef);
      }
      localStorage.setItem("tz_referral_code", normalizedUrlRef);
    }

    if (sessionStorage.getItem("tz_manual_coupon_override") === "1") {
      return;
    }

    const storedRef = localStorage.getItem("tz_referral_code");
    const targetCode = (urlRef || storedRef || "").trim().toUpperCase();
    if (!targetCode) return;

    if (appliedCoupon?.code?.toUpperCase() === targetCode) {
      return;
    }

    const { subtotal } = useCartStore.getState().getTotals(currency || "RON");
    const attemptKey = `${targetCode}|${subtotal}|${currency}`;
    if (lastAttemptKeyRef.current === attemptKey && !urlRef) return;
    lastAttemptKeyRef.current = attemptKey;

    const applyReferralDiscount = async () => {
      try {
        const res = await validateCoupon(targetCode, subtotal, currency || "RON", isRo ? "ro" : "en");

        if (res.isValid && res.coupon) {
          useCartStore.getState().setCoupon(res.coupon);
          localStorage.setItem("tz_referral_code", targetCode);

          if (urlRef || items.length > 0) {
            toast.success(
              isRo
                ? `Codul partener ${res.coupon.code} a fost aplicat în coș!`
                : `Partner code ${res.coupon.code} applied to your cart!`,
              { id: `ref-applied-${targetCode}`, duration: 4000 }
            );
          }
        } else {
          const msg = String(res?.message || "").toLowerCase();
          const isMinPurchasePending = msg.includes("minim") || msg.includes("minimum");
          if (!isMinPurchasePending && !urlRef) {
            localStorage.removeItem("tz_referral_code");
          }
        }
      } catch (e) {
        console.warn("Referral coupon auto-apply warning:", e);
      }
    };

    applyReferralDiscount();
  }, [searchParams, isRo, items, currency, appliedCoupon]);

  return null;
}
