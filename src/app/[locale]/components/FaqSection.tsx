"use client";

import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useRegionStore } from "@/store/useRegionStore";
import { formatPrice } from "@/utils/currency";
import { getProductPrice } from "@/utils/pricing";
import { Link } from "@/i18n/routing";
import { ArrowRight, Plus } from "lucide-react";

type FaqCategory = "all" | "models" | "performance" | "shipping";

interface LocalizedText {
  ro: string;
  en: string;
}

interface ModelLinkCard {
  slug: string;
  name: string;
  price: string;
  note: LocalizedText;
  cta: LocalizedText;
  featured?: boolean;
}

interface FaqEntry {
  id: string;
  category: Exclude<FaqCategory, "all">;
  question: LocalizedText;
  paragraphs: LocalizedText[];
  modelCards?: ModelLinkCard[];
  duoNote?: LocalizedText;
  inlineLink?: {
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
        aria-controls={`faq-panel-${faq.id}`}
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

      <div ref={panelRef} id={`faq-panel-${faq.id}`} hidden={!isOpen}>
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

            {faq.modelCards && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {faq.modelCards.map((card) => (
                  <Link
                    key={card.slug}
                    href={`/product/${card.slug}`}
                    className={`group rounded-xl p-4 border transition-colors duration-150 flex flex-col justify-between gap-3 ${
                      card.featured
                        ? "bg-[#e32f8c]/[0.07] border-[#e32f8c]/40 hover:border-[#e32f8c]"
                        : "bg-[#090a0f] border-white/10 hover:border-white/25"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-bold text-white uppercase tracking-tight">
                          {card.name}
                        </span>
                        <span className="text-sm font-bold text-white tabular-nums">
                          {card.price}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        {pick(card.note)}
                      </p>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                        card.featured
                          ? "text-[#e32f8c] group-hover:text-white"
                          : "text-white group-hover:text-[#e32f8c]"
                      } transition-colors`}
                    >
                      <span>{pick(card.cta)}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {faq.duoNote && (
              <p className="text-xs text-zinc-400 pt-0.5">
                <Link
                  href="/#shop-products"
                  className="hover:text-white transition-colors underline underline-offset-4 decoration-white/25"
                >
                  {pick(faq.duoNote)}
                </Link>
              </p>
            )}

            {faq.inlineLink && (
              <div className="pt-0.5">
                <Link
                  href={faq.inlineLink.href}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#e32f8c] hover:text-white transition-colors"
                >
                  <span>{pick(faq.inlineLink.label)}</span>
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

export function FaqSection({
  x5Price = 329.99,
  x10Price = 529.99,
}: FaqSectionProps) {
  const locale = useLocale();
  const isRo = locale === "ro";
  const { currency } = useRegionStore();

  const [activeCategory, setActiveCategory] = useState<FaqCategory>("all");
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set(["x5-vs-x10"]));

  const x5PriceStr = formatPrice(getProductPrice(x5Price, currency), currency);
  const x10PriceStr = formatPrice(getProductPrice(x10Price, currency), currency);

  const categories = useMemo(
    () => [
      { id: "all" as const, label: isRo ? "Toate" : "All" },
      { id: "models" as const, label: isRo ? "X5 vs X10 & Mărime" : "Models & Sizing" },
      { id: "performance" as const, label: isRo ? "Folosire & Calitate" : "Performance" },
      { id: "shipping" as const, label: isRo ? "Livrare & Retur" : "Shipping & Returns" },
    ],
    [isRo]
  );

  const faqs: FaqEntry[] = useMemo(
    () => [
      {
        id: "x5-vs-x10",
        category: "models",
        question: {
          ro: "Ce să aleg, X5 sau X10?",
          en: "Should I buy the X5 or the X10?",
        },
        paragraphs: [
          {
            ro: "Dacă faci mai mult volum, gantere sau antrenamente de hipertrofie, mergi pe X5. Îți protejează articulația, dar lasă brațul să se miște natural.",
            en: "If your workouts are centered around volume, hypertrophy, and dumbbell pressing, go with the X5. You get solid joint support while keeping a natural bar feel.",
          },
          {
            ro: "Dacă pui greutăți mari (peste 100 kg la piept) și vrei susținere maximă cu plus real pe împins, alege X10. Sunt mai groase și mult mai rigide.",
            en: "If you press heavy (100+ kg) and want maximum stiffness with extra bounce out of the bottom, pick the X10.",
          },
        ],
        modelCards: [
          {
            slug: "x5-elbow-wraps",
            name: "TrenZone X5",
            price: x5PriceStr,
            note: {
              ro: "Rigiditate 3.5/5, bun pentru volum și confort zilnic.",
              en: "3.5/5 stiffness, built for volume sets and everyday comfort.",
            },
            cta: { ro: "Vezi X5", en: "View X5" },
          },
          {
            slug: "x10-elbow-wraps",
            name: "TrenZone X10",
            price: x10PriceStr,
            note: {
              ro: "Rigiditate 5/5, 1.2 kg perechea, pentru greutăți maxime.",
              en: "5/5 stiffness, 1.2 kg pair weight, built for heavy PR sets.",
            },
            cta: { ro: "Vezi X10", en: "View X10" },
            featured: true,
          },
        ],
        duoNote: {
          ro: "Dacă le iei pe amândouă în pachetul Duo Stack ai automat 5% reducere.",
          en: "Take both in the Duo Stack for an automatic 5% bundle discount.",
        },
      },
      {
        id: "benefits-and-exercises",
        category: "performance",
        question: {
          ro: "Cu ce ajută concret și merg doar la bench press?",
          en: "How much do they help, and are they only for bench press?",
        },
        paragraphs: [
          {
            ro: "Merg la orice exercițiu greu de împins: bench press cu bara sau ganterele, împins de umeri, flotări la paralele cu greutate și extensii de triceps.",
            en: "They work on any heavy pressing exercise: flat or incline bench (barbell or dumbbells), overhead press, weighted dips, and heavy triceps extensions.",
          },
          {
            ro: "Îți stabilizează cotul sub greutate ca să nu tremure brațul, preiau presiunea de pe tendon când cobori și îți dau un impuls mecanic curat la ieșirea din piept (până la +20 kg pe X10).",
            en: "They steady your elbow groove so your arm stays locked under load, take pressure off the triceps tendon at the bottom, and give clean elastic rebound pressing out of the hole (up to +20 kg on X10).",
          },
        ],
      },
      {
        id: "sizing-and-fit",
        category: "models",
        question: {
          ro: "Ce mărime sunt? Mi se potrivesc dacă am brațul mare sau subțire?",
          en: "What size are they? Will they fit larger or leaner arms?",
        },
        paragraphs: [
          {
            ro: "Sunt mărime universală (100 cm lungime) cu scai ajustabil. Se prind ușor atât pe brațe mai subțiri, cât și pe brațe de peste 45 cm.",
            en: "They are one-size-fits-all (100 cm length) with adjustable heavy Velcro, fitting both leaner arms and 45+ cm lifters cleanly.",
          },
          {
            ro: "Tu decizi cât de strâns le înfășori: mai lejer pe seriile de încălzire și mai strâns când intri la seria grea.",
            en: "You control how tight they feel: keep them looser during warm-ups, then pull tight before your heavy top sets.",
          },
        ],
      },
      {
        id: "why-trenzone",
        category: "performance",
        question: {
          ro: "Prin ce sunt diferite față de benzile mai ieftine?",
          en: "How are they different from cheaper gym wraps?",
        },
        paragraphs: [
          {
            ro: "Benzile ieftine din bumbac elastic se lărgesc după 2-3 săptămâni și încep să alunece pe antebraț chiar în timpul seriei.",
            en: "Cheap cotton-blend wraps stretch out within a few weeks and slide down your forearm mid-set.",
          },
          {
            ro: "TrenZone folosește un elastic industrial dens în mai multe straturi, cusături duble și textură care nu alunecă pe piele sau hanorac, testate pe greutăți reale de peste 200 kg.",
            en: "TrenZone wraps are made from dense multi-layer elastic with reinforced double stitching and an inner grip texture tested under 200+ kg lifts.",
          },
        ],
      },
      {
        id: "shipping-and-preorder",
        category: "shipping",
        question: {
          ro: "În cât timp ajunge comanda și cum funcționează precomanda?",
          en: "How fast is shipping, and how do pre-orders work?",
        },
        paragraphs: [
          {
            ro: "Produsele din stoc ajung în 1-2 zile lucrătoare în România (la ușă sau la locker) și prin curier rapid cu tracking în UE, Marea Britanie și SUA.",
            en: "In-stock orders arrive in 1-2 business days in Romania and ship via tracked express courier across the EU, UK, and USA.",
          },
          {
            ro: "Dacă un model este în precomandă, comanda îți rezervă perechea din următorul lot care intră în depozit, iar coletul pleacă cu prioritate imediat ce sosește stocul.",
            en: "If a wrap is on pre-order, your order reserves a pair from the next incoming batch and ships out first before regular restock goes live.",
          },
        ],
      },
      {
        id: "returns-and-swap",
        category: "shipping",
        question: {
          ro: "Pot schimba între X5 și X10 sau să fac retur dacă mă răzgândesc?",
          en: "Can I swap between X5 and X10 or return my order?",
        },
        paragraphs: [
          {
            ro: "Da. Ai 14 zile la dispoziție pentru retur sau schimb simplu între X5 și X10, cât timp produsul este nefolosit și în ambalajul original.",
            en: "Yes. You have 14 days to exchange between X5 and X10 or request a refund, as long as the wraps are unused and in their original packaging.",
          },
        ],
        inlineLink: {
          href: "/retur",
          label: {
            ro: "Accesează formularul de retur sau schimb",
            en: "Open return / exchange form",
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
      <div className="container mx-auto px-4 sm:px-6 max-w-3xl relative z-10">
        {/* Clean Minimalist Header */}
        <div className="flex flex-col items-center text-center mb-8 sm:mb-10">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#e32f8c] mb-2">
            {isRo ? "Întrebări frecvente" : "FAQ"}
          </span>

          <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white font-[family-name:var(--font-oswald)] leading-tight">
            {isRo
              ? "Tot ce trebuie să știi înainte să comanzi"
              : "Everything you need to know before ordering"}
          </h2>

          <p className="mt-2.5 text-sm text-zinc-400 font-normal max-w-lg leading-relaxed">
            {isRo
              ? "Răspunsuri scurte despre X5, X10, mărime, livrare și retur."
              : "Straight answers about X5, X10, sizing, shipping, and returns."}
          </p>

          {/* Filter Bar */}
          <div className="w-full flex justify-center mt-6">
            <div className="inline-flex max-w-full overflow-x-auto scrollbar-hide items-center gap-1 p-1 rounded-xl bg-[#0e1017] border border-white/10">
              {categories.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategoryChange(cat.id)}
                    style={{ WebkitTapHighlightColor: "transparent" }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer touch-manipulation transition-colors duration-150 ${
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

        {/* Hairline Shopify Accordion */}
        <div className="rounded-2xl border border-white/10 bg-[#0e1017] divide-y divide-white/[0.08] overflow-hidden">
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

        {/* Simple Closer Row */}
        <div className="mt-8 rounded-2xl bg-[#0e1017] border border-white/10 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm sm:text-base font-bold text-white">
              {isRo ? "Mai ai o întrebare?" : "Still have a question?"}
            </h4>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
              {isRo
                ? "Scrie-ne pe WhatsApp sau email și te ajutăm să alegi modelul potrivit."
                : "Message us on WhatsApp or email and we will help you pick the right pair."}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              href="/shop"
              className="inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-[#e32f8c] hover:bg-white text-white hover:text-black font-bold text-xs uppercase tracking-wider transition-colors duration-150"
            >
              <span>{isRo ? "Vezi produsele" : "Shop wraps"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center py-2.5 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] border border-white/15 text-white font-semibold text-xs uppercase tracking-wider transition-colors duration-150"
            >
              {isRo ? "Contact" : "Contact"}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
