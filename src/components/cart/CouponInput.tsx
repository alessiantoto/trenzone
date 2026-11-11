"use client";

import { useState } from "react";
import { useCartStore } from "@/store/useCartStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { validateCoupon } from "@/app/actions/coupons";
import { useTranslations } from "next-intl";
import { Loader2, Check, X, Ticket } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function CouponInput() {
  const t = useTranslations("Checkout");
  const { getTotals, setCoupon, appliedCoupon } = useCartStore();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { subtotal } = getTotals();

  const handleApply = async () => {
    if (!code) return;
    setLoading(true);
    setError(null);

    try {
      const result = await validateCoupon(code, subtotal);
      if (result.isValid && result.coupon) {
        setCoupon(result.coupon);
        setCode("");
      } else {
        setError(result.message || t('invalid_coupon'));
      }
    } catch (err) {
      setError(t('invalid_coupon'));
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    setCoupon(null);
    setError(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("tz_referral_code");
    }
  };

  if (appliedCoupon) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between p-3 bg-green-500/5 border border-green-500/20 rounded-2xl mb-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
            <Ticket className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-green-600">
              {appliedCoupon.code}
            </p>
            <p className="text-[8px] font-bold text-green-500/60 uppercase">
              {t('coupon_applied')}
            </p>
          </div>
        </div>
        <button 
          onClick={handleRemove}
          className="p-2 hover:bg-green-500/10 rounded-xl transition-colors text-green-600"
        >
          <X className="w-4 h-4" />
        </button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-2 mb-6">
      <div className="flex gap-2 p-2 bg-zinc-50 rounded-2xl border border-zinc-100 transition-all focus-within:border-black/20">
        <Input 
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && handleApply()}
          placeholder={t('discount_placeholder')} 
          className="bg-transparent border-none h-10 text-xs font-black focus-visible:ring-0 placeholder:text-zinc-400 placeholder:uppercase"
          disabled={loading}
        />
        <Button 
          onClick={handleApply}
          disabled={loading || !code}
          className="h-10 px-6 rounded-xl bg-black hover:bg-zinc-800 text-white text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('apply')}
        </Button>
      </div>
      
      <AnimatePresence>
        {error && (
          <motion.p 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-[10px] font-black text-red-500 px-2 uppercase tracking-tight"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
