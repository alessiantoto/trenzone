"use client";

import { getOptimizedImageUrl } from '@/lib/utils/imageProxy';
import { useState, useEffect, useRef } from 'react';
import {
  Tag, Loader2, Save, Image as ImageIcon, Upload, Settings, X, Crop as CropIcon,
  Calendar, Ticket, ChevronDown, ChevronLeft, ChevronRight, Clock,
  Smartphone, Monitor, Eye, Sparkles, Percent
} from 'lucide-react';
import { updateSiteSetting, uploadPromoImage, deletePromoImage } from '@/app/actions/settings';
import Image from 'next/image';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, setHours, setMinutes } from 'date-fns';
import { ro } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  DEFAULT_PROMO_SETTINGS,
  PromoSettings,
  PromoLocaleText,
  normalizePromoSettings,
} from '@/lib/promo-config';

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
  );
}

export default function PromoSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Crop states (shared for PC & Mobile image upload targets)
  const [uploadTarget, setUploadTarget] = useState<'pc' | 'mobile'>('pc');
  const [imgSrc, setImgSrc] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>(16 / 9);

  const [settings, setSettings] = useState<PromoSettings>(DEFAULT_PROMO_SETTINGS);

  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [previewLang, setPreviewLang] = useState<'ro' | 'en'>('ro');
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
    setSettings((prev) => ({ ...prev, endDate: format(newDate, "yyyy-MM-dd'T'HH:mm") }));
  };

  const handleTimeChange = (type: 'hours' | 'minutes', value: string) => {
    if (!selectedDate) return;
    let newDate = new Date(selectedDate);
    if (type === 'hours') newDate = setHours(newDate, parseInt(value) || 0);
    if (type === 'minutes') newDate = setMinutes(newDate, parseInt(value) || 0);
    setSettings((prev) => ({ ...prev, endDate: format(newDate, "yyyy-MM-dd'T'HH:mm") }));
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDateGrid = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: startDate, end: endDateGrid });

  useEffect(() => {
    async function fetchData() {
      try {
        const [promoSettings, activeCoupons] = await Promise.all([
          fetch('/api/admin/data?action=site-setting&key=active_promotion').then((r) => r.json()).then((j) => j.data),
          fetch('/api/admin/data?action=coupons').then((r) => r.json()).then((j) => j.data),
        ]);

        if (promoSettings) {
          setSettings(normalizePromoSettings(promoSettings));
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
      const normalized = normalizePromoSettings(settings);
      await updateSiteSetting('active_promotion', normalized);
      setSettings(normalized);
      toast.success('Setările popup-ului au fost salvate!');
    } catch (e: any) {
      toast.error('Eroare la salvare: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const onSelectFile = (target: 'pc' | 'mobile', e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setUploadTarget(target);
      setAspect(target === 'pc' ? 16 / 9 : 9 / 16);
      setSelectedFile(file);
      setCrop(undefined);
      const reader = new FileReader();
      reader.addEventListener('load', () => setImgSrc(reader.result?.toString() || ''));
      reader.readAsDataURL(file);
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (aspect) {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, aspect));
    }
  };

  const getCroppedImg = async (image: HTMLImageElement, crop: PixelCrop): Promise<Blob | null> => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    let outW = Math.round(crop.width * scaleX);
    let outH = Math.round(crop.height * scaleY);
    const maxDim = 1600;
    if (outW > maxDim || outH > maxDim) {
      const ratio = Math.min(maxDim / outW, maxDim / outH);
      outW = Math.round(outW * ratio);
      outH = Math.round(outH * ratio);
    }
    canvas.width = Math.max(1, outW);
    canvas.height = Math.max(1, outH);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(image, crop.x * scaleX, crop.y * scaleY, crop.width * scaleX, crop.height * scaleY, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/webp', 0.92);
    });
  };

  const uploadBlobOrFile = async (file: File) => {
    const prevUrl = uploadTarget === 'pc' ? settings.image : settings.mobileImage;
    if (prevUrl && prevUrl.startsWith('http')) {
      await deletePromoImage(prevUrl);
    }
    const formData = new FormData();
    formData.append('file', file);
    const res = await uploadPromoImage(formData);
    if (!res.success) throw new Error('Failed to upload');

    const updated =
      uploadTarget === 'pc'
        ? { ...settings, image: res.url }
        : { ...settings, mobileImage: res.url };
    setSettings(updated);
    await updateSiteSetting('active_promotion', normalizePromoSettings(updated));
    setImgSrc('');
    setSelectedFile(null);
    toast.success(`Fundalul ${uploadTarget === 'pc' ? 'PC' : 'Mobil'} a fost încărcat!`);
  };

  const handleResetDefaultImage = async (target: 'pc' | 'mobile') => {
    const prevUrl = target === 'pc' ? settings.image : settings.mobileImage;
    if (prevUrl && prevUrl.startsWith('http')) {
      await deletePromoImage(prevUrl);
    }
    const fallbackUrl = target === 'pc' ? DEFAULT_PROMO_SETTINGS.image : DEFAULT_PROMO_SETTINGS.mobileImage;
    const updated = target === 'pc' ? { ...settings, image: fallbackUrl } : { ...settings, mobileImage: fallbackUrl };
    setSettings(updated);
    await updateSiteSetting('active_promotion', normalizePromoSettings(updated));
    toast.success(`Fundalul ${target === 'pc' ? 'PC' : 'Mobil'} a fost resetat la varianta TrenZone.`);
  };

  const handleCropUpload = async () => {
    if (!imgRef.current || !completedCrop) return;
    setUploadingImage(true);
    try {
      const blob = await getCroppedImg(imgRef.current, completedCrop);
      if (!blob) throw new Error('Failed to create crop blob');
      const file = new File([blob], `promo-${uploadTarget}-${Date.now()}.webp`, { type: 'image/webp' });
      await uploadBlobOrFile(file);
    } catch (error: any) {
      toast.error('Eroare upload: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleOriginalUpload = async () => {
    if (!selectedFile) return;
    setUploadingImage(true);
    try {
      await uploadBlobOrFile(selectedFile);
    } catch (error: any) {
      toast.error('Eroare upload: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleTextChange = (lang: 'ro' | 'en', field: keyof PromoLocaleText, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [lang]: { ...prev[lang], [field]: value },
    }));
  };

  const handleWeightChange = (pct: string, val: number) => {
    setSettings((prev) => ({
      ...prev,
      scratchWeights: {
        ...prev.scratchWeights,
        [pct]: Math.max(0, Math.min(100, val)),
      },
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
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#e32f8c]" />
      </div>
    );
  }

  const previewCopy = previewLang === 'ro' ? settings.ro : settings.en;
  const totalWeight = ['3', '4', '5', '6', '7'].reduce((s, k) => s + (Number(settings.scratchWeights?.[k]) || 0), 0) || 1;
  const selectedCouponObj = coupons.find((c) => c.code === settings.couponId);

  const previewTitleWords = (previewCopy.title || '').trim().split(/\s+/);
  const splitIdx = Math.max(1, Math.ceil(previewTitleWords.length * 0.6));
  const titleFirst = previewTitleWords.slice(0, splitIdx).join(' ');
  const titleAccent = previewTitleWords.slice(splitIdx).join(' ');

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-12">
      {/* CROP MODAL */}
      {imgSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg sm:text-xl font-black flex items-center gap-2">
                <CropIcon size={20} className="text-[#e32f8c]" /> Ajustează Fundal {uploadTarget === 'pc' ? 'PC (16:9)' : 'Mobil (9:16)'}
              </h3>
              <button
                onClick={() => {
                  setImgSrc('');
                  setSelectedFile(null);
                }}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex gap-1.5 mb-4 overflow-x-auto pb-2">
              <button onClick={() => handleAspectChange(16 / 9)} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold ${aspect === 16 / 9 ? 'bg-[#e32f8c] text-black' : 'bg-slate-100 text-slate-600'}`}>PC Wide (16:9)</button>
              <button onClick={() => handleAspectChange(9 / 16)} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold ${aspect === 9 / 16 ? 'bg-[#e32f8c] text-black' : 'bg-slate-100 text-slate-600'}`}>Mobil Vertical (9:16)</button>
              <button onClick={() => handleAspectChange(4 / 5)} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold ${aspect === 4 / 5 ? 'bg-[#e32f8c] text-black' : 'bg-slate-100 text-slate-600'}`}>4:5</button>
              <button onClick={() => handleAspectChange(undefined)} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold ${aspect === undefined ? 'bg-[#e32f8c] text-black' : 'bg-slate-100 text-slate-600'}`}>Liber</button>
            </div>

            <div className="bg-black rounded-xl overflow-hidden flex items-center justify-center p-2 sm:p-4 min-h-[240px]">
              <ReactCrop crop={crop} onChange={(_, pCrop) => setCrop(pCrop)} onComplete={(c) => setCompletedCrop(c)} aspect={aspect} className="max-h-[50vh]">
                <img ref={imgRef} alt="Crop" src={getOptimizedImageUrl(imgSrc)} onLoad={onImageLoad} className="max-h-[50vh] object-contain" />
              </ReactCrop>
            </div>

            <div className="flex flex-col sm:flex-row justify-between mt-4 gap-2 sm:gap-3">
              {selectedFile && (
                <button
                  onClick={handleOriginalUpload}
                  disabled={uploadingImage}
                  className="px-4 py-2.5 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 text-xs sm:text-sm"
                >
                  Încarcă Original (fără decupare)
                </button>
              )}
              <div className="flex gap-2 sm:ml-auto">
                <button
                  onClick={() => {
                    setImgSrc('');
                    setSelectedFile(null);
                  }}
                  className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 text-sm"
                >
                  Anulează
                </button>
                <button
                  onClick={handleCropUpload}
                  disabled={uploadingImage || !completedCrop?.width}
                  className="flex items-center gap-2 bg-[#e32f8c] text-black px-6 py-3 rounded-xl font-black hover:bg-[#c41a72] text-sm"
                >
                  {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload size={16} />}
                  <span>{uploadingImage ? 'Se încarcă...' : 'Salvează Imaginea'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#e32f8c]/10 border border-[#e32f8c]/20 flex items-center justify-center text-[#e32f8c] shrink-0">
            <Sparkles size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Popup Promoțional Scratch & Win</h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Cod unic 24h (3–7% aleatoriu ponderat) + fundaluri separate PC & Mobil editabile
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#e32f8c] hover:bg-[#c41a72] text-black px-6 py-3 rounded-2xl font-black shadow-md shadow-[#e32f8c]/20 transition-all disabled:opacity-50 text-sm sm:text-base"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save size={18} />}
          <span>{saving ? 'Se salvează...' : 'Salvează Modificările'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-5 space-y-5">
          {/* Status & Mode */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-5">
            <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Settings size={17} className="text-[#e32f8c]" /> Status & Reguli Premii
            </h2>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="block text-sm font-bold text-slate-900">Activează Popup-ul</span>
                <span className="block text-xs text-slate-500">Afișează oferta vizitatorilor noi</span>
              </div>
              <div className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${settings.isActive ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                <input type="checkbox" className="sr-only" checked={settings.isActive} onChange={(e) => setSettings({ ...settings, isActive: e.target.checked })} />
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${settings.isActive ? 'translate-x-8' : 'translate-x-1'} shadow-sm`} />
              </div>
            </label>

            {/* Mode selector */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Mod Popup</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, mode: 'scratch' })}
                  className={`px-3 py-2.5 rounded-xl text-xs font-black border transition-all ${
                    settings.mode === 'scratch' ? 'bg-[#e32f8c] text-black border-[#e32f8c]' : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  🎟️ Răzuire (3–7% Unic)
                </button>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, mode: 'newsletter' })}
                  className={`px-3 py-2.5 rounded-xl text-xs font-black border transition-all ${
                    settings.mode === 'newsletter' ? 'bg-[#e32f8c] text-black border-[#e32f8c]' : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  ✉️ Newsletter Cupon Fix
                </button>
              </div>
            </div>

            {settings.mode === 'scratch' ? (
              <div className="space-y-3 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Percent size={14} className="text-[#e32f8c]" /> Probabilități Câștig (3% – 7%)
                  </label>
                  <span className="text-[11px] font-bold text-slate-400">Medie: {(['3','4','5','6','7'].reduce((acc, k) => acc + Number(k) * ((Number(settings.scratchWeights?.[k]) || 0) / totalWeight), 0)).toFixed(1)}%</span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {(['3', '4', '5', '6', '7'] as const).map((pct) => {
                    const weight = Number(settings.scratchWeights?.[pct] ?? 0);
                    const realPct = Math.round((weight / totalWeight) * 100);
                    return (
                      <div key={pct} className="bg-slate-50 border border-slate-200 rounded-xl p-2 text-center">
                        <div className="text-xs font-black text-slate-900 mb-1">{pct}%</div>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={weight}
                          onChange={(e) => handleWeightChange(pct, Number(e.target.value))}
                          className="w-full text-center bg-white border border-slate-200 rounded-lg py-1 text-xs font-bold focus:outline-none focus:border-[#e32f8c]"
                        />
                        <div className="text-[10px] font-bold text-slate-400 mt-1">{realPct}% șansă</div>
                      </div>
                    );
                  })}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Valabilitate cod unic (ore)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={168}
                    value={settings.scratchTtlHours}
                    onChange={(e) => setSettings({ ...settings, scratchTtlHours: Math.max(1, Number(e.target.value) || 24) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-bold text-slate-900"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Codurile nefolosite expiră după {settings.scratchTtlHours}h și se șterg automat din baza de date.
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Cupon Fix Asociat</label>
                <div
                  className="flex items-center justify-between w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium cursor-pointer"
                  onClick={() => setIsCouponDropdownOpen(!isCouponDropdownOpen)}
                >
                  <div className="flex items-center gap-2">
                    <Ticket size={17} className="text-slate-400" />
                    <span className="font-bold text-slate-900">
                      {settings.couponId}{selectedCouponObj ? ` (${selectedCouponObj.value}${selectedCouponObj.type === 'percentage' ? '%' : ' RON'})` : ''}
                    </span>
                  </div>
                  <ChevronDown size={17} className="text-slate-400" />
                </div>
                {isCouponDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsCouponDropdownOpen(false)} />
                    <div className="absolute top-full mt-2 left-0 w-full bg-white border border-slate-100 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto py-1">
                      {coupons.map((c) => (
                        <div
                          key={c.code}
                          onClick={() => { setSettings({ ...settings, couponId: c.code }); setIsCouponDropdownOpen(false); }}
                          className="px-4 py-2.5 text-sm font-bold hover:bg-slate-50 cursor-pointer flex justify-between"
                        >
                          <span>{c.code}</span>
                          <span className="text-xs text-slate-500">{c.value}{c.type === 'percentage' ? '%' : ' RON'}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Întârziere (sec)</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={settings.delaySeconds}
                  onChange={(e) => setSettings({ ...settings, delaySeconds: Math.max(1, Number(e.target.value) || 6) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Cooldown (ore)</label>
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  max={720}
                  value={settings.cooldownHours}
                  onChange={(e) => setSettings({ ...settings, cooldownHours: Math.max(0.5, Number(e.target.value) || 24) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-bold"
                />
              </div>
            </div>

            {/* Optional campaign expiry */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expirare Campanie (Opțional)</label>
                {settings.endDate && (
                  <button type="button" onClick={() => setSettings({ ...settings, endDate: '' })} className="text-[11px] font-bold text-red-500">Resetează</button>
                )}
              </div>
              <div
                onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                className="flex items-center gap-2 w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm cursor-pointer"
              >
                <Calendar size={16} className="text-slate-400" />
                <span className={settings.endDate ? 'font-bold text-slate-900' : 'text-slate-400'}>
                  {settings.endDate ? format(selectedDate!, 'dd MMMM yyyy, HH:mm', { locale: ro }) : 'Fără dată de oprire'}
                </span>
              </div>
              {isDatePickerOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDatePickerOpen(false)} />
                  <div className="absolute top-full mt-2 left-0 w-full sm:w-[300px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 hover:bg-slate-100 rounded-full"><ChevronLeft size={16} /></button>
                      <span className="font-bold text-sm capitalize">{format(currentMonth, 'MMMM yyyy', { locale: ro })}</span>
                      <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 hover:bg-slate-100 rounded-full"><ChevronRight size={16} /></button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 mb-3">
                      {days.map((day, i) => {
                        const isSel = selectedDate && isSameDay(day, selectedDate);
                        return (
                          <button
                            key={i}
                            onClick={() => handleDaySelect(day)}
                            className={`aspect-square text-xs rounded-full ${!isSameMonth(day, monthStart) ? 'text-slate-300' : 'text-slate-700'} ${isSel ? 'bg-[#e32f8c] text-black font-black' : ''}`}
                          >
                            {format(day, 'd')}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between border-t pt-3">
                      <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><Clock size={14} /> Oră</span>
                      <div className="flex items-center gap-1.5">
                        <input type="number" min={0} max={23} value={selectedDate ? format(selectedDate, 'HH') : '23'} onChange={(e) => handleTimeChange('hours', e.target.value)} className="w-11 text-center bg-slate-50 border rounded-lg py-1 text-xs font-bold" />
                        <span>:</span>
                        <input type="number" min={0} max={59} value={selectedDate ? format(selectedDate, 'mm') : '59'} onChange={(e) => handleTimeChange('minutes', e.target.value)} className="w-11 text-center bg-slate-50 border rounded-lg py-1 text-xs font-bold" />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Dual Backgrounds Card: PC & Mobile */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-5">
            <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <ImageIcon size={17} className="text-[#e32f8c]" /> Fundaluri Personalizate (PC & Mobil)
            </h2>

            {/* PC IMAGE */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-700 flex items-center gap-1.5"><Monitor size={14} /> Fundal PC (Landscape 16:9)</span>
                <button type="button" onClick={() => handleResetDefaultImage('pc')} className="text-[11px] font-bold text-slate-400 hover:text-[#e32f8c]">Reset TrenZone</button>
              </div>
              <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-black group">
                <Image src={getOptimizedImageUrl(settings.image)} alt="PC Promo Bg" fill sizes="400px" className="object-cover" />
                <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <label className="cursor-pointer bg-white text-black px-3.5 py-2 rounded-xl text-xs font-black">
                    Schimbă PC
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => onSelectFile('pc', e)} />
                  </label>
                </div>
              </div>
            </div>

            {/* MOBILE IMAGE */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-700 flex items-center gap-1.5"><Smartphone size={14} /> Fundal Mobil (Portrait 9:16)</span>
                <button type="button" onClick={() => handleResetDefaultImage('mobile')} className="text-[11px] font-bold text-slate-400 hover:text-[#e32f8c]">Reset TrenZone</button>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative w-28 aspect-[9/16] rounded-xl overflow-hidden border border-slate-200 bg-black shrink-0">
                  <Image src={getOptimizedImageUrl(settings.mobileImage)} alt="Mobile Promo Bg" fill sizes="120px" className="object-cover" />
                </div>
                <div className="space-y-2 flex-1">
                  <label className="cursor-pointer inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-900 px-4 py-2.5 rounded-xl text-xs font-bold">
                    <Upload size={14} /> Încarcă Fundal Mobil
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => onSelectFile('mobile', e)} />
                  </label>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Pe telefon, produsul stă jos sub linia neon pentru a lăsa cardul de răzuit perfect vizibil deasupra.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Scratch Preview + Copy */}
        <div className="lg:col-span-7 space-y-5">
          {/* LIVE PREVIEW */}
          <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Eye size={17} className="text-[#e32f8c]" /> Previzualizare Live
              </h2>
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-xl bg-slate-100 p-1">
                  <button type="button" onClick={() => setPreviewLang('ro')} className={`px-2.5 py-1 rounded-lg text-[11px] font-black ${previewLang === 'ro' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}>RO</button>
                  <button type="button" onClick={() => setPreviewLang('en')} className={`px-2.5 py-1 rounded-lg text-[11px] font-black ${previewLang === 'en' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}>EN</button>
                </div>
                <div className="inline-flex rounded-xl bg-slate-100 p-1">
                  <button type="button" onClick={() => setPreviewMode('desktop')} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold ${previewMode === 'desktop' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}><Monitor size={13} /> PC</button>
                  <button type="button" onClick={() => setPreviewMode('mobile')} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold ${previewMode === 'mobile' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}><Smartphone size={13} /> Mobil</button>
                </div>
              </div>
            </div>

            <div className="flex justify-center rounded-2xl bg-slate-950 p-4 sm:p-6">
              <div
                className={`relative overflow-hidden rounded-[22px] border border-white/15 bg-[#07070b] shadow-2xl flex ${
                  previewMode === 'mobile' ? 'w-[300px] min-h-[480px] flex-col' : 'w-full min-h-[340px] flex-row'
                }`}
              >
                <img
                  src={getOptimizedImageUrl(previewMode === 'mobile' ? settings.mobileImage : settings.image)}
                  alt="Preview"
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#07070b]/80 via-[#07070b]/40 to-transparent md:bg-gradient-to-r" />

                <div
                  className={`relative z-10 flex flex-col items-center justify-center text-center ${
                    previewMode === 'mobile' ? 'w-full px-5 pt-6 pb-40' : 'w-[50%] px-6 py-6'
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-200 mb-2">
                    {previewCopy.badge}
                  </span>
                  <div className="font-[family-name:var(--font-oswald)] text-2xl sm:text-3xl font-black uppercase leading-none text-white">
                    {titleFirst} {titleAccent && <span className="text-[#e32f8c]">{titleAccent}</span>}
                  </div>
                  <div className="mt-3 w-full max-w-[230px] h-[96px] rounded-xl border border-[#e32f8c]/50 bg-[#1c091a]/90 flex items-center justify-center shadow-[0_0_24px_-6px_rgba(227,47,140,0.6)]">
                    <span className="font-[family-name:var(--font-oswald)] text-lg font-black text-[#ff4fa8] tracking-wide">
                      {previewCopy.button}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RO Texts */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-black">RO</span>
              Texte Română
            </h2>
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Badge Sus</label>
                <input type="text" value={settings.ro.badge} onChange={(e) => handleTextChange('ro', 'badge', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Titlu</label>
                <input type="text" value={settings.ro.title} onChange={(e) => handleTextChange('ro', 'title', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Text Card Răzuire</label>
                <input type="text" value={settings.ro.button} onChange={(e) => handleTextChange('ro', 'button', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Link Alternativ</label>
                <input type="text" value={settings.ro.skipLink} onChange={(e) => handleTextChange('ro', 'skipLink', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium" />
              </div>
            </div>
          </div>

          {/* EN Texts */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-[10px] font-black">EN</span>
              Texte Engleză
            </h2>
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Top Badge</label>
                <input type="text" value={settings.en.badge} onChange={(e) => handleTextChange('en', 'badge', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Main Title</label>
                <input type="text" value={settings.en.title} onChange={(e) => handleTextChange('en', 'title', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Scratch Card Text</label>
                <input type="text" value={settings.en.button} onChange={(e) => handleTextChange('en', 'button', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Instant Reveal Link</label>
                <input type="text" value={settings.en.skipLink} onChange={(e) => handleTextChange('en', 'skipLink', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
