'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Loader2,
  Lock,
  KeyRound,
  Mail,
  CheckCircle2,
  ArrowRight,
  Clock,
  ShieldCheck,
  X,
} from 'lucide-react';
import { verifyMaintenancePassword } from '@/app/actions/admin-settings';
import { subscribeToNewsletter } from '@/app/actions/newsletter';
import { parseUniversalDropEndDateMs } from '@/lib/maintenance-time';
import { getCdnUrl } from '@/lib/utils/cdn';

interface MaintenanceViewProps {
  endDate?: string | null;
  serverNowIso?: string | null;
  locale?: string;
}

export function MaintenanceView({
  endDate,
  serverNowIso,
  locale = 'ro',
}: MaintenanceViewProps) {
  const isRo = locale !== 'en';

  // Bypass logic
  const [showSecret, setShowSecret] = useState(false);
  const [password, setPassword] = useState('');
  const [bypassing, setBypassing] = useState(false);
  const [bypassError, setBypassError] = useState('');

  // Synchronized global countdown logic (identical instant across all timezones)
  const [isClient, setIsClient] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [hasValidDate, setHasValidDate] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Newsletter / VIP drop capture (5% discount)
  const [email, setEmail] = useState('');
  const [submittingEmail, setSubmittingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    setIsClient(true);

    const targetTime = parseUniversalDropEndDateMs(endDate);
    if (targetTime === null) {
      setHasValidDate(false);
      return;
    }

    setHasValidDate(true);

    // Sync client clock offset against SSR server time so wrong local device clocks stay synced globally
    const serverMs = serverNowIso ? Date.parse(serverNowIso) : NaN;
    const clockSkewMs = Number.isFinite(serverMs) ? serverMs - Date.now() : 0;

    const triggerUnlockReload = () => {
      try {
        const key = `tz_drop_unlocked_${targetTime}`;
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, '1');
          window.location.reload();
        }
      } catch {
        window.location.reload();
      }
    };

    const updateTimer = () => {
      const effectiveNow = Date.now() + clockSkewMs;
      const distance = targetTime - effectiveNow;

      if (distance <= 0) {
        setIsEnded(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        triggerUnlockReload();
        return;
      }

      setIsEnded(false);
      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [endDate, serverNowIso]);

  const handleBypass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bypassing || !password) return;
    setBypassing(true);
    setBypassError('');
    try {
      const res = await verifyMaintenancePassword(password);
      if (res.success) {
        window.location.href = window.location.pathname;
      } else {
        setBypassError(res.error || (isRo ? 'Parolă incorectă' : 'Incorrect password'));
      }
    } catch {
      setBypassError(isRo ? 'Eroare de conexiune. Încearcă din nou.' : 'Connection error. Please try again.');
    } finally {
      setBypassing(false);
    }
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingEmail) return;
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError(isRo ? 'Te rugăm să introduci o adresă de email validă.' : 'Please enter a valid email address.');
      return;
    }

    setSubmittingEmail(true);
    setEmailError('');
    try {
      const res = await subscribeToNewsletter(
        undefined,
        trimmed,
        locale === 'en' ? 'en' : 'ro',
        'maintenance_page'
      );
      if (res.success) {
        setEmailSuccess(true);
        setEmail('');
      } else {
        setEmailError(res.error || (isRo ? 'A apărut o problemă. Încearcă din nou.' : 'Something went wrong.'));
      }
    } catch {
      setEmailError(isRo ? 'Eroare la trimitere. Încearcă din nou.' : 'Failed to subscribe.');
    } finally {
      setSubmittingEmail(false);
    }
  };

  const switchLocaleHref = isRo ? '/en' : '/ro';

  return (
    <main className="min-h-[100dvh] w-full flex flex-col items-center justify-between px-4 py-5 sm:px-6 sm:py-7 md:px-10 md:py-8 relative overflow-hidden font-sans text-white bg-[#030305] selection:bg-[#e32f8c] selection:text-white">
      {/* 🏋️‍♂️ FULLSCREEN CINEMATIC BACKGROUND */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Image
          src={getCdnUrl("/images/home/hero.jpg")}
          alt="TrenZone Hardcore Strength Equipment"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[center_22%] brightness-[0.55] contrast-125 scale-105"
        />
        {/* Deep Obsidian Vignette & Radial Hot-Pink Spotlight */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#030305]/95 via-[#030305]/70 to-[#030305]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_22%,rgba(227,47,140,0.18),transparent_62%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff04_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)] bg-[size:3.5rem_3.5rem]" />
      </div>

      {/* 🌐 SUBTLE LANGUAGE SWITCHER */}
      <div className="relative z-20 w-full max-w-5xl mx-auto flex items-center justify-end">
        <a
          href={switchLocaleHref}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 hover:border-white/25 text-[11px] font-black uppercase tracking-widest text-zinc-300 hover:text-white backdrop-blur-md transition-all"
        >
          <span className={isRo ? 'text-[#e32f8c]' : 'text-zinc-400'}>RO</span>
          <span className="text-zinc-600">/</span>
          <span className={!isRo ? 'text-[#e32f8c]' : 'text-zinc-400'}>EN</span>
        </a>
      </div>

      {/* 🚀 CENTERED DROP HERO & VIP CAPTURE */}
      <section className="relative z-20 w-full max-w-2xl mx-auto flex flex-col items-center justify-center my-auto py-4 sm:py-6 text-center">
        {/* Brand Emblem & Lockup */}
        <div className="flex flex-col items-center mb-5 sm:mb-6">
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 mb-3 flex items-center justify-center">
            <Image
              src={getCdnUrl("/images/vladtren-logo.png")}
              alt="TrenZone"
              width={72}
              height={72}
              priority
              className="w-full h-full object-contain drop-shadow-[0_0_24px_rgba(227,47,140,0.45)]"
            />
          </div>
          <p className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white font-[family-name:var(--font-oswald)] leading-none">
            TRENZONE <span className="text-[#e32f8c]">BY VLAD TREN</span>
          </p>

          {/* Live Drop Pill */}
          <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.05] border border-white/10 backdrop-blur-md text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-zinc-200 shadow-lg">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#e32f8c] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#e32f8c]" />
            </span>
            <span>
              {isRo ? 'Noul Drop · Pregătim Lansarea' : 'New Drop · Launching Simultaneously'}
            </span>
          </div>
        </div>

        {/* Massive Editorial Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-[64px] font-black uppercase text-white leading-[0.92] tracking-tighter mb-3.5 sm:mb-4 font-[family-name:var(--font-oswald)]">
          {isRo ? (
            <>
              NOUL DROP ESTE{' '}
              <span className="block text-[#e32f8c] drop-shadow-[0_0_32px_rgba(227,47,140,0.45)]">
                APROAPE AICI
              </span>
            </>
          ) : (
            <>
              THE NEW DROP IS{' '}
              <span className="block text-[#e32f8c] drop-shadow-[0_0_32px_rgba(227,47,140,0.45)]">
                ALMOST HERE
              </span>
            </>
          )}
        </h1>

        <p className="text-xs sm:text-sm md:text-base text-zinc-300/90 max-w-md mx-auto leading-relaxed mb-6 sm:mb-8">
          {isRo
            ? 'Lansăm noul site TrenZone cu echipamente hardcore de forță, apparel și programe de antrenament & nutriție.'
            : 'Launching the all-new TrenZone store with heavy-duty strength gear, apparel, and training & nutrition programs.'}
        </p>

        {/* ⏳ GLOBAL SYNCHRONIZED COUNTDOWN */}
        {isClient && hasValidDate && !isEnded && (
          <div className="w-full max-w-xl mx-auto mb-6 sm:mb-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-4 gap-2 sm:gap-3.5 md:gap-4">
              <TimeCard value={timeLeft.days} label={isRo ? 'Zile' : 'Days'} />
              <TimeCard value={timeLeft.hours} label={isRo ? 'Ore' : 'Hours'} />
              <TimeCard value={timeLeft.minutes} label={isRo ? 'Min' : 'Min'} />
              <TimeCard value={timeLeft.seconds} label={isRo ? 'Sec' : 'Sec'} highlight />
            </div>
          </div>
        )}

        {/* Fallback while timer reaches 0 / no date configured */}
        {isClient && (!hasValidDate || isEnded) && (
          <div className="w-full max-w-md mx-auto mb-6 sm:mb-8 bg-white/[0.04] border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-2xl">
            <div className="flex items-center justify-center gap-2 text-[#e32f8c] font-black text-xs uppercase tracking-widest mb-1">
              <Clock size={14} />
              <span>
                {isEnded
                  ? isRo
                    ? 'Se deschide acum...'
                    : 'Unlocking store...'
                  : isRo
                    ? 'Lansare Iminentă'
                    : 'Imminent Release'}
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              {isRo
                ? 'Finalizăm ultimele detalii. Magazinul se deschide în curând!'
                : 'Finalizing inventory. Store opens shortly!'}
            </p>
          </div>
        )}

        {/* 📬 VIP NOTIFICATION CARD (5% DISCOUNT) */}
        <div className="w-full max-w-lg mx-auto bg-zinc-950/75 border border-white/12 hover:border-[#e32f8c]/40 rounded-3xl p-5 sm:p-6 backdrop-blur-xl shadow-[0_24px_60px_-15px_rgba(0,0,0,0.85)] transition-all">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#e32f8c]/15 border border-[#e32f8c]/35 text-[#ff66b5] text-[10px] font-black uppercase tracking-widest mb-2.5">
            <span>VIP EARLY ACCESS · -5%</span>
          </div>

          <h2 className="text-base sm:text-lg font-black uppercase tracking-wide text-white font-[family-name:var(--font-oswald)] mb-1.5">
            {isRo ? 'Fii primul care află când deschidem' : 'Be the first to know when we drop'}
          </h2>

          <p className="text-xs sm:text-[13px] text-zinc-400 mb-4 leading-relaxed max-w-sm mx-auto">
            {isRo ? (
              <>
                Introdu emailul pentru acces prioritar și{' '}
                <span className="text-white font-bold">5% reducere</span> la noul drop.
              </>
            ) : (
              <>
                Enter your email for priority access and{' '}
                <span className="text-white font-bold">5% off</span> the new drop.
              </>
            )}
          </p>

          {emailSuccess ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-center gap-2.5 text-emerald-300 text-xs sm:text-sm font-bold animate-in fade-in">
              <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
              <span>
                {isRo
                  ? 'Te-am înregistrat! Verifică emailul pentru reducerea de 5% și accesul la lansare.'
                  : "You're registered! Check your email for your 5% discount & launch alert."}
              </span>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isRo ? 'adresa.ta@email.ro' : 'your.email@domain.com'}
                  required
                  disabled={submittingEmail}
                  aria-label={isRo ? 'Adresă de email' : 'Email address'}
                  className="w-full h-12 bg-white/[0.05] hover:bg-white/[0.07] focus:bg-white/[0.08] border border-white/15 focus:border-[#e32f8c] focus:ring-2 focus:ring-[#e32f8c]/20 rounded-xl pl-10 pr-4 text-sm text-white placeholder-zinc-500 outline-none transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={submittingEmail || !email.trim()}
                className="h-12 px-6 bg-[#e32f8c] hover:bg-[#ff3b9e] text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_24px_rgba(227,47,140,0.38)] hover:shadow-[0_0_32px_rgba(227,47,140,0.6)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] shrink-0"
              >
                {submittingEmail ? (
                  <>
                    <Loader2 size={16} className="animate-spin shrink-0" />
                    <span>{isRo ? 'Se trimite...' : 'Sending...'}</span>
                  </>
                ) : (
                  <>
                    <span>{isRo ? 'Anunță-mă' : 'Notify Me'}</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          )}

          {emailError && (
            <p className="text-red-400 text-xs mt-2.5 text-center font-medium animate-in fade-in">
              {emailError}
            </p>
          )}
        </div>
      </section>

      {/* 🌐 CLEAN MINIMAL COPYRIGHT FOOTER */}
      <footer className="relative z-20 w-full max-w-5xl mx-auto flex items-center justify-center pt-3 pb-1 text-zinc-500">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500/90">
          &copy; {new Date().getFullYear()} TRENZONE. {isRo ? 'Toate drepturile rezervate.' : 'All Rights Reserved.'}
        </p>
      </footer>

      {/* 🔐 FLOATING ADMIN BYPASS TRIGGER */}
      <button
        type="button"
        onClick={() => setShowSecret(true)}
        className="fixed bottom-4 right-4 z-40 w-9 h-9 rounded-full bg-zinc-950/75 hover:bg-zinc-900 border border-white/10 hover:border-[#e32f8c]/60 text-zinc-400 hover:text-white opacity-60 hover:opacity-100 shadow-xl backdrop-blur-md flex items-center justify-center transition-all cursor-pointer group hover:scale-105 active:scale-95"
        title={isRo ? 'Acces Administrator (Bypass)' : 'Admin Access (Bypass)'}
        aria-label="Admin Bypass"
      >
        <Lock size={14} className="group-hover:text-[#e32f8c] transition-colors" />
      </button>

      {/* 🛡️ SECRET BYPASS MODAL */}
      {showSecret && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-zinc-950 border border-white/15 p-6 sm:p-7 rounded-3xl shadow-2xl relative text-left">
            <button
              type="button"
              onClick={() => {
                setShowSecret(false);
                setBypassError('');
                setPassword('');
              }}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              aria-label={isRo ? 'Închide' : 'Close'}
            >
              <X size={16} />
            </button>

            <div className="w-12 h-12 bg-[#e32f8c]/15 text-[#e32f8c] border border-[#e32f8c]/30 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
              <ShieldCheck size={24} />
            </div>

            <h3 className="text-lg font-black text-white uppercase tracking-tight font-[family-name:var(--font-oswald)]">
              {isRo ? 'Deblocare Administrator' : 'Administrator Bypass'}
            </h3>
            <p className="text-xs text-zinc-400 mt-1 mb-5 leading-relaxed">
              {isRo
                ? 'Introdu parola de mentenanță configurată în panoul de control pentru a accesa magazinul live.'
                : 'Enter your maintenance bypass password to browse the live store.'}
            </p>

            <form onSubmit={handleBypass} className="space-y-3.5">
              <div className="relative">
                <input
                  type="password"
                  autoFocus
                  placeholder={isRo ? 'Parolă secretă' : 'Secret password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-black/60 border border-white/15 focus:border-[#e32f8c] rounded-xl px-4 py-3 pl-11 text-sm text-white placeholder-zinc-600 outline-none transition-all font-mono"
                />
                <KeyRound size={16} className="absolute left-4 top-3.5 text-zinc-500" />
              </div>

              {bypassError && (
                <p className="text-red-400 text-xs font-semibold pl-1 animate-in fade-in">
                  {bypassError}
                </p>
              )}

              <button
                type="submit"
                disabled={bypassing || !password}
                className="w-full h-12 bg-white hover:bg-zinc-100 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 cursor-pointer shadow-lg active:scale-[0.98]"
              >
                {bypassing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black shrink-0" />
                    <span>{isRo ? 'Se verifică...' : 'Verifying...'}</span>
                  </>
                ) : (
                  <span>{isRo ? 'Deblochează Accesul' : 'Unlock Store'}</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function TimeCard({
  value,
  label,
  highlight = false,
}: {
  value: number;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-zinc-950/80 border border-white/12 hover:border-[#e32f8c]/45 rounded-2xl py-3.5 px-2 sm:py-5 sm:px-4 flex flex-col items-center justify-center backdrop-blur-md shadow-[0_16px_40px_-12px_rgba(0,0,0,0.85)] relative overflow-hidden transition-colors">
      <div
        className={`absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent ${
          highlight ? 'via-[#e32f8c]' : 'via-[#e32f8c]/65'
        } to-transparent`}
      />
      <span
        className={`text-3xl sm:text-5xl md:text-[54px] font-black tabular-nums leading-none tracking-tight font-[family-name:var(--font-oswald)] ${
          highlight ? 'text-[#ff70ba]' : 'text-white'
        }`}
      >
        {String(Math.max(0, value)).padStart(2, '0')}
      </span>
      <span className="text-[9px] sm:text-[11px] font-extrabold text-zinc-400 uppercase tracking-[0.2em] mt-2">
        {label}
      </span>
    </div>
  );
}
