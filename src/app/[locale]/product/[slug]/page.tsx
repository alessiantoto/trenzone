import { getProductBySlug, getProducts } from "@/lib/api";
import { getPublicReviewsStats } from "@/app/actions/admin-reviews";
import { getProductPrice } from "@/utils/pricing";
import { ProductMainContainer } from "@/components/product/ProductMainContainer";
import { ProductCard } from "@/components/product/ProductCard";
import { notFound, redirect } from "next/navigation";
import { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { StaticReviewSection } from "@/components/product/StaticReviewSection";
import { Link } from "@/i18n/routing";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { InfluencerCarousel } from "@/app/[locale]/components/InfluencerCarousel";
import { YouMayAlsoLike } from "@/components/product/YouMayAlsoLike";
import { getPublicInfluencers } from "@/app/actions/products";
import { getAllReviewsServer } from "@/app/actions/public-reviews";
import { formatPublicReviews } from "@/lib/utils/reviews";
import { generateProductSchema, generateBreadcrumbSchema, generateFAQSchema } from "@/lib/schema";

export const revalidate = 2592000; // Cache product page for 30 days — admin actions & "Șterge Cache" trigger on-demand revalidation

const BASE_URL = "https://www.trenzone.fit";

export async function generateMetadata({ params }: { params: Promise<{ locale: string, slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Produs Necunoscut" };

  const name = typeof product.name === 'object' ? product.name[locale] || product.name['ro'] : product.name;
  
  // SEO: Prioritize DB Meta Title/Description (multilingual)
  const dbMetaTitle = (product.meta_title && typeof product.meta_title === 'object') ? (product.meta_title as any)[locale] : product.meta_title;
  const dbMetaDesc = (product.meta_description && typeof product.meta_description === 'object') ? (product.meta_description as any)[locale] : product.meta_description;

  const fallbackTitle = locale === 'ro'
    ? `${name} | Benzi de Cot Heavy-Duty TrenZone® by Vlad Tren`
    : `${name} | Heavy-Duty Elbow Wraps TrenZone® by Vlad Tren`;
  const fallbackDesc = typeof product.description === 'object' ? (product.description as any)[locale] : product.description;

  const title = (dbMetaTitle as string) || fallbackTitle;
  const description = (dbMetaDesc as string) || fallbackDesc?.substring(0, 160) || fallbackTitle;

  const canonicalUrl = `${BASE_URL}/${locale}/product/${slug}`;

  const images = [
    product.image,
    ...(Array.isArray((product as any).images) ? (product as any).images : [])
  ].filter(Boolean).map((img: string) => ({
    url: img.startsWith('http') ? img : `${BASE_URL}${img}`,
    width: 1200,
    height: 1200,
    alt: title,
  }));

  return {
    title,
    description,
    keywords: locale === 'ro'
      ? ["benzi de cot", "elbow wraps", "trenzone", "vlad tren", "benzi powerlifting", "impins la piept", "bench press"]
      : ["elbow wraps", "powerlifting wraps", "trenzone", "vlad tren", "bench press wraps", "strength gear"],
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "ro": `${BASE_URL}/ro/product/${slug}`,
        "ro-RO": `${BASE_URL}/ro/product/${slug}`,
        "en": `${BASE_URL}/en/product/${slug}`,
        "en-GB": `${BASE_URL}/en/product/${slug}`,
        "en-DE": `${BASE_URL}/en/product/${slug}`,
        "en-FR": `${BASE_URL}/en/product/${slug}`,
        "en-IT": `${BASE_URL}/en/product/${slug}`,
        "en-ES": `${BASE_URL}/en/product/${slug}`,
        "en-PL": `${BASE_URL}/en/product/${slug}`,
        "en-NL": `${BASE_URL}/en/product/${slug}`,
        "en-BE": `${BASE_URL}/en/product/${slug}`,
        "en-AT": `${BASE_URL}/en/product/${slug}`,
        "en-HU": `${BASE_URL}/en/product/${slug}`,
        "en-BG": `${BASE_URL}/en/product/${slug}`,
        "en-CZ": `${BASE_URL}/en/product/${slug}`,
        "en-SK": `${BASE_URL}/en/product/${slug}`,
        "en-HR": `${BASE_URL}/en/product/${slug}`,
        "en-SI": `${BASE_URL}/en/product/${slug}`,
        "en-GR": `${BASE_URL}/en/product/${slug}`,
        "en-PT": `${BASE_URL}/en/product/${slug}`,
        "en-SE": `${BASE_URL}/en/product/${slug}`,
        "en-FI": `${BASE_URL}/en/product/${slug}`,
        "en-EE": `${BASE_URL}/en/product/${slug}`,
        "en-LV": `${BASE_URL}/en/product/${slug}`,
        "en-LT": `${BASE_URL}/en/product/${slug}`,
        "en-LU": `${BASE_URL}/en/product/${slug}`,
        "en-CY": `${BASE_URL}/en/product/${slug}`,
        "x-default": `${BASE_URL}/en/product/${slug}`,
      }
    },
    openGraph: {
      type: "website",
      url: canonicalUrl,
      locale: locale === 'ro' ? "ro_RO" : "en_US",
      alternateLocale: locale === 'ro'
        ? ["en_US", "en_GB", "de_DE", "fr_FR", "it_IT", "es_ES", "pl_PL", "nl_NL"]
        : ["ro_RO", "hu_HU", "bg_BG", "cs_CZ", "el_GR"],
      title,
      description,
      siteName: "TrenZone®",
      images: images.length > 0 ? images : [{ url: `${BASE_URL}/og-image.png`, width: 1200, height: 630, alt: title }]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images.length > 0 ? [images[0].url] : [`${BASE_URL}/og-image.png`],
      creator: "@trenzone",
    },
    other: {
      "og:price:amount": getProductPrice(product.price, locale === 'ro' ? 'RON' : 'EUR').toString(),
      "og:price:currency": locale === 'ro' ? 'RON' : 'EUR',
      "product:availability": product.stock_quantity > 0 ? "in stock" : "out of stock",
      "product:condition": "new",
      "product:brand": (product as any).brand || "TrenZone",
    }
  };
}


export async function generateStaticParams() {
  const products = await getProducts();
  const locales = ['ro', 'en'];
  
  const params = [];
  for (const locale of locales) {
    for (const product of products) {
      params.push({ locale, slug: product.slug });
    }
  }
  return params;
}

export default async function ProductPage({ params }: { params: Promise<{ locale: string, slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  
  // Parallel fetch for speed (all 100% cached for 30 days via unstable_cache)
  const [product, stats, t, tShop, allProducts, influencers, rawReviews] = await Promise.all([
    getProductBySlug(slug),
    getPublicReviewsStats(),
    getTranslations("Product"),
    getTranslations("Shop"),
    getProducts(),
    getPublicInfluencers(),
    getAllReviewsServer()
  ]);
  const initialReviews = formatPublicReviews(rawReviews, 40);

  if (!product) {
    redirect(`/${locale}/shop`);
  }

  const name = typeof product.name === 'object' ? product.name[locale] || product.name['ro'] : product.name;
  const numericPrice = getProductPrice(product.price, locale === 'ro' ? 'RON' : 'EUR');
  // Related: exclude current product, sort by price descending (most expensive first)
  const relatedProducts = allProducts
    .filter(p => p.slug !== product!.slug)
    .sort((a, b) => {
      const priceA = getProductPrice(a.price, locale === 'ro' ? 'RON' : 'EUR');
      const priceB = getProductPrice(b.price, locale === 'ro' ? 'RON' : 'EUR');
      return priceB - priceA;
    });
  
  // Rich JSON-LD for Google: Product + BreadcrumbList + FAQPage
  const currency = locale === 'ro' ? 'RON' : 'EUR';
  const jsonLd = generateProductSchema(product, currency, locale, stats);

  const breadcrumbJsonLd = generateBreadcrumbSchema([
    { name: 'TrenZone', url: BASE_URL },
    { name: locale === 'ro' ? 'Shop' : 'Shop', url: `${BASE_URL}/${locale}/shop` },
    { name: typeof product.name === 'object' ? product.name[locale] || product.name['ro'] : product.name, url: `${BASE_URL}/${locale}/product/${slug}` }
  ]);

  // Product-specific FAQs
  const productFaqItems = locale === 'ro' ? [
    { question: "Cum aleg între modelul X5 și X10?", answer: "Alegerea depinde de stilul tău de antrenament: dacă vrei confort, mobilitate și protecție articulară pe serii de volum și culturism, alege X5 (suport 3.5/5 ferm și flexibil). Dacă vrei rigiditate extremă, blocare de fier pe coate și asistență mecanică de până la +20 kg la ieșirea din piept pe seriile grele și PR-uri, alege X10 (suport 5/5 de competiție)." },
    { question: "Cât timp durează livrarea?", answer: "Comenzile sunt expediate prin curier rapid direct la adresă în 1-2 zile lucrătoare în România și 3-5 zile lucrătoare internațional. Livrare gratuită disponibilă peste pragul afișat." },
    { question: "Sunt potrivite și pentru începători?", answer: "Modelul X5 este excelent pentru orice lifter care dorește să-și protejeze articulația cotului și tendoanele de uzură. Modelul X10 este recomandat sportivilor avansați care au deja stabilitate formată pe greutăți mari." },
    { question: "Cum se întrețin benzile de cot?", answer: "Se recomandă aerisirea lor după fiecare antrenament intens și spălarea manuală la temperaturi reduse (apă călduță), fără uscare automată, pentru a păstra elasticitatea intactă." },
    { question: "Care este politica de retur?", answer: "Beneficiezi de 14 zile drept de retur garantat fără riscuri. Dacă mărimea sau nivelul de rigiditate nu ți se potrivește, poți schimba sau returna produsul simplu și rapid." }
  ] : [
    { question: "How do I choose between X5 and X10?", answer: "Choose based on your training style: if you want versatile joint support, full mobility, and tendon protection for hypertrophy and volume, choose X5 (3.5/5 firmness). If you want extreme competition-grade stiffness and maximum lockout rebound on heavy sets, choose X10 (5/5 stiffness)." },
    { question: "How long does delivery take?", answer: "Orders are shipped via express tracked courier to your doorstep in 1-2 business days in Romania and 3-5 business days across Europe, the UK, and the US. Free shipping is available above the threshold." },
    { question: "Are these suitable for beginners?", answer: "The X5 model is great for lifters wanting reliable elbow protection and joint longevity. The X10 model is engineered for advanced lifters moving heavy poundages." },
    { question: "How do I care for my elbow wraps?", answer: "Air-dry after intense sessions and hand wash with lukewarm water when needed. Do not machine tumble dry to ensure elastic tension remains at peak performance." },
    { question: "What is the return policy?", answer: "We offer a 14-day hassle-free return window. If you wish to exchange models or return unused wraps, our support team handles it quickly." }
  ];
  const productFaqJsonLd = generateFAQSchema(productFaqItems);


  return (
    <div className="trenzone-master-canvas flex flex-col min-h-screen selection:bg-[#e32f8c] selection:text-black">
      {/* Dynamic ambient canvas & technical micro-texture overlay */}
      <div className="trenzone-ambient-canvas" />
      <div className="trenzone-ambient-texture" />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productFaqJsonLd) }}
      />
      
      {/* 1. Main Interactive Product Showcase */}
      <div className="relative z-10">
        <ProductMainContainer product={product} initialStats={stats} />
      </div>

      <div className="trenzone-luminous-divider" />

      {/* 2. RECOMANDAT DE ATLEȚI — Community Carousel */}
      {influencers && influencers.length > 0 && (
        <>
          <div className="relative z-10 pt-2 pb-8 md:pt-4 md:pb-12">
            <div className="container mx-auto px-4">
              <InfluencerCarousel influencers={influencers} dark={true} />
            </div>
          </div>
          <div className="trenzone-luminous-divider" />
        </>
      )}

      {/* 3. S-AR PUTEA SĂ-ȚI PLACĂ (Related Flagship Models) */}
      {relatedProducts && relatedProducts.length > 0 && (
        <>
          <div className="relative z-10 container mx-auto px-4 pt-12 pb-6">
            <YouMayAlsoLike products={relatedProducts} locale={locale} />
          </div>
          <div className="trenzone-luminous-divider" />
        </>
      )}

      {/* 4. REVIEWS SECTION */}
      <div className="relative z-10 container mx-auto px-4 pb-20 pt-6">
        <StaticReviewSection product={product} faqItems={productFaqItems} initialReviews={initialReviews} />
      </div>
    </div>

  );
}
