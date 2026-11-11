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
  X
} from 'lucide-react';
import { verifyMaintenancePassword } from '@/app/actions/admin-settings';
import { subscribeToNewsletter } from '@/app/actions/newsletter';

interface MaintenanceViewProps {
  endDate?: string | null;
  locale?: string;
}

export function MaintenanceView({ endDate, locale = 'ro' }: MaintenanceViewProps) {
  const isRo = locale !== 'en';

  // Bypass logic
  const [showSecret, setShowSecret] = useState(false);
  const [password, setPassword] = useState('');
  const [bypassing, setBypassing] = useState(false);
  const [bypassError, setBypassError] = useState('');

  // Countdown logic
  const [isClient, setIsClient] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [hasValidDate, setHasValidDate] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Newsletter lead capture
  const [email, setEmail] = useState('');
  const [submittingEmail, setSubmittingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    setIsClient(true);
    
    if (!endDate) {
      setHasValidDate(false);
      return;
    }

    const targetTime = new Date(endDate).getTime();
    if (isNaN(targetTime)) {
      setHasValidDate(false);
      return;
    }

    setHasValidDate(true);

    const updateTimer = () => {
      const now = new Date().getTime();
      const distance = targetTime - now;

      if (distance <= 0) {
        setIsEnded(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setIsEnded(false);
      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  const handleBypass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
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
    if (!email || !email.includes('@')) {
      setEmailError(isRo ? 'Te rugăm să introduci un email valid.' : 'Please enter a valid email.');
      return;
    }

    setSubmittingEmail(true);
    setEmailError('');
    try {
      const res = await subscribeToNewsletter(
        undefined, 
        email, 
        (locale === 'en' ? 'en' : 'ro'), 
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

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-between p-4 sm:p-6 md:p-8 relative overflow-hidden font-sans text-white bg-[#030305] selection:bg-[#e32f8c] selection:text-white">
      
      {/* 🏋️‍♂️ FULLSCREEN CINEMATIC SHOP BACKGROUND */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/home/hero.jpg"
          alt="TrenZone Gym Hardcore Gear"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[center_25%] filter brightness-90 contrast-115 transform scale-105 transition-transform duration-1000"
        />
        {/* Deep dark gradient vignettes for razor-sharp readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#030305] via-[#030305]/85 to-[#030305]/90 z-10 pointer-events-none" />
        <div className="absolute inset-0 bg-[#030305]/50 backdrop-blur-[2px] z-10 pointer-events-none" />
        {/* Signature TrenZone Hot-Pink Ambient Radial Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#e32f8c]/15 blur-[120px] rounded-full pointer-events-none z-10" />
        {/* Subtle grid texture overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] z-10 pointer-events-none" />
      </div>

      {/* 🌟 TOP BRAND HEADER */}
      <header className="relative z-20 w-full max-w-6xl mx-auto flex flex-col items-center pt-2 sm:pt-4">
        <div className="flex flex-col items-center gap-2.5">
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
            <Image
              src="/images/vladtren-logo.png"
              alt="TrenZone Logo"
              width={80}
              height={80}
              priority
              className="w-full h-full object-contain drop-shadow-[0_0_25px_rgba(227,47,140,0.4)]"
            />
          </div>

          <div className="text-center">
            <span className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-white font-[family-name:var(--font-oswald)]">
              TRENZONE <span className="text-[#e32f8c]">BY VLAD TREN</span>
            </span>
          </div>

          {/* Live Status Badge */}
          <div className="mt-1 inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-[11px] sm:text-xs font-black uppercase tracking-widest text-[#e32f8c] shadow-lg">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#e32f8c] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#e32f8c]" />
            </span>
            <span>
              {isRo ? 'Pregătim Noul Drop · Mentenanță' : 'Dropping Soon · Store Maintenance'}
            </span>
          </div>
        </div>
      </header>

      {/* 🚀 MAIN CONTENT HERO */}
      <section className="relative z-20 w-full max-w-4xl mx-auto flex flex-col items-center justify-center my-auto py-8 sm:py-12 text-center px-2">
        
        {/* Massive Headline */}
        <h2 className="text-4xl sm:text-6xl md:text-7xl font-black uppercase text-white leading-[0.92] tracking-tighter drop-shadow-2xl mb-4 font-[family-name:var(--font-oswald)]">
          {isRo ? (
            <>
              NOUL DROP ESTE <br />
              <span className="text-[#e32f8c] drop-shadow-[0_0_35px_rgba(227,47,140,0.5)]">APROAPE AICI</span>
            </>
          ) : (
            <>
              THE NEW DROP IS <br />
              <span className="text-[#e32f8c] drop-shadow-[0_0_35px_rgba(227,47,140,0.5)]">COMING SOON</span>
            </>
          )}
        </h2>

        <p className="text-sm sm:text-base md:text-lg text-zinc-300 max-w-xl mx-auto leading-relaxed font-normal mb-8 sm:mb-10 text-balance">
          {isRo 
            ? 'Actualizăm magazinul și pregătim lotul de echipamente hardcore TrenZone. Revenim în cel mai scurt timp posibil!' 
            : 'We are updating our store and preparing the newest TrenZone hardcore drop. We will be back online shortly!'}
        </p>

        {/* ⏳ COUNTDOWN DISPLAY */}
        {isClient && hasValidDate && !isEnded && (
          <div className="w-full max-w-2xl mx-auto mb-10 sm:mb-12 animate-in fade-in duration-700">
            <div className="grid grid-cols-4 gap-2.5 sm:gap-4 md:gap-6">
              <TimeCard value={timeLeft.days} label={isRo ? 'Zile' : 'Days'} />
              <TimeCard value={timeLeft.hours} label={isRo ? 'Ore' : 'Hours'} />
              <TimeCard value={timeLeft.minutes} label={isRo ? 'Min' : 'Min'} />
              <TimeCard value={timeLeft.seconds} label={isRo ? 'Sec' : 'Sec'} animate />
            </div>
          </div>
        )}

        {/* Alternative Banner if no timer is configured */}
        {isClient && (!hasValidDate || isEnded) && (
          <div className="w-full max-w-md mx-auto mb-10 sm:mb-12 bg-white/[0.03] border border-white/10 rounded-2xl p-5 sm:p-6 backdrop-blur-md shadow-2xl">
            <div className="flex items-center justify-center gap-2 text-[#e32f8c] font-black text-xs sm:text-sm uppercase tracking-wider mb-1.5">
              <Clock size={15} />
              <span>{isRo ? 'Lansare Iminentă' : 'Imminent Release'}</span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400">
              {isRo 
                ? 'Finalizăm ultimele detalii de configurare. Rămâi pregătit!' 
                : 'Finalizing inventory and store configuration. Stay tuned!'}
            </p>
          </div>
        )}

        {/* 📬 VIP NOTIFICATION LEAD CAPTURE ("Fii primul care află") */}
        <div className="w-full max-w-lg mx-auto bg-zinc-950/70 border border-white/10 hover:border-[#e32f8c]/40 rounded-3xl p-5 sm:p-7 backdrop-blur-xl shadow-2xl transition-all">
          <div className="flex items-center justify-center gap-2 mb-2 text-white font-black text-sm sm:text-base uppercase tracking-wide">
            <Mail size={16} className="text-[#e32f8c]" />
            <span>{isRo ? 'Fii Primul Care Află Când Deschidem' : 'Be The First To Know When We Launch'}</span>
          </div>

          <p className="text-xs text-zinc-400 mb-5 text-center leading-normal">
            {isRo 
              ? 'Introdu adresa de email pentru a primi acces prioritar și 10% reducere la noul drop.' 
              : 'Enter your email for priority early access and 10% discount on the drop.'}
          </p>

          {emailSuccess ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-center gap-2.5 text-emerald-400 text-xs sm:text-sm font-bold animate-in fade-in">
              <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
              <span>{isRo ? 'Te-am înregistrat cu succes! Îți vom trimite un email la lansare.' : 'Successfully registered! We will notify you at launch.'}</span>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isRo ? 'adresa.ta@email.ro' : 'your.email@domain.com'}
                  required
                  disabled={submittingEmail}
                  className="w-full h-12 bg-white/5 border border-white/15 focus:border-[#e32f8c] rounded-xl px-4 text-sm text-white placeholder-zinc-500 outline-none transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={submittingEmail || !email}
                className="h-12 px-6 bg-[#e32f8c] hover:bg-[#c92477] text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(227,47,140,0.4)] hover:shadow-[0_0_30px_rgba(227,47,140,0.6)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95 shrink-0"
              >
                {submittingEmail ? (
                  <Loader2 size={16} className="animate-spin" />
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

      {/* 🌐 FOOTER & SOCIAL LINKS */}
      <footer className="relative z-20 w-full max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 pb-2 border-t border-white/5 text-zinc-500 text-xs">
        <div className="flex items-center gap-4">
          <a
            href="https://www.instagram.com/vladtren/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-zinc-400 hover:text-[#e32f8c] transition-colors"
          >
            <InstagramIcon size={14} />
            <span>@vladtren</span>
          </a>
          <span className="text-zinc-700">·</span>
          <a
            href="mailto:trenzone483@gmail.com"
            className="text-zinc-400 hover:text-white transition-colors"
          >
            trenzone483@gmail.com
          </a>
        </div>

        <div className="text-[11px] font-medium tracking-wider text-zinc-500">
          &copy; {new Date().getFullYear()} TRENZONE. All Rights Reserved.
        </div>
      </footer>

      {/* 🔐 FLOATING ADMIN BYPASS TRIGGER (Accessible on Mobile and Desktop) */}
      <button
        onClick={() => setShowSecret(true)}
        className="fixed bottom-5 right-5 z-40 w-10 h-10 rounded-full bg-zinc-950/80 hover:bg-zinc-900 border border-white/10 hover:border-[#e32f8c]/60 text-zinc-400 hover:text-white shadow-xl backdrop-blur-md flex items-center justify-center transition-all cursor-pointer group hover:scale-105 active:scale-95"
        title={isRo ? 'Acces Administrator (Bypass)' : 'Admin Access (Bypass)'}
        aria-label="Admin Bypass"
      >
        <Lock size={15} className="group-hover:text-[#e32f8c] transition-colors" />
      </button>

      {/* 🛡️ SECRET BYPASS MODAL */}
      {showSecret && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-zinc-950 border border-white/15 p-6 sm:p-7 rounded-3xl shadow-2xl relative text-left">
            <button
              onClick={() => {
                setShowSecret(false);
                setBypassError('');
                setPassword('');
              }}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
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
                className="w-full h-12 bg-white hover:bg-zinc-100 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 flex justify-center items-center cursor-pointer shadow-lg active:scale-95"
              >
                {bypassing ? (
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
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

// Subcomponent: Glowing Countdown Time Card
function TimeCard({ value, label, animate = false }: { value: number; label: string; animate?: boolean }) {
  return (
    <div className="bg-zinc-950/80 border border-white/10 hover:border-[#e32f8c]/40 rounded-2xl p-3 sm:p-5 flex flex-col items-center justify-center backdrop-blur-md shadow-2xl relative overflow-hidden group transition-all">
      {/* Top subtle glow line */}
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[#e32f8c] to-transparent opacity-60" />
      
      <span className={`text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white font-[family-name:var(--font-oswald)] ${animate ? 'animate-[pulse_1.5s_ease-in-out_infinite]' : ''}`}>
        {String(Math.max(0, value)).padStart(2, '0')}
      </span>
      <span className="text-[9px] sm:text-[11px] font-bold text-zinc-400 uppercase tracking-[0.2em] mt-1.5 sm:mt-2">
        {label}
      </span>
    </div>
  );
}

function InstagramIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}