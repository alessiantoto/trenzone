"use client";

import { useEffect, useState } from "react";
import type { FreeShippingThresholds } from "@/lib/cart-calculations";

export interface ClientShippingConfig extends FreeShippingThresholds {
  packaging_cost_ron: number;
  free_shipping_ro_ron: number;
  free_shipping_intl_eur: number;
  lockers_enabled?: boolean;
}

const DEFAULT_CLIENT_CONFIG: ClientShippingConfig = {
  packaging_cost_ron: 0,
  free_shipping_ro_ron: 500,
  free_shipping_intl_eur: 150,
  lockers_enabled: false,
};

let sharedConfig: ClientShippingConfig | null = null;
let inflightRequest: Promise<ClientShippingConfig> | null = null;
let lastFetchedAt = 0;
const CLIENT_TTL_MS = 15 * 60 * 1000;
const SESSION_KEY = "tz_shipping_cfg_v1";
const listeners = new Set<(cfg: ClientShippingConfig) => void>();

function readSessionConfig(): ClientShippingConfig | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.ts && Date.now() - parsed.ts < CLIENT_TTL_MS && parsed?.cfg) {
      return parsed.cfg;
    }
  } catch {}
  return null;
}

function writeSessionConfig(cfg: ClientShippingConfig) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ts: Date.now(), cfg }));
  } catch {}
}

function notifyListeners(cfg: ClientShippingConfig) {
  listeners.forEach((cb) => cb(cfg));
}

export function setShippingConfigCache(cfg: Partial<ClientShippingConfig>) {
  sharedConfig = {
    ...(sharedConfig || DEFAULT_CLIENT_CONFIG),
    ...cfg,
  };
  lastFetchedAt = Date.now();
  writeSessionConfig(sharedConfig);
  notifyListeners(sharedConfig);
}

async function loadShippingConfig(): Promise<ClientShippingConfig> {
  const now = Date.now();
  if (sharedConfig && now - lastFetchedAt < CLIENT_TTL_MS) {
    return sharedConfig;
  }
  const sessionCached = readSessionConfig();
  if (sessionCached) {
    sharedConfig = sessionCached;
    lastFetchedAt = now;
    return sessionCached;
  }
  if (inflightRequest) {
    return inflightRequest;
  }

  inflightRequest = fetch("/api/shipping-config")
    .then((res) => (res.ok ? res.json() : null))
    .then((json) => {
      if (json?.success && json.config) {
        sharedConfig = {
          packaging_cost_ron: Number(json.config.packaging_cost_ron ?? DEFAULT_CLIENT_CONFIG.packaging_cost_ron),
          free_shipping_ro_ron: Number(json.config.free_shipping_ro_ron ?? DEFAULT_CLIENT_CONFIG.free_shipping_ro_ron),
          free_shipping_intl_eur: Number(json.config.free_shipping_intl_eur ?? DEFAULT_CLIENT_CONFIG.free_shipping_intl_eur),
          lockers_enabled: Boolean(json.config.lockers_enabled),
        };
        lastFetchedAt = Date.now();
        writeSessionConfig(sharedConfig);
        notifyListeners(sharedConfig);
        return sharedConfig;
      }
      return sharedConfig || DEFAULT_CLIENT_CONFIG;
    })
    .catch(() => sharedConfig || DEFAULT_CLIENT_CONFIG)
    .finally(() => {
      inflightRequest = null;
    });

  return inflightRequest;
}

/**
 * Subscribe to live Admin-editable shipping configuration (/api/shipping-config).
 * Multiple components share one coordinated request.
 */
export function useShippingConfig(initial?: Partial<ClientShippingConfig>): ClientShippingConfig {
  const [config, setConfig] = useState<ClientShippingConfig>(() => ({
    ...DEFAULT_CLIENT_CONFIG,
    ...initial,
    ...(sharedConfig || {}),
  }));

  useEffect(() => {
    listeners.add(setConfig);
    loadShippingConfig().then((latest) => {
      setConfig(latest);
    });
    return () => {
      listeners.delete(setConfig);
    };
  }, []);

  return config;
}
