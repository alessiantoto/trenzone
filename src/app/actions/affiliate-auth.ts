'use server';

import { cookies, headers } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { rateLimiters, getClientIpFromHeaders, checkRateLimit } from '@/lib/ratelimit';
import { tryAutoApprovePendingAffiliateOnLogin } from '@/lib/affiliate-auto-approve';
import {
  AFFILIATE_COOKIE_NAME,
  issueAffiliateOtpChallenge,
  parseSignedJsonToken,
  setAffiliateSessionCookie,
  verifyAffiliateOtpChallenge,
  verifyAffiliateToken,
} from '@/lib/affiliate-auth-core';

function resolveDevLocalOrigin(headersList: Headers): string | undefined {
  if (process.env.NODE_ENV === 'production') return undefined;
  const host = (headersList.get('x-forwarded-host') || headersList.get('host') || '').trim();
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host)) {
    return `http://${host}`;
  }
  return undefined;
}

export async function affiliateLoginAction(email: string, code: string, locale: string = 'ro') {
  const uiLocale: 'ro' | 'en' = locale === 'en' ? 'en' : 'ro';
  const isEn = uiLocale === 'en';
  try {
    // 1. Anti-Bot: Rate Limiting (Max 5 attempts per minute per IP)
    const headersList = await headers();
    const ip = getClientIpFromHeaders(headersList);
    const { allowed } = await checkRateLimit(rateLimiters.affiliateLogin, ip, 'affiliateLogin');
    if (!allowed) {
      return {
        success: false,
        error: isEn
          ? 'Too many attempts. For security reasons, please wait 1 minute before trying again.'
          : 'Ai încercat de prea multe ori. Din motive de securitate, te rugăm să aștepți 1 minut înainte de a reîncerca.',
      };
    }

    // 2. Input Sanitization & Anti-Injection Defense
    if (typeof email !== 'string' || typeof code !== 'string') {
      return { success: false, error: isEn ? 'Invalid login credentials.' : 'Date de autentificare invalide.' };
    }

    if (/[<>{}%*(),\\]/i.test(email) || /[<>{}%*(),\\]/i.test(code)) {
      return { success: false, error: isEn ? 'Disallowed characters detected.' : 'Caractere nepermise detectate.' };
    }

    const cleanedEmail = email.trim().toLowerCase().slice(0, 150);
    const cleanedCode = code.trim().toUpperCase().slice(0, 50);

    if (!cleanedEmail || !/^[a-z0-9._+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(cleanedEmail)) {
      return { success: false, error: isEn ? 'Invalid email address.' : 'Adresă de email invalidă.' };
    }

    if (!cleanedCode || !/^[A-Z0-9_-]{2,30}$/.test(cleanedCode)) {
      return { success: false, error: isEn ? 'Invalid affiliate code format.' : 'Formatul codului de afiliat este invalid.' };
    }

    const escapedEmail = cleanedEmail.replace(/[\\%_]/g, '\\$&');
    const escapedCode = cleanedCode.replace(/[\\%_]/g, '\\$&');

    // Secondary per-email rate limit
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
          : 'Prea multe încercări pentru acest cont. Te rugăm să aștepți 1 minut înainte de a reîncerca.',
      };
    }

    // 3. Safe Database Lookup
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
          : 'Cererea ta de afiliere este în curs de revizuire. Vei fi notificat pe email odată ce contul este aprobat de un administrator.',
      };
    }

    if (affiliate.status !== 'active') {
      return {
        success: false,
        error: isEn
          ? 'Your affiliate account is not active. Please contact us for details.'
          : 'Contul tău de afiliat nu este activ. Te rugăm să ne contactezi pentru detalii.',
      };
    }

    // 4. Issue & Email 6-Digit OTP + 1-Click Magic Link via Resend
    const challenge = await issueAffiliateOtpChallenge({
      affiliate,
      uiLocale,
      enforceResendCooldown: false,
      devRequestOrigin: resolveDevLocalOrigin(headersList),
    });

    if (!challenge.success) {
      return { success: false, error: challenge.error };
    }

    return {
      success: true,
      requiresOtp: true,
      challengeToken: challenge.challengeToken,
      maskedEmail: challenge.maskedEmail,
      locale: challenge.locale,
      cooldownSeconds: challenge.cooldownSeconds,
    };
  } catch (err: any) {
    console.error('Affiliate login error:', err);
    return {
      success: false,
      error: isEn ? 'An error occurred while signing in.' : 'A apărut o eroare la conectare.',
    };
  }
}

export async function verifyAffiliateOtpAction(
  challengeToken: string,
  otpCode: string,
  locale: string = 'ro'
) {
  const uiLocale: 'ro' | 'en' = locale === 'en' ? 'en' : 'ro';
  const isEn = uiLocale === 'en';

  try {
    const headersList = await headers();
    const ip = getClientIpFromHeaders(headersList);
    const { allowed } = await checkRateLimit(rateLimiters.affiliateLogin, `otp-verify:${ip}`, 'affiliateLogin');
    if (!allowed) {
      return {
        success: false,
        error: isEn
          ? 'Too many verification attempts. Please wait 1 minute before trying again.'
          : 'Prea multe încercări de verificare. Te rugăm să aștepți 1 minut.',
      };
    }

    const result = await verifyAffiliateOtpChallenge({
      challengeToken,
      otpCode,
      uiLocale,
    });

    if (!result.success) {
      return result;
    }

    const savedLocale = await setAffiliateSessionCookie(result.affiliate);
    return { success: true, locale: savedLocale };
  } catch (err) {
    console.error('Affiliate OTP verify error:', err);
    return {
      success: false,
      error: isEn ? 'Failed to verify code. Please try again.' : 'Eroare la verificarea codului. Reîncearcă.',
    };
  }
}

export async function resendAffiliateOtpAction(challengeToken: string, locale: string = 'ro') {
  const uiLocale: 'ro' | 'en' = locale === 'en' ? 'en' : 'ro';
  const isEn = uiLocale === 'en';

  try {
    const headersList = await headers();
    const ip = getClientIpFromHeaders(headersList);
    const { allowed } = await checkRateLimit(rateLimiters.affiliateLogin, `otp-resend:${ip}`, 'affiliateLogin');
    if (!allowed) {
      return {
        success: false,
        error: isEn
          ? 'Too many resend requests. Please wait 1 minute.'
          : 'Prea multe cereri de retrimitere. Așteaptă 1 minut.',
      };
    }

    const parsed = parseSignedJsonToken<{ aid: string; cid: string; email: string; exp: number }>(challengeToken);
    if (!parsed || !parsed.aid) {
      return {
        success: false,
        expired: true,
        error: isEn
          ? 'Your verification session expired. Please sign in again.'
          : 'Sesiunea de verificare a expirat. Te rugăm să te conectezi din nou.',
      };
    }

    const { data: affiliate } = await supabaseAdmin
      .from('affiliates')
      .select('id, name, email, code, status, social_links')
      .eq('id', parsed.aid)
      .maybeSingle();

    if (!affiliate || affiliate.status !== 'active') {
      return {
        success: false,
        error: isEn ? 'Affiliate account is not active.' : 'Contul de afiliat nu este activ.',
      };
    }

    const reissued = await issueAffiliateOtpChallenge({
      affiliate,
      uiLocale,
      enforceResendCooldown: true,
      devRequestOrigin: resolveDevLocalOrigin(headersList),
    });

    if (!reissued.success) {
      return {
        success: false,
        error: reissued.error,
        retryAfterSeconds: reissued.retryAfterSeconds,
      };
    }

    return {
      success: true,
      challengeToken: reissued.challengeToken,
      maskedEmail: reissued.maskedEmail,
      locale: reissued.locale,
      cooldownSeconds: reissued.cooldownSeconds,
    };
  } catch (err) {
    console.error('Affiliate OTP resend error:', err);
    return {
      success: false,
      error: isEn ? 'Could not resend verification code.' : 'Nu am putut retrimite codul de verificare.',
    };
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
      !parsed.email ||
      typeof parsed.exp !== 'number' ||
      Date.now() > parsed.exp
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
  } catch {
    return null;
  }
}
