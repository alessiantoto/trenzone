"use client";

import { Product } from "@/lib/api";
import { Plus, Trash2, ExternalLink, Tag, Box, Check, Sparkles } from "lucide-react";

interface GeneralInfoTabProps {
  product: Partial<Product>;
  onChange: (field: string, value: any) => void;
}

export function GeneralInfoTab({ product, onChange }: GeneralInfoTabProps) {
  const nameRO = typeof product.name === 'object' ? product.name?.ro : product.name;
  const nameEN = typeof product.name === 'object' ? product.name?.en : '';
  
  const descRO = typeof product.description === 'object' ? product.description?.ro : product.description;
  const descEN = typeof product.description === 'object' ? product.description?.en : '';

  // Advantages helpers
  const advantagesObj = (product.advantages && typeof product.advantages === 'object') ? product.advantages : { ro: [], en: [] };
  const advantagesRO: string[] = Array.isArray(advantagesObj.ro) ? advantagesObj.ro : [];
  const advantagesEN: string[] = Array.isArray(advantagesObj.en) ? advantagesObj.en : [];

  const handleAdvantageChange = (index: number, lang: 'ro' | 'en', value: string) => {
    const list = lang === 'ro' ? [...advantagesRO] : [...advantagesEN];
    list[index] = value;
    onChange("advantages", {
      ro: lang === 'ro' ? list : advantagesRO,
      en: lang === 'en' ? list : advantagesEN,
    });
  };

  const handleAddAdvantage = () => {
    onChange("advantages", {
      ro: [...advantagesRO, "Beneficiu nou"],
      en: [...advantagesEN, "New benefit"],
    });
  };

  const handleRemoveAdvantage = (index: number) => {
    const newRO = advantagesRO.filter((_, i) => i !== index);
    const newEN = advantagesEN.filter((_, i) => i !== index);
    onChange("advantages", { ro: newRO, en: newEN });
  };

  // Usage Signs helpers
  const usageSignsObj = (product.usage_signs && typeof product.usage_signs === 'object') ? product.usage_signs : { ro: [], en: [] };
  const usageRO: string[] = Array.isArray(usageSignsObj.ro) ? usageSignsObj.ro : [];
  const usageEN: string[] = Array.isArray(usageSignsObj.en) ? usageSignsObj.en : [];

  const handleUsageChange = (index: number, lang: 'ro' | 'en', value: string) => {
    const list = lang === 'ro' ? [...usageRO] : [...usageEN];
    list[index] = value;
    onChange("usage_signs", {
      ro: lang === 'ro' ? list : usageRO,
      en: lang === 'en' ? list : usageEN,
    });
  };

  const handleAddUsageSign = () => {
    onChange("usage_signs", {
      ro: [...usageRO, "Caz de utilizare nou"],
      en: [...usageEN, "New usage case"],
    });
  };

  const handleRemoveUsageSign = (index: number) => {
    const newRO = usageRO.filter((_, i) => i !== index);
    const newEN = usageEN.filter((_, i) => i !== index);
    onChange("usage_signs", { ro: newRO, en: newEN });
  };

  const currentPrice = typeof product.price === 'number' ? product.price : parseFloat(String(product.price || 0)) || 0;
  const originalPrice = typeof product.originalPrice === 'number' ? product.originalPrice : (product.originalPrice ? parseFloat(String(product.originalPrice)) : undefined);
  const discountPercent = (originalPrice && originalPrice > currentPrice) 
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) 
    : 0;

  return (
    <div className="space-y-7">
      
      {/* 🏷️ NUME PRODUS (RO & EN) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block">
            Nume Produs (Română) <span className="text-red-500">*</span>
          </label>
          <input 
            type="text" 
            value={nameRO || ''}
            onChange={(e) => onChange("name", { ro: e.target.value, en: nameEN })}
            placeholder="ex: X10 Elbow Wraps"
            className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-[#e32f8c] focus:bg-white transition-all shadow-2xs"
          />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block">
            Nume Produs (Engleză)
          </label>
          <input 
            type="text" 
            value={nameEN || ''}
            onChange={(e) => onChange("name", { ro: nameRO, en: e.target.value })}
            placeholder="ex: X10 Elbow Wraps"
            className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-[#e32f8c] focus:bg-white transition-all shadow-2xs"
          />
        </div>
      </div>

      {/* 🔗 SLUG URL & 🛡️ BADGE (INSIGNĂ) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl">
        {/* Slug URL */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] font-black uppercase text-slate-500">
              Slug URL (Adresă magazin)
            </label>
            {product.slug && (
              <a 
                href={`/ro/product/${product.slug}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-[11px] text-[#e32f8c] hover:underline font-bold flex items-center gap-1"
                title="Deschide pagina produsului în magazin"
              >
                <span>Vezi în magazin</span>
                <ExternalLink size={12} />
              </a>
            )}
          </div>
          <input 
            type="text" 
            value={product.slug || ''}
            onChange={(e) => onChange("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-'))}
            placeholder="ex: x10-elbow-wraps"
            className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-[#e32f8c] shadow-2xs"
          />
          <p className="text-[10px] text-slate-400 mt-1 font-medium">
            URL: <span className="font-mono">/product/{product.slug || 'slug-produs'}</span>
          </p>
        </div>

        {/* Badge (Insignă Produs) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1">
              <Sparkles size={11} className="text-[#e32f8c]" /> Insignă Produs (Badge)
            </label>
            <span className="text-[10px] text-slate-400 font-medium">Apare pe carduri & hero</span>
          </div>
          <input 
            type="text" 
            value={(product as any).badge || ''}
            onChange={(e) => onChange("badge", e.target.value)}
            placeholder="ex: PR CHASER · +20 KG"
            className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:outline-none focus:border-[#e32f8c] shadow-2xs"
          />
          {/* Quick presets */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {['PR CHASER · +20 KG', 'HIPERTROFIE & VOLUM', 'BEST SELLER', 'NOU', 'PRECOMANDĂ'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onChange("badge", preset)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-black transition-all cursor-pointer ${
                  (product as any).badge === preset
                    ? 'bg-[#e32f8c] text-black shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {preset}
              </button>
            ))}
            {(product as any).badge && (
              <button
                type="button"
                onClick={() => onChange("badge", null)}
                className="px-2 py-0.5 rounded-md text-[10px] font-bold text-red-500 hover:bg-red-50 cursor-pointer"
              >
                Șterge
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 💰 PREȚURI & REDUCERI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div>
          <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block">
            Preț de Vânzare Curent (RON) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">RON</span>
            <input 
              type="number" 
              step="0.01"
              value={currentPrice || ''}
              onChange={(e) => onChange("price", parseFloat(e.target.value) || 0)}
              className="w-full h-11 pl-12 pr-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:border-[#e32f8c] focus:bg-white transition-all shadow-2xs font-mono"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block">
            Preț Întreg / Vechi (pt. tăiere)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">RON</span>
            <input 
              type="number" 
              step="0.01"
              value={originalPrice || ''}
              onChange={(e) => onChange("originalPrice", parseFloat(e.target.value) || undefined)}
              placeholder="ex: 399.99"
              className="w-full h-11 pl-12 pr-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-[#e32f8c] focus:bg-white transition-all shadow-2xs font-mono"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block">
            Discount Afișat Automat
          </label>
          <div className="h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Economie Client:</span>
            {discountPercent > 0 ? (
              <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black">
                -{discountPercent}%
              </span>
            ) : (
              <span className="text-xs text-slate-400 font-medium">Niciun discount</span>
            )}
          </div>
        </div>
      </div>

      {/* 📦 STOC, GREUTATE & STATUS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
        <div>
          <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block">Stoc Total (Bucăți)</label>
          <input 
            type="number" 
            value={product.stock_quantity ?? 0}
            onChange={(e) => onChange("stock_quantity", parseInt(e.target.value) || 0)}
            className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:border-[#e32f8c] font-mono"
          />
        </div>

        <div>
          <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block">Greutate Colet (kg)</label>
          <input 
            type="number" 
            step="0.05"
            value={product.weight ?? 0.5}
            onChange={(e) => onChange("weight", parseFloat(e.target.value) || 0.5)}
            className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-[#e32f8c] font-mono"
          />
        </div>

        <div>
          <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block">Dimensiuni Colet (L x l x H mm)</label>
          <div className="grid grid-cols-3 gap-1">
            <input 
              type="number" 
              placeholder="L" 
              value={(product as any).length_mm ?? 100}
              onChange={(e) => onChange("length_mm", parseInt(e.target.value) || 100)}
              title="Lungime (mm)"
              className="w-full h-10 px-1.5 text-center bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
            />
            <input 
              type="number" 
              placeholder="l" 
              value={(product as any).width_mm ?? 100}
              onChange={(e) => onChange("width_mm", parseInt(e.target.value) || 100)}
              title="Lățime (mm)"
              className="w-full h-10 px-1.5 text-center bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
            />
            <input 
              type="number" 
              placeholder="H" 
              value={(product as any).height_mm ?? 100}
              onChange={(e) => onChange("height_mm", parseInt(e.target.value) || 100)}
              title="Înălțime (mm)"
              className="w-full h-10 px-1.5 text-center bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block">Vizibilitate Magazin</label>
          <button 
            type="button"
            onClick={() => onChange("is_active", !product.is_active)}
            className={`w-full h-10 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
              product.is_active 
                ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${product.is_active ? 'bg-white animate-pulse' : 'bg-slate-400'}`}></span>
            <span>{product.is_active ? 'Activ (Publicat)' : 'Ciornă (Ascuns)'}</span>
          </button>
        </div>
      </div>

      {/* 📝 DESCRIERI (RO & EN) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block">
            Descriere Scurtă (Română)
          </label>
          <textarea 
            rows={4}
            value={descRO || ''}
            onChange={(e) => onChange("description", { ro: e.target.value, en: descEN })}
            placeholder="Descrierea principală afișată pe pagina produsului..."
            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#e32f8c] focus:bg-white transition-all resize-none shadow-2xs leading-relaxed"
          />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block">
            Descriere Scurtă (Engleză)
          </label>
          <textarea 
            rows={4}
            value={descEN || ''}
            onChange={(e) => onChange("description", { ro: descRO, en: e.target.value })}
            placeholder="Main product description in English..."
            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#e32f8c] focus:bg-white transition-all resize-none shadow-2xs leading-relaxed"
          />
        </div>
      </div>

      {/* 🚀 PUNCTE FORTE & AVANTAJE (Afișate pe pagina produsului) */}
      <div className="pt-5 border-t border-slate-100 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <span>Puncte Forte & Avantaje Cheie</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                {advantagesRO.length} puncte
              </span>
            </h4>
            <p className="text-[11px] text-slate-500 font-medium">
              Listă de beneficii evidențiate cu bifă verde pe pagina produsului
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddAdvantage}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Plus size={13} />
            <span>Adaugă Punct Forte</span>
          </button>
        </div>

        <div className="space-y-2.5">
          {advantagesRO.map((adv, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center shrink-0">
                {idx + 1}
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 flex-1">
                <input 
                  type="text"
                  value={adv}
                  onChange={(e) => handleAdvantageChange(idx, 'ro', e.target.value)}
                  placeholder="Avantaj în Română..."
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#e32f8c]"
                />
                <input 
                  type="text"
                  value={advantagesEN[idx] || ''}
                  onChange={(e) => handleAdvantageChange(idx, 'en', e.target.value)}
                  placeholder="Benefit in English..."
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#e32f8c]"
                />
              </div>
              <button
                type="button"
                onClick={() => handleRemoveAdvantage(idx)}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                title="Șterge avantaj"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {advantagesRO.length === 0 && (
            <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl">
              <p className="text-xs text-slate-400 font-bold">Niciun avantaj configurat încă.</p>
            </div>
          )}
        </div>
      </div>

      {/* 🎯 RECOMANDAT PENTRU (Usage signs) */}
      <div className="pt-5 border-t border-slate-100 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <span>Recomandat Pentru / Cazuri de Utilizare</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200">
                {usageRO.length} recomandări
              </span>
            </h4>
            <p className="text-[11px] text-slate-500 font-medium">
              Afișat în secțiunea de recomandare pe pagina produsului
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddUsageSign}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Plus size={13} />
            <span>Adaugă Recomandare</span>
          </button>
        </div>

        <div className="space-y-2.5">
          {usageRO.map((usg, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="w-6 h-6 rounded-lg bg-cyan-100 text-cyan-800 font-black text-xs flex items-center justify-center shrink-0">
                {idx + 1}
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 flex-1">
                <input 
                  type="text"
                  value={usg}
                  onChange={(e) => handleUsageChange(idx, 'ro', e.target.value)}
                  placeholder="Recomandare în Română..."
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#e32f8c]"
                />
                <input 
                  type="text"
                  value={usageEN[idx] || ''}
                  onChange={(e) => handleUsageChange(idx, 'en', e.target.value)}
                  placeholder="Usage case in English..."
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#e32f8c]"
                />
              </div>
              <button
                type="button"
                onClick={() => handleRemoveUsageSign(idx)}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                title="Șterge recomandare"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {usageRO.length === 0 && (
            <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl">
              <p className="text-xs text-slate-400 font-bold">Nicio recomandare configurată încă.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
