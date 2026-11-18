import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendAffiliateApprovalEmail } from '@/lib/resend-service';
import { getSiteUrl } from '@/lib/site-config';

export const AFFILIATE_AUTO_APPROVAL_SETTINGS_KEY = 'affiliate_auto_approval_settings';

export const ALLOWED_AUTO_APPROVAL_DELAYS = [0, 60, 120, 240, 360, 720, 1440] as const;

export interface AffiliateAutoApprovalSettings {
  enabled: boolean;
  delayMinutes: number;
  updatedAt?: string;
}

export interface AffiliateAutoApprovalSummary {
  pendingCount: number;
  scheduledCount: number;
  dueCount: number;
  nextDueAt: string | null;
}

export const DEFAULT_AFFILIATE_AUTO_APPROVAL_SETTINGS: AffiliateAutoApprovalSettings = {
  enabled: false,
  delayMinutes: 120,
};

export function escapeLike(val: string): string {
  return val.replace(/[\\%_]/g, '\\$&');
}

export function normalizeAffiliateAutoApprovalSettings(raw: unknown): AffiliateAutoApprovalSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_AFFILIATE_AUTO_APPROVAL_SETTINGS };
  }
  const obj = raw as Record<string, unknown>;
  const enabled = Boolean(obj.enabled);
  const rawDelay = Number(obj.delayMinutes);
  const delayMinutes =
    Number.isFinite(rawDelay) &&
    (ALLOWED_AUTO_APPROVAL_DELAYS as readonly number[]).includes(rawDelay)
      ? rawDelay
      : DEFAULT_AFFILIATE_AUTO_APPROVAL_SETTINGS.delayMinutes;

  const updatedAt = typeof obj.updatedAt === 'string' && obj.updatedAt.trim()
    ? obj.updatedAt
    : undefined;

  return {
    enabled,
    delayMinutes,
    ...(updatedAt ? { updatedAt } : {}),
  };
}

export async function getAffiliateAutoApprovalSettings(): Promise<AffiliateAutoApprovalSettings> {
  try {
    const { data, error } = await supabaseAdmin
      .from('store_settings')
      .select('value')
      .eq('key', AFFILIATE_AUTO_APPROVAL_SETTINGS_KEY)
      .maybeSingle();

    if (error || !data) {
      return { ...DEFAULT_AFFILIATE_AUTO_APPROVAL_SETTINGS };
    }
    return normalizeAffiliateAutoApprovalSettings(data.value);
  } catch (err) {
    console.warn('[AFFILIATE AUTO-APPROVE] Failed to load settings, using defaults:', err);
    return { ...DEFAULT_AFFILIATE_AUTO_APPROVAL_SETTINGS };
  }
}

export async function saveAffiliateAutoApprovalSettings(input: {
  enabled: boolean;
  delayMinutes: number;
}): Promise<AffiliateAutoApprovalSettings> {
  const normalized = normalizeAffiliateAutoApprovalSettings({
    enabled: input.enabled,
    delayMinutes: input.delayMinutes,
    updatedAt: new Date().toISOString(),
  });

  const { error } = await supabaseAdmin
    .from('store_settings')
    .upsert({
      key: AFFILIATE_AUTO_APPROVAL_SETTINGS_KEY,
      value: normalized,
    });

  if (error) {
    console.error('[AFFILIATE AUTO-APPROVE] Failed to save settings:', error);
    throw new Error(error.message);
  }

  return normalized;
}

export function getAffiliateDueAtMs(
  affiliate: {
    requested_at?: string | null;
    social_links?: any;
  },
  delayMinutes: number
): number | null {
  const explicitAt = affiliate.social_links?.auto_approve_at;
  if (typeof explicitAt === 'string' && explicitAt.trim()) {
    const parsedExplicit = Date.parse(explicitAt);
    if (Number.isFinite(parsedExplicit)) {
      return parsedExplicit;
    }
  }

  if (affiliate.requested_at) {
    const parsedRequested = Date.parse(affiliate.requested_at);
    if (Number.isFinite(parsedRequested)) {
      return parsedRequested + Math.max(0, delayMinutes) * 60_000;
    }
  }

  return null;
}

export function computeAutoApprovalSummary(
  pendingAffiliates: Array<{ requested_at?: string | null; social_links?: any }>,
  settings: AffiliateAutoApprovalSettings,
  nowMs: number = Date.now()
): AffiliateAutoApprovalSummary {
  const pendingCount = pendingAffiliates.length;
  if (!settings.enabled || pendingCount === 0) {
    return {
      pendingCount,
      scheduledCount: 0,
      dueCount: 0,
      nextDueAt: null,
    };
  }

  let scheduledCount = 0;
  let dueCount = 0;
  let earliestFutureMs: number | null = null;

  for (const aff of pendingAffiliates) {
    const dueMs = getAffiliateDueAtMs(aff, settings.delayMinutes);
    if (dueMs === null) continue;
    scheduledCount++;
    if (dueMs <= nowMs) {
      dueCount++;
    } else if (earliestFutureMs === null || dueMs < earliestFutureMs) {
      earliestFutureMs = dueMs;
    }
  }

  return {
    pendingCount,
    scheduledCount,
    dueCount,
    nextDueAt: earliestFutureMs !== null ? new Date(earliestFutureMs).toISOString() : null,
  };
}

export async function checkCodeConflict(cleanCode: string, excludeAffiliateId?: string): Promise<string | null> {
  let query = supabaseAdmin
    .from('affiliates')
    .select('id, name, email, status')
    .ilike('code', escapeLike(cleanCode));

  if (excludeAffiliateId) {
    query = query.neq('id', excludeAffiliateId);
  }

  const { data: conflicts, error } = await query.limit(1);
  if (error) {
    console.error('Code conflict check error:', error);
    return 'Eroare la verificarea unicității codului de afiliat.';
  }

  const conflict = conflicts?.[0];
  if (conflict && conflict.status !== 'rejected') {
    return `Codul "${cleanCode}" este deja atribuit afiliatului ${conflict.name} (${conflict.email}). Alege un cod unic.`;
  }

  // Prevent silently overwriting an existing standalone store promo coupon
  const { data: existingCoupon, error: couponErr } = await supabaseAdmin
    .from('coupons')
    .select('id, code')
    .ilike('code', escapeLike(cleanCode))
    .limit(1)
    .maybeSingle();

  if (couponErr) {
    console.error('Coupon conflict check error:', couponErr);
    return 'Eroare la verificarea codului de cupon în baza de date.';
  }

  if (existingCoupon) {
    let ownedByCurrentActiveAffiliate = false;
    if (excludeAffiliateId) {
      const { data: currentAff } = await supabaseAdmin
        .from('affiliates')
        .select('code, status')
        .eq('id', excludeAffiliateId)
        .maybeSingle();
      if (
        currentAff &&
        currentAff.status === 'active' &&
        String(currentAff.code || '').toUpperCase() === cleanCode.toUpperCase()
      ) {
        ownedByCurrentActiveAffiliate = true;
      }
    }
    if (!ownedByCurrentActiveAffiliate) {
      return `Codul "${cleanCode}" există deja ca și cupon promoțional în magazin. Alege un cod unic pentru afiliat.`;
    }
  }
  return null;
}

export async function ensureActiveAffiliateCoupon(cleanCode: string, commission: number): Promise<string | null> {
  const { data: existingCoupon, error: lookupErr } = await supabaseAdmin
    .from('coupons')
    .select('id, code, is_active')
    .ilike('code', escapeLike(cleanCode))
    .limit(1)
    .maybeSingle();

  if (lookupErr) {
    console.error('Coupon lookup error:', lookupErr);
    return `Eroare la verificarea cuponului în baza de date: ${lookupErr.message}`;
  }

  if (existingCoupon) {
    const { error: updateErr } = await supabaseAdmin
      .from('coupons')
      .update({ code: cleanCode, is_active: true, value: commission })
      .eq('id', existingCoupon.id);

    if (updateErr) {
      console.error('Coupon update error:', updateErr);
      return `Eroare la activarea cuponului "${cleanCode}": ${updateErr.message}`;
    }
  } else {
    const { error: insertErr } = await supabaseAdmin
      .from('coupons')
      .insert({
        code: cleanCode,
        type: 'percentage',
        value: commission,
        usage_limit: null,
        expires_at: null,
        is_active: true,
        used_count: 0,
        created_at: new Date().toISOString(),
      });

    if (insertErr) {
      console.error('Coupon insert error:', insertErr);
      return `Eroare la crearea cuponului "${cleanCode}": ${insertErr.message}`;
    }
  }

  return null;
}

export async function setCouponActiveState(code: string | null | undefined, isActive: boolean): Promise<void> {
  const cleanCode = (code || '').trim().toUpperCase();
  if (!cleanCode || !/^[A-Z0-9_-]{2,30}$/.test(cleanCode)) return;
  const { error } = await supabaseAdmin
    .from('coupons')
    .update({ is_active: isActive })
    .ilike('code', escapeLike(cleanCode));
  if (error) {
    console.warn(`Could not set coupon ${cleanCode} is_active=${isActive}:`, error);
  }
}

export async function resolveUniqueAffiliateCode(
  affiliateName: string,
  preferredCode: string | null | undefined,
  affiliateId: string
): Promise<string | null> {
  const cleanPreferred = (preferredCode || '').replace(/\s+/g, '').trim().toUpperCase();
  const candidates: string[] = [];

  if (/^[A-Z0-9_-]{2,30}$/.test(cleanPreferred)) {
    candidates.push(cleanPreferred);
    for (let i = 2; i <= 9; i++) {
      candidates.push(`${cleanPreferred.slice(0, 27)}_${i}`);
    }
  }

  const firstToken = (affiliateName.split(/\s+/)[0] || 'PARTNER')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 10);
  const baseName = firstToken.length >= 2 ? firstToken : 'PARTNER';

  candidates.push(`${baseName}10`);
  for (let i = 2; i <= 9; i++) {
    candidates.push(`${baseName}10_${i}`);
  }

  for (const candidate of candidates) {
    if (!/^[A-Z0-9_-]{2,30}$/.test(candidate)) continue;
    const conflict = await checkCodeConflict(candidate, affiliateId);
    if (!conflict) {
      return candidate;
    }
  }

  // Final random fallback attempts
  for (let attempt = 0; attempt < 6; attempt++) {
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const candidate = `${baseName.slice(0, 18)}_${suffix}`;
    const conflict = await checkCodeConflict(candidate, affiliateId);
    if (!conflict) {
      return candidate;
    }
  }

  return null;
}

export interface ApproveAffiliateCoreResult {
  success: boolean;
  skipped?: boolean;
  reason?: string;
  code?: string;
  commission?: number;
  emailSent?: boolean;
  emailError?: string;
  error?: string;
}

/**
 * Core affiliate approval logic shared between manual admin approval and automated approval.
 * When `requirePending` is true, performs an atomic status='pending' -> 'active' claim
 * so concurrent triggers cannot double-approve or double-email the same affiliate.
 */
export async function approveAffiliateCore(params: {
  affiliateId: string;
  codeOverride?: string;
  commissionOverride?: number;
  requirePending?: boolean;
}): Promise<ApproveAffiliateCoreResult> {
  const { affiliateId, codeOverride, commissionOverride, requirePending = false } = params;

  const { data: affiliate, error: fetchError } = await supabaseAdmin
    .from('affiliates')
    .select('id, email, name, code, commission_percent, status, social_links')
    .eq('id', affiliateId)
    .maybeSingle();

  if (fetchError || !affiliate) {
    console.error('[AFFILIATE APPROVE] Failed to fetch affiliate:', fetchError);
    return { success: false, error: 'Nu am putut prelua datele afiliatului.' };
  }

  if (requirePending && affiliate.status !== 'pending') {
    return { success: true, skipped: true, reason: 'already_claimed' };
  }

  const rawCommission =
    commissionOverride !== undefined
      ? Number(commissionOverride)
      : Number(affiliate.commission_percent ?? 10);
  const validCommission = Number.isFinite(rawCommission) && rawCommission >= 1 && rawCommission <= 50
    ? rawCommission
    : 10;

  if (commissionOverride !== undefined) {
    const explicitNum = Number(commissionOverride);
    if (!Number.isFinite(explicitNum) || explicitNum < 1 || explicitNum > 50) {
      return { success: false, error: 'Comisionul trebuie să fie între 1% și 50%.' };
    }
  }

  let cleanCode: string;
  if (codeOverride !== undefined) {
    cleanCode = (codeOverride || '').replace(/\s+/g, '').trim().toUpperCase();
    if (!/^[A-Z0-9_-]{2,30}$/.test(cleanCode)) {
      return {
        success: false,
        error: 'Codul de afiliat poate conține doar litere, cifre, liniuță și underscore (2-30 caractere).',
      };
    }
    const conflictErr = await checkCodeConflict(cleanCode, affiliateId);
    if (conflictErr) {
      return { success: false, error: conflictErr };
    }
  } else {
    const resolved = await resolveUniqueAffiliateCode(affiliate.name || '', affiliate.code, affiliateId);
    if (!resolved) {
      return { success: false, error: 'Nu s-a putut genera un cod unic de afiliat.' };
    }
    cleanCode = resolved;
  }

  const nowIso = new Date().toISOString();

  if (requirePending) {
    // Atomic claim on status='pending' before coupon activation & email
    const { data: claimedRows, error: claimError } = await supabaseAdmin
      .from('affiliates')
      .update({
        status: 'active',
        code: cleanCode,
        commission_percent: validCommission,
        activated_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', affiliateId)
      .eq('status', 'pending')
      .select('id');

    if (claimError) {
      console.error('[AFFILIATE AUTO-APPROVE] Atomic claim failed:', claimError);
      return { success: false, error: `Eroare la aprobarea afiliatului: ${claimError.message}` };
    }

    if (!claimedRows || claimedRows.length === 0) {
      return { success: true, skipped: true, reason: 'already_claimed' };
    }

    const couponErr = await ensureActiveAffiliateCoupon(cleanCode, validCommission);
    if (couponErr) {
      // Roll back pending status if coupon creation failed
      await supabaseAdmin
        .from('affiliates')
        .update({
          status: 'pending',
          code: affiliate.code ?? null,
          activated_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', affiliateId)
        .eq('status', 'active');
      return { success: false, error: couponErr };
    }
  } else {
    const couponErr = await ensureActiveAffiliateCoupon(cleanCode, validCommission);
    if (couponErr) {
      return { success: false, error: couponErr };
    }

    const { error } = await supabaseAdmin
      .from('affiliates')
      .update({
        status: 'active',
        code: cleanCode,
        commission_percent: validCommission,
        activated_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', affiliateId);

    if (error) {
      console.error('[AFFILIATE APPROVE] Failed to approve affiliate:', error);
      return { success: false, error: `A apărut o eroare la aprobarea afiliatului: ${error.message}` };
    }
  }

  const locale: 'ro' | 'en' = affiliate.social_links?.locale === 'en' ? 'en' : 'ro';
  const baseUrl = getSiteUrl();
  const loginUrl = `${baseUrl}/${locale}/affiliate/login`;

  let emailSent = true;
  let emailError: string | undefined;
  try {
    await sendAffiliateApprovalEmail(
      affiliate.email,
      affiliate.name,
      cleanCode,
      locale,
      loginUrl,
      validCommission
    );
  } catch (err: any) {
    emailSent = false;
    emailError = err?.message || String(err);
    console.error('[AFFILIATE APPROVE] Failed to send approval email, but affiliate was approved:', emailError);
  }

  return {
    success: true,
    code: cleanCode,
    commission: validCommission,
    emailSent,
    emailError,
  };
}

export interface ProcessDueAutoApprovalsResult {
  enabled: boolean;
  checked: number;
  due: number;
  approved: number;
  skipped: number;
  failed: number;
  emailFailures: number;
  approvedIds: string[];
}

export async function processDueAffiliateAutoApprovals(options?: {
  maxBatch?: number;
}): Promise<ProcessDueAutoApprovalsResult> {
  const settings = await getAffiliateAutoApprovalSettings();
  if (!settings.enabled) {
    return {
      enabled: false,
      checked: 0,
      due: 0,
      approved: 0,
      skipped: 0,
      failed: 0,
      emailFailures: 0,
      approvedIds: [],
    };
  }

  const { data: pendingRows, error } = await supabaseAdmin
    .from('affiliates')
    .select('id, requested_at, social_links')
    .eq('status', 'pending')
    .order('requested_at', { ascending: true });

  if (error || !pendingRows || pendingRows.length === 0) {
    if (error) {
      console.error('[AFFILIATE AUTO-APPROVE] Failed to query pending affiliates:', error);
    }
    return {
      enabled: true,
      checked: 0,
      due: 0,
      approved: 0,
      skipped: 0,
      failed: 0,
      emailFailures: 0,
      approvedIds: [],
    };
  }

  const nowMs = Date.now();
  const dueRows = pendingRows.filter((row) => {
    const dueMs = getAffiliateDueAtMs(row, settings.delayMinutes);
    return dueMs !== null && dueMs <= nowMs;
  });

  const maxBatch = Math.max(1, options?.maxBatch ?? 25);
  const batch = dueRows.slice(0, maxBatch);

  let approved = 0;
  let skipped = 0;
  let failed = 0;
  let emailFailures = 0;
  const approvedIds: string[] = [];

  for (let i = 0; i < batch.length; i++) {
    const row = batch[i];
    const res = await approveAffiliateCore({
      affiliateId: row.id,
      requirePending: true,
    });

    if (res.skipped) {
      skipped++;
      continue;
    }

    if (res.success) {
      approved++;
      approvedIds.push(row.id);
      if (res.emailSent === false) {
        emailFailures++;
      }
      // Wait 700ms between emails in batch mode to stay safely under Resend's 2 req/sec limit
      if (i < batch.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 700));
      }
    } else {
      failed++;
    }
  }

  return {
    enabled: true,
    checked: pendingRows.length,
    due: dueRows.length,
    approved,
    skipped,
    failed,
    emailFailures,
    approvedIds,
  };
}

export async function tryAutoApprovePendingAffiliateOnLogin(affiliate: {
  id: string;
  code?: string | null;
  status?: string | null;
  requested_at?: string | null;
  social_links?: any;
}): Promise<{ approved: boolean; alreadyClaimed?: boolean; code?: string }> {
  if (affiliate.status !== 'pending') {
    return { approved: false };
  }

  const settings = await getAffiliateAutoApprovalSettings();
  if (!settings.enabled) {
    return { approved: false };
  }

  const dueMs = getAffiliateDueAtMs(affiliate, settings.delayMinutes);
  if (dueMs === null || dueMs > Date.now()) {
    return { approved: false };
  }

  const res = await approveAffiliateCore({
    affiliateId: affiliate.id,
    requirePending: true,
  });

  if (res.skipped && res.reason === 'already_claimed') {
    return { approved: false, alreadyClaimed: true };
  }

  return {
    approved: Boolean(res.success && !res.skipped),
    code: res.code,
  };
}
