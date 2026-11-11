'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminAuthorized } from './admin-auth';
import { headers } from 'next/headers';

async function isAdminOrCronAuthorized(): Promise<boolean> {
  if (await isAdminAuthorized()) return true;
  try {
    const h = await headers();
    const authHeader = h.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      return true;
    }
  } catch {
    // Ignore headers error outside request context
  }
  return false;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject_ro: string;
  subject_en: string;
  heading_ro: string;
  heading_en: string;
  body_ro: string;
  body_en: string;
  cta_ro: string;
  cta_en: string;
  updated_at?: string;
}

// Obține toate template-urile
export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error('Neautorizat');

  const { data, error } = await supabaseAdmin
    .from('email_templates')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching email templates:', error);
    return [];
  }
  return data as EmailTemplate[];
}

// Obține un singur template (folosit și intern de cron-uri și acțiuni de sistem)
export async function getEmailTemplate(id: string): Promise<EmailTemplate | null> {
  try {
    const isAuth = await isAdminOrCronAuthorized();
    if (!isAuth) return null;

    const { data, error } = await supabaseAdmin
      .from('email_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error fetching email template ${id}:`, error);
      return null;
    }
    return data as EmailTemplate;
  } catch (err) {
    console.error(`Error fetching email template ${id}:`, err);
    return null;
  }
}

// Actualizează un template
export async function updateEmailTemplate(id: string, updates: Partial<EmailTemplate>) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error('Neautorizat');

  const { data, error } = await supabaseAdmin
    .from('email_templates')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating email template:', error);
    throw error;
  }
  return data;
}
