"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

interface Ga4ItemPayload {
  item_id: string;
  item_name: string;
  item_brand?: string;
  item_variant?: string;
  price?: number;
  quantity: number;
}

function resolveCurrencyFromContext(pathname: string): string {
  try {
    const ogCurrency = document
      .querySelector('meta[property="og:price:currency"]')
      ?.getAttribute("content")
      ?.trim()
      .toUpperCase();
    if (ogCurrency && /^[A-Z]{3}$/.test(ogCurrency)) return ogCurrency;
    const htmlLang = (document.documentElement?.lang || "").toLowerCase();
    if (pathname.startsWith("/ro") || htmlLang.startsWith("ro")) return "RON";
  } catch {}
  return "EUR";
}

function resolveLocalizedProductName(rawName: unknown): string {
  if (!rawName) return "";
  if (typeof rawName === "string") return rawName.trim();
  if (typeof rawName === "object" && rawName !== null) {
    const obj = rawName as Record<string, unknown>;
    const lang = typeof document !== "undefined" ? (document.documentElement?.lang || "ro").slice(0, 2) : "ro";
    const candidate = obj[lang] || obj.ro || obj.en || Object.values(obj)[0];
    return typeof candidate === "string" ? candidate.trim() : "";
  }
  return "";
}

function extractProductFromDom(pathname: string): { item: Ga4ItemPayload; currency: string; value?: number } | null {
  try {
    const match = pathname.match(/\/product\/([^/?#]+)/i);
    if (!match) return null;

    const slug = decodeURIComponent(match[1]).trim();
    if (!slug) return null;

    const h1Text = document.querySelector("h1")?.textContent?.trim();
    const ogTitle = document
      .querySelector('meta[property="og:title"]')
      ?.getAttribute("content")
      ?.split("|")[0]
      ?.trim();
    const docTitle = document.title ? document.title.split("|")[0].trim() : "";
    const fallbackSlugTitle = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const itemName = h1Text || ogTitle || docTitle || fallbackSlugTitle;

    const rawPrice = document
      .querySelector('meta[property="og:price:amount"]')
      ?.getAttribute("content")
      ?.trim();
    const parsedPrice = rawPrice ? Number(rawPrice) : NaN;
    const price = Number.isFinite(parsedPrice) && parsedPrice > 0 ? Number(parsedPrice.toFixed(2)) : undefined;
    const currency = resolveCurrencyFromContext(pathname);

    return {
      item: {
        item_id: slug,
        item_name: itemName,
        item_brand: "TrenZone",
        ...(price !== undefined ? { price } : {}),
        quantity: 1,
      },
      currency,
      ...(price !== undefined ? { value: price } : {}),
    };
  } catch {
    return null;
  }
}

function extractCartItemsFromStorage(
  pathname: string,
  targetProductId?: string
): { items: Ga4ItemPayload[]; value: number; currency: string } {
  const currency = resolveCurrencyFromContext(pathname);
  try {
    const raw = localStorage.getItem("campion-cart");
    if (!raw) return { items: [], value: 0, currency };
    const parsed = JSON.parse(raw) as {
      state?: {
        items?: Array<{
          id?: string;
          slug?: string;
          name?: unknown;
          price?: number | Record<string, number>;
          quantity?: number;
          selectedVariant?: { name?: string };
        }>;
      };
    };
    const stored = Array.isArray(parsed?.state?.items) ? parsed.state.items : [];
    const filtered = targetProductId
      ? stored.filter((it) => String(it.id || "") === String(targetProductId))
      : stored;
    const sourceList = filtered.length > 0 ? filtered : targetProductId && stored.length > 0 ? [stored[stored.length - 1]] : stored;

    let totalValue = 0;
    const items: Ga4ItemPayload[] = sourceList
      .map((it) => {
        const qty = Math.max(1, Number(it.quantity) || 1);
        const rawPrice =
          typeof it.price === "number"
            ? it.price
            : it.price && typeof it.price === "object"
              ? Number(it.price[currency] ?? it.price.RON ?? it.price.EUR ?? 0)
              : 0;
        const unitPrice = Number.isFinite(rawPrice) && rawPrice > 0 ? Number(rawPrice.toFixed(2)) : undefined;
        if (unitPrice !== undefined) {
          totalValue += unitPrice * qty;
        }
        const itemId = String(it.slug || it.id || "item").trim();
        const itemName = resolveLocalizedProductName(it.name) || itemId.replace(/-/g, " ");
        return {
          item_id: itemId,
          item_name: itemName,
          item_brand: "TrenZone",
          ...(it.selectedVariant?.name ? { item_variant: String(it.selectedVariant.name) } : {}),
          ...(unitPrice !== undefined ? { price: unitPrice } : {}),
          quantity: qty,
        };
      })
      .filter((it) => Boolean(it.item_name));

    return {
      items,
      value: Number(totalValue.toFixed(2)),
      currency,
    };
  } catch {
    return { items: [], value: 0, currency };
  }
}

export function StoreTracker({ enabled = false }: { enabled?: boolean }) {
  const pathname = usePathname();
  const lastPathname = useRef<string | null>(null);

  const getClientIdentifiers = () => {
    let visitorId = "";
    let sessionId = "";
    try {
      visitorId = localStorage.getItem("tz_vid") || "";
      if (!visitorId || visitorId.length < 10) {
        visitorId =
          typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : "v_" + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
        localStorage.setItem("tz_vid", visitorId);
      }

      const now = Date.now();
      const lastActive = Number(sessionStorage.getItem("tz_sid_ts") || 0);
      sessionId = sessionStorage.getItem("tz_sid") || "";
      // If session is older than 30 minutes, create a new session
      if (!sessionId || sessionId.length < 10 || now - lastActive > 30 * 60 * 1000) {
        sessionId =
          typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : "s_" + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
        sessionStorage.setItem("tz_sid", sessionId);
      }
      sessionStorage.setItem("tz_sid_ts", String(now));
    } catch {
      // Storage access may fail in rare iframe or private contexts
    }
    return { visitorId, sessionId };
  };

  const fireGaEvent = (
    event: "pageview" | "cart" | "checkout" | "vitals",
    detail?: { productId?: string }
  ) => {
    try {
      if (typeof window === "undefined") return;
      const currentPath = window.location.pathname;
      if (currentPath.startsWith("/admin")) return;
      const gtagFn = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
      if (typeof gtagFn !== "function") return;

      const basePayload = {
        event_category: "ecommerce",
        page_path: currentPath,
        page_location: window.location.href,
      };

      if (event === "cart") {
        const cartData = extractCartItemsFromStorage(currentPath, detail?.productId);
        const domFallback = cartData.items.length === 0 ? extractProductFromDom(currentPath) : null;
        const items = cartData.items.length > 0 ? cartData.items : domFallback ? [domFallback.item] : [];
        const value = cartData.value > 0 ? cartData.value : domFallback?.value;
        const currency = cartData.items.length > 0 ? cartData.currency : domFallback?.currency || resolveCurrencyFromContext(currentPath);

        gtagFn("event", "add_to_cart", {
          ...basePayload,
          currency,
          ...(value && value > 0 ? { value } : {}),
          ...(items.length > 0 ? { items } : {}),
        });
      } else if (event === "checkout") {
        const cartData = extractCartItemsFromStorage(currentPath);
        const gaEventName = currentPath.includes("/checkout/success") ? "purchase" : "begin_checkout";
        gtagFn("event", gaEventName, {
          ...basePayload,
          currency: cartData.currency,
          ...(cartData.value > 0 ? { value: cartData.value } : {}),
          ...(cartData.items.length > 0 ? { items: cartData.items } : {}),
        });
      } else if (event === "pageview" && currentPath.includes("/product/")) {
        const productInfo = extractProductFromDom(currentPath);
        gtagFn("event", "view_item", {
          ...basePayload,
          ...(productInfo
            ? {
                currency: productInfo.currency,
                ...(productInfo.value !== undefined ? { value: productInfo.value } : {}),
                items: [productInfo.item],
              }
            : {}),
        });
      }
    } catch {}
  };

  const sendEvent = (
    event: "pageview" | "cart" | "checkout" | "vitals",
    meta?: Record<string, any>,
    detail?: { productId?: string }
  ) => {
    try {
      if (typeof window === "undefined") return;
      if (window.location.pathname.startsWith("/admin")) return;
      if (
        navigator.webdriver ||
        /bot|crawler|spider|bytespider|facebookexternalhit|lighthouse|headless|prerender/i.test(
          navigator.userAgent || ""
        )
      ) {
        return;
      }

      // Always forward standard GA4 e-commerce events client-side (0 Vercel/Redis cost)
      fireGaEvent(event, detail);

      // Only send internal /api/analytics/track payload if Redis analytics is explicitly enabled
      if (!enabled) return;

      const { visitorId, sessionId } = getClientIdentifiers();

      const payloadObj = {
        event,
        visitorId: visitorId || undefined,
        sessionId: sessionId || undefined,
        path: window.location.pathname,
        referrer: document.referrer || "",
        search: window.location.search || "",
        screenWidth: window.innerWidth || 0,
        ...meta,
      };

      const payload = JSON.stringify(payloadObj);

      // Primary: fetch with keepalive and application/json
      if (typeof fetch === "function") {
        fetch("/api/analytics/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
          credentials: "include",
        }).catch(() => {
          // Fallback to sendBeacon if fetch errors
          if (navigator.sendBeacon) {
            const blob = new Blob([payload], { type: "application/json" });
            navigator.sendBeacon("/api/analytics/track", blob);
          }
        });
      } else if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon("/api/analytics/track", blob);
      }
    } catch {
      // Silently fail - tracking should never disrupt UX
    }
  };

  // 1. Track Pageviews, Checkout entrance & Core Web Vitals (GA4 runs client-side even when internal Redis tracking is off)
  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    if (lastPathname.current === pathname) return;

    if (!enabled) {
      lastPathname.current = pathname;
      // Slight delay on product pages so client title / H1 hydration settles if needed
      const timer = setTimeout(() => {
        fireGaEvent(pathname.includes("/checkout") ? "checkout" : "pageview");
      }, 100);
      return () => clearTimeout(timer);
    }

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
    const cls = 0;
    const inp = 0;

    try {
      const navEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
      if (navEntry && navEntry.responseStart > 0) {
        ttfb = Math.round(navEntry.responseStart - navEntry.requestStart);
      }
      const paintEntries = performance.getEntriesByType("paint");
      for (const entry of paintEntries) {
        if (entry.name === "first-contentful-paint") {
          fcp = Math.round(entry.startTime);
        }
      }
    } catch {}

    let lcpObserver: PerformanceObserver | null = null;
    try {
      if ("PerformanceObserver" in window) {
        lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          if (lastEntry) {
            lcp = Math.round(lastEntry.startTime);
          }
        });
        lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
      }
    } catch {}

    // Brief 350ms settle so initial paint / LCP is captured in the same single request
    const timer = setTimeout(() => {
      lcpObserver?.disconnect();
      const event = pathname.includes("/checkout") ? "checkout" : "pageview";
      const hasVitals = ttfb > 0 || fcp > 0 || lcp > 0;
      sendEvent(
        event,
        hasVitals
          ? {
              vitals: {
                ttfb: ttfb > 0 && ttfb < 10000 ? ttfb : undefined,
                fcp: fcp > 0 && fcp < 10000 ? fcp : undefined,
                lcp: lcp > 0 && lcp < 20000 ? lcp : undefined,
                cls: cls > 0 && cls < 2 ? Math.round(cls * 1000) / 1000 : undefined,
                inp: inp > 0 && inp < 5000 ? inp : undefined,
              },
            }
          : undefined
      );
    }, 350);

    return () => {
      clearTimeout(timer);
      lcpObserver?.disconnect();
    };
  }, [enabled, pathname]);

  // 2. Track Cart additions (triggered from useCartStore or buttons)
  useEffect(() => {
    const handleCartAdd = (e: Event) => {
      const detail = (e as CustomEvent<{ productId?: string }>)?.detail;
      sendEvent("cart", undefined, detail);
    };

    window.addEventListener("tz:cart_add", handleCartAdd);
    return () => {
      window.removeEventListener("tz:cart_add", handleCartAdd);
    };
  }, [enabled]);

  return null;
}
