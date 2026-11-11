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

  const x5Product = allProducts.find((p: any) => p.slug?.startsWith("x5")) || allProducts.find((p: any) => p.slug?.includes("x5"));
  const x10Product = allProducts.find((p: any) => p.slug?.startsWith("x10")) || allProducts.find((p: any) => p.slug?.includes("x10"));

  const faqItems = locale === 'ro' ? [
    { 
      question: "Ce model să aleg: TrenZone X5 sau TrenZone X10?", 
      answer: "Ambele au compresie reglabilă pe orice braț. Dacă vrei confort, mobilitate și protecție articulară pe serii de volum și hipertrofie, alege X5 (rigiditate 3.5/5). Dacă vrei rigiditate maximă de competiție pentru greutăți mari (100-200+ kg) și asistență de până la +20 kg la ieșirea din piept, alege X10 (5/5)." 
    },
    { 
      question: "Cât suport real oferă în plus și merg doar la împins la piept?", 
      answer: "Nu sunt doar pentru Bench Press! Stabilizează cotul pe orice mișcare grea de împins: Bench Press (bară/gantere), Overhead Press, Weighted Dips și extensii grele de triceps. Oferă până la +20 kg recul kinetic, zero tremurat și protecție reală pe tendoane." 
    },
    { 
      question: "Au mărime universală? Se potrivesc și pe brațe mai mari sau mai subțiri?", 
      answer: "Da. Lungimea completă de 100 cm cu sistem Velcro industrial se reglează milimetric pe orice circumferință a brațului, de la sportivi începători până la heavyweights." 
    },
    { 
      question: "De ce să aleg TrenZone® și nu benzi obișnuite mai ieftine?", 
      answer: "Elasticul multi-strat de densitate industrială (1.2 kg perechea pe X10), cusăturile duble ranforsate și textura anti-alunecare păstrează compresia intactă fără să se lase după câteva săptămâni." 
    },
    { 
      question: "În cât timp ajunge comanda și cum funcționează precomanda?", 
      answer: "Produsele din stoc se expediază zilnic cu livrare în 1-2 zile lucrătoare în România și prin curier rapid în UE, UK și SUA. Precomenzile îți rezervă perechea din primul lot oficial cu expediere prioritară și notificări pe email." 
    },
    { 
      question: "Pot schimba între X5 și X10 sau returna comanda dacă nu mi se potrivește?", 
      answer: "Da, ai garanție 14 zile de retur și schimb rapid pentru orice produs neutilizat, în ambalajul original." 
    }
  ] : [
    { 
      question: "Which model should I choose: TrenZone X5 or X10?", 
      answer: "Both fit any arm size with adjustable tension. Go with X5 (3.5/5 stiffness) for hypertrophy, dumbbell work, and pain-free volume sets, or X10 (5/5 extreme stiffness, 1.2 kg weave) for 100-200+ kg lifts and up to +20 kg rebound assist." 
    },
    { 
      question: "How much support do they add, and are they only for Bench Press?", 
      answer: "Not just for Bench Press—they stabilize your elbow across Bench Press, Overhead Press, Weighted Dips, and heavy skull crushers, providing up to +20 kg mechanical assist, zero wobble, and triceps tendon relief." 
    },
    { 
      question: "Are they one-size-fits-all? Will they fit larger or leaner arms?", 
      answer: "Yes. Each 100 cm pair features heavy-duty adjustable Velcro to fit leaner arms up to 48 cm+ athletes and lets you dial tension tighter on PR sets." 
    },
    { 
      question: "Why choose TrenZone® instead of cheaper generic elbow wraps?", 
      answer: "Our industrial multi-layer elastic weave, reinforced double stitching, and anti-slip grip stay locked under 200+ kg without stretching out after a few weeks." 
    },
    { 
      question: "How fast is delivery, and how do pre-orders work?", 
      answer: "In-stock items ship fast in 1-2 business days across Romania and tracked courier across the EU, UK, and USA. Pre-orders reserve your pair from the official production batch with first-out dispatch priority." 
    },
    { 
      question: "Can I swap X5 ↔ X10 or return my order if needed?", 
      answer: "Yes, every order includes a 14-day hassle-free exchange or refund guarantee for unused items in original packaging." 
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
        <FaqSection x5Price={x5Product?.price} x10Price={x10Product?.price} />
      </div>

      <div className="trenzone-luminous-divider" />

      {/* 8. AMBASSADOR PROGRAM BANNER */}
      <div className="relative z-10">
        <AmbassadorBanner />
      </div>
    </div>
  );
}
