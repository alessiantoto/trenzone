"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { 
  ShoppingCart, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  Package, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  RotateCcw, 
  Trash2, 
  Copy, 
  Check, 
  ExternalLink, 
  Send, 
  Play, 
  MessageCircle, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertTriangle, 
  ArrowUpDown, 
  X, 
  RefreshCw, 
  Download, 
  CheckCircle,
  HelpCircle,
  Percent,
  Truck,
  Ticket,
  Tag,
  Plus,
  Gift,
  Zap,
  ChevronRight,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { 
  getAdminAbandonedCarts, 
  sendManualRecoveryEmail, 
  updateAbandonedCartStatus, 
  deleteAbandonedCartSession,
  runAbandonedCartsAutomation,
  updateAbandoned72hDefaultCoupon,
  FormattedAbandonedCart,
  AbandonedCartsStats,
  AvailableRecoveryCoupon
} from '@/app/actions/abandoned-carts';
import { getOptimizedImageUrl } from '@/lib/utils/imageProxy';
import { getSingleFlavorImage, resolveItemImage } from '@/lib/product-images';
import { getItemDisplayDetails } from '@/app/admin/orders/page';

type FilterStatus = 'all' | 'ready_to_send' | 'sent' | 'abandoned' | 'active' | 'recovered';
type SortOrder = 'newest' | 'oldest' | 'highest' | 'lowest';
type DateFilter = 'all' | 'today' | '7days' | '30days';

export function getCartRecoveryStatus(cart: FormattedAbandonedCart) {
  const now = Date.now();
  const sessionDate = new Date(cart.updatedAt || cart.createdAt).getTime();
  const hoursSince = (now - sessionDate) / (1000 * 60 * 60);

  const sent24h = Boolean(cart.recoveryEmailsSent?.['24h']);
  const sent24hAt = cart.recoveryEmailsSent?.['24h_sent_at'];
  const sent72h = Boolean(cart.recoveryEmailsSent?.['72h']);
  const sent72hAt = cart.recoveryEmailsSent?.['72h_sent_at'];
  const lastCouponCode = cart.recoveryEmailsSent?.last_coupon_code;
  const lastCouponValue = cart.recoveryEmailsSent?.last_coupon_value;
  const isManual = Boolean(cart.recoveryEmailsSent?.manual);
  const hasEmail = Boolean(cart.customer.email);

  if (cart.status === 'recovered' || cart.status === 'completed') {
    return {
      stage: 'recovered' as const,
      badgeText: 'Recuperat',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      actionTitle: 'Comandă finalizată cu succes!',
      actionSubtitle: 'Clientul a revenit pe site și a plasat comanda.',
      isReadyToSend: false,
      readyType: null,
      sent24h,
      sent24hAt,
      sent72h,
      sent72hAt,
      lastCouponCode,
      lastCouponValue,
      isManual
    };
  }

  if (cart.status === 'active') {
    return {
      stage: 'active' as const,
      badgeText: 'În Navigare (<30m)',
      badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-300',
      actionTitle: 'Sesiune activă în timp real',
      actionSubtitle: 'Clientul se află în checkout sau a navigat recent. Nu se trimite email acum.',
      isReadyToSend: false,
      readyType: null,
      sent24h,
      sent24hAt,
      sent72h,
      sent72hAt,
      lastCouponCode,
      lastCouponValue,
      isManual
    };
  }

  if (!hasEmail) {
    return {
      stage: 'no_email' as const,
      badgeText: 'Fără Email',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      actionTitle: 'Email necompletat',
      actionSubtitle: cart.customer.phone 
        ? 'Clientul a lăsat număr de telefon. Poți iniția contact direct pe WhatsApp sau telefonic.' 
        : 'Sesiune abandonată înainte de completarea formularului de contact.',
      isReadyToSend: false,
      readyType: null,
      sent24h: false,
      sent24hAt: null,
      sent72h: false,
      sent72hAt: null,
      lastCouponCode: null,
      lastCouponValue: null,
      isManual: false
    };
  }

  if (sent24h && sent72h) {
    return {
      stage: 'sequence_finished' as const,
      badgeText: 'Secvență Trimisă (2/2)',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
      actionTitle: 'Secvență completă de emailuri trimisă',
      actionSubtitle: `A primit Reminderul 24h și Oferta 72h${lastCouponCode ? ` (Cupon: ${lastCouponCode} -${lastCouponValue}%)` : ''}. Fără alte trimiteri automate.`,
      isReadyToSend: false,
      readyType: null,
      sent24h,
      sent24hAt,
      sent72h,
      sent72hAt,
      lastCouponCode,
      lastCouponValue,
      isManual
    };
  }

  if (sent24h && !sent72h) {
    if (hoursSince >= 72) {
      return {
        stage: 'ready_72h' as const,
        badgeText: '⚡ Trimite Oferta 72h',
        badgeColor: 'bg-purple-600 text-white border-purple-700 animate-pulse',
        actionTitle: '⚡ Eligibil acum pentru Pasul 2: Oferta 72h cu Cupon',
        actionSubtitle: 'Au trecut peste 3 zile. Apasă "Trimite reducere" sau se va trimite automat prin cronul zilnic.',
        isReadyToSend: true,
        readyType: '72h' as const,
        sent24h,
        sent24hAt,
        sent72h: false,
        sent72hAt: null,
        lastCouponCode,
        lastCouponValue,
        isManual
      };
    } else {
      const rem = Math.max(1, Math.round(72 - hoursSince));
      return {
        stage: 'waiting_72h' as const,
        badgeText: `Urmează 72h în ~${rem}h`,
        badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
        actionTitle: `Reminderul 24h a fost trimis. Urmează Oferta 72h în ~${rem} ore`,
        actionSubtitle: 'Oferta cu reducere se va trimite automat de sistem dacă nu plasează comanda între timp.',
        isReadyToSend: false,
        readyType: null,
        sent24h,
        sent24hAt,
        sent72h: false,
        sent72hAt: null,
        lastCouponCode,
        lastCouponValue,
        isManual
      };
    }
  }

  if (!sent24h && !sent72h) {
    if (hoursSince >= 24) {
      return {
        stage: 'ready_24h' as const,
        badgeText: '⚡ Trimite Reminder 24h',
        badgeColor: 'bg-orange-600 text-white border-orange-700 animate-pulse',
        actionTitle: '⚡ Eligibil acum pentru Pasul 1: Reminder 24h',
        actionSubtitle: 'Au trecut peste 24h de la abandon. Apasă "Trimite 24h" sau se va trimite automat prin cronul zilnic.',
        isReadyToSend: true,
        readyType: '24h' as const,
        sent24h: false,
        sent24hAt: null,
        sent72h: false,
        sent72hAt: null,
        lastCouponCode: null,
        lastCouponValue: null,
        isManual: false
      };
    } else {
      const rem = Math.max(1, Math.round(24 - hoursSince));
      return {
        stage: 'waiting_24h' as const,
        badgeText: `Urmează 24h în ~${rem}h`,
        badgeColor: 'bg-slate-100 text-slate-600 border-slate-300',
        actionTitle: `Coș abandonat recent. Primul reminder va fi trimis în ~${rem} ore`,
        actionSubtitle: 'Lăsăm clientul să finalizeze liniștit în primele 24 de ore înainte de prima notificare.',
        isReadyToSend: false,
        readyType: null,
        sent24h: false,
        sent24hAt: null,
        sent72h: false,
        sent72hAt: null,
        lastCouponCode: null,
        lastCouponValue: null,
        isManual: false
      };
    }
  }

  return {
    stage: 'unknown' as const,
    badgeText: 'În Așteptare',
    badgeColor: 'bg-slate-100 text-slate-600',
    actionTitle: 'Status în așteptare',
    actionSubtitle: '',
    isReadyToSend: false,
    readyType: null,
    sent24h: false,
    sent24hAt: null,
    sent72h: false,
    sent72hAt: null,
    lastCouponCode: null,
    lastCouponValue: null,
    isManual: false
  };
}

export default function AbandonedCartsPage() {
  const [carts, setCarts] = useState<FormattedAbandonedCart[]>([]);
  const [stats, setStats] = useState<AbandonedCartsStats | null>(null);
  const [availableCoupons, setAvailableCoupons] = useState<AvailableRecoveryCoupon[]>([]);
  const [default72hCoupon, setDefault72hCoupon] = useState<string>('TREN10');
  const [updatingCoupon, setUpdatingCoupon] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [runningAutomation, setRunningAutomation] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [onlyWithContact, setOnlyWithContact] = useState(false);

  // UI state
  const [expandedCartIds, setExpandedCartIds] = useState<Record<string, boolean>>({});
  const [selectedCartForDetail, setSelectedCartForDetail] = useState<FormattedAbandonedCart | null>(null);
  const [sendingEmailFor, setSendingEmailFor] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modern Discount & Recovery Email Modal State
  const [discountModal, setDiscountModal] = useState<{
    isOpen: boolean;
    cart: FormattedAbandonedCart | null;
    mode: 'existing' | 'custom' | 'reminder_only';
    selectedCouponCode: string;
    customCouponCode: string;
    customDiscountValue: number;
  }>({
    isOpen: false,
    cart: null,
    mode: 'existing',
    selectedCouponCode: 'TREN10',
    customCouponCode: '',
    customDiscountValue: 10
  });

  // Delete confirmation modal
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    cartId: string | null;
    customerName: string;
  }>({
    isOpen: false,
    cartId: null,
    customerName: ''
  });

  // Custom modern dropdown state for default 72h coupon
  const [isCouponDropdownOpen, setIsCouponDropdownOpen] = useState(false);
  const [couponSearchQuery, setCouponSearchQuery] = useState('');
  const couponDropdownRef = useRef<HTMLDivElement>(null);

  // Close custom coupon dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (couponDropdownRef.current && !couponDropdownRef.current.contains(event.target as Node)) {
        setIsCouponDropdownOpen(false);
      }
    };
    if (isCouponDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCouponDropdownOpen]);

  const filteredDropdownCoupons = useMemo(() => {
    if (!couponSearchQuery.trim()) return availableCoupons;
    const q = couponSearchQuery.trim().toUpperCase();
    return availableCoupons.filter(c => c.code.toUpperCase().includes(q) || (c.description && c.description.toUpperCase().includes(q)));
  }, [availableCoupons, couponSearchQuery]);

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await getAdminAbandonedCarts();
      setCarts(res.carts || []);
      setStats(res.stats || null);
      setAvailableCoupons(res.availableCoupons || []);
      if (res.default72hCoupon) {
        setDefault72hCoupon(res.default72hCoupon);
      }
    } catch (err: any) {
      console.error("Eroare la încărcarea coșurilor:", err);
      toast.error(err.message || "Eroare la încărcarea coșurilor abandonate.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Update default 72h coupon in store_settings
  const handleDefaultCouponChange = async (newCode: string) => {
    if (!newCode || newCode === default72hCoupon) return;
    setUpdatingCoupon(true);
    const toastId = toast.loading(`Se setează cuponul default de 72h la "${newCode}"...`);
    try {
      const res = await updateAbandoned72hDefaultCoupon(newCode);
      if (res.success) {
        setDefault72hCoupon(res.default72hCoupon);
        toast.success(res.message, { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || "Eroare la actualizarea cuponului default.", { id: toastId });
    } finally {
      setUpdatingCoupon(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Copy to clipboard helper
  const copyToClipboard = (text: string, key: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`${label} copiat!`, { duration: 2000 });
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  // Toggle cart expansion
  const toggleExpand = (cartId: string) => {
    setExpandedCartIds(prev => ({
      ...prev,
      [cartId]: !prev[cartId]
    }));
  };

  // Trigger manual recovery email with selected/custom coupon
  const handleSendDiscountEmail = async () => {
    if (!discountModal.cart) return;
    const cart = discountModal.cart;
    const isReminderOnly = discountModal.mode === 'reminder_only';
    const templateType = isReminderOnly ? '24h' : '72h';

    let finalCouponCode: string | undefined;
    let finalCouponValue: number | undefined;

    if (!isReminderOnly) {
      if (discountModal.mode === 'custom') {
        const rawCode = discountModal.customCouponCode.trim().toUpperCase();
        if (!rawCode) {
          toast.error("Te rugăm să introduci un cod de cupon.");
          return;
        }
        finalCouponCode = rawCode;
        finalCouponValue = Number(discountModal.customDiscountValue) || 10;
      } else {
        finalCouponCode = discountModal.selectedCouponCode || 'TREN10';
        const found = availableCoupons.find(c => c.code === finalCouponCode);
        finalCouponValue = found?.value || 10;
      }
    }

    setSendingEmailFor(cart.id);
    setDiscountModal(prev => ({ ...prev, isOpen: false }));

    const toastId = toast.loading(
      finalCouponCode 
        ? `Se trimite emailul cu cuponul ${finalCouponCode} (-${finalCouponValue}%)...` 
        : "Se trimite reminderul de coș..."
    );

    try {
      const res = await sendManualRecoveryEmail(cart.id, templateType, {
        couponCode: finalCouponCode,
        couponValue: finalCouponValue
      });
      if (res.success) {
        toast.success(res.message, { id: toastId, duration: 5000 });
        await loadData(true);
      } else {
        toast.error("Nu s-a putut trimite emailul.", { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || "Eroare la trimiterea emailului.", { id: toastId });
    } finally {
      setSendingEmailFor(null);
    }
  };

  // Run bulk automation (24h reminder + 72h 10% coupon)
  const handleRunAutomation = async () => {
    setRunningAutomation(true);
    const toastId = toast.loading("Se verifică și se trimit automat reminderele de coș (24h și 72h -10%)...");
    try {
      const res = await runAbandonedCartsAutomation();
      if (res.success) {
        toast.success(res.message, { id: toastId, duration: 6000 });
        await loadData(true);
      } else {
        toast.error("Eroare la rularea automatizării.", { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || "Eroare la rularea automatizării.", { id: toastId });
    } finally {
      setRunningAutomation(false);
    }
  };

  // Trigger status update
  const handleStatusChange = async (cartId: string, newStatus: 'initiated' | 'recovered' | 'completed') => {
    const toastId = toast.loading("Se actualizează statusul...");
    try {
      await updateAbandonedCartStatus(cartId, newStatus);
      toast.success("Status actualizat!", { id: toastId });
      await loadData(true);
    } catch (err: any) {
      toast.error(err.message || "Eroare la actualizarea statusului.", { id: toastId });
    }
  };

  // Delete cart session
  const handleDeleteCart = async () => {
    if (!deleteModal.cartId) return;
    const cartId = deleteModal.cartId;
    setDeleteModal({ isOpen: false, cartId: null, customerName: '' });

    const toastId = toast.loading("Se șterge sesiunea de coș...");
    try {
      await deleteAbandonedCartSession(cartId);
      toast.success("Sesiune ștearsă!", { id: toastId });
      await loadData(true);
    } catch (err: any) {
      toast.error(err.message || "Eroare la ștergerea sesiunii.", { id: toastId });
    }
  };

  // Format date helper
  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('ro-RO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return isoString;
    }
  };

  // Format relative time helper
  const formatRelativeTime = (isoString: string) => {
    try {
      const now = Date.now();
      const past = new Date(isoString).getTime();
      const diffMin = Math.round((now - past) / 60000);

      if (diffMin < 1) return 'Chiar acum';
      if (diffMin < 60) return `Acum ${diffMin} min`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `Acum ${diffHours} ${diffHours === 1 ? 'oră' : 'ore'}`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'Ieri';
      return `Acum ${diffDays} zile`;
    } catch (e) {
      return '';
    }
  };

  // Format currency
  const formatMoney = (amount: number, currency = 'RON') => {
    return `${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  };

  const readyToSendCount = useMemo(() => {
    return carts.filter(c => getCartRecoveryStatus(c).isReadyToSend).length;
  }, [carts]);

  const emailsSentCount = useMemo(() => {
    return carts.filter(c => Boolean(c.recoveryEmailsSent?.['24h'] || c.recoveryEmailsSent?.['72h'])).length;
  }, [carts]);

  // Filtered and Sorted Carts
  const filteredCarts = useMemo(() => {
    let result = [...carts];

    // Status filter
    if (statusFilter === 'ready_to_send') {
      result = result.filter(c => getCartRecoveryStatus(c).isReadyToSend);
    } else if (statusFilter === 'sent') {
      result = result.filter(c => Boolean(c.recoveryEmailsSent?.['24h'] || c.recoveryEmailsSent?.['72h']));
    } else if (statusFilter !== 'all') {
      result = result.filter(c => c.status === statusFilter);
    }

    // Only with contact
    if (onlyWithContact) {
      result = result.filter(c => !!(c.customer.email || c.customer.phone));
    }

    // Date preset filter
    if (dateFilter !== 'all') {
      const now = Date.now();
      result = result.filter(c => {
        const cartTime = new Date(c.createdAt).getTime();
        if (dateFilter === 'today') {
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          return cartTime >= startOfToday.getTime();
        }
        if (dateFilter === '7days') {
          return (now - cartTime) <= 7 * 24 * 60 * 60 * 1000;
        }
        if (dateFilter === '30days') {
          return (now - cartTime) <= 30 * 24 * 60 * 60 * 1000;
        }
        return true;
      });
    }

    // Search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(c => {
        const nameMatch = c.customer.fullName.toLowerCase().includes(query);
        const emailMatch = c.customer.email.toLowerCase().includes(query);
        const phoneMatch = c.customer.phone.includes(query);
        const cityMatch = c.customer.city.toLowerCase().includes(query);
        const idMatch = c.id.toLowerCase().includes(query);
        const itemMatch = c.items.some(i => i.name.toLowerCase().includes(query));
        return nameMatch || emailMatch || phoneMatch || cityMatch || idMatch || itemMatch;
      });
    }

    // Sorting
    result.sort((a, b) => {
      if (sortOrder === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortOrder === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortOrder === 'highest') {
        return b.totalAmount - a.totalAmount;
      }
      if (sortOrder === 'lowest') {
        return a.totalAmount - b.totalAmount;
      }
      return 0;
    });

    return result;
  }, [carts, statusFilter, onlyWithContact, dateFilter, searchQuery, sortOrder]);

  // WhatsApp link helper
  const getWhatsAppLink = (phone: string, customerName: string, items: any[]) => {
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '4' + cleanPhone;
    }
    const productNames = items.map(i => i.name).slice(0, 2).join(', ');
    const text = encodeURIComponent(
      `Bună, ${customerName.split(' ')[0]}! Te contactăm de la TrenZone în legătură cu produsele lăsate în coș (${productNames}). Te putem ajuta cu vreo informație legată de livrare sau comandă?`
    );
    return `https://wa.me/${cleanPhone}?text=${text}`;
  };

  // Export to CSV
  const exportToCsv = () => {
    if (filteredCarts.length === 0) {
      toast.error("Nu există date de exportat.");
      return;
    }

    const headers = ["ID Coș", "Data", "Status", "Nume Client", "Email", "Telefon", "Oraș", "Total (RON)", "Produse", "Email 24h", "Email 72h"];
    const rows = filteredCarts.map(c => [
      c.id,
      formatDate(c.createdAt),
      c.status,
      `"${c.customer.fullName.replace(/"/g, '""')}"`,
      c.customer.email,
      c.customer.phone,
      `"${c.customer.city}"`,
      c.totalAmount,
      `"${c.items.map(i => `${i.name} (x${i.quantity})`).join(', ').replace(/"/g, '""')}"`,
      c.recoveryEmailsSent?.['24h'] ? 'Trimis' : 'Nu',
      c.recoveryEmailsSent?.['72h'] ? 'Trimis' : 'Nu'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `cosuri_abandonate_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Fișierul CSV a fost descărcat!");
  };

  return (
    <div className="space-y-6 pb-20">
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-orange-50 text-orange-600 rounded-xl border border-orange-100">
              <ShoppingCart size={22} />
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Coșuri Abandonate</h1>
            <span className="text-xs font-black uppercase tracking-wider bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full">
              Live Tracker
            </span>
          </div>
          <p className="text-sm text-slate-500 font-medium">
            Monitorizează clienții care au abandonat coșul și recuperează comenzile prin email automat sau contact direct.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={handleRunAutomation}
            disabled={runningAutomation || loading}
            className="px-3.5 py-2 text-xs font-black text-slate-900 bg-[#e32f8c] hover:bg-[#00bad9] active:scale-95 rounded-xl transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            title="Trimite automat reminderele de 24h și cele de 72h cu 10% reducere (TREN10) pentru toate coșurile eligibile"
          >
            <Play size={12} fill="currentColor" className={runningAutomation ? "animate-spin" : ""} />
            <span>{runningAutomation ? "Se trimit..." : "Rulează trimiterea automată"}</span>
          </button>

          <Link
            href="/admin/emails"
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
            title="Configurează template-urile de email pentru coșuri abandonate"
          >
            <Mail size={14} className="text-[#e32f8c]" />
            <span>Șabloane Email</span>
          </Link>

          <button
            onClick={exportToCsv}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
            title="Exportă lista filtrată în format CSV"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => loadData(true)}
            disabled={refreshing || loading}
            className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            <span>{refreshing ? "Se actualizează..." : "Reîmprospătează"}</span>
          </button>
        </div>
      </div>

      {/* AUTOMATION SEQUENCE & DEFAULT 72H COUPON PANEL */}
      <div className="bg-gradient-to-r from-purple-500/5 via-indigo-500/5 to-cyan-500/5 border border-purple-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="p-1.5 bg-purple-100 text-purple-700 rounded-lg">
                <Clock size={16} />
              </span>
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                Automatizare Recuperare Coșuri (24h & 72h)
              </h2>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200/60 flex items-center gap-1.5 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Recuperare Automată Activă (Zilnic la 09:00)
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Trimite automat remindere prietenoase la 24 de ore și oferte speciale cu reducere la 3 zile pentru clienții care nu au finalizat comanda.
            </p>
          </div>

          {/* 72H DEFAULT COUPON SELECTOR - MODERN CUSTOM DROPDOWN */}
          <div className="flex flex-wrap items-center gap-2.5 bg-white p-2 sm:p-2.5 rounded-xl border border-purple-200 shadow-2xs shrink-0">
            <div className="flex items-center gap-1.5">
              <Ticket size={14} className="text-purple-600" />
              <label className="text-xs font-black text-slate-800 shrink-0">
                Cupon Reducere Coș (3 Zile):
              </label>
            </div>
            
            <div className="relative" ref={couponDropdownRef}>
              <button
                type="button"
                onClick={() => setIsCouponDropdownOpen(prev => !prev)}
                disabled={updatingCoupon || loading}
                className="group flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-50 to-indigo-50/60 hover:from-purple-100/90 hover:to-indigo-100/90 border border-purple-300/80 rounded-xl text-xs font-mono font-black text-purple-950 transition-all shadow-2xs hover:shadow-xs active:scale-98 cursor-pointer disabled:opacity-50"
              >
                <span className="tracking-wide">{default72hCoupon}</span>
                <span className="px-1.5 py-0.5 text-[10px] rounded-md bg-purple-600 text-white font-bold tracking-tight">
                  -{availableCoupons.find(c => c.code === default72hCoupon)?.value || 10}%
                </span>
                <ChevronDown 
                  size={14} 
                  className={`text-purple-600 transition-transform duration-200 ${isCouponDropdownOpen ? 'rotate-180' : ''}`} 
                />
              </button>

              <AnimatePresence>
                {isCouponDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-purple-100 p-2 z-50 overflow-hidden"
                  >
                    {/* Header & Quick Search */}
                    <div className="pb-2 mb-1.5 border-b border-slate-100">
                      <div className="flex items-center justify-between px-1 mb-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Selectează Cuponul
                        </span>
                        <span className="text-[10px] font-mono font-bold text-purple-600 bg-purple-50 px-1.5 py-0.2 rounded">
                          {availableCoupons.length} disponibile
                        </span>
                      </div>
                      {availableCoupons.length > 4 && (
                        <div className="relative">
                          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Filtrează cupon..."
                            value={couponSearchQuery}
                            onChange={(e) => setCouponSearchQuery(e.target.value)}
                            className="w-full pl-7 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
                          />
                        </div>
                      )}
                    </div>

                    {/* List of active coupons */}
                    <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                      {filteredDropdownCoupons.length === 0 ? (
                        <div className="py-4 text-center text-xs text-slate-400 font-medium">
                          Niciun cupon găsit
                        </div>
                      ) : (
                        filteredDropdownCoupons.map((coupon) => {
                          const isSelected = coupon.code === default72hCoupon;
                          return (
                            <button
                              key={coupon.id}
                              type="button"
                              onClick={() => {
                                handleDefaultCouponChange(coupon.code);
                                setIsCouponDropdownOpen(false);
                                setCouponSearchQuery('');
                              }}
                              className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer ${
                                isSelected 
                                  ? 'bg-purple-600 text-white shadow-2xs font-bold' 
                                  : 'hover:bg-purple-50/80 text-slate-700 hover:text-purple-900'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                                  isSelected ? 'bg-white text-purple-600' : 'border border-slate-300'
                                }`}>
                                  {isSelected && <Check size={10} strokeWidth={3} />}
                                </div>
                                <div className="truncate">
                                  <span className="font-mono text-xs font-black block tracking-wide truncate">
                                    {coupon.code}
                                  </span>
                                  {coupon.description && (
                                    <span className={`text-[10px] block truncate max-w-[140px] ${
                                      isSelected ? 'text-purple-100' : 'text-slate-400'
                                    }`}>
                                      {coupon.description}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <span className={`px-2 py-0.5 rounded-lg text-xs font-black tracking-tight shrink-0 ml-2 ${
                                isSelected 
                                  ? 'bg-white/20 text-white' 
                                  : 'bg-purple-100 text-purple-800 border border-purple-200/80'
                              }`}>
                                -{coupon.value}%
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>

                    <div className="pt-2 mt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 px-1">
                      <span>Salvat automat</span>
                      <span className="font-bold text-purple-700">Activ la 3 zile</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <span className="text-[11px] font-bold text-slate-400 hidden sm:inline">
              Folosit automat la 3 zile
            </span>
          </div>
        </div>

        {/* SEQUENCE STEPS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2.5 border-t border-purple-100/80 text-xs">
          <div className="flex items-start gap-3 p-3 bg-white/90 rounded-xl border border-slate-200">
            <span className="w-6 h-6 rounded-lg bg-cyan-100 text-cyan-800 font-black text-xs flex items-center justify-center shrink-0">
              1
            </span>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-900">Email la 24h+ (Reminder Prietenos Dimineața)</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded font-bold">Fără Discount</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Trimis dimineața doar dacă au trecut peste 24h de la ultima interacțiune cu coșul. Clientul are la dispoziție o zi întreagă să cumpere liniștit înainte de orice notificare.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-white/90 rounded-xl border border-purple-200">
            <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-800 font-black text-xs flex items-center justify-center shrink-0">
              2
            </span>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-900">Email la 72h+ / 3 Zile (Ultima Șansă cu Reducere)</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded font-black">
                  Cod: {default72hCoupon} (-{availableCoupons.find(c => c.code === default72hCoupon)?.value || 10}%)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Trimis după 3 zile de la abandonare. Oferă reducerea default configurată, iar cuponul este auto-aplicat în coș cu un singur click din email!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SUMMARY KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Total Abandonat */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/5 rounded-bl-[100px] -z-10 group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Coșuri Abandonate</span>
            <span className="p-1.5 bg-orange-50 text-orange-600 rounded-lg"><ShoppingCart size={14} /></span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-orange-600">
            {stats?.abandonedCount ?? (loading ? "..." : 0)}
          </div>
          <p className="text-[11px] text-slate-500 font-semibold mt-1">
            {stats?.todayCount || 0} inițiate astăzi
          </p>
        </div>

        {/* Card 2: Pierdere Potențială */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/5 rounded-bl-[100px] -z-10 group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Pierdere Potențială</span>
            <span className="p-1.5 bg-red-50 text-red-600 rounded-lg"><TrendingDown size={14} /></span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 truncate">
            {stats ? formatMoney(stats.potentialLostRevenue) : (loading ? "..." : "0 RON")}
          </div>
          <p className="text-[11px] text-slate-500 font-semibold mt-1">
            Valoarea produselor abandonate
          </p>
        </div>

        {/* Card 3: Recuperate */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-bl-[100px] -z-10 group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Comenzi Recuperate</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle2 size={14} /></span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600">
            {stats?.recoveredCount ?? (loading ? "..." : 0)}
          </div>
          <p className="text-[11px] text-slate-500 font-semibold mt-1">
            Valoare: <span className="font-bold text-slate-900">{stats ? formatMoney(stats.recoveredRevenue) : "0 RON"}</span>
          </p>
        </div>

        {/* Card 4: Rată de Recuperare */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-[#e32f8c]/5 rounded-bl-[100px] -z-10 group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Rată Recuperare</span>
            <span className="p-1.5 bg-[#e32f8c]/10 text-[#00b0ce] rounded-lg"><Percent size={14} /></span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">
            {stats?.recoveryRate ?? (loading ? "..." : 0)}%
          </div>
          <p className="text-[11px] text-slate-500 font-semibold mt-1">
            {(stats?.activeCount || 0)} coșuri active &lt; 30 min
          </p>
        </div>
      </div>

      {/* SEARCH & FILTER BAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        {/* Top row: search + quick filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              type="text"
              placeholder="Caută după nume, email, telefon, oraș, produs sau ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#e32f8c]/30 focus:border-[#e32f8c] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 shrink-0">Sortare:</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#e32f8c]/30 cursor-pointer"
            >
              <option value="newest">Cele mai recente</option>
              <option value="highest">Valoare maximă</option>
              <option value="lowest">Valoare minimă</option>
              <option value="oldest">Cele mai vechi</option>
            </select>
          </div>
        </div>

        {/* Bottom row: status tabs + toggles */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Toate ({carts.length})
            </button>

            {/* Quick Action Filter: Ready to Send */}
            <button
              onClick={() => setStatusFilter('ready_to_send')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                statusFilter === 'ready_to_send'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-300'
              }`}
              title="Afișează coșurile care au atins 24h sau 72h și sunt pregătite pentru trimiterea emailului"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
              ⚡ De trimis acum ({readyToSendCount})
            </button>

            {/* Quick Filter: Emails Sent */}
            <button
              onClick={() => setStatusFilter('sent')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                statusFilter === 'sent'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200/60'
              }`}
              title="Afișează doar coșurile la care s-a trimis deja cel puțin un email (24h sau 72h)"
            >
              <Mail size={12} />
              ✉️ Emailuri Trimise ({emailsSentCount})
            </button>

            <button
              onClick={() => setStatusFilter('abandoned')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                statusFilter === 'abandoned'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200/50'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
              Abandonate ({carts.filter(c => c.status === 'abandoned').length})
            </button>

            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                statusFilter === 'active'
                  ? 'bg-[#e32f8c] text-slate-950 shadow-xs'
                  : 'bg-cyan-50 text-cyan-800 hover:bg-cyan-100 border border-cyan-200/50'
              }`}
            >
              <Clock size={12} />
              În Curs &lt; 30m ({carts.filter(c => c.status === 'active').length})
            </button>

            <button
              onClick={() => setStatusFilter('recovered')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                statusFilter === 'recovered'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/50'
              }`}
            >
              <CheckCircle2 size={12} />
              Recuperate ({carts.filter(c => c.status === 'recovered').length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Quick date filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setDateFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  dateFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Oricând
              </button>
              <button
                onClick={() => setDateFilter('today')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  dateFilter === 'today' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Azi
              </button>
              <button
                onClick={() => setDateFilter('7days')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  dateFilter === '7days' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                7 Zile
              </button>
              <button
                onClick={() => setDateFilter('30days')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  dateFilter === '30days' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                30 Zile
              </button>
            </div>

            {/* Toggle contact only */}
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-600">
              <input
                type="checkbox"
                checked={onlyWithContact}
                onChange={(e) => setOnlyWithContact(e.target.checked)}
                className="w-4 h-4 rounded text-orange-500 focus:ring-orange-400 border-slate-300 rounded cursor-pointer"
              />
              <span>Doar cu contact</span>
            </label>
          </div>
        </div>
      </div>

      {/* RESULTS LIST */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-[#e32f8c] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm font-bold text-slate-700">Se încarcă coșurile abandonate...</p>
          <p className="text-xs text-slate-400 mt-1">Se analizează sesiunile de checkout și comenzile plasate.</p>
        </div>
      ) : filteredCarts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <ShoppingCart size={28} />
          </div>
          <h3 className="text-base font-black text-slate-800">Nu s-a găsit niciun coș abandonat</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Niciun coș nu corespunde criteriilor de căutare și filtrelor selectate în acest moment.
          </p>
          {(searchQuery || statusFilter !== 'all' || dateFilter !== 'all' || onlyWithContact) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setDateFilter('all');
                setOnlyWithContact(false);
              }}
              className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
            >
              Resetează filtrele
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-2">
            <span>Se afișează {filteredCarts.length} coșuri din {carts.length}</span>
            <span>Total valoare afișată: {formatMoney(filteredCarts.reduce((acc, c) => acc + c.totalAmount, 0))}</span>
          </div>

          {filteredCarts.map((cart) => {
            const isExpanded = !!expandedCartIds[cart.id];
            const hasEmail = !!cart.customer.email;
            const hasPhone = !!cart.customer.phone;
            const emailSent24h = !!cart.recoveryEmailsSent?.['24h'];
            const emailSent72h = !!cart.recoveryEmailsSent?.['72h'];
            const isSendingThis = sendingEmailFor === cart.id;
            const recoveryStatus = getCartRecoveryStatus(cart);

            return (
              <div 
                key={cart.id}
                className={`bg-white border rounded-2xl shadow-sm transition-all overflow-hidden ${
                  cart.status === 'recovered' 
                    ? 'border-emerald-200 hover:border-emerald-300' 
                    : cart.status === 'active'
                      ? 'border-cyan-200 hover:border-cyan-300'
                      : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* TOP ROW: Status, ID, Customer Name, Value */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/40">
                  <div className="flex items-start sm:items-center gap-3">
                    {/* Status Badge & Stage */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {cart.status === 'recovered' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 size={13} /> Recuperat
                        </span>
                      ) : cart.status === 'active' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-cyan-100 text-cyan-800 border border-cyan-300">
                          <Clock size={13} className="animate-spin" /> În Curs (&lt;30m)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-orange-100 text-orange-800 border border-orange-300">
                          <span className="w-2 h-2 rounded-full bg-orange-500"></span> Abandonat
                        </span>
                      )}

                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${recoveryStatus.badgeColor}`}>
                        {recoveryStatus.badgeText}
                      </span>
                    </div>

                    {/* Customer Name & Creation Date */}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-black text-slate-900">
                          {cart.customer.fullName}
                        </h3>
                        {cart.customer.city && (
                          <span className="text-xs font-semibold text-slate-500 flex items-center gap-0.5">
                            <MapPin size={11} className="text-slate-400" />
                            {cart.customer.city}{cart.customer.state ? `, ${cart.customer.state}` : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 font-medium">
                        <span>{formatRelativeTime(cart.createdAt)}</span>
                        <span>•</span>
                        <span>{formatDate(cart.createdAt)}</span>
                        <span>•</span>
                        <span className="font-mono text-[10px] text-slate-400">ID: {cart.id.slice(0, 8)}...</span>
                      </div>
                    </div>
                  </div>

                  {/* Total Value & Main Toggle */}
                  <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-lg sm:text-xl font-black text-slate-900 tracking-tight font-mono">
                        {formatMoney(cart.totalAmount, cart.currency)}
                      </div>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {cart.items.length} {cart.items.length === 1 ? 'produs' : 'produse'}
                      </span>
                    </div>

                    <button
                      onClick={() => toggleExpand(cart.id)}
                      className="p-2 text-slate-400 hover:text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                      title={isExpanded ? "Restrânge detaliile" : "Extinde detaliile"}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* 🚀 SALES FUNNEL STEPPER & AUDIT TRAIL */}
                <div className="px-4 sm:px-5 py-3 bg-slate-50/70 border-b border-slate-100">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* Stepper Steps */}
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs">
                      {/* Step 1: Coș Creat */}
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold">
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        <span>1. Coș Creat</span>
                        <span className="text-[10px] text-emerald-600/80 font-normal">({formatRelativeTime(cart.createdAt)})</span>
                      </div>

                      <ChevronRight size={13} className="text-slate-300 shrink-0 hidden sm:block" />

                      {/* Step 2: Reminder 24h */}
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-bold ${
                        recoveryStatus.sent24h
                          ? 'bg-blue-50 border-blue-200 text-blue-900'
                          : recoveryStatus.stage === 'ready_24h'
                            ? 'bg-orange-500 text-white border-orange-600 shadow-2xs animate-pulse'
                            : recoveryStatus.stage === 'waiting_24h'
                              ? 'bg-slate-100 text-slate-600 border-slate-200'
                              : 'bg-slate-100 text-slate-400 border-slate-200 opacity-60'
                      }`}>
                        {recoveryStatus.sent24h ? (
                          <CheckCircle2 size={13} className="text-blue-600" />
                        ) : recoveryStatus.stage === 'ready_24h' ? (
                          <Zap size={13} className="text-white" />
                        ) : (
                          <Clock size={13} />
                        )}
                        <span>2. Reminder 24h</span>
                        {recoveryStatus.sent24h ? (
                          <span className="text-[10px] text-blue-700 font-medium">
                            (Trimis {recoveryStatus.sent24hAt ? formatRelativeTime(recoveryStatus.sent24hAt) : ''})
                          </span>
                        ) : recoveryStatus.stage === 'ready_24h' ? (
                          <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded font-black">DE TRIMIS ACUM</span>
                        ) : recoveryStatus.stage === 'waiting_24h' ? (
                          <span className="text-[10px] text-slate-400 font-medium">({recoveryStatus.badgeText})</span>
                        ) : null}
                      </div>

                      <ChevronRight size={13} className="text-slate-300 shrink-0 hidden sm:block" />

                      {/* Step 3: Ofertă 72h */}
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-bold ${
                        recoveryStatus.sent72h
                          ? 'bg-purple-50 border-purple-200 text-purple-900'
                          : recoveryStatus.stage === 'ready_72h'
                            ? 'bg-purple-600 text-white border-purple-700 shadow-2xs animate-pulse'
                            : recoveryStatus.stage === 'waiting_72h'
                              ? 'bg-slate-100 text-slate-600 border-slate-200'
                              : 'bg-slate-100 text-slate-400 border-slate-200 opacity-60'
                      }`}>
                        {recoveryStatus.sent72h ? (
                          <CheckCircle2 size={13} className="text-purple-600" />
                        ) : recoveryStatus.stage === 'ready_72h' ? (
                          <Gift size={13} className="text-white" />
                        ) : (
                          <Clock size={13} />
                        )}
                        <span>3. Ofertă 72h</span>
                        {recoveryStatus.sent72h ? (
                          <span className="text-[10px] text-purple-700 font-mono font-medium">
                            ({recoveryStatus.lastCouponCode || 'Cupon -10%'} • {recoveryStatus.sent72hAt ? formatRelativeTime(recoveryStatus.sent72hAt) : 'Trimis'})
                          </span>
                        ) : recoveryStatus.stage === 'ready_72h' ? (
                          <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded font-black">DE TRIMIS ACUM</span>
                        ) : recoveryStatus.stage === 'waiting_72h' ? (
                          <span className="text-[10px] text-slate-400 font-medium">({recoveryStatus.badgeText})</span>
                        ) : null}
                      </div>

                      <ChevronRight size={13} className="text-slate-300 shrink-0 hidden sm:block" />

                      {/* Step 4: Comandă Plasată */}
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-bold ${
                        cart.status === 'recovered'
                          ? 'bg-emerald-500 text-white border-emerald-600 shadow-2xs'
                          : 'bg-slate-100 text-slate-400 border-slate-200 opacity-60'
                      }`}>
                        {cart.status === 'recovered' ? (
                          <CheckCircle2 size={13} className="text-white" />
                        ) : (
                          <div className="w-2.5 h-2.5 rounded-full border border-slate-300" />
                        )}
                        <span>4. Comandă Finalizată</span>
                      </div>
                    </div>

                    {/* Quick action trigger right on top when ready */}
                    {recoveryStatus.isReadyToSend && hasEmail && cart.status !== 'recovered' && (
                      <div className="shrink-0">
                        {recoveryStatus.readyType === '24h' ? (
                          <button
                            onClick={() => setDiscountModal({
                              isOpen: true,
                              cart,
                              mode: 'reminder_only',
                              selectedCouponCode: availableCoupons[0]?.code || 'TREN10',
                              customCouponCode: '',
                              customDiscountValue: 10
                            })}
                            disabled={isSendingThis}
                            className="px-3 py-1.5 text-xs font-black text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-xl shadow-xs transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
                          >
                            <Send size={12} />
                            <span>Trimite Reminder 24h Acum</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setDiscountModal({
                              isOpen: true,
                              cart,
                              mode: 'existing',
                              selectedCouponCode: availableCoupons[0]?.code || 'TREN10',
                              customCouponCode: '',
                              customDiscountValue: 10
                            })}
                            disabled={isSendingThis}
                            className="px-3 py-1.5 text-xs font-black text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-xl shadow-xs transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
                          >
                            <Tag size={12} />
                            <span>Trimite Oferta 72h Acum</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Recommendation / Explanatory Subtitle */}
                  <div className="mt-2 text-xs flex items-center gap-2 text-slate-600 font-medium">
                    <Info size={13} className="text-slate-400 shrink-0" />
                    <span>
                      <strong className="text-slate-800">{recoveryStatus.actionTitle}</strong> — {recoveryStatus.actionSubtitle}
                    </span>
                  </div>
                </div>

                {/* MIDDLE ROW: Contact info + Mini products preview + Recovery Email Status */}
                <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  {/* Client Contact Info (Col 5) */}
                  <div className="md:col-span-5 space-y-1.5 text-xs">
                    {/* Email */}
                    <div className="flex items-center gap-2">
                      <Mail size={13} className="text-slate-400 shrink-0" />
                      {hasEmail ? (
                        <>
                          <a 
                            href={`mailto:${cart.customer.email}`}
                            className="font-bold text-slate-800 hover:text-[#e32f8c] transition-colors truncate"
                          >
                            {cart.customer.email}
                          </a>
                          <button
                            onClick={() => copyToClipboard(cart.customer.email, `email-${cart.id}`, 'Email')}
                            className="text-slate-400 hover:text-slate-600 p-0.5"
                            title="Copiază email"
                          >
                            {copiedKey === `email-${cart.id}` ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          </button>
                        </>
                      ) : (
                        <span className="text-slate-400 italic">Fără adresă de email</span>
                      )}
                    </div>

                    {/* Phone */}
                    <div className="flex items-center gap-2">
                      <Phone size={13} className="text-slate-400 shrink-0" />
                      {hasPhone ? (
                        <>
                          <a 
                            href={`tel:${cart.customer.phone}`}
                            className="font-bold text-slate-800 hover:text-[#e32f8c] transition-colors"
                          >
                            {cart.customer.phone}
                          </a>
                          <button
                            onClick={() => copyToClipboard(cart.customer.phone, `phone-${cart.id}`, 'Telefon')}
                            className="text-slate-400 hover:text-slate-600 p-0.5"
                            title="Copiază telefon"
                          >
                            {copiedKey === `phone-${cart.id}` ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          </button>
                          {/* Direct WhatsApp link */}
                          <a
                            href={getWhatsAppLink(cart.customer.phone, cart.customer.fullName, cart.items)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-1 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md transition-colors"
                            title="Deschide WhatsApp pentru a asista clientul"
                          >
                            <MessageCircle size={11} /> WhatsApp
                          </a>
                        </>
                      ) : (
                        <span className="text-slate-400 italic">Fără număr de telefon</span>
                      )}
                    </div>

                    {/* Address snippet */}
                    {cart.customer.line1 && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <MapPin size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate">
                          {cart.customer.line1}
                          {cart.customer.city ? `, ${cart.customer.city}` : ''}
                          {cart.customer.postalCode ? ` (${cart.customer.postalCode})` : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Items preview thumbnails (Col 4) */}
                  <div className="md:col-span-4">
                    <div className="text-[11px] font-black uppercase text-slate-400 tracking-wider mb-1.5 flex items-center gap-1">
                      <Package size={12} /> Produse în coș:
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                      {cart.items.slice(0, 3).map((item, idx) => (
                        <div 
                          key={idx}
                          className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-lg p-1.5 shrink-0 max-w-[180px]"
                        >
                          {(() => {
                            const isBundle = String(item.id || '').includes('-bundle-') || /pachet|bundle/i.test(item.name || '');
                            let rawImg = item.image;
                            if (isBundle) {
                              if (!rawImg || String(rawImg).includes('placeholder')) rawImg = '/images/products/x10_elbow_wraps_purple_1.webp';
                            } else {
                              if (!rawImg || String(rawImg).includes('bundle') || String(rawImg).includes('pachet')) {
                                rawImg = getSingleFlavorImage(item.name);
                              }
                            }
                            const src = rawImg ? getOptimizedImageUrl(rawImg) : '';
                            return src ? (
                              <img
                                src={src}
                                alt={item.name}
                                className="w-8 h-8 rounded object-cover border border-slate-200 bg-white shrink-0"
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  if (isBundle) {
                                    if (!target.src.includes('/images/products/x10_elbow_wraps_purple_1.webp')) {
                                      target.src = '/images/products/x10_elbow_wraps_purple_1.webp';
                                    }
                                  } else {
                                    const fallback = getOptimizedImageUrl(getSingleFlavorImage(item.name));
                                    if (target.src !== fallback) target.src = fallback;
                                  }
                                }}
                              />
                            ) : (
                              <div className="w-8 h-8 rounded bg-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                                <Package size={14} />
                              </div>
                            );
                          })()}
                          <div className="min-w-0 text-left">
                            <p className="text-[11px] font-bold text-slate-800 truncate leading-tight">
                              {item.name}
                            </p>
                            <p className="text-[10px] text-slate-500 font-semibold leading-tight">
                              x{item.quantity} • {formatMoney(item.price)}
                            </p>
                          </div>
                        </div>
                      ))}
                      {cart.items.length > 3 && (
                        <span className="text-[11px] font-bold text-slate-500 px-2 py-1 bg-slate-100 rounded-lg shrink-0">
                          +{cart.items.length - 3} altele
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Email Recovery Status & Actions (Col 3) */}
                  <div className="md:col-span-3 flex flex-col justify-end items-start md:items-end gap-1.5">
                    {/* Recovery Email Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <span 
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                          emailSent24h
                            ? 'bg-blue-50 text-blue-700 border-blue-200' 
                            : 'bg-slate-100 text-slate-400 border-slate-200'
                        }`}
                        title={emailSent24h ? `Email reminder 24h trimis: ${cart.recoveryEmailsSent?.['24h_sent_at'] ? formatDate(cart.recoveryEmailsSent['24h_sent_at']) : 'Da'}` : "Email 24h netrimis"}
                      >
                        {emailSent24h ? '✓ 24h Trimis' : '24h Netrimis'}
                      </span>

                      <span 
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                          emailSent72h 
                            ? 'bg-purple-50 text-purple-700 border-purple-200' 
                            : 'bg-slate-100 text-slate-400 border-slate-200'
                        }`}
                        title={emailSent72h ? `Email ofertă 72h trimis: ${cart.recoveryEmailsSent?.['72h_sent_at'] ? formatDate(cart.recoveryEmailsSent['72h_sent_at']) : 'Da'} (Cupon: ${cart.recoveryEmailsSent?.last_coupon_code || 'TREN10'})` : "Email 72h netrimis"}
                      >
                        {emailSent72h ? `✓ 72h Trimis (${cart.recoveryEmailsSent?.last_coupon_code || '-10%'})` : '72h Netrimis'}
                      </span>
                    </div>

                    {/* Quick Recovery Button */}
                    {hasEmail && cart.status !== 'recovered' && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <button
                          onClick={() => setDiscountModal({
                            isOpen: true,
                            cart,
                            mode: 'reminder_only',
                            selectedCouponCode: availableCoupons[0]?.code || 'TREN10',
                            customCouponCode: '',
                            customDiscountValue: 10
                          })}
                          disabled={isSendingThis}
                          className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                          title="Trimite email manual de reamintire 24h (fără cupon)"
                        >
                          <Send size={11} className="text-[#e32f8c]" />
                          <span>Trimite 24h</span>
                        </button>

                        <button
                          onClick={() => setDiscountModal({
                            isOpen: true,
                            cart,
                            mode: 'existing',
                            selectedCouponCode: availableCoupons[0]?.code || 'TREN10',
                            customCouponCode: '',
                            customDiscountValue: 10
                          })}
                          disabled={isSendingThis}
                          className="px-2.5 py-1 text-[11px] font-black text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/80 rounded-lg transition-all flex items-center gap-1 shadow-2xs hover:scale-102 active:scale-98 disabled:opacity-50 cursor-pointer"
                          title="Deschide selectorul modern de cupon pentru acest client"
                        >
                          <Tag size={11} className="text-purple-600" />
                          <span>Trimite reducere</span>
                        </button>
                      </div>
                    )}

                    {cart.status === 'recovered' && (
                      <div className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle size={13} />
                        <span>Comandă finalizată cu succes</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* EXPANDABLE ACCORDION: Full Items Table, Delivery Details, Raw Info */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-slate-200/80 bg-slate-50/70 p-4 sm:p-6 space-y-6"
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Complete Items Table (7 cols) */}
                        <div className="lg:col-span-7 space-y-3">
                          <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                            <ShoppingCart size={14} /> Toate produsele din coș ({cart.items.length})
                          </h4>

                          <div className="space-y-2.5">
                            {cart.items.map((item, idx) => {
                              const details = getItemDisplayDetails(item);
                              const lineTotal = item.price * item.quantity;

                              return (
                                <div
                                  key={idx}
                                  className="flex items-start justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs"
                                >
                                  <div className="flex items-start gap-3 min-w-0 flex-1">
                                    {(() => {
                                      let rawImg = item.image;
                                      if (details.isBundle) {
                                        if (!rawImg || String(rawImg).includes('placeholder')) rawImg = '/images/products/x10_elbow_wraps_purple_1.webp';
                                      } else {
                                        if (!rawImg || String(rawImg).includes('bundle') || String(rawImg).includes('pachet')) {
                                          rawImg = getSingleFlavorImage(details.variantStr || details.rawName);
                                        }
                                      }
                                      const src = rawImg ? getOptimizedImageUrl(rawImg) : '';
                                      return src ? (
                                        <img
                                          src={src}
                                          alt={details.cleanTitle}
                                          className="w-12 h-12 rounded-lg object-cover border border-slate-100 bg-slate-50 shrink-0"
                                          onError={(e) => {
                                            const target = e.currentTarget;
                                            if (details.isBundle) {
                                              if (!target.src.includes('/images/products/x10_elbow_wraps_purple_1.webp')) {
                                                target.src = '/images/products/x10_elbow_wraps_purple_1.webp';
                                              }
                                            } else {
                                              const fallback = getOptimizedImageUrl(getSingleFlavorImage(details.variantStr || details.rawName));
                                              if (target.src !== fallback) target.src = fallback;
                                            }
                                          }}
                                        />
                                      ) : (
                                        <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                          <Package size={20} />
                                        </div>
                                      );
                                    })()}

                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs sm:text-sm font-bold text-slate-900 break-words leading-snug">
                                        {details.cleanTitle}
                                      </p>

                                      {/* 📦 BUNDLE BREAKDOWN */}
                                      {details.isBundle && (
                                        <div className="mt-2.5 p-2.5 sm:p-3 bg-gradient-to-r from-cyan-50/90 to-blue-50/60 rounded-xl border border-cyan-200/90 space-y-2">
                                          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-cyan-950">
                                            <Package size={13} className="text-[#00b0ce] shrink-0" />
                                            <span>Conținut pachet {details.bundleFlavors.length > 0 ? `(${details.bundleFlavors.length} cutii)` : ''}:</span>
                                          </div>
                                          {details.bundleFlavors.length > 0 ? (
                                            <div className="space-y-1.5">
                                              {details.bundleFlavors.map((flavor, fIdx) => (
                                                <div 
                                                  key={fIdx}
                                                  className="flex items-center gap-2 px-3 py-1.5 bg-white text-slate-900 border border-cyan-300/80 rounded-lg text-xs font-bold shadow-2xs w-full"
                                                >
                                                  <span className="w-2 h-2 rounded-full bg-[#00b0ce] shrink-0" />
                                                  <span className="text-slate-500 text-[10px] uppercase font-black tracking-wider shrink-0 whitespace-nowrap">
                                                    Cutia {fIdx + 1}:
                                                  </span>
                                                  <span className="text-slate-950 font-black text-xs sm:text-sm break-words flex-1">
                                                    {flavor}
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          ) : details.variantStr ? (
                                            <div className="px-3 py-1.5 bg-white text-slate-900 border border-cyan-200 rounded-lg text-xs font-bold">
                                              {details.variantStr}
                                            </div>
                                          ) : (
                                            <span className="text-[11px] italic text-slate-500">Conform descriere pachet</span>
                                          )}
                                        </div>
                                      )}

                                      {/* 🏷️ SINGLE PRODUCT VARIANT */}
                                      {!details.isBundle && details.variantStr && (
                                        <div className="mt-1 flex items-center gap-1.5">
                                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md text-[11px] font-bold border border-slate-200">
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                                            <span className="text-slate-500 font-semibold text-[10px]">Culoare:</span>
                                            <span className="text-slate-900 font-black">{details.variantStr}</span>
                                          </span>
                                        </div>
                                      )}

                                      <p className="text-[11px] text-slate-500 mt-1">
                                        Preț unitar: {formatMoney(item.price, cart.currency)}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0">
                                    <div className="font-mono text-xs sm:text-sm font-black text-slate-900">
                                      {formatMoney(lineTotal, cart.currency)}
                                    </div>
                                    <span className="text-[11px] font-bold text-slate-400">
                                      Cantitate: x{item.quantity}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between font-mono text-sm font-black text-slate-900">
                            <span>Total Coș:</span>
                            <span className="text-base text-orange-600 font-black">
                              {formatMoney(cart.totalAmount, cart.currency)}
                            </span>
                          </div>
                        </div>

                        {/* Full Delivery & Technical Info (5 cols) */}
                        <div className="lg:col-span-5 space-y-4">
                          {/* Delivery box */}
                          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2.5">
                            <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                              <Truck size={14} /> Detalii de Livrare
                            </h4>

                            <div className="space-y-1.5 text-xs text-slate-700">
                              <div>
                                <span className="font-bold text-slate-400 text-[10px] uppercase block">Destinatar:</span>
                                <span className="font-bold text-slate-900">{cart.customer.fullName}</span>
                              </div>

                              <div>
                                <span className="font-bold text-slate-400 text-[10px] uppercase block">Adresă livrare:</span>
                                <span>{cart.customer.line1 || 'Nespecificată'}</span>
                                {cart.customer.line2 && <span className="block text-slate-500">{cart.customer.line2}</span>}
                              </div>

                              <div className="grid grid-cols-2 gap-2 pt-1">
                                <div>
                                  <span className="font-bold text-slate-400 text-[10px] uppercase block">Oraș:</span>
                                  <span className="font-semibold">{cart.customer.city || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="font-bold text-slate-400 text-[10px] uppercase block">Județ:</span>
                                  <span className="font-semibold">{cart.customer.state || 'N/A'}</span>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 pt-1">
                                <div>
                                  <span className="font-bold text-slate-400 text-[10px] uppercase block">Cod Poștal:</span>
                                  <span className="font-mono">{cart.customer.postalCode || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="font-bold text-slate-400 text-[10px] uppercase block">Țară:</span>
                                  <span className="font-semibold">{cart.customer.country}</span>
                                </div>
                              </div>

                              {cart.customer.branchName && (
                                <div className="mt-2 p-2 bg-[#e32f8c]/10 border border-[#e32f8c]/30 rounded-lg">
                                  <span className="font-bold text-[#008ba3] text-[10px] uppercase block">Locker / Easybox:</span>
                                  <span className="font-bold text-slate-900">{cart.customer.branchName}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Technical & Actions box */}
                          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                            <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">
                              Acțiuni & Linkuri Directe
                            </h4>

                            <div className="flex flex-col gap-2">
                              {/* Copy recovery link */}
                              <button
                                onClick={() => copyToClipboard(cart.recoveryUrl, `url-${cart.id}`, 'Link-ul de checkout')}
                                className="w-full py-2 px-3 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors flex items-center justify-between"
                              >
                                <span className="flex items-center gap-1.5">
                                  <ExternalLink size={13} className="text-slate-400" />
                                  <span>Copiază Link Coș</span>
                                </span>
                                {copiedKey === `url-${cart.id}` ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} className="text-slate-400" />}
                              </button>

                              {/* View complete JSON modal button */}
                              <button
                                onClick={() => setSelectedCartForDetail(cart)}
                                className="w-full py-2 px-3 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors flex items-center justify-between"
                              >
                                <span className="flex items-center gap-1.5">
                                  <Eye size={13} className="text-slate-400" />
                                  <span>Vezi JSON & Detalii Raw</span>
                                </span>
                                <span className="text-[10px] text-slate-400">&rarr;</span>
                              </button>

                              {/* Mark as recovered manual button */}
                              {cart.status !== 'recovered' && (
                                <button
                                  onClick={() => handleStatusChange(cart.id, 'recovered')}
                                  className="w-full py-2 px-3 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors flex items-center gap-1.5"
                                >
                                  <CheckCircle2 size={13} />
                                  <span>Marchează ca Recuperat Manual</span>
                                </button>
                              )}

                              {/* Delete button */}
                              <button
                                onClick={() => setDeleteModal({ isOpen: true, cartId: cart.id, customerName: cart.customer.fullName })}
                                className="w-full py-2 px-3 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-1.5"
                              >
                                <Trash2 size={13} />
                                <span>Șterge această sesiune</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* DISCOUNT & RECOVERY EMAIL POPUP MODAL */}
      <AnimatePresence>
        {discountModal.isOpen && discountModal.cart && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center shadow-xs">
                    <Tag size={18} />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-none">
                      Alege Oferta & Cuponul
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 font-medium">
                      Selectează sau personalizează cuponul atașat emailului
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDiscountModal(prev => ({ ...prev, isOpen: false }))}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Customer summary pill */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between text-xs">
                <div className="min-w-0">
                  <span className="font-bold text-slate-900 block truncate">
                    {discountModal.cart.customer.fullName}
                  </span>
                  <span className="font-mono text-slate-500 text-[11px] block truncate">
                    {discountModal.cart.customer.email}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] uppercase font-black text-slate-400 block">Valoare Coș</span>
                  <span className="font-mono font-black text-orange-600 text-sm">
                    {formatMoney(discountModal.cart.totalAmount, discountModal.cart.currency)}
                  </span>
                </div>
              </div>

              {/* Customer Recovery Email History */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] space-y-1">
                <div className="flex items-center justify-between text-slate-500 font-bold uppercase text-[10px]">
                  <span>Istoric Trimiteri Pentru Acest Client</span>
                  <span>Secvență 24h & 72h</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-md font-bold flex items-center gap-1 ${
                    discountModal.cart.recoveryEmailsSent?.['24h']
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-slate-200/70 text-slate-500'
                  }`}>
                    {discountModal.cart.recoveryEmailsSent?.['24h'] ? (
                      <>
                        <Check size={11} className="text-blue-700" />
                        <span>Reminder 24h Trimis {discountModal.cart.recoveryEmailsSent?.['24h_sent_at'] ? `(${formatRelativeTime(discountModal.cart.recoveryEmailsSent['24h_sent_at'])})` : ''}</span>
                      </>
                    ) : (
                      <span>Reminder 24h Netrimis</span>
                    )}
                  </span>

                  <span className={`px-2 py-0.5 rounded-md font-bold flex items-center gap-1 ${
                    discountModal.cart.recoveryEmailsSent?.['72h']
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-slate-200/70 text-slate-500'
                  }`}>
                    {discountModal.cart.recoveryEmailsSent?.['72h'] ? (
                      <>
                        <Check size={11} className="text-purple-700" />
                        <span>Ofertă 72h Trimisă (Cupon: {discountModal.cart.recoveryEmailsSent?.last_coupon_code || 'TREN10'})</span>
                      </>
                    ) : (
                      <span>Ofertă 72h Netrimisă</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Mode switcher tabs */}
              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setDiscountModal(prev => ({ ...prev, mode: 'existing' }))}
                  className={`py-2 px-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    discountModal.mode === 'existing'
                      ? 'bg-white text-purple-700 shadow-2xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Ticket size={13} />
                  <span className="truncate">Cupon Existent</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDiscountModal(prev => ({ ...prev, mode: 'custom' }))}
                  className={`py-2 px-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    discountModal.mode === 'custom'
                      ? 'bg-white text-purple-700 shadow-2xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Plus size={13} />
                  <span className="truncate">Cupon Custom</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDiscountModal(prev => ({ ...prev, mode: 'reminder_only' }))}
                  className={`py-2 px-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    discountModal.mode === 'reminder_only'
                      ? 'bg-white text-slate-900 shadow-2xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Clock size={13} />
                  <span className="truncate">Doar Reminder</span>
                </button>
              </div>

              {/* Mode 1: Select from existing store coupons */}
              {discountModal.mode === 'existing' && (
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center justify-between">
                    <span>Cupoane Active în Magazin:</span>
                    <span className="text-slate-400 font-semibold">{availableCoupons.length} disponibile</span>
                  </label>

                  <div className="max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                    {availableCoupons.length === 0 ? (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                        Nu există cupoane active în magazin.
                        <button
                          type="button"
                          onClick={() => setDiscountModal(prev => ({ ...prev, mode: 'custom', customCouponCode: 'TREN10', customDiscountValue: 10 }))}
                          className="mt-1 block mx-auto text-purple-600 font-bold hover:underline"
                        >
                          Creează un cupon nou acum &rarr;
                        </button>
                      </div>
                    ) : (
                      availableCoupons.map((coupon) => {
                        const isSelected = discountModal.selectedCouponCode === coupon.code;
                        return (
                          <div
                            key={coupon.id}
                            onClick={() => setDiscountModal(prev => ({ ...prev, selectedCouponCode: coupon.code }))}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? 'border-purple-500 bg-purple-50/70 shadow-2xs'
                                : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected ? 'border-purple-600 bg-purple-600' : 'border-slate-300 bg-white'
                              }`}>
                                {isSelected && <Check size={10} className="text-white" />}
                              </div>
                              <div>
                                <span className="font-mono text-xs font-black text-slate-900 block">
                                  {coupon.code}
                                </span>
                                {coupon.description && (
                                  <span className="text-[10px] text-slate-400 block truncate max-w-[200px]">
                                    {coupon.description}
                                  </span>
                                )}
                              </div>
                            </div>

                            <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-purple-100 text-purple-800 border border-purple-200/80">
                              -{coupon.value}% Reducere
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Mode 2: Custom coupon code & percentage */}
              {discountModal.mode === 'custom' && (
                <div className="space-y-3 p-4 bg-purple-50/40 border border-purple-100 rounded-2xl">
                  <div>
                    <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                      Cod Cupon Personalizat:
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: SPECIAL15, TRENZONE, VIP20"
                      value={discountModal.customCouponCode}
                      onChange={(e) => setDiscountModal(prev => ({ ...prev, customCouponCode: e.target.value.toUpperCase() }))}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-black text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                        Procent Reducere (%):
                      </label>
                      <span className="font-mono text-xs font-black text-purple-700">
                        -{discountModal.customDiscountValue}%
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="90"
                        value={discountModal.customDiscountValue}
                        onChange={(e) => setDiscountModal(prev => ({ ...prev, customDiscountValue: Math.max(1, Math.min(90, parseInt(e.target.value) || 10)) }))}
                        className="w-24 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                      />

                      {/* Quick percentage pills */}
                      <div className="flex items-center gap-1.5 flex-1">
                        {[5, 10, 15, 20].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setDiscountModal(prev => ({ ...prev, customDiscountValue: val }))}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                              discountModal.customDiscountValue === val
                                ? 'bg-purple-600 text-white shadow-2xs'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {val}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 font-medium">
                    <em>Dacă acest cod nu există încă în baza de date, va fi activat automat la trimitere pentru a funcționa la checkout.</em>
                  </p>
                </div>
              )}

              {/* Mode 3: Reminder only */}
              {discountModal.mode === 'reminder_only' && (
                <div className="p-4 bg-cyan-50/50 border border-cyan-200/60 rounded-2xl space-y-1">
                  <p className="text-xs font-bold text-cyan-900">
                    Trimitere reamintire simplă (fără cupon)
                  </p>
                  <p className="text-[11px] text-cyan-700">
                    Clientul va primi emailul prietenos de reamintire care îi prezintă produsele din coș și butonul direct de finalizare a comenzii.
                  </p>
                </div>
              )}

              {/* Live Preview Box */}
              {discountModal.mode !== 'reminder_only' && (
                <div className="p-3.5 bg-gradient-to-r from-purple-500/5 to-indigo-500/5 border border-purple-200/80 rounded-2xl space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-purple-600 tracking-wider flex items-center gap-1">
                    <Gift size={12} /> Previzualizare Ofertă Email:
                  </span>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-semibold">Subiect Email:</span>
                    <span className="font-bold text-slate-900">
                      Ai {discountModal.mode === 'custom' ? discountModal.customDiscountValue : (availableCoupons.find(c => c.code === discountModal.selectedCouponCode)?.value || 10)}% reducere pentru produsele din coș!
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-purple-100">
                    <span className="text-slate-600 font-semibold">Cod Cupon Inclus:</span>
                    <span className="px-2 py-0.5 border border-dashed border-purple-300 bg-white rounded font-mono font-black text-purple-700">
                      {discountModal.mode === 'custom' 
                        ? (discountModal.customCouponCode || 'COD_CUSTOM')
                        : discountModal.selectedCouponCode}
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDiscountModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Anulează
                </button>
                <button
                  type="button"
                  onClick={handleSendDiscountEmail}
                  disabled={discountModal.mode === 'custom' && !discountModal.customCouponCode.trim()}
                  className={`px-5 py-2.5 text-xs font-black text-white rounded-xl transition-all shadow-sm flex items-center gap-1.5 ${
                    discountModal.mode === 'custom' && !discountModal.customCouponCode.trim()
                      ? 'bg-purple-300 cursor-not-allowed opacity-60'
                      : 'bg-purple-600 hover:bg-purple-700 active:scale-98 cursor-pointer'
                  }`}
                >
                  <Send size={13} />
                  <span>
                    {discountModal.mode === 'reminder_only'
                      ? 'Trimite Reminder 24h'
                      : `Trimite Email cu Cupon`}
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {deleteModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center gap-2 text-red-600 font-black text-base">
                <AlertTriangle size={18} />
                <span>Ștergere Sesiune Coș</span>
              </div>
              <p className="text-xs text-slate-600">
                Ești sigur că vrei să ștergi definitiv sesiunea de coș pentru <strong className="text-slate-900">{deleteModal.customerName}</strong>? Această acțiune este ireversibilă.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setDeleteModal({ isOpen: false, cartId: null, customerName: '' })}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Anulează
                </button>
                <button
                  onClick={handleDeleteCart}
                  className="px-4 py-2 text-xs font-black text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-sm"
                >
                  Șterge Definitiv
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SLIDE-OVER DETAIL MODAL */}
      <AnimatePresence>
        {selectedCartForDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Detalii Complete Coș Abandonat
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    ID: {selectedCartForDetail.id}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedCartForDetail(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Client:</span>
                    <span className="font-bold text-slate-900">{selectedCartForDetail.customer.fullName}</span>
                    <span className="block text-slate-600">{selectedCartForDetail.customer.email || 'Fără email'}</span>
                    <span className="block text-slate-600">{selectedCartForDetail.customer.phone || 'Fără telefon'}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Valoare & Status:</span>
                    <span className="font-bold text-orange-600 text-sm font-mono">{formatMoney(selectedCartForDetail.totalAmount, selectedCartForDetail.currency)}</span>
                    <span className="block text-slate-600 text-[11px] mt-0.5">
                      Status: <strong className="text-slate-800">{
                        selectedCartForDetail.status === 'recovered' ? 'Comandă Recuperată' :
                        selectedCartForDetail.status === 'active' ? 'În Curs (<30m)' :
                        selectedCartForDetail.status === 'completed' ? 'Finalizată' : 'Coș Abandonat'
                      }</strong>
                    </span>
                    <span className="block text-slate-400 text-[11px]">Creat: {formatDate(selectedCartForDetail.createdAt)}</span>
                  </div>
                </div>

                {/* Produse din coș */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-slate-500 tracking-wider">
                      Produse în Coș ({selectedCartForDetail.items.length})
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      Total: <strong className="text-slate-900 font-mono">{formatMoney(selectedCartForDetail.totalAmount, selectedCartForDetail.currency)}</strong>
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden bg-white max-h-56 overflow-y-auto">
                    {selectedCartForDetail.items.map((item, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          {item.image ? (
                            <img
                              src={getOptimizedImageUrl(item.image)}
                              alt={item.name}
                              className="w-11 h-11 object-cover rounded-lg border border-slate-200 shrink-0 bg-slate-50"
                            />
                          ) : (
                            <div className="w-11 h-11 bg-slate-100 rounded-lg flex items-center justify-center shrink-0 text-slate-400">
                              <ShoppingCart size={18} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 truncate">{item.name}</h4>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-medium">
                              <span>Cantitate: <strong>{item.quantity}</strong></span>
                              <span>•</span>
                              <span>Preț: <strong>{formatMoney(item.price, selectedCartForDetail.currency)}</strong></span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono text-xs font-black text-slate-900">
                            {formatMoney(item.price * item.quantity, selectedCartForDetail.currency)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Adresă & Livrare */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500 font-bold mb-1">
                    <MapPin size={13} className="text-slate-400" />
                    <span className="text-[10px] uppercase tracking-wider">Adresă de Livrare:</span>
                  </div>
                  <p className="font-bold text-slate-800">
                    {[selectedCartForDetail.customer.line1, selectedCartForDetail.customer.line2].filter(Boolean).join(', ') || 'Fără adresă completată'}
                  </p>
                  <p className="text-slate-600">
                    {[selectedCartForDetail.customer.city, selectedCartForDetail.customer.state, selectedCartForDetail.customer.postalCode, selectedCartForDetail.customer.country].filter(Boolean).join(', ')}
                  </p>
                  {selectedCartForDetail.customer.branchName && (
                    <p className="text-[11px] font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded inline-block mt-1 border border-purple-200/50">
                      Locker / Easybox: {selectedCartForDetail.customer.branchName}
                    </p>
                  )}
                </div>

                {/* Audit Trimiteri Emailuri */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                    <Mail size={13} /> Istoric Notificări & Emailuri Trimise
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <span className="font-bold text-slate-700 block">Reminder 24h:</span>
                      {selectedCartForDetail.recoveryEmailsSent?.['24h'] ? (
                        <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                          ✓ Trimis {selectedCartForDetail.recoveryEmailsSent?.['24h_sent_at'] ? `pe ${formatDate(selectedCartForDetail.recoveryEmailsSent['24h_sent_at'])}` : ''}
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 italic mt-0.5">Netrimis</div>
                      )}
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <span className="font-bold text-slate-700 block">Ofertă 72h:</span>
                      {selectedCartForDetail.recoveryEmailsSent?.['72h'] ? (
                        <div className="text-[11px] text-purple-700 font-semibold mt-0.5">
                          ✓ Trimis {selectedCartForDetail.recoveryEmailsSent?.['72h_sent_at'] ? `pe ${formatDate(selectedCartForDetail.recoveryEmailsSent['72h_sent_at'])}` : ''}
                          <span className="block font-mono text-[10px] text-slate-500">
                            Cupon: {selectedCartForDetail.recoveryEmailsSent?.last_coupon_code || 'TREN10'}
                          </span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 italic mt-0.5">Netrimis</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Link Checkout Direct */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-purple-50/60 border border-purple-200 rounded-xl">
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-xs font-black text-purple-950 block">Link Direct Recuperare Coș</span>
                    <span className="text-[11px] text-purple-700 font-mono block truncate">
                      {selectedCartForDetail.recoveryUrl}
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(selectedCartForDetail.recoveryUrl, 'checkout-url', 'Link Coș')}
                    className="px-3 py-1.5 text-xs font-bold text-purple-700 bg-white hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors flex items-center gap-1 shrink-0 self-start sm:self-auto cursor-pointer"
                  >
                    <Copy size={12} /> Copiază Link
                  </button>
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  {selectedCartForDetail.customer.email && selectedCartForDetail.status !== 'recovered' && (
                    <button
                      onClick={() => {
                        const target = selectedCartForDetail;
                        setSelectedCartForDetail(null);
                        setDiscountModal({
                          isOpen: true,
                          cart: target,
                          mode: 'existing',
                          selectedCouponCode: default72hCoupon,
                          customCouponCode: '',
                          customDiscountValue: 10
                        });
                      }}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <Tag size={12} />
                      <span>Trimite email cu reducere</span>
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setSelectedCartForDetail(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Închide
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
