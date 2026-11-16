"use client";

import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useRegionStore } from "@/store/useRegionStore";
import { formatPrice } from "@/utils/currency";
import { getProductPrice } from "@/utils/pricing";
import { Link } from "@/i18n/routing";
import { ArrowRight, Plus } from "lucide-react";

type ProgramFaqCategory = "all" | "content" | "results" | "delivery";

interface LocalizedText {
  ro: string;
  en: string;
}

interface ProgramFaqEntry {
  id: string;
  category: Exclude<ProgramFaqCategory, "all">;
  question: LocalizedText;
  paragraphs: LocalizedText[];
  bundleNote?: LocalizedText;
}

interface ProgramsFaqSectionProps {
  foodPriceRon?: number;
  trainingPriceRon?: number;
  benchPriceRon?: number;
  bundlePriceRon?: number;
}

interface AccordionItemProps {
  faq: ProgramFaqEntry;
  isRo: boolean;
  isOpen: boolean;
  onToggle: (id: string) => void;
}

const ProgramFaqAccordionItem = memo(function ProgramFaqAccordionItem({
  faq,
  isRo,
  isOpen,
  onToggle,
}: AccordionItemProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<Animation | null>(null);
  const isFirstRender = useRef(true);

  const pick = (text: LocalizedText) => (isRo ? text.ro : text.en);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      panel.hidden = !isOpen;
      return;
    }

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
        isOpen ? "bg-[#141620]" : "bg-[#0e1017] hover:bg-[#12141d]"
      }`}
    >
      <button
        type="button"
        onClick={() => onToggle(faq.id)}
        aria-expanded={isOpen}
        aria-controls={`prog-faq-panel-${faq.id}`}
        style={{ WebkitTapHighlightColor: "transparent" }}
        className="w-full px-5 py-4.5 sm:px-7 sm:py-5 flex items-center justify-between gap-4 text-left cursor-pointer touch-manipulation select-none group"
      >
        <h3 className="text-[15px] sm:text-base font-semibold tracking-tight text-white leading-snug group-hover:text-zinc-200">
          {pick(faq.question)}
        </h3>

        <span
          aria-hidden="true"
          className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors duration-150 ${
            isOpen
              ? "bg-[#e32f8c] text-white"
              : "bg-white/[0.06] text-zinc-400 group-hover:text-white group-hover:bg-white/10"
          }`}
        >
          <Plus
            className={`w-4 h-4 transition-transform duration-200 ease-out ${
              isOpen ? "rotate-45" : "rotate-0"
            }`}
            strokeWidth={2.25}
          />
        </span>
      </button>

      <div ref={panelRef} id={`prog-faq-panel-${faq.id}`} hidden={!isOpen}>
        <div className="px-5 pb-5 sm:px-7 sm:pb-6">
          <div className="pt-3.5 border-t border-white/[0.07] space-y-3">
            {faq.paragraphs.map((paragraph, pIdx) => (
              <p
                key={pIdx}
                className="text-sm text-zinc-300 leading-relaxed font-normal"
              >
                {pick(paragraph)}
              </p>
            ))}

            {faq.bundleNote && (
              <p className="text-xs text-zinc-400 pt-0.5">
                <a
                  href="#programe-digitale"
                  className="hover:text-white transition-colors underline underline-offset-4 decoration-white/25"
                >
                  {pick(faq.bundleNote)}
                </a>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export function ProgramsFaqSection({
  bundlePriceRon = 249,
}: ProgramsFaqSectionProps) {
  const locale = useLocale();
  const isRo = locale === "ro";
  const { currency } = useRegionStore();

  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set(["which-program"]));

  const bundlePriceStr = formatPrice(getProductPrice(bundlePriceRon, currency), currency);

  const faqs: ProgramFaqEntry[] = useMemo(
    () => [
      {
        id: "which-program",
        category: "content",
        question: {
          ro: "Ce conține concret fiecare program și pe care să îl aleg?",
          en: "What is inside each program and which one should I choose?",
        },
        paragraphs: [
          {
            ro: "Food Plan este ghidul complet în 10 capitole pentru alimentație (calcul caloric, meniuri pentru masă musculară sau definire și suplimente), Training Program îți oferă structura completă de antrenament pe grupe musculare (exerciții, serii și repetări), iar Bench Program este sistemul specializat pentru tehnică și progresie 4×4–6 la împins.",
            en: "Food Plan is the 10-chapter nutrition guide (calorie targets, muscle-gain & fat-loss meal plans, and supplements), Training Program gives you the complete hypertrophy split across muscle groups, and Bench Program is the specialized 4×4–6 system for bench press strength and PRs.",
          },
          {
            ro: "Alege Food Plan dacă vrei să îți pui la punct nutriția, Training Program pentru un plan complet la sală sau Bench Program pentru explozie la piept.",
            en: "Choose Food Plan to dial in nutrition, Training Program for a complete gym routine, or Bench Program for chest strength and explosive PRs.",
          },
        ],
        bundleNote: {
          ro: `Dacă le vrei pe toate trei, Pachetul Complet (3 în 1) costă ${bundlePriceStr} (-27% reducere automată).`,
          en: `If you want all three, the Complete Bundle (3-in-1) is ${bundlePriceStr} (-27% automatic discount).`,
        },
      },
      {
        id: "why-bench-program",
        category: "results",
        question: {
          ro: "Cu ce mă ajută Bench Program dacă mă antrenez deja la sală?",
          en: "How will the Bench Program help if I already train at the gym?",
        },
        paragraphs: [
          {
            ro: "Majoritatea celor care stagnează la piept pierd forță din cauza poziției pe bancă (umeri instabili, lipsă de leg drive) și pentru că merg la eșec haotic la fiecare antrenament.",
            en: "Most lifters plateau on bench because they leak power in their setup (unstable shoulders, no leg drive) and train to failure randomly every session.",
          },
          {
            ro: "În program ai reguli clare: știi exact când crești greutatea pe bară (când atingi 4 serii × 6 repetări curate), cum îți dozezi efortul (1–2 repetări în rezervă) și ce accesorii îți întăresc tricepșii, umerii și spatele pentru stabilitate maximă.",
            en: "This program gives you a clear rulebook: you know exactly when to add weight to the bar (once you hit 4 sets of 6 clean reps), how to manage fatigue (1–2 reps in reserve), and which accessories build lockout strength.",
          },
        ],
      },
      {
        id: "food-plan-budget",
        category: "content",
        question: {
          ro: "Food Plan-ul conține alimente scumpe sau greu de găsit?",
          en: "Does the Food Plan require expensive or complicated ingredients?",
        },
        paragraphs: [
          {
            ro: "Nu. Planul este construit pe alimente simple și accesibile pe care le găsești în orice magazin: ouă, piept de pui, vită, orez, cartofi, ovăz, brânză cottage, telemea, iaurt grecesc, fructe și legume.",
            en: "No. Every meal is built around simple, affordable supermarket staples: eggs, chicken breast, beef, rice, potatoes, oats, cottage cheese, Greek yogurt, fruit, and vegetables.",
          },
          {
            ro: "În plus, ai un capitol dedicat pentru optimizarea bugetului și organizarea cumpărăturilor, astfel încât să mănânci corect fără să pierzi ore în bucătărie sau bani inutili.",
            en: "It also includes a dedicated section on saving money and meal-prepping efficiently so you can hit your macros without wasting time or budget.",
          },
        ],
      },
      {
        id: "experience-level",
        category: "results",
        question: {
          ro: "Sunt potrivite și pentru începători sau doar pentru avansați?",
          en: "Are these guides suitable for beginners or only advanced lifters?",
        },
        paragraphs: [
          {
            ro: "Ambele ghiduri sunt scrise direct și practic, fără teorie complicată. Dacă ești la început, îți scutesc luni întregi de încercări și greșeli în sală și în alimentație.",
            en: "Both guides are written in a direct, practical style with zero fluff. If you are a beginner, they save you months of trial and error with your diet and bench form.",
          },
          {
            ro: "Dacă ai deja experiență, îți oferă structura de progresie și ajustările calorice necesare ca să treci peste plafonare.",
            en: "If you are intermediate or advanced, they give you the exact progression structure and nutrition adjustments needed to break through plateaus.",
          },
        ],
      },
      {
        id: "instant-delivery",
        category: "delivery",
        question: {
          ro: "Cum primesc programele după plată și în ce limbă sunt?",
          en: "How do I receive the programs after payment, and in what language?",
        },
        paragraphs: [
          {
            ro: "Livrarea este instantă. Imediat după confirmarea plății cu cardul, Apple Pay sau Google Pay, primești programele pe email și le poți descărca pe telefon, tabletă sau laptop.",
            en: "Delivery is instant. Right after completing your card, Apple Pay, or Google Pay payment, the guides are sent to your email and can be opened on any phone, tablet, or laptop.",
          },
          {
            ro: "Înainte să adaugi în coș, poți selecta direct steagul pentru limba Română sau Engleză. Accesul este permanent, fără abonament lunar și cu 0 cost de transport.",
            en: "Before adding to cart, simply select the flag for English or Romanian. You get lifetime access with zero recurring fees and zero shipping costs.",
          },
        ],
      },
    ],
    [bundlePriceStr]
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

  return (
    <section
      className="py-12 sm:py-16 md:py-20 bg-transparent text-white relative"
      id="faq-programe"
    >
      <div className="container mx-auto px-4 sm:px-6 max-w-3xl relative z-10">
        {/* Clean Minimalist Header — Matching Homepage FAQ 100% */}
        <div className="flex flex-col items-center text-center mb-8 sm:mb-10">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#e32f8c] mb-2">
            {isRo ? "Întrebări frecvente" : "FAQ"}
          </span>

          <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white font-[family-name:var(--font-oswald)] leading-tight">
            {isRo
              ? "Tot ce trebuie să știi despre programe"
              : "Everything you need to know about the programs"}
          </h2>

          <p className="mt-2.5 text-sm text-zinc-400 font-normal max-w-lg leading-relaxed">
            {isRo
              ? "Răspunsuri clare despre ce conțin ghidurile, cui i se potrivesc și cum le primești instant."
              : "Clear answers on what's inside each guide, who they are for, and how instant delivery works."}
          </p>
        </div>

        {/* Hairline Accordion */}
        <div className="rounded-2xl border border-white/10 bg-[#0e1017] divide-y divide-white/[0.08] overflow-hidden shadow-2xl">
          {faqs.map((faq) => (
            <ProgramFaqAccordionItem
              key={faq.id}
              faq={faq}
              isRo={isRo}
              isOpen={openIds.has(faq.id)}
              onToggle={handleToggle}
            />
          ))}
        </div>

        {/* Closer CTA Row */}
        <div className="mt-8 rounded-2xl bg-[#0e1017] border border-white/10 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm sm:text-base font-bold text-white">
              {isRo ? "Pregătit să începi?" : "Ready to start?"}
            </h4>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
              {isRo
                ? "Alege programul potrivit sau ia Pachetul Complet (3 în 1) cu reducere automată."
                : "Pick your guide or grab the Complete Bundle (3-in-1) with automatic savings."}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <a
              href="#programe-digitale"
              className="inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-[#e32f8c] hover:bg-white text-white hover:text-black font-bold text-xs uppercase tracking-wider transition-colors duration-150"
            >
              <span>{isRo ? "Alege Programul" : "Choose Program"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
            <Link
              href="/shop"
              className="inline-flex items-center justify-center py-2.5 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] border border-white/15 text-white font-semibold text-xs uppercase tracking-wider transition-colors duration-150"
            >
              {isRo ? "Vezi Echipamentul" : "Shop Gear"}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
