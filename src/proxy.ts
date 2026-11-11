import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { createServerClient } from "@supabase/ssr"

const intlMiddleware = createMiddleware(routing);

/**
 * 🛡️ ELITE MIDDLEWARE - TRENZONE STORE (Next.js 16+ convention)
 * Handles Internationalization, Supabase Session Management, and Admin Security.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. EARLY EXIT: Skip proxy for static assets, media, next internals, API routes, and ALL POST requests (Server Actions, webhooks)
  if (
    request.method === 'POST' ||
    pathname.includes('.') || 
    pathname.startsWith('/_next') || 
    pathname.startsWith('/api') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/videos') ||
    pathname.startsWith('/fonts') ||
    pathname.startsWith('/supabase-proxy') ||
    pathname.startsWith('/.well-known') ||
    pathname === '/icon' ||
    pathname.startsWith('/icon')
  ) {
    return NextResponse.next();
  }

  // 2. ADMIN REDIRECT: Prevent localized admin URLs (e.g., /ro/admin -> /admin)
  if (pathname.startsWith('/ro/admin') || pathname.startsWith('/en/admin')) {
    const cleanPath = pathname.replace(/^\/(ro|en)\/admin/, '/admin');
    return NextResponse.redirect(new URL(cleanPath, request.nextUrl.origin));
  }

  // 3. SUPABASE SESSION SYNC & ADMIN ISOLATION (strictly for /admin routes — 0 overhead on storefront)
  if (pathname.startsWith('/admin')) {
    let response = NextResponse.next({
      request: { headers: request.headers },
    });

    const hasSupabaseCookie = request.cookies.getAll().some(c => c.name.startsWith('sb-'));
    if (
      hasSupabaseCookie &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          cookies: {
            getAll() { return request.cookies.getAll(); },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
              response = NextResponse.next({ request });
              cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
            },
          },
        }
      );

      // Sync session (Refresh JWT if expired)
      await supabase.auth.getUser().catch(() => null);
    }

    // Inject pathname into request headers for the Admin Layout / Server Components
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-pathname', pathname);
    const adminResponse = NextResponse.next({
      request: { headers: requestHeaders },
    });
    response.cookies.getAll().forEach(cookie => {
      adminResponse.cookies.set(cookie);
    });
    return adminResponse;
  }

  // 4. CUSTOM REDIRECT: Force English for non-RO users on first landing
  const country = request.headers.get('x-vercel-ip-country') || request.headers.get('cf-ipcountry');
  
  if (pathname === '/' && country && country !== 'RO') {
    return NextResponse.redirect(new URL('/en', request.nextUrl.origin));
  }

  // 5. STOREFRONT LOCALIZATION (Runs only for non-admin routes)
  return intlMiddleware(request);
}

export const config = {
  // Exclude API, _next, static media folders, and files with extensions so Edge Middleware isn't invoked on static assets
  matcher: ['/((?!api|_next|images|videos|fonts|supabase-proxy|favicon\\.ico|icon|robots\\.txt|sitemap\\.xml|.*\\..*).*)']
};
