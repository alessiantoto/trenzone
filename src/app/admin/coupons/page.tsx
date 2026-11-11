"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Ticket, 
  Plus, 
  Search, 
  Timer, 
  Tag, 
  Trash2, 
  Edit2, 
  Zap, 
  X, 
  Loader2, 
  Percent, 
  Save, 
  UserCheck,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Copy,
  CheckCheck,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Truck,
  DollarSign,
  TrendingUp,
  Users,
  CheckCircle2,
  AlertCircle,
  Hash,
  ExternalLink
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  isValid 
} from 'date-fns';
import { ro } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  createCoupon, 
  updateCoupon, 
  deleteCoupon,
  toggleCouponStatus 
} from '@/app/actions/coupons';
import { linkAffiliateCoupon } from '@/app/actions/admin-affiliates';
import toast from 'react-hot-toast';

// 🌟 MODERN COUPON DATE & TIME PICKER COMPONENT
function ModernCouponDatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = useMemo(() => {
    if (!value) return null;
    const d = new Date(value);
    return isValid(d) ? d : null;
  }, [value]);

  const [currentMonth, setCurrentMonth] = useState<Date>(selectedDate || new Date());
  const [hours, setHours] = useState<number>(selectedDate ? selectedDate.getHours() : 23);
  const [minutes, setMinutes] = useState<number>(selectedDate ? selectedDate.getMinutes() : 59);

  useEffect(() => {
    if (selectedDate) {
      setCurrentMonth(selectedDate);
      setHours(selectedDate.getHours());
      setMinutes(selectedDate.getMinutes());
    }
  }, [selectedDate]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const updateDateTime = (d: Date, h: number, m: number) => {
    const updated = new Date(d);
    updated.setHours(h, m, 0, 0);
    onChange(updated.toISOString());
  };

  const handleSelectDay = (d: Date) => {
    updateDateTime(d, hours, minutes);
  };

  const handleTimeChange = (newH: number, newM: number) => {
    const validH = Math.max(0, Math.min(23, newH));
    const validM = Math.max(0, Math.min(59, newM));
    setHours(validH);
    setMinutes(validM);
    const base = selectedDate || new Date();
    updateDateTime(base, validH, validM);
  };

  const applyPreset = (daysAhead: number | null, presetHours = 23, presetMinutes = 59) => {
    if (daysAhead === null) {
      onChange('');
      setIsOpen(false);
      return;
    }
    const target = addDays(new Date(), daysAhead);
    setHours(presetHours);
    setMinutes(presetMinutes);
    updateDateTime(target, presetHours, presetMinutes);
  };

  const getRemainingInfo = () => {
    if (!selectedDate) return { text: 'Permanent (Fără expirare)', isPast: false, isPermanent: true };
    const diff = selectedDate.getTime() - Date.now();
    if (diff <= 0) return { text: 'Expirat', isPast: true, isPermanent: false };
    const daysLeft = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hoursLeft = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minsLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (daysLeft > 0) return { text: `Expiră în ${daysLeft}z ${hoursLeft}h`, isPast: false, isPermanent: false };
    if (hoursLeft > 0) return { text: `Expiră în ${hoursLeft}h ${minsLeft}m`, isPast: false, isPermanent: false };
    return { text: `Expiră în ${minsLeft}m`, isPast: false, isPermanent: false };
  };

  const remaining = getRemainingInfo();

  return (
    <div className="space-y-2 relative" ref={containerRef}>
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
          <Calendar size={13} className="text-[#008ba3]" />
          <span>Dată & Oră Expirare</span>
        </label>
        {value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="text-[11px] font-bold text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <X size={11} />
            <span>Fără expirare</span>
          </button>
        )}
      </div>

      {/* Trigger Box */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-slate-50 hover:bg-slate-100/90 active:bg-slate-200/50 border rounded-2xl p-3 sm:p-3.5 transition-all cursor-pointer flex items-center justify-between gap-3 group shadow-2xs ${
          isOpen ? 'border-[#e32f8c] ring-2 ring-[#e32f8c]/20 bg-white' : 'border-slate-200 hover:border-[#e32f8c]'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#008ba3] shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
            <Clock size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-black text-slate-900 truncate capitalize">
              {selectedDate ? (
                format(selectedDate, "EEEE, d MMMM yyyy, 'ora' HH:mm", { locale: ro })
              ) : (
                <span className="text-slate-500 font-bold">Valabil Permanent (Nicio dată setată)</span>
              )}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  remaining.isPermanent
                    ? 'bg-slate-100 text-slate-600'
                    : remaining.isPast
                    ? 'bg-red-100 text-red-700'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {!remaining.isPermanent && <span className={`w-1.5 h-1.5 rounded-full ${remaining.isPast ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`} />}
                {remaining.text}
              </span>
              <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                {selectedDate ? 'Apasă pentru a schimba' : 'Apasă pentru a seta dată și oră'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <ChevronDown
            size={16}
            className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#e32f8c]' : ''}`}
          />
        </div>
      </div>

      {/* Expanded Interactive Calendar & Time Picker */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="w-full bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-4 z-40 mt-2"
          >
            {/* Quick Presets */}
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Presetări Rapide</p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset(null)}
                  className={`px-2 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer text-center ${
                    !selectedDate
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  Permanent
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(1, 23, 59)}
                  className="px-2 py-1.5 rounded-xl text-[11px] font-bold bg-slate-50 hover:bg-[#e32f8c]/15 hover:text-[#008ba3] text-slate-700 border border-slate-200 transition-all cursor-pointer text-center"
                >
                  +24 Ore
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(7, 23, 59)}
                  className="px-2 py-1.5 rounded-xl text-[11px] font-bold bg-slate-50 hover:bg-[#e32f8c]/15 hover:text-[#008ba3] text-slate-700 border border-slate-200 transition-all cursor-pointer text-center"
                >
                  +7 Zile
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(30, 23, 59)}
                  className="px-2 py-1.5 rounded-xl text-[11px] font-bold bg-slate-50 hover:bg-[#e32f8c]/15 hover:text-[#008ba3] text-slate-700 border border-slate-200 transition-all cursor-pointer text-center"
                >
                  +30 Zile
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(90, 23, 59)}
                  className="px-2 py-1.5 rounded-xl text-[11px] font-bold bg-slate-50 hover:bg-[#e32f8c]/15 hover:text-[#008ba3] text-slate-700 border border-slate-200 transition-all cursor-pointer text-center"
                >
                  +3 Luni
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const endOfYear = new Date(new Date().getFullYear(), 11, 31, 23, 59, 0);
                    setHours(23);
                    setMinutes(59);
                    onChange(endOfYear.toISOString());
                  }}
                  className="px-2 py-1.5 rounded-xl text-[11px] font-bold bg-slate-50 hover:bg-[#e32f8c]/15 hover:text-[#008ba3] text-slate-700 border border-slate-200 transition-all cursor-pointer text-center"
                >
                  Sfârșit An
                </button>
              </div>
            </div>

            {/* Calendar Header */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
              <h4 className="text-xs sm:text-sm font-black text-slate-800 capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: ro })}
              </h4>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
                  title="Luna precedentă"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentMonth(new Date())}
                  className="px-2.5 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700 transition-colors cursor-pointer"
                  title="Luna curentă"
                >
                  Azi
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
                  title="Luna următoare"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Days of Week */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ', 'Du'].map((d) => (
                <div key={d} className="text-[10px] font-black text-slate-400 py-1 uppercase">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => {
                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                const isToday = isSameDay(day, new Date());
                const isCurrentMonthDay = isSameMonth(day, currentMonth);

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => handleSelectDay(day)}
                    className={`h-9 sm:h-10 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-[#e32f8c] text-black font-black shadow-md shadow-[#e32f8c]/30 scale-105 z-10'
                        : isToday
                        ? 'bg-slate-100 text-[#008ba3] font-black border border-[#e32f8c]/40'
                        : isCurrentMonthDay
                        ? 'text-slate-800 hover:bg-slate-100 hover:text-slate-950'
                        : 'text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {format(day, 'd')}
                    {isToday && !isSelected && (
                      <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#e32f8c]" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Time Selector */}
            <div className="pt-3 border-t border-slate-100 bg-slate-50/70 p-3 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                  <Clock size={12} className="text-[#008ba3]" />
                  <span>Ora & Minutul Expirării</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleTimeChange(12, 0)}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 cursor-pointer"
                  >
                    12:00
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTimeChange(18, 0)}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 cursor-pointer"
                  >
                    18:00
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTimeChange(23, 59)}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 cursor-pointer"
                  >
                    23:59
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3">
                {/* Hour */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleTimeChange((hours - 1 + 24) % 24, minutes)}
                    className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center cursor-pointer shadow-2xs"
                  >
                    -
                  </button>
                  <div className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 min-w-[52px] text-center shadow-2xs">
                    <span className="text-sm font-black text-slate-900 font-mono">
                      {String(hours).padStart(2, '0')}
                    </span>
                    <span className="text-[9px] block text-slate-400 font-bold uppercase">Ora</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTimeChange((hours + 1) % 24, minutes)}
                    className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center cursor-pointer shadow-2xs"
                  >
                    +
                  </button>
                </div>

                <span className="text-lg font-black text-slate-400 font-mono">:</span>

                {/* Minute */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleTimeChange(hours, (minutes - 5 + 60) % 60)}
                    className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center cursor-pointer shadow-2xs"
                  >
                    -
                  </button>
                  <div className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 min-w-[52px] text-center shadow-2xs">
                    <span className="text-sm font-black text-slate-900 font-mono">
                      {String(minutes).padStart(2, '0')}
                    </span>
                    <span className="text-[9px] block text-slate-400 font-bold uppercase">Min</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTimeChange(hours, (minutes + 5) % 60)}
                    className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center cursor-pointer shadow-2xs"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Done Button */}
            <div className="pt-1 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full sm:w-auto px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Check size={14} className="text-[#e32f8c]" />
                <span>Gata, Confirmă Data</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'manual' | 'auto'>('manual');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [selectedAffiliateId, setSelectedAffiliateId] = useState<string>('');
  const [couponToDelete, setCouponToDelete] = useState<{ id: string; code: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    type: 'percentage' as 'percentage' | 'fixed_amount' | 'free_shipping',
    value: 10,
    usage_limit: '',
    expiry_date: ''
  });

  const fetchCoupons = async () => {
    try {
      const [couponsRes, affRes] = await Promise.all([
        fetch('/api/admin/data?action=coupons').then(r => r.json()),
        fetch('/api/admin/data?action=affiliates').then(r => r.json()).catch(() => ({ data: { affiliates: [] } }))
      ]);
      setCoupons(couponsRes.data || []);
      setAffiliates(affRes.data?.affiliates || []);
    } catch (err) {
      console.error("Failed to fetch coupons:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Codul ${code} a fost copiat!`, { id: `copy-${code}` });
    setTimeout(() => {
      setCopiedCode(null);
    }, 2000);
  };

  const handleToggleStatus = async (coupon: any) => {
    try {
      const current = coupon.is_active ?? true;
      // Optimistic update
      setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, is_active: !current } : c));
      await toggleCouponStatus(coupon.id, current);
      toast.success(current ? `Cuponul ${coupon.code} a fost dezactivat.` : `Cuponul ${coupon.code} este acum activ!`);
    } catch (err) {
      toast.error("Nu s-a putut actualiza statusul cuponului.");
      fetchCoupons();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim()) {
      toast.error("Te rugăm să introduci codul cuponului.");
      return;
    }

    setIsSubmitting(true);
    try {
      const couponPayload = {
        code: formData.code.toUpperCase().trim(),
        type: formData.type,
        value: formData.type === 'free_shipping' ? 0 : Number(formData.value),
        usage_limit: formData.usage_limit ? Number(formData.usage_limit) : null,
        expiry_date: formData.expiry_date || null,
      };

      const res = editingCouponId 
        ? await updateCoupon(editingCouponId, couponPayload)
        : await createCoupon(couponPayload);

      if (res.success) {
        if (selectedAffiliateId) {
          await linkAffiliateCoupon(selectedAffiliateId, formData.code.toUpperCase().trim());
        }
        setIsModalOpen(false);
        setEditingCouponId(null);
        setSelectedAffiliateId('');
        setFormData({ code: '', type: 'percentage', value: 10, usage_limit: '', expiry_date: '' });
        await fetchCoupons();
        toast.success(editingCouponId ? "Cuponul a fost actualizat!" : "Cuponul a fost creat cu succes!");
      } else {
        toast.error("Eroare: " + res.error);
      }
    } catch (err) {
      toast.error("A apărut o eroare la salvarea cuponului.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setEditingCouponId(null);
    setSelectedAffiliateId('');
    setFormData({ 
      code: '', 
      type: 'percentage', 
      value: 10, 
      usage_limit: '', 
      expiry_date: '' 
    });
    setIsModalOpen(true);
  };

  const openEditModal = (coupon: any) => {
    setEditingCouponId(coupon.id);
    const matchedAff = affiliates.find(a => a.code && a.code.toUpperCase() === coupon.code.toUpperCase());
    setSelectedAffiliateId(matchedAff ? matchedAff.id : '');
    setFormData({
      code: coupon.code,
      type: coupon.type || 'percentage',
      value: coupon.value || 0,
      usage_limit: coupon.usage_limit ? coupon.usage_limit.toString() : '',
      expiry_date: coupon.expiry_date || coupon.expires_at || ''
    });
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!couponToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteCoupon(couponToDelete.id);
      if (res.success) {
        toast.success(`Cuponul ${couponToDelete.code} a fost șters.`);
        setCoupons(prev => prev.filter(c => c.id !== couponToDelete.id));
        setCouponToDelete(null);
      } else {
        toast.error(res.error || "Eroare la ștergere.");
      }
    } catch (err) {
      toast.error("A apărut o eroare la ștergerea cuponului.");
    } finally {
      setIsDeleting(false);
    }
  };

  const isAutomated = (code: string) => {
    const upper = (code || '').toUpperCase();
    return (
      upper.startsWith('SCRATCH-') ||
      upper.startsWith('NEWS-') ||
      upper.startsWith('NEWSLETTER') ||
      upper.startsWith('REVIEW') ||
      upper.startsWith('REV-')
    );
  };

  // KPIs
  const stats = useMemo(() => {
    const total = coupons.length;
    let active = 0;
    let expired = 0;
    let usages = 0;

    coupons.forEach(c => {
      const isAct = c.is_active ?? true;
      const exp = c.expiry_date || c.expires_at;
      const isPast = exp ? new Date(exp) <= new Date() : false;
      const used = c.used_count ?? c.times_used ?? 0;
      usages += used;

      if (isPast) {
        expired++;
      } else if (isAct) {
        active++;
      }
    });

    return { total, active, expired, usages };
  }, [coupons]);

  // Tab counts
  const manualCount = useMemo(() => coupons.filter(c => !isAutomated(c.code)).length, [coupons]);
  const autoCount = useMemo(() => coupons.filter(c => isAutomated(c.code)).length, [coupons]);

  // Filtered coupons
  const filteredCoupons = useMemo(() => {
    return coupons.filter(c => {
      const q = searchQuery.toLowerCase().trim();
      const codeMatches = c.code.toLowerCase().includes(q);
      
      // Also match affiliate name or email if associated
      const matchedAff = affiliates.find(a => a.code && a.code.toUpperCase() === c.code.toUpperCase());
      const affMatches = matchedAff 
        ? matchedAff.name.toLowerCase().includes(q) || matchedAff.email.toLowerCase().includes(q)
        : false;

      const matchesSearch = !q || codeMatches || affMatches;
      const matchesTab = activeTab === 'manual' ? !isAutomated(c.code) : isAutomated(c.code);

      // Status filter
      const exp = c.expiry_date || c.expires_at;
      const isPast = exp ? new Date(exp) <= new Date() : false;
      const isAct = c.is_active ?? true;

      let matchesStatus = true;
      if (statusFilter === 'active') {
        matchesStatus = isAct && !isPast;
      } else if (statusFilter === 'expired') {
        matchesStatus = isPast;
      }

      return matchesSearch && matchesTab && matchesStatus;
    });
  }, [coupons, searchQuery, activeTab, statusFilter, affiliates]);

  const getDiscountLabel = (coupon: any) => {
    switch(coupon.type) {
      case 'percentage': return `${coupon.value}% Reducere`;
      case 'fixed_amount': return `${coupon.value} RON Reducere`;
      case 'free_shipping': return `Transport Gratuit`;
      default: return `${coupon.value}% Reducere`;
    }
  };

  const getAffiliateInfo = (code: string) => {
    return affiliates.find(a => a.code && a.code.toUpperCase() === code.toUpperCase());
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-700 pb-16 text-slate-900 max-w-6xl mx-auto space-y-6 sm:space-y-8 px-2 sm:px-0">
      
      {/* 🏁 HEADER & ACTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#e32f8c]/15 text-[#008ba3] flex items-center justify-center font-black shadow-2xs">
              <Ticket size={22} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl tracking-tight font-black text-slate-900">Cupoane Promoționale</h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">Controlul discount-urilor, campaniilor de marketing și afiliaților.</p>
            </div>
          </div>
        </div>

        <button 
          onClick={openCreateModal}
          className="h-11 px-5 bg-[#e32f8c] hover:bg-[#00bee0] active:scale-98 text-black rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 shadow-md shadow-[#e32f8c]/20 w-full sm:w-auto cursor-pointer"
        >
          <Plus size={18} />
          <span>Adaugă Cupon Nou</span>
        </button>
      </div>

      {/* 📊 KPI STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl sm:rounded-3xl shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Tag size={18} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block truncate">Total Cupoane</span>
            <span className="text-lg sm:text-xl font-black text-slate-900">{stats.total}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl sm:rounded-3xl shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block truncate">Active Acum</span>
            <span className="text-lg sm:text-xl font-black text-emerald-600">{stats.active}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl sm:rounded-3xl shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <TrendingUp size={18} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block truncate">Utilizări Totale</span>
            <span className="text-lg sm:text-xl font-black text-slate-900">{stats.usages}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl sm:rounded-3xl shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <AlertCircle size={18} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block truncate">Expirate</span>
            <span className="text-lg sm:text-xl font-black text-red-500">{stats.expired}</span>
          </div>
        </div>
      </div>

      {/* 🏷️ TABS & SEARCH & STATUS FILTER */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/60 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'manual' 
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>Manuale</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${activeTab === 'manual' ? 'bg-[#e32f8c]/20 text-[#008ba3]' : 'bg-slate-200 text-slate-600'}`}>
              {manualCount}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('auto')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'auto' 
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>Automate</span>
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">(Răzuiri / Recenzii)</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${activeTab === 'auto' ? 'bg-[#e32f8c]/20 text-[#008ba3]' : 'bg-slate-200 text-slate-600'}`}>
              {autoCount}
            </span>
          </button>
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 self-start md:self-auto overflow-x-auto custom-scrollbar w-full md:w-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white font-black'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Toate
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white font-black'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Doar Active
          </button>
          <button
            onClick={() => setStatusFilter('expired')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'expired'
                ? 'bg-red-500 text-white font-black'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Doar Expirate
          </button>
        </div>
      </div>

      {/* 📋 MAIN CONTAINER */}
      <div className="bg-white border border-slate-200/90 rounded-3xl shadow-sm overflow-hidden">
        
        {/* Search Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Caută după cod (ex: TREN10) sau nume afiliat..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl py-2 pl-10 pr-9 text-xs sm:text-sm font-medium focus:outline-none focus:border-[#e32f8c] focus:ring-2 focus:ring-[#e32f8c]/15 transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <span className="text-xs font-bold text-slate-500 shrink-0">
            {filteredCoupons.length} {filteredCoupons.length === 1 ? 'cupon' : 'cupoane'}
          </span>
        </div>

        {/* 📱 MOBILE VIEW (Rich Modern Cards) */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="p-4 flex flex-col gap-3 animate-pulse">
                <div className="h-6 bg-slate-100 rounded-xl w-1/2" />
                <div className="h-4 bg-slate-100 rounded-xl w-3/4" />
                <div className="h-10 bg-slate-100 rounded-xl w-full mt-2" />
              </div>
            ))
          ) : filteredCoupons.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              <Ticket size={36} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-bold">Niciun cupon găsit.</p>
              <p className="text-xs text-slate-400 mt-1">Apasă pe „Adaugă Cupon Nou” pentru a începe.</p>
            </div>
          ) : (
            filteredCoupons.map((coupon) => {
              const aff = getAffiliateInfo(coupon.code);
              const expiry = coupon.expiry_date || coupon.expires_at;
              const hasExpiry = Boolean(expiry);
              const isExpired = hasExpiry ? new Date(expiry) <= new Date() : false;
              const isActive = coupon.is_active ?? true;
              const usedCount = coupon.used_count ?? coupon.times_used ?? 0;
              const limit = coupon.usage_limit;
              const limitReached = limit ? usedCount >= limit : false;

              return (
                <div key={coupon.id} className="p-4 sm:p-5 flex flex-col gap-3.5 hover:bg-slate-50/60 transition-colors">
                  
                  {/* Top Bar: Code, Status & Copy */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#e32f8c]/15 text-[#008ba3] flex items-center justify-center shrink-0">
                        <Ticket size={16} />
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono font-black text-slate-900 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-xl text-sm tracking-wider truncate">
                          {coupon.code}
                        </span>
                        <button
                          onClick={() => handleCopyCode(coupon.code)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Copiază codul"
                        >
                          {copiedCode === coupon.code ? <CheckCheck size={15} className="text-emerald-500" /> : <Copy size={15} />}
                        </button>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {isExpired ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-red-100 text-red-700 border border-red-200">
                          EXPIRAT
                        </span>
                      ) : limitReached ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                          LIMITĂ ATINSĂ
                        </span>
                      ) : isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          ACTIV
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-200">
                          INACTIV
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Affiliate Link Pill (if assigned) */}
                  {aff && (
                    <div className="flex items-center gap-2 bg-purple-50/80 border border-purple-100 px-3 py-1.5 rounded-xl text-xs font-bold text-purple-900">
                      <UserCheck size={14} className="text-purple-600 shrink-0" />
                      <span className="truncate">Afiliat: {aff.name} ({aff.email})</span>
                    </div>
                  )}

                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50/80 p-3 rounded-2xl border border-slate-100 text-xs">
                    {/* Discount */}
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Discount</span>
                      <span className="font-black text-slate-900 text-xs truncate">
                        {getDiscountLabel(coupon)}
                      </span>
                    </div>

                    {/* Expiration */}
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Expirare</span>
                      <span className={`font-bold text-xs truncate ${isExpired ? 'text-red-500' : 'text-slate-700'}`}>
                        {hasExpiry ? (
                          format(new Date(expiry), 'd MMM yyyy, HH:mm', { locale: ro })
                        ) : (
                          'Permanent'
                        )}
                      </span>
                    </div>

                    {/* Usage */}
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Utilizări</span>
                      <span className="font-black text-slate-900 text-xs">
                        {usedCount} {limit ? `/ ${limit}` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Actions Bar */}
                  <div className="flex items-center justify-between pt-1 gap-2">
                    {/* Toggle Active Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(coupon)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      <span>{isActive ? 'Dezactivează' : 'Activează'}</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => openEditModal(coupon)}
                        className="h-8 px-3 text-xs font-bold text-slate-700 hover:text-[#008ba3] bg-slate-100 hover:bg-[#e32f8c]/15 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 size={13} />
                        <span>Editează</span>
                      </button>
                      <button 
                        onClick={() => setCouponToDelete({ id: coupon.id, code: coupon.code })}
                        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center justify-center cursor-pointer"
                        title="Șterge"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                </div>
              );
            })
          )}
        </div>

        {/* 💻 DESKTOP VIEW (Refined Modern Table) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4">Cod Cupon & Afiliat</th>
                <th className="px-6 py-4">Tip & Valoare Discount</th>
                <th className="px-6 py-4">Performanță / Limită</th>
                <th className="px-6 py-4">Dată & Oră Expirare</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Acțiuni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-5">
                      <div className="h-5 bg-slate-100 rounded-xl w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredCoupons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-500 text-sm font-bold">
                    <Ticket size={36} className="mx-auto text-slate-300 mb-2" />
                    Niciun cupon găsit conform filtrelor alese.
                  </td>
                </tr>
              ) : (
                filteredCoupons.map((coupon) => {
                  const aff = getAffiliateInfo(coupon.code);
                  const expiry = coupon.expiry_date || coupon.expires_at;
                  const hasExpiry = Boolean(expiry);
                  const isExpired = hasExpiry ? new Date(expiry) <= new Date() : false;
                  const isActive = coupon.is_active ?? true;
                  const usedCount = coupon.used_count ?? coupon.times_used ?? 0;
                  const limit = coupon.usage_limit;
                  const limitReached = limit ? usedCount >= limit : false;

                  return (
                    <tr key={coupon.id} className="group hover:bg-slate-50/70 transition-colors">
                      {/* Code & Affiliate */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#e32f8c]/10 text-[#008ba3] flex items-center justify-center shrink-0">
                            <Ticket size={16} />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-black font-mono text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                                {coupon.code}
                              </span>
                              <button
                                onClick={() => handleCopyCode(coupon.code)}
                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Copiază codul"
                              >
                                {copiedCode === coupon.code ? <CheckCheck size={13} className="text-emerald-500" /> : <Copy size={13} />}
                              </button>
                            </div>
                            {aff ? (
                              <p className="text-[11px] font-bold text-purple-600 flex items-center gap-1 mt-1">
                                <UserCheck size={11} /> {aff.name} ({aff.email})
                              </p>
                            ) : (
                              <p className="text-[11px] text-slate-400 font-medium mt-0.5">Cupon general magazin</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Discount Value */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-800 bg-slate-100 px-2.5 py-1 rounded-xl">
                          {coupon.type === 'free_shipping' ? <Truck size={13} className="text-[#008ba3]" /> : <Percent size={13} className="text-[#008ba3]" />}
                          {getDiscountLabel(coupon)}
                        </span>
                      </td>

                      {/* Usage */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-black text-slate-900">{usedCount}</span>
                            <span className="text-xs font-bold text-slate-400">
                              {limit ? `/ ${limit} utilizări` : 'utilizări'}
                            </span>
                          </div>
                          {limit && (
                            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${limitReached ? 'bg-amber-500' : 'bg-[#e32f8c]'}`}
                                style={{ width: `${Math.min(100, (usedCount / limit) * 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Expiration */}
                      <td className="px-6 py-4">
                        {hasExpiry ? (
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5 text-slate-700 text-xs font-bold">
                              <Clock size={12} className={isExpired ? 'text-red-500' : 'text-[#008ba3]'} />
                              <span className={isExpired ? 'text-red-600 font-black' : ''}>
                                {format(new Date(expiry), "d MMMM yyyy, 'ora' HH:mm", { locale: ro })}
                              </span>
                            </div>
                            <span className={`text-[10px] font-extrabold ${isExpired ? 'text-red-500' : 'text-slate-400'}`}>
                              {isExpired ? 'Expirat' : 'Valabil'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs font-bold">Permanent</span>
                        )}
                      </td>

                      {/* Status Toggle */}
                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(coupon)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black transition-all cursor-pointer ${
                            isExpired
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${isExpired ? 'bg-red-500' : isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          <span>{isExpired ? 'Expirat' : isActive ? 'Activ' : 'Inactiv'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={() => openEditModal(coupon)}
                            className="p-2 text-slate-400 hover:text-[#008ba3] hover:bg-[#e32f8c]/10 rounded-xl transition-colors cursor-pointer"
                            title="Editează"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => setCouponToDelete({ id: coupon.id, code: coupon.code })}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                            title="Șterge"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🛠️ CREATE / EDIT COUPON MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200/80"
            >
              {/* Modal Header */}
              <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#e32f8c]/20 text-[#008ba3] flex items-center justify-center font-black shadow-2xs">
                    <Zap size={20} />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900">
                      {editingCouponId ? 'Editează Cuponul' : 'Creează Cupon Nou'}
                    </h3>
                    <p className="text-[11px] sm:text-xs font-medium text-slate-500">
                      {editingCouponId ? 'Modifică parametrii, discountul și valabilitatea.' : 'Configurează un cod promoțional sau cupon de afiliat.'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-200/80 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
              
              {/* Scrollable Form Body */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 custom-scrollbar">
                
                {/* Affiliate Association */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider flex items-center gap-1.5">
                      <UserCheck size={12} className="text-purple-600" />
                      <span>Asociază cu Afiliat (Opțional)</span>
                    </label>
                    <span className="text-[10px] font-black text-[#008ba3] bg-[#e32f8c]/10 px-2 py-0.5 rounded-full">
                      {affiliates.length} afiliați
                    </span>
                  </div>
                  <select
                    value={selectedAffiliateId}
                    onChange={(e) => {
                      const affId = e.target.value;
                      setSelectedAffiliateId(affId);
                      if (affId) {
                        const matched = affiliates.find(a => a.id === affId);
                        if (matched) {
                          if (matched.code && matched.code !== 'N/A') {
                            setFormData(prev => ({ ...prev, code: matched.code.toUpperCase() }));
                          } else {
                            const baseName = (matched.name.split(' ')[0] || 'AFI').toUpperCase().replace(/[^A-Z0-9]/g, '');
                            setFormData(prev => ({ ...prev, code: `${baseName}10` }));
                          }
                        }
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl p-3 text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:border-[#e32f8c] focus:ring-2 focus:ring-[#e32f8c]/15 transition-all cursor-pointer"
                  >
                    <option value="">-- Fără afiliat (Cupon general magazin) --</option>
                    {affiliates.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.email}) {a.code && a.code !== 'N/A' ? `— Cod: ${a.code}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Coupon Code */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">
                      Cod Cupon *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const random = `TZ-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
                        setFormData(prev => ({ ...prev, code: random }));
                      }}
                      className="text-[10px] font-black text-[#008ba3] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles size={11} /> Generează Cod
                    </button>
                  </div>
                  <input 
                    required
                    type="text"
                    placeholder="EX: TREN20, VIP15, etc."
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm sm:text-base text-slate-900 focus:outline-none focus:border-[#e32f8c] focus:ring-2 focus:ring-[#e32f8c]/15 transition-all font-mono font-black tracking-widest uppercase placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400"
                  />
                </div>

                {/* Discount Type Selector */}
                <div>
                  <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider block mb-2">
                    Tip Discount
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'percentage' })}
                      className={`p-2.5 rounded-2xl text-xs font-black border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                        formData.type === 'percentage'
                          ? 'bg-[#e32f8c]/15 border-[#e32f8c] text-[#008ba3] shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Percent size={16} />
                      <span>Procent (%)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'fixed_amount' })}
                      className={`p-2.5 rounded-2xl text-xs font-black border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                        formData.type === 'fixed_amount'
                          ? 'bg-[#e32f8c]/15 border-[#e32f8c] text-[#008ba3] shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <DollarSign size={16} />
                      <span>Sumă Fixă (RON)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'free_shipping', value: 0 })}
                      className={`p-2.5 rounded-2xl text-xs font-black border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                        formData.type === 'free_shipping'
                          ? 'bg-[#e32f8c]/15 border-[#e32f8c] text-[#008ba3] shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Truck size={16} />
                      <span>Transport Gratuit</span>
                    </button>
                  </div>
                </div>

                {/* Discount Value */}
                {formData.type !== 'free_shipping' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">
                        Valoare Discount * ({formData.type === 'percentage' ? '%' : 'RON'})
                      </label>
                      <div className="flex items-center gap-1">
                        {(formData.type === 'percentage' ? [5, 10, 15, 20] : [15, 25, 50, 100]).map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setFormData({ ...formData, value: val })}
                            className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                          >
                            {val}{formData.type === 'percentage' ? '%' : 'L'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="relative">
                      <input 
                        required
                        type="number"
                        min="1"
                        max={formData.type === 'percentage' ? 100 : 10000}
                        value={formData.value}
                        onChange={(e) => setFormData({...formData, value: Number(e.target.value)})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 pr-12 text-sm sm:text-base text-slate-900 focus:outline-none focus:border-[#e32f8c] focus:ring-2 focus:ring-[#e32f8c]/15 transition-all font-black"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                        {formData.type === 'percentage' ? '%' : 'RON'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Usage Limit */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">
                      Limită Utilizări
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, usage_limit: '' })}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                      >
                        Nelimitat
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, usage_limit: '1' })}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                      >
                        1 (Unic)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, usage_limit: '50' })}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                      >
                        50
                      </button>
                    </div>
                  </div>
                  <input 
                    type="number"
                    min="1"
                    placeholder="Nelimitat (lasă liber pentru comenzi nelimitate)"
                    value={formData.usage_limit}
                    onChange={(e) => setFormData({...formData, usage_limit: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-[#e32f8c] focus:ring-2 focus:ring-[#e32f8c]/15 transition-all placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>

                {/* 🌟 Modern Date & Time Picker */}
                <ModernCouponDatePicker 
                  value={formData.expiry_date}
                  onChange={(val) => setFormData({ ...formData, expiry_date: val })}
                />
              </form>

              {/* Fixed Modal Footer */}
              <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/90 backdrop-blur flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-200/80 transition-all cursor-pointer"
                >
                  Anulează
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#e32f8c] hover:bg-[#00bee0] active:scale-98 text-black font-black text-xs sm:text-sm rounded-2xl transition-all flex items-center justify-center gap-2 shadow-md shadow-[#e32f8c]/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? (
                    <><Loader2 size={16} className="animate-spin" /> Se salvează...</>
                  ) : (
                    <><Save size={16} /> {editingCouponId ? 'Salvează Modificările' : 'Creează Cupon'}</>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ⚠️ DELETE CONFIRMATION DIALOG */}
      <AnimatePresence>
        {couponToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900">Șterge Cuponul?</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Ești sigur că dorești să ștergi definitiv cuponul <span className="font-mono font-black text-slate-900">{couponToDelete.code}</span>? Această acțiune este ireversibilă.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCouponToDelete(null)}
                  disabled={isDeleting}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Anulează
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  <span>Șterge</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
