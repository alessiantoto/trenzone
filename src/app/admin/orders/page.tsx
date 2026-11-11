"use client";

import { getOptimizedImageUrl } from '@/lib/utils/imageProxy';
import { getSingleFlavorImage, resolveItemImage } from '@/lib/product-images';
import React, { useEffect, useState, useMemo, useCallback, Suspense } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  Package, 
  Layers, 
  FileText, 
  Truck, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  RotateCcw, 
  Printer, 
  Trash2, 
  Copy, 
  Check, 
  ExternalLink, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  Banknote, 
  Sparkles, 
  Gift, 
  Tag, 
  Maximize2, 
  Minimize2, 
  X,
  Pencil,
  Lock,
  Zap,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

import { useSearchParams } from 'next/navigation';
import { deleteOrderAction, updateOrderShippingAction, updateOrderStatusAction } from '@/app/actions/orders';
import { generateManualAwbAction, deleteAwbAction, syncAllTrackingAction } from '@/app/actions/awb';
import { emitOblioInvoiceAction } from '@/app/actions/invoices';
import { FulfillmentModal } from './FulfillmentModal';

// 🌟 Modern Custom Checkbox Component
function ModernCheckbox({ 
  checked, 
  onChange, 
  title 
}: { 
  checked: boolean; 
  onChange: () => void; 
  title?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      title={title}
      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-150 shrink-0 cursor-pointer ${
        checked 
          ? 'bg-[#e32f8c] border-[#e32f8c] text-slate-950 shadow-xs ring-2 ring-[#e32f8c]/30' 
          : 'bg-white border-slate-300 hover:border-slate-400 hover:bg-slate-50'
      }`}
    >
      {checked && (
        <Check size={13} strokeWidth={3.5} className="text-slate-950 animate-in zoom-in-75 duration-100" />
      )}
    </button>
  );
}

// Helper to determine if an order is delivered
export function isOrderDelivered(o: any, trackingMap?: Record<string, any>): boolean {
  if (!o || o.status === 'cancelled') return false;
  if (o.status === 'delivered') return true;
  const trackInfo = (trackingMap && (trackingMap[o.id] || (o.supabaseId ? trackingMap[o.supabaseId] : null))) || o.trackingMetadata;
  return Boolean(
    trackInfo?.delivered ||
    trackInfo?.statusCode === 7 ||
    trackInfo?.statusText?.toLowerCase().includes('livrat') ||
    trackInfo?.statusText?.toLowerCase().includes('delivered') ||
    trackInfo?.statusText?.toLowerCase().includes('ramburs')
  );
}

// Helper to determine if an order's AWB is considered PRINTED
// AWB is printed ONLY if:
// 1. Explicitly marked/printed (trackingMetadata?.printed or trackInfo?.printed)
// 2. Or already delivered to customer (cannot be delivered without having been printed!)
export function isOrderPrinted(o: any, trackingMap?: Record<string, any>): boolean {
  if (!o || !o.trackingNumber) return false;
  if (o.status === 'returned' || o.status === 'refunded' || o.status === 'cancelled') return false;
  const trackInfo = (trackingMap && (trackingMap[o.id] || (o.supabaseId ? trackingMap[o.supabaseId] : null))) || o.trackingMetadata;
  return Boolean(
    o.trackingMetadata?.printed ||
    trackInfo?.printed ||
    isOrderDelivered(o, trackingMap)
  );
}

// Helper to determine if an order is NOT PRINTED (Neimprimat)
export function isOrderNotPrinted(o: any, trackingMap?: Record<string, any>): boolean {
  if (!o || !o.trackingNumber) return false;
  if (o.status === 'returned' || o.status === 'refunded' || o.status === 'cancelled') return false;
  return !isOrderPrinted(o, trackingMap);
}
// Helper to determine if an order has preorder items
export function hasOrderPreorderItems(o: any): boolean {
  if (!o) return false;
  if (o.is_preorder || o.isPreorder) return true;
  if (!o.items || !Array.isArray(o.items)) return false;
  return o.items.some((item: any) => isItemPreorder(item));
}

// Helper to determine if a specific item is a preorder item
export function isItemPreorder(item: any): boolean {
  if (!item) return false;
  if (item.stock_status === 'preorder' || item.is_preorder === true) return true;
  if (item.selectedVariant?.stock_status === 'preorder') return true;
  const vName = typeof item.selectedVariant?.name === 'object' 
    ? (item.selectedVariant.name.ro || item.selectedVariant.name.en || '')
    : String(item.selectedVariant?.name || item.variant || '');
  if (vName.toLowerCase().includes('precomand') || vName.toLowerCase().includes('pre-order')) return true;

  if (item.variants?.options) {
    const selectedOpt = item.variants.options.find((opt: any) => {
      const optNameRo = typeof opt.name === 'object' ? opt.name.ro : opt.name;
      const optNameEn = typeof opt.name === 'object' ? opt.name.en : opt.name;
      const selNameRo = typeof item.selectedVariant?.name === 'object' ? (item.selectedVariant.name as any).ro : item.selectedVariant?.name;
      const selNameEn = typeof item.selectedVariant?.name === 'object' ? (item.selectedVariant.name as any).en : item.selectedVariant?.name;
      return optNameRo === selNameRo || optNameEn === selNameEn || optNameRo === selNameEn || optNameEn === selNameRo;
    });
    if (selectedOpt?.stock_status === 'preorder') return true;
  }
  if (item.bundleVariants?.flavor?.options) {
    return item.bundleVariants.flavor.options.some((opt: any) => {
      const optNameRo = typeof opt.name === 'object' ? opt.name.ro : opt.name;
      const optNameEn = typeof opt.name === 'object' ? opt.name.en : opt.name;
      const selNameRo = typeof item.selectedVariant?.name === 'object' ? (item.selectedVariant.name as any).ro : item.selectedVariant?.name;
      const selNameEn = typeof item.selectedVariant?.name === 'object' ? (item.selectedVariant.name as any).en : item.selectedVariant?.name;
      
      const isIncluded = (selNameRo && typeof selNameRo === 'string' && optNameRo && selNameRo.includes(optNameRo)) ||
                         (selNameEn && typeof selNameEn === 'string' && optNameEn && selNameEn.includes(optNameEn));

      return opt.stock_status === 'preorder' && isIncluded;
    });
  }
  return false;
}

const KNOWN_FLAVORS_PREFIX_MAP: Record<string, string> = {
  'pe': 'Pepene Roșu',
  'pep': 'Pepene Roșu',
  'pepen': 'Pepene Roșu',
  'pepene': 'Pepene Roșu',
  'pepene r': 'Pepene Roșu',
  'pepene ro': 'Pepene Roșu',
  'pepene ros': 'Pepene Roșu',
  'pepene rosu': 'Pepene Roșu',
  'fru': 'Fructe de Pădure',
  'fructe': 'Fructe de Pădure',
  'fructe de': 'Fructe de Pădure',
  'fructe de p': 'Fructe de Pădure',
  'fructe de pad': 'Fructe de Pădure',
  'fructe de padure': 'Fructe de Pădure',
  'lam': 'Lămâie și Lime',
  'lamaie': 'Lămâie și Lime',
  'lamaie si': 'Lămâie și Lime',
  'lamaie si l': 'Lămâie și Lime',
  'lamaie si lime': 'Lămâie și Lime',
  'mar': 'Măr Verde',
  'mar v': 'Măr Verde',
  'mar verde': 'Măr Verde',
  'por': 'Portocală',
  'portocala': 'Portocală',
};

export function normalizeFlavor(flavor: string): string {
  if (!flavor) return '';
  const trimmed = flavor.trim();
  const lower = trimmed.toLowerCase();
  if (KNOWN_FLAVORS_PREFIX_MAP[lower]) {
    return KNOWN_FLAVORS_PREFIX_MAP[lower];
  }
  return trimmed;
}

// Helper to extract clean name, variant, and bundle breakdown from an order item
export function getItemDisplayDetails(item: any) {
  const rawName = typeof item?.name === 'object'
    ? (item.name.ro || item.name.en || Object.values(item.name)[0] || 'Produs')
    : (item?.name || 'Produs');

  // Check if item is a bundle
  const isBundle = String(item?.id || '').includes('-bundle-') ||
    Boolean(item?._isBundle) ||
    /pachet|bundle/i.test(rawName) ||
    (typeof item?.slug === 'string' && /pachet|bundle/i.test(item.slug));

  // Extract variant/flavor text
  let variantStr = '';
  if (item?.selectedVariant) {
    if (typeof item.selectedVariant === 'string') {
      variantStr = item.selectedVariant;
    } else if (item.selectedVariant.name) {
      variantStr = typeof item.selectedVariant.name === 'object'
        ? (item.selectedVariant.name.ro || item.selectedVariant.name.en || Object.values(item.selectedVariant.name)[0] || '')
        : String(item.selectedVariant.name);
    }
  } else if (item?.variant) {
    variantStr = typeof item.variant === 'object'
      ? (item.variant.ro || item.variant.en || Object.values(item.variant)[0] || '')
      : String(item.variant);
  } else if (Array.isArray(item?.selectedFlavors) && item.selectedFlavors.length > 0) {
    variantStr = item.selectedFlavors.join(', ');
  } else if (Array.isArray(item?.flavors) && item.flavors.length > 0) {
    variantStr = item.flavors.join(', ');
  }

  // Fallback: extract from parentheses in name, e.g. "Pachet 2 Cutii – Jeleuri cu Creatina (Pepene Rosu, Pepene Rosu)"
  const parenMatch = typeof rawName === 'string' ? rawName.match(/\(([^)]+)\)/) : null;
  if (!variantStr && parenMatch && parenMatch[1]) {
    variantStr = parenMatch[1].trim();
  }

  // Parse individual items/flavors in bundle and auto-expand any truncated flavor prefixes (e.g. "Pe" -> "Pepene Roșu")
  let bundleFlavors: string[] = [];
  if (variantStr) {
    bundleFlavors = variantStr
      .split(/[,+]|\s\+\s/)
      .map((s: string) => normalizeFlavor(s))
      .filter(Boolean);
    if (bundleFlavors.length > 0) {
      variantStr = bundleFlavors.join(', ');
    }
  }

  // Clean title for display without redundant duplicate parentheses if variant is shown separately
  const cleanTitle = parenMatch
    ? rawName.replace(/\s*\([^)]*\)\s*$/, '').trim()
    : rawName;

  return {
    rawName,
    cleanTitle,
    isBundle,
    variantStr,
    bundleFlavors,
  };
}

function OrdersPageContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') || 'all';
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState(initialStatus); // all, pending_awb, generated_awb, returned, delivered, preorder
  const [paymentFilter, setPaymentFilter] = useState('all'); // all, card, cod
  const [error, setError] = useState<string | null>(null);
  
  // Tracking & Action loading states
  const [trackingStatus, setTrackingStatus] = useState<Record<string, any>>({});
  const [fetchingTracking, setFetchingTracking] = useState<Record<string, boolean>>({});
  const [isSyncingAllTracking, setIsSyncingAllTracking] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [generatingAwb, setGeneratingAwb] = useState(false);
  const [deletingAwb, setDeletingAwb] = useState<Record<string, boolean>>({});
  const [printingAwb, setPrintingAwb] = useState<Record<string, boolean>>({});
  const [emittingOblioOrders, setEmittingOblioOrders] = useState<Record<string, boolean>>({});
  
  // Fulfillment & Manual Shipping State
  const [showFulfillmentModal, setShowFulfillmentModal] = useState(false);
  const [manualShippingEnabled, setManualShippingEnabled] = useState(false);
  const [fulfillmentSettings, setFulfillmentSettings] = useState<any>(null);

  useEffect(() => {
    if (searchParams.get('fulfillment') === 'open') {
      setShowFulfillmentModal(true);
    }
    const s = searchParams.get('status');
    if (s) {
      setStatusFilter(s);
    }
    const q = searchParams.get('search');
    if (q) {
      setSearchQuery(q);
      setStatusFilter('all');
    }
  }, [searchParams]);

  useEffect(() => {
    if (manualShippingEnabled && ['pending_awb', 'generated_awb', 'printed', 'not_printed'].includes(statusFilter)) {
      setStatusFilter('all');
    }
  }, [manualShippingEnabled, statusFilter]);

  // Accordion state (set of expanded order IDs)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  
  // Clipboard feedback state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Edit Shipping Modal State
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  const [savingShipping, setSavingShipping] = useState(false);
  const [editForm, setEditForm] = useState({
    customerFirstName: '',
    customerLastName: '',
    customerPhone: '',
    customerEmail: '',
    addrLine1: '',
    addrLine2: '',
    addrCity: '',
    addrZip: '',
    addrCountry: 'RO',
  });

  const [popup, setPopup] = useState<{
    isOpen: boolean;
    type: 'confirm' | 'alert';
    variant?: 'danger' | 'primary';
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
  }>({ isOpen: false, type: 'alert', title: '', message: '' });

  const showAlert = (title: string, message: string) => {
    setPopup({ isOpen: true, type: 'alert', title, message });
  };

  const copyToClipboard = (text: string, key: string, label: string = 'Copiat') => {
    if (!text || text === 'N/A') return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`${label} copiat în clipboard!`, { duration: 2000 });
    setTimeout(() => {
      setCopiedKey(prev => (prev === key ? null : prev));
    }, 2000);
  };

  const toggleExpandOrder = (orderId: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const toggleExpandAll = () => {
    if (expandedOrders.size === filteredOrders.length && filteredOrders.length > 0) {
      setExpandedOrders(new Set());
    } else {
      setExpandedOrders(new Set(filteredOrders.map(o => o.id)));
    }
  };

  const openEditShipping = (order: any) => {
    const nameParts = (order.customer || '').trim().split(' ');
    const defaultFirst = order.customerFirstName || nameParts.slice(0, -1).join(' ') || nameParts[0] || '';
    const defaultLast = order.customerLastName || (nameParts.length > 1 ? nameParts[nameParts.length - 1] : '');

    setEditingOrder(order);
    setEditForm({
      customerFirstName: defaultFirst,
      customerLastName: defaultLast,
      customerPhone: order.phone && order.phone !== 'N/A' ? order.phone : '',
      customerEmail: order.customerEmail && order.customerEmail !== 'N/A' ? order.customerEmail : '',
      addrLine1: order.addrLine1 || order.address || '',
      addrLine2: order.addrLine2 || '',
      addrCity: order.addrCity || '',
      addrZip: order.addrZip || '',
      addrCountry: order.addrCountry || 'RO',
    });
  };

  const handleSaveShipping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    setSavingShipping(true);
    const toastId = toast.loading('Se actualizează datele de livrare...');
    try {
      const res = await updateOrderShippingAction(editingOrder.supabaseId || editingOrder.id, editForm);
      if (res.success) {
        toast.success('Informațiile de livrare au fost actualizate!', { id: toastId });
        setEditingOrder(null);
        await fetchOrders();
      } else {
        toast.error(`Eroare: ${res.error}`, { id: toastId });
      }
    } catch (err: any) {
      toast.error('A apărut o eroare la salvare.', { id: toastId });
    } finally {
      setSavingShipping(false);
    }
  };

  const handleSyncAllTracking = async () => {
    if (isSyncingAllTracking) return;
    setIsSyncingAllTracking(true);
    const toastId = toast.loading('Se verifică și sincronizează statusurile AWB cu curierii...');
    try {
      const res = await syncAllTrackingAction();
      if (res.success && res.result) {
        const { updatedCount, deliveredCount, totalChecked } = res.result;
        toast.success(
          `Sincronizare finalizată: ${totalChecked} verificate, ${updatedCount} actualizate (${deliveredCount} livrate).`,
          { id: toastId, duration: 4500 }
        );
        await fetchOrders();
      } else {
        toast.error(`Eroare: ${res.error || 'Sincronizare eșuată'}`, { id: toastId });
      }
    } catch (err: any) {
      toast.error('A apărut o eroare la sincronizarea AWB-urilor.', { id: toastId });
    } finally {
      setIsSyncingAllTracking(false);
    }
  };

  const confirmDeleteOrder = (orderId: string, displayId?: string) => {
    setPopup({
      isOpen: true,
      type: 'confirm',
      variant: 'danger',
      title: `Ștergere Definitivă ${displayId || ''}`.trim() || 'Ștergere Definitivă Comandă',
      message: `Ești sigur că vrei să ștergi definitiv comanda ${displayId || orderId} din baza de date?\n\nAceastă acțiune este ireversibilă și va șterge toate datele asociate comenzii.`,
      confirmText: 'Da, șterge definitiv',
      cancelText: 'Renunță',
      onConfirm: () => executeDeleteOrder(orderId)
    });
  };

  const executeDeleteOrder = async (orderId: string) => {
    setPopup(p => ({ ...p, isOpen: false }));
    try {
      const res = await deleteOrderAction(orderId);
      if (res.success) {
        toast.success('Comanda a fost ștearsă.');
        fetchOrders();
      } else {
        toast.error(`Eroare: ${res.error}`);
      }
    } catch (err) {
      toast.error('A apărut o eroare la ștergere.');
    }
  };

  const confirmCancelOrder = (orderId: string, displayId?: string) => {
    setPopup({
      isOpen: true,
      type: 'confirm',
      variant: 'danger',
      title: 'Anulare Comandă',
      message: `Ești sigur că vrei să anulezi comanda ${displayId || orderId}?\n\nComanda va fi trecută în statusul "Anulată" și va apărea inactivă (gri) în listă.`,
      confirmText: 'Da, anulează comanda',
      cancelText: 'Renunță',
      onConfirm: () => executeUpdateOrderStatus(orderId, 'cancelled', 'Comanda a fost anulată.')
    });
  };

  const confirmReactivateOrder = (orderId: string, displayId?: string) => {
    setPopup({
      isOpen: true,
      type: 'confirm',
      variant: 'primary',
      title: 'Reactivare Comandă',
      message: `Vrei să reactivezi comanda ${displayId || orderId}?\n\nComanda va redeveni activă și va reveni în procesare normală.`,
      confirmText: 'Da, reactivează',
      cancelText: 'Renunță',
      onConfirm: () => executeUpdateOrderStatus(orderId, 'processing', 'Comanda a fost reactivată.')
    });
  };

  const executeUpdateOrderStatus = async (orderId: string, newStatus: string, successMsg: string) => {
    setPopup(p => ({ ...p, isOpen: false }));
    const toastId = toast.loading('Se actualizează statusul comenzii...');
    try {
      const res = await updateOrderStatusAction(orderId, newStatus);
      if (res.success) {
        toast.success(successMsg, { id: toastId });
        setOrders(prev => prev.map(o => {
          if (o.id === orderId || o.supabaseId === orderId) {
            return { ...o, status: newStatus };
          }
          return o;
        }));
      } else {
        toast.error(`Eroare: ${res.error}`, { id: toastId });
      }
    } catch (err: any) {
      toast.error('A apărut o eroare la actualizarea comenzii.', { id: toastId });
    }
  };

  const handleEmitOblioFromOrders = async (orderId: string) => {
    setEmittingOblioOrders(prev => ({ ...prev, [orderId]: true }));
    const toastId = toast.loading('Se emite factura în Oblio și se transmite la SPV...');

    try {
      const res = await emitOblioInvoiceAction(orderId);
      if (res.success) {
        toast.success(`Factura ${res.seriesName} ${res.number} a fost emisă și transmisă în SPV!`, { id: toastId });
        setOrders(prev => prev.map(o => {
          if (o.id === orderId || o.supabaseId === orderId) {
            return {
              ...o,
              oblioInvoice: {
                seriesName: res.seriesName,
                number: res.number,
                link: res.link,
                einvoiceStatus: res.einvoiceStatus,
                emittedAt: new Date().toISOString(),
              },
            };
          }
          return o;
        }));
      } else {
        toast.error(res.error || 'Eroare la emiterea facturii în Oblio.', { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || 'Eroare la conexiunea cu Oblio.', { id: toastId });
    } finally {
      setEmittingOblioOrders(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const confirmGenerateAwb = (orderIds: string[]) => {
    if (manualShippingEnabled) {
      toast.error('Expedierea manuală este activată în Setări. Generarea de AWB este blocată.');
      return;
    }
    if (orderIds.length === 0) return;
    const resolvedIds = orderIds.map(id => {
      const order = orders.find(o => o.id === id || o.supabaseId === id);
      return order?.supabaseId || id;
    });
    setPopup({
      isOpen: true,
      type: 'confirm',
      title: 'Generare AWB',
      message: `Generezi AWB pentru ${resolvedIds.length} comandă / comenzi?`,
      onConfirm: () => executeGenerateAwb(resolvedIds)
    });
  };

  const executeGenerateAwb = async (orderIds: string[]) => {
    setPopup(p => ({ ...p, isOpen: false }));
    setGeneratingAwb(true);
    const toastId = toast.loading(`Se generează ${orderIds.length} AWB-uri...`);
    try {
      const response = await fetch('/api/admin/orders/generate-awb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds })
      });
      
      const res = await response.json();
      
      if (res.success && res.generatedCount > 0) {
        toast.success(`✓ ${res.generatedCount} AWB-uri generate cu succes!`, { id: toastId });
        setSelectedOrders([]);
        await fetchOrders();
      } else if (!res.success) {
        toast.error(`Eroare: ${res.error || 'Generare eșuată'}`, { id: toastId });
      } else {
        toast.dismiss(toastId);
      }
      if (res.errors && res.errors.length > 0) {
        // Group errors by message to avoid repetition
        const grouped = new Map<string, string[]>();
        for (const e of res.errors) {
          const key = e.message;
          if (!grouped.has(key)) grouped.set(key, []);
          grouped.get(key)!.push(e.id);
        }
        
        const lines: string[] = [];
        for (const [msg, ids] of grouped) {
          if (ids.length <= 3) {
            lines.push(`${ids.join(', ')}:\n→ ${msg}`);
          } else {
            lines.push(`${ids.slice(0, 3).join(', ')} + alte ${ids.length - 3}:\n→ ${msg}`);
          }
        }
        
        const successInfo = res.generatedCount > 0 ? `✓ ${res.generatedCount} AWB-uri generate cu succes.\n\n` : '';
        showAlert(
          `${res.errors.length} comenzi cu probleme`, 
          `${successInfo}${lines.join('\n\n')}`
        );
      }
    } catch (err: any) {
      toast.error(`Eroare tehnică (ex: Rețea / Permisiuni): ${err?.message || err}`, { id: toastId });
    } finally {
      setGeneratingAwb(false);
    }
  };

  const handlePrintAwbs = async (orderIds: string[]) => {
    // Create the URL before doing anything async
    const url = `/api/admin/orders/bulk-awb-pdf?ids=${orderIds.map(selectedId => {
      const order = orders.find(o => o.id === selectedId || o.supabaseId === selectedId);
      return order ? order.supabaseId : selectedId;
    }).join(',')}`;
    
    // Open the print PDF in a new tab immediately
    window.open(url, '_blank');

    // Optimistically mark the orders as printed in local state
    setOrders(prev => prev.map(o => {
      const isTarget = selectedOrders.includes(o.id) || (o.supabaseId && selectedOrders.includes(o.supabaseId));
      if (isTarget) {
        return {
          ...o,
          trackingMetadata: {
            ...(o.trackingMetadata || {}),
            printed: true
          }
        };
      }
      return o;
    }));

    // Mark the orders as printed in the background
    const mappedIds = orderIds.map(selectedId => {
      const order = orders.find(o => o.id === selectedId || o.supabaseId === selectedId);
      return order?.supabaseId || selectedId;
    });

    try {
      const res = await fetch('/api/admin/mark-awb-printed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: mappedIds })
      });
      if (res.ok) {
        // Refresh orders silently to update the "Printed" badge
        await fetchOrders();
      }
    } catch (err) {
      console.error('Failed to mark AWBs as printed', err);
    }
  };

  const confirmDeleteAwb = (orderId: string) => {
    if (manualShippingEnabled) {
      toast.error('Expedierea manuală este activată în Setări. Resetarea AWB este blocată.');
      return;
    }
    setPopup({
      isOpen: true,
      type: 'confirm',
      title: 'Resetare AWB',
      message: 'Ești sigur că vrei să resetezi AWB-ul? Aceasta îți va permite să generezi altul.',
      onConfirm: () => executeDeleteAwb(orderId)
    });
  };

  const executeDeleteAwb = async (orderId: string) => {
    setPopup(p => ({ ...p, isOpen: false }));
    setDeletingAwb(prev => ({ ...prev, [orderId]: true }));
    const toastId = toast.loading('Se resetează AWB-ul...');
    try {
      const res = await deleteAwbAction(orderId);
      if (res.success) {
        toast.success('AWB resetat cu succes!', { id: toastId });
        await fetchOrders();
      } else {
        toast.error(`Eroare: ${res.error}`, { id: toastId });
      }
    } catch (err: any) {
      toast.error('Eroare neașteptată la resetarea AWB-ului.', { id: toastId });
    } finally {
      setDeletingAwb(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/orders');
      const json = await res.json();
      const data = Array.isArray(json) ? json : (json.orders || json.data || []);
      setOrders(data);

      // Fetch fulfillment settings
      fetch('/api/admin/data?action=fulfillment-settings')
        .then(r => r.json())
        .then(j => {
          if (j?.data) {
            setFulfillmentSettings(j.data);
            setManualShippingEnabled(Boolean(j.data.manual_shipping_enabled));
          }
        })
        .catch(() => {});
      
      const savedTracking: Record<string, any> = {};
      data.forEach((o: any) => {
        if (
          o.trackingMetadata && 
          typeof o.trackingMetadata === 'object' && 
          Object.keys(o.trackingMetadata).length > 0 && 
          (o.trackingMetadata.statusText || o.trackingMetadata.status)
        ) {
          savedTracking[o.id] = o.trackingMetadata;
          if (o.supabaseId) {
            savedTracking[o.supabaseId] = o.trackingMetadata;
          }
        }
      });
      setTrackingStatus(prev => ({ ...prev, ...savedTracking }));

      // Auto-sync active orders with tracking numbers that don't have tracking metadata yet
      const unsyncedCount = data.filter((o: any) => 
        o.trackingNumber && 
        o.status !== 'delivered' && 
        o.status !== 'returned' && 
        o.status !== 'refunded' && 
        (!o.trackingMetadata || (!o.trackingMetadata.statusText && !o.trackingMetadata.status))
      ).length;

      if (unsyncedCount > 0) {
        syncAllTrackingAction().then((res) => {
          if (res.success && res.result && res.result.updatedCount > 0) {
            fetch('/api/admin/data?action=orders').then(r => r.json()).then(j => j.data).then((freshData) => {
              setOrders(freshData);
              const freshTracking: Record<string, any> = {};
              freshData.forEach((o: any) => {
                if (o.trackingMetadata && (o.trackingMetadata.statusText || o.trackingMetadata.status)) {
                  freshTracking[o.id] = o.trackingMetadata;
                  if (o.supabaseId) freshTracking[o.supabaseId] = o.trackingMetadata;
                }
              });
              setTrackingStatus(prev => ({ ...prev, ...freshTracking }));
            });
          }
        }).catch(err => console.warn('[AUTO SYNC] Background tracking error:', err));
      }
    } catch (err: any) {
      setError(err.message || 'Eroare la încărcarea comenzilor');
    } finally {
      setLoading(false);
    }
  };

  const fetchTracking = async (orderId: string) => {
    if (fetchingTracking[orderId]) return;
    
    setFetchingTracking(prev => ({ ...prev, [orderId]: true }));
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/tracking`);
      const data = await res.json();
      if (data && (data.statusText || data.status || data.error)) {
        setTrackingStatus(prev => {
          const updated = { ...prev, [orderId]: data };
          const order = orders.find(o => o.id === orderId || o.supabaseId === orderId);
          if (order) {
            updated[order.id] = data;
            if (order.supabaseId) updated[order.supabaseId] = data;
          }
          return updated;
        });
        toast.success(`Status AWB: ${data.statusText || data.status || 'Actualizat'}`);
      }
    } catch (err) {
      toast.error("Eroare la verificarea tracking-ului.");
    } finally {
      setFetchingTracking(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handlePrintAwb = async (orderId: string, trackingNumber: string) => {
    if (printingAwb[orderId]) return;
    setPrintingAwb(prev => ({ ...prev, [orderId]: true }));
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/tracking`);
      const statusData = await res.json();
      
      setTrackingStatus(prev => ({ ...prev, [orderId]: statusData }));
      
      if (statusData.error || statusData.failed) {
        showAlert('Eroare AWB', `Nu se poate printa AWB-ul. Status: ${statusData.statusText || 'Anulat sau invalid'}`);
        return;
      }
      
      window.open(`/api/admin/orders/${orderId}/awb-pdf`, '_blank');
      
      // Optimistically mark as printed in local state
      setOrders(prev => prev.map(o => {
        if (o.id === orderId || o.supabaseId === orderId) {
          return {
            ...o,
            trackingMetadata: {
              ...(o.trackingMetadata || {}),
              printed: true
            }
          };
        }
        return o;
      }));

      // Mark as printed in the background
      fetch('/api/admin/mark-awb-printed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: [orderId] })
      }).then(r => {
        if (r.ok) fetchOrders();
      });
    } catch (err) {
      showAlert('Eroare Verificare', "Eroare la verificarea live a AWB-ului. Deschidem direct PDF-ul.");
      window.open(`/api/admin/orders/${orderId}/awb-pdf`, '_blank');
      
      // Optimistically mark as printed in local state
      setOrders(prev => prev.map(o => {
        if (o.id === orderId || o.supabaseId === orderId) {
          return {
            ...o,
            trackingMetadata: {
              ...(o.trackingMetadata || {}),
              printed: true
            }
          };
        }
        return o;
      }));

      // Mark as printed in the background even if live check fails
      fetch('/api/admin/mark-awb-printed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: [orderId] })
      }).then(r => {
        if (r.ok) fetchOrders();
      });
    } finally {
      setPrintingAwb(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // Filter calculations
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        (o.id && o.id.toLowerCase().includes(q)) || 
        (o.customer && o.customer.toLowerCase().includes(q)) ||
        (o.customerEmail && o.customerEmail.toLowerCase().includes(q)) ||
        (o.phone && o.phone.toLowerCase().includes(q)) ||
        (o.customerPhone && o.customerPhone.toLowerCase().includes(q)) ||
        (o.trackingNumber && o.trackingNumber.toLowerCase().includes(q)) ||
        (o.couponCode && String(o.couponCode).toLowerCase().includes(q)) ||
        (o.couponId && String(o.couponId).toLowerCase().includes(q));
      
      let matchesMonth = true;
      if (monthFilter !== 'all' && o.date) {
        matchesMonth = o.date.includes(monthFilter) || o.date.includes(monthFilter.toLowerCase());
      }

      let matchesStatus = true;
      const isPreorder = hasOrderPreorderItems(o);

      if (statusFilter === 'all') {
        matchesStatus = q ? true : !isPreorder;
      } else if (statusFilter === 'pending_awb') {
        matchesStatus = !o.trackingNumber && o.status !== 'returned' && o.status !== 'refunded' && o.status !== 'cancelled' && !isPreorder;
      } else if (statusFilter === 'generated_awb') {
        matchesStatus = !!o.trackingNumber && o.status !== 'returned' && o.status !== 'refunded' && o.status !== 'cancelled' && !isPreorder;
      } else if (statusFilter === 'printed') {
        matchesStatus = isOrderPrinted(o, trackingStatus) && !isPreorder;
      } else if (statusFilter === 'not_printed') {
        matchesStatus = isOrderNotPrinted(o, trackingStatus) && !isPreorder;
      } else if (statusFilter === 'delivered') {
        matchesStatus = isOrderDelivered(o, trackingStatus) && !isPreorder;
      } else if (statusFilter === 'returned') {
        matchesStatus = (o.status === 'returned' || o.status === 'refunded') && !isPreorder;
      } else if (statusFilter === 'cancelled') {
        matchesStatus = o.status === 'cancelled' && !isPreorder;
      } else if (statusFilter === 'preorder') {
        matchesStatus = isPreorder;
      } else if (statusFilter === 'fulfillment_sent') {
        matchesStatus = Boolean(o.fulfillmentDispatchedAt) && !isPreorder;
      } else if (statusFilter === 'fulfillment_pending') {
        matchesStatus = !o.fulfillmentDispatchedAt && o.status !== 'cancelled' && o.status !== 'returned' && o.status !== 'refunded' && !isPreorder;
      }

      let matchesPayment = true;
      const isRamburs = o.paymentMethod === 'cod';
      if (paymentFilter === 'cod') matchesPayment = isRamburs;
      if (paymentFilter === 'card') matchesPayment = !isRamburs;

      return matchesSearch && matchesMonth && matchesStatus && matchesPayment;
    });
  }, [orders, searchQuery, monthFilter, statusFilter, paymentFilter, trackingStatus]);

  // Status counts for quick filter pills
  const counts = useMemo(() => {
    const total = orders.filter(o => !hasOrderPreorderItems(o)).length;
    const pendingAwb = orders.filter(o => !hasOrderPreorderItems(o) && !o.trackingNumber && o.status !== 'returned' && o.status !== 'refunded' && o.status !== 'cancelled').length;
    const generatedAwb = orders.filter(o => !hasOrderPreorderItems(o) && !!o.trackingNumber && o.status !== 'returned' && o.status !== 'refunded' && o.status !== 'cancelled').length;
    const printed = orders.filter(o => !hasOrderPreorderItems(o) && isOrderPrinted(o, trackingStatus)).length;
    const notPrinted = orders.filter(o => !hasOrderPreorderItems(o) && isOrderNotPrinted(o, trackingStatus)).length;
    const delivered = orders.filter(o => !hasOrderPreorderItems(o) && isOrderDelivered(o, trackingStatus)).length;
    const returned = orders.filter(o => !hasOrderPreorderItems(o) && (o.status === 'returned' || o.status === 'refunded')).length;
    const cancelled = orders.filter(o => !hasOrderPreorderItems(o) && o.status === 'cancelled').length;
    const preorder = orders.filter(o => hasOrderPreorderItems(o)).length;
    const fulfillmentSent = orders.filter(o => !hasOrderPreorderItems(o) && Boolean(o.fulfillmentDispatchedAt)).length;
    const fulfillmentPending = orders.filter(o => !hasOrderPreorderItems(o) && !o.fulfillmentDispatchedAt && o.status !== 'cancelled' && o.status !== 'returned' && o.status !== 'refunded').length;
    return { total, pendingAwb, generatedAwb, printed, notPrinted, delivered, returned, cancelled, preorder, fulfillmentSent, fulfillmentPending };
  }, [orders, trackingStatus]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5 pb-24 text-slate-900 animate-in fade-in duration-500 overflow-x-hidden">
      
      {/* 🌟 HEADER & SUMMARY */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Comenzi</h1>
            <span className="text-xs font-black px-2.5 py-1 bg-slate-200/80 text-slate-700 rounded-full">
              {orders.length}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Gestionează comenzile și expedierile.</p>
        </div>

        {/* Global actions (Refresh & Expand All) */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="h-9 sm:h-10 px-3 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
            title="Reîncarcă comenzile"
          >
            <RotateCcw size={14} className={loading ? 'animate-spin text-[#e32f8c]' : ''} />
            <span className="hidden sm:inline">Reîmprospătează</span>
          </button>

          <button
            onClick={handleSyncAllTracking}
            disabled={isSyncingAllTracking || loading || manualShippingEnabled}
            className={`h-9 sm:h-10 px-3 border rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95 ${
              manualShippingEnabled
                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 cursor-pointer disabled:opacity-50'
            }`}
            title={manualShippingEnabled ? "Sincronizarea AWB este dezactivată în modul Expediere Manuală" : "Sincronizează automat statusul tuturor coletelor nelivrate din Sameday și Packeta"}
          >
            <Truck size={14} className={isSyncingAllTracking ? 'animate-bounce text-[#e32f8c]' : 'text-slate-500'} />
            <span className="hidden sm:inline">{isSyncingAllTracking ? 'Se sincronizează...' : 'Sincronizează AWB'}</span>
          </button>

          {/* 📦 Centru Fulfillment Button */}
          <button
            onClick={() => setShowFulfillmentModal(true)}
            className={`h-9 sm:h-10 px-3 border rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer ${
              manualShippingEnabled
                ? 'bg-amber-500 text-white border-amber-600 shadow-amber-200'
                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
            }`}
            title="Configurează email depozit, vezi template-ul și istoricul de fulfillment"
          >
            <Truck size={14} className={manualShippingEnabled ? 'text-white' : 'text-[#e32f8c]'} />
            <span className="hidden sm:inline">Centru Fulfillment</span>
            <span className="sm:hidden">Fulfillment</span>
            {manualShippingEnabled && (
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            )}
          </button>

          <button
            onClick={toggleExpandAll}
            className="h-9 sm:h-10 px-3 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
            title={expandedOrders.size === filteredOrders.length ? "Restrânge toate" : "Extinde toate"}
          >
            {expandedOrders.size === filteredOrders.length && filteredOrders.length > 0 ? (
              <>
                <Minimize2 size={14} />
                <span>Restrânge Toate</span>
              </>
            ) : (
              <>
                <Maximize2 size={14} />
                <span>Extinde Toate</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 📦 Expediere Manuală Active Banner */}
      {manualShippingEnabled && (
        <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Truck size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-amber-900 tracking-wider">Mod Expediere Manuală Activ</span>
                <span className="text-[10px] font-bold bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded-full">Centru Fulfillment</span>
              </div>
              <p className="text-xs text-amber-800/90 mt-0.5">
                AWB-urile sunt gestionate de centrul de fulfillment. Butoanele de generare și resetare AWB din TrenZone sunt blocate conform setărilor.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowFulfillmentModal(true)}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs self-start sm:self-auto"
          >
            Deschide Fulfillment
          </button>
        </div>
      )}

      {/* 🚀 QUICK STATUS FILTERS (Balanced 3x2 Grid on Mobile, 6 Cols on Desktop) */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 w-full">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-between cursor-pointer ${
            statusFilter === 'all' 
              ? 'bg-slate-900 text-white shadow-sm ring-1 ring-slate-900' 
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
          }`}
        >
          <span>Toate</span>
          <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${statusFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {counts.total}
          </span>
        </button>

        {manualShippingEnabled ? (
          <>
            <button
              onClick={() => setStatusFilter('fulfillment_pending')}
              className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-between cursor-pointer ${
                statusFilter === 'fulfillment_pending'
                  ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-400/40' 
                  : 'bg-amber-50/80 border border-amber-200 text-amber-900 hover:bg-amber-100 shadow-xs'
              }`}
            >
              <span className="truncate mr-1">În Așteptare Depozit</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${statusFilter === 'fulfillment_pending' ? 'bg-white/20 text-white' : 'bg-amber-200 text-amber-900'}`}>
                {counts.fulfillmentPending}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('fulfillment_sent')}
              className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-between cursor-pointer ${
                statusFilter === 'fulfillment_sent' 
                  ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-700' 
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
              }`}
            >
              <span className="truncate mr-1">Trimise Fulfillment</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] shrink-0 ${statusFilter === 'fulfillment_sent' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700'}`}>
                {counts.fulfillmentSent}
              </span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setStatusFilter('pending_awb')}
              className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-between cursor-pointer ${
                statusFilter === 'pending_awb'
                  ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-400/40' 
                  : 'bg-amber-50/80 border border-amber-200 text-amber-900 hover:bg-amber-100 shadow-xs'
              }`}
            >
              <span className="truncate mr-1">Fără AWB</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${statusFilter === 'pending_awb' ? 'bg-white/20 text-white' : 'bg-amber-200 text-amber-900'}`}>
                {counts.pendingAwb}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('generated_awb')}
              className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-between cursor-pointer ${
                statusFilter === 'generated_awb' 
                  ? 'bg-[#e32f8c] text-slate-950 shadow-sm ring-1 ring-[#00b0ce]' 
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
              }`}
            >
              <span className="truncate mr-1">Cu AWB</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] shrink-0 ${statusFilter === 'generated_awb' ? 'bg-black/20 text-black' : 'bg-slate-100 text-slate-600'}`}>
                {counts.generatedAwb}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('printed')}
              className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-between cursor-pointer ${
                statusFilter === 'printed' 
                  ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-700' 
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
              }`}
            >
              <span className="truncate mr-1">Imprimate</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] shrink-0 ${statusFilter === 'printed' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700'}`}>
                {counts.printed}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('not_printed')}
              className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-between cursor-pointer ${
                statusFilter === 'not_printed' 
                  ? 'bg-orange-500 text-white shadow-sm ring-1 ring-orange-600' 
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
              }`}
            >
              <span className="truncate mr-1">Neimprimate</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] shrink-0 ${statusFilter === 'not_printed' ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-700'}`}>
                {counts.notPrinted}
              </span>
            </button>
          </>
        )}

        <button
          onClick={() => setStatusFilter('delivered')}
          className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-between cursor-pointer ${
            statusFilter === 'delivered' 
              ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-700' 
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
          }`}
        >
          <span className="truncate mr-1">Livrate</span>
          <span className={`px-1.5 py-0.5 rounded-md text-[10px] shrink-0 ${statusFilter === 'delivered' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {counts.delivered}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('returned')}
          className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-between cursor-pointer ${
            statusFilter === 'returned' 
              ? 'bg-red-600 text-white shadow-sm ring-1 ring-red-700' 
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
          }`}
        >
          <span className="truncate mr-1">Returnate</span>
          <span className={`px-1.5 py-0.5 rounded-md text-[10px] shrink-0 ${statusFilter === 'returned' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {counts.returned}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('cancelled')}
          className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-between cursor-pointer ${
            statusFilter === 'cancelled' 
              ? 'bg-slate-700 text-white shadow-sm ring-1 ring-slate-800' 
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
          }`}
        >
          <span className="truncate mr-1">Anulate</span>
          <span className={`px-1.5 py-0.5 rounded-md text-[10px] shrink-0 ${statusFilter === 'cancelled' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {counts.cancelled}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('preorder')}
          className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-between cursor-pointer ${
            statusFilter === 'preorder' 
              ? 'bg-[#e32f8c] text-white shadow-sm ring-1 ring-[#e32f8c]' 
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
          }`}
        >
          <span className="flex items-center gap-1.5 truncate mr-1">
            <Clock size={12} className="shrink-0" /> Precomenzi
          </span>
          <span className={`px-1.5 py-0.5 rounded-md text-[10px] shrink-0 ${statusFilter === 'preorder' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {counts.preorder}
          </span>
        </button>
      </div>

      {/* 🔍 SEARCH & FILTERS BAR (NO OVERFLOW) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-xs space-y-2.5 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
        {/* Search input (full width on mobile) */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Caută după comandă (TZ), nume, telefon, email, AWB..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-9 text-xs sm:text-sm focus:outline-none focus:border-[#e32f8c] focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
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

        {/* Filter dropdowns: 50% / 50% on mobile, no mystery package buttons */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
          {/* Month selector */}
          <div className="relative w-full sm:w-44">
            <div 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="h-10 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 flex items-center justify-between gap-1.5 cursor-pointer transition-all text-xs font-bold text-slate-700"
            >
              <div className="flex items-center gap-1.5 truncate">
                <Calendar size={13} className="text-slate-400 shrink-0" />
                <span className="truncate">
                  {monthFilter === 'all' ? 'Toate lunile' : monthFilter === 'Aug' ? 'August' : monthFilter === 'Jul' ? 'Iulie' : 'Iunie'}
                </span>
              </div>
              <ChevronDown size={13} className={`text-slate-400 shrink-0 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </div>

            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.96 }}
                  className="absolute top-full left-0 sm:left-auto sm:right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50 overflow-hidden"
                >
                  {[
                    { value: 'all', label: 'Toate lunile' },
                    { value: 'Aug', label: 'August 2026' },
                    { value: 'Jul', label: 'Iulie 2026' },
                    { value: 'Jun', label: 'Iunie 2026' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setMonthFilter(option.value);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full px-3.5 py-2 text-left text-xs font-bold transition-colors flex items-center justify-between cursor-pointer ${
                        monthFilter === option.value ? 'bg-[#e32f8c]/10 text-[#e32f8c]' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{option.label}</span>
                      {monthFilter === option.value && <Check size={14} />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Combined Filters Button */}
          <div className="relative w-full sm:w-auto">
            <button 
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              className={`w-full h-10 px-3.5 border rounded-xl text-xs font-bold transition-all flex items-center justify-between sm:justify-center gap-1.5 cursor-pointer ${
                paymentFilter !== 'all' 
                  ? 'border-[#e32f8c] text-[#00b0ce] bg-[#e32f8c]/10' 
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Filter size={13} />
                <span>Plată</span>
              </div>
              {paymentFilter !== 'all' && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#e32f8c]" />
              )}
            </button>

            <AnimatePresence>
              {isFilterDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.96 }}
                  className="absolute top-full right-0 mt-2 w-60 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-50 space-y-3"
                >
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Metodă Plată</label>
                    <div className="space-y-1">
                      {[
                        { id: 'all', label: 'Toate metodele' },
                        { id: 'card', label: 'Card Stripe' },
                        { id: 'cod', label: 'Ramburs (La Livrare)' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setPaymentFilter(item.id);
                            setIsFilterDropdownOpen(false);
                          }}
                          className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-bold transition-colors flex items-center justify-between cursor-pointer ${
                            paymentFilter === item.id ? 'bg-[#e32f8c]/10 text-slate-900 font-black' : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span>{item.label}</span>
                          {paymentFilter === item.id && <Check size={14} className="text-[#e32f8c]" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {paymentFilter !== 'all' && (
                    <button 
                      onClick={() => { setPaymentFilter('all'); setIsFilterDropdownOpen(false); }}
                      className="w-full pt-2 border-t border-slate-100 text-[10px] font-black text-red-500 hover:text-red-700 transition-colors uppercase tracking-wider text-center cursor-pointer"
                    >
                      Resetează Filtrul
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* 📋 ORDERS LISTING (ZERO HORIZONTAL SCROLL) */}
      <div className="space-y-3.5">
        {/* Select All Bar */}
        {!loading && filteredOrders.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-xs">
            <button
              onClick={() => {
                if (selectedOrders.length === filteredOrders.length) {
                  setSelectedOrders([]);
                } else {
                  setSelectedOrders(filteredOrders.map(o => o.id));
                }
              }}
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                selectedOrders.length === filteredOrders.length && filteredOrders.length > 0
                  ? 'bg-[#e32f8c] border-[#00b0ce]'
                  : selectedOrders.length > 0
                    ? 'bg-[#e32f8c]/40 border-[#00b0ce]'
                    : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              {selectedOrders.length === filteredOrders.length && filteredOrders.length > 0 && (
                <Check size={13} className="text-white stroke-[3]" />
              )}
              {selectedOrders.length > 0 && selectedOrders.length < filteredOrders.length && (
                <div className="w-2.5 h-0.5 bg-white rounded-full" />
              )}
            </button>
            <span className="text-xs font-bold text-slate-600">
              {selectedOrders.length === filteredOrders.length && filteredOrders.length > 0
                ? `Toate ${filteredOrders.length} comenzi selectate`
                : selectedOrders.length > 0
                  ? `${selectedOrders.length} din ${filteredOrders.length} selectate`
                  : `Selectează toate (${filteredOrders.length})`
              }
            </span>
          </div>
        )}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm animate-pulse space-y-4">
                <div className="flex justify-between items-center">
                  <div className="h-5 bg-slate-100 rounded-md w-36" />
                  <div className="h-5 bg-slate-100 rounded-md w-24" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="h-4 bg-slate-100 rounded-md w-full" />
                  <div className="h-4 bg-slate-100 rounded-md w-full" />
                  <div className="h-4 bg-slate-100 rounded-md w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 shadow-sm space-y-3">
            <AlertCircle className="text-red-500 mx-auto" size={36} />
            <h3 className="text-base font-bold text-slate-800">Nu am putut încărca comenzile</h3>
            <p className="text-xs text-slate-500">{error}</p>
            <button 
              onClick={fetchOrders} 
              className="mt-2 px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
            >
              Reîncearcă
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 shadow-sm space-y-2">
            <ShoppingBag className="text-slate-300 mx-auto" size={38} />
            <h3 className="text-base font-bold text-slate-700">Nu a fost găsită nicio comandă</h3>
            <p className="text-xs text-slate-400">Încearcă să ajustezi căutarea sau filtrele selectate.</p>
            {(searchQuery || statusFilter !== 'all' || paymentFilter !== 'all' || monthFilter !== 'all') && (
              <button 
                onClick={() => { setSearchQuery(''); setStatusFilter('all'); setPaymentFilter('all'); setMonthFilter('all'); }}
                className="mt-2 text-xs font-bold text-[#00b0ce] hover:underline cursor-pointer"
              >
                Șterge toate filtrele
              </button>
            )}
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isSelected = selectedOrders.includes(order.id);
            const isExpanded = expandedOrders.has(order.id);
            const trackInfo = trackingStatus[order.id] || (order.supabaseId ? trackingStatus[order.supabaseId] : null);
            const hasLiveStatus = trackInfo && (trackInfo.statusText || trackInfo.status);
            const isDelivered = isOrderDelivered(order, trackingStatus);
            const isPrinted = isOrderPrinted(order, trackingStatus);
            const isReturned = order.status === 'returned' || order.status === 'refunded';
            const isCancelled = order.status === 'cancelled';
            const isCod = order.paymentMethod === 'cod';

            return (
              <div 
                key={order.id}
                className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isCancelled
                    ? 'bg-slate-50/80 border-slate-300 opacity-60 grayscale hover:grayscale-0 hover:opacity-95'
                    : isSelected 
                      ? 'border-[#e32f8c] shadow-md ring-2 ring-[#e32f8c]/20' 
                      : order.priorityProcessing
                        ? 'border-amber-300 border-l-4 border-l-amber-500 shadow-sm bg-gradient-to-r from-amber-500/[0.02] to-white'
                        : isReturned
                          ? 'border-red-200 hover:border-red-300 shadow-xs'
                          : 'border-slate-200/90 hover:border-slate-300 shadow-xs'
                }`}
              >
                {/* 🏷️ CARD TOP HEADER (Clean alignment on desktop & mobile) */}
                <div className="p-3 sm:p-4 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  {/* Line 1 on mobile / Left side on desktop: Checkbox, ID, Copy, Date, and mobile price */}
                  <div className="flex items-center justify-between sm:justify-start gap-2.5 w-full sm:w-auto min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <ModernCheckbox 
                        checked={isSelected}
                        onChange={() => toggleOrderSelection(order.id)}
                        title="Selectează comanda"
                      />

                      {/* Order ID & copy */}
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="font-mono text-xs sm:text-sm font-black text-slate-900 truncate">
                          {order.id}
                        </span>
                        <button
                          onClick={() => copyToClipboard(order.id, `id-${order.id}`, 'ID Comandă')}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors shrink-0 cursor-pointer"
                          title="Copiază ID-ul"
                        >
                          {copiedKey === `id-${order.id}` ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        </button>
                      </div>

                      <span className="text-slate-300 hidden sm:inline">•</span>
                      <span className="text-[11px] font-bold text-slate-400 shrink-0 flex items-center gap-1">
                        <Clock size={11} /> {order.date}
                      </span>
                    </div>

                    {/* Mobile Price: Always neatly aligned top right on mobile */}
                    <span className="sm:hidden font-mono text-sm font-black text-slate-900 shrink-0">
                      {order.total}
                    </span>
                  </div>

                  {/* Line 2 on mobile / Right side on desktop: Unified badges row + Desktop price */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                    {/* Badges container */}
                    <div className="flex items-center flex-wrap gap-1.5">
                      {/* ⚡ PROCESARE RAPIDĂ BADGE - PROMINENT & HIGH VISIBILITY */}
                      {order.priorityProcessing && !isCancelled && (
                        <span 
                          className="inline-flex items-center gap-1.5 h-6 px-3 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-sm ring-2 ring-amber-300/80 shrink-0" 
                          title="Comandă cu Procesare Prioritară Rapidă"
                        >
                          <Zap size={11} className="text-white fill-white animate-bounce" />
                          <span>PROCESARE RAPIDĂ</span>
                        </span>
                      )}

                      {/* 📦 TRIMIS LA FULFILLMENT BADGE */}
                      {order.fulfillmentDispatchedAt ? (
                        <span 
                          className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-300 shadow-2xs shrink-0" 
                          title={`Transmis către centrul de fulfillment la data de: ${new Date(order.fulfillmentDispatchedAt).toLocaleString('ro-RO')}${order.fulfillmentDispatchedTo ? ` către ${order.fulfillmentDispatchedTo}` : ''}`}
                        >
                          <Truck size={11} className="text-indigo-600 shrink-0" />
                          <span>TRIMIS FULFILLMENT</span>
                        </span>
                      ) : manualShippingEnabled && !isCancelled && !isReturned && (
                        <span 
                          className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs shrink-0" 
                          title="Comandă nouă în așteptare de expediere către centrul de fulfillment"
                        >
                          <Clock size={11} className="text-amber-600 shrink-0" />
                          <span>AȘTEAPTĂ FULFILLMENT</span>
                        </span>
                      )}

                      {/* Payment Badge */}
                      {isCod ? (
                        <span className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                          <Banknote size={11} /> RAMBURS
                        </span>
                      ) : (
                        <a 
                          href={order.paymentIntentId ? `https://dashboard.stripe.com/payments/${order.paymentIntentId}` : undefined}
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#635BFF]/10 text-[#635BFF] hover:bg-[#635BFF]/20 border border-[#635BFF]/20 transition-colors shrink-0 cursor-pointer"
                          title="Deschide în Stripe"
                        >
                          <CreditCard size={11} /> CARD {order.paymentIntentId && <ExternalLink size={9} />}
                        </a>
                      )}

                      {/* Special status badge: Only show in header if Cancelled or Returned (standard status is shown in AWB box below) */}
                      {(isCancelled || isReturned) && (
                        <span className={`inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
                          isCancelled
                            ? 'bg-slate-200 text-slate-700 border border-slate-300'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {isCancelled ? 'Anulată' : 'Returnată'}
                        </span>
                      )}

                      {/* 🇷🇴 Oblio & ANAF SPV Status Badge / Quick Emit Action */}
                      {order.oblioInvoice ? (
                        <a 
                          href={order.oblioInvoice.link || `/api/admin/orders/${order.supabaseId || order.id}/invoice`}
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition-colors shrink-0 cursor-pointer"
                          title={`Factură fiscală: ${order.oblioInvoice.seriesName} ${order.oblioInvoice.number}. Click pentru a descărca PDF.`}
                        >
                          <FileText size={10} className="text-emerald-600" />
                          <span>{order.oblioInvoice.seriesName} {order.oblioInvoice.number}</span>
                          <span className="text-[9px] bg-emerald-200 text-emerald-900 px-1 rounded font-black">SPV</span>
                        </a>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEmitOblioFromOrders(order.supabaseId || order.id);
                          }}
                          disabled={emittingOblioOrders[order.id] || (order.supabaseId && emittingOblioOrders[order.supabaseId])}
                          className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 transition-all shrink-0 cursor-pointer disabled:opacity-50"
                          title="Emite factura în Oblio și trimite automat la ANAF SPV"
                        >
                          <FileText size={10} className={(emittingOblioOrders[order.id] || (order.supabaseId && emittingOblioOrders[order.supabaseId])) ? 'animate-spin text-emerald-600' : 'text-slate-400'} />
                          <span>{(emittingOblioOrders[order.id] || (order.supabaseId && emittingOblioOrders[order.supabaseId])) ? 'Se emite...' : '+ Emite SPV'}</span>
                        </button>
                      )}

                      {/* 🏷️ Coupon / Discount Badge */}
                      {(order.couponCode || order.couponId || (order.discountTotal > 0)) && (
                        <span 
                          className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200 shrink-0" 
                          title={`Cupon aplicat: ${order.couponCode || order.couponId || 'Reducere'}${order.discountTotal > 0 ? ` (-${Number(order.discountTotal).toFixed(2)} ${order.currency || 'RON'})` : ''}`}
                        >
                          <Tag size={10} className="text-purple-600" />
                          <span>{order.couponCode || order.couponId || 'CUPON'}</span>
                          {order.discountTotal > 0 && (
                            <span className="font-bold text-purple-600">(-{Number(order.discountTotal).toFixed(2)} {order.currency || 'RON'})</span>
                          )}
                        </span>
                      )}

                      {/* Gift packaging badge */}
                      {order.giftPackaging && (
                        <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-[10px] font-black uppercase bg-pink-50 text-pink-600 border border-pink-200 shrink-0" title="Împachetare Cadou">
                          <Gift size={10} /> Cadou
                        </span>
                      )}
                    </div>

                    {/* Desktop Total Amount */}
                    <div className="hidden sm:flex items-center gap-3 shrink-0 pl-1">
                      <div className="h-5 w-px bg-slate-200" />
                      <span className="font-mono text-sm sm:text-base font-black text-slate-900 tracking-tight">
                        {order.total}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 🧩 CARD MIDDLE (Operational Body - Customer & Actions Row, followed by Full-Width AWB & Delivery Status Box) */}
                <div className="p-3.5 sm:p-4 space-y-3">
                  
                  {/* Row 1: Client Info (left) & Actions / Expand (right) */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Client Info Column */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs sm:text-sm font-black text-slate-900 truncate">
                          {order.customer}
                        </p>
                        <button
                          onClick={() => openEditShipping(order)}
                          className="text-slate-400 hover:text-[#00b0ce] p-0.5 transition-colors cursor-pointer shrink-0"
                          title="Editează datele de livrare"
                        >
                          <Pencil size={11} />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                        {/* Phone with quick call & copy */}
                        {order.phone && order.phone !== 'N/A' && (
                          <div className="flex items-center gap-1">
                            <Phone size={11} className="text-slate-400 shrink-0" />
                            <a 
                              href={`tel:${order.phone}`} 
                              className="hover:text-[#00b0ce] font-semibold transition-colors cursor-pointer"
                            >
                              {order.phone}
                            </a>
                            <button
                              onClick={() => copyToClipboard(order.phone, `tel-${order.id}`, 'Telefon')}
                              className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer shrink-0"
                              title="Copiază telefonul"
                            >
                              {copiedKey === `tel-${order.id}` ? <Check size={10} className="text-emerald-600" /> : <Copy size={10} />}
                            </button>
                          </div>
                        )}

                        {/* Email */}
                        {order.customerEmail && order.customerEmail !== 'N/A' && (
                          <div className="flex items-center gap-1 min-w-0">
                            <Mail size={11} className="text-slate-400 shrink-0" />
                            <a 
                              href={`mailto:${order.customerEmail}`} 
                              className="hover:text-[#00b0ce] truncate max-w-[200px] font-medium cursor-pointer"
                              title={order.customerEmail}
                            >
                              {order.customerEmail}
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Address snippet */}
                      {order.address && order.address !== 'N/A' && (
                        <p className="text-[11px] text-slate-500 line-clamp-1 flex items-center gap-1 mt-0.5">
                          <MapPin size={10} className="text-slate-400 shrink-0" />
                          <span className="truncate">{order.address}</span>
                        </p>
                      )}

                      {/* Quick Products & Bundle Summary (visible on card) */}
                      {order.items && order.items.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {order.items.map((it: any, i: number) => {
                            const details = getItemDisplayDetails(it);
                            return (
                              <span 
                                key={i}
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold border max-w-full ${
                                  details.isBundle 
                                    ? 'bg-cyan-50 text-cyan-950 border-cyan-200' 
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                                title={details.rawName}
                              >
                                <Package size={10} className={details.isBundle ? "text-[#00b0ce]" : "text-slate-400"} />
                                <span className="truncate max-w-[260px] sm:max-w-[340px]">
                                  {it.quantity > 1 ? `${it.quantity}x ` : ''}
                                  {details.cleanTitle}
                                  {details.variantStr ? ` (${details.variantStr})` : ''}
                                </span>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Actions & Detail Toggle Column (Cleanly aligned on right, never overlapping) */}
                    <div className="flex items-center justify-start md:justify-end gap-1.5 shrink-0 pt-2 md:pt-0 border-t md:border-0 border-slate-100">
                      {/* Invoice button */}
                      <a 
                        href={order.oblioInvoice?.link || `/api/admin/orders/${order.supabaseId || order.id}/invoice`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className={`h-9 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                          order.oblioInvoice 
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200' 
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                        title={order.oblioInvoice ? `Factură emisă: ${order.oblioInvoice.seriesName} ${order.oblioInvoice.number} (SPV)` : "Vezi Factura PDF"}
                      >
                        <FileText size={14} className={order.oblioInvoice ? "text-emerald-600" : "text-slate-500"} />
                        <span>{order.oblioInvoice ? 'Factură SPV' : 'Factură'}</span>
                      </a>

                      {/* Expand/Collapse details button */}
                      <button
                        onClick={() => toggleExpandOrder(order.id)}
                        className={`h-9 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                          isExpanded 
                            ? 'bg-slate-900 text-white shadow-xs' 
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                        }`}
                      >
                        <Eye size={14} />
                        <span>{order.items?.length || 0} {order.items?.length === 1 ? 'produs' : 'produse'}</span>
                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>

                      {/* Cancel / Reactivate Order button */}
                      {isCancelled ? (
                        <button
                          onClick={() => confirmReactivateOrder(order.supabaseId || order.id, order.id)}
                          className="h-9 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 bg-slate-200 hover:bg-slate-300 text-slate-700 cursor-pointer"
                          title="Reactivează comanda (revine la activă)"
                        >
                          <RotateCcw size={13} />
                          <span>Reactivează</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => confirmCancelOrder(order.supabaseId || order.id, order.id)}
                          className="h-9 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 border border-slate-200 hover:border-red-200 cursor-pointer"
                          title="Anulează comanda"
                        >
                          <X size={13} className="text-red-500" />
                          <span>Anulează</span>
                        </button>
                      )}

                      {/* Delete button */}
                      <button
                        onClick={() => confirmDeleteOrder(order.supabaseId || order.id, order.id)}
                        className="h-9 w-9 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors shrink-0 cursor-pointer"
                        title="Șterge Comanda Definitiv"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Row 2: Full-Width AWB & Delivery Status Box */}
                  <div className="w-full bg-slate-50/90 border border-slate-200/80 rounded-xl p-2.5 sm:p-3">
                    {order.trackingNumber ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        {/* Left: AWB Number + Live Status Badge */}
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <div className="flex items-center gap-1.5 shrink-0 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">AWB:</span>
                            <span className="font-mono text-xs font-black text-slate-900">
                              {order.trackingNumber}
                            </span>
                            <button
                              onClick={() => copyToClipboard(order.trackingNumber, `awb-${order.id}`, 'Număr AWB')}
                              className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer shrink-0"
                              title="Copiază AWB"
                            >
                              {copiedKey === `awb-${order.id}` ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                            </button>
                          </div>

                          {/* Fulfillment Dispatched Indicator when AWB present */}
                          {order.fulfillmentDispatchedAt && (
                            <span 
                              className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-lg flex items-center gap-1 shrink-0"
                              title={`Transmis către centrul de fulfillment la data de: ${new Date(order.fulfillmentDispatchedAt).toLocaleString('ro-RO')}`}
                            >
                              <Truck size={11} className="text-indigo-600" />
                              <span>Fulfillment OK</span>
                            </span>
                          )}

                          {/* Live status badge */}
                          {hasLiveStatus ? (
                            <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border shrink-0 ${
                              trackInfo.error 
                                ? 'text-red-700 bg-red-100 border-red-200' 
                                : isDelivered
                                  ? 'text-emerald-800 bg-emerald-100 border-emerald-300'
                                  : 'text-[#009bb3] bg-[#e32f8c]/10 border-[#e32f8c]/30'
                            }`} title={trackInfo.statusText || trackInfo.status}>
                              {trackInfo.statusText || trackInfo.status}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-600 bg-slate-200/80 px-2 py-1 rounded-lg shrink-0">
                              {order.status === 'delivered' ? 'Livrat' : 'Generat'}
                            </span>
                          )}

                          {/* AWB Printed Badge */}
                          {isPrinted ? (
                            <span className="text-[11px] font-black uppercase bg-purple-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 shrink-0 shadow-md shadow-purple-200" title={isDelivered ? "Comandă livrată" : "AWB printat"}>
                              <Check size={13} className="stroke-[3]" />
                              IMPRIMAT
                            </span>
                          ) : (
                            <span className="text-[11px] font-black uppercase bg-rose-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 shrink-0 shadow-md shadow-rose-200 animate-pulse" title="AWB-ul NU a fost încă printat">
                              <Printer size={13} className="stroke-[3]" />
                              NEPRINTAT
                            </span>
                          )}
                        </div>

                        {/* Right: AWB Action row (Verifică Status, Print AWB, Reset) */}
                        <div className="flex items-center gap-2 shrink-0 pt-1.5 sm:pt-0 border-t sm:border-0 border-slate-200/60">
                          <button 
                            onClick={() => fetchTracking(order.supabaseId || order.id)}
                            disabled={fetchingTracking[order.id] || (order.supabaseId ? fetchingTracking[order.supabaseId] : false)}
                            className="text-[11px] font-bold text-[#00a8c4] hover:text-[#008ba3] flex items-center gap-1.5 transition-colors cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs hover:bg-slate-50"
                          >
                            <RotateCcw size={11} className={(fetchingTracking[order.id] || (order.supabaseId && fetchingTracking[order.supabaseId])) ? 'animate-spin' : ''} /> 
                            <span>{(fetchingTracking[order.id] || (order.supabaseId && fetchingTracking[order.supabaseId])) ? 'Verificare...' : 'Verifică Status'}</span>
                          </button>

                          <button
                            onClick={() => handlePrintAwb(order.supabaseId || order.id, order.trackingNumber)}
                            disabled={printingAwb[order.id]}
                            className="text-[11px] font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1.5 transition-colors cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs hover:bg-slate-50"
                          >
                            <Printer size={11} />
                            <span>Print AWB</span>
                          </button>

                          <button
                            onClick={() => {
                              if (manualShippingEnabled) {
                                toast.error('Expedierea manuală este activată în Setări. Resetarea AWB este blocată.');
                                return;
                              }
                              confirmDeleteAwb(order.supabaseId || order.id);
                            }}
                            disabled={deletingAwb[order.id] || manualShippingEnabled}
                            className={`text-[11px] font-bold transition-colors ml-auto sm:ml-0 px-1.5 py-1 ${
                              manualShippingEnabled
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-slate-400 hover:text-red-500 cursor-pointer'
                            }`}
                            title={manualShippingEnabled ? "Expedierea manuală este activă (Resetare blocată)" : "Resetează AWB-ul pentru a genera altul"}
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            order.fulfillmentDispatchedAt
                              ? 'bg-indigo-600'
                              : manualShippingEnabled
                                ? 'bg-amber-500 animate-pulse'
                                : 'bg-amber-400 animate-pulse'
                          }`} />
                          <div>
                            <p className="text-[11px] font-black leading-tight flex items-center gap-1.5">
                              {order.fulfillmentDispatchedAt ? (
                                <span className="text-indigo-950 flex items-center gap-1 font-black">
                                  <Truck size={13} className="text-indigo-600" />
                                  Transmis la Centrul de Fulfillment
                                </span>
                              ) : manualShippingEnabled ? (
                                <span className="text-amber-900">Expediere Fulfillment (În așteptare trimitere)</span>
                              ) : (
                                <span className="text-amber-900">AWB Negenerat</span>
                              )}
                            </p>
                            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                              {order.fulfillmentDispatchedAt
                                ? `Expediat pe email către depozit la: ${new Date(order.fulfillmentDispatchedAt).toLocaleString('ro-RO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`
                                : manualShippingEnabled
                                  ? 'Comanda nouă va fi expediată automat mâine la ora 08:00 AM sau prin butonul Trimite Acum'
                                  : 'Comanda necesită expediere'
                              }
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                          {order.fulfillmentDispatchedAt ? (
                            <span className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-black flex items-center gap-1.5 shadow-2xs">
                              <CheckCircle2 size={13} className="text-indigo-600" />
                              <span>Trimis la Depozit</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                if (manualShippingEnabled) {
                                  toast.error('Expedierea manuală este activată în Setări. Generarea de AWB este blocată.');
                                  return;
                                }
                                confirmGenerateAwb([order.supabaseId || order.id]);
                              }}
                              disabled={generatingAwb || manualShippingEnabled}
                              title={manualShippingEnabled ? "Expedierea manuală este activă — AWB-urile sunt gestionate de centrul de fulfillment" : "Generează AWB"}
                              className={`px-3 py-1.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 shrink-0 text-xs font-black ${
                                manualShippingEnabled
                                  ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed opacity-75'
                                  : 'bg-[#e32f8c] hover:bg-[#00bad9] active:scale-95 text-slate-950 cursor-pointer disabled:opacity-50'
                              }`}
                            >
                              <Truck size={13} />
                              <span>{manualShippingEnabled ? 'Fulfillment Activ' : '+ Generează AWB'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 📂 EXPANDABLE ACCORDION (Ordered Items & Full Delivery Details) */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="border-t border-slate-100 bg-slate-50/50 p-4 sm:p-6 space-y-6"
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* 🛒 Ordered Products List (7 cols on desktop) */}
                        <div className="lg:col-span-7 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                              <ShoppingBag size={13} /> Produse Comandate ({order.items?.length || 0})
                            </h4>
                            <span className="text-[11px] font-bold text-slate-500">
                              Total: {order.total}
                            </span>
                          </div>

                          <div className="space-y-2.5">
                            {order.items && order.items.length > 0 ? (
                              order.items.map((item: any, idx: number) => {
                                const details = getItemDisplayDetails(item);
                                const isPre = isItemPreorder(item);

                                return (
                                  <div 
                                    key={idx} 
                                    className="flex items-start justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs"
                                  >
                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                      {(() => {
                                        let rawImage = item.image || item.selectedVariant?.image;
                                        if (details.isBundle) {
                                          if (!rawImage || String(rawImage).includes('placeholder')) {
                                            rawImage = '/images/products/x10_elbow_wraps_purple_1.webp';
                                          }
                                        } else {
                                          // Non-bundle (produs individual): Nu folosi imagini de bundle
                                          if (!rawImage || String(rawImage).includes('bundle') || String(rawImage).includes('pachet')) {
                                            rawImage = resolveItemImage(item);
                                          }
                                        }

                                        const resolvedSrc = rawImage || resolveItemImage(item);
                                        const displaySrc = resolvedSrc
                                          ? getOptimizedImageUrl(typeof resolvedSrc === 'string' ? resolvedSrc.replace(/^https?:\/\/(www\.)?trenzone\.ro/, '') : resolvedSrc)
                                          : '';

                                        return displaySrc ? (
                                          <img 
                                            src={displaySrc} 
                                            alt={details.cleanTitle} 
                                            className="w-12 h-12 object-cover rounded-lg border border-slate-100 shrink-0 bg-slate-100" 
                                            onError={(e) => {
                                              const target = e.currentTarget;
                                              const fallback = resolveItemImage(item);
                                              if (target.src !== fallback && !target.src.endsWith(fallback)) {
                                                target.src = fallback;
                                              }
                                            }}
                                          />
                                        ) : (
                                          <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                            <Package size={18} />
                                          </div>
                                        );
                                      })()}
                                      
                                      <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          <p className="text-xs sm:text-sm font-bold text-slate-900 break-words leading-snug">
                                            {details.cleanTitle}
                                          </p>
                                          {isPre && (
                                            <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-500 text-[9px] font-black uppercase tracking-wider rounded-md border border-amber-500/20 flex items-center gap-1 shrink-0">
                                              <Clock size={10} /> Precomandă
                                            </span>
                                          )}
                                        </div>

                                        {/* 📦 BUNDLE BREAKDOWN: If bundle, display each tub/flavor clearly with full-width rows */}
                                        {details.isBundle && (
                                          <div className="mt-2.5 p-2.5 sm:p-3 bg-gradient-to-r from-cyan-50/90 to-blue-50/60 rounded-xl border border-cyan-200/90 space-y-2">
                                            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-cyan-950">
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

                                        {/* 🏷️ SINGLE PRODUCT VARIANT (if not a bundle and has variant) */}
                                        {!details.isBundle && details.variantStr && (
                                          <div className="mt-1 flex items-center gap-1.5">
                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md text-[11px] font-bold border border-slate-200">
                                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                                              <span className="text-slate-500 font-semibold text-[10px]">Culoare:</span>
                                              <span className="text-slate-900 font-black">{details.variantStr}</span>
                                            </span>
                                          </div>
                                        )}

                                        <p className="text-[11px] font-semibold text-slate-500 mt-1">
                                          {Number(item.price).toFixed(2)} {order.currency || 'RON'} / buc
                                        </p>
                                      </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                      <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md text-xs font-black">
                                        x{item.quantity}
                                      </span>
                                      <p className="text-xs sm:text-sm font-black text-slate-900 mt-0.5">
                                        {(Number(item.price) * Number(item.quantity)).toFixed(2)} {order.currency || 'RON'}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-xs text-slate-400 italic p-4 bg-white rounded-xl border border-slate-200">
                                Nu există produse înregistrate pentru această comandă.
                              </p>
                            )}
                          </div>

                          {/* 💰 Financial Breakdown Summary */}
                          <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-1.5 text-xs">
                            <div className="flex items-center justify-between text-slate-500 font-medium">
                              <span>Subtotal produse:</span>
                              <span className="font-bold text-slate-700">
                                {(order.subtotalAmount > 0 
                                  ? order.subtotalAmount 
                                  : (order.items?.reduce((sum: number, it: any) => sum + (Number(it.price || 0) * Number(it.quantity || 1)), 0) || 0)
                                ).toFixed(2)} {order.currency || 'RON'}
                              </span>
                            </div>

                            {(order.couponCode || order.couponId || order.discountTotal > 0) && (
                              <div className="flex items-center justify-between text-purple-700 bg-purple-50/70 px-2.5 py-1 rounded-lg font-semibold border border-purple-100">
                                <span className="flex items-center gap-1.5">
                                  <Tag size={12} className="text-purple-600" />
                                  <span>Cupon reducere {order.couponCode || order.couponId ? `(${order.couponCode || order.couponId})` : ''}:</span>
                                </span>
                                <span className="font-black text-purple-700">
                                  -{order.discountTotal > 0 ? Number(order.discountTotal).toFixed(2) : '0.00'} {order.currency || 'RON'}
                                </span>
                              </div>
                            )}

                            {order.cardDiscount > 0 && (
                              <div className="flex items-center justify-between text-emerald-700 bg-emerald-50/70 px-2.5 py-1 rounded-lg font-semibold border border-emerald-100">
                                <span className="flex items-center gap-1.5">
                                  <CreditCard size={12} className="text-emerald-600" />
                                  <span>Reducere plată cu cardul:</span>
                                </span>
                                <span className="font-black text-emerald-700">
                                  -{Number(order.cardDiscount).toFixed(2)} {order.currency || 'RON'}
                                </span>
                              </div>
                            )}

                            <div className="flex items-center justify-between text-slate-500 font-medium">
                              <span className="flex items-center gap-1.5">
                                <Truck size={12} className="text-slate-400" />
                                <span>Transport:</span>
                              </span>
                              <span className="font-bold text-slate-700">
                                {order.shippingAmount > 0 ? `${Number(order.shippingAmount).toFixed(2)} ${order.currency || 'RON'}` : 'Gratuit'}
                              </span>
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-slate-900 font-black text-sm">
                              <span>Total de plată:</span>
                              <span className="text-[#00b0ce] font-black">
                                {order.total}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 🚚 Complete Delivery & Customer Card (5 cols on desktop) */}
                        <div className="lg:col-span-5 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                              <MapPin size={13} /> Detalii Livrare & Contact
                            </h4>
                            <div className="flex items-center gap-2">
                              {order.shippingType && (
                                <span className="text-[10px] font-black uppercase bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md">
                                  {order.shippingType === 'hd' ? 'Curier Rapid' : order.shippingType === 'locker' ? 'Locker' : order.shippingType}
                                </span>
                              )}
                              <button
                                onClick={() => openEditShipping(order)}
                                className="h-7 px-2.5 bg-[#e32f8c]/10 hover:bg-[#e32f8c]/20 text-[#009bb3] rounded-lg text-[11px] font-black transition-all flex items-center gap-1 cursor-pointer"
                                title="Editează datele de livrare"
                              >
                                <Pencil size={11} />
                                <span>Editează</span>
                              </button>
                            </div>
                          </div>

                          <div className="bg-white rounded-xl border border-slate-200/80 p-4 space-y-3 shadow-xs text-xs">
                            {/* Full Address */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Adresă de livrare</span>
                                {order.address && order.address !== 'N/A' && (
                                  <button
                                    onClick={() => copyToClipboard(order.address, `addr-${order.id}`, 'Adresă')}
                                    className="text-[11px] font-bold text-[#00b0ce] hover:underline flex items-center gap-1 cursor-pointer"
                                  >
                                    <Copy size={11} /> Copiază adresa
                                  </button>
                                )}
                              </div>
                              <p className="font-semibold text-slate-800 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                {order.address || 'N/A'}
                              </p>
                            </div>

                            {/* Contact quick links */}
                            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                              <div>
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Telefon</span>
                                <a href={`tel:${order.phone}`} className="font-bold text-slate-800 hover:text-[#00b0ce] transition-colors break-all cursor-pointer">
                                  {order.phone || 'N/A'}
                                </a>
                              </div>
                              <div>
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Email</span>
                                <a href={`mailto:${order.customerEmail}`} className="font-bold text-slate-800 hover:text-[#00b0ce] transition-colors break-all cursor-pointer">
                                  {order.customerEmail || 'N/A'}
                                </a>
                              </div>
                            </div>

                            {/* Extras: Priority Processing Banner */}
                            {order.priorityProcessing && (
                              <div className="p-2.5 rounded-lg bg-[#e32f8c]/10 border border-[#e32f8c]/30 flex items-center gap-2 text-[#009bb3]">
                                <Sparkles size={14} className="shrink-0" />
                                <span className="text-xs font-black uppercase tracking-wider">Procesare Prioritară Inclusă</span>
                              </div>
                            )}

                            {/* Extras: Gift Packaging & Message */}
                            {order.giftPackaging && (
                              <div className="p-2.5 rounded-lg bg-pink-50 border border-pink-200 space-y-1 text-pink-700">
                                <div className="flex items-center gap-1.5 font-black text-xs uppercase tracking-wider">
                                  <Gift size={13} /> Împachetare Cadou
                                </div>
                                {order.giftMessage && (
                                  <p className="text-xs italic text-slate-700 bg-white/80 p-2 rounded border border-pink-100 mt-1">
                                    „{order.giftMessage}”
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Extras: Applied coupon */}
                            {order.couponId && (
                              <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-emerald-800">
                                <div className="flex items-center gap-1.5">
                                  <Tag size={13} />
                                  <span className="text-[11px] font-bold">Cupon aplicat:</span>
                                </div>
                                <span className="font-mono text-xs font-black uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-emerald-300">
                                  {order.couponId}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {/* ✏️ MODAL EDITARE DATE LIVRARE */}
      <AnimatePresence>
        {editingOrder && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" 
              onClick={() => !savingShipping && setEditingOrder(null)} 
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg p-5 sm:p-6 my-8 z-10 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#e32f8c]/10 text-[#009bb3] flex items-center justify-center">
                    <Pencil size={15} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Editează Date Livrare</h3>
                    <p className="text-xs text-slate-500 font-mono">Comanda #{editingOrder.id}</p>
                  </div>
                </div>

                <button 
                  onClick={() => setEditingOrder(null)}
                  disabled={savingShipping}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveShipping} className="space-y-3.5 text-xs">
                {/* Nume & Prenume */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                      Prenume
                    </label>
                    <input 
                      type="text" 
                      value={editForm.customerFirstName} 
                      onChange={(e) => setEditForm(prev => ({ ...prev, customerFirstName: e.target.value }))}
                      placeholder="Ion"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#e32f8c] focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                      Nume de familie
                    </label>
                    <input 
                      type="text" 
                      value={editForm.customerLastName} 
                      onChange={(e) => setEditForm(prev => ({ ...prev, customerLastName: e.target.value }))}
                      placeholder="Popescu"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#e32f8c] focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Telefon & Email */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                      Telefon
                    </label>
                    <input 
                      type="tel" 
                      value={editForm.customerPhone} 
                      onChange={(e) => setEditForm(prev => ({ ...prev, customerPhone: e.target.value }))}
                      placeholder="07xxxxxxxx"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#e32f8c] focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                      Email
                    </label>
                    <input 
                      type="email" 
                      value={editForm.customerEmail} 
                      onChange={(e) => setEditForm(prev => ({ ...prev, customerEmail: e.target.value }))}
                      placeholder="client@email.com"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#e32f8c] focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Adresă Linia 1 */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                    Adresă (Stradă, Număr)
                  </label>
                  <input 
                    type="text" 
                    value={editForm.addrLine1} 
                    onChange={(e) => setEditForm(prev => ({ ...prev, addrLine1: e.target.value }))}
                    placeholder="Strada Exemplu nr. 12"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#e32f8c] focus:bg-white transition-all"
                  />
                </div>

                {/* Adresă Linia 2 */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                    Bloc / Scară / Apartament (Opțional)
                  </label>
                  <input 
                    type="text" 
                    value={editForm.addrLine2} 
                    onChange={(e) => setEditForm(prev => ({ ...prev, addrLine2: e.target.value }))}
                    placeholder="Bloc A, Sc. 1, Ap. 4"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#e32f8c] focus:bg-white transition-all"
                  />
                </div>

                {/* Oraș, Cod Poștal, Țară */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                      Oraș / Localitate
                    </label>
                    <input 
                      type="text" 
                      value={editForm.addrCity} 
                      onChange={(e) => setEditForm(prev => ({ ...prev, addrCity: e.target.value }))}
                      placeholder="București"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#e32f8c] focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                      Cod Poștal {editForm.addrCountry === 'RO' && <span className="text-[9px] text-[#009bb3]">(max 6 cifre)</span>}
                    </label>
                    <input 
                      type="text" 
                      value={editForm.addrZip} 
                      onChange={(e) => {
                        let val = e.target.value;
                        if (editForm.addrCountry === 'RO') {
                          val = val.replace(/[^0-9]/g, '').slice(0, 6);
                        }
                        setEditForm(prev => ({ ...prev, addrZip: val }));
                      }}
                      maxLength={editForm.addrCountry === 'RO' ? 6 : undefined}
                      inputMode={editForm.addrCountry === 'RO' ? 'numeric' : 'text'}
                      placeholder="012345"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#e32f8c] focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                      Țară <span className="text-slate-400 font-normal">(Fixată)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={
                          editForm.addrCountry === 'RO' ? 'România (RO)' :
                          editForm.addrCountry === 'MD' ? 'Moldova (MD)' :
                          editForm.addrCountry === 'HU' ? 'Ungaria (HU)' :
                          editForm.addrCountry === 'BG' ? 'Bulgaria (BG)' :
                          editForm.addrCountry === 'DE' ? 'Germania (DE)' :
                          editForm.addrCountry === 'IT' ? 'Italia (IT)' :
                          editForm.addrCountry === 'ES' ? 'Spania (ES)' :
                          editForm.addrCountry === 'FR' ? 'Franța (FR)' :
                          editForm.addrCountry === 'UK' ? 'Marea Britanie (UK)' :
                          (editForm.addrCountry || 'România (RO)')
                        }
                        readOnly
                        disabled
                        tabIndex={-1}
                        className="w-full bg-slate-100/90 border border-slate-200 rounded-xl px-3 py-2 pr-8 text-xs font-semibold text-slate-500 cursor-not-allowed select-none focus:outline-none"
                      />
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button 
                    type="button"
                    onClick={() => setEditingOrder(null)}
                    disabled={savingShipping}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Anulează
                  </button>

                  <button 
                    type="submit"
                    disabled={savingShipping}
                    className="px-5 py-2 rounded-xl text-xs font-black bg-[#e32f8c] text-slate-950 hover:bg-[#00bad9] shadow-md shadow-[#e32f8c]/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {savingShipping ? 'Se salvează...' : 'Salvează Modificările'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🚀 FLOATING BULK ACTION BAR */}
      <AnimatePresence>
        {selectedOrders.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-1.5rem)] sm:w-fit bg-slate-900/95 text-white backdrop-blur-xl border border-slate-700/80 rounded-2xl px-3 sm:px-5 py-2 sm:py-3 shadow-2xl flex items-center justify-between sm:justify-start gap-2 sm:gap-4"
          >
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <span className="w-2 h-2 rounded-full bg-[#e32f8c] animate-pulse shrink-0" />
              <span className="text-[11px] sm:text-sm font-black whitespace-nowrap">
                <span className="sm:hidden">{selectedOrders.length} sel.</span>
                <span className="hidden sm:inline">
                  {selectedOrders.length} {selectedOrders.length === 1 ? 'comandă selectată' : 'comenzi selectate'}
                </span>
              </span>
            </div>

            <div className="h-4 sm:h-5 w-px bg-slate-700 shrink-0" />

            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto">
              {/* Bulk Print */}
              <button 
                onClick={() => handlePrintAwbs(selectedOrders)}
                className="h-8 sm:h-9 px-2.5 sm:px-3.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-sm shrink-0 cursor-pointer"
                title="Printează AWB-urile comenzilor selectate"
              >
                <Printer size={13} className="sm:w-3.5 sm:h-3.5" /> 
                <span className="hidden sm:inline">Printează AWB-uri</span>
              </button>

              {/* Bulk Generate AWB */}
              <button 
                onClick={() => {
                  if (manualShippingEnabled) {
                    toast.error('Expedierea manuală este activată în Setări. Generarea de AWB este blocată.');
                    return;
                  }
                  confirmGenerateAwb(selectedOrders);
                }}
                disabled={generatingAwb || manualShippingEnabled}
                title={manualShippingEnabled ? "Expedierea manuală este activă (AWB blocat)" : "Generează AWB"}
                className={`h-8 sm:h-9 px-3 sm:px-4 text-[11px] sm:text-xs font-black rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap shadow-md shrink-0 ${
                  manualShippingEnabled
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                    : 'bg-[#e32f8c] hover:bg-[#00bad9] active:scale-95 text-slate-950 cursor-pointer shadow-[#e32f8c]/20 disabled:opacity-50'
                }`}
              >
                <Truck size={13} className="sm:w-3.5 sm:h-3.5" /> 
                <span className="sm:hidden">{manualShippingEnabled ? 'AWB Blocat' : (generatingAwb ? '...' : `AWB (${selectedOrders.length})`)}</span>
                <span className="hidden sm:inline">{manualShippingEnabled ? 'Fulfillment Activ (AWB Blocat)' : (generatingAwb ? 'Generare...' : `Generează AWB (${selectedOrders.length})`)}</span>
              </button>

              {/* Deselect */}
              <button
                onClick={() => setSelectedOrders([])}
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                title="Anulează selecția"
              >
                <X size={14} className="sm:w-4 sm:h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🛡️ CONFIRMATION / ALERT MODAL OVERLAY */}
      <AnimatePresence>
        {popup.isOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
              onClick={() => setPopup(p => ({ ...p, isOpen: false }))} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 transform transition-all space-y-4 z-10 border border-slate-100"
            >
              <div className="flex items-start gap-3.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  popup.variant === 'danger' 
                    ? 'bg-red-50 text-red-600 border border-red-100' 
                    : 'bg-[#e32f8c]/10 text-[#00a8c4] border border-[#e32f8c]/20'
                }`}>
                  {popup.variant === 'danger' ? <AlertTriangle size={20} /> : <AlertCircle size={20} />}
                </div>
                <div className="space-y-1.5 flex-1 min-w-0 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  <h3 className="text-base font-black text-slate-900 leading-tight">{popup.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed whitespace-pre-line">
                    {popup.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setPopup(p => ({ ...p, isOpen: false }))}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                >
                  {popup.cancelText || (popup.type === 'confirm' ? 'Renunță' : 'Închide')}
                </button>
                {popup.type === 'confirm' && popup.onConfirm && (
                  <button 
                    type="button"
                    onClick={popup.onConfirm}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer shadow-sm ${
                      popup.variant === 'danger'
                        ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/25'
                        : 'bg-[#e32f8c] hover:bg-[#00bad9] text-slate-950 shadow-[#e32f8c]/25'
                    }`}
                  >
                    {popup.confirmText || 'Confirmă'}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 📦 Centru Fulfillment Modal */}
      <FulfillmentModal
        isOpen={showFulfillmentModal}
        onClose={() => setShowFulfillmentModal(false)}
        onSettingsUpdated={(updatedSettings) => {
          setFulfillmentSettings(updatedSettings);
          setManualShippingEnabled(Boolean(updatedSettings.manual_shipping_enabled));
        }}
        totalOrdersCount={orders.length}
      />
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Se încarcă comenzile...</div>}>
      <OrdersPageContent />
    </Suspense>
  );
}
