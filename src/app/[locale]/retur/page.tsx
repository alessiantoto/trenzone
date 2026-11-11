'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { submitReturnRequest } from '@/app/actions/returns';
import { CheckCircle, AlertCircle, ArrowLeft, RefreshCw, ShieldCheck, Mail, Clock } from 'lucide-react';
import Link from 'next/link';

export default function ReturPage() {
  const locale = useLocale();
  const isEn = locale === 'en';

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ibanValue, setIbanValue] = useState('');
  const [loadedAt, setLoadedAt] = useState<number>(0);
  const [honeypot, setHoneypot] = useState('');

  const [submittedData, setSubmittedData] = useState<{
    orderId: string;
    email: string;
    iban: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    setLoadedAt(Date.now());
  }, []);

  useEffect(() => {
    if (success) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [success]);

  const handleIbanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Keep only alphanumeric, force uppercase, max 34 chars (International IBAN ISO standard)
    const raw = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 34);
    // Format into 4-char chunks
    const formatted = raw.match(/.{1,4}/g)?.join(' ') || raw;
    setIbanValue(formatted);
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const cleanIban = ibanValue.replace(/\s+/g, '').toUpperCase();

    // Client-side IBAN check (ISO standard: 2 letters, 2 digits, 11-30 alphanumeric chars, total 15-34)
    const ibanRegex = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/;
    if (!ibanRegex.test(cleanIban)) {
      setError(
        isEn
          ? 'The entered IBAN account is not valid. Please ensure it begins with a country code (e.g. RO, LT, DE) and has between 15 and 34 characters.'
          : 'Contul IBAN introdus nu este valid. Asigură-te că începe cu codul de țară (ex: RO, LT, DE) și are între 15 și 34 de caractere.'
      );
      return;
    }

    setLoading(true);

    const rawOrderId = ((formData.get('order_id') as string) || '').trim();
    const rawEmail = ((formData.get('customer_email') as string) || '').trim();
    const rawName = ((formData.get('customer_name') as string) || '').trim();

    // Overwrite iban with cleaned value and set locale
    formData.set('iban', cleanIban);
    formData.set('locale', locale || 'ro');

    const res = await submitReturnRequest(formData);

    if (res.success) {
      setSubmittedData({
        orderId: rawOrderId.toUpperCase(),
        email: rawEmail.toLowerCase(),
        iban: cleanIban,
        name: rawName
      });
      setSuccess(true);
    } else {
      setError(
        res.error || (isEn ? 'An error occurred while submitting your request.' : 'A apărut o eroare la trimiterea cererii.')
      );
    }
    setLoading(false);
  }

  const homeHref = isEn ? '/en' : '/ro';
  const returnPolicyHref = isEn ? '/en/politica-de-retur' : '/ro/politica-de-retur';

  if (success) {
    return (
      <div className="min-h-[85vh] bg-slate-50/70 py-8 sm:py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-2xl mx-auto space-y-5">
          {/* Top back navigation */}
          <Link 
            href={homeHref} 
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={16} /> {isEn ? 'Back to store' : 'Înapoi la magazin'}
          </Link>

          {/* Main Success Container */}
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
            {/* Dark Hero Brand Header */}
            <div className="px-6 sm:px-8 py-8 bg-black text-white relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-48 h-48 bg-[#e32f8c]/20 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-14 h-14 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl flex items-center justify-center shrink-0">
                  <CheckCircle className="text-emerald-400" size={30} />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-1.5">
                    {isEn ? 'Request Registered' : 'Înregistrat cu succes'}
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {isEn ? 'Return Request Submitted' : 'Cerere de Retur Înregistrată'}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1">
                    {isEn 
                      ? 'We have received your request. The TrenZone team will review your order details and contact you via email shortly.' 
                      : 'Am primit solicitarea ta. Echipa TrenZone va analiza detaliile cererii de retur și te va contacta pe email în cel mai scurt timp.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Submitted Summary Details Box */}
            <div className="p-6 sm:p-8 space-y-6">
              {submittedData && (
                <div className="bg-slate-50/90 rounded-2xl border border-slate-200/80 p-4 sm:p-5">
                  <h3 className="text-[11px] font-black uppercase text-slate-400 tracking-wider mb-3">
                    {isEn ? 'Request Summary' : 'Rezumat Solicitare'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs sm:text-sm">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] font-medium text-slate-500">{isEn ? 'Order Number' : 'Număr Comandă'}</span>
                      <span className="font-mono font-black text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 w-fit text-xs sm:text-sm">
                        {submittedData.orderId}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] font-medium text-slate-500">{isEn ? 'Email Address' : 'Adresă Email'}</span>
                      <span className="font-bold text-slate-800 break-all">{submittedData.email}</span>
                    </div>
                    {submittedData.name && (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] font-medium text-slate-500">{isEn ? 'Customer Name' : 'Nume Client'}</span>
                        <span className="font-bold text-slate-800">{submittedData.name}</span>
                      </div>
                    )}
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] font-medium text-slate-500">{isEn ? 'Refund IBAN' : 'Cont IBAN Rambursare'}</span>
                      <span className="font-mono font-black text-slate-900 tracking-wider text-xs">
                        {submittedData.iban}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* What happens next (Următorii Pași - Analiză & Contactare) */}
              <div className="space-y-3">
                <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                  <Clock size={16} className="text-[#e32f8c]" />
                  {isEn ? 'What happens next?' : 'Ce se întâmplă în continuare?'}
                </h3>
                <div className="grid grid-cols-1 gap-2.5">
                  <div className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-100 bg-slate-50/50">
                    <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                        {isEn ? 'Reviewing your return request' : 'Analizarea cererii de către echipă'}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        {isEn 
                          ? 'Our team will verify your order data and product eligibility in accordance with TrenZone return policy.' 
                          : 'Echipa noastră verifică datele comenzii și condițiile de eligibilitate conform politicii de retur TrenZone.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-100 bg-slate-50/50">
                    <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                        {isEn ? 'We will contact you via email' : 'Te vom contacta pe email'}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        {isEn 
                          ? 'You will receive an email update regarding request approval and any required next steps (no courier is dispatched automatically prior to review).' 
                          : 'Vei primi un email de la noi cu privire la aprobarea cererii și instrucțiunile specifice (nu se trimite automat curier până la confirmare).'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-100 bg-slate-50/50">
                    <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-800 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                        {isEn ? 'Refund to specified IBAN' : 'Rambursarea sumei în contul IBAN'}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        {isEn 
                          ? 'Upon acceptance and verification of returned items in original condition, the refund is transferred to your provided bank account.' 
                          : 'Dacă cererea este aprobată și produsele sunt recepționate în starea lor inițială, suma va fi transferată direct în contul IBAN specificat.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <Link 
                  href={homeHref} 
                  className="w-full sm:flex-1 py-3.5 px-6 bg-black text-white text-center font-black text-sm rounded-xl hover:bg-[#e32f8c] active:scale-98 transition-all shadow-md shadow-black/10 cursor-pointer"
                >
                  {isEn ? 'Back to Store' : 'Înapoi la Magazin'}
                </Link>
                <Link
                  href={returnPolicyHref}
                  className="w-full sm:w-auto py-3.5 px-6 bg-slate-100 text-slate-700 hover:bg-slate-200 text-center font-bold text-sm rounded-xl transition-all cursor-pointer"
                >
                  {isEn ? 'Return Policy' : 'Politica de Retur'}
                </Link>
              </div>

              {/* Need help note */}
              <p className="text-[11px] text-center text-slate-400 pt-1">
                {isEn ? 'Need help or have questions? Contact us anytime at ' : 'Ai nevoie de asistență? Ne poți contacta oricând la '}
                <a href="mailto:trenzone483@gmail.com" className="underline font-bold text-slate-600 hover:text-[#009bb3]">
                  trenzone483@gmail.com
                </a>.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] bg-slate-50/70 py-6 sm:py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-5">
        <Link 
          href={homeHref} 
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={16} /> {isEn ? 'Back to store' : 'Înapoi la magazin'}
        </Link>
        
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="px-6 sm:px-8 py-8 sm:py-10 bg-black text-white">
            <h1 className="text-2xl sm:text-3xl font-black mb-2 flex items-center gap-3">
              <RefreshCw size={26} className="text-[#e32f8c] shrink-0" />
              {isEn ? 'Withdrawal & Return Form' : 'Formular de Retragere'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {isEn 
                ? 'Fill out the form below to submit a return request. Refunds will be processed to the specified IBAN account in accordance with applicable consumer protection regulations.' 
                : 'Completează formularul de mai jos pentru a iniția returnarea unuia sau mai multor produse. Banii vor fi rambursați în contul IBAN specificat, conform legislației în vigoare.'}
            </p>
          </div>

          <div className="p-6 sm:p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-in fade-in">
                <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                <p className="text-sm font-bold text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
              {/* 🛡️ Anti-Bot Honeypot (Invisible to real humans) */}
              <div className="sr-only" style={{ display: 'none', position: 'absolute', left: '-9999px', opacity: 0, height: 0, width: 0, pointerEvents: 'none' }} aria-hidden="true">
                <label htmlFor="company_name">Company Name</label>
                <input 
                  type="text" 
                  id="company_name" 
                  name="company_name" 
                  tabIndex={-1} 
                  autoComplete="off" 
                  value={honeypot} 
                  onChange={(e) => setHoneypot(e.target.value)} 
                />
                <input 
                  type="hidden" 
                  name="form_loaded_at" 
                  value={loadedAt} 
                />
              </div>

              {/* Order Number & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-bold text-slate-700">
                    {isEn ? 'Order Number' : 'Număr Comandă'} <span className="text-red-500">*</span>
                  </label>
                  <input 
                    name="order_id" 
                    type="text" 
                    required 
                    placeholder="ex: TZ-2026-9003"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#e32f8c]/50 font-mono font-bold text-slate-900 bg-slate-50 uppercase text-sm" 
                  />
                  <p className="text-[11px] text-slate-400">
                    {isEn 
                      ? 'Found in your order confirmation email or invoice (e.g. TZ-2026-9003).' 
                      : 'Găsești numărul comenzii în emailul de confirmare a comenzii sau pe factură.'}
                  </p>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-bold text-slate-700">
                    {isEn ? 'Email Address' : 'Adresa de Email'} <span className="text-red-500">*</span>
                  </label>
                  <input 
                    name="customer_email" 
                    type="email" 
                    required 
                    placeholder={isEn ? 'email used for order' : 'email-ul de pe comandă'}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#e32f8c]/50 font-medium text-slate-900 bg-slate-50 text-sm" 
                  />
                  <p className="text-[11px] text-slate-400">
                    {isEn 
                      ? 'Must match the email address associated with your order.' 
                      : 'Trebuie să coincidă cu adresa de email folosită la comandă.'}
                  </p>
                </div>
              </div>

              {/* Customer Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-bold text-slate-700">
                    {isEn ? 'Full Name' : 'Nume Complet'} <span className="text-red-500">*</span>
                  </label>
                  <input 
                    name="customer_name" 
                    type="text" 
                    required 
                    placeholder={isEn ? 'e.g. John Doe' : 'ex: Andrei Popescu'}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#e32f8c]/50 font-medium text-slate-900 bg-slate-50 text-sm" 
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-bold text-slate-700">
                    {isEn ? 'Phone Number' : 'Telefon'}
                  </label>
                  <input 
                    name="customer_phone" 
                    type="tel" 
                    placeholder={isEn ? '+40... or international' : '07xxxxxxxx'}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#e32f8c]/50 font-medium text-slate-900 bg-slate-50 text-sm" 
                  />
                </div>
              </div>

              {/* IBAN Account */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-bold text-slate-700">
                    {isEn ? 'IBAN Account (for refund)' : 'Cont IBAN (pentru rambursare)'} <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                    <ShieldCheck size={12} className="text-emerald-500" /> 
                    {isEn ? 'Secured SEPA / IBAN' : 'Securizat SEPA / IBAN'}
                  </span>
                </div>
                <input 
                  name="iban" 
                  type="text" 
                  required 
                  value={ibanValue}
                  onChange={handleIbanChange}
                  placeholder={isEn ? 'e.g. ROXX XXXX... or LTXX XXXX... / Revolut' : 'ex: RO49AAAA1B31007593840000'}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#e32f8c]/50 font-bold text-slate-900 bg-slate-50 font-mono tracking-wider sm:tracking-widest uppercase text-sm sm:text-base" 
                />
                <p className="text-[11px] text-slate-400">
                  {isEn 
                    ? 'Bank account (domestic or international / Revolut / SEPA) for receiving your refund.' 
                    : 'Contul bancar (românesc sau internațional / Revolut) în care dorești restituirea contravalorii.'}
                </p>
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-bold text-slate-700">
                  {isEn ? 'Return Reason (Optional)' : 'Motivul Returului (Opțional)'}
                </label>
                <textarea 
                  name="reason" 
                  rows={4}
                  placeholder={
                    isEn 
                      ? 'Please let us know how we can improve or the reason for returning...' 
                      : 'Te rugăm să ne ajuți să devenim mai buni lăsându-ne un motiv...'
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#e32f8c]/50 font-medium text-slate-900 bg-slate-50 resize-none text-sm" 
                />
              </div>
              
              <div className="pt-3 border-t border-slate-100">
                <button 
                  type="submit" 
                  disabled={loading}
                  className={`w-full py-4 bg-black text-white font-black text-base sm:text-lg rounded-xl shadow-lg shadow-black/10 transition-all ${
                    loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#e32f8c] hover:shadow-[#e32f8c]/20 hover:-translate-y-0.5'
                  }`}
                >
                  {loading 
                    ? (isEn ? 'Verifying & Submitting...' : 'Se verifică și se trimite...') 
                    : (isEn ? 'Submit Return Request' : 'Trimite Cererea de Retur')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
