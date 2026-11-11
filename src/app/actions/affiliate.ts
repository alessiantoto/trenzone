'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendContactMessage } from './contact';
import { rateLimiters, getClientIpFromHeaders, checkRateLimit } from '@/lib/ratelimit';
import { headers } from 'next/headers';

export async function submitAffiliateApplication(data: {
  name: string;
  email: string;
  socials: string[];
  message: string;
  preferredCode?: string;
  preferredLocale?: 'ro' | 'en';
  honeypot?: string;
  formLoadedAt?: number;
}) {
  try {
    // 🛡️ 1. Anti-Bot: Honeypot check (silently drop bots)
    if (data.honeypot && data.honeypot.trim().length > 0) {
      console.warn(`🤖 [BOT DETECTED] Honeypot filled in affiliate application: ${data.honeypot}`);
      return { success: true };
    }

    // 🛡️ 2. Anti-Bot: Submission timing check (humans take at least 2s to complete form)
    if (data.formLoadedAt && data.formLoadedAt > 0) {
      const elapsed = Date.now() - data.formLoadedAt;
      if (elapsed < 2000) {
        console.warn(`🤖 [BOT DETECTED] Affiliate form submitted unnaturally fast (${elapsed}ms)`);
        return { success: true };
      }
    }

    // 🛡️ 3. Anti-Bot: Rate Limiting per IP
    const headersList = await headers();
    const ip = getClientIpFromHeaders(headersList);
    const { allowed } = await checkRateLimit(rateLimiters.affiliate, ip, 'affiliate');
    if (!allowed) {
      return { 
        success: false, 
        error: 'Ai trimis prea multe solicitări într-un timp scurt. Te rugăm să aștepți câteva minute.' 
      };
    }

    // 🛡️ 4. Sanitize and validate inputs
    const cleanName = (data.name || '').trim().slice(0, 100);
    const cleanEmail = (data.email || '').trim().toLowerCase().slice(0, 150);
    const cleanMessage = (data.message || '').trim().slice(0, 2000);
    const cleanPreferredCode = (data.preferredCode || '').trim().toUpperCase().slice(0, 50);

    if (!cleanName || !cleanEmail) {
      return { success: false, error: 'Numele și adresa de email sunt obligatorii.' };
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { success: false, error: 'Adresa de email introdusă nu este validă.' };
    }

    // Trim, filter empty, limit to max 5 socials, each max 200 chars
    const socialLinks = (data.socials || [])
      .map(s => s.trim().slice(0, 200))
      .filter(s => s.length > 0)
      .slice(0, 5);

    if (socialLinks.length === 0) {
      return { success: false, error: 'Te rugăm să introduci cel puțin un cont de social media.' };
    }
    
    // Check if affiliate already applied
    const { data: existing } = await supabaseAdmin
      .from('affiliates')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existing) {
      return { success: false, error: 'Există deja o aplicație sau un cont de afiliat cu acest email.' };
    }

    // Prepare JSON for social links and message
    const socialLinksJson = {
      links: socialLinks,
      motivation: cleanMessage,
      locale: data.preferredLocale || 'ro'
    };

    // Insert into DB
    const { error } = await supabaseAdmin
      .from('affiliates')
      .insert({
        name: cleanName,
        email: cleanEmail,
        status: 'pending',
        code: cleanPreferredCode || null,
        commission_percent: 10,
        social_links: socialLinksJson,
        requested_at: new Date().toISOString()
      });

    if (error) {
      console.error("Failed to insert affiliate:", error);
      throw error;
    }

    // Send a backup email notification to admin (safe wrapped)
    try {
      await sendContactMessage({
        name: cleanName,
        email: cleanEmail,
        subject: "Nouă cerere de afiliere",
        message: `O nouă cerere de afiliere a fost trimisă.\n\nCod Dorit: ${cleanPreferredCode || 'Niciunul'}\nLimba preferată: ${data.preferredLocale === 'en' ? 'Engleză' : 'Română'}\nSocial Media: ${socialLinks.join(', ')}\n\nMesaj / Despre public:\n${cleanMessage}\n\n*Poți vedea și aproba această cerere direct din secțiunea Program Afiliați din panoul de admin.*`
      });
    } catch (emailErr) {
      console.warn("Could not send admin contact alert for affiliate application:", emailErr);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Affiliate submission failed:', err);
    return { success: false, error: 'A apărut o eroare la trimiterea cererii.' };
  }
}
