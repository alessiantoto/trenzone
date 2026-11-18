'use server';

import { cookies, headers } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { rateLimiters, getClientIpFromHeaders, checkRateLimit } from '@/lib/ratelimit';
import { tryAutoApprovePendingAffiliateOnLogin } from '@/lib/affiliate-auto-approve';
import crypto from 'crypto';

const AFFILIATE_COOKIE_NAME = 'affiliate_session';

let ephemeralAffiliateSecret: string | null = null;

function getAffiliateSigningSecret(): string {
  const configured =
    process.env.AFFILIATE_SESSION_SECRET ||
    process.env.PROGRAM_DOWNLOAD_SECRET ||
    process.env.CSRF_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.STRIPE_SECRET_KEY;

  if (configured && configured.trim().length >= 16) {
    return configured.trim();
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('[AFFILIATE AUTH] Missing server signing secret environment variable.');
  }

  if (!ephemeralAffiliateSecret) {
    ephemeralAffiliateSecret = crypto.randomBytes(32).toString('hex');
  }
  return ephemeralAffiliateSecret;
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

export async function affiliateLoginAction(email: string, code: string, locale: string = 'ro') {
  const isEn = locale === 'en';
  try {
    // 🛡️ 1. Anti-Bot: Rate Limiting (Max 5 attempts per minute per IP)
    const headersList = await headers();
    const ip = getClientIpFromHeaders(headersList);
    const { allowed } = await checkRateLimit(rateLimiters.affiliateLogin, ip, 'affiliateLogin');
    if (!allowed) {
      return { 
        success: false, 
        error: isEn
          ? 'Too many attempts. For security reasons, please wait 1 minute before trying again.'
          : 'Ai încercat de prea multe ori. Din motive de securitate, te rugăm să aștepți 1 minut înainte de a reîncerca.' 
      };
    }

    // 🛡️ 2. Input Sanitization & Anti-Injection Defense
    if (typeof email !== 'string' || typeof code !== 'string') {
      return { success: false, error: isEn ? 'Invalid login credentials.' : 'Date de autentificare invalide.' };
    }

    // Block injection patterns (HTML/script/SQL syntax) while permitting valid email/code underscores
    if (/[<>{}%*(),\\]/i.test(email) || /[<>{}%*(),\\]/i.test(code)) {
      return { success: false, error: isEn ? 'Disallowed characters detected.' : 'Caractere nepermise detectate.' };
    }

    const cleanedEmail = email.trim().toLowerCase().slice(0, 150);
    const cleanedCode = code.trim().toUpperCase().slice(0, 50);

    // Validate email structure (strictly no PostgREST wildcards)
    if (!cleanedEmail || !/^[a-z0-9._+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(cleanedEmail)) {
      return { success: false, error: isEn ? 'Invalid email address.' : 'Adresă de email invalidă.' };
    }

    // Validate affiliate code format (alphanumeric with hyphens/underscores, 2 to 30 chars)
    if (!cleanedCode || !/^[A-Z0-9_-]{2,30}$/.test(cleanedCode)) {
      return { success: false, error: isEn ? 'Invalid affiliate code format.' : 'Formatul codului de afiliat este invalid.' };
    }

    const escapedEmail = cleanedEmail.replace(/[\\%_]/g, '\\$&');
    const escapedCode = cleanedCode.replace(/[\\%_]/g, '\\$&');

    // Secondary per-email rate limit to block distributed brute force against a target account
    const { allowed: emailAllowed } = await checkRateLimit(
      rateLimiters.affiliateLogin,
      `aff-email:${cleanedEmail}`,
      'affiliateLogin'
    );
    if (!emailAllowed) {
      return {
        success: false,
        error: isEn
          ? 'Too many attempts for this account. Please wait 1 minute before trying again.'
          : 'Prea multe încercări pentru acest cont. Te rugăm să aștepți 1 minut înainte de a reîncerca.'
      };
    }

    // 3. Safe Database Lookup (wildcards escaped above)
    let { data: affiliate, error } = await supabaseAdmin
      .from('affiliates')
      .select('id, name, email, code, status, social_links, requested_at')
      .ilike('email', escapedEmail)
      .ilike('code', escapedCode)
      .limit(1)
      .maybeSingle();

    if (error || !affiliate) {
      return { success: false, error: isEn ? 'Incorrect email or code.' : 'Email sau cod incorect.' };
    }

    if (affiliate.status === 'pending') {
      const autoResult = await tryAutoApprovePendingAffiliateOnLogin(affiliate).catch((autoErr) => {
        console.warn('[AFFILIATE AUTH] Auto-approval check on login failed:', autoErr);
        return { approved: false as const };
      });

      if (autoResult.approved) {
        if (autoResult.code && autoResult.code.toUpperCase() !== cleanedCode) {
          return {
            success: false,
            error: isEn
              ? 'Your affiliate account has been approved! Please check your email for your assigned active affiliate code.'
              : 'Contul tău de afiliat a fost aprobat! Verifică emailul pentru codul tău activ atribuit.',
          };
        }
        affiliate = {
          ...affiliate,
          status: 'active',
          code: autoResult.code || affiliate.code,
        };
      } else if ('alreadyClaimed' in autoResult && autoResult.alreadyClaimed) {
        const { data: refreshed } = await supabaseAdmin
          .from('affiliates')
          .select('id, name, email, code, status, social_links, requested_at')
          .eq('id', affiliate.id)
          .maybeSingle();
        if (refreshed && refreshed.status === 'active' && String(refreshed.code || '').toUpperCase() === cleanedCode) {
          affiliate = refreshed;
        }
      }
    }

    if (affiliate.status === 'pending') {
      return { 
        success: false, 
        error: isEn
          ? 'Your affiliate application is under review. You will be notified by email once approved by an administrator.'
          : 'Cererea ta de afiliere este în curs de revizuire. Vei fi notificat pe email odată ce contul este aprobat de un administrator.' 
      };
    }

    if (affiliate.status !== 'active') {
      return { 
        success: false, 
        error: isEn
          ? 'Your affiliate account is not active. Please contact us for details.'
          : 'Contul tău de afiliat nu este activ. Te rugăm să ne contactezi pentru detalii.' 
      };
    }

    // 🛡️ 4. Set Secure Session Cookie
    const savedLocale: 'ro' | 'en' = affiliate.social_links?.locale === 'en' ? 'en' : 'ro';
    const cookieStore = await cookies();
    const sessionData = JSON.stringify({
      id: affiliate.id,
      name: affiliate.name,
      email: affiliate.email,
      code: affiliate.code,
      locale: savedLocale
    });

    const encodedSession = signAffiliatePayload(Buffer.from(sessionData).toString('base64'));

    cookieStore.set(AFFILIATE_COOKIE_NAME, encodedSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/'
    });

    return { success: true, locale: savedLocale };
  } catch (err: any) {
    console.error('Affiliate login error:', err);
    return { success: false, error: isEn ? 'An error occurred while signing in.' : 'A apărut o eroare la conectare.' };
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
    if (
      !parsed ||
      typeof parsed.id !== 'string' ||
      !parsed.id ||
      typeof parsed.code !== 'string' ||
      !parsed.code ||
      typeof parsed.email !== 'string' ||
      !parsed.email
    ) {
      return null;
    }
    return {
      id: parsed.id,
      name: typeof parsed.name === 'string' ? parsed.name : '',
      email: parsed.email,
      code: parsed.code,
      locale: parsed.locale === 'en' ? ('en' as const) : ('ro' as const),
    };
  } catch (e) {
    return null;
  }
}
