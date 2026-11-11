"use client";

import { getOptimizedImageUrl } from '@/lib/utils/imageProxy';
import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Mail, Send, Users, Plus, Image as ImageIcon, Link as LinkIcon, 
  AlertTriangle, Loader2, CheckSquare, Square, 
  Search, Trash2, X, BellRing, Eye, Download, Filter, 
  Sparkles, RefreshCw, Smartphone, Monitor, Check, ShieldCheck, ShoppingBag
} from 'lucide-react';
import { 
  sendMarketingCampaign, 
  uploadCampaignImage, 
  deleteMarketingCampaign, 
  toggleSubscriberActiveStatus,
  CampaignFormData 
} from '@/app/actions/admin-marketing';
import { deleteSubscriber } from '@/app/actions/admin-data';
import toast from 'react-hot-toast';

interface SubscriberItem {
  id: string;
  email: string;
  fullName: string;
  locale: string;
  source: string;
  isActive: boolean;
  subscribedAt: string;
}

interface CampaignItem {
  id: number;
  title: string;
  subject: string;
  status: string;
  sentTo: string;
  recipientsLabel: string;
  date: string;
  fullDate: string;
  imageUrl?: string;
  message?: string;
  ctaText?: string;
  ctaLink?: string;
  recipientCount?: number;
}

interface AudienceStats {
  totalAudience: number;
  subscribersCount: number;
  customersCount: number;
  campaignsCount: number;
  sourceBreakdown: Record<string, number>;
}

export default function BroadcastMarketingPage() {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'subscribers' | 'editor'>('campaigns');
  const [sending, setSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('desktop');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedCampaignForPreview, setSelectedCampaignForPreview] = useState<CampaignItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stats State
  const [stats, setStats] = useState<AudienceStats>({
    totalAudience: 0,
    subscribersCount: 0,
    customersCount: 0,
    campaignsCount: 0,
    sourceBreakdown: { footer: 0, 'promo-popup': 0, checkout: 0, modal: 0, other: 0 }
  });

  // Campaign Form State
  const [formData, setFormData] = useState<CampaignFormData>({
    subject: '',
    title: 'Noutăți TrenZone 🏆',
    message: 'Salutare, Campionule!\n\nAvem noutăți importante pentru antrenamentele tale. Descoperă cele mai noi echipamente concepute pentru rezistență extremă și performanță maximă.',
    ctaText: 'Descoperă Echipamentele',
    ctaLink: 'https://www.trenzone.fit/ro/shop',
    imageUrl: '',
    segment: 'all'
  });

  // Data states
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [subscribers, setSubscribers] = useState<SubscriberItem[]>([]);
  const [allEmails, setAllEmails] = useState<{ email: string; isSubscriber: boolean; isCustomer: boolean }[]>([]);
  const [customRecipients, setCustomRecipients] = useState<string[]>([]);

  // Filter states for subscribers tab
  const [subscriberSearch, setSubscriberSearch] = useState('');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [subscribersPage, setSubscribersPage] = useState(1);
  const subscribersPerPage = 12;

  // Manual email selector pagination
  const [emailSearch, setEmailSearch] = useState('');
  const [customEmailPage, setCustomEmailPage] = useState(1);
  const customEmailsPerPage = 12;

  // Load all data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [broadcastsRes, emailsRes, subsRes, statsRes] = await Promise.all([
        fetch('/api/admin/data?action=broadcasts').then(r => r.json()),
        fetch('/api/admin/data?action=all-emails').then(r => r.json()),
        fetch('/api/admin/data?action=subscribers').then(r => r.json()),
        fetch('/api/admin/data?action=audience-stats').then(r => r.json())
      ]);

      if (broadcastsRes.data) {
        const mappedCampaigns: CampaignItem[] = broadcastsRes.data.map((b: any) => {
          let parsedBody: any = {};
          try {
            parsedBody = typeof b.body === 'string' ? JSON.parse(b.body) : (b.body || {});
          } catch {
            parsedBody = { message: b.body };
          }

          let sentToReadable = 'Toată Audiența';
          if (b.sent_to === 'all_subscribers' || b.sent_to === 'subscribers') sentToReadable = 'Doar Abonați';
          else if (b.sent_to === 'all_customers' || b.sent_to === 'customers') sentToReadable = 'Doar Clienți';
          else if (b.sent_to === 'custom') sentToReadable = 'Selecție Manuală';
          else if (b.sent_to === 'test') sentToReadable = 'Test Admin';

          return {
            id: b.id,
            subject: b.subject,
            title: parsedBody.title || b.subject,
            status: b.status || 'sent',
            sentTo: b.sent_to,
            recipientsLabel: sentToReadable,
            date: new Date(b.sent_at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' }),
            fullDate: new Date(b.sent_at).toLocaleString('ro-RO'),
            imageUrl: parsedBody.imageUrl || b.image_url || '',
            message: parsedBody.message || '',
            ctaText: parsedBody.ctaText || '',
            ctaLink: parsedBody.ctaLink || '',
            recipientCount: parsedBody.recipientCount
          };
        });
        setCampaigns(mappedCampaigns);
      }

      if (emailsRes.data) {
        setAllEmails(emailsRes.data);
      }

      if (subsRes.data) {
        setSubscribers(subsRes.data);
      }

      if (statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (err) {
      console.error('Error fetching broadcast data:', err);
      toast.error('Eroare la încărcarea datelor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute live recipient estimate for active segment
  const estimatedRecipientsCount = useMemo(() => {
    switch (formData.segment) {
      case 'all':
        return stats.totalAudience;
      case 'subscribers':
        return stats.subscribersCount;
      case 'customers':
        return stats.customersCount;
      case 'custom':
        return customRecipients.length;
      case 'test':
        return 1;
      default:
        return 0;
    }
  }, [formData.segment, stats, customRecipients]);

  // Handle Send Campaign
  const executeSendCampaign = async () => {
    setShowConfirmModal(false);
    setSending(true);

    try {
      const result = await sendMarketingCampaign({
        ...formData,
        customRecipients: formData.segment === 'custom' ? customRecipients : undefined
      });

      if (result.success) {
        toast.success(`Campanie expediată cu succes către ${result.recipientCount} destinatari!`, { duration: 5000 });
        setFormData({
          subject: '',
          title: 'Noutăți TrenZone 🏆',
          message: 'Salutare, Campionule!\n\nAvem noutăți importante pentru tine...',
          ctaText: 'Descoperă Echipamentele',
          ctaLink: 'https://www.trenzone.fit/ro/shop',
          imageUrl: '',
          segment: 'all'
        });
        setCustomRecipients([]);
        await fetchData();
        setActiveTab('campaigns');
      } else {
        toast.error(result.error || 'Eroare la expediere.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Eroare neașteptată la trimitere.');
    } finally {
      setSending(false);
    }
  };

  const handleOpenSendConfirmation = () => {
    if (!formData.subject.trim()) {
      toast.error('Te rugăm să introduci Subiectul emailului.');
      return;
    }
    if (!formData.title.trim()) {
      toast.error('Te rugăm să introduci Titlul campaniei.');
      return;
    }
    if (!formData.message.trim()) {
      toast.error('Te rugăm să introduci Mesajul campaniei.');
      return;
    }
    if (formData.segment === 'custom' && customRecipients.length === 0) {
      toast.error('Selectează cel puțin un destinatar pentru trimiterea manuală.');
      return;
    }

    setShowConfirmModal(true);
  };

  // Image Upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await uploadCampaignImage(form);
      if (res.success && res.url) {
        setFormData(prev => ({ ...prev, imageUrl: res.url }));
        toast.success('Imagine banner încărcată cu succes!');
      }
    } catch (err) {
      console.error(err);
      toast.error('Eroare la încărcarea imaginii.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Delete Campaign
  const handleDeleteCampaign = async (id: number, imageUrl?: string) => {
    if (!confirm('Ești sigur că vrei să ștergi această campanie din istoric?')) return;

    try {
      const res = await deleteMarketingCampaign(id, imageUrl);
      if (res.success) {
        setCampaigns(prev => prev.filter(c => c.id !== id));
        toast.success('Campania a fost ștearsă.');
      } else {
        toast.error('Eroare la ștergere.');
      }
    } catch (err) {
      toast.error('Eroare la ștergere.');
    }
  };

  // Subscriber Management Actions
  const handleToggleSubscriber = async (id: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      await toggleSubscriberActiveStatus(id, newStatus);
      setSubscribers(prev => prev.map(s => s.id === id ? { ...s, isActive: newStatus } : s));
      toast.success(newStatus ? 'Abonat reactivat!' : 'Abonat marcat ca inactiv.');
      fetchData();
    } catch (err) {
      toast.error('Eroare la modificarea statusului.');
    }
  };

  const handleDeleteSubscriber = async (id: string, email: string) => {
    if (!confirm(`Sigur dorești să elimini permanent abonatul "${email}"?`)) return;

    try {
      await deleteSubscriber(id);
      setSubscribers(prev => prev.filter(s => s.id !== id));
      toast.success('Abonat eliminat.');
      fetchData();
    } catch (err) {
      toast.error('Eroare la eliminarea abonatului.');
    }
  };

  // Export Subscribers to CSV
  const handleExportCSV = () => {
    if (subscribers.length === 0) {
      toast.error('Nu există abonați de exportat.');
      return;
    }

    const headers = ['Email', 'Nume', 'Sursa', 'Limba', 'Status', 'Data Abonare'];
    const rows = subscribers.map(s => [
      `"${s.email}"`,
      `"${s.fullName || ''}"`,
      `"${s.source}"`,
      `"${s.locale}"`,
      s.isActive ? '"Activ"' : '"Inactiv"',
      `"${new Date(s.subscribedAt).toLocaleString('ro-RO')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `trenzone_abonati_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Fișier CSV exportat cu succes!');
  };

  // Clean source badges without emojis or AI slop
  const renderSourceBadge = (source: string) => {
    const s = (source || '').toLowerCase();
    if (s.includes('footer')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
          Footer
        </span>
      );
    }
    if (s.includes('popup') || s.includes('scratch') || s.includes('promo')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
          Pop-up
        </span>
      );
    }
    if (s.includes('checkout')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/80">
          Checkout
        </span>
      );
    }
    if (s.includes('modal')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
          Modal
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
        {source || 'Direct'}
      </span>
    );
  };

  // Filter subscribers
  const filteredSubscribers = useMemo(() => {
    return subscribers.filter(s => {
      const matchesSearch = s.email.toLowerCase().includes(subscriberSearch.toLowerCase()) || 
                            s.fullName.toLowerCase().includes(subscriberSearch.toLowerCase());
      
      let matchesSource = true;
      if (selectedSourceFilter !== 'all') {
        const src = s.source.toLowerCase();
        if (selectedSourceFilter === 'footer') matchesSource = src.includes('footer');
        else if (selectedSourceFilter === 'popup') matchesSource = src.includes('popup') || src.includes('scratch') || src.includes('promo');
        else if (selectedSourceFilter === 'checkout') matchesSource = src.includes('checkout');
        else if (selectedSourceFilter === 'modal') matchesSource = src.includes('modal');
        else if (selectedSourceFilter === 'other') matchesSource = !src.includes('footer') && !src.includes('popup') && !src.includes('scratch') && !src.includes('checkout') && !src.includes('modal');
      }

      let matchesStatus = true;
      if (selectedStatusFilter === 'active') matchesStatus = s.isActive === true;
      else if (selectedStatusFilter === 'inactive') matchesStatus = s.isActive === false;

      return matchesSearch && matchesSource && matchesStatus;
    });
  }, [subscribers, subscriberSearch, selectedSourceFilter, selectedStatusFilter]);

  const totalSubscribersPages = Math.ceil(filteredSubscribers.length / subscribersPerPage) || 1;
  const paginatedSubscribers = useMemo(() => {
    const start = (subscribersPage - 1) * subscribersPerPage;
    return filteredSubscribers.slice(start, start + subscribersPerPage);
  }, [filteredSubscribers, subscribersPage]);

  // Custom Recipients Filtering
  const filteredCustomEmails = useMemo(() => {
    return allEmails.filter(e => e.email.toLowerCase().includes(emailSearch.toLowerCase()));
  }, [allEmails, emailSearch]);

  const totalCustomPages = Math.ceil(filteredCustomEmails.length / customEmailsPerPage) || 1;
  const paginatedCustomEmails = useMemo(() => {
    const start = (customEmailPage - 1) * customEmailsPerPage;
    return filteredCustomEmails.slice(start, start + customEmailsPerPage);
  }, [filteredCustomEmails, customEmailPage]);

  const toggleCustomEmail = (email: string) => {
    setCustomRecipients(prev => 
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  const selectAllCustomFiltered = () => {
    const newSelected = new Set(customRecipients);
    filteredCustomEmails.forEach(e => newSelected.add(e.email));
    setCustomRecipients(Array.from(newSelected));
  };

  const deselectAllCustomFiltered = () => {
    const filteredSet = new Set(filteredCustomEmails.map(e => e.email));
    setCustomRecipients(customRecipients.filter(email => !filteredSet.has(email)));
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-24 text-slate-900 animate-in fade-in duration-500">
      
      {/* 🌟 TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-black tracking-wider uppercase bg-[#e32f8c]/10 text-[#e32f8c] border border-[#e32f8c]/20">
              Marketing & Newsletter
            </span>
            <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
              <ShieldCheck size={14} className="text-emerald-500" /> Resend Engine
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-950 tracking-tight mt-1">
            Campanii & Abonați Notificări
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl font-medium">
            Transmite broadcast-uri de mare impact, segmentează audiența în mod flexibil și monitorizează proveniența abonaților.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => { fetchData(); toast.success('Date actualizate!'); }}
            className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
            title="Reîmprospătează datele"
          >
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => setActiveTab('editor')}
            className={`h-11 px-5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 flex-1 md:flex-none shadow-sm ${
              activeTab === 'editor'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-[#e32f8c] text-white hover:bg-[#c41a72] active:scale-95 shadow-md shadow-[#e32f8c]/20'
            }`}
          >
            <Plus size={16} /> Campanie Nouă
          </button>
        </div>
      </div>

      {/* 📊 4 KPI STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Audience */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Audiență Totală</span>
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
              <Users size={18} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">
            {stats.totalAudience}
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            Persoane unice contactabile (Abonați + Clienți)
          </p>
        </div>

        {/* Newsletter Subscribers */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Abonați Notificări</span>
            <div className="w-9 h-9 rounded-xl bg-[#e32f8c] text-white flex items-center justify-center shadow-sm shadow-[#e32f8c]/20">
              <BellRing size={18} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">
            {stats.subscribersCount}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
              Footer: {stats.sourceBreakdown.footer || 0}
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100">
              Pop-up: {stats.sourceBreakdown['promo-popup'] || 0}
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-100">
              Checkout: {stats.sourceBreakdown.checkout || 0}
            </span>
          </div>
        </div>

        {/* Verified Order Customers */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clienți Comenzi</span>
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm shadow-purple-600/20">
              <ShoppingBag size={18} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">
            {stats.customersCount}
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            Cumpărători cu istoric de comenzi finalizate
          </p>
        </div>

        {/* Broadcasts Sent */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Campanii Trimise</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shadow-emerald-600/20">
              <Send size={18} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">
            {stats.campaignsCount}
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            Broadcast-uri expediate către comunitate
          </p>
        </div>
      </div>

      {/* 🧭 NAVIGATION TABS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            activeTab === 'campaigns'
              ? 'bg-slate-950 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Send size={15} /> Campanii Trimise ({campaigns.length})
        </button>

        <button
          onClick={() => setActiveTab('subscribers')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            activeTab === 'subscribers'
              ? 'bg-slate-950 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BellRing size={15} /> Abonați Notificări ({subscribers.length})
        </button>

        <button
          onClick={() => setActiveTab('editor')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            activeTab === 'editor'
              ? 'bg-[#e32f8c] text-white shadow-sm shadow-[#e32f8c]/20'
              : 'bg-white text-[#e32f8c] hover:bg-[#e32f8c]/5 border border-[#e32f8c]/30'
          }`}
        >
          <Sparkles size={15} /> Editor Campanie Nouă
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. TAB: CAMPAIGNS LIST & HISTORY */}
      {/* ========================================================================= */}
      {activeTab === 'campaigns' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
          {campaigns.length === 0 ? (
            /* ✨ RICH EMPTY STATE */
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center max-w-2xl mx-auto shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#e32f8c] to-purple-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-[#e32f8c]/30 mb-5">
                <Send size={30} />
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Nu ai trimis nicio campanie încă</h3>
              <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
                Inițiază primul tău broadcast de email către abonați sau clienți. Folosește editorul vizual cu live preview și segmentare inteligentă.
              </p>
              <div className="mt-8 flex justify-center gap-3">
                <button
                  onClick={() => setActiveTab('editor')}
                  className="px-6 py-3 bg-[#e32f8c] hover:bg-[#c41a72] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-[#e32f8c]/25 transition-all flex items-center gap-2 active:scale-95"
                >
                  <Plus size={16} /> Creează Prima Campanie
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaigns.map((camp) => (
                <div 
                  key={camp.id} 
                  className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden"
                >
                  <div>
                    {/* Top Row: Segment Badge & Actions */}
                    <div className="flex items-center justify-between mb-4 gap-2">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                        {camp.recipientsLabel}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <Check size={11} /> Expediat
                        </span>
                        <button
                          onClick={() => handleDeleteCampaign(camp.id, camp.imageUrl)}
                          className="p-1 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Șterge din istoric"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Banner Thumbnail (if any) */}
                    {camp.imageUrl && (
                      <div className="w-full h-32 rounded-xl bg-slate-900 mb-4 overflow-hidden border border-slate-100">
                        <img 
                          src={getOptimizedImageUrl(camp.imageUrl)} 
                          alt="Banner" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                      </div>
                    )}

                    {/* Title & Subject */}
                    <h3 className="text-base font-black text-slate-900 line-clamp-2 leading-snug group-hover:text-[#e32f8c] transition-colors">
                      {camp.subject}
                    </h3>
                    {camp.title && camp.title !== camp.subject && (
                      <p className="text-xs text-slate-500 font-medium line-clamp-1 mt-1">
                        H1: {camp.title}
                      </p>
                    )}
                  </div>

                  {/* Bottom Info Bar */}
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1 font-semibold">
                      <span>{camp.date}</span>
                    </div>

                    <button
                      onClick={() => setSelectedCampaignForPreview(camp)}
                      className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition-colors border border-slate-200"
                    >
                      <Eye size={13} className="text-[#e32f8c]" /> Previzualizare
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. TAB: SUBSCRIBERS LIST & PROVENANCE SOURCES */}
      {/* ========================================================================= */}
      {activeTab === 'subscribers' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
          
          {/* Controls Bar: Search, Source Filter, Status Filter & CSV Export */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Caută după email sau nume..."
                  value={subscriberSearch}
                  onChange={(e) => { setSubscriberSearch(e.target.value); setSubscribersPage(1); }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:border-[#e32f8c] focus:bg-white transition-all"
                />
                {subscriberSearch && (
                  <button 
                    onClick={() => setSubscriberSearch('')} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Actions & CSV Export */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleExportCSV}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm flex items-center gap-2 transition-all active:scale-95"
                >
                  <Download size={15} /> Exportă CSV
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1 mr-1">
                <Filter size={12} /> Sursă:
              </span>
              
              {[
                { id: 'all', label: `Toate (${subscribers.length})` },
                { id: 'footer', label: `Footer (${stats.sourceBreakdown.footer || 0})` },
                { id: 'popup', label: `Pop-up (${stats.sourceBreakdown['promo-popup'] || 0})` },
                { id: 'checkout', label: `Checkout (${stats.sourceBreakdown.checkout || 0})` },
                { id: 'modal', label: `Modal (${stats.sourceBreakdown.modal || 0})` },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => { setSelectedSourceFilter(f.id); setSubscribersPage(1); }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    selectedSourceFilter === f.id
                      ? 'bg-[#e32f8c] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}

              <div className="ml-auto flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Status:</span>
                <button
                  onClick={() => { setSelectedStatusFilter('all'); setSubscribersPage(1); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${selectedStatusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  Toți
                </button>
                <button
                  onClick={() => { setSelectedStatusFilter('active'); setSubscribersPage(1); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${selectedStatusFilter === 'active' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  Activi
                </button>
                <button
                  onClick={() => { setSelectedStatusFilter('inactive'); setSubscribersPage(1); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${selectedStatusFilter === 'inactive' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  Inactivi
                </button>
              </div>
            </div>
          </div>

          {/* Subscribers Table / List */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {filteredSubscribers.length === 0 ? (
              <div className="p-12 text-center">
                <BellRing size={32} className="mx-auto text-slate-300 mb-3" />
                <h4 className="text-base font-black text-slate-800">Niciun abonat găsit</h4>
                <p className="text-xs text-slate-500 mt-1">Încearcă să resetezi filtrele sau termenul de căutare.</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-black uppercase tracking-wider">
                      <tr>
                        <th className="py-3.5 px-6">Abonat</th>
                        <th className="py-3.5 px-6">Sursă Proveniență</th>
                        <th className="py-3.5 px-6">Limbă</th>
                        <th className="py-3.5 px-6">Data Înscrierii</th>
                        <th className="py-3.5 px-6">Status Notificări</th>
                        <th className="py-3.5 px-6 text-right">Acțiuni</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedSubscribers.map((sub) => (
                        <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900">{sub.email}</span>
                              <span className="text-[11px] text-slate-400 font-medium">{sub.fullName || 'Fără nume setat'}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            {renderSourceBadge(sub.source)}
                          </td>
                          <td className="py-4 px-6">
                            <span className="font-bold uppercase tracking-wider text-[11px] text-slate-600 px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                              {sub.locale}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-slate-500 font-medium">
                            {new Date(sub.subscribedAt).toLocaleString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-4 px-6">
                            <button
                              onClick={() => handleToggleSubscriber(sub.id, sub.isActive)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all ${
                                sub.isActive 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                                  : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                              }`}
                              title="Click pentru a comuta statusul"
                            >
                              {sub.isActive ? '● Activ' : '○ Inactiv'}
                            </button>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => handleDeleteSubscriber(sub.id, sub.email)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Elimină abonat"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="md:hidden divide-y divide-slate-100">
                  {paginatedSubscribers.map((sub) => (
                    <div key={sub.id} className="p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-slate-900 text-xs break-all">{sub.email}</p>
                          <p className="text-[11px] text-slate-400">{sub.fullName}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteSubscriber(sub.id, sub.email)}
                          className="p-1 text-slate-300 hover:text-red-600 rounded"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-1.5">
                          {renderSourceBadge(sub.source)}
                          <span className="text-[10px] font-bold uppercase text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {sub.locale}
                          </span>
                        </div>

                        <button
                          onClick={() => handleToggleSubscriber(sub.id, sub.isActive)}
                          className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                            sub.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {sub.isActive ? 'Activ' : 'Inactiv'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalSubscribersPages > 1 && (
                  <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>
                      Pagina {subscribersPage} din {totalSubscribersPages} ({filteredSubscribers.length} rezultate)
                    </span>
                    <div className="flex gap-2">
                      <button
                        disabled={subscribersPage === 1}
                        onClick={() => setSubscribersPage(p => Math.max(1, p - 1))}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
                      >
                        Înapoi
                      </button>
                      <button
                        disabled={subscribersPage === totalSubscribersPages}
                        onClick={() => setSubscribersPage(p => Math.min(totalSubscribersPages, p + 1))}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
                      >
                        Înainte
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. TAB: CAMPAIGN BUILDER & LIVE PREVIEW */}
      {/* ========================================================================= */}
      {activeTab === 'editor' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-2 duration-300">
          
          {/* 📝 FORM BUILDER (LEFT - 7 COLS) */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-8">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Sparkles className="text-[#e32f8c]" size={18} /> Configurator Campanie
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Definește audiența țintă și personalizează conținutul emailului.</p>
              </div>
              <button
                onClick={() => setActiveTab('campaigns')}
                className="text-xs text-slate-400 hover:text-slate-700 font-bold"
              >
                Anulează
              </button>
            </div>

            {/* 🎯 STEP 1: AUDIENCE SELECTOR CARDS */}
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>1. Selectează Audiența Țintă</span>
                <span className="text-[11px] font-bold text-[#e32f8c]">
                  Destinatari estimați: ~{estimatedRecipientsCount} persoane
                </span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {/* All */}
                <div
                  onClick={() => setFormData({ ...formData, segment: 'all' })}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    formData.segment === 'all'
                      ? 'border-[#e32f8c] bg-[#e32f8c]/5 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-black uppercase text-slate-900">🌐 Toți</span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-900 text-white">
                      {stats.totalAudience}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Abonați newsletter + toți cumpărătorii unici
                  </p>
                </div>

                {/* Subscribers Only */}
                <div
                  onClick={() => setFormData({ ...formData, segment: 'subscribers' })}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    formData.segment === 'subscribers'
                      ? 'border-[#e32f8c] bg-[#e32f8c]/5 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-black uppercase text-slate-900">📬 Doar Abonați</span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#e32f8c] text-white">
                      {stats.subscribersCount}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Persoane înscrise din footer, pop-up sau checkout
                  </p>
                </div>

                {/* Customers Only */}
                <div
                  onClick={() => setFormData({ ...formData, segment: 'customers' })}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    formData.segment === 'customers'
                      ? 'border-[#e32f8c] bg-[#e32f8c]/5 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-black uppercase text-slate-900">🛍️ Doar Clienți</span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-purple-600 text-white">
                      {stats.customersCount}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Doar persoanele care au plasat cel puțin o comandă
                  </p>
                </div>

                {/* Manual Selection */}
                <div
                  onClick={() => setFormData({ ...formData, segment: 'custom' })}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    formData.segment === 'custom'
                      ? 'border-[#e32f8c] bg-[#e32f8c]/5 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-black uppercase text-slate-900">🎯 Manual</span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500 text-white">
                      {customRecipients.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Alege manual din lista completă de contacte
                  </p>
                </div>

                {/* Admin Test */}
                <div
                  onClick={() => setFormData({ ...formData, segment: 'test' })}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    formData.segment === 'test'
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-black uppercase text-slate-900">🧪 Test Admin</span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-indigo-600 text-white">
                      1
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Trimite doar pe trenzone483@gmail.com
                  </p>
                </div>
              </div>

              {/* Custom Recipients Box (if Manual is chosen) */}
              {formData.segment === 'custom' && (
                <div className="mt-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      Bifează destinatarii ({customRecipients.length} selectați)
                    </span>
                    <div className="flex gap-2">
                      <button 
                        onClick={selectAllCustomFiltered} 
                        className="text-[10px] font-black text-[#e32f8c] uppercase hover:underline"
                      >
                        Bifează toți
                      </button>
                      <span className="text-slate-300">|</span>
                      <button 
                        onClick={deselectAllCustomFiltered} 
                        className="text-[10px] font-black text-slate-400 uppercase hover:underline"
                      >
                        Debifează
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="text"
                      placeholder="Caută în contacte..."
                      value={emailSearch}
                      onChange={(e) => { setEmailSearch(e.target.value); setCustomEmailPage(1); }}
                      className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs focus:outline-none focus:border-[#e32f8c]"
                    />
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {filteredCustomEmails.length === 0 ? (
                      <p className="text-center py-6 text-xs text-slate-400">Niciun contact găsit.</p>
                    ) : (
                      paginatedCustomEmails.map(item => (
                        <div
                          key={item.email}
                          onClick={() => toggleCustomEmail(item.email)}
                          className="flex items-center justify-between p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200/60 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            {customRecipients.includes(item.email) ? (
                              <CheckSquare size={16} className="text-[#e32f8c]" />
                            ) : (
                              <Square size={16} className="text-slate-300" />
                            )}
                            <span className="text-xs font-bold text-slate-800">{item.email}</span>
                          </div>
                          <div className="flex gap-1">
                            {item.isSubscriber && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-[#e32f8c]/10 text-[#e32f8c]">Abonat</span>
                            )}
                            {item.isCustomer && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">Client</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {totalCustomPages > 1 && (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[10px] text-slate-500 font-bold">
                      <span>Pagina {customEmailPage} din {totalCustomPages}</span>
                      <div className="flex gap-1">
                        <button
                          disabled={customEmailPage === 1}
                          onClick={() => setCustomEmailPage(p => Math.max(1, p - 1))}
                          className="px-2 py-1 rounded bg-white border border-slate-200 disabled:opacity-50"
                        >
                          Înapoi
                        </button>
                        <button
                          disabled={customEmailPage === totalCustomPages}
                          onClick={() => setCustomEmailPage(p => Math.min(totalCustomPages, p + 1))}
                          className="px-2 py-1 rounded bg-white border border-slate-200 disabled:opacity-50"
                        >
                          Înainte
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ✉️ STEP 2: EMAIL CONTENT */}
            <div className="space-y-5 pt-4 border-t border-slate-100">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                2. Subiect & Conținut Email
              </label>

              {/* Subject */}
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Subiect Email (Subject Line) *
                </span>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Ex: 🔥 Noua Colecție Heavy-Duty X10 a sosit!"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs font-bold focus:outline-none focus:border-[#e32f8c] focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* H1 Heading */}
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Titlu H1 în interiorul emailului *
                </span>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Noua Generație TrenZone este Aici"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold focus:outline-none focus:border-[#e32f8c] focus:bg-white transition-all"
                />
              </div>

              {/* Banner Upload */}
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Banner Principal (Opțional)
                </span>
                {formData.imageUrl ? (
                  <div className="relative w-full h-44 rounded-2xl bg-slate-900 overflow-hidden border border-slate-200 group">
                    <img
                      src={getOptimizedImageUrl(formData.imageUrl)}
                      alt="Banner Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                      className="absolute top-3 right-3 bg-red-600 text-white p-2 rounded-xl shadow-lg hover:bg-red-700 transition-all flex items-center gap-1 text-[11px] font-bold"
                    >
                      <Trash2 size={14} /> Elimină Imaginea
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="w-full h-24 border-2 border-dashed border-slate-200 hover:border-[#e32f8c] rounded-2xl flex flex-col items-center justify-center gap-1.5 text-slate-500 hover:text-[#e32f8c] transition-colors disabled:opacity-50"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 size={20} className="animate-spin text-[#e32f8c]" />
                          <span className="text-xs font-bold">Se încarcă pe server...</span>
                        </>
                      ) : (
                        <>
                          <ImageIcon size={22} />
                          <span className="text-xs font-bold">Apasă pentru a încărca imaginea banner (PNG, JPG, WebP)</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Message Body */}
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Mesaj Principal *
                </span>
                <textarea
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Scrie mesajul tău aici..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-medium leading-relaxed focus:outline-none focus:border-[#e32f8c] focus:bg-white transition-all"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Suportă paragrafe naturale (Enter) și formatare cu tag-uri simple.
                </p>
              </div>

              {/* CTA Button & Link */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Text Buton CTA
                  </span>
                  <input
                    type="text"
                    value={formData.ctaText}
                    onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                    placeholder="Ex: Vezi Oferta Acum"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-bold focus:outline-none focus:border-[#e32f8c] focus:bg-white"
                  />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Link Buton CTA
                  </span>
                  <div className="relative">
                    <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="text"
                      value={formData.ctaLink}
                      onChange={(e) => setFormData({ ...formData, ctaLink: e.target.value })}
                      placeholder="https://www.trenzone.fit/ro/shop"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3.5 text-xs font-semibold focus:outline-none focus:border-[#e32f8c] focus:bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500 font-medium">
                Verifică cu atenție înainte de expediere. Emailul va fi trimis instant prin Resend.
              </div>

              <button
                onClick={handleOpenSendConfirmation}
                disabled={sending || (formData.segment === 'custom' && customRecipients.length === 0)}
                className="w-full sm:w-auto px-8 py-3.5 bg-slate-950 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-black/10 active:scale-95 disabled:opacity-50 transition-all"
              >
                {sending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Se expediază...
                  </>
                ) : (
                  <>
                    <Send size={16} /> Trimite Campania Acum
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 📱 LIVE PREVIEW MOCKUP (RIGHT - 5 COLS) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Eye size={14} className="text-[#e32f8c]" /> Live Email Simulator
              </span>

              {/* Device Toggle */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                    previewDevice === 'desktop' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Previzualizare Desktop"
                >
                  <Monitor size={14} />
                </button>
                <button
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                    previewDevice === 'mobile' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Previzualizare Smartphone"
                >
                  <Smartphone size={14} />
                </button>
              </div>
            </div>

            {/* Mockup Frame */}
            <div className={`mx-auto transition-all duration-300 ${
              previewDevice === 'mobile' ? 'max-w-[340px]' : 'max-w-full'
            }`}>
              <div className="bg-slate-900 rounded-[32px] p-2.5 shadow-2xl border-4 border-slate-800">
                
                {/* Simulated Email Client Bar */}
                <div className="bg-slate-800 px-4 py-2.5 rounded-t-[20px] flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-300 truncate max-w-[180px]">
                    {formData.subject || 'Fără subiect'}
                  </span>
                </div>

                {/* Email Body Container */}
                <div className="bg-white rounded-b-[20px] overflow-hidden max-h-[620px] overflow-y-auto custom-scrollbar text-slate-900">
                  
                  {/* Sender Header */}
                  <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-left">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-black text-xs">
                        TZ
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-slate-900">TrenZone Team</p>
                        <p className="text-[10px] text-slate-400">noreply@trenzone.fit</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Acum</span>
                  </div>

                  {/* Dark Brand Banner */}
                  <div className="bg-black py-4 px-6 text-center border-b border-slate-900">
                    <img 
                      src="/images/logos/trenzone_logo.webp" 
                      alt="TrenZone" 
                      className="h-10 object-contain mx-auto" 
                    />
                  </div>

                  {/* Hero Image */}
                  {formData.imageUrl && (
                    <div className="w-full bg-slate-950">
                      <img 
                        src={getOptimizedImageUrl(formData.imageUrl)} 
                        alt="Hero" 
                        className="w-full max-h-56 object-cover" 
                      />
                    </div>
                  )}

                  {/* Email Visual Content */}
                  <div className="p-6 text-center space-y-4">
                    <h2 className="text-xl font-black text-slate-950 uppercase tracking-tight leading-snug">
                      {formData.title || 'Titlu Campanie'}
                    </h2>

                    <div 
                      className="text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-wrap max-w-sm mx-auto"
                      dangerouslySetInnerHTML={{ 
                        __html: formData.message ? formData.message.replace(/\n/g, '<br />') : 'Mesajul campaniei va apărea aici...' 
                      }}
                    />

                    {formData.ctaText && (
                      <div className="pt-2">
                        <span className="inline-block px-7 py-3 bg-black text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-md">
                          {formData.ctaText}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Dark Email Footer */}
                  <div className="bg-black py-6 px-4 text-center border-t border-slate-900 space-y-2">
                    <img 
                      src="/images/logos/trenzone_logo.webp" 
                      alt="TrenZone" 
                      className="h-7 object-contain mx-auto opacity-50" 
                    />
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                      © 2026 TRENZONE | TOATE DREPTURILE REZERVATE
                    </p>
                    <p className="text-[9px] text-slate-600">
                      Ai primit acest mesaj deoarece ești abonat la notificările TrenZone.
                    </p>
                  </div>

                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL: SENT CAMPAIGN PREVIEW DIALOG */}
      {/* ========================================================================= */}
      {selectedCampaignForPreview && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#e32f8c]">
                  Previzualizare Campanie Trimisă
                </span>
                <h3 className="text-base font-black text-slate-900 line-clamp-1 mt-0.5">
                  {selectedCampaignForPreview.subject}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCampaignForPreview(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Expediat la:</span>
                  <span className="font-bold text-slate-900">{selectedCampaignForPreview.fullDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Segment audiență:</span>
                  <span className="font-bold text-slate-900">{selectedCampaignForPreview.recipientsLabel}</span>
                </div>
                {selectedCampaignForPreview.recipientCount && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Număr destinatari:</span>
                    <span className="font-bold text-[#e32f8c]">{selectedCampaignForPreview.recipientCount}</span>
                  </div>
                )}
              </div>

              {/* Render Simulated Content */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-black py-4 text-center">
                  <img src="/images/logos/trenzone_logo.webp" alt="TrenZone" className="h-8 object-contain mx-auto" />
                </div>
                {selectedCampaignForPreview.imageUrl && (
                  <img 
                    src={getOptimizedImageUrl(selectedCampaignForPreview.imageUrl)} 
                    alt="Banner" 
                    className="w-full max-h-48 object-cover" 
                  />
                )}
                <div className="p-6 text-center space-y-3">
                  <h4 className="text-lg font-black text-slate-900 uppercase">
                    {selectedCampaignForPreview.title}
                  </h4>
                  <div 
                    className="text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ 
                      __html: (selectedCampaignForPreview.message || '').replace(/\n/g, '<br />') 
                    }}
                  />
                  {selectedCampaignForPreview.ctaText && (
                    <div className="pt-2">
                      <span className="inline-block px-6 py-2.5 bg-black text-white font-black uppercase text-[10px] rounded-lg">
                        {selectedCampaignForPreview.ctaText}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedCampaignForPreview(null)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-colors"
              >
                Închide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL: PRE-SEND CONFIRMATION */}
      {/* ========================================================================= */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-black text-slate-900">Confirmă Expedierea Campaniei</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Ești pe cale să transmiți această campanie către{' '}
                <strong className="text-[#e32f8c] font-black">
                  ~{estimatedRecipientsCount} destinatari
                </strong>{' '}
                în segmentul <strong className="text-slate-800 uppercase">{formData.segment}</strong>.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1">
              <p className="text-slate-500">Subiect:</p>
              <p className="font-bold text-slate-900 line-clamp-1">{formData.subject}</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
              >
                Renunță
              </button>
              <button
                onClick={executeSendCampaign}
                className="flex-1 py-3 rounded-xl bg-[#e32f8c] hover:bg-[#c41a72] text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-[#e32f8c]/25 transition-all"
              >
                Confirmă & Trimite
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
