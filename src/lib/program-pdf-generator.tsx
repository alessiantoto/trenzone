import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { DigitalProgramLanguage } from '@/lib/programs';

export type SingleProgramKey = string;
export type ProgramFileSlot = string;

export type StoredProgramFiles = Record<string, string>;

const STORE_SETTING_KEY = 'digital_programs_files';

function getSigningSecret(): string {
  return (
    process.env.PROGRAM_DOWNLOAD_SECRET ||
    process.env.CSRF_SECRET ||
    process.env.ADMIN_PASSWORD_HASH ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'trenzone-digital-program-secret-v1'
  );
}

export function createProgramDownloadToken(
  orderId: string,
  programKey: SingleProgramKey,
  lang: DigitalProgramLanguage
): string {
  const payload = `${String(orderId).trim()}:${programKey}:${lang}`;
  return crypto
    .createHmac('sha256', getSigningSecret())
    .update(payload)
    .digest('hex')
    .slice(0, 32);
}

export function verifyProgramDownloadToken(
  orderId: string,
  programKey: SingleProgramKey,
  lang: DigitalProgramLanguage,
  token: string
): boolean {
  if (!orderId || !token) return false;
  const expected = createProgramDownloadToken(orderId, programKey, lang);
  try {
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(String(token).trim(), 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function getProgramDownloadUrl(
  baseUrl: string,
  orderId: string,
  programKey: SingleProgramKey,
  lang: DigitalProgramLanguage
): string {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const token = createProgramDownloadToken(orderId, programKey, lang);
  const params = new URLSearchParams({
    program: programKey,
    lang,
    order: String(orderId),
    token,
  });
  return `${cleanBase}/api/programs/download?${params.toString()}`;
}

export async function getStoredProgramFiles(): Promise<StoredProgramFiles> {
  try {
    const { data, error } = await supabaseAdmin
      .from('store_settings')
      .select('value')
      .eq('key', STORE_SETTING_KEY)
      .maybeSingle();

    if (error || !data?.value || typeof data.value !== 'object') {
      return {};
    }
    return data.value as StoredProgramFiles;
  } catch {
    return {};
  }
}

export async function saveStoredProgramFiles(files: StoredProgramFiles): Promise<boolean> {
  try {
    const existing = await getStoredProgramFiles();
    const merged: StoredProgramFiles = { ...existing, ...files };
    const { error } = await supabaseAdmin
      .from('store_settings')
      .upsert(
        {
          key: STORE_SETTING_KEY,
          value: merged,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );
    return !error;
  } catch {
    return false;
  }
}

export function getProgramAttachmentFilename(
  programKey: SingleProgramKey,
  lang: DigitalProgramLanguage
): string {
  const langUpper = lang.toUpperCase();
  if (programKey === 'food-plan') {
    return `Vlad-Tren-Food-Plan-${langUpper}.pdf`;
  }
  if (programKey === 'training-program') {
    return `Vlad-Tren-Training-Program-${langUpper}.pdf`;
  }
  if (programKey === 'bench-program') {
    return `Vlad-Tren-Bench-Program-${langUpper}.pdf`;
  }
  const safeSlugTitle = String(programKey || 'program')
    .replace(/[^a-z0-9-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('-');
  return `Vlad-Tren-${safeSlugTitle || 'Program'}-${langUpper}.pdf`;
}

export async function getStoredProgramFileUrl(
  programKey: SingleProgramKey,
  lang: DigitalProgramLanguage
): Promise<{ url: string; filename: string } | null> {
  const safeLang: DigitalProgramLanguage = lang === 'en' ? 'en' : 'ro';
  const slot: ProgramFileSlot = `${programKey}-${safeLang}`;
  const stored = await getStoredProgramFiles();
  const customUrl = stored[slot];
  if (customUrl && typeof customUrl === 'string' && customUrl.startsWith('http')) {
    return {
      url: customUrl,
      filename: getProgramAttachmentFilename(programKey, safeLang),
    };
  }
  return null;
}

/**
 * Loads the exact PDF uploaded by the Admin (from store_settings URL or public/programs/{slot}.pdf).
 * Returns null if no PDF file has been uploaded yet for that slot.
 */
export async function getProgramPdfBuffer(
  programKey: SingleProgramKey,
  lang: DigitalProgramLanguage
): Promise<{ buffer: Buffer; filename: string; source: 'custom_url' | 'local_public' } | null> {
  const safeLang: DigitalProgramLanguage = lang === 'en' ? 'en' : 'ro';
  const slot: ProgramFileSlot = `${programKey}-${safeLang}`;
  const filename = getProgramAttachmentFilename(programKey, safeLang);

  // 1. Check Admin-uploaded PDF URL in store_settings (strictly matching ordered language)
  try {
    const stored = await getStoredProgramFiles();
    const customUrl = stored[slot];
    if (customUrl && typeof customUrl === 'string' && customUrl.startsWith('http')) {
      const res = await fetch(customUrl, { cache: 'no-store' });
      if (res.ok) {
        const ab = await res.arrayBuffer();
        if (ab.byteLength > 0) {
          return {
            buffer: Buffer.from(ab),
            filename,
            source: 'custom_url',
          };
        }
      }
    }
  } catch (err) {
    console.warn(`[PROGRAM PDF] Error fetching uploaded PDF for ${slot}:`, err);
  }

  // 2. Check static file in public/programs/{slot}.pdf (strictly matching ordered language)
  try {
    const primaryLocalPath = path.join(process.cwd(), 'public', 'programs', `${slot}.pdf`);
    if (fs.existsSync(primaryLocalPath)) {
      const fileBuf = fs.readFileSync(primaryLocalPath);
      if (fileBuf.byteLength > 0) {
        return {
          buffer: fileBuf,
          filename,
          source: 'local_public',
        };
      }
    }
  } catch {
    // Ignore local fs error
  }

  console.warn(`[PROGRAM PDF] Missing PDF file for exact ordered language slot: ${slot}`);
  return null;
}
