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

const DEFAULT_PROGRAM_TEMPLATES: EmailTemplate[] = [
  {
    id: 'program-delivery',
    name: 'Livrare Programe Digitale (Food Plan & Bench Program PDF)',
    subject_ro: 'Programele tale digitale sunt gata de descărcare — Comanda #{{order_id}}',
    subject_en: 'Your digital programs are ready to download — Order #{{order_id}}',
    heading_ro: 'PROGRAMELE TALE DIGITALE SUNT GATA',
    heading_en: 'YOUR DIGITAL PROGRAMS ARE READY',
    body_ro:
      'Îți mulțumim pentru comandă, {{name}}. Programele tale digitale în format PDF sunt atașate direct la acest email și pot fi descărcate oricând folosind butoanele de mai jos.',
    body_en:
      'Thank you for your order, {{name}}. Your official PDF program(s) are attached directly to this email and can also be downloaded anytime using the links below.',
    cta_ro: 'DESCARCĂ PDF',
    cta_en: 'DOWNLOAD PDF',
  },
  {
    id: 'program-marketing',
    name: 'Marketing & Recomandare Programe Digitale (Food Plan + Bench Program)',
    subject_ro: 'Programe Digitale Oficiale: Food Plan & Bench Program (PDF)',
    subject_en: 'Official Digital Programs: Food Plan & Bench Program (PDF)',
    heading_ro: 'PROGRAME DIGITALE OFICIALE',
    heading_en: 'OFFICIAL DIGITAL PROGRAMS',
    body_ro:
      'Salut {{name}}, pe lângă echipamentul de sală, descoperă ghidurile oficiale în format PDF: Food Plan (10 capitole + meniuri gata făcute) și Bench Program (protocol de 8 săptămâni pentru forță la piept), disponibile în Română și Engleză.',
    body_en:
      'Hi {{name}}, alongside your strength gear, discover our official PDF guides: Food Plan (10 chapters + sample meal plans) and Bench Program (8-week strength protocol), available in English and Romanian.',
    cta_ro: 'VEZI PROGRAMELE',
    cta_en: 'VIEW PROGRAMS',
  },
];

// Obține toate template-urile
export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error('Neautorizat');

  const { data, error } = await supabaseAdmin
    .from('email_templates')
    .select('*')
    .order('name');

  const dbList = (!error && Array.isArray(data) ? data : []) as EmailTemplate[];
  const merged = [...dbList];
  for (const def of DEFAULT_PROGRAM_TEMPLATES) {
    if (!merged.some((t) => t.id === def.id)) {
      merged.push(def);
    }
  }
  return merged;
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
      .maybeSingle();

    if (error || !data) {
      return DEFAULT_PROGRAM_TEMPLATES.find((t) => t.id === id) || null;
    }
    return data as EmailTemplate;
  } catch (err) {
    console.error(`Error fetching email template ${id}:`, err);
    return DEFAULT_PROGRAM_TEMPLATES.find((t) => t.id === id) || null;
  }
}

// Actualizează un template (cu upsert pentru template-urile noi de programe)
export async function updateEmailTemplate(id: string, updates: Partial<EmailTemplate>) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error('Neautorizat');

  const fallbackDefault = DEFAULT_PROGRAM_TEMPLATES.find((t) => t.id === id);
  const payload = {
    ...(fallbackDefault || {}),
    ...updates,
    id,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from('email_templates')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('Error updating email template:', error);
    throw error;
  }
  return data;
}
