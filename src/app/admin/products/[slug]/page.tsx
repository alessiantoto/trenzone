"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Product } from "@/lib/api";
import { getAdminProductBySlug, updateProductAdmin } from "@/app/actions/admin-products";
import { ArrowLeft, Save, Loader2, ExternalLink } from "lucide-react";
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

  const handleSave = async () => {
    if (!product || !product.id) return;
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
        <div className="flex items-center justify-center py-20 mt-8">
          <Loader2 className="w-8 h-8 animate-spin text-[#e32f8c]" />
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
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-black shrink-0 ${product.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {product.is_active ? 'Activ' : 'Ciornă'}
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
              onClick={handleSave}
              disabled={saving}
              className="min-h-[44px] px-3 sm:px-6 rounded-xl bg-[#e32f8c] text-black font-black text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-[#c41a72] transition-all disabled:opacity-50 shadow-sm cursor-pointer"
            >
              {saving ? <Loader2 size={17} className="animate-spin shrink-0" /> : <Save size={17} className="shrink-0" />}
              <span className="truncate">Salvează Modificările</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 border-b border-slate-200 overflow-x-auto pb-0.5">
          <button
            onClick={() => setActiveTab('general')}
            className={`min-h-[44px] px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-black uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap shrink-0 cursor-pointer ${activeTab === 'general' ? 'border-[#e32f8c] text-[#e32f8c]' : 'border-transparent text-slate-400 hover:text-slate-900'}`}
          >
            Informații Generale
          </button>
          {product.variants && (
            <button
              onClick={() => setActiveTab('variants')}
              className={`min-h-[44px] px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-black uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap shrink-0 cursor-pointer ${activeTab === 'variants' ? 'border-[#e32f8c] text-[#e32f8c]' : 'border-transparent text-slate-400 hover:text-slate-900'}`}
            >
              Variante
            </button>
          )}
          <button
            onClick={() => setActiveTab('images')}
            className={`min-h-[44px] px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-black uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap shrink-0 cursor-pointer ${activeTab === 'images' ? 'border-[#e32f8c] text-[#e32f8c]' : 'border-transparent text-slate-400 hover:text-slate-900'}`}
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
              className="flex-1 h-11 px-4 rounded-xl bg-[#e32f8c] text-black font-black text-sm flex items-center justify-center gap-2 hover:bg-[#c41a72] transition-all disabled:opacity-50 shadow-sm cursor-pointer"
            >
              {saving ? <Loader2 size={17} className="animate-spin shrink-0" /> : <Save size={17} className="shrink-0" />}
              <span>{saving ? 'Se salvează...' : 'Salvează Modificările'}</span>
            </button>
          </div>
        </div>
      </div>
  );
}
