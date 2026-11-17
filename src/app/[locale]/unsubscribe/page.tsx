'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MailX, CheckCircle, Loader2 } from 'lucide-react';
import { unsubscribeFromNewsletter } from '@/app/actions/newsletter';
import { useLocale } from 'next-intl';

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || loading || !email.trim()) return;
    
    submittingRef.current = true;
    setLoading(true);
    setError('');
    
    try {
      const result = await unsubscribeFromNewsletter(email);
      
      if (result.success) {
        setSuccess(true);
      } else {
        setError(locale === 'ro' ? 'A apărut o eroare. Te rugăm să încerci din nou.' : 'An error occurred. Please try again.');
      }
    } catch {
      setError(locale === 'ro' ? 'A apărut o eroare. Te rugăm să încerci din nou.' : 'An error occurred. Please try again.');
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const isEn = locale === 'en';

  if (success) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-100">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-4">
            {isEn ? "Successfully Unsubscribed" : "Dezabonare cu succes"}
          </h1>
          <p className="text-slate-500 mb-8 font-medium">
            {isEn 
              ? "You will no longer receive marketing emails from TrenZone." 
              : "Nu vei mai primi mesaje promoționale de la TrenZone."}
          </p>
          <a 
            href={`/${locale}`}
            className="inline-block bg-slate-900 text-white font-bold py-3 px-8 rounded-xl hover:bg-slate-800 active:scale-[0.98] transition-all cursor-pointer"
          >
            {isEn ? "Return to Homepage" : "Întoarce-te pe site"}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-100">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <MailX className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-4">
          {isEn ? "Unsubscribe from Emails" : "Dezabonare E-mailuri"}
        </h1>
        <p className="text-slate-500 mb-8 font-medium">
          {isEn 
            ? "Enter your email address below to stop receiving marketing communications from TrenZone." 
            : "Introdu adresa ta de e-mail mai jos pentru a nu mai primi comunicări de marketing de la TrenZone."}
        </p>
        
        <form onSubmit={handleUnsubscribe} className="space-y-4">
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={isEn ? "Your email address" : "Adresa ta de e-mail"}
            required
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium text-center"
          />
          
          {error && <p className="text-red-500 text-sm font-bold">{error}</p>}
          
          <button 
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full bg-red-500 text-white font-bold py-3 px-8 rounded-xl hover:bg-red-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>{isEn ? "Processing..." : "Se procesează..."}</span>
              </>
            ) : (
              <span>{isEn ? "Confirm Unsubscribe" : "Confirmă Dezabonarea"}</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function UnsubscribeSkeleton() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-100 space-y-5">
        <div className="w-16 h-16 bg-red-50 rounded-full mx-auto animate-pulse" />
        <div className="h-7 w-52 mx-auto rounded-xl bg-slate-200 animate-pulse" />
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-slate-100 animate-pulse" />
          <div className="h-4 w-4/5 mx-auto rounded bg-slate-100 animate-pulse" />
        </div>
        <div className="space-y-4 pt-2">
          <div className="h-12 w-full rounded-xl bg-slate-100 border border-slate-200/70 animate-pulse" />
          <div className="h-12 w-full rounded-xl bg-red-500/35 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<UnsubscribeSkeleton />}>
      <UnsubscribeContent />
    </Suspense>
  );
}
