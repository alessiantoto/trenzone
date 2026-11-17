"use client";

import { useEffect, useState } from "react";
import { Product, type InfluencerVideo } from "@/lib/api";
import {
  Plus,
  Trash2,
  ExternalLink,
  Tag,
  Check,
  Award,
  Upload,
  FileText,
  Image as ImageIcon,
  Loader2,
  Video,
  HelpCircle,
  RotateCcw,
} from "lucide-react";
import { uploadProductImage } from "@/app/actions/admin-products";
import { getProgramFilesAction, removeProgramPdfSlotAction } from "@/app/actions/programs";
import { uploadAdminProgramPdf } from "@/lib/admin-pdf-upload";
import { extractProgramPdfDisplayName } from "@/lib/program-pdf-display";
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

interface BilingualListSectionProps {
  title: string;
  countLabel: string;
  badgeClassName: string;
  indexBadgeClassName: string;
  subtitle: string;
  addButtonLabel: string;
  emptyLabel: string;
  placeholderRO: string;
  placeholderEN: string;
  deleteTitle: string;
  itemsRO: string[];
  itemsEN: string[];
  onAdd: () => void;
  onChangeItem: (index: number, lang: "ro" | "en", value: string) => void;
  onRemoveItem: (index: number) => void;
}

/**
 * Reusable mobile-friendly editor section for bilingual (RO/EN) bullet lists
 * such as key product advantages and recommended usage cases.
 */
function BilingualListSection({
  title,
  countLabel,
  badgeClassName,
  indexBadgeClassName,
  subtitle,
  addButtonLabel,
  emptyLabel,
  placeholderRO,
  placeholderEN,
  deleteTitle,
  itemsRO,
  itemsEN,
  onAdd,
  onChangeItem,
  onRemoveItem,
}: BilingualListSectionProps) {
  return (
    <div className="pt-5 border-t border-slate-100 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
              {title}
            </h4>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${badgeClassName}`}>
              {itemsRO.length} {countLabel}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            {subtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="w-full sm:w-auto min-h-[40px] px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs shrink-0"
        >
          <Plus size={14} />
          <span>{addButtonLabel}</span>
        </button>
      </div>

      <div className="space-y-3">
        {itemsRO.map((itemRO, idx) => (
          <div
            key={idx}
            className="p-3 sm:p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center shrink-0 ${indexBadgeClassName}`}>
                  {idx + 1}
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Română / English
                </span>
              </div>
              <button
                type="button"
                onClick={() => onRemoveItem(idx)}
                className="min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                title={deleteTitle}
                aria-label={deleteTitle}
              >
                <Trash2 size={15} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div className="min-w-0 space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Română (RO)
                </label>
                <textarea
                  rows={2}
                  value={itemRO}
                  onChange={(e) => onChangeItem(idx, "ro", e.target.value.replace(/\r?\n/g, " "))}
                  placeholder={placeholderRO}
                  className="w-full min-w-0 px-3 py-2 bg-white border border-slate-200 rounded-xl text-base sm:text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#e32f8c] leading-snug resize-y"
                />
              </div>
              <div className="min-w-0 space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  English (EN)
                </label>
                <textarea
                  rows={2}
                  value={itemsEN[idx] || ""}
                  onChange={(e) => onChangeItem(idx, "en", e.target.value.replace(/\r?\n/g, " "))}
                  placeholder={placeholderEN}
                  className="w-full min-w-0 px-3 py-2 bg-white border border-slate-200 rounded-xl text-base sm:text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#e32f8c] leading-snug resize-y"
                />
              </div>
            </div>
          </div>
        ))}

        {itemsRO.length === 0 && (
          <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl">
            <p className="text-xs text-slate-400 font-bold">{emptyLabel}</p>
          </div>
        )}
      </div>
    </div>
  );
}

const HIGHLIGHT_ICON_OPTIONS: Array<{ value: HighlightIconKey; label: string }> = [
  { value: "mail", label: "Email / Digital" },
  { value: "sparkles", label: "Accent / Metodă" },
  { value: "check", label: "Bifă / Acces" },
  { value: "flame", label: "Intensitate / Nutriție" },
  { value: "target", label: "Țintă / Obiectiv" },
  { value: "dumbbell", label: "Gantere / Sală" },
  { value: "zap", label: "Putere / Forță" },
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
      const res = await uploadAdminProgramPdf(slot, file);
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

  const handlePdfRemove = async (slot: string) => {
    setUploadingPdfSlot(slot);
    try {
      const res = await removeProgramPdfSlotAction(slot);
      if (res.success) {
        setProgramFiles((prev) => {
          const next = { ...prev };
          delete next[slot];
          return next;
        });
        toast.success(`PDF-ul (${slot.toUpperCase()}) a fost șters complet.`);
      } else {
        toast.error(res.error || "Nu s-a putut șterge PDF-ul.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Eroare la ștergerea PDF-ului.");
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

      {/* TIP PRODUS: FIZIC VS PROGRAM DIGITAL */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="min-w-0">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
            Categorie & Mod Livrare
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Programele digitale au livrare automată pe email, transport 0 RON și selector automat de limbă RO/EN.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:inline-flex sm:grid-cols-2 p-1 bg-slate-100 rounded-xl gap-1 sm:gap-0 w-full sm:w-auto shrink-0">
          <button
            type="button"
            onClick={() => handleToggleProductType(false)}
            className={`min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer text-center ${
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
            className={`min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer text-center ${
              isDigital
                ? "bg-[#e32f8c] text-white shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Program Digital (Email PDF)
          </button>
        </div>
      </div>

      {/* POZA DE COPERTĂ + ATAȘARE PDF (PENTRU PROGRAME DIGITALE) */}
      <div className="p-4 sm:p-5 bg-gradient-to-br from-slate-50 to-purple-50/40 border border-slate-200 rounded-2xl space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">
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

          <div className="flex-1 min-w-0 space-y-2 w-full">
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
              <label className="min-h-[42px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#e32f8c] hover:bg-[#c41a72] text-black text-xs font-black uppercase tracking-wider cursor-pointer transition-all shadow-2xs w-full sm:w-auto">
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

        {/* SECȚIUNE DEDICATĂ ATAȘĂRII PDF-ULUI (DOAR PENTRU PROGRAMELE DIGITALE) */}
        {isDigital && (
          <div className="pt-4 border-t border-purple-200/70 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-purple-950 flex items-center gap-1.5">
                  <FileText size={15} className="text-[#a855f7] shrink-0" />
                  <span>Fișiere PDF Atașate Automat la Email (RO & EN)</span>
                </h4>
                <p className="text-[11px] text-slate-600 mt-0.5">
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
                    className="p-3.5 rounded-xl bg-white border border-purple-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 w-full">
                      <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                        <LanguageFlagSvg isEnglish={lang === "en"} className="w-[18px] h-[12px] shrink-0" />
                        <span className="truncate">{label}</span>
                      </div>
                      <div className="mt-1.5 space-y-1">
                        {currentUrl ? (
                          <>
                            <div className="flex items-center gap-2 flex-wrap">
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
                            </div>
                            <div
                              title={extractProgramPdfDisplayName(currentUrl)}
                              className="text-[11px] font-mono font-semibold text-slate-700 truncate max-w-full sm:max-w-[260px]"
                            >
                              {extractProgramPdfDisplayName(currentUrl)}
                            </div>
                          </>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md inline-block">
                            Niciun PDF încărcat încă
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5 w-full sm:w-auto justify-end">
                      <label className="flex-1 sm:flex-none min-h-[38px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-[#a855f7] text-white text-[11px] font-black uppercase tracking-wider cursor-pointer transition-colors">
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
                      {currentUrl && (
                        <button
                          type="button"
                          onClick={() => handlePdfRemove(slot)}
                          disabled={isUploadingThis}
                          title="Șterge PDF definitiv"
                          className="min-w-[38px] min-h-[38px] p-2 rounded-xl bg-white border border-red-200 hover:bg-red-50 text-red-600 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      
      {/* NUME PRODUS (RO & EN) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        <div className="min-w-0">
          <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block">
            Nume Produs (Română) <span className="text-red-500">*</span>
          </label>
          <input 
            type="text" 
            value={nameRO || ''}
            onChange={(e) => onChange("name", { ro: e.target.value, en: nameEN })}
            placeholder="ex: X10 Elbow Wraps"
            className="w-full min-w-0 h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-[#e32f8c] focus:bg-white transition-all shadow-2xs"
          />
        </div>
        <div className="min-w-0">
          <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block">
            Nume Produs (Engleză)
          </label>
          <input 
            type="text" 
            value={nameEN || ''}
            onChange={(e) => onChange("name", { ro: nameRO, en: e.target.value })}
            placeholder="ex: X10 Elbow Wraps"
            className="w-full min-w-0 h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-[#e32f8c] focus:bg-white transition-all shadow-2xs"
          />
        </div>
      </div>

      {/* SLUG URL & BADGE (INSIGNĂ) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl">
        {/* Slug URL */}
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
            <label className="text-[10px] font-black uppercase text-slate-500">
              Slug URL (Adresă magazin)
            </label>
            {product.slug && (
              <a 
                href={`/ro/product/${product.slug}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-[11px] text-[#e32f8c] hover:underline font-bold flex items-center gap-1 shrink-0"
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
            className="w-full min-w-0 h-11 sm:h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-base sm:text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-[#e32f8c] shadow-2xs"
          />
          <p className="text-[10px] text-slate-400 mt-1 font-medium truncate">
            URL: <span className="font-mono">/product/{product.slug || 'slug-produs'}</span>
          </p>
        </div>

        {/* Badge (Insignă Produs) */}
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
            <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1">
              <Tag size={11} className="text-[#e32f8c]" /> Insignă Produs (Badge)
            </label>
            <span className="text-[10px] text-slate-400 font-medium">Apare pe carduri & hero</span>
          </div>
          <input 
            type="text" 
            value={(product as any).badge || ''}
            onChange={(e) => onChange("badge", e.target.value)}
            placeholder="ex: PR CHASER · +20 KG"
            className="w-full min-w-0 h-11 sm:h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-base sm:text-xs font-black text-slate-800 focus:outline-none focus:border-[#e32f8c] shadow-2xs"
          />
          {/* Quick presets */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {['PR CHASER · +20 KG', 'HIPERTROFIE & VOLUM', 'BEST SELLER', 'NOU', 'PRECOMANDĂ'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onChange("badge", preset)}
                className={`px-2.5 py-1 sm:py-0.5 rounded-md text-[10px] font-black transition-all cursor-pointer ${
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
                className="px-2.5 py-1 sm:py-0.5 rounded-md text-[10px] font-bold text-red-500 hover:bg-red-50 cursor-pointer"
              >
                Șterge
              </button>
            )}
          </div>
        </div>
      </div>

      {/* PREȚURI & REDUCERI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        <div className="min-w-0">
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
              className="w-full min-w-0 h-11 pl-12 pr-3.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm font-black text-slate-900 focus:outline-none focus:border-[#e32f8c] focus:bg-white transition-all shadow-2xs font-mono"
            />
          </div>
        </div>

        <div className="min-w-0">
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
              className="w-full min-w-0 h-11 pl-12 pr-3.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm font-bold text-slate-700 focus:outline-none focus:border-[#e32f8c] focus:bg-white transition-all shadow-2xs font-mono"
            />
          </div>
        </div>

        <div className="min-w-0">
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

      {/* STOC, GREUTATE, DIMENSIUNI COLET & STATUS */}
      <div className="grid grid-cols-2 lg:grid-cols-12 gap-4 p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs items-end">
        <div className="col-span-1 lg:col-span-2 min-w-0">
          <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block">Stoc Total (Bucăți)</label>
          <input 
            type="number" 
            value={product.stock_quantity ?? 0}
            onChange={(e) => onChange("stock_quantity", parseInt(e.target.value) || 0)}
            className="w-full min-w-0 h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm font-black text-slate-900 focus:outline-none focus:border-[#e32f8c] font-mono"
          />
        </div>

        <div className="col-span-1 lg:col-span-2 min-w-0">
          <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block">Greutate Colet (kg)</label>
          <input 
            type="number" 
            step="0.05"
            value={product.weight ?? 0.5}
            onChange={(e) => onChange("weight", parseFloat(e.target.value) || 0.5)}
            className="w-full min-w-0 h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-[#e32f8c] font-mono"
          />
        </div>

        <div className="col-span-2 lg:col-span-5 min-w-0">
          <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block">
            Dimensiuni Colet (L x l x H mm)
          </label>
          <div className="grid grid-cols-3 gap-2">
            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase text-slate-400 block mb-1 text-center">L (mm)</span>
              <input 
                type="number" 
                placeholder="L" 
                value={(product as any).length_mm ?? 100}
                onChange={(e) => onChange("length_mm", parseInt(e.target.value) || 100)}
                title="Lungime (mm)"
                className="w-full min-w-0 h-11 px-2 text-center bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs font-bold text-slate-800 focus:outline-none focus:border-[#e32f8c] font-mono"
              />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase text-slate-400 block mb-1 text-center">l (mm)</span>
              <input 
                type="number" 
                placeholder="l" 
                value={(product as any).width_mm ?? 100}
                onChange={(e) => onChange("width_mm", parseInt(e.target.value) || 100)}
                title="Lățime (mm)"
                className="w-full min-w-0 h-11 px-2 text-center bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs font-bold text-slate-800 focus:outline-none focus:border-[#e32f8c] font-mono"
              />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase text-slate-400 block mb-1 text-center">H (mm)</span>
              <input 
                type="number" 
                placeholder="H" 
                value={(product as any).height_mm ?? 100}
                onChange={(e) => onChange("height_mm", parseInt(e.target.value) || 100)}
                title="Înălțime (mm)"
                className="w-full min-w-0 h-11 px-2 text-center bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs font-bold text-slate-800 focus:outline-none focus:border-[#e32f8c] font-mono"
              />
            </div>
          </div>
        </div>

        <div className="col-span-2 lg:col-span-3 min-w-0">
          <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block">Vizibilitate Magazin</label>
          <button 
            type="button"
            onClick={() => onChange("is_active", !product.is_active)}
            className={`w-full h-11 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs ${
              product.is_active 
                ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
            }`}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${product.is_active ? 'bg-white animate-pulse' : 'bg-slate-400'}`}></span>
            <span className="truncate">{product.is_active ? 'Activ (Publicat)' : 'Ciornă (Ascuns)'}</span>
          </button>
        </div>
      </div>

      {/* DESCRIERI (RO & EN) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        <div className="min-w-0">
          <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block">
            Descriere Scurtă (Română)
          </label>
          <textarea 
            rows={4}
            value={descRO || ''}
            onChange={(e) => onChange("description", { ro: e.target.value, en: descEN })}
            placeholder="Descrierea principală afișată pe pagina produsului..."
            className="w-full min-w-0 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs font-medium text-slate-900 focus:outline-none focus:border-[#e32f8c] focus:bg-white transition-all resize-y shadow-2xs leading-relaxed"
          />
        </div>
        <div className="min-w-0">
          <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block">
            Descriere Scurtă (Engleză)
          </label>
          <textarea 
            rows={4}
            value={descEN || ''}
            onChange={(e) => onChange("description", { ro: descRO, en: e.target.value })}
            placeholder="Main product description in English..."
            className="w-full min-w-0 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs font-medium text-slate-900 focus:outline-none focus:border-[#e32f8c] focus:bg-white transition-all resize-y shadow-2xs leading-relaxed"
          />
        </div>
      </div>

      {/* PUNCTE FORTE & AVANTAJE */}
      <BilingualListSection
        title="Puncte Forte & Avantaje Cheie"
        countLabel="puncte"
        badgeClassName="bg-purple-50 text-purple-700 border-purple-200"
        indexBadgeClassName="bg-emerald-100 text-emerald-800"
        subtitle="Listă de beneficii evidențiate cu bifă verde pe pagina produsului"
        addButtonLabel="Adaugă Punct Forte"
        emptyLabel="Niciun avantaj configurat încă."
        placeholderRO="Avantaj în Română..."
        placeholderEN="Benefit in English..."
        deleteTitle="Șterge avantaj"
        itemsRO={advantagesRO}
        itemsEN={advantagesEN}
        onAdd={handleAddAdvantage}
        onChangeItem={handleAdvantageChange}
        onRemoveItem={handleRemoveAdvantage}
      />

      {/* RECOMANDAT PENTRU (Usage signs) */}
      <BilingualListSection
        title="Recomandat Pentru / Cazuri de Utilizare"
        countLabel="recomandări"
        badgeClassName="bg-cyan-50 text-cyan-800 border-cyan-200"
        indexBadgeClassName="bg-cyan-100 text-cyan-800"
        subtitle="Afișat în secțiunea de recomandare pe pagina produsului"
        addButtonLabel="Adaugă Recomandare"
        emptyLabel="Nicio recomandare configurată încă."
        placeholderRO="Recomandare în Română..."
        placeholderEN="Usage case in English..."
        deleteTitle="Șterge recomandare"
        itemsRO={usageRO}
        itemsEN={usageEN}
        onAdd={handleAddUsageSign}
        onChangeItem={handleUsageChange}
        onRemoveItem={handleRemoveUsageSign}
      />

      {/* CELE 3 CARDURI SUB BUTONUL DE COȘ (HIGHLIGHTS PERSONALIZABILE) */}
      {(() => {
        const customHighlights: ProductHighlightItem[] = Array.isArray(specsSummary.highlights)
          ? specsSummary.highlights
          : [];
        const hasCustomHighlights = customHighlights.length > 0;
        const previewDefaults = getDefaultProductHighlights(product);

        return (
          <div className="pt-5 border-t border-slate-100 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Award size={14} className="text-[#e32f8c] shrink-0" />
                  <span>Cele 3 Carduri de Sub Butonul de Coș (Highlights)</span>
                </h4>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  {hasCustomHighlights
                    ? "Personalizate manual pentru acest produs."
                    : `Mod Automat inteligent pentru acest tip de produs (ex: ${previewDefaults.map((h) => h.title.ro).join(" · ")}).`}
                </p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                {!hasCustomHighlights ? (
                  <button
                    type="button"
                    onClick={() => updateSpecsSummary({ highlights: previewDefaults })}
                    className="w-full sm:w-auto min-h-[40px] px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Personalizează cele 3 carduri</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => updateSpecsSummary({ highlights: undefined })}
                    className="w-full sm:w-auto min-h-[40px] px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5 min-w-0"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black uppercase text-slate-500 shrink-0">
                          Card #{idx + 1}
                        </span>
                        <select
                          value={h.icon || "sparkles"}
                          onChange={(e) =>
                            updateCard({ icon: e.target.value as HighlightIconKey })
                          }
                          className="min-w-0 max-w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-base sm:text-[11px] font-bold text-slate-700"
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
                        className="w-full min-w-0 px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-base sm:text-xs font-black text-slate-900"
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
                        className="w-full min-w-0 px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-base sm:text-xs font-medium text-slate-700"
                      />
                      <input
                        type="text"
                        value={h.title?.en || ""}
                        onChange={(e) =>
                          updateCard({ title: { ...(h.title || { ro: "", en: "" }), en: e.target.value } })
                        }
                        placeholder="Title EN"
                        className="w-full min-w-0 px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-base sm:text-xs font-black text-slate-900"
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
                        className="w-full min-w-0 px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-base sm:text-xs font-medium text-slate-700"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* CLIPURI VIDEO AFIȘATE PE PAGINA ACESTUI PRODUS */}
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
                <Video size={14} className="text-[#e32f8c] shrink-0" />
                <span>Secțiune Clipuri Video pe Pagina Acestui Produs</span>
              </h4>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                {isDigital
                  ? "Implicit folosește selecția globală pentru Programe din secțiunea Influenceri (momentan clipurile de bench #2, 5, 7–11)."
                  : "Implicit afișează toate clipurile active. Poți personaliza sau ascunde individual pentru acest produs."}
              </p>
            </div>

            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-4 gap-2">
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
                  className={`min-h-[44px] px-3 py-2.5 rounded-xl border text-xs font-black transition-all cursor-pointer text-left leading-tight ${
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
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 pt-1">
                {allInfluencers.map((inf, idx) => {
                  const idStr = String(inf.id);
                  const isChecked = customVideoIds.includes(idStr);
                  return (
                    <button
                      key={idStr}
                      type="button"
                      onClick={() => toggleCustomClip(inf.id)}
                      className={`min-h-[40px] p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 min-w-0 ${
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

      {/* ÎNTREBĂRI FRECVENTE (FAQ) SPECIFICE PRODUSULUI */}
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
              <div className="min-w-0">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <HelpCircle size={14} className="text-[#e32f8c] shrink-0" />
                  <span>Întrebări Frecvente (FAQ) Specifice Acestui Produs</span>
                </h4>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  {hasCustomFaqs
                    ? `${customFaqs.length} întrebări personalizate.`
                    : "Se generează automat întrebări relevante pentru categoria acestui produs."}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0">
                {!hasCustomFaqs && (
                  <button
                    type="button"
                    onClick={seedDefaultFaqs}
                    className="min-h-[40px] px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl cursor-pointer text-center"
                  >
                    Încarcă Recomandate pt. Editare
                  </button>
                )}
                {hasCustomFaqs && (
                  <button
                    type="button"
                    onClick={() => updateSpecsSummary({ faqs: undefined })}
                    className="min-h-[40px] px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw size={12} />
                    <span>Resetează la Automat</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={addBlankFaq}
                  className="min-h-[40px] px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
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
                    <div className="flex items-center justify-between gap-2">
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
                        className="min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
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
                        className="w-full min-w-0 px-3 py-2 bg-white border border-slate-200 rounded-xl text-base sm:text-xs font-bold text-slate-900"
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
                        className="w-full min-w-0 px-3 py-2 bg-white border border-slate-200 rounded-xl text-base sm:text-xs font-bold text-slate-900"
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
                        className="w-full min-w-0 px-3 py-2 bg-white border border-slate-200 rounded-xl text-base sm:text-xs font-medium text-slate-700 resize-y"
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
                        className="w-full min-w-0 px-3 py-2 bg-white border border-slate-200 rounded-xl text-base sm:text-xs font-medium text-slate-700 resize-y"
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
