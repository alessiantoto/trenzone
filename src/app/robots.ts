import { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site-config';

const BASE_URL = getSiteUrl();

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
          '/*/checkout/success',
          '/*/order-success',
          '/*/order-confirmation',
          '/*/affiliate/dashboard',
          '/*/affiliate/login',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
