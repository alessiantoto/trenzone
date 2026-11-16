'use server';

import { getSamedayToken } from '@/lib/sameday-api';
import { getPacketStatus } from '@/lib/packeta-api';
import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminAuthorized } from '@/app/actions/admin-auth';

export async function checkSamedayConnection() {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) {
    return { success: false, message: 'Neautorizat' };
  }

  try {
    const token = await getSamedayToken();
    if (token) {
      return { success: true, message: 'Conectat cu succes la Sameday API' };
    }
    return { success: false, message: 'Autentificare eșuată la Sameday API' };
  } catch (error: any) {
    console.error('Sameday check error:', error.message);
    return { success: false, message: error.message || 'Eroare de conexiune la Sameday API' };
  }
}

export async function checkPacketaConnection() {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) {
    return { success: false, message: 'Neautorizat' };
  }

  try {
    // Apelăm cu un ID fals pentru a verifica autentificarea. 
    // Dacă parola API este validă, va returna eroare că pachetul nu există, nu eroare de autentificare.
    await getPacketStatus("0");
    return { success: true, message: 'Conectat cu succes la Packeta API' };
  } catch (error: any) {
    const errorMsg = error.message || '';
    if (errorMsg.toLowerCase().includes('password') || errorMsg.toLowerCase().includes('auth')) {
      return { success: false, message: 'Autentificare eșuată la Packeta API' };
    }
    // Dacă eroarea e de tipul "Pachetul nu a fost găsit", înseamnă că autentificarea a reușit
    return { success: true, message: 'Conectat cu succes la Packeta API' };
  }
}

import { getSiteSetting, updateSiteSetting } from '@/app/actions/settings';
import { revalidatePath, revalidateTag } from 'next/cache';

export interface ShippingConfig {
  packaging_cost_ron: number;
  free_shipping_ro_ron: number;
  free_shipping_intl_eur: number;
  lockers_enabled: boolean;
}

const DEFAULT_SHIPPING_CONFIG: ShippingConfig = {
  packaging_cost_ron: 0,
  free_shipping_ro_ron: 500,
  free_shipping_intl_eur: 150,
  lockers_enabled: false,
};

export async function getShippingConfig(): Promise<ShippingConfig> {
  try {
    const value = await getSiteSetting('shipping_config');
    if (!value) {
      return { ...DEFAULT_SHIPPING_CONFIG };
    }
    return {
      packaging_cost_ron: Number(value.packaging_cost_ron ?? DEFAULT_SHIPPING_CONFIG.packaging_cost_ron),
      free_shipping_ro_ron: Number(value.free_shipping_ro_ron ?? DEFAULT_SHIPPING_CONFIG.free_shipping_ro_ron),
      free_shipping_intl_eur: Number(value.free_shipping_intl_eur ?? DEFAULT_SHIPPING_CONFIG.free_shipping_intl_eur),
      // Implicitly disabled across all countries unless explicitly enabled by admin
      lockers_enabled: value.lockers_enabled === true,
    };
  } catch (error) {
    return { ...DEFAULT_SHIPPING_CONFIG };
  }
}

export async function saveShippingConfig(config: {
  packaging_cost_ron: number;
  free_shipping_ro_ron: number;
  free_shipping_intl_eur: number;
  lockers_enabled?: boolean;
}) {
  try {
    const isAuthorized = await isAdminAuthorized();
    if (!isAuthorized) {
      return { success: false, message: 'Neautorizat' };
    }

    const existing = await getShippingConfig();
    const resolvedConfig: ShippingConfig = {
      packaging_cost_ron: Number(config.packaging_cost_ron ?? existing.packaging_cost_ron) || 0,
      free_shipping_ro_ron: Number(config.free_shipping_ro_ron ?? existing.free_shipping_ro_ron) || 0,
      free_shipping_intl_eur: Number(config.free_shipping_intl_eur ?? existing.free_shipping_intl_eur) || 0,
      lockers_enabled:
        typeof config.lockers_enabled === 'boolean'
          ? config.lockers_enabled
          : existing.lockers_enabled,
    };

    const { error } = await supabaseAdmin
      .from('store_settings')
      .upsert({
        key: 'shipping_config',
        value: resolvedConfig
      }, { onConflict: 'key' });

    if (error) throw error;

    revalidateTag('store_settings', 'max');
    revalidatePath('/[locale]', 'page');
    revalidatePath('/[locale]/shop', 'page');
    revalidatePath('/[locale]/product/[slug]', 'page');
    revalidatePath('/[locale]/checkout', 'page');
    revalidatePath('/api/shipping-config');

    return { success: true, config: resolvedConfig };
  } catch (error: any) {
    console.error('saveShippingConfig error:', error);
    return { success: false, message: error.message };
  }
}
