"use client";

import { getOptimizedImageUrl } from '@/lib/utils/imageProxy';
import { useState, useEffect, useRef } from 'react';
import { Tag, Loader2, Save, Image as ImageIcon, Upload, Settings, X, Crop as CropIcon, Trash2, Calendar, Ticket, ChevronDown, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { updateSiteSetting, uploadPromoImage, deletePromoImage } from '@/app/actions/settings';
import { createClient } from '@/utils/supabase/client';
import Image from 'next/image';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, setHours, setMinutes } from 'date-fns';
import { ro } from 'date-fns/locale';
import toast from 'react-hot-toast';

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  )
}

export default function PromoSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Crop states
  const [imgSrc, setImgSrc] = useState('');
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>(4 / 5);

  const [settings, setSettings] = useState({
    isActive: false,
    endDate: "",
    couponId: "",
    image: "",
    ro: {
      title: "Summer Sale",
      description: "Reduceri masive la toate produsele!",
      badge: "Ofertă Limitată",
      button: "Cumpără Acum"
    },
    en: {
      title: "Summer Sale",
      description: "Massive discounts on all products!",
      badge: "Limited Offer",
      button: "Shop Now"
    }
  });

  // Custom UI states
  const [isCouponDropdownOpen, setIsCouponDropdownOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const selectedDate = settings.endDate ? new Date(settings.endDate) : null;

  const handleDaySelect = (day: Date) => {
    let newDate = day;
    if (selectedDate) {
      newDate = setHours(newDate, selectedDate.getHours());
      newDate = setMinutes(newDate, selectedDate.getMinutes());
    } else {
      newDate = setHours(newDate, 23);
      newDate = setMinutes(newDate, 59);
    }
    // format as YYYY-MM-DDTHH:mm to match native datetime-local format expected by state
    setSettings({...settings, endDate: format(newDate, "yyyy-MM-dd'T'HH:mm")});
  };

  const handleTimeChange = (type: 'hours' | 'minutes', value: string) => {
    if (!selectedDate) return;
    let newDate = new Date(selectedDate);
    if (type === 'hours') newDate = setHours(newDate, parseInt(value) || 0);
    if (type === 'minutes') newDate = setMinutes(newDate, parseInt(value) || 0);
    setSettings({...settings, endDate: format(newDate, "yyyy-MM-dd'T'HH:mm")});
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDateGrid = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const dateFormat = "MMMM yyyy";
  const days = eachDayOfInterval({ start: startDate, end: endDateGrid });

  useEffect(() => {
    async function fetchData() {
      try {
        const [promoSettings, activeCoupons] = await Promise.all([
          fetch('/api/admin/data?action=site-setting&key=active_promotion').then(r => r.json()).then(j => j.data),
          fetch('/api/admin/data?action=coupons').then(r => r.json()).then(j => j.data)
        ]);
        
        if (promoSettings) {
          setSettings(promoSettings);
        }
        if (activeCoupons) {
          setCoupons(activeCoupons.filter((c: any) => c.is_active));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSiteSetting('active_promotion', settings);
      toast.success('Setările promoției au fost salvate cu succes!');
    } catch (e: any) {
      console.error(e);
      toast.error('Eroare la salvare: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined) // Reset crop state when new image is loaded
      const reader = new FileReader()
      reader.addEventListener('load', () =>
        setImgSrc(reader.result?.toString() || '')
      )
      reader.readAsDataURL(e.target.files[0])
    }
  }

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (aspect) {
      const { width, height } = e.currentTarget
      setCrop(centerAspectCrop(width, height, aspect))
    }
  }

  const getCroppedImg = async (image: HTMLImageElement, crop: PixelCrop): Promise<Blob | null> => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/webp', 0.9);
    });
  };

  const handleDeleteImage = async () => {
    if (!settings.image) return;
    
    try {
      const urlParts = settings.image.split('/public/marketing/');
      if (urlParts.length === 2) {
        await deletePromoImage(urlParts[1]);
      }
      setSettings({ ...settings, image: '' });
      toast.success('Imaginea promoției a fost ștearsă.');
    } catch (e) {
      console.error("Could not delete image from storage", e);
      toast.error('Eroare la ștergerea imaginii.');
    }
  };

  const handleCropUpload = async () => {
    if (!imgRef.current || !completedCrop) return;
    
    setUploadingImage(true);
    try {
      const blob = await getCroppedImg(imgRef.current, completedCrop);
      if (!blob) throw new Error("Failed to create crop blob");
      
      // Delete old image if it exists to keep storage clean
      if (settings.image) {
        const oldUrlParts = settings.image.split('/public/marketing/');
        if (oldUrlParts.length === 2) {
          await deletePromoImage(oldUrlParts[1]);
        }
      }

      const file = new File([blob], `promo-${Date.now()}.webp`, { type: 'image/webp' });
      const formData = new FormData();
      formData.append('file', file);

      const res = await uploadPromoImage(formData);
      if (!res.success) throw new Error("Failed to upload via server action");

      setSettings({ ...settings, image: res.url });
      setImgSrc(''); // Close modal
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error('Eroare la încărcarea imaginii: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleTextChange = (lang: 'ro' | 'en', field: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      [lang]: {
        ...prev[lang],
        [field]: value
      }
    }));
  };

  const handleAspectChange = (newAspect: number | undefined) => {
    setAspect(newAspect);
    if (newAspect && imgRef.current) {
      const { width, height } = imgRef.current;
      setCrop(centerAspectCrop(width, height, newAspect));
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#e32f8c]" /></div>;
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-10 sm:pb-12">
      
      {/* CROP MODAL */}
      {imgSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg sm:text-xl font-black flex items-center gap-2">
                <CropIcon size={20} className="text-[#e32f8c]" /> Ajustează Imaginea
              </h3>
              <button onClick={() => setImgSrc('')} className="p-1.5 sm:p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="flex gap-1.5 sm:gap-2 mb-4 overflow-x-auto pb-2 custom-scrollbar">
              <button onClick={() => handleAspectChange(4/5)} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold ${aspect === 4/5 ? 'bg-[#e32f8c] text-black' : 'bg-slate-100 text-slate-600'}`}>Înalt (4:5)</button>
              <button onClick={() => handleAspectChange(3/4)} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold ${aspect === 3/4 ? 'bg-[#e32f8c] text-black' : 'bg-slate-100 text-slate-600'}`}>Înalt (3:4)</button>
              <button onClick={() => handleAspectChange(1)} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold ${aspect === 1 ? 'bg-[#e32f8c] text-black' : 'bg-slate-100 text-slate-600'}`}>Pătrat (1:1)</button>
              <button onClick={() => handleAspectChange(4/3)} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold ${aspect === 4/3 ? 'bg-[#e32f8c] text-black' : 'bg-slate-100 text-slate-600'}`}>Lat (4:3)</button>
              <button onClick={() => handleAspectChange(undefined)} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold ${aspect === undefined ? 'bg-[#e32f8c] text-black' : 'bg-slate-100 text-slate-600'}`}>Liber</button>
            </div>

            <div className="bg-black rounded-xl overflow-hidden flex items-center justify-center p-2 sm:p-4 min-h-[240px] sm:min-h-[300px]">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={aspect}
                className="max-h-[50vh]"
              >
                <img
                  ref={imgRef}
                  alt="Crop me"
                  src={getOptimizedImageUrl(imgSrc)}
                  onLoad={onImageLoad}
                  className="max-h-[50vh] object-contain"
                />
              </ReactCrop>
            </div>

            <div className="flex flex-col sm:flex-row justify-end mt-4 sm:mt-6 gap-2 sm:gap-3">
              <button onClick={() => setImgSrc('')} className="order-2 sm:order-1 w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors text-sm">
                Anulează
              </button>
              <button 
                onClick={handleCropUpload} 
                disabled={uploadingImage || !completedCrop?.width}
                className="order-1 sm:order-2 w-full sm:w-auto flex items-center justify-center gap-2 bg-[#e32f8c] text-black px-6 py-3 rounded-xl font-black hover:bg-[#c41a72] transition-all disabled:opacity-50 text-sm shadow-md shadow-[#e32f8c]/20"
              >
                {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload size={16} />}
                {uploadingImage ? 'Se încarcă...' : 'Decupează și Salvează'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div className="flex items-center gap-3 sm:gap-3.5">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#e32f8c]/10 border border-[#e32f8c]/20 flex items-center justify-center text-[#e32f8c] shrink-0 shadow-sm">
            <Tag size={22} className="sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Promoție Activă</h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">Configurarea secțiunii promoționale de pe prima pagină</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#e32f8c] hover:bg-[#c41a72] active:scale-[0.98] text-black px-6 py-3.5 sm:py-3 rounded-xl sm:rounded-2xl font-black shadow-md shadow-[#e32f8c]/20 transition-all disabled:opacity-50 text-sm sm:text-base"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save size={18} />}
          <span>{saving ? 'Se salvează...' : 'Salvează Modificările'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Setări Generale */}
        <div className="lg:col-span-1 space-y-5 sm:space-y-6">
          <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm">
            <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider mb-5 flex items-center gap-2">
              <Settings size={18} className="text-[#e32f8c]" />
              Status & Config
            </h2>
            
            <div className="space-y-5">
              <div>
                <label className="flex items-center justify-between cursor-pointer group p-1">
                  <div>
                    <span className="block text-sm font-bold text-slate-900">Activează Promoția</span>
                    <span className="block text-xs text-slate-500">Afișează secțiunea pe site</span>
                  </div>
                  <div className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${settings.isActive ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                    <input type="checkbox" className="sr-only" checked={settings.isActive} onChange={(e) => setSettings({...settings, isActive: e.target.checked})} />
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${settings.isActive ? 'translate-x-8' : 'translate-x-1'} shadow-sm`} />
                  </div>
                </label>
              </div>

              <div className="relative">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Data Expirării</label>
                <div 
                  className="flex items-center justify-between w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 sm:px-4 py-3 text-sm font-medium hover:border-[#e32f8c] transition-colors cursor-pointer"
                  onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Calendar size={18} className="text-slate-400 shrink-0" />
                    <span className={`truncate ${settings.endDate ? "text-slate-900 font-bold" : "text-slate-400"}`}>
                      {settings.endDate ? format(selectedDate!, "dd MMMM yyyy, HH:mm", { locale: ro }) : "Selectează data și ora..."}
                    </span>
                  </div>
                </div>

                {isDatePickerOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsDatePickerOpen(false)} />
                    <div className="absolute top-full mt-2 left-0 w-full sm:w-[320px] max-w-[calc(100vw-2.5rem)] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-4 animate-in slide-in-from-top-2 fade-in duration-200">
                      
                      {/* Calendar Header */}
                      <div className="flex items-center justify-between mb-4">
                        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronLeft size={16} /></button>
                        <span className="font-bold text-slate-900 capitalize text-sm">{format(currentMonth, dateFormat, { locale: ro })}</span>
                        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronRight size={16} /></button>
                      </div>

                      {/* Days of Week */}
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ', 'Du'].map(day => (
                          <div key={day} className="text-center text-xs font-bold text-slate-400 py-1">{day}</div>
                        ))}
                      </div>

                      {/* Days Grid */}
                      <div className="grid grid-cols-7 gap-1 mb-4">
                        {days.map((day, i) => {
                          const isSelected = selectedDate && isSameDay(day, selectedDate);
                          const isCurrentMonth = isSameMonth(day, monthStart);
                          return (
                            <button
                              key={i}
                              onClick={() => handleDaySelect(day)}
                              className={`
                                aspect-square flex items-center justify-center text-xs sm:text-sm font-medium rounded-full transition-colors
                                ${!isCurrentMonth ? 'text-slate-300' : 'text-slate-700 hover:bg-slate-100'}
                                ${isSelected ? 'bg-[#e32f8c] text-black font-black hover:bg-[#c41a72]' : ''}
                              `}
                            >
                              {format(day, 'd')}
                            </button>
                          );
                        })}
                      </div>

                      <div className="w-full h-px bg-slate-100 my-4" />

                      {/* Time Picker */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-600">
                          <Clock size={16} className="text-slate-400" /> Oră
                        </div>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number"
                            min="0"
                            max="23"
                            className="bg-slate-50 border border-slate-200 rounded-lg w-12 text-center py-1.5 text-sm font-bold focus:outline-none focus:border-[#e32f8c] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            value={selectedDate ? format(selectedDate, 'HH') : '23'}
                            onChange={(e) => handleTimeChange('hours', e.target.value)}
                            onBlur={(e) => {
                              let val = parseInt(e.target.value) || 0;
                              if (val < 0) val = 0;
                              if (val > 23) val = 23;
                              handleTimeChange('hours', val.toString().padStart(2, '0'));
                            }}
                          />
                          <span className="font-bold text-slate-400">:</span>
                          <input 
                            type="number"
                            min="0"
                            max="59"
                            className="bg-slate-50 border border-slate-200 rounded-lg w-12 text-center py-1.5 text-sm font-bold focus:outline-none focus:border-[#e32f8c] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            value={selectedDate ? format(selectedDate, 'mm') : '59'}
                            onChange={(e) => handleTimeChange('minutes', e.target.value)}
                            onBlur={(e) => {
                              let val = parseInt(e.target.value) || 0;
                              if (val < 0) val = 0;
                              if (val > 59) val = 59;
                              handleTimeChange('minutes', val.toString().padStart(2, '0'));
                            }}
                          />
                        </div>
                      </div>

                    </div>
                  </>
                )}
              </div>

              <div className="relative">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Cupon Asociat</label>
                <div 
                  className="flex items-center justify-between w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 sm:px-4 py-3 text-sm font-medium hover:border-[#e32f8c] transition-colors cursor-pointer"
                  onClick={() => setIsCouponDropdownOpen(!isCouponDropdownOpen)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Ticket size={18} className="text-slate-400 shrink-0" />
                    <span className={`truncate ${settings.couponId ? "text-slate-900 font-bold" : "text-slate-400"}`}>
                      {settings.couponId ? `${settings.couponId} (${coupons.find(c => c.code === settings.couponId)?.value}${coupons.find(c => c.code === settings.couponId)?.type === 'percentage' ? '%' : ' RON'})` : "Fără cupon aplicat"}
                    </span>
                  </div>
                  <ChevronDown size={18} className={`text-slate-400 shrink-0 transition-transform ${isCouponDropdownOpen ? 'rotate-180' : ''}`} />
                </div>

                {isCouponDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsCouponDropdownOpen(false)} />
                    <div className="absolute top-full mt-2 left-0 w-full bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden py-1 animate-in slide-in-from-top-2 fade-in duration-200 max-h-60 overflow-y-auto custom-scrollbar">
                      <div 
                        className={`px-4 py-3 text-sm font-medium hover:bg-slate-50 cursor-pointer transition-colors ${!settings.couponId ? 'text-[#e32f8c] bg-blue-50/50 font-bold' : 'text-slate-700'}`}
                        onClick={() => { setSettings({...settings, couponId: ""}); setIsCouponDropdownOpen(false); }}
                      >
                        Fără cupon aplicat
                      </div>
                      {coupons.map(c => (
                        <div 
                          key={c.code}
                          className={`px-4 py-3 text-sm font-medium hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between ${settings.couponId === c.code ? 'text-[#e32f8c] bg-blue-50/50 font-bold' : 'text-slate-700'}`}
                          onClick={() => { setSettings({...settings, couponId: c.code}); setIsCouponDropdownOpen(false); }}
                        >
                          <span className="font-bold">{c.code}</span>
                          <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded-md text-slate-500">
                            {c.value}{c.type === 'percentage' ? '%' : ' RON'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Card Imagine Promoție */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm">
            <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider mb-5 flex items-center gap-2">
              <ImageIcon size={18} className="text-[#e32f8c]" />
              Imagine Promoție
            </h2>
            
            <div className="space-y-3">
              {settings.image ? (
                <div className="space-y-3">
                  <div className="relative aspect-video rounded-xl sm:rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 group shadow-inner">
                    <Image src={settings.image} alt="Promo" fill sizes="100vw" className="object-cover" />
                    {/* Desktop hover overlay */}
                    <div className="hidden sm:flex absolute inset-0 bg-black/60 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-3">
                      <label className="cursor-pointer bg-white text-black px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors shadow">
                        Schimbă Imaginea
                        <input type="file" accept="image/*" className="hidden" onChange={onSelectFile} />
                      </label>
                      <button 
                        onClick={handleDeleteImage}
                        className="bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-600 transition-colors flex items-center gap-2 shadow"
                      >
                        <Trash2 size={14} /> Șterge Definitiv
                      </button>
                    </div>
                  </div>

                  {/* Mobile touch action buttons (always visible on touch devices) */}
                  <div className="flex sm:hidden items-center gap-2">
                    <label className="flex-1 cursor-pointer bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 px-3 py-2.5 rounded-xl text-xs font-bold text-center border border-slate-200 transition-colors flex items-center justify-center gap-1.5">
                      <Upload size={14} /> Schimbă
                      <input type="file" accept="image/*" className="hidden" onChange={onSelectFile} />
                    </label>
                    <button 
                      onClick={handleDeleteImage}
                      className="flex-1 bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-600 px-3 py-2.5 rounded-xl text-xs font-bold border border-red-200 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Trash2 size={14} /> Șterge
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center aspect-video rounded-xl sm:rounded-2xl border-2 border-dashed border-slate-200 hover:border-[#e32f8c] bg-slate-50 hover:bg-slate-100 active:bg-slate-200/60 cursor-pointer transition-colors p-4">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm">
                      <Upload size={20} />
                    </div>
                    <span className="text-xs font-bold text-slate-600">Apasă pentru upload</span>
                    <span className="text-[11px] text-slate-400 text-center">PNG, JPG, WEBP</span>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={onSelectFile} />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Texte */}
        <div className="lg:col-span-2 space-y-5 sm:space-y-6">
          <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm">
            <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider mb-5 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-black">RO</span>
              Texte în Română
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Badge (Etichetă Sus)</label>
                <input
                  type="text"
                  value={settings.ro.badge}
                  onChange={(e) => handleTextChange('ro', 'badge', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-base sm:text-sm font-medium focus:outline-none focus:border-[#e32f8c] focus:ring-1 focus:ring-[#e32f8c]/20"
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Titlu Principal</label>
                <input
                  type="text"
                  value={settings.ro.title}
                  onChange={(e) => handleTextChange('ro', 'title', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-base sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-[#e32f8c] focus:ring-1 focus:ring-[#e32f8c]/20"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Descriere Scurtă</label>
                <textarea
                  value={settings.ro.description}
                  onChange={(e) => handleTextChange('ro', 'description', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-base sm:text-sm font-medium focus:outline-none focus:border-[#e32f8c] focus:ring-1 focus:ring-[#e32f8c]/20 h-24 resize-none leading-relaxed"
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Text Buton</label>
                <input
                  type="text"
                  value={settings.ro.button}
                  onChange={(e) => handleTextChange('ro', 'button', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-base sm:text-sm font-bold focus:outline-none focus:border-[#e32f8c] focus:ring-1 focus:ring-[#e32f8c]/20"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm">
            <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider mb-5 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-[10px] font-black">EN</span>
              Texte în Engleză
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Badge (Top Label)</label>
                <input
                  type="text"
                  value={settings.en.badge}
                  onChange={(e) => handleTextChange('en', 'badge', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-base sm:text-sm font-medium focus:outline-none focus:border-[#e32f8c] focus:ring-1 focus:ring-[#e32f8c]/20"
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Main Title</label>
                <input
                  type="text"
                  value={settings.en.title}
                  onChange={(e) => handleTextChange('en', 'title', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-base sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-[#e32f8c] focus:ring-1 focus:ring-[#e32f8c]/20"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Short Description</label>
                <textarea
                  value={settings.en.description}
                  onChange={(e) => handleTextChange('en', 'description', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-base sm:text-sm font-medium focus:outline-none focus:border-[#e32f8c] focus:ring-1 focus:ring-[#e32f8c]/20 h-24 resize-none leading-relaxed"
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Button Text</label>
                <input
                  type="text"
                  value={settings.en.button}
                  onChange={(e) => handleTextChange('en', 'button', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-base sm:text-sm font-bold focus:outline-none focus:border-[#e32f8c] focus:ring-1 focus:ring-[#e32f8c]/20"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
