"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ChevronRight, Send, ArrowUpRight, Plus, X, Calculator, Info, TrendingUp, AlertCircle, Check } from "lucide-react";
import { submitAffiliateApplication } from "@/app/actions/affiliate";

export default function AffiliatePage() {
  const t = useTranslations("Affiliate");
  const tShop = useTranslations("Shop");
  const locale = useLocale();

  // Form State
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [socials, setSocials] = useState<string[]>(['']);
  const [preferredCode, setPreferredCode] = useState('');
  const [message, setMessage] = useState("");
  const [preferredLocale, setPreferredLocale] = useState<'ro'|'en'>(locale === 'en' ? 'en' : 'ro');
  const [loadedAt, setLoadedAt] = useState<number>(0);
  const [honeypot, setHoneypot] = useState("");

  useEffect(() => {
    setLoadedAt(Date.now());
  }, []);

  useEffect(() => {
    setPreferredLocale(locale === 'en' ? 'en' : 'ro');
  }, [locale]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lastName.trim() || !firstName.trim() || !email.trim() || !socials[0].trim()) return;
    
    setStatus("sending");
    setErrorMessage("");
    try {
      const res = await submitAffiliateApplication({
        name: `${firstName} ${lastName}`,
        email,
        socials: socials.filter(s => s.trim().length > 0),
        preferredCode: preferredCode,
        message,
        preferredLocale,
        honeypot,
        formLoadedAt: loadedAt
      });
      
      if (res.success) {
        setStatus("success");
        setLastName("");
        setFirstName("");
        setEmail("");
        setSocials(['']);
        setPreferredCode("");
        setMessage("");
      } else {
        setErrorMessage(res.error || "A apărut o eroare. Încearcă din nou.");
        setStatus("error");
      }
    } catch (err: any) {
      console.error("Affiliate submission error:", err);
      setErrorMessage(err.message || "A apărut o eroare. Încearcă din nou.");
      setStatus("error");
    }
  };

  return (
    <div className="bg-white text-zinc-900 min-h-screen overflow-x-hidden font-sans relative selection:bg-[#e32f8c] selection:text-white">
      {/* Subtle Blue Gradients */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] pointer-events-none -z-10" style={{ background: 'radial-gradient(circle, rgba(227, 47, 140,0.15) 0%, rgba(227, 47, 140,0) 70%)' }} />
      <div className="absolute bottom-40 left-0 w-[400px] h-[400px] pointer-events-none -z-10" style={{ background: 'radial-gradient(circle, rgba(227, 47, 140,0.08) 0%, rgba(227, 47, 140,0) 70%)' }} />

      {/* ═══ Breadcrumb & Header ═══ */}
      <section className="container mx-auto px-4 md:px-6 pt-8 md:pt-12 pb-12 relative z-10">
        <nav className="flex items-center gap-2 text-xs md:text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">
          <Link href="/" className="hover:text-black transition-colors">{tShop('breadcrumb_home')}</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-[#e32f8c]">{t('hero_tagline')}</span>
        </nav>
        
        <div className="max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-2xl md:text-6xl font-heading font-black uppercase tracking-tighter text-black leading-tight mb-4">
              {t('hero_title')}
            </h1>
            <p className="text-zinc-500 text-base md:text-xl font-medium max-w-2xl leading-relaxed">
              {t('hero_desc')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ═══ Main Content Grid ═══ */}
      <div className="container mx-auto px-4 mb-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 max-w-7xl mx-auto items-start">
          
          {/* ═══ Calculator Section ═══ */}
          <EarningsCalculator />

          {/* ═══ Form Section ═══ */}
          <section className="relative w-full order-1 lg:order-1">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="relative bg-white border border-zinc-200 rounded-[32px] p-6 md:p-12 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter mb-8 text-black">{t('form_title')}</h2>
            
            <AnimatePresence mode="wait">
              {status === 'success' ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-12 text-center"
                >
                  <div className="bg-[#e32f8c]/10 border border-[#e32f8c]/20 rounded-2xl p-4 flex items-start gap-3 mb-8">
                    <Info className="w-5 h-5 text-[#e32f8c] shrink-0 mt-0.5" />
                    <p className="text-sm font-medium text-slate-700">
                      {t('form_success_banner')}
                    </p>
                  </div>
                  <div className="w-24 h-24 bg-[#e32f8c]/10 border border-[#e32f8c]/30 rounded-full flex items-center justify-center mx-auto mb-8">
                    <CheckCircle2 className="w-12 h-12 text-[#e32f8c]" />
                  </div>
                  <p className="text-2xl font-black uppercase tracking-tight mb-2 text-black">{t('form_success')}</p>
                  <button 
                    onClick={() => setStatus('idle')}
                    className="text-zinc-500 text-xs font-black uppercase tracking-widest hover:text-[#e32f8c] transition-colors mt-6 cursor-pointer"
                  >
                    {t('form_submit_another')}
                  </button>
                </motion.div>
              ) : (
                <motion.form 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                  className="space-y-6"
                >
                  {/* 🛡️ Anti-Bot Honeypot (Invisible to real humans) */}
                  <div className="sr-only" style={{ display: 'none', position: 'absolute', left: '-9999px', opacity: 0, height: 0, width: 0, pointerEvents: 'none' }} aria-hidden="true">
                    <label htmlFor="affiliate_company">Company</label>
                    <input 
                      type="text" 
                      id="affiliate_company" 
                      name="affiliate_company" 
                      tabIndex={-1} 
                      autoComplete="off" 
                      value={honeypot} 
                      onChange={(e) => setHoneypot(e.target.value)} 
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-700 ml-1">{t('form_last_name')}</label>
                      <input 
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder={t('form_last_name_placeholder')}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-[#e32f8c] transition-all font-medium placeholder:text-zinc-500 text-black" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-700 ml-1">{t('form_first_name')}</label>
                      <input 
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder={t('form_first_name_placeholder')}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-[#e32f8c] transition-all font-medium placeholder:text-zinc-500 text-black" 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-700 ml-1">{t('form_email')}</label>
                    <input 
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('form_email_placeholder')}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-[#e32f8c] transition-all font-medium placeholder:text-zinc-500 text-black" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-700 ml-1">{t('form_social')}</label>
                    <div className="space-y-3">
                      {socials.map((social, index) => (
                        <div key={index} className="relative flex items-center gap-2">
                          <div className="relative flex-1">
                            <input 
                              required={index === 0}
                              value={social}
                              onChange={(e) => {
                                const newSocials = [...socials];
                                newSocials[index] = e.target.value;
                                setSocials(newSocials);
                              }}
                              placeholder={t('form_social_placeholder')}
                              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-[#e32f8c] transition-all font-medium placeholder:text-zinc-500 text-black pr-12"
                            />
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none">
                               <ArrowUpRight className="w-4 h-4 text-zinc-400" />
                            </div>
                          </div>
                          {socials.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setSocials(socials.filter((_, i) => i !== index))}
                              className="w-12 h-12 shrink-0 flex items-center justify-center rounded-2xl bg-zinc-50 border border-zinc-200 text-zinc-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all cursor-pointer"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      ))}
                      {socials.length < 5 && (
                        <button
                          type="button"
                          onClick={() => setSocials([...socials, ''])}
                          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-[#e32f8c] transition-colors ml-1 mt-2 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> {t('form_add_social')}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 🌐 Limbă Preferată / Preferred Language - Checkbox / Selector Modern */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-700">
                        {t('form_preferred_language')}
                      </label>
                      <span className="text-[10px] font-bold text-zinc-400">
                        {t('form_language_hint')}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label={t('form_preferred_language')}>
                      {/* Option: Română */}
                      <div
                        role="radio"
                        aria-checked={preferredLocale === 'ro'}
                        tabIndex={0}
                        onClick={() => setPreferredLocale('ro')}
                        onKeyDown={(e) => {
                          if (e.key === ' ' || e.key === 'Enter') {
                            e.preventDefault();
                            setPreferredLocale('ro');
                          }
                        }}
                        className={`relative flex items-center gap-3.5 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 select-none group active:scale-[0.99] ${
                          preferredLocale === 'ro'
                            ? 'border-[#e32f8c] bg-[#e32f8c]/5 shadow-[0_0_20px_rgba(227,47,140,0.12)]'
                            : 'border-zinc-200 bg-zinc-50/70 hover:border-zinc-300 hover:bg-zinc-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="preferredLocale"
                          value="ro"
                          checked={preferredLocale === 'ro'}
                          onChange={() => setPreferredLocale('ro')}
                          className="sr-only"
                          aria-hidden="true"
                          tabIndex={-1}
                        />
                        {/* Modern Custom Radio Dot */}
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${
                            preferredLocale === 'ro'
                              ? 'border-[#e32f8c] bg-white shadow-xs'
                              : 'border-zinc-300 group-hover:border-zinc-400 bg-white'
                          }`}
                        >
                          <div
                            className={`w-2.5 h-2.5 rounded-full bg-[#e32f8c] transition-transform duration-200 ${
                              preferredLocale === 'ro' ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                            }`}
                          />
                        </div>

                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className="text-xl select-none shrink-0" aria-hidden="true">🇷🇴</span>
                          <div className="flex flex-col min-w-0">
                            <span className={`text-sm tracking-tight leading-tight transition-colors ${
                              preferredLocale === 'ro' ? 'font-black text-black' : 'font-bold text-zinc-700 group-hover:text-black'
                            }`}>
                              {t('form_lang_ro')}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-medium leading-none mt-1 truncate">
                              {t('form_lang_ro_desc')}
                            </span>
                          </div>
                        </div>
                        
                        {preferredLocale === 'ro' && (
                          <div className="w-1.5 h-1.5 rounded-full bg-[#e32f8c] shrink-0" />
                        )}
                      </div>

                      {/* Option: English */}
                      <div
                        role="radio"
                        aria-checked={preferredLocale === 'en'}
                        tabIndex={0}
                        onClick={() => setPreferredLocale('en')}
                        onKeyDown={(e) => {
                          if (e.key === ' ' || e.key === 'Enter') {
                            e.preventDefault();
                            setPreferredLocale('en');
                          }
                        }}
                        className={`relative flex items-center gap-3.5 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 select-none group active:scale-[0.99] ${
                          preferredLocale === 'en'
                            ? 'border-[#e32f8c] bg-[#e32f8c]/5 shadow-[0_0_20px_rgba(227,47,140,0.12)]'
                            : 'border-zinc-200 bg-zinc-50/70 hover:border-zinc-300 hover:bg-zinc-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="preferredLocale"
                          value="en"
                          checked={preferredLocale === 'en'}
                          onChange={() => setPreferredLocale('en')}
                          className="sr-only"
                          aria-hidden="true"
                          tabIndex={-1}
                        />
                        {/* Modern Custom Radio Dot */}
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${
                            preferredLocale === 'en'
                              ? 'border-[#e32f8c] bg-white shadow-xs'
                              : 'border-zinc-300 group-hover:border-zinc-400 bg-white'
                          }`}
                        >
                          <div
                            className={`w-2.5 h-2.5 rounded-full bg-[#e32f8c] transition-transform duration-200 ${
                              preferredLocale === 'en' ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                            }`}
                          />
                        </div>

                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className="text-xl select-none shrink-0" aria-hidden="true">🇬🇧</span>
                          <div className="flex flex-col min-w-0">
                            <span className={`text-sm tracking-tight leading-tight transition-colors ${
                              preferredLocale === 'en' ? 'font-black text-black' : 'font-bold text-zinc-700 group-hover:text-black'
                            }`}>
                              {t('form_lang_en')}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-medium leading-none mt-1 truncate">
                              {t('form_lang_en_desc')}
                            </span>
                          </div>
                        </div>

                        {preferredLocale === 'en' && (
                          <div className="w-1.5 h-1.5 rounded-full bg-[#e32f8c] shrink-0" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-700 ml-1">{t('form_preferred_code')}</label>
                    <input 
                      type="text"
                      value={preferredCode}
                      onChange={(e) => setPreferredCode(e.target.value.toUpperCase())}
                      placeholder={t('form_preferred_code_placeholder')}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-[#e32f8c] transition-all font-medium placeholder:text-zinc-500 text-black uppercase" 
                    />
                    <p className="text-[10px] text-zinc-500 font-medium ml-1">{t('form_preferred_code_desc')}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-700 ml-1">{t('form_audience')}</label>
                    <textarea 
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={t('form_message')}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-[#e32f8c] transition-all font-medium placeholder:text-zinc-500 text-black resize-none" 
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={status === 'sending'}
                    className="w-full bg-[#e32f8c] hover:bg-[#c41a72] text-black py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(227, 47, 140,0.3)] mt-6 cursor-pointer"
                  >
                    {status === 'sending' ? (
                      <>
                        <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                        <span>{t('form_button_sending')}</span>
                      </>
                    ) : (
                      <>
                        {t('form_button')} <Send className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {status === 'error' && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-center gap-2 text-red-600 text-xs font-bold mt-4 shadow-2xs">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMessage || t('form_error_generic')}</span>
                    </div>
                  )}
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
          </section>
        </div>
      </div>
    </div>
  );
}

function EarningsCalculator() {
  const locale = useLocale();
  const isRo = locale === "ro";

  const [salesPerMonth, setSalesPerMonth] = useState<number>(35);
  const [commissionRate, setCommissionRate] = useState<number>(0.10);
  const averageOrderValue = 320; // TrenZone average order value in RON

  const estimatedEarnings = useMemo(() => {
    return Math.round(salesPerMonth * averageOrderValue * commissionRate);
  }, [salesPerMonth, commissionRate]);

  const earningsPerOrder = useMemo(() => {
    return Math.round(averageOrderValue * commissionRate);
  }, [commissionRate]);

  const audienceLabel = useMemo(() => {
    if (salesPerMonth <= 20) {
      return isRo ? "Clienți de sală & colegi de antrenament" : "Gym buddies & personal clients";
    } else if (salesPerMonth <= 50) {
      return isRo ? "Antrenor activ / micro-comunitate" : "Active coach / fitness community";
    } else if (salesPerMonth <= 100) {
      return isRo ? "Creator de conținut fitness activ" : "Fitness content creator";
    } else {
      return isRo ? "Atlet de elită & reach extins" : "Elite athlete & broad reach";
    }
  }, [salesPerMonth, isRo]);

  const presetSales = [15, 35, 75, 120];

  const tiers = [
    {
      rate: 0.10,
      label: "10%",
      tierName: "START"
    },
    {
      rate: 0.15,
      label: "15%",
      tierName: "PRO"
    },
    {
      rate: 0.20,
      label: "20%",
      tierName: "ELITE"
    }
  ];

  return (
    <section className="relative w-full order-2 lg:order-2">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="relative bg-zinc-950 border border-white/10 rounded-2xl sm:rounded-[32px] p-4 sm:p-7 md:p-9 overflow-hidden shadow-2xl flex flex-col justify-center backdrop-blur-md"
      >
        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#e32f8c]/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-purple-900/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/10">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#e32f8c] block mb-1">
                {isRo ? "SIMULATOR PARTENERI" : "PARTNER SIMULATOR"}
              </span>
              <h3 className="text-lg sm:text-2xl font-black uppercase text-white tracking-tight font-heading">
                {isRo ? "POTENȚIAL DE CÂȘTIG TRENZONE®" : "TRENZONE® REVENUE SIMULATOR"}
              </h3>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-zinc-400">
              <TrendingUp className="w-3.5 h-3.5 text-[#e32f8c]" />
              <span>{isRo ? "Valoare medie: 320 LEI / comandă" : "Avg order: 320 LEI"}</span>
            </div>
          </div>

          {/* Tier Selector with Clean Centered Cards (Zero Truncation on Phone) */}
          <div className="mb-5">
            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">
              {isRo ? "Nivel Comision Partener" : "Partner Commission Tier"}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {tiers.map((t) => {
                const isSelected = commissionRate === t.rate;
                return (
                  <button
                    key={t.rate}
                    type="button"
                    onClick={() => setCommissionRate(t.rate)}
                    className={`py-2.5 px-2 rounded-xl border text-center transition-all duration-200 cursor-pointer ${
                      isSelected 
                        ? "bg-[#e32f8c]/20 border-[#e32f8c] shadow-[0_0_15px_rgba(227,47,140,0.3)]" 
                        : "bg-zinc-900/80 border-white/5 hover:border-white/15"
                    }`}
                  >
                    <div className={`text-base sm:text-lg font-black leading-none mb-1 ${isSelected ? "text-[#e32f8c]" : "text-white"}`}>
                      {t.label}
                    </div>
                    <div className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${
                      isSelected ? "text-white" : "text-zinc-500"
                    }`}>
                      {t.tierName}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sales Volume Control */}
          <div className="mb-5 p-3.5 sm:p-5 rounded-2xl bg-zinc-900/60 border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                {isRo ? "Comenzi Generate Lunar" : "Estimated Monthly Orders"}
              </label>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-white">{salesPerMonth}</span>
                <span className="text-xs text-zinc-500 font-bold">{isRo ? "colete" : "orders"}</span>
              </div>
            </div>

            {/* Audience Context Tag */}
            <div className="text-[11px] text-[#e32f8c] font-medium mb-3">
              • {audienceLabel}
            </div>

            {/* Preset Volume Quick Buttons */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {presetSales.map((qty) => (
                <button
                  key={qty}
                  type="button"
                  onClick={() => setSalesPerMonth(qty)}
                  className={`py-1.5 px-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    salesPerMonth === qty
                      ? "bg-white text-black shadow-sm"
                      : "bg-white/5 hover:bg-white/10 text-zinc-400"
                  }`}
                >
                  {qty}
                </button>
              ))}
            </div>

            {/* Slider */}
            <div className="relative flex items-center w-full h-5">
              <div className="absolute left-0 right-0 h-2 rounded-full bg-zinc-800 overflow-hidden pointer-events-none">
                <div 
                  className="absolute top-0 left-0 h-full bg-[#e32f8c]"
                  style={{ width: `${Math.min(100, (salesPerMonth / 150) * 100)}%` }}
                />
              </div>
              <input 
                type="range" 
                min="5" 
                max="150" 
                step="5"
                value={salesPerMonth} 
                onChange={(e) => setSalesPerMonth(parseInt(e.target.value))}
                className="w-full h-full appearance-none cursor-pointer outline-none bg-transparent relative z-10 
                           [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#e32f8c] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(227,47,140,0.5)] 
                           [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[#e32f8c] [&::-moz-range-thumb]:rounded-full"
              />
            </div>
            <div className="flex justify-between mt-2 text-[9px] font-bold text-zinc-600">
              <span>5 comenzi</span>
              <span>75</span>
              <span>150+ comenzi</span>
            </div>
          </div>

          {/* Results Display */}
          <div className="rounded-2xl bg-gradient-to-br from-[#e32f8c]/15 via-zinc-900/90 to-black border border-[#e32f8c]/30 p-4 sm:p-6 text-center relative overflow-hidden shadow-inner">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 block">
              {isRo ? "Câștig Lunar Estimat" : "Estimated Monthly Payout"}
            </span>
            <div className="flex items-baseline justify-center gap-2 mb-2.5">
              <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                {estimatedEarnings.toLocaleString('ro-RO')}
              </span>
              <span className="text-lg font-black text-[#e32f8c]">
                RON
              </span>
            </div>

            {/* Micro breakdown pill (Plată automată lunară removed) */}
            <div className="flex justify-center">
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold text-zinc-300">
                {isRo ? `~${earningsPerOrder} RON profit / comandă` : `~${earningsPerOrder} RON / order`}
              </span>
            </div>
          </div>

        </div>
      </motion.div>

      {/* Footnote */}
      <p className="text-xs text-zinc-500 font-medium leading-relaxed text-center mt-4 max-w-xl mx-auto">
        {isRo 
          ? "Toți partenerii pornesc la comisionul de bază de 10%, cu posibilitatea de a avansa rapid la 15% și 20% în funcție de numărul de comenzi generate."
          : "All partners start at 10% base commission, scaling up to 15% and 20% based on monthly order performance."}
      </p>
    </section>
  );
}
