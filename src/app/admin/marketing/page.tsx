"use client";

import { getOptimizedImageUrl } from '@/lib/utils/imageProxy';
import { useState, useEffect } from 'react';
import { Mail, Zap, Send, BarChart3, Users, Clock, Plus, Eye, Image as ImageIcon, Link as LinkIcon, Type, MousePointer2, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { sendMarketingCampaign } from '@/app/actions/admin-marketing';

import toast from 'react-hot-toast';

export default function MarketingPage() {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'editor'>('campaigns');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  // Editor State
  const [formData, setFormData] = useState({
    subject: '',
    title: 'Noutăți TrenZone 🏆',
    message: 'Salutare!\n\nAvem noutăți importante pentru tine...',
    ctaText: 'Vezi Oferta',
    ctaLink: 'https://www.trenzone.fit',
    imageUrl: 'https://www.trenzone.fit/images/products/x10_elbow_wraps_purple_1.webp',
    segment: 'subscribers' as 'subscribers' | 'customers' | 'test'
  });

  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const res = await fetch('/api/admin/data?action=broadcasts');
        const json = await res.json();
        const data = json.data;
        const mapped = data.map((c: any) => ({
          title: c.subject || 'Campanie fără titlu',
          status: 'sent',
          recipients: c.recipient_count || 0,
          openRate: '-', // Needs tracking implementation in the future
          date: new Date(c.sent_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' }),
          id: c.id
        }));
        setCampaigns(mapped);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCampaigns();
  }, []);

  const handleSend = async () => {
    if (!formData.subject || !formData.title || !formData.message) {
      toast.error("Te rugăm să completezi Subiectul, Titlul și Mesajul.");
      return;
    }

    setSending(true);
    setSendResult(null);
    try {
      const result = await sendMarketingCampaign(formData);
      if (result.success) {
        setSendResult({ success: true, message: `Campanie trimisă cu succes către ${result.recipientCount} destinatari!` });
        setTimeout(() => setActiveTab('campaigns'), 3000);
      } else {
        setSendResult({ success: false, message: result.error || "Eroare la trimitere." });
      }
    } catch (err) {
      setSendResult({ success: false, message: "Eroare rețea." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-700 pb-20 text-slate-900 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl tracking-tight font-bold text-slate-900">Email Marketing</h1>
          <p className="text-sm text-slate-500 mt-1">
            {activeTab === 'campaigns' ? 'Istoric campanii și performanță newsletter' : 'Editor vizual de email-uri'}
          </p>
        </div>

        <div className="flex gap-4 w-full md:w-auto">
          {activeTab === 'editor' && (
            <button 
              onClick={() => setActiveTab('campaigns')}
              className="h-10 px-4 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-50 transition-all flex-1 md:flex-none"
            >
              Anulează
            </button>
          )}
          <button 
            onClick={() => setActiveTab('editor')}
            className={`h-10 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 flex-1 md:flex-none ${
              activeTab === 'editor' 
              ? 'bg-[#e32f8c] text-black shadow-sm' 
              : 'bg-[#e32f8c] text-black hover:bg-[#c41a72] shadow-sm'
            }`}
          >
            <Plus size={16} /> {activeTab === 'editor' ? 'Editor Activ' : 'Campanie Nouă'}
          </button>
        </div>
      </div>

      {activeTab === 'campaigns' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 duration-500">
          {loading ? (
            <div className="col-span-1 md:col-span-2 flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#e32f8c]" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="col-span-1 md:col-span-2 p-12 text-center text-slate-500 font-bold bg-white border border-slate-200 rounded-3xl shadow-sm">
              Nicio campanie trimisă încă.
            </div>
          ) : campaigns.map((camp) => (
            <div key={camp.id || camp.title} className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm group hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                <div className="flex flex-col">
                  <h3 className="text-xl font-black text-slate-900">{camp.title}</h3>
                  <span className="text-xs text-slate-500 font-bold mt-1">Creat în {camp.date}</span>
                </div>
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${camp.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                  {camp.status === 'sent' ? 'Trimis' : 'Ciornă'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1 mb-2"><Users size={12} /> Destinatari</p>
                  <p className="text-xl font-black text-slate-900">{camp.recipients}</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1 mb-2"><MousePointer2 size={12} /> Open Rate</p>
                  <p className="text-xl font-black text-[#e32f8c]">{camp.openRate}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4 duration-500">
          {/* EDITOR SECTION */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col h-[800px]">
             <div className="p-6 border-b border-slate-100 bg-slate-50/50">
               <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Mail className="text-[#e32f8c]" size={20} /> Setări Campanie
               </h2>
             </div>
             
             <div className="p-6 flex-1 overflow-y-auto space-y-6">
                <div>
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Subiect Email *</label>
                   <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text" 
                        value={formData.subject}
                        onChange={(e) => setFormData({...formData, subject: e.target.value})}
                        placeholder="Ex: Oferta verii a sosit..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-6 text-sm focus:outline-none focus:border-[#e32f8c] transition-colors"
                      />
                   </div>
                </div>

                <div className="pt-6 border-t border-slate-100 space-y-6">
                   <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                     <Type size={14} /> Conținut (Vizibil în Preview)
                   </h3>

                   <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Titlu H1 *</label>
                      <input 
                        type="text" 
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#e32f8c] transition-colors font-bold"
                      />
                   </div>

                   <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Imagine Principală (URL)</label>
                      <div className="relative">
                        <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                          type="text" 
                          value={formData.imageUrl}
                          onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                          placeholder="https://..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-6 text-sm focus:outline-none focus:border-[#e32f8c] transition-colors"
                        />
                      </div>
                   </div>

                   <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Mesaj Principal *</label>
                      <textarea 
                        value={formData.message}
                        onChange={(e) => setFormData({...formData, message: e.target.value})}
                        rows={6}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-5 text-sm focus:outline-none focus:border-[#e32f8c] transition-colors min-h-[150px]"
                      />
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Text Buton CTA</label>
                        <input 
                          type="text" 
                          value={formData.ctaText}
                          onChange={(e) => setFormData({...formData, ctaText: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#e32f8c] transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Link CTA</label>
                        <div className="relative">
                          <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input 
                            type="text" 
                            value={formData.ctaLink}
                            onChange={(e) => setFormData({...formData, ctaLink: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-[#e32f8c] transition-colors"
                          />
                        </div>
                      </div>
                   </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                   <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                     <Users size={14} /> Segment Audiență
                   </h3>
                   <div className="grid grid-cols-3 gap-3">
                      <button 
                        onClick={() => setFormData({...formData, segment: 'subscribers'})}
                        className={`py-3 px-2 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-colors ${formData.segment === 'subscribers' ? 'bg-[#e32f8c]/10 text-[#e32f8c] border-[#e32f8c]/30' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'}`}
                      >
                        Abonați
                      </button>
                      <button 
                        onClick={() => setFormData({...formData, segment: 'customers'})}
                        className={`py-3 px-2 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-colors ${formData.segment === 'customers' ? 'bg-[#e32f8c]/10 text-[#e32f8c] border-[#e32f8c]/30' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'}`}
                      >
                        Clienți Activi
                      </button>
                      <button 
                        onClick={() => setFormData({...formData, segment: 'test'})}
                        className={`py-3 px-2 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-colors ${formData.segment === 'test' ? 'bg-indigo-50 text-indigo-500 border-indigo-200' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'}`}
                      >
                        Test Admin
                      </button>
                   </div>
                </div>
             </div>

             <div className="p-6 border-t border-slate-100 bg-slate-50 mt-auto">
               {sendResult && (
                 <div className={`mb-4 p-4 rounded-xl flex items-center gap-3 ${sendResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                   {sendResult.success ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                   <p className="text-xs font-bold uppercase tracking-wider">{sendResult.message}</p>
                 </div>
               )}
               <button 
                 onClick={handleSend}
                 disabled={sending}
                 className="w-full h-12 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
               >
                 {sending ? <Loader2 className="animate-spin" size={18} /> : <><Send size={18} /> Trimite Campania Acum</>}
               </button>
             </div>
          </div>

          {/* LIVE PREVIEW SECTION */}
          <div>
            <div className="bg-[#f9f9f9] border-[12px] border-[#222] rounded-[48px] overflow-hidden shadow-2xl h-[800px] overflow-y-auto hidden lg:block">
               <div className="bg-white max-w-[600px] mx-auto min-h-full pb-20">
                  {/* Header */}
                  <div className="bg-[#f4f6f8] p-8 text-center border-b border-gray-100">
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">TRENZONE</h1>
                  </div>

                  {/* Hero Image */}
                  {formData.imageUrl && (
                    <div className="w-full bg-slate-50">
                      <img src={getOptimizedImageUrl(formData.imageUrl)} alt="Hero" className="w-full h-auto object-contain max-h-[300px]" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-10 space-y-6">
                    <h2 className="text-3xl font-black text-slate-900 leading-tight">
                      {formData.title || 'Titlu Campanie'}
                    </h2>
                    <div className="text-slate-600 text-[15px] leading-relaxed whitespace-pre-wrap">
                      {formData.message || 'Scrie un mesaj emoționant pentru comunitatea ta...'}
                    </div>

                    {formData.ctaText && (
                      <div className="pt-6">
                        <a 
                          href={formData.ctaLink || '#'} 
                          className="inline-block px-8 py-4 bg-[#e32f8c] text-black font-bold uppercase tracking-widest text-sm rounded-xl text-center"
                        >
                          {formData.ctaText}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="bg-[#f4f6f8] p-8 text-center mt-10">
                    <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase mb-6">TRENZONE</h2>
                    <p className="text-[10px] uppercase font-bold text-gray-400">© 2026 TRENZONE | ROMÂNIA</p>
                  </div>
               </div>
            </div>
            {/* Mobile notification */}
            <div className="lg:hidden bg-slate-100 rounded-2xl p-6 text-center text-slate-500 text-sm font-bold mt-6">
              Preview-ul vizual este disponibil doar pe ecrane mari (Desktop/Tabletă).
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
