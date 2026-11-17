import { supabase } from '@/lib/supabase';
import {
  createProgramPdfSignedUploadAction,
  uploadProgramPdfAction,
} from '@/app/actions/programs';
import type { ProgramFileSlot } from '@/lib/program-pdf-generator';

const SERVER_ACTION_SAFE_BYTES = 3.8 * 1024 * 1024; // Stay under Vercel's 4.5 MB request body limit

/**
 * Uploads a digital program PDF without hitting Vercel's 4.5 MB Serverless payload ceiling.
 * Small files (<= 3.8 MB) use the Server Action (R2/Storage); larger files (up to 50 MB)
 * upload directly via Supabase signed upload URL and then persist the public URL.
 */
export async function uploadAdminProgramPdf(
  slot: ProgramFileSlot,
  file: File
): Promise<{
  success: boolean;
  slot?: ProgramFileSlot;
  url?: string;
  autoDispatchedCount?: number;
  autoFailedCount?: number;
  error?: string;
}> {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (ext !== 'pdf' && file.type !== 'application/pdf') {
    return { success: false, error: 'Format invalid. Sunt acceptate doar fișiere .PDF.' };
  }

  if (file.size <= SERVER_ACTION_SAFE_BYTES) {
    try {
      const fd = new FormData();
      fd.append('slot', slot);
      fd.append('file', file);
      return await uploadProgramPdfAction(fd);
    } catch {
      // Fallback to direct signed upload if proxy/gateway rejected payload
    }
  }

  const signed = await createProgramPdfSignedUploadAction(slot, file.name);
  if (!signed.success || !signed.path || !signed.token || !signed.publicUrl) {
    return { success: false, error: signed.error || 'Nu s-a putut inițializa încărcarea PDF.' };
  }

  const { error: uploadErr } = await supabase.storage
    .from('products')
    .uploadToSignedUrl(signed.path, signed.token, file, {
      contentType: 'application/pdf',
    });

  if (uploadErr) {
    return { success: false, error: `Eroare la încărcarea PDF-ului: ${uploadErr.message}` };
  }

  const saveFd = new FormData();
  saveFd.append('slot', slot);
  saveFd.append('customUrl', signed.publicUrl);
  return await uploadProgramPdfAction(saveFd);
}

