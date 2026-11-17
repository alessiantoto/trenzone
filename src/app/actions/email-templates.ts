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
    name: 'Livrare Programe Digitale (Cu PDF)',
    subject_ro: 'Programele tale digitale sunt gata — Comanda #{{order_id}}',
    subject_en: 'Your digital programs are ready — Order #{{order_id}}',
    heading_ro: 'PROGRAMELE TALE SUNT GATA',
    heading_en: 'YOUR DIGITAL PROGRAMS ARE READY',
    body_ro:
      'Mulțumim pentru comandă, {{name}}. Găsești fișierele PDF atașate direct la acest email și le poți descărca oricând din linkurile de mai jos.',
    body_en:
      'Thank you for your order, {{name}}. Your PDF files are attached directly to this email and you can also download them anytime using the buttons below.',
    cta_ro: 'DESCARCĂ PDF',
    cta_en: 'DOWNLOAD PDF',
  },
  {
    id: 'program-pending',
    name: 'Confirmare Program Digital (Fără PDF / În Curând)',
    subject_ro: 'Comanda #{{order_id}} confirmată — programele tale urmează',
    subject_en: 'Order #{{order_id}} confirmed — your programs are on the way',
    heading_ro: 'COMANDĂ CONFIRMATĂ · URMEAZĂ',
    heading_en: 'ORDER CONFIRMED · ON THE WAY',
    body_ro:
      'Mulțumim pentru comandă, {{name}}. Am înregistrat achiziția ta pentru programele de mai jos. Pregătim versiunile finale PDF și ți le trimitem automat pe această adresă imediat ce sunt gata.',
    body_en:
      'Thank you for your order, {{name}}. Your digital program purchase is confirmed. We are finalizing the PDF files and will send them automatically to this email address as soon as they are ready.',
    cta_ro: 'VEZI PROGRAMELE',
    cta_en: 'VIEW PROGRAMS',
  },
  {
    id: 'program-marketing',
    name: 'Marketing & Recomandare Programe Digitale (PDF)',
    subject_ro: 'Programe Digitale Oficiale: Food Plan, Training & Bench Program (PDF)',
    subject_en: 'Official Digital Programs: Food Plan, Training & Bench Program (PDF)',
    heading_ro: 'PROGRAME DIGITALE OFICIALE',
    heading_en: 'OFFICIAL DIGITAL PROGRAMS',
    body_ro:
      'Salut {{name}}, pe lângă echipamentul de sală, descoperă ghidurile oficiale în format PDF: Food Plan, Training Program și Bench Program, disponibile în Română și Engleză.',
    body_en:
      'Hi {{name}}, alongside your training gear, explore our official PDF guides: Food Plan, Training Program, and Bench Program, available in English and Romanian.',
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
