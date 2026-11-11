import type { Metadata } from "next";
import "../globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { ReactNode, Suspense } from "react";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { StoreTracker } from "@/components/analytics/StoreTracker";
import NextTopLoader from 'nextjs-toploader';
import { Inter, Oswald } from "next/font/google";

// Performance Optimization: Deferring client-only widgets
import { ClientSideWidgets } from "@/components/layout/ClientSideWidgets";
import { DeferredOverlay } from "@/components/performance/DeferredOverlay";
import { cookies } from 'next/headers';
import { MaintenanceView } from '@/components/layout/MaintenanceView';
import { getGlobalSettings, hasValidMaintenanceBypass } from '@/app/actions/admin-settings';

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const BASE_URL = "https://www.trenzone.fit";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "TrenZone® | Heavy-Duty X10 & X5 Elbow Wraps",
    template: "%s | TrenZone®"
  },
  description: "Built for Strength. Designed for Performance. Benzi de cot profesionale pentru împins la piept și powerlifting extrem. Până la +20 kg transfer de forță.",
  keywords: [
    "benzi de cot", "elbow wraps", "trenzone", "x10 elbow wraps", "x5 elbow wraps",
    "powerlifting gear", "bench press wraps", "suport coate sala", "protectie articulatii",
    "heavy duty wraps", "lifting wraps", "benzi compresie cot"
  ],
  authors: [{ name: "TrenZone LLC", url: BASE_URL }],
  creator: "TrenZone LLC",
  publisher: "TrenZone LLC",
  category: "Strength Equipment & Powerlifting",
  classification: "Health & Fitness / Strength Equipment",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: BASE_URL,
    languages: {
      "ro": `${BASE_URL}/ro`,
      "ro-RO": `${BASE_URL}/ro`,
      "en": `${BASE_URL}/en`,
      "en-US": `${BASE_URL}/en`,
      "en-GB": `${BASE_URL}/en`,
      "en-DE": `${BASE_URL}/en`,
      "en-FR": `${BASE_URL}/en`,
      "en-IT": `${BASE_URL}/en`,
      "en-ES": `${BASE_URL}/en`,
      "en-PL": `${BASE_URL}/en`,
      "en-NL": `${BASE_URL}/en`,
      "en-BE": `${BASE_URL}/en`,
      "en-AT": `${BASE_URL}/en`,
      "en-HU": `${BASE_URL}/en`,
      "en-BG": `${BASE_URL}/en`,
      "en-CZ": `${BASE_URL}/en`,
      "en-SK": `${BASE_URL}/en`,
      "en-HR": `${BASE_URL}/en`,
      "en-SI": `${BASE_URL}/en`,
      "en-GR": `${BASE_URL}/en`,
      "en-PT": `${BASE_URL}/en`,
      "en-SE": `${BASE_URL}/en`,
      "en-FI": `${BASE_URL}/en`,
      "en-EE": `${BASE_URL}/en`,
      "en-LV": `${BASE_URL}/en`,
      "en-LT": `${BASE_URL}/en`,
      "en-LU": `${BASE_URL}/en`,
      "en-CY": `${BASE_URL}/en`,
      "x-default": `${BASE_URL}/en`,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", type: "image/png" },
      { url: "/icon", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png" }],
    shortcut: ["/favicon.ico"],
  },
  openGraph: {
    type: "website",
    locale: "ro_RO",
    alternateLocale: ["en_US", "hu_HU", "de_DE", "fr_FR", "it_IT", "es_ES", "pl_PL", "nl_NL", "bg_BG", "cs_CZ", "el_GR", "pt_PT", "sv_SE"],
    url: BASE_URL,
    siteName: "TrenZone®",
    title: "TREN WRAPS by Vlad Tren | Benzi de Cot Heavy-Duty TrenZone®",
    description: "Built for Strength. Designed for Performance. Benzi de cot profesionale pentru powerlifting și greutăți mari. Compresie rigidă, stabilitate totală sub bară și până la +20 kg pe bench press.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "TREN WRAPS by Vlad Tren | Heavy-Duty Elbow Wraps TrenZone®",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TREN WRAPS by Vlad Tren | Benzi de Cot Heavy-Duty TrenZone®",
    description: "Benzi de cot profesionale pentru powerlifting și greutăți mari. Compresie rigidă, stabilitate mecanică și până la +20 kg asistență pe bench press.",
    images: ["/og-image.png"],
    creator: "@trenzone",
    site: "@trenzone",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // Add Google Search Console verification if you have it
    // google: "your-google-verification-code",
  },
  other: {
    "og:price:amount": "129.90",
    "og:price:currency": "RON",
    "product:condition": "new",
    "product:availability": "in stock",
    "product:brand": "TrenZone",
  }
};

// ✅ ENABLE STATIC GENERATION: Cache layout for 30 days (purged on-demand via Admin "Șterge Cache" button)
export const revalidate = 2592000;

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;

  // Validate that the incoming `locale` is supported
  if (!locale || !routing.locales.includes(locale as any)) {
    notFound();
  }

  // Enable static rendering for next-intl
  await setRequestLocale(locale);

  // Receiving messages provided in `i18n/request.ts`
  let messages;
  try {
    const rawMessages = await getMessages({ locale });
    // 🛡️ CRITICAL FIX: If getMessages accidentally returns an object indexed by locale {en: ..., ro: ...}
    // we extract only the messages for the current locale to prevent React child errors.
    if (rawMessages && typeof rawMessages === 'object') {
      if (locale in rawMessages) {
        messages = (rawMessages as any)[locale];
      } else {
        // If it's not a locale-indexed object, use it directly
        messages = rawMessages;
      }
    } else {
      messages = {};
    }
  } catch (error: any) {
    if (error?.digest === 'DYNAMIC_SERVER_USAGE') {
      throw error;
    }
    console.error("❌ Failed to load messages:", error);
    messages = {};
  }

  const gaId = process.env.NEXT_PUBLIC_GA_ID || "";
  const enableStoreTracker =
    process.env.ENABLE_REDIS_ANALYTICS === "true" &&
    Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
  
  // Check maintenance mode via cached settings
  // Only invoke dynamic cookies() if maintenance mode is actually turned on.
  // This allows Vercel Edge CDN to cache all storefront pages when the store is open!
  const { maintenance_mode: IS_MAINTENANCE_MODE, maintenance_end_date: MAINTENANCE_END_DATE } = await getGlobalSettings();

  if (IS_MAINTENANCE_MODE) {
    const hasBypassCookie = await hasValidMaintenanceBypass();

    if (!hasBypassCookie) {
      return (
        <html lang={locale} className={`${inter.variable} ${oswald.variable} h-full antialiased dark`} data-scroll-behavior="smooth" suppressHydrationWarning>
          <head>
            <title>TrenZone | Dropping Soon</title>
            <meta name="description" content="Magazinul TrenZone se pregătește pentru noul drop hardcore. Revenim în curând!" />
            <meta name="robots" content="noindex, nofollow" />
            <link rel="icon" href="/favicon.ico" sizes="any" />
            <link rel="icon" type="image/png" href="/favicon.png" />
            <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
          </head>
          <body className="min-h-full flex flex-col font-sans bg-black text-white selection:bg-[#e32f8c] selection:text-white">
            <MaintenanceView endDate={MAINTENANCE_END_DATE} locale={locale} />
          </body>
        </html>
      );
    }
  }

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${oswald.variable} dark h-full antialiased`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {/* Organization Schema — TrenZone */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "TrenZone",
              "alternateName": "TrenZone®",
              "url": "https://www.trenzone.fit",
              "logo": {
                "@type": "ImageObject",
                "url": "https://www.trenzone.fit/images/logos/trenzone_logo.webp",
                "width": 512,
                "height": 512
              },
              "image": "https://www.trenzone.fit/og-image.png",
              "description": locale === 'ro'
                ? "TrenZone este brandul oficial de echipamente de forță și benzi de cot heavy-duty fondat de Vlad Tren. Echipament de elită pentru powerlifting și culturism."
                : "TrenZone is the official heavy-duty strength equipment and elbow wraps brand founded by Vlad Tren. Elite gear for powerlifting and bodybuilding.",
              "foundingDate": "2026",
              "areaServed": [
                "RO","HU","BG","CZ","SK","PL","DE","AT","IT","FR",
                "GR","BE","NL","HR","SI","ES","PT","GB","SE","FI",
                "EE","LV","LT","LU","CY"
              ],
              "sameAs": [
                "https://www.instagram.com/trenzone",
                "https://www.facebook.com/trenzone",
                "https://www.tiktok.com/@trenzone"
              ],
              "contactPoint": {
                "@type": "ContactPoint",
                "contactType": "Customer Service",
                "availableLanguage": ["Romanian", "English"],
                "email": "trenzone483@gmail.com"
              }
            })
          }}
        />
        {/* WebSite Schema with SearchAction */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "TrenZone",
              "alternateName": "TrenZone® | Benzi de Cot Heavy-Duty",
              "url": "https://www.trenzone.fit",
              "inLanguage": ["ro", "en"],
              "potentialAction": {
                "@type": "SearchAction",
                "target": {
                  "@type": "EntryPoint",
                  "urlTemplate": `https://www.trenzone.fit/${locale}/shop?q={search_term_string}`
                },
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans selection:bg-[#e32f8c] selection:text-black bg-[#030305] text-white">
        <NextTopLoader
          color="#e32f8c"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 15px #e32f8c,0 0 5px #e32f8c"
          zIndex={1600}
        />
        <NextIntlClientProvider messages={messages} locale={locale}>
          {gaId && <link rel="preconnect" href="https://www.google-analytics.com" crossOrigin="anonymous" />}

          <GoogleAnalytics gaId={gaId} />
          <StoreTracker enabled={enableStoreTracker} />

          <Navbar />
          <main className="flex-1 overflow-x-hidden">
            {children}
          </main>
          <ClientSideWidgets isMaintenanceMode={IS_MAINTENANCE_MODE} />

        </NextIntlClientProvider>
      </body>
    </html>
  );
}
