import { MetadataRoute } from 'next';

const BASE_URL = "https://www.trenzone.fit";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Allow all major search engine crawlers + Googlebot-Image for rich product images
        userAgent: ['Googlebot', 'Googlebot-Image', 'Bingbot', 'Yandexbot', 'DuckDuckBot', '*'],
        allow: ['/', '/api/feeds/'],
        disallow: [
          '/admin',
          '/api/',
          '/*/checkout',
          '/*/order-success',
          '/*/order-confirmation',
          '/afiliati',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
