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
import { getPublicInfluencers, getDigitalProgramsVideoConfig } from "@/app/actions/products";
import { getAllReviewsServer } from "@/app/actions/public-reviews";
import { formatPublicReviews } from "@/lib/utils/reviews";
import { generateProductSchema, generateBreadcrumbSchema, generateFAQSchema } from "@/lib/schema";
import { getSiteUrl } from "@/lib/site-config";
import { isDigitalProgramItem } from "@/lib/programs";
import { resolveProgramDetailForProduct } from "@/lib/program-details";
import { ProgramDetailsSection } from "@/components/programs/ProgramDetailsSection";
import { getResolvedProductFaqs, filterInfluencersForProduct } from "@/lib/product-features";

export const revalidate = 2592000; // Cache product page for 30 days — admin actions & "Șterge Cache" trigger on-demand revalidation

const BASE_URL = getSiteUrl();

export async function generateMetadata({ params }: { params: Promise<{ locale: string, slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Produs Necunoscut" };

  const name = typeof product.name === 'object' ? product.name[locale] || product.name['ro'] : product.name;
  
  // SEO: Prioritize DB Meta Title/Description (multilingual)
  const dbMetaTitle = (product.meta_title && typeof product.meta_title === 'object') ? (product.meta_title as any)[locale] : product.meta_title;
  const dbMetaDesc = (product.meta_description && typeof product.meta_description === 'object') ? (product.meta_description as any)[locale] : product.meta_description;

  const isElbowWrap = slug.includes('elbow');
  const fallbackTitle = locale === 'ro'
    ? `${name} | ${isElbowWrap ? 'Benzi de Cot Heavy-Duty TrenZone®' : 'Echipament Oficial TrenZone®'} by Vlad Tren`
    : `${name} | ${isElbowWrap ? 'Heavy-Duty Elbow Wraps TrenZone®' : 'Official TrenZone® Gear'} by Vlad Tren`;
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
      "product:availability":
        Boolean((product as any).metadata?.soft_stock_tracking) || product.stock_quantity > 0
          ? "in stock"
          : "out of stock",
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
  const [product, stats, t, tShop, allProducts, influencers, rawReviews, digitalVideoConfig] = await Promise.all([
    getProductBySlug(slug),
    getPublicReviewsStats(),
    getTranslations("Product"),
    getTranslations("Shop"),
    getProducts(),
    getPublicInfluencers(),
    getAllReviewsServer(),
    getDigitalProgramsVideoConfig()
  ]);
  const initialReviews = formatPublicReviews(rawReviews, 40, locale);

  if (!product) {
    redirect(`/${locale}/shop`);
  }

  const name = typeof product.name === 'object' ? product.name[locale] || product.name['ro'] : product.name;
  const numericPrice = getProductPrice(product.price, locale === 'ro' ? 'RON' : 'EUR');
  // Separate recommendations: physical equipment vs digital programs
  const isCurrentDigital = isDigitalProgramItem(product);
  const priceKey = locale === 'ro' ? 'RON' : 'EUR';
  const equipmentRelated = allProducts
    .filter((p) => p.slug !== product!.slug && p.is_active !== false && !isDigitalProgramItem(p))
    .sort((a, b) => getProductPrice(b.price, priceKey) - getProductPrice(a.price, priceKey));
  const programRelated = allProducts
    .filter((p) => p.slug !== product!.slug && p.is_active !== false && isDigitalProgramItem(p))
    .sort((a, b) => getProductPrice(b.price, priceKey) - getProductPrice(a.price, priceKey));
  
  // Rich JSON-LD for Google: Product + BreadcrumbList + FAQPage
  const currency = locale === 'ro' ? 'RON' : 'EUR';
  const jsonLd = generateProductSchema(product, currency, locale, stats, initialReviews);

  const breadcrumbJsonLd = generateBreadcrumbSchema([
    { name: 'TrenZone', url: BASE_URL },
    { name: locale === 'ro' ? 'Shop' : 'Shop', url: `${BASE_URL}/${locale}/shop` },
    { name: typeof product.name === 'object' ? product.name[locale] || product.name['ro'] : product.name, url: `${BASE_URL}/${locale}/product/${slug}` }
  ]);

  // Product-specific FAQs (reads custom Admin FAQs or infers accurately per product type)
  const productFaqItems = getResolvedProductFaqs(product, locale);
  const productFaqJsonLd = generateFAQSchema(productFaqItems);

  // Filter influencer video clips dynamically per product / digital program settings
  const filteredMedia = filterInfluencersForProduct(influencers, product, digitalVideoConfig);
  const sectionVideos = filteredMedia.videos;
  const videoTitle = locale === 'en' ? filteredMedia.titleEn : filteredMedia.titleRo;
  const videoSubtitle = locale === 'en' ? filteredMedia.subtitleEn : filteredMedia.subtitleRo;
  const programDetail = isCurrentDigital ? resolveProgramDetailForProduct(product) : null;


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

      {/* 1.5 Digital Program Rich Breakdown (Chapters, Target Audience & Structure) */}
      {programDetail && (
        <>
          <div className="trenzone-luminous-divider" />
          <ProgramDetailsSection detail={programDetail} locale={locale} />
        </>
      )}

      <div className="trenzone-luminous-divider" />

      {/* 2. RECOMANDAT DE ATLEȚI — Community Carousel */}
      {sectionVideos && sectionVideos.length > 0 && (
        <>
          <div className="relative z-10 pt-2 pb-8 md:pt-4 md:pb-12">
            <div className="container mx-auto px-4">
              <InfluencerCarousel
                influencers={sectionVideos}
                dark={true}
                title={videoTitle}
                subtitle={videoSubtitle}
              />
            </div>
          </div>
          <div className="trenzone-luminous-divider" />
        </>
      )}

      {/* 3. S-AR PUTEA SĂ-ȚI PLACĂ (2 separate sections: Equipment + Programs) */}
      {(equipmentRelated.length > 0 || programRelated.length > 0) && (
        <>
          <div className="relative z-10 container mx-auto px-4 pt-12 pb-6">
            <YouMayAlsoLike
              equipmentProducts={equipmentRelated}
              programProducts={programRelated}
              locale={locale}
              preferProgramsFirst={isCurrentDigital}
            />
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
