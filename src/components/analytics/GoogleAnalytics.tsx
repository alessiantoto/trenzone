"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useConsent } from "@/hooks/useConsent";

const SAFE_GA_ID_REGEX = /^(G|GT|AW|DC)-[A-Z0-9]+$/i;

export function GoogleAnalytics({ gaId }: { gaId: string }) {
  const { consent, isLoaded } = useConsent();
  const pathname = usePathname();
  const [shouldLoad, setShouldLoad] = useState(false);
  const lastTrackedPath = useRef<string | null>(null);
  const safeGaId = SAFE_GA_ID_REGEX.test(gaId.trim()) ? gaId.trim() : "";

  useEffect(() => {
    if (isLoaded && consent?.analytics) {
      setShouldLoad(true);
    } else {
      setShouldLoad(false);
    }

    // Listen for updates in the same session
    const handleUpdate = () => {
      const stored = localStorage.getItem("campion_consent");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setShouldLoad(!!parsed.analytics);
        } catch (e) {}
      }
    };

    window.addEventListener("consent_updated", handleUpdate);
    return () => window.removeEventListener("consent_updated", handleUpdate);
  }, [isLoaded, consent]);

  // Track client-side App Router page transitions once GA4 is active
  useEffect(() => {
    if (!shouldLoad || !safeGaId || !pathname || lastTrackedPath.current === pathname) return;
    lastTrackedPath.current = pathname;

    const gtagFn = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
    if (typeof gtagFn === "function") {
      gtagFn("config", safeGaId, { page_path: pathname });
    }
  }, [shouldLoad, safeGaId, pathname]);

  if (!shouldLoad || !safeGaId) return null;

  return (
    <>
      <Script
        strategy="lazyOnload"
        src={`https://www.googletagmanager.com/gtag/js?id=${safeGaId}`}
      />
      <Script
        id="gtag-init"
        strategy="lazyOnload"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${safeGaId}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  );
}
