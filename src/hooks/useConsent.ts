"use client";

import { useState, useEffect } from "react";

export type ConsentSettings = {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
};

const STORAGE_KEY = "campion_consent";

const defaultConsent: ConsentSettings = {
  essential: true,
  analytics: false,
  marketing: false,
};

export function useConsent() {
  const [consent, setConsent] = useState<ConsentSettings | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setConsent(JSON.parse(stored));
      } catch (e) {
        setConsent(null);
      }
    }
    setIsLoaded(true);
  }, []);

  const updateConsent = (newSettings: ConsentSettings) => {
    const settings = { ...newSettings, essential: true };
    setConsent(settings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    
    // Trigger a storage event for other components in same tab
    window.dispatchEvent(new Event("consent_updated"));
  };

  const acceptAll = () => {
    updateConsent({ essential: true, analytics: true, marketing: true });
  };

  const declineAll = () => {
    updateConsent({ essential: true, analytics: false, marketing: false });
  };

  return {
    consent,
    isLoaded,
    updateConsent,
    acceptAll,
    declineAll,
  };
}
