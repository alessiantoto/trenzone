'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendContactMessage } from './contact';
import { sendAffiliateApplicationReceivedEmail } from '@/lib/resend-service';
import { getSiteUrl } from '@/lib/site-config';
import { rateLimiters, getClientIpFromHeaders, checkRateLimit } from '@/lib/ratelimit';
import { headers } from 'next/headers';

function escapeLike(val: string): string {
  return val.replace(/[\\%_]/g, '\\$&');
}

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
    const isEn = data.preferredLocale === 'en';
    const headersList = await headers();
    const ip = getClientIpFromHeaders(headersList);
    const { allowed } = await checkRateLimit(rateLimiters.affiliate, ip, 'affiliate');
    if (!allowed) {
      return { 
        success: false, 
        error: isEn
          ? 'You have sent too many requests in a short time. Please wait a few minutes.'
          : 'Ai trimis prea multe solicitări într-un timp scurt. Te rugăm să aștepți câteva minute.' 
      };
    }

    // 🛡️ 4. Sanitize and validate inputs
    const cleanName = (data.name || '').trim().slice(0, 100);
    const cleanEmail = (data.email || '').trim().toLowerCase().slice(0, 150);
    const cleanMessage = (data.message || '').trim().slice(0, 2000);
    const cleanPreferredCode = (data.preferredCode || '').replace(/\s+/g, '').trim().toUpperCase().slice(0, 30);

    if (!cleanName || !cleanEmail) {
      return { success: false, error: isEn ? 'Name and email address are required.' : 'Numele și adresa de email sunt obligatorii.' };
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { success: false, error: isEn ? 'The email address entered is not valid.' : 'Adresa de email introdusă nu este validă.' };
    }

    if (cleanPreferredCode && !/^[A-Z0-9_-]{2,30}$/.test(cleanPreferredCode)) {
      return {
        success: false,
        error: isEn
          ? 'Desired discount code must be 2-30 characters using only letters, numbers, "-" or "_".'
          : 'Codul dorit trebuie să conțină 2-30 caractere (doar litere, cifre, "-" sau "_").'
      };
    }

    // Trim, filter empty, reject dangerous URI schemes, limit to max 5 socials, each max 200 chars
    const socialLinks = (Array.isArray(data.socials) ? data.socials : [])
      .map(s => String(s || '').trim().slice(0, 200))
      .filter(s => s.length > 0 && !/^(javascript|data|vbscript):/i.test(s))
      .slice(0, 5);

    if (socialLinks.length === 0) {
      return { success: false, error: isEn ? 'Please enter at least one social media account.' : 'Te rugăm să introduci cel puțin un cont de social media.' };
    }
    
    // Check if affiliate already applied (case-insensitive)
    const { data: existing } = await supabaseAdmin
      .from('affiliates')
      .select('id')
      .ilike('email', escapeLike(cleanEmail))
      .limit(1)
      .maybeSingle();

    if (existing) {
      return { success: false, error: isEn ? 'An affiliate application or account with this email already exists.' : 'Există deja o aplicație sau un cont de afiliat cu acest email.' };
    }

    if (cleanPreferredCode) {
      const { data: existingCodeAff } = await supabaseAdmin
        .from('affiliates')
        .select('id')
        .eq('status', 'active')
        .ilike('code', escapeLike(cleanPreferredCode))
        .limit(1)
        .maybeSingle();

      if (existingCodeAff) {
        return {
          success: false,
          error: isEn
            ? `The desired code "${cleanPreferredCode}" is already taken by another partner. Please choose a different code or leave it blank.`
            : `Codul dorit "${cleanPreferredCode}" este deja folosit de un alt partener. Te rugăm să alegi alt cod sau să lași câmpul gol.`
        };
      }
    }

    const appLocale: 'ro' | 'en' = data.preferredLocale === 'en' ? 'en' : 'ro';

    // Prepare JSON for social links and message
    const socialLinksJson = {
      links: socialLinks,
      motivation: cleanMessage,
      locale: appLocale
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

    const baseUrl = getSiteUrl();
    const loginUrl = `${baseUrl}/${appLocale}/affiliate/login`;

    // Send confirmation email to applicant & alert to admin (safe wrapped, non-fatal)
    await Promise.allSettled([
      sendAffiliateApplicationReceivedEmail(cleanEmail, cleanName, cleanPreferredCode, appLocale, loginUrl).catch((appEmailErr) => {
        console.warn("Could not send applicant confirmation email:", appEmailErr);
      }),
      sendContactMessage({
        name: cleanName,
        email: cleanEmail,
        subject: "Nouă cerere de afiliere",
        message: `O nouă cerere de afiliere a fost trimisă.\n\nCod Dorit: ${cleanPreferredCode || 'Niciunul'}\nLimba preferată: ${appLocale === 'en' ? 'Engleză' : 'Română'}\nSocial Media: ${socialLinks.join(', ')}\n\nMesaj / Despre public:\n${cleanMessage}\n\n*Poți vedea și aproba această cerere direct din secțiunea Program Afiliați din panoul de admin.*`
      }).catch((adminEmailErr) => {
        console.warn("Could not send admin contact alert for affiliate application:", adminEmailErr);
      })
    ]);

    return { success: true };
  } catch (err: any) {
    console.error('Affiliate submission failed:', err);
    return {
      success: false,
      error: data.preferredLocale === 'en'
        ? 'An error occurred while submitting your application.'
        : 'A apărut o eroare la trimiterea cererii.'
    };
  }
}
