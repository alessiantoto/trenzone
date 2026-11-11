'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Mail, MapPin, Send, CheckCircle2, MessageSquare, ChevronRight } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sendContactMessage } from '@/app/actions/contact';

export default function ContactPage() {
  const t = useTranslations('ContactPage');
  const tNav = useTranslations('Navigation');
  const locale = useLocale();
  const isRo = locale === 'ro';
  
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('general');
  const [customSubject, setCustomSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const subjectOptions = [
    { value: 'general', label: t('form_subject_general') },
    { value: 'support', label: t('form_subject_support') },
    { value: 'shipping', label: t('form_subject_shipping') },
    { value: 'b2b', label: t('form_subject_b2b'), isBold: true },
    { value: 'other', label: isRo ? 'Altele' : 'Other' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    
    setStatus('sending');
    try {
      const subjectMap: Record<string, string> = isRo ? {
        general: 'Cerere Generală',
        support: 'Suport Tehnic',
        shipping: 'Comenzi & Livrare',
        b2b: 'Parteneriate B2B / Săli de sport',
        other: 'Altele'
      } : {
        general: 'General Inquiry',
        support: 'Technical Support',
        shipping: 'Orders & Shipping',
        b2b: 'B2B Partnerships / Gyms',
        other: 'Other'
      };
      
      const friendlySubject = subject === 'other' && customSubject.trim() 
        ? `${isRo ? 'Altele' : 'Other'}: ${customSubject}`
        : (subjectMap[subject] || subject);
      
      const res = await sendContactMessage({
        name,
        email,
        subject: friendlySubject,
        message,
        locale: isRo ? 'ro' : 'en'
      });
      
      if (res.success) {
        setStatus('success');
        setName('');
        setEmail('');
        setCustomSubject('');
        setMessage('');
      } else {
        setStatus('error');
      }
    } catch (err) {
      console.error('Contact submission error:', err);
      setStatus('error');
    }
  };

  return (
    <div className="bg-white text-black min-h-screen pb-20 overflow-x-hidden font-sans">
      {/* ═══ Breadcrumb & Header ═══ */}
      <section className="container mx-auto px-4 md:px-6 pt-8 md:pt-12 pb-6">
        <nav className="flex items-center gap-2 text-xs md:text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">
          <Link href="/" className="hover:text-black transition-colors">{useTranslations('Shop')('breadcrumb_home')}</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-[#e32f8c]">{useTranslations('Shop')('breadcrumb_contact')}</span>
        </nav>
        
        <div className="max-w-4xl">
          <h1 className="text-2xl md:text-6xl font-heading font-black uppercase tracking-tighter text-black leading-tight mb-4">
            {t('hero_title')}
          </h1>
          <p className="text-zinc-500 text-base md:text-xl font-medium max-w-2xl uppercase tracking-widest leading-relaxed">
            {t('hero_subtitle')}
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 mb-12 max-w-4xl">
        <div className="space-y-16">
          
          {/* ═══ Top: Form ═══ */}
          <div className="relative bg-zinc-50 border border-zinc-100 rounded-[32px] p-8 md:p-12 overflow-hidden shadow-sm">
            <div className="relative z-10">
              <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-8 text-center text-black">{t('section_form_title')}</h2>
              
              <AnimatePresence mode="wait">
                {status === 'success' ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-12 text-center"
                  >
                    <div className="w-20 h-20 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 className="w-10 h-10 text-primary" />
                    </div>
                    <p className="text-xl font-bold uppercase tracking-tight mb-2 text-black">{t('form_success')}</p>
                    <button 
                      onClick={() => setStatus('idle')}
                      className="text-zinc-500 text-xs font-black uppercase tracking-widest hover:text-black transition-colors mt-4"
                    >
                      {t('form_reset')}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">{t('form_name')}</label>
                        <input 
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder={t('form_name_placeholder')}
                          className="w-full bg-white border border-zinc-200 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-black transition-all font-medium placeholder:text-zinc-300 text-black" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">{t('form_email')}</label>
                        <input 
                          required
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder={t('form_email_placeholder')}
                          className="w-full bg-white border border-zinc-200 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-black transition-all font-medium placeholder:text-zinc-300 text-black" 
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2 relative">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">{t('form_subject')}</label>
                      <div className="relative group">
                        <button
                          type="button"
                          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                          className="w-full bg-white border border-zinc-200 group-hover:border-zinc-300 rounded-2xl px-6 py-4 text-sm focus:outline-none transition-all font-medium text-black text-left flex justify-between items-center"
                        >
                          {subjectOptions.find(opt => opt.value === subject)?.label || t('form_subject_general')}
                          <ChevronRight className={`w-4 h-4 text-zinc-400 transition-transform ${isDropdownOpen ? '-rotate-90' : 'rotate-90'}`} />
                        </button>

                        <AnimatePresence>
                          {isDropdownOpen && (
                            <>
                              <div 
                                className="fixed inset-0 z-40" 
                                onClick={() => setIsDropdownOpen(false)}
                              />
                              <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                className="absolute top-full left-0 w-full mt-2 bg-white border border-zinc-100 rounded-2xl shadow-xl z-50 overflow-hidden"
                              >
                                {subjectOptions.map((opt) => (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => {
                                      setSubject(opt.value);
                                      setIsDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-6 py-4 text-sm hover:bg-zinc-50 transition-colors ${subject === opt.value ? 'bg-zinc-50 text-[#e32f8c] font-bold' : 'text-zinc-600'} ${opt.isBold ? 'font-bold text-black' : ''}`}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <AnimatePresence>
                      {subject === 'other' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, marginTop: 0 }}
                          animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
                          exit={{ opacity: 0, height: 0, marginTop: 0 }}
                          className="space-y-2 overflow-hidden"
                        >
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">{isRo ? 'Subiect personalizat' : 'Custom subject'}</label>
                          <input 
                            required
                            value={customSubject}
                            onChange={(e) => setCustomSubject(e.target.value)}
                            placeholder={isRo ? 'Scrie aici subiectul mesajului tău...' : 'Write your message subject here...'}
                            className="w-full bg-white border border-zinc-200 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-black transition-all font-medium placeholder:text-zinc-300 text-black" 
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">{t('form_message')}</label>
                      <textarea 
                        required
                        rows={6}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={t('form_message_placeholder')}
                        className="w-full bg-white border border-zinc-200 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-black transition-all font-medium placeholder:text-zinc-300 text-black resize-y min-h-[160px]"
                      />
                    </div>

                    <button 
                      type="submit"
                      disabled={status === 'sending'}
                      className="w-full bg-black hover:bg-zinc-800 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl mt-4"
                    >
                      {status === 'sending' ? (
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          {t('form_button')} <Send className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    {status === 'error' && (
                      <p className="text-red-500 text-[10px] text-center font-bold uppercase tracking-widest animate-pulse mt-4">
                        {isRo
                          ? 'A apărut o eroare. Încearcă din nou sau scrie-ne la trenzone483@gmail.com.'
                          : 'An error occurred. Please try again or email us at trenzone483@gmail.com.'}
                      </p>
                    )}
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ═══ Bottom: Info ═══ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto w-full">
              {/* Email Card */}
              <div className="group flex items-start gap-5 p-7 bg-zinc-50 border border-zinc-100 rounded-[28px] hover:border-zinc-200 transition-all duration-500 w-full">
                <div className="w-12 h-12 rounded-2xl bg-black/5 flex items-center justify-center border border-black/10 group-hover:bg-black transition-all text-zinc-400 group-hover:text-white shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">{t('info_email')}</p>
                  <a href="mailto:trenzone483@gmail.com" className="text-base sm:text-lg font-bold text-black hover:text-[#e32f8c] transition-colors break-all">trenzone483@gmail.com</a>
                </div>
              </div>

              {/* Company Info Card */}
              <div className="group flex items-start gap-5 p-7 bg-zinc-50 border border-zinc-100 rounded-[28px] hover:border-zinc-200 transition-all duration-500 w-full">
                <div className="w-12 h-12 rounded-2xl bg-black/5 flex items-center justify-center border border-black/10 group-hover:bg-black transition-all text-zinc-400 group-hover:text-white shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">TrenZone LLC (USA)</p>
                  <p className="text-xs sm:text-sm font-bold text-black leading-snug">75 E 3RD ST, SHERIDAN, WY, 82801</p>
                  <p className="text-[10px] font-medium text-zinc-400 mt-1">Reg. No.: GZ-US-WY-1790986605415</p>
                </div>
              </div>
          </div>

          {/* Motivation Quote */}
          <div className="p-8 border border-zinc-100 rounded-3xl flex items-center gap-6 group max-w-2xl mx-auto bg-white">
              <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center shrink-0 border border-zinc-100 group-hover:border-black/10 transition-all text-zinc-400 group-hover:text-black">
                  <MessageSquare className="w-5 h-5 transition-colors" />
              </div>
              <p className="text-xs text-zinc-500 italic font-medium leading-relaxed">
                  &quot;{t('opportunity_message')}&quot;
              </p>
          </div>
        </div>
      </section>

      {/* Footer block removed as requested */}
    </div>
  );
}
