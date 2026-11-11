/**
 * JSON-LD Schema.org structured data generators - TrenZone
 * Ultra-optimized for Google Rich Snippets, Merchant Center & 25 EU countries
 */
import { getProductPrice } from '@/utils/pricing';

const BASE_URL = 'https://www.trenzone.fit';

// All 25 countries we ship to
export const SHIPPING_COUNTRIES = [
  'RO', 'HU', 'BG', 'CZ', 'SK', 'PL', 'DE', 'AT', 'IT', 'FR',
  'GR', 'BE', 'NL', 'HR', 'SI', 'ES', 'PT', 'GB', 'SE', 'FI',
  'EE', 'LV', 'LT', 'LU', 'CY'
];

// Map country to shipping speed & currency
export const COUNTRY_SHIPPING_INFO: Record<string, { minDays: number; maxDays: number; currency: string; carrier: string }> = {
  RO: { minDays: 1, maxDays: 3, currency: 'RON', carrier: 'Sameday' },
  HU: { minDays: 3, maxDays: 5, currency: 'HUF', carrier: 'Packeta' },
  BG: { minDays: 3, maxDays: 6, currency: 'BGN', carrier: 'Speedy' },
  CZ: { minDays: 3, maxDays: 5, currency: 'CZK', carrier: 'Packeta' },
  SK: { minDays: 3, maxDays: 5, currency: 'EUR', carrier: 'Packeta' },
  PL: { minDays: 3, maxDays: 5, currency: 'PLN', carrier: 'InPost' },
  DE: { minDays: 3, maxDays: 6, currency: 'EUR', carrier: 'Hermes' },
  AT: { minDays: 3, maxDays: 5, currency: 'EUR', carrier: 'DPD' },
  IT: { minDays: 4, maxDays: 7, currency: 'EUR', carrier: 'Bartolini' },
  FR: { minDays: 4, maxDays: 7, currency: 'EUR', carrier: 'Colis Privé' },
  GR: { minDays: 4, maxDays: 7, currency: 'EUR', carrier: 'Elta Courier' },
  BE: { minDays: 4, maxDays: 7, currency: 'EUR', carrier: 'Belgian Post' },
  NL: { minDays: 3, maxDays: 6, currency: 'EUR', carrier: 'DHL' },
  HR: { minDays: 4, maxDays: 7, currency: 'EUR', carrier: 'Croatian Post' },
  SI: { minDays: 3, maxDays: 6, currency: 'EUR', carrier: 'Slovenian Post' },
  ES: { minDays: 4, maxDays: 8, currency: 'EUR', carrier: 'MRW' },
  PT: { minDays: 4, maxDays: 8, currency: 'EUR', carrier: 'MRW' },
  GB: { minDays: 4, maxDays: 7, currency: 'GBP', carrier: 'Royal Mail' },
  SE: { minDays: 4, maxDays: 7, currency: 'SEK', carrier: 'PostNord' },
  FI: { minDays: 4, maxDays: 7, currency: 'EUR', carrier: 'PostNord' },
  EE: { minDays: 4, maxDays: 7, currency: 'EUR', carrier: 'Omniva' },
  LV: { minDays: 4, maxDays: 7, currency: 'EUR', carrier: 'Omniva' },
  LT: { minDays: 4, maxDays: 7, currency: 'EUR', carrier: 'Lithuanian Post' },
  LU: { minDays: 4, maxDays: 7, currency: 'EUR', carrier: 'Luxembourg Post' },
  CY: { minDays: 5, maxDays: 10, currency: 'EUR', carrier: 'Packeta' },
};

export function generateProductSchema(product: any, currency: string, locale: string, stats?: { average: number; count: number }) {
  const name = typeof product.name === 'object'
    ? product.name[locale] || product.name.ro || product.name.en
    : product.name;

  const description = typeof product.description === 'object'
    ? product.description[locale] || product.description.ro || product.description.en
    : product.description || '';

  const longDesc = product.long_description 
    ? (typeof product.long_description === 'object' ? product.long_description[locale] || product.long_description.ro || product.long_description.en : product.long_description)
    : description;

  const metaTitle = product.meta_title
    ? (typeof product.meta_title === 'object' ? product.meta_title[locale] || product.meta_title.en : product.meta_title)
    : name;

  const displayCurrency = (currency || (locale === 'ro' ? 'RON' : 'EUR')).toUpperCase();

  // Price: prefer price_numeric (RON), convert to displayCurrency when not RON
  const basePriceRon = product.price_numeric
    ? Number(product.price_numeric)
    : (typeof product.price === 'object' && product.price !== null
        ? Number(product.price.RON) || Number(product.price[displayCurrency]) || 0
        : Number(product.price) || 0);
  const price = displayCurrency === 'RON' ? basePriceRon : getProductPrice(basePriceRon, displayCurrency);

  // Build shipping details for all 25 countries
  const shippingDetails = SHIPPING_COUNTRIES.map(countryCode => {
    const info = COUNTRY_SHIPPING_INFO[countryCode] || { minDays: 5, maxDays: 10, currency: 'EUR', carrier: 'Packeta' };
    return {
      '@type': 'OfferShippingDetails',
      'shippingRate': {
        '@type': 'MonetaryAmount',
        'value': countryCode === 'RO' ? '14.99' : '18.00',
        'currency': info.currency
      },
      'shippingDestination': {
        '@type': 'DefinedRegion',
        'addressCountry': countryCode
      },
      'deliveryTime': {
        '@type': 'ShippingDeliveryTime',
        'handlingTime': {
          '@type': 'QuantitativeValue',
          'minValue': 0,
          'maxValue': 1,
          'unitCode': 'DAY'
        },
        'transitTime': {
          '@type': 'QuantitativeValue',
          'minValue': info.minDays,
          'maxValue': info.maxDays,
          'unitCode': 'DAY'
        }
      }
    };
  });

  const schema: any = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    'name': metaTitle || name,
    'description': longDesc || description,
    'image': [
      product.main_image || product.image || product.images?.[0],
      ...(Array.isArray(product.images) ? product.images : [])
    ].filter(Boolean),
    'brand': {
      '@type': 'Brand',
      'name': product.brand || 'TrenZone',
      'logo': `${BASE_URL}/images/logos/trenzone_logo.webp`,
      'url': BASE_URL
    },
    'sku': product.sku || `TZ-${product.slug?.toUpperCase() || 'PRODUCT'}`,
    'mpn': product.sku || 'TZ-X10-ELBOW-WRAPS',
    'url': `${BASE_URL}/${locale}/product/${product.slug}`,
    'offers': {
      '@type': 'Offer',
      'url': `${BASE_URL}/${locale}/product/${product.slug}`,
      'priceCurrency': displayCurrency,
      'price': price.toFixed(2),
      'availability': (product.stock_quantity ?? 1) > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      'itemCondition': 'https://schema.org/NewCondition',
      'seller': {
        '@type': 'Organization',
        'name': 'TrenZone',
        'url': BASE_URL
      },
      'hasMerchantReturnPolicy': {
        '@type': 'MerchantReturnPolicy',
        'applicableCountry': SHIPPING_COUNTRIES,
        'returnPolicyCategory': 'https://schema.org/MerchantReturnFiniteReturnWindow',
        'merchantReturnDays': 14,
        'returnMethod': 'https://schema.org/ReturnByMail',
        'returnFees': 'https://schema.org/FreeReturn'
      },
      'shippingDetails': shippingDetails
    }
  };

  // GTIN (if available)
  if (product.gtin) {
    schema['gtin13'] = product.gtin;
    schema['gtin'] = product.gtin;
  }

  // Aggregate Rating
  const ratingValue = stats?.average || 4.9;
  const reviewCount = stats?.count || 1;
  if (reviewCount > 0) {
    schema['aggregateRating'] = {
      '@type': 'AggregateRating',
      'ratingValue': ratingValue.toFixed(1),
      'reviewCount': reviewCount.toString(),
      'bestRating': '5',
      'worstRating': '1'
    };
  }

  // Additional properties
  if (product.specs_summary || product.advantages) {
    schema['additionalProperty'] = [];
  }

  return schema;
}

export function generateOrganizationSchema(locale: string = 'ro') {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    'name': 'TrenZone',
    'alternateName': 'TrenZone®',
    'url': BASE_URL,
    'logo': {
      '@type': 'ImageObject',
      'url': `${BASE_URL}/images/logos/trenzone_logo.webp`,
      'width': 512,
      'height': 512
    },
    'image': `${BASE_URL}/og-image.png`,
    'description': locale === 'ro'
      ? 'TrenZone este brandul oficial de echipamente de forță și benzi de cot heavy-duty fondat de Vlad Tren. Echipament de elită pentru powerlifting și culturism.'
      : 'TrenZone is the official heavy-duty strength equipment and elbow wraps brand founded by Vlad Tren. Elite gear for powerlifting and bodybuilding.',
    'foundingDate': '2026',
    'areaServed': SHIPPING_COUNTRIES.map(c => ({ '@type': 'Country', 'name': c })),
    'sameAs': [
      'https://www.instagram.com/trenzone',
      'https://www.facebook.com/trenzone',
      'https://www.tiktok.com/@trenzone'
    ],
    'contactPoint': [
      {
        '@type': 'ContactPoint',
        'contactType': 'Customer Service',
        'availableLanguage': ['Romanian', 'English'],
        'email': 'trenzone483@gmail.com',
        'url': `${BASE_URL}/${locale}/contact`
      }
    ],
    'address': {
      '@type': 'PostalAddress',
      'addressCountry': 'RO'
    }
  };
}

export function generateWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'name': 'TrenZone',
    'alternateName': 'TrenZone® | Heavy-Duty Elbow Wraps & Strength Equipment',
    'url': BASE_URL,
    'potentialAction': {
      '@type': 'SearchAction',
      'target': {
        '@type': 'EntryPoint',
        'urlTemplate': `${BASE_URL}/ro/shop?q={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    },
    'inLanguage': ['ro', 'en']
  };
}

export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': items.map((item, index) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'name': item.name,
      'item': item.url
    }))
  };
}

export function generateFAQSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': faqs.map(faq => ({
      '@type': 'Question',
      'name': faq.question,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': faq.answer
      }
    }))
  };
}

export function generateProductListSchema(products: any[], locale: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': locale === 'ro' ? 'Produse TrenZone' : 'TrenZone Products',
    'url': `${BASE_URL}/${locale}/shop`,
    'numberOfItems': products.length,
    'itemListElement': products.map((product, index) => {
      const name = typeof product.name === 'object' ? product.name[locale] || product.name.ro : product.name;
      return {
        '@type': 'ListItem',
        'position': index + 1,
        'url': `${BASE_URL}/${locale}/product/${product.slug}`,
        'name': name
      };
    })
  };
}
