"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { 
  Clock, 
  Package, 
  Search, 
  RefreshCw, 
  Copy, 
  Check, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  ExternalLink, 
  Pencil, 
  FileText, 
  Truck, 
  AlertTriangle, 
  Calendar, 
  Filter, 
  ShoppingBag,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  X,
  Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Link from 'next/link';
import Image from 'next/image';
import { getAdminOrders } from '@/app/actions/admin-orders';
import { getAdminProductsServer } from '@/app/actions/products';
import { updateOrderShippingAction } from '@/app/actions/orders';
import { emitOblioInvoiceAction } from '@/app/actions/invoices';

export function hasOrderPreorderItems(o: any): boolean {
  if (!o) return false;
  if (o.status === 'preorder' || o.is_preorder || o.isPreorder || o.carrierMetadata?.is_preorder) return true;
  if (!o.items || !Array.isArray(o.items)) return false;
  return o.items.some((item: any) => isItemPreorder(item));
}

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
  return false;
}

const FALLBACK_CATALOG_PRODUCTS = [
  {
    slug: 'x10-elbow-wraps',
    name: 'X10 Elbow Wraps',
    badge: 'PR CHASER · +20 KG',
    price: 529.99,
    image: 'https://walfsewxhsjnfjfvxymi.supabase.co/storage/v1/object/public/products/x10_elbow_wraps_white_3.webp',
    variants: {
      type: 'flavor',
      label: { ro: 'Culoare', en: 'Color' },
      options: [
        { name: 'Purple', stock_status: 'in_stock' },
        { name: 'White (Precomandă)', stock_status: 'preorder' }
      ]
    }
  },
  {
    slug: 'x5-elbow-wraps',
    name: 'X5 Elbow Wraps',
    badge: 'HIPERTROFIE & VOLUM',
    price: 329.99,
    image: 'https://walfsewxhsjnfjfvxymi.supabase.co/storage/v1/object/public/products/x5_elbow_wraps_purple_1.webp',
    variants: {
      type: 'flavor',
      label: { ro: 'Culoare', en: 'Color' },
      options: [
        { name: 'Purple', stock_status: 'in_stock' },
        { name: 'Red', stock_status: 'in_stock' },
        { name: 'Blue', stock_status: 'in_stock' }
      ]
    }
  }
];

export default function AdminPreordersPage() {
  const [loading, setLoading] = useState(true);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>(FALLBACK_CATALOG_PRODUCTS);
  const [manualShippingEnabled, setManualShippingEnabled] = useState(true);
  const [selectedProductFilter, setSelectedProductFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'invoiced' | 'uninvoiced' | 'pending_awb' | 'has_awb'>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  // Edit Shipping Modal
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

  const [emittingOblio, setEmittingOblio] = useState<Record<string, boolean>>({});

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const [all, prods, fRes] = await Promise.all([
        getAdminOrders().catch(() => []),
        getAdminProductsServer().catch(() => []),
        fetch('/api/admin/data?action=fulfillment-settings')
          .then(r => r.json())
          .catch(() => ({ data: { manual_shipping_enabled: true } }))
      ]);

      const validAll = Array.isArray(all) ? all : [];
      setAllOrders(validAll);
      // Filter exclusively to orders containing preorder items
      const preorderOnly = validAll.filter(hasOrderPreorderItems);
      setOrders(preorderOnly);

      if (prods && Array.isArray(prods) && prods.length > 0) {
        setProducts(prods);
      }

      if (fRes?.data) {
        setManualShippingEnabled(Boolean(fRes.data.manual_shipping_enabled));
      }
    } catch (err: any) {
      toast.error('Eroare la încărcarea precomenzilor: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // When manual shipping is enabled, ensure no AWB filter remains active
  useEffect(() => {
    if (manualShippingEnabled && (statusFilter === 'pending_awb' || statusFilter === 'has_awb')) {
      setStatusFilter('all');
    }
  }, [manualShippingEnabled, statusFilter]);

  const copyToClipboard = (text: string, key: string, label: string = 'Copiat') => {
    if (!text || text === 'N/A') return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`${label} copiat în clipboard!`, { duration: 2000 });
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  const toggleExpand = (id: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
    const toastId = toast.loading('Se actualizează adresa de livrare...');
    try {
      const res = await updateOrderShippingAction(editingOrder.supabaseId || editingOrder.id, editForm);
      if (res.success) {
        toast.success('Adresa a fost actualizată!', { id: toastId });
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

  const handleEmitOblio = async (orderId: string, supabaseId?: string) => {
    const targetId = supabaseId || orderId;
    setEmittingOblio(prev => ({ ...prev, [targetId]: true }));
    const toastId = toast.loading('Se emite factura în Oblio...');
    try {
      const res = await emitOblioInvoiceAction(targetId);
      if (res.success) {
        toast.success(`Factura Oblio a fost emisă cu succes! Seria: ${res.seriesName} Nr: ${res.number}`, { id: toastId });
        await fetchOrders();
      } else {
        toast.error(`Eroare Oblio: ${res.error}`, { id: toastId });
      }
    } catch (e: any) {
      toast.error('Eroare conexiune Oblio.', { id: toastId });
    } finally {
      setEmittingOblio(prev => ({ ...prev, [targetId]: false }));
    }
  };

  // ═══ Global Metrics Calculations ═══
  const globalMetrics = useMemo(() => {
    let totalRevenue = 0;
    let totalUnits = 0;
    let invoicedCount = 0;

    orders.forEach(order => {
      totalRevenue += Number(order.totalAmount || 0);
      if (order.oblioInvoice) invoicedCount++;

      (order.items || []).forEach((item: any) => {
        if (isItemPreorder(item)) {
          totalUnits += Number(item.quantity || 1);
        }
      });
    });

    const totalStoreOrders = allOrders.length;
    const totalPreorders = orders.length;
    const globalRatio = totalStoreOrders > 0
      ? ((totalPreorders / totalStoreOrders) * 100).toFixed(1)
      : '0.0';

    return {
      totalStoreOrders,
      totalPreorders,
      globalRatio,
      totalUnits,
      totalRevenue,
      invoicedCount,
      uninvoicedCount: totalPreorders - invoicedCount,
    };
  }, [orders, allOrders]);

  // ═══ Products & Preorders Ratio Calculations ═══
  const productsWithPreorderStats = useMemo(() => {
    return products.map(prod => {
      const pName = typeof prod.name === 'object' ? (prod.name.ro || prod.name.en || '') : String(prod.name || '');
      const pSlug = String(prod.slug || '');
      const pImage = prod.image || prod.main_image || (prod.images && prod.images[0]) || '/images/placeholder.jpg';
      const pBadge = prod.badge || '';
      const pPrice = Number(prod.price || prod.price_numeric || 0);

      // Total orders in store that contain this product
      const ordersWithThisProduct = allOrders.filter(o => {
        if (!o.items || !Array.isArray(o.items)) return false;
        return o.items.some((i: any) => {
          const iSlug = String(i.slug || '');
          const iName = String(i.name || '');
          return (pSlug && iSlug === pSlug) || (pName && (iName.toLowerCase().includes(pName.toLowerCase()) || pName.toLowerCase().includes(iName.toLowerCase())));
        });
      });

      // Preorder orders that contain this product
      const preordersWithThisProduct = orders.filter(o => {
        if (!o.items || !Array.isArray(o.items)) return false;
        return o.items.some((i: any) => {
          const iSlug = String(i.slug || '');
          const iName = String(i.name || '');
          const matches = (pSlug && iSlug === pSlug) || (pName && (iName.toLowerCase().includes(pName.toLowerCase()) || pName.toLowerCase().includes(iName.toLowerCase())));
          return matches && isItemPreorder(i);
        });
      });

      // Count physical units reserved & breakdown per variant
      let reservedUnits = 0;
      const variantBreakdownMap: Record<string, { name: string; units: number; isPreorder: boolean }> = {};

      const options = prod.variants?.options || [];
      options.forEach((opt: any) => {
        const optName = typeof opt.name === 'object' ? (opt.name.ro || opt.name.en || '') : String(opt.name || '');
        const isPre = opt.stock_status === 'preorder' || optName.toLowerCase().includes('precomand') || optName.toLowerCase().includes('pre-order');
        variantBreakdownMap[optName.toLowerCase()] = {
          name: optName,
          units: 0,
          isPreorder: isPre
        };
      });

      orders.forEach(o => {
        (o.items || []).forEach((i: any) => {
          const iSlug = String(i.slug || '');
          const iName = String(i.name || '');
          const matches = (pSlug && iSlug === pSlug) || (pName && (iName.toLowerCase().includes(pName.toLowerCase()) || pName.toLowerCase().includes(iName.toLowerCase())));
          if (matches && isItemPreorder(i)) {
            const qty = Number(i.quantity || 1);
            reservedUnits += qty;

            const vRaw = i.selectedVariant?.name || i.variant || 'Standard';
            const vStr = typeof vRaw === 'object' ? (vRaw.ro || vRaw.en || '') : String(vRaw);
            const vKey = vStr.toLowerCase();

            if (!variantBreakdownMap[vKey]) {
              variantBreakdownMap[vKey] = {
                name: vStr,
                units: 0,
                isPreorder: true
              };
            }
            variantBreakdownMap[vKey].units += qty;
          }
        });
      });

      const totalOrdersCount = ordersWithThisProduct.length;
      const preordersCount = preordersWithThisProduct.length;
      const ratioPercent = totalOrdersCount > 0
        ? Number(((preordersCount / totalOrdersCount) * 100).toFixed(1))
        : 0;

      const preorderVariantsList = Object.values(variantBreakdownMap).filter(v => v.isPreorder);
      const inStockVariantsList = Object.values(variantBreakdownMap).filter(v => !v.isPreorder);

      return {
        product: prod,
        name: pName,
        slug: pSlug,
        image: pImage,
        badge: pBadge,
        price: pPrice,
        totalOrdersCount,
        preordersCount,
        ratioPercent,
        reservedUnits,
        preorderVariantsList,
        inStockVariantsList,
        hasPreorders: preordersCount > 0,
      };
    });
  }, [products, allOrders, orders]);

  // ═══ Filtered Preorders ═══
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // 1. Status filter (AWB filters only apply if manual shipping is disabled)
      if (manualShippingEnabled) {
        if (statusFilter === 'invoiced' && !order.oblioInvoice) return false;
        if (statusFilter === 'uninvoiced' && order.oblioInvoice) return false;
      } else {
        if (statusFilter === 'pending_awb' && order.trackingNumber) return false;
        if (statusFilter === 'has_awb' && !order.trackingNumber) return false;
        if (statusFilter === 'invoiced' && !order.oblioInvoice) return false;
        if (statusFilter === 'uninvoiced' && order.oblioInvoice) return false;
      }

      // 2. Product filter (if selected via card click)
      if (selectedProductFilter) {
        const prod = products.find(p => p.slug === selectedProductFilter);
        const pName = prod ? (typeof prod.name === 'object' ? (prod.name.ro || prod.name.en) : prod.name) : selectedProductFilter;
        const matches = (order.items || []).some((i: any) => {
          const iSlug = String(i.slug || '');
          const iName = String(i.name || '');
          return iSlug === selectedProductFilter || (pName && iName.toLowerCase().includes(pName.toLowerCase()));
        });
        if (!matches) return false;
      }

      // 3. Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const idMatch = (order.id || '').toLowerCase().includes(q);
        const nameMatch = (order.customer || '').toLowerCase().includes(q);
        const emailMatch = (order.customerEmail || '').toLowerCase().includes(q);
        const phoneMatch = (order.phone || '').toLowerCase().includes(q);
        const cityMatch = (order.addrCity || order.address || '').toLowerCase().includes(q);
        const itemMatch = (order.items || []).some((it: any) => 
          (it.name || '').toLowerCase().includes(q) ||
          JSON.stringify(it.selectedVariant || '').toLowerCase().includes(q)
        );
        return idMatch || nameMatch || emailMatch || phoneMatch || cityMatch || itemMatch;
      }

      return true;
    });
  }, [orders, statusFilter, selectedProductFilter, searchQuery, manualShippingEnabled, products]);

  return (
    <div className="space-y-6 pb-20">
      {/* ═══ Header ═══ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Clock size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Console Magazin</span>
                {manualShippingEnabled && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                    <Truck size={10} /> Mod Expediere Manuală
                  </span>
                )}
              </div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 leading-tight">Precomenzi & Loturi Rezervate</h1>
            </div>
          </div>
          <p className="text-xs md:text-sm text-slate-500 max-w-2xl leading-relaxed">
            Comenzile cu produse în producție/precomandă sunt izolate aici. Acestea <strong>nu sunt trimise către centrul de fulfillment</strong> până când lotul fizic nu ajunge în stoc.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0">
          <button
            type="button"
            onClick={fetchOrders}
            disabled={loading}
            className="h-11 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Reîmprospătează</span>
          </button>

          <Link
            href="/admin/orders"
            className="h-11 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-xs"
          >
            <ShoppingBag size={14} />
            <span>Toate Comenzile</span>
          </Link>
        </div>
      </div>

      {/* ═══ Global Ratio & Quick Overview Strip ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rată Precomenzi Globale</div>
            <div className="text-base sm:text-lg font-black text-slate-900 truncate">
              {globalMetrics.totalPreorders} <span className="text-xs font-bold text-slate-400">din</span> {globalMetrics.totalStoreOrders} <span className="text-xs font-bold text-amber-600">({globalMetrics.globalRatio}%)</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
            <Package size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Unități Rezervate Lot</div>
            <div className="text-base sm:text-lg font-black text-slate-900 truncate">
              {globalMetrics.totalUnits} <span className="text-xs font-bold text-slate-400">bucăți fizice</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CreditCard size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Încasări Totale Lot</div>
            <div className="text-base sm:text-lg font-black text-slate-900 truncate">
              {globalMetrics.totalRevenue.toFixed(2)} <span className="text-xs font-bold text-slate-400">RON</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <FileText size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status Facturare Oblio</div>
            <div className="text-sm sm:text-base font-black text-slate-900 truncate">
              {globalMetrics.invoicedCount} <span className="text-xs font-bold text-slate-400">emise</span> · {globalMetrics.uninvoicedCount} <span className="text-xs font-bold text-amber-600">neemise</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Top Section: Lista de Produse & Câte Precomenzi din Toate ═══ */}
      <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-amber-600" />
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900">
              Situație Produse & Rată Precomenzi
            </h2>
          </div>
          <span className="text-[11px] font-bold text-slate-400">
            Apasă pe un produs pentru a filtra comenzile de mai jos
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {productsWithPreorderStats.map((pStat) => {
            const isSelected = selectedProductFilter === pStat.slug;
            return (
              <div
                key={pStat.slug}
                onClick={() => setSelectedProductFilter(isSelected ? null : pStat.slug)}
                className={`p-4 md:p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                  isSelected 
                    ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-400/40 shadow-sm' 
                    : 'border-slate-200/80 hover:border-amber-300 bg-white hover:bg-slate-50/60 shadow-xs'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0 overflow-hidden relative">
                    {pStat.image ? (
                      <Image 
                        src={pStat.image} 
                        alt={pStat.name} 
                        width={64} 
                        height={64} 
                        className="object-contain p-1"
                      />
                    ) : (
                      <Package size={24} className="text-slate-400" />
                    )}
                    {pStat.hasPreorders && (
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white animate-pulse" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-black text-slate-900 truncate">
                        {pStat.name}
                      </div>
                      {isSelected ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1">
                          <Check size={10} /> Filtru Activ
                        </span>
                      ) : (
                        <span className="text-xs font-black text-slate-900">
                          {pStat.price.toFixed(2)} RON
                        </span>
                      )}
                    </div>

                    {pStat.badge && (
                      <span className="text-[9px] font-black tracking-wider uppercase text-amber-600 block mt-0.5">
                        {pStat.badge}
                      </span>
                    )}

                    {/* Preorders vs Total ratio highlight */}
                    <div className="mt-2.5 flex items-baseline justify-between">
                      <span className="text-xs font-black text-slate-800">
                        {pStat.preordersCount} {pStat.preordersCount === 1 ? 'precomandă' : 'precomenzi'} <span className="text-slate-400 font-bold">din</span> {pStat.totalOrdersCount} {pStat.totalOrdersCount === 1 ? 'comandă' : 'comenzi'}
                      </span>
                      <span className={`text-xs font-black ${pStat.preordersCount > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                        {pStat.ratioPercent}%
                      </span>
                    </div>

                    {/* Visual Ratio Progress Bar */}
                    <div className="w-full h-2 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          pStat.preordersCount > 0 
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500' 
                            : 'bg-slate-200'
                        }`}
                        style={{ width: `${Math.max(pStat.preordersCount > 0 ? 8 : 0, pStat.ratioPercent)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Variants status pills */}
                <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                  {pStat.preorderVariantsList.length > 0 ? (
                    pStat.preorderVariantsList.map((pv, idx) => (
                      <span 
                        key={idx} 
                        className="px-2 py-0.5 rounded-md bg-amber-100/90 border border-amber-300 text-amber-900 text-[10px] font-black flex items-center gap-1"
                      >
                        <Clock size={10} className="text-amber-700" />
                        <span>{pv.name}: {pv.units} {pv.units === 1 ? 'buc rezervată' : 'buc rezervate'}</span>
                      </span>
                    ))
                  ) : null}

                  {pStat.inStockVariantsList.length > 0 ? (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                      {pStat.inStockVariantsList.map(v => v.name).join(', ')} · În stoc
                    </span>
                  ) : null}

                  {pStat.preordersCount === 0 && (
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                      <Check size={11} /> Toate comenzile au fost din stoc direct
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ Filter & Search Controls ═══ */}
      <div className="space-y-2">
        {selectedProductFilter && (
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-2xl text-xs font-bold text-amber-900">
            <div className="flex items-center gap-2">
              <Tag size={14} className="text-amber-600" />
              <span>Filtru activ pe produs: <strong>{(() => {
                const prod = products.find(p => p.slug === selectedProductFilter);
                if (!prod) return selectedProductFilter;
                return typeof prod.name === 'object' ? (prod.name.ro || prod.name.en || '') : String(prod.name || '');
              })()}</strong></span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-950 font-black">
                {filteredOrders.length} precomenzi
              </span>
            </div>
            <button
              onClick={() => setSelectedProductFilter(null)}
              className="text-amber-700 hover:text-amber-950 font-black underline text-xs cursor-pointer"
            >
              Șterge filtrul de produs
            </button>
          </div>
        )}

        <div className="bg-white p-4 md:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Caută după nr. comandă, client, email, telefon, oraș sau model..."
              className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-amber-500 outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 overflow-x-auto scrollbar-hide">
            {manualShippingEnabled ? (
              <>
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-2 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Toate ({orders.length})
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('invoiced')}
                  className={`px-3 py-2 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === 'invoiced' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Facturate ({globalMetrics.invoicedCount})
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('uninvoiced')}
                  className={`px-3 py-2 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === 'uninvoiced' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Nefacturate ({globalMetrics.uninvoicedCount})
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-2 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Toate ({orders.length})
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('pending_awb')}
                  className={`px-3 py-2 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === 'pending_awb' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  În Producție / Fără AWB
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('invoiced')}
                  className={`px-3 py-2 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === 'invoiced' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Facturate ({globalMetrics.invoicedCount})
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('has_awb')}
                  className={`px-3 py-2 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === 'has_awb' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Cu AWB Generat
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Pre-orders List ═══ */}
      {loading ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center flex flex-col items-center justify-center gap-3">
          <RefreshCw size={28} className="animate-spin text-amber-500" />
          <div className="text-sm font-bold text-slate-500">Se încarcă precomenzile rezervate...</div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center">
            <Clock size={28} />
          </div>
          <h3 className="text-base font-black text-slate-900">Nicio precomandă găsită</h3>
          <p className="text-xs text-slate-500 max-w-md">
            {searchQuery 
              ? `Nu există precomenzi care să corespundă căutării "${searchQuery}".`
              : 'Nu există nicio precomandă înregistrată în acest moment.'}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-2 text-xs font-bold text-amber-600 hover:underline"
            >
              Resetează căutarea
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isExpanded = expandedOrders.has(order.id);
            const preorderItems = (order.items || []).filter(isItemPreorder);

            return (
              <div 
                key={order.id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden transition-all hover:border-amber-300"
              >
                {/* Order Top Bar */}
                <div className="p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-amber-50/20 via-transparent to-transparent">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm md:text-base font-black text-slate-900">
                        {order.id}
                      </span>
                      <button
                        onClick={() => copyToClipboard(order.id, `id_${order.id}`, 'Nr. Comandă')}
                        className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors cursor-pointer"
                        title="Copiază ID"
                      >
                        {copiedKey === `id_${order.id}` ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                    </div>

                    <span className="text-xs text-slate-400 font-semibold">
                      {order.date}
                    </span>

                    {/* Preorder Badge */}
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 text-[11px] font-black uppercase tracking-wider">
                      <Clock size={12} className="text-amber-600 animate-pulse" />
                      <span>Lot Rezervat (Precomandă)</span>
                    </span>

                    {/* Payment Badge */}
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                      <CreditCard size={11} />
                      <span>Stripe Achitat</span>
                    </span>

                    {/* Invoice Badge */}
                    {order.oblioInvoice ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                        <FileText size={11} />
                        <span>Facturat {order.oblioInvoice.seriesName} {order.oblioInvoice.number}</span>
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Comandă</div>
                      <div className="text-lg md:text-xl font-black text-slate-900">{order.total}</div>
                    </div>

                    <button
                      onClick={() => toggleExpand(order.id)}
                      className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                      title={isExpanded ? "Restrânge" : "Extinde detalii"}
                    >
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>

                {/* Main Content Info */}
                <div className="p-5 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left: Client & Delivery Info (5 cols) */}
                  <div className="lg:col-span-5 space-y-3">
                    <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                      Destinatar & Livrare
                    </div>

                    <div className="space-y-1.5 text-xs font-semibold text-slate-700">
                      <div className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <span>{order.customer}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 uppercase">
                          {order.addrCountry || 'RO'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone size={13} className="text-slate-400 shrink-0" />
                        <a href={`tel:${order.phone}`} className="hover:text-amber-600 transition-colors">
                          {order.phone}
                        </a>
                        <button
                          onClick={() => copyToClipboard(order.phone, `ph_${order.id}`, 'Telefon')}
                          className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                        >
                          {copiedKey === `ph_${order.id}` ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        </button>
                      </div>

                      <div className="flex items-center gap-2 text-slate-600">
                        <Mail size={13} className="text-slate-400 shrink-0" />
                        <a href={`mailto:${order.customerEmail}`} className="hover:text-amber-600 transition-colors truncate">
                          {order.customerEmail}
                        </a>
                        <button
                          onClick={() => copyToClipboard(order.customerEmail, `em_${order.id}`, 'Email')}
                          className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer shrink-0"
                        >
                          {copiedKey === `em_${order.id}` ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        </button>
                      </div>

                      <div className="flex items-start gap-2 text-slate-600 pt-1">
                        <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <div>{order.address}</div>
                        </div>
                      </div>
                    </div>

                    {/* Quick address edit button */}
                    <button
                      type="button"
                      onClick={() => openEditShipping(order)}
                      className="mt-2 text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Pencil size={13} />
                      <span>Editează date livrare client</span>
                    </button>
                  </div>

                  {/* Right: Pre-order Items (7 cols) */}
                  <div className="lg:col-span-7 space-y-3">
                    <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-400">
                      <span>Produse Rezervate în Precomandă</span>
                      <span className="text-amber-600 font-bold">
                        {preorderItems.reduce((s: number, it: any) => s + (Number(it.quantity) || 1), 0)} bucăți
                      </span>
                    </div>

                    <div className="space-y-2">
                      {preorderItems.map((item: any, idx: number) => {
                        const variantRaw = item.selectedVariant?.name || item.variant || null;
                        const variantStr = typeof variantRaw === 'object' && variantRaw !== null
                          ? (variantRaw.ro || variantRaw.en || '')
                          : String(variantRaw || '');

                        return (
                          <div 
                            key={idx}
                            className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center gap-3.5"
                          >
                            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden relative">
                              {item.image ? (
                                <Image
                                  src={item.image}
                                  alt={item.name}
                                  width={48}
                                  height={48}
                                  className="object-contain p-1"
                                />
                              ) : (
                                <Package size={20} className="text-slate-400" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-black text-slate-900 truncate">
                                {item.name}
                              </div>
                              {variantStr && (
                                <div className="inline-flex items-center gap-1 mt-0.5 text-[11px] font-bold text-amber-800 bg-amber-100/60 px-2 py-0.5 rounded-md">
                                  <span>Culoare:</span>
                                  <span>{variantStr}</span>
                                </div>
                              )}
                            </div>

                            <div className="text-right shrink-0">
                              <div className="text-xs font-black text-slate-900">
                                x{item.quantity || 1}
                              </div>
                              <div className="text-[11px] font-semibold text-slate-500">
                                {Number(item.price || 0).toFixed(2)} {order.currency || 'RON'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Expandable Extended Section */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-100 bg-slate-50/50 p-5 md:p-6 space-y-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3 text-slate-500">
                          <span>Subtotal: <strong className="text-slate-900">{order.subtotalAmount ? `${order.subtotalAmount.toFixed(2)} ${order.currency}` : 'N/A'}</strong></span>
                          <span>•</span>
                          <span>Transport: <strong className="text-slate-900">{order.shippingAmount ? `${order.shippingAmount.toFixed(2)} ${order.currency}` : 'Gratuit'}</strong></span>
                          {order.discountTotal > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-600">Reducere: <strong>-{order.discountTotal.toFixed(2)} {order.currency}</strong></span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const text = `Comandă: ${order.id}\nClient: ${order.customer}\nTelefon: ${order.phone}\nEmail: ${order.customerEmail}\nAdresă: ${order.address}\nTotal: ${order.total}`;
                              copyToClipboard(text, `full_${order.id}`, 'Toate datele');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <Copy size={13} />
                            <span>Copiază date expediere</span>
                          </button>

                          <Link
                            href={`/admin/orders?search=${order.id}`}
                            className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                          >
                            <ExternalLink size={13} />
                            <span>Deschide în Comenzi</span>
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Footer Action Strip */}
                <div className="px-5 py-3 md:px-6 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-[11px] text-slate-500 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>Se va expedia când lotul de producție ajunge la depozit.</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {order.oblioInvoice ? (
                      <a
                        href={order.oblioInvoice.link || order.oblioInvoice.pdfUrl || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-xs transition-colors flex items-center gap-1.5 border border-purple-200"
                      >
                        <FileText size={13} />
                        <span>Descarcă Factură</span>
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleEmitOblio(order.id, order.supabaseId)}
                        disabled={emittingOblio[order.supabaseId || order.id]}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1.5 border border-slate-200 cursor-pointer disabled:opacity-50"
                      >
                        <FileText size={13} />
                        <span>{emittingOblio[order.supabaseId || order.id] ? 'Se emite...' : 'Emite Factură (Oblio)'}</span>
                      </button>
                    )}

                    <Link
                      href={`/admin/orders?search=${order.id}`}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-2xs"
                    >
                      <ShoppingBag size={13} />
                      <span>Gestionează în Comenzi</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ Edit Shipping Modal ═══ */}
      {editingOrder && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => setEditingOrder(null)}
          />

          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">Modifică Adresă Livrare</h3>
                <p className="text-xs text-slate-500 mt-0.5">Comandă Precomandă: {editingOrder.id}</p>
              </div>
              <button
                onClick={() => setEditingOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveShipping} className="p-6 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Prenume</label>
                  <input
                    type="text"
                    value={editForm.customerFirstName}
                    onChange={(e) => setEditForm(f => ({ ...f, customerFirstName: e.target.value }))}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:bg-white focus:border-amber-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Nume</label>
                  <input
                    type="text"
                    value={editForm.customerLastName}
                    onChange={(e) => setEditForm(f => ({ ...f, customerLastName: e.target.value }))}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:bg-white focus:border-amber-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Telefon</label>
                  <input
                    type="tel"
                    value={editForm.customerPhone}
                    onChange={(e) => setEditForm(f => ({ ...f, customerPhone: e.target.value }))}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:bg-white focus:border-amber-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.customerEmail}
                    onChange={(e) => setEditForm(f => ({ ...f, customerEmail: e.target.value }))}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:bg-white focus:border-amber-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Adresă de livrare</label>
                <input
                  type="text"
                  value={editForm.addrLine1}
                  onChange={(e) => setEditForm(f => ({ ...f, addrLine1: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:bg-white focus:border-amber-500 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Oraș / Sector</label>
                  <input
                    type="text"
                    value={editForm.addrCity}
                    onChange={(e) => setEditForm(f => ({ ...f, addrCity: e.target.value }))}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:bg-white focus:border-amber-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Cod Poștal</label>
                  <input
                    type="text"
                    value={editForm.addrZip}
                    onChange={(e) => setEditForm(f => ({ ...f, addrZip: e.target.value }))}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:bg-white focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="h-10 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={savingShipping}
                  className="h-10 px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {savingShipping ? 'Se salvează...' : 'Salvează Modificările'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
