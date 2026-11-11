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

export async function getShippingConfig() {
  try {
    const value = await getSiteSetting('shipping_config');
    if (!value) {
      return {
        packaging_cost_ron: 0,
        free_shipping_ro_ron: 499,
        free_shipping_intl_eur: 200
      };
    }
    return value;
  } catch (error) {
    return {
      packaging_cost_ron: 0,
      free_shipping_ro_ron: 499,
      free_shipping_intl_eur: 200
    };
  }
}

export async function saveShippingConfig(config: { packaging_cost_ron: number, free_shipping_ro_ron: number, free_shipping_intl_eur: number }) {
  try {
    const isAuthorized = await isAdminAuthorized();
    if (!isAuthorized) {
      return { success: false, message: 'Neautorizat' };
    }

    const { error } = await supabaseAdmin
      .from('store_settings')
      .upsert({
        key: 'shipping_config',
        value: config
      }, { onConflict: 'key' });

    if (error) throw error;

    revalidateTag('store_settings', 'max');
    revalidatePath('/[locale]', 'page');

    return { success: true };
  } catch (error: any) {
    console.error('saveShippingConfig error:', error);
    return { success: false, message: error.message };
  }
}
