"use client";

import { useEffect, useState } from "react";
import { Product, type InfluencerVideo } from "@/lib/api";
import {
  Plus,
  Trash2,
  ExternalLink,
  Tag,
  Box,
  Check,
  Sparkles,
  Upload,
  FileText,
  Image as ImageIcon,
  Loader2,
  Video,
  HelpCircle,
  RotateCcw,
} from "lucide-react";
import { uploadProductImage } from "@/app/actions/admin-products";
import { getProgramFilesAction, uploadProgramPdfAction } from "@/app/actions/programs";
import { LanguageFlagSvg } from "@/components/programs/LanguageFlagSvg";
import { isDigitalProgramId, PROGRAM_SLUGS, PROGRAM_UUIDS, sanitizeProgramSlug } from "@/lib/programs";
import {
  getDefaultProductHighlights,
  getDefaultProductFaqs,
  type ProductHighlightItem,
  type ProductFaqEntry,
  type HighlightIconKey,
} from "@/lib/product-features";
import { getOptimizedImageUrl } from "@/lib/utils/imageProxy";
import toast from "react-hot-toast";

interface GeneralInfoTabProps {
  product: Partial<Product>;
  onChange: (field: string, value: any) => void;
}

const HIGHLIGHT_ICON_OPTIONS: Array<{ value: HighlightIconKey; label: string }> = [
  { value: "mail", label: "Email / Digital" },
  { value: "sparkles", label: "Stele / Metodă" },
  { value: "check", label: "Bifă / Acces" },
  { value: "flame", label: "Flacără / Nutriție" },
  { value: "target", label: "Țintă / Obiectiv" },
  { value: "dumbbell", label: "Gantere / Sală" },
  { value: "zap", label: "Fulger / Forță" },
  { value: "shield", label: "Scut / Protecție" },
];

export function GeneralInfoTab({ product, onChange }: GeneralInfoTabProps) {
  const specsSummary: Record<string, any> =
    (product as any)?.specs_summary && typeof (product as any).specs_summary === "object"
      ? (product as any).specs_summary
      : {};
  const isDigital =
    Boolean(product.is_digital || specsSummary.is_digital) ||
    isDigitalProgramId(product.slug || product.id);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [programFiles, setProgramFiles] = useState<Record<string, string>>({});
  const [uploadingPdfSlot, setUploadingPdfSlot] = useState<string | null>(null);
  const [allInfluencers, setAllInfluencers] = useState<InfluencerVideo[]>([]);

  useEffect(() => {
    fetch("/api/admin/data?action=influencers")
      .then((r) => r.json())
      .then((j) => {
        if (Array.isArray(j?.data)) setAllInfluencers(j.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isDigital) return;
    getProgramFilesAction()
      .then((res) => {
        if (res.success && res.files) {
          setProgramFiles(res.files as Record<string, string>);
        }
      })
      .catch(() => {});
  }, [isDigital]);

  const updateSpecsSummary = (patch: Record<string, any>) => {
    onChange("specs_summary", { ...specsSummary, ...patch });
  };

  const handleToggleProductType = (nextDigital: boolean) => {
    onChange("is_digital", nextDigital);
    updateSpecsSummary({ is_digital: nextDigital });
    if (nextDigital) {
      onChange("weight", 0);
      onChange("length_mm", 0);
      onChange("width_mm", 0);
      onChange("height_mm", 0);
      if (!product.stock_quantity || product.stock_quantity < 100) {
        onChange("stock_quantity", 9999);
      }
      if (!product.variants?.options?.length) {
        onChange("variants", {
          type: "flavor",
          label: { ro: "Limbă", en: "Language" },
          options: [
            {
              name: { ro: "Română", en: "Romanian" },
              color: "#e32f8c",
              imageIndex: 0,
              stock_status: "in_stock",
            },
            {
              name: { ro: "English", en: "English" },
              color: "#3b82f6",
              imageIndex: 0,
              stock_status: "in_stock",
            },
          ],
        });
      }
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folderId", product.id || "programs");
      const res = await uploadProductImage(formData);
      if (res.success && res.url) {
        onChange("image", res.url);
        const existingImages = Array.isArray(product.images) ? [...product.images] : [];
        if (existingImages.length > 0) {
          existingImages[0] = res.url;
          onChange("images", existingImages);
        } else {
          onChange("images", [res.url]);
        }
        toast.success("Poza de copertă a fost actualizată! Apasă Salvează Modificările.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Eroare la încărcarea pozei de copertă.");
    } finally {
      setUploadingCover(false);
      e.target.value = "";
    }
  };

  const handlePdfUpload = async (slot: string, file: File) => {
    setUploadingPdfSlot(slot);
    try {
      const fd = new FormData();
      fd.append("slot", slot);
      fd.append("file", file);
      const res = await uploadProgramPdfAction(fd);
      if (res.success && res.url) {
        setProgramFiles((prev) => ({ ...prev, [slot]: res.url! }));
        toast.success(`PDF-ul (${slot.toUpperCase()}) a fost atașat cu succes!`);
      } else {
        toast.error(res.error || "Eroare la încărcarea PDF-ului.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Eroare la încărcarea PDF-ului.");
    } finally {
      setUploadingPdfSlot(null);
    }
  };

  const pdfSlotsForProduct: Array<{ slot: string; label: string; lang: "en" | "ro" }> = (() => {
    const slugOrId = `${product.slug || ""} ${product.id || ""}`.toLowerCase();
    if (
      slugOrId.includes(PROGRAM_SLUGS.BUNDLE) ||
      slugOrId.includes(PROGRAM_UUIDS.BUNDLE)
    ) {
      return [
        { slot: "food-plan-en", label: "Food Plan — English (PDF)", lang: "en" },
        { slot: "food-plan-ro", label: "Food Plan — Română (PDF)", lang: "ro" },
        { slot: "training-program-en", label: "Training Program — English (PDF)", lang: "en" },
        { slot: "training-program-ro", label: "Training Program — Română (PDF)", lang: "ro" },
        { slot: "bench-program-en", label: "Bench Program — English (PDF)", lang: "en" },
        { slot: "bench-program-ro", label: "Bench Program — Română (PDF)", lang: "ro" },
      ];
    }
    if (
      slugOrId.includes(PROGRAM_SLUGS.TRAINING_PROGRAM) ||
      slugOrId.includes(PROGRAM_UUIDS.TRAINING_PROGRAM)
    ) {
      return [
        { slot: "training-program-en", label: "Training Program — English (PDF)", lang: "en" },
        { slot: "training-program-ro", label: "Training Program — Română (PDF)", lang: "ro" },
      ];
    }
    if (
      slugOrId.includes(PROGRAM_SLUGS.BENCH_PROGRAM) ||
      slugOrId.includes(PROGRAM_UUIDS.BENCH_PROGRAM)
    ) {
      return [
        { slot: "bench-program-en", label: "Bench Program — English (PDF)", lang: "en" },
        { slot: "bench-program-ro", label: "Bench Program — Română (PDF)", lang: "ro" },
      ];
    }
    if (
      slugOrId.includes(PROGRAM_SLUGS.FOOD_PLAN) ||
      slugOrId.includes(PROGRAM_UUIDS.FOOD_PLAN)
    ) {
      return [
        { slot: "food-plan-en", label: "Food Plan — English (PDF)", lang: "en" },
        { slot: "food-plan-ro", label: "Food Plan — Română (PDF)", lang: "ro" },
      ];
    }
    const customKey = sanitizeProgramSlug(product.slug || product.id || "program");
    const displayTitle =
      (typeof product.name === "object" ? product.name?.ro : product.name) ||
      product.slug ||
      "Program Digital";
    return [
      { slot: `${customKey}-en`, label: `${displayTitle} — English (PDF)`, lang: "en" },
      { slot: `${customKey}-ro`, label: `${displayTitle} — Română (PDF)`, lang: "ro" },
    ];
  })();

  const coverImage =
    (Array.isArray(product.images) && product.images[0]) || product.image || "";
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

      {/* 🧩 TIP PRODUS: FIZIC VS PROGRAM DIGITAL */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
            Categorie & Mod Livrare
          </h4>
          <p className="text-[11px] text-slate-500">
            Programele digitale au livrare automată pe email, transport 0 RON și selector automat de limbă RO/EN.
          </p>
        </div>
        <div className="inline-flex p-1 bg-slate-100 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => handleToggleProductType(false)}
            className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
              !isDigital
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Produs Fizic (Curier)
          </button>
          <button
            type="button"
            onClick={() => handleToggleProductType(true)}
            className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
              isDigital
                ? "bg-[#e32f8c] text-white shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Program Digital (Email PDF)
          </button>
        </div>
      </div>

      {/* 🖼️ POZA DE COPERTĂ + 📎 ATAȘARE PDF (PENTRU PROGRAME DIGITALE) */}
      <div className="p-5 bg-gradient-to-br from-slate-50 to-purple-50/40 border border-slate-200 rounded-2xl space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="relative w-24 h-28 rounded-2xl bg-slate-900 border-2 border-slate-200 overflow-hidden shrink-0 shadow-sm flex items-center justify-center">
            {coverImage ? (
              <img
                src={getOptimizedImageUrl(coverImage)}
                alt="Copertă"
                className="w-full h-full object-cover"
              />
            ) : (
              <ImageIcon className="w-8 h-8 text-slate-400" />
            )}
            <span className="absolute bottom-1 inset-x-1 bg-black/75 text-white text-[9px] font-black uppercase text-center py-0.5 rounded">
              Copertă
            </span>
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-black uppercase tracking-wider text-slate-900">
                Poza de Copertă Principală
              </h4>
              {isDigital && (
                <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 text-[10px] font-black uppercase">
                  Program Digital PDF
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Această imagine apare pe cardul programului/produsului în magazin, în secțiunea Programe, pe pagina produsului și în coșul de cumpărături.
            </p>
            <div className="flex items-center gap-2.5 pt-1 flex-wrap">
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#e32f8c] hover:bg-[#c41a72] text-black text-xs font-black uppercase tracking-wider cursor-pointer transition-all shadow-2xs">
                {uploadingCover ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Upload size={14} />
                )}
                <span>
                  {uploadingCover ? "Se încarcă..." : "Schimbă Poza de Copertă"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingCover}
                  onChange={handleCoverUpload}
                />
              </label>
            </div>
          </div>
        </div>

        {/* 📎 SECȚIUNE DEDICATĂ ATAȘĂRII PDF-ULUI (DOAR PENTRU PROGRAMELE DIGITALE) */}
        {isDigital && (
          <div className="pt-4 border-t border-purple-200/70 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-purple-950 flex items-center gap-1.5">
                  <FileText size={15} className="text-[#a855f7]" />
                  <span>Fișiere PDF Atașate Automat la Email (RO & EN)</span>
                </h4>
                <p className="text-[11px] text-slate-600">
                  Încarcă PDF-ul tău gata făcut pentru fiecare limbă. Când clientul cumpără programul, primește automat pe email PDF-ul corespunzător limbii alese.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pdfSlotsForProduct.map(({ slot, label, lang }) => {
                const currentUrl = programFiles[slot];
                const isUploadingThis = uploadingPdfSlot === slot;
                return (
                  <div
                    key={slot}
                    className="p-3.5 rounded-xl bg-white border border-purple-200/80 shadow-2xs flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 truncate">
                        <LanguageFlagSvg isEnglish={lang === "en"} className="w-[18px] h-[12px] shrink-0" />
                        <span className="truncate">{label}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        {currentUrl ? (
                          <>
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                              <Check size={11} /> PDF Atașat
                            </span>
                            <a
                              href={currentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-bold text-[#a855f7] hover:underline inline-flex items-center gap-1"
                            >
                              <span>Vezi PDF</span>
                              <ExternalLink size={11} />
                            </a>
                          </>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                            Niciun PDF încărcat încă
                          </span>
                        )}
                      </div>
                    </div>

                    <label className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-[#a855f7] text-white text-[11px] font-black uppercase tracking-wider cursor-pointer transition-colors">
                      {isUploadingThis ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Upload size={13} />
                      )}
                      <span>
                        {isUploadingThis
                          ? "Se urcă..."
                          : currentUrl
                            ? "Schimbă PDF"
                            : "Atașează PDF"}
                      </span>
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        className="hidden"
                        disabled={isUploadingThis}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handlePdfUpload(slot, f);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      
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

      {/* ✨ CELE 3 CARDURI SUB BUTONUL DE COȘ (HIGHLIGHTS PERSONALIZABILE) */}
      {(() => {
        const customHighlights: ProductHighlightItem[] = Array.isArray(specsSummary.highlights)
          ? specsSummary.highlights
          : [];
        const hasCustomHighlights = customHighlights.length > 0;
        const previewDefaults = getDefaultProductHighlights(product);

        return (
          <div className="pt-5 border-t border-slate-100 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[#e32f8c]" />
                  <span>Cele 3 Carduri de Sub Butonul de Coș (Highlights)</span>
                </h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  {hasCustomHighlights
                    ? "Personalizate manual pentru acest produs."
                    : `Mod Automat inteligent pentru acest tip de produs (ex: ${previewDefaults.map((h) => h.title.ro).join(" · ")}).`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!hasCustomHighlights ? (
                  <button
                    type="button"
                    onClick={() => updateSpecsSummary({ highlights: previewDefaults })}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Personalizează cele 3 carduri</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => updateSpecsSummary({ highlights: undefined })}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw size={13} />
                    <span>Resetează la Automat</span>
                  </button>
                )}
              </div>
            </div>

            {hasCustomHighlights && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[0, 1, 2].map((idx) => {
                  const h = customHighlights[idx] || {
                    icon: "sparkles" as HighlightIconKey,
                    title: { ro: "", en: "" },
                    subtitle: { ro: "", en: "" },
                  };
                  const updateCard = (patch: Partial<ProductHighlightItem>) => {
                    const next = [...customHighlights];
                    while (next.length <= idx) {
                      next.push({
                        icon: "sparkles",
                        title: { ro: "", en: "" },
                        subtitle: { ro: "", en: "" },
                      });
                    }
                    next[idx] = { ...next[idx], ...patch };
                    updateSpecsSummary({ highlights: next });
                  };
                  return (
                    <div
                      key={idx}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black uppercase text-slate-500">
                          Card #{idx + 1}
                        </span>
                        <select
                          value={h.icon || "sparkles"}
                          onChange={(e) =>
                            updateCard({ icon: e.target.value as HighlightIconKey })
                          }
                          className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700"
                        >
                          {HIGHLIGHT_ICON_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <input
                        type="text"
                        value={h.title?.ro || ""}
                        onChange={(e) =>
                          updateCard({ title: { ...(h.title || { ro: "", en: "" }), ro: e.target.value } })
                        }
                        placeholder="Titlu RO (ex: LIVRARE INSTANTĂ)"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-900"
                      />
                      <input
                        type="text"
                        value={h.subtitle?.ro || ""}
                        onChange={(e) =>
                          updateCard({
                            subtitle: { ...(h.subtitle || { ro: "", en: "" }), ro: e.target.value },
                          })
                        }
                        placeholder="Subtitlu RO"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                      />
                      <input
                        type="text"
                        value={h.title?.en || ""}
                        onChange={(e) =>
                          updateCard({ title: { ...(h.title || { ro: "", en: "" }), en: e.target.value } })
                        }
                        placeholder="Title EN"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-900"
                      />
                      <input
                        type="text"
                        value={h.subtitle?.en || ""}
                        onChange={(e) =>
                          updateCard({
                            subtitle: { ...(h.subtitle || { ro: "", en: "" }), en: e.target.value },
                          })
                        }
                        placeholder="Subtitle EN"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* 🎬 CLIPURI VIDEO AFIȘATE PE PAGINA ACESTUI PRODUS */}
      {(() => {
        const videoMode: string = specsSummary.video_mode || "default";
        const customVideoIds: string[] = Array.isArray(specsSummary.video_ids)
          ? specsSummary.video_ids.map(String)
          : [];

        const toggleCustomClip = (clipId: string | number) => {
          const idStr = String(clipId);
          const next = customVideoIds.includes(idStr)
            ? customVideoIds.filter((id) => id !== idStr)
            : [...customVideoIds, idStr];
          updateSpecsSummary({ video_mode: "custom", video_ids: next });
        };

        return (
          <div className="pt-5 border-t border-slate-100 space-y-4">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Video size={14} className="text-[#e32f8c]" />
                <span>Secțiune Clipuri Video pe Pagina Acestui Produs</span>
              </h4>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                {isDigital
                  ? "Implicit folosește selecția globală pentru Programe din secțiunea Influenceri (momentan clipurile de bench #2, 5, 7–11)."
                  : "Implicit afișează toate clipurile active. Poți personaliza sau ascunde individual pentru acest produs."}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                {
                  val: "default",
                  label: isDigital ? "Implicit (Setare Programe)" : "Implicit (Toate Active)",
                },
                { val: "all", label: "Toate Clipurile Active" },
                { val: "custom", label: "Selectează Manual" },
                { val: "none", label: "Ascunde pe Acest Produs" },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => updateSpecsSummary({ video_mode: opt.val })}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-black transition-all cursor-pointer text-left ${
                    videoMode === opt.val
                      ? "bg-[#e32f8c]/15 border-[#e32f8c] text-slate-900 shadow-2xs"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {videoMode === "custom" && (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 pt-1">
                {allInfluencers.map((inf, idx) => {
                  const idStr = String(inf.id);
                  const isChecked = customVideoIds.includes(idStr);
                  return (
                    <button
                      key={idStr}
                      type="button"
                      onClick={() => toggleCustomClip(inf.id)}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                        isChecked
                          ? "bg-[#e32f8c]/10 border-[#e32f8c]"
                          : "bg-slate-50 border-slate-200 opacity-75 hover:opacity-100"
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          isChecked
                            ? "bg-[#e32f8c] border-[#e32f8c] text-white"
                            : "bg-white border-slate-300"
                        }`}
                      >
                        {isChecked && <Check size={11} strokeWidth={3} />}
                      </span>
                      <span className="text-[11px] font-bold text-slate-800 truncate">
                        #{idx + 1} {inf.influencer_name || "Clip"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ❓ ÎNTREBĂRI FRECVENTE (FAQ) SPECIFICE PRODUSULUI */}
      {(() => {
        const customFaqs: ProductFaqEntry[] = Array.isArray(specsSummary.faqs)
          ? specsSummary.faqs
          : [];
        const hasCustomFaqs = customFaqs.length > 0;

        const seedDefaultFaqs = () => {
          const roList = getDefaultProductFaqs(product, "ro");
          const enList = getDefaultProductFaqs(product, "en");
          const combined: ProductFaqEntry[] = roList.map((item, idx) => ({
            question: { ro: item.question, en: enList[idx]?.question || item.question },
            answer: { ro: item.answer, en: enList[idx]?.answer || item.answer },
          }));
          updateSpecsSummary({ faqs: combined });
        };

        const addBlankFaq = () => {
          const base = hasCustomFaqs ? customFaqs : [];
          updateSpecsSummary({
            faqs: [
              ...base,
              {
                question: { ro: "", en: "" },
                answer: { ro: "", en: "" },
              },
            ],
          });
        };

        return (
          <div className="pt-5 border-t border-slate-100 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <HelpCircle size={14} className="text-[#e32f8c]" />
                  <span>Întrebări Frecvente (FAQ) Specifice Acestui Produs</span>
                </h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  {hasCustomFaqs
                    ? `${customFaqs.length} întrebări personalizate.`
                    : "Se generează automat întrebări relevante pentru categoria acestui produs."}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {!hasCustomFaqs && (
                  <button
                    type="button"
                    onClick={seedDefaultFaqs}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Încarcă Recomandate pt. Editare
                  </button>
                )}
                {hasCustomFaqs && (
                  <button
                    type="button"
                    onClick={() => updateSpecsSummary({ faqs: undefined })}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw size={12} />
                    <span>Resetează la Automat</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={addBlankFaq}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Adaugă Întrebare FAQ</span>
                </button>
              </div>
            </div>

            {hasCustomFaqs && (
              <div className="space-y-3">
                {customFaqs.map((faq, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-slate-500">
                        Întrebare #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateSpecsSummary({
                            faqs: customFaqs.filter((_, i) => i !== idx),
                          })
                        }
                        className="p-1 text-slate-400 hover:text-red-500 rounded-lg cursor-pointer"
                        title="Șterge întrebarea"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        value={faq.question?.ro || ""}
                        onChange={(e) => {
                          const next = [...customFaqs];
                          next[idx] = {
                            ...next[idx],
                            question: { ...next[idx].question, ro: e.target.value },
                          };
                          updateSpecsSummary({ faqs: next });
                        }}
                        placeholder="Întrebare RO..."
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                      />
                      <input
                        type="text"
                        value={faq.question?.en || ""}
                        onChange={(e) => {
                          const next = [...customFaqs];
                          next[idx] = {
                            ...next[idx],
                            question: { ...next[idx].question, en: e.target.value },
                          };
                          updateSpecsSummary({ faqs: next });
                        }}
                        placeholder="Question EN..."
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                      />
                      <textarea
                        rows={2}
                        value={faq.answer?.ro || ""}
                        onChange={(e) => {
                          const next = [...customFaqs];
                          next[idx] = {
                            ...next[idx],
                            answer: { ...next[idx].answer, ro: e.target.value },
                          };
                          updateSpecsSummary({ faqs: next });
                        }}
                        placeholder="Răspuns RO..."
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 resize-none"
                      />
                      <textarea
                        rows={2}
                        value={faq.answer?.en || ""}
                        onChange={(e) => {
                          const next = [...customFaqs];
                          next[idx] = {
                            ...next[idx],
                            answer: { ...next[idx].answer, en: e.target.value },
                          };
                          updateSpecsSummary({ faqs: next });
                        }}
                        placeholder="Answer EN..."
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 resize-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

    </div>
  );
}
