'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useLocale } from 'next-intl';
import { ArrowRight, Lock, Mail, CheckCircle2, Loader2 } from 'lucide-react';
import { affiliateLoginAction } from '@/app/actions/affiliate-auth';
import { Link } from '@/i18n/routing';

export default function AffiliateLogin() {
  const currentLocale = useLocale();
  const isRo = currentLocale === 'ro';

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const submittingRef = useRef(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || status === 'loading' || status === 'success') return;
    if (!email.trim() || !code.trim()) return;

    submittingRef.current = true;
    setStatus('loading');
    setErrorMessage('');

    try {
      const res = await affiliateLoginAction(email, code, currentLocale);

      if (res.success) {
        setStatus('success');
        const targetLocale = currentLocale || res.locale || 'ro';
        window.location.href = `/${targetLocale}/affiliate/dashboard`;
      } else {
        setStatus('error');
        setErrorMessage(res.error || (isRo ? 'A apărut o eroare.' : 'An error occurred.'));
        submittingRef.current = false;
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err?.message || (isRo ? 'Eroare de conexiune.' : 'Connection error.'));
      submittingRef.current = false;
    }
  };

  return (
    <div className="trenzone-master-canvas min-h-[calc(100svh-92px)] flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden selection:bg-[#e32f8c] selection:text-white">
      <div className="trenzone-ambient-canvas" />
      <div className="trenzone-ambient-texture" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative z-10 rounded-3xl bg-zinc-900/75 backdrop-blur-xl border border-white/10 p-6 sm:p-9 shadow-2xl overflow-hidden"
      >
        <div className="absolute -top-28 -right-28 w-64 h-64 bg-[#e32f8c]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="text-center mb-7">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#e32f8c]/15 border border-[#e32f8c]/35 text-[#e32f8c] text-[10px] font-black uppercase tracking-[0.2em] mb-3.5">
              {isRo ? 'Portal Parteneri' : 'Partner Portal'}
            </span>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white mb-2 font-[family-name:var(--font-oswald)]">
              {isRo ? 'Login Afiliat' : 'Affiliate Login'}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 font-medium leading-relaxed">
              {isRo
                ? 'Conectează-te pentru a-ți urmări vânzările și comisioanele.'
                : 'Sign in to access your sales tracking and payouts.'}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">
                {isRo ? 'Adresă de Email' : 'Email Address'}
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isRo ? 'nume@exemplu.ro' : 'name@example.com'}
                  className="w-full bg-black/50 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-sm font-semibold text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#e32f8c] focus:ring-1 focus:ring-[#e32f8c]/50 transition-all"
                />
                <Mail className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  {isRo ? 'Cod Afiliat' : 'Affiliate Code'}
                </label>
                <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                  {isRo ? 'Codul tău de reducere' : 'Your promo code'}
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder={isRo ? 'EX: ALE' : 'E.G. ALE'}
                  className="w-full bg-black/50 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-sm font-black font-mono text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#e32f8c] focus:ring-1 focus:ring-[#e32f8c]/50 transition-all uppercase"
                />
                <Lock className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {status === 'error' && (
              <div className="bg-red-500/10 text-red-300 text-xs font-bold p-3.5 rounded-xl border border-red-500/30 text-center leading-relaxed">
                {errorMessage}
              </div>
            )}

            {status === 'success' && (
              <div className="bg-emerald-500/15 text-emerald-300 text-xs font-bold p-3.5 rounded-xl border border-emerald-500/30 text-center flex items-center justify-center gap-2">
                <CheckCircle2 size={16} />
                <span>{isRo ? 'Autentificare reușită! Te redirecționăm...' : 'Success! Redirecting...'}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'loading' || status === 'success'}
              className="w-full bg-[#e32f8c] hover:bg-[#ff3b9e] text-white py-4 rounded-xl font-black uppercase tracking-wider text-xs sm:text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 shadow-[0_0_25px_rgba(227,47,140,0.35)] hover:shadow-[0_0_32px_rgba(227,47,140,0.55)] cursor-pointer"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 size={16} className="animate-spin shrink-0" />
                  <span>{isRo ? 'Se conectează...' : 'Signing in...'}</span>
                </>
              ) : (
                <>
                  <span>{isRo ? 'Accesează Dashboard' : 'Enter Dashboard'}</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/10 text-center">
            <p className="text-xs text-zinc-400 font-medium">
              {isRo ? 'Nu ai încă un cont de partener?' : 'Not a partner yet?'}{' '}
              <Link
                href="/affiliate"
                className="font-bold text-[#e32f8c] hover:text-white transition-colors inline-flex items-center gap-1 ml-1"
              >
                <span>{isRo ? 'Aplică acum' : 'Apply now'}</span>
                <ArrowRight size={12} />
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
