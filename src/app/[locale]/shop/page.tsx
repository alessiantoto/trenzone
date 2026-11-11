import { getProductsServer } from "@/app/actions/products";
import { getPublicReviewsStats } from "@/app/actions/admin-reviews";
import { ShopProductGrid } from "@/components/shop/ShopProductGrid";
import { StarRating } from "@/components/ui/StarRating";
import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Metadata } from "next";
import { generateProductListSchema, generateBreadcrumbSchema } from "@/lib/schema";
import { getCdnUrl } from "@/lib/utils/cdn";

export const revalidate = 2592000; // Cache page for 30 days — admin actions & "Șterge Cache" trigger on-demand revalidation

const BASE_URL = "https://www.trenzone.fit";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const isRo = locale !== 'en';

  const title = isRo
    ? "Magazin Oficial TRENZONE® | Benzi de Cot Heavy-Duty by Vlad Tren"
    : "Official TRENZONE® Store | Heavy-Duty Elbow Wraps by Vlad Tren";

  const description = isRo
    ? "Benzi de cot profesionale pentru împins la piept, protecție articulară și PR-uri mari. Modelele X10 și X5 cu densitate militară multi-strat."
    : "Competition-grade elbow wraps engineered for maximum bench press rebound, tendon stability, and elite loads. Shop X10 and X5 models.";

  const canonicalUrl = `${BASE_URL}/${locale}/shop`;

  return {
    title,
    description,
    keywords: isRo
      ? ["magazin benzi de cot", "cumpara elbow wraps", "trenzone shop", "benzi powerlifting", "echipament sala vlad tren", "benzi coate impins"]
      : ["buy elbow wraps", "heavy duty wraps store", "bench press wraps", "trenzone gear shop", "powerlifting store"],
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "ro": `${BASE_URL}/ro/shop`,
        "en": `${BASE_URL}/en/shop`,
        "x-default": `${BASE_URL}/ro/shop`
      }
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "TrenZone®",
      type: "website",
      locale: isRo ? "ro_RO" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    }
  };
}

export default async function ShopPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isRo = locale !== 'en';

  const [products, reviewStats, t] = await Promise.all([
    getProductsServer(),
    getPublicReviewsStats(),
    getTranslations("Shop")
  ]);

  const productListSchema = generateProductListSchema(products, locale);
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: isRo ? "Acasă" : "Home", url: `${BASE_URL}/${locale}` },
    { name: isRo ? "Magazin" : "Shop", url: `${BASE_URL}/${locale}/shop` }
  ]);

  return (
    <div className="relative flex flex-col w-full overflow-hidden bg-[#0d0e12] text-white selection:bg-[#e32f8c] selection:text-black">
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productListSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {/* 🏋️ HARDCORE CHALK & RAW CONCRETE TEXTURE (NO CARTOONS/PEOPLE) */}
      <div
        className="absolute inset-0 pointer-events-none z-0 opacity-25 mix-blend-screen"
        style={{
          backgroundImage: `url('${getCdnUrl('/images/ui/dark-chalk-concrete.jpg')}')`,
          backgroundSize: "650px",
          backgroundRepeat: "repeat",
          backgroundPosition: "top center",
        }}
      />

      {/* Subtle Dark Ambient Power Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[350px] bg-[#e32f8c]/10 blur-[150px] rounded-full pointer-events-none z-0" />
      <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-purple-950/20 blur-[170px] rounded-full pointer-events-none z-0" />

      {/* ═══ Clean Hardcore Header ═══ */}
      <section className="relative z-10 bg-transparent border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 md:pt-10 pb-4 md:pb-8">
          <nav className="flex items-center gap-2 text-xs md:text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4 font-[family-name:var(--font-oswald)]">
            <Link href="/" className="hover:text-white transition-colors">
              {t("breadcrumb_home")}
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
            <span className="text-[#e32f8c]">{t("breadcrumb_shop")}</span>
          </nav>
          
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-heading font-black uppercase tracking-tight text-white leading-tight">
                {t("title")}
              </h1>
            </div>

            {reviewStats.count > 0 && (
              <div className="flex flex-col items-end gap-1.5 pb-1">
                <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  {t("reviews_count", { count: reviewStats.count })}
                </span>
                <div className="flex items-center gap-1.5 bg-zinc-900/90 border border-white/10 px-3 py-1.5 rounded-full backdrop-blur-md shadow-lg">
                  <StarRating
                    rating={reviewStats.average}
                    starClassName="!text-[#ffb800] !fill-[#ffb800] w-3.5 h-3.5"
                  />
                  <span className="text-xs font-black text-white font-[family-name:var(--font-oswald)]">
                    {reviewStats.average}/5
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══ Products Grid ═══ */}
      <div className="relative z-10 bg-transparent overflow-hidden pb-8 sm:pb-12 md:pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 sm:pt-7 md:pt-10 relative z-10">
          <ShopProductGrid products={products} dark={true} />
        </div>
      </div>
    </div>
  );
}
