import React, { useEffect, useRef } from 'react';
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
  const pluginRef = useRef<any>(null);

  const onSelectRef = useRef(onSelect);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onSelectRef.current = onSelect;
    onCloseRef.current = onClose;
  }, [onSelect, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    // Load the official Sameday plugin script if not already loaded
    const scriptId = 'sameday-locker-plugin-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    const initPlugin = () => {
      if ((window as any).LockerPlugin) {
        if (!pluginRef.current) {
          pluginRef.current = (window as any).LockerPlugin.getInstance();
          pluginRef.current.init({
            clientId: SAMEDAY_CLIENT_ID,
            countryCode: 'RO',
            langCode: 'ro',
            apiEnvironment: SAMEDAY_API_ENV,
          });
        }
        
        // Subscribe to the event
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
            onCloseRef.current(); // Close our wrapper when they select
            pluginRef.current.close(); // Close their modal
          }
        };

        // Unsubscribe if it exists to avoid duplicate listeners (though we only init once mostly)
        if (pluginRef.current.unsubscribe) {
           pluginRef.current.unsubscribe();
        }
        
        pluginRef.current.subscribe(handleLockerSelect);
        
        // Open the plugin modal
        pluginRef.current.open();

        return () => {
          // Cleanup handled by unmounting or close
        };
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://cdn.sameday.ro/locker-plugin/lockerpluginsdk.js';
      script.async = true;
      script.onload = () => {
        setTimeout(initPlugin, 100);
      };
      document.body.appendChild(script);
    } else {
      // If script is already there, just init
      const cleanup = initPlugin();
      return cleanup;
    }
  }, [isOpen]);

  // We don't render a visual modal anymore because Sameday's plugin renders its own overlay modal over the entire screen.
  return null;
}

