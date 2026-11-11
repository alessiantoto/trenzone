import { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { getProducts } from '@/lib/api';

const BASE_URL = "https://www.trenzone.fit";

export const revalidate = 86400;

// All 25 countries we ship to — used for hreflang alternates
const SHIPPING_COUNTRY_LOCALES: Record<string, string> = {
  RO: 'ro', HU: 'en', BG: 'en', CZ: 'en', SK: 'en', PL: 'en',
  DE: 'en', AT: 'en', IT: 'en', FR: 'en', GR: 'en', BE: 'en',
  NL: 'en', HR: 'en', SI: 'en', ES: 'en', PT: 'en', GB: 'en',
  SE: 'en', FI: 'en', EE: 'en', LV: 'en', LT: 'en', LU: 'en', CY: 'en'
};

function getHreflangAlternates(path: string): Record<string, string> {
  const alternates: Record<string, string> = {
    'ro': `${BASE_URL}/ro${path}`,
    'ro-RO': `${BASE_URL}/ro${path}`,
    'en': `${BASE_URL}/en${path}`,
    'x-default': `${BASE_URL}/ro${path}`
  };

  for (const [country, l] of Object.entries(SHIPPING_COUNTRY_LOCALES)) {
    if (l !== 'ro') {
      alternates[`en-${country}`] = `${BASE_URL}/en${path}`;
    }
  }

  return alternates;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const locales = routing.locales;

  // Static routes — exclude checkout and order-success (not indexable)
  const staticRoutes = [
    { path: '', changeFrequency: 'daily' as const, priority: 1.0 },
    { path: '/shop', changeFrequency: 'daily' as const, priority: 0.95 },
    { path: '/contact', changeFrequency: 'monthly' as const, priority: 0.6 },
    { path: '/politica-de-confidentialitate', changeFrequency: 'yearly' as const, priority: 0.3 },
    { path: '/politica-de-retur', changeFrequency: 'yearly' as const, priority: 0.5 },
    { path: '/termeni-si-conditii', changeFrequency: 'yearly' as const, priority: 0.3 },
  ];

  const entries: MetadataRoute.Sitemap = [];

  // Add static routes for each locale with alternateRefs for all 25 countries
  for (const locale of locales) {
    for (const route of staticRoutes) {
      const url = `${BASE_URL}/${locale}${route.path}`;

      entries.push({
        url,
        lastModified: new Date(),
        changeFrequency: route.changeFrequency,
        priority: route.priority,
        alternates: {
          languages: getHreflangAlternates(route.path)
        }
      });
    }
  }

  // Dynamically add all active products (highest priority after homepage)
  try {
    const products = await getProducts();
    const activeProducts = products.filter(p => p.is_active);

    for (const locale of locales) {
      for (const product of activeProducts) {
        const productUrl = `${BASE_URL}/${locale}/product/${product.slug}`;

        // Products are the core conversion pages — give them high priority
        entries.push({
          url: productUrl,
          lastModified: new Date(),
          changeFrequency: 'weekly' as const,
          priority: locale === 'ro' ? 0.98 : 0.92, // RO primary market, EN secondary
          alternates: {
            languages: getHreflangAlternates(`/product/${product.slug}`)
          }
        });
      }
    }

    console.log(`✅ Sitemap generated: ${entries.length} entries (${activeProducts.length} products × ${locales.length} locales + static)`);
  } catch (error) {
    console.error('Failed to fetch products for sitemap:', error);
    // Fallback: Return static entries only
  }

  return entries;
}
