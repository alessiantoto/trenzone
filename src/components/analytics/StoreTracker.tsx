"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function StoreTracker({ enabled = false }: { enabled?: boolean }) {
  const pathname = usePathname();
  const lastPathname = useRef<string | null>(null);

  const getClientIdentifiers = () => {
    let visitorId = '';
    let sessionId = '';
    try {
      visitorId = localStorage.getItem('tz_vid') || '';
      if (!visitorId || visitorId.length < 10) {
        visitorId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : 'v_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
        localStorage.setItem('tz_vid', visitorId);
      }

      const now = Date.now();
      const lastActive = Number(sessionStorage.getItem('tz_sid_ts') || 0);
      sessionId = sessionStorage.getItem('tz_sid') || '';
      // If session is older than 30 minutes, create a new session
      if (!sessionId || sessionId.length < 10 || (now - lastActive > 30 * 60 * 1000)) {
        sessionId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : 's_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
        sessionStorage.setItem('tz_sid', sessionId);
      }
      sessionStorage.setItem('tz_sid_ts', String(now));
    } catch (e) {
      // Storage access may fail in rare iframe or private contexts
    }
    return { visitorId, sessionId };
  };

  const sendEvent = (event: "pageview" | "cart" | "checkout" | "vitals", meta?: Record<string, any>) => {
    try {
      if (!enabled || typeof window === "undefined") return;

      // Don't track admin console activity or automated bots/crawlers
      if (window.location.pathname.startsWith("/admin")) return;
      if (navigator.webdriver || /bot|crawler|spider|bytespider|facebookexternalhit|lighthouse|headless|prerender/i.test(navigator.userAgent || "")) {
        return;
      }

      const { visitorId, sessionId } = getClientIdentifiers();

      const payloadObj = {
        event,
        visitorId: visitorId || undefined,
        sessionId: sessionId || undefined,
        path: window.location.pathname,
        referrer: document.referrer || '',
        search: window.location.search || '',
        screenWidth: window.innerWidth || 0,
        ...meta
      };

      const payload = JSON.stringify(payloadObj);

      // Primary: fetch with keepalive and application/json
      if (typeof fetch === 'function') {
        fetch("/api/analytics/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
          credentials: 'include',
        }).catch(() => {
          // Fallback to sendBeacon if fetch errors
          if (navigator.sendBeacon) {
            const blob = new Blob([payload], { type: 'application/json' });
            navigator.sendBeacon("/api/analytics/track", blob);
          }
        });
      } else if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon("/api/analytics/track", blob);
      }
    } catch (e) {
      // Silently fail - tracking should never disrupt UX
    }
  };

  // 1. Track Pageviews, Checkout entrance & Core Web Vitals in a SINGLE request (cuts serverless invocations & Redis commands by 50%)
  useEffect(() => {
    if (!enabled) return;
    if (!pathname || pathname.startsWith("/admin")) return;
    if (lastPathname.current === pathname) return;

    // Deduplicate rapid repeat visits to the same path within 3 minutes in the same session (saves Vercel Function Invocations & CPU)
    try {
      const dedupeKey = `tz_pv_${pathname}`;
      const lastTracked = Number(sessionStorage.getItem(dedupeKey) || 0);
      if (Date.now() - lastTracked < 3 * 60 * 1000 && !pathname.includes("/checkout")) {
        lastPathname.current = pathname;
        return;
      }
      sessionStorage.setItem(dedupeKey, String(Date.now()));
    } catch {}

    lastPathname.current = pathname;

    let ttfb = 0;
    let fcp = 0;
    let lcp = 0;
    let cls = 0;
    let inp = 0;

    try {
      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navEntry && navEntry.responseStart > 0) {
        ttfb = Math.round(navEntry.responseStart - navEntry.requestStart);
      }
      const paintEntries = performance.getEntriesByType('paint');
      for (const entry of paintEntries) {
        if (entry.name === 'first-contentful-paint') {
          fcp = Math.round(entry.startTime);
        }
      }
    } catch {}

    let lcpObserver: PerformanceObserver | null = null;
    try {
      if ('PerformanceObserver' in window) {
        lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          if (lastEntry) {
            lcp = Math.round(lastEntry.startTime);
          }
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      }
    } catch {}

    // Brief 350ms settle so initial paint / LCP is captured in the same single request
    const timer = setTimeout(() => {
      lcpObserver?.disconnect();
      const event = pathname.includes("/checkout") ? "checkout" : "pageview";
      const hasVitals = ttfb > 0 || fcp > 0 || lcp > 0;
      sendEvent(event, hasVitals ? {
        vitals: {
          ttfb: ttfb > 0 && ttfb < 10000 ? ttfb : undefined,
          fcp: fcp > 0 && fcp < 10000 ? fcp : undefined,
          lcp: lcp > 0 && lcp < 20000 ? lcp : undefined,
          cls: cls > 0 && cls < 2 ? Math.round(cls * 1000) / 1000 : undefined,
          inp: inp > 0 && inp < 5000 ? inp : undefined,
        }
      } : undefined);
    }, 350);

    return () => {
      clearTimeout(timer);
      lcpObserver?.disconnect();
    };
  }, [enabled, pathname]);

  // 2. Track Cart additions (triggered from useCartStore or buttons)
  useEffect(() => {
    if (!enabled) return;
    const handleCartAdd = () => {
      sendEvent("cart");
    };

    window.addEventListener("tz:cart_add", handleCartAdd);
    return () => {
      window.removeEventListener("tz:cart_add", handleCartAdd);
    };
  }, [enabled]);

  return null;
}
