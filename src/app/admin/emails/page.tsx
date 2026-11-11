'use client';

import { useState, useEffect } from 'react';
import { Mail, Save, RefreshCw, Eye, Code, Languages, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { updateEmailTemplate, EmailTemplate as DBEmailTemplate } from '@/app/actions/email-templates';
import { updateSiteSetting } from '@/app/actions/settings';
import toast from 'react-hot-toast';

// Componente React pentru Preview
import { WelcomeDiscountEmail } from '@/components/email/WelcomeDiscountEmail';
import { ReviewEmailTemplate } from '@/components/email/ReviewEmailTemplate';
import { EmailTemplate } from '@/components/email/EmailTemplate';
import { AwbEmailTemplate } from '@/components/email/AwbEmailTemplate';
import { AbandonedCartEmail } from '@/components/email/AbandonedCartEmail';
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
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [previewItemCount, setPreviewItemCount] = useState<1 | 2>(1);
  const [editedTemplate, setEditedTemplate] = useState<Partial<DBEmailTemplate>>({});

  const [activeCoupons, setActiveCoupons] = useState<any[]>([]);
  const [selectedWelcomeCoupon, setSelectedWelcomeCoupon] = useState<string>('');
  const [selectedAbandoned72hCoupon, setSelectedAbandoned72hCoupon] = useState<string>('');

  useEffect(() => {
    fetchTemplates();
  }, []);

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
    
    // Mock items: 1 produs sau produse multiple
    const mockItems = previewItemCount === 1 
      ? [
          { 
            name: 'X10 Elbow Wraps — Purple', 
            image: `${localOrigin}/images/products/x10_elbow_wraps_purple_1.webp`, 
            slug: 'x10-elbow-wraps',
            quantity: 1,
            price: '124.50'
          }
        ]
      : [
          { 
            name: 'X10 Elbow Wraps — Purple', 
            image: `${localOrigin}/images/products/x10_elbow_wraps_purple_1.webp`, 
            slug: 'x10-elbow-wraps',
            quantity: 1,
            price: '124.50'
          },
          { 
            name: 'X5 Elbow Wraps — Red', 
            image: `${localOrigin}/images/products/x5_elbow_wraps_red_1.webp`, 
            slug: 'x5-elbow-wraps',
            quantity: 1,
            price: '129.00'
          }
        ];

    const mockOrder = {
      id: 'TZ-123',
      customerName: 'Alexandru',
      items: mockItems,
      totalAmount: previewItemCount === 2 ? '253.50' : '124.50'
    };
    
    const mockUpsell = [
      {
        name: { ro: 'X10 Wrist Wraps', en: 'X10 Wrist Wraps' },
        price: 299.99,
        slug: 'x10-wrist-wraps',
        image: '/images/products/trenzone_wristwraps_default.webp'
      },
      {
        name: { ro: 'Tricou Oversized', en: 'Oversized T-Shirt' },
        price: 239.99,
        slug: 'tricou-trenzone',
        image: '/images/products/trenzone_tshirt_default.webp'
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
          templateData={editedTemplate as any} 
          baseUrl={previewBaseUrl} 
          upsellProducts={mockUpsell} 
          isPreorder={false} 
        />
      );
    } else if (selectedId === 'preorder-confirmation') {
      const preorderItems = previewItemCount === 2 
        ? [
            { name: 'X10 Elbow Wraps — White (Precomandă)', price: '249.00', quantity: 1, image: `${localOrigin}/images/products/x10_elbow_wraps_white_1.webp`, slug: 'x10-elbow-wraps' },
            { name: 'X5 Elbow Wraps — Red (Precomandă)', price: '219.00', quantity: 1, image: `${localOrigin}/images/products/x5_elbow_wraps_red_1.webp`, slug: 'x5-elbow-wraps' }
          ] 
        : [
            { name: 'X10 Elbow Wraps — White (Precomandă)', price: '249.00', quantity: 1, image: `${localOrigin}/images/products/x10_elbow_wraps_white_1.webp`, slug: 'x10-elbow-wraps' }
          ];

      contentToRender = (
        <EmailTemplate 
          orderId="TZ-2026-PRE" 
          customerName={mockOrder.customerName} 
          totalAmount={previewItemCount === 2 ? '468.00' : '249.00'} 
          items={preorderItems} 
          locale={lang} 
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
          cartUrl={`${localOrigin}/${lang}/checkout`} 
          templateData={editedTemplate as any} 
          baseUrl={previewBaseUrl} 
          userEmail="test@exemplu.ro" 
          couponCode={cCode} 
          couponValue={cValue} 
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
            body { margin: 0; padding: 0; background: #fff; }
            .scale-wrapper {
              width: 600px;
              margin: 0 auto;
            }
            @media (max-width: 600px) {
              .scale-wrapper {
                transform: scale(calc(100vw / 600));
                transform-origin: top left;
                width: 100%;
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
          className="w-full h-[800px] border-0" 
          sandbox="allow-same-origin allow-scripts"
        />
      </div>
    );
  };

  if (loading) {
    return <div className="p-8 text-slate-500 animate-pulse font-bold">Se încarcă template-urile...</div>;
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Mail className="text-[#e32f8c]" size={28} />
            E-mailuri Automate
          </h1>
          <p className="text-slate-500 mt-1.5 text-sm font-medium">Gestionează textele și traducerile pentru notificările trimise clienților TrenZone.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
        {/* Sidebar Templates */}
        <div className="lg:col-span-1 space-y-2">
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
        <div className="lg:col-span-3 bg-white rounded-3xl p-5 sm:p-8 shadow-sm border border-slate-200/70 min-h-[600px] flex flex-col">
          
          {selectedTemplate && (
            <>
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Language switch */}
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button 
                      onClick={() => setLang('ro')} 
                      className={`px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                        lang === 'ro' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Română
                    </button>
                    <button 
                      onClick={() => setLang('en')} 
                      className={`px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                        lang === 'en' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Engleză
                    </button>
                  </div>

                  {/* Multi-product simulator switcher (shown in Preview mode or review/order templates) */}
                  {viewMode === 'preview' && (
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-2 pr-1">Coș test:</span>
                      <button
                        type="button"
                        onClick={() => setPreviewItemCount(1)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          previewItemCount === 1 ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        1 Produs
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewItemCount(2)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          previewItemCount === 2 ? 'bg-[#e32f8c] text-white shadow-xs' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        2 Produse (Multi-produs)
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button 
                      onClick={() => setViewMode('edit')} 
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                        viewMode === 'edit' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <Code size={15}/> Edit
                    </button>
                    <button 
                      onClick={() => setViewMode('preview')} 
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                        viewMode === 'preview' ? 'bg-white text-[#e32f8c] shadow-xs' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <Eye size={15}/> Preview
                    </button>
                  </div>
                  <button 
                    onClick={handleSave} 
                    disabled={saving} 
                    className="flex items-center gap-2 bg-[#e32f8c] hover:bg-[#c41a72] text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md shadow-[#e32f8c]/20 active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                    <span>{saving ? 'Se salvează...' : 'Salvează'}</span>
                  </button>
                </div>
              </div>

              {/* Editor Fields */}
              {viewMode === 'edit' ? (
                <div className="space-y-6 flex-1">
                  
                  {/* Dynamic Tags Helper */}
                  <div className="bg-slate-50 rounded-2xl p-3.5 sm:p-4 border border-slate-100 flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold text-slate-500">Variabile disponibile (apasă pentru a insera în corp):</span>
                    <button 
                      type="button" 
                      onClick={() => insertVariable(lang === 'ro' ? 'body_ro' : 'body_en', '{{name}}')}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg font-mono font-bold text-slate-700 cursor-pointer transition-colors"
                    >
                      {`{{name}}`} (Nume client)
                    </button>
                    <button 
                      type="button" 
                      onClick={() => insertVariable(lang === 'ro' ? 'body_ro' : 'body_en', '{{id}}')}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg font-mono font-bold text-slate-700 cursor-pointer transition-colors"
                    >
                      {`{{id}}`} (ID Comandă)
                    </button>
                    {(selectedId?.includes('abandoned') || selectedId?.includes('discount')) && (
                      <>
                        <button 
                          type="button" 
                          onClick={() => insertVariable(lang === 'ro' ? 'body_ro' : 'body_en', '{{coupon}}')}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg font-mono font-bold text-slate-700 cursor-pointer transition-colors"
                        >
                          {`{{coupon}}`} (Cod Cupon)
                        </button>
                        <button 
                          type="button" 
                          onClick={() => insertVariable(lang === 'ro' ? 'body_ro' : 'body_en', '{{value}}')}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg font-mono font-bold text-slate-700 cursor-pointer transition-colors"
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
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e32f8c]/50 font-medium text-sm text-slate-900"
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
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e32f8c]/50 font-medium text-sm text-slate-900"
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
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e32f8c]/50 font-medium text-sm text-slate-900 resize-none leading-relaxed"
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
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e32f8c]/50 font-medium text-sm text-slate-900"
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
                <div className="flex-1 bg-slate-50 rounded-2xl p-4 overflow-hidden relative">
                   <div className="absolute top-2 right-4 text-xs font-bold text-slate-400 bg-white px-2 py-1 rounded shadow-xs border border-slate-100 z-10">
                     Live Preview ({lang.toUpperCase()}) • {previewItemCount === 1 ? '1 Produs' : '2 Produse'}
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
