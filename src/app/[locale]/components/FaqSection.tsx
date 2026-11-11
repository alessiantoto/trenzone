"use client";

import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useRegionStore } from "@/store/useRegionStore";
import { formatPrice } from "@/utils/currency";
import { getProductPrice } from "@/utils/pricing";
import { Link } from "@/i18n/routing";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Plus,
  ShieldCheck,
  Sparkles,
  Truck,
  X,
} from "lucide-react";

type FaqCategory = "all" | "models" | "benefits" | "shipping";

interface LocalizedText {
  ro: string;
  en: string;
}

interface FaqPoint {
  title: LocalizedText;
  desc: LocalizedText;
}

interface FaqComparisonCard {
  slug: string;
  badge: LocalizedText;
  title: string;
  price: string;
  stiffness: LocalizedText;
  desc: LocalizedText;
  cta: LocalizedText;
  featured?: boolean;
}

interface FaqVsColumn {
  title: LocalizedText;
  items: LocalizedText[];
  isPositive: boolean;
}

interface FaqEntry {
  id: string;
  category: Exclude<FaqCategory, "all">;
  kicker: LocalizedText;
  question: LocalizedText;
  lead: LocalizedText;
  cards?: FaqComparisonCard[];
  duoNote?: {
    text: LocalizedText;
    badge: LocalizedText;
  };
  points?: FaqPoint[];
  vsColumns?: FaqVsColumn[];
  actionLink?: {
    href: string;
    label: LocalizedText;
  };
}

interface FaqSectionProps {
  x5Price?: number | Record<string, number>;
  x10Price?: number | Record<string, number>;
}

interface FaqAccordionItemProps {
  faq: FaqEntry;
  isRo: boolean;
  isOpen: boolean;
  onToggle: (id: string) => void;
}

const FaqAccordionItem = memo(function FaqAccordionItem({
  faq,
  isRo,
  isOpen,
  onToggle,
}: FaqAccordionItemProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<Animation | null>(null);
  const isFirstRender = useRef(true);

  const t = (text: LocalizedText) => (isRo ? text.ro : text.en);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      panel.hidden = !isOpen;
      return;
    }

    // Snapshot geometry BEFORE cancelling active animation to keep rapid taps glitch-free
    const startHeight = panel.hidden ? 0 : panel.getBoundingClientRect().height;
    const startOpacity = panel.hidden
      ? 0
      : Number(getComputedStyle(panel).opacity) || 0;

    if (animRef.current) {
      animRef.current.cancel();
      animRef.current = null;
    }

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion || typeof panel.animate !== "function") {
      panel.hidden = !isOpen;
      panel.style.height = "";
      panel.style.overflow = "";
      panel.style.opacity = "";
      return;
    }

    if (isOpen) {
      panel.hidden = false;
      panel.style.overflow = "hidden";
      panel.style.height = "auto";
      const endHeight = panel.scrollHeight;
      panel.style.height = `${startHeight}px`;

      const anim = panel.animate(
        [
          { height: `${startHeight}px`, opacity: startOpacity },
          { height: `${endHeight}px`, opacity: 1 },
        ],
        {
          duration: 240,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        }
      );

      animRef.current = anim;
      anim.onfinish = () => {
        if (animRef.current !== anim) return;
        panel.style.height = "";
        panel.style.overflow = "";
        panel.style.opacity = "";
        animRef.current = null;
      };
    } else {
      if (startHeight <= 0 || panel.hidden) {
        panel.hidden = true;
        panel.style.height = "";
        panel.style.overflow = "";
        panel.style.opacity = "";
        return;
      }

      panel.style.overflow = "hidden";
      panel.style.height = `${startHeight}px`;

      const anim = panel.animate(
        [
          { height: `${startHeight}px`, opacity: startOpacity },
          { height: "0px", opacity: 0 },
        ],
        {
          duration: 190,
          easing: "cubic-bezier(0.32, 0, 0.67, 0)",
        }
      );

      animRef.current = anim;
      anim.onfinish = () => {
        if (animRef.current !== anim) return;
        panel.hidden = true;
        panel.style.height = "";
        panel.style.overflow = "";
        panel.style.opacity = "";
        animRef.current = null;
      };
    }
  }, [isOpen]);

  return (
    <div
      className={`[contain:layout_style] transition-colors duration-150 ${
        isOpen ? "bg-[#151722]" : "bg-[#101119] hover:bg-[#13141e]"
      }`}
    >
      <button
        type="button"
        onClick={() => onToggle(faq.id)}
        aria-expanded={isOpen}
        aria-controls={`faq-panel-${faq.id}`}
        style={{ WebkitTapHighlightColor: "transparent" }}
        className="w-full px-4 py-4 sm:px-7 sm:py-5 flex items-center justify-between gap-4 text-left cursor-pointer touch-manipulation select-none group"
      >
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#e32f8c]">
            {t(faq.kicker)}
          </span>
          <h3 className="text-[15px] sm:text-[17px] font-bold tracking-tight text-white leading-snug group-hover:text-zinc-100">
            {t(faq.question)}
          </h3>
        </div>

        <span
          aria-hidden="true"
          className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border transition-colors duration-150 ${
            isOpen
              ? "bg-[#e32f8c] border-[#e32f8c] text-white"
              : "bg-white/[0.04] border-white/10 text-zinc-400 group-hover:text-white group-hover:border-white/25"
          }`}
        >
          <Plus
            className={`w-4 h-4 transition-transform duration-200 ease-out ${
              isOpen ? "rotate-45" : "rotate-0"
            }`}
            strokeWidth={2.5}
          />
        </span>
      </button>

      <div ref={panelRef} id={`faq-panel-${faq.id}`} hidden={!isOpen}>
        <div className="px-4 pb-5 sm:px-7 sm:pb-6 pt-0">
          <div className="pt-3.5 border-t border-white/[0.07] space-y-4">
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal">
              {t(faq.lead)}
            </p>

            {/* Side-by-side X5 vs X10 conversion comparison cards */}
            {faq.cards && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {faq.cards.map((card) => (
                  <div
                    key={card.slug}
                    className={`rounded-xl p-4 sm:p-5 border flex flex-col justify-between gap-4 ${
                      card.featured
                        ? "bg-[#e32f8c]/[0.07] border-[#e32f8c]/45"
                        : "bg-[#0a0b10] border-white/10"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            card.featured
                              ? "bg-[#e32f8c]/20 text-[#e32f8c]"
                              : "bg-white/10 text-zinc-300"
                          }`}
                        >
                          {t(card.badge)}
                        </span>
                        <span className="text-base sm:text-lg font-black text-white tabular-nums font-[family-name:var(--font-oswald)]">
                          {card.price}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-base sm:text-lg font-black uppercase tracking-tight text-white font-[family-name:var(--font-oswald)]">
                          {card.title}
                        </h4>
                        <p className="text-[11px] font-semibold text-[#e32f8c] mt-0.5">
                          {t(card.stiffness)}
                        </p>
                      </div>

                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {t(card.desc)}
                      </p>
                    </div>

                    <Link
                      href={`/product/${card.slug}`}
                      className={`inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-4 rounded-lg text-xs font-black uppercase tracking-wider transition-colors duration-150 ${
                        card.featured
                          ? "bg-[#e32f8c] text-white hover:bg-white hover:text-black"
                          : "bg-white text-black hover:bg-[#e32f8c] hover:text-white"
                      }`}
                    >
                      <span>{t(card.cta)}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            )}

            {/* Duo stack savings note */}
            {faq.duoNote && (
              <div className="rounded-xl bg-[#0a0b10] border border-white/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-medium text-zinc-300 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#e32f8c] shrink-0" />
                  <span>{t(faq.duoNote.text)}</span>
                </span>
                <Link
                  href="/#shop-products"
                  className="self-start sm:self-auto text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-[#e32f8c]/15 text-[#e32f8c] border border-[#e32f8c]/30 hover:bg-[#e32f8c] hover:text-white transition-colors shrink-0"
                >
                  {t(faq.duoNote.badge)}
                </Link>
              </div>
            )}

            {/* Clean 2-col benefit / logistics points */}
            {faq.points && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {faq.points.map((pt, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl bg-[#0a0b10] border border-white/[0.08] p-3.5 flex items-start gap-2.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#e32f8c] shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-[13px] font-bold text-white leading-snug">
                        {t(pt.title)}
                      </h4>
                      <p className="text-xs text-zinc-400 leading-relaxed mt-0.5">
                        {t(pt.desc)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Direct quality comparison columns */}
            {faq.vsColumns && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {faq.vsColumns.map((col, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xl p-4 border space-y-2.5 ${
                      col.isPositive
                        ? "bg-[#e32f8c]/[0.06] border-[#e32f8c]/35"
                        : "bg-[#0a0b10] border-white/[0.08]"
                    }`}
                  >
                    <h4
                      className={`text-xs font-black uppercase tracking-wider ${
                        col.isPositive ? "text-[#e32f8c]" : "text-zinc-400"
                      }`}
                    >
                      {t(col.title)}
                    </h4>
                    <ul className="space-y-2">
                      {col.items.map((item, iIdx) => (
                        <li
                          key={iIdx}
                          className="flex items-start gap-2 text-xs leading-relaxed text-zinc-300"
                        >
                          {col.isPositive ? (
                            <Check className="w-3.5 h-3.5 text-[#e32f8c] shrink-0 mt-0.5" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                          )}
                          <span>{t(item)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {/* Optional policy/product link */}
            {faq.actionLink && (
              <div>
                <Link
                  href={faq.actionLink.href}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#e32f8c] hover:text-white transition-colors"
                >
                  <span>{t(faq.actionLink.label)}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export function FaqSection({ x5Price = 329.99, x10Price = 529.99 }: FaqSectionProps) {
  const locale = useLocale();
  const isRo = locale === "ro";
  const { currency } = useRegionStore();

  const [activeCategory, setActiveCategory] = useState<FaqCategory>("all");
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set(["x5-vs-x10"]));

  const x5PriceStr = formatPrice(getProductPrice(x5Price, currency), currency);
  const x10PriceStr = formatPrice(getProductPrice(x10Price, currency), currency);

  const categories = useMemo(
    () => [
      { id: "all" as const, label: isRo ? "Toate (6)" : "All (6)" },
      { id: "models" as const, label: isRo ? "Modele & Mărime" : "Models & Sizing" },
      { id: "benefits" as const, label: isRo ? "Forță & Calitate" : "Strength & Build" },
      { id: "shipping" as const, label: isRo ? "Livrare & Garanție" : "Shipping & Guarantee" },
    ],
    [isRo]
  );

  const faqs: FaqEntry[] = useMemo(
    () => [
      {
        id: "x5-vs-x10",
        category: "models",
        kicker: { ro: "ALEGERE MODEL", en: "MODEL GUIDE" },
        question: {
          ro: "Ce model să aleg: TrenZone X5 sau TrenZone X10?",
          en: "Which model should I choose: TrenZone X5 or X10?",
        },
        lead: {
          ro: "Ambele au compresie reglabilă pe orice grosime a brațului. Diferența este nivelul de rigiditate și greutatea cu care te antrenezi:",
          en: "Both fit any arm size with adjustable tension. Your choice depends on wrap stiffness and your working weight:",
        },
        cards: [
          {
            slug: "x5-elbow-wraps",
            badge: { ro: "VOLUM & CONFORT", en: "VOLUME & COMFORT" },
            title: "TRENZONE X5",
            price: x5PriceStr,
            stiffness: {
              ro: "Rigiditate 3.5 / 5 · Ferm & Flexibil",
              en: "3.5 / 5 Stiffness · Firm & Flexible",
            },
            desc: {
              ro: "Ideal pentru hipertrofie, serii de volum, împins cu gantere și protecția tendoanelor fără să îți blocheze mișcarea naturală.",
              en: "Built for hypertrophy, volume sets, dumbbell presses, and tendon relief with natural elbow mobility.",
            },
            cta: { ro: "Vezi TrenZone X5", en: "Shop TrenZone X5" },
          },
          {
            slug: "x10-elbow-wraps",
            badge: { ro: "CEL MAI ALES · MAX PR", en: "BEST SELLER · MAX PR" },
            title: "TRENZONE X10",
            price: x10PriceStr,
            stiffness: {
              ro: "Rigiditate 5.0 / 5 · Nivel Competiție",
              en: "5.0 / 5 Stiffness · Competition Grade",
            },
            desc: {
              ro: "Țesătură multi-strat extrem de densă (1.2 kg) pentru greutăți mari (100–200+ kg) și până la +20 kg asistență mecanică la ieșirea din piept.",
              en: "Ultra-dense 1.2 kg multi-layer weave engineered for 100–200+ kg lifts and up to +20 kg rebound assist out of the bottom.",
            },
            cta: { ro: "Vezi TrenZone X10", en: "Shop TrenZone X10" },
            featured: true,
          },
        ],
        duoNote: {
          text: {
            ro: "Folosești X5 la volum și X10 la zilele grele? Pachetul Duo (X5 + X10) aplică automat reducere.",
            en: "Want X5 for volume days and X10 for max bench days? The Duo Stack (X5 + X10) includes an automatic discount.",
          },
          badge: { ro: "DUO PACK · -5%", en: "DUO STACK · -5%" },
        },
      },
      {
        id: "weight-and-benefits",
        category: "benefits",
        kicker: { ro: "REZULTATE & BIOMECANICĂ", en: "RESULTS & BIOMECHANICS" },
        question: {
          ro: "Cât suport real oferă în plus și merg doar la împins la piept?",
          en: "How much support do they add, and are they only for Bench Press?",
        },
        lead: {
          ro: "Nu sunt doar pentru Bench Press. Stabilizează articulația cotului în orice exercițiu greu de împins și elimină pierderile de forță din punctul mort:",
          en: "They are built for far more than Bench Press—stabilizing your elbow on every heavy pressing exercise while adding measurable rebound:",
        },
        points: [
          {
            title: { ro: "Până la +20 kg Recul Kinetic", en: "Up to +20 kg Mechanical Assist" },
            desc: {
              ro: "Compresia elastică acumulează energie la coborâre și te împinge exploziv din punctul inferior.",
              en: "Stored elastic tension at peak flexion catapults the bar cleanly out of the chest sticking point.",
            },
          },
          {
            title: { ro: "Zero Tremurat sub Greutăți Mari", en: "Locked Groove · Zero Shake" },
            desc: {
              ro: "Elimină oscilația involuntară a cotului la sarcină maximă și menține traiectoria curată.",
              en: "Eliminates joint wobble under near-max loads so force transfers straight into the bar.",
            },
          },
          {
            title: { ro: "Protecție Tendoane & Articulații", en: "Tendon & Elbow Relief" },
            desc: {
              ro: "Preia forța de forfecare de pe tendonul tricepsului, prevenind inflamațiile cronice.",
              en: "Redistributes heavy shearing stress away from triceps tendons to help prevent elbow flare-ups.",
            },
          },
          {
            title: { ro: "Bench, Umeri, Dips & Triceps", en: "Bench, OHP, Dips & Triceps" },
            desc: {
              ro: "Compatibile cu împins piept (bară/gantere), Overhead Press, Weighted Dips și extensii grele.",
              en: "Ideal for flat/incline bench, dumbbell presses, shoulder press, weighted dips, and skull crushers.",
            },
          },
        ],
      },
      {
        id: "sizing-and-fit",
        category: "models",
        kicker: { ro: "MĂRIME UNIVERSALĂ", en: "ONE SIZE FITS ALL" },
        question: {
          ro: "Au mărime universală? Se potrivesc și pe brațe mai mari sau mai subțiri?",
          en: "Are they one-size-fits-all? Will they fit larger or leaner arms?",
        },
        lead: {
          ro: "Da. Lungimea completă de 100 cm și sistemul cu scai industrial se reglează milimetric pe orice circumferință a brațului, de la începători până la sportivi heavyweight:",
          en: "Yes. Every pair uses a full 100 cm wrap length with heavy-duty hook-and-loop closure, adapting seamlessly from leaner arms to 48 cm+ heavyweight lifters:",
        },
        points: [
          {
            title: { ro: "Reglaj pe Nivelul Tău de Tensiune", en: "Dial In Exact Stiffness" },
            desc: {
              ro: "Înfășoară mai strâns pentru setul de PR și lasă mai lejer pe seriile de încălzire.",
              en: "Pull tight right before a top PR set, or wrap lighter for volume work and warm-ups.",
            },
          },
          {
            title: { ro: "Nu Alunecă în Timpul Seriei", en: "Zero Slip Mid-Set" },
            desc: {
              ro: "Textura interioară aderă ferm direct pe piele sau peste mânecă, fără să se ruleze.",
              en: "High-friction inner weave locks onto bare skin or compression sleeves without rolling.",
            },
          },
        ],
      },
      {
        id: "quality-vs-generic",
        category: "benefits",
        kicker: { ro: "CALITATE & DURABILITATE", en: "QUALITY COMPARISON" },
        question: {
          ro: "De ce să aleg TrenZone® și nu benzi obișnuite mai ieftine?",
          en: "Why choose TrenZone® instead of cheaper generic elbow wraps?",
        },
        lead: {
          ro: "Benzile ieftine din bumbac subțire își pierd elasticitatea în câteva săptămâni. TrenZone® este proiectat special pentru încărcături grele reale:",
          en: "Standard cotton-elastic wraps stretch out and lose tension within weeks. TrenZone® is engineered for sustained heavy training:",
        },
        vsColumns: [
          {
            title: { ro: "ECHIPAMENT TRENZONE®", en: "TRENZONE® HEAVY-DUTY" },
            isPositive: true,
            items: [
              {
                ro: "Elastic industrial multi-strat de 1.2 kg (X10) care nu se lasă după 3 săptămâni.",
                en: "1.2 kg industrial multi-layer elastic weave (X10) that retains full tension session after session.",
              },
              {
                ro: "Cusături duble ranforsate și Velcro lat, testate sub încărcături reale de 200+ kg.",
                en: "Double-reinforced stitching and wide Velcro tested under real 200+ kg bench loads.",
              },
              {
                ro: "Aderență fermă anti-alunecare și stabilitate predictibilă la fiecare repetare.",
                en: "Anti-slip inner texture stays locked from rep one to lockout.",
              },
            ],
          },
          {
            title: { ro: "BENZI OBIȘNUITE DE SALĂ", en: "CHEAP GENERIC WRAPS" },
            isPositive: false,
            items: [
              {
                ro: "Bumbac subțire care devine moale și nu mai oferă rebound după câteva antrenamente.",
                en: "Thin cotton-blend elastic stretches out fast and stops supporting heavy sets.",
              },
              {
                ro: "Alunecă pe antebraț sau se desfac sub presiune mare la ieșirea din piept.",
                en: "Rolls down mid-rep or pops open under high tension at the bottom.",
              },
              {
                ro: "Lipsă de suport real în punctul critic de pe tendon și articulație.",
                en: "Minimal tendon load transfer—just basic warmth instead of structural stability.",
              },
            ],
          },
        ],
      },
      {
        id: "shipping-and-preorder",
        category: "shipping",
        kicker: { ro: "EXPEDIERE & PRECOMENZI", en: "SHIPPING & PRE-ORDERS" },
        question: {
          ro: "În cât timp ajunge comanda și cum funcționează precomanda?",
          en: "How fast is delivery, and how do pre-orders work?",
        },
        lead: {
          ro: "Expediem zilnic produsele din stoc cu tracking complet. Pentru edițiile aflate în precomandă, lotul tău este rezervat și trimis cu prioritate:",
          en: "In-stock orders ship immediately with full live tracking. Pre-orders lock your spot from the upcoming batch with first-out dispatch priority:",
        },
        points: [
          {
            title: { ro: "România: 1–2 Zile Lucrătoare", en: "Romania: 1–2 Business Days" },
            desc: {
              ro: "Livrare la ușă sau la Easybox / locker prin curier rapid cu AWB și notificare SMS.",
              en: "Door delivery or parcel locker dispatch via express courier with live SMS tracking.",
            },
          },
          {
            title: { ro: "UE, Marea Britanie & SUA", en: "EU, UK & USA Delivery" },
            desc: {
              ro: "Expediere internațională asigurată prin curieri expres, cu tracking primit automat pe email.",
              en: "Insured international priority shipping with tracking code emailed upon dispatch.",
            },
          },
          {
            title: { ro: "Precomandă = Loc Garantat", en: "Pre-Order = Priority Spot" },
            desc: {
              ro: "Primești confirmarea instant și coletul pleacă primul imediat ce lotul intră în depozit.",
              en: "Guaranteed allocation from the launch batch—dispatched first before general restock opens.",
            },
          },
          {
            title: { ro: "Notificări Automate la Fiecare Pas", en: "Live Status Updates" },
            desc: {
              ro: "Primești factura și link-ul de urmărire AWB direct pe email imediat ce coletul pleacă.",
              en: "Automatic confirmation, invoice, and AWB tracking updates delivered directly to your inbox.",
            },
          },
        ],
      },
      {
        id: "guarantee-and-returns",
        category: "shipping",
        kicker: { ro: "GARANȚIE 14 ZILE", en: "14-DAY GUARANTEE" },
        question: {
          ro: "Pot schimba între X5 și X10 sau returna comanda dacă nu mi se potrivește?",
          en: "Can I swap X5 ↔ X10 or return my order if needed?",
        },
        lead: {
          ro: "Da, cumperi fără niciun risc. Dacă vrei alt nivel de rigiditate sau te răzgândești, ai drept legal de retur și schimb rapid timp de 14 zile calendaristice (produs neutilizat, în ambalajul original).",
          en: "Yes—your order is backed by our 14-day hassle-free exchange and return guarantee. Unused items in original packaging can be swapped between X5 and X10 or refunded quickly.",
        },
        actionLink: {
          href: "/retur",
          label: {
            ro: "Accesează formularul rapid de retur / schimb",
            en: "Open quick return / exchange request form",
          },
        },
      },
    ],
    [x5PriceStr, x10PriceStr]
  );

  const filteredFaqs = useMemo(
    () =>
      activeCategory === "all"
        ? faqs
        : faqs.filter((f) => f.category === activeCategory),
    [activeCategory, faqs]
  );

  const handleToggle = useCallback((id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleCategoryChange = useCallback(
    (category: FaqCategory) => {
      setActiveCategory(category);
      const firstInCategory =
        category === "all"
          ? faqs[0]
          : faqs.find((item) => item.category === category);
      if (firstInCategory) {
        setOpenIds(new Set([firstInCategory.id]));
      }
    },
    [faqs]
  );

  return (
    <section
      className="py-14 sm:py-20 md:py-24 bg-[#090a0f] text-white relative"
      id="faq"
    >
      <div className="container mx-auto px-4 sm:px-6 max-w-4xl relative z-10">
        {/* Clean Editorial Header */}
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e32f8c]/10 border border-[#e32f8c]/25 text-[#e32f8c] font-black tracking-[0.16em] uppercase text-[10px] sm:text-xs mb-3">
            <span>{isRo ? "GHID DE ALEGERE · FAQ" : "BUYER'S GUIDE · FAQ"}</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-white font-[family-name:var(--font-oswald)] leading-[1.08]">
            {isRo ? "ÎNTREBĂRI FRECVENTE." : "FREQUENTLY ASKED."}
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e32f8c] via-[#d946ef] to-white">
              {isRo ? "FĂRĂ DUBII SUB BARĂ." : "BUILT FOR ZERO DOUBT."}
            </span>
          </h2>

          <p className="mt-3 text-xs sm:text-sm md:text-base text-zinc-400 font-normal max-w-xl leading-relaxed">
            {isRo
              ? "Compară X5 vs X10, află cum îți protejează coatele la greutăți mari și vezi detaliile de livrare."
              : "Compare X5 vs X10 stiffness, joint protection under heavy pressing, sizing fit, and express shipping."}
          </p>

          {/* Single-row horizontally scrollable filter pills (zero awkward wrapping) */}
          <div className="w-full flex justify-center mt-6">
            <div className="inline-flex max-w-full overflow-x-auto scrollbar-hide items-center gap-1 p-1 rounded-xl bg-[#101119] border border-white/10">
              {categories.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategoryChange(cat.id)}
                    style={{ WebkitTapHighlightColor: "transparent" }}
                    className={`px-3 sm:px-4 py-2 rounded-lg text-[11px] sm:text-xs font-bold uppercase tracking-wider whitespace-nowrap shrink-0 cursor-pointer touch-manipulation transition-colors duration-150 ${
                      isActive
                        ? "bg-[#e32f8c] text-white"
                        : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Unified Shopify-Grade Hairline Accordion Stack */}
        <div className="rounded-2xl border border-white/10 bg-[#101119] divide-y divide-white/[0.08] overflow-hidden shadow-2xl shadow-black/40">
          {filteredFaqs.map((faq) => (
            <FaqAccordionItem
              key={faq.id}
              faq={faq}
              isRo={isRo}
              isOpen={openIds.has(faq.id)}
              onToggle={handleToggle}
            />
          ))}
        </div>

        {/* High-Converting Closer Bar */}
        <div className="mt-8 sm:mt-10 rounded-2xl bg-[#101119] border border-white/10 p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm sm:text-base font-black uppercase tracking-tight text-white">
              {isRo
                ? "Gata să îți duci împinsul la următorul nivel?"
                : "Ready to lock in your next PR?"}
            </h4>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
              <span className="inline-flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-[#e32f8c]" />
                {isRo ? "Livrare 1–2 zile în RO" : "Express tracked shipping"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#e32f8c]" />
                {isRo ? "Retur & schimb 14 zile" : "14-day exchange & return"}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            <Link
              href="/shop"
              className="inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl bg-[#e32f8c] hover:bg-white text-white hover:text-black font-black uppercase text-xs tracking-wider transition-colors duration-150"
            >
              <span>{isRo ? "VEZI ECHIPAMENTUL" : "SHOP ALL GEAR"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] border border-white/15 text-white font-bold uppercase text-xs tracking-wider transition-colors duration-150"
            >
              <span>{isRo ? "CONTACTEAZĂ-NE" : "ASK SUPPORT"}</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
