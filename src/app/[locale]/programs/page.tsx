import { setRequestLocale } from "next-intl/server";
import { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-config";
import { generateFAQSchema } from "@/lib/schema";
import { ProgramsShowcaseSection } from "@/components/programs/ProgramsShowcaseSection";
import { ProgramsFaqSection } from "@/components/programs/ProgramsFaqSection";
import { getProducts } from "@/lib/api";
import { PROGRAM_SLUGS, PROGRAM_UUIDS } from "@/lib/programs";

const BASE_URL = getSiteUrl();

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const isRo = locale !== "en";

  const title = isRo
    ? "Programe Digitale Vlad Tren — Food Plan & Bench Program (PDF RO / EN) | TrenZone®"
    : "Vlad Tren Digital Programs — Food Plan & Bench Program (PDF EN / RO) | TrenZone®";

  const description = isRo
    ? "Descarcă instant pe email programele oficiale Vlad Tren: Food Plan (Nutriție, Masă Musculară & Slăbire în 10 capitole) și Bench Program (8 săptămâni pentru forță și PR la împins la piept). Disponibile în Română și Engleză."
    : "Instant email PDF delivery of Vlad Tren's official programs: Food Plan (10-chapter Nutrition, Muscle Gain & Fat Loss Guide) and Bench Program (8-Week Bench Press Strength Protocol). Available in English and Romanian.";

  const canonicalUrl = `${BASE_URL}/${locale}/programs`;

  return {
    title,
    description,
    keywords: isRo
      ? [
          "food plan vlad tren",
          "bench program vlad tren",
          "plan alimentar masa musculara",
          "program impins la piept",
          "nutritie sala pdf",
          "trenzone programe",
          "vladtren1 program",
        ]
      : [
          "vlad tren food plan",
          "vlad tren bench program",
          "muscle gain meal plan pdf",
          "bench press strength program",
          "trenzone digital programs",
        ],
    alternates: {
      canonical: canonicalUrl,
      languages: {
        ro: `${BASE_URL}/ro/programs`,
        "ro-RO": `${BASE_URL}/ro/programs`,
        en: `${BASE_URL}/en/programs`,
        "en-US": `${BASE_URL}/en/programs`,
        "en-GB": `${BASE_URL}/en/programs`,
        "x-default": `${BASE_URL}/en/programs`,
      },
    },
    openGraph: {
      type: "website",
      url: canonicalUrl,
      locale: isRo ? "ro_RO" : "en_US",
      title,
      description,
      siteName: "TrenZone®",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export const revalidate = 2592000;

export default async function ProgramsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = (rawLocale === "en" ? "en" : "ro") as "ro" | "en";
  setRequestLocale(locale);
  const isRo = locale === "ro";
  const allProducts = await getProducts();

  const foodProd = allProducts.find(
    (p) => p.slug === PROGRAM_SLUGS.FOOD_PLAN || p.id === PROGRAM_UUIDS.FOOD_PLAN
  );
  const trainingProd = allProducts.find(
    (p) =>
      p.slug === PROGRAM_SLUGS.TRAINING_PROGRAM || p.id === PROGRAM_UUIDS.TRAINING_PROGRAM
  );
  const benchProd = allProducts.find(
    (p) => p.slug === PROGRAM_SLUGS.BENCH_PROGRAM || p.id === PROGRAM_UUIDS.BENCH_PROGRAM
  );
  const bundleProd = allProducts.find(
    (p) => p.slug === PROGRAM_SLUGS.BUNDLE || p.id === PROGRAM_UUIDS.BUNDLE
  );

  const faqItems = isRo
    ? [
        {
          question: "Ce conține concret fiecare program și pe care să îl aleg?",
          answer:
            "Food Plan este ghidul complet în 10 capitole care îți arată exact cum să îți structurezi mesele, proteinele și caloriile — cu exemple concrete de meniuri zilnice atât pentru creștere în masă musculară, cât și pentru slăbire/definire. Bench Program este sistemul de antrenament dedicat forței la împins: poziționarea pe bancă, structura săptămânală, sistemul de progresie 4×4–6 repetări și exercițiile accesorii.",
        },
        {
          question: "Cu ce mă ajută Bench Program dacă mă antrenez deja la sală?",
          answer:
            "În program ai reguli clare: știi exact când crești greutatea pe bară (când atingi 4 serii × 6 repetări curate), cum îți dozezi efortul (1–2 repetări în rezervă) și ce accesorii îți întăresc tricepșii, umerii și spatele pentru stabilitate maximă.",
        },
        {
          question: "Food Plan-ul conține alimente scumpe sau greu de găsit?",
          answer:
            "Nu. Planul este construit pe alimente simple și accesibile pe care le găsești în orice magazin: ouă, piept de pui, vită, orez, cartofi, ovăz, brânză cottage, telemea, iaurt grecesc, fructe și legume.",
        },
        {
          question: "Sunt potrivite și pentru începători sau doar pentru avansați?",
          answer:
            "Ambele ghiduri sunt scrise direct și practic, fără teorie complicată. Dacă ești la început, îți scutesc luni întregi de încercări și greșeli, iar dacă ai deja experiență, îți oferă structura de progresie ca să treci peste plafonare.",
        },
        {
          question: "Cum primesc programele după plată și în ce limbă sunt?",
          answer:
            "Livrarea este instantă pe email imediat după confirmarea plății cu cardul, Apple Pay sau Google Pay, în limba selectată (Română sau Engleză), cu 0 cost de transport.",
        },
      ]
    : [
        {
          question: "What is inside each program and which one should I choose?",
          answer:
            "Food Plan is a complete 10-chapter nutrition guide with sample meal plans for both muscle gain and fat loss. Bench Program is the strength system built to increase your bench press using setup mechanics, the 4×4–6 progression model, and key accessory lifts.",
        },
        {
          question: "How will the Bench Program help if I already train at the gym?",
          answer:
            "It gives you a clear rulebook: you know exactly when to add weight to the bar (once you hit 4 sets of 6 clean reps), how to manage fatigue (1–2 reps in reserve), and which accessories build lockout strength.",
        },
        {
          question: "Does the Food Plan require expensive or complicated ingredients?",
          answer:
            "No. Every meal is built around simple, affordable supermarket staples: eggs, chicken breast, beef, rice, potatoes, oats, cottage cheese, Greek yogurt, fruit, and vegetables.",
        },
        {
          question: "Are these guides suitable for beginners or only advanced lifters?",
          answer:
            "Both guides are written in a direct, practical style with zero fluff, saving beginners months of trial and error while giving intermediate and advanced lifters the exact structure to break plateaus.",
        },
        {
          question: "How do I receive the programs after payment, and in what language?",
          answer:
            "Delivery is instant via email right after completing your card, Apple Pay, or Google Pay payment, in English or Romanian, with zero shipping costs.",
        },
      ];

  return (
    <div className="trenzone-master-canvas min-h-screen flex flex-col selection:bg-[#e32f8c] selection:text-black">
      <div className="trenzone-ambient-canvas" />
      <div className="trenzone-ambient-texture" />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqItems)) }}
      />

      <div className="relative z-10 pt-4">
        <ProgramsShowcaseSection standalonePage={true} products={allProducts} />
      </div>

      <div className="trenzone-luminous-divider" />

      {/* Interactive High-Converting FAQ Accordion */}
      <ProgramsFaqSection
        foodPriceRon={Number(foodProd?.price) || 120}
        trainingPriceRon={Number(trainingProd?.price) || 120}
        benchPriceRon={Number(benchProd?.price) || 100}
        bundlePriceRon={Number(bundleProd?.price) || 249}
      />
    </div>
  );
}

