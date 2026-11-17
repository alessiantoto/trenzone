"use client";

import { Product } from "@/lib/api";
import { Plus, Trash2, Tag, ChevronDown, Check, Palette, X } from "lucide-react";
import { useState } from "react";
import { TeeStockMatrixCard } from "@/components/admin/TeeStockMatrixCard";

interface VariantsEditorProps {
  product: Partial<Product>;
  onChange: (field: string, value: any) => void;
}

export function VariantsEditor({ product, onChange }: VariantsEditorProps) {
  const rawVariants = product.variants || { 
    label: { ro: 'Culoare', en: 'Color' }, 
    options: [], 
    type: 'flavor' 
  };
  
  // Normalize label
  const labelRO = typeof rawVariants.label === 'object' ? rawVariants.label?.ro || 'Culoare' : rawVariants.label || 'Culoare';
  const labelEN = typeof rawVariants.label === 'object' ? rawVariants.label?.en || 'Color' : rawVariants.label || 'Color';
  const variantType = rawVariants.type || 'flavor';
  const isFlavor = variantType === 'flavor';

  const [openDropdown, setOpenDropdown] = useState<number | null>(null);

  const statusOptions = [
    { value: 'in_stock', label: 'În stoc', color: 'text-green-600 bg-green-50' },
    { value: 'sold_out', label: 'Epuizat', color: 'text-red-600 bg-red-50' },
    { value: 'preorder', label: 'Precomandă', color: 'text-amber-600 bg-amber-50' },
  ];

  const badgePresets = ['PRECOMANDĂ', 'BEST SELLER', 'LIMITED', 'POPULAR', 'NOU'];

  const handleUpdateGroup = (field: string, value: any) => {
    onChange("variants", {
      ...rawVariants,
      [field]: value
    });
  };

  const handleUpdateLabel = (lang: 'ro' | 'en', text: string) => {
    onChange("variants", {
      ...rawVariants,
      label: {
        ro: lang === 'ro' ? text : labelRO,
        en: lang === 'en' ? text : labelEN,
      }
    });
  };

  const handleUpdateOption = (index: number, field: string, value: any) => {
    const newOptions = [...rawVariants.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    onChange("variants", { ...rawVariants, options: newOptions });
  };

  const handleAddOption = () => {
    const newOptions = [
      ...rawVariants.options, 
      { 
        id: `var_${Date.now()}`, 
        name: { ro: "Variantă nouă", en: "New variant" }, 
        stock_status: "in_stock" as const,
        color: "#18181b",
        badge: ""
      }
    ];
    onChange("variants", { ...rawVariants, options: newOptions });
  };

  const handleRemoveOption = (index: number) => {
    const newOptions = rawVariants.options.filter((_, i) => i !== index);
    onChange("variants", { ...rawVariants, options: newOptions });
  };

  return (
    <div className="space-y-6">
      {/* VARIANT GROUP SETTINGS */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Palette size={16} className="text-[#e32f8c] shrink-0" />
              <span>Configurare Grup Variante</span>
            </h4>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Setează denumirea grupului (ex: Culoare, Mărime, Model) și tipul selectorului.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddOption}
            className="w-full sm:w-auto min-h-[42px] sm:min-h-[40px] px-4 rounded-xl bg-slate-900 text-white text-xs font-black flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-sm shrink-0 cursor-pointer"
          >
            <Plus size={15} /> Adaugă Variantă
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-200">
          <div className="min-w-0">
            <label className="text-[10px] font-black uppercase text-slate-500 mb-1.5 block">Etichetă Grup (RO)</label>
            <input 
              type="text" 
              value={labelRO}
              onChange={(e) => handleUpdateLabel('ro', e.target.value)}
              placeholder="ex: Culoare, Mărime"
              className="w-full min-w-0 h-11 sm:h-10 px-3 bg-white border border-slate-200 rounded-xl text-base sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-[#e32f8c]"
            />
          </div>
          <div className="min-w-0">
            <label className="text-[10px] font-black uppercase text-slate-500 mb-1.5 block">Etichetă Grup (EN)</label>
            <input 
              type="text" 
              value={labelEN}
              onChange={(e) => handleUpdateLabel('en', e.target.value)}
              placeholder="ex: Color, Size"
              className="w-full min-w-0 h-11 sm:h-10 px-3 bg-white border border-slate-200 rounded-xl text-base sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-[#e32f8c]"
            />
          </div>
          <div className="min-w-0">
            <label className="text-[10px] font-black uppercase text-slate-500 mb-1.5 block">Tip Selector</label>
            <select
              value={variantType}
              onChange={(e) => handleUpdateGroup('type', e.target.value)}
              className="w-full min-w-0 h-11 sm:h-10 px-3 bg-white border border-slate-200 rounded-xl text-base sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-[#e32f8c]"
            >
              <option value="flavor">Culori (cu Color Swatch)</option>
              <option value="design">Modele / Printuri (cu Poză)</option>
              <option value="size">Mărimi / Text simplu</option>
            </select>
          </div>
        </div>
      </div>

      {/* LIST OF OPTIONS */}
      <div className="space-y-4">
        {rawVariants.options.map((opt, idx) => {
          const nameRO = typeof opt.name === 'object' ? opt.name.ro : opt.name;
          const nameEN = typeof opt.name === 'object' ? opt.name.en : opt.name;
          const currentStatus = opt.stock_status || 'in_stock';
          const statusObj = statusOptions.find(s => s.value === currentStatus) || statusOptions[0];

          return (
            <div key={(opt as any).id || idx} className="bg-white border border-slate-200 hover:border-slate-300 p-3.5 sm:p-4 rounded-2xl space-y-3 transition-colors shadow-sm">
              {/* Mobile Top Bar */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 lg:hidden">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Variantă #{idx + 1}
                </span>
                <button 
                  type="button"
                  onClick={() => handleRemoveOption(idx)}
                  className="min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0 cursor-pointer"
                  title="Șterge varianta"
                  aria-label="Șterge varianta"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
                {/* Nume RO & EN */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                  <div className="min-w-0">
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Nume Variantă (RO)</label>
                    <input 
                      type="text" 
                      value={nameRO || ''}
                      onChange={(e) => handleUpdateOption(idx, "name", { ro: e.target.value, en: nameEN })}
                      placeholder="ex: Stealth Black"
                      className="w-full min-w-0 h-11 sm:h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-[#e32f8c]"
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Nume Variantă (EN)</label>
                    <input 
                      type="text" 
                      value={nameEN || ''}
                      onChange={(e) => handleUpdateOption(idx, "name", { ro: nameRO, en: e.target.value })}
                      placeholder="ex: Stealth Black"
                      className="w-full min-w-0 h-11 sm:h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-[#e32f8c]"
                    />
                  </div>
                </div>

                {/* Price, Status & Color */}
                <div className="grid grid-cols-2 sm:flex sm:items-end gap-2.5 sm:gap-3 w-full lg:w-auto shrink-0">
                  {/* Preț individual (opțional) */}
                  <div className="col-span-1 sm:w-28 min-w-0">
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Preț RON</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                        <Tag size={13} />
                      </span>
                      <input 
                        type="number" 
                        value={opt.price ?? ''}
                        onChange={(e) => handleUpdateOption(idx, "price", e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="Implicit"
                        className="w-full min-w-0 h-11 sm:h-10 pl-8 pr-2 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs font-bold text-slate-900 focus:outline-none focus:border-[#e32f8c]"
                      />
                    </div>
                  </div>

                  {/* Status Dropdown */}
                  <div className="relative col-span-1 sm:w-36 min-w-0">
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Status Stoc</label>
                    <button 
                      type="button"
                      onClick={() => setOpenDropdown(openDropdown === idx ? null : idx)}
                      className="w-full flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-2.5 sm:px-3 h-11 sm:h-10 text-xs font-bold text-slate-700 hover:border-[#e32f8c] transition-colors cursor-pointer"
                    >
                      <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-black truncate ${statusObj.color}`}>
                        {statusObj.label}
                      </span>
                      <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform ${openDropdown === idx ? 'rotate-180' : ''}`} />
                    </button>
                    {openDropdown === idx && (
                      <div className="absolute top-full mt-1 right-0 w-full min-w-[140px] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-30 py-1">
                        {statusOptions.map(option => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => { handleUpdateOption(idx, 'stock_status', option.value); setOpenDropdown(null); }}
                            className="w-full min-h-[40px] text-left px-3 py-2 text-xs font-bold hover:bg-slate-50 flex items-center justify-between text-slate-700 hover:text-[#e32f8c] cursor-pointer"
                          >
                            <span className={option.color + " px-2 py-0.5 rounded text-[10px] uppercase font-black"}>
                              {option.label}
                            </span>
                            {currentStatus === option.value && <Check size={14} className="text-[#e32f8c]" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Color Swatch (for flavor/color type) */}
                  {isFlavor && (
                    <div className="col-span-2 sm:w-16 min-w-0 sm:text-center">
                      <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Culoare</label>
                      <label 
                        className="relative w-full sm:w-10 h-11 sm:h-10 sm:mx-auto rounded-xl border border-slate-200 flex items-center justify-center gap-2 cursor-pointer overflow-hidden transition-all sm:hover:scale-105 shadow-sm px-3 sm:px-0"
                        style={{ backgroundColor: opt.color || '#18181b' }}
                        title="Selectează culoarea"
                      >
                        <span className="sm:hidden text-[11px] font-mono font-black uppercase px-2 py-0.5 rounded bg-white/85 text-slate-900">
                          {opt.color || '#18181b'}
                        </span>
                        <input 
                          type="color" 
                          value={opt.color || '#18181b'}
                          onChange={(e) => handleUpdateOption(idx, "color", e.target.value)}
                          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* Desktop Delete Button */}
                <div className="hidden lg:flex self-center pt-5">
                  <button 
                    type="button"
                    onClick={() => handleRemoveOption(idx)}
                    className="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0 cursor-pointer"
                    title="Șterge varianta"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Insignă / Badge per variantă */}
              <div className="pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center gap-2.5">
                <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
                  <Tag size={13} className="text-[#e32f8c]" />
                  <span className="text-[11px] font-black uppercase text-slate-500">Insignă Variantă:</span>
                </div>
                <input 
                  type="text"
                  value={opt.badge || ''}
                  onChange={(e) => handleUpdateOption(idx, "badge", e.target.value)}
                  placeholder="ex: PRECOMANDĂ, BEST SELLER..."
                  className="w-full sm:flex-1 sm:max-w-xs h-10 sm:h-8 px-3 bg-slate-50 border border-slate-200 rounded-lg text-base sm:text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#e32f8c]"
                />
                <div className="flex flex-wrap items-center gap-1.5">
                  {badgePresets.map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleUpdateOption(idx, "badge", preset)}
                      className={`text-[10px] sm:text-[9px] font-black uppercase px-2.5 py-1 sm:py-0.5 rounded border transition-colors cursor-pointer ${
                        opt.badge === preset 
                          ? 'bg-[#e32f8c]/15 text-[#e32f8c] border-[#e32f8c]/40' 
                          : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                  {opt.badge && (
                    <button
                      type="button"
                      onClick={() => handleUpdateOption(idx, "badge", "")}
                      className="inline-flex items-center gap-1 text-[10px] sm:text-[9px] font-bold text-red-500 hover:bg-red-50 rounded px-2 py-1 sm:py-0.5 cursor-pointer"
                    >
                      <X size={11} />
                      <span>Șterge</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {rawVariants.options.length === 0 && (
          <div className="text-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
            <p className="text-sm font-bold text-slate-500">Nicio variantă adăugată pentru acest produs.</p>
            <button
              type="button"
              onClick={handleAddOption}
              className="mt-3 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-800 hover:border-[#e32f8c] transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus size={14} /> Adaugă prima variantă
            </button>
          </div>
        )}
      </div>

      {/* INVENTAR PER MODEL & MĂRIME (pentru Tricouri / produse cu tracking intern) */}
      {(product.slug === 'tricou-trenzone' || Boolean((product as any).metadata?.variant_stock)) && (
        <TeeStockMatrixCard
          productName={typeof product.name === 'object' ? (product.name.ro || product.name.en) : product.name}
          initialMatrix={(product as any).metadata?.variant_stock}
          initialSold={(product as any).metadata?.variant_sold}
          models={rawVariants.options
            .map((o: any) => (typeof o.name === 'object' ? (o.name.ro || o.name.en) : String(o.name || '')))
            .filter(Boolean)}
          onLiveChange={(nextMatrix, nextTotal) => {
            onChange('metadata', {
              ...((product as any).metadata || {}),
              soft_stock_tracking: true,
              variant_stock: nextMatrix,
            });
            onChange('stock_quantity', nextTotal);
          }}
        />
      )}
    </div>
  );
}

