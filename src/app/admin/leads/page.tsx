"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Mail,
  MessageSquare,
  Search,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Send,
  Clock,
  Tag,
  Loader2,
  X,
  BellRing,
  RefreshCw,
  Briefcase,
  Wrench,
  HelpCircle,
  Package,
  Ruler,
  Building2,
  ArrowUpRight,
  type LucideIcon,
} from 'lucide-react';
import { deleteContactMessage } from '@/app/actions/admin-data';
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

  if (
    s.includes('suport') ||
    s.includes('reclamatii') ||
    s.includes('reclamații') ||
    s.includes('support') ||
    s.includes('tehnic') ||
    s.includes('marime') ||
    s.includes('mărime')
  ) {
    return {
      category: 'support' as const,
      displayLabel: 'Suport Tehnic & Mărimi',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
      icon: Wrench,
      accent: 'from-amber-500/20 to-orange-500/20 text-amber-600',
    };
  }

  if (
    s.includes('livrare') ||
    s.includes('comenz') ||
    s.includes('shipping') ||
    s.includes('order')
  ) {
    return {
      category: 'shipping' as const,
      displayLabel: 'Comenzi & Livrare',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
      icon: Package,
      accent: 'from-emerald-500/20 to-teal-500/20 text-emerald-600',
    };
  }

  if (
    s.includes('parteneriat') ||
    s.includes('b2b') ||
    s.includes('sali') ||
    s.includes('săli') ||
    s.includes('gym') ||
    s.includes('distributie') ||
    s.includes('distribuție')
  ) {
    return {
      category: 'b2b' as const,
      displayLabel: 'Parteneriate B2B / Săli',
      badgeClass: 'bg-purple-50 text-purple-700 border-purple-200/80',
      icon: Briefcase,
      accent: 'from-purple-500/20 to-indigo-500/20 text-purple-600',
    };
  }

  if (
    s.includes('general') ||
    s === 'cerere generala' ||
    s === 'cerere generală' ||
    s.includes('inquiry')
  ) {
    return {
      category: 'general' as const,
      displayLabel: 'Cerere Generală',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/80',
      icon: HelpCircle,
      accent: 'from-blue-500/20 to-cyan-500/20 text-blue-600',
    };
  }

  const customDetail = rawSubject.replace(/^altele\s*[:\-]?\s*/i, '').trim();
  return {
    category: 'other' as const,
    displayLabel: customDetail ? `Altele: ${customDetail}` : 'Altele',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200/80',
    icon: Tag,
    accent: 'from-rose-500/20 to-pink-500/20 text-rose-600',
  };
}

interface ContactItem {
  id: string;
  name: string;
  email: string;
  rawSubject: string;
  subject: string;
  category: 'general' | 'support' | 'shipping' | 'b2b' | 'other';
  badgeClass: string;
  icon: LucideIcon;
  accent: string;
  message: string;
  created_at: string;
  date: string;
}

export default function ContactMessagesPage() {
  const router = useRouter();
  const [redirectingToSubscribers, setRedirectingToSubscribers] = useState(false);

  const [subjectFilter, setSubjectFilter] = useState<
    'all' | 'general' | 'support' | 'shipping' | 'b2b' | 'other'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Quick Reply Modal
  const [replyModalContact, setReplyModalContact] = useState<ContactItem | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'subscribers') {
        setRedirectingToSubscribers(true);
        router.replace('/admin/marketing/broadcast?tab=subscribers');
      }
    }
  }, [router]);

  const handleCopy = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`${label} copiat!`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const fetchContactMessages = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/data?action=leads');
      const json = await res.json();
      const data = json.data || {};

      const parsedContacts: ContactItem[] = (data.contactMessages || [])
        .map((item: any) => {
          const rawMsg = item.message || '';
          const subjectMatch = rawMsg.match(/^\[Subiect:\s*(.*?)\]\s*\n*/i);
          let subject = 'Cerere Generală';
          let body = rawMsg;
          if (subjectMatch) {
            subject = subjectMatch[1].trim();
            body = rawMsg.substring(subjectMatch[0].length).trim();
          }

          // Exclude affiliate requests since they belong to /admin/affiliates
          const isAffiliate =
            subject.toLowerCase().includes('afiliere') ||
            subject.toLowerCase().includes('affiliate') ||
            body.toLowerCase().includes('nouă cerere de afiliere') ||
            body.toLowerCase().includes('cerere de afiliere') ||
            body.toLowerCase().includes('secțiunea program afiliați') ||
            body.toLowerCase().includes('cod dorit:');

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
              minute: '2-digit',
            }),
          };
        })
        .filter((c: any) => !c.isAffiliate);

      setContacts(parsedContacts);
    } catch (err) {
      console.error(err);
      toast.error('Eroare la încărcarea mesajelor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!redirectingToSubscribers) {
      fetchContactMessages();
    }
  }, [redirectingToSubscribers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, subjectFilter]);

  const handleDeleteContact = async (id: string, name: string) => {
    if (deletingId) return;
    if (!confirm(`Sigur dorești să ștergi mesajul de la ${name}?`)) return;
    setDeletingId(id);
    try {
      await deleteContactMessage(id);
      setContacts((prev) => prev.filter((c) => c.id !== id));
      toast.success('Mesaj șters cu succes!');
    } catch {
      toast.error('Eroare la ștergerea mesajului.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenQuickReply = (contact: ContactItem) => {
    setReplyModalContact(contact);
    setReplyMessage(
      `Bună ziua, ${contact.name},\n\nÎți mulțumim pentru mesajul trimis referitor la "${contact.subject}".\n\n`
    );
  };

  const handleSendQuickReply = async () => {
    if (isSendingReply) return;
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
        replyMessage,
      });

      if (res.success) {
        toast.success(`Răspuns expediat cu succes către ${replyModalContact.email}!`);
        setReplyModalContact(null);
        setReplyMessage('');
      } else {
        toast.error(res.error || 'Eroare la trimitere.');
      }
    } catch {
      toast.error('Eroare de conexiune.');
    } finally {
      setIsSendingReply(false);
    }
  };

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

  const categoryCounts = useMemo(() => {
    return {
      all: contacts.length,
      general: contacts.filter((c) => c.category === 'general').length,
      support: contacts.filter((c) => c.category === 'support').length,
      shipping: contacts.filter((c) => c.category === 'shipping').length,
      b2b: contacts.filter((c) => c.category === 'b2b').length,
      other: contacts.filter((c) => c.category === 'other').length,
    };
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let list = contacts;
    if (subjectFilter !== 'all') {
      list = list.filter((c) => c.category === subjectFilter);
    }
    if (!q) return list;
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.subject.toLowerCase().includes(q) ||
        c.message.toLowerCase().includes(q)
    );
  }, [contacts, searchQuery, subjectFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredContacts.length / itemsPerPage));
  const paginatedContacts = filteredContacts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (redirectingToSubscribers) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[#e32f8c]/10 text-[#e32f8c] flex items-center justify-center mx-auto">
          <BellRing size={22} />
        </div>
        <h1 className="text-lg font-black text-slate-900">
          Abonații s-au mutat în Campanii Email & Abonați
        </h1>
        <p className="text-xs text-slate-500">
          Te redirecționăm către secțiunea dedicată abonaților și campaniilor newsletter.
        </p>
        <Link
          href="/admin/marketing/broadcast?tab=subscribers"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-950 text-white text-xs font-black uppercase tracking-wider"
        >
          Deschide Abonații <ArrowUpRight size={14} />
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 pb-24 text-slate-900 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* TOP HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-black tracking-wider uppercase bg-[#e32f8c]/10 text-[#e32f8c] border border-[#e32f8c]/20">
              Inbox Mesaje Contact & B2B
            </span>
            <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
              <Mail size={13} className="text-emerald-600" /> Răspunsuri Rapide Active
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-950 tracking-tight mt-1.5">
            Mesaje Contact
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl font-medium">
            Gestionează solicitările primite din formularul de contact, întrebările despre comenzi și parteneriatele B2B.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full lg:w-auto flex-wrap sm:flex-nowrap">
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              fetchContactMessages();
              toast.success('Mesaje actualizate!');
            }}
            className="h-11 w-11 shrink-0 text-slate-500 hover:text-slate-800 hover:bg-slate-100 active:scale-[0.98] bg-white rounded-xl border border-slate-200 transition-all flex items-center justify-center cursor-pointer disabled:opacity-50"
            title="Reîmprospătează mesajele"
            aria-label="Reîmprospătează mesajele"
          >
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
          </button>

          <Link
            href="/admin/marketing/broadcast?tab=subscribers"
            className="min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-black tracking-wide bg-slate-950 hover:bg-black text-white transition-all flex items-center justify-center gap-2 flex-1 sm:flex-initial shadow-xs"
          >
            <BellRing size={14} className="text-[#ff6eb6] shrink-0" />
            <span className="truncate">Gestionează Abonații în Campanii</span>
            <ArrowUpRight size={14} className="text-zinc-400 shrink-0" />
          </Link>
        </div>
      </div>

      {/* 4 KPI STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2.5 gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
              Mesaje Contact
            </span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <MessageSquare size={16} />
            </div>
          </div>
          {loading ? (
            <div className="h-8 w-16 bg-slate-200 rounded-lg animate-pulse my-0.5" />
          ) : (
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight tabular-nums">
              {contacts.length}
            </div>
          )}
          <p className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">
            Solicitări primite prin formularul web
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2.5 gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
              Oportunități B2B
            </span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Briefcase size={16} />
            </div>
          </div>
          {loading ? (
            <div className="h-8 w-14 bg-slate-200 rounded-lg animate-pulse my-0.5" />
          ) : (
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight tabular-nums">
              {categoryCounts.b2b}
            </div>
          )}
          <p className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">
            Cereri en-gros, cluburi fitness & săli
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2.5 gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
              Comenzi & Suport
            </span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Package size={16} />
            </div>
          </div>
          {loading ? (
            <div className="h-8 w-14 bg-slate-200 rounded-lg animate-pulse my-0.5" />
          ) : (
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight tabular-nums">
              {categoryCounts.shipping + categoryCounts.support}
            </div>
          )}
          <p className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">
            Întrebări livrare, tracking & mărimi
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2.5 gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
              Cereri Generale
            </span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#e32f8c] text-white flex items-center justify-center shrink-0 shadow-xs">
              <HelpCircle size={16} />
            </div>
          </div>
          {loading ? (
            <div className="h-8 w-14 bg-slate-200 rounded-lg animate-pulse my-0.5" />
          ) : (
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight tabular-nums">
              {categoryCounts.general + categoryCounts.other}
            </div>
          )}
          <p className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">
            Întrebări generale & alte subiecte
          </p>
        </div>
      </div>

      {/* SEARCH & CATEGORY FILTERS */}
      <div className="space-y-3.5 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Caută după nume, email sau mesaj..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-9 text-xs font-semibold focus:outline-none focus:border-[#e32f8c] focus:bg-white transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              aria-label="Șterge căutarea"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: 'Toate', count: categoryCounts.all, cls: 'bg-slate-900 text-white' },
            { id: 'general', label: 'Cerere Generală', count: categoryCounts.general, cls: 'bg-blue-600 text-white' },
            { id: 'support', label: 'Suport Tehnic', count: categoryCounts.support, cls: 'bg-amber-600 text-white' },
            { id: 'shipping', label: 'Comenzi & Livrare', count: categoryCounts.shipping, cls: 'bg-emerald-600 text-white' },
            { id: 'b2b', label: 'Parteneriate B2B', count: categoryCounts.b2b, cls: 'bg-purple-600 text-white' },
            { id: 'other', label: 'Altele', count: categoryCounts.other, cls: 'bg-rose-600 text-white' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSubjectFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                subjectFilter === f.id
                  ? f.cls
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              <span>{f.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-black tabular-nums ${
                  subjectFilter === f.id ? 'bg-white/20 text-white' : 'bg-white text-slate-700'
                }`}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* MESSAGES LIST */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 animate-pulse">
          {[...Array(4)].map((_, idx) => (
            <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-slate-200 shrink-0" />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-36 bg-slate-200 rounded" />
                      <div className="h-5 w-28 bg-slate-100 rounded-full" />
                    </div>
                    <div className="h-3.5 w-48 bg-slate-100 rounded" />
                  </div>
                </div>
                <div className="h-7 w-32 bg-slate-100 rounded-lg shrink-0" />
              </div>
              <div className="h-20 bg-slate-50 border border-slate-100 rounded-xl" />
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-36 bg-slate-200 rounded-xl" />
                  <div className="h-9 w-24 bg-slate-100 rounded-xl" />
                </div>
                <div className="h-9 w-20 bg-slate-100 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedContacts.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-10 sm:p-12 text-center max-w-xl mx-auto shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <MessageSquare size={24} />
              </div>
              <h3 className="text-base font-black text-slate-900">Niciun mesaj găsit</h3>
              <p className="text-xs text-slate-500 mt-1">
                {searchQuery || subjectFilter !== 'all'
                  ? 'Nu există mesaje care să corespundă filtrelor selectate.'
                  : 'Nu există mesaje noi primite prin formularul de contact.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {paginatedContacts.map((contact) => {
                const CategoryIcon = contact.icon;
                return (
                  <div
                    key={contact.id}
                    className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-4 sm:p-6 shadow-xs hover:shadow-md transition-all space-y-4"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr ${contact.accent} flex items-center justify-center shrink-0 shadow-2xs`}
                        >
                          <CategoryIcon size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight break-words">
                              {contact.name}
                            </h3>
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${contact.badgeClass}`}
                            >
                              {contact.subject}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 font-medium">
                            <span className="break-all font-semibold">{contact.email}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(contact.email, `email-${contact.id}`, 'Email')}
                              className="text-slate-400 hover:text-slate-900 p-1 shrink-0 cursor-pointer"
                              title="Copiază email"
                            >
                              {copiedKey === `email-${contact.id}` ? (
                                <Check size={12} className="text-emerald-500" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold shrink-0 self-start sm:self-auto bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                        <Clock size={12} />
                        <span>{contact.date}</span>
                      </div>
                    </div>

                    {/* Message Body */}
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 sm:p-4 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-medium break-words">
                      {contact.message}
                    </div>

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleOpenQuickReply(contact)}
                          className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-slate-950 hover:bg-black text-white text-xs font-black uppercase tracking-wider shadow-xs transition-all active:scale-95 cursor-pointer"
                        >
                          <Send size={13} className="text-[#ff6eb6]" />
                          <span>Răspunde Rapid</span>
                        </button>

                        <a
                          href={`mailto:${contact.email}?subject=Re: ${encodeURIComponent(contact.subject)}`}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                          title="Deschide în clientul tău de email"
                        >
                          <ExternalLink size={13} />
                          <span>Mailto</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => handleCopy(contact.message, `msg-${contact.id}`, 'Mesajul')}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                        >
                          {copiedKey === `msg-${contact.id}` ? (
                            <Check size={13} className="text-emerald-600" />
                          ) : (
                            <Copy size={13} />
                          )}
                          <span className="hidden sm:inline">Copiază Text</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteContact(contact.id, contact.name)}
                        disabled={deletingId === contact.id}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 active:scale-[0.98] border border-red-200/60 transition-all disabled:opacity-50 cursor-pointer ml-auto"
                        title="Șterge mesajul"
                      >
                        {deletingId === contact.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Trash2 size={13} />
                        )}
                        <span>{deletingId === contact.id ? 'Se șterge...' : 'Șterge'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
              <span className="text-xs font-bold text-slate-500">
                Pagina <span className="font-black text-slate-900">{currentPage}</span> din{' '}
                <span className="font-black text-slate-900">{totalPages}</span>
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3.5 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Înapoi
                </button>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3.5 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Înainte
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: IN-APP QUICK REPLY */}
      {replyModalContact && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-xl w-full max-h-[92dvh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50">
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#e32f8c] flex items-center gap-1">
                  <Send size={11} /> Răspuns Rapid pe Email
                </span>
                <h3 className="text-sm sm:text-base font-black text-slate-900 mt-0.5 break-words">
                  Către: {replyModalContact.name}
                </h3>
                <p className="text-xs text-slate-500 font-semibold break-all">
                  {replyModalContact.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReplyModalContact(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors shrink-0 cursor-pointer"
                aria-label="Închide fereastra"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
              {/* Context Summary */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
                <p className="text-slate-500 font-bold">Mesajul original al clientului:</p>
                <p className="text-slate-700 italic line-clamp-3 break-words">
                  {replyModalContact.message}
                </p>
              </div>

              {/* Quick Template Snippets */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-black uppercase text-slate-400">
                  Șabloane Rapide:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyPresetReply('shipping')}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                  >
                    <Package size={13} className="text-emerald-600" />
                    <span>Livrare & Tracking</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetReply('sizing')}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                  >
                    <Ruler size={13} className="text-amber-600" />
                    <span>Mărimi & Suport Tehnic</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetReply('b2b')}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                  >
                    <Building2 size={13} className="text-purple-600" />
                    <span>Parteneriat B2B / Săli</span>
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-4 text-xs font-medium leading-relaxed focus:outline-none focus:border-[#e32f8c] focus:bg-white transition-all"
                  placeholder="Scrie răspunsul tău aici..."
                />
              </div>

              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200/80 text-[11px] text-blue-700">
                Emailul va fi trimis direct pe adresa clientului prin serviciul Resend, cu antet oficial TrenZone și posibilitate de reply.
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setReplyModalContact(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                Anulează
              </button>
              <button
                type="button"
                disabled={isSendingReply || !replyMessage.trim()}
                onClick={handleSendQuickReply}
                className="flex-1 sm:flex-initial justify-center px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-black active:scale-[0.98] text-white font-black text-xs uppercase tracking-wider shadow-xs flex items-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSendingReply ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Se expediază...
                  </>
                ) : (
                  <>
                    <Send size={14} className="text-[#ff6eb6]" /> Trimite Răspunsul
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
