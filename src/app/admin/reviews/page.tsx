"use client";

import { getOptimizedImageUrl } from '@/lib/utils/imageProxy';
import { useEffect, useState, useMemo } from 'react';
import { 
  Star, 
  MessageSquare, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Plus, 
  X, 
  Package, 
  Image as ImageIcon, 
  ChevronDown, 
  ChevronLeft,
  ChevronRight,
  Maximize2, 
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  LayoutGrid,
  Table as TableIcon,
  Check,
  Clock,
  User,
  Pencil,
  Globe,
  Upload
} from 'lucide-react';
import { Review } from '@/lib/api';
import { extractReviewImages } from '@/lib/utils/reviews';
import {
  updateReviewStatus,
  deleteReview,
  addReview,
  updateReviewAdmin,
  uploadReviewImageAdmin,
} from '@/app/actions/admin-reviews';
import toast from 'react-hot-toast';

const GALLERY_REVIEW_PHOTOS = [
  { path: '/images/reviews/review_1.jpeg', label: 'X10 Sală + Săculeț' },
  { path: '/images/reviews/review_2.jpeg', label: 'X10 White/Black (Umeri)' },
  { path: '/images/reviews/review_3.PNG', label: 'X10 Săculeț Mașină' },
  { path: '/images/reviews/review_4.PNG', label: 'X10 Purple Camo (Braț)' },
  { path: '/images/reviews/review_5.png', label: 'X10 White/Black (Braț)' },
  { path: '/images/reviews/review_6.PNG', label: 'X10 Purple + Săculeț' },
];

interface ReviewFormState {
  product_id: string;
  customer_name: string;
  rating: number;
  status: 'approved' | 'pending' | 'rejected';
  comment_ro: string;
  comment_en: string;
  item_type_ro: string;
  item_type_en: string;
  images: string[];
}

export default function ReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<(Review & { product: { name: string, slug: string, image: string } })[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'with_photos'>('all');
  const [ratingFilter, setRatingFilter] = useState<'all' | '5' | '4' | 'low'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Desktop view toggle: 'cards' or 'table'
  const [desktopViewMode, setDesktopViewMode] = useState<'cards' | 'table'>('cards');

  // Multi-photo Lightbox Modal state
  const [lightbox, setLightbox] = useState<{
    images: string[];
    currentIndex: number;
    customerName: string;
    productName: string;
  } | null>(null);

  // Delete confirmation modal state
  const [reviewToDelete, setReviewToDelete] = useState<any | null>(null);
  const [isDeletingReview, setIsDeletingReview] = useState(false);
  const [togglingReviewId, setTogglingReviewId] = useState<string | null>(null);

  // Add / Edit modal state
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [reviewForm, setReviewForm] = useState<ReviewFormState>({
    product_id: '',
    customer_name: '',
    rating: 5,
    status: 'approved',
    comment_ro: '',
    comment_en: '',
    item_type_ro: '',
    item_type_en: '',
    images: [],
  });
  
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [isRatingDropdownOpen, setIsRatingDropdownOpen] = useState(false);

  const getReviewImages = (rev: any): string[] => extractReviewImages(rev);
  const isVideoMediaUrl = (url: string) => /\.(mp4|mov|webm|m4v)(\?.*)?$/i.test(url);

  useEffect(() => {
    fetchData();
  }, []);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightbox) return;
      if (e.key === 'Escape') {
        setLightbox(null);
      } else if (e.key === 'ArrowRight') {
        setLightbox(prev => prev ? {
          ...prev,
          currentIndex: (prev.currentIndex + 1) % prev.images.length
        } : null);
      } else if (e.key === 'ArrowLeft') {
        setLightbox(prev => prev ? {
          ...prev,
          currentIndex: (prev.currentIndex - 1 + prev.images.length) % prev.images.length
        } : null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightbox]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/data?action=reviews');
      const json = await res.json();
      setReviews(json.data || []);
      
      const productsRes = await fetch('/api/products');
      const productsJson = await productsRes.json();
      const fetchedProducts = productsJson.products || [];
      setProducts(fetchedProducts);
      if (fetchedProducts.length > 0) {
        setReviewForm(prev => ({ ...prev, product_id: prev.product_id || fetchedProducts[0].id }));
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Eroare la încărcarea recenziilor.");
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingReviewId(null);
    setShowGalleryPicker(false);
    setIsProductDropdownOpen(false);
    setIsRatingDropdownOpen(false);
    setReviewForm({
      product_id: products.length > 0 ? products[0].id : '',
      customer_name: '',
      rating: 5,
      status: 'approved',
      comment_ro: '',
      comment_en: '',
      item_type_ro: '',
      item_type_en: '',
      images: [],
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (rev: any) => {
    setEditingReviewId(rev.id);
    setShowGalleryPicker(false);
    setIsProductDropdownOpen(false);
    setIsRatingDropdownOpen(false);
    setReviewForm({
      product_id: rev.product_id || (products[0]?.id ?? ''),
      customer_name: rev.customer_name || '',
      rating: rev.rating || 5,
      status: rev.status || 'approved',
      comment_ro: rev.comment_ro || rev.comment || '',
      comment_en: rev.comment_en || rev.comment || '',
      item_type_ro: rev.item_type_ro || rev.item_type || '',
      item_type_en: rev.item_type_en || rev.item_type || '',
      images: getReviewImages(rev),
    });
    setIsAddModalOpen(true);
  };

  const handlePhotoUpload = async (file: File) => {
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await uploadReviewImageAdmin(formData);
      if (uploadRes?.success && uploadRes?.url) {
        setReviewForm(prev => ({
          ...prev,
          images: prev.images.includes(uploadRes.url) ? prev.images : [...prev.images, uploadRes.url],
        }));
        toast.success('Poză încărcată!');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Eroare la încărcarea pozei.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: 'approved' | 'rejected' | 'pending') => {
    if (togglingReviewId === id) return;
    const prevReviews = reviews;
    setTogglingReviewId(id);
    // Optimistic update for instant feedback
    setReviews(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    try {
      await updateReviewStatus(id, newStatus);
      toast.success(
        newStatus === 'approved' 
          ? "Recenzia a fost aprobată!" 
          : newStatus === 'rejected' 
            ? "Recenzia a fost respinsă." 
            : "Statusul a fost setat pe În așteptare."
      );
    } catch (error) {
      console.error("Failed to update status", error);
      setReviews(prevReviews);
      toast.error("A apărut o eroare la actualizarea statusului.");
    } finally {
      setTogglingReviewId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (isDeletingReview) return;
    setIsDeletingReview(true);
    try {
      await deleteReview(id);
      setReviews(prev => prev.filter(r => r.id !== id));
      setReviewToDelete(null);
      toast.success("Recenzia a fost ștearsă definitiv.");
    } catch (error) {
      console.error("Failed to delete", error);
      toast.error("A apărut o eroare la ștergere.");
    } finally {
      setIsDeletingReview(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!reviewForm.product_id || !reviewForm.customer_name.trim() || (!reviewForm.comment_ro.trim() && !reviewForm.comment_en.trim())) {
      toast.error("Completează produsul, numele și cel puțin un text (RO sau EN).");
      return;
    }
    setSubmitting(true);
    try {
      if (editingReviewId) {
        await updateReviewAdmin(editingReviewId, reviewForm);
        toast.success("Recenzia a fost actualizată!");
      } else {
        await addReview(reviewForm);
        toast.success("Recenzia a fost adăugată cu succes!");
      }
      setIsAddModalOpen(false);
      setEditingReviewId(null);
      fetchData();
    } catch (error) {
      console.error("Failed to save review", error);
      toast.error("Eroare la salvarea recenziei.");
    } finally {
      setSubmitting(false);
    }
  };

  const openLightbox = (images: string[], index: number, customerName: string, productName: string) => {
    if (!images || images.length === 0) return;
    setLightbox({
      images,
      currentIndex: Math.max(0, Math.min(index, images.length - 1)),
      customerName,
      productName
    });
  };

  // Filter counts
  const counts = useMemo(() => {
    return {
      all: reviews.length,
      pending: reviews.filter(r => r.status === 'pending').length,
      approved: reviews.filter(r => r.status === 'approved').length,
      rejected: reviews.filter(r => r.status === 'rejected').length,
      withPhotos: reviews.filter(r => getReviewImages(r).length > 0).length,
    };
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    return reviews.filter(rev => {
      const q = searchQuery.toLowerCase().trim();
      const pName = typeof rev.product?.name === 'string' ? rev.product.name : (rev.product?.name as any)?.ro || '';
      const matchesSearch = !q || 
        rev.customer_name.toLowerCase().includes(q) || 
        String(rev.comment_ro || rev.comment || '').toLowerCase().includes(q) ||
        String(rev.comment_en || '').toLowerCase().includes(q) ||
        pName.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (ratingFilter === '5' && rev.rating !== 5) return false;
      if (ratingFilter === '4' && rev.rating !== 4) return false;
      if (ratingFilter === 'low' && rev.rating > 3) return false;

      if (statusFilter === 'all') return true;
      if (statusFilter === 'with_photos') return getReviewImages(rev).length > 0;
      return rev.status === statusFilter;
    });
  }, [reviews, searchQuery, statusFilter, ratingFilter]);

  return (
    <div className="max-w-7xl mx-auto space-y-5 sm:space-y-8 animate-in fade-in pb-16 text-slate-900">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-3.5">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#e32f8c]/10 text-[#008ba3] flex items-center justify-center shrink-0 shadow-xs">
            <MessageSquare size={22} className="sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Recenzii Clienți</h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">Moderează recenziile și vezi pozele reale trimise de clienți</p>
          </div>
        </div>

        <button 
          type="button"
          onClick={openAddModal}
          className="w-full sm:w-auto h-11 px-5 bg-[#e32f8c] hover:bg-[#c41a72] active:scale-[0.98] text-slate-950 font-black rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm shadow-[#e32f8c]/20 cursor-pointer text-xs sm:text-sm"
        >
          <Plus size={16} />
          <span>Adaugă Manual</span>
        </button>
      </div>

      {/* SEARCH & FILTER BAR */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-sm space-y-3.5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Caută după nume client, produs, titlu sau conținut..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-10 text-base sm:text-sm font-medium focus:outline-none focus:border-[#e32f8c] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Desktop View Switcher */}
          <div className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 border border-slate-200/60">
            <button
              type="button"
              onClick={() => setDesktopViewMode('cards')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                desktopViewMode === 'cards' 
                  ? 'bg-white text-slate-900 shadow-2xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Afișează ca și Carduri"
            >
              <LayoutGrid size={14} />
              <span>Carduri</span>
            </button>
            <button
              type="button"
              onClick={() => setDesktopViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                desktopViewMode === 'table' 
                  ? 'bg-white text-slate-900 shadow-2xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Afișează ca și Tabel"
            >
              <TableIcon size={14} />
              <span>Tabel</span>
            </button>
          </div>

        </div>

        {/* Filter Tabs Horizontal Scroll */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 hide-scrollbar">
          <button
            onClick={() => setStatusFilter('all')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              statusFilter === 'all' 
                ? 'bg-slate-900 text-white' 
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span>Toate</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${statusFilter === 'all' ? 'bg-white/20' : 'bg-slate-200/80 text-slate-700'}`}>
              {counts.all}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('pending')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              statusFilter === 'pending' 
                ? 'bg-amber-500 text-slate-950' 
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100/80 border border-amber-200/80'
            }`}
          >
            <Clock size={12} />
            <span>În așteptare</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${statusFilter === 'pending' ? 'bg-black/20' : 'bg-amber-200/80 text-amber-900'}`}>
              {counts.pending}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('approved')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              statusFilter === 'approved' 
                ? 'bg-emerald-600 text-white' 
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100/80 border border-emerald-200/80'
            }`}
          >
            <Check size={12} />
            <span>Aprobate</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${statusFilter === 'approved' ? 'bg-white/20' : 'bg-emerald-200/80 text-emerald-900'}`}>
              {counts.approved}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('rejected')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              statusFilter === 'rejected' 
                ? 'bg-red-600 text-white' 
                : 'bg-red-50 text-red-800 hover:bg-red-100/80 border border-red-200/80'
            }`}
          >
            <X size={12} />
            <span>Respinse</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${statusFilter === 'rejected' ? 'bg-white/20' : 'bg-red-200/80 text-red-900'}`}>
              {counts.rejected}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('with_photos')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              statusFilter === 'with_photos' 
                ? 'bg-[#e32f8c] text-slate-950' 
                : 'bg-[#e32f8c]/10 text-[#008ba3] hover:bg-[#e32f8c]/20 border border-[#e32f8c]/30'
            }`}
          >
            <ImageIcon size={12} />
            <span>Cu Poze Atașate</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${statusFilter === 'with_photos' ? 'bg-black/20' : 'bg-[#e32f8c]/20 text-[#008ba3]'}`}>
              {counts.withPhotos}
            </span>
          </button>
        </div>

        {/* Rating Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1 border-t border-slate-100 hide-scrollbar">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 shrink-0 mr-1">Rating:</span>
          {[
            { id: 'all', label: 'Toate stelele' },
            { id: '5', label: '5 stele' },
            { id: '4', label: '4 stele' },
            { id: 'low', label: '1–3 stele' },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setRatingFilter(opt.id as 'all' | '5' | '4' | 'low')}
              className={`min-h-[36px] px-3 py-1 rounded-xl text-[11px] font-black whitespace-nowrap transition-all inline-flex items-center gap-1 cursor-pointer ${
                ratingFilter === opt.id
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {opt.id !== 'all' && <Star size={11} className="fill-amber-400 text-amber-400 shrink-0" />}
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* LIST CONTAINER */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 animate-pulse">
          {[...Array(4)].map((_, idx) => (
            <div key={idx} className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-5 space-y-4 shadow-2xs">
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-200 shrink-0" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-32 bg-slate-200 rounded" />
                    <div className="h-3 w-20 bg-slate-100 rounded" />
                  </div>
                </div>
                <div className="h-6 w-20 bg-slate-200 rounded-full shrink-0" />
              </div>
              <div className="h-10 bg-slate-50 border border-slate-100 rounded-xl" />
              <div className="space-y-2">
                <div className="h-16 bg-slate-50 border border-slate-100 rounded-xl" />
                <div className="h-12 bg-slate-50/70 border border-slate-100 rounded-xl" />
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <div className="h-10 flex-1 bg-slate-200 rounded-xl" />
                <div className="h-10 w-24 bg-slate-100 rounded-xl" />
                <div className="h-10 w-10 bg-slate-100 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="p-16 bg-white border border-slate-200/80 rounded-3xl text-center flex flex-col items-center justify-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
            <MessageSquare size={26} />
          </div>
          <div>
            <h3 className="font-heading font-black text-sm text-slate-800">Nicio recenzie găsită</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              {searchQuery ? 'Nu există recenzii care să corespundă căutării tale.' : 'Nu există recenzii în această categorie.'}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* MOBILE / CARDS VIEW */}
          <div className={`${desktopViewMode === 'cards' ? 'grid' : 'grid md:hidden'} grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5`}>
            {filteredReviews.map((rev) => {
              const reviewImages = getReviewImages(rev);
              const prodName = typeof rev.product?.name === 'string' ? rev.product.name : (rev.product?.name as any)?.ro || 'Produs';

              return (
                <div 
                  key={rev.id}
                  className={`bg-white rounded-2xl sm:rounded-3xl border p-4 sm:p-5 transition-all shadow-2xs space-y-3.5 flex flex-col justify-between relative ${
                    rev.status === 'pending' 
                      ? 'border-amber-300 ring-1 ring-amber-200/60 bg-gradient-to-b from-amber-50/20 to-white' 
                      : rev.status === 'rejected'
                        ? 'border-slate-200 bg-slate-50/40 opacity-90'
                        : 'border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-3">
                    
                    {/* Top Row: User Avatar, Name, Date, Status */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-700 font-black text-xs shrink-0 shadow-2xs">
                          {rev.customer_name ? rev.customer_name.charAt(0).toUpperCase() : 'C'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-black text-slate-900 truncate">
                              {rev.customer_name}
                            </span>
                            {rev.is_verified_buyer && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-1.5 py-0.2 rounded-md">
                                <ShieldCheck size={11} />
                                <span>Verificat</span>
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-bold text-slate-400">
                            {new Date(rev.created_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 border shadow-2xs ${
                        rev.status === 'approved' 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                          : rev.status === 'rejected' 
                            ? 'bg-red-50 text-red-800 border-red-200' 
                            : 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          rev.status === 'approved' ? 'bg-emerald-500' : rev.status === 'rejected' ? 'bg-red-500' : 'bg-amber-500'
                        }`} />
                        {rev.status === 'approved' ? 'Aprobat' : rev.status === 'rejected' ? 'Respins' : 'În Așteptare'}
                      </span>
                    </div>

                    {/* Rating & Product Info */}
                    <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                      {/* Star Rating */}
                      <div className="flex items-center gap-0.5 text-amber-400 shrink-0">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            size={14} 
                            className={i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 fill-slate-200'} 
                          />
                        ))}
                      </div>

                      {/* Product Name & Thumbnail */}
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-md bg-white border border-slate-200 overflow-hidden shrink-0 shadow-2xs">
                          {rev.product?.image ? (
                            <img src={getOptimizedImageUrl(rev.product.image)} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <Package className="w-full h-full p-1 text-slate-400" />
                          )}
                        </div>
                        <span className="text-xs font-bold text-slate-700 truncate max-w-[180px]">
                          {prodName}
                        </span>
                      </div>
                    </div>

                    {/* Review Comment Text (Bilingual RO + EN) */}
                    <div className="space-y-2">
                      <div className="rounded-xl bg-slate-50/90 border border-slate-100 p-2.5">
                        <span className="inline-block text-[9px] font-black uppercase tracking-widest text-[#e32f8c] mb-0.5">RO</span>
                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed break-words whitespace-pre-line">
                          {rev.comment_ro || rev.comment}
                        </p>
                      </div>
                      {rev.comment_en && rev.comment_en !== (rev.comment_ro || rev.comment) && (
                        <div className="rounded-xl bg-slate-50/60 border border-slate-100 p-2.5">
                          <span className="inline-block text-[9px] font-black uppercase tracking-widest text-indigo-600 mb-0.5">EN</span>
                          <p className="text-xs text-slate-600 leading-relaxed break-words whitespace-pre-line">
                            {rev.comment_en}
                          </p>
                        </div>
                      )}
                      {rev.item_type && (
                        <p className="text-[11px] font-bold text-slate-500">
                          Model: <span className="text-slate-800">{rev.item_type}</span>
                        </p>
                      )}
                    </div>

                    {/* POZE REALE ATASATE DE CLIENT */}
                    {reviewImages.length > 0 ? (
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <ImageIcon size={13} className="text-[#008ba3]" />
                            <span>Media atașată ({reviewImages.length})</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold">Apasă pentru a mări</span>
                        </div>

                        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 hide-scrollbar">
                          {reviewImages.map((imgUrl, imgIdx) => (
                            <div
                              key={imgIdx}
                              onClick={() => openLightbox(reviewImages, imgIdx, rev.customer_name, prodName)}
                              className="group/img relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-slate-200 hover:border-[#e32f8c] overflow-hidden bg-slate-900 shrink-0 cursor-pointer transition-all shadow-xs hover:shadow-md hover:scale-105 active:scale-95"
                              title="Apasă pentru a vedea media mărită"
                            >
                              {isVideoMediaUrl(imgUrl) ? (
                                <video
                                  src={imgUrl}
                                  muted
                                  playsInline
                                  className="w-full h-full object-cover group-hover/img:opacity-85 transition-opacity"
                                />
                              ) : (
                                <img 
                                  src={getOptimizedImageUrl(imgUrl)} 
                                  alt={`Poză recenzie ${imgIdx + 1}`} 
                                  className="w-full h-full object-cover group-hover/img:opacity-85 transition-opacity" 
                                />
                              )}
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                <Maximize2 size={16} className="text-white drop-shadow-md" />
                              </div>
                              <span className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-xs text-white text-[9px] font-black px-1.5 py-0.5 rounded-md">
                                #{imgIdx + 1}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 italic pt-1">
                        Fără poze atașate
                      </div>
                    )}

                  </div>

                  {/* CARD ACTIONS */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-1 min-w-[160px]">
                      {rev.status !== 'approved' && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(rev.id, 'approved')}
                          className="flex-1 min-h-[40px] py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <CheckCircle2 size={14} />
                          <span>Aprobă</span>
                        </button>
                      )}
                      
                      {rev.status !== 'rejected' && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(rev.id, 'rejected')}
                          className={`min-h-[40px] py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            rev.status === 'approved' 
                              ? 'bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-800' 
                              : 'flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs'
                          }`}
                        >
                          <XCircle size={14} />
                          <span>Respinge</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Edit & Delete Buttons */}
                      <button
                        type="button"
                        onClick={() => openEditModal(rev)}
                        className="min-h-[40px] py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                        title="Editează recenzia (RO/EN & Poze)"
                      >
                        <Pencil size={14} />
                        <span>Editează</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setReviewToDelete(rev)}
                        className="min-h-[40px] min-w-[40px] p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                        title="Șterge definitiv"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

          {/* DESKTOP TABLE VIEW */}
          {desktopViewMode === 'table' && (
            <div className="hidden md:block bg-white border border-slate-200/90 rounded-3xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    <th className="px-5 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">Client & Dată</th>
                    <th className="px-5 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">Rating</th>
                    <th className="px-5 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">Produs</th>
                    <th className="px-5 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider w-1/4">Comentariu</th>
                    <th className="px-5 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">Foto Client</th>
                    <th className="px-5 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider text-right">Acțiuni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReviews.map((rev) => {
                    const reviewImages = getReviewImages(rev);
                    const prodName = typeof rev.product?.name === 'string' ? rev.product.name : (rev.product?.name as any)?.ro || 'Produs';

                    return (
                      <tr 
                        key={rev.id} 
                        className={`group hover:bg-slate-50/80 transition-colors ${
                          rev.status === 'pending' ? 'bg-amber-50/30' : ''
                        }`}
                      >
                        {/* Client & Date */}
                        <td className="px-5 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-900">{rev.customer_name}</span>
                            <span className="text-[11px] font-bold text-slate-400 mt-0.5">
                              {new Date(rev.created_at).toLocaleDateString('ro-RO')}
                            </span>
                            {rev.is_verified_buyer && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 mt-0.5">
                                <CheckCircle2 size={11} className="shrink-0" />
                                <span>Cumpărător verificat</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Rating */}
                        <td className="px-5 py-4">
                          <div className="flex text-amber-400">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                size={14} 
                                className={i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 fill-slate-200'} 
                              />
                            ))}
                          </div>
                        </td>

                        {/* Product */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0 shadow-2xs">
                              {rev.product?.image ? (
                                <img src={getOptimizedImageUrl(rev.product.image)} className="w-full h-full object-cover" alt="" />
                              ) : (
                                <Package className="w-full h-full p-1.5 text-slate-400" />
                              )}
                            </div>
                            <span className="text-xs font-bold text-slate-700 leading-tight line-clamp-2 max-w-[140px]">
                              {prodName}
                            </span>
                          </div>
                        </td>

                        {/* Comment */}
                        <td className="px-5 py-4">
                          <div className="flex flex-col max-w-sm gap-1">
                            <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed">
                              <span className="font-black text-[#e32f8c] mr-1">RO:</span>
                              {rev.comment_ro || rev.comment}
                            </p>
                            {rev.comment_en && (
                              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                                <span className="font-black text-indigo-600 mr-1">EN:</span>
                                {rev.comment_en}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* FOTO CLIENT (Real photo thumbnail preview) */}
                        <td className="px-5 py-4">
                          {reviewImages.length > 0 ? (
                            <div className="flex items-center gap-2">
                              <div
                                onClick={() => openLightbox(reviewImages, 0, rev.customer_name, prodName)}
                                className="relative group/img w-14 h-14 rounded-2xl border-2 border-slate-200 hover:border-[#e32f8c] overflow-hidden bg-slate-900 cursor-pointer shadow-xs hover:shadow-md transition-all shrink-0 hover:scale-105"
                                title="Apasă pentru a mări poza"
                              >
                                <img src={getOptimizedImageUrl(reviewImages[0])} alt="Poză recenzie" className="w-full h-full object-cover group-hover/img:opacity-85 transition-opacity" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                  <Maximize2 size={16} className="text-white drop-shadow" />
                                </div>
                              </div>
                              {reviewImages.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => openLightbox(reviewImages, 1, rev.customer_name, prodName)}
                                  className="text-[10px] font-black text-[#008ba3] bg-[#e32f8c]/10 hover:bg-[#e32f8c]/20 px-2 py-1 rounded-lg border border-[#e32f8c]/20 cursor-pointer transition-colors"
                                >
                                  +{reviewImages.length - 1} poze
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Fără poze</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            rev.status === 'approved' 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                              : rev.status === 'rejected' 
                                ? 'bg-red-50 text-red-800 border-red-200' 
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            {rev.status === 'approved' ? 'Aprobat' : rev.status === 'rejected' ? 'Respins' : 'În Așteptare'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(rev)}
                              className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                              title="Editează"
                            >
                              <Pencil size={17} />
                            </button>
                            {rev.status !== 'approved' && (
                              <button 
                                onClick={() => handleStatusChange(rev.id, 'approved')} 
                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer" 
                                title="Aprobă"
                              >
                                <CheckCircle2 size={18} />
                              </button>
                            )}
                            {rev.status !== 'rejected' && (
                              <button 
                                onClick={() => handleStatusChange(rev.id, 'rejected')} 
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer" 
                                title="Respinge"
                              >
                                <XCircle size={18} />
                              </button>
                            )}
                            <button 
                              onClick={() => setReviewToDelete(rev)} 
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer" 
                              title="Șterge definitiv"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* MULTI-PHOTO HIGH-RES LIGHTBOX MODAL */}
      {lightbox && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-6 animate-in fade-in duration-200 select-none"
          onClick={() => setLightbox(null)}
        >
          <div 
            className="relative max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col items-center max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar */}
            <div className="w-full flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-800 bg-slate-950/70 text-white">
              <div className="min-w-0 pr-2">
                <p className="text-xs sm:text-sm font-black truncate">
                  Media recenzie • {lightbox.customerName}
                </p>
                <p className="text-[11px] text-[#e32f8c] truncate">
                  {lightbox.productName} ({lightbox.currentIndex + 1} din {lightbox.images.length})
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <a 
                  href={lightbox.images[lightbox.currentIndex]} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                  title="Deschide în tab nou la rezoluție maximă"
                >
                  <ExternalLink size={16} />
                </a>
                <button
                  onClick={() => setLightbox(null)}
                  className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                  title="Închide (Esc)"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Main Image Display with Navigation Arrows */}
            <div className="relative p-2 sm:p-4 flex-1 flex items-center justify-center w-full min-h-[260px] sm:min-h-[300px] max-h-[70vh] bg-black/40 overflow-hidden">
              {lightbox.images.length > 1 && (
                <button
                  type="button"
                  onClick={() => setLightbox({
                    ...lightbox,
                    currentIndex: (lightbox.currentIndex - 1 + lightbox.images.length) % lightbox.images.length
                  })}
                  className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/65 hover:bg-black/85 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10 shadow-lg"
                  title="Poza anterioară (Săgeată stânga)"
                >
                  <ChevronLeft size={22} />
                </button>
              )}

              {isVideoMediaUrl(lightbox.images[lightbox.currentIndex]) ? (
                <video
                  src={lightbox.images[lightbox.currentIndex]}
                  controls
                  autoPlay
                  playsInline
                  className="max-w-full max-h-[64vh] rounded-2xl shadow-xl border border-white/5"
                />
              ) : (
                <img 
                  src={getOptimizedImageUrl(lightbox.images[lightbox.currentIndex])} 
                  alt="Poză recenzie mărită" 
                  className="max-w-full max-h-[64vh] object-contain rounded-2xl shadow-xl border border-white/5 animate-in zoom-in-95 duration-150" 
                />
              )}

              {lightbox.images.length > 1 && (
                <button
                  type="button"
                  onClick={() => setLightbox({
                    ...lightbox,
                    currentIndex: (lightbox.currentIndex + 1) % lightbox.images.length
                  })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10 shadow-lg"
                  title="Poza următoare (Săgeată dreapta)"
                >
                  <ChevronRight size={22} />
                </button>
              )}
            </div>

            {/* Thumbnail Strip (if multiple photos) */}
            {lightbox.images.length > 1 && (
              <div className="w-full px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-center gap-2 overflow-x-auto">
                {lightbox.images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setLightbox({ ...lightbox, currentIndex: idx })}
                    className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                      lightbox.currentIndex === idx ? 'border-[#e32f8c] scale-105 shadow-md' : 'border-slate-700 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={getOptimizedImageUrl(img)} className="w-full h-full object-cover" alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {reviewToDelete && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setReviewToDelete(null)}
        >
          <div 
            className="bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shadow-xs">
              <AlertTriangle size={24} />
            </div>

            <div>
              <h3 className="font-heading font-black text-lg text-slate-900">Șterge Recenzia</h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                Ești sigur că vrei să ștergi definitiv recenzia trimisă de <span className="font-black text-slate-900">{reviewToDelete.customer_name}</span>? Această acțiune nu poate fi anulată.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeletingReview}
                onClick={() => setReviewToDelete(null)}
                className="min-h-[44px] px-4 py-2.5 font-bold text-xs sm:text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                Anulează
              </button>
              <button
                type="button"
                disabled={isDeletingReview}
                onClick={() => handleDelete(reviewToDelete.id)}
                className="min-h-[44px] px-4 py-2.5 font-black text-xs sm:text-sm text-white bg-red-600 hover:bg-red-700 active:scale-[0.98] rounded-xl transition-all flex items-center gap-1.5 shadow-sm shadow-red-500/20 cursor-pointer disabled:opacity-50"
              >
                <Trash2 size={15} />
                <span>{isDeletingReview ? 'Se șterge...' : 'Șterge Definitiv'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD OR EDIT BILINGUAL REVIEW MODAL */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#e32f8c]/10 text-[#e32f8c] flex items-center justify-center shadow-2xs">
                  {editingReviewId ? <Pencil size={18} /> : <Star size={20} className="fill-[#e32f8c]" />}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    {editingReviewId ? 'Editează Recenzia (RO + EN & Poze)' : 'Adaugă Recenzie Bilingvă (RO + EN)'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingReviewId
                      ? 'Modifică textul pentru ambele limbi, produsul asociat sau pozele.'
                      : 'Recenzia va fi salvată cu text pentru Română și Engleză.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 cursor-pointer shadow-2xs"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {/* Product Select */}
              <div className="space-y-1.5 relative">
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Produs *</label>
                <div className="relative">
                  <div
                    onClick={() => { setIsProductDropdownOpen(!isProductDropdownOpen); setIsRatingDropdownOpen(false); }}
                    className={`w-full bg-slate-50 border ${isProductDropdownOpen ? 'border-[#e32f8c] ring-2 ring-[#e32f8c]/20' : 'border-slate-200'} rounded-xl px-4 py-3 text-base sm:text-sm font-bold text-slate-900 cursor-pointer flex items-center justify-between transition-all`}
                  >
                    <span className="truncate mr-2">
                      {reviewForm.product_id
                        ? (() => {
                            const p = products.find(p => p.id === reviewForm.product_id);
                            return p ? (typeof p.name === 'string' ? p.name : p.name?.ro || p.name?.en) : 'Selectează produs';
                          })()
                        : 'Selectează produs'
                      }
                    </span>
                    <ChevronDown size={16} className={`text-slate-400 transition-transform ${isProductDropdownOpen ? 'rotate-180 text-[#e32f8c]' : ''}`} />
                  </div>

                  {isProductDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto animate-in fade-in slide-in-from-top-1 p-1">
                      {products.map(p => {
                        const isSelected = p.id === reviewForm.product_id;
                        return (
                          <div
                            key={p.id}
                            onClick={() => {
                              setReviewForm({ ...reviewForm, product_id: p.id });
                              setIsProductDropdownOpen(false);
                            }}
                            className={`px-3.5 py-2.5 text-xs sm:text-sm font-bold rounded-xl cursor-pointer transition-colors ${
                              isSelected ? 'bg-[#e32f8c]/10 text-[#008ba3]' : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {typeof p.name === 'string' ? p.name : p.name?.ro || p.name?.en}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Name, Rating & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Nume Client *</label>
                  <input
                    type="text"
                    value={reviewForm.customer_name}
                    onChange={(e) => setReviewForm({ ...reviewForm, customer_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-[#e32f8c] transition-colors"
                    placeholder="Ex: Alexandru B."
                    required
                  />
                </div>

                <div className="space-y-1.5 relative">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Rating *</label>
                  <div className="relative">
                    <div
                      onClick={() => { setIsRatingDropdownOpen(!isRatingDropdownOpen); setIsProductDropdownOpen(false); }}
                      className={`w-full bg-slate-50 border ${isRatingDropdownOpen ? 'border-[#e32f8c] ring-2 ring-[#e32f8c]/20' : 'border-slate-200'} rounded-xl px-4 py-3 text-base sm:text-sm font-bold text-slate-900 cursor-pointer flex items-center justify-between transition-all`}
                    >
                      <span className="flex items-center gap-1">
                        <Star size={14} className="fill-amber-400 text-amber-400" />
                        <span>{reviewForm.rating} Stele</span>
                      </span>
                      <ChevronDown size={16} className={`text-slate-400 transition-transform ${isRatingDropdownOpen ? 'rotate-180 text-[#e32f8c]' : ''}`} />
                    </div>

                    {isRatingDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto animate-in fade-in slide-in-from-top-1 p-1">
                        {[5, 4, 3, 2, 1].map(num => {
                          const isSelected = num === reviewForm.rating;
                          return (
                            <div
                              key={num}
                              onClick={() => {
                                setReviewForm({ ...reviewForm, rating: num });
                                setIsRatingDropdownOpen(false);
                              }}
                              className={`px-3.5 py-2.5 text-xs sm:text-sm font-bold rounded-xl cursor-pointer transition-colors flex items-center gap-2 ${
                                isSelected ? 'bg-[#e32f8c]/10 text-[#008ba3]' : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex text-amber-400">
                                {[...Array(num)].map((_, i) => (
                                  <Star key={i} size={13} className="fill-amber-400 text-amber-400" />
                                ))}
                              </div>
                              <span>{num} Stele</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Status</label>
                  <select
                    value={reviewForm.status}
                    onChange={(e) => setReviewForm({ ...reviewForm, status: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-[#e32f8c] transition-colors"
                  >
                    <option value="approved">Aprobat (Vizibil)</option>
                    <option value="pending">În așteptare</option>
                    <option value="rejected">Respins</option>
                  </select>
                </div>
              </div>

              {/* Model / Variant labels (RO + EN) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Model / Variantă RO (Opțional)</label>
                  <input
                    type="text"
                    value={reviewForm.item_type_ro}
                    onChange={(e) => setReviewForm({ ...reviewForm, item_type_ro: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-base sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-[#e32f8c] transition-colors"
                    placeholder="Ex: X10 Purple Camo / White Gothic"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Model / Variantă EN (Opțional)</label>
                  <input
                    type="text"
                    value={reviewForm.item_type_en}
                    onChange={(e) => setReviewForm({ ...reviewForm, item_type_en: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-base sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-[#e32f8c] transition-colors"
                    placeholder="Ex: X10 Purple Camo / White Gothic"
                  />
                </div>
              </div>

              {/* Bilingual Comments (RO + EN) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Globe size={12} className="text-[#e32f8c]" />
                    <span>Text Română (RO) *</span>
                  </label>
                  <textarea
                    value={reviewForm.comment_ro}
                    onChange={(e) => setReviewForm({ ...reviewForm, comment_ro: e.target.value })}
                    className="w-full h-28 resize-y bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-[#e32f8c] transition-colors"
                    placeholder="Scrie recenzia în română..."
                    required={!reviewForm.comment_en.trim()}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Globe size={12} className="text-indigo-600" />
                    <span>Text Engleză (EN) *</span>
                  </label>
                  <textarea
                    value={reviewForm.comment_en}
                    onChange={(e) => setReviewForm({ ...reviewForm, comment_en: e.target.value })}
                    className="w-full h-28 resize-y bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-indigo-500 transition-colors"
                    placeholder="Write the review in English..."
                    required={!reviewForm.comment_ro.trim()}
                  />
                </div>
              </div>

              {/* Photos Manager */}
              <div className="space-y-2.5 pt-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                    Poze atașate ({reviewForm.images.length}) — lasă gol pentru recenzie fără poze
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowGalleryPicker((v) => !v)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-black transition-colors cursor-pointer"
                    >
                      {showGalleryPicker ? 'Ascunde galeria locală' : 'Alege din /images/reviews/'}
                    </button>
                    {reviewForm.images.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setReviewForm(prev => ({ ...prev, images: [] }))}
                        className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-[11px] font-black transition-colors cursor-pointer"
                      >
                        Scoate toate pozele
                      </button>
                    )}
                  </div>
                </div>

                {/* Current attached photos + Upload tile */}
                <div className="flex flex-wrap items-center gap-3">
                  {reviewForm.images.map((imgUrl, idx) => (
                    <div key={imgUrl + idx} className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-900 shrink-0 group">
                      <img src={getOptimizedImageUrl(imgUrl)} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setReviewForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md hover:bg-red-700 cursor-pointer"
                        title="Elimină poza"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}

                  <label className="w-20 h-20 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-300 hover:border-[#e32f8c] flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors text-slate-500 hover:text-[#e32f8c] shrink-0">
                    <Upload size={18} />
                    <span className="text-[10px] font-black uppercase">
                      {uploadingPhoto ? '...' : 'Încarcă'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingPhoto}
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handlePhotoUpload(f);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>

                {/* Quick picker for /images/reviews/ */}
                {showGalleryPicker && (
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    {GALLERY_REVIEW_PHOTOS.map((item) => {
                      const isAdded = reviewForm.images.includes(item.path);
                      return (
                        <button
                          key={item.path}
                          type="button"
                          onClick={() =>
                            setReviewForm((prev) => ({
                              ...prev,
                              images: isAdded
                                ? prev.images.filter((p) => p !== item.path)
                                : [...prev.images, item.path],
                            }))
                          }
                          className={`group relative rounded-xl overflow-hidden border-2 transition-all text-left cursor-pointer ${
                            isAdded ? 'border-[#e32f8c] ring-2 ring-[#e32f8c]/20' : 'border-slate-200 hover:border-slate-400'
                          }`}
                        >
                          <div className="aspect-square bg-slate-900">
                            <img src={item.path} alt={item.label} className="w-full h-full object-cover" />
                          </div>
                          <p className="text-[9px] font-bold text-slate-700 p-1 truncate bg-white">{item.label}</p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting || uploadingPhoto}
                  className="w-full h-12 bg-[#e32f8c] hover:bg-[#c41a72] active:scale-[0.98] text-white font-black rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-[#e32f8c]/20"
                >
                  {submitting
                    ? 'Se salvează...'
                    : editingReviewId
                    ? 'Salvează Modificările'
                    : 'Adaugă Recenzia'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
