'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminAuthorized } from '@/app/actions/admin-auth';

export async function getShippingRates() {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error('Unauthorized');

  const { data, error } = await supabaseAdmin
    .from('shipping_rates')
    .select('*')
    .order('country_code', { ascending: true })
    .order('shipping_type', { ascending: true })
    .order('max_weight', { ascending: true });

  if (error) {
    console.error('Error fetching shipping rates:', error);
    throw new Error('Failed to fetch shipping rates');
  }

  return data;
}

export async function updateShippingRate(id: number, updates: any) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error('Unauthorized');

  const { data, error } = await supabaseAdmin
    .from('shipping_rates')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating shipping rate:', error);
    throw new Error('Failed to update shipping rate');
  }

  return data;
}

export async function addShippingRate(rateData: any) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error('Unauthorized');

  const { data, error } = await supabaseAdmin
    .from('shipping_rates')
    .insert([rateData])
    .select()
    .single();

  if (error) {
    console.error('Error adding shipping rate:', error);
    throw new Error('Failed to add shipping rate: ' + error.message);
  }

  return data;
}

export async function deleteShippingRate(id: number) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error('Unauthorized');

  const { error } = await supabaseAdmin
    .from('shipping_rates')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting shipping rate:', error);
    throw new Error('Failed to delete shipping rate');
  }

  return true;
}
