'use server';

import { isAdminAuthorized } from './admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { uploadToR2, deleteFromR2, getR2PublicBaseUrl } from '@/lib/r2';
import { revalidatePath } from 'next/cache';
import {
  getStoredProgramFiles,
  saveStoredProgramFiles,
  type ProgramFileSlot,
  type StoredProgramFiles,
} from '@/lib/program-pdf-generator';
import {
  isDigitalProgramItem,
  isDigitalBundleItem,
  hasAnyDigitalProgram,
  resolveOrderEmailLocale,
  resolveOrderedPrograms,
  sanitizeProgramSlug,
  PROGRAM_SLUGS,
  PROGRAM_UUIDS,
} from '@/lib/programs';
import { getCanonicalOrderNumber } from '@/utils/admin-helpers';
import { sendProgramDeliveryEmail } from '@/lib/resend-service';
import { dispatchWaitingProgramOrders, hasPdfSlotAvailable } from '@/lib/program-delivery-queue';
import { getProductsServer } from './products';

export interface AdminProgramPdfSlot {
  slot: ProgramFileSlot;
  label: string;
  programTitle: string;
  lang: 'en' | 'ro';
}

const VALID_SLOT_REGEX = /^[a-z0-9][a-z0-9-]{1,100}-(ro|en)$/;

function buildProgramPdfStorageKey(slot: string, originalFileName?: string | null): string {
  const cleanBase = String(originalFileName || '')
    .replace(/\.pdf$/i, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  const ts = Date.now();
  return cleanBase
    ? `programs/${slot}-${ts}__${cleanBase}.pdf`
    : `programs/${slot}-${ts}.pdf`;
}

async function deleteProgramStorageFileByUrl(url: string | undefined | null): Promise<void> {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) return;
  try {
    const cleanUrl = url.split('?')[0].split('#')[0];
    const r2Base = getR2PublicBaseUrl();

    if ((r2Base && cleanUrl.startsWith(r2Base)) || cleanUrl.includes('.r2.dev/')) {
      let key = cleanUrl;
      if (r2Base && cleanUrl.startsWith(r2Base)) {
        key = cleanUrl.slice(r2Base.length).replace(/^\/+/, '');
      } else {
        const idx = cleanUrl.indexOf('.r2.dev/');
        if (idx !== -1) key = cleanUrl.slice(idx + '.r2.dev/'.length);
      }
      if (key) {
        await deleteFromR2(key).catch(() => {});
      }
      return;
    }

    const supaMarker = '/storage/v1/object/public/products/';
    const supaIdx = cleanUrl.indexOf(supaMarker);
    if (supaIdx !== -1) {
      const relativePath = decodeURIComponent(cleanUrl.slice(supaIdx + supaMarker.length)).replace(/^\/+/, '');
      if (relativePath) {
        await supabaseAdmin.storage.from('products').remove([relativePath]).catch(() => {});
      }
    }
  } catch (err) {
    console.warn('[PROGRAM PDF] Failed deleting previous storage asset:', err);
  }
}

async function cleanupOrphanSlotFiles(slot: string, keepUrl: string | null): Promise<void> {
  try {
    const { data: listed } = await supabaseAdmin.storage
      .from('products')
      .list('programs', { limit: 100 });
    if (!listed || listed.length === 0) return;

    const keepFile = keepUrl ? keepUrl.split('?')[0].split('#')[0].split('/').pop() : null;
    const prefix = `${slot}-`;
    const toRemove = listed
      .map((f) => f.name)
      .filter((name) => name.startsWith(prefix) && name !== keepFile)
      .map((name) => `programs/${name}`);

    if (toRemove.length > 0) {
      await supabaseAdmin.storage.from('products').remove(toRemove).catch(() => {});
    }
  } catch {}
}

export async function getProgramFilesAction(): Promise<{
  success: boolean;
  files: StoredProgramFiles;
  slots: AdminProgramPdfSlot[];
}> {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) {
    return { success: false, files: {}, slots: [] };
  }
  const [files, products] = await Promise.all([
    getStoredProgramFiles(),
    getProductsServer().catch(() => []),
  ]);

  const slots: AdminProgramPdfSlot[] = [
    { slot: 'food-plan-en', label: 'Food Plan — English (PDF)', programTitle: 'Food Plan', lang: 'en' },
    { slot: 'food-plan-ro', label: 'Food Plan — Română (PDF)', programTitle: 'Food Plan', lang: 'ro' },
    { slot: 'training-program-en', label: 'Training Program — English (PDF)', programTitle: 'Training Program', lang: 'en' },
    { slot: 'training-program-ro', label: 'Training Program — Română (PDF)', programTitle: 'Training Program', lang: 'ro' },
    { slot: 'bench-program-en', label: 'Bench Program — English (PDF)', programTitle: 'Bench Program', lang: 'en' },
    { slot: 'bench-program-ro', label: 'Bench Program — Română (PDF)', programTitle: 'Bench Program', lang: 'ro' },
  ];

  const builtInIds = new Set<string>([
    PROGRAM_UUIDS.FOOD_PLAN,
    PROGRAM_SLUGS.FOOD_PLAN,
    PROGRAM_UUIDS.TRAINING_PROGRAM,
    PROGRAM_SLUGS.TRAINING_PROGRAM,
    PROGRAM_UUIDS.BENCH_PROGRAM,
    PROGRAM_SLUGS.BENCH_PROGRAM,
    PROGRAM_UUIDS.BUNDLE,
    PROGRAM_SLUGS.BUNDLE,
    'food-plan',
    'training-program',
    'bench-program',
  ]);

  for (const prod of products) {
    if (!isDigitalProgramItem(prod) || isDigitalBundleItem(prod)) continue;
    const key = sanitizeProgramSlug(prod.slug || prod.id);
    if (!key || builtInIds.has(prod.id) || builtInIds.has(prod.slug) || builtInIds.has(key)) continue;
    const title =
      (typeof prod.name === 'object' ? prod.name.ro || prod.name.en : prod.name) ||
      key;
    slots.push(
      { slot: `${key}-en`, label: `${title} — English (PDF)`, programTitle: String(title), lang: 'en' },
      { slot: `${key}-ro`, label: `${title} — Română (PDF)`, programTitle: String(title), lang: 'ro' }
    );
  }

  return { success: true, files, slots };
}

export async function createProgramPdfSignedUploadAction(
  slot: ProgramFileSlot,
  originalFileName?: string
): Promise<{
  success: boolean;
  path?: string;
  token?: string;
  publicUrl?: string;
  error?: string;
}> {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) {
    return { success: false, error: 'Neautorizat.' };
  }

  const cleanSlot = String(slot || '').trim().toLowerCase() as ProgramFileSlot;
  if (!VALID_SLOT_REGEX.test(cleanSlot)) {
    return { success: false, error: 'Slot invalid pentru programul digital.' };
  }

  const fileName = buildProgramPdfStorageKey(cleanSlot, originalFileName);
  const { data, error } = await supabaseAdmin.storage
    .from('products')
    .createSignedUploadUrl(fileName, { upsert: true });

  if (error || !data?.path || !data?.token) {
    return {
      success: false,
      error: error?.message || 'Nu s-a putut genera link-ul de încărcare PDF.',
    };
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from('products')
    .getPublicUrl(fileName);

  return {
    success: true,
    path: data.path,
    token: data.token,
    publicUrl: publicUrlData.publicUrl,
  };
}

export async function uploadProgramPdfAction(formData: FormData): Promise<{
  success: boolean;
  slot?: ProgramFileSlot;
  url?: string;
  autoDispatchedCount?: number;
  autoFailedCount?: number;
  error?: string;
}> {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) {
    return { success: false, error: 'Neautorizat.' };
  }

  const slot = String(formData.get('slot') || '').trim().toLowerCase() as ProgramFileSlot;
  if (!VALID_SLOT_REGEX.test(slot)) {
    return { success: false, error: 'Slot invalid pentru programul digital.' };
  }

  const existingFiles = await getStoredProgramFiles();
  const previousUrl = existingFiles[slot];

  const customUrl = String(formData.get('customUrl') || '').trim();
  if (customUrl && customUrl.startsWith('http')) {
    const saved = await saveStoredProgramFiles({ [slot]: customUrl });
    if (!saved) {
      return { success: false, error: 'Nu s-a putut salva link-ul PDF în store_settings.' };
    }
    if (previousUrl && previousUrl !== customUrl) {
      await deleteProgramStorageFileByUrl(previousUrl);
    }
    await cleanupOrphanSlotFiles(slot, customUrl);
    const waitingDispatch = await dispatchWaitingProgramOrders({ triggerSlot: slot });
    revalidatePath('/admin/emails');
    revalidatePath('/admin/products');
    revalidatePath('/admin/programs');
    return {
      success: true,
      slot,
      url: customUrl,
      autoDispatchedCount: waitingDispatch.sentCount,
      autoFailedCount: waitingDispatch.failedCount,
    };
  }

  const pdfFile = formData.get('file') as File | null;
  if (!pdfFile || pdfFile.size === 0) {
    return { success: false, error: 'Te rugăm să selectezi un fișier PDF.' };
  }

  const ext = (pdfFile.name.split('.').pop() || '').toLowerCase();
  if (ext !== 'pdf' && pdfFile.type !== 'application/pdf') {
    return { success: false, error: 'Format invalid. Sunt acceptate doar fișiere .PDF.' };
  }

  const bytes = await pdfFile.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const fileName = buildProgramPdfStorageKey(slot, pdfFile.name);
  const r2Base = getR2PublicBaseUrl();

  let uploadedUrl = '';

  try {
    if (process.env.R2_BUCKET_NAME && r2Base) {
      uploadedUrl = await uploadToR2(buffer, fileName, 'application/pdf');
    } else {
      const { error: uploadError } = await supabaseAdmin.storage
        .from('products')
        .upload(fileName, buffer, {
          upsert: true,
          contentType: 'application/pdf',
        });

      if (uploadError) {
        return {
          success: false,
          error: `Eroare la încărcarea PDF-ului în Storage: ${uploadError.message}`,
        };
      }
      const { data: publicUrlData } = supabaseAdmin.storage
        .from('products')
        .getPublicUrl(fileName);
      uploadedUrl = publicUrlData.publicUrl;
    }

    const saved = await saveStoredProgramFiles({ [slot]: uploadedUrl });
    if (!saved) {
      await deleteProgramStorageFileByUrl(uploadedUrl);
      return { success: false, error: 'PDF-ul a fost urcat, dar nu s-a putut salva în store_settings.' };
    }

    if (previousUrl && previousUrl !== uploadedUrl) {
      await deleteProgramStorageFileByUrl(previousUrl);
    }
    await cleanupOrphanSlotFiles(slot, uploadedUrl);

    const waitingDispatch = await dispatchWaitingProgramOrders({ triggerSlot: slot });

    revalidatePath('/admin/emails');
    revalidatePath('/admin/products');
    revalidatePath('/admin/programs');
    return {
      success: true,
      slot,
      url: uploadedUrl,
      autoDispatchedCount: waitingDispatch.sentCount,
      autoFailedCount: waitingDispatch.failedCount,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Eroare neașteptată la încărcarea fișierului PDF.',
    };
  }
}

export async function removeProgramPdfSlotAction(slot: ProgramFileSlot): Promise<{ success: boolean; error?: string }> {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) return { success: false, error: 'Neautorizat.' };
  const cleanSlot = String(slot || '').trim().toLowerCase() as ProgramFileSlot;
  if (!VALID_SLOT_REGEX.test(cleanSlot)) return { success: false, error: 'Slot invalid.' };

  try {
    const existing = await getStoredProgramFiles();
    const removedUrl = existing[cleanSlot];
    const next = { ...existing };
    delete next[cleanSlot];
    const { error } = await supabaseAdmin
      .from('store_settings')
      .upsert(
        {
          key: 'digital_programs_files',
          value: next,
        },
        { onConflict: 'key' }
      );
    if (error) return { success: false, error: error.message };

    if (removedUrl) {
      await deleteProgramStorageFileByUrl(removedUrl);
    }
    await cleanupOrphanSlotFiles(cleanSlot, null);

    revalidatePath('/admin/emails');
    revalidatePath('/admin/products');
    revalidatePath('/admin/programs');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Eroare la ștergerea slotului PDF.' };
  }
}

export interface AdminProgramLineItem {
  programKey: string;
  lang: 'ro' | 'en';
  slot: string;
  title: string;
  hasPdfNow: boolean;
}

export interface AdminProgramOrderRow {
  supabaseId: string;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  locale: 'ro' | 'en';
  paymentMethod: string;
  status: string;
  totalAmount: number;
  currency: string;
  isDigitalOnly: boolean;
  programs: AdminProgramLineItem[];
  readyCount: number;
  missingCount: number;
  deliveryMeta: {
    status?: 'delivered' | 'pending_pdf' | 'partial';
    emailType?: 'program-delivery' | 'program-pending';
    lastSentAt?: string;
    trigger?: 'auto' | 'manual';
    deliveredCount?: number;
    pendingCount?: number;
  } | null;
  lastEmailLog: {
    type: string;
    status: string;
    subject: string;
    createdAt: string;
    errorMessage: string | null;
  } | null;
}

export async function getAdminProgramOrdersAction(): Promise<{
  success: boolean;
  orders: AdminProgramOrderRow[];
  files: StoredProgramFiles;
  slots: AdminProgramPdfSlot[];
  availableSlots: Record<string, boolean>;
  error?: string;
}> {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) {
    return { success: false, orders: [], files: {}, slots: [], availableSlots: {}, error: 'Neautorizat.' };
  }

  try {
    const [{ data: rawOrders, error }, filesRes, { data: emailLogs }] = await Promise.all([
      supabaseAdmin
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500),
      getProgramFilesAction(),
      supabaseAdmin
        .from('email_logs')
        .select('*')
        .in('type', ['program-delivery', 'program-pending'])
        .order('created_at', { ascending: false })
        .limit(500),
    ]);

    if (error) {
      return {
        success: false,
        orders: [],
        files: filesRes.files || {},
        slots: filesRes.slots || [],
        availableSlots: {},
        error: error.message,
      };
    }

    const storedFiles = filesRes.files || {};
    const availableSlots: Record<string, boolean> = {};
    for (const s of filesRes.slots || []) {
      availableSlots[s.slot] = hasPdfSlotAvailable(s.slot, storedFiles);
    }

    // Index latest program email log per orderId or recipient fallback
    const logByOrderId = new Map<string, any>();
    for (const log of emailLogs || []) {
      const oid = String(log?.metadata?.orderId || '').trim();
      if (oid && !logByOrderId.has(oid)) {
        logByOrderId.set(oid, log);
      }
    }

    const mappedOrders: AdminProgramOrderRow[] = [];

    for (const o of rawOrders || []) {
      const items = Array.isArray(o.items) ? o.items : [];
      const hasDigital = hasAnyDigitalProgram(items) || o.carrier_metadata?.is_digital_only === true;
      if (!hasDigital) continue;

      const initialResolved = resolveOrderedPrograms(items, 'ro');
      const orderLocale = resolveOrderEmailLocale(o, initialResolved);
      const resolved = resolveOrderedPrograms(items, orderLocale);
      if (resolved.length === 0) continue;

      const programs: AdminProgramLineItem[] = resolved.map((r) => {
        const slot = `${r.programKey}-${r.lang}`;
        const hasPdfNow =
          slot in availableSlots ? availableSlots[slot] : hasPdfSlotAvailable(slot, storedFiles);
        availableSlots[slot] = hasPdfNow;
        return {
          programKey: r.programKey,
          lang: r.lang,
          slot,
          title: r.title,
          hasPdfNow,
        };
      });

      const orderNumber = getCanonicalOrderNumber(o);
      const readyCount = programs.filter((p) => p.hasPdfNow).length;
      const missingCount = programs.length - readyCount;
      const matchedLog = logByOrderId.get(orderNumber) || logByOrderId.get(String(o.id)) || null;

      mappedOrders.push({
        supabaseId: String(o.id),
        orderNumber,
        createdAt: o.created_at,
        customerName: `${o.customer_firstname || ''} ${o.customer_lastname || ''}`.trim() || 'Client',
        customerEmail: o.customer_email || '',
        customerPhone: o.customer_phone || '',
        locale: orderLocale,
        paymentMethod: o.payment_method || 'stripe',
        status: o.status || 'pending',
        totalAmount: Number(o.total_amount || 0),
        currency: String(o.currency || 'RON').toUpperCase(),
        isDigitalOnly: items.length > 0 && items.every((it: any) => isDigitalProgramItem(it)),
        programs,
        readyCount,
        missingCount,
        deliveryMeta: o.carrier_metadata?.program_delivery || null,
        lastEmailLog: matchedLog
          ? {
              type: matchedLog.type,
              status: matchedLog.status,
              subject: matchedLog.subject,
              createdAt: matchedLog.created_at,
              errorMessage: matchedLog.error_message || null,
            }
          : null,
      });
    }

    return {
      success: true,
      orders: mappedOrders,
      files: storedFiles,
      slots: filesRes.slots || [],
      availableSlots,
    };
  } catch (err: any) {
    return {
      success: false,
      orders: [],
      files: {},
      slots: [],
      availableSlots: {},
      error: err?.message || 'Eroare la încărcarea comenzilor cu programe.',
    };
  }
}

export async function sendManualProgramEmailAction(
  orderSupabaseId: string,
  overrideMode: 'auto' | 'force_pending' = 'auto'
): Promise<{
  success: boolean;
  mode?: 'delivery' | 'pending';
  attachedCount?: number;
  pendingCount?: number;
  message?: string;
  error?: string;
}> {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) {
    return { success: false, error: 'Neautorizat.' };
  }

  try {
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderSupabaseId)
      .maybeSingle();

    if (error || !order) {
      return { success: false, error: 'Comanda nu a fost găsită în baza de date.' };
    }

    const email = String(order.customer_email || '').trim();
    if (!email || email.includes('lipsa-email@')) {
      return { success: false, error: 'Comanda nu are o adresă de email validă.' };
    }

    const orderItems = Array.isArray(order.items) ? order.items : [];
    const initialPrograms = resolveOrderedPrograms(orderItems, 'ro');
    const orderLocale = resolveOrderEmailLocale(order, initialPrograms);
    const orderedPrograms = resolveOrderedPrograms(orderItems, orderLocale);

    if (orderedPrograms.length === 0) {
      return { success: false, error: 'Comanda nu conține niciun program digital.' };
    }

    const orderNumber = getCanonicalOrderNumber(order);
    const res = await sendProgramDeliveryEmail(
      email,
      {
        id: orderNumber,
        supabaseId: String(order.id),
        locale: orderLocale,
        customer: {
          firstName: order.customer_firstname || '',
          lastName: order.customer_lastname || '',
          name: `${order.customer_firstname || ''} ${order.customer_lastname || ''}`.trim() || 'Client',
          email,
        },
      },
      orderedPrograms,
      {
        trigger: 'manual',
        forcePending: overrideMode === 'force_pending',
        orderSupabaseId: String(order.id),
      }
    );

    revalidatePath('/admin/programs');
    revalidatePath('/admin/orders');

    const msg =
      res?.mode === 'pending'
        ? `Email „Urmează curând” trimis către ${email} (${res.pendingCount} program${(res.pendingCount || 0) === 1 ? '' : 'e'} fără PDF momentan).`
        : res?.pendingCount && res.pendingCount > 0
          ? `Trimis parțial către ${email}: ${res.attachedCount} PDF atașat + ${res.pendingCount} în curând.`
          : `Programul cu ${res?.attachedCount || 1} PDF atașat a fost trimis către ${email}!`;

    return {
      success: true,
      mode: res?.mode,
      attachedCount: res?.attachedCount,
      pendingCount: res?.pendingCount,
      message: msg,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Eroare la trimiterea manuală a emailului.',
    };
  }
}

