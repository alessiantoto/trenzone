'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLocale } from 'next-intl';
import Image from 'next/image';
import { ArrowRight, Lock, Mail, Sparkles, CheckCircle2 } from 'lucide-react';
import { affiliateLoginAction } from '@/app/actions/affiliate-auth';
import { Link } from '@/i18n/routing';

export default function AffiliateLogin() {
  const currentLocale = useLocale();
  const isRo = currentLocale === 'ro';

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !code.trim()) return;
    
    setStatus('loading');
    setErrorMessage('');

    try {
      const res = await affiliateLoginAction(email, code);
      
      if (res.success) {
        setStatus('success');
        const targetLocale = currentLocale || res.locale || 'ro';
        // Full page reload ensures cookie is attached to server component request
        window.location.href = `/${targetLocale}/affiliate/dashboard`;
      } else {
        setStatus('error');
        setErrorMessage(res.error || (isRo ? 'A apărut o eroare.' : 'An error occurred.'));
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err?.message || (isRo ? 'Eroare de conexiune.' : 'Connection error.'));
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center p-4 pt-28 pb-16 relative overflow-hidden selection:bg-[#e32f8c] selection:text-white">
      {/* GREEK GOD PATTERN BACKGROUND (matching the storefront) */}
      <div
        className="absolute inset-0 pointer-events-none z-0 mix-blend-multiply opacity-50"
        style={{
          backgroundImage: "url('/images/ui/greek-pattern.jpg')",
          backgroundSize: '400px',
          backgroundRepeat: 'repeat',
        }}
      />

      {/* Subtle cyan ambient glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#e32f8c]/10 blur-[140px] rounded-full pointer-events-none z-0" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[300px] bg-blue-500/10 blur-[130px] rounded-full pointer-events-none z-0" />

      {/* LOGO WITH DARK CONTRAST CONTAINER (matching admin panel menu style) */}
      <Link 
        href="/" 
        className="mb-8 block relative z-10 group transition-transform hover:scale-105"
        aria-label="TrenZone Home"
      >
        <div className="bg-slate-950/95 border border-slate-800 px-6 sm:px-8 py-3 rounded-2xl shadow-2xl flex items-center justify-center backdrop-blur-md">
          <Image
            src="/images/logos/trenzone_logo.webp"
            alt="TrenZone"
            width={60}
            height={60}
            priority
            className="h-12 w-auto object-contain drop-shadow-[0_0_15px_rgba(227,47,140,0.5)] group-hover:scale-110 transition-transform"
          />
        </div>
      </Link>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/95 backdrop-blur-xl p-8 sm:p-10 rounded-[32px] shadow-2xl w-full max-w-md border border-slate-200/90 relative z-10"
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900 mb-2 font-heading">
            {isRo ? 'Login Afiliat' : 'Affiliate Login'}
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            {isRo 
              ? 'Conectează-te pentru a-ți urmări vânzările și comisioanele.' 
              : 'Sign in to access your sales tracking and payouts.'}
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
              {isRo ? 'Adresă de Email' : 'Email Address'}
            </label>
            <div className="relative">
              <input 
                type="email" 
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nume@exemplu.ro"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#e32f8c] focus:bg-white focus:ring-2 focus:ring-[#e32f8c]/20 transition-all"
              />
              <Mail className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between ml-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                {isRo ? 'Cod Afiliat' : 'Affiliate Code'}
              </label>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                {isRo ? 'Codul tău de reducere' : 'Your discount code'}
              </span>
            </div>
            <div className="relative">
              <input 
                type="text" 
                required
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="ex: ALE"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-black font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#e32f8c] focus:bg-white focus:ring-2 focus:ring-[#e32f8c]/20 transition-all uppercase"
              />
              <Lock className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {status === 'error' && (
            <div className="bg-red-50 text-red-600 text-xs font-bold p-4 rounded-xl border border-red-200 text-center animate-in slide-in-from-top-2 leading-relaxed">
              {errorMessage}
            </div>
          )}

          {status === 'success' && (
            <div className="bg-emerald-50 text-emerald-700 text-xs font-bold p-4 rounded-xl border border-emerald-200 text-center animate-in slide-in-from-top-2 flex items-center justify-center gap-2">
              <CheckCircle2 size={16} />
              <span>{isRo ? 'Autentificare reușită! Te redirecționăm...' : 'Success! Redirecting...'}</span>
            </div>
          )}

          <button 
            type="submit" 
            disabled={status === 'loading' || status === 'success'}
            className="w-full bg-[#e32f8c] hover:bg-[#c41a72] text-black py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2 mt-4 shadow-lg shadow-[#e32f8c]/25"
          >
            {status === 'loading' ? (
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                {isRo ? 'Accesează Dashboard' : 'Enter Dashboard'} <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500 font-medium">
            {isRo ? 'Nu ai încă un cont de partener?' : 'Not a partner yet?'}{' '}
            <Link 
              href="/affiliate" 
              className="font-bold text-[#00a8c4] hover:text-[#008ba3] underline ml-1"
            >
              {isRo ? 'Aplică acum' : 'Apply here'}
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
