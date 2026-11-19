"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Product } from "@/lib/api";
import { getAdminProductBySlug, updateProductAdmin } from "@/app/actions/admin-products";
import { ArrowLeft, Save, Loader2, ExternalLink, PackageCheck, Clock, Ban, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { GeneralInfoTab } from "../../components/product-editor/GeneralInfoTab";
import { VariantsEditor } from "../../components/product-editor/VariantsEditor";
import { ImageManager } from "../../components/product-editor/ImageManager";
import toast from 'react-hot-toast';

export default function ProductEditorPage() {
  const params = useParams();
  const rawSlug = params?.slug;
  const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;
  const router = useRouter();
  
  const [product, setProduct] = useState<Partial<Product> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'variants' | 'images'>('general');
  const [statusDirty, setStatusDirty] = useState(false);

  useEffect(() => {
    async function load() {
      if (!slug) return;
      try {
        setLoading(true);
        // 1. Fetch via admin API route (consistent with all other admin pages)
        const res = await fetch(`/api/admin/data?action=product&slug=${encodeURIComponent(slug)}`, { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setProduct(json.data);
            return;
          }
        }

        // 2. Fallback to Server Action
        const data = await getAdminProductBySlug(slug);
        if (data) {
          setProduct(data);
        }
      } catch (err) {
        console.error("Error loading product", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  const handleChange = (field: string, value: any) => {
    setProduct(prev => prev ? { ...prev, [field]: value } : null);
  };

  type ProductStockStatus = 'in_stock' | 'preorder' | 'sold_out';

  const applyGlobalStockStatus = (nextStatus: ProductStockStatus) => {
    setProduct(prev => {
      if (!prev) return prev;
      const stripPreorderText = (val: unknown) => {
        if (typeof val !== 'string') return val;
        return val.replace(/\s*\((?:precomand[aă]|pre-?order|preorder)\)\s*/gi, ' ').replace(/\s+/g, ' ').trim();
      };

      const nextVariants = prev.variants?.options
        ? {
            ...prev.variants,
            options: prev.variants.options.map((opt) => {
              const updatedOpt: any = {
                ...opt,
                stock_status: nextStatus,
              };
              if (nextStatus !== 'preorder') {
                if (typeof updatedOpt.badge === 'string' && /(precomand|pre-?order|preorder)/i.test(updatedOpt.badge)) {
                  delete updatedOpt.badge;
                }
                if (updatedOpt.name && typeof updatedOpt.name === 'object') {
                  updatedOpt.name = {
                    ...updatedOpt.name,
                    ro: stripPreorderText(updatedOpt.name.ro),
                    en: stripPreorderText(updatedOpt.name.en),
                  };
                } else if (typeof updatedOpt.name === 'string') {
                  updatedOpt.name = stripPreorderText(updatedOpt.name);
                }
              }
              return updatedOpt;
            }),
          }
        : prev.variants;

      const prevMeta = (prev as any).metadata && typeof (prev as any).metadata === 'object'
        ? { ...(prev as any).metadata }
        : {};
      const nextMeta = {
        ...prevMeta,
        is_preorder: nextStatus === 'preorder',
        stock_status: nextStatus,
      };

      const isDigital = Boolean(prev.is_digital || (prev as any).specs_summary?.is_digital);
      const nextStockQty =
        nextStatus === 'in_stock' && !isDigital && Number(prev.stock_quantity || 0) <= 0
          ? 50
          : prev.stock_quantity;

      return {
        ...prev,
        stock_status: nextStatus,
        is_preorder: nextStatus === 'preorder',
        stock_quantity: nextStockQty,
        ...(nextVariants ? { variants: nextVariants } : {}),
        metadata: nextMeta,
      } as Partial<Product>;
    });
    setStatusDirty(true);
  };

  const handleToggleActive = () => {
    setProduct(prev => prev ? { ...prev, is_active: prev.is_active === false ? true : false } : prev);
    setStatusDirty(true);
  };

  const handleSave = async () => {
    if (saving || !product || !product.id) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/data?action=update-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setStatusDirty(false);
          toast.success("Produsul a fost actualizat cu succes!");
          if (product.slug && product.slug !== slug) {
            router.push(`/admin/products/${product.slug}`);
          } else {
            router.refresh();
          }
          return;
        }
      }

      await updateProductAdmin(product as any);
      setStatusDirty(false);
      toast.success("Produsul a fost actualizat cu succes!");
      if (product.slug && product.slug !== slug) {
        router.push(`/admin/products/${product.slug}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      toast.error("A apărut o eroare la salvarea produsului.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-5 sm:space-y-6 pb-8 sm:pb-16 mt-1 sm:mt-4 animate-pulse">
        {/* Title Bar Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 shrink-0" />
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="h-7 w-52 sm:w-64 rounded-lg bg-slate-200" />
                <div className="h-5 w-14 rounded-full bg-slate-200/80" />
              </div>
              <div className="h-3.5 w-36 rounded bg-slate-200/70" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="h-11 w-full sm:w-36 rounded-xl bg-white border border-slate-200" />
            <div className="h-11 w-full sm:w-48 rounded-xl bg-slate-200" />
          </div>
        </div>

        {/* Tab Pills Skeleton */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <div className="h-9 w-36 rounded-xl bg-slate-200" />
          <div className="h-9 w-24 rounded-xl bg-slate-100" />
          <div className="h-9 w-24 rounded-xl bg-slate-100" />
        </div>

        {/* Main Editor Card Skeleton */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-100 space-y-7">
          {/* Delivery Toggle Card Skeleton */}
          <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1.5">
              <div className="h-3.5 w-44 rounded bg-slate-200" />
              <div className="h-3 w-72 max-w-full rounded bg-slate-100" />
            </div>
            <div className="h-10 w-full sm:w-80 rounded-xl bg-slate-200/70 shrink-0" />
          </div>

          {/* Cover Card Skeleton */}
          <div className="p-4 bg-slate-50/60 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-24 h-24 rounded-2xl bg-slate-200 shrink-0" />
            <div className="flex-1 space-y-2.5">
              <div className="h-4 w-40 rounded bg-slate-200" />
              <div className="h-3 w-64 max-w-full rounded bg-slate-100" />
              <div className="h-9 w-40 rounded-xl bg-slate-200" />
            </div>
          </div>

          {/* Form Field Blocks Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-28 rounded bg-slate-200" />
                <div className="h-11 w-full rounded-xl bg-slate-100 border border-slate-200/70" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div className="space-y-2">
              <div className="h-3 w-32 rounded bg-slate-200" />
              <div className="h-28 w-full rounded-xl bg-slate-100 border border-slate-200/70" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-32 rounded bg-slate-200" />
              <div className="h-28 w-full rounded-xl bg-slate-100 border border-slate-200/70" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
        <div className="py-20 mt-8 text-center bg-white rounded-3xl border border-slate-100 max-w-lg mx-auto shadow-sm">
          <p className="text-slate-500 font-bold mb-4">Produsul nu a fost găsit.</p>
          <Link href="/admin/products" className="text-[#e32f8c] font-black hover:underline">
            Înapoi la produse
          </Link>
        </div>
    );
  }

  const productName = typeof product.name === 'object' ? product.name.ro : product.name;

  const variantOptions = product.variants?.options || [];
  const variantStatusCounts = variantOptions.reduce(
    (acc, opt) => {
      const st = opt.stock_status || 'in_stock';
      if (st === 'preorder') acc.preorder += 1;
      else if (st === 'sold_out') acc.sold_out += 1;
      else acc.in_stock += 1;
      return acc;
    },
    { in_stock: 0, preorder: 0, sold_out: 0 }
  );

  const resolvedGlobalStatus: 'in_stock' | 'preorder' | 'sold_out' | 'mixed' = (() => {
    if (variantOptions.length > 0) {
      if (variantStatusCounts.in_stock === variantOptions.length) return 'in_stock';
      if (variantStatusCounts.preorder === variantOptions.length) return 'preorder';
      if (variantStatusCounts.sold_out === variantOptions.length) return 'sold_out';
      return 'mixed';
    }
    const metaStatus = (product as any).metadata?.stock_status || (product as any).stock_status;
    if (metaStatus === 'sold_out') return 'sold_out';
    if (metaStatus === 'preorder' || (product as any).metadata?.is_preorder === true) return 'preorder';
    return 'in_stock';
  })();

  return (
      <div className="max-w-5xl mx-auto space-y-5 sm:space-y-6 pb-8 sm:pb-16 mt-1 sm:mt-4">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
            <Link 
              href="/admin/products"
              className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm shrink-0"
              title="Înapoi la lista de produse"
            >
              <ArrowLeft size={20} />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 break-words leading-tight">{productName}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-black shrink-0 ${product.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {product.is_active !== false ? 'Activ' : 'Ciornă'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-mono truncate mt-0.5">/{product.slug}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 sm:gap-3 shrink-0">
            <a
              href={`/ro/product/${product.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] px-3 sm:px-4 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
              title="Deschide în magazin"
            >
              <ExternalLink size={15} className="shrink-0" />
              <span className="truncate">Vezi în Magazin</span>
            </a>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="min-h-[44px] px-3 sm:px-6 rounded-xl bg-[#e32f8c] text-black font-black text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-[#c41a72] transition-all active:scale-[0.98] disabled:opacity-50 shadow-sm cursor-pointer"
            >
              {saving ? <Loader2 size={17} className="animate-spin shrink-0" /> : <Save size={17} className="shrink-0" />}
              <span className="truncate">{saving ? 'Se salvează...' : 'Salvează Modificările'}</span>
            </button>
          </div>
        </div>

        {/* TOP QUICK STATUS & AVAILABILITY BAR (Always visible right on Edit) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                Status Disponibilitate
              </span>
              {resolvedGlobalStatus === 'in_stock' && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-700">
                  În Stoc
                </span>
              )}
              {resolvedGlobalStatus === 'preorder' && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800">
                  Precomandă
                </span>
              )}
              {resolvedGlobalStatus === 'sold_out' && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-700">
                  Stoc Epuizat
                </span>
              )}
              {resolvedGlobalStatus === 'mixed' && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-700">
                  Mixt ({variantStatusCounts.in_stock} stoc · {variantStatusCounts.preorder} precomandă · {variantStatusCounts.sold_out} epuizat)
                </span>
              )}
              {statusDirty && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-[#e32f8c]/15 text-[#c41a72]">
                  Nesalvat
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
              {variantOptions.length > 0
                ? `Schimbă rapid statusul pentru toate cele ${variantOptions.length} variante (sau individual din tab-ul Variante).`
                : 'Setează rapid dacă produsul este disponibil în stoc, pe precomandă sau epuizat.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="grid grid-cols-3 sm:inline-flex bg-slate-100 p-1 rounded-xl gap-1 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => applyGlobalStockStatus('in_stock')}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  resolvedGlobalStatus === 'in_stock'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <PackageCheck size={14} className="shrink-0" />
                <span>În Stoc</span>
              </button>
              <button
                type="button"
                onClick={() => applyGlobalStockStatus('preorder')}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  resolvedGlobalStatus === 'preorder'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Clock size={14} className="shrink-0" />
                <span>Precomandă</span>
              </button>
              <button
                type="button"
                onClick={() => applyGlobalStockStatus('sold_out')}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  resolvedGlobalStatus === 'sold_out'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Ban size={14} className="shrink-0" />
                <span>Epuizat</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleToggleActive}
              className={`min-h-[40px] px-3.5 py-2 rounded-xl border text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                product.is_active !== false
                  ? 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  : 'bg-slate-900 border-slate-900 text-white'
              }`}
              title="Comută vizibilitatea produsului în magazin"
            >
              {product.is_active !== false ? <Eye size={14} /> : <EyeOff size={14} />}
              <span>{product.is_active !== false ? 'Vizibil' : 'Ascuns'}</span>
            </button>

            {statusDirty && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#e32f8c] hover:bg-[#c41a72] text-black text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                <span>Salvează</span>
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 border-b border-slate-200 overflow-x-auto pb-0.5">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`min-h-[44px] px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-black uppercase tracking-wider transition-all active:scale-[0.98] border-b-2 whitespace-nowrap shrink-0 cursor-pointer ${activeTab === 'general' ? 'border-[#e32f8c] text-[#e32f8c]' : 'border-transparent text-slate-400 hover:text-slate-900'}`}
          >
            Informații Generale
          </button>
          {product.variants && (
            <button
              type="button"
              onClick={() => setActiveTab('variants')}
              className={`min-h-[44px] px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-black uppercase tracking-wider transition-all active:scale-[0.98] border-b-2 whitespace-nowrap shrink-0 cursor-pointer ${activeTab === 'variants' ? 'border-[#e32f8c] text-[#e32f8c]' : 'border-transparent text-slate-400 hover:text-slate-900'}`}
            >
              Variante
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('images')}
            className={`min-h-[44px] px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-black uppercase tracking-wider transition-all active:scale-[0.98] border-b-2 whitespace-nowrap shrink-0 cursor-pointer ${activeTab === 'images' ? 'border-[#e32f8c] text-[#e32f8c]' : 'border-transparent text-slate-400 hover:text-slate-900'}`}
          >
            Imagini
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-100">
          {activeTab === 'general' && (
            <GeneralInfoTab product={product} onChange={handleChange} />
          )}
          
          {activeTab === 'variants' && product.variants && (
            <VariantsEditor product={product} onChange={handleChange} />
          )}

          {activeTab === 'images' && (
            <ImageManager product={product} onChange={handleChange} />
          )}
        </div>

        {/* Mobile Sticky Bottom Save Bar */}
        <div className="sm:hidden sticky bottom-2 z-20 pt-1">
          <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-2 shadow-lg flex items-center gap-2">
            <a
              href={`/ro/product/${product.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="h-11 w-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 hover:bg-slate-200 transition-colors"
              title="Vezi în magazin"
              aria-label="Vezi în magazin"
            >
              <ExternalLink size={17} />
            </a>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 h-11 px-4 rounded-xl bg-[#e32f8c] text-black font-black text-sm flex items-center justify-center gap-2 hover:bg-[#c41a72] transition-all active:scale-[0.98] disabled:opacity-50 shadow-sm cursor-pointer"
            >
              {saving ? <Loader2 size={17} className="animate-spin shrink-0" /> : <Save size={17} className="shrink-0" />}
              <span>{saving ? 'Se salvează...' : 'Salvează Modificările'}</span>
            </button>
          </div>
        </div>
      </div>
  );
}
