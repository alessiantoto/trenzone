'use client';

import { useState, useEffect } from 'react';
import { Mail, Save, RefreshCw, Eye, Code, Languages, ChevronDown, Paperclip, CheckCircle2, ExternalLink, FileText, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { updateEmailTemplate, EmailTemplate as DBEmailTemplate } from '@/app/actions/email-templates';
import { LanguageFlagSvg } from '@/components/programs/LanguageFlagSvg';
import { getProgramFilesAction, removeProgramPdfSlotAction, type AdminProgramPdfSlot } from '@/app/actions/programs';
import { uploadAdminProgramPdf } from '@/lib/admin-pdf-upload';
import { extractProgramPdfDisplayName } from '@/lib/program-pdf-display';
import type { ProgramFileSlot, StoredProgramFiles } from '@/lib/program-pdf-generator';
import { updateSiteSetting } from '@/app/actions/settings';
import toast from 'react-hot-toast';

// Componente React pentru Preview
import { WelcomeDiscountEmail } from '@/components/email/WelcomeDiscountEmail';
import { ReviewEmailTemplate } from '@/components/email/ReviewEmailTemplate';
import { EmailTemplate } from '@/components/email/EmailTemplate';
import { AwbEmailTemplate } from '@/components/email/AwbEmailTemplate';
import { AbandonedCartEmail } from '@/components/email/AbandonedCartEmail';
import { ProgramDeliveryEmail } from '@/components/email/ProgramDeliveryEmail';
import { getProductPrice } from '@/utils/pricing';
import { renderToStaticMarkup } from 'react-dom/server';

function CustomSelect({ value, onChange, options, placeholder }: { value: string, onChange: (val: string) => void, options: {value: string, label: string}[], placeholder: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:border-[#e32f8c]/50 focus:outline-none focus:ring-2 focus:ring-[#e32f8c]/20 transition-all text-left"
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden"
          >
            <div className="max-h-60 overflow-y-auto p-1">
              {options.length === 0 ? (
                <div className="px-4 py-3 text-sm text-slate-500">Nu s-au găsit opțiuni.</div>
              ) : (
                options.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { onChange(opt.value); setIsOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-bold rounded-lg transition-colors ${value === opt.value ? 'bg-[#e32f8c]/10 text-[#e32f8c]' : 'text-slate-700 hover:bg-slate-50'}`}
                  >
                    {opt.label}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AdminEmailsPage() {
  const [templates, setTemplates] = useState<DBEmailTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lang, setLang] = useState<'ro' | 'en'>('ro');
  const [previewCurrency, setPreviewCurrency] = useState<'RON' | 'EUR' | 'USD' | 'GBP'>('RON');
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [previewItemCount, setPreviewItemCount] = useState<1 | 2>(1);
  const [editedTemplate, setEditedTemplate] = useState<Partial<DBEmailTemplate>>({});

  const [activeCoupons, setActiveCoupons] = useState<any[]>([]);
  const [selectedWelcomeCoupon, setSelectedWelcomeCoupon] = useState<string>('');
  const [selectedAbandoned72hCoupon, setSelectedAbandoned72hCoupon] = useState<string>('');
  const [programFiles, setProgramFiles] = useState<StoredProgramFiles>({});
  const [programSlots, setProgramSlots] = useState<AdminProgramPdfSlot[]>([
    { slot: 'food-plan-en', label: 'Food Plan — English (PDF)', programTitle: 'Food Plan', lang: 'en' },
    { slot: 'food-plan-ro', label: 'Food Plan — Română (PDF)', programTitle: 'Food Plan', lang: 'ro' },
    { slot: 'training-program-en', label: 'Training Program — English (PDF)', programTitle: 'Training Program', lang: 'en' },
    { slot: 'training-program-ro', label: 'Training Program — Română (PDF)', programTitle: 'Training Program', lang: 'ro' },
    { slot: 'bench-program-en', label: 'Bench Program — English (PDF)', programTitle: 'Bench Program', lang: 'en' },
    { slot: 'bench-program-ro', label: 'Bench Program — Română (PDF)', programTitle: 'Bench Program', lang: 'ro' },
  ]);
  const [uploadingSlot, setUploadingSlot] = useState<ProgramFileSlot | null>(null);

  useEffect(() => {
    fetchTemplates();
    getProgramFilesAction()
      .then((res) => {
        if (res.success && res.files) setProgramFiles(res.files);
        if (res.success && Array.isArray(res.slots) && res.slots.length > 0) {
          setProgramSlots(res.slots);
        }
      })
      .catch(() => {});
  }, []);

  const handleUploadProgramPdf = async (slot: ProgramFileSlot, file: File | null) => {
    if (!file) return;
    setUploadingSlot(slot);
    try {
      const res = await uploadAdminProgramPdf(slot, file);
      const uploadedUrl = res.url;
      if (res.success && uploadedUrl) {
        setProgramFiles((prev) => ({ ...prev, [slot]: uploadedUrl }));
        toast.success('Fișierul PDF a fost atașat cu succes!');
      } else {
        toast.error(res.error || 'Eroare la încărcarea PDF-ului.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Eroare la încărcarea PDF-ului.');
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleRemoveProgramPdf = async (slot: ProgramFileSlot) => {
    setUploadingSlot(slot);
    try {
      const res = await removeProgramPdfSlotAction(slot);
      if (res.success) {
        setProgramFiles((prev) => {
          const next = { ...prev };
          delete next[slot];
          return next;
        });
        toast.success('PDF-ul a fost șters complet!');
      } else {
        toast.error(res.error || 'Nu s-a putut șterge PDF-ul.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Eroare la ștergere.');
    } finally {
      setUploadingSlot(null);
    }
  };

  const fetchTemplates = async () => {
    setLoading(true);
    const [data, coupons, welcomeSetting, abandoned72hSetting] = await Promise.all([
      fetch('/api/admin/data?action=email-templates').then(r => r.json()).then(j => j.data),
      fetch('/api/admin/data?action=coupons').then(r => r.json()).then(j => j.data),
      fetch('/api/admin/data?action=site-setting&key=welcome_email_coupon').then(r => r.json()).then(j => j.data),
      fetch('/api/admin/data?action=site-setting&key=abandoned_72h_coupon').then(r => r.json()).then(j => j.data)
    ]);
    
    setTemplates(data || []);
    setActiveCoupons((coupons || []).filter((c: any) => c.is_active && !c.code.startsWith('SCRATCH-') && !c.code.startsWith('AFF-') && !c.code.startsWith('REVIEW')));
    if (welcomeSetting) setSelectedWelcomeCoupon(welcomeSetting);
    if (abandoned72hSetting) setSelectedAbandoned72hCoupon(abandoned72hSetting);

    if (data && data.length > 0 && !selectedId) {
      setSelectedId(data[0].id);
      setEditedTemplate(data[0]);
    }
    setLoading(false);
  };

  const handleSelect = (tmpl: DBEmailTemplate) => {
    setSelectedId(tmpl.id);
    setEditedTemplate(tmpl);
    setViewMode('edit');
  };

  const handleChange = (field: keyof DBEmailTemplate, value: string) => {
    setEditedTemplate(prev => ({ ...prev, [field]: value }));
  };

  const insertVariable = (field: keyof DBEmailTemplate, tag: string) => {
    setEditedTemplate(prev => ({
      ...prev,
      [field]: (prev[field] || '') + tag
    }));
  };

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await updateEmailTemplate(selectedId, editedTemplate);
      if (selectedId === 'welcome-discount' && selectedWelcomeCoupon) {
        await updateSiteSetting('welcome_email_coupon', selectedWelcomeCoupon);
      }
      if (selectedId === 'abandoned_72h' && selectedAbandoned72hCoupon) {
        await updateSiteSetting('abandoned_72h_coupon', selectedAbandoned72hCoupon);
      }
      toast.success('Template salvat cu succes!');
      setTemplates(prev => prev.map(t => t.id === selectedId ? { ...t, ...editedTemplate } : t));
    } catch (err: any) {
      toast.error('Eroare la salvare: ' + (err?.message || 'Necunoscută'));
    } finally {
      setSaving(false);
    }
  };

  const selectedTemplate = templates.find(t => t.id === selectedId);

  // Funcție de mock pentru preview
  const renderPreview = () => {
    if (!selectedId || !editedTemplate) return null;

    const localOrigin = typeof window !== 'undefined' ? window.location.origin : "https://www.trenzone.fit";
    
    // Mock items: 1 produs sau produse multiple (converted to selected previewCurrency)
    const item1Price = getProductPrice(124.50, previewCurrency);
    const item2Price = getProductPrice(129.00, previewCurrency);
    const mockItems = previewItemCount === 1 
      ? [
          { 
            name: 'X10 Elbow Wraps — Purple', 
            image: `${localOrigin}/images/products/x10_elbow_wraps_purple.webp`, 
            slug: 'x10-elbow-wraps',
            quantity: 1,
            price: item1Price.toFixed(2)
          }
        ]
      : [
          { 
            name: 'X10 Elbow Wraps — Purple', 
            image: `${localOrigin}/images/products/x10_elbow_wraps_purple.webp`, 
            slug: 'x10-elbow-wraps',
            quantity: 1,
            price: item1Price.toFixed(2)
          },
          { 
            name: 'X5 Elbow Wraps — Red', 
            image: `${localOrigin}/images/products/x5_elbow_wraps_red_1.webp`, 
            slug: 'x5-elbow-wraps',
            quantity: 1,
            price: item2Price.toFixed(2)
          }
        ];

    const mockOrder = {
      id: 'TZ-123',
      customerName: 'Alexandru',
      items: mockItems,
      totalAmount: (previewItemCount === 2 ? item1Price + item2Price : item1Price).toFixed(2)
    };
    
    const mockUpsell = [
      {
        name: { ro: 'X10 Wrist Wraps', en: 'X10 Wrist Wraps' },
        price: 299.99,
        slug: 'x10-wrist-wraps',
        image: '/images/products/x10_wrist_wraps_purple.webp'
      },
      {
        name: { ro: 'TREN Oversized Tee', en: 'TREN Oversized Tee' },
        price: 239.99,
        slug: 'tricou-trenzone',
        image: '/images/products/shirt_stay_hard.webp'
      }
    ];

    // Pass empty baseUrl so layout images load relatively in the local Admin UI preview
    const previewBaseUrl = "";

    let contentToRender = null;

    if (selectedId === 'welcome-discount') {
      const selectedCouponObj = activeCoupons.find(c => c.code === selectedWelcomeCoupon) || { code: 'TRENZONE10', value: 10 };
      contentToRender = (
        <WelcomeDiscountEmail 
          customerName="Alexandru" 
          locale={lang} 
          templateData={editedTemplate as any} 
          baseUrl={previewBaseUrl} 
          couponCode={selectedCouponObj.code} 
          couponValue={selectedCouponObj.value} 
        />
      );
    } else if (selectedId === 'review-discount') {
      contentToRender = (
        <WelcomeDiscountEmail 
          customerName="Alexandru" 
          locale={lang} 
          templateData={editedTemplate as any} 
          baseUrl={previewBaseUrl} 
          couponCode="REVIEW10" 
          couponValue={10} 
          isReviewDiscount={true}
        />
      );
    } else if (selectedId === 'review-request') {
      contentToRender = (
        <ReviewEmailTemplate 
          orderId={mockOrder.id} 
          customerName={mockOrder.customerName} 
          items={mockOrder.items} 
          locale={lang} 
          templateData={editedTemplate as any} 
          baseUrl={previewBaseUrl} 
        />
      );
    } else if (selectedId === 'order-confirmation') {
      contentToRender = (
        <EmailTemplate 
          orderId={mockOrder.id} 
          customerName={mockOrder.customerName} 
          totalAmount={mockOrder.totalAmount} 
          items={mockOrder.items} 
          locale={lang} 
          currency={previewCurrency}
          templateData={editedTemplate as any} 
          baseUrl={previewBaseUrl} 
          upsellProducts={mockUpsell} 
          isPreorder={false} 
        />
      );
    } else if (selectedId === 'preorder-confirmation') {
      const pre1 = getProductPrice(249.00, previewCurrency);
      const pre2 = getProductPrice(219.00, previewCurrency);
      const preorderLabel = lang === 'en' ? 'Pre-order' : 'Precomandă';
      const preorderItems = previewItemCount === 2 
        ? [
            { name: `X10 Elbow Wraps — White (${preorderLabel})`, price: pre1.toFixed(2), quantity: 1, image: `${localOrigin}/images/products/x10_elbow_wraps_white.webp`, slug: 'x10-elbow-wraps' },
            { name: `X5 Elbow Wraps — Red (${preorderLabel})`, price: pre2.toFixed(2), quantity: 1, image: `${localOrigin}/images/products/x5_elbow_wraps_red_1.webp`, slug: 'x5-elbow-wraps' }
          ] 
        : [
            { name: `X10 Elbow Wraps — White (${preorderLabel})`, price: pre1.toFixed(2), quantity: 1, image: `${localOrigin}/images/products/x10_elbow_wraps_white.webp`, slug: 'x10-elbow-wraps' }
          ];

      contentToRender = (
        <EmailTemplate 
          orderId="TZ-2026-PRE" 
          customerName={mockOrder.customerName} 
          totalAmount={(previewItemCount === 2 ? pre1 + pre2 : pre1).toFixed(2)} 
          items={preorderItems} 
          locale={lang} 
          currency={previewCurrency}
          templateData={editedTemplate as any} 
          baseUrl={previewBaseUrl} 
          upsellProducts={mockUpsell} 
          isPreorder={true} 
        />
      );
    } else if (selectedId === 'awb-tracking') {
      contentToRender = (
        <AwbEmailTemplate 
          orderId={mockOrder.id} 
          customerName={mockOrder.customerName} 
          trackingNumber="AWB123456789" 
          courier="sameday" 
          locale={lang} 
          templateData={editedTemplate as any} 
          baseUrl={previewBaseUrl} 
        />
      );
    } else if (selectedId.startsWith('abandoned')) {
      const selected72hObj = activeCoupons.find(c => c.code === selectedAbandoned72hCoupon) || { code: 'TRENZONE5', value: 5 };
      const cCode = selectedId === 'abandoned_72h' ? selected72hObj.code : undefined;
      const cValue = selectedId === 'abandoned_72h' ? selected72hObj.value : undefined;
      contentToRender = (
        <AbandonedCartEmail 
          customerName={mockOrder.customerName} 
          items={mockOrder.items} 
          locale={lang} 
          currency={previewCurrency}
          cartUrl={`${localOrigin}/${lang}/checkout`} 
          templateData={editedTemplate as any} 
          baseUrl={previewBaseUrl} 
          userEmail="test@exemplu.ro" 
          couponCode={cCode} 
          couponValue={cValue} 
        />
      );
    } else if (selectedId === 'program-delivery' || selectedId === 'program-pending' || selectedId === 'program-marketing') {
      contentToRender = (
        <ProgramDeliveryEmail
          customerName={mockOrder.customerName}
          orderId={mockOrder.id}
          locale={lang}
          mode={selectedId === 'program-marketing' ? 'marketing' : selectedId === 'program-pending' ? 'pending' : 'delivery'}
          programsPageUrl={`${localOrigin}/${lang}/programs`}
          customContent={{
            heading: lang === 'en' ? editedTemplate.heading_en : editedTemplate.heading_ro,
            body_intro: lang === 'en' ? editedTemplate.body_en : editedTemplate.body_ro,
            cta_text: lang === 'en' ? editedTemplate.cta_en : editedTemplate.cta_ro,
          }}
        />
      );
    }

    if (!contentToRender) return null;

    const htmlContent = renderToStaticMarkup(contentToRender);

    const iframeHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { margin: 0; padding: 0; background: #fff; overflow-x: hidden; }
            .scale-wrapper {
              width: 600px;
              margin: 0 auto;
            }
            @media (max-width: 600px) {
              .scale-wrapper {
                transform: scale(calc(100vw / 600));
                transform-origin: top left;
                width: 600px;
              }
            }
          </style>
        </head>
        <body>
          <div class="scale-wrapper">
            ${htmlContent}
          </div>
        </body>
      </html>
    `;

    return (
      <div className="bg-slate-100 rounded-xl flex justify-center border border-slate-200 h-full overflow-hidden w-full relative">
        <iframe 
          srcDoc={iframeHtml} 
          className="w-full h-[520px] sm:h-[800px] border-0" 
          sandbox="allow-same-origin allow-scripts"
        />
      </div>
    );
  };

  if (loading) {
    return <div className="p-8 text-slate-500 animate-pulse font-bold">Se încarcă template-urile...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-300 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Mail className="text-[#e32f8c]" size={28} />
            E-mailuri Automate & Programe PDF
          </h1>
          <p className="text-slate-500 mt-1.5 text-sm font-medium">Gestionează textele emailurilor automate și atașează fișierele PDF pentru Food Plan și Bench Program.</p>
        </div>
      </div>

      {/* Panou Atașare PDF-uri Programe Digitale (RO / EN) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Paperclip className="text-[#a855f7]" size={20} />
              Atașează Fișierele PDF pentru Programele Digitale (EN & RO)
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Încarcă aici fișierele PDF pentru fiecare program și limbă (Engleză și Română). Clientul primește pe email exact PDF-ul limbii alese — iar la Pachetul 3 în 1 primește automat toate cele 3 programe incluse în limba aleasă.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {programSlots.map(({ slot, programTitle, lang: slotLang }) => {
            const attachedUrl = programFiles[slot];
            const isUploading = uploadingSlot === slot;
            const isEnglish = slotLang === 'en';
            return (
              <div
                key={slot}
                className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 mb-1 flex-wrap">
                    <FileText size={13} className="text-slate-500 shrink-0" />
                    <span>{programTitle}</span>
                    <span className="text-slate-300">—</span>
                    <LanguageFlagSvg isEnglish={isEnglish} className="w-[18px] h-[12px] shrink-0" />
                    <span>{isEnglish ? 'English (PDF)' : 'Română (PDF)'}</span>
                  </div>
                  {attachedUrl ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-emerald-600">
                        <span className="inline-flex items-center gap-1">
                          <CheckCircle2 size={13} />
                          <span>PDF Atașat</span>
                        </span>
                        <a
                          href={attachedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-slate-600 hover:text-slate-900 underline"
                        >
                          <span>Vezi PDF</span>
                          <ExternalLink size={11} />
                        </a>
                      </div>
                      <div
                        title={extractProgramPdfDisplayName(attachedUrl)}
                        className="text-[11px] font-mono font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1 truncate"
                      >
                        {extractProgramPdfDisplayName(attachedUrl)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] font-semibold text-amber-600">
                      Niciun PDF atașat încă
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex-1 min-h-[40px] py-2 px-3 rounded-xl bg-slate-900 hover:bg-[#e32f8c] text-white text-xs font-bold text-center cursor-pointer transition-colors flex items-center justify-center gap-1.5">
                    <Paperclip size={13} />
                    <span>
                      {isUploading
                        ? 'Se încarcă...'
                        : attachedUrl
                        ? 'Schimbă PDF-ul'
                        : 'Atașează PDF'}
                    </span>
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      disabled={isUploading}
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        if (f) handleUploadProgramPdf(slot, f);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  {attachedUrl && (
                    <button
                      type="button"
                      onClick={() => handleRemoveProgramPdf(slot)}
                      disabled={isUploading}
                      title="Șterge PDF-ul definitiv"
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center p-2 rounded-xl bg-white border border-red-200 hover:bg-red-50 text-red-600 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 lg:gap-8">
        {/* Mobile Template Horizontal Selector */}
        <div className="lg:hidden flex items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1 hide-scrollbar">
          {templates.map(tmpl => {
            const isSelected = selectedId === tmpl.id;
            return (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => handleSelect(tmpl)}
                className={`shrink-0 min-h-[44px] flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-[#e32f8c] text-white shadow-md shadow-[#e32f8c]/20'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Mail size={14} className="shrink-0" />
                <span>{tmpl.name}</span>
              </button>
            );
          })}
        </div>

        {/* Desktop Sidebar Templates */}
        <div className="hidden lg:block lg:col-span-1 space-y-2">
          {templates.map(tmpl => {
            const isSelected = selectedId === tmpl.id;
            return (
              <button
                key={tmpl.id}
                onClick={() => handleSelect(tmpl)}
                className={`w-full flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl text-left transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-[#e32f8c] text-white font-bold shadow-lg shadow-[#e32f8c]/20 scale-[1.01]' 
                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/70 hover:border-slate-300 font-semibold'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  <Mail size={16} />
                </div>
                <span className="text-xs sm:text-sm line-clamp-2 leading-tight">{tmpl.name}</span>
              </button>
            );
          })}
        </div>

        {/* Editor Area */}
        <div className="lg:col-span-3 min-w-0 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-sm border border-slate-200/70 min-h-[540px] sm:min-h-[600px] flex flex-col">
          
          {selectedTemplate && (
            <>
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-5 sm:mb-6 pb-5 sm:pb-6 border-b border-slate-100">
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  {/* Language switch */}
                  <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                    <button 
                      onClick={() => { setLang('ro'); setPreviewCurrency('RON'); }} 
                      className={`flex-1 sm:flex-none min-h-[40px] px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                        lang === 'ro' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Română
                    </button>
                    <button 
                      onClick={() => { setLang('en'); if (previewCurrency === 'RON') setPreviewCurrency('EUR'); }} 
                      className={`flex-1 sm:flex-none min-h-[40px] px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                        lang === 'en' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Engleză
                    </button>
                  </div>

                  {/* Preview currency switch */}
                  {viewMode === 'preview' && (
                    <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-2 pr-1">Monedă:</span>
                      {(['RON', 'EUR', 'USD', 'GBP'] as const).map((curr) => (
                        <button
                          key={curr}
                          type="button"
                          onClick={() => setPreviewCurrency(curr)}
                          className={`flex-1 sm:flex-none min-h-[38px] px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            previewCurrency === curr ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          {curr}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Multi-product simulator switcher (shown in Preview mode or review/order templates) */}
                  {viewMode === 'preview' && (
                    <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-2 pr-1">Coș test:</span>
                      <button
                        type="button"
                        onClick={() => setPreviewItemCount(1)}
                        className={`flex-1 sm:flex-none min-h-[38px] px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                          previewItemCount === 1 ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        1 Produs
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewItemCount(2)}
                        className={`flex-1 sm:flex-none min-h-[38px] px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                          previewItemCount === 2 ? 'bg-[#e32f8c] text-white shadow-xs' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        2 Produse
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="w-full sm:w-auto flex flex-wrap items-center justify-between sm:justify-end gap-2">
                  <div className="flex bg-slate-100 p-1 rounded-xl flex-1 sm:flex-none">
                    <button 
                      onClick={() => setViewMode('edit')} 
                      className={`flex-1 sm:flex-none min-h-[40px] flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                        viewMode === 'edit' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <Code size={15}/> Edit
                    </button>
                    <button 
                      onClick={() => setViewMode('preview')} 
                      className={`flex-1 sm:flex-none min-h-[40px] flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                        viewMode === 'preview' ? 'bg-white text-[#e32f8c] shadow-xs' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <Eye size={15}/> Preview
                    </button>
                  </div>
                  <button 
                    onClick={handleSave} 
                    disabled={saving} 
                    className="flex-1 sm:flex-none min-h-[44px] flex items-center justify-center gap-2 bg-[#e32f8c] hover:bg-[#c41a72] text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md shadow-[#e32f8c]/20 active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                    <span>{saving ? 'Se salvează...' : 'Salvează'}</span>
                  </button>
                </div>
              </div>

              {/* Editor Fields */}
              {viewMode === 'edit' ? (
                <div className="space-y-5 sm:space-y-6 flex-1">
                  
                  {/* Dynamic Tags Helper */}
                  <div className="bg-slate-50 rounded-2xl p-3.5 sm:p-4 border border-slate-100 flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold text-slate-500 w-full sm:w-auto">Variabile disponibile (apasă pentru a insera în corp):</span>
                    <button 
                      type="button" 
                      onClick={() => insertVariable(lang === 'ro' ? 'body_ro' : 'body_en', '{{name}}')}
                      className="min-h-[36px] px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg font-mono text-[11px] font-bold text-slate-700 cursor-pointer transition-colors whitespace-nowrap"
                    >
                      {`{{name}}`} (Nume client)
                    </button>
                    <button 
                      type="button" 
                      onClick={() => insertVariable(lang === 'ro' ? 'body_ro' : 'body_en', '{{id}}')}
                      className="min-h-[36px] px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg font-mono text-[11px] font-bold text-slate-700 cursor-pointer transition-colors whitespace-nowrap"
                    >
                      {`{{id}}`} (ID Comandă)
                    </button>
                    {(selectedId?.includes('abandoned') || selectedId?.includes('discount')) && (
                      <>
                        <button 
                          type="button" 
                          onClick={() => insertVariable(lang === 'ro' ? 'body_ro' : 'body_en', '{{coupon}}')}
                          className="min-h-[36px] px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg font-mono text-[11px] font-bold text-slate-700 cursor-pointer transition-colors whitespace-nowrap"
                        >
                          {`{{coupon}}`} (Cod Cupon)
                        </button>
                        <button 
                          type="button" 
                          onClick={() => insertVariable(lang === 'ro' ? 'body_ro' : 'body_en', '{{value}}')}
                          className="min-h-[36px] px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg font-mono text-[11px] font-bold text-slate-700 cursor-pointer transition-colors whitespace-nowrap"
                        >
                          {`{{value}}`} (Valoare % / RON)
                        </button>
                      </>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-2">
                      Subiect E-mail ({lang.toUpperCase()})
                    </label>
                    <input 
                      type="text" 
                      value={(lang === 'ro' ? editedTemplate.subject_ro : editedTemplate.subject_en) || ''} 
                      onChange={(e) => handleChange(lang === 'ro' ? 'subject_ro' : 'subject_en', e.target.value)}
                      className="w-full min-h-[44px] px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e32f8c]/50 font-medium text-base sm:text-sm text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-2">
                      Titlu Principal (Heading)
                    </label>
                    <input 
                      type="text" 
                      value={(lang === 'ro' ? editedTemplate.heading_ro : editedTemplate.heading_en) || ''} 
                      onChange={(e) => handleChange(lang === 'ro' ? 'heading_ro' : 'heading_en', e.target.value)}
                      className="w-full min-h-[44px] px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e32f8c]/50 font-medium text-base sm:text-sm text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-2">
                      Mesaj Principal (Body)
                    </label>
                    <textarea 
                      rows={6}
                      value={(lang === 'ro' ? editedTemplate.body_ro : editedTemplate.body_en) || ''} 
                      onChange={(e) => handleChange(lang === 'ro' ? 'body_ro' : 'body_en', e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e32f8c]/50 font-medium text-base sm:text-sm text-slate-900 resize-none leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">
                      Text Buton (CTA)
                    </label>
                    <p className="text-xs text-slate-400 mb-2">
                      {selectedId === 'review-request' 
                        ? 'Poți introduce textul butonului (ex: „LASĂ O RECENZIE”) sau scala completă stânga/dreapta separată prin | (ex: „Nu-mi place | Îl ador!”).'
                        : 'Textul afișat pe butonul principal de acțiune.'}
                    </p>
                    <input 
                      type="text" 
                      value={(lang === 'ro' ? editedTemplate.cta_ro : editedTemplate.cta_en) || ''} 
                      onChange={(e) => handleChange(lang === 'ro' ? 'cta_ro' : 'cta_en', e.target.value)}
                      placeholder="Ex: VEZI COMANDA"
                      className="w-full min-h-[44px] px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e32f8c]/50 font-medium text-base sm:text-sm text-slate-900"
                    />
                  </div>

                  {selectedId === 'welcome-discount' && (
                    <div className="pt-6 border-t border-slate-100">
                      <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-2">Cupon Reducere Atribuit (Welcome)</label>
                      <CustomSelect 
                        value={selectedWelcomeCoupon}
                        onChange={setSelectedWelcomeCoupon}
                        options={activeCoupons.map(c => ({
                          value: c.code, 
                          label: `${c.code} (${c.type === 'percentage' ? `${c.value}%` : `${c.value} RON`})`
                        }))}
                        placeholder="Selectează un cupon existent..."
                      />
                      <p className="text-xs text-slate-500 mt-2">Acest cupon va fi generat și trimis clienților care se abonează la newsletter.</p>
                    </div>
                  )}

                  {selectedId === 'abandoned_72h' && (
                    <div className="pt-6 border-t border-slate-100">
                      <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-2">Cupon Reducere Atribuit (Coș Abandonat)</label>
                      <CustomSelect 
                        value={selectedAbandoned72hCoupon}
                        onChange={setSelectedAbandoned72hCoupon}
                        options={activeCoupons.map(c => ({
                          value: c.code, 
                          label: `${c.code} (${c.type === 'percentage' ? `${c.value}%` : `${c.value} RON`})`
                        }))}
                        placeholder="Selectează un cupon existent..."
                      />
                      <p className="text-xs text-slate-500 mt-2">Folosește {'{{coupon}}'} și {'{{value}}'} în corpul mail-ului, iar noi le vom înlocui automat cu valoarea acestui cupon.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 bg-slate-50 rounded-2xl p-2 sm:p-4 overflow-hidden flex flex-col gap-2">
                   <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-1 text-[11px] font-bold text-slate-500">
                     <span>Live Preview ({lang.toUpperCase()})</span>
                     <span>{previewItemCount === 1 ? '1 Produs' : '2 Produse'} • {previewCurrency}</span>
                   </div>
                   {renderPreview()}
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
