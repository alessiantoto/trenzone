"use client";

import { useState } from 'react';
import { Loader2, ShieldCheck, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { verifyAdminEmail } from '@/app/actions/admin-auth';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Te rugăm să introduci atât adresa de email, cât și parola.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const cleanEmail = email.trim().toLowerCase();

      // 1. Verifică întâi dacă adresa de email este pe lista de administratori autorizați
      const isAllowed = await verifyAdminEmail(cleanEmail);
      if (!isAllowed) {
        setError("Acest cont nu este înregistrat în lista de administratori TrenZone.");
        setLoading(false);
        return;
      }

      // 2. Autentificare securizată prin Supabase Auth
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (authError || !data.session) {
        setError("Parolă incorectă sau eroare la autentificare.");
        setLoading(false);
        return;
      }

      // 3. Redirecționare în consola de administrare cu sesiune activă
      window.location.href = '/admin';

    } catch (err: any) {
      setError(err?.message || "Eroare neașteptată la autentificare.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6f8] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#e32f8c]/5 blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#e32f8c]/5 blur-[150px] rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-700">
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="bg-black p-5 rounded-[2rem] mb-5 shadow-xl border border-white/10 flex items-center justify-center">
            <Image
              src="/images/vladtren-logo.png"
              alt="TrenZone"
              width={140}
              height={140}
              priority
              className="h-[80px] w-auto object-contain hover:scale-105 transition-transform duration-500"
            />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-1.5 uppercase leading-none">
            <span className="text-[#e32f8c]">ADMIN</span> CONSOLE
          </h1>
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-[0.2em]">Authorized Personnel Only</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-[28px] p-8 sm:p-9 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#e32f8c] via-pink-400 to-transparent" />
          
          <div className="mb-6 text-center">
            <h2 className="text-slate-900 text-xl font-black uppercase tracking-tight mb-1">Autentificare</h2>
            <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Introdu datele contului de administrator</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 text-red-600 text-xs font-semibold p-4 rounded-2xl border border-red-100 flex items-start gap-2.5 animate-in slide-in-from-top-2">
              <span className="text-red-500 font-black shrink-0">✕</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Câmp Email */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-2">
                Adresă Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@trenzone.ro"
                  autoComplete="username"
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-900 text-sm font-medium rounded-2xl border border-slate-200 focus:border-[#e32f8c] focus:ring-4 focus:ring-[#e32f8c]/10 outline-none transition-all"
                />
              </div>
            </div>

            {/* Câmp Parolă */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-2">
                Parolă
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  className="w-full pl-11 pr-11 py-3.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-900 text-sm font-medium rounded-2xl border border-slate-200 focus:border-[#e32f8c] focus:ring-4 focus:ring-[#e32f8c]/10 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Buton Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-slate-950 text-white py-4 rounded-2xl font-black uppercase tracking-[0.12em] text-xs transition-all flex items-center justify-center gap-2.5 hover:bg-[#e32f8c] hover:shadow-lg hover:shadow-[#e32f8c]/25 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Se verifică datele...</span>
                </>
              ) : (
                <>
                  <span>Conectează-te în Consolă</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-7 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            <ShieldCheck size={14} className="text-[#e32f8c]" />
            <span>Securizat prin Supabase Auth</span>
          </div>
        </div>

        <p className="text-center mt-8 text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
          TrenZone Admin Console<br/>
          Secure Protocol v2.0
        </p>
      </div>
    </div>
  );
}