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
  Layers,
  ChevronDown,
  ChevronUp,
  X,
  Tag,
  ShoppingBag,
  CheckCircle2,
  Send,
  ShieldCheck,
  Banknote,
  Zap,
  Gift,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import Image from 'next/image';
import { getAdminOrders } from '@/app/actions/admin-orders';
import { getAdminProductsServer } from '@/app/actions/products';
import { updateOrderShippingAction, updateOrderStatusAction } from '@/app/actions/orders';
import {
  dispatchOrdersToFulfillment,
  releasePreorderForFulfillmentAction,
} from '@/app/actions/admin-fulfillment';
import { emitOblioInvoiceAction } from '@/app/actions/invoices';
import {
  classifyOrderHistoricalOrActivePreorder,
  classifyOrderIsActivePreorder,
  isItemSnapshotPreorder,
  isOrderClosedOrShipped,
  matchesAdminOrderSearch,
  normalizeSearchText,
} from '@/utils/order-search';
import { isDigitalProgramId, isDigitalProgramItem } from '@/lib/programs';

type PrimaryTab = 'active' | 'all' | 'completed';
type QuickFilter = 'all' | 'ready' | 'mixed' | 'uninvoiced';
type ReleaseActionMode = 'processing' | 'processing_and_dispatch' | 'shipped';

interface VariantLotStat {
  key: string;
  name: string;
  activeUnits: number;
  totalUnits: number;
  catalogStatus: 'preorder' | 'in_stock' | 'unknown';
}

interface PreorderProductStat {
  slug: string;
  id: string;
  name: string;
  image: string;
  price: number;
  activePreorderCount: number;
  totalPreorderCount: number;
  activeReservedUnits: number;
  totalReservedUnits: number;
  catalogPreorderVariantsCount: number;
  hasCatalogPreorderVariant: boolean;
  variants: VariantLotStat[];
}

interface OrderStatusMeta {
  label: string;
  badgeClass: string;
  dotClass: string;
}

interface AnalyzedPreorder {
  order: any;
  preorderItems: any[];
  inStockItems: any[];
  isMixed: boolean;
  isActive: boolean;
  isClosed: boolean;
  isDispatchedToFulfillment: boolean;
  isProcessing: boolean;
  catalogStockArrived: boolean;
  isReadyForRelease: boolean;
  reservedUnitsCount: number;
  statusMeta: OrderStatusMeta;
}

function getLocalizedText(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string' || typeof val === 'number') return String(val).trim();
  if (typeof val === 'object') {
    return String(val.ro || val.en || Object.values(val)[0] || '').trim();
  }
  return '';
}

function getItemVariantLabel(item: any): string {
  const raw = item?.selectedVariant?.name ?? item?.variant ?? '';
  return getLocalizedText(raw);
}

function stripPreorderMarkers(text: string): string {
  return normalizeSearchText(text)
    .replace(/\(?\s*precomand[aă]?\s*\)?/g, '')
    .replace(/\(?\s*pre-?order\s*\)?/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isProductDigital(prod: any): boolean {
  if (!prod) return false;
  if (Boolean(prod.is_digital) || Boolean(prod.isDigital) || Boolean(prod.specs_summary?.is_digital)) {
    return true;
  }
  if (isDigitalProgramId(prod.id) || isDigitalProgramId(prod.slug)) {
    return true;
  }
  return isDigitalProgramItem(prod);
}

function itemMatchesProduct(item: any, prod: any): boolean {
  if (!item || !prod) return false;
  const pId = String(prod.id || '').trim().toLowerCase();
  const pSlug = String(prod.slug || '').trim().toLowerCase();
  const pNameNorm = normalizeSearchText(getLocalizedText(prod.name));

  const iId = String(item.id || '').trim().toLowerCase();
  const iSlug = String(item.slug || '').trim().toLowerCase();
  const iNameNorm = normalizeSearchText(getLocalizedText(item.name));

  if (pId && iId && iId === pId) return true;
  if (pSlug && iSlug && iSlug === pSlug) return true;
  if (pNameNorm && iNameNorm) {
    return iNameNorm === pNameNorm || iNameNorm.includes(pNameNorm) || pNameNorm.includes(iNameNorm);
  }
  return false;
}

function isItemCatalogReady(item: any, products: any[]): boolean {
  if (!item) return false;
  if (isDigitalProgramItem(item)) return true;

  const matchedProduct = products.find((p) => !isProductDigital(p) && itemMatchesProduct(item, p));
  if (!matchedProduct) return false;

  const options = Array.isArray(matchedProduct.variants?.options) ? matchedProduct.variants.options : [];
  if (options.length === 0) return false;

  const itemVarRaw = getItemVariantLabel(item);
  const itemVarNorm = normalizeSearchText(itemVarRaw);
  const itemVarClean = stripPreorderMarkers(itemVarRaw);

  const matchedOption = options.find((opt: any) => {
    const optName = getLocalizedText(opt?.name);
    const optNorm = normalizeSearchText(optName);
    const optClean = stripPreorderMarkers(optName);
    if (itemVarNorm && optNorm === itemVarNorm) return true;
    if (itemVarClean && optClean && optClean === itemVarClean) return true;
    return false;
  });

  if (!matchedOption) return false;
  return matchedOption.stock_status === 'in_stock';
}

function getPreorderStatusMeta(params: {
  order: any;
  isClosed: boolean;
  isDispatchedToFulfillment: boolean;
  isProcessing: boolean;
  catalogStockArrived: boolean;
}): OrderStatusMeta {
  const { order, isClosed, isDispatchedToFulfillment, isProcessing, catalogStockArrived } = params;
  const st = String(order.status || '').toLowerCase().trim();

  if (st === 'cancelled' || st === 'anulata') {
    return {
      label: 'Anulată',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
      dotClass: 'bg-slate-400',
    };
  }
  if (st === 'returned' || st === 'refunded' || st === 'returnata') {
    return {
      label: 'Returnată / Rambursată',
      badgeClass: 'bg-red-50 text-red-700 border-red-200',
      dotClass: 'bg-red-500',
    };
  }
  if (st === 'delivered' || st === 'livrat' || order.trackingMetadata?.delivered) {
    return {
      label: 'Livrată',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dotClass: 'bg-emerald-500',
    };
  }
  if (st === 'shipped' || st === 'expediata' || st === 'in_transit' || Boolean(order.trackingNumber) || isClosed) {
    return {
      label: order.trackingNumber ? `Expediată · ${order.trackingNumber}` : 'Expediată / Finalizată',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      dotClass: 'bg-blue-500',
    };
  }
  if (isDispatchedToFulfillment) {
    return {
      label: 'Trimis Fulfillment',
      badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      dotClass: 'bg-indigo-500',
    };
  }
  if (isProcessing) {
    return {
      label: 'Eliberată (Procesare)',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dotClass: 'bg-emerald-500',
    };
  }
  if (catalogStockArrived) {
    return {
      label: 'Stoc Sosit · Gata de Eliberare',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dotClass: 'bg-emerald-500',
    };
  }
  return {
    label: 'Așteaptă Lot (Precomandă)',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    dotClass: 'bg-amber-500',
  };
}

function analyzePreorder(order: any, products: any[]): AnalyzedPreorder {
  const items = Array.isArray(order.items) ? order.items : [];
  const preorderItems = items.filter((it: any) => isItemSnapshotPreorder(it));
  const inStockItems = items.filter((it: any) => !isItemSnapshotPreorder(it));
  const isMixed = preorderItems.length > 0 && inStockItems.length > 0;
  const isActive = classifyOrderIsActivePreorder(order);
  const isClosed = isOrderClosedOrShipped(order);
  const isDispatchedToFulfillment = Boolean(order.fulfillmentDispatchedAt);
  const isProcessing = String(order.status || '').toLowerCase().trim() === 'processing';
  const catalogStockArrived =
    preorderItems.length > 0 && preorderItems.every((it: any) => isItemCatalogReady(it, products));
  const isReadyForRelease = !isClosed && (isProcessing || isDispatchedToFulfillment || catalogStockArrived);
  const reservedUnitsCount = preorderItems.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 1), 0);

  return {
    order,
    preorderItems,
    inStockItems,
    isMixed,
    isActive,
    isClosed,
    isDispatchedToFulfillment,
    isProcessing,
    catalogStockArrived,
    isReadyForRelease,
    reservedUnitsCount,
    statusMeta: getPreorderStatusMeta({
      order,
      isClosed,
      isDispatchedToFulfillment,
      isProcessing,
      catalogStockArrived,
    }),
  };
}

function formatMultiCurrencyTotals(orders: any[]): string {
  if (!orders.length) return '0.00 RON';
  const totalsByCurrency: Record<string, number> = {};
  orders.forEach((o) => {
    const curr = String(o.currency || 'RON').trim().toUpperCase() || 'RON';
    totalsByCurrency[curr] = (totalsByCurrency[curr] || 0) + Number(o.totalAmount || 0);
  });

  const entries = Object.entries(totalsByCurrency).sort(([a], [b]) => {
    if (a === 'RON') return -1;
    if (b === 'RON') return 1;
    return a.localeCompare(b);
  });

  return entries
    .map(([curr, amt]) => `${amt.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${curr}`)
    .join(' + ');
}

export default function AdminPreordersPage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [manualShippingEnabled, setManualShippingEnabled] = useState(true);

  const [primaryTab, setPrimaryTab] = useState<PrimaryTab>('active');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [selectedProductFilter, setSelectedProductFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLotsDrawer, setShowLotsDrawer] = useState(false);

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

  // Safe Stock Release Confirmation Modal
  const [releasingEntry, setReleasingEntry] = useState<AnalyzedPreorder | null>(null);
  const [releaseConfirmedStock, setReleaseConfirmedStock] = useState(false);
  const [releasingAction, setReleasingAction] = useState<ReleaseActionMode | null>(null);

  const [emittingOblio, setEmittingOblio] = useState<Record<string, boolean>>({});

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const [all, prods, fRes] = await Promise.all([
        getAdminOrders().catch(() => []),
        getAdminProductsServer().catch(() => []),
        fetch('/api/admin/data?action=fulfillment-settings')
          .then((r) => r.json())
          .catch(() => ({ data: { manual_shipping_enabled: true } })),
      ]);

      const validAll = Array.isArray(all) ? all : [];
      const preorderOnly = validAll.filter((o) => classifyOrderHistoricalOrActivePreorder(o));
      setOrders(preorderOnly);

      if (Array.isArray(prods)) {
        setProducts(prods);
      }

      if (fRes?.data) {
        setManualShippingEnabled(Boolean(fRes.data.manual_shipping_enabled));
      }
    } catch (err: any) {
      toast.error('Eroare la încărcarea precomenzilor: ' + (err?.message || ''));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const copyToClipboard = (text: string, key: string, label: string = 'Copiat') => {
    if (!text || text === 'N/A') return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`${label} copiat`, { duration: 1800 });
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 1800);
  };

  const toggleExpand = (id: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openEditShipping = (order: any) => {
    const nameParts = String(order.customer || '').trim().split(' ');
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
        toast.success('Datele de livrare au fost actualizate.', { id: toastId });
        setEditingOrder(null);
        await fetchOrders();
      } else {
        toast.error(`Eroare: ${res.error}`, { id: toastId });
      }
    } catch {
      toast.error('A apărut o eroare la salvare.', { id: toastId });
    } finally {
      setSavingShipping(false);
    }
  };

  const handleEmitOblio = async (orderId: string, supabaseId?: string) => {
    const targetId = supabaseId || orderId;
    setEmittingOblio((prev) => ({ ...prev, [targetId]: true }));
    const toastId = toast.loading('Se emite factura în Oblio...');
    try {
      const res = await emitOblioInvoiceAction(targetId);
      if (res.success) {
        toast.success(`Factura Oblio emisă: ${res.seriesName} ${res.number}`, { id: toastId });
        await fetchOrders();
      } else {
        toast.error(`Eroare Oblio: ${res.error}`, { id: toastId });
      }
    } catch {
      toast.error('Eroare conexiune Oblio.', { id: toastId });
    } finally {
      setEmittingOblio((prev) => ({ ...prev, [targetId]: false }));
    }
  };

  const openReleaseModal = (entry: AnalyzedPreorder) => {
    setReleasingEntry(entry);
    setReleaseConfirmedStock(false);
    setReleasingAction(null);
  };

  const handleExecuteRelease = async (mode: ReleaseActionMode) => {
    if (!releasingEntry || !releaseConfirmedStock) return;
    const { order } = releasingEntry;
    const targetId = order.supabaseId || order.id;

    setReleasingAction(mode);
    const toastId = toast.loading(
      mode === 'shipped'
        ? 'Se marchează precomanda ca expediată...'
        : mode === 'processing_and_dispatch'
          ? 'Se eliberează și se trimite către fulfillment...'
          : 'Se eliberează precomanda în procesare...'
    );

    try {
      if (mode === 'shipped') {
        const statusRes = await updateOrderStatusAction(targetId, 'shipped');
        if (!statusRes.success) {
          toast.error(statusRes.error || 'Nu s-a putut actualiza statusul comenzii.', { id: toastId });
          return;
        }
        toast.success(`Comanda ${order.id} a fost marcată ca expediată.`, { id: toastId });
      } else {
        const releaseRes = await releasePreorderForFulfillmentAction([targetId]);
        if (!releaseRes.success) {
          toast.error(releaseRes.error || 'Nu s-a putut elibera precomanda pentru procesare.', { id: toastId });
          return;
        }

        if (mode === 'processing_and_dispatch') {
          const dispatchRes = await dispatchOrdersToFulfillment({
            orderIds: [targetId],
            trigger: 'manual',
            notes: `Precomandă eliberată (${order.id}) — stoc confirmat fizic în depozit.`,
          });
          if (!dispatchRes.success) {
            toast.error(
              `Precomanda a fost eliberată în Procesare, dar trimiterea emailului către fulfillment a eșuat: ${dispatchRes.error || 'Eroare necunoscută'}`,
              { id: toastId, duration: 5000 }
            );
            setReleasingEntry(null);
            await fetchOrders();
            return;
          }
          toast.success(`Comanda ${order.id} a fost eliberată și trimisă către fulfillment.`, { id: toastId });
        } else {
          toast.success(`Comanda ${order.id} a fost eliberată în procesare.`, { id: toastId });
        }
      }

      setReleasingEntry(null);
      await fetchOrders();
    } catch (err: any) {
      toast.error(err?.message || 'Eroare la eliberarea precomenzii.', { id: toastId });
    } finally {
      setReleasingAction(null);
    }
  };

  // Analyze every preorder once
  const analyzedOrders = useMemo<AnalyzedPreorder[]>(() => {
    return orders.map((order) => analyzePreorder(order, products));
  }, [orders, products]);

  const activeEntries = useMemo(
    () => analyzedOrders.filter((e) => e.isActive),
    [analyzedOrders]
  );

  const completedEntries = useMemo(
    () => analyzedOrders.filter((e) => !e.isActive),
    [analyzedOrders]
  );

  // KPI metrics (focused on Active Preorders!)
  const kpiMetrics = useMemo(() => {
    const activeOrdersList = activeEntries.map((e) => e.order);
    const activeUnits = activeEntries.reduce((sum, e) => sum + e.reservedUnitsCount, 0);
    const readyCount = activeEntries.filter((e) => e.isReadyForRelease).length;
    const blockedRevenueText = formatMultiCurrencyTotals(activeOrdersList);

    return {
      activeCount: activeEntries.length,
      completedCount: completedEntries.length,
      totalCount: analyzedOrders.length,
      activeUnits,
      blockedRevenueText,
      readyCount,
    };
  }, [activeEntries, completedEntries, analyzedOrders.length]);

  // Physical products that ACTUALLY have preorders or a variant marked stock_status === 'preorder'
  // Digital PDF programs and irrelevant 0-preorder in-stock-only products are strictly excluded.
  const preorderProductsSummary = useMemo<PreorderProductStat[]>(() => {
    const physicalProducts = products.filter((p) => !isProductDigital(p));

    const stats: PreorderProductStat[] = [];

    for (const prod of physicalProducts) {
      const pName = getLocalizedText(prod.name);
      const pSlug = String(prod.slug || prod.id || '');
      const pId = String(prod.id || pSlug);
      const pImage = prod.image || prod.main_image || (Array.isArray(prod.images) && prod.images[0]) || '';
      const pPrice = Number(prod.price || prod.price_numeric || 0);

      const options = Array.isArray(prod.variants?.options) ? prod.variants.options : [];
      const variantMap = new Map<string, VariantLotStat>();
      let catalogPreorderVariantsCount = 0;

      for (const opt of options) {
        const optName = getLocalizedText(opt?.name);
        if (!optName) continue;
        const isCatalogPreorder =
          opt?.stock_status === 'preorder' ||
          optName.toLowerCase().includes('precomand') ||
          optName.toLowerCase().includes('pre-order');
        if (isCatalogPreorder) catalogPreorderVariantsCount++;

        variantMap.set(normalizeSearchText(optName), {
          key: normalizeSearchText(optName),
          name: optName,
          activeUnits: 0,
          totalUnits: 0,
          catalogStatus: isCatalogPreorder ? 'preorder' : 'in_stock',
        });
      }

      const activeOrderIds = new Set<string>();
      const totalOrderIds = new Set<string>();
      let activeReservedUnits = 0;
      let totalReservedUnits = 0;

      for (const entry of analyzedOrders) {
        for (const item of entry.preorderItems) {
          if (!itemMatchesProduct(item, prod)) continue;

          const qty = Number(item.quantity || 1);
          const orderKey = String(entry.order.supabaseId || entry.order.id);
          totalOrderIds.add(orderKey);
          totalReservedUnits += qty;

          if (entry.isActive) {
            activeOrderIds.add(orderKey);
            activeReservedUnits += qty;
          }

          const vLabel = getItemVariantLabel(item) || 'Standard';
          const vNorm = normalizeSearchText(vLabel);
          const vClean = stripPreorderMarkers(vLabel);

          let targetVar = variantMap.get(vNorm);
          if (!targetVar && vClean) {
            for (const candidate of variantMap.values()) {
              if (stripPreorderMarkers(candidate.name) === vClean) {
                targetVar = candidate;
                break;
              }
            }
          }

          if (!targetVar) {
            targetVar = {
              key: vNorm || 'standard',
              name: vLabel,
              activeUnits: 0,
              totalUnits: 0,
              catalogStatus: 'unknown',
            };
            variantMap.set(targetVar.key, targetVar);
          }

          targetVar.totalUnits += qty;
          if (entry.isActive) {
            targetVar.activeUnits += qty;
          }
        }
      }

      const hasCatalogPreorderVariant = catalogPreorderVariantsCount > 0;
      const hasAnyPreorders = totalOrderIds.size > 0;

      if (!hasCatalogPreorderVariant && !hasAnyPreorders) {
        continue;
      }

      const relevantVariants = Array.from(variantMap.values()).filter(
        (v) => v.catalogStatus === 'preorder' || v.totalUnits > 0
      );

      stats.push({
        slug: pSlug,
        id: pId,
        name: pName || pSlug,
        image: pImage,
        price: pPrice,
        activePreorderCount: activeOrderIds.size,
        totalPreorderCount: totalOrderIds.size,
        activeReservedUnits,
        totalReservedUnits,
        catalogPreorderVariantsCount,
        hasCatalogPreorderVariant,
        variants: relevantVariants,
      });
    }

    return stats.sort((a, b) => {
      if (b.activeReservedUnits !== a.activeReservedUnits) return b.activeReservedUnits - a.activeReservedUnits;
      if (Number(b.hasCatalogPreorderVariant) !== Number(a.hasCatalogPreorderVariant)) {
        return Number(b.hasCatalogPreorderVariant) - Number(a.hasCatalogPreorderVariant);
      }
      return b.totalReservedUnits - a.totalReservedUnits;
    });
  }, [products, analyzedOrders]);

  // Orders scoped to current primary tab
  const tabScopedEntries = useMemo(() => {
    if (primaryTab === 'active') return activeEntries;
    if (primaryTab === 'completed') return completedEntries;
    return analyzedOrders;
  }, [primaryTab, activeEntries, completedEntries, analyzedOrders]);

  const quickCounts = useMemo(() => {
    return {
      ready: tabScopedEntries.filter((e) => e.isReadyForRelease).length,
      mixed: tabScopedEntries.filter((e) => e.isMixed).length,
      uninvoiced: tabScopedEntries.filter((e) => !e.order.oblioInvoice && !e.isClosed).length,
    };
  }, [tabScopedEntries]);

  const selectedProductObj = useMemo(
    () => preorderProductsSummary.find((p) => p.slug === selectedProductFilter) || null,
    [preorderProductsSummary, selectedProductFilter]
  );

  // Final filtered list
  const filteredEntries = useMemo(() => {
    return tabScopedEntries.filter((entry) => {
      if (quickFilter === 'ready' && !entry.isReadyForRelease) return false;
      if (quickFilter === 'mixed' && !entry.isMixed) return false;
      if (quickFilter === 'uninvoiced' && (Boolean(entry.order.oblioInvoice) || entry.isClosed)) return false;

      if (selectedProductFilter) {
        const prod = products.find((p) => String(p.slug || p.id) === selectedProductFilter);
        const matchesProd = (entry.order.items || []).some((it: any) =>
          prod ? itemMatchesProduct(it, prod) : String(it.slug || '') === selectedProductFilter
        );
        if (!matchesProd) return false;
      }

      if (searchQuery.trim()) {
        return matchesAdminOrderSearch(entry.order, searchQuery);
      }

      return true;
    });
  }, [tabScopedEntries, quickFilter, selectedProductFilter, products, searchQuery]);

  return (
    <div className="space-y-3 sm:space-y-4 pb-16 max-w-full min-w-0">
      {/* ═══ Compact Header & Primary Controls ═══ */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
              <Clock size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center flex-wrap gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight truncate">
                  Precomenzi
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-black shrink-0">
                  <span>{kpiMetrics.activeCount} active</span>
                  <span className="text-amber-400">·</span>
                  <span className="text-slate-600 font-bold">{kpiMetrics.completedCount} finalizate</span>
                </span>
                {manualShippingEnabled && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                    <Truck size={11} /> Izolare Fulfillment Activă
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={fetchOrders}
              disabled={loading}
              className="h-9 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Reîmprospătează</span>
            </button>

            <Link
              href="/admin/orders"
              className="h-9 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <ShoppingBag size={13} />
              <span>Comenzi</span>
            </Link>
          </div>
        </div>

        {/* Status Tabs + Search Toolbar */}
        <div className="flex flex-col lg:flex-row gap-2.5 items-stretch lg:items-center">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto scrollbar-hide shrink-0">
            <button
              type="button"
              onClick={() => setPrimaryTab('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                primaryTab === 'active'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Active Precomenzi</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                primaryTab === 'active' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200/80 text-slate-600'
              }`}>
                {kpiMetrics.activeCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPrimaryTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                primaryTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Toate</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                primaryTab === 'all' ? 'bg-slate-100 text-slate-800' : 'bg-slate-200/80 text-slate-600'
              }`}>
                {kpiMetrics.totalCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPrimaryTab('completed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                primaryTab === 'completed'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Expediate / Finalizate</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                primaryTab === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200/80 text-slate-600'
              }`}>
                {kpiMetrics.completedCount}
              </span>
            </button>
          </div>

          <div className="relative flex-1 min-w-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Caută nr. comandă, client, telefon, oraș, model..."
              className="w-full h-9 pl-9 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-amber-500 outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                aria-label="Șterge căutarea"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {(quickCounts.ready > 0 || quickCounts.mixed > 0 || quickCounts.uninvoiced > 0 || quickFilter !== 'all') && (
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide shrink-0">
              {quickCounts.ready > 0 && (
                <button
                  type="button"
                  onClick={() => setQuickFilter((prev) => (prev === 'ready' ? 'all' : 'ready'))}
                  className={`h-8 px-2.5 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer whitespace-nowrap ${
                    quickFilter === 'ready'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  Gata Eliberare ({quickCounts.ready})
                </button>
              )}
              {quickCounts.mixed > 0 && (
                <button
                  type="button"
                  onClick={() => setQuickFilter((prev) => (prev === 'mixed' ? 'all' : 'mixed'))}
                  className={`h-8 px-2.5 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer whitespace-nowrap ${
                    quickFilter === 'mixed'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                  }`}
                >
                  Mixte ({quickCounts.mixed})
                </button>
              )}
              {quickCounts.uninvoiced > 0 && (
                <button
                  type="button"
                  onClick={() => setQuickFilter((prev) => (prev === 'uninvoiced' ? 'all' : 'uninvoiced'))}
                  className={`h-8 px-2.5 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer whitespace-nowrap ${
                    quickFilter === 'uninvoiced'
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                  }`}
                >
                  Nefacturate ({quickCounts.uninvoiced})
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══ Super Compact KPI Strip ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white px-3.5 py-2.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock size={16} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
              Precomenzi Active
            </div>
            <div className="text-sm sm:text-base font-black text-slate-900 truncate">
              {kpiMetrics.activeCount}
              <span className="text-[11px] font-bold text-slate-400 ml-1">din {kpiMetrics.totalCount}</span>
            </div>
          </div>
        </div>

        <div className="bg-white px-3.5 py-2.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
            <Package size={16} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
              Unități Rezervate
            </div>
            <div className="text-sm sm:text-base font-black text-slate-900 truncate">
              {kpiMetrics.activeUnits} <span className="text-[11px] font-bold text-slate-400">buc</span>
            </div>
          </div>
        </div>

        <div className="bg-white px-3.5 py-2.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CreditCard size={16} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
              Valoare Blocată
            </div>
            <div className="text-sm sm:text-base font-black text-slate-900 truncate" title={kpiMetrics.blockedRevenueText}>
              {kpiMetrics.blockedRevenueText}
            </div>
          </div>
        </div>

        <div className="bg-white px-3.5 py-2.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={16} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
              Gata de Eliberare
            </div>
            <div className="text-sm sm:text-base font-black text-slate-900 truncate">
              {kpiMetrics.readyCount}
              <span className="text-[11px] font-bold text-slate-400 ml-1">comenzi</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Compact Horizontal Product Lot Strip (NO digital PDFs, NO 0-preorder in-stock items) ═══ */}
      {preorderProductsSummary.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs px-3 py-2.5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Layers size={14} className="text-amber-600 shrink-0" />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 truncate">
                Produse cu Precomenzi Active / Loturi
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-black shrink-0">
                {preorderProductsSummary.length}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {selectedProductFilter && (
                <button
                  type="button"
                  onClick={() => setSelectedProductFilter(null)}
                  className="text-[11px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
                >
                  <X size={12} />
                  <span>Resetează filtru</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowLotsDrawer((prev) => !prev)}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
              >
                <span>{showLotsDrawer ? 'Ascunde variante' : 'Detalii loturi'}</span>
                {showLotsDrawer ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 sm:flex-wrap scrollbar-hide">
            {preorderProductsSummary.map((pStat) => {
              const isSelected = selectedProductFilter === pStat.slug;
              const pillSubtitle =
                pStat.activeReservedUnits > 0
                  ? `${pStat.activeReservedUnits} buc active · ${pStat.activePreorderCount} com.`
                  : pStat.totalReservedUnits > 0
                    ? `${pStat.totalReservedUnits} buc istoric`
                    : `${pStat.catalogPreorderVariantsCount} var. precomandă`;

              return (
                <button
                  key={pStat.slug}
                  type="button"
                  onClick={() => setSelectedProductFilter(isSelected ? null : pStat.slug)}
                  className={`h-12 px-2.5 rounded-xl border transition-all flex items-center gap-2.5 shrink-0 cursor-pointer text-left ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-400/30 shadow-2xs'
                      : 'border-slate-200 bg-slate-50/70 hover:bg-white hover:border-amber-300'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center shrink-0 overflow-hidden">
                    {pStat.image ? (
                      <Image
                        src={pStat.image}
                        alt={pStat.name}
                        width={32}
                        height={32}
                        className="object-contain p-0.5"
                      />
                    ) : (
                      <Package size={15} className="text-slate-400" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-slate-900 truncate max-w-[145px] sm:max-w-[190px]">
                        {pStat.name}
                      </span>
                      {pStat.activeReservedUnits > 0 && (
                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      )}
                    </div>
                    <div className="text-[10px] font-bold text-slate-500 whitespace-nowrap">
                      {pillSubtitle}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {showLotsDrawer && (
            <div className="mt-2.5 pt-2.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {preorderProductsSummary.map((pStat) => (
                <div key={`drawer_${pStat.slug}`} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-slate-900 truncate">{pStat.name}</span>
                    <span className="text-[10px] font-bold text-slate-500 shrink-0">
                      {pStat.activeReservedUnits} active / {pStat.totalReservedUnits} total
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {pStat.variants.map((v) => (
                      <span
                        key={v.key}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          v.catalogStatus === 'preorder'
                            ? 'bg-amber-100/80 text-amber-900 border-amber-300'
                            : v.catalogStatus === 'in_stock'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        {v.name}: {v.activeUnits > 0 ? `${v.activeUnits} active` : `${v.totalUnits} istoric`}
                        {v.catalogStatus === 'in_stock' ? ' (Stoc sosit)' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Active Product Filter Banner */}
      {selectedProductObj && (
        <div className="flex items-center justify-between gap-2 bg-amber-50 border border-amber-200 px-3.5 py-2 rounded-xl text-xs font-bold text-amber-900">
          <div className="flex items-center gap-2 min-w-0">
            <Tag size={13} className="text-amber-600 shrink-0" />
            <span className="truncate">
              Filtru produs: <strong>{selectedProductObj.name}</strong> ({filteredEntries.length})
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedProductFilter(null)}
            className="text-amber-800 hover:text-amber-950 font-black underline shrink-0 cursor-pointer"
          >
            Resetează
          </button>
        </div>
      )}

      {/* ═══ Preorders List (Right Above the Fold!) ═══ */}
      {loading ? (
        <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center flex flex-col items-center justify-center gap-2.5">
          <RefreshCw size={24} className="animate-spin text-amber-500" />
          <div className="text-xs font-bold text-slate-500">Se încarcă precomenzile...</div>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center flex flex-col items-center justify-center gap-2.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center">
            <Clock size={22} />
          </div>
          <h3 className="text-sm font-black text-slate-900">Nicio precomandă în această vedere</h3>
          <p className="text-xs text-slate-500 max-w-md">
            {searchQuery
              ? `Nu există precomenzi care să corespundă căutării "${searchQuery}".`
              : primaryTab === 'active'
                ? 'Nu există precomenzi active în așteptare. Verifică tab-ul "Toate" sau "Expediate / Finalizate".'
                : 'Nu există precomenzi înregistrate pentru filtrele selectate.'}
          </p>
          {(searchQuery || selectedProductFilter || quickFilter !== 'all' || primaryTab !== 'all') && (
            <div className="flex items-center gap-3 mt-1">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-xs font-bold text-amber-700 hover:underline cursor-pointer"
                >
                  Resetează căutarea
                </button>
              )}
              {(selectedProductFilter || quickFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProductFilter(null);
                    setQuickFilter('all');
                  }}
                  className="text-xs font-bold text-amber-700 hover:underline cursor-pointer"
                >
                  Șterge filtrele
                </button>
              )}
              {primaryTab === 'active' && kpiMetrics.totalCount > 0 && (
                <button
                  type="button"
                  onClick={() => setPrimaryTab('all')}
                  className="text-xs font-bold text-slate-700 hover:underline cursor-pointer"
                >
                  Vezi toate ({kpiMetrics.totalCount})
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* ─── DESKTOP TABLE (lg+) ─── */}
          <div className="hidden lg:block bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Comandă & Status</th>
                    <th className="py-3 px-4">Client & Livrare</th>
                    <th className="py-3 px-4">Produse & Variante</th>
                    <th className="py-3 px-4">Total & Factură</th>
                    <th className="py-3 px-4 text-right">Acțiuni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredEntries.map((entry) => {
                    const { order, isMixed, isClosed, statusMeta } = entry;
                    const isExpanded = expandedOrders.has(order.id);
                    const targetId = order.supabaseId || order.id;
                    const allItems = Array.isArray(order.items) ? order.items : [];
                    const isCod = order.paymentMethod === 'cod';

                    return (
                      <React.Fragment key={order.id}>
                        <tr className={`align-top transition-colors ${isExpanded ? 'bg-amber-50/20' : 'hover:bg-slate-50/70'}`}>
                          {/* Col 1: Order & Status */}
                          <td className="py-3.5 px-4 w-[210px]">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-black text-slate-900">{order.id}</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(order.id, `id_${order.id}`, 'Nr. Comandă')}
                                className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                                title="Copiază Nr. Comandă"
                              >
                                {copiedKey === `id_${order.id}` ? (
                                  <Check size={12} className="text-emerald-600" />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            </div>
                            <div className="text-[11px] font-semibold text-slate-400 mt-0.5">{order.date}</div>

                            <div className="flex flex-wrap gap-1 mt-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-black ${statusMeta.badgeClass}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotClass}`} />
                                <span>{statusMeta.label}</span>
                              </span>

                              {isMixed && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-black">
                                  <Layers size={10} />
                                  <span>Mixtă</span>
                                </span>
                              )}

                              {order.priorityProcessing && !isClosed && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black">
                                  <Zap size={10} />
                                  <span>Prioritar</span>
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Col 2: Client & Shipping */}
                          <td className="py-3.5 px-4 max-w-[240px]">
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-slate-900 truncate">{order.customer}</span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold uppercase shrink-0">
                                {order.addrCountry || 'RO'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 text-slate-600 font-semibold mt-1">
                              <Phone size={11} className="text-slate-400 shrink-0" />
                              <a href={`tel:${order.phone}`} className="hover:text-amber-700 truncate">
                                {order.phone}
                              </a>
                              {order.phone && order.phone !== 'N/A' && (
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(order.phone, `ph_${order.id}`, 'Telefon')}
                                  className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer shrink-0"
                                  title="Copiază telefon"
                                >
                                  {copiedKey === `ph_${order.id}` ? (
                                    <Check size={11} className="text-emerald-600" />
                                  ) : (
                                    <Copy size={11} />
                                  )}
                                </button>
                              )}
                            </div>

                            <div className="flex items-start gap-1.5 text-[11px] text-slate-500 mt-1">
                              <MapPin size={11} className="text-slate-400 shrink-0 mt-0.5" />
                              <span className="line-clamp-2">
                                {order.addrCity ? `${order.addrCity} · ` : ''}
                                {order.shippingType === 'pudo' && order.branchName
                                  ? `Easybox: ${order.branchName}`
                                  : order.addrLine1 || order.address}
                              </span>
                            </div>
                          </td>

                          {/* Col 3: Items & Exact Preorder Variant */}
                          <td className="py-3.5 px-4 min-w-[260px]">
                            <div className="space-y-1.5">
                              {allItems.map((item: any, idx: number) => {
                                const isPre = isItemSnapshotPreorder(item);
                                const isDig = isDigitalProgramItem(item);
                                const vStr = getItemVariantLabel(item);

                                return (
                                  <div
                                    key={idx}
                                    className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl border ${
                                      isPre
                                        ? 'bg-amber-50/70 border-amber-200/90'
                                        : 'bg-slate-50/80 border-slate-200/70'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                                        {item.image ? (
                                          <Image
                                            src={item.image}
                                            alt={getLocalizedText(item.name) || 'Produs'}
                                            width={28}
                                            height={28}
                                            className="object-contain p-0.5"
                                          />
                                        ) : (
                                          <Package size={13} className="text-slate-400" />
                                        )}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="font-bold text-slate-900 truncate max-w-[170px]">
                                          {getLocalizedText(item.name)}
                                        </div>
                                        <div className="flex items-center flex-wrap gap-1 mt-0.5">
                                          {vStr && (
                                            <span className="text-[10px] font-bold text-slate-600">
                                              {vStr}
                                            </span>
                                          )}
                                          <span
                                            className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider ${
                                              isPre
                                                ? 'bg-amber-200/90 text-amber-950'
                                                : isDig
                                                  ? 'bg-purple-100 text-purple-800'
                                                  : 'bg-emerald-100 text-emerald-800'
                                            }`}
                                          >
                                            {isPre ? 'PRECOMANDĂ' : isDig ? 'DIGITAL' : 'ÎN STOC'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <span className="font-black text-slate-900 shrink-0">
                                      x{item.quantity || 1}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </td>

                          {/* Col 4: Total & Oblio */}
                          <td className="py-3.5 px-4 w-[175px]">
                            <div className="font-black text-sm text-slate-900">{order.total}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-1">
                              {isCod ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                                  <Banknote size={10} /> Ramburs
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                  <CreditCard size={10} /> Card
                                </span>
                              )}
                            </div>

                            <div className="mt-2">
                              {order.oblioInvoice ? (
                                <a
                                  href={order.oblioInvoice.link || order.oblioInvoice.pdfUrl || '#'}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-[10px] font-black transition-colors"
                                >
                                  <FileText size={11} />
                                  <span>{order.oblioInvoice.seriesName} {order.oblioInvoice.number}</span>
                                </a>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleEmitOblio(order.id, order.supabaseId)}
                                  disabled={emittingOblio[targetId] || order.status === 'cancelled'}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  <FileText size={11} />
                                  <span>{emittingOblio[targetId] ? 'Se emite...' : 'Emite Oblio'}</span>
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Col 5: Actions */}
                          <td className="py-3.5 px-4 text-right w-[190px]">
                            <div className="flex items-center justify-end gap-1.5">
                              {!isClosed && (
                                <button
                                  type="button"
                                  onClick={() => openReleaseModal(entry)}
                                  className={`h-8 px-2.5 rounded-lg text-[11px] font-black flex items-center gap-1 transition-colors cursor-pointer ${
                                    entry.catalogStockArrived
                                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                                      : 'bg-amber-500 hover:bg-amber-600 text-white shadow-2xs'
                                  }`}
                                  title="Confirmă stocul și eliberează comanda"
                                >
                                  <ShieldCheck size={13} />
                                  <span>Eliberează</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => openEditShipping(order)}
                                className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                                title="Editează date livrare"
                              >
                                <Pencil size={13} />
                              </button>

                              <button
                                type="button"
                                onClick={() => toggleExpand(order.id)}
                                className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                                title={isExpanded ? 'Restrânge detalii' : 'Detalii complete'}
                              >
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-slate-50/70">
                            <td colSpan={5} className="px-4 py-3 border-t border-slate-100">
                              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                                <div className="space-y-1 text-slate-600">
                                  <div className="flex flex-wrap items-center gap-3">
                                    <span className="flex items-center gap-1">
                                      <Mail size={12} className="text-slate-400" />
                                      <strong>{order.customerEmail}</strong>
                                    </span>
                                    <span>•</span>
                                    <span>
                                      Adresă completă: <strong className="text-slate-900">{order.address}</strong>
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                                    <span>
                                      Subtotal: <strong className="text-slate-800">{order.subtotalAmount ? `${order.subtotalAmount.toFixed(2)} ${order.currency}` : 'N/A'}</strong>
                                    </span>
                                    <span>•</span>
                                    <span>
                                      Transport: <strong className="text-slate-800">{order.shippingAmount ? `${order.shippingAmount.toFixed(2)} ${order.currency}` : 'Gratuit'}</strong>
                                    </span>
                                    {order.discountTotal > 0 && (
                                      <>
                                        <span>•</span>
                                        <span className="text-emerald-700">
                                          Reducere: <strong>-{order.discountTotal.toFixed(2)} {order.currency}</strong>
                                        </span>
                                      </>
                                    )}
                                    {order.giftPackaging && (
                                      <>
                                        <span>•</span>
                                        <span className="inline-flex items-center gap-1 text-pink-700 font-bold">
                                          <Gift size={11} /> Ambalaj Cadou{order.giftMessage ? `: "${order.giftMessage}"` : ''}
                                        </span>
                                      </>
                                    )}
                                    {order.fulfillmentDispatchedAt && (
                                      <>
                                        <span>•</span>
                                        <span className="text-indigo-700 font-bold">
                                          Trimis Fulfillment: {new Date(order.fulfillmentDispatchedAt).toLocaleString('ro-RO')}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const text = `Comandă: ${order.id}\nClient: ${order.customer}\nTelefon: ${order.phone}\nEmail: ${order.customerEmail}\nAdresă: ${order.address}\nTotal: ${order.total}`;
                                      copyToClipboard(text, `full_${order.id}`, 'Date expediere');
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1.5"
                                  >
                                    <Copy size={12} />
                                    <span>Copiază date</span>
                                  </button>

                                  <Link
                                    href={`/admin/orders?search=${encodeURIComponent(order.id)}`}
                                    className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                                  >
                                    <ExternalLink size={12} />
                                    <span>Deschide în Comenzi</span>
                                  </Link>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── MOBILE CARDS (< lg, optimized for 375px zero overflow) ─── */}
          <div className="lg:hidden space-y-3">
            {filteredEntries.map((entry) => {
              const { order, isMixed, isClosed, statusMeta } = entry;
              const isExpanded = expandedOrders.has(order.id);
              const targetId = order.supabaseId || order.id;
              const allItems = Array.isArray(order.items) ? order.items : [];
              const isCod = order.paymentMethod === 'cod';

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden max-w-full"
                >
                  {/* Card Header */}
                  <div className="p-3.5 border-b border-slate-100 space-y-2">
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono text-xs font-black text-slate-900 truncate">{order.id}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(order.id, `m_id_${order.id}`, 'Nr. Comandă')}
                          className="text-slate-400 hover:text-slate-700 p-1 rounded cursor-pointer shrink-0"
                          aria-label="Copiază număr comandă"
                        >
                          {copiedKey === `m_id_${order.id}` ? (
                            <Check size={12} className="text-emerald-600" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                        <span className="text-[11px] font-semibold text-slate-400 truncate">{order.date}</span>
                      </div>
                      <span className="font-mono text-sm font-black text-slate-900 shrink-0">{order.total}</span>
                    </div>

                    {/* Badges Row */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-black ${statusMeta.badgeClass}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotClass}`} />
                        <span>{statusMeta.label}</span>
                      </span>

                      {isMixed && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-black">
                          <Layers size={10} />
                          <span>Comandă Mixtă</span>
                        </span>
                      )}

                      {order.priorityProcessing && !isClosed && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black">
                          <Zap size={10} />
                          <span>Prioritar</span>
                        </span>
                      )}

                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                        isCod
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {isCod ? <Banknote size={10} /> : <CreditCard size={10} />}
                        <span>{isCod ? 'Ramburs' : 'Card'}</span>
                      </span>

                      {order.oblioInvoice && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                          <FileText size={10} />
                          <span>{order.oblioInvoice.seriesName} {order.oblioInvoice.number}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Customer Info + Items */}
                  <div className="p-3.5 space-y-2.5">
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-black text-slate-900 truncate">{order.customer}</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold uppercase shrink-0">
                            {order.addrCountry || 'RO'}
                          </span>
                        </div>
                        {order.phone && order.phone !== 'N/A' && (
                          <div className="flex items-center gap-1 shrink-0">
                            <a
                              href={`tel:${order.phone}`}
                              className="text-amber-700 font-bold text-[11px] flex items-center gap-1"
                            >
                              <Phone size={11} />
                              <span>{order.phone}</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(order.phone, `m_ph_${order.id}`, 'Telefon')}
                              className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                              aria-label="Copiază telefon"
                            >
                              {copiedKey === `m_ph_${order.id}` ? (
                                <Check size={11} className="text-emerald-600" />
                              ) : (
                                <Copy size={11} />
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-start gap-1.5 text-[11px] text-slate-500 min-w-0">
                        <MapPin size={11} className="text-slate-400 shrink-0 mt-0.5" />
                        <span className="break-words min-w-0">
                          {order.shippingType === 'pudo' && order.branchName
                            ? `Easybox: ${order.branchName}${order.addrCity ? ` (${order.addrCity})` : ''}`
                            : order.address}
                        </span>
                      </div>
                    </div>

                    {/* Items List (highlighting preorder vs in-stock) */}
                    <div className="space-y-1.5">
                      {allItems.map((item: any, idx: number) => {
                        const isPre = isItemSnapshotPreorder(item);
                        const isDig = isDigitalProgramItem(item);
                        const vStr = getItemVariantLabel(item);

                        return (
                          <div
                            key={idx}
                            className={`p-2 rounded-xl border flex items-center justify-between gap-2 min-w-0 ${
                              isPre
                                ? 'bg-amber-50/70 border-amber-200'
                                : 'bg-slate-50 border-slate-200/70'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                                {item.image ? (
                                  <Image
                                    src={item.image}
                                    alt={getLocalizedText(item.name) || 'Produs'}
                                    width={32}
                                    height={32}
                                    className="object-contain p-0.5"
                                  />
                                ) : (
                                  <Package size={14} className="text-slate-400" />
                                )}
                              </div>

                              <div className="min-w-0">
                                <div className="text-xs font-black text-slate-900 truncate">
                                  {getLocalizedText(item.name)}
                                </div>
                                <div className="flex items-center flex-wrap gap-1 mt-0.5">
                                  {vStr && (
                                    <span className="text-[10px] font-bold text-slate-600 truncate max-w-[140px]">
                                      {vStr}
                                    </span>
                                  )}
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                                      isPre
                                        ? 'bg-amber-200/90 text-amber-950'
                                        : isDig
                                          ? 'bg-purple-100 text-purple-800'
                                          : 'bg-emerald-100 text-emerald-800'
                                    }`}
                                  >
                                    {isPre ? 'PRECOMANDĂ' : isDig ? 'DIGITAL' : 'ÎN STOC'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="text-xs font-black text-slate-900">x{item.quantity || 1}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Expandable Extended Details */}
                    {isExpanded && (
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2 text-[11px] text-slate-600">
                        <div className="flex items-center justify-between gap-2 min-w-0">
                          <span className="flex items-center gap-1 min-w-0 truncate">
                            <Mail size={11} className="text-slate-400 shrink-0" />
                            <span className="truncate font-semibold">{order.customerEmail}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(order.customerEmail, `m_em_${order.id}`, 'Email')}
                            className="text-slate-500 hover:text-slate-800 font-bold shrink-0 cursor-pointer"
                          >
                            Copiază
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-slate-500">
                          <span>Subtotal: <strong className="text-slate-800">{order.subtotalAmount ? `${order.subtotalAmount.toFixed(2)} ${order.currency}` : 'N/A'}</strong></span>
                          <span>Transport: <strong className="text-slate-800">{order.shippingAmount ? `${order.shippingAmount.toFixed(2)} ${order.currency}` : 'Gratuit'}</strong></span>
                        </div>

                        {order.giftPackaging && (
                          <div className="text-pink-700 font-bold flex items-center gap-1">
                            <Gift size={11} /> Ambalaj Cadou{order.giftMessage ? `: "${order.giftMessage}"` : ''}
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              const text = `Comandă: ${order.id}\nClient: ${order.customer}\nTelefon: ${order.phone}\nEmail: ${order.customerEmail}\nAdresă: ${order.address}\nTotal: ${order.total}`;
                              copyToClipboard(text, `m_full_${order.id}`, 'Date expediere');
                            }}
                            className="flex-1 h-8 px-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Copy size={11} />
                            <span>Copiază date</span>
                          </button>

                          <Link
                            href={`/admin/orders?search=${encodeURIComponent(order.id)}`}
                            className="flex-1 h-8 px-2.5 rounded-lg bg-slate-900 text-white font-bold text-[11px] flex items-center justify-center gap-1"
                          >
                            <ExternalLink size={11} />
                            <span>În Comenzi</span>
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mobile Card Action Footer */}
                  <div className="px-3.5 py-2.5 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {!isClosed && (
                        <button
                          type="button"
                          onClick={() => openReleaseModal(entry)}
                          className={`h-8 px-2.5 rounded-lg text-[11px] font-black flex items-center gap-1 cursor-pointer ${
                            entry.catalogStockArrived
                              ? 'bg-emerald-600 text-white'
                              : 'bg-amber-500 text-white'
                          }`}
                        >
                          <ShieldCheck size={12} />
                          <span>Eliberează</span>
                        </button>
                      )}

                      {order.oblioInvoice ? (
                        <a
                          href={order.oblioInvoice.link || order.oblioInvoice.pdfUrl || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="h-8 px-2.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold flex items-center gap-1"
                        >
                          <FileText size={12} />
                          <span>Factură</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleEmitOblio(order.id, order.supabaseId)}
                          disabled={emittingOblio[targetId] || order.status === 'cancelled'}
                          className="h-8 px-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <FileText size={12} />
                          <span>{emittingOblio[targetId] ? 'Emite...' : 'Oblio'}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => openEditShipping(order)}
                        className="h-8 px-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Pencil size={12} />
                        <span>Editează</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleExpand(order.id)}
                      className="h-8 px-2 rounded-lg text-slate-500 hover:text-slate-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span>{isExpanded ? 'Mai puțin' : 'Detalii'}</span>
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ═══ Safe Stock Release Confirmation Modal ═══ */}
      {releasingEntry && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => !releasingAction && setReleasingEntry(null)}
          />

          <div className="relative w-full max-w-lg max-h-[90dvh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-slate-200 z-10">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
                  <ShieldCheck size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 truncate">
                    Confirmare Eliberare Precomandă
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold truncate">
                    {releasingEntry.order.id} · {releasingEntry.order.customer}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => !releasingAction && setReleasingEntry(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {!releasingEntry.catalogStockArrived && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-black block">Atenție: Varianta apare încă pe Precomandă în catalog</strong>
                    <span className="text-amber-800">
                      Nu elibera comanda către depozit până nu confirmi fizic că lotul a ajuns în stoc.
                    </span>
                  </div>
                </div>
              )}

              {releasingEntry.isMixed && (
                <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-start gap-2.5 text-xs text-indigo-900">
                  <Layers size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-black block">Comandă Mixtă (Precomandă + Stoc)</strong>
                    <span className="text-indigo-800">
                      Această comandă conține și produse din stoc. Toate produsele trebuie expediate împreună în același colet.
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Produse de verificat în depozit
                </div>
                <div className="space-y-1.5">
                  {(releasingEntry.order.items || []).map((item: any, idx: number) => {
                    const isPre = isItemSnapshotPreorder(item);
                    const vStr = getItemVariantLabel(item);
                    return (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                          isPre ? 'bg-amber-50/70 border-amber-200' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-black text-slate-900 truncate">{getLocalizedText(item.name)}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {vStr && <span className="text-[11px] font-bold text-slate-600">{vStr}</span>}
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                                isPre ? 'bg-amber-200 text-amber-950' : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {isPre ? 'PRECOMANDĂ' : 'ÎN STOC'}
                            </span>
                          </div>
                        </div>
                        <span className="font-black text-slate-900 shrink-0">x{item.quantity || 1}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={releaseConfirmedStock}
                  onChange={(e) => setReleaseConfirmedStock(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-emerald-600 rounded cursor-pointer shrink-0"
                />
                <span className="text-xs font-bold text-slate-800 leading-snug">
                  Confirm că produsele din această precomandă au ajuns fizic în stoc și pot fi pregătite pentru expediere.
                </span>
              </label>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  disabled={!releaseConfirmedStock || releasingAction !== null}
                  onClick={() => handleExecuteRelease('processing')}
                  className="w-full h-10 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 size={14} />
                  <span>
                    {releasingAction === 'processing'
                      ? 'Se procesează...'
                      : 'Eliberează în Procesare (Gata de Pregătire)'}
                  </span>
                </button>

                {!releasingEntry.isDispatchedToFulfillment ? (
                  <button
                    type="button"
                    disabled={!releaseConfirmedStock || releasingAction !== null}
                    onClick={() => handleExecuteRelease('processing_and_dispatch')}
                    className="w-full h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Send size={14} />
                    <span>
                      {releasingAction === 'processing_and_dispatch'
                        ? 'Se trimite la fulfillment...'
                        : 'Eliberează & Trimite Email la Fulfillment'}
                    </span>
                  </button>
                ) : (
                  <div className="text-center text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl py-2 px-3">
                    Comanda a fost deja transmisă către fulfillment la{' '}
                    {new Date(releasingEntry.order.fulfillmentDispatchedAt).toLocaleString('ro-RO')}.
                  </div>
                )}

                <button
                  type="button"
                  disabled={!releaseConfirmedStock || releasingAction !== null}
                  onClick={() => handleExecuteRelease('shipped')}
                  className="w-full h-9 px-4 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Truck size={13} />
                  <span>
                    {releasingAction === 'shipped'
                      ? 'Se actualizează...'
                      : 'Marchează direct ca Expediată'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Edit Shipping Modal ═══ */}
      {editingOrder && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => setEditingOrder(null)}
          />

          <div className="relative w-full max-w-lg max-h-[90dvh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-slate-200 z-10">
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">Modifică Date Livrare</h3>
                <p className="text-xs text-slate-500 mt-0.5">Comandă: {editingOrder.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveShipping} className="p-5 sm:p-6 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Prenume
                  </label>
                  <input
                    type="text"
                    value={editForm.customerFirstName}
                    onChange={(e) => setEditForm((f) => ({ ...f, customerFirstName: e.target.value }))}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:bg-white focus:border-amber-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Nume
                  </label>
                  <input
                    type="text"
                    value={editForm.customerLastName}
                    onChange={(e) => setEditForm((f) => ({ ...f, customerLastName: e.target.value }))}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:bg-white focus:border-amber-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={editForm.customerPhone}
                    onChange={(e) => setEditForm((f) => ({ ...f, customerPhone: e.target.value }))}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:bg-white focus:border-amber-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editForm.customerEmail}
                    onChange={(e) => setEditForm((f) => ({ ...f, customerEmail: e.target.value }))}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:bg-white focus:border-amber-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Adresă de livrare
                </label>
                <input
                  type="text"
                  value={editForm.addrLine1}
                  onChange={(e) => setEditForm((f) => ({ ...f, addrLine1: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:bg-white focus:border-amber-500 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Oraș / Sector
                  </label>
                  <input
                    type="text"
                    value={editForm.addrCity}
                    onChange={(e) => setEditForm((f) => ({ ...f, addrCity: e.target.value }))}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:bg-white focus:border-amber-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Cod Poștal
                  </label>
                  <input
                    type="text"
                    value={editForm.addrZip}
                    onChange={(e) => setEditForm((f) => ({ ...f, addrZip: e.target.value }))}
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
