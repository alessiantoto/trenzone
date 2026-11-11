'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { headers } from 'next/headers';
import { rateLimiters, getClientIpFromHeaders, checkRateLimit } from '@/lib/ratelimit';

export async function unsubscribeEmail(email: string, locale: string = 'ro'): Promise<{ success: boolean; error?: string }> {
  const isEn = locale === 'en';
  try {
    const headersList = await headers();
    const ip = getClientIpFromHeaders(headersList);
    const { allowed } = await checkRateLimit(rateLimiters.newsletter, `unsub:${ip}`, 'newsletter');
    if (!allowed) {
      return {
        success: false,
        error: isEn
          ? 'Too many attempts. Please wait a few minutes.'
          : 'Prea multe încercări. Te rugăm să aștepți câteva minute.'
      };
    }

    const cleanEmail = (email || '').toLowerCase().trim().slice(0, 150);
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { success: false, error: isEn ? 'Invalid email address.' : 'Adresă de email invalidă.' };
    }

    const { error } = await supabaseAdmin
      .from('unsubscribed_emails')
      .upsert({ email: cleanEmail, marketing: false });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error unsubscribing:', err);
    return { success: false, error: err.message };
  }
}

export async function isUnsubscribed(email: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('unsubscribed_emails')
      .select('marketing')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();
      
    if (error) throw error;
    if (data && data.marketing === false) {
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error checking unsubscribe status:', err);
    return false; // assume opt-in if error, or false to be safe. We assume false (not unsubscribed)
  }
}
