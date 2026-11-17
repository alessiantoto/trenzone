import { NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/app/actions/admin-auth';
import {
  getProgramPdfBuffer,
  getStoredProgramFileUrl,
  verifyProgramDownloadToken,
  type SingleProgramKey,
} from '@/lib/program-pdf-generator';
import type { DigitalProgramLanguage } from '@/lib/programs';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawProgram = String(searchParams.get('program') || '').trim().toLowerCase();
    const rawLang = String(searchParams.get('lang') || 'ro').trim().toLowerCase();
    const orderId = String(searchParams.get('order') || '').trim();
    const token = String(searchParams.get('token') || '').trim();
    const isAdminPreview = searchParams.get('admin') === '1';

    const cleanProgram = rawProgram.replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
    const programKey: SingleProgramKey | null =
      cleanProgram === 'food-plan' || cleanProgram === 'food-plan-vlad-tren'
        ? 'food-plan'
        : cleanProgram === 'training-program' || cleanProgram === 'training-program-vlad-tren'
        ? 'training-program'
        : cleanProgram === 'bench-program' || cleanProgram === 'bench-program-vlad-tren'
        ? 'bench-program'
        : /^[a-z0-9][a-z0-9-]{1,100}$/.test(cleanProgram)
        ? cleanProgram
        : null;

    if (!programKey) {
      return NextResponse.json(
        { error: 'Invalid program requested.' },
        { status: 400 }
      );
    }

    const lang: DigitalProgramLanguage = rawLang === 'en' ? 'en' : 'ro';

    let authorized = false;
    if (orderId && token) {
      authorized = verifyProgramDownloadToken(orderId, programKey, lang, token);
    }
    if (!authorized && isAdminPreview) {
      authorized = await isAdminAuthorized();
    }

    if (!authorized) {
      return NextResponse.json(
        { error: lang === 'en' ? 'Download link is invalid or unauthorized.' : 'Link-ul de descărcare este invalid sau neautorizat.' },
        { status: 403 }
      );
    }

    // Redirect large CDN/Storage PDFs (> 3.8 MB) directly so buyers bypass Vercel's 4.5 MB function response limit
    const storedEntry = await getStoredProgramFileUrl(programKey, lang);
    if (storedEntry) {
      const headRes = await fetch(storedEntry.url, { method: 'HEAD', cache: 'no-store' }).catch(() => null);
      const sizeBytes = Number(headRes?.headers.get('content-length') || 0);
      if (sizeBytes > 3.8 * 1024 * 1024) {
        const targetUrl = storedEntry.url.includes('.supabase.co/storage/')
          ? `${storedEntry.url}${storedEntry.url.includes('?') ? '&' : '?'}download=${encodeURIComponent(storedEntry.filename)}`
          : storedEntry.url;
        return NextResponse.redirect(targetUrl, 307);
      }
    }

    const result = await getProgramPdfBuffer(programKey, lang);
    if (!result) {
      const html = `<!doctype html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TrenZone Digital Program</title></head>
<body style="margin:0;background:#09090d;color:#fff;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;text-align:center;">
  <div style="max-width:440px;background:#111118;border:1px solid rgba(255,255,255,0.12);border-radius:20px;padding:36px 28px;">
    <div style="font-size:11px;font-weight:800;letter-spacing:2px;color:#e32f8c;text-transform:uppercase;margin-bottom:10px;">TRENZONE®</div>
    <h1 style="font-size:22px;margin:0 0 12px 0;">${lang === 'en' ? 'Your PDF is being prepared' : 'PDF-ul tău este în pregătire'}</h1>
    <p style="font-size:14px;color:#a1a1aa;line-height:1.6;margin:0;">${lang === 'en' ? 'This digital program is not uploaded yet and will be sent automatically to your email very soon.' : 'Acest program digital nu a fost încă urcat și îți va fi trimis automat pe email în cel mai scurt timp.'}</p>
  </div>
</body>
</html>`;
      return new NextResponse(html, {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    const { buffer, filename } = result;

    if (buffer.byteLength > 3.8 * 1024 * 1024 && storedEntry) {
      const targetUrl = storedEntry.url.includes('.supabase.co/storage/')
        ? `${storedEntry.url}${storedEntry.url.includes('?') ? '&' : '?'}download=${encodeURIComponent(filename)}`
        : storedEntry.url;
      return NextResponse.redirect(targetUrl, 307);
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store, max-age=0',
      },
    });
  } catch (err: any) {
    console.error('[PROGRAM DOWNLOAD API] Error:', err);
    const reqLang = new URL(req.url).searchParams.get('lang') === 'en' ? 'en' : 'ro';
    return NextResponse.json(
      { error: reqLang === 'en' ? 'Failed to generate/download PDF.' : 'Eroare la generarea/descărcarea PDF-ului.' },
      { status: 500 }
    );
  }
}
