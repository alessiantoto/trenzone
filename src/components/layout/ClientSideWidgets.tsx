"use client";

import { Suspense, useState } from "react";
import dynamic from "next/dynamic";
import { Toaster } from "react-hot-toast";
import { ReferralHandler } from "@/components/cart/ReferralHandler";
import { clearMaintenanceBypass } from "@/app/actions/admin-settings";
import { Lock, Loader2 } from "lucide-react";

const ConsentBanner = dynamic(() => import("@/components/legal/ConsentBanner").then(mod => mod.ConsentBanner), { ssr: false });
const ScratchPromoPopup = dynamic(() => import("@/components/promo/ScratchPromoPopup").then(mod => mod.ScratchPromoPopup), { ssr: false });

const TrenZoneAssistant = dynamic(() => import("@/components/layout/TrenZoneAssistant").then(mod => mod.TrenZoneAssistant), { ssr: false });
const Footer = dynamic(() => import("@/components/layout/Footer").then(mod => mod.Footer), { ssr: false });
const PreorderConflictModal = dynamic(() => import("@/components/cart/PreorderConflictModal").then(mod => mod.PreorderConflictModal), { ssr: false });

export function ClientSideWidgets({ isMaintenanceMode }: { isMaintenanceMode: boolean }) {
  const [relocking, setRelocking] = useState(false);

  return (
    <>
      <Suspense fallback={null}>
        <ReferralHandler />
      </Suspense>
      <Footer />
      <ConsentBanner />

      {!isMaintenanceMode && <ScratchPromoPopup />}
      <TrenZoneAssistant />
      <PreorderConflictModal />
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#090d16',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            fontSize: '13px',
            fontWeight: 600,
          }
        }}
      />

      {/* Floating indicator when admin is browsing with bypass active */}
      {isMaintenanceMode && (
        <div className="fixed bottom-4 left-4 z-[9999] bg-[#0c0d12]/95 border border-amber-500/40 text-white text-xs px-3.5 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
          <div className="flex flex-col">
            <span className="font-bold text-amber-300 text-[11px] uppercase tracking-wider">Mod Mentenanță Activ</span>
            <span className="text-[10px] text-zinc-400">Publicul vede ecranul de mentenanță. Tu ești în modul Bypass.</span>
          </div>
          <button
            onClick={async () => {
              setRelocking(true);
              try {
                await clearMaintenanceBypass();
                window.location.reload();
              } finally {
                setRelocking(false);
              }
            }}
            disabled={relocking}
            className="ml-2 px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-50"
          >
            {relocking ? <Loader2 size={12} className="animate-spin" /> : <Lock size={12} />}
            Reblochează
          </button>
        </div>
      )}
    </>
  );
}
