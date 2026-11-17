'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useLocale } from 'next-intl';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Tag,
  TrendingUp,
} from 'lucide-react';
import { affiliateLoginAction } from '@/app/actions/affiliate-auth';
import { Link } from '@/i18n/routing';
import { getCdnUrl } from '@/lib/utils/cdn';

const EMAIL_PATTERN = /^[a-z0-9._+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
const CODE_PATTERN = /^[A-Z0-9_-]{2,30}$/;

export default function AffiliateLogin() {
  const currentLocale = useLocale();
  const isRo = currentLocale === 'ro';

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const submittingRef = useRef(false);

  const clearError = () => {
    if (status === 'error') {
      setStatus('idle');
      setErrorMessage('');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || status === 'loading' || status === 'success') return;

    const cleanedEmail = email.trim().toLowerCase();
    const cleanedCode = code.trim().toUpperCase();

    if (!cleanedEmail) {
      setStatus('error');
      setErrorMessage(
        isRo ? 'Te rugăm să introduci adresa de email.' : 'Please enter your email address.'
      );
      return;
    }

    if (!EMAIL_PATTERN.test(cleanedEmail)) {
      setStatus('error');
      setErrorMessage(
        isRo ? 'Te rugăm să introduci o adresă de email validă.' : 'Please enter a valid email address.'
      );
      return;
    }

    if (!cleanedCode) {
      setStatus('error');
      setErrorMessage(
        isRo ? 'Te rugăm să introduci codul tău de afiliat.' : 'Please enter your affiliate code.'
      );
      return;
    }

    if (!CODE_PATTERN.test(cleanedCode)) {
      setStatus('error');
      setErrorMessage(
        isRo
          ? 'Codul de afiliat trebuie să conțină 2–30 caractere (litere, cifre, "-" sau "_").'
          : 'Affiliate code must be 2–30 characters (letters, numbers, "-" or "_").'
      );
      return;
    }

    submittingRef.current = true;
    setStatus('loading');
    setErrorMessage('');

    try {
      const res = await affiliateLoginAction(cleanedEmail, cleanedCode, currentLocale);

      if (res.success) {
        setStatus('success');
        const targetLocale = currentLocale || res.locale || 'ro';
        window.location.href = `/${targetLocale}/affiliate/dashboard`;
      } else {
        setStatus('error');
        setErrorMessage(res.error || (isRo ? 'A apărut o eroare.' : 'An error occurred.'));
        submittingRef.current = false;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      setStatus('error');
      setErrorMessage(message || (isRo ? 'Eroare de conexiune.' : 'Connection error.'));
      submittingRef.current = false;
    }
  };

  const highlights = isRo
    ? [
        {
          icon: TrendingUp,
          title: 'Tracking în timp real',
          desc: 'Vezi comenzile și comisioanele generate imediat ce sunt confirmate.',
        },
        {
          icon: Tag,
          title: 'Cod promoțional dedicat',
          desc: 'Comunitatea ta primește reducere instant la checkout cu codul tău.',
        },
        {
          icon: ShieldCheck,
          title: 'Creștere progresivă (10%–20%)',
          desc: 'Avansezi automat în nivel pe măsură ce volumul lunar crește.',
        },
      ]
    : [
        {
          icon: TrendingUp,
          title: 'Real-time tracking',
          desc: 'Monitor attributed orders and earned commissions as soon as they land.',
        },
        {
          icon: Tag,
          title: 'Dedicated promo code',
          desc: 'Your audience gets an instant checkout discount with your personal code.',
        },
        {
          icon: ShieldCheck,
          title: 'Tiered growth (10%–20%)',
          desc: 'Scale your commission rate as your monthly referral volume grows.',
        },
      ];

  return (
    <div className="relative w-full min-h-[calc(100dvh-92px)] bg-[#030305] text-white overflow-x-hidden flex flex-col px-4 sm:px-6 pt-4 pb-14 sm:py-10 lg:py-12 selection:bg-[#e32f8c] selection:text-white">
      <div className="trenzone-ambient-canvas" aria-hidden="true" />
      <div className="trenzone-ambient-texture" aria-hidden="true" />

      <div className="my-auto mx-auto w-full max-w-5xl relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Desktop Brand & Partner Value Panel */}
          <motion.aside
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="hidden lg:flex lg:col-span-6 flex-col justify-between rounded-3xl bg-zinc-950/80 backdrop-blur-xl border border-white/10 p-9 xl:p-10 relative overflow-hidden min-h-[540px] shadow-2xl"
          >
            <div
              className="absolute -top-28 -left-28 w-72 h-72 bg-[#e32f8c]/15 rounded-full blur-3xl pointer-events-none"
              aria-hidden="true"
            />
            <div
              className="absolute -bottom-24 -right-24 w-64 h-64 bg-[#e32f8c]/10 rounded-full blur-3xl pointer-events-none"
              aria-hidden="true"
            />

            <div className="relative z-10">
              <div className="flex items-center justify-between gap-4 mb-10">
                <Link href="/" className="inline-flex items-center gap-3 group">
                  <Image
                    src={getCdnUrl('/images/logos/trenzone_logo.webp')}
                    alt="TrenZone"
                    width={36}
                    height={36}
                    priority
                    className="w-9 h-9 object-contain drop-shadow-[0_0_12px_rgba(227,47,140,0.55)] group-hover:scale-105 transition-transform"
                  />
                  <span className="text-xl font-black italic tracking-tighter text-white">
                    TREN<span className="text-[#e32f8c]">ZONE</span>
                  </span>
                </Link>
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#e32f8c]/15 border border-[#e32f8c]/35 text-[#e32f8c] text-[10px] font-black uppercase tracking-[0.2em]">
                  {isRo ? 'Parteneri' : 'Partners'}
                </span>
              </div>

              <h2 className="text-4xl xl:text-[42px] font-black uppercase tracking-tight leading-[1.05] text-white mb-4 font-[family-name:var(--font-oswald)]">
                {isRo ? (
                  <>
                    Performanță măsurată.{' '}
                    <span className="text-[#e32f8c]">Câștiguri transparente.</span>
                  </>
                ) : (
                  <>
                    Measured performance.{' '}
                    <span className="text-[#e32f8c]">Transparent payouts.</span>
                  </>
                )}
              </h2>
              <p className="text-sm text-zinc-400 font-medium leading-relaxed mb-8 max-w-md">
                {isRo
                  ? 'Intră în contul tău de afiliat TrenZone pentru a urmări vânzările, conversiile și evoluția comisioanelor.'
                  : 'Access your TrenZone partner portal to track referred sales, conversions, and commission growth.'}
              </p>

              <div className="space-y-4">
                {highlights.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-[#e32f8c]">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white leading-snug">{item.title}</p>
                        <p className="text-xs text-zinc-400 leading-relaxed mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="relative z-10 pt-6 mt-8 border-t border-white/10 flex items-center justify-between gap-4">
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors py-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{isRo ? 'Înapoi la magazin' : 'Back to shop'}</span>
              </Link>
              <span className="text-[11px] font-semibold text-zinc-500">
                {isRo ? 'Acces securizat parteneri' : 'Secure partner access'}
              </span>
            </div>
          </motion.aside>

          {/* Focused Login Card (Mobile Primary + Desktop Right) */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 w-full max-w-md mx-auto lg:max-w-none rounded-3xl bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-5 sm:p-8 xl:p-10 shadow-2xl relative overflow-hidden"
          >
            <div
              className="absolute -top-24 -right-24 w-56 h-56 bg-[#e32f8c]/15 rounded-full blur-3xl pointer-events-none"
              aria-hidden="true"
            />

            <div className="relative z-10">
              {/* Compact Mobile Brand Strip */}
              <div className="flex lg:hidden items-center justify-between gap-3 pb-4 mb-5 border-b border-white/10">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Image
                    src={getCdnUrl('/images/logos/trenzone_logo.webp')}
                    alt="TrenZone"
                    width={28}
                    height={28}
                    priority
                    className="w-7 h-7 object-contain drop-shadow-[0_0_10px_rgba(227,47,140,0.5)] shrink-0"
                  />
                  <span className="text-base font-black italic tracking-tighter text-white truncate">
                    TREN<span className="text-[#e32f8c]">ZONE</span>
                  </span>
                </div>
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-1.5 min-h-11 px-2.5 -mr-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors shrink-0"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{isRo ? 'Magazin' : 'Shop'}</span>
                </Link>
              </div>

              {/* Card Header */}
              <div className="text-center lg:text-left mb-6">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#e32f8c]/15 border border-[#e32f8c]/35 text-[#e32f8c] text-[10px] font-black uppercase tracking-[0.2em] mb-3">
                  {isRo ? 'Portal Parteneri' : 'Partner Portal'}
                </span>
                <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mb-1.5 font-[family-name:var(--font-oswald)]">
                  {isRo ? 'Autentificare Afiliat' : 'Affiliate Sign In'}
                </h1>
                <p className="text-sm text-zinc-400 font-medium leading-relaxed">
                  {isRo
                    ? 'Conectează-te pentru a-ți urmări vânzările și comisioanele.'
                    : 'Sign in to access your sales tracking and payouts.'}
                </p>
              </div>

              <form onSubmit={handleLogin} noValidate className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="affiliate-email"
                    className="block text-[11px] font-black uppercase tracking-widest text-zinc-300 ml-0.5"
                  >
                    {isRo ? 'Adresă de Email' : 'Email Address'}
                  </label>
                  <div className="relative">
                    <input
                      id="affiliate-email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      inputMode="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        clearError();
                      }}
                      placeholder={isRo ? 'nume@exemplu.ro' : 'name@example.com'}
                      className="w-full h-12 bg-black/60 border border-white/15 rounded-xl pl-11 pr-4 text-base font-medium text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#e32f8c] focus:ring-2 focus:ring-[#e32f8c]/25 transition-all"
                    />
                    <Mail
                      className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden="true"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 px-0.5">
                    <label
                      htmlFor="affiliate-code"
                      className="text-[11px] font-black uppercase tracking-widest text-zinc-300"
                    >
                      {isRo ? 'Cod Afiliat' : 'Affiliate Code'}
                    </label>
                    <span className="text-[11px] text-zinc-500 font-semibold">
                      {isRo ? 'Codul tău de reducere' : 'Your promo code'}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      id="affiliate-code"
                      name="password"
                      type={showCode ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value.toUpperCase());
                        clearError();
                      }}
                      placeholder={isRo ? 'Ex: ALE10' : 'e.g. ALE10'}
                      className={`w-full h-12 bg-black/60 border border-white/15 rounded-xl pl-11 pr-12 text-base font-mono font-bold tracking-wider text-white placeholder:text-zinc-500 placeholder:font-sans placeholder:font-medium placeholder:tracking-normal focus:outline-none focus:border-[#e32f8c] focus:ring-2 focus:ring-[#e32f8c]/25 transition-all ${
                        showCode ? 'uppercase' : ''
                      }`}
                    />
                    <Lock
                      className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden="true"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCode((prev) => !prev)}
                      aria-label={
                        showCode
                          ? isRo
                            ? 'Ascunde codul de afiliat'
                            : 'Hide affiliate code'
                          : isRo
                            ? 'Arată codul de afiliat'
                            : 'Show affiliate code'
                      }
                      aria-pressed={showCode}
                      className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {status === 'error' && errorMessage && (
                  <div
                    role="alert"
                    className="bg-red-500/10 text-red-200 text-xs sm:text-sm font-semibold px-3.5 py-3 rounded-xl border border-red-500/35 flex items-start gap-2.5 leading-relaxed"
                  >
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {status === 'success' && (
                  <div
                    role="status"
                    className="bg-emerald-500/15 text-emerald-200 text-xs sm:text-sm font-semibold px-3.5 py-3 rounded-xl border border-emerald-500/35 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>
                      {isRo ? 'Autentificare reușită! Te redirecționăm...' : 'Success! Redirecting...'}
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading' || status === 'success'}
                  className="w-full h-12 sm:h-[52px] bg-[#e32f8c] hover:bg-[#ff3b9e] text-white rounded-xl font-black uppercase tracking-wider text-xs sm:text-sm transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 shadow-[0_0_24px_rgba(227,47,140,0.35)] hover:shadow-[0_0_32px_rgba(227,47,140,0.55)] cursor-pointer"
                >
                  {status === 'loading' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
                      <span>{isRo ? 'Se verifică...' : 'Signing in...'}</span>
                    </>
                  ) : (
                    <>
                      <span>{isRo ? 'Accesează Dashboard' : 'Enter Dashboard'}</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-white/10 flex flex-col items-center gap-2 text-center">
                <p className="text-xs sm:text-sm text-zinc-400 font-medium">
                  {isRo ? 'Încă nu ești afiliat?' : 'Not an affiliate yet?'}{' '}
                  <Link
                    href="/affiliate"
                    className="font-bold text-[#e32f8c] hover:text-white transition-colors inline-flex items-center gap-1 py-1.5 px-1"
                  >
                    <span>{isRo ? 'Aplică aici' : 'Apply here'}</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                </p>

                <Link
                  href="/shop"
                  className="lg:hidden inline-flex items-center justify-center gap-1.5 min-h-11 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{isRo ? 'Înapoi la magazin' : 'Back to shop'}</span>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
