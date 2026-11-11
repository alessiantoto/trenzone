"use client";

import { getOptimizedImageUrl } from '@/lib/utils/imageProxy';
import { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, Package, Image as ImageIcon, X, Save, Trash2, ChevronDown, Check, Search, ExternalLink, Edit, Sparkles, Eye } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { deleteProductServer } from '@/app/actions/products';
import { toggleProductStatus } from '@/app/actions/admin-products';
import { useRouter } from 'next/navigation';
import ImageCropper from '@/components/ui/ImageCropper';
import toast from 'react-hot-toast';

function VariantRow({ v, variants, setVariants, setCroppingImage, variantType }: { v: any, variants: any[], setVariants: any, setCroppingImage: any, variantType?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const statusOptions = [
    { value: 'in_stock', label: 'În stoc' },
    { value: 'sold_out', label: 'Sold out' },
    { value: 'best_seller', label: 'Best Seller' }
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updateField = (key: string, value: any) => {
    setVariants(variants.map(va => va.id === v.id ? { ...va, [key]: value } : va));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if(e.target.files && e.target.files[0]) {
      const newUrl = URL.createObjectURL(e.target.files[0]);
      setCroppingImage({ src: newUrl, targetId: v.id });
    }
  };

  const selectedStatus = statusOptions.find(o => o.value === v.status) || statusOptions[0];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl p-3">
      {/* Image Upload */}
      {variantType !== 'size' && (
        <label className="relative group w-12 h-12 rounded-lg bg-white overflow-hidden border border-slate-200 shrink-0 cursor-pointer block">
          {v.image ? (
            <div className="w-12 h-12 relative rounded-lg bg-slate-50 border border-slate-200 shrink-0 overflow-hidden">
              <Image src={getOptimizedImageUrl(v.image) || '/placeholder.png'} alt={v.name} fill sizes="48px" className="object-cover group-hover:opacity-50 transition-opacity" />
            </div>
          ) : (
            <ImageIcon className="text-slate-300 w-full h-full p-2 group-hover:opacity-50 transition-opacity" />
          )}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[8px] font-black uppercase text-slate-900 bg-white/90 px-1 py-0.5 rounded shadow-sm">Foto</span>
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
        </label>
      )}

      {/* Inputs */}
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
        <input 
          type="text" 
          value={v.name} 
          onChange={(e) => updateField('name', e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#e32f8c]" 
          placeholder="Nume variantă..."
        />
        <input 
          type="text" 
          value={v.price || ''} 
          onChange={(e) => updateField('price', e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#e32f8c]" 
          placeholder="Preț (opțional)..."
        />
        <input 
          type="number" 
          value={v.stock === undefined || v.stock === '' ? '' : v.stock} 
          onChange={(e) => updateField('stock', e.target.value === '' ? '' : parseInt(e.target.value))}
          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#e32f8c]" 
          placeholder="Stoc (opțional)"
        />
      </div>
      
      {/* Modern Dropdown */}
      <div className="relative w-full sm:w-36 shrink-0" ref={dropdownRef}>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 hover:border-[#e32f8c] transition-colors focus:outline-none focus:border-[#e32f8c]"
        >
          {selectedStatus.label}
          <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <div className="absolute top-full right-0 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-20 py-1">
            {statusOptions.map(option => (
              <button
                key={option.value}
                onClick={() => { updateField('status', option.value); setIsOpen(false); }}
                className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-slate-50 flex items-center justify-between transition-colors text-slate-700 hover:text-[#e32f8c]"
              >
                {option.label}
                {v.status === option.value && <Check size={12} className="text-[#e32f8c]" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Color Picker for Flavors */}
      {variantType !== 'size' && (
        <label 
          className="relative w-10 h-10 shrink-0 rounded-lg border border-slate-200 flex items-center justify-center cursor-pointer overflow-hidden transition-colors hover:border-[#e32f8c]"
          style={{ backgroundColor: v.color || '#e2e8f0' }}
        >
          <input 
            type="color" 
            value={v.color || '#e2e8f0'}
            onChange={(e) => updateField("color", e.target.value)}
            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
          />
        </label>
      )}

      <button 
        onClick={() => setVariants(variants.filter((va: any) => va.id !== v.id))}
        className="p-2 w-full sm:w-auto flex justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
        title="Șterge varianta"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

export default function ProductsPage() {
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [variants, setVariants] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft'>('all');
  const [croppingImage, setCroppingImage] = useState<{ src: string, targetId: string | 'main' } | null>(null);
  
  const [productToDelete, setProductToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  
  const [isVariantTypeDropdownOpen, setIsVariantTypeDropdownOpen] = useState(false);
  const variantTypeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
      if (variantTypeDropdownRef.current && !variantTypeDropdownRef.current.contains(event.target as Node)) {
        setIsVariantTypeDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const productStatusOptions = [
    { value: 'active', label: 'Activ (Publicat)' },
    { value: 'draft', label: 'Ciornă (Ascuns)' }
  ];
  const variantTypeOptions = [
    { value: 'size', label: 'Mărimi (S, M, L...)' },
    { value: 'flavor', label: 'Culori' }
  ];

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/data?action=products', { cache: 'no-store' });
      const json = await res.json();
      const data = json.data || [];
      const formatted = data.map((p: any) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        image: p.image,
        badge: p.badge,
        status: p.is_active ? 'active' : 'draft',
        is_active: p.is_active,
        inventory: p.stock_quantity,
        price: `${p.price} RON`,
        variants: p.variants?.options?.length || 0,
        rawVariants: p.variants?.options || [],
        variant_type: p.variants?.type || 'flavor'
      }));
      setProducts(formatted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const handleToggleStatus = async (e: React.MouseEvent, product: any) => {
    e.stopPropagation();
    const nextActive = !product.is_active;
    // Optimistic UI update
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_active: nextActive, status: nextActive ? 'active' : 'draft' } : p));
    try {
      const res = await toggleProductStatus(product.id, nextActive);
      if (res.success) {
        toast.success(nextActive ? `Produsul "${product.name}" este acum Activ!` : `Produsul "${product.name}" este acum Ciornă.`);
      } else {
        toast.error("Eroare la schimbarea statusului.");
        fetchProducts();
      }
    } catch (err) {
      toast.error("A apărut o eroare neașteptată.");
      fetchProducts();
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const pName = typeof product.name === 'object' ? (product.name.ro || product.name.en || '') : (product.name || '');
      const matchesSearch = pName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (product.slug || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (product.badge || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [products, searchQuery, statusFilter]);

  const activeCount = useMemo(() => products.filter(p => p.is_active).length, [products]);
  const draftCount = useMemo(() => products.filter(p => !p.is_active).length, [products]);

  const handleSave = async () => {
    if (!selectedProduct) return;
    setIsSaving(true);
    try {
      // Import the server action at the top (already imported, but we'll add saveProductServer)
      const { saveProductServer } = await import('@/app/actions/products');
      
      const formData = new FormData();
      
      // Clean product object before sending
      const cleanProduct = { ...selectedProduct };
      delete cleanProduct._newImageBlob;
      
      formData.append('product', JSON.stringify(cleanProduct));
      
      const cleanVariants = variants.map(v => {
        const { _newImageBlob, ...rest } = v;
        return rest;
      });
      formData.append('variants', JSON.stringify(cleanVariants));
      
      if (selectedProduct._newImageBlob) {
        formData.append('mainImage', selectedProduct._newImageBlob, 'main.jpg');
      }

      variants.forEach(v => {
        if (v._newImageBlob) {
          formData.append(`variantImage_${v.id}`, v._newImageBlob, `variant_${v.id}.jpg`);
        }
      });

      const res = await saveProductServer(formData);
      if (res.success) {
        setSelectedProduct(null);
        fetchProducts();
        toast.success("Produs salvat cu succes!");
        if (res.slug) {
          router.push(`/admin/products/${res.slug}`);
        }
      } else {
        toast.error("Eroare la salvare: " + res.error);
      }
    } catch (err) {
      console.error(err);
      toast.error("A apărut o eroare la salvare.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectProduct = (product: any) => {
    router.push(`/admin/products/${product.slug}`);
    
    if (product.rawVariants && product.rawVariants.length > 0) {
      setVariants(product.rawVariants);
    } else {
      setVariants([]);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, product: any) => {
    e.stopPropagation();
    setProductToDelete(product);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteProductServer(productToDelete.id);
      if (res.success) {
        // Optimistically remove from state
        setProducts(prev => prev.filter(p => p.id !== productToDelete.id));
        toast.success("Produsul a fost șters cu succes!");
      } else {
        toast.error("A apărut o eroare la ștergerea produsului.");
      }
    } catch (error) {
      console.error(error);
      toast.error("A apărut o eroare neașteptată.");
    } finally {
      setIsDeleting(false);
      setProductToDelete(null);
    }
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-700 pb-12 text-slate-900 max-w-6xl mx-auto space-y-6">
      
      {/* 🏁 HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl tracking-tight font-black text-slate-900">Produse</h1>
          <p className="text-sm text-slate-500 mt-1">Gestionează inventarul, prețurile, variantele și vizibilitatea în magazin.</p>
        </div>
        <button 
          onClick={() => setSelectedProduct({ id: 'nou', name: '', price: '0', inventory: 0, status: 'draft', image: null, variant_type: 'flavor' })}
          className="h-11 px-5 bg-[#e32f8c] text-black rounded-xl text-sm font-black hover:bg-[#c41a72] transition-all flex items-center gap-2 shadow-sm shrink-0"
        >
          <Plus size={18} /> Adaugă Produs Nou
        </button>
      </div>

      {/* 🔍 SEARCH & FILTERS BAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Caută după nume, slug sau insignă..."
            className="w-full h-10 pl-10 pr-9 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#e32f8c]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl shrink-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              statusFilter === 'all' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Toate ({products.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
              statusFilter === 'active' 
                ? 'bg-white text-green-700 shadow-sm' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Active ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter('draft')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
              statusFilter === 'draft' 
                ? 'bg-white text-slate-700 shadow-sm' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            Ciorne ({draftCount})
          </button>
        </div>
      </div>

      {/* 📋 PRODUCTS TABLE CONTAINER */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">

        {/* 📱 MOBILE VIEW (Cards) */}
        <div className="md:hidden flex flex-col divide-y divide-slate-100">
          {filteredProducts.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">Nu au fost găsite produse.</div>
          ) : (
            filteredProducts.map((product) => (
              <div 
                key={product.id} 
                onClick={() => handleSelectProduct(product)} 
                className="p-4 flex flex-col gap-3 bg-white hover:bg-slate-50 transition-colors cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                    {product.image ? (
                      <img src={getOptimizedImageUrl(product.image)} alt={product.name} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    ) : (
                      <ImageIcon className="text-slate-300" size={20} />
                    )}
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-bold text-slate-900 leading-tight group-hover:text-[#e32f8c] transition-colors">{product.name}</span>
                      {product.badge && (
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#e32f8c]/10 text-[#e32f8c] border border-[#e32f8c]/20">
                          {product.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 font-medium mt-0.5">/{product.slug}</span>
                    <span className="text-xs text-slate-500 mt-1">{product.variants > 0 ? `${product.variants} variante` : 'Produs simplu'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleToggleStatus(e, product)}
                      className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                        product.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      title="Apasă pentru a comuta statusul"
                    >
                      {product.is_active ? '● Activ' : '○ Ciornă'}
                    </button>
                    <span className={`text-xs font-bold ${product.inventory > 10 ? 'text-slate-700' : product.inventory > 0 ? 'text-orange-500' : 'text-red-500'}`}>
                      {product.inventory} buc.
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-black text-slate-900 mr-2">{product.price}</span>
                    <a
                      href={`/ro/product/${product.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Vezi în Magazin"
                    >
                      <ExternalLink size={16} />
                    </a>
                    <button 
                      onClick={(e) => handleDeleteClick(e, product)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Șterge produs"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 💻 DESKTOP VIEW */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">Produs</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">Status Vizibilitate</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">Inventar</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">Preț</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider text-right">Acțiuni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 text-sm font-medium">
                    Nu a fost găsit niciun produs conform filtrelor selectate.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr 
                    key={product.id} 
                    onClick={() => handleSelectProduct(product)} 
                    className="hover:bg-slate-50/90 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                          {product.image ? (
                            <img src={getOptimizedImageUrl(product.image)} alt={product.name} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                          ) : (
                            <ImageIcon className="text-slate-300" size={20} />
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-black text-slate-900 group-hover:text-[#e32f8c] transition-colors">
                              {product.name}
                            </span>
                            {product.badge && (
                              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#e32f8c]/10 text-[#e32f8c] border border-[#e32f8c]/20">
                                {product.badge}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400 font-medium mt-0.5">/{product.slug}</span>
                          <span className="text-xs text-slate-500 mt-0.5">{product.variants > 0 ? `${product.variants} variante configurate` : 'Produs simplu'}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <button
                        onClick={(e) => handleToggleStatus(e, product)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all shadow-sm ${
                          product.is_active 
                            ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                        }`}
                        title="Click pentru a comuta statusul (Activ / Ciornă)"
                      >
                        <span className={`w-2 h-2 rounded-full ${product.is_active ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`}></span>
                        {product.is_active ? 'Activ' : 'Ciornă'}
                      </button>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`text-sm font-bold ${product.inventory > 10 ? 'text-slate-700' : product.inventory > 0 ? 'text-orange-500' : 'text-red-500'}`}>
                        {product.inventory} în stoc
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className="text-sm font-black text-slate-900">{product.price}</span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/admin/products/${product.slug}`}
                          className="h-9 px-3 rounded-lg bg-slate-100 hover:bg-[#e32f8c] hover:text-black text-slate-700 text-xs font-black flex items-center gap-1.5 transition-colors shadow-sm"
                          title="Editează produsul complet"
                        >
                          <Edit size={14} /> Editează
                        </Link>
                        <a
                          href={`/ro/product/${product.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-9 px-3 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                          title="Previzualizează pe site"
                        >
                          <ExternalLink size={14} /> Vezi
                        </a>
                        <button 
                          onClick={(e) => handleDeleteClick(e, product)}
                          className="h-9 w-9 rounded-lg inline-flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Șterge produs"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🛠️ EDIT MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setSelectedProduct(null)} />
          <div className="relative bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 custom-scrollbar">
            <div className="p-5 md:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg md:text-xl font-black text-slate-900">Editare Produs</h2>
              <button onClick={() => setSelectedProduct(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200/50 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors">
                <X size={16} />
              </button>
            </div>
            
            <div className="p-5 md:p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <label className="relative group w-20 h-20 rounded-2xl bg-slate-100 overflow-hidden border border-slate-200 shrink-0 cursor-pointer block">
                   {selectedProduct.image ? (
                     <img src={getOptimizedImageUrl(selectedProduct.image)} alt={selectedProduct.name} className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" />
                   ) : (
                     <ImageIcon className="text-slate-300 w-full h-full p-4 group-hover:opacity-50 transition-opacity" />
                   )}
                   <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 bg-white/90 px-2 py-1 rounded-md shadow-sm">Schimbă</span>
                   </div>
                   <input 
                     type="file" 
                     accept="image/*" 
                     className="hidden" 
                     onChange={(e) => {
                       if(e.target.files && e.target.files[0]) {
                         setCroppingImage({ src: URL.createObjectURL(e.target.files[0]), targetId: 'main' });
                       }
                     }} 
                   />
                </label>
                <div className="flex-1 w-full space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nume Produs</label>
                    <input 
                      type="text" 
                      value={selectedProduct.name} 
                      onChange={(e) => setSelectedProduct({...selectedProduct, name: e.target.value})}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#e32f8c] shadow-sm" 
                    />
                  </div>
                  <p className="text-xs text-slate-500">ID: {selectedProduct.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={`space-y-2 ${selectedProduct.variant_type === 'size' ? 'col-span-2' : ''}`}>
                  <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider">Preț (RON)</label>
                  <input 
                    type="text" 
                    value={selectedProduct.price.replace(' RON', '')} 
                    onChange={(e) => setSelectedProduct({...selectedProduct, price: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#e32f8c] shadow-sm" 
                  />
                </div>
                {selectedProduct.variant_type !== 'size' && (
                  <div className="space-y-2">
                    <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider">Inventar Total</label>
                    <input 
                      type="number" 
                      value={selectedProduct.inventory} 
                      onChange={(e) => setSelectedProduct({...selectedProduct, inventory: parseInt(e.target.value) || 0})}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#e32f8c] shadow-sm" 
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider">Status Produs</label>
                  <div className="relative w-full" ref={statusDropdownRef}>
                    <button 
                      onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                      className="w-full flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:border-[#e32f8c] transition-colors focus:outline-none focus:border-[#e32f8c] shadow-sm"
                    >
                      {productStatusOptions.find(o => o.value === selectedProduct.status)?.label || 'Alege...'}
                      <ChevronDown size={16} className={`transition-transform duration-200 ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isStatusDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-30 py-1">
                        {productStatusOptions.map(option => (
                          <button
                            key={option.value}
                            onClick={() => { setSelectedProduct({...selectedProduct, status: option.value}); setIsStatusDropdownOpen(false); }}
                            className="w-full text-left px-4 py-2 text-sm font-bold hover:bg-slate-50 flex items-center justify-between transition-colors text-slate-700 hover:text-[#e32f8c]"
                          >
                            {option.label}
                            {selectedProduct.status === option.value && <Check size={14} className="text-[#e32f8c]" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider">Tip Variante</label>
                  <div className="relative w-full" ref={variantTypeDropdownRef}>
                    <button 
                      onClick={() => setIsVariantTypeDropdownOpen(!isVariantTypeDropdownOpen)}
                      className="w-full flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:border-[#e32f8c] transition-colors focus:outline-none focus:border-[#e32f8c] shadow-sm"
                    >
                      {variantTypeOptions.find(o => o.value === (selectedProduct.variant_type || 'size'))?.label || 'Alege...'}
                      <ChevronDown size={16} className={`transition-transform duration-200 ${isVariantTypeDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isVariantTypeDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-30 py-1">
                        {variantTypeOptions.map(option => (
                          <button
                            key={option.value}
                            onClick={() => { setSelectedProduct({...selectedProduct, variant_type: option.value}); setIsVariantTypeDropdownOpen(false); }}
                            className="w-full text-left px-4 py-2 text-sm font-bold hover:bg-slate-50 flex items-center justify-between transition-colors text-slate-700 hover:text-[#e32f8c]"
                          >
                            {option.label}
                            {(selectedProduct.variant_type || 'size') === option.value && <Check size={14} className="text-[#e32f8c]" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 🧩 VARIANTS SECTION */}
              <div className="pt-6 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-wider">Variante Produs</h4>
                  <button 
                    onClick={() => setVariants([...variants, { id: Date.now().toString(), name: '', image: null, price: '', stock: '', status: 'in_stock' }])}
                    className="text-[10px] font-bold uppercase tracking-wider text-[#e32f8c] hover:text-[#c41a72] flex items-center gap-1 bg-[#e32f8c]/10 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Plus size={14} /> Adaugă Variantă
                  </button>
                </div>
                
                <div className="space-y-3">
                  {variants.map(v => (
                    <VariantRow key={v.id} v={v} variants={variants} setVariants={setVariants} setCroppingImage={setCroppingImage} variantType={selectedProduct.variant_type || 'size'} />
                  ))}
                  {variants.length === 0 && (
                    <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-xl">
                      <p className="text-xs text-slate-400 font-bold">Acest produs nu are nicio variantă.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 md:p-6 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-3">
              <button 
                onClick={handleSave} 
                disabled={isSaving}
                className="w-full h-12 bg-[#e32f8c] text-black rounded-xl font-bold hover:bg-[#c41a72] transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isSaving ? 'Se salvează...' : <><Save size={18} /> Salvează Modificările</>}
              </button>
              <button 
                onClick={() => { setProductToDelete(selectedProduct); setSelectedProduct(null); }} 
                className="w-full h-12 bg-white border border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-50 hover:border-red-300 transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Trash2 size={18} /> Șterge Produsul
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🗑️ DELETE CONFIRMATION MODAL */}
      {productToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => !isDeleting && setProductToDelete(null)} />
          <div className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="mx-auto w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">Ștergi acest produs?</h3>
            <p className="text-sm text-slate-500 mb-6">
              Ești sigur că vrei să ștergi produsul <strong className="text-slate-800">{productToDelete.name}</strong>? Această acțiune nu poate fi anulată.
            </p>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setProductToDelete(null)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                Anulează
              </button>
              <button 
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? 'Se șterge...' : 'Da, Șterge'}
              </button>
            </div>
          </div>
        </div>
      )}

      {croppingImage && (
        <ImageCropper
          imageSrc={croppingImage.src}
          aspectRatio={1}
          onCropComplete={(blob) => {
            const url = URL.createObjectURL(blob);
            if (croppingImage.targetId === 'main') {
              setSelectedProduct({ ...selectedProduct, image: url, _newImageBlob: blob });
            } else {
              setVariants(variants.map(va => va.id === croppingImage.targetId ? { ...va, image: url, _newImageBlob: blob } : va));
            }
            setCroppingImage(null);
          }}
          onCancel={() => setCroppingImage(null)}
        />
      )}
    </div>
  );
}
