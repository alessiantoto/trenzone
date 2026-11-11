"use client";

import { useState } from "react";
import { RefreshCw, Check, Zap } from "lucide-react";
import { purgeAllSiteCache } from "@/app/actions/admin-settings";
import toast from "react-hot-toast";

export function ClearCacheButton({ variant = "header" }: { variant?: "header" | "card" }) {
  const [loading, setLoading] = useState(false);
  const [justCleared, setJustCleared] = useState(false);
  const [lastClearedAt, setLastClearedAt] = useState<string | null>(null);

  const handleClearCache = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await purgeAllSiteCache();
      if (res.success) {
        setJustCleared(true);
        setLastClearedAt(res.timestamp);
        toast.success(
          res.cloudflarePurged
            ? `Cache Site + Cloudflare golit (${res.timestamp})!`
            : `Cache-ul site-ului a fost șters (${res.timestamp})!`
        );
        setTimeout(() => setJustCleared(false), 3500);
      }
    } catch (err: any) {
      toast.error(err?.message || "Eroare la golirea cache-ului.");
    } finally {
      setLoading(false);
    }
  };

  if (variant === "card") {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
        <button
          type="button"
          onClick={handleClearCache}
          disabled={loading}
          className={`w-full sm:w-auto min-h-[48px] px-6 py-3.5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2.5 shadow-sm active:scale-[0.98] disabled:opacity-60 cursor-pointer select-none ${
            justCleared
              ? "bg-emerald-600 text-white shadow-emerald-500/20"
              : "bg-slate-900 hover:bg-[#e32f8c] text-white"
          }`}
        >
          {loading ? (
            <>
              <RefreshCw size={16} className="animate-spin shrink-0" />
              <span>Se golește cache-ul...</span>
            </>
          ) : justCleared ? (
            <>
              <Check size={16} className="shrink-0 stroke-[3]" />
              <span>Cache Actualizat Instant!</span>
            </>
          ) : (
            <>
              <RefreshCw size={16} className="shrink-0" />
              <span>Șterge Tot Cache-ul Acum</span>
            </>
          )}
        </button>

        {lastClearedAt && (
          <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-center sm:text-left">
            Ultima curățare: {lastClearedAt}
          </span>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClearCache}
      disabled={loading}
      title="Golește tot cache-ul site-ului (Produse, Clipuri, Setări, Pagini) pentru a afișa instant ultimele modificări"
      className={`h-10 px-3 sm:px-4 rounded-xl border text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer active:scale-95 disabled:opacity-60 select-none whitespace-nowrap shrink-0 ${
        justCleared
          ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-2xs"
          : "bg-slate-900 hover:bg-[#e32f8c] active:bg-[#e32f8c] text-white border-transparent shadow-xs"
      }`}
    >
      {loading ? (
        <>
          <RefreshCw size={14} className="animate-spin shrink-0 text-[#e32f8c]" />
          <span>Se șterge...</span>
        </>
      ) : justCleared ? (
        <>
          <Check size={14} className="text-emerald-600 shrink-0 stroke-[3]" />
          <span>Cache Șters</span>
        </>
      ) : (
        <>
          <Zap size={14} className="text-[#e32f8c] group-hover:text-white shrink-0 fill-current" />
          <span>Șterge Cache</span>
        </>
      )}
    </button>
  );
}
