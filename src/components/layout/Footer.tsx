"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { 
  ArrowRight, Mail, MapPin, ShieldCheck, Truck, Zap, 
  MoveRight, Plus, Minus, BicepsFlexed, Camera, ExternalLink,
  ChevronDown
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { subscribeToNewsletter } from "@/app/actions/newsletter";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { getCdnUrl } from '@/lib/utils/cdn';

export function Footer() {
  const t = useTranslations("Footer");
  const tProd = useTranslations("Product");
  const tNav = useTranslations("Navigation");
  const locale = useLocale() as "ro" | "en";

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || status === "submitting") return;
    
    setStatus("submitting");
    try {
      const result = await subscribeToNewsletter(undefined, email, locale, "footer");
      if (result.success) {
        setStatus("success");
        setEmail("");
      } else {
        setStatus("error");
      }
    } catch (err) {
      console.error("Footer newsletter error:", err);
      setStatus("error");
    }
  };

  return (
    <div className="dark text-foreground">
      <div className="trenzone-luminous-divider" />
      <footer id="main-footer" className="relative bg-[#030305] pt-12 md:pt-20 lg:pt-24 pb-8 overflow-hidden text-white">
        {/* Engineering Essentials Background */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        
        {/* Atmospheric Glow */}
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />

        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 mb-16 lg:mb-24">
            
            {/* ═══ Column 1: Brand & Newsletter ═══ */}
            <div className="lg:col-span-5">
              <div className="max-w-md">
                <Link href="/" className="inline-flex items-center gap-3 mb-8 w-full justify-center lg:justify-start group">
                   <Image
                     src={getCdnUrl("/images/logos/trenzone_logo.webp")}
                     alt="TrenZone Emblem"
                     width={44}
                     height={44}
                     className="w-10 h-10 object-contain drop-shadow-[0_0_15px_rgba(227,47,140,0.5)] group-hover:scale-110 transition-transform duration-300"
                   />
                   <span className="text-3xl md:text-4xl font-black italic tracking-tighter text-white">
                     TREN<span className="text-[#e32f8c]">ZONE</span>
                   </span>
                </Link>
                <p className="text-zinc-300 text-base leading-relaxed font-medium mb-10 max-w-sm">
                  {locale === 'ro' 
                    ? "Built for Strength. Designed for Performance. Echipamente heavy-duty pentru împins la piept și powerlifting." 
                    : "Built for Strength. Designed for Performance. Heavy-duty elbow wraps for serious powerlifters and lifters."}
                </p>

                {/* Modern Newsletter Input */}
                <div className="relative group">
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] text-zinc-300 mb-2 font-[family-name:var(--font-oswald)]">
                    {t('newsletter_title')}
                  </h3>
                  
                  <AnimatePresence mode="wait">
                    {status === "success" ? (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-primary/10 border border-primary/20 rounded-2xl p-6 flex flex-col items-center text-center gap-4"
                      >
                        <div>
                          <p className="text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-1 font-[family-name:var(--font-oswald)]">
                            {locale === 'ro' ? "CODUL TĂU:" : "YOUR CODE:"}
                          </p>
                          <div 
                            onClick={() => {
                              navigator.clipboard.writeText("TREN5");
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2500);
                            }}
                            className="bg-zinc-900 border border-white/10 px-6 py-3 rounded-xl cursor-pointer hover:border-primary/50 transition-all group/code shadow-2xl relative overflow-hidden"
                          >
                             <span className="text-xl font-black tracking-[0.2em] text-white font-[family-name:var(--font-oswald)]">
                               {copied ? (locale === 'ro' ? "COPIAT! ✓" : "COPIED! ✓") : "TREN5"}
                             </span>
                             <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover/code:opacity-100 transition-opacity" />
                          </div>
                        </div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-relaxed">
                          {locale === 'ro' ? "Folosește-l la finalizarea comenzii pentru 5% reducere." : "Use it at checkout for 5% off."}
                        </p>
                      </motion.div>
                    ) : (
                      <form onSubmit={handleSubmit}>
                        <p className="text-zinc-400 text-xs sm:text-sm font-normal leading-relaxed mb-4">
                          {t('newsletter_desc')}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-2">
                          <div className="relative flex-1 w-full">
                            <input
                              type="email"
                              required
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder={t('newsletter_placeholder')}
                              disabled={status === "submitting"}
                              className="w-full bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3.5 sm:py-4 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-primary/50 focus:bg-white/[0.08] transition-all disabled:opacity-50"
                            />
                          </div>
                          <button 
                            type="submit"
                            disabled={status === "submitting"}
                            className="w-full sm:w-auto bg-white text-black hover:bg-[#e32f8c] hover:text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-wider text-xs transition-all active:scale-95 disabled:opacity-50 shadow-2xl cursor-pointer font-[family-name:var(--font-oswald)] shrink-0"
                            aria-label={locale === 'ro' ? "Abonează-te la newsletter" : "Subscribe to newsletter"}
                          >
                            {status === "submitting" ? "..." : t('newsletter_button')}
                          </button>
                        </div>
                      </form>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* ═══ Column 2: Navigation (Mobile Accordions) ═══ */}
            <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 lg:gap-20">
              
              {/* Pagini Principale Section */}
              <div className="border-b lg:border-none border-white/5 last:border-none">
                <button 
                  onClick={() => toggleSection('main')}
                  className="w-full lg:hidden flex items-center justify-between py-5"
                >
                  <h4 className="font-black text-white text-[11px] tracking-[0.3em] uppercase">{t('main_pages')}</h4>
                  <div className="text-zinc-400">
                    {activeSection === 'main' ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </div>
                </button>
                
                {/* Desktop Heading (Always visible) */}
                <h4 className="hidden lg:block font-black text-white text-[10px] tracking-[0.3em] uppercase mb-8">
                  {t('main_pages')}
                </h4>

                {/* Mobile Accordion */}
                <div className="lg:hidden">
                  <div 
                    className="grid transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                    style={{
                      gridTemplateRows: activeSection === 'main' ? '1fr' : '0fr',
                      opacity: activeSection === 'main' ? 1 : 0
                    }}
                  >
                    <div className="overflow-hidden">
                      <ul className="pb-6 space-y-4 text-sm font-medium text-zinc-400">
                        <li><Link href="/" className="hover:text-primary transition-colors">{t('home')}</Link></li>
                        <li><Link href="/shop" className="hover:text-primary transition-colors">{t('shop')}</Link></li>
                        <li><Link href="/affiliate" className="hover:text-primary transition-colors">{tNav('affiliate')}</Link></li>
                        <li><Link href="/about" className="hover:text-primary transition-colors">{tNav('about')}</Link></li>
                        <li><Link href="/contact" className="hover:text-primary transition-colors">{t('contact')}</Link></li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Desktop List (Always visible) */}
                <ul className="hidden lg:block space-y-4 text-sm font-medium text-zinc-400">
                  <li><Link href="/" className="hover:text-primary transition-colors">{t('home')}</Link></li>
                  <li><Link href="/shop" className="hover:text-primary transition-colors">{t('shop')}</Link></li>
                  <li><Link href="/affiliate" className="hover:text-primary transition-colors">{tNav('affiliate')}</Link></li>
                  <li><Link href="/about" className="hover:text-primary transition-colors">{tNav('about')}</Link></li>
                  <li><Link href="/contact" className="hover:text-primary transition-colors">{t('contact')}</Link></li>
                </ul>
              </div>

              {/* Pagini Legale Section */}
              <div className="border-b lg:border-none border-white/5 last:border-none">
                <button 
                  onClick={() => toggleSection('legal')}
                  className="w-full lg:hidden flex items-center justify-between py-5"
                >
                  <h4 className="font-black text-white text-[11px] tracking-[0.3em] uppercase">{t('legal_pages')}</h4>
                  <div className="text-zinc-400">
                    {activeSection === 'legal' ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </div>
                </button>
                
                {/* Desktop Heading */}
                <h4 className="hidden lg:block font-black text-white text-[10px] tracking-[0.3em] uppercase mb-8">
                  {t('legal_pages')}
                </h4>

                {/* Mobile Accordion */}
                <div className="lg:hidden">
                  <div 
                    className="grid transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                    style={{
                      gridTemplateRows: activeSection === 'legal' ? '1fr' : '0fr',
                      opacity: activeSection === 'legal' ? 1 : 0
                    }}
                  >
                    <div className="overflow-hidden">
                      <ul className="pb-6 space-y-4 text-sm font-medium text-zinc-400">
                        <li><Link href="/termeni-si-conditii" className="hover:text-primary transition-colors">{t('terms')}</Link></li>
                        <li><Link href="/politica-de-retur" className="hover:text-primary transition-colors">{t('return')}</Link></li>
                        <li><Link href="/retur" className="hover:text-primary transition-colors">{locale === 'ro' ? 'Formular Retragere (Retur)' : 'Withdrawal Form (Return)'}</Link></li>
                        <li><Link href="/politica-cookie" className="hover:text-primary transition-colors">{t('cookie')}</Link></li>
                        <li><Link href="/politica-de-confidentialitate" className="hover:text-primary transition-colors">{t('privacy')}</Link></li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Desktop List */}
                <ul className="hidden lg:block space-y-4 text-sm font-medium text-zinc-400">
                  <li><Link href="/termeni-si-conditii" className="hover:text-primary transition-colors">{t('terms')}</Link></li>
                  <li><Link href="/politica-de-retur" className="hover:text-primary transition-colors">{t('return')}</Link></li>
                  <li><Link href="/retur" className="hover:text-primary transition-colors">{locale === 'ro' ? 'Formular Retragere (Retur)' : 'Withdrawal Form (Return)'}</Link></li>
                  <li><Link href="/politica-cookie" className="hover:text-primary transition-colors">{t('cookie')}</Link></li>
                  <li><Link href="/politica-de-confidentialitate" className="hover:text-primary transition-colors">{t('privacy')}</Link></li>
                </ul>
              </div>

              {/* Contact Section: Always expanded on desktop, can be accordion on mobile */}
              <div>
                <h4 className="font-black text-white text-[11px] lg:text-[10px] tracking-[0.3em] uppercase py-5 lg:p-0 border-b lg:border-none border-white/5 mb-6 lg:mb-8">{t('contact')}</h4>
                <ul className="space-y-4 text-sm font-medium text-zinc-400">
                  <li className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">{locale === 'ro' ? 'Email Suport' : 'Support Email'}</span>
                    <a href="mailto:trenzone483@gmail.com" className="hover:text-primary transition-colors">trenzone483@gmail.com</a>
                  </li>
                  <li className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">{locale === 'ro' ? 'Sediu' : 'Principal Place of Business'}</span>
                    <span>75 E 3RD ST, SHERIDAN, WY, 82801</span>
                  </li>
                </ul>
              </div>

            </div>
          </div>

          {/* Trust Bar: Modernized */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-10 border-y border-white/5 mb-12">
             {[
               { icon: ShieldCheck, title: tProd('guarantee'), desc: tProd('zero_failures') },
               { icon: Truck, title: tProd('delivery'), desc: tProd('shipping_time') },
               { icon: Zap, title: tProd('return'), desc: tProd('return_policy') }
             ].map((trust, idx) => (
               <div key={idx} className="flex items-center gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-primary group-hover:text-black transition-all">
                     <trust.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-white">{trust.title}</p>
                    <p className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold mt-0.5">{trust.desc}</p>
                  </div>
               </div>
             ))}
          </div>

          {/* Bottom Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 pt-8 border-t border-white/5 text-[10px] text-zinc-400">
            <div className="flex flex-col md:flex-row items-center gap-8 lg:gap-12 text-center md:text-left">
               <div className="space-y-2">
                 <p>© {new Date().getFullYear()} TrenZone. {t('rights')}</p>
                 <p className="text-[9px] text-zinc-500 font-medium uppercase tracking-wider">
                    TrenZone LLC | Reg. Com. / Filing ID: GZ-US-WY-1790986605415 | 75 E 3RD ST, SHERIDAN, WY, 82801, USA
                 </p>
                 <p className="text-[9px] text-zinc-400 font-semibold tracking-wider">
                    {locale === 'ro' 
                      ? "Echipamente profesionale de forță și powerlifting testate conform standardelor de performanță." 
                      : "Professional strength and powerlifting equipment tested to the highest performance standards."}
                 </p>
               </div>
               
               {/* Compliance Logos (ANPC SAL & SOL) */}
               <div className="flex flex-wrap items-center justify-center gap-4">
                  <a 
                    href="https://reclamatiisal.anpc.ro" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:opacity-85 transition-opacity outline-none"
                    style={{ WebkitTapHighlightColor: 'transparent' } as any}
                    title={locale === 'ro' ? "Soluționarea Alternativă a Litigiilor - ANPC" : "Alternative Dispute Resolution - ANPC"}
                  >
                    <Image 
                      src="/images/compliance/anpc-sal.png" 
                      alt={locale === 'ro' ? "SAL - Soluționarea Alternativă a Litigiilor" : "ADR - Alternative Dispute Resolution"} 
                      width={180} 
                      height={48} 
                      className="h-10 md:h-12 w-auto object-contain rounded-lg shadow-sm"
                    />
                  </a>
                  <a 
                    href={locale === 'ro' ? "https://consumer-redress.ec.europa.eu/index_ro" : "https://consumer-redress.ec.europa.eu/index_en"} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:opacity-85 transition-opacity outline-none"
                    style={{ WebkitTapHighlightColor: 'transparent' } as any}
                    title={locale === 'ro' ? "Soluționarea Online a Litigiilor - Comisia Europeană" : "Online Dispute Resolution - European Commission"}
                  >
                    <Image 
                      src="/images/compliance/anpc-sol.png" 
                      alt={locale === 'ro' ? "SOL - Soluționarea Online a Litigiilor" : "ODR - Online Dispute Resolution"} 
                      width={180} 
                      height={48} 
                      className="h-10 md:h-12 w-auto object-contain rounded-lg shadow-sm"
                    />
                  </a>
               </div>
            </div>
            
            <div className="flex items-center gap-4 uppercase tracking-[0.2em] font-black">
               <a href="https://www.instagram.com/alessiannoje" target="_blank" rel="noopener noreferrer" className="text-[#e32f8c] hover:text-white hover:drop-shadow-[0_0_15px_rgba(227, 47, 140,1)] transition-all duration-300 italic drop-shadow-[0_0_8px_rgba(227, 47, 140,0.5)]">Built by Alessian</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
