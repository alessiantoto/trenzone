'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocale } from 'next-intl';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
  Tag,
  TrendingUp,
} from 'lucide-react';
import {
  affiliateLoginAction,
  verifyAffiliateOtpAction,
  resendAffiliateOtpAction,
} from '@/app/actions/affiliate-auth';
import { Link } from '@/i18n/routing';

const EMAIL_PATTERN = /^[a-z0-9._+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
const CODE_PATTERN = /^[A-Z0-9_-]{2,30}$/;

export default function AffiliateLogin() {
  const currentLocale = useLocale();
  const isRo = currentLocale === 'ro';

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [challengeToken, setChallengeToken] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const submittingRef = useRef(false);
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get('error');
    if (err === 'magic_expired') {
      setStatus('error');
      setErrorMessage(
        isRo
          ? 'Linkul de conectare a expirat sau a fost deja folosit. Introdu emailul și codul de afiliat pentru a primi un cod nou.'
          : 'This sign-in link has expired or was already used. Enter your email and affiliate code to receive a new code.'
      );
    } else if (err === 'magic_invalid') {
      setStatus('error');
      setErrorMessage(
        isRo
          ? 'Linkul de conectare este invalid. Te rugăm să soliciți un cod nou mai jos.'
          : 'This sign-in link is invalid. Please request a fresh verification code below.'
      );
    } else if (err === 'magic_inactive') {
      setStatus('error');
      setErrorMessage(
        isRo
          ? 'Contul tău de afiliat nu este activ.'
          : 'Your affiliate account is not active.'
      );
    }
  }, [isRo]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (step === 'otp') {
      const t = setTimeout(() => otpInputRefs.current[0]?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [step]);

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
      const res: any = await affiliateLoginAction(cleanedEmail, cleanedCode, currentLocale);

      if (res.success && res.requiresOtp && res.challengeToken) {
        setChallengeToken(res.challengeToken);
        setMaskedEmail(res.maskedEmail || cleanedEmail);
        setOtpDigits(['', '', '', '', '', '']);
        setResendCooldown(Number(res.cooldownSeconds) || 45);
        setStatus('idle');
        setStep('otp');
        submittingRef.current = false;
      } else if (res.success) {
        setStatus('success');
        const targetLocale = res.locale === 'en' ? 'en' : res.locale === 'ro' ? 'ro' : currentLocale || 'ro';
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

  const submitOtpCode = async (joinedOtp: string) => {
    if (submittingRef.current || status === 'loading' || status === 'success') return;
    if (!/^\d{6}$/.test(joinedOtp)) {
      setStatus('error');
      setErrorMessage(
        isRo ? 'Te rugăm să introduci toate cele 6 cifre primite pe email.' : 'Please enter all 6 digits sent to your email.'
      );
      return;
    }

    submittingRef.current = true;
    setStatus('loading');
    setErrorMessage('');

    try {
      const res: any = await verifyAffiliateOtpAction(challengeToken, joinedOtp, currentLocale);
      if (res.success) {
        setStatus('success');
        const targetLocale = res.locale === 'en' ? 'en' : res.locale === 'ro' ? 'ro' : currentLocale || 'ro';
        window.location.href = `/${targetLocale}/affiliate/dashboard`;
      } else {
        setStatus('error');
        setErrorMessage(res.error || (isRo ? 'Cod incorect.' : 'Incorrect code.'));
        if (res.expired) {
          setStep('credentials');
          setChallengeToken('');
          setOtpDigits(['', '', '', '', '', '']);
        }
        submittingRef.current = false;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      setStatus('error');
      setErrorMessage(message || (isRo ? 'Eroare de conexiune.' : 'Connection error.'));
      submittingRef.current = false;
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitOtpCode(otpDigits.join(''));
  };

  const handleOtpChange = (idx: number, rawVal: string) => {
    clearError();
    const digitsOnly = rawVal.replace(/\D/g, '');
    if (!digitsOnly) {
      setOtpDigits((prev) => {
        const next = [...prev];
        next[idx] = '';
        return next;
      });
      return;
    }

    // Handle autofill or multi-digit paste inside a single box
    if (digitsOnly.length > 1) {
      const sliced = digitsOnly.slice(0, 6).split('');
      const next = ['', '', '', '', '', ''];
      for (let i = 0; i < 6; i++) {
        next[i] = sliced[i] || '';
      }
      setOtpDigits(next);
      const focusIdx = Math.min(5, sliced.length);
      otpInputRefs.current[focusIdx]?.focus();
      if (sliced.length === 6) {
        submitOtpCode(next.join(''));
      }
      return;
    }

    const next = [...otpDigits];
    next[idx] = digitsOnly;
    setOtpDigits(next);
    if (idx < 5) {
      otpInputRefs.current[idx + 1]?.focus();
    } else if (next.every((d) => /^\d$/.test(d))) {
      submitOtpCode(next.join(''));
    }
  };

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
      e.preventDefault();
      setOtpDigits((prev) => {
        const next = [...prev];
        next[idx - 1] = '';
        return next;
      });
      otpInputRefs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      e.preventDefault();
      otpInputRefs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowRight' && idx < 5) {
      e.preventDefault();
      otpInputRefs.current[idx + 1]?.focus();
    }
  };

  const handleResendOtp = async () => {
    if (resending || resendCooldown > 0 || !challengeToken) return;
    setResending(true);
    clearError();
    try {
      const res: any = await resendAffiliateOtpAction(challengeToken, currentLocale);
      if (res.success && res.challengeToken) {
        setChallengeToken(res.challengeToken);
        setOtpDigits(['', '', '', '', '', '']);
        setResendCooldown(Number(res.cooldownSeconds) || 45);
        otpInputRefs.current[0]?.focus();
      } else {
        setStatus('error');
        setErrorMessage(res.error || (isRo ? 'Nu am putut retrimite codul.' : 'Could not resend code.'));
        if (typeof res.retryAfterSeconds === 'number') {
          setResendCooldown(res.retryAfterSeconds);
        }
        if (res.expired) {
          setStep('credentials');
          setChallengeToken('');
        }
      }
    } catch {
      setStatus('error');
      setErrorMessage(isRo ? 'Eroare de conexiune.' : 'Connection error.');
    } finally {
      setResending(false);
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
    <div className="relative w-full min-h-[calc(100dvh-92px)] bg-black text-white overflow-x-hidden flex flex-col px-4 sm:px-6 pt-5 pb-12 sm:py-10 lg:py-12 selection:bg-[#e32f8c] selection:text-white">
      <div className="trenzone-ambient-canvas" aria-hidden="true" />
      <div className="trenzone-ambient-texture" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[380px] z-[2]"
        style={{
          background:
            'radial-gradient(68% 75% at 50% 0%, rgba(227,47,140,0.09) 0%, rgba(227,47,140,0.03) 45%, transparent 78%)',
        }}
        aria-hidden="true"
      />

      <div className="my-auto mx-auto w-full max-w-5xl relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
          {/* Desktop Partner Value Panel */}
          <motion.aside
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="hidden lg:flex lg:col-span-6 flex-col justify-between rounded-3xl bg-[#0a0a0e]/85 backdrop-blur-xl border border-white/10 p-9 xl:p-10 relative overflow-hidden min-h-[520px] shadow-[0_24px_80px_-20px_rgba(0,0,0,0.9)]"
          >
            <div
              className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#e32f8c]/45 to-transparent pointer-events-none"
              aria-hidden="true"
            />
            <div
              className="absolute -top-28 -left-28 w-72 h-72 bg-[#e32f8c]/14 rounded-full blur-3xl pointer-events-none"
              aria-hidden="true"
            />
            <div
              className="absolute -bottom-24 -right-24 w-64 h-64 bg-[#e32f8c]/10 rounded-full blur-3xl pointer-events-none"
              aria-hidden="true"
            />

            <div className="relative z-10">
              <div className="flex items-center justify-between gap-4 mb-9">
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#e32f8c]/12 border border-[#e32f8c]/35 text-[#ff66b2] text-[10px] font-black uppercase tracking-[0.2em]">
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-[#e32f8c] shadow-[0_0_8px_#e32f8c]"
                    aria-hidden="true"
                  />
                  {isRo ? 'Portal Parteneri' : 'Partner Portal'}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                  {isRo ? 'Comision 10%–20%' : '10%–20% Commission'}
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
                  ? 'Intră în contul tău de afiliat TrenZone pentru a urmări vânzările, click-urile și comisioanele.'
                  : 'Access your TrenZone partner portal to track referred sales, link clicks, and payouts.'}
              </p>

              <div className="space-y-4">
                {highlights.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-[#e32f8c]/10 border border-[#e32f8c]/25 flex items-center justify-center shrink-0 text-[#ff66b2]">
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
            className="lg:col-span-6 w-full max-w-md mx-auto lg:max-w-none rounded-3xl bg-[#0a0a0e]/85 backdrop-blur-xl border border-white/10 p-6 sm:p-8 xl:p-10 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.9)] relative overflow-hidden"
          >
            <div
              className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#e32f8c]/45 to-transparent pointer-events-none"
              aria-hidden="true"
            />
            <div
              className="absolute -top-24 -right-24 w-56 h-56 bg-[#e32f8c]/14 rounded-full blur-3xl pointer-events-none"
              aria-hidden="true"
            />

            <div className="relative z-10">
              {/* Card Header: Pill Badge */}
              <div className="mb-6">
                <div className="flex items-center justify-between gap-3 pb-4 mb-5 border-b border-white/10">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#e32f8c]/12 border border-[#e32f8c]/35 text-[#ff66b2] text-[10px] font-black uppercase tracking-[0.2em]">
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-[#e32f8c] shadow-[0_0_8px_#e32f8c]"
                      aria-hidden="true"
                    />
                    {isRo ? 'Portal Parteneri' : 'Partner Portal'}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mb-1.5 font-[family-name:var(--font-oswald)]">
                  {step === 'otp'
                    ? isRo
                      ? 'Verifică Emailul'
                      : 'Verify Your Email'
                    : isRo
                      ? 'Autentificare Afiliat'
                      : 'Affiliate Sign In'}
                </h1>
                <p className="text-xs sm:text-sm text-zinc-400 font-medium leading-relaxed">
                  {step === 'otp'
                    ? isRo
                      ? `Ți-am trimis pe ${maskedEmail} un cod unic de 6 cifre și un link rapid de autentificare.`
                      : `We sent a 6-digit verification code and an instant sign-in link to ${maskedEmail}.`
                    : isRo
                      ? 'Introdu emailul și codul tău activ de afiliat, apoi confirmă codul primit pe email.'
                      : 'Enter your email and active affiliate code, then confirm with the code sent to your email.'}
                </p>
              </div>

              {step === 'credentials' ? (
                <form onSubmit={handleLogin} noValidate className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="affiliate-email"
                      className="block text-[11px] font-black uppercase tracking-widest text-zinc-300 ml-0.5"
                    >
                      {isRo ? 'Adresă de Email' : 'Email Address'}
                    </label>
                    <div className="group relative flex items-center bg-black/60 border border-white/15 rounded-xl focus-within:border-[#e32f8c] focus-within:ring-2 focus-within:ring-[#e32f8c]/20 transition-all">
                      <Mail
                        className="w-4 h-4 text-zinc-500 group-focus-within:text-[#ff66b2] absolute left-4 pointer-events-none transition-colors"
                        aria-hidden="true"
                      />
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
                        className="w-full h-12 bg-transparent rounded-xl pl-11 pr-4 text-base font-medium text-white placeholder:text-zinc-500 focus:outline-none"
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
                    <div className="group relative flex items-center bg-black/60 border border-white/15 rounded-xl focus-within:border-[#e32f8c] focus-within:ring-2 focus-within:ring-[#e32f8c]/20 transition-all">
                      <Lock
                        className="w-4 h-4 text-zinc-500 group-focus-within:text-[#ff66b2] absolute left-4 pointer-events-none transition-colors"
                        aria-hidden="true"
                      />
                      <input
                        id="affiliate-code"
                        name="affiliateCode"
                        type={showCode ? 'text' : 'password'}
                        required
                        autoComplete="off"
                        autoCapitalize="characters"
                        autoCorrect="off"
                        spellCheck={false}
                        value={code}
                        onChange={(e) => {
                          setCode(e.target.value.toUpperCase());
                          clearError();
                        }}
                        placeholder={isRo ? 'Ex: CODULTAU' : 'e.g. YOURCODE'}
                        className={`w-full h-12 bg-transparent rounded-xl pl-11 pr-12 text-base font-mono font-bold tracking-wider text-white placeholder:text-zinc-500 placeholder:font-sans placeholder:font-medium placeholder:tracking-normal focus:outline-none ${
                          showCode ? 'uppercase' : ''
                        }`}
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
                        className="absolute right-1 w-10 h-10 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {status === 'error' && errorMessage && (
                    <div
                      role="alert"
                      className="bg-red-500/10 text-red-200 text-xs sm:text-sm font-semibold px-3.5 py-3 rounded-xl border border-red-500/35 space-y-1.5 leading-relaxed"
                    >
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
                        <span>{errorMessage}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 pl-6.5 font-medium">
                        {isRo
                          ? 'Conturile noi devin active după aprobare — verifică emailul pentru codul tău confirmat.'
                          : 'New partner accounts activate after review — check your email for your confirmed code.'}
                      </p>
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
                    className="w-full h-12 sm:h-[52px] bg-[#e32f8c] hover:bg-[#ff3b9e] text-white rounded-xl font-black uppercase tracking-wider text-xs sm:text-sm transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 shadow-[0_0_24px_rgba(227,47,140,0.38)] hover:shadow-[0_0_32px_rgba(227,47,140,0.58)] cursor-pointer"
                  >
                    {status === 'loading' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
                        <span>{isRo ? 'Se trimite codul...' : 'Sending verification...'}</span>
                      </>
                    ) : (
                      <>
                        <span>{isRo ? 'Trimite Cod pe Email' : 'Send Email Code'}</span>
                        <ArrowRight className="w-4 h-4" aria-hidden="true" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleOtpSubmit} noValidate className="space-y-4">
                  <div className="rounded-xl bg-[#e32f8c]/10 border border-[#e32f8c]/30 px-3.5 py-3 flex items-start gap-2.5">
                    <KeyRound className="w-4 h-4 text-[#ff66b2] shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="text-xs text-zinc-200 leading-relaxed">
                      <p className="font-bold text-white">
                        {isRo ? 'Email trimis cu succes' : 'Verification email sent'}
                      </p>
                      <p className="text-zinc-300 mt-0.5">
                        {isRo
                          ? 'Introdu cele 6 cifre din email sau apasă butonul «Intră în cont» direct din mesaj.'
                          : 'Enter the 6-digit code from your email or click “Sign In Instantly” inside the message.'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 px-0.5">
                      <label className="text-[11px] font-black uppercase tracking-widest text-zinc-300">
                        {isRo ? 'Cod de 6 cifre' : '6-Digit Code'}
                      </label>
                      <span className="text-[11px] text-zinc-500 font-semibold">
                        {isRo ? 'Valabil 10 min' : 'Valid 10 min'}
                      </span>
                    </div>

                    <div className="grid grid-cols-6 gap-2 sm:gap-2.5">
                      {otpDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => {
                            otpInputRefs.current[idx] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                          aria-label={isRo ? `Cifra ${idx + 1}` : `Digit ${idx + 1}`}
                          value={digit}
                          onChange={(e) => handleOtpChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          className="h-13 sm:h-14 w-full text-center text-xl sm:text-2xl font-mono font-black text-white bg-black/70 border border-white/15 rounded-xl focus:outline-none focus:border-[#e32f8c] focus:ring-2 focus:ring-[#e32f8c]/25 transition-all"
                        />
                      ))}
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
                        {isRo ? 'Autentificare reușită! Te redirecționăm...' : 'Verified! Redirecting...'}
                      </span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={status === 'loading' || status === 'success' || otpDigits.some((d) => !d)}
                    className="w-full h-12 sm:h-[52px] bg-[#e32f8c] hover:bg-[#ff3b9e] text-white rounded-xl font-black uppercase tracking-wider text-xs sm:text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(227,47,140,0.38)] hover:shadow-[0_0_32px_rgba(227,47,140,0.58)] cursor-pointer"
                  >
                    {status === 'loading' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
                        <span>{isRo ? 'Se verifică codul...' : 'Verifying code...'}</span>
                      </>
                    ) : (
                      <>
                        <span>{isRo ? 'Confirmă și Intră în Dashboard' : 'Confirm & Enter Dashboard'}</span>
                        <ArrowRight className="w-4 h-4" aria-hidden="true" />
                      </>
                    )}
                  </button>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs">
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resending || resendCooldown > 0}
                      className="inline-flex items-center justify-center sm:justify-start gap-1.5 font-bold text-[#ff66b2] hover:text-white disabled:text-zinc-500 disabled:cursor-not-allowed transition-colors py-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                      <span>
                        {resendCooldown > 0
                          ? isRo
                            ? `Retrimite codul (${resendCooldown}s)`
                            : `Resend code (${resendCooldown}s)`
                          : isRo
                            ? 'Retrimite codul pe email'
                            : 'Resend email code'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setStep('credentials');
                        setChallengeToken('');
                        setOtpDigits(['', '', '', '', '', '']);
                        clearError();
                      }}
                      className="inline-flex items-center justify-center sm:justify-end gap-1 font-semibold text-zinc-400 hover:text-white transition-colors py-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>{isRo ? 'Schimbă datele' : 'Change details'}</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-center text-zinc-500 font-medium">
                    {isRo
                      ? 'După confirmare, rămâi conectat pe acest dispozitiv timp de 60 de zile.'
                      : 'Once confirmed, this device stays signed in for 60 days.'}
                  </p>
                </form>
              )}

              <div className="mt-6 pt-5 border-t border-white/10 flex flex-col items-center gap-2 text-center">
                <p className="text-xs sm:text-sm text-zinc-400 font-medium">
                  {isRo ? 'Încă nu ești afiliat?' : 'Not an affiliate yet?'}{' '}
                  <Link
                    href="/affiliate"
                    className="font-bold text-[#ff66b2] hover:text-white transition-colors inline-flex items-center gap-1 py-1.5 px-1"
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
