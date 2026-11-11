"use client";

import { useState, useEffect, useMemo } from 'react';
import { 
  Settings as SettingsIcon, 
  AlertTriangle, 
  Loader2, 
  KeyRound, 
  ShieldAlert, 
  Trash2, 
  Plus, 
  TrendingUp, 
  RefreshCw,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  X,
  Lock,
  UserCheck,
  Eye,
  RotateCcw
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addHours, 
  addDays, 
  isValid 
} from 'date-fns';
import { ro } from 'date-fns/locale';
import { 
  toggleMaintenanceMode, 
  clearMaintenanceBypass,
  setMaintenancePassword, 
  setMaintenanceEndDate, 
  setExchangeRates 
} from '@/app/actions/admin-settings';
import { addAdminUser, removeAdminUser } from '@/app/actions/admin-users';
import { ClearCacheButton } from '../components/ClearCacheButton';
import toast from 'react-hot-toast';

// 🌟 MODERN MAINTENANCE DATE PICKER COMPONENT
function ModernMaintenanceDatePicker({
  value,
  onChange,
  onSave,
  saving,
}: {
  value: string;
  onChange: (val: string) => void;
  onSave: (valToSave?: string) => Promise<void> | void;
  saving: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedDate = useMemo(() => {
    if (!value) return null;
    const d = new Date(value);
    return isValid(d) ? d : null;
  }, [value]);

  const [currentMonth, setCurrentMonth] = useState<Date>(selectedDate || new Date());

  useEffect(() => {
    if (selectedDate) {
      setCurrentMonth(selectedDate);
    }
  }, [selectedDate]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const applyDate = (d: Date) => {
    const hours = selectedDate ? selectedDate.getHours() : 18;
    const minutes = selectedDate ? selectedDate.getMinutes() : 0;
    const updated = new Date(d);
    updated.setHours(hours, minutes, 0, 0);
    const formatted = format(updated, "yyyy-MM-dd'T'HH:mm");
    onChange(formatted);
  };

  const applyTime = (hours: number, minutes: number) => {
    const base = selectedDate || new Date();
    const updated = new Date(base);
    updated.setHours(hours, minutes, 0, 0);
    const formatted = format(updated, "yyyy-MM-dd'T'HH:mm");
    onChange(formatted);
  };

  const adjustHour = (delta: number) => {
    const base = selectedDate || new Date();
    let h = base.getHours() + delta;
    if (h < 0) h = 23;
    if (h > 23) h = 0;
    applyTime(h, base.getMinutes());
  };

  const adjustMinute = (delta: number) => {
    const base = selectedDate || new Date();
    let m = base.getMinutes() + delta;
    if (m < 0) m = 55;
    if (m > 59) m = 0;
    applyTime(base.getHours(), m);
  };

  const applyPreset = async (presetFn: () => Date, label: string) => {
    const newDate = presetFn();
    const formatted = format(newDate, "yyyy-MM-dd'T'HH:mm");
    onChange(formatted);
    await onSave(formatted);
  };

  const handleClear = async () => {
    onChange('');
    await onSave('');
    setIsOpen(false);
  };

  // Client-side remaining time calculation
  const [now, setNow] = useState<number>(0);
  useEffect(() => {
    setNow(Date.now());
  }, []);

  const remaining = useMemo(() => {
    if (!selectedDate || !now) return null;
    const diff = selectedDate.getTime() - now;
    if (diff <= 0) return { text: 'Expirat', isPast: true };
    const daysLeft = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hoursLeft = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minsLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (daysLeft > 0) return { text: `Expiră în ${daysLeft}z ${hoursLeft}h`, isPast: false };
    if (hoursLeft > 0) return { text: `Expiră în ${hoursLeft}h ${minsLeft}m`, isPast: false };
    return { text: `Expiră în ${minsLeft}m`, isPast: false };
  }, [selectedDate, now]);

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <label className="text-[11px] sm:text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Calendar size={14} className="text-[#e32f8c]" />
          <span>Dată & Oră Expirare Timer</span>
        </label>
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="text-[11px] font-bold text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
          >
            Șterge data
          </button>
        )}
      </div>

      {/* Selector Trigger Box */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-slate-50 hover:bg-slate-100/80 active:bg-slate-200/50 border rounded-2xl p-3 sm:p-3.5 transition-all cursor-pointer flex items-center justify-between gap-3 group shadow-2xs ${
          isOpen ? 'border-[#e32f8c] ring-2 ring-[#e32f8c]/20' : 'border-slate-200 hover:border-[#e32f8c]'
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
                <span className="text-slate-400 font-medium">Nicio dată setată (Fără timer)</span>
              )}
            </p>
            {remaining ? (
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mt-0.5 ${
                  remaining.isPast
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${remaining.isPast ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
                {remaining.text}
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">Apasă pentru a alege data și ora</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold text-[#008ba3] hidden sm:inline">
            {isOpen ? 'Închide' : 'Alege'}
          </span>
          <ChevronDown size={18} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#e32f8c]' : ''}`} />
        </div>
      </div>

      {/* Quick Presets: ONLY +1h, +3h, +1 zi as requested */}
      <div className="flex items-center gap-2 pt-0.5">
        <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider shrink-0">Rapid:</span>
        <button
          type="button"
          onClick={() => applyPreset(() => addHours(new Date(), 1), '+1h')}
          className="flex-1 py-2 px-3 bg-white hover:bg-[#e32f8c]/15 active:bg-[#e32f8c]/25 border border-slate-200 hover:border-[#e32f8c] rounded-xl text-xs font-black text-slate-800 transition-all cursor-pointer shadow-2xs text-center"
        >
          +1h
        </button>
        <button
          type="button"
          onClick={() => applyPreset(() => addHours(new Date(), 3), '+3h')}
          className="flex-1 py-2 px-3 bg-white hover:bg-[#e32f8c]/15 active:bg-[#e32f8c]/25 border border-slate-200 hover:border-[#e32f8c] rounded-xl text-xs font-black text-slate-800 transition-all cursor-pointer shadow-2xs text-center"
        >
          +3h
        </button>
        <button
          type="button"
          onClick={() => applyPreset(() => addDays(new Date(), 1), '+1 zi')}
          className="flex-1 py-2 px-3 bg-white hover:bg-[#e32f8c]/15 active:bg-[#e32f8c]/25 border border-slate-200 hover:border-[#e32f8c] rounded-xl text-xs font-black text-slate-800 transition-all cursor-pointer shadow-2xs text-center"
        >
          +1 zi
        </button>
      </div>

      {/* Inline Modern Calendar & Time Panel */}
      {isOpen && (
        <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 space-y-3.5 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Header Month / Year & Navigation */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/70">
            <button
              type="button"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 hover:bg-white active:bg-slate-200 rounded-xl text-slate-600 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
              title="Luna anterioară"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-2">
              <span className="font-heading font-black text-sm text-slate-900 capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: ro })}
              </span>
              {!isSameMonth(currentMonth, new Date()) && (
                <button
                  type="button"
                  onClick={() => setCurrentMonth(new Date())}
                  className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-[#e32f8c]/20 text-[#008ba3] hover:bg-[#e32f8c]/30 transition-colors"
                >
                  Azi
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 hover:bg-white active:bg-slate-200 rounded-xl text-slate-600 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
              title="Luna următoare"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ', 'Du'].map((d) => (
              <div key={d} className="text-[11px] font-black text-slate-400 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, idx) => {
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isCurrentMonthDay = isSameMonth(day, monthStart);
              const isToday = isSameDay(day, new Date());

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyDate(day)}
                  className={`
                    aspect-square flex items-center justify-center text-xs font-bold rounded-xl transition-all cursor-pointer select-none
                    ${!isCurrentMonthDay ? 'text-slate-300' : 'text-slate-700 hover:bg-white active:scale-95'}
                    ${isToday && !isSelected ? 'border-2 border-[#e32f8c] text-[#008ba3] font-black' : ''}
                    ${isSelected ? 'bg-[#e32f8c] text-slate-950 font-black shadow-sm scale-105' : ''}
                  `}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>

          {/* Time Picker Section */}
          <div className="p-3 bg-white border border-slate-200/80 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Clock size={14} className="text-[#008ba3]" />
                <span>Ora expirării</span>
              </span>
              <div className="flex items-center gap-1">
                {/* Hour Stepper */}
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => adjustHour(-1)}
                    className="w-6 h-7 flex items-center justify-center text-slate-600 hover:text-black hover:bg-slate-200/70 rounded font-black text-xs cursor-pointer"
                  >
                    -
                  </button>
                  <span className="w-7 text-center font-black text-xs sm:text-sm text-slate-900">
                    {selectedDate ? format(selectedDate, 'HH') : '18'}
                  </span>
                  <button
                    type="button"
                    onClick={() => adjustHour(1)}
                    className="w-6 h-7 flex items-center justify-center text-slate-600 hover:text-black hover:bg-slate-200/70 rounded font-black text-xs cursor-pointer"
                  >
                    +
                  </button>
                </div>

                <span className="font-bold text-slate-400 px-0.5">:</span>

                {/* Minute Stepper */}
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => adjustMinute(-5)}
                    className="w-6 h-7 flex items-center justify-center text-slate-600 hover:text-black hover:bg-slate-200/70 rounded font-black text-xs cursor-pointer"
                  >
                    -
                  </button>
                  <span className="w-7 text-center font-black text-xs sm:text-sm text-slate-900">
                    {selectedDate ? format(selectedDate, 'mm') : '00'}
                  </span>
                  <button
                    type="button"
                    onClick={() => adjustMinute(5)}
                    className="w-6 h-7 flex items-center justify-center text-slate-600 hover:text-black hover:bg-slate-200/70 rounded font-black text-xs cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Hours Pills */}
            <div className="flex items-center justify-between gap-1 pt-1">
              {[9, 12, 18, 20, 23].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => applyTime(h, h === 23 ? 59 : 0)}
                  className="flex-1 py-1 text-[11px] font-black text-slate-600 hover:text-black hover:bg-slate-100 bg-slate-50 rounded-lg border border-slate-200 transition-colors cursor-pointer text-center"
                >
                  {h < 10 ? `0${h}` : h}:{h === 23 ? '59' : '00'}
                </button>
              ))}
            </div>
          </div>

          {/* Panel Action Buttons */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/70">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Închide
            </button>
            <button
              type="button"
              onClick={async () => {
                await onSave();
                setIsOpen(false);
              }}
              disabled={saving}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check size={14} className="text-[#e32f8c]" />}
              <span>Salvează Data</span>
            </button>
          </div>
        </div>
      )}

      {/* Save Button (when panel is collapsed) */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => onSave()}
          disabled={saving}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check size={14} className="text-[#e32f8c]" />}
          <span>{saving ? 'Se salvează data...' : 'Salvează Data Mentenanței'}</span>
        </button>
      )}
    </div>
  );
}

export default function AdminSettingsPage() {
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  
  const [endDate, setEndDate] = useState('');
  const [endDateSaving, setEndDateSaving] = useState(false);

  // Admin users state
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [adminSaving, setAdminSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Exchange rates state (Strictly EUR, USD, GBP, PLN, CHF)
  const DEFAULT_RATES: Record<string, number> = {
    EUR: 5.30, 
    USD: 4.88, 
    GBP: 6.20, 
    PLN: 1.23, 
    CHF: 5.60,
  };
  const [rates, setRates] = useState<Record<string, string>>(Object.fromEntries(
    Object.entries(DEFAULT_RATES).map(([k, v]) => [k, String(v)])
  ));
  const [ratesSaving, setRatesSaving] = useState(false);
  const [ratesLastSaved, setRatesLastSaved] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [status, endDt, users, dbRates] = await Promise.all([
          fetch('/api/admin/data?action=maintenance-mode').then(r => r.json()).then(j => j.data),
          fetch('/api/admin/data?action=maintenance-end-date').then(r => r.json()).then(j => j.data),
          fetch('/api/admin/data?action=users').then(r => r.json()).then(j => j.data).catch(() => []),
          fetch('/api/admin/data?action=exchange-rates').then(r => r.json()).then(j => j.data).catch(() => null),
        ]);
        setIsMaintenance(status);
        if (endDt) setEndDate(endDt);
        setAdminUsers(users);
        if (dbRates) {
          const allowedOnly: Record<string, string> = {};
          for (const k of Object.keys(DEFAULT_RATES)) {
            if (dbRates[k] !== undefined) {
              allowedOnly[k] = String(dbRates[k]);
            }
          }
          setRates(prev => ({ ...prev, ...allowedOnly }));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const executeToggle = async (newValue: boolean) => {
    setSaving(true);
    try {
      await toggleMaintenanceMode(newValue);
      setIsMaintenance(newValue);
      toast.success(newValue ? 'Modul Mentenanță a fost activat!' : 'Modul Mentenanță a fost dezactivat!');
    } catch (e) {
      console.error(e);
      toast.error('Eroare la salvare.');
    } finally {
      setSaving(false);
      setShowMaintenanceModal(false);
    }
  };

  const handleToggle = async () => {
    const newValue = !isMaintenance;
    if (newValue) {
      setShowMaintenanceModal(true);
      return;
    }
    await executeToggle(false);
  };

  const handleSavePassword = async () => {
    if (!password) return;
    setPwdSaving(true);
    try {
      await setMaintenancePassword(password);
      toast.success('Parola a fost salvată cu succes!');
      setPassword('');
    } catch (e) {
      console.error(e);
      toast.error('Eroare la salvare.');
    } finally {
      setPwdSaving(false);
    }
  };

  const handleSaveEndDate = async (overrideDate?: string) => {
    setEndDateSaving(true);
    try {
      const dateToSave = overrideDate !== undefined ? overrideDate : endDate;
      await setMaintenanceEndDate(dateToSave);
      toast.success(dateToSave ? 'Data mentenanței a fost salvată cu succes!' : 'Data a fost ștearsă.');
    } catch (e) {
      console.error(e);
      toast.error('Eroare la salvarea datei.');
    } finally {
      setEndDateSaving(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail) return;
    setAdminSaving(true);
    try {
      const newUser = await addAdminUser(newAdminEmail, newAdminName || 'Admin');
      setAdminUsers([...adminUsers, newUser]);
      setNewAdminEmail('');
      setNewAdminName('');
      toast.success('Admin adăugat cu succes!');
    } catch (e: any) {
      console.error(e);
      toast.error('Eroare la adăugare admin: ' + e.message);
    } finally {
      setAdminSaving(false);
    }
  };

  const handleRemoveAdmin = async (id: string, email: string) => {
    setDeletingId(id);
    try {
      await removeAdminUser(id);
      setAdminUsers(adminUsers.filter(u => u.id !== id));
      toast.success(`Accesul pentru ${email} a fost revocat.`);
    } catch (e: any) {
      console.error(e);
      toast.error('Eroare la ștergere: ' + e.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveRates = async () => {
    setRatesSaving(true);
    try {
      // Validate all rates are positive numbers
      const parsed: Record<string, number> = {};
      for (const [key, val] of Object.entries(rates)) {
        const num = parseFloat(val);
        if (isNaN(num) || num <= 0) {
          toast.error(`Rată invalidă pentru ${key}: "${val}". Trebuie să fie un număr pozitiv.`);
          return;
        }
        parsed[key] = num;
      }
      await setExchangeRates(parsed);
      setRatesLastSaved(new Date().toLocaleTimeString('ro-RO'));
      toast.success('Cursurile valutare au fost salvate cu succes!');
    } catch (e: any) {
      toast.error('Eroare la salvarea cursurilor: ' + e.message);
    } finally {
      setRatesSaving(false);
    }
  };

  return (
    <div className="p-3.5 sm:p-6 max-w-6xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in pb-16">
      {/* 🏁 HEADER */}
      <div className="flex items-center gap-3 sm:gap-3.5 mb-6 sm:mb-8">
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#e32f8c]/10 text-[#008ba3] flex items-center justify-center shadow-xs">
          <SettingsIcon size={22} className="sm:w-6 sm:h-6" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Setări Generale</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">Configurări sistem și preferințe globale</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">

        {/* 🛠️ Maintenance Mode Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-sm flex flex-col justify-between relative">
          {isMaintenance && (
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse rounded-t-2xl sm:rounded-t-3xl" />
          )}
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-xs">
                <AlertTriangle size={22} className="sm:w-6 sm:h-6" />
              </div>
              
              <button 
                onClick={handleToggle}
                disabled={loading || saving}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${isMaintenance ? 'bg-red-500' : 'bg-slate-200'} disabled:opacity-50`}
                title={isMaintenance ? 'Dezactivează mentenanța' : 'Activează mentenanța'}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-xs ${isMaintenance ? 'translate-x-8' : 'translate-x-1'}`} />
              </button>
            </div>
            
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 mb-1.5">Mod Mentenanță</h2>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Odată activat, vizitatorii nu vor mai putea accesa paginile magazinului. Ei vor vedea ecranul „Dropping Soon” cu timer de numărătoare inversă. Administratorii pot debloca accesul folosind parola secretă.
              </p>
            </div>
            
            {/* Modern Date & Time Picker */}
            <div className="pt-1 border-t border-slate-100">
              <ModernMaintenanceDatePicker
                value={endDate}
                onChange={setEndDate}
                onSave={handleSaveEndDate}
                saving={endDateSaving}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold pt-4 mt-4 border-t border-slate-100 flex-wrap">
            <span className="text-slate-500">Status Site:</span> 
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            ) : isMaintenance ? (
              <span className="text-red-600 bg-red-50 border border-red-200/80 px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider">
                ACTIV (Blocat)
              </span>
            ) : (
              <span className="text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider">
                DEZACTIVAT (Magazin Live)
              </span>
            )}
            {saving && <Loader2 className="w-4 h-4 animate-spin text-[#e32f8c] ml-auto" />}

            {/* Quick Preview & Bypass Reset for Administrator */}
            {isMaintenance && (
              <div className="w-full flex items-center gap-2 mt-2 pt-2 border-t border-dashed border-slate-200 flex-wrap">
                <button
                  type="button"
                  onClick={async () => {
                    await clearMaintenanceBypass();
                    window.open('/ro', '_blank');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-all shadow-xs cursor-pointer"
                  title="Deschide magazinul fără bypass pentru a vedea exact ce văd vizitatorii"
                >
                  <Eye size={13} className="text-[#e32f8c]" /> Vezi Ecranul de Mentenanță
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await clearMaintenanceBypass();
                    toast.success('Bypass-ul local a fost resetat!');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                  title="Șterge deblocarea pe acest browser pentru testare"
                >
                  <RotateCcw size={12} /> Resetează Bypass Local
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* 🔐 Maintenance Password Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-4">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-xs">
              <KeyRound size={22} className="sm:w-6 sm:h-6" />
            </div>
            
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 mb-1.5">Parolă Bypass Mentenanță</h2>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Setează o parolă secretă de acces. Când magazinul este în mentenanță, apasă pe iconița de lacăt din colțul dreapta-jos al ecranului de mentenanță și introdu parola pentru a naviga liber pe site.
              </p>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100">
            <label className="block text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Setează Parolă Nouă
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                placeholder="Ex: trenzone2026"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-[#e32f8c] focus:ring-1 focus:ring-[#e32f8c]/20"
              />
              <button
                onClick={handleSavePassword}
                disabled={pwdSaving || !password}
                className="bg-[#e32f8c] text-black px-5 py-3 rounded-xl font-black text-sm hover:bg-[#c41a72] active:scale-95 transition-all disabled:opacity-50 disabled:hover:bg-[#e32f8c] flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-[#e32f8c]/20 shrink-0"
              >
                {pwdSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock size={15} />}
                <span>{pwdSaving ? 'Se setează...' : 'Setează'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 👥 Admin Users Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-sm flex flex-col relative overflow-hidden lg:col-span-2">
          <div className="flex items-start justify-between mb-4">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-xs">
              <ShieldAlert size={22} className="sm:w-6 sm:h-6" />
            </div>
          </div>
          
          <h2 className="text-lg sm:text-xl font-black text-slate-900 mb-1.5">Personal Autorizat</h2>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-6">
            Gestionează adresele de email care au permisiunea să se autentifice în panoul de control cu email și parolă.
          </p>

          <div className="flex flex-col lg:flex-row gap-6 sm:gap-8">
            <div className="flex-1 space-y-3">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">Adaugă Administrator Nou</h3>
              <div className="flex flex-col gap-3">
                <input
                  type="email"
                  placeholder="Email Administrator (ex: admin@trenzone.ro)"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base sm:text-sm font-medium focus:outline-none focus:border-[#e32f8c]"
                />
                <input
                  type="text"
                  placeholder="Nume Complet (opțional)"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base sm:text-sm font-medium focus:outline-none focus:border-[#e32f8c]"
                />
                <button
                  onClick={handleAddAdmin}
                  disabled={adminSaving || !newAdminEmail}
                  className="bg-slate-900 text-white px-5 py-3 rounded-xl font-black text-sm hover:bg-slate-800 active:scale-98 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  {adminSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus size={16} />} 
                  <span>Adaugă Administrator</span>
                </button>
              </div>
            </div>

            <div className="flex-[2] bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-3">Administratori Curenți</h3>
              
              {loading ? (
                <div className="flex justify-center p-6"><Loader2 className="w-6 h-6 animate-spin text-[#e32f8c]" /></div>
              ) : adminUsers.length === 0 ? (
                <div className="text-center p-6 text-xs sm:text-sm font-bold text-slate-400">Niciun administrator configurat.</div>
              ) : (
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                  {adminUsers.map((user) => (
                    <div key={user.id} className="relative bg-white border border-slate-200/80 p-3.5 sm:p-4 rounded-xl flex flex-col gap-1 shadow-2xs">
                      <div className="flex items-center justify-between gap-2 pr-10">
                        <span className="text-xs sm:text-sm font-black text-slate-900 break-all">{user.email}</span>
                      </div>
                      {user.full_name && <span className="text-xs font-medium text-slate-500">{user.full_name}</span>}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[#008ba3] bg-[#e32f8c]/15 border border-[#e32f8c]/25 px-2.5 py-0.5 rounded-full">
                          <UserCheck size={11} />
                          {user.role || 'Admin'}
                        </span>
                      </div>
                      <div className="absolute top-3.5 right-3">
                        <button
                          onClick={() => handleRemoveAdmin(user.id, user.email)}
                          disabled={deletingId === user.id}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 active:bg-red-100 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                          title="Revocă acces"
                        >
                          {deletingId === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 size={16} />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 💱 Exchange Rates Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-sm flex flex-col relative overflow-hidden lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
              <TrendingUp size={22} className="sm:w-6 sm:h-6" />
            </div>
            {ratesLastSaved && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full w-fit">
                ✓ Salvat la {ratesLastSaved}
              </span>
            )}
          </div>

          <h2 className="text-lg sm:text-xl font-black text-slate-900 mb-1">Cursuri de Schimb Valutar</h2>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-1">
            Setează rata de conversie din <span className="font-black text-slate-700">RON</span> în fiecare monedă. Valoarea afișată este <span className="font-black text-slate-700">1 RON = X unități</span> din moneda respectivă.
          </p>
          <p className="text-[11px] text-slate-400 mb-5">
            Aceste cursuri sunt salvate în baza de date și folosite pentru toate prețurile din magazin.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
            {Object.entries(rates).map(([currency, value]) => (
              <div key={currency} className="bg-slate-50 rounded-2xl p-3.5 sm:p-4 border border-slate-100">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                  {(() => {
                    const n = parseFloat(value);
                    const isRonPerUnit = n > 1.05;
                    return isRonPerUnit ? `1 ${currency} =` : `1 RON =`;
                  })()}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.001"
                    min="0.00001"
                    value={value}
                    onChange={(e) => setRates(prev => ({ ...prev, [currency]: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-base sm:text-sm font-black text-slate-900 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                    id={`rate-${currency.toLowerCase()}`}
                  />
                  <span className="text-xs sm:text-sm font-black text-slate-700 min-w-[36px]">
                    {(() => {
                      const n = parseFloat(value);
                      const isRonPerUnit = n > 1.05;
                      return isRonPerUnit ? 'RON' : currency;
                    })()}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5 font-medium truncate">
                  {(() => { 
                    const n = parseFloat(value); 
                    if (isNaN(n) || n <= 0) return '⚠ Invalid';
                    const isRonPerUnit = n > 1.05;
                    const foreignAmount = isRonPerUnit ? (100 / n) : (100 * n);
                    return `100 RON ≈ ${foreignAmount.toFixed(2)} ${currency}`; 
                  })()}
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-3 border-t border-slate-100">
            <button
              onClick={handleSaveRates}
              disabled={ratesSaving}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white px-6 py-3 rounded-xl font-black text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              {ratesSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw size={16} />}
              <span>Salvează Cursurile</span>
            </button>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Modificările intră în vigoare imediat pentru toți utilizatorii noi.
            </p>
          </div>
        </div>

        {/* ⚡ Aggressive Cache & Edge Optimization Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-sm flex flex-col relative overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-pink-50 text-[#e32f8c] flex items-center justify-center shadow-xs shrink-0">
              <RefreshCw size={22} className="sm:w-6 sm:h-6" />
            </div>
            <span className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Cache Activ: 30 Zile
            </span>
          </div>

          <h2 className="text-lg sm:text-xl font-black text-slate-900 mb-1.5">Cache Mare & Optimizare Consum (Zero-Cost)</h2>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-4">
            Toate paginile magazinului, produsele, clipurile, recenziile și setările sunt salvate în cache timp de <strong>30 de zile</strong> pentru consum minim pe Vercel și viteză instantanee prin Cloudflare Edge.
          </p>

          <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-5">
            {['Produse & Stocuri', 'Clipuri Video', 'Recenzii', 'Setări & Livrare', 'Pagini RO / EN'].map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-[10px] sm:text-[11px] font-bold text-slate-600"
              >
                ✓ {tag}
              </span>
            ))}
          </div>

          <div className="flex flex-col gap-2.5 pt-4 border-t border-slate-100">
            <ClearCacheButton variant="card" />
            <p className="text-[11px] text-slate-400 leading-relaxed text-center sm:text-left">
              Apasă oricând după ce faci modificări importante pentru a reîmprospăta instant tot site-ul.
            </p>
          </div>
        </div>
      </div>

      {/* ⚠️ Maintenance Confirmation Modal */}
      {showMaintenanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-5 sm:p-6 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-4">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-lg font-black text-slate-900">Activezi Modul Mentenanță?</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
              ATENȚIE: Vizitatorii nu vor mai putea accesa magazinul online și vor vedea pagina de mentenanță. Tu vei avea în continuare acces în panoul de administrare.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setShowMaintenanceModal(false)}
                disabled={saving}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl border border-slate-200 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Anulează
              </button>
              <button
                type="button"
                onClick={() => executeToggle(true)}
                disabled={saving}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-red-600 text-white text-xs sm:text-sm font-black hover:bg-red-700 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <AlertTriangle size={16} />}
                Activează Acum
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
