import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Image Optimization — Bypass Vercel's 1,000 image Hobby limit & serve direct WebP URLs so Cloudflare Edge caches 100% of images for free
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'walfsewxhsjnfjfvxymi.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.r2.dev',
      },
      {
        protocol: 'https',
        hostname: 'cdn.trenzone.fit',
      },
      // CDN or R2 domain (e.g. cdn.trenzone.fit or pub-xxx.r2.dev) — if configured
      ...((process.env.NEXT_PUBLIC_CDN_URL || process.env.NEXT_PUBLIC_R2_URL || process.env.R2_PUBLIC_URL) ? (() => {
        try {
          const rawCdn = (process.env.NEXT_PUBLIC_CDN_URL || process.env.NEXT_PUBLIC_R2_URL || process.env.R2_PUBLIC_URL || '').trim();
          const urlObj = new URL(rawCdn.startsWith('http') ? rawCdn : `https://${rawCdn}`);
          return [{ protocol: 'https' as const, hostname: urlObj.hostname }];
        } catch {
          return [];
        }
      })() : []),
    ],
    // Responsive image sizes
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Format support - WebP, AVIF for better compression
    formats: ['image/avif', 'image/webp'],
    // Added qualities to fix warnings
    qualities: [25, 50, 75, 80, 100],
    // Cache versioned assets for 1 year
    minimumCacheTTL: 31536000,
  },

  // Performance & Security
  compress: true,
  poweredByHeader: false, // Hide "X-Powered-By: Next.js"
  
  // Server Actions configuration
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb',
      allowedOrigins: ['localhost:3000', '127.0.0.1:3000', 'localhost:3001', 'trenzone.fit', 'www.trenzone.fit', '192.168.1.166:3000'],
    }
  },

  // Rewrites for Supabase Proxy (Cached by Cloudflare)
  async rewrites() {
    return [
      {
        source: '/supabase-proxy/:path*',
        destination: 'https://walfsewxhsjnfjfvxymi.supabase.co/storage/v1/object/public/:path*',
      },
    ];
  },

  // Security Headers
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Prevent clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Enable XSS protection
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Referrer policy
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Permissions policy - restrict sensitive features
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
          // Content Security Policy to protect against XSS and injection
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://maps.googleapis.com https://www.googletagmanager.com https://widget.packeta.com https://cdn.sameday.ro https://static.cloudflareinsights.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.sameday.ro",
              "img-src 'self' blob: data: https://*.supabase.co https://walfsewxhsjnfjfvxymi.supabase.co https://*.r2.dev https://*.r2.cloudflarestorage.com https://images.unsplash.com https://cdn.trenzone.fit https://maps.gstatic.com https://maps.googleapis.com https://*.stripe.com https://flagcdn.com https://cdn.sameday.ro https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com",
              "media-src 'self' blob: https://*.supabase.co https://walfsewxhsjnfjfvxymi.supabase.co https://*.r2.dev https://*.r2.cloudflarestorage.com https://cdn.trenzone.fit",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' https://*.supabase.co https://walfsewxhsjnfjfvxymi.supabase.co https://*.r2.dev https://*.r2.cloudflarestorage.com https://cdn.trenzone.fit https://api.stripe.com https://maps.googleapis.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://ipapi.co https://www.zasilkovna.cz https://cdn.sameday.ro https://lockerplugin.sameday.ro https://cloudflareinsights.com",
              "frame-src 'self' https://js.stripe.com https://lockerplugin.sameday.ro",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
          // Force HTTPS (only for production)
          ...(process.env.NODE_ENV === 'production'
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=31536000; includeSubDomains',
                },
              ]
            : []),
        ],
      },
      // Performance caching headers for Cloudflare CDN + Browser
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, s-maxage=31536000, immutable',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/videos/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/supabase-proxy/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
