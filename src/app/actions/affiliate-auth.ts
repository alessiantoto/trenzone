'use server';

import { cookies, headers } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { rateLimiters, getClientIpFromHeaders, checkRateLimit } from '@/lib/ratelimit';
import crypto from 'crypto';

const AFFILIATE_COOKIE_NAME = 'affiliate_session';

function getAffiliateSigningSecret(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || 'trenzone-affiliate-hmac-secret';
}

function signAffiliatePayload(payloadBase64: string): string {
  const sig = crypto
    .createHmac('sha256', getAffiliateSigningSecret())
    .update(payloadBase64)
    .digest('hex');
  return `${payloadBase64}.${sig}`;
}

function verifyAffiliateToken(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadBase64, sig] = parts;
  if (!payloadBase64 || !sig) return null;
  const expectedSig = crypto
    .createHmac('sha256', getAffiliateSigningSecret())
    .update(payloadBase64)
    .digest('hex');
  try {
    const sigBuf = Buffer.from(sig, 'hex');
    const expectedBuf = Buffer.from(expectedSig, 'hex');
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;
    return Buffer.from(payloadBase64, 'base64').toString('utf-8');
  } catch {
    return null;
  }
}

export async function affiliateLoginAction(email: string, code: string) {
  try {
    // 🛡️ 1. Anti-Bot: Rate Limiting (Max 5 attempts per minute per IP)
    const headersList = await headers();
    const ip = getClientIpFromHeaders(headersList);
    const { allowed } = await checkRateLimit(rateLimiters.affiliateLogin, ip, 'affiliateLogin');
    if (!allowed) {
      return { 
        success: false, 
        error: 'Ai încercat de prea multe ori. Din motive de securitate, te rugăm să aștepți 1 minut înainte de a reîncerca.' 
      };
    }

    // 🛡️ 2. Input Sanitization & Anti-Injection Defense
    if (typeof email !== 'string' || typeof code !== 'string') {
      return { success: false, error: 'Date de autentificare invalide.' };
    }

    // Block injection patterns (HTML tags, script tags, SQL/PostgREST wildcards, suspicious characters)
    if (/[<>{}%_*(),]/i.test(email) || /[<>{}%_*(),]/i.test(code)) {
      return { success: false, error: 'Caractere nepermise detectate.' };
    }

    const cleanedEmail = email.trim().toLowerCase().slice(0, 150);
    const cleanedCode = code.trim().toUpperCase().slice(0, 50);

    // Validate email structure (strictly no PostgREST wildcards)
    if (!cleanedEmail || !/^[a-z0-9._+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(cleanedEmail)) {
      return { success: false, error: 'Adresă de email invalidă.' };
    }

    // Validate affiliate code format (alphanumeric with hyphens/underscores, 2 to 30 chars)
    if (!cleanedCode || !/^[A-Z0-9_-]{2,30}$/.test(cleanedCode)) {
      return { success: false, error: 'Formatul codului de afiliat este invalid.' };
    }

    // 🛡️ 3. Safe Database Lookup (wildcards stripped above)
    const { data: affiliate, error } = await supabaseAdmin
      .from('affiliates')
      .select('id, name, email, code, status, social_links')
      .ilike('email', cleanedEmail)
      .eq('code', cleanedCode)
      .maybeSingle();

    if (error || !affiliate) {
      return { success: false, error: 'Email sau cod incorect.' };
    }

    if (affiliate.status === 'pending') {
      return { 
        success: false, 
        error: 'Cererea ta de afiliere este în curs de revizuire. Vei fi notificat pe email odată ce contul este aprobat de un administrator.' 
      };
    }

    if (affiliate.status !== 'active') {
      return { 
        success: false, 
        error: 'Contul tău de afiliat nu este activ. Te rugăm să ne contactezi pentru detalii.' 
      };
    }

    // 🛡️ 4. Set Secure Session Cookie
    const cookieStore = await cookies();
    const sessionData = JSON.stringify({
      id: affiliate.id,
      name: affiliate.name,
      email: affiliate.email,
      code: affiliate.code,
      locale: affiliate.social_links?.locale || 'ro'
    });

    const encodedSession = signAffiliatePayload(Buffer.from(sessionData).toString('base64'));

    cookieStore.set(AFFILIATE_COOKIE_NAME, encodedSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/'
    });

    return { success: true, locale: affiliate.social_links?.locale || 'ro' };
  } catch (err: any) {
    console.error('Affiliate login error:', err);
    return { success: false, error: 'A apărut o eroare la conectare.' };
  }
}

export async function affiliateLogoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(AFFILIATE_COOKIE_NAME);
  return { success: true };
}

export async function getAffiliateSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(AFFILIATE_COOKIE_NAME);
  
  if (!sessionCookie?.value) return null;

  try {
    const decoded = verifyAffiliateToken(sessionCookie.value);
    if (!decoded) return null;
    const parsed = JSON.parse(decoded);
    if (!parsed || typeof parsed.id !== 'string' || typeof parsed.code !== 'string') {
      return null;
    }
    return parsed as {
      id: string;
      name: string;
      email: string;
      code: string;
      locale: string;
    };
  } catch (e) {
    return null;
  }
}
