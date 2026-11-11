import { setRequestLocale } from "next-intl/server";
import { Metadata } from "next";
import { generateFAQSchema } from "@/lib/schema";

// Import TrenZone components
import { TrenHero } from "./components/TrenHero";
import { InfluencerCarousel } from "./components/InfluencerCarousel";
import { ModelGuideSection } from "./components/ModelGuideSection";
import { TrenProductShowcase } from "./components/TrenProductShowcase";
import { ComparisonSection } from "./components/ComparisonSection";
import { StaticReviewSection } from "@/components/product/StaticReviewSection";
import { FaqSection } from "./components/FaqSection";
import { AmbassadorBanner } from "./components/AmbassadorBanner";

import { getShippingConfig } from "@/app/actions/shipping";
import { getPublicInfluencers } from "@/app/actions/products";
import { getAllReviewsServer } from "@/app/actions/public-reviews";
import { formatPublicReviews } from "@/lib/utils/reviews";
import { getCdnUrl } from "@/lib/utils/cdn";
import { getProducts } from "@/lib/api";

const BASE_URL = "https://www.trenzone.fit";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const isRo = locale !== 'en';

  const title = isRo
    ? "TREN WRAPS by Vlad Tren | Benzi de Cot Heavy-Duty TrenZone®"
    : "TREN WRAPS by Vlad Tren | Heavy-Duty Elbow Wraps TrenZone®";

  const description = isRo
    ? "Built for Strength. Designed for Performance. Benzi de cot profesionale pentru powerlifting și greutăți mari. Compresie rigidă, stabilitate totală sub bară și până la +20 kg pe bench press."
    : "Built for Strength. Designed for Performance. Competition-grade elbow wraps for powerlifting and heavy pressing. Extreme compression, joint stability, and up to +20 kg bench rebound.";

  const canonicalUrl = `${BASE_URL}/${locale}`;

  return {
    title,
    description,
    keywords: isRo
      ? ["benzi de cot", "elbow wraps", "trenzone", "x10 elbow wraps", "x5 elbow wraps", "benzi powerlifting", "echipament sala", "impins la piept", "bench press", "suport coate", "protectie tendoane", "powerlifting romania"]
      : ["elbow wraps", "bench press wraps", "trenzone", "x10 elbow wraps", "x5 elbow wraps", "heavy duty wraps", "powerlifting gear", "elbow sleeves for bench", "lifting straps", "strength equipment"],
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "ro": `${BASE_URL}/ro`,
        "en": `${BASE_URL}/en`,
        "x-default": `${BASE_URL}/ro`,
      }
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
      creator: "@trenzone",
    }
  };
}

export const revalidate = 2592000; // 30 days ISR — purged instantly via Admin "Șterge Cache" button

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = (rawLocale === 'en' ? 'en' : 'ro') as 'ro' | 'en';
  setRequestLocale(locale);

  const [config, influencers, allProducts, rawReviews] = await Promise.all([
    getShippingConfig(),
    getPublicInfluencers(),
    getProducts(),
    getAllReviewsServer(),
  ]);
  const initialReviews = formatPublicReviews(rawReviews, 40);

  const faqItems = locale === 'ro' ? [
    { 
      question: "Cum funcționează precomanda și când ajunge produsul?", 
      answer: "Precomanda îți rezervă perechea direct din ediția oficială de lansare, asigurându-te că o primești imediat ce sosește în stoc. După plasarea comenzii, primești confirmarea și actualizări pe email, iar coletul este expediat cu prioritate." 
    },
    { 
      question: "Ce să aleg: TrenZone X5 sau X10?", 
      answer: "Alegerea depinde de stilul tău: dacă vrei mobilitate, confort și protecție articulară pe serii de volum și culturism, alege X5 (suport 3.5/5 ferm și flexibil). Dacă vrei rigiditate extremă, blocare completă a cotului și asistență de până la +20 kg la ieșirea din piept pe seriile grele și PR-uri, alege X10." 
    },
    { 
      question: "Sunt potrivite și pentru începători sau doar pentru avansați?", 
      answer: "Modelul X5 este excelent pentru oricine vrea să-și protejeze coatele și tendoanele de suprasolicitare. Modelul X10 este recomandat celor care au deja tehnică formată pe greutăți mari." 
    },
    { 
      question: "Ce face ca benzile TrenZone să fie superioare față de ce e pe piață?", 
      answer: "Materialul ultra-dens multi-strat de 1.2 kg, densitatea structurală militară și aderența anti-alunecare pe piele. Își păstrează rigiditatea neschimbată după sute de serii grele." 
    },
    { 
      question: "Sunt benzile doar pentru Bench Press sau și pentru alte exerciții?", 
      answer: "Nu sunt doar pentru Bench Press! Sunt concepute pentru orice mișcare grea de împins: Bench Press (bară/gantere, orizontal/înclinat), Împins umeri (Overhead Press), Dips cu greutate și extensii grele de triceps. Oferă stabilitate mecanică fără tremurat, protecție totală la tendoane și recul kinetic prin punctul mort." 
    },
    { 
      question: "Livrați și în afara României?", 
      answer: "Da, livrăm rapid prin curieri expres direct la ușă, atât în România (1-2 zile lucrătoare), cât și internațional în toată Uniunea Europeană, Marea Britanie și SUA." 
    }
  ] : [
    { 
      question: "How does pre-ordering work and when will my wraps arrive?", 
      answer: "Pre-ordering guarantees your pair directly from the upcoming production batch. You receive an immediate confirmation and tracking updates via email, and your order ships with top priority as soon as stock lands." 
    },
    { 
      question: "Which model should I pick: TrenZone X5 or X10?", 
      answer: "Choose based on your training style: need versatile wraps for volume, shoulder pressing, and hypertrophy? Go with X5. Hunting heavy PRs with maximum lockout rebound and extreme stiffness? Get the X10." 
    },
    { 
      question: "Are they suitable for beginners or only advanced lifters?", 
      answer: "The X5 model is great for beginners and intermediates to protect joints and prevent flare-ups. The X10 is tailored for seasoned lifters handling heavy iron." 
    },
    { 
      question: "What makes TrenZone wraps superior to generic market wraps?", 
      answer: "Our multi-layered heavy-duty elastic weave, reinforced cross-stitching, and anti-slip finish that will never stretch out or become loose like cheap cotton wraps." 
    },
    { 
      question: "Are elbow wraps only for Bench Press or other lifts too?", 
      answer: "They are NOT just for Bench Press! They are engineered for all heavy pressing movements: Bench Press (barbell/dumbbells), Overhead Shoulder Press, Weighted Dips, and heavy triceps work. You get locked-in joint stability, zero tendon strain, and explosive rebound through sticking points." 
    },
    { 
      question: "Do you ship internationally?", 
      answer: "Yes, we ship across Romania (1-2 business days) and internationally across Europe and the US with express tracked couriers." 
    }
  ];

  return (
    <div className="trenzone-master-canvas flex flex-col min-h-screen selection:bg-[#e32f8c] selection:text-black">
      {/* Dynamic ambient canvas & technical micro-texture overlay */}
      <div className="trenzone-ambient-canvas" />
      <div className="trenzone-ambient-texture" />

      {/* FAQPage JSON-LD schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqItems)) }}
      />

      {/* 1. HERO SECTION (High-impact, immediate value prop & CTAs) */}
      <div className="relative z-10">
        <TrenHero 
          freeShippingRo={config.free_shipping_ro_ron} 
          freeShippingIntl={config.free_shipping_intl_eur} 
        />
      </div>

      <div className="trenzone-luminous-divider" />

      {/* 2. INFLUENCERS / LIFTERS VIDEO UGC (Visual proof under heavy load) */}
      <div className="relative z-10">
        <InfluencerCarousel influencers={influencers} dark={true} />
      </div>

      <div className="trenzone-luminous-divider" />

      {/* ═══ 3 & 4. THE POWERLIFTING PLATFORM: PRODUCTS & MODEL GUIDE (STRATEGIA A) ═══ */}
      <div className="relative z-10 overflow-hidden">
        {/* Dark Raw Concrete & Chalk Dust Texture (Matching /shop platform) */}
        <div
          className="absolute inset-0 pointer-events-none z-0 opacity-20 mix-blend-screen"
          style={{
            backgroundImage: `url('${getCdnUrl('/images/ui/dark-chalk-concrete.jpg')}')`,
            backgroundSize: "650px",
            backgroundRepeat: "repeat",
            backgroundPosition: "top center",
          }}
        />
        {/* Smooth feathered top & bottom transitions for flawless visual blending */}
        <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-[#030305] to-transparent pointer-events-none z-[1]" />
        <div className="absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t from-[#030305] to-transparent pointer-events-none z-[1]" />
        
        {/* Subtle dynamic power aurora */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-[#e32f8c]/10 blur-[150px] rounded-full pointer-events-none z-0" />

        {/* 3. BEST SELLERS / PRODUCT SHOWCASE */}
        <div className="relative z-10">
          <TrenProductShowcase products={allProducts} />
        </div>

        <div className="trenzone-luminous-divider" />

        {/* 4. DEDICATED MODEL GUIDE: X5 vs. X10 */}
        <div className="relative z-10">
          <ModelGuideSection />
        </div>
      </div>

      <div className="trenzone-luminous-divider" />

      {/* 5. COMPARISON SECTION (Why TrenZone beats generic alternatives) */}
      <div className="relative z-10">
        <ComparisonSection />
      </div>

      <div className="trenzone-luminous-divider" />

      {/* 6. AUTHENTIC UNFILTERED REVIEWS (Dani Gym, Alex, Apolo, David M.) */}
      <div className="relative z-10">
        <StaticReviewSection initialReviews={initialReviews} />
      </div>

      <div className="trenzone-luminous-divider" />

      {/* 7. FAQ (Direct objection handling) */}
      <div className="relative z-10">
        <FaqSection />
      </div>

      <div className="trenzone-luminous-divider" />

      {/* 8. AMBASSADOR PROGRAM BANNER */}
      <div className="relative z-10">
        <AmbassadorBanner />
      </div>
    </div>
  );
}
