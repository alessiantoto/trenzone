"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";
import { ShieldCheck, Settings, MoveRight, Check, Info, ArrowUpRight, X } from "lucide-react";
import { useConsent, ConsentSettings } from "@/hooks/useConsent";

export function ConsentBanner() {
  const t = useTranslations("Consent");
  const locale = useLocale();
  const { consent, isLoaded, updateConsent, acceptAll, declineAll } = useConsent();
  const [showDetails, setShowDetails] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Local state for toggles when customizing
  const [tempSettings, setTempSettings] = useState<ConsentSettings>({
    essential: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    // Only show if consent hasn't been set yet
    if (isLoaded && !consent) {
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isLoaded, consent]);

  // Sync state if changed in another tab
  useEffect(() => {
    const handleUpdate = () => {
      const stored = localStorage.getItem("campion_consent");
      if (stored) setIsVisible(false);
    };
    window.addEventListener("consent_updated", handleUpdate);
    return () => window.removeEventListener("consent_updated", handleUpdate);
  }, []);

  if (!isVisible) return null;

  const handleSaveCustom = () => {
    updateConsent(tempSettings);
    setIsVisible(false);
  };

  const handleAcceptAll = () => {
    acceptAll();
    setIsVisible(false);
  };

  const handleDeclineAll = () => {
    declineAll();
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 20, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          style={{ willChange: "transform, opacity" }}
          className="fixed bottom-6 left-6 right-6 md:left-auto md:right-10 md:max-w-[400px] z-[100]"
        >
          {/* Main Card with Glass effect */}
          <div className="relative group">
            {/* Subtle Outer Glow */}
            <div className="absolute -inset-[1px] bg-gradient-to-b from-white/10 to-transparent rounded-[2.5rem] -z-10" />
            
            <div className="bg-zinc-950/98 border border-white/10 rounded-[2.2rem] shadow-2xl overflow-hidden shadow-black/80 ring-1 ring-white/5">
              
              <div className="p-7 md:p-8">
                <button
                  onClick={handleDeclineAll}
                  aria-label={locale === 'en' ? "Close consent banner" : "Închide bannerul de consimțământ"}
                    className="absolute top-6 right-6 p-2 text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Brand Identifier (Small/Elite) */}
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
                    {t('brand_label')}
                  </span>
                </div>

                {!showDetails ? (
                  <>
                    <div className="relative mb-8">
                      <h3 className="text-white font-black text-xl leading-tight mb-3 uppercase tracking-tighter pr-8">
                        {t('title')}
                      </h3>
                      <p className="text-zinc-400 text-xs leading-relaxed font-medium">
                        {t('description')}
                      </p>
                    </div>

                    <div className="flex flex-col gap-3">
                      <button
                        onClick={handleAcceptAll}
                        className="group relative flex items-center justify-center gap-2 bg-primary hover:bg-white text-black font-black uppercase tracking-[0.1em] text-[10px] py-4 rounded-full transition-all active:scale-95 shadow-[0_4px_20px_rgba(255,100,0,0.15)] hover:shadow-[0_4px_20px_rgba(255,255,255,0.1)]"
                      >
                        {t('accept_all')}
                        <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </button>
                      
                      <div className="flex gap-3">
                        <button
                          onClick={handleDeclineAll}
                          className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold uppercase tracking-wider text-[9px] py-3.5 rounded-full border border-white/5 transition-all"
                        >
                          {t('decline')}
                        </button>
                        <button
                          onClick={() => setShowDetails(true)}
                          className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold uppercase tracking-wider text-[9px] py-3.5 rounded-full border border-white/5 transition-all flex items-center justify-center gap-2"
                        >
                          <Settings className="w-3 h-3" /> {t('customize')}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="space-y-4"
                  >
                    <div className="space-y-2.5">
                      {/* Essential */}
                      <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 opacity-50">
                        <div>
                          <p className="text-white text-[10px] font-black uppercase tracking-widest">{t('essential_title')}</p>
                          <p className="text-zinc-500 text-[10px] leading-tight mt-0.5">{t('essential_desc')}</p>
                        </div>
                        <div className="w-8 h-4 bg-primary/20 rounded-full flex items-center px-1">
                          <div className="w-2 h-2 bg-primary rounded-full translate-x-4" />
                        </div>
                      </div>

                      {/* Analytics */}
                      <button
                        onClick={() => setTempSettings(s => ({ ...s, analytics: !s.analytics }))}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                          tempSettings.analytics ? 'bg-primary/5 border-primary/30' : 'bg-white/[0.03] border-white/5'
                        }`}
                      >
                        <div className="text-left">
                          <p className={`text-[10px] font-black uppercase tracking-widest ${tempSettings.analytics ? 'text-primary' : 'text-zinc-300'}`}>
                            {t('analytics_title')}
                          </p>
                          <p className="text-zinc-500 text-[10px] leading-tight mt-0.5">{t('analytics_desc')}</p>
                        </div>
                        <div className={`w-8 h-4 rounded-full flex items-center px-1 transition-colors ${
                          tempSettings.analytics ? 'bg-primary' : 'bg-zinc-800'
                        }`}>
                          <motion.div 
                            animate={{ x: tempSettings.analytics ? 16 : 0 }}
                            className="w-2 h-2 bg-white rounded-full shadow-sm" 
                          />
                        </div>
                      </button>

                      {/* Marketing */}
                      <button
                        onClick={() => setTempSettings(s => ({ ...s, marketing: !s.marketing }))}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                          tempSettings.marketing ? 'bg-primary/5 border-primary/30' : 'bg-white/[0.03] border-white/5'
                        }`}
                      >
                        <div className="text-left">
                          <p className={`text-[10px] font-black uppercase tracking-widest ${tempSettings.marketing ? 'text-primary' : 'text-zinc-300'}`}>
                            {t('marketing_title')}
                          </p>
                          <p className="text-zinc-500 text-[10px] leading-tight mt-0.5">{t('marketing_desc')}</p>
                        </div>
                        <div className={`w-8 h-4 rounded-full flex items-center px-1 transition-colors ${
                          tempSettings.marketing ? 'bg-primary' : 'bg-zinc-800'
                        }`}>
                          <motion.div 
                            animate={{ x: tempSettings.marketing ? 16 : 0 }}
                            className="w-2 h-2 bg-white rounded-full shadow-sm" 
                          />
                        </div>
                      </button>
                    </div>

                    <div className="flex gap-3 pt-3">
                      <button
                        onClick={handleSaveCustom}
                        className="flex-1 bg-white hover:bg-primary text-black font-black uppercase tracking-widest text-[9px] py-4 rounded-full transition-all active:scale-95 shadow-xl"
                      >
                        {t('save')}
                      </button>
                      <button
                        onClick={() => setShowDetails(false)}
                        className="px-6 bg-white/5 hover:bg-white/10 text-zinc-400 font-bold uppercase tracking-widest text-[9px] py-4 rounded-full transition-all border border-white/5"
                      >
                        {t('back')}
                      </button>
                    </div>
                  </motion.div>
                )}

                <div className="mt-8 flex justify-center">
                  <Link 
                    href="/politica-cookie" 
                    className="group flex items-center gap-2 text-zinc-600 hover:text-white text-[9px] font-black uppercase tracking-[0.2em] transition-all"
                  >
                    <span className="border-b border-zinc-800 group-hover:border-white py-0.5">
                      {t('cookie_policy_link') || "Cookie Policy"}
                    </span>
                    <MoveRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
