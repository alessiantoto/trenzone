import React, { useEffect, useRef } from 'react';
import { useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, X, MapPin, Check } from 'lucide-react';

interface Locker {
  id: number;
  name: string;
  county: string;
  city: string;
  address: string;
  lat: number;
  lng: number;
  postalCode: string;
}

interface SamedayLockerSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (locker: Locker) => void;
  selectedLockerId?: number | null;
}

// Real Production Client ID for domain
const SAMEDAY_CLIENT_ID = process.env.NEXT_PUBLIC_SAMEDAY_CLIENT_ID || "01fd0347-292f-46fe-8a61-6ab0ec3d9e47";
const SAMEDAY_API_ENV = 'production';

export function SamedayLockerSelector({ isOpen, onClose, onSelect, selectedLockerId }: SamedayLockerSelectorProps) {
  const locale = useLocale();
  const pluginRef = useRef<any>(null);
  const [isInitializing, setIsInitializing] = React.useState(false);

  const onSelectRef = useRef(onSelect);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onSelectRef.current = onSelect;
    onCloseRef.current = onClose;
  }, [onSelect, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setIsInitializing(false);
      return;
    }

    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    setIsInitializing(true);
    const scriptId = 'sameday-locker-plugin-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    const tryInitPlugin = () => {
      if (cancelled || !(window as any).LockerPlugin) return false;
      if (!pluginRef.current) {
        pluginRef.current = (window as any).LockerPlugin.getInstance();
        pluginRef.current.init({
          clientId: SAMEDAY_CLIENT_ID,
          countryCode: 'RO',
          langCode: locale === 'en' ? 'en' : 'ro',
          apiEnvironment: SAMEDAY_API_ENV,
        });
      }

      const handleLockerSelect = (lockerData: any) => {
        if (lockerData && (lockerData.lockerId || lockerData.id)) {
          onSelectRef.current({
            id: lockerData.lockerId || lockerData.id,
            name: lockerData.name,
            county: lockerData.county,
            city: lockerData.city,
            address: lockerData.address,
            lat: lockerData.lat,
            lng: lockerData.lng,
            postalCode: lockerData.postalCode || ''
          });
          onCloseRef.current();
          pluginRef.current?.close?.();
        }
      };

      if (pluginRef.current.unsubscribe) {
        pluginRef.current.unsubscribe();
      }
      pluginRef.current.subscribe(handleLockerSelect);
      if (!cancelled) setIsInitializing(false);
      pluginRef.current.open();
      return true;
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://cdn.sameday.ro/locker-plugin/lockerpluginsdk.js';
      script.async = true;
      script.onerror = () => {
        if (!cancelled) onCloseRef.current();
      };
      document.body.appendChild(script);
    }

    if (!tryInitPlugin()) {
      let attempts = 0;
      pollTimer = setInterval(() => {
        attempts++;
        if (tryInitPlugin()) {
          if (pollTimer) clearInterval(pollTimer);
          pollTimer = null;
        } else if (attempts >= 50) {
          if (pollTimer) clearInterval(pollTimer);
          pollTimer = null;
          if (!cancelled) onCloseRef.current();
        }
      }, 100);
    }

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [isOpen, locale]);

  // Show lightweight responsive loader while external Sameday SDK script is still initializing
  if (!isOpen || !isInitializing) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-white/15 text-white rounded-2xl px-6 py-4 flex items-center gap-3 shadow-2xl">
        <Loader2 className="w-5 h-5 text-[#e32f8c] animate-spin shrink-0" />
        <span className="text-xs font-bold uppercase tracking-wider">
          {locale === 'en' ? 'Loading Sameday Lockers...' : 'Se încarcă harta Easybox...'}
        </span>
      </div>
    </div>
  );
}

