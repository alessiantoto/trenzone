import crypto from 'crypto';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendAffiliateOtpEmail } from '@/lib/resend-service';
import { getSiteUrl } from '@/lib/site-config';

export const AFFILIATE_COOKIE_NAME = 'affiliate_session';
export const AFFILIATE_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 60; // 60 days
export const AFFILIATE_OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const AFFILIATE_OTP_RESEND_COOLDOWN_MS = 45 * 1000; // 45 seconds
export const AFFILIATE_OTP_MAX_ATTEMPTS = 5;

let ephemeralAffiliateSecret: string | null = null;

export interface AffiliateRecordSummary {
  id: string;
  name: string;
  email: string;
  code: string;
  status?: string | null;
  social_links?: any;
}

interface StoredAffiliateOtpChallenge {
  challengeId: string;
  otpHash: string;
  magicHash: string;
  expiresAt: number;
  lastSentAt: number;
  attempts: number;
  locale: 'ro' | 'en';
}

export function getAffiliateSigningSecret(): string {
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

export function signAffiliatePayload(payloadBase64: string): string {
  const sig = crypto
    .createHmac('sha256', getAffiliateSigningSecret())
    .update(payloadBase64)
    .digest('hex');
  return `${payloadBase64}.${sig}`;
}

export function verifyAffiliateToken(token: string): string | null {
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
    return Buffer.from(payloadBase64, 'base64url').toString('utf-8');
  } catch {
    return null;
  }
}

export function buildSignedJsonToken(payload: Record<string, unknown>): string {
  const b64 = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  return signAffiliatePayload(b64);
}

export function parseSignedJsonToken<T>(token: string): T | null {
  if (!token || typeof token !== 'string') return null;
  const decoded = verifyAffiliateToken(token);
  if (!decoded) return null;
  try {
    return JSON.parse(decoded) as T;
  } catch {
    return null;
  }
}

function hashChallengeSecret(challengeId: string, secret: string): string {
  return crypto
    .createHmac('sha256', getAffiliateSigningSecret())
    .update(`${challengeId}:${secret}`)
    .digest('hex');
}

function timingSafeHexEqual(aHex: string, bHex: string): boolean {
  try {
    const aBuf = Buffer.from(aHex, 'hex');
    const bBuf = Buffer.from(bHex, 'hex');
    if (aBuf.length === 0 || aBuf.length !== bBuf.length) return false;
    return crypto.timingSafeEqual(aBuf, bBuf);
  } catch {
    return false;
  }
}

function getOtpStorageKey(affiliateId: string): string {
  return `affiliate_login_otp:${affiliateId}`;
}

export function maskEmailAddress(email: string): string {
  const clean = email.trim().toLowerCase();
  const atIndex = clean.indexOf('@');
  if (atIndex <= 0) return clean;
  const local = clean.slice(0, atIndex);
  const domain = clean.slice(atIndex + 1);
  const prefix = local.slice(0, Math.min(2, local.length));
  return `${prefix}***@${domain}`;
}

export function buildAffiliateSessionCookieValue(affiliate: AffiliateRecordSummary): {
  encodedSession: string;
  savedLocale: 'ro' | 'en';
} {
  const savedLocale: 'ro' | 'en' = affiliate.social_links?.locale === 'en' ? 'en' : 'ro';
  const sessionData = JSON.stringify({
    id: affiliate.id,
    name: affiliate.name,
    email: affiliate.email,
    code: affiliate.code,
    locale: savedLocale,
    exp: Date.now() + AFFILIATE_SESSION_MAX_AGE_SECONDS * 1000,
  });

  const encodedSession = signAffiliatePayload(Buffer.from(sessionData, 'utf-8').toString('base64url'));
  return { encodedSession, savedLocale };
}

export function getAffiliateSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: AFFILIATE_SESSION_MAX_AGE_SECONDS,
    path: '/',
  };
}

export async function setAffiliateSessionCookie(affiliate: AffiliateRecordSummary): Promise<'ro' | 'en'> {
  const { encodedSession, savedLocale } = buildAffiliateSessionCookieValue(affiliate);
  const cookieStore = await cookies();
  cookieStore.set(AFFILIATE_COOKIE_NAME, encodedSession, getAffiliateSessionCookieOptions());
  return savedLocale;
}

export async function issueAffiliateOtpChallenge(params: {
  affiliate: AffiliateRecordSummary;
  uiLocale: 'ro' | 'en';
  enforceResendCooldown?: boolean;
  devRequestOrigin?: string;
}): Promise<
  | {
      success: true;
      challengeToken: string;
      maskedEmail: string;
      locale: 'ro' | 'en';
      cooldownSeconds: number;
    }
  | {
      success: false;
      error: string;
      retryAfterSeconds?: number;
    }
> {
  const { affiliate, uiLocale, enforceResendCooldown = false, devRequestOrigin } = params;
  const isEn = uiLocale === 'en';
  const storageKey = getOtpStorageKey(affiliate.id);

  if (enforceResendCooldown) {
    const { data: existingRow } = await supabaseAdmin
      .from('store_settings')
      .select('value')
      .eq('key', storageKey)
      .maybeSingle();

    const existing = existingRow?.value as Partial<StoredAffiliateOtpChallenge> | undefined;
    if (existing && typeof existing.lastSentAt === 'number') {
      const elapsed = Date.now() - existing.lastSentAt;
      if (elapsed < AFFILIATE_OTP_RESEND_COOLDOWN_MS) {
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((AFFILIATE_OTP_RESEND_COOLDOWN_MS - elapsed) / 1000)
        );
        return {
          success: false,
          retryAfterSeconds,
          error: isEn
            ? `Please wait ${retryAfterSeconds}s before requesting another code.`
            : `Te rugăm să aștepți ${retryAfterSeconds}s înainte de a retrimite codul.`,
        };
      }
    }
  }

  const challengeId = crypto.randomUUID();
  const otpCode = String(crypto.randomInt(100000, 1000000));
  const magicSecret = crypto.randomBytes(24).toString('hex');
  const now = Date.now();
  const expiresAt = now + AFFILIATE_OTP_TTL_MS;
  const emailLocale: 'ro' | 'en' = affiliate.social_links?.locale === 'en' ? 'en' : uiLocale;

  const challengeRecord: StoredAffiliateOtpChallenge = {
    challengeId,
    otpHash: hashChallengeSecret(challengeId, otpCode),
    magicHash: hashChallengeSecret(challengeId, magicSecret),
    expiresAt,
    lastSentAt: now,
    attempts: 0,
    locale: emailLocale,
  };

  const { error: upsertErr } = await supabaseAdmin
    .from('store_settings')
    .upsert({ key: storageKey, value: challengeRecord }, { onConflict: 'key' });

  if (upsertErr) {
    console.error('[AFFILIATE OTP] Failed saving OTP challenge:', upsertErr);
    return {
      success: false,
      error: isEn
        ? 'Could not start email verification. Please try again.'
        : 'Nu am putut iniția verificarea pe email. Te rugăm să reîncerci.',
    };
  }

  const magicToken = buildSignedJsonToken({
    aid: affiliate.id,
    cid: challengeId,
    tok: magicSecret,
    loc: emailLocale,
    exp: expiresAt,
  });

  const resolvedBaseUrl =
    process.env.NODE_ENV !== 'production' && devRequestOrigin
      ? devRequestOrigin.replace(/\/+$/, '')
      : getSiteUrl();

  const magicLinkUrl = `${resolvedBaseUrl}/api/affiliate/magic?token=${encodeURIComponent(magicToken)}`;

  try {
    await sendAffiliateOtpEmail({
      email: affiliate.email,
      name: affiliate.name || '',
      affiliateCode: affiliate.code,
      otpCode,
      magicLinkUrl,
      locale: emailLocale,
      expiresMinutes: 10,
    });
  } catch (mailErr) {
    await supabaseAdmin.from('store_settings').delete().eq('key', storageKey);
    console.error('[AFFILIATE OTP] Failed sending OTP email:', mailErr);
    return {
      success: false,
      error: isEn
        ? 'Could not send verification email. Please verify your email or try again shortly.'
        : 'Nu am putut trimite emailul cu codul de verificare. Te rugăm să reîncerci.',
    };
  }

  const challengeToken = buildSignedJsonToken({
    aid: affiliate.id,
    cid: challengeId,
    email: affiliate.email,
    exp: expiresAt,
  });

  return {
    success: true,
    challengeToken,
    maskedEmail: maskEmailAddress(affiliate.email),
    locale: emailLocale,
    cooldownSeconds: Math.ceil(AFFILIATE_OTP_RESEND_COOLDOWN_MS / 1000),
  };
}

export async function verifyAffiliateOtpChallenge(params: {
  challengeToken: string;
  otpCode: string;
  uiLocale: 'ro' | 'en';
}): Promise<
  | { success: true; affiliate: AffiliateRecordSummary }
  | { success: false; error: string; expired?: boolean }
> {
  const { challengeToken, otpCode, uiLocale } = params;
  const isEn = uiLocale === 'en';
  const parsed = parseSignedJsonToken<{ aid: string; cid: string; email: string; exp: number }>(challengeToken);

  if (!parsed || !parsed.aid || !parsed.cid || !parsed.exp || Date.now() > parsed.exp) {
    return {
      success: false,
      expired: true,
      error: isEn
        ? 'Your verification session expired. Please request a new code.'
        : 'Sesiunea de verificare a expirat. Te rugăm să ceri un cod nou.',
    };
  }

  const cleanOtp = otpCode.replace(/\D/g, '');
  if (!/^\d{6}$/.test(cleanOtp)) {
    return {
      success: false,
      error: isEn
        ? 'Please enter the 6-digit code sent to your email.'
        : 'Te rugăm să introduci codul de 6 cifre primit pe email.',
    };
  }

  const storageKey = getOtpStorageKey(parsed.aid);
  const { data: row } = await supabaseAdmin
    .from('store_settings')
    .select('value')
    .eq('key', storageKey)
    .maybeSingle();

  const stored = row?.value as StoredAffiliateOtpChallenge | undefined;
  if (!stored || stored.challengeId !== parsed.cid || Date.now() > stored.expiresAt) {
    if (stored && stored.challengeId === parsed.cid) {
      await supabaseAdmin.from('store_settings').delete().eq('key', storageKey);
    }
    return {
      success: false,
      expired: true,
      error: isEn
        ? 'This verification code has expired or was already used. Please request a new code.'
        : 'Codul de verificare a expirat sau a fost deja folosit. Cere un cod nou.',
    };
  }

  if (stored.attempts >= AFFILIATE_OTP_MAX_ATTEMPTS) {
    await supabaseAdmin.from('store_settings').delete().eq('key', storageKey);
    return {
      success: false,
      expired: true,
      error: isEn
        ? 'Too many incorrect codes. Please sign in again to receive a fresh code.'
        : 'Prea multe coduri greșite. Te rugăm să soliciți un cod nou.',
    };
  }

  const candidateHash = hashChallengeSecret(stored.challengeId, cleanOtp);
  if (!timingSafeHexEqual(candidateHash, stored.otpHash)) {
    const nextAttempts = stored.attempts + 1;
    if (nextAttempts >= AFFILIATE_OTP_MAX_ATTEMPTS) {
      await supabaseAdmin.from('store_settings').delete().eq('key', storageKey);
      return {
        success: false,
        expired: true,
        error: isEn
          ? 'Too many incorrect attempts. Please request a new verification code.'
          : 'Prea multe încercări greșite. Te rugăm să ceri un cod nou.',
      };
    }

    await supabaseAdmin
      .from('store_settings')
      .upsert(
        {
          key: storageKey,
          value: { ...stored, attempts: nextAttempts },
        },
        { onConflict: 'key' }
      );

    const left = AFFILIATE_OTP_MAX_ATTEMPTS - nextAttempts;
    return {
      success: false,
      error: isEn
        ? `Incorrect verification code (${left} attempt${left === 1 ? '' : 's'} left).`
        : `Cod de verificare incorect (mai ai ${left} încercări).`,
    };
  }

  // Valid OTP — consume single-use challenge immediately
  await supabaseAdmin.from('store_settings').delete().eq('key', storageKey);

  const { data: affiliate, error } = await supabaseAdmin
    .from('affiliates')
    .select('id, name, email, code, status, social_links')
    .eq('id', parsed.aid)
    .maybeSingle();

  if (error || !affiliate || affiliate.status !== 'active') {
    return {
      success: false,
      error: isEn
        ? 'Your affiliate account is no longer active.'
        : 'Contul tău de afiliat nu mai este activ.',
    };
  }

  return { success: true, affiliate };
}

export async function verifyAffiliateMagicToken(rawToken: string): Promise<
  | { ok: true; affiliate: AffiliateRecordSummary }
  | { ok: false; reason: 'expired' | 'invalid' | 'inactive'; locale: 'ro' | 'en' }
> {
  const parsed = parseSignedJsonToken<{
    aid: string;
    cid: string;
    tok: string;
    loc?: string;
    exp: number;
  }>(rawToken);

  const fallbackLocale: 'ro' | 'en' = parsed?.loc === 'en' ? 'en' : 'ro';

  if (!parsed || !parsed.aid || !parsed.cid || !parsed.tok || !parsed.exp) {
    return { ok: false, reason: 'invalid', locale: fallbackLocale };
  }

  if (Date.now() > parsed.exp) {
    return { ok: false, reason: 'expired', locale: fallbackLocale };
  }

  const storageKey = getOtpStorageKey(parsed.aid);
  const { data: row } = await supabaseAdmin
    .from('store_settings')
    .select('value')
    .eq('key', storageKey)
    .maybeSingle();

  const stored = row?.value as StoredAffiliateOtpChallenge | undefined;
  if (!stored || stored.challengeId !== parsed.cid) {
    return { ok: false, reason: 'expired', locale: fallbackLocale };
  }

  if (Date.now() > stored.expiresAt) {
    await supabaseAdmin.from('store_settings').delete().eq('key', storageKey);
    return { ok: false, reason: 'expired', locale: stored.locale || fallbackLocale };
  }

  const candidateHash = hashChallengeSecret(stored.challengeId, parsed.tok);
  if (!timingSafeHexEqual(candidateHash, stored.magicHash)) {
    return { ok: false, reason: 'invalid', locale: stored.locale || fallbackLocale };
  }

  await supabaseAdmin.from('store_settings').delete().eq('key', storageKey);

  const { data: affiliate, error } = await supabaseAdmin
    .from('affiliates')
    .select('id, name, email, code, status, social_links')
    .eq('id', parsed.aid)
    .maybeSingle();

  if (error || !affiliate || affiliate.status !== 'active') {
    return { ok: false, reason: 'inactive', locale: stored.locale || fallbackLocale };
  }

  return { ok: true, affiliate };
}

