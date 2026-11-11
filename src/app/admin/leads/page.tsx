"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Mail, MessageSquare, Search, Trash2, Copy, Check, ExternalLink, 
  Send, Clock, Tag, Loader2, X, Users, Download, BellRing, 
  RefreshCw, Briefcase, Wrench, HelpCircle, Package, Zap
} from 'lucide-react';
import { deleteContactMessage, deleteSubscriber } from '@/app/actions/admin-data';
import { toggleSubscriberActiveStatus } from '@/app/actions/admin-marketing';
import { sendContactReply } from '@/app/actions/contact';
import toast from 'react-hot-toast';

function decodeHtml(html: string = ''): string {
  if (!html) return '';
  return html
    .replace(/&#0*39;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function classifySubject(rawSubject: string) {
  const s = (rawSubject || '').toLowerCase().trim();
  
  if (s.includes('suport') || s.includes('reclamatii') || s.includes('reclamații') || s.includes('support') || s.includes('tehnic') || s.includes('marime') || s.includes('mărime')) {
    return {
      category: 'support' as const,
      displayLabel: 'Suport Tehnic & Mărimi',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
      icon: Wrench,
      accent: 'from-amber-500/20 to-orange-500/20 text-amber-600'
    };
  }
  
  if (s.includes('livrare') || s.includes('comenz') || s.includes('shipping') || s.includes('order')) {
    return {
      category: 'shipping' as const,
      displayLabel: 'Comenzi & Livrare',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
      icon: Package,
      accent: 'from-emerald-500/20 to-teal-500/20 text-emerald-600'
    };
  }
  
  if (s.includes('parteneriat') || s.includes('b2b') || s.includes('sali') || s.includes('săli') || s.includes('gym') || s.includes('distributie') || s.includes('distribuție')) {
    return {
      category: 'b2b' as const,
      displayLabel: 'Parteneriate B2B / Săli',
      badgeClass: 'bg-purple-50 text-purple-700 border-purple-200/80',
      icon: Briefcase,
      accent: 'from-purple-500/20 to-indigo-500/20 text-purple-600'
    };
  }
  
  if (s.includes('general') || s === 'cerere generala' || s === 'cerere generală' || s.includes('inquiry')) {
    return {
      category: 'general' as const,
      displayLabel: 'Cerere Generală',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/80',
      icon: HelpCircle,
      accent: 'from-blue-500/20 to-cyan-500/20 text-blue-600'
    };
  }

  // Any other custom subject entered
  const customDetail = rawSubject.replace(/^altele\s*[:\-]?\s*/i, '').trim();
  return {
    category: 'other' as const,
    displayLabel: customDetail ? `Altele: ${customDetail}` : 'Altele',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200/80',
    icon: Tag,
    accent: 'from-rose-500/20 to-pink-500/20 text-rose-600'
  };
}

interface SubscriberItem {
  id: string;
  email: string;
  fullName: string;
  source: string;
  locale: string;
  isActive: boolean;
  date: string;
  subscribedAt: string;
}

interface ContactItem {
  id: string;
  name: string;
  email: string;
  rawSubject: string;
  subject: string;
  category: 'general' | 'support' | 'shipping' | 'b2b' | 'other';
  badgeClass: string;
  icon: any;
  accent: string;
  message: string;
  created_at: string;
  date: string;
}

export default function LeadsPage() {
  const [activeTab, setActiveTab] = useState<'contact' | 'subscribers'>('contact');
  const [subjectFilter, setSubjectFilter] = useState<'all' | 'general' | 'support' | 'shipping' | 'b2b' | 'other'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [subscribers, setSubscribers] = useState<SubscriberItem[]>([]);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Subscriber filters
  const [subSourceFilter, setSubSourceFilter] = useState<string>('all');
  const [subStatusFilter, setSubStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Quick Reply Modal
  const [replyModalContact, setReplyModalContact] = useState<ContactItem | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const handleCopy = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`${label} copiat!`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/data?action=leads');
      const json = await res.json();
      const data = json.data;
      
      const parsedContacts: ContactItem[] = (data.contactMessages || []).map((item: any) => {
        const rawMsg = item.message || '';
        const subjectMatch = rawMsg.match(/^\[Subiect:\s*(.*?)\]\s*\n*/i);
        let subject = 'Cerere Generală';
        let body = rawMsg;
        if (subjectMatch) {
          subject = subjectMatch[1].trim();
          body = rawMsg.substring(subjectMatch[0].length).trim();
        }

        // Exclude affiliate requests since they belong to /admin/affiliates
        const isAffiliate = (
          subject.toLowerCase().includes('afiliere') ||
          subject.toLowerCase().includes('affiliate') ||
          body.toLowerCase().includes('nouă cerere de afiliere') ||
          body.toLowerCase().includes('cerere de afiliere') ||
          body.toLowerCase().includes('secțiunea program afiliați') ||
          body.toLowerCase().includes('cod dorit:')
        );

        const classification = classifySubject(decodeHtml(subject));

        return {
          id: item.id,
          isAffiliate,
          name: decodeHtml(item.name || 'Vizitator'),
          email: item.email || '',
          rawSubject: decodeHtml(subject),
          subject: classification.displayLabel,
          category: classification.category,
          badgeClass: classification.badgeClass,
          icon: classification.icon,
          accent: classification.accent,
          message: decodeHtml(body),
          created_at: item.created_at,
          date: new Date(item.created_at || new Date()).toLocaleDateString('ro-RO', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        };
      }).filter((c: any) => !c.isAffiliate);

      const parsedSubscribers: SubscriberItem[] = (data.subscribers || []).map((item: any) => ({
        id: item.id,
        email: item.email,
        fullName: item.full_name || 'Anonim',
        source: item.source || 'direct',
        locale: item.locale || 'ro',
        isActive: item.is_active ?? true,
        subscribedAt: item.subscribed_at || new Date().toISOString(),
        date: new Date(item.subscribed_at || new Date()).toLocaleDateString('ro-RO', { 
          day: 'numeric', 
          month: 'short', 
          year: 'numeric' 
        })
      }));

      setContacts(parsedContacts);
      setSubscribers(parsedSubscribers);
    } catch (err) {
      console.error(err);
      toast.error('Eroare la încărcarea datelor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab, subjectFilter, subSourceFilter, subStatusFilter]);

  const handleDeleteContact = async (id: string, name: string) => {
    if (!confirm(`Sigur dorești să ștergi mesajul de la ${name}?`)) return;
    setDeletingId(id);
    try {
      await deleteContactMessage(id);
      setContacts(prev => prev.filter(c => c.id !== id));
      toast.success('Mesaj șters cu succes!');
    } catch (e: any) {
      toast.error('Eroare la ștergerea mesajului.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteSubscriber = async (id: string, email: string) => {
    if (!confirm(`Sigur dorești să ștergi abonatul ${email}?`)) return;
    setDeletingId(id);
    try {
      await deleteSubscriber(id);
      setSubscribers(prev => prev.filter(s => s.id !== id));
      toast.success('Abonat șters cu succes!');
    } catch (e: any) {
      toast.error('Eroare la ștergere.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleSubscriber = async (id: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      await toggleSubscriberActiveStatus(id, newStatus);
      setSubscribers(prev => prev.map(s => s.id === id ? { ...s, isActive: newStatus } : s));
      toast.success(newStatus ? 'Abonat reactivat!' : 'Abonat marcat inactiv.');
    } catch (err) {
      toast.error('Eroare la comutarea statusului.');
    }
  };

  // Quick Reply Action
  const handleOpenQuickReply = (contact: ContactItem) => {
    setReplyModalContact(contact);
    setReplyMessage(
      `Bună ziua, ${contact.name},\n\nÎți mulțumim pentru mesajul trimis referitor la "${contact.subject}".\n\n`
    );
  };

  const handleSendQuickReply = async () => {
    if (!replyModalContact || !replyMessage.trim()) {
      toast.error('Te rugăm să completezi mesajul de răspuns.');
      return;
    }

    setIsSendingReply(true);
    try {
      const res = await sendContactReply({
        toEmail: replyModalContact.email,
        clientName: replyModalContact.name,
        subject: replyModalContact.subject,
        replyMessage: replyMessage
      });

      if (res.success) {
        toast.success(`Răspuns expediat cu succes către ${replyModalContact.email}!`);
        setReplyModalContact(null);
        setReplyMessage('');
      } else {
        toast.error(res.error || 'Eroare la trimitere.');
      }
    } catch (err) {
      toast.error('Eroare de conexiune.');
    } finally {
      setIsSendingReply(false);
    }
  };

  // Preset templates for Quick Reply
  const applyPresetReply = (type: 'shipping' | 'sizing' | 'b2b') => {
    if (!replyModalContact) return;
    if (type === 'shipping') {
      setReplyMessage(
        `Bună ziua, ${replyModalContact.name},\n\nComenzile plasate pe TrenZone sunt procesate în 24 de ore și expediate prin Sameday Courier cu opțiune de livrare direct la ușă sau în rețeaua Easybox. Veți primi un SMS și email cu numărul de tracking AWB imediat ce coletul a fost preluat de curier.\n\nCu respect,\nEchipa TrenZone`
      );
    } else if (type === 'sizing') {
      setReplyMessage(
        `Bună ziua, ${replyModalContact.name},\n\nPentru Elbow Wraps Heavy-Duty X10 și X5, recomandarea de mărime se bazează pe circumferința antebrațului și a brațului relaxat. Modelul X10 oferă rigiditate maximă pentru recorduri personale și serii grele, în timp ce X5 este conceput pentru mobilitate sporită și volum mare de lucru.\n\nCu respect,\nEchipa TrenZone`
      );
    } else if (type === 'b2b') {
      setReplyMessage(
        `Bună ziua, ${replyModalContact.name},\n\nNe bucurăm pentru interesul acordat brandului TrenZone! Oferim pachete speciale B2B și discounturi de volum pentru cluburi de fitness, antrenori personali și distribuitori autorizați. Vă transmitem în atașament catalogul comercial actualizat.\n\nCu stimă,\nDepartamentul Parteneriate TrenZone`
      );
    }
  };

  // CSV Export for subscribers
  const handleExportCSV = () => {
    if (!subscribers.length) {
      toast.error('Nu există date de exportat.');
      return;
    }
    const headers = ['Email', 'Nume', 'Sursa', 'Limba', 'Status', 'Data Inscriere'];
    const rows = subscribers.map(s => [
      `"${s.email}"`,
      `"${s.fullName || ''}"`,
      `"${s.source}"`,
      `"${s.locale}"`,
      s.isActive ? '"Activ"' : '"Inactiv"',
      `"${s.date}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `trenzone_leads_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Fișier CSV descărcat!');
  };

  // Category counts for contact messages
  const categoryCounts = useMemo(() => {
    return {
      all: contacts.length,
      general: contacts.filter(c => c.category === 'general').length,
      support: contacts.filter(c => c.category === 'support').length,
      shipping: contacts.filter(c => c.category === 'shipping').length,
      b2b: contacts.filter(c => c.category === 'b2b').length,
      other: contacts.filter(c => c.category === 'other').length,
    };
  }, [contacts]);

  // Source counts for subscribers
  const subSourceCounts = useMemo(() => {
    const counts = { footer: 0, popup: 0, checkout: 0, modal: 0, other: 0 };
    subscribers.forEach(s => {
      const src = (s.source || '').toLowerCase();
      if (src.includes('footer')) counts.footer++;
      else if (src.includes('popup') || src.includes('scratch') || src.includes('promo')) counts.popup++;
      else if (src.includes('checkout')) counts.checkout++;
      else if (src.includes('modal')) counts.modal++;
      else counts.other++;
    });
    return counts;
  }, [subscribers]);

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

  // Filter Data based on active tab & category
  const filteredData = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (activeTab === 'contact') {
      let list = contacts;
      if (subjectFilter !== 'all') {
        list = list.filter(c => c.category === subjectFilter);
      }
      if (!q) return list;
      return list.filter(c => 
        c.name.toLowerCase().includes(q) || 
        c.email.toLowerCase().includes(q) ||
        c.subject.toLowerCase().includes(q) ||
        c.message.toLowerCase().includes(q)
      );
    }
    if (activeTab === 'subscribers') {
      let list = subscribers;
      if (subSourceFilter !== 'all') {
        list = list.filter(s => {
          const src = s.source.toLowerCase();
          if (subSourceFilter === 'footer') return src.includes('footer');
          if (subSourceFilter === 'popup') return src.includes('popup') || src.includes('scratch') || src.includes('promo');
          if (subSourceFilter === 'checkout') return src.includes('checkout');
          if (subSourceFilter === 'modal') return src.includes('modal');
          return true;
        });
      }
      if (subStatusFilter === 'active') {
        list = list.filter(s => s.isActive);
      } else if (subStatusFilter === 'inactive') {
        list = list.filter(s => !s.isActive);
      }
      if (!q) return list;
      return list.filter(s => 
        s.email.toLowerCase().includes(q) || 
        s.fullName.toLowerCase().includes(q)
      );
    }
    return [];
  }, [activeTab, contacts, subscribers, searchQuery, subjectFilter, subSourceFilter, subStatusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="animate-in fade-in duration-500 pb-24 text-slate-900 max-w-7xl mx-auto space-y-8">
      
      {/* 🌟 TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-black tracking-wider uppercase bg-[#e32f8c]/10 text-[#e32f8c] border border-[#e32f8c]/20">
              Lead & Contact Management
            </span>
            <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
              <Zap size={14} className="text-amber-500" /> Răspunsuri Rapide Active
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-950 tracking-tight mt-1">
            Contacte, Mesaje & Solicitări
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl font-medium">
            Gestionează mesajele primite din magazin, oportunitățile B2B și abonații la notificări din toate sursele.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => { fetchLeads(); toast.success('Date actualizate!'); }}
            className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
            title="Reîmprospătează datele"
          >
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
          </button>

          <Link
            href="/admin/marketing/broadcast"
            className="h-11 px-5 rounded-xl text-xs font-black uppercase tracking-wider bg-slate-900 hover:bg-black text-white transition-all flex items-center justify-center gap-2 flex-1 md:flex-none shadow-sm"
          >
            <Send size={15} className="text-[#e32f8c]" /> Deschide Broadcast
          </Link>
        </div>
      </div>

      {/* 📊 4 KPI STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Mesaje */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mesaje Contact</span>
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-600/20">
              <MessageSquare size={18} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">
            {contacts.length}
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            Solicitări primite prin formularul web
          </p>
        </div>

        {/* B2B Gym / Partner Leads */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Oportunități B2B</span>
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm shadow-purple-600/20">
              <Briefcase size={18} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">
            {categoryCounts.b2b}
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            Cereri en-gros, cluburi de fitness & săli
          </p>
        </div>

        {/* Suport & Comenzi */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Comenzi & Suport</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shadow-emerald-600/20">
              <Package size={18} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">
            {categoryCounts.shipping + categoryCounts.support}
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            Întrebări despre livrare, tracking și mărimi
          </p>
        </div>

        {/* Total Abonați Notificări */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Abonați Notificări</span>
            <div className="w-9 h-9 rounded-xl bg-[#e32f8c] text-white flex items-center justify-center shadow-sm shadow-[#e32f8c]/20">
              <BellRing size={18} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">
            {subscribers.length}
          </div>
          <div className="flex flex-wrap gap-1 mt-1.5">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
              Footer: {subSourceCounts.footer}
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
              Pop-up: {subSourceCounts.popup}
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700">
              Checkout: {subSourceCounts.checkout}
            </span>
          </div>
        </div>
      </div>

      {/* 🧭 NAVIGATION TABS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('contact')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            activeTab === 'contact'
              ? 'bg-slate-950 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <MessageSquare size={15} /> Mesaje Contact ({contacts.length})
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

        {activeTab === 'subscribers' && (
          <button
            onClick={handleExportCSV}
            className="ml-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <Download size={14} className="text-[#e32f8c]" /> Exportă CSV
          </button>
        )}
      </div>

      {/* 🔍 SEARCH & CATEGORY FILTERS */}
      <div className="space-y-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder={activeTab === 'contact' ? "Caută după nume, email sau mesaj..." : "Caută email sau nume abonat..."} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-9 text-xs font-semibold focus:outline-none focus:border-[#e32f8c] shadow-2xs transition-colors"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Tab 1: Category Filters */}
        {activeTab === 'contact' && (
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'Toate', count: categoryCounts.all, cls: 'bg-slate-900 text-white' },
              { id: 'general', label: 'Cerere Generală', count: categoryCounts.general, cls: 'bg-blue-600 text-white' },
              { id: 'support', label: 'Suport Tehnic', count: categoryCounts.support, cls: 'bg-amber-600 text-white' },
              { id: 'shipping', label: 'Comenzi & Livrare', count: categoryCounts.shipping, cls: 'bg-emerald-600 text-white' },
              { id: 'b2b', label: 'Parteneriate B2B / Săli', count: categoryCounts.b2b, cls: 'bg-purple-600 text-white' },
              { id: 'other', label: 'Altele', count: categoryCounts.other, cls: 'bg-rose-600 text-white' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setSubjectFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                  subjectFilter === f.id
                    ? f.cls
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>{f.label}</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                  subjectFilter === f.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Tab 2: Subscriber Source & Status Filters */}
        {activeTab === 'subscribers' && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-black uppercase text-slate-400 mr-1">Sursă:</span>
            {[
              { id: 'all', label: `Toate (${subscribers.length})` },
              { id: 'footer', label: `Footer (${subSourceCounts.footer})` },
              { id: 'popup', label: `Pop-up (${subSourceCounts.popup})` },
              { id: 'checkout', label: `Checkout (${subSourceCounts.checkout})` },
              { id: 'modal', label: `Modal (${subSourceCounts.modal})` },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setSubSourceFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  subSourceFilter === f.id
                    ? 'bg-[#e32f8c] text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}

            <div className="ml-auto flex items-center gap-1.5">
              <span className="text-[11px] font-black uppercase text-slate-400">Status:</span>
              <button
                onClick={() => setSubStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold ${subStatusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
              >
                Toți
              </button>
              <button
                onClick={() => setSubStatusFilter('active')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold ${subStatusFilter === 'active' ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
              >
                Activi
              </button>
              <button
                onClick={() => setSubStatusFilter('inactive')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold ${subStatusFilter === 'inactive' ? 'bg-rose-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
              >
                Inactivi
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 📩 CONTENT AREA */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#e32f8c]" />
          <p className="text-xs font-bold text-slate-400">Se încarcă datele...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: MESAJE CONTACT */}
          {activeTab === 'contact' && (
            <div className="space-y-4">
              {paginatedData.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center max-w-xl mx-auto shadow-sm">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <MessageSquare size={24} />
                  </div>
                  <h3 className="text-base font-black text-slate-900">Niciun mesaj găsit</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {searchQuery || subjectFilter !== 'all' ? 'Nu există mesaje care să corespundă căutării.' : 'Nu există mesaje noi primite prin formular.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {(paginatedData as ContactItem[]).map((contact: ContactItem) => {
                    const CategoryIcon = contact.icon;
                    return (
                      <div 
                        key={contact.id} 
                        className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 md:p-6 shadow-sm hover:shadow-md transition-all space-y-4 group"
                      >
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${contact.accent} flex items-center justify-center font-black text-sm shrink-0 shadow-sm`}>
                              <CategoryIcon size={18} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm md:text-base font-black text-slate-900 leading-tight">
                                  {contact.name}
                                </h3>
                                <span className={`inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${contact.badgeClass}`}>
                                  {contact.subject}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 font-medium">
                                <span className="break-all font-semibold">{contact.email}</span>
                                <button
                                  onClick={() => handleCopy(contact.email, `email-${contact.id}`, 'Email')}
                                  className="text-slate-400 hover:text-slate-900 p-0.5 shrink-0"
                                  title="Copiază email"
                                >
                                  {copiedKey === `email-${contact.id}` ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold shrink-0 self-end sm:self-auto bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                            <Clock size={12} />
                            <span>{contact.date}</span>
                          </div>
                        </div>

                        {/* Message Body */}
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs md:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-medium break-words">
                          {contact.message}
                        </div>

                        {/* Action Bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* In-App Quick Reply */}
                            <button
                              onClick={() => handleOpenQuickReply(contact)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-950 hover:bg-black text-white text-xs font-black uppercase tracking-wider shadow-sm transition-all active:scale-95"
                            >
                              <Send size={13} className="text-[#e32f8c]" />
                              <span>Răspunde Rapid</span>
                            </button>

                            {/* External Mailto fallback */}
                            <a
                              href={`mailto:${contact.email}?subject=Re: ${encodeURIComponent(contact.subject)}`}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                              title="Deschide în clientul tău de email (Outlook, Thunderbird, etc.)"
                            >
                              <ExternalLink size={13} />
                              <span className="hidden sm:inline">Deschide Mailto</span>
                            </a>

                            {/* Copy Message */}
                            <button
                              type="button"
                              onClick={() => handleCopy(contact.message, `msg-${contact.id}`, 'Mesajul')}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                            >
                              {copiedKey === `msg-${contact.id}` ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                              <span>Copiază Text</span>
                            </button>
                          </div>

                          <div className="flex items-center justify-end self-end sm:self-auto ml-auto">
                            <button
                              type="button"
                              onClick={() => handleDeleteContact(contact.id, contact.name)}
                              disabled={deletingId === contact.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200/60 transition-all disabled:opacity-50"
                              title="Șterge mesajul"
                            >
                              {deletingId === contact.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                              <span>Șterge</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ABONAȚI NOTIFICĂRI */}
          {activeTab === 'subscribers' && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              {paginatedData.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-sm font-bold">
                  {searchQuery ? 'Niciun abonat nu corespunde filtrelor selectate.' : 'Nu există abonați înregistrați încă.'}
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-black uppercase tracking-wider">
                        <tr>
                          <th className="py-3.5 px-6">Abonat</th>
                          <th className="py-3.5 px-6">Proveniență / Sursă</th>
                          <th className="py-3.5 px-6">Limbă</th>
                          <th className="py-3.5 px-6">Data Înscrierii</th>
                          <th className="py-3.5 px-6">Status Notificări</th>
                          <th className="py-3.5 px-6 text-right">Acțiuni</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(paginatedData as SubscriberItem[]).map((sub: SubscriberItem) => (
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
                              {sub.date}
                            </td>
                            <td className="py-4 px-6">
                              <button
                                onClick={() => handleToggleSubscriber(sub.id, sub.isActive)}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all ${
                                  sub.isActive 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                                    : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                }`}
                                title="Click pentru comutare status"
                              >
                                {sub.isActive ? '● Activ' : '○ Inactiv'}
                              </button>
                            </td>
                            <td className="py-4 px-6 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleCopy(sub.email, `sub-${sub.id}`, 'Email')}
                                  className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                                  title="Copiază email"
                                >
                                  {copiedKey === `sub-${sub.id}` ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                </button>
                                <button
                                  onClick={() => handleDeleteSubscriber(sub.id, sub.email)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Șterge abonat"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards View */}
                  <div className="md:hidden divide-y divide-slate-100">
                    {(paginatedData as SubscriberItem[]).map((sub: SubscriberItem) => (
                      <div key={sub.id} className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-bold text-slate-900 text-xs break-all">{sub.email}</p>
                            <p className="text-[11px] text-slate-400">{sub.fullName}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleCopy(sub.email, `sub-${sub.id}`, 'Email')}
                              className="p-1 text-slate-400"
                            >
                              <Copy size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteSubscriber(sub.id, sub.email)}
                              className="p-1 text-slate-300 hover:text-red-600"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          {renderSourceBadge(sub.source)}
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
                </>
              )}
            </div>
          )}

          {/* 📄 PAGINATION */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
              <span className="text-xs font-bold text-slate-500">
                Pagina <span className="font-black text-slate-900">{currentPage}</span> din <span className="font-black text-slate-900">{totalPages}</span>
              </span>
              <div className="flex gap-2">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="px-3.5 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Înapoi
                </button>
                <button 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="px-3.5 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Înainte
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* ⚡ MODAL: IN-APP QUICK REPLY */}
      {/* ========================================================================= */}
      {replyModalContact && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#e32f8c] flex items-center gap-1">
                  <Zap size={12} /> Răspuns Rapid pe Email
                </span>
                <h3 className="text-base font-black text-slate-900 mt-0.5">
                  Către: {replyModalContact.name} ({replyModalContact.email})
                </h3>
              </div>
              <button
                onClick={() => setReplyModalContact(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              
              {/* Context Summary */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
                <p className="text-slate-500 font-bold">Mesajul original al clientului:</p>
                <p className="text-slate-700 italic line-clamp-2">{replyModalContact.message}</p>
              </div>

              {/* Quick Template Snippets */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-black uppercase text-slate-400">Șabloane Rapide:</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyPresetReply('shipping')}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  >
                    📦 Livrare & Tracking
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetReply('sizing')}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  >
                    📏 Mărimi & Suport Tehnic
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetReply('b2b')}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  >
                    🤝 Parteneriat B2B / Săli
                  </button>
                </div>
              </div>

              {/* Reply Textarea */}
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Conținut Răspuns Email *
                </span>
                <textarea
                  rows={6}
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-medium leading-relaxed focus:outline-none focus:border-[#e32f8c] focus:bg-white transition-all"
                  placeholder="Scrie răspunsul tău aici..."
                />
              </div>

              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200/80 text-[11px] text-blue-700">
                Emailul va fi trimis direct pe adresa clientului prin serviciul Resend, cu antet oficial TrenZone și posibilitate de reply.
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setReplyModalContact(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100"
              >
                Anulează
              </button>
              <button
                type="button"
                disabled={isSendingReply || !replyMessage.trim()}
                onClick={handleSendQuickReply}
                className="px-6 py-2.5 rounded-xl bg-slate-950 hover:bg-black text-white font-black text-xs uppercase tracking-wider shadow-sm flex items-center gap-2 disabled:opacity-50 transition-all"
              >
                {isSendingReply ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Se expediază...
                  </>
                ) : (
                  <>
                    <Send size={14} className="text-[#e32f8c]" /> Trimite Răspunsul
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
