"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { 
  Plus, 
  Minus, 
  CheckCircle2, 
  ArrowRight, 
  HelpCircle
} from "lucide-react";
import { Link } from "@/i18n/routing";

interface FaqItem {
  id: string;
  category: "all" | "products" | "usage" | "shipping";
  categoryLabel: { ro: string; en: string };
  question: { ro: string; en: string };
  summary: { ro: string; en: string };
  points?: Array<{
    title: { ro: string; en: string };
    desc: { ro: string; en: string };
    badge?: string;
  }>;
  highlightCards?: Array<{
    title: { ro: string; en: string };
    subtitle?: { ro: string; en: string };
    desc: { ro: string; en: string };
    tag?: string;
    isFeatured?: boolean;
  }>;
  badge?: { ro: string; en: string };
}

export function FaqSection() {
  const locale = useLocale();
  const isRo = locale === 'ro';

  const [activeCategory, setActiveCategory] = useState<"all" | "products" | "usage" | "shipping">("all");
  const [activeIndex, setActiveIndex] = useState<number | null>(0);

  const categories = [
    { id: "all", label: isRo ? "Toate Întrebările" : "All Questions" },
    { id: "products", label: isRo ? "Modele & Comparație" : "Models & Compare" },
    { id: "usage", label: isRo ? "Exerciții & Beneficii" : "Exercises & Benefits" },
    { id: "shipping", label: isRo ? "Livrare & Precomandă" : "Shipping & Orders" },
  ] as const;

  const faqs: FaqItem[] = [
    {
      id: "preorder-delivery",
      category: "shipping",
      categoryLabel: { ro: "LIVRARE & PRODUCȚIE", en: "SHIPPING & BATCH" },
      badge: { ro: "STOC GARANTAT", en: "GUARANTEED SPOT" },
      question: {
        ro: "Cum funcționează precomanda și când ajunge produsul?",
        en: "How does pre-ordering work and when will my wraps arrive?"
      },
      summary: {
        ro: "Precomanda îți rezervă perechea direct din primul lot oficial de producție, asigurându-te că o primești imediat ce sosește în depozit, cu prioritate absolută la expediere.",
        en: "Pre-ordering reserves your pair directly from the official upcoming production batch, ensuring you receive it with top shipping priority as soon as stock arrives."
      },
      points: [
        {
          title: { ro: "1. Rezervare Automată", en: "1. Automatic Spot" },
          desc: { ro: "Loc garantat din stocul limitat de lansare fără riscul de a rămâne pe dinafară.", en: "Guaranteed allocation from the limited launch drop." },
          badge: "PRIORITATE"
        },
        {
          title: { ro: "2. Notificare pe Email", en: "2. Email Tracking" },
          desc: { ro: "Primești confirmare instantă și notificări de status la fiecare etapă a comenzii.", en: "Instant confirmation and automated progress updates." },
          badge: "TRANSPARENȚĂ"
        },
        {
          title: { ro: "3. Livrare Rapidă la Ușă", en: "3. Express Door Delivery" },
          desc: { ro: "Expediere prin curier rapid (1-2 zile lucrătoare în RO) cu AWB și tracking live.", en: "Dispatched via express tracked couriers straight to your door." },
          badge: "RAPID"
        }
      ]
    },
    {
      id: "model-comparison",
      category: "products",
      categoryLabel: { ro: "GHID DE ALEGERE", en: "CHOOSING GUIDE" },
      badge: { ro: "X5 vs X10", en: "X5 vs X10" },
      question: {
        ro: "Ce să aleg: TrenZone X5 sau X10?",
        en: "Which model should I choose: TrenZone X5 or X10?"
      },
      summary: {
        ro: "Alegerea depinde de stilul tău de antrenament: dacă vrei confort, mobilitate și protecție articulară pe serii de volum (X5) sau rigiditate extremă de competiție pentru greutăți mari (X10).",
        en: "Choose based on your training goal: natural joint mobility & volume sets (X5) or extreme competition stiffness for max weight presses (X10)."
      },
      highlightCards: [
        {
          title: { ro: "MODELUL X5 — 329.99 RON", en: "X5 EDITION — 329.99 RON" },
          subtitle: { ro: "Nivel Suport: 3.5 / 5 (Ferm & Flexibil)", en: "Support Level: 3.5 / 5 (Firm & Flexible)" },
          desc: { 
            ro: "Ideal pentru serii de volum, hipertrofie, culturism, împins cu gantere și mișcări unde ai nevoie de mobilitate naturală și protecție a tendoanelor.",
            en: "Engineered for high-volume hypertrophy, dumbbell pressing, and movements requiring natural elbow mobility with high tendon protection."
          },
          tag: "MOBILITATE & VOLUM"
        },
        {
          title: { ro: "MODELUL X10 — 529.99 RON", en: "X10 EDITION — 529.99 RON" },
          subtitle: { ro: "Nivel Suport: 5 / 5 (Rigiditate Extremă)", en: "Support Level: 5 / 5 (Extreme Stiffness)" },
          desc: { 
            ro: "Conceput pentru greutăți mari (100–200+ kg), PR-uri la Bench Press și sportivi experimentați. Oferă blocare totală pe cot și până la +20 kg asistență mecanică.",
            en: "Built for heavy PR sets (100–200+ kg), powerlifting, and experienced lifters. Provides total joint lockout and up to +20 kg mechanical rebound."
          },
          tag: "PR CHASER · +20 KG",
          isFeatured: true
        }
      ]
    },
    {
      id: "experience-level",
      category: "products",
      categoryLabel: { ro: "NIVEL DE EXPERIENȚĂ", en: "EXPERIENCE LEVEL" },
      badge: { ro: "PENTRU TOȚI ATLEȚII", en: "ALL LIFTERS" },
      question: {
        ro: "Sunt potrivite și pentru începători sau doar pentru avansați?",
        en: "Are they suitable for beginners or only advanced lifters?"
      },
      summary: {
        ro: "Echipamentul TrenZone® este proiectat pentru oricine se antrenează dedicat și vrea să-și protejeze articulațiile, indiferent de greutatea de pe bară.",
        en: "TrenZone® wraps are designed for anyone training with dedication who wants ironclad joint protection, regardless of their current strength level."
      },
      highlightCards: [
        {
          title: { ro: "Începători & Intermediari", en: "Beginners & Intermediates" },
          desc: { 
            ro: "Modelul X5 este alegerea perfectă: oferă suport articular esențial și previne durerile de coate sau inflamația tendoanelor înainte ca acestea să apară.",
            en: "The X5 is ideal: it delivers essential joint compression and keeps tendon inflammation away while you build foundational strength."
          },
          tag: "PREVENȚIE & CONFORT"
        },
        {
          title: { ro: "Avansați & Powerlifteri", en: "Advanced & Powerlifters" },
          desc: { 
            ro: "Modelul X10 este recomandat sportivilor cu tehnică deja consolidată care încarcă greutăți substanțiale și vor stabilitate mecanică de neclintit.",
            en: "The X10 is recommended for experienced lifters with dialed-in technique who handle heavy iron and demand absolute structural stability."
          },
          tag: "PERFORMANȚĂ MAXIMĂ",
          isFeatured: true
        }
      ]
    },
    {
      id: "quality-fabric",
      category: "products",
      categoryLabel: { ro: "MATERIAL & INGINERIE", en: "FABRIC & BUILD" },
      badge: { ro: "CALITATE MILITARĂ", en: "MILITARY SPEC" },
      question: {
        ro: "Ce face ca benzile TrenZone să fie superioare față de ce e pe piață?",
        en: "What makes TrenZone wraps superior to generic market wraps?"
      },
      summary: {
        ro: "Spre deosebire de benzile ieftine din bumbac sintetic care se lărgesc și devin moi după doar 3 săptămâni de utilizare, benzile TrenZone® sunt proiectate după standarde industriale grele.",
        en: "Unlike cheap cotton-blend wraps that stretch out and lose tension within 3 weeks, TrenZone® wraps are engineered to heavy industrial durability standards."
      },
      points: [
        {
          title: { ro: "Densitate Multi-Strat de 1.2 kg", en: "1.2 kg Multi-Layer Weave" },
          desc: { ro: "Elastic tehnic ranforsat cu rezistență mecanică uriașă la tracțiune și întindere repetată.", en: "Reinforced elastic weave with extreme tensile resistance under repetitive heavy loading." },
          badge: "STRUCTURĂ"
        },
        {
          title: { ro: "Textură Grip Anti-Alunecare", en: "Anti-Slip Friction Grip" },
          desc: { ro: "Se mulează și aderă ferm pe braț sau îmbrăcăminte fără să alunece milimetric în timpul repetării.", en: "Locks securely onto arms or apparel without slipping even a millimeter during reps." },
          badge: "STABILITATE"
        },
        {
          title: { ro: "Cusături Duble de Competiție", en: "Competition Double Stitching" },
          desc: { ro: "Finisaje întărite la capete pentru a rezista anilor întregi de antrenamente brutale.", en: "Industrial reinforced stitching built to endure years of brutal workouts." },
          badge: "DURABILITATE"
        },
        {
          title: { ro: "Testate la Sarcini Reale de 200+ kg", en: "Tested Under 200+ kg Real Loads" },
          desc: { ro: "Validate de atleți de forță și culturiști de top pe împinsuri grele, fără deformare.", en: "Validated by heavy strength athletes on max effort pressing with zero deformation." },
          badge: "VALIDAT"
        }
      ]
    },
    {
      id: "exercises-and-benefits",
      category: "usage",
      categoryLabel: { ro: "EXERCIȚII & BIOMECANICĂ", en: "EXERCISES & BIOMECHANICS" },
      badge: { ro: "RECOMMANDAT PENTRU FORȚĂ", en: "KEY BENEFITS" },
      question: {
        ro: "Sunt benzile doar pentru Bench Press sau și pentru alte exerciții? Care sunt beneficiile concrete?",
        en: "Are elbow wraps only for Bench Press or other exercises too? What are the concrete benefits?"
      },
      summary: {
        ro: "Nu sunt doar pentru Bench Press! Benzile TrenZone® sunt concepute pentru orice mișcare grea de împins și stabilitate a brațelor.",
        en: "They are NOT just for Bench Press! TrenZone® wraps are engineered for every heavy pressing and arm movement."
      },
      points: [
        {
          title: { ro: "1. Mișcări Cheie Compatibile", en: "1. Key Exercises" },
          desc: { 
            ro: "Bench Press (bară/gantere, orizontal/înclinat), Împins Umeri (Overhead Press), Flotări la Paralele cu greutate (Weighted Dips) și extensii grele de triceps (Skull Crushers).",
            en: "Bench Press (barbell/dumbbells, flat/incline), Overhead Press, Weighted Dips, and heavy triceps skull crushers."
          },
          badge: "POLIVALENȚĂ"
        },
        {
          title: { ro: "2. Stabilitate Mecanică Totală", en: "2. Total Mechanical Lock" },
          desc: { 
            ro: "Cotul este ghidat pe traiectorie optimă; se elimină complet tremuratul involuntar al articulației la adâncime maximă sub bară.",
            en: "Elbow is locked on an ideal groove; involuntary joint shaking at peak compression is completely eliminated."
          },
          badge: "ZERO TREMURAT"
        },
        {
          title: { ro: "3. Protecția Tendoanelor & Tensiunii", en: "3. Tendon & Shearing Relief" },
          desc: { 
            ro: "Materialul absoarbe și redistribuie forțele de forfecare de pe tendonul tricepsului, prevenind inflamațiile cronice și durerile articulare.",
            en: "Absorbs and redistributes brutal shearing forces away from the triceps tendon, preventing tendinitis."
          },
          badge: "ANTIDURERE"
        },
        {
          title: { ro: "4. Recul Kinetic pe Ieșirea din Piept", en: "4. Kinetic Rebound Assist" },
          desc: { 
            ro: "Tensiunea acumulată la coborâre te catapultează exploziv prin punctul mort al împinsului, ajutându-te să deblochezi noi recorduri personale.",
            en: "Stored elastic energy at the bottom catapults you through the sticking point, helping unlock new personal records."
          },
          badge: "ASISTENȚĂ KINETICĂ"
        }
      ]
    },
    {
      id: "shipping-guarantee",
      category: "shipping",
      categoryLabel: { ro: "EXPEDIERE & POLITICĂ RETUR", en: "SHIPPING & RETURNS" },
      badge: { ro: "LIVRARE RAPIDĂ", en: "FAST DISPATCH" },
      question: {
        ro: "Livrați și în afara României? Ce garanții am?",
        en: "Do you ship internationally? What guarantees do I have?"
      },
      summary: {
        ro: "Livrăm rapid atât pe teritoriul României, cât și internațional în toată Europa, UK și SUA, cu număr de urmărire permanent.",
        en: "We ship quickly across Romania and internationally throughout Europe, the UK, and the USA with real-time package tracking."
      },
      points: [
        {
          title: { ro: "România: 1–2 Zile Lucrătoare", en: "Romania: 1–2 Business Days" },
          desc: { ro: "Livrare la ușă sau la locker prin curieri expres parteneri (Fan Courier / Sameday / Packeta).", en: "Door delivery or parcel locker via express couriers with live SMS & tracking." },
          badge: "1-2 ZILE"
        },
        {
          title: { ro: "Internațional (UE, UK, SUA)", en: "International (EU, UK, USA)" },
          desc: { ro: "Expediere internațională asigurată prin rețele aeriene de curierat rapid, cu AWB transparent.", en: "Fully insured international priority shipping with tracking code provided on dispatch." },
          badge: "GLOBAL"
        },
        {
          title: { ro: "14 Zile Drept de Retur Garantat", en: "14-Day Return Guarantee" },
          desc: { ro: "Dacă produsul nu ți se potrivește sau vrei altă mărime/model, beneficiezi de schimb simplu și rapid conform legii.", en: "Hassle-free 14-day exchange or return if the product is unused and in original packaging." },
          badge: "100% SIGUR"
        }
      ]
    }
  ];

  const filteredFaqs = activeCategory === "all" 
    ? faqs 
    : faqs.filter(f => f.category === activeCategory);

  return (
    <section className="py-16 md:py-24 bg-[#090a0f] text-white relative overflow-hidden" id="faq">
      <div className="container mx-auto px-4 sm:px-6 max-w-5xl relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-10 md:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[#e32f8c] font-black tracking-widest uppercase text-[10px] sm:text-xs mb-3">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{isRo ? "FAQ · RĂSPUNSURI DIRECTE" : "FAQ · DIRECT ANSWERS"}</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-white font-[family-name:var(--font-oswald)] leading-tight">
            ÎNTREBĂRI FRECVENTE. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e32f8c] via-[#a855f7] to-white">
              {isRo ? "CLARITATE FĂRĂ OCOLIȘURI." : "NO EXCUSES, JUST FACTS."}
            </span>
          </h2>

          <p className="mt-3 text-xs sm:text-sm md:text-base text-zinc-400 font-medium max-w-lg leading-relaxed">
            {isRo
              ? "Tot ce trebuie să știi despre cotierele TrenZone®, diferența între X5 și X10, biomecanică și livrare."
              : "Everything you need to know about TrenZone® wraps, choosing between X5 and X10, and delivery."}
          </p>

          {/* Category Filter Pills (Zero backdrop-blur for 120fps speed) */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-6 p-1.5 rounded-xl bg-[#12131b] border border-white/10">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveCategory(cat.id);
                  setActiveIndex(null);
                }}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold uppercase tracking-wider transition-colors duration-150 cursor-pointer ${
                  activeCategory === cat.id
                    ? "bg-[#e32f8c] text-white"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* 120FPS Hardware-Accelerated Accordion Cards */}
        <div className="flex flex-col gap-3">
          {filteredFaqs.map((faq, index) => {
            const isOpen = activeIndex === index;
            const itemNumber = (index + 1).toString().padStart(2, '0');

            return (
              <div
                key={faq.id}
                className={`rounded-xl border transition-colors duration-200 overflow-hidden ${
                  isOpen
                    ? "bg-[#161722] border-[#e32f8c]/60"
                    : "bg-[#111219] border-white/10 hover:border-white/20"
                }`}
                style={{ willChange: "transform" }}
              >
                {/* Trigger Button */}
                <button
                  type="button"
                  onClick={() => setActiveIndex(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  className="w-full p-4 sm:p-5 flex items-center justify-between text-left focus:outline-none gap-3 group cursor-pointer"
                >
                  <div className="flex items-center gap-3 sm:gap-3.5 flex-1 min-w-0">
                    {/* Index Number Badge */}
                    <span className={`text-[11px] font-mono font-black px-2 py-0.5 rounded border transition-colors duration-150 shrink-0 ${
                      isOpen 
                        ? "bg-[#e32f8c]/20 text-[#e32f8c] border-[#e32f8c]/40" 
                        : "bg-white/5 text-zinc-500 border-white/10 group-hover:text-zinc-300"
                    }`}>
                      {itemNumber}
                    </span>

                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-zinc-500">
                        {faq.categoryLabel[locale as 'ro' | 'en'] || faq.categoryLabel.ro}
                      </span>
                      <h3 className={`text-xs sm:text-sm md:text-base font-black uppercase tracking-tight transition-colors duration-150 leading-snug truncate sm:whitespace-normal ${
                        isOpen ? "text-[#e32f8c]" : "text-white group-hover:text-zinc-200"
                      }`}>
                        {faq.question[locale as 'ro' | 'en'] || faq.question.ro}
                      </h3>
                    </div>
                  </div>

                  {/* Toggle Indicator Button */}
                  <div className={`shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border transition-colors duration-150 ${
                    isOpen 
                      ? "bg-[#e32f8c] text-white border-[#e32f8c]" 
                      : "bg-white/5 text-zinc-400 border-white/10 group-hover:text-white"
                  }`}>
                    {isOpen ? (
                      <Minus className="w-3.5 h-3.5" strokeWidth={3} />
                    ) : (
                      <Plus className="w-3.5 h-3.5" strokeWidth={3} />
                    )}
                  </div>
                </button>

                {/* 120FPS Pure CSS Grid Animation Container (No JS reflow loops!) */}
                <div 
                  className={`grid transition-[grid-template-rows] duration-250 ease-out ${
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className={`px-4 pb-4 sm:px-5 sm:pb-5 pt-1 text-zinc-300 border-t border-white/5 transition-opacity duration-200 ${
                      isOpen ? "opacity-100" : "opacity-0"
                    }`}>
                      
                      {/* Summary Lead Paragraph */}
                      <p className="text-xs sm:text-sm font-medium leading-relaxed text-zinc-300 mb-3 sm:mb-4">
                        {faq.summary[locale as 'ro' | 'en'] || faq.summary.ro}
                      </p>

                      {/* Structured Dual Cards (for X5 vs X10 or Experience Level) */}
                      {faq.highlightCards && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 mb-2">
                          {faq.highlightCards.map((card, cIdx) => (
                            <div
                              key={cIdx}
                              className={`p-3.5 rounded-lg border flex flex-col justify-between ${
                                card.isFeatured
                                  ? "bg-[#e32f8c]/10 border-[#e32f8c]/40"
                                  : "bg-[#0d0e14] border-white/10"
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white/10 text-white">
                                    {card.tag}
                                  </span>
                                </div>
                                <h4 className="text-xs sm:text-sm font-black uppercase text-white tracking-wide mb-0.5">
                                  {card.title[locale as 'ro' | 'en'] || card.title.ro}
                                </h4>
                                {card.subtitle && (
                                  <p className="text-[10px] sm:text-[11px] font-bold text-[#e32f8c] mb-1.5">
                                    {card.subtitle[locale as 'ro' | 'en'] || card.subtitle.ro}
                                  </p>
                                )}
                                <p className="text-[11px] sm:text-xs text-zinc-300 leading-relaxed font-normal">
                                  {card.desc[locale as 'ro' | 'en'] || card.desc.ro}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Structured Feature/Step Grid (for Exercises & Fabric & Preorder) */}
                      {faq.points && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                          {faq.points.map((pt, pIdx) => (
                            <div 
                              key={pIdx}
                              className="p-3 rounded-lg bg-[#0d0e14] border border-white/5 flex flex-col gap-1"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] sm:text-xs font-black uppercase text-white tracking-tight flex items-center gap-1.5 min-w-0">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-[#e32f8c] shrink-0" />
                                  <span className="truncate">{pt.title[locale as 'ro' | 'en'] || pt.title.ro}</span>
                                </span>
                                {pt.badge && (
                                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 shrink-0">
                                    {pt.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-zinc-400 font-medium leading-relaxed pl-5">
                                {pt.desc[locale as 'ro' | 'en'] || pt.desc.ro}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Help / Contact Box (Solid background for maximum speed) */}
        <div className="mt-10 sm:mt-14 max-w-3xl mx-auto rounded-xl bg-[#12131b] border border-white/10 p-5 sm:p-6 text-center flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-left">
            <h4 className="text-sm sm:text-base font-black uppercase tracking-tight text-white mb-0.5">
              {isRo ? "Ai o întrebare specifică?" : "Have a specific question?"}
            </h4>
            <p className="text-xs text-zinc-400 font-medium">
              {isRo 
                ? "Scrie-ne pe WhatsApp sau Email. Îți răspundem prompt." 
                : "Reach out via WhatsApp or Email anytime."}
            </p>
          </div>

          <Link
            href="/contact"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-lg bg-white text-black hover:bg-[#e32f8c] hover:text-white font-black uppercase text-xs tracking-wider transition-colors duration-150 shrink-0"
          >
            <span>{isRo ? "CONTACTEAZĂ-NE" : "CONTACT SUPPORT"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      </div>
    </section>
  );
}
