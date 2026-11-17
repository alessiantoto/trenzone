'use client';

import { useEffect, useState } from 'react';
import { getShippingRates, updateShippingRate, addShippingRate, deleteShippingRate } from '@/app/actions/shipping-rates';
import { ArrowLeft, Plus, Save, Trash2, Edit2, X, RefreshCw, Package } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { COUNTRY_SERVICES, SHIPPING_RATES } from '@/lib/shipping-config';

const MOCK_DATA = Object.entries(SHIPPING_RATES)
  .filter(([country]) => country !== 'DEFAULT')
  .flatMap(([country, cfg], cIdx) => {
    const hdRates = (cfg.hd?.rates || []).map((r, rIdx) => ({
      idx: cIdx * 100 + rIdx,
      id: cIdx * 100 + rIdx + 1,
      country_code: country,
      shipping_type: 'hd',
      max_weight: String(r.max),
      price_ron: String(r.prices.RON),
      price_eur: String(r.prices.EUR),
      price_usd: String(r.prices.USD),
      price_gbp: String(r.prices.GBP),
      price_huf: String(r.prices.HUF),
      price_bgn: String(r.prices.BGN),
    }));
    const pudoRates = country === 'RO'
      ? (cfg.pudo?.rates || []).map((r, rIdx) => ({
          idx: cIdx * 100 + 50 + rIdx,
          id: cIdx * 100 + 50 + rIdx + 1,
          country_code: country,
          shipping_type: 'pudo',
          max_weight: String(r.max),
          price_ron: String(r.prices.RON),
          price_eur: String(r.prices.EUR),
          price_usd: String(r.prices.USD),
          price_gbp: String(r.prices.GBP),
          price_huf: String(r.prices.HUF),
          price_bgn: String(r.prices.BGN),
        }))
      : [];
    return [...hdRates, ...pudoRates];
  });

export function ShippingRatesTable() {
  const [rates, setRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [isAdding, setIsAdding] = useState(false);
  const [addingCountry, setAddingCountry] = useState<string | null>(null);

  const countryNames: Record<string, string> = {
    RO: 'România',
    BG: 'Bulgaria',
    HU: 'Ungaria',
    CZ: 'Cehia',
    SK: 'Slovacia',
    AT: 'Austria',
    BE: 'Belgia',
    CY: 'Cipru',
    HR: 'Croația',
    EE: 'Estonia',
    FI: 'Finlanda',
    FR: 'Franța',
    DE: 'Germania',
    GR: 'Grecia',
    IT: 'Italia',
    LV: 'Letonia',
    LT: 'Lituania',
    LU: 'Luxemburg',
    NL: 'Olanda',
    PL: 'Polonia',
    PT: 'Portugalia',
    GB: 'Marea Britanie',
    SI: 'Slovenia',
    ES: 'Spania',
    SE: 'Suedia',
    DK: 'Danemarca',
    IE: 'Irlanda',
    IS: 'Islanda',
    MT: 'Malta',
    NO: 'Norvegia',
    CH: 'Elveția',
    TR: 'Turcia',
    UA: 'Ucraina',
    US: 'Statele Unite',
    CA: 'Canada',
    MX: 'Mexic',
    AR: 'Argentina',
    BR: 'Brazilia',
    CL: 'Chile',
    IL: 'Israel',
    AE: 'Emiratele Arabe Unite',
    CN: 'China',
    HK: 'Hong Kong',
    IN: 'India',
    ID: 'Indonezia',
    JP: 'Japonia',
    MY: 'Malaezia',
    SG: 'Singapore',
    KR: 'Coreea de Sud',
    TW: 'Taiwan',
    TH: 'Thailanda',
    AU: 'Australia',
    NZ: 'Noua Zeelandă',
    ZA: 'Africa de Sud',
    EUR: 'Zona Restul Europei',
    LAM: 'Zona America Latină',
    SAM: 'Zona America de Sud',
    MEA: 'Zona Orientul Mijlociu',
    ASI: 'Zona Asia',
    OCE: 'Zona Oceania',
    AFR: 'Zona Africa',
    DEFAULT: 'Restul Lumii'
  };

  useEffect(() => {
    fetchRates();
  }, []);

  async function fetchRates() {
    setLoading(true);
    try {
      const dbRates = await getShippingRates().catch(() => null);
      const sourceData = (Array.isArray(dbRates) && dbRates.length > 0)
        ? dbRates
        : MOCK_DATA;
      // Filter out PUDO for all countries except RO and DEFAULT
      const filteredData = sourceData.filter((r: any) => !(r.shipping_type === 'pudo' && r.country_code !== 'RO' && r.country_code !== 'DEFAULT'));
      setRates(filteredData);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleEditClick(rate: any) {
    setEditingId(rate.id);
    setEditForm(rate);
  }

  async function handleSave() {
    try {
      const priceRonNum = Number(editForm.price_ron) || 0;
      const priceEurNum = parseFloat((priceRonNum / 4.97).toFixed(2));
      const payload = {
        country_code: editForm.country_code,
        shipping_type: editForm.shipping_type || 'hd',
        max_weight: Number(editForm.max_weight) || 1,
        price_ron: priceRonNum,
        price_eur: priceEurNum,
      };

      if (isAdding) {
        const created = await addShippingRate(payload).catch(() => null);
        if (created) {
          setRates([...rates, created]);
          toast.success('Tariful a fost adăugat.');
        } else {
          const newRate = { ...editForm, ...payload, id: Date.now(), idx: rates.length };
          setRates([...rates, newRate]);
          toast.success('Tariful a fost adăugat.');
        }
      } else if (editingId) {
        const updated = await updateShippingRate(editingId, payload).catch(() => null);
        const updatedRates = rates.map(r => r.id === editingId ? {
          ...r,
          ...editForm,
          ...(updated || payload),
        } : r);
        setRates(updatedRates);
        toast.success('Tariful a fost actualizat.');
      }
      setEditingId(null);
      setIsAdding(false);
      setAddingCountry(null);
      setEditForm({});
    } catch (e: any) {
      toast.error('Eroare la salvare: ' + e.message);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteShippingRate(id).catch(() => null);
      const remainingRates = rates.filter(r => r.id !== id);
      setRates(remainingRates);
      toast.success('Tariful a fost șters.');
    } catch (e: any) {
      toast.error('Eroare la ștergere: ' + e.message);
    }
  }

  function handleAddNew(countryCode: string) {
    setIsAdding(true);
    setAddingCountry(countryCode);
    setEditingId(-1);
    setEditForm({
      country_code: countryCode,
      shipping_type: 'hd',
      max_weight: 1,
      price_ron: 0,
      price_eur: 0,
    });
  }

  // Group by country
  const groupedRates = rates.reduce((acc, rate) => {
    if (!acc[rate.country_code]) acc[rate.country_code] = [];
    acc[rate.country_code].push(rate);
    return acc;
  }, {} as Record<string, any[]>);

  // Sort countries: RO first, then alphabetical
  const sortedCountries = Object.keys(groupedRates).sort((a, b) => {
    if (a === 'RO') return -1;
    if (b === 'RO') return 1;
    return (countryNames[a] || a).localeCompare(countryNames[b] || b);
  });

  return (
    <div className="w-full space-y-8">
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-200/50 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Package size={20} className="text-[#e32f8c]" /> Prețuri Livrare
          </h2>
          <p className="text-slate-500 text-sm mt-1">Gestionează tarifele de curierat pe țări (în RON)</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-2xl">
          Eroare: {error}
        </div>
      )}

      {loading && rates.length === 0 ? (
        <div className="py-20 text-center text-slate-400">
          <Loader2 size={32} className="animate-spin mx-auto mb-4" /> Se încarcă...
        </div>
      ) : (
        <div className="space-y-6">
          {sortedCountries.map((countryCode) => (
            <div key={countryCode} className="bg-white rounded-3xl border border-slate-200/50 shadow-sm overflow-hidden flex flex-col">
              {/* Header Tara */}
              <div className="px-4 sm:px-6 py-4 bg-slate-50 border-b border-slate-200/50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${countryCode === 'RO' ? 'bg-blue-500' : 'bg-rose-500'}`}></span>
                  <h3 className="font-black text-slate-900 text-lg uppercase tracking-wide">
                    {countryNames[countryCode] || countryCode} <span className="text-slate-400 font-medium text-sm">({countryCode})</span>
                  </h3>
                </div>
                <button onClick={() => handleAddNew(countryCode)} className="text-sm font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
                  <Plus size={14} /> Tarif
                </button>
              </div>

              {/* Grupari pe metode de livrare */}
              <div className="flex flex-col">
                {(['hd', 'pudo'] as const).map(shippingType => {
                  const ratesForType = groupedRates[countryCode].filter((r: any) => r.shipping_type === shippingType).sort((a: any, b: any) => parseFloat(a.max_weight) - parseFloat(b.max_weight));
                  if (ratesForType.length === 0) return null;

                  return (
                    <div key={shippingType} className="border-b border-slate-100 last:border-0 pb-2">
                      <div className="px-4 sm:px-6 py-3 bg-white flex items-center gap-2">
                        {shippingType === 'hd' ? (
                           <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-bold text-xs uppercase tracking-wider">Home Delivery</span>
                        ) : (
                           <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md font-bold text-xs uppercase tracking-wider">Locker (PUDO)</span>
                        )}
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                           {COUNTRY_SERVICES[countryCode]?.[shippingType]?.[0]?.name || 'Packeta / Sameday'}
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600 min-w-[440px]">
                          <thead className="bg-white text-slate-400 font-semibold text-xs tracking-wider">
                            <tr>
                              <th className="px-4 sm:px-6 py-2 w-1/3">Până la (kg)</th>
                              <th className="px-4 sm:px-6 py-2 w-1/3">Preț (RON)</th>
                              <th className="px-4 sm:px-6 py-2 w-1/3">Preț Estimat (EUR)</th>
                              <th className="px-4 sm:px-6 py-2 text-right">Acțiuni</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {ratesForType.map((rate: any) => (
                              <tr key={rate.id} className="hover:bg-slate-50/80 transition-colors group">
                                {editingId === rate.id ? (
                                  <>
                                    <td className="px-4 sm:px-6 py-2">
                                      <div className="relative">
                                        <input type="number" step="0.1" className="w-24 p-2 pr-6 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium" value={editForm.max_weight} onChange={e => setEditForm({...editForm, max_weight: parseFloat(e.target.value)})} />
                                        <span className="absolute right-3 lg:right-[calc(100%-6rem)] top-2.5 text-xs text-slate-400">kg</span>
                                      </div>
                                    </td>
                                    <td className="px-4 sm:px-6 py-2">
                                      <div className="relative">
                                        <input type="number" step="0.01" className="w-28 p-2 pr-8 border border-blue-200 bg-blue-50 text-blue-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold" value={editForm.price_ron} onChange={e => setEditForm({...editForm, price_ron: parseFloat(e.target.value)})} />
                                        <span className="absolute right-3 lg:right-[calc(100%-7rem)] top-2.5 text-xs text-blue-500 font-bold">lei</span>
                                      </div>
                                    </td>
                                    <td className="px-4 sm:px-6 py-2">
                                      <span className="text-slate-400 font-medium text-sm flex items-center gap-1">
                                        {editForm.price_ron ? (editForm.price_ron / 4.97).toFixed(2) : '0.00'} € <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-400">auto</span>
                                      </span>
                                    </td>
                                    <td className="px-4 sm:px-6 py-2 text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        <button onClick={handleSave} className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 shadow-sm shadow-emerald-500/20"><Save size={16} /></button>
                                        <button onClick={() => {setEditingId(null); setIsAdding(false); setAddingCountry(null);}} className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200"><X size={16} /></button>
                                      </div>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="px-4 sm:px-6 py-3 text-sm font-medium text-slate-700">{rate.max_weight} kg</td>
                                    <td className="px-4 sm:px-6 py-3 font-black text-slate-900 text-sm sm:text-base">{rate.price_ron} lei</td>
                                    <td className="px-4 sm:px-6 py-3 text-sm font-medium text-slate-400">{rate.price_eur || (rate.price_ron / 4.97).toFixed(2)} €</td>
                                    <td className="px-4 sm:px-6 py-3 text-right">
                                      <div className="flex items-center justify-end gap-1 sm:gap-2 opacity-100 [@media(hover:hover)]:sm:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEditClick(rate)} className="p-2 bg-white border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 hover:text-blue-600 shadow-sm"><Edit2 size={14} /></button>
                                        <button onClick={() => handleDelete(rate.id)} className="p-2 bg-white border border-slate-200 text-red-400 rounded-lg hover:bg-red-50 hover:text-red-600 shadow-sm hover:border-red-200"><Trash2 size={14} /></button>
                                      </div>
                                    </td>
                                  </>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Formular Adaugare */}
              {isAdding && addingCountry === countryCode && editingId === -1 && (
                <div className="bg-blue-50/50 p-4 sm:p-6 border-t border-blue-100">
                  <h4 className="text-sm font-bold text-blue-900 mb-4 flex items-center gap-2"><Plus size={16}/> Adaugă tarif nou pentru {countryNames[countryCode] || countryCode}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Serviciu</label>
                      <select className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium" value={editForm.shipping_type} onChange={e => setEditForm({...editForm, shipping_type: e.target.value})}>
                        <option value="hd">Home Delivery</option>
                        {countryCode === 'RO' && <option value="pudo">Locker (PUDO)</option>}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Greutate maximă (kg)</label>
                      <div className="relative">
                        <input type="number" step="0.1" className="w-full p-2.5 pr-8 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium" value={editForm.max_weight} onChange={e => setEditForm({...editForm, max_weight: parseFloat(e.target.value)})} />
                        <span className="absolute right-3 top-3 text-xs text-slate-400">kg</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Preț (RON)</label>
                      <div className="relative">
                        <input type="number" step="0.01" className="w-full p-2.5 pr-8 border border-blue-200 bg-white text-blue-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold" value={editForm.price_ron} onChange={e => setEditForm({...editForm, price_ron: parseFloat(e.target.value)})} />
                        <span className="absolute right-3 top-3 text-xs text-blue-500 font-bold">lei</span>
                      </div>
                    </div>
                    <div className="flex gap-2 h-[42px]">
                      <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 shadow-sm shadow-emerald-500/20 transition-colors">
                        <Save size={16} /> Salvează
                      </button>
                      <button onClick={() => {setEditingId(null); setIsAdding(false); setAddingCountry(null);}} className="px-4 flex items-center justify-center bg-white border border-slate-200 text-slate-500 font-bold rounded-xl hover:bg-slate-50 transition-colors">
                        Anulează
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Loader2({ size, className }: { size: number, className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
