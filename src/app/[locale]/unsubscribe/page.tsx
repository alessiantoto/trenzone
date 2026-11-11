'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MailX, CheckCircle2 } from 'lucide-react';
import { unsubscribeEmail } from '@/app/actions/unsubscribe';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';

function UnsubscribeForm() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email');
  const locale = useLocale();
  const isEn = locale === 'en';
  
  const [email, setEmail] = useState(emailParam || '');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    const res = await unsubscribeEmail(email, isEn ? 'en' : 'ro');
    if (res.success) {
      setStatus('success');
    } else {
      setStatus('error');
    }
  };

  return (
    <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-100 text-center animate-in fade-in zoom-in-95 duration-500">
      {status === 'success' ? (
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">
            {isEn ? 'You have unsubscribed!' : 'Te-ai dezabonat cu succes!'}
          </h1>
          <p className="text-slate-500 mb-6 font-medium">
            {isEn
              ? `Your email address (${email}) has been removed from our marketing list. You will no longer receive promotional or abandoned-cart messages—only essential order confirmations.`
              : `Adresa ta (${email}) a fost ștearsă din lista de marketing. Nu vei mai primi notificări promoționale sau de coș abandonat. Vei primi doar e-mailuri esențiale (confirmări comenzi).`}
          </p>
          <Link
            href="/"
            className="inline-block bg-slate-900 text-white font-bold py-3 px-8 rounded-xl hover:bg-slate-800 transition-colors"
          >
            {isEn ? 'Return to Homepage' : 'Înapoi pe site'}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center mb-6">
            <MailX size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">
            {isEn ? 'Unsubscribe' : 'Dezabonare'}
          </h1>
          <p className="text-slate-500 mb-6 font-medium">
            {isEn
              ? 'Enter your email address to unsubscribe from our promotional emails.'
              : 'Introdu adresa ta de e-mail pentru a te dezabona de la mesajele noastre promoționale.'}
          </p>
          
          <form onSubmit={handleUnsubscribe} className="w-full space-y-4">
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={isEn ? 'Your email address' : 'Adresa ta de e-mail'}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e32f8c]/50 font-medium text-center"
            />
            {status === 'error' && (
              <p className="text-red-500 text-sm font-bold">
                {isEn ? 'An error occurred. Please try again.' : 'A apărut o eroare. Te rugăm să încerci din nou.'}
              </p>
            )}
            <button 
              type="submit" 
              disabled={status === 'loading'}
              className="w-full bg-[#e32f8c] text-black font-black py-3 rounded-xl shadow-md shadow-[#e32f8c]/20 hover:bg-[#c41a72] transition-all disabled:opacity-50"
            >
              {status === 'loading'
                ? (isEn ? 'Processing...' : 'Se procesează...')
                : (isEn ? 'Unsubscribe' : 'Dezabonează-mă')}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-[#e32f8c]/30">
      <Suspense fallback={<div className="animate-pulse">Loading...</div>}>
        <UnsubscribeForm />
      </Suspense>
    </div>
  );
}
