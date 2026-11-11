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
      question: "Ce să aleg, X5 sau X10?", 
      answer: "Dacă faci mai mult volum, gantere sau antrenamente de hipertrofie, mergi pe X5. Dacă pui greutăți mari (peste 100 kg la piept) și vrei susținere maximă cu plus real pe împins, alege X10." 
    },
    { 
      question: "Cu ce ajută concret și merg doar la bench press?", 
      answer: "Merg la orice exercițiu greu de împins: bench press cu bara sau ganterele, împins de umeri, flotări la paralele cu greutate și extensii de triceps. Stabilizează cotul sub greutate, protejează tendonul și oferă până la +20 kg recul pe X10." 
    },
    { 
      question: "Ce mărime sunt? Mi se potrivesc dacă am brațul mare sau subțire?", 
      answer: "Sunt mărime universală (100 cm lungime) cu scai ajustabil, potrivite atât pe brațe mai subțiri, cât și pe brațe de peste 45 cm." 
    },
    { 
      question: "Prin ce sunt diferite față de benzile mai ieftine?", 
      answer: "Folosesc un elastic industrial dens în mai multe straturi, cusături duble și textură care nu alunecă pe piele sau hanorac, testate pe greutăți reale de peste 200 kg." 
    },
    { 
      question: "În cât timp ajunge comanda și cum funcționează precomanda?", 
      answer: "Produsele din stoc ajung în 1-2 zile lucrătoare în România și prin curier rapid cu tracking în UE, UK și SUA. Precomanda îți rezervă perechea din următorul lot cu expediere prioritară." 
    },
    { 
      question: "Pot schimba între X5 și X10 sau să fac retur dacă mă răzgândesc?", 
      answer: "Da. Ai 14 zile la dispoziție pentru retur sau schimb simplu între X5 și X10, cât timp produsul este nefolosit și în ambalajul original." 
    }
  ] : [
    { 
      question: "Should I buy the X5 or the X10?", 
      answer: "If your workouts center around volume, hypertrophy, and dumbbell pressing, go with the X5. If you press heavy (100+ kg) and want maximum stiffness with extra bounce out of the bottom, pick the X10." 
    },
    { 
      question: "How much do they help, and are they only for bench press?", 
      answer: "They work on any heavy pressing exercise: flat or incline bench, overhead press, weighted dips, and heavy triceps extensions, steadying your elbow groove and taking pressure off your triceps tendon (up to +20 kg rebound on X10)." 
    },
    { 
      question: "What size are they? Will they fit larger or leaner arms?", 
      answer: "They are one-size-fits-all (100 cm length) with adjustable heavy Velcro, fitting leaner arms as well as 45+ cm lifters." 
    },
    { 
      question: "How are they different from cheaper gym wraps?", 
      answer: "TrenZone wraps use dense multi-layer elastic with reinforced double stitching and an inner grip texture tested under 200+ kg lifts without stretching out." 
    },
    { 
      question: "How fast is shipping, and how do pre-orders work?", 
      answer: "In-stock orders arrive in 1-2 business days in Romania and ship via tracked express courier across the EU, UK, and USA. Pre-orders reserve a pair from the next batch and ship first." 
    },
    { 
      question: "Can I swap between X5 and X10 or return my order?", 
      answer: "Yes. You have 14 days to exchange between X5 and X10 or request a refund, as long as the wraps are unused and in their original packaging." 
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
