"use client";

import { useState, useEffect, ReactNode } from "react";

/**
 * 🛰️ DEFERRED OVERLAY COMPONENT
 * Delays the rendering of non-critical components (Consent, Popups, etc.)
 * to free up the main thread for initial hydration and LCP.
 */
export function DeferredOverlay({ 
  children, 
  delay = 2000,
  idleOnly = false 
}: { 
  children: ReactNode; 
  delay?: number;
  idleOnly?: boolean;
}) {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Strategy 1: RequestIdleCallback (Best for TBT)
    if (idleOnly && "requestIdleCallback" in window) {
      const handle = requestIdleCallback(() => {
        setShouldRender(true);
      }, { timeout: delay });
      return () => cancelIdleCallback(handle);
    }

    // Strategy 2: Standard Timeout (Fallback)
    const timer = setTimeout(() => {
      if (!shouldRender) setShouldRender(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, idleOnly, shouldRender]);

  if (!shouldRender) return null;

  return <>{children}</>;
}
