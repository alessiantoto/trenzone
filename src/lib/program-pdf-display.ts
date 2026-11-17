/**
 * Extracts a clean human-readable PDF filename from a stored R2 / Supabase Storage URL.
 */
export function extractProgramPdfDisplayName(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  try {
    const cleanUrl = url.split('?')[0].split('#')[0];
    const rawFile = decodeURIComponent(cleanUrl.split('/').pop() || '');
    if (!rawFile) return 'program.pdf';
    const markerIdx = rawFile.indexOf('__');
    if (markerIdx !== -1 && markerIdx + 2 < rawFile.length) {
      return rawFile.slice(markerIdx + 2);
    }
    return rawFile;
  } catch {
    return 'program.pdf';
  }
}
